/**
 * OpenRouter chat client shared by the cost probe and the eval harness: API key lookup, the three project tools as
 * function definitions with a local executor, and one conversation (plain, web search or tool loop) with usage.cost accounting.
 * The key comes from OPENROUTER_API_KEY or the macOS keychain item "openrouter" and is never logged or written.
 */
import { execFileSync } from "node:child_process";
import { diffProvision } from "../tools/diffProvision.js";
import { getProvision } from "../tools/getProvision.js";
import { verifyCitation } from "../tools/verifyCitation.js";

export const API = "https://openrouter.ai/api/v1";
export const REFERER = "https://github.com/altanziya/eu-ai-act-mcp";
export const MAX_TOOL_ROUNDS = 6;
/** Tool calls executed per round; further calls of the same round get an error result. */
export const MAX_TOOL_CALLS_PER_ROUND = 4;
export const TOOL_CALL_LIMIT_ERROR = "tool call limit per round";
export const TOOL_RESULT_CHARS = 6000;

export type Arm = "plain" | "web" | "tools";

export function apiKey(): string {
  const env = process.env["OPENROUTER_API_KEY"]?.trim();
  if (env) return env;
  const key = execFileSync("security", ["find-generic-password", "-s", "openrouter", "-w"], { encoding: "utf8" }).trim();
  if (!key) throw new Error("no OpenRouter API key (OPENROUTER_API_KEY or keychain item openrouter)");
  return key;
}

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "aiact_get_provision",
      description:
        `Returns one provision of Regulation (EU) 2024/1689 by id or citation (e.g. "art_50.par_1" or "Article 50(1)"), with all descendants. ` +
        `as_of: reference date; without version the text in force on that date is returned (before 2026-07-27 the Official Journal version 32024R1689, after it the consolidated version 02024R1689-20260727); default today. ` +
        `version: 32024R1689 (Official Journal) or 02024R1689-20260727 (consolidated after the Omnibus); an explicit version wins over as_of. Recitals exist only in 32024R1689; asking for one in 02024R1689-20260727 returns found=false with a fallback. ` +
        `The result carries applicability: whether the provision applies on as_of (from the deadline table). ` +
        `The response lists neighbouring provisions (including ones inserted by the 2026 amendment, such as paragraph 6a); check them before concluding that the Act says nothing more.`,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Node id (art_50.par_1.a, anx_3.pt_1, rec_12, cpt_3.sct_2) or citation (Article 50(1)(a), Anhang III Nummer 1)" },
          as_of: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Reference date YYYY-MM-DD; default today. Selects the version (before 2026-07-27 the Official Journal version, after it the consolidated version) unless version is given." },
          version: { type: "string", enum: ["32024R1689", "02024R1689-20260727"], description: "Corpus version; default: the version in force on as_of" },
          lang: { type: "string", enum: ["en", "de"], description: "en (default) or de" },
          include_children: { type: "boolean", description: "Include all descendants (default true)" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aiact_diff",
      description: "What happened to a provision between 32024R1689 and 02024R1689-20260727 (Omnibus, amending act 32026R1744): unchanged, changed (with word diff), added, removed, moved.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Node id or citation" },
          lang: { type: "string", enum: ["en", "de"], description: "en (default) or de" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aiact_verify_citation",
      description:
        "Checks that a quotation exists in the AI Act text (V0, with pinpoint), whether it applies on as_of (V1, from a deadline table), and its language (V2). " +
        "It never checks that the text supports a claim (support_checked is always false) and never certifies compliance.",
      parameters: {
        type: "object",
        properties: {
          quote: { type: "string", minLength: 1, description: "The quoted wording (at least 6 words; [...] marks omissions)" },
          claimed_ref: { type: "string", description: "Where the quote is claimed to be, e.g. Article 50(1) or art_50.par_1" },
          as_of: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Reference date YYYY-MM-DD; default today. Before 2026-07-27 the Official Journal version is checked, after it the consolidated version." },
          lang: { type: "string", enum: ["en", "de"], description: "Language of the quote; en (default) or de" },
        },
        required: ["quote"],
      },
    },
  },
] as const;

