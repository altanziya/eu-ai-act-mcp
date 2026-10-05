/** Eval case format and loader (YAML list of cases, validated field by field). */
import { readFileSync } from "node:fs";
import { parse } from "yaml";

export const KINDS = ["generation", "evaluation"] as const;
export const SUBSETS = ["version_deadline", "evaluation"] as const;
export const ORIGINS = ["real_user_question", "constructed"] as const;
export const LEGAL_REVIEWS = ["none", "llm_second_rater", "lawyer"] as const;

export interface EvalCase {
  id: string;
  kind: (typeof KINDS)[number];
  subset: (typeof SUBSETS)[number];
  question: string;
  as_of: string;
  knowable_before_omnibus: boolean;
  origin: (typeof ORIGINS)[number];
  origin_ref?: string;
  expected: { date?: string; version?: string; articles?: string[]; verdict?: string };
  ground_truth: { celex: string; pinpoint: string; quote: string };
  legal_review: (typeof LEGAL_REVIEWS)[number];
  notes?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fail(id: string, field: string, why: string): never {
  throw new Error(`case ${id}: field ${field} ${why}`);
}

function oneOf<T extends string>(id: string, field: string, v: unknown, allowed: readonly T[]): T {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) fail(id, field, `must be one of ${allowed.join("|")} (got ${JSON.stringify(v)})`);
  return v as T;
}

function validate(raw: unknown, index: number): EvalCase {
  if (!isObj(raw)) throw new Error(`case #${index + 1}: not a mapping`);
  const id = raw["id"];
  if (!isStr(id)) throw new Error(`case #${index + 1}: field id missing or empty`);
  const kind = oneOf(id, "kind", raw["kind"], KINDS);
  const subset = oneOf(id, "subset", raw["subset"], SUBSETS);
  if (!isStr(raw["question"])) fail(id, "question", "missing or empty");
  if (!isStr(raw["as_of"]) || !ISO.test(raw["as_of"])) fail(id, "as_of", "missing or not YYYY-MM-DD");
  if (typeof raw["knowable_before_omnibus"] !== "boolean") fail(id, "knowable_before_omnibus", "missing or not a boolean");
  const origin = oneOf(id, "origin", raw["origin"], ORIGINS);
  const legal = oneOf(id, "legal_review", raw["legal_review"], LEGAL_REVIEWS);
  if (raw["origin_ref"] !== undefined && typeof raw["origin_ref"] !== "string") fail(id, "origin_ref", "must be a string");
  if (raw["notes"] !== undefined && typeof raw["notes"] !== "string") fail(id, "notes", "must be a string");

  const ex = raw["expected"];
  if (!isObj(ex)) return fail(id, "expected", "missing or not a mapping");
  const expected: EvalCase["expected"] = {};
  if (ex["date"] !== undefined) {
    if (!isStr(ex["date"]) || !ISO.test(ex["date"])) fail(id, "expected.date", "not YYYY-MM-DD");
    expected.date = ex["date"];
  }
  if (ex["version"] !== undefined) {
    if (!isStr(ex["version"])) fail(id, "expected.version", "must be a string");
    expected.version = ex["version"];
  }
  if (ex["articles"] !== undefined) {
    if (!Array.isArray(ex["articles"]) || ex["articles"].length === 0 || !ex["articles"].every(isStr)) fail(id, "expected.articles", "must be a non-empty list of strings");
    expected.articles = ex["articles"] as string[];
  }
  if (ex["verdict"] !== undefined) {
    if (typeof ex["verdict"] !== "string" || !["correct", "incorrect"].includes(ex["verdict"].toLowerCase())) fail(id, "expected.verdict", "must be correct or incorrect");
    expected.verdict = ex["verdict"].toLowerCase();
  }
  if (kind === "generation" && expected.date === undefined && expected.version === undefined && expected.articles === undefined) fail(id, "expected", "needs date, version or articles for kind generation");
  if (kind === "evaluation" && expected.verdict === undefined) fail(id, "expected.verdict", "required for kind evaluation");

  const gt = raw["ground_truth"];
  if (!isObj(gt)) return fail(id, "ground_truth", "missing or not a mapping");
  for (const f of ["celex", "pinpoint", "quote"]) if (!isStr(gt[f])) fail(id, `ground_truth.${f}`, "missing or empty");

  return {
    id,
    kind,
    subset,
    question: raw["question"],
    as_of: raw["as_of"],
    knowable_before_omnibus: raw["knowable_before_omnibus"],
    origin,
    ...(raw["origin_ref"] !== undefined ? { origin_ref: raw["origin_ref"] as string } : {}),
    expected,
    ground_truth: { celex: gt["celex"] as string, pinpoint: gt["pinpoint"] as string, quote: gt["quote"] as string },
    legal_review: legal,
    ...(raw["notes"] !== undefined ? { notes: raw["notes"] as string } : {}),
  };
}

/** Reads and validates a case file; throws with the case id and field on the first problem. */
export function loadCases(path: string): EvalCase[] {
  const doc: unknown = parse(readFileSync(path, "utf8"));
  if (!Array.isArray(doc)) throw new Error(`${path}: expected a YAML list of cases`);
  const seen = new Set<string>();
  return doc.map((raw, i) => {
    const c = validate(raw, i);
    if (seen.has(c.id)) throw new Error(`case ${c.id}: duplicate id`);
    seen.add(c.id);
    return c;
  });
}
