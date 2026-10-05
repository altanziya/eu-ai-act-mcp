/** Node side of the release context: reads release/<id>/ (manifest, the four corpus files, deadlines.json). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contextFromFiles, VERIFY_FILES } from "./contextCore.js";
import type { ReleaseContext } from "./contextCore.js";
import type { Manifest } from "./manifestCore.js";

export type { ReleaseContext };

export function loadRelease(releaseDir: string): ReleaseContext {
  const manifest = JSON.parse(readFileSync(join(releaseDir, "manifest.json"), "utf8")) as Manifest;
  const files: Record<string, Uint8Array> = {};
  for (const p of VERIFY_FILES) files[p] = new Uint8Array(readFileSync(join(releaseDir, p)));
  return contextFromFiles(manifest, files);
}
