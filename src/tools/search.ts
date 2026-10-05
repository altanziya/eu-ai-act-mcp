/**
 * aiact_search for Node: the isomorphic core (searchCore.ts) bound to the data/ defaults.
 * `aiactSearch(input)` reads data/corpus and data/deadlines.json; a release context passes its own loader and table.
 */
import type { CorpusLoader } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { DeadlineTable } from "./deadlines.js";
import { loadDeadlines } from "./deadlines-fs.js";
import { aiactSearchWith } from "./searchCore.js";
import type { SearchInput, SearchResult } from "./searchCore.js";
import { todayIso } from "./today.js";

export type { SearchHit, SearchInput, SearchResult } from "./searchCore.js";

export function aiactSearch(input: SearchInput, load: CorpusLoader = loadCorpus, deadlines?: DeadlineTable): SearchResult {
  return aiactSearchWith({ ...input, as_of: input.as_of ?? todayIso() }, load, deadlines ?? loadDeadlines());
}
