/**
 * Browser entry of the obligations navigator (bundled to site/obligations/obligations.js). The answers are turned into
 * obligations in the browser, against the signed corpus release loaded from this site; nothing leaves the page. The
 * share link keeps the answers in the URL fragment. All content is inserted as text.
 */
import { CONSOLIDATED_FROM, isIsoDate } from "../tools/corpus.js";
import { aiactObligationsWith, describeProfileWith } from "../tools/obligationsCore.js";
import type { FieldDescription, Obligation, ObligationsData, ObligationsResult } from "../tools/obligationsCore.js";
import { todayIso } from "../tools/today.js";
import { sourceInfo } from "./auditView.js";
import { $, applyStatic, copyText, download, flash, h, initLang } from "./dom.js";
import type { Child } from "./dom.js";
import { daysLabel, formatDate, releaseStatusLine, progressLine, versionName } from "./i18n.js";
import type { Lang } from "./i18n.js";
import { loadRelease, releaseErrorMessage } from "./loadRelease.js";
import type { LoadedRelease } from "./loadRelease.js";
import { OBLIGATIONS_UI } from "./obligationsText.js";
import type { ObligationsUiKey } from "./obligationsText.js";
import { dateLine, decodeShare, encodeShare, groupObligations, headline, kindName, obligationsCsv, obligationsMarkdown, STATUS_HINT, STATUS_ORDER, STATUS_TITLE, timelineStops } from "./obligationsView.js";
import { buildProfile, EXAMPLE_PROFILES, isFieldShown, sanitizeState, SECTIONS } from "./profileForm.js";
import type { FormState } from "./profileForm.js";
import { ANNEX_III_AREAS, ENUM_LABELS, FIELD_LABELS, ROLE_LABELS, ROLE_NAME } from "./profileLabels.js";

/** Replaced by the id of the release folder next to the page when the site is built (scripts/build-site.ts). */
declare const __RELEASE_ID__: string;
const RELEASE_ID: string = typeof __RELEASE_ID__ === "string" ? __RELEASE_ID__ : "";

const t = (key: ObligationsUiKey, lang: Lang): string => OBLIGATIONS_UI[key][lang];

let lang: Lang = "en";
let state: FormState = {};
let asOf = todayIso();
let data: ObligationsData | null = null;
let fields: Record<string, FieldDescription> = {};
let release: Promise<LoadedRelease> | null = null;
let evaluated: { result: ObligationsResult; profile: Record<string, unknown>; release: LoadedRelease } | null = null;
let statusState: { kind: "plain" | "good" | "bad"; text: () => string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function setStatus(kind: "plain" | "good" | "bad", text: (() => string) | null): void {
  const s = $("status");
  if (!text) {
    statusState = null;
    s.hidden = true;
    return;
  }
  statusState = { kind, text };
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
      release = null;
    });
  }
  return release;
}

// ---------------------------------------------------------------------------------------------------------------
// Form

function setAnswer(field: string, value: unknown): void {
  if (value === undefined || value === null || value === "") delete state[field];
  else state[field] = value;
  syncVisibility();
  changed();
}

/** After the first result, every change updates the result; before, the button does. */
function changed(): void {
  if (!evaluated) return;
  clearTimeout(timer);
  timer = setTimeout(() => void evaluate(false), 200);
}

function booleanControl(field: string, withUnsure: boolean): HTMLElement {
  const opts: Array<[string, string, boolean | null]> = [["yes", t("yes", lang), true], ["no", t("no", lang), false]];
  if (withUnsure) opts.push(["unsure", t("unsure", lang), null]);
  const current = state[field];
  const seg = h("div", { class: "seg", attrs: { role: "radiogroup" } });
  for (const [key, label, value] of opts) {
    const id = `f-${field}-${key}`;
    const checked = withUnsure ? (current === undefined ? key === "unsure" : current === value) : current === undefined ? value === (fields[field]?.default ?? false) : current === value;
    const input = h("input", { attrs: { type: "radio", name: `f-${field}`, id, ...(checked ? { checked: "" } : {}) } });
    input.addEventListener("change", () => setAnswer(field, value));
    seg.append(input, h("label", { attrs: { for: id }, text: label }));
  }
  return seg;
}

