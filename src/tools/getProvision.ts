/** aiact_get_provision: one node (with all descendants) of a corpus version and language. */
import { V2024, V2026 } from "../config.js";
import type { ProvisionNode } from "../parser/types.js";
import { formatRef } from "./formatRef.js";
import { descendants, isIsoDate, isLang, isVersion, otherVersion, versionForDate } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { CorpusIndex, Lang, Version } from "./corpus.js";
import { resolveDeadline } from "./deadlines.js";
import { loadDeadlines } from "./deadlines-fs.js";
import type { Validity } from "./deadlines.js";
import { todayIso } from "./today.js";
import { notice } from "./notice.js";
import { parseRef } from "./refParser.js";
import type { Notice } from "./notice.js";

export interface GetProvisionInput {
  id: string;
  /** Reference date (YYYY-MM-DD); default today. Without `version` the version in force on this date is returned. */
  as_of?: string;
  /** Explicit version; wins over `as_of`. */
  version?: Version;
  lang?: Lang;
  include_children?: boolean;
}
export interface StructureRef {
  id: string;
  citation: string;
}
export interface Structure {
  parent: StructureRef | null;
  /** Other children of the parent in the same version, in document order (articles: the article before and after, and every article of the same number, e.g. 60 and 60a). At most MAX_SIBLINGS. */
  siblings: Array<StructureRef & { new_in_version?: true }>;
  /** Direct children, in document order. */
  children: StructureRef[];
}
export const MAX_SIBLINGS = 30;

export interface GetProvisionResult {
  found: boolean;
  version: Version;
  lang: Lang;
  /** The reference date used (input or today). */
  as_of: string;
  /** Application state of the node in the returned version on `as_of` (the deadline table, as `validity` of verify). */
  applicability?: Validity;
  node?: ProvisionNode;
  /** Where the node sits: parent, neighbouring provisions (including ones inserted by the 2026 amendment, flagged `new_in_version`) and direct children. */
  structure?: Structure;
  /** All descendants in document order (only with include_children, which defaults to true). */
  children?: ProvisionNode[];
  /** Heading and text of the node and, with include_children, all descendants, in `order`, joined by "\n". */
  text_full?: string;
  reason?: "unknown_id" | "not_in_consolidated_version" | "not_in_version";
  /** The same id in the other version, when the requested version does not contain it (F66: recitals). */
  fallback?: { version: Version; node: ProvisionNode };
  notice: Notice;
}

const ROOT_TYPES = new Set(["article", "annex", "recital"]);
/** `art_60a` -> `art_60` (the number part of a root id), for finding articles inserted with a letter suffix. */
const rootNumber = (id: string): string => /^([a-z]+_\d+)[a-z]*$/.exec(id)?.[1] ?? id;

function structureOf(idx: CorpusIndex, other: CorpusIndex, node: ProvisionNode, lang: Lang): Structure {
  const ref = (n: ProvisionNode): StructureRef => ({ id: n.id, citation: formatRef(n.id, lang) });
  const parent = node.parent === null ? undefined : idx.byId.get(node.parent);
  let sibs: ProvisionNode[];
  if (ROOT_TYPES.has(node.type)) {
    // articles, annexes, recitals: the neighbours in document order plus everything of the same number (60, 60a, 60b)
    const roots = idx.nodes.filter((n) => n.type === node.type);
    const number = rootNumber(node.id);
    const family = roots.map((n, i) => (rootNumber(n.id) === number ? i : -1)).filter((i) => i >= 0);
    const keep = new Set<string>();
    for (const i of [...family, (family[0] as number) - 1, (family[family.length - 1] as number) + 1]) if (roots[i]) keep.add((roots[i] as ProvisionNode).id);
    sibs = roots.filter((n) => keep.has(n.id));
  } else {
    sibs = parent ? (idx.children.get(parent.id) ?? []) : idx.nodes.filter((n) => n.parent === null && n.type === node.type);
  }
  sibs = sibs.filter((n) => n.id !== node.id);
  if (sibs.length > MAX_SIBLINGS) {
    // the nearest ones in document order (by distance of `order`), kept in document order
    sibs = [...sibs].sort((a, b) => Math.abs(a.order - node.order) - Math.abs(b.order - node.order) || a.order - b.order).slice(0, MAX_SIBLINGS).sort((a, b) => a.order - b.order);
  }
  // "new" only makes sense for the consolidated text: a node missing from it was removed, not inserted
  const flagNew = idx.version === V2026;
  return {
    parent: parent ? ref(parent) : null,
    siblings: sibs.map((n) => ({ ...ref(n), ...(flagNew && !other.byId.has(n.id) ? { new_in_version: true as const } : {}) })),
    children: (idx.children.get(node.id) ?? []).map(ref),
  };
}

const textOf = (nodes: ProvisionNode[]): string => nodes.flatMap((n) => [n.heading, n.text]).filter((s) => s !== "").join("\n");

export function getProvision(input: GetProvisionInput): GetProvisionResult {
  const asOf = input.as_of ?? todayIso();
  if (!isIsoDate(asOf)) throw new Error(`as_of must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(asOf)}`);
  const version = input.version ?? versionForDate(asOf);
  const lang = input.lang ?? "en";
  if (!isVersion(version)) throw new Error(`unknown version ${String(version)}`);
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const includeChildren = input.include_children ?? true;
  const id = parseRef(input.id) ?? input.id; // ids pass through; human citations ("Article 50(1)") are resolved
  const idx = loadCorpus(version, lang);
  const node = idx.byId.get(id);
  if (node) {
    const kids = includeChildren ? descendants(idx, node.id) : [];
    return {
      found: true,
      version,
      lang,
      as_of: asOf,
      applicability: resolveDeadline(version, node, idx.byId, asOf, loadDeadlines()),
      node,
      structure: structureOf(idx, loadCorpus(otherVersion(version), lang), node, lang),
      ...(includeChildren ? { children: kids } : {}),
      text_full: textOf([node, ...kids]),
      notice: notice([version]),
    };
  }
  const otherV = otherVersion(version);
  const other = loadCorpus(otherV, lang).byId.get(id);
  if (!other) return { found: false, version, lang, as_of: asOf, reason: "unknown_id", notice: notice([version]) };
  return {
    found: false,
    version,
    lang,
    as_of: asOf,
    reason: version === V2026 ? "not_in_consolidated_version" : "not_in_version",
    fallback: { version: otherV, node: other },
    notice: notice([version, otherV]),
  };
}

export { V2024, V2026 };
