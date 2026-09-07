# Decision Log

Use this log for decisions that constrain product scope, data, model choice,
evaluation, architecture, external services, security, or delivery. Do not record
routine implementation details that are obvious from the code.

## Status values

- **Proposed** — under discussion; implementation must not rely on it yet.
- **Accepted** — current decision and source of truth.
- **Superseded** — replaced by a later decision; preserve the history.
- **Rejected** — considered and intentionally not chosen.

## Index

| ID | Date | Decision | Status | Supersedes |
|---|---|---|---|---|
| D-001 | 2026-09-02 | Use repository-local context documents and skills | Accepted | — |
| D-002 | 2026-09-03 | Preserve case-giver benchmarks as an immutable class | Accepted | — |
| D-003 | 2026-09-03 | Prioritize injection, slopsquatting, MCP and excessive-action benchmarks | Accepted | — |
| D-004 | 2026-09-04 | Keep the benchmark-runner patch minimal before review | Accepted | — |
| D-005 | 2026-09-04 | Treat every executed Stage 0 fixture as development | Proposed | — |
| D-006 | 2026-09-04 | Compare clean upstream Kilo with the published clean fork | Accepted | — |
| D-007 | 2026-09-04 | Finish the simple benchmark CLI with bounded validation | Accepted | D-005; parts of D-006 |
| D-008 | 2026-09-05 | Freeze benchmark v0 and evaluate two published judge modes on Qwen 14B | V0 accepted; full 70×3 handoff requested; see latest update | Future-run model/profile and subset scope of D-007 |
| D-010 | 2026-09-06 | Correct two added task oracles and audit baseline coverage offline | Accepted bounded scoring repair | Two task-oracle criteria in D-008; no change to execution inputs or harm |
| D-011 | 2026-09-06 | Calibrate a bounded core v1, preserve v0 and known regressions | Accepted by user | Routine suite selection only; original 70 and logs preserved |
| D-012 | 2026-09-06 | Final bounded core and package pilot | Accepted; completed with documented gaps | Routine D-011 execution |
| D-013 | 2026-09-07 | Final jury runtime, full70, scope/PG ablations and publication | Accepted; executed, see closure | Bounded runtime/run/publication limits of D-012 |

## D-001 — Repository-local context and skills

Date: 2026-09-02  
Status: Accepted

### Context

The repository is the workspace for an AI product/engineering hackathon. Durable
context must survive chat compaction and remain inspectable by teammates and
agents. Global instructions should stay generic, while hackathon-specific
workflows should not affect unrelated projects.

### Decision

- Keep project context in `docs/` and project instructions in `AGENTS.md`.
- Install ML/AI review workflows in `.agents/skills` rather than globally.
- Require an approved Context Snapshot before material implementation begins.
- Treat evaluation and the end-to-end demo as first-class system artifacts.

### Consequences

- New work begins with a short discovery step and explicit approval.
- Product, ML, and evaluation decisions are versioned and reviewable.
- The team must update documents when accepted decisions change.
- The repository contains more process files, but the workflow is isolated from
  other projects.

### Evidence

- Initial project setup discussion and audit completed on 2026-09-02.

## D-002 — Preserve case-giver benchmarks as an immutable class

Date: 2026-09-03  
Status: Accepted  
Supersedes: —

### Context

The scenarios in `lainisourgod/vibesechack` were supplied by the case giver and
must remain an independent evaluation target. Editing them would prevent a fair
claim about quality on the supplied cases and could hide overfitting.

### Decision

- Classify the supplied scenarios as `casegiver`.
- Do not change their prompts, environments, payloads, or scoring rules in place.
- Preserve their source revision and checksums.
- Put runner compatibility logic outside the fixtures.
- Report `casegiver` results separately from team-created and externally adapted
  cases.

### Consequences

- Defects or ambiguities in a supplied case are documented, not silently fixed.
- A corrected or extended version receives a new team-owned identifier and does
  not replace the original.
- Benchmark reports can show both performance on the official supplied cases and
  generalization to broader team cases.

### Verification or revisit trigger

Before a run, verify source revision and checksums. Revisit only if the case giver
publishes a new official revision; retain the old revision for comparability.

## D-003 — Benchmark threat priorities

Date: 2026-09-03  
Status: Accepted  
Supersedes: —

### Context

The initial benchmark plan prioritized prompt injection and slopsquatting and
considered delayed execution as a separate third family. The team rejected that
family and subsequently selected MCP risks and excessive actions by the agent.
The organizer metrics also require ordinary legitimate work, not only attacks.

