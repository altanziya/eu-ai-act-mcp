/** npm run release -- --id <release_id>: data/ -> release/<release_id>/ with manifest.json. */
import { parseArgs } from "node:util";
import { sha256Hex, manifestBytes } from "../src/release/manifest.js";
import { buildRelease } from "../src/release/release.js";

const { values } = parseArgs({ options: { id: { type: "string" } }, strict: true });
if (!values.id) {
  console.error("usage: npm run release -- --id <release_id>");
  process.exit(2);
}
const { dir, manifest } = buildRelease({ releaseId: values.id });
console.log(`release ${manifest.release_id}: ${manifest.files.length} files in ${dir}`);
console.log(`manifest sha256 ${sha256Hex(manifestBytes(manifest))}`);
