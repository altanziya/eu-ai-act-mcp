/**
 * Golden tests for the obligations navigator. The expected values were written before the implementation and do
 * not follow it.
 * Fixed API:
 *   src/tools/obligations.ts  aiactObligations({ profile, as_of?, lang? }), describeProfile()
 */
import { describe, expect, it } from "vitest";
import { aiactObligations, describeProfile } from "../../src/tools/obligations.js";

const AS_OF = "2026-10-05";
type Ob = {
  id: string; status: string; applies_from: string | null; applies_from_literal?: string; deadline_caveat?: string;
  days_until: number; quote: string; quote_verified: boolean; changed_by_omnibus: boolean; provisions: { id: string; citation: string }[];
  route_dates?: string[];
};
type Res = { as_of: string; version: string; derived: string[]; obligations: Ob[]; timeline: { date: string; ids: string[] }[]; open_questions: { id: string; question: string }[]; notice: string };

const run = (profile: Record<string, unknown>, as_of = AS_OF) => aiactObligations({ profile, as_of }) as unknown as Res;
const ids = (r: Res) => r.obligations.map((o) => o.id);
const get = (r: Res, id: string) => {
  const o = r.obligations.find((x) => x.id === id);
  if (!o) throw new Error(`missing ${id}`);
  return o;
};

const ANNEX_III_PROVIDER = { role: ["provider"], uses_or_provides_ai_system: true, annex_iii_area: "4", annex_iii_art6_3_exception_concluded: false };

describe("obligations golden: Annex III provider (employment)", () => {
  const r = run(ANNEX_III_PROVIDER);
  it("uses the consolidated text and classifies as high-risk via Annex III", () => {
    expect(r.version).toBe("02024R1689-20260727");
    expect(r.derived).toContain("high_risk_annex_iii");
    expect(r.derived).toContain("hr_chapter_iii_in_scope");
  });
  it("risk management applies from the Annex III route date", () => {
    const o = get(r, "risk-management-system");
    expect(o.applies_from).toBe("2027-12-02");
    expect(o.status).toBe("upcoming");
    expect(o.days_until).toBe(423);
    expect(o.changed_by_omnibus).toBe(true);
    expect(o.provisions.map((p) => p.citation)).toContain("Article 9");
  });
  it("conformity assessment shows the route date and the literal residual date with a caveat", () => {
    const o = get(r, "conformity-assessment-annex-iii-internal");
    expect(o.applies_from).toBe("2027-12-02");
    expect(o.applies_from_literal).toBe("2026-08-02");
    expect(o.deadline_caveat ?? "").toMatch(/Art\. 113/);
  });
  it("AI literacy already applies", () => {
    const o = get(r, "ai-literacy");
    expect(o.status).toBe("applicable");
    expect(o.days_until).toBe(0);
  });
  it("every quotation is verified against the corpus", () => {
    expect(r.obligations.length).toBeGreaterThan(15);
    for (const o of r.obligations) expect(o.quote_verified, o.id).toBe(true);
  });
  it("is sorted applicable before upcoming, then by date, and has a timeline", () => {
    const order = { applicable: 0, upcoming: 1, depends: 2 } as Record<string, number>;
    for (let i = 1; i < r.obligations.length; i++) {
      const a = r.obligations[i - 1]!, b = r.obligations[i]!;
      expect(order[a.status]! <= order[b.status]!).toBe(true);
      if (a.status === b.status && a.applies_from && b.applies_from) expect(a.applies_from <= b.applies_from).toBe(true);
    }
    expect(r.timeline.map((t) => t.date)).toEqual([...r.timeline.map((t) => t.date)].sort());
    expect(r.timeline.find((t) => t.date === "2027-12-02")?.ids).toContain("risk-management-system");
  });
  it("carries a not-legal-advice notice", () => {
    expect(r.notice).toMatch(/not legal advice/i);
  });
});

