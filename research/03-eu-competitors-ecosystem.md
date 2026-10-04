# 03 – Wettbewerbs- und Ökosystem-Check EU (Stand 2026-10-03)

**Methodik und Grenze:** Das WebSearch-Budget der Session (200/200) war nach ca. 7 Suchen erschöpft. Alle weiteren Befunde stammen aus `gh`/GitHub-API, npm-Registry, PyPI, arXiv-API, Hugging Face API, direktem Abruf von CELLAR, Kommissions-/BNetzA-Seiten und Vendor-Websites. Nicht beantwortbar waren: Funding-Daten, JRC-Berichte, Custom GPTs, skills.sh-Statistik, Kommissions-Arbeitsprogramm 2026/27, Lexparency/Openlaws-Status. Vendor-Aussagen sind "laut Website", Zusammenfassungen von Webseiten stammen teils von einem kleinen Modell und sind bei Zahlen mit Vorsicht zu lesen.

## Executive Summary

1. **Der Markt ist dichter als in der SPEC.** Mindestens 12 AI-Act-MCPs/Skills existieren (davon 4 benannte). Die gefährlichsten Wettbewerber sind **Lexbeam** (v1.7.0 vom 01.10.2026, 10 Tools, Omnibus-konform, Claim-Matrix gegen hash-verifizierte Konsolidierung, gehostet) und **Legalithm** (MCP + CLI + GitHub Action, "Drift"-Check wenn sich das Recht ändert). Die SPEC-Zeile "Lexbeam = statischer Snapshot" ist überholt.
2. **Omnibus-Kenntnis ist Table Stakes** (Sovereign, Lexbeam, Legalithm). Nur SonnyLabs (letzter Push 12/2025) und vermutlich CSOAI sind davon nicht berührt. Differenzierung muss in konsolidiertem Volltext mit `as_of`, Diffs, Soft Law, nationalem Recht und Provenienz liegen: Lexbeam liefert nur 28 Artikelzusammenfassungen, Sovereign Originaltext 2024 plus separate Einfügungen.
3. **Die Nachfrage nach AI-Act-MCPs ist klein:** 287 bis 771 Downloads/Monat bei den Konkurrenten, 0 bis 33 Stars. Das ist relevant für die Kill-Kriterien (100 Calls/Woche).
4. **AI Law Radar** (ailawradar.com) hat bereits REST-API, MCP, Changes-Feed (RSS/JSON), tägliche Aktualisierung und CC BY 4.0, aber als globales Obligation-Register (12 EU-Einträge), nicht als Volltext-Korpus.
5. **Build vs. Reuse:** cyanheads/eur-lex-mcp-server ist als Referenz und Code-Spender nützlich (Apache-2.0, aktiv), nicht als Laufzeit-Abhängigkeit. Eigener Spike: CELLAR liefert `02024R1689-20260727` per Content Negotiation als XHTML (EN 851 KB, DE 900 KB, enthält Art. 4a/75a). Ingestion ist machbar. Python-`eurlex` ist AGPL-3.0 (Lizenzfalle).
6. **KMU-Tools:** Keiner dokumentiert Kanzleipartner oder Rechtsredaktion. Kunden-Kandidaten sind API-orientierte EU-Plattformen (Saidot: 95 % der Funktionen per REST plus MCP; Trail, Berlin). Konkurrenten sind Legalithm, ComplyLayer (Claude-Connector) und AI Law Radar. TrailBit/Annexa/ComplyOne/AktAI konnten nicht als reale AI-Act-Produkte bestätigt werden.
7. **Goldset-Quellen existieren und sind offen:** Kommissions-Entwurf zur Hochrisiko-Klassifikation (19.05.2026, Beispielliste), Verbote-Leitlinien (134 S., grob 100+ Beispiele), AI Act Evaluation Benchmark (339 Szenarien, 137 QA, CC-BY-4.0), AIRO-SHACL-Regeln (CC BY 4.0). appliedAI-Datenbank: Basis 2023, Lizenz unklar.
8. **Kommission:** keinerlei Signal für eine API der Single Information Platform; sie wird weiter webbasiert ausgebaut. Die Art.-6(5)-Leitlinien sind weiter Entwurf (Finalisierung laut Konsultationsseite "Ende 2026"). Die SPEC-Korpusliste hat Lücken (siehe 5).
9. **Deutschland:** BNetzA-KI-Service-Desk ist statisches HTML mit 18 FAQ, Kompass, 2 Factsheets, ohne API und ohne bestätigten KI-spezifischen Feed. KoKIVO veröffentlicht nichts Eigenes über diese Seiten hinaus. Kanzlei-Tools wurden nicht gefunden (nicht erschöpfend geprüft).
10. **Evidenz ist asymmetrisch:** GitHub/npm/PyPI-Zahlen sind belastbar, Preise/Funding/Roadmaps nur teilweise.

