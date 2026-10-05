/**
 * Thin DOM layer over htmlparser2.
 *
 * Parser choice: htmlparser2 in xmlMode. The CELLAR files are well-formed XHTML (no named
 * entities, self-closing <div/> and <br/>), which xmlMode keeps intact; it is a single small,
 * dependency-light, deterministic parser with no DOM emulation overhead (cheerio and jsdom
 * would add weight for no benefit here).
 */
import { parseDocument } from "htmlparser2";

export interface DomNode {
  type: string; // "tag" | "text" | "comment" | "directive" | "root" | ...
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
  parent?: DomNode | null;
}

export function parseXhtml(xhtml: string): DomNode {
  return parseDocument(xhtml, { xmlMode: true }) as unknown as DomNode;
}

export const isTag = (n: DomNode): boolean => n.type === "tag";
export const isText = (n: DomNode): boolean => n.type === "text";
export const attr = (n: DomNode, name: string): string => n.attribs?.[name] ?? "";
export const idOf = (n: DomNode): string => attr(n, "id");
export const kids = (n: DomNode): DomNode[] => n.children ?? [];
export const tagChildren = (n: DomNode): DomNode[] => kids(n).filter(isTag);

export function hasClass(n: DomNode, cls: string): boolean {
  return attr(n, "class").split(/\s+/).includes(cls);
}

export function classMatches(n: DomNode, re: RegExp): boolean {
  return re.test(attr(n, "class"));
}

/** Concatenated raw text of a subtree (no footnote handling; use for labels and headings only). */
export function rawText(n: DomNode): string {
  if (isText(n)) return n.data ?? "";
  if (n.name === "br") return " ";
  return kids(n).map(rawText).join("");
}

/** All descendant tags (depth-first, document order) for which `pred` holds. */
export function findAll(n: DomNode, pred: (t: DomNode) => boolean, into: DomNode[] = []): DomNode[] {
  for (const c of kids(n)) {
    if (!isTag(c)) continue;
    if (pred(c)) into.push(c);
    findAll(c, pred, into);
  }
  return into;
}
