/**
 * aiact_obligations for Node: the isomorphic core (obligationsCore.ts) bound to the data/ defaults.
 * `aiactObligations(input)` reads data/corpus, data/deadlines.json and data/obligations.json; a release context or the
 * browser passes its own loader, table and data.
 */
import type { CorpusLoader } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { DeadlineTable } from "./deadlines.js";
import { loadDeadlines } from "./deadlines-fs.js";
import { loadObligations } from "./obligations-fs.js";
import { aiactObligationsWith, describeProfileWith } from "./obligationsCore.js";
import type { FieldDescription, ObligationsData, ObligationsInput, ObligationsResult } from "./obligationsCore.js";
import { todayIso } from "./today.js";

export type { FieldDescription, Obligation, ObligationsData, ObligationsInput, ObligationsResult } from "./obligationsCore.js";

export function aiactObligations(
  input: Omit<ObligationsInput, "as_of"> & { as_of?: string },
  load: CorpusLoader = loadCorpus,
  deadlines?: DeadlineTable,
  data?: ObligationsData,
): ObligationsResult {
  return aiactObligationsWith({ ...input, as_of: input.as_of ?? todayIso() }, load, deadlines ?? loadDeadlines(), data ?? loadObligations());
}

/** The profile fields with description, type and allowed values (for forms and the MCP input schema). */
export function describeProfile(data?: ObligationsData): Record<string, FieldDescription> {
  return describeProfileWith(data ?? loadObligations());
}
