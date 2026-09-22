/* Theme + language chrome, same pattern as Incident Manager:
   Russian string is the dictionary key; language names stay native. */
(function (global) {
  const LANGS = [
    { id: "ru", label: "Русский", locale: "ru-RU" },
    { id: "en", label: "English", locale: "en-GB" }
  ];

  const DICT = {
    en: {
      "Язык интерфейса": "Interface language",
      "Тёмная тема": "Dark theme",
      "Светлая тема": "Light theme",
      "Светлая / тёмная тема": "Light / dark theme",
      "Переключить тему": "Switch theme",
      "Интеллект Х — Антифрод Ритейл (прототип UI)": "Intellect X — Retail antifraud (UI prototype)",
      "Интеллект X — Ритейл · короткая версия": "Intellect X — Retail · short version",
      "Интеллект Х": "Intellect X",
      "Интеллект X": "Intellect X",
      "Антифрод · Ритейл": "Antifraud · Retail",
      "Ритейл · short": "Retail · short",
      "Центр мониторинга": "Monitoring center",
      "◉ Центр мониторинга": "◉ Monitoring center",
      "Тревоги": "Alerts",
      "⚠ Тревоги": "⚠ Alerts",
      "Чеки": "Receipts",
      "▥ Чеки": "▥ Receipts",
      "Расследование": "Investigation",
      "▶ Расследование": "▶ Investigation",
      "Поиск по титрам": "Caption search",
      "⌕ Поиск по титрам": "⌕ Caption search",
      "Конструктор сценариев": "Scenario builder",
      "⚙ Конструктор сценариев": "⚙ Scenario builder",
      "Аналитика и рейтинги": "Analytics and rankings",
      "▤ Аналитика и рейтинги": "▤ Analytics and rankings",
      "Видеоархив": "Video archive",
      "▦ Видеоархив": "▦ Video archive",
      "Источники данных": "Data sources",
      "⇄ Источники данных": "⇄ Data sources",
      "Поиск": "Search",
      "⌕ Поиск": "⌕ Search",
      "Мои сценарии": "My scenarios",
      "⚙ Мои сценарии": "⚙ My scenarios",
      "Магазинов: 847 · Касс: 3 204": "Stores: 847 · Tills: 3,204",
      "POS-модуль: подключён": "POS module: connected",
      "Источники и камеры настраиваются на сервере.": "Sources and cameras are configured on the server.",
      "Титры всегда поверх видео.": "Captions always overlay the video.",
      "Вся сеть (847 объектов)": "Entire network (847 sites)",
      "Магазин №142 — Москва, ТЦ «Авиапарк»": "Store 142 — Moscow, Aviapark mall",
      "Магазин №142 — ТЦ «Авиапарк»": "Store 142 — Aviapark mall",
      "Магазин №089 — СПб, Невский": "Store 089 — St. Petersburg, Nevsky",
      "Мониторинг активен": "Monitoring is active",
      "Оператор: Иванова А.С.": "Operator: Ivanova A.S.",
      "Retail Addon · прототип v3": "Retail Addon · prototype v3",
      "для «Интеллект X». Чек, отсутствие POS-события, три зоны сканера, весы и титры в одном контексте расследования.":
        "for Intellect X. Receipt, missing POS event, three scanner zones, scales and captions in one investigation context.",
      "Короткая версия прототипа · v3.": "Short prototype · v3.",
      "Поиск, тревоги и свои сценарии. Новые случаи: возврат без товара, обслуживание без чека, три зоны сканера, отказ от покупки на КСО, весы. Полный прототип — в":
        "Search, alerts and operator scenarios. New cases: return with no goods, service without a receipt, three scanner zones, abandoned SCO, scales. Full prototype is in",
      "Поиск, тревоги и свои сценарии. Новые случаи: возврат без товара, обслуживание без чека, три зоны сканера, отказ от покупки на КСО, весы.":
        "Search, alerts and operator scenarios. New cases: return with no goods, service without a receipt, three scanner zones, abandoned SCO, scales.",
      "Полный прототип — в": "Full prototype is in",
      "Онлайн-контроль касс, КСО, чеков и инцидентов сети": "Live control of tills, SCO, receipts and network incidents",
      "Тревоги за смену": "Alerts this shift",
      "↑ 4 к вчера": "↑ 4 vs yesterday",
      "Критичные (касса / КСО)": "Critical (till / SCO)",
      "3 без обработки": "3 unprocessed",
      "Расхождения КСО (X−Y ≥ 2)": "SCO mismatches (X−Y ≥ 2)",
      "активных индикаторов": "active indicators",
      "Без чека / весы": "No receipt / scales",
      "Кассиры выше порога": "Cashiers above threshold",
      ">10 возвратов за смену": ">10 returns per shift",
      "Последние тревоги": "Latest alerts",
      "Все →": "All →",
      "Обслуживание без чека": "Service without a receipt",
      "Касса": "Till",
      "Касса 1 · 3.2.5 · покупатель + кассир + нал · POS молчит 30 сек":
        "Till 1 · 3.2.5 · customer + cashier + cash · POS silent 30 s",
      "Неоплата на КСО — товары унесены": "SCO unpaid — goods taken",
      "КСО-4 · 3.2.12 · чек не закрыт, после ухода X=0": "SCO-4 · 3.2.12 · receipt open, X=0 after leaving",
      "Возврат при покупателе, товаров нет": "Return with customer, no goods",
      "Касса 3 · 3.2.2 · возврат И человек И X=0": "Till 3 · 3.2.2 · return AND person AND X=0",
      "Расхождение: на площадке 5, в чеке 1": "Mismatch: 5 on the pad, 1 on the receipt",
      "Сценарий 3.2.10 · Индикатор 5:1": "Scenario 3.2.10 · Indicator 5:1",
      "Камеры по зонам": "Cameras by zone",
      "🟢 Торговый зал": "🟢 Sales floor",
      "24 кам.": "24 cam.",
      "🟢 Кассовая зона": "🟢 Checkout zone",
      "8 кам.": "8 cam.",
      "🟡 КСО (расхождение)": "🟡 SCO (mismatch)",
      "2 актив.": "2 active",
      "🟢 Склад / отгрузка": "🟢 Warehouse / dispatch",
      "4 кам.": "4 cam.",
      "Открыть чеки": "Open receipts",
      "События от составных сценариев: POS + видеоаналитика + пользовательские условия":
        "Events from compound scenarios: POS + video analytics + user conditions",
      "Все": "All",
      "Торговый зал": "Sales floor",
      "Кассы": "Tills",
      "КСО": "SCO",
      "Весы": "Scales",
      "Склад": "Warehouse",
      "Критичные": "Critical",
      "Не обработаны": "Unprocessed",
      "Время": "Time",
      "Сценарий": "Scenario",
      "Зона": "Zone",
      "Объект": "Object",
      "Условия": "Conditions",
      "Статус": "Status",
      "Обслуживание без чека (3.2.5)": "Service without a receipt (3.2.5)",
      "Покупатель · Кассир · Нал · POS молчит 30 сек": "Customer · Cashier · Cash · POS silent 30 s",
      "Новая": "New",
      "Неоплата, товары унесены (3.2.12)": "Unpaid, goods taken (3.2.12)",
      "Чек открыт · Уход · X=0": "Receipt open · Left · X=0",
      "Отказ от покупки на КСО (3.2.13)": "Abandoned SCO purchase (3.2.13)",
      "Чек открыт · Уход · X=3 осталось": "Receipt open · Left · X=3 left",
      "Возврат, товаров нет (3.2.2)": "Return, no goods (3.2.2)",
      "Возврат · Покупатель есть · X=0": "Return · Customer present · X=0",
      "Расхождение по количеству (3.2.10)": "Quantity mismatch (3.2.10)",
      "На площадке: 5 · В чеке: 1": "On pad: 5 · On receipt: 1",
      "В работе": "In progress",
      "Пронос мимо сканера, 3 зоны (3.2.6)": "Pass-around, 3 zones (3.2.6)",
      "Лента → сканер → укладка · товара в POS нет": "Belt → scanner → bagging · no POS item",
      "Неоплата весового товара (3.2.17)": "Unpaid weighed item (3.2.17)",
      "Штрихкод выдан · таймаут 12 мин · в чеке нет": "Barcode issued · 12 min timeout · not on receipt",
      "Совпадение веса весовых (3.2.18)": "Matching weighed items (3.2.18)",
      "1,240 кг · два разных штрихкода": "1.240 kg · two different barcodes",
      "Отмена после оплаты наличными (3.2.3)": "Void after cash payment (3.2.3)",
      "Интервал: 7 сек": "Interval: 7 s",
      "Закрыта": "Closed",
      "Наличные в зоне без POS (3.2.4)": "Cash in zone with no POS (3.2.4)",
      "Детектор наличных · POS молчит 30 сек": "Cash detector · POS silent 30 s",
      "Хаотичный набор товаров (1.2.8)": "Chaotic grab of goods (1.2.8)",
      "Зал": "Floor",
      "Кам. 12": "Cam. 12",
      "4 движения руки за 5 сек": "4 hand moves in 5 s",
      "Операция без покупателя (3.2.1)": "Operation with no customer (3.2.1)",
      "Касса 1": "Till 1",
      "Возврат + отсутствие человека": "Return + no person",
      "Receipt viewer · структурированный чек, кассовые операции и связанное видео":
        "Receipt viewer · structured receipt, POS operations and linked video",
      "Период": "Period",
      "Магазин / касса": "Store / till",
      "№142 · Все кассы": "142 · All tills",
      "№142 · Касса 2": "142 · Till 2",
      "№142 · КСО-2": "142 · SCO-2",
      "Номер / товар / штрихкод": "Number / item / barcode",
      "Например, 4810153020124": "For example, 4810153020124",
      "Кассир": "Cashier",
      "Все кассиры": "All cashiers",
      "Операция": "Operation",
      "Все операции": "All operations",
      "Аннуляция": "Void",
      "Возврат": "Return",
      "Информация о товаре": "Item information",
      "Штрихкод весов": "Scale barcode",
      "Скидка": "Discount",
      "Открытие ящика": "Drawer open",
      "Открытие денежного ящика": "Cash drawer open",
      "Любой": "Any",
      "С тревогой": "With alert",
      "Без видео": "No video",
      "Импортирован постфактум": "Imported post factum",
      "Найти чеки": "Find receipts",
      "Сохранить запрос": "Save query",
      "Шаблоны:": "Templates:",
      "Возвраты": "Returns",
      "КСО с тревогами": "SCO with alerts",
      "Результаты · 186 чеков": "Results · 186 receipts",
      "Сортировка: новые": "Sort: newest",
      "Чек": "Receipt",
      "Сумма": "Amount",
      "Состояние": "State",
      "Тревога": "Alert",
      "Закрыт": "Closed",
      "Открыть расследование": "Open investigation",
      "Ракурсы": "Angles",
      "Титры: ВКЛ · Ракурс: сверху": "Captions: ON · Angle: top-down",
      "14:11:58 · перейти к видео": "14:11:58 · jump to video",
      "⚠ Расхождение товаров": "⚠ Goods mismatch",
      "ИТОГО": "TOTAL",
      "Расследование инцидента": "Incident investigation",
      "INC-2026-09142 · POS-07 «Расхождение количества товаров на КСО» (3.2.10) · В работе":
        "INC-2026-09142 · POS-07 “SCO quantity mismatch” (3.2.10) · In progress",
      "На площадке:": "On pad:",
      "шт.": "pcs",
      "В чеке:": "On receipt:",
      "Индикатор:": "Indicator:",
      "Подтвердить": "Confirm",
      "Ложное срабатывание": "False alarm",
      "Экспорт клипа": "Export clip",
      "Ответственный:": "Owner:",
      "Карточка инцидента": "Incident card",
      "+ Комментарий": "+ Comment",
      "Начало чека · КСО-2": "Receipt start · SCO-2",
      "Сканирование: Хлеб белый": "Scan: White bread",
      "Сканирование: Молоко 3.2% 1л": "Scan: Milk 3.2% 1L",
      "Тревога:": "Alert:",
      "X−Y ≥ 2 (5 на площадке, 1 в чеке)": "X−Y ≥ 2 (5 on pad, 1 on receipt)",
      "Captions search · поиск текста кассового потока с переходом к видео и полному чеку":
        "Captions search · find POS text and jump to video and the full receipt",
      "Текст или регулярное выражение": "Text or regular expression",
      "Товар, операция, шаблон": "Item, operation, pattern",
      "Зона / камера": "Zone / camera",
      "Все зоны": "All zones",
      "Кассовая зона": "Checkout zone",
      "Склад / отгрузка": "Warehouse / dispatch",
      "Касса / КСО": "Till / SCO",
      "Любая": "Any",
      "Касса 2": "Till 2",
      "Кассир (ID)": "Cashier (ID)",
      "Не указан": "Not set",
      "Режим поиска": "Search mode",
      "Регулярное выражение": "Regular expression",
      "Точная фраза": "Exact phrase",
      "Любое из слов": "Any word",
      "Найти в видеоархиве": "Search video archive",
      "+ Сохранить как шаблон": "+ Save as template",
      "🔖 Возвраты без покупателя": "🔖 Returns with no customer",
      "🔖 Возврат при X=0": "🔖 Return at X=0",
      "🔖 КСО — унос / отказ от покупки": "🔖 SCO — takeaway / abandon",
      "🔖 Весовой штрихкод без оплаты": "🔖 Scale barcode unpaid",
      "Результаты: 47 событий": "Results: 47 events",
      "Совпадение в титрах": "Caption match",
      "Действие": "Action",
      "▶ Видео + чек": "▶ Video + receipt",
      "Весы 3": "Scales 3",
      "Касса 3": "Till 3",
      "Создание составных тревожных сценариев · POS или его отсутствие + видеозоны + условия (v3)":
        "Build compound alert scenarios · POS or its absence + video zones + conditions (v3)",
      "POS-события": "POS events",
      "Возврат товара": "Goods return",
      "Аннуляция чека": "Receipt void",
      "Оплата наличными": "Cash payment",
      "Штрихкод с весов": "Scale barcode",
      "POS молчит / нет события": "POS silent / no event",
      "Видео-детекторы": "Video detectors",
      "Покупатель в зоне": "Customer in zone",
      "Кассир в зоне": "Cashier in zone",
      "Наличные в зоне": "Cash in zone",
      "Подсчёт товаров (X)": "Item count (X)",
      "Рука: зона ленты": "Hand: belt zone",
      "Рука: зона сканера": "Hand: scanner zone",
      "Рука: зона укладки": "Hand: bagging zone",
      "Логика": "Logic",
      "И (AND)": "AND",
      "ИЛИ (OR)": "OR",
      "Совпадение веса": "Matching weight",
      "Задержка (N сек)": "Delay (N s)",
      "Пример: «Пронос мимо сканера» (3.2.6 / 3.2.7)": "Example: “Pass-around” (3.2.6 / 3.2.7)",
      "Рука: лента → выход": "Hand: belt → exit",
      "затем": "then",
      "Рука: зона сканера → выход": "Hand: scanner zone → exit",
      "И": "AND",
      "POS: нет добавления товара / нет «Честного знака»": "POS: no item add / no Honest Sign",
      "Рука: зона укладки → выход": "Hand: bagging zone → exit",
      "⚠ Подозрение на пронос мимо сканера": "⚠ Suspected pass-around",
      "Сохранить сценарий": "Save scenario",
      "Сохранить как шаблон": "Save as template",
      "Тест на архиве": "Test on archive",
      "Параметры узла": "Node parameters",
      "Таймаут добавления в POS (сек)": "POS add timeout (s)",
      "Учитывать «Честный знак»": "Count Honest Sign",
      "Да — нет кода = нет пробития": "Yes — no code = not scanned",
      "Только штрихкод": "Barcode only",
      "Допуск X после ухода с КСО": "X tolerance after leaving SCO",
      "Таймаут весового штрихкода (мин)": "Scale barcode timeout (min)",
      "Название сценария": "Scenario name",
      "Приоритет тревоги": "Alert priority",
      "Высокий": "High",
      "Средний": "Medium",
      "Низкий": "Low",
      "Менеджер инцидентов · Аномальное поведение кассиров · Бенчмаркинг (п. 3.1.4, 4.1.6)":
        "Incident manager · Cashier anomalies · Benchmarking (§3.1.4, 4.1.6)",
      "Кассиры": "Cashiers",
      "Магазины": "Stores",
      "Сценарии": "Scenarios",
      "Потери": "Losses",
      "Топ кассиров по тревожным операциям (смена)": "Top cashiers by risk operations (shift)",
      "Всего": "Total",
      "↑ порог": "↑ threshold",
      "Порог: >10 возвратов за смену → уведомление руководителю":
        "Threshold: >10 returns per shift → notify supervisor",
      "Топ-5 магазинов по инцидентам": "Top 5 stores by incidents",
      "Магазин": "Store",
      "Инциденты": "Incidents",
      "Тренд": "Trend",
      "№142 Авиапарк": "142 Aviapark",
      "№089 Невский": "089 Nevsky",
      "ℹ031 Казань": "ℹ031 Kazan",
      "📊 Дашборд: динамика потерь по сети": "📊 Dashboard: network loss trend",
      "Поиск по титрам POS · Синхронизация с транзакциями": "POS caption search · Sync with transactions",
      "Камера": "Camera",
      "КСО-2 — вид сверху": "SCO-2 — top view",
      "Касса 2 — фронт": "Till 2 — front",
      "Дата и время": "Date and time",
      "POS-титр": "POS caption",
      "Сканирование": "Scan",
      "Перейти": "Go",
      "[ Архив · Камера КСО-2 · 26.08.2026 14:12:05 ]": "[ Archive · Camera SCO-2 · 26.08.2026 14:12:05 ]",
      "POS-титр: «Сканирование: Хлеб белый»": "POS caption: “Scan: White bread”",
      "Синхронизация POS-модуля": "POS module sync",
      "POS Gateway, адаптеры касс и постфактум-импорт · контроль доставки и синхронизации":
        "POS Gateway, till adapters and post-factum import · delivery and sync control",
      "Поток кассовых данных": "POS data flow",
      "Кассовое ПО / POS": "POS software",
      "Adapter Utility · кассы 1–5": "Adapter Utility · tills 1–5",
      "Файл кассовой выгрузки": "POS export file",
      "Универсальная модель": "Universal model",
      "Титры + правила + инциденты": "Captions + rules + incidents",
      "Касса ↔ камеры": "Till ↔ cameras",
      "Основная камера": "Primary camera",
      "CAM-142-09 · фронт": "CAM-142-09 · front",
      "CAM-142-17 · сверху": "CAM-142-17 · top",
      "CAM-142-19 · сверху": "CAM-142-19 · top",
      "Работает": "Running",
      "Онлайн · JSON/HTTPS": "Online · JSON/HTTPS",
      "Последнее событие: 2 сек назад": "Last event: 2 s ago",
      "Ошибок: 0 · повторов: 12": "Errors: 0 · retries: 12",
      "Буферизация": "Buffering",
      "Нет связи: 3 мин 18 сек": "No link: 3 min 18 s",
      "Автоповтор: через 22 сек": "Retry: in 22 s",
      "В очереди: 47 событий": "Queued: 47 events",
      "Импорт постфактум": "Post-factum import",
      "Магазин и часовой пояс": "Store and time zone",
      "Запустить импорт": "Start import",
      "Сопоставить поля": "Map fields",
      "Предварительная проверка: 12 480 событий · 1 904 чека · дубликатов 3 · ошибок 0":
        "Preview: 12,480 events · 1,904 receipts · 3 duplicates · 0 errors",
      "Видеоархив найден за весь период · расчётное смещение +1,4 сек":
        "Video archive found for the whole period · estimated offset +1.4 s",
      "Подключён": "Connected",
      "Касс: 8 · очередь: 0": "Tills: 8 · queue: 0",
      "Доставлено сегодня: 18 492": "Delivered today: 18,492",
      "Смещение времени: +0,12 сек": "Time offset: +0.12 s",
      "Дрейф 2,8 сек": "Drift 2.8 s",
      "Конфигурация: актуальна": "Configuration: current",
      "КСО-4 · нативный адаптер": "SCO-4 · native adapter",
      "Источники: POS Gateway + Perfema": "Sources: POS Gateway + Perfema",
      "Кассовое ПО": "POS software",
      "Поиск": "Search",
      "Мои сценарии": "My scenarios",
      "Как в Интеллекте: титры — простой текст поверх камеры; чеки — разбор по полям и отчёты":
        "Like Intellect: captions are plain text on camera; receipts are fielded reports",
      "По титрам": "By captions",
      "По чекам": "By receipts",
      "Источник и запрос": "Source and query",
      "Источник / касса": "Source / till",
      "Текст в титрах": "Caption text",
      "Вывод результатов": "Result view",
      "Чеки с заданным текстом": "Receipts with this text",
      "Отдельные титры с заданным текстом": "Individual captions with this text",
      "Найти": "Search",
      "запись титров в БД: вкл": "caption DB write: on",
      "Тип отчёта": "Report type",
      "№01 Список всех чеков": "No.01 All receipts",
      "№04 Поиск по номеру чека": "No.04 Receipt number",
      "№06 / №16 По кассиру": "No.06 / 16 By cashier",
      "№07 / №15 По артикулу или товару": "No.07 / 15 By SKU or item",
      "№13 Список чеков по товарам (и)": "No.13 Receipts by items (AND)",
      "Возвраты и аннуляции": "Returns and voids",
      "Весовые штрихкоды без оплаты": "Unpaid scale barcodes",
      "Чеки по сумме": "Receipts by amount",
      "Результаты": "Results",
      "Касса 2 · вид на кассира и руки": "Till 2 · cashier and hands",
      "Разбор чека": "Receipt breakdown",
      "События из конструктора сценариев: связка аналитики и чека либо только видео":
        "Events from the scenario builder: analytics plus receipt, or video only",
      "высокая": "high",
      "средняя": "medium",
      "низкая": "low",
      "Очередь · смена": "Queue · shift",
      "Выберите тревогу": "Select an alert",
      "Видео": "Video",
      "Титры появятся, если у события есть кассовый поток": "Captions appear when the event has a POS stream",
      "Почему сработало": "Why it fired",
      "Серверные правила уже подключены. Оператор создаёт, правит и удаляет только свои простые сценарии":
        "Server rules are already connected. The operator creates, edits and deletes only simple personal scenarios",
      "Список": "List",
      "Новый сценарий": "New scenario",
      "Редактирование": "Editing",
      "Название": "Name",
      "Например, возврат без покупателя": "For example, return with no customer",
      "Источник": "Source",
      "Все источники магазина": "All store sources",
      "Если на видео": "If on video",
      "Есть покупатель в зоне кассы": "Customer in the till zone",
      "Нет покупателя в зоне кассы": "No customer in the till zone",
      "Есть кассир в зоне кассы": "Cashier in the till zone",
      "Поднятые руки в зоне рамок": "Hands up at the gates",
      "Движение через зону сканера": "Motion through the scanner zone",
      "Рука: лента → сканер → укладка": "Hand: belt → scanner → bagging",
      "Наличные в зоне кассы": "Cash in the till zone",
      "Любое / не учитывать": "Any / ignore",
      "И также": "And also",
      "Не учитывать": "Ignore",
      "Есть кассир": "Cashier present",
      "Товаров на площадке: 0": "Items on pad: 0",
      "Товары остались после ухода (X, X−1, X−2)": "Items left after leaving (X, X−1, X−2)",
      "Три зоны сканера": "Three scanner zones",
      "И по чеку": "And on the receipt",
      "Нет чека / POS молчит": "No receipt / POS silent",
      "Есть чек или кассовая операция": "Receipt or POS operation present",
      "Нет добавления товара / нет «Честного знака»": "No item add / no Honest Sign",
      "Выдан штрихкод с весов": "Scale barcode issued",
      "Совпадение веса двух штрихкодов": "Two barcodes with the same weight",
      "Не учитывать чек": "Ignore the receipt",
      "Окно, сек": "Window, s",
      "Сохранить": "Save",
      "Сбросить": "Reset",
      "Удалить": "Delete",
      "Серверные шаблоны: пронос над рамкой, расхождение КСО, быстрый набор, трёхзонный пронос мимо сканера — только для использования, без правки.":
        "Server templates: pass over the gate, SCO mismatch, fast grab, three-zone pass-around — use only, no edit.",
      "только аналитика": "analytics only",
      "аналитика + чек": "analytics + receipt",
      "Только видео": "Video only",
      "Титры источника": "Source captions",
      "Кассового потока нет · титры не пишутся": "No POS stream · captions are not written",
      "Пока нет своих сценариев": "No personal scenarios yet",
      "окно {n} сек · {src}": "window {n} s · {src}",
      "все источники": "all sources",
      "чек №{id}": "receipt #{id}",
      "Чек №{id}": "Receipt #{id}",
      "Найдено в титрах: {n}": "Found in captions: {n}",
      "Отчёт построен: {n} чек.": "Report built: {n} receipt(s).",
      "Архив перемотан к титру": "Archive jumped to the caption",
      "Укажите название": "Enter a name",
      "Сценарий сохранён": "Scenario saved",
      "Сценарий удалён": "Scenario deleted",
      "Номер чека": "Receipt number",
      "Артикул / товар": "SKU / item",
      "Товар 1": "Item 1",
      "Товар 2": "Item 2",
      "Сумма от": "Amount from",
      "Касса 2 · Set Retail": "Till 2 · Set Retail",
      "Касса 1 · выгрузка 1С": "Till 1 · 1C export",
      "Касса 5 · ФР / принтер": "Till 5 · fiscal / printer",
      "КСО-2": "SCO-2",
      "Сеть · лента ОФД": "Network · OFD feed",
      "Весы у кассы 3": "Scales at till 3",
      "Файл 1С → Gateway": "1C file → Gateway",
      "Шина ФР / ESC-POS": "Fiscal bus / ESC-POS",
      "Весовой терминал": "Scale terminal",
      "ОФД": "OFD",
      "Касса 1 · кассир и покупатель": "Till 1 · cashier and customer",
      "Касса 5 · руки кассира и стол": "Till 5 · cashier hands and desk",
      "КСО-2 · сверху на площадку и покупателя": "SCO-2 · top view of pad and customer",
      "Касса по ФН из ОФД · кассир и руки": "Till by FN from OFD · cashier and hands",
      "Касса 3 · весы, кассир и покупатель": "Till 3 · scales, cashier and customer",
      "Покупатель в зоне без чека": "Customer in zone with no receipt",
      "Чек без покупателя": "Receipt with no customer",
      "Пронос мимо сканера, 3 зоны": "Pass-around, 3 zones",
      "Неоплата весового товара": "Unpaid weighed item",
      "Совпадение веса весовых товаров": "Matching weighed items",
      "Отказ от покупки на КСО": "Abandoned SCO purchase",
      "Руки над рамкой на выходе": "Hands above the exit gate",
      "Быстрый набор у стеллажа": "Fast grab at the shelf",
      "Покупатель без чека на КСО": "Customer with no receipt at SCO",
      "Аннуляция без покупателя": "Void with no customer",
      "Возврат при X=0": "Return at X=0",
      "Импорт 1С": "1C import",
      "Вес": "Weight",
      "Штрихкод без оплаты": "Unpaid barcode",
      "Найдено 186 чеков": "Found 186 receipts",
      "Шаблон «Контроль отмен» сохранён": "Template “Void control” saved",
      "Подтверждён": "Confirmed",
      "Видеоклип поставлен в очередь экспорта": "Clip queued for export",
      "Комментарий добавлен в историю аудита": "Comment added to the audit history",
      "Найдено 47 совпадений в титрах": "Found 47 caption matches",
      "Постфактум-импорт запущен": "Post-factum import started",
      "Сопоставление полей открыто": "Field mapping opened",
      "Открыт чек №{n} со связанным видео": "Opened receipt #{n} with linked video",
      "Видео перемещено к выбранной операции": "Video moved to the selected operation",
      "Статус инцидента: {s}": "Incident status: {s}",
      "3.2.5. Детекторы покупателя и кассира сработали, наличные на столе есть, оплаты в POS нет 30 сек. Подозрение на обслуживание посетителя без чека.":
        "3.2.5. Customer and cashier detectors fired, cash is on the desk, no POS payment for 30 s. Suspected service without a receipt.",
      "Аналитика: человек стоит у КСО дольше 20 сек. Чек не открыт и не закрыт. Типичный сценарий «обслуживание / набор без подтверждения покупки».":
        "Analytics: a person stays at the SCO longer than 20 s. No receipt opened or closed. Typical “service / picking without a confirmed purchase”.",
      "3.2.2. POS: возврат. Покупатель в зоне есть, детектор подсчёта показывает 0 товаров. Возврат без товара на кассе.":
        "3.2.2. POS: return. Customer is in the zone, item count is 0. Return with no goods at the till.",
      "3.2.6. Рука прошла зону ленты и сканера, в POS нет добавления товара и нет «Честного знака», затем рука в зоне укладки.":
        "3.2.6. The hand passed the belt and scanner; POS has no item add and no Honest Sign; then the hand entered bagging.",
      "С шины ФР пришла аннуляция. Детектор присутствия в зоне покупателя не сработал 8 сек. Камера смотрит на кассира и руки — покупателя в кадре нет.":
        "A void arrived from the fiscal bus. Customer-zone presence did not fire for 8 s. The camera sees the cashier and hands — no customer in frame.",
      "3.2.17. Весы выдали штрихкод. За настроенные 12 минут товар не пробит ни на кассе, ни на КСО.":
        "3.2.17. The scale issued a barcode. Within the 12-minute timeout the item was not scanned at a till or SCO.",
      "3.2.18. Второй весовой штрихкод выдан с тем же весом 1,240 кг, что и предыдущий дорогой товар.":
        "3.2.18. A second scale barcode was issued with the same 1.240 kg weight as the previous expensive item.",
      "3.2.13. Чек открыт, покупатель ушёл, на площадке по-прежнему 3 товара (допуск X−1 / X−2). Не путать с уносом (3.2.12), где после ухода X=0.":
        "3.2.13. Receipt is open, the customer left, 3 items remain on the pad (tolerance X−1 / X−2). Not the takeaway case (3.2.12), where X=0 after leaving.",
      "Только видеоаналитика. В зоне антикражных рамок человек с поднятыми руками — товар проносят поверх сканирующего контура. Кассового потока нет, титры не накладываются.":
        "Video analytics only. At the EAS gates a person has hands up — goods go over the scan field. No POS stream, no captions.",
      "Только аналитика зала: 4 движения руки к полке за 5 сек. Чека нет — событие готовит кражу до кассы.":
        "Sales-floor analytics only: 4 hand moves to the shelf in 5 s. No receipt — this is a pre-checkout theft setup.",
      "для «Интеллект X».": "for Intellect X.",
      "Чек, отсутствие POS-события, три зоны сканера, весы и титры в одном контексте расследования.":
        "Receipt, missing POS event, three scanner zones, scales and captions in one investigation context.",
      "КАССОВАЯ ЗОНА · ВИД СВЕРХУ": "CHECKOUT ZONE · TOP VIEW",
      "КСО-2 · камера над кассой и зоной покупателя": "SCO-2 · camera over the till and customer zone",
      "КСО-2 · Камера над площадкой и зоной покупателя": "SCO-2 · camera over the pad and customer zone",
      "МАГАЗИН №142 · КСО-2": "STORE 142 · SCO-2",
      "ЧЕК №48291 · 09.09.2026": "RECEIPT #48291 · 09.09.2026",
      "ЧЕК №48291 · КСО-2": "RECEIPT #48291 · SCO-2",
      "Чек №": "Receipt #",
      "Чек №48291 · 259,90 ₽": "Receipt #48291 · 259.90 ₽",
      "Хлеб белый": "White bread",
      "Хлеб белый ×1": "White bread ×1",
      "Хлеб белый × 1": "White bread ×1",
      "Молоко 3.2%": "Milk 3.2%",
      "Молоко 3.2% ×1": "Milk 3.2% ×1",
      "Молоко 3.2% 1л × 1": "Milk 3.2% 1L ×1",
      "Молоко 3.2% 1л": "Milk 3.2% 1L",
      "Сыр 45% ×1": "Cheese 45% ×1",
      "Кофе зерно ×1": "Coffee beans ×1",
      "Оплата карта": "Card payment",
      "Оплата нал": "Cash payment",
      "Набор продуктов": "Grocery set",
      "Бананы 1,240 кг": "Bananas 1.240 kg",
      "Расхождение X=5 / Y=1": "Mismatch X=5 / Y=1",
      "штрихкод": "barcode",
      "Таймаут 12 мин": "12 min timeout",
      "не пробит": "not scanned",
      "МОЛОКО": "MILK",
      "Молоко": "Milk",
      "Хлеб": "Bread",
      "МОЛОКО 3.2%": "MILK 3.2%",
      "МОЛОКО 3.2% 1Л": "MILK 3.2% 1L",
      "РАСХОЖДЕНИЕ": "MISMATCH",
      "РАСХОЖДЕНИЕ X=5 / Y=1": "MISMATCH X=5 / Y=1",
      "ИТОГО": "TOTAL",
      "ИТОГ": "TOTAL",
      "СКАНИРОВАНИЕ СЫР 45%": "SCAN CHEESE 45%",
      "ОПЛАТА КАРТА": "CARD PAYMENT",
      "ВОЗВРАТ ХЛЕБ": "RETURN BREAD",
      "АННУЛЯЦИЯ ЧЕКА": "RECEIPT VOID",
      "АННУЛЯЦИЯ": "VOID",
      "ВОЗВРАТ": "RETURN",
      "ВОЗВРАТ МОЛОКО": "RETURN MILK",
      "ВОЗВРАТ ТОВАРА": "GOODS RETURN",
      "ЧЕК ИЗ ВЫГРУЗКИ 1С": "RECEIPT FROM 1C EXPORT",
      "ОПЛАТА НАЛ": "CASH PAYMENT",
      "ВЕС": "WEIGHT",
      "ВЕС 1.240 КГ": "WEIGHT 1.240 KG",
      "БАНАНЫ": "BANANAS",
      "СУММА 186,40": "AMOUNT 186.40",
      "ШТРИХКОД ВЫДАН": "BARCODE ISSUED",
      "ОПЛАТЫ НЕТ": "UNPAID",
      "ОПЛАТЫ НЕТ 12 МИН": "UNPAID 12 MIN",
      "ПОКУПАТЕЛЬ И КАССИР": "CUSTOMER AND CASHIER",
      "ПОКУПАТЕЛЬ В ЗОНЕ": "CUSTOMER IN ZONE",
      "ПОКУПАТЕЛЬ ЕСТЬ": "CUSTOMER PRESENT",
      "ПОКУПАТЕЛЯ НЕТ": "NO CUSTOMER",
      "НАЛИЧНЫЕ В ЗОНЕ": "CASH IN ZONE",
      "POS МОЛЧИТ 30 СЕК": "POS SILENT 30 S",
      "ЧЕК НЕ ОТКРЫТ": "NO OPEN RECEIPT",
      "ЧЕК НЕ ЗАКРЫТ": "RECEIPT NOT CLOSED",
      "ОПЕРАЦИЙ НЕТ": "NO OPERATIONS",
      "X=0 НА КАССЕ": "X=0 AT TILL",
      "ЛЕНТА → СКАНЕР → УКЛАДКА": "BELT → SCANNER → BAGGING",
      "ДОБАВЛЕНИЯ ТОВАРА НЕТ": "NO ITEM ADD",
      "ЧЕСТНЫЙ ЗНАК НЕТ": "NO HONEST SIGN",
      "ШТРИХКОД 1 И ШТРИХКОД 2": "BARCODE 1 AND BARCODE 2",
      "НАИМЕНОВАНИЯ РАЗНЫЕ": "DIFFERENT NAMES",
      "УХОД С ЗОНЫ КСО": "LEFT SCO ZONE",
      "X=3 ОСТАЛОСЬ": "X=3 REMAINING",
      "1.240 КГ · штрихкод выдан · оплаты нет": "1.240 KG · barcode issued · unpaid",
      "ЧЕКА · 719,30 ₽": "RECEIPT · 719.30 ₽",
      "· X=0 на кассе": "· X=0 at the till",
      "14:11:58 МОЛОКО 3.2% 1Л 89,90": "14:11:58 MILK 3.2% 1L 89.90",
      "14:12:05 РАСХОЖДЕНИЕ X=5 / Y=1": "14:12:05 MISMATCH X=5 / Y=1",
      "14:12:41 ИТОГ 259,90": "14:12:41 TOTAL 259.90",
      "14:11:58 · перейти к видео": "14:11:58 · jump to video",
      "CAM-142-09 · КАССИР / РУКИ": "CAM-142-09 · CASHIER / HANDS",
      "CAM-142-08 · КАССИР / ПОКУПАТЕЛЬ": "CAM-142-08 · CASHIER / CUSTOMER",
      "CAM-142-11 · КАССИР / РУКИ": "CAM-142-11 · CASHIER / HANDS",
      "CAM-142-17 · СВЕРХУ, КСО + ПОКУПАТЕЛЬ": "CAM-142-17 · TOP, SCO + CUSTOMER",
      "CAM-142-10 · КАССИР / ПОКУПАТЕЛЬ": "CAM-142-10 · CASHIER / CUSTOMER",
      "CAM-142-01 · ВХОД / ВЫХОД": "CAM-142-01 · ENTRY / EXIT",
      "CAM-142-12 · ЗАЛ": "CAM-142-12 · FLOOR",
      "Рамки входа/выхода": "Entry / exit gates",
      "Стеллаж молочной зоны": "Dairy aisle shelf",
      "Отмена": "Voided",
      "Импорт": "Import",
      "Пронос мимо сканера, 3 зоны": "Pass-around, 3 zones",
      "(АННУЛЯЦИЯ)|(ВОЗВРАТ)": "(VOID)|(RETURN)",
      "МОЛОКО 3.2%\nРАСХОЖДЕНИЕ X=5 / Y=1\nИТОГО 259,90": "MILK 3.2%\nMISMATCH X=5 / Y=1\nTOTAL 259.90",
      "СКАНИРОВАНИЕ СЫР 45%\nОПЛАТА КАРТА\nИТОГО 1842,50": "SCAN CHEESE 45%\nCARD PAYMENT\nTOTAL 1842.50",
      "ВОЗВРАТ ХЛЕБ\nАННУЛЯЦИЯ ЧЕКА\nИТОГО 0,00": "RETURN BREAD\nRECEIPT VOID\nTOTAL 0.00",
      "ЧЕК ИЗ ВЫГРУЗКИ 1С\nВОЗВРАТ МОЛОКО\nИТОГО 719,30": "RECEIPT FROM 1C EXPORT\nRETURN MILK\nTOTAL 719.30",
      "ФД 118204  ФН 9999\nОПЛАТА НАЛ\nИТОГО 3105,20": "FD 118204  FN 9999\nCASH PAYMENT\nTOTAL 3105.20",
      "ВЕС 1.240 КГ\nБАНАНЫ\nСУММА 186,40": "WEIGHT 1.240 KG\nBANANAS\nAMOUNT 186.40",
      "ВЕС 1.240 КГ\nБАНАНЫ\nШТРИХКОД ВЫДАН\nОПЛАТЫ НЕТ": "WEIGHT 1.240 KG\nBANANAS\nBARCODE ISSUED\nUNPAID",
      "14:26  ПОКУПАТЕЛЬ И КАССИР\nНАЛИЧНЫЕ В ЗОНЕ\nPOS МОЛЧИТ 30 СЕК": "14:26  CUSTOMER AND CASHIER\nCASH IN ZONE\nPOS SILENT 30 S",
      "14:18  ПОКУПАТЕЛЬ В ЗОНЕ\nЧЕК НЕ ОТКРЫТ\nОПЕРАЦИЙ НЕТ": "14:18  CUSTOMER IN ZONE\nNO OPEN RECEIPT\nNO OPERATIONS",
      "14:15  ВОЗВРАТ ТОВАРА\nПОКУПАТЕЛЬ ЕСТЬ\nX=0 НА КАССЕ": "14:15  GOODS RETURN\nCUSTOMER PRESENT\nX=0 AT TILL",
      "14:08  ЛЕНТА → СКАНЕР → УКЛАДКА\nДОБАВЛЕНИЯ ТОВАРА НЕТ\nЧЕСТНЫЙ ЗНАК НЕТ": "14:08  BELT → SCANNER → BAGGING\nNO ITEM ADD\nNO HONEST SIGN",
      "14:03  АННУЛЯЦИЯ ЧЕКА\nПОКУПАТЕЛЯ НЕТ\nИТОГО 0,00": "14:03  RECEIPT VOID\nNO CUSTOMER\nTOTAL 0.00",
      "13:58  ВЕС 1.240 КГ\nШТРИХКОД ВЫДАН\nОПЛАТЫ НЕТ 12 МИН": "13:58  WEIGHT 1.240 KG\nBARCODE ISSUED\nUNPAID 12 MIN",
      "13:56  ВЕС 1.240 КГ\nШТРИХКОД 1 И ШТРИХКОД 2\nНАИМЕНОВАНИЯ РАЗНЫЕ": "13:56  WEIGHT 1.240 KG\nBARCODE 1 AND BARCODE 2\nDIFFERENT NAMES",
      "13:50  ЧЕК НЕ ЗАКРЫТ\nУХОД С ЗОНЫ КСО\nX=3 ОСТАЛОСЬ": "13:50  RECEIPT NOT CLOSED\nLEFT SCO ZONE\nX=3 REMAINING",
      "ИТОГО 259,90": "TOTAL 259.90",
      "ИТОГО 1842,50": "TOTAL 1842.50",
      "ИТОГО 0,00": "TOTAL 0.00",
      "ИТОГО 719,30": "TOTAL 719.30",
      "ИТОГО 3105,20": "TOTAL 3105.20",
      "Аннуляции": "Voids",
      "КАМЕРА": "CAMERA",
      "Состав сценария": "Scenario composition",
      "① Детектор подсчёта товаров (Perfema) → X = 5": "① Item-count detector (Perfema) → X = 5",
      "② POS: оплаченных позиций → Y = 1": "② POS: paid items → Y = 1",
      "③ Условие: X − Y ≥ 2 →": "③ Condition: X − Y ≥ 2 →",
      "Магазин: №142 · КСО-2": "Store: 142 · SCO-2",
      "POS: сканирование": "POS: scan",
      "POS: оплата": "POS: payment",
      "POS Gateway · магазин №142": "POS Gateway · store 142",
      "Видео есть": "Video present",
      "№142 · UTC+3": "142 · UTC+3",
      "1Л": "1L"
    }
  };

  let LANG = "ru";
  let themeMode = "dark";
  const STATIC = { text: [], attr: [], html: [], title: "" };
  const I18N_ATTRS = ["title", "placeholder", "aria-label", "value"];
  const CYRILLIC = /[\u0400-\u04FF]/;

  let EN_KEYS = [];

  function rebuildKeyIndex() {
    EN_KEYS = Object.keys(DICT.en || {}).sort((a, b) => b.length - a.length);
  }
  rebuildKeyIndex();

  function lookup(ru) {
    if (ru == null) return "";
    if (LANG === "ru") return ru;
    const table = DICT.en;
    if (!table) return ru;
    if (Object.prototype.hasOwnProperty.call(table, ru)) return table[ru];
    const compact = String(ru).replace(/\s+/g, " ").trim();
    if (Object.prototype.hasOwnProperty.call(table, compact)) return table[compact];
    return null;
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function translatePhrases(ru) {
    let out = String(ru);
    EN_KEYS.forEach((key) => {
      if (key.length < 3 || !CYRILLIC.test(key) || !out.includes(key)) return;
      const re = new RegExp("(?<![\\u0400-\\u04FFa-zA-Z])" + escapeRe(key) + "(?![\\u0400-\\u04FFa-zA-Z])", "g");
      out = out.replace(re, DICT.en[key]);
    });
    return out;
  }

  function t(ru, vars) {
    if (ru == null) return "";
    let out = lookup(ru);
    if (out == null && LANG !== "ru") {
      const raw = String(ru);
      const stripped = raw.replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s+/, "");
      if (stripped !== raw) {
        const rest = lookup(stripped);
        if (rest != null) out = raw.slice(0, raw.length - stripped.length) + rest;
      }
      if (out == null && raw.includes("\n")) {
        out = raw.split("\n").map((line) => t(line)).join("\n");
      }
      if (out == null && CYRILLIC.test(raw)) out = translatePhrases(raw);
    }
    if (out == null) out = ru;
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
    return out;
  }

  function tx(text) {
    if (!text) return "";
    const whole = lookup(text);
    if (whole != null) return whole;
    return String(text).split("\n").map((line) => t(line)).join("\n");
  }

  function collectStatic() {
    STATIC.text = [];
    STATIC.attr = [];
    STATIC.html = [];
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      STATIC.html.push({ el, ru: el.innerHTML.trim() });
    });
    document.querySelectorAll("*").forEach((el) => {
      I18N_ATTRS.forEach((attr) => {
        if (attr === "value" && el.tagName !== "INPUT") return;
        const value = el.getAttribute(attr) || (attr === "value" ? el.value : "");
        if (value && CYRILLIC.test(value)) STATIC.attr.push({ el, attr, ru: value.trim() });
      });
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!CYRILLIC.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        for (let p = node.parentElement; p; p = p.parentElement) {
          if (p.tagName === "SCRIPT" || p.tagName === "STYLE") return NodeFilter.FILTER_REJECT;
          if (p.hasAttribute("data-i18n-html") || p.hasAttribute("data-i18n-skip")) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const raw = node.nodeValue;
      STATIC.text.push({
        node,
        ru: raw.trim(),
        pre: raw.match(/^\s*/)[0],
        post: raw.match(/\s*$/)[0]
      });
    }
    STATIC.title = document.title;
  }

  function applyStatic() {
    STATIC.html.forEach((item) => { item.el.innerHTML = t(item.ru); });
    STATIC.attr.forEach((item) => {
      const translated = t(item.ru);
      item.el.setAttribute(item.attr, translated);
      if (item.attr === "value") item.el.value = translated;
    });
    STATIC.text.forEach((item) => {
      if (item.node.parentNode) item.node.nodeValue = item.pre + t(item.ru) + item.post;
    });
    document.title = t(STATIC.title);
  }

  function applyTheme(mode) {
    const theme = mode === "light" ? "light" : "dark";
    themeMode = theme;
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("retail-theme", theme); } catch (err) { /* ignore */ }
    const label = t(theme === "light" ? "Светлая тема" : "Тёмная тема");
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", String(theme === "light"));
  }

  function applyLang(id) {
    LANG = LANGS.some((l) => l.id === id) ? id : "ru";
    document.documentElement.lang = LANG;
    try { localStorage.setItem("retail-lang", LANG); } catch (err) { /* ignore */ }
    const select = document.getElementById("langSelect");
    if (select) {
      if (select.value !== LANG) select.value = LANG;
      select.title = t("Язык интерфейса");
      select.setAttribute("aria-label", t("Язык интерфейса"));
    }
    applyStatic();
    applyTheme(themeMode);
    if (typeof global.onRetailLang === "function") global.onRetailLang();
  }

  function bindChrome() {
    collectStatic();
    let savedTheme = "dark";
    let savedLang = "ru";
    try {
      savedTheme = localStorage.getItem("retail-theme") || "dark";
      savedLang = localStorage.getItem("retail-lang") || "ru";
    } catch (err) { /* ignore */ }
    const themeBtn = document.getElementById("themeToggle");
    const langSelect = document.getElementById("langSelect");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        applyTheme(themeMode === "light" ? "dark" : "light");
      });
    }
    if (langSelect) {
      const syncLang = (e) => applyLang(e.target.value);
      langSelect.addEventListener("change", syncLang);
      langSelect.addEventListener("input", syncLang);
    }
    applyTheme(savedTheme);
    applyLang(savedLang);
  }

  global.t = t;
  global.tx = tx;
  global.RetailI18n = { t, tx, applyLang, applyTheme, bindChrome, LANGS };
})(window);
