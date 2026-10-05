/**
 * Build an immutable corpus release: data/corpus/*.json, data/deadlines.json and data/diff/{en,de}.json are copied to
 * release/<release_id>/ and described by manifest.json. Deterministic; no timestamps. An existing release with
 * different content is never overwritten.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import { LANGS } from "../constants.js";
import { buildManifest, manifestBytes } from "./manifest.js";
import { RELEASE_ID_RE } from "./manifestCore.js";
import type { Manifest } from "./manifest.js";

export interface BuildReleaseOptions {
  releaseId: string;
  /** Default: <repo>/release. */
  outRoot?: string;
  /** Default: <repo>/data. */
  dataDir?: string;
}

export function buildRelease(opts: BuildReleaseOptions): { dir: string; manifest: Manifest } {
  const { releaseId } = opts;
  if (!RELEASE_ID_RE.test(releaseId)) throw new Error(`invalid release id ${JSON.stringify(releaseId)}`);
  const outRoot = opts.outRoot ?? join(REPO_ROOT, "release");
  const dataDir = opts.dataDir ?? join(REPO_ROOT, "data");
  const dir = join(outRoot, releaseId);
  mkdirSync(outRoot, { recursive: true });

  const tmp = mkdtempSync(join(outRoot, `.tmp-${releaseId}-`));
  try {
    mkdirSync(join(tmp, "corpus"));
    mkdirSync(join(tmp, "diff"));
    const corpusFiles = readdirSync(join(dataDir, "corpus")).filter((f) => f.endsWith(".json")).sort();
    if (corpusFiles.length === 0) throw new Error(`no corpus files in ${join(dataDir, "corpus")}`);
    for (const f of corpusFiles) copyFileSync(join(dataDir, "corpus", f), join(tmp, "corpus", f));
    copyFileSync(join(dataDir, "deadlines.json"), join(tmp, "deadlines.json"));
    for (const lang of LANGS) copyFileSync(join(dataDir, "diff", `${lang}.json`), join(tmp, "diff", `${lang}.json`));
    const manifest = buildManifest(tmp, releaseId);
    const bytes = manifestBytes(manifest);
    writeFileSync(join(tmp, "manifest.json"), bytes);

    const existing = join(dir, "manifest.json");
    if (existsSync(dir)) {
      if (!existsSync(existing) || !Buffer.from(bytes).equals(readFileSync(existing))) {
        throw new Error(`release ${releaseId} already exists with different content; releases are immutable, choose a new id`);
      }
      return { dir, manifest };
    }
    renameSync(tmp, dir);
    return { dir, manifest };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
