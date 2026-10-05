import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corpusPath, V2024, V2026 } from "../../src/config.js";
import type { CorpusFile } from "../../src/parser/types.js";
import type { ProvisionNode } from "../../src/parser/types.js";
import { buildIndex } from "../../src/tools/corpus.js";
import type { CorpusIndex, Lang, Version } from "../../src/tools/corpus.js";
import type { DeadlineTable } from "../../src/tools/deadlines.js";
import { aiactObligations, describeProfile } from "../../src/tools/obligations.js";
import { aiactObligationsWith, describeProfileWith, Evaluator, fieldSpec } from "../../src/tools/obligationsCore.js";
import type { Condition, ObligationEntry, ObligationsData, Timing } from "../../src/tools/obligationsCore.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import { descendants } from "../../src/tools/corpus.js";

// ---- a constructed world: mini corpus, mini deadline table (test-owned dates), mini obligations data ----------------------

let order = 0;
const n = (id: string, parent: string | null, type: ProvisionNode["type"], text: string, heading = ""): ProvisionNode => ({
  id, type, parent, heading, text, hash: "", node_hash: "", order: order++, source_anchor: "",
});
function mini(version: Version, lang: Lang): CorpusIndex {
  order = 0;
  const nodes = [
    n("cpt_1", null, "chapter", "", "General"),
    n("art_1", "cpt_1", "article", "", "Alpha"),
    n("art_1.par_1", "art_1", "paragraph", "Alpha   providers shall\n do the first thing."),
    n("art_1.par_2", "art_1", "paragraph", "Alpha providers shall do the second thing."),
    n("cpt_2", null, "chapter", "", "Special"),
    n("art_2", "cpt_2", "article", "", "Beta"),
    n("art_2.par_1", "art_2", "paragraph", "Beta deployers shall do the beta thing."),
    n("art_3", "cpt_2", "article", "", "Gamma"),
    n("art_3.par_1", "art_3", "paragraph", "Gamma applies to everybody."),
    n("art_3.par_1.a", "art_3.par_1", "point", "including the gamma detail text."),
  ];
  return buildIndex(version, lang, nodes);
}
const BLOCK = {
  default: { id: "default", applies_from: "2026-08-02", source_nodes: [] },
  rules: [
    { id: "early", applies_from: "2025-02-02", scope: ["cpt_1"], source_nodes: [] },
    { id: "special", applies_from: "2026-12-02", scope: ["cpt_2"], source_nodes: [] },
    { id: "art6-par2-annex3", applies_from: "2027-12-02", scope: ["art_6.par_2"], source_nodes: [] },
    { id: "art6-par1-annex1", applies_from: "2028-08-02", scope: ["art_6.par_1"], source_nodes: [] },
  ],
};
const TABLE: DeadlineTable = { versions: { [V2024]: { default: BLOCK.default, rules: [{ id: "all", applies_from: "2026-08-02", scope: ["cpt_1", "cpt_2"], source_nodes: [] }] }, [V2026]: BLOCK } };

const FIELDS: Record<string, string> = {
  role: "array of enum provider|deployer|importer; an actor may hold several roles",
  uses_or_provides_ai_system: "bool, default true; scope gate",
  flag: "bool; a flag",
  other_flag: "bool; another flag",
  area: "null or string '1'..'3'; an area",
  section: "null or enum 'A'|'B'; a section",
  size: "enum sme|smc|other; size",
  placed_on_market_before: "null or ISO date; when placed",
  design_change: "bool; changed",
};
const FIELD_Q = "Whether the intended purpose falls within an area";
const DERIVED: Record<string, Condition> = {
  area_set: { not: { field: "area", eq: null } },
  high_risk_annex_iii: { all: [{ field: "area_set", eq: true }, { not: { field: "flag", eq: true } }] },
  high_risk_annex_i: { all: [{ field: "section", eq: "A" }, { field: "other_flag", eq: true }] },
  hr: { any: [{ field: "high_risk_annex_i", eq: true }, { field: "high_risk_annex_iii", eq: true }] },
  placed_before_chapter_iii_date: { computed: "placed before the route date" },
  legacy: { all: [{ field: "placed_before_chapter_iii_date", eq: true }, { field: "design_change", eq: false }] },
  placed_before_2025: { computed: "date_before", field: "placed_on_market_before", date: "2025-08-02", source_node: "art_111.par_3" },
  in_scope: { all: [{ field: "hr", eq: true }, { not: { field: "legacy", eq: true } }] },
};
const entry = (id: string, over: Partial<ObligationEntry> & { timing: Timing }): ObligationEntry => ({
  id, kind: "obligation", title: id, summary: id, roles: ["provider"], applies_if: { field: "flag", eq: false }, provisions: ["art_1.par_1"], anchor_node: "art_1.par_1",
  quote: "Alpha providers shall do the first thing.", ...over,
});
function data(entries: ObligationEntry[], over: Partial<ObligationsData> = {}): ObligationsData {
  return { schema: "obligations-v1", source_version: V2026, derived: DERIVED, profile_fields: FIELDS, obligations: entries, classification: [], ...over };
}
const AS_OF = "2026-10-05";
const run = (d: ObligationsData, profile: Record<string, unknown>, as_of = AS_OF, lang?: Lang) =>
  aiactObligationsWith({ profile: { role: ["provider"], ...profile }, as_of, ...(lang ? { lang } : {}) }, mini, TABLE, d);
const ids = (r: { obligations: Array<{ id: string }> }) => r.obligations.map((o) => o.id);
const one = (d: ObligationsData, profile: Record<string, unknown> = {}, as_of = AS_OF) => run(d, profile, as_of).obligations[0];

