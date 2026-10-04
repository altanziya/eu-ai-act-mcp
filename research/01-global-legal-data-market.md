# Globaler Markt für "Recht als Daten" und Regulatory Intelligence

**Stand:** 2026-10-03 · **Zweck:** Lernen von etablierten Mustern, Moat-Verständnis für `aiact-mcp` · **Methode:** 17 Websuchen, ca. 40 gezielte Fetches. Das Suchbudget der Session war danach erschöpft. Unbelegtes ist als solches markiert (siehe letzter Abschnitt).

## Executive Summary

1. **Der reine Zugang zu Gesetzestexten ist Commodity.** Staaten liefern ihn kostenlos (CELLAR, legislation.gov.uk, eCFR, GovInfo). Dazu gibt es freie MCP-Server ohne API-Key, etwa für UK/EU-Recht und für UK-Änderungshistorien. Bezahlt wird nie für den Text selbst.
2. **Bezahlt wird für Vertrauen und Prüfbarkeit:** Citator (KeyCite, Shepard's), Redaktion (Thomson Reuters nennt 650+ Attorney-Editors für Practical Law) und Zitatprüfung. Beide Großen haben 2026 eine "Verify"-Funktion gebaut (Shepard's Verify, Deep Research Verify). Das ist die Richtung, in die der Moat wandert.
3. **Incumbents öffnen sich nur kontrolliert für Agenten.** Der TR-MCP-Connector setzt ein CoCounsel-Abo voraus, bietet im Kern ein einziges Tool ("Ask CoCounsel"), verbietet die Nutzung der Inhalte mit anderen KI-Tools und kann jederzeit eingestellt werden. Lexis hat laut Drittquelle keinen Claude-Connector, gibt Inhalte aber an Harvey weiter (Allianz Juni 2025).
4. **Der Regulatory-Change-Markt konsolidiert.** CUBE schluckte TR Regulatory Intelligence (Jan 2025), Kodex AI (Okt 2025) und 4CRisk (Feb 2026). Bloomberg kaufte Regology (Juni 2026), Archer kaufte Compliance.ai (2024). Clausematch leitet auf Corlytics um. Konditionen sind fast nie öffentlich.
5. **Käufer sind überwiegend Finanzdienstleister.** Dort ist Signal-Rausch das Problem: Nach CUBE-Umfrage beobachten 82 % der Firmen 26-100 Rechtsänderungen pro Monat, aber nur 45 % müssen handeln. Verkauft wird Relevanzfilterung plus menschliche Expertenprüfung, zunehmend mit Workflow (Obligation-Mapping, GRC-Anbindung).
6. **Die nächste Analogie zu uns ist RegAlytics:** Feeds, REST, MCP, Webhooks, Flat Files, verbrauchsbasiertes Pricing ohne Seat-Preise, Self-Serve mit Kreditkarte. Das ist ein belegtes Modell für "Regulierung als Datenprodukt" (Teamgröße und Umsatz nicht belegt).
7. **Gute Vorbilder für Versionierung:** legislation.gov.uk (stabile Point-in-Time-URIs, Basis 1991-02-01, Prospektiv-Fassungen), eCFR (`up_to_date_as_of`, `latest_amended_on`, ausdrücklich "unofficial"), Lawstronaut (Integer-Versionen, `horizon_scan`). Deutschland hat im Rechtsinformationsportal noch keine Normversionen.
8. **Rules as Code funktioniert eng und numerisch, nicht breit und semantisch.** Kanada nennt die frühen OpenFisca-Projekte "lang, mühsam und nicht nachhaltig". Für den AI Act fand ich nur akademische Ontologien (AIRO, VAIR, TAIR), keine gepflegte Entscheidungs-API. Das ist Lücke und Warnsignal zugleich.
9. **Funding fließt in Workflow-Plattformen, nicht in Datenlieferanten:** Harvey ca. 11 Mrd. $ (März 2026, danach Gerüchte um ca. 15 Mrd. $), Legora 5,5 Mrd. $ (März 2026) mit 150 Mio. $ ARR (Q2 2026). Kleine Datenanbieter haben kaum Funding-Signale.
10. **Solo-Chance:** Ein enger, vertikaler, verifizierbarer Korpus (nur AI Act) mit Änderungsstatus pro Norm und Zitatprüfung. Nicht konkurrenzfähig: Breite, 24/7-Redaktion, Enterprise-Procurement (SOC 2, ISO), Netzwerkeffekte.

