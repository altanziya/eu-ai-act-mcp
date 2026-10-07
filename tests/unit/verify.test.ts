/**
 * verifyCitation on a constructed mini corpus (precedence, multiple_matches, multi_node, ellipsis, hard tokens, V1/V2)
 * and on the real corpus (cross-node quote). No network; `as_of` is always passed.
 */
import { describe, expect, it } from "vitest";
import { V2024, V2026 } from "../../src/config.js";
import type { ProvisionNode } from "../../src/parser/types.js";
import { buildIndex } from "../../src/tools/corpus.js";
import { loadCorpus } from "../../src/tools/corpus-fs.js";
import type { CorpusIndex, Lang, Version } from "../../src/tools/corpus.js";
import { verifyCitation } from "../../src/tools/verifyCitation.js";
import { Postings, overlaps } from "../../src/tools/verifyCore.js";
import { prepareQuote, tokenize } from "../../src/tools/match.js";

let order = 0;
const n = (id: string, parent: string | null, type: ProvisionNode["type"], text: string): ProvisionNode => ({
  id, type, parent, heading: "", text, hash: "", node_hash: "", order: order++, source_anchor: "",
});

const TEXT_A = "The provider shall keep the technical documentation at the disposal of the national competent authorities for a period of ten years after the system has been placed on the market";
const TEXT_B = "Deployers shall inform natural persons that they are subject to the use of the high-risk system and shall keep logs for at least six months";
const TEXT_DUP = "Member States shall lay down the rules on penalties applicable to infringements of this Regulation and shall take all measures necessary";
const NEW_2026 = "The Commission shall publish an annual overview of all measures notified by the competent authorities under this Chapter within twelve months";

function mini(version: Version, lang: Lang): CorpusIndex {
  order = 0;
  const nodes: ProvisionNode[] = [];
  if (lang === "en") {
    nodes.push(n("art_1", null, "article", ""));
    nodes.push(n("art_1.par_1", "art_1", "paragraph", TEXT_A));
    nodes.push(n("art_1.par_2", "art_1", "paragraph", TEXT_B));
    nodes.push(n("art_2", null, "article", ""));
    nodes.push(n("art_2.par_1", "art_2", "paragraph", TEXT_DUP));
    nodes.push(n("art_3", null, "article", ""));
    nodes.push(n("art_3.par_1", "art_3", "paragraph", TEXT_DUP));
    nodes.push(n("art_4", null, "article", "The first half of a sentence that starts in one node and continues"));
    nodes.push(n("art_4.sub_2", "art_4", "subparagraph", "in the next node with a short end of the sentence"));
    if (version === V2026) nodes.push(n("art_5", null, "article", NEW_2026));
  } else {
    nodes.push(n("art_1", null, "article", ""));
    nodes.push(n("art_1.par_1", "art_1", "paragraph", "Der Anbieter hält die technischen Unterlagen für die nationalen zuständigen Behörden für einen Zeitraum von zehn Jahren bereit, nachdem das System in Verkehr gebracht wurde"));
  }
  return buildIndex(version, lang, nodes);
}
const run = (input: Parameters<typeof verifyCitation>[0]) => verifyCitation(input, mini);

