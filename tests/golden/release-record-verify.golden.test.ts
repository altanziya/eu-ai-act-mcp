/**
 * Golden tests for signed releases, evidence records and their recomputation. The expected values were written
 * before the implementation and do not follow it.
 *
 * Fixed API under test:
 *   src/release/release.ts   buildRelease({ releaseId, outRoot? }) -> { dir, manifest }
 *   src/release/manifest.ts  buildManifest(releaseDir, releaseId), manifestBytes(manifest), sha256Hex(bytes)
 *   src/release/sign.ts      generateKeyPair(), keyIdFromPublicKey(pem), signManifest(bytes, pem), verifyManifestSignature(bytes, sig, pem)
 *   src/release/context.ts   loadRelease(releaseDir) -> ReleaseContext
 *   src/record/record.ts     createRecord(input, ctx), recordHash(r), canonicalJson(v), encodeRecordForUrl(r), decodeRecordFromUrl(s)
 *   src/verify-core/recompute.ts recomputeRecord(record, ctx, opts?)
 * Quotes come from the release corpus at test time. Preconditions fail with explicit messages.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildRelease } from "../../src/release/release.js";
import { buildManifest, manifestBytes, sha256Hex } from "../../src/release/manifest.js";
import { generateKeyPair, keyIdFromPublicKey, signManifest, verifyManifestSignature } from "../../src/release/sign.js";
import { loadRelease } from "../../src/release/context.js";
import { canonicalJson, createRecord, decodeRecordFromUrl, encodeRecordForUrl, recordHash } from "../../src/record/record.js";
import { recomputeRecord } from "../../src/verify-core/recompute.js";

const ROOT = process.env.GOLDEN_ROOT ?? process.cwd();
const V2024 = "32024R1689";
const V2026 = "02024R1689-20260727";
const RELEASE_ID = "golden-release";

interface Node {
  id: string;
  type: string;
  text: string;
  hash: string;
  node_hash: string;
}

const sha256File = (p: string): string => createHash("sha256").update(readFileSync(p)).digest("hex");
const tokens = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);

const outRoot = mkdtempSync(join(tmpdir(), "aiact-golden-release-"));
afterAll(() => rmSync(outRoot, { recursive: true, force: true }));

const built = buildRelease({ releaseId: RELEASE_ID, outRoot });
const DIR = built.dir;

function releaseCorpus(version: string, lang: string): Map<string, Node> {
  const p = join(DIR, "corpus", `${version}.${lang}.json`);
  if (!existsSync(p)) throw new Error(`precondition: release corpus file missing ${p}`);
  const raw = JSON.parse(readFileSync(p, "utf8")) as { nodes: Node[] };
  return new Map(raw.nodes.map((n) => [n.id, n]));
}
/** First Article 5 point identical in both versions. */
function unchangedArt5(): Node {
  const a24 = releaseCorpus(V2024, "en");
  const a26 = releaseCorpus(V2026, "en");
  for (const id of ["art_5.par_1.a", "art_5.par_1.b", "art_5.par_1.c", "art_5.par_1.d"]) {
    const a = a24.get(id);
    const b = a26.get(id);
    if (a && b && a.text === b.text && tokens(a.text).length >= 20) return b;
  }
  throw new Error("precondition: no unchanged art_5.par_1.<x> with >= 20 tokens");
}
const ctx = loadRelease(DIR);
const baseInput = () => ({
  question: "Is this practice prohibited?",
  quote: unchangedArt5().text,
  claimed_ref: unchangedArt5().id,
  as_of: "2026-09-01",
  lang: "en" as const,
  creator: "golden",
  created_at: "2026-10-05T12:00:00+02:00",
  release_id: RELEASE_ID,
});

