# Technical reference

Full specification of data format, ID scheme, tools, verification levels, deadline table, releases, signing, evidence records and the verify page. The overview is in the [README](../README.md).

## Commands

    npm run fetch   # download raw XHTML from CELLAR into data/raw (cached)
    npm run parse   # data/raw -> data/corpus/<celex>.<lang>.json + data/diff/<lang>.json
    npm run h3      # data/h3.json
    npm run mcp     # MCP server on stdio (see "Run the MCP server")
    npm run release -- --id <release_id>   # release/<id>/ with manifest (see "Releases and manifest")
    npm run sign -- --release <id> --key-file <pem>
    npm run record -- --quote "..." --as-of YYYY-MM-DD --lang en --release <id>
    npm run build:site && npm run site:serve   # verify page on http://127.0.0.1:8787/verify/
    npm run eval -- --cases <yaml> --models <id,...> --arms plain,web,tools --reps N --max-usd X --out <dir> --primary-model <id>   # see "Evaluation harness"
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

Six read-only tools (pure functions in `src/tools/`, exposed by `src/mcp/server.ts`; `aiact_search`, `aiact_audit_text` and `aiact_obligations` only in extended mode, see "Run the MCP server"). Every result carries `notice`
(`{de, en}`, the mandatory texts with the version actually checked). No result contains a timestamp; `as_of` is only
echoed. Versions: `32024R1689` (Official Journal) and `02024R1689-20260727` (consolidated after the Omnibus,
amending act `32026R1744`). Where an `id` is expected, a human citation is accepted too (`Article 50(1)(a)`,
`Art. 50 Abs. 1 Buchst. a`, `Annex III, point 1(a)`, `Recital 12`; `src/tools/refParser.ts`, null if not understood).

### `aiact_get_provision` (`getProvision`)

Input `{ id, as_of?, version?, lang?, include_children? }`: `as_of` (ISO date) default today; without `version` the version in
force on `as_of` is returned (before 2026-07-27 the Official Journal version `32024R1689`, after it the consolidated version
`02024R1689-20260727`); an explicit `version` wins. `lang` default `en`, `include_children` default `true`.
Output `{ found, version, lang, as_of, applicability?, node?, structure?, children?, text_full?, reason?, fallback?, notice }`.
`applicability` is the deadline-table result for the node in the returned version on `as_of`, in the form of `validity` of
verify (`state`, `until?`, `rule_id`, `source_nodes`, `conditional_dates?`); it is computed for `as_of` (or today) also with an
explicit `version`. `as_of` is the date used (input or today). The eval harness passes the case date as default `as_of`.
`structure` is `{ parent: {id, citation} | null, siblings: [{id, citation, new_in_version?: true}], children: [{id, citation}] }`:
`parent` and `siblings` are the neighbourhood in the returned version (siblings exclude the node itself). For a paragraph, point or section the
siblings are the other children of the parent in document order; for an article, annex or recital they are the one before and the one after
and every item of the same number (Article 60: 59, 60a, 61), so provisions inserted with a letter suffix (Article 60a, Article 99(6a)) are
visible. `new_in_version: true` marks a sibling that does not exist in the Official Journal version (only set in the consolidated version;
in the Official Journal version a node missing from the consolidated one was removed, not new). At most 30 siblings (the nearest in
document order); `children` are the direct children (the top-level `children` below are all descendants). The tool description says so
too (also in `TOOL_DEFS`), because in the evaluation (cases A40, A42) models read Article 99(6) and missed the inserted 6a.
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

