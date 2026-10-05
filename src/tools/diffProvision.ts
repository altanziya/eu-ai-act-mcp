/** aiact_diff: what happened to a node between the Official Journal version and the consolidated version. */
import { readFileSync } from "node:fs";
import { diffPath, V2024, V2026 } from "../config.js";
import type { DiffResult } from "../diff/diff.js";
import { AMENDING_ACT, isLang, loadCorpus } from "./corpus.js";
import type { CorpusIndex, Lang } from "./corpus.js";
import { notice } from "./notice.js";
import type { Notice } from "./notice.js";

export type DiffStatus = "unchanged" | "changed" | "added" | "removed" | "moved" | "unknown_id";
export interface WordDiffOp {
  op: "equal" | "insert" | "delete";
  text: string;
}
export interface DescendantCounts {
  added: number;
  removed: number;
  changed: number;
  moved: number;
  unchanged: number;
}
export interface DiffProvisionResult {
  id: string;
  lang: Lang;
  status: DiffStatus;
  from_version: typeof V2024;
  to_version: typeof V2026;
  moved_to?: string;
  moved_from?: string;
  word_diff?: WordDiffOp[];
  descendants?: DescendantCounts;
  note?: string;
  amending_act: typeof AMENDING_ACT;
  notice: Notice;
}

interface DiffIndex {
  status: Map<string, { status: Exclude<DiffStatus, "unknown_id">; moved_to?: string; moved_from?: string }>;
  descendants: Map<string, DescendantCounts>;
}

const diffCache = new Map<Lang, DiffIndex>();

function buildIndex(lang: Lang): DiffIndex {
  const diff = JSON.parse(readFileSync(diffPath(lang), "utf8")) as DiffResult;
  const from = loadCorpus(V2024, lang);
  const to = loadCorpus(V2026, lang);
  const status: DiffIndex["status"] = new Map();
  for (const id of diff.unchanged) status.set(id, { status: "unchanged" });
  for (const c of diff.changed) status.set(c.id, { status: "changed" });
  for (const a of diff.added) status.set(a.id, { status: "added" });
  for (const r of diff.removed) status.set(r.id, { status: "removed" });
  for (const m of diff.moved) {
    status.set(m.from_id, { status: "moved", moved_to: m.to_id });
    status.set(m.to_id, { status: "moved", moved_from: m.from_id });
  }

  // Descendant counts: every diff entry is counted once for each ancestor of its node (in the corpus the node lives in).
  const counts = new Map<string, DescendantCounts>();
  const bump = (corpus: CorpusIndex, id: string, cls: keyof DescendantCounts, extraSkip?: Set<string>): void => {
    let cur = corpus.byId.get(id);
    cur = cur?.parent == null ? undefined : corpus.byId.get(cur.parent);
    while (cur) {
      if (!extraSkip?.has(cur.id)) {
        const c = counts.get(cur.id) ?? { added: 0, removed: 0, changed: 0, moved: 0, unchanged: 0 };
        c[cls]++;
        counts.set(cur.id, c);
      }
      cur = cur.parent === null ? undefined : corpus.byId.get(cur.parent);
    }
  };
  for (const id of diff.unchanged) bump(from, id, "unchanged");
  for (const c of diff.changed) bump(from, c.id, "changed");
  for (const a of diff.added) bump(to, a.id, "added");
  for (const r of diff.removed) bump(from, r.id, "removed");
  for (const m of diff.moved) {
    // a move counts once per ancestor; ancestors that are common to both ends (same id) are counted once
    const fromAnc = new Set<string>();
    let cur = from.byId.get(m.from_id);
    while (cur?.parent) {
      fromAnc.add(cur.parent);
      cur = from.byId.get(cur.parent);
    }
    bump(from, m.from_id, "moved");
    bump(to, m.to_id, "moved", fromAnc);
  }
  return { status, descendants: counts };
}

function index(lang: Lang): DiffIndex {
  let hit = diffCache.get(lang);
  if (!hit) {
    hit = buildIndex(lang);
    diffCache.set(lang, hit);
  }
  return hit;
}

/**
 * Word-level diff (whitespace-separated words of heading + text): common prefix and suffix are trimmed, the middle is
 * aligned by longest common subsequence. Adjacent operations of the same kind are merged. Deterministic: on ties
 * deletions come before insertions.
 */
export function wordDiff(a: string, b: string): WordDiffOp[] {
  const x = a.split(/\s+/).filter(Boolean);
  const y = b.split(/\s+/).filter(Boolean);
  let pre = 0;
  while (pre < x.length && pre < y.length && x[pre] === y[pre]) pre++;
  let suf = 0;
  while (suf < x.length - pre && suf < y.length - pre && x[x.length - 1 - suf] === y[y.length - 1 - suf]) suf++;
  const xm = x.slice(pre, x.length - suf);
  const ym = y.slice(pre, y.length - suf);
  const n = xm.length;
  const m = ym.length;
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = xm[i] === ym[j] ? (lcs[(i + 1) * w + j + 1] as number) + 1 : Math.max(lcs[(i + 1) * w + j] as number, lcs[i * w + j + 1] as number);
    }
  }
  const ops: WordDiffOp[] = [];
  const push = (op: WordDiffOp["op"], word: string): void => {
    const last = ops[ops.length - 1];
    if (last && last.op === op) last.text += ` ${word}`;
    else ops.push({ op, text: word });
  };
  for (const word of x.slice(0, pre)) push("equal", word);
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && xm[i] === ym[j]) {
      push("equal", xm[i] as string);
      i++;
      j++;
    } else if (i < n && (j >= m || (lcs[(i + 1) * w + j] as number) >= (lcs[i * w + j + 1] as number))) {
      push("delete", xm[i] as string);
      i++;
    } else {
      push("insert", ym[j] as string);
      j++;
    }
  }
  for (const word of x.slice(x.length - suf)) push("equal", word);
  return ops;
}

export function diffProvision(input: { id: string; lang?: Lang }): DiffProvisionResult {
  const lang = input.lang ?? "en";
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const idx = index(lang);
  const hit = idx.status.get(input.id);
  const base = { id: input.id, lang, from_version: V2024, to_version: V2026, amending_act: AMENDING_ACT, notice: notice([V2024, V2026]) } as const;
  if (!hit) return { ...base, status: "unknown_id" };
  const out: DiffProvisionResult = { ...base, status: hit.status };
  if (hit.moved_to) out.moved_to = hit.moved_to;
  if (hit.moved_from) out.moved_from = hit.moved_from;
  if (hit.status === "changed") {
    const a = loadCorpus(V2024, lang).byId.get(input.id);
    const b = loadCorpus(V2026, lang).byId.get(input.id);
    if (a && b) {
      const flat = (n: { heading: string; text: string }): string => [n.heading, n.text].filter((s) => s !== "").join(" ");
      out.word_diff = wordDiff(flat(a), flat(b));
    }
  }
  const d = idx.descendants.get(input.id);
  if (d) out.descendants = d;
  if (hit.status === "removed" && input.id.startsWith("rec_")) {
    out.note = "Recitals are not part of the consolidated version (F66); they remain citable through the Official Journal version.";
  }
  return out;
}
