/** Node-only: loads data/obligations.json once per process. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../config.js";
import type { ObligationsData } from "./obligationsCore.js";

let data: ObligationsData | undefined;
export function loadObligations(): ObligationsData {
  data ??= JSON.parse(readFileSync(join(REPO_ROOT, "data/obligations.json"), "utf8")) as ObligationsData;
  return data;
}
