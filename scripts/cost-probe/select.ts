/** Pure helpers of the cost probe: candidate filtering, model selection and cost projection (no I/O, unit-tested). */

export const PROVIDERS = ["anthropic", "openai", "google"] as const;
export type Provider = (typeof PROVIDERS)[number];

export interface RawModel {
  id: string;
  created?: number;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  architecture?: { input_modalities?: string[]; output_modalities?: string[]; modality?: string };
}

export interface Candidate {
  id: string;
  provider: Provider;
  created: number;
  created_date: string;
  prompt_usd_per_mtok: number;
  completion_usd_per_mtok: number;
  context_length: number;
}

const providerOf = (id: string): Provider | undefined => PROVIDERS.find((p) => id.startsWith(`${p}/`));

/** Text in, text out only, with tool support; no `:free` and no other `:` variants (thinking, online, exacto, ...). */
export function toCandidates(models: RawModel[]): Candidate[] {
  const out: Candidate[] = [];
  for (const m of models) {
    const provider = providerOf(m.id);
    if (!provider || m.id.includes(":")) continue;
    if (!(m.supported_parameters ?? []).includes("tools")) continue;
    const outputs = m.architecture?.output_modalities ?? ["text"];
    const inputs = m.architecture?.input_modalities ?? ["text"];
    if (!outputs.includes("text") || outputs.some((o) => o !== "text") || !inputs.includes("text")) continue;
    const prompt = Number(m.pricing?.prompt);
    const completion = Number(m.pricing?.completion);
    if (!Number.isFinite(prompt) || !Number.isFinite(completion) || prompt < 0 || completion < 0) continue;
    const created = m.created ?? 0;
    out.push({
      id: m.id,
      provider,
      created,
      created_date: new Date(created * 1000).toISOString().slice(0, 10),
      prompt_usd_per_mtok: prompt * 1e6,
      completion_usd_per_mtok: completion * 1e6,
      context_length: m.context_length ?? 0,
    });
  }
  return out.sort((a, b) => a.provider.localeCompare(b.provider) || b.created - a.created || a.id.localeCompare(b.id));
}

const TIER_WINDOW_S = 3 * 86400;

/**
 * Newest matching model. With `tier`, the newest generation is released as several tiers on the same day (e.g. luna, sol,
 * terra); among the matches created within 3 days of the newest one, the most expensive (completion, then prompt price) wins.
 */
const newest = (c: Candidate[], re: RegExp, not?: RegExp, tier = false): Candidate | undefined => {
  const hits = c.filter((x) => re.test(x.id) && !(not && not.test(x.id))).sort((a, b) => b.created - a.created);
  const top = hits[0];
  if (!top || !tier) return top;
  return hits.filter((x) => top.created - x.created <= TIER_WINDOW_S).sort((a, b) => b.completion_usd_per_mtok - a.completion_usd_per_mtok || b.prompt_usd_per_mtok - a.prompt_usd_per_mtok)[0];
};

export interface Selection {
  flagship: Record<Provider, Candidate | undefined>;
  cheaper: Record<Provider, Candidate | undefined>;
}

/** Flagship: newest claude-opus-*, newest gpt-5* without -mini/-nano/-pro/-codex (most expensive tier of the newest generation), newest gemini-*-pro* without the customtools variant. Cheaper: newest claude-sonnet-*, gpt-5-mini*, gemini-*-flash*. */
export function selectModels(c: Candidate[]): Selection {
  const by = (p: Provider): Candidate[] => c.filter((x) => x.provider === p);
  return {
    flagship: {
      anthropic: newest(by("anthropic"), /^anthropic\/claude-opus-/),
      openai: newest(by("openai"), /^openai\/gpt-5/, /-(mini|nano|pro|codex)(-|$)/, true),
      google: newest(by("google"), /^google\/gemini-.*-pro/, /customtools/),
    },
    cheaper: {
      anthropic: newest(by("anthropic"), /^anthropic\/claude-sonnet-/),
      openai: newest(by("openai"), /^openai\/gpt-5-mini/),
      google: newest(by("google"), /^google\/gemini-.*-flash/),
    },
  };
}

export type Arm = "plain" | "web" | "tools";
export const ARMS: Arm[] = ["plain", "web", "tools"];

export interface CallRecord {
  question: number;
  model: string;
  arm: Arm;
  status: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

export interface CellStats {
  n: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  /** Mean cost not explained by the token prices (web search fees); 0 for plain and tools. */
  extra: number;
}

export const price = (c: Candidate, prompt: number, completion: number): number => (prompt * c.prompt_usd_per_mtok + completion * c.completion_usd_per_mtok) / 1e6;

/** Mean tokens and cost over the successful calls (status < 400) of one model and arm; undefined when there are none. */
export function cellStats(calls: CallRecord[], model: Candidate, arm: Arm): CellStats | undefined {
  const ok = calls.filter((x) => x.model === model.id && x.arm === arm && x.status < 400);
  if (ok.length === 0) return undefined;
  const mean = (f: (x: CallRecord) => number): number => ok.reduce((s, x) => s + f(x), 0) / ok.length;
  const prompt_tokens = mean((x) => x.prompt_tokens);
  const completion_tokens = mean((x) => x.completion_tokens);
  const cost = mean((x) => x.cost);
  return { n: ok.length, prompt_tokens, completion_tokens, cost, extra: Math.max(0, cost - price(model, prompt_tokens, completion_tokens)) };
}

/** Cost of `cases` runs on `priced`, using the token counts measured on `measured` (extra fees carried over). */
export function projectCost(stats: CellStats | undefined, priced: Candidate, cases: number): number | undefined {
  if (!stats) return undefined;
  return cases * (price(priced, stats.prompt_tokens, stats.completion_tokens) + stats.extra);
}
