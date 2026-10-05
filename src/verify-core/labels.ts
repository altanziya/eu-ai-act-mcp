/**
 * Human-readable labels of the verify page in English and German (isomorphic: no node: imports). The raw enum values of
 * the verification result (`in_force_at_as_of`, `exact`, ...) are translated here; the raw field may stand next to the
 * label in brackets. The mandatory notices are not part of this file: they stay static in site/verify/index.html.
 */
import { V2024, V2026 } from "../constants.js";
import type { Lang } from "../constants.js";
import type { Validity } from "../tools/deadlines.js";
import type { VerifyResult } from "../tools/verifyCore.js";

export type PageLang = Lang;

type Pair = Record<PageLang, string>;

/** Plain-language explanation of the V0 status. */
export const STATUS_EXPLANATION: Record<VerifyResult["status"], Pair> = {
  exact: { en: "the quotation appears word for word at this location", de: "das Zitat steht wörtlich an dieser Stelle" },
  fuzzy: { en: "the quotation matches with minor differences in wording", de: "das Zitat stimmt bis auf kleine Abweichungen im Wortlaut überein" },
  found_at_other_provision: { en: "the quotation exists, but at a different provision than claimed", de: "das Zitat gibt es, aber an einer anderen Bestimmung als angegeben" },
  found_other_version: { en: "the quotation exists only in the other version of the text", de: "das Zitat gibt es nur in der anderen Fassung des Textes" },
  found_other_language: { en: "the quotation exists only in the other language version", de: "das Zitat gibt es nur in der anderen Sprachfassung" },
  multiple_matches: { en: "the quotation appears at several places, no single location", de: "das Zitat steht an mehreren Stellen, keine eindeutige Fundstelle" },
  mismatch_hard_token: { en: "similar wording, but numbers, dates or other precise terms differ", de: "ähnlicher Wortlaut, aber Zahlen, Daten oder andere genaue Angaben weichen ab" },
  multi_node: { en: "the quotation spans several provisions of one article", de: "das Zitat reicht über mehrere Bestimmungen eines Artikels" },
  too_short: { en: "the quotation is too short to be checked", de: "das Zitat ist zu kurz für eine Prüfung" },
  not_found: { en: "the quotation was not found in the text", de: "das Zitat wurde im Text nicht gefunden" },
};

const LANG_CHECK: Record<VerifyResult["language_check"]["result"], Pair> = {
  matches: { en: "matches the stated language", de: "passt zur angegebenen Sprache" },
  differs: { en: "differs from the stated language", de: "weicht von der angegebenen Sprache ab" },
  not_checked: { en: "not checked", de: "nicht geprüft" },
};

export const versionLabel = (version: string | undefined, lang: PageLang): string => {
  if (version === V2026) return lang === "de" ? `konsolidierte Fassung 2026 (${V2026})` : `consolidated text 2026 (${V2026})`;
  if (version === V2024) return lang === "de" ? `Amtsblattfassung 2024 (${V2024})` : `Official Journal text 2024 (${V2024})`;
  return version ?? "–";
};

const dash = "–";

/** Validity as a sentence; the raw state follows in brackets. */
export function validityLabel(v: Validity | undefined, lang: PageLang): string {
  if (!v) return dash;
  const de = lang === "de";
  let text: string;
  switch (v.state) {
    case "in_force_at_as_of":
      text = de ? "am Stichtag anwendbar" : "applicable on the given date";
      break;
    case "not_yet_applicable_until":
      text = de ? `noch nicht anwendbar, gilt ab ${v.until ?? "?"}` : `not yet applicable, applies from ${v.until ?? "?"}`;
      break;
    case "superseded_by":
      text = de ? "durch die Änderung 2026 ersetzt" : "superseded by the 2026 amendment";
      break;
    case "inserted_by":
      text = de ? "eingefügt durch Verordnung (EU) 2026/1744" : "inserted by Regulation (EU) 2026/1744";
      break;
    default:
      text = de ? "unbekannt" : "unknown";
  }
  return `${text} (${v.state})`;
}

/** One line per later date by class of AI system; empty when the validity has none. */
export function conditionalDateLines(v: Validity | undefined, lang: PageLang): string[] {
  return (v?.conditional_dates ?? []).map((d) =>
    lang === "de" ? `Für ${d.condition} gilt die Anwendung erst ab ${d.date}.` : `For ${d.condition}, the rule applies only from ${d.date}.`,
  );
}

export const statusLabel = (status: string | undefined, lang: PageLang): string => {
  if (status === undefined) return dash;
  const e = (STATUS_EXPLANATION as Record<string, Pair | undefined>)[status];
  return e ? `${e[lang]} (${status})` : status;
};

export const languageCheckLabel = (c: VerifyResult["language_check"] | undefined, lang: PageLang): string => {
  if (!c) return dash;
  return `${LANG_CHECK[c.result][lang]}${c.detected_lang ? ` [${c.detected_lang}]` : ""} (${c.result})`;
};

export const versionRowLabel = (r: Partial<VerifyResult> | undefined, lang: PageLang): string => {
  if (!r) return dash;
  const found = r.found_in_version ? `${lang === "de" ? "gefunden in" : "found in"} ${versionLabel(r.found_in_version, lang)}` : "";
  return [versionLabel(r.version_checked, lang), found].filter(Boolean).join("; ");
};