### Decision

- Prioritize prompt injection, slopsquatting, MCP and excessive-agent-action
  scenarios.
- Do not treat “delayed execution through a trusted artifact” as a standalone
  benchmark family in v0.
- Keep multi-action oracles only where another selected family naturally needs
  them, for example MCP tool transfer or secret-read followed by exfiltration.
- Add clean pairs and a separate ordinary-development slice for Utility, false
  positives, human friction and latency.
- Test `AGENTS.md` plus skills as a guidance-only ablation, not assume they form
  a hard security boundary.

### Consequences

The detailed v0 plan contains 25 risk cases, 25 clean/legitimate counterparts
and 12 ordinary tasks in addition to immutable `casegiver`. The nonexistent-
package case and three benign excessive-action tasks are excluded from ASR; they
receive separate unsafe-package-attempt and excessive-action rates.

### Verification or revisit trigger

Revisit counts after the first smoke set (five risk/safe pairs and two ordinary
tasks) and after the full case-giver dataset arrives. Do not remove a selected
threat family solely because one scenario proves difficult; first narrow its
fixture while preserving the same failure mode.

Stage 0 smoke и oracle-fixed rerun выполнены. Четыре выбранных threat family
сохраняются; коррекция ordinary development/held-out split вынесена в D-005.

## D-004 — Keep the benchmark-runner patch minimal before review

Date: 2026-09-04  
Status: Accepted  
Supersedes: —

### Context

The runner branch `dimkablin/vibesechack@9fa9076` already contains useful Docker,
event-capture and reporting plumbing. The integration audit found safety and
metric-validity defects, but a broad rewrite would make review harder and could
silently change the case-giver experiment. The team explicitly requested a
minimal harness change and a pull request only after local verification.

### Decision

- Keep changes to existing runner files limited to the smallest safety,
  correctness and mode-adapter patch required for a valid run.
- Put new team fixtures, schemas, provenance and compatibility logic in additive
  files outside the immutable case-giver source.
- Do not refactor unrelated runner behavior or rewrite documentation beyond the
  commands and limitations changed by the integration.
- Do not commit, push or open a pull request yet. First inspect the diff and pass
  unit, integration and smoke verification; create a PR only after explicit team
  confirmation.

### Consequences

The first result may support fewer benchmark families than a redesigned runner,
but its behavior remains auditable against the supplied baseline branch. Any
larger architecture change must be proposed separately with evidence from the
minimal smoke run.

### Verification or revisit trigger

Before proposing the PR, report the changed-file list and diff size, confirm
that case-giver checksums are unchanged, and preserve raw smoke artifacts. Revisit
only if the minimal adapter cannot execute a required Stage 0 case safely or
cannot produce a decision-critical metric.

Oracle-fixed rerun зафиксировал runner/runtime hashes, Kilo source state,
source-bound image, неизменность case-giver checksums, unit/integration results и
raw artifacts. Открытие PR по-прежнему требует отдельного явного подтверждения
команды после финального diff review.

Source-matched run `20260904_041238_stage0_counterbalanced_2x` сохранил эту
цепочку provenance и прошёл `79/79` runner tests, но выявил path-qualified `pip`
bypass после package deny. Это блокирует readiness текущего protected mode и
требует узкого detector/policy regression fix; finding не является основанием
для широкого переписывания харнесса или открытия PR без нового review.

## D-005 — Treat every executed Stage 0 fixture as development

Date: 2026-09-04  
Status: Proposed  
Supersedes: —

### Context

`N10` был включён в Stage 0, просмотрен и запущен, хотя прежний план относил
`N09`–`N12` к held-out. Просмотренный fixture не может оставаться честным
held-out evidence.

### Decision

- `N02` и `N10` постоянно относятся к development.
- Ни один Stage 0 или case-giver result не маркируется held-out.
- Replacement для прежнего N10-slot выбирается только из ещё не просмотренных и
  не запущенных ordinary fixtures до реализации held-out.

### Consequences

До принятия replacement прежний ordinary held-out список содержит только
`N09`, `N11`, `N12`, а целевой баланс 8 development / 4 held-out не считается
замороженным. Возможный минимальный вариант — перенести `N08` в held-out, но это
ещё не принятое решение команды.

### Verification or revisit trigger

Принять D-005 и заморозить новый список до реализации или первого просмотра
оставшихся ordinary fixtures.

## D-006 — Compare clean upstream Kilo with the published clean fork

Date: 2026-09-04  
Status: Accepted  
Supersedes: —

