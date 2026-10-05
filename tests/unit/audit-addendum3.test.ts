/** Day 5d addendum 3 (plan/day-5d-addendum-3.md): without `lang`, each quotation is checked in its own language; with `lang`, that language decides. */
import { describe, expect, it } from "vitest";
import { auditText } from "../../src/tools/audit.js";
import type { Finding } from "../../src/tools/audit.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import type { CorpusLoader } from "../../src/tools/corpus.js";

const AS_OF = "2026-05-01";
const DE_QUOTE = "\"Die Anbieter und Betreiber von KI-Systemen ergreifen Maßnahmen, um nach besten Kräften sicherzustellen, dass ihr Personal und andere Personen, die in ihrem Auftrag mit dem Betrieb und der Nutzung von KI-Systemen befasst sind, über ein ausreichendes Maß an KI-Kompetenz verfügen\"";
const EN_QUOTE = "\"Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff\"";
const run = (text: string, lang?: "en" | "de", load?: CorpusLoader): Finding[] => auditText({ text, as_of: AS_OF, ...(lang ? { lang } : {}) }, load).findings;
const kinds = (text: string, lang?: "en" | "de", load?: CorpusLoader): string[] => run(text, lang, load).map((f) => f.kind);

describe("quotation checked in its own language without lang", () => {
  it("German quotation: ok in a German and in an English text", () => {
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`)).toContain("quote_ok");
    expect(kinds(`Article 4 says, in the German version: ${DE_QUOTE}.`)).toContain("quote_ok");
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`)).not.toContain("quote_deviates");
  });
  it("English quotation: ok in an English and in a German text (no regression of addendum 2 B)", () => {
    expect(kinds(`Article 4 says: ${EN_QUOTE}.`)).toContain("quote_ok");
    expect(kinds(`Die Pflicht ergibt sich aus Artikel 4: ${EN_QUOTE}. Das gilt für unsere gesamte Belegschaft.`)).toContain("quote_ok");
  });
  it("messages follow the language of the text (English quotation in a German text: German message)", () => {
    const f = run(`Article 4 says: ${EN_QUOTE}.`).find((x) => x.kind === "quote_ok");
    expect(f?.message).toMatch(/^The quotation matches/);
    const g = run(`Die Pflicht zur KI-Kompetenz für Betreiber und Anbieter ergibt sich aus Artikel 4: ${EN_QUOTE}. Das gilt für unsere gesamte Belegschaft.`).find((x) => x.kind === "quote_ok");
    expect(g?.message).toMatch(/^Das Zitat entspricht/);
  });
  it("both languages are requested through the injected loader (browser path)", () => {
    const seen = new Set<string>();
    const load: CorpusLoader = (v, l) => {
      seen.add(`${v}:${l}`);
      return loadCorpus(v, l);
    };
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`, undefined, load)).toContain("quote_ok");
    expect([...seen].some((s) => s.endsWith(":de"))).toBe(true);
    expect([...seen].some((s) => s.endsWith(":en"))).toBe(true);
  });
  it("a deviating German quotation is still reported, not hidden by language detection", () => {
    const bad = DE_QUOTE.replace("KI-Kompetenz", "Datenschutzkompetenz").replace("ein ausreichendes Maß", "ein sehr hohes Maß");
    const k = kinds(`Nach Artikel 4 gilt: ${bad}.`);
    expect(k).not.toContain("quote_ok");
  });
});

describe("counter-probe: explicit lang still decides", () => {
  it("lang=de accepts the German quotation, lang=en reports the other language", () => {
    expect(kinds(`Nach Artikel 4 gilt: ${DE_QUOTE}.`, "de")).toContain("quote_ok");
    const f = run(`Nach Artikel 4 gilt: ${DE_QUOTE}.`, "en");
    expect(f.map((x) => x.kind)).not.toContain("quote_ok");
    expect(f.find((x) => x.kind === "quote_deviates")?.message).toMatch(/another language than en/);
  });
  it("lang=de rejects an English quotation and names de (messages in the audit language)", () => {
    const f = run(`Article 4 says: ${EN_QUOTE}.`, "de");
    expect(f.map((x) => x.kind)).not.toContain("quote_ok");
    expect(f.find((x) => x.kind === "quote_deviates")?.message).toMatch(/anderen Sprache als de/);
  });
});
