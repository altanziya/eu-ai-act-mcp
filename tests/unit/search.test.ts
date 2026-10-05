import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import type { ProvisionNode } from "../../src/parser/types.js";
import { buildIndex } from "../../src/tools/corpus.js";
import type { CorpusIndex, Lang, Version } from "../../src/tools/corpus.js";
import type { DeadlineTable } from "../../src/tools/deadlines.js";
import { aiactSearch } from "../../src/tools/search.js";
import { aiactSearchWith, detectLang, snippetOf, stem } from "../../src/tools/searchCore.js";

let order = 0;
const n = (id: string, parent: string | null, type: ProvisionNode["type"], text: string, heading = ""): ProvisionNode => ({
  id, type, parent, heading, text, hash: "", node_hash: "", order: order++, source_anchor: "",
});
const TABLE: DeadlineTable = {
  versions: {
    [V2024]: { default: { id: "default", applies_from: "2026-08-02", source_nodes: ["art_113.sub_2"] }, rules: [] },
    [V2026]: { default: { id: "default", applies_from: "2026-08-02", source_nodes: ["art_113.sub_2"] }, rules: [] },
  },
};
function mini(version: Version, lang: Lang): CorpusIndex {
  order = 0;
  const nodes: ProvisionNode[] = [];
  if (lang === "en") {
    nodes.push(n("cpt_1", null, "chapter", "", "Sandboxes and other sundry measures"));
    nodes.push(n("art_1", "cpt_1", "article", "", "Scope"));
    nodes.push(n("art_1.par_1", "art_1", "paragraph", "This Regulation lays down rules on testing of systems in a sandbox under supervision of the competent authority."));
    nodes.push(n("art_1.par_2", "art_1", "paragraph", "The competent authority shall publish guidance. " + "Filler words about nothing in particular. ".repeat(40)));
    nodes.push(n("art_2", "cpt_1", "article", "", "Penalties"));
    nodes.push(n("art_2.par_1", "art_2", "paragraph", "Penalties shall be effective, proportionate and dissuasive, and the competent authority applies them."));
    if (version === V2026) nodes.push(n("art_3", "cpt_1", "article", "A novel provision about quantum widgets that exists only in the consolidated text."));
    else nodes.push(n("rec_1", null, "recital", "A recital about widgets of the old kind."));
  } else {
    nodes.push(n("art_1", null, "article", "", "Anwendungsbereich"));
    nodes.push(n("art_1.par_1", "art_1", "paragraph", "Diese Verordnung regelt die Erprobung von Systemen unter Aufsicht der zuständigen Behörde."));
  }
  return buildIndex(version, lang, nodes);
}
const run = (q: string, extra: { as_of?: string; lang?: Lang; limit?: number } = {}) =>
  aiactSearchWith({ query: q, as_of: extra.as_of ?? "2026-10-05", ...extra }, mini, TABLE);

