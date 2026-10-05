import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";

const NOW = "2026-10-05";
const BEFORE = "2026-03-15";
const run = (text: string, as_of = NOW, lang?: "en" | "de") => auditText({ text, as_of, ...(lang ? { lang } : {}) });
const kinds = (text: string, as_of = NOW, lang?: "en" | "de"): string[] => run(text, as_of, lang).findings.map((f) => f.kind);
const find = (r: ReturnType<typeof run>, kind: string): Finding | undefined => r.findings.find((f) => f.kind === kind);
const words = (id: string, version: string, n: number): string => loadCorpus(version as typeof V2024, "en").byId.get(id)?.text.split(/\s+/).slice(0, n).join(" ") ?? "";

describe("citations", () => {
  it("accepts existing citations in the version in force (EN, DE) with the citation and node", () => {
    const r = run("See Article 9(2) and Annex III, point 4(a).");
    expect(r.findings.map((f) => [f.kind, f.severity, f.node, f.ref])).toEqual([
      ["reference_ok", "ok", "art_9.par_2", "Article 9(2)"],
      ["reference_ok", "ok", "anx_3.pt_4.a", "Annex III, point 4(a)"],
    ]);
    const de = run("Siehe Artikel 9 Absatz 2.", NOW, "de");
    expect(de.findings[0]).toMatchObject({ kind: "reference_ok", ref: "Artikel 9 Absatz 2", node: "art_9.par_2" });
  });
  it("accepts the numbered-point reading of Article 3(1) and a skipped subparagraph level", () => {
    expect(kinds("Article 3(1) defines an AI system.")).toEqual(["reference_ok"]);
    expect(kinds("Article 5(1), first subparagraph, point (ba) is new.")).toEqual(["reference_ok"]);
  });
  it("reads Article 113(3)(c) as the third paragraph, point (c), in EN and DE", () => {
    expect(run("See Article 113(3)(c).").findings[0]).toMatchObject({ kind: "reference_ok", node: "art_113.sub_3.c", ref: "Article 113, third paragraph, point (c)" });
    expect(run("Siehe Artikel 113 Absatz 3 Buchstabe c.", NOW, "de").findings[0]).toMatchObject({ kind: "reference_ok", node: "art_113.sub_3.c" });
    expect(kinds("See Article 113(3)(c)(i).")).toEqual(["reference_ok"]);
    expect(kinds("See Article 113(9).")).toEqual(["unknown_provision"]);
  });
  it("flags a removed provision and suggests where it moved (EN, DE)", () => {
    const f = find(run("Article 10(5) allows special categories."), "removed_provision");
    expect(f).toMatchObject({ severity: "error", node: "art_10.par_5", ref: "Article 10(5)" });
    expect(f?.suggestion).toMatch(/Article 4a\(1\)/);
    expect(f?.sources).toEqual(expect.arrayContaining([`${V2024}:art_10.par_5`, `${V2026}:art_4a.par_1`]));
    const de = find(run("Artikel 10 Absatz 5 erlaubt dies.", NOW, "de"), "removed_provision");
    expect(de?.suggestion).toMatch(/Artikel 4a Absatz 1/);
  });
  it("says so when a removed provision has no counterpart", () => {
    const f = find(run("Recital 12 explains it. Article 8(3) is cited."), "removed_provision");
    expect(f).toBeUndefined();
    const removed = loadCorpus(V2024, "en").nodes.find((n) => n.type === "article" && !loadCorpus(V2026, "en").byId.has(n.id));
    if (removed) expect(find(run(`Article ${removed.id.slice(4)} says so.`), "removed_provision")?.suggestion).toBeTruthy();
  });
  it("flags unknown provisions and unknown pinpoints in existing articles as errors", () => {
    expect(run("See Article 999(3).").findings[0]).toMatchObject({ kind: "unknown_provision", severity: "error", sources: [] });
    expect(run("See Article 9(99).").findings[0]).toMatchObject({ kind: "unknown_provision", severity: "error" });
    expect(kinds("Siehe Anhang XXX.")).toEqual(["unknown_provision"]);
  });
  it("a provision inserted later is only a warning for a date before the amendment", () => {
    expect(run("Article 4a(1) allows it.", BEFORE).findings[0]).toMatchObject({ kind: "unknown_provision", severity: "warning" });
    expect(run("Article 4a(1) allows it.", NOW).findings[0]).toMatchObject({ kind: "reference_ok" });
    expect(run("Article 10(5) allows it.", BEFORE).findings[0]).toMatchObject({ kind: "reference_ok" });
  });
  it("lists check the first and the last article only", () => {
    const r = run("Articles 102 to 110 apply.");
    expect(r.findings.filter((f) => f.kind === "reference_ok").map((f) => f.node)).toEqual(["art_102", "art_110"]);
    expect(kinds("Articles 100 to 999")).toEqual(["reference_ok", "unknown_provision"]);
  });
  it("ignores citations of other acts", () => {
    expect(kinds("Article 6 GDPR and Article 9(1) of Regulation (EU) 2016/679.")).toEqual(["no_references"]);
  });
});

