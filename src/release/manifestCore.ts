/** Isomorphic manifest types and byte serialisation (no node: imports; used by the browser verify bundle). */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Notice } from "../tools/notice.js";

export const MANIFEST_SCHEMA = "aiact-corpus-manifest/1";

export interface ManifestFile {
  /** Path relative to the release folder. */
  path: string;
  sha256: string;
  bytes: number;
  /** Corpus files only. */
  celex?: string;
  lang?: string;
  node_count?: number;
}

export interface Manifest {
  schema: typeof MANIFEST_SCHEMA;
  release_id: string;
  tool_version: string;
  files: ManifestFile[];
  notice: Notice;
}

/** Exactly the bytes of manifest.json: 2-space JSON, LF, trailing newline. */
export function manifestBytes(manifest: Manifest): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
}

export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
