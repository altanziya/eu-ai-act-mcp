/**
 * Isomorphic core of aiact_search (no node: imports; also runs in the browser). Corpus loader and deadline table are
 * passed in; search.ts binds the data/ defaults for Node.
 *
 * Ranking: BM25 (k1 1.2, b 0.75) over the nodes of the version in force on `as_of`, one document per node (its own
 * heading and text, descendants are separate documents). Tokens are lower-case Unicode words minus a short EN/DE
 * stopword list, reduced by a light suffix stemmer (EN s/es/ies/ing/ed, DE en/e/n/s). Terms of the node's own heading
 * count three times, those of the nearest ancestor heading twice (not in the length). A small synonym table (penalty/fine/
 * sanction, Strafe/Sanktion/Geldbusse, KMU/SME, registration, labelling/Deepfake, ...) adds terms at 0.4 weight.
 * An exact phrase hit (the query's content words as a contiguous sequence, stopwords ignored on both sides) adds a bonus. Leaves and
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

/** Light suffix stemmer, the same function for documents and queries of a language (not linguistically exact; consistent). */
export function stem(word: string, lang: Lang): string {
  const w = word;
  if (lang === "en") {
    if (w.length > 5 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
    if (w.length > 5 && /(?:sses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && w.endsWith("s") && !/(?:ss|us|is)$/.test(w)) return w.slice(0, -1);
    if (w.length > 6 && w.endsWith("ing")) return w.slice(0, -3);
    if (w.length > 5 && w.endsWith("ed")) return w.slice(0, -2);
    return w;
  }
  // nouns in -ung, -ion, ...: only the plural -en goes (Kennzeichnungen -> Kennzeichnung, Sanktionen -> Sanktion)
  const noun = /^(.{3,}(?:ung|ion|heit|keit|schaft|tät))(?:en)?$/.exec(w);
  if (noun) return noun[1] as string;
  for (const suffix of ["en", "e", "n", "s"]) if (w.length - suffix.length >= 4 && w.endsWith(suffix)) return w.slice(0, -suffix.length);
  return w;
}

/** Groups of terms that count for each other (query expansion, weight SYNONYM_WEIGHT). */
interface SynonymGroup {
  terms: string[];
  /** Articles (id prefixes) the topic belongs to: nodes at or below them are boosted when a query term is in `terms`. */
  topics?: string[];
}
const SYNONYMS: Record<Lang, SynonymGroup[]> = {
  en: [
    { terms: ["penalty", "penalties", "fine", "fines", "sanction", "sanctions"], topics: ["art_99"] },
    { terms: ["deepfake", "deepfakes", "fake", "label", "labelling", "labeling", "disclose", "disclosure"], topics: ["art_50"] },
    { terms: ["registration", "register", "registered", "database"], topics: ["art_49", "art_71"] },
    { terms: ["sme", "smes", "small", "medium"] },
    { terms: ["oversight", "supervision"] },
  ],
  de: [
    { terms: ["strafe", "strafen", "sanktion", "sanktionen", "geldbuße", "geldbußen", "bußgeld", "bußgelder"], topics: ["art_99"] },
    { terms: ["kennzeichnung", "kennzeichnen", "offenlegen", "offenlegung", "deepfake", "deepfakes"], topics: ["art_50"] },
    { terms: ["registrierung", "registrieren", "registriert", "datenbank"], topics: ["art_49", "art_71"] },
    { terms: ["kmu", "kleine", "mittlere", "kleinstunternehmen"] },
    { terms: ["aufsicht", "überwachung"] },
  ],
};
const SYNONYM_WEIGHT = 0.4;
const HEADING_BOOST = 3;
const CONTEXT_BOOST = 2;
/** Score factor for nodes under the provisions a topic group points to, when a query term belongs to the group. */
const TOPIC_BOOST = 1.5;
interface StemGroup {
  stems: string[];
  topics: string[];
}
const groupCache: Partial<Record<Lang, Map<string, StemGroup[]>>> = {};
/** The synonym groups a (stemmed) term belongs to. */
function groupsOf(term: string, lang: Lang): StemGroup[] {
  let m = groupCache[lang];
  if (!m) {
    m = new Map();
    for (const g of SYNONYMS[lang]) {
      const group: StemGroup = { stems: [...new Set(g.terms.map((x) => stem(x, lang)))], topics: g.topics ?? [] };
      for (const t of group.stems) m.set(t, [...(m.get(t) ?? []), group]);
    }
    groupCache[lang] = m;
  }
  return m.get(term) ?? [];
}

interface Doc {
  node: ProvisionNode;
  /** Own heading and text, for the snippet. */
  words: string[];
  /** Stemmed content words (no stopwords) of heading and text, in order, for the phrase bonus. */
  content: string[];
  /** Weighted term frequencies: text 1, own heading HEADING_BOOST, ancestor heading 1. */
  tf: Map<string, number>;
  /** Length for normalisation: text words plus boosted heading words. */
  len: number;
  weight: number;
}
interface Bm25Index {
  docs: Doc[];
  df: Map<string, number>;
  avgdl: number;
}

const TYPE_WEIGHT: Partial<Record<ProvisionNode["type"], number>> = { chapter: 0.6, section: 0.6, annex: 0.85, article: 0.85 };
const cache = new WeakMap<CorpusIndex, Bm25Index>();

const stems = (text: string, lang: Lang): string[] => tokenizeWords(text).map((t) => stem(t.word, lang));
const contentOf = (text: string, lang: Lang): string[] => tokenizeWords(text).filter((t) => !STOPWORDS.has(t.word)).map((t) => stem(t.word, lang));

function indexOf(idx: CorpusIndex): Bm25Index {
  let hit = cache.get(idx);
  if (hit) return hit;
  const lang = idx.lang;
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  let total = 0;
  for (const node of idx.nodes) {
    if (node.heading === "" && node.text === "") continue;
    const headWords = stems(node.heading, lang);
    const textWords = stems(node.text, lang);
    if (headWords.length + textWords.length === 0) continue;
    let context: string[] = [];
    if (node.heading === "") {
      for (let cur = node.parent === null ? undefined : idx.byId.get(node.parent); cur; cur = cur.parent === null ? undefined : idx.byId.get(cur.parent)) {
        if (cur.type === "chapter" || cur.type === "section") break; // only the heading of an article or annex gives context
        if (cur.heading !== "") {
          context = stems(cur.heading, lang);
          break;
        }
      }
    }
    const tf = new Map<string, number>();
    const bump = (ws: string[], by: number): void => {
      for (const w of ws) tf.set(w, (tf.get(w) ?? 0) + by);
    };
    bump(textWords, 1);
    bump(headWords, HEADING_BOOST);
    bump(context, CONTEXT_BOOST);
    for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    const len = textWords.length + HEADING_BOOST * headWords.length;
    total += len;
    docs.push({
      node,
      words: [...headWords, ...textWords],
      content: [...contentOf(node.heading, lang), ...contentOf(node.text, lang)],
      tf,
      len: Math.max(len, 1),
      weight: TYPE_WEIGHT[node.type] ?? 1,
    });
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
export function snippetOf(source: string, terms: ReadonlySet<string>, stemmer: (word: string) => string = (w) => w): string {
  const text = source.replace(/\s+/g, " ").trim();
  if (text.length <= SNIPPET_MAX) return text;
  const first = tokenizeWords(text).find((t) => terms.has(t.word) || terms.has(stemmer(t.word)));
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

  const qWords = tokenizeWords(input.query).map((t) => t.word);
  let qRaw = qWords.filter((w) => !STOPWORDS.has(w));
  if (qRaw.length === 0) qRaw = qWords;
  if (qRaw.length === 0) return { ...base, results: [] };
  const qTerms = [...new Set(qRaw.map((w) => stem(w, lang)))];
  // query terms weigh 1, synonyms SYNONYM_WEIGHT
  const weights = new Map<string, number>(qTerms.map((t) => [t, 1]));
  const topics = new Set<string>();
  for (const t of qTerms) {
    for (const g of groupsOf(t, lang)) {
      for (const syn of g.stems) if (!weights.has(syn)) weights.set(syn, SYNONYM_WEIGHT);
      for (const topic of g.topics) topics.add(topic);
    }
  }

  const n = bm.docs.length;
  const idf = new Map<string, number>();
  for (const t of weights.keys()) {
    const df = bm.df.get(t) ?? 0;
    idf.set(t, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }
  const qContent = qWords.filter((w) => !STOPWORDS.has(w)).map((w) => stem(w, lang));
  const phrase = qContent.length >= 2 ? qContent : null;
  const phraseBonus = qTerms.reduce((sum, t) => sum + (idf.get(t) as number), 0) * PHRASE_BONUS;

  const scored: Array<{ doc: Doc; score: number }> = [];
  for (const doc of bm.docs) {
    let score = 0;
    for (const [t, w] of weights) {
      const f = doc.tf.get(t);
      if (!f) continue;
      score += w * (idf.get(t) as number) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.len) / bm.avgdl)));
    }
    if (score === 0) continue;
    if (phrase && containsPhrase(doc.content, phrase)) score += phraseBonus;
    const topical = [...topics].some((t) => doc.node.id === t || doc.node.id.startsWith(`${t}.`)) ? TOPIC_BOOST : 1;
    scored.push({ doc, score: score * doc.weight * topical });
  }
  scored.sort((a, b) => b.score - a.score || a.doc.node.order - b.doc.node.order);

  const terms = new Set(weights.keys());
  const results = scored.slice(0, limit).map(({ doc, score }): SearchHit => {
    const { node } = doc;
    let heading = node.heading;
    for (let cur: ProvisionNode | undefined = node; heading === "" && cur; cur = cur.parent === null ? undefined : idx.byId.get(cur.parent)) heading = cur.heading;
    return {
      id: node.id,
      citation: formatRef(node.id, lang),
      ...(heading !== "" ? { heading } : {}),
      snippet: snippetOf(node.text !== "" ? node.text : node.heading, terms, (w) => stem(w, lang)),
      score: round4(score),
      applicability: resolveDeadline(version, node, idx.byId, asOf, deadlines),
    };
  });
  return { ...base, results };
}
