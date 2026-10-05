# eu-ai-act-mcp

Deterministic provision tree, diff and measurements for Regulation (EU) 2024/1689 (AI Act),
Official Journal version (`32024R1689`) and consolidated version after the Omnibus
(`02024R1689-20260727`), EN and DE.

## Commands

    npm run fetch   # download raw XHTML from CELLAR into data/raw (cached)
    npm run parse   # data/raw -> data/corpus/<celex>.<lang>.json + data/diff/<lang>.json
    npm run h3      # data/h3.json
    npm run mcp     # MCP server on stdio (see "Run the MCP server")
    npm test
    npm run typecheck

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
  properly: the Official Journal parses the quotation as `sub_N` text, the consolidated version as numbered points.
  Punctuation-only blocks (the ";" that closes a quoted amendment) are appended to the preceding text, so EN and DE
  now have the same nodes (`en_de_2024` and `en_de_2026` are 1.0). Open.
- Some nodes appear as `removed` although the text still exists in the 2026 version at another path with changed
  wording, e.g. `art_10.par_5.b` to `.e`. The diff only pairs identical `node_hash` values 1:1 as `moved`; a moved
  and changed provision is not recognised. Open.
- Some `changed` nodes differ only in presentation (markup or spacing of the source), not in wording. Open; their
  word diff then has only `equal` operations.
- The consolidated version contains no recitals (F66). `mapped_2024_to_2026` is measured over operative nodes
  (all types except `recital`, ADR-012); the all-node ratio is in `data/h3.json` under `details`.

## Tools

Three read-only tools (pure functions in `src/tools/`, exposed by `src/mcp/server.ts`). Every result carries `notice`
(`{de, en}`, the mandatory texts with the version actually checked). No result contains a timestamp; `as_of` is only
echoed. Versions: `32024R1689` (Official Journal) and `02024R1689-20260727` (consolidated after the Omnibus,
amending act `32026R1744`). Where an `id` is expected, a human citation is accepted too (`Article 50(1)(a)`,
`Art. 50 Abs. 1 Buchst. a`, `Annex III, point 1(a)`, `Recital 12`; `src/tools/refParser.ts`, null if not understood).

### `aiact_get_provision` (`getProvision`)

Input `{ id, version?, lang?, include_children? }`: `version` default `02024R1689-20260727`, `lang` default `en`,
`include_children` default `true`. Output `{ found, version, lang, node?, children?, text_full?, reason?, fallback?, notice }`.
`children` are all descendants in document order; `text_full` is heading and text of the node and (with children) all
descendants in `order`, joined by "\n". If the id is not in the requested version but in the other one: `found: false`,
`reason` `not_in_consolidated_version` (requested 2026) or `not_in_version` (requested 2024), and `fallback: { version, node }`.
Recitals exist only in the Official Journal version (F66). Unknown everywhere: `reason: "unknown_id"`.

### `aiact_diff` (`diffProvision`)

Input `{ id, lang? }`. Output `{ id, lang, status, from_version, to_version, moved_to?, moved_from?, word_diff?, descendants?,
note?, amending_act, notice }`. `status` is `unchanged | changed | added | removed | moved | unknown_id`, from
`data/diff/<lang>.json` (by `node_hash`). It describes the node itself; changes below it are in `descendants`
(`{added, removed, changed, moved, unchanged}`, counted over all descendants). `word_diff` (only for `changed`) is a
list of `{op: equal|insert|delete, text}` over the words of heading plus text.

### `aiact_verify_citation` (`verifyCitation`)

Input `{ quote, claimed_ref?, as_of?, lang? }` (`as_of` ISO date, default today in the MCP server; `lang` default `en`).
Output `{ status, as_of, lang, version_checked, claimed_ref_input?, claimed_ref_id?, match?, provision_id?, found_in_version?,
found_in_lang?, hard_token_mismatches?, soft_token_diffs?, candidates?, warnings?, validity, language_check,
support_checked: false, notice }`.
`match` is `{ provision_id, version_id, lang, similarity, matched_text }`. `claimed_ref_id` is the parsed id or `null`
(then `warnings` contains `unparsed_ref` and the search still runs). The tool checks wording and location only. It never
checks that a text supports a claim (`support_checked` is always `false`) and gives no overall verdict.