describe("verifyCitation: precedence on a mini corpus", () => {
  it("exact at the claimed ref (also for a descendant-level claim)", () => {
    const r = run({ quote: TEXT_A, claimed_ref: "Article 1(1)", as_of: "2026-09-01" });
    expect(r.status).toBe("exact");
    expect(r.match?.provision_id).toBe("art_1.par_1");
    expect(r.claimed_ref_id).toBe("art_1.par_1");
    const up = run({ quote: TEXT_A, claimed_ref: "Article 1", as_of: "2026-09-01" });
    expect(up.status).toBe("exact");
  });
  it("wrong pinpoint -> found_at_other_provision with the right id", () => {
    const r = run({ quote: TEXT_B, claimed_ref: "Article 1(1)", as_of: "2026-09-01" });
    expect(r.status).toBe("found_at_other_provision");
    expect(r.provision_id).toBe("art_1.par_2");
  });
  it("multiple_matches without pinpoint, with candidates in document order", () => {
    const r = run({ quote: TEXT_DUP, as_of: "2026-09-01" });
    expect(r.status).toBe("multiple_matches");
    expect(r.candidates?.map((c) => c.provision_id)).toEqual(["art_2.par_1", "art_3.par_1"]);
    expect(r.validity.state).toBe("unknown");
  });
  it("multiple matches but one at the claimed ref -> the pinpoint wins", () => {
    const r = run({ quote: TEXT_DUP, claimed_ref: "Article 3", as_of: "2026-09-01" });
    expect(r.status).toBe("exact");
    expect(r.match?.provision_id).toBe("art_3.par_1");
  });
  it("multiple matches, claimed ref matches none -> multiple_matches", () => {
    expect(run({ quote: TEXT_DUP, claimed_ref: "Article 1(1)", as_of: "2026-09-01" }).status).toBe("multiple_matches");
  });
  it("text only in the other version -> found_other_version and V1 by direction", () => {
    const early = run({ quote: NEW_2026, claimed_ref: "Article 5", as_of: "2026-06-01" });
    expect(early).toMatchObject({ status: "found_other_version", version_checked: V2024, found_in_version: V2026 });
    expect(early.validity).toEqual({ state: "inserted_by", act: "32026R1744" });
    const late = run({ quote: TEXT_A, claimed_ref: "Article 1(1)", as_of: "2026-09-01", lang: "en" });
    expect(late.status).toBe("exact");
  });
  it("text only in the other language -> found_other_language, V2 differs", () => {
    const de = "Der Anbieter hält die technischen Unterlagen für die nationalen zuständigen Behörden für einen Zeitraum von zehn Jahren bereit, nachdem das System in Verkehr gebracht wurde";
    const r = run({ quote: de, claimed_ref: "Article 1(1)", as_of: "2026-09-01", lang: "en" });
    expect(r).toMatchObject({ status: "found_other_language", found_in_lang: "de" });
    expect(r.language_check).toEqual({ result: "differs", detected_lang: "de" });
    const ok = run({ quote: de, claimed_ref: "Article 1(1)", as_of: "2026-09-01", lang: "de" });
    expect(ok.status).toBe("exact");
    expect(ok.language_check).toEqual({ result: "matches", detected_lang: "de" });
  });
  it("exact/fuzzy anywhere beats a hard-token mismatch in the primary corpus", () => {
    // the changed-year text exists nowhere exactly, so this is a mismatch ...
    const changed = TEXT_B.replace("six months", "seven months");
    expect(run({ quote: changed, as_of: "2026-09-01" })).toMatchObject({ status: "mismatch_hard_token", provision_id: "art_1.par_2" });
    // ... while a quote that matches exactly in the other version is reported as that, not as a mismatch
    const r = run({ quote: NEW_2026, as_of: "2026-06-01" });
    expect(r.status).toBe("found_other_version");
  });
  it("hard-token differences are listed, soft tokens must agree", () => {
    const r = run({ quote: TEXT_B.replace("six months", "seven months"), claimed_ref: "art_1.par_2", as_of: "2026-09-01" });
    expect(r.status).toBe("mismatch_hard_token");
    expect(r.hard_token_mismatches).toEqual([{ in_quote: "seven", in_corpus: "six" }]);
    const neg = run({ quote: TEXT_A.replace("shall keep", "shall not keep"), as_of: "2026-09-01" });
    expect(neg.status).toBe("mismatch_hard_token");
    expect(neg.hard_token_mismatches).toEqual([{ in_quote: "not", in_corpus: "" }]);
    const num = run({ quote: TEXT_A.replace("ten years", "ten 5 years"), as_of: "2026-09-01" });
    expect(num.hard_token_mismatches).toEqual([{ in_quote: "5", in_corpus: "" }]);
  });
  it("one soft difference at >= 20 tokens is fuzzy (similarity 0.95 or more) and listed", () => {
    const quote = TEXT_A.replace("technical", "technicl");
    const r = run({ quote, as_of: "2026-09-01" });
    expect(r.status).toBe("fuzzy");
    expect(r.match?.similarity).toBeGreaterThanOrEqual(0.95);
    expect(r.soft_token_diffs).toEqual([{ in_quote: "technicl", in_corpus: "technical" }]);
  });
  it("two soft differences at the same length are not found", () => {
    expect(run({ quote: TEXT_A.replace("technical", "technicl").replace("authorities", "authorites"), as_of: "2026-09-01" }).status).toBe("not_found");
  });
  it("a short quote (6-19 tokens) must match without any difference", () => {
    const short = "shall keep the technical documentation at the disposal";
    expect(run({ quote: short, as_of: "2026-09-01" }).status).toBe("exact");
    expect(run({ quote: short.replace("technical", "technicl"), as_of: "2026-09-01" }).status).toBe("not_found");
  });
  it("fewer than 6 tokens -> too_short, validity unknown", () => {
    const r = run({ quote: "shall keep the logs", as_of: "2026-09-01" });
    expect(r.status).toBe("too_short");
    expect(r.validity.state).toBe("unknown");
  });
  it("a changed capital or punctuation is not exact, but not a miss", () => {
    const r = run({ quote: TEXT_A.replace("The provider", "the provider") + ".", as_of: "2026-09-01" });
    expect(r.status).toBe("fuzzy");
    expect(r.match?.similarity).toBe(1);
    expect(r.warnings).toContain("differs_in_case_or_punctuation");
  });
  it("an unparsable claimed ref warns and still searches; a missing claimed ref gives no claimed fields", () => {
    const r = run({ quote: TEXT_A, claimed_ref: "Section 7 of the thing", as_of: "2026-09-01" });
    expect(r.claimed_ref_id).toBeNull();
    expect(r.warnings).toContain("unparsed_ref");
    expect(r.status).toBe("exact");
    expect(Object.keys(run({ quote: TEXT_A, as_of: "2026-09-01" }))).not.toContain("claimed_ref_id");
  });
  it("requires as_of (no default in the library)", () => {
    expect(() => verifyCitation({ quote: TEXT_A } as unknown as Parameters<typeof verifyCitation>[0], mini)).toThrow(/as_of is required/);
  });
  it("rejects a malformed as_of", () => {
    expect(() => run({ quote: TEXT_A, as_of: "01.09.2026" })).toThrow(/as_of/);
  });
});