describe("DSL", () => {
  const ev = (values: Record<string, unknown>, derived: Record<string, Condition> = DERIVED) =>
    new Evaluator({ derived, profile_fields: FIELDS }, { role: ["provider"], flag: false, other_flag: false, area: null, section: null, size: null, placed_on_market_before: null, design_change: false, ...values } as never);
  it("evaluates eq, in, all, any and not", () => {
    const e = ev({ area: "2", section: "A" });
    expect(e.test({ field: "area", eq: "2" })).toBe(true);
    expect(e.test({ field: "area", eq: "3" })).toBe(false);
    expect(e.test({ field: "area", in: ["1", "2"] })).toBe(true);
    expect(e.test({ field: "area", in: ["1"] })).toBe(false);
    expect(e.test({ all: [{ field: "area", eq: "2" }, { field: "section", eq: "A" }] })).toBe(true);
    expect(e.test({ all: [{ field: "area", eq: "2" }, { field: "section", eq: "B" }] })).toBe(false);
    expect(e.test({ any: [{ field: "area", eq: "9" }, { field: "section", eq: "A" }] })).toBe(true);
    expect(e.test({ any: [] })).toBe(false);
    expect(e.test({ all: [] })).toBe(true);
    expect(e.test({ not: { field: "section", eq: "B" } })).toBe(true);
    expect(e.test({ field: "flag", eq: false })).toBe(true);
    expect(e.test({ field: "placed_on_market_before", eq: null })).toBe(true);
  });
  it("evaluates derived fields recursively", () => {
    expect(ev({ area: "1" }).field("hr")).toBe(true);
    expect(ev({ area: "1", flag: true }).field("hr")).toBe(false);
    expect(ev({ section: "A", other_flag: true }).field("hr")).toBe(true);
    expect(ev({}).field("hr")).toBe(false);
  });
  it("rejects a cycle among derived fields", () => {
    const cyc: Record<string, Condition> = { a: { field: "b", eq: true }, b: { field: "a", eq: true } };
    expect(() => ev({}, cyc).field("a")).toThrow(/cycle among derived fields: a -> b -> a/);
    expect(() => ev({}, { a: { field: "a", eq: true } }).field("a")).toThrow(/cycle/);
  });
  it("rejects unknown fields, unsupported forms and computed rules inside conditions", () => {
    expect(() => ev({}).test({ field: "nope", eq: true })).toThrow(/unknown field "nope"/);
    expect(() => ev({}).test({ lt: 3 })).toThrow(/unsupported condition/);
    expect(() => ev({}).test({ computed: "x" })).toThrow(/computed/);
    expect(() => ev({}).test({ field: "area", in: "1" })).toThrow(/array/);
  });
});

describe("profile", () => {
  const d = data([entry("e", { timing: { basis: "deadline_table", literal_rule: "early" } })]);
  it("requires role as a non-empty array of the enum values", () => {
    const go = (role: unknown) => aiactObligationsWith({ profile: role === undefined ? {} : { role }, as_of: AS_OF }, mini, TABLE, d);
    expect(() => go(undefined)).toThrow(/role/);
    expect(() => go([])).toThrow(/non-empty array of provider\|deployer\|importer/);
    expect(() => go("provider")).toThrow(/role/);
    expect(() => go(["wizard"])).toThrow(/role/);
    expect(go(["provider", "provider"]).profile_echo?.["role"]).toEqual(["provider"]);
  });
  it("names the allowed fields for an unknown field", () => {
    expect(() => run(d, { is_high_risk: true })).toThrow(/unknown profile field: is_high_risk; allowed fields: role, uses_or_provides_ai_system, flag, other_flag/);
  });
  it("fills missing booleans with false and other fields with null; validates types", () => {
    const echo = run(d, {}).profile_echo;
    expect(echo).toMatchObject({ flag: false, area: null, section: null, size: null, placed_on_market_before: null, uses_or_provides_ai_system: true });
    expect(() => run(d, { area: 2 })).toThrow(/area must be null or one of "1"\|"2"\|"3": a string, not a number \(use "2"\)/);
    expect(() => run(d, { flag: "yes" })).toThrow(/flag must be true or false/);
    expect(() => run(d, { area: "9" })).toThrow(/area must be null or one of 1\|2\|3/);
    expect(() => run(d, { section: "C" })).toThrow(/section/);
    expect(() => run(d, { placed_on_market_before: "2026-13-40" })).toThrow(/not a valid calendar date/);
    expect(() => run(d, { placed_on_market_before: "2026-09-31" })).toThrow(/not a valid calendar date/);
    expect(() => run(d, { placed_on_market_before: "5 May 2026" })).toThrow(/ISO date/);
    expect(run(d, { placed_on_market_before: "2028-02-29" }).profile_echo?.["placed_on_market_before"]).toBe("2028-02-29");
    expect(() => run(d, { size: "huge" })).toThrow(/sme\|smc\|other/);
    expect(() => aiactObligationsWith({ profile: null as never, as_of: AS_OF }, mini, TABLE, d)).toThrow(/profile must be an object/);
  });
  it("reads field types from the descriptions", () => {
    expect(fieldSpec("bool; x")).toEqual({ type: "boolean" });
    expect(fieldSpec("bool, default true; x")).toEqual({ type: "boolean", default: true });
    expect(fieldSpec("null or string '1'..'3'; x")).toEqual({ type: "enum", values: ["1", "2", "3"] });
    expect(fieldSpec("null or enum 'A'|'B'; x")).toEqual({ type: "enum", values: ["A", "B"] });
    expect(fieldSpec("null or ISO date; x")).toEqual({ type: "date" });
    expect(fieldSpec("something else")).toEqual({ type: "any" });
    expect(describeProfileWith(d)["role"]).toMatchObject({ type: "enum_array", required: true, values: ["provider", "deployer", "importer"] });
  });
  it("describes every profile field of the real data", () => {
    const real = describeProfile();
    expect(Object.keys(real).sort()).toEqual(Object.keys(JSON.parse(readFileSync("data/obligations.json", "utf8")).profile_fields).sort());
    expect(real["annex_iii_area"]).toMatchObject({ type: "enum", values: ["1", "2", "3", "4", "5", "6", "7", "8"] });
    expect(real["enterprise_size"]).toMatchObject({ type: "enum", values: ["sme", "smc", "other"] });
    expect(real["placed_on_market_before"]?.type).toBe("date");
    for (const [k, f] of Object.entries(real)) expect(f.type === "any" ? k : "typed").toBe("typed");
  });
});