describe("obligations golden: Article 6(3)", () => {
  it("exception without profiling: documentation duty, no high-risk package", () => {
    const r = run({ ...ANNEX_III_PROVIDER, annex_iii_art6_3_exception_concluded: true, annex_iii_performs_profiling: false });
    expect(ids(r)).toContain("annex-iii-non-high-risk-documentation");
    expect(ids(r)).not.toContain("risk-management-system");
    expect(r.derived).toContain("art6_3_exception_applies");
  });
  it("profiling overrides the exception", () => {
    const r = run({ ...ANNEX_III_PROVIDER, annex_iii_art6_3_exception_concluded: true, annex_iii_performs_profiling: true });
    expect(ids(r)).toContain("risk-management-system");
    expect(ids(r)).not.toContain("annex-iii-non-high-risk-documentation");
  });
  it("asks about Article 6(3) when the profile leaves it open", () => {
    const r = run({ role: ["provider"], uses_or_provides_ai_system: true, annex_iii_area: "4" });
    expect(r.open_questions.length).toBeGreaterThan(0);
  });
});

describe("obligations golden: Annex I", () => {
  it("Section A product: high-risk from the Annex I route date", () => {
    const r = run({ role: ["provider"], uses_or_provides_ai_system: true, annex_i_section: "A", annex_i_third_party_conformity_assessment: true });
    const o = get(r, "risk-management-system");
    expect(o.applies_from).toBe("2028-08-02");
    expect(o.days_until).toBe(667);
  });
  it("Section B product: only the limited-scope entry, no high-risk package", () => {
    const r = run({ role: ["provider"], uses_or_provides_ai_system: true, annex_i_section: "B", annex_i_third_party_conformity_assessment: true });
    expect(ids(r)).toContain("annex-i-section-b-limited-scope");
    expect(ids(r)).not.toContain("risk-management-system");
  });
});

describe("obligations golden: deployer and GPAI", () => {
  it("public body using a creditworthiness system must do a FRIA", () => {
    const r = run({ role: ["deployer"], uses_or_provides_ai_system: true, annex_iii_area: "5", annex_iii_point5_bc: true, annex_iii_art6_3_exception_concluded: false, deployer_public_body_or_public_service: true });
    expect(ids(r)).toContain("fundamental-rights-impact-assessment");
    expect(ids(r)).not.toContain("risk-management-system");
  });
  it("open-source GPAI without systemic risk gets the exemption", () => {
    const r = run({ role: ["provider"], uses_or_provides_ai_system: true, gpai_model: true, open_source_model: true });
    expect(ids(r)).toContain("gpai-open-source-exemption");
    expect(ids(r)).not.toContain("gpai-technical-documentation");
  });
  it("systemic-risk threshold met: Article 55 duties already apply, open-source exemption does not", () => {
    const r = run({ role: ["provider"], uses_or_provides_ai_system: true, gpai_model: true, open_source_model: true, gpai_systemic_risk_threshold_met: true });
    const o = get(r, "gpai-sr-model-evaluation");
    expect(o.applies_from).toBe("2025-08-02");
    expect(o.status).toBe("applicable");
    expect(ids(r)).not.toContain("gpai-open-source-exemption");
    expect(ids(r)).toContain("gpai-technical-documentation");
  });
});

describe("obligations golden: legacy systems and input checks", () => {
  it("an Annex III system placed on the market before the route date without significant changes is out of Chapter III", () => {
    const r = run({ ...ANNEX_III_PROVIDER, placed_on_market_before: "2026-01-01", significant_design_change_since_application: false });
    expect(ids(r)).not.toContain("risk-management-system");
  });
  it("rejects unknown profile fields and names the allowed ones", () => {
    expect(() => run({ role: ["provider"], is_high_risk: true })).toThrow(/is_high_risk/);
  });
  it("rejects reference dates before the consolidated text", () => {
    expect(() => run(ANNEX_III_PROVIDER, "2026-03-15")).toThrow(/2026-07-27/);
  });
  it("describes the profile fields", () => {
    const d = describeProfile() as Record<string, unknown>;
    expect(Object.keys(d)).toContain("annex_iii_area");
    expect(Object.keys(d)).toContain("role");
  });
});
