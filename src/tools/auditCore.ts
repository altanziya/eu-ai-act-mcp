/**
 * Isomorphic core of aiact_audit_text (no node: imports; also runs in the browser). Corpus loader and deadline table are
 * passed in; audit.ts binds the data/ defaults for Node. Deterministic, no model, no network.
 *
 * Three checks over a free text, all against the version in force on `as_of` (versionForDate) and the other version:
 *  1. Citations (Article N(..), Annex III ..): present, removed by the amending act (with the place it moved to, from the
 *     diff of the two corpora) or unknown.
 *  2. Dates in a sentence that cites a provision or names a known subject: compared with dates written in the text of
 *     the cited node first (precedence of text deadlines), otherwise with the application date of the matching rule of
 *     the deadline table, in both versions.
 *  3. Quotations of six words or more next to a citation: verifyCitation against the cited place.
 * Orientation only, no legal advice (the `notice` is the one of verify).
 */
import { V2024, V2026 } from "../constants.js";
import { diffNodes } from "../diff/diff.js";
import type { DiffMove } from "../diff/diff.js";
import { ancestorChain, descendants, isIsoDate, isLang, otherVersion, versionForDate } from "./corpus.js";
import type { CorpusIndex, CorpusLoader, Lang, Version } from "./corpus.js";
import { matchRule } from "./deadlines.js";
import type { DeadlineRule, DeadlineTable } from "./deadlines.js";
import { findDates, findQuotes, findRefsDetailed, splitSentences, startsListItem } from "./auditScan.js";
import type { RefMention, Span } from "./auditScan.js";
import { formatRef } from "./formatRef.js";
import { notice } from "./notice.js";
import type { Notice } from "./notice.js";
import { verifyCitationWith } from "./verifyCore.js";
import type { VerifyResult } from "./verifyCore.js";

export type Severity = "error" | "warning" | "info" | "ok";
export type FindingKind =
  | "reference_ok"
  | "removed_provision"
  | "unknown_provision"
  | "not_yet_in_force"
  | "deadline_ok"
  | "outdated_deadline"
  | "unverified_date"
  | "quote_ok"
  | "outdated_quote"
  | "wrong_pinpoint"
  | "quote_deviates"
  | "quote_not_found"
  | "not_checked"
  | "no_references";

export interface Finding {
  kind: FindingKind;
  severity: Severity;
  span: Span;
  excerpt: string;
  message: string;
  /** Citation (of the provision concerned) in the language of the audit. */
  ref?: string;
  /** Logical node id. */
  node?: string;
  expected?: string;
  found?: string;
  /** `<version>:<node id>` of the corpus nodes the finding rests on. */
  sources: string[];
  suggestion?: string;
}
export interface AuditInput {
  text: string;
  /** ISO date; the version in force on this date is the one checked. */
  as_of: string;
  lang?: Lang;
}
export interface AuditResult {
  as_of: string;
  version_checked: Version;
  findings: Finding[];
  summary: { error: number; warning: number; info: number; ok: number };
  notice: Notice;
}

const EXCERPT_MAX = 160;
const MIN_QUOTE_WORDS = 6;
/** Quotations checked per text; further ones get an info finding "not checked" (each check is a full search of the corpus). */
export const MAX_QUOTE_CHECKS = 200;

// ---------------------------------------------------------------------------------------------------------------
// Anchors: subjects without a citation, and annex citations that stand for a rule
// ---------------------------------------------------------------------------------------------------------------

