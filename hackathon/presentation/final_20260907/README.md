# Исходники итоговой презентации и материалов

Сборка использует `@oai/artifact-tool`, пользовательский шаблон Inter, реальные фотографии команды и предоставленный скрин режимов. Пользовательские изображения сохраняют исходные байты. Схемы, таблицы и текст остаются редактируемыми объектами PPTX. По запросу пользователя финальный PPTX экспортируется без заметок докладчика; сценарий защиты остаётся отдельным файлом `output/final/PITCH_RUNBOOK.md`.

Основные данные новой оценки находятся в `source/final_metrics.json`. Итоговая презентация показывает результаты финальной сопоставимой матрицы; исторические full70/D-012 сохраняются в реестре и материалах исследования. Значение `status=frozen` разрешено только после аудита результатов. Финальный экспорт Markdown откажется при незаполненных полях `ОЖИДАЕТ`.

## Воспроизведение

Используйте bundled runtime из `load_workspace_dependencies`. Python: `RUNTIME_PYTHON`. Node: `RUNTIME_NODE`. Пакеты Node: `RUNTIME_NODE_MODULES` (обязательно для финальной проверки импорта PPTX). Presentations skill: `PRESENTATIONS_SKILL`. Для другого расположения проекта можно задать `PROJECT_ROOT`. `PRESENTATIONS_SKILL` обязателен для сборки PPTX и указывает на каталог skill с `container_tools`; путь нельзя угадать для другого компьютера. Если `RUNTIME_PYTHON` не задан, сборка использует `python3` из PATH с необходимыми зависимостями.

1. Свяжите каталог `node_modules` рядом с этим README с каталогом bundled Node packages.
2. Выполните `"$RUNTIME_PYTHON" presentation/final_20260907/source/render_materials.py --final` из корня проекта (в опубликованной копии — из `hackathon/`).
3. Выполните `"$RUNTIME_NODE" presentation/final_20260907/source/build_deck.mjs` из того же каталога. `--draft` экспортирует только private build. `--draft --preview-fresh` позволяет проверить новые таблицы до глобального freeze, не меняя статус реестра и не создавая final artifact. `FINAL_STEM` выбирает имя новой финальной ревизии. Финализатор не перезаписывает существующий final PPTX.
4. Экспортируйте PPTX в PDF штатным bundled LibreOffice. Не используйте desktop LibreOffice пользователя. Путь `soffice` предоставляет `load_workspace_dependencies`; используйте отдельный профиль внутри private build.
5. Отрендерите все страницы Poppler и проверьте каждую. Сохраните QA отдельно от итоговых файлов. `source/check_annotation.py` проверяет ровно семь абзацев аннотации и размещение на одной A4 при 11 pt со включённым `fonts/Inter-variable.ttf`; для собственного TrueType-шрифта доступен `ANNOTATION_FONT`. ReportLab использует обычное начертание по умолчанию; заголовок выделен размером. После финального экспорта выполните `source/check_pptx_privacy.py PATH_TO_FINAL_PPTX`.

Итоговый комплект находится в `../../output/final/`: PPTX, PDF, текст решения и три продуктовых материала плюс сценарий защиты и автономная HTML-демонстрация. Служебные каталоги build, renders, node_modules и локальные runtime profiles не нужны для публикации исходников.

Для PDF обязательно настройте Fontconfig на включённый Inter; иначе LibreOffice может подставить другой шрифт даже при корректном PPTX. Следующий шаг создаёт только private build configuration из текущего расположения проекта. Выполните его перед экспортом PDF:

```sh
"$RUNTIME_PYTHON" - <<'PY'
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree
base = Path("presentation/final_20260907").resolve()
build = base / "build"
build.mkdir(exist_ok=True)
root = Element("fontconfig")
SubElement(root, "dir").text = str(base / "fonts")
system_fonts = Path("/System/Library/Fonts/Supplemental")
if system_fonts.is_dir():
    SubElement(root, "dir").text = str(system_fonts)
SubElement(root, "cachedir").text = str(build / "font-cache")
ElementTree(root).write(build / "fonts.conf", encoding="utf-8", xml_declaration=True)
PY
export FONTCONFIG_FILE="$PWD/presentation/final_20260907/build/fonts.conf"
```

Сохраните эту переменную в окружении процесса bundled LibreOffice. Проверьте список шрифтов готового PDF и рендер всех страниц; наличие Inter в PPTX само по себе не проверяет PDF-экспорт.

## Источники оформления

