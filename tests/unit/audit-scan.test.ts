import { describe, expect, it } from "vitest";
import { citesOtherAct, findDates, findQuotes, findRefs, findRefsDetailed, splitSentences } from "../../src/tools/auditScan.js";

const refs = (t: string): Array<[string, string]> => findRefs(t).map((r) => [r.id, t.slice(r.span.start, r.span.end)]);

describe("findRefs: English", () => {
  it.each([
    ["See Article 9(2) of the AI Act.", [["art_9.par_2", "Article 9(2)"]]],
    ["See Article 50.", [["art_50", "Article 50"]]],
    ["Article 5(1)(a) applies.", [["art_5.par_1.a", "Article 5(1)(a)"]]],
    ["Article 5(1), point (a) applies.", [["art_5.par_1.a", "Article 5(1), point (a)"]]],
    ["Article 113, third paragraph, point (c)(i) says", [["art_113.sub_3.c.i", "Article 113, third paragraph, point (c)(i)"]]],
    ["Article 4a(1) is new", [["art_4a.par_1", "Article 4a(1)"]]],
    ["Article 6 (2) and Article 7", [["art_6.par_2", "Article 6 (2)"], ["art_7", "Article 7"]]],
    ["Annex III, point 4(a)", [["anx_3.pt_4.a", "Annex III, point 4(a)"]]],
    ["Annex I, Section A, point 2", [["anx_1.sec_a.pt_2", "Annex I, Section A, point 2"]]],
    ["under annex iv", []],
    ["art. 6(2)", [["art_6.par_2", "art. 6(2)"]]],
  ] as Array<[string, Array<[string, string]>]>)("%s", (t, want) => {
    expect(refs(t)).toEqual(want);
  });
  it("ranges yield their two ends, and/comma lists every item, each with its own span", () => {
    const t = "Articles 102 to 110 apply, as do Articles 6, 7 and 8.";
    expect(refs(t)).toEqual([["art_102", "Articles 102"], ["art_110", "110"], ["art_6", "Articles 6"], ["art_7", "7"], ["art_8", "8"]]);
    const r = findRefs(t);
    expect(t.slice((r[1] as { span: { start: number } }).span.start)).toMatch(/^110 apply/);
  });
  it("singular lists: Article 6 and 7, Article 6, 7 and 8", () => {
    expect(refs("Article 6 and 7 apply.")).toEqual([["art_6", "Article 6"], ["art_7", "7"]]);
    expect(refs("Article 6, 7 and 8 apply.")).toEqual([["art_6", "Article 6"], ["art_7", "7"], ["art_8", "8"]]);
    expect(refs("Article 5 or 6 applies")).toEqual([["art_5", "Article 5"], ["art_6", "6"]]);
  });
  it("sibling pinpoints: Articles 6(1) and (2), Article 3(1) and (2), paragraphs 1 and 2", () => {
    expect(refs("Articles 6(1) and (2) apply.")).toEqual([["art_6.par_1", "Articles 6(1)"], ["art_6.par_2", "(2)"]]);
    expect(refs("Article 3(1) and (2) define")).toEqual([["art_3.par_1", "Article 3(1)"], ["art_3.par_2", "(2)"]]);
    expect(refs("Article 6(1), (2) and (3)")).toEqual([["art_6.par_1", "Article 6(1)"], ["art_6.par_2", "(2)"], ["art_6.par_3", "(3)"]]);
    expect(refs("Article 6, paragraphs 1 and 2")).toEqual([["art_6.par_1", "Article 6, paragraphs 1"], ["art_6.par_2", "2"]]);
    expect(refs("Article 6(1) and 7")).toEqual([["art_6.par_1", "Article 6(1)"], ["art_7", "7"]]);
  });
  it("a number followed by a unit is not an item", () => {
    expect(refs("Article 5, 6 months later and Article 9 and 10 days")).toEqual([["art_5", "Article 5"], ["art_9", "Article 9"]]);
  });
  it("does not take a date for a list item", () => {
    expect(refs("Under Article 113, 2 August 2026 is the day.")).toEqual([["art_113", "Article 113"]]);
  });
  it("skips citations of other acts and keeps those of the AI Act", () => {
    expect(refs("Article 6 GDPR and Article 9(1) of Regulation (EU) 2016/679 and Article 22 DSGVO.")).toEqual([]);
    expect(refs("GDPR Article 6 is unrelated.")).toEqual([]);
    expect(refs("Article 5 of Directive 2019/790, Article 7 of the Treaty on the Functioning of the EU")).toEqual([]);
    expect(refs("Article 9(2) of Regulation (EU) 2024/1689 and Article 10 of this Regulation and Article 11 of the AI Act")).toEqual([
      ["art_9.par_2", "Article 9(2)"],
      ["art_10", "Article 10"],
      ["art_11", "Article 11"],
    ]);
  });
  it.each([
    "Article 6 of the General Data Protection Regulation applies.",
    "Article 33 of the Data Governance Act applies.",
    "Article 5 of the Data Act applies.",
    "Article 25 of the Digital Services Act applies.",
    "Article 4 of the Machinery Regulation applies.",
    "Article 10 of the Medical Devices Regulation applies.",
    "Article 21 of NIS2 applies.",
    "Article 13 of the Cyber Resilience Act applies.",
    "Article 6 of Regulation (EU) 2016/679 applies.",
    "Article 6 of Regulation (EU) No 168/2013 applies.",
    "Article 17 of Directive (EU) 2019/790 applies.",
    "Article 17 of Directive 2019/790 applies.",
    "Article 17 of the Copyright Directive applies.",
    "Article 288 TFEU applies.",
    "Article 8 of the Charter of Fundamental Rights applies.",
    "Artikel 6 der Datenschutz-Grundverordnung gilt.",
    "Artikel 6 der Verordnung (EU) 2016/679 gilt.",
    "Artikel 4 der Maschinenverordnung gilt.",
    "Artikel 6 der Richtlinie 2019/790 gilt.",
    "Artikel 6 DSGVO gilt.",
  ])("skips a spelled-out other act: %s", (t) => {
    const r = findRefsDetailed(t);
    expect(r.refs).toEqual([]);
    expect(r.foreign).toHaveLength(1);
  });
  it.each([
    "Article 6 of the AI Act applies.",
    "Article 6 of the EU AI Act applies.",
    "Article 6 of this Regulation applies.",
    "Article 6 of the Regulation applies.",
    "Article 6 of Regulation (EU) 2024/1689 applies.",
    "Artikel 6 der KI-Verordnung gilt.",
    "Artikel 6 der Verordnung (EU) 2024/1689 gilt.",
    "Artikel 6 dieser Verordnung gilt.",
    "Article 6. The Data Act is separate.",
  ])("keeps a citation of the AI Act: %s", (t) => {
    expect(findRefsDetailed(t).refs).toHaveLength(1);
  });
  it("does not read words that merely start like a citation", () => {
    expect(refs("The articles of association; Articles of faith; Annex Iran")).toEqual([]);
  });
  it("citesOtherAct", () => {
    expect(citesOtherAct(" of Regulation (EU) 2016/679")).toBe(true);
    expect(citesOtherAct(" of the Regulation")).toBe(false);
    expect(citesOtherAct(", the TFEU")).toBe(true);
  });
});

