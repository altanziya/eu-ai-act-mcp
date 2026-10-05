# EU AI Act workbench

**Answers about the EU AI Act that you can check: which obligations apply to you and when, whether a document still states the law correctly, and a proof anyone can recompute.**

[![Tests](https://github.com/altanziya/eu-ai-act-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/altanziya/eu-ai-act-mcp/actions/workflows/test.yml)
[![Live demo](https://img.shields.io/badge/live-demo-2ea44f)](https://altanziya.github.io/eu-ai-act-mcp/)
![MCP](https://img.shields.io/badge/MCP-6%20tools-blue)
![License](https://img.shields.io/badge/code-Apache--2.0-lightgrey)

Every result cites the provision, quotes it word for word from the text in force on your date, and says when it applies. Where the law requires a judgement, the tools say so instead of making it. Deterministic, no language model at runtime, runs in your browser or inside your AI assistant.

---

## The problem

The AI Act (Regulation (EU) 2024/1689) was amended in July 2026 by the Digital Omnibus on AI (Regulation (EU) 2026/1744). Application dates moved, provisions were inserted, moved and removed. Policies, vendor answers, slide decks and language models still describe the 2024 version.

So *"high-risk obligations under Annex III apply from 2 August 2026"* is right for the 2024 text and wrong today: the date is 2 December 2027. In a [pre-registered evaluation](#does-it-matter-a-pre-registered-evaluation), three frontier models without tools gave the old answer on almost every question the amendment changed.

## Three workflows

### 1. Which obligations apply to us, and when? (Obligations navigator)

Describe your organisation and AI system in a few fields: role (provider, deployer, importer, …), Annex III area or Annex I product, general-purpose model, transparency cases, company size. You get the obligations that apply now and the ones coming, each with provision, verbatim quote, date and days left, plus open questions where the answer depends on facts or a legal judgement.

```jsonc
// aiact_obligations({ profile: { role: ["provider"], annex_iii_area: "4", annex_iii_art6_3_exception_concluded: false, enterprise_size: "sme" },
//                     as_of: "2026-10-05" })  ->  30 obligations, high-risk via Annex III
{ "id": "risk-management-system", "status": "upcoming", "applies_from": "2027-12-02", "days_until": 423,
  "provisions": ["Article 9"], "quote_verified": true, "changed_by_omnibus": true },
{ "id": "conformity-assessment-annex-iii-internal", "applies_from": "2027-12-02",
  "applies_from_literal": "2026-08-02",   // Art. 113 literally leaves Chapter III Section 5 at the general date
  "deadline_caveat": "Literally, the residual rule of Art. 113 second paragraph (2026-08-02) applies …" },
{ "id": "ai-literacy", "status": "applicable", "applies_from": "2025-02-02", "changed_by_omnibus": true }
```

The map behind it covers 95 obligations, reliefs and transitional rules for providers, deployers, importers, distributors and authorised representatives. All 106 quotations are checked against the corpus on every build. The classification (Article 6(1) and 6(2), the Article 6(3) exception and its profiling override, Annex I Section A vs. B, systemic-risk GPAI, open-source exemptions) is explicit, versioned data, not code.

### 2. Is this document still right? (Document checker)

Paste a policy, a vendor's answer, a slide or a chatbot answer. The checker finds references, dates and quotations and compares them with the text in force on your date.

```text
Our hiring assistant is high-risk under Annex III; the obligations apply from 2 August 2026.
Under Article 10(5) we may process special categories of personal data to detect bias.

  error  outdated deadline   "2 August 2026"  -> 2 December 2027 (changed by Regulation (EU) 2026/1744)
  error  removed provision   "Article 10(5)"  -> the text moved to Article 4a(1)
```

It knows deadlines written into provisions (Article 57(1): sandboxes "operational by 2 August 2027") as well as application dates from Article 113, recognises EN and DE citation styles, skips other acts (GDPR, Data Act, …), and checks quotations word for word. 5,000 words take well under a second.

### 3. Can I prove what the text said? (Evidence records)

One check, packed into a link: the quotation, the version, the date and the result, hash-sealed and tied to a signed corpus release. The [verify page](https://altanziya.github.io/eu-ai-act-mcp/verify/) recomputes it in the browser. No server, no account, no trust in the author required.

→ **[Open the example evidence record](https://altanziya.github.io/eu-ai-act-mcp/example/)**: a quote from Article 9(2), checked as of 1 September 2026. The wording is exact, but the provision does not apply yet.

<a href="https://altanziya.github.io/eu-ai-act-mcp/example/"><img src="docs/assets/verify-page.png" alt="Verify page: all checks passed, signature valid" width="640"></a>

## Use it

- **In the browser:** [Obligations navigator](https://altanziya.github.io/eu-ai-act-mcp/obligations/) · [Document checker](https://altanziya.github.io/eu-ai-act-mcp/audit/) · [Verify a record](https://altanziya.github.io/eu-ai-act-mcp/verify/). Your text stays in your browser; the pages check the signature of the corpus release before using it.
- **From your AI assistant (MCP):** six read-only tools, local over stdio, no network calls.

| Tool | Answers |
|---|---|
| `aiact_obligations` | Obligations for a profile on a date, with quotes, dates, caveats and open questions |
| `aiact_audit_text` | Outdated deadlines, moved or unknown provisions, wrong quotations in a text |
| `aiact_search` | Provisions by keyword in the version in force on a date (EN/DE) |
| `aiact_get_provision` | A provision in the version in force on a date, with applicability and neighbouring provisions |
| `aiact_verify_citation` | Does a quotation exist, where, in which version, and does it apply on that date |
| `aiact_diff` | What the 2026 amendment changed in a provision |

## How it works

```mermaid
flowchart LR
    A[EUR-Lex / CELLAR<br/>XHTML, EN + DE] --> B[Parser<br/>provision tree]
    B --> C[Corpus<br/>2024 + 2026]
    C --> D[Diff + deadline table<br/>Art. 113]
    C --> E[Tools: navigator · checker<br/>search · get · diff · verify]
    O[Obligations map<br/>95 entries, quotes checked] --> E
    D --> E
    C --> F[Release<br/>manifest + Ed25519]
    E --> G[Evidence record<br/>record_hash]
    F --> H[Verify page<br/>recomputes in browser]
    G --> H
```

A verification gives three separate answers, never one combined "verified":

- **V0, wording:** exact, fuzzy, found at another provision, found only in the other version or language, or not found. Numbers, dates and negations must match exactly.
- **V1, applicability:** applicable on the given date, not yet applicable until a date, superseded or inserted by the 2026 amendment. Based on a deadline table written from Article 113 of each version.
- **V2, language:** does the quote match the requested language.

## Key numbers

| | |
|---|---|
| Provisions | 1,437 operative provisions and 180 recitals (2024), 1,587 provisions (2026), per language |
| Operative provisions traceable from 2024 to 2026 | 98.7 % (EN), 98.6 % (DE) |
| EN/DE structural parity | 100 % |
| Application-date rules (2026 version) | 7, each linked to its source sentence in Art. 113 |
| Obligations map | 95 entries, 106 verbatim quotations, all checked against the corpus |
| Tests | 977, including golden tests written and frozen before implementation |
| Verify page | 52 KB, no framework, no external requests |

## Does it matter? A pre-registered evaluation

45 questions on deadlines and versions of the AI Act after the 2026 amendment, asked to three frontier models with and without this project's tools. Errors per question:

| Model | No tools | With these MCP tools |
|---|---|---|
| Claude Opus 5.5 | 24/45 | 3/30 (v1) · 2/15 (v2) |
| GPT-6 Astra | 26/45 | 2/30 (v1) · 1/15 (v2) |
| Gemini 3.1 Pro | 25/42 | 5/27 (v1) · 2/12 (v2) |

Without tools the models were right on what the amendment left unchanged and wrong on almost everything it changed. Opus with web search: 6/45. The pre-registered rule for that arm (at least 5 % errors, lower 95 % bound) is formally met, but not robustly: it depends on one case with a known answer-key erratum, which we report up front. Each run also exposed tool weaknesses that were then fixed (date-aware version selection; showing inserted provisions such as Article 99(6a) next to the one asked for); the fixes after v2 are not yet measured. Cases, pre-registrations, raw answers and limitations: [`eval/results/`](eval/results/).

## Quick start

Requires Node 20+.

```bash
git clone https://github.com/altanziya/eu-ai-act-mcp.git
cd eu-ai-act-mcp
npm ci
npm test
```

**Use it from Claude Code** (run inside the repository):

```bash
claude mcp add eu-ai-act -- "$(pwd)/node_modules/.bin/tsx" "$(pwd)/src/mcp/server.ts" --extended
```

`--extended` enables all six tools; without it the server offers the three original ones (get, diff, verify).

Then ask, for example: *"We sell an AI tool that ranks job applicants. Which AI Act obligations apply to us and when? Use the eu-ai-act tools."* or *"Check this vendor answer against the current AI Act: …"*

**Other MCP clients:** command `<repo>/node_modules/.bin/tsx`, arguments `<repo>/src/mcp/server.ts --extended`. The server runs locally over stdio and makes no network calls.

**Create your own evidence record:**

```bash
npm run record -- --quote "..." --ref "Article 9(2)" --as-of 2026-09-01 --lang en \
  --release aiact-corpus-2026-10-05
```

## Trust model

A record with a valid signature shows that the quoted passages read as stated in the signed corpus release, and that the check was recomputed on the page. It does not show who created the record, whether a legal claim is right, or that any system is compliant.

- Signing key `71fa6df7215bb8b9`, published at [`keys/index.json`](https://altanziya.github.io/eu-ai-act-mcp/keys/index.json). The private key never touches the repository or CI.
- The record hash is plain SHA-256 over canonical JSON and can be recomputed in three lines of Python ([reference](docs/reference.md#evidence-record)).
- The consolidated text from EUR-Lex is not legally authentic. Only the Official Journal is binding. **Not legal advice.**

## Known limitations

- Articles 105 to 108 (amendments to other acts) are not fully structured.
- A provision that was both moved and reworded shows as removed plus added.
- Transitional rules for systems already on the market (Art. 111) are in the obligations map, not in the deadline table.
- The obligations map covers duties of operators, not of authorities, the Commission or notified bodies, and covers sector-specific reliefs only for financial institutions.
- The document checker reads citations, dates and quotations; it does not judge legal arguments. Relative deadlines ("two years after entry into force") are not resolved.
- No lawyer has reviewed the deadline table or the obligations map yet. Two independent model reviews found and fixed errors; every entry cites its source so it can be checked.

Details in the [technical reference](docs/reference.md#known-limitations).

## Roadmap

- [x] Parser, diff and provision IDs for both versions, EN + DE
- [x] MCP tools with three-level verification
- [x] Signed releases, evidence records, browser verify page
- [x] **Evaluation:** pre-registered run with three frontier models, with and without these tools, extended to 45 cases ([results](eval/results/))
- [x] Obligations navigator, document checker and search, as MCP tools and browser pages
- [ ] Re-run the evaluation with the current tools, including the navigator and checker
- [ ] Legal review of the obligations map
- [ ] Hosted MCP endpoint
- [ ] Further acts: GDPR, Data Act, Cyber Resilience Act

## How this was built

I designed the specification, the data model, the verification levels and the trust model, and wrote the acceptance tests. Implementation was done by AI coding agents working under that control:

- **Each build step** had a written contract and a gate script. Golden tests were written and frozen before implementation; the agents could not change them.
- **Every merge** passed the gate and two independent reviews in a fresh context. The reviews found real defects, such as a silently redefined metric and an incomplete verdict on the verify page, which were fixed before merge.
- **The process is documented** in [`process/`](process/) (German): architecture decisions as ADRs, research reports with sources, verified facts, session logs and the build contracts.

## Repository layout

| Path | Content |
|---|---|
| `src/` | Parser, diff, tools (navigator, checker, search, verify), MCP server, release, record, browser pages |
| `data/` | Raw XHTML, parsed corpus, diffs, deadline table, obligations map |
| `release/` | Signed corpus releases |
| `site/` | Landing page, obligations navigator, document checker, verify page (GitHub Pages) |
| `tests/` | Unit and golden tests |
| `docs/reference.md` | Full technical reference |
| `process/` | Working notes in German: decisions (ADRs), research, facts, specification, session logs |
| `plan/` | Build contracts and gate scripts per step |

## License

- Code: Apache-2.0 ([`LICENSE`](LICENSE))
- Legal texts: © European Union, [eur-lex.europa.eu](https://eur-lex.europa.eu), reuse under Commission Decision 2011/833/EU
- Own data (IDs, hashes, diffs, measurements): CC BY 4.0

See [`NOTICE`](NOTICE).

---

Built by [Altan Kömek](https://github.com/altanziya).
