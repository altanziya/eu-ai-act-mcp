# Eval report

- Cases file: eval/cases.yaml
- Prompt version: eval-prompt-v2
- Scorer version: eval-scorer-v2
- Re-scored runs (on resume): 0
- Dry run (all runs mock): false
- Status: complete
- Repetitions per case: 1
- Total cost (sum of usage.cost, OpenRouter only): 1.1546 USD (cap 8 USD)

Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. "Version named" is the share of parsed runs whose `version` text names the Official Journal version (32024R1689), the consolidated version (02024R1689-20260727), both, or neither by an explicit identifier (versionNamed); it is descriptive and not part of correctness. The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.

E1 decision: none (no scored case for openai/gpt-6-astra in arm web on subset version_deadline)

## All cases

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | plain | 40 | 0 | 24 | [0.4333, 0.7514] | 24 | 0/40 | 0/40 | - | 100 % / 0 % / 0 % / 0 % | 0.6828 | - | openrouter |
| openai/gpt-6-astra | plain: unparseable counted as wrong | 40 | - | 24 | [0.4333, 0.7514] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | plain | 39 | 1 | 22 | [0.3962, 0.7219] | 22 | 1/40 | 0/40 | - | 100 % / 0 % / 0 % / 0 % | 0.4718 | - | openrouter |
| google/gemini-3.1-pro-preview | plain: unparseable counted as wrong | 40 | - | 23 | [0.4089, 0.7296] | - | - | - | - | - | - | - | openrouter |

## Arm tools: error rate by tool use

Runs, not cases: the share of scored runs that are wrong, split by whether the model called at least one tool in that run. Descriptive only: models that call tools may differ in other ways from models that do not.

| Model | Arm | Runs with >= 1 tool call: wrong/scored | Runs without a tool call: wrong/scored |
|---|---|---|---|
| (arm tools not run) | | | |

## Subset version_deadline

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | plain | 30 | 0 | 17 | [0.3743, 0.7454] | 17 | 0/30 | 0/30 | - | 100 % / 0 % / 0 % / 0 % | 0.4904 | - | openrouter |
| openai/gpt-6-astra | plain: unparseable counted as wrong | 30 | - | 17 | [0.3743, 0.7454] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | plain | 29 | 1 | 16 | [0.3569, 0.7355] | 16 | 1/30 | 0/30 | - | 100 % / 0 % / 0 % / 0 % | 0.3482 | - | openrouter |
| google/gemini-3.1-pro-preview | plain: unparseable counted as wrong | 30 | - | 17 | [0.3743, 0.7454] | - | - | - | - | - | - | - | openrouter |

## Subset evaluation

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | plain | 10 | 0 | 7 | [0.3475, 0.9333] | 7 | 0/10 | 0/10 | - | 100 % / 0 % / 0 % / 0 % | 0.1923 | - | openrouter |
| openai/gpt-6-astra | plain: unparseable counted as wrong | 10 | - | 7 | [0.3475, 0.9333] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | plain | 10 | 0 | 6 | [0.2624, 0.8784] | 6 | 0/10 | 0/10 | - | 100 % / 0 % / 0 % / 0 % | 0.1236 | - | openrouter |
| google/gemini-3.1-pro-preview | plain: unparseable counted as wrong | 10 | - | 6 | [0.2624, 0.8784] | - | - | - | - | - | - | - | openrouter |

## knowable_before_omnibus = true

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | plain | 13 | 0 | 0 | [0.0000, 0.2471] | 0 | 0/13 | 0/13 | - | 100 % / 0 % / 0 % / 0 % | 0.1988 | - | openrouter |
| openai/gpt-6-astra | plain: unparseable counted as wrong | 13 | - | 0 | [0.0000, 0.2471] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | plain | 13 | 0 | 0 | [0.0000, 0.2471] | 0 | 0/13 | 0/13 | - | 100 % / 0 % / 0 % / 0 % | 0.1300 | - | openrouter |
| google/gemini-3.1-pro-preview | plain: unparseable counted as wrong | 13 | - | 0 | [0.0000, 0.2471] | - | - | - | - | - | - | - | openrouter |

## knowable_before_omnibus = false

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | plain | 27 | 0 | 24 | [0.7084, 0.9765] | 24 | 0/27 | 0/27 | - | 100 % / 0 % / 0 % / 0 % | 0.4839 | - | openrouter |
| openai/gpt-6-astra | plain: unparseable counted as wrong | 27 | - | 24 | [0.7084, 0.9765] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | plain | 26 | 1 | 22 | [0.6513, 0.9564] | 22 | 1/27 | 0/27 | - | 100 % / 0 % / 0 % / 0 % | 0.3418 | - | openrouter |
| google/gemini-3.1-pro-preview | plain: unparseable counted as wrong | 27 | - | 23 | [0.6627, 0.9581] | - | - | - | - | - | - | - | openrouter |