describe("deadlines", () => {
  const T = (date: string): string => `Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from ${date}.`;
  it.each([
    ["2 August 2026"],
    ["2nd August 2026"],
    ["August 2, 2026"],
    ["2026-08-02"],
    ["2.8.2026"],
    ["02.08.2026"],
  ])("flags the pre-amendment Annex III date written as %s", (d) => {
    const f = find(run(T(d)), "outdated_deadline");
    expect(f).toMatchObject({ severity: "error", expected: "2027-12-02", found: "2026-08-02" });
    expect(f?.message).toMatch(/2026\/1744/);
    expect(f?.sources).toEqual(expect.arrayContaining([`${V2024}:art_113.sub_2`, `${V2026}:art_113.sub_3.c.i`]));
  });
  it("German dates and sentences", () => {
    const f = find(run("Nach Artikel 6 Absatz 2 und Anhang III gelten die Pflichten ab dem 2. August 2026.", NOW, "de"), "outdated_deadline");
    expect(f).toMatchObject({ expected: "2027-12-02", found: "2026-08-02" });
    expect(f?.message).toMatch(/geändert/);
    expect(kinds("Nach Artikel 6 Absatz 2 gelten die Pflichten ab dem 2. Dezember 2027.", NOW, "de")).toContain("deadline_ok");
  });
  it("accepts the current date and the old date before the amendment, one finding per date", () => {
    const ok = run(T("2 December 2027"));
    expect(ok.findings.filter((f) => f.kind === "deadline_ok")).toHaveLength(1);
    expect(ok.summary.error).toBe(0);
    expect(run(T("2 August 2026"), BEFORE).summary.error).toBe(0);
  });
  it("a date of the later version before the amendment is only unverified (warning)", () => {
    const f = find(run(T("2 December 2027"), BEFORE), "unverified_date");
    expect(f).toMatchObject({ severity: "warning", expected: "2026-08-02", found: "2027-12-02" });
  });
  it("Annex I with high-risk maps to Article 6(1)", () => {
    const f = find(run("High-risk AI systems under Annex I apply from 2 August 2027."), "outdated_deadline");
    expect(f).toMatchObject({ expected: "2028-08-02", found: "2027-08-02" });
    expect(kinds("High-risk AI systems under Annex I apply from 2 August 2028.")).toContain("deadline_ok");
  });
  it("anchor terms without a citation: general-purpose AI, prohibited practices, AI literacy, transparency obligations", () => {
    expect(kinds("Obligations for general-purpose AI models apply from 2 August 2025.")).toEqual(["deadline_ok"]);
    expect(find(run("The prohibited practices apply from 2 August 2025."), "unverified_date")).toMatchObject({ expected: "2025-02-02" });
    expect(kinds("AI literacy applies from 2 February 2025.")).toEqual(["deadline_ok"]);
    expect(kinds("The transparency obligations apply from 2 August 2026.")).toEqual(["deadline_ok"]);
    expect(kinds("Die Verpflichtungen für KI-Modelle mit allgemeinem Verwendungszweck gelten ab dem 2. August 2025.", NOW, "de")).toEqual(["deadline_ok"]);
  });
  it("text deadlines take precedence: the date written in the provision (EN and DE)", () => {
    const f = find(run("Under Article 57(1), a sandbox must be operational by 2 August 2026."), "outdated_deadline");
    expect(f).toMatchObject({ expected: "2027-08-02", found: "2026-08-02", node: "art_57.par_1" });
    expect(f?.sources).toEqual([`${V2024}:art_57.par_1`, `${V2026}:art_57.par_1`]);
    expect(kinds("Under Article 57(1), a sandbox must be operational by 2 August 2027.")).toContain("deadline_ok");
    expect(kinds("Under Article 57(1), a sandbox must be operational by 2 August 2026.", BEFORE)).toContain("deadline_ok");
    const de = find(run("Nach Artikel 57 Absatz 1 muss die Sandbox bis zum 2. August 2026 betriebsbereit sein.", NOW, "de"), "outdated_deadline");
    expect(de?.expected).toBe("2027-08-02");
  });
  it("a different date in a sentence with a trigger word is unverified with the expected date", () => {
    expect(find(run("Under Article 6(2) the rules apply from 1 January 2030."), "unverified_date")).toMatchObject({ severity: "warning", expected: "2027-12-02", found: "2030-01-01" });
  });
  it("a date in a sentence without a trigger word or without a subject is left alone", () => {
    expect(kinds("Article 6(2) was discussed on 1 January 2030.")).toEqual(["reference_ok"]);
    expect(kinds("The meeting is on 2 August 2026.")).toEqual(["no_references"]);
  });
  it("the nearest citation decides in a sentence with two dates", () => {
    const r = run("Article 5 applies from 2 February 2025 and Article 6(2) applies from 2 August 2026.");
    expect(r.findings.filter((f) => f.kind === "deadline_ok")).toHaveLength(1);
    expect(find(r, "outdated_deadline")).toMatchObject({ found: "2026-08-02", expected: "2027-12-02" });
  });
  it("a date in a citation list is not read as an article", () => {
    expect(kinds("Under Article 113, 2 August 2026 is the day it applies.")).toEqual(["reference_ok", "deadline_ok"]);
  });
});

