/**
 * Recompute an evidence record against a release (isomorphic: no node: imports, no file access; the caller supplies
 * the release context, and optionally the manifest bytes, the signature file and the public keys).
 *
 * Checks: record hash, manifest hash, manifest signature (Ed25519), every cited node against the release corpus, and
 * V0/V1/V2 recomputed from the record's `input`. `matches_record` compares the decisive fields and the set of cited
 * nodes (id, version, lang, hash, node_hash).
 */
import { isLang, isVersion } from "../tools/corpus.js";

import { citedNodesOf, recordHash } from "../record/record.js";
import type { EvidenceRecord, EvidenceRecordBody } from "../record/record.js";
import type { ReleaseContext } from "../release/contextCore.js";
import { manifestBytes as serialiseManifest, sha256Hex } from "../release/manifestCore.js";
import { verifyManifestSignature } from "../release/signatureCore.js";
import type { ManifestSignature } from "../release/signatureCore.js";
import { verifyCitationWith } from "../tools/verifyCore.js";
import type { VerifyResult } from "../tools/verifyCore.js";

export interface RecomputeOptions {
  manifestBytes?: Uint8Array;
  signature?: ManifestSignature;
  /** key_id -> public key PEM. */
  publicKeys?: Record<string, string>;
  /** Revoked key ids. */
  revoked?: readonly string[];
}

export type SignatureStatus = "valid" | "invalid" | "missing" | "unknown_key" | "revoked";

export interface Difference {
  field: string;
  record: unknown;
  recomputed: unknown;
}

export interface CitedNodeCheck {
  id: string;
  version: string;
  lang: string;
  present: boolean;
  hash_ok: boolean;
  node_hash_ok: boolean;
}

export interface RecomputeReport {
  record_hash_ok: boolean;
  /** null when no manifest bytes were supplied. */
  manifest_sha256_ok: boolean | null;
  signature: { status: SignatureStatus; key_id?: string };
  cited_nodes: CitedNodeCheck[];
  recomputed: VerifyResult;
  matches_record: boolean;
  differences: Difference[];
}

function signatureStatus(bytes: Uint8Array, opts: RecomputeOptions): RecomputeReport["signature"] {
  const sig = opts.signature;
  if (!sig) return { status: "missing" };
  const key_id = sig.key_id;
  if (opts.revoked?.includes(key_id)) return { status: "revoked", key_id };
  const pem = opts.publicKeys?.[key_id];
  if (pem === undefined) return { status: "unknown_key", key_id };
  return { status: verifyManifestSignature(bytes, sig, pem) ? "valid" : "invalid", key_id };
}

/** The fields `matches_record` compares: status, location, version found, validity state. */
function decisive(r: Partial<VerifyResult> | undefined): Record<string, unknown> {
  return {
    status: r?.status,
    "match.provision_id": r?.match?.provision_id,
    provision_id: r?.provision_id,
    found_in_version: r?.found_in_version,
    "validity.state": r?.validity?.state,
    "validity.until": r?.validity?.until,
    "validity.version": r?.validity?.version,
    "validity.act": r?.validity?.act,
  };
}

