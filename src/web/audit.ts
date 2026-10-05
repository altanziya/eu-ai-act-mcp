/**
 * Browser entry of the document checker (bundled to site/audit/audit.js). The text is checked in the browser against the
 * signed corpus release loaded from this site; nothing the user types leaves the page. All content is inserted as text.
 */
import { auditTextWith } from "../tools/auditCore.js";
import type { AuditResult, Finding, Severity } from "../tools/auditCore.js";
import { isIsoDate } from "../tools/corpus.js";
import { detectLang } from "../tools/searchCore.js";
import { todayIso } from "../tools/today.js";
import { AUDIT_UI } from "./auditText.js";
import type { AuditUiKey } from "./auditText.js";
import { auditJson, auditReportMarkdown, kindLabel, orderFindings, segmentText, SEVERITIES, SEVERITY_LABEL, SEVERITY_PLURAL, SEVERITY_SYMBOL, showValue, sourceInfo, uniqueSources } from "./auditView.js";
import { $, applyStatic, copyText, download, flash, h, initLang } from "./dom.js";
import { EXAMPLES } from "./examples.js";
import { formatDate, progressLine, releaseStatusLine, versionName } from "./i18n.js";
import type { Lang } from "./i18n.js";
import { loadRelease, releaseErrorMessage } from "./loadRelease.js";
import type { LoadedRelease } from "./loadRelease.js";

/** Replaced by the id of the release folder next to the page when the site is built (scripts/build-site.ts). */
declare const __RELEASE_ID__: string;
const RELEASE_ID: string = typeof __RELEASE_ID__ === "string" ? __RELEASE_ID__ : "";

const t = (key: AuditUiKey, lang: Lang): string => AUDIT_UI[key][lang];

let lang: Lang = "en";
let release: Promise<LoadedRelease> | null = null;
interface Run {
  text: string;
  result: AuditResult;
  auditLang: Lang;
  release: LoadedRelease;
}
let last: Run | null = null;
let filter: Severity | "all" = "all";
let statusState: { kind: "plain" | "good" | "bad"; text: () => string } | null = null;

function setStatus(kind: "plain" | "good" | "bad", text: () => string): void {
  statusState = { kind, text };
  const s = $("status");
  s.className = `status${kind === "plain" ? "" : ` ${kind}`}`;
  s.textContent = text();
  s.hidden = false;
}

function getRelease(): Promise<LoadedRelease> {
  if (!release) {
    release = loadRelease({
      releaseId: RELEASE_ID,
      onProgress: (p) => {
        const bar = $<HTMLProgressElement>("progress");
        bar.hidden = false;
        bar.max = p.totalBytes || 1;
        bar.value = p.bytes;
        setStatus("plain", () => progressLine(p.files, p.totalFiles, p.bytes / 1_048_576, lang));
      },
    });
    release.catch(() => {
      release = null; // allow a retry
    });
  }
  return release;
}

// ---------------------------------------------------------------------------------------------------------------
// Rendering

function fragmentFor(index: number): string {
  return `finding-${index}`;
}

function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
  target.classList.add("flash");
  setTimeout(() => target.classList.remove("flash"), 1500);
}

function renderText(run: Run): void {
  const visible = filter === "all" ? new Set<Severity>(SEVERITIES) : new Set<Severity>([filter]);
  const box = $("doc");
  const nodes: Array<Node | string> = [];
  for (const seg of segmentText(run.text, run.result.findings, visible)) {
    if (seg.severity === null) {
      nodes.push(seg.text);
      continue;
    }
    const firstId = [...seg.findings].sort((a, b) => SEVERITIES.indexOf((run.result.findings[a] as Finding).severity) - SEVERITIES.indexOf((run.result.findings[b] as Finding).severity))[0] as number;
    const labels = seg.findings.map((i) => kindLabel((run.result.findings[i] as Finding).kind, lang)).join("; ");
    const m = h(
      "mark",
      { class: `m m-${seg.severity}`, attrs: { tabindex: "0", role: "link", title: `${SEVERITY_LABEL[seg.severity][lang]}: ${labels}`, "data-findings": seg.findings.join(",") } },
      h("span", { class: "sr", text: `${SEVERITY_LABEL[seg.severity][lang]}: ${labels}. ` }),
      seg.text,
    );
    const go = (): void => jumpTo(fragmentFor(firstId));
    m.addEventListener("click", go);
    m.addEventListener("keydown", (ev) => {
      if ((ev as KeyboardEvent).key === "Enter" || (ev as KeyboardEvent).key === " ") {
        ev.preventDefault();
        go();
      }
    });
    nodes.push(m);
  }
  box.replaceChildren(...nodes);
}

