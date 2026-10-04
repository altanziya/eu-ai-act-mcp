# Research 02: Außereuropäische KI-Regulierung, Wettbewerb und Skalierbarkeit

**Stand:** 2026-10-03 · **Methode:** ca. 12 Suchen (Suchbudget danach erschöpft), ca. 45 gezielte Fetches · Verweise [n] siehe Quellenliste · **(U)** = unsicher/nur Sekundärquelle

## Executive Summary

1. **Der EU AI Act bleibt das einzige verbindliche, horizontale, risikobasierte KI-Gesetz mit großem Marktbezug.** Südkorea (in Kraft seit 22.01.2026) ist das einzige weitere, aber mit Bußgeld-Schonfrist von mindestens einem Jahr [10].
2. **Die USA sind kein Gegenmodell, sondern ein volatiles Flickwerk.** Colorados KI-Gesetz wurde vor dem Start ersetzt, die Bundesebene versucht Preemption, hat aber (Stand Aug-Okt 2026) nichts verabschiedet (U) [1][2][3].
3. **Colorado ist der Lehrfall für "versionierte Rechtslage":** SB 24-205, verschoben auf 30.06.2026, Durchsetzung gerichtlich blockiert (27.04.2026, nur eine Quelle), aufgehoben und ersetzt durch SB 26-189 (gilt ab 01.01.2027, nur noch Transparenz/Notice, kein Impact Assessment) [1][2].
4. **Der Rest der Welt setzt auf Soft Law:** UK, Kanada, Japan, Indien, Singapur, Schweiz und (bisher) Australien haben kein horizontales KI-Gesetz. Brasilien (PL 2338) hängt seit Dez 2024 in der Abgeordnetenkammer [13].
5. **Maschinenlesbare Primärquellen gibt es dort, wo Gesetze existieren:** Korea (Open API mit Gesetzeshistorie, englische Fassungen) [11], Brasilien (Open-Data-API) [13], Schweiz (ELI/SPARQL/Akoma Ntoso) [17], Colorado (Bill-Seiten) [2]. Das ist kein Hindernis, sondern ein Argument für ein jurisdiktionsagnostisches Datenmodell.
6. **Tracker sind überwiegend Newsletter, PDF oder Kanzlei-Webseiten.** IAPP (Mitglieder, kein API) [19], OECD.AI (keine API sichtbar) [20], White & Case (frei, Lead-Gen) [21]. Daten-/API-nahe Produkte sind Saidot (Knowledge Graph + REST) [24], Credo AI "Policy Packs/Policy Intelligence" (nur in der Plattform) [22], UCF (API, 1.000+ Vorschriften, kommerziell) [31], SCF (frei, OSCAL-JSON) [32].
7. **GDPR-Vorläufer:** Gewonnen haben Workflow-Plattformen (OneTrust, Ethyca), nicht Rechtstext-APIs. Regulatory Intelligence wurde als Feature eingekauft (OneTrust kaufte DataGuidance 2019) [27]. Das stützt B2B-Datenlizenz an Plattformen als Kanal, nicht Endkundenabo.
8. **Der "NIST-Crosswalk zu Colorado" existiert nicht.** NIST listet 13 Crosswalks (u.a. ISO 42001, ISO 23894, Singapur, Korea, Japan); keinen zu Colorado und keinen zum finalen AI Act [37]. Colorados neues Gesetz enthält keinen NIST/ISO-Safe-Harbor mehr [2].
9. **Crosswalks sind Commodity** (NIST, SCF, GitHub-Projekte, jeder Vendor). Moat kann nur **geprüfte, typisierte, versionierte Kanten mit Provenienz** sein, nicht die Mapping-Tabelle an sich.
10. **Die Omnibus-Verwässerung ist beschlossen und eingepreist** (Verordnung (EU) 2026/1744, in Kraft 27.07.2026). Weitere KI-spezifische Runden: in den geprüften Quellen kein Hinweis. Rechtsinstabilität erhöht den Bedarf an `as_of`/Diff, senkt aber die kurzfristige Zahlungsbereitschaft für Hochrisiko-Compliance bis 12/2027.

