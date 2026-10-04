# Stand der Technik: Vertrauenswürdige Rechts-KI für den AI-Act-Rechtsdaten-Layer

**Stand:** 2026-10-03 · **Bezug:** SPEC.md §3-6 · **Autor:** Research-Analyst (Claude)

**Evidenz-Tags:** **[A]** Primärquelle/Peer-Review gelesen · **[B]** Preprint, nur Abstract gelesen (Fetch-Tool liefert Zusammenfassungen) · **[C]** Vendor-Aussage, Blog oder aus Gedächtnis, nicht verifiziert. Zahlen stehen nur, wenn sie in einer gelesenen Quelle vorkamen. Methodik: Das WebSearch-Budget der Session war nach 11 Suchen erschöpft; der Rest lief über die arXiv-API und direkte Fetches von Primärseiten. Was deshalb offen blieb, steht am Ende unter "Wegen Budget offen".

---

## Executive Summary

1. **RAG senkt Halluzinationen, beseitigt sie nicht.** Stanford/JELS 2025: Legal-RAG-Tools 17-33 %, GPT-4 ohne Retrieval 43 % [A][1].
2. **Gerichtsfälle explodieren:** Charlotin-Datenbank 2.125 Fälle (Stand 2026-10-02), davon 1.227 Pro-se, 840 Anwälte, 33 Richter [A][2].
3. **Zitat-Existenz reicht nicht.** Neue Linie 2026: "legal warrant" umfasst Existenz, Geltung zum Stichtag, Rechtsstatus und Stützung der Aussage [B][4][6]. Unser byte-genauer Citation Guard deckt nur die erste Stufe.
4. **Prompt-basierte Abstention versagt** (LegalCiteBench) [B][5]. Abstention muss architektonisch sein: Regel-Engine `uncertain`, Retrieval-Schwellen.
5. **Temporalität ist ein harter Constraint:** RAG mit Gültigkeitsfilter schlägt vanilla LLM und Websuche [B][7]. Das stützt `as_of`.
6. **Chunking nach Normstruktur ja, Reranker nur nach Messung:** Ein allgemeiner Cohere-Reranker schnitt in LegalBench-RAG schlechter ab als gar keiner [A][10].
7. **AI-Act-Datensätze existieren (339/120/100 Fälle), aber ohne Fassungsbezug** [B][16][17][18]. Ein versioniertes Goldset wäre methodisch neu.
8. **Juristen-Review über Fälle, nicht über Code:** Verhalten von Formalisierungen korreliert kaum mit ihrer Struktur [B][31].
9. **Marktfenster:** 12 AI-Act-Compliance-Checker gelten als "early-stage orientation tools" mit Pflichtenlücken [B][33].
10. **Korrekturen an der SPEC:** (a) "0 False Negatives" ist bei ≈100 Fällen nicht belegbar (95-%-Obergrenze ≈3 %); (b) MCP-Spec 2026-07-28: Elicitation nur noch über Multi Round-Trip Requests, Breaking Change [A][35]; (c) Citations API und Structured Outputs sind inkompatibel (HTTP 400) [A][8][9]; (d) Sonnet 5.5/Opus 5.5: keine Temperatur-Steuerung, kein erzwungenes `tool_choice`, Extraktion also nicht bitgenau reproduzierbar [A][43].

---

## 1. Halluzinationen in Legal AI

**Befunde.** Magesh et al. (Stanford RegLab/HAI, JELS 2025, preregistriert, >200 Anfragen): Lexis+ AI und Ask Practical Law AI ca. 17 %, Westlaw AI-Assisted Research ca. 33 %, GPT-4 43 %; Lexis+ AI beantwortete 65 % korrekt, Westlaw 42 % [A][1] (Einzelwerte aus Sekundärtreffern, Spanne 17-33 % aus Abstract). Die Charlotin-Datenbank wuchs von rund 200 Fällen (vor einem Jahr) auf 2.125; USA 1.459, Kanada 223, Australien 112, UK 70 [A][2]. Vals (Okt. 2025) und "HAQQ" stammen nur aus Suchsnippets bzw. Vendor-Blog und bleiben außen vor [C].

**Gegenmaßnahmen und gemessener Effekt**

| Maßnahme | Beleg | Effekt | Tag |
|---|---|---|---|
| Retrieval statt Parametrik | Stanford | GPT-4 43 % auf 17-33 % bei RAG-Tools, Rest bleibt | A |
| Temporaler Retrieval-Filter | Prior et al. 2026 | "substantial" besser als vanilla und Websuche; keine Zahl im Abstract | B |
| Zitat-Verifikation (nachgelagert, agentisch) | Liu/Stammbach/Henderson 2026 (1.300 Auszüge mit injizierten Fehlern) | bestes Modell Recall 84,4 %, F1 55,0 %, 15,3 Schritte/Auszug; subtile Fehlerklassen schwer | B |
| Quote-Grounding (Anthropic Citations) | Anthropic intern; Endex-Kunde | "bis zu 15 %" Recall-Gewinn; Kunden-Anekdote 10 % auf 0 % Quellenhalluzination | C |
| Prompt-Abstention | LegalCiteBench | Misleading Answer Rate >94 % bei 20 von 21 Modellen; Instruktion hilft kaum | B |
| Trainierte Grounding/Abstention-Reward-Models | Franzone et al. 2026 | +25,6 pp auf LegalRewardBench (Trainingszeit, für uns nicht anwendbar) | B |
| Antwort-Autorität getrennt messen | Liao 2026 | 24,0-42,4 % der Antworten richtig, aber Gold-Autorität verfehlt | B |

