/**
 * Isomorphic core of aiact_verify_citation (no node: imports; runs in the browser verify bundle). The corpus loader and
 * the deadline table are passed in; verifyCitation.ts binds the data/ defaults for Node.
 *
 * aiact_verify_citation: V0 (does the quoted wording exist, and where), V1 (does it apply on `as_of`, from the
 * deadline table) and V2 (language check) as separate fields. Deterministic, no LLM, no network.
 * Specification: process/designs/ai-act-verifier-benchmark.md "aiact_verify_citation"; README "Verification levels V0-V2".
 *
 * Search order (precedence): (version_checked, lang) -> (other version, lang) -> (version_checked, other lang) ->
 * (other version, other lang). Within the first corpus that has an exact/fuzzy hit: a hit at the claimed pinpoint
 * (the node or a descendant of it) wins, then a unique hit elsewhere, then `multiple_matches`. Exact/fuzzy hits anywhere
 * beat `mismatch_hard_token`; a quote across several nodes of one article (`multi_node`) is tried last.
 */
import { V2024, V2026 } from "../constants.js";
import type { ProvisionNode } from "../parser/types.js";
import { AMENDING_ACT, isIsoDate, isLang, otherLang, otherVersion, versionForDate } from "./corpus.js";
import type { CorpusIndex, CorpusLoader, Lang, Version } from "./corpus.js";
import { resolveDeadline } from "./deadlines.js";
import type { DeadlineTable, Validity } from "./deadlines.js";
import { comparable, detectLang, MIN_TOKENS, matchSegments, prepareQuote, round4, tokenize } from "./match.js";
import type { PreparedQuote, SegmentMatch, Tok } from "./match.js";
import { notice } from "./notice.js";
import type { Notice } from "./notice.js";
import { parseRef } from "./refParser.js";

export type VerifyStatus =
  | "exact"
  | "fuzzy"
  | "found_at_other_provision"
  | "found_other_version"
  | "found_other_language"
  | "multiple_matches"
  | "mismatch_hard_token"
  | "multi_node"
  | "too_short"
  | "not_found";

export interface VerifyInput {
  quote: string;
  claimed_ref?: string;
  /** ISO date (YYYY-MM-DD), required: the library has no default (the MCP server supplies today). */
  as_of: string;
  lang?: Lang;
}
export interface MatchInfo {
  provision_id: string;
  version_id: Version;
  lang: Lang;
  similarity: number;
  matched_text: string;
}
export interface Candidate {
  provision_id: string;
  version_id: Version;
  lang: Lang;
  similarity?: number;
  matched_text: string;
}
export interface TokenPair {
  in_quote: string;
  in_corpus: string;
}
export interface VerifyResult {
  status: VerifyStatus;
  as_of: string;
  lang: Lang;
  version_checked: Version;
  claimed_ref_input?: string;
  claimed_ref_id?: string | null;
  match?: MatchInfo;
  provision_id?: string;
  found_in_version?: Version;
  found_in_lang?: Lang;
  hard_token_mismatches?: TokenPair[];
  soft_token_diffs?: TokenPair[];
  candidates?: Candidate[];
  warnings?: string[];
  validity: Validity;
  language_check: { result: "matches" | "differs" | "not_checked"; detected_lang?: Lang };
  support_checked: false;
  notice: Notice;
}

// ---------------------------------------------------------------------------------------------------------------
// Token caches
// ---------------------------------------------------------------------------------------------------------------

interface NodeTokens {
  toks: Tok[];
  set: Set<string>;
}
const tokenCache = new WeakMap<ProvisionNode, NodeTokens>();
function tokensOf(node: ProvisionNode): NodeTokens {
  let hit = tokenCache.get(node);
  if (!hit) {
    const toks = tokenize(node.text);
    hit = { toks, set: new Set(toks.map((t) => t.norm)) };
    tokenCache.set(node, hit);
  }
  return hit;
}