## 1. AI-Act-MCP-Server im Detail

Stand der Zahlen: GitHub-API und npm/PyPI-Downloads (30 Tage bis 2026-10-01 bzw. pypistats "last_month").

| Projekt | Stars / Lizenz | Letzter Push | Downloads/Monat | Tools und Daten | Hosting / Monetarisierung | Omnibus 2026/1744? | Schwächen |
|---|---|---|---|---|---|---|---|
| **SonnyLabs/EU_AI_ACT_MCP** | 33 / Apache-2.0 | 2025-12-17 | unter zwei geprüften Paketnamen nicht gefunden | 17 Tools: Klassifikation, Rolle, Art.-50-Offenlegung, Watermarking (C2PA), Deepfake-Labels, Prompt-Injection-Scan (SonnyLabs-API) | Self-hosted; "Design Partner" für gehostete Version auf sonnylabs.ai; Security-Upsell | **Nein** (README ohne Erwähnung, Stand vor Omnibus) | Veraltet, Fokus Art. 50/Security, kein Volltext |
| **saidbazyar/sovereign-ai-act-mcp** (Dominion Intelligence AB, Stockholm) | 0 / MIT | 2026-09-23 | npm 287 | 5 Tools: `classify_ai_system`, `lookup_article`, `search_eu_ai_act`, `get_compliance_deadlines`, `review_feature`. Korpus: Originaltext 2024 (113 Art., 180 Erwägungsgründe, 13 Anhänge) plus Einfügungen Art. 4a, 60a, 75a–d, Anhang XIV separat, 24 Sprachen | Remote `regulatoryai.eu/mcp` + REST ohne Key, EU-Hosting; Leo kostenlos, bezahlte "Leo OS"-Abos laut Site pausiert, Dokumentenpakete im Shop | **Ja**, aber nur als Fristen und Einfügungen | Kein konsolidierter Text, geänderte Artikel nur "auf der Site markiert"; keine Leitlinien; Regel-Engine ohne öffentliche Testsuite |
| **CSOAI-ORG/eu-ai-act-compliance-mcp** (MEOK/Council of AI) | 1 / MIT | 2026-09-13 | PyPI 771 (v1.8.18) | "417 eingefrorene Provisionen", Risiko-Scan, 42-Punkte-Audit, Art.-11-Doku, Strafrechner | PAYG 0,05 GBP/Call über MEOK laut README (Commit vom 13.09. nennt Entfernung von "pricing", README zeigt PAYG weiterhin), Enterprise-Kontakt | Im README nicht erwähnt (nicht verifiziert) | Marketing-/Doktrin-Rauschen, "frozen corpus", Quellenmethodik unklar |
| **lexbeam-software/eu-ai-act-mcp** | 3 / MIT | 2026-10-01 (v1.7.0) | npm 693 | 10 Tools (u. a. `assess_system`, `assess_art6_3_exception`, `check_gpai_systemic_risk`, `annex_iv_checklist`, `calculate_penalty`), 28 kuratierte Artikelzusammenfassungen, 24 FAQ (nur EN), Omnibus-Ressource | Offener Endpoint `mcp.lexbeam.com/mcp` (Railway), Smithery (Quality 96/100); Beratungsboutique, keine direkte Monetarisierung | **Ja**, 43 Änderungen Delta für Delta abgeglichen, 124-Check-Claim-Matrix gegen gepinnte, hash-verifizierte Konsolidierung; Eval auf 358 Beschreibungen | Keine Volltexte ("Summaries are not statutory text"), kein `as_of`, keine Leitlinien |

**Weitere gefundene AI-Act-Angebote**

| Projekt | Stars / Lizenz | Befund |
|---|---|---|
| legalithm-org/legalithm | 0 (Mirror) / MIT | Offline-MCP (4 Tools), CLI, GitHub Action, `compliance/legalithm.json` mit Drift-Check; npm `legalithm` 544/Monat; Push 2026-10-01 |
| ark-forge/mcp-eu-ai-act | 11 / MIT | Code-Scanner (16 Frameworks), Pro 29 EUR/Monat, PyPI `eu-ai-act-scanner` |
| Ansvar EU-Regulations-MCP | 25 / Apache-2.0 | Repo archiviert 2026-07-07; Korpus (GDPR, AI Act, DORA, NIS2 u. a.) über `gateway.ansvar.eu/mcp` (OAuth, Free Tier); Korpus wird wegen TDM/Normen-Lizenzen nicht redistribuiert |
| PicoWorx, eucomplyhub, disclos (GatisOzols), AgentModule | 0–3 | Klein, teils inaktiv (disclos letzter Push 2026-06-17) |
| Skills: morellid/ai-act-skill (4 Stars), Sushegaad GRC-Skills (933 Stars, multi-framework, "monatlich aktualisiert"), mcpmarket/claudskills-Einträge | – | Reine Prompt-Skills ohne Korpus; skills.sh selbst nicht abgefragt |
| ComplyLayer, AI Law Radar | – | Siehe Abschnitte 3 und Fazit unten |
| OSS-Scanner: EuConform (125 Stars), VerifyWise (360 Stars), compl-ai (211 Stars) | MIT/Other/Apache | Governance-/Eval-Tools, kein Rechtsdaten-Layer |