Input `{ quote, claimed_ref?, as_of, lang? }` (`as_of` ISO date; required by the library function, which has no default; the MCP
server fills in today's local date when it is omitted; `lang` default `en`).
Output `{ status, as_of, lang, version_checked, claimed_ref_input?, claimed_ref_id?, match?, provision_id?, found_in_version?,
found_in_lang?, hard_token_mismatches?, soft_token_diffs?, candidates?, warnings?, validity, language_check,
support_checked: false, notice }`.
`match` is `{ provision_id, version_id, lang, similarity, matched_text }`. `claimed_ref_id` is the parsed id or `null`
(then `warnings` contains `unparsed_ref` and the search still runs). The tool checks wording and location only. It never
checks that a text supports a claim (`support_checked` is always `false`) and gives no overall verdict.

### `aiact_search` (`aiactSearch`, core `searchCore.ts`)

Input `{ query, as_of?, lang?, limit? }`: `as_of` default today, `lang` default: detected from the query (`detectLang`: German on umlauts/ß, German stopwords, frequent German word parts such as "pflicht", "betreiber", "hochrisiko" and endings such as -ung/-keit/-lich, outscoring English stopwords; otherwise `en`), `limit` default 8, at most 20 (values below 1 are
raised to 1). Output `{ as_of, version, lang, results: [{ id, citation, heading?, snippet, score, applicability }], notice }`.
Searches the version in force on `as_of` (no recitals in the consolidated version). Ranking: BM25 (k1 1.2, b 0.75), one
document per node (own heading and text; descendants are separate documents). Tokens are lower-case Unicode words minus a short
EN/DE stopword list, reduced by a light suffix stemmer (EN `-ies -> -y`, `-es`, `-s`, `-ing`, `-ed`; DE `-en -e -n -s`, nouns in
`-ung/-ion/-heit/-keit/-schaft/-tät` lose only the plural `-en`). Terms of the node's own heading count three times, those of the
heading of the nearest article or annex above it twice (neither enters the length normalisation), so a paragraph of "Penalties"
matches "penalties". A small synonym table (EN penalty/fine/sanction, deepfake/label/disclose, registration/register/database,
SME/small/medium, oversight/supervision; DE Strafe/Sanktion/Geldbuße/Bußgeld, Kennzeichnung/Offenlegung/Deepfake,
Registrierung/Datenbank, KMU, Aufsicht/Überwachung; `SYNONYMS` in `searchCore.ts`) adds the other terms of a group at weight 0.4;
some groups also name articles (penalties -> Article 99, labelling/deepfake -> Article 50, registration -> Articles 49 and 71) whose
nodes get a factor 1.5 when a query term belongs to the group. An exact phrase (the content words of the query, contiguous in the
node, stopwords ignored) adds half the summed idf of the query terms. Document-length normalisation prefers short leaves and
paragraphs; articles and annexes count 0.85, chapters and sections 0.6. Ties by document order. `citation` is `formatRef(id, lang)`;
`heading` is the node's own or the nearest ancestor's; `snippet` has at most 240 characters around the first query term, cut at
word boundaries (`…` marks a cut). `applicability` as in `aiact_get_provision`. The core takes the corpus loader and the deadline
table as parameters and has no `node:` import (it is meant to run in the browser). Relevance checks are in
`tests/unit/search.test.ts` ("relevance on the real corpus").

### `aiact_obligations` (`aiactObligations`, core `obligationsCore.ts`)

Input `{ profile, as_of?, lang?, detail? }`. Output `{ as_of, version, profile_echo?, derived, obligations, timeline, open_questions, notice }`.
Orientation from the consolidated text: for a company profile, the applicable and upcoming obligations with citation, verbatim
quotation, application date on `as_of` and the places where a legal assessment is needed. No language model; deterministic.

- **Data** `data/obligations.json` (schema `obligations-v1`, reviewed draft from `work/obligations/`): `profile_fields`, `derived`
  (rules over profile fields and other derived fields), `obligations` (about 95 entries, each with `roles`, `applies_if`, `provisions`,
  `anchor_node`, a verbatim `quote`, `timing`), `classification` (the rules behind the derived fields, with the open legal question).
  The file contains no application dates except the fixed dates of Article 111 (`timing.date`) and `not_before`; all other
  dates come from `data/deadlines.json`.
- **Profile**: only fields of `profile_fields` (`describeProfile()` returns name, description, type and allowed values; the MCP input
  schema is generated from it). An unknown field is an error that lists the allowed fields. `role` is required (non-empty array of
  `provider|deployer|importer|distributor|authorised_representative|product_manufacturer`); missing booleans count as false, other
  missing fields as unknown (null); the one exception is the scope gate `uses_or_provides_ai_system`, which defaults to **true**
  (description `bool, default true`); an explicit `false` lists no obligations and the `notice` adds "The profile states the organisation is out
  of scope". Types are strict and the same in the core and in the MCP schema: booleans are `true`/`false` (`null` counts as missing), `annex_iii_area` is a string
  `"1"` to `"8"` or null (a number is an error that names the string to use), `annex_i_section` `"A"`/`"B"`/null, dates are real calendar dates (`2026-02-30` is
  "not a valid calendar date"). `profile_echo` is the normalised profile (full detail only).
- **`detail`**: `full` (core default) or `compact` (MCP default; the MCP result is also minified JSON). Compact leaves out `summary`, `omnibus_note` and
  `profile_echo` and cuts `quote` to at most 300 characters with "…" (`quote_verified` is computed on the whole quotation). A large provider profile (both
  routes, systemic-risk GPAI, all Article 50 flags) is about 34 KB compact; all six roles at once list about 76 entries (about 52 KB).
- **`as_of`**: ISO date (a real calendar date; `isIsoDate` rejects `2026-09-31` in all tools), default today; before 2026-07-27 an error (the map is built on the consolidated text; use `get_provision` /
  `verify_citation` for earlier dates).
- **Rules** (DSL): `{field, eq}`, `{field, in}`, `{field, has}` (an array field such as `role` contains the value), `{all}`, `{any}`, `{not}`; fields are profile or derived fields (a cycle is an error).
  `{computed: "date_before", field, date, source_node}` is generic (true when the profile date field is set and earlier than `date`, a date the data takes
  from the text of `source_node`; used for `placed_on_market_before_2025_08_02` and `_2026_08_02`, which are derived fields, not profile fields).
  `placed_before_chapter_iii_date` is the one special computed rule (true when `placed_on_market_before` is set and earlier than the route
  date: rule `art6-par2-annex3` for Annex III, `art6-par1-annex1` for Annex I Section A, the earlier one if both routes apply).
  `derived` lists the true derived fields, sorted. An entry applies when its `roles` meet `profile.role` (or contain `any`) and `applies_if` holds.
- **Dates** by `timing.basis`: `hr_route` takes the route date (both routes: the earlier one as `applies_from`, both in `route_dates`;
  `timing.route` (`annex_i`/`annex_iii`) pins a route-specific entry to that route's date even when both routes apply; `not_before` applies as a lower bound
  to `applies_from` and `applies_from_literal`; no route, for example a role change under Article 25 without classification: the date of `literal_rule`); `deadline_table` takes rule
  `rule`, else `literal_rule`, else the rule matching the anchor, `not_before` as a lower bound; `transition` takes `timing.date`
  (`null`: `applies_from: null`, `status: "depends"`, `days_until: null`). If the literal rule of Article 113 gives another date than the
  effective one, the entry carries `applies_from_literal` and the data's `deadline_caveat` (Article 113 names Chapter III Sections 1 to 3 only, so for example conformity
  assessment, registration and post-market monitoring are literally under the residual rule of 2026-08-02; the map reports both dates and does not decide).
  For `hr_route` entries whose `literal_rule` is `ch3s1-3` no `applies_from_literal` is given (Article 113(3)(c) names the route dates itself; the table rule is a simplification). The output has no `conditional_dates`: the route and `not_before` decide the date.
