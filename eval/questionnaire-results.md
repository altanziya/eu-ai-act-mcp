# Ergebnisse Fragebogen-Klassifikation (Hausaufgabe Teil 1, Prämisse 5)

Stand 2026-10-03. Regeln: `eval/questionnaire-protocol.md` (Version 1.0, vor der Klassifikation eingefroren). Rohdaten: `eval/questionnaires/<slug>.yaml` (Rater 1) und `<slug>.rater2.yaml` (Rater 2). Alle Zahlen unten sind mit `python3 eval/questionnaire_stats.py` reproduzierbar.

## 1. Kurzfazit

- **9 Fragebögen, 701 Einzelfragen.** 7 der 9 haben mindestens 20 Fragen; MCC-AI (7) und Fraunhofer-AI-Profil (8) tragen das Mindestkriterium von 5, aber kaum Gewicht.
- **F (Anteil a ∪ b), gepoolt (V1): 6,7 % (Rater 1), 6,3 % (Rater 2).** Mit allen Unsicherheits-Tags großzügig gelesen höchstens 7,4 %. Die 40-%-Schwelle wird in allen vier vorab festgelegten Varianten klar verfehlt (V2 Makro 10,5 %, V3 ohne Klassifikator-Tool 0,2 %, V4 ohne den größten Fragebogen 12,3 %). **F: nein.**
- **Z (Anteil a): 0 von 701 (0,0 %)**, bei beiden Ratern. Kein Fragebogen enthält eine Frage, die allein aus dem Gesetzestext beantwortbar wäre.
- **Treiber von F:** 46 der 47 b-Fragen von Rater 1 stammen aus einem einzigen Dokument, dem Einstufungs-Assistenten von Algorithm Audit (Typ K, 92 % b). In den acht übrigen Fragebögen (651 Fragen) ist F 0,2 % (Rater 1) bzw. 0,0 % (Rater 2). AI-Act-native Lieferantenfragebögen (MCC-AI, zwei Community-Vorlagen; 91 Fragen): F 1,1 % bzw. 0,0 %.
- **Cohen's Kappa gepoolt: 0,965** (drei Klassen und die Binärteilung F fallen zusammen, weil a nie vorkommt). Das ist eine **obere Schranke**: beide Durchgänge laufen im selben Modell und Kontext (Protokoll, Abschnitt 5). Je Fragebogen ist Kappa nur bei Algorithm Audit (0,779) aussagekräftig; in den übrigen acht Fragebögen ist es wegen einer einzigen vergebenen Klasse (c) nicht definiert (sieben) oder 0,000 (einer).
- **Abweichungen für Altan:** 3 Fragen (Rater 1 gegen Rater 2), dazu 8 übereinstimmend kodierte, aber als unsicher markierte Fragen und eine optionale Stichprobe von 30 übereinstimmenden Fragen (Abschnitt 8). Die 11 Fragen aus 8.1 und 8.2 können F höchstens auf 7,4 % heben; sie entscheiden über die Genauigkeit der Zahl, nicht über die Schwelle.
- **Größte Unsicherheit** ist nicht die Klassifikation, sondern die Stichprobe: Es gibt in diesem Satz keinen öffentlichen, nach dem AI Act erstellten Lieferantenfragebogen eines Einkäufers oder Zertifizierers mit nennenswertem Umfang (Abschnitt 6).

## 2. Vorgehen in fünf Zeilen

1. Kandidaten ohne WebSearch beschafft: `gh search repos` und `gh search code`, WebFetch und `curl` auf Herausgeberseiten, `pdftotext` für PDFs (alle PDFs hatten Textzugriff).
2. Extraktion pro Dokument per Skript, dann von Hand geprüft; Wortlaut wörtlich, Abweichungen in `extraction.notes`.
3. Klassifikation nach Protokoll Abschnitt 4 (Stufen 1 bis 5): Rater 1 mit Rationale; Rater 2 in einem getrennten Durchgang auf blinden, gemischten Bögen, mit Regelpfad.
4. Auswertung nach Protokoll Abschnitt 6 (vier Varianten, Tag-Spannen, Wilson-Intervalle, Kappa).
5. Menschliche Entscheidung der Abweichungen steht aus (Abschnitt 8).

## 3. Beschaffte Fragebögen

