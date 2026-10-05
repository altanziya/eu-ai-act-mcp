/** Aggregation of eval runs (majority rule, Clopper-Pearson on cases) and the Markdown report. */
import type { ModelAnswer } from "./answer.js";
import type { EvalCase } from "./cases.js";
import type { Score } from "./score.js";
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
  /** Cases wrong by majority of their scored runs (strictly more than half; 1 run: that run; 3 runs: at least 2). */
  errors_majority: number;
  /** Cases with at least one wrong scored run. */
  errors_any: number;
  ci: { lower: number; upper: number } | null;
  e1: string | null;
  runs: number;
  unparseable_runs: number;
  api_error_runs: number;
  /** Share of runs with at least one tool call (tools arm only). */
  tool_call_rate: number | null;
  cost_usd: number;
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
    let majority = 0;
    let any = 0;
    for (const rs of byCase.values()) {
      const scored = rs.filter((r) => r.score.correct !== null);
      if (scored.length === 0) continue;
      cases++;
      const wrong = scored.filter((r) => r.score.correct === false).length;
      if (wrong * 2 > scored.length) majority++;
      if (wrong >= 1) any++;
    }
    out.push({
      model, arm, cases, errors_majority: majority, errors_any: any,
      ci: cases > 0 ? clopperPearson(majority, cases) : null,
      e1: cases > 0 ? decideE1({ errors: majority, n: cases }) : null,
      runs: runs.length,
      unparseable_runs: runs.filter((r) => r.parsed === null && !r.error).length,
      api_error_runs: runs.filter((r) => r.error !== undefined).length,
      tool_call_rate: arm === "tools" && runs.length > 0 ? runs.filter((r) => r.tool_calls.length > 0).length / runs.length : null,
      cost_usd: all.reduce((s, r) => s + r.cost, 0),
    });
  }
  return out;
}

export interface ReportMeta {
  cases_file: string;
  prompt_version: string;
  status: string;
  dry_run: boolean;
  reps: number;
  max_usd: number;
  total_cost_usd: number;
  note?: string;
}

const f4 = (x: number): string => x.toFixed(4);
const pct = (x: number | null): string => (x === null ? "-" : `${(x * 100).toFixed(0)} %`);

function table(cells: CellSummary[]): string[] {
  const L = [
    "| Model | Arm | Cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Cost USD | E1 rule |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of cells) {
    L.push(
      `| ${c.model} | ${c.arm} | ${c.cases} | ${c.errors_majority} | ${c.ci ? `[${f4(c.ci.lower)}, ${f4(c.ci.upper)}]` : "-"} | ${c.errors_any} | ${c.unparseable_runs}/${c.runs} | ${c.api_error_runs}/${c.runs} | ${pct(c.tool_call_rate)} | ${f4(c.cost_usd)} | ${c.e1 ?? "-"} |`,
    );
  }
  if (cells.length === 0) L.push("| (no runs) | | | | | | | | | | |");
  return L;
}

/** Markdown report: overall, by subset and by knowable_before_omnibus. */
export function renderReport(meta: ReportMeta, lines: RunRecord[]): string {
  const L: string[] = ["# Eval report", ""];
  if (meta.dry_run) L.push("**Dry run: mock model, no network, no cost. The numbers below say nothing about any real model.**", "");
  L.push(
    `- Cases file: ${meta.cases_file}`,
    `- Prompt version: ${meta.prompt_version}`,
    `- Status: ${meta.status}`,
    `- Repetitions per case: ${meta.reps}`,
    `- Total cost (sum of usage.cost): ${f4(meta.total_cost_usd)} USD (cap ${meta.max_usd} USD)`,
  );
  if (meta.note) L.push(`- Note: ${meta.note}`);
  L.push(
    "",
    "Method: a case counts as an error if more than half of its scored runs are wrong (one repetition: that run; three: at least 2 of 3). " +
      "Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and are listed separately; " +
      "API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. " +
      "The E1 rule column applies the pre-registered rule mechanically to the row (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) and is only meaningful on the full case set.",
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
