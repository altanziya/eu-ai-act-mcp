import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";

const NOW = "2026-10-05";
const run = (text: string, lang: "en" | "de" = "en"): Finding[] => auditText({ text, as_of: NOW, lang }).findings;
const ofKind = (text: string, kind: string, lang: "en" | "de" = "en"): Finding[] => run(text, lang).filter((f) => f.kind === kind);
const errors = (text: string, lang: "en" | "de" = "en"): Finding[] => run(text, lang).filter((f) => f.severity === "error");
const warnings = (text: string, lang: "en" | "de" = "en"): Finding[] => run(text, lang).filter((f) => f.severity === "warning");

describe("high-risk without an annex (both routes)", () => {
  it("EN: the old general date is an error, expected is the Annex III date, the message names both current dates", () => {
    const f = ofKind("High-risk AI systems must comply with the requirements from 2 August 2026.", "outdated_deadline");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", found: "2026-08-02", expected: "2027-12-02" });
    expect(f[0]!.message).toContain("2 December 2027 for Annex III systems");
    expect(f[0]!.message).toContain("2 August 2028 for Annex I products");
  });
  it("DE: Hochrisiko as a word part, message with both current dates", () => {
    for (const t of ["Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.", "Hochrisikosysteme müssen die Anforderungen ab dem 2. August 2026 erfüllen."]) {
      const f = ofKind(t, "outdated_deadline", "de");
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({ found: "2026-08-02", expected: "2027-12-02" });
      expect(f[0]!.message).toContain("2. Dezember 2027 für Systeme nach Anhang III");
      expect(f[0]!.message).toContain("2. August 2028 für Produkte nach Anhang I");
    }
  });
  it("the date of the other route in the old version (Annex I, 2 August 2027) is outdated as well", () => {
    expect(ofKind("High-risk AI systems must comply from 2 August 2027.", "outdated_deadline")[0]).toMatchObject({ found: "2027-08-02", expected: "2027-12-02" });
  });
  it("current dates of either route are ok and the message names the route (EN, DE)", () => {
    const a3 = ofKind("High-risk AI systems must comply from 2 December 2027.", "deadline_ok");
    expect(a3).toHaveLength(1);
    expect(a3[0]!.message).toContain("Annex III");
    const a1 = ofKind("Hochrisiko-KI-Systeme müssen ab dem 2. August 2028 die Anforderungen erfüllen.", "deadline_ok", "de");
    expect(a1).toHaveLength(1);
    expect(a1[0]!.message).toContain("Anhang I");
    expect(errors("High-risk AI systems must comply from 2 December 2027.")).toHaveLength(0);
  });
  it("with Annex III or Annex I in the sentence the annex rule applies (no both-routes finding)", () => {
    expect(ofKind("High-risk AI systems listed in Annex III must comply from 2 August 2026.", "outdated_deadline")).toHaveLength(1);
    expect(errors("High-risk AI systems listed in Annex III must comply from 2 December 2027.")).toHaveLength(0);
    expect(errors("High-risk obligations apply from 2 December 2027 for Annex III systems and from 2 August 2028 for Annex I products.")).toHaveLength(0);
    expect(errors("Hochrisiko-KI-Systeme nach Anhang I müssen ab dem 2. August 2028 die Anforderungen erfüllen.", "de")).toHaveLength(0);
  });
  it("negative: general application date without high-risk, GPAI, Article 5", () => {
    expect(errors("The AI Act applies generally from 2 August 2026.")).toHaveLength(0);
    expect(errors("Das Gesetz gilt allgemein ab dem 2. August 2026.", "de")).toHaveLength(0);
    expect(errors("General-purpose AI model providers have had to comply since 2 August 2025.")).toHaveLength(0);
    expect(errors("Prohibited practices under Article 5 have applied since 2 February 2025.")).toHaveLength(0);
  });
  it("negative: a date without trigger word, a trigger in another clause, a subject only after the date", () => {
    expect(errors("High-risk systems were discussed at the conference on 2 August 2026.")).toHaveLength(0);
    expect(errors("Hochrisiko-Systeme wurden bei der Konferenz am 2. August 2026 besprochen.", "de")).toHaveLength(0);
    expect(errors("The AI Act applies from 2 August 2026; high-risk systems must comply from 2 December 2027.")).toHaveLength(0);
    expect(errors("The AI Act applies generally from 2 August 2026, with high-risk systems following later.")).toHaveLength(0);
    expect(errors("Das Gesetz gilt allgemein ab dem 2. August 2026, während Hochrisiko-Systeme später folgen.", "de")).toHaveLength(0);
  });
  it("a date opening the sentence may name high-risk after it", () => {
    expect(ofKind("From 2 August 2026, high-risk AI systems must comply.", "outdated_deadline")).toHaveLength(1);
  });
  it("is deterministic in as_of: before the amendment the consolidated dates are only a warning", () => {
    const f = auditText({ text: "High-risk AI systems must comply from 2 December 2027.", as_of: "2026-03-15" }).findings;
    expect(f.filter((x) => x.severity === "error")).toHaveLength(0);
  });
});

