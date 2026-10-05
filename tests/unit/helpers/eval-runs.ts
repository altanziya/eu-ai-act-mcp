import type { RunRecord } from "../../../src/eval/report.js";

/** A run record for report tests; `correct` null means unparseable. */
export const run = (caseId: string, rep: number, correct: boolean | null, extra: Partial<RunRecord> = {}): RunRecord => ({
  case_id: caseId, subset: "version_deadline", knowable_before_omnibus: false, kind: "generation", model: "m", arm: "plain", rep, raw: "", parsed: correct === null ? null : {},
  score: { correct, checks: {} }, prompt_tokens: 0, completion_tokens: 0, cost: 0.01, tool_calls: [], requests: 1, finish_reason: "stop", status: 200, latency_ms: 0, prompt_version: "eval-prompt-v1", ...extra,
});
