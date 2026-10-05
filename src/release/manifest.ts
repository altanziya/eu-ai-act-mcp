/** Release manifest (schema aiact-corpus-manifest/1): hashes and sizes of every file of a release folder. Node side. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import { V2024, V2026 } from "../constants.js";
import type { CorpusFile } from "../parser/types.js";
import { notice } from "../tools/notice.js";
import { MANIFEST_SCHEMA, manifestBytes, sha256Hex } from "./manifestCore.js";
import type { Manifest, ManifestFile } from "./manifestCore.js";

export { manifestBytes, sha256Hex };
export type { Manifest, ManifestFile };

/** Files of a release folder that are not part of the manifest (the manifest itself and its signature). */
const EXCLUDED = new Set(["manifest.json", "manifest.sig.json"]);

function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? e.name : `${prefix}/${e.name}`;
    if (e.isDirectory()) out.push(...listFiles(join(dir, e.name), rel));
    else if (e.isFile() && !EXCLUDED.has(rel)) out.push(rel);
  }
  return out;
}

export function toolVersion(): string {
  return (JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as { version: string }).version;
}

/** Manifest over the files currently in `releaseDir`; deterministic (sorted by path, no timestamps). */
export function buildManifest(releaseDir: string, releaseId: string): Manifest {
  const files: ManifestFile[] = listFiles(releaseDir).map((path) => {
    const bytes = new Uint8Array(readFileSync(join(releaseDir, path)));
    const entry: ManifestFile = { path, sha256: sha256Hex(bytes), bytes: bytes.byteLength };
    if (path.startsWith("corpus/") && path.endsWith(".json")) {
      const c = JSON.parse(new TextDecoder().decode(bytes)) as CorpusFile;
      entry.celex = c.celex;
      entry.lang = c.lang;
      entry.node_count = c.nodes.length;
    }
    return entry;
  });
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { schema: MANIFEST_SCHEMA, release_id: releaseId, tool_version: toolVersion(), files, notice: notice([V2024, V2026]) };
}
