# Evaluation A: results (2026-10-05)

**Question.** After the Digital Omnibus on AI (Regulation (EU) 2026/1744, in force 27 July 2026), how often do frontier models give a wrong date, answer or provision for version and deadline questions on the EU AI Act, and does web search or this project's MCP tools change that?

**Pre-registered** before the first call: [`../../PREREG.md`](../../PREREG.md) and [`../../cases.yaml`](../../cases.yaml) (SHA-256 in [`../../SHA256SUMS`](../../SHA256SUMS)). 40 cases: 30 version and deadline questions, 10 "is this quotation correct" checks. Ground truth from the Official Journal, two independent model raters agreed on 40/40, the 10 riskiest cases checked by hand against EUR-Lex.

## Results: version and deadline questions (n = 30 cases)

Errors per case (majority of runs). Opus 5.5: 3 runs per case. GPT-6 Astra and Gemini 3.1 Pro: 1 run.

| Model | No tools | Web search | This project's MCP tools |
|---|---|---|---|
| Claude Opus 5.5 | **16/30** (53 %) | 4/30 (13 %) | 3/30 (10 %) |
| GPT-6 Astra | **17/30** (57 %) | not run | 2/30 (7 %) |
| Gemini 3.1 Pro | **16/29** (55 %) | not run | 5/27 (19 %) |

Gemini: 1 (no tools) and 3 (tools) cases excluded because no answer could be parsed.

**Where the errors are.** Split by whether the correct answer was already knowable before the amendment:

| Model, arm | Unchanged by the amendment (12) | Changed by the amendment (18) |
|---|---|---|
| Opus, no tools | 0 | 16 |
| GPT-6 Astra, no tools | 0 | 17 |
| Gemini 3.1 Pro, no tools | 0 | 16 of 17 |
| Opus, tools | 1 | 2 |
| GPT-6 Astra, tools | 0 | 2 |
| Gemini 3.1 Pro, tools | 3 | 2 of 15 |

Without tools, the models are right about everything the 2024 text still says and wrong about almost everything the amendment changed. The typical error is the old date: *"high-risk obligations for Annex III apply from 2 August 2026"* instead of 2 December 2027.

**Quotation checks** (10 cases, 5 correct and 5 wrong quotations): errors without tools 6/10 (Opus), 7/10 (GPT-6 Astra), 6/10 (Gemini); with tools 0/10 for all three; Opus with web search 0/10.

## Pre-registered decision (E1)

Primary endpoint: Opus 5.5 with web search, version and deadline questions. **4/30 wrong, Clopper-Pearson 95 % [3.8 %, 30.7 %]: undecided.** The rule required a lower bound of at least 5 %. The pre-registration says to extend to n = 45 with the same rule; that extension has not been run yet.

## Limitations and deviations, stated up front

- **Strict scoring.** A run counts as right only if date or answer **and** the cited provision are right. Exploratory, not pre-registered: scoring date and answer only gives Opus 15/30, 2/30, 1/30; GPT-6 Astra 15/30 and 0/30; Gemini 15/29 and 4/27.
- **Erratum A28.** The expected provision is Article 6(1a). Two models cited Article 3(14), which the amendment also changed. The answer ("no") was right in all these runs. Not rescored.
- **Weakness of the tools found by this evaluation.** For questions dated before the amendment (A06, A07, A19), models using the tools sometimes answered with the new date. The provision tool defaults to the current version unless a version is given. Fix planned: derive the default version from the question date.
- **Opus via Claude Code.** Opus ran through the Claude Code CLI on a subscription, with its own system prompt and without user settings. A short SDK identity line, the account e-mail and the execution date stayed visible. Web search is Anthropic's own and uses a second model to read pages. GPT and Gemini ran through OpenRouter.
- **Small numbers.** 30 cases. One run per case for GPT and Gemini. No lawyer reviewed the cases.

## Files

| Path | Content |
|---|---|
| `primary/` | Opus 5.5, 3 arms × 3 runs (360 calls, subscription, cost equivalent 12.5 USD) |
| `secondary-plain/`, `secondary-tools/` | GPT-6 Astra and Gemini 3.1 Pro (160 calls, 4.11 USD) |
| `*/runs.jsonl` | Every call: raw answer, parsed answer, checks, tool calls, tokens, cost |
| `*/report.md` | Full tables per model × arm, subset and stratum, with the method text |

Reproduce: commands in the pre-registration; scoring is deterministic (`src/eval/score.ts`, scorer `eval-scorer-v2`, prompt `eval-prompt-v2`).
