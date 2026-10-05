/**
 * Golden tests day 4a (plan/day-4.md "Feste API"). Written by the orchestrator;
 * read-only for workers (write-guard hook, frozen hash in plan/frozen.sha256).
 *
 *   src/eval/stats.ts   clopperPearson(k, n, alpha?), decideE1({ errors, n })
 *   src/eval/answer.ts  parseAnswer(text)
 *   src/eval/score.ts   normalizeVersion(s), scoreCase(c, a)
 *   src/eval/cases.ts   loadCases(path)
 *   npm run eval -- --dry-run (no network, no cost)
 * Reference intervals computed independently (exact binomial, bisection) on 2026-10-05.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { clopperPearson, decideE1 } from "../../src/eval/stats.js";
import { parseAnswer } from "../../src/eval/answer.js";
import { normalizeVersion, scoreCase } from "../../src/eval/score.js";
import { loadCases } from "../../src/eval/cases.js";

const tmp = mkdtempSync(join(tmpdir(), "golden-day4-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("day4 golden: Clopper-Pearson and E1 decision", () => {
  const ref: Array<[number, number, number, number]> = [
    [0, 30, 0.0, 0.1157],
    [1, 30, 0.0008, 0.1722],
    [4, 30, 0.0376, 0.3072],
    [5, 30, 0.0564, 0.3472],
    [5, 45, 0.0371, 0.2405],
    [6, 45, 0.0505, 0.2679],
    [12, 40, 0.1656, 0.4653],
    [30, 30, 0.8843, 1.0],
  ];
  for (const [k, n, lo, hi] of ref) {
    it(`CP 95 % for ${k}/${n}`, () => {
      const r = clopperPearson(k, n);
      expect(r.lower).toBeCloseTo(lo, 3);
      expect(r.upper).toBeCloseTo(hi, 3);
    });
  }
  it("decision rule as pre-registered", () => {
    expect(decideE1({ errors: 0, n: 30 })).toBe("not_supported");
    expect(decideE1({ errors: 1, n: 30 })).toBe("undecided");
    expect(decideE1({ errors: 4, n: 30 })).toBe("undecided");
    expect(decideE1({ errors: 5, n: 30 })).toBe("go");
    expect(decideE1({ errors: 5, n: 45 })).toBe("not_supported");
    expect(decideE1({ errors: 6, n: 45 })).toBe("go");
  });
});

describe("day4 golden: parseAnswer", () => {
  it("reads plain and fenced JSON", () => {
    expect(parseAnswer('{"date":"2027-12-02","version":"consolidated"}')?.date).toBe("2027-12-02");
    const fenced = 'Here you go:\n```json\n{"article":"Article 113","verdict":"incorrect"}\n```\nThanks';
    const a = parseAnswer(fenced);
    expect(a?.article).toBe("Article 113");
    expect(a?.verdict).toBe("incorrect");
  });
  it("returns null without a JSON object", () => {
    expect(parseAnswer("I cannot answer that.")).toBeNull();
    expect(parseAnswer('{"date": "2027-12-02",')).toBeNull();
    expect(parseAnswer("")).toBeNull();
  });
});

describe("day4 golden: scoring", () => {
  it("normalizes version strings", () => {
    expect(normalizeVersion("Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744")).toBe("02024R1689-20260727");
    expect(normalizeVersion("consolidated version 02024R1689-20260727")).toBe("02024R1689-20260727");
    expect(normalizeVersion("Konsolidierte Fassung")).toBe("02024R1689-20260727");
    expect(normalizeVersion("Regulation (EU) 2024/1689 (Official Journal)")).toBe("32024R1689");
    expect(normalizeVersion("CELEX 32024R1689")).toBe("32024R1689");
    expect(normalizeVersion("the latest one")).toBeNull();
    expect(normalizeVersion("")).toBeNull();
  });

  const gen = {
    id: "T1",
    kind: "generation" as const,
    subset: "version_deadline" as const,
    question: "q",
    as_of: "2026-10-05",
    knowable_before_omnibus: false,
    origin: "constructed" as const,
    expected: { date: "2027-12-02", version: "02024R1689-20260727", articles: ["art_113"] },
    ground_truth: { celex: "02024R1689-20260727", pinpoint: "Art. 113", quote: "q" },
    legal_review: "none" as const,
  };

  it("all checks right -> correct", () => {
    const s = scoreCase(gen, { date: "2027-12-02", version: "as amended by 2026/1744", article: "Article 113(3)(c)" });
    expect(s.checks).toEqual({ date: true, version: true, article: true });
    expect(s.correct).toBe(true);
  });
  it("wrong date -> incorrect", () => {
    const s = scoreCase(gen, { date: "2026-08-02", version: "consolidated", article: "Art. 113" });
    expect(s.checks.date).toBe(false);
    expect(s.correct).toBe(false);
  });
  it("wrong version -> incorrect", () => {
    const s = scoreCase(gen, { date: "2027-12-02", version: "Regulation (EU) 2024/1689", article: "Art. 113" });
    expect(s.checks.version).toBe(false);
    expect(s.correct).toBe(false);
  });
  it("other article -> incorrect", () => {
    const s = scoreCase(gen, { date: "2027-12-02", version: "consolidated", article: "Article 6(2)" });
    expect(s.checks.article).toBe(false);
    expect(s.correct).toBe(false);
  });
  it("unparseable answer -> null (adjudication)", () => {
    expect(scoreCase(gen, null).correct).toBeNull();
  });
  it("only expected fields are checked", () => {
    const onlyDate = { ...gen, expected: { date: "2025-02-02" } };
    const s = scoreCase(onlyDate, { date: "2025-02-02" });
    expect(Object.keys(s.checks)).toEqual(["date"]);
    expect(s.correct).toBe(true);
  });
  it("evaluation tasks compare the verdict", () => {
    const ev = { ...gen, id: "E1", kind: "evaluation" as const, subset: "evaluation" as const, expected: { verdict: "incorrect" } };
    expect(scoreCase(ev, { verdict: "Incorrect" }).correct).toBe(true);
    expect(scoreCase(ev, { verdict: "correct" }).correct).toBe(false);
  });
});

const fixture = `- id: G01
  kind: generation
  subset: version_deadline
  question: "As of today, from when do the obligations for high-risk AI systems listed in Annex III apply?"
  as_of: "2026-10-05"
  knowable_before_omnibus: false
  origin: constructed
  expected: { date: "2027-12-02", version: "02024R1689-20260727", articles: ["art_113"] }
  ground_truth: { celex: "02024R1689-20260727", pinpoint: "Art. 113", quote: "x" }
  legal_review: none
- id: E01
  kind: evaluation
  subset: evaluation
  question: "Is this quote correct for Article 5(1)(a)? ..."
  as_of: "2026-10-05"
  knowable_before_omnibus: true
  origin: constructed
  expected: { verdict: correct }
  ground_truth: { celex: "02024R1689-20260727", pinpoint: "Art. 5(1)(a)", quote: "x" }
  legal_review: none
`;

describe("day4 golden: case file and dry run", () => {
  it("loads a valid case file", () => {
    const p = join(tmp, "cases.yaml");
    writeFileSync(p, fixture);
    const cs = loadCases(p);
    expect(cs.map((c) => c.id)).toEqual(["G01", "E01"]);
    expect(cs[0]?.expected.date).toBe("2027-12-02");
  });
  it("rejects duplicate ids and missing fields", () => {
    const dup = join(tmp, "dup.yaml");
    writeFileSync(dup, fixture + fixture);
    expect(() => loadCases(dup)).toThrow(/G01/);
    const miss = join(tmp, "miss.yaml");
    writeFileSync(miss, fixture.replace('  as_of: "2026-10-05"\n', ""));
    expect(() => loadCases(miss)).toThrow(/as_of/);
  });
  it("dry run writes runs.jsonl, results.json and report.md without cost", () => {
    const p = join(tmp, "cases.yaml");
    writeFileSync(p, fixture);
    const out = join(tmp, "out");
    const r = spawnSync(
      "npm",
      ["run", "--silent", "eval", "--", "--dry-run", "--cases", p, "--models", "mock/a,mock/b", "--arms", "plain,tools", "--reps", "3", "--max-usd", "0", "--out", out],
      { encoding: "utf8", timeout: 120_000 },
    );
    expect(r.status, r.stderr + r.stdout).toBe(0);
    for (const f of ["runs.jsonl", "results.json", "report.md"]) expect(existsSync(join(out, f)), f).toBe(true);
    const lines = readFileSync(join(out, "runs.jsonl"), "utf8").trim().split("\n");
    expect(lines.length).toBe(2 * 2 * 2 * 3);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.total_cost_usd).toBe(0);
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/Clopper-Pearson/);
  });
});
