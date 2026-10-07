/**
 * Human citation (EN/DE) -> logical node id (ID scheme v1, docs/reference.md "ID scheme").
 *
 *   Article 50(1)(a)                      art_50.par_1.a
 *   Art. 50 Abs. 1 Buchst. a              art_50.par_1.a
 *   Artikel 3 Nummer 1                    art_3.pt_1
 *   Annex III, point 1(a)                 anx_3.pt_1.a
 *   Anhang I Abschnitt A Nummer 2         anx_1.sec_a.pt_2
 *   Recital 12 / Erwägungsgrund 12        rec_12
 *   Chapter III, Section 2                cpt_3.sct_2
 *
 * Ids pass through unchanged. Anything not understood completely yields null (nothing is guessed). The parser is purely
 * syntactic: `Article 3(1)` is read as paragraph 1 (`art_3.par_1`); callers that know the corpus may fall back to the
 * numbered-point reading (`art_3.pt_1`).
 */
import { romanToInt } from "../parser/ids.js";

const ID_RE = /^(?:art|anx|rec|cpt)_[0-9]+[a-z]*(?:\.[a-z0-9_]+)*$/;

/** Trailing "of Regulation (EU) 2024/1689", "of the AI Act", "der Verordnung (EU) 2024/1689", "KI-VO" is ignored. */
const TRAILING_ACT = /[\s,]+(?:of|in|under|der|des|von|nach|gemäß)\s+(?:the\s+|this\s+|dieser\s+|der\s+)?(?:regulation\b.*|ai\s+act\b.*|verordnung\b.*|ki-vo\b.*|ki-verordnung\b.*)$/i;

type Kind = "article" | "annex" | "chapter";

function roman(s: string): number | null {
  if (/^\d+$/.test(s)) return Number(s);
  const n = romanToInt(s.toUpperCase());
  return Number.isNaN(n) ? null : n;
}

const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };

const KW = {
  /** "third paragraph" / "second subparagraph" (the n-th unnumbered paragraph, as `Article 113, third paragraph`): `sub_n`. */
  ordinal: /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:sub)?paragraph(?![a-z0-9])/i,
  par: /^(?:paragraphs?|para\.?|absatz|abs\.?)\s*\(?(\d+[a-z]?)\)?(?![a-z0-9])/i,
  sub: /^(?:subparagraph|subpara\.?|unterabsatz|unterabs\.?)\s*\(?(\d+)\)?(?![a-z0-9])/i,
  ptNum: /^(?:points?|items?|nummer|nr\.?|no\.?)\s*\(?(\d+(?:\.\d+)*[a-z]?)\)?(?![a-z0-9])/i,
  /** German nested letter level ("Buchstabe c Ziffer i"), only in extended mode. */
  ziffer: /^ziffer\s*\(?([a-z]{1,3})\)?(?![a-z0-9])/i,
  ptLetter: /^(?:points?|buchstabe|buchst\.?|lit\.?|letter)\s*\(?([a-z]{1,3})\)?(?![a-z0-9])/i,
  section: /^(?:section|abschnitt)\s+([a-z]|\d+)(?![a-z0-9])/i,
  paren: /^\(\s*([0-9a-z]+)\s*\)/i,
  skip: /^(?:[\s,;:.]+|(?:of|the|in|im|der|des|von)\b)/i,
};

function tail(kind: Kind, input: string, segs: string[], extended: boolean): string[] | null {
  let rest = input;
  let guard = 0;
  while (rest.trim() !== "") {
    if (++guard > 40) return null;
    const skip = KW.skip.exec(rest);
    if (skip) {
      rest = rest.slice(skip[0].length);
      continue;
    }
    let m: RegExpExecArray | null;
    if (extended && (m = KW.ordinal.exec(rest))) {
      segs.push(`sub_${ORDINAL[(m[1] as string).toLowerCase()] as number}`);
    } else if ((m = KW.par.exec(rest))) {
      segs.push(`par_${(m[1] as string).toLowerCase()}`);
    } else if ((m = KW.sub.exec(rest))) {
      segs.push(`sub_${m[1] as string}`);
    } else if (kind === "annex" && (m = KW.section.exec(rest))) {
      segs.push(`sec_${(m[1] as string).toLowerCase()}`);
    } else if ((m = KW.ptNum.exec(rest))) {
      for (const part of (m[1] as string).toLowerCase().split(".")) segs.push(`pt_${part}`);
    } else if (extended && (m = KW.ziffer.exec(rest))) {
      segs.push((m[1] as string).toLowerCase());
    } else if ((m = KW.ptLetter.exec(rest))) {
      segs.push((m[1] as string).toLowerCase());
    } else if ((m = KW.paren.exec(rest))) {
      const v = (m[1] as string).toLowerCase();
      if (/^\d/.test(v)) {
        // "(1)" directly after the article number is a paragraph; in an annex it is a numbered point
        if (segs.length > 0 && !/^(?:sec_[a-z0-9]+)$/.test(segs[segs.length - 1] as string)) return null;
        segs.push(`${kind === "article" ? "par" : "pt"}_${v}`);
      } else {
        segs.push(v);
      }
    } else return null;
    rest = rest.slice(m[0].length);
  }
  return segs;
}

export interface ParseRefOptions {
  /** Also read "third paragraph" / "second subparagraph" (as `sub_n`) and German "Ziffer i" (default true). The eval scorer turns it off to keep the pre-registered scoring of run A. */
  extended?: boolean;
}

export function parseRef(ref: string, options: ParseRefOptions = {}): string | null {
  const extended = options.extended ?? true;
  const raw = ref.normalize("NFC").trim();
  if (ID_RE.test(raw)) return raw;
  const text = raw.replace(TRAILING_ACT, "").replace(/\s+/g, " ").trim();
  let m: RegExpExecArray | null;

  if ((m = /^(?:recital|rec\.?|erwägungsgrund|erwgr\.?|erwg\.?)\s*\(?(\d+)\)?$/i.exec(text))) return `rec_${Number(m[1])}`;

  if ((m = /^(?:chapter|kapitel)\s+([ivxlc]+|\d+)(?![a-z])(?:[\s,]+(?:section|abschnitt)\s+(\d+))?$/i.exec(text))) {
    const c = roman(m[1] as string);
    if (c === null) return null;
    return m[2] ? `cpt_${c}.sct_${Number(m[2])}` : `cpt_${c}`;
  }

  if ((m = /^(?:article|art\.?|artikel)\s*(\d+[a-z]?)(?![a-z0-9])/i.exec(text))) {
    const segs = tail("article", text.slice(m[0].length), [], extended);
    return segs ? [`art_${(m[1] as string).toLowerCase()}`, ...segs].join(".") : null;
  }

  if ((m = /^(?:annex|anhang)\s+([ivxlc]+|\d+)(?![a-z0-9])/i.exec(text))) {
    const n = roman(m[1] as string);
    if (n === null) return null;
    const segs = tail("annex", text.slice(m[0].length), [], extended);
    return segs ? [`anx_${n}`, ...segs].join(".") : null;
  }
  return null;
}
