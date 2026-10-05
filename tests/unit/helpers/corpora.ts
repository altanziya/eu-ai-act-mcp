/** Shared fixtures for the unit tests: the four raw XHTML files parsed once per test file (no network). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CELEX_IDS, LANGS, REPO_ROOT, V2024, V2026 } from "../../../src/config.js";
import { parseXhtmlToNodes } from "../../../src/parser/parse.js";
import type { ProvisionNode } from "../../../src/parser/types.js";

export { CELEX_IDS, LANGS, V2024, V2026 };
export type Lang = (typeof LANGS)[number];

export interface Case {
  celex: string;
  lang: Lang;
  label: string;
  rawFile: string;
}

export const ALL_CASES: Case[] = CELEX_IDS.flatMap((celex) =>
  LANGS.map((lang) => ({ celex, lang, label: `${celex}.${lang}`, rawFile: join(REPO_ROOT, "data/raw", `${celex}.${lang}.xhtml`) })),
);

const cache = new Map<string, { nodes: ProvisionNode[]; warnings: string[] }>();

export function parsed(c: Case): { nodes: ProvisionNode[]; warnings: string[] } {
  let hit = cache.get(c.label);
  if (!hit) {
    hit = parseXhtmlToNodes(readFileSync(c.rawFile, "utf8"));
    cache.set(c.label, hit);
  }
  return hit;
}

export const nodeMap = (nodes: ProvisionNode[]): Map<string, ProvisionNode> => new Map(nodes.map((n) => [n.id, n]));

export function mustGet(m: Map<string, ProvisionNode>, id: string, label: string): ProvisionNode {
  const n = m.get(id);
  if (!n) throw new Error(`${label}: node ${id} not found`);
  return n;
}