**Fazit zu Frage 1:** PulseMCP schätzt für Sovereign ca. 2,1k und PicoWorx ca. 2,6k Besucher: Die Kategorie hat Aufmerksamkeit, aber wenig Nutzung. Keiner der Wettbewerber bietet `as_of`, Diffs, Provenienz pro Antwort oder nationales Recht. Lexbeam kommt mit seiner Claim-Matrix und Eval-Disziplin dem "wissenschaftlichen Standard" der SPEC am nächsten.

## 2. Generische EU-Rechts-MCPs und -Clients

| Projekt | Reife-Indikatoren | Fähigkeiten | Eignung |
|---|---|---|---|
| **cyanheads/eur-lex-mcp-server** | 8 Stars, Apache-2.0, v0.18.1 (2026-09-26), npm 3.584/Monat, gehosteter Endpoint, viele Bugfixes in 2 Tagen | 7 Tools: Suche, `get_document` (HTML/Markdown/Formex4 per CELEX/ELI), CELEX-Lookup, EuroVoc, SPARQL, **Relations** (amends, consolidated_version), `is_superseded`, Fallback-Sprache | Beste Referenz für SPARQL/Content-Negotiation; 0.x, Einzelmaintainer, Outline-Parsing "legacy" noch in Bewegung. Issue #108: `32024R1689` ist nur als Formex-ZIP (`application/zip;mtype=fmx4`) ausgeliefert |
| Honeyfield-Org/eurlex-mcp-server | 6 Stars, MIT, v2.4.3, npm 904/Monat | EUR-Lex-Cellar-Suche und Abruf | Zweitreferenz |
| scimorph/eur-lex-mcp | 10 Stars, MIT, Push 2025-06 | – | Verwaist |
| Python `eurlex` (step21) | 14 Stars, **AGPL-3.0**, PyPI 0.1.12, 262/Monat | SPARQL-Abfragen nach pandas | Lizenz meiden |
| R `eurlex` (Ovadek) | 58 Stars, CRAN, ca. 552 Downloads/Monat, aktiv (09/2026) | Metadaten und Texte, Forschungsstandard | Nur R, Referenz für SPARQL-Muster |
| eur-lex-lib (Rust) | nicht gefunden (kein crates.io-Treffer, keine GitHub-Treffer) | – | Nicht verifiziert |
| Lexparency | Website am 03.10.2026 TLS-Fehler; Zenodo-Korpus (88.000 Akte) aus 2019 | Konsolidierte Versionen, CC | Vermutlich nicht gepflegt (unverifiziert) |
| Openlaws (AT) | EU-Datenportal-Case von 2017, keine API-Angaben gefunden | – | Nicht bewertbar |
| LexAPI (lex-api.com) | Seite ohne Detailangaben abrufbar | REST über EUR-Lex-Open-Data | Nicht bewertbar |

**Eigener Spike (Phase-0-Relevanz):** `curl -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" http://publications.europa.eu/resource/celex/02024R1689-20260727` liefert die konsolidierte Fassung (851 KB EN, 900 KB DE) mit Art. 4a und 75a, 238 `art_*`-IDs und 14 Anhang-IDs. Die Omnibus-Verordnung `32026R1744` ist ebenso abrufbar. `02024R1689-20240801` ergab 404: Die "Fassung 2024" muss aus `32024R1689` (OJ-Text) kommen, konsolidierte CELEX-Fassungen existieren nur zu Änderungsdaten. Das ist ein Datenmodell-Punkt für `as_of`. Rechtsgrundlage Weiterverwendung: Beschluss 2011/833/EU, EUR-Lex-Inhalte unter CC BY 4.0 (laut EUR-Lex-Seite, Drittinhalte ausgenommen).

**Fazit:** Auf cyanheads aufzubauen spart wenig, weil der Mehrwert (Artikel-/Absatz-Baum mit stabilen IDs, Versionierung, Diff, Gültigkeitsintervalle) fehlt. Selbst ingestieren, cyanheads als Spezifikation für SPARQL-Queries und Formex-Zip-Handling nutzen.

