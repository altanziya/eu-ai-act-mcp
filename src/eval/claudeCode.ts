/**
 * Backend `claude-code/<model>` of the eval harness: one run = one `claude -p` call (Claude Code CLI on the subscription),
 * with its own system prompt, no settings sources (no CLAUDE.md, no memory), a fresh empty working directory and a child
 * environment without API credentials, so that nothing is billed to an API account. The stream (`--output-format stream-json`)
 * is evaluated for the answer text, tool calls, the API-equivalent cost and the model reported.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import type { Arm, ToolCallRecord } from "./openrouter.js";

export const CLAUDE_PREFIX = "claude-code/";
export const CLAUDE_TIMEOUT_MS = 300_000;
export const CLAUDE_MAX_TURNS = 8;
export const MCP_SERVER_NAME = "aiact";
export const MCP_TOOLS = ["aiact_get_provision", "aiact_diff", "aiact_verify_citation"].map((t) => `mcp__${MCP_SERVER_NAME}__${t}`);
/** Variables removed from the child environment: with any of them set, Claude Code would bill an API account instead of the subscription. */
export const STRIPPED_ENV = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX"] as const;
const TOOL_INPUT_CHARS = 300;
const ERROR_CHARS = 300;

export type Backend = "openrouter" | "claude-code";

export const isClaudeCode = (model: string): boolean => model.startsWith(CLAUDE_PREFIX);
export const backendOf = (model: string): Backend => (isClaudeCode(model) ? "claude-code" : "openrouter");
export const claudeModelId = (model: string): string => (isClaudeCode(model) ? model.slice(CLAUDE_PREFIX.length) : model);

/** Arguments of one call (everything after the binary). `mcpConfig` is the path of the MCP config file (arm tools only). */
export function buildClaudeArgs(o: { model: string; arm: Arm; system: string; user: string; mcpConfig?: string }): string[] {
  const args = [
    "-p", o.user, "--model", claudeModelId(o.model), "--setting-sources", "", "--strict-mcp-config", "--system-prompt", o.system,
    "--output-format", "stream-json", "--verbose", "--max-turns", String(CLAUDE_MAX_TURNS), "--effort", "low",
  ];
  if (o.arm === "plain") args.push("--tools", "");
  else if (o.arm === "web") args.push("--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch");
  else {
    if (!o.mcpConfig) throw new Error("arm tools needs an MCP config path");
    args.push("--mcp-config", o.mcpConfig, "--tools", "", "--allowedTools", MCP_TOOLS.join(","));
  }
  return args;
}

/** MCP config JSON text: the project's server with absolute paths. */
export function mcpConfigJson(root = REPO_ROOT): string {
  return `${JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: { command: join(root, "node_modules/.bin/tsx"), args: [join(root, "src/mcp/server.ts")] } } }, null, 2)}\n`;
}

/** Child environment: the parent's without the API credential variables. */
export function childEnv(parent: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...parent };
  for (const k of STRIPPED_ENV) delete env[k];
  return env;
}

export interface StreamResult {
  /** `result` of the final result event ("" if absent). */
  text: string;
  /** A result event was seen. */
  hasResult: boolean;
  isError: boolean;
  subtype: string | null;
  tool_calls: ToolCallRecord[];
  cost_equiv_usd: number;
  model_reported: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  num_turns: number;
}

