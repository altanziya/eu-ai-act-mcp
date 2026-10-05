# Eval report

- Cases file: eval/cases.yaml
- Prompt version: eval-prompt-v2
- Scorer version: eval-scorer-v2
- Re-scored runs (on resume): 0
- Dry run (all runs mock): false
- Status: complete
- Repetitions per case: 1
- Total cost (sum of usage.cost, OpenRouter only): 2.9588 USD (cap 6.8454 USD)

Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. "Version named" is the share of parsed runs whose `version` text names the Official Journal version (32024R1689), the consolidated version (02024R1689-20260727), both, or neither by an explicit identifier (versionNamed); it is descriptive and not part of correctness. The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.

E1 decision: none (no scored case for openai/gpt-6-astra in arm web on subset version_deadline)

## All cases

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 40 | 0 | 2 | [0.0061, 0.1692] | 2 | 0/40 | 0/40 | 100 % | 13 % / 88 % / 0 % / 0 % | 2.1306 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 40 | - | 2 | [0.0061, 0.1692] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 37 | 3 | 5 | [0.0454, 0.2877] | 5 | 3/40 | 0/40 | 98 % | 3 % / 97 % / 0 % / 0 % | 0.8283 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 40 | - | 8 | [0.0905, 0.3565] | - | - | - | - | - | - | - | openrouter |

## Arm tools: error rate by tool use

Runs, not cases: the share of scored runs that are wrong, split by whether the model called at least one tool in that run. Descriptive only: models that call tools may differ in other ways from models that do not.

| Model | Arm | Runs with >= 1 tool call: wrong/scored | Runs without a tool call: wrong/scored |
|---|---|---|---|
| openai/gpt-6-astra | tools | 2/40 (5 %) | 0/0 (-) |
| google/gemini-3.1-pro-preview | tools | 4/36 (11 %) | 1/1 (100 %) |

## Subset version_deadline

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 30 | 0 | 2 | [0.0082, 0.2207] | 2 | 0/30 | 0/30 | 100 % | 17 % / 83 % / 0 % / 0 % | 1.6628 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 30 | - | 2 | [0.0082, 0.2207] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 27 | 3 | 5 | [0.0630, 0.3808] | 5 | 3/30 | 0/30 | 97 % | 4 % / 96 % / 0 % / 0 % | 0.6704 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 30 | - | 8 | [0.1228, 0.4589] | - | - | - | - | - | - | - | openrouter |

## Subset evaluation

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 10 | 0 | 0 | [0.0000, 0.3085] | 0 | 0/10 | 0/10 | 100 % | 0 % / 100 % / 0 % / 0 % | 0.4678 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 10 | - | 0 | [0.0000, 0.3085] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 10 | 0 | 0 | [0.0000, 0.3085] | 0 | 0/10 | 0/10 | 100 % | 0 % / 100 % / 0 % / 0 % | 0.1579 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 10 | - | 0 | [0.0000, 0.3085] | - | - | - | - | - | - | - | openrouter |

## knowable_before_omnibus = true

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 13 | 0 | 0 | [0.0000, 0.2471] | 0 | 0/13 | 0/13 | 100 % | 38 % / 62 % / 0 % / 0 % | 0.7016 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 13 | - | 0 | [0.0000, 0.2471] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 13 | 0 | 3 | [0.0504, 0.5381] | 3 | 0/13 | 0/13 | 100 % | 8 % / 92 % / 0 % / 0 % | 0.2130 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 13 | - | 3 | [0.0504, 0.5381] | - | - | - | - | - | - | - | openrouter |

## knowable_before_omnibus = false

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 27 | 0 | 2 | [0.0091, 0.2429] | 2 | 0/27 | 0/27 | 100 % | 0 % / 100 % / 0 % / 0 % | 1.4289 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 27 | - | 2 | [0.0091, 0.2429] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 24 | 3 | 2 | [0.0103, 0.2700] | 2 | 3/27 | 0/27 | 96 % | 0 % / 100 % / 0 % / 0 % | 0.6153 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 27 | - | 5 | [0.0630, 0.3808] | - | - | - | - | - | - | - | openrouter |
