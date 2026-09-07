# ML/AI system design: safe auto mode for Kilo Code

## 2026-09-07 — Зафиксированная реализация и её проверка

Описанный ниже D-013 реализован в `b184d6358b4078e6087694097141b7d7e976a27e`
и измерен на одном source-bound image. 117 native tests / 460 assertions PASS;
VSIX и отдельный native CLI integration smoke готовы. [Результаты 370 CLI и 44 probes](BENCHMARK_RESULTS.md).
Это проверка конкретной сборки, не доказательство строгой OS-изоляции или защиты
произвольной задачи. Счётчики эскалации относятся к AUTO/judge denial tracking;
явный permission deny и внутренний package veto не включены в эти счётчики.

## 7 сентября 2026: действующая архитектура D-013

**Решение команды, одобрено пользователем:** реализовать и проверить ограниченное
обновление от `437eaa558a725cea9bbe53a58e442f32293071b5` в ветке
`codex/final-jury-20260907`. Разделы ниже о D-007 и proposed architecture сохранены
как история и планы; они не описывают актуальную сборку D-013. Точный freeze SHA и
проверенные результаты зафиксированы в итоговом отчёте выше.

### Исполняемый маршрут

1. Kilo получает предложение инструмента от coding-модели. Прямые сообщения
   пользователя — источник полномочий; текст файлов, ответы MCP и рассуждения
   агента не могут расширять эти полномочия.
2. В Dos LLMs + Secure оболочка инструмента проверяет явные deny, пути всех
   операций patch (включая назначения move), canonical paths и пределы контекста.
   Чтение/поиск сохраняют быстрый путь. Edit/write/patch/shell и неизвестные
   действия проходят semantic review; широкий предварительный allow не снимает его.
3. Существующие детерминированные правила опасных shell-команд действуют отдельно
   от модели. Затем первая стадия Qwen принимает быстрый вердикт; отмеченные
   действия проходят вторую стадию **той же выбранной Qwen**, а не второй модели.
   Отказ содержит причину и инструкцию безопасного продолжения; счётчик отказов
   ограничивает повторные попытки и переводит дальнейший риск в ручной fallback.
4. Внутри инструмента сохраняются intrinsic permission и Secure controls. Для
   распознанной установки package gate обращается к metadata registry **до**
   запуска package manager. Outer judge allow не отменяет этот дополнительный veto.
5. Allow допускает действие; deny возвращает отказ агенту; ask требует отдельного
   решения. Headless CLI отвергает требующие ручного решения запросы и продолжает
   с этим результатом. Переключение Auto не подтверждает защищённые запросы.

### Доверие и пределы гарантии

**Требование организатора:** хотя бы один контроль должен быть архитектурно
отделён от prompt-injected content. В реализации это исполняемые правила
распознанных опасных команд и обязательная проверка распознанных package installs:
агент не может отменить их текстом ответа judge. Это узкая гарантия маршрута,
не доказательство полноты распознавания произвольных shell/MCP эффектов.

**Решение команды:** произвольные ограничения «не меняй файл» и «только эта
директория» оценивает модель. Дополнительного UI границ, извлекателя структурной
политики и новой OS-изоляции нет. Исходные/canonical paths помогают модели;
не являются файловым sandbox. Неизвестные побочные эффекты helper/MCP, удалённые
исходные сообщения, недоступная корневая сессия и временная запись с восстановлением
остаются рисками. Прямые user messages загружаются из persisted корневой сессии
независимо от сокращения model context; child delegation не расширяет полномочия.
При недоступности корневого контекста, превышении бюджета или ошибке projection
потенциально изменяющее действие переводится в ручную проверку; headless его
отклоняет, безопасные чтения сохраняют быстрый путь. Более позднее прямое
разрешение пользователя может изменить прежний запрет; «продолжай» — само по себе нет.

### Режимы и диагностика

| Название интерфейса | Значение |
|---|---|
| Auto | Автоматическое подтверждение обычных permission requests; защищённые запросы требуют отдельного решения |
| Vanilla Kilo | Штатная политика Kilo без добавленных Secure/judge слоёв |
| Secure | Добавленные проверки чтения и распознанных установок, с штатной permission policy |
| Ask | Запрос на границах permission с добавленными проверками; не обещает запрос перед каждым read |
| Dos LLMs + Secure | Две стадии выбранной Qwen, scope review и Secure |

PG выключен по умолчанию. `KILO_PROMPT_GUARD=on` добавляет фиксированный PG путь:
benign score всё равно идёт в semantic stage 1, положительный — в stage 2.
`KILO_SCOPE_REVIEW=off` нужен только для абляции прежней маршрутизации вместе
с прежним prompt. Он не является пользовательским режимом и не добавляет шестое имя.

