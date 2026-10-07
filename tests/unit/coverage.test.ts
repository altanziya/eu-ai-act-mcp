/**
 * Coverage and order: for every article, annex and recital of all four
 * raw files, the word sequence of the raw source text equals the word sequence of heading + text of all
 * nodes of that provision, in `order`.
 *
 * Raw side (independent of the parser's block logic, only the DOM helpers are shared):
 *  - whole subtree text of the element, blocks separated by a space;
 *  - dropped: the "Article N" / "ANNEX N" label line, amendment markers ("modref"), footnote bodies and notices,
 *    footnote references (a link to "#..." whose content is a note number), replaced by a space.
 * Both sides, same rule (`words`): NFC/whitespace/quote normalisation (normalizeText), empty "( )" pairs and spaces before , . ; :
 * removed (a removed footnote reference must not leave "Council ," behind), split on whitespace,
 * then drop label tokens ("(a)", "a)", "1.", "3.1.", "(12)", "—"), bare parenthesis tokens (what is left of
 * a removed footnote "(1)") and the table cell separator "|". Dropping these on both sides means a missing label never counts as a gap.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomNode } from "../../src/parser/dom.js";
import { attr, classMatches, findAll, idOf, isTag, isText, kids, parseXhtml, rawText } from "../../src/parser/dom.js";
import { normalizeText } from "../../src/parser/normalize.js";
import type { ProvisionNode } from "../../src/parser/types.js";
import { ALL_CASES, parsed } from "./helpers/corpora.js";

const DROP_CLASS = /(^|\s)(oj-ti-art|title-article-norm|modref|oj-note|footnote|arrow|disclaimer)(\s|$)/;
const LABEL_TOKEN = /^['"]?(?:\((?:\d{1,3}[a-z]{0,2}|[a-z]{1,3})\)|(?:\d{1,3}[a-z]{0,2}|[a-z]{1,3})\)|\d{1,3}[a-z]{0,2}\.|\d+(?:\.\d+)+\.?|[a-z]\.|[—–-])$/;
const PAREN_TOKEN = /^[()]+$/;
/** Cell separator the parser writes between the cells of a data-table row. */
const CELL_SEPARATOR = "|";

export function words(text: string): string[] {
  return normalizeText(text)
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .split(/\s+/)
    .filter((w) => w !== "" && w !== CELL_SEPARATOR && !LABEL_TOKEN.test(w) && !PAREN_TOKEN.test(w));
}

const BLOCKS = new Set(["p", "div", "table", "tr", "td", "th", "tbody", "li", "ul", "ol", "hr", "br"]);

function isFootnoteLink(n: DomNode): boolean {
  return n.name === "a" && attr(n, "href").startsWith("#") && /^\(?\*?\d*\)?$/.test(rawText(n).trim());
}

function sourceText(el: DomNode, labelLine: DomNode | undefined): string {
  const out: string[] = [];
  const visit = (n: DomNode): void => {
    if (isText(n)) return void out.push(n.data ?? "");
    if (!isTag(n) || n === labelLine || classMatches(n, DROP_CLASS)) return;
    if (isFootnoteLink(n)) return void out.push(" ");
    const block = BLOCKS.has(n.name ?? "");
    if (block) out.push(" ");
    kids(n).forEach(visit);
    if (block) out.push(" ");
  };
  visit(el);
  return out.join("");
}

