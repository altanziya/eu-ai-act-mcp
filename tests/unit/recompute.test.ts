import { readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { afterAll, describe, expect, it } from "vitest";
import { createRecord, recordHash } from "../../src/record/record.js";
import type { EvidenceRecord, RecordInput } from "../../src/record/record.js";
import { manifestBytes } from "../../src/release/manifest.js";
import { generateKeyPair, signManifest } from "../../src/release/sign.js";
import { checkFiles, filesOk } from "../../src/verify-core/files.js";
import { compareRows, overallVerdict, recomputeRecord } from "../../src/verify-core/recompute.js";
import { V2024 } from "../../src/constants.js";
import { makeRelease, nodeText } from "./helpers/release.js";

const rel = makeRelease("unit-recompute");
afterAll(() => rel.cleanup());
const input = (over: Partial<RecordInput> = {}): RecordInput => ({
  quote: nodeText(rel.dir, "art_5.par_1.a"),
  claimed_ref: "art_5.par_1.a",
  as_of: "2026-09-01",
  lang: "en",
  created_at: "2026-10-05T12:00:00+02:00",
  release_id: "unit-recompute",
  ...over,
});
const rec = (over?: Partial<RecordInput>): EvidenceRecord => createRecord(input(over), rel.ctx);
/** Rebuild a record with a consistent hash after editing a stated field (a forger who recomputes the hash). */
const rehash = (r: EvidenceRecord, edit: (r: EvidenceRecord) => EvidenceRecord): EvidenceRecord => {
  const { record_hash: _old, ...body } = edit(r);
  return { ...body, record_hash: recordHash(body) };
};

describe("recomputeRecord", () => {
  it("a forged status with a recomputed record hash is caught by the recomputation", () => {
    const forged = rehash(rec(), (r) => ({ ...r, result: { ...r.result, status: "fuzzy" } }));
    const rep = recomputeRecord(forged, rel.ctx);
    expect(rep.record_hash_ok).toBe(true);
    expect(rep.matches_record).toBe(false);
    expect(rep.differences.map((d) => d.field)).toEqual(["status"]);
    expect(rep.recomputed.status).toBe("exact");
  });
  it("a forged validity state is reported as a difference", () => {
    const forged = rehash(rec(), (r) => ({ ...r, result: { ...r.result, validity: { state: "not_yet_applicable_until", until: "2030-01-01" } } }));
    const fields = recomputeRecord(forged, rel.ctx).differences.map((d) => d.field);
    expect(fields).toContain("validity.state");
    expect(fields).toContain("validity.until");
  });
  it("a changed input quote with a recomputed hash recomputes a different result", () => {
    const forged = rehash(rec(), (r) => ({ ...r, input: { ...r.input, quote: "this sentence does not occur anywhere in the regulation text at all" } }));
    const rep = recomputeRecord(forged, rel.ctx);
    expect(rep.recomputed.status).toBe("not_found");
    expect(rep.matches_record).toBe(false);
  });
  it("cited nodes: unknown id, wrong hash, wrong node_hash, unknown version", () => {
    const r = rec();
    const c0 = r.cited_nodes[0] as EvidenceRecord["cited_nodes"][number];
    const rep = recomputeRecord(
      { ...r, cited_nodes: [{ ...c0, id: "art_999" }, { ...c0, node_hash: "0".repeat(64) }, { ...c0, hash: "1".repeat(64) }, { ...c0, version: "nope" as typeof c0.version }] },
      rel.ctx,
    );
    expect(rep.cited_nodes.map((c) => [c.present, c.hash_ok, c.node_hash_ok])).toEqual([
      [false, false, false],
      [true, true, false],
      [true, false, true],
      [false, false, false],
    ]);
  });
  it("manifest hash: ok for the release manifest, not ok for other bytes", () => {
    const r = rec();
    expect(recomputeRecord(r, rel.ctx, { manifestBytes: manifestBytes(rel.manifest) }).manifest_sha256_ok).toBe(true);
    expect(recomputeRecord(r, rel.ctx, { manifestBytes: new Uint8Array([1, 2, 3]) }).manifest_sha256_ok).toBe(false);
  });
  it("a record for another release reports a release_id difference", () => {
    const r = rec();
    const forged = rehash(r, (x) => ({ ...x, release_id: "somewhere-else" }));
    expect(recomputeRecord(forged, rel.ctx).differences.map((d) => d.field)).toContain("release_id");
  });
  it("signature of a different manifest is invalid, a revoked key wins over a valid signature", () => {
    const kp = generateKeyPair();
    const bytes = manifestBytes(rel.manifest);
    const keys = { [signManifest(bytes, kp.privateKeyPem).key_id]: kp.publicKeyPem };
    const sigOther = signManifest(new Uint8Array([9, 9]), kp.privateKeyPem);
    expect(recomputeRecord(rec(), rel.ctx, { manifestBytes: bytes, signature: sigOther, publicKeys: keys }).signature.status).toBe("invalid");
    const sig = signManifest(bytes, kp.privateKeyPem);
    expect(recomputeRecord(rec(), rel.ctx, { manifestBytes: bytes, signature: sig, publicKeys: keys, revoked: [sig.key_id] }).signature).toEqual({ status: "revoked", key_id: sig.key_id });
  });
  it("a recital is checked against the Official Journal version and recomputes identically (V1 unknown)", () => {
    const recital = nodeText(rel.dir, "rec_12", "en", V2024);
    const r = rec({ quote: recital, claimed_ref: "rec_12" });
    expect(r.result.version_checked).toBe(V2024);
    const rep = recomputeRecord(r, rel.ctx);
    expect(rep.matches_record).toBe(true);
    expect(rep.recomputed.validity.state).toBe("unknown");
  });
});

describe("release file checks", () => {
  const read = (p: string): Uint8Array => new Uint8Array(readFileSync(join(rel.dir, p)));
  it("accepts untouched files and flags a changed, a truncated or an unlisted file", () => {
    expect(filesOk(checkFiles(rel.manifest, { "deadlines.json": read("deadlines.json"), "corpus/32024R1689.en.json": read("corpus/32024R1689.en.json") }))).toBe(true);
    const changed = read("deadlines.json");
    changed[10] = (changed[10] as number) ^ 1;
    expect(filesOk(checkFiles(rel.manifest, { "deadlines.json": changed }))).toBe(false);
    expect(checkFiles(rel.manifest, { "deadlines.json": read("deadlines.json").slice(0, 100) })[0]).toMatchObject({ listed: true, sha256_ok: false, bytes_ok: false });
    expect(checkFiles(rel.manifest, { "extra.json": new Uint8Array([1]) })[0]?.listed).toBe(false);
    expect(filesOk([])).toBe(false);
  });
});

describe("verify core stays isomorphic", () => {
  it("bundles for the browser without any node: builtin, including the browser entry", async () => {
    const res = await build({
      entryPoints: ["src/verify-core/browser.ts", "src/verify-core/recompute.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2022",
      outdir: "out",
      logLevel: "silent",
      metafile: true,
    });
    const inputs = Object.keys(res.metafile.inputs);
    expect(inputs.some((i) => i.includes("verifyCore"))).toBe(true);
    expect(inputs.filter((i) => /(-fs\.ts|release\/(sign|release|manifest|context)\.ts|config\.ts)$/.test(i))).toEqual([]);
    for (const f of res.outputFiles) expect(f.text).not.toMatch(/from\s*["']node:|require\(["'](node:|fs["'])/);
  });
});

describe("overallVerdict", () => {
  const kp = generateKeyPair();
  const bytes = manifestBytes(rel.manifest);
  const sig = signManifest(bytes, kp.privateKeyPem);
  const opts = { manifestBytes: bytes, signature: sig, publicKeys: { [sig.key_id]: kp.publicKeyPem } };
  const verdict = (r: EvidenceRecord, filesAreOk = true) => overallVerdict(r, recomputeRecord(r, rel.ctx, opts), filesAreOk);
  type Result = EvidenceRecord["result"];
  const otherVersion = "02024R1689-20240712" as Result["version_checked"];

  it("is all_ok for an untouched, signed record", () => {
    expect(verdict(rec())).toEqual({ all_ok: true, failed: [] });
  });
  it("is not ok without a valid signature, with a broken record hash or with failing release files", () => {
    const r = rec();
    expect(overallVerdict(r, recomputeRecord(r, rel.ctx, { manifestBytes: bytes }), true).failed).toEqual(["signature"]);
    expect(verdict({ ...r, question: "edited afterwards" }).failed).toEqual(["record_hash"]);
    expect(verdict(r, false).failed).toEqual(["release_files"]);
  });
  it("catches forged fields outside matches_record even with a recomputed record hash", () => {
    const m = (r: EvidenceRecord) => r.result.match as NonNullable<Result["match"]>;
    const forgeries: Array<[string, (r: EvidenceRecord) => EvidenceRecord, string]> = [
      ["match.version_id", (r) => ({ ...r, result: { ...r.result, match: { ...m(r), version_id: otherVersion } } }), "compare:location"],
      ["match.lang", (r) => ({ ...r, result: { ...r.result, match: { ...m(r), lang: "de" } } }), "compare:location"],
      ["version_checked", (r) => ({ ...r, result: { ...r.result, version_checked: otherVersion } }), "compare:version"],
      ["language_check", (r) => ({ ...r, result: { ...r.result, language_check: { result: "differs", detected_lang: "de" } } }), "compare:language"],
    ];
    for (const [name, edit, expected] of forgeries) {
      const forged = rehash(rec(), edit);
      const rep = recomputeRecord(forged, rel.ctx, opts);
      expect(rep.record_hash_ok, name).toBe(true);
      expect(rep.matches_record, name).toBe(true);
      expect(compareRows(forged, rep).some((row) => !row.ok), name).toBe(true);
      const v = overallVerdict(forged, rep, true);
      expect(v.all_ok, name).toBe(false);
      expect(v.failed, name).toContain(expected);
    }
  });
});
