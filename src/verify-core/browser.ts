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
import { conditionalDateLines, languageCheckLabel, locationLabel, pickLang, signatureLabel, statusLabel, ui, validityLabel, versionRowLabel } from "./labels.js";
import type { PageLang, UiKey } from "./labels.js";
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

function table(head: string[], rows: Cell[][]): HTMLElement {
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

type Cell = string | { text: string; cls: string };

async function fetchBytes(url: string, optional = false): Promise<Uint8Array | null> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    if (optional && res.status === 404) return null;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
const parseJson = <T>(bytes: Uint8Array): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

const show = (r: unknown): string => (r === undefined || r === null ? "–" : String(r));

const ROW_LABEL: Record<CompareKey, UiKey> = {
  status: "rowStatus",
  location: "rowLocation",
  version: "rowVersion",
  validity: "rowValidity",
  language: "rowLanguage",
};

// ---------------------------------------------------------------------------------------------------------------
// Page language: English by default, German on request (?lang=de or the toggle); only UI labels switch. The mandatory
// notices and the statement stay in both languages in the static HTML.
// ---------------------------------------------------------------------------------------------------------------

let lang: PageLang = "en";
const STORAGE_KEY = "aiact-verify-lang";

function savedLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function saveLang(l: PageLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // storage unavailable (private mode, blocked): the choice just lasts for this page view
  }
}

interface View {
  record: EvidenceRecord;
  report: RecomputeReport;
  files: FileCheck[];
  manifestSha: string;
}
let view: View | null = null;
/** Current content of #status, as a key so that it follows the language. */
let statusState: { key: UiKey; cls: string; detail?: string } | null = null;

function setStatus(state: typeof statusState): void {
  statusState = state;
  const status = $("status");
  status.className = state?.cls ?? "";
  status.textContent = state ? `${ui(state.key, lang)}${state.detail ? ` (${state.detail})` : ""}` : "";
}

function applyStaticLabels(): void {
  document.documentElement.lang = lang;
  for (const e of document.querySelectorAll<HTMLElement>("[data-i18n]")) e.textContent = ui(e.dataset.i18n as UiKey, lang);
  for (const e of document.querySelectorAll<HTMLElement>("[data-lang-option]")) {
    const active = e.dataset.langOption === lang;
    e.className = active ? "cur" : "";
    if (active) e.setAttribute("aria-current", "true");
    else e.removeAttribute("aria-current");
  }
  if (statusState) setStatus(statusState);
}

function setLang(l: PageLang): void {
  lang = l;
  applyStaticLabels();
  if (view) render(view);
}

const mark = (ok: boolean | null): Cell => (ok === null ? { text: ui("notChecked", lang), cls: "na" } : ok ? { text: ui("ok", lang), cls: "ok" } : { text: ui("mismatch", lang), cls: "bad" });

function compareTableRows(record: EvidenceRecord, report: RecomputeReport): Cell[][] {
  const a = record.result;
  const b = report.recomputed;
  const human = (key: CompareKey, r: typeof a): string => {
    switch (key) {
      case "status":
        return statusLabel(r?.status, lang);
      case "location":
        return locationLabel(r);
      case "version":
        return versionRowLabel(r, lang);
      case "validity":
        return validityLabel(r?.validity, lang);
      case "language":
        return languageCheckLabel(r?.language_check, lang);
    }
  };
  // `ok` comes from the shared comparison (raw values), the text is the human-readable form.
  return compareRows(record, report).map((r) => [ui(ROW_LABEL[r.key], lang), human(r.key, a), human(r.key, b), mark(r.ok)]);
}

