/** Node-only: loads data/deadlines.json once per process. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import type { DeadlineTable } from "./deadlines.js";

let table: DeadlineTable | undefined;
export function loadDeadlines(): DeadlineTable {
  table ??= JSON.parse(readFileSync(join(REPO_ROOT, "data/deadlines.json"), "utf8")) as DeadlineTable;
  return table;
}