describe("quotations", () => {
  const q57 = "Member States shall ensure that their competent authorities establish at least one AI regulatory sandbox at national level, which shall be operational by 2 August 2026.";
  it("quote_ok / outdated_quote with the current wording as expected", () => {
    const t = `Article 57(1) reads: "${q57}"`;
    expect(find(run(t, BEFORE), "quote_ok")?.severity).toBe("ok");
    const f = find(run(t), "outdated_quote");
    expect(f?.severity).toBe("error");
    expect(f?.expected).toMatch(/2 August 2027/);
    expect(find(run(t), "deadline_ok") ?? find(run(t), "outdated_deadline")).toBeUndefined(); // the date inside the quotation is left to the quotation check
  });
  it("works with German quotation marks and the citation in the previous sentence", () => {
    const de = loadCorpus(V2026, "de").byId.get("art_9.par_1")?.text ?? "";
    const quote = de.split(/\s+/).slice(0, 12).join(" ");
    const r = run(`Siehe Artikel 9 Absatz 1. Dort heißt es: „${quote}“`, NOW, "de");
    expect(r.findings.map((f) => f.kind)).toEqual(["reference_ok", "quote_ok"]);
  });
  it("wrong_pinpoint names the right place", () => {
    const quote = words("art_14.par_1", V2026, 14);
    const f = find(run(`Article 15(1) says "${quote}".`), "wrong_pinpoint");
    expect(f).toMatchObject({ severity: "warning", expected: "Article 14(1)", found: "Article 15(1)" });
  });
  it("quote_not_found for wording that is not in the Act, nothing for short or unattached quotations", () => {
    expect(find(run('Article 9(2) says "Providers shall always keep entirely unrelated imaginary wording about bananas".'), "quote_not_found")?.severity).toBe("error");
    expect(kinds('Article 9(2) says "keep bananas".')).toEqual(["reference_ok"]);
    expect(kinds('He said "Providers shall always keep entirely unrelated imaginary wording about bananas" yesterday.')).toEqual(["no_references"]);
  });
  it("one replaced word is a slight deviation (warning), a dropped word is not found (error)", () => {
    const w = words("art_14.par_1", V2026, 20).split(" ");
    const say = (ws: string[]): string => `Article 14(1) says "${ws.join(" ")}"`;
    expect(find(run(say(w.map((x, i) => (i === 5 ? "quite" : x)))), "quote_deviates")).toMatchObject({ severity: "warning", node: "art_14.par_1" });
    expect(find(run(say(w.filter((_, i) => i !== 7))), "quote_not_found")?.severity).toBe("error");
  });
  it("a changed number in a quotation is a deviation (warning)", () => {
    const quote = words("art_113.sub_2", V2026, 7).replace("2026", "2031");
    const f = find(run(`Article 113 says "${quote}"`), "quote_deviates");
    expect(f?.severity).toBe("warning");
  });
});

