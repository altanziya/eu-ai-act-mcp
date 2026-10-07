import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tsx = join(root, "node_modules/.bin/tsx");
const entry = join(root, "src/mcp/server.ts");
const bundle = join(root, "dist/server.js");
const pkgVersion = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;

describe("MCP server over stdio", () => {
  it("answers initialize, tools/list and tools/call in a child process and closes cleanly", async () => {
    // An unknown argument (--extended from older configurations) must be ignored.
    const transport = new StdioClientTransport({ command: tsx, args: [entry, "--extended"], cwd: root, stderr: "pipe" });
    const client = new Client({ name: "stdio-test", version: "0" });
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toMatchObject({ name: "eu-ai-act-mcp", version: pkgVersion });

      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(["aiact_audit_text", "aiact_diff", "aiact_get_provision", "aiact_obligations", "aiact_search", "aiact_verify_citation"]);

      const res = (await client.callTool({ name: "aiact_get_provision", arguments: { id: "art_6" } })) as { isError?: boolean; content: Array<{ text: string }> };
      expect(res.isError).toBeFalsy();
      const body = JSON.parse((res.content[0] as { text: string }).text) as { found: boolean };
      expect(body.found).toBe(true);
    } finally {
      await client.close();
    }
  }, 20_000);

  it("prints only the version line on stdout for --version and exits with 0", () => {
    const r = spawnSync(tsx, [entry, "--version"], { cwd: root, encoding: "utf8", timeout: 20_000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(`${pkgVersion}\n`);
  }, 20_000);

  it("prints a short usage text for --help and exits with 0", () => {
    const r = spawnSync(tsx, [entry, "--help"], { cwd: root, encoding: "utf8", timeout: 20_000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("aiact_get_provision");
    expect(r.stdout).toContain("no network");
  }, 20_000);

});

describe("built bundle dist/server.js", () => {
  // dist/ is produced by `npm ci` (prepare). Never skip silently: build once when it is missing.
  beforeAll(() => {
    if (existsSync(bundle)) return;
    const b = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", timeout: 60_000 });
    expect(b.status, `npm run build failed: ${b.stderr}`).toBe(0);
    expect(existsSync(bundle)).toBe(true);
  }, 70_000);

  it("prints only the version line on stdout for --version and exits with 0", () => {
    const r = spawnSync(process.execPath, [bundle, "--version"], { cwd: root, encoding: "utf8", timeout: 20_000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(`${pkgVersion}\n`);
  }, 20_000);

  it("answers initialize and tools/list with the six tools over stdio", async () => {
    const transport = new StdioClientTransport({ command: process.execPath, args: [bundle], cwd: root, stderr: "pipe" });
    const client = new Client({ name: "bundle-test", version: "0" });
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toMatchObject({ name: "eu-ai-act-mcp", version: pkgVersion });
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(["aiact_audit_text", "aiact_diff", "aiact_get_provision", "aiact_obligations", "aiact_search", "aiact_verify_citation"]);
    } finally {
      await client.close();
    }
  }, 20_000);
});