## 1. Stand der KI-Regulierung außerhalb der EU (Oktober 2026)

| Jurisdiktion | Stand / Datum | Risikobasiert | Maschinenlesbare Quelle |
|---|---|---|---|
| **US-Bund** | EO "Ensuring a National Policy Framework for AI" (11.12.2025): DOJ AI Litigation Task Force (eingerichtet 01/2026, Sekundärquelle [51]), Commerce-Prüfung "belastender" Landesgesetze bis 11.03.2026, Ausnahmen u.a. Kinderschutz [4]. Weißes-Haus-Gesetzesempfehlung zu Preemption (03/2026) [52]. Kein Bundesgesetz, keine beschlossene Preemption (U) [3]. NIST AI RMF 1.0 (2023) wird "im Rahmen des AI Action Plan" überarbeitet [38]. EO-Nummer in Quellen widersprüchlich, vor Zitat prüfen | nein | Federal Register/congress.gov-APIs (bekannt, nicht geprüft) |
| **Colorado** | SB 24-205 aufgehoben/ersetzt durch **SB 26-189** (signiert 14.05.2026, anwendbar 01.01.2027): Offenlegung bei ADMT in Beschäftigung, Finanzen, Gesundheit, Wohnen, Versicherung, Bildung, Behördenleistungen; 60 Tage Cure Period [1][2]. AG-Entwurf ADMT-Regeln, Kommentare bis 26.10.2026 (U) [3]. Folgeklagen (xAI, DOJ) erwartet [1] | nein (Notice-Ansatz) | leg.colorado.gov [2] |
| **Texas** | TRAIGA (HB 149) seit 01.01.2026: verbotene Zwecke, Offenlegung, nur AG-Durchsetzung [3][5] | nein | capitol.texas.gov (bekannt) |
| **Kalifornien** | SB 53 (Frontier-Transparenz) und AB 2013 (Trainingsdaten) seit 01.01.2026; CCPA-ADMT-Regeln gestaffelt bis 2027 [5]; SB 1000 (09/2026) ändert AI Transparency Act (U) [3] | teils (Schwellen) | leginfo.legislature.ca.gov (bekannt) |
| **Weitere Staaten** | Illinois HB 3773 seit 01.01.2026 [5]; NY RAISE Act signiert 12/2025, Wirksamkeitsdatum ungeprüft (U) [3] | nein | je Staat |
| **UK** | Thronrede 13.05.2026 ohne KI-Gesetz; Sektoraufsicht; Sandbox-Gesetz angekündigt, nicht eingebracht [6][53] | nein | legislation.gov.uk (bekannt) |
| **Kanada** | AIDA 01/2025 verfallen; Strategie "AI for All" 04.06.2026 ohne Gesetz, nur punktuelle Eingriffe (Deepfakes, Surveillance Pricing) [7] | nein | Justice Laws XML (bekannt) |
| **China** | GenAI-Zwischenmaßnahmen (2023, bekannt); **Kennzeichnungsmaßnahmen + GB 45438-2025 seit 01.09.2025** (sichtbar + Metadaten) [8]; geänderte Cybersecurity-Law mit KI-Klausel seit 01.01.2026 [9] | nein, Registrierungsregime | nur chinesische PDFs, keine API gefunden |
| **Südkorea** | **AI Basic Act seit 22.01.2026**; Bußgelder (bis 30 Mio. KRW, U) mit mind. einem Jahr Schonfrist, Fokus auf Guidance [10] | **ja** (High-Impact, GenAI-Kennzeichnung) | **law.go.kr Open API** (XML, Historie, englisch) [11] |
| **Japan** | AI Promotion Act (28.05.2025), Grundlagengesetz ohne Sanktionen; AI Basic Plan [12] | nein | e-Gov (nicht geprüft) |
| **Brasilien** | PL 2338/2023: Senat 10.12.2024, Kammer "Aguardando Parecer", letzte Aktualisierung 02.09.2026 [13]; Wahl 04.10.2026 (Allgemeinwissen) | ja (Entwurf) | **Open-Data-API Câmara** [13] |
| **Indien** | AI Governance Guidelines (05.11.2025), nicht bindend, bestehendes Recht (IT Act, DPDP) [14] | nein | PDF |
| **Singapur** | Model AI Governance Framework for Agentic AI (22.01.2026), freiwillig [15] | nein | PDF/HTML |
| **Australien** | National AI Plan setzt auf bestehendes Recht [18]; Meldung über verbindliche "AI Standards" (Gesetz Anfang 2027) nur in einer Sekundärquelle (U) | offen | legislation.gov.au (bekannt) |
| **Schweiz** | Bundesrat 12.02.2025: sektoral, Ratifikation der CoE-KI-Konvention, Vernehmlassungsentwurf bis Ende 2026; Exporteure müssen EU-Recht direkt erfüllen [16] | nein | **Fedlex** (ELI, SPARQL, Akoma Ntoso) [17] |

