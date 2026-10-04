# SPEC – Verifizierbarer Rechtsgraph für den EU AI Act

**Version 0.2 · 2026-10-03 · Status: Entwurf zur Freigabe durch Altan (Gate G1)**
Belege: `FACTS.md` (F-IDs), `research/README.md` (Berichte 01–08), Entscheidungen `docs/INDEX.md`. Vorgeschlagene Entscheidung: ADR-006. v0.1 liegt in `archive/SPEC-v0.1.md`.

## Changelog
- **v0.2 (2026-10-03):** Komplett neu auf Basis von sechs geprüften Recherche-Berichten. Positionierung von "Rechtsdaten-Layer" zu "verifizierbarer Rechtsgraph" geschärft (ADR-002 Nachtrag, ADR-006 vorgeschlagen). Wettbewerbsbild korrigiert (≥17 MCPs, AI Act Radar, Legalithm, Lexbeam). Architektur auf MCP-Spec 2026-07-28 umgestellt. Verifikation in Stufen G0–G4. Eval-Ziele statistisch. Nachfrage-Gate vor Phase 2. Arbeitsmodell mit Entscheidungspunkten für Altan.
- **v0.1 (2026-10-03):** Erster Entwurf nach Vorrecherche.

---

## 1. Zielbild

**Ein Satz:** Jede Aussage, die ein Mensch oder ein Agent über das KI-Recht der EU trifft, lässt sich in Sekunden gegen Wortlaut, Fassung, Stichtag und Fundstelle prüfen.

**Endzustand in drei Jahren:** Ein offener, versionierter Rechtsgraph für KI-Regulierung, zuerst für den AI Act mit Sekundärrecht, Soft Law, Normenstatus und deutschem Durchführungsrecht, später jurisdiktionsübergreifend (Colorado, Korea, Schweiz). Darauf eine Verifikationsschicht, die Zitate nicht nur auf Existenz prüft, sondern auf Geltung zum Stichtag, Sprachfassung und Stützung der Aussage. Zugänglich als MCP für Agenten, als REST für Plattformen, als Explorer für Menschen, als Dataset mit DOI für Forschung. Betrieben von einer Person mit automatisierter Pipeline und menschlichem Freigabe-Gate.

**Warum das zählt:** Legal-RAG-Tools der Marktführer halluzinieren in 17–33 % der Fälle (F30), Gerichte zählen über 2.100 Fälle erfundener Zitate (F31). Die großen Anbieter bauen gerade "Verify"-Funktionen, die nur Existenz prüfen (F15). Der AI Act hat seit Juli 2026 zwei Fassungen (F1), Modelle mit Wissensstand vor dem Omnibus zitieren die falsche (F27). Niemand im AI-Act-Umfeld liefert konsolidierten Volltext mit Stichtag, Diff und mehrstufiger Verifikation (F39–F42).

**Doppelter Zweck:** Portfolio-Beweis für Forward-Deployed-/Solutions-Engineer- und AI-Governance-Rollen (F10) ist ab Phase 1 gesichert. Einkommen ist eine Wette mit klaren Gates (§9, §11).

---

## 2. Was die Recherche an v0.1 geändert hat

