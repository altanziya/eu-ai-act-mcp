/**
 * Deterministic provision-tree parser for the CELLAR XHTML renditions of Regulation (EU) 2024/1689.
 *
 * Two markup families are handled by one structural reader:
 *  - Official Journal rendition (CONVEX, class prefix "oj-"): list items are two-cell tables,
 *    paragraphs are <div id="NNN.NNN"> whose first <p> starts with "1.   ".
 *  - Consolidated rendition (class "norm"): list items are div.grid-container, paragraphs are
 *    div.norm with a span.no-parag label.
 * No LLM, no network, no clock: the same input always yields the same nodes.
 */
import { annexId, articleId, articleSuffix, chapterId, childSegment, joinId, labelCore, recitalId, romanToInt, sectionId } from "./ids.js";
import { nodeHash, normalizeText } from "./normalize.js";
import type { DomNode } from "./dom.js";
import { attr, classMatches, findAll, hasClass, idOf, isTag, isText, kids, parseXhtml, rawText, tagChildren } from "./dom.js";
import type { NodeType, ProvisionNode } from "./types.js";

// ---------------------------------------------------------------------------------------------
// Structural reader: DOM -> Body { text parts, labelled items }
// ---------------------------------------------------------------------------------------------

interface Item {
  rawLabel: string;
  core: string;
  /** "par" = numbered paragraph ("1."), "item" = list entry ("(a)", "(1)", "1.", "—"). */
  kind: "par" | "item";
  body: Body;
  anchor: string;
}

interface Body {
  text: string[];
  items: Item[];
}

const INLINE_TAGS = new Set(["span", "a", "i", "b", "em", "strong", "sup", "sub", "u", "br", "small", "abbr", "q", "font"]);
/** Elements that are never legal text: article heading lines, amendment markers, footnote bodies, notices. */
const SKIP_CLASS = /^(oj-ti-art|oj-sti-art|title-article-norm|stitle-article-norm|modref|oj-note|footnote|arrow|disclaimer)$/;
const LIST_LABEL = /^(\(?[0-9A-Za-z]{1,6}[.)]|\d+(\.\d+)+\.|[—–‒\-•·])$/;
/** Paragraph label at the start of a paragraph block: "1." (EN rendition, consolidated) or "(1)" (DE Official Journal). */
const PAR_LABEL = /^(?:\((\d+[a-z]{0,2})\)|(\d+(?:\.\d+)*[a-z]{0,2})\.)(?:\s+|$)/;
const PAR_DIV_ID = /^\d{3}\.\d{3}$/;

const emptyBody = (): Body => ({ text: [], items: [] });

function isSkipped(n: DomNode): boolean {
  return classMatches(n, SKIP_CLASS) || hasClass(n, "eli-title");
}

/** Footnote reference: a link to "#..." whose content is a superscript note number, e.g. "(1)" or "1". */
function isFootnoteRef(n: DomNode): boolean {
  if (n.name !== "a" || !attr(n, "href").startsWith("#")) return false;
  return findAll(n, (c) => classMatches(c, /(^|\s)(oj-super|oj-note-tag|superscript)(\s|$)/)).length > 0 || /^\(?\*?\d*\)?$/.test(rawText(n).trim());
}

/**
 * Accumulates inline text and removes footnote references: the link itself, the parentheses that
 * surround it in the consolidated rendition, and the spacing around it (no space before
 * punctuation, a single space where two words would otherwise touch).
 */
class InlineBuf {
  private buf = "";
  private skipCloseParen = false;
  private footnotePending = false;

