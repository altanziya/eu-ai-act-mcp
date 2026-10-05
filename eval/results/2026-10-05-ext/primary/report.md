# Eval report

- Cases file: eval/cases-ext.yaml
- Prompt version: eval-prompt-v2
- Scorer version: eval-scorer-v2
- Re-scored runs (on resume): 0
- Dry run (all runs mock): false
- Status: complete
- Repetitions per case: 3
- Total cost (sum of usage.cost, OpenRouter only): 0.0000 USD (cap 0 USD)
- Cost equivalent of the claude-code runs (API prices, not billed, not counted against the cap): 2.5649 USD

Backend claude-code (model ids with the prefix `claude-code/`): each run is one call of the Claude Code CLI (`claude -p`) on a subscription, not on the API. The call uses its own system prompt (`--setting-sources ""`: no CLAUDE.md, no memory, no project settings). What stays visible to the model is an identity sentence of the Agent SDK, the account e-mail address and an environment block with the execution date; the case date is given only by the system prompt. Web search (arm web) is Anthropic's own (WebSearch and WebFetch); the tools arm offers only the three project tools through a local MCP server. `cost_equiv_usd` is the API-equivalent cost reported by the CLI (`total_cost_usd`); it is not billed, is summed separately and does not count against --max-usd. The other models run through OpenRouter and are billed by `usage.cost`.

Method: a case counts as an error if more than half of its runs are wrong (one repetition: that run; three: at least 2 of 3). Clopper-Pearson intervals (exact, 95 %) are computed over cases, not runs. Unparseable answers (no JSON object, including empty answers) are not scored and do not count as wrong; with R runs per case a case is an error if more than R/2 of its runs are wrong, and it is excluded only if no run of it could be scored. The second row of each cell (sensitivity) repeats the computation with every unparseable run and API error run counted as wrong (all cases, none excluded). API error runs are listed separately. The tool-call rate is the share of runs with at least one tool call. "Version named" is the share of parsed runs whose `version` text names the Official Journal version (32024R1689), the consolidated version (02024R1689-20260727), both, or neither by an explicit identifier (versionNamed); it is descriptive and not part of correctness. The pre-registered E1 rule (go if the lower bound >= 0.05; else undecided if cases < 45 and errors >= 1; else not supported) is applied once, to the primary model in arm web on subset version_deadline (the E1 line below); no other row carries a decision.

E1 decision: undecided (claude-code/claude-opus-5-5, arm web, subset version_deadline: 2/15 cases wrong, Clopper-Pearson 95 % [0.0166, 0.4046])

## All cases

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | web | 15 | 0 | 2 | [0.0166, 0.4046] | 3 | 0/45 | 0/45 | - | 56 % / 44 % / 0 % / 0 % | 0.0000 | 1.8068 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 15 | - | 2 | [0.0166, 0.4046] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | plain | 15 | 0 | 8 | [0.2659, 0.7873] | 8 | 0/45 | 0/45 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.7581 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 15 | - | 8 | [0.2659, 0.7873] | - | - | - | - | - | - | - | claude-code |

## Arm tools: error rate by tool use

Runs, not cases: the share of scored runs that are wrong, split by whether the model called at least one tool in that run. Descriptive only: models that call tools may differ in other ways from models that do not.

| Model | Arm | Runs with >= 1 tool call: wrong/scored | Runs without a tool call: wrong/scored |
|---|---|---|---|
| (arm tools not run) | | | |

## Subset version_deadline

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | web | 15 | 0 | 2 | [0.0166, 0.4046] | 3 | 0/45 | 0/45 | - | 56 % / 44 % / 0 % / 0 % | 0.0000 | 1.8068 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 15 | - | 2 | [0.0166, 0.4046] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | plain | 15 | 0 | 8 | [0.2659, 0.7873] | 8 | 0/45 | 0/45 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.7581 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 15 | - | 8 | [0.2659, 0.7873] | - | - | - | - | - | - | - | claude-code |

## Subset evaluation

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (no runs) | | | | | | | | | | | | | |

## knowable_before_omnibus = true

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | web | 6 | 0 | 0 | [0.0000, 0.4593] | 0 | 0/18 | 0/18 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.2513 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 6 | - | 0 | [0.0000, 0.4593] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | plain | 6 | 0 | 0 | [0.0000, 0.4593] | 0 | 0/18 | 0/18 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.2694 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 6 | - | 0 | [0.0000, 0.4593] | - | - | - | - | - | - | - | claude-code |

## knowable_before_omnibus = false

| Model | Arm | Cases | Excluded cases | Errors (majority) | Clopper-Pearson 95 % | Errors (>= 1 wrong run) | Unparseable runs | API error runs | Tool-call rate | Version named: 2024 / 2026 / both / none | Cost USD | Cost-equivalent USD (subscription) | Backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-code/claude-opus-5-5 | web | 9 | 0 | 2 | [0.0281, 0.6001] | 3 | 0/27 | 0/27 | - | 26 % / 74 % / 0 % / 0 % | 0.0000 | 1.5555 | claude-code |
| claude-code/claude-opus-5-5 | web: unparseable counted as wrong | 9 | - | 2 | [0.0281, 0.6001] | - | - | - | - | - | - | - | claude-code |
| claude-code/claude-opus-5-5 | plain | 9 | 0 | 8 | [0.5175, 0.9972] | 8 | 0/27 | 0/27 | - | 100 % / 0 % / 0 % / 0 % | 0.0000 | 0.4887 | claude-code |
| claude-code/claude-opus-5-5 | plain: unparseable counted as wrong | 9 | - | 8 | [0.5175, 0.9972] | - | - | - | - | - | - | - | claude-code |
