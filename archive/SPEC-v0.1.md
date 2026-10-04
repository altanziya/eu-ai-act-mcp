# EU AI Act MCP Server – Anforderungs- und Architektur-Spec

**Stand:** 2026-10-03 · **Status:** Entwurf v0.1, zur Diskussion · **Autor:** Altan Kömek mit Claude (Fable 5.1)

---

## 0. Die These in drei Sätzen

Es gibt bereits vier EU-AI-Act-MCP-Server und ein Dutzend Compliance-Tools für KMU, teils kostenlos. Keiner davon ist eine **versionierte, quellentreue, täglich aktualisierte Rechtsquellen-Infrastruktur**, die Agenten und Tool-Hersteller per API anzapfen können. Genau das bauen wir: nicht noch ein Compliance-Tool, sondern den **"Rechtsdaten-Layer" für den AI Act**, auf dem Compliance-Tools, Agenten und Forschung aufsetzen.

Arbeitstitel: `aiact-mcp` (Name offen, siehe §12).

---

## 1. Marktlage (recherchiert 2026-10-03)

### 1.1 Rechtlicher Stand

| Datum | Ereignis | Quelle |
|---|---|---|
| 01.08.2024 | AI Act (VO (EU) 2024/1689) in Kraft | EUR-Lex 32024R1689 |
| 02.02.2025 | Verbote (Art. 5) + KI-Kompetenz (Art. 4) anwendbar | – |
| 02.08.2025 | GPAI-Pflichten, Governance, Sanktionen anwendbar | – |
| 08.10.2025 | Kommission startet AI Act Service Desk + Single Information Platform (Compliance Checker, Explorer; **keine API**) | digital-strategy.ec.europa.eu |
| 20.07.2026 | Finale Leitlinien zu Art. 50 (Transparenz) | Kommission |
| 27.07.2026 | **Digital Omnibus on AI, VO (EU) 2026/1744**, in Kraft; konsolidierte Fassung `02024R1689-20260727` | EUR-Lex |
| 29.07.2026 | **KI-MIG** (deutsches Durchführungsgesetz) in Kraft; BNetzA zentrale Marktüberwachung, KoKIVO | BGBl. I Nr. 233 |
| 02.08.2026 | Art. 50 Transparenzpflichten anwendbar; Kennzeichnungspflicht für Bestandssysteme mit Schonfrist bis 02.12.2026 | Omnibus |
| 02.12.2026 | Übergangsfrist für neues Verbot (NCII/CSAM-Generierung) endet | Omnibus |
| Q4 2026 | Erste harmonisierte Normen erwartet (EN 18286 QMS in Formal Vote) | CEN-CENELEC JTC 21 |
| 02.12.2027 | Hochrisiko Anhang III (verschoben von 08/2026) | Omnibus |
| 02.08.2028 | Hochrisiko Anhang I (verschoben von 08/2027) | Omnibus |

Konsequenz: Der Rechtstext hat jetzt **zwei Fassungen** (2024 und 2026). Jede Antwort muss sagen, auf welche Fassung sie sich bezieht. Das kann keiner der Wettbewerber.

### 1.2 Bestehende MCP-Server

| Projekt | Stars | Ansatz | Schwäche |
|---|---|---|---|
| SonnyLabs/EU_AI_ACT_MCP | 33 | 17 Tools, Fokus Watermarking/Security, Apache-2.0 | Heuristischer Klassifizierer, kein Volltext, kein Versioning, Security-Upsell |
| saidbazyar/sovereign-ai-act-mcp | 0 | Deterministischer Klassifizierer, Text verbatim, kennt Omnibus 2026/1744, MIT, gehostet | Kein Update-Mechanismus dokumentiert, keine Leitlinien, kein nationales Recht |
| CSOAI/eu-ai-act-compliance-mcp | ? | "42-Punkte-Audit", Art.-11-Doku-Generator | Marketing-lastig, Quellen unklar |
| lexbeam/eu-ai-act-mcp | ? | Klassifizierung, Fristen, Q&A | Statischer Snapshot |
| cyanheads/eur-lex-mcp-server | 8 | Generischer EUR-Lex/CELLAR-Zugriff inkl. konsolidierter Fassungen | Keine AI-Act-Logik; **als Vorbild für die Ingestion nützlich** |