| Slug | Quelle | Typ | AI-Act-nativ | Datum | Fragen | Lizenz (Kurzfassung) | Wortlaut veröffentlichbar |
|---|---|---|---|---|---|---|---|
| `altai-eu-hleg-2020` | ALTAI (EU-Expertengruppe) | S | nein | 2020-07 | 138 | EU-Weiterverwendung 2011/833/EU | ja |
| `mcc-ai-high-risk-annexes-2025` | MCC-AI Hochrisiko, Anhänge (EU-Kommission) | L | ja | 2025-02/03 | 7 | keine Angabe gefunden | prüfen |
| `fraunhofer-iais-ki-pruefkatalog-ai-profile-2023` | Fraunhofer IAIS KI-Prüfkatalog, AI-Profil | S | nein | 2021 (DE) / 2023 (EN) | 8 | keine Angabe gefunden | prüfen |
| `algorithm-audit-ai-act-tool-2026` | Algorithm Audit AI Act Implementation Tool (NGO) | K | ja | 2026-09 | 50 | EUPL-1.2 (Repo) | ja |
| `dsit-aime-consultation-draft-2024` | UK DSIT AI Management Essentials, Entwurf | S | nein | 2024-11 | 54 | OGL v3.0 (Seitenfuß) | ja |
| `hecvat-4-1-6-ai-section` | EDUCAUSE HECVAT 4.1.6, KI-Fragen | L | nein | 4.1.6, Datum offen | 40 | nicht verifiziert (Spiegel; Herausgeberseite 403) | prüfen |
| `csa-ai-caiq-1-1-0` | CSA AI-CAIQ v1.1.0 | L | nein | 2026-06 | 320 | CC BY-NC-SA laut Datensatz-Metadaten, nicht am Original verifiziert | prüfen |
| `community-ankit-uniyal-vendor-ddq-2026` | Community-Vorlage A. Uniyal (GitHub) | L | ja | 2026-05 | 43 | MIT | ja |
| `community-eu-ai-act-toolkit-vendor-ddq-2026` | Community-Vorlage EU AI Act Toolkit (GitHub) | L | ja | 2026-05 | 41 | MIT | ja |

Typ: L Lieferanten- oder Beschaffungsfragebogen, S Selbstbewertung, K Klassifikator. Herausgeber-URL, Abrufweg, Hash und Lizenzwortlaut stehen je Datei im Feld `source`.

## 4. Ergebnisse

### 4.1 Je Fragebogen

| Fragebogen | Typ | N | R1 a/b/c | R2 a/b/c | Übereinst. | Kappa 3 Klassen | Kappa F | Kappa Z |
|---|---|---|---|---|---|---|---|---|
| `algorithm-audit-ai-act-tool-2026` | K | 50 | 0 / 92 / 8 % | 0 / 88 / 12 % | 96,0 % | 0,779 | 0,779 | n/a |
| `altai-eu-hleg-2020` | S | 138 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `community-ankit-uniyal-vendor-ddq-2026` | L | 43 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `community-eu-ai-act-toolkit-vendor-ddq-2026` | L | 41 | 0 / 2 / 98 % | 0 / 0 / 100 % | 97,6 % | 0,000 | 0,000 | n/a |
| `csa-ai-caiq-1-1-0` | L | 320 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `dsit-aime-consultation-draft-2024` | S | 54 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `fraunhofer-iais-ki-pruefkatalog-ai-profile-2023` | S | 8 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `hecvat-4-1-6-ai-section` | L | 40 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| `mcc-ai-high-risk-annexes-2025` | L | 7 | 0 / 0 / 100 % | 0 / 0 / 100 % | 100,0 % | n/a | n/a | n/a |
| **gesamt (gepoolt)** | | **701** | 0,0 / 6,7 / 93,3 % | 0,0 / 6,3 / 93,7 % | 99,6 % | 0,965 | 0,965 | n/a |

Absolute Zählung gesamt: R1 a=0, b=47, c=654; R2 a=0, b=44, c=657.

Kappa ist "n/a", wenn beide Rater nur eine Klasse vergeben haben (erwartete Übereinstimmung 1, "Kappa-Paradox"); die rohe Übereinstimmung ist dann 100 %. Bei `community-eu-ai-act-toolkit-vendor-ddq-2026` ist Kappa 0,000, weil Rater 2 keine b-Frage vergeben hat.

### 4.2 Gesamtwerte F und Z