function control(field: string): HTMLElement {
  const spec = fields[field] as FieldDescription;
  const label = FIELD_LABELS[field];
  const legendText = label?.q[lang] ?? spec.description;
  const wrap = h("fieldset", { class: "q", attrs: { "data-field": field } }, h("legend", { text: legendText }));
  if (label?.hint) wrap.append(h("p", { class: "hint", text: label.hint[lang] }));
  if (spec.type === "enum_array") {
    const sel = Array.isArray(state[field]) ? (state[field] as string[]) : [];
    const list = h("div", { class: "checks" });
    for (const v of spec.values ?? []) {
      const id = `f-${field}-${v}`;
      const input = h("input", { attrs: { type: "checkbox", id, ...(sel.includes(v) ? { checked: "" } : {}) } });
      input.addEventListener("change", () => {
        const now = new Set(Array.isArray(state[field]) ? (state[field] as string[]) : []);
        if ((input as HTMLInputElement).checked) now.add(v);
        else now.delete(v);
        setAnswer(field, [...(spec.values ?? [])].filter((x) => now.has(x)));
      });
      list.append(h("div", { class: "check" }, input, h("label", { attrs: { for: id } }, h("strong", { text: ROLE_NAME(v, lang) }), h("span", { class: "hint", text: ROLE_LABELS[v]?.hint[lang] ?? "" }))));
    }
    wrap.append(list);
  } else if (spec.type === "boolean") {
    wrap.append(booleanControl(field, field !== "uses_or_provides_ai_system"));
  } else if (spec.type === "enum") {
    const id = `f-${field}`;
    const select = h("select", { attrs: { id, "aria-label": legendText } });
    select.append(h("option", { text: field === "annex_iii_area" ? t("selectNone", lang) : t("selectUnset", lang), attrs: { value: "" } }));
    for (const v of spec.values ?? []) {
      const name = field === "annex_iii_area" ? `${v}. ${ANNEX_III_AREAS[v]?.[lang] ?? v}` : (ENUM_LABELS[field]?.[v]?.[lang] ?? v);
      select.append(h("option", { text: name, attrs: { value: v, ...(state[field] === v ? { selected: "" } : {}) } }));
    }
    select.addEventListener("change", () => setAnswer(field, (select as HTMLSelectElement).value));
    wrap.append(select);
  } else if (spec.type === "date") {
    const input = h("input", { attrs: { type: "date", id: `f-${field}`, "aria-label": legendText, value: typeof state[field] === "string" ? (state[field] as string) : "" } });
    input.addEventListener("change", () => setAnswer(field, (input as HTMLInputElement).value));
    wrap.append(input);
  }
  return wrap;
}

function renderForm(): void {
  const box = $("form-sections");
  box.replaceChildren(
    ...SECTIONS.map((s) => {
      const sec = h("section", { class: "form-section", attrs: { "data-section": s.id } }, h("h3", { text: s.title[lang] }));
      if (s.intro) sec.append(h("p", { class: "hint", text: s.intro[lang] }));
      for (const f of s.fields) if (fields[f]) sec.append(control(f));
      return sec;
    }),
    h("p", { class: "hint", attrs: { id: "more-questions" }, text: t("moreQuestions", lang) }),
  );
  syncVisibility();
}

function syncVisibility(): void {
  for (const sec of document.querySelectorAll<HTMLElement>("[data-section]")) {
    const def = SECTIONS.find((s) => s.id === sec.dataset["section"]);
    sec.hidden = !(def && (!def.show || def.show(state)));
  }
  for (const q of document.querySelectorAll<HTMLElement>("fieldset[data-field]")) q.hidden = !isFieldShown(q.dataset["field"] as string, state);
  const roleSet = Array.isArray(state["role"]) && (state["role"] as string[]).length > 0;
  $("more-questions").hidden = roleSet;
}

// ---------------------------------------------------------------------------------------------------------------
// Result

function badge(text: string, cls = ""): HTMLElement {
  return h("span", { class: `badge${cls ? ` ${cls}` : ""}`, text });
}