**Schlussfolgerung:** Belegt wirksam sind Retrieval, Zeitfilter und strukturelle (nicht promptbasierte) Verifikation. Quote-Grounding ist plausibel, aber nur durch Vendor-Daten gestützt. Deterministische Existenzprüfung fängt erfundene Fundstellen, nicht fehlinterpretierte. Deshalb braucht der Guard mehrere Stufen (siehe Referenzarchitektur).

---

## 2. Legal-RAG-Benchmarks und Eval-Design

| Benchmark | Gegenstand | Relevanz für uns | Quelle |
|---|---|---|---|
| LegalBench (162 Tasks) | Reasoning, US | gering (kein Retrieval, kein EU) | [20] |
| LegalBench-RAG | 6.858 QA, 79 Mio. Zeichen, Zeichen-genaue Precision/Recall | **Metrikdesign übernehmen** (minimal-span Retrieval); Daten: US-Verträge/Privacy | [10] |
| LexGLUE, MultiEURLEX, EUR-Lex-Sum | Klassifikation/Summarization, EU-Recht, 23-24 Sprachen | nur Sanity-Check für Mehrsprachigkeit | [20] |
| CLERC | Fallrechts-Retrieval US | gering | [20] |
| MLEB (10 Datensätze, nur eines EU: GDPR Holdings) | Legal-Embeddings, NDCG@10 | nützlich als Orientierung, **Interessenkonflikt**: Isaacus baut Benchmark und Spitzenmodell, Autoren warnen vor Trainingsdaten-Leakage bei Voyage/Cohere/Jina | [12] |
| AI Act Evaluation Benchmark | 339 Szenarien (70 verboten, 86 hochriskant, 84 begrenzt, 99 minimal), Tasks: Risiko, Artikel-Retrieval, Pflichten, QA; CC-BY-4.0; F1 0,87/0,85 verboten/hochriskant | **bester Startpunkt**, aber IAA und Rechtsstand (Omnibus) undokumentiert | [16] |
| AIReg-Bench | 120 LLM-generierte, von Juristen annotierte Dokumentationsauszüge (Verstoß gegen Artikel ja/nein) | anderer Task (Compliance-Prüfung), Annotationsprotokoll als Vorbild | [17] |
| TESSA / Future-Internet-Studie | 100 Fragen mit Anwaltsvalidierung / 100 MCQ | klein, als Zusatz | [18][19] |

**Standardmetriken:** Recall@k, MRR, NDCG@10 (Retrieval); Zeichen-Precision/Recall; Klassifikations-F1 mit Konfusionsmatrix; Abstentions-Coverage-Risk-Kurve; Citation-Existence/Support-Rate; zusätzlich "Authority Recall" (Liao) und Temporal-Accuracy.

**Glaubwürdiges Goldset mit kleinem Budget**
1. **Schicht 1, kostenlos:** Pro Annex-III-Punkt (≈40) je ein Positiv- und Negativfall, pro Art.-5-Verbot und Art.-6(3)-Ausnahme analog. Entsteht per Template, Review per Stichprobe.
2. **Schicht 2, Expertenkern:** 60-100 schwere Fälle (Leitlinien-Beispiele, Grenzfälle), zwei unabhängige Annotatoren plus Adjudikation. **Cohen's κ bzw. Krippendorff's α berichten**, nicht nur "Experte hat geprüft".
3. **Schicht 3, LLM-erzeugte Paraphrasen** zur Extraktions-Robustheit, 20 % Stichprobe juristisch validiert.
4. **LLM-as-Judge nur für Prosa/Treue, nie für Klassifikationslabels.** Befundlage: BenGER (deutsches Recht) Pearson r=0,76, κ=0,60 gegen drei Humanrater [B][21]; NormasTCU κ 0,32-0,53, aber verlässliches System-Ranking [B][23]; EGMR-Studie: Judge intern konsistent, aber nur schwach mit trainierten Annotatoren übereinstimmend [B][22]. Folgerung: Judge taugt zum Ranking von Systemversionen, nicht als Ground Truth. Kalibrierung gegen ≥100 doppelt gelabelte Items, Judge von anderem Anbieter als dem Generator, Reihenfolge randomisieren, bei jedem Judge-Modellwechsel erneut gegen das Humanset messen.
5. **Statistik:** 150 Fragen mit Recall@5=0,90 haben ein Wilson-95 %-Intervall von ca. 0,84-0,94 (eigene Rechnung). Versionsvergleiche per gepaartem Bootstrap. "0 FN bei prohibited" braucht ≈300 Fälle für eine 1-%-Obergrenze; bei 100 Fällen nur ≈3 %.

