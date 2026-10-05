import { describe, expect, it } from "vitest";
import { renderReport, summarize } from "../../src/eval/report.js";
import { run } from "./helpers/eval-runs.js";

const v = (id: string, version: string | null | undefined, extra = {}) => ({ ...run(id, 0, true, extra), parsed: version === undefined ? {} : { version } });
const meta = { cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 1, max_usd: 1, total_cost_usd: 0.01 };

describe("version named per model x arm", () => {
  const lines = [
    v("A", "CELEX 32024R1689"),
    v("B", "Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744"),
    v("C", "32024R1689 and 2026/1744"),
    v("D", "Konsolidierte Fassung"),
    v("E", null),
    v("F", undefined),
    run("G", 0, null), // unparseable: not counted
  ];
  it("counts the four classes over parsed runs", () => {
    expect(summarize(lines)[0]?.version_named).toEqual({ n: 6, "32024R1689": 1, "02024R1689-20260727": 1, both: 1, none: 3 });
  });
  it("is separate per arm and independent of correctness", () => {
    const cells = summarize([v("A", "32024R1689", { arm: "plain" }), v("A", "02024R1689-20260727", { arm: "web" })]);
    expect(cells.map((c) => c.version_named["32024R1689"])).toEqual([1, 0]);
    expect(cells.map((c) => c.excluded_cases)).toEqual([0, 0]);
  });
  it("the report shows the shares as a column", () => {
    const md = renderReport(meta, lines);
    expect(md).toMatch(/Version named: 2024 \/ 2026 \/ both \/ none/);
    expect(md).toMatch(/\| 17 % \/ 17 % \/ 17 % \/ 50 % \|/);
  });
});
