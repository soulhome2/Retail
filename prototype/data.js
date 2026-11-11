/* Demo server of the Retail prototype — the same split as in Incident Manager (../IM/prototype/server.js):
 * the screens ask RetailApi for data and never keep their own copy of the rules or reference books.
 * In the product these are requests to the Retail addon backend; the paths in comments are the
 * draft contract described in Specification/2026-11-11 Переработка интерфейса по образцу IM.md.
 *
 *   RetailApi.stores()                      GET  /reference/stores
 *   RetailApi.tree(storeId)                 GET  /reference/tree?store=
 *   RetailApi.cameras(sourceId)             GET  /reference/cameras?source=
 *   RetailApi.alarms(filter)                GET  /alarms?store=&node=&prio=&q=&unviewed=&from=&to=&scenario=
 *   RetailApi.alarm(id)                     GET  /alarms/{id}
 *   RetailApi.markViewed(id, who)           POST /alarms/{id}/viewed        (shared for all operators, UI-2)
 *   RetailApi.handOff(id, note)             POST /alarms/{id}/handoff       (→ Incident Manager)
 *   RetailApi.receipts()                    GET  /receipts?…                 (search by captions / receipts)
 *   RetailApi.templates() / saveTemplate()  GET/POST /search/templates
 *   RetailApi.config()                      GET  /admin/config               (tab «Конфигурация»)
 *
 * Load after retail-common.js (uses Retail.DEVICES) and before app.js / config.js.
 */
