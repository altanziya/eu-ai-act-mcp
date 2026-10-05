/**
 * Shared loading layer of the browser tools (isomorphic: the fetch function is injected, so it runs in Node tests too).
 *
 * Loads `<base>/<id>/manifest.json`, checks its Ed25519 signature against the published key list, then loads the
 * corpus files and the deadline table and checks size and SHA-256 of every file against the manifest. Only files of the
 * same site are requested; nothing the user types is ever sent anywhere. Any failure throws a ReleaseError and no
 * context is returned, so no check runs against unverified data.
 */
import { contextFromFiles, VERIFY_FILES } from "../release/contextCore.js";
import type { ReleaseContext } from "../release/contextCore.js";
import { RELEASE_ID_RE, sha256Hex } from "../release/manifestCore.js";
import type { Manifest } from "../release/manifestCore.js";
import { verifyManifestSignature } from "../release/signatureCore.js";
import type { ManifestSignature } from "../release/signatureCore.js";
import { checkFiles } from "../verify-core/files.js";
import type { Lang, Pair } from "./i18n.js";

export type ReleaseErrorCode = "invalid_release_id" | "fetch_failed" | "manifest_unreadable" | "signature_missing" | "unknown_key" | "key_revoked" | "signature_invalid" | "file_mismatch";

export class ReleaseError extends Error {
  constructor(
    readonly code: ReleaseErrorCode,
    readonly detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ReleaseError";
  }
}

export const RELEASE_ERROR_TEXT: Record<ReleaseErrorCode, Pair> = {
  invalid_release_id: { en: "The release identifier of this page is invalid.", de: "Die Release-Kennung dieser Seite ist ungültig." },
  fetch_failed: { en: "The corpus could not be loaded. Please check your connection and reload the page.", de: "Der Korpus konnte nicht geladen werden. Bitte prüfen Sie die Verbindung und laden Sie die Seite neu." },
  manifest_unreadable: { en: "The release manifest is unreadable.", de: "Das Release-Manifest ist nicht lesbar." },
  signature_missing: { en: "The release is not signed. No check was run.", de: "Das Release ist nicht signiert. Es wurde nichts geprüft." },
  unknown_key: { en: "The release was signed with an unknown key. No check was run.", de: "Das Release wurde mit einem unbekannten Schlüssel signiert. Es wurde nichts geprüft." },
  key_revoked: { en: "The signing key of the release has been revoked. No check was run.", de: "Der Signaturschlüssel des Releases wurde widerrufen. Es wurde nichts geprüft." },
  signature_invalid: { en: "The signature of the release is not valid. No check was run.", de: "Die Signatur des Releases ist ungültig. Es wurde nichts geprüft." },
  file_mismatch: { en: "A corpus file does not match the signed manifest. No check was run.", de: "Eine Korpusdatei passt nicht zum signierten Manifest. Es wurde nichts geprüft." },
};

export const releaseErrorMessage = (e: unknown, lang: Lang): string => {
  if (e instanceof ReleaseError) return `${RELEASE_ERROR_TEXT[e.code][lang]} (${e.detail})`;
  return `${RELEASE_ERROR_TEXT.fetch_failed[lang]} (${(e as Error).message})`;
};

export interface LoadProgress {
  files: number;
  totalFiles: number;
  bytes: number;
  totalBytes: number;
}

export interface LoadedRelease {
  releaseId: string;
  manifest: Manifest;
  manifestSha256: string;
  keyId: string;
  context: ReleaseContext;
}

export interface LoadOptions {
  releaseId: string;
  /** Folder that holds the release folders, with trailing slash; default "../release/". */
  releaseBase?: string;
  /** URL of the key list; default "../keys/index.json". */
  keysUrl?: string;
  fetchBytes?: (url: string) => Promise<Uint8Array>;
  onProgress?: (p: LoadProgress) => void;
}

interface KeyIndex {
  keys: Array<{ key_id: string; public_key_pem: string; status: "active" | "revoked" }>;
}

export async function defaultFetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
  if (!res.ok) throw new ReleaseError("fetch_failed", `${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

const parseJson = <T>(bytes: Uint8Array, what: string): T => {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new ReleaseError("manifest_unreadable", what);
  }
};

export async function loadRelease(opts: LoadOptions): Promise<LoadedRelease> {
  if (!RELEASE_ID_RE.test(opts.releaseId)) throw new ReleaseError("invalid_release_id", opts.releaseId);
  const get = opts.fetchBytes ?? defaultFetchBytes;
  const fetchOrThrow = async (url: string): Promise<Uint8Array> => {
    try {
      return await get(url);
    } catch (e) {
      if (e instanceof ReleaseError) throw e;
      throw new ReleaseError("fetch_failed", `${url}: ${(e as Error).message}`);
    }
  };
  const base = `${opts.releaseBase ?? "../release/"}${opts.releaseId}/`;

  const manifestBytes = await fetchOrThrow(`${base}manifest.json`);
  const manifest = parseJson<Manifest>(manifestBytes, "manifest.json");
  if (manifest.release_id !== opts.releaseId || !Array.isArray(manifest.files)) throw new ReleaseError("manifest_unreadable", "manifest.json does not describe this release");
  const sig = parseJson<ManifestSignature>(await fetchOrThrow(`${base}manifest.sig.json`), "manifest.sig.json");
  const keys = parseJson<KeyIndex>(await fetchOrThrow(opts.keysUrl ?? "../keys/index.json"), "keys/index.json").keys;

  if (typeof sig.key_id !== "string") throw new ReleaseError("signature_missing", "manifest.sig.json");
  const key = Array.isArray(keys) ? keys.find((k) => k.key_id === sig.key_id) : undefined;
  if (!key) throw new ReleaseError("unknown_key", sig.key_id);
  if (key.status === "revoked") throw new ReleaseError("key_revoked", sig.key_id);
  if (!verifyManifestSignature(manifestBytes, sig, key.public_key_pem)) throw new ReleaseError("signature_invalid", sig.key_id);

  const entries = VERIFY_FILES.map((p) => manifest.files.find((f) => f.path === p));
  const totalBytes = entries.reduce((n, e) => n + (e?.bytes ?? 0), 0);
  const progress = { files: 0, totalFiles: VERIFY_FILES.length, bytes: 0, totalBytes };
  opts.onProgress?.({ ...progress });
  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    VERIFY_FILES.map(async (p) => {
      const bytes = await fetchOrThrow(`${base}${p}`);
      files[p] = bytes;
      progress.files += 1;
      progress.bytes += bytes.byteLength;
      opts.onProgress?.({ ...progress });
    }),
  );
  const bad = checkFiles(manifest, files).find((c) => !c.listed || !c.sha256_ok || !c.bytes_ok);
  if (bad) throw new ReleaseError("file_mismatch", bad.path);
  return { releaseId: manifest.release_id, manifest, manifestSha256: sha256Hex(manifestBytes), keyId: sig.key_id, context: contextFromFiles(manifest, files) };
}
