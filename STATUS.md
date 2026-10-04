# STATUS (Stand 2026-10-05, Session 2)

## Phase
**Phase 0 → Approach A (48-Stunden-Beweis), Build noch nicht gestartet.** Design-Doc APPROVED (D13). Altan fragt nach Vorgehen und autonomem A-bis-Z-Build; Fable hat dafür Berichte 10 (Community-Praxis 30 Tage) und 11 (offizielle Doku) einholen lassen, geprüft und freigegeben. **Go erteilt (05.10. 01:10): Commits erlaubt, Max 5x.** `/usage`: Woche alle Modelle 65 %, Fable 87 %, Reset Mo 18:59. ADR-011 geschrieben, Setup läuft (Sonnet-Agent), Tagesvertrag `plan/day-1.md` steht.

## Ergebnis Session 2 (bis jetzt)
- Berichte 10 und 11 freigegeben, F57–F65 eingetragen (Fable-50-%-Regel, Subagent-Modellzwang, Explore auf Opus, Hook-Caps, Env-Variablen, Community-Fehlerbilder).
- Claude Code lokal 2.1.289: alle Mindestversionen für `omitClaudeMd`, `maxTurns`, `SUBAGENT_MODEL_FORCE`, Explore-Override erfüllt.
- Prozesslehre: last30days-Agent lief 63 min (3 Läufe + 50 min Primärquellen). Fable setzte eine Frist, Altan widersprach: keine harten Zeitlimits für Recherche, Sichtbarkeit (Fortschrittsdatei) statt Deadline. Frist zurückgenommen, Bericht vollständig.

## Blocker
- **Git-Commit-Freigabe** (Frage 4) fehlt; ohne Commits kein Rückspulpunkt und keine Worktrees.
- Juristischer Partner fehlt (nicht blockierend für A).

## Nächste Schritte
0. **Läuft:** Build-Setup nach ADR-011 umsetzen: Agenten `builder` (Sonnet, ohne Agent-Tool, maxTurns), `scout` (Haiku), `reviewer` (Opus medium, kein Edit), `Explore` (Haiku); Hooks: Spawn-Whitelist, Freeze-Schutz für `eval/`, PreCompact-Handoff, SessionStart `compact`; env `MAX_CONCURRENT_SUBAGENTS=3`, `SPAWN_DEPTH=1`; CLAUDE.md-Abschnitt "Compact instructions"; `plan/day-N.md` + `plan/progress.json`; Tages-Branch, Commit je Schritt. Dann Tag 1 (Parser).
1. Tag 1 Parser EN/DE + Diff + H3 (Sonnet baut, Fable schreibt Golden-Checks, Reviewer prüft); CP1 am Folgetag.
2. Tag 2 Tools V0–V2; Tag 3 Manifest, Record, Verify-Seite, Repo öffentlich, Fallset-Freeze.
3. Tag 4 Eval als Skript mit hartem Kostenlimit; Tag 5 Puffer; Tag 6 Abschluss.
4. **E1 Mo 19.10.** nach vorregistrierter Regel (ADR-010).

## Offene Fragen an Altan
1. ~~Go~~ erteilt. 2. ~~Commit~~ erlaubt. 3. ~~Tier~~ 5x. 4. API-Keys für drei Flaggschiff-Modelle bis Tag 4 (≤ 30 €). 5. Juristischer Reviewer (nicht blockierend). LinkedIn-Post optional (ADR-009).

## Laufende Agenten
keine (Berichte 10 und 11 abgeschlossen)
