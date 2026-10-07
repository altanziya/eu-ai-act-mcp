/**
 * Golden tests for the parser, the diff and the H3 measurements. The expected values were written before the
 * implementation and do not follow it.
 *
 * Expected npm scripts in package.json:
 *   test   vitest run                      (picks up tests/golden and tests/unit)
 *   parse  deterministic parser: data/raw/<celex>.<lang>.xhtml -> data/corpus/<celex>.<lang>.json (+ data/diff/<lang>.json)
 *   h3     scripts/h3.ts -> data/h3.json
 * Dev dependencies needed to compile this file under `tsc --noEmit`: vitest, @types/node.
 *
 * Expected corpus file: JSON array of nodes, or an object with a `nodes` array/map. Node fields:
 * id, type, parent, heading, text, hash, order. Types used here: article, recital, annex, paragraph.
 * IDs are logical paths: art_3, art_50.par_1, art_4a, rec_12. `parent` is the parent node id.
 *
 * Missing files or a missing `parse` script never crash the run: each test fails (or the
 * determinism test is skipped) with an explicit message.
 * Set GOLDEN_ROOT to point the tests at another repo root (default: process.cwd()).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.env.GOLDEN_ROOT ?? process.cwd();
const V2024 = "32024R1689";
const V2026 = "02024R1689-20260727";
const LANGS = ["en", "de"] as const;
type Lang = (typeof LANGS)[number];

interface Prov {
  id: string;
  type: string;
  parent: string | null;
  heading: string;
  text: string;
  hash: string;
  order: number;
}

function corpusRel(version: string, lang: Lang): string {
  return `data/corpus/${version}.${lang}.json`;
}

function asNodeArray(parsed: unknown, rel: string): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed !== null && typeof parsed === "object") {
    const n = (parsed as { nodes?: unknown }).nodes;
    if (Array.isArray(n)) return n;
    if (n !== null && typeof n === "object") return Object.values(n as Record<string, unknown>);
  }
  throw new Error(`${rel}: expected a JSON array of nodes or an object with a "nodes" array/map`);
}

const cache = new Map<string, Prov[]>();

function load(version: string, lang: Lang): Prov[] {
  const rel = corpusRel(version, lang);
  const hit = cache.get(rel);
  if (hit) return hit;
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    throw new Error(`Missing corpus file ${rel}. It must be produced by \`npm run parse\`.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    throw new Error(`${rel} is not valid JSON: ${String(e)}`);
  }
  const nodes = asNodeArray(parsed, rel).map((raw, i): Prov => {
    const n = (raw ?? {}) as Record<string, unknown>;
    if (typeof n.id !== "string" || typeof n.type !== "string") {
      throw new Error(`${rel}: node #${i} lacks string fields "id" and "type"`);
    }
    return {
      id: n.id,
      type: n.type,
      parent: typeof n.parent === "string" ? n.parent : null,
      heading: typeof n.heading === "string" ? n.heading : "",
      text: typeof n.text === "string" ? n.text : "",
      hash: typeof n.hash === "string" ? n.hash : "",
      order: typeof n.order === "number" ? n.order : -1,
    };
  });
  cache.set(rel, nodes);
  return nodes;
}

const ofType = (nodes: Prov[], type: string): Prov[] => nodes.filter((n) => n.type === type);

function node(nodes: Prov[], id: string, file: string): Prov {
  const hit = nodes.find((n) => n.id === id);
  if (!hit) throw new Error(`node ${id} not found in ${file}`);
  return hit;
}

/** Text of a node plus all descendants (logical path prefix `<id>.`). */
function subtreeText(nodes: Prov[], id: string, file: string): string {
  const root = node(nodes, id, file);
  return [root, ...nodes.filter((n) => n.id.startsWith(`${id}.`))].map((n) => `${n.heading}\n${n.text}`).join("\n");
}

function expectedArticleIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `art_${i + 1}`);
}

