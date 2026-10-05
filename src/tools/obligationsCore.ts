/**
 * Isomorphic core of aiact_obligations (no node: imports; also runs in the browser). Corpus loader, deadline table and the
 * obligations data (data/obligations.json, schema obligations-v1) are passed in; obligations.ts binds the data/ defaults for Node.
 *
 * A company profile (fields of `profile_fields`) is turned into the obligations that apply to it:
 *  - `derived` fields (high_risk, hr_chapter_iii_in_scope, fria_required, ...) are evaluated from the profile with a small
 *    DSL ({field, eq}, {field, in}, {all}, {any}, {not}); `{computed}` exists only for placed_before_chapter_iii_date.
 *  - An entry applies when its roles meet the profile's roles and its `applies_if` holds.
 *  - The date of an entry follows `timing.basis`: hr_route (Annex III / Annex I route date from the deadline table),
 *    deadline_table (a rule of the table) or transition (fixed date of Article 111). No date is written in this file.
 *  - Quotations are re-checked against the corpus at run time (`quote_verified`).
 * Deterministic, no model, no network. Orientation only; legal assessments are flagged (`open_questions`), not made.
 */
import { V2024, V2026 } from "../constants.js";
import { ancestorChain, descendants, isIsoDate, isLang, versionForDate, CONSOLIDATED_FROM } from "./corpus.js";
import type { CorpusIndex, CorpusLoader, Lang } from "./corpus.js";
import { matchRule, resolveDeadline } from "./deadlines.js";
import type { DeadlineBlock, DeadlineRule, DeadlineTable } from "./deadlines.js";
import { formatRef } from "./formatRef.js";

export type Value = string | boolean | null | string[];
export type Condition = Record<string, unknown>;

export interface Timing {
  basis: "hr_route" | "deadline_table" | "transition";
  literal_rule?: string;
  rule?: string;
  not_before?: string;
  deadline_caveat?: string;
  date?: string | null;
  source_node?: string;
}
export interface ObligationEntry {
  id: string;
  kind: string;
  title: string;
  summary: string;
  roles: string[];
  applies_if: Condition;
  provisions: string[];
  anchor_node: string;
  anchor_node_2024?: string;
  quote: string;
  new_in_2026?: boolean;
  legal_assessment_needed?: string;
  omnibus_note?: string;
  timing: Timing;
}
export interface ClassificationEntry {
  id: string;
  derives?: string;
  rule?: Condition;
  provisions: string[];
  anchor_node: string;
  quote: string;
  legal_assessment_needed?: string;
  note?: string;
}
export interface ObligationsData {
  schema: string;
  source_version: string;
  derived: Record<string, Condition>;
  profile_fields: Record<string, string>;
  obligations: ObligationEntry[];
  classification: ClassificationEntry[];
}

export interface ObligationsInput {
  profile: Record<string, unknown>;
  /** ISO date, not before CONSOLIDATED_FROM. */
  as_of: string;
  /** Language of the citations; default en. Quotations stay in English (the language of the data). */
  lang?: Lang;
}
export type Status = "applicable" | "upcoming" | "depends";
export interface Obligation {
  id: string;
  kind: string;
  title: string;
  summary: string;
  roles: string[];
  provisions: Array<{ id: string; citation: string }>;
  anchor_node: string;
  quote: string;
  quote_verified: boolean;
  applies_from: string | null;
  applies_from_literal?: string;
  route_dates?: string[];
  deadline_caveat?: string;
  status: Status;
  /** Whole days from as_of to applies_from; 0 when applicable; null when no fixed date. */
  days_until: number | null;
  conditional_dates?: Array<{ date: string; condition: string }>;
  legal_assessment_needed?: string;
  omnibus_note?: string;
  changed_by_omnibus: boolean;
}
export interface ObligationsResult {
  as_of: string;
  version: string;
  profile_echo: Record<string, Value>;
  derived: string[];
  obligations: Obligation[];
  timeline: Array<{ date: string; ids: string[] }>;
  open_questions: Array<{ id: string; question: string }>;
  notice: string;
}

export const NOTICE = "Orientation from the consolidated text, not legal advice; dates follow Article 113 and the classification route; legal assessments are flagged, not made.";
export const BEFORE_CONSOLIDATED_MESSAGE = `obligations map covers the consolidated text in force from ${CONSOLIDATED_FROM}; use get_provision/verify_citation for earlier dates`;

