/** Day 5d addendum 2 (plan/day-5d-addendum-2.md): a date at the start of a sentence counts only for a statement of application; the quote check keeps its language. EN and DE, each rule with a counter-probe. */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";

const NOW = "2026-10-05";
const run = (text: string, lang?: "en" | "de", asOf = NOW): Finding[] => auditText({ text, as_of: asOf, ...(lang ? { lang } : {}) }).findings;
const errors = (text: string, lang?: "en" | "de"): Finding[] => run(text, lang).filter((f) => f.severity === "error");
const outdated = (text: string, lang?: "en" | "de"): Finding[] => run(text, lang).filter((f) => f.kind === "outdated_deadline");
const flagged = (text: string, lang?: "en" | "de"): Finding[] => run(text, lang).filter((f) => f.kind === "outdated_deadline" || f.kind === "unverified_date");

describe("A1 rule 1: a verb of application makes the leading date a trigger", () => {
  it("EN and DE are flagged", () => {
    for (const t of [
      "From 2 August 2026 the obligations for high-risk AI systems apply.",
      "As of 2 August 2026, the requirements for high-risk AI systems are applicable.",
      "Since 2 August 2026 the rules on high-risk AI systems have been in force.",
      "On 2 August 2026 the obligations for high-risk AI systems enter into application.",
    ]) expect(outdated(t, "en"), t).toHaveLength(1);
    for (const t of [
      "Ab dem 2. August 2026 sind die Pflichten für Hochrisiko-KI-Systeme anwendbar.",
      "Seit dem 2. August 2026 gelten die Anforderungen an Hochrisiko-KI-Systeme.",
      "Am 2. August 2026 treten die Pflichten für Hochrisiko-KI-Systeme in Kraft.",
    ]) expect(outdated(t, "de"), t).toHaveLength(1);
  });
  it("counter-probe: an event verb or a first-person subject of the verb stays silent", () => {
    for (const t of [
      "From 2 August 2026 to 5 August 2026 we held a workshop on high-risk systems.",
      "As of 2 August 2026 our inventory listed three high-risk systems.",
      "Since 2 August 2026 we have trained staff on high-risk systems.",
      "From 2 August 2026 we apply our new policy to high-risk systems.",
      "On 2 August 2026, the board reviewed our high-risk AI system.",
    ]) expect(flagged(t, "en"), t).toHaveLength(0);
    for (const t of [
      "Seit dem 2. August 2026 schulen wir Mitarbeitende zu Hochrisiko-KI-Systemen.",
      "Am 2. August 2026 haben wir unser Hochrisiko-System geprüft.",
      "Ab dem 2. August 2026 wenden wir die Richtlinie auf Hochrisiko-KI-Systeme an.",
    ]) expect(flagged(t, "de"), t).toHaveLength(0);
  });
});