Gemeinsame Lücke aller vier AI-Act-Server: eingefrorener Textstand, keine Provenienz pro Antwort, keine Leitlinien/Soft Law, keine Normen, kein nationales Recht, keine Änderungshistorie.

### 1.3 Compliance-Tool-Markt

- GRC-Plattformen (Vanta, Drata): 10–50 k€/Jahr. Enterprise AI Governance (Credo, Holistic, OneTrust): 50–200 k€+.
- AI-Act-Workflow-Tools für KMU (Legalithm, TrailBit, Annexa, ComplyLayer): 0–5 k€/Jahr. **Legalithm ist kostenlos bis ~04/2028.** ComplyLayer Free + Pro 1.499 $/Jahr.
- Befund aus dem Vergleich: Workflow-Tools haben **kaum APIs oder Developer-Integrationen**. Keines deckt alle fünf Workstreams.

Konsequenz: Ein weiteres KMU-Self-Assessment-Tool ist chancenlos gegen kostenlose Anbieter. Verkaufbar ist die **Daten- und API-Schicht darunter** sowie **Developer-Workflow-Integration** (Agenten prüfen Features zur Build-Zeit).

---

## 2. Zielgruppen und Jobs-to-be-done

| Priorität | Zielgruppe | Job | Kanal |
|---|---|---|---|
| 1 | Entwickler, die Agenten/KI-Features bauen (Claude Code, Cursor, eigene Agenten) | "Sag mir vor dem Release, ob dieses Feature unter den AI Act fällt, welche Artikel gelten und ab wann, mit Beleg." | MCP lokal + remote |
| 1 | Hersteller von Compliance-/GRC-Tools | "Gib mir einen gepflegten, versionierten Rechtskorpus mit Änderungs-Feed, damit ich ihn nicht selbst pflegen muss." | REST-API, Webhooks, Lizenz |
| 2 | Compliance-/Legal-Mitarbeitende in KMU, die Claude/ChatGPT nutzen | "Beantworte meine Frage mit Fundstelle und Fassung, nicht aus dem Gedächtnis des Modells." | Remote MCP, Web-Explorer |
| 2 | Forschung, Lehre, Journalismus | "Zitierfähige, maschinenlesbare Fassungen plus Diffs." | Dataset (CC-BY), Explorer |
| 3 | Aufsicht/Verbände | Monitoring-Feeds | später |

---

## 3. Produktprinzipien (nicht verhandelbar)

1. **Quelle vor Meinung.** Jede Aussage trägt eine Fundstelle: ELI/CELEX, Artikel, Absatz, Buchstabe, Fassung mit Datum. Kein Zitat ohne wörtlichen Textabgleich gegen den Korpus.
2. **Versioniert.** Jede Abfrage akzeptiert `as_of` (Datum). Antworten für "Was galt am 01.08.2026?" und "Was gilt heute?" unterscheiden sich korrekt.
3. **Deterministisch, wo Recht deterministisch ist.** Fristen, Rollen, Anwendbarkeits- und Risikoklassifikation laufen durch eine versionierte Regel-Engine. Das LLM extrahiert Fakten aus Freitext, zieht aber keine rechtlichen Schlüsse.
4. **Unsicherheit ist ein Ergebnis.** Wo das Gesetz Auslegungsspielraum lässt (Art. 6 Abs. 3 Ausnahmen, Definition "KI-System"), liefert die Engine `uncertain` plus die offenen Fragen und die einschlägige Leitlinie. Kein Scheinpräzision.
5. **Kein Rechtsrat, aber auditierbar.** Disclaimer, aber zugleich: Methodikseite, öffentliche Testsuite, Changelog, Errata-Prozess.
6. **Open Core.** Code und Korpus offen. Bezahlt wird für Aktualität, Komfort und Garantien, nicht für den Zugang zum Gesetz.
7. **Mehrsprachig von Tag 1.** DE und EN im MVP, alle 24 Amtssprachen über EUR-Lex vorbereitet.

---

## 4. Scope

### 4.1 Korpus (Tier 0, das eigentliche Asset)

