import { describe, expect, it } from "vitest";
import { parseXhtmlToNodes } from "../../src/parser/parse.js";
import { nodeHash, sha256Hex } from "../../src/parser/normalize.js";

const byId = (xhtml: string) => new Map(parseXhtmlToNodes(xhtml).nodes.map((n) => [n.id, n]));
const wrap = (inner: string) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>${inner}</body></html>`;

const listRow = (label: string, text: string) =>
  `<table><col/><col/><tbody><tr><td><p class="oj-normal">${label}</p></td><td><p class="oj-normal">${text}</p></td></tr></tbody></table>`;

/** Official Journal style fixture (EN labels). */
const OJ = wrap(`
  <div class="eli-subdivision" id="rct_12"><table><tbody><tr><td><p class="oj-normal">(12)</p></td><td><p class="oj-normal">The notion of ‘AI system’ should be clear.</p></td></tr></tbody></table></div>
  <div id="cpt_II"><p class="oj-ti-section-1">CHAPTER II</p>
    <div class="eli-title" id="cpt_II.tit_1"><p class="oj-ti-section-2">PROHIBITED AI PRACTICES</p></div>
    <div class="eli-subdivision" id="art_5">
      <p class="oj-ti-art">Article 5</p>
      <div class="eli-title" id="art_5.tit_1"><p class="oj-sti-art">Prohibited AI practices</p></div>
      <div id="005.001"><p class="oj-normal">1.   The following AI practices shall be prohibited:</p>
        ${listRow("(a)", "the placing on the market of an AI system that deploys subliminal techniques;")}
        ${listRow("(b)", "the use of an AI system that exploits vulnerabilities:")}
      </div>
      <div id="005.002"><p class="oj-normal">2.   Member States may <a href="#ntr1"><span class="oj-super oj-note-tag">(1)</span></a>apply stricter rules.</p></div>
    </div>
    <div class="eli-subdivision" id="art_4a">
      <p class="oj-ti-art">Article 4a</p>
      <div class="eli-title" id="art_4a.tit_1"><p class="oj-sti-art">Special categories</p></div>
      <p class="oj-normal">A single unnumbered paragraph.</p>
    </div>
  </div>
  <div class="eli-container" id="anx_III"><p class="oj-doc-ti">ANNEX III</p><p class="oj-doc-ti">High-risk AI systems</p>
    <p class="oj-normal">Introductory text.</p>
    ${listRow("1.", "Biometrics")}
  </div>
`);

/** Consolidated style fixture: paragraph continuation as siblings, footnote with parentheses outside the link. */
const CONS = wrap(`
  <div id="cpt_II"><p class="title-division-1">CHAPTER II</p><p class="title-division-2">PROHIBITED AI PRACTICES</p>
    <div class="eli-subdivision" id="art_5">
      <p class="title-article-norm">Article 5</p>
      <div class="eli-title" id="art_5.tit_1"><p class="stitle-article-norm">Prohibited AI practices</p></div>
      <div class="norm"><span class="no-parag">1.  </span><div class="norm inline-element">The following AI practices shall be prohibited:</div></div>
      <p class="modref"><a href="x">▼M1</a></p>
      <div class="grid-container grid-list"><div class="list grid-list-column-1"><span>(a) </span></div><div class="grid-list-column-2"><p class="norm">first point;</p></div></div>
      <div class="norm"><span class="no-parag">2.  </span><div class="norm inline-element">Regulation (EU) No 1025/2012 (<a href="#E0001" id="src.E0001"><span class="superscript">1</span></a>) and more.</div></div>
    </div>
  </div>