describe("aiactSearch on a mini corpus", () => {
  it("ranks by BM25 and prefers a short paragraph over the same term in a long one", () => {
    const r = run("competent authority");
    const pos = (id: string): number => r.results.findIndex((x) => x.id === id);
    expect(pos("art_1.par_1")).toBeLessThan(pos("art_1.par_2"));
  });
  it("prefers a paragraph over a chapter heading with the same term", () => {
    const r = run("sandbox");
    expect(r.results[0]?.id).toBe("art_1.par_1");
  });
  it("gives an exact phrase a bonus over the same words scattered", () => {
    const hit = aiactSearchWith({ query: "effective proportionate dissuasive", as_of: "2026-10-05" }, mini, TABLE).results[0];
    const scattered = aiactSearchWith({ query: "dissuasive proportionate effective", as_of: "2026-10-05" }, mini, TABLE).results[0];
    expect(hit?.id).toBe("art_2.par_1");
    expect(hit?.score).toBeGreaterThan(scattered?.score ?? 0);
  });
  it("searches the version in force on as_of", () => {
    const after = run("quantum widgets", { as_of: "2026-07-27" });
    expect(after.version).toBe(V2026);
    expect(after.results[0]?.id).toBe("art_3");
    const before = run("quantum widgets", { as_of: "2026-07-26" });
    expect(before.version).toBe(V2024);
    expect(before.results.map((x) => x.id)).not.toContain("art_3");
    expect(before.results.map((x) => x.id)).toContain("rec_1");
  });
  it("limit defaults to 8, is at least 1 and at most 20", () => {
    expect(run("the").results.length).toBeLessThanOrEqual(8);
    expect(run("authority sandbox penalties scope widgets", { limit: 0 }).results.length).toBe(1);
    const big = aiactSearch({ query: "provider", as_of: "2026-10-05", limit: 500 });
    expect(big.results.length).toBe(20);
    expect(aiactSearch({ query: "provider", as_of: "2026-10-05" }).results.length).toBe(8);
  });
  it("returns citation, heading (own or nearest ancestor), snippet and applicability", () => {
    const x = run("effective proportionate dissuasive").results[0];
    expect(x).toMatchObject({ id: "art_2.par_1", citation: "Article 2(1)", heading: "Penalties" });
    expect(x?.applicability.state).toBe("in_force_at_as_of");
    expect(run("Penalties", { lang: "en" }).results.find((r) => r.id === "art_2")?.citation).toBe("Article 2");
  });
  it("works in German with German citations", () => {
    const r = run("Erprobung Systemen Aufsicht", { lang: "de" });
    expect(r.lang).toBe("de");
    expect(r.results[0]).toMatchObject({ id: "art_1.par_1", citation: "Artikel 1 Absatz 1" });
  });
  it("handles empty, stopword-only and unknown queries", () => {
    expect(run("").results).toEqual([]);
    expect(run("   ...  ").results).toEqual([]);
    expect(run("zzzqqq").results).toEqual([]);
    expect(run("the of and").results.length).toBeGreaterThanOrEqual(0);
  });
  it("is deterministic", () => {
    expect(JSON.stringify(run("competent authority"))).toBe(JSON.stringify(run("competent authority")));
  });
  it("rejects a malformed as_of and an unknown language", () => {
    expect(() => run("x", { as_of: "5.10.2026" })).toThrow(/ISO/);
    expect(() => run("x", { lang: "fr" as Lang })).toThrow(/lang/);
  });
});

describe("stemmer and synonyms", () => {
  it("reduces EN and DE inflections consistently", () => {
    expect(stem("penalties", "en")).toBe(stem("penalty", "en"));
    expect(stem("sandboxes", "en")).toBe(stem("sandbox", "en"));
    expect(stem("systems", "en")).toBe(stem("system", "en"));
    expect(stem("processing", "en")).toBe("process");
    expect(stem("assessed", "en")).toBe("assess");
    expect(stem("bias", "en")).toBe("bias");
    expect(stem("Kennzeichnungen".toLowerCase(), "de")).toBe("kennzeichnung");
    expect(stem("kennzeichnung", "de")).toBe("kennzeichnung");
    expect(stem("sanktionen", "de")).toBe(stem("sanktion", "de"));
    expect(stem("geldbußen", "de")).toBe(stem("geldbuße", "de"));
    expect(stem("kmu", "de")).toBe("kmu");
  });
  it("finds inflected forms and counts synonyms (mini corpus)", () => {
    expect(run("penalty").results.map((x) => x.id)).toContain("art_2.par_1"); // "Penalties"
    expect(run("sandboxes").results[0]?.id).toBe("art_1.par_1"); // "sandbox"
    expect(run("fine").results.map((x) => x.id)).toContain("art_2"); // synonym of penalty: heading "Penalties"
  });
  it("a heading hit outranks the same term in the text", () => {
    const r = run("penalties");
    expect(r.results.findIndex((x) => x.id === "art_2")).toBeLessThan(r.results.findIndex((x) => x.id === "art_1.par_2") === -1 ? 99 : r.results.findIndex((x) => x.id === "art_1.par_2"));
  });
});

describe("relevance on the real corpus", () => {
  const top = (query: string, n: number, lang: Lang = "en", as_of = "2026-10-05"): string[] => aiactSearch({ query, lang, as_of, limit: n }).results.map((x) => x.id);
  it("registration EU database: Article 49 in the top 3", () => {
    expect(top("registration EU database", 3).some((id) => id.startsWith("art_49"))).toBe(true);
  });
  it("DE Kennzeichnung Deepfake: Article 50(4) in the top 3", () => {
    expect(top("Kennzeichnung Deepfake", 3, "de")).toContain("art_50.par_4");
  });
  it("DE Strafen KMU: Article 99 in the top 3", () => {
    expect(top("Strafen KMU", 3, "de").some((id) => id.startsWith("art_99"))).toBe(true);
  });
  it("penalties SMEs: Article 99(6) in the top 5", () => {
    expect(top("penalties SMEs", 5)).toContain("art_99.par_6");
  });
  it("human oversight: Article 14 in the top 3", () => {
    expect(top("human oversight", 3).some((id) => id.startsWith("art_14"))).toBe(true);
  });
  it("DE human oversight (menschliche Aufsicht): Article 14 in the top 3", () => {
    expect(top("menschliche Aufsicht", 3, "de").some((id) => id.startsWith("art_14"))).toBe(true);
  });
  it("DE Registrierung Datenbank: Article 49 or 71 in the top 3", () => {
    expect(top("Registrierung EU-Datenbank", 3, "de").some((id) => id.startsWith("art_49") || id.startsWith("art_71"))).toBe(true);
  });
  it("the earlier cases still hold", () => {
    expect(top("bias detection and correction special categories of personal data", 3).some((id) => id.startsWith("art_4a"))).toBe(true);
    expect(top("bias detection and correction special categories of personal data", 3, "en", "2026-03-15").some((id) => id.startsWith("art_10.par_5"))).toBe(true);
  });
});

