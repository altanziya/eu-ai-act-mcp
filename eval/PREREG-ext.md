# Vorregistrierung Eval A, Erweiterung auf n = 45 (eingefroren 2026-10-05, vor dem ersten Aufruf)

Nachtrag zu `PREREG.md` (unverändert). Anlass: Lauf A ergab für E1 4/30, Clopper-Pearson 95 % [3,8 %, 30,7 %], also "unentschieden". `PREREG.md` §Entscheidungsregel schreibt dann die Erweiterung auf n = 45 mit derselben Regel vor.

## Fallset
- `eval/cases-ext.yaml`: 15 neue Fälle A31–A45, alle Teilmenge `version_deadline`, Format wie `cases.yaml`. 6 vor dem Omnibus wissbar, 9 durch ihn geändert.
- Ground Truth aus dem Amtsblatt (32024R1689, 32026R1744, konsolidiert 02024R1689-20260727). Erstbewertung Sonnet, blinde Zweitbewertung Sonnet (nur Frage und Stichtag): 15/15 übereinstimmend. A35 als mehrdeutig markiert und vor dem Einfrieren eindeutig umformuliert (Notiz im Fall). `legal_review: llm_second_rater`, keine Stichprobe durch Altan.
- Unverändert: Prompts (`eval-prompt-v2`), Scorer (`eval-scorer-v2`), Mehrheitsregel je Fall, Ausschluss nicht parsebarer Fälle, Sensitivitätszeile.

## Primärer Endpunkt (einzige Entscheidung)
- Opus 5.5 (`claude-code/claude-opus-5-5`), Arm `web`, 3 Wiederholungen, auf den 15 neuen Fällen; Fehler zusammengezählt mit den 4 Fehlern aus Lauf A (30 Fälle) über **n = 45** abzüglich Ausschlüsse.
- **Belegt:** untere 95-%-Grenze ≥ 5 %, bei n = 45 also **mindestens 6 Fehler** (2 weitere). Sonst **nicht belegt**. Keine weitere Erweiterung.
- Ausgewertet mit `src/eval/stats.ts` (Clopper-Pearson); die Rechnung steht im Ergebnis-README.

## Weitere Arme (beschreibend)
- Opus `plain`, 3 Wiederholungen, gleicher Code-Stand wie Lauf A (Commit 9db8fea).
- Arm `tools` (Opus 3 Wiederholungen; GPT-6 Astra und Gemini 3.1 Pro je 1): **erst nach** Übernahme von Tag 5a (Fassung folgt dem Stichtag, Suche, Prüfer). Gemessen wird also die neue Tool-Version; sie wird getrennt als "tools v2" berichtet, nicht mit Lauf A gepoolt.
- Sekundärmodelle `plain`, je 1 Lauf. Harter Deckel OpenRouter gesamt 4 USD; was er abschneidet, wird als nicht gelaufen berichtet.

## Startbefehle
```
npm run eval -- --cases eval/cases-ext.yaml --models claude-code/claude-opus-5-5 --primary-model claude-code/claude-opus-5-5 \
  --arms web,plain --reps 3 --max-usd 0 --max-claude-calls 100 --out work/eval/run-A-ext/primary
npm run eval -- --cases eval/cases-ext.yaml --models openai/gpt-6-astra,google/gemini-3.1-pro-preview --primary-model openai/gpt-6-astra \
  --arms plain --reps 1 --max-usd 2 --out work/eval/run-A-ext/secondary-plain
# nach Tag 5a:
npm run eval -- --cases eval/cases-ext.yaml --models claude-code/claude-opus-5-5 --primary-model claude-code/claude-opus-5-5 \
  --arms tools --reps 3 --max-usd 0 --max-claude-calls 60 --out work/eval/run-A-ext/primary-tools-v2
npm run eval -- --cases eval/cases-ext.yaml --models openai/gpt-6-astra,google/gemini-3.1-pro-preview --primary-model openai/gpt-6-astra \
  --arms tools --reps 1 --max-usd <4 minus bisherige Ausgaben> --out work/eval/run-A-ext/secondary-tools-v2
```
Die E1-Zeile in den Reports der Erweiterungsläufe bezieht sich nur auf 15 Fälle und entscheidet nichts; maßgeblich ist die Summe über 45.
