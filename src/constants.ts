/** Isomorphic constants (no node: imports): shared by the Node tools and the browser verify bundle. */
export const LANGS = ["en", "de"] as const;
export type Lang = (typeof LANGS)[number];

/** Official Journal version and consolidated version after the Omnibus (CELEX ids, also used as corpus version names). */
export const V2024 = "32024R1689";
export const V2026 = "02024R1689-20260727";
export const CELEX_IDS = [V2024, V2026] as const;