(function (global) {
  const DATE = "14.09.2026";
  const OPERATOR = "Иванова А. С.";

  const STORES = [
    { id: "s142", name: "Магазин №142 — ТЦ «Авиапарк»", short: "№142 Авиапарк", tz: "Москва, UTC+3", shift: "08:00–20:00" },
    { id: "s089", name: "Магазин №089 — СПб, Невский", short: "№089 Невский", tz: "Москва, UTC+3", shift: "09:00–21:00" }
  ];

  /* Cameras per source: main + extra angles (ТЗ §7.2). Switching the angle keeps the receipt and the position. */
  const CAMERAS = {
    "pos-2": [{ cam: "CAM-142-09 · КАССИР / РУКИ", scene: "cashier", angle: "Кассир и руки" }, { cam: "CAM-142-10 · ПОКУПАТЕЛЬ", scene: "pair", angle: "Покупатель" }],
    "file-1c": [{ cam: "CAM-142-08 · КАССИР / ПОКУПАТЕЛЬ", scene: "pair", angle: "Кассир и покупатель" }],
    "fr-5": [{ cam: "CAM-142-11 · КАССИР / РУКИ", scene: "cashier", angle: "Кассир и руки" }, { cam: "CAM-142-14 · ДЕНЕЖНЫЙ ЯЩИК", scene: "cashier", angle: "Денежный ящик" }],
    "kso-2": [{ cam: "CAM-142-17 · СВЕРХУ, КСО + ПОКУПАТЕЛЬ", scene: "pair", angle: "Площадка КСО" }],
    "cam-gate": [{ cam: "CAM-142-01 · ВХОД / ВЫХОД", scene: "gate", angle: "Вход / выход" }],
    "cam-hall": [{ cam: "CAM-142-12 · ЗАЛ", scene: "pair", angle: "Стеллаж молочной зоны" }]
  };
  function cameras(id) {
    if (CAMERAS[id]) return CAMERAS[id];
    const d = Retail.deviceById(id);
    return d ? [{ cam: d.cam, scene: d.scene, angle: d.view }] : [];
  }

  /* Video-only sources of the sales floor: no POS stream, so they are not in the device picker. */
  const VIDEO_SOURCES = [
    { id: "cam-gate", name: "Камера: вход / выход", online: true },
    { id: "cam-hall", name: "Камера: зал, молочная зона", online: true }
  ];

  function tree(storeId) {
    if (storeId !== "s142") {
      return [{ id: storeId, kind: "store", name: STORES.find(s => s.id === storeId).name, children: [
        { id: storeId + "-pos", kind: "zone", name: "Линейные кассы", children: [] }
      ] }];
    }
    const dev = (group) => Retail.DEVICES.filter(d => d.group === group).map(d => ({ id: d.id, kind: d.group === "scale" ? "scale" : "pos", name: d.name, online: d.online, since: d.since }));
    return [{ id: "s142", kind: "store", name: STORES[0].name, children: [
      { id: "z-pos", kind: "zone", name: "Линейные кассы", children: dev("pos") },
      { id: "z-kso", kind: "zone", name: "КСО", children: dev("kso") },
      { id: "z-scale", kind: "zone", name: "Весы", children: dev("scale") },
      { id: "z-hall", kind: "zone", name: "Торговый зал", children: VIDEO_SOURCES.map(v => ({ id: v.id, kind: "cam", name: v.name, online: v.online })) },
      { id: "z-other", kind: "zone", name: "Прочие источники", children: dev("other") }
    ] }];
  }

  /* ---------- receipts (demo archive, 14.09.2026) ---------- */
  const RECEIPTS = [
    { id: "48293", time: "15:02:11", source: "pos-2", cashier: "Иванова Е.", total: "0,00", status: "Аннуляция", sev: "high", text: "КАССИР ИВАНОВА Е.\nВОДКА ПУТИНКА 0,5Л\nАННУЛЯЦИЯ ЧЕКА\nИТОГО 0,00", parsed: [["Водка «Путинка» 0,5 л ×1", "389,00"], ["АННУЛЯЦИЯ", "15:02:11"], ["ИТОГО", "0,00 ₽"]] },
    { id: "48291", time: "14:12:41", source: "kso-2", cashier: "—", total: "259,90", status: "Тревога", sev: "high", text: "МОЛОКО 3.2%\nРАСХОЖДЕНИЕ X=5 / Y=1\nИТОГО 259,90", parsed: [["Хлеб белый ×1", "74,00"], ["Молоко 3.2% ×1", "89,90"], ["Расхождение X=5 / Y=1", "14:12:05"], ["ИТОГО", "259,90 ₽"]] },
    { id: "48290", time: "14:09:18", source: "pos-2", cashier: "Петров С.", total: "1 842,50", status: "Закрыт", text: "СКАНИРОВАНИЕ СЫР 45%\nОПЛАТА КАРТА\nИТОГО 1842,50", parsed: [["Сыр 45% ×1", "420,00"], ["Кофе зерно ×1", "890,00"], ["Оплата карта", "1 842,50"], ["ИТОГО", "1 842,50 ₽"]] },
    { id: "48288", time: "14:03:02", source: "fr-5", cashier: "Сидорова М.", total: "435,00", status: "Аннуляция", sev: "mid", text: "ВОЗВРАТ ХЛЕБ\nАННУЛЯЦИЯ ЧЕКА\nИТОГО 0,00", parsed: [["Хлеб белый", "74,00"], ["АННУЛЯЦИЯ", "14:03:08"], ["ИТОГО", "0,00 ₽"]] },
    { id: "48285", time: "13:48:10", source: "file-1c", cashier: "Петров С.", total: "719,30", status: "Импорт 1С", sev: "low", text: "ЧЕК ИЗ ВЫГРУЗКИ 1С\nВОЗВРАТ МОЛОКО\nИТОГО 719,30", parsed: [["Молоко 1л ×2", "178,00"], ["Возврат", "13:48:10"], ["ИТОГО", "719,30 ₽"]] },
    { id: "48280", time: "13:21:44", source: "ofd", cashier: "Козлов А.", total: "3 105,20", status: "ОФД", text: "ФД 118204  ФН 9999\nОПЛАТА НАЛ\nИТОГО 3105,20", parsed: [["Позиции из ОФД", "12"], ["Оплата наличными", "3 105,20"], ["ИТОГО", "3 105,20 ₽"]] },
    { id: "W-104", time: "13:10:05", source: "scale-veg", cashier: "Сидорова М.", total: "186,40", status: "Вес", text: "ВЕС 1.240 КГ\nБАНАНЫ\nСУММА 186,40", parsed: [["Бананы", "1,240 кг"], ["Сумма", "186,40 ₽"]] },
    { id: "W-201", time: "12:44:10", source: "scale-fish", cashier: "—", total: "0,00", status: "Штрихкод без оплаты", sev: "high", text: "ВЕС 1.240 КГ\nСЁМГА ОХЛ.\nШТРИХКОД ВЫДАН\nОПЛАТЫ НЕТ", parsed: [["Сёмга охл.", "1,240 кг"], ["Штрихкод", "2900123004512"], ["Оплата", "нет"]] }
  ];

  /* ---------- alarm journal: shift queue + history for "search by scenario" ----------
   * steps — why the scenario fired, condition by condition (card tab «Почему сработало»):
   * [time, mark, text]; mark = condition letter, "НЕ" (did not happen), "=" comparison, "⏱" timer, "!" alarm. */
  const JOURNAL = [
    { id: "a1", date: DATE, time: "14:26:00", sc: "t-pos-05", sev: "high", source: "fr-5", caption: "14:26  ПОКУПАТЕЛЬ И КАССИР\nНАЛИЧНЫЕ В ЗОНЕ\nPOS МОЛЧИТ 30 СЕК",
      why: "3.2.5. Детекторы покупателя и кассира сработали, наличные на столе есть, оплаты в POS нет 30 сек. Подозрение на обслуживание посетителя без чека.",
      steps: [["14:25:30", "A", "Детектор «Покупатель в зоне» — сработал"], ["14:25:31", "B", "Детектор «Кассир на месте» — сработал"], ["14:25:30", "C", "Детектор «Наличные в зоне» — сработал"], ["—", "НЕ", "POS: оплата — не было 30 с"], ["14:26:00", "!", "Окно 30 с истекло — тревога"]] },
    { id: "a2", date: DATE, time: "14:12:41", sc: "t-pos-07", sev: "high", source: "kso-2", receipt: "48291", xy: { x: 5, y: 1 }, caption: "14:12  КСО-2: НА ПЛОЩАДКЕ 5\nВ ЧЕКЕ 1 ПОЗИЦИЯ\nX − Y = 4",
      why: "3.2.10. Перед закрытием чека на площадке КСО 5 товаров, в чеке 1 позиция. Расхождение 4 ≥ порога 2.",
      steps: [["14:11:58", "A", "КСО: открыт чек №48291"], ["14:12:05", "B", "Подсчёт товаров на площадке: X = 5"], ["14:12:40", "C", "POS: позиций в чеке Y = 1"], ["14:12:41", "=", "X − Y = 4 ≥ порога 2"], ["14:12:41", "!", "Тревога до закрытия чека"]] },
    { id: "a3", date: DATE, time: "14:15:00", sc: "t-pos-02", sev: "high", source: "file-1c", caption: "14:15  ВОЗВРАТ ТОВАРА\nПОКУПАТЕЛЬ ЕСТЬ\nX=0 НА КАССЕ",
      why: "3.2.2. POS: возврат. Покупатель в зоне есть, детектор подсчёта показывает 0 товаров. Возврат без товара на кассе.",
      steps: [["14:14:52", "A", "POS: возврат"], ["14:14:52", "B", "Детектор «Покупатель в зоне» — сработал"], ["14:14:58", "=", "Подсчёт товаров на кассе: X = 0"], ["14:15:00", "!", "Тревога"]],
      viewed: { by: "Петров С. (старший смены)", at: "14:15:40" }, incident: "Принят в работу" },
    { id: "a4", date: DATE, time: "14:08:00", sc: "t-pos-06", sev: "high", source: "pos-2", caption: "14:08  ЛЕНТА → СКАНЕР → УКЛАДКА\nДОБАВЛЕНИЯ ТОВАРА НЕТ\nЧЕСТНЫЙ ЗНАК НЕТ",
      why: "3.2.6. Рука прошла зону ленты и сканера, в POS нет добавления товара и нет «Честного знака», затем рука в зоне укладки.",
      steps: [["14:07:52", "A", "Рука в зоне ленты"], ["14:07:54", "B", "Рука в зоне сканера"], ["—", "НЕ", "POS: добавление товара — не было"], ["—", "НЕ", "POS: код «Честный знак» — не было"], ["14:07:57", "C", "Рука в зоне укладки"], ["14:08:00", "!", "Тревога"]] },
    { id: "a5", date: DATE, time: "14:03:08", sc: "t-pos-01", sev: "high", source: "fr-5", receipt: "48288", caption: "14:03  АННУЛЯЦИЯ ЧЕКА\nПОКУПАТЕЛЯ НЕТ\nИТОГО 0,00",
      why: "С шины ФР пришла аннуляция. Детектор присутствия в зоне покупателя не сработал ±10 сек. Камера смотрит на кассира и руки — покупателя в кадре нет.",
      steps: [["14:03:08", "A", "ФР: аннуляция чека №48288"], ["—", "НЕ", "Детектор «Покупатель в зоне» — не было ±10 с"], ["14:03:18", "!", "Тревога"]],
      viewed: { by: "Петров С. (старший смены)", at: "14:04:02" } },
    { id: "a6", date: DATE, time: "12:56:10", sc: "t-pos-10", sev: "high", source: "scale-fish", receipt: "W-201", caption: "12:56  ВЕС 1.240 КГ\nШТРИХКОД ВЫДАН\nОПЛАТЫ НЕТ 12 МИН",
      why: "3.2.17. Весы «рыба» выдали штрихкод 2900123004512 в 12:44. За 12 минут он не пробит ни на кассе, ни на КСО.",
      steps: [["12:44:10", "A", "Весы рыба: штрихкод 2900123004512, 1,240 кг"], ["⏱", "⏱", "Таймер 12 мин"], ["—", "НЕ", "Штрихкод пробит на кассе или КСО — не было"], ["12:56:10", "!", "Тревога"]] },
    { id: "a7", date: DATE, time: "13:56:00", sc: "t-pos-11", sev: "mid", source: "scale-veg", caption: "13:56  ВЕС 1.240 КГ\nШТРИХКОД 1 И ШТРИХКОД 2\nНАИМЕНОВАНИЯ РАЗНЫЕ",
      why: "3.2.18. Весы «овощи-фрукты» выдали штрихкод на бананы с тем же весом 1,240 кг (± 20 г), что и сёмга на весах «рыба» 12 минут назад.",
      steps: [["13:44:02", "A", "Весы рыба: сёмга охл., 1,240 кг"], ["13:55:58", "B", "Весы овощи-фрукты: бананы, 1,240 кг"], ["13:56:00", "=", "Вес совпал ± 20 г, наименования разные"], ["13:56:00", "!", "Тревога"]] },
    { id: "a8", date: DATE, time: "13:50:00", sc: "t-pos-09", sev: "mid", source: "kso-2", caption: "13:50  ЧЕК НЕ ЗАКРЫТ\nУХОД С ЗОНЫ КСО\nX=3 ОСТАЛОСЬ",
      why: "3.2.13. Чек открыт, покупатель ушёл, на площадке по-прежнему 3 товара (было 3, допуск −2). Не путать с уносом (3.2.12), где после ухода X=0.",
      steps: [["13:46:20", "A", "КСО: открыт чек, на площадке X = 3"], ["13:49:30", "B", "Покупатель ушёл из зоны КСО"], ["13:50:00", "=", "На площадке X = 3 (допуск −2)"], ["13:50:00", "!", "Тревога"]],
      viewed: { by: OPERATOR, at: "13:51:12" } },
    { id: "a9", date: DATE, time: "13:41:00", sc: "t-retail-01b", sev: "mid", source: "cam-gate", video: true,
      why: "Корзина оставлена у выхода в 13:38. За 3 минуты владелец (трек 1041) её не забрал. Кассового потока нет, титры не накладываются.",
      steps: [["13:38:00", "A", "Оставленный предмет: корзина у выхода"], ["⏱", "⏱", "Таймер 180 с"], ["—", "НЕ", "Владелец (трек 1041) забрал — не было"], ["13:41:00", "!", "Тревога"]] },
    { id: "a10", date: DATE, time: "12:58:00", sc: "t-retail-02", sev: "low", source: "cam-hall", video: true,
      why: "Только аналитика зала: 4 движения руки к полке за 5 сек. Чека нет — событие готовит кражу до кассы.",
      steps: [["12:57:55", "A", "Протянутая рука к полке ×4 за 5 с"], ["12:58:00", "!", "Тревога"]],
      viewed: { by: "Петров С. (старший смены)", at: "13:00:21" } },
    // earlier days — visible only in "search by scenario"
    { id: "h1", date: "13.09.2026", time: "19:44:05", sc: "t-pos-06", sev: "high", source: "pos-2", caption: "19:44  ЛЕНТА → СКАНЕР → УКЛАДКА\nДОБАВЛЕНИЯ ТОВАРА НЕТ", why: "3.2.6. Три зоны пройдены, добавления товара в POS нет.", viewed: { by: "Петров С. (старший смены)", at: "19:45:00" }, incident: "Подтверждён" },
    { id: "h2", date: "13.09.2026", time: "11:02:30", sc: "t-pos-06", sev: "high", source: "pos-2", caption: "11:02  ЛЕНТА → СКАНЕР → УКЛАДКА\nДОБАВЛЕНИЯ ТОВАРА НЕТ", why: "3.2.6. Три зоны пройдены, добавления товара в POS нет.", viewed: { by: OPERATOR, at: "11:03:10" }, incident: "Ложное срабатывание" },
    { id: "h3", date: "12.09.2026", time: "16:20:00", sc: "t-pos-01", sev: "high", source: "fr-5", caption: "16:20  ВОЗВРАТ\nПОКУПАТЕЛЯ НЕТ", why: "Возврат при пустой зоне покупателя.", viewed: { by: OPERATOR, at: "16:21:00" }, incident: "Принят в работу" },
    { id: "h4", date: "12.09.2026", time: "10:15:00", sc: 1, sev: "high", source: "fr-5", caption: "10:15  АННУЛЯЦИЯ\nПОКУПАТЕЛЯ НЕТ", why: "Мой сценарий: аннуляция без покупателя.", viewed: { by: OPERATOR, at: "10:16:00" }, incident: "Закрыт" },
    { id: "h5", date: "11.09.2026", time: "18:30:00", sc: "old-7", scName: "Возвраты после 22:00 (удалён)", sev: "mid", source: "pos-2", caption: "18:30  ВОЗВРАТ", why: "Сценарий удалён 12.09; тревоги остались в журнале.", viewed: { by: OPERATOR, at: "18:31:00" }, incident: "Закрыт" }
  ];
  JOURNAL.forEach(j => { j.store = "s142"; j.no = "ALM-" + (j.id.startsWith("h") ? "13" : "14") + String(400 + JOURNAL.indexOf(j)).padStart(4, "0"); j.log = j.log || []; });

  /* tree node → set of source ids under it */
  function sourcesUnder(node) {
    if (!node) return null;
    const out = [];
    (function walk(n) { if (!n.children) out.push(n.id); else n.children.forEach(walk); })(node);
    return out;
  }
  function findNode(storeId, id) {
    let hit = null;
    (function walk(list) { list.forEach(n => { if (n.id === id) hit = n; if (n.children) walk(n.children); }); })(tree(storeId));
    return hit;
  }

  const TEMPLATES = [
    { id: "st1", name: "Аннуляции Ивановой с водкой", mode: "captions", shared: false, p: { terms: [{ text: "Иванова", op: null }, { text: "Аннуляция", op: "И" }, { text: "водка Путинка", op: "И" }] } },
    { id: "st2", name: "Весы: штрихкод без оплаты", mode: "receipts", shared: true, p: { report: "scale", srcs: ["scale-veg", "scale-fish", "scale-meat", "scale-saus", "scale-cheese"] } },
    { id: "st3", name: "Пронос мимо сканера за 7 дней", mode: "scenarios", shared: true, p: { sc: "t-pos-06", week: true } }
  ];

  const api = {
    DATE, OPERATOR,
    stores: () => STORES,
    store: (id) => STORES.find(s => s.id === id),
    tree, findNode, sourcesUnder, cameras,
    videoSource: (id) => VIDEO_SOURCES.find(v => v.id === id),
    alarms(f) {
      f = f || {};
      const node = f.node ? findNode(f.store || "s142", f.node) : null;
      const under = node ? sourcesUnder(node) : null;
      const q = (f.q || "").trim().toLowerCase();
      return JOURNAL.filter(j =>
        (!f.store || j.store === f.store) &&
        (!f.date || j.date === f.date) &&
        (!under || under.includes(j.source)) &&
        (!f.prio || f.prio === "all" || j.sev === f.prio) &&
        (!f.unviewed || !j.viewed || j.id === f.keep) &&
        (!q || (f.match && f.match(j, q))));
    },
    alarm: (id) => JOURNAL.find(j => j.id === id),
    journal: () => JOURNAL,
    markViewed(id, who, at) {
      const j = JOURNAL.find(x => x.id === id);
      if (j && !j.viewed) { j.viewed = { by: who, at }; j.log.push([at, "Просмотрена: {by}", { by: who }]); }
      return j;
    },
    handOff(id, note, at) {
      const j = JOURNAL.find(x => x.id === id);
      if (j && !j.incident) { j.incident = "Новый"; j.log.push([at, "Передана в Incident Manager", note ? { note } : null]); }
      return j;
    },
    logReport(id, at) {
      const j = JOURNAL.find(x => x.id === id);
      if (j) j.log.push([at, "Сформирован отчёт PDF", null]);
    },
    receipts: () => RECEIPTS,
    receipt: (id) => RECEIPTS.find(r => r.id === id),
    templates: () => TEMPLATES,
    saveTemplate: (t) => { TEMPLATES.push(t); return t; },
    config: () => global.RetailConfigData
  };

  global.RetailApi = api;
})(window);