## Verification levels V0-V2

V0, V1 and V2 are separate fields; there is no combined "verified".

**Version checked.** `as_of < 2026-07-27` -> `32024R1689`, otherwise `02024R1689-20260727`.

**V0 (`status`): does the wording exist, and where.** Precedence:

1. The version checked in `lang`: a hit at `claimed_ref` (the node itself or one of its descendants) -> `exact` or `fuzzy`.
   No hit there but exactly one elsewhere -> `found_at_other_provision` (+ `provision_id`); several -> `multiple_matches`
   (+ `candidates`, no verdict). Without `claimed_ref`: one hit -> `exact`/`fuzzy`, several -> `multiple_matches`.
2. Otherwise the other version in `lang` -> `found_other_version` (+ `found_in_version`, `provision_id`).
3. Otherwise the version checked in the other language -> `found_other_language` (+ `found_in_lang`); the other
   version in the other language also gives `found_other_language` with `found_in_version`.
4. Otherwise a hard-token mismatch (below) -> `mismatch_hard_token` (+ `hard_token_mismatches`); `exact`/`fuzzy` anywhere
   beats it. Quotes across several nodes of one article -> `multi_node` (`candidates` = one part per node).
5. Else `not_found`. Fewer than 6 tokens -> `too_short`.

Rules fixed by this implementation:

- *Normalization:* NFC, soft hyphens, typographic quotes and hyphens, whitespace (line breaks become spaces), a list label
  at the start removed (`(a)`, `1.`, `(ba)`, dash, bullet). `[...]`, `[…]`, `(...)`, `…` and `...` split the quote into
  segments that must occur in this order in one node (or in one article for `multi_node`).
- *Token:* whitespace-separated word, lower-cased, boundary punctuation removed (a lone `;` is no token).
- *Hard tokens:* tokens with a digit, spelled-out numbers (two to ninety, hundred; zwei bis neunzig), month names EN/DE
  (`may` only next to a number), negations (`not no nicht kein keine keinen keinem keiner keines`). They must be equal;
  an inserted, dropped or changed hard token is listed in `hard_token_mismatches` as `{in_quote, in_corpus}`.
- *Similarity:* approximate substring search on tokens (unit edit costs, free start and end in the node text);
  `similarity = 1 - soft_edits / quote_tokens`, where edits involving a hard token do not count as soft. A node is a hit
  at similarity >= 0.95 from 20 tokens and >= 0.97 for 6 to 19 tokens (that is 1 soft edit from 20 tokens, 2 from 40; none
  below 20). Differing soft tokens are listed in `soft_token_diffs`. `mismatch_hard_token` needs soft tokens over the
  threshold, at least half the quote matched and at least 3 soft tokens matched.
- *exact vs fuzzy:* `exact` = same words, case and inner punctuation (boundary punctuation ignored); a quote that differs only
  in capitalisation or inner punctuation is `fuzzy` with similarity 1 and the warning `differs_in_case_or_punctuation`.
- *Pinpoint ids:* `Article 3(1)` is read as `art_3.par_1`; if the corpus has `art_3.pt_1` instead, that node is used.
- Matching is against the node `text` (not the heading), per version and language.

**V1 (`validity`): does it apply on `as_of`.** On the matched node:

- hit only in the 2024 text while `as_of >= 2026-07-27` -> `superseded_by` (+ `version`); hit only in the 2026 text while
  `as_of < 2026-07-27` -> `inserted_by` (+ `act` `32026R1744`);
- otherwise the deadline table on the node in the version checked: `in_force_at_as_of`, `not_yet_applicable_until`
  (+ `until`), with `rule_id` and `source_nodes`; `unknown` if no rule and no default applies, or between two dates of a
  rule that applies by class of AI system, or when there is no single match (`multiple_matches`, `too_short`, `not_found`).

**V2 (`language_check`):** `matches | differs | not_checked` (+ `detected_lang`). English or German is detected by counting
function words; `not_checked` when undecided. Corrections (Berichtigungen) are not checked.

## Deadline table

