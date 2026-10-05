#!/usr/bin/env node
// Fake `claude` binary for tests (set CLAUDE_BIN to this file). Logs its arguments, the credential variables and the working
// directory to the JSONL file FAKE_CLAUDE_LOG and prints a stream-json stream. FAKE_CLAUDE_MODE: ok (default) | error | limit | quietlimit | emptyresult | maxturns | exit1 | hang | noresult | noresultlimit.
// FAKE_CLAUDE_ANSWER: the `result` text of mode ok. FAKE_CLAUDE_FAIL_AFTER=N: modes other than ok apply only from call N+1 on (calls counted in the log).
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";

const args = process.argv.slice(2);
const log = process.env.FAKE_CLAUDE_LOG;
const mcpIdx = args.indexOf("--mcp-config");
let calls = 0;
if (log && existsSync(log)) calls = readFileSync(log, "utf8").split("\n").filter(Boolean).length;
if (log) {
  appendFileSync(
    log,
    `${JSON.stringify({
      args,
      cwd: process.cwd(),
      cwd_entries: readdirSync(process.cwd()),
      env: Object.fromEntries(["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "HOME", "ANTHROPIC_BASE_URL", "CLAUDECODE", "CLAUDE_EFFORT", "CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_MESSAGING_X", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_USE_FOUNDRY", "CLAUDE_CONFIG_DIR"].map((k) => [k, process.env[k] ?? null])),
      mcp_config: mcpIdx >= 0 && existsSync(args[mcpIdx + 1]) ? JSON.parse(readFileSync(args[mcpIdx + 1], "utf8")) : null,
    })}\n`,
  );
}
let mode = process.env.FAKE_CLAUDE_MODE ?? "ok";
if (mode !== "ok" && calls < Number(process.env.FAKE_CLAUDE_FAIL_AFTER ?? 0)) mode = "ok";
const emit = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);
const usage = { input_tokens: 11, output_tokens: 7 };
const answer = process.env.FAKE_CLAUDE_ANSWER ?? '{"date":"2027-12-02","version":"02024R1689-20260727","article":"Article 113","quote":null,"answer":"yes","verdict":null}';

if (mode === "hang") setInterval(() => undefined, 1000);
else {
  emit({ type: "system", subtype: "init", model: "claude-fake" });
  if (mode === "exit1") {
    process.stderr.write("fatal: something broke\n");
    process.exit(1);
  }
  if (mode === "noresult") process.exit(0);
  if (mode === "noresultlimit") {
    emit({ type: "assistant", message: { content: [{ type: "text", text: "You have reached your limit." }] } });
    process.exit(0);
  }
  if (mode === "quietlimit") {
    // limit notice as assistant text; no result text, is_error false
    emit({ type: "assistant", message: { content: [{ type: "text", text: "Claude usage limit reached. Your limit will reset at 9pm." }] } });
    emit({ type: "result", subtype: "success", is_error: false, result: "", total_cost_usd: 0, usage, modelUsage: {} });
    process.exit(0);
  }
  if (mode === "emptyresult") {
    emit({ type: "result", subtype: "success", is_error: false, result: "", total_cost_usd: 0.002, usage, modelUsage: {} });
    process.exit(0);
  }
  if (mcpIdx >= 0) {
    emit({ type: "assistant", message: { content: [{ type: "text", text: "looking it up" }, { type: "tool_use", id: "t1", name: "mcp__aiact__aiact_get_provision", input: { id: "art_113", pad: "x".repeat(500) } }] } });
    emit({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "..." }] } });
  } else if (args.includes("WebSearch,WebFetch")) {
    emit({ type: "assistant", message: { content: [{ type: "tool_use", id: "w1", name: "WebSearch", input: { query: "AI Act high-risk date" } }] } });
  }
  emit({ type: "assistant", message: { content: [{ type: "text", text: "final" }] } });
  if (mode === "maxturns") emit({ type: "result", subtype: "error_max_turns", is_error: false, total_cost_usd: 0.05, num_turns: 9, usage, modelUsage: { "claude-fake-1": {} } });
  else if (mode === "ok") emit({ type: "result", subtype: "success", is_error: false, result: answer, total_cost_usd: 0.0123, num_turns: 2, usage, modelUsage: { "claude-fake-1": { costUSD: 0.0123 } } });
  else if (mode === "error") emit({ type: "result", subtype: "error_during_execution", is_error: true, result: "boom: something failed", total_cost_usd: 0.001, usage, modelUsage: {} });
  else if (mode === "limit") emit({ type: "result", subtype: "success", is_error: true, result: "You've hit your usage limit. Resets at 21:00.", total_cost_usd: 0, usage, modelUsage: {} });
}