---

## 3. Retrieval für Gesetzestexte

**Chunking.** Strukturbasiert schlägt Fixed-Size in der Literatur konsistent; in LegalBench-RAG war ein rekursiver Splitter am besten [A][10]. Summary-Augmented Chunking (jedes Chunk mit Dokumentzusammenfassung) reduziert "Document-Level Retrieval Mismatch" [B][11] — beim AI Act (ein Dokument, sehr ähnliche Artikel) ist der Breadcrumb-Präfix (`VO 2024/1689 > Kap. III > Art. 6 Abs. 3 > Titel`) die billige Variante. Empfehlung: Chunk = Absatz/Buchstabe, Parent = Artikel (Rückgabe als Kontext, Zitat auf Absatzebene), Erwägungsgründe und Anhänge als eigene Typen. Ein 512-Token-Embedder verdeckte im EU-Finanzregulierungs-Experiment 90 % der häufig zitierten Bestimmungen; Chunking mit 400/80 Token brachte +42 % [C][14].

**Hybrid und Reranking.** BM25 plus Dense mit Reciprocal Rank Fusion als Start; **ob** Hybrid/Reranker hilft, ist korpusabhängig (negative Befunde in [10] und [14]). Direkte Referenzen ("Art. 6 Abs. 3") nicht per Retrieval, sondern per deterministischem Parser auflösen.

**Embeddings (Preise verifiziert nur für Voyage)**

| Modell | Eigenschaft | Preis/1 Mio. Token | Tag |
|---|---|---|---|
| voyage-law-2 | legal, 50 Mio. gratis | 0,12 USD | A [15] |
| voyage-4 / -4-large | allgemein, 200 Mio. gratis | 0,06 / 0,12 USD | A [15] |
| Kanon 2 Embedder (Isaacus) | Platz 1 MLEB (NDCG@10 86 %), Voyage 3 Large 85,7 %; Gemini Embedding Platz 7 | k. A. | C [12] |
| bge-m3 (BAAI) | offen, 8k Kontext, dense+sparse, selbst hostbar | Eigenbetrieb | C (Gedächtnis) |
| multilingual-e5 | offen, 512-Token-Limit | Eigenbetrieb | B [14] |
| jina-v3/v4, OpenAI 3-large, Gemini | **Lizenz (jina: NC-Gewichte?) und Preise vor Einsatz prüfen** | offen | C |
| Rerank: Voyage rerank-2.5 | | 0,05 USD | A [15] |
| Rerank: Cohere Rerank 4 | Search Unit = 1 Query mit ≤100 Dokumenten, Dokumente >500 Token zählen mehrfach [A][45]; Preis nur Aggregator | ca. 0,002-0,0025 USD je Suche | C |

**Kostenvergleich in Perspektive (eigene Schätzung):** Der AI-Act-Korpus umfasst pro Sprache einige Hunderttausend Token; alle 24 Sprachen sind wenige Mio. Token, also unter 1 USD pro Embedding-Lauf. **Kosten sind kein Auswahlkriterium; Qualität, Lizenz, EU-Datenhaltung und Reproduzierbarkeit sind es.**

**Benchmarks für EU-Recht:** Es gibt keinen etablierten AI-Act-Retrieval-Benchmark. LEMUR (24.953 EUR-Lex-Dokumente, 25 Sprachen, Umweltrecht) zeigt, dass Fine-Tuning multilinguale Embeddings verbessert und auf ungesehene Sprachen transferiert [B][13]; das EU-Finanz-Repo zeigt das Gegenteil bei kleinen Daten (Fine-Tuning verschlechterte zweimal) [C][14]. → Eigener Bake-off auf dem Goldset (DE-Query auf EN-Korpus und umgekehrt).

**Graph-RAG für Querverweise.** Die Literatur ist dünn und meist ohne Vergleichszahlen (LegalGraphRAG [B][42], SAT-Graph RAG [B][26]). Für den AI Act genügt ein **deterministisch geparster Querverweis-Graph** (Formex-Referenzen, "Anhang III", "Artikel 5"), 1-Hop-Expansion nach dem Retrieval. LLM-gebauter Community-GraphRAG: nicht empfohlen.

---

## 4. Temporal / Point-in-time

**Vorbilder.** legislation.gov.uk adressiert Stichtage per URI (`/ukpga/1985/67/1997-06-01`, `/enacted`, `/prospective`); Abschnitts-URIs bleiben über alle Fassungen stabil, ein nicht existierender Abschnitt liefert den Hinweis "not in force on that date" [A][24]. ELI liefert FRBR-basierte Identifikation, Metadaten (RDFa/JSON-LD) und Sitemaps/Atom-Feeds [A][25]. eCFR (Versioner-API) konnte ich nicht abrufen [C]. Akademisch: de Martim modelliert Fassungen als verkettete Works (LRMoo), Sprachfassungen als Expressions [B][26]; SAT-Graph RAG nutzt "temporal aggregations", die unveränderte Komponenten wiederverwenden (JURIX 2025) [B][26].