- **Entry**: `{ id, kind (obligation|permission|relief|transition|scope), title, summary, roles, provisions: [{id, citation}], anchor_node, quote,
  quote_verified (re-checked against the corpus at run time, whitespace-normalised, including descendants of the anchor), applies_from,
  applies_from_literal?, route_dates?, deadline_caveat?, status (applicable|upcoming|depends), days_until,
  legal_assessment_needed?, omnibus_note?, changed_by_omnibus }`. `changed_by_omnibus` is true with an `omnibus_note`, for provisions new
  in 2026, or when the rule of the same anchor in the Official Journal version gives another date (not for `transition` entries, whose dates are not from Article 113).
  Order: `status` (applicable, upcoming, depends), `applies_from`, `id`.
- **`timeline`**: each distinct `applies_from` on or after `as_of`, ascending, with the entry ids.
- **`open_questions`**: `[{ id, kind, question }]`. `kind: "classification"`: one question per open profile field (not provided, no assumed default), only if setting the
  field to another admissible value (booleans both ways, every enum value, a date before everything) changes the list of obligation ids or one of their
  `applies_from` for this profile (probe per field; so only fields that matter for the profile's roles come up; a pair of fields that matter only together is not
  detected). `id` is the field, the text is `Not set: <field> – <field description without its type prefix>` (the classification rules are not consulted: one that only mentions the field in passing would give it a foreign text).
  `kind: "legal_assessment"`: the `legal_assessment_needed` of each listed entry (`id` = obligation id), after the classification questions.
- **Limits**: the map does not decide classification, significance of design changes, "substantial modification", public-service status or open-source
  status; those are flagged. Not covered: duties of Member States, the Commission, notified bodies and authorities; penalty amounts (see `work/obligations/notes.md`,
  "Nicht abgedeckt"). The core takes the corpus loader, the deadline table and the data as parameters and has no `node:` import
  (`tests/unit/obligations.test.ts` bundles it for the browser).

### Citation format (`formatRef`)

`formatRef(id, lang)` is the inverse of `parseRef` for articles, annexes, recitals and chapters: `art_9.par_2` -> `Article 9(2)` /
`Artikel 9 Absatz 2`; `art_5.par_1.a` -> `Article 5(1), point (a)`; `art_113.sub_3.c.i` -> `Article 113, third paragraph, point (c)(i)`;
`anx_3.pt_1.a` -> `Annex III, point 1(a)` / `Anhang III Nummer 1 Buchstabe a`; `anx_1.sec_a.pt_2` -> `Annex I, Section A, point 2`;
`rec_12` -> `Recital 12`; `cpt_3.sct_2` -> `Chapter III, Section 2`. Ids of an unknown shape come back unchanged. `parseRef` was
extended for this (ordinal paragraphs such as "third paragraph", German "Ziffer"); `tests/unit/format-ref.test.ts` checks
`parseRef(formatRef(id)) === id` for every node of both corpora in both languages.

### `aiact_audit_text` (`auditText`, core `auditCore.ts`, scanner `auditScan.ts`)

Input `{ text, as_of, lang? }` (`as_of` required by the library function; the MCP server fills in today; `lang` default `en` selects
the corpus and the language of the messages; citation and date notations of both languages are recognised in any case).
Output `{ as_of, version_checked, findings, summary: { error, warning, info, ok }, notice }`, `version_checked` = `versionForDate(as_of)`.
A finding is `{ kind, severity, span: { start, end }, excerpt, message, ref?, node?, expected?, found?, sources, suggestion? }`; `span`
offsets are UTF-16 positions in the input text, findings are ordered by `span.start`, `sources` are `<version>:<node id>`.
No findings at all gives a single `info` finding `no_references` ("no references found"). Deterministic, no model, no network;
orientation only, not legal advice, and no certification of compliance (`notice` as in verify, naming both versions when the
other one was used). 5 000 words take about 50 ms (the gate allows 2 s); each checked quotation costs one `verifyCitation`
call (about 30 ms).

| kind | severity | meaning |
| --- | --- | --- |
| `reference_ok` | ok | the citation exists in the version checked |
| `removed_provision` | error | exists only in the Official Journal version (version checked: consolidated); `suggestion` from the `moved` entries of the diff of the node or its children (e.g. Article 10(5) -> Article 4a(1)) |
| `unknown_provision` | error | exists in neither version (also a pinpoint that does not exist inside an existing article) |
| `not_yet_in_force` | warning | exists only in the consolidated version and `as_of` is before 2026-07-27 (inserted by Regulation (EU) 2026/1744) |
| `deadline_ok` | ok | the date in the sentence is the current date of a subject of its clause; also the date of a descendant's rule (partial application, said in the message) |
| `outdated_deadline` | error | the date is the one of the other (older) version; `expected` is the current date, `found` the date in the text, `sources` the nodes of both versions; message "changed by Regulation (EU) 2026/1744" |
| `unverified_date` | warning | a date shortly after a trigger word (apply, applicable, from, by, take effect, effective, comply, since, deadline; gilt, gelten, ab, seit, anwendbar, wirksam, Frist, bis, spätestens) that matches nothing known (`expected` is the application date); no such warning for the both-routes and carried subjects below; also a date that exists only in the consolidated version when `as_of` is before 2026-07-27 |
| `quote_ok` | ok | `verifyCitation` says `exact` (also `multi_node`, `multiple_matches`) |
| `outdated_quote` | error | `found_other_version`: the quotation is the wording of the other version; `expected` is the current wording, `suggestion` (for removed text) where it moved |
| `wrong_pinpoint` | warning | `found_at_other_provision`; `expected` is the right citation, `found` the claimed one |
| `quote_deviates` | warning | `fuzzy`, `mismatch_hard_token` (number, date or name differs) or `found_other_language` |
| `quote_not_found` | error | `not_found` |
| `not_checked` | info | a quotation beyond the limit of 200 checked quotations per text |
| `no_references` | info | nothing to check |