  addText(s: string): void {
    let t = s;
    if (this.skipCloseParen) {
      const stripped = t.replace(/^\s+/, "");
      if (stripped.startsWith(")")) t = stripped.slice(1);
      this.skipCloseParen = false;
    }
    if (this.footnotePending && t.trim() !== "") {
      const rest = t.replace(/^\s+/, "");
      if (/^[,.;:)]/.test(rest)) {
        this.buf = this.buf.replace(/\s+$/, "");
        t = rest;
      } else if (!/\s$/.test(this.buf) && !/^\s/.test(t)) {
        t = ` ${t}`;
      }
      this.footnotePending = false;
    }
    this.buf += t;
  }

  dropFootnote(anchorText: string): void {
    if (!anchorText.trim().startsWith("(") && this.buf.endsWith("(")) {
      // consolidated rendition: the parentheses sit outside the link
      this.buf = this.buf.slice(0, -1);
      this.skipCloseParen = true;
    }
    this.footnotePending = true;
  }

  take(): string {
    const t = this.buf;
    this.buf = "";
    this.skipCloseParen = false;
    this.footnotePending = false;
    return t;
  }
}

function inlineTextOf(nodes: DomNode[]): string {
  const buf = new InlineBuf();
  const visit = (n: DomNode): void => {
    if (isText(n)) return buf.addText(n.data ?? "");
    if (!isTag(n) || isSkipped(n)) return;
    if (isFootnoteRef(n)) return buf.dropFootnote(rawText(n));
    if (n.name === "br") return buf.addText(" ");
    kids(n).forEach(visit);
  };
  nodes.forEach(visit);
  return buf.take();
}

/** Rows of this table only (children of the table or of its tbody/thead/tfoot), not rows of nested tables. */
function directRows(table: DomNode): DomNode[] {
  const rows: DomNode[] = [];
  for (const c of tagChildren(table)) {
    if (c.name === "tr") rows.push(c);
    else if (c.name === "tbody" || c.name === "thead" || c.name === "tfoot") rows.push(...tagChildren(c).filter((r) => r.name === "tr"));
  }
  return rows;
}

interface ListRow {
  label: DomNode;
  content: DomNode;
}

/**
 * List-item rows of a table: [label | content], or [empty | label | content] (annex lists in the Official
 * Journal rendition). Returns null if the table is anything else (a data table).
 */
function listTableRows(table: DomNode): ListRow[] | null {
  const rows = directRows(table);
  if (rows.length === 0) return null;
  const out: ListRow[] = [];
  for (const tr of rows) {
    const cells = tagChildren(tr).filter((c) => c.name === "td" || c.name === "th");
    let label: DomNode | undefined;
    let content: DomNode | undefined;
    if (cells.length === 2) [label, content] = cells;
    else if (cells.length === 3 && normalizeText(rawText(cells[0] as DomNode)) === "") [, label, content] = cells;
    if (!label || !content || !LIST_LABEL.test(normalizeText(rawText(label)))) return null;
    out.push({ label, content });
  }
  return out;
}

function itemOf(rawLabel: string, kind: Item["kind"], content: DomNode[], anchor: string): Item {
  const label = normalizeText(rawLabel);
  return { rawLabel: label, core: labelCore(label), kind, body: readBody(content, anchor), anchor };
}

