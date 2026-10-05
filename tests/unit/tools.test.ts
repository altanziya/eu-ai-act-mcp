/** get_provision, diff and notice behaviour beyond the golden cases (no network, no clock). */
import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import { diffProvision, wordDiff } from "../../src/tools/diffProvision.js";
import { getProvision } from "../../src/tools/getProvision.js";
import { notice } from "../../src/tools/notice.js";

describe("getProvision", () => {
  it("defaults to the consolidated version, EN, with children", () => {
    const r = getProvision({ id: "art_50" });
    expect(r).toMatchObject({ found: true, version: V2026, lang: "en" });
    expect((r.children ?? []).length).toBeGreaterThan(4);
  });
  it("include_children=false returns neither children nor descendant text", () => {
    const r = getProvision({ id: "art_50", include_children: false });
    expect(r.children).toBeUndefined();
    expect(r.text_full).toBe([r.node?.heading, r.node?.text].filter(Boolean).join("\n"));
  });
  it("text_full is heading and text of node and descendants in document order", () => {
    const r = getProvision({ id: "art_113", version: V2026 });
    const parts = [r.node, ...(r.children ?? [])].flatMap((n) => [n?.heading, n?.text]).filter((s) => s);
    expect(r.text_full).toBe(parts.join("\n"));
    const orders = (r.children ?? []).map((c) => c.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
  it("accepts a human citation", () => {
    expect(getProvision({ id: "Article 50(1)", version: V2024 }).node?.id).toBe("art_50.par_1");
  });
  it("a node that only exists in the consolidated version falls back with reason not_in_version", () => {
    const r = getProvision({ id: "art_4a", version: V2024 });
    expect(r).toMatchObject({ found: false, reason: "not_in_version" });
    expect(r.fallback?.version).toBe(V2026);
  });
  it("a node removed by the Omnibus is reported as not in the consolidated version", () => {
    const r = getProvision({ id: "art_56.par_6.sub_2", version: V2026 });
    expect(r).toMatchObject({ found: false, reason: "not_in_consolidated_version" });
    expect(r.fallback?.node.id).toBe("art_56.par_6.sub_2");
    expect(r.notice.en).toContain(V2024);
    expect(r.notice.en).toContain(V2026);
  });
  it("DE returns the German node", () => {
    expect(getProvision({ id: "art_50", version: V2026, lang: "de" }).node?.heading).toMatch(/Transparenz/);
  });
});

describe("diffProvision", () => {
  it("moved nodes know both ends", () => {
    expect(diffProvision({ id: "art_4a.par_1.a" })).toMatchObject({ status: "moved", moved_from: "art_10.par_5.a" });
  });
  it("a removed recital carries a note", () => {
    const r = diffProvision({ id: "rec_1" });
    expect(r.status).toBe("removed");
    expect(r.note).toMatch(/consolidated/);
  });
  it("descendants are counted per class, each node once", () => {
    const d = diffProvision({ id: "art_4a" }).descendants;
    expect(d).toBeDefined();
    expect(d?.added).toBeGreaterThan(0);
    expect(d?.removed).toBe(0);
  });
  it("a leaf has no descendants field", () => {
    expect(diffProvision({ id: "art_5.par_1.a" }).descendants).toBeUndefined();
  });
  it("is deterministic and carries the notice with both versions", () => {
    const a = diffProvision({ id: "art_4", lang: "de" });
    expect(a).toEqual(diffProvision({ id: "art_4", lang: "de" }));
    expect(a.notice.de).toContain(V2024);
    expect(a.notice.de).toContain(V2026);
  });
});

describe("wordDiff", () => {
  it("marks inserted and deleted words, merges runs, keeps equal context", () => {
    expect(wordDiff("a b c d", "a x y d")).toEqual([
      { op: "equal", text: "a" },
      { op: "delete", text: "b c" },
      { op: "insert", text: "x y" },
      { op: "equal", text: "d" },
    ]);
  });
  it("identical texts give one equal run", () => {
    expect(wordDiff("one two", "one  two")).toEqual([{ op: "equal", text: "one two" }]);
  });
  it("pure insertion and pure deletion", () => {
    expect(wordDiff("a b", "a b c")).toEqual([{ op: "equal", text: "a b" }, { op: "insert", text: "c" }]);
    expect(wordDiff("a b c", "a c")).toEqual([{ op: "equal", text: "a" }, { op: "delete", text: "b" }, { op: "equal", text: "c" }]);
  });
});

describe("notice", () => {
  it("names the consolidated version verbatim for 02024R1689-20260727", () => {
    const n = notice([V2026]);
    expect(n.de).toMatch(/^Prüfung gegen die konsolidierte Fassung 02024R1689-20260727 von EUR-Lex\. Diese Fassung ist nicht rechtlich authentisch;/);
    expect(n.en).toMatch(/^Checked against the consolidated version 02024R1689-20260727 from EUR-Lex\. This version is not legally authentic;/);
    expect(n.en).toContain("Not legal advice");
    expect(n.de).toContain("Keine Rechtsberatung");
  });
  it("names the Official Journal version when that was checked", () => {
    expect(notice([V2024]).en).toContain("32024R1689");
  });
});