interface AnchorTerm {
  re: RegExp;
  /** Node whose deadline rule applies. */
  id: string;
  needs?: (sentence: string) => boolean;
}
/** "high-risk", "high risk", "Hochrisiko" (also as part of a word: Hochrisiko-KI-Systeme, Hochrisikosysteme). */
const HIGH_RISK_TERM = /(?<![\p{L}])high[- ]risk(?![\p{L}])|hochrisiko/giu;
/** Words that negate a following "high-risk": "non-high-risk", "not (classified as) high-risk", "other than high-risk", "kein Hochrisiko", "ohne Hochrisiko-Einstufung", "Nicht-Hochrisiko". */
const NEGATION_BEFORE = /(?:(?<![\p{L}])non[- ]?|(?<![\p{L}])not\s+(?:(?:classified|considered|regarded|deemed|treated|rated)\s+as\s+)?|(?<![\p{L}])no\s+|(?<![\p{L}])without\s+|(?<![\p{L}])other\s+than\s+|(?<![\p{L}])nicht[- ]?(?:als\s+)?|(?<![\p{L}])kein(?:e[nmrs]?)?\s+|(?<![\p{L}])ohne\s+)$/iu;
/** Offset and length of the first "high-risk" in the sentence that is not negated (null if none). */
function firstHighRisk(sentence: string): { index: number; length: number } | null {
  for (const m of sentence.matchAll(HIGH_RISK_TERM)) {
    if (!NEGATION_BEFORE.test(sentence.slice(Math.max(0, m.index - 40), m.index))) return { index: m.index, length: m[0].length };
  }
  return null;
}
const HIGH_RISK = (sentence: string): boolean => firstHighRisk(sentence) !== null;
export const ANCHOR_TERMS: readonly AnchorTerm[] = [
  { re: /(?<![\p{L}])(?:annex|anhang)\s+III(?![\p{L}\p{N}])/gu, id: "art_6.par_2" },
  { re: /(?<![\p{L}])(?:annex|anhang)\s+I(?![\p{L}\p{N}])/gu, id: "art_6.par_1", needs: HIGH_RISK },
  { re: /(?<![\p{L}])(?:general[- ]purpose\s+AI|GPAI|KI-Modelle?\s+mit\s+allgemeinem\s+Verwendungszweck)(?![\p{L}])/giu, id: "cpt_5" },
  { re: /(?<![\p{L}])(?:prohibited\s+(?:AI\s+)?practices|verbotene[n]?\s+(?:KI-)?Praktiken)(?![\p{L}])/giu, id: "art_5" },
  { re: /(?<![\p{L}])(?:AI\s+literacy|KI-Kompetenz)(?![\p{L}])/giu, id: "art_4" },
  { re: /(?<![\p{L}])(?:transparency\s+obligations|Transparenzpflichten)(?![\p{L}])/giu, id: "art_50" },
];
/** Annex citations whose deadline is the one of the classification rule in Article 6. */
const ANNEX_RULE: Array<{ prefix: string; id: string; needs?: (sentence: string) => boolean }> = [
  { prefix: "anx_3", id: "art_6.par_2" },
  { prefix: "anx_1", id: "art_6.par_1", needs: HIGH_RISK },
];
/** Words that say "from/until when" ("takes effect", "become applicable", "enters into application", "gelten ab", "bis zum", "Frist" are covered by their key word). */
const TRIGGER = /(?<![\p{L}])(?:appl(?:y|ies|ied|icable|ication)|tak(?:e|es|ing|en)\s+effect|effective|compl(?:y|ies|ying|iance)|since|from|as of|until|later than|deadline|ab|gilt|gelten|seit|anwendbar|anzuwenden|wirksam|frist|spätestens|bis)(?![\p{L}])/iu;
/** Words between a trigger word and its date (same clause); a hyphenated compound ("high-risk", "Hochrisiko-KI-Systeme") is one word. */
const TRIGGER_DISTANCE = 6;
/** Words of a clause (hyphenated compounds and "2." as one word). */
const WORD = /[\p{L}\p{N}.]+(?:-[\p{L}\p{N}.]+)*/gu;
/** "by" is a trigger only directly before the date and not after a passive participle ("reviewed by", "approved by", "signed by", "made by" ...). */
const PASSIVE_BEFORE_BY = /^(?:\p{L}{3,}ed|made|done|given|taken|written|chosen|set|held|known|seen|shown|found|built|sent|paid|overseen|undertaken|drawn|begun|run|kept|led|worn)$/iu;
/** A date that opens the sentence behind a preposition ("From 2 August 2026 ...", "Ab dem 2. August 2026 ...") counts as triggered. */
const LEADING_PREP = /^(?:from|on|as of|with effect from|since|ab(?: dem)?|seit(?: dem)?|am|vom|mit wirkung vom|bis(?: zum)?|until|per)$/iu;
/** "on"/"am" are no trigger words by themselves: the clause must say that something applies, takes effect or is required. */
const EFFECT_VERB = /(?<![\p{L}])(?:appl(?:y|ies|icable)|tak(?:e|es|ing)\s+effect|enters?\s+into\s+(?:force|application)|(?:comes?|becomes?)\s+(?:into\s+)?(?:force|effective|applicable)|in\s+force|must|shall|comply|gelten|gilt|treten|tritt|in\s+kraft|anwendbar|anzuwenden|wirksam|müssen|muss|sollen|erfüllen|einhalten)(?![\p{L}])/iu;
/** The regulation as a whole ("the AI Act", "the Regulation", "die Verordnung", "die KI-Verordnung"). */
const WHOLE_ACT = /(?<![\p{L}])(?:AI[- ]Act|Artificial\s+Intelligence\s+Act|Regulation|KI-Verordnung|KI-Gesetz|Verordnung)(?![\p{L}])/giu;
/** What stands before a mention of the regulation when it is not the subject ("under the AI Act", "nach der Verordnung", "des AI Act"). */
const ACT_OBJECT_BEFORE = /(?:(?<![\p{L}])(?:under|pursuant\s+to|according\s+to|in\s+accordance\s+with|of|in|to|for|by|with|within|per|nach|gemäß|laut|unter|von|vom|im|in|aus|zur|zum|mit|für|gegen|durch|bei|sinne)\s+(?:(?:the|this|these|die|der|dem|den|diese[mnrs]?)\s+)?|(?<![\p{L}])des\s+)$/iu;
/** An annex of the two routes written in the sentence; with it the annex rule decides, not the both-routes subject. */
const ROUTE_ANNEX = /(?<![\p{L}])(?:annex|anhang)\s+(?:III|I)(?![\p{L}\p{N}])/iu;
/** The two classification routes of Article 6, Annex III route first (its date is the one `expected` names). */
const ROUTES: ReadonlyArray<{ id: string; annex: string }> = [
  { id: "art_6.par_2", annex: "anx_3" },
  { id: "art_6.par_1", annex: "anx_1" },
];
/** Clause breaks inside a sentence: "; ", ", while", ", whereas", ", but", ", während", ", wohingegen", ", aber", "while", "während". */
const CLAUSE_BREAK = /;|,\s*(?:while|whereas|but|however|während|wohingegen|aber|jedoch|dagegen)(?![\p{L}])|(?<![\p{L}])(?:while|whereas|während|wohingegen)(?![\p{L}])/giu;
const AND = /(?<![\p{L}])(?:and|und)(?![\p{L}])/giu;

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

const textCache = new WeakMap<CorpusIndex, Map<string, string[]>>();
/** Dates written in the text of a node and all its descendants, in document order. */
function textDates(idx: CorpusIndex, id: string): string[] {
  let m = textCache.get(idx);
  if (!m) textCache.set(idx, (m = new Map()));
  let hit = m.get(id);
  if (!hit) {
    const node = idx.byId.get(id);
    hit = node ? [node, ...descendants(idx, id)].flatMap((n) => findDates(n.text).map((d) => d.iso)) : [];
    m.set(id, hit);
  }
  return hit;
}

