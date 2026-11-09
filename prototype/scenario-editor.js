/* Scenario editor of the Retail prototype (prototype/index.html). Needs retail-common.js (devices, picker).
 *
 * Model
 *   scenario  = { name, desc, prio, on, repeat:{mode:"after"|"never", sec}, camera, schedule, conds }
 *   condition = one of
 *     ev  — events joined by OR; may be negated (NOT = did not happen within its timer);
 *           timer relative to an earlier condition; repeats ≥ K in N sec or per shift, grouped by cashier / till
 *     st  — state at a moment (receipt open, items in zone…), at / N sec before / N sec after an earlier condition
 *     cmp — compare saved values: {A.X} − {B.Y} ≥ 2, {B.weight} = {A.weight} ± 20
 *   event = obj   { otype, obj, ev, where:[{attr, op, val}], save:[{name, attr}] }    camera, sensors, ACS, external API
 *         | pos   { srcs:[device ids], ev, where, save }                               till / SCO / scales events (ТЗ §6.3)
 *         | cap   { srcs, op, text, save:[{name, preset, word, re}] }                 caption line, any text
 *         | state { otype:"pos"|"cam", srcs | obj, st, save:[{name, attr}] }
 *   variables = values saved by an event or state ({A.code}); later conditions use them in text, filters and comparisons.
 *
 * Usage: ScenarioEditor.mount(element, { toast, onChange }) after RetailI18n.bindChrome();
 *        ScenarioEditor.refresh() on language change; ScenarioEditor.list() / byId(id) for search and alerts.
 */