/** Runs one tool call locally; errors and unknown tools become `{error}` results. `asOf` is the default reference date of get_provision and verify_citation. */
export function runTool(name: string, rawArgs: string, asOf: string, maxChars = TOOL_RESULT_CHARS): string {
  let out: unknown;
  try {
    const args = JSON.parse(rawArgs === "" ? "{}" : rawArgs) as Record<string, unknown>;
    if (name === "aiact_get_provision") out = getProvision({ ...(args as unknown as Parameters<typeof getProvision>[0]), as_of: (args["as_of"] as string | undefined) ?? asOf });
    else if (name === "aiact_diff") out = diffProvision(args as unknown as Parameters<typeof diffProvision>[0]);
    else if (name === "aiact_verify_citation") out = verifyCitation({ ...(args as unknown as Parameters<typeof verifyCitation>[0]), as_of: (args["as_of"] as string | undefined) ?? asOf });
    else out = { error: `unknown tool ${name}` };
  } catch (e) {
    out = { error: e instanceof Error ? e.message : String(e) };
  }
  const text = JSON.stringify(out);
  return text.length > maxChars ? `${text.slice(0, maxChars)}...[truncated]` : text;
}

export interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  annotations?: unknown[];
}
export interface ChatResponse {
  model?: string;
  choices?: Array<{ finish_reason?: string; message?: ChatMessage }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  error?: { message?: string };
}

export interface ChatParams {
  maxTokens: number;
  /** Sent as `temperature` when set. */
  temperature?: number;
  /** Sent as `reasoning: { effort }` when set. */
  reasoningEffort?: "low" | "medium" | "high";
  /** X-Title header. */
  title: string;
}

