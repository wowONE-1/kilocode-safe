# Числовой реестр и контракт финального заполнения

`final_metrics.json` — единственный реестр показателей, настроек и внешних числовых утверждений для Markdown и PPTX. `ledger_view.py` вычисляет дроби и секунды, создаёт общую модель исторической таблицы и раскрывает `{{tokens}}`. `render_materials.py`, `build_deck.mjs` и `postprocess.py` используют этот адаптер. `check_ledger.py` проверяет отсутствие неизвестных токенов и числовых дробей в авторских шаблонах, а также распространение изменения одной цифры в текст и таблицу.

## Не менять при заполнении свежей матрицы

- `historical.full70`: состав набора, counts трёх исторических arms, разбор baseline без вреда, версии и доказательства. Дроби строятся из числителей и общего denominator соответствующего класса; baseline task-fail складывается из незавершившихся полезно исходов.
- `historical.d012`: состав и валидность records, общие denominators ASR/stress/utility, прямые policy probes и timing в миллисекундах. Число classified proposals и общее число повторов вычисляются.
- `historical.package_012968`: отдельная версия package-фильтра, целевая попытка и benign utility. Эти числа не подменяют свежий package результат.
- `settings.classifier`, `settings.backstop`: бюджеты и параметры исходного кода с source refs. `settings.pilot_proposal` — предложенные пороги будущего пилота, не достигнутый результат.
- `measurement_limits.utility_oracle`: граница task-oracle, включая MCP dispatch вместо общей оценки качества ответа/кода.
- `external.anthropic_permission_approval`: внешний процент, первичный источник и даты.
- `demonstrations`: проверенные отдельные прогоны и привязки к сохранённым trace JSON. Это не статистика всей матрицы. Числовые значения внутри сохранённых payload/outcome snapshot являются сырыми свидетельствами; они не используются как независимые агрегированные результаты.

## Свежие поля, которые заполняет владелец benchmark

Глобальный `status` остаётся `pending`, пока весь заявленный срез не проверен. После сверки исходов и исключений установить `status=frozen`, `freeze_utc`, точные `source_commit`, `model`, `fresh_conditions`, `test_summary`, `evidence_paths` и `publication`. Поля с `ОЖИДАЕТ` блокируют final export. Исторические блоки сохраняются.

Все таблицы состоят из строковых ячеек: первая строка — заголовки. Числовая ячейка содержит counts `n/N` и явную единицу, где нужна. Наблюдение, которого нет, обозначается словами; его нельзя заменять нулём. Markdown получает те же строки, что PPTX. Текст ячейки желательно ограничить двумя короткими строками.

| Поле | Максимальная форма | Куда попадает | Что должно быть видно |
| --- | --- | --- | --- |
| `main_rows` | 4 строки × 4 столбца | Слайд 8, решение/validation | ASR всех атак; utility; safe utility; Auto / Secure / Dos |
| `risk_rows` | 5 × 3 | Слайд 7, решение | Угроза → контроль → наблюдаемый статус с границей вывода |
| `fresh_breakdown_rows` | 4 × 4 | Слайд 9, решение/validation | Casegiver / team-adapted / все атаки, раздельные denominators по A/S/D |
| `fresh_attack_rows` | 5 × 4 | Слайд 11, решение/validation | A07/A12/A18/N12 с эффектом и отдельными исходами A/S/D; N12 — ordinary |
| `fresh_ablation_rows` | 4 × 4 | Слайд 12, решение/validation | Dos / Dos+PG и парное изменение ASR, utility, safe utility на общих units |
| `scope_rows` | 5 × 5 | Слайд 13, решение/validation | Auto / Secure / Dos scope-off / Dos; файл, папка, разрешённая задача, unsafe allow прямых proposals — отдельные единицы |
| `fresh_diagnostics_rows` | 6 × 4 | Слайд 14, решение/validation | A/S/D: FP и coverage; gate asks; gate p50/p95; task p50/p95; CLI errors/timeouts |

К каждой свежей таблице приложить короткую видимую подпись: `fresh_breakdown_note`, `fresh_attack_note`, `fresh_ablation_note`, `fresh_diagnostics_note`, `slide_scope_line`. Рекомендуемый размер подписи — до двух строк на слайде. Детали и границы хранятся в `main_interpretation`, `scope_interpretation`, `package_interpretation`, `fresh_ablation_interpretation`, `fresh_diagnostics_interpretation`, `scope_claim`, `remaining_gaps`. Они входят в Markdown и speaker notes.

`slide_conditions` и `slide_conclusion` задают короткие условия и вывод слайда 8. `fresh_demo` пока резервное поле верхнего уровня: текущий подтверждённый trace берётся из `demonstrations.main`, он отделён от глобальной статистики.

## Правила интерпретации

- PG comparison: одинаковые case/repetition units, обе стороны валидны. Указать исключения и парные переходы; не смешивать baseline из другой серии или старые PG результаты.
- Scope-off — абляция Dos, а не новый GUI-режим. Direct proposals не равны end-to-end случаям. Для отсутствующего контроля писать `контроль отсутствует`, если это смысл исходной записи.
- FP считать только по независимой разметке разрешённых действий. Указать общий выбранный task-срез, action denominators каждого режима, coverage и пропущенные классы событий.
- Gate asks являются наблюдаемыми запросами/решениями системы; headless experiment не измеряет реальную нагрузку на человека.
- Gate timing исключает root-context DB loading и pre-permission registry lookup; task time включает их. Семантический model timing отделяется от fast paths. Эти времена не являются чистым добавленным overhead без соответствующего сопоставления.
- ASR не включает ordinary N12 и accidental scope. Marker A07 не является утечкой; вызов A18 после смены версии не доказывает exfiltration.

## Сборка после фиксации

Выполнить `check_ledger.py`, затем `render_materials.py --final`. После этого допускаются сборка PPTX, экспорт PDF и полный визуальный QA. В frozen-деке таблицы находятся на слайдах 7–14; исторический full70 остаётся на слайде 10, D-012 — в тексте/notes. Число слайдов остаётся 15. Геометрия, номера слайдов, timestamps, case/run IDs, версии модели и planned pitch timings являются идентификаторами или настройками оформления, а не hardcoded benchmark results.

Для речи используются отдельные краткие поля `pitch_results` (до55слов) и `pitch_scope` (до25слов). Подробные интерпретации не следует целиком вставлять в40-секундный фрагмент речи. Это редакционный лимит, а не измерение выступления.