## 1. Legal-Research-Incumbents

| Anbieter | Sourcing/Versionierung | API/Agent-Zugang | Preise | Moat |
|---|---|---|---|---|
| Thomson Reuters (Westlaw, CoCounsel) | Nicht öffentlich dokumentiert | MCP-Connector (Claude Desktop, Claude.ai, Cowork), Pilot; laut Drittblog read-only, ohne KeyCite-Tools; auf Claude Agent SDK gebaut | Keine Rate Card; Drittblog nennt ca. 637-784 $/Anwalt/Monat | KeyCite, Practical Law (650+ Editors), Lizenzklauseln |
| LexisNexis (Lexis+ mit Protégé, ab Feb 2026) | Nicht öffentlich dokumentiert | Kein dedizierter API-Tier erwähnt; Inhalte an Harvey lizenziert | Median 14.400 $ (CostBench) bis 18.450 $ (Vendr) pro Jahr, Spanne 3.410-44.723 $ | Shepard's; Verify prüft nur Existenz/Abrufbarkeit, nicht ob die Quelle die Aussage stützt |
| vLex/Fastcase + Clio | "1 Mrd.+ Dokumente, 100+ Länder" (Eigenangabe) | Keine Details gefunden | Nicht gefunden | Clio-Distribution (200.000+ Juristen); Kauf für ca. 1 Mrd. $ |
| Harvey | Lizenziert LexisNexis-Primärrecht und Shepard's | MCP-Connector (Drittblog) | Drittblog: ca. 1.000-2.000 $/Sitz/Monat, 25-50 Sitze Minimum | Workflow-Distribution in Großkanzleien |
| Legora | Nicht dokumentiert | Nicht geprüft | Nicht öffentlich | 1.500 Kunden, 150 Mio. $ ARR (Q2 2026) |
| Bloomberg Law | Nicht dokumentiert | Nichts gefunden | Nichts gefunden | Kauf von Regology als Workflow-Erweiterung |

Befund: Textquellen und Versionierung legen die Großen nicht offen. Aus Vorwissen (nicht in dieser Recherche belegt) stammen ihre Fassungen aus offiziellen Quellen plus redaktioneller Aufbereitung. Der **Lizenzvertrag ist ein Moat-Werkzeug**: TR verbietet die Nutzung der Connector-Inhalte mit anderen KI-Tools und ihre Weitergabe außerhalb der Session.

## 2. Regulatory Change Management / RegTech

| Anbieter | Modell und Lieferform | Redaktion | Funding/Exit |
|---|---|---|---|
| CUBE | RegPlatform, REST-API, Feeds, Alerts, "CUBE Intel" für den Mittelstand; 1.000+ Kunden (Eigenangabe); Preise nicht öffentlich | KI-Filter plus Experten | Hg-Partnerschaft (März 2024, CB Insights); Konsolidierer (TR RI/Oden, Reg-Room, Acin, Kodex, 4CRisk) |
| Regology | "Smart Law Library", US Bund/Länder plus 135+ Länder; Obligation-Mapping, GRC-Anbindung (ServiceNow, Archer) | KI-Agenten; Details offen | Bloomberg-Kauf 3.6.2026, Konditionen offen; Preis ca. 1.700 $/Nutzer/Monat nur aus unauditierten Reviewseiten |
| Compliance.ai | Regulatory Change Management | nicht geprüft | Von Archer übernommen (Feb 2024), Preis offen |
| Corlytics | SaaS, Feeds, Policy-Mgmt; Finanzdienstleister und Life Sciences; SOC 2 Typ II, ISO 27001/42001 | Juristen plus KI | Clausematch-Domain leitet auf Corlytics um (Übernahme vermutet, nicht belegt) |
| 4CRisk | Small Language Models, Policy-zu-Regel-Mapping | KI | Von CUBE übernommen (Feb 2026) |
| RegAlytics | Feeds, REST, MCP, Webhooks, Flat Files; 1.000+ Quellen, 100+ Länder; verbrauchsbasiert, keine Sitze | Nicht angegeben | Nicht gefunden |
| Reg-Track | Web-UI plus tägliche E-Mail-Alerts, Finanzsektor | nicht angegeben | Nicht gefunden |
| Ascent, TR Regulatory Intelligence | Nicht eigenständig geprüft; TR RI ging an CUBE | n. g. | n. g. |

