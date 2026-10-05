/**
 * Form model of the obligations navigator (isomorphic, no DOM): which questions exist, in which sections, when a
 * question is shown, how the answers become the profile of `aiactObligationsWith`, and the example profiles.
 * A question that is not shown is never part of the profile; an unanswered question is left out as well (the core then
 * reports it as an open question when the answer would change the result).
 */
import { isIsoDate } from "../tools/corpus.js";
import type { FieldDescription } from "../tools/obligationsCore.js";
import type { Pair } from "./i18n.js";

export type FormState = Record<string, unknown>;

const roles = (s: FormState): string[] => (Array.isArray(s["role"]) ? (s["role"] as string[]) : []);
const hasRole = (s: FormState, ...r: string[]): boolean => roles(s).some((x) => r.includes(x));
const isSet = (s: FormState, f: string): boolean => typeof s[f] === "string" && s[f] !== "";

export interface Section {
  id: string;
  title: Pair;
  intro?: Pair;
  fields: string[];
  /** The section is shown when this holds (default: always). */
  show?: (s: FormState) => boolean;
}

export const SECTIONS: readonly Section[] = [
  {
    id: "org",
    title: { en: "About your organisation", de: "Über Ihre Organisation" },
    fields: ["role", "uses_or_provides_ai_system", "enterprise_size", "financial_institution", "provider_in_third_country", "placed_on_market_before", "significant_design_change_since_application", "hrai_intended_for_public_authorities"],
  },
  {
    id: "risk",
    title: { en: "Is the system high-risk?", de: "Ist das System hochriskant?" },
    intro: { en: "High-risk systems carry the most obligations. Two routes lead there: the areas of Annex III and products under Annex I.", de: "Hochrisiko-Systeme haben die meisten Pflichten. Zwei Wege führen dorthin: die Bereiche des Anhangs III und Produkte nach Anhang I." },
    fields: ["annex_iii_area", "annex_iii_art6_3_exception_concluded", "annex_iii_performs_profiling", "annex_iii_point5_bc", "annex_i_section", "annex_i_third_party_conformity_assessment", "annex_x_large_scale_it"],
  },
  {
    id: "gpai",
    title: { en: "General-purpose AI model", de: "KI-Modell mit allgemeinem Verwendungszweck" },
    fields: ["gpai_model", "gpai_systemic_risk_threshold_met", "gpai_commission_designated", "open_source_model"],
    show: (s) => hasRole(s, "provider"),
  },
  {
    id: "transparency",
    title: { en: "Transparency towards people", de: "Transparenz gegenüber Menschen" },
    fields: ["art50_interacts_with_persons", "art50_generates_synthetic_content", "art50_emotion_or_biometric_categorisation", "art50_deep_fake", "art50_public_interest_text"],
    show: (s) => hasRole(s, "provider", "deployer"),
  },
  {
    id: "practices",
    title: { en: "Prohibited practices and sensitive data", de: "Verbotene Praktiken und sensible Daten" },
    fields: ["art5_ba_bb_generation_capability", "processes_special_category_data_for_bias"],
    show: (s) => hasRole(s, "provider", "deployer"),
  },
  {
    id: "deployer",
    title: { en: "Your use of the system (deployer)", de: "Ihre Nutzung des Systems (Betreiber)" },
    fields: [
      "deployer_law_enforcement_realtime_rbi",
      "deployer_post_remote_biometric_law_enforcement",
      "deployer_controls_input_data",
      "deployer_is_employer_workplace_use",
      "deployer_public_authority_or_union_body",
      "deployer_public_body_or_public_service",
      "deployer_processes_personal_data",
      "deployer_decisions_about_natural_persons",
    ],
    show: (s) => hasRole(s, "deployer"),
  },
  {
    id: "rolechange",
    title: { en: "Changing a system that someone else provides", de: "Veränderung eines Systems, das ein anderer anbietet" },
    fields: ["rebrands_high_risk_system", "substantially_modifies_high_risk_system", "changes_intended_purpose_to_high_risk"],
    show: (s) => hasRole(s, "deployer", "importer", "distributor"),
  },
];

/** Extra conditions per question (on top of the section condition); a question without an entry is always shown. */
const FIELD_SHOW: Record<string, (s: FormState) => boolean> = {
  financial_institution: (s) => hasRole(s, "provider", "deployer"),
  provider_in_third_country: (s) => hasRole(s, "provider"),
  significant_design_change_since_application: (s) => isSet(s, "placed_on_market_before"),
  hrai_intended_for_public_authorities: (s) => isSet(s, "placed_on_market_before"),
  // Article 6(3) only for an Annex III area; profiling only when the exception is claimed; Annex III point 5 only for area 5
  annex_iii_art6_3_exception_concluded: (s) => isSet(s, "annex_iii_area"),
  annex_iii_performs_profiling: (s) => isSet(s, "annex_iii_area") && s["annex_iii_art6_3_exception_concluded"] === true,
  annex_iii_point5_bc: (s) => s["annex_iii_area"] === "5",
  annex_i_third_party_conformity_assessment: (s) => s["annex_i_section"] === "A",
  annex_x_large_scale_it: (s) => isSet(s, "annex_iii_area") || isSet(s, "annex_i_section"),
  // GPAI follow-up questions only for a general-purpose model
  gpai_systemic_risk_threshold_met: (s) => s["gpai_model"] === true,
  gpai_commission_designated: (s) => s["gpai_model"] === true,
  open_source_model: (s) => s["gpai_model"] === true,
  art50_interacts_with_persons: (s) => hasRole(s, "provider"),
  art50_generates_synthetic_content: (s) => hasRole(s, "provider"),
  art50_emotion_or_biometric_categorisation: (s) => hasRole(s, "deployer"),
  art50_deep_fake: (s) => hasRole(s, "deployer"),
  art50_public_interest_text: (s) => hasRole(s, "deployer"),
};