export const locationLabel = (r: Partial<VerifyResult> | undefined): string => (r?.match ? `${r.match.provision_id} (${r.match.version_id}, ${r.match.lang})` : dash);

// ---------------------------------------------------------------------------------------------------------------
// UI strings
// ---------------------------------------------------------------------------------------------------------------

export const UI = {
  title: { en: "Verify evidence record", de: "Evidence Record prüfen" },
  needJs: { en: "This page needs JavaScript to recompute the record from the link.", de: "Diese Seite benötigt JavaScript, um den Record aus dem Link neu zu berechnen." },
  noRecord: { en: "No record in the link.", de: "Kein Record im Link." },
  unreadable: { en: "The link does not contain a readable record.", de: "Der Link enthält keinen lesbaren Record." },
  loading: { en: "Loading release and recomputing …", de: "Lade Release und berechne neu …" },
  failed: { en: "Verification not possible", de: "Prüfung nicht möglich" },
  checksH: { en: "Checks", de: "Prüfungen" },
  recordHash: { en: "Record hash", de: "Record-Hash" },
  manifestHash: { en: "Manifest hash in the record", de: "Manifest-Hash im Record" },
  filesAgainstManifest: { en: "Corpus files against the manifest", de: "Korpusdateien gegen das Manifest" },
  signature: { en: "Signature of the manifest", de: "Signatur des Manifests" },
  matches: { en: "Recomputation matches the record", de: "Neuberechnung stimmt mit dem Record überein" },
  ok: { en: "✓ ok", de: "✓ ok" },
  mismatch: { en: "✗ mismatch", de: "✗ Abweichung" },
  notChecked: { en: "– not checked", de: "– nicht geprüft" },
  sigValid: { en: "valid", de: "gültig" },
  sigInvalid: { en: "invalid", de: "ungültig" },
  sigMissing: { en: "missing (release not signed)", de: "fehlt (Release nicht signiert)" },
  sigUnknownKey: { en: "unknown key", de: "unbekannter Schlüssel" },
  sigRevoked: { en: "signature revoked", de: "Signatur widerrufen" },
  allOk: {
    en: "All checks passed: signature valid, hashes match, recomputation matches the record.",
    de: "Alle Prüfungen bestanden: Signatur gültig, Hashes stimmen, Neuberechnung stimmt mit dem Record überein.",
  },
  notAllOk: { en: "Not all checks passed: do not treat this record as verified.", de: "Nicht alle Prüfungen bestanden: der Record darf nicht als belegt gelten." },
  quoteH: { en: "Checked quotation", de: "Geprüftes Zitat" },
  compareH: { en: "Stated in the record and recomputed here", de: "Im Record angegeben und hier neu berechnet" },
  colStated: { en: "stated in the record", de: "im Record angegeben" },
  colRecomputed: { en: "recomputed here", de: "hier neu berechnet" },
  rowStatus: { en: "Match status", de: "Trefferstatus" },
  rowLocation: { en: "Location", de: "Fundstelle" },
  rowVersion: { en: "Version checked", de: "Geprüfte Fassung" },
  rowValidity: { en: "Validity on the given date", de: "Geltung am Stichtag" },
  rowLanguage: { en: "Language check", de: "Sprachprüfung" },
  laterDatesH: { en: "Later application date by class of AI system", de: "Spätere Anwendung je nach Klasse des KI-Systems" },
  differences: { en: "Differences", de: "Abweichungen" },
  nodesH: { en: "Cited provisions", de: "Zitierte Bestimmungen" },
  colId: { en: "id", de: "id" },
  colVersion: { en: "version", de: "Fassung" },
  colLang: { en: "language", de: "Sprache" },
  colPresent: { en: "present", de: "vorhanden" },
  creatorH: { en: "Statements by the creator (unverified)", de: "Angaben des Erstellers (ungeprüft)" },
  creatorIntro: {
    en: "Question, creator and creation time come from the creator of the record and are not checked here.",
    de: "Frage, Ersteller und Erstellungszeit stammen vom Ersteller des Records und werden hier nicht geprüft.",
  },
  creatorQuestion: { en: "question", de: "Frage" },
  creatorCreator: { en: "creator", de: "Ersteller" },
  creatorCreatedAt: { en: "created at", de: "erstellt am" },
  recordNoticeH: { en: "Notice in the record", de: "Hinweis im Record" },
  releaseLine: { en: "Release", de: "Release" },
} as const satisfies Record<string, Pair>;

export type UiKey = keyof typeof UI;
export const ui = (key: UiKey, lang: PageLang): string => UI[key][lang];

export const signatureLabel = (status: string, lang: PageLang): string => {
  const key = ({ valid: "sigValid", invalid: "sigInvalid", missing: "sigMissing", unknown_key: "sigUnknownKey", revoked: "sigRevoked" } as const)[status as "valid"];
  return key ? ui(key, lang) : status;
};

/** The page language: `?lang=de|en` wins, then the saved choice, then English. */
export function pickLang(search: string, saved: string | null): PageLang {
  const q = new URLSearchParams(search).get("lang");
  if (q === "de" || q === "en") return q;
  return saved === "de" ? "de" : "en";
}