| Variante | N | F R1 | F R2 | F konservativ (beide) | F liberal (einer) | F R1 unten–oben (Tags) | F R2 unten–oben (Tags) | Z R1 | Z R2 | Wilson-95-%-KI F (R1) |
|---|---|---|---|---|---|---|---|---|---|---|
| V1 gepoolt, alle | 701 | 6,7 % | 6,3 % | 6,3 % | 6,7 % | 6,1 % – 7,4 % | 5,8 % – 7,4 % | 0,0 % | 0,0 % | 5,1 % – 8,8 % |
| V3 gepoolt ohne Typ K | 651 | 0,2 % | 0,0 % | 0,0 % | 0,2 % | 0,0 % – 0,6 % | 0,0 % – 0,6 % | 0,0 % | 0,0 % | 0,0 % – 0,9 % |
| V4 gepoolt ohne größten Fragebogen (`csa-ai-caiq-1-1-0`) | 381 | 12,3 % | 11,5 % | 11,5 % | 12,3 % | 11,3 % – 13,6 % | 10,8 % – 13,6 % | 0,0 % | 0,0 % | 9,4 % – 16,0 % |
| V2 Makro-Mittel über 9 Fragebögen | 9 Dok. | 10,5 % | 9,8 % | n/a | n/a | n/a | n/a | 0,0 % | 0,0 % | n/a |

Lesehilfe: V1 ist die wörtliche Lesart des Design-Docs ("Anteil der Fragen"). V2 gibt jedem Fragebogen gleiches Gewicht. V3 nimmt den Einstufungs-Assistenten heraus, der konstruktionsbedingt Einstufungsfragen stellt. V4 nimmt den größten Fragebogen (AI-CAIQ, 320 Fragen) heraus. "Konservativ" zählt eine Frage nur, wenn beide Rater sie in a ∪ b setzen, "liberal", wenn mindestens einer es tut. Die Tag-Spannen setzen Fragen mit `[U:c]` auf c und Fragen mit `[U:b]` auf b. Die Wilson-Intervalle unterstellen unabhängige Fragen und sind zu eng, weil Fragen innerhalb eines Dokuments gruppiert sind (V2 ist die vorsichtigere Lesart). Für F ≥ 40 % wären in V1 mindestens 281 Fragen nötig gewesen, gefunden wurden 47.

### 4.3 Nach Dokumenttyp

| Typ | Fragebögen | N | F R1 | F R2 | Z R1 | Z R2 |
|---|---|---|---|---|---|---|
| L Lieferantenfragebogen | 5 | 451 | 0,2 % | 0,0 % | 0,0 % | 0,0 % |
| S Selbstbewertung | 3 | 200 | 0,0 % | 0,0 % | 0,0 % | 0,0 % |
| K Klassifikator | 1 | 50 | 92,0 % | 88,0 % | 0,0 % | 0,0 % |
| L und AI-Act-nativ (Teilmenge von L) | 3 | 91 | 1,1 % | 0,0 % | 0,0 % | 0,0 % |

## 5. Einordnung in die Wahrheitstabelle Prämisse 5 (§E1)

| F | P | Ergebnis laut Tabelle |
|---|---|---|
| **nein** (V1 6,7 %, alle Varianten unter 13 %) | offen (Drei-Personen-Test steht aus) | P ja: gemischt (Record bleibt, keine Kanal-Investition, Distribution nur über Veröffentlichung). P nein: widerlegt (Record bleibt internes Interview-Artefakt, C ohne Teilen-Feature). |

Zwei Anmerkungen, die das Design-Doc nicht vorwegnimmt:

1. Die Begleitnotiz der Tabelle für "F nein, P ja" lautet "Fragebögen verlangen Klassifikation, nicht Zitate". Die Daten sagen mehr: Klassifikation wird **nur** vom Klassifikator-Tool verlangt. Lieferanten- und Selbstbewertungsfragebögen verlangen überwiegend organisatorische und technische Nachweise (Prozesse, Dokumente, Kontrollen), die weder ein Zitat noch eine Klassifikation beantwortet. Das stützt die Zeile im Design-Doc, Z unter 20 % bestätige "Klassifikation im Record", nur schwach: auch die Klassifikation deckt hier höchstens etwa 7 % der Fragen.
2. Dass Z bei null liegt, ist kein Messfehler: Fragen an einen Anbieter fragen nach dem Zustand des Anbieters, nicht nach dem Inhalt des Gesetzes. Reine Rechtsfragen (Frist, Verbot, Inhalt einer Pflicht) stellt ein Lieferantenfragebogen nicht, weil die Antwort nicht vom Befragten abhängt.