## 3. KMU- und Enterprise-Compliance-Tools

| Tool | Typ / Preis (laut Website) | Zielgruppe | API / Integrationen | Rechtstext-Quelle und Updates | Funding |
|---|---|---|---|---|---|
| **Legalithm** | Free dauerhaft (Assessment, CRA-CLI, Generatoren); ab 1.500 EUR/Produkt/Jahr, Billing noch nicht live; Frankfurt | Entwickler, Berater, Hersteller | MCP, CLI, GitHub Action, Hosted Record; "Corpus API" erwähnt, Doku nennt keine Endpoints | "Zitiert gegen Official Journal", Regel-Engine; keine Aussage zu Redaktion/Kanzlei | n/v |
| TrailBit | `trailbit.ai`: Pre-Launch-Seite, Copyright 2024 | unklar | – | – | n/v (Domain-Zuordnung unsicher) |
| Annexa | `annexa.ai`: "Launching Soon", E-Mail-Capture | unklar | – | – | n/v (Domain-Zuordnung unsicher) |
| AktAI | `aktai.eu` Zertifikat abgelaufen, `aktai.com` Domain zum Verkauf | – | – | – | nicht bestätigt |
| ComplyOne | `complyone.ai` = HIPAA/NIST-Beratung, kein AI-Act-Produkt | – | – | – | wahrscheinlich andere Firma |
| **ComplyLayer** | Free unbegrenzt; Pro 1.499 USD/Jahr; Enterprise | KMU | Claude-/Cursor-Connector (MCP), GitHub, Slack, Notion, Jira, Drive | Dokumentengenerator in 7 Sprachen; Quelle nicht benannt | n/v |
| ActReady | `actready.ai`: Governance Control Plane, "AI Act Ready Sprint", kein Preis | Fintech/regulierte Anbieter | Telemetrie-Discovery | n/v | n/v |
| SetAIComply | 390 / 1.290 / 3.490 / 9.588 EUR/Jahr; Amsterdam | EU-KMU | MLflow, GitHub/GitLab, Jira, Slack, Webhooks | n/v | n/v |
| Platoya | 49 / 99 / 199 USD/Monat | Mid-Market ohne GRC-Team | n/v | n/v | n/v |
| **Trail** (trail-ml.com, Berlin) | Preis nicht öffentlich | Enterprise (Deutsche Bahn, Atruvia, Sparda-Bank, PwC) | Confluence, ServiceNow, Jira, OneTrust, Databricks; SaaS/On-Prem/BYOC | "Curated content", Kanzleipartner nicht genannt | n/v |
| **Saidot** | Preis auf Pricing-Seite, hier nicht abrufbar | EU-Enterprise | **95 % per REST, MCP-Anbindung**, Azure AI Foundry, Bedrock | 260+ Risiken, 620+ Kontrollen, 110+ Policies "von Experten kuratiert" | n/v |
| Enzai | Demo-Modell | Legal/Compliance Enterprise | 50+ Integrationen | n/v | n/v |
| Trustible | nicht öffentlich | Regulierte US/EU-Enterprises | n/v | "Expert-curated risk intelligence, continuously updated" | n/v |
| Credo AI | nicht öffentlich | Enterprise | 300+ Integrationen, Policy Packs (EU AI Act, NIST, ISO 42001) | Team in Standardisierungsgremien (ISO, NIST, EU-Parlament, OECD) | n/v |
| Holistic AI | nicht öffentlich | Fortune 500 | 20+ Konnektoren | n/v | n/v |
| Lumenova | nicht öffentlich | Banken, Versicherer | n/v | n/v | n/v |
| appliedAI | Datenbank frei, siehe Abschnitt 4 | Industrie/DE | – | – | – |
| TÜV AI.Lab | Domain-Treffer nicht gefunden | – | – | – | nicht bewertbar |
| **AI Law Radar** (zusätzlich) | Free + Pro; REST `/api/v1`, MCP `/api/mcp`, RSS/JSON-Changes | Berater, globale Anbieter | Endpoints `/obligations`, `/deadlines`, `/changes`, CSV, .ics | Primärquellen-Links, tägliche Prüfung, CC BY 4.0 | n/v |

**Befund:** Kein Tool nennt eine Rechtsredaktion oder Kanzleipartnerschaft; "kuratiert von Experten" ist Marketing ohne Belege. Eine Regulatory-Updates-Funktion bewerben Trustible, Credo, Saidot und Legalithm (Drift-Check). Funding wurde nicht recherchiert (Budget), keine Zahlen erfunden.

## 4. Öffentliche und akademische Ressourcen