**Lesart:** Verbindlich und bußgeldbewehrt sind nur EU, Korea (Schonfrist), Texas/Kalifornien/Illinois punktuell und China (Inhalte/Kennzeichnung). Risikoklassifikation im EU-Sinn gibt es außerhalb der EU nur in Korea und im brasilianischen Entwurf.

## 2. Wer trackt global?

| Anbieter | Typ | Daten/API? | Preis |
|---|---|---|---|
| IAPP Global AI Law & Policy Tracker | Chart/Map/PDF, Update 03.02.2026 | nur Mitglieder, **kein API** [19] | Mitgliedschaft (Preis ungeprüft) |
| OECD.AI Policy Navigator | Datenbank, 80+ Jurisdiktionen/Organisationen | frei, **keine API sichtbar**, Policy-Metadaten statt Rechtstext [20] | frei |
| White & Case "AI Watch", Bird & Bird Horizon Tracker | Länderseiten | HTML, Lead-Gen [21] | frei |
| Credo AI | Plattform; Policy Packs (EU AI Act, NIST, ISO 42001, SOC 2, HITRUST, NYC LL 144); "Policy Intelligence" aktualisiert Packs | **Export/API nicht dokumentiert** [22]; Partner: AWS, Microsoft, IBM, Capgemini, McKinsey, Booz Allen [23] | Enterprise, Angebot |
| Saidot | Plattform + Library: 260+ Risiken, 620+ Controls, 110+ Policies, REST + Webhooks [24] | **am nächsten an Daten-API** | Preisseite zeigt keine Zahlen; Suchsnippet nannte 1.000 EUR (SME) bis 3.100 EUR (Enterprise) (U) |
| Trustible, Holistic AI, OneTrust | Plattformen; Regulatory Intelligence als Funktion [25][26][27] | keine Rechtsdaten-API dokumentiert | nicht öffentlich; Marktindikation 50 k$+/Jahr (U) |
| Vanta, Drata | GRC; Vanta 35+ Frameworks inkl. ISO 42001, NIST AI RMF, EU AI Act, API für Kundendaten [28] | API für Evidence, nicht für Rechtstext | Drata ca. 15-60 k$+ (Vergleichsseite, U) [29] |
| FPF, Lumenova, FairNow, Enzai | nicht direkt geprüft | n/a | FairNow/Enzai: nur Angebot (U) |

**Befund:** Es gibt eine Gartner Magic Quadrant "AI Governance Platforms" 2026 (Trustible, Holistic AI erwähnt) [25][26]: Die Kategorie ist etabliert, aber die Rechtsinhalte stecken proprietär in Plattformen. **Eine öffentliche, versionierte, quellentreue Rechtsdaten-API über mehrere Jurisdiktionen habe ich nicht gefunden** (Absenz in begrenzter Suche, kein Beweis).

