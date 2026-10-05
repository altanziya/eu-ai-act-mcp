import { describe, expect, it } from "vitest";
import { parseRef } from "../../src/tools/refParser.js";

describe("parseRef", () => {
  it.each([
    ["Article 50", "art_50"],
    ["Article 50(1)", "art_50.par_1"],
    ["Article 50(1)(a)", "art_50.par_1.a"],
    ["Article 50(1)(a)(ii)", "art_50.par_1.a.ii"],
    ["Article 5(1)(ba)", "art_5.par_1.ba"],
    ["Art. 50 Abs. 1 Buchst. a", "art_50.par_1.a"],
    ["Artikel 50 Absatz 1 Buchstabe a", "art_50.par_1.a"],
    ["Article 50, paragraph 1, point (a)", "art_50.par_1.a"],
    ["Article 3 point 1", "art_3.pt_1"],
    ["Artikel 3 Nummer 1", "art_3.pt_1"],
    ["Art. 43 Abs. 1 Unterabs. 2", "art_43.par_1.sub_2"],
    ["Article 4a(1)", "art_4a.par_1"],
    ["Article 75a", "art_75a"],
    ["Annex III, point 1(a)", "anx_3.pt_1.a"],
    ["Anhang III Nummer 1 Buchstabe a", "anx_3.pt_1.a"],
    ["Annex I, Section A, point 2", "anx_1.sec_a.pt_2"],
    ["Anhang VII Nummer 3.1", "anx_7.pt_3.pt_1"],
    ["Recital 12", "rec_12"],
    ["Erwägungsgrund 12", "rec_12"],
    ["Chapter III, Section 2", "cpt_3.sct_2"],
    ["Kapitel XII", "cpt_12"],
    ["Article 50(1)(a) of Regulation (EU) 2024/1689", "art_50.par_1.a"],
    ["art_4a.par_2", "art_4a.par_2"],
    ["anx_3.pt_1.a", "anx_3.pt_1.a"],
    ["  Article   50 ( 1 ) ", "art_50.par_1"],
  ])("%s -> %s", (ref, id) => {
    expect(parseRef(ref)).toBe(id);
  });
  it.each(["", "Section 7 of the thing", "Article", "Article 5 and 6", "Article 6(1)(2)", "GDPR Article 6", "Annex", "Recital"])("%j -> null", (ref) => {
    expect(parseRef(ref)).toBeNull();
  });
});

describe("parseRef extended reading", () => {
  it("ordinal paragraphs and Ziffer are read by default and not with extended: false", () => {
    expect(parseRef("Article 113, third paragraph, point (c)(i)")).toBe("art_113.sub_3.c.i");
    expect(parseRef("Article 113, third paragraph, point (c)(i)", { extended: false })).toBeNull();
    expect(parseRef("Artikel 9 Absatz 1 Buchstabe c Ziffer i")).toBe("art_9.par_1.c.i");
    expect(parseRef("Artikel 9 Absatz 1 Buchstabe c Ziffer i", { extended: false })).toBeNull();
    expect(parseRef("Article 9(1)(c)(i)", { extended: false })).toBe("art_9.par_1.c.i");
  });
});