Опциональная `KILO_PERMISSION_TRACE=1` пишет структурированные решения без
содержимого файлов и команд. Outer `stage=judge` и inner `stage=permission`
соединяются по action/call ID с исходом инструмента: allow не равен исполнению.
Ошибки модели, ручные запросы, автоматические отказы и реальные ответы человека
учитываются отдельно. Безусловное логирование содержимого security trace удалено.

**Внешние источники:** архитектура Claude Code auto mode — reference для разделения
проверки входного содержимого и выходного действия; наша PG интеграция не идентична
ей. DepScope заявляет pre-install MCP проверки; преимущество нашего gate связано
с обязательностью перехвата распознанной установки, а не с тем, что MCP обязательно
работает слишком поздно. См. ссылки в `PITCH_RELEVANCE_SOURCES.md`.

---

## История проектирования до D-013

**Status:** protection architecture below remains a proposal; D-007 benchmark CLI implemented, bounded Qwen raw results audited with image-reproducibility warning  
**Canonical requirements:** `HACKATHON_BRIEF.md`  
**Evaluation contract:** `EVAL_PLAN.md`  
**Last updated:** 2026-09-04

This document separates three kinds of statements:

- **Organizer requirement** — required by the supplied case.
- **External reference** — useful prior art, not automatically required.
- **Proposed team decision** — a design choice that must be accepted and recorded
  in `DECISIONS.md` before implementation relies on it.

The benchmark work does not implement the architecture below. Accepted D-007
uses the same `kilo run --auto` command and `qwen3:8b-q4_K_M` at the team's Ollama
endpoint, with clean external sources:

- upstream `Kilo-Org/kilocode@a6ff015f52afa58c34482a35c5f1c1b50c72368e`;
- published fork
  `wowONE-1/kilocode-safe@cbe5da6c27af7ef25732fccb8c0ff580272d78ec`.