/** Rule ids of data/deadlines.json that carry the Chapter III application date of the two classification routes (Article 6(2) / Article 6(1)). */
export const ROUTE_RULE_ANNEX_III = "art6-par2-annex3";
export const ROUTE_RULE_ANNEX_I = "art6-par1-annex1";
/** Table rule for Chapter III Sections 1-3: a simplification of Art. 113(3)(c), which names the route dates itself; not a divergent literal reading. */
const SIMPLIFIED_ROUTE_RULE = "ch3s1-3";
const DEFAULT_RULE = "default";
const COMPUTED_PLACED_BEFORE = "placed_before_chapter_iii_date";
/** Fields the `computed` rule placed_before_chapter_iii_date reads (besides the profile): used to find which answers matter. */
const PLACED_BEFORE_DEPENDS_ON = ["placed_on_market_before", "high_risk_annex_iii", "high_risk_annex_i"];

// ---------------------------------------------------------------------------------------------------------------------
// profile fields

export type FieldSpec =
  | { type: "boolean" }
  | { type: "enum_array"; values: string[] }
  | { type: "enum"; values: string[] }
  | { type: "date" }
  | { type: "any" };
export interface FieldDescription {
  description: string;
  type: FieldSpec["type"];
  values?: string[];
  required: boolean;
}

/** The type of a profile field, read from the first clause of its description in `profile_fields` (bool; array of enum a|b; null or string '1'..'8'; null or enum 'A'|'B'; enum a|b; null or ISO date). */
export function fieldSpec(description: string): FieldSpec {
  const head = (description.split(";")[0] as string).trim();
  let m: RegExpExecArray | null;
  if ((m = /^array of enum (\S+)$/.exec(head))) return { type: "enum_array", values: (m[1] as string).split("|") };
  if (/^bool$/.test(head)) return { type: "boolean" };
  if (/^null or ISO date$/.test(head)) return { type: "date" };
  if ((m = /^null or string '(\d+)'\.\.'(\d+)'$/.exec(head))) {
    const values: string[] = [];
    for (let i = Number(m[1]); i <= Number(m[2]); i++) values.push(String(i));
    return { type: "enum", values };
  }
  if ((m = /^null or enum (.+)$/.exec(head))) return { type: "enum", values: [...(m[1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1] as string) };
  if ((m = /^enum (\S+)$/.exec(head))) return { type: "enum", values: (m[1] as string).split("|") };
  return { type: "any" };
}

/** The profile fields with description, type and allowed values (for forms and the MCP input schema). */
export function describeProfileWith(data: ObligationsData): Record<string, FieldDescription> {
  const out: Record<string, FieldDescription> = {};
  for (const [name, description] of Object.entries(data.profile_fields)) {
    const spec = fieldSpec(description);
    out[name] = { description, type: spec.type, ...("values" in spec ? { values: spec.values } : {}), required: name === "role" };
  }
  return out;
}

interface Profile {
  values: Record<string, Value>;
  /** Fields the caller set to a value other than null. */
  provided: Set<string>;
}

function normalizeProfile(data: ObligationsData, raw: Record<string, unknown>): Profile {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("profile must be an object");
  const allowed = Object.keys(data.profile_fields);
  const unknown = Object.keys(raw).filter((k) => !allowed.includes(k));
  if (unknown.length > 0) throw new Error(`unknown profile field${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}; allowed fields: ${allowed.join(", ")}`);
  const values: Record<string, Value> = {};
  const provided = new Set<string>();
  for (const [name, description] of Object.entries(data.profile_fields)) {
    const spec = fieldSpec(description);
    const v = raw[name];
    const fail = (expected: string): never => {
      throw new Error(`profile field ${name} must be ${expected}, got ${JSON.stringify(v)}`);
    };
    if (name === "role") {
      const roles = spec.type === "enum_array" ? spec.values : [];
      if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "string" || (roles.length > 0 && !roles.includes(x)))) fail(`a non-empty array of ${roles.join("|")}`);
      values[name] = [...new Set(v as string[])];
      provided.add(name);
      continue;
    }
    if (v === undefined || v === null) {
      values[name] = spec.type === "boolean" ? false : null;
      continue;
    }
    switch (spec.type) {
      case "boolean":
        if (typeof v !== "boolean") fail("true or false");
        values[name] = v as boolean;
        break;
      case "enum": {
        const s = typeof v === "number" ? String(v) : v;
        if (typeof s !== "string" || !spec.values.includes(s)) fail(`null or one of ${spec.values.join("|")}`);
        values[name] = s as string;
        break;
      }
      case "date":
        if (typeof v !== "string" || !isIsoDate(v)) fail("null or an ISO date (YYYY-MM-DD)");
        values[name] = v as string;
        break;
      case "enum_array":
        fail("an array");
        break;
      default:
        values[name] = v as Value;
    }
    provided.add(name);
  }
  return { values, provided };
}

