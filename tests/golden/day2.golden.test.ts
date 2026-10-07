/**
 * Golden tests for get_provision, diff, verify_citation, the reference parser and the MCP server. The expected values
 * were written before the implementation and do not follow it.
 *
 * Fixed API under test:
 *   src/tools/getProvision.ts   getProvision({ id, version?, lang?, include_children? })
 *   src/tools/diffProvision.ts  diffProvision({ id, lang? })
 *   src/tools/verifyCitation.ts verifyCitation({ quote, claimed_ref?, as_of?, lang? })
 *   src/tools/refParser.ts      parseRef(ref)
 *   src/mcp/server.ts           stdio MCP server, started with `npx tsx src/mcp/server.ts`
 * Quotes are taken from the corpus files at test time, never hard-coded, so the tests follow the parser output.
 * Preconditions that do not hold fail with an explicit message instead of a misleading tool failure.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getProvision } from "../../src/tools/getProvision.js";
import { diffProvision } from "../../src/tools/diffProvision.js";
import { verifyCitation } from "../../src/tools/verifyCitation.js";
import { parseRef } from "../../src/tools/refParser.js";

const ROOT = process.env.GOLDEN_ROOT ?? process.cwd();
const V2024 = "32024R1689";
const V2026 = "02024R1689-20260727";
const OMNIBUS = "32026R1744";
type Lang = "en" | "de";
type Version = typeof V2024 | typeof V2026;

interface Node {
  id: string;
  type: string;
  parent: string | null;
  heading: string;
  text: string;
  order: number;
}

function corpus(version: Version, lang: Lang): Map<string, Node> {
  const p = join(ROOT, "data/corpus", `${version}.${lang}.json`);
  if (!existsSync(p)) throw new Error(`precondition: missing corpus file ${p}`);
  const raw = JSON.parse(readFileSync(p, "utf8")) as { nodes: Node[] };
  return new Map(raw.nodes.map((n) => [n.id, n]));
}
const tokens = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
const crude = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();
function containedAnywhere(quote: string, nodes: Map<string, Node>): boolean {
  const q = crude(quote);
  for (const n of nodes.values()) if (crude(n.text).includes(q)) return true;
  return false;
}
function need(nodes: Map<string, Node>, id: string): Node {
  const n = nodes.get(id);
  if (!n) throw new Error(`precondition: node ${id} missing in corpus`);
  return n;
}

const EN24 = corpus(V2024, "en");
const EN26 = corpus(V2026, "en");
const DE26 = corpus(V2026, "de");

/** First Article 5 point whose text is identical in both versions (used for exact + V1 cases). */
function unchangedArt5(): Node {
  for (const id of ["art_5.par_1.a", "art_5.par_1.b", "art_5.par_1.c", "art_5.par_1.d"]) {
    const a = EN24.get(id);
    const b = EN26.get(id);
    if (a && b && a.text === b.text && tokens(a.text).length >= 20) return a;
  }
  throw new Error("precondition: no unchanged art_5.par_1.<x> with >= 20 tokens in both versions");
}
/** A 2024 text that no longer appears (crudely) anywhere in the 2026 version. */
function only2024(): Node {
  for (const id of ["art_56.par_6.sub_2", "art_4", "art_10.par_5"]) {
    const n = EN24.get(id);
    if (n && tokens(n.text).length >= 12 && !containedAnywhere(n.text, EN26)) return n;
  }
  throw new Error("precondition: no candidate 2024 text absent from 2026 (art_56.par_6.sub_2, art_4, art_10.par_5)");
}
/** A 2026 text under art_75a that does not appear (crudely) anywhere in the 2024 version. */
function only2026(): Node {
  const cands = [...EN26.values()].filter((n) => n.id.startsWith("art_75a")).sort((a, b) => a.order - b.order);
  for (const n of cands) if (tokens(n.text).length >= 12 && !containedAnywhere(n.text, EN24)) return n;
  throw new Error("precondition: no art_75a node with >= 12 tokens absent from 2024");
}