| Ebene | Inhalt | Quelle | MVP |
|---|---|---|---|
| Primärrecht | AI Act, alle Fassungen (2024-08-01, 2026-07-27), Erwägungsgründe, Anhänge I–XIII | CELLAR Formex XML via ELI | ✅ |
| Änderungsakte | VO (EU) 2026/1744 (Omnibus) als eigenes Dokument + Mapping auf geänderte Vorschriften | CELLAR | ✅ |
| Sekundärrecht | Delegierte und Durchführungsrechtsakte, sobald erlassen | CELLAR Relationship Graph | ✅ (Pipeline), Inhalt bei Erscheinen |
| Soft Law | Leitlinien Kommission: KI-System-Definition (02/2025), verbotene Praktiken (02/2025), GPAI (07/2025), GPAI Code of Practice (07/2025), Art. 50 (07/2026); Service-Desk-FAQ | PDF/HTML, mit Seitenreferenz | ✅ |
| Normen | JTC-21-Arbeitsprogramm: Titel, Status, Bezug zu Artikeln, ABl.-Verweis wenn harmonisiert. **Nur Metadaten, nie Normtext** (urheberrechtlich geschützt) | CEN-CENELEC, ABl. | Phase 2 |
| Nationales Recht | KI-MIG (DE), BNetzA/KoKIVO-Veröffentlichungen | gesetze-im-internet, BGBl, BNetzA | ✅ DE, andere MS später |
| Rechtsprechung | EuGH/EuG zu AI Act (noch leer), Vorlagefragen | CELLAR | Phase 3 |

Datenmodell: Vorschriftenbaum mit stabilen IDs, z. B. `eli:reg/2024/1689/art_6/par_3/pt_a@2026-07-27`. Jede Node hat: Text (je Sprache), Hash, Gültigkeitsintervall, Quelle, Querverweise (Erwägungsgründe, Anhänge, Leitlinien, Normen).

### 4.2 MCP-Tools (Tier 1)

| Tool | Eingabe | Ausgabe | MVP |
|---|---|---|---|
| `search` | Query, Filter (doc_type, lang, as_of) | Treffer mit Fundstelle + Snippet, hybrid BM25 + Embeddings | ✅ |
| `get_provision` | ID oder "Art. 6 Abs. 3", as_of, lang | Wortlaut, Erwägungsgründe, Querverweise, Leitlinien dazu | ✅ |
| `diff_provision` | ID, from_date, to_date | Wort-Diff zwischen Fassungen + verursachender Änderungsakt | ✅ |
| `get_timeline` | role, system_type, as_of | Anwendbare Fristen mit Rechtsgrundlage, inkl. Omnibus-Verschiebungen und Schonfristen | ✅ |
| `determine_role` | Strukturierte Fakten (wer entwickelt, wer betreibt, Marke, Import, EU-Bezug) | Rolle(n) nach Art. 3 Nr. 3–8 mit Begründung; `uncertain` + Rückfragen | ✅ |
| `classify_system` | Strukturierte Fakten (Zweck, Einsatzbereich, Anhang-I-Produkt, Outputs, betroffene Personen) | Tier (prohibited / high_risk / transparency / minimal / out_of_scope / uncertain), Pfad durch den Entscheidungsbaum mit Fundstellen, offene Fragen | ✅ |
| `extract_facts` | Freitext-Systembeschreibung | Ausgefülltes Faktenschema für `classify_system` + Liste fehlender Angaben (einziges LLM-Tool) | ✅ |
| `list_obligations` | role, tier, as_of, optional gpai | Pflichtenliste mit Artikel, Frist, Status (in Kraft / künftig), zugehörige Leitlinie, Norm-Status | ✅ |
| `get_guidance` | Artikel oder Thema | Einschlägige Leitlinien/FAQ-Abschnitte mit Seitenreferenz | ✅ |
| `get_changes` | since_date, scope | Changelog: neue Fassungen, Leitlinien, Normen, nationale Akte | Phase 2 |
| `standards_status` | Artikel | JTC-21-Deliverables, Status, harmonisiert ja/nein | Phase 2 |
| `cite` | ID, style | Zitat im gewünschten Format (juristisch DE/EN, BibTeX) | ✅ (trivial) |
| `glossary` | Begriff | Legaldefinition Art. 3 + Erwägungsgrund + Leitlinien-Präzisierung | ✅ |

Zusätzlich MCP-Primitive: **Resources** (`aiact://art/6@latest`) für direktes Einbinden in Kontext, **Prompts** (`assess_feature`, `pre_release_check`) als geführte Workflows.