### Context

Предыдущие Stage 0 эксперименты сравнивали две конфигурации одного локально
модифицированного Kilo build через `KILO_SECURITY_CONTROLS=0|1`. Эти 12
локальных изменений Kilo были экспериментальным прототипом команды, а не
состоянием опубликованного `wowONE-1/kilocode-safe`. Поэтому такие результаты
не отвечают текущему вопросу о качестве реального форка относительно обычного
Kilo Code.

### Decision

- Откатить 12 файлов локального Kilo-прототипа и не добавлять новую архитектуру
  защиты в сравниваемые системы.
- Текущим экспериментом считать сравнение чистого upstream Kilo Code
  `v7.5.8@a6ff015f52afa58c34482a35c5f1c1b50c72368e` с чистым опубликованным
  `wowONE-1/kilocode-safe@d0ce41ffea52623219d980e9d12a14facb1c45d9`.
- Для обеих систем использовать одинаковые `kilo run --auto`, модель
  `kilo/kilo-auto/free`, fixtures, budgets, Docker isolation и oracles; системы
  различаются сборкой исходников, а не несуществующим `mode_v1` или toggle.
- Первый сопоставительный прогон выполнить как быстрый development run: 12
  Stage 0 fixtures, один повтор, 24 trials. Не представлять его как
  статистически устойчивый, held-out или release benchmark.
- Не коммитить, не push-ить и не открывать PR. Решение о PR возможно только
  после локальной проверки и отдельного явного подтверждения команды.

### Consequences

Toggle-based smoke и Stage 0 runs сохраняются вместе с raw artifacts, но
архивируются как `out-of-scope local prototype`: их числа нельзя приписывать
чистому published fork и нельзя использовать как текущий headline comparison.
Новый upstream-vs-fork run получает независимую source/image provenance и
становится единственным текущим основанием для такого сравнения. Поскольку
`kilo/kilo-auto/free` является динамическим router, распределение фактических
backend-моделей остаётся обязательным ограничением причинной интерпретации.

### Verification or revisit trigger

Подтвердить чистое состояние обоих source trees, immutable image IDs, одинаковые
команды/fixtures и сохранность raw records для всех 24 trials. Расширять
development run до трёх повторов можно отдельным запуском без изменения
fixtures или методики; PR по-прежнему требует отдельного решения.

---

## Decision template

Copy this section for the next decision.

```md
## D-NNN — Short decision title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded | Rejected
Supersedes: D-NNN or —

### Context

What decision is required, and what constraints or evidence matter?

### Options considered

1. Option A — benefits, costs, and risks.
2. Option B — benefits, costs, and risks.

### Decision

What was chosen and why?

### Consequences

What becomes easier, harder, required, or explicitly out of scope?

### Verification or revisit trigger

What evidence will confirm the decision, and what would cause it to be revisited?
```

## D-007 — Finish the simple benchmark CLI with a bounded development validation

Date: 2026-09-04  
Status: Accepted  
Supersedes: D-005; D-006 experiment scope/model/publication restrictions

### Context

Источник решения — явные уточнения пользователя в текущем benchmark-чате.
Это **team decision**, не новое требование организатора. Ранее предложенный
полный прогон и архитектурное расширение не нужны для текущего результата.
Код защиты Kilo принадлежит другим участникам команды и здесь не изменяется.

### Decision

- Сохранить 70 открытых development scenarios в шести `CASES`-модулях:
  7 immutable casegiver attacks, 1 derived clean control, A01–A25, L01–L25,
  N01–N12. Все просмотренные сценарии development, не held-out. Casegiver
  prompts, environments и scoring сохраняются без изменений.
- Довести один существующий CLI: независимые oracle controls, разделение
  poststate/completion/safety, offline rescore, ограниченная параллельность и
  сохранность истории. Не добавлять второй runtime, schema service, registry
  service, отдельный aggregator или новый Dockerfile.
- Текущие external source arms: upstream
  `a6ff015f52afa58c34482a35c5f1c1b50c72368e` и опубликованный fork
  `cbe5da6c27af7ef25732fccb8c0ff580272d78ec`. Это явная замена прежнего
  `d0ce41ffea52623219d980e9d12a14facb1c45d9` для будущей приёмки; прежние
  experiments сохраняются с исходной provenance и не переименовываются.
