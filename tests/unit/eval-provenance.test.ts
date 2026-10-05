import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { PROMPT_VERSION } from "../../src/eval/prompts.js";
import { SCORER_VERSION } from "../../src/eval/score.js";
import type { RunRecord } from "../../src/eval/report.js";
import { main } from "../../src/eval/run.js";
import { casesYaml } from "./helpers/eval-runs.js";

const tmp = mkdtempSync(join(tmpdir(), "eval-prov-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

const cases = join(tmp, "cases.yaml");
writeFileSync(cases, casesYaml(3));
const args = (out: string, extra: string[] = []): string[] => ["--dry-run", "--cases", cases, "--models", "mock/a", "--arms", "plain", "--reps", "1", "--max-usd", "0", "--out", out, ...extra];
const read = (path: string): RunRecord[] => readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l) as RunRecord);
const write = (path: string, rs: RunRecord[]): void => writeFileSync(path, rs.map((r) => `${JSON.stringify(r)}\n`).join(""));

describe("provenance", () => {
  it("every stored run carries prompt_version; results.json and report.md carry versions, rescored_runs and dry_run", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "a");
    await main(args(out));
    expect(read(join(out, "runs.jsonl")).every((r) => r.prompt_version === PROMPT_VERSION)).toBe(true);
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res).toMatchObject({ prompt_version: PROMPT_VERSION, scorer_version: SCORER_VERSION, rescored_runs: 0, dry_run: true });
    expect(SCORER_VERSION).toBe("eval-scorer-v2");
    const md = readFileSync(join(out, "report.md"), "utf8");
    expect(md).toContain(`Prompt version: ${PROMPT_VERSION}`);
    expect(md).toContain(`Scorer version: ${SCORER_VERSION}`);
    expect(md).toContain("Re-scored runs (on resume): 0");
    expect(md).toContain("Dry run (all runs mock): true");
  });

  it("dry_run is true only if all runs are mock", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "mixed");
    await main(args(out));
    const path = join(out, "runs.jsonl");
    const rs = read(path);
    const { mock: _mock, ...real } = rs[0] as RunRecord;
    write(path, [real as RunRecord, ...rs.slice(1)]);
    await main(args(out, ["--resume"]));
    const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
    expect(res.dry_run).toBe(false);
    expect(readFileSync(join(out, "report.md"), "utf8")).not.toMatch(/Dry run: mock model/);
  });

  it("--resume counts re-scored runs, cumulative over resumes", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "rescored");
    await main(args(out));
    const path = join(out, "runs.jsonl");
    for (const expected of [1, 2]) {
      const rs = read(path);
      rs[0] = { ...(rs[0] as RunRecord), score: { correct: false, checks: { date: false } } };
      write(path, rs);
      await main(args(out, ["--resume"]));
      expect(JSON.parse(readFileSync(join(out, "results.json"), "utf8")).rescored_runs).toBe(expected);
    }
  });

  it("--resume aborts if stored runs were made with another prompt_version, and leaves the file alone", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "old-prompt");
    await main(args(out));
    const path = join(out, "runs.jsonl");
    const rs = read(path);
    rs[1] = { ...(rs[1] as RunRecord), prompt_version: "eval-prompt-v0" };
    write(path, rs);
    const before = readFileSync(path, "utf8");
    await expect(main(args(out, ["--resume"]))).rejects.toThrow(/prompt_version eval-prompt-v0/);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("--resume also aborts for stored runs without any prompt_version", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const out = join(tmp, "no-prompt");
    await main(args(out));
    const path = join(out, "runs.jsonl");
    write(path, read(path).map(({ prompt_version: _p, ...r }) => r as RunRecord));
    await expect(main(args(out, ["--resume"]))).rejects.toThrow(/prompt_version none/);
  });
});