| Befund (Beleg) | Konsequenz in v0.2 |
|---|---|
| Reiner Gesetzeszugang ist Commodity, bezahlt wird für Verifikation (F15, F16) | Kern ist `aiact_verify_citation`, nicht `get_provision` |
| ≥17 AI-Act-MCPs; Lexbeam mit Claim-Matrix, Legalithm mit Drift-Check, AI Act Radar mit Feed/Webhook/REST/MCP ab 500 €/Mo (F39–F43) | "Rechtsdaten-Layer" allein ist besetzt; Differenzierung = Volltext + `as_of`/Diff + Soft Law + DE-Recht + G0–G4 + öffentliche Evals |
| Nachfrage: Interesse wächst, Zahlungsbereitschaft unbelegt; Wettbewerber bei 0,3–2,3k Downloads/Monat (F43–F45) | Nachfrage-Gate vor Phase 2; Einkommen als Hypothese H1 geführt; Portfolio-Wert zuerst |
| Echte Schmerzen: Rolle, Art. 50, Nachweis für die Compliance-Abteilung (Bericht 06, H8) | Neues Tool `aiact_evidence_record`: zitierfähiger Nachweis-Export |
| Colorado-Gesetz vor Inkrafttreten ersetzt (F12); Berichtigungen sprachspezifisch (F33) | Datenmodell jurisdiktionsagnostisch, Status-Flags, Fassungen pro Sprache, drei Zeitachsen |
| MCP-Spec 2026-07-28 stateless, Elicitation/Sampling/Roots raus (F22) | Architektur zustandslos, offene Fragen als `open_questions` im Ergebnis, Adapter für 2025-11-25 |
| "0 False Negatives" bei 100 Fällen nicht belegbar (F36); Prompt-Abstention wirkt nicht (F35) | Eval-Ziele als Konfidenz-Obergrenzen; Abstention architektonisch |
| CELLAR liefert konsolidierte Fassung als XHTML, Formex nicht (F38); Cellar-Notification-Feed existiert (F32) | Ingestion über XHTML, Change-Detection über Feed statt Scraping |
| Korpuslücken: Code of Practice Kennzeichnung, Serious-Incident-Vorlage, MDCG 2025-6, Hochrisiko-Leitlinien-Entwurf (F47) | Korpusliste erweitert, Entwurfsstatus als eigenes Attribut |
| Modelle rufen Tools nicht auf, wenn sie die Antwort zu kennen glauben (F27) | Tool-Beschreibungen erzwingen Aufruf; Plugin mit Skill; `as_of` als Pflichtargument |
| Öffentlicher Diskurs zitiert Fristen ohne Fassung, Omnibus kaum präsent, Art. 50 erreicht Laien; kein Beleg für Chatbot-Halluzinationen zum AI Act (F54) | Explorer/pSEO auf Art.-50- und Fristen-Fragen ausrichten; "Chatbots halluzinieren" nicht als Verkaufsargument, solange unbelegt |

---

## 3. Positionierung und Moat

### 3.1 Die Lücke
Keiner der Wettbewerber bietet alle fünf zusammen: (1) konsolidierten Volltext in 24 Sprachen mit `as_of` und Diff, (2) Soft Law mit Seitenreferenz inklusive Entwurfsstatus, (3) nationales Recht (KI-MIG, BNetzA-Material), (4) mehrstufige Zitatverifikation G0–G4, (5) öffentliche, versionierte Evals mit `uncertain`-Metrik. Lexbeam hat Summaries ohne `as_of` (F39), Sovereign Originaltext plus Einfügungen, AI Act Radar ein Update-Register ohne Volltext (F42), Legalithm einen eigenen Korpus für Produkt-Compliance (F40), die Kommission Web-Tools ohne API (F6, F48).

### 3.2 Moat-Hierarchie (nach Belegstärke)
1. **Verifikation statt Zugang.** Der "Citator für den AI Act": byte-genauer Abgleich, Geltung zum Stichtag, Sprachfassung, Stützung der Aussage, Authority Recall (Bericht 05 §Referenzarchitektur). Marktführer verkaufen Verify-Funktionen, die bei Stufe 0 enden (F15).
2. **Temporaler Graph.** Drei Zeitachsen, Fassungen pro Sprache, Status-Flags, Diff zwischen Fassungen (F12, F33). Teuer nachzubauen, billig zu pflegen, sobald die Pipeline steht.
3. **Provenienz und Reproduzierbarkeit.** Hash-Kette von Original-XHTML bis Antwort, `corpus_release_id` und `rules_version` in jeder Antwort, öffentliche Eval-Reports pro Release. Lexbeam zeigt, dass das in dieser Nische bereits Erwartung ist (F39); wir müssen besser sein, nicht nur gleich.
4. **Soft Law und nationales Recht.** Niemand deckt Leitlinien-Entwürfe, Code of Practice, MDCG, BNetzA-FAQ maschinenlesbar ab (F47, F48).
5. **Offene Lizenz als Vertrauensanker.** Code Apache-2.0, Korpus CC BY 4.0 (wie AI Act Radar und AI Law Radar, F41, F42). Moat ist nicht der Code, sondern Aktualität und Prüfbarkeit.

### 3.3 Was wir bewusst nicht bauen
GRC-Workflow (Inventar, Evidence-Collection, Aufgaben), Bias-Testing, Annex-IV-Dokumentengenerierung, Rechtsberatung, Normtexte (urheberrechtlich geschützt, nur Metadaten), breite Jurisdiktionen vor dem EU-Beweis (Bericht 01 §6, Bericht 02).

### 3.4 Wettbewerbsmatrix

