# Review-Log der Recherche (Freigabe durch Fable)

**Zweck:** Jeder Bericht der Sonnet-Agenten wird vor Übernahme in die Spec geprüft. Kein Befund fließt ungeprüft ein.

## Prüfkriterien pro Bericht

| # | Kriterium | Frage |
|---|---|---|
| 1 | Quellenqualität | Primärquellen (Gesetzestexte, offizielle Seiten, Repos, Papers) oder nur Vendor-Blogs und SEO-Content? |
| 2 | Aktualität | Stand 2025/2026? Omnibus (27.07.2026) und KI-MIG (29.07.2026) berücksichtigt? |
| 3 | Spezifität | Konkrete Zahlen, Preise, Daten, Zitate mit Link? Oder Allgemeinplätze? |
| 4 | Vollständigkeit | Alle gestellten Fragen beantwortet? Lücken ehrlich benannt? |
| 5 | Widerspruchsfreiheit | Konsistent mit meiner eigenen Vorrecherche (SPEC v0.1 §1) und den anderen Berichten? |
| 6 | Erfindungsrisiko | Zahlen oder Produkte, die ich nicht verifizieren kann? Stichprobe von 2-3 Kernaussagen per WebFetch. |
| 7 | Produktrelevanz | Sind die "Implikationen" wirklich aus den Befunden abgeleitet oder generisch? |

## Entscheidungen

| Bericht | Status | Befund | Maßnahme |
|---|---|---|---|
| 01 Global Legal-Data Market | freigegeben | 17 Suchen + ~40 Fetches, Primärquellen (TR-Doku, legislation.gov.uk, eCFR live, RegAlytics). Ehrliche Schwächenliste. Stichproben F: RegAlytics-Pricing ✓, CUBE/4CRisk ✓. Preise aus Drittblogs korrekt als schwach markiert. | Übernommen: F15–F19, H6. Lücken in README notiert. |
| 02 Non-EU Landscape | freigegeben | 12 Suchen + ~45 Fetches, (U)-Markierung konsequent, Premise-Check (NIST-Crosswalk) negativ und offen benannt. Stichprobe F: Colorado SB 26-189 ✓ (leg.colorado.gov). | Übernommen: F11–F14, F20, F21. Eigener Abschnitt "Budgetbedingt nicht beantwortet" als Auftrag für Folgesession. |
| 03 EU Competitors & Ecosystem | freigegeben | 7 Suchen, dann gh/npm/PyPI/arXiv/HF/CELLAR direkt, 139 Tool-Aufrufe. Eigener CELLAR-Spike im Bericht. Stichproben F: CELLAR-XHTML-Abruf reproduziert ✓ (EN 851 KB, DE 900 KB, art_4a/75a), Lexbeam-README ✓ (Summaries only, Claim-Matrix, kein as_of; README zeigt v1.6.0, Agent nennt v1.7.0 aus npm), Legalithm-Repo ✓ (MCP 4 Tools, CLI, Action, Drift-Check), Legalithm-Pricing ✓ (Free dauerhaft, nicht bis 2028 → F9 korrigiert). Länge über Korridor, aber dicht. | Übernommen: F38–F41, F43, F46–F49; H3 weitgehend bestätigt. SPEC-Korpusliste muss erweitert werden. |
| 04 MCP Distribution & Monetization | freigegeben | P/S/E-Kennzeichnung je Aussage, 42 Quellen, npm-API live. Stichprobe F: MCP-Changelog 2026-07-28 ✓ (stateless, MRTR, Deprecations). Hinweis: Changelog-Text enthält einmal "this draft", Release-Status auf Spec-Index gegenprüfen. | Übernommen: F22–F29. Spec-Vorschläge (extract_facts streichen, 8–10 Tools, Free ≥ 1.000) für v0.2 vorgemerkt, noch nicht entschieden. |
| 05 Trustworthy Legal AI Tech | freigegeben | 11 Suchen + arXiv-API + Primärseiten, [A]/[B]/[C]-Tags. Stichproben F: Charlotin-DB 2.125 Fälle ✓, Cellar-Notification-Feed (startDate/type/wemiClasses) ✓. Vier Spec-Korrekturen sind substanziell (statistische Obergrenze statt 0 FN, MRTR, Citations≠Structured Outputs, keine Temperatur bei 5.5). Schwäche: viele 2026-Papers nur als Abstract [B]. | Übernommen: F30–F36. Referenzarchitektur (G0–G4-Guard, bitemporal, drei Zeitachsen) als Basis für SPEC v0.2 §Architektur. Modell-Claim [43] bei Architektur-ADR per claude-api-Skill gegenprüfen. |
| 06 Demand Signals | freigegeben (mit Lückenvermerk) | 7 Suchen, dann HN-Algolia, GitHub, npm, MCP-Registry, Stack-Exchange, Job-Boards. Reddit/LinkedIn/X/IAPP/Bitkom nicht erreichbar → Frage 2 und DE-Signale dünn, ehrlich benannt. Zitate aus API-Rohtext, WF-Zitate markiert. Ehrliche Gesamtwertung (Portfolio ja, Einkommen unbewiesen) ist genau die Art Befund, die wir brauchen. Stichprobe F: aiactradar.com (siehe F42). | Übernommen: F43–F45, Top-10-Fragen als Eval-Basis. H1 auf "schwach belegt" gesetzt; Gate vor Phase 2 (Interviews + Waitlist). Reddit/LinkedIn/DE-Signale in Folgesession mit Budget nachholen. |
| 07 last30days Community Voice | teilweise verwendbar | Zwei Engine-Läufe, 179 Items, nur ~20 on-topic; kein Pre-Research, kein Web (Budget). Zitate wörtlich mit Links, ehrliche Evidenz-Einschätzung. Taugt als Stimmungs- und Lückenbild, nicht als Marktvalidierung. | F54 übernommen; Hinweis in SPEC §2; Lauf in Folgesession mit Budget wiederholen. |

