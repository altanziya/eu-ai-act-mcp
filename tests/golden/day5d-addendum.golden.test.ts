/**
 * Golden tests day 5d addendum (written and frozen before implementation, plan/day-5d-addendum.md).
 * Counter-examples from the review: correct sentences must stay silent, common German word orders must be caught.
 */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";

const AS_OF = "2026-10-05";
type F = { kind: string; severity: string; message: string; expected?: string };
const run = (text: string, lang?: "en" | "de") => (auditText({ text, as_of: AS_OF, ...(lang ? { lang } : {}) } as Parameters<typeof auditText>[0]) as unknown as { findings: F[] }).findings;
const errors = (text: string) => run(text).filter((f) => f.severity === "error");
const outdated = (text: string) => run(text).filter((f) => f.kind === "outdated_deadline");

describe("day5d addendum golden: no false alarms", () => {
  it.each([
    "This guide covers high-risk AI systems. The AI Act applies from 2 August 2026.",
    "Der Leitfaden behandelt Hochrisiko-KI-Systeme. Die Verordnung gilt ab dem 2. August 2026.",
    "This guide covers high-risk AI systems.\r\n\r\nThe AI Act applies from 2 August 2026.",
    "- High-risk AI systems\n- The AI Act applies from 2 August 2026",
    "* high-risk AI systems: see below\n* general application from 2 August 2026",
    "Non-high-risk AI systems only have to comply with the AI Act from 2 August 2026.",
    "Systeme ohne Hochrisiko-Einstufung müssen die Verordnung ab dem 2. August 2026 einhalten.",
    "For high-risk AI systems, note that the AI Act generally applies from 2 August 2026.",
    "Für Hochrisiko-KI-Systeme gilt: Die Verordnung ist seit dem 2. August 2026 anwendbar.",
    "Our high-risk AI system was reviewed by the board on 2 August 2026.",
  ])("stays silent: %s", (text) => {
    expect(errors(text)).toHaveLength(0);
  });
});

describe("day5d addendum golden: word orders that must be caught", () => {
  it.each([
    "Ab dem 2. August 2026 gelten die Pflichten für Hochrisiko-KI-Systeme.",
    "Ab 2. August 2026 müssen Hochrisiko-KI-Systeme die Anforderungen erfüllen.",
    "Seit dem 2. August 2026 gelten die Anforderungen an Hochrisiko-KI-Systeme.",
    "Am 2. August 2026 treten die Pflichten für Hochrisiko-KI-Systeme in Kraft.",
    "From 2 August 2026 high-risk AI systems must comply.",
    "On 2 August 2026, the obligations for high-risk AI systems take effect.",
    "The deadline for high-risk AI systems is 2 August 2026.",
    "Die Frist für Hochrisiko-KI-Systeme endet am 2. August 2026.",
  ])("flags: %s", (text) => {
    const f = outdated(text);
    expect(f).toHaveLength(1);
    expect(f[0]!.expected).toBe("2027-12-02");
  });
  it("still flags the original sentences", () => {
    expect(outdated("High-risk AI systems must comply with the requirements from 2 August 2026.")).toHaveLength(1);
    expect(outdated("Unser Bewerber-Tool ist ein Hochrisiko-System. Spätestens bis zum 2. August 2026 müssen wir konform sein.")).toHaveLength(1);
  });
});

describe("day5d addendum golden: message language follows the text", () => {
  it("German text without lang gets a German message", () => {
    const f = outdated("Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.");
    expect(f[0]!.message).toMatch(/Dezember 2027/);
  });
  it("explicit lang wins", () => {
    const f = run("Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.", "en").filter((x) => x.kind === "outdated_deadline");
    expect(f[0]!.message).toMatch(/December 2027/);
  });
});