Das Ergebnis ist für den C-Start informativ, nicht bindend (§E1). Die Entscheidungslogik gehört Fable und Altan, nicht diesem Bericht.

## 6. Ehrliche Einschätzung der Quellenqualität

**Was belastbar ist.** Alle 701 Fragen sind real und extrahierbar. Eine Wörtlichkeitsprüfung (Fragetext gegen Quelltext, normalisiert) fand 694 Fragen wörtlich wieder. Die 7 Ausnahmen sind erklärt: `ALTAI-R1-01`, `ALTAI-R2-02`, `ALTAI-R3-08` (Fußnotenmarker aus dem Text entfernt), `ALTAI-R1-15` (Optionshinweis in eckigen Klammern ergänzt) und `AIME-4.1.1` bis `AIME-4.1.3` (Stammfrage 4.1 mit der Ergänzung verbunden). Die Prüfung lief lokal, das Skript liegt nicht im Repo.

**Was nicht belastbar ist.**

1. **Keine repräsentative Stichprobe.** Gelegenheitsstichprobe nach öffentlicher Verfügbarkeit, gefunden über GitHub-Suche und bekannte URLs (WebSearch stand nicht zur Verfügung). Echte Lieferantenfragebögen großer Einkäufer sind meist vertraglich vertraulich und fehlen deshalb.
2. **Strukturelle Verzerrung in beide Richtungen.** Fünf der neun Dokumente (ALTAI 2020, Fraunhofer 2021/2023, UK AIME 2024, HECVAT, AI-CAIQ; zusammen 560 Fragen) sind nicht am AI Act ausgerichtet und können AI-Act-Fragen gar nicht stellen. Das Klassifikator-Tool fragt strukturell nur nach Einstufung. Der Anteil F beschreibt deshalb eher diese Sammlung als den Markt.
3. **AI-Act-native Lieferantenfragebögen sind dünn.** Die einzige institutionelle Quelle (MCC-AI) ist ein Vertragsanhang mit 7 Auskunftsverlangen und selbst als "working document in progress" gekennzeichnet. Die beiden anderen sind Community-Vorlagen von Privatpersonen auf GitHub: nicht institutionell, keine externe Prüfung erkennbar, möglicherweise LLM-gestützt erstellt; der AI-Act-Bezug beschränkt sich auf 2 von 43 bzw. 3 von 41 Punkten.
4. **Zwei Quellen nur über Dritte.** HECVAT kam über einen inoffiziellen GitHub-Spiegel (Herausgeberseite antwortete mit 403), AI-CAIQ über einen abgeleiteten Datensatz (der CSA-Download verlangt einen Login; der Datensatz behauptet in den eigenen Metadaten, mit der Original-Arbeitsmappe übereinzustimmen, das haben wir nicht geprüft). Lizenzen beider Originale sind nicht verifiziert.
5. **Auswahlentscheidungen des Auswerters.** Bei HECVAT sind nur die 40 KI-Fragen (von 332) berücksichtigt. Beim Klassifikator-Tool sind nur drei der Teilfragebögen (Risikokategorie, Rolle, Art. 50) ausgewertet und die Extraktion ist programmatisch aus JSON; Fragen, die nur in `uiSchema` oder Übersetzungsdateien stehen, fehlen möglicherweise. UK AIME ist der Konsultationsentwurf, eine Endfassung wurde nicht gefunden.
6. **Zwei Rater, ein Modell.** Rater 2 hat denselben Autor, dasselbe Kontextfenster und dasselbe Protokoll. Gleichgerichtete Fehler, insbesondere an der Grenze b/c bei Sachverhaltsfragen mit Rechtsbegriff, bleiben unsichtbar. Das Rater-2-Ergebnis ist deshalb ein Konsistenztest, kein unabhängiges Urteil. Die Übereinstimmung von 99,6 % ist vor allem Folge davon, dass Rater 1 654 von 701 Fragen in c eingeordnet hat, davon nur 5 mit Zweifel-Tag (Prozessnachweise ohne AI-Act-Merkmal sind leicht zu erkennen).
7. **Die Grenze zwischen b und c ist eine Auslegungsfrage.** Beispiele: "Nutzt das System biometrische Daten?" (Rechtsbegriff, aber Sachverhaltsfrage), "Wird das Modell mit personenbezogenen Daten trainiert?" (DSGVO-Begriff, nach Protokoll c). Eine weitere Auslegung des Korpus (zum Beispiel Einbezug der DSGVO) würde einzelne c-Fragen verschieben. Selbst wenn alle unsicheren Fragen als b zählten, bliebe F bei höchstens 7,4 %.

