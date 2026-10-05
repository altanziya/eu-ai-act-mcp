import { describe, expect, it } from "vitest";
import { diffNodes } from "../../src/diff/diff.js";
import { nodeHash, sha256Hex } from "../../src/parser/normalize.js";
import type { NodeType, ProvisionNode } from "../../src/parser/types.js";

const node = (id: string, text: string, type: NodeType = "paragraph", heading = ""): ProvisionNode => ({
  id,
  type,
  parent: null,
  heading,
  text,
  hash: sha256Hex(text),
  node_hash: nodeHash(heading, text),
  order: 0,
  source_anchor: "",
});

describe("diffNodes", () => {
  const from = [node("art_1.par_1", "same"), node("art_1.par_2", "old text"), node("art_2.par_1", "moving text"), node("art_3", "gone"), node("rec_1", "r", "recital")];
  const to = [node("art_1.par_1", "same"), node("art_1.par_2", "new text"), node("art_9.par_1", "moving text"), node("art_4a", "brand new", "article")];
  const d = diffNodes(from, to);

  it("classifies unchanged, changed, moved, added and removed", () => {
    expect(d.unchanged).toEqual(["art_1.par_1"]);
    expect(d.changed.map((c) => c.id)).toEqual(["art_1.par_2"]);
    expect(d.moved.map((m) => [m.from_id, m.to_id])).toEqual([["art_2.par_1", "art_9.par_1"]]);
    expect(d.added.map((a) => a.id)).toEqual(["art_4a"]);
    expect(d.removed.map((r) => r.id)).toEqual(["art_3", "rec_1"]);
  });

  it("reports counts that add up", () => {
    expect(d.counts).toEqual({ added: 1, removed: 2, changed: 1, moved: 1, unchanged: 1 });
    expect(d.counts.unchanged + d.counts.changed + d.counts.moved + d.counts.removed).toBe(from.length);
  });

  it("does not pair ambiguous duplicate texts as moved", () => {
    const f = [node("a.par_1", "dup"), node("b.par_1", "dup")];
    const t = [node("c.par_1", "dup")];
    const r = diffNodes(f, t);
    expect(r.moved).toEqual([]);
    expect(r.removed.length).toBe(2);
    expect(r.added.length).toBe(1);
    expect(r.ambiguous_hash_matches).toBe(1);
  });

  it("treats a heading change as a change", () => {
    const r = diffNodes([node("art_3", "t", "article", "Definitions")], [node("art_3", "t", "article", "Terms")]);
    expect(r.counts.changed).toBe(1);
  });

  it("is deterministic and order-preserving", () => {
    expect(JSON.stringify(diffNodes(from, to))).toBe(JSON.stringify(diffNodes(from, to)));
  });
});
