/**
 * V1 deadline resolution from the deadline table data/deadlines.json (isomorphic; the file loader is deadlines-fs.ts; hand-transcribed from Article 113, see README "Deadline table").
 *
 * A node is matched against the rules through its chain (node, parent, grandparent, ...). A rule matches if one of its
 * `scope` entries is in the chain and no `except` entry is in the chain. The rule whose matching scope entry is nearest
 * to the node wins (ties: first in `rules`). No matching rule: the version's `default`. No default: `unknown`.
 */
import type { ProvisionNode } from "../parser/types.js";

export interface DeadlineRule {
  id: string;
  applies_from: string;
  scope?: string[];
  except?: string[];
  source_nodes: string[];
  note?: string;
  /** Later dates for sub-classes of the scope (e.g. high-risk systems under Annex I); between `applies_from` and the latest the result is unknown. */
  later_dates?: Array<{ applies_from: string; condition: string; source_node: string }>;
}
export interface DeadlineBlock {
  default?: DeadlineRule;
  rules: DeadlineRule[];
}
export interface DeadlineTable {
  versions: Record<string, DeadlineBlock>;
}

export interface Validity {
  state: "in_force_at_as_of" | "not_yet_applicable_until" | "superseded_by" | "inserted_by" | "unknown";
  until?: string;
  version?: string;
  act?: string;
  rule_id?: string;
  source_nodes?: string[];
  note?: string;
  /** Later application dates of sub-classes of AI systems that are still ahead of `as_of` (from the rule's `later_dates`). */
  conditional_dates?: Array<{ date: string; condition: string }>;
}

/** `chain`: the node and its ancestors, nearest first (ids). */
export function matchRule(block: DeadlineBlock, chain: readonly string[]): DeadlineRule | undefined {
  let best: { rule: DeadlineRule; distance: number } | undefined;
  for (const rule of block.rules) {
    if ((rule.except ?? []).some((e) => chain.includes(e))) continue;
    let distance = Number.POSITIVE_INFINITY;
    for (const s of rule.scope ?? []) {
      const at = chain.indexOf(s);
      if (at !== -1 && at < distance) distance = at;
    }
    if (distance === Number.POSITIVE_INFINITY) continue;
    if (!best || distance < best.distance) best = { rule, distance };
  }
  return best?.rule ?? block.default;
}

export function applyRule(rule: DeadlineRule, asOf: string): Validity {
  const upcoming = (rule.later_dates ?? []).filter((d) => d.applies_from > asOf).sort((a, b) => (a.applies_from < b.applies_from ? -1 : a.applies_from > b.applies_from ? 1 : 0));
  const conditional = upcoming.length > 0 ? { conditional_dates: upcoming.map((d) => ({ date: d.applies_from, condition: d.condition })) } : {};
  const base = { rule_id: rule.id, source_nodes: rule.source_nodes, ...conditional };
  if (asOf < rule.applies_from) return { state: "not_yet_applicable_until", until: rule.applies_from, ...base };
  const latest = (rule.later_dates ?? []).map((d) => d.applies_from).sort().pop();
  if (latest !== undefined && asOf < latest) {
    return { state: "unknown", ...base, note: `applies by class of AI system: from ${rule.applies_from} for some, from ${latest} for others (${rule.id})` };
  }
  return { state: "in_force_at_as_of", ...base };
}

/** V1 from the table for `node` in `version` (ancestors looked up in `byId` of the same corpus). */
export function resolveDeadline(version: string, node: ProvisionNode, byId: Map<string, ProvisionNode>, asOf: string, tbl: DeadlineTable): Validity {
  const block = tbl.versions[version];
  if (!block) return { state: "unknown" };
  const chain: string[] = [];
  let cur: ProvisionNode | undefined = node;
  while (cur) {
    chain.push(cur.id);
    cur = cur.parent === null ? undefined : byId.get(cur.parent);
  }
  const rule = matchRule(block, chain);
  return rule ? applyRule(rule, asOf) : { state: "unknown" };
}