describe("findRefs: German", () => {
  it.each([
    ["Siehe Artikel 6 Absatz 2 KI-VO.", [["art_6.par_2", "Artikel 6 Absatz 2"]]],
    ["Art. 50 Abs. 1 Buchst. a gilt", [["art_50.par_1.a", "Art. 50 Abs. 1 Buchst. a"]]],
    ["nach Anhang III Nummer 4 Buchstabe a", [["anx_3.pt_4.a", "Anhang III Nummer 4 Buchstabe a"]]],
    ["Anhang I Abschnitt A Nummer 2", [["anx_1.sec_a.pt_2", "Anhang I Abschnitt A Nummer 2"]]],
    ["Artikel 43 Absatz 1 Unterabsatz 2", [["art_43.par_1.sub_2", "Artikel 43 Absatz 1 Unterabsatz 2"]]],
    ["Artikel 6 und 8", [["art_6", "Artikel 6"], ["art_8", "8"]]],
    ["Artikel 6 und 7 sowie Artikel 9", [["art_6", "Artikel 6"], ["art_7", "7"], ["art_9", "Artikel 9"]]],
    ["Artikel 6 Absatz 1 und 2", [["art_6.par_1", "Artikel 6 Absatz 1"], ["art_6.par_2", "2"]]],
    ["Artikel 6 Absatz 1 oder Absatz 2", [["art_6.par_1", "Artikel 6 Absatz 1"], ["art_6.par_2", "Absatz 2"]]],
    ["Anhänge I, II und III", [["anx_1", "Anhänge I"], ["anx_2", "II"], ["anx_3", "III"]]],
    ["Artikel 6 DSGVO und Artikel 9 Absatz 1 der Verordnung (EU) 2016/679", []],
  ] as Array<[string, Array<[string, string]>]>)("%s", (t, want) => {
    expect(refs(t)).toEqual(want);
  });
});

