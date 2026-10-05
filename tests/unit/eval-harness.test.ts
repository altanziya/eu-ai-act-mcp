import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Budget, Estimator } from "../../src/eval/budget.js";
import { converse } from "../../src/eval/openrouter.js";
import { buildSystemPrompt } from "../../src/eval/prompts.js";
import { latestRuns, renderReport, summarize } from "../../src/eval/report.js";
import type { RunRecord } from "../../src/eval/report.js";
import { main, mockAnswer, parseArgs } from "../../src/eval/run.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-harness-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const SMOKE = "tests/fixtures/eval-smoke.yaml";

const run = (caseId: string, rep: number, correct: boolean | null, extra: Partial<RunRecord> = {}): RunRecord => ({
  case_id: caseId, subset: "version_deadline", knowable_before_omnibus: false, kind: "generation", model: "m", arm: "plain", rep, raw: "", parsed: correct === null ? null : {},
  score: { correct, checks: {} }, prompt_tokens: 0, completion_tokens: 0, cost: 0.01, tool_calls: [], requests: 1, finish_reason: "stop", status: 200, latency_ms: 0, ...extra,
});

describe("report: majority rule and intervals", () => {
  it("three repetitions: wrong if at least 2 of 3 are wrong; any-wrong counted separately", () => {
    const lines = [
      run("A", 0, false), run("A", 1, false), run("A", 2, true), // majority wrong
      run("B", 0, false), run("B", 1, true), run("B", 2, true), // one wrong only
      run("C", 0, true), run("C", 1, true), run("C", 2, true),
    ];
    const [c] = summarize(lines);
    expect(c).toMatchObject({ cases: 3, errors_majority: 1, errors_any: 2, runs: 9 });
    expect(c?.ci?.upper).toBeGreaterThan(0.3);
  });
  it("one repetition: the single run decides; unparseable runs are not scored", () => {
    const [c] = summarize([run("A", 0, false), run("B", 0, true), run("C", 0, null)]);
    expect(c).toMatchObject({ cases: 2, errors_majority: 1, errors_any: 1, unparseable_runs: 1, api_error_runs: 0 });
  });
  it("API errors are separate from unparseable answers; tool-call rate only on the tools arm", () => {
    const [c] = summarize([run("A", 0, null, { error: "HTTP 500", arm: "tools" }), run("B", 0, true, { arm: "tools", tool_calls: [{ name: "aiact_diff", arguments: "{}" }] })]);
    expect(c).toMatchObject({ api_error_runs: 1, unparseable_runs: 0, tool_call_rate: 0.5 });
  });
  it("a resumed run supersedes the failed one, but its cost stays", () => {
    const lines = [run("A", 0, null, { error: "HTTP 500", cost: 0.02 }), run("A", 0, true)];
    expect(latestRuns(lines)).toHaveLength(1);
    expect(summarize(lines)[0]).toMatchObject({ cases: 1, errors_majority: 0, api_error_runs: 0 });
    expect(summarize(lines)[0]?.cost_usd).toBeCloseTo(0.03);
  });
  it("report names Clopper-Pearson and splits by subset and knowable_before_omnibus", () => {
    const md = renderReport({ cases_file: "x", prompt_version: "v", status: "complete", dry_run: false, reps: 1, max_usd: 1, total_cost_usd: 0.01 }, [run("A", 0, false)]);
    expect(md).toMatch(/Clopper-Pearson/);
    expect(md).toMatch(/## Subset evaluation/);
    expect(md).toMatch(/## knowable_before_omnibus = true/);
  });
});

describe("budget and estimates", () => {
  const calls = [
    { model: "a", arm: "plain", status: 200, cost: 0.01, requests: 1 },
    { model: "a", arm: "plain", status: 200, cost: 0.03, requests: 1 },
    { model: "a", arm: "plain", status: 500, cost: 9, requests: 1 },
    { model: "b", arm: "plain", status: 200, cost: 0.1, requests: 1 },
  ];
  it("estimate is the probe mean times 1.5; unknown models use the most expensive cell of the arm", () => {
    const e = new Estimator(calls);
    expect(e.estimate("a", "plain").run).toBeCloseTo(0.03);
    expect(e.estimate("zzz", "plain")).toMatchObject({ source: "arm_max" });
    expect(e.estimate("zzz", "plain").run).toBeCloseTo(0.15);
    expect(e.estimate("zzz", "web").source).toBe("fallback");
  });
  it("observed runs raise the estimate", () => {
    const e = new Estimator(calls);
    e.observe("a", "plain", 0.5);
    expect(e.estimate("a", "plain").run).toBeCloseTo(0.6);
  });
  it("budget refuses a call that would pass the cap", () => {
    const b = new Budget(0.1);
    expect(b.allows(0.1)).toBe(true);
    b.add(0.06);
    expect(b.allows(0.05)).toBe(false);
    expect(b.allows(0.04)).toBe(true);
  });
});

describe("arguments, prompt and mock", () => {
  it("parses arguments with defaults and validates", () => {
    const o = parseArgs(["--cases", "c.yaml", "--models", "a/b, c/d", "--arms", "plain,tools", "--reps", "3", "--max-usd", "0.3", "--out", "o", "--dry-run"]);
    expect(o).toMatchObject({ models: ["a/b", "c/d"], arms: ["plain", "tools"], reps: 3, maxUsd: 0.3, dryRun: true, resume: false, reasoningEffort: "low" });
    expect(() => parseArgs(["--cases", "c", "--models", "a", "--arms", "bing", "--max-usd", "1", "--out", "o"])).toThrow(/unknown arm/);
    expect(() => parseArgs(["--cases", "c", "--models", "a", "--out", "o"])).toThrow(/max-usd/);
  });
  it("system prompt carries the case date and the tools hint only in the tools arm", () => {
    expect(buildSystemPrompt("2026-10-05", "plain")).toContain("Today's date is 2026-10-05");
    expect(buildSystemPrompt("2026-10-05", "plain")).not.toMatch(/tools/);
    expect(buildSystemPrompt("2026-10-05", "tools")).toMatch(/tools/);
  });
  it("mock is wrong exactly on every third case", async () => {
    const { loadCases } = await import("../../src/eval/cases.js");
    const cs = loadCases(SMOKE);
    const c = cs[0];
    if (!c) throw new Error("fixture empty");
    expect(JSON.parse(mockAnswer(c, 0)).date).toBe("2027-12-02");
    expect(JSON.parse(mockAnswer(c, 2)).date).toBe("1999-01-01");
  });
});

describe("main (dry run, resume)", () => {
  const args = (out: string, extra: string[] = []): string[] => ["--dry-run", "--cases", SMOKE, "--models", "mock/a", "--arms", "plain,tools", "--reps", "2", "--max-usd", "0", "--out", out, ...extra];
  it("refuses to overwrite runs.jsonl, resumes without repeating", async () => {
    const out = join(tmp, "dry");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await main(args(out));
    const first = readFileSync(join(out, "runs.jsonl"), "utf8");
    expect(first.trim().split("\n")).toHaveLength(8);
    await expect(main(args(out))).rejects.toThrow(/--resume/);
    await main(args(out, ["--resume"]));
    expect(readFileSync(join(out, "runs.jsonl"), "utf8")).toBe(first);
    expect(JSON.parse(readFileSync(join(out, "results.json"), "utf8")).runs).toBe(8);
    expect(existsSync(join(out, "report.md"))).toBe(true);
    vi.restoreAllMocks();
  });
});

type FetchArgs = [string, { body?: string }];
function stubFetch(handler: (url: string, body: Record<string, unknown>) => unknown): { bodies: Record<string, unknown>[] } {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", async (...a: FetchArgs) => {
    const body = a[1]?.body ? (JSON.parse(a[1].body) as Record<string, unknown>) : {};
    if (a[0].endsWith("/chat/completions")) bodies.push(body);
    return new Response(JSON.stringify(handler(a[0], body)), { status: 200 });
  });
  return { bodies };
}