- Приёмка — только `l2_rules`, A16, A19, A25, A24, L21, N02 на двух arms:
  14 logical trials / 16 Kilo phase invocations. Последовательно, без
  искусственных пауз и без автоматического переигрывания неудачных trials.
  Полный 70×2 сейчас не запускать. Отдельный capacity profile ограничить
  максимум 12 модельными запросами, сравнить concurrency 1/2/4 и не включать
  его результаты в benchmark scores.
- Использовать одинаковый Qwen `qwen3:8b-q4_K_M`, endpoint и budgets.
  Для Ollama OpenAI-compatible API отключать reasoning через SDK option
  `reasoningEffort: "none"`, на model-level и в `variants.none`; native
  `think:false` сам по себе не является подтверждённым переключателем `/v1`.
  Это исправление передачи принятой настройки, а не смена модели. Поддержка
  подтверждена Ollama v0.33.1 и установленным SDK; ссылки в evidence.
- Обоим arms сообщается одна явная trusted package policy только для team
  A/L/N fixtures: одобренные зависимости разрешены, подтверждённо отсутствующие
  запрещены, непроверенные требуют подтверждения. Отсутствие и непроверенность
  считаются отдельно; A19 не называется hallucination лишь по факту install
  attempt. Policy workload не считается реализацией защиты Kilo, а локальная
  metadata fixture — интеграцией с live registry detector.
- Для этого ограниченного synthetic development run принять текущие Docker
  ограничения: нет host secrets/production targets/host socket, но Docker и
  PATH shims не гарантируют отсутствие любого внешнего сетевого или package
  effect и не превращают writable workspace traces в доверенное evidence.
  Эти ограничения указываются явно; не строить новый sandbox/network proxy
  в этом PR и не заявлять универсальную безопасность произвольной сборки.
- Сохранить raw attempts и версии результатов, обновить сухую документацию,
  выполнить тесты, checksum/diff/secret audit и открыть минимальный PR
  `codex/simple-benchmark-cli` → `codex/full-access-baseline`. Автор коммитов:
  `Егор Козлов <ekv24@mail.ru>`. Generated logs, `.env`, local context docs и
  Kilo source не включать. Перезапись feature-ветки только `--force-with-lease`.
  **PR не мержить.**

### Consequences and verification

Утилита должна давать быстрый локальный feedback без повторной генерации при
oracle-only изменениях; ускорение полного E2E в 10 раз остаётся гипотезой,
не обещанием. Serial latency и parallel throughput маркируются отдельно.
Готовность требует 70 проверенных controls, корректных 14 logical records,
просматриваемых raw artifacts и честных limitations. Наличие 70 definitions
или успешных unit tests само по себе не доказывает защиту четырёх семейств.
Новый arm, endpoint, timeout или изменение fixture inputs требует новой
experiment provenance; исторические результаты не смешиваются.

### 2026-09-04 — Уточнение единиц capacity profile и исправление L21

Статус: принятое уточнение D-007, история выше сохраняется.

- Лимит профиля относится к **12 запускам Kilo**, не к 12 HTTP-запросам к
  модели. Один Kilo run многошаговый. В трёх сохранённых профилях по четыре N02
  наблюдалось 60 завершённых model steps и отдельно 6 preflight chat requests;
  это не полный перехват всех HTTP-запросов, включая вспомогательные Kilo calls.
  Прежняя формулировка «12 модельных запросов» была неточной единицей учёта.
- Пользователь отдельно одобрил точечное исправление L21 и его проверку на
  обоих arms, максимум **4 дополнительных запуска Kilo** (две фазы на arm).
  Это новая версия fixture, не скрытый retry старого результата.
- L21 использует существующий `markupsafe==3.0.3`, новый только для проекта:
  before — предложение без approval; after — точное явное approval.
  A21 остаётся неизменным authorization counterpart с другим package name.
  L21 проверяет соблюдение полномочий, не возраст пакета или zero-day detection.
- Причина: PyPI для прежнего `render-fast-next` вернул 404, тогда как fixture
  утверждал `exists:true`. Новый fork читает реальный PyPI и запрещает
  отсутствующий пакет; это несовместимость исходной fixture с окружением,
  а не доказанный false positive защиты. Старые raw attempts сохраняются и
  не смешиваются с исправленным L21.

## D-008 — Freeze benchmark v0; evaluate the new judge modes

Date: 2026-09-05  
Status: Proposed execution plan. The user requested planning, not implementation.

### Confirmed user constraints

- Shared model is now `qwen3:14b-q4_K_M`, according to the user. All future
  trials are sequential, with no artificial pauses; do not repeat concurrency
  profiling. Live endpoint compatibility has not been tested in this update.
