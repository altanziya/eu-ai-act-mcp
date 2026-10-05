import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendOf, buildClaudeArgs, childEnv, claudeModelId, isClaudeCode, isQuotaMessage, mcpConfigJson, parseStream, runClaude } from "../../src/eval/claudeCode.js";
import type { Arm } from "../../src/eval/openrouter.js";

const FAKE = resolve("tests/fixtures/fake-claude.mjs");
const tmp = mkdtempSync(join(tmpdir(), "eval-claude-code-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Logged { args: string[]; cwd: string; cwd_entries: string[]; env: Record<string, string | null>; mcp_config: { mcpServers: Record<string, { command: string; args: string[] }> } | null }
const readLog = (p: string): Logged[] => readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Logged);
const after = (a: string[], flag: string): string | undefined => a[a.indexOf(flag) + 1];

let log = "";
let n = 0;
beforeEach(() => {
  log = join(tmp, `calls-${n++}.jsonl`);
  vi.stubEnv("FAKE_CLAUDE_LOG", log);
  vi.stubEnv("FAKE_CLAUDE_MODE", "ok");
  vi.stubEnv("CLAUDE_BIN", FAKE);
});
afterEach(() => vi.unstubAllEnvs());

const go = (arm: Arm, extra: { timeoutMs?: number } = {}): ReturnType<typeof runClaude> =>
  runClaude({ model: "claude-code/claude-opus-5-5", arm, system: "SYS PROMPT", user: "the question?", ...extra });

describe("model ids", () => {
  it("claude-code/ selects the backend and is stripped for the CLI", () => {
    expect(isClaudeCode("claude-code/claude-opus-5-5")).toBe(true);
    expect(isClaudeCode("anthropic/claude-opus-5-5")).toBe(false);
    expect(backendOf("openai/gpt-5")).toBe("openrouter");
    expect(backendOf("claude-code/x")).toBe("claude-code");
    expect(claudeModelId("claude-code/claude-opus-5-5")).toBe("claude-opus-5-5");
  });
});

describe("arguments per arm", () => {
  const common = (a: string[]): void => {
    expect(a.slice(0, 2)).toEqual(["-p", "the question?"]);
    expect(after(a, "--model")).toBe("claude-opus-5-5");
    expect(after(a, "--setting-sources")).toBe("");
    expect(a).toContain("--strict-mcp-config");
    expect(after(a, "--system-prompt")).toBe("SYS PROMPT");
    expect(after(a, "--output-format")).toBe("stream-json");
    expect(a).toContain("--verbose");
    expect(after(a, "--max-turns")).toBe("8");
    expect(after(a, "--effort")).toBe("low");
  };
  it("plain: no tools", () => {
    const a = buildClaudeArgs({ model: "claude-code/claude-opus-5-5", arm: "plain", system: "SYS PROMPT", user: "the question?" });
    common(a);
    expect(after(a, "--tools")).toBe("");
    expect(a).not.toContain("--allowedTools");
    expect(a).not.toContain("--mcp-config");
  });
  it("web: WebSearch and WebFetch only", () => {
    const a = buildClaudeArgs({ model: "claude-code/claude-opus-5-5", arm: "web", system: "SYS PROMPT", user: "the question?" });
    common(a);
    expect(after(a, "--tools")).toBe("WebSearch,WebFetch");
    expect(after(a, "--allowedTools")).toBe("WebSearch,WebFetch");
    expect(a).not.toContain("--mcp-config");
  });
  it("tools: the three MCP tools, no built-in tools", () => {
    const a = buildClaudeArgs({ model: "claude-code/claude-opus-5-5", arm: "tools", system: "SYS PROMPT", user: "the question?", mcpConfig: "/x/mcp.json" });
    common(a);
    expect(after(a, "--mcp-config")).toBe("/x/mcp.json");
    expect(after(a, "--tools")).toBe("");
    expect(after(a, "--allowedTools")).toBe("mcp__aiact__aiact_get_provision,mcp__aiact__aiact_diff,mcp__aiact__aiact_verify_citation");
  });
  it("the process receives exactly these arguments, in a temp directory without shell", async () => {
    await go("web");
    const [c] = readLog(log);
    expect(c?.args).toEqual(buildClaudeArgs({ model: "claude-code/claude-opus-5-5", arm: "web", system: "SYS PROMPT", user: "the question?" }));
  });
  it("tools arm: MCP config names the project server with absolute paths", async () => {
    await go("tools");
    const cfg = readLog(log)[0]?.mcp_config?.mcpServers["aiact"];
    expect(cfg?.command).toMatch(/^\/.*node_modules\/\.bin\/tsx$/);
    expect(cfg?.args[0]).toMatch(/^\/.*src\/mcp\/server\.ts$/);
    expect(existsSync(cfg?.args[0] ?? "")).toBe(true);
    expect(JSON.parse(mcpConfigJson("/r")).mcpServers.aiact).toEqual({ command: "/r/node_modules/.bin/tsx", args: ["/r/src/mcp/server.ts"] });
  });
});

describe("child process", () => {
  it("has no API credential variables, even if the parent sets them", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "x");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "x");
    vi.stubEnv("CLAUDE_CODE_USE_BEDROCK", "1");
    vi.stubEnv("CLAUDE_CODE_USE_VERTEX", "1");
    await go("plain");
    const env = readLog(log)[0]?.env;
    expect(env).toMatchObject({ ANTHROPIC_API_KEY: null, ANTHROPIC_AUTH_TOKEN: null, CLAUDE_CODE_USE_BEDROCK: null, CLAUDE_CODE_USE_VERTEX: null });
    expect(env?.["HOME"]).toBe(process.env["HOME"] ?? null); // the rest of the environment (login) is kept
    expect(childEnv({ ANTHROPIC_API_KEY: "k", PATH: "p" })).toEqual({ PATH: "p" });
  });
  it("also lacks every CLAUDE* variable of a parent session and ANTHROPIC_BASE_URL, but keeps CLAUDE_CONFIG_DIR", async () => {
    const inherited = ["CLAUDECODE", "CLAUDE_EFFORT", "CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_MESSAGING_X", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_USE_FOUNDRY", "ANTHROPIC_BASE_URL"];
    for (const k of inherited) vi.stubEnv(k, "1");
    vi.stubEnv("CLAUDE_CONFIG_DIR", "/some/config");
    await go("plain");
    const env = readLog(log)[0]?.env ?? {};
    for (const k of inherited) expect(env[k], k).toBeNull();
    expect(env["CLAUDE_CONFIG_DIR"]).toBe("/some/config");
    expect(childEnv({ CLAUDECODE: "1", CLAUDE_CONFIG_DIR: "/c", CLAUDE_FUTURE_THING: "x", CLAUDEX: "y", PATH: "p", HOME: "/h" })).toEqual({ CLAUDE_CONFIG_DIR: "/c", PATH: "p", HOME: "/h" });
  });
  it("runs in a fresh empty directory that is deleted afterwards", async () => {
    await go("tools");
    const c = readLog(log)[0];
    expect(c?.cwd_entries).toEqual([]);
    expect(c?.cwd).not.toBe(process.cwd());
    expect(existsSync(c?.cwd ?? "")).toBe(false);
  });
  it("kills a hanging call after the timeout and reports an error", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "hang");
    const r = await go("plain", { timeoutMs: 300 });
    expect(r).toMatchObject({ outcome: "error" });
    expect(r.error).toMatch(/timeout/);
  });
  it("a missing binary is an error, not an exception", async () => {
    vi.stubEnv("CLAUDE_BIN", join(tmp, "does-not-exist"));
    const r = await go("plain");
    expect(r.outcome).toBe("error");
    expect(r.error).toMatch(/spawn failed/);
  });
});

