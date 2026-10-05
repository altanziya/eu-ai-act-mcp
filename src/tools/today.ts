/** Today as a local ISO date (isomorphic; the only clock read of the tools, used where `as_of` has a default). */
export function todayIso(d: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  // local components: toISOString would shift the date in UTC between 0 and 2 o'clock
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