function readBody(children: DomNode[], anchor: string): Body {
  const body = emptyBody();
  const buf = new InlineBuf();
  /**
   * In the consolidated rendition the continuation of a numbered paragraph (further subparagraphs,
   * lists) follows the paragraph element as siblings. Content after a numbered paragraph therefore
   * belongs to that paragraph until the next numbered paragraph starts.
   */
  let current: Item | null = null;
  const target = (): Body => (current ? current.body : body);
  const pushItem = (it: Item): void => {
    if (it.kind === "par") {
      body.items.push(it);
      current = it;
    } else target().items.push(it);
  };
  const mergeSub = (sub: Body): void => {
    target().text.push(...sub.text);
    sub.items.forEach(pushItem);
  };
  const flush = (): void => {
    const t = buf.take();
    if (t.trim() !== "") target().text.push(t);
  };

  const visit = (n: DomNode, a: string): void => {
    if (isText(n)) return buf.addText(n.data ?? "");
    if (!isTag(n) || isSkipped(n)) return;
    const name = n.name ?? "";
    if (isFootnoteRef(n)) return buf.dropFootnote(rawText(n));
    if (INLINE_TAGS.has(name)) {
      if (name === "br") return buf.addText(" ");
      return kids(n).forEach((c) => visit(c, a));
    }
    const here = idOf(n) || a;
    flush();
    if (name === "p") {
      const t = inlineTextOf(kids(n));
      if (t.trim() !== "") target().text.push(t);
    } else if (name === "table") {
      const rows = listTableRows(n);
      if (rows) {
        for (const row of rows) pushItem(itemOf(rawText(row.label), "item", kids(row.content), here));
      } else {
        for (const tr of directRows(n)) {
          const cells = tagChildren(tr).map((td) => normalizeText(readFlat(kids(td), here))).filter((c) => c !== "");
          if (cells.length > 0) target().text.push(cells.join(" | "));
        }
      }
    } else if (name === "div" && hasClass(n, "grid-container")) {
      const cols = tagChildren(n);
      const c1 = cols.find((c) => hasClass(c, "grid-list-column-1"));
      const c2 = cols.find((c) => hasClass(c, "grid-list-column-2"));
      if (c1 && c2) pushItem(itemOf(rawText(c1), "item", kids(c2), here));
      else mergeSub(readBody(kids(n), here));
    } else if (name === "div" && hasClass(n, "norm") && tagChildren(n).some((c) => hasClass(c, "no-parag"))) {
      const labelEl = tagChildren(n).find((c) => hasClass(c, "no-parag")) as DomNode;
      pushItem(itemOf(rawText(labelEl), "par", kids(n).filter((c) => c !== labelEl), here));
    } else if (name === "div" && (PAR_DIV_ID.test(idOf(n)) || hasClass(n, "oj-enumeration-spacing") || /text-indent/.test(attr(n, "style")))) {
      const sub = readBody(kids(n), here);
      const first = sub.text[0] ?? "";
      const m = PAR_LABEL.exec(normalizeText(first));
      if (m) {
        const rest = normalizeText(first).slice(m[0].length);
        sub.text = rest === "" ? sub.text.slice(1) : [rest, ...sub.text.slice(1)];
        pushItem({ rawLabel: m[0].trim(), core: (m[1] ?? m[2]) as string, kind: "par", body: sub, anchor: here });
      } else {
        mergeSub(sub);
      }
    } else {
      mergeSub(readBody(kids(n), here));
    }
  };

  children.forEach((c) => visit(c, anchor));
  flush();
  return body;
}

/** Flat text of a DOM fragment (used for data-table cells). */
function readFlat(children: DomNode[], anchor: string): string {
  return flattenBody(readBody(children, anchor)).join(" ");
}

