/**
 * Matching engine of aiact_verify_citation (V0): quote preparation, tokens, hard tokens, window search.
 *
 * Rules (fixed here, documented in README "Verification levels V0-V2"):
 *  - Quote preparation: `normalizeText` (NFC, soft hyphens, typographic quotes, whitespace), line breaks to spaces,
 *    a list label at the start removed ("(a)", "a)", "(1)", "1.", dash/bullet), split into segments at ellipses
 *    ("[...]", "[…]", "(...)", "…", "...").
 *  - Token: whitespace-separated word, lower-cased, leading/trailing characters that are not letters or digits removed.
 *    Tokens that become empty (a lone ";" or "-") do not exist.
 *  - Hard tokens: tokens containing a digit, month names (EN/DE; "may" only next to a number), negations
 *    (not, no, nicht, kein, keine, keinen, keinem, keiner, keines). They must be equal.
 *  - Window search: Sellers' approximate substring matching on tokens (unit edit costs), free start and end in the
 *    corpus text. Similarity = 1 - soft_edits / quote_tokens, where an edit that involves a hard token on either side
 *    is a hard edit and not counted as soft.
 *  - Thresholds on soft edits: similarity >= 0.95 from 20 tokens, >= 0.97 for 6 to 19 tokens.
 */
import { normalizeText } from "../parser/normalize.js";

export interface Tok {
  /** Lower-cased, boundary punctuation removed: used for comparison. */
  norm: string;
  /** Same without lower-casing: used for output. */
  shown: string;
  /** Character offsets in the text the token was cut from. */
  start: number;
  end: number;
  hard: boolean;
}

const MONTHS = new Set([
  "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december",
  "januar", "februar", "märz", "mai", "juni", "juli", "oktober", "dezember",
]);
const NEGATIONS = new Set(["not", "no", "nicht", "kein", "keine", "keinen", "keinem", "keiner", "keines"]);
const BOUNDARY = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    const shown = m[0].replace(BOUNDARY, "");
    if (shown === "") continue;
    toks.push({ norm: shown.toLowerCase(), shown, start: m.index, end: m.index + m[0].length, hard: false });
  }
  toks.forEach((t, i) => {
    const near = (j: number): boolean => /^\d{1,4}$/.test(toks[j]?.norm ?? "");
    t.hard = /\d/.test(t.norm) || MONTHS.has(t.norm) || NEGATIONS.has(t.norm) || (t.norm === "may" && (near(i - 1) || near(i + 1)));
  });
  return toks;
}

const LABEL = /^(?:\(\s*\d{1,3}[a-z]{0,2}\s*\)|\(\s*[a-z]{1,4}\s*\)|\d{1,3}[a-z]{0,2}[.)]|[a-z][.)]|[—–•·-])\s+/i;
const ELLIPSIS = /\[\s*(?:\.{3}|…)\s*\]|\(\s*(?:\.{3}|…)\s*\)|…|\.{3}/;

export interface PreparedQuote {
  /** Normalized, label-stripped quote with line breaks turned into spaces. */
  flat: string;
  segments: Array<{ text: string; tokens: Tok[] }>;
  /** Total number of tokens over all segments. */
  total: number;
}

export function prepareQuote(quote: string): PreparedQuote {
  let flat = normalizeText(quote).replace(/\s+/g, " ").trim();
  for (let i = 0; i < 2; i++) {
    const m = LABEL.exec(flat);
    if (!m) break;
    flat = flat.slice(m[0].length).trim();
  }
  const segments = flat
    .split(ELLIPSIS)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((text) => ({ text, tokens: tokenize(text) }))
    .filter((s) => s.tokens.length > 0);
  return { flat, segments, total: segments.reduce((n, s) => n + s.tokens.length, 0) };
}

/** Maximum number of soft edits for a segment of `q` tokens: floor((1 - threshold) * q). */
export function allowedSoftEdits(q: number): number {
  return Math.floor((q >= 20 ? 0.05 : 0.03) * q + 1e-9);
}
export const MIN_TOKENS = 6;
export const round4 = (x: number): number => Math.round(x * 10000) / 10000;

export interface Window {
  start: number;
  /** Exclusive. */
  end: number;
  edits: number;
}

/**
 * Best window of `t` (from index `from`) for `q`: fewest edits; ties: longer window, then earlier end.
 * Rolling arrays with start tracking, no matrix.
 */
export function bestWindow(q: readonly Tok[], t: readonly Tok[], from = 0): Window {
  const n = q.length;
  let prev = new Int32Array(n + 1);
  let prevS = new Int32Array(n + 1);
  let cur = new Int32Array(n + 1);
  let curS = new Int32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    prev[i] = i;
    prevS[i] = from;
  }
  let best: Window = { start: from, end: from, edits: n };
  for (let j = from + 1; j <= t.length; j++) {
    const tj = (t[j - 1] as Tok).norm;
    cur[0] = 0;
    curS[0] = j;
    for (let i = 1; i <= n; i++) {
      let v = (prev[i - 1] as number) + ((q[i - 1] as Tok).norm === tj ? 0 : 1);
      let s = prevS[i - 1] as number;
      const up = (cur[i - 1] as number) + 1;
      if (up < v) {
        v = up;
        s = curS[i - 1] as number;
      }
      const left = (prev[i] as number) + 1;
      if (left < v) {
        v = left;
        s = prevS[i] as number;
      }
      cur[i] = v;
      curS[i] = s;
    }
    const d = cur[n] as number;
    const s = curS[n] as number;
    if (d < best.edits || (d === best.edits && j - s > best.end - best.start)) best = { start: s, end: j, edits: d };
    [prev, cur] = [cur, prev];
    [prevS, curS] = [curS, prevS];
  }
  return best;
}

