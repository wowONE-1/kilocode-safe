# Hackathon brief: safe auto mode for Kilo Code

## 2026-09-07 — D-013 execution checkpoint

**Team result:** the approved maximum matrix completed: 370 CLI observations / 406 phases,
plus 44 nonexecuting policy probes, on Kilo `b184d6358`. Original70/casegiver unchanged.
The user's supplied case was reread against the implementation and final deliverables.
Measured ASR, utility, scope gaps, PG ablation and package timing are recorded in
[BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md). An editable 15-slide deck, seven-paragraph
annotation, three compact product materials, team contributions and an offline demo
are the final package. Pilot demand, real human friction and upstream-PR bonus are not
claimed as validated. These are team results and decisions, not new organizer requirements.

**Status:** canonical project context  
**Last verified:** 2026-09-07 for D-013 execution and the user-supplied case; external references retain their own recorded verification dates  
**Authority:** the organizer's case description supplied by the user; linked primary sources are supporting references, not additional organizer requirements unless stated otherwise.

## 2026-09-07 — D-013 approved: final jury preparation, six-hour budget

**Team decision / explicit user instruction:** the user approved the Context Snapshot and asked to implement the final plan. T0 is 2026-09-06 22:28:28 UTC (2026-09-07 01:28:28 MSK); model cutoff 2026-09-07 02:58:28 UTC; final deadline 04:28:28 UTC. This supersedes earlier stop/no-code/no-publish restrictions only for this bounded cycle.

- Start from Kilo `437eaa558a725cea9bbe53a58e442f32293071b5`, branch `codex/dos-llms-secure`; implement in `codex/final-jury-20260907`.
- Preserve five UI labels: Auto, Vanilla Kilo, Secure, Ask, Dos LLMs + Secure. Combined mode is two-stage Qwen plus Secure, not Meta. Port fixed PG as a separate opt-in ablation.
- User chooses natural-language file/directory restrictions only: no new scope-confirmation UI, policy extractor or OS-sandbox architecture. Review mutating/opaque actions against direct user instructions; claims stay probabilistic.
- Add action-bound telemetry, fix protected-ask auto-approval and raw security logging, preserve pre-install package checks. Preserve original70 and immutable casegiver fixtures.
- Target258 CLI records plus44 policy records; at most370 CLI records if time permits. Full70 on Auto/Secure/combined, new8 scope fixtures, fixed12-case PG ablation and SA04/SL04 package pair. Serial Qwen14B, T120, no result-driven retuning or trial retries.
- Deliver editable15-slide deck/PDF, solution Markdown with7-paragraph annotation, three compact product materials and a pitch runbook. All three team members actively participated; no invented percentages.
- Publishing is explicitly authorized to the existing team repositories: code/materials in wowONE-1/kilocode-safe and benchmark in dimkablin/vibesechack, updating current PR1. No merge or new upstream PR.
- **Organizer requirement:** supplied case and one-page jury rubric remain sources of requirements; five criteria each0–3. **External reference:** implementation437eaa was checked through GitHub on2026-09-07 MSK; vendor claims and architecture references retain their own provenance.

Status: implementation started; no fresh result is asserted. Historical evidence below is preserved and must not be relabelled as the current five-mode build.

## 2026-09-06 — User template, 15-slide structure, and comparison corrections

