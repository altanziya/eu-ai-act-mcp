/** Hard cost cap and per-call cost estimates (from the cost probe) for the eval harness. */
import { existsSync, readFileSync } from "node:fs";

export const SAFETY_FACTOR = 1.5;
/** Used when neither the cell nor the arm has probe data. */
export const FALLBACK_ESTIMATE_USD = 0.1;

export interface ProbeCall {
  model: string;
  arm: string;
  status: number;
  cost: number;
  requests?: number;
}

export interface CellEstimate {
  /** Estimated cost of one run (all requests), safety factor included. */
  run: number;
  /** Mean number of requests per run in the probe. */
  requests: number;
  source: "probe" | "arm_max" | "fallback" | "mock";
}

/** Mean cost per run of the successful probe calls, per model x arm, times SAFETY_FACTOR. */
export class Estimator {
  private cells = new Map<string, { run: number; requests: number }>();
  private armMax = new Map<string, { run: number; requests: number }>();
  private observedMax = new Map<string, number>();

  constructor(calls: ProbeCall[] = []) {
    const groups = new Map<string, ProbeCall[]>();
    for (const c of calls) {
      if (c.status < 200 || c.status >= 400) continue;
      const k = `${c.model}\u0000${c.arm}`;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    for (const [k, cs] of groups) {
      const run = (cs.reduce((s, c) => s + c.cost, 0) / cs.length) * SAFETY_FACTOR;
      const requests = cs.reduce((s, c) => s + (c.requests ?? 1), 0) / cs.length;
      this.cells.set(k, { run, requests });
      const arm = k.split("\u0000")[1] as string;
      const prev = this.armMax.get(arm);
      if (!prev || run > prev.run) this.armMax.set(arm, { run, requests });
    }
  }

  static fromFile(path: string): Estimator {
    if (!existsSync(path)) return new Estimator();
    const doc = JSON.parse(readFileSync(path, "utf8")) as { calls?: ProbeCall[] };
    return new Estimator(doc.calls ?? []);
  }

  /** Estimate of the next run of a cell; never below 1.2 x the most expensive run observed in this process. */
  estimate(model: string, arm: string): CellEstimate {
    const own = this.cells.get(`${model}\u0000${arm}`);
    const fallback = this.armMax.get(arm);
    const base: CellEstimate = own
      ? { ...own, source: "probe" }
      : fallback
        ? { ...fallback, source: "arm_max" }
        : { run: FALLBACK_ESTIMATE_USD, requests: arm === "tools" ? 3 : 1, source: "fallback" };
    const seen = this.observedMax.get(`${model}\u0000${arm}`) ?? 0;
    return { ...base, run: Math.max(base.run, seen * 1.2) };
  }

  observe(model: string, arm: string, runCost: number): void {
    const k = `${model}\u0000${arm}`;
    this.observedMax.set(k, Math.max(this.observedMax.get(k) ?? 0, runCost));
  }
}

/** Tracks the summed usage.cost and answers whether the next call still fits under the cap. */
export class Budget {
  spent: number;
  constructor(
    readonly maxUsd: number,
    spent = 0,
  ) {
    this.spent = spent;
  }
  add(cost: number): void {
    this.spent += cost;
  }
  /** False if spent + estimate would exceed the cap. */
  allows(estimate: number): boolean {
    return this.spent + estimate <= this.maxUsd;
  }
}