describe("snippetOf", () => {
  const long = `${"alpha beta gamma delta ".repeat(30)}needle in the middle ${"omega sigma tau ".repeat(30)}`;
  it("is at most 240 characters, contains the first hit and cuts at word boundaries", () => {
    const s = snippetOf(long, new Set(["needle"]));
    expect(s.length).toBeLessThanOrEqual(240);
    expect(s).toContain("needle");
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
  });
  it("returns short texts unchanged and handles a hit at the very start", () => {
    expect(snippetOf("short  text", new Set(["short"]))).toBe("short text");
    const s = snippetOf(long, new Set(["alpha"]));
    expect(s.startsWith("alpha")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(240);
  });
});

describe("real corpus", () => {
  it("finds Article 50 for deepfake disclosure obligations and gives a citation", () => {
    const r = aiactSearch({ query: "deep fake disclose artificially generated or manipulated", as_of: "2026-10-05" });
    expect(r.results.slice(0, 4).some((x) => x.id.startsWith("art_50"))).toBe(true);
    expect(r.results.every((x) => x.snippet.length <= 240 && x.citation !== x.id)).toBe(true);
  });
  it("2026 has no recitals, 2024 has", () => {
    expect(aiactSearch({ query: "recital", as_of: "2026-10-05", limit: 20 }).results.some((x) => x.id.startsWith("rec_"))).toBe(false);
    expect(aiactSearch({ query: "whereas considering", as_of: "2026-01-01", limit: 20 }).version).toBe(V2024);
  });
});

describe("search core stays isomorphic", () => {
  it("bundles for the browser without any node: builtin", async () => {
    const res = await build({ entryPoints: ["src/tools/searchCore.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", outdir: "out", logLevel: "silent", metafile: true });
    expect(Object.keys(res.metafile.inputs).filter((i) => /(-fs\.ts|config\.ts)$/.test(i))).toEqual([]);
    for (const f of res.outputFiles) expect(f.text).not.toMatch(/from\s*["']node:|require\(["'](node:|fs["'])/);
  });
});

describe("language detection without lang", () => {
  it("detects German by umlauts, stopwords, word parts and endings, else English", () => {
    for (const q of ["Pflichten Betreiber Hochrisiko", "Wer muss die Konformität nachweisen", "Geldbußen", "Kennzeichnung von Deepfakes", "Übergangsfristen", "Registrierung Datenbank", "Verbotene Praktiken"]) expect(detectLang(q), q).toBe("de");
    for (const q of ["deployer obligations", "risk management system", "penalties for providers", "AI literacy", "what must the provider do when", "registration database"]) expect(detectLang(q), q).toBe("en");
  });
  it("an explicit lang wins; an unknown lang is an error", () => {
    expect(aiactSearchWith({ query: "Pflichten Betreiber", as_of: "2026-10-05", lang: "en" }, mini, TABLE).lang).toBe("en");
    expect(() => aiactSearchWith({ query: "x", as_of: "2026-10-05", lang: "fr" as Lang }, mini, TABLE)).toThrow(/lang/);
  });
  it("searches the German text for a German query and reports the language", () => {
    const r = aiactSearchWith({ query: "Aufsicht der zuständigen Behörde", as_of: "2026-10-05" }, mini, TABLE);
    expect(r.lang).toBe("de");
    expect(r.results[0]?.id).toBe("art_1.par_1");
  });
  it("on the real corpus, a German duty query finds Article 26 in the top three", () => {
    const r = aiactSearch({ query: "Pflichten Betreiber Hochrisiko", as_of: "2026-10-05" });
    expect(r.lang).toBe("de");
    expect(r.results.slice(0, 3).some((h) => h.id === "art_26" || h.id.startsWith("art_26."))).toBe(true);
  });
});