**EU-Spezifika (verifiziert auf EUR-Lex [27]).** Konsolidierte Fassungen tragen das Datum im CELEX (`02024R1689-20240712`, `-20260727`); Änderungsakt VO (EU) 2026/1744; Berichtigungen gelten **sprachspezifisch** (R(01) nur ES, DE, FR, GA, LT, HU, SK, SL, SV; R(02) nur NL, SL; R(03) nur CS; R(04) nur ES, NL). Anwendbarkeit ist gestaffelt (02.02.2025, 02.08.2025, 02.08.2026, 02.08.2027). **Konsequenz: drei Zeitachsen**, nicht eine: Geltungsbeginn der Fassung, Anwendungsbeginn der Bestimmung (Art. 113) und Wissensstand unseres Korpus.

**Stabile IDs.** EU-Praxis fügt über Buchstaben ein (Art. 4a, 75a) statt umzunummerieren; die Pfad-ID (`art_4a/par_2`) bleibt damit meist stabil. Absicherung: zusätzlich eine unveränderliche **Lineage-UUID** pro Bestimmung (Konzept entspricht der work-level-ID `wId` in Akoma Ntoso gegenüber der positionsabhängigen `eId` [C, aus Gedächtnis, in OASIS-Spec prüfen]), die bei Umnummerierung/Verschiebung erhalten bleibt. Zuordnung bei Unsicherheit: Hash-Gleichheit, sonst Textähnlichkeit plus Review.

**Diff.** Zweistufig: (1) Strukturdiff über Baum, Knoten per Pfad/Lineage gematcht (Insert/Delete/Move/Renumber), (2) Wortdiff (Myers/Patience, semantische Bereinigung wie diff-match-patch) innerhalb gematchter Knoten. Erklärung der Ursache aus dem Änderungsakt (Cellar-Relation "amends"), nicht aus dem Text geraten. Fachliteratur zu Normtext-Diffs: nichts gefunden.

---

## 5. Rules as Code

**Publizierte AI-Act-Formalisierungen.** AIRO/VAIR (OWL-Ontologie für Risiken, Grundlage für Tools zur Bestimmung verbotener/hochriskanter Systeme) [B][34]; Governance-as-Code: 43 maschinenprüfbare Rego-Kriterien für Art. 8-15, 25, 53, Kap. V, Validierung an zwei Deployments, "≈75 % weniger Audit-Aufwand" (technische Anforderungen, nicht Klassifikation) [B][32]; FRIA-Ontologie [B]. **Eine veröffentlichte, getestete Formalisierung von Art. 2/3/5/6 + Anhänge als Entscheidungsbaum habe ich nicht gefunden** (GitHub-Suche inkonklusiv; appliedAI-Methodik nicht abrufbar, Studie nur aus Gedächtnis bekannt: 2023, Anteil "unklarer" Systeme ca. 40 % [C, nicht verifiziert]). Das ist Lücke und Chance zugleich.

**Repräsentationen (eigene Bewertung nach Dokumentation/Literatur, nicht empirisch getestet)**

| Format | (a) Zitat je Kante | (b) `uncertain` | (c) Versionierung | (d) Juristen-Review | Fazit |
|---|---|---|---|---|---|
| YAML-Entscheidungsgraph (JSON-Schema-validiert) | nativ, frei definierbar | 3-wertig frei definierbar | Git + semver | mittel; per generierter Ansicht gut | **Quelle der Wahrheit** |
| Catala | Gesetzestext literat eingebettet, Ausnahmen-Semantik | nein nativ | Git | gut für Juristen mit Einarbeitung; Verifikationsarbeit 2026 [B][30] | Zweitimplementierung/Cross-Check, später |
| DMN-Tabellen | Annotationen | Hit-Policies, kein echtes 3-wertig | gut | **sehr gut** (Tabellen) | Exportformat fürs Review |
| OPA/Rego | Metadaten möglich | `undefined` ≈ unbekannt | Git | schwach | für technische Checks (Art. 8-15), nicht Klassifikation |
| OpenFisca | Referenzen an Variablen | nein | zeitabhängige Parameter [A][44] | mittel | auf Berechnung ausgelegt, passt schlecht |
| LegalRuleML, Blawx, Docassemble | [C, nicht geprüft] | – | – | – | zu schwergewichtig bzw. nur Vorbild für Frageschleifen |

**Empfehlung.** Kanten tragen `basis`-Einträge mit Provision-ID **und** Quote-Hash, Rolle (`defines|condition|exception`) und Geltungsintervall; Terminalzustand `uncertain` mit `blocking_questions` und `guidance_refs`; Kleene-3-Wertlogik (`true|false|unknown`) mit definierter Propagation; offene Rechtsbegriffe als markierte Blätter ("open-textured"). Beispiel (schematisch):

```yaml
node: annex3_gate
when: {fact: area, in: [employment, education, essential_services]}
basis: [{id: "eli:reg/2024/1689/anx_III", role: defines}]
yes: art6_3_derogation
unknown: {terminal: uncertain, ask: [area], guidance: ["guideline_art6#p12"]}
```

