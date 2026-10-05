# eu-ai-act-mcp

Deterministic provision tree, diff and measurements for Regulation (EU) 2024/1689 (AI Act),
Official Journal version (`32024R1689`) and consolidated version after the Omnibus
(`02024R1689-20260727`), EN and DE.

## Commands

    npm run fetch   # download raw XHTML from CELLAR into data/raw (cached)
    npm run parse   # data/raw -> data/corpus/<celex>.<lang>.json + data/diff/<lang>.json
    npm run h3      # data/h3.json
    npm test

## Node format

Corpus files `data/corpus/<celex>.<lang>.json` hold `{celex, lang, nodes}`; each node has, in this order:
`id, type, parent, heading, text, hash, node_hash, order, source_anchor`.

- `hash`: SHA-256 (hex) over the normalized `text`.
- `node_hash`: SHA-256 over the normalized `heading + "\n" + text`; the diff classes (`unchanged`, `changed`,
  `moved`) use it, so a changed heading counts as a change.
- `order`: 0..n-1 in document order, without gaps; a parent always precedes its children.
- Types: `recital`, `chapter`, `section`, `article`, `paragraph`, `subparagraph`, `point`, `annex`,
  `annex_section`, `annex_point`.

## ID scheme

ID scheme v1 (ADR-012). IDs are logical paths that follow the legal way of citing; they are the same in EN and DE
and carry no `~N` suffix. Every ID is unique per file, every `parent` exists.

| ID | Meaning |
|---|---|
| `rec_12` | recital 12 (Official Journal version only) |
| `cpt_3`, `cpt_3.sct_2` | chapter III, section 2 of chapter III |
| `art_4a` | article 4a (its own article, not part of art. 4) |
| `art_50.par_1` | article 50, paragraph 1 |
| `art_50.par_1.a`, `art_50.par_1.a.i` | point (a), sub-point (i) |
| `art_3.pt_1` | numbered point 1 (definitions) |
| `art_43.par_1.sub_2` | second subparagraph of paragraph 1 (type `subparagraph`) |
| `art_43.par_1.sub_2.a` | point (a) of the list in that second subparagraph |
| `art_4a.par_2.sub_2` | closing sentence after the list of paragraph 2 |
| `anx_3.pt_1.a` | annex III, point 1, point (a) |
| `anx_1.sec_a`, `anx_1.sec_b` | annex I, Section A / Section B (type `annex_section`) |
| `anx_8.sec_c.pt_1` | annex VIII, Section C, point 1 |
| `anx_11.sec_1` | annex XI, Section 1 (heading: "Section 1 Information to be ...") |
| `anx_10.pt_1`, `anx_10.pt_1.a` | annex X, group "1. Schengen Information System" (title in `heading`), its point (a) |
| `anx_7.pt_3.pt_1` | annex VII, point 3.1 (nested number "3.1." below group 3) |
| `anx_14.pt_2.a` | annex XIV (2026), group 2, letter heading "a." |

Rules:

- The first text block of a paragraph, point or annex point is its `text`. A list directly after it hangs below it
  (`art_43.par_1.a`). Every further text block of the same node becomes a `subparagraph` `sub_2`, `sub_3`, ... (the
  node's own text counts as subparagraph 1); lists after such a block hang below that `sub_N`. This also holds for
  articles without numbered paragraphs (`art_X.sub_2`) and for annex points (`anx_3.pt_1.sub_2`).
- Annex section lines ("Section A. ...", "Abschnitt B — ...", "Section 1" plus its title line) become `annex_section`
  nodes with the full line as `heading`; numbered group lines ("1. Schengen ...") become `annex_point` `pt_N` with the
  label removed from `heading`; level-2 lines ("a. ...") become lettered points below their group. Heading lines are
  never merged into the text of the previous point. Any other heading line in an annex makes the parser fail.
- Nested numbers ("3.1.") become nested points (`pt_3.pt_1`), never `pt_3-1`.
- Data tables stay text of their node, one line per row, cells joined by " | ".
- Nodes appear in document order; the text of a provision is the concatenation of `heading` and `text` of its nodes
  in `order` (checked against the raw XHTML in `tests/unit/coverage.test.ts`).

## Known limitations

- Internal structure of the amending articles 105 to 108 (they quote paragraphs of other acts) is not modelled
  properly: the Official Journal parses the quotation as `sub_N` text, the consolidated version as numbered points,
  and EN/DE differ in a few `sub_N` nodes there (`en_de_2024` is therefore 0.9975, not 1). Planned for day 2.
- Some nodes appear as `removed` although the text still exists in the 2026 version at another path with changed
  wording, e.g. `art_10.par_5.b` to `.e`. The diff only pairs identical `node_hash` values 1:1 as `moved`; a moved
  and changed provision is not recognised. Planned for day 2.
- Some `changed` nodes differ only in presentation (markup or spacing of the source), not in wording. Planned for
  day 2.
- The consolidated version contains no recitals (F66). `mapped_2024_to_2026` is measured over operative nodes
  (all types except `recital`, ADR-012); the all-node ratio is in `data/h3.json` under `details`.

## Licences (separate)

- Code: Apache-2.0 (`LICENSE`).
- Legal texts: (c) European Union, eur-lex.europa.eu (reuse under Decision 2011/833/EU).
  Only the Official Journal is authentic; the consolidated version is not.
- Own data (node IDs, hashes, diffs, measurements): CC BY 4.0.

See `NOTICE`.
