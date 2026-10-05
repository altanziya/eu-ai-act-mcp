/**
 * Recompute an evidence record against a release (isomorphic: no node: imports, no file access; the caller supplies
 * the release context, and optionally the manifest bytes, the signature file and the public keys).
 *
 * Checks: record hash, manifest hash, manifest signature (Ed25519), every cited node against the release corpus, and
 * V0/V1/V2 recomputed from the record's `input`. `matches_record` compares the decisive fields only.
 */
import { isLang, isVersion } from "../tools/corpus.js";

import { recordHash } from "../record/record.js";
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
  const stated = decisive(record.result);
  const fresh = decisive(recomputed);
  for (const field of Object.keys(fresh)) {
    if (stated[field] !== fresh[field]) differences.push({ field, record: stated[field], recomputed: fresh[field] });
  }
  return { record_hash_ok, manifest_sha256_ok, signature, cited_nodes, recomputed, matches_record: differences.length === 0, differences };
}