**Review-Prozess:** (1) Zwei unabhängig erzeugte Entwürfe (z. B. LLM-Entwurf vs. manueller) per SAT/Property-Tests gegeneinander laufen lassen und Divergenzfälle in natürliche Sprache zurückübersetzen (Methode Vernie/Grabmair, dort an zehn EU-Vorschriften mit neun LLMs; LLM-Formalisierungen betten Auslegungsentscheidungen ein [B][31]); (2) Jurist entscheidet Fälle; (3) Entscheidung wird als Regressionstest versioniert.

---

## 6. LLM-Rolle begrenzen

**Fähigkeiten und Grenzen (Anthropic-Docs, abgerufen):**
- **Structured Outputs** (`output_config.format`): Constrained Decoding, garantiert Schema-Gültigkeit, **nicht** semantische Korrektheit; keine rekursiven Schemata; max. 24 optionale Parameter und 16 Union-Parameter je Request [A][9]. → Faktenschema mit Pflichtfeldern und Enum-Wert `unknown` statt vieler optionaler Felder.
- **Citations API:** `cited_text` wird von der API extrahiert und zählt nicht als Output-Token; Zeiger auf bereitgestellte Dokumente sind garantiert gültig (nicht: dass die Aussage durch die Stelle gestützt wird); Typen `char_location`, `page_location`, `content_block_location`, `search_result_location`. **Mit Structured Outputs inkompatibel (400)** [A][8].
- **Neue Modelle:** Opus 5.5 und Sonnet 5.5 lehnen erzwungenes `tool_choice` ab (→ Structured Outputs), akzeptieren keine abweichende Temperatur, Thinking lässt sich nicht deaktivieren (Sonnet 5.5: `between_tools`), Stop-Reason `refusal` ist zu behandeln [A][43]. **Konsequenz:** Extraktion ist nicht bitgenau reproduzierbar → Ergebnis mit Modell-ID, Request-ID, Schema-Version, Input-Hash protokollieren und dem Nutzer zur Bestätigung vorlegen.

**Designentscheidung für `extract_facts`:** Variante A (empfohlen): Structured Output, jedes Faktum mit `evidence_quote`, danach **deterministische Byte-Prüfung** gegen den Nutzertext, `unknown` als Pflichtwert, Bestätigung per Elicitation. Variante B: Citations API für Prosa-Erklärungen, erst in zweitem Schritt strukturieren. Die Regel-Engine liest nur bestätigte Fakten, nie Freitext.

**Modelle (Preise je 1 Mio. Token, Anthropic-Tabelle Stand 2026-09-25 [43]):**

| Modell | in/out | Einsatz |
|---|---|---|
| Haiku 4.5 | 1 / 5 USD | Baseline für Extraktion, falls Goldset genügt |
| Sonnet 5.5 | 2 / 10 USD | **Extraktions-Default** (Effort low/medium) |
| Opus 5.5 | 4 / 20 USD | schwere Beschreibungen, Zweitmeinung |
| Fable 5.1 | 10 / 50 USD | nur Eval-/Review-Zeit (Adjudikation, Entwurf von Regeln), nicht Laufzeit |

Eigene Schätzung: ca. 4k Input, ca. 1k Output inkl. Thinking ergibt bei Sonnet 5.5 rund 2 Cent je Extraktion; Batch halbiert. **Öffentliche Extraktions-Benchmarks für diese Modelle habe ich nicht gefunden; Auswahl nur per eigenem Bake-off.** Reviewer/Judge von anderem Anbieter als der Generator [Praxisannahme, C].

**Elicitation und Frageschleifen.** MCP-Spec 2026-07-28: Server dürfen nicht mehr serverinitiiert anfragen; Elicitation läuft über `InputRequiredResult` (Multi Round-Trip Requests, Breaking Change), `requestState` ist als angreiferkontrolliert zu behandeln (HMAC/AEAD, TTL, Principal) [A][35]. Formularmodus erlaubt nur flache Objekte mit Primitiven/Enums, Antwortaktionen accept/decline/cancel. → Offene Fragen als Enum-Formulare mit "weiß nicht"; Fallback ohne Elicitation-Capability: strukturierte `open_questions` im Tool-Ergebnis. Schleife begrenzen (≤3 Runden); nächste Frage deterministisch wählen (Faktum, das die meisten offenen Pfade entscheidet; eigene Empfehlung, nicht literaturbelegt).

**Prompt Injection.** OWASP LLM01:2025: Verhalten einschränken, Ausgabeformat deterministisch validieren, Eingaben/Ausgaben filtern, Least Privilege, Human Approval, externe Inhalte segregieren, adversariales Testen; vollständige Prävention ungeklärt [A][36]. Preprints 2026: Informationsfluss-Kontrollen wirken stark (Leckage 52,2 % auf 0,5 %), modellseitige Resistenz bleibt "unresolved" [B][37]. Für uns: Das **Extraktions-Modell hat keine Tools**; Kommissions-PDFs/Webseiten werden beim Ingest auf Instruktionsmuster gescannt und quarantänisiert; Korpus-Releases sind gehasht/signiert; Tool-Ausgaben enthalten strukturierte Felder statt imperativer Prosa; kein Tool ruft beliebige URLs ab.

