# 06 – Nachfragesignale für einen AI-Act-Rechtsdaten-Layer

**Stand:** 2026-10-03 · **Analyst:** Claude (Research-Agent) · **Bezug:** SPEC.md §0–2, §7

## Methodik und Grenzen (zuerst lesen)

Das WebSearch-Budget der Session war nach 7 erfolgreichen Suchen erschöpft (200/200). Danach habe ich direkte Datenquellen genutzt: HN-Algolia-API, GitHub-API (`gh`), npm-Registry, MCP-Registry, Wikimedia-Pageviews, Stack-Exchange-API, Job-Board-APIs und WebFetch auf Einzelseiten. **Nicht erreichbar:** Reddit (curl und WebFetch geblockt), LinkedIn, X, Dev.to-Suche, IAPP-2026-Report, Bitkom-Pressearchiv, KoKIVO/BNetzA, IHK-Webinare. Frage 2 (Juristen-Stimmen) und die deutschen Signale in Frage 4 sind deshalb nur dünn beantwortet. Zitate mit **(WF)** stammen aus einer WebFetch-Extraktion und sind nicht per Skript gegen den Rohtext geprüft. Alle anderen Zitate wurden direkt aus API-Rohtext übernommen.

## Executive Summary

1. **Interesse am Thema ist real und wächst, Zahlungsbereitschaft für Rechtstext-Infrastruktur ist nicht belegt.** GitHub-Issues/PRs mit „EU AI Act“: 19 (Jan 2025) auf 3.322 (Aug 2026). Aber ein Großteil davon ist Vendor-Seeding (siehe 1.2).
2. **Das Angebot ist überfüllt.** Im offiziellen MCP-Registry stehen mindestens 17 AI-Act-Server, nicht vier wie in SPEC §1.2. Neue GitHub-Repos mit „AI Act“: 246 (Jul 2025) auf 2.533 (Aug 2026) pro Monat.
3. **Direkte Konkurrenz auf dem Vendor-Tier existiert bereits:** AI Act Radar (Change-Feed, Webhook, REST, MCP; Team-Tier gratis, kommerziell ab 500 €/Monat) trifft fast exakt die Spec-Idee und den Spec-Preis.
4. **Entwickler (Zielgruppe 1a): Signal mittel bis schwach.** Hohes Interesse an Art. 50 (HN „How Claude marks AI-generated content“: 451 Punkte, 424 Kommentare), aber organische Fragen sind selten (Stack Overflow: 0 Fragen), und die meistgenutzten AI-Act-Tools erreichen nur 0,3–2,3 k npm-Downloads/Monat.
5. **Tool-Hersteller (Zielgruppe 1b): Signal schwach (unbestätigt).** Keine öffentliche Stellenanzeige für „Regulatory Content“ gefunden, kein Hersteller klagt öffentlich über Rechtstextpflege. Holistic AI hat ein eigenes „Policy & Regulatory“-Team, bevorzugt also Eigenbau.
6. **Verwirrung durch Omnibus ist gut belegt (stark), aber von Anwaltskanzleien und Newslettern, nicht von zahlenden Nutzern.** Das stützt die „Fassung und Stichtag“-These inhaltlich, nicht kommerziell.
7. **Echte Entwicklerschmerzen sind andere als „Rechtstext nachschlagen“:** Rollenklärung (Provider/Deployer), „gilt Art. 50 für mich?“, Nachweis gegenüber der Compliance-Abteilung, Audit-Logging (Art. 12).
8. **KMU/Compliance-Mitarbeitende (Zielgruppe 2): Signal schwach bis mittel.** Verwirrung ja, Zahlungsbereitschaft nein. Kostenlose Alternativen: EU-Compliance-Checker, Legalithm, ComplyLayer Free.
9. **Preisanker aus dem Markt:** 29–49 €/Monat (Solo/Starter), 99–249 €/Monat (Pro), 500 €/Monat (OEM/White-Label), 1.500 €/Jahr je Produkt (Legalithm, Billing noch inaktiv). Die Spec-Hypothesen liegen im Rahmen, aber niemand weist Umsätze aus.
10. **Gesamturteil:** Als Portfolio- und Reichweitenprojekt sinnvoll, als Einkommensquelle unbewiesen. Vor weiterem Bauen: 5–10 Gespräche mit Tool-Herstellern und eine Wartelisten-Landingpage.

