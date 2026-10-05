import { describe, expect, it } from "vitest";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import { aiactObligations, describeProfile } from "../../src/tools/obligations.js";
import { loadObligations } from "../../src/tools/obligations-fs.js";
import type { ObligationsResult } from "../../src/tools/obligations.js";
import { csvCell, decodeShare, encodeShare, groupObligations, headline, obligationsCsv, obligationsMarkdown, timelineStops } from "../../src/web/obligationsView.js";
import { ANNEX_III_AREAS, ENUM_LABELS, FIELD_LABELS, ROLE_LABELS } from "../../src/web/profileLabels.js";
import { buildProfile, EXAMPLE_PROFILES, isFieldShown, sanitizeState, SECTIONS, unplacedFields } from "../../src/web/profileForm.js";

const AS_OF = "2026-10-05";
const run = (id: string, asOf = AS_OF): { result: ObligationsResult; profile: Record<string, unknown> } => {
  const ex = EXAMPLE_PROFILES.find((e) => e.id === id)!;
  const profile = buildProfile(ex.state);
  return { result: aiactObligations({ profile: profile as never, as_of: asOf }), profile };
};

describe("labels and form model", () => {
  const fields = describeProfile();
  it("has a question label for every profile field and every field is placed in a section", () => {
    expect(Object.keys(FIELD_LABELS).sort()).toEqual(Object.keys(fields).sort());
    expect(unplacedFields(fields)).toEqual([]);
    for (const s of SECTIONS) for (const f of s.fields) expect(fields, f).toHaveProperty(f);
  });
  it("every question names its provision in brackets (except the role question)", () => {
    for (const [f, l] of Object.entries(FIELD_LABELS)) {
      if (f === "role") continue;
      expect(l.q.en, f).toMatch(/\((?:Article|Annex) .*\)$/);
      expect(l.q.de, f).toMatch(/\((?:Artikel|Anhang) .*\)$/);
    }
  });
  it("labels exist for every role and every enum value, with no raw identifiers", () => {
    for (const r of fields["role"]!.values!) expect(ROLE_LABELS, r).toHaveProperty(r);
    for (const [f, d] of Object.entries(fields)) {
      if (d.type !== "enum" || f === "annex_iii_area") continue;
      for (const v of d.values!) expect(ENUM_LABELS[f]?.[v], `${f}=${v}`).toBeDefined();
    }
    for (const l of Object.values(FIELD_LABELS)) expect(l.q.en).not.toMatch(/[a-z]+_[a-z]+/);
  });
  it("the Annex III area headings equal the headings in both corpus languages", () => {
    for (const lang of ["en", "de"] as const) {
      const idx = loadCorpus("02024R1689-20260727", lang);
      for (const n of fields["annex_iii_area"]!.values!) expect(ANNEX_III_AREAS[n]![lang], `${lang} ${n}`).toBe(idx.byId.get(`anx_3.pt_${n}`)!.text.split(":")[0]!.trim());
    }
  });
  it("shows conditional questions only when they are relevant", () => {
    expect(isFieldShown("annex_iii_art6_3_exception_concluded", { role: ["provider"] })).toBe(false);
    expect(isFieldShown("annex_iii_art6_3_exception_concluded", { role: ["provider"], annex_iii_area: "4" })).toBe(true);
    expect(isFieldShown("annex_iii_performs_profiling", { role: ["provider"], annex_iii_area: "4" })).toBe(false);
    expect(isFieldShown("annex_iii_performs_profiling", { role: ["provider"], annex_iii_area: "4", annex_iii_art6_3_exception_concluded: true })).toBe(true);
    expect(isFieldShown("annex_iii_point5_bc", { role: ["provider"], annex_iii_area: "4" })).toBe(false);
    expect(isFieldShown("annex_iii_point5_bc", { role: ["provider"], annex_iii_area: "5" })).toBe(true);
    expect(isFieldShown("open_source_model", { role: ["provider"] })).toBe(false);
    expect(isFieldShown("open_source_model", { role: ["provider"], gpai_model: true })).toBe(true);
    expect(isFieldShown("gpai_model", { role: ["deployer"] })).toBe(false);
    expect(isFieldShown("deployer_controls_input_data", { role: ["provider"] })).toBe(false);
    expect(isFieldShown("deployer_controls_input_data", { role: ["provider", "deployer"] })).toBe(true);
    expect(isFieldShown("annex_i_third_party_conformity_assessment", { role: ["provider"], annex_i_section: "A" })).toBe(true);
    expect(isFieldShown("annex_i_third_party_conformity_assessment", { role: ["provider"] })).toBe(false);
  });
  it("buildProfile leaves out hidden and unanswered questions", () => {
    const p = buildProfile({ role: ["provider"], annex_iii_area: "4", annex_iii_performs_profiling: true, gpai_model: false, open_source_model: true, deployer_controls_input_data: true, enterprise_size: "" });
    expect(p).toEqual({ role: ["provider"], annex_iii_area: "4", gpai_model: false });
    expect(() => aiactObligations({ profile: p as never, as_of: AS_OF })).not.toThrow();
  });
});

