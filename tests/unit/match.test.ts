/** Matching engine: quote normalization, hard tokens, window search, thresholds (src/tools/match.ts). */
import { describe, expect, it } from "vitest";
import { alignWindow, allowedSoftEdits, bestWindow, detectLang, matchSegments, prepareQuote, tokenize } from "../../src/tools/match.js";

const words = (n: number, prefix = "w"): string => Array.from({ length: n }, (_, i) => `${prefix}${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`).join(" ");

describe("quote normalization", () => {
  it("folds typographic quotes and whitespace, strips a leading list label", () => {
    const q = prepareQuote("  (a) the  “placing” on­the\nmarket  ");
    expect(q.flat).toBe('the "placing" onthe market');
    expect(q.segments).toHaveLength(1);
  });
  it("strips only a label, not a number that belongs to the text", () => {
    expect(prepareQuote("2024 shall apply to all").flat).toBe("2024 shall apply to all");
    expect(prepareQuote("1. Providers shall ensure").flat).toBe("Providers shall ensure");
    expect(prepareQuote("(ba) the placing on the market").flat).toBe("the placing on the market");
  });
  it("splits at ellipses", () => {
    const q = prepareQuote("Providers shall ensure [...] AI literacy of staff … and others (...) end of text");
    expect(q.segments.map((s) => s.text)).toEqual(["Providers shall ensure", "AI literacy of staff", "and others", "end of text"]);
  });
});

describe("tokens and hard tokens", () => {
  const hard = (s: string): string[] => tokenize(s).filter((t) => t.hard).map((t) => t.norm);
  it("lower-cases and drops boundary punctuation; lone punctuation is no token", () => {
    expect(tokenize("Hello, (EU) 2024/1689; - end.").map((t) => t.norm)).toEqual(["hello", "eu", "2024/1689", "end"]);
  });
  it("marks numbers, months (EN/DE) and negations as hard", () => {
    expect(hard("shall apply from 2 August 2026")).toEqual(["2", "august", "2026"]);
    expect(hard("gilt ab dem 2. Februar 2025")).toEqual(["2", "februar", "2025"]);
    expect(hard("shall not apply, no exception; kein Zugang, nicht erlaubt")).toEqual(["not", "no", "kein", "nicht"]);
  });
  it("marks spelled-out numbers as hard", () => {
    expect(hard("for a period of six months and twenty days")).toEqual(["six", "twenty"]);
    expect(hard("innerhalb von zwölf Monaten, ein Anbieter")).toEqual(["zwölf"]);
  });
  it("treats 'may' as a month only next to a number", () => {
    expect(hard("the Commission may adopt")).toEqual([]);
    expect(hard("ready by 2 May 2025")).toEqual(["2", "may", "2025"]);
  });
});

describe("thresholds", () => {
  it("allows 0 soft edits for 6-19 tokens, 1 from 20 tokens (0.95), 2 from 40", () => {
    expect([6, 19, 20, 39, 40].map(allowedSoftEdits)).toEqual([0, 0, 1, 1, 2]);
  });
  const corpus = tokenize(`${words(5, "x")} ${words(30)} ${words(5, "y")}`);
  const quoteWith = (n: number, change: number): ReturnType<typeof tokenize> => {
    const w = words(30).split(" ").slice(0, n);
    if (change >= 0) w[change] = "changed";
    return tokenize(w.join(" "));
  };
  it("accepts one soft difference at 20 tokens (similarity 0.95), rejects it at 19 tokens", () => {
    const ok = matchSegments([{ tokens: quoteWith(20, 7) }], corpus, 20);
    expect(ok).not.toBeNull();
    expect(ok?.soft).toBe(1);
    expect(matchSegments([{ tokens: quoteWith(19, 7) }], corpus, 19)).toBeNull();
  });
  it("rejects two soft differences at 20 tokens", () => {
    const q = quoteWith(20, 7);
    (q[12] as { norm: string }).norm = "other";
    expect(matchSegments([{ tokens: q }], corpus, 20)).toBeNull();
  });
});

describe("window search", () => {
  const t = tokenize("alpha beta gamma delta epsilon zeta eta theta");
  it("finds an exact window with zero edits", () => {
    expect(bestWindow(tokenize("gamma delta epsilon"), t)).toEqual({ start: 2, end: 5, edits: 0 });
  });
  it("prefers the substitution reading of a changed last token (longer window on ties)", () => {
    const w = bestWindow(tokenize("gamma delta XXXX"), t);
    expect(w).toEqual({ start: 2, end: 5, edits: 1 });
  });
  it("classifies edits involving a hard token as hard mismatches", () => {
    const corpus = tokenize("It shall apply from 2 August 2026 and more");
    const q = tokenize("shall apply from 2 August 2027");
    const w = bestWindow(q, corpus);
    const a = alignWindow(q, corpus, w);
    expect(a.hard).toBe(1);
    expect(a.soft).toBe(0);
    expect(a.hardMismatches).toEqual([{ in_quote: "2027", in_corpus: "2026" }]);
  });
  it("a dropped negation is a hard mismatch with an empty quote side", () => {
    const corpus = tokenize("providers shall not place such systems on the market");
    const q = tokenize("providers shall place such systems on the market");
    const a = alignWindow(q, corpus, bestWindow(q, corpus));
    expect(a.hardMismatches).toEqual([{ in_quote: "", in_corpus: "not" }]);
  });
  it("does not report a hard mismatch when the rest of the quote does not match", () => {
    const corpus = tokenize("the Commission shall adopt guidelines by 2 February 2026 at the latest");
    const q = tokenize("1 2 3 4 5 6 7 8");
    expect(matchSegments([{ tokens: q }], corpus, q.length)).toBeNull();
  });
});

describe("language detection", () => {
  it("detects EN and DE by function words, null if undecided", () => {
    expect(detectLang("Providers shall ensure that the system is not used for the purposes of this Regulation")).toBe("en");
    expect(detectLang("Anbieter müssen sicherstellen, dass das System nicht für die Zwecke dieser Verordnung verwendet wird")).toBe("de");
    expect(detectLang("2024/1689 12345")).toBeNull();
  });
});
