---
id: ADR-003
title: "Arbeitsmodell: Fable orchestriert, Sonnet/Haiku arbeiten, Review vor Übernahme"
status: entschieden
date: 2026-10-03
deciders: Altan
---
# ADR-003: Arbeitsmodell: Fable orchestriert, Sonnet/Haiku arbeiten, Review vor Übernahme

## Kontext
Erste Recherche-Agenten liefen auf Fable (geerbtes Modell). Altan verlangte Tokeneffizienz, zugleich höchste Recherchequalität und kritische Prüfung aller Ergebnisse.

## Optionen
1. Alles in der Hauptsession (Fable). Contra: teuer, Kontext füllt sich mit Rohdaten.
2. Subagenten auf Fable. Contra: Kosten vervielfacht.
3. Subagenten auf Sonnet/Haiku, Fable prüft und entscheidet. Pro: günstig, Kontext bleibt sauber. Contra: Qualitätsrisiko bei schwacher Recherche, daher Review-Pflicht.

## Entscheidung
Option 3. Sechs laufende Fable-Agenten wurden gestoppt und auf Sonnet neu gestartet.

## Nachweis
Altans Anweisungen vom 2026-10-03 (Memory `subagent-model-preference`, `orchestrator-role`).

## Begründung
Fables Kapazität gehört in Urteil und Qualitätssicherung. Qualität vor Tokensparen: Review-Protokoll (`research/00-review-log.md`) fängt schwache Berichte ab.

## Konsequenzen
Jeder Agent-Aufruf mit explizitem `model`. Jeder Bericht wird geprüft, Status im Review-Log. Schwere Tool-Läufe (z. B. last30days) ebenfalls delegiert.

## Revisit-Trigger
Wiederholt mangelhafte Sonnet-Berichte in einem Themenfeld, dann dort Opus einsetzen.
