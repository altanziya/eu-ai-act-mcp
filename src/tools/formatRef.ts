/**
 * Logical node id -> human citation (EN/DE), the inverse of `parseRef` (isomorphic, no node: imports).
 *
 *   art_9.par_2            Article 9(2)                    Artikel 9 Absatz 2
 *   art_5.par_1.a          Article 5(1), point (a)         Artikel 5 Absatz 1 Buchstabe a
 *   art_113.sub_3.c.i      Article 113, third paragraph, point (c)(i)
 *   anx_3.pt_1.a           Annex III, point 1(a)           Anhang III Nummer 1 Buchstabe a
 *   anx_1.sec_a.pt_2       Annex I, Section A, point 2     Anhang I Abschnitt A Nummer 2
 *   rec_12                 Recital 12                      Erwägungsgrund 12
 *   cpt_3.sct_2            Chapter III, Section 2          Kapitel III Abschnitt 2
 *
 * Ids of a shape not known here are returned unchanged. Every output of an article or annex id is read back to the
 * same id by `parseRef` (tests/unit/format-ref.test.ts checks this for every node of both corpora).
 */
import type { Lang } from "../constants.js";

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

const ROMAN: Array<[number, string]> = [[100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function intToRoman(n: number): string {
  let rest = n;
  let out = "";
  for (const [v, s] of ROMAN) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

type Prev = "root" | "par" | "sub" | "sec" | "pt" | "letter";

export function formatRef(id: string, lang: Lang = "en"): string {
  const segs = id.split(".");
  const head = /^(art|anx|rec|cpt)_(\d+)([a-z]*)$/.exec(segs[0] as string);
  if (!head) return id;
  const kind = head[1] as string;
  const num = head[2] as string;
  const suffix = head[3] as string;
  const en = lang === "en";
  if (kind === "rec") return segs.length === 1 ? `${en ? "Recital" : "Erwägungsgrund"} ${Number(num)}` : id;
  if (kind === "cpt") {
    let out = `${en ? "Chapter" : "Kapitel"} ${intToRoman(Number(num))}`;
    for (const s of segs.slice(1)) {
      const m = /^sct_(\d+)$/.exec(s);
      if (!m) return id;
      out += `${en ? "," : ""} ${en ? "Section" : "Abschnitt"} ${Number(m[1])}`;
    }
    return out;
  }
  const isArticle = kind === "art";
  let out = isArticle ? `${en ? "Article" : "Artikel"} ${num}${suffix}` : `${en ? "Annex" : "Anhang"} ${intToRoman(Number(num))}`;
  let prev: Prev = "root";
  let letters = 0; // consecutive letter segments (German alternates Buchstabe / Ziffer)
  for (let i = 1; i < segs.length; i++) {
    const s = segs[i] as string;
    let m: RegExpExecArray | null;
    if ((m = /^par_(\d+[a-z]?)$/.exec(s)) && isArticle) {
      out += en ? (prev === "root" ? `(${m[1]})` : `, paragraph ${m[1]}`) : ` Absatz ${m[1]}`;
      prev = "par";
    } else if ((m = /^sub_(\d+)$/.exec(s))) {
      const n = Number(m[1]);
      const noun = en && prev === "root" && isArticle ? "paragraph" : "subparagraph";
      out += en ? `, ${ORDINALS[n - 1] !== undefined ? `${ORDINALS[n - 1]} ${noun}` : `subparagraph ${n}`}` : ` Unterabsatz ${n}`;
      prev = "sub";
    } else if ((m = /^sec_([a-z0-9]+)$/.exec(s)) && !isArticle) {
      out += `${en ? "," : ""} ${en ? "Section" : "Abschnitt"} ${(m[1] as string).toUpperCase()}`;
      prev = "sec";
    } else if (/^pt_[0-9a-z]+$/.test(s)) {
      const nums = [(s as string).slice(3)];
      while (/^pt_[0-9a-z]+$/.test(segs[i + 1] ?? "")) nums.push((segs[++i] as string).slice(3));
      const joined = nums.join(".");
      out += en ? (isArticle ? `, point (${joined})` : `, point ${joined}`) : ` Nummer ${joined}`;
      prev = "pt";
    } else if (/^[a-z]+$/.test(s)) {
      if (en) out += prev === "letter" || prev === "pt" ? `(${s})` : `, point (${s})`;
      else out += ` ${letters % 2 === 0 ? "Buchstabe" : "Ziffer"} ${s}`;
      letters = prev === "letter" ? letters + 1 : 1;
      prev = "letter";
      continue;
    } else return id;
    letters = 0;
  }
  return out;
}
