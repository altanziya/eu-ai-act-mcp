# STATUS (Stand 2026-10-05, Session 4, Übergabe an Fable)

## Phase
**Phase 0 → Approach A (48-Stunden-Beweis). Tag 1, 2 und 3a abgeschlossen und auf `main` (0fe4c4b, e84f3d4, 575cd49), zwei Kalendertage vor Plan. Tag 3b abgeschlossen: Repo öffentlich, Verify-Seite live und signiert.** Design-Doc APPROVED (D13), Go erteilt (05.10. 01:10), ADR-011/012 umgesetzt. Fable-Wochenanteil ≥ 87 % (Reset Mo 18:59).

## Ergebnis Session 4 (Stand 04:15)
- **Tag 1:** Parser EN/DE beider Fassungen, ID-Schema v1 (ADR-012), Diff, H3 (F67, F68). **Tag 2:** drei MCP-Tools (V0 Pinpoint, V1 Fristen, V2 Sprache) als stdio-Server, Ref-Parser EN/DE (F70). **Tag 3a:** Release `aiact-corpus-2026-10-05` mit deterministischem Manifest, Ed25519-Signatur-Schnittstelle (noble, Interop mit node:crypto), Evidence Record mit `record_hash` (Python-Gegenrechnung identisch), isomorpher Verify-Kern, statische Verify-Seite (Bundle 44,9 KB); 337 Tests (F71). Jeder Tag zwei Opus-Reviews, Blocker/Major vor Merge behoben.
- **Kennzahlen:** H3 operativ EN 0,987 / DE 0,986, EN/DE-Parität 1,0; Fristentabelle 7 Regeln 2026 (F69); Erwägungsgründe gegen Amtsblatt mit Warnung (F66). Verify-Seite headless geprüft: unsigniert → "Nicht alle Prüfungen bestanden", Manipulation und Fehlerpfade mit lesbarer Meldung.
- **Offen für Tag 5 (Review-Minor):** Art. 105–108 Binnenstruktur (M5), darstellungsbedingte `changed`, "geändert verschoben", Art. 111 in Fristentabelle, `removed` gegen `32026R1744` erklären; Verify-Seite: Zeile "Neuberechnung stimmt überein" kann ✓ zeigen bei roter Vergleichszeile (Gesamturteil korrekt), Platzhalter "Release X" ohne Record.
- Aufwand gesamt: Builder 7 Läufe (≈ 780k Tokens), Reviewer 6 Läufe (≈ 400k), Fable ≈ 45 Züge. Fehler lagen bei Golden/Gate (Fable), nicht bei den Workern.

## Blocker
- Juristischer Partner fehlt (nicht blockierend für A).

## Nächste Schritte
0. **Tag 4 (Fable nach Reset):** mit Altan Modellwahl und Budget festlegen (Kostenprobe F72, OpenRouter-Key in Keychain `openrouter`, Limit 10 $, 9,05 $ übrig). Empfehlung: Flaggschiffe ohne/mit Tool, Websuche nur Gemini/GPT; `max_tokens` ≈ 2500; Frage `gpt-5.6-terra` vs. `gpt-6*`. Dann Vertrag Tag 4, `eval/PREREG.md`, Eval-Skript mit hartem Limit, 40 Fälle + Altans Stichprobe (10), Freeze, Lauf, Ergebnis ins README.
1. CP1/CP2: Gates selbst laufen lassen, zwei Hook-Verstöße provozieren, `/usage` notieren. FACTS beim nächsten Eintrag nach Thema splitten.
2. Tag 5 Puffer (Minor-Liste oben); Tag 6 Abschluss. **E1 Mo 19.10.** (ADR-010).

## Offene Fragen an Altan
1. **Einspruch gegen ADR-012?** 2. Budget Tag 4: 10 $ nachladen für Flaggschiffe + Websuche, oder ohne Websuche-Arm? 3. Juristischer Reviewer (nicht blockierend). LinkedIn-Post optional (ADR-009).

## Laufende Agenten
- keine. Push auf `main` nur durch Altan (`! git push origin main`, Hook).