describe("verifyCitation: quotes across nodes and with omissions", () => {
  const CROSS = "starts in one node and continues in the next node with a short end of the sentence";
  it("a quote across two consecutive nodes is multi_node with a part per node", () => {
    const r = run({ quote: CROSS, as_of: "2026-09-01" });
    expect(r.status).toBe("multi_node");
    expect(r.candidates?.map((c) => c.provision_id)).toEqual(["art_4", "art_4.sub_2"]);
    expect(r.provision_id).toBe("art_4");
  });
  it("omissions: segments in order within one node are a single-node hit", () => {
    const r = run({ quote: "The provider shall keep the technical [...] after the system has been placed on the market", claimed_ref: "art_1.par_1", as_of: "2026-09-01" });
    expect(r.status).toBe("exact");
    expect(r.match?.matched_text).toContain(" [...] ");
  });
  it("omissions: segments in the wrong order are not found", () => {
    expect(run({ quote: "after the system has been placed on the market [...] The provider shall keep the technical", as_of: "2026-09-01" }).status).toBe("not_found");
  });
  it("omissions across two nodes of one article are multi_node", () => {
    const r = run({ quote: "The first half of a sentence that starts [...] in the next node with a short end", as_of: "2026-09-01" });
    expect(r.status).toBe("multi_node");
  });
  it("multi_node on the real corpus: tail of Art. 50(1) plus head of Art. 50(2)", () => {
    const c = loadCorpus(V2026, "en");
    const a = (c.byId.get("art_50.par_1") as ProvisionNode).text.split(" ");
    const b = (c.byId.get("art_50.par_2") as ProvisionNode).text.split(" ");
    const r = verifyCitation({ quote: `${a.slice(-12).join(" ")} ${b.slice(0, 12).join(" ")}`, as_of: "2026-09-01", lang: "en" }, loadCorpus);
    expect(r.status).toBe("multi_node");
    expect(r.candidates?.map((x) => x.provision_id)).toEqual(["art_50.par_1", "art_50.par_2"]);
  });
});

