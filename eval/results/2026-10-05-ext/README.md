# Evaluation A, extension to n = 45 (2026-10-05)

Run A left the pre-registered decision **undecided** (Opus 5.5 with web search: 4/30 wrong, lower bound 3.8 %). The pre-registration says to extend to 45 cases with the same rule. This folder holds that extension: 15 new version and deadline questions, frozen before the first call in [`../../cases-ext.yaml`](../../cases-ext.yaml) with the addendum [`../../PREREG-ext.md`](../../PREREG-ext.md) (SHA-256 in [`../../SHA256SUMS`](../../SHA256SUMS)). Ground truth from the Official Journal; a second model rater, blind to the expected answers, agreed on 15/15. One ambiguous question (A35) was reworded before freezing. No lawyer reviewed the cases.

## Pre-registered decision (E1)

Opus 5.5 with web search, 3 runs per case: **2/15 new cases wrong** (A39, A44). Together with run A: **6/45 wrong, Clopper-Pearson 95 % [5.05 %, 26.8 %]**. The rule requires a lower bound of at least 5 %, so the decision is formally **met**.

**It is not robust, and we say so up front.**
- One of the six is **A28**, the case with the answer-key erratum already reported for run A (the model's answer was right; it cited another provision the amendment also changed). Without A28: 5/44, lower bound 3.8 %, not met.
- Scoring only date and answer, not the cited provision (exploratory, not pre-registered): 4/45 (A12, A17, A39, A44), lower bound 2.5 %, not met.

Our reading: with web search, Opus 5.5 still gets a small share of post-amendment questions wrong (between roughly 4 and 6 in 45 depending on how strictly you score), and the evidence for "at least 5 %" rests on one borderline case. Treat E1 as **met on the pre-registered rule, not robustly supported**.

## All arms on the 15 new cases

Errors per case (majority of runs). Opus 3 runs per case; GPT-6 Astra and Gemini 3.1 Pro 1 run.

| Model | No tools | Web search | This project's tools (v2) |
|---|---|---|---|
| Claude Opus 5.5 | **8/15** | 2/15 | 2/15 |
| GPT-6 Astra | **9/15** | not run | 1/15 |
| Gemini 3.1 Pro | **9/13** | not run | 2/12 |

Gemini: 2 (no tools) and 3 (tools) cases excluded because no answer could be parsed (sensitivity rows in the reports).

**Where the errors are.** 6 of the new cases were already answerable from the 2024 text, 9 were changed by the amendment. Without tools, Opus and GPT got all 6 unchanged cases right and 8 and 9 of the 9 changed cases wrong; Gemini got 2 unchanged and 7 changed wrong. The pattern from run A holds: the models know the 2024 Act and miss the amendment.

**Pooled over 45 cases without tools:** Opus 24/45, GPT-6 Astra 26/45, Gemini 25/42.

## What the tools still miss, and what we changed

The tools arm ran the **v2 tools** (the provision tool now picks the text in force on the question's date, a fix that came out of run A). It is reported separately and not pooled with run A's tools arm.

- **A40, all three models:** asked whether the "lower of" fine cap applies to small mid-caps. All fetched Article 99(6), which covers SMEs only, and answered "no". The amendment inserted **Article 99(6a)** for small mid-caps right next to it, and no model looked. Fix (day 5b): the provision tool now lists neighbouring provisions, flags inserted ones such as 6a, and its description tells the model to check them.
- **A42, Gemini:** the same pattern with Article 60 and the inserted Article 60a.
- **A44, Opus:** the right answer ("yes") but cited the Cyber Resilience Act instead of the new Article 42(3) of the AI Act. The evaluation exposes only three tools; the new search tool is not part of it.

These fixes are not yet measured. A future run will say whether they help.

## Limitations

- Small numbers: 15 new cases, 45 in total. One run per case for GPT and Gemini.
- A44's question ("as of 5 October 2026, … deemed to comply?") can be read as asking whether the presumption already applies in practice; under the pre-registered key the answer is "yes" with Article 42(3), and Opus's web answers also said the presumption "is not in the AI Act", which is wrong for the 2026 text.
- Opus ran through Claude Code on a subscription (see run A for the deviations from a plain API call); GPT and Gemini through OpenRouter.

## Files

| Path | Content |
|---|---|
| `primary/` | Opus 5.5, arms web and plain, 3 runs (90 calls, subscription, cost equivalent 2.56 USD) |
| `primary-tools-v2/` | Opus 5.5, tools v2, 3 runs (45 calls, cost equivalent 1.38 USD) |
| `secondary-plain/`, `secondary-tools-v2/` | GPT-6 Astra and Gemini 3.1 Pro, 1 run (60 calls, 1.95 USD) |

Scoring is deterministic (`src/eval/score.ts`, `eval-scorer-v2`, prompt `eval-prompt-v2`); commands in the addendum.
