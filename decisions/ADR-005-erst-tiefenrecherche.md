---
id: ADR-005
title: "SPEC v0.1 nicht umsetzen, erst Tiefenrecherche (8 Berichte)"
status: entschieden
date: 2026-10-03
deciders: Altan
---
# ADR-005: SPEC v0.1 nicht umsetzen, erst Tiefenrecherche (8 Berichte)

## Kontext
Fable legte nach ca. 15 Websuchen SPEC v0.1 vor. Altan wollte den ersten Entwurf nicht als Ideal übernehmen, sondern End-to-End durchdenken: globale Märkte, außereuropäische Wettbewerber, Moat, Anpassungsfähigkeit bei Markt-/Technologiewandel.

## Optionen
1. Direkt bauen, unterwegs lernen. Pro: schnell. Contra: Positionierung auf dünner Evidenz.
2. Acht parallele Recherche-Stränge (Sonnet), Prüfung durch Fable, dann SPEC v0.2. Pro: belastbare Basis, dokumentiert. Contra: ca. 1 Tag Verzögerung, Websuche-Budget.

## Entscheidung
Option 2. Stränge: 01 globaler Legal-Data-Markt, 02 Non-EU-Regulierung, 03 EU-Wettbewerber/Ökosystem, 04 MCP-Distribution/Monetarisierung, 05 Technik vertrauenswürdiger Rechts-KI, 06 Nachfragesignale, 07 last30days Community-Stimmen, 08 Doku-Best-Practices.

## Nachweis
Altans Anweisung 2026-10-03; Agent-Prompts in `log/2026-10-03.md` referenziert.

## Begründung
Der Rechtsmarkt ist ein Vertrauensmarkt; falsche Positionierung kostet Monate. Recherche ist mit Sonnet günstig.

## Konsequenzen
SPEC v0.2 erst nach Freigabe der Berichte. Bekannte Einschränkung: Websuche-Budget der Session (200) war nach Strang 01 erschöpft, spätere Stränge arbeiten mit WebFetch/gh; Lücken werden in `research/README.md` benannt und in einer Folgesession geschlossen.

## Revisit-Trigger
Keiner; Prozessentscheidung.
