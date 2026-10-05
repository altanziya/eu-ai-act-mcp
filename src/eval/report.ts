/** Aggregation of eval runs (majority rule, Clopper-Pearson on cases) and the Markdown report. */
import type { ModelAnswer } from "./answer.js";
import type { EvalCase } from "./cases.js";
import type { Score } from "./score.js";
import type { E1Decision } from "./stats.js";
import { clopperPearson, decideE1 } from "./stats.js";
import type { ToolCallRecord } from "./openrouter.js";

export interface RunRecord {
  case_id: string;
  subset: EvalCase["subset"];
  knowable_before_omnibus: boolean;
  kind: EvalCase["kind"];
  model: string;
  arm: string;
  rep: number;
  raw: string;
  /** null: no JSON object in the answer (also empty answers and API errors). */
  parsed: ModelAnswer | null;
  score: Score;
  prompt_tokens: number;
  completion_tokens: number;
  /** Sum of usage.cost over all requests of the run. */
  cost: number;
  tool_calls: ToolCallRecord[];
  requests: number;
  finish_reason: string | null;
  status: number;
  latency_ms: number;
  error?: string;
  /** PROMPT_VERSION the run was made with. */
  prompt_version?: string;
  /** Cost of at least one request is the estimate (usage.cost missing, or the request failed after it was sent). */
  cost_estimated?: boolean;
  /** Run cut short by the budget; re-run on --resume. */
  incomplete?: boolean;
  mock?: boolean;
}

export const runKey = (r: Pick<RunRecord, "case_id" | "model" | "arm" | "rep">): string => `${r.case_id}\u0000${r.model}\u0000${r.arm}\u0000${r.rep}`;

/** Last line per (case, model, arm, rep): a resumed run supersedes the failed or incomplete one. */
export function latestRuns(lines: RunRecord[]): RunRecord[] {
  const m = new Map<string, RunRecord>();
  for (const r of lines) m.set(runKey(r), r);
  return [...m.values()];
}

export interface CellSummary {
  model: string;
  arm: string;
  /** Cases with at least one scored (parseable) run. */
  cases: number;
  /** Cases in which no run could be scored (all unparseable or API errors); not part of `cases`. */
  excluded_cases: number;
  /** Cases wrong by majority: wrong runs > R/2, R = all runs of the case (unparseable runs do not count as wrong; 1 run: that run; 3 runs: at least 2). */
  errors_majority: number;
  /** Cases with at least one wrong scored run. */
  errors_any: number;
  ci: { lower: number; upper: number } | null;
  /** Sensitivity: the same rule with every unparseable run (and API error run) counted as wrong; n includes the excluded cases. */
  sensitivity: { errors: number; n: number; lower: number; upper: number } | null;
  runs: number;
  unparseable_runs: number;
  api_error_runs: number;
  /** Share of runs with at least one tool call (tools arm only). */
  tool_call_rate: number | null;
  cost_usd: number;
  /** Runs that booked an estimate instead of usage.cost. */
  cost_estimated_runs: number;
}

export type Filter = (r: RunRecord) => boolean;

/** One summary per model x arm (in order of first appearance). `lines` may contain superseded lines; cost counts all of them. */
export function summarize(lines: RunRecord[], filter: Filter = () => true): CellSummary[] {
  const cells = new Map<string, { model: string; arm: string }>();
  for (const r of lines.filter(filter)) cells.set(`${r.model}\u0000${r.arm}`, { model: r.model, arm: r.arm });
  const out: CellSummary[] = [];
  for (const { model, arm } of cells.values()) {
    const all = lines.filter((r) => filter(r) && r.model === model && r.arm === arm);
    const runs = latestRuns(all);
    const byCase = new Map<string, RunRecord[]>();
    for (const r of runs) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), r]);
    let cases = 0;
    let excluded = 0;
    let majority = 0;
    let any = 0;
    let sensitivityErrors = 0;
    for (const rs of byCase.values()) {
      const scored = rs.filter((r) => r.score.correct !== null);
      const unscored = rs.length - scored.length;
      const wrong = scored.filter((r) => r.score.correct === false).length;
      if ((wrong + unscored) * 2 > rs.length) sensitivityErrors++;
      if (scored.length === 0) {
        excluded++;
        continue;
      }
      cases++;
      if (wrong * 2 > rs.length) majority++;
      if (wrong >= 1) any++;
    }
    const sensitivityN = cases + excluded;
    out.push({
      model, arm, cases, excluded_cases: excluded, errors_majority: majority, errors_any: any,
      ci: cases > 0 ? clopperPearson(majority, cases) : null,
      sensitivity: sensitivityN > 0 ? { errors: sensitivityErrors, n: sensitivityN, ...clopperPearson(sensitivityErrors, sensitivityN) } : null,
      runs: runs.length,
      unparseable_runs: runs.filter((r) => r.parsed === null && !r.error).length,
      api_error_runs: runs.filter((r) => r.error !== undefined).length,
      tool_call_rate: arm === "tools" && runs.length > 0 ? runs.filter((r) => r.tool_calls.length > 0).length / runs.length : null,
      cost_usd: all.reduce((s, r) => s + r.cost, 0),
      cost_estimated_runs: all.filter((r) => r.cost_estimated === true).length,
    });
  }
  return out;
}

