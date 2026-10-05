/**
 * H3 measurement (deterministic, no model):
 *
 *  mapped_2024_to_2026  share of 2024 nodes that have exactly one counterpart in the 2026 consolidated
 *                       version: same logical path (unchanged or changed) or a unique 1:1 text match at another
 *                       path (diff class "moved").
 *                       Scope: operative nodes (every type except `recital`). The consolidated EUR-Lex version
 *                       does not contain the recitals at all, so all 180 recitals are structurally unmappable;
 *                       counting them would measure the document type, not parser stability.
 *                       The all-node ratio is reported next to it (`mapped_2024_to_2026_all_nodes`).
 *  en_de_<version>      share of EN nodes (all types) whose logical path also exists in the DE corpus.
 *
 * Unmapped 2024 nodes (diff class "removed") are counted and listed; explaining them against 32026R1744
 * is separate work.
 */
import type { DiffResult } from "../diff/diff.js";
import type { ProvisionNode } from "../parser/types.js";

export interface MappedStats {
  /** Operative nodes in 2024 (all but recitals). */
  total: number;
  mapped: number;
  ratio: number;
  /** Same path, same hash / same path, different hash / unique text match at a different path. */
  unchanged: number;
  changed: number;
  moved: number;
  /** 2024 operative nodes without counterpart. */
  removed: string[];
  /** Same, but counting recitals too. */
  all_nodes: { total: number; mapped: number; ratio: number };
}

/** Round to 6 decimals so the JSON is stable and readable. */
export const ratio = (num: number, den: number): number => (den === 0 ? 0 : Math.round((num / den) * 1e6) / 1e6);

export function mappedStats(from: ProvisionNode[], diff: Omit<DiffResult, "lang" | "from" | "to">): MappedStats {
  const typeById = new Map(from.map((n) => [n.id, n.type]));
  const isOperative = (id: string): boolean => typeById.get(id) !== "recital";
  const unchanged = diff.unchanged.filter(isOperative).length;
  const changed = diff.changed.filter((c) => c.type !== "recital").length;
  const moved = diff.moved.filter((m) => isOperative(m.from_id)).length;
  const removed = diff.removed.filter((r) => r.type !== "recital").map((r) => r.id);
  const total = from.filter((n) => n.type !== "recital").length;
  const mapped = unchanged + changed + moved;
  const allMapped = diff.counts.unchanged + diff.counts.changed + diff.counts.moved;
  return {
    total,
    mapped,
    ratio: ratio(mapped, total),
    unchanged,
    changed,
    moved,
    removed,
    all_nodes: { total: from.length, mapped: allMapped, ratio: ratio(allMapped, from.length) },
  };
}

export interface EnDeStats {
  en_nodes: number;
  with_de_counterpart: number;
  ratio: number;
  missing_in_de: string[];
}

export function enDeStats(en: ProvisionNode[], de: ProvisionNode[]): EnDeStats {
  const deIds = new Set(de.map((n) => n.id));
  const missing = en.filter((n) => !deIds.has(n.id)).map((n) => n.id);
  const matched = en.length - missing.length;
  return { en_nodes: en.length, with_de_counterpart: matched, ratio: ratio(matched, en.length), missing_in_de: missing };
}
