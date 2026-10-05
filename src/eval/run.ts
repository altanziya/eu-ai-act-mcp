/**
 * npm run eval -- --cases <yaml> --models <id,...> --arms plain,web,tools --reps N --max-usd X --out <dir>
 *                 --primary-model <id> [--dry-run] [--resume] [--reasoning-effort low|medium|high|none] [--max-claude-calls N]
 * Runs every case x model x arm x repetition, scores the answers deterministically and writes runs.jsonl, results.json and
 * report.md to <dir>. The cost cap is hard: before every call, spent + estimate > max-usd stops the run (status budget_stop).
 * Model ids with the prefix `claude-code/` run through the Claude Code CLI (subscription, src/eval/claudeCode.ts), all others through OpenRouter;
 * a run may mix both. Subscription runs cost no money (their API-equivalent cost is booked as cost_equiv_usd, outside --max-usd); they are
 * capped by --max-claude-calls (default 400 per invocation; before the call that would exceed it the run stops with budget_stop) and a
 * used-up quota ends the run cleanly (status quota_stop; --resume continues).
 * --dry-run uses a mock model without network, cost or `claude` call. See docs/reference.md "Evaluation harness".
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT } from "../config.js";
import { parseAnswer } from "./answer.js";
import { Budget, Estimator } from "./budget.js";
import { loadCases } from "./cases.js";
import type { EvalCase } from "./cases.js";
import { backendOf, isClaudeCode, runClaude } from "./claudeCode.js";
import { apiKey, converse, listModels } from "./openrouter.js";
import type { Arm, ModelInfo } from "./openrouter.js";
import { PROMPT_VERSION, buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { computeE1, latestRuns, renderReport, runKey, summarize } from "./report.js";
import type { RunRecord } from "./report.js";
import { SCORER_VERSION, scoreCase } from "./score.js";

const MAX_TOKENS = 3000;
const PROBE_JSON = join(REPO_ROOT, "scripts/cost-probe/results/2026-10-05.json");
const ARMS: readonly Arm[] = ["plain", "web", "tools"];
type Effort = "low" | "medium" | "high";

export interface Options {
  cases: string;
  models: string[];
  arms: Arm[];
  reps: number;
  maxUsd: number;
  out: string;
  /** Model of the one pre-registered E1 evaluation (arm web, subset version_deadline); null only in a dry run. */
  primaryModel: string | null;
  dryRun: boolean;
  resume: boolean;
  reasoningEffort: Effort | null;
  /** Cap on `claude` calls of one invocation (claude-code/ models); a --resume starts counting from zero. */
  maxClaudeCalls: number;
}

export const DEFAULT_MAX_CLAUDE_CALLS = 400;

export function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const need = (name: string): string => {
    const v = get(name);
    if (v === undefined || v.startsWith("--")) throw new Error(`missing --${name}`);
    return v;
  };
  const split = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);
  const arms = split(get("arms") ?? "plain");
  for (const a of arms) if (!(ARMS as readonly string[]).includes(a)) throw new Error(`unknown arm ${a} (plain|web|tools)`);
  const reps = Number(get("reps") ?? "1");
  if (!Number.isInteger(reps) || reps < 1) throw new Error("--reps must be a positive integer");
  const maxUsd = Number(need("max-usd"));
  if (!Number.isFinite(maxUsd) || maxUsd < 0) throw new Error("--max-usd must be a number >= 0");
  const eff = get("reasoning-effort") ?? "low";
  if (!["low", "medium", "high", "none"].includes(eff)) throw new Error("--reasoning-effort must be low|medium|high|none");
  const maxClaudeCalls = Number(get("max-claude-calls") ?? DEFAULT_MAX_CLAUDE_CALLS);
  if (!Number.isInteger(maxClaudeCalls) || maxClaudeCalls < 0) throw new Error("--max-claude-calls must be an integer >= 0");
  const models = split(need("models"));
  if (models.length === 0) throw new Error("--models is empty");
  const dryRun = argv.includes("--dry-run");
  const primaryModel = get("primary-model") ?? null;
  if (primaryModel === null && !dryRun) throw new Error("missing --primary-model (the model of the E1 evaluation; required unless --dry-run)");
  if (primaryModel !== null && (primaryModel.startsWith("--") || !models.includes(primaryModel))) throw new Error(`--primary-model ${primaryModel} must be one of --models`);
  return {
    cases: need("cases"), models, arms: arms as Arm[], reps, maxUsd, out: need("out"), primaryModel,
    dryRun, resume: argv.includes("--resume"), reasoningEffort: eff === "none" ? null : (eff as Effort), maxClaudeCalls,
  };
}

