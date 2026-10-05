/**
 * Isomorphic core of aiact_search (no node: imports; also runs in the browser). Corpus loader and deadline table are
 * passed in; search.ts binds the data/ defaults for Node.
 *
 * Ranking: BM25 (k1 1.2, b 0.75) over the nodes of the version in force on `as_of`, one document per node (its own
 * heading and text, descendants are separate documents). Tokens are lower-case Unicode words minus a short EN/DE
 * stopword list. An exact phrase hit (the query's content words as a contiguous sequence, stopwords ignored on both sides) adds a bonus. Leaves and
 * paragraphs are preferred over chapters and sections by the length normalisation of BM25 and a small type weight.
 * Deterministic: ties are broken by document order.
 */
import type { ProvisionNode } from "../parser/types.js";
import { isIsoDate, isLang, versionForDate } from "./corpus.js";
import type { CorpusIndex, CorpusLoader, Lang, Version } from "./corpus.js";
import { resolveDeadline } from "./deadlines.js";
import type { DeadlineTable, Validity } from "./deadlines.js";
import { formatRef } from "./formatRef.js";
import { notice } from "./notice.js";
import type { Notice } from "./notice.js";

export interface SearchInput {
  query: string;
  as_of?: string;
  lang?: Lang;
  /** Default 8, at most 20. */
  limit?: number;
}
export interface SearchHit {
  id: string;
  citation: string;
  heading?: string;
  snippet: string;
  score: number;
  applicability: Validity;
}
export interface SearchResult {
  as_of: string;
  version: Version;
  lang: Lang;
  results: SearchHit[];
  notice: Notice;
}

export const DEFAULT_LIMIT = 8;
export const MAX_LIMIT = 20;
export const SNIPPET_MAX = 240;
const K1 = 1.2;
const B = 0.75;
const PHRASE_BONUS = 0.5;

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by for from has have in into is it its of on or such that the their then there these this those to was were which will with shall " +
    "aber als am an auch auf aus bei bis das dass dem den der des die ein eine einer eines einem einen er es für hat im ist mit nach nicht oder sich sie sind so über und von vom war wird zu zum zur"
  ).split(" "),
);

export function tokenizeWords(text: string): Array<{ word: string; start: number; end: number }> {
  const out: Array<{ word: string; start: number; end: number }> = [];
  for (const m of text.normalize("NFC").matchAll(/[\p{L}\p{N}]+/gu)) {
    out.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

interface Doc {
  node: ProvisionNode;
  text: string;
  words: string[];
  /** `words` without stopwords, in order (phrase matching ignores stopwords). */
  content: string[];
  tf: Map<string, number>;
  weight: number;
}
interface Bm25Index {
  docs: Doc[];
  df: Map<string, number>;
  avgdl: number;
}

const TYPE_WEIGHT: Partial<Record<ProvisionNode["type"], number>> = { chapter: 0.6, section: 0.6, annex: 0.85, article: 0.85 };
const cache = new WeakMap<CorpusIndex, Bm25Index>();

function indexOf(idx: CorpusIndex): Bm25Index {
  let hit = cache.get(idx);
  if (hit) return hit;
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  let total = 0;
  for (const node of idx.nodes) {
    const text = [node.heading, node.text].filter((s) => s !== "").join(". ");
    if (text === "") continue;
    const words = tokenizeWords(text).map((t) => t.word);
    if (words.length === 0) continue;
    const tf = new Map<string, number>();
    for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    total += words.length;
    docs.push({ node, text, words, content: words.filter((w) => !STOPWORDS.has(w)), tf, weight: TYPE_WEIGHT[node.type] ?? 1 });
  }
  hit = { docs, df, avgdl: docs.length === 0 ? 1 : total / docs.length };
  cache.set(idx, hit);
  return hit;
}

const round4 = (x: number): number => Math.round(x * 1e4) / 1e4;

function containsPhrase(words: readonly string[], phrase: readonly string[]): boolean {
  const first = phrase[0] as string;
  for (let i = 0; i + phrase.length <= words.length; i++) {
    if (words[i] !== first) continue;
    let k = 1;
    while (k < phrase.length && words[i + k] === phrase[k]) k++;
    if (k === phrase.length) return true;
  }
  return false;
}

/** At most SNIPPET_MAX characters around the first occurrence of a query term; whitespace collapsed, cut at word boundaries. */
export function snippetOf(source: string, terms: ReadonlySet<string>): string {
  const text = source.replace(/\s+/g, " ").trim();
  if (text.length <= SNIPPET_MAX) return text;
  const first = tokenizeWords(text).find((t) => terms.has(t.word));
  const at = first ? first.start : 0;
  let start = Math.max(0, at - 80);
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    start = sp === -1 || sp > at ? start : sp + 1;
  }
  const lead = start > 0 ? "…" : "";
  let end = Math.min(text.length, start + SNIPPET_MAX - lead.length - 1);
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > at) end = sp;
  }
  const trail = end < text.length ? "…" : "";
  let out = `${lead}${text.slice(start, end).trim()}${trail}`;
  if (out.length > SNIPPET_MAX) out = `${out.slice(0, SNIPPET_MAX - 1)}…`;
  return out;
}