**Änderungserkennung** läuft überall als automatisches Scanning plus menschliche Relevanzprüfung. Belegt ist das nur für CUBE und Corlytics (Eigenangaben). **Käufer:** Compliance- und Risikoteams in regulierten Branchen. **Preise:** fast durchgehend "auf Anfrage", RegAlytics ist die Ausnahme beim Prinzip (Verbrauch statt Sitze).

**Übertragbar auf Solo-Betrieb:** schmaler Scope (eine Verordnung, ein Land, später mehr), maschinenlesbare Lieferform (API/MCP/Webhook), Verbrauchspreis, automatisches Scanning mit Review-Gate. **Nicht übertragbar:** Analystenteams für viele Jurisdiktionen, Zertifizierungen, Vertrieb an Banken.

## 3. Open-Legal-Data-Infrastruktur

| Quelle | Versionierung / Change-Feed | Eignung als Vorbild |
|---|---|---|
| EU CELLAR / EUR-Lex | SPARQL (60 s Timeout), REST, Formex-4-XML in 24 Sprachen, konsolidierte Fassungen über Relationship-Graph (`cdm:consolidated_by`); Atom/RSS-Feeds (laut Vendor-Blog Polling alle 15-30 Min.) | Primärquelle; das Vorbild `cyanheads/eur-lex-mcp-server` (v0.18.1, 8 Sterne) begrenzt SPARQL auf 100 Zeilen |
| legislation.gov.uk | Point-in-Time-URI `/{typ}/{jahr}/{nr}/{datum}`, Basisdatum 1991-02-01, prospektive Fassungen, Atom-Feeds mit `<updated>`, OGL v3 | Bestes Versions-Vorbild |
| eCFR (US) | Versioner-API `/api/versioner/v1/full/{date}/title-{n}.xml`; live geprüft: `latest_amended_on`, `latest_issue_date`, `up_to_date_as_of` pro Titel | Gutes Vorbild; offiziell nur PDF/Text, XML ist "unofficial", nicht signiert |
| GovInfo / Congress.gov | API-Key, `lastModified`-Endpunkte, USCODE nach Jahr, Bulk-XML bis 1789, MCP-Server in Preview | Change-Polling per Zeitstempel |
| CourtListener (Free Law Project) | API, Zitationsgraph, Zitatprüfung, MCP für Claude (Mai 2026); Citator in Entwicklung | Freies Citator-Konzept; senkt Rate Limits für neue Nutzer wegen KI-Last |
| rechtsinformationen.bund.de | Testphase seit 04/2025, JSON/XML/HTML-API (Swagger), unvollständig, **keine Normversionen**, laut Suchtreffer Abschluss 2028 | Noch nicht tragfähig für DE-Versionierung |
| OpenLegalData.io | 423.941 Entscheidungen, 113.537 Gesetze, 7,4 Mio. Zitationen (Mai 2026), nur DE; Lizenz/API unklar | Dataset-Vorbild, nicht für Aktualität |
| Lawstronaut (filerskeepers) | 132 Jurisdiktionen, 15 MCP-Tools, Integer-Versionen je `document_id`, `horizon_scan`; Preis offen | Zeigt, wie Agenten Versionen und "Was ist neu" abfragen |