interface Group {
  nodes: ProvisionNode[];
  toks: Tok[];
  /** Index into `nodes` per token. */
  owner: number[];
  set: Set<string>;
}
const groupCache = new WeakMap<CorpusIndex, Group[]>();

const ROOT_TYPES = new Set(["article", "annex", "recital"]);
function groupsOf(idx: CorpusIndex): Group[] {
  let hit = groupCache.get(idx);
  if (!hit) {
    const byRoot = new Map<string, ProvisionNode[]>();
    const rootOf = new Map<string, string>();
    for (const n of idx.nodes) {
      if (n.text === "") continue;
      let root = n.id;
      let cur: ProvisionNode | undefined = n;
      while (cur) {
        if (ROOT_TYPES.has(cur.type)) {
          root = cur.id;
          break;
        }
        cur = cur.parent === null ? undefined : idx.byId.get(cur.parent);
      }
      rootOf.set(n.id, root);
      byRoot.set(root, [...(byRoot.get(root) ?? []), n]);
    }
    hit = [...byRoot.values()].map((nodes) => {
      const toks: Tok[] = [];
      const owner: number[] = [];
      nodes.forEach((node, i) => {
        for (const t of tokensOf(node).toks) {
          toks.push(t);
          owner.push(i);
        }
      });
      return { nodes, toks, owner, set: new Set(toks.map((t) => t.norm)) };
    });
    groupCache.set(idx, hit);
  }
  return hit;
}

// ---------------------------------------------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------------------------------------------

interface Hit {
  corpus: CorpusIndex;
  node: ProvisionNode;
  kind: "ok" | "hard";
  soft: number;
  hard: number;
  similarity: number;
  exact: boolean;
  matched_text: string;
  mm: SegmentMatch;
}

const overlaps = (pq: PreparedQuote, set: Set<string>): boolean => {
  let hit = 0;
  for (const s of pq.segments) for (const t of s.tokens) if (set.has(t.norm)) hit++;
  return hit * 2 >= pq.total;
};

const sliceText = (text: string, toks: readonly Tok[], start: number, end: number): string =>
  text.slice((toks[start] as Tok).start, (toks[end - 1] as Tok).end).replace(/\s+/g, " ");

function searchNodes(idx: CorpusIndex, pq: PreparedQuote): Hit[] {
  const hits: Hit[] = [];
  for (const node of idx.nodes) {
    if (node.text === "") continue;
    const nt = tokensOf(node);
    if (!overlaps(pq, nt.set)) continue;
    const mm = matchSegments(pq.segments, nt.toks, pq.total);
    if (!mm) continue;
    const pieces = mm.windows.map((w) => sliceText(node.text, nt.toks, w.start, w.end));
    const exact = mm.soft === 0 && mm.hard === 0 && pq.segments.every((s, i) => comparable(s.text) === comparable(pieces[i] as string));
    hits.push({
      corpus: idx,
      node,
      kind: mm.hard > 0 ? "hard" : "ok",
      soft: mm.soft,
      hard: mm.hard,
      similarity: round4(1 - mm.soft / pq.total),
      exact,
      matched_text: pieces.join(" [...] "),
      mm,
    });
  }
  return hits;
}

interface StreamHit {
  corpus: CorpusIndex;
  parts: Array<{ node: ProvisionNode; text: string }>;
  similarity: number;
  hard: number;
  hardMismatches: TokenPair[];
}