describe("client with stubbed network", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key-not-a-secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs a tool round locally, sums cost and records the calls", async () => {
    let n = 0;
    const { bodies } = stubFetch(() => {
      n++;
      return n === 1
        ? { model: "x/y", choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: [{ id: "1", type: "function", function: { name: "aiact_get_provision", arguments: '{"id":"art_113","include_children":false}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.01 } }
        : { model: "x/y", choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"date":"2027-12-02"}' } }], usage: { prompt_tokens: 20, completion_tokens: 6, cost: 0.02 } };
    });
    const r = await converse({ key: "k", model: "x/y", arm: "tools", system: "s", user: "u", asOf: "2026-10-05", maxTokens: 3000, temperature: 0, reasoningEffort: "low", title: "t" });
    expect(r).toMatchObject({ text: '{"date":"2027-12-02"}', requests: 2, tool_rounds: 1, status: 200, stopped: false });
    expect(r.cost).toBeCloseTo(0.03);
    expect(r.tool_calls).toEqual([{ name: "aiact_get_provision", arguments: '{"id":"art_113","include_children":false}' }]);
    expect(bodies[0]).toMatchObject({ max_tokens: 3000, temperature: 0, reasoning: { effort: "low" }, usage: { include: true } });
    const second = bodies[1]?.["messages"] as Array<{ role: string; content?: string }>;
    expect(second.at(-1)?.role).toBe("tool");
    expect(second.at(-1)?.content).toContain("art_113");
    expect(JSON.stringify(bodies)).not.toContain("test-key");
  });

  it("stops at the cost cap and marks the status budget_stop", async () => {
    stubFetch((url) =>
      url.endsWith("/models")
        ? { data: [{ id: "x/y", supported_parameters: ["temperature", "reasoning"] }] }
        : { model: "x/y", choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"verdict":"incorrect","date":"2027-12-02","version":"consolidated","article":"Article 113"}' } }], usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.05 } },
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "capped");
    await main(["--cases", SMOKE, "--models", "x/y", "--arms", "plain", "--reps", "3", "--max-usd", "0.12", "--out", out]);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.status).toBe("budget_stop");
    expect(res.runs).toBe(2);
    expect(res.total_cost_usd).toBeCloseTo(0.1);
    expect(res.total_cost_usd).toBeLessThanOrEqual(0.12);
    expect(res.request_params["x/y"]).toEqual({ temperature: true, reasoning_effort: "low" });
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/budget_stop/);
  });
});
