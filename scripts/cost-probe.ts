/**
 * npm run cost:probe [-- --list]
 * Measures what requests to the flagship model of each provider cost on OpenRouter in three arms (plain, web search,
 * project tools) and projects the cost of a 40-case run. Hard cap: 3.00 USD cumulative `usage.cost`, checked before every
 * request. Results are written to scripts/cost-probe/results/2026-10-05.{json,md}; an existing JSON is resumed (its cost
 * counts against the cap, finished question x model x arm cells are skipped).
 * The API key comes from OPENROUTER_API_KEY or the macOS keychain item "openrouter" and is never logged or written.
 * `--list` only fetches the model list, prints the selection and writes nothing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/config.js";
import { diffProvision } from "../src/tools/diffProvision.js";
import { getProvision } from "../src/tools/getProvision.js";
import { verifyCitation } from "../src/tools/verifyCitation.js";
import { ARMS, PROVIDERS, cellStats, price, projectCost, selectModels, toCandidates } from "./cost-probe/select.js";
import type { Arm, Candidate, CallRecord as BaseCall, RawModel, Provider } from "./cost-probe/select.js";

const API = "https://openrouter.ai/api/v1";
const TODAY = "2026-10-05";
const CAP_USD = 3.0;
const MAX_TOOL_ROUNDS = 6;
const TOOL_RESULT_CHARS = 6000;
const CASES = 40;
const OUT_DIR = join(REPO_ROOT, "scripts/cost-probe/results");
const OUT_JSON = join(OUT_DIR, `${TODAY}.json`);
const OUT_MD = join(OUT_DIR, `${TODAY}.md`);

const QUESTIONS = [
  "As of 2026-09-01, when do the obligations for high-risk AI systems under Annex III start to apply, and which version of the Regulation did you rely on?",
  "Does Article 5(1)(a) of the AI Act prohibit subliminal techniques? Quote the exact wording.",
  "Which application dates did Regulation (EU) 2026/1744 change in the AI Act?",
];

const SYSTEM_PROMPT =
  `Today's date is ${TODAY}. You answer questions about Regulation (EU) 2024/1689 (the EU AI Act). ` +
  `Reply with one JSON object only, with the keys "date" (the reference date of your answer), "version" (the version of the Regulation you relied on), ` +
  `"article" (the provision you cite), "quote" (an exact quotation from it) and "answer" (your answer in at most 120 words). No markdown.`;
const TOOLS_HINT = " You may call the provided tools to look up the provision text, the differences between versions and to verify a quotation.";

const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "aiact_get_provision",
      description:
        `Returns one provision of Regulation (EU) 2024/1689 by id or citation (e.g. "art_50.par_1" or "Article 50(1)"), with all descendants. ` +
        `version: 32024R1689 (Official Journal, default for recitals) or 02024R1689-20260727 (consolidated after the Omnibus; default). Recitals exist only in 32024R1689; asking for one in 02024R1689-20260727 returns found=false with a fallback.`,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Node id (art_50.par_1.a, anx_3.pt_1, rec_12, cpt_3.sct_2) or citation (Article 50(1)(a), Anhang III Nummer 1)" },
          version: { type: "string", enum: ["32024R1689", "02024R1689-20260727"], description: "Corpus version; default 02024R1689-20260727" },
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

function runTool(name: string, rawArgs: string): string {
  let out: unknown;
  try {
    const args = JSON.parse(rawArgs === "" ? "{}" : rawArgs) as Record<string, unknown>;
    if (name === "aiact_get_provision") out = getProvision(args as unknown as Parameters<typeof getProvision>[0]);
    else if (name === "aiact_diff") out = diffProvision(args as unknown as Parameters<typeof diffProvision>[0]);
    else if (name === "aiact_verify_citation") out = verifyCitation({ ...(args as unknown as Parameters<typeof verifyCitation>[0]), as_of: (args["as_of"] as string | undefined) ?? TODAY });
    else out = { error: `unknown tool ${name}` };
  } catch (e) {
    out = { error: e instanceof Error ? e.message : String(e) };
  }
  const text = JSON.stringify(out);
  return text.length > TOOL_RESULT_CHARS ? `${text.slice(0, TOOL_RESULT_CHARS)}...[truncated]` : text;
}

function apiKey(): string {
  const env = process.env["OPENROUTER_API_KEY"]?.trim();
  if (env) return env;
  const key = execFileSync("security", ["find-generic-password", "-s", "openrouter", "-w"], { encoding: "utf8" }).trim();
  if (!key) throw new Error("no OpenRouter API key (OPENROUTER_API_KEY or keychain item openrouter)");
  return key;
}

interface CallRecord extends BaseCall {
  question_text: string;
  model_reported: string | null;
  latency_ms: number;
  tool_rounds: number;
  requests: number;
  finish_reason: string | null;
  web_citations: number;
  error?: string;
  answer: string;
}

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  annotations?: unknown[];
}
interface ChatResponse {
  model?: string;
  choices?: Array<{ finish_reason?: string; message?: ChatMessage }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  error?: { message?: string };
}

let cumulative = 0;
class CapReached extends Error {}

/** Throws before the request if the cumulative cost (plus a conservative estimate of this request) would pass the cap. */
function guard(estimate: number): void {
  if (cumulative >= CAP_USD || cumulative + estimate > CAP_USD) throw new CapReached(`cap ${CAP_USD} USD: cumulative ${cumulative.toFixed(4)} + estimate ${estimate.toFixed(4)}`);
}

