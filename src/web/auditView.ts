/**
 * View model of the document checker (isomorphic, no DOM): labels, ordering of findings, segmentation of the text for
 * the markers, source wording of a finding and the two exports (Markdown report, JSON).
 */
import type { AuditResult, Finding, FindingKind, Severity } from "../tools/auditCore.js";
import { descendants } from "../tools/corpus.js";
import type { CorpusLoader, Version } from "../tools/corpus.js";
import { formatRef } from "../tools/formatRef.js";
import { formatDate, ISO_DATE, NOT_LEGAL_ADVICE, versionName } from "./i18n.js";
import type { Lang, Pair } from "./i18n.js";

export const SEVERITIES: readonly Severity[] = ["error", "warning", "info", "ok"];
const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2, ok: 3 };

/** A symbol per severity, so that the meaning never depends on colour alone. */
export const SEVERITY_SYMBOL: Record<Severity, string> = { error: "✖", warning: "▲", info: "ℹ", ok: "✔" };
export const SEVERITY_LABEL: Record<Severity, Pair> = {
  error: { en: "Error", de: "Fehler" },
  warning: { en: "Warning", de: "Warnung" },
  info: { en: "Note", de: "Hinweis" },
  ok: { en: "OK", de: "In Ordnung" },
};
export const SEVERITY_PLURAL: Record<Severity, Pair> = {
  error: { en: "Errors", de: "Fehler" },
  warning: { en: "Warnings", de: "Warnungen" },
  info: { en: "Notes", de: "Hinweise" },
  ok: { en: "OK", de: "In Ordnung" },
};

/** Plain-language names of the finding kinds (the raw kind is never shown in the interface). */
export const KIND_LABEL: Record<FindingKind, Pair> = {
  reference_ok: { en: "Provision found", de: "Vorschrift gefunden" },
  removed_provision: { en: "Provision removed", de: "Vorschrift gestrichen" },
  unknown_provision: { en: "Provision does not exist", de: "Vorschrift existiert nicht" },
  not_yet_in_force: { en: "Not yet in force", de: "Noch nicht in Kraft" },
  deadline_ok: { en: "Date correct", de: "Datum korrekt" },
  outdated_deadline: { en: "Outdated deadline", de: "Veraltete Frist" },
  unverified_date: { en: "Date could not be checked", de: "Datum nicht prüfbar" },
  quote_ok: { en: "Quotation correct", de: "Zitat korrekt" },
  outdated_quote: { en: "Outdated quotation", de: "Veraltetes Zitat" },
  wrong_pinpoint: { en: "Wrong place cited", de: "Falsche Fundstelle" },
  quote_deviates: { en: "Quotation differs from the text", de: "Zitat weicht vom Text ab" },
  quote_not_found: { en: "Quotation not found", de: "Zitat nicht gefunden" },
  not_checked: { en: "Not checked", de: "Nicht geprüft" },
  no_references: { en: "No provisions mentioned", de: "Keine Vorschriften genannt" },
};

export const kindLabel = (kind: string, lang: Lang): string => (KIND_LABEL as Record<string, Pair | undefined>)[kind]?.[lang] ?? kind;

export interface OrderedFinding {
  /** Index in `AuditResult.findings` (stable anchor of the card and of the markers). */
  index: number;
  finding: Finding;
}

/** Errors first, then warnings, notes and ok; inside a severity by position in the text. */
export function orderFindings(findings: readonly Finding[]): OrderedFinding[] {
  return findings
    .map((finding, index) => ({ index, finding }))
    .sort((a, b) => RANK[a.finding.severity] - RANK[b.finding.severity] || a.finding.span.start - b.finding.span.start || a.index - b.index);
}

// ---------------------------------------------------------------------------------------------------------------
// Markers

export interface Segment {
  text: string;
  /** Indices (into `findings`) of the findings whose span covers the segment; empty for plain text. */
  findings: number[];
  /** Highest severity among them, null for plain text. */
  severity: Severity | null;
}

/**
 * Cuts the text at every start and end of a finding span. Overlapping spans share a segment, which carries the
 * highest severity. Findings of a severity not in `visible` are left out. Concatenating the segments gives the text.
 */
