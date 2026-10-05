# STATUS (Stand 2026-10-05, Session 4, Opus 5.5)

## Phase
**Phase 0 → Approach A. Tag 1–3 abgeschlossen, Repo öffentlich, Verify-Seite live und signiert. Portfolio-Polish gemergt (f8d190c). Tag 4a (Eval-Vorbereitung) vertraglich eingefroren, Lauf erst nach Altans Freigabe.**

## Ergebnis
- Tag 1–3: Korpus 2024/2026 EN/DE, Diff, drei MCP-Tools (V0–V2), Release, Ed25519-Signatur (Key `71fa6df7215bb8b9`), Evidence Record, Verify-Seite (F67–F71). Kostenprobe OpenRouter (F72).
- Portfolio-Audit (Opus, 4 Perspektiven): Code und Tests stark; Schwächen Wurzelordner mit deutschen Interna, fehlende Test-CI, Zahlen im README. Umgesetzt: CI, Startseite, englische Verify-Seite, `conditional_dates`, neuer Beispiel-Record (Art. 9(2)), README mit Beispielen; 358 Tests.
- Tag 4a: Vertrag `plan/day-4.md`, Gate, Golden auf `feat/day-4-eval-prep` (2af32d8). Fallset-Entwurf läuft (`work/eval/`, nicht im Repo).

## Blocker
- Juristischer Partner fehlt (nicht blockierend).

## Nächste Schritte
0. Altan: `git push origin main` (Hook erlaubt nur Altan).
1. Altan entscheidet Frage 1 (Interna); dann Umsetzung.
2. Fallset-Entwurf prüfen (Opus/Fable), Zweitbewertung, Altans Stichprobe (10 Fälle), Freeze `eval/cases.yaml`, `eval/PREREG.md` mit Modellwahl.
3. Builder Tag 4a (Harness, Trockenlauf, Rauchtest ≤ 0,30 $) auf `feat/day-4-eval-prep`; danach Lauf nur mit Altans Freigabe.
4. CP1/CP2; Tag 5 Puffer (Minor-Liste im Log); E1 Mo 19.10.

## Offene Fragen an Altan
1. **Interna im öffentlichen Repo** (STATUS, FACTS mit H11 "erster Kunde ist Arbeitgeber", Logs mit Chatverlauf, SPEC mit Launchplan, CLAUDE.md, .claude/): (a) in `process/` bündeln und entschärfen, (b) aus dem öffentlichen Repo nehmen (privates Arbeitsrepo + öffentliche Produktfassung, History-Rewrite durch Altan), (c) lassen.
2. Budget für den Lauf (9,05 $ übrig; Vollprotokoll eher 15–25 $). 3. Einspruch ADR-012? 4. Juristischer Reviewer.

## Laufende Agenten
- `researcher` (Sonnet): Fallset-Entwurf (40 Fälle aus dem Amtsblatt) und Modellrecherche nach `work/eval/`.
