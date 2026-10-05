import { describe, expect, it } from "vitest";
import { diffNodes } from "../../src/diff/diff.js";
import { enDeStats, mappedStats, ratio } from "../../src/h3/h3.js";
import { nodeHash, sha256Hex } from "../../src/parser/normalize.js";
import type { NodeType, ProvisionNode } from "../../src/parser/types.js";

const node = (id: string, text: string, type: NodeType = "paragraph"): ProvisionNode => ({ id, type, parent: null, heading: "", text, hash: sha256Hex(text), node_hash: nodeHash("", text), order: 0, source_anchor: "" });

describe("H3 helpers", () => {
  it("mappedStats counts unchanged, changed and moved, and excludes recitals from the headline ratio", () => {
    const from = [node("rec_1", "r", "recital"), node("rec_2", "r2", "recital"), node("art_1", "a", "article"), node("art_2", "b", "article"), node("art_3", "c", "article"), node("art_4", "d", "article")];
    const to = [node("art_1", "a", "article"), node("art_2", "b2", "article"), node("art_9", "c", "article")];
    const s = mappedStats(from, diffNodes(from, to));
    expect(s.total).toBe(4);
    expect([s.unchanged, s.changed, s.moved]).toEqual([1, 1, 1]);
    expect(s.mapped).toBe(3);
    expect(s.ratio).toBe(0.75);
    expect(s.removed).toEqual(["art_4"]);
    expect(s.all_nodes).toEqual({ total: 6, mapped: 3, ratio: 0.5 });
  });

  it("enDeStats compares logical paths", () => {
    const en = [node("art_1", "a"), node("art_2", "b"), node("art_3", "c"), node("art_4", "d")];
    const de = [node("art_1", "x"), node("art_2", "y"), node("art_3", "z")];
    const s = enDeStats(en, de);
    expect(s.ratio).toBe(0.75);
    expect(s.missing_in_de).toEqual(["art_4"]);
  });

  it("ratio rounds to 6 decimals and handles an empty denominator", () => {
    expect(ratio(1, 3)).toBe(0.333333);
    expect(ratio(0, 0)).toBe(0);
  });
});
