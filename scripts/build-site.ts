/**
 * npm run build:site: bundle the browser pages (verify, document checker, obligations navigator), copy release/ to
 * site/release/ and make sure site/keys/index.json exists. The id of the newest release is written into the two tool
 * bundles; data/obligations.json is copied to site/obligations/data/. Generated files are git-ignored (see .gitignore);
 * the HTML pages, site/app.css and site/keys/ are committed.
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/config.js";
import { writeFileAtomic } from "../src/util/write.js";

const site = join(REPO_ROOT, "site");

rmSync(join(site, "release"), { recursive: true, force: true });
const releaseRoot = join(REPO_ROOT, "release");
if (existsSync(releaseRoot)) {
  cpSync(releaseRoot, join(site, "release"), { recursive: true, filter: (src) => !/[\\/]\.tmp-/.test(src) });
}
mkdirSync(join(site, "keys"), { recursive: true });
const keysIndex = join(site, "keys/index.json");
if (!existsSync(keysIndex)) writeFileAtomic(keysIndex, `${JSON.stringify({ keys: [] }, null, 2)}\n`);

const releases = existsSync(join(site, "release")) ? readdirSync(join(site, "release")).filter((d) => existsSync(join(site, "release", d, "manifest.json"))).sort() : [];
const releaseId = releases[releases.length - 1] ?? "";

const bundles: Array<{ entry: string; out: string; withRelease: boolean }> = [
  { entry: "src/verify-core/browser.ts", out: "verify/verify.js", withRelease: false },
  { entry: "src/web/audit.ts", out: "audit/audit.js", withRelease: true },
  { entry: "src/web/obligations.ts", out: "obligations/obligations.js", withRelease: true },
];
const sizes: string[] = [];
for (const b of bundles) {
  const outfile = join(site, b.out);
  mkdirSync(join(outfile, ".."), { recursive: true });
  await build({
    entryPoints: [join(REPO_ROOT, b.entry)],
    outfile,
    bundle: true,
    format: "esm",
    minify: true,
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    logLevel: "warning",
    ...(b.withRelease ? { define: { __RELEASE_ID__: JSON.stringify(releaseId) } } : {}),
  });
  sizes.push(`${b.out} ${statSync(outfile).size} bytes`);
}

mkdirSync(join(site, "obligations/data"), { recursive: true });
cpSync(join(REPO_ROOT, "data/obligations.json"), join(site, "obligations/data/obligations.json"));

console.log(`site: bundles ${sizes.join(", ")}; releases: ${releases.join(", ") || "none"}; tools use ${releaseId || "no release"}`);