function card(o: Obligation, rel: LoadedRelease, result: ObligationsResult): HTMLElement {
  const c = h("article", { class: `card ob ob-${o.status}`, attrs: { id: `ob-${o.id}`, tabindex: "-1" } });
  const badges = h("div", { class: "badges" }, badge(kindName(o.kind, lang)));
  if (o.changed_by_omnibus) badges.append(badge(t("badgeOmnibus", lang), "info"));
  if (o.legal_assessment_needed) badges.append(badge(`${t("badgeLegal", lang)}`, "warn"));
  if (o.deadline_caveat) badges.append(badge(t("badgeCaveat", lang), "warn"));
  c.append(h("h4", { text: o.title }), badges);
  if (o.summary) c.append(h("p", { class: "ob-summary", text: o.summary }));

  const when = h("p", { class: `ob-date ${o.status}` }, h("strong", { text: dateLine(o, result.as_of, lang) }));
  c.append(when);
  if (o.applies_from_literal) c.append(h("p", { class: "hint", text: `${t("literalReading", lang)} ${formatDate(o.applies_from_literal, lang)}.` }));
  if (o.route_dates) c.append(h("p", { class: "hint", text: `${t("routeDates", lang)}: ${o.route_dates.map((d) => formatDate(d, lang)).join(", ")}.` }));
  if (o.deadline_caveat) c.append(h("p", { class: "caveat" }, h("strong", { text: `${t("badgeCaveat", lang)}: ` }), o.deadline_caveat));
  if (o.legal_assessment_needed) c.append(h("p", { class: "caveat" }, h("strong", { text: `${t("badgeLegal", lang)}: ` }), o.legal_assessment_needed));
  if (o.omnibus_note) c.append(h("p", { class: "omnibus" }, h("strong", { text: `${t("badgeOmnibus", lang)}: ` }), o.omnibus_note));

  const meta = h("dl", { class: "meta" });
  meta.append(h("dt", { text: t("provisions", lang) }), h("dd", { text: o.provisions.map((p) => p.citation).join("; ") }));
  meta.append(h("dt", { text: t("appliesTo", lang) }), h("dd", { text: o.roles.map((r) => (r === "any" ? t("roleAll", lang) : ROLE_NAME(r, lang))).join(", ") }));
  c.append(meta);

  const d = h("details", { class: "wording" }, h("summary", { text: t("showWording", lang) }));
  d.append(h("blockquote", { text: o.quote }), o.quote_verified ? badge(`✔ ${t("badgeVerified", lang)}`, "ok") : badge(`▲ ${t("badgeNotVerified", lang)}`, "warn"));
  if (lang === "de") {
    const de = sourceInfo(`${result.version}:${o.anchor_node}`, rel.context.loadCorpus, "de");
    if (de.text) d.append(h("p", { class: "label", text: `${t("wordingDe", lang)} (${de.citation})` }), h("blockquote", { text: de.text }));
  }
  c.append(d);
  return c;
}

function timeline(result: ObligationsResult): HTMLElement {
  const ol = h("ol", { class: "timeline" });
  for (const stop of timelineStops(result)) {
    const li = h("li", { class: `stop${stop.today ? " today" : ""}` });
    li.append(
      h("span", { class: "dot", attrs: { "aria-hidden": "true" } }),
      h("div", { class: "when" }, h("strong", { text: formatDate(stop.date, lang) }), h("span", { class: "muted", text: stop.today ? t("today", lang) : daysLabel(stop.days, lang) })),
    );
    const items = stop.obligations.map((o) => h("li", null, h("a", { text: o.title, attrs: { href: `#ob-${o.id}` } })));
    if (stop.today) {
      const dd = h("details", null, h("summary", { text: `${items.length} ${t("alreadyApply", lang)}` }));
      dd.append(h("ul", null, ...items));
      if (items.length > 0) li.append(dd);
      else li.append(h("p", { class: "muted", text: `0 ${t("alreadyApply", lang)}` }));
    } else {
      const shown = items.slice(0, 4);
      li.append(h("ul", null, ...shown));
      if (items.length > 4) {
        const dd = h("details", null, h("summary", { text: `+${items.length - 4} ${t("moreItems", lang)}` }));
        dd.append(h("ul", null, ...items.slice(4)));
        li.append(dd);
      }
    }
    ol.append(li);
  }
  return ol;
}