describe("example profiles", () => {
  it("every example gives obligations, and the classification differs as expected", () => {
    for (const ex of EXAMPLE_PROFILES) {
      const { result } = run(ex.id);
      expect(result.obligations.length, ex.id).toBeGreaterThan(5);
    }
    expect(run("hr-vendor").result.derived).toContain("high_risk_annex_iii");
    expect(run("bank").result.derived).toEqual(expect.arrayContaining(["high_risk_annex_iii", "fria_required"]));
    expect(run("oss-llm").result.derived).toContain("gpai_open_source_exemption_applies");
    expect(run("medical-device").result.derived).toContain("high_risk_annex_i");
  });
  it("the headline names the route and the Chapter III date with the days left (EN, DE)", () => {
    const { result, profile } = run("hr-vendor");
    expect(headline(result, profile, "en")).toBe("High-risk under Article 6(2) and Annex III point 4. Chapter III applies from 2 December 2027 (in 423 days).");
    expect(headline(result, profile, "de")).toBe("Hochrisiko nach Artikel 6 Absatz 2 und Anhang III Nummer 4. Kapitel III gilt ab dem 2. Dezember 2027 (in 423 Tagen).");
    const med = run("medical-device");
    expect(headline(med.result, med.profile, "en")).toMatch(/^High-risk under Article 6\(1\) and Annex I\. Chapter III applies from 2 August 2028/);
    const llm = run("oss-llm");
    expect(headline(llm.result, llm.profile, "en")).toMatch(/not high-risk.*general-purpose AI model/);
    const out = aiactObligations({ profile: { role: ["provider"], uses_or_provides_ai_system: false }, as_of: AS_OF });
    expect(headline(out, { uses_or_provides_ai_system: false }, "en")).toMatch(/^Out of scope/);
  });
  it("groups by status and builds the timeline from today", () => {
    const { result } = run("hr-vendor");
    const g = groupObligations(result);
    expect(g.applicable.length + g.upcoming.length + g.depends.length).toBe(result.obligations.length);
    const stops = timelineStops(result);
    expect(stops[0]).toMatchObject({ today: true, date: AS_OF, days: 0 });
    expect(stops[0]!.obligations.every((o) => o.status === "applicable")).toBe(true);
    expect(stops[1]).toMatchObject({ date: "2027-12-02", days: 423 });
    expect(stops[1]!.obligations.length).toBe(result.timeline[0]!.ids.length);
  });
});

