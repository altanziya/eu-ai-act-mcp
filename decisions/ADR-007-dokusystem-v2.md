---
id: ADR-007
title: "Dokusystem v2: @-Imports, generierter Index, docs-lint als Stop-Hook, Researcher-Agent, Suchprotokoll, recheck_by"
status: entschieden
date: 2026-10-03
deciders: Fable (im Auftrag Altans: nachvollziehbar, kontexteffizient, Best Practices geprüft)
supersedes: ADR-004
---
# ADR-007: Dokusystem v2

## Kontext
Altan verlangte ein nachvollziehbares, kontexteffizientes Dokusystem und eine Prüfung gegen Best Practices. Bericht 08 (freigegeben, Stichproben F50–F53 bestätigt) bestätigte die Grundrichtung von ADR-004 und fand Schwächen: Prosa-Leseanweisungen werden nicht zuverlässig befolgt (F50, F52), Subagenten erben CLAUDE.md (F51), handgepflegte Indizes driften (ADR-001/002 zitierten das widerlegte F9), kein Verfallsdatum für Rechtsstand, keine Compaction-Regel, kein Suchprotokoll.

## Optionen
1. ADR-004 unverändert. Contra: belegte Schwächen.
2. **ADR-004 plus deterministische Durchsetzung:** `@STATUS.md`/`@docs/INDEX.md` immer geladen, Index generiert, `scripts/docs-lint.py` als Stop-Hook (Limits, ID-Verweise, Front-Matter, recheck_by), Researcher-Agent mit `omitClaudeMd` und Sonnet, Suchprotokoll mit Negativbefunden, Write-through-STATUS, Compaction-Zeile.
3. Externes Memory-Tool (gbrain, Mem0). Contra: Benchmarks selbstberichtet und widersprüchlich (Bericht 08 §3); Markdown+Git ist das Substrat aller geprüften Systeme.

## Entscheidung
Option 2. Option 3 vertagt; Trigger: > 300 Fakten und grep verfehlt Treffer in Stichprobe, oder parallele Schreiber.

## Nachweis
Bericht 08 §4–§5; F50 (Vercel: Skill in 56 % nie aufgerufen, 8-KB-Index 100 %), F51 (`omitClaudeMd`, v2.1.271+), F52 (CLAUDE.md ist Kontext, keine Durchsetzung), F53 (Stop-Hook: Exit 2 blockiert mit stderr). Doku-Import-Syntax `@path` geprüft (code.claude.com/docs/en/memory).

## Begründung
Deterministische Prüfung ersetzt Hoffnung auf Regeltreue; der F9-Fund zeigt, dass der Drift sofort beginnt. Immer geladene Kompaktschicht ist laut Vercel-Daten der wirksamste Mechanismus.

## Konsequenzen
Neue Dateien: `scripts/docs-lint.py`, `.claude/settings.json` (Stop-Hook), `.claude/agents/researcher.md`, `research/_searchlog.md`, `docs/INDEX.md` (generiert). `decisions/README.md` wird Verweis. Limits: CLAUDE 120, STATUS 50, FACTS 150, ADR 70, Log 45 Zeilen. Nicht übernommen (bewusst): SPEC-Split in `spec/NN` (erst ab 500 Zeilen), Kurzzitat-Spalte in FACTS (Platz).

## Revisit-Trigger
Stop-Hook stört Sessions (Blockaden ohne Nutzen) oder FACTS überschreitet 150 Zeilen.