## 3. Pendants und GDPR-Vorläufer

| Projekt | Ansatz | Traktion |
|---|---|---|
| **UCF Common Controls Hub** | 1.000+ Vorschriften geparst, auf gemeinsame Controls gemappt, API [31] | kommerziell etabliert (Alter/Umsatz ungeprüft); KI-Tiefe offen |
| **SCF** | 1.500+ Controls, 200+ Gesetze/Frameworks, CSV + OSCAL-JSON, Creative Commons, quartalsweise Releases [32] | frei, weit verbreitet (U); drückt den Preis für Crosswalks |
| **NIST OSCAL / compliance-trestle** | maschinenlesbarer Standard für Controls [33] | staatlich getragen; AWS nutzt OSCAL für kanadische Anforderungen |
| MCP-Projekte: `uchit/mcp-regulated-ai-compliance` (28 Regulierungen, 20 Crosswalks, CC BY 4.0, v0.2.1 vom 29.05.2026), `mcp-server-scf`, `zavora-ai/mcp-compliance` | Wissensbasen, keine versionierten Volltexte; zavora ohne AI Act | **0-2 Sterne** [34][35][36]; MCP-for-Compliance ist ein unbewiesenes Nischenfeld |

**GDPR 2018-2020 (belegt):**
- **OneTrust** (2016, GDPR/CCPA): kaufte 03/2019 DataGuidance (Regulatory Intelligence), 2025 über 14.000 Kunden, 2022 Entlassung von 25 % der Belegschaft, 03/2026 Neupositionierung auf "AI-Ready Governance" [27].
- **Ethyca** (2018, "GDPR as code"): Open-Source Fides, 37,5 Mio. $ Gesamtfinanzierung, Pivot zu AI Governance, Kunden Mozilla, Ramp, Axios [30].
- **Muster (Interpretation):** Gewinner automatisierten Prozesse (Consent, DSAR, Data Mapping). Der Gesetzestext blieb gratis (EUR-Lex); reine Rechtstext-APIs fanden keine belegbare Zahlungsbereitschaft. Regulatory Intelligence überlebte als Baustein größerer Plattformen.
- **Gescheiterte Projekte:** habe ich nicht systematisch ermittelt (Suchbudget). Das Fehlen sichtbarer reiner "GDPR-API"-Unternehmen ist ein Indiz, kein Beleg.

## 4. Nachfrage-Geografie

- **Belegt:** Der AI Act gilt extraterritorial; US-Anbieter mit EU-Markt sind betroffen, gezielte Marktansprache löst Pflichten aus [43]. 21 GPAI-Code-of-Practice-Unterzeichner, darunter Amazon, Anthropic, Google, IBM, Microsoft, OpenAI, ServiceNow; xAI nur Sicherheitskapitel [42]. Ab 02.08.2026 kann die Kommission gegen GPAI-Anbieter Bußgelder verhängen [44].
- **Indirekt:** Käufer von AI-Governance-Plattformen sind überwiegend US/UK-Konzerne (Trustible: Leidos, Google, Databricks, Mass General Brigham; Holistic AI: Aon, eBay, GE HealthCare, Unilever, Siemens) [25][26]. Credos Partnernetz ist US-lastig [23]. Dort ist der AI Act ein Treiber neben NIST AI RMF, ISO 42001 und US-Staatsrecht (Interpretation).
- **Nicht gefunden:** Belastbare Zahlen, welcher Anteil der AI-Act-Käufer in den USA sitzt (IAPP-Report hinter Paywall). **Offene Frage.**
- **Kanal Big-4/Kanzleien:** Kanzleien nutzen Tracker als Lead-Gen [21]; Beratungen (McKinsey, Booz Allen, Capgemini) vertreiben Plattformen [23]. Big-4-Seiten waren nicht abrufbar. Hypothese: Sie sind eher Lizenznehmer/Distributoren eines Feeds als Endkunden eines Developer-Tools.