// ---------------------------------------------------------------------------------------------------------------------
// DSL

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);

/** Evaluates conditions over profile and derived fields (memoised per instance; a cycle among derived fields is an error). */
export class Evaluator {
  private readonly memo = new Map<string, Value>();
  private readonly stack: string[] = [];
  constructor(
    private readonly data: Pick<ObligationsData, "derived" | "profile_fields">,
    readonly values: Record<string, Value>,
    private readonly computed: (name: string, ev: Evaluator) => boolean = () => {
      throw new Error("computed rules are not available here");
    },
  ) {}

  field(name: string): Value {
    if (Object.prototype.hasOwnProperty.call(this.data.derived, name)) {
      const hit = this.memo.get(name);
      if (hit !== undefined) return hit;
      if (this.stack.includes(name)) throw new Error(`cycle among derived fields: ${[...this.stack.slice(this.stack.indexOf(name)), name].join(" -> ")}`);
      this.stack.push(name);
      try {
        const rule = this.data.derived[name] as Condition;
        const v = "computed" in rule ? this.computed(name, this) : this.test(rule);
        this.memo.set(name, v);
        return v;
      } finally {
        this.stack.pop();
      }
    }
    if (Object.prototype.hasOwnProperty.call(this.data.profile_fields, name)) return this.values[name] ?? null;
    throw new Error(`unknown field ${JSON.stringify(name)} in a condition (neither a profile field nor a derived field)`);
  }

  test(cond: Condition): boolean {
    if (!isRecord(cond)) throw new Error(`invalid condition ${JSON.stringify(cond)}`);
    if ("all" in cond) return (cond["all"] as Condition[]).every((c) => this.test(c));
    if ("any" in cond) return (cond["any"] as Condition[]).some((c) => this.test(c));
    if ("not" in cond) return !this.test(cond["not"] as Condition);
    if ("field" in cond) {
      const v = this.field(cond["field"] as string);
      if ("eq" in cond) return sameValue(v, cond["eq"]);
      if ("in" in cond) {
        if (!Array.isArray(cond["in"])) throw new Error(`"in" needs an array in ${JSON.stringify(cond)}`);
        return cond["in"].some((x) => sameValue(v, x));
      }
    }
    if ("computed" in cond) throw new Error(`computed rules are only allowed as the definition of a derived field: ${JSON.stringify(cond)}`);
    throw new Error(`unsupported condition ${JSON.stringify(cond)}`);
  }
}