describe("result shape", () => {
  const text = "Under Article 6(2) and Annex III, the obligations for high-risk AI systems apply from 2 August 2026. See Article 999. Article 10(5) too.";
  const r = run(text);
  it("findings are ordered by span.start, inside the text, and the excerpt is the text at the span", () => {
    const starts = r.findings.map((f) => f.span.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const f of r.findings) {
      expect(f.span.start).toBeGreaterThanOrEqual(0);
      expect(f.span.end).toBeLessThanOrEqual(text.length);
      expect(text.slice(f.span.start, f.span.end)).toBe(f.excerpt);
    }
  });
  it("has no double findings and the summary counts the severities", () => {
    const keys = r.findings.map((f) => `${f.kind}@${f.span.start}-${f.span.end}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(r.summary).toEqual({
      error: r.findings.filter((f) => f.severity === "error").length,
      warning: r.findings.filter((f) => f.severity === "warning").length,
      info: r.findings.filter((f) => f.severity === "info").length,
      ok: r.findings.filter((f) => f.severity === "ok").length,
    });
    expect(r.summary.error).toBe(3);
  });
  it("carries the version, the notice (both versions when the other one was used) and echoes as_of", () => {
    expect(r.version_checked).toBe(V2026);
    expect(r.as_of).toBe(NOW);
    expect(r.notice.en).toMatch(/32024R1689/);
    expect(run("See Article 9(2).").notice.en).not.toMatch(/Official Journal version 32024R1689/);
    expect(run("See Article 9(2).", BEFORE).version_checked).toBe(V2024);
  });
  it("no references: zero counts except the info finding", () => {
    const e = run("Nothing to see here.");
    expect(e.summary).toEqual({ error: 0, warning: 0, info: 1, ok: 0 });
    expect(e.findings[0]).toMatchObject({ kind: "no_references", severity: "info", message: "no references found" });
    expect(run("").findings[0]?.kind).toBe("no_references");
  });
  it("is deterministic and rejects a bad as_of or lang", () => {
    expect(JSON.stringify(run(text))).toBe(JSON.stringify(run(text)));
    expect(() => run(text, "yesterday")).toThrow(/as_of/);
    expect(() => run(text, NOW, "fr" as "en")).toThrow(/lang/);
  });
});

describe("audit core stays isomorphic", () => {
  it("bundles for the browser without any node: builtin", async () => {
    const res = await build({ entryPoints: ["src/tools/auditCore.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", outdir: "out", logLevel: "silent", metafile: true });
    expect(Object.keys(res.metafile.inputs).filter((i) => /(-fs\.ts|config\.ts)$/.test(i))).toEqual([]);
    for (const f of res.outputFiles) expect(f.text).not.toMatch(/from\s*["']node:|require\(["'](node:|fs["'])/);
  });
});