const movedCache = new WeakMap<CorpusIndex, DiffMove[]>();
/** Moves from the older to the newer version (by identical node hash), computed from the two corpora. */
function movesFrom(older: CorpusIndex, newer: CorpusIndex): DiffMove[] {
  let hit = movedCache.get(older);
  if (!hit) {
    hit = diffNodes(older.nodes, newer.nodes).moved;
    movedCache.set(older, hit);
  }
  return hit;
}

/**
 * Other readings of an id, exact first: `art_3.par_1` and `art_3.pt_1` are interchangeable, an article without numbered
 * paragraphs has `sub_n` where a citation says `(n)` (`Article 113(3)(c)` is `art_113.sub_3.c`), and a subparagraph
 * level that is not in the tree is skipped.
 */
function candidates(id: string): string[] {
  const segs = id.split(".");
  let combos: Array<{ segs: string[]; introduced: boolean }> = [{ segs: [], introduced: false }];
  segs.forEach((seg, i) => {
    const options: Array<{ seg: string; introduced: boolean }> = [{ seg, introduced: false }];
    const m = /^(par|pt)_(.+)$/.exec(seg);
    if (m) options.push({ seg: `${m[1] === "par" ? "pt" : "par"}_${m[2] as string}`, introduced: false });
    if (i === 1 && m?.[1] === "par" && /^\d+$/.test(m[2] as string)) options.push({ seg: `sub_${m[2] as string}`, introduced: true });
    combos = combos.flatMap((c) => options.map((o) => ({ segs: [...c.segs, o.seg], introduced: c.introduced || o.introduced })));
  });
  // skipping a subparagraph level is only for levels the citation wrote, not for the `sub_n` read from `(n)`
  const all = combos.flatMap((c) => (c.introduced ? [c.segs] : [c.segs, c.segs.filter((x) => !x.startsWith("sub_"))]));
  return [...new Set(all.map((a) => a.join(".")))];
}
function resolveIn(idx: CorpusIndex, id: string): string | null {
  for (const c of candidates(id)) if (idx.byId.has(c)) return c;
  return null;
}

/** Application dates of the rule matching `id` in a version: `applies_from` first, then the later dates by class. */
function ruleDates(version: Version, idx: CorpusIndex, id: string, deadlines: DeadlineTable): { rule: DeadlineRule; dates: string[] } | null {
  const block = deadlines.versions[version];
  if (!block || !idx.byId.has(id)) return null;
  const rule = matchRule(block, ancestorChain(idx, id).map((n) => n.id));
  return rule ? { rule, dates: [rule.applies_from, ...(rule.later_dates ?? []).map((d) => d.applies_from)] } : null;
}

const descCache = new WeakMap<CorpusIndex, Map<string, Map<string, { node: string; rule: DeadlineRule }>>>();
/** Application dates of the rules that apply to descendants of a node (partial application), by date. */
function descendantRuleDates(version: Version, idx: CorpusIndex, id: string, deadlines: DeadlineTable): Map<string, { node: string; rule: DeadlineRule }> {
  let m = descCache.get(idx);
  if (!m) descCache.set(idx, (m = new Map()));
  let hit = m.get(id);
  if (!hit) {
    hit = new Map();
    const block = deadlines.versions[version];
    if (block) {
      for (const n of descendants(idx, id)) {
        const rule = matchRule(block, ancestorChain(idx, n.id).map((x) => x.id));
        if (!rule) continue;
        for (const d of [rule.applies_from, ...(rule.later_dates ?? []).map((x) => x.applies_from)]) if (!hit.has(d)) hit.set(d, { node: n.id, rule });
      }
    }
    m.set(id, hit);
  }
  return hit;
}

const oneLine = (s: string, max = EXCERPT_MAX): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
const MONTH_NAMES: Record<Lang, readonly string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};
/** ISO date in reading form for messages: "2 August 2026" (en), "2. August 2026" (de). Anything that is not an ISO date is returned as is. */
export function readableDate(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const name = m ? MONTH_NAMES[lang][Number(m[2]) - 1] : undefined;
  return m && name ? `${Number(m[3])}${lang === "de" ? "." : ""} ${name} ${m[1] as string}` : iso;
}
const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

// ---------------------------------------------------------------------------------------------------------------