`data/deadlines.json`, written by hand from the text of Article 113 of each version; every rule has `source_nodes` (node ids
whose text states it), `applies_from`, `scope`, `except` and a `note`. No model, no external source. Resolution: the node and
its ancestors (article, section, chapter) are matched against the `scope` entries; the rule whose entry is nearest to the node
wins (the most specific), a node named in `except` is removed from that rule, no rule -> the version's `default`
(Art. 113, second paragraph: 2026-08-02).

| Version | Rule | Scope | Applies from |
|---|---|---|---|
| 2024 | `ch1-2` | Chapters I, II | 2025-02-02 |
| 2024 | `ch3s4-ch5-ch7-ch12-art78` | Ch. III Section 4, Ch. V, VII, XII, Art. 78, except Art. 101 | 2025-08-02 |
| 2024 | `art6-par1` | Art. 6(1) | 2027-08-02 |
| 2024 | default | everything else | 2026-08-02 |
| 2026 | `ch1-2` | Chapters I, II, except Art. 5(1) points (ba), (bb), 5(1a), 5(1b) | 2025-02-02 |
| 2026 | `art5-ba-bb-1a-1b` | Art. 5(1) points (ba), (bb), Art. 5(1a), 5(1b) | 2026-12-02 |
| 2026 | `ch3s4-ch5-ch7-ch12-art78` | as in 2024 | 2025-08-02 |
| 2026 | `ch3s1-3` | Ch. III Sections 1, 2, 3, except Art. 6(5) | 2027-12-02 (Annex III systems) / 2028-08-02 (Annex I systems) |
| 2026 | `art102-110` | Arts. 102 to 110 | 2026-07-27 |
| 2026 | default | everything else (incl. Art. 6(5)) | 2026-08-02 |

Coverage (articles resolved by an explicit rule / by the default; `npx tsx` over the corpus, `as_of` irrelevant):
2024: 33 of 113 articles (29.2 %) explicit, 80 (70.8 %) default. 2026: 65 of 119 (54.6 %) explicit, 54 (45.4 %) default.
Over all non-recital nodes: 30.3 % (2024) and 48.5 % (2026) explicit.

Limits:

- Only application dates stated in Article 113 are modelled. Transitional rules for systems already on the market
  (Art. 111, e.g. 2030-08-02, 2030-12-31, 2026-12-02 for Art. 50(2) systems placed on the market earlier) depend on facts
  about the operator and are not applicable-from dates of a provision; they are not in the table.
- Art. 6(1) in the 2024 text applies "and the corresponding obligations in this Regulation" from 2027-08-02; the text does
  not name them, so only Art. 6(1) is mapped and those obligations fall under the default.
- Chapter III Sections 1 to 3 (2026) have two dates by class of AI system. `applies_from` is the earlier one; between the two
  dates the result is `unknown`. Annexes and recitals carry no rule and get the default; the Annex I and III dates of
  Art. 113(3)(c) are not attached to the annex nodes.
- Entry into force (twentieth day after publication) is not modelled; the table says when a provision applies.
- Deadlines for Member States or the Commission inside articles (e.g. Art. 57(1) sandboxes) are not application dates and are
  not in the table.

## Run the MCP server

    npm ci
    npm run mcp          # = tsx src/mcp/server.ts, stdio

Claude Code: `claude mcp add eu-ai-act -- npx tsx /path/to/eu-ai-act-mcp/src/mcp/server.ts`. Other clients: command `npx`,
args `["tsx", "src/mcp/server.ts"]`, working directory the repository root. Tools: `aiact_get_provision`, `aiact_diff`,
`aiact_verify_citation`, all with `annotations.readOnlyHint: true`; each result is JSON text in `content[0]`. The server
reads only `data/corpus`, `data/diff` and `data/deadlines.json`; it makes no network calls.

## Licences (separate)

- Code: Apache-2.0 (`LICENSE`).
- Legal texts: (c) European Union, eur-lex.europa.eu (reuse under Decision 2011/833/EU).
  Only the Official Journal is authentic; the consolidated version is not.
- Own data (node IDs, hashes, diffs, measurements): CC BY 4.0.

See `NOTICE`.