---

## 7. Change Detection

**Primärweg (verifiziert):** Cellar-Notification-Feeds `publications.europa.eu/webapi/notification/{channel}` (Channel `ingestion`, RSS oder Atom per Accept-Header; Parameter `startDate/endDate`, `type` = CREATE/UPDATE/DELETE, `wemiClasses` = work/expression/manifestation/..., max. 1000/Seite; vollständige Historie abrufbar) [A][28]. Update-Frequenz ist nicht dokumentiert [offen]. Ergänzend SPARQL-Polling auf Relationen "amends/consolidates" (konkrete CDM-Eigenschaftsnamen vor Nutzung im CDM-Dokument prüfen, aktuelle CDM-Release laut Portal 4.16.1 [C]). ELI-Sitemaps/Atom als Zweitquelle [A][25].

**Kommissions-Seiten:** `digital-strategy.ec.europa.eu/sitemap.xml` ist ein `urlset` mit ≈1.000+ URLs und `lastmod` im ISO-8601-Format [A][39], aber `lastmod` spiegelt CMS-Edits, nicht inhaltliche Änderungen. → Normalisierten **Text** hashen, nicht Bytes (PDFs enthalten Zeitstempel/Metadaten). changedetection.io (Apache-2.0, XPath/CSS/JSONPath, PDF-Textdiff, Apprise-Webhooks, Browser-Schritte, LLM-Zusammenfassungen) eignet sich für HTML/PDF-Seiten [A][38]. **CEN-CENELEC:** JTC-21-Arbeitsprogramm liegt in einer Oracle-APEX-Anwendung (`standards.cencenelec.eu/dyn/www/f?p=...`), die Übersichtsseite enthält keine Statusdetails [A][40] → Browser-Schritte oder manuelle Pflege; nur Metadaten erfassen.

**Fallen**
1. **Berichtigungen sprachspezifisch** (siehe §4): DE und EN können zeitweise divergieren; pro Sprache versionieren.
2. **Konsolidierte Fassungen hinken dem Änderungsakt hinterher** und sind nicht rechtsverbindlich (nur das Amtsblatt ist authentisch; Aussage aus EUR-Lex-Praxis, in Disclaimer prüfen [C]) → Original-Akt und Konsolidierung getrennt speichern, Abweichungen markieren; zwischen Änderungsakt und Konsolidierung Kanal `preview` mit manuell angewandter Änderung.
3. **Formex** ist fragmentiert (Dateien/Anhänge getrennt, laut Spezifikation "fragmentation"); Formex V4 gilt seit 2004, Doku nur englisch [A][29]. ZIP-Pakete robust entpacken, Schema-Validierung als Gate.
4. **Datumssemantik:** CELEX-Suffix ≠ Anwendungsbeginn.
5. Cellar meldet Ereignisse pro Sprache; "Fassung komplett" erst, wenn alle Zielsprachen da sind.

---

## Empfohlene Referenzarchitektur

**Komponenten**

| Schicht | Entscheidung |
|---|---|
| Ingest | Cellar-Feed + SPARQL, Formex-Parser mit XSD-Gate, Normalisierung (Unicode NFC, Whitespace, NBSP/Soft-Hyphen) identisch für Korpus und Guard |
| Speicher | Postgres: bitemporal, content-addressierte Textknoten (Hash), pgvector + tsvector; Originale mit Hash in Objektspeicher |
| Retrieval | Referenz-Parser, dann BM25 + Dense (RRF), Parent-Expansion, 1-Hop-Querverweis; Reranker nur wenn Goldset Gewinn zeigt |
| Regel-Engine | YAML-Entscheidungsgraph, 3-wertig, Kanten mit `basis`, DMN-/Mermaid-Export fürs Review |
| LLM | nur `extract_facts` (Structured Output, Sonnet 5.5, Evidence-Quotes), kein Tool-Zugriff; Prosa nur optional mit Citations API |
| Citation Guard | G0 Existenz (Byte-Match nach Normalisierung), G1 Geltung zu `as_of`, G2 Sprachfassung, G3 Stützung (Stichproben-Audit), G4 Authority Recall (Pflichtbestimmungen je Regelknoten aus Graph) |
| Serving | MCP hinter Adapter für Spec-Versionen 2025-11-25 und 2026-07-28; `corpus_release_id` und `rules_version` in jeder Antwort |

**Datenmodell (Skizze)**

