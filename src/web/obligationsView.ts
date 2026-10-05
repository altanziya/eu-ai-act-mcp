/**
 * View model of the obligations navigator (isomorphic, no DOM): headline sentence, grouping, timeline, the Markdown and
 * CSV exports and the share link (profile and date in the URL fragment, nothing is sent anywhere).
 */
import type { Obligation, ObligationsResult, Status } from "../tools/obligationsCore.js";
import { daysBetween, daysLabel, formatDate, ISO_DATE, NOT_LEGAL_ADVICE, versionName } from "./i18n.js";
import type { Lang, Pair } from "./i18n.js";
import { ANNEX_III_AREAS, KIND_NAMES, ROLE_NAME } from "./profileLabels.js";
import type { FormState } from "./profileForm.js";

export const STATUS_ORDER: readonly Status[] = ["applicable", "upcoming", "depends"];
export const STATUS_TITLE: Record<Status, Pair> = {
  applicable: { en: "Applies now", de: "Gilt jetzt" },
  upcoming: { en: "Upcoming", de: "Kommt noch" },
  depends: { en: "Depends", de: "Hängt ab" },
};
export const STATUS_HINT: Record<Status, Pair> = {
  applicable: { en: "These duties already apply on your date.", de: "Diese Pflichten gelten an Ihrem Stichtag bereits." },
  upcoming: { en: "These duties apply from a later date.", de: "Diese Pflichten gelten erst ab einem späteren Datum." },
  depends: { en: "No fixed date: it depends on a condition or on an assessment.", de: "Kein festes Datum: Es hängt von einer Bedingung oder einer Bewertung ab." },
};

export const kindName = (kind: string, lang: Lang): string => KIND_NAMES[kind]?.[lang] ?? kind;

