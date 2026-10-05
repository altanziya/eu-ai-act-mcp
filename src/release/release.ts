/**
 * Build an immutable corpus release: data/corpus/*.json, data/deadlines.json and data/diff/{en,de}.json are copied to
 * release/<release_id>/ and described by manifest.json. Deterministic; no timestamps. An existing release with
 * different content (any file, not only the manifest) is never touched.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import { LANGS } from "../constants.js";
import { buildManifest, manifestBytes } from "./manifest.js";
import { RELEASE_ID_RE, sha256Hex } from "./manifestCore.js";
import type { Manifest } from "./manifest.js";

export interface BuildReleaseOptions {
  releaseId: string;
  /** Default: <repo>/release. */
  outRoot?: string;
  /** Default: <repo>/data. */
  dataDir?: string;
}

/** Files that may sit next to the manifest in a release folder without being listed in it. */
const UNLISTED_OK = new Set(["manifest.json", "manifest.sig.json"]);

function listFiles(root: string, prefix = ""): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(root, `${prefix}${e.name}/`) : [`${prefix}${e.name}`]));
}

/** An existing release folder is a no-op only if every file matches the freshly computed manifest (sha256 and bytes). */
function assertExistingMatches(dir: string, manifest: Manifest, bytes: Uint8Array): void {
  const differs = (path: string): Error => new Error(`release exists and differs: ${join(dir, path)}`);
  const present = new Set(listFiles(dir));
  for (const f of manifest.files) {
    if (!present.has(f.path)) throw differs(f.path);
    const actual = new Uint8Array(readFileSync(join(dir, f.path)));
    if (actual.byteLength !== f.bytes || sha256Hex(actual) !== f.sha256) throw differs(f.path);
  }
  if (!present.has("manifest.json") || !Buffer.from(bytes).equals(readFileSync(join(dir, "manifest.json")))) throw differs("manifest.json");
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const p of [...present].sort()) if (!listed.has(p) && !UNLISTED_OK.has(p)) throw differs(p);
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

    if (existsSync(dir)) {
      assertExistingMatches(dir, manifest, bytes);
      return { dir, manifest };
    }
    chmodSync(tmp, 0o755); // mkdtemp creates 0700
    renameSync(tmp, dir);
    return { dir, manifest };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
