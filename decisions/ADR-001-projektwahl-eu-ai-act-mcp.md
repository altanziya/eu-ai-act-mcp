---
id: ADR-001
title: "EU-AI-Act-MCP als erstes Sidehustle-Projekt, TikTok-Agent-Library geparkt"
status: entschieden
date: 2026-10-03
deciders: Altan
---
# ADR-001: EU-AI-Act-MCP als erstes Sidehustle-Projekt, TikTok-Agent-Library geparkt

## Kontext
Altan startete den Sidehustle-Ordner mit zwei Zielen: passives Einkommen und Portfolio-Projekte für die Bewerbung auf Forward-Deployed-/Solutions-Engineer- und AI-Governance-Rollen (F10). Erste eigene Idee war eine "Komponenten-Library für Agenten" analog zu 21st.dev, Beispiel automatisierte TikTok-Videoproduktion.

## Optionen
1. TikTok/Video-Agent-Library. Pro: Trend. Contra: Zielgruppe nutzt kein Claude Code, also SaaS statt Library; Rendering/Asset/Posting-API sind der Engpass; Wettbewerb (Creatomate, Shotstack, json2video); kein Bezug zu Altans Stärken (GTM, SEO, Governance, Agent-Ops).
2. pSEO-Nischenseiten mit vorhandener Astro-Engine. Pro: Engine existiert, passiv. Contra: 6–12 Monate Horizont, wenig Portfolio-Wert für FDE.
3. EU-AI-Act-MCP-Server. Pro: trifft beide Bewerbungsgleise, nutzt Politikwissenschaft + Agent-Engineering, Monetarisierungspfad. Contra: Wettbewerb existiert (F8), Rechtsmarkt ist Vertrauensmarkt.

## Entscheidung
Option 3 als erstes Projekt. Option 1 geparkt (Billigtest möglich: Remotion-Skill-Pack veröffentlichen, Nutzung messen). Option 2 als Nebenprodukt des Explorers mitdenken.

## Nachweis
- SPEC v0.1 §1 (Marktlage, abgerufen 2026-10-03), F1–F9 in `FACTS.md`. **Korrektur 2026-10-03:** F9 wurde widerlegt (Legalithm-Free-Tier ist dauerhaft), ersetzt durch F40, F42, F45; die Entscheidung bleibt davon unberührt.
- Altans Profil und Zielrollen: `~/Developer/ai-job-search/CLAUDE.md` (F10).
- Die Einschätzung zu Option 1 ist Fables Urteil ohne Tiefenrecherche; bei Wiedervorlage recherchieren.

## Begründung
Einziger Kandidat, der Einkommen und Portfolio gleichzeitig bedient und auf vorhandenen Bausteinen (Berta-Agent-Stack, pSEO-Engine, EU-AI-Act-Wissen) aufsetzt.

## Konsequenzen
Phase 0 Recherche (ADR-005), dann Spec v0.2, dann Spike. Sidehustle-Ledger für weitere Ideen bleibt offen.

## Revisit-Trigger
Nachfrage-Recherche (Berichte 06/07) zeigt keine zahlende Zielgruppe, oder Kommission veröffentlicht eine API mit Versionierung und Soft Law.