## 7. Nicht beschafft oder nicht aufgenommen, mit Grund

| Kandidat | Befund | Grund |
|---|---|---|
| BSI AIC4 (Kriterienkatalog) | PDF abgerufen, Text extrahierbar, 0 Fragezeichen | Aussagesätze (Kriterien), keine Fragen; nach Protokoll 2.6 nicht gezählt, nichts abgeleitet |
| Fraunhofer IAIS KI-Prüfkatalog, Hauptteil | Abgerufen (DE 2021, EN 2023) | rund 195 Anforderungen für Prüfende; nur der AI-Profil-Teil (8 Items) ist Fragebogen und aufgenommen |
| ECNL/DIHR FRIA-Leitfaden (Dez. 2025, CC BY-SA 4.0) | Leitfaden-PDF abgerufen | Der eigentliche Fragebogen ist eine Excel-Vorlage; ein Link dazu war auf den abgerufenen Seiten nicht zu finden. Die Leitfragen im Leitfaden sind Moderationshilfen, kein Fragebogen |
| EU MCC-AI "Light Version" | gleiche Quelle wie aufgenommene High-Risk-Fassung | nicht ausgewertet; Annexstruktur ähnlich, kein zusätzlicher Dokumenttyp |
| MCC-AI Anhänge C und D | im aufgenommenen Dokument | Inhaltsvorgaben für Dokumente, keine Fragen (Protokoll Abschnitt 3); mitgezählt gäbe das rund 30 weitere c-Items |
| FLI EU AI Act Compliance Checker | Seite abgerufen (Auskunft per WebFetch) | Fragen standen laut dieser Auskunft nicht im Seitentext, sondern nur im interaktiven Tool; nicht extrahiert |
| ARQNXS/eu-ai-act-compliance-checker | Fragen im Repo lesbar (37) | proprietäre Lizenz ("All rights reserved"), Artikelnummern aus dem Entwurf des AI Act (zum Beispiel "Art. 61 Post-market monitoring"), also veraltet |
| CSA AI-CAIQ, Original | Download nur mit CSA-Login | über abgeleiteten Datensatz aufgenommen (Abschnitt 6) |
| EDUCAUSE HECVAT, Herausgeberseite | HTTP 403 | über Spiegel aufgenommen (Abschnitt 6) |
| Microsoft Responsible AI Impact Assessment Template (PDF, 2022), Canada Algorithmic Impact Assessment (JSON im GitHub-Repo, MIT), Singapore ISAGO | Microsoft und Canada abgerufen, Text bzw. JSON extrahierbar; die ISAGO-URL lieferte HTML statt PDF und wurde nicht weiter geprüft | Folgenabschätzungen oder Selbstbewertungen, keine Lieferantenfragebögen und nicht am AI Act ausgerichtet; nicht ausgewertet (Ergebnis erwartbar überwiegend c, nicht geprüft) |
| NIST AI RMF Playbook | Seite erreichbar (HTTP 200), Inhalt nicht geprüft | nur als Vergleich vorgesehen; nicht ausgewertet |
| UK "Guidelines for AI procurement" | abgerufen (OGL) | enthält nur etwa vier Fragen in Fließtext, kein Fragebogen |
| Community-Vorlagen (Robert Li, Australien/APRA; AI4Belgium; SimpleAct und weitere Checklisten-Repos) | per `gh` gefunden | Robert Li: australisches Regulierungsumfeld, nicht AI-Act; AI4Belgium: ALTAI-Ableger, dasselbe Material; Checklisten-Repos: nicht ausgewertet |
| Bitkom, VDE SPEC 90012, appliedAI, ICO-Toolkit, NHS-Käufer-Checkliste, WEF "AI Procurement in a Box" | geratene URLs lieferten 404, 403 oder keine Inhalte | **kein Beleg für Nichtexistenz**; ohne WebSearch konnte die richtige Adresse nicht ermittelt werden |
| TÜV, DEKRA und weitere Zertifiziererlisten | keine Quelle ermittelt | ohne WebSearch nicht auffindbar; ob öffentlich, ist offen |
| arbeitgeberinterne Unterlagen | nicht verwendet | benötigen schriftliche Freigabe |

