/**
 * Evidence record (schema aiact-evidence-record/1): a quote check made against one corpus release, with the full
 * result, the hashes of the cited nodes and a record hash. Isomorphic (no node: imports); no clock: `created_at`
 * comes from the caller and, like `question` and `creator`, is an unverified statement by the creator.
 */
import { manifestBytes, sha256Hex } from "../release/manifestCore.js";
import type { ReleaseContext } from "../release/contextCore.js";
import { V2024, V2026 } from "../constants.js";
import type { Lang } from "../constants.js";
import type { Version } from "../tools/corpus.js";
import { notice } from "../tools/notice.js";
import type { Notice } from "../tools/notice.js";
import { verifyCitationWith } from "../tools/verifyCore.js";
import type { VerifyResult } from "../tools/verifyCore.js";

export const RECORD_SCHEMA = "aiact-evidence-record/1";

export interface RecordInput {
  question?: string;
  quote: string;
  claimed_ref?: string;
  as_of: string;
  lang: Lang;
  creator?: string;
  created_at: string;
  release_id: string;
}

export interface CitedNode {
  id: string;
  version: Version;
  lang: Lang;
  hash: string;
  node_hash: string;
}

export interface EvidenceRecordBody {
  schema: typeof RECORD_SCHEMA;
  release_id: string;
  question: string | null;
  creator: string | null;
  created_at: string;
  input: { quote: string; claimed_ref: string | null; as_of: string; lang: Lang };
  result: VerifyResult;
  cited_nodes: CitedNode[];
  manifest_sha256: string;
  notice: Notice;
}
export interface EvidenceRecord extends EvidenceRecordBody {
  record_hash: string;
}

/** JSON with keys sorted recursively, arrays in order, no whitespace, strings as plain JSON (Unicode not escaped); `undefined` members are omitted. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const s = JSON.stringify(value);
    if (s === undefined) throw new Error("canonicalJson: value is not JSON-serialisable");
    return s;
  }
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const parts = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${parts.join(",")}}`;
}

/** SHA-256 (hex) over the canonical JSON of the record without its `record_hash`. */
export const recordHash = (body: EvidenceRecordBody): string => sha256Hex(new TextEncoder().encode(canonicalJson(body)));

function citedNodesOf(result: VerifyResult, ctx: ReleaseContext): CitedNode[] {
  const refs: Array<{ id: string; version: Version; lang: Lang }> = [];
  if (result.match) refs.push({ id: result.match.provision_id, version: result.match.version_id, lang: result.match.lang });
  if (result.provision_id) {
    refs.push({ id: result.provision_id, version: result.found_in_version ?? result.version_checked, lang: result.found_in_lang ?? result.lang });
  }
  for (const c of result.candidates ?? []) refs.push({ id: c.provision_id, version: c.version_id, lang: c.lang });
  const seen = new Set<string>();
  const out: CitedNode[] = [];
  for (const r of refs) {
    const key = `${r.version}\u0000${r.lang}\u0000${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const node = ctx.loadCorpus(r.version, r.lang).byId.get(r.id);
    if (!node) throw new Error(`cited node ${r.id} not found in release ${ctx.releaseId} (${r.version}, ${r.lang})`);
    out.push({ id: r.id, version: r.version, lang: r.lang, hash: node.hash, node_hash: node.node_hash });
  }
  return out;
}

export function createRecord(input: RecordInput, ctx: ReleaseContext): EvidenceRecord {
  if (input.release_id !== ctx.releaseId) throw new Error(`release_id ${input.release_id} does not match the loaded release ${ctx.releaseId}`);
  const claimed = input.claimed_ref !== undefined && input.claimed_ref.trim() !== "" ? input.claimed_ref : undefined;
  const result = verifyCitationWith({ quote: input.quote, as_of: input.as_of, lang: input.lang, ...(claimed !== undefined ? { claimed_ref: claimed } : {}) }, ctx.loadCorpus, ctx.deadlines);
  const body: EvidenceRecordBody = {
    schema: RECORD_SCHEMA,
    release_id: ctx.releaseId,
    question: input.question ?? null,
    creator: input.creator ?? null,
    created_at: input.created_at,
    input: { quote: input.quote, claimed_ref: claimed ?? null, as_of: input.as_of, lang: input.lang },
    result,
    cited_nodes: citedNodesOf(result, ctx),
    manifest_sha256: sha256Hex(manifestBytes(ctx.manifest)),
    notice: notice([V2024, V2026]),
  };
  return { ...body, record_hash: recordHash(body) };
}

// ---------------------------------------------------------------------------------------------------------------
// URL encoding: base64url (no padding) over the UTF-8 bytes of JSON.stringify(record)
// ---------------------------------------------------------------------------------------------------------------

export function encodeRecordForUrl(record: EvidenceRecord): string {
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Accepts the fragment with or without the leading `#`. Throws on malformed input or a wrong schema. */
export function decodeRecordFromUrl(fragment: string): EvidenceRecord {
  const b64 = fragment.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*$/.test(b64) || b64.length % 4 === 1) throw new Error("malformed record fragment");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<EvidenceRecord> | null;
  if (parsed === null || typeof parsed !== "object" || parsed.schema !== RECORD_SCHEMA) throw new Error(`not an ${RECORD_SCHEMA} record`);
  return parsed as EvidenceRecord;
}
