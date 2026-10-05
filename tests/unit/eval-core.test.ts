import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parseAnswer } from "../../src/eval/answer.js";
import { loadCases } from "../../src/eval/cases.js";
import type { EvalCase } from "../../src/eval/cases.js";
import { normalizeDate, scoreCase } from "../../src/eval/score.js";
import { clopperPearson, decideE1 } from "../../src/eval/stats.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-core-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("stats", () => {
  it("rejects invalid input and widens with alpha", () => {
    expect(() => clopperPearson(3, 2)).toThrow(RangeError);
    expect(() => clopperPearson(0, 0)).toThrow(RangeError);
    const a = clopperPearson(5, 30, 0.05);
    const b = clopperPearson(5, 30, 0.01);
    expect(b.lower).toBeLessThan(a.lower);
    expect(b.upper).toBeGreaterThan(a.upper);
  });
  it("boundary cases are exact", () => {
    expect(clopperPearson(0, 10).lower).toBe(0);
    expect(clopperPearson(10, 10).upper).toBe(1);
  });
  it("decision: undecided needs errors >= 1 and n < 45", () => {
    expect(decideE1({ errors: 1, n: 44 })).toBe("undecided");
    expect(decideE1({ errors: 1, n: 45 })).toBe("not_supported");
  });
});

describe("parseAnswer", () => {
  it("takes the first object, ignores surrounding prose and braces in strings", () => {
    const a = parseAnswer('Sure. {"answer": "use {braces} freely", "date": "2027-12-02"} {"date": "1999-01-01"}');
    expect(a?.date).toBe("2027-12-02");
    expect(a?.answer).toBe("use {braces} freely");
  });
  it("keeps null, drops unknown keys and non-scalars", () => {
    const a = parseAnswer('{"date": null, "article": ["x"], "foo": 1, "version": 2026}');
    expect(a).toEqual({ date: null, version: "2026" });
  });
  it("rejects arrays and plain fences without an object", () => {
    expect(parseAnswer("[1,2]")).toBeNull();
    expect(parseAnswer("```json\nnot json\n```")).toBeNull();
  });
});

describe("normalizeDate", () => {
  it("understands common spellings", () => {
    for (const s of ["2027-12-02", "2 December 2027", "December 2, 2027", "02.12.2027", "2. Dezember 2027", "2nd December 2027", "Applies from 2027-12-02."]) {
      expect(normalizeDate(s), s).toBe("2027-12-02");
    }
  });
  it("rejects impossible or unknown dates", () => {
    expect(normalizeDate("2027-02-30")).toBeNull();
    expect(normalizeDate("soon")).toBeNull();
  });
});

describe("scoreCase", () => {
  const gen: EvalCase = {
    id: "T", kind: "generation", subset: "version_deadline", question: "q", as_of: "2026-10-05", knowable_before_omnibus: false, origin: "constructed",
    expected: { date: "2027-12-02", articles: ["art_6", "art_113"] },
    ground_truth: { celex: "x", pinpoint: "y", quote: "z" }, legal_review: "none",
  };
  it("accepts any listed article and its descendants, not siblings", () => {
    expect(scoreCase(gen, { date: "2 December 2027", article: "Article 6(2)" }).correct).toBe(true);
    expect(scoreCase(gen, { date: "2027-12-02", article: "art_113.sub_3.c" }).correct).toBe(true);
    expect(scoreCase(gen, { date: "2027-12-02", article: "Article 60" }).checks["article"]).toBe(false);
    expect(scoreCase(gen, { date: "2027-12-02", article: "Article 1130" }).checks["article"]).toBe(false);
    expect(scoreCase(gen, { date: "2027-12-02", article: null }).correct).toBe(false);
  });
  it("evaluation without verdict is wrong, not null", () => {
    const ev = { ...gen, kind: "evaluation" as const, subset: "evaluation" as const, expected: { verdict: "correct" } };
    expect(scoreCase(ev, {}).correct).toBe(false);
  });
});

describe("loadCases validation", () => {
  const base = `- id: A
  kind: generation
  subset: version_deadline
  question: q
  as_of: "2026-10-05"
  knowable_before_omnibus: false
  origin: constructed
  expected: { date: "2027-12-02" }
  ground_truth: { celex: c, pinpoint: p, quote: q }
  legal_review: none
`;
  const load = (text: string): EvalCase[] => {
    const p = join(tmp, `c${Math.random().toString(36).slice(2)}.yaml`);
    writeFileSync(p, text);
    return loadCases(p);
  };
  it("accepts the base case and reports id and field on errors", () => {
    expect(load(base)).toHaveLength(1);
    expect(() => load(base.replace("kind: generation", "kind: other"))).toThrow(/case A: field kind/);
    expect(() => load(base.replace('"2026-10-05"', "yesterday"))).toThrow(/case A: field as_of/);
    expect(() => load(base.replace("knowable_before_omnibus: false", "knowable_before_omnibus: no-idea"))).toThrow(/knowable_before_omnibus/);
    expect(() => load(base.replace('expected: { date: "2027-12-02" }', "expected: {}"))).toThrow(/case A: field expected/);
    expect(() => load(base.replace("{ celex: c, pinpoint: p, quote: q }", "{ celex: c, pinpoint: p }"))).toThrow(/ground_truth\.quote/);
    expect(() => load(base.replace("legal_review: none", "legal_review: maybe"))).toThrow(/legal_review/);
    expect(() => load("not: a list")).toThrow(/list/);
  });
  it("requires a verdict for evaluation cases", () => {
    const ev = base.replace("kind: generation", "kind: evaluation").replace("subset: version_deadline", "subset: evaluation");
    expect(() => load(ev)).toThrow(/expected\.verdict/);
  });
});

describe("ordinal citations", () => {
  const c: EvalCase = {
    id: "T", kind: "generation", subset: "version_deadline", question: "q", as_of: "2026-10-05", knowable_before_omnibus: false, origin: "constructed",
    expected: { articles: ["art_113"] }, ground_truth: { celex: "x", pinpoint: "y", quote: "z" }, legal_review: "none",
  };
  it("falls back to the article when the citation has ordinal wording", () => {
    expect(scoreCase(c, { article: "Article 113, third subparagraph, point (c)(i)" }).correct).toBe(true);
    expect(scoreCase(c, { article: "Article 6, second paragraph" }).correct).toBe(false);
    expect(scoreCase(c, { article: "the Omnibus" }).correct).toBe(false);
  });
  it("does not match a deeper accepted id through the fallback", () => {
    const deep = { ...c, expected: { articles: ["art_113.sub_3.c.i"] } };
    expect(scoreCase(deep, { article: "Article 113, third subparagraph, point (c)(i)" }).correct).toBe(false);
  });
});
