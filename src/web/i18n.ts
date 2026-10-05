/**
 * Shared language helpers of the browser tools (isomorphic, no DOM): the Pair type, date formatting and the texts that
 * the audit page and the navigator page have in common (release status line, load errors, notice).
 */
import type { Lang } from "../constants.js";

export type { Lang };
export type Pair = Record<Lang, string>;
export const pick = (p: Pair, lang: Lang): string => p[lang];

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "2027-12-02" -> "2 December 2027" / "2. Dezember 2027"; anything that is not an ISO date is returned unchanged. */
export function formatDate(iso: string, lang: Lang): string {
  if (!ISO_DATE.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const month = (lang === "de" ? MONTHS_DE : MONTHS_EN)[m - 1];
  if (month === undefined) return iso;
  return lang === "de" ? `${d}. ${month} ${y}` : `${d} ${month} ${y}`;
}

/** Whole days between two ISO dates (to - from). */
export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function daysLabel(days: number, lang: Lang): string {
  if (lang === "de") return days === 1 ? "in 1 Tag" : `in ${days} Tagen`;
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

export const releaseStatusLine = (releaseId: string, keyId: string, lang: Lang): string =>
  lang === "de"
    ? `Geprüft gegen das signierte Korpus-Release ${releaseId} (Schlüssel ${keyId}, Signatur gültig)`
    : `Checked against signed corpus release ${releaseId} (key ${keyId}, signature valid)`;

export const progressLine = (files: number, total: number, megabytes: number, lang: Lang): string =>
  lang === "de" ? `Lade Korpus … Dateien ${files}/${total}, ${megabytes.toFixed(1)} MB` : `Loading corpus … files ${files}/${total}, ${megabytes.toFixed(1)} MB`;

export const NOT_LEGAL_ADVICE: Pair = {
  en: "Not legal advice. The consolidated text is not legally authentic; only the Official Journal is binding.",
  de: "Keine Rechtsberatung. Die konsolidierte Fassung ist nicht rechtsverbindlich; verbindlich ist nur das Amtsblatt.",
};

export const versionName = (version: string, lang: Lang): string => {
  if (version === "02024R1689-20260727") return lang === "de" ? "konsolidierte Fassung 2026 (02024R1689-20260727)" : "consolidated text 2026 (02024R1689-20260727)";
  if (version === "32024R1689") return lang === "de" ? "Amtsblattfassung 2024 (32024R1689)" : "Official Journal text 2024 (32024R1689)";
  return version;
};

export const STORAGE_KEY = "aiact-lang";
