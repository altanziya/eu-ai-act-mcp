import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../../src/config.js";
import { loadRelease, ReleaseError, releaseErrorMessage } from "../../src/web/loadRelease.js";
import type { LoadProgress } from "../../src/web/loadRelease.js";
import { auditTextWith } from "../../src/tools/auditCore.js";

const RELEASE_DIR = join(REPO_ROOT, "release");
const ID = readdirSync(RELEASE_DIR).filter((d) => d.startsWith("aiact-corpus-")).sort().pop() as string;
const KEYS = readFileSync(join(REPO_ROOT, "site/keys/index.json"));

type Overrides = Record<string, Uint8Array | (() => never)>;
/** A fetch over the local release folder; `over` replaces single URLs. */
const fetcher = (over: Overrides = {}) => async (url: string): Promise<Uint8Array> => {
  const o = over[url];
  if (typeof o === "function") return o();
  if (o) return o;
  if (url === "../keys/index.json") return new Uint8Array(KEYS);
  const m = /^\.\.\/release\/([^/]+)\/(.+)$/.exec(url);
  if (!m) throw new Error(`unexpected url ${url}`);
  return new Uint8Array(readFileSync(join(RELEASE_DIR, m[1] as string, m[2] as string)));
};
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("loadRelease", () => {
  it("loads the local release, checks the signature and delivers a working context", async () => {
    const progress: LoadProgress[] = [];
    const r = await loadRelease({ releaseId: ID, fetchBytes: fetcher(), onProgress: (p) => progress.push(p) });
    expect(r.releaseId).toBe(ID);
    expect(r.keyId).toMatch(/^[0-9a-f]{16}$/);
    expect(r.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    const last = progress[progress.length - 1] as LoadProgress;
    expect(last.files).toBe(last.totalFiles);
    expect(last.bytes).toBe(last.totalBytes);
    expect(progress.length).toBe(last.totalFiles + 1);
    // the context feeds the audit core
    const audit = auditTextWith({ text: "See Article 9(2).", as_of: "2026-10-05" }, r.context.loadCorpus, r.context.deadlines);
    expect(audit.findings[0]?.kind).toBe("reference_ok");
  });

  it("refuses a corpus file that differs from the manifest", async () => {
    const path = `../release/${ID}/corpus/02024R1689-20260727.en.json`;
    const good = await fetcher()(path);
    const bad = new Uint8Array(good);
    bad[bad.length >> 1] = (bad[bad.length >> 1] as number) ^ 1;
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ [path]: bad }) })).rejects.toMatchObject({ code: "file_mismatch" });
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ [`../release/${ID}/deadlines.json`]: enc("{}") }) })).rejects.toMatchObject({ code: "file_mismatch" });
  });

  it("refuses a manifest whose signature does not match", async () => {
    const url = `../release/${ID}/manifest.json`;
    const text = new TextDecoder().decode(await fetcher()(url));
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ [url]: enc(text.replace('"tool_version"', '"tool_versionx"')) }) })).rejects.toMatchObject({ code: "signature_invalid" });
  });

  it("refuses an unknown or revoked key and a missing signature", async () => {
    const keys = JSON.parse(KEYS.toString("utf8")) as { keys: Array<{ key_id: string; status: string }> };
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ "../keys/index.json": enc(JSON.stringify({ keys: [] })) }) })).rejects.toMatchObject({ code: "unknown_key" });
    const revoked = { keys: keys.keys.map((k) => ({ ...k, status: "revoked" })) };
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ "../keys/index.json": enc(JSON.stringify(revoked)) }) })).rejects.toMatchObject({ code: "key_revoked" });
    await expect(loadRelease({ releaseId: ID, fetchBytes: fetcher({ [`../release/${ID}/manifest.sig.json`]: enc("{}") }) })).rejects.toMatchObject({ code: "signature_missing" });
  });

  it("reports network errors and bad identifiers as ReleaseError with a readable message in both languages", async () => {
    const failing = fetcher({ [`../release/${ID}/manifest.json`]: () => { throw new Error("offline"); } });
    const e = await loadRelease({ releaseId: ID, fetchBytes: failing }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ReleaseError);
    expect((e as ReleaseError).code).toBe("fetch_failed");
    expect(releaseErrorMessage(e, "en")).toMatch(/could not be loaded/);
    expect(releaseErrorMessage(e, "de")).toMatch(/konnte nicht geladen/);
    await expect(loadRelease({ releaseId: "../x", fetchBytes: fetcher() })).rejects.toMatchObject({ code: "invalid_release_id" });
    await expect(loadRelease({ releaseId: "aiact-corpus-1999-01-01", fetchBytes: fetcher() })).rejects.toBeInstanceOf(Error);
  });
});
