import { describe, expect, it } from "vitest";
import { TOOL_DEFS } from "../../src/eval/openrouter.js";
import { createServer } from "../../src/mcp/server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import { getProvision, MAX_SIBLINGS } from "../../src/tools/getProvision.js";
import { V2024, V2026 } from "../../src/config.js";

const get = (id: string, version = V2026, lang: "en" | "de" = "en") => {
  const r = getProvision({ id, version, lang, as_of: "2026-10-05" });
  if (!r.structure) throw new Error(`no structure for ${id}`);
  return r.structure;
};

describe("get_provision structure", () => {
  it("Article 99(6) lists the inserted paragraph 6a as new in the consolidated version", () => {
    const s = get("art_99.par_6");
    expect(s.parent).toEqual({ id: "art_99", citation: "Article 99" });
    const six = s.siblings.find((x) => x.id === "art_99.par_6a");
    expect(six).toEqual({ id: "art_99.par_6a", citation: "Article 99(6a)", new_in_version: true });
    expect(s.siblings.map((x) => x.id)).toContain("art_99.par_7");
    expect(s.siblings.map((x) => x.id)).not.toContain("art_99.par_6");
    expect(s.siblings.find((x) => x.id === "art_99.par_5")).not.toHaveProperty("new_in_version");
  });
  it("Article 60 (2026) lists Article 60a and its neighbours; the Official Journal version has no 60a", () => {
    const now = get("art_60");
    expect(now.siblings.map((x) => x.id)).toEqual(["art_59", "art_60a", "art_61"]);
    expect(now.siblings.find((x) => x.id === "art_60a")).toMatchObject({ new_in_version: true, citation: "Article 60a" });
    expect(now.parent?.id).toBe("cpt_6");
    expect(now.children.map((x) => x.id)).toContain("art_60.par_1");
    const old = get("art_60", V2024);
    expect(old.siblings.map((x) => x.id)).toEqual(["art_59", "art_61"]);
  });
  it("Article 60a points back to Article 60 and nothing is flagged new in the Official Journal version", () => {
    expect(get("art_60a").siblings.map((x) => x.id)).toEqual(["art_59", "art_60", "art_61"]);
    for (const x of get("art_99.par_5", V2024).siblings) expect(x).not.toHaveProperty("new_in_version");
  });
  it("uses the language for the citations; top-level nodes have no parent; annex points are children", () => {
    expect(get("art_99.par_6", V2026, "de").siblings.find((x) => x.id === "art_99.par_6a")?.citation).toBe("Artikel 99 Absatz 6a");
    const annex = get("anx_3");
    expect(annex.parent).toBeNull();
    expect(annex.children.map((x) => x.id)).toContain("anx_3.pt_4");
    expect(annex.siblings.map((x) => x.id)).toEqual(["anx_2", "anx_4"]);
  });
  it("is at most 30 siblings, the nearest ones, in document order", () => {
    const idx = loadCorpus(V2026, "en");
    const parent = [...idx.children.entries()].find(([, kids]) => kids.length > MAX_SIBLINGS + 5);
    expect(parent).toBeDefined();
    const kids = parent?.[1] ?? [];
    const mid = kids[Math.floor(kids.length / 2)];
    const s = get(mid?.id ?? "");
    expect(s.siblings).toHaveLength(MAX_SIBLINGS);
    const orders = s.siblings.map((x) => idx.byId.get(x.id)?.order ?? 0);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(orders.some((o) => o < (mid?.order ?? 0))).toBe(true);
    expect(orders.some((o) => o > (mid?.order ?? 0))).toBe(true);
  });
  it("is absent when the provision was not found", () => {
    expect(getProvision({ id: "art_9999", as_of: "2026-10-05" }).structure).toBeUndefined();
  });
});

describe("tool description", () => {
  const SENTENCE = "The response lists neighbouring provisions (including ones inserted by the 2026 amendment, such as paragraph 6a); check them before concluding that the Act says nothing more.";
  it("carries the sentence in the MCP tool and in TOOL_DEFS", async () => {
    const server = createServer();
    const client = new Client({ name: "test", version: "0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);
    const tool = (await client.listTools()).tools.find((t) => t.name === "aiact_get_provision");
    expect(tool?.description).toContain(SENTENCE);
    expect(TOOL_DEFS.find((d) => d.function.name === "aiact_get_provision")?.function.description).toContain(SENTENCE);
    const r = (await client.callTool({ name: "aiact_get_provision", arguments: { id: "art_99.par_6", as_of: "2026-10-05" } })) as { content: Array<{ text: string }> };
    expect(JSON.parse((r.content[0] as { text: string }).text).structure.siblings.some((x: { id: string }) => x.id === "art_99.par_6a")).toBe(true);
    await client.close();
  });
});
