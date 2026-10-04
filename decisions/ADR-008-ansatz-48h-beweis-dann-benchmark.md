---
id: ADR-008
title: "Ansatz: 48-Stunden-Beweis (A), danach öffentlicher Fassungs-Benchmark (C) mit SPEC-Kern darunter; Portfolio zuerst"
status: entschieden
date: 2026-10-03
deciders: Altan (gstack /office-hours, Entscheidungen D2–D11)
supersedes: ADR-006
---
# ADR-008: 48-Stunden-Beweis, dann Benchmark

## Kontext
YC-Office-Hours-Diagnose (gstack) am 2026-10-03. Altans Antworten: keine Nachfrage-Evidenz ("Noch niemand"), Status quo "gratis und ungeprüft", kein konkreter Mensch und kein Kanal ("Niemand, kein Kanal"). Zweitmeinung (Sonnet, kalt): einziges erzeugbares Nachfrage-Datum ist eine Messung, wie oft Frontier-Modelle die falsche Fassung zitieren; Prämisse "Evidence Record als Vertriebskanal" angegriffen. Design-Doc: `docs/designs/ai-act-verifier-benchmark.md`.

## Optionen
A) 48-Stunden-Beweis: Parser EN/DE, `as_of`+Diff, verify G0–G2, signierter Record, 40-Fall-Eval gegen Modelle ohne/mit Tool. S, Low.
B) SPEC v0.2 Phase 1 komplett (6–8 Wochen). L, Med; sechs Wochen ohne externes Signal.
C) Benchmark zuerst: öffentlicher monatlicher AI-Act-Fassungs-Benchmark, Verifier als Bewertungs-Engine, Record je Fall, Rangliste als Distribution. M, Med.

## Entscheidung
A jetzt, danach C als Form von Phase 1; Bs Kern wächst darunter in der Reihenfolge der revidierten Prämisse 4 (zuerst, was keiner hat; Table Stakes danach, wenn sie Nutzung verbessern). Gate G2 nach A: Modelle < 95 % richtig bei Fassungs-/Fristenfragen und H3 positiv → C; sonst Pivot oder Wartungsmodus.

## Nachweis
D3–D11 (Design-Doc §Demand Evidence, §Premises, §Cross-Model Perspective); F15, F22, F30, F36, F38, F39–F45, F54; Eureka-Log gstack 2026-10-03.

## Begründung
A entscheidet die Verifikationsthese in zwei Tagen statt sechs Wochen und ist erster Schritt von B und C zugleich. C erzeugt Publikum ohne Vertriebskanal und ist das stärkste Interview-Artefakt für FDE-/Governance-Rollen (Prämisse 2: erster zahlender Kunde ist ein Arbeitgeber).

## Konsequenzen
- SPEC v0.2 bleibt Zielbild; Roadmap §11 wird ersetzt durch A → G2 → C → B-Kern. Stack für A: TypeScript, MCP-SDK stdio, JSON/SQLite, GitHub Pages; Workers/Supabase erst ab C.
- Prämisse 4 revidiert (Table Stakes erlaubt), Prämisse 5 geschwächt (H9) mit zwei Tests; Record umschließt Klassifikation.
- Pflicht-Hausaufgabe binnen 7 Tagen: 5 Fragebögen klassifizieren, 3 Personen Muster-Record zeigen.
- ADR-006 (Positionierung v0.2) ist damit entschieden und präzisiert: Verifikation bleibt Kern, Vendor-Tier entfällt bis zu Nachfrage-Evidenz.

## Revisit-Trigger
Eval-Ergebnis an G2; Ergebnis der Prämisse-5-Tests; ein Name mit Zahlungsverhalten; ein Wettbewerber veröffentlicht Volltext + `as_of` + Verifikation.