/** Mock `answer` text: carries the expected claim (yes/no as first word, else as substring); a deliberate error flips yes/no or drops the claim. */
function mockAnswerText(claim: string | undefined, wrong: boolean): string {
  if (claim === undefined) return "mock answer";
  const w = /^[^\p{L}]*(\p{L}+)[^\p{L}]*$/u.exec(claim)?.[1]?.toLowerCase();
  if (w === "yes" || w === "ja" || w === "no" || w === "nein") {
    const yes = w === "yes" || w === "ja";
    return `${yes !== wrong ? "Yes" : "No"}. mock answer`;
  }
  return wrong ? "mock answer" : `mock answer: ${claim}`;
}

/** Deterministic mock answer from `expected`; every third case (1-based 3, 6, ...) is deliberately wrong. */
export function mockAnswer(c: EvalCase, index: number): string {
  const wrong = (index + 1) % 3 === 0;
  const answer = mockAnswerText(c.expected.claim, wrong);
  if (c.kind === "evaluation") {
    const v = c.expected.verdict ?? "correct";
    const flipped = v === "correct" ? "incorrect" : "correct";
    return JSON.stringify({ verdict: wrong ? flipped : v, answer });
  }
  return JSON.stringify({
    date: wrong ? "1999-01-01" : (c.expected.date ?? null),
    version: c.expected.version ?? null,
    article: wrong && c.expected.articles ? "Article 1" : (c.expected.articles?.[0] ?? null), // a case that only expects articles must be able to err
    quote: c.ground_truth.quote,
    answer,
  });
}

function readLines(path: string): RunRecord[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as RunRecord);
}

/** Recomputes `score` of stored runs from `parsed` with the current scorer (scoring is deterministic; no new calls needed). Returns the number of changed lines. */
function rescore(lines: RunRecord[], cases: EvalCase[]): number {
  const byId = new Map(cases.map((c) => [c.id, c]));
  let changed = 0;
  for (const r of lines) {
    const c = byId.get(r.case_id);
    if (!c) continue;
    const s = scoreCase(c, r.parsed);
    if (JSON.stringify(s) !== JSON.stringify(r.score)) {
      r.score = s;
      changed++;
    }
  }
  return changed;
}

const usd = (x: number): string => x.toFixed(4);

