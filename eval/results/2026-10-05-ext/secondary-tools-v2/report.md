# Eval report

- Cases file: eval/cases-ext.yaml
- Prompt version: eval-prompt-v2
- Scorer version: eval-scorer-v2
- Re-scored runs (on resume): 0
- Dry run (all runs mock): false
- Status: complete
- Repetitions per case: 1
- Total cost (sum of usage.cost, OpenRouter only): 1.3028 USD (cap 3.3 USD)

Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. "Version named" is the share of parsed runs whose `version` text names the Official Journal version (32024R1689), the consolidated version (02024R1689-20260727), both, or neither by an explicit identifier (versionNamed); it is descriptive and not part of correctness. The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.

E1 decision: none (no scored case for openai/gpt-6-astra in arm web on subset version_deadline)

## All cases

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 15 | 0 | 1 | [0.0017, 0.3195] | 1 | 0/15 | 0/15 | 100 % | 13 % / 87 % / 0 % / 0 % | 0.8014 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 15 | - | 1 | [0.0017, 0.3195] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 12 | 3 | 2 | [0.0209, 0.4841] | 2 | 3/15 | 0/15 | 100 % | 8 % / 92 % / 0 % / 0 % | 0.5014 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 15 | - | 5 | [0.1182, 0.6162] | - | - | - | - | - | - | - | openrouter |

## Arm tools: error rate by tool use

Runs, not cases: the share of scored runs that are wrong, split by whether the model called at least one tool in that run. Descriptive only: models that call tools may differ in other ways from models that do not.

| Model | Arm | Runs with >= 1 tool call: wrong/scored | Runs without a tool call: wrong/scored |
|---|---|---|---|
| openai/gpt-6-astra | tools | 1/15 (7 %) | 0/0 (-) |
| google/gemini-3.1-pro-preview | tools | 2/12 (17 %) | 0/0 (-) |

## Subset version_deadline

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 15 | 0 | 1 | [0.0017, 0.3195] | 1 | 0/15 | 0/15 | 100 % | 13 % / 87 % / 0 % / 0 % | 0.8014 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 15 | - | 1 | [0.0017, 0.3195] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 12 | 3 | 2 | [0.0209, 0.4841] | 2 | 3/15 | 0/15 | 100 % | 8 % / 92 % / 0 % / 0 % | 0.5014 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 15 | - | 5 | [0.1182, 0.6162] | - | - | - | - | - | - | - | openrouter |

## Subset evaluation

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (no runs) | | | | | | | | | | | | | |

## knowable_before_omnibus = true

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 6 | 0 | 0 | [0.0000, 0.4593] | 0 | 0/6 | 0/6 | 100 % | 33 % / 67 % / 0 % / 0 % | 0.3095 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 6 | - | 0 | [0.0000, 0.4593] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 4 | 2 | 0 | [0.0000, 0.6024] | 0 | 2/6 | 0/6 | 100 % | 25 % / 75 % / 0 % / 0 % | 0.2228 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 6 | - | 2 | [0.0433, 0.7772] | - | - | - | - | - | - | - | openrouter |

## knowable_before_omnibus = false

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai/gpt-6-astra | tools | 9 | 0 | 1 | [0.0028, 0.4825] | 1 | 0/9 | 0/9 | 100 % | 0 % / 100 % / 0 % / 0 % | 0.4919 | - | openrouter |
| openai/gpt-6-astra | tools: unparseable counted as wrong | 9 | - | 1 | [0.0028, 0.4825] | - | - | - | - | - | - | - | openrouter |
| google/gemini-3.1-pro-preview | tools | 8 | 1 | 2 | [0.0319, 0.6509] | 2 | 1/9 | 0/9 | 100 % | 0 % / 100 % / 0 % / 0 % | 0.2786 | - | openrouter |
| google/gemini-3.1-pro-preview | tools: unparseable counted as wrong | 9 | - | 3 | [0.0749, 0.7007] | - | - | - | - | - | - | - | openrouter |
