/**
 * npm run parse: data/raw/<celex>.<lang>.xhtml -> data/corpus/<celex>.<lang>.json, then the 2024->2026 diff
 * per language -> data/diff/<lang>.json (+ .report.md).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { CELEX_IDS, corpusPath, diffPath, diffReportPath, LANGS, rawPath, V2024, V2026 } from "../src/config.js";
import { diffCorpora, diffReportMarkdown } from "../src/diff/diff.js";
import { parseXhtmlToNodes } from "../src/parser/parse.js";
import type { CorpusFile } from "../src/parser/types.js";
import { writeJsonFile, writeTextFile } from "../src/util/write.js";

const corpora = new Map<string, CorpusFile>();
for (const celex of CELEX_IDS) {
  for (const lang of LANGS) {
    const { nodes, warnings } = parseXhtmlToNodes(readFileSync(rawPath(celex, lang), "utf8"));
    const file: CorpusFile = { celex, lang, nodes };
    mkdirSync(dirname(corpusPath(celex, lang)), { recursive: true });
    writeJsonFile(corpusPath(celex, lang), file);
    corpora.set(`${celex}.${lang}`, file);
    const counts = new Map<string, number>();
    for (const n of nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    console.log(`${celex}.${lang}: ${nodes.length} nodes ${[...counts].map(([t, c]) => `${t}=${c}`).join(" ")}${warnings.length ? ` WARN(${warnings.length}): ${warnings.slice(0, 5).join("; ")}` : ""}`);
  }
}

mkdirSync(dirname(diffPath("en")), { recursive: true });
for (const lang of LANGS) {
  const from = corpora.get(`${V2024}.${lang}`) as CorpusFile;
  const to = corpora.get(`${V2026}.${lang}`) as CorpusFile;
  const diff = diffCorpora(from, to);
  writeJsonFile(diffPath(lang), diff);
  writeTextFile(diffReportPath(lang), diffReportMarkdown(diff, from, to));
  const c = diff.counts;
  console.log(`diff ${lang}: added=${c.added} removed=${c.removed} changed=${c.changed} moved=${c.moved} unchanged=${c.unchanged}`);
}