**Format-Warnung für SPEC §4.1:** AKN4EU ist die Akoma-Ntoso-Lokalisierung der EU, und es existiert ein Konverter Formex nach Akoma Ntoso. Ein Vendor-Blog nennt XHTML mit AKN-`eId` für neuere Akte, Formex für ältere. Ob für 32024R1689 und die konsolidierte Fassung 02024R1689-20260727 Formex oder AKN-XHTML bereitliegt, ist **vor dem Parser-Bau gegen CELLAR zu prüfen**. Zusätzlich gilt: eCFR und EUR-Lex betonen, dass nur die Amtsblatt- bzw. PDF-Fassung rechtlich authentisch ist. Unser Disclaimer sollte das spiegeln.

## 4. Rules as Code

| Ansatz | Stand | Lehre |
|---|---|---|
| OpenFisca (FR, 2011, Python) | Verbreitet für Sozialleistungen/Steuer, von UNDP und OECD empfohlen | Gut für numerische Mikrosimulation; kanadische Pilotprojekte: imperative Sprachen erfassen "die ganze Bedeutung" nicht |
| Catala (Inria) | Default-Logik (Regel/Ausnahme), formale Semantik | Passt auf Regel-Ausnahme-Struktur; laut Catala-Buch können aktuelle LLMs Recht nicht zuverlässig in Code übersetzen, Auslegung bleibt menschlich |
| Blawx (Kanada, s(CASP)) | Visuelle Oberfläche, Erklärungen, API | Bessere Ergonomie; kann Kodierungen verschiedener Gesetze nicht sauber trennen |
| Oracle Intelligent Advisor | Enterprise-Regelwerkzeug | Nichts Belastbares zu Erfolgen recherchiert |

**Kanada (PSX, 2024):** Der Prozess war "lang, mühsam, nicht nachhaltig". Dazu kamen Kommunikationsprobleme zwischen Drafting, Fachexperten und Entwicklern. Die Empfehlung: Regeln gehören zu den Regelsetzern, idealerweise schon beim Verfassen. Kodierungen haben **keinen gleichen Rechtsstatus** wie der Text. Das passt zu SPEC-Prinzip 4 ("Unsicherheit ist ein Ergebnis").

**AI Act:** Gefunden wurden AIRO (OWL-Ontologie, 2022 auf Basis des Entwurfs), VAIR, TAIR und ein Preprint zur Risikoquellen-Analyse (arXiv 2609.13535, ohne erkennbare Daten-/Regelfreigabe). Eine gepflegte, versionierte Entscheidungs-API fand ich nicht. Das bestätigt die Lücke, ist aber Abwesenheit von Evidenz, kein Beweis. Das Hauptrisiko ist der **Pflegeaufwand bei Rechtsänderungen** (Omnibus 2026/1744 ist schon ein Beispiel) und die Auslegungsabhängigkeit (Art. 6 Abs. 3).

## 5. Legal-Data-Startups ("Law as API" / "Law for Agents")

| Anbieter | Angebot | Traktion/Funding | Preis |
|---|---|---|---|
| Midpage | 16 Mio.+ US-Urteile mit Citator, API und MCP | Eigenangaben: 10.000+ Litigators, 300+ Kanzleien; SOC 2 Typ II; Funding nicht gefunden | 2 Wochen gratis, Preise offen |
| Paxton | Recherche/Drafting; keine API/Citator auf der Website | 6 Mio. $ Seed (2023), 22 Mio. $ Series A (Jan 2025, Unusual Ventures), gesamt 28 Mio. $; "30.000+ Anwälte" (Eigenangabe) | offen |
| Alexi | Recherche/Workflows, Nordamerika | Keine Funding-Angaben auf der Seite | offen |
| Lexata | **Nicht verifizierbar:** die Domain ist geparkt und steht für 10.000 $ zum Verkauf | n. a. | n. a. |
| Lawstronaut | Globaler Korpus per MCP | Nur Marketingzahlen | offen |
| RegAlytics | Siehe Abschnitt 2 | Nicht gefunden | verbrauchsbasiert, keine Rate Card |
| CourtListener | API plus MCP inklusive Konto | Spenden/Mitgliedschaft; AWS-Grant 150.000 $ (Dez 2025) | gratis/Mitgliedschaft |
| Freie Hobby-/Kanzlei-MCPs | openlaw-mcp (UK/EU, ohne Key), LegalMCP, General Legal (legalmcp.org, Apr 2026), UK Legislation Changes (gratis, deterministisch, 506 Normen) | Keine | gratis |

