# 08 Agent-Dokumentation: Best Practices für nachvollziehbare, kontexteffiziente Entscheidungs- und Recherche-Doku

**Stand:** 2026-10-03 · **Zweck:** Prüfung von ADR-004 (Dreischichtiges Dokusystem) und `CLAUDE.md` · **Methode:** last30days v3.25.0 (GitHub, HN, Reddit, X, YouTube; 78 Items, Fenster 2026-09-03 bis 2026-10-03), rund 50 WebFetch-Abrufe auf Primärquellen, `gh api` für gbrain. Das WebSearch-Budget der Session war erschöpft; es gab keine freien Websuchen (siehe §6). Quellen-IDs [S#] verweisen auf die Liste am Ende. Aussagen mit "(Schluss)" sind meine Folgerung, nicht belegt.

## 1. Executive Summary

1. **Grundrichtung bestätigt.** Kleine, immer geladene Einstiegsdatei plus Details bei Bedarf entspricht Anthropics Linie [S1, S3, S8]. Dateien plus Git sind auch das Substrat, zu dem Letta, Karpathys Wiki und neue Praktiker-Tools konvergieren [S28, S31, S41].
2. **Struktur ist nicht der Hebel.** In 1.650 Claude-Code-Sessions beeinflusste keine von vier Strukturvariablen der Konfigurationsdatei die Regeltreue messbar; die Treue sank aber mit jedem Arbeitsschritt (OR 0,944 je erzeugter Funktion) [S17]. Kurze Sessions und Re-Anker zählen mehr als das Dateilayout.
3. **Kontextdateien kosten, nützen aber nicht automatisch.** Im Mittel kein Erfolgsgewinn, über 20 % höhere Inferenzkosten; Repo-Überblicke sind nutzlos [S16]. Nur Nicht-Ableitbares lohnt. Unser Zweck (Entscheidungskontinuität) wurde dort nicht getestet.
4. **"Lies Datei X" als Prosa ist schwach.** CLAUDE.md ist Kontext, keine Durchsetzung [S3]; bei Vercel wurde ein Skill in 56 % der Fälle nie aufgerufen, ein passiv geladener 8-KB-Index erreichte 100 % [S20]. Pflichtlektüre per `@`-Import oder Hook.
5. **Subagenten erben CLAUDE.md.** Jeder Sonnet-Worker lädt Einstiegsdateien samt Imports [S4]. Worker brauchen `omitClaudeMd` und einen expliziten Task-Brief.
6. **Handgepflegte Indizes und IDs driften, schon jetzt.** ADR-001 und ADR-002 zitieren F9 als Nachweis, doch F9 ist in `FACTS.md` als widerlegt durchgestrichen (ersetzt durch F40/F42/F45). Zu Beginn dieser Recherche fehlten `FACTS.md` und `research/README.md` sogar noch ganz. Verweise per Lint prüfen, Indizes generieren.
7. **Limits an Plattformgrenzen koppeln.** Claude Code: unter 200 Zeilen je CLAUDE.md, Auto-Memory 200 Zeilen/25 KB; Codex: 32 KiB, danach wird still abgeschnitten [S3, S15]. `FACTS.md` hat im Entwurf kein Limit.
8. **ADRs bleiben richtig.** Nygard/MADR ist das am längsten bewährte Muster (Thoughtworks: Adopt) [S22-S24], jedoch Praktikerkonsens ohne kontrollierte Studie. Es fehlt maschinenlesbares Front Matter; Log4brains ist unnötig.
9. **Lücken im Entwurf:** Suchprotokoll mit Negativbefunden (gegen Doppelrecherche), Verfallsdatum für Fakten, Write-through-STATUS (Sessions brechen ab [S5]), Compaction-Anweisung [S2].
10. **Memory-Tools jetzt nicht einführen.** Benchmarks sind selbstberichtet und widersprüchlich (LoCoMo: Letta-Dateiagent 74,0 % vs. Mem0 68,5 % [S30]; Zep 75,14 %, Volltext-Baseline ca. 73 % [S35]). Markdown plus grep genügt; Revisit-Trigger quantifizieren.

## 2. Was Praktiker aktuell sagen

What I learned:

**AGENTS.md dominiert die Debatte, Claude Code zieht nach** - Größter Ausschlag des Monats: Claude Code liest seit 2.1.277 AGENTS.md, wenn keine CLAUDE.md existiert ([HN, 741 Punkte, 285 Kommentare](https://code.claude.com/docs/en/changelog)). Das Feature fiel zunächst still aus, wenn Telemetrie aus war ([blog.szypowi.cz](https://blog.szypowi.cz/p/claude-code-reads-agents.md-only-when-telemetry-is-on/), HN 486 Punkte, im Titel inzwischen "[fixed]"). Praxisfolge laut [agentsmesh](https://samplexbro.github.io/agentsmesh/guides/claude-md-vs-agents-md/): Existieren beide Dateien, wird AGENTS.md ignoriert; "Pick one instruction file and delete the other".

**Skepsis gegenüber dem Nutzen wächst, mit Papern** - Ein [HN-Beitrag](https://gethrbr.com/blog/is-agents-md-useful) bündelt die ETH-Studie (kein Erfolgsgewinn, ca. 20 % Mehrkosten), McMillan und Vercel-Evals. Geringe Reichweite (3 Punkte): Nischendiskussion.

**Prompts erzwingen nichts** - "Claude.md is good for taste and project context. It's a weak place for invariants" ([Tesseracted Labs](https://tesseracted-labs-blog.vercel.app/enforcing-coding-agent-guardrails-in-the-runtime-instead-of-the-prompt), HN, 3 Punkte): Invarianten gehören in Hooks. Ein Agent berichtet auf [r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/comments/1wwm9nh/ai_agent_running_in_claude_code_day_7_a_presend/): "A check before sending works better than a hook after" (Anekdote, 1 Punkt). "RuleReceipt" prüft nachträglich, ob ein Agent die CLAUDE.md befolgt hat.

**Git-native Markdown-Memory ist der aktive Bauplatz** - [OKF Agent Memory](https://github.com/okf-memory/okf-agent-memory) (HN, 81 Punkte, 32 Kommentare, 745 Sterne) legt Wissen als Markdown/YAML im Repo ab, lädt beim Start nur ca. 100-150 Tokens Normen und den Rest per Suche (Selbstangabe: 80 % weniger Tokens). Dazu mehrere Show-HN-Tools mit 3-28 Punkten: viel Werkzeugbau, wenig Evidenz.

**Kontextbudget ist Alltag** - u/wombweed ([r/LocalLLaMA](https://reddit.com/r/LocalLLaMA/comments/1wpwq4j/comment/pbyziq5/), 6 Upvotes): "Long context is very important for agentic coding." Matt Pocock ([YouTube](https://www.youtube.com/watch?v=kZ-zzHVUrO4), Oktober 2025, außerhalb des Fensters): "We're down to 16K tokens just from our memory files, the system tools, and the system prompt." Zu Entscheidungs-Logs oder Handoff-Dokumenten fand sich auf Reddit und X im Fenster keine substanzielle Diskussion.

KEY PATTERNS from the research:
1. Anweisungsdatei-Konsolidierung (eine Datei, nicht zwei) - per agentsmesh und HN-Threads.
2. Durchsetzung statt Bitten: Hooks und Gates für alles Zwingende - per Tesseracted Labs.
3. Markdown in Git als Memory-Substrat, Suche on demand - per OKF und die Tool-Flut.
4. Evidenz hinkt der Euphorie hinterher: Studien (ETH, McMillan) relativieren Kontextdateien.

<!-- PASS-THROUGH FOOTER: engine output, verbatim -->
---
✅ All agents reported back!
├─ 🟠 Reddit: 17 threads │ 850 upvotes │ 426 comments
├─ 🔵 X: 20 posts │ 50 likes │ 1 reposts
├─ 🔴 YouTube: 6 videos │ 2,462,728 views │ 6/6 with transcripts
├─ 🟡 HN: 22 storys │ 1,497 points │ 654 comments
├─ 🐙 GitHub: 13 items │ 42 reactions │ 187 comments
├─ 🗣️ Top voices: @heisblesse, @row_bot_ai, @TheValueist │ r/AI_Agents, r/LocalLLaMA, r/cursor
└─ 📎 Raw results saved to ~/Documents/Last30Days/ai-coding-agent-memory-and-documentation-best-practices-claude-md-context-engineering-raw-v3.md
---
<!-- END PASS-THROUGH FOOTER -->

## 3. Etablierte Muster

| Muster | Kern | Evidenz | Eignung für uns |
|---|---|---|---|
| Context Engineering, Context Rot | Kontext ist knappe Ressource; kleinste Menge High-Signal-Tokens; Just-in-Time-Retrieval, Compaction, Notizen außerhalb des Fensters [S1] | Chroma: 18 Modelle, Leistung sinkt mit Eingabelänge [S37]; Liu et al.: U-Kurve nach Position [S38]. Belegt | Hoch: Leitprinzip |
| CLAUDE.md-Praxis | Unter 200 Zeilen, nur Nicht-Ableitbares, Pruning-Test "Würde Entfernen Fehler verursachen?", Zwingendes in Hooks [S2, S3]; HumanLayer: unter 300 Zeilen [S21] | Anthropic-Richtlinie, Praktikerkonsens. Kontrolliert relativiert: [S16, S17]. Regelupdates nach KI-Fehlern: Compliance 49,14 auf 72,13 % (Korrelation) [S18]. "150-200 Instruktionen" [S21] unbelegt | Hoch; Pflege fehlergetrieben |
| AGENTS.md | Tool-neutrale Datei, über 60k Projekte, Linux-Foundation-Obhut [S14]; Claude Code liest sie nur ohne CLAUDE.md [S3] | Verbreitung selbstberichtet; Wirkung siehe [S16] | Gering: nur bei Multi-Tool; sonst `@AGENTS.md`-Import |
| Progressive Disclosure | Metadaten, Body, verlinkte Dateien; Body unter 500 Zeilen, Verweise eine Ebene tief, ToC ab 100 Zeilen [S8, S9] | Designprinzip. Vercel: Skills 53 % (= Baseline), Index 100 % (ein Anbieter, eine Aufgabe) [S20]. Codified Context: 283 Sessions, Hot/Cold-Memory (Fallstudie) [S19] | Hoch, aber Index immer geladen |
| ADR (Nygard, MADR 4, Log4brains) | 1-2 Seiten, Status, Kontext, Entscheidung, alle Konsequenzen, ersetzen statt überschreiben [S22]; MADR 4.0 (2024-09-17): bare/minimal-Templates, Status im YAML, `NNNN-titel.md` [S23] | Thoughtworks Radar: Adopt [S24]; keine kontrollierten Studien gefunden (nicht gesucht). Log4brains ist Site-Generator [S26] | Hoch (Format); Log4brains nein |
| Handoff-/Progress-Dateien | Initializer-Session, `claude-progress.txt`, Feature-Liste als JSON ("weniger überschreibbar als Markdown"), Git-Log [S10]; Fehlschläge dokumentieren [S11] | Anthropic-Fallstudien, qualitativ | Hoch: STATUS, Log |
| Memory-Tool, Context Editing, Compaction | Client-seitiges `/memories`, Update am Session-Ende, "Assume interruption" [S5]; Compaction [S6] | Anthropic-intern: Memory plus Editing +39 %, Editing +29 %, 84 % weniger Tokens [S7] | Mittel: in Claude Code ersetzen CLAUDE.md/Auto-Memory das |
| LLM-Wiki (Karpathy) | Unveränderliche Quellen, Markdown-Wiki, Schema; `index.md`, append-only `log.md`; Ingest/Query/Lint [S28] | Ideen-Gist 2026-04-04, keine Messung | Mittel: Lint, Index, Log passen |
| Memory-Systeme (gbrain, Mem0, Letta, Zep, Cognee) | gbrain: Markdown in Git kanonisch, PGLite/Postgres, MCP, Graph [S29]; Mem0: Extraktion plus Vektoren [S33]; Zep: temporaler Graph [S34]; Letta: Dateien in Git [S31]; Cognee: Graph plus Vektor [S36] | Alle Zahlen selbstberichtet, widersprüchlich; LoCoMo-Gespräche (16-26k Tokens) passen ins Fenster [S35]; Dateiagent schlägt Mem0 [S30]. gbrain-CLAUDE.md selbst: 517 Zeilen/35 KB (gemessen) | Gering jetzt; später Retrieval-Layer prüfen |
| Lab-Notebook, Reproduzierbarkeit | Datierte Einträge mit Beobachtung, Schluss, Idee; Fremde müssen nachvollziehen, "was und warum" [S39]; datiertes Changelog, alles versioniert [S40] | Etablierte Wissenschaftspraxis, für LLM-Agenten nicht validiert | Hoch: Suchprotokoll, Log |
| Evidence-/Claim-Source-IDs | Quelle je Aussage: CitationAgent [S12]; gbrain "Fakten mit Quellen", Lücken- und Widerspruchsanalyse [S29] | Praxis; Wirksamkeitsstudie nicht gefunden | Hoch, nur für tragende Aussagen |
| llms.txt; Obsidian/Zettelkasten | llms.txt: kuratierter Markdown-Index für Websites [S27]. Zettelkasten: atomare Notizen mit Backlinks | Verbreitung vom Vorschlagenden behauptet; Zettelkasten nur über [S28], nicht geprüft | Gering: unser Index ist dasselbe Prinzip; Obsidian höchstens Viewer |

Hype-Einschätzung: **belegt wirksam** sind nur Anthropic-interne Evals (Vendor) und Vercels Einzelstudie; **Praktikerkonsens** sind ADRs, Progress-Dateien, Lab-Notebook; **Hype oder unbelegt** sind Memory-Tool-Benchmarks, "80 % weniger Tokens"-Claims und Zettelkasten für Agenten.

## 4. Kritik an unserem Entwurf

| Aspekt | Entwurf | Best Practice | Empfehlung |
|---|---|---|---|
| Pflichtlektüre | Lesereihenfolge als Prosa, 4 Dateien | Prosa-Verweise greifen nur, wenn der Agent öffnet [S3 analog, S20]; Import und Hooks sind deterministisch [S2] | `@STATUS.md` und `@docs/INDEX.md` in CLAUDE.md; Rest on demand |
| Kontextbudget | "ca. 6-8k Tokens", nicht gemessen | Zeilenziel unter 200 [S3]; Imports sparen nichts [S3]; `/context` misst [S2] | Budget in Zeilen/KB; always-loaded insgesamt höchstens 200 Zeilen/10 KB (eigene Setzung); `/context` je Meilenstein |
| Subagenten | nicht geregelt | Subagent lädt CLAUDE.md [S4]; Ergebnisse in Dateien statt über den Orchestrator [S12] | Worker `researcher` mit `omitClaudeMd`, Output-Template; schreibt Bericht und Suchprotokoll selbst; Fable liest nur die Exec Summary |
| Indizes | zwei handgepflegte READMEs plus "Letzte Entscheidungen" in STATUS | Eine kanonische Quelle, Rest abgeleitet [S29]; Lint-Operation [S28] | Metadaten im Front Matter; `docs/INDEX.md` generiert; STATUS nennt nur ADR-IDs |
| IDs, Quellenpflicht | jede Behauptung mit F-ID; F/H getrennt. Umgesetzt in `FACTS.md` mit Spalte Prüfung (F/B/S) und durchgestrichenen Widerlegungen | Zitier- und Prüfpraxis [S12, S29]; Was plus Warum [S39]; Supersede statt Löschen [S22] | Pflicht nur für tragende Aussagen (Zahlen, Rechtsaussagen, Wettbewerber). Spalte Prüfung behalten, Kurzzitat (bis 25 Wörter) ergänzen. Lint: ADR-Nachweis darf keine durchgestrichene ID zitieren (trifft heute F9). Hypothese wird per Statusfeld Fakt, ID bleibt (Schluss) |
| Verfall | nur Abrufdatum | Zeitsensibles vermeiden/markieren [S9]; Memory-Expiration [S5]; gbrain meldet veraltete Claims [S29] | `recheck_by` für Rechtsstand (Omnibus, KI-MIG); Lint listet Überfälliges |
| Limits | 50/60/40/5 Zeilen; FACTS unbegrenzt | Stilles Abschneiden: Codex 32 KiB, Auto-Memory 200 Zeilen/25 KB [S3, S15] | Limits per Skript prüfen; FACTS höchstens 150 Zeilen, dann Split nach Thema; Berichte ToC ab 100 Zeilen [S9] |
| ADR-Format | 7 Abschnitte, Status in Zeile 2 | MADR 4: YAML-Status, optionale Abschnitte [S23]; Nygard: alle Konsequenzen [S22] | YAML (status, date, decision-makers, supersedes, evidence); "Revisit-Trigger" behalten (Stärke) |
| Session-Ende | "am Ende aktualisieren" | Sessions enden jederzeit [S5]; Stop-Hook blockiert bis Check besteht [S2] | Write-through nach jeder Entscheidung; Stop-Hook ruft `docs-lint` |
| Doppelrecherche | FACTS "ersetzt Neu-Recherchieren" | Fehlschläge festhalten [S11]; Notebook [S39] | `research/_searchlog.md` (Datum, Frage, Quellen, Ergebnis inkl. "nichts gefunden"); Worker prüfen zuerst FACTS und Suchprotokoll |
| Compaction, Re-Anker | nicht behandelt | CLAUDE.md-Anweisung für Compaction; `/clear`; frische Session aus geschriebener SPEC [S2]; Treue sinkt je Schritt [S17] | Zeile "Beim Verdichten erhalten: offene Entscheidungen, berührte ADR-/F-IDs, geänderte Dateien"; ein Thema je Session |
| Memory-Option (ADR-004 Option 3) | "offen" | siehe §3, Memory-Systeme | Vertagen. Trigger: über 300 Fakten und grep verfehlt Treffer in Stichprobe, oder parallele Schreiber. Dann Retrieval-Layer über demselben Markdown, Markdown bleibt Wahrheit (Schluss) |
| Größe SPEC/Berichte | SPEC 314 Zeilen/25 KB, Berichte 20-32 KB | Verweise eine Ebene tief, ToC, Body unter 500 Zeilen [S9] | SPEC ab v0.2 in `spec/NN-*.md` mit ToC; Exec Summary und "Lücken" oben |
| Review | 7 Kriterien im Review-Log | Review in frischem Kontext; Evidenz zeigen statt behaupten [S2] | Frischer Subagent; Zitat mechanisch gegen Quelle prüfen; Spalte "bestätigt durch" |

Stärken, die bleiben: kleine CLAUDE.md (55 Zeilen/3,8 KB, unter [S3]-Ziel), kein Repo-Überblick [S16], append-only Berichte, ADR-Supersede-Regel [S22], Trennung Fakt/Hypothese, Prüfungsspalte F/B/S in `FACTS.md`, Review vor Übernahme [S12].

## 5. Empfohlenes Zielsystem

| Pfad | Zweck | Limit | Pflegeregel |
|---|---|---|---|
| `CLAUDE.md` | Regeln, Arbeitsmodell, `@STATUS.md`, `@docs/INDEX.md`, Compaction-Zeile | 100 Zeilen | Änderung nur mit ADR; quartalsweise prunen (Pruning-Test [S2]); bei Regelbruch des Agenten Regel schärfen [S18] |
| `STATUS.md` | Phase, in Arbeit, Blocker, nächste 3 Schritte, Fragen an Altan | 40 Zeilen | Write-through nach jeder Entscheidung/Freigabe; Stop-Hook prüft |
| `docs/INDEX.md` (generiert) | ADR-Tabelle (ID, Status, Titel, Revisit-Trigger), Berichtstabelle (ID, Kernaussage bis 25 Wörter, Lücken) | 60 Zeilen | Nie von Hand; `scripts/docs-lint.py --build-index`; nur aktive ADRs |
| `decisions/NNNN-slug.md` | MADR-4-kompatibel: YAML plus Kontext, Optionen, Entscheidung, Konsequenzen, Revisit-Trigger | 60 Zeilen | Unveränderlich außer Status/`superseded_by`; Revision = neuer ADR |
| `FACTS.md` | Bestehendes Format behalten (ID, Fakt, Quelle, Abruf, Prüfung F/B/S, Widerlegtes durchgestrichen); neu: `recheck_by` für Rechtsstand | 150 Zeilen (heute 87), dann `facts/<thema>.md` | IDs stabil; Lint prüft Verweise aus ADR/SPEC und meldet Zitate durchgestrichener IDs |
| `research/NN-slug.md` | Vollbericht | Exec Summary (12 Bullets) oben, ToC ab 100 Zeilen | Append-only; eine Verweisebene; Abschnitt "Lücken/nicht gefunden" Pflicht |
| `research/_searchlog.md` | Suchprotokoll inkl. Negativbefunde | 1 Zeile je Eintrag | Pflicht je Worker-Lauf; vor neuer Recherche `grep` hier und in FACTS |
| `research/00-review-log.md` | Freigabe, Stichprobe, "bestätigt durch" | wie bisher | Pro Bericht vor Übernahme |
| `log/YYYY-MM-DD.md` | Delta: ADR-/F-IDs, Sackgassen, Einstieg nächste Session | 25 Zeilen | Nur bei Sessions mit Entscheidungen/Sackgassen; Commit-Messages nennen IDs |
| `SPEC.md` (+ `spec/NN-*.md`) | Zielbild | ToC 60 Zeilen; je Abschnitt 150 | Versioniert; ADR-Verweis je Änderung |
| `.claude/agents/researcher.md` | Sonnet-Worker, `omitClaudeMd: true`, Template (Exec Summary, Quellen mit ID/URL/Datum, Lücken) | 60 Zeilen | Pflicht: erst FACTS und Suchprotokoll prüfen |
| `scripts/docs-lint.py` + Stop-Hook | Zeilenlimits, Verweise auflösbar, Index aktuell, `recheck_by`, STATUS geändert | Ausgabe nur Fehler | Läuft bei Session-Ende; deterministisch statt Prosa [S2] |

Umsetzungsreihenfolge: (1) F9-Zitate in ADR-001/002 auf F40/F42/F45 umstellen (per neuem ADR-Hinweis oder Korrektur-Vermerk, da ADRs unveränderlich sind) und `docs-lint` einführen; (2) `@`-Imports und Compaction-Zeile; (3) Worker-Agent und Suchprotokoll; (4) YAML-Front-Matter beim nächsten ADR, ältere ADRs per Skript migrieren.

## 6. Evidenzqualität und offene Fragen

- **Quellenauswahl verzerrt.** Ohne WebSearch (Budget 200/200) wurden bekannte URLs per WebFetch gelesen; Treffer sind Anthropic- und Vendor-lastig. Die last30days-Engine lief mit eigenem Plan (ohne Pre-Research) statt `--auto-resolve`; die Web-Quelle der Engine war nicht erreichbar, YouTube-Transkripte teils gedrosselt. HN-Kommentare wurden nicht gelesen, nur Titel und Punkte.
- **Nicht geprüft:** empirische ADR-Studien; Obsidian/Zettelkasten-Agentenpraxis über Karpathy hinaus; Letta-Docs (Landing ohne Details); Cognee- und Mem0-Benchmarks (selbstberichtet); Log4brains-Wartungsstand; llms.txt-Wirksamkeit; Subagent-CLAUDE.md-Caveats der Doku (nur überflogen); Gloaguen-Details (138 Aufgaben, +2,4/-2 Punkte) nur aus Sekundärquelle [S46].
- **Projektstand:** Meine Dateiprüfung lief gegen den Stand von ca. 14:57; `FACTS.md` (87 Zeilen) und `research/README.md` entstanden erst um 15:01-15:02 während dieser Recherche. Alle Aussagen zum Projekt beziehen sich auf den Stand 15:02.
- **Korrektur:** Ein Fetch-Zusammenfassungsmodell schätzte gbrains CLAUDE.md auf 1.200-1.400 Zeilen; gemessen via `gh api` sind es 517 Zeilen/34.966 Bytes.
- **Methodik:** Alle Token-Aussagen sind Bytes/4-Schätzungen, nicht gemessen. Anthropic-Zahlen [S7, S12] stammen aus internen Evals. Cai [S18] ist korrelativ; Codified Context [S19] eine Ein-Autor-Fallstudie.
- **Offen:** (1) Hilft Entscheidungs-/Faktendoku bei Produkt- und Recherchearbeit messbar? [S16] testet nur Code-Issues. (2) Ab welcher Faktenzahl scheitert grep? (3) Wie viel Kontext zahlen Subagenten real für Imports (mit `/context` messen)? (4) Reicht ein Stop-Hook als Durchsetzung oder stört er Sessions?

## Quellen

Abrufdatum aller URLs: 2026-10-03.

- S1 https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (2025-09-29)
- S2 https://code.claude.com/docs/en/best-practices
- S3 https://code.claude.com/docs/en/memory
- S4 https://code.claude.com/docs/en/sub-agents
- S5 https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- S6 https://platform.claude.com/docs/en/build-with-claude/compaction
- S7 https://claude.com/blog/context-management (2025-09-29)
- S8 https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills (2025-10-16)
- S9 https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- S10 https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (2025-11-26)
- S11 https://www.anthropic.com/engineering/building-c-compiler (2026-02-05)
- S12 https://www.anthropic.com/engineering/multi-agent-research-system (2025-06-13)
- S14 https://agents.md
- S15 https://learn.chatgpt.com/docs/agent-configuration/agents-md
- S16 https://arxiv.org/abs/2602.11988 (Gloaguen et al.)
- S17 https://arxiv.org/abs/2605.10039 (McMillan, 2026-05-11)
- S18 https://arxiv.org/abs/2606.12231 (Cai et al., 2026-06-10)
- S19 https://arxiv.org/abs/2602.20478 (Vasilopoulos, 2026-02-24)
- S20 https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals (2026-01-27)
- S21 https://www.humanlayer.dev/blog/writing-a-good-claude-md
- S22 https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- S23 https://adr.github.io/madr/
- S24 https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records
- S26 https://github.com/thomvaill/log4brains
- S27 https://llmstxt.org
- S28 https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f (2026-04-04)
- S29 https://github.com/garrytan/gbrain (30.505 Sterne laut `gh search repos`)
- S30 https://www.letta.com/blog/benchmarking-ai-agent-memory
- S31 https://www.letta.com/blog/context-repositories (2026-02-12)
- S33 https://github.com/mem0ai/mem0
- S34 https://arxiv.org/abs/2501.13956 (Zep)
- S35 https://www.getzep.com/blog/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/ (Vendor-Replik)
- S36 https://github.com/topoteretes/cognee
- S37 https://www.trychroma.com/research/context-rot (2025-07-14)
- S38 https://arxiv.org/abs/2307.03172
- S39 https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1000424 (Noble)
- S40 https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005510 (Wilson et al.)
- S41 https://github.com/okf-memory/okf-agent-memory
- S46 https://gethrbr.com/blog/is-agents-md-useful
- Weitere im Text verlinkt: blog.szypowi.cz, agentsmesh, Tesseracted Labs, Reddit-Threads, YouTube.
- Lokal: `CLAUDE.md`, `decisions/ADR-002`, `ADR-004`, `STATUS.md` (Dateiprüfung 2026-10-03). Rohdaten: `~/Documents/Last30Days/ai-coding-agent-memory-and-documentation-best-practices-claude-md-context-engineering-raw-v3.md`.
