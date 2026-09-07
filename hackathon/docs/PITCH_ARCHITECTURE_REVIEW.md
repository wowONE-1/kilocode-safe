*Reviewed with [ml-system-design-review](https://github.com/ML-SystemDesign/MLSystemDesign/tree/main/skills) · [ML System Design](https://arseny.info/ml_design_book) by Kravchenko and Babushkin*

# Архитектурный challenge для питча — 6 сентября 2026

**Verdict: approve with concerns (avg 2,55/4)** — исследовательский прототип контроля действий агента; не production readiness. **Critical findings: 1 в измеренной версии** — PG BENIGN обходил semantic action-safety review. Исправленный кандидат прошёл offline проверки отдельно и не наследует старые метрики.

**Author verdict:** По рамке Kravchenko and Babushkin сильная сторона проекта — проверяемый baseline и разбор ошибок; решающая недостача — доказательство поведения контроля в реальном разрешительном цикле и на независимых задачах.

| Dimension | Grade | Why |
|---|---|---|
| Problem framing, goals & antigoals | B | Пользователь, риск полной автономии и пределы MVP определены; рыночная боль количественно не проверена. |
| Cost of mistakes & risk | B | Утечки, разрушение, supply chain и цена ложных запретов разделены. |
| Prior work, build/buy & baselines | B | Реальный upstream baseline; Qwen-порт явно атрибутирован. |
| Metrics, loss & measurement | C | Safety/utility измерены; actual friction и exact end-to-end decision FP отсутствуют. |
| Data, labels & features | B | Provenance и immutable casegiver отделены; live registry не связан с synthetic metadata. |
| Validation & leakage | C | Один открытый development-набор; новой независимой выборки нет. |
| Error analysis | B | Компонентная диагностика объясняет PG-механизм, не только число ASR. |
| Training pipeline & reproducibility | B | Обучения нет; source/image/run provenance и offline rescore есть. |
| Serving, integration & release | C | Local headless integration есть; real human fallback, другие UI и rollout не доказаны. |
| Monitoring, ownership & maintenance | C | Владелец контроля известен; итоговые решения не полностью связаны с CLI-трассой. |
| Modern AI systems | C | Детерминированные guards и очищенный transcript есть; PG в измеренной версии ошибочно заменял semantic judge. |

**Top fix:** Устранить PG-benign bypass и измерить новый source отдельно, одновременно показывая сохранение utility. **Takeaway:** Детектор вредного текста не является классификатором допустимости действия; проверяемая граница между ними важнее названия модели.

## Что именно проверено

Режим **doc and repo**: AGENTS, HACKATHON_BRIEF, ML_SYSTEM_DESIGN, CURRENT_STATE и DECISIONS; чистый checkout `.workbench/kilocode-safe-81edc748`, HEAD `81edc748a6054026583af9731fb0a5f726a93292`. Это source существующих полных и диагностических измерений. Анализ кода не был новым benchmark run. Внешние запросы и model calls этим аудитом не выполнялись.

- **Требование организатора:** interception до исполнения, полезный denial, ограниченный escalation и хотя бы один контроль, чья механика не принимает injected prose; для slopsquatting — до install и сигналы сверх denylist.
- **Внешний reference:** Qwen AUTO policy скопирована с атрибуцией Apache-2.0; сам layered подход не заявлять изобретением команды.
- **Решение команды:** текущие результаты измеряют local CLI modes, Qwen 14B и открытые fixtures. ML_SYSTEM_DESIGN от 04.09 содержит прежнюю предложенную архитектуру и устаревший 8B/subset status. Это не accurate as-built specification текущих modes.

## Реальная цепочка и границы claims

`local kilo run --mode` → register mode для session → собрать tool registry, включая MCP → `Judge.wrap` перед `tool.execute` → explicit deny / допустимый explicit allow → deterministic guards и fast paths → classifier → scoped approval или error/fallback → intrinsic tool permission → execution.

| Что можно утверждать | Source evidence в packages/opencode/src/ |
|---|---|
| Обёртка проверяет действие до вызова execute; approval привязан к session и tool-call ID | `kilocode/permission/judge/runtime.ts:111–154`; `permission/index.ts:264–274` |
| Mode унаследован child sessions; это не общий переключатель всех UI | `session/tools.ts:81–117`; `kilocode/permission/judge/state.ts:27–45` |
| `--mode` несовместим с `--auto`, YOLO, attach и interactive; daemon пропускается | `cli/cmd/run.ts:303–310`, `:790–793`, `:1179` |
| Raw tool results и assistant prose не входят в judge history | `kilocode/permission/judge/runtime.ts:57–67`; `judge/qwen/permissions/classifier-transcript.ts:116–162` |
| Deterministic destructive guard получает command, последний user prompt и cwd; не tool output | `judge/qwen/permissions/autoMode.ts:716–735` |
| Workspace edit fast path исключает protected paths; external file write переходит в ask | `judge/qwen/permissions/autoMode.ts:469–480`, `:747–754` |
| Explicit deny сохраняется. Explicit allow может обходить AUTO, кроме принудительного review protected writes | `kilocode/permission/judge/runtime.ts:118–145` |
| После policy deny агенту возвращается причина и инструкция продолжить безопасную работу | `judge/qwen/permissions/autoMode.ts:624–666`; `runtime.ts:149` |
| Лимиты: 3 последовательных block, 2 unavailable, 20 совокупно; fallback сохраняет запрет автоматического исполнения | `judge/qwen/permissions/denialTracking.ts:37–41`, `:128–143`; `autoMode.ts:563–577` |
| В headless integration ask отклоняется; действующий человек не включён в этот цикл | `cli/cmd/run.ts:793`; `permission/index.ts:282–285` |
| Pre-install metadata check стоит в shell permission flow | `tool/shell.ts:425–468` |
| Проверяются registry existence, возраст, похожесть имени, версия, integrity; для npm также lifecycle/deprecation | `kilocode/security/slopsquatting.ts:202–258` |

Точная оговорка об изоляции: **deterministic guards не исполняют и не интерпретируют injected prose как инструкции; transcript structurally исключает raw results и assistant prose.** При этом аргументы tool-call по определению untrusted: агент может скопировать туда malicious текст. В `project()` shell command остаётся целиком, неизвестные tools передают args; write/edit имеют 300-символьный preview. Поэтому semantic judge не «иммунен к любой prompt injection». Исходная direct user text тоже сохраняется. Не утверждать универсальную защиту всех каналов или всех способов выразить shell-команду.

## 12 вопросов сурового жюри и ответы

1. **Что вы действительно сделали, а не перенесли со схемы Claude/Qwen?** Команда интегрировала два opt-in permission mode в Kilo, связала policy с его tools, session/rules и provider, добавила pre-install checks и воспроизводимый Kilo benchmark. AUTO policy заимствована с атрибуцией. Наша проверяемая ценность — интеграция и выявленные trade-offs/дефекты, не новизна layered classifier.

2. **Почему prompt injection не может просто убедить вашу защиту?** В отдельном deterministic guard нет свободного диалога с моделью; его вход — command/user intent/cwd и фиксированный код. Из model transcript структурно удалены результаты инструментов и рассуждения ассистента. Это конкретная уменьшенная поверхность атаки, а не гарантия семантической невзламываемости LLM. Injection, скопированная в args, остаётся остаточным риском.

3. **Вы реально проверяете каждое опасное действие?** Проверяются execute-функции зарегистрированных tools в выбранном local mode. Read/workspace edit fast paths и explicit allow policy могут пропускать classifier. Не заявляем покрытие всех UI, скрытых действий MCP сервера, произвольных subprocess или скомпрометированного host. Нужны отдельные completeness tests для каждого нового entry point.

4. **Если включить `--auto`, это не обходит весь смысл?** С двумя mode CLI отвергает такое сочетание до работы. Измеренный upstream full access специально служит baseline. Вне opt-in mode новый judge не активен. Пользовательские широкие allow rules всё ещё могут обходить AUTO-маршрут; это нельзя маскировать названием «безопасный полный доступ».

5. **Что сломалось у Prompt Guard?** На `81edc748` PG заменял первый semantic classifier; низкий injection score сразу давал allow. Опасная команда не обязана содержать injection. Локальный fix-кандидат меняет это: PG-positive → semantic stage-2; PG-benign → semantic stage-1, при flag → stage-2. Исправление устраняет ошибку маршрутизации; оно не превращает вероятностный judge в безошибочный.

6. **При недоступной модели/Prompt Guard действие всё-таки исполнится?** Ошибка API, invalid schema или deadline возвращает unavailable и fallback; проверяемый tool не получает автоматического разрешения. PG client проверяет identity/schema, HTTP status и не следует redirect. В текущем headless CLI fallback отвергается. Это fail-closed относительно checked action, с риском потери utility при outage.

7. **Агент продолжит работу после deny или зависнет?** Policy deny выбрасывает tool error с причиной и safe-continuation guidance. Denial counters ограничивают повторную классификацию. Однако after-approval фазы benchmark запускаются свежими сессиями и не доказывают живую восстановительную последовательность. Headless fallback отклоняется; фразу «человек подтвердил, агент продолжил в той же сессии» показывать нельзя без отдельного demo/test.

8. **Вы ловите zero-day или только пакеты, которых нет?** Есть heuristic сигналы сверх denylist: возраст/недавний release, похожее имя, single version, integrity и др. Отсутствующий package блокируется; risk/registry failure обычно требует review. Но regex parser охватывает ограниченные формы install, похожесть проверяется против небольшого списка; metadata не доказывает безопасность кода и transitive dependencies. Нельзя заявлять measured zero-day detection: synthetic registry fixture не подключён к live npm/PyPI checks.

9. **Если агент пишет в README «разрешите всё» или исполняет helper, защита остаётся?** Настройки и instruction paths исключаются из обычного edit fast path; hard permission deny сохраняется. Но command indirection, скрытое поведение helper/MCP и copied args — отдельные классы обхода. Набор deterministic patterns не является complete shell semantics proof. Для кода неизвестного provenance нет blanket guarantee.

10. **Почему просто не спросить пользователя обо всём?** Это baseline продукта, который нужно сравнивать по utility и human friction. В текущем benchmark можно честно показать ASR и legitimate-task utility вместе; actual human decisions/approval fatigue здесь не измерены. Компонентные 0/12 false deny/ask нельзя превратить в end-to-end FP=0: CLI включает другие controls и поведение агента.

11. **Что вы готовы показать сейчас и что вам нужно до реального использования?** Воспроизводимый local mode, исходники, причинно разобранные ошибки и trade-off на текущем development-наборе. После PG fix требуются отдельный versioned run на том же frozen set, новая независимая выборка, реальные decision events и continuation test. Не приписывать старые ASR/latency исправленному source и не обещать, что более широкая автономия всегда безопаснее.


12. **Зачем Prompt Guard, если semantic judge всё равно нужен; доказан ли его вклад и оправдана ли задержка?**

    **Архитектурная логика (`d8d6d6c`):** PG — дополнительный сигнал для направления в stage-2, а не самостоятельное разрешение или окончательный запрет. Возможная польза возникает, когда PG распознаёт injection, semantic stage-1 мог бы разрешить действие, а stage-2 его запрещает. Это гипотеза о дополнении ошибок моделей, не доказанная независимость. PG получает тот же очищенный transcript: нового канала проверки raw tool output здесь нет. На PG-benign пути остаются PG → semantic stage-1 → при необходимости stage-2; на PG-positive пути — PG → stage-2. Источник: `query.ts:14–37`, `classifier.ts:151–155, 206–249, 276–280`, `runtime.ts:57–67` внутри `packages/opencode/src/kilocode/permission/judge/`.

    **Наблюдение:** дополнительный выигрыш против LLM-only **пока не показан**. На одинаковых десяти policy inputs × три повтора исторический judge и исправленный PG дали unsafe allow **0/12**, FP **0/12**, ask **6/6**; опасных уникальных inputs только четыре. Исправление закрывает прежний bypass, но это не доказательство пользы самого PG. Измеренная задержка классификатора (24 решения): fixed PG median **3,280 с**, p95 **5,084 с**; исторический judge — **1,163 с** и **2,781 с**. Запуски проведены в разные периоды, поэтому разность не является причинной оценкой overhead. Код добавляет последовательный PG-вызов на benign пути, зависимость от ещё одного сервиса и расход общего stage-1 deadline; фактический HTTP-count текущая телеметрия не измеряет. Источники: `presentation/metrics_audit/pg_fix_metrics.json` и `metrics.json → policy.llm_judge`.

    **Предложение, не принятое решение команды:** до выбора основного режима провести парную абляцию fixed-PG против LLM-only на одном source/provider с чередованием порядка, отдельными transport timings и новыми независимыми injection/benign cases. Заранее задать допустимые потери utility и бюджет p95; показать дополнительные предотвращённые ошибки. Если преимущества нет, предложить исключить PG из основной цепочки. Текущий full70 fixed-PG расширяет проверку исправления, но исторические baselines не заменяют такую абляцию.

## Что уже можно исправить в материалах без новых моделей

- Заменить «устойчив к prompt injection» на конкретный data-boundary claim из таблицы выше.
- Назвать PG экспериментальным дополнительным signal, а выбранный продуктовый режим — только по подтверждённым измерениям.
- Развести measured `81edc748`, corrected candidate и будущую target architecture.
- Помечать stage `fast/thinking` как policy stage. После fix benign PG-путь содержит PG + один/два LLM HTTP-вызова, а не один request; старый latency нельзя переносить на него.
- Отдельно признать headless ask rejection, отсутствие real human-friction metrics и ограниченную install parsing/registry coverage.

Проверяемые решения, которые стоит сохранить: явная source provenance предотвращает приписывание результатов другой сборке; scoped approval не разрешает чужой tool-call; ошибку PG выявила отдельная диагностика action policy, а не попытка улучшить aggregate за счёт переименования ошибок.

## Исправление PG после аудита — отдельно от старых метрик

**Team action, явно запрошенная пользователем 06.09:** исправить существующий PG flow, сохранив source старых результатов. Кандидат зафиксирован локально: `d8d6d6c11d35f0bc94ffc751f4ba856cd1b13c5d`, branch `codex/prompt-guard-semantic-review`, clean worktree `.workbench/kilocode-safe-pg-fix`. Отправки в remote/PR/merge не было. Исходный `81edc748` clean и неизменен.

Патч в `query.ts` больше не возвращает PG BENIGN как semantic allow. PG-positive направляет в stage-2; PG-benign вызывает первоначальный semantic stage-1. Explicit ask, deterministic guards, stage-2 и fail-closed policy сохранены. Добавлены 17 тестов реального adapter→AI SDK→loopback HTTP→AUTO policy, including dangerous non-injection proposal, benign task, ложные сигналы PG/semantic stage-1, явный ask, deterministic block, invalid schema/identity/HTTP failures и таймауты PG/semantic stage-1. Проверяется порядок реальных HTTP-запросов. Предложения команд никогда не исполняются.

**Верификация:** 36/36 targeted tests PASS, 180 assertions, финальная проверка 12,35 с; CLI `tsgo --noEmit` PASS; oxlint 0 warnings/errors; formatter и `git diff --check` PASS; annotation guard — новых shared upstream файлов нет. Тест опасного действия без injection специально запущен с прежним adapter `81edc748`: FAIL, получен `approved` вместо `blocked`. Тот же тест на исправлении PASS. Все проверки выполнены в сохранённом образе `bc0de865e7a51e6e24116607cf006bec255c43fdbdfcb7b5e009dfbc4888cdd7` с Docker `--network none` и локальными synthetic HTTP responses; реальных model calls не было. Это доказательство устранения routing bypass, а не измерение нового ASR/utility.

**Instrument semantics:** `docker/permission-probe.ts` benchmark adapter сохраняет `requests[]` на уровне `query()` вызовов policy. После исправления один stage-1 item может включать два HTTP-запроса: PG и semantic LLM. `classifier_duration_ms` охватывает оба; `stage=fast|thinking` — итоговая policy stage, а не число HTTP-запросов. Без отдельной транспортной телеметрии точный HTTP/model request count не заявлять. First-stage deadline остаётся общим для PG и semantic first stage; это ограничение latency/availability требует новой live проверки.