Harvey (ca. 11 Mrd. $ im März 2026) und Legora (550 Mio. $ Series D, 5,5 Mrd. $, März 2026) zeigen, wohin das Kapital geht: **Workflow-Plattformen**. Reine Datenanbieter für Agenten sind früh, haben kaum belegte Umsätze und konkurrieren gegen kostenlose Staatsquellen.

## 6. Lessons: Moats und typische Fehler

| Moat | Belegt durch | Für uns |
|---|---|---|
| Aktualität | RegAlytics, Midpage ("binnen Stunden"), CUBE | Ja, bei engem Scope tragbar |
| Redaktion/Trust | TR (650+ Editors), CUBE/Corlytics (KI plus Experten) | Teilweise: Review-Gate plus öffentliche Testsuite statt Team |
| Citator/Verify | KeyCite, Shepard's (Verify), Deep Research Verify, CourtListener-Citator, Midpage | **Stärkster Hebel** |
| Workflow-Distribution | Clio+vLex, Harvey, Bloomberg+Regology | Nein im Alleingang; über MCP-Registries und Explorer-SEO |
| Daten-Lock-in/Lizenz | TR-Connector-Klauseln, Harvey-Lexis-Deal | Gegenstrategie Open Core |
| Skalennetzwerk | Zitationsgraph | Nein (AI-Act-Korpus ist klein) |

**Typische Neulingsfehler** (Schlussfolgerung aus den Befunden, keine eigene Studie): (1) Text verkaufen, den der Staat gratis liefert. (2) Zu früh breit (viele Jurisdiktionen) statt tief. (3) KI-Zusammenfassungen als Produkt: Bloomberg nennt laut Analystenblog Margendruck durch generative KI. (4) Rate-Limit- und Infrastrukturkosten unterschätzen (CourtListener senkte Defaults). (5) Redaktions- und Pflegeaufwand unterschätzen. (6) Zitate ohne Prüfmechanismus liefern, während die Großen gerade Verify-Funktionen verkaufen. (7) Sitzpreise für Agenten-Nutzung.

**Solo mit Claude Code stark:** Ingestion-Pipelines, Parser, Diffs, Testsuiten, MCP/REST, statischer Explorer, enger Scope. **Schwach:** 24/7-Redaktion, Jurisdiktionsbreite, Enterprise-Sicherheitszertifikate, Haftungsfragen, Vertriebsnetz, Lizenzdeals mit Verlagen.

## Implikationen für unser Produkt

**Übernehmen**
- Stabile Point-in-Time-URIs nach legislation.gov.uk (`/eli/.../{datum}`), je Antwort `up_to_date_as_of` wie eCFR.
- Integer-Versionen je Node plus `horizon_scan`-artiges `get_changes` (Lawstronaut) früher als Phase 2.
- Verbrauchsbasiertes Pricing (RegAlytics) mit Self-Serve per Kreditkarte, kein Sitzmodell.
- Disclaimer "nur Amtsblatt authentisch" (eCFR/EUR-Lex-Muster).
- Deterministische Zusammenfassungen von Änderungen wie bei "UK Legislation Changes".