function renderCard(run: Run, index: number, f: Finding): HTMLElement {
  const card = h("article", { class: `card finding sev-bar-${f.severity}`, attrs: { id: fragmentFor(index), tabindex: "-1" } });
  card.append(
    h("div", { class: "finding-head" }, h("span", { class: `sev sev-${f.severity}`, text: SEVERITY_LABEL[f.severity][lang], attrs: { "data-sym": SEVERITY_SYMBOL[f.severity] } }), h("h3", { text: kindLabel(f.kind, lang) })),
    h("p", { class: "finding-msg", text: f.message }),
  );
  if (f.excerpt && f.kind !== "reference_ok") card.append(h("blockquote", { class: "excerpt", text: f.excerpt }));
  if (f.found !== undefined || f.expected !== undefined) {
    const dl = h("dl", { class: "compare" });
    if (f.found !== undefined) dl.append(h("dt", { text: t("found", lang) }), h("dd", { text: showValue(f.found, lang) }));
    if (f.expected !== undefined) dl.append(h("dt", { text: t("expected", lang) }), h("dd", { class: "strong", text: showValue(f.expected, lang) }));
    card.append(dl);
  }
  if (f.suggestion) card.append(h("p", { class: "suggestion" }, h("strong", { text: `${t("suggestion", lang)}: ` }), f.suggestion));

  const sources = uniqueSources(f).map((s) => sourceInfo(s, run.release.context.loadCorpus, run.auditLang));
  if (sources.length > 0) {
    const box = h("div", { class: "sources" }, h("p", { class: "label", text: sources.length === 1 ? t("source", lang) : t("sources", lang) }));
    for (const s of sources) {
      const d = h("details", null, h("summary", { text: `${s.citation} · ${versionName(s.version, lang)}` }));
      d.append(s.text ? h("blockquote", { text: s.text }) : h("p", { class: "muted", text: "–" }));
      if (s.truncated) d.append(h("p", { class: "hint", text: t("noteTruncated", lang) }));
      box.append(d);
    }
    card.append(box);
  } else if (f.ref) {
    card.append(h("p", { class: "hint", text: `${t("source", lang)}: ${f.ref}` }));
  }
  if (f.span.end > f.span.start) {
    card.append(
      h("button", { class: "btn secondary small", text: t("showInText", lang), attrs: { type: "button" }, on: { click: () => {
        const m = [...document.querySelectorAll<HTMLElement>("#doc mark")].find((x) => (x.dataset["findings"] ?? "").split(",").includes(String(index)));
        if (m) {
          m.scrollIntoView({ block: "center" });
          m.focus({ preventScroll: true });
        }
      } } }),
    );
  }
  return card;
}

function renderResults(): void {
  const run = last;
  if (!run) return;
  const { result } = run;
  $("results").hidden = false;

  const head = $("result-head");
  head.replaceChildren(
    h("h2", { text: t("resultH", lang) }),
    h("p", { class: "muted", text: `${t("resultFor", lang)}: ${formatDate(result.as_of, lang)} · ${versionName(result.version_checked, lang)}` }),
  );
  $("lang-note").textContent = `${t("detected", lang)} ${run.auditLang === "de" ? t("langDe", lang) : t("langEn", lang)}`;

  const counters = $("counters");
  counters.replaceChildren(
    ...SEVERITIES.map((s) =>
      h("div", { class: `counter sev-${s}` }, h("span", { class: "n", text: String(result.summary[s]) }), h("span", { class: "w", text: `${SEVERITY_SYMBOL[s]} ${SEVERITY_PLURAL[s][lang]}` })),
    ),
  );

  const chips = $("filters");
  const opts: Array<Severity | "all"> = ["all", ...SEVERITIES];
  chips.replaceChildren(
    h("span", { class: "label", text: `${t("filterLabel", lang)}:` }),
    ...opts.map((o) =>
      h("button", {
        class: "chip",
        text: o === "all" ? `${t("filterAll", lang)} (${result.findings.length})` : `${SEVERITY_SYMBOL[o]} ${SEVERITY_PLURAL[o][lang]} (${result.summary[o]})`,
        attrs: { type: "button", "aria-pressed": String(filter === o) },
        on: { click: () => { filter = o; renderResults(); } },
      }),
    ),
  );

  renderText(run);
  const ordered = orderFindings(result.findings).filter((o) => filter === "all" || o.finding.severity === filter);
  const list = $("cards");
  list.replaceChildren(...(ordered.length > 0 ? ordered.map((o) => renderCard(run, o.index, o.finding)) : [h("p", { class: "muted", text: t("nothingShown", lang) })]));
  $("notice-text").textContent = result.notice[lang];
}

