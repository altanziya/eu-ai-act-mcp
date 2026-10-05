/**
 * Ed25519 signature over the manifest bytes (Node entry point). Signing and verification live in signatureCore.ts
 * (@noble/ed25519, the same code runs in the browser); only generateKeyPair() needs node:crypto and is meant for tests
 * and for the maintainer's key creation. Keys are exchanged as PEM (SPKI public, PKCS8 private).
 */
import { generateKeyPairSync } from "node:crypto";

export { keyIdFromPublicKey, publicKeyPemFromPrivate, signManifest, SIGNATURE_SCHEMA, verifyManifestSignature } from "./signatureCore.js";
export type { ManifestSignature } from "./signatureCore.js";

export function generateKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}