function flattenBody(body: Body): string[] {
  const lines = [...body.text];
  for (const it of body.items) {
    const sub = flattenBody(it.body);
    if (sub.length === 0) lines.push(it.rawLabel);
    else lines.push(`${it.rawLabel} ${sub[0] as string}`, ...sub.slice(1));
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------
// Node builder
// ---------------------------------------------------------------------------------------------

class Builder {
  readonly nodes: ProvisionNode[] = [];
  readonly warnings: string[] = [];
  private readonly seen = new Set<string>();

  add(id: string, type: NodeType, parent: string | null, heading: string, lines: string[], anchor: string): string {
    let finalId = id;
    for (let n = 2; this.seen.has(finalId); n++) {
      finalId = `${id}~${n}`;
      this.warnings.push(`duplicate id ${id} -> ${finalId}`);
    }
    this.seen.add(finalId);
    const text = normalizeText(lines.join("\n"));
    const head = normalizeText(heading);
    this.nodes.push({ id: finalId, type, parent, heading: head, text, hash: nodeHash(head, text), order: this.nodes.length, source_anchor: anchor });
    return finalId;
  }

  /** Emit nodes for the labelled items below `parentId`; recurses depth-first in document order. */
  items(items: Item[], parentId: string, parentType: NodeType, inAnnex: boolean): void {
    let bullets = 0;
    for (const it of items) {
      if (it.core === "") bullets++;
      const isPar = it.kind === "par" && parentType === "article";
      const type: NodeType = inAnnex ? "annex_point" : isPar ? "paragraph" : "point";
      const id = this.add(joinId(parentId, childSegment(it.core, isPar, bullets)), type, parentId, "", it.body.text, it.anchor);
      this.items(it.body.items, id, type, inAnnex);
    }
  }
}

const headingText = (n: DomNode | undefined): string => (n ? normalizeText(rawText(n)) : "");

function parseArticle(el: DomNode, parent: string | null, b: Builder): void {
  const suffix = articleSuffix(idOf(el)) as string;
  const title = tagChildren(el).find((c) => hasClass(c, "eli-title"));
  const body = readBody(kids(el), idOf(el));
  const id = b.add(articleId(suffix), "article", parent, headingText(title), body.text, idOf(el));
  b.items(body.items, id, "article", false);
}

function parseRecital(el: DomNode, b: Builder): void {
  const n = idOf(el).slice("rct_".length);
  const lines = flattenBody(readBody(kids(el), idOf(el)));
  if (lines.length > 0) lines[0] = (lines[0] as string).replace(/^\s*\(\d+\)\s*/, "");
  b.add(recitalId(n), "recital", null, "", lines, idOf(el));
}

function parseAnnex(el: DomNode, b: Builder): void {
  const n = romanToInt(idOf(el).slice("anx_".length));
  const ps = tagChildren(el).filter((c) => c.name === "p" && classMatches(c, /(oj-doc-ti|title-annex-1|title-annex-2)/));
  const labelP = ps[0];
  const titleP = ps[1];
  const rest = kids(el).filter((c) => c !== labelP && c !== titleP);
  const body = readBody(rest, idOf(el));
  const id = b.add(annexId(n), "annex", null, headingText(titleP) || headingText(labelP), body.text, idOf(el));
  b.items(body.items, id, "annex", true);
}

/** Heading of a chapter or section: the second header line (first is "CHAPTER III" / "SECTION 1"). */
function divisionHeading(el: DomNode): string {
  const header: DomNode[] = [];
  for (const c of tagChildren(el)) {
    if (c.name === "p" && !classMatches(c, SKIP_CLASS)) header.push(c);
    else if (c.name === "div" && hasClass(c, "eli-title")) header.push(...findAll(c, (x) => x.name === "p"));
    else if (c.name === "div") break;
  }
  return headingText(header[1] ?? header[0]);
}

function walk(el: DomNode, parent: string | null, b: Builder): void {
  for (const c of tagChildren(el)) {
    const id = idOf(c);
    let m: RegExpExecArray | null;
    if (/^rct_\d+$/.test(id)) parseRecital(c, b);
    else if (articleSuffix(id) !== null) parseArticle(c, parent, b);
    else if (/^anx_[IVXLC]+$/.test(id)) parseAnnex(c, b);
    else if ((m = /^cpt_([IVXLC]+)$/.exec(id))) {
      const cid = b.add(chapterId(romanToInt(m[1] as string)), "chapter", null, divisionHeading(c), [], id);
      walk(c, cid, b);
    } else if ((m = /^cpt_([IVXLC]+)\.sct_(\d+)$/.exec(id))) {
      const cpt = chapterId(romanToInt(m[1] as string));
      const sid = b.add(sectionId(cpt, m[2] as string), "section", parent, divisionHeading(c), [], id);
      walk(c, sid, b);
    } else walk(c, parent, b);
  }
}

export interface ParseResult {
  nodes: ProvisionNode[];
  warnings: string[];
}

export function parseXhtmlToNodes(xhtml: string): ParseResult {
  const root = parseXhtml(xhtml);
  const b = new Builder();
  walk(root, null, b);
  return { nodes: b.nodes, warnings: b.warnings };
}
