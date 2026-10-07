/** Mandatory notice texts (German and English), with the version actually checked. */
import { V2024, V2026 } from "../constants.js";

export interface Notice {
  de: string;
  en: string;
}

const NAMES: Record<string, { de: string; en: string }> = {
  [V2026]: { de: "die konsolidierte Fassung 02024R1689-20260727", en: "the consolidated version 02024R1689-20260727" },
  [V2024]: { de: "die Amtsblattfassung 32024R1689", en: "the Official Journal version 32024R1689" },
};

const join = (parts: string[], and: string): string => (parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1] as string}`);

/** `versions`: the corpus versions the answer is based on (one or both). */
export function notice(versions: readonly string[]): Notice {
  const uniq = [...new Set(versions)];
  const de = join(uniq.map((v) => NAMES[v]?.de ?? v), "und");
  const en = join(uniq.map((v) => NAMES[v]?.en ?? v), "and");
  const consolidatedOnly = uniq.length === 1 && uniq[0] === V2026;
  return {
    de: `Prüfung gegen ${de} von EUR-Lex. ${consolidatedOnly ? "Diese Fassung ist" : "Diese Wiedergabe ist"} nicht rechtlich authentisch; verbindlich ist allein das Amtsblatt (ABl. L 2024/1689, L 2026/1744). Keine Rechtsberatung. Dieses Dokument bestätigt keine Konformität eines Systems; es belegt, dass die zitierten Textstellen zum angegebenen Stichtag im genannten Korpus-Release so lauten.`,
    en: `Checked against ${en} from EUR-Lex. ${consolidatedOnly ? "This version is" : "This rendition is"} not legally authentic; only the Official Journal (OJ L 2024/1689, L 2026/1744) is binding. Not legal advice. This document does not certify compliance of any system; it attests that the quoted passages read as stated in the named corpus release on the given date.`,
  };
}
