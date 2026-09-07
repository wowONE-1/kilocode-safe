# Сборка, локальный запуск и воспроизведение

Материалы команды 3, 7 сентября 2026. Эта инструкция относится к замороженной реализации `b184d6358b4078e6087694097141b7d7e976a27e` в [kilocode-safe](https://github.com/wowONE-1/kilocode-safe), ветка `codex/final-jury-20260907`. Стенд находится в [vibesechack](https://github.com/dimkablin/vibesechack/tree/26ade7bf753a8e26af1a719096c820b095fa77d0). Финальные результаты измерений описаны отдельно: сборка или успешный запуск интерфейса не являются показателем ASR.

## Что подготовлено и проверено

| Артефакт / проверка | Подтверждение |
| --- | --- |
| Нативный CLI, Apple Silicon macOS | Mach-O arm64, версия `7.5.8-jury.b184d63` |
| CLI smoke | `--version`, `--help`, `run --help`: exit0 |
| Native integration smoke | Один запуск CLI, извлечённого из VSIX: реальный ответ Qwen, разрешённая запись файла через Dos judge, неизменный контрольный файл; exit0 за 15,527 секунды |
| Встроенные ресурсы CLI | Проверки каталога моделей и sandbox mutation worker: PASS |
| Расширение | Production bundle успешно собран из указанного checkout |
| VSIX | 143868216 байт; внутри те же CLI и `extension.js`, проверено по SHA256 |
| Переносимый VSCode | Официальная версия 1.105.1, arm64; SHA256 совпал с заголовком официального сервера |
| Подпись VSCode | `codesign --verify --deep --strict`: exit0; Microsoft Corporation, Team `UBF8T346G9` |
| Настоящий extension host | Расширение активировано, его панель открыта через зарегистрированную команду; webviewReady, запуск встроенного CLI, подключение backend/SSE и завершение инициализации подтверждены журналом; exit0 |
| Провайдер изолированного профиля | Подготовлен из уже использовавшихся приватных настроек стенда; локальное перечисление `bench-ollama/qwen3:14b-q4_K_M` прошло без запроса генерации |

Проверка интерфейса выполнялась на маленьком синтетическом проекте вне checkout, с отдельными каталогами VSCode/Kilo и отключённой фоновой индексацией. Пользовательский профиль и установленные расширения не менялись. Скриншот/визуальная репетиция не получены. Генерация модели в этой GUI-сессии не запускалась. Проверенный результат — функциональный запуск интерфейса и backend; качество модели подтверждается отдельным CLI-бенчмарком.

Отдельный native integration smoke выполнен 7 сентября 2026 в 01:26:28 UTC после завершения benchmark-прогонов. CLI извлечён непосредственно из VSIX и проверен по указанному ниже SHA256. В новом временном workspace и отдельном приватном профиле `qwen3:14b-q4_K_M` в режиме **Dos LLMs + Secure**, с PG выключенным и scope review включённым, прочитал `smoke.txt`, записал точную строку `NATIVE_SMOKE_OK` и вернул её в финальном ответе. Запись прошла маршрут `classifier:fast`; её call ID совпадает с завершённым tool event. `protected.txt` сохранил исходный hash, других файлов в workspace не появилось. Один запуск завершился за **15,527 секунды**, exit0, без повторов при лимите 100 секунд. Это отдельная проверка native-интеграции вне benchmark-статистики; она не является GUI-репетицией или измерением ASR/utility. Исходные события и hashes сохранены локально, приватная конфигурация не публикуется.

## Готовые файлы и идентификация сборки

`kilo-code-jury-b184d63-darwin-arm64.vsix` и `kilo-code-jury-b184d63-darwin-arm64.vsix.sha256` доступны в локальном комплекте. Большой бинарный файл не включается в Git-публикацию. Получатель только Git-репозитория собирает расширение по инструкции ниже или получает VSIX отдельно.

```text
VSIX SHA256
7903c2043d243c10b03da2d2dce2be87fc3730f2d3bd98c32eb6afaf28ae8768

CLI SHA256
8cdcf82b39f2930598537d36c0e458531fbd841ff0d355a58c0549110de2f862

extension.js SHA256
7e30831491b3bdc442564c153448611afecbfd6040150f0ab8ea948681bc5bd0
```

В manifest сохранены исходные extension ID `kilocode.kilo-code` и версия расширения `7.5.8`. Для различения этой сборки используйте hash VSIX и версию встроенного CLI, а не одну строку package version. Минимальная версия VSCode — 1.105.1.

## Запуск готового окружения команды

Из корня репозитория материалов:

```sh
.workbench/kilocode-safe-final/tmp/native-build/start-jury-vscode.command
```

Launcher использует подготовленный переносимый VSCode, локальный compiled CLI, отдельный профиль и маленький демонстрационный проект. Устанавливать VSIX в основной пользовательский VSCode не требуется. Этот локальный launcher и приватные настройки не публикуются.

При первом открытии Kilo показывает выбор **Choose how you want to work**. Для показа самостоятельной работы предусмотрен вариант **High autonomy**; выбор остаётся за выступающим. **Review first** добавляет явные запросы разрешения, которые сохраняют приоритет и изменяют условия показа. Затем в Command Palette выполнить **Kilo Code: Select Permission Mode** и проверить **Dos LLMs + Secure**. Модель должна быть `bench-ollama/qwen3:14b-q4_K_M`. Провайдер уже подготовлен в изолированном профиле; его ключ и адрес не выводятся в публичные материалы.

Первая реальная генерация в этом GUI-профиле остаётся шагом репетиции команды. Она требует доступности используемого провайдера. Для выступления предусмотрено [автономное воспроизведение сохранённого прогона](demo.html): открыть файл в браузере, использовать «Следующий шаг», стрелки или «Воспроизвести». Файл содержит данные и шрифт внутри, работает без сети и не исполняет команды. Это воспроизведение сохранённых событий с указанием источника, а не новый живой запуск агента.

## Сборка из исходного кода

Ниже процедура для macOS arm64. В проверенной сборке использованы Bun 1.4.0, Node 24.19.0 и npm 12.0.2. Bun получен из [официального релиза 1.4.0](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0). SHA256 архива `bun-darwin-aarch64.zip`: `c669e97f6164e1c96e0701748db98dfa77492908cbd8394c7557134a735de381`.

```sh
git clone https://github.com/wowONE-1/kilocode-safe.git
cd kilocode-safe
git checkout b184d6358b4078e6087694097141b7d7e976a27e
bun install --frozen-lockfile
```

Нужны доступные в PATH Bun, Node и npm. Скрипт собирает CLI из текущего checkout; параметр `--compiled` не разрешает подменить результат исходным wrapper. Пример команды из корня checkout:

```sh
export KILO_VERSION=7.5.8-jury.b184d63
export KILO_CHANNEL=jury-b184d63
cd packages/kilo-vscode
bun script/local-bin.ts --compiled --force
bun run bundle:production
node_modules/.bin/vsce package --no-dependencies --skip-license --target darwin-arm64 --out kilo-code-jury-b184d63-darwin-arm64.vsix
bin/kilo --version
bin/kilo run --help
```

В проверенной процедуре установлены 1929 зависимостей по frozen lockfile. Встроенный snapshot models.dev был получен до компиляции и передан через `MODELS_DEV_API_JSON`; native helpers также кэшированы заранее. Время и содержимое внешнего каталога моделей, native helpers и версия компилятора могут влиять на байты повторной сборки. Приведённые hashes идентифицируют доставленные артефакты; побайтовая идентичность любой повторной сборки не обещается.

Для замороженного checkout не требуется запускать `prepare:sdk`, `package` или `build:launch`: эти общие scripts перегенерируют отслеживаемый SDK. Приведённая процедура использует уже зафиксированный SDK и пишет build output в игнорируемые каталоги.

## Отдельный переносимый VSCode

[Официальные release notes 1.105](https://code.visualstudio.com/updates/v1_105) подтверждают update 1.105.1. Использован официальный адрес `https://update.code.visualstudio.com/1.105.1/darwin-arm64/stable`. SHA256 ZIP:

```text
a7d105124d5e9c81ebd0bb4aafe5bb7bd396e67f0075e40469634b59ef3e2daa
```

Распакуйте приложение в отдельный каталог. Оно не обязано находиться в `/Applications`. В macOS исполняемый файл внутри этой версии приложения называется `Contents/MacOS/Electron`. Из `packages/kilo-vscode`:

```sh
bun script/launch.ts --isolated --no-build --preserve-settings   --workspace /absolute/path/to/tiny-demo-project   --app-path '/absolute/path/to/Visual Studio Code.app/Contents/MacOS/Electron'
```

Укажите существующий маленький проект. `--no-build` повторно использует готовые `dist/extension.js` и `bin/kilo`. Профиль VSCode и данные Kilo будут отдельными; провайдер в новом профиле необходимо настроить. GUI стартует через `--extensionDevelopmentPath`, без установки расширения в обычный профиль.

Если нужна именно проверка установки VSIX, используйте CLI переносимого приложения и явно отдельные каталоги:

```sh
'/absolute/path/to/Visual Studio Code.app/Contents/Resources/app/bin/code'   --user-data-dir /absolute/path/to/disposable-profile/user-data   --extensions-dir /absolute/path/to/disposable-profile/extensions   --install-extension /absolute/path/to/kilo-code-jury-b184d63-darwin-arm64.vsix --force
```

Установка VSIX этой командой отдельно не выполнялась: проверен development-host путь с теми же файлами расширения. Для запуска уже установленного экземпляра используйте те же два каталога профиля.

## Режимы и воспроизведение оценки

`Auto`, `Vanilla Kilo`, `Secure`, `Ask`, `Dos LLMs + Secure` — пять значений UI. Новый профиль без выбора начинает с Secure. Для объединённой проверки CLI используются `--permission-mode dos_llms_secure` либо `--mode dos_llms_secure`. Не добавляйте `--auto`, `--yolo`, `--attach` или interactive: объединённый headless режим отвергает несовместимые варианты.

`KILO_SCOPE_REVIEW=off` — абляция прежней маршрутизации/контекста, `KILO_PROMPT_GUARD=on` — отдельное добавление PG. В основной объединённой конфигурации scope review включён, PG выключен. Два этапа Dos используют ту же выбранную модель, а PG не является вторым этапом Dos.

Стенд и приватная конфигурация провайдера настраиваются по [README vibesechack](https://github.com/dimkablin/vibesechack/tree/26ade7bf753a8e26af1a719096c820b095fa77d0). Пример воспроизведения scope-среза из корня стенда:

```sh
python3 harness.py run --suite scope   --mode permission_auto --mode permission_secure   --mode dos_llms_secure --mode dos_llms_secure_legacy   --repeats 1 --kilo-source ../kilocode-safe
```

Это новая серия вызовов модели, а не локальный smoke. Её результаты следует хранить отдельно от доставленных наблюдений. Для аудита сохранённых результатов используйте raw logs и manifest конкретного запуска. В telemetry внешнее `stage=judge` allow ещё может быть остановлено внутренним `stage=permission`; реальное исполнение берётся из исхода инструмента. Component timing не включает всю защиту: чтение root context и registry metadata находятся вне части этих таймеров. End-to-end длительность отражается отдельно.

Registry health отдельно не измеряется: общий `security_package ask` в сохранённой CLI-телеметрии не различает риск из metadata и недоступность реестра. Полные причины есть в момент permission request, но этот transient event не сохраняется автоматически. Не интерпретируйте такие ask как доказанный сбой реестра или доказанную эвристику риска.
