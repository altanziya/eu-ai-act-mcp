/**
 * Small DOM helpers shared by the browser pages. Everything the user typed or the corpus contains is inserted as text
 * (textContent), never as HTML.
 */
import { pickLang } from "../verify-core/labels.js";
import { STORAGE_KEY } from "./i18n.js";
import type { Lang, Pair } from "./i18n.js";

export type Child = Node | string | null | undefined | false;
export interface Props {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Record<string, (ev: Event) => void>;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (props?.class) e.className = props.class;
  if (props?.text !== undefined) e.textContent = props.text;
  for (const [k, v] of Object.entries(props?.attrs ?? {})) e.setAttribute(k, v);
  for (const [k, fn] of Object.entries(props?.on ?? {})) e.addEventListener(k, fn);
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e as T;
};

function savedLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function saveLang(l: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // storage blocked: the choice lasts for this page view only
  }
}

/** Language of the page: ?lang= wins, then the saved choice, else English. Wires every [data-lang-toggle] button. */
export function initLang(onChange: (lang: Lang) => void): Lang {
  let lang: Lang = pickLang(location.search, savedLang());
  const paint = (): void => {
    document.documentElement.lang = lang;
    for (const e of document.querySelectorAll<HTMLElement>("[data-lang-option]")) {
      const active = e.dataset["langOption"] === lang;
      e.className = active ? "cur" : "";
      if (active) e.setAttribute("aria-current", "true");
      else e.removeAttribute("aria-current");
    }
  };
  for (const b of document.querySelectorAll<HTMLElement>("[data-lang-toggle]")) {
    b.addEventListener("click", () => {
      lang = lang === "en" ? "de" : "en";
      saveLang(lang);
      paint();
      onChange(lang);
    });
  }
  paint();
  return lang;
}

/** Fills every [data-i18n] element (text), [data-i18n-placeholder] and [data-i18n-label] (aria-label) from the dictionary. */
export function applyStatic(dict: Record<string, Pair>, lang: Lang): void {
  for (const e of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const p = dict[e.dataset["i18n"] as string];
    if (p) e.textContent = p[lang];
  }
  for (const e of document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]")) {
    const p = dict[e.dataset["i18nPlaceholder"] as string];
    if (p) e.setAttribute("placeholder", p[lang]);
  }
  for (const e of document.querySelectorAll<HTMLElement>("[data-i18n-label]")) {
    const p = dict[e.dataset["i18nLabel"] as string];
    if (p) e.setAttribute("aria-label", p[lang]);
  }
}

export function download(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = h("a", { attrs: { href: url, download: filename } });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = h("textarea", { attrs: { "aria-hidden": "true" } });
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}

/** Shows a short confirmation on a button for a moment (e.g. "Copied"), then restores its label. */
export function flash(button: HTMLElement, text: string): void {
  const original = button.dataset["label"] ?? button.textContent ?? "";
  button.dataset["label"] = original;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = button.dataset["label"] ?? original;
    delete button.dataset["label"];
  }, 1600);
}