export function recomputeRecord(record: EvidenceRecord, ctx: ReleaseContext, opts: RecomputeOptions = {}): RecomputeReport {
  const { record_hash, ...body } = record;
  const differences: Difference[] = [];

  const record_hash_ok = recordHash(body as EvidenceRecordBody) === record_hash;
  const manifest_sha256_ok = opts.manifestBytes ? sha256Hex(opts.manifestBytes) === record.manifest_sha256 : null;
  const signature = signatureStatus(opts.manifestBytes ?? serialiseManifest(ctx.manifest), opts);

  const cited_nodes: CitedNodeCheck[] = (record.cited_nodes ?? []).map((c) => {
    const node = isVersion(c.version) && isLang(c.lang) ? ctx.loadCorpus(c.version, c.lang).byId.get(c.id) : undefined;
    return { id: c.id, version: c.version, lang: c.lang, present: node !== undefined, hash_ok: node?.hash === c.hash, node_hash_ok: node?.node_hash === c.node_hash };
  });

  if (record.release_id !== ctx.releaseId) differences.push({ field: "release_id", record: record.release_id, recomputed: ctx.releaseId });

  const input = record.input;
  const recomputed = verifyCitationWith(
    { quote: input.quote, as_of: input.as_of, lang: input.lang, ...(input.claimed_ref ? { claimed_ref: input.claimed_ref } : {}) },
    ctx.loadCorpus,
    ctx.deadlines,
  );
  const citedKey = (c: { id: string; version: string; lang: string; hash: string; node_hash: string }): string => `${c.id} (${c.version}, ${c.lang}) ${c.hash} ${c.node_hash}`;
  const statedCited = record.cited_nodes ?? [];
  const freshCited = citedNodesOf(recomputed, ctx);
  if (statedCited.map(citedKey).sort().join("\n") !== freshCited.map(citedKey).sort().join("\n")) {
    differences.push({ field: "cited_nodes", record: statedCited.map((c) => c.id).sort(), recomputed: freshCited.map((c) => c.id).sort() });
  }
  const stated = decisive(record.result);
  const fresh = decisive(recomputed);
  for (const field of Object.keys(fresh)) {
    if (stated[field] !== fresh[field]) differences.push({ field, record: stated[field], recomputed: fresh[field] });
  }
  return { record_hash_ok, manifest_sha256_ok, signature, cited_nodes, recomputed, matches_record: differences.length === 0, differences };
}

// ---------------------------------------------------------------------------------------------------------------
// Overall verdict (shared by the verify page and the tests)
// ---------------------------------------------------------------------------------------------------------------

export type CompareKey = "status" | "location" | "version" | "validity" | "language";

export interface CompareRow {
  key: CompareKey;
  /** As stated in the record (display form). */
  record: string;
  /** As recomputed here (display form). */
  recomputed: string;
  ok: boolean;
}

const shown = (v: unknown): string => (v === undefined || v === null ? "\u2013" : String(v));

function displayFields(v: Partial<VerifyResult> | undefined): Record<CompareKey, string> {
  return {
    status: shown(v?.status),
    location: v?.match ? `${v.match.provision_id} (${v.match.version_id}, ${v.match.lang})` : "\u2013",
    version: [shown(v?.version_checked), v?.found_in_version ? `gefunden in / found in ${v.found_in_version}` : ""].filter(Boolean).join("; "),
    validity: v?.validity ? [v.validity.state, v.validity.until, v.validity.version, v.validity.act].filter((x) => x !== undefined).join(" ") : "\u2013",
    language: v?.language_check ? `${v.language_check.result}${v.language_check.detected_lang ? ` (${v.language_check.detected_lang})` : ""}` : "\u2013",
  };
}

/** The rows of the comparison table: stated in the record against recomputed. Every shown row is part of the verdict. */
export function compareRows(record: EvidenceRecord, report: RecomputeReport): CompareRow[] {
  const a = displayFields(record.result);
  const b = displayFields(report.recomputed);
  return (["status", "location", "version", "validity", "language"] as const).map((key) => ({ key, record: a[key], recomputed: b[key], ok: a[key] === b[key] }));
}

export interface OverallVerdict {
  all_ok: boolean;
  /** Names of the checks that failed (empty when all_ok). */
  failed: string[];
}

/**
 * Overall verdict: true only if the record hash, the manifest hash, the release files, the signature, `matches_record`,
 * every row of the comparison table and every cited node check out.
 * @param filesOk result of the release-file check against the manifest (see files.ts `filesOk`)
 */
export function overallVerdict(record: EvidenceRecord, report: RecomputeReport, filesOk: boolean): OverallVerdict {
  const failed: string[] = [];
  if (!report.record_hash_ok) failed.push("record_hash");
  if (report.manifest_sha256_ok !== true) failed.push("manifest_sha256");
  if (!filesOk) failed.push("release_files");
  if (report.signature.status !== "valid") failed.push("signature");
  if (!report.matches_record) failed.push("matches_record");
  for (const row of compareRows(record, report)) if (!row.ok) failed.push(`compare:${row.key}`);
  if (!report.cited_nodes.every((c) => c.present && c.hash_ok && c.node_hash_ok)) failed.push("cited_nodes");
  return { all_ok: failed.length === 0, failed };
}