## 8. Abweichungen und Prüfliste für Altan (Soll höchstens 30 Minuten)

Entscheidungsregel: Bitte pro Zeile a, b oder c nach Protokoll Abschnitt 4 eintragen, zusätzlich in `eval/questionnaires/_adjudication.csv` (Spalte `class_final`). Danach `python3 eval/questionnaire_stats.py` erneut ausführen.

### 8.1 Abweichungen Rater 1 gegen Rater 2 (3)

| ID | Wortlaut (gekürzt) | R1 | R2 | Begründung R1 | Begründung R2 | Entscheidung Altan |
|---|---|---|---|---|---|---|
| `AA-AI1-risk-5.a.4` | Can the AI system potentially have negative consequences for the user or other people? | b | c | [U:c] Schadensmerkmal aus Art. 5 Abs. 1 Buchst. a, formuliert als allgemeine Risikoeinschätzung | S5: [U:b] allgemeine Risikoeinschätzung ohne benanntes Rechtsmerkmal | |
| `AA-AI1-risk-art6.thirdParty` | Is the product whose safety component is the AI system, or the AI system itself as a product, required to undergo a third-party conformity assessme... | b | c | Merkmal Drittkonformitätsbewertung, Art. 6 Abs. 1 Buchst. b | S1: [U:b] Drittprüfpflicht folgt aus Sektorrecht (Anhang-I-Rechtsakte), nicht aus dem AI-Act-Text | |
| `ARTEM-06` | Is the product using general-purpose AI models? | b | c | [U:c] Subsumtion des verwendeten Modells unter den Begriff KI-Modell mit allgemeinem Verwendungszweck (Art. 3); nah an Sachverhaltsfrage | S5: [U:b] Produktarchitektur in Beschaffungssprache; "KI-Modell mit allgemeinem Verwendungszweck" wäre Rechtsbegriff | |

### 8.2 Übereinstimmend kodiert, aber von mindestens einem Rater als unsicher markiert

| ID | Wortlaut (gekürzt) | Klasse | Tag R1 | Tag R2 |
|---|---|---|---|---|
| `AA-AI1-risk-III.1` | Does the AI system use biometric data? | b | c | c |
| `AA-AI1-risk-III.1.1` | What does the AI system do with biometric data? | b | c | c |
| `AA-AI1-risk-art50.nudify` | Is the AI system used for non-consensual fake nude imagery? | b | - | c |
| `AA-AI1-risk-III.2.6-cer` | Is the AI system intended to be used by an entity identified as critical under the Critical Entities Resilience Directive? | c | b | b |
| `AA-AI2-role-q13` | Is the AI system already in use? | c | b | b |
| `ANKIT-30` | EU AI Act readiness: provider obligations, Code of Practice (if GPAI provider): | c | b | b |
| `ARTEM-08` | Are outputs used for decisions about people? | c | b | b |
| `ARTEM-41` | Does the vendor explain customer responsibilities? | c | b | b |

### 8.3 Optionale Stichprobe übereinstimmender Fragen (gegen gleichgerichtete Fehler)

10 Fragen mit Klasse b, 20 mit Klasse c, deterministisch gezogen (Seed 20261003). Prüfen Sie, ob Sie der Klasse zustimmen; bei Widerspruch bitte in `_adjudication.csv` eintragen.