| 08 Agent-Doku Best Practices | freigegeben | ~50 WebFetch auf Primärquellen (Anthropic-Doku, Vercel, MADR, Letta, OKF), last30days mit dünnem Signal. Stichproben F: Vercel-Zahlen ✓, `omitClaudeMd` ✓, CLAUDE.md-Doku ✓, Stop-Hook-Semantik ✓. Fand realen Fehler (F9-Zitate). Anthropic-/Vendor-lastig, selbst benannt. | ADR-007 (ersetzt ADR-004); F50–F53. Nicht übernommen: SPEC-Split, Kurzzitat-Spalte. |
| 11 Claude-Code-Doku Autonomie | freigegeben | 7 Suchen + WebFetch/curl auf Rohtext, nur offizielle Quellen, Abrufdatum je URL. Stichproben F durch Fable: Fable-50-%-Regel ✓ (support 15424964), `SUBAGENT_MODEL_FORCE` + Explore-auf-Opus ✓ (sub-agents), Subagenten im selben Pool + Teams 7x + Cache-TTL ✓ (costs). Fehler: Implikation 10 nennt `eu-ai-act-mcp` "kein Git-Repo"; richtig ist: initialisiert ohne Commit (Worktrees brauchen trotzdem einen Commit). Zwei Engineering-Blog-Zusammenfassungen selbst als ungeprüft markiert. | F57–F61; Grundlage für Build-Setup (ADR folgt). |
| 10 Autonome Builds, Community 30 Tage | freigegeben | 3 Engine-Läufe (180 KB Roh), dann 50 min Primärquellen (Reddit-Archiv, HN-Algolia, gh, Doku-Rohtext), 117 Tool-Aufrufe, 63 min. Tags konsequent, Upvotes als Relevanz, (U) ehrlich. Stichproben F durch Fable: PreCompact-Exit-2 ✓, Explore-Override ✓, maxTurns ✓, MAX_CONCURRENT_SUBAGENTS ✓, Stop-Hook-Cap 8 ✓ (nur im Rohtext, WebFetch-Zusammenfasser übersah es), `subagent_type` im Agent-Hook-Input ✓ (löst (U) aus §4.2). Schwäche: Praxisbelege anekdotisch, selbst benannt. | F62–F65. §4.2–4.4 Basis für Build-Setup (ADR-011 nach Go). Prozesslehre: Frist von Fable gesetzt und auf Altans Einwand zurückgenommen; Sichtbarkeit statt Deadline. |

Status-Werte: `freigegeben`, `nachgebessert` (mit Rückfrage an Agent), `teilweise verwendbar` (nur markierte Abschnitte), `verworfen`.