function openQuestions(result: ObligationsResult): HTMLElement | null {
  const byId = new Map(result.obligations.map((o) => [o.id, o]));
  const items: Child[] = [];
  for (const q of result.open_questions) {
    if (q.kind === "classification") {
      if (!isFieldShown(q.id, state) || state[q.id] !== undefined) continue;
      const label = FIELD_LABELS[q.id]?.q[lang];
      if (!label) continue;
      items.push(
        h("li", null, h("span", { text: label }), " ", h("button", { class: "btn secondary small", text: t("goToQuestion", lang), attrs: { type: "button" }, on: { click: () => {
          const target = document.querySelector<HTMLElement>(`[data-field="${q.id}"]`);
          target?.scrollIntoView({ block: "center" });
          target?.querySelector<HTMLElement>("input,select")?.focus({ preventScroll: true });
        } } })),
      );
    } else {
      const o = byId.get(q.id);
      items.push(h("li", null, h("strong", { text: `${o?.title ?? q.id}: ` }), q.question, " ", o ? h("a", { text: "→", attrs: { href: `#ob-${o.id}`, "aria-label": o.title } }) : null));
    }
  }
  if (items.length === 0) return null;
  return h("section", { class: "panel open-questions" }, h("h2", { text: t("openH", lang) }), h("p", { class: "hint", text: t("openIntro", lang) }), h("ul", null, ...items));
}

function renderResult(): void {
  if (!evaluated) return;
  const { result, profile, release: rel } = evaluated;
  $("empty").hidden = true;
  $("result").hidden = false;
  const groups = groupObligations(result);
  const head = $("headline");
  head.replaceChildren(
    h("h2", { text: t("resultH", lang) }),
    h("p", { class: "headline-text", text: headline(result, profile, lang) }),
    h("p", { class: "muted", text: `${t("asOf", lang)} ${formatDate(result.as_of, lang)} · ${versionName(result.version, lang)}` }),
    h(
      "p",
      { class: "counts" },
      h("span", { class: "badge ok", text: `${groups.applicable.length} ${t("nApplicable", lang)}` }),
      " ",
      h("span", { class: "badge info", text: `${groups.upcoming.length} ${t("nUpcoming", lang)}` }),
      " ",
      h("span", { class: "badge warn", text: `${groups.depends.length} ${t("nDepends", lang)}` }),
      " ",
      h("a", { class: "badge", attrs: { id: "open-link", href: "#open-box" } }),
    ),
  );
  $("content-note").textContent = t("contentNote", lang);
  $("content-note").hidden = lang !== "de";
  $("timeline-box").replaceChildren(h("h2", { text: t("timelineH", lang) }), timeline(result));

  const list = $("checklist");
  list.replaceChildren(h("h2", { text: t("checklistH", lang) }));
  for (const status of STATUS_ORDER) {
    if (groups[status].length === 0) continue;
    list.append(h("section", { class: "group", attrs: { "aria-labelledby": `g-${status}` } }, h("h3", { class: `group-title g-${status}`, attrs: { id: `g-${status}` }, text: `${STATUS_TITLE[status][lang]} (${groups[status].length})` }), h("p", { class: "hint", text: STATUS_HINT[status][lang] }), ...groups[status].map((o) => card(o, rel, result))));
  }
  const open = openQuestions(result);
  $("open-box").replaceChildren(...(open ? [open] : []));
  const link = $("open-link");
  link.hidden = !open;
  link.textContent = open ? `${open.querySelectorAll("li").length} ${t("openCount", lang)}` : "";
  $("notice-text").textContent = result.notice;
}