### 4.3 Oberflächen (Tier 2)

1. **npm-Paket** `aiact-mcp` (stdio) für lokale Nutzung in Claude Code, Cursor, Codex.
2. **Remote MCP** (Streamable HTTP) auf eigener Domain, Free-Tier mit Rate-Limit, Pro mit API-Key.
3. **REST-API** mit denselben Endpunkten für Tool-Hersteller.
4. **Web-Explorer**: eine Seite pro Vorschrift, Fassung, Leitlinie, Diff. Das ist zugleich die **pSEO-Maschine** (deine bestehende Astro-Pipeline), die organischen Traffic auf das Produkt lenkt. URLs sind permanente Zitierlinks.
5. **Assessment Report** (PDF): strukturierte Ersteinschätzung mit vollständiger Fundstellenkette, Fassungsdatum, offenen Fragen. Bezahlprodukt.
6. **Change-Feed**: RSS, E-Mail, Webhook.

### 4.4 Ausdrücklich nicht im Scope

Kein GRC-Workflow (Inventar, Evidence, Aufgaben), kein Bias-Testing, keine Annex-IV-Dokumentengenerierung im MVP, keine Rechtsberatung, kein Normtext.

---

## 5. Architektur

```
┌──────────────────────────── Ingestion (täglich, Berta-Muster) ────────────────────────────┐
│ CELLAR SPARQL + ELI ──► Formex XML ──► Parser ──► Provision Tree (JSON, versioniert)       │
│ Kommission/Service Desk ──► HTML/PDF ──► Chunker mit Seitenref ──► Guidance Store          │
│ CEN-CENELEC / ABl. ──► Scraper ──► Standards Metadata                                      │
│ gesetze-im-internet / BGBl / BNetzA ──► National Store (DE)                                │
│                         │                                                                  │
│                 Change Detector (Hash-Vergleich, Relationship Graph: "amends 32024R1689")  │
│                         │                                                                  │
│            Diff + Changelog-Entwurf ──► Review-Gate (Mensch) ──► Release-Kanal stable      │
│                                     └──► automatisch ──► Release-Kanal preview             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
┌──────────────────────────── Storage ───────┴────────────────────────────────────────────────┐
│ Postgres (Supabase): provisions, versions, guidance, standards, national, changelog         │
│ pgvector: Embeddings pro Chunk und Sprache · Volltext: tsvector/BM25                        │
│ Objektspeicher: Original-XML/PDF mit Hash (Beweiskette)                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
┌──────────────────────────── Engine ────────┴────────────────────────────────────────────────┐
│ Rule Engine: Entscheidungsbäume als versioniertes YAML, jede Kante zitiert eine Vorschrift  │
│   - applicability (Art. 2), role (Art. 3), prohibited (Art. 5), high_risk (Art. 6 + Anh.    │
│     I/III + Abs.-3-Ausnahmen), transparency (Art. 50), gpai (Kap. V), deadlines (Art. 113)  │
│ Retrieval: hybrid, as_of-gefiltert, Reranking                                               │
│ Citation Guard: jedes zitierte Span muss byte-genau im Korpus existieren, sonst Fehler      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
┌──────────────────────────── Serving ───────┴────────────────────────────────────────────────┐
│ MCP Server (TypeScript SDK): stdio (npm) + Streamable HTTP (Cloudflare Workers oder Fly)    │
│ REST (gleicher Handler) · Auth: API-Key, später OAuth · Rate-Limits · Usage-Metering        │
│ Explorer: Astro, statisch aus demselben Korpus gebaut                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Antworten auf deine drei Kernfragen

**"Wie bleiben wir aktuell, auch in Echtzeit?"**
Gesetze ändern sich nicht in Echtzeit, Soft Law und Normen schon fast. Realistische Latenz: Stunden bis ein Tag, und das reicht. Mechanik: ein geplanter Agent (genau dein Berta-Setup) pollt täglich CELLAR nach neuen konsolidierten Fassungen und nach Akten, die 32024R1689 ändern oder darauf verweisen, die Kommissions-Newsseite, die Service-Desk-FAQ, den JTC-21-Tracker und BGBl/BNetzA. Jede Änderung wird gehasht, gedifft und als Changelog-Entwurf erzeugt. Primärrecht geht erst nach menschlicher Sichtung in `stable`; `preview` ist sofort verfügbar. Der Change-Feed ist zugleich das Bezahlprodukt.

**"Wie halten wir den wissenschaftlichen Standard?"**
Fünf Mechanismen: (1) Citation Guard, kein Zitat ohne wörtlichen Treffer; (2) Fassungs-Pinning per `as_of`; (3) Regel-Engine statt LLM-Urteil, mit Goldstandard-Tests aus den Beispielen der Kommissions-Leitlinien und Anhang III; (4) öffentliche Methodikseite plus Eval-Report pro Release; (5) Korpus als Dataset mit DOI auf Zenodo, zitierfähig. Nebeneffekt: Material für deine Masterarbeit und ein Ko-Autor aus der Rechtswissenschaft wird realistisch.

**"Was ist Oberfläche, was Engine?"**
Engine ist Korpus plus Regel-Engine plus Change-Pipeline, das ist der Moat. Oberflächen sind austauschbar: MCP, REST, Explorer, PDF. Der Explorer ist bewusst statisch und SEO-optimiert, damit die Oberfläche selbst Akquise ist.

### 5.2 Technologie-Entscheidungen (Vorschlag)

| Entscheidung | Vorschlag | Grund |
|---|---|---|
| Sprache | TypeScript | MCP-SDK-Referenz, deine Stärke, npm-Distribution |
| DB | Supabase Postgres + pgvector | Kennst du, Free-Tier reicht für MVP |
| Hosting Remote MCP | Cloudflare Workers (oder Fly.io) | Streamable HTTP, günstig, EU-Region |
| Ingestion-Runner | Claude Code scheduled auf GCP-VM (Berta) | Vorhanden |
| Explorer | Astro | Deine pSEO-Pipeline |
| Lizenz Code | Apache-2.0 | Vendor-Adoption nicht bremsen; Moat ist die Pipeline, nicht der Code |
| Lizenz Korpus | CC-BY-4.0 (EU-Rechtstexte sind nach Beschluss 2011/833/EU weiterverwendbar) | Akademische Zitierfähigkeit |

---

## 6. Qualitätssicherung und Evals

- **Retrieval-Eval:** 150 Expertenfragen (DE/EN) mit erwarteten Fundstellen, Metrik Recall@5 und MRR. Ziel ≥ 0,9 Recall@5.
- **Klassifikations-Goldset:** ≥ 100 Fälle aus Leitlinien-Beispielen, Anhang III, Literatur, inkl. Grenzfälle mit erwartetem `uncertain`. Ziel: 0 False-Negatives bei `prohibited`, ≥ 95 % Trefferquote sonst.
- **Citation Guard:** 100 % der Zitate wörtlich belegt, als CI-Test.
- **Fassungstest:** identische Frage mit `as_of=2026-07-01` und `2026-08-01` liefert die erwartete Differenz (Omnibus).
- **Regressions-Eval** bei jedem Korpus-Release, Report öffentlich.
- **Juristisches Review** des Entscheidungsbaums durch eine Person mit Jura-Hintergrund vor v1.0 (siehe offene Entscheidung §12).

---

## 7. Monetarisierung (Open Core)

| Stufe | Inhalt | Preis (Hypothese) | Zielgruppe |
|---|---|---|---|
| Free | npm selbst hosten, Remote MCP 500 Calls/Monat, Explorer, Korpus-Download | 0 € | Entwickler, Forschung |
| Pro | 20 k Calls, Change-Alerts (Mail/Webhook), alle Sprachen, Diff-API, Priorität | 29–79 €/Monat | Agent-Builder, Berater, KMU-Compliance |
| Report | PDF-Ersteinschätzung mit Fundstellenkette und offenen Fragen | 49–149 € einmalig | KMU ohne Tool |
| Vendor | Unbegrenzt, SLA, Whitelabel-Korpus, Changelog-Garantie, Rechnung | 500–2.000 €/Monat | Compliance-/GRC-Tools ohne eigene Rechtsredaktion |
| Nebenprodukte | Sponsoring (GitHub Sponsors), Vorträge, Beratungsanfragen | – | – |

Ehrliche Einschätzung: Free und Pro bringen Reichweite, nicht Einkommen. Geld steckt in **Vendor** (die Workflow-Tools haben keine APIs und keine Rechtsredaktion) und im **Report**. Passiv ist davon nur Report und Pro; Vendor braucht Vertrieb, aber wenig laufenden Aufwand.

---

## 8. Portfolio-Wert für die Jobsuche

| Zielrolle | Was das Projekt beweist | Gesprächsmaterial |
|---|---|---|
| Forward Deployed / Solutions Engineer | Ingestion unordentlicher Quellen, MCP-Server in Produktion, Evals, Betrieb mit Scheduler, Doku | "Ich habe eine Regel-Engine so gebaut, dass das LLM nie das Urteil fällt, nur die Fakten extrahiert. Hier die Eval-Zahlen." |
| AI Governance / Policy | Tiefes Verständnis von Omnibus, Art. 6, Leitlinien, KI-MIG; wissenschaftliche Methodik | "Ich kann Ihnen für jede Pflicht sagen, in welcher Fassung sie steht und wann sie sich geändert hat." |
| Beide | Die seltene Schnittmenge: jemand, der Recht liest und shippt | Repo, Explorer-URL, Dataset-DOI im Lebenslauf |

Launch-Kanäle: MCP Registry, skills.sh, Show HN, LinkedIn (deine Headline passt exakt), artificialintelligenceact.eu-Newsletter, KoKIVO/BNetzA als Hinweis, Juristen-Newsletter (Bird & Bird, Stibbe zitieren solche Tools).

---

## 9. Risiken und Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|---|---|---|
| Kommission baut eine API für Explorer/Checker | mittel | Unser Mehrwert liegt in Versioning, Soft Law, Normen, nationalem Recht, Diff und Agent-Integration. Davon macht die Kommission nichts. |
| Haftung für falsche Einschätzung | mittel | Disclaimer, AGB, `uncertain` als First-Class-Ergebnis, Report als "Ersteinschätzung", keine Beratung. |
| Urheberrecht Normen | hoch, wenn ignoriert | Nur Metadaten/Status, nie Normtext. |
| Formex-Parsing der konsolidierten Fassung ist zäh (CELLAR liefert ZIP-Pakete, Issue #108 bei eur-lex-mcp-server) | hoch | Spike in Woche 1, Fallback HTML-Parser. |
| Vier Wettbewerber mit Vorsprung | mittel | Keiner hat Provenienz, Versioning, DE-Recht. Schnell launchen, Qualität sichtbar machen (Eval-Report). |
| Wartungslast frisst Zeit | mittel | Pipeline automatisiert, Review-Gate ist 15 Minuten pro Woche, Kill-Kriterien einhalten. |
| Zu wenig Nachfrage für Vendor-Tier | mittel | Phase 0 validiert mit fünf Gesprächen, bevor Phase 2 startet. |

---

## 10. Roadmap

### Phase 0 · Validierung (1 Woche)
- Spike: Formex XML der konsolidierten Fassung aus CELLAR holen und parsen. Geht das in einem Tag? Sonst HTML.
- Fünf Gespräche: zwei Compliance-Tool-Gründer (Legalithm, TrailBit, Annexa anschreiben), zwei Agent-Entwickler, eine Person aus Jura/Governance.
- Entscheidung Name, Domain, Lizenz.
- **Exit-Kriterium:** Parser funktioniert, mindestens zwei Gesprächspartner sagen "würde ich nutzen oder zahlen".

### Phase 1 · MVP (3–4 Wochen)
- Korpus v1: AI Act in beiden Fassungen, Omnibus, fünf Leitlinien, KI-MIG, DE+EN.
- Regel-Engine: applicability, role, prohibited, high_risk, transparency, deadlines. Goldset ≥ 60 Fälle.
- Tools: `search`, `get_provision`, `diff_provision`, `get_timeline`, `determine_role`, `classify_system`, `extract_facts`, `list_obligations`, `get_guidance`, `glossary`, `cite`.
- npm-Paket, Remote-Endpoint Free, README mit Eval-Zahlen, Methodikseite.
- Launch: MCP Registry, Show HN, LinkedIn.
- **Exit-Kriterium:** veröffentlicht, Evals grün, erste externe Nutzer.

### Phase 2 · Aktualität und Reichweite (4–6 Wochen)
- Change-Pipeline mit Review-Gate, `get_changes`, RSS/Webhook.
- Normen-Tracker, `standards_status`.
- Explorer (Astro, pSEO), Dataset mit DOI.
- Report-PDF als erstes Bezahlprodukt.

### Phase 3 · Einkommen (ab Woche 12)
- Pro-Tier mit API-Keys und Metering.
- Vendor-Gespräche aus Phase 0 in Pilotverträge wandeln.
- Weitere Mitgliedstaaten (AT, FR, NL) im nationalen Store.

### Kill-Kriterien (ehrlich, vorab festgelegt)
Sechs Wochen nach Launch: unter 100 Tool-Calls pro Woche auf dem Remote-Endpoint **und** unter 50 Stars **und** kein einziges Inbound-Gespräch → Projekt wird in Wartungsmodus geparkt, bleibt aber als Portfolio-Stück online. Der Portfolio-Wert ist bereits nach Phase 1 realisiert; alles danach ist Einkommenswette.

---

## 11. MVP-Aufwandsschätzung

| Baustein | Aufwand |
|---|---|
| Ingestion + Parser + Datenmodell | 5–7 Tage |
| Regel-Engine + Goldset | 6–8 Tage |
| MCP-Server + Tools + Tests | 4–5 Tage |
| Remote-Hosting + Rate-Limit | 2 Tage |
| README, Methodik, Launch | 2–3 Tage |
| **Summe** | **19–25 Arbeitstage** |

Bei 15–20 Stunden pro Woche sind das 6–8 Wochen bis zum Launch, mit Claude Code als Pair eher am unteren Ende.

---

## 12. Offene Entscheidungen (deine)

1. **Name und Domain.** Vorschläge: `aiact.dev`, `lexact.eu`, `actmcp.eu`. Prüfen, was frei ist.
2. **Juristischer Sparringspartner.** Jemand aus deinem Umfeld (Verlobte im Referendariat, Uni) als Reviewer des Entscheidungsbaums, idealerweise als Ko-Autor des Datasets?
3. **Reihenfolge Explorer vs. Change-Feed** in Phase 2. Explorer bringt Traffic, Change-Feed bringt zahlende Nutzer.
4. **Vendor-Tier wirklich verfolgen?** Braucht fünf bis zehn Kaltansprachen. Wenn nein, bleibt es bei Report + Pro als passivem Pfad.
5. **Lizenz:** Apache-2.0 (Empfehlung) oder AGPL für den Server, um gehostete Kopien zu bremsen.
6. **Sprache:** TypeScript (Empfehlung) oder Python.

---

## 13. Quellen (abgerufen 2026-10-03)

- EUR-Lex, konsolidierte Fassung 02024R1689-20260727: https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng
- Gibson Dunn, Omnibus-Zusammenfassung: https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/
- Sidley, Provisional Agreement 22.06.2026: https://datamatters.sidley.com/2026/06/22/eu-lawmakers-reach-provisional-agreement-to-delay-key-eu-ai-act-obligations/
- Kommission, Service Desk + Single Information Platform: https://digital-strategy.ec.europa.eu/en/news/commission-launches-ai-act-service-desk-and-single-information-platform-support-ai-act
- ZwillGen, Grenzen des Compliance Checkers: https://www.zwillgen.com/artificial-intelligence/the-eus-ai-act-compliance-checker-explorer-whats-useful-today-whats-still-come/
- Bird & Bird, Art.-50-Leitlinien: https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-reading-the-commissions-draft-article-50-guidelines
- CEN-CENELEC JTC 21 / kla.digital Tracker: https://kla.digital/blog/jtc-21-standards-tracker
- Bundestag, KI-Durchführungsgesetz: https://www.bundestag.de/dokumente/textarchiv/2026/kw24-de-ki-1183820 ; datenschutzticker: https://www.datenschutzticker.de/2026/07/bundestag-beschliesst-ki-durchfuehrungsgesetz/
- Legalithm, Tool-Vergleich 04/2026: https://www.legalithm.com/en/blog/eu-ai-act-compliance-software-tools-compared-2026
- Wettbewerber: https://github.com/SonnyLabs/EU_AI_ACT_MCP · https://github.com/saidbazyar/sovereign-ai-act-mcp · https://github.com/cyanheads/eur-lex-mcp-server · https://mcpservers.org/servers/csoai-org/eu-ai-act-compliance-mcp