| Ressource | Umfang | Lizenz / Zugang | Eignung als Goldset |
|---|---|---|---|
| **Kommissions-Entwurf Hochrisiko-Klassifikation** (19.05.2026; Konsultation bis 23.07.2026, verlängert) | Praktische Beispielliste "über alle Bereiche"; Anzahl nicht genannt; PDF in 24 Sprachen plus Darstellung und Explorer auf der Single Information Platform | Kommissionsdokument, Reuse-Regeln der Kommission | Höchste Priorität für Anhang III, aber Entwurf; Status `draft` kennzeichnen |
| Verbote-Leitlinien C(2025) 5052 | 134 S.; grobe Zählung: 92x "For example", 13x "For instance", ca. 14 Beispielblöcke mit ca. 48 Aufzählungen: grob 100–150 Beispiele | Kommission | Hoch: Verbotstatbestände und Nicht-Fälle |
| Definitions-Leitlinien C(2025) 5053 | 13 S.; ca. 12 Beispiele | Kommission | Mittel (Grenzfälle "KI-System ja/nein") |
| GPAI-/Art.-50-Leitlinien | Beispiele nicht gezählt | Kommission | offen |
| **AI Act Evaluation Benchmark** (Davvetas et al., arXiv 2603.09435, NCSR Demokritos) | 339 Szenarien (Rolle, Zweck, Domäne, Artikel, Pflichten), 137 QA-Paare | Daten CC-BY-4.0, Code Apache-2.0 | Brauchbar zur Abdeckung, aber LLM-generiert plus Experten, Basis vermutlich AI-Act-2024-Text: manuelles Review nötig |
| **AIRO / VAIR** (Golpayegani, Pandit, Lewis; TCD/ADAPT) | OWL-Ontologie, SHACL/SPARQL für Hochrisiko und Verbote (N3), 4 Use-Case-Beispiele; Repo 26 Stars, Push 2025-08 | CC BY 4.0 laut LICENSE.md (GitHub: NOASSERTION) | Gegenprobe für Regel-Engine, vermutlich vor Omnibus modelliert |
| Weitere Papers | KG-Mapping AI Act zu ISO (2408.11925, CC BY), FRIA-Ontologie (Rintamaki/Pandit 2501.10391, CC BY), "Measurement Gap" (2606.18158, Position Paper, ohne Daten) | – | Kontext, kein Datensatz |
| **appliedAI Risk Classification Database** | "über 100" Systeme laut Studie 03/2023; Datenbank "Edition 09/2024", PDF-Download, Felder: Use Case, Funktion, Klasse (unacceptable/high/unclear/low), Transparenz | "Open and free", Lizenz nicht genannt; Basis 2023 (verweist noch auf "Annex II") | Nur als Ideengeber; Lizenz klären, Labels neu prüfen |
| Hugging-Face-Datensätze (z. B. `safelegalaidata/eu-ai-act-structured`, CC-BY-4.0) | Qualität nicht geprüft | verschieden | nur Sichtung |
| FLI AI Act Explorer / Compliance Checker | Explorer, 10-Minuten-Checker "work in progress"; Newsletter (40.000+ Abonnenten laut Site) | Lizenz nicht ausgewiesen; kein API-/Export-Hinweis; Omnibus-Abdeckung nicht bestätigt | Nicht als Quelle nutzbar, als Marktreferenz |
| Service-Desk-FAQ (Kommission) | JS-paginiert (mind. 6 Seiten), Kategorie "Digital Omnibus" vorhanden; Anzahl nicht ermittelbar; Sprachumschalter zeigt 6 Sprachen (es, de, en, fr, it, pl) | Copyright-Hinweis, keine Reuse-Aussage sichtbar | Ingest-Kandidat mit Scraper |
| JRC-Berichte | nicht recherchiert | – | offen |

**Zu den Beispielzahlen:** Meine Zählung ist heuristisch (Textmuster im PDF), keine Falllisten. Die Leitlinien enthalten oft "nicht verboten, wenn"-Beispiele, die für `uncertain`-Fälle nützlich sind.

## 5. Kommission und AI Office: Roadmap