/** First deviation between the raw source of one provision and its nodes (in the given order); null if equal. */
function firstDeviation(rootNode: ProvisionNode, own: ProvisionNode[], el: DomNode): string | null {
  // the annex label line ("ANNEX VII") is dropped, except for an annex without a title line (Annex XIV, 2026):
  // there the parser uses the label as heading, so it stays on the raw side too
  const labelP = rootNode.type === "annex" ? findAll(el, (x) => x.name === "p" && classMatches(x, /(oj-doc-ti|title-annex-1)/))[0] : undefined;
  const labelLine = labelP && normalizeText(rawText(labelP)) === rootNode.heading ? undefined : labelP;
  const raw = words(sourceText(el, labelLine));
  // node side: words of all nodes in order; a node that starts with punctuation (";" of art_108) glues to the previous word
  const got: string[] = [];
  const owner: string[] = [];
  for (const n of own) {
    const w = words(`${n.heading} ${n.text}`);
    if (got.length > 0 && w.length > 0 && /^[,.;:]/.test(w[0] as string)) got[got.length - 1] += w.shift() as string;
    got.push(...w);
    owner.push(...w.map(() => n.id));
  }
  const len = Math.max(raw.length, got.length);
  for (let i = 0; i < len; i++) {
    if (raw[i] !== got[i]) {
      const ctx = (a: string[]) => a.slice(Math.max(0, i - 3), i + 4).join(" ");
      return `${rootNode.id}: first deviation at word ${i} in node ${owner[i] ?? owner[owner.length - 1] ?? "(none)"}: raw "${ctx(raw)}" vs nodes "${ctx(got)}"`;
    }
  }
  return null;
}

const isRoot = (n: ProvisionNode): boolean => n.type === "article" || n.type === "annex" || n.type === "recital";
const provisionNodes = (nodes: ProvisionNode[], rootNode: ProvisionNode): ProvisionNode[] =>
  nodes.filter((n) => n.id === rootNode.id || n.id.startsWith(`${rootNode.id}.`)).sort((a, b) => a.order - b.order);

describe.each(ALL_CASES)("coverage and order: $label", (c) => {
  const { nodes } = parsed(c);
  const root = parseXhtml(readFileSync(c.rawFile, "utf8"));
  const elements = new Map<string, DomNode>();
  for (const e of findAll(root, (x) => /^(art_\d+[a-z]*|anx_[IVXLC]+|rct_\d+)$/.test(idOf(x)))) elements.set(idOf(e), e);

  it("has a root node for every article, annex and recital element, and vice versa", () => {
    expect(nodes.filter(isRoot).map((n) => n.source_anchor).sort()).toEqual([...elements.keys()].sort());
  });

  it("raw word sequence equals the word sequence of the provision's nodes in order (0 deviations)", () => {
    const deviations: string[] = [];
    for (const rootNode of nodes.filter(isRoot)) {
      const d = firstDeviation(rootNode, provisionNodes(nodes, rootNode), elements.get(rootNode.source_anchor) as DomNode);
      if (d) deviations.push(d);
    }
    expect(deviations).toEqual([]);
  });
});

describe("coverage check detects defects", () => {
  const c = ALL_CASES[0] as (typeof ALL_CASES)[number];
  const { nodes } = parsed(c);
  const el = findAll(parseXhtml(readFileSync(c.rawFile, "utf8")), (x) => idOf(x) === "art_43")[0] as DomNode;
  const rootNode = nodes.find((n) => n.id === "art_43") as ProvisionNode;
  const own = provisionNodes(nodes, rootNode);

  it("accepts the intact provision", () => expect(firstDeviation(rootNode, own, el)).toBeNull());
  it("reports a dropped node", () => {
    expect(firstDeviation(rootNode, own.filter((n) => n.id !== "art_43.par_1.sub_2.b"), el)).toMatch(/^art_43: first deviation/);
  });
  it("reports nodes in the wrong order", () => {
    const swapped = [...own];
    const i = swapped.findIndex((n) => n.id === "art_43.par_1.sub_2.a");
    [swapped[i], swapped[i + 1]] = [swapped[i + 1] as ProvisionNode, swapped[i] as ProvisionNode];
    expect(firstDeviation(rootNode, swapped, el)).toMatch(/^art_43: first deviation/);
  });
});

describe("coverage helper", () => {
  it("drops labels and bare parentheses but keeps real words", () => {
    expect(words("(a) the name; 1. Second 3.1. Third — x ( ) Article 6(3) (14a) 1a. '5. Council ( );")).toEqual(["the", "name;", "Second", "Third", "x", "Article", "6(3)", "Council;"]);
  });
});
