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
import { findDates, findQuotes, findRefs, splitSentences } from "./auditScan.js";
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
  | "deadline_ok"
  | "outdated_deadline"
  | "unverified_date"
  | "quote_ok"
  | "outdated_quote"
  | "wrong_pinpoint"
  | "quote_deviates"
  | "quote_not_found"
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
const ACT = "Regulation (EU) 2026/1744";

// ---------------------------------------------------------------------------------------------------------------
// Anchors: subjects without a citation, and annex citations that stand for a rule
// ---------------------------------------------------------------------------------------------------------------

interface AnchorTerm {
  re: RegExp;
  /** Node whose deadline rule applies. */
  id: string;
  needs?: RegExp;
}
const HIGH_RISK = /high[- ]risk|hochrisiko/i;
export const ANCHOR_TERMS: readonly AnchorTerm[] = [
  { re: /(?<![\p{L}])(?:annex|anhang)\s+III(?![\p{L}\p{N}])/gu, id: "art_6.par_2" },
  { re: /(?<![\p{L}])(?:annex|anhang)\s+I(?![\p{L}\p{N}])/gu, id: "art_6.par_1", needs: HIGH_RISK },
  { re: /(?<![\p{L}])(?:general[- ]purpose\s+AI|GPAI|KI-Modelle?\s+mit\s+allgemeinem\s+Verwendungszweck)(?![\p{L}])/giu, id: "cpt_5" },
  { re: /(?<![\p{L}])(?:prohibited\s+(?:AI\s+)?practices|verbotene[n]?\s+(?:KI-)?Praktiken)(?![\p{L}])/giu, id: "art_5" },
  { re: /(?<![\p{L}])(?:AI\s+literacy|KI-Kompetenz)(?![\p{L}])/giu, id: "art_4" },
  { re: /(?<![\p{L}])(?:transparency\s+obligations|Transparenzpflichten)(?![\p{L}])/giu, id: "art_50" },
];
/** Annex citations whose deadline is the one of the classification rule in Article 6. */
const ANNEX_RULE: Array<{ prefix: string; id: string; needs?: RegExp }> = [
  { prefix: "anx_3", id: "art_6.par_2" },
  { prefix: "anx_1", id: "art_6.par_1", needs: HIGH_RISK },
];
const TRIGGER = /(?<![\p{L}])(?:appl(?:y|ies|ied|icable|ication)|from|by|as of|effective|until|ab|gilt|gelten|anwendbar|anzuwenden|spätestens|bis)(?![\p{L}])/iu;

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