describe("tools api golden: aiact_get_provision", () => {
  it("returns art_50 (2024, EN) with heading Transparency and >= 4 paragraphs", () => {
    const r = getProvision({ id: "art_50", version: V2024, lang: "en" });
    expect(r.found).toBe(true);
    expect(r.node?.heading ?? "").toMatch(/Transparency/);
    const pars = (r.children ?? []).filter((c) => c.type === "paragraph" && c.parent === "art_50");
    expect(pars.length).toBeGreaterThanOrEqual(4);
    expect(r.text_full ?? "").toContain(r.node?.text ?? "\u0000");
  });
  it("art_113 (2024, EN) text_full carries the four application dates", () => {
    const r = getProvision({ id: "art_113", version: V2024, lang: "en" });
    for (const d of ["2 February 2025", "2 August 2025", "2 August 2026", "2 August 2027"]) {
      expect(r.text_full ?? "").toContain(d);
    }
  });
  it("recital in the consolidated version falls back to the Official Journal version (F66)", () => {
    const r = getProvision({ id: "rec_12", version: V2026, lang: "en" });
    expect(r.found).toBe(false);
    expect(r.reason).toBe("not_in_consolidated_version");
    expect(r.fallback?.version).toBe(V2024);
    expect(r.fallback?.node?.id).toBe("rec_12");
  });
  it("DE art_3.pt_1 (2026) defines KI-System", () => {
    const r = getProvision({ id: "art_3.pt_1", version: V2026, lang: "de" });
    expect(r.found).toBe(true);
    expect(r.node?.text ?? "").toMatch(/KI-System/);
  });
  it("unknown id", () => {
    const r = getProvision({ id: "art_999", version: V2024, lang: "en" });
    expect(r.found).toBe(false);
    expect(r.reason).toBe("unknown_id");
  });
  it("carries the DE and EN notice", () => {
    const r = getProvision({ id: "art_50" });
    expect(r.notice.de).toMatch(/EUR-Lex/);
    expect(r.notice.en).toMatch(/EUR-Lex/);
  });
});

describe("tools api golden: aiact_diff", () => {
  it("art_4a is added, art_10.par_5.a moved to art_4a.par_1.a", () => {
    expect(diffProvision({ id: "art_4a", lang: "en" }).status).toBe("added");
    const m = diffProvision({ id: "art_10.par_5.a", lang: "en" });
    expect(m.status).toBe("moved");
    expect(m.moved_to).toBe("art_4a.par_1.a");
  });
  it("an unchanged Article 5 point is unchanged", () => {
    expect(diffProvision({ id: unchangedArt5().id, lang: "en" }).status).toBe("unchanged");
  });
  it("a changed node yields a word diff with at least one insert or delete", () => {
    const cand = ["art_4", "art_113.c", "art_6.par_1"].find((id) => {
      const a = EN24.get(id);
      const b = EN26.get(id);
      return a && b && (a.text !== b.text || a.heading !== b.heading);
    });
    if (!cand) throw new Error("precondition: none of art_4, art_113.c, art_6.par_1 differs between versions");
    const r = diffProvision({ id: cand, lang: "en" });
    expect(r.status).toBe("changed");
    expect((r.word_diff ?? []).some((w) => w.op === "insert" || w.op === "delete")).toBe(true);
  });
  it("art_10 reports descendant changes and names the amending act", () => {
    const r = diffProvision({ id: "art_10", lang: "en" });
    expect(r.descendants).toBeDefined();
    const d = r.descendants!;
    expect(d.removed + d.moved + d.changed).toBeGreaterThanOrEqual(1);
    expect(r.amending_act).toBe(OMNIBUS);
    expect(r.from_version).toBe(V2024);
    expect(r.to_version).toBe(V2026);
  });
  it("unknown id", () => {
    expect(diffProvision({ id: "art_999", lang: "en" }).status).toBe("unknown_id");
  });
});