describe("findDates", () => {
  const iso = (t: string): string[] => findDates(t).map((d) => d.iso);
  it.each([
    ["from 2026-08-02 on", "2026-08-02"],
    ["from 2 August 2026 on", "2026-08-02"],
    ["from 2nd August 2026 on", "2026-08-02"],
    ["from August 2, 2026 on", "2026-08-02"],
    ["from August 2nd, 2026 on", "2026-08-02"],
    ["ab dem 2. August 2026", "2026-08-02"],
    ["ab dem 2.8.2026", "2026-08-02"],
    ["ab dem 02.08.2026", "2026-08-02"],
    ["ab dem 2. Dezember 2027", "2027-12-02"],
    ["on 27 July 2026", "2026-07-27"],
    ["am 2. März 2027", "2027-03-02"],
    ["by 2 Aug 2026", "2026-08-02"],
  ])("%s", (t, want) => {
    expect(iso(t)).toEqual([want]);
  });
  it("gives each date once with the span of the whole expression", () => {
    const t = "2. August 2026 and 2.8.2026";
    const d = findDates(t);
    expect(d.map((x) => t.slice(x.span.start, x.span.end))).toEqual(["2. August 2026", "2.8.2026"]);
  });
  it("ignores impossible dates and bare numbers", () => {
    expect(iso("31 February 2026, 2026-13-45, version 1.2.3, 12 August")).toEqual([]);
  });
});

describe("splitSentences", () => {
  const sents = (t: string, skip: Array<{ start: number; end: number }> = []): string[] => splitSentences(t, skip).map((s) => t.slice(s.start, s.end));
  it("splits at full stops but not after abbreviations or German dates", () => {
    expect(sents("It applies. Next one! And more? Yes.")).toEqual(["It applies.", "Next one!", "And more?", "Yes."]);
    expect(sents("Nach Art. 6 Abs. 2 gilt ab dem 2. August 2026 das Recht. Danach nicht.")).toEqual(["Nach Art. 6 Abs. 2 gilt ab dem 2. August 2026 das Recht.", "Danach nicht."]);
    expect(sents("See e.g. the text. Then Annex I. Then more.")).toEqual(["See e.g. the text.", "Then Annex I.", "Then more."]);
  });
  it("splits at blank lines and does not split inside quotations", () => {
    expect(sents("Heading\n\nBody text without stop")).toEqual(["Heading", "Body text without stop"]);
    const t = 'He reads: "First part. Second part." Then more.';
    const q = findQuotes(t);
    expect(sents(t, q.map((x) => x.span))).toEqual(['He reads: "First part. Second part."', "Then more."]);
  });
});

describe("findQuotes", () => {
  it("reads straight, curly, German and guillemet quotation marks and counts words", () => {
    const t = 'A "one two three four five six" b “seven eight nine ten eleven twelve” c „dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn“ d «short one».';
    const q = findQuotes(t);
    expect(q.map((x) => x.words)).toEqual([6, 6, 6, 2]);
    expect(q.map((x) => x.inner)[2]).toBe("dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn");
    expect(t.slice(q[0]?.span.start, q[0]?.span.end)).toBe('"one two three four five six"');
  });
});
