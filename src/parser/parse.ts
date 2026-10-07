/**
 * Deterministic provision-tree parser for the CELLAR XHTML renditions of Regulation (EU) 2024/1689.
 *
 * Two markup families are handled by one structural reader:
 *  - Official Journal rendition (CONVEX, class prefix "oj-"): list items are two-cell tables,
 *    paragraphs are <div id="NNN.NNN"> whose first <p> starts with "1.   ".
 *  - Consolidated rendition (class "norm"): list items are div.grid-container, paragraphs are
 *    div.norm with a span.no-parag label.
 * Node structure follows ID scheme v1 (README "ID scheme"): subparagraphs, annex sections,
 * nested points, no "~N" suffixes.
 * No LLM, no network, no clock: the same input always yields the same nodes.
 */
import { annexId, annexSectionSegment, articleId, articleSuffix, chapterId, childSegment, joinId, labelCore, recitalId, romanToInt, sectionId, subparagraphSegment } from "./ids.js";
import { nodeHash, normalizeText, sha256Hex } from "./normalize.js";
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
  blocks: Block[];
  anchor: string;
}

/** One block of source content, in document order. */
type Block =
  | { kind: "text"; text: string; anchor: string }
  | { kind: "item"; item: Item }
  | { kind: "heading"; level: 1 | 2; text: string; anchor: string };

const INLINE_TAGS = new Set(["span", "a", "i", "b", "em", "strong", "sup", "sub", "u", "br", "small", "abbr", "q", "font"]);
/** Elements that are never legal text: article heading lines, amendment markers, footnote bodies, notices. */
const SKIP_CLASS = /^(oj-ti-art|oj-sti-art|title-article-norm|stitle-article-norm|modref|oj-note|footnote|arrow|disclaimer)$/;
const LIST_LABEL = /^(\(?[0-9A-Za-z]{1,6}[.)]|\d+(\.\d+)+\.|[—–‒\-•·])$/;
/** Paragraph label at the start of a paragraph block: "1." (EN rendition, consolidated) or "(1)" (DE Official Journal). */
const PAR_LABEL = /^(?:\((\d+[a-z]{0,2})\)|(\d+(?:\.\d+)*[a-z]{0,2})\.)(?:\s+|$)/;
const PAR_DIV_ID = /^\d{3}\.\d{3}$/;

const PUNCTUATION_ONLY = /^[\p{P}\p{S}\s]+$/u;

/** Appends `s` (no separating space) to the last text block, descending into the last item; false if there is none. */
function appendToLastText(blocks: Block[], s: string): boolean {
  const last = blocks[blocks.length - 1];
  if (!last) return false;
  if (last.kind === "text") {
    last.text = `${last.text.replace(/\s+$/, "")}${s}`;
    return true;
  }
  if (last.kind === "item") return appendToLastText(last.item.blocks, s);
  return false;
}

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
  return { rawLabel: label, core: labelCore(label), kind, blocks: readBody(content, anchor), anchor };
}

/**
 * Reads a DOM fragment into an ordered block list (text blocks, labelled items, headings), keeping
 * document order between them.
 */
