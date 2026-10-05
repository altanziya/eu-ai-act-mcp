/**
 * Golden tests day 5d addendum 3 (written and frozen before implementation, plan/day-5d-addendum-3.md).
 * Without `lang`, each quotation is checked in its own language.
 */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";

type F = { kind: string; severity: string; message: string };
const DE_QUOTE = "\"Die Anbieter und Betreiber von KI-Systemen ergreifen Maßnahmen, um nach besten Kräften sicherzustellen, dass ihr Personal und andere Personen, die in ihrem Auftrag mit dem Betrieb und der Nutzung von KI-Systemen befasst sind, über ein ausreichendes Maß an KI-Kompetenz verfügen\"";
const kinds = (text: string, lang?: "en" | "de") =>
  (auditText({ text, as_of: "2026-05-01", ...(lang ? { lang } : {}) } as Parameters<typeof auditText>[0]) as unknown as { findings: F[] }).findings.map((f) => f.kind);

describe("day5d addendum 3 golden: quotation language", () => {
  it("a German quotation in a German text without lang is ok", () => {
    const k = kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`);
    expect(k).toContain("quote_ok");
    expect(k).not.toContain("quote_deviates");
  });
  it("a German quotation in an English text without lang is ok", () => {
    const k = kinds(`Article 4 says, in the German version: ${DE_QUOTE}.`);
    expect(k).toContain("quote_ok");
  });
  it("explicit lang still decides", () => {
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`, "de")).toContain("quote_ok");
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`, "en")).not.toContain("quote_ok");
  });
});