function searchStreams(idx: CorpusIndex, pq: PreparedQuote): StreamHit[] {
  const out: StreamHit[] = [];
  for (const g of groupsOf(idx)) {
    if (!overlaps(pq, g.set)) continue;
    const mm = matchSegments(pq.segments, g.toks, pq.total);
    if (!mm) continue;
    const parts: StreamHit["parts"] = [];
    for (const w of mm.windows) {
      let i = w.start;
      while (i < w.end) {
        const o = g.owner[i] as number;
        let j = i;
        while (j + 1 < w.end && g.owner[j + 1] === o) j++;
        const node = g.nodes[o] as ProvisionNode;
        parts.push({ node, text: sliceText(node.text, tokensOf(node).toks, tokensOf(node).toks.indexOf(g.toks[i] as Tok), tokensOf(node).toks.indexOf(g.toks[j] as Tok) + 1) });
        i = j + 1;
      }
    }
    if (new Set(parts.map((p) => p.node.id)).size < 2) continue;
    out.push({ corpus: idx, parts, similarity: round4(1 - mm.soft / pq.total), hard: mm.hard, hardMismatches: mm.hardMismatches });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Claimed reference
// ---------------------------------------------------------------------------------------------------------------

/** The claimed id as it exists in this corpus; `par_N` and `pt_N` readings are interchangeable ("Article 3(1)"). */
function resolveClaimed(idx: CorpusIndex, id: string): string | null {
  if (idx.byId.has(id)) return id;
  const segs = id.split(".");
  const swappable = segs.map((s, i) => (/^(?:par|pt)_/.test(s) ? i : -1)).filter((i) => i >= 0);
  for (let mask = 1; mask < 1 << swappable.length; mask++) {
    const alt = [...segs];
    swappable.forEach((at, k) => {
      if (mask & (1 << k)) alt[at] = (alt[at] as string).startsWith("par_") ? `pt_${(alt[at] as string).slice(4)}` : `par_${(alt[at] as string).slice(3)}`;
    });
    if (idx.byId.has(alt.join("."))) return alt.join(".");
  }
  return null;
}

const isUnder = (idx: CorpusIndex, node: ProvisionNode, ancestor: string): boolean => {
  let cur: ProvisionNode | undefined = node;
  while (cur) {
    if (cur.id === ancestor) return true;
    cur = cur.parent === null ? undefined : idx.byId.get(cur.parent);
  }
  return false;
};

/** Best hit: highest similarity, then fewest hard edits, then document order. */
const pickBest = (hits: Hit[]): Hit =>
  [...hits].sort((a, b) => b.similarity - a.similarity || a.hard - b.hard || a.node.order - b.node.order)[0] as Hit;

// ---------------------------------------------------------------------------------------------------------------
// V1
// ---------------------------------------------------------------------------------------------------------------

function validityOf(found: { corpus: CorpusIndex; node: ProvisionNode } | null, vc: Version, asOf: string, deadlines: DeadlineTable): Validity {
  if (!found) return { state: "unknown" };
  if (found.corpus.version !== vc) {
    return found.corpus.version === V2024 ? { state: "superseded_by", version: V2026 } : { state: "inserted_by", act: AMENDING_ACT };
  }
  return resolveDeadline(vc, found.node, found.corpus.byId, asOf, deadlines);
}

// ---------------------------------------------------------------------------------------------------------------

const RECITAL_NOTE = "recital: no application date; the preamble is not part of the consolidated text";

/**
 * Recitals are not superseded, they are absent from the consolidated version (F66, ADR-012): a citation of a recital
 * (claimed ref `rec_*`, or the best hit is a recital) is checked against the Official Journal version, the normal V0
 * status is returned, and V1 is `unknown` (a recital has no application date).
 */
export function verifyCitationWith(input: VerifyInput, load: CorpusLoader, deadlines: DeadlineTable): VerifyResult {
  const asOf = (input as { as_of?: string }).as_of;
  if (asOf === undefined || !isIsoDate(asOf)) {
    throw new Error(`as_of is required and must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(asOf)}`);
  }
  const claimed = input.claimed_ref !== undefined && input.claimed_ref.trim() !== "" ? parseRef(input.claimed_ref) : null;
  const recitalClaim = claimed?.startsWith("rec_") === true;
  const isRecitalHit = (r: VerifyResult): boolean => r.match?.provision_id.startsWith("rec_") === true;
  let r = verifyCore(input, asOf, load, deadlines, recitalClaim ? V2024 : undefined);
  if (!recitalClaim && r.version_checked !== V2024 && isRecitalHit(r)) r = verifyCore(input, asOf, load, deadlines, V2024);
  if (recitalClaim || isRecitalHit(r)) {
    r = { ...r, warnings: [...(r.warnings ?? []), "recital_not_in_consolidated_version"], validity: { state: "unknown", note: RECITAL_NOTE } };
  }
  return r;
}

function verifyCore(input: VerifyInput, asOf: string, load: CorpusLoader, deadlines: DeadlineTable, forcedVersion?: Version): VerifyResult {
  const lang = input.lang ?? "en";
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const vc = forcedVersion ?? versionForDate(asOf);
  const pq = prepareQuote(input.quote);

  const detected = detectLang(pq.flat);
  const language_check: VerifyResult["language_check"] =
    detected === null ? { result: "not_checked" } : { result: detected === lang ? "matches" : "differs", detected_lang: detected };

  const warnings: string[] = [];
  const claimedInput = input.claimed_ref !== undefined && input.claimed_ref.trim() !== "" ? input.claimed_ref : undefined;
  let claimedId: string | null | undefined;
  if (claimedInput !== undefined) {
    claimedId = parseRef(claimedInput);
    if (claimedId === null) warnings.push("unparsed_ref");
  }

  const head = (): Pick<VerifyResult, "as_of" | "lang" | "version_checked" | "claimed_ref_input" | "claimed_ref_id"> => ({
    as_of: asOf,
    lang,
    version_checked: vc,
    ...(claimedInput !== undefined ? { claimed_ref_input: claimedInput, claimed_ref_id: claimedId ?? null } : {}),
  });
  const finish = (
    status: VerifyStatus,
    extra: Partial<VerifyResult>,
    found: { corpus: CorpusIndex; node: ProvisionNode } | null,
    versions: Version[] = [],
  ): VerifyResult => ({
    status,
    ...head(),
    ...extra,
    ...(warnings.length > 0 ? { warnings: [...warnings] } : {}),
    validity: extra.validity ?? validityOf(found, vc, asOf, deadlines),
    language_check,
    support_checked: false,
    notice: notice([vc, ...versions]),
  });

  if (pq.total < MIN_TOKENS) return finish("too_short", {}, null);

  const ov = otherVersion(vc);
  const ol = otherLang(lang);
  const corpora: Array<{ idx: CorpusIndex; kind: "primary" | "version" | "lang" | "both" }> = [
    { idx: load(vc, lang), kind: "primary" },
    { idx: load(ov, lang), kind: "version" },
    { idx: load(vc, ol), kind: "lang" },
    { idx: load(ov, ol), kind: "both" },
  ];
  const results = corpora.map((c) => ({ ...c, hits: searchNodes(c.idx, pq) }));

  const matchOf = (h: Hit): MatchInfo => ({ provision_id: h.node.id, version_id: h.corpus.version, lang: h.corpus.lang, similarity: h.similarity, matched_text: h.matched_text });
  const candidateOf = (h: Hit): Candidate => ({ ...matchOf(h) });
  const diffs = (h: Hit): Partial<VerifyResult> => (h.mm.softDiffs.length > 0 ? { soft_token_diffs: h.mm.softDiffs } : {});

  // 1. exact / fuzzy anywhere
  for (const r of results) {
    const oks = r.hits.filter((h) => h.kind === "ok");
    if (oks.length === 0) continue;
    const claimedHere = claimedId ? resolveClaimed(r.idx, claimedId) : null;
    const atClaimed = claimedHere ? oks.filter((h) => isUnder(r.idx, h.node, claimedHere)) : [];
    const foundExtra: Partial<VerifyResult> = {
      ...(r.idx.version !== vc ? { found_in_version: r.idx.version } : {}),
      ...(r.idx.lang !== lang ? { found_in_lang: r.idx.lang } : {}),
    };
    const versions = r.idx.version !== vc ? [r.idx.version] : [];
    let chosen: Hit | undefined;
    if (atClaimed.length > 0) chosen = pickBest(atClaimed);
    else if (oks.length === 1) chosen = oks[0];
    if (!chosen) {
      return finish(
        "multiple_matches",
        { ...foundExtra, candidates: oks.slice(0, 20).map(candidateOf), validity: { state: "unknown", note: `${oks.length} nodes match the quote; no single location` } },
        null,
        versions,
      );
    }
    if (chosen.similarity === 1 && !chosen.exact) warnings.push("differs_in_case_or_punctuation");
    let status: VerifyStatus;
    if (r.kind === "primary") {
      const pinpointed = claimedId === undefined || claimedId === null || atClaimed.length > 0;
      status = pinpointed ? (chosen.exact ? "exact" : "fuzzy") : "found_at_other_provision";
    } else status = r.kind === "version" ? "found_other_version" : "found_other_language";
    return finish(
      status,
      { match: matchOf(chosen), ...(status === "found_at_other_provision" || r.kind !== "primary" ? { provision_id: chosen.node.id } : {}), ...foundExtra, ...diffs(chosen) },
      { corpus: r.idx, node: chosen.node },
      versions,
    );
  }

  // 2. hard-token mismatch (soft tokens agree, hard tokens differ)
  for (const r of results) {
    const hards = r.hits.filter((h) => h.kind === "hard");
    if (hards.length === 0) continue;
    const claimedHere = claimedId ? resolveClaimed(r.idx, claimedId) : null;
    const atClaimed = claimedHere ? hards.filter((h) => isUnder(r.idx, h.node, claimedHere)) : [];
    const best = [...(atClaimed.length > 0 ? atClaimed : hards)].sort((a, b) => a.hard - b.hard || b.similarity - a.similarity || a.node.order - b.node.order)[0] as Hit;
    return finish(
      "mismatch_hard_token",
      {
        match: matchOf(best),
        provision_id: best.node.id,
        ...(r.idx.version !== vc ? { found_in_version: r.idx.version } : {}),
        ...(r.idx.lang !== lang ? { found_in_lang: r.idx.lang } : {}),
        hard_token_mismatches: best.mm.hardMismatches,
        ...diffs(best),
      },
      { corpus: r.idx, node: best.node },
      r.idx.version !== vc ? [r.idx.version] : [],
    );
  }

  // 3. quote across several nodes of one article: clean (multi_node) first, then with hard-token differences
  const streamResults = corpora.map((r) => ({ r, streams: searchStreams(r.idx, pq) }));
  for (const wantHard of [false, true]) {
    for (const { r, streams: all } of streamResults) {
      const streams = all.filter((h) => (h.hard > 0) === wantHard);
      const first = streams[0];
      if (!first) continue;
      if (streams.length > 1) warnings.push("multiple_multi_node_matches");
      const parts = first.parts.map((p) => ({ provision_id: p.node.id, version_id: r.idx.version, lang: r.idx.lang, matched_text: p.text }));
      const firstNode = first.parts[0]?.node as ProvisionNode;
      return finish(
        wantHard ? "mismatch_hard_token" : "multi_node",
        {
          provision_id: firstNode.id,
          match: { provision_id: firstNode.id, version_id: r.idx.version, lang: r.idx.lang, similarity: first.similarity, matched_text: parts.map((p) => p.matched_text).join(" ") },
          ...(r.idx.version !== vc ? { found_in_version: r.idx.version } : {}),
          ...(r.idx.lang !== lang ? { found_in_lang: r.idx.lang } : {}),
          ...(wantHard ? { hard_token_mismatches: first.hardMismatches } : {}),
          candidates: parts,
        },
        { corpus: r.idx, node: firstNode },
        r.idx.version !== vc ? [r.idx.version] : [],
      );
    }
  }

  return finish("not_found", {}, null);
}