## 5. Interoperabilität und Obligation-Graph

- **Fakten:** NIST hostet 13 Crosswalks (ISO 23894, ISO 42005, ISO 5338/5339, AI 600-1 und AI RMF zu Singapur AI Verify, Korea TTA, Japan-Leitlinien, OECD/EU/EO 13960 vom 01/2023, Microsoft-Beitrag zu ISO 42001) und separat ein PDF AI RMF zu ISO/IEC 42001 [37]. **Kein Colorado-Crosswalk, keiner zum finalen AI Act.**
- **Qualitätsgrenzen:** ISO 42001 ist keine harmonisierte Norm, keine Konformitätsvermutung [41]. Akademisch: Rechtskonformität und freiwillige Zertifizierung sind nicht austauschbar, Risikoontologien passen nicht zusammen, Durchsetzung ist asymmetrisch [39]. Die gern genannte "70-80 % Überlappung" ist eine Vendor-Behauptung ohne Methodik (U) [41]. Art. 10 (Daten-Governance) geht deutlich über ISO/NIST hinaus.
- **Schema-Vorbild:** `atharshk/eu-ai-act-evidence-crosswalk` nutzt den AI Act als Rückgrat, 46 Pflichtzeilen, Relationen *substantially / partially / adjacent / no coverage*, Lücken pro Zeile benannt [40].
- **Rechte:** NIST AI RMF und US-Gesetze sind frei einbindbar; ISO-Text ist urheberrechtlich geschützt, nur Klausel-IDs/Titel (passt zu SPEC §4.1 "nie Normtext").
- **Moat-Bewertung:** Mapping selbst ist replizierbar. Verteidigbar: (a) Kanten mit Gültigkeitsintervall (Gesetz ändert sich, Mapping auch), (b) juristisch geprüfte Relationstypen mit Begründung und Fundstelle, (c) öffentliche Testsuite, (d) Status-Flags je Instrument (`in_force`, `enjoined`, `repealed_replaced`).

## 6. Verwässerungsrisiko

- **Beschlossen:** Omnibus (VO 2026/1744, ABl. 24.07., in Kraft 27.07.2026): Hochrisiko Anhang III auf 02.12.2027, Anhang I auf 02.08.2028; Art. 50 ab 02.08.2026, Altsysteme-Kennzeichnung bis 02.12.2026; neues Verbot (NCII/CSAM) ab 02.12.2026; GPAI-Altmodelle bis 02.08.2027; Art. 4 neu gefasst [44][45][50]. Begründung: fehlende Normen (Erwartung spät 2026) und verzögerte nationale Behörden [45][47].
- **Ausblick:** Ein separater "Digital Omnibus" (Daten/GDPR) steckt vor dem Trilog; die GDPR-AI-Act-Schnittstelle ist ungeklärt [48]. Für weitere KI-spezifische Runden fand ich in den geprüften Quellen **keinen Hinweis**; Quellen nennen die Änderung "gezielte Vereinfachung"/"strukturelle Rekalibrierung" [45][47]. Italien ergänzt nationale Straf- und Haftungsregeln (Gesetz 132/2025, Dekret 160/2026) [49].
- **Nicht belegt:** US-Druck auf den AI Act und belastbare Durchsetzungsprognosen Mitte/Ende 2026. Meine Quellen enthalten dazu nichts; das ist eine Lücke, kein Entwarnungssignal.
- **Einschätzung (Interpretation):** Verwässerung verschiebt Nachfrage, vernichtet sie nicht. Gleichzeitig steigt der Wert von Zeitachsen, `as_of` und Diffs (zwei Fassungen, Schonfristen). Realistisches Risiko ist **Nachfrageflaute 2027 vor Hochrisiko-Stichtag**, nicht Wegfall.

## Implikationen für unser Produkt

