/** V1 deadline resolution: nearest scope wins, except beats scope, default, unknown (src/tools/deadlines.ts). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import type { ProvisionNode } from "../../src/parser/types.js";
import { buildIndex, loadCorpus } from "../../src/tools/corpus.js";
import { applyRule, resolveDeadline } from "../../src/tools/deadlines.js";
import type { DeadlineTable } from "../../src/tools/deadlines.js";

const node = (id: string, parent: string | null, type: ProvisionNode["type"] = "paragraph"): ProvisionNode => ({
  id, type, parent, heading: "", text: id, hash: "", node_hash: "", order: 0, source_anchor: "",
});
const mini = buildIndex(V2026, "en", [
  node("cpt_1", null, "chapter"),
  node("cpt_1.sct_1", "cpt_1", "section"),
  node("art_1", "cpt_1.sct_1", "article"),
  node("art_1.par_1", "art_1"),
  node("art_1.par_1.a", "art_1.par_1", "point"),
  node("art_2", "cpt_1.sct_1", "article"),
  node("art_3", null, "article"),
]);
const tbl: DeadlineTable = {
  versions: {
    [V2026]: {
      default: { id: "default", applies_from: "2030-01-01", source_nodes: ["art_1"] },
      rules: [
        { id: "chapter", applies_from: "2025-01-01", scope: ["cpt_1"], except: ["art_2"], source_nodes: ["art_1"] },
        { id: "article", applies_from: "2026-01-01", scope: ["art_1"], source_nodes: ["art_1"] },
        { id: "point", applies_from: "2027-01-01", scope: ["art_1.par_1.a"], source_nodes: ["art_1"] },
      ],
    },
    [V2024]: { rules: [{ id: "only", applies_from: "2025-01-01", scope: ["cpt_1"], source_nodes: ["art_1"] }] },
  },
};
const at = (id: string, asOf: string, version: string = V2026) => resolveDeadline(version, mini.byId.get(id) as ProvisionNode, mini.byId, asOf, tbl);

describe("deadline resolution", () => {
  it("the most specific (nearest) rule wins", () => {
    expect(at("art_1.par_1.a", "2026-06-01").rule_id).toBe("point");
    expect(at("art_1.par_1", "2026-06-01").rule_id).toBe("article");
    expect(at("cpt_1.sct_1", "2026-06-01").rule_id).toBe("chapter");
  });
  it("except removes a node from the rule; the node falls to the default", () => {
    expect(at("art_2", "2026-06-01")).toMatchObject({ state: "not_yet_applicable_until", until: "2030-01-01", rule_id: "default" });
  });
  it("a node outside every scope gets the default", () => {
    expect(at("art_3", "2031-01-01")).toMatchObject({ state: "in_force_at_as_of", rule_id: "default" });
  });
  it("no matching rule and no default is unknown", () => {
    expect(at("art_3", "2031-01-01", V2024)).toEqual({ state: "unknown" });
    expect(resolveDeadline("nope", mini.byId.get("art_1") as ProvisionNode, mini.byId, "2031-01-01", tbl)).toEqual({ state: "unknown" });
  });
  it("applies from the date itself", () => {
    expect(at("art_1.par_1.a", "2026-12-31").state).toBe("not_yet_applicable_until");
    expect(at("art_1.par_1.a", "2027-01-01").state).toBe("in_force_at_as_of");
  });
  it("a rule with later dates is unknown between the dates", () => {
    const rule = { id: "two", applies_from: "2027-12-02", scope: [], source_nodes: ["x"], later_dates: [{ applies_from: "2028-08-02", condition: "c", source_node: "x" }] };
    expect(applyRule(rule, "2027-01-01").state).toBe("not_yet_applicable_until");
    expect(applyRule(rule, "2028-01-01").state).toBe("unknown");
    expect(applyRule(rule, "2028-08-02").state).toBe("in_force_at_as_of");
  });
});

describe("data/deadlines.json against the corpus", () => {
  const real = JSON.parse(readFileSync(new URL("../../data/deadlines.json", import.meta.url), "utf8")) as DeadlineTable;
  const res = (version: string, id: string, asOf: string) => {
    const idx = loadCorpus(version as typeof V2024, "en");
    return resolveDeadline(version, idx.byId.get(id) as ProvisionNode, idx.byId, asOf, real);
  };
  it("every scope and except entry exists in the corpus of its version", () => {
    for (const v of [V2024, V2026] as const) {
      const idx = loadCorpus(v, "en");
      for (const r of real.versions[v]?.rules ?? []) {
        for (const id of [...(r.scope ?? []), ...(r.except ?? []), ...r.source_nodes]) expect(idx.byId.has(id), `${v} ${r.id} ${id}`).toBe(true);
      }
    }
  });
  it("2024: Chapter I/II from 2025-02-02, GPAI chapter from 2025-08-02, Art. 101 and the rest from 2026-08-02, Art. 6(1) from 2027-08-02", () => {
    expect(res(V2024, "art_5.par_1.a", "2025-03-01").until).toBeUndefined();
    expect(res(V2024, "art_5.par_1.a", "2025-01-01")).toMatchObject({ state: "not_yet_applicable_until", until: "2025-02-02" });
    expect(res(V2024, "art_53.par_1.a", "2025-07-01")).toMatchObject({ until: "2025-08-02" });
    expect(res(V2024, "art_78.par_1", "2025-07-01")).toMatchObject({ until: "2025-08-02" });
    expect(res(V2024, "art_101.par_1", "2025-09-01")).toMatchObject({ until: "2026-08-02", rule_id: "default" });
    expect(res(V2024, "art_50.par_1", "2026-08-02").state).toBe("in_force_at_as_of");
    expect(res(V2024, "art_6.par_1.a", "2027-01-01")).toMatchObject({ until: "2027-08-02", rule_id: "art6-par1" });
    expect(res(V2024, "art_6.par_2", "2027-01-01").rule_id).toBe("default");
  });
  it("2026: Art. 5(1)(ba),(bb),(1a),(1b) from 2026-12-02; Chapter III Sections 1-3 by class of system; Arts. 102-110 from 2026-07-27", () => {
    expect(res(V2026, "art_5.par_1.a", "2025-03-01").state).toBe("in_force_at_as_of");
    for (const id of ["art_5.par_1.ba", "art_5.par_1.bb", "art_5.par_1a", "art_5.par_1a.a.i", "art_5.par_1b"]) {
      expect(res(V2026, id, "2026-09-01"), id).toMatchObject({ state: "not_yet_applicable_until", until: "2026-12-02" });
    }
    expect(res(V2026, "art_9.par_1", "2027-06-01")).toMatchObject({ until: "2027-12-02" });
    expect(res(V2026, "art_9.par_1", "2028-01-01").state).toBe("unknown");
    expect(res(V2026, "art_9.par_1", "2028-08-02").state).toBe("in_force_at_as_of");
    expect(res(V2026, "art_6.par_5", "2026-09-01").rule_id).toBe("default");
    expect(res(V2026, "art_105", "2026-07-27").state).toBe("in_force_at_as_of");
    expect(res(V2026, "art_31", "2025-09-01")).toMatchObject({ state: "in_force_at_as_of", rule_id: "ch3s4-ch5-ch7-ch12-art78" });
    expect(res(V2026, "art_43.par_1", "2026-09-01").rule_id).toBe("default");
  });
});