describe("as_of and input checks", () => {
  const d = data([entry("e", { timing: { basis: "deadline_table", literal_rule: "early" } })]);
  it("rejects dates before the consolidated text and malformed dates", () => {
    expect(() => run(d, {}, "2026-07-26")).toThrow(/obligations map covers the consolidated text in force from 2026-07-27; use get_provision\/verify_citation for earlier dates/);
    expect(run(d, {}, "2026-07-27").version).toBe(V2026);
    expect(() => run(d, {}, "yesterday")).toThrow(/as_of/);
    expect(() => run(d, {}, "2026-13-40")).toThrow(/not a valid calendar date/);
    expect(() => run(d, {}, "2026-02-30")).toThrow(/not a valid calendar date/);
    expect(() => run(d, {}, "2026-09-31")).toThrow(/not a valid calendar date/);
  });
  it("rejects an unknown language and unsupported data", () => {
    expect(() => run(d, {}, AS_OF, "fr" as Lang)).toThrow(/lang/);
    expect(() => run(data([], { schema: "v0" }), {})).toThrow(/schema/);
    expect(() => run(data([], { source_version: V2024 }), {})).toThrow(/obligations data is for/);
  });
  it("uses today when as_of is left out", () => {
    const r = aiactObligations({ profile: { role: ["provider"], uses_or_provides_ai_system: true } });
    expect(r.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("roles and conditions", () => {
  const d = data([
    entry("p", { roles: ["provider"], timing: { basis: "deadline_table", literal_rule: "early" } }),
    entry("dep", { roles: ["deployer"], timing: { basis: "deadline_table", literal_rule: "early" } }),
    entry("any", { roles: ["any"], timing: { basis: "deadline_table", literal_rule: "early" } }),
    entry("cond", { roles: ["provider"], applies_if: { field: "hr", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } }),
  ]);
  it("filters by role overlap, 'any' and applies_if", () => {
    expect(ids(run(d, {}))).toEqual(["any", "p"]);
    expect(ids(aiactObligationsWith({ profile: { role: ["deployer"] }, as_of: AS_OF }, mini, TABLE, d))).toEqual(["any", "dep"]);
    expect(ids(aiactObligationsWith({ profile: { role: ["provider", "deployer"] }, as_of: AS_OF }, mini, TABLE, d))).toEqual(["any", "dep", "p"]);
    expect(ids(aiactObligationsWith({ profile: { role: ["importer"] }, as_of: AS_OF }, mini, TABLE, d))).toEqual(["any"]);
    expect(ids(run(d, { area: "1" }))).toEqual(["any", "cond", "p"]);
  });
  it("lists the true derived fields sorted", () => {
    expect(run(d, { area: "1" }).derived).toEqual(["area_set", "high_risk_annex_iii", "hr", "in_scope"]);
    expect(run(d, {}).derived).toEqual([]);
  });
});

describe("timing", () => {
  const T = (t: Timing, over: Partial<ObligationEntry> = {}) => data([entry("e", { timing: t, ...over })]);
  it("deadline_table: the rule, else literal_rule, else matchRule on the anchor, else default", () => {
    expect(one(T({ basis: "deadline_table", rule: "special", literal_rule: "special" }))?.applies_from).toBe("2026-12-02");
    expect(one(T({ basis: "deadline_table", literal_rule: "early" }))?.applies_from).toBe("2025-02-02");
    expect(one(T({ basis: "deadline_table" }, { anchor_node: "art_1.par_1" }))?.applies_from).toBe("2025-02-02");
    expect(one(T({ basis: "deadline_table" }, { anchor_node: "art_2.par_1", quote: "Beta deployers shall do the beta thing." }))?.applies_from).toBe("2026-12-02");
    expect(one(T({ basis: "deadline_table", literal_rule: "default" }))?.applies_from).toBe("2026-08-02");
    expect(() => one(T({ basis: "deadline_table", literal_rule: "ghost" }))).toThrow(/ghost/);
  });
  it("deadline_table: a rule that differs from the literal rule shows applies_from_literal and the caveat", () => {
    const o = one(T({ basis: "deadline_table", rule: "special", literal_rule: "early", deadline_caveat: "Art. 113 reads differently" }));
    expect(o).toMatchObject({ applies_from: "2026-12-02", applies_from_literal: "2025-02-02", deadline_caveat: "Art. 113 reads differently" });
    expect(one(T({ basis: "deadline_table", literal_rule: "early" }))).not.toHaveProperty("applies_from_literal");
  });
  it("deadline_table: not_before is a lower bound (max)", () => {
    expect(one(T({ basis: "deadline_table", literal_rule: "early", not_before: "2026-07-27" }))?.applies_from).toBe("2026-07-27");
    expect(one(T({ basis: "deadline_table", literal_rule: "special", not_before: "2026-07-27" }))?.applies_from).toBe("2026-12-02");
  });
  it("hr_route: Annex III route, Annex I route, both routes, no route", () => {
    const t: Timing = { basis: "hr_route", literal_rule: "early", deadline_caveat: "caveat text" };
    const d = data([entry("e", { applies_if: { field: "role", in: [] } as never, timing: t })]);
    d.obligations[0]!.applies_if = { all: [] };
    const iii = one(d, { area: "1" });
    expect(iii).toMatchObject({ applies_from: "2027-12-02", applies_from_literal: "2025-02-02", deadline_caveat: "caveat text" });
    expect(iii).not.toHaveProperty("route_dates");
    expect(one(d, { section: "A", other_flag: true })).toMatchObject({ applies_from: "2028-08-02", applies_from_literal: "2025-02-02" });
    const both = one(d, { area: "1", section: "A", other_flag: true });
    expect(both).toMatchObject({ applies_from: "2027-12-02", route_dates: ["2027-12-02", "2028-08-02"] });
    const none = one(d, {});
    expect(none).toMatchObject({ applies_from: "2025-02-02", deadline_caveat: "caveat text" });
    expect(none).not.toHaveProperty("applies_from_literal");
    const same = data([entry("e", { applies_if: { all: [] }, timing: { basis: "hr_route", literal_rule: "art6-par2-annex3" } })]);
    expect(one(same, { area: "1" })).not.toHaveProperty("applies_from_literal");
  });
  it("hr_route: no applies_from_literal when the literal rule is the simplified Chapter III rule ch3s1-3", () => {
    const table: DeadlineTable = { versions: { ...TABLE.versions, [V2026]: { ...BLOCK, rules: [...BLOCK.rules, { id: "ch3s1-3", applies_from: "2027-12-02", scope: ["cpt_1"], source_nodes: [] }] } } };
    const d = data([entry("e", { applies_if: { all: [] }, timing: { basis: "hr_route", literal_rule: "ch3s1-3" } })]);
    const go = (p: Record<string, unknown>) => aiactObligationsWith({ profile: { role: ["provider"], ...p }, as_of: AS_OF }, mini, table, d).obligations[0];
    expect(go({ section: "A", other_flag: true })).toMatchObject({ applies_from: "2028-08-02" });
    expect(go({ section: "A", other_flag: true })).not.toHaveProperty("applies_from_literal");
    expect(go({ area: "1" })).not.toHaveProperty("applies_from_literal");
  });
  it("never reports conditional_dates, whatever the table says about later dates of the anchor", () => {
    const table: DeadlineTable = { versions: { ...TABLE.versions, [V2026]: { ...BLOCK, rules: [...BLOCK.rules, { id: "later", applies_from: "2026-12-02", scope: ["art_2"], source_nodes: [], later_dates: [{ applies_from: "2028-08-02", condition: "Annex I systems", source_node: "x" }] }] } } };
    const base = { applies_if: { all: [] }, anchor_node: "art_2.par_1", quote: "Beta deployers shall do the beta thing." };
    for (const t of [{ basis: "hr_route", literal_rule: "later" }, { basis: "deadline_table", literal_rule: "later" }] as Timing[]) {
      const o = aiactObligationsWith({ profile: { role: ["provider"], area: "1" }, as_of: AS_OF }, mini, table, data([entry("e", { ...base, timing: t })])).obligations[0];
      expect(o).not.toHaveProperty("conditional_dates");
    }
  });
  it("hr_route: timing.route pins the entry to one route even when both routes apply", () => {
    const go = (route: "annex_i" | "annex_iii" | undefined, p: Record<string, unknown>) =>
      one(data([entry("e", { applies_if: { all: [] }, timing: { basis: "hr_route", literal_rule: "early", ...(route ? { route } : {}) } })]), p);
    const both = { area: "1", section: "A", other_flag: true };
    expect(go("annex_i", both)).toMatchObject({ applies_from: "2028-08-02" });
    expect(go("annex_i", both)).not.toHaveProperty("route_dates");
    expect(go("annex_iii", both)).toMatchObject({ applies_from: "2027-12-02" });
    expect(go(undefined, both)).toMatchObject({ applies_from: "2027-12-02", route_dates: ["2027-12-02", "2028-08-02"] });
    // the pinned route is not true: the literal date
    expect(go("annex_i", { area: "1" })).toMatchObject({ applies_from: "2025-02-02" });
  });
  it("hr_route: not_before is a lower bound for applies_from and applies_from_literal", () => {
    const d = (nb: string) => data([entry("e", { applies_if: { all: [] }, timing: { basis: "hr_route", literal_rule: "early", not_before: nb, deadline_caveat: "c" } })]);
    expect(one(d("2026-07-27"), { area: "1" })).toMatchObject({ applies_from: "2027-12-02", applies_from_literal: "2026-07-27" });
    expect(one(d("2026-07-27"), {})).toMatchObject({ applies_from: "2026-07-27" });
    expect(one(d("2028-01-01"), { area: "1" })).toMatchObject({ applies_from: "2028-01-01" });
    expect(one(d("2028-01-01"), { area: "1" })).not.toHaveProperty("applies_from_literal");
  });
  it("computed date_before: generic, the date comes from the data", () => {
    const d = data([entry("e", { applies_if: { field: "placed_before_2025", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } })]);
    const has = (p: Record<string, unknown>) => ids(run(d, p)).includes("e");
    expect(has({ placed_on_market_before: "2025-08-01" })).toBe(true);
    expect(has({ placed_on_market_before: "2025-08-02" })).toBe(false);
    expect(has({})).toBe(false);
    const other = data(d.obligations, { derived: { ...DERIVED, placed_before_2025: { computed: "date_before", field: "placed_on_market_before", date: "2030-01-01", source_node: "x" } } });
    expect(ids(run(other, { placed_on_market_before: "2029-12-31" }))).toContain("e");
    const bad = data(d.obligations, { derived: { ...DERIVED, placed_before_2025: { computed: "date_before", field: "placed_on_market_before", date: "soon", source_node: "x" } } });
    expect(() => run(bad, {})).toThrow(/invalid date_before rule/);
  });
  it("the has operator tests membership in an array field", () => {
    const d = data([entry("e", { roles: ["any"], applies_if: { field: "role", has: "deployer" }, timing: { basis: "deadline_table", literal_rule: "early" } })]);
    expect(ids(aiactObligationsWith({ profile: { role: ["provider", "deployer"] }, as_of: AS_OF }, mini, TABLE, d))).toEqual(["e"]);
    expect(ids(run(d, {}))).toEqual([]);
    expect(() => run(data([entry("x", { applies_if: { field: "flag", has: "a" }, timing: { basis: "deadline_table", literal_rule: "early" } })]), {})).toThrow(/array field/);
  });
  it("scope: a missing scope flag counts as true, an explicit false lists nothing and says so", () => {
    const d = data([entry("e", { applies_if: { all: [] }, timing: { basis: "deadline_table", literal_rule: "early" } })]);
    expect(ids(run(d, {}))).toEqual(["e"]);
    expect(ids(run(d, { uses_or_provides_ai_system: true }))).toEqual(["e"]);
    const out = run(d, { uses_or_provides_ai_system: false, area: "1" });
    expect(out.obligations).toEqual([]);
    expect(out.timeline).toEqual([]);
    expect(out.open_questions).toEqual([]);
    expect(out.notice).toMatch(/profile states the organisation is out of scope/);
    expect(run(d, {}).notice).not.toMatch(/out of scope/);
  });
  it("hr_route: the Annex III exception removes the route", () => {
    const d = data([entry("e", { applies_if: { all: [] }, timing: { basis: "hr_route", literal_rule: "early" } })]);
    expect(one(d, { area: "1", flag: true })?.applies_from).toBe("2025-02-02");
  });
  it("transition: a fixed date, or null with status depends", () => {
    expect(one(T({ basis: "transition", date: "2030-08-02", source_node: "art_111.par_2" }))).toMatchObject({ applies_from: "2030-08-02", status: "upcoming" });
    const dep = one(T({ basis: "transition", date: null, source_node: "art_111.par_2" }));
    expect(dep).toMatchObject({ applies_from: null, status: "depends", days_until: null });
  });
  it("computed placed_before_chapter_iii_date: before the route date, per route, never without a route or date", () => {
    const d = data([entry("legacy", { applies_if: { field: "legacy", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } })]);
    const hasLegacy = (p: Record<string, unknown>) => ids(run(d, p)).includes("legacy");
    expect(hasLegacy({ area: "1", placed_on_market_before: "2027-12-01" })).toBe(true);
    expect(hasLegacy({ area: "1", placed_on_market_before: "2027-12-02" })).toBe(false);
    expect(hasLegacy({ area: "1", placed_on_market_before: "2027-12-01", design_change: true })).toBe(false);
    expect(hasLegacy({ section: "A", other_flag: true, placed_on_market_before: "2028-08-01" })).toBe(true);
    expect(hasLegacy({ section: "A", other_flag: true, placed_on_market_before: "2028-08-02" })).toBe(false);
    // both routes: the earlier date counts
    expect(hasLegacy({ area: "1", section: "A", other_flag: true, placed_on_market_before: "2028-01-01" })).toBe(false);
    expect(hasLegacy({ area: "1", section: "A", other_flag: true, placed_on_market_before: "2027-01-01" })).toBe(true);
    expect(hasLegacy({ placed_on_market_before: "2020-01-01" })).toBe(false);
    expect(hasLegacy({ area: "1" })).toBe(false);
    const inScope = data([entry("in", { applies_if: { field: "in_scope", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } })]);
    expect(ids(run(inScope, { area: "1", placed_on_market_before: "2020-01-01" }))).toEqual([]);
    expect(ids(run(inScope, { area: "1", placed_on_market_before: "2020-01-01", design_change: true }))).toEqual(["in"]);
  });
  it("an unknown computed rule or timing basis is a data error", () => {
    const bad = data([entry("e", { applies_if: { field: "x", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } })], { derived: { x: { computed: "?" } } });
    expect(() => run(bad, {})).toThrow(/computed rule x/);
    expect(() => one(T({ basis: "sometime" as never }))).toThrow(/timing basis/);
  });
});

describe("status, days, ordering, timeline", () => {
  const d = data([
    entry("c-upcoming-late", { timing: { basis: "deadline_table", literal_rule: "special" }, applies_if: { all: [] } }),
    entry("b-applicable", { timing: { basis: "deadline_table", literal_rule: "early" }, applies_if: { all: [] } }),
    entry("a-depends", { timing: { basis: "transition", date: null, source_node: "art_111.par_2" }, applies_if: { all: [] } }),
    entry("d-today", { timing: { basis: "transition", date: AS_OF, source_node: "art_111.par_2" }, applies_if: { all: [] } }),
    entry("e-upcoming-tied-b", { timing: { basis: "deadline_table", literal_rule: "special" }, applies_if: { all: [] } }),
    entry("f-upcoming-early", { timing: { basis: "deadline_table", literal_rule: "default", not_before: "2026-11-01" }, applies_if: { all: [] } }),
  ]);
  const r = run(d, {});
  it("sorts by status, date and id", () => {
    expect(ids(r)).toEqual(["b-applicable", "d-today", "f-upcoming-early", "c-upcoming-late", "e-upcoming-tied-b", "a-depends"]);
  });
  it("counts whole days from as_of, 0 when applicable", () => {
    const by = Object.fromEntries(r.obligations.map((o) => [o.id, o]));
    expect(by["b-applicable"]).toMatchObject({ status: "applicable", days_until: 0 });
    expect(by["d-today"]).toMatchObject({ status: "applicable", days_until: 0 });
    expect(by["f-upcoming-early"]).toMatchObject({ status: "upcoming", days_until: 27 });
    expect(by["c-upcoming-late"]).toMatchObject({ status: "upcoming", days_until: 58 });
  });
  it("lists each distinct future date once, ascending, with the ids (dates on as_of included)", () => {
    expect(r.timeline).toEqual([
      { date: AS_OF, ids: ["d-today"] },
      { date: "2026-11-01", ids: ["f-upcoming-early"] },
      { date: "2026-12-02", ids: ["c-upcoming-late", "e-upcoming-tied-b"] },
    ]);
  });
});

describe("citations, quotations, flags", () => {
  const e = entry("e", { applies_if: { all: [] }, provisions: ["art_1.par_1", "art_5.par_1.a"], timing: { basis: "deadline_table", literal_rule: "early" } });
  it("formats the provisions in the requested language", () => {
    expect(run(data([e]), {}).obligations[0]?.provisions).toEqual([{ id: "art_1.par_1", citation: "Article 1(1)" }, { id: "art_5.par_1.a", citation: "Article 5(1), point (a)" }]);
    expect(run(data([e]), {}, AS_OF, "de").obligations[0]?.provisions[0]?.citation).toBe("Artikel 1 Absatz 1");
  });
  it("verifies quotations (whitespace-normalised, including descendants) at run time", () => {
    const ok = (anchor: string, quote: string) => run(data([{ ...e, anchor_node: anchor, quote }]), {}).obligations[0]?.quote_verified;
    expect(ok("art_1.par_1", "Alpha providers shall do the first thing.")).toBe(true);
    expect(ok("art_1.par_1", "Alpha providers shall do the SECOND thing.")).toBe(false);
    expect(ok("art_1.par_2", "Alpha providers shall do the first thing.")).toBe(false);
    expect(ok("art_3.par_1", "Gamma applies to everybody. including the gamma detail text.")).toBe(true);
    expect(ok("art_9.par_9", "anything")).toBe(false);
  });
  it("marks changes by the Omnibus: note, new in 2026, or a different date for the same anchor in 2024", () => {
    const by = (over: Partial<ObligationEntry>, t: Timing = { basis: "deadline_table", literal_rule: "default" }) =>
      run(data([entry("e", { applies_if: { all: [] }, timing: t, ...over })]), {}).obligations[0]?.changed_by_omnibus;
    expect(by({ omnibus_note: "weaker" })).toBe(true);
    expect(by({ new_in_2026: true })).toBe(true);
    expect(by({})).toBe(false); // 2024: 2026-08-02, 2026: 2026-08-02
    expect(by({ anchor_node: "art_2.par_1", quote: "Beta deployers shall do the beta thing." }, { basis: "deadline_table", literal_rule: "special" })).toBe(true); // 2026-12-02 vs 2026-08-02
    expect(by({ anchor_node: "art_9.par_9" })).toBe(false);
  });
  it("passes legal assessments and omnibus notes through and lists the assessments as open questions", () => {
    const r = run(data([entry("e", { applies_if: { all: [] }, legal_assessment_needed: "Is it significant?", omnibus_note: "Changed.", timing: { basis: "deadline_table", literal_rule: "early" } })]), {});
    expect(r.obligations[0]).toMatchObject({ legal_assessment_needed: "Is it significant?", omnibus_note: "Changed." });
    expect(r.open_questions).toEqual([{ id: "e", kind: "legal_assessment", question: "Is it significant?" }]);
    expect(r.notice).toBe("Orientation from the consolidated text, not legal advice; dates follow Article 113 and the classification route; legal assessments are flagged, not made.");
  });
});

describe("open questions", () => {
  const cls = [
    { id: "c-flag", derives: "high_risk_annex_iii", rule: { not: { field: "flag", eq: true } }, provisions: [], anchor_node: "art_1.par_1", quote: "x", legal_assessment_needed: "Does the exception apply?" },
  ];
  const d = data(
    [
      entry("e", { applies_if: { field: "hr", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" }, legal_assessment_needed: "Is it significant?" }),
      entry("late", { applies_if: { field: "high_risk_annex_iii", eq: true }, timing: { basis: "hr_route", literal_rule: "early" } }),
      entry("dep", { roles: ["deployer"], applies_if: { field: "other_flag", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } }),
    ],
    { classification: cls },
  );
  const q = (profile: Record<string, unknown>, role = ["provider"]) => aiactObligationsWith({ profile: { role, ...profile }, as_of: AS_OF }, mini, TABLE, d).open_questions;
  it("asks about an open field when another value would change the obligations, with the description of the field (not the text of a classification rule that names it)", () => {
    const qs = q({ area: "1" });
    expect(qs.filter((x) => x.kind === "classification")).toEqual([{ id: "flag", kind: "classification", question: "Not set: flag \u2013 a flag" }]);
    expect(qs.some((x) => x.question === "Does the exception apply?")).toBe(false);
  });
  it("the question format is 'Not set: <field> \u2013 <description without type prefix>'", () => {
    expect(q({}).find((x) => x.id === "area")).toEqual({ id: "area", kind: "classification", question: "Not set: area \u2013 an area" });
  });
  it("does not ask when the field is answered, or when no value would change anything", () => {
    expect(q({ area: "1", flag: true }).filter((x) => x.kind === "classification").map((x) => x.id)).not.toContain("flag");
    expect(q({ area: "1", flag: false }).map((x) => x.id)).not.toContain("flag");
    expect(q({}).map((x) => x.id)).not.toContain("size");
    expect(q({}).map((x) => x.id)).not.toContain("design_change");
    expect(q({}).map((x) => x.id)).not.toContain("uses_or_provides_ai_system");
    expect(q({}).map((x) => x.id)).not.toContain("role");
  });
  it("asks only about fields that matter for the roles of the profile", () => {
    const ids_ = (role: string[]) => q({}, role).filter((x) => x.kind === "classification").map((x) => x.id);
    expect(ids_(["importer"])).toEqual([]);
    expect(ids_(["deployer"])).toEqual(["other_flag"]);
  });
  it("a date field matters only if it changes the list (probe date before everything)", () => {
    const withLegacy = data(
      [entry("e", { applies_if: { field: "in_scope", eq: true }, timing: { basis: "deadline_table", literal_rule: "early" } })],
    );
    const qs = aiactObligationsWith({ profile: { role: ["provider"], area: "1" }, as_of: AS_OF }, mini, TABLE, withLegacy).open_questions;
    expect(qs.map((x) => x.id)).toContain("placed_on_market_before");
  });
  it("lists each field once and the legal assessments of the listed entries separately", () => {
    const qs = q({ area: "1" });
    const fields = qs.filter((x) => x.kind === "classification").map((x) => x.id);
    expect(new Set(fields).size).toBe(fields.length);
    expect(qs.filter((x) => x.kind === "legal_assessment")).toEqual([{ id: "e", kind: "legal_assessment", question: "Is it significant?" }]);
  });
});

describe("real data", () => {
  const data0 = JSON.parse(readFileSync("data/obligations.json", "utf8")) as ObligationsData;
  const idx = loadCorpus(V2026, "en");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  it("every anchor and provision exists and every quotation is in the anchor text", () => {
    const problems: string[] = [];
    for (const e of [...data0.obligations, ...data0.classification]) {
      if (!idx.byId.has(e.anchor_node)) problems.push(`${e.id}: anchor`);
      else if (!([idx.byId.get(e.anchor_node)!, ...descendants(idx, e.anchor_node)].map((x) => norm(x.text)).join(" ")).includes(norm(e.quote))) problems.push(`${e.id}: quote`);
      for (const p of e.provisions) if (!idx.byId.has(p)) problems.push(`${e.id}: provision ${p}`);
    }
    expect(problems).toEqual([]);
  });
  it("every timing rule id exists in the deadline table and every condition field is known", () => {
    const table = JSON.parse(readFileSync("data/deadlines.json", "utf8")) as DeadlineTable;
    const block = table.versions[V2026]!;
    const rules = new Set([...block.rules.map((r) => r.id), "default"]);
    for (const e of data0.obligations) for (const r of [e.timing.rule, e.timing.literal_rule]) if (r !== undefined) expect(rules.has(r), `${e.id}: ${r}`).toBe(true);
    // every entry's condition evaluates for an empty and a full profile without error
    for (const bools of [false, true]) {
      const values: Record<string, never> = {};
      for (const [k, desc] of Object.entries(data0.profile_fields)) (values as Record<string, unknown>)[k] = fieldSpec(desc).type === "boolean" ? bools : k === "role" ? [] : null;
      const ev = new Evaluator(data0, values, () => false);
      for (const e of data0.obligations) expect(() => ev.test(e.applies_if), e.id).not.toThrow();
    }
  });
  const real = (profile: Record<string, unknown>, extra: { detail?: "compact" | "full" } = {}) => aiactObligations({ profile: { role: ["provider"], ...profile }, as_of: AS_OF, ...extra });
  const byId = (r: ReturnType<typeof real>, id: string) => r.obligations.find((x) => x.id === id);
  const IA = { annex_i_section: "A", annex_i_third_party_conformity_assessment: true };
  it("an Annex I Section A profile shows no literal date for risk management", () => {
    const r = real({ ...IA });
    const o = byId(r, "risk-management-system");
    expect(o).toMatchObject({ applies_from: "2028-08-02" });
    expect(o).not.toHaveProperty("applies_from_literal");
    expect(byId(r, "ce-marking")).toMatchObject({ applies_from: "2028-08-02", applies_from_literal: "2026-08-02" });
  });
  it("never reports conditional_dates", () => {
    for (const p of [{ ...IA }, { annex_iii_area: "4" }, { ...IA, annex_iii_area: "4" }, { gpai_model: true }]) for (const o of real(p).obligations) expect(o, o.id).not.toHaveProperty("conditional_dates");
  });
  it("an Annex I Section A and Annex III provider gets both route dates and the earlier one as applies_from", () => {
    const r = real({ ...IA, annex_iii_area: "4" });
    expect(byId(r, "risk-management-system")).toMatchObject({ applies_from: "2027-12-02", route_dates: ["2027-12-02", "2028-08-02"] });
  });
  it("route-specific entries keep their route when both routes apply", () => {
    const r = real({ ...IA, annex_iii_area: "4" });
    expect(byId(r, "conformity-assessment-annex-i")).toMatchObject({ applies_from: "2028-08-02" });
    expect(byId(r, "conformity-assessment-annex-i")).not.toHaveProperty("route_dates");
    expect(byId(r, "product-manufacturer-as-provider")).toBeUndefined(); // other role
    const dep = aiactObligations({ profile: { role: ["deployer"], annex_iii_area: "5", annex_iii_point5_bc: true, deployer_public_body_or_public_service: true, ...IA }, as_of: AS_OF });
    expect(byId(dep, "fundamental-rights-impact-assessment")).toMatchObject({ applies_from: "2027-12-02" }); // pinned to Annex III
  });
  it("the scope gate defaults to true: a profile with only a role lists the AI literacy duty; false lists nothing", () => {
    expect(real({}).obligations.map((o) => o.id)).toContain("ai-literacy");
    const out = real({ uses_or_provides_ai_system: false, gpai_model: true });
    expect(out.obligations).toEqual([]);
    expect(out.notice).toMatch(/out of scope/);
  });
  it("a GPAI model placed on the market before the Art. 111(3) date gets the legacy transition entry (date from the data)", () => {
    const early = real({ gpai_model: true, placed_on_market_before: "2025-08-01" });
    expect(early.derived).toContain("placed_on_market_before_2025_08_02");
    expect(byId(early, "transition-gpai-legacy-models")).toMatchObject({ applies_from: "2027-08-02" });
    const later = real({ gpai_model: true, placed_on_market_before: "2025-08-02" });
    expect(later.derived).not.toContain("placed_on_market_before_2025_08_02");
    expect(byId(later, "transition-gpai-legacy-models")).toBeUndefined();
    expect(byId(real({ gpai_model: true }), "transition-gpai-legacy-models")).toBeUndefined();
  });
  it("Article 4a (bias data) applies no earlier than the amending act; for high-risk providers from the route date", () => {
    const hr = real({ annex_iii_area: "4", processes_special_category_data_for_bias: true });
    expect(byId(hr, "bias-special-category-data-hrai")).toMatchObject({ applies_from: "2027-12-02", applies_from_literal: "2026-07-27" });
    expect(byId(hr, "bias-special-category-data-hrai")?.deadline_caveat).toMatch(/Article 4a/);
    const other = real({ processes_special_category_data_for_bias: true });
    expect(byId(other, "bias-special-category-data-other")?.applies_from).toBe("2026-07-27");
    expect(byId(other, "bias-special-category-data-hrai")).toBeUndefined();
    const dep = aiactObligations({ profile: { role: ["deployer"], annex_iii_area: "4", processes_special_category_data_for_bias: true }, as_of: AS_OF });
    expect(byId(dep, "bias-special-category-data-other")?.applies_from).toBe("2026-07-27");
  });
  it("a role change under Art. 25 without a classified route falls back to the literal rule date", () => {
    const r = aiactObligations({ profile: { role: ["deployer"], rebrands_high_risk_system: true }, as_of: AS_OF });
    expect(byId(r, "role-change-rebranding")).toMatchObject({ applies_from: "2027-12-02", status: "upcoming" });
    expect(r.derived).not.toContain("high_risk");
  });
  it("open questions: an importer gets no Article 6(3) question, an Annex III provider without a date none about the routes", () => {
    const importer = aiactObligations({ profile: { role: ["importer"] }, as_of: AS_OF }).open_questions;
    expect(importer.map((x) => x.id)).not.toContain("annex_iii_art6_3_exception_concluded");
    expect(importer.map((x) => x.id)).not.toContain("annex_iii_performs_profiling");
    const provider = real({ annex_iii_area: "4" }).open_questions;
    expect(provider.map((x) => x.id)).toContain("annex_iii_art6_3_exception_concluded");
    expect(provider.map((x) => x.id)).not.toContain("annex_i_third_party_conformity_assessment");
    expect(provider.some((x) => /both routes/.test(x.question))).toBe(false);
    // the field description is the question: gpai_model gets its own text, not the FLOP presumption of the systemic-risk rule
    const gpai = real({ annex_iii_area: "4" }).open_questions.find((x) => x.id === "gpai_model");
    expect(gpai?.question).toBe("Not set: gpai_model \u2013 actor provides a general-purpose AI model (Art. 3(63))");
    for (const x of provider.filter((x) => x.kind === "classification")) expect(x.question.startsWith(`Not set: ${x.id} \u2013 `)).toBe(true);
    expect(provider.some((x) => x.kind === "classification" && /FLOP/.test(x.question) && x.id !== "gpai_systemic_risk_threshold_met")).toBe(false);
    for (const list of [importer, provider, real({}).open_questions]) {
      const fields = list.filter((x) => x.kind === "classification").map((x) => x.id);
      expect(new Set(fields).size).toBe(fields.length);
    }
    expect(provider.filter((x) => x.kind === "legal_assessment").length).toBeGreaterThan(0);
  });
  it("open questions are not asked for a field that is answered", () => {
    const answered = real({ annex_iii_area: "4", annex_iii_art6_3_exception_concluded: false }).open_questions.map((x) => x.id);
    expect(answered).not.toContain("annex_iii_art6_3_exception_concluded");
    const noArea = real({ annex_iii_area: "4", annex_iii_art6_3_exception_concluded: true, annex_iii_performs_profiling: false }).open_questions.map((x) => x.id);
    expect(noArea).not.toContain("annex_iii_performs_profiling");
  });
  it("rejects invalid calendar dates and numeric Annex III areas with a hint", () => {
    expect(() => real({ placed_on_market_before: "2026-02-30" })).toThrow(/not a valid calendar date/);
    expect(() => aiactObligations({ profile: { role: ["provider"] }, as_of: "2026-09-31" })).toThrow(/not a valid calendar date/);
    expect(() => real({ annex_iii_area: 4 })).toThrow(/a string, not a number \(use "4"\)/);
    expect(real({ annex_iii_area: "4" }).derived).toContain("high_risk_annex_iii");
  });
  const BIG = {
    role: ["provider", "deployer", "importer", "distributor", "authorised_representative", "product_manufacturer"],
    uses_or_provides_ai_system: true, gpai_model: true, gpai_systemic_risk_threshold_met: true, annex_iii_area: "5", annex_iii_point5_bc: true, annex_iii_art6_3_exception_concluded: false,
    annex_i_section: "A", annex_i_third_party_conformity_assessment: true, deployer_public_body_or_public_service: true, deployer_decisions_about_natural_persons: true,
    deployer_processes_personal_data: true, deployer_is_employer_workplace_use: true, deployer_public_authority_or_union_body: true, deployer_controls_input_data: true,
    art50_interacts_with_persons: true, art50_generates_synthetic_content: true, art50_emotion_or_biometric_categorisation: true, art50_deep_fake: true, art50_public_interest_text: true,
    financial_institution: true, processes_special_category_data_for_bias: true, provider_in_third_country: true, enterprise_size: "sme",
  };
  it("compact detail leaves out summary, omnibus_note and profile_echo and cuts long quotations; the rest stays", () => {
    const full = aiactObligations({ profile: BIG, as_of: AS_OF });
    const compact = aiactObligations({ profile: BIG, as_of: AS_OF, detail: "compact" });
    expect(full.profile_echo).toBeDefined();
    expect(compact).not.toHaveProperty("profile_echo");
    expect(compact.obligations.map((o) => o.id)).toEqual(full.obligations.map((o) => o.id));
    for (const [i, o] of compact.obligations.entries()) {
      const f = full.obligations[i]!;
      expect(o).not.toHaveProperty("summary");
      expect(o).not.toHaveProperty("omnibus_note");
      expect(o.quote.length).toBeLessThanOrEqual(300);
      expect(f.quote.startsWith(o.quote.replace(/…$/, ""))).toBe(true);
      if (f.quote.length > 300) expect(o.quote.endsWith("…")).toBe(true);
      else expect(o.quote).toBe(f.quote);
      expect({ ...f, summary: undefined, omnibus_note: undefined, quote: "" }).toEqual({ ...o, summary: undefined, omnibus_note: undefined, quote: "", ...{} });
      expect(o.quote_verified).toBe(f.quote_verified);
    }
    expect(compact.timeline).toEqual(full.timeline);
    expect(compact.open_questions).toEqual(full.open_questions);
    expect(() => aiactObligations({ profile: BIG, as_of: AS_OF, detail: "tiny" as never })).toThrow(/detail/);
  });
  it("compact output for a large provider profile (both routes, systemic-risk GPAI, Article 50) is under 40 KB, minified", () => {
    // all six roles at once list 76 entries (about 52 KB compact); one role with everything else switched on lists about 50 entries
    const compact = aiactObligations({ profile: { ...BIG, role: ["provider"] }, as_of: AS_OF, detail: "compact" });
    expect(compact.obligations.length).toBeGreaterThan(40);
    expect(JSON.stringify(compact).length).toBeLessThan(40_000);
  });
  it("is deterministic, also across independent core instances with fresh loaders", () => {
    const p = { role: ["provider", "deployer"], annex_iii_area: "4", gpai_model: true };
    const fresh = () => {
      const corpora = new Map<string, CorpusIndex>();
      const load = (v: Version, l: Lang) => {
        const key = `${v}.${l}`;
        if (!corpora.has(key)) corpora.set(key, buildIndex(v, l, (JSON.parse(readFileSync(corpusPath(v, l), "utf8")) as CorpusFile).nodes));
        return corpora.get(key) as CorpusIndex;
      };
      return JSON.stringify(aiactObligationsWith({ profile: p, as_of: AS_OF }, load, JSON.parse(readFileSync("data/deadlines.json", "utf8")) as DeadlineTable, JSON.parse(readFileSync("data/obligations.json", "utf8")) as ObligationsData));
    };
    expect(fresh()).toBe(fresh());
    expect(fresh()).toBe(JSON.stringify(aiactObligations({ profile: p, as_of: AS_OF })));
  });
});

describe("obligations core stays isomorphic", () => {
  it("bundles for the browser without any node: builtin", async () => {
    const res = await build({ entryPoints: ["src/tools/obligationsCore.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", outdir: "out", logLevel: "silent", metafile: true });
    expect(Object.keys(res.metafile.inputs).filter((i) => /(-fs\.ts|config\.ts)$/.test(i))).toEqual([]);
    for (const f of res.outputFiles) expect(f.text).not.toMatch(/from\s*["']node:|require\(["'](node:|fs["'])/);
  });
});
