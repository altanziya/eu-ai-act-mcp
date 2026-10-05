import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../../src/eval/report.js";
import { main, parseArgs } from "../../src/eval/run.js";

const FAKE = resolve("tests/fixtures/fake-claude.mjs");
const SMOKE = "tests/fixtures/eval-smoke.yaml"; // 2 cases
const CC = "claude-code/claude-opus-5-5";
const tmp = mkdtempSync(join(tmpdir(), "eval-claude-run-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const readRuns = (out: string): RunRecord[] => readFileSync(join(out, "runs.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as RunRecord);
const readResults = (out: string): Record<string, unknown> & { cells: Array<Record<string, unknown>> } => JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
const callCount = (log: string): number => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).length : 0);

let log = "";
let n = 0;
let fetchCalls = 0;
beforeEach(() => {
  log = join(tmp, `calls-${n++}.jsonl`);
  fetchCalls = 0;
  vi.stubEnv("CLAUDE_BIN", FAKE);
  vi.stubEnv("FAKE_CLAUDE_LOG", log);
  vi.stubEnv("FAKE_CLAUDE_MODE", "ok");
  vi.stubGlobal("fetch", async () => {
    fetchCalls++;
    throw new Error("network must not be used");
  });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Defaults after `extra`: parseArgs takes the first occurrence of a flag, so `extra` overrides them. */
const args = (out: string, extra: string[] = []): string[] => [...extra, "--cases", SMOKE, "--models", CC, "--primary-model", CC, "--arms", "plain,web,tools", "--reps", "1", "--max-usd", "0", "--out", out];

describe("claude-code backend in the harness", () => {
  it("runs every case x arm through the binary; no OpenRouter key, no network, no money", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", ""); // a key lookup would fall through to the keychain; it must not happen
    const out = join(tmp, "cc-only");
    await main(args(out));
    expect(callCount(log)).toBe(6);
    expect(fetchCalls).toBe(0);
    const runs = readRuns(out);
    expect(runs).toHaveLength(6);
    for (const r of runs) {
      expect(r).toMatchObject({ backend: "claude-code", model: CC, cost: 0, cost_equiv_usd: 0.0123, model_reported: "claude-fake-1", status: 200, prompt_version: "eval-prompt-v2" });
      expect(r.parsed).not.toBeNull();
      expect(r.error).toBeUndefined();
    }
    const tools = runs.filter((r) => r.arm === "tools");
    expect(tools.every((r) => r.tool_calls.length === 1 && r.tool_calls[0]?.name === "mcp__aiact__aiact_get_provision")).toBe(true);
    expect(runs.filter((r) => r.arm === "plain").every((r) => r.tool_calls.length === 0)).toBe(true);
    const res = readResults(out);
    expect(res).toMatchObject({ status: "complete", runs: 6, total_cost_usd: 0, backends: { [CC]: "claude-code" } });
    expect(res["total_cost_equiv_usd"]).toBeCloseTo(0.0738);
    expect(res.cells.map((c) => c["backend"])).toEqual(["claude-code", "claude-code", "claude-code"]);
    expect(res.cells.every((c) => Math.abs((c["cost_equiv_usd"] as number) - 0.0246) < 1e-9 && c["cost_usd"] === 0)).toBe(true);
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/Backend claude-code/);
  });

  it("the prompt of each arm reaches the binary with the case date", async () => {
    await main(args(join(tmp, "prompts"), ["--arms", "web,plain"]));
    const calls = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { args: string[] });
    const sys = calls.map((c) => c.args[c.args.indexOf("--system-prompt") + 1] as string);
    expect(sys.every((s) => s.startsWith("Today's date is 2026-10-05."))).toBe(true);
    expect(sys.filter((s) => s.endsWith("You may search the web."))).toHaveLength(2);
  });

  it("an error run is recorded and the run goes on; it is repeated on --resume", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "error");
    const out = join(tmp, "errors");
    await main(args(out, ["--arms", "plain"]));
    let runs = readRuns(out);
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.error === "boom: something failed" && r.parsed === null && r.cost === 0)).toBe(true);
    expect(readResults(out)["status"]).toBe("complete");
    expect(readResults(out).cells[0]).toMatchObject({ api_error_runs: 2 });
    vi.stubEnv("FAKE_CLAUDE_MODE", "ok");
    await main(args(out, ["--arms", "plain", "--resume"]));
    runs = readRuns(out);
    expect(runs).toHaveLength(4);
    expect(readResults(out).cells[0]).toMatchObject({ api_error_runs: 0, runs: 2 });
  });

  it("an error_max_turns run is an error run (not unparseable) and --resume repeats it", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "maxturns");
    const out = join(tmp, "maxturns");
    await main(args(out, ["--arms", "plain"]));
    expect(readResults(out).cells[0]).toMatchObject({ api_error_runs: 2, unparseable_runs: 0 });
    vi.stubEnv("FAKE_CLAUDE_MODE", "ok");
    await main(args(out, ["--arms", "plain", "--resume"]));
    expect(readResults(out).cells[0]).toMatchObject({ api_error_runs: 0, runs: 2 });
  });

  it("a used-up quota ends the run with quota_stop; --resume continues with the missing runs", async () => {
    vi.stubEnv("FAKE_CLAUDE_MODE", "limit");
    vi.stubEnv("FAKE_CLAUDE_FAIL_AFTER", "2"); // two good calls, then the limit
    const out = join(tmp, "quota");
    await main(args(out));
    expect(callCount(log)).toBe(3); // stopped at the first limit message, no further calls
    let res = readResults(out);
    expect(res).toMatchObject({ status: "quota_stop", runs: 3, planned_runs: 6 });
    expect(String(res["note"])).toMatch(/usage limit/);
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/quota_stop/);
    expect(readRuns(out).at(-1)).toMatchObject({ incomplete: true });
    vi.stubEnv("FAKE_CLAUDE_MODE", "ok");
    await main(args(out, ["--resume"]));
    res = readResults(out);
    expect(res).toMatchObject({ status: "complete", runs: 6 });
    expect(callCount(log)).toBe(3 + 4); // the 3rd run (limit) is repeated plus the three open ones
    expect(readRuns(out).filter((r) => !r.error && !r.incomplete)).toHaveLength(6);
  });

  it("--dry-run mocks claude-code ids: no binary, no network", async () => {
    vi.stubEnv("CLAUDE_BIN", join(tmp, "must-not-be-called"));
    const out = join(tmp, "cc-dry");
    await main(args(out, ["--dry-run"]));
    expect(callCount(log)).toBe(0);
    expect(fetchCalls).toBe(0);
    const runs = readRuns(out);
    expect(runs).toHaveLength(6);
    expect(runs.every((r) => r.mock === true && r.backend === "claude-code" && r.cost === 0)).toBe(true);
    expect(readResults(out)["dry_run"]).toBe(true);
  });

  it("mixed run: OpenRouter model through the (stubbed) API, claude-code model through the fake binary", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key-not-a-secret");
    vi.stubGlobal("fetch", async (url: string) => {
      fetchCalls++;
      const body = url.endsWith("/models")
        ? { data: [{ id: "x/y", supported_parameters: ["temperature"] }] }
        : { model: "x/y", choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"date":"2027-12-02","verdict":"incorrect"}' } }], usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.05 } };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const out = join(tmp, "mixed");
    await main(args(out, ["--models", `x/y,${CC}`, "--arms", "plain", "--max-usd", "1"]));
    const runs = readRuns(out);
    expect(runs).toHaveLength(4);
    expect(callCount(log)).toBe(2);
    expect(fetchCalls).toBe(3); // GET /models once, one chat completion per case
    const or = runs.filter((r) => r.model === "x/y");
    const cc = runs.filter((r) => r.model === CC);
    expect(or.every((r) => r.backend === "openrouter" && r.cost === 0.05 && r.cost_equiv_usd === undefined)).toBe(true);
    expect(cc.every((r) => r.backend === "claude-code" && r.cost === 0 && r.cost_equiv_usd === 0.0123)).toBe(true);
    const res = readResults(out);
    expect(res["total_cost_usd"]).toBeCloseTo(0.1); // only OpenRouter money
    expect(res["total_cost_equiv_usd"]).toBeCloseTo(0.0246);
    expect(res["request_params"]).toEqual({ "x/y": { temperature: true, reasoning_effort: null } });
    expect(res.cells.map((c) => [c["model"], c["backend"]])).toEqual([["x/y", "openrouter"], [CC, "claude-code"]]);
  });

  it("subscription runs are not stopped by --max-usd 0 (their equivalent cost is outside the money cap)", async () => {
    const out = join(tmp, "cap0");
    await main(args(out, ["--arms", "plain", "--reps", "2"]));
    expect(readResults(out)).toMatchObject({ status: "complete", runs: 4, total_cost_usd: 0 });
    expect(Number(readResults(out)["total_cost_equiv_usd"])).toBeGreaterThan(0);
  });

  it("--max-claude-calls stops with budget_stop before the call that would exceed it; the default is 400", async () => {
    const out = join(tmp, "max-calls");
    await main(args(out, ["--max-claude-calls", "4"]));
    expect(callCount(log)).toBe(4);
    const res = readResults(out);
    expect(res).toMatchObject({ status: "budget_stop", runs: 4, planned_runs: 6, max_claude_calls: 4, claude_calls: 4 });
    expect(String(res["note"])).toMatch(/--max-claude-calls 4 reached/);
    // resume: the cap counts per invocation, the two missing runs fit
    await main(args(out, ["--resume", "--max-claude-calls", "2"]));
    expect(callCount(log)).toBe(6);
    expect(readResults(out)).toMatchObject({ status: "complete", runs: 6 });
    expect(parseArgs(args(out, ["--dry-run"])).maxClaudeCalls).toBe(400);
    expect(() => parseArgs(args(out, ["--max-claude-calls", "-1"]))).toThrow(/max-claude-calls/);
    expect(() => parseArgs(args(out, ["--max-claude-calls", "x"]))).toThrow(/max-claude-calls/);
  });

  it("--max-claude-calls 0 makes no call at all", async () => {
    const out = join(tmp, "zero-calls");
    await main(args(out, ["--max-claude-calls", "0"]));
    expect(callCount(log)).toBe(0);
    expect(readResults(out)).toMatchObject({ status: "budget_stop", runs: 0 });
  });
});
