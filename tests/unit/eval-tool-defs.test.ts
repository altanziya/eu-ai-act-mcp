import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../../src/mcp/server.js";
import { TOOL_DEFS } from "../../src/eval/openrouter.js";

interface Schema {
  required?: string[];
  properties?: Record<string, { description?: string; enum?: string[]; type?: string; pattern?: string }>;
}

async function serverTools(): Promise<Array<{ name: string; description?: string; inputSchema: Schema }>> {
  const server = createServer();
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools as Array<{ name: string; description?: string; inputSchema: Schema }>;
}

describe("the eval's tools arm offers the real product", () => {
  it("offers the three pre-registered tools of the MCP server, with identical descriptions", async () => {
    const tools = await serverTools();
    expect(TOOL_DEFS.map((d) => d.function.name).sort()).toEqual(["aiact_diff", "aiact_get_provision", "aiact_verify_citation"]);
    for (const d of TOOL_DEFS) expect(tools.map((t) => t.name), d.function.name).toContain(d.function.name);
    for (const d of TOOL_DEFS) {
      const t = tools.find((x) => x.name === d.function.name);
      expect(d.function.description, d.function.name).toBe(t?.description);
    }
  });
  it("has the same parameters (names, required, enums, descriptions)", async () => {
    const tools = await serverTools();
    for (const d of TOOL_DEFS) {
      const t = tools.find((x) => x.name === d.function.name);
      const p = d.function.parameters as unknown as Schema;
      expect(Object.keys(p.properties ?? {}).sort(), d.function.name).toEqual(Object.keys(t?.inputSchema.properties ?? {}).sort());
      expect([...(p.required ?? [])].sort(), d.function.name).toEqual([...(t?.inputSchema.required ?? [])].sort());
      for (const [k, v] of Object.entries(p.properties ?? {})) {
        const sv = t?.inputSchema.properties?.[k];
        expect(v.description, `${d.function.name}.${k}`).toBe(sv?.description);
        expect(v.enum, `${d.function.name}.${k}`).toEqual(sv?.enum);
      }
    }
  });
});
