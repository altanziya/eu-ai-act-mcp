/** npm run h3: data/corpus + data/diff -> data/h3.json (deterministic; thresholds are checked by plan/gate-day-1.sh). */
import { readFileSync } from "node:fs";
import { corpusPath, diffPath, h3Path, V2024, V2026 } from "../src/config.js";
import type { DiffResult } from "../src/diff/diff.js";
import { enDeStats, mappedStats } from "../src/h3/h3.js";
import type { CorpusFile } from "../src/parser/types.js";
import { writeJsonFile } from "../src/util/write.js";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const corpus = (celex: string, lang: "en" | "de"): CorpusFile => readJson<CorpusFile>(corpusPath(celex, lang));

const stats = {
  en: mappedStats(corpus(V2024, "en").nodes, readJson<DiffResult>(diffPath("en"))),
  de: mappedStats(corpus(V2024, "de").nodes, readJson<DiffResult>(diffPath("de"))),
};
const enDe2024 = enDeStats(corpus(V2024, "en").nodes, corpus(V2024, "de").nodes);
const enDe2026 = enDeStats(corpus(V2026, "en").nodes, corpus(V2026, "de").nodes);

const out = {
  mapped_2024_to_2026: { en: stats.en.ratio, de: stats.de.ratio },
  en_de_2024: enDe2024.ratio,
  en_de_2026: enDe2026.ratio,
  details: {
    note: "mapped_2024_to_2026 is measured over operative nodes (all types except recital): the consolidated version contains no recitals. See mapped_2024_to_2026_all_nodes for the ratio including them.",
    mapped_2024_to_2026_all_nodes: { en: stats.en.all_nodes, de: stats.de.all_nodes },
    mapped_2024_to_2026_operative: { en: stats.en, de: stats.de },
    en_de_2024: enDe2024,
    en_de_2026: enDe2026,
  },
};
writeJsonFile(h3Path(), out);
console.log(
  `H3 mapped en=${out.mapped_2024_to_2026.en} de=${out.mapped_2024_to_2026.de} | en_de_2024=${out.en_de_2024} en_de_2026=${out.en_de_2026} | removed(operative) en=${stats.en.removed.length} de=${stats.de.removed.length} | all-node ratio en=${stats.en.all_nodes.ratio} de=${stats.de.all_nodes.ratio}`,
);
