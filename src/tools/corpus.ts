/**
 * Isomorphic corpus types and helpers shared by the tools and the browser verify bundle (no node: imports).
 * The file loader for data/corpus lives in corpus-fs.ts.
 */
import { V2024, V2026 } from "../constants.js";
import type { Lang } from "../constants.js";
import type { ProvisionNode } from "../parser/types.js";

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

/** Index over a node list (also used by unit tests with a constructed mini corpus). */
export function buildIndex(version: Version, lang: Lang, nodes: ProvisionNode[]): CorpusIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, ProvisionNode[]>();
  for (const n of nodes) {
    if (n.parent === null) continue;
    const list = children.get(n.parent);
    if (list) list.push(n);
    else children.set(n.parent, [n]);
  }
  return { version, lang, nodes, byId, children };
}

/** Corpus source for the tools; the default (corpus-fs.ts) reads data/corpus, a release context reads its own copy. */
export type CorpusLoader = (version: Version, lang: Lang) => CorpusIndex;

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

/** YYYY-MM-DD that is a real calendar date (2026-02-30 and 2026-09-31 are not). */
export const isIsoDate = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

/** Version checked for an `as_of` date: before the consolidated version existed, the Official Journal version. */
export const versionForDate = (asOf: string): Version => (asOf < CONSOLIDATED_FROM ? V2024 : V2026);
