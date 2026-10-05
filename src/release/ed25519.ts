/** Isomorphic Ed25519 helpers over @noble/ed25519 (sync API, SHA-512 from @noble/hashes) and PEM/base64 handling. No node: imports. */
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

const SPKI_PREFIX = "302a300506032b6570032100";
const PKCS8_PREFIX = "302e020100300506032b657004220420";

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Raw 32 bytes (public key or private seed) out of a PEM document; throws if it is not an Ed25519 key. */
export function pemToRaw(pem: string, kind: "public" | "private"): Uint8Array {
  const body = pem.replace(/-----(BEGIN|END)[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = bytesToHex(fromBase64(body));
  const prefix = kind === "public" ? SPKI_PREFIX : PKCS8_PREFIX;
  if (!der.startsWith(prefix) || der.length !== prefix.length + 64) throw new Error(`not an Ed25519 ${kind} key in PEM form`);
  return hexToBytes(der.slice(prefix.length));
}

const wrap = (b64: string): string => (b64.match(/.{1,64}/g) ?? []).join("\n");
export const rawToPublicPem = (raw: Uint8Array): string => `-----BEGIN PUBLIC KEY-----\n${wrap(toBase64(hexToBytes(SPKI_PREFIX + bytesToHex(raw))))}\n-----END PUBLIC KEY-----\n`;

export const rawPublicKey = (seed: Uint8Array): Uint8Array => ed.getPublicKey(seed);
export const ed25519Sign = (msg: Uint8Array, seed: Uint8Array): Uint8Array => ed.sign(msg, seed);
export const ed25519Verify = (sig: Uint8Array, msg: Uint8Array, publicKey: Uint8Array): boolean => ed.verify(sig, msg, publicKey);
