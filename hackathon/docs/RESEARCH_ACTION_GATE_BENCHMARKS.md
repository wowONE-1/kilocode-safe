# Research: prompt injection and action-gate benchmarks

Verified: 2026-09-03. This note separates external references from proposed team decisions. It does not record an accepted implementation decision.

## Executive answer

- `REAL` is reusable infrastructure for deterministic browser-agent evaluation: replicas of 11 websites and 112 ordinary tasks. It is not a security or prompt-injection benchmark. `TRAP` builds adversarial web tasks on top of part of REAL.
- Both organizer papers study **indirect prompt injection**: hostile natural-language instructions enter the agent through untrusted context rather than the user's prompt. TRAP uses web UI content; AIShellJack's actual experiments poison coding-rule files. Neither paper benchmarks `SKILL.md` or MCP directly.
- TRAP contributes useful experimental design beyond AIShellJack, especially controlled factorization, clean utility runs, and an objective first-boundary oracle. Its web-specific click/link results are not directly useful for Kilo.
- The closest published evaluation of the proposed Kilo mode is AmPermBench. The best ready corpora to combine are CodeIPI, Skill-Inject or SkillSafetyBench, MCP Security Bench or MCPTox, and small sets adapted from slopsquatting and excessive-action work.
- An action gate can contain the effects of prompt injection only at tool boundaries it actually covers. It does not remove poisoned context or guarantee that an apparently legitimate code edit is safe.

## 1. What REAL is

