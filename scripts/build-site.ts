/**
 * npm run build:site: bundle the verify page (src/verify-core/browser.ts -> site/verify/verify.js), copy release/ to
 * site/release/ and make sure site/keys/index.json exists. Outputs are git-ignored except site/verify/index.html and site/keys/.
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/config.js";

const site = join(REPO_ROOT, "site");
mkdirSync(join(site, "verify"), { recursive: true });
const outfile = join(site, "verify/verify.js");
await build({
  entryPoints: [join(REPO_ROOT, "src/verify-core/browser.ts")],
  outfile,
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "es2022",
  legalComments: "none",
  logLevel: "warning",
});

rmSync(join(site, "release"), { recursive: true, force: true });
const releaseRoot = join(REPO_ROOT, "release");
if (existsSync(releaseRoot)) {
  cpSync(releaseRoot, join(site, "release"), { recursive: true, filter: (src) => !/[\\/]\.tmp-/.test(src) });
}
mkdirSync(join(site, "keys"), { recursive: true });
const keysIndex = join(site, "keys/index.json");
if (!existsSync(keysIndex)) writeFileSync(keysIndex, `${JSON.stringify({ keys: [] }, null, 2)}\n`, "utf8");

const releases = existsSync(join(site, "release")) ? readdirSync(join(site, "release")).filter((d) => existsSync(join(site, "release", d, "manifest.json"))) : [];
console.log(`site: bundle ${statSync(outfile).size} bytes, releases: ${releases.join(", ") || "none"}`);