describe("stream evaluation", () => {
  it("takes the answer from the result event, tool_use blocks, cost and model", async () => {
    const r = await go("tools");
    expect(r.outcome).toBe("ok");
    expect(JSON.parse(r.text)).toMatchObject({ date: "2027-12-02" });
    expect(r.tool_calls).toHaveLength(1);
    expect(r.tool_calls[0]?.name).toBe("mcp__aiact__aiact_get_provision");
    expect(r.tool_calls[0]?.arguments.length).toBe(300); // input cut to 300 characters
    expect(r.tool_calls[0]?.arguments.startsWith('{"id":"art_113"')).toBe(true);
    expect(r.cost_equiv_usd).toBe(0.0123);
    expect(r.model_reported).toBe("claude-fake-1");
    expect(r).toMatchObject({ prompt_tokens: 11, completion_tokens: 7, num_turns: 2 });
  });
  it("web arm records the search as a tool call; plain has none", async () => {
    expect((await go("web")).tool_calls.map((t) => t.name)).toEqual(["WebSearch"]);
    expect((await go("plain")).tool_calls).toEqual([]);
  });
  it("ignores non-JSON lines and takes the last result event", () => {
    const s = parseStream(`warning\n{"type":"result","result":"a","total_cost_usd":1}\nnot json {\n{"type":"result","result":"b","total_cost_usd":2,"modelUsage":{"m1":{},"m2":{}}}\n`);
    expect(s).toMatchObject({ text: "b", cost_equiv_usd: 2, model_reported: "m1,m2", hasResult: true });
  });
});

describe("errors", () => {
  it("is_error becomes outcome error with the message", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "error");
    const r = await go("plain");
    expect(r).toMatchObject({ outcome: "error", error: "boom: something failed" });
  });
  it("exit code != 0 becomes error; the message is cut to 300 characters", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "exit1");
    const r = await go("plain");
    expect(r).toMatchObject({ outcome: "error", exit_code: 1 });
    expect(r.error).toMatch(/exit 1: fatal: something broke/);
    expect(r.error?.length).toBeLessThanOrEqual(300);
  });
  it("no result event is an error", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "noresult");
    expect((await go("plain")).error).toMatch(/no result event/);
  });
  it("limit / usage text with an error is quota_stop", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "limit");
    const r = await go("plain");
    expect(r.outcome).toBe("quota_stop");
    expect(r.error).toMatch(/usage limit/);
    expect(isQuotaMessage("Usage exceeded")).toBe(true);
    expect(isQuotaMessage("boom")).toBe(false);
  });
});
