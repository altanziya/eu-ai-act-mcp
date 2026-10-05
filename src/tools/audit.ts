/**
 * aiact_audit_text for Node: the isomorphic core (auditCore.ts) bound to the data/ defaults.
 * `auditText(input)` reads data/corpus and data/deadlines.json; a release context passes its own loader and table.
 */
import type { CorpusLoader } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { DeadlineTable } from "./deadlines.js";
import { loadDeadlines } from "./deadlines-fs.js";
import { auditTextWith } from "./auditCore.js";
import type { AuditInput, AuditResult } from "./auditCore.js";

export type { AuditInput, AuditResult, Finding, FindingKind, Severity } from "./auditCore.js";

export function auditText(input: AuditInput, load: CorpusLoader = loadCorpus, deadlines?: DeadlineTable): AuditResult {
  return auditTextWith(input, load, deadlines ?? loadDeadlines());
}