describe("release and record golden: release and manifest", () => {
  it("copies corpus, deadlines and diff files and writes a manifest whose hashes match the files", () => {
    for (const rel of [
      `corpus/${V2024}.en.json`,
      `corpus/${V2024}.de.json`,
      `corpus/${V2026}.en.json`,
      `corpus/${V2026}.de.json`,
      "deadlines.json",
      "diff/en.json",
      "diff/de.json",
      "manifest.json",
    ]) {
      expect(existsSync(join(DIR, rel)), rel).toBe(true);
    }
    const m = built.manifest;
    expect(m.release_id).toBe(RELEASE_ID);
    expect(m.files.length).toBeGreaterThanOrEqual(7);
    for (const f of m.files) {
      expect(f.path).not.toBe("manifest.json");
      expect(sha256File(join(DIR, f.path))).toBe(f.sha256);
      expect(statSync(join(DIR, f.path)).size).toBe(f.bytes);
    }
    const paths = m.files.map((f) => f.path);
    expect([...paths].sort()).toEqual(paths);
    const corpusEntries = m.files.filter((f) => f.path.startsWith("corpus/"));
    expect(corpusEntries).toHaveLength(4);
    for (const c of corpusEntries) {
      expect(c.celex).toBeDefined();
      expect(c.lang).toBeDefined();
      expect((c.node_count ?? 0) > 1000).toBe(true);
    }
  });
  it("manifestBytes equals the file on disk and rebuilding is deterministic", () => {
    const onDisk = readFileSync(join(DIR, "manifest.json"));
    expect(Buffer.from(manifestBytes(built.manifest)).equals(onDisk)).toBe(true);
    const again = buildManifest(DIR, RELEASE_ID);
    expect(Buffer.from(manifestBytes(again)).equals(onDisk)).toBe(true);
    expect(sha256Hex(manifestBytes(again))).toBe(sha256File(join(DIR, "manifest.json")));
    expect(JSON.stringify(built.manifest)).not.toMatch(/created_at|timestamp|generated_at/);
  });
  it("the committed release under release/ is consistent with its manifest", () => {
    const root = join(ROOT, "release");
    const dirs = existsSync(root) ? readdirSync(root).filter((d) => existsSync(join(root, d, "manifest.json"))) : [];
    expect(dirs.length).toBeGreaterThanOrEqual(1);
    for (const d of dirs) {
      const m = JSON.parse(readFileSync(join(root, d, "manifest.json"), "utf8")) as { release_id: string; files: Array<{ path: string; sha256: string }> };
      expect(m.release_id).toBe(d);
      for (const f of m.files) expect(sha256File(join(root, d, f.path)), `${d}/${f.path}`).toBe(f.sha256);
    }
  });
});

describe("release and record golden: evidence record", () => {
  it("creates a record with exact result, cited node hashes from the release and a stable record_hash", () => {
    const n = unchangedArt5();
    const r = createRecord(baseInput(), ctx);
    expect(r.schema).toBe("aiact-evidence-record/1");
    expect(r.release_id).toBe(RELEASE_ID);
    expect(r.result.status).toBe("exact");
    expect(r.result.match?.provision_id).toBe(n.id);
    const cited = r.cited_nodes.find((c) => c.id === n.id && c.version === V2026 && c.lang === "en");
    expect(cited).toBeDefined();
    expect(cited?.hash).toBe(n.hash);
    expect(cited?.node_hash).toBe(n.node_hash);
    expect(r.manifest_sha256).toBe(sha256Hex(manifestBytes(ctx.manifest)));
    const { record_hash, ...rest } = r;
    expect(record_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(recordHash(rest)).toBe(record_hash);
    expect(createRecord(baseInput(), ctx)).toEqual(r);
    expect(r.notice.de).toMatch(/Keine Rechtsberatung/);
    expect(r.notice.en).toMatch(/Not legal advice/);
    expect(r.question).toBe("Is this practice prohibited?");
    expect(r.creator).toBe("golden");
    expect(r.created_at).toBe("2026-10-05T12:00:00+02:00");
  });
  it("a different quote gives a different hash; url encoding round-trips", () => {
    const a = createRecord(baseInput(), ctx);
    const b = createRecord({ ...baseInput(), quote: `${baseInput().quote} extra` }, ctx);
    expect(b.record_hash).not.toBe(a.record_hash);
    const enc = encodeRecordForUrl(a);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRecordFromUrl(enc)).toEqual(a);
    expect(decodeRecordFromUrl(`#${enc}`)).toEqual(a);
  });
  it("canonicalJson sorts keys recursively and has no whitespace", () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: "ü" } })).toBe('{"a":{"c":"ü","d":[1,{"y":2,"z":1}]},"b":1}');
  });
});

describe("release and record golden: recompute", () => {
  it("an untouched record verifies in full (signature missing)", () => {
    const r = createRecord(baseInput(), ctx);
    const rep = recomputeRecord(r, ctx);
    expect(rep.record_hash_ok).toBe(true);
    expect(rep.manifest_sha256_ok).toBeNull();
    expect(rep.signature.status).toBe("missing");
    expect(rep.cited_nodes.length).toBeGreaterThanOrEqual(1);
    for (const c of rep.cited_nodes) {
      expect(c.present).toBe(true);
      expect(c.hash_ok).toBe(true);
      expect(c.node_hash_ok).toBe(true);
    }
    expect(rep.recomputed.status).toBe("exact");
    expect(rep.matches_record).toBe(true);
    expect(rep.differences).toEqual([]);
    const withManifest = recomputeRecord(r, ctx, { manifestBytes: manifestBytes(ctx.manifest) });
    expect(withManifest.manifest_sha256_ok).toBe(true);
  });
  it("tampering is detected: quote, stated result, cited hash", () => {
    const r = createRecord(baseInput(), ctx);
    const quoteTampered = { ...r, input: { ...r.input, quote: r.input.quote.replace(/\b(\w+)\b/, "altered") } };
    const rep1 = recomputeRecord(quoteTampered, ctx);
    expect(rep1.record_hash_ok).toBe(false);
    const resultTampered = { ...r, result: { ...r.result, status: "not_found" as const } };
    const rep2 = recomputeRecord(resultTampered, ctx);
    expect(rep2.record_hash_ok).toBe(false);
    expect(rep2.matches_record).toBe(false);
    expect(rep2.differences.length).toBeGreaterThan(0);
    const hashTampered = { ...r, cited_nodes: r.cited_nodes.map((c) => ({ ...c, hash: "0".repeat(64) })) };
    const rep3 = recomputeRecord(hashTampered, ctx);
    expect(rep3.cited_nodes.every((c) => c.hash_ok === false)).toBe(true);
  });
});