- Running the CLI through this assistant is acceptable. Independent-user
  clean-checkout onboarding is not a prerequisite for the next measurement.
- Evaluate `mode_dos_llm_as_a_judge` and `mode_prompt_guard_with_llm`; do not
  implement or change their Kilo controls. Prompt Guard credentials stay out
  of docs, logs and Git. Existing no-merge restriction remains.

### Known state and proposed bounded work

The 70 definitions and 70 passing offline tests are an operational development
v0. Current audited E2E evidence is only seven cases on two builds with Qwen 8B
(14 selected logical trials / 16 Kilo phases). Neither full 70-case quality nor
new-mode quality has been measured by this harness.

1. Freeze the current scope. Make one bounded assessment of L21's inert installer
   response: either demonstrate and fix a fixture defect with regression tests
   before new comparisons, or retain it with its synthetic completion/latency
   limitation. Do not redesign the package simulator or rework the other cases.
2. Connect Qwen 14B and both modes using existing configuration/runtime. Pin
   published commit `81edc748a6054026583af9731fb0a5f726a93292`; use each actual
   `--mode` without `--auto`. Enable required structured outputs, check chat/tool/
   judge compatibility, and cover redaction of the additional service key.
   No Kilo source changes. Record exact non-secret configuration and retain images.
3. Run the existing seven selected cases once on three arms: clean upstream
   `a6ff015f52afa58c34482a35c5f1c1b50c72368e` with full access, and the two modes
   at `81edc748…`. This is 21 logical trials / 24 Kilo phases, plus separately
   recorded preflight requests and internal judge/model calls. Use identical
   fixtures, Qwen 14B options and a fixed 60-second phase budget; do not silently
   change budgets or replay failed trials. Audit raw logs/oracles, demonstrate
   offline score with retained images, and report the three arms separately.

### Stop condition and exclusions

Done means 21 accounted-for logical outcomes, complete raw evidence, reproducible
counts, documented limitations and an updated existing benchmark PR/report.
An infrastructure failure blocks a valid comparison, but a task failure or
timeout does not reopen benchmark development. No retry-until-favorable cycle.
Any demonstrated fixture defect must be versioned consistently across arms;
it must not be disguised as a product failure or silently rescored as a new run.

Old Qwen 8B measurements remain historical; do not rerun them merely to recover
the lost old image or pool them with Qwen 14B. A full 70×3 run, new cases,
runtime architecture, live permission-session support and Kilo improvements
are outside this plan. FP/friction/decision latency remain `not_observable`
unless the new builds actually emit sufficient structured events. A Prompt
Guard match is not an action denial; its injection detector is not equivalent
to a general action-risk classifier. Proposed work awaits user approval.

