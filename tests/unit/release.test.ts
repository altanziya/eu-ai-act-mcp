import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadRelease } from "../../src/release/context.js";
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
      expect(() => buildRelease({ releaseId: "unit-release", outRoot: rel.outRoot, dataDir: data })).toThrow(/release exists and differs: .*deadlines\.json/);
      expect(sha256Hex(new Uint8Array(readFileSync(join(rel.dir, "deadlines.json"))))).toBe(rel.manifest.files.find((f) => f.path === "deadlines.json")?.sha256);
    } finally {
      rmSync(data, { recursive: true, force: true });
    }
  });
  it("an existing release folder with a changed or extra file is refused even if manifest.json is untouched", () => {
    const outRoot = mkdtempSync(join(tmpdir(), "aiact-unit-exists-"));
    try {
      const built = buildRelease({ releaseId: "exists", outRoot });
      const corpus = join(built.dir, "corpus", "32024R1689.en.json");
      const original = readFileSync(corpus);
      writeFileSync(corpus, original.toString("utf8").replace("shall", "SHALL"));
      expect(() => buildRelease({ releaseId: "exists", outRoot })).toThrow(`release exists and differs: ${corpus}`);
      writeFileSync(corpus, original);
      expect(buildRelease({ releaseId: "exists", outRoot }).dir).toBe(built.dir);
      writeFileSync(join(built.dir, "diff", "extra.json"), "{}");
      expect(() => buildRelease({ releaseId: "exists", outRoot })).toThrow(/release exists and differs: .*extra\.json/);
      rmSync(join(built.dir, "diff", "extra.json"));
      rmSync(join(built.dir, "deadlines.json"));
      expect(() => buildRelease({ releaseId: "exists", outRoot })).toThrow(/release exists and differs: .*deadlines\.json/);
    } finally {
      rmSync(outRoot, { recursive: true, force: true });
    }
  });
  it("a signature file next to the manifest does not make a rebuild fail", () => {
    const outRoot = mkdtempSync(join(tmpdir(), "aiact-unit-sigok-"));
    try {
      const built = buildRelease({ releaseId: "signed", outRoot });
      writeFileSync(join(built.dir, "manifest.sig.json"), "{}\n");
      expect(buildRelease({ releaseId: "signed", outRoot }).dir).toBe(built.dir);
    } finally {
      rmSync(outRoot, { recursive: true, force: true });
    }
  });
  it("rejects release ids that are not plain folder names and leaves no temporary folder behind", () => {
    expect(() => buildRelease({ releaseId: "../evil", outRoot: rel.outRoot })).toThrow(/invalid release id/);
    expect(() => buildRelease({ releaseId: "", outRoot: rel.outRoot })).toThrow(/invalid release id/);
    expect(readdirSync(rel.outRoot)).toEqual(["unit-release"]);
  });
});

describe("loadRelease verifies the release folder against its manifest", () => {
  const copy = (id: string) => {
    const root = mkdtempSync(join(tmpdir(), "aiact-unit-tamper-"));
    cpSync(rel.dir, join(root, id), { recursive: true });
    return { dir: join(root, id), cleanup: () => rmSync(root, { recursive: true, force: true }) };
  };
  it("loads an untouched release", () => {
    expect(loadRelease(rel.dir).releaseId).toBe("unit-release");
  });
  it("throws with the file name for a changed corpus file (same size)", () => {
    const c = copy("tampered");
    try {
      const f = join(c.dir, "corpus", "32024R1689.en.json");
      const text = readFileSync(f, "utf8");
      writeFileSync(f, text.replace("shall", "SHALL"));
      expect(() => loadRelease(c.dir)).toThrow(/corpus\/32024R1689\.en\.json/);
    } finally {
      c.cleanup();
    }
  });
  it("throws for a changed file that is not needed for verification (diff), a truncated file and a missing file", () => {
    for (const [file, edit, pattern] of [
      ["diff/en.json", (t: string) => `${t} `, /diff\/en\.json/],
      ["deadlines.json", (t: string) => t.slice(0, 50), /deadlines\.json/],
    ] as const) {
      const c = copy("tampered");
      try {
        writeFileSync(join(c.dir, file), edit(readFileSync(join(c.dir, file), "utf8")));
        expect(() => loadRelease(c.dir)).toThrow(pattern);
      } finally {
        c.cleanup();
      }
    }
    const c = copy("tampered");
    try {
      rmSync(join(c.dir, "diff", "de.json"));
      expect(() => loadRelease(c.dir)).toThrow(/diff\/de\.json/);
    } finally {
      c.cleanup();
    }
  });
  it("throws for a manifest that lists a path outside the release folder", () => {
    const c = copy("tampered");
    try {
      const m = JSON.parse(readFileSync(join(c.dir, "manifest.json"), "utf8")) as { files: Array<{ path: string }> };
      m.files.push({ path: "../outside.json" });
      writeFileSync(join(c.dir, "manifest.json"), JSON.stringify(m));
      expect(() => loadRelease(c.dir)).toThrow(/invalid path/);
    } finally {
      c.cleanup();
    }
  });
});
