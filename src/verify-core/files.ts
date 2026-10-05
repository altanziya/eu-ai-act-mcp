/** Check fetched release files against the manifest (isomorphic): sizes and SHA-256 per path. */
import type { Manifest } from "../release/manifestCore.js";
import { sha256Hex } from "../release/manifestCore.js";

export interface FileCheck {
  path: string;
  /** false if the path is not listed in the manifest. */
  listed: boolean;
  sha256_ok: boolean;
  bytes_ok: boolean;
}

export function checkFiles(manifest: Manifest, files: Readonly<Record<string, Uint8Array>>): FileCheck[] {
  return Object.keys(files)
    .sort()
    .map((path) => {
      const entry = manifest.files.find((f) => f.path === path);
      const bytes = files[path] as Uint8Array;
      return { path, listed: entry !== undefined, sha256_ok: entry?.sha256 === sha256Hex(bytes), bytes_ok: entry?.bytes === bytes.byteLength };
    });
}

export const filesOk = (checks: readonly FileCheck[]): boolean => checks.length > 0 && checks.every((c) => c.listed && c.sha256_ok && c.bytes_ok);