export function isFieldShown(field: string, s: FormState): boolean {
  const section = SECTIONS.find((x) => x.fields.includes(field));
  if (!section) return false;
  if (section.show && !section.show(s)) return false;
  return FIELD_SHOW[field]?.(s) ?? true;
}

/** Fields of the profile description that no section shows (a unit test keeps this empty). */
export const unplacedFields = (fields: Record<string, FieldDescription>): string[] => Object.keys(fields).filter((f) => !SECTIONS.some((s) => s.fields.includes(f)));

/** The profile for the obligations core: only questions that are shown and answered. */
export function buildProfile(s: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of SECTIONS) {
    for (const f of section.fields) {
      const v = s[f];
      if (v === undefined || v === null || v === "") continue;
      if (f === "role") {
        if (Array.isArray(v) && v.length > 0) out[f] = v;
        continue;
      }
      if (isFieldShown(f, s)) out[f] = v;
    }
  }
  return out;
}

export interface ExampleProfile {
  id: string;
  label: Pair;
  state: FormState;
}

export const EXAMPLE_PROFILES: readonly ExampleProfile[] = [
  {
    id: "hr-vendor",
    label: { en: "HR software vendor (Annex III)", de: "Anbieter von HR-Software (Anhang III)" },
    state: {
      role: ["provider"],
      uses_or_provides_ai_system: true,
      enterprise_size: "sme",
      provider_in_third_country: false,
      annex_iii_area: "4",
      annex_iii_art6_3_exception_concluded: false,
      gpai_model: false,
      art50_interacts_with_persons: false,
      art50_generates_synthetic_content: false,
      art5_ba_bb_generation_capability: false,
      processes_special_category_data_for_bias: false,
    },
  },
  {
    id: "bank",
    label: { en: "Bank using credit scoring (deployer)", de: "Bank mit Kredit-Scoring (Betreiber)" },
    state: {
      role: ["deployer"],
      uses_or_provides_ai_system: true,
      enterprise_size: "other",
      financial_institution: true,
      annex_iii_area: "5",
      annex_iii_point5_bc: true,
      annex_iii_art6_3_exception_concluded: false,
      deployer_law_enforcement_realtime_rbi: false,
      deployer_post_remote_biometric_law_enforcement: false,
      rebrands_high_risk_system: false,
      substantially_modifies_high_risk_system: false,
      changes_intended_purpose_to_high_risk: false,
      art50_emotion_or_biometric_categorisation: false,
      art50_deep_fake: false,
      art50_public_interest_text: false,
      art5_ba_bb_generation_capability: false,
      deployer_controls_input_data: true,
      deployer_is_employer_workplace_use: false,
      deployer_public_authority_or_union_body: false,
      deployer_public_body_or_public_service: false,
      deployer_processes_personal_data: true,
      deployer_decisions_about_natural_persons: true,
      processes_special_category_data_for_bias: false,
    },
  },
  {
    id: "oss-llm",
    label: { en: "Open-source LLM provider", de: "Anbieter eines Open-Source-Sprachmodells" },
    state: {
      role: ["provider"],
      uses_or_provides_ai_system: true,
      enterprise_size: "sme",
      provider_in_third_country: false,
      gpai_model: true,
      gpai_systemic_risk_threshold_met: false,
      gpai_commission_designated: false,
      open_source_model: true,
      art50_interacts_with_persons: false,
      art50_generates_synthetic_content: true,
      art5_ba_bb_generation_capability: false,
      processes_special_category_data_for_bias: false,
    },
  },
  {
    id: "medical-device",
    label: { en: "Medical device manufacturer (Annex I)", de: "Hersteller von Medizinprodukten (Anhang I)" },
    state: {
      role: ["provider", "product_manufacturer"],
      uses_or_provides_ai_system: true,
      enterprise_size: "other",
      provider_in_third_country: false,
      annex_i_section: "A",
      annex_i_third_party_conformity_assessment: true,
      gpai_model: false,
      art50_interacts_with_persons: false,
      art50_generates_synthetic_content: false,
      art5_ba_bb_generation_capability: false,
      processes_special_category_data_for_bias: false,
    },
  },
];

/**
 * Keeps only what the form can show: known questions with a value of the right type (shared links and stored states
 * come from outside). Unknown fields, wrong types and values outside the allowed set are dropped.
 */
export function sanitizeState(raw: FormState, fields: Record<string, FieldDescription>): FormState {
  const out: FormState = {};
  for (const [name, spec] of Object.entries(fields)) {
    const v = raw[name];
    if (v === undefined || v === null) continue;
    if (spec.type === "enum_array") {
      if (Array.isArray(v)) {
        const ok = [...new Set(v.filter((x): x is string => typeof x === "string" && (spec.values ?? []).includes(x)))];
        if (ok.length > 0) out[name] = ok;
      }
    } else if (spec.type === "boolean") {
      if (typeof v === "boolean") out[name] = v;
    } else if (spec.type === "enum") {
      if (typeof v === "string" && (spec.values ?? []).includes(v)) out[name] = v;
    } else if (spec.type === "date") {
      if (typeof v === "string" && isIsoDate(v)) out[name] = v;
    }
  }
  return out;
}
