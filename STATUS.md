# STATUS (Stand 2026-10-05 03:30, Session 4)

## Phase
**Phase 0 → Approach A (48-Stunden-Beweis). Tag 1 und Tag 2 abgeschlossen und auf `main` (23c6fe2, e03932a), zwei Kalendertage vor Plan. Tag 3 ohne Vertrag.** Design-Doc APPROVED (D13), Go erteilt (05.10. 01:10), ADR-011/012 umgesetzt. Fable-Wochenanteil ≥ 87 % (Reset Mo 18:59).

## Ergebnis Session 4 (Stand 03:30)
- **Tag 1:** Parser EN/DE beider Fassungen, ID-Schema v1 (ADR-012), Diff, H3 (F67, F68). **Tag 2:** `aiact_get_provision`, `aiact_diff`, `aiact_verify_citation` (V0 Pinpoint + harte Tokens, V1 Fristentabelle, V2 Sprache) als MCP-stdio-Server, Ref-Parser EN/DE, 270 Tests, Gate grün (F70). Beide Tage je zwei Opus-Reviews, Blocker/Major behoben vor Merge.
- **Kennzahlen:** H3 operativ EN 0,987 / DE 0,986, EN/DE-Parität 1,0; Fristentabelle 7 Regeln 2026 (F69), Erwägungsgründe gegen Amtsblatt mit Warnung (F66).
- **Offen für Tag 3+ (Review-Minor):** Art. 105–108 Binnenstruktur (M5), darstellungsbedingte `changed`, "geändert verschoben", Art. 111 in Fristentabelle, `removed` gegen `32026R1744` erklären.
- Aufwand gesamt: Builder 5 Läufe (≈ 560k Tokens, ≈ 40 min), Reviewer 4 Läufe (≈ 310k), Fable ≈ 30 Züge. Zwei Golden-Fehler und ein Gate-Fehler lagen bei Fable, nicht bei den Workern.

## Blocker
- **Tag 3 braucht Altan:** Ed25519-Schlüssel in der macOS-Keychain erzeugen und Manifest signieren; Repo öffentlich + GitHub Pages (irreversibel, Gate G4-nah); Fallset labeln (Altan + LLM-Zweitbewerter). Fable kann vorher Record-Format, Manifest-Erzeugung und Verify-Seite lokal bauen lassen.
- Juristischer Partner fehlt (nicht blockierend für A).

## Nächste Schritte
0. **Vertrag Tag 3a** (Fable, ohne Altan machbar): Korpus-Manifest (Hashes, Release-ID, unsigniert + Signatur-Schnittstelle), Record-Format und `aiact_evidence_record`-Funktion, Verify-Seite als statische Seite mit clientseitiger V0/V1-Neuberechnung (Browser-Bundle), lokaler Test. Dann Builder, Reviewer, Merge.
1. **Tag 3b mit Altan:** Schlüssel, Signatur, Repo öffentlich, Pages live, Muster-Record, Fallset-Labeling und Hash-Freeze von `eval/cases.yaml`.
2. CP1/CP2 Di 06.10. nach dem Reset: Gates selbst laufen lassen, zwei Hook-Verstöße provozieren, `/usage` notieren.
3. Tag 4 Eval als Skript mit hartem Kostenlimit (API-Keys nötig); Tag 5 Puffer (M5 u. a.); Tag 6 Abschluss. **E1 Mo 19.10.** (ADR-010).

## Offene Fragen an Altan
1. **Einspruch gegen ADR-012?** (H3-Nenner, ID-Schema; gemergt, rückholbar.) 2. API-Keys für drei Flaggschiff-Modelle bis Tag 4 (≤ 30 €). 3. Tag 3b: Schlüssel, Repo öffentlich, Labeling (siehe Blocker). 4. Juristischer Reviewer (nicht blockierend). LinkedIn-Post optional (ADR-009).

## Laufende Agenten
keine
