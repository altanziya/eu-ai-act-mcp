/**
 * Node side of the release context: reads release/<id>/ (manifest, the four corpus files, deadlines.json) and checks
 * every file listed in the manifest against its sha256 and byte size before anything is used.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkFiles } from "../verify-core/files.js";
import { contextFromFiles, VERIFY_FILES } from "./contextCore.js";
import type { ReleaseContext } from "./contextCore.js";
import type { Manifest } from "./manifestCore.js";

export type { ReleaseContext };

const isPlainRelativePath = (p: string): boolean => p !== "" && !p.startsWith("/") && !p.includes("\\") && p.split("/").every((s) => s !== "" && s !== "." && s !== "..");

export function loadRelease(releaseDir: string): ReleaseContext {
  const manifest = JSON.parse(readFileSync(join(releaseDir, "manifest.json"), "utf8")) as Manifest;
  const paths = [...new Set([...manifest.files.map((f) => f.path), ...VERIFY_FILES])].sort();
  const files: Record<string, Uint8Array> = {};
  for (const p of paths) {
    if (!isPlainRelativePath(p)) throw new Error(`release manifest lists an invalid path: ${JSON.stringify(p)}`);
    try {
      files[p] = new Uint8Array(readFileSync(join(releaseDir, p)));
    } catch (e) {
      throw new Error(`release file unreadable: ${p} (${(e as NodeJS.ErrnoException).code ?? "error"})`);
    }
  }
  for (const c of checkFiles(manifest, files)) {
    if (!c.listed) throw new Error(`release file is not listed in the manifest: ${c.path}`);
    if (!c.sha256_ok || !c.bytes_ok) throw new Error(`release file differs from the manifest: ${c.path} (${!c.sha256_ok ? "sha256" : "bytes"})`);
  }
  return contextFromFiles(manifest, files);
}
