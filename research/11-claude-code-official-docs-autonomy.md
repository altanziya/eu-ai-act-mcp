# 11 — Claude Code (offizielle Doku): Subagenten, Kontext, autonomes Arbeiten, Max-Limits, Agent SDK

## Kopf

- **Stand:** 2026-10-05 (Abrufdatum aller Quellen). Docs-Map von code.claude.com zuletzt generiert 2026-10-04 15:59 UTC; neuester Eintrag im Claude-Code-Changelog: Version 2.1.289 vom 2026-10-03 (https://code.claude.com/docs/en/changelog).
- **Methode:** Rohtext (Markdown) der offiziellen Seiten unter `code.claude.com/docs/en/*.md` und `platform.claude.com/docs/en/*.md` per HTTP geholt und lokal durchsucht (kein Zusammenfassungsmodell dazwischen). Die `support.claude.com`-Artikel wurden als HTML geholt und in Text umgewandelt. Docs-Map, zwei Anthropic-Engineering-Artikel und eine Anthropic-News-Seite zusätzlich per WebFetch (Zusammenfassung durch ein kleines Modell; die News-Seite wurde gegen den Rohtext geprüft, die zwei Engineering-Artikel nicht). 7 WebSearch-Aufrufe (Limit 25), nur um URLs zu finden; die Aussagen stammen aus den danach geholten Primärtexten. Drittquellen (Blogs, Foren) sind nicht verwendet.
- **Grenzen:**
  - Die Doku ist sehr versionsabhängig (viele Features "requires v2.1.2xx"). Relevante Mindestversionen stehen jeweils dabei; `claude update` vor Projektstart.
  - Was nicht in der Doku steht, ist als **"nicht dokumentiert"** markiert. Eigene Schlussfolgerungen stehen nur im Abschnitt "Implikationen" und sind dort als **Ableitung** gekennzeichnet.
  - Der Support-Artikel "Models, usage, and limits in Claude Code" (14552983) beschreibt hauptsächlich Enterprise-Seat und API-Key-Abrechnung, nicht Max. Ich nutze ihn nur für modellunabhängige Aussagen.
  - Die beiden Engineering-Artikel sind für ältere Modelle geschrieben (Sonnet 4.5, Opus 4.5/4.6). Ob die Befunde auf Fable 5.1 übertragbar sind, sagen sie selbst nicht.

## Executive Summary

1. **Subagent-Rückgabe:** Nur der finale Text plus ein kleiner Metadaten-Trailer (Tokens, Dauer) landet im Parent-Kontext; Zwischenschritte nicht. Eine **maximale Größe der Rückgabe ist nicht dokumentiert.** Viele Subagenten mit langen Berichten füllen den Parent trotzdem (offizielle Warnung). (https://code.claude.com/docs/en/context-window, https://code.claude.com/docs/en/sub-agents#common-patterns)
2. **Modell-Falle:** Ohne explizite Angabe erben Subagenten das Hauptmodell (hier Fable). Der eingebaute `Explore`-Agent läuft bei Fable-Hauptmodell mit Subscription auf **Opus**. Forks laufen immer auf dem Hauptmodell. Zuverlässig auf Sonnet/Haiku zwingt nur `CLAUDE_CODE_SUBAGENT_MODEL` + `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (v2.1.257+); Forks und `model: inherit`-Skills bleiben trotzdem auf dem Hauptmodell. (https://code.claude.com/docs/en/sub-agents#run-every-subagent-on-one-model)
3. **Parallelität/Nesting:** Standard 20 gleichzeitige Subagenten pro Session (nicht erzwungen unter ultracode), Gesamtzahl unbegrenzt; Subagenten dürfen standardmäßig bis 3 Ebenen tief weitere Subagenten starten (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`); Agent-Team-Mitglieder dürfen keine eigenen Teams starten. (https://code.claude.com/docs/en/sub-agents#let-subagents-spawn-their-own-subagents, https://code.claude.com/docs/en/agent-teams#limitations)
4. **Kontextfenster:** Fable 5.1, Opus 5.5, Sonnet 5.5 = 1M Tokens (128K max. Output); Haiku 4.5 = 200K (64K Output). 1M ist bei Fable/Sonnet 5.x auf allen Plänen nativ, ohne `[1m]`-Variante. Auto-Compaction bei ca. 967K, konfigurierbar (100K–1M). Ein Haiku-Subagent hat nur 200K. (https://platform.claude.com/docs/en/about-claude/models/overview, https://code.claude.com/docs/en/model-config#extended-context)
5. **Compaction:** CLAUDE.md, Auto Memory, Systemprompt werden neu geladen; bis zu 5 zuletzt bearbeitete Dateien (je <= 5.000 Tokens) werden neu gelesen; Skills 5.000/25.000 Tokens; `SessionStart`-Hook mit Matcher `compact` kann Kontext nachinjizieren. (https://code.claude.com/docs/en/context-window#what-survives-compaction)
6. **Unbeaufsichtigt (Anthropic-Linie):** "Give Claude a check it can run" ist die Kernaussage; für Läufe ohne Aufsicht nennt die Doku `/goal`-Bedingung oder Stop-Hook als Gate, einen Verifikations-Subagenten in frischem Kontext, auto mode statt bypassPermissions, und `bypassPermissions` nur in Container/VM. (https://code.claude.com/docs/en/best-practices#give-claude-a-way-to-verify-its-work, https://code.claude.com/docs/en/permission-modes)
7. **Headless `claude -p`:** `--max-turns`, `--max-budget-usd` (Subagenten-Kosten zählen mit), `--permission-prompts none`. **`--bare` liest keine Subscription-Credentials** (nur API-Key). In `-p` gibt es **kein automatisches Warten auf Limit-Reset**. (https://code.claude.com/docs/en/cli-reference, https://code.claude.com/docs/en/headless)
8. **Max-Limits:** 5-Stunden-Fenster plus Wochenlimit über alle Modelle; Max 5x/20x = 5x/20x der Pro-Per-Session-Menge. **Fable: nur bis 50 % des Wochenlimits ohne Zusatzkosten**, darüber usage credits (pay-as-you-go) oder Modellwechsel; Fable verbraucht das Limit schneller als andere Modelle. Fast Mode: nur Opus, nur über usage credits. (https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan, https://code.claude.com/docs/en/fast-mode)
9. **Was zählt gegen das Limit:** Subagenten, Workflows, Routines, Cloud-Sessions, Agent-Team-Mitglieder: alles derselbe Pool wie interaktive Sessions. Ultracode und Agent Teams sind in der Doku ausdrücklich als token-hungrig beschrieben (Teams ca. 7x, wenn Teammates im plan mode laufen). (https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session, https://code.claude.com/docs/en/workflows#let-claude-decide-with-ultracode)
10. **Agent SDK auf Subscription:** Laut Support-Artikel zählen "Claude Agent SDK, `claude -p`, and third-party app usage" weiterhin gegen die Subscription-Limits. Eine ab 15.06.2026 geplante Umstellung auf ein separates Monatsguthaben (Max 5x: 100 USD, Max 20x: 200 USD) wurde **pausiert**; Anthropic will vor einer Änderung informieren. Die SDK-Doku empfiehlt API-Key-Auth; das Verbot gilt Drittanbietern, die claude.ai-Login oder Rate Limits in eigenen Produkten anbieten. (https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan, https://code.claude.com/docs/en/agent-sdk/overview)
11. **Exakte Zahlen fehlen:** Token-Mengen pro 5h-/Wochenfenster, die Verbrauchsgewichte Fable/Opus/Sonnet/Haiku (nur qualitativ "mehrfach teurer") und die Wirkung von Effort auf den Verbrauch (nur qualitativ) sind nicht dokumentiert.
12. **Anthropic Engineering zu mehrstündigen Läufen:** Initializer-Session, `claude-progress.txt`, Feature-Liste als JSON mit `passes`-Feld, ein Feature pro Session, Git-Commit pro Fortschritt, End-to-End-Test vor "fertig". (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

---

## A. Subagenten (Agent-Tool, `.claude/agents/*.md`)

### A.1 Kontextisolation
- Jeder Subagent startet mit frischem, isoliertem Kontextfenster: er sieht weder Gesprächsverlauf noch bereits gelesene Dateien noch bereits aufgerufene Skills. Claude schreibt eine Delegationsnachricht, mit der der Subagent arbeitet. (https://code.claude.com/docs/en/sub-agents#what-loads-at-startup)
- Initialer Kontext eines Nicht-Fork-Subagenten: eigener Systemprompt (nicht der Claude-Code-Systemprompt) plus Umgebungsdetails; Task-Nachricht; CLAUDE.md-Hierarchie (inkl. `~/.claude/CLAUDE.md`, `CLAUDE.local.md`, AGENTS.md); Git-Status-Snapshot; vorgeladene Skills; "Sibling roster" (nur wenn `SendMessage` verfügbar). Explore und Plan überspringen CLAUDE.md und Git-Status. (gleiche Quelle)
- Nicht beim Subagenten: Output Style, die Auto Memory der Hauptsession. (gleiche Quelle)
- Das Kontextfenster eines Subagenten richtet sich nach **seinem** Modell, nicht dem des Parents. (gleiche Quelle)
- Subagenten-Beschreibungen belegen Kontext im Parent: ab 15.000 Tokens Gesamtbeschreibung (ohne Built-ins) erscheint eine Startwarnung. (https://code.claude.com/docs/en/sub-agents)

### A.2 `model`-Override
- Frontmatter `model`: `sonnet`, `opus`, `haiku`, `fable`, voller Modellname oder `inherit`. Auflösungsreihenfolge: (1) per-Aufruf-`model`-Parameter, (2) Frontmatter, (3) `CLAUDE_CODE_SUBAGENT_MODEL`, (4) Hauptmodell. Die Reihenfolge gilt ab v2.1.251; davor überschrieb die Umgebungsvariable alles. (https://code.claude.com/docs/en/sub-agents#choose-a-model)
- Ein per-Aufruf-Parameter (den Claude selbst setzen kann) schlägt die Frontmatter. Um das zu verhindern: `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (v2.1.257+). Dann wird das `model`-Feld in Definitionen ignoriert, Claude kann kein Modell mitgeben, und es gilt für Subagenten, Teammates und Workflow-Agenten. Forks und Skills mit `model: inherit` bleiben auf dem Hauptmodell. (https://code.claude.com/docs/en/sub-agents#run-every-subagent-on-one-model)
- Eingebauter `Explore`: nutzt das Hauptmodell, **außer** das Hauptmodell ist Fable; dann läuft er mit Subscription/Console/Gateway auf dem Opus-Modell, auf das der Alias `opus` zeigt (aktuell Opus 5.5). Ein eigener Agent namens `Explore` mit `model: haiku` überschreibt das. (https://code.claude.com/docs/en/sub-agents#built-in-subagents, Alias-Auflösung: https://code.claude.com/docs/en/model-config#model-aliases)
- `general-purpose` ohne eigene Modellangabe: `CLAUDE_CODE_SUBAGENT_MODEL`, sonst Hauptmodell. (https://code.claude.com/docs/en/sub-agents#built-in-subagents)
- Subagenten erben die Extended-Thinking-Einstellung der Hauptsession (ab v2.1.198); es gibt keine Thinking-Einstellung pro Subagent. Fable-, Opus-5.5- und Sonnet-5.5-Modelle denken immer. (https://code.claude.com/docs/en/sub-agents#choose-a-model, https://code.claude.com/docs/en/model-config#extended-thinking)
- `effort` im Frontmatter überschreibt das Session-Effort-Level für diesen Subagenten (`low`..`max`, je nach Modell). Ohne Angabe erbt er das Session-Level. Haiku 4.5 steht nicht in der Effort-Tabelle ("Models not listed here do not support effort"). (https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields, https://code.claude.com/docs/en/model-config#adjust-effort-level)
- Kontrolle: `/tasks` zeigt das Modell (v2.1.242+) jeder Subagent-Zeile.

### A.3 `omitClaudeMd`
- `omitClaudeMd: true` im Frontmatter oder in `--agents`-JSON startet den Subagenten ohne User-, Projekt- und lokale CLAUDE.md. Managed-Policy-Dateien laden weiter (außer bei Managed Subagents). Gedacht für Subagenten, die alles aus dem Delegationsprompt beziehen. Ignoriert, wenn der Agent als Hauptsession via `--agent`/`agent`-Setting läuft. Benötigt v2.1.271+. (https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields)
- Doku-Hinweis: Der Parent hat die volle CLAUDE.md beim Lesen der Ergebnisse, daher müssen die meisten Regeln nicht in den Subagenten; Regeln, die doch gelten sollen (z. B. "vendor/ ignorieren"), im Delegationsprompt wiederholen. (https://code.claude.com/docs/en/sub-agents#what-loads-at-startup)

### A.4 Rückgabe an den Parent
- "The parent doesn't see the subagent's intermediate tool calls or outputs, only that final result." (https://code.claude.com/docs/en/tools-reference#agent-tool-behavior)
- Die Doku-Visualisierung: "Only the subagent's final text response comes back to your context, plus a small metadata trailer with token counts and duration" (Beispiel mit repräsentativen Zahlen: 6.100 Tokens gelesen, 420 Tokens Ergebnis). (https://code.claude.com/docs/en/context-window)
- **Maximale Größe der Rückgabe: nicht dokumentiert.** Offizielle Warnung: "Running many subagents that each return detailed results can consume significant context". (https://code.claude.com/docs/en/sub-agents#run-parallel-research)
- `maxTurns` im Frontmatter begrenzt die Turns; bei Erreichen wird die Ausgabe als **partiell** markiert (v2.1.246+), und Claude kann den Subagenten fortsetzen. (https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields)
- Fehlerfälle: Beim Foreground-Subagent mit API-Fehler (Rate Limit, Overload) gibt das Agent-Tool die Teilausgabe mit Hinweis zurück; Background-Subagent wird als failed markiert, die Abschlussnachricht enthält die letzte Ausgabe. (https://code.claude.com/docs/en/sub-agents#api-errors-in-subagents)
- Sicherheits-Scan (v2.1.210+): Der finale Bericht wird auf Instruktions-Imitationen gescannt (Backslash-Einfügung, Markerzeile `[harness: subagent output matched ...]`), nichts wird entfernt. Der Bericht kommt unter einem Header "subagent output". Unter auto mode prüft der Classifier zusätzlich Arbeit und Bericht vor Zustellung. (https://code.claude.com/docs/en/sub-agents#subagent-output-scanning, https://code.claude.com/docs/en/permission-modes)
- `SubagentHandback`-Tool (v2.1.271+, nur in auto mode, nicht für Forks): Subagent liefert den Bericht über dieses Tool; ein Hook sieht ihn als `tool_input.message`. (https://code.claude.com/docs/en/tools-reference, https://code.claude.com/docs/en/hooks#subagentstop)
- Subagent-Transkripte liegen unter `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`, sind von der Compaction der Hauptsession unabhängig und werden nach `cleanupPeriodDays` (Standard 30 Tage) gelöscht. (https://code.claude.com/docs/en/sub-agents#resume-subagents)

### A.5 Background-Agenten und SendMessage-Fortsetzung
- **Fork-Mode** ist in interaktiven Sessions seit v2.1.232 standardmäßig an; dann laufen alle von Claude gestarteten Subagenten im Hintergrund, und Claude kann den Vordergrund nicht anfordern. In `-p` und im Agent SDK ist Fork-Mode standardmäßig aus (`CLAUDE_CODE_FORK_SUBAGENT=1` schaltet ein, `0` aus). (https://code.claude.com/docs/en/sub-agents#turn-fork-mode-on-or-off)
- Background-Subagenten: Permission-Prompts erscheinen in der Hauptsession; eingeschränktes Built-in-Toolset (u. a. Read, Grep, Glob, LSP, Bash, Edit, Write, WebFetch, WebSearch, Skill, Monitor, SendMessage, MCP-Tools); nicht verfügbar sind u. a. `AskUserQuestion`, `ScheduleWakeup`, `Workflow` (für alle Subagenten) und `Agent` auf der Tiefengrenze. Ergebnis kommt als Completion-Notification in einem späteren Turn. (https://code.claude.com/docs/en/sub-agents#available-tools, https://code.claude.com/docs/en/sub-agents#run-subagents-in-foreground-or-background)
- Frontmatter `background: true` hält einen Subagenten im Hintergrund; `Ctrl+B` schickt eine laufende Aufgabe in den Hintergrund. (gleiche Quelle)
- **Fortsetzung:** Jeder Aufruf erzeugt eine neue Instanz; zum Fortsetzen nutzt Claude `SendMessage` mit Agent-ID oder Name als `to`. Ein beendeter Subagent wird dabei im Hintergrund wieder aufgenommen, mit voller früherer Historie, demselben Toolset und Zugriff auf den vom ersten Lauf gewärmten Prompt-Cache. `SendMessage` braucht kein Agent Teams. Explore/Plan sind One-Shot (keine Agent-ID). Ein von dir mit `x` in `/tasks` gestoppter Subagent wird nicht automatisch fortgesetzt. Namen werden gegen Verwechslung geprüft; der Check resetet bei `/clear`. (https://code.claude.com/docs/en/sub-agents#resume-subagents)
- Nachrichten anderer Agenten sind nur Task-Anweisung, nie Freigabe für Permission-Prompts und können keine Settings/CLAUDE.md ändern. (gleiche Quelle)

### A.6 Begrenzungen
- **Gleichzeitig:** 20 laufende Subagenten pro Session (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, v2.1.217+); darüber schlägt der Spawn mit `Concurrent subagent limit reached` fehl; **kein Limit** auf die Gesamtzahl; unter ultracode nicht erzwungen; Resumes können das Limit überschreiten. (https://code.claude.com/docs/en/sub-agents#concurrent-subagent-limit)
- **Nesting:** Ja. Standard bis zu 3 Ebenen unterhalb der Hauptkonversation; Änderung per `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (`1` schaltet Nesting aus). Früher: v2.1.172–2.1.216 fünf Ebenen, v2.1.217–2.1.218 eine Ebene. Auf der Tiefengrenze wird `Agent` entzogen; ein Fork behält das Tool, es liefert dort aber einen Fehler. Ein Fork kann keine weiteren Forks starten. In `-p`/SDK wartet ein startender Subagent nicht auf verschachtelte Background-Subagenten; fertige berichten dann an die Hauptkonversation. (https://code.claude.com/docs/en/sub-agents#let-subagents-spawn-their-own-subagents)
- **Subagenten in Subagenten steuern:** `Agent` aus `tools` weglassen oder in `disallowedTools` aufnehmen; die Typliste `Agent(a, b)` wirkt nur für `claude --agent` als Hauptthread. (https://code.claude.com/docs/en/sub-agents#restrict-which-subagents-can-be-spawned)
- **Workflows:** bis zu 16 gleichzeitige Agenten (1–256 via `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`, v2.1.269+), 1.000 Agenten pro Run, 4.096 Items pro `parallel()`/`pipeline()`. (https://code.claude.com/docs/en/workflows#behavior-and-limits)
- **Agent Teams:** eigene Limits; "Start with 3-5 teammates"; ein Team pro Session; keine verschachtelten Teams. (https://code.claude.com/docs/en/agent-teams#limitations)
- Agent-SDK-Hinweis: große parallele Subagent-Fan-outs können Rate Limits treffen; kein Wall-Clock-Deadline pro Subagent, daher `maxTurns` je `AgentDefinition`. (https://code.claude.com/docs/en/agent-sdk/hosting#known-limitations)

### A.7 `fork` vs. frische Agenten
| | Fork | Frischer Subagent |
|---|---|---|
| Kontext | gesamte Konversation bis dahin | nur der Delegationsprompt |
| Systemprompt/Tools | identisch zur Hauptsession | aus Definition, im Hintergrund gefiltert |
| Modell | **wie Hauptsession** (also Fable) | aus `model`-Feld / Env / Hauptmodell |
| Prompt-Cache | geteilt mit Hauptsession (erster Request liest Parent-Cache) | eigener Cache, 5 min TTL auch auf Subscription |
- Start: `/subtask <aufgabe>` (v2.1.212+) oder Claude fordert Typ `fork` an. Forks verbieten: Deny-Rule `Agent(fork)`; Fork-Mode komplett aus: `CLAUDE_CODE_FORK_SUBAGENT=0`. (https://code.claude.com/docs/en/sub-agents#fork-the-current-conversation, https://code.claude.com/docs/en/prompt-caching#subagents-and-the-cache)
- `/fork` kopiert dagegen die ganze Session in eine neue Background-Session (agent view). (https://code.claude.com/docs/en/commands)

### A.8 `isolation: worktree`
- Frontmatter `isolation: worktree` (oder `isolation: "worktree"` beim Aufruf) lässt den Subagenten in einem temporären git worktree arbeiten; automatisch aufgeräumt, wenn er nichts geändert hat. Bash-Befehle werden gegen Ausbrüche in den Haupt-Checkout geprüft. (https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields, https://code.claude.com/docs/en/worktrees)
- **Basis:** Der Worktree verzweigt standardmäßig vom **Default-Branch des Remotes** (`worktree.baseRef: "fresh"`), nicht vom aktuellen HEAD des Parents; `"head"` ändert das. (https://code.claude.com/docs/en/worktrees#choose-the-base-branch)
- Agent-Team-Teammates werden nicht in Worktrees isoliert; Dateien müssen partitioniert werden. (https://code.claude.com/docs/en/agents)

---

## B. Kontextmanagement

### B.1 Kontextfenster pro Modell
| Modell | API-ID | Kontext | Max. Output | Quelle |
|---|---|---|---|---|
| Fable 5.1 | `claude-fable-5-1` | 1M | 128K | https://platform.claude.com/docs/en/about-claude/models/overview |
| Opus 5.5 | `claude-opus-5-5` | 1M | 128K | dto. |
| Sonnet 5.5 | `claude-sonnet-5-5` | 1M | 128K | dto. |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | **200K** | 64K | dto. |
- 1M ist für jedes dieser Modelle Standard, ohne Beta-Header; 1M-Requests werden zu Standardpreisen abgerechnet. (https://platform.claude.com/docs/en/build-with-claude/context-windows#context-window-sizes-by-model)
- **In Claude Code:** Fable 5.1/5, Sonnet 5.x und Opus 4.7+ laufen auf der Anthropic API auf **jedem Plan** mit 1M, ohne `[1m]`-Variante und ohne usage credits. Opus 4.6[1m] ist auf Max im Abo enthalten; Sonnet 4.6[1m] braucht usage credits. `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` hält native 1M-Modelle auf 200K. (https://code.claude.com/docs/en/model-config#extended-context, https://code.claude.com/docs/en/model-config#sonnet-5-5-and-sonnet-5-context-window)
- Die 1M-Rechnung hat laut Doku keinen Aufpreis jenseits 200K; bei Plänen, die 1M "included" haben, bleibt es im Abo. (gleiche Quelle)

### B.2 Auto-Compaction
- Modelle mit nativem 1M-Fenster kompaktieren standardmäßig bei ca. **967K Tokens**; Modelle ohne 1M (z. B. Haiku 4.5) am Fenstergrenzwert 200K. (https://code.claude.com/docs/en/model-config#default-auto-compact-thresholds)
- Frühere Kompaktierung: `/autocompact 500k` (100K–1M, ab v2.1.221), `claude --autocompact`, Setting `autoCompactWindow`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (nur Zahl, z. B. `500000`); `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (1–100 %, kann nur früher auslösen; gilt auch für Subagenten). (https://code.claude.com/docs/en/model-config#set-the-auto-compact-window, https://code.claude.com/docs/en/env-vars)
- Reihenfolge laut Doku: zuerst werden ältere Tool-Outputs gelöscht, dann zusammengefasst; Anfragen und wichtige Code-Snippets bleiben, "detailed instructions from early in the conversation may be lost". Wenn eine einzelne Datei/ein Tool-Output den Kontext nach jeder Zusammenfassung sofort wieder füllt, stoppt Claude Code das Auto-Compacting nach einigen Versuchen mit einem Thrashing-Fehler. (https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up)
- Kompaktieren ist selbst ein großer Request (liest die ganze Konversation). (https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)

### B.3 Was die Compaction erhält
(https://code.claude.com/docs/en/context-window#what-survives-compaction)
| Inhalt | Nach Compaction |
|---|---|
| Systemprompt, Output Style | gelten weiter |
| CLAUDE.md (Projekt-Root), unscoped Rules | neu von Disk geladen |
| Auto Memory | neu von Disk geladen |
| Git-Status | frischer Snapshot |
| Plan aus plan mode | neu von Disk |
| Rules mit `paths:`, verschachtelte CLAUDE.md | werden bei Lesezugriff wieder geladen, **aber nicht** in der Zusammenfassung gerettet |
| gelesene/bearbeitete Dateien | bis zu 5 zuletzt geänderte neu gelesen; >5.000 Tokens nur als Pfadverweis |
| aufgerufene Skills | neu injiziert, max. 5.000 Tokens je Skill, 25.000 gesamt, älteste zuerst verworfen |
| Background-Commands/-Subagenten | laufen weiter; Claude wird erinnert |
| Hook-Kontext von früher | wird mitzusammengefasst |
| `SessionStart`-Hooks mit Matcher `compact` | laufen, Ausgabe kommt in den kompaktierten Kontext |

### B.4 `/compact`, `/clear`
- `/compact [Anweisungen]` fokussiert die Zusammenfassung (z. B. `/compact focus on the auth bug fix`); zusätzlich Abschnitt "Compact Instructions" in CLAUDE.md. `/rewind` -> "Summarize from here / up to here" kompaktiert nur einen Teil. (https://code.claude.com/docs/en/context-window#when-your-context-fills-up, https://code.claude.com/docs/en/costs#manage-context-proactively)
- `/clear` startet eine neue Konversation mit leerem Kontext; CLAUDE.md und Projektdateien bleiben, Chat-Verlauf nicht; kostet nichts (während `/compact` einen großen Request braucht); setzt die `/usage`-Session-Summen zurück (v2.1.211+); entfernt ein aktives `/goal`; resetet den SendMessage-Namens-Check. Vorher `/rename`, danach `/resume`. (https://code.claude.com/docs/en/commands, https://code.claude.com/docs/en/costs, https://code.claude.com/docs/en/goal)
- Anthropics Linie: Kontext ist die zentrale Ressource, "performance degrades as it fills"; `/clear` zwischen unabhängigen Aufgaben; nach mehr als zwei Korrekturen derselben Sache `/clear` + besserer Prompt. Quantitative Aussage zur Qualität bei 80–90 % Füllung eines 1M-Fensters: **nicht dokumentiert.** (https://code.claude.com/docs/en/best-practices)

### B.5 CLAUDE.md, `@`-Imports, Memory
- **Größe:** Ziel "under 200 lines per CLAUDE.md file"; länger kostet Kontext und senkt die Befolgung. Dieselbe Empfehlung im Support-Artikel ("under roughly 200 lines") und in costs. Technisch lädt Claude Code CLAUDE.md bis 4 MiB vollständig; Warnung bei Start und in `/status`, wenn Dateien zu lang oder in Summe zu groß sind. (https://code.claude.com/docs/en/memory#write-effective-instructions, https://code.claude.com/docs/en/costs#move-instructions-from-claudemd-to-skills, https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)
- **`@path`-Imports:** werden beim Start mit der CLAUDE.md geladen; maximal 4 Hops tief; relativ zur importierenden Datei. "Imports help you organize a long file but don't reduce its context cost." Externe Imports außerhalb des Arbeitsverzeichnisses brauchen einmalige Freigabe. Zum Sparen: path-scoped Rules (`.claude/rules/*.md` mit `paths:`) oder Skills (on-demand). (https://code.claude.com/docs/en/memory#import-additional-files)
- **Auto Memory:** Verzeichnis `~/.claude/projects/<project>/memory/` (aus dem Git-Repo abgeleitet, Worktrees teilen es); `autoMemoryDirectory` verschiebt es. `MEMORY.md` = Index; nur die ersten 200 Zeilen oder 25 KB werden pro Session geladen; Memory-Dateien sind von der 30-Tage-Bereinigung ausgenommen. Hauptsessions-Memory erreicht Subagenten nicht; Subagenten haben ein eigenes `memory:`-Feld (`user`/`project`/`local`, ebenfalls 200 Zeilen/25 KB). (https://code.claude.com/docs/en/memory#auto-memory, https://code.claude.com/docs/en/sub-agents#enable-persistent-memory)
- `/memory` bearbeitet die Dateien; `/context` zeigt, was geladen wurde.

---

## C. Unbeaufsichtigtes Arbeiten

### C.1 Permission-Modi
(https://code.claude.com/docs/en/permission-modes)
| Modus | Läuft ohne Rückfrage | Anthropic: geeignet für |
|---|---|---|
| `default` (Manual) | nur Lesen | sensible Arbeit |
| `acceptEdits` | Lesen, Datei-Edits, mkdir/touch/mv/cp | Iteration mit Review |
| `plan` | Lesen | Erkunden |
| `auto` | alles, mit Classifier-Hintergrundprüfung | "Long tasks, reducing prompt fatigue" |
| `dontAsk` | nur Reads + vorab erlaubte Tools, Rest wird verweigert | "Locked-down CI and scripts" |
| `bypassPermissions` / `--dangerously-skip-permissions` | alles | "Isolated containers and VMs only" |
- **auto mode:** Seit v2.1.283 Startmodus in interaktiven Terminal-/VS-Code-Sessions auf jedem Plan; in `claude -p`/SDK dagegen `default` (nur in Sessions ohne Feature-Flag-Abruf, z. B. Drittanbieter oder Telemetrie aus, `auto` ab v2.1.285), also in `-p` explizit `--permission-mode auto` setzen. Unterstützte Hauptmodelle: Opus 4.6+, Sonnet 4.6+, Fable; Haiku nicht. Classifier läuft standardmäßig auf Sonnet 5. Blockiert standardmäßig u. a. Download+Ausführung von Code, Produktions-Deploys, Force-Push, Löschen von zuvor vorhandenen Dateien, Rechtevergabe. Beim Eintritt werden breite Allow-Rules verworfen (`Bash(*)`, `Agent`-Allow, Monitor-Allow, Interpreter-Wildcards). Nach 3 Blocks in Folge oder 20 gesamt pausiert auto mode und fragt wieder; in `-p` ohne Prompt-Tool wird die Aktion nur nicht ausgeführt und Claude arbeitet weiter. Subagenten: Aufgabenbeschreibung wird beim Spawn, jede Aktion und der Abschlussbericht geprüft; `permissionMode` im Subagent-Frontmatter wird ignoriert. Classifier-Kosten: auf Pro/Max zeigt Claude Code nie den "Classifier requests count toward usage"-Hinweis; wo Server-Side-Checks laufen, entstehen sie ohne Aufpreis. Dass Classifier-Tokens auf Max **nicht** gegen das Limit zählen, ist nur implizit dokumentiert. (https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode, https://code.claude.com/docs/en/permission-modes#when-auto-mode-falls-back, https://code.claude.com/docs/en/auto-mode-classifier-billing)
- **bypassPermissions:** deaktiviert Prompts und Safety Checks (auch für geschützte Pfade). Deny-Rules und `PreToolUse`-Hooks mit `deny` gelten weiter. Weigert sich als root/sudo auf Linux/macOS. Cloud-Sessions ignorieren `defaultMode: bypassPermissions` aus Settings. `rm -rf` auf kritische Pfade fragt auch hier. (https://code.claude.com/docs/en/permission-modes#skip-all-checks-with-bypasspermissions-mode)
- **dontAsk in `-p`:** Beispiel der Doku `claude -p "..." --permission-mode dontAsk --allowedTools "Bash(npm test)" "Read"`. (https://code.claude.com/docs/en/permission-modes#common-setups)

### C.2 Hooks als Guardrails und Testgates
(https://code.claude.com/docs/en/hooks, https://code.claude.com/docs/en/hooks-guide)
- **PreToolUse:** läuft vor jedem Permission-Check in jedem Modus; ein `deny` blockiert sogar unter `bypassPermissions`. Exit 2 oder JSON `permissionDecision: "deny"`. Ein `allow` hebt Deny-Rules nicht auf. (https://code.claude.com/docs/en/hooks-guide#hooks-and-permission-modes)
- **PostToolUse:** kann Aktionen nicht rückgängig machen; kann asynchron laufen (Tests nach Edit). (https://code.claude.com/docs/en/hooks#run-hooks-in-the-background)
- **Stop:** feuert, wenn der Hauptagent fertig antwortet. `decision: "block"` + `reason` (oder Exit 2 mit stderr) lässt Claude weiterarbeiten. **Cap: nach 8 aufeinanderfolgenden Blocks wird der nächste überstimmt** (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`); `stop_hook_active` prüfen. Feuert nicht bei User-Interrupt; API-Fehler lösen `StopFailure` aus. Eingabe enthält `background_tasks` und `session_crons`. (https://code.claude.com/docs/en/hooks#stop)
- **SubagentStop:** gleiche Entscheidungslogik; `block` hält den Subagenten am Laufen und liefert `reason` als nächste Anweisung. Zum Kontext-Anreichern im Parent: `PostToolUse` auf das `Agent`-Tool. (https://code.claude.com/docs/en/hooks#subagentstop)
- **PreCompact:** Matcher `manual`/`auto`; Exit 2 blockiert die Compaction (bei proaktivem Auto-Compact wird sie übersprungen; bei Recovery von einem Kontextfehler schlägt der Request fehl). `custom_instructions` enthält bei `/compact` den Fokustext. (https://code.claude.com/docs/en/hooks#precompact)
- **SessionStart** mit Matcher `compact`: stdout wird dem Kontext hinzugefügt; Doku-Beispiel zum Nachinjizieren von Projektkonventionen. (https://code.claude.com/docs/en/hooks-guide#re-inject-context-after-compaction)
- **Prompt-/Agent-Hooks:** `type: "prompt"` lässt ein Modell `{"ok": true|false, "reason": ...}` entscheiden (Timeout 30 s); `type: "agent"` (60 s) ist **experimentell**. Command-Hooks: Standard-Timeout 10 min. (https://code.claude.com/docs/en/hooks-guide#limitations)
- **`/goal`:** Wrapper um einen sessionbezogenen prompt-basierten Stop-Hook; nach jedem Turn bewertet das "small fast model" (Haiku, per `ANTHROPIC_DEFAULT_HAIKU_MODEL` änderbar) die Bedingung (max. 4.000 Zeichen) anhand dessen, was Claude im Gespräch gezeigt hat; er ruft keine Tools auf. Bedingung sollte einen messbaren Endzustand, einen genannten Check und Nebenbedingungen enthalten; Turn-/Zeitklausel ("or stop after 20 turns") möglich. Läuft auch in `claude -p "/goal ..."`. Stoppt bei mehreren Turns ohne Tool-Nutzung; wird bei unbehebbaren Fehlern (Auth, erschöpftes Guthaben, Kontext-Überlauf, Modell nicht verfügbar) gelöscht. Evaluationstokens "typically negligible". (https://code.claude.com/docs/en/goal)

### C.3 `claude -p` (headless)
- Kernflags (https://code.claude.com/docs/en/cli-reference):
  - `--max-turns N`: nur Print-Modus; Abbruch mit Fehler bei Erreichen; standardmäßig kein Limit.
  - `--max-budget-usd X`: nur Print-Modus; Subagenten-Kosten zählen mit; bei Erreichen schlägt der Spawn weiterer Subagenten mit `Budget limit reached` fehl und laufende Background-Subagenten werden gestoppt (v2.1.217+); beim Fortsetzen mit `--continue`/`--resume` zählen frühere Summen nicht mit.
  - `--permission-prompts none` (v2.1.259+): Prompts werden verweigert, Claude wird angewiesen, nicht erneut zu fragen; zusammen mit `--permission-mode auto` das Doku-Beispiel für unbeaufsichtigte Läufe. (https://code.claude.com/docs/en/headless#turn-off-permission-prompts-in-unattended-runs)
  - `--fallback-model sonnet,haiku`, `--output-format stream-json --verbose`, `--no-session-persistence`, `--resume`/`--continue`, `--session-id`, `--name`, `--agents <json|datei>` (Dateiform v2.1.281+), `--append-subagent-system-prompt` (v2.1.205+).
- `--bare`: überspringt Hooks, Skills, Subagenten, Plugins, MCP, Auto Memory, CLAUDE.md; "recommended for scripted and SDK calls", soll künftig Default für `-p` werden. **Liest weder OAuth-Credentials noch den Keychain noch `CLAUDE_CODE_OAUTH_TOKEN`**, authentifiziert nur über `ANTHROPIC_API_KEY`/`apiKeyHelper`/Cloud-Provider. (https://code.claude.com/docs/en/headless#start-faster-with-bare-mode, https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)
- Subscription-Token für Skripte: `claude setup-token` erzeugt ein einjähriges OAuth-Token (`CLAUDE_CODE_OAUTH_TOKEN`) für Pro/Max/Team/Enterprise; es kann nur Modell-Requests, keine Remote-Control-Sessions und keine claude.ai-Connectors. Wichtig: ein gesetztes `ANTHROPIC_API_KEY` hat Vorrang vor Subscription (Rangfolge: Provider, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `apiKeyHelper`, `CLAUDE_CODE_OAUTH_TOKEN`, ..., Subscription-Login) und führt zu API-Abrechnung. (https://code.claude.com/docs/en/authentication#authentication-precedence, https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- Endverhalten: Exit 0 bei Erfolg; SIGTERM -> Exit 143, aktueller Turn bleibt unvollendet; ein Background-Subagent/-Workflow hält `-p` offen, bis er fertig ist; Warte-Deckel 10 min Leerlauf (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`); Monitor in `-p` max. 10 min. (https://code.claude.com/docs/en/headless#background-tasks-at-exit)
- Auto-Continue beim Usage-Limit gibt es nur in **interaktiven** Sitzungen mit claude.ai-Login (nicht `-p`, nicht Background-Session, nicht Remote Control/Teammate); Wartezeit nur bei Reset innerhalb 24 h; max. zweimal hintereinander. (https://code.claude.com/docs/en/interactive-mode#wait-for-a-usage-limit-to-reset)
- Ob `--max-budget-usd` unter Subscription-Auth sinnvoll arbeitet: **nicht explizit dokumentiert.** Die Doku sagt nur, dass `/usage` den Dollarwert lokal aus Token-Zahlen zu Listenpreisen berechnet und er für Max-Abrechnung "nicht relevant" ist. (https://code.claude.com/docs/en/costs#using-the-usage-command)

### C.4 Routines / Scheduled Agents (Cloud)
(https://code.claude.com/docs/en/routines)
- Research Preview; Pro, Max, Team, Enterprise; laufen auf Anthropic-Infrastruktur auch bei geschlossenem Laptop; Trigger: Schedule (Minimum **1 Stunde**), API (HTTP POST mit Bearer-Token), GitHub-Events; Erstellung unter claude.ai/code/routines oder `/schedule`.
- Jeder Lauf: frischer Klon der gewählten Repos ab Default-Branch, Pushes auf `claude/`-Branches, kein Zugriff auf lokale Dateien, Connectors statt lokaler MCP-Server, **kein Permission-Mode-Picker** (läuft autonom); Modellauswahl pro Routine.
- **Abrechnung:** "Routines draw down subscription usage the same way interactive sessions do." Zusätzlich Stundenlimits: 100 geplante Läufe/h pro Account, 30 Run-now/API-Fires/h pro Routine, 100/h pro Account; ohne Overage. Bei erreichtem Abo-Limit laufen Routines mit eingeschalteten usage credits als Metered Overage weiter, sonst werden Läufe bis zum Reset abgelehnt.
- Desktop-Scheduled-Tasks (lokal, Maschine muss laufen, min. 1 Minute) sind eine eigene Variante. (https://code.claude.com/docs/en/scheduled-tasks#compare-scheduling-options)
- Ein Token-/Kostenbudget pro Run: **nicht dokumentiert.**

### C.5 Workflow-Tool und ultracode
(https://code.claude.com/docs/en/workflows)
- Dynamic Workflow = JavaScript-Skript, das viele Subagenten orchestriert; Zwischenergebnisse bleiben in Skriptvariablen, "Claude's context holds only the final answer". Verfügbar auf allen bezahlten Plänen (auf Pro in `/config` einschalten), auch in `-p` und im Agent SDK. Bundled: `/deep-research`.
- **ultracode:** `/effort ultracode` (Session), `claude --effort ultracode` (setzt `xhigh`), Setting `ultracode`; dann plant Claude für jede substanzielle Aufgabe einen Workflow. Offizielle Warnung: jede Anfrage braucht mehr Tokens und Zeit; "a session with ultracode on reaches a session or weekly limit sooner". Mit ultracode entfallen: Large-Workflow-Warnung, Concurrent-Subagent-Limit, Freigabe des ersten Workflow-Starts im auto mode.
- Kosten: Warnung `Large workflow` ab > 25 Agenten oder > 1,5 Mio. projizierten Tokens (nur Hinweis). Agenten-Modell folgt derselben Reihenfolge wie Subagenten (`CLAUDE_CODE_SUBAGENT_MODEL[_FORCE]` gilt auch für Workflow-Agenten). `workflowSizeGuideline` (`small` < 5, `medium` < 10, `large` < 50 Agenten; Standard `medium`, auf Pro `small`).
- Bei Usage-Limit pausiert ein Workflow-Run und setzt nach Reset fort, aber nur in interaktiven Sessions mit claude.ai-Login, `autoContinueAtUsageLimit` an, Reset < 24 h, max. zweimal; nicht in `-p`/SDK/Background-Session/Teammate-Session. Runs sind innerhalb derselben Session wiederaufnehmbar.

### C.6 `/loop`, ScheduleWakeup, Monitor
- `/loop [intervall] [prompt]`: sessionbezogen; ohne Intervall wählt Claude 1 Minute bis 1 Stunde (self-paced, via `ScheduleWakeup`); fällt eine Iteration ohne Reschedule aus, gibt es einen Fallback-Wakeup nach ca. 20 Minuten; wiederkehrende Tasks laufen nach **7 Tagen** ab; feuert nur, wenn Claude Code läuft und idle ist; kein Catch-up verpasster Läufe; self-paced `/loop` wird bei `--resume` nicht wiederhergestellt. Jeder Feuerschlag sendet den ganzen Kontext (Kosten). Subagenten bekommen `ScheduleWakeup` nicht. (https://code.claude.com/docs/en/scheduled-tasks, https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)
- **Monitor-Tool:** lässt Claude ein Hintergrund-Skript/WebSocket beobachten und pro Ausgabezeile reagieren; Deadline standardmäßig 5 Minuten, maximal 30 Minuten (10 in `-p`); nicht auf Bedrock/Vertex/Foundry und nicht mit `DISABLE_TELEMETRY`/`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`; gleiche Permission-Regeln wie Bash. Doku: oft token-effizienter als Polling. (https://code.claude.com/docs/en/tools-reference#monitor-tool, https://code.claude.com/docs/en/scheduled-tasks#let-claude-choose-the-interval)

### C.7 Agent Teams
(https://code.claude.com/docs/en/agent-teams, https://code.claude.com/docs/en/costs#agent-team-token-costs)
- **Experimentell, standardmäßig aus** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Eigene Sessions mit Task-Liste und Inter-Agent-Messaging; ein Team pro Session; keine verschachtelten Teams; bekannte Limits bei Resume/Shutdown.
- Kosten: "approximately 7x more tokens than standard sessions when teammates run in plan mode"; Empfehlung: Sonnet für Teammates, kleine Teams (3–5), fokussierte Spawn-Prompts, Teammates nach Abschluss beenden.

### C.8 Background-Sessions / Agent View
(https://code.claude.com/docs/en/agent-view)
- `claude agents` (Research Preview) dispatcht/überwacht Sessions, die ohne Terminal weiterlaufen; `claude --bg "…"` startet eine (nicht kombinierbar mit `-p`); `--bg` mit `--dangerously-skip-permissions` erfordert zuvor akzeptierten Dialog. Eine Background-Session, die länger als ihr Login lebt, stoppt bei abgelaufenem Credential (https://code.claude.com/docs/en/authentication). Fable-Usage-Credits-Consent-Prompt in Background-Sessions wird `dialogExpiry` (5 min) gehalten, danach endet der Turn ohne Request. (https://code.claude.com/docs/en/model-config#fable-and-usage-credits)

### C.9 Was Anthropic für mehrstündige autonome Läufe empfiehlt (Zusammenfassung)
1. **Verifikationsziel zuerst:** Tests/Build/Screenshot, den Claude selbst ausführen kann; "the difference between a session you watch and one you walk away from"; harte Absicherung via `/goal` oder Stop-Hook ("what let an unattended run finish correctly"). (https://code.claude.com/docs/en/best-practices#give-claude-a-way-to-verify-its-work)
2. **Adversarial Review:** vor "fertig" ein Subagent in frischem Kontext prüft den Diff gegen Plan/Kriterien (z. B. gebündelter `/code-review`). (https://code.claude.com/docs/en/best-practices#add-an-adversarial-review-step)
3. **auto mode** für ununterbrochene Ausführung mit Hintergrundprüfung, `dontAsk` + `--allowedTools` für Skripte, `bypassPermissions` nur isoliert. (https://code.claude.com/docs/en/best-practices#run-autonomously-with-auto-mode)
4. **Fable:** "Describe the outcome, not the steps"; "To keep it working toward that outcome, set a goal"; "Size up larger tasks". (https://code.claude.com/docs/en/model-config#work-with-fable)
5. **Engineering-Blog (Nov 2025):** Initializer-Agent legt `init.sh`, `claude-progress.txt` und einen ersten Git-Commit an; Feature-Liste als **JSON** (laut Artikel überschreibt das Modell JSON seltener unbeabsichtigt als Markdown), jedes Feature startet "failing", Agent setzt nur `passes`; ein Feature pro Session; Commit + Progress-Eintrag am Sessionende; End-to-End-Test per Browser-Automation statt nur Unit-Tests. (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents; Zusammenfassung per Modell, nicht gegen Rohtext geprüft)
6. **Engineering-Blog (Mär 2026):** Planner/Generator/Evaluator über Dateien; Kontext-Resets mit strukturiertem Handoff statt Compaction waren nötig bei Sonnet 4.5/Opus 4.5, bei Opus 4.6 weniger; "every component in a harness encodes an assumption about what the model can't do on its own" und sollte bei neuen Modellen neu geprüft werden; Beispielwerte laut Artikel: 6 h/200 USD (Opus 4.5, volle Harness) bzw. 3 h 50 min/124,70 USD (Opus 4.6, vereinfacht). (https://www.anthropic.com/engineering/harness-design-long-running-apps; Zusammenfassung per Modell, nicht gegen Rohtext geprüft; API-Preise, nicht Max-Limits)

---

## D. Nutzungslimits der Max-Subscription (5x/20x)

### D.1 Struktur
- **5-Stunden-Fenster:** "Your session-based usage limit will reset every five hours." **Wochenlimit:** "Max plans also have a weekly usage limit that applies across all models", Reset zu einer festen, dem Account zugewiesenen Zeit (unter Settings > Usage sichtbar). Anthropic behält sich weitere Begrenzungen (Wochen-/Monatskappen, Modell- und Feature-Limits) vor. (https://support.claude.com/en/articles/11049741-what-is-the-max-plan)
- **5x/20x:** "Max 5x includes five times the Pro plan's per-session usage allowance; Max 20x 20 times". Absolute Token-/Nachrichtenzahlen: **nicht dokumentiert.** (gleiche Quelle)
- Geteilter Pool: claude.ai, Claude Code, Desktop und IDE zählen gegen dasselbe Limit. (https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work, https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- 2026-05-06: Anthropic verdoppelte die Fünf-Stunden-Limits von Claude Code für Pro, Max, Team und seat-based Enterprise und entfernte die Peak-Hours-Reduktion für Pro/Max. Das Wochenlimit wird in dieser Ankündigung nicht erwähnt. (https://www.anthropic.com/news/higher-limits-spacex)
- Fehlermeldungen kennen `session limit`, `weekly limit` sowie `Opus limit` und `Sonnet limit`; Session- und Weekly-Limit gelten für alle Modelle, die Opus-/Sonnet-Limits nur für die jeweilige Familie (Wechsel auf ein Modell außerhalb der Familie hilft). Schwellenwerte dazu: **nicht dokumentiert**; der Support-Artikel zur Max-Subscription erwähnt solche Familien-Limits nicht. (https://code.claude.com/docs/en/errors#youve-hit-your-session-limit)
- Hinweis aus der Doku: Verbrauch zählt gleichzeitig gegen Session- und Wochenlimit; "A single burst of heavy activity, such as a large workflow fanout, can exhaust the weekly allowance before the session window resets." (gleiche Quelle)

### D.2 Wie wird Verbrauch gemessen?
- "Claude Code charges by API token consumption" (Grundlage der Kostenrechnung). Faktoren laut Support: Nachrichtenlänge, Anhänge, Konversationslänge, Tool-Nutzung, **Modellwahl, Effort-Level**, mehrstufige Aufgaben; gecachter Inhalt zählt weniger. (https://code.claude.com/docs/en/costs, https://support.claude.com/en/articles/9797557-usage-limit-best-practices)
- Jeder Request sendet die volle Konversation; mit Prompt Caching zum Cache-Read-Satz. Cache-TTL ist auf Subscription 1 Stunde (nur Hauptkonversation); Subagenten und Workflow-Agenten bekommen 5 Minuten, außer man setzt `experimental.cacheTtl: 1h` im Subagent-Frontmatter bzw. `subagentPromptCacheTtl`. Mit usage credits sinkt die TTL auf 5 Minuten. (https://code.claude.com/docs/en/prompt-caching#subagents-and-the-cache, https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)
- **Modellgewicht:** nur qualitativ: "Opus costs several times more per turn than Sonnet, and Sonnet more than Haiku"; "Opus ... uses meaningfully more of your quota". Exakte Faktoren Fable/Opus/Sonnet/Haiku: **nicht dokumentiert.** (https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code, Enterprise-Kontext)
- Thinking-Tokens werden als Output-Tokens berechnet; auf Fable/Opus 5.5/Sonnet 5.5 nicht abschaltbar. (https://code.claude.com/docs/en/costs#adjust-extended-thinking)

### D.3 Zählen Subagenten und Routines dagegen?
- **Subagenten:** ja, "sends its own requests, which count toward the same usage limits as your main conversation". (https://code.claude.com/docs/en/sub-agents)
- **Workflows:** "Runs count toward your plan's usage and rate limits." (https://code.claude.com/docs/en/workflows#cost)
- **Routines:** ja, gleiches Abo-Konto-Kontingent; zusätzlich Stundenlimits (siehe C.4). (https://code.claude.com/docs/en/routines#usage-and-limits)
- **Cloud-Sessions/Projects:** teilen sich die Rate Limits mit allem anderen; parallele Tasks verbrauchen proportional mehr; kein separater Compute-Charge. (https://code.claude.com/docs/en/claude-code-on-the-web, https://code.claude.com/docs/en/claude-projects)
- **Agent Teams:** ja, jedes Teammate verbraucht Tokens, bis es endet. (https://code.claude.com/docs/en/costs#agent-team-token-costs)
- Kleinere Posten: Hintergrundfunktionen wie Gesprächszusammenfassung (typischerweise < 0,04 USD pro Session), Prompt Suggestions (Cache-Reads), `/goal`-Evaluator (Haiku, "negligible"). (https://code.claude.com/docs/en/costs#background-token-usage)
- Einsicht in die Anteile: `/usage` zeigt Attribution auf Skills, Subagenten, Plugins, MCP-Server, `/loop`-Tasks (24 h/7 Tage per `d`/`w`), Verhaltensflags ab 10 %. Die Zahlen sind ungefähr und lokal (andere Geräte und claude.ai fehlen). (https://code.claude.com/docs/en/costs#plan-usage-breakdown)

### D.4 Fable vs. Opus vs. Sonnet vs. Haiku
- **Fable 5/5.1 auf Max:** "included as a standard part of your plan. You can use up to 50% of your weekly usage limits on Fable models at no extra cost. They draw from your plan's regular weekly usage limits and use them faster than other Claude models." Danach: mit usage credits weitermachen **oder** auf ein anderes Modell wechseln. "You can never use more than your weekly limit" (kein Zusatz-Kontingent); beides sichtbar in Settings > Usage (Fable separat). Die Fable-5-Promotion endete am 2026-07-19; Fable 5.1 war nie Teil davon. (https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan)
- In Claude Code: "Depending on your plan and seat tier, Fable usage can bill to usage credits"; in interaktiven Sessions erscheint vor dem ersten Credit-Request ein Consent-Prompt; in `-p` und SDK-Apps ohne Prompt fragt Claude Code nie: "When a Fable request there would bill to usage credits, Claude Code bills it without asking". (https://code.claude.com/docs/en/model-config#fable-and-usage-credits)
- **Haiku** ist laut Support die schnellste/günstigste Option; **Sonnet** "right choice for the large majority of coding work". (https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)
- `opusplan`: Opus im Plan Mode, Sonnet bei Ausführung. (https://code.claude.com/docs/en/model-config#opusplan-model-setting)

### D.5 Effort-Level
- Effort steuert adaptives Denken; "Lower effort is faster and cheaper"; `xhigh`: "Deeper reasoning at higher token spend"; `max`: "may show diminishing returns and is prone to overthinking". Defaults: `high` auf Modellen mit Effort-Unterstützung, **Opus 5.5 und Sonnet 5.5 `medium`**, Opus 4.7 `xhigh`. Die Skala ist pro Modell kalibriert. Quantifizierung des Verbrauchs je Level: **nicht dokumentiert.** (https://code.claude.com/docs/en/model-config#adjust-effort-level)
- Auflösung: `CLAUDE_CODE_EFFORT_LEVEL`/`--effort`/`/effort` > Settings (`modelSettings` pro Modell) > Modell-Default; Subagent-/Skill-Frontmatter `effort` überschreibt das Session-Level, nicht die Umgebungsvariable.

### D.6 Fast Mode
- Nur Opus 5.5/5/4.8; **nicht** Fable, Sonnet oder Haiku. Bis zu 2,5x schneller bei höheren Tokenpreisen (Opus 5.5: 8/40 USD je MTok). Auf Subscription-Plänen "available via usage credits only and not included in the subscription rate limits". Research Preview. (https://code.claude.com/docs/en/fast-mode)

### D.7 Extra Usage (usage credits)
- Heißt jetzt "usage credits" (Support-URL noch `extra-usage-for-paid-claude-plans`): Pay-as-you-go zu API-Preisen nach Erreichen des Plan-Limits; Aktivierung unter Settings > Usage oder `/usage-credits`; monatliches Ausgabenlimit einstellbar (oder unbegrenzt); Vorab-Kauf, optional Auto-Reload; Tageslimit für Einlösungen 2.000 USD; jederzeit abschaltbar. (https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans, https://code.claude.com/docs/en/costs#add-usage-credits-to-your-subscription)
- Support-Artikel (älterer Wortlaut, bezieht sich auf Console-API-Credits): Claude Code bietet beim Limit an, mit API-Credits weiterzumachen; "All transitions to API credit usage require explicit user consent." Wer nur im Plan bleiben will: ablehnen bzw. nur mit Plan-Login anmelden. **Spannung zur Claude-Code-Doku:** Dort steht, dass `-p` und SDK-Apps ohne Prompt eine Fable-Anfrage, die usage credits kosten würde, ohne Rückfrage abrechnen (siehe D.4). Beide Aussagen sind offiziell; welche für `-p` + Max + Fable gilt, ist nicht aufgelöst. (https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)

### D.8 Wo sieht man den Verbrauch?
- `/usage` (Aliase `/cost`, `/stats`): Session-Kosten (lokal, Listenpreis), Plan-Limit-Balken, Aktivität, Attribution, Usage-Credits-Zeile. Auf Pro/Max sind die Session-Dollars "not relevant for billing". (https://code.claude.com/docs/en/commands, https://code.claude.com/docs/en/costs#using-the-usage-command)
- Settings > Usage auf claude.ai: Balken für 5-Stunden-Session und Wochenlimits (inkl. Fable). (https://support.claude.com/en/articles/9797557-usage-limit-best-practices)
- Statusline-Skript: `rate_limits.five_hour.used_percentage`, `rate_limits.seven_day.used_percentage` und `resets_at` (nur Pro/Max, nach erster API-Antwort). (https://code.claude.com/docs/en/statusline#rate-limit-usage)
- Warnung vor Limit: z. B. "You've used 85% of your session limit". (https://code.claude.com/docs/en/errors#youve-hit-your-session-limit)
- `/tasks` (Modell je Subagent), `/workflows` (Tokens je Workflow-Agent), `/context` (Kontextaufteilung).

---

## E. Agent SDK (Python/TypeScript)

- **Was es ist:** "A library that runs the Claude Code binary" mit denselben Tools, Agent-Loop, Hooks, Subagenten, MCP, Permissions, Sessions; `claude -p` ist laut Headless-Seite derselbe Agent SDK per CLI. (https://code.claude.com/docs/en/agent-sdk/overview, https://code.claude.com/docs/en/headless)
- **Subscription oder API-Key?**
  - Authentifizierungs-Rangfolge der CLI gilt auch für das SDK ("`apiKeyHelper`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_AUTH_TOKEN` apply to the CLI and the surfaces that wrap it, including ... the Agent SDK"); Subscription-OAuth ist der Default, wenn nichts davor gesetzt ist; `CLAUDE_CODE_OAUTH_TOKEN` (aus `claude setup-token`) ist für Skripte vorgesehen. (https://code.claude.com/docs/en/authentication#authentication-precedence)
  - Support-Artikel (Stand: nach Pausierung vom 15.06.2026): "Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription's usage limits." Das geplante separate Monatsguthaben (Pro 20 USD, Max 5x 100 USD, Max 20x 200 USD; für SDK, `claude -p`, Claude Code GitHub Actions, Drittanbieter-Apps; danach nur mit usage credits zu API-Preisen) ist ausdrücklich "isn't available"; Anthropic arbeitet an einem überarbeiteten Plan und verspricht Vorab-Information. (https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
  - SDK-Doku: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods." Der Hinweis richtet sich an Entwickler, die Produkte für Dritte anbieten. Eine ausdrückliche Aussage zur privaten Nutzung des SDK mit eigener Subscription enthält die SDK-Doku **nicht**; die einzige direkte Aussage ist der Support-Satz oben. (https://code.claude.com/docs/en/agent-sdk/overview, https://code.claude.com/docs/en/agent-sdk/quickstart)
  - Hinweis: `claude --bare` liest keine Subscription-Credentials (nur API-Key); `settingSources: []` im SDK betrifft nur Settings-Quellen, nicht die Authentifizierung. Ob der SDK-`query()` ohne CLI-Login auf einer Subscription läuft, ist über die Rangfolge oben abgedeckt (Subscription-Login ist der letzte Eintrag), eine eigene SDK-Seite dazu gibt es **nicht**.
- **Wann lohnt sich ein eigener SDK-Runner vs. CLI?** Doku-Aussagen:
  - Die Headless-Seite verweist für "structured outputs, tool approval callbacks, and native message objects" auf die SDK-Pakete. (https://code.claude.com/docs/en/headless)
  - SDK-Hosting: kein Top-Level-Session-Timeout (-> `maxTurns`), `maxBudgetUsd`, Ergebnis-Subtypen (`error_max_turns`, `error_max_budget_usd`), Speicherwachstum bei langen Sessions ("Cap session length or recycle subprocesses"), Subagent-Fan-outs können Rate Limits treffen. (https://code.claude.com/docs/en/agent-sdk/hosting#known-limitations, https://code.claude.com/docs/en/agent-sdk/cost-tracking)
  - Standardverhalten SDK: lädt Settings/CLAUDE.md/Skills/Agents wie die CLI, wenn `settingSources` fehlt; Auto Memory lädt unabhängig davon (abschaltbar mit `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`); Fork-Mode standardmäßig aus; Startmodus `default` (in Sessions mit Feature-Flag-Abruf). (https://code.claude.com/docs/en/agent-sdk/claude-code-features, https://code.claude.com/docs/en/permission-modes#which-mode-a-session-starts-in)
  - Anthropic setzt in "Effective harnesses for long-running agents" das Claude Agent SDK über viele Kontextfenster ein (Initializer + Coding-Agent). (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
  - Keine Doku-Aussage: "Der SDK-Runner ist für mehrtägige Builds besser als die CLI". Die Entscheidung ist eine Abwägung (siehe Implikationen).

---

## Implikationen für ein 6-Tage-Build mit Orchestrator + Subagenten

Alle Punkte sind **Ableitungen** aus den obigen dokumentierten Fakten, sofern nicht anders angegeben.

1. **Modell-Routing hart verdrahten.** Ohne Maßnahme laufen `general-purpose`, Forks und Explore (unter Fable) auf Fable bzw. Opus 5.5. Dokumentierte Hebel: (a) `env` in `settings.json`: `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` + `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (alles auf Sonnet, auch Workflow-Agenten/Teammates; `model:`-Felder werden dann ignoriert, also kein Haiku-Mix); (b) ohne FORCE: pro Agent-Datei `model: sonnet|haiku`, eigener `Explore` mit `model: haiku`, `permissions.deny: ["Agent(fork)"]` oder `CLAUDE_CODE_FORK_SUBAGENT=0`. Risiko bei (b): Fable kann per Aufruf-Parameter ein anderes Modell mitgeben (nur FORCE verhindert das). Kontrolle mit `/tasks`. Mindestversion 2.1.257.
2. **Effort pro Subagent senken.** Subagenten erben `xhigh` der Session. In den Agent-Dateien `effort: medium` oder `low` setzen (Haiku 4.5 hat keine Effort-Stufen).
3. **Rückgabe klein halten.** Es gibt keine dokumentierte Obergrenze; die Delegationsprompts sollten ein Ausgabeformat vorgeben (z. B. "max. 30 Zeilen, Details in Datei X schreiben"), mit `maxTurns` je Agent. `omitClaudeMd: true` nur für Agenten, deren Prompt komplett eigenständig ist (Regeln wiederholen); Sparpotenzial hängt von der CLAUDE.md-Größe ab (Ziel < 200 Zeilen).
4. **Zustand auf Platte, nicht im Kontext.** Gemäß Anthropic-Engineering: `progress.md`, JSON-Feature-Liste mit `passes`, Commit pro Feature, `init`-Skript. Das überlebt Compaction, `/clear` und Tageswechsel. Zusätzlich `SessionStart`-Hook (`compact`), der Progress-Datei und Regeln wieder ausgibt, und "Compact Instructions" in der CLAUDE.md.
5. **Kontext früh schneiden statt bei ~967K.** Doku: Leistung sinkt bei vollem Fenster; Compaction ist selbst teuer. Option `/autocompact 400k`-artig oder `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`; den konkreten Wert gibt die Doku nicht vor (Ableitung/Experiment). Arbeitspaket-Grenzen mit `/clear` + Wiedereinstieg über die Platten-Artefakte.
6. **Autonomie-Stack (interaktiv oder `--bg`):** auto mode + `/goal` mit messbarer Bedingung und Turn-Klausel (z. B. "alle Tests grün und `tsc` fehlerfrei, oder stoppe nach 25 Turns") + `Stop`-Hook, der Testsuite/Typecheck ausführt (Exit 2, Cap 8 beachten) + `PreToolUse`-Deny-Hooks für Secrets/`.env`/`rm -rf` + Deny-Rules. Adversarial-Review-Subagent vor jedem Merge. `bypassPermissions` nur in Container/Dev-Container. GitHub-Pages-Deploy und Pushes können vom auto-mode-Classifier blockiert werden ("Production deploys", Force-Push); vorher `autoMode`-Trusted-Infrastructure prüfen (https://code.claude.com/docs/en/auto-mode-config).
7. **Budget-Disziplin (Max-Pool):** Ein Fable-xhigh-Orchestrator ist nach Doku der teuerste Posten; Fable darf nur bis 50 % des Wochenlimits "gratis" laufen. Daher: Orchestrator kurz halten, Arbeit an Sonnet delegieren, ultracode **nicht** über Tage anlassen, keine Agent Teams (ca. 7x, experimentell), `workflowSizeGuideline=small`. Vor Start: Reset-Zeitpunkt des Wochenlimits unter Settings > Usage ablesen und die 6 Tage um ihn herum planen (Auto-Continue wartet höchstens 24 h und nur interaktiv).
8. **Usage credits vorab entscheiden.** Mit eingeschalteten Credits werden Fable-Anfragen in `-p`/SDK **ohne Rückfrage** abgerechnet; in Background-Sessions blockiert der Consent-Prompt nach 5 min den Turn. Entweder Credits aus lassen (Fable stoppt dann an der 50-%-Grenze, Modellwechsel nötig) oder ein monatliches Limit setzen.
9. **Frühwarn-Schalter bauen (Eigenbau, nicht dokumentiert als Pattern):** Statusline-Skript schreibt `rate_limits.*.used_percentage` in eine Datei; ein `PreToolUse`- oder `Stop`-Hook liest sie und pausiert/stoppt bei z. B. 80 %. Hook-Eingaben enthalten laut Doku kein `rate_limits`-Feld.
10. **Worktrees:** Für parallele Implementierer (Parser, MCP-Server, Eval-Harness) `isolation: worktree`. Voraussetzung ist ein Git-Repo mit Commit(s); das aktuelle Verzeichnis `eu-ai-act-mcp` ist laut Umgebungsangabe **kein Git-Repo** (vorher `git init` + Initial-Commit, sonst `WorktreeCreate`-Hook). Worktrees verzweigen standardmäßig vom Remote-Default-Branch; bei rein lokaler Arbeit `worktree.baseRef: "head"` setzen.
11. **Routines nur für Randaufgaben** (Nacht-Report, Docs-Drift): frischer Klon, keine lokalen Dateien, 1-h-Minimum, gleicher Limit-Pool. Nicht als Haupt-Build-Treiber.
12. **SDK-Runner nur bei Bedarf.** Argumente dafür: deterministische Außenschleife mit frischer Session pro Arbeitspaket, `maxTurns`/`maxBudgetUsd`, Ergebnis-Parsing. Dagegen: Auth-/Policy-Unsicherheit (geplante Umstellung für SDK und `claude -p` nur pausiert, Ankündigung vor Änderung zugesagt), kein Auto-Continue bei Limit, `--bare` unbrauchbar mit Subscription. Für 6 Tage reichen CLI + Hooks + `/goal` + optional `claude -p` im Shell-Loop; ein Skript-Loop ist für die Abrechnung nicht sicherer als der SDK-Runner, weil beide von derselben Pausierung betroffen wären.
13. **Mindestversionen vor Start prüfen** (`claude --version`, `claude update`): Fable 5.1 ≥ 2.1.257, Sonnet 5.5 ≥ 2.1.284, Opus 5.5 ≥ 2.1.280, `omitClaudeMd` ≥ 2.1.271, `SUBAGENT_MODEL_FORCE` ≥ 2.1.257, `--permission-prompts` ≥ 2.1.259, Fork/`/subtask` ≥ 2.1.212.

---

## Nicht dokumentiert / offene Fragen

1. **Max-Kontingente in absoluten Zahlen** (Tokens/Nachrichten je 5-h-Fenster und Woche für 5x/20x) und die Kalibrierung gegenüber Pro. Support nennt nur Vielfache der Pro-Per-Session-Menge.
2. **Modellgewichte im Verbrauch** (Fable : Opus : Sonnet : Haiku), und wie Cache-Reads, Output- und Thinking-Tokens gewichtet werden. Dokumentiert sind nur qualitative Aussagen und die Liste der Faktoren.
3. **Effort-Level -> Verbrauch**: nur "higher token spend", keine Zahlen.
4. **Maximale Größe/Token-Zahl des Subagent-Rückgabewerts.** Dokumentiert sind nur "final text + small metadata trailer".
5. **Familien-Limits "Opus limit"/"Sonnet limit":** Meldungen existieren, Höhe und Beziehung zum Wochenlimit sind nicht erklärt (Support-Artikel zu Max nennt nur ein Wochenlimit über alle Modelle plus Fable-50-%).
6. **Verhalten in `-p`, wenn das Fable-50-%-Limit erreicht ist und usage credits aus sind.** Doku: bei Credit-Bedarf wird ohne Rückfrage abgerechnet; der Fall "Credits aus" ist nicht beschrieben.
7. **`--max-budget-usd` unter Subscription-Auth** (gegen welche Zahl, Listenpreis-Schätzung oder echte Abrechnung).
8. **Zählen Auto-Mode-Classifier-Tokens auf Max gegen das Limit?** Nur implizit: Hinweis erscheint auf Pro/Max nie, Server-Side-Checks "at no charge".
9. **Qualität bei hoher Füllung des 1M-Fensters** (z. B. ab 500K): nur die allgemeine Aussage "performance degrades as it fills".
10. **Obergrenze gleichzeitiger Agent-Team-Mitglieder** (nur Empfehlung 3–5; "follow their own limits").
11. **Dauerhaft zulässige Nutzung des Agent SDK mit privater Subscription:** aktuell laut Support-Artikel möglich, aber die geplante Änderung ist nur "paused"; die SDK-Doku selbst äußert sich nur zu Drittanbieter-Produkten. Offen, ob/wann ein Wechsel kommt.
12. **Token-/Kostenbudget pro Routine-Run** und Laufzeitgrenzen eines Routine-Runs: nicht gefunden.
13. **Übertragbarkeit der Engineering-Blog-Befunde** (Sonnet 4.5, Opus 4.5/4.6) auf Fable 5.1: Artikel sagen selbst, Annahmen bei jedem neuen Modell neu zu testen.
14. **Widerspruch/Lücke Consent bei usage credits in `-p`:** Support-Artikel ("explicit user consent") vs. Claude-Code-Doku (Fable wird in `-p` ohne Rückfrage abgerechnet, sofern Credits laufen).
15. **Wöchentlicher Reset-Zeitpunkt** des eigenen Accounts: nur über Settings > Usage ablesbar, nicht vorhersehbar.

---

## Quellen (alle abgerufen am 2026-10-05)

**Claude Code Docs (Rohtext `.md`, per HTTP geholt):**
- https://code.claude.com/docs/en/claude_code_docs_map.md (Index; zusätzlich per WebFetch)
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agents
- https://code.claude.com/docs/en/agent-view
- https://code.claude.com/docs/en/agent-teams
- https://code.claude.com/docs/en/worktrees
- https://code.claude.com/docs/en/context-window
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/how-claude-code-works
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/fast-mode
- https://code.claude.com/docs/en/prompt-caching
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/auto-mode-classifier-billing
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/goal
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/authentication
- https://code.claude.com/docs/en/routines
- https://code.claude.com/docs/en/workflows
- https://code.claude.com/docs/en/scheduled-tasks
- https://code.claude.com/docs/en/tools-reference
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/env-vars
- https://code.claude.com/docs/en/errors
- https://code.claude.com/docs/en/statusline
- https://code.claude.com/docs/en/claude-code-on-the-web
- https://code.claude.com/docs/en/claude-projects
- https://code.claude.com/docs/en/changelog
- https://code.claude.com/docs/en/agent-sdk/overview
- https://code.claude.com/docs/en/agent-sdk/quickstart
- https://code.claude.com/docs/en/agent-sdk/hosting
- https://code.claude.com/docs/en/agent-sdk/cost-tracking
- https://code.claude.com/docs/en/agent-sdk/claude-code-features

**Claude Platform Docs:**
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/context-windows

**support.claude.com (HTML -> Text):**
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan
- https://support.claude.com/en/articles/11049741-what-is-the-max-plan
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan
- https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- https://support.claude.com/en/articles/9797557-usage-limit-best-practices
- https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans
- https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code (Enterprise-/API-Fokus)

**Anthropic (offiziell, nicht in der Kernliste; Zusammenfassung per Modell, News gegen Rohtext geprüft):**
- https://www.anthropic.com/news/higher-limits-spacex (2026-05-06, gegen Rohtext geprüft)
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (2025-11-26, nur Modell-Zusammenfassung)
- https://www.anthropic.com/engineering/harness-design-long-running-apps (2026-03-24, nur Modell-Zusammenfassung)