describe("tools api golden: aiact_verify_citation V0", () => {
  it("exact match at the claimed ref, in force after 2 February 2025", () => {
    const n = unchangedArt5();
    const r = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("exact");
    expect(r.version_checked).toBe(V2026);
    expect(r.match?.provision_id).toBe(n.id);
    expect(r.validity.state).toBe("in_force_at_as_of");
    expect(r.support_checked).toBe(false);
    expect(r.notice.en).toMatch(/EUR-Lex/);
  });
  it("exact match without claimed ref (unique text)", () => {
    const n = unchangedArt5();
    const r = verifyCitation({ quote: n.text, as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("exact");
    expect(r.match?.provision_id).toBe(n.id);
  });
  it("a leading list label is stripped before matching", () => {
    const n = unchangedArt5();
    const r = verifyCitation({ quote: `(a) ${n.text}`, claimed_ref: n.id, as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("exact");
  });
  it("correct wording, wrong pinpoint -> found_at_other_provision", () => {
    const n = need(EN26, "art_50.par_1");
    if (tokens(n.text).length < 6) throw new Error("precondition: art_50.par_1 shorter than 6 tokens");
    const r = verifyCitation({ quote: n.text, claimed_ref: "art_52", as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("found_at_other_provision");
    expect(r.provision_id).toBe("art_50.par_1");
  });
  it("2024 wording after the Omnibus -> found_other_version + superseded_by", () => {
    const n = only2024();
    const r = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("found_other_version");
    expect(r.version_checked).toBe(V2026);
    expect(r.found_in_version).toBe(V2024);
    expect(r.validity.state).toBe("superseded_by");
    expect(r.validity.version).toBe(V2026);
  });
  it("Omnibus wording before 27 July 2026 -> found_other_version + inserted_by", () => {
    const n = only2026();
    const r = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2026-06-01", lang: "en" });
    expect(r.status).toBe("found_other_version");
    expect(r.version_checked).toBe(V2024);
    expect(r.found_in_version).toBe(V2026);
    expect(r.validity.state).toBe("inserted_by");
    expect(r.validity.act).toBe(OMNIBUS);
  });
  it("a changed year is a hard-token mismatch", () => {
    // ID scheme v1: "It shall apply from 2 August 2026." is the second subparagraph of Article 113.
    const n = ["art_113.sub_2", "art_113"].map((id) => EN24.get(id)).find((x) => x && x.text.includes("2026"));
    if (!n) throw new Error("precondition: neither art_113.sub_2 nor art_113 (2024) contains the token 2026");
    const quote = n.text.replace("2026", "2027");
    const r = verifyCitation({ quote, claimed_ref: n.id, as_of: "2025-01-01", lang: "en" });
    expect(r.status).toBe("mismatch_hard_token");
    const mm = r.hard_token_mismatches ?? [];
    expect(mm.some((m) => m.in_quote.includes("2027") && m.in_corpus.includes("2026"))).toBe(true);
  });
  it("fewer than 6 tokens -> too_short", () => {
    expect(verifyCitation({ quote: "shall apply from", as_of: "2026-09-01", lang: "en" }).status).toBe("too_short");
  });
  it("unrelated text -> not_found", () => {
    const r = verifyCitation({
      quote: "The quick brown fox jumps over the lazy dog near the quiet river bank at dawn",
      as_of: "2026-09-01",
      lang: "en",
    });
    expect(r.status).toBe("not_found");
  });
  it("DE wording checked as EN -> found_other_language, language_check differs", () => {
    const n = need(DE26, "art_3.pt_1");
    if (tokens(n.text).length < 6) throw new Error("precondition: DE art_3.pt_1 shorter than 6 tokens");
    const r = verifyCitation({ quote: n.text, claimed_ref: "art_3.pt_1", as_of: "2026-09-01", lang: "en" });
    expect(r.status).toBe("found_other_language");
    expect(r.found_in_lang).toBe("de");
    expect(r.language_check.result).toBe("differs");
    expect(r.language_check.detected_lang).toBe("de");
  });
  it("unparsable claimed_ref still searches and warns", () => {
    const n = unchangedArt5();
    const r = verifyCitation({ quote: n.text, claimed_ref: "Section 7 of the thing", as_of: "2026-09-01", lang: "en" });
    expect(r.claimed_ref_id).toBeNull();
    expect(r.warnings ?? []).toContain("unparsed_ref");
    expect(["exact", "fuzzy"]).toContain(r.status);
  });
});

describe("tools api golden: V1 deadlines", () => {
  it("Article 5 before and after 2 February 2025", () => {
    const n = unchangedArt5();
    const before = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2024-12-01", lang: "en" });
    expect(before.version_checked).toBe(V2024);
    expect(before.status).toBe("exact");
    expect(before.validity.state).toBe("not_yet_applicable_until");
    expect(before.validity.until).toBe("2025-02-02");
    const after = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2025-03-01", lang: "en" });
    expect(after.validity.state).toBe("in_force_at_as_of");
  });
  it("data/deadlines.json has both versions with default and rules", () => {
    const p = join(ROOT, "data/deadlines.json");
    expect(existsSync(p)).toBe(true);
    const d = JSON.parse(readFileSync(p, "utf8")) as { versions: Record<string, { default: unknown; rules: unknown[] }> };
    for (const v of [V2024, V2026]) {
      const block = d.versions[v];
      expect(block).toBeDefined();
      expect(block?.default).toBeDefined();
      expect(Array.isArray(block?.rules) && (block?.rules.length ?? 0) > 0).toBe(true);
    }
  });
});

describe("tools api golden: ref parser", () => {
  it.each([
    ["Article 50(1)", "art_50.par_1"],
    ["Article 50(1)(a)", "art_50.par_1.a"],
    ["Art. 50 Abs. 1 Buchst. a", "art_50.par_1.a"],
    ["Annex III, point 1(a)", "anx_3.pt_1.a"],
    ["Anhang III Nummer 1 Buchstabe a", "anx_3.pt_1.a"],
    ["Recital 12", "rec_12"],
    ["Erwägungsgrund 12", "rec_12"],
    ["Article 4a(1)", "art_4a.par_1"],
    ["art_4a.par_2", "art_4a.par_2"],
  ])("%s -> %s", (ref, id) => {
    expect(parseRef(ref)).toBe(id);
  });
  it("returns null for unparsable refs", () => {
    expect(parseRef("Section 7 of the thing")).toBeNull();
  });
});

describe("tools api golden: determinism", () => {
  it("same input, identical output, no timestamps", () => {
    const n = unchangedArt5();
    const a = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2026-09-01", lang: "en" });
    const b = verifyCitation({ quote: n.text, claimed_ref: n.id, as_of: "2026-09-01", lang: "en" });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toMatch(/created_at|timestamp|checked_at/);
  });
});

describe("tools api golden: MCP stdio server", () => {
  it(
    "lists exactly the three read-only tools and answers a call",
    async () => {
      const transport = new StdioClientTransport({ command: "npx", args: ["tsx", "src/mcp/server.ts"], cwd: ROOT });
      const client = new Client({ name: "golden-tools-api", version: "0.0.0" });
      try {
        await client.connect(transport);
        const { tools } = await client.listTools();
        expect(tools.map((t) => t.name).sort()).toEqual(["aiact_diff", "aiact_get_provision", "aiact_verify_citation"]);
        for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
        const res = await client.callTool({ name: "aiact_get_provision", arguments: { id: "art_50", version: V2024, lang: "en" } });
        const content = (res as { content: Array<{ type: string; text?: string }> }).content;
        expect(content[0]?.type).toBe("text");
        const parsed = JSON.parse(content[0]?.text ?? "{}") as { found?: boolean; node?: { id?: string } };
        expect(parsed.found).toBe(true);
        expect(parsed.node?.id).toBe("art_50");
        const v = await client.callTool({
          name: "aiact_verify_citation",
          arguments: { quote: unchangedArt5().text, claimed_ref: unchangedArt5().id, as_of: "2026-09-01", lang: "en" },
        });
        const vc = (v as { content: Array<{ type: string; text?: string }> }).content;
        expect((JSON.parse(vc[0]?.text ?? "{}") as { status?: string }).status).toBe("exact");
      } finally {
        await client.close();
      }
    },
    90_000,
  );
});
