/** ID scheme v1 against the real data. Parses data/raw, no network. */
import { describe, expect, it } from "vitest";
import { ALL_CASES, mustGet, nodeMap, parsed, V2024, V2026 } from "./helpers/corpora.js";

describe.each(ALL_CASES)("integrity: $label", (c) => {
  const { nodes, warnings } = parsed(c);
  const byId = nodeMap(nodes);

  it("has unique ids, no ~N suffix, no parser warnings", () => {
    expect(byId.size).toBe(nodes.length);
    expect(nodes.filter((n) => n.id.includes("~")).map((n) => n.id)).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("every parent exists and precedes its child", () => {
    const bad = nodes.filter((n) => n.parent !== null && (!byId.has(n.parent) || (byId.get(n.parent) as { order: number }).order >= n.order));
    expect(bad.map((n) => `${n.id} -> ${n.parent}`)).toEqual([]);
  });

  it("order runs 0..n-1 without gaps, in array order", () => {
    expect(nodes.map((n) => n.order)).toEqual(nodes.map((_, i) => i));
  });

  it("has no empty node (neither heading nor text)", () => {
    expect(nodes.filter((n) => n.heading === "" && n.text === "").map((n) => n.id)).toEqual([]);
  });

  it("has no node without a letter or digit in heading and text (punctuation-only blocks are merged)", () => {
    expect(nodes.filter((n) => !/[\p{L}\p{N}]/u.test(`${n.heading}${n.text}`)).map((n) => n.id)).toEqual([]);
  });

  it("id path matches the parent chain (child id = parent id + one segment)", () => {
    const bad = nodes.filter((n) => n.parent !== null && n.type !== "section" && n.type !== "article" && !n.id.startsWith(`${n.parent}.`));
    expect(bad.map((n) => n.id)).toEqual([]);
  });

  it("keys appear in the contract order", () => {
    expect(Object.keys(nodes[0] as object)).toEqual(["id", "type", "parent", "heading", "text", "hash", "node_hash", "order", "source_anchor"]);
  });
});

describe("structure: EN 2024, EN 2026, DE 2024", () => {
  const targets = ALL_CASES.filter((c) => c.lang === "en" || c.celex === V2024);
  describe.each(targets)("$label", (c) => {
    const m = nodeMap(parsed(c).nodes);
    const need = (id: string) => mustGet(m, id, c.label);

    it("art_43.par_1 has points a, b and a second subparagraph with points a..d", () => {
      expect(need("art_43.par_1.a").parent).toBe("art_43.par_1");
      expect(need("art_43.par_1.b").type).toBe("point");
      expect(need("art_43.par_1.sub_2").type).toBe("subparagraph");
      for (const l of ["a", "b", "c", "d"]) expect(need(`art_43.par_1.sub_2.${l}`).parent).toBe("art_43.par_1.sub_2");
      expect(need("art_43.par_1.sub_2").order).toBeGreaterThan(need("art_43.par_1.b").order);
      expect(need("art_43.par_1.sub_2.a").order).toBeGreaterThan(need("art_43.par_1.sub_2").order);
    });

    it("anx_10.pt_1 is the Schengen group with points below it", () => {
      expect(need("anx_10.pt_1.a").parent).toBe("anx_10.pt_1");
      expect(need("anx_10.pt_1").heading).toMatch(/Schengen/);
      expect(need("anx_10.pt_1").type).toBe("annex_point");
    });

    it("no id carries a hyphenated number (pt_3-1) any more", () => {
      expect([...m.keys()].filter((id) => /_\d+-\d+/.test(id))).toEqual([]);
    });
  });

  describe.each(targets.filter((c) => c.celex === V2024 || c.celex === V2026))("annex sections: $label", (c) => {
    const nodes = parsed(c).nodes;
    const m = nodeMap(nodes);
    const need = (id: string) => mustGet(m, id, c.label);

    it("anx_1 has sec_a and sec_b; Section B is a heading, not part of any node text under sec_a", () => {
      expect(need("anx_1.sec_a").type).toBe("annex_section");
      expect(need("anx_1.sec_b").heading).toMatch(/^(Section|Abschnitt) B/);
      if (c.lang === "en") expect(need("anx_1.sec_b").heading).toContain("Section B");
      const under = nodes.filter((n) => n.id === "anx_1.sec_a" || n.id.startsWith("anx_1.sec_a."));
      expect(under.filter((n) => /\bSection B\b|\bAbschnitt B\b/.test(`${n.heading} ${n.text}`)).map((n) => n.id)).toEqual([]);
      expect(need("anx_1.sec_a.pt_2").parent).toBe("anx_1.sec_a");
    });

    it("anx_8 has sections a, b, c each with a first point", () => {
      for (const s of ["a", "b", "c"]) {
        expect(need(`anx_8.sec_${s}`).type).toBe("annex_section");
        expect(need(`anx_8.sec_${s}.pt_1`).parent).toBe(`anx_8.sec_${s}`);
      }
    });

    it("anx_11 has sec_1 and sec_2 with the title merged into the heading", () => {
      expect(need("anx_11.sec_1").type).toBe("annex_section");
      expect(need("anx_11.sec_2").type).toBe("annex_section");
      expect(need("anx_11.sec_1").heading.length).toBeGreaterThan("Section 1".length + 10);
    });

    it("anx_7 nests 3.1 under group 3 and 4.4 under group 4", () => {
      expect(need("anx_7.pt_3.pt_1").parent).toBe("anx_7.pt_3");
      expect(need("anx_7.pt_4.pt_4").parent).toBe("anx_7.pt_4");
      expect(need("anx_7.pt_3").heading).not.toBe("");
      // the heading of group 4 is its own node, not text of 3.4
      const under3 = nodes.filter((n) => n.id.startsWith("anx_7.pt_3."));
      expect(under3.filter((n) => /Control of the technical documentation|Kontrolle der technischen Dokumentation/.test(n.text)).map((n) => n.id)).toEqual([]);
    });
  });

  describe("2026 only", () => {
    const c = ALL_CASES.find((x) => x.celex === V2026 && x.lang === "en") as (typeof ALL_CASES)[number];
    const m = nodeMap(parsed(c).nodes);
    const need = (id: string) => mustGet(m, id, c.label);

    it("art_4a.par_2.sub_2 is the closing sentence and comes after the points", () => {
      expect(need("art_4a.par_2.sub_2").text.startsWith("This paragraph does not create")).toBe(true);
      expect(need("art_4a.par_2.sub_2").order).toBeGreaterThan(need("art_4a.par_2.b").order);
    });

    it("anx_14 is structured: groups 1..4, level-2 letters below group 2 and 3, tables as text", () => {
      expect(need("anx_14").heading).toMatch(/^The list of codes, categories and corresponding types/);
      expect(need("anx_14").heading).not.toMatch(/^ANNEX/);
      expect(need("anx_14.pt_2").heading).toMatch(/^List of Codes/);
      expect(need("anx_14.pt_2.a").parent).toBe("anx_14.pt_2");
      expect(need("anx_14.pt_2.a").heading).toMatch(/Annex I/);
      expect(need("anx_14.pt_2.a").text).toContain("AIP 0102");
      expect(need("anx_14.pt_3.d").type).toBe("annex_point");
      expect(need("anx_14.pt_4").type).toBe("annex_point");
    });
  });
});
