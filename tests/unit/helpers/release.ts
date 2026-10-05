/** Test helper: build a release from data/ into a temp folder and load it. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRelease } from "../../../src/release/context.js";
import { buildRelease } from "../../../src/release/release.js";
import type { ProvisionNode } from "../../../src/parser/types.js";
import { V2026 } from "../../../src/constants.js";

export const makeRelease = (releaseId = "unit-release") => {
  const outRoot = mkdtempSync(join(tmpdir(), "aiact-unit-release-"));
  const built = buildRelease({ releaseId, outRoot });
  return { outRoot, ...built, ctx: loadRelease(built.dir), cleanup: () => rmSync(outRoot, { recursive: true, force: true }) };
};

export const nodeText = (dir: string, id: string, lang: "en" | "de" = "en", version: string = V2026): string => {
  const nodes = (JSON.parse(readFileSync(join(dir, "corpus", `${version}.${lang}.json`), "utf8")) as { nodes: ProvisionNode[] }).nodes;
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`node ${id} missing`);
  return n.text;
};