describe("sanitizeState (shared links come from outside)", () => {
  const fields = describeProfile();
  it("keeps valid answers and drops unknown fields, wrong types and values outside the allowed set", () => {
    const clean = sanitizeState(
      { role: ["provider", "wizard", 7], annex_iii_area: "4", gpai_model: "yes", enterprise_size: "huge", placed_on_market_before: "2026-02-30", annex_i_section: "A", open_source_model: true, __proto__x: 1, evil: "<script>" },
      fields,
    );
    expect(clean).toEqual({ role: ["provider"], annex_iii_area: "4", annex_i_section: "A", open_source_model: true });
    expect(sanitizeState({ role: [] }, fields)).toEqual({});
    for (const ex of EXAMPLE_PROFILES) expect(sanitizeState(ex.state, fields)).toEqual(ex.state);
  });
});

describe("exports", () => {
  const { result, profile } = run("hr-vendor");
  const ctx = { result, profile, lang: "en" as const, releaseId: "aiact-corpus-2026-10-05", manifestSha256: "cd".repeat(32) };
  it("Markdown checklist has a checkbox per obligation with provision, date and quotation", () => {
    const md = obligationsMarkdown(ctx);
    expect(md.match(/^- \[ \] /gm)?.length).toBe(result.obligations.length);
    expect(md).toContain("## Applies now");
    expect(md).toContain("## Upcoming");
    expect(md).toContain("applies from 2 December 2027 (in 423 days)");
    expect(md).toContain(ctx.releaseId);
    expect(md).toContain("Not legal advice");
    const first = result.obligations[0]!;
    expect(md).toContain(`> ${first.quote.replace(/\s+/g, " ").trim()}`);
    expect(obligationsMarkdown({ ...ctx, lang: "de" })).toContain("## Gilt jetzt");
  });
  it("CSV has a header and a row per obligation, quotes are doubled and formulas defused", () => {
    const csv = obligationsCsv(ctx);
    expect(csv.startsWith("﻿\"Status\",\"Title\"")).toBe(true);
    expect(csv.trimEnd().split("\r\n").length).toBe(result.obligations.length + 1);
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("\"'=HYPERLINK(1)\"");
    expect(csvCell("-1+2")).toBe("\"'-1+2\"");
    expect(csvCell("plain")).toBe('"plain"');
  });
});

describe("share link", () => {
  it("round-trips the answers and the date", () => {
    const state = { role: ["provider", "deployer"], annex_iii_area: "4", annex_iii_art6_3_exception_concluded: false, placed_on_market_before: "2025-03-01" };
    const frag = encodeShare({ state, asOf: AS_OF });
    expect(frag).toMatch(/^#p=[A-Za-z0-9_-]+$/);
    expect(decodeShare(frag)).toEqual({ state, asOf: AS_OF });
    for (const ex of EXAMPLE_PROFILES) expect(decodeShare(encodeShare({ state: ex.state, asOf: AS_OF }))?.state).toEqual(ex.state);
  });
  it("carries non-ASCII values and rejects anything that is not a share fragment", () => {
    expect(decodeShare(encodeShare({ state: { note: "Größe €" }, asOf: AS_OF }))?.state).toEqual({ note: "Größe €" });
    for (const bad of ["", "#", "#p=", "#p=***", "#q=abc", "#p=bm90IGpzb24", `#p=${btoa("[]")}`, `#p=${btoa('{"v":2,"profile":{},"as_of":"2026-10-05"}')}`, `#p=${btoa('{"v":1,"profile":{},"as_of":"soon"}')}`, `#p=${btoa('{"v":1,"profile":[],"as_of":"2026-10-05"}')}`]) {
      expect(decodeShare(bad), bad).toBeNull();
    }
  });
});

describe("data", () => {
  it("the loaded obligations data is the source of the headings test", () => {
    expect(loadObligations().schema).toBe("obligations-v1");
  });
});

describe("company size question", () => {
  it("cites Article 3, points 14a and 14b (EN) / Artikel 3 Nummern 14a und 14b (DE)", () => {
    expect(FIELD_LABELS["enterprise_size"]?.q.en).toContain("Article 3, points 14a and 14b");
    expect(FIELD_LABELS["enterprise_size"]?.q.de).toContain("Artikel 3 Nummern 14a und 14b");
  });
});