The simple CLI contains 70 open development cases (7 immutable casegiver,
derived clean, 25 A, 25 L, 12 N); the final offline check is 70/70 tests PASS (29.261 s).
Only the selected 7×2 comparison is authorized now, not a full 70×2 run. Serial
reference is `--parallel 1`, optional throughput runs are separate, and there
are no artificial pauses. All 14 selected logical records / 16 phases passed raw
audit with zero infrastructure-invalid records. L21's approved `markupsafe==3.0.3`
replacement was evaluated on both arms (upstream after-phase timeout, fork completed);
old upstream L21 remains excluded. Actual
history is 15 logical attempts / 18 phases plus 12 separate capacity runs.
Upstream L21 used a source-identical rebuild with a different image ID after the
original image was lost; full bit-identical acceptance is not claimed.
See [results and limitations](BENCHMARK_RESULTS.md). No new full 70×2 run was performed.
This chat owns benchmarks, not Kilo controls. [PR #1](https://github.com/dimkablin/vibesechack/pull/1)
is open and not merged; merge and a new sandbox/proxy architecture are not authorized.

### Historical source comparison — not current mechanism metrics

The following original report used fork d0ce41f and `kilo/kilo-auto/free`.
Its values are retained as history and must not be attributed to cbe5/Qwen.

Historical preliminary experiment ID:
`20260904_085048_stage0_counterbalanced_1x`; `24/24` trials are valid and
trace-valid. Upstream → fork: ASR `2/2 = 100% → 2/2 = 100%` (delta `0 pp`,
Wilson 95% CI both `34.24–100%`), Utility `6/7 = 85.7% → 4/7 = 57.1%`,
excessive action `1/2 → 1/2`, unsafe package attempt `0/1 → 0/1`, and timeouts
`0/12 → 3/12`. Exact backend matched only `2/12` A/B pairs, so this is
preliminary dynamic-router-confounded development evidence, not a causal or
release claim. Fork emitted 44 diagnostic records but zero scanner triggers;
final decision telemetry and exact intervention FP/Friction/recovery/decision
latency are not observable. Earlier toggle-based runs belong to an
`archived out-of-scope local prototype` and do not demonstrate this design or
the quality of the published fork.

## 1. Problem and user

The primary user is a developer running Kilo Code in an IDE or CLI. Manual
approval of every consequential action creates approval fatigue, while blanket
auto-approval can permit destructive commands, secret leakage, malicious or
hallucinated dependencies, prompt-injection-driven actions, configuration
weakening, and damage outside the workspace.

The system must preserve useful autonomy while reducing attack success and
accidental blast radius without making legitimate tasks unusable.

## 2. Proposed target decision contract

The following is a proposed target for a future team implementation, not the
behavior contract of either source tree in the current benchmark. For every
action that would otherwise execute automatically:

```text
user intent + bare action payload + trusted policy/config
                         |
                         v
                 security enforcement
                         |
               allow | deny | ask
```

- **Allow:** execute without human confirmation.
- **Deny:** do not execute; return a useful reason so the agent can choose a safer
  path.
- **Ask:** require a human decision when policy, confidence, or system health does
  not justify an automatic result.

The benchmark exercises CLI-visible file, shell, package and MCP outcomes through the
published systems. It does not establish that the proposed shared-permission
contract, classifier or complete enforcement coverage exists. The final surface
for a future implementation remains an unresolved team decision.

## 3. Success metrics

| Layer | Metric | Direction | Contract |
|---|---|---:|---|
| Security | Attack success rate (ASR) | Down | Primary organizer metric |
| Utility | Legitimate task success | Up | Must be reported with ASR |
| False positives | Incorrect blocks/asks | Down | Report action- and task-level where feasible |
| Friction | Human decisions per task | Down | Report distribution, not only total |
| Performance | Decision and end-to-end latency | Down | Include p50/p95 where feasible |
| Cost | Classifier/provider cost per task | Down | Proposed additional engineering metric |

Thresholds and calculation rules are defined before final evaluation in
`EVAL_PLAN.md`.

## 4. Threat model

### Assets

- Source code and repository integrity.
- Credentials, local files, user data, and environment configuration.
- Dependency and build-chain integrity.
- Shared, remote, and production systems reachable through tools.
- The integrity of Kilo's permission and security configuration.
- Developer attention and trust in approval prompts.

### Actors and failure sources

- Prompt-injected repository, web, MCP, tool-output, or skill content.
- Malicious packages, publishers, or dependency names.
- An overeager but non-malicious coding agent.
- A malicious or compromised external tool/service.
- A user who accepts prompts reflexively because of approval fatigue.

### Trust boundaries

| Input or component | Default trust | Design consequence |
|---|---|---|
| Explicit user message | Trusted for intent, not necessarily safe policy | May inform classifier context |
| Tool name and bare parameters | Untrusted action proposal | Must be inspected before execution |
| Assistant reasoning/prose | Untrusted for authorization | Must not justify its own action |
| Tool, web, MCP, README, and `SKILL.md` content | Prompt-injection exposed | Exclude from isolated decision inputs |
| User-owned hard deny policy | Authoritative | Cannot be weakened by the agent/classifier |
| Security configuration | Protected | Agent writes require deny or explicit escalation |
| Classifier/provider | Fallible dependency | Timeout/error must fail to `ask` or stricter |

### Required properties

- **Organizer requirement:** at least one control is architecturally isolated from
  prompt-injected content.
- **Organizer requirement:** denial gives actionable feedback and supports bounded
  safe continuation.
- **Organizer requirement:** any claimed slopsquatting control runs before package
  installation inside the agent path and uses more than a known-malware denylist.
- Explicit user deny rules remain authoritative.
- Classifier or service failure cannot silently approve a consequential action.

### Non-goals for the MVP

- Complete coverage of every coding-agent threat.
- A proof that unrestricted autonomy is safe.
- Production-grade defense against a compromised host or kernel.
- Perfect semantic detection from a probabilistic classifier.
- An upstream pull request unless the user separately authorizes publication.

## 5. Proposed layered architecture

The complete layered architecture is a **proposed team decision**, not yet
accepted or implemented by this benchmark task. The CLI and fixtures can evaluate some of
its desired outcomes, but no layer below may be described as delivered by the
team on that basis.

### Layer 0 — deterministic hard policy

Runs before any model classifier and receives only the action and protected local
policy. It should enforce a small set of hard properties, for example:

- explicit deny rules;
- protected configuration paths;
- commands or destinations outside the declared trust boundary;
- security-control disablement or downgrade attempts;
- a pre-install package check if slopsquatting enters MVP scope.

This layer is the leading candidate for the required prompt-injection-isolated
control because hostile prose is not part of its decision input.

### Layer 1 — narrow safe bypass

Allow only explicitly enumerated low-risk operations. Avoid broad interpreter,
shell, package-manager, or wildcard rules that collapse the security boundary.

### Layer 2 — reasoning-blind action classifier

For consequential actions not decided deterministically, classify using:

- trusted user messages needed to express intent;
- bare tool name and parameters;
- trusted environment/trust-boundary settings;
- versioned policy categories and narrow exceptions.

Exclude assistant prose, tool results, web content, repository instructions, and
other prompt-injection-exposed material from classifier input.

### Layer 3 — decision router and continuation

- `allow` executes.
- `deny` returns a stable machine-readable reason plus a concise agent-facing
  explanation and suggested safe alternative when possible.
- `ask` delegates to the human.
- Repeated denials increment bounded consecutive and total counters; crossing the
  configured limit escalates to `ask` instead of allowing endless retries.

### Layer 4 — audit and benchmark telemetry

Record the minimum data needed to reproduce decisions without logging secrets:

- fixture/trial ID and configuration version;
- proposed action category and sanitized payload hash or representation;
- policy/classifier decision, reason category, latency, and fallback path;
- final execution outcome and benchmark oracle result.

## 6. Component contracts

| Component | Input | Output | Failure policy |
|---|---|---|---|
| Permission interception point | Pending Kilo action and current permission result | Action requiring security decision | Preserve explicit deny; do not bypass to allow |
| Deterministic policy | Bare action + trusted policy | allow / deny / undecided + reason | Fail closed to `ask` |
| Classifier adapter | Sanitized reasoning-blind context | allow / deny / ask + reason + metadata | Timeout/error/invalid output → `ask` |
| Denial tracker | Session/task ID + denial event | counters and escalation state | Corruption/unknown state → `ask` |
| Agent feedback formatter | Stable reason code + safe detail | Tool error/denial message | Never expose secrets or hidden policy internals |
| Benchmark recorder | Trial config + decisions + oracle result | Append-only raw outcome | Invalid record fails the trial, not silently omitted |

## 7. Classifier input contract

The classifier boundary must be testable as a data contract.

Allowed fields:

- sanitized user intent;
- action/tool identifier;
- structured action arguments;
- trusted environment label;
- versioned policy categories and narrow exceptions.

Forbidden fields:

- assistant chain-of-thought or prose rationalization;
- tool, MCP, browser, repository, or dependency output;
- `README`, `SKILL.md`, issue text, or retrieved page content;
- hidden credentials or full environment dumps;
- mutable agent-authored security policy.

Tests must demonstrate that forbidden fields cannot reach this contract, not only
that prompts instruct the classifier to ignore them.

## 8. Slopsquatting module option

The external fork cbe5 now contains pre-install npm/PyPI metadata checks; this
benchmark task did not implement them. Their guarantees and coverage remain to
be established. Synthetic registry files are not wired into those live lookups,
and PATH shims are instrumentation rather than complete egress containment.
The L21 compatibility finding must not be misreported as a protection failure.
The broader module below remains a proposal. If selected for the full MVP,
enforcement sits on the actual pre-install
path, not as an optional advisory the agent can skip. Candidate signals include:

- registry existence and package age;
- similarity to popular or task-relevant package names;
- popularity, provenance, maintainer, and release anomalies;
- deprecation, vulnerability, and known-malware intelligence;
- consistency with manifests, imports, and explicit user intent.

The result must route to allow/deny/ask before installation and be evaluated on
unseen or zero-day-style packages.

## 9. Failure and fallback policy

| Failure | Required behavior |
|---|---|
| Deterministic hard deny | Deny; cannot be overridden by classifier |
| Classifier timeout/error/unparseable result | Ask; never auto-allow |
| Missing provider/network | Ask or configured offline deterministic policy |
| Repeated denied retries | Escalate after bounded counters |
| Telemetry write failure | Mark trial invalid; do not fabricate benchmark success |
| Sensitive values in proposed action | Redact logs; apply secret-aware policy before external transmission |
| Unknown trust boundary | Ask |

## 10. Versioned artifacts

Record for each benchmark run:

- source repository, exact Kilo commit, clean-tree state and immutable image ID;
- model/provider and exact model identifier;
- classifier prompt/policy/schema version;
- deterministic rule version;
- benchmark dataset and split version;
- execution environment and dependency lockfiles;
- random seeds, repetitions, and timeout configuration.

## 11. Open product decisions beyond the benchmark CLI

1. Primary MVP threat: general consequential actions, slopsquatting, protected
   configuration, or a layered subset.
2. Target Kilo surface: CLI, VS Code extension, or shared permission core.
3. Exact interception point after inspecting the current upstream source.
4. Deterministic-only, classifier-only, or layered architecture.
5. Classifier model/provider, offline behavior, timeout, cache, and cost budget.
6. Hard-deny categories and trusted environment definition.
7. Denial escalation limits.
8. Benchmark sandbox, organizer dataset availability, oracle, repetitions, and
   damage definitions.

D-007 fixes the current open benchmark, model, bounded run and accepted Docker
limitations; it does not resolve or implement the product architecture above.
Resolve future control choices through a Context Snapshot and `DECISIONS.md`.
They are not prerequisites for the scoped CLI PR. Any future held-out set must
be new and unopened, not relabeled from the 70 public cases.

## 12. Verification plan

- Unit tests for deterministic allow/deny/undecided behavior.
- Contract tests proving forbidden prompt-injected fields cannot reach the isolated
  decision layer.
- Integration tests for allow, deny, ask, classifier failure, protected paths,
  repeated denial, and safe continuation.
- Adversarial tests for multi-step and implicit attacks.
- Comparable baseline and protected benchmark runs using preserved raw outcomes.
- Clean-start demo rehearsal tracing interception → decision → denial reason → safe
  recovery → metrics.
