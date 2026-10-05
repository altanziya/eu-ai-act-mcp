import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toJson, writeFileAtomic, writeJsonFile, writeTextFile } from "../../src/util/write.js";

describe("writeFileAtomic", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "atomic-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("writes exact bytes, replaces existing content and leaves no temp file", () => {
    const p = join(dir, "a.json");
    writeFileSync(p, "old content that is longer than the new one");
    writeFileAtomic(p, "new\n");
    expect(readFileSync(p, "utf8")).toBe("new\n");
    writeFileAtomic(p, new Uint8Array([1, 2, 3]));
    expect([...readFileSync(p)]).toEqual([1, 2, 3]);
    expect(readdirSync(dir)).toEqual(["a.json"]);
  });

  it("keeps the old file and leaves no temp file when the write fails", () => {
    const p = join(dir, "keep.txt");
    writeFileSync(p, "keep");
    expect(() => writeFileAtomic(join(dir, "missing", "x.txt"), "x")).toThrow();
    expect(readFileSync(p, "utf8")).toBe("keep");
    expect(readdirSync(dir)).toEqual(["keep.txt"]);
  });

  it("json and text helpers keep their byte format", () => {
    writeJsonFile(join(dir, "v.json"), { b: 1, a: [2] });
    expect(readFileSync(join(dir, "v.json"), "utf8")).toBe(toJson({ b: 1, a: [2] }));
    writeTextFile(join(dir, "t.md"), "x");
    expect(readFileSync(join(dir, "t.md"), "utf8")).toBe("x\n");
    writeTextFile(join(dir, "t2.md"), "y\n");
    expect(readFileSync(join(dir, "t2.md"), "utf8")).toBe("y\n");
  });
});