`);

describe("parser, Official Journal rendition", () => {
  const nodes = byId(OJ);

  it("builds logical ids and node types", () => {
    expect(nodes.get("rec_12")?.type).toBe("recital");
    expect(nodes.get("cpt_2")?.type).toBe("chapter");
    expect(nodes.get("art_5")?.type).toBe("article");
    expect(nodes.get("art_5.par_1")?.type).toBe("paragraph");
    expect(nodes.get("art_5.par_1.a")?.type).toBe("point");
    expect(nodes.get("art_5.par_1.b")?.parent).toBe("art_5.par_1");
    expect(nodes.get("anx_3")?.type).toBe("annex");
    expect(nodes.get("anx_3.pt_1")?.type).toBe("annex_point");
  });

  it("keeps art_4a as its own article", () => {
    const a = nodes.get("art_4a");
    expect(a?.type).toBe("article");
    expect(a?.text).toBe("A single unnumbered paragraph.");
    expect(nodes.has("art_4")).toBe(false);
  });

  it("extracts headings, strips labels and normalizes text", () => {
    expect(nodes.get("art_5")?.heading).toBe("Prohibited AI practices");
    expect(nodes.get("cpt_2")?.heading).toBe("PROHIBITED AI PRACTICES");
    expect(nodes.get("anx_3")?.heading).toBe("High-risk AI systems");
    expect(nodes.get("art_5.par_1")?.text).toBe("The following AI practices shall be prohibited:");
    expect(nodes.get("rec_12")?.text).toBe("The notion of 'AI system' should be clear.");
  });

  it("removes footnote references without leaving parentheses", () => {
    expect(nodes.get("art_5.par_2")?.text).toBe("Member States may apply stricter rules.");
  });

  it("hashes the text (hash) and heading plus text (node_hash), and records order and anchor", () => {
    const n = nodes.get("art_5.par_1");
    expect(n?.hash).toBe(sha256Hex("The following AI practices shall be prohibited:"));
    expect(n?.node_hash).toBe(nodeHash("", "The following AI practices shall be prohibited:"));
    const art = nodes.get("art_5");
    expect(art?.hash).toBe(sha256Hex(art?.text ?? ""));
    expect(art?.node_hash).toBe(sha256Hex(`Prohibited AI practices\n${art?.text ?? ""}`));
    expect(art?.node_hash).not.toBe(art?.hash);
    expect(Object.keys(n ?? {})).toEqual(["id", "type", "parent", "heading", "text", "hash", "node_hash", "order", "source_anchor"]);
    const all = parseXhtmlToNodes(OJ).nodes;
    expect(all.map((x) => x.order)).toEqual(all.map((_, i) => i));
    expect(nodes.get("art_5.par_1")?.source_anchor).toBe("005.001");
  });

  it("is deterministic", () => {
    expect(JSON.stringify(parseXhtmlToNodes(OJ).nodes)).toBe(JSON.stringify(parseXhtmlToNodes(OJ).nodes));
  });
});

describe("parser, consolidated rendition", () => {
  const nodes = byId(CONS);

  it("builds the same id scheme from the other markup", () => {
    expect(nodes.get("art_5.par_1")?.type).toBe("paragraph");
    expect(nodes.get("art_5.par_1.a")?.type).toBe("point");
    expect(nodes.get("art_5.par_2")?.type).toBe("paragraph");
    expect(nodes.get("art_5")?.heading).toBe("Prohibited AI practices");
  });

  it("attaches list items that follow a numbered paragraph to that paragraph", () => {
    expect(nodes.get("art_5.par_1.a")?.parent).toBe("art_5.par_1");
    expect(nodes.has("art_5.a")).toBe(false);
  });

  it("ignores amendment markers and removes footnote references with their parentheses", () => {
    expect(nodes.get("art_5.par_2")?.text).toBe("Regulation (EU) No 1025/2012 and more.");
    expect([...nodes.values()].some((n) => n.text.includes("▼"))).toBe(false);
  });
});

const art = (inner: string) => wrap(`<div class="eli-subdivision" id="art_9"><p class="oj-ti-art">Article 9</p><div class="eli-title"><p class="oj-sti-art">T</p></div>${inner}</div>`);
const idsOf = (xhtml: string) => parseXhtmlToNodes(xhtml).nodes.map((n) => n.id);

describe("parser, subparagraphs (ID scheme v1)", () => {
  it("turns a second list into sub_2.a instead of a ~N suffix", () => {
    const xhtml = art(`<p class="oj-normal">First list:</p>${listRow("(a)", "x;")}<p class="oj-normal">Second list:</p>${listRow("(a)", "y;")}`);
    const { nodes, warnings } = parseXhtmlToNodes(xhtml);
    const ids = nodes.map((n) => n.id);
    expect(ids).toEqual(["art_9", "art_9.a", "art_9.sub_2", "art_9.sub_2.a"]);
    expect(nodes[2]?.type).toBe("subparagraph");
    expect(nodes[2]?.text).toBe("Second list:");
    expect(warnings).toEqual([]);
  });

  it("puts a closing sentence after a list into a sub_N node that comes after the list points in order", () => {
    const xhtml = art(`<div id="009.002"><p class="oj-normal">2.   Intro:</p>${listRow("(a)", "one;")}${listRow("(b)", "two.")}<p class="oj-normal">Closing sentence.</p></div>`);
    const nodes = parseXhtmlToNodes(xhtml).nodes;
    expect(nodes.map((n) => n.id)).toEqual(["art_9", "art_9.par_2", "art_9.par_2.a", "art_9.par_2.b", "art_9.par_2.sub_2"]);
    const sub = nodes.find((n) => n.id === "art_9.par_2.sub_2");
    expect(sub?.text).toBe("Closing sentence.");
    expect(sub?.parent).toBe("art_9.par_2");
    expect(sub?.order).toBeGreaterThan(nodes.find((n) => n.id === "art_9.par_2.b")?.order ?? 99);
  });

  it("numbers further text blocks of an unnumbered article sub_2, sub_3", () => {
    expect(idsOf(art(`<p class="oj-normal">A.</p><p class="oj-normal">B.</p><p class="oj-normal">C.</p>`))).toEqual(["art_9", "art_9.sub_2", "art_9.sub_3"]);
  });

  it("throws on a duplicate id instead of inventing a suffix", () => {
    const dup = wrap(`<div class="eli-subdivision" id="art_9"><p class="oj-ti-art">Article 9</p></div><div class="eli-subdivision" id="art_9"><p class="oj-ti-art">Article 9</p></div>`);
    expect(() => parseXhtmlToNodes(dup)).toThrow(/duplicate node id art_9/);
  });
});

describe("parser, annex structure (ID scheme v1)", () => {
  const annex = (inner: string) => wrap(`<div class="eli-container" id="anx_I"><p class="oj-doc-ti">ANNEX I</p><p class="oj-doc-ti">Title</p>${inner}</div>`);
  const head = (t: string) => `<p class="oj-ti-grseq-1">${t}</p>`;
  const nodes = (xhtml: string) => new Map(parseXhtmlToNodes(xhtml).nodes.map((n) => [n.id, n]));

  it("builds annex_section nodes and never lets a section heading land in the previous point", () => {
    const m = nodes(annex(`${head("Section A. First list")}${listRow("1.", "alpha;")}${head("Section B. Second list")}${listRow("1.", "beta;")}`));
    expect(m.get("anx_1.sec_a")?.type).toBe("annex_section");
    expect(m.get("anx_1.sec_b")?.heading).toBe("Section B. Second list");
    expect(m.get("anx_1.sec_a.pt_1")?.text).toBe("alpha;");
    expect(m.get("anx_1.sec_b.pt_1")?.parent).toBe("anx_1.sec_b");
    expect([...m.values()].some((n) => n.id.startsWith("anx_1.sec_a") && n.text.includes("Section B"))).toBe(false);
  });

  it("merges a bare 'Section 1' line with the title line that follows", () => {
    const m = nodes(annex(`${head("Section 1")}${head("Information for all")}<p class="oj-normal">Intro text.</p>${listRow("(a)", "x;")}`));
    expect(m.get("anx_1.sec_1")?.heading).toBe("Section 1 Information for all");
    expect(m.get("anx_1.sec_1")?.text).toBe("Intro text.");
    expect(m.get("anx_1.sec_1.a")?.type).toBe("annex_point");
  });

  it("turns numbered group headings into points with a heading, lists below them, and nested numbers into nested points", () => {
    const m = nodes(annex(`${head("1. Schengen System")}${listRow("(a)", "act one;")}${head("3. Quality system")}${listRow("3.1.", "first rule")}${listRow("3.2.", "second rule")}${head("4. Control")}${listRow("4.1.", "other rule")}`));
    expect(m.get("anx_1.pt_1")?.heading).toBe("Schengen System");
    expect(m.get("anx_1.pt_1.a")?.parent).toBe("anx_1.pt_1");
    expect(m.get("anx_1.pt_3.pt_1")?.text).toBe("first rule");
    expect(m.get("anx_1.pt_3.pt_2")?.text).toBe("second rule");
    expect(m.get("anx_1.pt_4.pt_1")?.text).toBe("other rule");
    expect([...m.keys()].some((id) => id.includes("-") || id.includes("~"))).toBe(false);
    expect(m.get("anx_1.pt_3.pt_2")?.text).not.toContain("Control");
  });

  it("rejects an annex heading it cannot classify", () => {
    expect(() => parseXhtmlToNodes(annex(head("Some unlabelled heading")))).toThrow(/unrecognised annex heading/);
  });

  it("reads consolidated markup the same way (title-gr-seq headings, continuation after a numbered item)", () => {
    const cons = wrap(`<div class="eli-container" id="anx_VII"><p class="title-annex-1">ANNEX VII</p><p class="title-annex-2">T</p>
      <p class="title-gr-seq-level-1">3. Quality</p>
      <div style="text-indent: -10pt"><p class="norm">3.2. The system shall be assessed.</p></div>
      <p class="list">The decision shall be notified.</p>
      <p class="title-gr-seq-level-1">4. Control.</p>
      <div style="text-indent: -10pt"><p class="norm">4.1. Application.</p></div></div>`);
    const m = nodes(cons);
    expect(m.get("anx_7.pt_3")?.heading).toBe("Quality");
    expect(m.get("anx_7.pt_3.pt_2")?.text).toBe("The system shall be assessed.");
    expect(m.get("anx_7.pt_3.pt_2.sub_2")?.text).toBe("The decision shall be notified.");
    expect(m.get("anx_7.pt_4")?.heading).toBe("Control.");
    expect(m.get("anx_7.pt_4.pt_1")?.text).toBe("Application.");
  });
});
