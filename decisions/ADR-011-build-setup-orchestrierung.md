---
id: ADR-011
title: "Build-Setup für Plan A: Fable dirigiert, drei feste Worker, Wände als Hooks, Zustand in Dateien"
status: entschieden
date: 2026-10-05
deciders: Altan (Go, Commits erlaubt, Max 5x), Fable (Ausgestaltung)
supersedes: –
---
## Kontext
Plan A (ADR-008, Design-Doc §Plan A) soll weitgehend autonom gebaut werden. Berichte 10 und 11 (F57–F65) zeigen: Fable läuft nur bis 50 % des Wochenlimits im Plan (F57) und stand am 05.10. bei 87 % des Fable-Anteils; Subagenten erben Fable, Explore läuft auf Opus (F58); Schleifen scheitern am Kontrollfluss, "grün gelogen" ist belegt, Riegel im Schreibbereich des Agenten sind keine Wand (F64). Hooks können Agent-Spawns prüfen, Compaction steuern und Subagenten am "fertig" hindern (F62, F63).

## Optionen
1. **Eine Dauersitzung Fable, Code selbst schreiben.** Pro: einfach. Contra: teuerstes Modell für Fleißarbeit, 1M-Kontext füllt sich, Fable-Limit in Stunden erschöpft (F64-Fälle).
2. **Agent Teams / Workflows / Nachtbetrieb.** Pro: Parallelität. Contra: ≈ 7x Verbrauch (F59), Arbeit ist sequenziell, Risikoprofil Schleifen/Selbstabschaltung (F64), keine Praxisberichte (Bericht 10 §1.4).
3. **Fable als Dirigent, drei feste Worker, Tagesverträge mit Gate, Wände als Hooks, Zustand in Dateien.** Pro: deckt sich mit Anthropic-Linie (F61) und Community-Konsens (F64), Budget steuerbar. Contra: Setup-Aufwand ≈ ein halber Tag, Hooks müssen getestet werden.

## Entscheidung
Option 3.
- **Rollen:** `builder` (Sonnet, effort high, ohne Agent-Tool, maxTurns 60, omitClaudeMd), `scout` (Haiku, nur lesen, maxTurns 15), `reviewer` (Opus medium, kein Edit, frischer Kontext), `Explore` projektseitig auf Haiku, `researcher` (bestehend, Sonnet). Forks aus (`CLAUDE_CODE_FORK_SUBAGENT=0`). Fable schreibt Tagesvertrag, Golden-Checks und ADRs, lässt Gates selbst laufen, schreibt keinen Produktcode, liest keine Rohdaten.
- **Hooks (Exit 2 = Wand):** PreToolUse Agent → Whitelist (Typ + Modell); PreToolUse Edit/Write/Bash → Schreibschutz für Worker auf `.claude/`, `scripts/hooks/`, `plan/`, `tests/golden/`, `eval/`, Doku; für alle: `.env*`, `--no-verify`, Force-Push; SubagentStop builder → Tagesgate, 3 Versuche, dann Bericht; Stop → docs-lint + Frozen-Hash-Prüfung; PreCompact → Handoff-Datei (nicht blockierend); SessionStart compact/resume → Tagesvertrag, progress.json, Handoff nachladen; PostToolUse Agent → Modell/Tokens je Lauf loggen.
- **Zustand:** `plan/day-N.md` (Vertrag mit Gate als Skript), `plan/progress.json` (nur Gate setzt `passes`), `plan/frozen.sha256`, STATUS write-through, Commit je Schritt auf Tages-Branch. Tagesgrenze = Neustart der Sitzung.
- **Env:** `MAX_CONCURRENT_SUBAGENTS=3`, `MAX_SUBAGENT_SPAWN_DEPTH=1`, `AUTOCOMPACT_PCT_OVERRIDE=35`, `MAX_WEB_SEARCHES_PER_SESSION=400`.
- **Budget:** `/usage` an CP1/CP2; Fable-Anteil > 25 % des Wochenlimits an CP2 → Chair ab Tag 3 auf Opus medium. Eval-Läufe (Tag 4) als Skripte mit hartem Kostenlimit, keine Agenten. Keine harten Zeitlimits für Recherche/Prüfung (Altan 05.10.), Fortschrittsdatei je Agent.
- Nicht genutzt: Agent Teams, Workflows/ultracode, Fast Mode, Routines, `/loop`, Nachtbetrieb.

## Nachweis
F57–F65; Bericht 10 §4.2–4.4; Bericht 11 §Implikationen; `/usage`-Screenshot Altan 05.10. 01:10 (Woche alle Modelle 65 %, Fable 87 %, Reset Mo 18:59 Europe/Berlin).

## Begründung
Die Arbeit ist sequenziell (eine Codebasis, Parser → Tools → Record → Eval); mehr Agenten erhöhen Verbrauch und Handoff-Verluste, nicht Tempo. Wände müssen außerhalb des Builder-Schreibbereichs liegen, sonst sind sie Prosa. Ein anderes Modell als der Chair prüft.

## Konsequenzen
Setup durch Sonnet-Agent mit Hook-Tests; Fable verifiziert Tests und Hook-Verstöße an CP1. Erster Commit (Doku) und Setup-Commit auf `main`, Tagesarbeit auf `feat/day-N-*`. Neustart der Sitzung nach Setup (Env greift beim Start).

## Revisit-Trigger
CP1: Hook-Test schlägt fehl oder Builder umgeht Wand; CP2: Fable-Anteil > 25 % der Woche; Builder-Gate dreimal in Folge an demselben Punkt gescheitert; Anthropic ändert Subagent-/Limit-Regeln (F57, F61 recheck).
