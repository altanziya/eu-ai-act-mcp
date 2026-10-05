/** Isomorphic signature file type, key id, signing and verification (no node: imports; runs in the browser too). */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ed25519Sign, ed25519Verify, fromBase64, pemToRaw, rawPublicKey, rawToPublicPem, toBase64 } from "./ed25519.js";
import { sha256Hex } from "./manifestCore.js";

export const SIGNATURE_SCHEMA = "aiact-manifest-signature/1";

export interface ManifestSignature {
  schema: typeof SIGNATURE_SCHEMA;
  key_id: string;
  algorithm: "Ed25519";
  /** base64 (standard alphabet) of the 64-byte Ed25519 signature over the manifest bytes. */
  signature: string;
  /** SHA-256 (hex) of the signed manifest bytes. */
  signed_sha256: string;
}

const keyIdFromRaw = (raw: Uint8Array): string => bytesToHex(sha256(raw)).slice(0, 16);

/** First 16 hex characters of the SHA-256 over the raw 32-byte public key. */
export const keyIdFromPublicKey = (publicKeyPem: string): string => keyIdFromRaw(pemToRaw(publicKeyPem, "public"));

/** Public key (SPKI PEM) belonging to a private key PEM. */
export const publicKeyPemFromPrivate = (privateKeyPem: string): string => rawToPublicPem(rawPublicKey(pemToRaw(privateKeyPem, "private")));

export function signManifest(bytes: Uint8Array, privateKeyPem: string): ManifestSignature {
  const seed = pemToRaw(privateKeyPem, "private");
  return {
    schema: SIGNATURE_SCHEMA,
    key_id: keyIdFromRaw(rawPublicKey(seed)),
    algorithm: "Ed25519",
    signature: toBase64(ed25519Sign(bytes, seed)),
    signed_sha256: sha256Hex(bytes),
  };
}

export function verifyManifestSignature(bytes: Uint8Array, sigFile: ManifestSignature, publicKeyPem: string): boolean {
  try {
    if (sigFile.schema !== SIGNATURE_SCHEMA || sigFile.algorithm !== "Ed25519") return false;
    if (sigFile.signed_sha256 !== sha256Hex(bytes)) return false;
    return ed25519Verify(fromBase64(sigFile.signature), bytes, pemToRaw(publicKeyPem, "public"));
  } catch {
    return false;
  }
}
