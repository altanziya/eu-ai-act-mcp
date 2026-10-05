/**
 * Read-only access to the parsed corpus (data/corpus/<celex>.<lang>.json), shared by the tools.
 * Files are read once per process; no network, no clock.
 */
import { readFileSync } from "node:fs";
import { corpusPath, V2024, V2026 } from "../config.js";
import type { Lang } from "../config.js";
import type { CorpusFile, ProvisionNode } from "../parser/types.js";

export type { Lang };
export type Version = typeof V2024 | typeof V2026;
export const VERSIONS: readonly Version[] = [V2024, V2026];
export const AMENDING_ACT = "32026R1744";
/** First day on which the consolidated version (after the Omnibus) is the version checked. */
export const CONSOLIDATED_FROM = "2026-07-27";

export const isVersion = (v: unknown): v is Version => v === V2024 || v === V2026;
export const isLang = (l: unknown): l is Lang => l === "en" || l === "de";
export const otherVersion = (v: Version): Version => (v === V2024 ? V2026 : V2024);
export const otherLang = (l: Lang): Lang => (l === "en" ? "de" : "en");

export interface CorpusIndex {
  version: Version;
  lang: Lang;
  nodes: ProvisionNode[];
  byId: Map<string, ProvisionNode>;
  /** Direct children per node id, in document order. */
  children: Map<string, ProvisionNode[]>;
}

const cache = new Map<string, CorpusIndex>();

export function loadCorpus(version: Version, lang: Lang): CorpusIndex {
  const key = `${version}.${lang}`;
  let hit = cache.get(key);
  if (!hit) {
    const file = JSON.parse(readFileSync(corpusPath(version, lang), "utf8")) as CorpusFile;
    const byId = new Map(file.nodes.map((n) => [n.id, n]));
    const children = new Map<string, ProvisionNode[]>();
    for (const n of file.nodes) {
      if (n.parent === null) continue;
      const list = children.get(n.parent);
      if (list) list.push(n);
      else children.set(n.parent, [n]);
    }
    hit = { version, lang, nodes: file.nodes, byId, children };
    cache.set(key, hit);
  }
  return hit;
}

/** All descendants of `id` in document order (depth first, which is `order` by construction). */
export function descendants(idx: CorpusIndex, id: string): ProvisionNode[] {
  const out: ProvisionNode[] = [];
  const walk = (parent: string): void => {
    for (const c of idx.children.get(parent) ?? []) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(id);
  out.sort((a, b) => a.order - b.order);
  return out;
}

/** The node and its ancestors, nearest first. */
export function ancestorChain(idx: CorpusIndex, id: string): ProvisionNode[] {
  const chain: ProvisionNode[] = [];
  let cur = idx.byId.get(id);
  while (cur) {
    chain.push(cur);
    cur = cur.parent === null ? undefined : idx.byId.get(cur.parent);
  }
  return chain;
}

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Today as ISO date (UTC); only used where `as_of` is omitted. */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Version checked for an `as_of` date: before the consolidated version existed, the Official Journal version. */
export const versionForDate = (asOf: string): Version => (asOf < CONSOLIDATED_FROM ? V2024 : V2026);