function readBody(children: DomNode[], anchor: string): Block[] {
  const out: Block[] = [];
  const buf = new InlineBuf();
  /**
   * In the consolidated rendition the continuation of a numbered paragraph (further subparagraphs,
   * lists) follows the paragraph element as siblings. Content after a numbered paragraph therefore
   * belongs to that paragraph until the next numbered paragraph or a heading starts.
   */
  let current: Item | null = null;
  const target = (): Block[] => (current ? current.blocks : out);
  const pushBlock = (b: Block): void => {
    if (b.kind === "heading") {
      out.push(b);
      current = null;
    } else if (b.kind === "item" && b.item.kind === "par") {
      out.push(b);
      current = b.item;
    } else target().push(b);
  };
  const pushText = (text: string, a: string): void => {
    if (text.trim() === "") return;
    // A block of punctuation only (the ";" that closes a quoted amendment) belongs to the preceding text.
    if (PUNCTUATION_ONLY.test(text) && appendToLastText(target(), text.trim())) return;
    pushBlock({ kind: "text", text, anchor: a });
  };
  const flush = (a: string): void => pushText(buf.take(), a);

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
    flush(a);
    if (name === "p") {
      const t = inlineTextOf(kids(n));
      const level = headingLevel(n);
      if (level !== 0) {
        if (t.trim() !== "") pushBlock({ kind: "heading", level, text: t, anchor: here });
      } else pushText(t, here);
    } else if (name === "table") {
      const rows = listTableRows(n);
      if (rows) {
        for (const row of rows) pushBlock({ kind: "item", item: itemOf(rawText(row.label), "item", kids(row.content), here) });
      } else {
        // A data table is one text block, one line per row.
        const lines: string[] = [];
        for (const tr of directRows(n)) {
          const cells = tagChildren(tr).map((td) => normalizeText(readFlat(kids(td), here))).filter((c) => c !== "");
          if (cells.length > 0) lines.push(cells.join(" | "));
        }
        pushText(lines.join("\n"), here);
      }
    } else if (name === "div" && hasClass(n, "grid-container")) {
      const cols = tagChildren(n);
      const c1 = cols.find((c) => hasClass(c, "grid-list-column-1"));
      const c2 = cols.find((c) => hasClass(c, "grid-list-column-2"));
      if (c1 && c2) pushBlock({ kind: "item", item: itemOf(rawText(c1), "item", kids(c2), here) });
      else readBody(kids(n), here).forEach(pushBlock);
    } else if (name === "div" && hasClass(n, "norm") && tagChildren(n).some((c) => hasClass(c, "no-parag"))) {
      const labelEl = tagChildren(n).find((c) => hasClass(c, "no-parag")) as DomNode;
      pushBlock({ kind: "item", item: itemOf(rawText(labelEl), "par", kids(n).filter((c) => c !== labelEl), here) });
    } else if (name === "div" && (PAR_DIV_ID.test(idOf(n)) || hasClass(n, "oj-enumeration-spacing") || /text-indent/.test(attr(n, "style")))) {
      const sub = readBody(kids(n), here);
      const first = sub[0];
      const m = first?.kind === "text" ? PAR_LABEL.exec(normalizeText(first.text)) : null;
      if (first?.kind === "text" && m) {
        const rest = normalizeText(first.text).slice(m[0].length);
        const blocks: Block[] = rest === "" ? sub.slice(1) : [{ kind: "text", text: rest, anchor: first.anchor }, ...sub.slice(1)];
        pushBlock({ kind: "item", item: { rawLabel: m[0].trim(), core: (m[1] ?? m[2]) as string, kind: "par", blocks, anchor: here } });
      } else sub.forEach(pushBlock);
    } else {
      readBody(kids(n), here).forEach(pushBlock);
    }
  };

  children.forEach((c) => visit(c, anchor));
  flush(anchor);
  return out;
}

/** Flat text of a DOM fragment (used for data-table cells). */
function readFlat(children: DomNode[], anchor: string): string {
  return flattenBlocks(readBody(children, anchor)).join(" ");
}

