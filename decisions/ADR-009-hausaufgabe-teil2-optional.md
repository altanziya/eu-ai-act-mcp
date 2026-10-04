---
id: ADR-009
title: "Hausaufgabe Teil 2 (drei Beobachtungsgespräche) optional statt Pflicht, nachdem Teil 1 das Kriterium F widerlegt hat; kein Arbeitgeber-/Berufsnetzwerk"
status: entschieden
date: 2026-10-03
deciders: Altan (D15), Vorschlag Fable
---
# ADR-009: Hausaufgabe Teil 2 optional

## Kontext
Teil 1 der Hausaufgabe lief maschinell (F56): 9 öffentliche Fragebögen, 701 Fragen, 0 per Zitat beantwortbar, 6,6 % per Klassifikation + Beleg. Kriterium F der Prämisse 5 ist damit widerlegt. Die drei Gespräche entscheiden laut Wahrheitstabelle nur noch zwischen "gemischt" und "widerlegt" (Unterschied: Teilen-Feature in C). Altan nutzt Arbeitgeber- und berufliches Netzwerk nicht (Memory `no-employer-network`) und will Hausaufgaben minimieren (D14).

## Optionen
A) Optional: Gespräche nur, wenn sich bis 16.10. ohne Aufwand drei Personen über einen LinkedIn-Post finden; sonst Verständnistest mit ersten Benchmark-Lesern nach dem C-Erstlauf. B) Pflicht lassen. C) Streichen.

## Entscheidung
A.

## Nachweis
F56; Design-Doc §E1 Wahrheitstabelle; D14, D15.

## Begründung
Informationswert gesunken, Rekrutierungsaufwand ohne Netzwerk gestiegen; der Verständnistest bleibt erhalten, nur später und billiger.

## Konsequenzen
E1-Bedingung "Hausaufgabe" bezieht sich nur noch auf Teil 1 (erledigt). Prämisse-5-Ergebnis: "F widerlegt, P offen"; Distribution von C nur über Veröffentlichung; "Klassifikation im Record" verliert Priorität. E1-Entscheidung wird ADR-010.

## Revisit-Trigger
Drei Personen melden sich auf den Post; oder ein AI-Act-nativer Einkäufer-Fragebogen mit vielen Rechtsfragen taucht auf (würde F56 relativieren).
