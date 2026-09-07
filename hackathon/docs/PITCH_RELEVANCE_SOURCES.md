# Pitch relevance sources

Verification date: **2026-09-06**

This note records external reference numbers used to frame the pitch. They are
not organizer requirements, and neither number below is a market-wide estimate.

## Coding-agent concurrency proxy

**METR, February 17, 2026.** METR analyzed **5,305 Claude Code transcripts**
generated in January 2026 by **seven METR technical staff**. It defines
concurrency as the number of active agents per person and reports both main-agent
concurrency and total concurrency (main agents plus subagents). A daily average
is a time-weighted mean over periods when at least one session is active.

Appendix C reports the seven staff members' average **main-agent concurrency**
on typical active days as:

```text
2.32, 1.52, 1.40, 1.17, 1.19, 1.26, 1.05
```

The unweighted macro-average is:

```text
(2.32 + 1.52 + 1.40 + 1.17 + 1.19 + 1.26 + 1.05) / 7
= 9.91 / 7 = 1.415714... ≈ 1.42 active main agents per person
```

**Slide label:** “METR exploratory transcript analysis: ~1.42 active main
agents/person on an active day (7 technical staff, Jan 2026).”

**How to describe it:** This is the closest primary-source proxy found for the
number of coding-agent tasks a developer handles simultaneously. It measures
active main-agent sessions, not independently verified human tasks; one main
agent may launch subagents, and a session can be idle or cover several subtasks.
The sample is seven METR staff in one month, selected for a technical internal
workflow. Do not present 1.42 as a market average or as a causal productivity
effect. The source itself reports that Staff A averaged 2.32 main agents and
that the others ranged from 1.05 to 1.52; total-agent concurrency is a separate
measure (main plus subagents).

Source: [METR, “Analyzing coding agent transcripts to upper bound productivity gains from AI agents”](https://evals.alignment.org/notes/2026-02-17-exploratory-transcript-analysis-for-estimating-time-savings-from-coding-agents/)
(published 2026-02-17; see methodology lines defining concurrency and Appendix C).

## Manual permission approval rate

**Anthropic, August 7, 2026.** Anthropic reports that Claude Code users approve
**97% of permission prompts**. This is an approval *rate*, not approvals per
hour; the reviewed primary publications did not provide a reliable hourly mean
for permission prompts. The same source says prompts can require developers to
make “dozens or hundreds” of security decisions per day, but that wording is a
qualitative scale and must not be converted into an hourly average.

**Slide label:** “Claude Code users approve 97% of permission prompts
(Anthropic, Aug 2026; rate, not approvals/hour).”

Source: [Anthropic, “Auto mode is now the default in Claude Code”](https://claude.com/blog/auto-mode-default-in-claude-code)
(published 2026-08-07; comparison with manual review).

## Interpretation boundary

The two figures answer different questions: 97% describes what users do when a
permission prompt appears; ~1.42 describes concurrent active main-agent
sessions for a small internal technical sample. Neither supports a general
claim about all developers, all coding agents, or tasks completed per day.

## Primary-source comparison: risk check before automatic approval

Verification date: **2026-09-06**. Here “risk check” means that an independent
or model-based decision evaluates a proposed action before automatic approval.
A blanket `--auto`, YOLO, or allow rule is not counted as a risk check.

| System | Slide cell: “проверка риска перед исполнением” | Primary source and boundary |
|---|---|---|
| **Kilo Code, pinned baseline** | **Нет**: pinned upstream `v7.5.8@a6ff015f52afa58c34482a35c5f1c1b50c72368e` resolves requests with ordered `allow`/`ask`/`deny` rules and hard rules; automatic approval follows a resolved `allow` rule. The inspected permission path contains no risk-aware classifier, reviewer, or model call. | [Pinned permission implementation](https://github.com/Kilo-Org/kilocode/tree/a6ff015f52afa58c34482a35c5f1c1b50c72368e/packages/opencode/src/permission). This is historical-baseline evidence, not a claim about every current Kilo release. The checkout has `kilo run --auto`, but that is blanket permission automation and is excluded from this column. |
| **Codex** | **Да, для eligible boundary-crossing approvals**: `approvals_reviewer = "auto_review"` routes an approval request to a separate reviewer agent, which decides whether the action runs and returns a rationale. | [Official Auto-review docs](https://learn.chatgpt.com/docs/sandboxing/auto-review). It reviews requests that would otherwise require approval; routine actions already allowed inside the sandbox are not reviewed, and `approval_policy = "never"` creates no review request. |
| **Qwen Code** | **Да, в Auto mode**: an LLM classifier evaluates shell commands, network calls, and out-of-workspace edits, auto-approving judged-safe actions and blocking risky ones; hard deny rules remain above the classifier. | [Official Auto mode docs](https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/auto-mode.md) and [approval-mode docs](https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/approval-mode.md). Read-only and in-workspace operations may bypass the classifier for speed, so this is not a claim that every tool call is classified. |

**Interpretation boundary.** Kilo’s `--auto` and Qwen’s `YOLO` are automatic
approval modes, not evidence of risk assessment. Codex Auto-review and Qwen
Auto are the entries with explicit primary-source evidence of a reviewer or
classifier decision. The Kilo result is qualified to the pinned baseline.

## Vendor/context references for the comparison slide

**KiloBench, checked 2026-09-06.** Kilo's vendor page reports **79.3%** for
Kilo + GPT-6 Astra on **Terminal-Bench 2.0**, **89 tasks**:
[kilo.ai/kilobench](https://kilo.ai/kilobench). This is vendor self-evaluation
for the named model/version and benchmark setup. It is contextual evidence, not
our controlled result and not evidence that the engine beats Qwen Code.

**OpenRouter, checked 2026-09-06.** Kilo Code appears as **#1 by IDE usage** in
the [OpenRouter app directory](https://openrouter.ai/apps/kilo-code). This is a
usage/context signal, not a quality measurement and not a market-wide adoption
estimate. It is suitable for research context or appendix, not as a deck claim
about safety or benchmark performance.
