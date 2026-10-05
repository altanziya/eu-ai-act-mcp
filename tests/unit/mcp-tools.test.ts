import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../../src/mcp/server.js";

async function connect(extended = true): Promise<Client> {
  const server = createServer({ extended });
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}
const call = async (client: Client, name: string, args: Record<string, unknown>): Promise<{ isError?: boolean; body: Record<string, unknown> }> => {
  const r = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: Array<{ text: string }> };
  const text = (r.content[0] as { text: string }).text;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text }; // schema validation errors of the SDK are plain text
  }
  return { ...(r.isError ? { isError: true } : {}), body };
};

describe("MCP server tools (day 5a)", () => {
  it("the default server lists exactly the three tools of the day-2 golden test", async () => {
    const client = await connect(false);
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual(["aiact_diff", "aiact_get_provision", "aiact_verify_citation"]);
    await client.close();
  });
  it("lists five read-only tools in extended mode, with as_of documented where the version depends on it", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["aiact_audit_text", "aiact_diff", "aiact_get_provision", "aiact_search", "aiact_verify_citation"]);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
    const props = (n: string): Record<string, { description?: string }> => (tools.find((t) => t.name === n)?.inputSchema.properties ?? {}) as Record<string, { description?: string }>;
    for (const n of ["aiact_get_provision", "aiact_search", "aiact_audit_text", "aiact_verify_citation"]) expect(props(n)["as_of"]?.description).toMatch(/Reference date/);
    expect(tools.find((t) => t.name === "aiact_get_provision")?.description).toMatch(/as_of/);
    expect(tools.find((t) => t.name === "aiact_audit_text")?.description).toMatch(/not legal advice/);
    await client.close();
  });
  it("aiact_get_provision follows as_of", async () => {
    const client = await connect();
    expect((await call(client, "aiact_get_provision", { id: "art_6.par_2", as_of: "2026-03-15" })).body["version"]).toBe("32024R1689");
    const r = await call(client, "aiact_get_provision", { id: "art_6.par_2", as_of: "2026-10-05" });
    expect(r.body["version"]).toBe("02024R1689-20260727");
    expect(r.body["applicability"]).toMatchObject({ state: "not_yet_applicable_until", until: "2027-12-02" });
    await client.close();
  });
  it("aiact_search and aiact_audit_text return results; bad input is an error result", async () => {
    const client = await connect();
    const s = await call(client, "aiact_search", { query: "bias detection and correction special categories of personal data", as_of: "2026-10-05", limit: 3 });
    expect((s.body["results"] as Array<{ id: string }>).length).toBe(3);
    expect(String((s.body["results"] as Array<{ id: string }>)[0]?.id)).toMatch(/^art_4a/);
    const a = await call(client, "aiact_audit_text", { text: "Article 10(5) allows it.", as_of: "2026-10-05" });
    expect((a.body["findings"] as Array<{ kind: string }>)[0]?.kind).toBe("removed_provision");
    expect((await call(client, "aiact_audit_text", { text: "x", as_of: "tomorrow" })).isError).toBe(true);
    expect((await call(client, "aiact_audit_text", { text: "See Article 9(2)." })).body["as_of"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await client.close();
  });
});