(function (global) {
  const tr = (s, v) => (typeof global.t === "function" ? global.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));
  const R = global.Retail;

  const OBJ_TYPES = {
    cam: { name: "Камера · детектор", short: "Камера", objects: [
      "CAM-142-11 · Касса 5 · зона покупателя", "CAM-142-11 · Касса 5 · зона кассира", "CAM-142-11 · Касса 5 · кассовый стол",
      "CAM-142-09 · Касса 2 · зона ленты", "CAM-142-09 · Касса 2 · зона сканера", "CAM-142-09 · Касса 2 · зона укладки",
      "CAM-142-17 · КСО-2 · площадка", "CAM-142-12 · Зал · молочный стеллаж",
      "CAM-142-21 · Склад · дверь 2", "CAM-142-30 · Склад · ворота погрузки", "CAM-142-01 · Вход / выход"
    ], events: [
      "Человек в зоне", "Человек покинул зону", "Зона пуста", "Человек в зоне дольше N сек", "Пересечение линии",
      "Рука: вход и выход из зоны", "Движение руки к полке", "Наличные в зоне", "Товаров в зоне: 0",
      "Оставленный предмет", "Предмет перемещён", "Подсчёт мест завершён"
    ], attrs: ["ID трека", "ID предмета", "Число товаров", "Число объектов"] },
    sec: { name: "Охранный датчик", short: "Датчик", objects: ["Склад · дверь 2 · геркон", "Подсобка · ИК-датчик объёма", "Касса 5 · датчик денежного ящика"], events: ["Тревога", "Норма", "Вскрытие корпуса"], attrs: ["Номер зоны"] },
    fire: { name: "Пожарный извещатель", short: "Пожарный извещатель", objects: ["Торговый зал · дымовой", "Склад · тепловой"], events: ["Пожар", "Внимание", "Неисправность"], attrs: ["Номер шлейфа"] },
    mic: { name: "Микрофон · аудиоаналитика", short: "Микрофон", objects: ["Касса 5 · микрофон", "Склад · микрофон"], events: ["Крик", "Разбитие стекла", "Громкий звук"], attrs: ["Уровень, дБ"] },
    door: { name: "СКУД · дверь / турникет", short: "СКУД", objects: ["Служебный вход", "Склад · ворота"], events: ["Проход по карте", "Дверь открыта без прохода", "Дверь удерживается открытой"], attrs: ["Номер карты", "Сотрудник"] },
    btn: { name: "Тревожная кнопка", short: "Тревожная кнопка", objects: ["Касса 5 · тревожная кнопка", "Касса 2 · тревожная кнопка"], events: ["Нажата"], attrs: ["Номер кнопки"] },
    ext: { name: "Внешняя система (API)", short: "Внешняя система", objects: ["WMS склада", "Партнёр: контроль штрихкодов"], events: ["WMS: накладная закрыта", "Сигнал: подмена штрихкода", "Сигнал партнёра"], attrs: ["Номер накладной", "Мест по накладной", "Штрихкод"] }
  };
  const POS_EVENTS = [
    "Любое событие кассы", "Открытие чека", "Добавление позиции", "Удаление позиции", "Информация о товаре (в т.ч. «Честный знак»)",
    "Изменение количества или цены", "Скидка", "Оплата наличными", "Оплата картой", "Возврат", "Отмена / аннуляция",
    "Отложенный чек", "Восстановленный чек", "Сканирование вне чека", "Открытие денежного ящика", "Закрытие чека",
    "Вход кассира", "Выход кассира", "Закрытие смены", "Весы: выдан штрихкод"
  ];
  const POS_ATTRS = ["Кассир", "Номер чека", "Сумма", "Число позиций", "Товар", "Штрихкод", "Вес, г", "Наименование", "Способ оплаты"];
  const STATES = {
    pos: { name: "Касса / КСО", states: ["Чек открыт", "Чек не открыт", "Смена открыта"], attrs: ["Номер чека", "Число позиций", "Сумма", "Кассир"] },
    cam: { name: "Камера · детектор", states: ["Человек в зоне", "Зона пуста", "Товаров в зоне: 0", "Товаров в зоне — значение"], attrs: ["Число товаров", "Число людей"] }
  };
  const ATTR_NAMES = {
    "Штрихкод": "штрихкод", "Вес, г": "вес", "Наименование": "наименование", "Число позиций": "позиций", "Номер чека": "чек",
    "Кассир": "кассир", "Сумма": "сумма", "Товар": "товар", "Способ оплаты": "оплата", "ID трека": "трек", "ID предмета": "предмет",
    "Число объектов": "число", "Число товаров": "товаров", "Число людей": "людей", "Номер карты": "карта", "Сотрудник": "сотрудник",
    "Мест по накладной": "мест", "Номер накладной": "накладная", "Номер зоны": "зона", "Номер шлейфа": "шлейф", "Уровень, дБ": "дБ", "Номер кнопки": "кнопка"
  };
  const POS_FILTER = (d) => d.group === "pos" || d.group === "kso" || d.group === "scale";
  const TILLS = ["pos-2", "file-1c", "fr-5", "kso-2"];
  const SCALES = ["scale-veg", "scale-fish", "scale-meat", "scale-saus", "scale-cheese"];
  const CAP_OPS = [["contains", "содержит"], ["notcontains", "не содержит"], ["starts", "начинается с"], ["equals", "совпадает с"], ["regex", "рег. выражение"], ["any", "любая строка"]];
  const SAVE_PRESETS = [["num", "Число после слова"], ["barcode", "Штрихкод (8–13 цифр)"], ["line", "Вся строка"], ["re", "Свой шаблон (рег. выражение)"]];
  const WHERE_OPS = [["eq", "="], ["ne", "≠"], ["gt", ">"], ["lt", "<"], ["has", "содержит"]];
  const CMP_OPS = [["eq", "="], ["ne", "≠"], ["gt", ">"], ["ge", "≥"], ["lt", "<"], ["le", "≤"]];
  const TIME_MODES = [["after", "После события"], ["before", "До события"], ["around", "Рядом по времени (±)"], ["receipt", "В том же чеке"]];
  const STATE_MODES = [["at", "В момент события"], ["sbefore", "За N сек до события"], ["safter", "Через N сек после события"]];
  const PRIOS = [["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]];
  const SCHEDULES = ["Всегда", "В часы работы магазина", "Только когда магазин закрыт"];
  const COUNTS = [1, 2, 3, 4, 5, 10, 20];
  const GROUP_BY = [["", "—"], ["кассир", "кассира"], ["касса", "кассы"]];

  const EV = {
    obj: (otype, obj, ev, x) => Object.assign({ kind: "obj", otype, obj, ev, where: [], save: [] }, x || {}),
    pos: (srcs, ev, x) => Object.assign({ kind: "pos", srcs, ev, where: [], save: [] }, x || {}),
    cap: (srcs, op, text, x) => Object.assign({ kind: "cap", srcs, op, text, save: [] }, x || {}),
    state: (otype, target, st, x) => Object.assign({ kind: "state", otype, st, save: [] }, otype === "pos" ? { srcs: target } : { obj: target }, x || {})
  };
  function cond(alts, o) {
    return Object.assign({ type: "ev", neg: false, time: { mode: "after", sec: 10, ref: 0 }, count: 1, per: 5, perMode: "sec", group: "", alts }, o || {});
  }
  function stCond(st, o) { return Object.assign({ type: "st", time: { mode: "at", sec: 5, ref: 0 }, alts: [st] }, o || {}); }
  function cmpCond(left, op, right, tol) { return { type: "cmp", left, op, right, tol: tol || "" }; }
  function defaultEv(kind) {
    if (kind === "obj") return EV.obj("cam", OBJ_TYPES.cam.objects[0], OBJ_TYPES.cam.events[0]);
    if (kind === "pos") return EV.pos(["*"], "Возврат");
    if (kind === "state") return EV.state("pos", ["*"], "Чек открыт");
    return EV.cap(["*"], "contains", "");
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const letter = (i) => String.fromCharCode(65 + i);
  const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(tr(l))}</option>`).join("");
  const prioLabel = (p) => tr((PRIOS.find(x => x[0] === p) || PRIOS[1])[1]);
  const lbl = (list, v) => (list.find(o => o[0] === v) || list[0])[1];
  const srcSummary = (e) => (R ? R.summary(e.srcs, e.kind === "cap" ? null : POS_FILTER) : "");

  /* ---------- data: my scenarios ---------- */
  let scenarios = [
    { id: 1, name: "Аннуляция или возврат без покупателя", desc: "Кассир аннулирует чек или оформляет возврат, когда у кассы нет покупателя. Типичная схема присвоения денег.", prio: "high", on: true, repeat: { mode: "after", sec: 60 }, camera: "auto", schedule: "Всегда", conds: [
      cond([EV.cap(["fr-5"], "contains", "АННУЛЯЦИЯ"), EV.cap(["fr-5"], "contains", "ВОЗВРАТ")]),
      cond([EV.obj("cam", "CAM-142-11 · Касса 5 · зона покупателя", "Человек в зоне")], { neg: true, time: { mode: "around", sec: 10, ref: 0 } })
    ] },
    { id: 2, name: "Коньяк у кассира Петрова", desc: "Контроль продажи крепкого алкоголя конкретным кассиром по жалобе.", prio: "mid", on: true, repeat: { mode: "after", sec: 0 }, camera: "auto", schedule: "Всегда", conds: [
      cond([EV.pos(TILLS, "Добавление позиции", { where: [{ attr: "Товар", op: "has", val: "КОНЬЯК" }, { attr: "Кассир", op: "eq", val: "Петров С." }] })])
    ] },
    { id: 3, name: "Склад: датчик двери и человек на камере", desc: "Ночью сработал датчик двери склада, и камера подтвердила человека в проёме.", prio: "high", on: true, repeat: { mode: "after", sec: 120 }, camera: "CAM-142-21 · Склад · дверь 2", schedule: "Только когда магазин закрыт", conds: [
      cond([EV.obj("sec", "Склад · дверь 2 · геркон", "Тревога")]),
      cond([EV.obj("cam", "CAM-142-21 · Склад · дверь 2", "Человек в зоне")], { time: { mode: "after", sec: 30, ref: 0 } })
    ] },
    { id: 4, name: "Кража в сговоре — проверка 180 с", desc: "Вариант менеджера: тревога, если оставленную у выхода корзину за 3 минуты не забрал владелец.", prio: "mid", on: false, repeat: { mode: "never", sec: 0 }, camera: "CAM-142-01 · Вход / выход", schedule: "В часы работы магазина", conds: [
      cond([EV.obj("cam", "CAM-142-01 · Вход / выход", "Оставленный предмет", { save: [{ name: "предмет", attr: "ID предмета" }, { name: "владелец", attr: "ID трека" }] })]),
      cond([EV.obj("cam", "CAM-142-01 · Вход / выход", "Предмет перемещён", { where: [{ attr: "ID предмета", op: "eq", val: "{A.предмет}" }, { attr: "ID трека", op: "eq", val: "{A.владелец}" }] })], { neg: true, time: { mode: "after", sec: 180, ref: 0 } })
    ] }
  ];

  /* ---------- data: server templates — every scenario of ТЗ §10 ---------- */
  const T = (id, code, name, prio, desc, conds, x) => Object.assign({ id, code, name, desc, prio, on: true, repeat: { mode: "after", sec: 60 }, camera: "auto", schedule: "В часы работы магазина", conds }, x || {});
  const CASH_DESK = "CAM-142-11 · Касса 5 · кассовый стол", BUYER = "CAM-142-11 · Касса 5 · зона покупателя", CASHIER = "CAM-142-11 · Касса 5 · зона кассира", SCO = "CAM-142-17 · КСО-2 · площадка", GATE = "CAM-142-01 · Вход / выход";
  const templates = [
    T("t-retail-01", "RETAIL-01", "Подготовка кражи в сговоре", "mid",
      "Посетитель оставляет корзину с товаром у входа, через некоторое время другой человек забирает и выносит её.", [
      cond([EV.obj("cam", GATE, "Оставленный предмет", { save: [{ name: "предмет", attr: "ID предмета" }, { name: "владелец", attr: "ID трека" }] })]),
      cond([EV.obj("cam", GATE, "Предмет перемещён", { where: [{ attr: "ID предмета", op: "eq", val: "{A.предмет}" }, { attr: "ID трека", op: "ne", val: "{A.владелец}" }] })], { time: { mode: "after", sec: 900, ref: 0 } })
    ], { camera: GATE, repeat: { mode: "after", sec: 300 } }),
    T("t-retail-01b", "RETAIL-01", "Оставленный предмет не забран владельцем", "mid",
      "Корзина или сумка оставлена у выхода и за заданное время (3 минуты) владелец её не забрал. Задержка тревоги — таймер условия «НЕ произошло».", [
      cond([EV.obj("cam", GATE, "Оставленный предмет", { save: [{ name: "предмет", attr: "ID предмета" }, { name: "владелец", attr: "ID трека" }] })]),
      cond([EV.obj("cam", GATE, "Предмет перемещён", { where: [{ attr: "ID предмета", op: "eq", val: "{A.предмет}" }, { attr: "ID трека", op: "eq", val: "{A.владелец}" }] })], { neg: true, time: { mode: "after", sec: 180, ref: 0 } })
    ], { camera: GATE, repeat: { mode: "never", sec: 0 } }),
    T("t-retail-02", "RETAIL-02", "Быстрый хаотичный набор товаров", "low",
      "Посетитель очень быстро набирает товары в корзину или сумку — один товар за 0,5–2 секунды.", [
      cond([EV.obj("cam", "CAM-142-12 · Зал · молочный стеллаж", "Движение руки к полке")], { count: 3, per: 5 })
    ]),
    T("t-pos-01", "POS-01", "Операция без покупателя", "high",
      "Возврат, аннуляция или открытие денежного ящика, когда у кассы нет покупателя.", [
      cond([EV.pos(["fr-5"], "Возврат"), EV.pos(["fr-5"], "Отмена / аннуляция"), EV.pos(["fr-5"], "Открытие денежного ящика")]),
      cond([EV.obj("cam", BUYER, "Человек в зоне")], { neg: true, time: { mode: "around", sec: 10, ref: 0 } })
    ]),
    T("t-pos-02", "POS-02", "Возврат при покупателе, товаров нет", "high",
      "Кассир оформляет возврат при покупателе, но товара на кассе нет — возврат в сговоре.", [
      cond([EV.pos(["fr-5"], "Возврат")]),
      stCond(EV.state("cam", BUYER, "Человек в зоне")),
      stCond(EV.state("cam", CASH_DESK, "Товаров в зоне: 0"))
    ]),
    T("t-pos-03", "POS-03", "Отмена сразу после оплаты наличными", "high",
      "Кассир отменяет чек в течение 10 секунд после оплаты наличными.", [
      cond([EV.pos(TILLS, "Оплата наличными", { save: [{ name: "чек", attr: "Номер чека" }] })]),
      cond([EV.pos(TILLS, "Отмена / аннуляция", { where: [{ attr: "Номер чека", op: "eq", val: "{A.чек}" }] })], { time: { mode: "after", sec: 10, ref: 0 } })
    ]),
    T("t-pos-04", "POS-04", "Наличные в зоне без POS-операции", "high",
      "На кассовом столе видны наличные, а касса за 30 секунд не провела оплату наличными — подозрение на присвоение.", [
      cond([EV.obj("cam", CASH_DESK, "Наличные в зоне")]),
      cond([EV.pos(["fr-5"], "Оплата наличными")], { neg: true, time: { mode: "after", sec: 30, ref: 0 } })
    ]),
    T("t-pos-05", "POS-05", "Обслуживание покупателя без чека", "high",
      "Кассир обслуживает покупателя и берёт наличные, но касса молчит — чек не пробит.", [
      cond([EV.obj("cam", CASH_DESK, "Наличные в зоне")]),
      stCond(EV.state("cam", BUYER, "Человек в зоне")),
      stCond(EV.state("cam", CASHIER, "Человек в зоне")),
      cond([EV.pos(["fr-5"], "Любое событие кассы")], { neg: true, time: { mode: "after", sec: 30, ref: 0 } })
    ]),
    T("t-pos-06", "POS-06", "Пронос товара мимо сканера", "high",
      "Рука с товаром прошла ленту и сканер, но позиция не попала в чек, затем товар уложен в зону упаковки.", [
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона ленты", "Рука: вход и выход из зоны")]),
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона сканера", "Рука: вход и выход из зоны")], { time: { mode: "after", sec: 3, ref: 0 } }),
      cond([EV.pos(["pos-2"], "Добавление позиции"), EV.pos(["pos-2"], "Информация о товаре (в т.ч. «Честный знак»)")], { neg: true, time: { mode: "after", sec: 2, ref: 1 } }),
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона укладки", "Рука: вход и выход из зоны")], { time: { mode: "after", sec: 4, ref: 1 } })
    ], { camera: "CAM-142-09 · Касса 2 · зона сканера", repeat: { mode: "after", sec: 30 } }),
    T("t-pos-07", "POS-07", "Расхождение количества товаров на КСО", "high",
      "На площадке КСО товаров больше, чем пробито в чеке: X − Y ≥ 2. На видео — счётчик «на площадке : в чеке».", [
      cond([EV.pos(["kso-2"], "Закрытие чека", { save: [{ name: "Y", attr: "Число позиций" }] })]),
      stCond(EV.state("cam", SCO, "Товаров в зоне — значение", { save: [{ name: "X", attr: "Число товаров" }] }), { time: { mode: "sbefore", sec: 5, ref: 0 } }),
      cmpCond("{B.X} − {A.Y}", "ge", "2")
    ], { camera: SCO }),
    T("t-pos-08", "POS-08", "Неоплата: товары отсканированы и унесены", "high",
      "Покупатель отсканировал товары, забрал их и ушёл, не оплатив чек: чек открыт, площадка пуста.", [
      cond([EV.obj("cam", SCO, "Человек покинул зону")]),
      stCond(EV.state("pos", ["kso-2"], "Чек открыт")),
      stCond(EV.state("cam", SCO, "Товаров в зоне: 0"), { time: { mode: "safter", sec: 5, ref: 0 } })
    ], { camera: SCO }),
    T("t-pos-09", "POS-09", "Посетитель бросил процесс покупки", "mid",
      "Покупатель ушёл, оставив товары на КСО: чек открыт, количество товаров до и после ухода почти не изменилось.", [
      cond([EV.obj("cam", SCO, "Человек покинул зону")]),
      stCond(EV.state("pos", ["kso-2"], "Чек открыт")),
      stCond(EV.state("cam", SCO, "Товаров в зоне — значение", { save: [{ name: "X", attr: "Число товаров" }] }), { time: { mode: "sbefore", sec: 2, ref: 0 } }),
      stCond(EV.state("cam", SCO, "Товаров в зоне — значение", { save: [{ name: "X2", attr: "Число товаров" }] }), { time: { mode: "safter", sec: 5, ref: 0 } }),
      cmpCond("{D.X2}", "ge", "{C.X} − 2")
    ], { camera: SCO }),
    T("t-pos-10", "POS-10", "Неоплата весового товара", "high",
      "Весы выдали штрихкод на дорогой товар, а за 12 минут этот штрихкод не пробит ни на кассе, ни на КСО.", [
      cond([EV.pos(SCALES, "Весы: выдан штрихкод", { save: [{ name: "штрихкод", attr: "Штрихкод" }] })]),
      cond([EV.pos(TILLS, "Добавление позиции", { where: [{ attr: "Штрихкод", op: "eq", val: "{A.штрихкод}" }] })], { neg: true, time: { mode: "after", sec: 720, ref: 0 } })
    ], { repeat: { mode: "never", sec: 0 } }),
    T("t-pos-11", "POS-11", "Совпадение веса разных весовых товаров", "mid",
      "После штрихкода на дорогой весовой товар весы выдали штрихкод на другой товар с тем же весом (± 20 г) — подмена товара.", [
      cond([EV.pos(SCALES, "Весы: выдан штрихкод", { save: [{ name: "вес", attr: "Вес, г" }, { name: "наименование", attr: "Наименование" }] })]),
      cond([EV.pos(SCALES, "Весы: выдан штрихкод", { where: [{ attr: "Наименование", op: "ne", val: "{A.наименование}" }], save: [{ name: "вес", attr: "Вес, г" }] })], { time: { mode: "after", sec: 600, ref: 0 } }),
      cmpCond("{B.вес}", "eq", "{A.вес}", "20")
    ]),
    T("t-anl-01", "ANL-01", "Аномальное поведение кассира", "mid",
      "У кассира за смену 10 и больше возвратов и аннуляций. Нормированный показатель на 100 чеков — в отчётах.", [
      cond([EV.pos(TILLS, "Возврат"), EV.pos(TILLS, "Отмена / аннуляция")], { count: 10, perMode: "shift", group: "кассир" })
    ], { repeat: { mode: "never", sec: 0 } }),
    T("t-log-01", "LOG-01", "Расхождение при приёмке / отгрузке", "mid",
      "Количество мест, посчитанное камерой на воротах, не совпадает с накладной WMS.", [
      cond([EV.obj("ext", "WMS склада", "WMS: накладная закрыта", { save: [{ name: "мест", attr: "Мест по накладной" }] })]),
      cond([EV.obj("cam", "CAM-142-30 · Склад · ворота погрузки", "Подсчёт мест завершён", { save: [{ name: "факт", attr: "Число объектов" }] })], { time: { mode: "around", sec: 600, ref: 0 } }),
      cmpCond("{B.факт}", "ne", "{A.мест}")
    ], { camera: "CAM-142-30 · Склад · ворота погрузки", schedule: "Всегда" }),
    T("t-ext-01", "3.2.16", "Сигнал партнёра: подмена штрихкода", "high",
      "Внешняя система распознавания сообщила о подмене штрихкода; тревога показывается наравне со встроенными сценариями.", [
      cond([EV.obj("ext", "Партнёр: контроль штрихкодов", "Сигнал: подмена штрихкода")])
    ]),
    T("t-fire", "", "Пожар или крик на складе и люди", "high",
      "Пример без кассы: пожарный извещатель или крик на складе, и в это время на складе люди.", [
      cond([EV.obj("fire", "Склад · тепловой", "Пожар"), EV.obj("mic", "Склад · микрофон", "Крик")]),
      cond([EV.obj("cam", "CAM-142-21 · Склад · дверь 2", "Человек в зоне")], { time: { mode: "around", sec: 60, ref: 0 } })
    ], { camera: "CAM-142-21 · Склад · дверь 2", schedule: "Всегда", repeat: { mode: "after", sec: 300 } })
  ];
  function blankScenario() {
    return { name: "", desc: "", prio: "mid", on: true, repeat: { mode: "after", sec: 60 }, camera: "auto", schedule: "Всегда", conds: [cond([defaultEv("pos")])] };
  }

  let root = null, toastFn = null, changeFn = null;
  let editingId = scenarios[0].id, tplId = null;
  let draft = clone(scenarios[0]);
  let errors = [];            // [{ id, msg }] — highlighted after render
  const cmpFocus = {};        // cond index → "left" | "right"
  const $ = (id) => document.getElementById(id);
  function toast(msg) {
    if (toastFn) return toastFn(msg);
    if (typeof global.toast === "function") return global.toast(msg);
    if (typeof global.demoAction === "function") return global.demoAction(msg);
  }

  /* ---------- variables ---------- */
  function varsBefore(s, i) {
    const out = [];
    s.conds.slice(0, i).forEach((c, k) => {
      if (c.type === "cmp") return;
      c.alts.forEach((e, j) => (e.save || []).forEach(v => {
        if (v.name) out.push({ token: `{${letter(k)}.${v.name}}`, cond: k, alt: c.alts.length > 1 ? j : null, neg: !!c.neg });
      }));
    });
    return out;
  }
  const tokensIn = (str) => (String(str || "").match(/\{[A-Z]\.[^{}\s]+\}/g) || []);
  function usedTokens(c) {
    if (c.type === "cmp") return tokensIn(c.left).concat(tokensIn(c.right), tokensIn(c.tol));
    return c.alts.flatMap(e => (e.kind === "cap" ? tokensIn(e.text) : []).concat((e.where || []).flatMap(w => tokensIn(w.val))));
  }
  function undefinedTokens(s) {
    const bad = [];
    s.conds.forEach((c, i) => {
      const known = varsBefore(s, i).map(v => v.token);
      usedTokens(c).forEach(tok => { if (!known.includes(tok)) bad.push({ cond: i, token: tok }); });
    });
    return bad;
  }
  const hl = (s) => esc(s).replace(/\{[A-Z]\.[^{}\s]+\}/g, m => `<span class="sce-var">${m}</span>`);
  function autoName(e, v) {
    if (e.kind === "cap") {
      if (v.preset === "num") return (v.word || "число").toLowerCase().replace(/[^0-9a-zа-яё_]/gi, "").slice(0, 16) || "число";
      return { barcode: "штрихкод", line: "строка", re: "знач" }[v.preset] || "знач";
    }
    return ATTR_NAMES[v.attr] || "знач";
  }
  function uniqueName(e, base, self) {
    const taken = (e.save || []).filter(v => v !== self).map(v => v.name);
    let name = base, n = 2;
    while (taken.includes(name)) name = base + n++;
    return name;
  }

  /* ---------- text ---------- */
  const capSrc = (e) => srcSummary(e);
  function saveText(e, L) {
    if (!e.save || !e.save.length) return "";
    const parts = e.save.map(v => {
      const from = e.kind === "cap" ? (v.preset === "num" ? tr("число после «{w}»", { w: v.word || "…" }) : v.preset === "re" ? `<code>${esc(v.re || "…")}</code>` : esc(tr(lbl(SAVE_PRESETS, v.preset)).toLowerCase())) : esc(tr(v.attr));
      return `<span class="sce-var">{${L}.${esc(v.name)}}</span> = ${from}`;
    });
    return ` <span class="sce-muted">(${esc(tr("запомнить"))} ${parts.join(", ")})</span>`;
  }
  const whereText = (e) => (e.where && e.where.length ? ", " + esc(tr("где")) + " " + e.where.map(w => `${esc(tr(w.attr))} ${esc(tr(lbl(WHERE_OPS, w.op)))} ${hl(w.val || "…")}`).join(` ${esc(tr("и"))} `) : "");
  function evText(e, L) {
    if (e.kind === "obj") return `${esc(tr(OBJ_TYPES[e.otype].short))} «${esc(tr(e.obj))}»: <b>${esc(tr(e.ev))}</b>${whereText(e)}${saveText(e, L)}`;
    if (e.kind === "pos") return `${esc(tr("касса"))} «${esc(srcSummary(e))}»: <b>${esc(tr(e.ev))}</b>${whereText(e)}${saveText(e, L)}`;
    if (e.kind === "state") return `${esc(tr("состояние"))} ${esc(tr(STATES[e.otype].name))} «${esc(e.otype === "pos" ? srcSummary(e) : tr(e.obj))}»: <b>${esc(tr(e.st))}</b>${saveText(e, L)}`;
    if (e.op === "any") return `${esc(tr("титры"))} «${esc(capSrc(e))}»: <b>${esc(tr("любая строка"))}</b>${saveText(e, L)}`;
    return `${esc(tr("титры"))} «${esc(capSrc(e))}» ${esc(tr(lbl(CAP_OPS, e.op)))} <b>«${hl(e.text || "…")}»</b>${saveText(e, L)}`;
  }
  const evShort = (e) => {
    if (e.kind === "obj" || e.kind === "pos") return tr(e.ev);
    if (e.kind === "state") return tr(e.st);
    if (e.op === "any") return tr("любая строка");
    return `${e.op === "notcontains" ? tr("нет") + " " : ""}«${e.text || "…"}»`;
  };
  const cmpText = (c) => `${c.left || "…"} ${lbl(CMP_OPS, c.op)} ${c.right || "…"}${c.tol ? " ± " + c.tol : ""}`;
  function timeText(c) {
    const v = { n: c.time.sec, r: letter(c.time.ref) };
    const m = c.time.mode;
    if (m === "after") return tr("в течение {n} сек после {r}", v);
    if (m === "before") return tr("не раньше чем за {n} сек до {r}", v);
    if (m === "around") return tr("в пределах ±{n} сек от {r}", v);
    if (m === "receipt") return tr("в том же чеке, что и {r}", v);
    if (m === "at") return tr("в момент {r}", v);
    if (m === "sbefore") return tr("за {n} сек до {r}", v);
    return tr("через {n} сек после {r}", v);
  }
  function timeShort(c) {
    const r = letter(c.time.ref), n = c.time.sec, m = c.time.mode;
    if (m === "after") return `${r}+${n}${tr("с")}`;
    if (m === "before") return `${r}−${n}${tr("с")}`;
    if (m === "around") return `${r}±${n}${tr("с")}`;
    if (m === "receipt") return tr("чек {r}", { r });
    if (m === "at") return "@" + r;
    if (m === "sbefore") return `@${r}−${n}${tr("с")}`;
    return `@${r}+${n}${tr("с")}`;
  }
  function repText(c) {
    if (c.type !== "ev" || c.count <= 1 || c.neg) return "";
    const g = c.group ? " " + tr("для одного {g}", { g: tr(lbl(GROUP_BY, c.group)) }) : "";
    return c.perMode === "shift" ? tr("не менее {n} раз за смену", { n: c.count }) + g : tr("не менее {n} раз за {p} сек", { n: c.count, p: c.per }) + g;
  }
  function condToken(c, i) {
    const L = letter(i);
    if (c.type === "cmp") return `(${cmpText(c)})`;
    let tok = c.alts.length > 1 ? "(" + c.alts.map((_, j) => L + (j + 1)).join(" " + tr("ИЛИ") + " ") + ")" : L;
    if (c.type === "ev" && c.count > 1 && !c.neg) tok += c.perMode === "shift" ? ` ×${c.count}/${tr("смена")}` : ` ×${c.count}/${c.per}${tr("с")}`;
    if (i > 0) tok += ` [${timeShort(c)}]`;
    return (c.neg ? tr("НЕ") + " " : "") + tok;
  }
  const formula = (s) => s.conds.map(condToken).join(" " + tr("И") + " ");
  const repeatText = (s) => (s.repeat.mode === "never" ? tr("Повторять через: никогда") : s.repeat.sec ? tr("Повторять через: {n} сек", { n: s.repeat.sec }) : tr("Повторять через: сразу"));

  /* ---------- skeleton ---------- */
  function skeleton() {
    return `
    <div class="sce-layout">
      <div class="sce-panel">
        <div class="sce-ph"><span>${tr("Мои сценарии")}</span>
          <button type="button" class="btn btn-ghost sce-small" onclick="SCE.newScenario()">${tr("+ Новый")}</button></div>
        <div id="sce-list"></div>
        <div class="sce-ph sce-sub-h">${tr("Базовые сценарии · только просмотр")}</div>
        <div id="sce-tpl"></div>
      </div>
      <div class="sce-editor">
        <div id="sce-ro" class="sce-note sce-ro sce-hidden">
          <span><strong>${tr("Базовый сценарий.")}</strong> ${tr("Его правит администратор. Чтобы изменить под себя — создайте копию.")}</span>
          <button type="button" class="btn btn-primary sce-small" onclick="SCE.copyTemplate()">${tr("Создать копию")}</button>
        </div>
        <fieldset id="sce-fs" class="sce-fs">
          <div class="sce-panel">
            <div class="sce-ph"><span id="sce-title"></span><span id="sce-code" class="chip sce-hidden"></span></div>
            <div class="sce-head">
              <div class="sce-fg"><label for="sce-name">${tr("Название сценария")}</label>
                <input id="sce-name" class="field" placeholder="${esc(tr("Например, аннуляция без покупателя"))}" oninput="SCE.setTop('name', this.value, true)"></div>
              <div class="sce-fg"><label for="sce-on">${tr("Статус")}</label>
                <select id="sce-on" class="field" onchange="SCE.setTop('on', this.value === '1')"></select></div>
              <div class="sce-fg sce-desc-fg"><label for="sce-desc">${tr("Описание сценария")}</label>
                <textarea id="sce-desc" class="field" rows="2" placeholder="${esc(tr("Что происходит, что предотвращает сценарий. Попадает в карточку тревоги и в отчёт PDF."))}" oninput="SCE.setTop('desc', this.value, true)"></textarea></div>
            </div>
          </div>
          <div class="sce-panel">
            <div class="sce-ph"><span>${tr("Если — условия")}</span>
              <span class="sce-meta sce-hint">${tr("Условия связаны «И», варианты внутри — «ИЛИ». «НЕ произошло» — события не было за время таймера. Значение можно запомнить и использовать дальше как {A.имя}.")}</span></div>
            <div id="sce-conds" class="sce-conds"></div>
            <div class="sce-row sce-add">
              <button type="button" class="btn" onclick="SCE.addCond('pos')">${tr("+ Кассовое событие")}</button>
              <button type="button" class="btn" onclick="SCE.addCond('obj')">${tr("+ Событие объекта")}</button>
              <button type="button" class="btn" onclick="SCE.addCond('cap')">${tr("+ Строка титров")}</button>
              <button type="button" class="btn" onclick="SCE.addCond('state')">${tr("+ Состояние")}</button>
              <button type="button" class="btn" onclick="SCE.addCond('cmp')">${tr("+ Сравнение значений")}</button>
            </div>
          </div>
          <div class="sce-panel">
            <div class="sce-ph">${tr("Как сценарий срабатывает во времени")}</div>
            <div id="sce-timeline" class="sce-timeline"></div>
            <div id="sce-readable" class="sce-readable"></div>
          </div>
          <div class="sce-panel">
            <div class="sce-ph">${tr("Тогда — создать тревогу")}</div>
            <div class="sce-then">
              <div class="sce-fg"><label for="sce-prio">${tr("Приоритет")}</label><select id="sce-prio" class="field" onchange="SCE.setTop('prio', this.value)"></select></div>
              <div class="sce-fg"><label for="sce-camera">${tr("Видео в карточке тревоги")}</label><select id="sce-camera" class="field" onchange="SCE.setTop('camera', this.value, true)"></select></div>
              <div class="sce-fg"><label for="sce-repeat">${tr("Повторять через")}</label>
                <div class="sce-repeat"><select id="sce-repeat" class="field" onchange="SCE.setRepeat('mode', this.value)"></select>
                  <input id="sce-repeat-sec" class="field" type="number" min="0" aria-label="${esc(tr("Секунд"))}" oninput="SCE.setRepeat('sec', Number(this.value), true)"><span id="sce-repeat-unit">${tr("сек")}</span></div></div>
              <div class="sce-fg"><label for="sce-schedule">${tr("Когда сценарий работает")}</label><select id="sce-schedule" class="field" onchange="SCE.setTop('schedule', this.value)"></select></div>
            </div>
            <div class="sce-then-hint">${tr("«Повторять через» — пауза до следующей тревоги этого сценария по тому же объекту; 0 — сразу, «Никогда» — одна тревога, пока ситуация продолжается. Задержка перед тревогой задаётся таймером условия «НЕ произошло».")}</div>
          </div>
        </fieldset>
        <div class="sce-panel sce-actions">
          <div class="sce-row">
            <button type="button" id="sce-save" class="btn btn-primary" onclick="SCE.save()">${tr("Сохранить")}</button>
            <button type="button" class="btn" onclick="SCE.test()">${tr("Проверить на архиве")}</button>
            <button type="button" id="sce-reset" class="btn btn-ghost" onclick="SCE.reset()">${tr("Отменить изменения")}</button>
            <button type="button" id="sce-delete" class="btn btn-danger" onclick="SCE.remove()">${tr("Удалить")}</button>
          </div>
        </div>
        <div id="sce-test" class="sce-panel sce-hidden">
          <div class="sce-ph"><span id="sce-test-title"></span></div>
          <div id="sce-test-body"></div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- list ---------- */
  function renderList() {
    const item = (s, isTpl) => {
      const active = isTpl ? tplId === s.id : (!tplId && editingId === s.id);
      const click = isTpl ? `SCE.openTemplate('${s.id}')` : `SCE.edit(${s.id})`;
      const state = isTpl ? "🔒 " + tr("сервер") : (s.on ? tr("включён") : tr("выключен"));
      return `<button type="button" class="sce-item ${active ? "active" : ""}" onclick="${click}">
        <span class="sce-item-h"><span>${s.code ? `<span class="sce-code">${esc(s.code)}</span> ` : ""}${esc(tr(s.name))}</span><span class="chip prio-${s.prio}">${esc(prioLabel(s.prio))}</span></span>
        ${s.desc ? `<span class="sce-desc-mini" title="${esc(tr(s.desc))}">${esc(tr(s.desc))}</span>` : ""}
        <span class="sce-formula-mini">${esc(formula(s))}</span>
        <span class="sce-meta">${esc(state)} · ${esc(tr(s.schedule))}</span>
      </button>`;
    };
    $("sce-list").innerHTML = scenarios.map(s => item(s, false)).join("") || `<div class="sce-empty">${tr("Пока нет своих сценариев")}</div>`;
    $("sce-tpl").innerHTML = templates.map(s => item(s, true)).join("");
  }

  /* ---------- editor ---------- */
  function renderEditor() {
    const ro = !!tplId;
    $("sce-title").textContent = ro ? tr("Базовый сценарий") : editingId ? tr("Редактирование") : tr("Новый сценарий");
    $("sce-code").textContent = draft.code || "";
    $("sce-code").classList.toggle("sce-hidden", !draft.code);
    $("sce-ro").classList.toggle("sce-hidden", !ro);
    $("sce-fs").disabled = ro;
    $("sce-save").classList.toggle("sce-hidden", ro);
    $("sce-reset").classList.toggle("sce-hidden", ro);
    $("sce-delete").classList.toggle("sce-hidden", ro || !editingId);
    $("sce-name").value = ro ? tr(draft.name) : draft.name;
    $("sce-desc").value = ro ? tr(draft.desc || "") : (draft.desc || "");
    $("sce-on").innerHTML = opts([["1", "Включён"], ["0", "Выключен"]], draft.on ? "1" : "0");
    $("sce-prio").innerHTML = opts(PRIOS, draft.prio);
    $("sce-camera").innerHTML = opts([["auto", "Авто — камера из условий"]].concat(OBJ_TYPES.cam.objects.map(o => [o, o])), draft.camera);
    $("sce-repeat").innerHTML = opts([["after", "Через N сек"], ["never", "Никогда"]], draft.repeat.mode);
    $("sce-repeat-sec").value = draft.repeat.sec;
    $("sce-repeat-sec").classList.toggle("sce-hidden", draft.repeat.mode === "never");
    $("sce-repeat-unit").classList.toggle("sce-hidden", draft.repeat.mode === "never");
    $("sce-schedule").innerHTML = opts(SCHEDULES.map(s => [s, s]), draft.schedule);
    $("sce-test").classList.add("sce-hidden");
    renderConds();
  }

  function varChips(i, onclick) {
    const vars = varsBefore(draft, i);
    if (!vars.length) return "";
    return `<span class="sce-avail">${tr("Вставить:")}</span>` + vars.map(v => `<button type="button" class="sce-varchip" title="${esc(v.neg ? tr("из условия «НЕ» — значения не будет") : v.alt != null ? tr("задано, только если сработал этот вариант") : tr("значение из условия {l}", { l: letter(v.cond) }))}" onclick="${onclick(v.token)}">${esc(v.token)}</button>`).join("");
  }

  function extrasHtml(e, i, j) {
    const L = letter(i);
    let h = "";
    (e.save || []).forEach((v, k) => {
      let from;
      if (e.kind === "cap") {
        from = `<select class="field" id="sce-save-${i}-${j}-${k}-preset" onchange="SCE.setX(${i},${j},'save',${k},'preset',this.value)">${opts(SAVE_PRESETS, v.preset)}</select>`;
        if (v.preset === "num") from += `<input class="field" id="sce-save-${i}-${j}-${k}-word" value="${esc(v.word || "")}" placeholder="${esc(tr("слово, например ВЕС"))}" oninput="SCE.setX(${i},${j},'save',${k},'word',this.value,true)">`;
        if (v.preset === "re") from += `<input class="field sce-mono" id="sce-save-${i}-${j}-${k}-re" value="${esc(v.re || "")}" placeholder="${esc(tr("шаблон с (группой), например ШК (\\d+)"))}" oninput="SCE.setX(${i},${j},'save',${k},'re',this.value,true)">`;
      } else {
        const attrs = e.kind === "pos" ? POS_ATTRS : e.kind === "state" ? STATES[e.otype].attrs : OBJ_TYPES[e.otype].attrs;
        from = `<select class="field" id="sce-save-${i}-${j}-${k}-attr" onchange="SCE.setX(${i},${j},'save',${k},'attr',this.value)">${opts(attrs.map(a => [a, a]), v.attr)}</select>`;
      }
      h += `<div class="sce-extra">
        <span class="sce-tag">${tr("Запомнить")}</span>${from}
        <span>${tr("как")}</span>
        <span class="sce-var-name"><span>{${L}.</span><input class="field" id="sce-save-${i}-${j}-${k}-name" value="${esc(v.name)}" aria-label="${esc(tr("имя"))}" oninput="SCE.setX(${i},${j},'save',${k},'name',this.value,true)"><span>}</span></span>
        <button type="button" class="sce-x" title="${esc(tr("Убрать"))}" onclick="SCE.delX(${i},${j},'save',${k})">×</button></div>`;
    });
    if (e.kind === "obj" || e.kind === "pos") (e.where || []).forEach((w, k) => {
      const attrs = e.kind === "pos" ? POS_ATTRS : OBJ_TYPES[e.otype].attrs;
      h += `<div class="sce-extra">
        <span class="sce-tag">${tr("Где")}</span>
        <select class="field" onchange="SCE.setX(${i},${j},'where',${k},'attr',this.value)">${opts(attrs.map(a => [a, a]), w.attr)}</select>
        <select class="field sce-op" onchange="SCE.setX(${i},${j},'where',${k},'op',this.value)">${opts(WHERE_OPS, w.op)}</select>
        <input class="field sce-mono" id="sce-where-${i}-${j}-${k}" value="${esc(w.val)}" placeholder="${esc(tr("значение или {A.имя}"))}" oninput="SCE.setX(${i},${j},'where',${k},'val',this.value,true)">
        <button type="button" class="sce-x" title="${esc(tr("Убрать"))}" onclick="SCE.delX(${i},${j},'where',${k})">×</button></div>`;
    });
    h += `<div class="sce-ev-links">
      <button type="button" class="sce-link" onclick="SCE.addX(${i},${j},'save')">${tr("+ Запомнить значение")}</button>
      ${e.kind === "obj" || e.kind === "pos" ? `<button type="button" class="sce-link" onclick="SCE.addX(${i},${j},'where')">${tr("+ Условие на атрибут")}</button>` : ""}
      ${e.kind === "state" ? "" : varChips(i, (tok) => `SCE.insertVar(${i},${j},'${esc(tok)}')`)}</div>`;
    return h;
  }

  function evHtml(e, i, j, canDel, isState) {
    const del = canDel ? `<button type="button" class="sce-x" title="${esc(tr("Убрать вариант"))}" onclick="SCE.removeAlt(${i},${j})">×</button>` : "<span></span>";
    let row;
    if (isState) {
      const st = STATES[e.otype];
      const target = e.otype === "pos" ? `<div class="sce-picker" data-picker="${i}-${j}"></div>` : `<select class="field" title="${esc(tr("Объект"))}" onchange="SCE.setEv(${i},${j},'obj',this.value)">${opts(OBJ_TYPES.cam.objects.map(o => [o, o]), e.obj)}</select>`;
      row = `<div class="sce-ev"><select class="field" title="${esc(tr("Чьё состояние"))}" onchange="SCE.setEv(${i},${j},'otype',this.value)">${opts([["pos", "Касса"], ["cam", "Камера"]], e.otype)}</select>
        ${target}<select class="field" title="${esc(tr("Состояние"))}" onchange="SCE.setEv(${i},${j},'st',this.value)">${opts(st.states.map(s => [s, s]), e.st)}</select><span></span>${del}</div>`;
    } else {
      const kind = `<select class="field" title="${esc(tr("Тип события"))}" onchange="SCE.setKind(${i},${j},this.value)">${opts([["pos", "Касса"], ["obj", "Объект"], ["cap", "Титры"]], e.kind)}</select>`;
      if (e.kind === "obj") {
        const ot = OBJ_TYPES[e.otype];
        row = `<div class="sce-ev">${kind}
          <select class="field" title="${esc(tr("Тип объекта"))}" onchange="SCE.setEv(${i},${j},'otype',this.value)">${opts(Object.keys(OBJ_TYPES).map(k => [k, OBJ_TYPES[k].name]), e.otype)}</select>
          <select class="field" title="${esc(tr("Объект"))}" onchange="SCE.setEv(${i},${j},'obj',this.value)">${opts(ot.objects.map(o => [o, o]), e.obj)}</select>
          <select class="field" title="${esc(tr("Событие"))}" onchange="SCE.setEv(${i},${j},'ev',this.value)">${opts(ot.events.map(o => [o, o]), e.ev)}</select>
          ${del}</div>`;
      } else if (e.kind === "pos") {
        row = `<div class="sce-ev">${kind}
          <div class="sce-picker" data-picker="${i}-${j}"></div>
          <select class="field" title="${esc(tr("Кассовое событие"))}" onchange="SCE.setEv(${i},${j},'ev',this.value)">${opts(POS_EVENTS.map(o => [o, o]), e.ev)}</select>
          <span></span>${del}</div>`;
      } else {
        const ph = e.op === "regex" ? tr("например, ВОЗВРАТ|АННУЛ") : tr("текст строки, например АННУЛЯЦИЯ или {A.код}");
        row = `<div class="sce-ev">${kind}
          <div class="sce-picker" data-picker="${i}-${j}"></div>
          <select class="field" title="${esc(tr("Как искать"))}" onchange="SCE.setEv(${i},${j},'op',this.value)">${opts(CAP_OPS, e.op)}</select>
          ${e.op === "any" ? `<span class="sce-muted sce-any">${tr("текст не нужен")}</span>` : `<input id="sce-text-${i}-${j}" class="field sce-mono" value="${esc(e.text)}" placeholder="${esc(ph)}" oninput="SCE.setEv(${i},${j},'text',this.value,true)">`}
          ${del}</div>`;
      }
    }
    return `<div class="sce-evwrap">${row}${extrasHtml(e, i, j)}</div>`;
  }

  function refOptions(i, cur) {
    return opts(draft.conds.slice(0, i).map((c, k) => [k, letter(k)]).filter(([k]) => draft.conds[k].type !== "cmp"), cur);
  }

  function cmpHtml(c, i) {
    const del = draft.conds.length > 1 ? `<button type="button" class="sce-x" title="${esc(tr("Удалить условие"))}" onclick="SCE.removeCond(${i})">×</button>` : "";
    return `<div class="sce-cond cmp">
      <div class="sce-cond-h"><span class="sce-letter">${letter(i)}</span><span class="sce-start">${tr("Сравнить значения · проверяется в момент решения")}</span>${del}</div>
      <div class="sce-cmp">
        <input id="sce-cmp-${i}-left" class="field sce-mono" value="${esc(c.left)}" placeholder="{A.X} − {B.Y}" aria-label="${esc(tr("Левая часть"))}" onfocus="SCE.cmpFocus(${i},'left')" oninput="SCE.setCmp(${i},'left',this.value)">
        <select class="field sce-op" aria-label="${esc(tr("Сравнение"))}" onchange="SCE.setCmp(${i},'op',this.value,true)">${opts(CMP_OPS, c.op)}</select>
        <input id="sce-cmp-${i}-right" class="field sce-mono" value="${esc(c.right)}" placeholder="2" aria-label="${esc(tr("Правая часть"))}" onfocus="SCE.cmpFocus(${i},'right')" oninput="SCE.setCmp(${i},'right',this.value)">
        <span>±</span>
        <input id="sce-cmp-${i}-tol" class="field sce-mono sce-tol" value="${esc(c.tol)}" placeholder="${esc(tr("допуск"))}" aria-label="${esc(tr("Допуск"))}" oninput="SCE.setCmp(${i},'tol',this.value)">
      </div>
      <div class="sce-ev-links">${varChips(i, (tok) => `SCE.cmpInsert(${i},'${esc(tok)}')`) || `<span class="sce-muted">${tr("Сначала запомните значения в условиях выше — «+ Запомнить значение».")}</span>`}</div>
      <div class="sce-timer"><span class="sce-muted">${tr("Пример: {B.X} − {A.Y} ≥ 2 или {B.вес} = {A.вес} ± 20. Можно складывать и вычитать числа.")}</span></div>
    </div>`;
  }

  function condHtml(c, i) {
    if (c.type === "cmp") return cmpHtml(c, i);
    const isState = c.type === "st";
    let head;
    if (i === 0) head = `<span class="sce-start">${tr("Произошло · стартовое событие, от него считаются таймеры")}</span>`;
    else if (isState) head = `<span class="sce-start">${tr("Состояние в момент события")}</span>`;
    else head = `<select class="field" onchange="SCE.setNeg(${i},this.value)">${opts([["0", "Произошло"], ["1", "НЕ произошло"]], c.neg ? "1" : "0")}</select>`;
    const delCond = draft.conds.length > 1 ? `<button type="button" class="sce-x" title="${esc(tr("Удалить условие"))}" onclick="SCE.removeCond(${i})">×</button>` : "";
    const events = c.alts.map((e, j) => (j ? `<div class="sce-or">${tr("ИЛИ")}</div>` : "") + evHtml(e, i, j, c.alts.length > 1, isState)).join("");
    let timer = `<span aria-hidden="true">⏱</span>`;
    if (i > 0) {
      const sec = `<input class="field" type="number" min="1" value="${c.time.sec}" aria-label="${esc(tr("Секунд"))}" oninput="SCE.setTime(${i},'sec',this.value,true)">`;
      const ref = `<select class="field" aria-label="${esc(tr("От какого условия"))}" onchange="SCE.setTime(${i},'ref',this.value)">${refOptions(i, c.time.ref)}</select>`;
      const m = c.time.mode;
      timer += `<b>${tr(isState ? "Когда проверить:" : "Таймер:")}</b><select class="field" onchange="SCE.setTime(${i},'mode',this.value)">${opts(isState ? STATE_MODES : TIME_MODES, m)}</select>`;
      if (m === "after") timer += `<span>${tr("в течение")}</span>${sec}<span>${tr("сек после")}</span>${ref}`;
      else if (m === "before") timer += `<span>${tr("не раньше чем за")}</span>${sec}<span>${tr("сек до")}</span>${ref}`;
      else if (m === "around") timer += `<span>±</span>${sec}<span>${tr("сек от")}</span>${ref}`;
      else if (m === "receipt") timer += `<span>${tr("что и")}</span>${ref}`;
      else if (m === "at") timer += `<span>${tr("в момент")}</span>${ref}`;
      else if (m === "sbefore") timer += `<span>${tr("за")}</span>${sec}<span>${tr("сек до")}</span>${ref}`;
      else timer += `<span>${tr("через")}</span>${sec}<span>${tr("сек после")}</span>${ref}`;
    } else {
      timer += `<b>${tr("Таймер:")}</b><span>${tr("нет — это точка отсчёта")}</span>`;
    }
    if (!isState && !c.neg) {
      timer += `<span class="sce-sep"></span><b>${tr("Сколько раз:")}</b><select class="field" onchange="SCE.setCond(${i},'count',Number(this.value))">${opts(COUNTS.map(n => [n, n === 1 ? "1 раз" : tr("не менее {n}", { n })]), c.count)}</select>`;
      if (c.count > 1) {
        timer += `<select class="field" aria-label="${esc(tr("За какой период"))}" onchange="SCE.setCond(${i},'perMode',this.value)">${opts([["sec", "за N сек"], ["shift", "за смену"]], c.perMode)}</select>`;
        if (c.perMode !== "shift") timer += `<input class="field" type="number" min="1" value="${c.per}" aria-label="${esc(tr("Секунд"))}" oninput="SCE.setCond(${i},'per',Number(this.value),true)"><span>${tr("сек")}</span>`;
        timer += `<span>${tr("для одного:")}</span><select class="field" onchange="SCE.setCond(${i},'group',this.value)">${opts(GROUP_BY, c.group)}</select>`;
      }
    }
    const addAlt = isState
      ? `<button type="button" class="sce-link" onclick="SCE.addAlt(${i},'state')">${tr("+ ИЛИ другое состояние")}</button>`
      : `<button type="button" class="sce-link" onclick="SCE.addAlt(${i},'pos')">${tr("+ ИЛИ кассовое событие")}</button>
         <button type="button" class="sce-link" onclick="SCE.addAlt(${i},'obj')">${tr("+ ИЛИ событие объекта")}</button>
         <button type="button" class="sce-link" onclick="SCE.addAlt(${i},'cap')">${tr("+ ИЛИ строка титров")}</button>`;
    return `<div class="sce-cond ${c.neg ? "neg" : ""} ${isState ? "state" : ""}">
      <div class="sce-cond-h"><span class="sce-letter">${letter(i)}</span>${head}${delCond}</div>
      ${events}
      <div class="sce-cond-f">${addAlt}</div>
      <div class="sce-timer">${timer}</div>
    </div>`;
  }

  function mountPickers() {
    if (!R) return;
    root.querySelectorAll("[data-picker]").forEach(el => {
      const [i, j] = el.dataset.picker.split("-").map(Number);
      const e = draft.conds[i].alts[j];
      R.mountPicker(el, {
        value: e.srcs, filter: e.kind === "cap" ? null : POS_FILTER, disabled: !!tplId,
        onChange: (v) => { e.srcs = v; clearErrors(); renderSummary(); }
      });
    });
  }

  function applyErrors() {
    errors.forEach(err => {
      const el = $(err.id);
      if (el) { el.classList.add("sce-err"); el.setAttribute("aria-invalid", "true"); el.title = err.msg; }
    });
  }
  function clearErrors() {
    if (!errors.length) return;
    errors.forEach(err => { const el = $(err.id); if (el) { el.classList.remove("sce-err"); el.removeAttribute("aria-invalid"); el.removeAttribute("title"); } });
    errors = [];
  }

  function renderConds() {
    $("sce-conds").innerHTML = draft.conds.map((c, i) => (i ? `<div class="sce-and">${tr("И")}</div>` : "") + condHtml(c, i)).join("");
    mountPickers();
    applyErrors();
    renderSummary();
  }

  /* ---------- timeline + readable ---------- */
  function windows(s) {
    const res = [];
    s.conds.forEach((c, i) => {
      if (c.type === "cmp") { res.push({ cmp: true, p: 0 }); return; }
      if (i === 0) {
        const e = c.count > 1 ? (c.perMode === "shift" ? 60 : c.per) : 0;
        res.push({ s: 0, e, p: 0, shift: c.count > 1 && c.perMode === "shift" });
        return;
      }
      const r = (res[c.time.ref] && !res[c.time.ref].cmp) ? res[c.time.ref] : res[0];
      const pr = r.p, n = Number(c.time.sec) || 0, m = c.time.mode;
      let w;
      if (m === "after") w = { s: pr, e: pr + n };
      else if (m === "before") w = { s: pr - n, e: pr };
      else if (m === "around") w = { s: pr - n, e: pr + n };
      else if (m === "receipt") w = { s: Math.min(r.s, pr) - 5, e: Math.max(r.e, pr) + 15, receipt: true };
      else { const p = m === "at" ? pr : m === "sbefore" ? pr - n : pr + n; w = { s: p, e: p, point: true }; }
      w.p = m === "receipt" ? pr : w.e;   // chained timers count from the latest moment of the reference
      res.push(w);
    });
    return res;
  }
  function fmtSec(v) {
    const a = Math.abs(v);
    const txt = a >= 60 && a % 60 === 0 ? a / 60 + " " + tr("мин") : a + " " + tr("с");
    return (v > 0 ? "+" : v < 0 ? "−" : "") + txt;
  }
  function decisionAt(s, ws) {
    let d = null;
    s.conds.forEach((c, i) => {
      const w = ws[i];
      if (w.cmp) return;
      if ((c.type === "ev" && c.neg) || (w.point && w.p > 0)) d = Math.max(d == null ? -Infinity : d, w.e);
    });
    return d;
  }
  function renderTimeline() {
    const ws = windows(draft);
    const real = ws.filter(w => !w.cmp);
    let min = Math.min(0, ...real.map(w => w.s)), max = Math.max(0, ...real.map(w => w.e));
    if (max - min < 10) max = min + 10;
    const pad = (max - min) * 0.06; min -= pad; max += pad;
    const W = 820, X0 = 230, X1 = 800, top = 22, rowH = 34, rows = ws.length;
    const x = v => X0 + (v - min) / (max - min) * (X1 - X0);
    const H = top + rows * rowH + 30;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
    const step = steps.find(st => (max - min) / st <= 8) || 1800;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr("Временная шкала сценария"))}">`;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      svg += `<line class="tl-grid" x1="${x(v)}" y1="${top - 6}" x2="${x(v)}" y2="${top + rows * rowH}"/>`;
      svg += `<text class="tl-tick" x="${x(v)}" y="${H - 8}" text-anchor="middle">${v === 0 ? "A" : esc(fmtSec(v))}</text>`;
    }
    svg += `<line class="tl-a" x1="${x(0)}" y1="${top - 10}" x2="${x(0)}" y2="${top + rows * rowH}"/>`;
    ws.forEach((w, i) => {
      const c = draft.conds[i], y = top + i * rowH;
      if (w.cmp) {
        const txt = cmpText(c);
        svg += `<text class="tl-label" x="0" y="${y + 21}"><tspan class="tl-letter">${letter(i)}</tspan>  ${esc(tr("сравнение"))}</text>`;
        svg += `<text class="tl-in" x="${X0}" y="${y + 21}">${esc(txt.length > 60 ? txt.slice(0, 59) + "…" : txt)}</text>`;
        return;
      }
      const label = evShort(c.alts[0]) + (c.alts.length > 1 ? " " + tr("или ещё {n}", { n: c.alts.length - 1 }) : "");
      const short = label.length > 28 ? label.slice(0, 27) + "…" : label;
      svg += `<text class="tl-label" x="0" y="${y + 21}"><tspan class="tl-letter ${c.neg ? "neg" : ""}">${letter(i)}${c.neg ? " " + esc(tr("НЕ")) : ""}</tspan>  ${esc(short)}</text>`;
      if (w.point) {
        const cx = x(w.p), cy = y + 17;
        svg += `<path class="tl-state" d="M${cx} ${cy - 8} L${cx + 8} ${cy} L${cx} ${cy + 8} L${cx - 8} ${cy} Z"/>`;
        svg += `<text class="tl-in" x="${cx + 12}" y="${y + 21}">${esc(tr("проверка"))}</text>`;
      } else if (i === 0 && w.e === w.s) {
        svg += `<circle class="tl-pt" cx="${x(0)}" cy="${y + 17}" r="6"/>`;
      } else {
        const x1 = x(w.s), x2 = Math.max(x(w.e), x1 + 4);
        svg += `<rect class="${c.neg ? "tl-neg" : "tl-pos"}" x="${x1}" y="${y + 6}" width="${x2 - x1}" height="22" rx="4"/>`;
        let inner = i === 0 ? (w.shift ? tr("≥{n} за смену", { n: c.count }) : tr("≥{n} раз", { n: c.count })) : c.neg ? tr("не было") : tr("было");
        if (i > 0 && c.count > 1 && !c.neg) inner += " ×" + c.count;
        if (w.receipt) inner += " · " + tr("тот же чек");
        if (x2 - x1 > 46) svg += `<text class="tl-in" x="${(x1 + x2) / 2}" y="${y + 21}" text-anchor="middle">${esc(inner)}</text>`;
      }
    });
    const alarm = decisionAt(draft, ws);
    if (alarm != null) {
      svg += `<line class="tl-alarm" x1="${x(alarm)}" y1="${top - 10}" x2="${x(alarm)}" y2="${top + rows * rowH}"/>`;
      svg += `<text class="tl-alarm-t" x="${Math.min(x(alarm) + 4, W - 70)}" y="${top - 10}">${esc(tr("решение"))}</text>`;
    }
    $("sce-timeline").innerHTML = svg + "</svg>";
    return alarm;
  }
  function readableItems(s) {
    return s.conds.map((c, i) => {
      const L = letter(i);
      if (c.type === "cmp") return `<li><b>${esc(tr("И"))} ${L}</b> — ${esc(tr("сравнение"))}: <code>${hl(cmpText(c))}</code></li>`;
      const what = c.alts.map(e => evText(e, L)).join(` <b>${esc(tr("или"))}</b> `);
      const rep = repText(c) ? ", " + esc(repText(c)) : "";
      if (i === 0) return `<li><b>A</b> — ${esc(tr("произошло"))}: ${what}${rep}</li>`;
      if (c.type === "st") return `<li><b>${esc(tr("И"))} ${L}</b> — ${what} — <i>${esc(timeText(c))}</i></li>`;
      return `<li><b>${esc(c.neg ? tr("И НЕ") : tr("И"))} ${L}</b> — ${esc(c.neg ? tr("не произошло") : tr("произошло"))}: ${what}${rep} — <i>${esc(timeText(c))}</i></li>`;
    }).join("");
  }
  function renderSummary() {
    const alarm = renderTimeline();
    const name = draft.name || tr("без названия");
    const when = alarm != null
      ? tr("Тревога ждёт таймеров «НЕ» и проверок состояния: решение не позже чем через {n} после A.", { n: fmtSec(alarm) })
      : tr("Тревога создаётся сразу, как только выполнены все условия в своих таймерах.");
    const bad = undefinedTokens(draft);
    const warn = bad.length
      ? `<div class="sce-warn">⚠ ${esc(tr("Не определены переменные:"))} ${bad.map(b => `${letter(b.cond)}: <span class="sce-var">${esc(b.token)}</span>`).join(", ")} — ${esc(tr("их нужно запомнить в одном из предыдущих условий."))}</div>`
      : "";
    const desc = draft.desc ? `<div class="sce-muted sce-desc-read">${esc(tplId ? tr(draft.desc) : draft.desc)}</div>` : "";
    $("sce-readable").innerHTML = `
      <div>${esc(tr("Тревога"))} <b>«${esc(tplId ? tr(name) : name)}»</b> (${esc(prioLabel(draft.prio))}), ${esc(tr("если:"))}</div>${desc}
      <ol>${readableItems(draft)}</ol>
      <div class="sce-muted">${esc(when)} ${esc(repeatText(draft))}.</div>${warn}
      <div class="sce-formula">${esc(formula(draft))}</div>`;
  }

  /* ---------- validation ---------- */
  function validate() {
    const errs = [];
    if (!String(draft.name).trim()) errs.push({ id: "sce-name", msg: tr("Укажите название") });
    const referenced = new Set(draft.conds.flatMap(usedTokens));
    draft.conds.forEach((c, i) => {
      const L = letter(i);
      if (c.type === "cmp") {
        if (!c.left.trim()) errs.push({ id: `sce-cmp-${i}-left`, msg: tr("Условие {l}: заполните левую часть сравнения", { l: L }) });
        if (!c.right.trim()) errs.push({ id: `sce-cmp-${i}-right`, msg: tr("Условие {l}: заполните правую часть сравнения", { l: L }) });
        return;
      }
      c.alts.forEach((e, j) => {
        if (e.kind === "cap" && e.op !== "any" && !String(e.text).trim())
          errs.push({ id: `sce-text-${i}-${j}`, msg: tr("Условие {l}: укажите текст строки титров или выберите «любая строка»", { l: L }) });
        if (e.srcs && R && !R.expand(e.srcs, e.kind === "cap" ? null : POS_FILTER).length)
          errs.push({ id: null, msg: tr("Условие {l}: выберите хотя бы одно устройство", { l: L }) });
        // drop empty "save" rows nobody uses; complain only about the ones that are referenced
        const isEmpty = (v) => !v.name || (e.kind === "cap" && ((v.preset === "re" && !v.re) || (v.preset === "num" && !v.word)));
        e.save = (e.save || []).filter(v => !isEmpty(v) || referenced.has(`{${L}.${v.name}}`));
        e.save.forEach((v, k) => {
          if (!isEmpty(v)) return;
          const field = !v.name ? "name" : v.preset === "re" ? "re" : "word";
          errs.push({ id: `sce-save-${i}-${j}-${k}-${field}`, msg: tr("Условие {l}: значение {v} используется дальше — заполните, откуда его брать", { l: L, v: `{${L}.${v.name}}` }) });
        });
        (e.where || []).forEach((w, k) => { if (!String(w.val).trim()) errs.push({ id: `sce-where-${i}-${j}-${k}`, msg: tr("Условие {l}: укажите значение в условии на атрибут", { l: L }) }); });
      });
    });
    undefinedTokens(draft).forEach(b => errs.push({ id: null, msg: tr("Условие {l}: переменная {v} не определена раньше", { l: letter(b.cond), v: b.token }) }));
    return errs;
  }

  /* ---------- mutations ---------- */
  const API = {
    setTop(key, val, soft) { draft[key] = val; clearErrors(); if (key === "name" || key === "prio" || key === "desc") renderSummary(); if (!soft) renderList(); },
    setRepeat(key, val, soft) {
      draft.repeat[key] = val;
      if (!soft) { $("sce-repeat-sec").classList.toggle("sce-hidden", draft.repeat.mode === "never"); $("sce-repeat-unit").classList.toggle("sce-hidden", draft.repeat.mode === "never"); }
      renderSummary();
    },
    setCond(i, key, val, soft) { draft.conds[i][key] = val; soft ? renderSummary() : renderConds(); },
    setNeg(i, val) { draft.conds[i].neg = val === "1"; if (draft.conds[i].neg) draft.conds[i].count = 1; renderConds(); },
    setTime(i, key, val, soft) {
      draft.conds[i].time[key] = key === "mode" ? val : Number(val);
      if (key === "mode" && val !== "receipt" && val !== "at" && !draft.conds[i].time.sec) draft.conds[i].time.sec = 10;
      soft ? renderSummary() : renderConds();
    },
    setEv(i, j, key, val, soft) {
      const e = draft.conds[i].alts[j];
      e[key] = val;
      clearErrors();
      if (key === "otype" && e.kind === "obj") {
        const ot = OBJ_TYPES[val];
        e.obj = ot.objects[0]; e.ev = ot.events[0];
        e.where.forEach(w => { w.attr = ot.attrs[0]; });
        e.save.forEach(v => { v.attr = ot.attrs[0]; v.name = uniqueName(e, autoName(e, v), v); });
      }
      if (key === "otype" && e.kind === "state") {
        const st = STATES[val];
        draft.conds[i].alts[j] = EV.state(val, val === "pos" ? ["*"] : OBJ_TYPES.cam.objects[0], st.states[0]);
      }
      soft ? renderSummary() : renderConds();
    },
    setKind(i, j, kind) { draft.conds[i].alts[j] = defaultEv(kind); renderConds(); },
    addAlt(i, kind) { draft.conds[i].alts.push(defaultEv(kind)); renderConds(); },
    removeAlt(i, j) { draft.conds[i].alts.splice(j, 1); renderConds(); },
    addCond(kind) {
      if (kind === "cmp") draft.conds.push(cmpCond("", "ge", ""));
      else if (kind === "state") draft.conds.push(stCond(defaultEv("state")));
      else draft.conds.push(cond([defaultEv(kind)], { time: { mode: "after", sec: 10, ref: 0 } }));
      renderConds();
    },
    removeCond(i) {
      if (i === 0 && draft.conds[1] && draft.conds[1].type !== "ev") return toast(tr("Первым должно остаться событие — от него считаются таймеры"));
      draft.conds.splice(i, 1);
      draft.conds.forEach((c, k) => {
        if (!c.time) return;
        if (c.time.ref === i) c.time.ref = Math.max(0, i - 1);
        else if (c.time.ref > i) c.time.ref -= 1;
        if (c.time.ref >= k || (draft.conds[c.time.ref] && draft.conds[c.time.ref].type === "cmp")) c.time.ref = 0;
      });
      draft.conds[0].neg = false;
      clearErrors();
      renderConds();
    },
    addX(i, j, list) {
      const e = draft.conds[i].alts[j];
      if (list === "save") {
        let v;
        if (e.kind === "cap") v = { preset: "barcode", word: "", re: "" };
        else v = { attr: (e.kind === "pos" ? POS_ATTRS : e.kind === "state" ? STATES[e.otype].attrs : OBJ_TYPES[e.otype].attrs)[0] };
        if (e.kind === "pos" && e.ev === "Весы: выдан штрихкод") v.attr = "Штрихкод";
        v.name = uniqueName(e, autoName(e, v), v);
        v.auto = true;
        e.save.push(v);
      } else e.where.push({ attr: (e.kind === "pos" ? POS_ATTRS : OBJ_TYPES[e.otype].attrs)[0], op: "eq", val: "" });
      renderConds();
    },
    setX(i, j, list, k, key, val, soft) {
      const e = draft.conds[i].alts[j], v = e[list][k];
      clearErrors();
      if (key === "name") { v.name = val.replace(/[\s{}.]/g, ""); v.auto = false; }
      else v[key] = val;
      if (list === "save" && key !== "name" && v.auto) {
        v.name = uniqueName(e, autoName(e, v), v);
        const nameEl = $(`sce-save-${i}-${j}-${k}-name`);
        if (soft && nameEl) nameEl.value = v.name;
      }
      soft ? renderSummary() : renderConds();
    },
    delX(i, j, list, k) { draft.conds[i].alts[j][list].splice(k, 1); clearErrors(); renderConds(); },
    insertVar(i, j, token) {
      const e = draft.conds[i].alts[j];
      if (e.kind === "cap") {
        if (e.op === "any") e.op = "contains";
        e.text = (e.text ? e.text.replace(/\s*$/, " ") : "") + token;
        renderConds();
        const el = $(`sce-text-${i}-${j}`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      } else {
        const empty = e.where.find(w => !w.val);
        if (empty) empty.val = token;
        else e.where.push({ attr: (e.kind === "pos" ? POS_ATTRS : OBJ_TYPES[e.otype].attrs)[0], op: "eq", val: token });
        renderConds();
      }
    },
    cmpFocus(i, side) { cmpFocus[i] = side; },
    setCmp(i, key, val, rerender) { draft.conds[i][key] = val; clearErrors(); rerender ? renderConds() : renderSummary(); },
    cmpInsert(i, token) {
      const side = cmpFocus[i] || (draft.conds[i].left.trim() ? "right" : "left");
      const c = draft.conds[i];
      c[side] = (c[side] ? c[side].replace(/\s*$/, " ") : "") + token;
      renderConds();
      const el = $(`sce-cmp-${i}-${side}`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    },
    edit(id) { editingId = id; tplId = null; errors = []; draft = clone(scenarios.find(s => s.id === id)); renderList(); renderEditor(); },
    openTemplate(id) { tplId = id; editingId = null; errors = []; draft = clone(templates.find(s => s.id === id)); renderList(); renderEditor(); },
    newScenario() { editingId = null; tplId = null; errors = []; draft = blankScenario(); renderList(); renderEditor(); $("sce-name").focus(); },
    copyTemplate() {
      const tpl = templates.find(s => s.id === tplId);
      draft = clone(tpl); delete draft.id; delete draft.code;
      draft.name = tr(tpl.name) + " — " + tr("копия");
      draft.desc = tr(tpl.desc);
      tplId = null; editingId = null;
      renderList(); renderEditor();
      toast(tr("Копия создана — сохраните её"));
    },
    reset() { if (editingId) API.edit(editingId); else API.newScenario(); toast(tr("Изменения отменены")); },
    save() {
      if (tplId) return;
      draft.name = String(draft.name).trim();
      errors = validate();
      if (errors.length) {
        renderConds();
        const first = errors.find(e => e.id && $(e.id));
        if (first) { const el = $(first.id); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); }
        return toast(errors[0].msg + (errors.length > 1 ? " " + tr("(и ещё {n})", { n: errors.length - 1 }) : ""));
      }
      draft.conds.forEach(c => (c.alts || []).forEach(e => (e.save || []).forEach(v => { delete v.auto; })));
      if (editingId) Object.assign(scenarios.find(s => s.id === editingId), clone(draft));
      else { const id = Date.now(); scenarios.push(Object.assign(clone(draft), { id })); editingId = id; }
      renderList(); renderEditor();
      toast(tr("Сценарий сохранён"));
      if (changeFn) changeFn();
    },
    remove() {
      scenarios = scenarios.filter(s => s.id !== editingId);
      if (scenarios[0]) API.edit(scenarios[0].id); else API.newScenario();
      toast(tr("Сценарий удалён"));
      if (changeFn) changeFn();
    },
    test() {
      const ws = windows(draft);
      const base = ["09:12:40", "11:47:03", "13:05:18", "15:31:56"];
      const n = 1 + ((draft.conds.length + String(draft.name).length) % 3);
      const sample = { "код": "2900123004512", "штрихкод": "2900123004512", "вес": "1240", "наименование": "СЁМГА ОХЛ.", "товар": "БАНАНЫ", "предмет": "obj-77", "владелец": "track-1041", "чек": "48288", "X": "5", "Y": "1", "X2": "4", "мест": "24", "факт": "22" };
      const vars = varsBefore(draft, draft.conds.length);
      const rows = base.slice(0, n).map((time, r) => {
        const [h, m, s] = time.split(":").map(Number);
        const parts = draft.conds.map((c, i) => {
          if (c.type === "cmp") return `<span class="chip">${letter(i)} ✓ ${esc(cmpText(c))}</span>`;
          if (c.neg) return `<span class="chip prio-high">${letter(i)} — ${esc(tr("не было"))}</span>`;
          const sec = h * 3600 + m * 60 + s + Math.round(i === 0 ? 0 : Math.max(0, ws[i].p));
          const tt = [Math.floor(sec / 3600), Math.floor(sec % 3600 / 60), sec % 60].map(v => String(v).padStart(2, "0")).join(":");
          return `<span class="chip">${letter(i)} ${tt}</span>`;
        }).join("");
        const vals = vars.map(v => {
          const key = v.token.slice(3, -1);
          return `<span class="chip"><span class="sce-var">${esc(v.token)}</span> = ${esc(sample[key] || "val-" + (r + 1))}</span>`;
        }).join("");
        return `<div class="sce-test-row"><b>${time}</b><div class="sce-row">${parts}${vals}</div>
          <button type="button" class="btn btn-ghost sce-small" onclick="SCE.toast(SCE.tr('Архив перемотан к моменту A'))">▶ ${esc(tr("Видео"))}</button></div>`;
      }).join("");
      $("sce-test-title").textContent = tr("Проверка на архиве · 14.09.2026, 08:00–16:00 · совпадений: {n}", { n });
      $("sce-test-body").innerHTML = rows;
      $("sce-test").classList.remove("sce-hidden");
      $("sce-test").scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    toast, tr
  };

  global.SCE = API;
  global.ScenarioEditor = {
    mount(el, o) {
      root = el; toastFn = (o && o.toast) || null; changeFn = (o && o.onChange) || null;
      root.classList.add("sce");
      root.setAttribute("data-i18n-skip", "");
      API.refresh();
    },
    refresh() {
      if (!root) return;
      root.innerHTML = skeleton();
      renderList(); renderEditor();
    },
    list() { return { base: templates.slice(), mine: scenarios.slice() }; },
    byId(id) { return templates.find(s => s.id === id) || scenarios.find(s => String(s.id) === String(id)) || null; },
    formula
  };
  API.refresh = global.ScenarioEditor.refresh;
})(window);
