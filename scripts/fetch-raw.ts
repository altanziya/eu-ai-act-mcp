/**
 * Fetch the four raw XHTML files (EN/DE x Official Journal / consolidated) from CELLAR into data/raw.
 *
 * Working URL (verified 2026-10-05, content negotiation, HTTP redirect to the cellar resource):
 *   curl -sSL -H 'Accept: application/xhtml+xml' -H 'Accept-Language: <en|de>' \
 *     http://publications.europa.eu/resource/celex/<CELEX>
 * for CELEX 32024R1689 (Official Journal) and 02024R1689-20260727 (consolidated after the Omnibus).
 * No fallback was needed. Existing files are kept (cache); use --force to re-download.
 *
 * Source: EUR-Lex / CELLAR, (c) European Union, eur-lex.europa.eu.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CELEX_IDS, LANGS, rawPath, REPO_ROOT } from "../src/config.js";
import { writeFileAtomic } from "../src/util/write.js";

const force = process.argv.includes("--force");

/** A real law text is XHTML, big, and contains article headings; error and redirect pages are not. */
export function looksLikeLawText(body: string): boolean {
  return body.length > 200_000 && /<html[\s>]/i.test(body) && /id="art_1"/.test(body) && !/<title>\s*(error|redirect)/i.test(body);
}

async function fetchOne(celex: string, lang: string): Promise<string> {
  const url = `http://publications.europa.eu/resource/celex/${celex}`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "application/xhtml+xml", "Accept-Language": lang },
  });
  if (!res.ok) throw new Error(`${celex}.${lang}: HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("xhtml")) throw new Error(`${celex}.${lang}: unexpected content-type ${type}`);
  const body = await res.text();
  if (!looksLikeLawText(body)) throw new Error(`${celex}.${lang}: response does not look like the law text`);
  return body;
}

async function main(): Promise<void> {
  mkdirSync(join(REPO_ROOT, "data/raw"), { recursive: true });
  for (const celex of CELEX_IDS) {
    for (const lang of LANGS) {
      const path = rawPath(celex, lang);
      if (existsSync(path) && !force) {
        console.log(`cached ${path}`);
        continue;
      }
      const body = await fetchOne(celex, lang);
      writeFileAtomic(path, body);
      console.log(`fetched ${path} (${body.length} chars)`);
    }
  }
}

await main();
