import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export { CELEX_IDS, LANGS, V2024, V2026 } from "./constants.js";
export type { Lang } from "./constants.js";
import type { Lang } from "./constants.js";

export const rawPath = (celex: string, lang: Lang): string => join(REPO_ROOT, "data/raw", `${celex}.${lang}.xhtml`);
export const corpusPath = (celex: string, lang: Lang): string => join(REPO_ROOT, "data/corpus", `${celex}.${lang}.json`);
export const diffPath = (lang: Lang): string => join(REPO_ROOT, "data/diff", `${lang}.json`);
export const diffReportPath = (lang: Lang): string => join(REPO_ROOT, "data/diff", `${lang}.report.md`);
export const h3Path = (): string => join(REPO_ROOT, "data/h3.json");
