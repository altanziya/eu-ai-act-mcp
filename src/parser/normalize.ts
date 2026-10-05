import { createHash } from "node:crypto";

const QUOTE_MAP: Record<string, string> = {
  "‘": "'", // left single quotation mark
  "’": "'", // right single quotation mark / apostrophe
  "‚": "'", // single low-9 quotation mark
  "‛": "'", // single high-reversed-9 quotation mark
  "‹": "'",
  "›": "'",
  "“": '"', // left double quotation mark
  "”": '"', // right double quotation mark
  "„": '"', // double low-9 quotation mark
  "‟": '"', // double high-reversed-9 quotation mark
  "«": '"',
  "»": '"',
};

const QUOTE_RE = /[‘’‚‛‹›“”„‟«»]/g;
// Soft hyphen and zero-width characters carry no meaning in the text.
const INVISIBLE_RE = /[­​‌‍⁠﻿]/g;
// Non-breaking and exotic spaces are folded into a plain space by the whitespace collapse below.
const SPACE_RE = /[\s   -   　]+/g;
const LINE_BREAK_RE = new RegExp("\\r\\n|\\r|\\n|\\u2028|\\u2029");
const HYPHEN_RE = /[‐‑]/g;

/**
 * Normalize text for hashing and comparison: Unicode NFC, soft hyphens and zero-width characters
 * removed, typographic quotes folded to ASCII quotes, non-breaking hyphens folded to '-',
 * every whitespace run collapsed to one space. Line breaks ("\n") separate text blocks and are
 * kept; empty lines are dropped and each line is trimmed.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(INVISIBLE_RE, "")
    .replace(QUOTE_RE, (c) => QUOTE_MAP[c] ?? c)
    .replace(HYPHEN_RE, "-")
    .split(LINE_BREAK_RE)
    .map((line) => line.replace(SPACE_RE, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Node hash: SHA-256 over the normalized heading and normalized text (joined by a line break),
 * so a change of either the heading or the text changes the hash, and container nodes
 * without text (chapters, sections) still get a distinguishing hash.
 */
export function nodeHash(heading: string, text: string): string {
  return sha256Hex(`${normalizeText(heading)}\n${normalizeText(text)}`);
}
