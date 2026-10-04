---
id: ADR-004
title: "Dreischichtiges Dokusystem (erste Fassung)"
status: revidiert durch ADR-007
date: 2026-10-03
deciders: Altan/Fable
superseded_by: ADR-007
---
# ADR-004: Dreischichtiges Dokusystem (erste Fassung)

## Kontext
Spätere Sessions sollen Entscheidungen, Nachweise und Rechercheergebnisse nachvollziehen können, ohne Recherche zu wiederholen und ohne das Kontextfenster zu sprengen.

## Optionen
1. Eine große Doku-Datei. Contra: sprengt Kontext, keine Trennung von Fakt und Hypothese.
2. Dreischichtig: Einstieg (`CLAUDE.md`), Kompaktschicht (`STATUS.md`, `FACTS.md`, `decisions/README.md`, `research/README.md`), Vollschicht (ADRs, Berichte, Logs) mit harten Limits und Quellen-IDs.
3. Externes Memory-Tool (gbrain, Mem0 o. ä.). Offen bis Bericht 08.

## Entscheidung
Option 2 jetzt, Option 3 wird nach Bericht 08 bewertet.

## Nachweis
Anforderung Altan 2026-10-03; Prüfung gegen Best Practices steht aus (Bericht 08).

## Begründung
Progressive Offenlegung: Session liest 4 kurze Dateien (≈ 6–8k Tokens) und lädt Details nur bei Bedarf. F-/H-IDs machen jede Behauptung rückverfolgbar und trennen Belegtes von Vermutetem.

## Konsequenzen
Pflegeregeln in `CLAUDE.md`. Jede Session endet mit Update von `STATUS.md` und `log/`.

## Revisit-Trigger
Bericht 08 liefert ein belegt besseres Muster, oder die Kompaktschicht wächst über 10k Tokens.
