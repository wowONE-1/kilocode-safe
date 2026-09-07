# Исходники итоговой презентации и материалов

Сборка использует `@oai/artifact-tool`, пользовательский шаблон Inter, реальные фотографии команды и предоставленный скрин режимов. Пользовательские изображения сохраняют исходные байты. Схемы, таблицы и текст остаются редактируемыми объектами PPTX.

Основные данные новой оценки находятся в `source/final_metrics.json`. Исторические full70/D-012 явно подписаны и не подменяют новую сопоставимую матрицу. Значение `status=frozen` разрешено только после аудита результатов. Финальный экспорт Markdown откажется при незаполненных полях `ОЖИДАЕТ`.

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

Основное демо: A15, `15c247846c13`. Дополнительный coding trace с PG on: `source/demo_trace_pg_867a122591d1.json`; он не является результатом режима по умолчанию. Исторический резерв: `source/demo_trace_historical_873faeeb4e6f.json`. Для частной пересборки резерва задайте `build_demo.py --trace PATH --output PATH`. Проверка другого HTML использует `DEMO_HTML` и `DEMO_QA_DIR`. Все три источника и результаты отделены.

## Единый реестр чисел

Все агрегированные показатели и отображаемые настройки находятся в `source/final_metrics.json`. Общий `source/ledger_view.py` готовит числовые подписи и таблицы для обоих форматов. Перед экспортом выполните `source/check_ledger.py`. Подробный контракт свежих таблиц и границы интерпретации: [LEDGER_SCHEMA.md](source/LEDGER_SCHEMA.md). При `status=frozen` приложения 9/11/12/13/14 показывают свежие provenance/outcomes/PG/scope/диагностику; исторический full70 остаётся на 10.
