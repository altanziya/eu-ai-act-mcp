import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildManifest, manifestBytes, sha256Hex } from "../../src/release/manifest.js";
import { buildRelease } from "../../src/release/release.js";
import { makeRelease } from "./helpers/release.js";

const rel = makeRelease();
afterAll(() => rel.cleanup());

describe("release and manifest", () => {
  it("sha256Hex matches the known digest of 'abc'", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("manifest has schema, tool version, both notices and sorted files with corpus metadata", () => {
    const m = rel.manifest;
    expect(m.schema).toBe("aiact-corpus-manifest/1");
    expect(m.tool_version).toBe((JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version);
    expect(m.notice.de).toMatch(/Keine Rechtsberatung/);
    expect(m.notice.en).toMatch(/Not legal advice/);
    expect(m.files.map((f) => f.path)).toEqual(["corpus/02024R1689-20260727.de.json", "corpus/02024R1689-20260727.en.json", "corpus/32024R1689.de.json", "corpus/32024R1689.en.json", "deadlines.json", "diff/de.json", "diff/en.json"]);
    expect(m.files.find((f) => f.path === "deadlines.json")?.celex).toBeUndefined();
  });
  it("manifest.json is 2-space JSON with LF and a trailing newline, and equals manifestBytes", () => {
    const text = readFileSync(join(rel.dir, "manifest.json"), "utf8");
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).not.toMatch(/\r/);
    expect(text).toMatch(/^\{\n {2}"schema"/);
    expect(text).toBe(new TextDecoder().decode(manifestBytes(rel.manifest)));
  });
  it("a changed file changes the manifest (hash and bytes)", () => {
    const copy = makeRelease("unit-release-b");
    try {
      const before = sha256Hex(manifestBytes(copy.manifest));
      writeFileSync(join(copy.dir, "deadlines.json"), `${readFileSync(join(copy.dir, "deadlines.json"), "utf8")} `);
      const after = buildManifest(copy.dir, "unit-release-b");
      expect(sha256Hex(manifestBytes(after))).not.toBe(before);
    } finally {
      copy.cleanup();
    }
  });
  it("a manifest does not list itself or its signature", () => {
    writeFileSync(join(rel.dir, "manifest.sig.json"), "{}\n");
    expect(buildManifest(rel.dir, "unit-release").files.some((f) => f.path.startsWith("manifest"))).toBe(false);
    rmSync(join(rel.dir, "manifest.sig.json"));
  });
  it("rebuilding the same release is a no-op, a release with different content is refused", () => {
    const again = buildRelease({ releaseId: "unit-release", outRoot: rel.outRoot });
    expect(sha256Hex(manifestBytes(again.manifest))).toBe(sha256Hex(manifestBytes(rel.manifest)));
    const data = mkdtempSync(join(tmpdir(), "aiact-unit-data-"));
    try {
      cpSync("data/corpus", join(data, "corpus"), { recursive: true });
      cpSync("data/diff", join(data, "diff"), { recursive: true });
      writeFileSync(join(data, "deadlines.json"), `${readFileSync("data/deadlines.json", "utf8")} `);
      expect(() => buildRelease({ releaseId: "unit-release", outRoot: rel.outRoot, dataDir: data })).toThrow(/immutable/);
      expect(sha256Hex(new Uint8Array(readFileSync(join(rel.dir, "deadlines.json"))))).toBe(rel.manifest.files.find((f) => f.path === "deadlines.json")?.sha256);
    } finally {
      rmSync(data, { recursive: true, force: true });
    }
  });
  it("rejects release ids that are not plain folder names and leaves no temporary folder behind", () => {
    expect(() => buildRelease({ releaseId: "../evil", outRoot: rel.outRoot })).toThrow(/invalid release id/);
    expect(() => buildRelease({ releaseId: "", outRoot: rel.outRoot })).toThrow(/invalid release id/);
    expect(readdirSync(rel.outRoot)).toEqual(["unit-release"]);
  });
});