const oneLine = (s: string, max = EXCERPT_MAX): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
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
  const tr = (en: string, deText: string): string => (de ? deText : en);

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

  // ---- 1. citations ------------------------------------------------------------------------------------------
  interface Checked {
    mention: RefMention;
    /** Node id in the version checked, if the citation exists there. */
    curId: string | null;
    sentence: number;
  }
  const refs: Checked[] = findRefs(text).map((mention) => ({ mention, curId: resolveIn(cur, mention.id), sentence: sentenceAt(mention.span.start) }));

  // quotations with a citation in the same or the previous sentence are checked as quotations (their inner citations and dates are not)
  interface QuoteJob {
    quote: (typeof quotes)[number];
    claimed: Checked;
  }
  const quoteJobs: QuoteJob[] = [];
  for (const q of quotes) {
    if (q.words < MIN_QUOTE_WORDS) continue;
    const outside = refs.filter((r) => r.mention.span.end <= q.span.start || r.mention.span.start >= q.span.end);
    const qs = sentenceAt(q.span.start);
    const same = outside.filter((r) => r.sentence === qs);
    const before = same.filter((r) => r.mention.span.end <= q.span.start);
    const claimed = before[before.length - 1] ?? same[0] ?? [...outside.filter((r) => r.sentence === qs - 1)].pop();
    if (claimed) quoteJobs.push({ quote: q, claimed });
  }
  const insideChecked = (s: Span): boolean => quoteJobs.some((j) => s.start >= j.quote.span.start && s.end <= j.quote.span.end);

  for (const r of refs) {
    if (insideChecked(r.mention.span)) continue;
    const { mention, curId } = r;
    const span = mention.span;
    const asWritten = cite(mention.id);
    if (curId) {
      add({ kind: "reference_ok", severity: "ok", span, excerpt: slice(span), ref: cite(curId), node: curId, sources: [src(version, curId)], message: tr(`${cite(curId)} exists in the version in force on ${asOf}.`, `${cite(curId)} besteht in der am ${asOf} geltenden Fassung.`) });
      continue;
    }
    const othId = resolveIn(oth, mention.id);
    if (othId && version === V2026) {
      const moved = movesFrom(oth, cur);
      const targets = uniq(
        moved
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
      add({
        kind: "removed_provision", severity: "error", span, excerpt: slice(span), ref: asWritten, node: othId, sources: [src(other, othId), ...targets.map((t) => src(version, t))], suggestion,
        message: tr(`${asWritten} no longer exists in the version in force on ${asOf}.`, `${asWritten} besteht in der am ${asOf} geltenden Fassung nicht mehr.`),
      });
    } else if (othId) {
      add({
        kind: "unknown_provision", severity: "warning", span, excerpt: slice(span), ref: asWritten, node: othId, sources: [src(other, othId)],
        message: tr(`${asWritten} is not in the text in force on ${asOf}; it was inserted by ${ACT} (consolidated version from 2026-07-27).`, `${asWritten} steht nicht im am ${asOf} geltenden Text; eingefügt durch ${ACT} (konsolidierte Fassung ab 2026-07-27).`),
      });
    } else {
      add({
        kind: "unknown_provision", severity: "error", span, excerpt: slice(span), ref: asWritten, sources: [],
        message: tr(`${asWritten} does not exist in the AI Act (neither in the Official Journal nor in the consolidated version).`, `${asWritten} gibt es in der KI-Verordnung nicht (weder in der Amtsblatt- noch in der konsolidierten Fassung).`),
      });
    }
  }

  // ---- 3. quotations (before dates, so that dates inside a checked quotation are left to the quotation check) -----
  for (const { quote, claimed } of quoteJobs) {
    const claimedId = claimed.curId ?? claimed.mention.id;
    let v: VerifyResult;
    try {
      v = verifyCitationWith({ quote: quote.inner, claimed_ref: claimedId, as_of: asOf, lang }, load, deadlines);
    } catch {
      continue;
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
        add({ ...base, ...found, kind: "quote_ok", severity: "ok", sources, message: tr(`The quotation matches the wording in force on ${asOf}${at ? ` (${cite(at)})` : ""}.`, `Das Zitat entspricht dem am ${asOf} geltenden Wortlaut${at ? ` (${cite(at)})` : ""}.`) });
        break;
      case "found_other_version": {
        const now = at ? cur.byId.get(at)?.text : undefined;
        add({
          ...base, ...found, kind: "outdated_quote", severity: "error", sources: at ? [src(other, at), src(version, at)] : [],
          ...(now ? { expected: oneLine(now, 200) } : {}),
          message: version === V2026
            ? tr(`The quotation is the wording of the Official Journal version; it was amended by ${ACT}.`, `Das Zitat gibt den Wortlaut der Amtsblattfassung wieder; er wurde durch ${ACT} geändert.`)
            : tr(`The quotation is the wording of the consolidated version (${ACT}), which is not yet in force on ${asOf}.`, `Das Zitat gibt den Wortlaut der konsolidierten Fassung (${ACT}) wieder, die am ${asOf} noch nicht gilt.`),
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
  }
  const dates = findDates(text).filter((d) => !insideChecked(d.span));
  const dist = (s: Span, d: Span): number => (s.end <= d.start ? d.start - s.end : s.start >= d.end ? s.start - d.end + 0.5 : 0);
  for (const d of dates) {
    const si = sentenceAt(d.span.start);
    const sentence = sentences[si] as Span;
    const sText = slice(sentence);
    const subjects: Subject[] = [];
    for (const r of refs) {
      if (r.sentence !== si || !r.curId || insideChecked(r.mention.span)) continue;
      const annex = ANNEX_RULE.find((a) => r.curId === a.prefix || (r.curId as string).startsWith(`${a.prefix}.`));
      const ruleId = annex && (!annex.needs || annex.needs.test(sText)) ? annex.id : r.curId;
      subjects.push({ ruleId, cited: r.curId, span: r.mention.span });
    }
    for (const a of ANCHOR_TERMS) {
      if (a.needs && !a.needs.test(sText)) continue;
      for (const m of sText.matchAll(a.re)) {
        const start = sentence.start + m.index;
        subjects.push({ ruleId: a.id, span: { start, end: start + m[0].length } });
      }
    }
    if (subjects.length === 0) continue;
    subjects.sort((x, y) => dist(x.span, d.span) - dist(y.span, d.span) || x.span.start - y.span.start);
    const found = d.iso;
    const base = { span: d.span, excerpt: slice(d.span), found };
    const laterAct = version === V2024;
    let done = false;

    // The nearest subject that can say something decides. Per subject, deadlines written in the cited text go first
    // (the date appears in the text of the cited node or below it, in one of the versions), then the application date
    // of the matching rule of the deadline table, in both versions.
    let unverified: { s: Subject; c: { rule: DeadlineRule; dates: string[] } } | undefined;
    for (const s of subjects) {
      if (s.cited) {
        const c = textDates(cur, s.cited);
        const o = textDates(oth, s.cited);
        if (c.includes(found)) {
          add({ ...base, kind: "deadline_ok", severity: "ok", ref: cite(s.cited), node: s.cited, sources: [src(version, s.cited)], message: tr(`${found} is the date in the text of ${cite(s.cited)} in force on ${asOf}.`, `${found} ist das Datum im am ${asOf} geltenden Text von ${cite(s.cited)}.`) });
          done = true;
          break;
        }
        if (o.includes(found)) {
          const at = o.indexOf(found);
          const expected = c.length === o.length ? c[at] : new Set(c).size === 1 ? c[0] : undefined;
          if (laterAct) {
            add({ ...base, kind: "unverified_date", severity: "warning", ref: cite(s.cited), node: s.cited, ...(expected ? { expected } : {}), sources: [src(other, s.cited), src(version, s.cited)], message: tr(`${found} is the date in the consolidated text (${ACT}), which is not yet in force on ${asOf}.`, `${found} ist das Datum im konsolidierten Text (${ACT}), der am ${asOf} noch nicht gilt.`) });
          } else {
            add({ ...base, kind: "outdated_deadline", severity: "error", ref: cite(s.cited), node: s.cited, ...(expected ? { expected } : {}), sources: [src(other, s.cited), src(version, s.cited)], message: tr(`${cite(s.cited)} gave ${found}; on ${asOf} the text says ${expected ?? "another date"} (changed by ${ACT}).`, `${cite(s.cited)} nannte ${found}; am ${asOf} lautet der Text ${expected ?? "auf ein anderes Datum"} (geändert durch ${ACT}).`) });
          }
          done = true;
          break;
        }
      }
      const c = ruleDates(version, cur, s.ruleId, deadlines);
      if (!c) continue;
      const o = ruleDates(other, oth, s.ruleId, deadlines);
      unverified ??= { s, c };
      const ref = cite(s.ruleId);
      const expected = c.dates[0] as string;
      const sources = [...c.rule.source_nodes.map((n) => src(version, n)), ...(o ? o.rule.source_nodes.map((n) => src(other, n)) : [])];
      if (c.dates.includes(found)) {
        add({ ...base, kind: "deadline_ok", severity: "ok", ref, node: s.ruleId, sources: c.rule.source_nodes.map((n) => src(version, n)), message: tr(`${found} is the application date of ${ref} on ${asOf}.`, `${found} ist der Geltungsbeginn von ${ref} am ${asOf}.`) });
        done = true;
      } else if (o?.dates.includes(found)) {
        done = true;
        if (laterAct) {
          add({ ...base, kind: "unverified_date", severity: "warning", ref, node: s.ruleId, expected, sources, message: tr(`${found} is the application date only in the consolidated version (${ACT}, from 2026-07-27); on ${asOf} ${ref} applies from ${expected}.`, `${found} gilt nur nach der konsolidierten Fassung (${ACT}, ab 2026-07-27); am ${asOf} gilt ${ref} ab ${expected}.`) });
        } else {
          add({ ...base, kind: "outdated_deadline", severity: "error", ref, node: s.ruleId, expected, sources, message: tr(`${found} was the application date of ${ref}; on ${asOf} it is ${expected} (changed by ${ACT}).`, `${found} war der Geltungsbeginn von ${ref}; am ${asOf} ist es der ${expected} (geändert durch ${ACT}).`) });
        }
      }
      if (done) break;
    }
    if (done) continue;
    if (!done && unverified && TRIGGER.test(sText)) {
      const { s, c } = unverified;
      const ref = cite(s.ruleId);
      add({ ...base, kind: "unverified_date", severity: "warning", ref, node: s.ruleId, expected: c.dates[0] as string, sources: c.rule.source_nodes.map((n) => src(version, n)), message: tr(`${found} does not match the application date of ${ref} on ${asOf} (${c.dates[0] as string}).`, `${found} stimmt nicht mit dem Geltungsbeginn von ${ref} am ${asOf} überein (${c.dates[0] as string}).`) });
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