describe("parser and diff golden: 2024 EN (32024R1689)", () => {
  const file = corpusRel(V2024, "en");

  it("has exactly 113 articles art_1..art_113", () => {
    const articles = ofType(load(V2024, "en"), "article").map((n) => n.id);
    const expected = expectedArticleIds(113);
    expect(articles.filter((id) => !expected.includes(id)), "unexpected article ids").toEqual([]);
    expect(expected.filter((id) => !articles.includes(id)), "missing article ids").toEqual([]);
    expect(articles.length, "article node count (duplicates?)").toBe(113);
  });

  it("has 180 recitals", () => {
    expect(ofType(load(V2024, "en"), "recital").length).toBe(180);
  });

  it("has 13 annexes", () => {
    expect(ofType(load(V2024, "en"), "annex").length).toBe(13);
  });

  it("art_113 contains the four application dates", () => {
    const text = subtreeText(load(V2024, "en"), "art_113", file);
    for (const token of ["2 February 2025", "2 August 2025", "2 August 2026", "2 August 2027"]) {
      expect(text.includes(token), `art_113 lacks "${token}"`).toBe(true);
    }
  });

  it("art_3 heading contains 'Definitions', art_5 heading contains 'Prohibited'", () => {
    const nodes = load(V2024, "en");
    expect(node(nodes, "art_3", file).heading).toContain("Definitions");
    expect(node(nodes, "art_5", file).heading).toContain("Prohibited");
  });

  it("art_50 has at least 4 paragraph children", () => {
    const nodes = load(V2024, "en");
    node(nodes, "art_50", file);
    const paragraphs = nodes.filter((n) => n.type === "paragraph" && n.parent === "art_50");
    expect(paragraphs.length, "paragraph nodes with parent art_50").toBeGreaterThanOrEqual(4);
  });
});

describe("parser and diff golden: 2026 EN (02024R1689-20260727)", () => {
  const file = corpusRel(V2026, "en");

  it("contains art_4a and art_75a", () => {
    const nodes = load(V2026, "en");
    for (const id of ["art_4a", "art_75a"]) {
      expect(nodes.some((n) => n.type === "article" && n.id === id), `${id} missing in ${file}`).toBe(true);
    }
  });

  it("has at least 113 articles", () => {
    expect(ofType(load(V2026, "en"), "article").length).toBeGreaterThanOrEqual(113);
  });
});

describe("parser and diff golden: DE mirror", () => {
  for (const [label, version] of [["2024", V2024], ["2026", V2026]] as const) {
    it(`${label}: DE has the same article and recital counts as EN`, () => {
      const en = load(version, "en");
      const de = load(version, "de");
      expect(ofType(de, "article").length, "DE article count").toBe(ofType(en, "article").length);
      expect(ofType(de, "recital").length, "DE recital count").toBe(ofType(en, "recital").length);
    });

    it(`${label}: DE art_3 heading contains 'Begriffsbestimmungen'`, () => {
      expect(node(load(version, "de"), "art_3", corpusRel(version, "de")).heading).toContain("Begriffsbestimmungen");
    });
  }
});

describe("parser and diff golden: diff output (smoke)", () => {
  for (const lang of LANGS) {
    it(`data/diff/${lang}.json exists and names the five diff classes`, () => {
      const rel = `data/diff/${lang}.json`;
      const abs = join(ROOT, rel);
      if (!existsSync(abs)) throw new Error(`Missing ${rel} (diff 2024->2026 per language).`);
      const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
      expect(parsed !== null && typeof parsed === "object", `${rel} must be a JSON object or array`).toBe(true);
      const flat = JSON.stringify(parsed);
      for (const cls of ["added", "removed", "changed", "moved", "unchanged"]) {
        expect(flat.includes(`"${cls}"`), `${rel} does not mention class "${cls}"`).toBe(true);
      }
    });
  }
});

function npmScripts(): Record<string, unknown> {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, unknown> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

const hasParseScript = typeof npmScripts().parse === "string";

describe("parser and diff golden: determinism", () => {
  it.skipIf(!hasParseScript)(
    hasParseScript
      ? "a second `npm run parse` yields byte-identical corpus files"
      : "determinism (SKIPPED: package.json has no npm script `parse`)",
    { timeout: 300_000 },
    () => {
      const files = ([V2024, V2026] as const).flatMap((v) => LANGS.map((l) => corpusRel(v, l)));
      const snapshot = () =>
        files.map((rel) => {
          const abs = join(ROOT, rel);
          if (!existsSync(abs)) throw new Error(`Missing corpus file ${rel}; run \`npm run parse\` first.`);
          const bytes = readFileSync(abs);
          const nodes = asNodeArray(JSON.parse(bytes.toString("utf8")), rel) as Array<{ hash?: unknown }>;
          return {
            rel,
            sha: createHash("sha256").update(bytes).digest("hex"),
            hashes: nodes.map((n) => String(n.hash ?? "")).join(","),
          };
        });
      const before = snapshot();
      const run = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "parse"], { cwd: ROOT, encoding: "utf8" });
      expect(run.status, `npm run parse failed:\n${String(run.stdout).slice(-1500)}\n${String(run.stderr).slice(-1500)}`).toBe(0);
      const after = snapshot();
      expect(after.filter((a, i) => a.hashes !== before[i]?.hashes).map((a) => a.rel), "files with differing node hash lists").toEqual([]);
      expect(after.filter((a, i) => a.sha !== before[i]?.sha).map((a) => a.rel), "files that are not byte-identical").toEqual([]);
    },
  );
});
