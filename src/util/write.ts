import { randomBytes } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * Write a file atomically: the bytes go to a temp file in the same directory, which is then renamed over the target.
 * Concurrent readers see either the old or the new complete file, never a truncated one.
 */
export function writeFileAtomic(path: string, data: string | Uint8Array): void {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    if (typeof data === "string") writeFileSync(tmp, data, "utf8");
    else writeFileSync(tmp, data);
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

/** Deterministic JSON: fixed key order (insertion order), 2-space indent, LF, trailing newline, no timestamp. */
export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeJsonFile(path: string, value: unknown): void {
  writeFileAtomic(path, toJson(value));
}

export function writeTextFile(path: string, text: string): void {
  writeFileAtomic(path, text.endsWith("\n") ? text : `${text}\n`);
}