**Expansionspfad**
1. **EU vollständig zuerst** (Sekundärrecht, Normen, nationale Gesetze wie KI-MIG und Italien). Nur hier gibt es komplexe, bindende, risikobasierte Texte.
2. **Datenmodell jetzt jurisdiktionsagnostisch** machen: `jurisdiction`, `instrument_type` (Gesetz, Soft Law, Norm, Gerichtsentscheid), `status` mit `enjoined` und `repealed_replaced`, Edge-Typen. Kosten gering, Option groß.
3. **Canary Phase 2: Colorado + Kalifornien + Texas** als Beweis der Portabilität. Hohe Änderungsdichte, US-Nachfrage, ideal für Status-/Diff-Funktion. Nur mit "kein Rechtsrat"-Rahmen und Status-Flags (Klagen, Preemption).
4. **Phase 3: Korea** (risikobasiert, Open API mit Historie, Bußgelder ab ca. 2027), danach UK/Schweiz als Exportmärkte. China nur als Referenzeintrag (Kennzeichnung). Japan, Indien, Singapur, Australien als Soft-Law-Einträge. Brasilien beobachten.

**Moat-Kandidaten:** (1) Temporaler Graph (`as_of` + Diff + Status über Jurisdiktionen), (2) Provenienz mit wörtlichem Textabgleich, (3) geprüfte, versionierte Crosswalk-Kanten, (4) öffentliche Evals/Errata, (5) Distribution (MCP-Registries, pSEO), (6) offene Lizenz als Vertrauensanker wie bei `uchit` (CC BY).

**Risiken:** Crosswalk-Preisdruck durch SCF/NIST/GitHub; Plattformen pflegen Inhalte selbst (Credo "Policy Intelligence") und werden zu Wettbewerbern statt Kunden; nicht-EU-Recht braucht lokale Prüfung und Sprachkompetenz; US-Recht ist politisch volatil; MCP-Nische unbewiesen (0-33 Sterne); Scope Creep gegen SPEC §4.4; GDPR-Lehre: Rechtstext allein ist kein Produkt, er braucht Workflow-Einbettung oder Plattform-Lizenz.

## Evidenzqualität und offene Fragen

- **Suchbudget erschöpft** nach ca. 12 Suchen; Rest über Fetches. Viele 2026er Länderseiten (vorplabs, casrai, compliancehub.wiki, aipolicytracker.org, regulations.ai) sind SEO-/Aggregator-Content mit teils widersprüchlichen Angaben (z.B. EO-Nummer). Wo möglich Primärquellen (leg.colorado.gov, Câmara-API, EU-Kommission, NIST, MDDI, Fedlex) genutzt; sonst (U).
- **Nur eine Quelle:** Gerichtsblock Colorado 27.04.2026 [1]; Australien-Gesetzesplan 2027; SB 1000; NY-RAISE-Datum; Korea-Höchstbuße.
- **403/402/404 beim Abruf:** White & Case, Bird & Bird, Ropes & Gray, PwC, UCF-Seite; Inhalte dort nur aus Suchtiteln.
- **Offene Fragen:** siehe nächste Tabelle (budgetbedingt, für Folgesession).

## Budgetbedingt nicht beantwortet (Auftrag für Folgesession)

Das WebSearch-Budget (200/200) war nach ca. 12 Suchen aufgebraucht. Folgende Fragen sind **offen und gezielt nachzurecherchieren**; bis dahin gelten die betroffenen Aussagen als nicht belegt:

