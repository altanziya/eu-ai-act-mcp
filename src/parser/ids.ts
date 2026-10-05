/**
 * Logical-ID helpers (ID scheme v1). IDs are logical paths: rec_12, art_50.par_1.a, art_4a, anx_3.pt_1.a, cpt_3.sct_2,
 * art_43.par_1.sub_2.a (subparagraph), anx_1.sec_a.pt_1 (annex section), anx_7.pt_3.pt_1 (nested number "3.1.").
 */

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

/** Roman numeral (upper case, additive/subtractive) to number; NaN for anything else. */
export function romanToInt(roman: string): number {
  if (!/^[IVXLC]+$/.test(roman)) return Number.NaN;
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const v = ROMAN_VALUES[roman[i] as string] as number;
    const next = ROMAN_VALUES[roman[i + 1] ?? ""] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

/**
 * Reduce a list label to its core: "(a)" -> "a", "1." -> "1", "(ba)" -> "ba", "1a." -> "1a".
 * Bullets and dashes ("—", "-", "•") have no core (returns "").
 */
export function labelCore(label: string): string {
  const core = label.normalize("NFC").trim().replace(/^\(/, "").replace(/[.)]+$/, "").trim();
  return /^[0-9A-Za-z]+(\.[0-9A-Za-z]+)*$/.test(core) ? core : "";
}

/** Article number from a source id: "art_4a" -> "4a". Returns null if the id is not an article id. */
export function articleSuffix(sourceId: string): string | null {
  const m = /^art_(\d+[a-z]*)$/.exec(sourceId);
  return m ? (m[1] as string) : null;
}

export const recitalId = (n: number | string): string => `rec_${n}`;
export const articleId = (num: string): string => `art_${num}`;
export const annexId = (n: number): string => `anx_${n}`;
export const chapterId = (n: number): string => `cpt_${n}`;
export const sectionId = (chapter: string, n: number | string): string => `${chapter}.sct_${n}`;

/**
 * Segment for a numbered/lettered child.
 *  - numeric label directly under an article: paragraph -> "par_<n>" (isParagraph) or "pt_<n>"
 *  - numeric label elsewhere (definitions, annex points): "pt_<n>"
 *  - nested number ("3.1"): only the last component, "pt_1"; the parent node is the point "3"
 *  - letters and roman numerals: the bare label ("a", "ba", "ii")
 *  - label-less bullets: "pt_<n>" with n = running index chosen by the caller
 */
export function childSegment(core: string, isParagraph: boolean, bulletIndex: number): string {
  if (core === "") return `pt_${bulletIndex}`;
  if (/^\d/.test(core)) return `${isParagraph ? "par" : "pt"}_${core.split(".").pop() as string}`;
  return core;
}

export const subparagraphSegment = (n: number): string => `sub_${n}`;
export const annexSectionSegment = (label: string): string => `sec_${label.toLowerCase()}`;

export function joinId(parent: string, segment: string): string {
  return `${parent}.${segment}`;
}
