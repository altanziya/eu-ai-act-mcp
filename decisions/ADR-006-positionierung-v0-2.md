---
id: ADR-006
title: "Positionierung v0.2: verifizierbarer Rechtsgraph (Volltext + as_of + G0–G4 + Evals), Vendor-Tier erst nach Interviews"
status: vorgeschlagen (Altan entscheidet in Gate G1)
date: 2026-10-03
deciders: Fable (Vorschlag), Altan (Entscheidung)
supersedes: ADR-002
---
# ADR-006: Positionierung v0.2

## Kontext
Sechs geprüfte Berichte (01–06) zeigen: Rechtstext-Zugang ist Commodity (F15), ≥17 AI-Act-MCPs existieren (F43), AI Act Radar liefert Feed/Webhook/REST/MCP ab 500 €/Mo (F42), Legalithm Drift-Check und Action (F40), Lexbeam Claim-Matrix (F39). Niemand weist Umsatz aus (F45). Lücke: konsolidierter Volltext mit `as_of`/Diff, Soft Law mit Seitenreferenz, DE-Recht, mehrstufige Verifikation, öffentliche Evals (Bericht 03 §Implikationen, Bericht 05 §Referenzarchitektur).

## Optionen
1. Weiter als "Rechtsdaten-Layer" (ADR-002). Contra: Begriff besetzt, keine Differenzierung.
2. **Verifizierbarer Rechtsgraph:** Kern = `aiact_verify_citation` (G0–G4) + temporaler Volltext-Graph + Nachweis-Export; Feed/Vendor erst nach Nachfrage-Gate. Pro: trifft belegte Lücke und echte Schmerzen (Nachweis, Rolle, Art. 50; Bericht 06). Contra: Nachfrage unbewiesen.
3. Nur Portfolio: Open-Source-Release ohne Monetarisierungspfad. Pro: sicher. Contra: verschenkt Option.

## Entscheidung (Vorschlag)
Option 2 mit Option 3 als garantiertem Mindestergebnis. Gates G1–G5 nach SPEC v0.2 §10.

## Nachweis
F15, F22, F27, F30–F36, F38–F48; SPEC v0.2 §2–§3; Review-Log 01–06 (11 Stichproben bestätigt).

## Begründung
Verifikation ist der einzige Hebel, den Marktführer gerade verkaufen (Verify-Funktionen, F15) und den kein AI-Act-Tool in Stufen liefert. Volltext mit Stichtag ist technisch belegt machbar (F38). Portfolio-Wert entsteht in Phase 1 unabhängig vom Einkommen (F10).

## Konsequenzen
SPEC v0.2 gilt als Arbeitsgrundlage. Vendor-Tier nicht bauen vor 5–10 Interviews. Kill-Kriterien nach 8 Wochen Landingpage.

## Revisit-Trigger
Interviews zeigen keine Zahlungsbereitschaft; oder Wettbewerber liefert alle fünf Lückenmerkmale; oder Kommission veröffentlicht API mit Versionierung und Soft Law.