| # | Offene Frage | Warum offen | Vorschlag für Folgesession |
|---|---|---|---|
| 1 | Anteil US-Käufer an AI-Act-Compliance (Frage 4) | keine Zahlen gefunden, IAPP-Report hinter Paywall | IAPP AI Governance Profession Report 2025/2026, Credo/Trustible-Kundenreports, Survey-Suche "EU AI Act readiness US companies" |
| 2 | US-Druck auf den AI Act und Durchsetzungsprognosen Mitte/Ende 2026 (Frage 6) | keine Quelle gefunden | Suche "AI Act enforcement outlook 2026", Politico/Euractiv/MLex, EU-Handelsgespräche zu Digitalregeln |
| 3 | Weitere Omnibus-Runden für den AI Act | nur in einer Quelle (IAPP 24.09.2026) zum Daten-Omnibus erwähnt | Rat/Parlament-Seiten, Kommissions-"Digital Fitness Check" |
| 4 | Gescheiterte GDPR-Rechtsdaten-/GDPR-API-Startups (Frage 3) | nur Gewinner (OneTrust, Ethyca) belegt | Crunchbase/Press-Suche 2018-2022, Shutdown-/Acqui-Hire-Meldungen |
| 5 | Preise Saidot Library, Trustible, Credo, Holistic AI | Preisseiten ohne Zahlen, Snippet-Werte unbestätigt | Direkte Anfrage, Gartner Peer Insights, AWS/Azure-Marketplace-Listings |
| 6 | FPF, Lumenova, Enzai, FairNow, Drata | nicht abgerufen | Vendor-Seiten und FPF-Berichte direkt fetchen |
| 7 | Stand Commerce-Liste "belastender" Staatsgesetze (11.03.2026), DOJ-Klagen, Gerichtsblock Colorado (27.04.2026), EO-Nummer | nur Sekundärquellen, EO-Nummer widersprüchlich | Federal Register, justice.gov, PACER/Court Listener |
| 8 | Australien: verbindliche "AI Standards" (Gesetz Anfang 2027) | eine Sekundärquelle | industry.gov.au, Pressemitteilung PM/National Cabinet |
| 9 | NY RAISE Act Wirksamkeitsdatum, SB 1000 (Kalifornien), CCPA-ADMT-Fristen | nur Aggregator/uneinheitliche Quellen | nysenate.gov, leginfo.legislature.ca.gov, cppa.ca.gov |
| 10 | Korea: Inlandsvertreter-Pflicht für ausländische Anbieter, Bußgeldhöhen | nicht belegt | MSIT-Pressemitteilung, law.go.kr (englisches Gesetz) |
| 11 | Indien (IT-Rules zu synthetischen Inhalten), Japan e-Gov-API, Kanada/UK-API-Details | nicht geprüft | MeitY-Gazette, laws.e-gov.go.jp Doku |
| 12 | Big-4-Angebote zum AI Act (PwC, Deloitte, EY, KPMG) | Seiten lieferten 403 | Manueller Abruf oder Browser-Tool |

## Quellen