function flattenBlocks(blocks: Block[]): string[] {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === "text" || b.kind === "heading") lines.push(b.text);
    else {
      const sub = flattenBlocks(b.item.blocks);
      if (sub.length === 0) lines.push(b.item.rawLabel);
      else lines.push(`${b.item.rawLabel} ${sub[0] as string}`, ...sub.slice(1));
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------
// Node builder (ID scheme v1, see README "ID scheme")
// ---------------------------------------------------------------------------------------------

interface Draft {
  id: string;
  type: NodeType;
  parent: string | null;
  heading: string;
  text: string;
  source_anchor: string;
}

/**
 * Where the free blocks of one node go. The node's own text is its first text block; every further
 * text block becomes a `subparagraph` node `<id>.sub_<n>` (n counts from 2, the node text is
 * subparagraph 1); lists attach to the node, or to the latest subparagraph once there is one.
 */
class Scope {
  subCount = 1;
  container: { id: string; type: NodeType };
  readonly bullets = new Map<string, number>();
  constructor(readonly draft: Draft, readonly inAnnex: boolean) {
    this.container = { id: draft.id, type: draft.type };
  }
}

/** Heading classes of the sources: OJ "oj-ti-grseq-1", consolidated "title-gr-seq-level-1/2". */
function headingLevel(n: DomNode): 0 | 1 | 2 {
  if (classMatches(n, /(^|\s)(oj-ti-grseq-1|title-gr-seq-level-1)(\s|$)/)) return 1;
  if (classMatches(n, /(^|\s)title-gr-seq-level-2(\s|$)/)) return 2;
  return 0;
}

class Builder {
  readonly drafts: Draft[] = [];
  readonly warnings: string[] = [];
  private readonly seen = new Set<string>();

  /** Registers a node. A duplicate id is a hard error: IDs must be unique and carry no "~N" suffix. */
  add(id: string, type: NodeType, parent: string | null, heading: string, text: string, anchor: string): Draft {
    if (this.seen.has(id)) throw new Error(`duplicate node id ${id}`);
    this.seen.add(id);
    const d: Draft = { id, type, parent, heading: normalizeText(heading), text: normalizeText(text), source_anchor: anchor };
    this.drafts.push(d);
    return d;
  }

  finish(): ProvisionNode[] {
    return this.drafts.map((d, order) => ({
      id: d.id,
      type: d.type,
      parent: d.parent,
      heading: d.heading,
      text: d.text,
      hash: sha256Hex(d.text),
      node_hash: nodeHash(d.heading, d.text),
      order,
      source_anchor: d.source_anchor,
    }));
  }

  /** Adds a node whose own text is the text block at `blocks[at]` (if there is one); returns its scope and the next index. */
  open(id: string, type: NodeType, parent: string | null, heading: string, blocks: Block[], at: number, anchor: string, inAnnex: boolean): { scope: Scope; next: number } {
    const first = blocks[at];
    const own = first?.kind === "text" ? first : undefined;
    const d = this.add(id, type, parent, heading, own?.text ?? "", own?.anchor ?? anchor);
    return { scope: new Scope(d, inAnnex), next: own ? at + 1 : at };
  }

  /** Feeds a text block or an item into a scope. */
  feed(scope: Scope, block: Block): void {
    if (block.kind === "heading") {
      // headings outside annexes carry no structure of their own: keep their words as a subparagraph
      return this.feed(scope, { kind: "text", text: block.text, anchor: block.anchor });
    }
    if (block.kind === "text") {
      scope.subCount++;
      const sub = this.add(joinId(scope.draft.id, subparagraphSegment(scope.subCount)), "subparagraph", scope.draft.id, "", block.text, block.anchor);
      scope.container = { id: sub.id, type: sub.type };
      return;
    }
    const item = block.item;
    const parentId = scope.container.id;
    const isPar = item.kind === "par" && scope.container.type === "article";
    const type: NodeType = scope.inAnnex ? "annex_point" : isPar ? "paragraph" : "point";
    let bullet = 0;
    if (item.core === "") {
      bullet = (scope.bullets.get(parentId) ?? 0) + 1;
      scope.bullets.set(parentId, bullet);
    } else if (item.core.includes(".")) {
      // Nested number such as "3.1." sits under the node of "3": check that, then use the last component.
      const parts = item.core.split(".");
      const prefixLast = parts[parts.length - 2] as string;
      const parentLast = /(?:^|\.)(?:pt|par)_([0-9a-z]+)$/.exec(parentId)?.[1];
      if (parentLast !== prefixLast) this.warnings.push(`nested label ${item.core} under ${parentId}`);
    }
    const id = joinId(parentId, childSegment(item.core, isPar, bullet));
    const { scope: s, next } = this.open(id, type, parentId, "", item.blocks, 0, item.anchor, scope.inAnnex);
    for (const b of item.blocks.slice(next)) this.feed(s, b);
  }
}

const headingText = (n: DomNode | undefined): string => (n ? normalizeText(rawText(n)) : "");

function parseArticle(el: DomNode, parent: string | null, b: Builder): void {
  const suffix = articleSuffix(idOf(el)) as string;
  const title = tagChildren(el).find((c) => hasClass(c, "eli-title"));
  const blocks = readBody(kids(el), idOf(el));
  const { scope, next } = b.open(articleId(suffix), "article", parent, headingText(title), blocks, 0, idOf(el), false);
  for (const blk of blocks.slice(next)) b.feed(scope, blk);
}

function parseRecital(el: DomNode, b: Builder): void {
  const n = idOf(el).slice("rct_".length);
  const lines = flattenBlocks(readBody(kids(el), idOf(el)));
  if (lines.length > 0) lines[0] = (lines[0] as string).replace(/^\s*\(\d+\)\s*/, "");
  b.add(recitalId(n), "recital", null, "", lines.join("\n"), idOf(el));
}

/**
 * Annex headings (blocks of class oj-ti-grseq-1 / title-gr-seq-level-1 / title-gr-seq-level-2).
 * They are never merged into the text of the preceding point. Rules, in this order:
 *  1. "Section A. ..." / "Abschnitt B — ..." / "Section 1": an `annex_section` `sec_<label lower case>`; the heading
 *     keeps the full line including "Section B". Level-1 only.
 *  2. A level-1 line directly after a bare "Section 1" / "Abschnitt 2" line (no title yet) that is itself neither a
 *     section nor a numbered group is the title of that section and is appended to its heading (Annex XI).
 *  3. "1. Schengen ..." (level 1): a numbered group = `annex_point` `pt_1`, the label is stripped from the heading.
 *     It nests under the current section, if any.
 *  4. "a. ..." / "a) ..." (level 2): `annex_point` `a` under the current numbered group (Annex XIV).
 * Anything else is a hard error (nothing is guessed).
 */
const SECTION_HEADING = /^(?:Section|Abschnitt)\s+([A-Za-z]|\d+)(?=[\s.:—–-]|$)/;
const BARE_SECTION_HEADING = /^(?:Section|Abschnitt)\s+(?:[A-Za-z]|\d+)$/;
const GROUP_HEADING = /^(\d+)[.)]\s+(.*)$/;
const LETTER_HEADING = /^([a-z]{1,3})[.)]\s+(.*)$/;