`assets/template.pptx` основан на пользовательском «Артефакты 1»: визуальный шаблон сохранён, служебные sourcepath удалены. Удалены только 33 абсолютных пути к исходным файлам в атрибутах `cNvPr descr`; фотографии, стили, контент и все остальные ZIP entries сохранены без изменения байтов. Оригинал хранится только в private `build/template-original-private.pptx` и не входит в публикацию. `source/sanitize_template.py` воспроизводит очистку, а исходный и очищенный SHA-256 зафиксированы в `source/resources-manifest.json`. Три фотографии и `permission-modes.png` предоставлены пользователем для командной презентации. Inter взят из официального google/fonts; лицензия SIL Open Font License сохранена рядом в `fonts/OFL.txt`. Локальные source/run IDs не являются обещанием полного воспроизведения модельных ответов.

## Автономная демонстрация

`source/demo_trace.json` содержит проверенный свежий A15 trace текущей сборки b184d6358 (Dos, PG off): `title`, `notice`, `source` (commit, mode, model, date, case_id, run_id, duration, trace_path) и массив `steps` (title, body, evidence_label, evidence, observation). Каждый шаг ссылается на наблюдаемое событие. Новая запись может заменить историческую только после проверки всех действий и oracle, с обновлением версии и ограничений.

`source/build_demo.py` встраивает JSON и Inter в один `output/final/demo.html`; файл не делает сетевых запросов и не исполняет показанные команды. `source/verify_demo.mjs` проверяет переходы, клавиатуру, завершение autoplay и отсутствие внешних зависимостей. Проверка запускает отдельный headless Chromium без пользовательского профиля, блокирует HTTP-запросы, проверяет интерфейс и сохраняет desktop/mobile screenshots. Путь браузера можно задать через `CHROMIUM_EXECUTABLE`; без него используется Chromium, установленный для Playwright. То же правило применяется к `source/record_demo.mjs`. Скрипт записи не нужен для просмотра готового видео и перезаписывает его только при явном запуске.

Пример на слайде 5 взят из сохранённого coding trace `source/demo_trace_pg_867a122591d1.json`: инъекция в выводе проверки окружения, запрет POST и продолжение добавления типов. Meta включён; отказ нельзя приписать одному Meta. Слайд показывает записанный результат. Отдельный `demo.html` по-прежнему показывает A15, `15c247846c13`, с PG off и остаётся необязательным резервом; это другой сценарий. Исторический резерв: `source/demo_trace_historical_873faeeb4e6f.json`. Для частной пересборки резерва задайте `build_demo.py --trace PATH --output PATH`. Проверка другого HTML использует `DEMO_HTML` и `DEMO_QA_DIR`. Все три источника и результаты отделены.

## Единый реестр чисел

Все агрегированные показатели и отображаемые настройки находятся в `source/final_metrics.json`. Общий `source/ledger_view.py` готовит числовые подписи и таблицы для обоих форматов. Перед экспортом выполните `source/check_ledger.py`. Подробный контракт свежих таблиц и границы интерпретации: [LEDGER_SCHEMA.md](source/LEDGER_SCHEMA.md). Презентация содержит 19 слайдов. Основной рассказ ограничен семью слайдами, включая обложку и команду: 1 — продукт, 2 — команда, 3 — подходы к разрешениям и пользовательский слоган, 4 — компактная архитектура, 5 — инъекция в выводе инструмента, 6 — проверка пакета, 7 — итог Auto/Dos по ASR, полезности и относительному времени. Слайд 8 — Q&A после завершения основного рассказа. Приложение 9–19 сохраняет остальные материалы: 9 — режимы Kilo, 10 — полномочия, 11 — матрица рисков, 12 — все три режима, 13 — время подробно, 14 — происхождение сценариев, 15 — конкретные пропуски, 16 — PG, 17 — подробности scope, 18 — FP и диагностика, 19 — альтернативы и пилот. Основной рассказ рассчитан на 4:40–4:45 до лимита 5:00; это редакционная оценка до репетиции. Таблицы находятся на слайдах 7 и 11–18. Производный аудит `source/review_metrics.json` даёт сравнение времени для слайдов 7 и 13 и не меняет замороженный реестр: около +13% к медиане на 65 общих нормально завершившихся запусках Auto/Dos. Выборка включает атаки и функциональные неуспехи; это не 38 разрешённых задач и не чистая стоимость judge. Слайды не содержат commit/benchmark IDs и заметок докладчика; доказательства и сценарий защиты остаются отдельными материалами.
