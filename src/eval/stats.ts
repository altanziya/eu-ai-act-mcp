/** Exact (Clopper-Pearson) binomial confidence interval and the pre-registered E1 decision rule. */

/** log(n!) by summation; n is small (number of cases), so no approximation is needed. */
function logFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

function logPmf(k: number, n: number, p: number): number {
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k) + k * Math.log(p) + (n - k) * Math.log1p(-p);
}

/** P(X <= k) for X ~ Binomial(n, p). */
function cdf(k: number, n: number, p: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += Math.exp(logPmf(i, n, p));
  return Math.min(1, s);
}

/** Bisection for the root of a monotone function f on [0, 1]; `increasing` tells the direction of f. */
function bisect(f: (p: number) => number, target: number, increasing: boolean): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const above = f(mid) > target;
    if (above === increasing) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Two-sided exact interval for k successes in n trials. lower: p with P(X >= k) = alpha/2; upper: p with P(X <= k) = alpha/2.
 * k = 0 gives lower 0, k = n gives upper 1.
 */
export function clopperPearson(k: number, n: number, alpha = 0.05): { lower: number; upper: number } {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1 || k < 0 || k > n) throw new RangeError(`clopperPearson: invalid k=${k}, n=${n}`);
  const a = alpha / 2;
  // P(X >= k | p) = 1 - cdf(k - 1) increases in p; P(X <= k | p) decreases in p.
  const lower = k === 0 ? 0 : bisect((p) => 1 - cdf(k - 1, n, p), a, true);
  const upper = k === n ? 1 : bisect((p) => cdf(k, n, p), a, false);
  return { lower, upper };
}

export type E1Decision = "go" | "undecided" | "not_supported";

/** Pre-registered E1 rule: go if the lower bound of the 95 % interval is >= 0.05; else undecided if n < 45 and errors >= 1; else not supported. */
export function decideE1(r: { errors: number; n: number }): E1Decision {
  if (clopperPearson(r.errors, r.n).lower >= 0.05) return "go";
  if (r.n < 45 && r.errors >= 1) return "undecided";
  return "not_supported";
}