/** The one pre-registered E1 evaluation: primary model, arm web, subset version_deadline. */
export interface E1Result {
  model: string;
  arm: "web";
  subset: "version_deadline";
  errors: number;
  n: number;
  lower: number;
  upper: number;
  decision: E1Decision;
}

/** Null if there is no scored case for the primary model in arm web on subset version_deadline. */
export function computeE1(lines: RunRecord[], model: string): E1Result | null {
  const [c] = summarize(lines, (r) => r.model === model && r.arm === "web" && r.subset === "version_deadline");
  if (!c || !c.ci || c.cases === 0) return null;
  return { model, arm: "web", subset: "version_deadline", errors: c.errors_majority, n: c.cases, lower: c.ci.lower, upper: c.ci.upper, decision: decideE1({ errors: c.errors_majority, n: c.cases }) };
}

export interface ReportMeta {
  cases_file: string;
  prompt_version: string;
  scorer_version?: string;
  /** Stored runs whose score was recomputed on --resume (cumulative over resumes). */
  rescored_runs?: number;
  status: string;
  dry_run: boolean;
  reps: number;
  max_usd: number;
  total_cost_usd: number;
  primary_model?: string | null;
  e1?: E1Result | null;
  note?: string;
}

const f4 = (x: number): string => x.toFixed(4);
const pct = (x: number | null): string => (x === null ? "-" : `${(x * 100).toFixed(0)} %`);

function table(cells: CellSummary[]): string[] {
  const L = [
    "| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Cost USD |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of cells) {
    L.push(
      `| ${c.model} | ${c.arm} | ${c.cases} | ${c.excluded_cases} | ${c.errors_majority} | ${c.ci ? `[${f4(c.ci.lower)}, ${f4(c.ci.upper)}]` : "-"} | ${c.errors_any} | ${c.unparseable_runs}/${c.runs} | ${c.api_error_runs}/${c.runs} | ${pct(c.tool_call_rate)} | ${f4(c.cost_usd)}${c.cost_estimated_runs > 0 ? ` (${c.cost_estimated_runs} runs estimated)` : ""} |`,
    );
    if (c.sensitivity) {
      const s = c.sensitivity;
      L.push(`| ${c.model} | ${c.arm}: unparseable counted as wrong | ${s.n} | - | ${s.errors} | [${f4(s.lower)}, ${f4(s.upper)}] | - | - | - | - | - |`);
    }
  }
  if (cells.length === 0) L.push("| (no runs) | | | | | | | | | | |");
  return L;
}

function e1Line(meta: ReportMeta): string {
  const e = meta.e1;
  if (e) return `E1 decision: ${e.decision} (${e.model}, arm ${e.arm}, subset ${e.subset}: ${e.errors}/${e.n} cases wrong, Clopper-Pearson 95 % [${f4(e.lower)}, ${f4(e.upper)}])`;
  if (!meta.primary_model) return "E1 decision: none (no --primary-model given)";
  return `E1 decision: none (no scored case for ${meta.primary_model} in arm web on subset version_deadline)`;
}

/** Markdown report: overall, by subset and by knowable_before_omnibus. */
export function renderReport(meta: ReportMeta, lines: RunRecord[]): string {
  const L: string[] = ["# Eval report", ""];
  if (meta.dry_run) L.push("**Dry run: mock model, no network, no cost. The numbers below say nothing about any real model.**", "");
  L.push(
    `- Cases file: ${meta.cases_file}`,
    `- Prompt version: ${meta.prompt_version}`,
    `- Scorer version: ${meta.scorer_version ?? "unknown"}`,
    `- Re-scored runs (on resume): ${meta.rescored_runs ?? 0}`,
    `- Dry run (all runs mock): ${meta.dry_run}`,
    `- Status: ${meta.status}`,
    `- Repetitions per case: ${meta.reps}`,
    `- Total cost (sum of usage.cost): ${f4(meta.total_cost_usd)} USD (cap ${meta.max_usd} USD)`,
  );
  if (meta.note) L.push(`- Note: ${meta.note}`);
  L.push(
    "",
    "Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). " +
      "Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; " +
      "with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. " +
      "The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. " +
      "The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.",
    "",
    e1Line(meta),
    "",
    "## All cases",
    "",
    ...table(summarize(lines)),
  );
  for (const subset of ["version_deadline", "evaluation"] as const) L.push("", `## Subset ${subset}`, "", ...table(summarize(lines, (r) => r.subset === subset)));
  for (const k of [true, false]) L.push("", `## knowable_before_omnibus = ${k}`, "", ...table(summarize(lines, (r) => r.knowable_before_omnibus === k)));
  L.push("");
  return L.join("\n");
}