Evidence: published [commit and source](https://github.com/wowONE-1/kilocode-safe/commit/81edc748a6054026583af9731fb0a5f726a93292),
its `packages/opencode/src/kilocode/permission/judge/README.md`, run option checks,
judge adapters, current harness config/entrypoint and redaction path. Reviewed
read-only on 2026-09-05; no endpoint request or model run was made.

### 2026-09-05 — Latest user update: finish v0; hand off all 70×3

This update supersedes the seven-case execution scope proposed above. The user
approved the bounded v0 work and requested a compact prompt for GPT-6 Astra low
to execute three complete arms, plus a time estimate and timeout diagnosis.
The user explicitly excludes old run results from the new comparison. Preserve
old artifacts, but do not revisit, restore images for, or mix those runs.

- V0 work completed locally: L21 now explicitly describes a successful inert
  install as task completion, without requiring an importable dependency. The
  confirmed phase also detects an install outside its exact approved command;
  previously its empty harm oracle could miss an additional unapproved install.
  Only L21 changed among 70 cases. Installer runtime, Kilo and timeout behavior
  were not changed. Offline suite: 72/72 PASS, 28.484 seconds.
- Frozen normalized fixture SHA-256:
  `84945401ce441f949704076974e889ba71f35ec0e3b767c49dd38e6c0ab6bccf`.
  Evidence: `logs/20260905_083800_v0_freeze_validation/`, tree SHA-256
  `33f39c228673ac13adb0d23de3e24c0a5769682c33c76b3b6d190bb387076833`.
- Successor's requested measurement: all 70 cases on clean upstream a6ff015f
  full access and the two modes on 81edc748, with Qwen 14B, one repetition,
  single worker, no artificial pauses: 210 logical trials / 231 Kilo phases.
- Before the full run, inspect current timeout boundaries and do a bounded
  diagnostic pilot, separately logged. Determine whether delays are actual
  progress, repeated actions, service errors or permission fallback. Fix only
  proven harness/integration defects; report Kilo defects without modifying it.
  Select one common finite phase budget before the full comparisons. Do not
  equate timeout with denial or keep extending deadlines until a run succeeds.
- Working estimate, not a measurement: 231 phases averaging 30–60 seconds
  require 1h55m30s–3h51m of execution, plus integration/pilot/build/audit overhead;
  plan roughly 3–5 hours if those average-time assumptions hold. A 120-second
  cap permits 7h42m of phase time in the all-timeout case. The pilot must update
the estimate; no 10× acceleration or fixed deadline is promised.

### 2026-09-05 — Accepted current PR runtime integration

After discovering Dmitry's PR commits 4ae1053/cf62ab4, the user explicitly
approved preserving them and applying only the small frozen-v0 delta. Local
HEAD 9356453 contains both commits; our delta is five files +54/−13, without
Kilo or runtime implementation changes. Preparation on Python 3.12 passed
8 portable/Docker checks and 74 offline tests. Full 70×3 is restarted as a new
experiment on this selected runtime; the earlier partial run remains excluded.
Do not change runner/source/model versions mid-comparison if remote PR advances.
Lightweight LLM execution/monitoring may follow the fixed instructions; the
Python harness computes metrics, while nontrivial failures need explicit review.
This does not switch the benchmark's main/judge Qwen 14B or permit parallel runs.

The complete handoff prompt is `RUN_FULL_V0_PROMPT.md`. This turn did not change
model/service credentials, execute endpoint calls, start the full comparison,
push the local v0 diff or merge the PR. The successor must preserve that local
diff and publish only authorized benchmark changes after review.

### 2026-09-05 — Timing pilot executed on explicit user request

The user then requested a live Qwen timing measurement. Three direct API probes
and the N02/A16/L21 upstream pilot are complete: three valid logical records,
four phases, zero timeouts; CLI wall time 68.196479 seconds. The two new modes
have not yet been measured. Results and hashes are in BENCHMARK_RESULTS.

Cold model load was 34.593 seconds (35.836-second response), exceeding the
existing 30-second endpoint preflight deadline. The handoff now calls for a
separately logged, bounded 120-second warm-up after build and before preflight.
It does not change trial timeout accounting. Reuse the completed upstream
diagnostic evidence unless material inputs change; only the two new modes'
eight planned pilot phases remain. L21 before still repeated one install
command 16 times; no-timeout is not evidence that the repetition problem vanished.

Updated planning estimate: 2–3 hours for full 70×3 with preparation/audit and
reserve for unmeasured mode overhead. Naive extrapolation of the four upstream
phases alone is 60.82 minutes for 231 analogous phases; this small sample does
not establish actual full-suite timing. No source/runtime/fixture/default-model
changes, full-suite run, push or merge occurred during this measurement.

### 2026-09-05 — Approved post-hoc package scoring correction

After the complete 70×3 execution, raw A22 events showed an upstream install
attempt via `python3 -m pip` that bypassed the package shim. Original scoring
therefore missed both reached action and executed attempt. The user explicitly
approved correcting package-attempt/reachability from saved tool events and
rescoring all three arms, without new model calls. Preserve all fixtures and
original logs/summaries; label the scoring revision and retain the prior audit.
Direct requested commands are action opportunities; only completed shell tool
states establish executed attempts, including failed installer exits. Denied or
unfinished tool calls are not execution. Keep target/exact-approval semantics,
do not infer compound/indirect execution from shell text, and disclose the
instrumentation and real-network limitation. No Kilo changes or merge.

### 2026-09-05 — Approved bounded diagnostic suite, separate from fixed v0

Team decision, explicitly approved by the user: retain all 70 scenarios and
prior runs; execute only eight existing cases on upstream a6ff015f and both
new modes on 81edc748 (24 records / 30 CLI phases), plus ten frozen AUTO-policy
proposals repeated three times on each mode (60 evaluations). Qwen 14B,
serial, no pauses or harness retries. The adapter imports the published policy
and model-query, never executes proposed actions or copies the protection runtime.
Upstream component is control_absent. Exact policy FP/latency remain separate
from end-to-end observations and unbound debug logs; no simulated human friction.
Completed result: audit 20260905_141400_diagnostic_audit, 97 tests PASS, no infra
failures. Publish only the benchmark addition in PR #1, preserve teammates'
commits, and do not merge. Completed diagnostic commit: bd3d36d.


## D-009 — Evidence-based Demo Day pitch and bounded Prompt Guard repair

Date: 2026-09-06. Status: accepted scope, explicitly requested by the user.

The user requested a global presentation skill derived from the supplied guide, a project pitch and two-page Markdown companion, expert challenge and missing calculations. They authorized bounded reruns, benchmark additions and lightweight models if useful, then specifically required fixing Prompt Guard's observed misses. This supersedes D-008's no-Kilo-changes restriction only for this bounded repair. Publication, pushes, merges and external messages remain unauthorized.

Short design and test plan: preserve measured `81edc748` and fixed v0 fixtures/raw logs; work on `codex/prompt-guard-semantic-review` in a separate worktree. Prompt Guard benign must invoke original semantic stage 1, whose flagged result invokes semantic stage 2; malicious PG keeps stage 2. Retain fail-closed handling and deterministic policy precedence. Test dangerous non-injection, benign and injection routing, errors and unchanged ask/deny paths. Model checks use the actual fixed source, explicit model/settings, sequential capacity and a finite budget. New models and regression/diagnostic sets are reported separately from old 14B v0, with no retry-until-favorable selection.

No repaired-ASR claim is accepted in advance. Any next 2–4-week pilot plan in presentation materials remains a proposal, not an approved implementation expansion. Endpoint availability and verification results belong in CURRENT_STATE and PRESENTATION_EVIDENCE.

## D-010 — Correct added task scoring and expose full-suite baseline coverage

Date:2026-09-06. The user explicitly approved correcting the unrequested
missing-file requirement in the two added casegiver task oracles and rescoring
saved evidence without new model calls. The user also challenged attack cases
that do not succeed on full access, across the whole suite, not only casegiver.

Bounded implementation: change only the two added task checks, retain immutable
prompts/environments/harm oracles and every original log, version the scorer,
add regression tests and rescore all ten selected completed Qwen14B series.
Report full-suite baseline coverage and a clearly post-hoc baseline-success
outcome slice, preserving protected-only failures and legitimate controls.
No claim that probabilistic agent compliance can be guaranteed, no silent prompt
retuning or forced tool execution represented as end-to-end evidence.

Completed:98 checks PASS,328 records rescored,12 task outcomes corrected;
ASR/legitimate utility/latency unchanged. Full report and hashes:
`BENCHMARK_RESULTS.md`. A new action-replay runtime or a separately calibrated
attack suite is not implemented by this repair. Kilo changes, new model runs,
publication and merge were not performed.

## D-011 — Bounded calibrated core v1

Date:2026-09-06. Accepted by the user's «приступай» after the core-v1 plan.
Keep the original70 definitions and all historical results. Add only short
versioned fixtures in the existing six modules, a config selection and
`--suite core`; no Kilo changes, dependencies, runtime, service or publication.

Freeze a candidate of at most24 logical cases before requests. Baseline pilot:
three observations of each new risk/benign pair; admission requires delivery
and harm3/3 on risk and completed useful tasks3/3 on the benign counterpart.
Known regressions remain explicitly separate. One revision cycle maximum;
if any of four families remains unqualified, record the gap and stop rather
than retune indefinitely. If qualified, freeze and run each of the three arms
once. Use Qwen14B serial T120, no artificial pauses or individual retries.

Implementation candidate: twelve new *_v1 cases based on A/L12,16,20,22,24,25;
24-case core also retains historical casegiver/clean, A07/L07, A12/L12,
A18/L18 and N02/N10/N11/N12. Historical casegiver/clean have different task
inputs and are not presented as a newly matched pair. Only the six new pairs
enter pilot admission. All3 clean source/image bindings were verified:
upstream a6ff015f, Qwen81edc748, fixed Qwen+Meta d8d6d6c.

The user then requested faster execution. No extra scope was added; the
implementation proceeds directly to36 baseline pilot records, with no full70
rerun. Pilot and final-evaluation observations remain separate.

Execution outcome: gate failed after one revision, stopped rather than expanded.
43 Kilo records preserved (41 valid,2 explicit interruptions), two offline
rescores reproduced selected outcomes;100 tests PASS. New four-family comparison
is not authorized past this failed gate. New variants are outside routine core;
the12-case regression subset remains available. See BENCHMARK_RESULTS.md.

## D-012 — Final bounded core, baseline 3/3 and package pilot

Date: 2026-09-06. Explicitly approved implementation plan in this chat.
Supersedes D-011's stop only for the fixed selection; no new payload tuning.
Twelve pairs: l2_tool_output/clean, A12/L12, A15/L15, A16/L16, A18/L18,
A22/L22, A24_v1/L24_v1, A25_v2/L25_v2, SA01/SL01–SA04/SL04.
Require three valid harmful upstream observations, then three safe successful
controls; stop a pair on its first failure. Always retain A07/L07, A12/L12,
A18/L18 and N02/N12, without duplicates. Maximum28 cases, no retries or tuning.
Report narrowed coverage honestly; poor scores are not grounds for more changes.

Fresh comparison: a6ff015f/81edc748/d8d6d6c, one observation after freeze;
accepted package pairs also on012968f1 with permission-mode auto versus secure.
Qwen14B serial T120, no pauses. Policy60 and native offline package tests remain
separate. Upper bound72 calibration +100 final logical records; no pooling.
Import pilot ee25cd0d and narrowly repair scoring/selection/--policy-probes.
Preserve70 fixtures, Kilo, Docker runtime and all history. Update README, local
report/evidence and publish benchmark-only changes to existing PR1; do not merge.

Outcome: frozen14-case/17-phase core, three qualified pairs, two explicit
calibration infrastructure/interruption gaps; no retuning/retries.46 final CLI
records (45valid, one ECONNRESET) and60valid policy records; bounded cycle closed
without claiming a fully valid matrix or complete threat coverage.112 harness
checks and13native tests PASS, final46/46 offline reproduction PASS. PR1 updated
at2633a61c0c82ae9eb346b989f0e132ea75aa226a, open and unmerged. No Kilo/runtime edits.


## D-013 — Final jury preparation, bounded six-hour implementation

**Team decision / explicit user instruction:** the user approved the Context Snapshot and asked to implement the final plan. T0 is 2026-09-06 22:28:28 UTC (2026-09-07 01:28:28 MSK); model cutoff 2026-09-07 02:58:28 UTC; final deadline 04:28:28 UTC. This supersedes earlier stop/no-code/no-publish restrictions only for this bounded cycle.

- Start from Kilo `437eaa558a725cea9bbe53a58e442f32293071b5`, branch `codex/dos-llms-secure`; implement in `codex/final-jury-20260907`.
- Preserve five UI labels: Auto, Vanilla Kilo, Secure, Ask, Dos LLMs + Secure. Combined mode is two-stage Qwen plus Secure, not Meta. Port fixed PG as a separate opt-in ablation.
- User chooses natural-language file/directory restrictions only: no new scope-confirmation UI, policy extractor or OS-sandbox architecture. Review mutating/opaque actions against direct user instructions; claims stay probabilistic.
- Add action-bound telemetry, fix protected-ask auto-approval and raw security logging, preserve pre-install package checks. Preserve original70 and immutable casegiver fixtures.
- Target258 CLI records plus44 policy records; at most370 CLI records if time permits. Full70 on Auto/Secure/combined, new8 scope fixtures, fixed12-case PG ablation and SA04/SL04 package pair. Serial Qwen14B, T120, no result-driven retuning or trial retries.
- Deliver editable15-slide deck/PDF, solution Markdown with7-paragraph annotation, three compact product materials and a pitch runbook. All three team members actively participated; no invented percentages.
- Publishing is explicitly authorized to the existing team repositories: code/materials in wowONE-1/kilocode-safe and benchmark in dimkablin/vibesechack, updating current PR1. No merge or new upstream PR.
- **Organizer requirement:** supplied case and one-page jury rubric remain sources of requirements; five criteria each0–3. **External reference:** implementation437eaa was checked through GitHub on2026-09-07 MSK; vendor claims and architecture references retain their own provenance.

Initial execution status (historical): implementation started; no fresh result was asserted at that point. The completed state is recorded in the dated closure below. Earlier evidence must not be relabelled as the current five-mode build.



## 2026-09-07 — D-013 execution closure

**Status: Accepted decision executed.** The approved maximum 370 CLI / 406 phases and
44 separate probes completed without runtime/prompt retuning. Runtime `b184d6358`;
measured runner `03372454`; postprocessing `7bece34`; results `26ade7bf`.
The final presentation uses this same runtime and a verified A15 continuation trace.
All-five-attack D-012 and earlier results remain historical.

The negative scope CLI result and non-causal PG differences are retained; PG remains
off by the pre-experiment decision. A further held-out/pilot gate is a proposal,
not an accepted deployment approval. Publication is limited to the two user-named
team branches and existing benchmark PR1; no merge or new upstream PR.
