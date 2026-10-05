/**
 * MCP server (stdio) for the EU AI Act provision tree: aiact_get_provision, aiact_diff, aiact_verify_citation.
 * All tools are read-only. Results are JSON text in content[0]. Start: `npm run mcp`.
 * stdout carries the protocol only; nothing else may be written to it.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { V2024, V2026 } from "../config.js";
import { diffProvision } from "../tools/diffProvision.js";
import { getProvision } from "../tools/getProvision.js";
import { todayIso } from "../tools/today.js";
import { verifyCitation } from "../tools/verifyCitation.js";

const version = z.enum([V2024, V2026]);
const lang = z.enum(["en", "de"]);
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const localDateIso = todayIso;

const json = (value: unknown): { content: Array<{ type: "text"; text: string }> } => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const failure = (e: unknown): { isError: true; content: Array<{ type: "text"; text: string }> } => ({
  isError: true,
  content: [{ type: "text", text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }],
});

export function createServer(): McpServer {
  const server = new McpServer({ name: "eu-ai-act-mcp", version: "0.1.0" });

  server.registerTool(
    "aiact_get_provision",
    {
      title: "Get provision",
      description:
        `Returns one provision of Regulation (EU) 2024/1689 by id or citation (e.g. "art_50.par_1" or "Article 50(1)"), with all descendants. ` +
        `as_of: reference date; without version the text in force on that date is returned (before 2026-07-27 the Official Journal version ${V2024}, after it the consolidated version ${V2026}); default today. ` +
        `version: ${V2024} (Official Journal) or ${V2026} (consolidated after the Omnibus); an explicit version wins over as_of. Recitals exist only in ${V2024}; asking for one in ${V2026} returns found=false with a fallback. ` +
        `The result carries applicability: whether the provision applies on as_of (from the deadline table).`,
      inputSchema: {
        id: z.string().min(1).describe("Node id (art_50.par_1.a, anx_3.pt_1, rec_12, cpt_3.sct_2) or citation (Article 50(1)(a), Anhang III Nummer 1)"),
        as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Reference date YYYY-MM-DD; default today. Selects the version (before 2026-07-27 the Official Journal version, after it the consolidated version) unless version is given."),
        version: version.optional().describe("Corpus version; default: the version in force on as_of"),
        lang: lang.optional().describe("en (default) or de"),
        include_children: z.boolean().optional().describe("Include all descendants (default true)"),
      },
      annotations: READ_ONLY,
    },
    (args) => {
      try {
        return json(getProvision(args));
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "aiact_diff",
    {
      title: "Diff provision",
      description: `What happened to a provision between ${V2024} and ${V2026} (Omnibus, amending act 32026R1744): unchanged, changed (with word diff), added, removed, moved.`,
      inputSchema: {
        id: z.string().min(1).describe("Node id or citation"),
        lang: lang.optional().describe("en (default) or de"),
      },
      annotations: READ_ONLY,
    },
    (args) => {
      try {
        return json(diffProvision(args));
      } catch (e) {
        return failure(e);
      }
    },
  );

  server.registerTool(
    "aiact_verify_citation",
    {
      title: "Verify citation",
      description:
        "Checks that a quotation exists in the AI Act text (V0, with pinpoint), whether it applies on as_of (V1, from a deadline table), and its language (V2). " +
        "It never checks that the text supports a claim (support_checked is always false) and never certifies compliance.",
      inputSchema: {
        quote: z.string().min(1).describe("The quoted wording (at least 6 words; [...] marks omissions)"),
        claimed_ref: z.string().optional().describe("Where the quote is claimed to be, e.g. Article 50(1) or art_50.par_1"),
        as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Reference date YYYY-MM-DD; default today. Before 2026-07-27 the Official Journal version is checked, after it the consolidated version."),
        lang: lang.optional().describe("Language of the quote; en (default) or de"),
      },
      annotations: READ_ONLY,
    },
    (args) => {
      try {
        return json(verifyCitation({ ...args, as_of: args.as_of ?? localDateIso() }));
      } catch (e) {
        return failure(e);
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

// Only when started as a program (npm run mcp); importing createServer (tests, the eval harness check) must not open stdio.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