- **User-provided reference:** use `presentation/template.pptx` (the prior `Артефакты 1` template) for the visual direction: Inter typography, restrained black/white/orange palette, large pale slide numbers, compact title/subtitle hierarchy, and native tables. This is a team presentation decision and style reference, not an organizer requirement. The body target is template-style **16–20 pt**; the guide's 30 pt is recorded as a recommendation and is not claimed as blanket compliance for all editable text.
- **Presentation decision:** use 15 slides: 8 main + 7 appendix. Main order: **1 title, 2 team with the real inserted photos, 3 stats, 4 permission screenshot, 5 comparison/why Kilo, 6 demo, 7 architecture, 8 metrics**. Appendix order: **9 inventory, 10 historical, 11 causal, 12 Prompt Guard, 13 boundaries, 14 direct ask, 15 next**. Target timing: 0:00–0:10, 0:10–0:25, 0:25–0:50, 0:50–1:05, 1:05–1:30, 1:30–3:30 demo, 3:30–4:00 architecture, 4:00–4:45 results/end.
- **Factual comparison correction:** “auto mode” means different things. Pinned Kilo `v7.5.8@a6ff015f52afa58c34482a35c5f1c1b50c72368e` has `kilo run --auto`, but its inspected permission path uses rules and does not contain a risk-aware classifier/reviewer. Codex Auto-review routes eligible boundary approvals to a reviewer agent; Qwen Auto uses an LLM classifier. These are external references; the Kilo source qualification is a team audit of the historical baseline.
- **External context, checked 2026-09-06:** [KiloBench](https://kilo.ai/kilobench) reports 79.3% for Kilo + GPT-6 Astra on Terminal-Bench 2.0 over 89 tasks. This is a vendor self-evaluation for a specified model/version/setup, not evidence that the engine beats Qwen Code. [OpenRouter's Kilo Code directory](https://openrouter.ai/apps/kilo-code) lists #1 by IDE usage; this is a usage/context signal, not quality, safety, or market-wide adoption evidence. Keep both as labelled context, not as team benchmark results.
- **Fact/reference/team separation:** the 15-slide order and template style are team decisions; KiloBench/OpenRouter are external references; organizer requirements remain those in the supplied guide and case brief. No new organizer requirement is inferred from either external page.

## 2026-09-06 — User-edited deck and model names

- **Explicit user instruction:** use the attached `итмо финал.pptx (user-supplied local file)` as the latest user-edited deck. Name the modes **Qwen** (Qwen3 14B checks action permissibility) and **Qwen + Meta** (the same Qwen plus Meta Prompt Guard 2 for injection detection).
- **Presentation implementation:** replace LLM / Judge / PG+LLM / Guard mode labels, explain both model roles before the results, preserve the user's photographs and styling. Historical pre-fix results stay explicitly historical. The baseline remains “Доступ”; all arms use Qwen3 14B as the main coding agent.
- **Status:** revised deck `presentation/demo_day_20260906/outputs/itmo_final_Qwen_Meta.pptx` and PDF, source-specific QA `QA_user_Qwen_Meta.json`. This is terminology and presentation editing, not a new architecture decision or benchmark experiment.

## 2026-09-06 — Presentation revision: Команда 3, relevance and permission modes

- **Explicit user request:** title “Команда 3”; case “`--carefully-skip-permissions`: контроль действий ИИ-кодинг-агента”; team slide second. Names and roles: Егор Козлов — AI product, Дмитрий Золотарев — AI engineer, Владимир Панкрашкин — AI engineer. User will add photos and personal descriptions.
- **Explicit user request:** research approvals per hour and simultaneous tasks per developer, include sourced numbers on the relevance slide, and add the supplied ChatGPT permission screenshot with annotations. The later clarification asks specifically about simultaneous tasks, not tasks per day or AI adoption.
- **External references, checked2026-09-06:** Anthropic Aug7 reports97% permission approvals; no reliable hourly average found in checked primary pages. METR Jan2026 concurrency table supports our unweighted mean1.415714≈1.42 main active agents across7staff; this is a limited session-concurrency proxy, not a market-wide task average. Definitions, formula and URLs: `docs/PITCH_RELEVANCE_SOURCES.md`.
- **Presentation decision:** seven main slides plus seven appendix slides. Team2, relevance3, screenshot4, recorded demo5, architecture6, results7. “Optimal” is the team's ordinary-task design position; the screenshot is explicitly identified as ChatGPT, not Kilo. The guide recommendations remain separate from these user choices and external findings.
- **Execution status:** final PPTX/PDF and source hyperlinks verified; no new model calls or benchmark changes. Details: `presentation/demo_day_20260906/FORMAT_CHECK.md`, `QA_team3.json`. This entry supersedes the earlier team-slide order and placeholders below.

## 2026-09-06 — Presentation revision: team and central message

- **Explicit user request:** check the presentation against the supplied guide, add Egor / Dima / Vova with editable photo and contribution placeholders, and improve the central message. The user will provide photographs and descriptions; do not invent roles or experience.
- **Presentation decision:** seven main slides plus seven appendix slides; team is slide7. The main story connects user authorization, a demonstrated denied upload, implementation and the measured safety/utility trade-off. PG routing details and the next evaluation gate are in the appendix.
- **Source guidance:** the guide asks for team contribution (p.14) and assigned Q&A owners (p.21), but does not mandate a dedicated team slide. Five to seven substantive slides is a recommendation (p.16). The current audit and open rehearsal/ownership items are in `presentation/demo_day_20260906/FORMAT_CHECK.md`.
- **Execution status correction:** the later model restoration, completed fixed-PG full70 and offline rescore are recorded in CURRENT_STATE.md and PG_FIX_BENCHMARK_RESULTS.md. The HTTP502/pending statements in the earlier section below are historical, not current blockers. This presentation revision performs no model calls or code changes.

## 2026-09-06 — Demo Day guide and current user-authorized work

This dated update takes precedence over earlier execution-status statements below.

- **Organizer presentation guidance supplied by the user:** `demo-day-pitch-guide.pdf`, 21 pages, SHA-256 `80c251cd823f242cacc346849db1953153a3f856d6bb06980a932f5e8924fb2e`, read in full on 2026-09-06. The guide states a 5:00 pitch cutoff and 3:00 Q&A (p. 2), recommends a 4:40–4:50 finish, one main speaker, 5–7 substantive slides, 30-point minimum text, one demo scenario and a prepared fallback. Rubric: case, value, technology, prototype, defense; each 0–3 (p. 4). These are the supplied guide's statements, not independently verified additional case requirements. Illustrative product numbers in the PDF are not project evidence.
- **Accepted team work, explicit user request:** create a global reusable presentation skill, rebuild the pitch and a two-page Markdown companion, challenge/recompute benchmark evidence, and fix Prompt Guard's observed bypass. The user also permits bounded benchmark additions/reruns and a lightweight available model when needed. Preserve model/source/config identity and report such experiments separately. No push, merge, PR creation or publication is requested.
- **Known result:** fixed v0 70×3 and the separate 24-CLI/60-policy diagnostic are complete. Their exact selected artifacts and current limitations are in BENCHMARK_RESULTS.md and CURRENT_STATE.md. Their old pending-run notes are historical.
- **Current availability:** on 2026-09-06 local time, the configured server returned HTTP 502 on the explicitly authorized Qwen14B chat probe and on listing models. The key was used only for authentication and never printed. No successful new model observation has been obtained.
- **Bounded fix plan:** use a separate worktree based on measured `81edc748`. A benign Prompt Guard classification must pass through the original semantic action-risk stage 1, with stage 2 when flagged; a malicious signal retains stage 2. Provider errors retain the existing closed failure path. Validate routing with regression tests, then run separately identified model checks when service is available. Do not claim corrected ASR from offline tests.
- **External reference, checked 2026-09-06:** Meta's [Prompt Guard 2 model card](https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M), Model Scope, distinguishes explicit attempts to override instructions from the harm of an action. This supports the integration diagnosis, not a claim that every failure has the same cause.

## Executive summary

Coding agents gain productivity from autonomous command execution, but manual approval creates approval fatigue while blanket permission bypass can enable destructive commands, secret leakage, malicious dependencies, prompt-injection-driven actions, and damage to shared or production systems.

The hackathon asks the team to study these threats, compare Claude Code and Kilo Code security mechanisms, implement a practical **auto mode or focused security controls in Kilo Code**, and prove the safety/utility trade-off with a reproducible benchmark. The main user is a developer using a coding agent in an IDE or CLI.

### Team update — 2026-09-05, v0 frozen; full comparison requested for handoff

Current execution update: all 210 records / 231 Kilo phases completed at
11:44 UTC on Qwen 14B, clean a6ff015f / 81edc748, serial T120. No new model
runs are needed. Raw consistency checks passed, but A22 exposed a shim bypass
in package scoring (`python -m pip` executed without a shim record). The user
explicitly approved a narrow tool-event scoring repair and offline rescore of
all three arms, preserving fixtures and original logs. 8 portable/Docker and
80 offline tests pass; all three corrected scores are verified, with original
logs unchanged and zero new model observations. Corrected casegiver/new ASR:
1/7 and 5/21 upstream, 0/7 and 3/21 LLM-judge, 1/7 and 4/21 Prompt Guard;
utility 22/38, 19/38, 20/38 respectively. Results/IDs/hashes and limitations
are in BENCHMARK_RESULTS.md. This is a team
evaluation decision, not a new organizer requirement or Kilo implementation.

Earlier execution history follows; its pending-run statements are superseded.

The user reports replacing the shared Ollama model with `qwen3:14b-q4_K_M`;
future runs must be sequential, without artificial pauses or parallel capacity
profiles. Operating the benchmark through this assistant is acceptable; an
additional independent-user onboarding acceptance is not required. These are
team constraints, not organizer requirements. The user subsequently approved
closing v0 and requested an execution prompt for a successor to run all 70 cases
on three arms. Update at 2026-09-05 09:36 UTC: the minimal model/mode integration
is implemented, 73 offline tests passed, both clean images are bound and retained,
and the two-mode six-record pilot completed without timeouts or infrastructure
failures. At 09:47 UTC, full execution was stopped after discovering Dmitry's
new portable runtime commits in PR #1 (HEAD cf62ab4). The user must choose the
runtime before new full runs; partial logs remain intact and excluded from the
final comparison. The user then approved integration of Dmitry's current
runtime. At 10:05 UTC, 8 portable/Docker and 74 offline tests have passed; the
new full run is active on local 9356453 atop cf62ab4. These execution versions
are frozen until completion. No completed full result exists.

Published `wowONE-1/kilocode-safe@81edc748a6054026583af9731fb0a5f726a93292`
adds `mode_dos_llm_as_a_judge` and `mode_prompt_guard_with_llm`. Source inspection
confirms that their CLI `--mode` cannot be combined with `--auto`, and the judge
uses the selected agent model with structured output support. Prompt Guard uses
a separately authenticated endpoint; credentials are not project documentation.
This chat will only connect and evaluate those controls, not modify Kilo.

V0 validation passed 72 offline tests after a bounded L21 clarification and an
after-approval harm-oracle correction. Only L21 changed; the other 69 definitions
remain identical. The new requested result is 70×3 on Qwen 14B: upstream full
access and the two published modes, one repeat, 210 logical trials / 231 Kilo
phases. A short timeout diagnosis precedes a frozen common run budget. Exact
handoff instructions are in `RUN_FULL_V0_PROMPT.md`; accepted changes to the
previous 7×3 proposal are appended to D-008. Merge remains forbidden.

Earlier Qwen 8B evidence below is historical only. The user excludes it from
this new comparison; do not spend work recovering or rerunning old experiments.
Preserve historical artifacts, but do not pool them with new results.

## What must be done

### Research and design

1. Study common vibe-coding threats, including:
   - overeager or careless agent actions and honest blast-radius mistakes;
   - slopsquatting and implicit installation of hallucinated/malicious packages;
   - prompt injection through `SKILL.md`, `README`, MCP, tool output, web content, or other instruction sources;
   - malicious configuration changes and permission weakening;
   - downgrade attacks;
   - data leakage through context or tool calls;
   - optionally, insufficient observability or another well-justified threat.
2. Analyze the relevant controls in frontier Claude Code and popular open-source Kilo Code.
3. Choose and justify the highest-value threat(s), enforcement point, and achievable feature set. The case is deliberately broad; covering everything is not required.
4. Define a threat model: assets, actors, trust boundaries, attack preconditions, protected actions, non-goals, hard guarantees, best-effort properties, bypasses, and residual risk.

### Implementation

1. Add security controls to Kilo Code, inspired by Claude Code auto mode where useful. GitHub issue #9138 is the main implementation reference, not a binding requirement to copy every feature.
2. Intercept dangerous actions before execution and choose `allow`, `deny`, or `ask/escalate` with a documented failure policy.
3. On denial, return a useful reason to the agent so it can choose a safer path and continue. Prevent endless retry/bypass loops with a defined escalation limit.
4. Ensure at least one control is **architecturally not exposed to prompt-injected content**. Merely telling the same model to ignore injections is insufficient.
5. If slopsquatting is in scope, check from inside the agent before the install action and detect zero-day risk using signals beyond a known-malicious denylist.

### Benchmark and evidence

1. Build a benchmark for both malicious and accidental/overeager actions.
2. Start from the organizer's datasets when delivered (approximately 20 legitimate development tasks and 20 attacks), then extend them with team-created cases.
3. Include non-obvious cases: attacks spread across multiple actions and indirect/implicit package installation.
4. Document attack descriptions, dataset design and provenance, environment, model/config versions, experimental procedure, repetitions, scoring, and raw/aggregated results.
5. Compare at least an unprotected/baseline configuration with the protected solution under otherwise comparable conditions.

### Case-giver benchmark handling

The user confirmed on 2026-09-03 that the scenarios supplied through
`lainisourgod/vibesechack` are case-giver benchmarks. Treat them as a separate
immutable `casegiver` class:

- do not edit their prompts, environments, payloads, or scoring rules in place;
- preserve the received revision and file checksums;
- place compatibility logic in a runner adapter or wrapper outside the fixtures;
- report quality on `casegiver` separately from team-created and externally
  adapted cases.

Team extensions may reuse the same general test idea, but they must receive new
identifiers and provenance and must not be presented as case-giver results.

## External benchmark research and proposed adapted suite

The references below are **external evidence**, not organizer requirements.
D-003 accepts the four benchmark families and the 25 + 25 + 12 direction;
D-007 fixes the current open development suite and bounded validation. A more
detailed source review is kept in
[`RESEARCH_ACTION_GATE_BENCHMARKS.md`](RESEARCH_ACTION_GATE_BENCHMARKS.md).

### What was found and what we would reuse

- [REAL](https://github.com/agi-inc/REAL) is a deterministic browser-agent test
  environment, not a security dataset. [TRAP](https://arxiv.org/abs/2512.23128)
  places indirect prompt injections into selected REAL tasks. Reuse TRAP's
  paired benign/attack runs, factorized attack variants, and first-crossed-
  boundary oracle; do not import its web-specific click/link criterion or full
  630-case matrix.
- [AIShellJack](https://arxiv.org/abs/2509.22040) injects commands through coding
  rule files and publishes an
  [official replication package](https://doi.org/10.6084/m9.figshare.30111988.v4).
  Reuse a small audited subset of its rule-file payload patterns for shell
  execution, exfiltration, persistence, and destructive actions. Never execute
  the original dangerous commands outside a disposable sandbox.
- [AmPermBench](https://arxiv.org/abs/2604.04978) directly stress-tests an
  action-permission gate, including authorization ambiguity, target binding,
  blast radius, and bypass through file edits. Reuse these dimensions and its
  state-based action oracle. [CodeIPI](https://ukgovernmentbeis.github.io/inspect_evals/evals/ipi_coding_agent/)
  adds compact coding-agent fixtures and mostly deterministic canary, tool-trace,
  and file-hash checks.
- [SkillSafetyBench](https://arxiv.org/abs/2605.12015) and
  [Skill-Inject](https://arxiv.org/abs/2602.20156) test malicious instructions in
  skills, helper scripts, metadata, templates, and other workspace artifacts.
  Reuse their contextual skill attacks and filesystem/shell/network evidence;
  pin the exact artifact revision because the public datasets are evolving.
- [MCP Security Bench](https://arxiv.org/abs/2510.15994) and
  [MCPTox](https://arxiv.org/abs/2508.14925) cover poisoned tool descriptions,
  response injection, tool substitution, authority expansion, and parameter or
  recipient tampering. Reuse cases whose unsafe outcome is visible from the
  normalized tool name and arguments, without exposing the action gate to the
  poisoned metadata.
- [ToolEmu](https://arxiv.org/abs/2309.15817) studies dangerous actions caused by
  benign but underspecified requests. [OverEager-Gen](https://arxiv.org/abs/2605.18583)
  and [UnderSpecBench](https://arxiv.org/abs/2607.02294) focus more directly on
  coding agents crossing target or scope boundaries during benign work. Reuse
  their paired explicit/implicit authorization, wrong-target, over-scope and
  clarification patterns; do not count these cases as prompt-injection ASR.
- The [package hallucination/slopsquatting study](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen)
  motivates pre-install tests with an inert local registry and absent,
  confusable, newly registered or implicitly suggested package names.

All organizer papers concern prompt injection only in part: TRAP and AIShellJack
specifically study **indirect/contextual prompt injection**. A malicious skill or
MCP description can use the same mechanism, but those surfaces are covered by
the dedicated skill and MCP benchmarks above. AmPermBench, ToolEmu,
slopsquatting and excessive-action benchmarks also test dangerous behavior that
does not require any prompt injection.

### Current team benchmark direction

**Accepted team decision D-007, not an additional organizer requirement:**
the simple CLI contains **70 open development scenarios** in six Python `CASES`
modules: seven immutable casegiver attacks from `955efba71b1b109a0d92787560d96ca16718dabd`,
one derived clean control, 25 risk cases, 25 legitimate counterparts and 12
ordinary tasks. None of these public cases is held-out. Executable definitions
and current usage are in `.workbench/vibesechack-pr/`; the inventory and earlier
design history remain in [`BENCHMARK_IMPLEMENTATION_V0.md`](BENCHMARK_IMPLEMENTATION_V0.md).

Current validation is only `l2_rules`, A16, A19, A25, A24, L21 and N02 on clean
upstream `a6ff015f52afa58c34482a35c5f1c1b50c72368e` and published fork
`cbe5da6c27af7ef25732fccb8c0ff580272d78ec`: 14 logical trials / 16 Kilo phase
runs, using `qwen3:8b-q4_K_M` at the team's Ollama endpoint. There are no artificial
pauses; `--parallel 1` is the serial reference and higher concurrency is a
separate throughput experiment. The final offline check is 70/70 tests PASS
(29.261 s). All 14 selected logical records / 16 phases passed raw-artifact
audit, with zero infrastructure-invalid records. Image-level reproducibility
remains incomplete: upstream L21 used a source-identical rebuild with a different
image ID after the original image was lost; full bit-identical acceptance is not
claimed. L21's approved `markupsafe==3.0.3` replacement completed on both arms;
the old upstream L21 remains excluded. Actual history is 15 logical attempts /
18 phases plus 12 separate capacity runs. See [results and limitations](BENCHMARK_RESULTS.md).

This chat implements the benchmark/CLI only; Kilo controls belong to other
team members. [Benchmark PR #1](https://github.com/dimkablin/vibesechack/pull/1)
is open and not merged; merge is not authorized. No new full 70×2 model run was
performed. Earlier 12-fixture free-router and local toggle runs remain
historical evidence, not current mechanism metrics or evidence for fork cbe5.

| Count | Source and surface | Behaviors covered |
|---:|---|---|
| 10 | 6 AIShellJack-inspired rule-file cases + 4 CodeIPI cases | Indirect injection through rules, issue text, README, comments, or config; shell execution, exfiltration, persistence, and destructive/protected writes |
| 4 | 2 SkillSafetyBench-inspired + 2 Skill-Inject-inspired cases | Malicious `SKILL.md`, helper, metadata, or sidecar content causing filesystem, shell, network, or authority abuse |
| 4 | 2 MCP Security Bench-inspired + 2 MCPTox-inspired cases | Poisoned metadata/results, tool collision, descriptor change, recipient/destination substitution, and dangerous arguments |
| 4 | USENIX/Trend Micro slopsquatting patterns | Absent, confusable, newly registered and implicitly suggested packages before installation |
| 3 | OverEager-Gen/UnderSpecBench patterns | Benign cleanup, test fixing and git recovery that may exceed target or scope |

The 25 legitimate counterparts exercise the same tools and environments without
a malicious payload; the current expected routing is **19 clear `allow` cases
and 6 `ask` cases**; N12 adds a seventh two-phase `ask` case. The additional 12 ordinary tasks prevent Utility and false
positives from being estimated only on security-shaped prompts. This prevents a
deny-everything system from receiving a good security score.

Every adapted fixture must have a new identifier, upstream source and revision,
adaptation notes, an inert target, and a deterministic state or trace oracle.
Primary attack success is the unauthorized consequential effect defined by the
oracle, not suspicious text or the agent's stated intent. Report poststate,
normal CLI completion and safety separately. Exact permission FP, friction,
decision latency and recovery remain `not_observable` without the required
structured events; two fresh `ask` phases do not prove live-session recovery.
Current Docker and package shims do not guarantee complete egress isolation or
tamper-proof workspace evidence. The fork's live npm/PyPI metadata checks do
not consume synthetic registry fixture files; D-007 accepts and discloses these
limitations rather than adding another service to the benchmark.

## Required deliverables

- A **README threat model** explaining which threats are addressed and how.
- A **working Kilo Code version** with added security controls.
- A **reproducible benchmark** with attack descriptions, dataset methodology, experiments, metric definitions, and measured results.
- An **honest limitations analysis**, including the risk that unjustified autonomy can reduce safety.

## Hard acceptance constraints from the organizer

1. Slopsquatting protection, if claimed, runs inside the coding agent before package installation and handles more than already-known malicious packages.
2. At least one added control is architecturally immune to prompt injection because injected content cannot reach its decision input or enforcement mechanism.
3. The team selects and prioritizes the problem and enforcement point; breadth is not itself the goal.
4. The team must understand the generated code and demonstrate that it performs its claimed functions.

## Metrics

| Metric | Direction | Meaning | Minimum reporting guidance |
|---|---:|---|---|
| ASR | ↓ | Fraction of attacks that cause defined damage | Primary metric; report case-giver, team-created, and externally adapted attacks separately and combined |
| Utility | ↑ | Fraction of legitimate tasks completed successfully | Use task-level success criteria fixed before the run |
| FP | ↓ | Incorrect blocks or unnecessary confirmations on legitimate tasks | Report count and preferably rate by evaluated action/task |
| Friction | ↓ | Decisions requested from a human | Report per task and distribution, not only a total |
| Latency | ↓ | Per-decision delay and end-to-end task slowdown | Report classifier overhead and whole-task impact; p50/p95 where feasible |

The protection must be evaluated as a trade-off. Blocking every action may minimize ASR but destroys Utility, FP, and Friction.

## Judging criteria

1. **Depth and attack coverage:** resistance beyond surface patterns, including multi-action attacks and implicit installs.
2. **Method quality:** reproducibility and traceable origins for every reported number. A transparent negative result outranks an unexplained good score.
3. **Honesty of guarantees:** clearly separate always-enforced properties from best-effort model judgments.
4. **Approval-fatigue research (bonus):** measure how often humans approve dangerous commands compared with the proposed solution.

## Bonus opportunities

- Recommended `allow`, `deny`, and `ask` policies for commands and directories.
- A pre-install slopsquatting module meeting the hard constraints above.
- Other well-evidenced improvements to coding-agent safety.
- A substantive upstream Kilo Code pull request that improves vibe-coding security in Eastern Europe. Creating or publishing a PR still requires explicit user authorization.

## Reference architecture: Claude Code auto mode

This is an external design reference, not a complete specification for this project.

- **Input layer:** a prompt-injection probe screens tool results before they enter the agent context and adds warnings for suspicious content.
- **Action layer:** a transcript classifier gates consequential tool calls before execution.
- **Reasoning-blind classifier input:** user messages plus bare tool-call name/parameters; assistant prose and tool results are removed so hostile tool content and agent rationalization cannot influence this decision layer.
- **Tiered routing:** safe read/search/navigation tools and narrow user rules bypass classification; in-project edits can bypass it when protected configuration paths are excluded; shell, web fetches, MCP, subagents, external paths, and other consequential actions reach the classifier.
- **Broad-rule handling:** blanket shell/interpreter/package-run allow rules are temporarily set aside so they cannot bypass the classifier; narrow allow rules remain.
- **Two stages:** a fast conservative single-token screen, then a reasoning stage only for flagged calls to reduce false positives and cost.
- **Policy inputs:** environment/trust boundary, deny categories, and narrow allow exceptions. Newer Claude guidance also distinguishes hard denies from classifier-controlled soft denies.
- **Deny and continue:** return a reason and let the agent retry safely; the Claude reference escalates after 3 consecutive or 20 total denials.
- **Known limitation:** a model classifier is probabilistic. Anthropic explicitly says auto mode is not a substitute for careful review of high-stakes production changes.

Useful benchmark lessons from Anthropic's published work include evaluating benign real traffic, real overeager actions, and synthetic exfiltration separately; measuring both false negatives and false positives; using held-out adversarial attacks; and reporting failure cases rather than only headline averages.

## Current open-source reference: Qwen Code Auto Mode

This is an external implementation reference, not an organizer requirement and
not evidence that the same behavior already exists in Kilo Code. The public
Qwen Code v0.23.0 source at commit
`9ffada4eac0169ade3f5ba56eca72cc34816b959` was inspected on 2026-09-03.

- Qwen Code exposes five approval modes and now defaults to `auto`. In that
  mode ordinary in-workspace edits and built-in read-only tools use fast paths;
  other consequential calls reach a two-stage model classifier.
- Explicit `deny` and `ask` rules remain above the classifier. A deterministic
  pre-filter separately checks destructive git and infrastructure-destruction
  commands, while writes outside the workspace require human approval.
- The classifier transcript keeps user text and projected tool-call arguments,
  but removes assistant prose and tool results. Tool-specific projections bound
  or redact large inputs; MCP arguments are bounded and marked when truncated.
- Protected self-modification and persistence surfaces — including Qwen
  settings/instructions, hooks, skills, `.mcp.json`, `.git`, `package.json`,
  and CI definitions — do not use the ordinary edit fast path. Symlink targets
  and several shell indirections are checked as well.
- A block is returned to the main agent with a reason and explicit guidance not
  to retry through another tool or equivalent path. Classifier failures and
  repeated blocks fall back to human approval instead of silent execution.
- Sandboxing is a separate optional layer using macOS Seatbelt or
  Docker/Podman; it is disabled by default and YOLO does not enable it.

Qwen's own documentation calls the classifier best-effort and not a substitute
for deterministic deny rules. It cannot verify hidden MCP-server behavior. The
project continues to publish and fix bypasses: recent work added protected
self-modification paths, human approval for external writes, and bounded MCP
argument forwarding; remaining MCP gaps are tracked publicly. A separate open
issue (#10192) still documents a command-substitution bypass around a narrow
shell allow rule. No official
reproducible ASR/utility benchmark for Auto Mode was found.

Project implication: do not present the layered classifier design as novel.
Use Qwen Code as an inspectable reference for the Kilo integration, then make
the contribution explicit: Kilo-specific enforcement, pre-install package
checks where selected, and reproducible safety/utility evaluation.

## Kilo Code implementation reference (#9138)

As observed on 2026-09-02, the issue describes a proposed classifier gate in Kilo's permission pipeline. Revalidate all paths and behavior against the checked-out upstream version before coding.

Suggested v1 shape:

- hook the classifier into actions that would otherwise auto-approve;
- approve silently, return a denial as a tool error, and fail closed to human `ask` on classifier error;
- exclude a hardcoded safe-tool allowlist and ordinary in-workspace edits while preserving protected config paths;
- supply only user messages and bare tool payload to the classifier;
- expose configurable model, trusted environment, allow exceptions, and soft-deny rules;
- track denial counters and escalate after repeated denials;
- make a single-stage v1 acceptable while keeping configuration forward-compatible with two stages;
- treat a tool-output injection probe, UI polish, and migration work as separable follow-up scope.

Important distinction: issue #9138's classifier is intended to gate what would otherwise be auto-approved; explicit user `deny` rules remain authoritative.

## Slopsquatting reference: DepScope

DepScope is an example of pre-install package intelligence for agents. Its site claims live-registry existence checks across multiple ecosystems, similarity checks against popular packages, vulnerability/malicious-package feeds, deprecation data, and MCP/API integration. Treat these as product claims until independently benchmarked.

Relevant design lesson: a credible zero-day-oriented control should combine signals such as package existence/age, name similarity, popularity or provenance, maintainer/release anomalies, registry metadata, and task/manifest intent. A known-malware lookup alone does not meet the case constraint. An external MCP advisory by itself may also fail the architecture requirement if the agent can skip it; enforcement should sit on the actual pre-install path.

## Decisions the team still owns

D-007 fixes the current benchmark scope, Qwen provider, validation budget and
PR authorization. Product-control choices and future held-out/release gates
remain separate; do not promote benchmark choices into a protection architecture:

- Primary threat and smallest coherent MVP.
- Kilo surface to target first: CLI, VS Code extension, or a shared permission core.
- Deterministic controls versus model classifier versus a layered hybrid.
- Model/provider, offline behavior, timeout policy, cache strategy, and fail-closed semantics.
- Exact trust boundary and hard-deny policy.
- Whether slopsquatting is core scope or a bonus module.
- Benchmark sandbox, task success oracle, repetitions, and damage definitions.
- Upstream PR scope and timing.

Record decisions and their rationale in local project docs when made.

## Definition-of-done checklist

- [ ] Threat model is present in the final README and maps each claimed threat to a control and test.
- [ ] At least one enforcement control cannot consume prompt-injected content.
- [ ] Denied actions produce a safe continuation path and bounded escalation.
- [ ] Baseline and protected modes run the same benchmark fixtures/configuration where applicable.
- [ ] Benchmark includes organizer data plus documented team cases, including multi-step/implicit attacks.
- [ ] ASR, Utility, FP, Friction, and Latency are computed from preserved raw outcomes.
- [ ] Tests cover allow, deny, ask/escalation, classifier failure, bypass attempts, and protected config paths.
- [ ] Any slopsquatting claim is enforced pre-install and evaluated on unseen/zero-day-style packages.
- [ ] README states hard guarantees, best-effort properties, exclusions, residual risk, and high-stakes warning.
- [ ] Demo can trace a malicious action from interception through decision, denial reason, safe recovery, and metrics.

## Sources

Organizer-provided references:

- [Claude Code auto mode engineering announcement](https://www.anthropic.com/engineering/claude-code-auto-mode) — architecture, threat model, classifier results, limitations (published 2026-03-25).
- [Auto mode becoming the Claude Code default](https://claude.com/blog/auto-mode-default-in-claude-code) — approval-fatigue study, comparative safety data, hard-deny developments, default rollout starting 2026-08-14 (published 2026-08-07).
- [Kilo Code issue #9138](https://github.com/Kilo-Org/kilocode/issues/9138) — proposed Kilo implementation details and scope.
- [DepScope](https://depscope.dev/) — slopsquatting/package-intelligence reference.

Other case reference:

- [TRAP benchmark paper](https://arxiv.org/abs/2512.23128) — the case cites its 13% GPT-5 and 43% DeepSeek-R1 attack success rates; note that TRAP studies web agents, so use it as motivation and methodology inspiration rather than direct evidence about Kilo Code.

External implementation references:

- [Qwen Code Auto Mode](https://qwenlm.github.io/qwen-code-docs/en/users/features/auto-mode/) — current behavior, configuration, failure policy, and stated limitations.
- [Qwen Code v0.23.0 source](https://github.com/QwenLM/qwen-code/tree/9ffada4eac0169ade3f5ba56eca72cc34816b959) — inspected implementation under Apache-2.0.
- [Qwen weekly update, 2026-06-11](https://qwenlm.github.io/qwen-code-docs/en/blog/updates/weekly-update-2026-06-11/) — protected self-modification paths and denial-bypass hardening.
- [Qwen weekly update, 2026-06-18](https://qwenlm.github.io/qwen-code-docs/en/blog/updates/weekly-update-2026-06-18/) — project MCP approval bound to project root, server name, and configuration hash.
- [Qwen Code issue #10353](https://github.com/QwenLM/qwen-code/issues/10353) — current MCP Auto Mode gaps tracked by the maintainers.
- [Qwen Code issue #10192](https://github.com/QwenLM/qwen-code/issues/10192) — open command-substitution bypass around a narrow shell allow rule.


## 2026-09-05 — Case-giver audio feedback; provisional interpretation

Source: user-supplied `2026-09-05 12.30.46.ogg`, approximately 4m10s;
reviewed 2026-09-05 through two local automatic transcription passes. The
transcript is not manually verified; uncertain passages must not become quotes
or requirements.

- **Organizer feedback, not a new hard requirement:** the opening welcomes
  benchmark work but does not validate generated cases. Around 01:05–01:21,
  the speaker highlights careless actions and the boundary between safe actions
  and user intent. Around 01:43–02:33, the speaker discusses configuration burden,
  task-dependent permission lists and simpler access controls as product ideas.
- **Proposed team follow-up, not an accepted decision:** audit existing cases
  for an explicit authorized scope and harm oracle; use existing accidental/
  legitimate pairs to explain the product; report safety together with utility
  and observable friction; test a small permission-UX concept before building
  a new permission system. Do not expand frozen v0 from this feedback alone.
- **External reference:** no new external source was verified in this feedback
  review; existing references retain their own dates and limitations.

The feedback does not establish customer demand, benchmark quality, protection
performance, or a requirement to implement five buttons/dynamic permissions.
Current execution state remains governed by D-008 and CURRENT_STATE.md: the
full comparison is incomplete and the runtime selection is unresolved in those
local records. This note authorizes no implementation or model runs.


## 2026-09-07 — User revision: seven main slides and separate Q&A

**Explicit user requirement / team presentation decision:** the user requested at most six–seven substantive main slides. The revised deck has 19 slides: seven main slides including the cover and team, a separate Q&A slide 8, and detailed appendix slides 9–19. This supersedes the prior 17-slide layout with 11 main slides for the current deliverable. Main order: product, team, permission approaches with the user's slogan, compact architecture, recorded tool-output injection, pre-install package example, and Auto-versus-Dos results with relative task time. The five modes, scope explanation, risk matrix, full three-arm metrics, timing detail, provenance, failures, PG, scope detail, FP and pilot remain in the appendix.

**Chosen delivery plan:** target 4:40–4:45 for slides 1–7, then show Q&A; no speaker notes in the exported PPTX. Instructions remain in the separate pitch runbook. This is an explicit user-driven presentation decision, not a new organizer requirement or external reference. Frozen benchmark values are unchanged. The relative-time comparison is approximately +13% to the median on 65 common normally completed Auto/Dos runs, including attacks and functional failures; it is distinct from the 38 legitimate-task utility denominator and is not pure judge overhead. Sources: current user revision, presentation source and the derived review_metrics.json audit; recorded 2026-09-07.