describe("release and record golden: signature", () => {
  it("signs and verifies a manifest with a throwaway key pair; tampering and wrong keys fail", () => {
    const bytes = manifestBytes(ctx.manifest);
    const kp = generateKeyPair();
    expect(kp.privateKeyPem).toMatch(/PRIVATE KEY/);
    expect(kp.publicKeyPem).toMatch(/PUBLIC KEY/);
    const sig = signManifest(bytes, kp.privateKeyPem);
    expect(sig.schema).toBe("aiact-manifest-signature/1");
    expect(sig.algorithm).toBe("Ed25519");
    expect(sig.key_id).toBe(keyIdFromPublicKey(kp.publicKeyPem));
    expect(sig.key_id).toMatch(/^[0-9a-f]{16}$/);
    expect(sig.signed_sha256).toBe(sha256Hex(bytes));
    expect(verifyManifestSignature(bytes, sig, kp.publicKeyPem)).toBe(true);
    const tampered = Buffer.concat([Buffer.from(bytes), Buffer.from(" ")]);
    expect(verifyManifestSignature(new Uint8Array(tampered), sig, kp.publicKeyPem)).toBe(false);
    const other = generateKeyPair();
    expect(verifyManifestSignature(bytes, sig, other.publicKeyPem)).toBe(false);
  });
  it("recompute reports valid, unknown_key, revoked and invalid signatures", () => {
    const bytes = manifestBytes(ctx.manifest);
    const kp = generateKeyPair();
    const sig = signManifest(bytes, kp.privateKeyPem);
    const r = createRecord(baseInput(), ctx);
    const keys = { [sig.key_id]: kp.publicKeyPem };
    expect(recomputeRecord(r, ctx, { manifestBytes: bytes, signature: sig, publicKeys: keys }).signature).toEqual({ status: "valid", key_id: sig.key_id });
    expect(recomputeRecord(r, ctx, { manifestBytes: bytes, signature: sig, publicKeys: {} }).signature.status).toBe("unknown_key");
    expect(recomputeRecord(r, ctx, { manifestBytes: bytes, signature: sig, publicKeys: keys, revoked: [sig.key_id] }).signature.status).toBe("revoked");
    const bad = { ...sig, signature: sig.signature.replace(/^./, (c) => (c === "A" ? "B" : "A")) };
    expect(recomputeRecord(r, ctx, { manifestBytes: bytes, signature: bad, publicKeys: keys }).signature.status).toBe("invalid");
  });
});

describe("release and record golden: verify page build", () => {
  it(
    "npm run build:site produces a self-contained page and bundle",
    () => {
      const res = spawnSync("npm", ["run", "build:site"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
      expect(res.status, `${res.stdout}\n${res.stderr}`).toBe(0);
      const html = join(ROOT, "site/verify/index.html");
      const js = join(ROOT, "site/verify/verify.js");
      expect(existsSync(html)).toBe(true);
      expect(existsSync(js)).toBe(true);
      const page = readFileSync(html, "utf8");
      expect(page).toContain("verify.js");
      expect(page).toContain("Keine Rechtsberatung");
      expect(page).toContain("Not legal advice");
      expect(page).toMatch(/ungeprüfte Angaben|unverified/);
      expect(page).not.toMatch(/https?:\/\/(cdn|unpkg|jsdelivr|fonts\.googleapis)/);
      const bundle = readFileSync(js, "utf8");
      expect(statSync(js).size).toBeLessThan(2 * 1024 * 1024);
      expect(bundle).not.toMatch(/from\s*["']node:|require\(["']node:|require\(["']fs["']\)/);
      expect(existsSync(join(ROOT, "site/keys/index.json"))).toBe(true);
      const dirs = readdirSync(join(ROOT, "release")).filter((d) => existsSync(join(ROOT, "release", d, "manifest.json")));
      for (const d of dirs) expect(existsSync(join(ROOT, "site/release", d, "manifest.json")), d).toBe(true);
    },
    180_000,
  );
});