async function evaluate(scroll: boolean): Promise<void> {
  const profile = buildProfile(state);
  const roles = profile["role"];
  if (!Array.isArray(roles) || roles.length === 0) return setStatus("bad", () => t("needRole", lang));
  if (!isIsoDate(asOf)) return setStatus("bad", () => t("badDate", lang));
  if (asOf < CONSOLIDATED_FROM) return setStatus("bad", () => t("dateTooEarly", lang));
  if (!data) return setStatus("bad", () => t("dataFailed", lang));
  const button = $<HTMLButtonElement>("evaluate");
  button.disabled = true;
  button.textContent = t("evaluating", lang);
  try {
    const rel = await getRelease();
    $<HTMLProgressElement>("progress").hidden = true;
    setStatus("good", () => releaseStatusLine(rel.releaseId, rel.keyId, lang));
    const result = aiactObligationsWith({ profile, as_of: asOf, lang, detail: "full" }, rel.context.loadCorpus, rel.context.deadlines, data);
    evaluated = { result, profile, release: rel };
    renderResult();
    history.replaceState(null, "", `${location.pathname}${location.search}${encodeShare({ state: profile, asOf })}`);
    if (scroll) $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    $<HTMLProgressElement>("progress").hidden = true;
    setStatus("bad", () => `${t("failed", lang)} ${e instanceof Error && !("code" in e) ? e.message : releaseErrorMessage(e, lang)}`);
  } finally {
    button.disabled = false;
    button.textContent = t("evaluate", lang);
  }
}

function applyLang(): void {
  applyStatic(OBLIGATIONS_UI, lang);
  if (statusState) $("status").textContent = statusState.text();
  renderExamples();
  renderForm();
  if (evaluated) void evaluate(false);
}

function renderExamples(): void {
  $("example-buttons").replaceChildren(
    ...EXAMPLE_PROFILES.map((ex) =>
      h("button", { class: "chip", text: ex.label[lang], attrs: { type: "button" }, on: { click: () => {
        state = structuredClone(ex.state);
        renderForm();
        void evaluate(true);
      } } }),
    ),
  );
}

function shareUrl(): string {
  return `${location.origin}${location.pathname}${encodeShare({ state: buildProfile(state), asOf })}`;
}

async function main(): Promise<void> {
  lang = initLang((l) => {
    lang = l;
    applyLang();
  });
  const dateInput = $<HTMLInputElement>("asof");
  const shared = decodeShare(location.hash);
  if (shared) asOf = shared.asOf;
  dateInput.value = asOf;
  dateInput.min = CONSOLIDATED_FROM;
  dateInput.addEventListener("change", () => {
    asOf = dateInput.value;
    changed();
  });
  $("evaluate").addEventListener("click", () => void evaluate(true));
  $("reset").addEventListener("click", () => {
    state = {};
    evaluated = null;
    $("result").hidden = true;
    $("empty").hidden = false;
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    renderForm();
  });
  $("copy-md").addEventListener("click", async (ev) => {
    if (!evaluated) return;
    const ok = await copyText(obligationsMarkdown({ result: evaluated.result, profile: evaluated.profile, lang, releaseId: evaluated.release.releaseId, manifestSha256: evaluated.release.manifestSha256 }));
    flash(ev.currentTarget as HTMLElement, ok ? t("copied", lang) : t("copyFailed", lang));
  });
  $("download-csv").addEventListener("click", () => {
    if (!evaluated) return;
    download(`aiact-obligations-${evaluated.result.as_of}.csv`, "text/csv", obligationsCsv({ result: evaluated.result, profile: evaluated.profile, lang, releaseId: evaluated.release.releaseId, manifestSha256: evaluated.release.manifestSha256 }));
  });
  $("copy-link").addEventListener("click", async (ev) => {
    const url = shareUrl();
    history.replaceState(null, "", `${location.pathname}${location.search}${url.slice(url.indexOf("#"))}`);
    const ok = await copyText(url);
    flash(ev.currentTarget as HTMLElement, ok ? t("copied", lang) : t("copyFailed", lang));
  });

  try {
    const res = await fetch("data/obligations.json", { cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = (await res.json()) as ObligationsData;
    fields = describeProfileWith(data);
  } catch (e) {
    setStatus("bad", () => `${t("dataFailed", lang)} (${(e as Error).message})`);
    return;
  }
  if (shared) state = sanitizeState(shared.state, fields);
  applyLang();
  if (shared) void evaluate(false);
}

void main();
