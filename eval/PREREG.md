# Vorregistrierung Eval A (eingefroren 2026-10-05)

Eingefroren am 2026-10-05 vor dem ersten Aufruf des Laufs. SHA-256 dieser Datei und des Fallsets in `eval/SHA256SUMS`, festgehalten im Git-Commit vor dem Lauf. Danach nicht mehr geändert. Grundlage: Design-Doc §Eval-Protokoll und §E1.

## Fragestellung
Wie oft nennen Frontier-Sprachmodelle bei Fragen zu Fassung und Fristen des EU AI Act nach der Änderung durch VO (EU) 2026/1744 eine falsche Frist, Kernaussage oder Fundstelle? Welche Fassung nennen sie dabei? Ändert sich das mit Websuche oder mit den Tools dieses Projekts?

## Fallset
- `eval/cases.yaml` , 40 Fälle: 30 Fassungs-/Fristenfälle (Teilmenge `version_deadline`), 10 Bewertungsfälle (5 korrekt, 5 falsch).
- Ground Truth aus dem Amtsblatt (32024R1689, 32026R1744), nicht aus der Fristentabelle des Projekts. Zwei unabhängige Bewertungen durch Sprachmodelle (Sonnet, die zweite blind), Übereinstimmung 40/40. Stichprobe der 10 riskantesten Fälle durch Altan gegen EUR-Lex: alle bestätigt (05.10.). `legal_review: llm_second_rater`, kein Jurist.

## Modelle (Regel vorab festgelegt)
- **Primärmodell:** Anthropic, weil jüngster dokumentierter Wissensstand ("Jun 2026", `work/eval/models.md`). Gewählt `claude-opus-5-5` (Anthropics Standardempfehlung); Fable 5.1 hat denselben Wissensstand.
- **Weg (Altan, 05.10., Variante b):** Primärmodell über Claude Code CLI mit Max-Abo (`claude -p`, Backend `claude-code`), eigener Systemprompt, ohne CLAUDE.md, Memory und Nutzereinstellungen. **Abweichung vom reinen API-Aufruf:** sichtbar bleiben ein Identitätssatz des Agent SDK, die Konto-E-Mail und ein Umgebungsblock mit dem Ausführungsdatum (betrifft 5 Fälle mit früherem Stichtag; alle nennen ihren Stichtag in der Frage). Temperatur nicht einstellbar, `--effort low`, höchstens 8 Runden.
- **Sekundärmodelle (deskriptiv):** `openai/gpt-6-astra` (OpenAI-Spitzenmodell, Wissensstand 30.04.2026), `google/gemini-3.1-pro-preview` (Google-Pro-Flaggschiff, Wissensstand nicht dokumentiert), über OpenRouter, Arme `plain` und `tools`, 1 Wiederholung. Reihenfolge: erst `plain` beider Modelle, dann `tools`; harter Deckel 8 USD gesamt; was der Deckel abschneidet, wird als nicht gelaufen berichtet.

## Arme
1. `plain`: ohne Tool, ohne Websuche.
2. `web`: ohne Projekt-Tools, mit Websuche. Primärmodell: Anthropics eigene Websuche (WebSearch/WebFetch in Claude Code), wie im Design-Doc; Systemprompt-Zusatz "You may search the web." (Prompt v2).
3. `tools`: die drei MCP-Tools dieses Projekts als Funktionen, freie Tool-Wahl, Aufrufquote gemessen.

## Bewertung
- Deterministisch gegen `eval/cases.yaml` (`src/eval/score.ts`, `eval-scorer-v2`). Ein Lauf ist richtig, wenn alle erwarteten Prüfungen stimmen:
  - **Datum** (22 Fristenfälle) nach Normalisierung auf JJJJ-MM-TT.
  - **Kernaussage** (5 Fälle): ja/nein über das erste Wort der Antwort, sonst Teilstring (z. B. "AI Office").
  - **Fundstelle:** auf Artikelebene (Art. 113 genügt), außer bei 3 Fragen, die nach der genauen Vorschrift fragen (A22, A23, A27).
  - **Urteil** bei den 10 Bewertungsfällen.
