import { writeFileSync } from "node:fs";

/** Deterministic JSON: fixed key order (insertion order), 2-space indent, LF, trailing newline, no timestamp. */
export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeJsonFile(path: string, value: unknown): void {
  writeFileSync(path, toJson(value), "utf8");
}

export function writeTextFile(path: string, text: string): void {
  writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}
