import { describe, expect, it } from "vitest";
import { parseAnswer } from "../../src/eval/answer.js";
import type { EvalCase } from "../../src/eval/cases.js";
import { mockAnswer } from "../../src/eval/run.js";
import { scoreCase } from "../../src/eval/score.js";

const mk = (expected: EvalCase["expected"], kind: EvalCase["kind"] = "generation"): EvalCase => ({
  id: "M", kind, subset: "version_deadline", question: "q", as_of: "2026-10-05", knowable_before_omnibus: false, origin: "constructed",
  expected, ground_truth: { celex: "x", pinpoint: "y", quote: "z" }, legal_review: "none",
});
const correct = (c: EvalCase, index: number): boolean | null => scoreCase(c, parseAnswer(mockAnswer(c, index))).correct;

describe("mock answer for claim cases", () => {
  const claims = ["yes", "no", "ja", "nein", "2 December 2027", "no later than 2027"];
  it("is right on the first two of three cases and wrong on every third", () => {
    for (const claim of claims) {
      const c = mk({ claim });
      expect([correct(c, 0), correct(c, 1), correct(c, 2), correct(c, 3), correct(c, 5)], claim).toEqual([true, true, false, true, false]);
    }
  });
  it("yes/no: the first word carries the claim, a deliberate error flips it", () => {
    expect(parseAnswer(mockAnswer(mk({ claim: "no" }), 0))?.answer).toBe("No. mock answer");
    expect(parseAnswer(mockAnswer(mk({ claim: "no" }), 2))?.answer).toBe("Yes. mock answer");
    expect(parseAnswer(mockAnswer(mk({ claim: "yes" }), 0))?.answer).toBe("Yes. mock answer");
    expect(parseAnswer(mockAnswer(mk({ claim: "yes" }), 2))?.answer).toBe("No. mock answer");
  });
  it("other claims: contained in the answer; a deliberate error leaves it out", () => {
    expect(parseAnswer(mockAnswer(mk({ claim: "2 December 2027" }), 0))?.answer).toBe("mock answer: 2 December 2027");
    expect(parseAnswer(mockAnswer(mk({ claim: "2 December 2027" }), 2))?.answer).toBe("mock answer");
  });
  it("combines with date and with evaluation cases", () => {
    const c = mk({ date: "2027-12-02", claim: "yes" });
    expect([correct(c, 0), correct(c, 2)]).toEqual([true, false]);
    const e = mk({ verdict: "correct", claim: "no" }, "evaluation");
    expect([correct(e, 0), correct(e, 2)]).toEqual([true, false]);
  });
  it("a case that only expects articles can be wrong too", () => {
    const c = mk({ articles: ["art_113"] });
    expect([correct(c, 0), correct(c, 1), correct(c, 2)]).toEqual([true, true, false]);
  });
  it("cases without a claim keep the plain mock answer", () => {
    expect(parseAnswer(mockAnswer(mk({ date: "2027-12-02" }), 0))?.answer).toBe("mock answer");
  });
});