export function auditTextWith(input: AuditInput, load: CorpusLoader, deadlines: DeadlineTable): AuditResult {
  const { text } = input;
  const asOf = input.as_of;
  if (typeof text !== "string") throw new Error("text must be a string");
  if (typeof asOf !== "string" || !isIsoDate(asOf)) throw new Error(`as_of is required and must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(asOf)}`);
  const lang = input.lang ?? "en";
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const de = lang === "de";
  const ACT = de ? "Verordnung (EU) 2026/1744" : "Regulation (EU) 2026/1744";
  const tr = (en: string, deText: string): string => (de ? deText : en);
  const highRisk = tr("high-risk (both routes)", "Hochrisiko (beide Routen)");
  const D = (iso: string): string => readableDate(iso, lang);

  const version = versionForDate(asOf);
  const other = otherVersion(version);
  const cur = load(version, lang);
  const oth = load(other, lang);
  const src = (v: Version, id: string): string => `${v}:${id}`;
  const cite = (id: string): string => formatRef(id, lang);
  const findings: Finding[] = [];
  const add = (f: Omit<Finding, "sources"> & { sources?: string[] }): void => {
    findings.push({ sources: [], ...f, excerpt: oneLine(f.excerpt) });
  };
  const slice = (s: Span): string => text.slice(s.start, s.end);

  const quotes = findQuotes(text);
  const sentences = splitSentences(text, quotes.filter((q) => q.words >= MIN_QUOTE_WORDS).map((q) => q.span));
  const sentenceAt = (pos: number): number => {
    let lo = 0;
    let hi = sentences.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((sentences[mid] as Span).start <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  /** Where the text of a node of the older version went in the newer one (moved nodes of the node or its children, lifted to the node's level). */
  const moveInfo = (othId: string): { targets: string[]; suggestion: string } => {
    const targets = uniq(
      movesFrom(oth, cur)
        .filter((m) => m.from_id === othId || m.from_id.startsWith(`${othId}.`))
        .map((m) => {
          const depth = m.from_id.slice(othId.length).split(".").length - 1;
          const up = m.to_id.split(".").slice(0, m.to_id.split(".").length - depth).join(".");
          return cur.byId.has(up) ? up : m.to_id;
        }),
    );
    const suggestion =
      targets.length > 0
        ? tr(`Removed by ${ACT}; the text moved to ${targets.map(cite).join(", ")}.`, `Durch ${ACT} gestrichen; der Text steht jetzt in ${targets.map(cite).join(", ")}.`)
        : tr(`Removed by ${ACT} without a counterpart in the consolidated version.`, `Durch ${ACT} gestrichen, ohne Entsprechung in der konsolidierten Fassung.`);
    return { targets, suggestion };
  };

  // ---- 1. citations ------------------------------------------------------------------------------------------
  interface Checked {
    mention: RefMention;
    /** Node id in the version checked, if the citation exists there. */
    curId: string | null;
    sentence: number;
  }
  const scan = findRefsDetailed(text);
  const refs: Checked[] = scan.refs.map((mention) => ({ mention, curId: resolveIn(cur, mention.id), sentence: sentenceAt(mention.span.start) }));
  const foreignSentences = new Set(scan.foreign.map((f) => sentenceAt(f.start)));

  // quotations with a citation in the same or the previous sentence are checked as quotations (their inner citations and dates are not)
  interface QuoteJob {
    quote: (typeof quotes)[number];
    claimed: Checked;
  }
  const quoteJobs: QuoteJob[] = [];
  const unchecked: Span[] = [];
  for (const q of quotes) {
    if (q.words < MIN_QUOTE_WORDS) continue;
    const outside = refs.filter((r) => r.mention.span.end <= q.span.start || r.mention.span.start >= q.span.end);
    const qs = sentenceAt(q.span.start);
    const same = outside.filter((r) => r.sentence === qs);
    const before = same.filter((r) => r.mention.span.end <= q.span.start);
    const claimed = before[before.length - 1] ?? same[0] ?? [...outside.filter((r) => r.sentence === qs - 1)].pop();
    if (!claimed) continue;
    if (quoteJobs.length < MAX_QUOTE_CHECKS) quoteJobs.push({ quote: q, claimed });
    else unchecked.push(q.span);
  }
  // quoteJobs are in text order and do not overlap: binary search for the last one starting at or before the span
  const insideChecked = (s: Span): boolean => {
    let lo = 0;
    let hi = quoteJobs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const j = (quoteJobs[mid] as QuoteJob).quote.span;
      if (j.start > s.start) hi = mid - 1;
      else if (j.end >= s.end) return true;
      else lo = mid + 1;
    }
    return false;
  };

  for (const r of refs) {
    if (insideChecked(r.mention.span)) continue;
    const { mention, curId } = r;
    const span = mention.span;
    const asWritten = cite(mention.id);
    if (curId) {
      add({ kind: "reference_ok", severity: "ok", span, excerpt: slice(span), ref: cite(curId), node: curId, sources: [src(version, curId)], message: tr(`${cite(curId)} exists in the version in force on ${D(asOf)}.`, `${cite(curId)} besteht in der am ${D(asOf)} geltenden Fassung.`) });
      continue;
    }
    const othId = resolveIn(oth, mention.id);
    if (othId && version === V2026) {
      const { targets, suggestion } = moveInfo(othId);
      add({
        kind: "removed_provision", severity: "error", span, excerpt: slice(span), ref: asWritten, node: othId, sources: [src(other, othId), ...targets.map((t) => src(version, t))], suggestion,
        message: tr(`${asWritten} no longer exists in the version in force on ${D(asOf)}.`, `${asWritten} besteht in der am ${D(asOf)} geltenden Fassung nicht mehr.`),
      });
    } else if (othId) {
      add({
        kind: "not_yet_in_force", severity: "warning", span, excerpt: slice(span), ref: asWritten, node: othId, sources: [src(other, othId)],
        message: tr(`${asWritten} is not in the text in force on ${D(asOf)}; it was inserted by ${ACT} (consolidated version from ${D("2026-07-27")}).`, `${asWritten} steht nicht im am ${D(asOf)} geltenden Text; eingefügt durch ${ACT} (konsolidierte Fassung ab ${D("2026-07-27")}).`),
      });
    } else {
      add({
        kind: "unknown_provision", severity: "error", span, excerpt: slice(span), ref: asWritten, sources: [],
        message: tr(`${asWritten} does not exist in the AI Act (neither in the Official Journal nor in the consolidated version).`, `${asWritten} gibt es in der KI-Verordnung nicht (weder in der Amtsblatt- noch in der konsolidierten Fassung).`),
      });
    }
  }

  // ---- 3. quotations (before dates, so that dates inside a checked quotation are left to the quotation check) -----
  const verified = new Map<string, VerifyResult>();
  for (const span of unchecked) {
    add({ kind: "not_checked", severity: "info", span, excerpt: slice(span), message: tr(`quotation not checked (limit of ${MAX_QUOTE_CHECKS} checked quotations per text)`, `Zitat nicht geprüft (höchstens ${MAX_QUOTE_CHECKS} geprüfte Zitate je Text)`) });
  }
  for (const { quote, claimed } of quoteJobs) {
    const claimedId = claimed.curId ?? claimed.mention.id;
    let v: VerifyResult;
    const key = `${claimedId}\u0000${quote.inner}`;
    const cached = verified.get(key);
    if (cached) v = cached;
    else {
      try {
        v = verifyCitationWith({ quote: quote.inner, claimed_ref: claimedId, as_of: asOf, lang }, load, deadlines);
      } catch {
        continue;
      }
      verified.set(key, v);
    }
    const span = quote.span;
    const base = { span, excerpt: slice(span), ref: cite(claimedId) };
    const at = v.match?.provision_id ?? v.provision_id;
    const found = at ? { node: at, ref: cite(at) } : {};
    const sources = at ? [src(v.match?.version_id ?? version, at)] : [];
    switch (v.status) {
      case "exact":
      case "multi_node":
      case "multiple_matches":
        add({ ...base, ...found, kind: "quote_ok", severity: "ok", sources, message: tr(`The quotation matches the wording in force on ${D(asOf)}${at ? ` (${cite(at)})` : ""}.`, `Das Zitat entspricht dem am ${D(asOf)} geltenden Wortlaut${at ? ` (${cite(at)})` : ""}.`) });
        break;
      case "found_other_version": {
        const now = at ? cur.byId.get(at)?.text : undefined;
        // a quotation of removed text: where the text of the cited provision (or, failing that, of the matched one) went
        const claimedGone = claimed.curId === null ? resolveIn(oth, claimed.mention.id) : null;
        const goneId = claimedGone ?? (at !== undefined && !cur.byId.has(at) ? at : null);
        const gone = version === V2026 && goneId !== null ? moveInfo(goneId) : undefined;
        add({
          ...base, ...found, kind: "outdated_quote", severity: "error", sources: at ? [src(other, at), src(version, at), ...(gone?.targets ?? []).map((t) => src(version, t))] : [],
          ...(now ? { expected: oneLine(now, 200) } : {}),
          ...(gone ? { suggestion: gone.suggestion } : {}),
          message: version === V2026
            ? tr(`The quotation is the wording of the Official Journal version; it was amended by ${ACT}.`, `Das Zitat gibt den Wortlaut der Amtsblattfassung wieder; er wurde durch ${ACT} geändert.`)
            : tr(`The quotation is the wording of the consolidated version (${ACT}), which is not yet in force on ${D(asOf)}.`, `Das Zitat gibt den Wortlaut der konsolidierten Fassung (${ACT}) wieder, die am ${D(asOf)} noch nicht gilt.`),
        });
        break;
      }
      case "found_at_other_provision":
        add({
          ...base, ...found, kind: "wrong_pinpoint", severity: "warning", sources, ...(at ? { expected: cite(at) } : {}), found: cite(claimedId),
          message: tr(`The wording is in ${at ? cite(at) : "another provision"}, not in ${cite(claimedId)}.`, `Der Wortlaut steht in ${at ? cite(at) : "einer anderen Bestimmung"}, nicht in ${cite(claimedId)}.`),
        });
        break;
      case "fuzzy":
        add({ ...base, ...found, kind: "quote_deviates", severity: "warning", sources, message: tr("The quotation deviates slightly from the wording.", "Das Zitat weicht leicht vom Wortlaut ab.") });
        break;
      case "mismatch_hard_token": {
        const t = v.hard_token_mismatches?.[0];
        add({
          ...base, ...found, kind: "quote_deviates", severity: "warning", sources: at ? [src(v.found_in_version ?? version, at)] : [],
          ...(t ? { expected: t.in_corpus, found: t.in_quote } : {}),
          message: tr("The quotation differs from the wording in a number, date or name.", "Das Zitat weicht im Wortlaut bei einer Zahl, einem Datum oder einem Namen ab."),
        });
        break;
      }
      case "found_other_language":
        add({ ...base, ...found, kind: "quote_deviates", severity: "warning", sources, message: tr(`The quotation is in another language than ${lang}.`, `Das Zitat steht in einer anderen Sprache als ${lang}.`) });
        break;
      case "not_found":
        add({ ...base, kind: "quote_not_found", severity: "error", message: tr("The quotation was not found in the AI Act.", "Das Zitat wurde in der KI-Verordnung nicht gefunden.") });
        break;
      default:
        break; // too_short: nothing to check
    }
  }

  // ---- 2. dates ----------------------------------------------------------------------------------------------
  interface Subject {
    /** Node whose rule applies (may differ from the cited node: Annex III -> Article 6(2)). */
    ruleId: string;
    /** Cited node, for the comparison with dates written in its text. */
    cited?: string;
    span: Span;
    /** "high-risk" without an annex: the dates of both routes of Article 6 count. */
    routes?: boolean;
    /** The subject stems from the sentence before (same paragraph), not from the sentence of the date. */
    carried?: boolean;
  }
  const dates = findDates(text).filter((d) => !insideChecked(d.span));
  const dist = (s: Span, d: Span): number => (s.end <= d.start ? d.start - s.end : s.start >= d.end ? s.start - d.end + 0.5 : 0);

  const subjectCache = new Map<number, Subject[]>();
  const subjectsOf = (si: number): Subject[] => {
    let hit = subjectCache.get(si);
    if (hit) return hit;
    hit = [];
    const sentence = sentences[si] as Span;
    const sText = slice(sentence);
    for (const r of refs) {
      if (r.sentence !== si || !r.curId || insideChecked(r.mention.span)) continue;
      const annex = ANNEX_RULE.find((a) => r.curId === a.prefix || (r.curId as string).startsWith(`${a.prefix}.`));
      const ruleId = annex && (!annex.needs || annex.needs(sText)) ? annex.id : r.curId;
      hit.push({ ruleId, cited: r.curId, span: r.mention.span });
    }
    if (!foreignSentences.has(si)) {
      // anchor terms stand for a subject only where no citation of another act is in the sentence ("Transparency obligations under Article 13 GDPR")
      for (const a of ANCHOR_TERMS) {
        if (a.needs && !a.needs(sText)) continue;
        for (const m of sText.matchAll(a.re)) {
          const start = sentence.start + m.index;
          hit.push({ ruleId: a.id, span: { start, end: start + m[0].length } });
        }
      }
      // "high-risk" without an annex or Article 6(1)/(2): both routes
      const hr = firstHighRisk(sText);
      const routeCited = refs.some((r) => r.sentence === si && ROUTES.some((x) => r.mention.id === x.id || r.mention.id.startsWith(`${x.id}.`) || r.mention.id === x.annex || r.mention.id.startsWith(`${x.annex}.`)));
      if (hr && !ROUTE_ANNEX.test(sText) && !routeCited) {
        const start = sentence.start + hr.index;
        hit.push({ ruleId: ROUTES[0]!.id, routes: true, span: { start, end: start + hr.length } });
      }
    }
    subjectCache.set(si, hit);
    return hit;
  };
  /** The sentence names a subject of its own that the sentence before must not supply: the regulation as a whole, or a citation of another act. */
  const ownSubject = (si: number): boolean => {
    const sentence = sentences[si] as Span;
    return foreignSentences.has(si) || new RegExp(WHOLE_ACT.source, "iu").test(slice(sentence));
  };
  /** The regulation as a whole stands in the clause as its subject (not behind "under", "of", "nach", "gemäß" ...). */
  const actIsSubject = (from: number, to: number): boolean => {
    const clause = text.slice(from, to);
    for (const m of clause.matchAll(WHOLE_ACT)) {
      if (/^['’]s(?![\p{L}])/u.test(clause.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue; // "the AI Act's rules on ...": possessive, not the subject
      if (!ACT_OBJECT_BEFORE.test(clause.slice(Math.max(0, m.index - 40), m.index))) return true;
    }
    return false;
  };
  const datesBySentence = new Map<number, typeof dates>();
  for (const d of dates) {
    const si = sentenceAt(d.span.start);
    datesBySentence.set(si, [...(datesBySentence.get(si) ?? []), d]);
  }
  const breakCache = new Map<number, number[]>();
  /** Offsets where a new clause starts: hard breaks, and "and"/"und" after a date when another subject follows ("A applies from D1 and B from D2"). */
  const clauseStarts = (si: number): number[] => {
    let hit = breakCache.get(si);
    if (hit) return hit;
    const sentence = sentences[si] as Span;
    const sText = slice(sentence);
    const hard = [...sText.matchAll(CLAUSE_BREAK)].map((m) => ({ at: sentence.start + m.index, next: sentence.start + m.index + m[0].length }));
    const starts = [sentence.start, ...hard.map((h) => h.next)];
    const ends = [...hard.map((h) => h.at), sentence.end];
    const subs = subjectsOf(si);
    const ds = datesBySentence.get(si) ?? [];
    const soft: number[] = [];
    for (const m of sText.matchAll(AND)) {
      const at = sentence.start + m.index;
      const next = at + m[0].length;
      const k = ends.findIndex((e) => e >= at);
      const clauseStart = starts[k] as number;
      const clauseEnd = ends[k] as number;
      const dateBefore = ds.some((d) => d.span.start >= clauseStart && d.span.end <= at && !soft.some((x) => x > d.span.start && x <= at));
      const subjectAfter = subs.some((x) => x.span.start >= next && x.span.end <= clauseEnd);
      if (dateBefore && subjectAfter) soft.push(next);
    }
    hit = [...new Set([...starts, ...soft])].sort((x, y) => x - y);
    breakCache.set(si, hit);
    return hit;
  };

  type Verdict =
    | { kind: "ok"; s: Subject; partial?: { node: string; rule: DeadlineRule }; viaText: boolean; c?: { rule: DeadlineRule; dates: string[] } }
    | { kind: "outdated"; s: Subject; viaText: boolean; expected?: string; c?: { rule: DeadlineRule; dates: string[] }; o?: { rule: DeadlineRule; dates: string[] } };
  const judge = (s: Subject, found: string): Verdict | null => {
    if (s.routes) {
      const per = ROUTES.map((r) => ({ r, c: ruleDates(version, cur, r.id, deadlines), o: ruleDates(other, oth, r.id, deadlines) }));
      const now = per.find((x) => x.c?.dates.includes(found));
      if (now?.c) return { kind: "ok", s: { ...s, ruleId: now.r.id }, viaText: false, c: now.c };
      const before = per.find((x) => x.o?.dates.includes(found));
      const first = per[0]?.c;
      if (before?.o && first) return { kind: "outdated", s, viaText: false, expected: first.dates[0] as string, c: first, o: before.o };
      return null;
    }
    const rc = ruleDates(version, cur, s.ruleId, deadlines);
    const ro = ruleDates(other, oth, s.ruleId, deadlines);
    if (s.cited) {
      // deadlines written in the cited text (the node and below, in either version) go first
      const c = textDates(cur, s.cited);
      const o = textDates(oth, s.cited);
      if (c.includes(found)) return { kind: "ok", s, viaText: true };
      if (o.includes(found)) {
        const aligned = c.length === o.length ? c[o.indexOf(found)] : new Set(c).size === 1 ? c[0] : undefined;
        const viaRule = ruleDates(version, cur, s.cited, deadlines)?.dates[0];
        const expected = aligned ?? (viaRule !== found ? viaRule : undefined);
        return { kind: "outdated", s, viaText: true, ...(expected ? { expected } : {}), ...(rc ? { c: rc } : {}) };
      }
    }
    if (rc?.dates.includes(found)) return { kind: "ok", s, viaText: false, c: rc };
    if (ro?.dates.includes(found) && rc) return { kind: "outdated", s, viaText: false, expected: rc.dates[0] as string, c: rc, ...(ro ? { o: ro } : {}) };
    return null;
  };

  for (const d of dates) {
    const si = sentenceAt(d.span.start);
    const sentence = sentences[si] as Span;
    let all = subjectsOf(si);
    // the clause of the date; without a subject in it, the subjects of the sentence before the date
    const starts = clauseStarts(si);
    const from = [...starts].reverse().find((x) => x <= d.span.start) ?? sentence.start;
    const to = starts.find((x) => x > d.span.start) ?? sentence.end;
    // a trigger word at most TRIGGER_DISTANCE words before the date, in the clause of the date ("by" only directly before the date, not after a passive participle)
    const wordsBefore = text.slice(from, d.span.start).match(WORD) ?? [];
    const tail = wordsBefore.slice(-TRIGGER_DISTANCE);
    const byBefore = tail.length > 0 && /^by$/i.test(tail[tail.length - 1] as string) && !(tail.length > 1 && PASSIVE_BEFORE_BY.test(tail[tail.length - 2] as string));
    // a date opening the sentence behind a preposition ("From 2 August 2026 high-risk systems ...", "Ab dem 2. August 2026 gelten ...") counts like a trigger word and may name its subject after it
    const openWords = text.slice(sentence.start, d.span.start).match(WORD) ?? [];
    const leadPrep = openWords.length > 0 && openWords.length <= 3 && LEADING_PREP.test(openWords.join(" "));
    const leadingTrigger = leadPrep && (!/^(?:on|am|vom|per)$/i.test(openWords.join(" ")) || EFFECT_VERB.test(text.slice(d.span.end, to)));
    const triggered = TRIGGER.test(tail.join(" ")) || byBefore || leadingTrigger;
    const leading = leadPrep || (wordsBefore.length <= 2 && /^\s*,/.test(text.slice(d.span.end, d.span.end + 3)));
    if (all.length === 0) {
      // no subject in the sentence: those of the sentence before, in the same paragraph, if that one carries no date of its own;
      // not if the sentence names a subject of its own (the regulation as a whole, a provision of another act) or is a list item / table row
      const prev =
        si > 0 &&
        !ownSubject(si) &&
        !startsListItem(text, sentence.start) &&
        !/\n[ \t\r]*\n/.test(text.slice((sentences[si - 1] as Span).end, sentence.start)) &&
        !dates.some((x) => sentenceAt(x.span.start) === si - 1)
          ? subjectsOf(si - 1)
          : [];
      if (prev.length === 0 || !triggered) continue;
      all = prev.map((x) => ({ ...x, carried: true }));
    }
    let subjects = all.filter((x) => x.carried || (x.span.start >= from && x.span.end <= to));
    if (subjects.length === 0) subjects = all.filter((x) => x.span.end <= d.span.start);
    // the regulation as a whole is the subject of the date ("the AI Act (generally) applies from ..."): the general date, not the high-risk routes
    if (!subjects.some((x) => x.carried) && actIsSubject(from, to)) subjects = subjects.filter((x) => !x.routes);
    // both-routes and carried subjects need a trigger word; both-routes ones stand in the clause, before the date
    subjects = subjects.filter((x) => (!x.routes && !x.carried) || (triggered && (!x.routes || x.carried || (x.span.start >= from && (x.span.end <= d.span.start || leading)))));
    if (subjects.length === 0) continue;
    // subjects before the date first (nearest first), then those after it
    subjects = [...subjects].sort((x, y) => Number(x.span.start >= d.span.end) - Number(y.span.start >= d.span.end) || dist(x.span, d.span) - dist(y.span, d.span) || x.span.start - y.span.start);
    const found = d.iso;
    const base = { span: d.span, excerpt: slice(d.span), found };
    const laterAct = version === V2024;

    const verdicts = subjects.map((s) => judge(s, found));
    const own = verdicts.find((v) => v?.kind === "ok");
    const stale = verdicts.find((v) => v?.kind === "outdated");
    let partial: Verdict | undefined;
    if (!own && !stale) {
      for (const s of subjects) {
        const hit = descendantRuleDates(version, cur, s.ruleId, deadlines).get(found);
        if (hit) {
          partial = { kind: "ok", s, viaText: false, partial: hit };
          break;
        }
      }
    }
    const v = own ?? stale ?? partial;
    if (v?.kind === "ok") {
      const s = v.s;
      const refId = v.viaText && s.cited ? s.cited : s.ruleId;
      const ref = cite(refId);
      if (s.routes) {
        const route = ROUTES.find((x) => x.id === s.ruleId) as { id: string; annex: string };
        const annex = cite(route.annex);
        add({ ...base, kind: "deadline_ok", severity: "ok", ref: highRisk, node: s.ruleId, sources: (v.c as { rule: DeadlineRule }).rule.source_nodes.map((n) => src(version, n)), message: tr(`${D(found)} is the application date of high-risk AI systems of the ${annex} route (${ref}) on ${D(asOf)}.`, `${D(found)} ist der Geltungsbeginn für Hochrisiko-KI-Systeme der Route ${annex} (${ref}) am ${D(asOf)}.`) });
      } else if (v.partial) {
        const whole = ruleDates(version, cur, s.ruleId, deadlines);
        add({ ...base, kind: "deadline_ok", severity: "ok", ref, node: s.ruleId, sources: v.partial.rule.source_nodes.map((n) => src(version, n)), message: tr(`${D(found)} is the application date of part of ${ref} (${cite(v.partial.node)}); ${whole ? `${ref} as a whole applies from ${D(whole.dates[0] as string)}` : "the rest follows other rules"}.`, `${D(found)} ist der Geltungsbeginn eines Teils von ${ref} (${cite(v.partial.node)}); ${whole ? `${ref} insgesamt gilt ab ${D(whole.dates[0] as string)}` : "der Rest folgt anderen Regeln"}.`) });
      } else if (v.viaText) {
        add({ ...base, kind: "deadline_ok", severity: "ok", ref, node: refId, sources: [src(version, refId)], message: tr(`${D(found)} is the date in the text of ${ref} in force on ${D(asOf)}.`, `${D(found)} ist das Datum im am ${D(asOf)} geltenden Text von ${ref}.`) });
      } else {
        add({ ...base, kind: "deadline_ok", severity: "ok", ref, node: refId, sources: (v.c as { rule: DeadlineRule }).rule.source_nodes.map((n) => src(version, n)), message: tr(`${D(found)} is the application date of ${ref} on ${D(asOf)}.`, `${D(found)} ist der Geltungsbeginn von ${ref} am ${D(asOf)}.`) });
      }
      continue;
    }
    if (v?.kind === "outdated") {
      const s = v.s;
      const refId = v.viaText && s.cited ? s.cited : s.ruleId;
      const ref = cite(refId);
      const expected = v.expected;
      const sources = v.viaText
        ? [src(other, refId), src(version, refId)]
        : [...(v.c?.rule.source_nodes ?? []).map((n) => src(version, n)), ...(v.o?.rule.source_nodes ?? []).map((n) => src(other, n))];
      const common = { ...base, ref: s.routes ? highRisk : ref, node: refId, ...(expected ? { expected } : {}), sources };
      if (s.routes && !laterAct) {
        const cur1 = ruleDates(version, cur, (ROUTES[1] as { id: string }).id, deadlines)?.dates[0];
        const a3 = cite((ROUTES[0] as { annex: string }).annex);
        const a1 = cite((ROUTES[1] as { annex: string }).annex);
        add({ ...common, kind: "outdated_deadline", severity: "error", message: tr(`High-risk AI systems: ${D(found)} was the date in the Official Journal version; on ${D(asOf)} it is ${expected ? D(expected) : "another date"} for ${a3} systems${cur1 ? ` and ${D(cur1)} for ${a1} products` : ""} (changed by ${ACT}).`, `Hochrisiko-KI-Systeme: ${D(found)} war das Datum der Amtsblattfassung; am ${D(asOf)} gilt ${expected ? D(expected) : "ein anderes Datum"} für Systeme nach ${a3}${cur1 ? ` und ${D(cur1)} für Produkte nach ${a1}` : ""} (geändert durch ${ACT}).`) });
      } else if (laterAct) {
        add({ ...common, kind: "unverified_date", severity: "warning", message: tr(`${D(found)} is the ${v.viaText ? "date in the text" : "application date"} of the consolidated version (${ACT}, from ${D("2026-07-27")}); on ${D(asOf)} ${ref} ${expected ? `has ${D(expected)}` : "reads differently"}.`, `${D(found)} ist das ${v.viaText ? "Datum im Text" : "Geltungsdatum"} der konsolidierten Fassung (${ACT}, ab ${D("2026-07-27")}); am ${D(asOf)} ${expected ? `gilt für ${ref} der ${D(expected)}` : `lautet ${ref} anders`}.`) });
      } else {
        add({ ...common, kind: "outdated_deadline", severity: "error", message: tr(`${ref} gave ${D(found)}; on ${D(asOf)} it is ${expected ? D(expected) : "another date"} (changed by ${ACT}).`, `${ref} nannte ${D(found)}; am ${D(asOf)} gilt ${expected ? D(expected) : "ein anderes Datum"} (geändert durch ${ACT}).`) });
      }
      continue;
    }
    // nothing matches: report only if a trigger word stands shortly before the date (same clause)
    if (!triggered) continue;
    for (const s of subjects) {
      if (s.routes || s.carried) continue; // no application date to compare with: stay silent
      const c = ruleDates(version, cur, s.ruleId, deadlines);
      if (!c) continue;
      const ref = cite(s.ruleId);
      const expected = c.dates[0] as string;
      add({ ...base, kind: "unverified_date", severity: "warning", ref, node: s.ruleId, expected, sources: c.rule.source_nodes.map((n) => src(version, n)), message: tr(`${D(found)} does not match the application date of ${ref} on ${D(asOf)} (${D(expected)}).`, `${D(found)} stimmt nicht mit dem Geltungsbeginn von ${ref} am ${D(asOf)} überein (${D(expected)}).`) });
      break;
    }
  }

  // ---- result ------------------------------------------------------------------------------------------------
  if (findings.length === 0) {
    add({ kind: "no_references", severity: "info", span: { start: 0, end: text.length }, excerpt: text, message: tr("no references found", "keine Fundstellen gefunden") });
  }
  const order = new Map(findings.map((f, i) => [f, i]));
  findings.sort((a, b) => a.span.start - b.span.start || (order.get(a) as number) - (order.get(b) as number));
  const summary = { error: 0, warning: 0, info: 0, ok: 0 };
  for (const f of findings) summary[f.severity]++;
  const usedOther = findings.some((f) => f.sources.some((s) => s.startsWith(`${other}:`)));
  return { as_of: asOf, version_checked: version, findings, summary, notice: notice(usedOther ? [version, other] : [version]) };
}

