/**
 * Golden tests day 5d (written and frozen before implementation, plan/day-5d.md).
 * The most common wrong sentence after the Digital Omnibus names "high-risk" without an annex.
 */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";

const AS_OF = "2026-10-05";
type F = { kind: string; severity: string; excerpt: string; expected?: string };
const run = (text: string) => (auditText({ text, as_of: AS_OF }) as unknown as { findings: F[] }).findings;
const errors = (text: string) => run(text).filter((f) => f.severity === "error");
const outdated = (text: string) => run(text).filter((f) => f.kind === "outdated_deadline");

describe("day5d golden: high-risk without an annex", () => {
  it("EN: flags the old application date", () => {
    const f = outdated("High-risk AI systems must comply with the requirements from 2 August 2026.");
    expect(f).toHaveLength(1);
    expect(f[0]!.expected).toBe("2027-12-02");
  });
  it("DE: flags the old application date", () => {
    const f = outdated("Die Pflichten für Hochrisiko-KI-Systeme gelten ab dem 2. August 2026.");
    expect(f).toHaveLength(1);
    expect(f[0]!.expected).toBe("2027-12-02");
  });
  it("EN: 'take effect on' is a trigger", () => {
    expect(outdated("The AI Act's rules on high-risk systems take effect on 2 August 2026, two years after entry into force.")).toHaveLength(1);
  });
  it("accepts the current dates of both routes", () => {
    expect(errors("High-risk obligations apply from 2 December 2027 for Annex III systems and from 2 August 2028 for Annex I products.")).toHaveLength(0);
    expect(errors("High-risk AI systems must comply from 2 December 2027.")).toHaveLength(0);
    expect(errors("Hochrisiko-KI-Systeme nach Anhang I müssen ab dem 2. August 2028 die Anforderungen erfüllen.")).toHaveLength(0);
  });
  it("the general application date without high-risk is fine", () => {
    expect(errors("The AI Act entered into force on 1 August 2024 and generally applies from 2 August 2026.")).toHaveLength(0);
  });
});

describe("day5d golden: subject from the previous sentence", () => {
  it("carries Annex III over one sentence", () => {
    const f = outdated("Our hiring assistant is high-risk under Annex III. The obligations apply from 2 August 2026.");
    expect(f).toHaveLength(1);
    expect(f[0]!.expected).toBe("2027-12-02");
  });
  it("does not carry over a paragraph break", () => {
    expect(errors("Our hiring assistant is high-risk under Annex III.\n\nThe new office opens from 2 August 2026.")).toHaveLength(0);
  });
});

describe("day5d golden: no regressions", () => {
  it("Annex III with the old date is still an error, Article 10(5) still removed", () => {
    const f = run("The obligations for high-risk AI systems listed in Annex III apply from 2 August 2026. Under Article 10(5) providers may process special categories of personal data.");
    expect(f.some((x) => x.kind === "outdated_deadline" && x.expected === "2027-12-02")).toBe(true);
    expect(f.some((x) => x.kind === "removed_provision")).toBe(true);
  });
  it("GPAI and prohibited practices dates stay ok", () => {
    expect(errors("General-purpose AI model providers have had to comply since 2 August 2025.")).toHaveLength(0);
    expect(errors("Prohibited practices under Article 5 have applied since 2 February 2025.")).toHaveLength(0);
  });
});
