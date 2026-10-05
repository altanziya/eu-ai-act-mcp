import { describe, expect, it } from "vitest";
import { renderReport, summarize } from "../../src/eval/report.js";
import { run } from "./helpers/eval-runs.js";

const meta = { cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 3, max_usd: 1, total_cost_usd: 0.01 };

describe("unparseable runs in the majority rule", () => {
  it("2 unparseable + 1 wrong: not wrong by majority and not excluded", () => {
    const [c] = summarize([run("A", 0, null), run("A", 1, null), run("A", 2, false)]);
    expect(c).toMatchObject({ cases: 1, excluded_cases: 0, errors_majority: 0, errors_any: 1, unparseable_runs: 2 });
  });
  it("1 unparseable + 2 wrong: wrong by majority (2 > 3/2)", () => {
    const [c] = summarize([run("A", 0, null), run("A", 1, false), run("A", 2, false)]);
    expect(c).toMatchObject({ cases: 1, excluded_cases: 0, errors_majority: 1 });
  });
  it("3 unparseable: the case is excluded, not wrong", () => {
    const [c] = summarize([run("A", 0, null), run("A", 1, null), run("A", 2, null), run("B", 0, true), run("B", 1, true), run("B", 2, true)]);
    expect(c).toMatchObject({ cases: 1, excluded_cases: 1, errors_majority: 0, unparseable_runs: 3 });
  });
  it("sensitivity counts unparseable runs as wrong and keeps excluded cases in n", () => {
    const lines = [
      run("A", 0, null), run("A", 1, null), run("A", 2, false), // 3 of 3 wrong or unparseable: error
      run("B", 0, null), run("B", 1, null), run("B", 2, null), // excluded, counted as error
      run("C", 0, true), run("C", 1, true), run("C", 2, null), // 1 of 3: no error
      run("D", 0, true), run("D", 1, true), run("D", 2, true),
    ];
    const [c] = summarize(lines);
    expect(c).toMatchObject({ cases: 3, excluded_cases: 1, errors_majority: 0 });
    expect(c?.sensitivity).toMatchObject({ errors: 2, n: 4 });
    expect(c?.sensitivity?.lower).toBeGreaterThan(0);
    expect(c?.sensitivity?.upper).toBeGreaterThan(0.5);
  });
  it("report: one sensitivity row per cell with errors, n and interval; excluded cases column", () => {
    const md = renderReport(meta, [run("A", 0, null), run("A", 1, null), run("A", 2, false), run("B", 0, true), run("B", 1, true), run("B", 2, true)]);
    const row = md.split("\n").find((l) => l.startsWith("|") && l.includes("unparseable counted as wrong"));
    expect(row).toMatch(/\| m \| plain: unparseable counted as wrong \| 2 \| - \| 1 \| \[0\.\d{4}, 0\.\d{4}\]/);
    expect(md).toMatch(/Excluded cases/);
  });
});
