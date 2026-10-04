---
id: ADR-002
title: "Positionierung als Rechtsdaten-Layer statt KMU-Compliance-Tool"
status: vorläufig, präzisiert durch ADR-006
date: 2026-10-03
deciders: Fable
---
# ADR-002: Positionierung als Rechtsdaten-Layer statt KMU-Compliance-Tool

## Kontext
Vorrecherche am 2026-10-03 zeigte: vier AI-Act-MCP-Server existieren (F8), der KMU-Self-Assessment-Markt ist voll und teils kostenlos (F9, später widerlegt und ersetzt durch F40/F42/F45), die Kommission bietet Explorer und Compliance Checker ohne API (F6). Ein weiteres "Klassifiziere mein System"-Tool hätte keine Differenzierung.

## Optionen
1. KMU-Compliance-Tool (Fragebogen, Report). Contra: Legalithm kostenlos bis 2028, Dutzende Anbieter.
2. Rechtsdaten-Layer: versionierter Korpus + Regel-Engine + Change-Pipeline, als MCP/API/Dataset für Entwickler, Tool-Hersteller, Forschung. Pro: keiner der Wettbewerber hat Provenienz, Versionierung, Soft Law, nationales Recht; Workflow-Tools haben kaum APIs. Contra: B2B-Vertrieb nötig für Vendor-Tier.
3. Reines Open-Source-Portfolio ohne Monetarisierung.

## Entscheidung
Option 2, mit Option 3 als garantiertem Mindestergebnis.

## Nachweis
F6, F8, F9 (**Korrektur:** F9 widerlegt, ersetzt durch F40/F42/F45, siehe Nachtrag); Bericht 01 §Executive Summary Punkte 1, 2, 6, 10 (Zugang ist Commodity, bezahlt wird für Vertrauen/Prüfbarkeit; RegAlytics als Vorbild für "Regulierung als Datenprodukt").

## Begründung
Bericht 01 stützt die Richtung, verschiebt aber den Kern: Der Moat liegt weniger im Korpus als in **Verifikation** (Citator-Funktion: Zitat byte-genau gegen Fassung prüfen, Änderungsstatus melden). Das wird in SPEC v0.2 aufgenommen.

## Konsequenzen
Produktkern = Verifikation + Versionierung + Change-Feed. Oberflächen austauschbar. Vendor-Tier braucht Validierung (Bericht 06).

## Revisit-Trigger
Bericht 06/07 zeigt keine Entwickler- oder Vendor-Nachfrage; oder ein Wettbewerber liefert Versionierung + Verifikation vor unserem Launch.

## Nachtrag 2026-10-03 (nach Berichten 03 und 06)
Die Grundrichtung hält, die Formulierung "Rechtsdaten-Layer" allein ist aber **nicht mehr differenzierend**: AI Act Radar, AI Law Radar, Legalithm und Ansvar liefern bereits Feeds, MCP, REST und teils Drift-Checks (F39–F42). Niemand weist Umsatz aus (F45), Nachfrage ist unbelegt (F44, H1 schwach).
Verbleibende Lücke, die keiner besetzt: **konsolidierter Volltext mit `as_of` und Diff, Soft Law mit Seitenreferenz, nationales Recht, mehrstufige Zitatverifikation (G0–G4) und öffentliche, versionierte Evals.** Das wird der Kern von SPEC v0.2.
Zusätzliches Gate: Vor Phase 2 (Change-Feed, Vendor-Tier) 5–10 Hersteller-Interviews und Wartelisten-Landingpage. Portfolio-Wert ist unabhängig davon gesichert (ADR-001). Finale Entscheidung als ADR-006 mit SPEC v0.2.