```sql
provision_lineage(lineage_id uuid pk, work_celex text, logical_path text)
provision_version(
  version_id uuid pk, lineage_id uuid, lang text, text text, text_hash bytea,
  in_force   daterange,      -- Geltung der Fassung
  applies    daterange,      -- Anwendungsbeginn laut Art. 113
  recorded   tstzrange,      -- Transaktionszeit: was wussten wir wann
  amending_act text, source_doc_hash bytea,
  EXCLUDE USING gist (lineage_id WITH =, lang WITH =, in_force WITH &&, recorded WITH &&))
xref(from_lineage uuid, to_lineage uuid, kind text)   -- deterministisch geparst
rule_node(rule_id, rules_version, basis jsonb, valid daterange)
```

**Eval-Plan:** (1) Retrieval-Goldset ≥150 Fragen DE/EN, Recall@5, MRR, NDCG@10 mit Konfidenzintervall; (2) Klassifikation: Schicht 1-3 aus §2, Ziel formuliert als **statistische Obergrenze** (Clopper-Pearson) statt "0 Fehler"; (3) Extraktions-Robustheit (Paraphrasen, Injection-Fälle, `unknown`-Rate); (4) Fassungstests (`as_of` vor/nach 2026-07-27); (5) Guard-CI: 100 % G0, Stichprobe G3; (6) Abstention: Coverage-Risk-Kurve, Anteil unnötiger `uncertain`; (7) Judge-Kalibrierung gegen Humanset; (8) Vergleich mit den 12 Checkern der Studie [33] als öffentlicher Differenzierer; (9) Regressionslauf bei jedem Korpus-, Regel- und Modell-Release, Report öffentlich.

---

## Was in 1-2 Monaten obsolet sein könnte, und Absicherung

| Risiko | Absicherung |
|---|---|
| MCP-Spec ändert Elicitation/Sampling (2026-07-28 bereits Breaking Change) | Transport-Adapter, Contract-Tests gegen beide Spec-Versionen, Fallback ohne Elicitation |
| Modellwechsel (Anthropic-Tabelle zeigt 12 aktuelle Modelle, Parameter-Restriktionen ändern sich) | Modell-ID in Config, Eval-Harness provider-agnostisch, `response.model` je Extraktion loggen, Regressionsgate vor Wechsel |
| Embedding-/Reranker-Rangliste (Voyage 4, Kanon 2, jina-reranker-v3.5, zerank) | Embedding mit `model_id` speichern, Re-Embed-Job (<1 USD), eigener Bake-off statt MLEB |
| Citations/Structured-Outputs-Inkompatibilität wird aufgehoben | Zweistufiges Design bleibt gültig, kein Lock-in |
| Rechtsstand: weitere Änderungsakte, Art.-6-Leitlinien, harmonisierte Normen verzögert | Regeln mit `valid`-Intervall und `rules_version`, Change-Pipeline mit Review-Gate |
| Neue Benchmarks/Studien (≥6 relevante Preprints allein seit Mai 2026) | Monatlicher Literatur-Check, Evidenz-Tags führen, Methodikseite versionieren |
| Cellar/CDM-Schemaänderungen | Täglicher Contract-Test gegen Live-SPARQL, Alarm bei leerem Ergebnis |

---

## Evidenzqualität und offene Fragen

- **Primärquellen gelesen:** Stanford/JELS (Abstract), MCP-Spec, Anthropic-Docs, EUR-Lex-/Cellar-/legislation.gov.uk-Seiten, OWASP, LegalBench-RAG (Volltext). Der Großteil der 2026-Literatur sind Preprints, von denen nur Abstracts über ein Zusammenfassungs-Tool vorlagen; keine Methodikprüfung.
- **Vendor-Daten:** Anthropic-Citations-Zahlen, MLEB (Interessenkonflikt), Aggregator-Preise, HAQQ, Vals.
- **Wegen Budget offen oder nicht belegbar:**
  - Frage 4: eCFR-Versioner nicht abrufbar (Redirect auf Unblock-Seite); Akoma-Ntoso-`wId`, CDM-Eigenschaftsnamen, Normtext-Diff-Literatur nicht verifiziert.
  - Frage 5: Catala-Website lieferte nur den Titel; Blawx, Docassemble, LegalRuleML, DMN nicht anhand von Quellen geprüft; appliedAI-Studie nicht abrufbar; Vergleichstabelle ist eigene Einschätzung.
  - Frage 3: Preise OpenAI/Gemini/Cohere-Rerank offiziell, Lizenzen jina/bge-m3, Qualität bge-m3 und jina auf EU-Recht nicht belegt; keine EU-Recht-spezifischen Reranker-Benchmarks gefunden.
  - Frage 6: kein öffentlicher Extraktions-Benchmark für die Modelle 2026; DSGVO bei Versand von Nutzerbeschreibungen an LLM-APIs ungeklärt.
  - Frage 2: Annotationsprotokoll/IAA des AI Act Evaluation Benchmark unbekannt; MDPI-Studie (403) nur als Snippet.
  - Frage 7: Cellar-Update-Frequenz und reale Latenz zwischen Änderungsakt und Konsolidierung undokumentiert; Inhalt der VO (EU) 2026/1744 nicht geprüft (EUR-Lex bestätigt nur Existenz und Datum 2026-07-27).
