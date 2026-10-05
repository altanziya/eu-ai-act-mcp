/**
 * aiact_verify_citation for Node: the isomorphic core (verifyCore.ts) bound to the data/ defaults.
 * `verifyCitation(input)` reads data/corpus and data/deadlines.json; a release context passes its own loader and table
 * (see src/release/context.ts). Unit tests pass a constructed mini corpus as `load`.
 */
import type { CorpusLoader } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { DeadlineTable } from "./deadlines.js";
import { loadDeadlines } from "./deadlines-fs.js";
import { verifyCitationWith } from "./verifyCore.js";
import type { VerifyInput, VerifyResult } from "./verifyCore.js";

export type { Candidate, MatchInfo, TokenPair, VerifyInput, VerifyResult, VerifyStatus } from "./verifyCore.js";
export type { CorpusLoader } from "./corpus.js";

export function verifyCitation(input: VerifyInput, load: CorpusLoader = loadCorpus, deadlines?: DeadlineTable): VerifyResult {
  return verifyCitationWith(input, load, deadlines ?? loadDeadlines());
}