export function groupObligations(result: ObligationsResult): Record<Status, Obligation[]> {
  const out: Record<Status, Obligation[]> = { applicable: [], upcoming: [], depends: [] };
  for (const o of result.obligations) out[o.status].push(o);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Headline

/** Obligations that carry the date of Chapter III for the profile (provider first, then deployer). */
const CHAPTER_III_PROBES = ["hrai-requirements-compliance", "risk-management-system", "deployer-use-per-instructions"];

const areaNumber = (profile: Record<string, unknown>): string => (typeof profile["annex_iii_area"] === "string" ? (profile["annex_iii_area"] as string) : "");

/** One or two sentences: the classification and, for high-risk systems, when Chapter III applies. */
export function headline(result: ObligationsResult, profile: Record<string, unknown>, lang: Lang): string {
  const de = lang === "de";
  const d = new Set(result.derived);
  if (profile["uses_or_provides_ai_system"] === false) {
    return de ? "Außerhalb des Anwendungsbereichs: Ihre Organisation stellt in der EU kein KI-System bereit oder nutzt keines. Es werden keine Pflichten aufgeführt." : "Out of scope: your organisation does not provide or use an AI system in the EU. No obligations are listed.";
  }
  const routes: string[] = [];
  if (d.has("high_risk_annex_iii")) {
    const n = areaNumber(profile);
    routes.push(de ? `Artikel 6 Absatz 2 und Anhang III${n ? ` Nummer ${n}` : ""}` : `Article 6(2) and Annex III${n ? ` point ${n}` : ""}`);
  }
  if (d.has("high_risk_annex_i")) routes.push(de ? "Artikel 6 Absatz 1 und Anhang I" : "Article 6(1) and Annex I");
  const parts: string[] = [];
  if (routes.length > 0) {
    parts.push(de ? `Hochrisiko nach ${routes.join(" sowie ")}.` : `High-risk under ${routes.join(" and ")}.`);
    const probe = CHAPTER_III_PROBES.map((id) => result.obligations.find((o) => o.id === id)).find((o) => o !== undefined);
    if (d.has("hr_chapter_iii_in_scope") && probe?.applies_from) {
      const date = formatDate(probe.applies_from, lang);
      if (probe.status === "applicable") parts.push(de ? `Kapitel III gilt seit dem ${date}.` : `Chapter III has applied since ${date}.`);
      else parts.push(de ? `Kapitel III gilt ab dem ${date} (${daysLabel(probe.days_until ?? daysBetween(result.as_of, probe.applies_from), lang)}).` : `Chapter III applies from ${date} (${daysLabel(probe.days_until ?? daysBetween(result.as_of, probe.applies_from), lang)}).`);
    } else if (!d.has("hr_chapter_iii_in_scope")) {
      parts.push(de ? "Kapitel III gilt für dieses System nach den Übergangsregeln des Artikels 111 nicht." : "Chapter III does not apply to this system under the transition rules of Article 111.");
    }
  } else if (d.has("annex_iii_area_set")) {
    const n = areaNumber(profile);
    parts.push(de ? `Anhang III Nummer ${n}, aber nicht hochriskant wegen der dokumentierten Ausnahme nach Artikel 6 Absatz 3.` : `Annex III point ${n}, but not high-risk because of the documented exception in Article 6(3).`);
  } else {
    parts.push(de ? "Nach Ihren Angaben ist das System nicht hochriskant." : "Based on your answers the system is not high-risk.");
  }
  if (d.has("gpai_systemic_risk")) parts.push(de ? "Sie stellen ein KI-Modell mit allgemeinem Verwendungszweck und systemischem Risiko bereit (Artikel 51 bis 55)." : "You provide a general-purpose AI model with systemic risk (Articles 51 to 55).");
  else if (profile["gpai_model"] === true) parts.push(de ? "Sie stellen ein KI-Modell mit allgemeinem Verwendungszweck bereit (Artikel 53 und 54)." : "You provide a general-purpose AI model (Articles 53 and 54).");
  return parts.join(" ");
}

export const areaHeading = (n: string, lang: Lang): string => ANNEX_III_AREAS[n]?.[lang] ?? n;

// ---------------------------------------------------------------------------------------------------------------
// Timeline

export interface TimelineStop {
  date: string;
  /** Whole days from the date checked; 0 for the first stop ("today"). */
  days: number;
  today: boolean;
  /** Obligations whose date this is; for the first stop the ones that already apply. */
  obligations: Obligation[];
}

/** First stop: the date checked with everything that applies; then one stop per future date. */
export function timelineStops(result: ObligationsResult): TimelineStop[] {
  const byId = new Map(result.obligations.map((o) => [o.id, o]));
  const stops: TimelineStop[] = [{ date: result.as_of, days: 0, today: true, obligations: result.obligations.filter((o) => o.status === "applicable") }];
  for (const t of result.timeline) {
    if (t.date === result.as_of) continue;
    stops.push({ date: t.date, days: daysBetween(result.as_of, t.date), today: false, obligations: t.ids.map((id) => byId.get(id)).filter((o): o is Obligation => o !== undefined) });
  }
  return stops;
}

// ---------------------------------------------------------------------------------------------------------------
// Exports

export interface ExportContext {
  result: ObligationsResult;
  profile: Record<string, unknown>;
  lang: Lang;
  releaseId: string;
  manifestSha256: string;
}

export const dateLine = (o: Obligation, asOf: string, lang: Lang): string => {
  if (o.applies_from === null) return lang === "de" ? "kein festes Datum" : "no fixed date";
  if (o.status === "applicable") return lang === "de" ? `gilt seit ${formatDate(o.applies_from, lang)}` : `applies since ${formatDate(o.applies_from, lang)}`;
  const days = o.days_until ?? daysBetween(asOf, o.applies_from);
  return lang === "de" ? `gilt ab ${formatDate(o.applies_from, lang)} (${daysLabel(days, lang)})` : `applies from ${formatDate(o.applies_from, lang)} (${daysLabel(days, lang)})`;
};

const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();
const citations = (o: Obligation): string => o.provisions.map((p) => p.citation).join("; ");

export function obligationsMarkdown(c: ExportContext): string {
  const { result, lang } = c;
  const de = lang === "de";
  const lines: string[] = [
    `# ${de ? "Checkliste Pflichten nach dem EU AI Act" : "Obligations checklist under the EU AI Act"}`,
    "",
    `- ${de ? "Stichtag" : "Date checked"}: ${result.as_of} (${formatDate(result.as_of, lang)})`,
    `- ${de ? "Geltende Fassung" : "Text version in force"}: ${versionName(result.version, lang)}`,
    `- ${de ? "Korpus-Release" : "Corpus release"}: ${c.releaseId} (manifest sha256 ${c.manifestSha256})`,
    `- ${de ? "Einstufung" : "Classification"}: ${headline(result, c.profile, lang)}`,
    "",
  ];
  const groups = groupObligations(result);
  for (const status of STATUS_ORDER) {
    if (groups[status].length === 0) continue;
    lines.push(`## ${STATUS_TITLE[status][lang]} (${groups[status].length})`, "");
    for (const o of groups[status]) {
      lines.push(`- [ ] **${o.title}** (${citations(o)}), ${dateLine(o, result.as_of, lang)}`);
      if (o.legal_assessment_needed) lines.push(`  - ${de ? "Rechtliche Bewertung nötig" : "Legal assessment needed"}: ${oneLine(o.legal_assessment_needed)}`);
      if (o.deadline_caveat) lines.push(`  - ${de ? "Hinweis zum Datum" : "Date caveat"}: ${oneLine(o.deadline_caveat)}`);
      lines.push(`  > ${oneLine(o.quote)}`);
    }
    lines.push("");
  }
  if (result.open_questions.length > 0) {
    lines.push(`## ${de ? "Offene Fragen" : "Open questions"}`, "");
    for (const q of result.open_questions) lines.push(`- ${oneLine(q.question)}`);
    lines.push("");
  }
  lines.push(`_${NOT_LEGAL_ADVICE[lang]}_`, "", `_${result.notice}_`, "");
  return lines.join("\n");
}

/** A CSV cell: quoted, quotes doubled; a leading = + - @ or tab is defused so that a spreadsheet does not run it as a formula. */
export function csvCell(value: string): string {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${v.replace(/"/g, '""')}"`;
}

export function obligationsCsv(c: ExportContext): string {
  const { result, lang } = c;
  const de = lang === "de";
  const head = de
    ? ["Status", "Titel", "Art", "Rollen", "Fundstellen", "Gilt ab", "Tage bis dahin", "Durch Omnibus geändert", "Rechtliche Bewertung nötig", "Hinweis zum Datum", "Zitat"]
    : ["Status", "Title", "Kind", "Roles", "Provisions", "Applies from", "Days until", "Changed by Omnibus", "Legal assessment needed", "Date caveat", "Quotation"];
  const yes = de ? "ja" : "yes";
  const no = de ? "nein" : "no";
  const rows = result.obligations.map((o) => [
    STATUS_TITLE[o.status][lang],
    o.title,
    kindName(o.kind, lang),
    o.roles.map((r) => (r === "any" ? (de ? "alle" : "all") : ROLE_NAME(r, lang))).join("; "),
    citations(o),
    o.applies_from ?? "",
    o.days_until === null ? "" : String(o.days_until),
    o.changed_by_omnibus ? yes : no,
    o.legal_assessment_needed ? oneLine(o.legal_assessment_needed) : "",
    o.deadline_caveat ? oneLine(o.deadline_caveat) : "",
    oneLine(o.quote),
  ]);
  return `﻿${[head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Share link

export interface SharedState {
  state: FormState;
  asOf: string;
}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (s: string): Uint8Array => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** `#p=<base64url JSON>` with the answered questions and the date. */
export function encodeShare(s: SharedState): string {
  return `#p=${toBase64Url(new TextEncoder().encode(JSON.stringify({ v: 1, profile: s.state, as_of: s.asOf })))}`;
}

/** Reads a fragment written by `encodeShare`; null for anything else (wrong shape, bad base64, bad date). Values are checked by the caller against the form. */
export function decodeShare(fragment: string): SharedState | null {
  const m = /^#?p=([A-Za-z0-9_-]+)$/.exec(fragment);
  if (!m) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(m[1] as string))) as unknown;
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    const d = data as { v?: unknown; profile?: unknown; as_of?: unknown };
    if (d.v !== 1 || d.profile === null || typeof d.profile !== "object" || Array.isArray(d.profile)) return null;
    if (typeof d.as_of !== "string" || !ISO_DATE.test(d.as_of)) return null;
    return { state: d.profile as FormState, asOf: d.as_of };
  } catch {
    return null;
  }
}