- **Single Information Platform:** Start 08.10.2025 (Compliance Checker, Explorer, FAQ, Service Desk). Weder die Ankündigung noch die Leitlinienseiten erwähnen API, Open Data oder maschinenlesbare Formate. Rechtsbasis Art. 62(3)(b). Die Plattform stellt die Hochrisiko-Entwurfsleitlinien "benutzerfreundlich" mit Zusammenfassungen und Explorer dar, also web-first. Angekündigt waren 24 Sprachen ab Anfang 2026; der Service Desk zeigt 6.
- **Omnibus (Primärtext 2026/1744, selbst gelesen):** Kommission muss Art.-4-Beispiele (KI-Kompetenz) auf der Plattform veröffentlichen; AI Office erstellt Fragebogen-Vorlage "auch als automatisiertes Tool" für Art. 27 (FRIA); **Leitlinien Annex-I-Systeme bis 01.08.2027**; **Leitlinien inkl. Vorlage zum Post-Market-Monitoring bis 02.09.2027** (Durchführungsrechtsakt-Ermächtigung entfällt); QMS-Leitlinien für KMU; neue Art. 6(1a)/(1b) zu Sicherheitskomponenten, die ältere Tools nicht kennen.
- **Leitlinienstand (Kommission, Update 31.07.2026):** veröffentlicht: Transparenz (Art. 50, 07/2026), Template Meldung schwerer Vorfälle, MDCG-2025-6-Interplay; Hochrisiko-Klassifikation nur als Entwurf, Finalisierung "Ende 2026". In Arbeit 2026: FRIA-Template, Wertschöpfungskette, wesentliche Änderung, PMM-Vorlage, QMS-KMU, GDPR-Joint-Guidelines mit EDPB, Forschungsausnahmen (Art. 2(6)/(8)). Die gesetzliche Frist für Art. 6(5) (02.02.2026) wurde gerissen; ein Omnibus-Eingriff in diese Frist wurde in meinem Textabgleich nicht gefunden.
- **Code of Practice Kennzeichnung/Labelling** (veröffentlicht 10.06.2026, anwendbar 02.08.2026) und EU-Icons: **fehlen in der SPEC-Korpusliste**, ebenso Hochrisiko-Entwurf, Serious-Incident-Vorlage und MDCG 2025-6. Datum der Feb-2025-Leitlinien: die PDFs sind auf 29.07.2025 datiert (C(2025) 5052/5053), nicht "02/2025" (Unterschied Genehmigung/formelle Annahme vermutet, nicht verifiziert).
- **Normen:** CEN-CENELEC-Ziel Q4 2026, Standardisierungsauftrag M/613 läuft 28.02.2027 aus; bis Juni 2026 nichts im ABl. zitiert (kla.digital, Sekundärquelle).
- **Nicht beantwortet:** Arbeitsprogramm 2026/2027, delegierte Rechtsakte (nur Sekundärquelle: Befugnisse bis 01.08.2029).

**Bewertung API-Risiko:** Kein Indiz für eine Kommissions-API; die Publications-Office-Schnittstellen (CELLAR) existieren bereits für den Rechtstext. Die Plattform deckt Soft Law nur web-seitig ab.

## 6. Deutschland

- **BNetzA KI-Service Desk** (`bundesnetzagentur.de/ki`): Themenseiten (Risikostufen, Verbote, Hochrisiko, Transparenz, Akteure/Pflichten, Normung, Notifizierung, Reallabore, Governance, Marktüberwachung, Beschwerdestelle u. a.), **KI-Compliance Kompass** (Orientierungs-Selbsttest, Funktionsweise und Omnibus-Stand nicht abrufbar), 2 Factsheets (allgemein; KMU), **18 FAQ** (laut Seite Stand nach Omnibus vom 27.07.2026), Kontaktformular, Insight-Blog, Podcast. Pressemitteilung 29.07.2026 zu KI-MIG: BNetzA als zentrale Marktüberwachung (u. a. Funkanlagen, Personalmanagement, kritische Infrastruktur, Bildung), Beschwerdestelle, KMU-Reallabor.
- **KoKIVO:** unterstützt Marktüberwachungs- und notifizierende Behörden, koordiniert einheitliche Antworten zu horizontalen Rechtsfragen, wirkt in Normung mit, unterstützt Verhaltenskodizes nach Art. 95. Eigene Veröffentlichungen laut Seite: Kompass, Factsheets, FAQ. Kein Datensatz, keine API. Die Seite hat einen globalen RSS-Verzeichnisknoten; ein KI-spezifischer Feed ist nicht bestätigt.
- **Kanzleien:** Taylor Wessing (Hub-Seite, 403 beim Abruf), Osborne Clarke DE und Noerr (Startseiten ohne AI-Act-Tool), reuschlaw (Checkliste "rechtliche Prüfung von KI-Anwendungen", 06/2026, kein Tool). Bird & Bird, CMS, DLA publizieren Guides/Q&A als Content. Das ist keine erschöpfende Suche; Hinweis auf Tools mit API: keiner.

## Kunden vs. Konkurrenten

