/**
 * Determinism of the whole pipeline in memory (plan/day-1b.md "Neue Tests" 3): raw XHTML -> corpus, diff, report and
 * h3 are built twice and must be byte-identical, and they must equal the committed files in data/corpus, data/diff
 * and data/h3.json (so the committed data is never stale). In memory on purpose: the golden test already runs
 * `npm run parse`; a second writer in parallel would race on the same files.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corpusPath, diffPath, diffReportPath, h3Path, V2024, V2026 } from "../../src/config.js";
import { diffCorpora, diffReportMarkdown } from "../../src/diff/diff.js";
import { buildH3Report } from "../../src/h3/h3.js";
import { parseXhtmlToNodes } from "../../src/parser/parse.js";
import type { CorpusFile } from "../../src/parser/types.js";
import { toJson } from "../../src/util/write.js";
import { ALL_CASES, LANGS } from "./helpers/corpora.js";

function buildAll(): Map<string, string> {
  const out = new Map<string, string>();
  const corpora = new Map<string, CorpusFile>();
  for (const c of ALL_CASES) {
    const file: CorpusFile = { celex: c.celex, lang: c.lang, nodes: parseXhtmlToNodes(readFileSync(c.rawFile, "utf8")).nodes };
    corpora.set(c.label, file);
    out.set(corpusPath(c.celex, c.lang), toJson(file));
  }
  const diffs = new Map<string, ReturnType<typeof diffCorpora>>();
  for (const lang of LANGS) {
    const from = corpora.get(`${V2024}.${lang}`) as CorpusFile;
    const to = corpora.get(`${V2026}.${lang}`) as CorpusFile;
    const d = diffCorpora(from, to);
    diffs.set(lang, d);
    out.set(diffPath(lang), toJson(d));
    const report = diffReportMarkdown(d, from, to);
    out.set(diffReportPath(lang), report.endsWith("\n") ? report : `${report}\n`);
  }
  // data/h3.json is computed from the *files* by scripts/h3.ts; JSON round trip makes this identical
  const roundTrip = <T>(v: T): T => JSON.parse(toJson(v)) as T;
  const nodes = (v: string, l: string): CorpusFile["nodes"] => (corpora.get(`${v}.${l}`) as CorpusFile).nodes;
  const { report } = buildH3Report({
    en2024: nodes(V2024, "en"),
    de2024: nodes(V2024, "de"),
    en2026: nodes(V2026, "en"),
    de2026: nodes(V2026, "de"),
    diffEn: roundTrip(diffs.get("en") as ReturnType<typeof diffCorpora>),
    diffDe: roundTrip(diffs.get("de") as ReturnType<typeof diffCorpora>),
  });
  out.set(h3Path(), toJson(report));
  return out;
}

describe("pipeline determinism", () => {
  const first = buildAll();
  const second = buildAll();

  it("builds corpus, diff, report and h3 byte-identically on two runs", () => {
    expect([...first.keys()]).toEqual([...second.keys()]);
    const differing = [...first.keys()].filter((k) => first.get(k) !== second.get(k));
    expect(differing).toEqual([]);
  });

  it("covers all four corpus files, both diffs with reports, and h3.json", () => {
    expect(first.size).toBe(4 + 2 * 2 + 1);
    expect([...first.keys()].some((k) => k.endsWith("data/h3.json"))).toBe(true);
  });

  for (const key of first.keys()) {
    it(`equals the committed ${key.slice(key.indexOf("data/"))}`, () => {
      expect(readFileSync(key, "utf8") === first.get(key)).toBe(true);
    });
  }
});