export function aiactSearchWith(input: SearchInput & { as_of: string }, load: CorpusLoader, deadlines: DeadlineTable): SearchResult {
  const asOf = input.as_of;
  if (!isIsoDate(asOf)) throw new Error(`as_of must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(asOf)}`);
  const lang = input.lang ?? "en";
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT)));
  const version = versionForDate(asOf);
  const base = { as_of: asOf, version, lang, notice: notice([version]) };
  const idx = load(version, lang);
  const bm = indexOf(idx);

  const qAll = tokenizeWords(input.query).map((t) => t.word);
  const qTerms = [...new Set(qAll.filter((w) => !STOPWORDS.has(w)))];
  if (qTerms.length === 0 && qAll.length > 0) qTerms.push(...new Set(qAll));
  if (qTerms.length === 0) return { ...base, results: [] };

  const n = bm.docs.length;
  const idf = new Map<string, number>();
  for (const t of qTerms) {
    const df = bm.df.get(t) ?? 0;
    idf.set(t, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }
  const qContent = qAll.filter((w) => !STOPWORDS.has(w));
  const phrase = qContent.length >= 2 ? qContent : null;
  const phraseBonus = qTerms.reduce((s, t) => s + (idf.get(t) as number), 0) * PHRASE_BONUS;

  const scored: Array<{ doc: Doc; score: number }> = [];
  for (const doc of bm.docs) {
    let score = 0;
    for (const t of qTerms) {
      const f = doc.tf.get(t);
      if (!f) continue;
      score += (idf.get(t) as number) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.words.length) / bm.avgdl)));
    }
    if (score === 0) continue;
    if (phrase && containsPhrase(doc.content, phrase)) score += phraseBonus;
    scored.push({ doc, score: score * doc.weight });
  }
  scored.sort((a, b) => b.score - a.score || a.doc.node.order - b.doc.node.order);

  const terms = new Set(qTerms);
  const results = scored.slice(0, limit).map(({ doc, score }): SearchHit => {
    const { node } = doc;
    let heading = node.heading;
    for (let cur: ProvisionNode | undefined = node; heading === "" && cur; cur = cur.parent === null ? undefined : idx.byId.get(cur.parent)) heading = cur.heading;
    return {
      id: node.id,
      citation: formatRef(node.id, lang),
      ...(heading !== "" ? { heading } : {}),
      snippet: snippetOf(node.text !== "" ? node.text : node.heading, terms),
      score: round4(score),
      applicability: resolveDeadline(version, node, idx.byId, asOf, deadlines),
    };
  });
  return { ...base, results };
}