export async function main(argv: string[]): Promise<number> {
  const o = parseArgs(argv);
  const cases = loadCases(resolve(o.cases));
  const out = resolve(o.out);
  mkdirSync(out, { recursive: true });
  const runsPath = join(out, "runs.jsonl");
  if (existsSync(runsPath) && readFileSync(runsPath, "utf8").trim() !== "" && !o.resume) {
    throw new Error(`${runsPath} already exists; use --resume to continue it or choose another --out`);
  }

  const estimator = o.dryRun ? new Estimator() : Estimator.fromFile(PROBE_JSON);
  const existing = o.resume ? readLines(runsPath) : [];
  let rescored = 0;
  if (o.resume) {
    const stale = [...new Set(existing.filter((r) => r.prompt_version !== PROMPT_VERSION).map((r) => r.prompt_version ?? "none"))];
    if (stale.length > 0) throw new Error(`--resume: ${runsPath} holds runs made with prompt_version ${stale.join(", ")}, current is ${PROMPT_VERSION}; results of different prompts must not be mixed (use a new --out)`);
    const resultsPath = join(out, "results.json");
    if (existsSync(resultsPath)) rescored = Number((JSON.parse(readFileSync(resultsPath, "utf8")) as { rescored_runs?: number }).rescored_runs ?? 0) || 0;
    const n = rescore(existing, cases);
    rescored += n;
    if (n > 0) {
      writeFileSync(runsPath, existing.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
      console.log(`resume: re-scored ${n} stored runs with the current scorer`);
    }
  }
  const budget = new Budget(o.maxUsd, existing.reduce((s, r) => s + r.cost, 0));
  const done = new Set(latestRuns(existing).filter((r) => !r.error && !r.incomplete).map(runKey));

  // Plan: repetition outermost so that an early stop leaves every case with the same number of repetitions.
  interface Task { c: EvalCase; index: number; model: string; arm: Arm; rep: number }
  const tasks: Task[] = [];
  for (let rep = 0; rep < o.reps; rep++) {
    cases.forEach((c, index) => {
      for (const model of o.models) for (const arm of o.arms) {
        if (!done.has(runKey({ case_id: c.id, model, arm, rep }))) tasks.push({ c, index, model, arm, rep });
      }
    });
  }

  console.log(`eval: ${cases.length} cases x ${o.models.length} models x ${o.arms.length} arms x ${o.reps} reps = ${cases.length * o.models.length * o.arms.length * o.reps} runs (${tasks.length} to do)${o.dryRun ? " [dry run]" : ""}`);
  const estimates: Record<string, { run_usd: number; requests: number; source: string }> = {};
  for (const m of o.models) for (const a of o.arms) {
    const e = o.dryRun ? { run: 0, requests: 1, source: "mock" } : isClaudeCode(m) ? { run: 0, requests: 1, source: "subscription" } : estimator.estimate(m, a);
    estimates[`${m} | ${a}`] = { run_usd: e.run, requests: e.requests, source: e.source };
  }
  console.log(`cap ${o.maxUsd} USD, already spent ${usd(budget.spent)}; estimate per run (probe mean x 1.5):`);
  for (const [k, e] of Object.entries(estimates)) console.log(`  ${k}: ${usd(e.run_usd)} USD (${e.source})`);

  let key = "";
  let info: ModelInfo[] = [];
  const modelParams: Record<string, { temperature: boolean; reasoning_effort: Effort | null }> = {};
  // The OpenRouter key is only looked up if a model needs it (a claude-code-only run never touches it).
  const openRouterModels = o.models.filter((m) => !isClaudeCode(m));
  if (!o.dryRun && openRouterModels.length > 0) {
    key = apiKey();
    try {
      info = await listModels(key, "eu-ai-act-mcp eval");
    } catch (e) {
      console.log(`warning: model list unavailable (${e instanceof Error ? e.message : String(e)}); sending temperature 0, no reasoning parameter`);
    }
    for (const m of openRouterModels) {
      const sp = info.find((x) => x.id === m)?.supported_parameters;
      modelParams[m] = {
        temperature: sp === undefined ? true : sp.includes("temperature"),
        reasoning_effort: sp !== undefined && sp.includes("reasoning") ? o.reasoningEffort : null,
      };
    }
    console.log("request parameters:", JSON.stringify(modelParams));
  }

  let status: "complete" | "budget_stop" | "quota_stop" = "complete";
  let note: string | undefined;
  const stop = (why: string, kind: "budget_stop" | "quota_stop" = "budget_stop"): void => {
    status = kind;
    note = why;
    console.log(`STOP (${kind}): ${why}`);
  };

  let claudeCalls = 0;
  for (const t of tasks) {
    const subscription = isClaudeCode(t.model); // no money: neither estimate nor --max-usd applies
    const est = o.dryRun || subscription ? { run: 0, requests: 1 } : estimator.estimate(t.model, t.arm);
    if (!o.dryRun && !subscription && !budget.allows(est.run)) {
      stop(`spent ${usd(budget.spent)} + estimate ${usd(est.run)} > cap ${o.maxUsd} before ${t.c.id} | ${t.model} | ${t.arm} | rep ${t.rep + 1}`);
      break;
    }
    if (!o.dryRun && subscription && claudeCalls >= o.maxClaudeCalls) {
      stop(`--max-claude-calls ${o.maxClaudeCalls} reached before ${t.c.id} | ${t.model} | ${t.arm} | rep ${t.rep + 1}`);
      break;
    }
    let rec: RunRecord;
    const base = { prompt_version: PROMPT_VERSION, case_id: t.c.id, subset: t.c.subset, knowable_before_omnibus: t.c.knowable_before_omnibus, kind: t.c.kind, model: t.model, backend: backendOf(t.model), arm: t.arm, rep: t.rep };
    if (o.dryRun) {
      const raw = mockAnswer(t.c, t.index);
      const parsed = parseAnswer(raw);
      rec = { ...base, raw, parsed, score: scoreCase(t.c, parsed), prompt_tokens: 0, completion_tokens: 0, cost: 0, tool_calls: [], requests: 0, finish_reason: "mock", status: 200, latency_ms: 0, mock: true };
    } else if (subscription) {
      claudeCalls++;
      const r = await runClaude({ model: t.model, arm: t.arm, system: buildSystemPrompt(t.c.as_of, t.arm), user: buildUserPrompt(t.c.question) });
      const parsed = r.outcome === "ok" ? parseAnswer(r.text) : null;
      rec = {
        ...base, raw: r.text, parsed, score: scoreCase(t.c, parsed), prompt_tokens: r.prompt_tokens, completion_tokens: r.completion_tokens, cost: 0, cost_equiv_usd: r.cost_equiv_usd,
        tool_calls: r.tool_calls, requests: r.num_turns, finish_reason: r.subtype, status: r.outcome === "ok" ? 200 : -1, latency_ms: r.latency_ms,
        ...(r.model_reported !== null ? { model_reported: r.model_reported } : {}),
        ...(r.error !== undefined ? { error: r.error } : {}),
        ...(r.outcome === "quota_stop" ? { incomplete: true } : {}),
      };
      if (r.outcome === "quota_stop") {
        appendFileSync(runsPath, `${JSON.stringify(rec)}\n`);
        stop(`quota used up during ${t.c.id} | ${t.model} | ${t.arm} | rep ${t.rep + 1}: ${r.error ?? ""}`, "quota_stop");
        break;
      }
    } else {
      const p = modelParams[t.model];
      let runCost = 0;
      const r = await converse({
        key, model: t.model, arm: t.arm, system: buildSystemPrompt(t.c.as_of, t.arm), user: buildUserPrompt(t.c.question), asOf: t.c.as_of,
        maxTokens: MAX_TOKENS, title: "eu-ai-act-mcp eval",
        ...(p?.temperature ? { temperature: 0 } : {}),
        ...(p?.reasoning_effort ? { reasoningEffort: p.reasoning_effort } : {}),
        fallbackRequestCost: est.run / Math.max(1, est.requests),
        beforeRequest: (n) => {
          // first request: whole-run estimate; later requests: the rest of the run estimate, at least one request's share
          const next = n === 0 ? est.run : Math.max(est.run - runCost, est.run / Math.max(1, est.requests));
          return budget.allows(next);
        },
        onCost: (c) => {
          runCost += c;
          budget.add(c);
        },
      });
      const parsed = r.error ? null : parseAnswer(r.text);
      rec = {
        ...base, raw: r.text, parsed, score: scoreCase(t.c, parsed), prompt_tokens: r.prompt_tokens, completion_tokens: r.completion_tokens, cost: r.cost,
        tool_calls: r.tool_calls, requests: r.requests, finish_reason: r.finish_reason, status: r.status, latency_ms: r.latency_ms,
        ...(r.error !== undefined ? { error: r.error } : {}),
        ...(r.cost_estimated ? { cost_estimated: true } : {}),
        ...(r.stopped ? { incomplete: true } : {}),
      };
      if (!r.cost_estimated) estimator.observe(t.model, t.arm, r.cost); // an estimate must not raise the next estimate
      if (r.stopped) {
        if (r.requests > 0) appendFileSync(runsPath, `${JSON.stringify(rec)}\n`);
        stop(`budget during ${t.c.id} | ${t.model} | ${t.arm} | rep ${t.rep + 1} (spent ${usd(budget.spent)}, cap ${o.maxUsd})`);
        break;
      }
    }
    appendFileSync(runsPath, `${JSON.stringify(rec)}\n`);
    const verdict = rec.error ? `error: ${rec.error.slice(0, 80)}` : rec.parsed === null ? "unparseable" : rec.score.correct ? "correct" : "wrong";
    console.log(`${t.c.id} | ${t.model} | ${t.arm} | rep ${t.rep + 1}: ${verdict}, tools ${rec.tool_calls.length}, cost ${usd(rec.cost)}${rec.cost_equiv_usd !== undefined ? ` (equiv ${usd(rec.cost_equiv_usd)})` : ""} | spent ${usd(budget.spent)}`);
  }

  const lines = readLines(runsPath);
  const latest = latestRuns(lines);
  const total = lines.reduce((s, r) => s + r.cost, 0);
  const totalEquiv = lines.reduce((s, r) => s + (r.cost_equiv_usd ?? 0), 0);
  const e1 = o.primaryModel !== null ? computeE1(lines, o.primaryModel) : null;
  const meta = { cases_file: o.cases, prompt_version: PROMPT_VERSION, scorer_version: SCORER_VERSION, rescored_runs: rescored, status, dry_run: lines.length > 0 && lines.every((r) => r.mock === true), reps: o.reps, max_usd: o.maxUsd, max_claude_calls: o.maxClaudeCalls, claude_calls: claudeCalls, total_cost_usd: total, total_cost_equiv_usd: totalEquiv, backends: Object.fromEntries(o.models.map((m) => [m, backendOf(m)])), primary_model: o.primaryModel, e1, ...(note ? { note } : {}) };
  writeFileSync(
    join(out, "results.json"),
    `${JSON.stringify({ ...meta, runs: latest.length, planned_runs: cases.length * o.models.length * o.arms.length * o.reps, models: o.models, arms: o.arms, cases: cases.length, max_tokens: MAX_TOKENS, request_params: modelParams, estimates, cells: summarize(lines) }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(join(out, "report.md"), renderReport(meta, lines), "utf8");
  console.log(`status ${status}; ${latest.length} runs; total cost ${usd(total)} USD; wrote ${out}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
