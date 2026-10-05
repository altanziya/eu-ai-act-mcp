/**
 * MCP server (stdio) for the EU AI Act provision tree: aiact_get_provision, aiact_diff, aiact_verify_citation and, in
 * extended mode (`npm run mcp:extended`, `--extended`, `AIACT_MCP_EXTENDED=1`), aiact_search, aiact_audit_text and aiact_obligations.
 * The default stays the three tools of the frozen day-2 golden test (exactly three tools listed). All tools are read-only. Results are JSON text in content[0]. Start: `npm run mcp`.
 * stdout carries the protocol only; nothing else may be written to it.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { V2024, V2026 } from "../config.js";
import { auditText } from "../tools/audit.js";
import { diffProvision } from "../tools/diffProvision.js";
import { getProvision } from "../tools/getProvision.js";
import { aiactObligations, describeProfile } from "../tools/obligations.js";
import { aiactSearch } from "../tools/search.js";
import { isIsoDate } from "../tools/corpus.js";
import { todayIso } from "../tools/today.js";
import { verifyCitation } from "../tools/verifyCitation.js";

const version = z.enum([V2024, V2026]);
const lang = z.enum(["en", "de"]);
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const localDateIso = todayIso;

/** zod schema of the company profile, generated from `profile_fields` of data/obligations.json (loose: the tool names the allowed fields itself). */
function profileSchema(): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, f] of Object.entries(describeProfile())) {
    let t: z.ZodType;
    if (f.type === "boolean") t = z.boolean().nullable();
    else if (f.type === "enum_array") t = z.array(z.enum(f.values as [string, ...string[]])).min(1);
    else if (f.type === "enum") t = z.enum(f.values as [string, ...string[]]).nullable();
    else if (f.type === "date") t = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isIsoDate, "not a valid calendar date").nullable();
    else t = z.unknown();
    shape[name] = (f.required ? t : t.optional()).describe(f.description);
  }
  return z.looseObject(shape) as unknown as z.ZodType<Record<string, unknown>>;
}

const json = (value: unknown): { content: Array<{ type: "text"; text: string }> } => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
/** Minified JSON (the obligations result is large; no indentation saves a third). */
const jsonCompact = (value: unknown): { content: Array<{ type: "text"; text: string }> } => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
const failure = (e: unknown): { isError: true; content: Array<{ type: "text"; text: string }> } => ({
  isError: true,
  content: [{ type: "text", text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }],
});

export interface ServerOptions {
  /** Also register aiact_search, aiact_audit_text (day 5a) and aiact_obligations (day 5b). Default false: tests/golden/day2 expects exactly three tools. */
  extended?: boolean;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "eu-ai-act-mcp", version: "0.1.0" });

  server.registerTool(
    "aiact_get_provision",
    {
      title: "Get provision",
      description:
        `Returns one provision of Regulation (EU) 2024/1689 by id or citation (e.g. "art_50.par_1" or "Article 50(1)"), with all descendants. ` +
        `as_of: reference date; without version the text in force on that date is returned (before 2026-07-27 the Official Journal version ${V2024}, after it the consolidated version ${V2026}); default today. ` +
        `version: ${V2024} (Official Journal) or ${V2026} (consolidated after the Omnibus); an explicit version wins over as_of. Recitals exist only in ${V2024}; asking for one in ${V2026} returns found=false with a fallback. ` +
        `The result carries applicability: whether the provision applies on as_of (from the deadline table). ` +
        `The response lists neighbouring provisions (including ones inserted by the 2026 amendment, such as paragraph 6a); check them before concluding that the Act says nothing more.`,
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

  if (options.extended ?? false) {
    server.registerTool(
      "aiact_search",
      {
        title: "Search provisions",
        description:
          "Full-text search (BM25) over the AI Act in the version in force on as_of: returns the best matching provisions with citation, heading, snippet, score and applicability on as_of (from the deadline table). " +
          `Before 2026-07-27 the Official Journal version ${V2024} is searched (with recitals), after it the consolidated version ${V2026}. Finds provisions by wording; it does not interpret them or say which one applies to a system.`,
        inputSchema: {
          query: z.string().min(1).describe("Search words or a phrase, in the language of lang"),
          as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Reference date YYYY-MM-DD; default today. Selects the version searched."),
          lang: lang.optional().describe("en (default) or de"),
          limit: z.number().int().min(1).max(20).optional().describe("Maximum number of results (default 8, at most 20)"),
        },
        annotations: READ_ONLY,
      },
      (args) => {
        try {
          return json(aiactSearch({ ...args, as_of: args.as_of ?? localDateIso() }));
        } catch (e) {
          return failure(e);
        }
      },
    );

    server.registerTool(
      "aiact_audit_text",
      {
        title: "Audit text",
        description:
          "Checks a text (policy, provider answer, slides, AI-generated answer) against the AI Act in the version in force on as_of: outdated application dates, citations of provisions that were removed or do not exist (with the place a removed provision moved to), and quotations that differ from the wording in force. " +
          "Returns findings with severity, span in the text, expected and found values and sources. Deterministic, no language model. Orientation only, not legal advice; it never certifies compliance.",
        inputSchema: {
          text: z.string().min(1).describe("The text to check (any length; citations like Article 6(2), Annex III, Artikel 9 Absatz 2, dates, and quotations of six or more words next to a citation are checked)"),
          as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Reference date YYYY-MM-DD; default today. Selects the version checked."),
          lang: lang.optional().describe("Language of the text and of the messages; en (default) or de"),
        },
        annotations: READ_ONLY,
      },
      (args) => {
        try {
          return json(auditText({ ...args, as_of: args.as_of ?? localDateIso() }));
        } catch (e) {
          return failure(e);
        }
      },
    );

    server.registerTool(
      "aiact_obligations",
      {
        title: "Obligations navigator",
        description:
          "For a company profile, returns the applicable and upcoming obligations of the AI Act with citation, verbatim quotation, application date on as_of and notes where a legal assessment is needed. " +
          "Dates follow Article 113 and the classification route (Annex III / Annex I); where the literal rule differs the entry carries applies_from_literal and a caveat. Covers the consolidated text from 2026-07-27. " +
          "Deterministic, no language model. Orientation only, not legal advice; it flags legal assessments, it does not make them.",
        inputSchema: {
          profile: profileSchema().describe("Company profile; `role` (array of provider|deployer|importer|distributor|authorised_representative|product_manufacturer) is required, missing flags count as false (uses_or_provides_ai_system: true), other missing fields as unknown"),
          as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Reference date YYYY-MM-DD, not before 2026-07-27; default today"),
          lang: lang.optional().describe("Language of the citations; en (default) or de (quotations stay in English)"),
          detail: z.enum(["compact", "full"]).optional().describe("compact (default): without summary, omnibus_note and profile_echo, quotations cut to 300 characters; full: everything"),
        },
        annotations: READ_ONLY,
      },
      (args) => {
        try {
          return jsonCompact(aiactObligations({ ...args, as_of: args.as_of ?? localDateIso(), detail: args.detail ?? "compact" }));
        } catch (e) {
          return failure(e);
        }
      },
    );
  }

  return server;
}

async function main(): Promise<void> {
  const extended = process.argv.includes("--extended") || process.env["AIACT_MCP_EXTENDED"] === "1";
  await createServer({ extended }).connect(new StdioServerTransport());
}

// Only when started as a program (npm run mcp); importing createServer (tests, the eval harness check) must not open stdio.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
