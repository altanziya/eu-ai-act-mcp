/**
 * Golden tests for search, the document checker, reference formatting and as_of-aware provisions. The expected
 * values were written before the implementation and do not follow it.
 * Fixed API:
 *   src/tools/getProvision.ts  getProvision({ id, as_of?, version?, lang? }) -> version follows as_of; applicability
 *   src/tools/search.ts        aiactSearch({ query, as_of?, lang?, limit? })
 *   src/tools/formatRef.ts     formatRef(id, lang)
 *   src/tools/audit.ts         auditText({ text, as_of, lang? })
 */
import { describe, expect, it } from "vitest";
import { getProvision } from "../../src/tools/getProvision.js";
import { aiactSearch } from "../../src/tools/search.js";
import { formatRef } from "../../src/tools/formatRef.js";
import { parseRef } from "../../src/tools/refParser.js";
import { auditText } from "../../src/tools/audit.js";

const V24 = "32024R1689";
const V26 = "02024R1689-20260727";

describe("search and audit golden: version follows the reference date", () => {
  it("before 27 July 2026 the Official Journal text, after it the consolidated text", () => {
    expect(getProvision({ id: "art_6.par_2", as_of: "2026-03-15" }).version).toBe(V24);
    expect(getProvision({ id: "art_6.par_2", as_of: "2026-10-05" }).version).toBe(V26);
  });
  it("reports applicability for the node on as_of", () => {
    const r = getProvision({ id: "art_6.par_2", as_of: "2026-10-05" }) as unknown as { applicability: { state: string; until?: string } };
    expect(r.applicability.state).toBe("not_yet_applicable_until");
    expect(r.applicability.until).toBe("2027-12-02");
  });
  it("an explicit version still wins", () => {
    expect(getProvision({ id: "art_6.par_2", as_of: "2026-10-05", version: V24 }).version).toBe(V24);
  });
});

describe("search and audit golden: citations", () => {
  it("formats ids as citations and round-trips through parseRef", () => {
    expect(formatRef("art_9.par_2", "en")).toBe("Article 9(2)");
    for (const id of ["art_9.par_2", "art_5.par_1.a", "art_113.sub_3.c.i", "anx_3.pt_4", "art_4a.par_1"]) {
      expect(parseRef(formatRef(id, "en"))).toBe(id);
    }
  });
});

describe("search and audit golden: search by reference date", () => {
  const q = "bias detection and correction special categories of personal data";
  it("finds the new Article 4a after the amendment", () => {
    const r = aiactSearch({ query: q, as_of: "2026-10-05" });
    expect(r.version).toBe(V26);
    expect(r.results.slice(0, 3).some((x) => x.id.startsWith("art_4a"))).toBe(true);
  });
  it("finds Article 10(5) before the amendment", () => {
    const r = aiactSearch({ query: q, as_of: "2026-03-15" });
    expect(r.version).toBe(V24);
    expect(r.results.slice(0, 3).some((x) => x.id.startsWith("art_10.par_5"))).toBe(true);
  });
  it("respects limit and returns citations and snippets", () => {
    const r = aiactSearch({ query: "AI regulatory sandbox", as_of: "2026-10-05", limit: 5 });
    expect(r.results.length).toBeLessThanOrEqual(5);
    for (const x of r.results) {
      expect(x.citation.length).toBeGreaterThan(0);
      expect(x.snippet.length).toBeLessThanOrEqual(240);
    }
  });
});

describe("search and audit golden: document audit", () => {
  const kinds = (r: ReturnType<typeof auditText>) => r.findings.map((f) => f.kind);
  it("flags the pre-amendment Annex III date", () => {
    const r = auditText({ text: "Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from 2 August 2026.", as_of: "2026-10-05" });
    const f = r.findings.find((x) => x.kind === "outdated_deadline");
    expect(f?.severity).toBe("error");
    expect(f?.expected).toBe("2027-12-02");
    expect(f?.found).toBe("2026-08-02");
  });
  it("accepts the current date, and the old date before the amendment", () => {
    const now = auditText({ text: "Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from 2 December 2027.", as_of: "2026-10-05" });
    expect(kinds(now)).toContain("deadline_ok");
    expect(now.summary.error).toBe(0);
    const before = auditText({ text: "Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from 2 August 2026.", as_of: "2026-03-15" });
    expect(before.summary.error).toBe(0);
  });
  it("compares deadlines written in the provision itself", () => {
    const r = auditText({ text: "Under Article 57(1), each Member State must have a regulatory sandbox operational by 2 August 2026.", as_of: "2026-10-05" });
    const f = r.findings.find((x) => x.kind === "outdated_deadline");
    expect(f?.expected).toBe("2027-08-02");
  });
  it("flags a deleted provision and points to where it moved", () => {
    const r = auditText({ text: "Article 10(5) allows providers to process special categories of personal data.", as_of: "2026-10-05" });
    const f = r.findings.find((x) => x.kind === "removed_provision");
    expect(f?.severity).toBe("error");
    expect(f?.suggestion ?? "").toMatch(/4a/);
  });
  it("checks quotations against the wording in force", () => {
    const text =
      'Article 57(1) reads: "Member States shall ensure that their competent authorities establish at least one AI regulatory sandbox at national level, which shall be operational by 2 August 2026."';
    expect(kinds(auditText({ text, as_of: "2026-10-05" }))).toContain("outdated_quote");
    expect(kinds(auditText({ text, as_of: "2026-03-15" }))).toContain("quote_ok");
  });
  it("flags provisions that do not exist", () => {
    expect(kinds(auditText({ text: "See Article 999(3) of the AI Act.", as_of: "2026-10-05" }))).toContain("unknown_provision");
  });
  it("spans point into the text and the summary counts the findings", () => {
    const text = "Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from 2 August 2026. See Article 999.";
    const r = auditText({ text, as_of: "2026-10-05" });
    for (const f of r.findings) {
      expect(f.span.start).toBeGreaterThanOrEqual(0);
      expect(f.span.end).toBeLessThanOrEqual(text.length);
      expect(text.slice(f.span.start, f.span.end).length).toBeGreaterThan(0);
    }
    expect(r.summary.error).toBe(r.findings.filter((f) => f.severity === "error").length);
    expect(r.version_checked).toBe(V26);
  });
  it("works in German", () => {
    const r = auditText({ text: "Nach Artikel 6 Absatz 2 und Anhang III gelten die Pflichten für Hochrisiko-KI-Systeme ab dem 2. August 2026.", as_of: "2026-10-05", lang: "de" });
    expect(r.findings.some((x) => x.kind === "outdated_deadline" && x.expected === "2027-12-02")).toBe(true);
  });
});