Detection. *Citations*: `Article/Art./Artikel N`, `Annex/Anhang <roman or number>` followed by readable pinpoints (`(2)`, `(1)(a)`,
`, point (a)`, `third paragraph`, `Absatz 2`, `Buchst. a`, `Nummer 4`, `Section A`); read with `parseRef`, with the numbered-point
reading of `Article 3(1)`, `(n)` read as the n-th paragraph for articles without numbered paragraphs (`Article 113(3)(c)` is
`art_113.sub_3.c`) and a missing subparagraph level tolerated. Lists give every item ("Article 6 and 7", "Articles 6(1) and (2)",
"Artikel 6 Absatz 1 und 2"; a range "Articles 102 to 110" its two ends). Citations followed by another act (GDPR/DSGVO, "Regulation (EU)
N/N" other than 2024/1689, any Directive, spelled-out acts such as the General Data Protection Regulation, Data Act, Digital Services Act,
Machinery Regulation, Datenschutz-Grundverordnung, treaties) or preceded by "GDPR" are skipped; anchor terms in such a sentence are
no subjects. *Dates*: ISO, `2 August 2026`, `2nd August 2026`, `August 2, 2026`, `2.8.2026`, `2. August 2026` (EN and DE month
names). A date is judged only where its clause has a cited provision or an anchor term (`Annex III` -> Article 6(2); `Annex I` with
high-risk -> Article 6(1); general-purpose AI -> Chapter V; prohibited practices -> Article 5; AI literacy -> Article 4;
transparency obligations -> Article 50; "high-risk" / "high risk" / "Hochrisiko" (also as a word part: Hochrisiko-KI-Systeme) without Annex I/III and without Article 6(1)/(2) in the sentence -> both routes, see below). Clauses end at `;`, `, while`, `, whereas`, `, but`, `, während`, `, aber` and at "and"/"und"
when a date precedes it and another subject follows. The subjects of the clause (before the date first) are tried: per subject a date
written in the text of the cited node or its descendants (in either version) goes first, then the application date (`applies_from`
and later class dates) of the matching rule of the deadline table in both versions. The date is `deadline_ok` if it fits any subject
(then rules of descendants count too, as partial application); `outdated_deadline` only if no subject fits and it is the date of
the other version of one of them (`expected` falls back to the rule when the text gives no unique counterpart); otherwise
`unverified_date`, only if a trigger word stands at most six words before the date (itself included) in the same clause. A date inside a checked quotation is left to
the quotation check. *Quotations*: text in `" "`, `“ ”`, `„ “` or `« »` of at least 6 words, with a citation in the same or the previous
sentence (a citation inside the quotation does not count), is passed to `verifyCitation` with that citation as `claimed_ref` (at
most 200 per text, identical ones once). Sentences are split at `. ! ?` (not after abbreviations such as Art., Abs., Nr.; not in
"2. August"), at blank lines, and never inside a checked quotation.
*Both routes* (`high-risk` without an annex): the subject has the dates of both routes of Article 6 (`art_6.par_2` = Annex III and `art_6.par_1` = Annex I,
from the deadline table, nothing in the code). A date of a route in the version in force is `deadline_ok` (the message names the route); a date that
is only a date of the other version is `outdated_deadline` with `expected` = the Annex III date of the version in force, the message names both
current dates ("2 December 2027 for Annex III systems and 2 August 2028 for Annex I products"). Such a finding needs a trigger word in the clause of
the date and the term before the date in that clause (or a date opening the sentence: "From 2 August 2026, high-risk ..."); a general application date
("The AI Act applies from 2 August 2026, with high-risk systems following later") is not flagged. *Subject from the previous sentence*: a
date with a trigger word whose sentence has no subject takes the subjects of the sentence before it, if that is in the same paragraph (no blank line)
and has no date of its own; at most one sentence back, only date findings, no new citation findings, no `unverified_date` for carried subjects.
*Messages* name dates in reading form ("2 August 2026", "2. August 2026"); `found` and `expected` stay ISO.
Speed: `verifyCitation` finds the nodes that can match a quote through an inverted token index per corpus (a node needs at least half
of the quote's tokens, so only nodes holding one of the rarest quote tokens are tested), and searches the four corpora of the precedence
order only until one decides. Results are the same as testing every node (`tests/unit/verify.test.ts`); 150 different quotations in
a 5000-word text take about 0.2 s on a developer machine (the audit tests keep their limit of 2 s).
Known gaps: no recitals, no relative dates ("two years after entry into force"), no check of
which provision applies to a system; a date without trigger word is not reported when it matches nothing; "high-risk" is a subject only for
dates with a trigger word, and a subject mentioned only after the date (other than a date opening the sentence) is ignored.

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

**Recitals (F66).** The consolidated version has no recitals; they are not superseded, they are absent. If `claimed_ref` is a
recital (`rec_N`) or the best hit is one, the quote is checked against `32024R1689` (`version_checked` and `match.version_id` are
then `32024R1689`), the normal V0 status is returned, `warnings` contains `recital_not_in_consolidated_version` and
`validity` is `{ state: "unknown", note: "recital: no application date; the preamble is not part of the consolidated text" }`.
Never `found_other_version` or `superseded_by` for a recital.

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
- *Short quotes:* at 6 to 19 tokens the threshold 0.97 allows no soft edit at all (1 edit in 19 tokens is 0.947), so such a quote
  is a hit only if its words match; `fuzzy` there arises only from capitalisation or punctuation, never from a different word.
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
| 2026 | `art6-par1-annex1` | Art. 6(1) | 2028-08-02 (Annex I systems) |
| 2026 | `art6-par2-annex3` | Art. 6(2) | 2027-12-02 (Annex III systems) |
| 2026 | `ch3s1-3` | Ch. III Sections 1, 2, 3, except Art. 6(5) and, being more specific, Art. 6(1), 6(2) | 2027-12-02 (Annex III systems) / 2028-08-02 (Annex I systems) |
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
  Art. 113(3)(c) are not attached to the annex nodes. Art. 6(1) (Annex I, 2028-08-02) and Art. 6(2) (Annex III, 2027-12-02) have their own
  rules, because Art. 113(3)(c)(i) and (ii) name them.
- Entry into force (twentieth day after publication) is not modelled; the table says when a provision applies.
- Deadlines for Member States or the Commission inside articles (e.g. Art. 57(1) sandboxes) are not application dates and are
  not in the table.

## Evaluation harness

`src/eval/` measures how often models err on AI Act questions, per model and arm, with a hard cost cap. Nothing in it
runs by itself; a paid run needs an explicit call.

    npm run eval -- --cases <yaml> --models <id,...> --arms plain,web,tools --reps N --max-usd X --out <dir> \
                    --primary-model <id> [--dry-run] [--resume] [--reasoning-effort low|medium|high|none] [--max-claude-calls N]

- `--cases`: YAML list of cases (`src/eval/cases.ts`, validated; errors name the case id and the field). Fields: `id`
  (unique), `kind` (`generation|evaluation`), `subset` (`version_deadline|evaluation`), `question`, `as_of` (YYYY-MM-DD),
  `knowable_before_omnibus` (bool), `origin` (`real_user_question|constructed`), `origin_ref?`, `expected`
  (`date?`, `version?`, `articles?`, `verdict?`, `claim?`), `ground_truth` (`celex`, `pinpoint`, `quote`), `legal_review`
  (`none|llm_second_rater|lawyer`), `notes?`. `generation` needs at least one of `expected.date|articles|claim`;
  `evaluation` needs `expected.verdict` (`correct|incorrect`). Smoke fixture: `tests/fixtures/eval-smoke.yaml`.
- `--models`: OpenRouter model ids; ids with the prefix `claude-code/` (e.g. `claude-code/claude-opus-5-5`) run through the
  Claude Code backend (below). One run may mix both. `--arms`: `plain`; `web` (OpenRouter plugin `web`); `tools` (the three MCP tools run
  locally, at most 6 rounds, at most 4 tool calls executed per round (further calls of the round get the error result
  "tool call limit per round"), each tool result cut at 6 000 characters; a test checks that `TOOL_DEFS` equals the MCP
  server's descriptions and parameters). `--reps`: repetitions per case (default 1).
- Prompt `eval-prompt-v2`: as v1, plus the sentence "You may search the web." in arm `web` (all backends; Claude Code decides
  itself whether to search, for OpenRouter the plugin is on anyway).
- Requests (OpenRouter): `max_tokens` 3000; `temperature` 0 where the model lists the parameter; `reasoning: {effort}` (default `low`) where the
  model lists `reasoning` (`--reasoning-effort none` omits it); `usage: {include: true}`. Cost is only the sum of `usage.cost`.
  The model list (`GET /models`, free) is fetched once per run for these capabilities. The prompt is `src/eval/prompts.ts`
  (`PROMPT_VERSION`), with the case's `as_of` as today's date; the model must reply with one JSON object with the keys
  `date, version, article, quote, answer, verdict`.
- Key: `OPENROUTER_API_KEY` or the macOS keychain item `openrouter`; never logged or written. Shared client: `src/eval/openrouter.ts`
  (also used by `npm run cost:probe`).
- **Cost cap:** a request whose `usage.cost` is missing is booked with the per-request estimate (run estimate / requests, probe
  mean x 1.5) and the run is marked `cost_estimated: true`; the same holds for an exception or timeout after sending and for a
  5xx answer without cost (a 4xx is not billed). Estimated runs do not raise later estimates. Before every request, `spent + estimate > --max-usd` stops the run with status `budget_stop`
  (a run cut off in the middle is kept in `runs.jsonl` with `incomplete: true` and repeated on `--resume`). The estimate per
  model x arm is the mean cost of `scripts/cost-probe/results/2026-10-05.json` times 1.5 (unknown model: the most expensive cell
  of the arm; never below 1.2 x the most expensive run seen so far) and is printed before the first call. The probe ran with
  `max_tokens` 800, so estimates for models that fill 3000 tokens can be too low; the cap itself counts real `usage.cost`.
- `--primary-model`: the model of the one pre-registered E1 evaluation (arm `web`, subset `version_deadline`); must be one of
  `--models`; required for real runs, optional with `--dry-run`.
- `--dry-run`: mock model, no network, no key, no cost (`--max-usd 0` is fine). It answers from `expected` and is wrong on
  every third case; the report says so.
- `--max-claude-calls N` (default 400): cap on `claude` calls per invocation (a `--resume` counts from zero); before the call that
  would exceed it the run stops with `budget_stop`.
- `--resume`: aborts if a stored run has another (or no) `prompt_version` than the current one; otherwise skips runs already in
  `runs.jsonl` (not those with an API error or `incomplete`), counts their cost against the cap, and re-scores the stored
  answers with the current scorer (`rescored_runs`, cumulative). Without `--resume` an existing `runs.jsonl` is an error.

**Backend `claude-code`** (`src/eval/claudeCode.ts`): one `claude -p` call per case x arm x repetition, sequentially, `spawn` without
shell, stdin closed, in a fresh empty temporary working directory (deleted afterwards), binary from `CLAUDE_BIN` or `claude`,
timeout 300 s. Arguments: `-p <question> --model <id without prefix> --setting-sources "" --strict-mcp-config --system-prompt
<buildSystemPrompt(as_of, arm)> --output-format stream-json --verbose --max-turns 8 --effort low`, plus per arm: `plain`
`--tools ""`; `web` `--tools WebSearch,WebFetch --allowedTools WebSearch,WebFetch`; `tools` `--mcp-config <temp json: server aiact =
node_modules/.bin/tsx src/mcp/server.ts, absolute paths> --tools "" --allowedTools mcp__aiact__aiact_get_provision,
mcp__aiact__aiact_diff,mcp__aiact__aiact_verify_citation`. The child environment lacks `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` and every variable starting with `CLAUDE` (e.g. `CLAUDECODE`, `CLAUDE_CODE_USE_*`,
session and effort variables of a calling Claude Code session) except `CLAUDE_CONFIG_DIR`, so nothing is billed to an API account; no
OpenRouter key is read for a run with only `claude-code/` models. Stream evaluation: answer = `result` of the final `result` event
(then `parseAnswer`); `tool_calls` = every `tool_use` block (name as the CLI reports it, e.g. `mcp__aiact__aiact_diff`, or
`WebSearch`; input cut to 300 characters); `total_cost_usd` -> `cost_equiv_usd`; `model_reported` = keys of `modelUsage`.
`is_error`, a result `subtype` other than `success` (e.g. `error_max_turns`) or exit code != 0 (also timeout, spawn failure, no result event) gives an error run (`error` <= 300 characters); an
error text containing "limit" or "usage" (also a limit text in the assistant output when `is_error` is false and the result is empty or missing) is a used-up quota: the run is stored with `incomplete: true`, the harness stops cleanly
with status `quota_stop`, and `--resume` continues. Subscription runs have `cost: 0`; `cost_equiv_usd` (API-equivalent, not billed)
is not counted against `--max-usd` and is summed separately. `--dry-run` mocks `claude-code/` ids like all others (no `claude` call).

Scoring (`src/eval/answer.ts`, `src/eval/score.ts`; deterministic, no model involved): `parseAnswer` takes the first JSON object
in the text (also in a fence); none or broken JSON gives `null` (empty answers included), which is not scored and reported as
unparseable. `generation`: `date` (normalized to YYYY-MM-DD), `version` (only if the case sets `expected.version`; the pre-registered case
set does not, because the system prompt names "Regulation (EU) 2024/1689" in every arm while the tool descriptions name
02024R1689-20260727; `normalizeVersion`: `2026/1744`, `20260727`, `consolidated`, `konsolidiert`, `omnibus` mean the consolidated
version; `32024R1689`, `2024/1689`, `official journal`, `amtsblatt` the Official Journal; else no version), `claim` (`expected.claim`:
`yes`/`no`/`ja`/`nein` is compared with the first word of `answer`, any other claim must be contained in `answer`, case-insensitive;
an `answer` of null is wrong), `article` (cited provision parsed with `parseRef`; right if equal to an accepted id or a descendant;
if `parseRef` does not understand the citation, e.g. ordinal wording like "third subparagraph", the article itself is used,
so a deeper accepted id is not matched in that case). `evaluation`: `verdict` (and `claim` if set). A run is correct if all checks are true. The version a model names is reported
descriptively by `versionNamed` (never part of `correct`): `2024`, `2026`, `both` or none, from explicit identifiers only
(2026: `20260727`, `2026/1744`, `32026R1744`; 2024: `32024R1689`, `2024/1689`, `official journal`, `amtsblatt`; a 2026 identifier
with "amended"/"geändert" or the full id 02024R1689-20260727 means 2026; keywords such as consolidated or omnibus never count).
`SCORER_VERSION` (`eval-scorer-v2`) is stored with every result.

Unit of analysis is the case. With R repetitions a case is wrong if more than R/2 of its runs are wrong (unparseable runs do not
count as wrong); it is excluded only if no run of it could be scored. Every row has `cases`, `excluded_cases`, `unparseable_runs`
and a sensitivity row "unparseable counted as wrong" (errors, n, Clopper-Pearson interval; n includes excluded cases).

Output in `--out`:

- `runs.jsonl`: one run per line: `case_id, subset, knowable_before_omnibus, kind, model, arm, rep` (0-based), `raw`, `parsed`,
  `prompt_version`, `backend` (`openrouter|claude-code`), `score {correct, checks}`, `prompt_tokens, completion_tokens, cost`,
  `cost_equiv_usd?` and `model_reported?` (claude-code), `cost_estimated?`,
  `tool_calls [{name, arguments, rejected?}]`, `requests, finish_reason, status, latency_ms`, `error?`, `incomplete?`, `mock?`.
- `results.json`: `status` (`complete|budget_stop|quota_stop`), `dry_run` (true only if all runs are mock), `prompt_version`, `scorer_version`, `rescored_runs`, `primary_model`, `e1`
  (`{model, arm: "web", subset: "version_deadline", errors, n, lower, upper, decision}` or null), `reps`, `max_usd`, `max_claude_calls`, `claude_calls`, `total_cost_usd`, `total_cost_equiv_usd`, `backends` (model -> backend), `runs`
  (distinct runs), `planned_runs`, `models`, `arms`, `cases`, `max_tokens`, `request_params`, `estimates`, `cells` (the summary per model x arm, including `backend`, `cost_equiv_usd`, `excluded_cases`, `sensitivity`, `version_named`, `tools_usage`).
- `report.md` (English): per model x arm the number of cases, errors by majority (a case is wrong if more than half of its scored
  runs are wrong: 1 run: that run, 3 runs: at least 2 of 3), the Clopper-Pearson 95 % interval over cases (`src/eval/stats.ts`),
  cases with at least one wrong run, excluded cases, unparseable runs, API error runs, tool-call rate (tools arm), the version-named
  shares, cost, cost equivalent (subscription) and backend, and a sensitivity row per cell. If a `claude-code` model is
  present, a methodology paragraph states: call through the Claude Code CLI with a subscription, own system prompt, still visible
  are an identity sentence of the Agent SDK, the account e-mail and an environment block with the execution date; web search
  is Anthropic's own. The pre-registered E1 rule (`decideE1`) appears in exactly one line starting with
  `E1 decision` (primary model, arm `web`, subset `version_deadline`); no other row carries a decision. A section per model x arm
  `tools` gives the error rate of runs with at least one tool call versus runs without. Tables for all cases, per `subset` and per
  `knowable_before_omnibus`. Provenance (`prompt_version`, `scorer_version`, re-scored runs, dry run) is in the header.

## Run the MCP server

    npm ci
    npm run mcp          # = tsx src/mcp/server.ts, stdio

Claude Code: `claude mcp add eu-ai-act -- npx tsx /path/to/eu-ai-act-mcp/src/mcp/server.ts`. Other clients: command `npx`,
args `["tsx", "src/mcp/server.ts"]`, working directory the repository root. Tools: `aiact_get_provision`, `aiact_diff`,
`aiact_verify_citation`; in extended mode (`npm run mcp:extended`, argument `--extended` or `AIACT_MCP_EXTENDED=1`, in code
`createServer({ extended: true })`) also `aiact_search`, `aiact_audit_text` and `aiact_obligations`. The default lists exactly the three tools because the
frozen day-2 golden test checks that; the evaluation's tools arm (`TOOL_DEFS`) offers the three. All tools with `annotations.readOnlyHint: true`; each result is JSON text in `content[0]`. The server
reads only `data/corpus`, `data/diff`, `data/deadlines.json` and `data/obligations.json`; it makes no network calls.

## Releases and manifest

A release is an immutable copy of the data a verifier needs, in `release/<release_id>/`:

    release/<release_id>/corpus/<celex>.<lang>.json   (the four corpus files)
    release/<release_id>/deadlines.json
    release/<release_id>/diff/{en,de}.json
    release/<release_id>/manifest.json                (schema aiact-corpus-manifest/1)
    release/<release_id>/manifest.sig.json            (added by `npm run sign`)

    npm run release -- --id aiact-corpus-2026-10-05

`manifest.json` lists every file with `path`, `sha256`, `bytes` (corpus files also `celex`, `lang`, `node_count`), plus
`release_id`, `tool_version` (from `package.json`) and the notices (DE and EN). It is sorted by path, 2-space JSON, LF,
trailing newline, with no timestamp, so the same data always gives the same bytes. An existing release is never
overwritten: building it again with different data fails; use a new id. The committed release is
`release/aiact-corpus-2026-10-05/`.

## Signing (maintainer)

Ed25519 over the exact bytes of `manifest.json`. The private key stays outside the repo (macOS keychain, offline backup);
`*.pem` and `*.key` are git-ignored.

    npm run sign -- --release <id> --key-file /path/to/private.pem [--publish-key]
    npm run sign -- --release <id> --keychain <service> [--publish-key]   # security find-generic-password -s <service> -w

This writes `release/<id>/manifest.sig.json` (`schema aiact-manifest-signature/1`, `key_id`, `algorithm`, base64 `signature`,
`signed_sha256`). `key_id` is the first 16 hex characters of the SHA-256 over the raw 32-byte public key. With `--publish-key`
the public key goes to `site/keys/<key_id>.pub` and `site/keys/index.json` (`{ "keys": [{ key_id, public_key_pem, status }] }`,
`status` is `active` or `revoked`). Keys are PEM (SPKI public, PKCS8 private); `generateKeyPair()` in `src/release/sign.ts`
creates a pair with `node:crypto`. Signing and verifying use `@noble/ed25519`, the same code as in the browser. Release `aiact-corpus-2026-10-05` is signed with key `71fa6df7215bb8b9`.

## Evidence record

An evidence record (`aiact-evidence-record/1`) is one quote check made against one release: `release_id`, `input` (`quote`,
`claimed_ref`, `as_of`, `lang`), the full `result` of `aiact_verify_citation`, `cited_nodes` (`id`, `version`, `lang`, `hash`,
`node_hash` of every node the result points to), `manifest_sha256`, `notice` (DE and EN) and `record_hash`. `question`,
`creator` and `created_at` are statements by the creator and are not checked. The library has no clock; the CLI sets
`created_at` (override with `--created-at`). Input limits (UTF-16 code units): `question` 2000, `creator` 200, `quote` 5000;
longer input is rejected with an error.

    npm run record -- --quote "..." --ref art_5.par_1.a --as-of 2026-09-01 --lang en \
      --release aiact-corpus-2026-10-05 [--question "..."] [--creator "..."]

The command prints the record and a verify link. The link carries the record as base64url of its UTF-8 JSON after `#`
(`.../verify/#<record>`); the fragment is never sent to a server.

`record_hash` is the lower-case hex SHA-256 over the canonical JSON of the record without its `record_hash` member. The
canonical JSON is defined so that third parties can recompute it:

- UTF-8 encoding of the text, no byte order mark, no whitespace between tokens (separators `,` and `:` only).
- Strings as `JSON.stringify` writes them: `"` and `\` and the control characters below U+0020 are escaped (`\n`, `\u001f`, ...),
  every other character, including umlauts and other non-ASCII text, is written unescaped as UTF-8 (lone surrogates are
  written as `\udXXX` escapes, which Python cannot encode; none occur in the corpus).
- Object keys sorted recursively by UTF-16 code units (JavaScript string comparison). For keys outside the Basic
  Multilingual Plane this differs from a sort by Unicode code point; all keys of a record are ASCII.
- Arrays keep their order. Members whose value is `undefined` do not exist in the record; `null` is written as `null`.
- No Unicode normalisation: text is hashed as stored, so NFC and NFD forms of the same word give different hashes.
- Numbers in the JavaScript `Number` representation (shortest round-trip form, `1` rather than `1.0`).

Recomputing the hash in Python (record in `record.json`):

    import json, hashlib
    o = json.load(open("record.json", encoding="utf-8")); h = o.pop("record_hash")
    print(h == hashlib.sha256(json.dumps(o, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest())

Checked on 2026-10-05 against two records made with `createRecord` on release `aiact-corpus-2026-10-05`, with umlauts, quotation
marks, `€` and `—` in `question` and `creator` and German statute text in `quote`: the hashes were identical (one record with
`similarity` 1, one fuzzy record with `similarity` 0.9894). Not covered by that check: numbers whose JavaScript and Python
representations differ (exponent forms such as `1e-7`; the record contains no such numbers today) and keys outside ASCII.

## Verify page

`site/verify/index.html` plus the bundle `site/verify/verify.js` (esbuild from `src/verify-core/browser.ts`; no framework, no
external resources). The page decodes the record from `location.hash`, loads `../release/<release_id>/manifest.json`, the
signature (if any), `../keys/index.json`, the four corpus files and `deadlines.json`, checks them against the manifest, and
recomputes V0, V1 and V2 from `quote`, `claimed_ref` and `as_of` with the same code as the Node tools
(`src/tools/verifyCore.ts`). It shows the stated and the recomputed result side by side, the hash check of each cited
node, the signature status (`valid`, `invalid`, `missing`, `unknown_key`, `revoked`) and the creator's statements marked as
unverified. The required notices and the statement text are static HTML (readable without JavaScript).

    npm run build:site    # bundle + copy release/ to site/release/ + site/keys/index.json
    npm run site:serve    # http://127.0.0.1:8787/verify/#<record>   (fetch does not work over file://)

`site/release/` and `site/verify/verify.js` are build outputs and git-ignored. All paths are relative, so the `site/` folder
can be hosted under any base path. Revoking a key means setting its `status` to `revoked` in `site/keys/index.json`.

## Trust model

What a record shows, if the page reports a valid signature and no mismatch: the quoted passages read as stated in the signed
corpus release, as of the date given, and the quotation check was recomputed on the page from the record's input. What it
does not show: who created it, that the question or the creator's statements are true, whether the passage supports a legal
claim (`support_checked` is always false), or that any system is compliant. The text is a rendition from EUR-Lex that is
not legally authentic; only the Official Journal is binding. Not legal advice.

- The maintainer signs the corpus manifest (Ed25519). The private key lives only in the local macOS keychain, never in the
  repo or in CI; signing is manual per release. Public key and fingerprint are published in this README, under `/keys` on
  the page and in a second channel; revocations are listed in the repo. If a key is compromised its key id is revoked, a new
  manifest is issued, and all records with the old key id count as "signature revoked".
- A record without a valid signature (`missing`, `unknown_key`, `invalid`, `revoked`) proves nothing about the release.
- The page checks, in this order: record hash, manifest hash, the release files against the manifest, the signature, every
  cited node against the release corpus, and the recomputed result against the stated one.

Statement shown on the page: "Dieser Record verweist auf Textstellen, die mit dem signierten Korpus-Release X
übereinstimmen; die Zitatprüfung wurde hier neu berechnet. Er beweist nicht, wer ihn erstellt hat, und bestätigt keine
Konformität eines Systems." / "This record refers to passages that match the signed corpus release X; the quotation check
was recomputed here. It does not prove who created it and does not confirm compliance of any system."

## Data source and licence

The corpus is built from EUR-Lex/CELLAR: Regulation (EU) 2024/1689, consolidated version 02024R1689-20260727. Reuse of the
legal texts follows Commission Decision 2011/833/EU with attribution to the source (c) European Union, eur-lex.europa.eu.
Only the Official Journal is authentic; the consolidated version is not. The code is licensed under Apache-2.0. This project
is not legal advice.

## Licences (separate)

- Code: Apache-2.0 (`LICENSE`).
- Legal texts: (c) European Union, eur-lex.europa.eu (reuse under Decision 2011/833/EU).
  Only the Official Journal is authentic; the consolidated version is not.
- Own data (node IDs, hashes, diffs, measurements): CC BY 4.0.

See `NOTICE`.
