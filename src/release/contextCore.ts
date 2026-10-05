/**
 * Isomorphic release context: manifest, corpus loader over the release copy and the release's deadline table, built
 * from file bytes (Node reads them from release/<id>/, the browser fetches them). No node: imports.
 */
import type { Lang } from "../constants.js";
import type { CorpusFile } from "../parser/types.js";
import { buildIndex } from "../tools/corpus.js";
import type { CorpusIndex, CorpusLoader, Version } from "../tools/corpus.js";
import { VERSIONS } from "../tools/corpus.js";
import type { DeadlineTable } from "../tools/deadlines.js";
import { LANGS } from "../constants.js";
import type { Manifest } from "./manifestCore.js";

export interface ReleaseContext {
  releaseId: string;
  manifest: Manifest;
  loadCorpus: CorpusLoader;
  deadlines: DeadlineTable;
}

export const corpusFilePath = (version: string, lang: string): string => `corpus/${version}.${lang}.json`;
export const DEADLINES_PATH = "deadlines.json";

/** Paths a verifier needs besides the manifest: the four corpus files and the deadline table. */
export const VERIFY_FILES: readonly string[] = [...VERSIONS.flatMap((v) => LANGS.map((l) => corpusFilePath(v, l))), DEADLINES_PATH];

const parse = <T>(bytes: Uint8Array): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

/** `files`: bytes by path relative to the release folder; must contain VERIFY_FILES. */
export function contextFromFiles(manifest: Manifest, files: Readonly<Record<string, Uint8Array>>): ReleaseContext {
  for (const p of VERIFY_FILES) if (!files[p]) throw new Error(`release file missing: ${p}`);
  const cache = new Map<string, CorpusIndex>();
  const loadCorpus: CorpusLoader = (version: Version, lang: Lang) => {
    const key = corpusFilePath(version, lang);
    let hit = cache.get(key);
    if (!hit) {
      hit = buildIndex(version, lang, parse<CorpusFile>(files[key] as Uint8Array).nodes);
      cache.set(key, hit);
    }
    return hit;
  };
  return { releaseId: manifest.release_id, manifest, loadCorpus, deadlines: parse<DeadlineTable>(files[DEADLINES_PATH] as Uint8Array) };
}
