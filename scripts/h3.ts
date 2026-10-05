/** npm run h3: data/corpus + data/diff -> data/h3.json (deterministic; thresholds are checked by plan/gate-day-1.sh). */
import { readFileSync } from "node:fs";
import { corpusPath, diffPath, h3Path, V2024, V2026 } from "../src/config.js";
import type { DiffResult } from "../src/diff/diff.js";
import { buildH3Report } from "../src/h3/h3.js";
import type { CorpusFile } from "../src/parser/types.js";
import { writeJsonFile } from "../src/util/write.js";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const corpus = (celex: string, lang: "en" | "de"): CorpusFile => readJson<CorpusFile>(corpusPath(celex, lang));

const { report, stats } = buildH3Report({
  en2024: corpus(V2024, "en").nodes,
  de2024: corpus(V2024, "de").nodes,
  en2026: corpus(V2026, "en").nodes,
  de2026: corpus(V2026, "de").nodes,
  diffEn: readJson<DiffResult>(diffPath("en")),
  diffDe: readJson<DiffResult>(diffPath("de")),
});
writeJsonFile(h3Path(), report);
const out = report as { mapped_2024_to_2026: { en: number; de: number }; en_de_2024: number; en_de_2026: number };
console.log(
  `H3 mapped en=${out.mapped_2024_to_2026.en} de=${out.mapped_2024_to_2026.de} | en_de_2024=${out.en_de_2024} en_de_2026=${out.en_de_2026} | removed(operative) en=${stats.en.removed.length} de=${stats.de.removed.length} | all-node ratio en=${stats.en.all_nodes.ratio} de=${stats.de.all_nodes.ratio}`,
);