function sameValue(a: Value, b: unknown): boolean {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

/** Fields a derived field (or a condition) reads, following derived fields recursively: profile fields (`leaves`) and derived fields (`derived`). */
function fieldsRead(data: Pick<ObligationsData, "derived" | "profile_fields">, root: Condition | string): { leaves: Set<string>; derived: Set<string> } {
  const leaves = new Set<string>();
  const derived = new Set<string>();
  const visitField = (name: string): void => {
    if (Object.prototype.hasOwnProperty.call(data.derived, name)) {
      if (derived.has(name)) return;
      derived.add(name);
      const rule = data.derived[name] as Condition;
      if ("computed" in rule) {
        if (name === COMPUTED_PLACED_BEFORE) for (const f of PLACED_BEFORE_DEPENDS_ON) visitField(f);
        return;
      }
      visitCond(rule);
    } else leaves.add(name);
  };
  const visitCond = (c: Condition): void => {
    if ("all" in c) (c["all"] as Condition[]).forEach(visitCond);
    else if ("any" in c) (c["any"] as Condition[]).forEach(visitCond);
    else if ("not" in c) visitCond(c["not"] as Condition);
    else if ("field" in c) visitField(c["field"] as string);
  };
  if (typeof root === "string") visitField(root);
  else visitCond(root);
  return { leaves, derived };
}

// ---------------------------------------------------------------------------------------------------------------------
// dates

const ruleOf = (block: DeadlineBlock, id: string): DeadlineRule => {
  const r = id === DEFAULT_RULE ? block.default : block.rules.find((x) => x.id === id);
  if (!r) throw new Error(`deadline rule ${JSON.stringify(id)} not found in data/deadlines.json`);
  return r;
};

const maxDate = (a: string, b: string): string => (a >= b ? a : b);
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

interface EntryDate {
  applies_from: string | null;
  applies_from_literal?: string;
  route_dates?: string[];
  deadline_caveat?: string;
}

function entryDate(e: ObligationEntry, ev: Evaluator, block: DeadlineBlock, idx: CorpusIndex): EntryDate {
  const t = e.timing;
  const caveat = t.deadline_caveat !== undefined ? { deadline_caveat: t.deadline_caveat } : {};
  if (t.basis === "transition") return { applies_from: t.date ?? null };
  if (t.basis === "hr_route") {
    const literal = ruleOf(block, t.literal_rule ?? DEFAULT_RULE).applies_from;
    const routes: string[] = [];
    if (ev.field("high_risk_annex_iii") === true) routes.push(ruleOf(block, ROUTE_RULE_ANNEX_III).applies_from);
    if (ev.field("high_risk_annex_i") === true) routes.push(ruleOf(block, ROUTE_RULE_ANNEX_I).applies_from);
    if (routes.length === 0) return { applies_from: literal, ...caveat };
    routes.sort();
    const from = routes[0] as string;
    return {
      applies_from: from,
      ...(literal !== from && t.literal_rule !== SIMPLIFIED_ROUTE_RULE ? { applies_from_literal: literal } : {}),
      ...(routes.length > 1 ? { route_dates: routes } : {}),
      ...caveat,
    };
  }
  if (t.basis === "deadline_table") {
    const literal = t.literal_rule !== undefined ? ruleOf(block, t.literal_rule).applies_from : undefined;
    let date: string;
    if (t.rule !== undefined) date = ruleOf(block, t.rule).applies_from;
    else if (literal !== undefined) date = literal;
    else date = (matchRule(block, ancestorChain(idx, e.anchor_node).map((n) => n.id)) ?? ruleOf(block, DEFAULT_RULE)).applies_from;
    if (t.not_before !== undefined) date = maxDate(date, t.not_before);
    return { applies_from: date, ...(t.rule !== undefined && literal !== undefined && literal !== date ? { applies_from_literal: literal } : {}), ...caveat };
  }
  throw new Error(`unknown timing basis ${JSON.stringify((t as { basis: unknown }).basis)} in ${e.id}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// quotations

const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

function quoteVerified(idx: CorpusIndex, anchor: string, quote: string): boolean {
  const node = idx.byId.get(anchor);
  if (!node) return false;
  const text = [node, ...descendants(idx, anchor)].map((n) => norm(n.text)).join(" ");
  return text.includes(norm(quote));
}

// ---------------------------------------------------------------------------------------------------------------------

function candidates(description: string): Value[] {
  const spec = fieldSpec(description);
  if (spec.type === "boolean") return [true, false];
  if (spec.type === "enum") return spec.values;
  if (spec.type === "date") return ["1900-01-01"]; // a probe date: only "earlier than any route date" is of interest
  return [];
}

export function aiactObligationsWith(input: ObligationsInput, load: CorpusLoader, deadlines: DeadlineTable, data: ObligationsData): ObligationsResult {
  if (data.schema !== "obligations-v1") throw new Error(`unsupported obligations data schema ${JSON.stringify(data.schema)}`);
  const asOf = input.as_of;
  if (typeof asOf !== "string" || !isIsoDate(asOf)) throw new Error(`as_of must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(asOf)}`);
  if (asOf < CONSOLIDATED_FROM) throw new Error(BEFORE_CONSOLIDATED_MESSAGE);
  const lang = input.lang ?? "en";
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const version = versionForDate(asOf);
  if (version !== data.source_version) throw new Error(`obligations data is for ${data.source_version}, but ${asOf} is covered by ${version}`);
  const block = deadlines.versions[version];
  if (!block) throw new Error(`no deadline table for version ${version}`);
  const block2024 = deadlines.versions[V2024];

  const profile = normalizeProfile(data, input.profile);
  const idx = load(version, "en");
  const idx2024 = load(V2024, "en");

  const computed = (name: string, ev: Evaluator): boolean => {
    if (name !== COMPUTED_PLACED_BEFORE) throw new Error(`no implementation for computed rule ${name}`);
    const placed = ev.field("placed_on_market_before");
    if (typeof placed !== "string") return false;
    const dates: string[] = [];
    if (ev.field("high_risk_annex_iii") === true) dates.push(ruleOf(block, ROUTE_RULE_ANNEX_III).applies_from);
    if (ev.field("high_risk_annex_i") === true) dates.push(ruleOf(block, ROUTE_RULE_ANNEX_I).applies_from);
    if (dates.length === 0) return false;
    return placed < (dates.sort()[0] as string);
  };
  const evaluator = (values: Record<string, Value>): Evaluator => new Evaluator(data, values, computed);
  const ev = evaluator(profile.values);

  const derivedTrue = Object.keys(data.derived)
    .filter((k) => ev.field(k) === true)
    .sort();

  const roles = profile.values["role"] as string[];
  const applicable = data.obligations.filter((e) => (e.roles.includes("any") || e.roles.some((r) => roles.includes(r))) && ev.test(e.applies_if));

  const rank: Record<Status, number> = { applicable: 0, upcoming: 1, depends: 2 };
  const obligations: Obligation[] = applicable.map((e) => {
    const d = entryDate(e, ev, block, idx);
    const from = d.applies_from;
    const status: Status = from === null ? "depends" : from <= asOf ? "applicable" : "upcoming";
    const node = idx.byId.get(e.anchor_node);
    // hr_route: the route decides the date (route_dates covers mixed cases), later dates of the anchor's rule would only repeat it
    const conditional = node && e.timing.basis !== "hr_route" ? resolveDeadline(version, node, idx.byId, asOf, deadlines).conditional_dates : undefined;

    let changed = e.omnibus_note !== undefined || e.new_in_2026 === true;
    if (!changed && from !== null && e.timing.basis !== "transition" && block2024) {
      const anchor2024 = idx2024.byId.get(e.anchor_node_2024 ?? e.anchor_node);
      if (anchor2024) {
        const rule2024 = matchRule(block2024, ancestorChain(idx2024, anchor2024.id).map((n) => n.id));
        changed = rule2024 !== undefined && rule2024.applies_from !== from;
      }
    }
    return {
      id: e.id,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      roles: e.roles,
      provisions: e.provisions.map((p) => ({ id: p, citation: formatRef(p, lang) })),
      anchor_node: e.anchor_node,
      quote: e.quote,
      quote_verified: quoteVerified(idx, e.anchor_node, e.quote),
      applies_from: from,
      ...(d.applies_from_literal !== undefined ? { applies_from_literal: d.applies_from_literal } : {}),
      ...(d.route_dates !== undefined ? { route_dates: d.route_dates } : {}),
      ...(d.deadline_caveat !== undefined ? { deadline_caveat: d.deadline_caveat } : {}),
      status,
      days_until: from === null ? null : Math.max(0, daysBetween(asOf, from)),
      ...(conditional !== undefined ? { conditional_dates: conditional } : {}),
      ...(e.legal_assessment_needed !== undefined ? { legal_assessment_needed: e.legal_assessment_needed } : {}),
      ...(e.omnibus_note !== undefined ? { omnibus_note: e.omnibus_note } : {}),
      changed_by_omnibus: changed,
    };
  });
  obligations.sort((a, b) => {
    const r = rank[a.status] - rank[b.status];
    if (r !== 0) return r;
    if (a.applies_from !== b.applies_from) {
      if (a.applies_from === null) return 1;
      if (b.applies_from === null) return -1;
      return a.applies_from < b.applies_from ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const byDate = new Map<string, string[]>();
  for (const o of obligations) {
    if (o.applies_from === null || o.applies_from < asOf) continue;
    byDate.set(o.applies_from, [...(byDate.get(o.applies_from) ?? []), o.id]);
  }
  const timeline = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, ids]) => ({ date, ids }));

  const open_questions: Array<{ id: string; question: string }> = [];
  for (const o of obligations) if (o.legal_assessment_needed !== undefined) open_questions.push({ id: o.id, question: o.legal_assessment_needed });
  // Classification questions: the rule reads profile fields that are partly answered and partly open, and an answer to an open one would change the result.
  // Only for derived fields that an entry for one of the profile's roles reads (a provider is not asked about the deployer's FRIA scope).
  const readByRole = new Set<string>();
  for (const e of data.obligations) if (e.roles.includes("any") || e.roles.some((r) => roles.includes(r))) for (const f of fieldsRead(data, e.applies_if).derived) readByRole.add(f);
  for (const c of data.classification) {
    if (c.legal_assessment_needed === undefined || c.derives === undefined || !readByRole.has(c.derives)) continue;
    const leaves = [...fieldsRead(data, c.derives).leaves].filter((f) => f !== "role");
    const open = leaves.filter((f) => !profile.provided.has(f));
    if (open.length === 0 || open.length === leaves.length) continue;
    const current = ev.field(c.derives);
    const deciding = open.filter((f) =>
      candidates(data.profile_fields[f] as string).some((v) => evaluator({ ...profile.values, [f]: v }).field(c.derives as string) !== current),
    );
    if (deciding.length > 0) open_questions.push({ id: c.id, question: `${c.legal_assessment_needed} (not set in the profile: ${deciding.join(", ")})` });
  }

  return {
    as_of: asOf,
    version,
    profile_echo: profile.values,
    derived: derivedTrue,
    obligations,
    timeline,
    open_questions,
    notice: NOTICE,
  };
}