describe("subject from the previous sentence", () => {
  it("EN/DE: Annex III / Anhang III carries over one sentence", () => {
    const en = ofKind("Our hiring assistant is high-risk under Annex III. The obligations apply from 2 August 2026.", "outdated_deadline");
    expect(en).toHaveLength(1);
    expect(en[0]).toMatchObject({ expected: "2027-12-02", found: "2026-08-02" });
    const de = ofKind("Unser Assistent ist Hochrisiko nach Anhang III. Die Pflichten gelten ab dem 2. August 2026.", "outdated_deadline", "de");
    expect(de).toHaveLength(1);
    expect(de[0]).toMatchObject({ expected: "2027-12-02" });
  });
  it("carries the both-routes subject as well", () => {
    expect(ofKind("Our hiring assistant is a high-risk AI system. It must comply by 2 August 2026.", "outdated_deadline")).toHaveLength(1);
    expect(ofKind("Unser Assistent ist ein Hochrisiko-KI-System. Es muss bis zum 2. August 2026 konform sein.", "outdated_deadline", "de")).toHaveLength(1);
  });
  it("citation findings are not duplicated by the carry-over", () => {
    const f = run("Our hiring assistant is high-risk under Annex III. The obligations apply from 2 August 2026.");
    expect(f.filter((x) => x.kind === "reference_ok")).toHaveLength(1);
    expect(f.filter((x) => x.kind === "outdated_deadline")).toHaveLength(1);
  });
  it("negative: no carry-over across a paragraph break (EN, DE)", () => {
    expect(errors("Our hiring assistant is high-risk under Annex III.\n\nThe new office opens from 2 August 2026.")).toHaveLength(0);
    expect(errors("Unser Assistent ist Hochrisiko nach Anhang III.\n\nDas neue Büro öffnet ab dem 2. August 2026.", "de")).toHaveLength(0);
  });
  it("negative: no carry-over from two sentences back", () => {
    expect(errors("Our hiring assistant is high-risk under Annex III. It is used by recruiters. The obligations apply from 2 August 2026.")).toHaveLength(0);
  });
  it("negative: a date without trigger word is not carried", () => {
    expect(errors("Our hiring assistant is high-risk under Annex III. The conference took place on 2 August 2026.")).toHaveLength(0);
    expect(errors("Unser Assistent ist Hochrisiko nach Anhang III. Die Konferenz fand am 2. August 2026 statt.", "de")).toHaveLength(0);
  });
  it("negative: the previous sentence has a date of its own", () => {
    expect(errors("Annex III obligations apply from 2 December 2027. The new office opens from 2 August 2026.")).toHaveLength(0);
  });
  it("negative: a correct carried date stays quiet", () => {
    expect(errors("Our hiring assistant is high-risk under Annex III. The obligations apply from 2 December 2027.")).toHaveLength(0);
  });
});

describe("trigger words", () => {
  const EN = ["takes effect on", "take effect on", "is effective from", "must comply by", "requires compliance by", "has been in place since", "becomes applicable on", "enters into application on", "starts to apply on", "has the deadline of"];
  const DE = ["gelten ab dem", "gilt seit dem", "ist anwendbar am", "wird wirksam am", "hat die Frist", "gilt bis zum", "gilt spätestens am"];
  it.each(EN)("EN: Article 50 ... %s a wrong date is flagged", (t) => {
    const f = warnings(`Article 50 ${t} 1 March 2027.`);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: "unverified_date", expected: "2026-08-02", found: "2027-03-01" });
  });
  it.each(DE)("DE: Artikel 50 ... %s a wrong date is flagged", (t) => {
    const f = warnings(`Artikel 50 ${t} 1. März 2027.`, "de");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: "unverified_date", expected: "2026-08-02" });
  });
  it("the trigger word may stand up to six words before the date (itself included), not seven", () => {
    expect(warnings("Article 50 is relevant from the very early spring days 1 March 2027.")).toHaveLength(1);
    expect(warnings("Article 50 is relevant from the very early spring days only 1 March 2027.")).toHaveLength(0);
  });
  it("negative: the trigger word stands in another clause", () => {
    expect(warnings("Article 50 applies from the start, but the new office opens on 1 March 2027.")).toHaveLength(0);
    expect(warnings("Article 50 applies from the start; the new office opens on 1 March 2027.")).toHaveLength(0);
    expect(warnings("Artikel 50 gilt ab sofort, während das neue Büro am 1. März 2027 öffnet.", "de")).toHaveLength(0);
  });
  it("negative: a date without trigger word", () => {
    expect(warnings("Article 50 was discussed in the meeting on 1 March 2027.")).toHaveLength(0);
    expect(warnings("Artikel 50 wurde in der Sitzung am 1. März 2027 besprochen.", "de")).toHaveLength(0);
  });
  it("negative: correct dates stay ok with the new triggers", () => {
    expect(errors("General-purpose AI model providers have been compliant since 2 August 2025.")).toHaveLength(0);
    expect(warnings("Article 50 takes effect on 2 August 2026.")).toHaveLength(0);
    expect(warnings("Artikel 50 gilt spätestens ab dem 2. August 2026.", "de")).toHaveLength(0);
  });
});
