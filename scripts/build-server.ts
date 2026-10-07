/**
 * npm run build: bundle the MCP server (src/mcp/server.ts) into dist/server.js, the file the `eu-ai-act-mcp` bin points to.
 * Dependencies stay external (they are installed next to the package); the data files are read from the package root at runtime.
 */
import { build } from "esbuild";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/config.js";

const outfile = join(REPO_ROOT, "dist/server.js");

await build({
  entryPoints: [join(REPO_ROOT, "src/mcp/server.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "warning",
});
chmodSync(outfile, 0o755);
console.log("built dist/server.js");
