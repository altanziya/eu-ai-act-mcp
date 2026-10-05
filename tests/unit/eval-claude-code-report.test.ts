import { describe, expect, it } from "vitest";
import { renderReport, summarize } from "../../src/eval/report.js";
import type { RunRecord } from "../../src/eval/report.js";
import { run } from "./helpers/eval-runs.js";

const meta = { cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 1, max_usd: 1, total_cost_usd: 0.02 };
const cc = (caseId: string, extra: Partial<RunRecord> = {}): RunRecord =>
  run(caseId, 0, true, { model: "claude-code/claude-opus-5-5", backend: "claude-code", cost: 0, cost_equiv_usd: 0.25, ...extra });

describe("report: backend and cost equivalent", () => {
  it("cells carry the backend and sum cost_equiv_usd apart from cost", () => {
    const lines = [cc("A"), cc("B"), run("A", 0, true, { model: "x/y", cost: 0.02 })];
    const [a, b] = summarize(lines);
    expect(a).toMatchObject({ model: "claude-code/claude-opus-5-5", backend: "claude-code", cost_usd: 0, cost_equiv_usd: 0.5 });
    expect(b).toMatchObject({ model: "x/y", backend: "openrouter", cost_usd: 0.02, cost_equiv_usd: 0 });
  });
  it("the backend falls back to the model id for runs stored without the field", () => {
    expect(summarize([run("A", 0, true, { model: "claude-code/m" })])[0]?.backend).toBe("claude-code");
  });
  it("tables have Backend and cost-equivalent columns; the methodology paragraph appears only with a claude-code model", () => {
    const md = renderReport({ ...meta, total_cost_equiv_usd: 0.5 }, [cc("A"), cc("B"), run("A", 0, true, { model: "x/y", cost: 0.02 })]);
    expect(md).toMatch(/Cost-equivalent USD \(subscription\) \| Backend \|/);
    const row = md.split("\n").find((l) => l.startsWith("| claude-code/claude-opus-5-5 | plain | 2 |"));
    expect(row).toMatch(/\| 0\.0000 \| 0\.5000 \| claude-code \|$/);
    expect(md.split("\n").find((l) => l.startsWith("| x/y | plain |"))).toMatch(/\| 0\.0200 \| - \| openrouter \|$/);
    expect(md).toMatch(/Backend claude-code .*Claude Code CLI .*subscription/);
    expect(md).toMatch(/identity sentence of the Agent SDK/);
    expect(md).toMatch(/account e-mail/);
    expect(md).toMatch(/execution date/);
    expect(md).toMatch(/Anthropic's own/);
    expect(md).toMatch(/Cost equivalent of the claude-code runs .*: 0\.5000 USD/);
    expect(renderReport(meta, [run("A", 0, true)])).not.toMatch(/Backend claude-code|identity sentence/);
  });
});
