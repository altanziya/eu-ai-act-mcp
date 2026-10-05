import { describe, expect, it } from "vitest";
import { renderReport, summarize } from "../../src/eval/report.js";
import { run } from "./helpers/eval-runs.js";

const call = [{ name: "aiact_diff", arguments: "{}" }];
const t = (id: string, correct: boolean | null, used: boolean) => run(id, 0, correct, { arm: "tools", tool_calls: used ? call : [] });
const meta = { cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 1, max_usd: 1, total_cost_usd: 0.01 };

describe("arm tools: error rate by tool use", () => {
  const lines = [t("A", true, true), t("B", true, true), t("C", false, true), t("D", false, false), t("E", false, false), t("F", true, false), t("G", null, false)];
  it("splits wrong/scored runs by at least one tool call versus none", () => {
    const [c] = summarize(lines);
    expect(c?.tools_usage?.with_tool).toMatchObject({ runs: 3, scored: 3, wrong: 1 });
    expect(c?.tools_usage?.with_tool.rate).toBeCloseTo(1 / 3);
    expect(c?.tools_usage?.no_tool).toMatchObject({ runs: 4, scored: 3, wrong: 2 });
    expect(c?.tools_usage?.no_tool.rate).toBeCloseTo(2 / 3);
  });
  it("is absent for other arms; a group without scored runs has no rate", () => {
    expect(summarize([run("A", 0, true)])[0]?.tools_usage).toBeNull();
    expect(summarize([t("A", true, true)])[0]?.tools_usage?.no_tool).toMatchObject({ runs: 0, scored: 0, rate: null });
  });
  it("the report shows both rates per model x tools arm", () => {
    const md = renderReport(meta, lines);
    expect(md).toMatch(/## Arm tools: error rate by tool use/);
    expect(md).toMatch(/\| m \| tools \| 1\/3 \(33 %\) \| 2\/3 \(67 %\) \|/);
  });
  it("the report says so when the tools arm was not run", () => {
    expect(renderReport(meta, [run("A", 0, true)])).toMatch(/\(arm tools not run\)/);
  });
});