| ID | Wortlaut (gekürzt) | Klasse beider Rater | Entscheidung Altan |
|---|---|---|---|
| `AA-AI1-risk-5.e.2` | Does this involve large-scale collection of facial images from the internet or security cameras (scraping)? | b | |
| `AA-ART50-deepfakeException` | Your AI system generates or manipulates image, audio or video content that resembles real people, objects, places or events (a deep fake). Which of... | b | |
| `AA-AI1-risk-annexI` | Does your AI system fall within the scope of Annex I of the AI Act — either as the product itself, or as a safety component of a regulated product? | b | |
| `AA-AI1-risk-III.7.4` | Is the AI system used for the detection, recognition or identification of individuals? | b | |
| `AA-AI1-risk-annexIIIGate` | Does the AI system fall within any of the following domains? | b | |
| `AA-AI1-risk-6.3` | Which of the following scenarios apply? | b | |
| `AA-AI1-risk-III.6-5.d.solely` | Is the risk assessment based solely on profiling of the natural person or on assessing personality traits and characteristics? | b | |
| `AA-AI2-role-q12b` | Does one of the following scenarios apply to your AI system? | b | |
| `AA-AI1-risk-III.1.2-prohibited` | Which of the following scenarios apply to your AI system? | b | |
| `AA-AI1-risk-III.8.elections` | Is the AI system intended to be used to influence the outcome of an election or referendum, or to influence the voting behaviour of natural persons... | b | |
| `CAIQ-UEM-03.1` | Is a process defined and implemented to validate endpoint device compatibility with operating systems and applications? | c | |
| `CAIQ-DCS-05.1` | Are policies and procedures for the secure transportation of physical media established, documented, approved, communicated, applied, evaluated, an... | c | |
| `ALTAI-R2-20` | Could a low level of accuracy of the AI system result in critical, adversarial or damaging consequences? | c | |
| `ALTAI-R1-05` | Are end-users or subjects informed that they are interacting with an AI system? | c | |
| `CAIQ-SEF-10.1` | Are points of contact maintained for applicable regulation authorities, national and local law enforcement, and other legal jurisdictional authorit... | c | |
| `CAIQ-HRS-10.1` | Are requirements for non-disclosure/confidentiality agreements reflecting organizational data protection needs and operational details identified, ... | c | |
| `ALTAI-R6-16` | Did you take measures that ensure that the AI system does not negatively impact democracy? | c | |
| `ALTAI-R7-03` | Did you foresee any kind of external guidance or third-party auditing processes to oversee ethical concerns and accountability measures? | c | |
| `HECVAT-AIML-08` | Do you watermark your ML training data? | c | |
| `CAIQ-TVM-13.1` | Are processes, procedures, and technical measures to apply guardrails to the AI system defined and implemented? | c | |
| `ALTAI-R2-26` | Did you put in place a well-defined process to monitor if the AI system is meeting the intended goals? | c | |
| `CAIQ-AIS-03.1` | Are technical and operational metrics defined and implemented in alignment with business objectives, security requirements, and compliance obligati... | c | |
| `AIME-6.6` | Do you sign and retain written contracts with third parties that process personal data on your behalf? | c | |
| `CAIQ-STA-11.1` | Are service agreements required to incorporate at least the following mutually agreed upon provisions and/or terms? • Scope, characteristics and lo... | c | |
| `ANKIT-10` | Data residency options for EU and UAE customers? | c | |
| `CAIQ-AIS-08.1` | Are processes, procedures and technical measures to secure APIs, including authorization flaws, API key management, regular security testing, defin... | c | |
| `CAIQ-DCS-08.1` | Are physical security perimeters designed and implemented to safeguard personnel, data, and information systems? | c | |
| `CAIQ-DSP-21.1` | Are processes, procedures and technical measures to prevent data poisoning in AI models and continuously detect such, defined, implemented and eval... | c | |
| `CAIQ-DSP-13.1` | Are processes, procedures, and technical measures defined, implemented, and evaluated for transferring and sub-processing personal data within the ... | c | |
| `ALTAI-R2-04` | Did you assess potential forms of attacks to which the AI system could be vulnerable? | c | |

## 9. Reproduzierbarkeit und Grenzen der Dokumentation

- Je Fragebogen: URL, Abrufweg, Abrufdatum, SHA-256 der abgerufenen Datei, Lizenzwortlaut und das Feld `publishable_text` in `eval/questionnaires/<slug>.yaml`. Quelldateien liegen nicht im Repo.
- `python3 eval/questionnaire_stats.py --check` prüft Vollständigkeit und Zählung; ohne Argument entstehen die Tabellen dieses Berichts.
- Die Extraktions- und Prüfskripte liegen nur im Arbeitsverzeichnis der Session, nicht im Repo.
- Vor Veröffentlichung von `eval/questionnaires/` gilt Protokoll Abschnitt 8: Wortlaute von `prüfen`-Quellen (MCC-AI, Fraunhofer, HECVAT, AI-CAIQ) vor Veröffentlichung klären oder durch ID plus Hash ersetzen.