| Akteur | Rolle | Begründung | Priorität |
|---|---|---|---|
| Saidot | **Kunde** (stark) | API-first, MCP, kuratierte Bibliothek, EU-Fokus | 1 |
| Trail (Berlin) | **Kunde** | Enterprise-Integrationen, Content "kuratiert", keine Kanzleipartner genannt | 1 |
| SetAIComply, Platoya, ActReady | Kunde (schwach) | Kleine Teams ohne Rechtsredaktion, Preisniveau 400–3.500 EUR/Jahr begrenzt Zahlungsbereitschaft | 2 |
| Credo, Trustible, Holistic, Lumenova, Enzai | Kunde (unsicher) | Behaupten eigene Expertenredaktion, US-Fokus | 3 |
| Legalithm | **Konkurrent** (teils Kunde) | Gleiche Zielgruppe (Entwickler), eigener Korpus, MCP+CLI+Action; SPEC listet es als Ansprechpartner: Gespräch führen, aber nicht als sicherer Kunde planen | 1 |
| ComplyLayer | Konkurrent / Kanal | Claude-Connector, Free-Tier | 2 |
| Lexbeam, Sovereign, CSOAI, SonnyLabs, Ansvar | Konkurrenten | MCP-Ebene | 1–3 |
| AI Law Radar | Konkurrent und Referenz | API+MCP+Changes+CC BY | 1 |
| BNetzA, Kommission | Datenquelle / kein Kunde | Keine API, Scraping nötig | – |
| Kanzleien (reuschlaw u. a.) | Review-Partner | Fachliche Prüfung des Entscheidungsbaums | 2 |

## Implikationen für unser Produkt

**Differenzierung (nach Belegen):**
1. **Konsolidierter Volltext mit `as_of` und Diff** (2024 vs. 2026): Lexbeam hat Summaries, Sovereign hat Originaltext plus Einfügungen, AI Law Radar hat Obligation-Zusammenfassungen. Das ist die klare Lücke.
2. **Soft-Law-Schicht** inklusive Entwurfsstatus: Hochrisiko-Entwurf (19.05.2026), Code of Practice Kennzeichnung (10.06.2026), Serious-Incident-Vorlage, MDCG 2025-6. Niemand deckt das ab.
3. **Eval-Transparenz:** Lexbeam publiziert bereits eine Claim-Matrix und ein Front-Door-Eval. Unser Eval-Report muss besser sein (Goldset-Größe, `uncertain`-Metrik), sonst keine Differenzierung.
4. **Sichtbarkeit:** Omnibus-Awareness reicht nicht mehr als Pitch; "kennt auch Art. 6(1a)/(1b), 4a, 60a, 75a–d" ist Test-Material.
5. **Nachfrage-Realismus:** Konkurrenten erreichen < 1.000 Downloads/Monat. Kill-Kriterien der SPEC (100 Calls/Woche) bleiben sinnvoll; Vendor-Tier (Saidot/Trail) vor Phase 2 per Gespräch validieren.

**Build vs. Reuse:**

| Baustein | Empfehlung |
|---|---|
| Rechtstext-Ingestion | Selbst bauen (CELLAR XHTML/Formex, wie getestet); cyanheads als Referenz und ggf. Code-Spender (Apache-2.0, Attribution) |
| EUR-Lex-MCP als Abhängigkeit | Nein: 0.x, Einzelmaintainer, Hosted-Instanz privat |
| Python-`eurlex` | Nein (AGPL-3.0) |
| Soft-Law-Ingestion | Selbst bauen, Scraper für Plattform und BNetzA-HTML |
| Ontologien (AIRO) | Als Gegenprobe für Regelstruktur, nicht als Laufzeitbestandteil |
| Lexparency/Openlaws/LexAPI | Nicht verlässlich bewertbar, nicht einplanen |

**Goldset-Strategie:** (a) Kommissions-Beispiele aus Hochrisiko-Entwurf (neu formulieren, Lizenz der Kommission beachten), Verbote- und Definitions-Leitlinien, manuell mit Fundstelle labeln. (b) Davvetas-Benchmark als Erweiterung (339 Szenarien, CC-BY-4.0), nur nach manuellem Review. (c) AIRO-SHACL zum Abgleich. (d) appliedAI-Datenbank erst nach Lizenzanfrage. (e) Lexbeams `evals/front-door` (MIT) als externes Vergleichsset prüfen. Das 100-Fälle-Ziel der SPEC ist mit (a)+(b) erreichbar, aber der Anteil an Fällen mit juristisch gesichertem Label ist klein: Jurist-Review einplanen.

**SPEC-Korrekturen:** Legalithm-"kostenlos bis 04/2028" nicht bestätigt (Website: Free-Tier dauerhaft, Billing nicht live); Lexbeam-Zeile ersetzen; Korpusliste um die genannten Soft-Law-Dokumente ergänzen; Verbote-Leitlinien-Datum prüfen.

## Evidenzqualität und offene Fragen

**Belastbar:** GitHub-Metadaten, Commit-Daten, npm/PyPI-Downloads (enthalten CI/Mirror-Rauschen), READMEs, Omnibus-Primärtext, CELLAR-Abruf, Kommissionsseiten (direkt gelesen), arXiv-Metadaten, AIRO-LICENSE.

