import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const LANGS = ["en", "de"] as const;
export type Lang = (typeof LANGS)[number];

/** Official Journal version and consolidated version after the Omnibus (CELEX ids, also used as corpus version names). */
export const V2024 = "32024R1689";
export const V2026 = "02024R1689-20260727";
export const CELEX_IDS = [V2024, V2026] as const;

export const rawPath = (celex: string, lang: Lang): string => join(REPO_ROOT, "data/raw", `${celex}.${lang}.xhtml`);
export const corpusPath = (celex: string, lang: Lang): string => join(REPO_ROOT, "data/corpus", `${celex}.${lang}.json`);
export const diffPath = (lang: Lang): string => join(REPO_ROOT, "data/diff", `${lang}.json`);
export const diffReportPath = (lang: Lang): string => join(REPO_ROOT, "data/diff", `${lang}.report.md`);
export const h3Path = (): string => join(REPO_ROOT, "data/h3.json");
