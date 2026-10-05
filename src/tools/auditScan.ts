/**
 * Text scanning for aiact_audit_text (isomorphic, no node: imports): citations of articles and annexes, dates,
 * quotations and sentences, each with its span in the original text (UTF-16 offsets, end exclusive).
 * Purely syntactic and deterministic; judging them against the corpus is auditCore.ts.
 */
import { parseRef } from "./refParser.js";

export interface Span {
  start: number;
  end: number;
}
export interface RefMention {
  span: Span;
  /** Logical id as written (not yet checked against a corpus), e.g. `art_6.par_2`. */
  id: string;
  /** The words of the citation as written. */
  raw: string;
}
export interface DateMention {
  span: Span;
  iso: string;
}
export interface QuoteMention {
  /** Including the quotation marks. */
  span: Span;
  inner: string;
  words: number;
}

const L = "\\p{L}";
const LN = "\\p{L}\\p{N}";

// ---------------------------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, mai: 5, juni: 6, juli: 7, oktober: 10, dezember: 12, jän: 1, mär: 3, okt: 10, dez: 12,
};
const MONTH_RE = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DATE_PATTERNS: Array<{ re: RegExp; pick: (m: RegExpExecArray) => string | null }> = [
  { re: /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/gu, pick: (m) => iso(+(m[1] as string), +(m[2] as string), +(m[3] as string)) },
  {
    re: new RegExp(`(?<![\\d.])(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(?:of\\s+)?(${MONTH_RE})\\.?,?\\s+(\\d{4})(?!\\d)`, "giu"),
    pick: (m) => iso(+(m[3] as string), MONTHS[(m[2] as string).toLowerCase()] as number, +(m[1] as string)),
  },
  {
    re: new RegExp(`(?<![${L}])(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(?!\\d)`, "giu"),
    pick: (m) => iso(+(m[3] as string), MONTHS[(m[1] as string).toLowerCase()] as number, +(m[2] as string)),
  },
  { re: /(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)/gu, pick: (m) => iso(+(m[3] as string), +(m[2] as string), +(m[1] as string)) },
];

/** ISO, "2 August 2026", "2nd August 2026", "2. August 2026", "August 2, 2026", "2.8.2026" (EN and DE month names). */
export function findDates(text: string): DateMention[] {
  const found: DateMention[] = [];
  for (const { re, pick } of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const d = pick(m);
      if (d === null) continue;
      found.push({ span: { start: m.index, end: m.index + m[0].length }, iso: d });
    }
  }
  found.sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end);
  const out: DateMention[] = [];
  for (const d of found) {
    const last = out[out.length - 1];
    if (last && d.span.start < last.span.end) continue; // overlap: keep the earlier / longer one
    out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------------------------------------------

const QUOTE_RE = /"([^"]{1,1500}?)"|“([^“”]{1,1500}?)”|„([^„“”]{1,1500}?)[“”]|«\s*([^«»]{1,1500}?)\s*»/gu;