function render({ record, report, files, manifestSha }: View): void {
  for (const e of document.querySelectorAll("[data-release-id]")) e.textContent = record.release_id;

  const integrity: Array<[string, Cell]> = [
    [ui("recordHash", lang), mark(report.record_hash_ok)],
    [ui("manifestHash", lang), mark(report.manifest_sha256_ok)],
    [ui("filesAgainstManifest", lang), mark(filesOk(files))],
    [ui("signature", lang), { text: `${signatureLabel(report.signature.status, lang)}${report.signature.key_id ? ` [key ${report.signature.key_id}]` : ""}`, cls: report.signature.status === "valid" ? "ok" : "bad" }],
    [ui("matches", lang), mark(report.matches_record)],
  ];
  $("integrity").replaceChildren(el("h2", ui("checksH", lang)), el("p", `${ui("releaseLine", lang)}: ${record.release_id}; manifest sha256 ${manifestSha}`, "mono"), table(["", ""], integrity));

  const all = overallVerdict(record, report, filesOk(files)).all_ok;
  const summary = $("summary");
  summary.className = all ? "ok" : "bad";
  summary.textContent = ui(all ? "allOk" : "notAllOk", lang);

  const input = record.input;
  $("input").replaceChildren(
    el("h2", ui("quoteH", lang)),
    el("blockquote", input.quote),
    el("p", `claimed_ref: ${show(input.claimed_ref)}; as_of: ${input.as_of}; lang: ${input.lang}`, "mono"),
  );

  const compare = $("compare");
  compare.replaceChildren(el("h2", ui("compareH", lang)), table(["", ui("colStated", lang), ui("colRecomputed", lang), ""], compareTableRows(record, report)));
  const later = conditionalDateLines(report.recomputed.validity, lang);
  if (later.length > 0) {
    const box = el("div", undefined, "box");
    box.append(el("h2", ui("laterDatesH", lang)), ...later.map((line) => el("p", line)));
    compare.append(box);
  }
  if (report.differences.length > 0) {
    compare.append(el("p", `${ui("differences", lang)}: ${report.differences.map((d) => `${d.field} (${show(d.record)} ≠ ${show(d.recomputed)})`).join("; ")}`, "bad"));
  }

  $("nodes").replaceChildren(
    el("h2", ui("nodesH", lang)),
    table(
      [ui("colId", lang), ui("colVersion", lang), ui("colLang", lang), ui("colPresent", lang), "hash", "node_hash"],
      report.cited_nodes.map((c) => [c.id, c.version, c.lang, mark(c.present), mark(c.hash_ok), mark(c.node_hash_ok)]),
    ),
  );

  $("creator-body").replaceChildren(
    table(["", ""], [[ui("creatorQuestion", lang), show(record.question)], [ui("creatorCreator", lang), show(record.creator)], [ui("creatorCreatedAt", lang), show(record.created_at)]]),
  );

  // The notice stored in the record carries both languages; both stay visible.
  $("record-notice").replaceChildren(el("h2", `${ui("recordNoticeH", "de")} / ${ui("recordNoticeH", "en")}`), el("p", record.notice?.de ?? "–"), el("p", record.notice?.en ?? "–"));
}

async function main(): Promise<void> {
  lang = pickLang(location.search, savedLang());
  for (const b of document.querySelectorAll<HTMLElement>("[data-lang-toggle]")) {
    b.addEventListener("click", () => {
      const next: PageLang = lang === "en" ? "de" : "en";
      saveLang(next);
      setLang(next);
    });
  }
  applyStaticLabels();

  const fragment = location.hash;
  if (fragment.replace(/^#/, "") === "") {
    setStatus({ key: "noRecord", cls: "" });
    return;
  }
  let record: EvidenceRecord;
  try {
    record = decodeRecordFromUrl(fragment);
    if (!RELEASE_ID_RE.test(record.release_id)) throw new Error("invalid release_id");
  } catch (e) {
    setStatus({ key: "unreadable", cls: "bad", detail: (e as Error).message });
    return;
  }
  setStatus({ key: "loading", cls: "" });
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
    view = { record, report, files: checkFiles(manifest, files), manifestSha: sha256Hex(manifestBytes) };
    render(view);
    setStatus(null);
  } catch (e) {
    setStatus({ key: "failed", cls: "bad", detail: (e as Error).message });
  }
}

void main();