- **Fassung ist beschreibend, nicht Teil der Bewertung.** Grund: Der Systemprompt nennt in allen Armen "Regulation (EU) 2024/1689", die Tool-Beschreibungen nennen die konsolidierte Fassung. Ein Fassungs-Check würde Echo messen. Berichtet wird, welche Fassung genannt wird, nur über explizite Kennungen (CELEX, 2026/1744), nie über Schlagworte wie "consolidated" (Review 05.10.: "…32024R1689. I cannot confirm whether the Digital Omnibus is in force" wurde sonst als 2026 gewertet).
- Einheit ist der Fall. Bei R Wiederholungen ist ein Fall falsch, wenn mehr als R/2 Läufe falsch sind; "mindestens eine falsch" wird zusätzlich berichtet.
- **Nicht parsebare Antworten** zählen nicht als falsch. Ein Fall ist ausgeschlossen, wenn alle Läufe nicht parsebar sind; Zahl der Ausschlüsse wird berichtet. Sensitivität: dieselbe Rechnung mit "nicht parsebar = falsch".
- **Arm `tools`:** Die Tool-Beschreibungen sind die des echten MCP-Servers und nennen die Fassung 2026; gemessen wird also das Produkt, wie ein Client es sieht. Fehlerquote getrennt nach "Tool aufgerufen" und "kein Tool".
- Intervalle: Clopper-Pearson 95 % auf Fällen.

## Primärer Endpunkt und Entscheidungsregel
- Fehlerrate des Primärmodells im Arm `web` auf der Teilmenge `version_deadline` (n = 30 abzüglich Ausschlüsse). Nur diese Zeile trägt eine E1-Entscheidung.
- **Belegt:** untere 95-%-Grenze ≥ 5 % (bei n = 30: mindestens 5 Fehler).
- **Nicht belegt:** 0 Fehler (obere Grenze 11,6 %).
- **Unentschieden:** 1 bis 4 Fehler; dann Erweiterung auf n = 45 mit derselben Regel, sonst "nicht belegt".
- Arm `plain`, Arm `tools`, Straten `knowable_before_omnibus` und Sekundärmodelle werden berichtet, entscheiden aber nichts.

## Umfang
- Primärmodell: 40 Fälle × 3 Arme × 3 Wiederholungen = 360 Aufrufe über das Abo (Deckel `--max-claude-calls 400`), kein Geld; Kostenäquivalent wird berichtet.
- Sekundärmodelle: 40 × 2 Modelle × 2 Arme = 160 Aufrufe, Schätzung ≈ 6 USD (F72), Deckel 8 USD.

## Harte Grenzen
- Kostendeckel im Harness je Lauf (`--max-usd`), Abbruch vor jedem Aufruf und jeder Tool-Runde, die ihn überschreiten würde; fehlende Kostenangabe wird mit der Schätzung ×1,5 verbucht; höchstens 4 Tool-Aufrufe je Runde, 6 Runden.
- Ergebnisdateien tragen `prompt_version` und `scorer_version`.
- `temperature` 0, wo erlaubt; `max_tokens` 3000; Systemprompt nennt den Stichtag des Falls.
- Keine Änderung an Fällen, Prompts oder Regel nach dem ersten Aufruf. Fehler im Fallset nach dem Lauf werden im Changelog genannt, der Lauf wird dann wiederholt oder der Fall ausgewiesen.

## Beobachtungen aus den Rauchtests (vor dem Einfrieren)
- Claude Code zieht im Arm `web` für das Lesen von Seiten ein zweites Modell hinzu (`claude-haiku-4-5`, `model_reported`). Das gehört zur Websuche des Produkts und wird berichtet.
- Ein Lauf mit Fehler (API, Quota, Timeout) ist kein falscher Lauf; er wird per `--resume` nachgeholt oder als Fehler ausgewiesen.

## Startbefehle (exakt so)
```
npm run eval -- --cases eval/cases.yaml --models claude-code/claude-opus-5-5 --primary-model claude-code/claude-opus-5-5 \
  --arms plain,web,tools --reps 3 --max-usd 0 --max-claude-calls 400 --out work/eval/run-A/primary
npm run eval -- --cases eval/cases.yaml --models openai/gpt-6-astra,google/gemini-3.1-pro-preview --primary-model openai/gpt-6-astra \
  --arms plain --reps 1 --max-usd 8 --out work/eval/run-A/secondary-plain
npm run eval -- --cases eval/cases.yaml --models openai/gpt-6-astra,google/gemini-3.1-pro-preview --primary-model openai/gpt-6-astra \
  --arms tools --reps 1 --max-usd <8 minus Ausgaben des vorigen Laufs> --out work/eval/run-A/secondary-tools
```
Die E1-Entscheidung stammt nur aus dem ersten Lauf. `--primary-model` in den Sekundärläufen ist technisch nötig, deren E1-Zeile entscheidet nichts.
