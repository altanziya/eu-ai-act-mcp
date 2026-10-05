import type { RunRecord } from "../../../src/eval/report.js";

/** A run record for report tests; `correct` null means unparseable. */
export const run = (caseId: string, rep: number, correct: boolean | null, extra: Partial<RunRecord> = {}): RunRecord => ({
  case_id: caseId, subset: "version_deadline", knowable_before_omnibus: false, kind: "generation", model: "m", arm: "plain", rep, raw: "", parsed: correct === null ? null : {},
  score: { correct, checks: {} }, prompt_tokens: 0, completion_tokens: 0, cost: 0.01, tool_calls: [], requests: 1, finish_reason: "stop", status: 200, latency_ms: 0, prompt_version: "eval-prompt-v1", ...extra,
});

/** YAML with `n` generation cases (subset version_deadline) that the mock can answer; the mock is wrong on every third. */
export function casesYaml(n: number): string {
  return Array.from({ length: n }, (_, i) => `- id: T${String(i + 1).padStart(2, "0")}
  kind: generation
  subset: version_deadline
  question: "q${i + 1}"
  as_of: "2026-10-05"
  knowable_before_omnibus: false
  origin: constructed
  expected: { date: "2027-12-02", articles: ["art_113"] }
  ground_truth: { celex: "02024R1689-20260727", pinpoint: "Art. 113", quote: "x" }
  legal_review: none
`).join("");
}
