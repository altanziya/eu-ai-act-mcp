/**
 * Browser entry of the verify page (bundled to site/verify/verify.js). Reads the record from location.hash, loads the
 * release files relative to the page (../release/<id>/...), recomputes the record and renders the result into the
 * containers of site/verify/index.html. Record content is untrusted and only ever inserted as text.
 */
import { decodeRecordFromUrl } from "../record/record.js";
import type { EvidenceRecord } from "../record/record.js";
import { contextFromFiles, VERIFY_FILES } from "../release/contextCore.js";
import { RELEASE_ID_RE, sha256Hex } from "../release/manifestCore.js";
import type { Manifest } from "../release/manifestCore.js";
import type { ManifestSignature } from "../release/signatureCore.js";
import { checkFiles, filesOk } from "./files.js";
import type { FileCheck } from "./files.js";
import { compareRows, overallVerdict, recomputeRecord } from "./recompute.js";
import type { CompareKey, RecomputeReport } from "./recompute.js";

interface KeyIndex {
  keys: Array<{ key_id: string; public_key_pem: string; status: "active" | "revoked" }>;
}

const $ = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e;
};

function el(tag: string, text?: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function table(head: string[], rows: Array<Array<string | { text: string; cls: string }>>): HTMLElement {
  const t = el("table");
  const thead = el("thead");
  const hr = el("tr");
  for (const h of head) hr.append(el("th", h));
  thead.append(hr);
  const tbody = el("tbody");
  for (const r of rows) {
    const tr = el("tr");
    for (const c of r) tr.append(typeof c === "string" ? el("td", c) : el("td", c.text, c.cls));
    tbody.append(tr);
  }
  t.append(thead, tbody);
  return t;
}

const mark = (ok: boolean | null): { text: string; cls: string } =>
  ok === null ? { text: "– (nicht geprüft / not checked)", cls: "na" } : ok ? { text: "✓ ok", cls: "ok" } : { text: "✗ Abweichung / mismatch", cls: "bad" };

async function fetchBytes(url: string, optional = false): Promise<Uint8Array | null> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    if (optional && res.status === 404) return null;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
const parseJson = <T>(bytes: Uint8Array): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

const SIGNATURE_TEXT: Record<string, string> = {
  valid: "gültig / valid",
  invalid: "ungültig / invalid",
  missing: "fehlt / missing (Release nicht signiert / release not signed)",
  unknown_key: "unbekannter Schlüssel / unknown key",
  revoked: "Signatur widerrufen / signature revoked",
};

const show = (r: unknown): string => (r === undefined || r === null ? "–" : String(r));

const ROW_LABELS: Record<CompareKey, string> = {
  status: "Status / status",
  location: "Fundstelle / location",
  version: "geprüfte Fassung / version checked",
  validity: "Geltung / validity",
  language: "Sprachprüfung / language check",
};

function compareTableRows(record: EvidenceRecord, report: RecomputeReport): Array<Array<string | { text: string; cls: string }>> {
  return compareRows(record, report).map((r) => [ROW_LABELS[r.key], r.record, r.recomputed, mark(r.ok)]);
}

function render(record: EvidenceRecord, report: RecomputeReport, files: FileCheck[], manifestSha: string): void {
  for (const e of document.querySelectorAll("[data-release-id]")) e.textContent = record.release_id;

  const integrity = [
    ["Record-Hash / record hash", mark(report.record_hash_ok)],
    ["Manifest-Hash im Record / manifest hash in record", mark(report.manifest_sha256_ok)],
    ["Korpusdateien gegen Manifest / corpus files against manifest", mark(filesOk(files))],
    ["Signatur des Manifests / manifest signature", { text: `${SIGNATURE_TEXT[report.signature.status] ?? report.signature.status}${report.signature.key_id ? ` [key ${report.signature.key_id}]` : ""}`, cls: report.signature.status === "valid" ? "ok" : "bad" }],
    ["Neuberechnung stimmt mit Record überein / recomputation matches record", mark(report.matches_record)],
  ] as Array<[string, { text: string; cls: string }]>;
  const integrityBox = $("integrity");
  integrityBox.replaceChildren(el("h2", "Prüfungen / checks"), el("p", `Release: ${record.release_id}; manifest sha256 ${manifestSha}`, "mono"), table(["", ""], integrity));

  const all = overallVerdict(record, report, filesOk(files)).all_ok;
  const summary = $("summary");
  summary.className = all ? "ok" : "bad";
  summary.textContent = all
    ? "Alle Prüfungen bestanden: Signatur gültig, Hashes stimmen, Neuberechnung stimmt mit dem Record überein. / All checks passed: signature valid, hashes match, recomputation matches the record."
    : "Nicht alle Prüfungen bestanden: der Record darf nicht als belegt gelten. / Not all checks passed: do not treat this record as verified.";

  const input = record.input;
  $("input").replaceChildren(
    el("h2", "Geprüftes Zitat / checked quotation"),
    el("blockquote", input.quote),
    el("p", `claimed_ref: ${show(input.claimed_ref)}; as_of: ${input.as_of}; lang: ${input.lang}`, "mono"),
  );

  $("compare").replaceChildren(el("h2", "V0 / V1 / V2: im Record angegeben und hier neu berechnet / stated in the record and recomputed here"), table(["", "im Record angegeben / stated in record", "hier neu berechnet / recomputed here", ""], compareTableRows(record, report)));
  if (report.differences.length > 0) {
    $("compare").append(el("p", `Abweichungen / differences: ${report.differences.map((d) => `${d.field} (${show(d.record)} ≠ ${show(d.recomputed)})`).join("; ")}`, "bad"));
  }

  $("nodes").replaceChildren(
    el("h2", "Zitierte Nodes / cited nodes"),
    table(
      ["id", "Fassung / version", "lang", "vorhanden / present", "hash", "node_hash"],
      report.cited_nodes.map((c) => [c.id, c.version, c.lang, mark(c.present), mark(c.hash_ok), mark(c.node_hash_ok)]),
    ),
  );

  $("creator-body").replaceChildren(table(["", ""], [["question", show(record.question)], ["creator", show(record.creator)], ["created_at", show(record.created_at)]]));

  $("record-notice").replaceChildren(el("h2", "Hinweis im Record / notice in the record"), el("p", record.notice?.de ?? "–"), el("p", record.notice?.en ?? "–"));
}

async function main(): Promise<void> {
  const status = $("status");
  const fragment = location.hash;
  if (fragment.replace(/^#/, "") === "") {
    status.textContent = "Kein Record im Link. / No record in the link.";
    return;
  }
  let record: EvidenceRecord;
  try {
    record = decodeRecordFromUrl(fragment);
    if (!RELEASE_ID_RE.test(record.release_id)) throw new Error("invalid release_id");
  } catch (e) {
    status.textContent = `Der Link enthält keinen lesbaren Record. / The link does not contain a readable record. (${(e as Error).message})`;
    status.className = "bad";
    return;
  }
  status.textContent = "Lade Release und berechne neu … / Loading release and recomputing …";
  try {
    const base = `../release/${record.release_id}/`;
    const manifestBytes = (await fetchBytes(`${base}manifest.json`)) as Uint8Array;
    const manifest = parseJson<Manifest>(manifestBytes);
    const sigBytes = await fetchBytes(`${base}manifest.sig.json`, true);
    const keysBytes = await fetchBytes("../keys/index.json", true);
    const files: Record<string, Uint8Array> = {};
    await Promise.all(
      VERIFY_FILES.map(async (p) => {
        files[p] = (await fetchBytes(`${base}${p}`)) as Uint8Array;
      }),
    );
    const keys = keysBytes ? parseJson<KeyIndex>(keysBytes).keys : [];
    const ctx = contextFromFiles(manifest, files);
    const report = recomputeRecord(record, ctx, {
      manifestBytes,
      ...(sigBytes ? { signature: parseJson<ManifestSignature>(sigBytes) } : {}),
      publicKeys: Object.fromEntries(keys.map((k) => [k.key_id, k.public_key_pem])),
      revoked: keys.filter((k) => k.status === "revoked").map((k) => k.key_id),
    });
    render(record, report, checkFiles(manifest, files), sha256Hex(manifestBytes));
    status.textContent = "";
  } catch (e) {
    status.textContent = `Prüfung nicht möglich / verification not possible: ${(e as Error).message}`;
    status.className = "bad";
  }
}

void main();