export function segmentText(text: string, findings: readonly Finding[], visible: ReadonlySet<Severity> = new Set(SEVERITIES)): Segment[] {
  const used = findings.map((f, i) => ({ f, i })).filter(({ f }) => visible.has(f.severity) && f.span.end > f.span.start);
  const cuts = new Set<number>([0, text.length]);
  for (const { f } of used) {
    cuts.add(Math.max(0, Math.min(text.length, f.span.start)));
    cuts.add(Math.max(0, Math.min(text.length, f.span.end)));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k] as number;
    const b = points[k + 1] as number;
    if (b === a) continue;
    const covering = used.filter(({ f }) => f.span.start <= a && f.span.end >= b);
    const ids = covering.map(({ i }) => i);
    const severity = covering.length === 0 ? null : covering.reduce<Severity>((best, { f }) => (RANK[f.severity] < RANK[best] ? f.severity : best), "ok");
    const prev = out[out.length - 1];
    if (prev && prev.severity === severity && prev.findings.length === ids.length && prev.findings.every((x, j) => x === ids[j])) prev.text += text.slice(a, b);
    else out.push({ text: text.slice(a, b), findings: ids, severity });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Sources

export const SOURCE_TEXT_MAX = 3000;

export interface SourceInfo {
  version: string;
  id: string;
  citation: string;
  /** Wording of the node and of everything below it, one line per node; empty if the node is not in the corpus. */
  text: string;
  truncated: boolean;
}

/** `source` is `<version>:<node id>` as in `Finding.sources`. */
export function sourceInfo(source: string, load: CorpusLoader, lang: Lang): SourceInfo {
  const cut = source.indexOf(":");
  const version = source.slice(0, cut);
  const id = source.slice(cut + 1);
  let text = "";
  try {
    const idx = load(version as Version, lang);
    const node = idx.byId.get(id);
    if (node) text = [node, ...descendants(idx, id)].map((n) => n.text.trim()).filter((t) => t !== "").join("\n");
  } catch {
    // a version the loader does not know: the citation is still shown
  }
  const truncated = text.length > SOURCE_TEXT_MAX;
  return { version, id, citation: formatRef(id, lang), text: truncated ? `${text.slice(0, SOURCE_TEXT_MAX).trimEnd()} …` : text, truncated };
}

/** Sources of a finding without duplicates, in order. */
export const uniqueSources = (f: Finding): string[] => [...new Set(f.sources)];

export const showValue = (v: string, lang: Lang): string => (ISO_DATE.test(v) ? formatDate(v, lang) : v);

// ---------------------------------------------------------------------------------------------------------------
// Exports

export interface ReleaseInfo {
  releaseId: string;
  manifestSha256: string;
  keyId?: string;
}

const T = {
  title: { en: "Document check against the EU AI Act", de: "Dokumentprüfung gegen den EU AI Act" },
  asOf: { en: "Date checked", de: "Stichtag" },
  version: { en: "Text version in force", de: "Geltende Fassung" },
  release: { en: "Corpus release", de: "Korpus-Release" },
  summary: { en: "Result", de: "Ergebnis" },
  findings: { en: "Findings", de: "Befunde" },
  found: { en: "found", de: "gefunden" },
  expected: { en: "expected", de: "erwartet" },
  source: { en: "Source", de: "Quelle" },
  suggestion: { en: "Suggestion", de: "Vorschlag" },
  signed: { en: "signature valid, key", de: "Signatur gültig, Schlüssel" },
} satisfies Record<string, Pair>;

const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();

export function auditReportMarkdown(result: AuditResult, release: ReleaseInfo, lang: Lang): string {
  const t = (p: Pair): string => p[lang];
  const counts = (["error", "warning", "info", "ok"] as const).map((s) => `${result.summary[s]} ${SEVERITY_PLURAL[s][lang]}`).join(", ");
  const lines: string[] = [
    `# ${t(T.title)}`,
    "",
    `- ${t(T.asOf)}: ${result.as_of} (${formatDate(result.as_of, lang)})`,
    `- ${t(T.version)}: ${versionName(result.version_checked, lang)}`,
    `- ${t(T.release)}: ${release.releaseId} (manifest sha256 ${release.manifestSha256}${release.keyId ? `; ${t(T.signed)} ${release.keyId}` : ""})`,
    `- ${t(T.summary)}: ${counts}`,
    "",
    `## ${t(T.findings)}`,
    "",
  ];
  for (const { finding: f } of orderFindings(result.findings)) {
    const bits = [`**${SEVERITY_LABEL[f.severity][lang]}: ${kindLabel(f.kind, lang)}**`, `"${oneLine(f.excerpt)}"`, oneLine(f.message)];
    if (f.found !== undefined) bits.push(`${t(T.found)}: ${showValue(f.found, lang)}`);
    if (f.expected !== undefined) bits.push(`${t(T.expected)}: ${showValue(oneLine(f.expected).slice(0, 200), lang)}`);
    if (f.ref) bits.push(`${t(T.source)}: ${f.ref}`);
    if (f.suggestion) bits.push(`${t(T.suggestion)}: ${oneLine(f.suggestion)}`);
    lines.push(`- ${bits.join(" | ")}`);
  }
  lines.push("", `_${NOT_LEGAL_ADVICE[lang]}_`, "", `_${result.notice[lang]}_`, "");
  return lines.join("\n");
}

export function auditJson(result: AuditResult, release: ReleaseInfo, text: string, lang: Lang): string {
  return `${JSON.stringify({ release: { id: release.releaseId, manifest_sha256: release.manifestSha256, ...(release.keyId ? { signing_key_id: release.keyId } : {}) }, input: { text, as_of: result.as_of, lang }, result }, null, 2)}\n`;
}
