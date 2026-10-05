/**
 * Golden tests day 5d addendum 2 (written and frozen before implementation, plan/day-5d-addendum-2.md).
 * Event dates at the start of a sentence must stay silent; the quote check keeps its language.
 */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";

type F = { kind: string; severity: string; message: string; expected?: string };
const run = (text: string, as_of = "2026-10-05") => (auditText({ text, as_of }) as unknown as { findings: F[] }).findings;
const errors = (text: string) => run(text).filter((f) => f.severity === "error");
const outdated = (text: string) => run(text).filter((f) => f.kind === "outdated_deadline");

describe("day5d addendum 2 golden: event dates at the start stay silent", () => {
  it.each([
    "From 2 August 2026 to 5 August 2026 we held a workshop on high-risk systems.",
    "As of 2 August 2026 our inventory listed three high-risk systems.",
    "As of 2 August 2026, our inventory listed three high-risk systems.",
    "Since 2 August 2026 we have trained staff on high-risk systems.",
    "On 2 August 2026, we must report on high-risk systems to the board.",
    "Am 2. August 2026 müssen wir dem Vorstand über Hochrisiko-KI-Systeme berichten.",
    "Seit dem 2. August 2026 schulen wir Mitarbeitende zu Hochrisiko-KI-Systemen.",
    "Vom 2. August 2026 bis zum 5. August 2026 fand unser Workshop zu Hochrisiko-KI-Systemen statt.",
  ])("stays silent: %s", (text) => {
    expect(errors(text)).toHaveLength(0);
  });
});

describe("day5d addendum 2 golden: statements of application are still caught", () => {
  it.each([
    "Ab dem 2. August 2026 gelten die Pflichten für Hochrisiko-KI-Systeme.",
    "From 2 August 2026 high-risk AI systems must comply.",
    "On 2 August 2026, the obligations for high-risk AI systems take effect.",
    "Seit dem 2. August 2026 gelten die Anforderungen an Hochrisiko-KI-Systeme.",
    "From 2 August 2026, providers of high-risk AI systems must meet the requirements of Chapter III.",
  ])("flags: %s", (text) => {
    const f = outdated(text);
    expect(f).toHaveLength(1);
    expect(f[0]!.expected).toBe("2027-12-02");
  });
});

describe("day5d addendum 2 golden: quote check keeps its language", () => {
  it("an English quotation of Article 4 in a German text is ok", () => {
    const text = "Die Pflicht zur KI-Kompetenz für Betreiber und Anbieter ergibt sich aus Artikel 4: \"Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff\". Das gilt für unsere gesamte Belegschaft.";
    const f = run(text, "2026-05-01");
    expect(f.some((x) => x.kind === "quote_ok")).toBe(true);
    expect(f.some((x) => x.kind === "quote_deviates")).toBe(false);
  });
});
