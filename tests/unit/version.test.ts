import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createServer } from "../../src/mcp/server.js";
import { packageVersion } from "../../src/version.js";

const pkgVersion = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;

describe("package version", () => {
  it("packageVersion() is the version in package.json", () => {
    expect(pkgVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(packageVersion()).toBe(pkgVersion);
  });
  it("the MCP server reports the version from package.json on initialize", async () => {
    const client = new Client({ name: "test", version: "0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([createServer().connect(a), client.connect(b)]);
    expect(client.getServerVersion()).toMatchObject({ name: "eu-ai-act-mcp", version: pkgVersion });
    await client.close();
  });
});
