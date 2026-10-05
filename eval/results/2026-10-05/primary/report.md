# Eval report

- Cases file: eval/cases.yaml
- Prompt version: eval-prompt-v2
- Scorer version: eval-scorer-v2
- Re-scored runs (on resume): 0
- Dry run (all runs mock): false
- Status: complete
- Repetitions per case: 3
- Total cost (sum of usage.cost, OpenRouter only): 0.0000 USD (cap 0 USD)
- Cost equivalent of the claude-code runs (API prices, not billed, not counted against the cap): 12.5065 USD

Backend claude-code (model ids with the prefix `claude-code/`): each run is one call of the Claude Code CLI (`claude -p`) on a subscription, not on the API. The call uses its own system prompt (`--setting-sources ""`: no CLAUDE.md, no memory, no project settings). What stays visible to the model is an identity sentence of the Agent SDK, the account e-mail address and an environment block with the execution date; the case date is given only by the system prompt. Web search (arm web) is Anthropic's own (WebSearch and WebFetch); the tools arm offers only the three project tools through a local MCP server. `cost_equiv_usd` is the API-equivalent cost reported by the CLI (`total_cost_usd`); it is not billed, is summed separately and does not count against --max-usd. The other models run through OpenRouter and are billed by `usage.cost`.

Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. "Version named" is the share of parsed runs whose `version` text names the Official Journal version (32024R1689), the consolidated version (02024R1689-20260727), both, or neither by an explicit identifier (versionNamed); it is descriptive and not part of correctness. The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.

E1 decision: undecided (claude-code/claude-opus-5-5, arm web, subset version_deadline: 4/30 cases wrong, Clopper-Pearson 95 % [0.0376, 0.3072])

## All cases

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | plain | 40 | 0 | 22 | [0.3849, 0.7074] | 23 | 0/120 | 0/120 | - | 98 % / 0 % / 3 % / 0 % | 0.0000 | 2.1731 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 40 | - | 22 | [0.3849, 0.7074] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | web | 40 | 0 | 4 | [0.0279, 0.2366] | 7 | 0/120 | 0/120 | - | 39 % / 58 % / 3 % / 0 % | 0.0000 | 5.9738 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 40 | - | 4 | [0.0279, 0.2366] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | tools | 40 | 0 | 3 | [0.0157, 0.2039] | 4 | 0/120 | 0/120 | 95 % | 4 % / 90 % / 6 % / 0 % | 0.0000 | 4.3597 | claude-code |
| claude-code/claude-opus-5-5 | tools: unparseable counted as wrong | 40 | - | 3 | [0.0157, 0.2039] | - | - | - | - | - | - | - | claude-code |

## Arm tools: error rate by tool use

Runs, not cases: the share of scored runs that are wrong, split by whether the model called at least one tool in that run. Descriptive only: models that call tools may differ in other ways from models that do not.

| Model | Arm | Runs with >= 1 tool call: wrong/scored | Runs without a tool call: wrong/scored |
|---|---|---|---|
| claude-code/claude-opus-5-5 | tools | 7/114 (6 %) | 3/6 (50 %) |

## Subset version_deadline

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | plain | 30 | 0 | 16 | [0.3433, 0.7166] | 16 | 0/90 | 0/90 | - | 97 % / 0 % / 3 % / 0 % | 0.0000 | 1.5961 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 30 | - | 16 | [0.3433, 0.7166] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | web | 30 | 0 | 4 | [0.0376, 0.3072] | 7 | 0/90 | 0/90 | - | 46 % / 51 % / 3 % / 0 % | 0.0000 | 4.1464 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 30 | - | 4 | [0.0376, 0.3072] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | tools | 30 | 0 | 3 | [0.0211, 0.2653] | 4 | 0/90 | 0/90 | 93 % | 6 % / 87 % / 8 % / 0 % | 0.0000 | 3.5089 | claude-code |
| claude-code/claude-opus-5-5 | tools: unparseable counted as wrong | 30 | - | 3 | [0.0211, 0.2653] | - | - | - | - | - | - | - | claude-code |

## Subset evaluation

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | plain | 10 | 0 | 6 | [0.2624, 0.8784] | 7 | 0/30 | 0/30 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.5770 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 10 | - | 6 | [0.2624, 0.8784] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | web | 10 | 0 | 0 | [0.0000, 0.3085] | 0 | 0/30 | 0/30 | - | 20 % / 80 % / 0 % / 0 % | 0.0000 | 1.8274 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 10 | - | 0 | [0.0000, 0.3085] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | tools | 10 | 0 | 0 | [0.0000, 0.3085] | 0 | 0/30 | 0/30 | 100 % | 0 % / 100 % / 0 % / 0 % | 0.0000 | 0.8508 | claude-code |
| claude-code/claude-opus-5-5 | tools: unparseable counted as wrong | 10 | - | 0 | [0.0000, 0.3085] | - | - | - | - | - | - | - | claude-code |

## knowable_before_omnibus = true

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | plain | 13 | 0 | 0 | [0.0000, 0.2471] | 0 | 0/39 | 0/39 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.6620 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 13 | - | 0 | [0.0000, 0.2471] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | web | 13 | 0 | 0 | [0.0000, 0.2471] | 1 | 0/39 | 0/39 | - | 79 % / 13 % / 8 % / 0 % | 0.0000 | 1.0378 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 13 | - | 0 | [0.0000, 0.2471] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | tools | 13 | 0 | 1 | [0.0019, 0.3603] | 2 | 0/39 | 0/39 | 92 % | 13 % / 69 % / 18 % / 0 % | 0.0000 | 1.3029 | claude-code |
| claude-code/claude-opus-5-5 | tools: unparseable counted as wrong | 13 | - | 1 | [0.0019, 0.3603] | - | - | - | - | - | - | - | claude-code |

## knowable_before_omnibus = false

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | plain | 27 | 0 | 22 | [0.6192, 0.9370] | 23 | 0/81 | 0/81 | - | 96 % / 0 % / 4 % / 0 % | 0.0000 | 1.5111 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 27 | - | 22 | [0.6192, 0.9370] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | web | 27 | 0 | 4 | [0.0419, 0.3373] | 6 | 0/81 | 0/81 | - | 20 % / 80 % / 0 % / 0 % | 0.0000 | 4.9359 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 27 | - | 4 | [0.0419, 0.3373] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | tools | 27 | 0 | 2 | [0.0091, 0.2429] | 2 | 0/81 | 0/81 | 96 % | 0 % / 100 % / 0 % / 0 % | 0.0000 | 3.0568 | claude-code |
| claude-code/claude-opus-5-5 | tools: unparseable counted as wrong | 27 | - | 2 | [0.0091, 0.2429] | - | - | - | - | - | - | - | claude-code |
