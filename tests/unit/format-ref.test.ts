import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corpusPath, V2024, V2026 } from "../../src/config.js";
import { formatRef } from "../../src/tools/formatRef.js";
import { parseRef } from "../../src/tools/refParser.js";
import type { CorpusFile } from "../../src/parser/types.js";

describe("formatRef", () => {
  it.each([
    ["art_9.par_2", "Article 9(2)", "Artikel 9 Absatz 2"],
    ["art_9", "Article 9", "Artikel 9"],
    ["art_4a.par_1", "Article 4a(1)", "Artikel 4a Absatz 1"],
    ["art_5.par_1.a", "Article 5(1), point (a)", "Artikel 5 Absatz 1 Buchstabe a"],
    ["art_5.par_1.c.i", "Article 5(1), point (c)(i)", "Artikel 5 Absatz 1 Buchstabe c Ziffer i"],
    ["art_113.sub_3.c.i", "Article 113, third paragraph, point (c)(i)", "Artikel 113 Unterabsatz 3 Buchstabe c Ziffer i"],
    ["art_43.par_1.sub_2", "Article 43(1), second subparagraph", "Artikel 43 Absatz 1 Unterabsatz 2"],
    ["art_3.pt_1", "Article 3, point (1)", "Artikel 3 Nummer 1"],
    ["anx_3", "Annex III", "Anhang III"],
    ["anx_3.pt_1.a", "Annex III, point 1(a)", "Anhang III Nummer 1 Buchstabe a"],
    ["anx_1.sec_a.pt_2", "Annex I, Section A, point 2", "Anhang I Abschnitt A Nummer 2"],
    ["anx_7.pt_3.pt_1", "Annex VII, point 3.1", "Anhang VII Nummer 3.1"],
    ["rec_12", "Recital 12", "Erwägungsgrund 12"],
    ["cpt_3.sct_2", "Chapter III, Section 2", "Kapitel III Abschnitt 2"],
    ["cpt_12", "Chapter XII", "Kapitel XII"],
  ])("%s", (id, en, de) => {
    expect(formatRef(id, "en")).toBe(en);
    expect(formatRef(id, "de")).toBe(de);
  });
  it("leaves unknown shapes unchanged", () => {
    expect(formatRef("foo_1")).toBe("foo_1");
    expect(formatRef("art_5.xyz_1")).toBe("art_5.xyz_1");
  });
});

describe("parseRef(formatRef(id)) === id over both corpora", () => {
  for (const version of [V2024, V2026]) {
    for (const lang of ["en", "de"] as const) {
      it(`${version} ${lang}: every article, annex, recital and chapter node`, () => {
        const file = JSON.parse(readFileSync(corpusPath(version, lang), "utf8")) as CorpusFile;
        const failures: string[] = [];
        let n = 0;
        for (const node of file.nodes) {
          n++;
          for (const l of ["en", "de"] as const) {
            const f = formatRef(node.id, l);
            const back = parseRef(f);
            if (back !== node.id) failures.push(`${node.id} -> ${JSON.stringify(f)} -> ${String(back)}`);
          }
        }
        expect(n).toBeGreaterThan(1000);
        expect(failures.slice(0, 10)).toEqual([]);
      });
    }
  }
});

describe("parseRef ordinals (new)", () => {
  it.each([
    ["Article 113, third paragraph", "art_113.sub_3"],
    ["Article 113, third paragraph, point (c)(i)", "art_113.sub_3.c.i"],
    ["Article 43(1), second subparagraph", "art_43.par_1.sub_2"],
    ["Artikel 9 Absatz 1 Buchstabe c Ziffer i", "art_9.par_1.c.i"],
  ])("%s -> %s", (ref, id) => {
    expect(parseRef(ref)).toBe(id);
  });
});
