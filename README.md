# eu-ai-act-mcp

Deterministic provision tree, diff and measurements for Regulation (EU) 2024/1689 (AI Act),
Official Journal version (`32024R1689`) and consolidated version after the Omnibus
(`02024R1689-20260727`), EN and DE.

## Commands

    npm run fetch   # download raw XHTML from CELLAR into data/raw (cached)
    npm run parse   # data/raw -> data/corpus/<celex>.<lang>.json + data/diff/<lang>.json
    npm run h3      # data/h3.json
    npm test

## Licences (separate)

- Code: Apache-2.0 (`LICENSE`).
- Legal texts: (c) European Union, eur-lex.europa.eu (reuse under Decision 2011/833/EU).
  Only the Official Journal is authentic; the consolidated version is not.
- Own data (node IDs, hashes, diffs, measurements): CC BY 4.0.

See `NOTICE`.
