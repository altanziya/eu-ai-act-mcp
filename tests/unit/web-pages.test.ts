import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUDIT_UI } from "../../src/web/auditText.js";
import { OBLIGATIONS_UI } from "../../src/web/obligationsText.js";

const read = (p: string): string => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const keysIn = (html: string, attr: string): string[] => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((m) => m[1] as string);

describe("static tool pages", () => {
  it("document checker: every data-i18n key of the HTML has an EN and DE text", () => {
    const html = read("site/audit/index.html");
    for (const attr of ["data-i18n", "data-i18n-placeholder", "data-i18n-label"]) {
      for (const k of keysIn(html, attr)) {
        expect(AUDIT_UI, k).toHaveProperty(k);
        const pair = (AUDIT_UI as Record<string, { en: string; de: string }>)[k]!;
        expect(pair.en.length).toBeGreaterThan(0);
        expect(pair.de.length).toBeGreaterThan(0);
      }
    }
  });
  it("obligations navigator: every data-i18n key of the HTML has an EN text and a DE text (the German content note may differ)", () => {
    const html = read("site/obligations/index.html");
    for (const attr of ["data-i18n", "data-i18n-placeholder", "data-i18n-label"]) {
      for (const k of keysIn(html, attr)) {
        expect(OBLIGATIONS_UI, k).toHaveProperty(k);
        expect((OBLIGATIONS_UI as Record<string, { en: string; de: string }>)[k]!.de.length, k).toBeGreaterThan(0);
        expect((OBLIGATIONS_UI as Record<string, { en: string; de: string }>)[k]!.en.length, k).toBeGreaterThan(0);
      }
    }
  });
  it("the page scripts never insert HTML", () => {
    for (const f of readdirSync(new URL("../../src/web", import.meta.url))) {
      expect(read(`src/web/${f}`), f).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    }
  });
  it("pages use no external resources", () => {
    for (const p of ["site/audit/index.html", "site/obligations/index.html", "site/app.css"]) expect(read(p), p).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe("landing page", () => {
  const html = read("site/index.html");
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const copy = read("plan/day-5c-copy.md");
  const values = (prefixes: RegExp): string[] => copy.split("\n").filter((l) => prefixes.test(l)).map((l) => l.slice(l.indexOf(":") + 1).trim().replace(/ \(link to [^)]*\)/, ""));
  it("contains the texts of plan/day-5c-copy.md word for word (EN and DE)", () => {
    const lines = values(/^(Title|Lead|Card \d, (title|text|button)|Text|Snippet|Privacy note|Footer|Karte \d, (Titel|Text|Knopf)|Fußzeile|Datenschutzhinweis|Abschnitt|Section):/);
    expect(lines.length).toBeGreaterThan(30);
    for (const line of lines) {
      // the evaluation sentence ends in a link; compare up to the link text
      const probe = line.endsWith("Evaluation.") ? line.slice(0, -1) : line;
      expect(text, probe).toContain(probe);
    }
  });
  it("links the three tools, the evaluation and the repository and loads nothing external", () => {
    for (const href of ['href="obligations/"', 'href="audit/"', 'href="verify/"', 'href="https://github.com/altanziya/eu-ai-act-mcp/tree/main/eval/results"']) expect(html).toContain(href);
    expect(html).not.toMatch(/<(?:script|link|img)[^>]+(?:src|href)="https?:/);
  });
});