**Vermeiden**
- Rohtextzugang als Bezahlprodukt; AI-Zusammenfassungen als Kernprodukt.
- Eigene Workflow-/GRC-Funktionen (bestätigt SPEC §4.4).
- Rules-as-Code-Ehrgeiz über Art. 2, 3, 5, 6, 50 und Fristen hinaus; kein Versprechen von Rechtsstatus der YAML-Regeln.
- Breite vor Tiefe (weitere Mitgliedstaaten) vor dem MVP-Beleg.

**Moat-Kandidaten (priorisiert)**
1. **"Citator für den AI Act":** neues Tool `verify_citation` / `provision_status`, das ein Zitat byte-genau gegen Fassung X prüft und meldet: geändert durch 2026/1744? Frist verschoben? Dazu einschlägige Leitlinie. Shepard's Verify prüft nur Existenz, unser Citation Guard geht mit Wortlautabgleich plus Änderungsstatus weiter.
2. **Änderungs-Feed mit Provenienz** (Hash-Kette, Original-XML, Review-Gate): lieferbar mit Solo-Aufwand.
3. **Öffentliche Eval-Suite und Methodik** als Vertrauenssignal anstelle eines Redaktionsteams.
4. **Dataset mit DOI** als Distribution in Forschung und Lehre.

## Evidenzqualität und offene Fragen

- **Stark:** Primärseiten (TR-MCP-Doku und Pressemitteilung, legislation.gov.uk, eCFR live, GovInfo, Lawstronaut, RegAlytics, CUBE, Midpage, Paxton).
- **Mittel:** Fachpresse (LawNext, Lawyer Monthly), Aggregatoren (CB Insights), Pressemeldungen zu Übernahmen.
- **Schwach:** Preisangaben (The Legal Prompts, Claude for Lawyers, Review-Seiten), Harvey-ARR (Quellen widersprüchlich, ca. 300-400+ Mio. $, nicht verlässlich), CELLAR-Details aus Vendor-Blog.
- **Technische Lücken:** Websuche-Limit erreicht; Bloomberg-, Congress.gov-, CNBC-Seiten lieferten 403, LII-Seite 404. Der Fetch-Dienst ist ein kleines Modell: Zusammenfassungen können Fehler enthalten.
- **Nicht recherchiert:** Hebbia, Ascent (eigenständig), Compliance.ai-Preise, Alexi-Funding, Midpage-Funding, Ausgang von Thomson Reuters gegen Ross Intelligence (relevant für Lizenzrecht an Redaktionsinhalten), Oracle Intelligent Advisor, Cornell LII, Congress.gov-Details.
- **Offene Fragen:** (a) Formex oder AKN-XHTML für den AI Act in CELLAR? (b) Rechtliche Wirkung unserer Regel-Engine (Haftung bei `uncertain`)? (c) Zahlungsbereitschaft von Compliance-Tool-Herstellern für einen AI-Act-Feed: kein Preisanker gefunden, daher Interviews nötig. (d) Gibt es im AI-Act-Umfeld bereits kommerzielle Feeds (RegAlytics, CUBE decken AI Act vermutlich mit ab)? Nicht geprüft.

## Quellen