describe("A2 rule 2: an obligation modal needs high-risk as its subject and no first-person subject", () => {
  it("EN: subject before the modal", () => {
    for (const t of [
      "From 2 August 2026 high-risk AI systems must comply.",
      "On 2 August 2026, providers of high-risk AI systems must meet the requirements of Chapter III.",
      "As of 2 August 2026 high-risk AI systems have to comply.",
      "Since 2 August 2026 high-risk AI systems shall comply.",
    ]) expect(outdated(t, "en"), t).toHaveLength(1);
  });
  it("DE: subject before the modal or right behind a modal in second position", () => {
    for (const t of [
      "Ab dem 2. August 2026 müssen Hochrisiko-KI-Systeme die Anforderungen erfüllen.",
      "Am 2. August 2026 müssen Anbieter von Hochrisiko-KI-Systemen die Anforderungen erfüllen.",
      "Ab dem 2. August 2026 haben Hochrisiko-KI-Systeme die Anforderungen zu erfüllen.",
      "Am 2. August 2026 sind Hochrisiko-KI-Systeme anwendbar.",
    ]) expect(outdated(t, "de"), t).toHaveLength(1);
  });
  it("counter-probe EN: first-person subject or high-risk as object of the clause", () => {
    for (const t of [
      "On 2 August 2026, we must report on high-risk systems to the board.",
      "On 2 August 2026, our team must report on high-risk systems to the board.",
      "From 2 August 2026 we will report that high-risk AI systems must comply.",
      "On 2 August 2026, I have to report on high-risk systems.",
      "On 2 August 2026, the board needs to report on high-risk systems.",
    ]) expect(flagged(t, "en"), t).toHaveLength(0);
  });
  it("counter-probe DE: first-person subject or high-risk as object of the clause", () => {
    for (const t of [
      "Am 2. August 2026 müssen wir dem Vorstand über Hochrisiko-KI-Systeme berichten.",
      "Am 2. August 2026 muss unser Team über Hochrisiko-KI-Systeme berichten.",
      "Am 2. August 2026 müssen Anbieter dem Vorstand über Hochrisiko-KI-Systeme berichten.",
      "Am 2. August 2026 muss ich über Hochrisiko-KI-Systeme berichten.",
    ]) expect(flagged(t, "de"), t).toHaveLength(0);
  });
});

describe("A3 date ranges never trigger", () => {
  it("EN and DE", () => {
    expect(flagged("From 2 August 2026 to 5 August 2027 high-risk AI systems must comply.", "en")).toHaveLength(0);
    expect(flagged("From 2 August 2026 until 5 August 2027 the obligations for high-risk AI systems apply.", "en")).toHaveLength(0);
    expect(flagged("Vom 2. August 2026 bis zum 5. August 2027 gelten die Pflichten für Hochrisiko-KI-Systeme.", "de")).toHaveLength(0);
    expect(flagged("Ab dem 2. August 2026 bis zum 5. August 2027 gelten die Pflichten für Hochrisiko-KI-Systeme.", "de")).toHaveLength(0);
  });
  it("counter-probe: the same sentence without the range is flagged", () => {
    expect(outdated("From 2 August 2026 high-risk AI systems must comply.", "en")).toHaveLength(1);
    expect(outdated("Ab dem 2. August 2026 gelten die Pflichten für Hochrisiko-KI-Systeme.", "de")).toHaveLength(1);
  });
});

describe("A4 a date behind its own trigger word later in the sentence is unchanged", () => {
  it("EN and DE", () => {
    expect(outdated("High-risk AI systems must comply from 2 August 2026.", "en")).toHaveLength(1);
    expect(outdated("Hochrisiko-KI-Systeme müssen ab dem 2. August 2026 die Anforderungen erfüllen.", "de")).toHaveLength(1);
    expect(errors("We must report on high-risk systems; our inventory listed three of them on 2 August 2026.", "en")).toHaveLength(0);
  });
});

describe("B detectLang only selects the language of the messages", () => {
  const quote = "\"Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff\"";
  const de = `Die Pflicht zur KI-Kompetenz für Betreiber und Anbieter ergibt sich aus Artikel 4: ${quote}. Das gilt für unsere gesamte Belegschaft.`;
  it("an English quotation in a German text is quote_ok, with German messages", () => {
    const f = run(de, undefined, "2026-05-01");
    expect(f.some((x) => x.kind === "quote_ok")).toBe(true);
    expect(f.some((x) => x.kind === "quote_deviates")).toBe(false);
    expect(f.find((x) => x.kind === "quote_ok")!.message).toMatch(/Das Zitat entspricht/);
  });
  it("counter-probe: an explicit lang=de checks against the German corpus", () => {
    const f = run(de, "de", "2026-05-01");
    expect(f.some((x) => x.kind === "quote_ok")).toBe(false);
    expect(f.some((x) => x.kind === "quote_deviates" || x.kind === "quote_not_found")).toBe(true);
  });
});