describe("verifyCitation: determinism and output", () => {
  it("same input, same output; no timestamps; support_checked is false", () => {
    const a = run({ quote: TEXT_A, claimed_ref: "art_1.par_1", as_of: "2026-09-01" });
    const b = run({ quote: TEXT_A, claimed_ref: "art_1.par_1", as_of: "2026-09-01" });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toMatch(/created_at|timestamp|checked_at/);
    expect(a.support_checked).toBe(false);
  });
  it("the notice names the version actually checked", () => {
    expect(run({ quote: TEXT_A, as_of: "2026-09-01" }).notice.en).toContain(V2026);
    const old = run({ quote: TEXT_A, as_of: "2026-06-01" });
    expect(old.notice.en).toContain(V2024);
    expect(old.notice.de).toMatch(/EUR-Lex/);
  });
});

describe("verifyCitation: recitals", () => {
  const rec = (loadCorpus(V2024, "en").byId.get("rec_12") as ProvisionNode).text;
  const NOTE = "recital: no application date; the preamble is not part of the consolidated text";
  for (const asOf of ["2026-09-01", "2025-01-01"]) {
    it(`rec_12 with as_of ${asOf}: checked against the Official Journal version, V1 unknown, no superseded_by`, () => {
      const r = verifyCitation({ quote: rec, claimed_ref: "Recital 12", as_of: asOf, lang: "en" });
      expect(r.status).toBe("exact");
      expect(r.version_checked).toBe(V2024);
      expect(r.match).toMatchObject({ provision_id: "rec_12", version_id: V2024 });
      expect(r.found_in_version).toBeUndefined();
      expect(r.warnings).toContain("recital_not_in_consolidated_version");
      expect(r.validity).toEqual({ state: "unknown", note: NOTE });
    });
  }
  it("a recital quote without claimed ref after the Omnibus gets the same treatment", () => {
    const r = verifyCitation({ quote: rec, as_of: "2026-09-01", lang: "en" });
    expect(r.status).not.toBe("found_other_version");
    expect(r.match?.version_id).toBe(V2024);
    expect(r.validity.state).toBe("unknown");
    expect(r.warnings).toContain("recital_not_in_consolidated_version");
  });
  it("a recital with a changed number is a hard-token mismatch, not found_other_version", () => {
    const r = verifyCitation({ quote: rec.replace(/\d+/, "99"), claimed_ref: "rec_12", as_of: "2026-09-01", lang: "en" });
    if (/\d/.test(rec)) expect(r.status).toBe("mismatch_hard_token");
    expect(r.validity.state).toBe("unknown");
  });
  it("an operative quote is unaffected", () => {
    const art = (loadCorpus(V2026, "en").byId.get("art_5.par_1.a") as ProvisionNode).text;
    const r = verifyCitation({ quote: art, as_of: "2026-09-01", lang: "en" });
    expect(r.warnings).toBeUndefined();
    expect(r.version_checked).toBe(V2026);
  });
});

describe("verify: token prefilter (inverted index)", () => {
  const sets = (idx: CorpusIndex) => idx.nodes.filter((n) => n.text !== "").map((n) => new Set(tokenize(n.text).map((t) => t.norm)));
  const quotes = [
    "A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems.",
    "Providers shall always keep entirely unrelated imaginary wording about bananas",
    "the the the the the the the the the the",
    "Fines of up to 7 500 000 EUR or 1 % of the total worldwide annual turnover for the supply of incorrect information",
    "shall be [...] pursuant to Article 9 and the national competent authorities shall cooperate",
    "Betreiber von Hochrisiko-KI-Systemen treffen geeignete technische und organisatorische Maßnahmen",
  ];
  for (const [version, lang] of [[V2026, "en"], [V2024, "en"], [V2026, "de"]] as Array<[Version, Lang]>) {
    it(`finds every set that overlaps the quote enough, as testing all sets does (${version}.${lang})`, () => {
      const all = sets(loadCorpus(version, lang));
      const postings = new Postings(all);
      for (const q of quotes) {
        const pq = prepareQuote(q);
        const brute = all.map((set, i) => (overlaps(pq, set) ? i : -1)).filter((i) => i >= 0);
        const cands = postings.candidates(pq);
        expect(cands).toEqual([...cands].sort((a, b) => a - b));
        expect(cands.filter((i) => overlaps(pq, all[i] as Set<string>))).toEqual(brute);
      }
    });
  }
});
