/**
 * Node-only: read-only access to the parsed corpus (data/corpus/<celex>.<lang>.json), shared by the tools.
 * Files are read once per process; no network, no clock.
 */
import { readFileSync } from "node:fs";
import { corpusPath } from "../config.js";
import type { CorpusFile } from "../parser/types.js";
import { buildIndex } from "./corpus.js";
import type { CorpusIndex, Lang, Version } from "./corpus.js";

const cache = new Map<string, CorpusIndex>();

export function loadCorpus(version: Version, lang: Lang): CorpusIndex {
  const key = `${version}.${lang}`;
  let hit = cache.get(key);
  if (!hit) {
    const file = JSON.parse(readFileSync(corpusPath(version, lang), "utf8")) as CorpusFile;
    hit = buildIndex(version, lang, file.nodes);
    cache.set(key, hit);
  }
  return hit;
}
