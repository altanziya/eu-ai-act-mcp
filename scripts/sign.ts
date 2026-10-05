/**
 * npm run sign -- --release <id> (--key-file <pem> | --keychain <service>) [--publish-key]
 * Signs release/<id>/manifest.json (Ed25519) and writes release/<id>/manifest.sig.json. The private key is read from a
 * PEM file outside the repo or, on macOS, from the keychain (`security find-generic-password -s <service> -w`); it is
 * never written anywhere. With --publish-key the public key is added to site/keys/<key_id>.pub and site/keys/index.json.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT } from "../src/config.js";
import { manifestBytes } from "../src/release/manifest.js";
import type { Manifest } from "../src/release/manifest.js";
import { keyIdFromPublicKey, publicKeyPemFromPrivate, signManifest, verifyManifestSignature } from "../src/release/sign.js";
import { toJson, writeFileAtomic } from "../src/util/write.js";

const { values } = parseArgs({
  options: { release: { type: "string" }, "key-file": { type: "string" }, keychain: { type: "string" }, "publish-key": { type: "boolean" } },
  strict: true,
});
if (!values.release || (!values["key-file"] && !values.keychain) || (values["key-file"] && values.keychain)) {
  console.error("usage: npm run sign -- --release <id> (--key-file <pem> | --keychain <service>) [--publish-key]");
  process.exit(2);
}
const dir = join(REPO_ROOT, "release", values.release);
const manifestPath = join(dir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`no manifest at ${manifestPath}; run npm run release first`);
  process.exit(1);
}
const privatePem = values["key-file"]
  ? readFileSync(values["key-file"], "utf8")
  : execFileSync("security", ["find-generic-password", "-s", values.keychain as string, "-w"], { encoding: "utf8" });

// The signature covers the bytes of the manifest as stored, which must equal the canonical serialisation.
const stored = new Uint8Array(readFileSync(manifestPath));
const manifest = JSON.parse(new TextDecoder().decode(stored)) as Manifest;
if (!Buffer.from(manifestBytes(manifest)).equals(Buffer.from(stored))) {
  console.error("manifest.json is not in canonical form; rebuild the release");
  process.exit(1);
}
const sig = signManifest(stored, privatePem);
const publicPem = publicKeyPemFromPrivate(privatePem);
if (!verifyManifestSignature(stored, sig, publicPem) || keyIdFromPublicKey(publicPem) !== sig.key_id) {
  console.error("self-check of the new signature failed");
  process.exit(1);
}
writeFileAtomic(join(dir, "manifest.sig.json"), toJson(sig));
console.log(`signed ${values.release} with key ${sig.key_id}`);

if (values["publish-key"]) {
  const keysDir = join(REPO_ROOT, "site/keys");
  mkdirSync(keysDir, { recursive: true });
  writeFileAtomic(join(keysDir, `${sig.key_id}.pub`), publicPem);
  const indexPath = join(keysDir, "index.json");
  const index = existsSync(indexPath) ? (JSON.parse(readFileSync(indexPath, "utf8")) as { keys: Array<{ key_id: string; public_key_pem: string; status: string }> }) : { keys: [] };
  if (!index.keys.some((k) => k.key_id === sig.key_id)) index.keys.push({ key_id: sig.key_id, public_key_pem: publicPem, status: "active" });
  writeFileAtomic(indexPath, toJson(index));
  console.log(`public key published in site/keys (${sig.key_id})`);
}