- **Nicht gefunden:** eine publizierte, getestete Entscheidungsbaum-Formalisierung von Art. 2/3/5/6 + Anhänge.
- **Ungetestet:** ob die Review-Methode "Fallverbalisierung" mit einer juristischen Person in vertretbarem Aufwand läuft.

---

## Quellen

1. Magesh et al., Hallucination-Free? (JELS 2025): https://onlinelibrary.wiley.com/doi/full/10.1111/jels.12413 · Preprint: https://arxiv.org/abs/2405.20362
2. Charlotin, AI Hallucination Cases: https://www.damiencharlotin.com/hallucinations/
3. Liu, Stammbach, Henderson, Who Checks the Citations?: https://arxiv.org/abs/2606.21155
4. Taranukhin, Shwartz, Legal LLM Hallucination as Failure of Legal Warrant: https://arxiv.org/abs/2609.17546
5. LegalCiteBench: https://arxiv.org/abs/2605.10186
6. Liao, Answer-Authority Decoupling: https://arxiv.org/abs/2608.02621
7. Prior, Schultz, Grabmair, Temporal Failure Modes in Statutory QA (ICAIL 2026): https://arxiv.org/abs/2605.23497
8. Anthropic Citations: https://claude.com/blog/introducing-citations-api · https://platform.claude.com/docs/en/build-with-claude/citations
9. Anthropic Structured Outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
10. LegalBench-RAG: https://arxiv.org/abs/2408.10343
11. Summary-Augmented Chunking (NLLP 2025): https://arxiv.org/abs/2510.06999
12. MLEB: https://huggingface.co/blog/isaacus/introducing-mleb
13. LEMUR: https://arxiv.org/abs/2602.09570
14. eu-reg-search (Einzelprojekt): https://github.com/Chenjigaram/eu-reg-search
15. Voyage Pricing: https://docs.voyageai.com/docs/pricing
16. AI Act Evaluation Benchmark: https://arxiv.org/abs/2603.09435 · https://github.com/davidath/ai-act-evaluation-benchmark
17. AIReg-Bench: https://arxiv.org/abs/2510.01474
18. TESSA Dataset: https://zenodo.org/records/22874463
19. Vanilla vs. RAG LLM Comprehension of the EU AI Act: https://doi.org/10.3390/fi18090469 (nur Suchsnippet)
20. LegalBench https://arxiv.org/abs/2308.11462 · LexGLUE https://arxiv.org/abs/2110.00976 · CLERC https://arxiv.org/abs/2406.17186 · EUR-Lex-Sum https://arxiv.org/abs/2210.13448 · MultiEURLEX https://arxiv.org/abs/2109.00904
21. BenGER: https://arxiv.org/abs/2605.28183
22. LLM-Reasoning/Judge EGMR: https://arxiv.org/abs/2608.17168
23. NormasTCU (nur Suchsnippet): https://arxiv.org/abs/2608.27746
24. legislation.gov.uk URIs: https://www.legislation.gov.uk/developer/uris
25. ELI: https://eur-lex.europa.eu/eli-register/about.html
26. de Martim: https://arxiv.org/abs/2506.07853 · https://arxiv.org/abs/2505.00039
27. EUR-Lex AI Act (Versionen, Berichtigungen): https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R1689
28. Cellar: https://op.europa.eu/en/web/cellar · https://op.europa.eu/en/web/cellar/cellar-data/rss-and-atom-feeds
29. Formex: https://op.europa.eu/en/web/eu-vocabularies/formex
30. Catala: https://arxiv.org/abs/2103.03198 · Closing the Loop: https://arxiv.org/abs/2606.23913
31. Vernie, Grabmair, Comparing Formalizations: https://arxiv.org/abs/2605.25186
32. Governance-as-Code: https://arxiv.org/abs/2609.20016
33. EU AI Act Compliance Checkers: https://arxiv.org/abs/2609.36228
34. AIRO: https://oecd.ai/en/catalogue/tools/airo-ai-risk-ontology · Computational Compliance: https://arxiv.org/abs/2601.04474
35. MCP Elicitation: https://modelcontextprotocol.io/specification/latest/client/elicitation · MRTR: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
36. OWASP LLM01:2025: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
37. Prompt-Injection-Preprints (nur Suchsnippets): https://arxiv.org/abs/2607.20090 · https://arxiv.org/abs/2607.24625 · https://arxiv.org/abs/2609.14003
38. changedetection.io: https://github.com/dgtlmoon/changedetection.io
39. Commission Sitemap: https://digital-strategy.ec.europa.eu/sitemap.xml
40. CEN-CENELEC KI: https://www.cencenelec.eu/areas-of-work/cen-cenelec-topics/artificial-intelligence/
41. Legal Reward Models (Grounding/Abstention): https://arxiv.org/abs/2609.14739
42. LegalGraphRAG: https://arxiv.org/abs/2605.28120
43. Claude-API-Skill-Referenz (lokal, Modelltabelle Stand 2026-09-25, Parameter-Restriktionen)
44. OpenFisca: https://openfisca.org/en/
45. Cohere Pricing (Search-Unit-Definition): https://cohere.com/pricing
