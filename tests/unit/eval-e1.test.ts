import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { computeE1, renderReport } from "../../src/eval/report.js";
import { main, parseArgs } from "../../src/eval/run.js";
import { casesYaml, run } from "./helpers/eval-runs.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-e1-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

const base = ["--cases", "c.yaml", "--models", "a/b,c/d", "--max-usd", "1", "--out", "o"];

describe("--primary-model", () => {
  it("is required for real runs, optional in a dry run, and must be one of --models", () => {
    expect(() => parseArgs(base)).toThrow(/--primary-model/);
    expect(parseArgs([...base, "--dry-run"]).primaryModel).toBeNull();
    expect(parseArgs([...base, "--primary-model", "c/d"]).primaryModel).toBe("c/d");
    expect(() => parseArgs([...base, "--primary-model", "x/y"])).toThrow(/must be one of --models/);
  });
});

describe("E1 in the report: one line, one evaluation", () => {
  const meta = { cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 1, max_usd: 1, total_cost_usd: 0.01 };
  const lines = [
    ...["A", "B", "C", "D", "E", "F"].flatMap((id, i) => [
      run(id, 0, i < 3 ? false : true, { model: "p", arm: "web" }),
      run(id, 0, false, { model: "p", arm: "plain" }),
      run(id, 0, false, { model: "q", arm: "web" }),
      run(id, 0, false, { model: "p", arm: "web", subset: "evaluation" }),
    ]),
  ];
  it("computes errors, n and interval only for primary model x web x version_deadline", () => {
    const e1 = computeE1(lines, "p");
    expect(e1).toMatchObject({ model: "p", arm: "web", subset: "version_deadline", errors: 3, n: 6, decision: "go" });
    expect(e1?.lower).toBeGreaterThan(0.1);
    expect(computeE1(lines, "nobody")).toBeNull();
  });
  it("report has exactly one line starting with E1 decision, and no decision elsewhere", () => {
    const md = renderReport({ ...meta, primary_model: "p", e1: computeE1(lines, "p") }, lines);
    const hits = md.split("\n").filter((l) => l.startsWith("E1 decision"));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatch(/^E1 decision: go \(p, arm web, subset version_deadline: 3\/6 cases wrong/);
    const tableRows = md.split("\n").filter((l) => l.startsWith("|"));
    expect(tableRows.length).toBeGreaterThan(10);
    expect(tableRows.join("\n")).not.toMatch(/\b(go|undecided|not_supported)\b|E1/);
  });
  it("still one line when there is nothing to decide", () => {
    for (const m of [{ ...meta }, { ...meta, primary_model: "nobody", e1: null }]) {
      expect(renderReport(m, lines).split("\n").filter((l) => l.startsWith("E1 decision"))).toHaveLength(1);
    }
  });
});

describe("E1 in a dry run with enough cases for the mock error", () => {
  it("writes results.json.e1 and one E1 line; the mock is wrong on every third case", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const cases = join(tmp, "six.yaml");
    writeFileSync(cases, casesYaml(6));
    const out = join(tmp, "dry-e1");
    await main(["--dry-run", "--cases", cases, "--models", "mock/a,mock/b", "--arms", "plain,web", "--reps", "1", "--max-usd", "0", "--out", out, "--primary-model", "mock/a"]);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.e1).toMatchObject({ model: "mock/a", arm: "web", subset: "version_deadline", errors: 2, n: 6, decision: "undecided" });
    expect(Object.keys(res.e1).sort()).toEqual(["arm", "decision", "errors", "lower", "model", "n", "subset", "upper"]);
    expect(readFileSync(join(out, "report.md"), "utf8").split("\n").filter((l) => l.startsWith("E1 decision"))).toHaveLength(1);
  });
  it("without --primary-model the dry run has e1 null", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const cases = join(tmp, "three.yaml");
    writeFileSync(cases, casesYaml(3));
    const out = join(tmp, "dry-no-e1");
    await main(["--dry-run", "--cases", cases, "--models", "mock/a", "--arms", "web", "--reps", "1", "--max-usd", "0", "--out", out]);
    expect(JSON.parse(readFileSync(join(out, "results.json"), "utf8")).e1).toBeNull();
  });
});