/** Evaluates the stream-json output (one JSON object per line; lines that are not JSON are ignored). */
export function parseStream(stdout: string): StreamResult {
  const r: StreamResult = { text: "", hasResult: false, isError: false, subtype: null, tool_calls: [], cost_equiv_usd: 0, model_reported: null, prompt_tokens: 0, completion_tokens: 0, num_turns: 0 };
  for (const line of stdout.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(t) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (ev["type"] === "assistant") {
      const content = (ev["message"] as { content?: unknown } | undefined)?.content;
      if (!Array.isArray(content)) continue;
      for (const b of content as Array<Record<string, unknown>>) {
        if (b["type"] !== "tool_use") continue;
        const input = JSON.stringify(b["input"] ?? {});
        r.tool_calls.push({ name: String(b["name"] ?? "unknown"), arguments: input.slice(0, TOOL_INPUT_CHARS) });
      }
    } else if (ev["type"] === "result") {
      r.hasResult = true;
      r.text = typeof ev["result"] === "string" ? ev["result"] : "";
      r.isError = ev["is_error"] === true;
      r.subtype = typeof ev["subtype"] === "string" ? ev["subtype"] : null;
      r.cost_equiv_usd = typeof ev["total_cost_usd"] === "number" ? ev["total_cost_usd"] : 0;
      r.num_turns = typeof ev["num_turns"] === "number" ? ev["num_turns"] : 0;
      const mu = ev["modelUsage"];
      if (mu && typeof mu === "object") {
        const keys = Object.keys(mu);
        if (keys.length > 0) r.model_reported = keys.join(",");
      }
      const u = ev["usage"] as { input_tokens?: number; output_tokens?: number } | undefined;
      r.prompt_tokens = typeof u?.input_tokens === "number" ? u.input_tokens : 0;
      r.completion_tokens = typeof u?.output_tokens === "number" ? u.output_tokens : 0;
    }
  }
  return r;
}

/** A failed call whose message talks about a limit or usage: the subscription quota is used up. */
export const isQuotaMessage = (msg: string): boolean => /limit|usage/i.test(msg);

export interface ClaudeRunOptions {
  model: string;
  arm: Arm;
  system: string;
  user: string;
  /** Binary; default CLAUDE_BIN or `claude`. */
  bin?: string;
  timeoutMs?: number;
}

export interface ClaudeRunResult extends StreamResult {
  outcome: "ok" | "error" | "quota_stop";
  /** Message of an error / quota_stop (at most 300 characters). */
  error?: string;
  exit_code: number | null;
  latency_ms: number;
}

/** One `claude -p` call, no shell, stdin closed, in a fresh empty working directory that is deleted afterwards. Never throws. */
export async function runClaude(o: ClaudeRunOptions): Promise<ClaudeRunResult> {
  const root = mkdtempSync(join(tmpdir(), "eval-claude-"));
  const cwd = join(root, "work"); // empty; the MCP config lives next to it, not in it
  mkdirSync(cwd);
  const t0 = Date.now();
  try {
    let mcpConfig: string | undefined;
    if (o.arm === "tools") {
      mcpConfig = join(root, "mcp.json");
      writeFileSync(mcpConfig, mcpConfigJson(), "utf8");
    }
    const args = buildClaudeArgs({ model: o.model, arm: o.arm, system: o.system, user: o.user, ...(mcpConfig ? { mcpConfig } : {}) });
    const bin = o.bin ?? process.env["CLAUDE_BIN"] ?? "claude";
    const { stdout, stderr, code, timedOut, spawnError } = await new Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean; spawnError?: string }>((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;
      const done = (code: number | null, spawnError?: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, code, timedOut, ...(spawnError ? { spawnError } : {}) });
      };
      const child = spawn(bin, args, { cwd, env: childEnv(), stdio: ["ignore", "pipe", "pipe"] });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, o.timeoutMs ?? CLAUDE_TIMEOUT_MS);
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
      child.stderr.on("data", (d: Buffer) => (stderr = (stderr + d.toString("utf8")).slice(-4000)));
      child.on("error", (e) => done(null, e.message));
      child.on("close", (c) => done(c));
    });
    const s = parseStream(stdout);
    const base = { ...s, exit_code: code, latency_ms: Date.now() - t0 };
    let message: string | null = null;
    if (spawnError) message = `spawn failed: ${spawnError}`;
    else if (timedOut) message = `timeout after ${(o.timeoutMs ?? CLAUDE_TIMEOUT_MS) / 1000} s`;
    else if (s.isError) message = s.text || `claude reported an error (${s.subtype ?? "no subtype"})`;
    else if (code !== 0) message = `exit ${code}: ${(s.text || stderr).trim() || "no output"}`;
    else if (!s.hasResult) message = "no result event in the stream";
    if (message === null) return { ...base, outcome: "ok" };
    const quota = !spawnError && !timedOut && isQuotaMessage(`${s.isError ? s.text : ""} ${code !== 0 ? stderr : ""} ${message}`);
    return { ...base, outcome: quota ? "quota_stop" : "error", error: message.replace(/\s+/g, " ").slice(0, ERROR_CHARS) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
