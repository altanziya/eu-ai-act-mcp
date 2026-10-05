import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Estimator } from "../../src/eval/budget.js";
import { MAX_TOOL_CALLS_PER_ROUND, converse } from "../../src/eval/openrouter.js";
import type { RunRecord } from "../../src/eval/report.js";
import { main } from "../../src/eval/run.js";
import { casesYaml } from "./helpers/eval-runs.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-budget-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

type FetchArgs = [string, { body?: string }];
const toolCall = (id: string, name = "aiact_get_provision", args = '{"id":"art_113","include_children":false}') => ({ id, type: "function", function: { name, arguments: args } });
const toolResponse = (n: number, cost?: number) => ({
  model: "x/y",
  choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: Array.from({ length: n }, (_, i) => toolCall(`c${i}`)) } }],
  usage: { prompt_tokens: 1, completion_tokens: 1, ...(cost === undefined ? {} : { cost }) },
});
const answer = (cost?: number) => ({
  model: "x/y",
  choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"date":"2027-12-02"}' } }],
  usage: { prompt_tokens: 1, completion_tokens: 1, ...(cost === undefined ? {} : { cost }) },
});

function stubFetch(handler: (n: number, body: Record<string, unknown>) => unknown): { bodies: Record<string, unknown>[] } {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", async (...a: FetchArgs) => {
    const body = a[1]?.body ? (JSON.parse(a[1].body) as Record<string, unknown>) : {};
    if (a[0].endsWith("/models")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    bodies.push(body);
    const out = handler(bodies.length, body);
    if (out instanceof Error) throw out;
    return new Response(JSON.stringify(out), { status: 200 });
  });
  return { bodies };
}

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key-not-a-secret");
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const opts = { key: "k", model: "x/y", arm: "tools" as const, system: "s", user: "u", asOf: "2026-10-05", maxTokens: 3000, title: "t" };

describe("missing usage.cost", () => {
  it("books the per-request estimate and marks the run", async () => {
    stubFetch(() => answer());
    const booked: number[] = [];
    const r = await converse({ ...opts, arm: "plain", fallbackRequestCost: 0.03, onCost: (c) => booked.push(c) });
    expect(r).toMatchObject({ cost_estimated: true, requests: 1 });
    expect(r.error).toBeUndefined();
    expect(r.cost).toBeCloseTo(0.03);
    expect(booked).toEqual([0.03]);
  });
  it("a reported cost is booked as is and not marked", async () => {
    stubFetch(() => answer(0.011));
    const r = await converse({ ...opts, arm: "plain", fallbackRequestCost: 0.03 });
    expect(r).toMatchObject({ cost_estimated: false });
    expect(r.cost).toBeCloseTo(0.011);
  });
  it("a reported cost of 0 is a reported cost", async () => {
    stubFetch(() => answer(0));
    const r = await converse({ ...opts, arm: "plain", fallbackRequestCost: 0.03 });
    expect(r).toMatchObject({ cost: 0, cost_estimated: false });
  });
  it("an exception after sending (timeout, lost connection) books the estimate", async () => {
    stubFetch(() => new Error("The operation was aborted due to timeout"));
    const booked: number[] = [];
    const r = await converse({ ...opts, arm: "plain", fallbackRequestCost: 0.04, onCost: (c) => booked.push(c) });
    expect(r.error).toMatch(/timeout/);
    expect(r).toMatchObject({ requests: 1, cost_estimated: true, status: -1 });
    expect(r.cost).toBeCloseTo(0.04);
    expect(booked).toEqual([0.04]);
  });
  it("end to end: the run is stored with cost_estimated and counts against the cap", async () => {
    stubFetch(() => answer());
    vi.spyOn(Estimator, "fromFile").mockReturnValue(new Estimator([{ model: "x/y", arm: "plain", status: 200, cost: 0.02, requests: 1 }]));
    const cases = join(tmp, "two.yaml");
    writeFileSync(cases, casesYaml(2));
    const out = join(tmp, "estimated");
    await main(["--cases", cases, "--models", "x/y", "--arms", "plain", "--reps", "1", "--max-usd", "1", "--out", out, "--primary-model", "x/y"]);
    const runs = readFileSync(join(out, "runs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as RunRecord);
    expect(runs.every((r) => r.cost_estimated === true && Math.abs(r.cost - 0.03) < 1e-9)).toBe(true);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.total_cost_usd).toBeCloseTo(0.06);
    expect(res.cells[0].cost_estimated_runs).toBe(2);
    expect(readFileSync(join(out, "report.md"), "utf8")).toMatch(/2 runs estimated/);
  });
});

describe("budget stop in the middle of the tool loop", () => {
  it("converse: refusing the second request ends the run without it", async () => {
    const { bodies } = stubFetch(() => toolResponse(1, 0.05));
    const r = await converse({ ...opts, beforeRequest: (n) => n === 0 });
    expect(bodies).toHaveLength(1);
    expect(r).toMatchObject({ stopped: true, requests: 1, tool_rounds: 1 });
    expect(r.tool_calls).toHaveLength(1);
  });
  it("main: the run is kept as incomplete, status budget_stop, spend stays under the cap", async () => {
    stubFetch(() => toolResponse(1, 0.05));
    // estimate per run 0.06 (2 requests): first request fits under 0.07, the rest of the run (0.03 after 0.05 spent) does not
    vi.spyOn(Estimator, "fromFile").mockReturnValue(new Estimator([{ model: "x/y", arm: "tools", status: 200, cost: 0.04, requests: 2 }]));
    const cases = join(tmp, "one.yaml");
    writeFileSync(cases, casesYaml(1));
    const out = join(tmp, "mid-loop");
    await main(["--cases", cases, "--models", "x/y", "--arms", "tools", "--reps", "1", "--max-usd", "0.07", "--out", out, "--primary-model", "x/y"]);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.status).toBe("budget_stop");
    expect(res.total_cost_usd).toBeCloseTo(0.05);
    expect(res.total_cost_usd).toBeLessThanOrEqual(0.07);
    const runs = readFileSync(join(out, "runs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as RunRecord);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ incomplete: true, requests: 1 });
  });
});

describe("tool call limit per round", () => {
  it("executes the first four calls of a round and answers the rest with an error result", async () => {
    const { bodies } = stubFetch((n) => (n === 1 ? toolResponse(6, 0.01) : answer(0.01)));
    const r = await converse(opts);
    expect(MAX_TOOL_CALLS_PER_ROUND).toBe(4);
    const second = bodies[1]?.["messages"] as Array<{ role: string; content?: string; tool_call_id?: string }>;
    const tools = second.filter((m) => m.role === "tool");
    expect(tools).toHaveLength(6); // every tool_call id is answered
    expect(tools.slice(0, 4).every((m) => m.content?.includes("art_113"))).toBe(true);
    for (const m of tools.slice(4)) expect(JSON.parse(m.content as string)).toEqual({ error: "tool call limit per round" });
    expect(r.tool_calls).toHaveLength(6);
    expect(r.tool_calls.filter((c) => c.rejected).length).toBe(2);
    expect(r.text).toBe('{"date":"2027-12-02"}');
  });
  it("the limit applies per round, not per run", async () => {
    const { bodies } = stubFetch((n) => (n <= 2 ? toolResponse(4, 0.01) : answer(0.01)));
    const r = await converse(opts);
    expect(bodies).toHaveLength(3);
    expect(r.tool_calls.filter((c) => c.rejected)).toHaveLength(0);
    expect(r.tool_calls).toHaveLength(8);
  });
});