export function findQuotes(text: string): QuoteMention[] {
  const out: QuoteMention[] = [];
  for (const m of text.matchAll(QUOTE_RE)) {
    const inner = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    const words = inner.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    out.push({ span: { start: m.index, end: m.index + m[0].length }, inner, words });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------------------------------------------

const ABBREVIATIONS = new Set(
  "art abs nr no buchst lit bzw ca vgl inkl ggf etc usw sec para paras p pp cf ff f ua zb dh iv incl approx resp ie eg vs mr dr prof sog evtl bspw ggü".split(" "),
);
export const MONTH_START = new RegExp(`^(?:${MONTH_RE})(?![${L}])`, "iu");

/** Sentence spans (trimmed). A break needs `. ! ?` plus whitespace, a following upper-case letter, digit or quote, and no abbreviation or "2. August" before; `skip` ranges (quotations) are never split. */
export function splitSentences(text: string, skip: readonly Span[] = []): Span[] {
  const cuts: number[] = [];
  const inSkip = (i: number): boolean => skip.some((s) => i > s.start && i < s.end - 1);
  const re = /[.!?…]+["'”’»“)\]]*(?=\s|$)|\n[ \t]*\n+/gu;
  for (const m of text.matchAll(re)) {
    const end = m.index + m[0].length;
    if (inSkip(end - 1)) continue;
    if (m[0].startsWith("\n")) {
      cuts.push(end);
      continue;
    }
    if (end >= text.length) break;
    const rest = text.slice(end);
    const next = /^\s*(.)/su.exec(rest)?.[1] ?? "";
    const before = text.slice(0, m.index);
    const word = /([\p{L}\p{N}.]+)$/u.exec(before)?.[1] ?? "";
    if (m[0] === "." && ABBREVIATIONS.has(word.toLowerCase().replace(/\./g, ""))) continue;
    if (m[0] === "." && /\d$/.test(word) && MONTH_START.test(rest.trimStart())) continue; // German "2. August 2026"
    if (m[0] === "." && !/[\p{Lu}\p{N}"„“«'(\[]/u.test(next)) continue;
    cuts.push(end);
  }
  const out: Span[] = [];
  let from = 0;
  const push = (to: number): void => {
    let s = from;
    let e = to;
    while (s < e && /\s/.test(text[s] as string)) s++;
    while (e > s && /\s/.test(text[e - 1] as string)) e--;
    if (e > s) out.push({ start: s, end: e });
  };
  for (const c of cuts) {
    push(c);
    from = c;
  }
  push(text.length);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Citations of articles and annexes
// ---------------------------------------------------------------------------------------------------------------

const ANCHOR = new RegExp(`(?<![${L}])(Articles?|Art\\.?|Artikel[n]?|Annex(?:es)?|Anhang|Anh[äa]nge[n]?)(?=\\s*\\d|\\s+[IVXLC]+(?![${LN}]))`, "giu");
const ORD = "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)";
const END = `(?![${LN}])`;
const TAIL_PAREN = new RegExp(`\\s?\\(\\s*(\\d+[a-z]?|[a-z]{1,3})\\s*\\)`, "uy");
const TAIL_KW = new RegExp(
  "[,;]?\\s*(?:" +
    `${ORD}\\s+(?:sub)?paragraph${END}` +
    `|(?:sub)?paragraphs?\\s*\\(?\\d+[a-z]?\\)?${END}` +
    `|points?\\s*(?:\\(\\s*[a-z]{1,3}\\s*\\)|\\(?\\d+(?:\\.\\d+)*[a-z]?\\)?${END})` +
    `|letter\\s*\\(\\s*[a-z]{1,3}\\s*\\)` +
    `|(?:Absatz|Abs\\.)\\s*\\(?\\d+[a-z]?\\)?${END}` +
    `|(?:Unterabsatz|Unterabs\\.)\\s*\\(?\\d+\\)?${END}` +
    `|(?:Buchstabe|Buchst\\.|lit\\.|Ziffer)\\s*\\(?[a-z]{1,3}\\)?${END}` +
    `|(?:Nummer|Nr\\.)\\s*\\(?\\d+(?:\\.\\d+)*[a-z]?\\)?${END}` +
    `)`,
  "iuy",
);
const TAIL_SECTION = new RegExp(`[,;]?\\s*(?:Section|Abschnitt)\\s+(?:[A-Z]|\\d+)${END}`, "uy");

const STOP_BEFORE = /(?:GDPR|DSGVO|DS-GVO|TFEU|AEUV|TEU|EUV|DORA|NIS-? ?2|DSA|DMA)[\s,:–-]*$/;
const OTHER_PREP = /^(?:\s*,)?\s*(?:(?:of|in|under|pursuant to|according to|as per|des|der|von|nach|gemäß|aus|im|laut)\s+)?(?:(?:the|this|dieser|der|die|das|dem)\s+)?/iu;
/** The AI Act itself. */
const OWN_ACT = /^(?:(?:EU\s+)?AI\s+Act|Artificial\s+Intelligence\s+Act|KI-VO|KI-Verordnung|KI-Gesetz|(?:Regulation|Verordnung)\s*\((?:EU)\)\s*(?:No\.?\s*)?2024\/1689|(?:Regulation|Verordnung)\b(?!\s*\(|\s+(?:No\.?|Nr\.?)?\s*\d))/u;
const OTHER_ACT = new RegExp(
  "^(?:" +
    "(?:Regulation|Directive|Decision|Verordnung|Richtlinie|Beschluss)\\b(?:\\s*\\((?:EU|EC|EEC|EG|EWG|Euratom)\\))?\\s*(?:No\\.?|Nr\\.?)?\\s*\\d{1,4}\\/\\d{1,4}" +
    "|(?:Directive|Richtlinie)\\b" +
    `|(?:\\p{Lu}[\\p{L}0-9-]*\\s+){1,6}(?:Act|Regulation|Directive|Code|Law|Treaty|Charter|Convention)\\b` +
    `|\\p{Lu}[\\p{L}-]*(?:verordnung|richtlinie|gesetz|vertrag|charta|kodex|rechtsakt)\\b` +
    `|(?:Gesetz|Verordnung|Rechtsakt)\\s+(?:über|zur|zum)\\s+\\p{Lu}` +
    "|(?:GDPR|DSGVO|DS-GVO|UK GDPR|TFEU|TEU|AEUV|EUV|NIS-? ?2|DORA|DSA|DMA|CRA|MDR|IVDR|Treaty|Vertrag|Charter|Charta|Data Act|Datengesetz)(?![\\p{L}\\p{N}])" +
    ")",
  "u",
);

/** True if the text right after a citation says that it belongs to another act (GDPR, Data Act, other Regulations, Directives, treaties, named acts). */
export function citesOtherAct(after: string): boolean {
  const prep = OTHER_PREP.exec(after);
  const rest = after.slice(prep ? prep[0].length : 0);
  if (OWN_ACT.test(rest)) return false;
  return OTHER_ACT.test(rest);
}

const ANNEX_ROMAN = /^[IVXLC]+$/;

function readNumber(text: string, at: number, annex: boolean): { value: string; start: number; end: number } | null {
  const re = annex ? new RegExp(`\\s*([IVXLC]+|\\d{1,2})${END}`, "uy") : new RegExp(`\\s*(\\d{1,4}[a-z]?)${END}`, "uy");
  re.lastIndex = at;
  const m = re.exec(text);
  if (!m) return null;
  const value = m[1] as string;
  if (annex && /^[A-Za-z]+$/.test(value) && !ANNEX_ROMAN.test(value)) return null;
  const start = m.index + m[0].length - value.length;
  return { value, start, end: start + value.length };
}

/** Longest syntactically readable tail (paragraph, point, letter, ...) after position `at`, as end offsets per token. */
function readTail(text: string, at: number, annex: boolean): number[] {
  const ends: number[] = [];
  let pos = at;
  for (let guard = 0; guard < 8; guard++) {
    let end = -1;
    TAIL_PAREN.lastIndex = pos;
    const p = TAIL_PAREN.exec(text);
    if (p && (p[1] as string) === (p[1] as string).toLowerCase()) end = TAIL_PAREN.lastIndex;
    if (end === -1) {
      TAIL_KW.lastIndex = pos;
      if (TAIL_KW.exec(text)) end = TAIL_KW.lastIndex;
    }
    if (end === -1 && annex) {
      TAIL_SECTION.lastIndex = pos;
      if (TAIL_SECTION.exec(text)) end = TAIL_SECTION.lastIndex;
    }
    if (end === -1) break;
    ends.push(end);
    pos = end;
  }
  return ends;
}

const LIST_SEP = /^(?:\s*,\s*(?:and\s+|or\s+|und\s+|oder\s+)?|\s+(?:and|or|und|oder)\s+|(?:\s+(?:to|through|bis)\s+|\s*[–—-]\s*))/iu;
const ANNEX_SEP = /^(?:\s+(?:and|or|und|oder|to|bis)\s+|\s*[–—-]\s*)/iu;
const ANNEX_LIST_SEP = /^(?:\s*,\s*(?:and\s+|or\s+|und\s+|oder\s+)?|\s+(?:and|or|und|oder|to|bis)\s+|\s*[–—-]\s*)/iu;
const NOT_A_NUMBER_OF_PROVISIONS = /^\s*(?:days?|weeks?|months?|years?|hours?|Tage[n]?|Wochen?|Monate[n]?|Jahre[n]?|Stunden?|%|percent|Prozent|EUR|euros?|million|Millionen)(?![\p{L}])/iu;
const LAST_VALUE = /(\d+[a-z]?|[a-z]{1,3})(?=[\s)]*$)/;

interface Item {
  /** Where the item starts in the text (the anchor word for the first one). */
  start: number;
  /** Number and all tail tokens but the last, as written. */
  head: string;
  /** The last tail token as written (empty if there is none). */
  last: string;
  /** Text offsets of the end of the number and of each tail token. */
  numEnd: number;
  tailEnds: number[];
  /** The item was derived from the previous one ("(2)" in "6(1) and (2)", "2" in "Absatz 1 und 2"). */
  derived: boolean;
  end: number;
}

export interface RefScan {
  refs: RefMention[];
  /** Citations of other acts that were skipped. */
  foreign: Span[];
}

/**
 * Citations of the form Article N(...)(...), Art. / Artikel N Absatz ..., Annex III point ..., Anhang III Nummer ...
 * Lists ("Article 6 and 7", "Articles 6(1) and (2)", "Artikel 6 Absatz 1 und 2") yield every item; a range
 * ("Articles 102 to 110") yields its two ends. Citations of other acts ("Article 6 GDPR", "Article 9(1) of
 * Regulation (EU) 2016/679", "of the Data Act") are skipped and reported in `foreign`.
 */
export function findRefsDetailed(text: string): RefScan {
  const out: RefMention[] = [];
  const foreign: Span[] = [];
  let resume = 0;
  for (const a of text.matchAll(ANCHOR)) {
    if (a.index < resume) continue;
    const word = a[1] as string;
    const annex = /^(?:annex|anhang|anh)/i.test(word);
    const plural = /^(?:annexes|anh[äa]nge[n]?)$/i.test(word);
    const items: Item[] = [];
    let at = a.index + word.length;
    for (let guard = 0; guard < 40; guard++) {
      const num = readNumber(text, at, annex);
      if (!num) break;
      if (items.length > 0 && (MONTH_START.test(text.slice(num.end).trimStart()) || NOT_A_NUMBER_OF_PROVISIONS.test(text.slice(num.end)))) break;
      const tailEnds = readTail(text, num.end, annex);
      const toks = tailEnds.map((e, i) => text.slice(i === 0 ? num.end : (tailEnds[i - 1] as number), e));
      const end = tailEnds[tailEnds.length - 1] ?? num.end;
      items.push({ start: items.length === 0 ? a.index : num.start, head: num.value + toks.slice(0, -1).join(""), last: toks[toks.length - 1] ?? "", numEnd: num.end, tailEnds, derived: false, end });
      // next item
      for (;;) {
        const prev = items[items.length - 1] as Item;
        const sepRe = annex ? (plural ? ANNEX_LIST_SEP : ANNEX_SEP) : LIST_SEP;
        const sep = sepRe.exec(text.slice(prev.end));
        if (!sep) {
          at = -1;
          break;
        }
        const from = prev.end + sep[0].length;
        const rest = text.slice(from);
        // sibling pinpoint: "6(1) and (2)", "Absatz 1 und 2", "paragraphs 1 and 2"
        let derived: { value: string; len: number; whole?: string } | null = null;
        if (prev.last !== "" && LAST_VALUE.test(prev.last) && !/^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i.test(prev.last.replace(/^[,;\s]+/, ""))) {
          const paren = /^\(\s*(\d+[a-z]?|[a-z]{1,3})\s*\)/.exec(rest);
          const bare = /^(\d+[a-z]?)(?![\p{L}\p{N}])/u.exec(rest);
          const lastIsParen = /\)\s*$/.test(prev.last);
          if (paren && lastIsParen) derived = { value: paren[1] as string, len: paren[0].length };
          else if (bare && !lastIsParen && /\d$/.test(prev.last.trim())) derived = { value: bare[1] as string, len: bare[0].length };
          else if (!lastIsParen) {
            // the same keyword again: "Absatz 1 oder Absatz 2", "point 1 and point 2"
            TAIL_KW.lastIndex = from;
            const kw = TAIL_KW.exec(text);
            const word = (t: string): string => (/^[,;\s]*([\p{L}.]+)/u.exec(t)?.[1] ?? "").toLowerCase().replace(/s$/, "");
            if (kw && word(kw[0]) === word(prev.last)) derived = { value: "", len: kw[0].length, whole: ` ${kw[0].trim()}` };
          }
        }
        if (derived) {
          const last = derived.whole ?? prev.last.replace(LAST_VALUE, derived.value);
          items.push({ start: from, head: prev.head, last, numEnd: from, tailEnds: [], derived: true, end: from + derived.len });
          continue;
        }
        at = from;
        break;
      }
      if (at === -1) break;
    }
    if (items.length === 0) continue;
    const lastItem = items[items.length - 1] as Item;
    resume = lastItem.end;
    const span: Span = { start: a.index, end: lastItem.end };
    if (STOP_BEFORE.test(text.slice(Math.max(0, a.index - 24), a.index)) || citesOtherAct(text.slice(lastItem.end, lastItem.end + 120))) {
      foreign.push(span);
      continue;
    }
    for (const it of items) {
      const prefix = annex ? "Annex" : "Article";
      let parsed: { id: string; end: number } | null = null;
      if (it.derived) {
        const id = parseRef(`${prefix} ${it.head}${it.last}`);
        if (id !== null) parsed = { id, end: it.end };
      } else {
        for (let k = it.tailEnds.length; k >= 0 && !parsed; k--) {
          const end = k === 0 ? it.numEnd : (it.tailEnds[k - 1] as number);
          // the number starts at `start` for later items and after the anchor word for the first one
          const numStart = it === items[0] ? findNumberStart(text, a.index + word.length) : it.start;
          const id = parseRef(`${prefix} ${text.slice(numStart, end)}`);
          if (id !== null) parsed = { id, end };
        }
      }
      if (!parsed) continue;
      out.push({ span: { start: it.start, end: parsed.end }, id: parsed.id, raw: text.slice(it.start, parsed.end) });
    }
  }
  out.sort((x, y) => x.span.start - y.span.start);
  return { refs: out, foreign };
}

function findNumberStart(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i] as string)) i++;
  return i;
}

export function findRefs(text: string): RefMention[] {
  return findRefsDetailed(text).refs;
}
