import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "eu-ai-act-mcp";

let cached: string | undefined;

/**
 * The version from this package's package.json, so it is stated in one place only. Searches upwards from the directory
 * of this file for a package.json named "eu-ai-act-mcp"; this works from the sources (src/), from a bundle one level
 * below the package root (dist/) and from any deeper location.
 */
export function packageVersion(): string {
  if (cached !== undefined) return cached;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const file = join(dir, "package.json");
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string };
      if (pkg.name === PACKAGE_NAME && typeof pkg.version === "string") return (cached = pkg.version);
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`package.json of ${PACKAGE_NAME} not found`);
    dir = parent;
  }
}