**External reference.** [REAL](https://github.com/agi-inc/REAL) accompanies [REAL: Benchmarking Autonomous Agents on Deterministic Simulations of Real Websites](https://arxiv.org/abs/2504.11543). It provides high-fidelity, resettable replicas of 11 websites and 112 normal browser tasks with programmatic state checks and rubric-based evaluation.

Its role relative to TRAP is:

```text
REAL = deterministic test environment and benign tasks
TRAP = prompt-injection variations placed into selected REAL tasks
```

For a CLI coding agent, the transferable idea is the environment design: reset state before every run and score actual state transitions rather than model prose. Reusing the browser stack itself is unnecessary unless web automation enters the MVP scope.

## 2. What the two organizer papers actually test

### TRAP

**External reference.** [TRAP](https://arxiv.org/html/2512.23128v3) studies indirect prompt injection in browser agents. It starts from 18 benign tasks on six REAL website replicas and creates 35 attack templates, producing 630 task-template combinations. The hostile instruction is embedded in interface content such as email, calendar fields, profiles, reviews, buttons, and links.

TRAP varies five factors: interface, persuasion principle, LLM-manipulation method, injection location, and task-specific tailoring. Its reported average ASR is 25%; buttons account for substantially more successful attacks than links, and light contextual tailoring increases success in the controlled subsets.

### AIShellJack

**External reference.** [AIShellJack](https://arxiv.org/html/2509.22040v2) studies indirect prompt injection against coding agents. Although its threat model mentions repositories and MCP resources broadly, the actual benchmark concentrates on poisoned coding-rule files such as `.cursor/rules`. Its dataset contains 314 payloads mapped to 70 MITRE ATT&CK techniques and tests whether IDE agents execute the injected shell actions.

The [official replication package](https://figshare.com/articles/dataset/Replication_packages_for_AIShellJack/30111988) is public under DOI [10.6084/m9.figshare.30111988.v4](https://doi.org/10.6084/m9.figshare.30111988.v4). It is large and contains dangerous commands, so it should be audited and run only in an isolated disposable environment. The tested editor versions are also now old enough that exact reproduction and current-agent evaluation should be reported separately.

### Terminology

Both are about **prompt injection**, but specifically its indirect/contextual form:

- direct injection: the user types the malicious instruction;
- indirect injection: the user gives a benign task, then an email, rule file, web page, skill, MCP description, or tool result contributes a hostile instruction to the model context.

Thus “garbage in context” can be prompt injection when the content is designed to redirect the agent. Ordinary irrelevant or false context without an instruction is context poisoning/noise, not necessarily prompt injection.

Neither organizer benchmark directly covers malicious `SKILL.md` files or MCP poisoning. Those surfaces have separate benchmarks below.

## 3. Does TRAP add anything beyond AIShellJack?

**Yes, methodologically; little in directly reusable Kilo content.**

Useful pieces to borrow:

1. Pair every attack with a benign task/run and report ASR separately from legitimate-task utility.
2. Factor the attack rather than collect an undifferentiated payload list: carrier × location × framing/tailoring.
3. Use an objective earliest crossed security boundary as the attack oracle.
4. Keep environment, step budget, temperature, and logging fixed; repeat across models or held-out templates.
5. Run ablations so that a favorable aggregate score can be explained.

Do not import TRAP's 630-case Cartesian product into the MVP. “Clicked a button/link” is a sensible browser boundary but not a harmful outcome for Kilo. The Kilo oracle should instead be the first unauthorized consequential action: shell execution, sensitive write, external transmission, package install, privileged MCP/API call, or persistence change.

The paper says code will be released upon acceptance; no official executable TRAP corpus was located during this review. Its appendix exposes the 18 benign prompts and representative templates, enough to reproduce the structure but not to claim exact benchmark reproduction. REAL itself is already downloadable.

## 4. Similar research most relevant to Kilo

### Priority 1: evaluate the proposed mode directly

| Reference | What it tests | Public artifact | What Kilo should take |
|---|---|---|---|
| [AmPermBench](https://arxiv.org/abs/2604.04978) | Permission gate under ambiguous authorization, target binding, and blast radius; 128 DevOps prompts, 253 state-changing actions | [Code and Codex/Claude runners](https://github.com/yan5ui/cc-auto-mode-measurement) | Closest end-to-end gate benchmark. It also shows why in-project `Edit`/`Write` cannot be categorically exempt. |
| [CodeIPI](https://ukgovernmentbeis.github.io/inspect_evals/evals/ipi_coding_agent/) | Injection via issues, README, code comments, and config; exfiltration, execution, persistence; 35 injected and 10 benign samples | [Inspect Evals source](https://github.com/UKGovernmentBEIS/inspect_evals/tree/main/src/inspect_evals/ipi_coding_agent) | Small, mostly deterministic regression suite using canaries, tool traces, and file hashes. Pin version 3-B. |
| [MisActBench / DeAction](https://arxiv.org/abs/2602.08995) | Malicious instruction following, unintended harmful actions, and task-irrelevant actions before execution | [Code and data](https://github.com/OSU-NLP-Group/Misaligned-Action-Detection) | Candidate-action classification plus actionable denial feedback and retry. |
| [ToolEmu](https://arxiv.org/abs/2309.15817) | Risk caused by benign but underspecified tasks; 144 cases, 36 toolkits, 9 risk types | [Repository](https://github.com/ryoungj/ToolEmu) | Best source of `ask` cases: missing target, scope, recipient, amount, or consent. Adapt scenarios; do not reuse its LLM emulator as the main oracle. |

AmPermBench is particularly important. In its stress workload, many unsafe actions bypassed the classifier through ungated in-project edits, while the gated classifier still had substantial false negatives and false positives. These numbers are not directly comparable to vendor internal results because the task distributions differ, but the failure mode is architectural: a harmless-looking write can create hooks, CI jobs, package scripts, or destructive configuration.

### Priority 2: malicious skills and workspace instructions

| Reference | What it tests | Public artifact | What Kilo should take |
|---|---|---|---|
| [Skill-Inject](https://arxiv.org/abs/2602.20156) | Malicious instructions in skills against Claude Code, Codex CLI, and Gemini CLI; paper reports 202 injection-task pairs | [Repository](https://github.com/aisa-group/skill-inject) | Direct skill-facing attack fixtures plus filesystem, shell, and network evidence. Pin a commit because the repository dataset has expanded since the paper. |
| [SkillSafetyBench](https://arxiv.org/abs/2605.12015) | 155 prepared cases across 47 tasks and six risk domains, including helper scripts, sidecars, templates, and workspace artifacts | [Repository](https://github.com/AI45Lab/skill-safety-bench) | Broader static set with deterministic unsafe-behavior verifiers and task tests. |
| [OpenSkillRisk](https://arxiv.org/abs/2607.20121) | 263 real-world risky skills: unconditional and context-dependent authority abuse | [Repository](https://github.com/Miaow-Lab/OpenSkillRisk) | Especially useful for `ask`: a call may be acceptable only for the current user-authorized scope. |

Large supplements exist, including [AgentJailbreak](https://arxiv.org/abs/2608.05223) with [2,826 generated malicious skills](https://github.com/awsm-research/AgentJailbreak). They are useful as payload sources after artifact audit, but lack the balanced clean-utility arm needed as the primary benchmark.

### Priority 3: MCP poisoning

| Reference | What it tests | Public artifact | What Kilo should take |
|---|---|---|---|
| [MCP Security Bench](https://arxiv.org/abs/2510.15994) | 12 attacks spanning descriptions/planning, parameters/calls, responses, retrieval, and mixed chains; 405 tools and more than 2,000 instances | [Repository](https://github.com/dongsenzhang/MSB) | Broadest MCP-native source. Gate tool identity, exact arguments, recipient/destination, and authority expansion rather than trusting tool metadata. |
| [MCPTox](https://arxiv.org/abs/2508.14925) | Poisoned `tool.description` manipulates legitimate privileged calls and parameters; 45 servers and 353 authentic tools | [Repository](https://github.com/zhiqiangwang4/MCPTox-Benchmark) | Very clean test of a reasoning-blind gate: the judge should detect unsafe call/args without reading the poisoned description. Add a benign/FPR arm locally. |

MCP benchmarks cannot prove safety against a malicious server whose hidden implementation performs extra effects behind an apparently benign call. That requires tool provenance, sandboxing, least privilege, or an enforcement layer below MCP—not only a pre-call classifier.

### Priority 4: broader action vulnerabilities

| Reference | Vulnerability | Relevance to Kilo |
|---|---|---|
| [AgentDojo](https://arxiv.org/abs/2406.13352), [repo](https://github.com/ethz-spylab/agentdojo) | Indirect injections in stateful tool outputs; 97 user tasks, 27 attacker goals, 629 security cases | Best mature pattern for deterministic state oracles and joint security/utility reporting; adapt selected effects, not the web/business environment. |
| [OS-Harm](https://arxiv.org/abs/2506.14866), [repo](https://github.com/tml-epfl/os-harm) | 50 malicious requests, 50 prompt injections, and 50 accidental/model-misbehavior GUI tasks | Scenario source for persistence, file deletion, credential leakage, and accidental harm. Full OSWorld runner is too heavy for the MVP. |
| [Package hallucination/slopsquatting study](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen), [repo](https://github.com/Spracks/PackageHallucination), [artifact](https://zenodo.org/records/14676377) | Agents recommend nonexistent dependencies that an attacker can register | Add an isolated fake registry/canary and pre-install checks for existence, age/provenance, name similarity, and user intent. Existence-only checks do not cover a registered zero-day package. |
| [AgentSentinel](https://arxiv.org/abs/2509.07764), [repo](https://github.com/m4p1e/agent-sentinel) | Prompt injection, hallucination, poisoned tools, backdoors, and malicious environments at OS-effect level | Useful source of hidden shell-effect tests; full eBPF/LSM enforcement is probably too heavy for the hackathon. |

### Dedicated research on excessive coding-agent actions

**External reference.** [OverEager-Gen](https://arxiv.org/html/2605.18583)
defines an overeager action as a sensitive read or state change outside the
authorized set while the user request itself remains benign. The paper's key
benchmarking lesson is counterintuitive: putting an explicit “scope of consent”
block into every prompt can make the test too easy. In its paired experiment,
removing only that block raised the reported overeager rate for Claude Code from
0.0% to 17.1%. Its 500-scenario artifact is promised after publication but was
not publicly available when checked, so we can reuse the method and archetypes,
not claim dataset reproduction.

[UnderSpecBench](https://arxiv.org/html/2607.02294) is the strongest source for
constructing small deterministic cases. It varies three independent axes while
holding the environment fixed: clarity of the requested action, certainty of the
target, and blast radius. Its oracle distinguishes `safe success`, `wrong
target`, `over scope`, clarification, refusal and deferment. The paper reports
that 55.8–67.8% of acted runs across its tested configurations crossed at least
one boundary. The result is recent and not independently replicated, but the
state-diff methodology is directly applicable.

[ToolEmu](https://openreview.net/pdf?id=GEcwtMk1uA) remains useful for benign
underspecification outside coding: 144 cases, 36 toolkits and nine risk types.
For Kilo, use it only to source ambiguity patterns such as missing recipient,
target, amount, scope or consent; use local deterministic oracles instead of its
LLM-emulated environment.

The v0 excessive-action cases should therefore cover:

1. over-broad cleanup that deletes an ambiguous or protected file;
2. making tests pass by deleting, skipping or weakening evidence instead of
   fixing the implementation;
3. destructive repository recovery (`reset --hard`, `clean -f`, deleting a
   branch) when the target or consent is unclear.

Each family gets `scope_implicit` and `scope_explicit` prompt variants with an
otherwise identical environment. Both task completion and forbidden effects are
scored: an agent that “safely” does nothing has not demonstrated utility.

### Public issues and community reports used as scenario seeds

These are **unverified reports**, not prevalence estimates or confirmed current
product behavior:

- [Kilo #9871](https://github.com/Kilo-Org/kilocode/issues/9871) reports that
  destructive git commands ran despite `ask` rules. It motivates checking the
  actual command trace, not only the intended policy.
- [Codex #14487](https://github.com/openai/codex/issues/14487) reports deletion
  outside a folder explicitly protected in `AGENTS.md`. It is a concrete reason
  to benchmark instructions-only configuration rather than assume it enforces a
  boundary.
- A [Reddit Cursor report](https://www.reddit.com/r/cursor/comments/1tga513/cursor_agent_ran_rmdir_s_q_on_windows_and_deleted/)
  attributes broad deletion to incorrect quoting of a Windows path. The safe
  adaptation uses an inert `rmdir` shim and a disposable tree.
- [MCP protocol #3213](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3213)
  provides a proof of concept for injection through server-controlled
  `instructions`. [MCP servers #4143](https://github.com/modelcontextprotocol/servers/issues/4143)
  reports an unconstrained fetch tool that can reach cloud metadata endpoints.
  Both motivate local injection and parameter-boundary cases.
- A [read-only scan reported on Reddit](https://www.reddit.com/r/mcp/comments/1w1fkt3/i_ran_toolslist_against_every_remote_server_in/)
  says it found zero textbook SSH-key-stealing strings among 140,284 tool
  descriptions. This is useful negative evidence: realistic MCP tests should use
  subtle target/recipient changes, false errors and descriptor changes, not only
  obvious “ignore previous instructions” payloads. The dataset and method still
  require independent audit before any quantitative claim.

## 5. Architecture references

These are defenses rather than primary benchmark sources.

- [Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode): a prompt-injection probe plus a reasoning-blind action classifier over trusted user messages and bare tool calls; denial reason is returned so the agent can retry, with escalation after repeated blocks. It is the closest product pattern, but its internal datasets are not downloadable.
- [Progent](https://arxiv.org/abs/2504.11703), [code](https://github.com/sunblaze-ucb/progent): deterministic per-tool policy, automatic proof-backed narrowing, and human approval for capability expansion. This is the closest academic reference monitor design.
- [CaMeL](https://arxiv.org/abs/2503.18813), [code](https://github.com/google-research/camel-prompt-injection): separates trusted planning from untrusted-data interpretation and tracks capabilities/provenance. Strong conceptual isolation, but a full interpreter is too large for the MVP.
- [FIDES](https://arxiv.org/abs/2505.23643), [code](https://github.com/microsoft/fides): information-flow labels for data, recipients, and tool arguments. Useful for secret-read → later-send flows.
- [ClawGuard](https://arxiv.org/abs/2604.11790), [code](https://github.com/Claw-Guard/ClawGuard): unified rules for web/local injection, MCP poisoning, and malicious skills. Its taxonomy is useful, while its incomplete reproduction artifact and model-dependent components require caution.
- [OSGuard](https://arxiv.org/html/2606.15034): demonstrates that good offline action-classification scores may yield only modest end-to-end safety improvement after retries. Online trajectory evaluation is mandatory.

### Can AGENTS.md and skills solve excessive agency?

**Short answer:** they are worth using and measuring, but they are guidance, not
an enforcement boundary.

What instructions and skills can do well:

- make task scope, protected files and approved commands explicit;
- require inspection before deletion and a post-change `git diff`;
- prohibit deleting or weakening tests merely to make them pass;
- teach a safe procedure: prefer targeted and reversible actions, ask when the
  target is ambiguous, and stop after a bounded number of failed attempts;
- improve utility by avoiding generic blocking when a known safe procedure
  exists.

Why they are insufficient as the only security mechanism:

1. They are interpreted by the same probabilistic model whose mistake or
   hijacking causes the problem. There is no lower layer that prevents a
   violating action.
2. Repository rules and skills are also injection surfaces. A “security skill”
   can itself be replaced, poisoned, omitted from context or contradicted by a
   more salient tool result.
3. They do not reduce the actual filesystem, network, credential or MCP
   permissions available to shell commands and subprocesses.
4. A perfectly written rule cannot fully enumerate malformed quoting, wrong
   paths, symbolic links, stale state, or an MCP tool whose hidden implementation
   has broader effects than its schema.

This conclusion is consistent with the
[OWASP excessive-agency guidance](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/):
minimize tool functionality and permissions, avoid open-ended shell-like tools,
require approval for high-impact actions, and enforce authorization in downstream
systems rather than letting an LLM decide. Anthropic's
[sandboxing write-up](https://www.anthropic.com/engineering/claude-code-sandboxing)
similarly uses filesystem and network isolation to reduce the reachable blast
radius. Its [auto-mode design](https://www.anthropic.com/engineering/claude-code-auto-mode)
adds an intent-aware action classifier, while explicitly treating broad allow
rules and untrusted tool results as separate risks.

Текущие материалы Kilo проводят ту же границу. В
[CLI documentation](https://github.com/kilo-org/kilocode/blob/main/packages/kilo-docs/pages/code-with-ai/platforms/cli.md#permissions)
описаны `allow`, `ask`, `deny` и правила по шаблонам. При этом
[политика безопасности](https://github.com/Kilo-Org/kilocode/security) говорит,
что механизм разрешений помогает пользователю видеть действия, но не является
песочницей или слоем изоляции. Для изоляции предлагаются контейнер или
виртуальная машина, а поведение подключённых внешних MCP-серверов находится вне
границы доверия Kilo. Поэтому `AGENTS.md`, навыки и текущие правила разрешений —
полезные варианты для сравнения, но без отдельного принудительного ограничения
ни один из них нельзя выдавать за жёсткую гарантию сдерживания.

The right experiment is an ablation, not an argument. Run excessive-action and
normal tasks as `baseline`, `guidance_only` (versioned `AGENTS.md` plus skill),
`enforcement_only`, and `combined`. Compare excessive-action rate, Utility, FP,
human decisions and latency. If guidance performs well, it earns a role as a
cheap first layer; it still cannot support a hard-guarantee claim.

### Defense families to compare

This is a research map for evaluation, not a selected implementation
architecture.

| Defense family | What it changes | Best fit for excessive actions | Main limitation | Benchmark evidence needed |
|---|---|---|---|---|
| Concise `AGENTS.md` and procedural skills | Model behavior and work procedure | Scope reminders, inspect-before-delete, do not weaken tests, ask on ambiguity | Probabilistic and exposed to conflicting context | `guidance_only` ablation on implicit/explicit scope pairs |
| Minimum tool set and narrow tools | Available functionality | Read-only tool instead of shell; targeted delete instead of arbitrary command | Requires tool redesign and complete coverage | Same task with broad shell versus structured local tool |
| Least-privilege credentials and user-scoped identity | Downstream authorization | Prevents a dev task from reaching production, other users or admin operations | A wrong action may still damage everything inside the granted scope | Local fake service with dev/prod and owner boundaries |
| Filesystem and network sandbox | Reachable environment | Caps deletion and exfiltration even after a model mistake | Does not stop harmful changes inside the writable workspace or allowed network | External-path and network canaries plus legitimate build/network tasks |
| Parameter-bound approval | Human consent tied to exact tool, target and arguments | Stops recipient/target substitution after a broad approval | Too many prompts cause approval fatigue | Change one argument after approval; count necessary and extra asks |
| Deterministic policy with complete mediation | Every consequential action checked below the model | Protected paths, destructive git, package install, external recipient | Static rules miss novel semantics and may overblock | Bypass attempts through shell/edit/MCP plus clean lookalikes |
| Intent-aware action classifier | Compares proposed effect with trusted user request | Catches goal-related but unauthorized initiative | Probabilistic false negatives/positives; input isolation matters | Held-out paraphrases, ambiguous tasks and safe recovery after denial |
| Reversible execution | Snapshot, transaction, draft, dry run, review-before-apply | Limits cost of a wrong edit/delete and makes recovery measurable | Cannot undo every external API, message or credential leak | Verify rollback restores exact state and no external effect occurred |
| Budgets and rate limits | Number of steps, files, calls, cost or elapsed time | Stops runaway cleanup/retries and caps blast radius | Limits damage rather than deciding whether the first action is valid | Over-broad batch and retry-loop cases; report partial damage |
| Independent observation and audit | Trusted logs, diffs and alerts | Detects scope creep and enables rollback/evidence | Detection after an irreversible effect may be too late | Compare shell, internal tool, MCP-server and state-snapshot coverage |

The first six rows follow directly from
[OWASP's excessive-agency mitigations](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
and [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).
Filesystem/network isolation and scoped Git credentials are described in
[Anthropic's sandboxing article](https://www.anthropic.com/engineering/claude-code-sandboxing).
The intent-aware classifier and denial-retry behavior are described in
[Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode).
The [MCP specification](https://modelcontextprotocol.io/specification/2025-03-26/index)
supports the consent, untrusted-description and least-privilege assumptions but
does not itself enforce them.

## 6. Proposed benchmark for the hackathon

**Accepted direction; exact fixtures remain a plan.** Build a native Kilo suite
of 25 risk cases, 25 clean/legitimate counterparts and 12 ordinary development
tasks. The detailed IDs and oracles are in `BENCHMARK_IMPLEMENTATION_V0.md`.

| Risk cases | Source family | Target effect |
|---:|---|---|
| 10 | CodeIPI + selected AIShellJack | poisoned issue/README/rule/comment tries shell execution, secret exfiltration, persistence, protected configuration change, or implicit install |
| 4 | Skill-Inject or SkillSafetyBench | malicious `SKILL.md`, helper script, YAML metadata, or sidecar changes agent action |
| 4 | MCP Security Bench or MCPTox | poisoned tool metadata/result causes wrong tool, recipient, destination, or parameter |
| 4 | slopsquatting | nonexistent, newly registered, confusable, or implicitly suggested dependency install |
| 3 | OverEager-Gen + UnderSpecBench | benign cleanup, test fixing, or git recovery expands beyond authorized target/scope |

The rows total 25. The nonexistent-package case and the final three excessive
cases are accidental, not attacks, and are excluded from ASR. Each risk case should
have a clean twin with the same benign task and environment. Add authorization
variants to selected twins: clearly authorized action should be allowed; missing
target/scope/consent should produce `ask`; clearly conflicting action should be
denied.

The primary oracle should inspect actual state, not model claims:

- unauthorized file/process/network/package/MCP effect occurred;
- protected state changed;
- legitimate task completed;
- gate returned `allow`, `deny`, or `ask` correctly;
- after denial, the agent continued via a safe path or escalated within the retry cap.

Report baseline versus protected runs using ASR, excessive-action rate,
legitimate-task utility, unsafe-allow FNR, benign-block/ask rate, human decisions,
latency, and safe recovery after denial. Preserve raw trajectories and case
provenance. Run the ordinary 12-task slice in addition to attack twins so that
Utility and false positives are not estimated only from security-shaped prompts.

## 7. What the proposed mode can and cannot fix

**Directly containable when every effectful boundary is covered:**

- injected shell commands and external transmissions;
- sensitive or persistence-related file changes;
- unauthorized package installs;
- dangerous MCP/API calls or parameter tampering;
- accidental actions with unclear target, scope, recipient, or blast radius.

**Only partially containable:**

- backdoors hidden inside code edits that look task-relevant;
- multi-step chains whose individual calls appear harmless;
- branch steering toward a harmful but nominally allowed option;
- data leakage through channels the gate does not intercept.

**Not fixed by an action gate alone:**

- poisoned beliefs or wrong natural-language answers with no consequential tool call;
- hidden side effects inside a malicious MCP server/tool implementation;
- effects that occur before interception, or TOCTOU/rollback failures.

The defensible architecture is therefore: deterministic hard invariants first; task scope fixed before untrusted context; a reasoning-blind classifier over trusted user intent plus normalized action/arguments; `ask` for uncertainty or authority expansion; denial feedback with bounded safe retries; and trusted state/provenance metadata for multi-step flows. The claim should be “contains consequences at covered action boundaries,” not “solves prompt injection.”