| Zielgruppe | Nachfrage-Evidenz | Zahlungsbereitschaft-Evidenz |
|---|---|---|
| Entwickler/Agent-Builder | mittel (Interesse), schwach (organische Fragen) | schwach |
| Compliance-Tool-Hersteller | schwach | schwach (Preisanker vorhanden, keine Kunden belegt) |
| KMU/Legal mit ChatGPT/Claude | mittel (Verwirrung belegt) | schwach |
| Forschung/Lehre | nicht untersucht | nicht untersucht |

## 1. Entwicklerstimmen 2025–2026

### 1.1 Organische Stimmen (wenige, aber konkret)

- **Gilt das für mich? (open-webui, 12.05.2025).** Nutzer fordert ein Wasserzeichen beim Kopieren: „The EU AI Act demands that AI-Generated content comes with a watermark when exported from a tool.“ Ein Mitwirkender: „But I am confused. The AI Act does not mandate this, only if the content is to be meant for "communicating to the public"?“ ([Discussion #13818](https://github.com/open-webui/open-webui/discussions/13818)). Das ist die Rollen-/Scope-Frage in Reinform.
- **Nachweis für die Compliance-Abteilung (llama.cpp, 27.08.2026).** Ein Jurist im Entwicklerprojekt: „someone has asked me to provide "proof" that our local AI does not generate text with hidden watermarks. How do you provide proof of something that is not there?“ Außerdem: „If I download a model and run it on llama.cpp and operate a chatbot with these components, then I am in scope“ ([Discussion #27826](https://github.com/ggml-org/llama.cpp/discussions/27826)). Das ist das stärkste „Job to be done“, das ich gefunden habe: ein Beleg mit Fundstelle, den jemand intern vorzeigen kann.
- **Unklare Auslegung (HN, 10.01.2026).** PeterStuer: „the interpretation of what the defacto requirements for what compliance with the ai act entails still is in high flux and changing on a weekly basis.“ ([Kommentar](https://news.ycombinator.com/item?id=46566791), Show-HN-Thread EuConform, 71 Punkte, 49 Kommentare, größtenteils aber Namens- und Politikdebatte).
- **Last für Gründer (HN, 28.10.2025).** clickety_clack: „between the AI act and GDPR, there's a set of potential traps laid out for you to step into, along with reams of paperwork. All that requires lawyers and compliance consultants to help you figure it out“ ([Kommentar](https://news.ycombinator.com/item?id=45739655)).
- **Technische Marking-Frage (HN, 26.02.2026).** parliament32: „Note that watermarking (yes, including text) is a requirement of the EU AI Act, and goes into effect in August 2026“ ([Kommentar](https://news.ycombinator.com/item?id=47170356)). Am 10.08.2026 kündigte Anthropic Text-Wasserzeichen an; ein Kommentar dazu: „The true reason is legal.“ ([Kommentar](https://news.ycombinator.com/item?id=49261897)). Der Thread (451 Punkte) diskutiert fast nur die Technik, nicht Compliance-Tools.
- **Nachfrage-Dämpfer:** Der Ask HN „How are you handling EU AI Act compliance as a developer?“ (26.02.2026) hat **1 Punkt und 6 Kommentare**, die Antworten stammen überwiegend von Anbietern ([Thread](https://news.ycombinator.com/item?id=47170391)). Auf Stack Overflow gibt es **keine** Frage mit „EU AI Act“ im Titel (API-Abfrage 03.10.2026), auf law.stackexchange eine einzige (19.02.2025, 0 Votes).

### 1.2 Vendor-Seeding statt Nutzerbedarf

Die meisten GitHub-Issues zum AI Act in Agent-Frameworks stammen von Anbietern. Beispiel LangChain #35357 („Structured compliance audit logging for EU AI Act (Article 12)“, 20.02.2026): Der Autor schloss es selbst am 23.02.2026 mit „Closing — this issue was opened prematurely. Apologies for the noise.“ Darunter bewerben sich über Monate mindestens fünf Anbieter („Hey! We're building exactly this — AgentAudit …“, 16.04.2026) ([Issue](https://github.com/langchain-ai/langchain/issues/35357)). Ähnlich: CrewAI #4845 bewirbt den AIR-Blackbox-Scanner und verweist auf gleichartige Posts bei Haystack. Ein ehrlicher Nutzer-Wunsch ist selten, z. B. LangChain #36173: „There is currently no documentation helping deployers understand their regulatory obligations.“ (23.03.2026, 3 Kommentare, [Issue](https://github.com/langchain-ai/langchain/issues/36173)).

**Gewünschte Tools (aus den Quellen):** Audit-Logging nach Art. 12 (dominant, aber Hochrisiko-Pflicht, nach Omnibus erst ab 02.12.2027), Art.-50-Marking/Disclosure-Bausteine, Rollen-/Risikoklassifizierung, „AI-BOM“/Inventar, Nachweis-Reports. „Rechtstext mit Version abrufen“ wird nirgends als Wunsch geäußert.

## 2. Compliance-/Legal-Stimmen (dünn)

LinkedIn, IAPP-Blogs und Podcasts waren nicht erreichbar. Belegt sind nur frei zugängliche Kanzlei- und Newsletter-Texte:

- **Zwei-Fassungen-/Omnibus-Verwirrung:** Elevate Consult (10.09.2026) **(WF)**: „What that coverage largely missed is that the Omnibus explicitly left Article 50 untouched.“ und „Many organizations read the headlines about the EU's Digital Omnibus pushing back the Act's most demanding requirements, filed the entire regulation under next year's problem, and moved on.“ ([Artikel](https://elevateconsult.com/insights/eu-ai-act-article-50-icp-impact/)). Mark R. Hinkle **(WF)**: „The delay covers less than the headlines suggest“ und „I run a media company, and I nearly missed the media-labeling provisions.“ ([Newsletter](https://www.theaienterprise.io/p/eu-ai-act-omnibus-reprieve-strategy), Datum nicht erfasst).
- **Rollenklärung als Pflichtschritt:** Morgan Lewis (12.08.2026) **(WF)**: „the first key steps should be identifying whether the organisation is a provider or deployer relative to the AI system“ ([Blog](https://www.morganlewis.com/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august)).
- **Marktüberwachung läuft an:** HN-Thread „The EU has begun enforcing the AI Act: first RFIs to model providers“ (31.08.2026, 101 Kommentare, [Thread](https://news.ycombinator.com/item?id=49505351)) enthält vor allem Regulierungs-Grundsatzdebatte, kaum Praxisfragen.
- **Nicht gefunden:** konkrete Berichte über Halluzinationen von ChatGPT/Claude zum AI Act oder veraltete Tools. Das Argument „LLMs erfinden Artikelnummern“ taucht nur in Anbieter-Marketing auf (z. B. „zero LLM calls“-Blog von OpenComplAI, 24.09.2026, 4 HN-Punkte), nicht als Nutzerklage.

## 3. Compliance-Tool-Hersteller als Kunden

| Hersteller | Befund | Quelle |
|---|---|---|
| OneTrust | 90 offene Stellen, 6 davon „AI Governance“-Engineering; keine Content-/Regulatory-Rolle | Greenhouse-API, 03.10.2026 |
| Vanta | 84 Stellen, 3 GRC-nah (Produkt/Pre-Sales), keine Rechtscontent-Rolle | Ashby-API |
| Trustible | HN „Who is hiring“ 01.09.2026: Agentic/Forward-Deployed Engineers, keine Content-Rolle | [HN](https://news.ycombinator.com/item?id=49524822) |
| Holistic AI | Hat „Policy & Regulatory“-Team: „Translate the EU AI Act, ISO 42001, NIST AI RMF and state laws into controls customers can run.“ Aktuell keine Stellen | [Careers](https://www.holisticai.com/careers) |
| Drata, Credo AI | keine relevanten Stellen sichtbar | Ashby-API |
| Saidot, Enzai, Annexa, TrailBit | nicht prüfbar (Seite 404 / keine API) | – |

Fazit: **Kein öffentlicher Beleg, dass Hersteller Rechtstextpflege auslagern wollen.** Wer es ernst meint, hat ein internes Team (Holistic AI) oder baut selbst: Legalithm wirbt mit „versioned, cited text of EU product regulation, kept current“ **(WF)** und liefert CLI, MCP-Server und GitHub Action. Konkurrenz auf dem Vendor-Tier: AI Act Radar („Commercial re-use: from €500/month (white-label, SLA, versioned schema)“ **(WF)**, [Seite](https://aiactradar.com)) und AI Law Tracker (OEM/White-Label ab 499 $/Monat, [Preise](https://ai-law-tracker.com/pricing)).

## 4. Nachfragevolumen

| Signal | Wert | Einordnung |
|---|---|---|
| Wikipedia EN „Artificial Intelligence Act“ | 10.517 (Aug 2024), 8.827 (Aug 2025), 12.480 (Aug 2026), 9.972 (Sep 2026) Views/Monat | flach; GDPR-Artikel: 82.459 auf 26.021 |
| Wikipedia DE „Verordnung über künstliche Intelligenz“ | ca. 2.000/Monat, Juli 2026 5.411 | sehr klein |
| artificialintelligenceact.eu (Similarweb **(WF)**) | Rang 172.098, ca. 279 k Besuche in 3 Monaten (rund 93 k/Monat), DE 17,75 %, −1,34 % MoM | grobe Schätzung |
| EU AI Act Newsletter (Substack) | über 59.000 Abonnenten | echtes Interesse an Updates |
| GitHub-Issues/PRs „EU AI Act“ | Jan 2025: 19; Okt 2025: 157; Mär 2026: 1.556; Aug 2026: 3.322; Sep 2026: 2.733 | starkes Wachstum, aber Bot-/Vendor-lastig |
| GitHub-Repos „AI Act“ (neu pro Monat) | 246 (Jul 2025) auf 2.533 (Aug 2026) | Angebotsexplosion |
| Topic `eu-ai-act` | 1.296 Repos; Spitze Hiepler/EuConform 125 Sterne | Top-Tools klein |

**npm-Downloads letzte 30 Tage (02.09.–01.10.2026; enthalten Bots/CI):**

| Paket | Downloads |
|---|---|
| trustlint (Offline-AI-Act-Linter) | 2.344 (Aug: 2.135, Sep: 2.158; kein Aug-2-Sprung) |
| @readystack/ai-act-article-50-audit | 1.542 (alles im Sep 2026) |
| @lexbeam-software/eu-ai-act-mcp | 693 |
| legalithm / legalithm-mcp-server | 544 / 271 |
| @systima/aiact-audit-log | 332 |
| sovereign-ai-act-mcp | 287 |
| @euconform/core | 187 |
| eu-ai-act-compliance-mcp (CSOAI) | 42 |

GitHub-Sterne der AI-Act-MCPs und CI-Scanner: SonnyLabs 33, OpenComplAI 17, ark-forge 11, asqav-compliance 10, cyanheads/eur-lex 8, sovereign 0. **Service-Desk-Anfragevolumen:** die Seite nennt keine Zahlen. **Deutsche Signale (Bitkom, IHK, KoKIVO):** nicht erreichbar, keine Daten.

## 5. Zahlungsbereitschaft

Belastbare Umfragedaten zu Budgets habe ich nicht gefunden. Der IAPP AI Governance Profession Report 2025 (Befragung Frühjahr 2024, 670+ Befragte) enthält laut Extraktion **(WF)** keine Budgetzahlen: 77 % arbeiten an AI Governance, Verantwortung liegt bei Privacy (22 %) und Legal/Compliance (22 %), 1,5 % brauchen kein zusätzliches Personal ([Report](https://iapp.org/resources/article/ai-governance-profession-report/)). Deloitte, KPMG, appliedAI und Bitkom konnte ich nicht abrufen. **Was ich habe, sind Preisanker der Anbieter** (Angebot, kein Beleg für Zahlungen):

| Anbieter | Preis | Besonderheit |
|---|---|---|
| Legalithm | ab 1.500 €/Jahr je Produkt | Billing „not yet active“ **(WF)**; Gratis-Tools |
| ComplyLayer | Free; Pro 149 $/Monat oder 1.499 $/Jahr | API nur Enterprise |
| Ansvar (EU-Regulierungen) | Free; 29 €/Monat Solo; 249 €/Monat Premium; 490 €/Monat/Seat; 2.000 €/Monat Company | MCP-Gateway „Cited, OAuth + paid“ |
| AI Law Tracker | Free; 49/99/299 $/Monat; OEM ab 499 $; Enterprise ab 12.000 $/Jahr | „first 10 founding customers“ gesucht |
| AI Act Radar | Team gratis; kommerziell ab 500 €/Monat | keine Kundenzahlen, „beta, open“ |

Daraus folgt: Preise von 29–49 €/Monat für Entwickler und rund 500 €/Monat für Vendor sind marktüblich. Dass jemand sie zahlt, ist nirgends nachgewiesen; mehrere Anbieter geben Kernfunktionen gratis ab. „Software-only vs. Mensch + Software“ lässt sich aus meinen Quellen nicht beantworten.

## 6. Agent-Builder als Zielgruppe

- **Compliance-as-Code existiert als Angebot:** GitHub Actions/Linter wie asqav-compliance, systima-ai/comply, ark-forge/eu-ai-act-scanner, OpenComplAI (HN „Show HN“, 14.08.2026: 7 Punkte, 0 Kommentare), Legalithm-Action, trustlint (npm). **Nachfrage dafür ist klein:** 0–17 Sterne, vierstellige Downloads.
- **MCP-Ökosystem:** Mindestens 17 AI-Act-Einträge im offiziellen Registry, u. a. ai-act-radar (seit 04.08.2026), sovereign-ai-act-mcp, ark-forge, CSOAI/MEOK (viele Generatoren), Ansvar, Legalithm, `ai-act-article-50-audit` (18.09.2026).
- **Framework-Communities:** In LangChain, LlamaIndex, CrewAI, AutoGen, n8n, OpenAI-Agents liegen zahlreiche AI-Act-Issues (Audit-Logging, „Receipts“, Governance-Layer), fast durchgehend von Anbietern eröffnet; Viele davon sind geschlossen (Status laut `gh search`), einige offen. Ein AutoGen-Issue zu „Cryptographic action receipts“ hat 402 Kommentare ([Issue](https://github.com/microsoft/autogen/issues/7353)); ich habe die Kommentare nicht einzeln auf Anbieterherkunft geprüft. Das spricht für Aufmerksamkeit, belegt aber keinen Nutzerbedarf.
- **Substitut:** Microsoft `agent-governance-toolkit` (6.382 Sterne) ordnet AI-Act-Bezüge ein.

## Top-10 wiederkehrende Nutzerfragen (Basis für Eval-Set)

Direkt belegt = Quelle oben; abgeleitet = aus Spec/Aufgabenstellung, dünne Evidenz.

1. Bin ich Provider oder Deployer für mein System? (belegt: Morgan Lewis, llama.cpp)
2. Gilt Art. 50 für meinen Chatbot, auch bei rein internem Einsatz? (belegt: open-webui)
3. Muss ich Textausgaben maschinenlesbar kennzeichnen, und wer ist verpflichtet (Modellanbieter, Framework, Betreiber)? (belegt: llama.cpp, HN)
4. Was hat der Omnibus geändert, was gilt jetzt, was erst später (Art. 50 seit 02.08.2026; Marking-Schonfrist Bestandssysteme bis 02.12.2026; Annex III 02.12.2027)? (belegt: Elevate, Hinkle)
5. Fällt mein Open-Source-/Fine-Tuning-Setup unter GPAI-Pflichten? (abgeleitet; teilweise llama.cpp-Thread)
6. Ist mein Use Case Hochrisiko nach Annex III? (abgeleitet; EuConform, Klassifizierer-Tools)
7. Welche Logging- und Aufbewahrungspflichten gelten (Art. 12), und wie passt das zur DSGVO-Löschung? (belegt: HN Art.-12-Thread, 03.–05.03.2026)
8. Wie belege ich Compliance gegenüber Compliance-Abteilung, Kunde oder Auditor? (belegt: llama.cpp, HN)
9. Welche Deployer-Pflichten habe ich (Art. 4 KI-Kompetenz, Art. 26)? (belegt: LangChain #36173)
10. Wo steht das genau, in welcher Fassung, und was gilt national (KI-MIG, BNetzA)? (abgeleitet aus Spec; nicht direkt belegt)

## Implikationen für Produkt und Priorisierung

1. **Spec §1.2 und §1.3 korrigieren:** Es gibt ≥17 AI-Act-MCPs, und „Workflow-Tools haben kaum APIs“ stimmt nicht mehr (AI Act Radar, AI Law Tracker, Ansvar, ComplyLayer Enterprise).
2. **Differenzierung nicht über „Rechtstext + Feed“, sondern über Beleg und Fassung:** Antwort mit Fundstelle, Fassung (2024 vs. 2026) und Stichtag, dazu ein zitierfähiger Nachweis-Export für interne Compliance. Das trifft Fragen 4 und 8, die einzigen mit klarem Schmerz.
3. **Art. 50 vor Art. 12 priorisieren:** Art. 50 gilt jetzt und erzeugt echte Fragen; Art.-12-Logging ist überlaufen und Hochrisiko (verschoben).
4. **Vendor-Tier erst validieren:** 5–10 Interviews mit Trustible, Saidot, Legalithm, ComplyLayer & Co., bevor Vertrieb gebaut wird. Preisanker 500 €/Monat ist belegt, Kunden nicht.
5. **Erwartungen kalibrieren:** Die erfolgreichsten AI-Act-Pakete liegen bei 0,3–2,3 k Downloads/Monat. Free/Pro erzeugt Reichweite für das Portfolio, kaum Umsatz (deckt sich mit Spec §7).
6. **Report (PDF) und Eval-Set zuerst:** Das Eval-Set aus den Top-10 ist billig und stärkt den Qualitätsanspruch (ChatGPT-Halluzination bleibt als Verkaufsargument unbelegt).
7. **Kill-/Pivot-Kriterien setzen**, z. B. keine einzige zahlende Vendor-Anfrage nach 8 Wochen Landingpage plus Registry-Listing.

## Evidenzqualität und offene Fragen

- **Stark:** GitHub-/npm-/Registry-/Wikipedia-Zahlen (maschinell abgefragt, aber Bots, CI und Vendor-Spam verzerren). Omnibus-Verwirrung (mehrere unabhängige Quellen).
- **Mittel:** HN-Zitate (wörtlich, aber kleine Stichprobe, viele Anbieter als Antwortende). Similarweb-Schätzung.
- **Schwach/fehlend:** Reddit, LinkedIn, X, Dev.to (nicht erreichbar); Juristen-Podcasts; IAPP 2026; Deloitte/KPMG/appliedAI/Bitkom-Budgets; IHK/KoKIVO; Service-Desk-Volumen; Stellenanzeigen kleiner Anbieter.
- **Offen:** Zahlen sich Hersteller für gepflegte Rechtsdaten? Wie viele Nutzer hat AI Act Radar? Gibt es dokumentierte LLM-Fehler zum AI Act? Wie groß ist der DACH-KMU-Markt für Ersteinschätzungen?
- **Empfehlung:** WebSearch-Budget anheben (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`) und Reddit/LinkedIn/Bitkom/IAPP gezielt nachrecherchieren oder manuell prüfen.

## Quellen

- HN-Threads: [Ask HN Compliance](https://news.ycombinator.com/item?id=47170391), [EuConform Show HN](https://github.com/Hiepler/EuConform) (HN-ID 46557823), [Claude-Marking-Thread](https://news.ycombinator.com/item?id=49261897), [EU-RFI-Thread](https://news.ycombinator.com/item?id=49505351), [Art.-12-Show-HN](https://news.ycombinator.com/item?id=47230438), [Trustible hiring](https://news.ycombinator.com/item?id=49524822), [AI Law Tracker Show HN](https://news.ycombinator.com/item?id=48934603)
- GitHub: [open-webui #13818](https://github.com/open-webui/open-webui/discussions/13818), [llama.cpp #27826](https://github.com/ggml-org/llama.cpp/discussions/27826), [LangChain #35357](https://github.com/langchain-ai/langchain/issues/35357), [LangChain #36173](https://github.com/langchain-ai/langchain/issues/36173), [CrewAI #4845](https://github.com/crewAIInc/crewAI/issues/4845), [AutoGen #7353](https://github.com/microsoft/autogen/issues/7353), [agent-governance-toolkit](https://github.com/microsoft/agent-governance-toolkit)
- Kanzleien/Newsletter: [Morgan Lewis](https://www.morganlewis.com/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august), [Elevate Consult](https://elevateconsult.com/insights/eu-ai-act-article-50-icp-impact/), [The AI Enterprise](https://www.theaienterprise.io/p/eu-ai-act-omnibus-reprieve-strategy), [IAPP 2025](https://iapp.org/resources/article/ai-governance-profession-report/)
- Anbieter: [AI Act Radar](https://aiactradar.com), [Legalithm](https://legalithm.com), [Ansvar](https://ansvar.eu/pricing), [AI Law Tracker](https://ai-law-tracker.com/pricing), [ComplyLayer](https://complylayer.com/pricing), [Holistic AI](https://www.holisticai.com/careers)
- Datenabfragen am 03.10.2026: HN-Algolia-API, GitHub Search/GraphQL-API, npm-Downloads-API, [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=ai-act), Wikimedia-Pageviews-API, Stack-Exchange-API, Greenhouse/Ashby-Job-Board-APIs, [Similarweb](https://www.similarweb.com/website/artificialintelligenceact.eu/), [EU AI Act Newsletter](https://artificialintelligenceact.substack.com/), [AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en)