**Schwach/unsicher:** Preise und Funktionen der Vendor-Seiten (Zusammenfassung durch kleines Modell, teils Marketing); Domain-Zuordnung von TrailBit, Annexa, AktAI, ComplyOne; PulseMCP-Besucherzahlen (Schätzungen); Beispielzählung der Leitlinien (heuristisch); kla.digital und artificialintelligenceact.eu als Sekundärquellen.

**Offen (wegen Budget oder fehlender Quelle):** Funding aller Anbieter; Kanzlei-Tools (Taylor Wessing 403, Noerr, Osborne Clarke nur Startseite); skills.sh/Custom-GPT-Landschaft; JRC-Berichte; FAQ-Umfang des Service Desks; Anzahl Beispiele im Hochrisiko-Entwurf und in Art.-50-/GPAI-Leitlinien; Kommissions-Arbeitsprogramm 2026/27; Lexparency/Openlaws/LexAPI/eur-lex-lib; Omnibus-Stand bei CSOAI; Reuse-Lizenz der Service-Desk-Inhalte; ob die Hochrisiko-Leitlinien inzwischen final adoptiert wurden.

## Quellen

- GitHub: https://github.com/SonnyLabs/EU_AI_ACT_MCP · https://github.com/saidbazyar/sovereign-ai-act-mcp · https://github.com/CSOAI-ORG/eu-ai-act-compliance-mcp · https://github.com/lexbeam-software/eu-ai-act-mcp · https://github.com/legalithm-org/legalithm · https://github.com/ark-forge/mcp-eu-ai-act · https://github.com/Ansvar-Systems/EU_compliance_MCP · https://github.com/cyanheads/eur-lex-mcp-server (Issue #108) · https://github.com/Honeyfield-Org/eurlex-mcp-server · https://github.com/step21/eurlex · https://github.com/michalovadek/eurlex · https://github.com/DelaramGlp/airo · https://github.com/davidath/ai-act-evaluation-benchmark · https://github.com/GenAI-Gurus/awesome-eu-ai-act
- Registries/Metriken: https://api.npmjs.org/downloads/point/last-month/@lexbeam-software/eu-ai-act-mcp · https://pypistats.org/api/packages/eu-ai-act-compliance-mcp/recent · https://www.pulsemcp.com/servers/eu-ai-act · https://smithery.ai/servers/lexbeam-software/eu-ai-act · https://glama.ai/mcp/servers/lexbeam-software/eu-ai-act-mcp
- Vendoren: https://www.regulatoryai.eu/ · https://www.legalithm.com/en/pricing · https://www.legalithm.com/en/blog/eu-ai-act-compliance-software-tools-compared-2026 · https://complylayer.com · https://setaicomply.com · https://platoya.com · https://actready.ai · https://www.trail-ml.com · https://www.saidot.ai · https://www.trustible.ai · https://www.credo.ai · https://www.enz.ai · https://www.holisticai.com · https://www.lumenova.ai · https://ailawradar.com/api
- Kommission/EU: https://digital-strategy.ec.europa.eu/en/news/commission-launches-ai-act-service-desk-and-single-information-platform-support-ai-act · https://digital-strategy.ec.europa.eu/en/news/supporting-implementation-ai-act-clear-guidelines · https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-high-risk-systems · https://digital-strategy.ec.europa.eu/en/consultations/targeted-consultation-draft-guidelines-classification-high-risk-artificial-intelligence-systems · https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content · https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai · https://ai-act-service-desk.ec.europa.eu/en/faq · https://ec.europa.eu/newsroom/dae/redirection/document/112367 · https://ec.europa.eu/newsroom/dae/redirection/document/112455 · http://publications.europa.eu/resource/celex/32026R1744 · http://publications.europa.eu/resource/celex/02024R1689-20260727 · https://eur-lex.europa.eu/EN/legal-content/summary/open-data-and-the-reuse-of-public-sector-information.html
- Akademisch: https://arxiv.org/abs/2603.09435 · https://arxiv.org/abs/2606.18158 · https://arxiv.org/abs/2408.11925 · https://arxiv.org/abs/2501.10391 · https://delaramglp.github.io/airo · https://www.appliedai-institute.de/risk-classification-database · https://www.appliedai.de/ki-ressourcen/white-papers/ · https://artificialintelligenceact.eu/ · https://artificialintelligenceact.eu/implementation-timeline/ · https://kla.digital/blog/jtc-21-standards-tracker
- Deutschland: https://www.bundesnetzagentur.de/ki · https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/15_Koordinierung/start.html · https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/_faq/start_faq.html · https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260729_KI_VO.html · https://www.reuschlaw.de
