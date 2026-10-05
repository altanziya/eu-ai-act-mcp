/** Day 5d addendum (plan/day-5d-addendum.md), points A1-C10: no false alarms on correct sentences, more German/English word orders, small fixes. EN and DE, each with a counter-probe. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";
import { splitSentences, startsListItem } from "../../src/tools/auditScan.js";
import { CONSOLIDATED_FROM } from "../../src/tools/corpus.js";
import { V2026 } from "../../src/constants.js";

const NOW = "2026-10-05";
const BEFORE = "2026-06-01";
const run = (text: string, lang?: "en" | "de", asOf = NOW): Finding[] => auditText({ text, as_of: asOf, ...(lang ? { lang } : {}) }).findings;
const errors = (text: string, lang?: "en" | "de"): Finding[] => run(text, lang).filter((f) => f.severity === "error");
const outdated = (text: string, lang?: "en" | "de"): Finding[] => run(text, lang).filter((f) => f.kind === "outdated_deadline");

describe("A1 own subject beats the carried-over one", () => {
  it("EN: the Regulation as a whole in the sentence", () => {
    expect(errors("This guide covers high-risk AI systems. The AI Act applies from 2 August 2026.", "en")).toHaveLength(0);
    expect(errors("High-risk AI systems are covered. The Regulation applies from 2 August 2026.", "en")).toHaveLength(0);
  });
  it("DE: die Verordnung / der AI Act / die KI-Verordnung", () => {
    expect(errors("Der Leitfaden behandelt Hochrisiko-KI-Systeme. Die Verordnung gilt ab dem 2. August 2026.", "de")).toHaveLength(0);
    expect(errors("Der Leitfaden behandelt Hochrisiko-KI-Systeme. Der AI Act gilt ab dem 2. August 2026.", "de")).toHaveLength(0);
    expect(errors("Der Leitfaden behandelt Hochrisiko-KI-Systeme. Die KI-Verordnung gilt ab dem 2. August 2026.", "de")).toHaveLength(0);
  });
  it("counter-probe: without a subject of its own the sentence still takes the one before", () => {
    expect(outdated("High-risk AI systems are covered. They must comply from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Der Leitfaden behandelt Hochrisiko-KI-Systeme. Sie müssen ab dem 2. August 2026 konform sein.", "de")).toHaveLength(1);
  });
  it("a citation of another act is a subject of its own as well", () => {
    expect(errors("High-risk AI systems are covered. Article 13 GDPR applies from 25 May 2018, and 2 August 2026 is another day.", "en")).toHaveLength(0);
  });
});

describe("A2 the Regulation as a whole next to high-risk", () => {
  it("EN: the AI Act applies generally from the old date; the Regulation as object does not hide a real error", () => {
    expect(errors("For high-risk AI systems, note that the AI Act generally applies from 2 August 2026.", "en")).toHaveLength(0);
    expect(errors("The AI Act's rules on high-risk AI systems apply from 2 August 2026 for most operators.", "en")).toHaveLength(1);
    expect(outdated("High-risk AI systems must comply with the AI Act from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Under the AI Act, high-risk AI systems must comply from 2 August 2026.", "en")).toHaveLength(1);
  });
  it("DE: die Verordnung ist seit ... anwendbar; nach der Verordnung bleibt ein Fehler ein Fehler", () => {
    expect(errors("Für Hochrisiko-KI-Systeme gilt: Die Verordnung ist seit dem 2. August 2026 anwendbar.", "de")).toHaveLength(0);
    expect(outdated("Nach der Verordnung müssen Hochrisiko-KI-Systeme ab dem 2. August 2026 konform sein.", "de")).toHaveLength(1);
    expect(outdated("Hochrisiko-KI-Systeme im Sinne der Verordnung gelten ab dem 2. August 2026.", "de")).toHaveLength(1);
  });
});

describe("A3 paragraph, list item and table row boundaries", () => {
  it("EN: CRLF paragraph break and list items stop the carry-over", () => {
    expect(errors("This guide covers high-risk AI systems.\r\n\r\nGeneral application from 2 August 2026.", "en")).toHaveLength(0);
    expect(errors("- High-risk AI systems\n- General application from 2 August 2026", "en")).toHaveLength(0);
    expect(errors("* high-risk AI systems: see below\n* general application from 2 August 2026", "en")).toHaveLength(0);
    expect(errors("1. High-risk AI systems\n2. General application from 2 August 2026", "en")).toHaveLength(0);
    expect(errors("a) High-risk AI systems\nb) general application from 2 August 2026", "en")).toHaveLength(0);
    expect(errors("• High-risk AI systems\n• general application from 2 August 2026", "en")).toHaveLength(0);
    expect(errors("| Topic | Date |\n| high-risk AI systems | |\n| general application | from 2 August 2026 |", "en")).toHaveLength(0);
  });
  it("DE: CRLF and list items", () => {
    expect(errors("Der Leitfaden behandelt Hochrisiko-KI-Systeme.\r\n\r\nAllgemeine Anwendung ab dem 2. August 2026.", "de")).toHaveLength(0);
    expect(errors("- Hochrisiko-KI-Systeme\n- allgemeine Anwendung ab dem 2. August 2026", "de")).toHaveLength(0);
  });
  it("counter-probe: a single line break (also CRLF) is no paragraph; a list item with its own subject is still checked", () => {
    expect(outdated("High-risk AI systems are covered.\r\nThey must comply from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("- High-risk AI systems must comply from 2 August 2026", "en")).toHaveLength(1);
    expect(outdated("- Hochrisiko-KI-Systeme müssen ab dem 2. August 2026 konform sein", "de")).toHaveLength(1);
  });
  it("splitSentences: list markers cut, a German date at the start of a line does not", () => {
    const sents = (t: string): string[] => splitSentences(t).map((s) => t.slice(s.start, s.end));
    expect(sents("- one\n- two\n* three")).toEqual(["- one", "- two", "* three"]);
    expect(sents("Ab dem\n2. August 2026 gelten die Pflichten.")).toHaveLength(1);
    expect(sents("a\r\n\r\nb")).toEqual(["a", "b"]);
    expect(startsListItem("1) x", 0)).toBe(true);
    expect(startsListItem("2. August 2026", 0)).toBe(false);
    expect(startsListItem("-5 percent", 0)).toBe(false);
  });
});

describe("A4 negation is no high-risk anchor", () => {
  it("EN", () => {
    for (const t of [
      "Non-high-risk AI systems only have to comply with the AI Act from 2 August 2026.",
      "AI systems that are not high-risk must comply from 2 August 2026.",
      "AI systems other than high-risk ones must comply from 2 August 2026.",
      "AI systems that are not classified as high-risk must comply from 2 August 2026.",
    ]) expect(errors(t, "en")).toHaveLength(0);
  });
  it("DE", () => {
    for (const t of [
      "Systeme ohne Hochrisiko-Einstufung müssen die Verordnung ab dem 2. August 2026 einhalten.",
      "Für Nicht-Hochrisiko-Systeme gilt ab dem 2. August 2026 die Verordnung.",
      "KI-Systeme mit kein Hochrisiko müssen ab dem 2. August 2026 konform sein.",
    ]) expect(errors(t, "de")).toHaveLength(0);
  });
  it("counter-probe: the same sentence without the negation is reported (EN, DE)", () => {
    expect(outdated("High-risk AI systems must comply from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Non-high-risk AI systems are out of scope, but high-risk AI systems must comply from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Hochrisiko-KI-Systeme müssen ab dem 2. August 2026 konform sein.", "de")).toHaveLength(1);
  });
});

describe("A5 \"by\" is a trigger only before the date and not after a passive participle", () => {
  it("EN: events stay silent", () => {
    for (const t of [
      "Our high-risk AI system was reviewed by the board on 2 August 2026.",
      "The high-risk AI system was approved by the board on 2 August 2026.",
      "The high-risk AI system documentation was signed by the provider on 2 August 2026.",
      "The high-risk AI system was reviewed by 2 August 2026.",
    ]) expect(errors(t, "en")).toHaveLength(0);
  });
  it("DE: Ereignisdatum nach Vergangenheitsverb", () => {
    expect(errors("Das Hochrisiko-System wurde am 2. August 2026 vom Vorstand geprüft.", "de")).toHaveLength(0);
  });
  it("counter-probe: the deadline readings are reported", () => {
    expect(outdated("High-risk AI systems must comply by 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("High-risk AI systems must comply by no later than 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Hochrisiko-KI-Systeme müssen bis zum 2. August 2026 konform sein.", "de")).toHaveLength(1);
  });
});

describe("B6 date at the start of the sentence, subject after it, no comma", () => {
  it("EN", () => {
    for (const t of ["From 2 August 2026 high-risk AI systems must comply.", "On 2 August 2026, the obligations for high-risk AI systems take effect.", "As of 2 August 2026 high-risk AI systems must comply."]) {
      const f = outdated(t, "en");
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({ expected: "2027-12-02", found: "2026-08-02" });
    }
  });
  it("DE", () => {
    for (const t of [
      "Ab dem 2. August 2026 gelten die Pflichten für Hochrisiko-KI-Systeme.",
      "Ab 2. August 2026 müssen Hochrisiko-KI-Systeme die Anforderungen erfüllen.",
      "Seit dem 2. August 2026 gelten die Anforderungen an Hochrisiko-KI-Systeme.",
      "Am 2. August 2026 treten die Pflichten für Hochrisiko-KI-Systeme in Kraft.",
    ]) expect(outdated(t, "de")).toHaveLength(1);
  });
  it("counter-probe: an event on that day stays silent (EN, DE)", () => {
    expect(errors("On 2 August 2026, the board reviewed our high-risk AI system.", "en")).toHaveLength(0);
    expect(errors("Am 2. August 2026 haben wir unser Hochrisiko-System geprüft.", "de")).toHaveLength(0);
  });
});

describe("B7 hyphenated compounds count as one word", () => {
  it("EN and DE", () => {
    expect(outdated("The deadline for high-risk AI systems is 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Die Frist für Hochrisiko-KI-Systeme endet am 2. August 2026.", "de")).toHaveLength(1);
  });
  it("counter-probe: a trigger word still has to be within six words", () => {
    expect(errors("Our high-risk AI systems apply many different measures to this and that, and then we meet on 2 August 2026.", "en")).toHaveLength(0);
    expect(errors("Unsere Hochrisiko-KI-Systeme haben viele verschiedene Maßnahmen, die wir gelten lassen, und dann treffen wir uns sehr gerne am 2. August 2026.", "de")).toHaveLength(0);
  });
});

describe("C8 the amendment date comes from the data, not from a literal in the audit core", () => {
  it("auditCore.ts holds no literal 2026-07-27; CONSOLIDATED_FROM is the date of the consolidated corpus id", () => {
    expect(readFileSync(new URL("../../src/tools/auditCore.ts", import.meta.url), "utf8")).not.toContain("2026-07-27");
    const corpus = JSON.parse(readFileSync(new URL("../../data/corpus/02024R1689-20260727.en.json", import.meta.url), "utf8")) as { celex: string };
    expect(corpus.celex).toBe(V2026);
    expect(CONSOLIDATED_FROM).toBe("2026-07-27");
    expect(CONSOLIDATED_FROM.replace(/-/g, "")).toBe(corpus.celex.slice(-8));
  });
  it("EN and DE messages still name the date; counter-probe: a text in force today does not", () => {
    expect(run("Article 4a(1) allows it.", "en", BEFORE)[0]!.message).toContain("27 July 2026");
    expect(run("Artikel 4a Absatz 1 erlaubt das.", "de", BEFORE)[0]!.message).toContain("27. Juli 2026");
    expect(run("Article 4a(1) allows it.", "en")[0]!.message).not.toContain("27 July 2026");
  });
});

describe("C9 Official Journal version: high-risk date names both routes", () => {
  it("EN: 2 August 2028 on a date before the amendment names Annex III and Annex I", () => {
    const f = run("High-risk AI systems must comply from 2 August 2028.", "en", BEFORE).filter((x) => x.kind === "unverified_date");
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toContain("2 August 2026 for Annex III systems");
    expect(f[0]!.message).toContain("2 August 2027 for Annex I products");
  });
  it("DE: beide damals geltenden Daten", () => {
    const f = run("Hochrisiko-KI-Systeme müssen ab dem 2. August 2028 konform sein.", "de", BEFORE).filter((x) => x.kind === "unverified_date");
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toContain("2. August 2026 für Systeme nach Anhang III");
    expect(f[0]!.message).toContain("2. August 2027 für Produkte nach Anhang I");
  });
  it("counter-probe: the current version keeps its own message; a date right in the version in force is ok", () => {
    expect(outdated("High-risk AI systems must comply from 2 August 2026.", "en")[0]!.message).toContain("2 August 2028 for Annex I products");
    expect(run("High-risk AI systems must comply from 2 August 2026.", "en", BEFORE).filter((x) => x.kind === "deadline_ok")).toHaveLength(1);
  });
});

describe("C10 without lang the messages follow the language of the text", () => {
  it("EN text: English message", () => {
    expect(outdated("High-risk AI systems must comply from 2 August 2026.")[0]!.message).toMatch(/December 2027/);
  });
  it("DE text: German message and German citation form", () => {
    expect(outdated("Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.")[0]!.message).toMatch(/Dezember 2027/);
    expect(run("Artikel 6 Absatz 2 gilt.")[0]!.message).toMatch(/besteht in der/);
  });
  it("counter-probe: an explicit lang wins over the text", () => {
    expect(outdated("Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.", "en")[0]!.message).toMatch(/December 2027/);
    expect(outdated("High-risk AI systems must comply from 2 August 2026.", "de")[0]!.message).toMatch(/Dezember 2027/);
  });
});