// ---------------------------------------------------------------------------------------------------------------
// Actions

async function runCheck(): Promise<void> {
  const textArea = $<HTMLTextAreaElement>("text");
  const text = textArea.value;
  const asOf = $<HTMLInputElement>("asof").value;
  const button = $<HTMLButtonElement>("check");
  if (text.trim() === "") return setStatus("bad", () => t("noText", lang));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !isIsoDate(asOf)) return setStatus("bad", () => t("badDate", lang));
  const chosen = $<HTMLSelectElement>("textlang").value;
  const auditLang: Lang = chosen === "de" || chosen === "en" ? chosen : detectLang(text);
  button.disabled = true;
  button.textContent = t("checking", lang);
  try {
    const rel = await getRelease();
    $<HTMLProgressElement>("progress").hidden = true;
    setStatus("good", () => releaseStatusLine(rel.releaseId, rel.keyId, lang));
    // let the browser paint the status before the (synchronous) check runs
    await new Promise((r) => setTimeout(r, 0));
    const result = auditTextWith({ text, as_of: asOf, lang: auditLang }, rel.context.loadCorpus, rel.context.deadlines);
    last = { text, result, auditLang, release: rel };
    filter = "all";
    renderResults();
    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    $<HTMLProgressElement>("progress").hidden = true;
    setStatus("bad", () => `${t("failed", lang)} ${releaseErrorMessage(e, lang)}`);
  } finally {
    button.disabled = false;
    button.textContent = t("check", lang);
  }
}

function applyLang(): void {
  applyStatic(AUDIT_UI, lang);
  if (statusState) {
    const s = $("status");
    s.textContent = statusState.text();
  }
  renderExamples();
  if (last) renderResults();
}

function renderExamples(): void {
  $("example-buttons").replaceChildren(
    ...EXAMPLES.map((ex) =>
      h("button", {
        class: "chip",
        text: ex.label[lang],
        attrs: { type: "button" },
        on: { click: () => {
          $<HTMLTextAreaElement>("text").value = ex.text;
          $<HTMLTextAreaElement>("text").scrollTop = 0;
          $<HTMLSelectElement>("textlang").value = ex.lang;
          $<HTMLTextAreaElement>("text").focus();
        } },
      }),
    ),
  );
}

function main(): void {
  lang = initLang((l) => {
    lang = l;
    applyLang();
  });
  $<HTMLInputElement>("asof").value = todayIso();
  $("check").addEventListener("click", () => void runCheck());
  $("clear").addEventListener("click", () => {
    $<HTMLTextAreaElement>("text").value = "";
    $<HTMLTextAreaElement>("text").focus();
  });
  $("copy-report").addEventListener("click", async (ev) => {
    if (!last) return;
    const ok = await copyText(auditReportMarkdown(last.result, { releaseId: last.release.releaseId, manifestSha256: last.release.manifestSha256, keyId: last.release.keyId }, lang));
    flash(ev.currentTarget as HTMLElement, ok ? t("copied", lang) : t("copyFailed", lang));
  });
  $("download-json").addEventListener("click", () => {
    if (!last) return;
    download(`aiact-check-${last.result.as_of}.json`, "application/json", auditJson(last.result, { releaseId: last.release.releaseId, manifestSha256: last.release.manifestSha256, keyId: last.release.keyId }, last.text, last.auditLang));
  });
  applyLang();
}

main();
