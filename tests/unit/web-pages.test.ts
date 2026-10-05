import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUDIT_UI } from "../../src/web/auditText.js";

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
  it("the page scripts never insert HTML", () => {
    for (const f of readdirSync(new URL("../../src/web", import.meta.url))) {
      expect(read(`src/web/${f}`), f).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    }
  });
  it("pages use no external resources", () => {
    for (const p of ["site/audit/index.html", "site/app.css"]) expect(read(p), p).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});
