/** Deterministic scoring of a model answer against the expected values of a case. */
import { parseRef } from "../tools/refParser.js";
import type { ModelAnswer } from "./answer.js";
import type { EvalCase } from "./cases.js";

/** Changing scoring behaviour requires a new SCORER_VERSION (stored in results.json and report.md). */
export const SCORER_VERSION = "eval-scorer-v2";

export type VersionId = "32024R1689" | "02024R1689-20260727";

/** Consolidated/Omnibus hints win over Official Journal hints; no hint at all: null. */
export function normalizeVersion(s: string): VersionId | null {
  const t = s.toLowerCase();
  if (["2026/1744", "20260727", "consolidated", "konsolidiert", "omnibus"].some((k) => t.includes(k))) return "02024R1689-20260727";
  if (["32024r1689", "2024/1689", "official journal", "amtsblatt"].some((k) => t.includes(k))) return "32024R1689";
  return null;
}

export type VersionNamed = VersionId | "both" | null;

const IDS_2026 = ["20260727", "2026/1744", "32026r1744"];
const IDS_2024 = ["32024r1689", "2024/1689", "official journal", "amtsblatt"];

/**
 * Descriptive only (not part of `correct`): which version a model names, by explicit identifiers. Keywords such as
 * "consolidated" or "omnibus" never count. A 2026 identifier together with "amended"/"geändert" or the full id
 * 02024R1689-20260727 means 2026; 2024 identifiers alone mean 2024; 2024 and 2026 identifiers without that wording
 * mean both; a 2026 identifier alone means 2026; no identifier: null.
 */
export function versionNamed(s: string): VersionNamed {
  const t = s.toLowerCase();
  const has2026 = IDS_2026.some((k) => t.includes(k));
  const has2024 = IDS_2024.some((k) => t.includes(k));
  if (has2026 && (t.includes("02024r1689-20260727") || t.includes("amended") || t.includes("geändert"))) return "02024R1689-20260727";
  if (has2026 && has2024) return "both";
  if (has2026) return "02024R1689-20260727";
  if (has2024) return "32024R1689";
  return null;
}

const MONTHS: Record<string, number> = {
  january: 1, januar: 1, jan: 1, february: 2, februar: 2, feb: 2, march: 3, märz: 3, maerz: 3, mar: 3, april: 4, apr: 4, may: 5, mai: 5,
  june: 6, juni: 6, jun: 6, july: 7, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oktober: 10, oct: 10, okt: 10,
  november: 11, nov: 11, december: 12, dezember: 12, dec: 12, dez: 12,
};

const pad = (n: number, w = 2): string => String(n).padStart(w, "0");
const valid = (y: number, m: number, d: number): string | null => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${pad(y, 4)}-${pad(m)}-${pad(d)}` : null;
};

/** Normalizes common date spellings (ISO, 2.12.2027, 2 December 2027, December 2, 2027) to YYYY-MM-DD; null if not understood. */
export function normalizeDate(s: string): string | null {
  const t = s.trim().toLowerCase().replace(/(\d)(?:st|nd|rd|th)\b/g, "$1");
  let m: RegExpExecArray | null;
  if ((m = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t))) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  if ((m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(t))) return valid(Number(m[3]), Number(m[2]), Number(m[1]));
  if ((m = /(\d{1,2})\.?\s+([a-zäöü]+)\.?,?\s+(\d{4})/.exec(t))) {
    const mon = MONTHS[m[2] as string];
    return mon ? valid(Number(m[3]), mon, Number(m[1])) : null;
  }
  if ((m = /([a-zäöü]+)\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t))) {
    const mon = MONTHS[m[1] as string];
    return mon ? valid(Number(m[3]), mon, Number(m[2])) : null;
  }
  return null;
}

/**
 * Node id of a cited provision. parseRef is strict (nothing is guessed), so ordinal citations such as "Article 113, third
 * subparagraph, point (c)(i)" are not understood by it; then the article or annex itself ("Article 113") is used, which is
 * enough when the accepted id is the article. A deeper accepted id is then not matched (conservative).
 */
export function citedId(s: string): string | null {
  const full = parseRef(s);
  if (full !== null) return full;
  const head = /^\s*(?:art(?:icle|ikel)?\.?|annex|anhang)\s+([0-9]+[a-z]?|[ivxlc]+)(?![a-z0-9])/i.exec(s);
  return head ? parseRef(head[0]) : null;
}

/** First word of `s` (letters only, case-insensitive), with ja/nein read as yes/no; null if there is none. */
function leadingWord(s: string): string | null {
  const m = /^[^\p{L}]*(\p{L}+)/u.exec(s);
  const w = m?.[1]?.toLowerCase() ?? null;
  return w === "ja" ? "yes" : w === "nein" ? "no" : w;
}

/** yes/no claims (ja/nein too) are compared with the first word of the answer; any other claim must be contained in the answer (case-insensitive). */
export function claimHolds(claim: string, answer: string | null | undefined): boolean {
  if (typeof answer !== "string") return false;
  const expected = leadingWord(claim);
  const bare = /^[^\p{L}]*\p{L}+[^\p{L}]*$/u.test(claim); // a single word, so "No later than 2027" is a substring claim
  if (bare && (expected === "yes" || expected === "no")) return leadingWord(answer) === expected;
  return answer.toLowerCase().includes(claim.trim().toLowerCase());
}

export interface Score {
  correct: boolean | null;
  checks: Record<string, boolean>;
}

/** `a === null` (unparseable): correct null, no checks. generation: date/version/article as far as expected; evaluation: verdict. */
export function scoreCase(c: EvalCase, a: ModelAnswer | null): Score {
  if (a === null) return { correct: null, checks: {} };
  const checks: Record<string, boolean> = {};
  if (c.kind === "evaluation") {
    checks["verdict"] = typeof a.verdict === "string" && c.expected.verdict !== undefined && a.verdict.trim().toLowerCase() === c.expected.verdict.trim().toLowerCase();
  } else {
    if (c.expected.date !== undefined) {
      const got = typeof a.date === "string" ? normalizeDate(a.date) : null;
      checks["date"] = got !== null && got === (normalizeDate(c.expected.date) ?? c.expected.date);
    }
    if (c.expected.version !== undefined) {
      const got = typeof a.version === "string" ? normalizeVersion(a.version) : null;
      checks["version"] = got !== null && got === (normalizeVersion(c.expected.version) ?? c.expected.version);
    }
    if (c.expected.articles !== undefined) {
      const id = typeof a.article === "string" ? citedId(a.article) : null;
      checks["article"] = id !== null && c.expected.articles.some((x) => {
        const acc = parseRef(x) ?? x;
        return id === acc || id.startsWith(`${acc}.`);
      });
    }
  }
  if (c.expected.claim !== undefined) checks["claim"] = claimHolds(c.expected.claim, a.answer);
  return { correct: Object.values(checks).every(Boolean), checks };
}