[1] https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/
[2] https://leg.colorado.gov/bills/SB26-189
[3] https://vorplabs.com/ai-regulatory-updates/united-states (Aggregator)
[4] https://www.ebglaw.com/workforce-bulletin/artificial-intelligence-regulation-at-a-crossroads-the-trump-administrations-preemption-push
[5] https://www.bakerbotts.com/thought-leadership/publications/2026/january/us-ai-law-update
[6] https://iapp.org/news/a/king-s-speech-signals-diffuse-uk-digital-policy-agenda-but-no-ai-bill
[7] https://www.bakermckenzie.com/en/insight/publications/2026/06/canada-federal-government-releases-refreshed-national-ai-strategy
[8] https://cms.law/en/chn/legal-updates/china-releases-ai-content-labeling-rules
[9] https://www.reedsmith.com/articles/china-approves-major-amendments-to-cybersecurity-law/ (nur Suchtreffer)
[10] https://regulations.ai/regulations/RAI-KR-NA-SUMMARY-2026
[11] https://open.law.go.kr/LSO/openApi/guideList.do
[12] https://oecd.ai/en/dashboards/policy-initiatives/act-on-promotion-of-research,-development,-and-utilization-of-artificial-intelligence-related-technologies
[13] https://dadosabertos.camara.leg.br/api/v2/proposicoes/2487262
[14] https://www.dsci.in/resource/content/summary-india-ai-governance-guidelines · https://www.ey.com/en_in/insights/ai/ai-governance-guidelines-a-bet-on-innovation (nur Suchtreffer)
[15] https://www.mddi.gov.sg/newsroom/singapore-launches-new-model-ai-governance-framework-for-agentic-ai--/
[16] https://pestalozzilaw.com/en/insights/news/legal-insights/switzerland-sets-its-course-on-ai-legislation-federal-council-out-lines-a-lean-regulatory-approach/
[17] https://www.fedlex.admin.ch/en/legal-data-publication-platform
[18] https://theconversation.com/australias-national-plan-says-existing-laws-are-enough-to-regulate-ai-this-is-false-hope-271725 (nur Suchtreffer)
[19] https://iapp.org/resources/article/global-ai-legislation-tracker
[20] https://oecd.ai/en/dashboards/overview
[21] https://www.whitecase.com/law/practices/data-privacy-cybersecurity/ai-regulatory (nur Suchtreffer)
[22] https://www.credo.ai/glossary/credo-ai-policy-pack
[23] https://www.credo.ai/partnerships
[24] https://www.saidot.ai/pricing
[25] https://trustible.ai/
[26] https://www.holisticai.com/
[27] https://www.onetrust.com/products/ai-governance/ · https://en.wikipedia.org/wiki/OneTrust
[28] https://www.vanta.com/
[29] https://aicompliancevendors.com/best/eu-ai-act-compliance-tools (Vergleichsseite)
[30] https://www.alleywatch.com/2024/12/ethyca-enterprise-data-privacy-ai-governance-governance-platform-cillian-keiran/
[31] https://developer2.unifiedcompliance.com/start-here.html · https://www.unifiedcompliance.com/controlsightapi (nur Suchtreffer)
[32] https://securecontrolsframework.com/
[33] https://github.com/oscal-compass/compliance-trestle
[34] https://github.com/uchit/mcp-regulated-ai-compliance
[35] https://github.com/MarkAC007/mcp-server-scf
[36] https://github.com/zavora-ai/mcp-compliance
[37] https://airc.nist.gov/airmf-resources/crosswalks/ · https://airc.nist.gov/docs/NIST_AI_RMF_to_ISO_IEC_42001_Crosswalk.pdf
[38] https://www.nist.gov/itl/ai-risk-management-framework
[39] https://arxiv.org/abs/2608.07515
[40] https://github.com/atharshk/eu-ai-act-evidence-crosswalk
[41] https://www.legalithm.com/en/blog/nist-ai-rmf-iso-42001-eu-ai-act-framework-crosswalk
[42] https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai
[43] https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html?id=102nbon
[44] https://www.mayerbrown.com/en/insights/publications/2026/07/eu-ai-act-news-digital-omnibus-on-ai-new-guidance-on-risk-classification-gpai-and-transparency-obligations
[45] https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/
[46] https://artificialintelligenceact.eu/ai-act-explorer/digital-omnibus/
[47] https://www.aiacto.eu/en/blog/digital-omnibus-ai-act-report-2027
[48] https://iapp.org/news/a/notes-from-the-iapp-europe-children-online-future-of-ai-and-eu-digital-laws-clarifications
[49] https://iapp.org/news/a/italys-ai-framework-operationalizing-the-eu-ai-act
[50] https://iapp.org/news/a/eu-ai-act-literacy-changes-may-complicate-more-than-simplify-compliance
[51] https://introl.com/blog/trump-ai-preemption-executive-order-state-laws-2026 (nur Suchtreffer)
[52] https://www.ropesgray.com/en/insights/alerts/2026/03/the-white-house-legislative-recommendations-national-policy-framework-for-artificial-intelligence-an (nur Titel/Suchtreffer)
[53] https://www.twobirds.com/en/insights/2026/ai-in-the-kings-speech-2026-regulating-for-growth-bill-announced (nur Suchtreffer)
