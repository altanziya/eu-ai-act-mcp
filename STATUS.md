# STATUS (Stand 2026-10-05, Session 4, Opus 5.5)

## Phase
**Phase 0 → Approach A. Tag 1–3 abgeschlossen, Repo öffentlich unter `altanziya`, Verify-Seite live und signiert. Tag 4a/4b (Eval-Harness) gemergt (bc0f5fb, lokal, Push durch Altan). Bezahlter Lauf erst nach Altans Freigabe.**

## Ergebnis
- Tag 1–3: Korpus 2024/2026 EN/DE, Diff, drei MCP-Tools (V0–V2), Release, Ed25519-Signatur (Key `71fa6df7215bb8b9`), Evidence Record, Verify-Seite (F67–F71). Kostenprobe OpenRouter (F72).
- Portfolio-Polish gemergt (f8d190c): CI, Startseite, englische Verify-Seite, `conditional_dates`, Beispiel-Record Art. 9(2), README neu.
- Tag 4a/4b: Harness mit drei Armen und hartem Kostendeckel, Scorer v2 (Fassung nur beschreibend), eine E1-Zeile, Ausschlüsse + Sensitivität; 462 Tests, Gate grün, Rauchtest 0,16 $ (F73).
- Messvorbereitung in `work/eval/` (gitignored): 40 Fälle `cases.v2.yaml` (lädt), Zweitbewertung 40/40, `stichprobe.md` (10 riskante Fälle mit EUR-Lex-Links), `PREREG.draft.md` mit Varianten A–D.

## Blocker
- Juristischer Partner fehlt (nicht blockierend).

## Nächste Schritte
0. Altan: `git push origin main` (Hook erlaubt nur Altan).
1. Altan: Stichprobe `work/eval/stichprobe.md` prüfen (≈ 20 min), Budgetvariante wählen.
2. Danach Opus/Fable: `eval/cases.yaml` und `eval/PREREG.md` einfrieren (Hash in `plan/frozen.sha256`), Lauf mit `--primary-model` nur nach Startfreigabe.
3. Altan entscheidet Frage 1 (Interna); dann Umsetzung.
4. CP1/CP2; Tag 5 Puffer (Minor-Liste im Log); E1 Mo 19.10.

## Offene Fragen an Altan
1. **Interna im öffentlichen Repo** (STATUS, FACTS mit internen Hypothesen, Logs, SPEC, CLAUDE.md, .claude/): (a) in `process/` bündeln und entschärfen, (b) aus dem öffentlichen Repo nehmen (privates Arbeitsrepo + öffentliche Produktfassung, History-Rewrite durch Altan), (c) lassen.
2. **Budgetvariante** (PREREG-Entwurf): A Fable 3 Wdh. ≈ 88 $, B Opus 3 Wdh. ≈ 37 $, C Opus 1 Wdh. ≈ 14 $ (Empfehlung), D ohne tools ≈ 9 $. Guthaben ≈ 8,9 $, für C nachladen.
3. Einspruch ADR-012? 4. Juristischer Reviewer.

## Laufende Agenten
- keine.