/** One request; `usage.include` is always set so that `usage.cost` is returned. Never throws on HTTP errors (status in the result). */
export async function chat(key: string, body: Record<string, unknown>, p: ChatParams): Promise<{ status: number; json: ChatResponse }> {
  const res = await fetch(`${API}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": REFERER, "X-Title": p.title },
    body: JSON.stringify({
      ...body,
      usage: { include: true },
      max_tokens: p.maxTokens,
      ...(p.temperature !== undefined ? { temperature: p.temperature } : {}),
      ...(p.reasoningEffort ? { reasoning: { effort: p.reasoningEffort } } : {}),
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const text = await res.text();
  let json: ChatResponse;
  try {
    json = JSON.parse(text) as ChatResponse;
  } catch {
    json = { error: { message: text.slice(0, 300) } };
  }
  return { status: res.status, json };
}

export interface ToolCallRecord {
  name: string;
  arguments: string;
  /** Not executed: over MAX_TOOL_CALLS_PER_ROUND. */
  rejected?: true;
}

export interface ConversationOptions extends ChatParams {
  key: string;
  model: string;
  arm: Arm;
  system: string;
  user: string;
  /** Default `as_of` of the verify tool. */
  asOf: string;
  /** Called before every request (0-based); returning false stops the conversation (result.stopped). */
  beforeRequest?: (requestNo: number) => boolean;
  /** Called with the cost booked for every request (usage.cost, or the estimate when it is missing). */
  onCost?: (cost: number) => void;
  /**
   * Cost booked for a request whose usage.cost is missing, or that failed (exception, timeout) after it was sent: the cap
   * stays hard when the provider reports nothing. The harness passes its per-request estimate (already times 1.5). Default 0.
   */
  fallbackRequestCost?: number;
}

export interface ConversationResult {
  text: string;
  status: number;
  requests: number;
  tool_rounds: number;
  tool_calls: ToolCallRecord[];
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  /** At least one request was booked with the estimate instead of usage.cost. */
  cost_estimated: boolean;
  model_reported: string | null;
  finish_reason: string | null;
  web_citations: number;
  error?: string;
  /** beforeRequest returned false. */
  stopped: boolean;
  latency_ms: number;
}

/**
 * Runs one conversation. Arm `web` adds the OpenRouter web plugin; arm `tools` offers the three project tools for up to
 * MAX_TOOL_ROUNDS rounds, after which the model must answer (tool_choice none). Transport errors end up in `error`.
 */
export async function converse(o: ConversationOptions): Promise<ConversationResult> {
  const messages: ChatMessage[] = [{ role: "system", content: o.system }, { role: "user", content: o.user }];
  const base: Record<string, unknown> = { model: o.model };
  if (o.arm === "web") base["plugins"] = [{ id: "web" }];
  if (o.arm === "tools") base["tools"] = TOOL_DEFS;
  const r: ConversationResult = {
    text: "", status: 0, requests: 0, tool_rounds: 0, tool_calls: [], prompt_tokens: 0, completion_tokens: 0, cost: 0, cost_estimated: false,
    model_reported: null, finish_reason: null, web_citations: 0, stopped: false, latency_ms: 0,
  };
  const bookEstimate = (): void => {
    const c = o.fallbackRequestCost ?? 0;
    r.cost += c;
    r.cost_estimated = true;
    o.onCost?.(c);
  };
  const t0 = Date.now();
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const withTools = o.arm === "tools" && round < MAX_TOOL_ROUNDS; // after the last round the model must answer without tools
      if (o.beforeRequest && !o.beforeRequest(r.requests)) {
        r.stopped = true;
        break;
      }
      const body = { ...base, messages, ...(o.arm === "tools" && !withTools ? { tool_choice: "none" } : {}) };
      let res: { status: number; json: ChatResponse };
      try {
        res = await chat(o.key, body, o);
      } catch (e) {
        r.requests++; // sent, but no answer (timeout, connection lost): the provider may have billed it
        bookEstimate();
        throw e;
      }
      const { status, json } = res;
      r.requests++;
      r.status = status;
      r.prompt_tokens += json.usage?.prompt_tokens ?? 0;
      r.completion_tokens += json.usage?.completion_tokens ?? 0;
      const reported = json.usage?.cost;
      if (typeof reported === "number") {
        r.cost += reported;
        o.onCost?.(reported);
      } else if (status < 400 || status >= 500) bookEstimate(); // a 4xx was rejected before processing and is not billed
      r.model_reported = json.model ?? r.model_reported;
      if (status >= 400) {
        r.error = (json.error?.message ?? "error").slice(0, 300);
        break;
      }
      const choice = json.choices?.[0];
      const msg = choice?.message;
      r.finish_reason = choice?.finish_reason ?? null;
      r.web_citations = msg?.annotations?.length ?? r.web_citations;
      const calls = msg?.tool_calls ?? [];
      if (o.arm === "tools" && calls.length > 0 && round < MAX_TOOL_ROUNDS) {
        r.tool_rounds++;
        messages.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls });
        calls.forEach((c, i) => {
          const over = i >= MAX_TOOL_CALLS_PER_ROUND;
          r.tool_calls.push({ name: c.function.name, arguments: c.function.arguments.slice(0, 300), ...(over ? { rejected: true as const } : {}) });
          messages.push({ role: "tool", tool_call_id: c.id, content: over ? JSON.stringify({ error: TOOL_CALL_LIMIT_ERROR }) : runTool(c.function.name, c.function.arguments, o.asOf) });
        });
        continue;
      }
      r.text = msg?.content ?? "";
      break;
    }
  } catch (e) {
    r.error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    r.status = r.status || -1;
  } finally {
    r.latency_ms = Date.now() - t0;
  }
  return r;
}

/** Model list entry as far as the harness needs it. */
export interface ModelInfo {
  id: string;
  supported_parameters?: string[];
}

/** GET /models (no cost); throws on HTTP errors. */
export async function listModels(key: string, title: string): Promise<ModelInfo[]> {
  const res = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${key}`, "HTTP-Referer": REFERER, "X-Title": title }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  return ((await res.json()) as { data: ModelInfo[] }).data;
}
