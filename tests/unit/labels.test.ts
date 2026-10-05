/** Human-readable labels of the verify page: enum translations, language choice, static mandatory texts. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Validity } from "../../src/tools/deadlines.js";
import { conditionalDateLines, languageCheckLabel, pickLang, signatureLabel, statusLabel, STATUS_EXPLANATION, ui, UI, validityLabel, versionRowLabel } from "../../src/verify-core/labels.js";

describe("validityLabel", () => {
  it("translates every state in both languages and keeps the raw state in brackets", () => {
    expect(validityLabel({ state: "in_force_at_as_of" }, "en")).toBe("applicable on the given date (in_force_at_as_of)");
    expect(validityLabel({ state: "in_force_at_as_of" }, "de")).toBe("am Stichtag anwendbar (in_force_at_as_of)");
    expect(validityLabel({ state: "not_yet_applicable_until", until: "2027-12-02" }, "en")).toBe("not yet applicable, applies from 2027-12-02 (not_yet_applicable_until)");
    expect(validityLabel({ state: "not_yet_applicable_until", until: "2027-12-02" }, "de")).toBe("noch nicht anwendbar, gilt ab 2027-12-02 (not_yet_applicable_until)");
    expect(validityLabel({ state: "superseded_by" }, "en")).toBe("superseded by the 2026 amendment (superseded_by)");
    expect(validityLabel({ state: "inserted_by" }, "en")).toBe("inserted by Regulation (EU) 2026/1744 (inserted_by)");
    expect(validityLabel({ state: "unknown" }, "en")).toBe("unknown (unknown)");
    expect(validityLabel({ state: "unknown" }, "de")).toBe("unbekannt (unknown)");
    expect(validityLabel(undefined, "en")).toBe("–");
  });
});

describe("conditionalDateLines", () => {
  const v: Validity = { state: "not_yet_applicable_until", until: "2027-12-02", conditional_dates: [{ date: "2028-08-02", condition: "Annex I systems" }] };
  it("states the later date with its condition", () => {
    expect(conditionalDateLines(v, "en")).toEqual(["For Annex I systems, the rule applies only from 2028-08-02."]);
    expect(conditionalDateLines(v, "de")[0]).toContain("2028-08-02");
    expect(conditionalDateLines({ state: "in_force_at_as_of" }, "en")).toEqual([]);
  });
});

describe("status, language check, signature, version labels", () => {
  it("explains every V0 status in plain language next to the raw value", () => {
    for (const [status, text] of Object.entries(STATUS_EXPLANATION)) {
      expect(statusLabel(status, "en")).toBe(`${text.en} (${status})`);
      expect(text.de.length).toBeGreaterThan(10);
    }
    expect(statusLabel("exact", "en")).toContain("word for word");
    expect(statusLabel("exact", "de")).toContain("wörtlich");
  });
  it("labels the language check, the signature status and the version row", () => {
    expect(languageCheckLabel({ result: "matches", detected_lang: "en" }, "en")).toBe("matches the stated language [en] (matches)");
    expect(signatureLabel("valid", "en")).toBe("valid");
    expect(signatureLabel("valid", "de")).toBe("gültig");
    expect(signatureLabel("something_else", "en")).toBe("something_else");
    expect(versionRowLabel({ version_checked: "02024R1689-20260727" }, "en")).toContain("consolidated text 2026");
  });
  it("has both languages for every UI string", () => {
    for (const [k, v] of Object.entries(UI)) {
      expect(v.en, k).not.toBe("");
      expect(v.de, k).not.toBe("");
    }
    expect(ui("title", "de")).toBe("Evidence Record prüfen");
  });
});

describe("pickLang", () => {
  it("defaults to English; ?lang= and the saved choice select German", () => {
    expect(pickLang("", null)).toBe("en");
    expect(pickLang("?lang=de", null)).toBe("de");
    expect(pickLang("?lang=de", "en")).toBe("de");
    expect(pickLang("?lang=en", "de")).toBe("en");
    expect(pickLang("", "de")).toBe("de");
    expect(pickLang("?lang=fr", "garbage")).toBe("en");
  });
});

describe("static verify page", () => {
  const html = readFileSync(new URL("../../site/verify/index.html", import.meta.url), "utf8");
  it("keeps both mandatory notices and both statements visible in the static HTML", () => {
    for (const text of [
      "Dieser Record verweist auf Textstellen, die mit dem signierten Korpus-Release",
      "This record refers to passages that match the signed corpus release",
      "Keine Rechtsberatung. Dieses Dokument bestätigt keine Konformität eines Systems; es belegt, dass die zitierten Textstellen zum angegebenen Stichtag im genannten Korpus-Release so lauten.",
      "Not legal advice. This document does not certify compliance of any system; it attests that the quoted passages read as stated in the named corpus release on the given date.",
      "Diese Fassung ist nicht rechtlich authentisch; verbindlich ist allein das Amtsblatt (ABl. L 2024/1689, L 2026/1744).",
      "This version is not legally authentic; only the Official Journal (OJ L 2024/1689, L 2026/1744) is binding.",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/<(?:p|section)[^>]*(?:hidden|style=)/);
    expect(html).not.toMatch(/\.box[^{]*\{[^}]*display:\s*none/);
  });
  it("has the language toggle and uses no innerHTML in the page script", () => {
    expect(html).toContain("Deutsch");
    expect(html).toContain("English");
    expect(readFileSync(new URL("../../src/verify-core/browser.ts", import.meta.url), "utf8")).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
  });
});
