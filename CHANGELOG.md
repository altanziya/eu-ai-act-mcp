# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-08

### Added

- Corpus of the AI Act (Regulation (EU) 2024/1689) in English and German: the Official Journal version (2024) and the
  consolidated version after the Digital Omnibus on AI (Regulation (EU) 2026/1744, 2026), parsed into a provision tree.
- Provision IDs (ID scheme v1) that follow the legal way of citing and are identical in both languages, and a diff of the
  2024 and 2026 versions by ID and node hash.
- Six read-only MCP tools over stdio, with no network calls: `aiact_get_provision`, `aiact_diff`,
  `aiact_verify_citation`, `aiact_search`, `aiact_audit_text` and `aiact_obligations`.
- Citation verification on three separate levels: wording (V0), applicability on a date from a deadline table written
  from Article 113 (V1) and language (V2).
- Signed corpus releases (manifest with an Ed25519 signature) and hash-sealed evidence records that tie a check to a
  release.
- Verify page that recomputes an evidence record in the browser and checks the signature of the corpus release.
- Obligations navigator: obligations for an organisation and AI system profile on a date, with provision, verbatim
  quote, date, days left and open questions.
- Document checker: finds outdated deadlines, moved or unknown provisions and quotations that do not match the text,
  with English and German citation styles.
- Full-text search over the version in force on a date (English and German).
- Pre-registered evaluation of three frontier models with and without these tools, with cases, raw answers and
  limitations under `eval/results/`.
