import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadCases } from "../../src/eval/cases.js";
import type { EvalCase } from "../../src/eval/cases.js";
import { scoreCase } from "../../src/eval/score.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-claim-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const base: EvalCase = {
  id: "C1", kind: "generation", subset: "version_deadline", question: "q", as_of: "2026-10-05", knowable_before_omnibus: false, origin: "constructed",
  expected: { claim: "yes" }, ground_truth: { celex: "x", pinpoint: "y", quote: "z" }, legal_review: "none",
};
const withClaim = (claim: string): EvalCase => ({ ...base, expected: { claim } });

describe("expected.claim", () => {
  it("yes/no compares the first word of the answer, ignoring case and punctuation", () => {
    expect(scoreCase(withClaim("yes"), { answer: "Yes, the Omnibus changed it." }).checks).toEqual({ claim: true });
    expect(scoreCase(withClaim("yes"), { answer: "  \"YES.\" It did" }).correct).toBe(true);
    expect(scoreCase(withClaim("yes"), { answer: "No, it did not. Yes it might." }).correct).toBe(false);
    expect(scoreCase(withClaim("no"), { answer: "No - nothing changed" }).correct).toBe(true);
    expect(scoreCase(withClaim("no"), { answer: "Yes" }).correct).toBe(false);
  });
  it("ja and nein are equivalent to yes and no, on both sides", () => {
    expect(scoreCase(withClaim("yes"), { answer: "Ja, geändert." }).correct).toBe(true);
    expect(scoreCase(withClaim("nein"), { answer: "No, unchanged" }).correct).toBe(true);
    expect(scoreCase(withClaim("ja"), { answer: "Nein." }).correct).toBe(false);
  });
  it("other claims must be contained in the answer, case-insensitive", () => {
    expect(scoreCase(withClaim("2 December 2027"), { answer: "It applies from 2 DECEMBER 2027." }).correct).toBe(true);
    expect(scoreCase(withClaim("2 December 2027"), { answer: "It applies from 2 August 2026." }).correct).toBe(false);
    expect(scoreCase(withClaim("no later than 2027"), { answer: "No later than 2027, yes." }).correct).toBe(true);
    expect(scoreCase(withClaim("no later than 2027"), { answer: "No, later." }).correct).toBe(false);
  });
  it("a null or missing answer is wrong, not unparseable", () => {
    expect(scoreCase(withClaim("yes"), { answer: null }).correct).toBe(false);
    expect(scoreCase(withClaim("yes"), { date: "2027-12-02" }).correct).toBe(false);
    expect(scoreCase(withClaim("yes"), null).correct).toBeNull();
  });
  it("combines with the other checks", () => {
    const c: EvalCase = { ...base, expected: { claim: "yes", date: "2027-12-02" } };
    expect(scoreCase(c, { answer: "Yes", date: "2027-12-02" })).toEqual({ correct: true, checks: { date: true, claim: true } });
    expect(scoreCase(c, { answer: "Yes", date: "2026-01-01" }).correct).toBe(false);
  });
});

const yaml = (expected: string, kind = "generation"): string => `- id: L1
  kind: ${kind}
  subset: version_deadline
  question: q
  as_of: "2026-10-05"
  knowable_before_omnibus: false
  origin: constructed
  expected: ${expected}
  ground_truth: { celex: x, pinpoint: y, quote: z }
  legal_review: none
`;
const load = (text: string): EvalCase[] => {
  const p = join(tmp, "c.yaml");
  writeFileSync(p, text);
  return loadCases(p);
};

describe("loader: claim", () => {
  it("accepts a claim, which alone satisfies kind generation", () => {
    expect(load(yaml('{ claim: "yes" }'))[0]?.expected.claim).toBe("yes");
  });
  it("kind generation needs date, articles or claim (a version alone is not enough)", () => {
    expect(() => load(yaml("{ version: 32024R1689 }"))).toThrow(/case L1: field expected/);
    expect(() => load(yaml("{ date: 2027-12-02 }"))).not.toThrow();
    expect(() => load(yaml("{ articles: [art_113] }"))).not.toThrow();
  });
  it("rejects a non-string or empty claim", () => {
    expect(() => load(yaml("{ claim: 5 }"))).toThrow(/expected\.claim/);
    expect(() => load(yaml('{ claim: " " }'))).toThrow(/expected\.claim/);
  });
});
