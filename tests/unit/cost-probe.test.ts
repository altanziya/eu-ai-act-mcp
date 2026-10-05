import { describe, expect, it } from "vitest";
import { cellStats, projectCost, selectModels, toCandidates } from "../../scripts/cost-probe/select.js";
import type { CallRecord, RawModel } from "../../scripts/cost-probe/select.js";

const model = (id: string, created: number, prompt: number, completion: number, extra: Partial<RawModel> = {}): RawModel => ({
  id,
  created,
  context_length: 1000,
  pricing: { prompt: String(prompt / 1e6), completion: String(completion / 1e6) },
  supported_parameters: ["tools", "max_tokens"],
  architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  ...extra,
});

const DAY = 86400;
const raw: RawModel[] = [
  model("anthropic/claude-opus-4", 100 * DAY, 15, 75),
  model("anthropic/claude-opus-5", 200 * DAY, 5, 25),
  model("anthropic/claude-opus-5:thinking", 300 * DAY, 5, 25),
  model("anthropic/claude-sonnet-5", 210 * DAY, 2, 10),
  model("openai/gpt-5.6-luna", 200 * DAY, 0.2, 1.2),
  model("openai/gpt-5.6-terra", 200 * DAY, 2, 12),
  model("openai/gpt-5.6-terra-pro", 200 * DAY, 2, 12),
  model("openai/gpt-5.5", 150 * DAY, 5, 30),
  model("openai/gpt-5-mini", 50 * DAY, 0.25, 2),
  model("openai/gpt-5-image", 400 * DAY, 10, 10, { architecture: { input_modalities: ["text"], output_modalities: ["image", "text"] } }),
  model("openai/gpt-oss:free", 500 * DAY, 0, 0),
  model("google/gemini-3.1-pro-preview", 100 * DAY, 2, 12),
  model("google/gemini-3.1-pro-preview-customtools", 106 * DAY, 2, 12),
  model("google/gemini-3.8-flash", 300 * DAY, 0.3, 2.5),
  model("google/gemini-no-tools-pro", 400 * DAY, 1, 1, { supported_parameters: ["max_tokens"] }),
  model("mistralai/mistral-large", 400 * DAY, 1, 1),
];

describe("cost probe model selection", () => {
  const c = toCandidates(raw);
  const sel = selectModels(c);

  it("keeps only text-only models with tool support from the three providers, without ':' variants", () => {
    const ids = c.map((x) => x.id);
    expect(ids).not.toContain("openai/gpt-oss:free");
    expect(ids).not.toContain("anthropic/claude-opus-5:thinking");
    expect(ids).not.toContain("openai/gpt-5-image");
    expect(ids).not.toContain("google/gemini-no-tools-pro");
    expect(ids).not.toContain("mistralai/mistral-large");
  });

  it("converts per-token prices to USD per 1M tokens and sorts newest first within a provider", () => {
    const opus = c.filter((x) => x.provider === "anthropic");
    expect(opus[0]?.id).toBe("anthropic/claude-sonnet-5");
    expect(opus.find((x) => x.id === "anthropic/claude-opus-5")?.completion_usd_per_mtok).toBeCloseTo(25, 6);
  });

  it("selects the flagship per rule", () => {
    expect(sel.flagship.anthropic?.id).toBe("anthropic/claude-opus-5");
    expect(sel.flagship.openai?.id).toBe("openai/gpt-5.6-terra"); // most expensive tier of the newest generation, not -pro
    expect(sel.flagship.google?.id).toBe("google/gemini-3.1-pro-preview");
  });

  it("selects the cheaper models per rule", () => {
    expect(sel.cheaper.anthropic?.id).toBe("anthropic/claude-sonnet-5");
    expect(sel.cheaper.openai?.id).toBe("openai/gpt-5-mini");
    expect(sel.cheaper.google?.id).toBe("google/gemini-3.8-flash");
  });
});

describe("cost probe projection", () => {
  const [opus, mini] = [toCandidates(raw).find((x) => x.id === "anthropic/claude-opus-5"), toCandidates(raw).find((x) => x.id === "openai/gpt-5-mini")];
  const call = (cost: number, p: number, o: number, status = 200): CallRecord => ({ question: 0, model: "anthropic/claude-opus-5", arm: "web", status, prompt_tokens: p, completion_tokens: o, cost });

  it("averages successful calls only and isolates the fee not explained by token prices", () => {
    if (!opus) throw new Error("fixture");
    // 1000 prompt + 100 completion tokens cost 0.005 + 0.0025 = 0.0075; the rest is a search fee of 0.02
    const s = cellStats([call(0.0275, 1000, 100), call(0.0275, 1000, 100), call(0, 0, 0, 429)], opus, "web");
    expect(s?.n).toBe(2);
    expect(s?.extra).toBeCloseTo(0.02, 9);
  });

  it("projects the cost of N cases with another model's prices and carries the fee over", () => {
    if (!opus || !mini) throw new Error("fixture");
    const s = cellStats([call(0.0275, 1000, 100)], opus, "web");
    // gpt-5-mini: 1000 * 0.25/1M + 100 * 2/1M = 0.00045, plus 0.02 fee, times 10 cases
    expect(projectCost(s, mini, 10)).toBeCloseTo(10 * (0.00045 + 0.02), 9);
    expect(projectCost(undefined, mini, 10)).toBeUndefined();
  });
});
