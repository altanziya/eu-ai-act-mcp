/** aiact_get_provision: one node (with all descendants) of a corpus version and language. */
import { V2024, V2026 } from "../config.js";
import type { ProvisionNode } from "../parser/types.js";
import { descendants, isLang, isVersion, otherVersion } from "./corpus.js";
import { loadCorpus } from "./corpus-fs.js";
import type { Lang, Version } from "./corpus.js";
import { notice } from "./notice.js";
import { parseRef } from "./refParser.js";
import type { Notice } from "./notice.js";

export interface GetProvisionInput {
  id: string;
  version?: Version;
  lang?: Lang;
  include_children?: boolean;
}
export interface GetProvisionResult {
  found: boolean;
  version: Version;
  lang: Lang;
  node?: ProvisionNode;
  /** All descendants in document order (only with include_children, which defaults to true). */
  children?: ProvisionNode[];
  /** Heading and text of the node and, with include_children, all descendants, in `order`, joined by "\n". */
  text_full?: string;
  reason?: "unknown_id" | "not_in_consolidated_version" | "not_in_version";
  /** The same id in the other version, when the requested version does not contain it (F66: recitals). */
  fallback?: { version: Version; node: ProvisionNode };
  notice: Notice;
}

const textOf = (nodes: ProvisionNode[]): string => nodes.flatMap((n) => [n.heading, n.text]).filter((s) => s !== "").join("\n");

export function getProvision(input: GetProvisionInput): GetProvisionResult {
  const version = input.version ?? V2026;
  const lang = input.lang ?? "en";
  if (!isVersion(version)) throw new Error(`unknown version ${String(version)}`);
  if (!isLang(lang)) throw new Error(`unknown lang ${String(lang)}`);
  const includeChildren = input.include_children ?? true;
  const id = parseRef(input.id) ?? input.id; // ids pass through; human citations ("Article 50(1)") are resolved
  const idx = loadCorpus(version, lang);
  const node = idx.byId.get(id);
  if (node) {
    const kids = includeChildren ? descendants(idx, node.id) : [];
    return {
      found: true,
      version,
      lang,
      node,
      ...(includeChildren ? { children: kids } : {}),
      text_full: textOf([node, ...kids]),
      notice: notice([version]),
    };
  }
  const otherV = otherVersion(version);
  const other = loadCorpus(otherV, lang).byId.get(id);
  if (!other) return { found: false, version, lang, reason: "unknown_id", notice: notice([version]) };
  return {
    found: false,
    version,
    lang,
    reason: version === V2026 ? "not_in_consolidated_version" : "not_in_version",
    fallback: { version: otherV, node: other },
    notice: notice([version, otherV]),
  };
}

export { V2024, V2026 };