async function chat(key: string, body: Record<string, unknown>, estimate: number): Promise<{ status: number; json: ChatResponse }> {
  guard(estimate);
  const res = await fetch(`${API}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/akoemek-dev/eu-ai-act-mcp",
      "X-Title": "eu-ai-act-mcp cost probe",
    },
    body: JSON.stringify({ ...body, usage: { include: true }, max_tokens: 800, temperature: 0 }),
    signal: AbortSignal.timeout(240_000),
  });
  const text = await res.text();
  let json: ChatResponse;
  try {
    json = JSON.parse(text) as ChatResponse;
  } catch {
    json = { error: { message: text.slice(0, 300) } };
  }
  cumulative += json.usage?.cost ?? 0;
  return { status: res.status, json };
}

async function measure(key: string, q: number, model: Candidate, arm: Arm, estimate: number): Promise<CallRecord> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT + (arm === "tools" ? TOOLS_HINT : "") },
    { role: "user", content: QUESTIONS[q] ?? "" },
  ];
  const base: Record<string, unknown> = { model: model.id };
  if (arm === "web") base["plugins"] = [{ id: "web" }];
  if (arm === "tools") base["tools"] = TOOL_DEFS;
  const rec: CallRecord = {
    question: q, question_text: QUESTIONS[q] ?? "", model: model.id, arm, model_reported: null, status: 0, prompt_tokens: 0, completion_tokens: 0, cost: 0,
    latency_ms: 0, tool_rounds: 0, requests: 0, finish_reason: null, web_citations: 0, answer: "",
  };
  const t0 = Date.now();
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const withTools = arm === "tools" && round < MAX_TOOL_ROUNDS; // after 6 rounds the model must answer without tools
      const body = { ...base, messages, ...(arm === "tools" && !withTools ? { tool_choice: "none" } : {}) };
      const { status, json } = await chat(key, body, estimate);
      rec.requests++;
      rec.status = status;
      rec.prompt_tokens += json.usage?.prompt_tokens ?? 0;
      rec.completion_tokens += json.usage?.completion_tokens ?? 0;
      rec.cost += json.usage?.cost ?? 0;
      rec.model_reported = json.model ?? rec.model_reported;
      if (status >= 400) {
        rec.error = (json.error?.message ?? "error").slice(0, 300);
        break;
      }
      const choice = json.choices?.[0];
      const msg = choice?.message;
      rec.finish_reason = choice?.finish_reason ?? null;
      rec.web_citations = msg?.annotations?.length ?? rec.web_citations;
      const calls = msg?.tool_calls ?? [];
      if (arm === "tools" && calls.length > 0 && round < MAX_TOOL_ROUNDS) {
        rec.tool_rounds++;
        messages.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls });
        for (const c of calls) messages.push({ role: "tool", tool_call_id: c.id, content: runTool(c.function.name, c.function.arguments) });
        continue;
      }
      rec.answer = (msg?.content ?? "").slice(0, 500);
      break;
    }
  } catch (e) {
    if (e instanceof CapReached) throw e;
    rec.error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    rec.status = rec.status || -1;
  } finally {
    rec.latency_ms = Date.now() - t0;
  }
  return rec;
}

/** Conservative estimate of one measurement before any has run in that cell (tokens x list price, plus a web search fee). */
function coldEstimate(m: Candidate, arm: Arm): number {
  const promptTokens = { plain: 600, web: 6000, tools: 25000 }[arm];
  return price(m, promptTokens, 800) + (arm === "web" ? 0.03 : 0);
}

const usd = (x: number | undefined, d = 4): string => (x === undefined ? "n/a" : `$${x.toFixed(d)}`);
const fix = (x: number | undefined, d = 0): string => (x === undefined ? "n/a" : x.toFixed(d));

function report(candidates: Candidate[], flagship: Candidate[], cheaper: Candidate[], calls: CallRecord[], notes: string[]): string {
  const L: string[] = [];
  L.push(`# OpenRouter cost probe ${TODAY}`, "", `Cumulative actual cost of the probe (sum of usage.cost): **${usd(calls.reduce((s, c) => s + c.cost, 0))}** (cap ${CAP_USD.toFixed(2)} USD). Calls: ${calls.length}, failed (HTTP >= 400 or transport error): ${calls.filter((c) => c.status >= 400 || c.status < 0).length}.`, "");
  if (notes.length) L.push(...notes.map((n) => `- ${n}`), "");
  L.push("## Models (flagship, measured)", "", "| id | created | prompt USD/1M | completion USD/1M | context |", "|---|---|---|---|---|");
  for (const m of flagship) L.push(`| ${m.id} | ${m.created_date} | ${m.prompt_usd_per_mtok.toFixed(2)} | ${m.completion_usd_per_mtok.toFixed(2)} | ${m.context_length} |`);
  L.push("", "## Models (cheaper, projected from prices only, not called)", "", "| id | created | prompt USD/1M | completion USD/1M | context |", "|---|---|---|---|---|");
  for (const m of cheaper) L.push(`| ${m.id} | ${m.created_date} | ${m.prompt_usd_per_mtok.toFixed(2)} | ${m.completion_usd_per_mtok.toFixed(2)} | ${m.context_length} |`);
  L.push("", "## Newest 6 candidates per provider (text, tools, no `:` variants; full list in the JSON)", "", "| id | created | prompt USD/1M | completion USD/1M | context |", "|---|---|---|---|---|");
  for (const p of PROVIDERS) for (const m of candidates.filter((c) => c.provider === p).slice(0, 6)) L.push(`| ${m.id} | ${m.created_date} | ${m.prompt_usd_per_mtok.toFixed(2)} | ${m.completion_usd_per_mtok.toFixed(2)} | ${m.context_length} |`);
  L.push("", "## Mean per call, model x arm (successful calls; tokens summed over tool rounds)", "", "| model | arm | n | prompt tokens | completion tokens | cost per call | tool rounds (mean) |", "|---|---|---|---|---|---|---|");
  for (const m of flagship) for (const arm of ARMS) {
    const s = cellStats(calls, m, arm);
    const ok = calls.filter((c) => c.model === m.id && c.arm === arm && c.status >= 400 === false && c.status > 0);
    const rounds = ok.length ? ok.reduce((a, c) => a + c.tool_rounds, 0) / ok.length : undefined;
    L.push(`| ${m.id} | ${arm} | ${s?.n ?? 0} | ${fix(s?.prompt_tokens)} | ${fix(s?.completion_tokens)} | ${usd(s?.cost)} | ${arm === "tools" ? fix(rounds, 1) : "-"} |`);
  }
  const table = (title: string, models: Candidate[]): void => {
    L.push("", `## Projection for ${CASES} cases: ${title}`, "", `Per arm: ${CASES} cases x sum of the three models of the mean cost per call.${models === cheaper ? " Token counts measured on the flagship of the same provider, priced with the cheaper model (web search fees carried over)." : ""}`, "", "| model | plain | web | tools | all three arms |", "|---|---|---|---|---|");
    const totals: Record<Arm, number | undefined> = { plain: 0, web: 0, tools: 0 };
    models.forEach((m, i) => {
      const measured = flagship[i];
      if (!measured) return;
      const cells = ARMS.map((arm) => projectCost(cellStats(calls, measured, arm), m, CASES));
      ARMS.forEach((arm, j) => {
        const c = cells[j];
        totals[arm] = c === undefined || totals[arm] === undefined ? undefined : (totals[arm] as number) + c;
      });
      const all = cells.every((c) => c !== undefined) ? (cells as number[]).reduce((a, b) => a + b, 0) : undefined;
      L.push(`| ${m.id} | ${usd(cells[0], 2)} | ${usd(cells[1], 2)} | ${usd(cells[2], 2)} | ${usd(all, 2)} |`);
    });
    const sum = ARMS.every((a) => totals[a] !== undefined) ? ARMS.reduce((s, a) => s + (totals[a] as number), 0) : undefined;
    L.push(`| **sum of three models** | **${usd(totals.plain, 2)}** | **${usd(totals.web, 2)}** | **${usd(totals.tools, 2)}** | **${usd(sum, 2)}** |`);
  };
  table("flagship models", flagship);
  table("cheaper model per provider", cheaper);
  const errs = calls.filter((c) => c.error);
  if (errs.length) {
    L.push("", "## Errors", "");
    for (const c of errs) L.push(`- q${c.question + 1} ${c.model} ${c.arm}: HTTP ${c.status} ${c.error ?? ""}`);
  }
  L.push("", "## Finish reasons", "", "| model | arm | finish reasons | empty answers |", "|---|---|---|---|");
  for (const m of flagship) for (const arm of ARMS) {
    const cs = calls.filter((c) => c.model === m.id && c.arm === arm);
    if (!cs.length) continue;
    L.push(`| ${m.id} | ${arm} | ${cs.map((c) => c.finish_reason ?? `err${c.status}`).join(", ")} | ${cs.filter((c) => c.answer === "").length} |`);
  }
  L.push("");
  return L.join("\n");
}

async function main(): Promise<void> {
  const key = apiKey();
  const res = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${key}`, "HTTP-Referer": "https://github.com/akoemek-dev/eu-ai-act-mcp", "X-Title": "eu-ai-act-mcp cost probe" } });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  const candidates = toCandidates(((await res.json()) as { data: RawModel[] }).data);
  const sel = selectModels(candidates);
  const notes: string[] = [];
  const flagship: Candidate[] = [];
  const cheaper: Candidate[] = [];
  for (const p of PROVIDERS as readonly Provider[]) {
    const f = sel.flagship[p];
    const c = sel.cheaper[p];
    if (!f) notes.push(`No flagship match for ${p}; provider skipped.`);
    else flagship.push(f);
    if (!c) notes.push(`No cheaper-model match for ${p}.`);
    else if (f) cheaper.push(c);
  }
  notes.push(
    "Selection: the newest gpt-5* match (gpt-5.6-luna) is the smallest tier of its generation, so the most expensive tier created within 3 days of it (gpt-5.6-terra) was taken; the -customtools variant of gemini-3.1-pro was excluded in favour of gemini-3.1-pro-preview.",
    "OpenAI also lists gpt-6* models (outside the gpt-5* pattern, not measured; see the candidate list in the JSON).",
    "max_tokens 800 as specified: reasoning tokens count against it, so some answers end with finish_reason=length (gpt-5.6-terra: empty text; gemini: truncated). Measured completion tokens and costs are therefore a lower bound of an uncapped answer.",
    "Web arm: plugin web with default settings (up to 5 results). Opus and gpt-5.6-terra prompt tokens include the search results; for gemini the usage shows only the question as prompt tokens (native search, results not billed as prompt tokens) and no separate search fee beyond the token price is visible.",
  );
  console.log("flagship:", flagship.map((m) => `${m.id} ($${m.prompt_usd_per_mtok}/${m.completion_usd_per_mtok} per 1M)`).join(", "));
  console.log("cheaper:", cheaper.map((m) => m.id).join(", "));
  if (process.argv.includes("--list")) {
    for (const p of PROVIDERS) console.log(candidates.filter((c) => c.provider === p).slice(0, 12).map((c) => `${c.id} ${c.created_date}`).join("\n"));
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  let calls: CallRecord[] = [];
  if (existsSync(OUT_JSON)) calls = (JSON.parse(readFileSync(OUT_JSON, "utf8")) as { calls: CallRecord[] }).calls;
  cumulative = calls.reduce((s, c) => s + c.cost, 0);
  console.log(`resuming with ${calls.length} calls, cumulative ${cumulative.toFixed(4)} USD`);

  const save = (): void => {
    writeFileSync(
      OUT_JSON,
      `${JSON.stringify({ date: TODAY, cap_usd: CAP_USD, cumulative_cost_usd: calls.reduce((s, c) => s + c.cost, 0), flagship, cheaper, candidates, calls }, null, 2)}\n`,
      "utf8",
    );
  };

  let capHit = false;
  outer: for (let q = 0; q < QUESTIONS.length; q++) {
    for (const m of flagship) {
      for (const arm of ARMS) {
        if (calls.some((c) => c.question === q && c.model === m.id && c.arm === arm && c.status > 0 && c.status < 400)) continue;
        const stats = cellStats(calls, m, arm);
        const estimate = stats ? stats.cost * 1.5 : coldEstimate(m, arm);
        try {
          const rec = await measure(key, q, m, arm, estimate);
          calls = calls.filter((c) => !(c.question === q && c.model === m.id && c.arm === arm));
          calls.push(rec);
          save();
          console.log(`q${q + 1} ${m.id} ${arm}: HTTP ${rec.status} tokens ${rec.prompt_tokens}/${rec.completion_tokens} cost ${rec.cost.toFixed(4)} rounds ${rec.tool_rounds} ${rec.latency_ms}ms | cumulative ${cumulative.toFixed(4)}`);
        } catch (e) {
          if (e instanceof CapReached) {
            console.log(`STOP: ${e.message}`);
            notes.push(`Stopped at the cost cap: ${e.message} (before q${q + 1} ${m.id} ${arm}).`);
            capHit = true;
            break outer;
          }
          throw e;
        }
      }
    }
  }
  if (!capHit) notes.push("All 27 question x model x arm calls were attempted; the cap was not reached.");
  save();
  writeFileSync(OUT_MD, report(candidates, flagship, cheaper, calls, notes), "utf8");
  console.log(`total cost ${calls.reduce((s, c) => s + c.cost, 0).toFixed(4)} USD`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