| Fähigkeit | Wir (Ziel) | Lexbeam | Sovereign | Legalithm | AI Act Radar | Kommission |
|---|---|---|---|---|---|---|
| Konsolidierter Volltext | ✅ 24 Sprachen | ❌ 28 Summaries | teils (2024 + Einfügungen) | eigener Korpus, Produkt-Fokus | ❌ Register | Web-Explorer |
| `as_of` / Diff | ✅ | ❌ | ❌ | `asOf` im Record | versioniertes Schema | ❌ |
| Soft Law mit Seitenreferenz | ✅ | ❌ | ❌ | ❌ | Updates ohne Volltext | Web |
| Nationales Recht (DE) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Verifikation G0–G4 | ✅ | Claim-Matrix (Build-Zeit) | ❌ | Drift-Check (Record) | ❌ | ❌ |
| Change-Feed/Webhook | Phase 2 | ❌ | ❌ | CI-Drift | ✅ HMAC-Webhooks | ❌ |
| Öffentliche Evals | ✅ versioniert | Front-Door-Eval | ❌ | ❌ | ❌ | ❌ |
| Nachweis-Export | ✅ | ❌ | ❌ | signierte Records | ❌ | ❌ |

---

## 4. Zielgruppen, Jobs und Evidenzstärke

| Prio | Zielgruppe | Job to be done | Nachfrage-Evidenz | Zahlungs-Evidenz | Kanal |
|---|---|---|---|---|---|
| 1 | Entwickler und Agent-Builder (Claude Code, Cursor, eigene Agenten) | "Beweise mir mit Fundstelle und Fassung, ob und was für mein Feature gilt, und gib mir einen Nachweis, den ich intern vorzeigen kann" (llama.cpp #27826, H8) | mittel | schwach | MCP lokal + remote, Plugin, Registry, Connectors Directory |
| 2 | GRC-/Compliance-Plattformen, Zertifizierer, Verlage | "Gepflegter, versionierter Korpus mit Feed, damit wir keine Rechtsredaktion brauchen" | schwach (Holistic AI baut intern) | Preisanker 500 €/Mo existiert, Kunden unbelegt (F42, F45) | REST, Webhooks, Lizenz; **nur nach Interviews** |
| 3 | Forschung, Lehre, Journalismus | Zitierfähige, maschinenlesbare Fassungen plus Diffs | nicht untersucht | Reputation, keine Zahlung | Dataset mit DOI, Explorer |
| 4 | KMU und Compliance-Mitarbeitende mit ChatGPT/Claude | "Antwort mit Fundstelle statt aus dem Gedächtnis" | mittel (Verwirrung belegt) | schwach (kostenlose Alternativen) | Remote MCP, Explorer, später Report |

Priorität 1 ist zugleich Portfolio-Zielgruppe. Priorität 2 entscheidet über Einkommen und wird vor Investition validiert (§11, Gate G3).

---

## 5. Produktprinzipien

1. **Beleg vor Antwort.** Jede Aussage trägt Provision-ID, Fassung, Sprache, Stichtag und Quote-Hash. Kein Zitat ohne wörtlichen Treffer im Korpus (G0).
2. **Versioniert in drei Zeitachsen.** Fassungsgeltung, Anwendungsbeginn nach Art. 113, Korpus-Wissensstand. Jede Abfrage akzeptiert `as_of`; jede Antwort nennt `corpus_release_id`.
3. **Deterministisch, wo Recht deterministisch ist.** Fristen, Rollen, Anwendbarkeit, Risikoklasse laufen durch eine versionierte Regel-Engine. Das LLM extrahiert Fakten, es urteilt nicht.
4. **Unsicherheit ist ein Ergebnis, architektonisch erzwungen.** Dreiwertige Logik; `uncertain` mit `blocking_questions` und `guidance_refs`; Retrieval-Schwellen; kein Prompt-"Abstain" (F35).
5. **Nur das Amtsblatt ist authentisch.** Disclaimer nach eCFR- und EUR-Lex-Muster; wir sind Hilfsmittel, nicht Rechtsquelle und nicht Rechtsberatung.
6. **Offen und prüfbar.** Apache-2.0, CC BY 4.0, öffentliche Testsuite, Eval-Report pro Release, Errata-Prozess, Methodikseite.
7. **Jurisdiktionsagnostisch gebaut, EU-first gefüllt.** `jurisdiction`, `instrument_type`, `status` von Tag 1 im Schema; Inhalt zuerst EU vollständig (Bericht 02).
8. **Zustandslos und protokollrobust.** MCP 2026-07-28 ohne Sessions, REST aus demselben Handler, Adapter für 2025-11-25 (F22).

---

## 6. Endlösung: Komponenten

### 6.1 Korpus

| Ebene | Inhalt | Quelle | Phase |
|---|---|---|---|
| Primärrecht | AI Act OJ-Fassung `32024R1689` und konsolidiert `02024R1689-20260727`, alle 24 Sprachen, Erwägungsgründe, Anhänge I–XIV | CELLAR XHTML per Content Negotiation (F38) | 1 (EN, DE), 2 (Rest) |
| Änderungsakte | VO (EU) 2026/1744 als eigenes Dokument, Mapping auf geänderte Vorschriften, Berichtigungen pro Sprache (F33) | CELLAR | 1 |
| Sekundärrecht | Delegierte/Durchführungsrechtsakte; Omnibus-Fristen: Annex-I-Leitlinien bis 01.08.2027, PMM-Vorlage bis 02.09.2027 (F47) | Cellar-Feed (F32) | Pipeline 1, Inhalt bei Erscheinen |
| Soft Law | Leitlinien Definition (02/2025), Verbote (02/2025), GPAI + Code of Practice (07/2025), Art. 50 (07/2026), **Code of Practice Kennzeichnung (06/2026), Hochrisiko-Leitlinien-Entwurf (05/2026, Status Entwurf), Serious-Incident-Vorlage, MDCG 2025-6**, Service-Desk-FAQ | HTML/PDF mit Seitenreferenz; `status: draft|final` | 1 (Kern), 2 (Rest) |
| Nationales Recht DE | KI-MIG, BNetzA-FAQ (18), KI-Kompass, Factsheets (F5, F48) | gesetze-im-internet, BGBl, BNetzA-HTML | 1 (KI-MIG), 2 (BNetzA) |
| Normen | JTC-21-Arbeitsprogramm: Titel, Status, Artikelbezug, ABl.-Verweis; **nie Normtext** (F7) | CEN-CENELEC, ABl. | 2 |
| Rechtsprechung | EuGH/EuG zum AI Act (noch leer) | CELLAR | 3 |
| Weitere Jurisdiktionen | Colorado, Kalifornien, Texas (Canary), Korea, Schweiz (F11, F12) | Bill-Seiten, law.go.kr API, Fedlex | 3 |

**Datenmodell (Kern, bitemporal, Bericht 05):**
```
provision_lineage(lineage_id, jurisdiction, work_id, logical_path)             -- stabile logische Adresse
provision_version(version_id, lineage_id, lang, text, text_hash,
                  in_force daterange, applies daterange, recorded tstzrange,
                  amending_act, status, source_doc_hash)                        -- Fassung je Sprache
status ∈ {in_force, not_yet_applicable, delayed, enjoined, repealed_replaced, draft, superseded}
xref(from_lineage, to_lineage, kind, valid daterange, provenance)               -- Erwägungsgrund, Anhang, Leitlinie, Norm, Crosswalk
instrument(instrument_id, jurisdiction, instrument_type, title, status, source) -- Gesetz, Soft Law, Norm, Entscheidung
corpus_release(release_id, created_at, manifest_hash, changelog)                -- signiertes Release
```
IDs: `eli:reg/2024/1689/art_6/par_3/pt_a@2026-07-27#deu`. Originale (XHTML, PDF) gehasht im Objektspeicher. Normalisierung (Unicode NFC, Whitespace, Soft-Hyphen) identisch für Korpus und Guard.

### 6.2 Verifikation (der Citator)

| Stufe | Prüft | Methode | Ergebnis |
|---|---|---|---|
| G0 Existenz | Steht das Zitat wörtlich in der angegebenen Vorschrift? | Byte-Match nach Normalisierung | `exact | fuzzy(score) | not_found` |
| G1 Geltung | Galt diese Fassung zum `as_of`? Ist sie anwendbar (Art. 113)? | Zeitachsen-Abfrage | `in_force | not_yet_applicable | superseded_by(version) | delayed_to(date)` |
| G2 Sprachfassung | Stimmt die Sprache, gibt es Berichtigungen? | Pro-Sprache-Fassung (F33) | `ok | corrigendum(id)` |
| G3 Stützung | Trägt die Fundstelle die Aussage? | Stichproben-Audit, später LLM-Judge kalibriert | `supported | partial | unsupported | unreviewed` |
| G4 Authority Recall | Fehlen Pflichtbestimmungen zu diesem Regelknoten? | Graph-Abgleich | Liste fehlender Normen |

Jede Antwort jedes Tools läuft durch G0–G2 vor Auslieferung. G3 ist Produktfeature (`aiact_verify_citation`) und Eval-Gegenstand.

### 6.3 Regel-Engine
YAML-Entscheidungsgraph als Quelle der Wahrheit, JSON-Schema-validiert, dreiwertig (`true|false|unknown`), jede Kante mit `basis` (Provision-ID + Quote-Hash + Rolle `defines|condition|exception` + Geltungsintervall), Terminal `uncertain` mit `blocking_questions` und `guidance_refs`, offene Rechtsbegriffe als markierte Blätter. Abgedeckt: Art. 2 (Anwendungsbereich), Art. 3 (Rollen, Definition), Art. 5 (Verbote inkl. neues Verbot F4), Art. 6 + Anhang I/III inkl. Abs.-3-Ausnahmen, Art. 50, Kap. V GPAI-Schwellen, Art. 113 Fristen. Nicht abgedeckt: Art. 8–15 technische Anforderungen (dafür existieren Rego-Ansätze, Bericht 05 §5).
Review: zwei unabhängig erzeugte Entwürfe gegeneinander testen, Divergenzen in natürliche Sprache rückübersetzen, Jurist entscheidet Fälle, Entscheidung wird Regressionstest. DMN-/Mermaid-Export fürs Review; Juristen sehen Fälle, kein YAML.

### 6.4 Change-Pipeline
Täglicher Lauf (Berta-Muster, Claude Code scheduled): Cellar-Notification-Feed (`type`, `wemiClasses`, F32) für Primär- und Sekundärrecht; Sitemap-/Hash-Diff für Kommissions-, Service-Desk- und BNetzA-Seiten; JTC-21-Tracker. Jede Änderung: Hash, Diff, Changelog-Entwurf. Primärrecht geht nach menschlicher Sichtung (15 Min./Woche) in `stable`; `preview` sofort. Jedes Release signiert mit Manifest-Hash. Feed-Ausgabe: RSS/JSON, Webhooks (Phase 2).

### 6.5 Tools (MCP, Präfix `aiact_`, alle `readOnlyHint: true`, `as_of` optional mit Default = heute, `response_format: concise|detailed`)

| Tool | Zweck | Ersetzt aus v0.1 |
|---|---|---|
| `aiact_search` | Hybrid-Suche (BM25 + Dense, RRF, Parent-Expansion) mit Filtern doc_type, lang, as_of, jurisdiction | `search` |
| `aiact_get_provision` | Wortlaut + Erwägungsgründe + Querverweise + Leitlinien; Parameter `include: [recitals, guidance, definitions, citation]` | `get_provision`, `glossary`, `cite` |
| `aiact_diff` | Wort-Diff zwischen Fassungen oder Sprachen, verursachender Akt | `diff_provision` |
| `aiact_verify_citation` | **Kern.** Zitat + behauptete Fundstelle + as_of → G0–G3-Ergebnis mit Korrekturvorschlag | neu |
| `aiact_timeline` | Fristen nach Rolle/Systemtyp/as_of inkl. Verschiebungen, Schonfristen, Status | `get_timeline` |
| `aiact_classify` | Strukturierte Fakten → Rolle(n) + Tier + Pfad mit Fundstellen + `uncertain`/`open_questions`; Fakten füllt das aufrufende Modell (Schema mit Pflichtfeldern, Enum `unknown`) | `determine_role`, `classify_system`, `extract_facts` (gestrichen, Bericht 04) |
| `aiact_obligations` | Pflichtenliste nach Rolle, Tier, as_of mit Status, Leitlinie, Normstatus | `list_obligations` |
| `aiact_guidance` | Soft Law zu Artikel/Thema mit Seitenreferenz und Entwurfsstatus | `get_guidance` |
| `aiact_changes` | Änderungen seit Datum, nach Scope, mit Diff-Links | `get_changes` (Phase 2 → 1, weil Feed-Primärquelle existiert) |
| `aiact_evidence_record` | Signierter Nachweis (JSON, optional PDF): Frage, Fakten, Ergebnis, alle Fundstellen mit Hash, Fassung, Release-ID, Zeitstempel | neu (H8) |

Tool-Beschreibungen sagen ausdrücklich: "Immer aufrufen für Wortlaut, Fristen, Fassungen. Trainingsdaten kennen VO 2026/1744 nicht." (F27). Fehler sind handlungsleitend (gültige `as_of`-Bereiche, Beispielaufruf). Offene Fragen kommen als `open_questions` im Ergebnis zurück, keine Server-Elicitation (F22). Resources (`aiact://…`) und Prompts (`assess_feature`, `pre_release_check`) als Zusatz.

### 6.6 Oberflächen
1. **npm-Paket** (stdio) für Claude Code, Cursor, Codex; Plugin-Bundle mit Skill, das den Tool-Aufruf vorschreibt (F24).
2. **Remote MCP** (Streamable HTTP, zustandslos, ohne Auth für Free bei öffentlichen Daten; API-Key für Pro) auf eigener Domain; Listung: MCP Registry, Anthropic Connectors Directory, später ChatGPT (Bericht 04 §1).
3. **REST/OpenAPI** aus demselben Handler: Rückversicherung gegen Protokollwechsel, Kanal für Plattformen.
4. **Explorer** (Astro, statisch, pSEO): eine Seite pro Vorschrift, Fassung, Sprache, Diff, Leitlinie; permanente Zitierlinks; Verifikations-Widget.
5. **Evidence Report** (PDF) aus `aiact_evidence_record`, Bezahlprodukt für Nicht-Entwickler.
6. **Feed**: RSS/JSON, Webhooks mit HMAC (Phase 2).
7. **Dataset** mit DOI (Zenodo), CC BY 4.0, pro Release.

### 6.7 Stack
TypeScript, MCP TS-SDK v2 + Hono auf Cloudflare Workers (Server pro Request, F22, F23) · Supabase Postgres (bitemporal, pgvector, tsvector) · Objektspeicher für Originale · Ingestion und Change-Pipeline als Claude-Code-Agent auf vorhandener GCP-VM (Berta) · Stripe für Pro/Report, API-Key-Tabelle in Postgres, OAuth (WorkOS AuthKit) erst wenn Claude.ai-Endnutzer es brauchen · Resend für Alerts · Betriebskosten Free-Phase ≈ 30–40 €/Monat (Bericht 04 §6). Lizenz Code Apache-2.0, Korpus CC BY 4.0; keine AGPL-Abhängigkeiten (F49).
LLM-Einsatz nur zur Build-Zeit (Goldset-Entwürfe, Regel-Entwürfe, Judge) und optional für G3-Stichproben; Laufzeit ohne LLM, daher keine Abhängigkeit von Modell-Reproduzierbarkeit (F37).

---

## 7. Qualität und Evals

| Eval | Design | Ziel (statistisch, F36) |
|---|---|---|
| Retrieval | ≥150 Fragen DE/EN aus Top-10-Nutzerfragen (Bericht 06) und Leitlinien; Recall@5, MRR, NDCG@10 mit Konfidenzintervall | Recall@5 ≥ 0,90 (untere CI-Grenze ≥ 0,85) |
| Klassifikation | Goldset ≥100 Fälle: Kommissions-Beispiele (Hochrisiko-Entwurf, Verbote, Definition), AI Act Evaluation Benchmark nach manuellem Review, AIRO-SHACL als Gegenprobe (F46); Jurist labelt Grenzfälle | False-Negative-Rate bei `prohibited`/`high_risk`: 95 %-Obergrenze ≤ 3 %; `uncertain`-Rate und Coverage-Risk-Kurve berichtet |
| Citation Guard | 100 % G0 auf allen Tool-Antworten als CI-Test; G3-Stichprobe 50 Fälle/Release | G0 = 100 %, G3 supported ≥ 95 % |
| Fassungstest | Identische Frage mit `as_of` vor und nach 27.07.2026 | erwartete Differenz in 100 % der Omnibus-Fälle |
| Protokoll | Stub gegen Claude.ai, Claude Code, ChatGPT Dev Mode, VS Code mit Spec 2026-07-28 und 2025-11-25 | alle Clients verbinden |
| Externer Vergleich | Lexbeam `evals/front-door` (MIT) als Fremdset; die 12 Checker der Studie vom 28.09.2026 (F34) | öffentlich berichtet |
| Regression | Bei jedem Korpus-, Regel-, Modell-Release; Report öffentlich mit Release-ID | keine Verschlechterung |

Reranker nur nach Bake-off (F35). Embeddings per eigenem Vergleich (Kosten vernachlässigbar, Bericht 05 §3).

---

## 8. Anpassungsfähigkeit

Das Umfeld ändert sich monatlich (Spec-Revisionen, Omnibus, Kommissions-Tools, neue MCPs). Vorkehrungen:

| Risiko | Frühindikator (Watchlist) | Vorbereitete Reaktion |
|---|---|---|
| Kommission baut API/MCP für Single Information Platform | Service-Desk-News, Cellar-Feed | Wir bleiben bei Versionierung, Soft Law, DE-Recht, Verifikation; Kommissions-API als Quelle integrieren |
| MCP-Spec-Revision | Changelog modelcontextprotocol.io | Protokoll-Adapter-Schicht, REST als Fallback, Tools als Kern |
| Modelle zitieren Recht selbst korrekt | Anthropic/OpenAI-Releases, eigene Fassungstests | Verifikation und Nachweis-Export bleiben nötig, solange Haftung bei Menschen liegt; `as_of` als Argument, das Modelle nicht intern haben |
| Wettbewerber liefert Volltext + `as_of` | Monatlicher Scan Registry/npm (Agent) | Vorsprung bei Soft Law, DE-Recht, Evals, Nachweis-Export ausbauen; ggf. Partnerschaft |
| Weitere Verschiebung des AI Act | Kommissions-Arbeitsprogramm | Verschiebungen erhöhen Wert von `as_of`/Diff; Status-Flag `delayed` |
| Nachfrage bleibt aus | Gate-Metriken §11 | Wartungsmodus, Portfolio-Wert bleibt |

Prozess: Jeder ADR trägt Revisit-Trigger. Vierteljährliche Kurz-Recherche (ein Sonnet-Agent, Budget 30 Suchen) aktualisiert `FACTS.md`. Datenmodell ist jurisdiktionsagnostisch, damit ein Pivot auf US-Recht oder Korea kein Rewrite ist.

---

## 9. Monetarisierung (ehrlich)

| Stufe | Inhalt | Preis-Hypothese | Marktanker | Status |
|---|---|---|---|---|
| Free (dauerhaft) | npm, Remote ohne Auth ≥ 1.000 Calls/Monat, Explorer, Dataset | 0 € | AI Act Radar, Legalithm, Lexbeam alle gratis (F39–F42) | gesetzt |
| Pro | Change-Alerts, Webhooks, Diff-Historie, höhere Limits, SLA auf Fassungsstand; Calls nur Fair-Use | 29–79 €/Monat | Ansvar 29–249 €, AI Law Tracker 49–299 $ (F45) | Hypothese |
| Evidence Report | PDF-Nachweis mit Fundstellenkette | 49–149 € einmalig | kein Anker | Hypothese H5 |
| Vendor/Plattform | REST, Webhooks, White-Label, SLA, Rechnung | 500–2.000 €/Monat | AI Act Radar ab 500 €, AI Law Tracker OEM 499 $ (F42, F45) | Hypothese H1, **schwach belegt**, Gate G3 |
| Nebeneffekte | Sponsoring, Vorträge, Beratungsanfragen, Bewerbungswert | – | – | sicher |

Erwartung: Free und Pro erzeugen Reichweite. Niemand im Segment weist Umsatz aus (F45). Einkommen ist nur über Vendor/Plattform plausibel, und nur nach Interviews.

---

## 10. Arbeitsmodell und Autonomie

**Rollen.** Fable (Hauptsession) plant, delegiert, prüft, entscheidet, schreibt Spec/ADRs. Sonnet-Agenten recherchieren, implementieren, testen, dokumentieren. Haiku für Boilerplate. Jeder Agent-Output wird vor Übernahme geprüft (Review-Log für Recherche, Code-Review und Tests für Code).

**Was Fable allein entscheidet** (mit ADR): Technik innerhalb des Stacks, Datenmodell-Details, Tool-Schnittstellen, Eval-Design, Reihenfolge innerhalb einer Phase, Agenten-Einsatz.

**Entscheidungspunkte für Altan (Gates):**

| Gate | Wann | Altan entscheidet |
|---|---|---|
| G1 | Jetzt, nach SPEC v0.2 | Go/No-Go, Name, Lizenz, Sprache, juristischer Partner, Zeitbudget |
| G2 | Nach Phase-0-Spike (Parser + 10 Tool-Aufrufe live) | Weiter in MVP ja/nein |
| G3 | Vor Phase 2 | Vendor-Interviews geführt? Ergebnis → Vendor-Tier bauen oder nur passive Pfade |
| G4 | Vor jedem öffentlichen Launch oder bezahlten Tier | Freigabe von Außenauftritt, AGB, Disclaimer, Preisen |
| G5 | Vor jeder Ausgabe > 50 €/Monat oder Vertragsbindung | Freigabe |

Alles außerhalb der Gates läuft autonom. Fable meldet wöchentlich in `STATUS.md`: erledigt, Metriken, nächste Schritte, offene Fragen. Sicherheitsregeln: keine Secrets im Repo, keine irreversiblen Aktionen (Löschen, Veröffentlichen, Zahlen) ohne Gate.

---

## 11. Roadmap mit Gates und Kill-Kriterien

### Phase 0 · Fundament (Rest: 1 Woche)
- ✅ Recherche 01–06 geprüft; CELLAR-XHTML-Abruf reproduziert (F38).
- Spike: XHTML-Parser → Provision Tree für `32024R1689` und `02024R1689-20260727` (EN, DE), Stabilität der IDs über Fassungen prüfen, erster `aiact_diff` zwischen den Fassungen.
- Wartelisten-Landingpage (eine Seite, Explorer-Vorschau) als Nachfragemesser.
- Interview-Liste für G3: Saidot, Trail, Trustible, ComplyLayer, Legalithm, zwei Zertifizierer, zwei Agent-Teams.
- **G2-Kriterium:** Parser läuft für beide Fassungen, Diff zeigt Art. 4a/75a/Fristen korrekt.

### Phase 1 · MVP (6–8 Wochen bei 15–20 h/Woche)
- Korpus v1: beide Fassungen EN+DE, Omnibus, fünf Kern-Leitlinien + Code of Practice Kennzeichnung + Hochrisiko-Entwurf, KI-MIG.
- Regel-Engine: Art. 2, 3, 5, 6, 50, 113; Goldset ≥ 60 Fälle; Juristen-Review der Grenzfälle.
- Tools: alle zehn aus §6.5, G0–G2 auf jeder Antwort.
- Remote-Endpoint Free, npm, Plugin mit Skill, Registry-Listung, Connectors-Directory-Einreichung.
- README mit Eval-Report, Methodikseite, Dataset v1 mit DOI.
- Launch: Registry, Show HN, LinkedIn, artificialintelligenceact.eu-Newsletter.
- **Portfolio-Wert ist hier realisiert.**

### Phase 2 · Aktualität und Reichweite (4–6 Wochen) — nur nach G3
- Change-Pipeline mit Review-Gate, `aiact_changes` live, RSS/Webhooks.
- Explorer (pSEO), Normen-Tracker, restliche Sprachen.
- Evidence Report als erstes Bezahlprodukt.

### Phase 3 · Einkommen und Portabilität — nur mit zahlendem Pilot
- Pro-Tier, Vendor-Piloten aus G3.
- Canary-Jurisdiktion (Colorado/Kalifornien/Texas), dann Korea.

### Kill- und Pivot-Kriterien (vorab festgelegt)
- **Nach 8 Wochen Landingpage + Registry-Listung:** keine einzige Vendor-Anfrage und < 100 Tool-Calls/Woche pro Kanal → Wartungsmodus. Portfolio bleibt.
- **Nach Phase 1:** Eval-Ziele nicht erreichbar trotz Goldset → kein Launch mit Verifikationsversprechen, nur Explorer + Dataset.
- **Jederzeit:** Wettbewerber liefert alle fünf Lückenmerkmale aus §3.1 → Partnerschaft prüfen statt Parallelbau.

---

## 12. Entscheidungen für Altan (Gate G1, gebündelt)

1. **Go/No-Go** mit dem ehrlichen Bild: Portfolio-Wert sicher, Einkommen unbewiesen, Markt dichter als gedacht, aber die Lücke (§3.1) ist real und belegt.
2. **Name und Domain** (Vorschläge: `aiact.dev`, `actgraph.eu`, `lexact.eu`; Verfügbarkeit ungeprüft).
3. **Juristischer Sparringspartner** für Grenzfälle und Review (Verlobte im Referendariat, Uni-Kontakt); ohne ihn kein Verifikationsversprechen in der Außendarstellung.
4. **Vendor-Interviews:** Führst du sie (Netzwerk, GTM-Erfahrung) oder bereite ich nur Leitfaden und Liste vor?
5. **Lizenz** Apache-2.0 + CC BY 4.0 (Empfehlung) und **Sprache** TypeScript (Empfehlung).
6. **Zeitbudget** pro Woche als Planungsgröße.
7. **WebSearch-Budget** für Folgesessions erhöhen (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`), sonst bleiben Recherche-Lücken offen.

---

## 13. Offene Recherche-Lücken (Folgesession mit Budget)
Siehe `research/README.md` Spalte "Lücken". Priorität: Juristen- und Reddit-Stimmen (06), Kommissions-Arbeitsprogramm 2026/27 (03), Funding der Wettbewerber (03), Formex-vs-AKN-Stabilität der XHTML-IDs (H3), Modell-Fähigkeiten 5.5 für Build-Zeit-Extraktion (F37).
