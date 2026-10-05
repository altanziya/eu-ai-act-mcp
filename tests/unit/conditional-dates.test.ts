/** `validity.conditional_dates`: the later application date for rules that apply by class of AI system. */
import { afterAll, describe, expect, it } from "vitest";
import { V2026 } from "../../src/config.js";
import { createRecord, recordHash } from "../../src/record/record.js";
import type { EvidenceRecord, RecordInput } from "../../src/record/record.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import { applyRule } from "../../src/tools/deadlines.js";
import { verifyCitation } from "../../src/tools/verifyCitation.js";
import { recomputeRecord } from "../../src/verify-core/recompute.js";
import { makeRelease } from "./helpers/release.js";

const rule = {
  id: "two",
  applies_from: "2027-12-02",
  scope: [],
  source_nodes: ["x"],
  later_dates: [{ applies_from: "2028-08-02", condition: "Annex I systems", source_node: "x" }],
};
const ANNEX_I = [{ date: "2028-08-02", condition: "Annex I systems" }];

describe("applyRule conditional_dates", () => {
  it("lists the later dates before and between the two dates, and not once they have passed", () => {
    expect(applyRule(rule, "2027-01-01")).toMatchObject({ state: "not_yet_applicable_until", until: "2027-12-02", conditional_dates: ANNEX_I });
    expect(applyRule(rule, "2028-01-01")).toMatchObject({ state: "unknown", conditional_dates: ANNEX_I });
    expect(applyRule(rule, "2028-08-02")).not.toHaveProperty("conditional_dates");
  });
  it("a rule without later dates has no conditional_dates field", () => {
    expect(applyRule({ id: "plain", applies_from: "2027-12-02", source_nodes: ["x"] }, "2027-01-01")).not.toHaveProperty("conditional_dates");
  });
});

const quote = loadCorpus(V2026, "en").byId.get("art_9.par_2")?.text.split(/\s+/).slice(0, 25).join(" ") as string;

describe("verifyCitation on Article 9(2)", () => {
  it("reports the Annex I date next to the earlier date", () => {
    const r = verifyCitation({ quote, claimed_ref: "Article 9(2)", as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("exact");
    expect(r.validity.state).toBe("not_yet_applicable_until");
    expect(r.validity.until).toBe("2027-12-02");
    expect(r.validity.conditional_dates).toHaveLength(1);
    expect(r.validity.conditional_dates?.[0]?.date).toBe("2028-08-02");
    expect(r.validity.conditional_dates?.[0]?.condition).toMatch(/Annex I/);
  });
  it("a provision with a single date has no conditional_dates", () => {
    const text = loadCorpus(V2026, "en").byId.get("art_5.par_1.a")?.text as string;
    const r = verifyCitation({ quote: text, claimed_ref: "art_5.par_1.a", as_of: "2024-09-01", lang: "en" });
    expect(r.validity.state).toBe("not_yet_applicable_until");
    expect(r.validity).not.toHaveProperty("conditional_dates");
  });
});

describe("recomputeRecord and conditional_dates", () => {
  const rel = makeRelease("unit-conditional");
  afterAll(() => rel.cleanup());
  const input: RecordInput = { quote, claimed_ref: "art_9.par_2", as_of: "2026-09-01", lang: "en", created_at: "2026-10-05T12:00:00+02:00", release_id: "unit-conditional" };
  const rehash = (r: EvidenceRecord, edit: (r: EvidenceRecord) => EvidenceRecord): EvidenceRecord => {
    const { record_hash: _old, ...body } = edit(r);
    return { ...body, record_hash: recordHash(body) };
  };

  it("a new record carries the field and verifies", () => {
    const rec = createRecord(input, rel.ctx);
    expect(rec.result.validity.conditional_dates?.[0]?.date).toBe("2028-08-02");
    const rep = recomputeRecord(rec, rel.ctx);
    expect(rep.record_hash_ok).toBe(true);
    expect(rep.matches_record).toBe(true);
    expect(rep.recomputed.validity.conditional_dates).toEqual(rec.result.validity.conditional_dates);
  });
  it("an older record without the field is not a deviation (and keeps its record hash)", () => {
    const old = rehash(createRecord(input, rel.ctx), (r) => {
      const { conditional_dates: _drop, ...validity } = r.result.validity;
      return { ...r, result: { ...r.result, validity } };
    });
    expect(old.result.validity).not.toHaveProperty("conditional_dates");
    const rep = recomputeRecord(old, rel.ctx);
    expect(rep.record_hash_ok).toBe(true);
    expect(rep.matches_record).toBe(true);
    expect(rep.differences).toEqual([]);
  });
  it("a record that states other conditional dates is reported as a difference", () => {
    const forged = rehash(createRecord(input, rel.ctx), (r) => ({
      ...r,
      result: { ...r.result, validity: { ...r.result.validity, conditional_dates: [{ date: "2027-01-01", condition: "everything" }] } },
    }));
    const rep = recomputeRecord(forged, rel.ctx);
    expect(rep.matches_record).toBe(false);
    expect(rep.differences.map((d) => d.field)).toEqual(["validity.conditional_dates"]);
  });
});
