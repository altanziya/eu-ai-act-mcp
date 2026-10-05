export type NodeType =
  | "recital"
  | "chapter"
  | "section"
  | "article"
  | "paragraph"
  | "subparagraph"
  | "point"
  | "annex"
  | "annex_section"
  | "annex_point";

/** One provision node. Key order here is the JSON key order of the corpus files. */
export interface ProvisionNode {
  id: string;
  type: NodeType;
  parent: string | null;
  heading: string;
  text: string;
  /** SHA-256 over the normalized `text` (plan/day-1.md). */
  hash: string;
  /** SHA-256 over normalized `heading + "\n" + text`; used by the diff (ADR-012). */
  node_hash: string;
  order: number;
  /** Id attribute of the nearest enclosing source element in the CELLAR XHTML (own id if it has one). */
  source_anchor: string;
}

export interface CorpusFile {
  celex: string;
  lang: string;
  nodes: ProvisionNode[];
}
