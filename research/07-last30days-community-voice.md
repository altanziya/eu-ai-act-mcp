🌐 last30days v3.25.0 · synced 2026-10-03

What I learned:

**Art. 50 gilt im Netz längst als "in Kraft", aber niemand nennt eine Fassung** - Im deutschsprachigen X wird die Kennzeichnungspflicht wie geltendes Recht behandelt: [@DoWa50488](https://x.com/DoWa50488/status/2104577111671603317) schreibt "Die gesetzliche Kennzeichnungspflicht für KI-Inhalte in Deutschland gilt seit dem 2. August 2026 gemäß Artikel 50 der EU-KI-Verordnung (AI Act)", [@senfdazunet](https://x.com/senfdazunet/status/2103824866810143214) warnt vor "strengen Vorgaben, z.B. muss man insbesondere Deepfakes kennzeichnen". Keiner der gesichteten Beiträge nennt einen Textstand, eine Fassung oder die Omnibus-Änderungen.

**Parallel läuft die Gegenerzählung "verschoben"** - [@Kaiseinleben](https://x.com/Kaiseinleben/status/2105576211166724153) macht daraus einen Verkaufsaufhänger: "KI-Regeln verschoben. Eine nicht." Unter einem Video von Philip Thomas ergänzt [@sebpiet845](https://www.youtube.com/watch?v=fyVFfuTcnZU), "Artikel 4 wird durch den Digital Omnibus von einer Ergebnis- zu einer Bemühungspflicht" (3 Likes). Die Techmeme-Meldung zur Parlamentsabstimmung bei [The Verge](https://www.theverge.com/ai-artificial-intelligence/901315/eu-ai-act-delays-ban-nudify-apps) nennt für Hochrisiko-Systeme Dezember 2027 (Datum der Meldung in den Daten nicht erkennbar). Das sind drei Schichten desselben Gesetzes mit unterschiedlichen Daten und ohne gemeinsame Referenz.

**Die Fragen kommen von Laien und betreffen Randfälle, nicht Rollen** - Unter demselben Video fragt [@tahooo1402](https://www.youtube.com/watch?v=fyVFfuTcnZU): "Was wenn ich mein eigenes Foto mit AI optimiere, d.h. exemplarisch anderer Hintergrund, Kleidung und Handlung (die zwar erbracht wurde und wird, aber nicht fotografiert wurde)." [@LibertyHannes](https://x.com/LibertyHannes/status/2103151598834753734) tippt auf Durchsetzung per Zuruf: "Verstößt der Spiegel da nicht gegen die KI Verordnung der EU mit dem Titelbild?" (7 Likes). Zu Provider versus Deployer, GPAI oder Verhaltenskodex gab es im Fenster keinen einzigen Thread. Am nächsten kommt [@LyudaKozlovska](https://x.com/LyudaKozlovska/status/2099454521642545292), die den AI Act als "compliance load on European deployers and users" beschreibt, sowie ein [Video von CoreLogic Defense](https://www.youtube.com/watch?v=JFmkK3S3gDM) mit der Frage "which framework actually takes priority?" bei CRA, AI Act, NIS 2 und DORA (35 Aufrufe).

**Tools: Anbieter sprechen, Nutzer schweigen** - Die sichtbaren Tool-Stimmen sind Anbieter. [@newonpolsia](https://x.com/newonpolsia/status/2106015956208435516) pitcht KMU-Compliance mit "teure Beratung und Enterprise-Software passen selten" und verspricht in einem zweiten [Post](https://x.com/newonpolsia/status/2104902900019593402) "laufendes Monitoring" (beide "Live soon", 0 bis 1 Like). Auf Hacker News zeigt [opencomplai](https://opencomplai.com/blog/no-llm-in-compliance-decisions) eine Compliance-Engine mit "zero LLM calls" (4 Punkte, 1 Kommentar), ein Medium-Guide zu "EU AI Act Compliant" für KI-Agenten bekam [3 Punkte](https://medium.com/@MirArshadTalpur/how-to-make-your-ai-agent-eu-ai-act-compliant-a-practical-guide-b9b7dbd97b92). Kritik an einem konkreten Tool ist nirgends aufgetaucht, die einzige Checker-Story (LatticeFlow) stammt von 2024.

**Maschinenlesbare Rechtsdaten: genau ein Treffer** - In 12 GitHub-Items und den vier r/mcp-Threads der Daten taucht kein MCP-Server für den AI Act auf. Am nächsten kommt [aaif/wg-governance-risk-and-regulatory#11](https://github.com/aaif/wg-governance-risk-and-regulatory/issues/11), ein Vorschlag für ein Zeilenformat mit "Jurisdiction, Instrument and article, Binds, Duty, Scope, Status, Shape defined", bei dem jede Installation die Zeilen zur Laufzeit liefert.

**Die Regulierungskritik kommt aus der Wirtschaftsecke** - [@Waldbrandgefa_r](https://x.com/Waldbrandgefa_r/status/2100198035380650250): "Bürokratie: EU-Green Deal, KI-Verordnung uvm., und nationale Zusatzregeln erschweren Investitionen und Ansiedelung von Unternehmen." Ähnlich argumentiert @LyudaKozlovska: "European developers cannot catch up under the current regulatory load and capital gap."

**Die lauteste Kommentatorin spricht gerade nicht über den AI Act** - [@LuizaJarovsky](https://x.com/LuizaJarovsky/status/2106008849580712204) erreicht über 4.200 Likes mit "Unpopular opinion: AI is a non-essential technology.", ihre übrigen Posts des Monats drehen sich um KI-Sicherheitsvorfälle und Kalifornien. Von @ZennerBXL ist im Zeitraum nichts aufgetaucht.

KEY PATTERNS from the research:
1. Daten ohne Fassung: "seit dem 2. August 2026" und "verschoben" laufen nebeneinander, kein Beitrag verweist auf einen Textstand - per [@Kaiseinleben](https://x.com/Kaiseinleben/status/2105576211166724153)
2. Art. 50 ist der Teil des AI Act, der Nicht-Juristen erreicht, und die Fragen sind Grenzfälle (Bildbearbeitung, Titelbilder) statt Rollenfragen - per [@tahooo1402](https://www.youtube.com/watch?v=fyVFfuTcnZU)
3. Provider/Deployer und GPAI sind im Fenster praktisch unsichtbar, die Deployer-Last taucht nur als Standortargument auf - per [@LyudaKozlovska](https://x.com/LyudaKozlovska/status/2099454521642545292)
4. Der Tool-Diskurs ist Anbieter-Marketing für KMU (Monitoring, Nachweise, Vorlagen) ohne Nutzerkritik - per [@newonpolsia](https://x.com/newonpolsia/status/2104902900019593402)
5. Strukturierte Regelzeilen (Instrument, Artikel, Pflicht, Status) entstehen erst in offenen Governance-Repos - per [aaif/wg-governance-risk-and-regulatory#11](https://github.com/aaif/wg-governance-risk-and-regulatory/issues/11)
6. Zu Chatbot-Halluzinationen über den AI Act gibt es keinen Beleg im Fenster, der nächste Beleg ist allgemeine Unzuverlässigkeit bei regulierten Fragen: "AI chatbots give wrong answers to financial queries 'most of the time'" - per [Hacker News](https://www.ft.com/content/c0cd359d-df84-4208-a789-ffa864b43666) (157 Punkte)

Lauf 1 (EU AI Act compliance developers tools):

<!-- PASS-THROUGH FOOTER: emit verbatim in the model response per LAW 5. -->
---
✅ All agents reported back!
├─ 🟠 Reddit: 26 threads │ 5,005 upvotes │ 1,140 comments
├─ 🔵 X: 24 posts │ 4,746 likes │ 485 reposts
├─ 🔴 YouTube: 2 videos │ 47 views │ 2/2 with transcripts
├─ 🟡 HN: 13 storys │ 98 points │ 43 comments
├─ 🐙 GitHub: 12 items │ 17 reactions │ 2,274 comments
├─ 📰 Techmeme: 6 headlines
├─ 🗣️ Top voices: @Pi_CoinMagazine, @LuizaJarovsky, @ping_wu │ r/artificial, r/AI_Agents, r/mcp
└─ 📎 Raw results saved to ~/Documents/Last30Days/eu-ai-act-compliance-developers-tools-raw-v3.md
---
<!-- END PASS-THROUGH FOOTER -->

Lauf 2 (KI-Verordnung AI Act Pflichten August 2026):

<!-- PASS-THROUGH FOOTER: emit verbatim in the model response per LAW 5. -->
---
✅ All agents reported back!
├─ 🟠 Reddit: 25 threads │ 5,467 upvotes │ 2,158 comments
├─ 🔵 X: 35 posts │ 4,396 likes │ 439 reposts
├─ 🔴 YouTube: 4 videos │ 36,419 views │ 4/4 with transcripts
├─ 🟡 HN: 30 storys │ 5,087 points │ 3,444 comments
├─ 📊 Polymarket: 2 markets │ Clarity Act (H.R.3633) signed into law 5.0%, H.R. 22 (SAVE Act) signed into law 4.0%
├─ 🗣️ Top voices: @immofux, @DoWa50488, @LuizaJarovsky │ r/artificial, r/legaltech, r/privacy
└─ 📎 Raw results saved to ~/Documents/Last30Days/ki-verordnung-ai-act-pflichten-august-2026-raw-v3.md
---
<!-- END PASS-THROUGH FOOTER -->

---
Ich bin jetzt Experte für EU AI Act compliance developers tools. Einige Dinge, die ich daraus ableiten kann:
- Die Art-50-Fristenlage ("seit 2. August 2026" gegen Omnibus-Verschiebung) als Testfall für Fassungen und Change-Feed aufbereiten
- Die dünnen Stellen (LinkedIn, Substack, Fachblogs, Provider/Deployer, GPAI) gezielt nachrecherchieren, sobald ein Web-Backend oder mehr WebSearch-Budget verfügbar ist
- aaif/wg-governance-risk-and-regulatory#11 und opencomplai als Anknüpfungspunkte bzw. Wettbewerber vertiefen

Ich habe alle Links zu den 51 Reddit-Threads, 59 X-Posts, 43 HN-Stories, 12 GitHub-Items, 6 YouTube-Videos, 6 Techmeme-Headlines und 2 Polymarket-Märkten, die ich gesichtet habe (Summe beider Läufe, mit Überschneidungen). Frag einfach.

## Für unser Produkt relevante Zitate

Hinweise zur Lesart: Alle Zitate sind wörtlich aus den Rohdaten der beiden Läufe übernommen (Rohdateien siehe unten). Die Engine kürzt längere Texte selbst; solche Stellen sind mit "[von der Engine gekürzt]" markiert. Bei YouTube-Transkripten (automatisch erzeugt, teils ins Englische übersetzt) sind Leerzeichen vor Satzzeichen und Zero-Width-Zeichen normalisiert. Die Zitate sind Aussagen aus der Community und keine geprüften Rechtsauskünfte; ob "seit 2. August 2026" für Art. 50 in jeder Teilpflicht stimmt oder durch den Digital Omnibus verschoben wurde, lässt sich aus diesen Daten nicht entscheiden. Das ist selbst der Befund. Engagement-Angaben stammen aus der Engine (Likes/Reposts/Antworten bzw. Punkte/Kommentare/Aufrufe). Fenster der Läufe: 2026-09-03 bis 2026-10-03.

### Verwirrung über Fristen und Fassungen

1. "𝗞𝗜-𝗥𝗲𝗴𝗲𝗹𝗻 𝘃𝗲𝗿𝘀𝗰𝗵𝗼𝗯𝗲𝗻. 𝗘𝗶𝗻𝗲 𝗻𝗶𝗰𝗵𝘁. Seit dem 2. August 2026 gilt die Transparenzpflicht der EU-KI-Verordnung: Wer mit einer KI spricht, muss es erfahren. Chatbot, Telefonassistent, Auto-Antwort. An wie vielen Stellen das bei euch greift, zeigt erst eine Liste aller Kontaktpunkte."
   - @Kaiseinleben, X, 2026-10-01, [Link](https://x.com/Kaiseinleben/status/2105576211166724153), Engagement: 1 Antwort. (Post mit Verweis auf einen Live-Call, vermutlich Beratungs-Marketing; Original in Unicode-Fettschrift.)
   - Relevanz: "verschoben" und "gilt seit" im selben Atemzug, ohne Textstand. Direkter Anwendungsfall für versionierte Fristen.

2. "@TreuerKanzler Die gesetzliche Kennzeichnungspflicht für KI-Inhalte in Deutschland gilt seit dem 2. August 2026 gemäß Artikel 50 der EU-KI-Verordnung (AI Act). [1, 2]!!!"
   - @DoWa50488, X, 2026-09-28, [Link](https://x.com/DoWa50488/status/2104577111671603317), Engagement: 1 Antwort.
   - Relevanz: Laien zitieren Artikel und Stichtag mit Fußnotenverweisen, aber ohne Quelle im Post.

3. "@lohner_ste92670 @Petatrader Durch die europäische KI-Verordnung (EU AI Act), deren Transparenzregeln seit dem 2. August 2026 gelten, gibt es strenge Vorgaben, z.B. muss man insbesondere Deepfakes kennzeichnen. Ich möchte nicht, dass Sie für die Verbreitung Ihrer Ideologien Probleme bekommen. Nur zu Info."
   - @senfdazunet, X, 2026-09-26, [Link](https://x.com/senfdazunet/status/2103824866810143214), Engagement: keins ausgewiesen.
   - Relevanz: Der AI Act wird als Drohkulisse im Alltagsstreit benutzt; Fristangabe wieder ohne Fassung.

4. "Gutes Video, eine Ergänzung zur KI-Kompetenzpflicht. Artikel 4 wird durch den Digital Omnibus von einer Ergebnis- zu einer Bemühungspflicht. Statt Kompetenz sicherzustellen, muss man ihre Entwic…" [von der Engine gekürzt]
   - @sebpiet845, YouTube-Kommentar unter "EU AI Act: Diese Pflichten und Bußgelder müssen Unternehmen kennen" (Philip Thomas, Video vom 2026-07-27, 8.993 Aufrufe), Kommentardatum nicht ausgewiesen, [Link](https://www.youtube.com/watch?v=fyVFfuTcnZU), Engagement: 3 Likes.
   - Relevanz: Der einzige Beleg, dass Praktiker Omnibus-Änderungen am Artikeltext verfolgen. Das Video selbst liegt außerhalb des 30-Tage-Fensters.

5. "The European Parliament votes to ban nudify apps and delay EU AI Act deadlines, including pushing compliance for high-risk AI systems back to December 2027"
   - The Verge via Techmeme (Headline, keine Community-Stimme), Datum nicht ausgewiesen ("date unknown"), [Link](https://www.theverge.com/ai-artificial-intelligence/901315/eu-ai-act-delays-ban-nudify-apps), Engagement: keins.
   - Relevanz: Beleg für die Verschiebungslage. In derselben Treffermenge steht die TechCrunch-Headline von 2024, nach der "most provisions will be fully applicable by mid-2026" seien, also eine veraltete Fassung neben der aktuellen.

### Entwicklerfragen (Provider/Deployer, Art. 50, GPAI)

6. "Danke! Mal ne Frage: Was wenn ich mein eigenes Foto mit AI optimiere, d.h. exemplarisch anderer Hintergrund, Kleidung und Handlung (die zwar erbracht wurde und wird, aber nicht fotografiert wurde)."
   - @tahooo1402, YouTube-Kommentar unter dem Philip-Thomas-Video, Datum nicht ausgewiesen, [Link](https://www.youtube.com/watch?v=fyVFfuTcnZU), Engagement: 0 Likes.
   - Relevanz: Typische Art-50-Grenzfrage (was ist "KI-generiert"?), die eine Regel-Engine mit Szenario-Eingabe beantworten müsste.

7. "Interesting position, but two blind spots make AI Strategy for Europe dangerous. First, Europe has no frontier lab to slow down. What you call a "unilateral EU slowdown" is in practice the AI Act and compliance load on European deployers and users, not a brake on any European frontier model. European developers cannot catch up under the current regulatory load and capital gap."
   - @LyudaKozlovska, X, 2026-09-14, [Link](https://x.com/LyudaKozlovska/status/2099454521642545292), Engagement: 2 Likes, 2 Antworten. (Zitat endet in der Quelle mit "...", von der Engine gekürzt.)
   - Relevanz: Einzige Stimme zur Deployer-Last; sie ist Standort-Argument, keine Umsetzungsfrage.

8. "So, if a vulnerability is discovered, which framework actually takes priority?"
   - CoreLogic Defense, YouTube (Transkript-Highlight, automatisch erzeugt), Video "Cybersecurity Compliance How Engineers, Lawyers, and Executives Must Collaborate", 2026-09-29, [Link](https://www.youtube.com/watch?v=JFmkK3S3gDM), Engagement: 35 Aufrufe, 4 Likes, 4 Kommentare.
   - Relevanz: Überschneidung AI Act, CRA, NIS 2, DORA als Rechtsfrage; ein Regel-Layer müsste Rechtsakte übergreifend verknüpfen können. Sehr kleine Reichweite.

9. "If you adapt a system or change its purpose, then according to Article 25 you become a manufacturer and are subject to manufacturer obligations."
   - Institut für Rechtsinformatik, "IfR Talk 04 - Die KI Verordnung (AI Act) im Überblick mit Prof. Dr. Georg Borges", YouTube (Transkript-Highlight, automatisch übersetzt), 2024-07-16 und damit außerhalb des Fensters, [Link](https://www.youtube.com/watch?v=b4ZfSiVx3JU), Engagement: 3.445 Aufrufe, 51 Likes, 1 Kommentar.
   - Relevanz: Die Provider-Rollenverschiebung nach Art. 25 ist der Kern der Provider/Deployer-Frage. Im aktuellen Fenster stand dazu kein Beitrag, nur dieses ältere Evergreen-Video.

### Kritik an Tools und Tool-Landschaft

10. "Our EU AI Act compliance engine has zero LLM calls, and CI blocks adding any"
    - ythouma (Einreicher), Hacker News, 2026-09-24, [Link](https://opencomplai.com/blog/no-llm-in-compliance-decisions), Engagement: 4 Punkte, 1 Kommentar. (Titel eines Anbieter-Blogposts; Inhalt nicht abgerufen.)
    - Relevanz: Direkter Konkurrent bzw. Gleichgesinnter beim Prinzip "deterministische Regel-Engine statt LLM-Entscheidung".

11. "KMU müssen Compliance nachweisen, aber teure Beratung und Enterprise-Software passen selten. Pfadkern macht Lieferkette, Nachhaltigkeit, NIS2 und KI-Verordnung mit geführten Prozessen, Vorlagen und Nachweisexporten Schritt für Schritt machbar. Live soon."
    - @newonpolsia, X, 2026-10-02, [Link](https://x.com/newonpolsia/status/2106015956208435516), Engagement: keins ausgewiesen.
    - Relevanz: Implizite Kritik an bestehenden Lösungen ("teure Beratung und Enterprise-Software passen selten") aus Anbietersicht; Zielgruppe KMU, mehrere Rechtsakte in einem Produkt.

12. "The platform should demonstrate demographic fairness and maintain audit trails for compliance with the EU AI act, NYC local law 144 and emerging US state regulations."
    - AIHiringDesk, YouTube (Transkript-Highlight), Video "8 Best AI Applicant Screening Tools With Explainable, Bias-Free Scoring in 2026", 2026-09-08, [Link](https://www.youtube.com/watch?v=vr8CIM_nC54), Engagement: 12 Aufrufe.
    - Relevanz: Zeigt den AI Act als Checklisten-Punkt in Anbieter-Listicles (Hiring-Tools). Reine Promo, keine unabhängige Kritik.

### Wünsche nach APIs und Automatisierung

13. Titel: "Theme cards: contribute the row format, and let each deployment supply the rows at run time". Text: "The row format: Jurisdiction, Instrument and article, Binds, Duty, Scope, Status, Shape defined, plus a "Nothing binding found" l…" [von der Engine gekürzt]
    - smcd, GitHub-Issue aaif/wg-governance-risk-and-regulatory#11, 2026-09-30, [Link](https://github.com/aaif/wg-governance-risk-and-regulatory/issues/11), Engagement: 1 Kommentar.
    - Relevanz: Das nächste Signal zu einer strukturierten, maschinenlesbaren Regelzeile (Rechtsakt, Artikel, Adressat, Pflicht, Status). Der sichtbare Auszug nennt den AI Act nicht ausdrücklich.

14. "KMU müssen DSGVO, EU-KI-Verordnung und Lieferkettenpflichten im Blick behalten – oft ohne eigenes Compliance-Team. Ich habe Normspur gebaut: ein Abo für Bestandsaufnahme, strukturierte Dokumentation und laufendes Monitoring. Compliance, die im Alltag handhabbar bleibt. Live soon."
    - @newonpolsia, X, 2026-09-29, [Link](https://x.com/newonpolsia/status/2104902900019593402), Engagement: 1 Like.
    - Relevanz: "laufendes Monitoring" ist die Produktkategorie Change-Feed, hier als Anbieterversprechen. Ein Wunsch von Nutzern ist es nicht, sondern ein Angebot.

### Halluzinationen von Chatbots zum AI Act

15. Kein Beleg im Fenster. Nächstliegender Proxy (nicht AI-Act-spezifisch): "AI chatbots give wrong answers to financial queries 'most of the time'"
    - 1vuio0pswjnm7 (Einreicher), Hacker News (Titel des FT-Artikels), 2026-09-21, [Link](https://www.ft.com/content/c0cd359d-df84-4208-a789-ffa864b43666), Engagement: 157 Punkte, 89 Kommentare.
    - Relevanz: Stützt allgemein das Argument "LLMs sind bei regulierten Fragen unzuverlässig", belegt aber nichts über falsche AI-Act-Antworten. Für diese Behauptung bräuchte das Produkt eigene Tests oder andere Quellen.

## Ehrliche Einschätzung der Evidenz

Kurzfassung: Die Menge ist groß, der Anteil echter AI-Act-Aussagen klein, und die Stimmen, die wir eigentlich hören wollten (Entwickler, Compliance-Praktiker, Tool-Nutzer), sind kaum vertreten. Die Ergebnisse taugen als Stimmungs- und Lückenbild, nicht als Marktvalidierung.

### Vorgehen und Einschränkungen

- Zwei Läufe der Engine (v3.25.0), Fenster 2026-09-03 bis 2026-10-03. Lauf 1: "EU AI Act compliance developers tools" mit vier Subqueries (allgemein inkl. Omnibus/Art. 50, Entwicklerfragen, Tools, MCP/GitHub), `--x-related=LuizaJarovsky,ZennerBXL` und den zehn vorgegebenen Subreddits. Lauf 2: "KI-Verordnung AI Act Pflichten August 2026" mit vier deutschen Subqueries und den Subreddits de, informatik, programmieren, germany, privacy, legaltech, artificial.
- Lauf 1 lieferte formal 83 Items und lag damit über der Schwelle von 20 für den Zweitlauf. Ich habe Lauf 2 trotzdem gefahren, weil nur etwa 8 der 83 Items tatsächlich vom AI Act handelten und deutschsprachige Stimmen ausdrücklich gewünscht waren.
- Das WebSearch-Budget der Session war vor Start erschöpft (200 von 200). Zwei Versuche für Kontext-Recherche wurden vom Tool abgelehnt. Es gab deshalb keine Pre-Research-Auflösung (Handles, Subreddits per Web) und keine WebSearch-Supplemente (Skill-Step 2), und der Anhang "WebSearch Supplemental Results" in den Rohdateien entfällt. Die Query-Pläne habe ich selbst geschrieben und per `--plan` übergeben, `--auto-resolve` wurde nicht verwendet (die Anweisung dazu traf erst nach Abschluss beider Läufe ein; ohne konfiguriertes Web-Backend hätte es ohnehin nichts beigetragen).
- Die Engine hatte kein Web-Backend: "Keyless web search unavailable" in beiden Läufen, Web daher 0 Items. Brave/Exa/Serper-Keys sind nicht konfiguriert. TikTok/Instagram sind mangels ScrapeCreators-Key nicht aktiv. Blogs, Fachmedien, LinkedIn und Newsletter, wo Compliance-Leute tatsächlich schreiben, sind damit nicht abgedeckt.
- Die Klassifikation "on-topic" ist meine manuelle Einordnung anhand der von der Engine gelieferten Titel und Textauszüge (oft nur Anfang des Textes), nicht anhand von Volltexten. "On-topic" heißt: Der sichtbare Text bezieht sich ausdrücklich auf AI Act bzw. KI-Verordnung und liegt im 30-Tage-Fenster.

### Items pro Quelle und Anteil on-topic

| Quelle | Lauf 1 Items | Lauf 1 on-topic | Lauf 2 Items | Lauf 2 on-topic |
|---|---|---|---|---|
| Reddit | 26 | 0 | 25 | 0 (1 unklar: r/informatik "EU KI Inferenz", nur Titel) |
| X | 24 | 3 | 35 | 12 |
| YouTube | 2 | 2 (beide nur am Rand) | 4 | 0 im Fenster (4 AI-Act-Videos, aber 2024 bis 2026-07) |
| Hacker News | 13 | 2 | 30 | 2 (Duplikate aus Lauf 1) |
| GitHub | 12 | 1 (thematisch, AI Act nicht genannt) | nicht abgefragt (0) | - |
| Techmeme | 6 | 0 im Fenster (alle zu AI Act, aber 2023 bis 2024 bzw. ohne Datum) | 0 | - |
| Polymarket | 0 | - | 2 | 0 (Clarity Act, SAVE Act: US-Themen) |
| Web | 0 (nicht erreichbar) | - | 0 (nicht erreichbar) | - |
| Summe | 83 | ca. 8 (ca. 10 %) | 96 | ca. 14 (ca. 15 %) |

Nach Zusammenführung beider Läufe (ohne Doppelzählung) bleiben etwa 20 klar on-topic Items im Fenster bei rund 179 Rohtreffern, also etwa 11 %. Von diesen 20 sind ca. 15 X-Posts, 2 HN-Einreichungen, 2 YouTube-Videos, 1 GitHub-Issue.

### Wo die Daten dünn oder verzerrt sind

- Reddit: 0 von 51 Items nennen den AI Act. Die Treffer sind allgemeine KI-Posts aus r/artificial, r/AI_Agents, r/mcp, r/legaltech. Hohe Punktzahlen (z.B. 1.915, 1.150) gehören zu Posts ohne Bezug. Auf r/de und r/informatik war kein AI-Act-Thread sichtbar. Die Reddit-Zahl im Footer (5.005 bzw. 5.467 Upvotes) ist deshalb kein Maß für AI-Act-Interesse.
- X: Die 12 on-topic Treffer in Lauf 2 stammen von etwa 11 verschiedenen Konten. Davon sind mindestens 4 Posts von 3 Anbieter- bzw. Berater-Konten (@newonpolsia 2 Posts, @Kaiseinleben, @preeco_de), 1 Satire (@KrammRainer), der Rest Laien-Aussagen. Engagement liegt fast durchgehend bei 0 bis 7 Likes. Die Engine warnte selbst vor Konzentration auf eine Quelle. Konten wie @DoWa50488 und @immofux liefern viele Treffer ohne Bezug (Alltags- und Immobilien-Posts). In Lauf 1 stammen 9 von 24 X-Posts von @Pi_CoinMagazine (Krypto-Promo, nur ein Post streift Art. 14).
- Kommentatoren: @LuizaJarovsky liefert Reichweite (4.219 bis 4.232 Likes), aber ihr sichtbarer Text enthält keinen AI-Act-Bezug. @ZennerBXL: 0 Posts im Fenster gefunden. Die englischsprachige Fachkommentierung zu Omnibus und Art. 50 fehlt in den Daten.
- YouTube: 6 Videos insgesamt, davon nur 2 im Fenster, beide mit 12 bzw. 35 Aufrufen. Die 4 deutschen AI-Act-Videos sind Evergreen-Inhalte (2024 bis 2026-07-27) mit zusammen 36.419 Aufrufen; sie zeigen Dauerinteresse, aber keine Stimmung der letzten 30 Tage. Kommentare tragen kein Datum.
- Hacker News: Lauf 2 füllte sich mit rund 26 Chatbot-Stories ohne AI-Act-Bezug (Stichwort "Chatbot"). Echte Treffer: opencomplai (4 Punkte) und ein Medium-Guide (3 Punkte). Beide haben kaum Resonanz.
- GitHub: 11 von 12 Items sind Pull Requests und Issues ohne AI-Act-Bezug, deren Text fast nur aus Bot-Kommentaren besteht (CodeRabbit, Netlify usw.). Ein MCP-Server oder Skill mit AI-Act-Bezug wurde nicht gefunden; das heißt nicht, dass keiner existiert, sondern dass die Engine-Suche (Issues/PRs im 30-Tage-Fenster) keinen zeigte.
- Techmeme: Alle 6 Items betreffen den AI Act, sind aber 2023 bis 2024 bzw. ohne Datum. Nur die Verge-Meldung zur Verschiebung ist plausibel aktuell, aber nicht datiert.
- Polymarket: keine relevanten Märkte (die zwei Treffer sind US-Gesetzgebung).
- Gar nicht belegt: Provider-vs-Deployer-Diskussionen, GPAI/Code of Practice, Kritik an konkreten Compliance-Tools, Wünsche nach APIs oder Automatisierung von Endnutzern (nur Anbieter-Ankündigungen), Chatbot-Halluzinationen zum AI Act, AI-Act-bezogene MCP-Server.
- Zeitraum: Einzelne Quellen (Techmeme, YouTube-Transkripte) liefern Inhalte außerhalb des 30-Tage-Fensters; sie sind in den Zitaten ausdrücklich markiert.

### Konsequenz für die Produktplanung

- Belastbar ist nur: Fristen und Fassungen werden öffentlich ohne Versionsangabe herumgereicht ("gilt seit 2. August 2026" neben "verschoben"); Art. 50 ist der Teil, der bei Laien ankommt; es gibt Anbieter, die KMU-Monitoring und deterministische Engines versprechen. Das stützt die Annahme "Versionierung und Change-Feed haben einen Anlass", beweist aber keine Nachfrage von zahlenden Entwicklern oder Tool-Herstellern.
- Nicht belastbar: Aussagen zu Entwicklerbedarf, MCP-Nachfrage, Tool-Unzufriedenheit und Zahlungsbereitschaft. Dafür braucht es gezielte Interviews oder eine neue Recherche mit funktionierendem Web-Backend (Brave/Exa), LinkedIn/Substack/Fachblogs und höherem WebSearch-Budget.

Rohdateien: `~/Documents/Last30Days/eu-ai-act-compliance-developers-tools-raw-v3.md` (Lauf 1) und `~/Documents/Last30Days/ki-verordnung-ai-act-pflichten-august-2026-raw-v3.md` (Lauf 2).