function parseAnnex(el: DomNode, b: Builder): void {
  const n = romanToInt(idOf(el).slice("anx_".length));
  const ps = tagChildren(el).filter((c) => c.name === "p" && classMatches(c, /(oj-doc-ti|title-annex-1|title-annex-2)/));
  const labelP = ps[0];
  // Consolidated Annex XIV carries its title as a plain <p class="norm"> line right after the label line.
  const titleP = ps[1] ?? tagChildren(el).slice(tagChildren(el).indexOf(labelP as DomNode) + 1).find((c) => c.name === "p" && headingText(c) !== "");
  const rest = kids(el).filter((c) => c !== labelP && c !== titleP);
  const blocks = readBody(rest, idOf(el));
  const aid = annexId(n);
  const opened = b.open(aid, "annex", null, headingText(titleP) || headingText(labelP), blocks, 0, idOf(el), true);
  const annexScope = opened.scope;
  let cur = annexScope;
  let section: Scope | null = null;
  let group: Scope | null = null;

  const openHeading = (id: string, type: NodeType, parent: Scope, heading: string, at: number, anchor: string): { scope: Scope; next: number } =>
    b.open(id, type, parent.draft.id, heading, blocks, at, anchor, true);

  for (let i = opened.next; i < blocks.length; i++) {
    const blk = blocks[i] as Block;
    if (blk.kind !== "heading") {
      b.feed(cur, blk);
      continue;
    }
    const text = normalizeText(blk.text);
    let m: RegExpExecArray | null;
    let res: { scope: Scope; next: number };
    if (blk.level === 1 && (m = SECTION_HEADING.exec(text))) {
      let heading = text;
      let at = i + 1;
      const next = blocks[at];
      if (BARE_SECTION_HEADING.test(text) && next?.kind === "heading" && next.level === 1) {
        const title = normalizeText(next.text);
        if (!SECTION_HEADING.test(title) && !GROUP_HEADING.test(title)) {
          heading = normalizeText(`${text} ${title}`);
          at++;
        }
      }
      res = openHeading(joinId(aid, annexSectionSegment(m[1] as string)), "annex_section", annexScope, heading, at, blk.anchor);
      section = res.scope;
      group = null;
    } else if (blk.level === 1 && (m = GROUP_HEADING.exec(text))) {
      const parent = section ?? annexScope;
      res = openHeading(joinId(parent.draft.id, `pt_${m[1] as string}`), "annex_point", parent, m[2] as string, i + 1, blk.anchor);
      group = res.scope;
    } else if (blk.level === 2 && (m = LETTER_HEADING.exec(text))) {
      const parent = group ?? section ?? annexScope;
      res = openHeading(joinId(parent.draft.id, m[1] as string), "annex_point", parent, m[2] as string, i + 1, blk.anchor);
    } else {
      throw new Error(`unrecognised annex heading in ${aid}: "${text}"`);
    }
    cur = res.scope;
    i = res.next - 1;
  }
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
      const d = b.add(chapterId(romanToInt(m[1] as string)), "chapter", null, divisionHeading(c), "", id);
      walk(c, d.id, b);
    } else if ((m = /^cpt_([IVXLC]+)\.sct_(\d+)$/.exec(id))) {
      const cpt = chapterId(romanToInt(m[1] as string));
      const d = b.add(sectionId(cpt, m[2] as string), "section", parent, divisionHeading(c), "", id);
      walk(c, d.id, b);
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
  return { nodes: b.finish(), warnings: b.warnings };
}