- TR CoCounsel Legal MCP connector: https://www.thomsonreuters.com/en-us/help/cocounsel/legal/integrations/mcp-connector/cocounsel-legal-mcp-connector
- TR Pressemitteilung CoCounsel Legal (Aug 2026): https://www.thomsonreuters.com/en/press-releases/2026/august/thomson-reuters-launches-next-generation-of-cocounsel-legal-the-ai-ecosystem-built-for-legal-professionals
- LexisNexis Protégé-Erweiterung (LawNext, Mai 2026): https://www.lawnext.com/2026/05/lexisnexis-expands-lexis-with-protege-adding-agentic-skills-collaboration-workrooms-and-customer-held-encryption-keys.html
- Lexis-Preise (Drittblog): https://thelegalprompts.com/blog/lexis-ai-pricing
- Harvey vs CoCounsel (Drittblog): https://claudeforlawyers.com/blog/harvey-vs-cocounsel
- Legal-MCP-Connectoren (Drittblog): https://claudeforlawyers.com/blog/mcp-connectors-for-legal
- Harvey/Legora Bewertungen: https://www.lawyer-monthly.com/2026/08/legora-10bn-valuation-harvey-15bn-ai-funding/ und https://www.cnbc.com/2026/03/25/legal-ai-startup-harvey-raises-200-million-at-11-billion-valuation.html (nur als Suchtreffer, Fetch 403)
- LexisNexis-Harvey-Allianz: https://www.lawnext.com/2025/06/legal-ai-platform-harvey-to-get-lexisnexis-content-and-tech-in-new-partnership-between-the-companies.html
- Clio/vLex: https://www.isba.org/dailylegalnews/2025/11/11/cliocompletes1bacquisitionofvlexandannounces5bcomp
- CUBE/4CRisk: https://fintech.global/2026/02/19/cube-and-4crisk-unite-on-ai-driven-compliance/
- CUBE 2026: https://fintech.global/2026/09/02/cube-turns-regulatory-overload-into-an-ai-advantage/
- CUBE Intel: https://cube.global/solutions/cube-intel
- CUBE bei CB Insights: https://www.cbinsights.com/company/cube-global
- Bloomberg/Regology: https://www.bloombergindustry.com/press-releases/bloomberg-industry-group-regology/ (Suchtreffer) und Analyse https://www.shashi.co/2026/06/bloomberg-buys-regology-legal.html
- Regulatory-Change-Überblick: https://www.centraleyes.com/best-regulatory-change-management-software/
- Corlytics: https://www.corlytics.com/
- RegAlytics: https://www.regalytics.ai/ und https://www.regalytics.ai/pricing
- Reg-Track: https://www.reg-track.com/
- legislation.gov.uk URIs: https://www.legislation.gov.uk/developer/uris ; Atom: https://www.legislation.gov.uk/developer/formats/atom
- UK Legislation Changes: https://uk-legal-changes.pages.dev/docs
- eCFR Versioner (live): https://www.ecfr.gov/api/versioner/v1/titles.json ; eCFR-XML-Guide: https://github.com/usgpo/bulk-data/blob/main/ECFR-XML-User-Guide.md
- GovInfo-Developer: https://www.govinfo.gov/developers
- CELLAR (Vendor-Blog): https://polzia.com/blog/eur-lex-cellar-api-developers-guide ; cyanheads MCP: https://github.com/cyanheads/eur-lex-mcp-server
- AKN4EU: http://publications.europa.eu/resource/cellar/7675b2e4-5fbb-11eb-8146-01aa75ed71a1.0001.01/DOC_1
- Rechtsinformationsportal: https://testphase.rechtsinformationen.bund.de/ ; API-Doku: https://docs.rechtsinformationen.bund.de/ ; DigitalService: https://digitalservice.bund.de/en/projects/new-legal-information-system
- OpenLegalData: https://openlegaldata.io/
- Free Law Project: https://free.law/2026/05/07/api-included-in-memberships/ und https://free.law/2026/05/12/courtlistener-is-now-available-inside-claude/
- Lawstronaut: https://lawstronaut.com/mcp
- Midpage: https://www.midpage.ai/ ; Paxton: https://www.paxton.ai/ und https://www.paxton.ai/post/breaking-new-ground-paxton-secures-22m-series-a-to-transform-legal-ai ; Alexi: https://www.alexi.com/ ; Lexata: https://lexata.ai/
- Rules as Code Kanada (OECD OPSI): https://oecd-opsi.org/wp-content/uploads/2024/04/Rules-as-Code-in-Canada.pdf
- Catala: https://book.catala-lang.org/en/4-1-general.html
- AIRO: https://oecd.ai/en/catalogue/tools/airo-ai-risk-ontology ; arXiv-Preprint: https://arxiv.org/abs/2609.13535
