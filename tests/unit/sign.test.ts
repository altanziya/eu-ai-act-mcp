import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fromBase64, pemToRaw, rawToPublicPem } from "../../src/release/ed25519.js";
import { generateKeyPair, keyIdFromPublicKey, publicKeyPemFromPrivate, signManifest, verifyManifestSignature } from "../../src/release/sign.js";
import { sha256Hex } from "../../src/release/manifest.js";

const bytes = new TextEncoder().encode('{"manifest":true}\n');

describe("Ed25519 signatures", () => {
  it("round-trips: sign then verify", () => {
    const kp = generateKeyPair();
    const sig = signManifest(bytes, kp.privateKeyPem);
    expect(verifyManifestSignature(bytes, sig, kp.publicKeyPem)).toBe(true);
    expect(fromBase64(sig.signature)).toHaveLength(64);
    expect(sig.signed_sha256).toBe(sha256Hex(bytes));
  });
  it("is deterministic (Ed25519) and the key id derives from the public key only", () => {
    const kp = generateKeyPair();
    expect(signManifest(bytes, kp.privateKeyPem)).toEqual(signManifest(bytes, kp.privateKeyPem));
    expect(signManifest(bytes, kp.privateKeyPem).key_id).toBe(keyIdFromPublicKey(kp.publicKeyPem));
    expect(keyIdFromPublicKey(kp.publicKeyPem)).not.toBe(keyIdFromPublicKey(generateKeyPair().publicKeyPem));
  });
  it("rejects a manipulated manifest, a flipped signature byte, a wrong key and a wrong signed_sha256", () => {
    const kp = generateKeyPair();
    const sig = signManifest(bytes, kp.privateKeyPem);
    const other = new Uint8Array([...bytes, 0x20]);
    expect(verifyManifestSignature(other, sig, kp.publicKeyPem)).toBe(false);
    const raw = fromBase64(sig.signature);
    raw[0] = (raw[0] as number) ^ 1;
    expect(verifyManifestSignature(bytes, { ...sig, signature: Buffer.from(raw).toString("base64") }, kp.publicKeyPem)).toBe(false);
    expect(verifyManifestSignature(bytes, sig, generateKeyPair().publicKeyPem)).toBe(false);
    expect(verifyManifestSignature(bytes, { ...sig, signed_sha256: "0".repeat(64) }, kp.publicKeyPem)).toBe(false);
  });
  it("returns false (does not throw) for malformed keys and signatures", () => {
    const kp = generateKeyPair();
    const sig = signManifest(bytes, kp.privateKeyPem);
    expect(verifyManifestSignature(bytes, sig, "not a pem")).toBe(false);
    expect(verifyManifestSignature(bytes, { ...sig, signature: "###" }, kp.publicKeyPem)).toBe(false);
  });
  it("derives the public key PEM from the private key PEM", () => {
    const kp = generateKeyPair();
    expect(publicKeyPemFromPrivate(kp.privateKeyPem)).toBe(kp.publicKeyPem);
  });
  it("PEM parsing yields the raw 32 bytes node:crypto exports, and rejects non-Ed25519 keys", () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const jwk = publicKey.export({ format: "jwk" }) as { x: string };
    expect(Buffer.from(pemToRaw(pem, "public")).toString("base64url")).toBe(jwk.x);
    expect(rawToPublicPem(pemToRaw(pem, "public"))).toBe(pem);
    const { publicKey: ec } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    expect(() => pemToRaw(ec.export({ type: "spki", format: "pem" }).toString(), "public")).toThrow(/Ed25519/);
  });
  it("interoperates with node:crypto signatures", async () => {
    const { sign } = await import("node:crypto");
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const sigBytes = sign(null, Buffer.from(bytes), privateKey);
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const mine = signManifest(bytes, privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    expect(Buffer.from(fromBase64(mine.signature)).equals(sigBytes)).toBe(true);
    expect(verifyManifestSignature(bytes, mine, pem)).toBe(true);
  });
});
