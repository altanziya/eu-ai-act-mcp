import { describe, expect, it } from "vitest";
import { parseXhtmlToNodes } from "../../src/parser/parse.js";
import { nodeHash } from "../../src/parser/normalize.js";

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

  it("hashes heading and text, and records order and anchor", () => {
    const n = nodes.get("art_5.par_1");
    expect(n?.hash).toBe(nodeHash("", "The following AI practices shall be prohibited:"));
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

describe("parser, uniqueness", () => {
  it("never emits duplicate ids (a second list under the same parent gets a ~N suffix)", () => {
    const twoLists = wrap(`
      <div class="eli-subdivision" id="art_9">
        <p class="oj-ti-art">Article 9</p>
        <div class="eli-title"><p class="oj-sti-art">T</p></div>
        <p class="oj-normal">First list:</p>${listRow("(a)", "x;")}
        <p class="oj-normal">Second list:</p>${listRow("(a)", "y;")}
      </div>`);
    const { nodes, warnings } = parseXhtmlToNodes(twoLists);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("art_9.a");
    expect(ids).toContain("art_9.a~2");
    expect(warnings.length).toBe(1);
  });
});