export interface Alignment {
  soft: number;
  hard: number;
  /** Soft quote tokens that were part of a hard edit (they are not matched). */
  softLostInHard: number;
  hardMismatches: Array<{ in_quote: string; in_corpus: string }>;
  softDiffs: Array<{ in_quote: string; in_corpus: string }>;
}

/** Global alignment of `q` against the window `w` of `t`, classified into soft and hard edits. */
export function alignWindow(q: readonly Tok[], t: readonly Tok[], w: Window): Alignment {
  const win = t.slice(w.start, w.end);
  const n = q.length;
  const m = win.length;
  const width = m + 1;
  const D = new Int32Array((n + 1) * width);
  for (let i = 0; i <= n; i++) D[i * width] = i;
  for (let j = 0; j <= m; j++) D[j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = (D[(i - 1) * width + j - 1] as number) + ((q[i - 1] as Tok).norm === (win[j - 1] as Tok).norm ? 0 : 1);
      D[i * width + j] = Math.min(sub, (D[(i - 1) * width + j] as number) + 1, (D[i * width + j - 1] as number) + 1);
    }
  }
  const out: Alignment = { soft: 0, hard: 0, softLostInHard: 0, hardMismatches: [], softDiffs: [] };
  const record = (a: Tok | undefined, b: Tok | undefined): void => {
    const entry = { in_quote: a?.shown ?? "", in_corpus: b?.shown ?? "" };
    if (a?.hard || b?.hard) {
      out.hard++;
      if (a && !a.hard) out.softLostInHard++;
      out.hardMismatches.push(entry);
    } else {
      out.soft++;
      out.softDiffs.push(entry);
    }
  };
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const here = D[i * width + j] as number;
    if (i > 0 && j > 0) {
      const a = q[i - 1] as Tok;
      const b = win[j - 1] as Tok;
      const cost = a.norm === b.norm ? 0 : 1;
      if (here === (D[(i - 1) * width + j - 1] as number) + cost) {
        if (cost === 1) record(a, b);
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && here === (D[(i - 1) * width + j] as number) + 1) {
      record(q[i - 1], undefined);
      i--;
    } else {
      record(undefined, win[j - 1]);
      j--;
    }
  }
  out.hardMismatches.reverse();
  out.softDiffs.reverse();
  return out;
}

/** Sequential matching of all segments of a quote against one token sequence (a node or a stream of nodes). */
export interface SegmentMatch {
  windows: Window[];
  soft: number;
  hard: number;
  softLostInHard: number;
  hardMismatches: Array<{ in_quote: string; in_corpus: string }>;
  softDiffs: Array<{ in_quote: string; in_corpus: string }>;
}

export function matchSegments(segments: ReadonlyArray<{ tokens: Tok[] }>, t: readonly Tok[], total: number): SegmentMatch | null {
  const res: SegmentMatch = { windows: [], soft: 0, hard: 0, softLostInHard: 0, hardMismatches: [], softDiffs: [] };
  let pos = 0;
  for (const seg of segments) {
    const q = seg.tokens;
    if (pos >= t.length) return null;
    const w = bestWindow(q, t, pos);
    if (w.end <= w.start) return null;
    const a = alignWindow(q, t, w);
    if (a.soft > allowedSoftEdits(q.length)) return null;
    res.windows.push(w);
    res.soft += a.soft;
    res.hard += a.hard;
    res.softLostInHard += a.softLostInHard;
    res.hardMismatches.push(...a.hardMismatches);
    res.softDiffs.push(...a.softDiffs);
    pos = w.end;
  }
  // A hard mismatch is only reported when most of the quote still matches (no all-numbers or unrelated-text accidents).
  const matched = total - res.soft - res.hard;
  const softMatched = total - hardCount(segments) - res.soft - res.softLostInHard;
  if (res.hard > 0 && (matched * 2 < total || softMatched < 3)) return null;
  return res;
}

function hardCount(segments: ReadonlyArray<{ tokens: Tok[] }>): number {
  return segments.reduce((n, s) => n + s.tokens.filter((t) => t.hard).length, 0);
}

/** Boundary punctuation removed, whitespace collapsed: used to decide `exact` (case and inner punctuation must agree). */
export const comparable = (s: string): string => s.replace(/\s+/g, " ").replace(BOUNDARY, "");

/** Crude language detection (EN vs DE) by function words; null if undecided. */
const EN_WORDS = new Set("the of and to shall be that is are with for which by as this or it not any from such their its has have where whether those other under must may will on at if been when than there these into".split(" "));
const DE_WORDS = new Set("der die das und den dem des ein eine einer einem eines nicht ist sind werden wird von mit für auf im zu zur zum dass oder auch nach bei als sich wenn kann können müssen gemäß sowie diese dieser diesem dieses durch aus über unter wurden hat haben soll sollen sind sein ihre ihrer ihren dies".split(" "));
export function detectLang(text: string): "en" | "de" | null {
  let en = 0;
  let de = 0;
  for (const t of tokenize(text)) {
    if (EN_WORDS.has(t.norm)) en++;
    if (DE_WORDS.has(t.norm)) de++;
  }
  if (en === 0 && de === 0) return null;
  if (en >= 2 * de && en >= 1) return "en";
  if (de >= 2 * en && de >= 1) return "de";
  return null;
}
