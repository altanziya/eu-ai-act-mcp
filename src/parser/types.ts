export type NodeType = "recital" | "chapter" | "section" | "article" | "paragraph" | "point" | "annex" | "annex_point";

/** One provision node. Key order here is the JSON key order of the corpus files. */
export interface ProvisionNode {
  id: string;
  type: NodeType;
  parent: string | null;
  heading: string;
  text: string;
  hash: string;
  order: number;
  /** Id attribute of the nearest enclosing source element in the CELLAR XHTML (own id if it has one). */
  source_anchor: string;
}

export interface CorpusFile {
  celex: string;
  lang: string;
  nodes: ProvisionNode[];
}
