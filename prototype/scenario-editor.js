/* Scenario editor — shared by index.html and short_version.html.
 *
 * Model
 *   scenario  = conditions joined by AND, plus "then" settings (priority, camera, cooldown, schedule)
 *   condition = one or more events joined by OR; may be negated (NOT = did not happen within its timer);
 *               timer relative to an earlier condition; optional repeat count (≥ K times in N sec)
 *   event     = object event  { kind:"obj", otype, obj, ev, where:[{attr, op, val}], save:[{name, attr}] }
 *             | caption line  { kind:"cap", src, op, text, save:[{name, re}] }
 *   variables = values saved by an event ({A.code}); later conditions use them in caption text or attribute filters.
 *
 * Usage: ScenarioEditor.mount(element, { toast }) after RetailI18n.bindChrome(); ScenarioEditor.refresh() on language change.
 */
(function (global) {
  const tr = (s, v) => (typeof global.t === "function" ? global.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));

  const OBJ_TYPES = {
    cam: { name: "Камера · детектор", short: "Камера", objects: [
      "CAM-142-11 · Касса 5 · зона покупателя", "CAM-142-11 · Касса 5 · зона кассира",
      "CAM-142-09 · Касса 2 · зона ленты", "CAM-142-09 · Касса 2 · зона сканера", "CAM-142-09 · Касса 2 · зона укладки",
      "CAM-142-17 · КСО-2 · площадка", "CAM-142-12 · Зал · молочный стеллаж",
      "CAM-142-21 · Склад · дверь 2", "CAM-142-01 · Вход / выход"
    ], events: [
      "Человек в зоне", "Зона пуста", "Человек в зоне дольше N сек", "Пересечение линии",
      "Рука: вход и выход из зоны", "Движение руки к полке", "Наличные в зоне", "Товаров в зоне: 0",
      "Оставленный предмет", "Предмет перемещён"
    ], attrs: ["ID трека", "ID предмета", "Число объектов"] },
    sec: { name: "Охранный датчик", short: "Датчик", objects: ["Склад · дверь 2 · геркон", "Подсобка · ИК-датчик объёма", "Касса 5 · датчик денежного ящика"], events: ["Тревога", "Норма", "Вскрытие корпуса"], attrs: ["Номер зоны"] },
    fire: { name: "Пожарный извещатель", short: "Пожарный извещатель", objects: ["Торговый зал · дымовой", "Склад · тепловой"], events: ["Пожар", "Внимание", "Неисправность"], attrs: ["Номер шлейфа"] },
    mic: { name: "Микрофон · аудиоаналитика", short: "Микрофон", objects: ["Касса 5 · микрофон", "Склад · микрофон"], events: ["Крик", "Разбитие стекла", "Громкий звук"], attrs: ["Уровень, дБ"] },
    door: { name: "СКУД · дверь / турникет", short: "СКУД", objects: ["Служебный вход", "Склад · ворота"], events: ["Проход по карте", "Дверь открыта без прохода", "Дверь удерживается открытой"], attrs: ["Номер карты", "Сотрудник"] },
    btn: { name: "Тревожная кнопка", short: "Тревожная кнопка", objects: ["Касса 5 · тревожная кнопка", "Касса 2 · тревожная кнопка"], events: ["Нажата"], attrs: ["Номер кнопки"] }
  };
  const CAP_SOURCES = [
    { id: "any", name: "Любой источник титров" },
    { id: "pos-2", name: "Касса 2 · Set Retail" },
    { id: "file-1c", name: "Касса 1 · выгрузка 1С" },
    { id: "fr-5", name: "Касса 5 · ФР / принтер" },
    { id: "kso-2", name: "КСО-2" },
    { id: "ofd", name: "Сеть · лента ОФД" },
    { id: "scale", name: "Весы у кассы 3" },
    { id: "wms", name: "Склад · произвольный текст (WMS)" }
  ];
  const CAP_OPS = [["contains", "содержит"], ["notcontains", "не содержит"], ["starts", "начинается с"], ["equals", "совпадает с"], ["regex", "рег. выражение"]];
  const WHERE_OPS = [["eq", "="], ["ne", "≠"], ["gt", ">"], ["lt", "<"]];
  const TIME_MODES = [["after", "После события"], ["before", "До события"], ["around", "Рядом по времени (±)"], ["receipt", "В том же чеке"]];
  const PRIOS = [["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]];
  const SCHEDULES = ["Всегда", "В часы работы магазина", "Только когда магазин закрыт"];
  const COUNTS = [1, 2, 3, 4, 5, 10];

  const EV = {
    obj: (otype, obj, ev, extra) => Object.assign({ kind: "obj", otype, obj, ev, where: [], save: [] }, extra || {}),
    cap: (src, op, text, extra) => Object.assign({ kind: "cap", src, op, text, save: [] }, extra || {})
  };
  function cond(alts, o) {
    return Object.assign({ neg: false, time: { mode: "after", sec: 10, ref: 0 }, count: 1, per: 5, alts }, o || {});
  }
  function defaultEv(kind) {
    return kind === "obj" ? EV.obj("cam", OBJ_TYPES.cam.objects[0], OBJ_TYPES.cam.events[0]) : EV.cap("any", "contains", "");
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const letter = (i) => String.fromCharCode(65 + i);
  const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(tr(l))}</option>`).join("");
  const prioLabel = (p) => tr((PRIOS.find(x => x[0] === p) || PRIOS[1])[1]);

  /* ---------- data ---------- */
  let scenarios = [
    { id: 1, name: "Аннуляция или возврат без покупателя", prio: "high", on: true, cooldown: 60, camera: "auto", schedule: "Всегда", conds: [
      cond([EV.cap("fr-5", "contains", "АННУЛЯЦИЯ"), EV.cap("fr-5", "contains", "ВОЗВРАТ")]),
      cond([EV.obj("cam", "CAM-142-11 · Касса 5 · зона покупателя", "Человек в зоне")], { neg: true, time: { mode: "around", sec: 10, ref: 0 } })
    ] },
    { id: 2, name: "Коньяк у кассира Петрова", prio: "mid", on: true, cooldown: 0, camera: "auto", schedule: "Всегда", conds: [
      cond([EV.cap("any", "contains", "КОНЬЯК")]),
      cond([EV.cap("any", "contains", "КАССИР: ПЕТРОВ")], { time: { mode: "receipt", sec: 0, ref: 0 } })
    ] },
    { id: 3, name: "Склад: датчик двери и человек на камере", prio: "high", on: true, cooldown: 120, camera: "CAM-142-21 · Склад · дверь 2", schedule: "Только когда магазин закрыт", conds: [
      cond([EV.obj("sec", "Склад · дверь 2 · геркон", "Тревога")]),
      cond([EV.obj("cam", "CAM-142-21 · Склад · дверь 2", "Человек в зоне")], { time: { mode: "after", sec: 30, ref: 0 } })
    ] },
    { id: 4, name: "Наличные без оплаты в чеке", prio: "high", on: false, cooldown: 60, camera: "auto", schedule: "В часы работы магазина", conds: [
      cond([EV.obj("cam", "CAM-142-11 · Касса 5 · зона кассира", "Наличные в зоне")]),
      cond([EV.cap("fr-5", "regex", "ОПЛАТА НАЛ(ИЧНЫМИ)?")], { neg: true, time: { mode: "after", sec: 30, ref: 0 } })
    ] }
  ];
  const templates = [
    { id: "t1", name: "Пронос мимо сканера, 3 зоны", prio: "high", on: true, cooldown: 30, camera: "CAM-142-09 · Касса 2 · зона сканера", schedule: "В часы работы магазина", conds: [
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона ленты", "Рука: вход и выход из зоны")]),
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона сканера", "Рука: вход и выход из зоны")], { time: { mode: "after", sec: 3, ref: 0 } }),
      cond([EV.cap("pos-2", "regex", "ДОБАВЛЕН|ЧЕСТНЫЙ ЗНАК")], { neg: true, time: { mode: "after", sec: 2, ref: 1 } }),
      cond([EV.obj("cam", "CAM-142-09 · Касса 2 · зона укладки", "Рука: вход и выход из зоны")], { time: { mode: "after", sec: 4, ref: 1 } })
    ] },
    { id: "t2", name: "Быстрый набор у стеллажа", prio: "low", on: true, cooldown: 60, camera: "auto", schedule: "В часы работы магазина", conds: [
      cond([EV.obj("cam", "CAM-142-12 · Зал · молочный стеллаж", "Движение руки к полке")], { count: 3, per: 5 })
    ] },
    { id: "t3", name: "Неоплата весового товара", prio: "high", on: true, cooldown: 0, camera: "auto", schedule: "В часы работы магазина", conds: [
      cond([EV.cap("scale", "contains", "ШТРИХКОД ВЫДАН", { save: [{ name: "код", re: "ШК (\\d+)" }] })]),
      cond([EV.cap("any", "contains", "{A.код}")], { neg: true, time: { mode: "after", sec: 720, ref: 0 } })
    ] },
    { id: "t4", name: "Совпадение веса разных весовых товаров", prio: "mid", on: true, cooldown: 0, camera: "auto", schedule: "В часы работы магазина", conds: [
      cond([EV.cap("scale", "contains", "ШТРИХКОД ВЫДАН", { save: [{ name: "вес", re: "ВЕС ([\\d.]+)" }, { name: "товар", re: "ТОВАР (.+)" }] })]),
      cond([EV.cap("scale", "contains", "ВЕС {A.вес}")], { time: { mode: "after", sec: 600, ref: 0 } }),
      cond([EV.cap("scale", "notcontains", "{A.товар}")], { time: { mode: "receipt", sec: 0, ref: 1 } })
    ] },
    { id: "t5", name: "Подготовка кражи в сговоре", prio: "mid", on: true, cooldown: 300, camera: "CAM-142-01 · Вход / выход", schedule: "В часы работы магазина", conds: [
      cond([EV.obj("cam", "CAM-142-01 · Вход / выход", "Оставленный предмет", { save: [{ name: "предмет", attr: "ID предмета" }, { name: "владелец", attr: "ID трека" }] })]),
      cond([EV.obj("cam", "CAM-142-01 · Вход / выход", "Предмет перемещён", { where: [{ attr: "ID предмета", op: "eq", val: "{A.предмет}" }, { attr: "ID трека", op: "ne", val: "{A.владелец}" }] })], { time: { mode: "after", sec: 900, ref: 0 } })
    ] },
    { id: "t6", name: "Пожар или крик на складе и люди", prio: "high", on: true, cooldown: 300, camera: "CAM-142-21 · Склад · дверь 2", schedule: "Всегда", conds: [
      cond([EV.obj("fire", "Склад · тепловой", "Пожар"), EV.obj("mic", "Склад · микрофон", "Крик")]),
      cond([EV.obj("cam", "CAM-142-21 · Склад · дверь 2", "Человек в зоне")], { time: { mode: "around", sec: 60, ref: 0 } })
    ] }
  ];
  function blankScenario() {
    return { name: "", prio: "mid", on: true, cooldown: 60, camera: "auto", schedule: "Всегда", conds: [cond([defaultEv("cap")])] };
  }

  let root = null, toastFn = null;
  let editingId = scenarios[0].id, tplId = null;
  let draft = clone(scenarios[0]);
  const $ = (id) => document.getElementById(id);
  function toast(msg) {
    if (toastFn) return toastFn(msg);
    if (typeof global.toast === "function") return global.toast(msg);
    if (typeof global.demoAction === "function") return global.demoAction(msg);
  }

  /* ---------- variables ---------- */
  function varsBefore(s, i) {
    const out = [];
    s.conds.slice(0, i).forEach((c, k) => c.alts.forEach((e, j) => (e.save || []).forEach(v => {
      if (v.name) out.push({ token: `{${letter(k)}.${v.name}}`, cond: k, alt: c.alts.length > 1 ? j : null, neg: c.neg });
    })));
    return out;
  }
  function tokensIn(str) { return (String(str || "").match(/\{[A-Z]\.[^{}\s]+\}/g) || []); }
  function undefinedTokens(s) {
    const bad = [];
    s.conds.forEach((c, i) => {
      const known = varsBefore(s, i).map(v => v.token);
      c.alts.forEach(e => {
        const used = e.kind === "cap" ? tokensIn(e.text) : (e.where || []).flatMap(w => tokensIn(w.val));
        used.forEach(tok => { if (!known.includes(tok)) bad.push({ cond: i, token: tok }); });
      });
    });
    return bad;
  }
  const hl = (s) => esc(s).replace(/\{[A-Z]\.[^{}\s]+\}/g, m => `<span class="sce-var">${m}</span>`);

  /* ---------- text ---------- */
  const opLabel = (op) => (CAP_OPS.find(o => o[0] === op) || CAP_OPS[0])[1];
  const wopLabel = (op) => (WHERE_OPS.find(o => o[0] === op) || WHERE_OPS[0])[1];
  const capSourceName = (id) => (CAP_SOURCES.find(s => s.id === id) || CAP_SOURCES[0]).name;
  function evText(e, L) {
    let s;
    if (e.kind === "obj") {
      s = `${esc(tr(OBJ_TYPES[e.otype].short))} «${esc(tr(e.obj))}»: <b>${esc(tr(e.ev))}</b>`;
      if (e.where && e.where.length) s += ", " + esc(tr("где")) + " " + e.where.map(w => `${esc(tr(w.attr))} ${wopLabel(w.op)} ${hl(w.val || "…")}`).join(` ${esc(tr("и"))} `);
      if (e.save && e.save.length) s += ` <span class="sce-muted">(${esc(tr("запомнить"))} ${e.save.map(v => `<span class="sce-var">{${L}.${esc(v.name)}}</span> = ${esc(tr(v.attr))}`).join(", ")})</span>`;
    } else {
      s = `${esc(tr("титры"))} «${esc(tr(capSourceName(e.src)))}» ${esc(tr(opLabel(e.op)))} <b>«${hl(e.text || "…")}»</b>`;
      if (e.save && e.save.length) s += ` <span class="sce-muted">(${esc(tr("запомнить"))} ${e.save.map(v => `<span class="sce-var">{${L}.${esc(v.name)}}</span> ${esc(tr("по шаблону"))} <code>${esc(v.re)}</code>`).join(", ")})</span>`;
    }
    return s;
  }
  const evShort = (e) => (e.kind === "obj" ? tr(e.ev) : `${e.op === "notcontains" ? tr("нет") + " " : ""}«${e.text || "…"}»`);
  function timeText(c) {
    const v = { n: c.time.sec, r: letter(c.time.ref) };
    if (c.time.mode === "after") return tr("в течение {n} сек после {r}", v);
    if (c.time.mode === "before") return tr("не раньше чем за {n} сек до {r}", v);
    if (c.time.mode === "around") return tr("в пределах ±{n} сек от {r}", v);
    return tr("в том же чеке, что и {r}", v);
  }
  function timeShort(c) {
    const r = letter(c.time.ref), n = c.time.sec;
    if (c.time.mode === "after") return `${r}+${n}${tr("с")}`;
    if (c.time.mode === "before") return `${r}−${n}${tr("с")}`;
    if (c.time.mode === "around") return `${r}±${n}${tr("с")}`;
    return tr("чек {r}", { r });
  }
  function condToken(c, i) {
    const L = letter(i);
    let tok = c.alts.length > 1 ? "(" + c.alts.map((_, j) => L + (j + 1)).join(" " + tr("ИЛИ") + " ") + ")" : L;
    if (c.count > 1 && !c.neg) tok += ` ×${c.count}/${c.per}${tr("с")}`;
    if (i > 0) tok += ` [${timeShort(c)}]`;
    return (c.neg ? tr("НЕ") + " " : "") + tok;
  }
  const formula = (s) => s.conds.map(condToken).join(" " + tr("И") + " ");

  /* ---------- skeleton ---------- */
  function skeleton() {
    return `
    <div class="sce-layout">
      <div class="sce-panel">
        <div class="sce-ph"><span>${tr("Мои сценарии")}</span>
          <button type="button" class="btn btn-ghost sce-small" onclick="SCE.newScenario()">${tr("+ Новый")}</button></div>
        <div id="sce-list"></div>
        <div class="sce-ph sce-sub-h">${tr("Серверные шаблоны · только просмотр")}</div>
        <div id="sce-tpl"></div>
      </div>
      <div class="sce-editor">
        <div id="sce-ro" class="sce-note sce-ro sce-hidden">
          <span><strong>${tr("Серверный шаблон.")}</strong> ${tr("Его правит администратор. Чтобы изменить под себя — создайте копию.")}</span>
          <button type="button" class="btn btn-primary sce-small" onclick="SCE.copyTemplate()">${tr("Создать копию")}</button>
        </div>
        <fieldset id="sce-fs" class="sce-fs">
          <div class="sce-panel">
            <div class="sce-ph"><span id="sce-title"></span></div>
            <div class="sce-head">
              <div class="sce-fg"><label for="sce-name">${tr("Название сценария")}</label>
                <input id="sce-name" class="field" placeholder="${esc(tr("Например, аннуляция без покупателя"))}" oninput="SCE.setTop('name', this.value, true)"></div>
              <div class="sce-fg"><label for="sce-on">${tr("Статус")}</label>
                <select id="sce-on" class="field" onchange="SCE.setTop('on', this.value === '1')"></select></div>
            </div>
          </div>
          <div class="sce-panel">
            <div class="sce-ph"><span>${tr("Если — условия")}</span>
              <span class="sce-meta sce-hint">${tr("Условия связаны «И». Внутри условия варианты — «ИЛИ». «НЕ произошло» — событие не наступило за время таймера. Значение из события можно запомнить и использовать дальше как {A.имя}.")}</span></div>
            <div id="sce-conds" class="sce-conds"></div>
            <div class="sce-row sce-add">
              <button type="button" class="btn" onclick="SCE.addCond('obj')">${tr("+ И событие объекта")}</button>
              <button type="button" class="btn" onclick="SCE.addCond('cap')">${tr("+ И строка титров")}</button>
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
              <div class="sce-fg"><label for="sce-cooldown">${tr("Не повторять чаще, сек")}</label><input id="sce-cooldown" class="field" type="number" min="0" oninput="SCE.setTop('cooldown', Number(this.value), true)"></div>
              <div class="sce-fg"><label for="sce-schedule">${tr("Когда сценарий работает")}</label><select id="sce-schedule" class="field" onchange="SCE.setTop('schedule', this.value)"></select></div>
            </div>
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
        <span class="sce-item-h"><span>${esc(tr(s.name))}</span><span class="chip prio-${s.prio}">${esc(prioLabel(s.prio))}</span></span>
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
    $("sce-title").textContent = ro ? tr("Серверный шаблон") : editingId ? tr("Редактирование") : tr("Новый сценарий");
    $("sce-ro").classList.toggle("sce-hidden", !ro);
    $("sce-fs").disabled = ro;
    $("sce-save").classList.toggle("sce-hidden", ro);
    $("sce-reset").classList.toggle("sce-hidden", ro);
    $("sce-delete").classList.toggle("sce-hidden", ro || !editingId);
    $("sce-name").value = ro ? tr(draft.name) : draft.name;
    $("sce-on").innerHTML = opts([["1", "Включён"], ["0", "Выключен"]], draft.on ? "1" : "0");
    $("sce-prio").innerHTML = opts(PRIOS, draft.prio);
    $("sce-camera").innerHTML = opts([["auto", "Авто — камера из условий"]].concat(OBJ_TYPES.cam.objects.map(o => [o, o])), draft.camera);
    $("sce-cooldown").value = draft.cooldown;
    $("sce-schedule").innerHTML = opts(SCHEDULES.map(s => [s, s]), draft.schedule);
    $("sce-test").classList.add("sce-hidden");
    renderConds();
  }

  function extrasHtml(e, i, j) {
    const L = letter(i);
    let h = "";
    (e.save || []).forEach((v, k) => {
      const from = e.kind === "cap"
        ? `<input class="field sce-mono" value="${esc(v.re)}" placeholder="${esc(tr("шаблон с (группой), например ШК (\\d+)"))}" oninput="SCE.setX(${i},${j},'save',${k},'re',this.value,true)">`
        : `<select class="field" onchange="SCE.setX(${i},${j},'save',${k},'attr',this.value)">${opts(OBJ_TYPES[e.otype].attrs.map(a => [a, a]), v.attr)}</select>`;
      h += `<div class="sce-extra">
        <span class="sce-tag">${tr("Запомнить")}</span>
        <span class="sce-var-name"><span>{${L}.</span><input class="field" value="${esc(v.name)}" placeholder="${esc(tr("имя"))}" oninput="SCE.setX(${i},${j},'save',${k},'name',this.value,true)"><span>}</span></span>
        <span>${e.kind === "cap" ? tr("= из строки по шаблону") : tr("= атрибут")}</span>${from}
        <button type="button" class="sce-x" title="${esc(tr("Убрать"))}" onclick="SCE.delX(${i},${j},'save',${k})">×</button></div>`;
    });
    if (e.kind === "obj") (e.where || []).forEach((w, k) => {
      h += `<div class="sce-extra">
        <span class="sce-tag">${tr("Где")}</span>
        <select class="field" onchange="SCE.setX(${i},${j},'where',${k},'attr',this.value)">${opts(OBJ_TYPES[e.otype].attrs.map(a => [a, a]), w.attr)}</select>
        <select class="field sce-op" onchange="SCE.setX(${i},${j},'where',${k},'op',this.value)">${opts(WHERE_OPS, w.op)}</select>
        <input class="field sce-mono" value="${esc(w.val)}" placeholder="${esc(tr("значение или {A.имя}"))}" oninput="SCE.setX(${i},${j},'where',${k},'val',this.value,true)">
        <button type="button" class="sce-x" title="${esc(tr("Убрать"))}" onclick="SCE.delX(${i},${j},'where',${k})">×</button></div>`;
    });
    const vars = varsBefore(draft, i);
    const chips = vars.length
      ? `<span class="sce-avail">${tr("Вставить:")}</span>` + vars.map(v => `<button type="button" class="sce-varchip" title="${esc(v.neg ? tr("из условия «НЕ» — значения не будет") : v.alt != null ? tr("задано, только если сработал этот вариант") : tr("значение из условия {l}", { l: letter(v.cond) }))}" onclick="SCE.insertVar(${i},${j},'${esc(v.token)}')">${esc(v.token)}</button>`).join("")
      : "";
    h += `<div class="sce-ev-links">
      <button type="button" class="sce-link" onclick="SCE.addX(${i},${j},'save')">${tr("+ Запомнить значение")}</button>
      ${e.kind === "obj" ? `<button type="button" class="sce-link" onclick="SCE.addX(${i},${j},'where')">${tr("+ Условие на атрибут")}</button>` : ""}
      ${chips}</div>`;
    return h;
  }

  function evHtml(e, i, j, canDel) {
    const kind = `<select class="field" title="${esc(tr("Тип события"))}" onchange="SCE.setKind(${i},${j},this.value)">${opts([["obj", "Объект"], ["cap", "Титры"]], e.kind)}</select>`;
    const del = canDel ? `<button type="button" class="sce-x" title="${esc(tr("Убрать вариант"))}" onclick="SCE.removeAlt(${i},${j})">×</button>` : "<span></span>";
    let row;
    if (e.kind === "obj") {
      const ot = OBJ_TYPES[e.otype];
      row = `<div class="sce-ev">${kind}
        <select class="field" title="${esc(tr("Тип объекта"))}" onchange="SCE.setEv(${i},${j},'otype',this.value)">${opts(Object.keys(OBJ_TYPES).map(k => [k, OBJ_TYPES[k].name]), e.otype)}</select>
        <select class="field" title="${esc(tr("Объект"))}" onchange="SCE.setEv(${i},${j},'obj',this.value)">${opts(ot.objects.map(o => [o, o]), e.obj)}</select>
        <select class="field" title="${esc(tr("Событие"))}" onchange="SCE.setEv(${i},${j},'ev',this.value)">${opts(ot.events.map(o => [o, o]), e.ev)}</select>
        ${del}</div>`;
    } else {
      const ph = e.op === "regex" ? tr("например, ВОЗВРАТ|АННУЛ") : tr("текст строки, например АННУЛЯЦИЯ или {A.код}");
      row = `<div class="sce-ev">${kind}
        <select class="field" title="${esc(tr("Источник титров"))}" onchange="SCE.setEv(${i},${j},'src',this.value)">${opts(CAP_SOURCES.map(s => [s.id, s.name]), e.src)}</select>
        <select class="field" title="${esc(tr("Как искать"))}" onchange="SCE.setEv(${i},${j},'op',this.value)">${opts(CAP_OPS, e.op)}</select>
        <input id="sce-text-${i}-${j}" class="field sce-mono" value="${esc(e.text)}" placeholder="${esc(ph)}" oninput="SCE.setEv(${i},${j},'text',this.value,true)">
        ${del}</div>`;
    }
    return `<div class="sce-evwrap">${row}${extrasHtml(e, i, j)}</div>`;
  }

  function condHtml(c, i) {
    const head = i === 0
      ? `<span class="sce-start">${tr("Произошло · стартовое событие, от него считаются таймеры")}</span>`
      : `<select class="field" onchange="SCE.setNeg(${i},this.value)">${opts([["0", "Произошло"], ["1", "НЕ произошло"]], c.neg ? "1" : "0")}</select>`;
    const delCond = draft.conds.length > 1 ? `<button type="button" class="sce-x" title="${esc(tr("Удалить условие"))}" onclick="SCE.removeCond(${i})">×</button>` : "";
    const events = c.alts.map((e, j) => (j ? `<div class="sce-or">${tr("ИЛИ")}</div>` : "") + evHtml(e, i, j, c.alts.length > 1)).join("");
    let timer = `<span aria-hidden="true">⏱</span>`;
    if (i > 0) {
      const sec = `<input class="field" type="number" min="1" value="${c.time.sec}" oninput="SCE.setTime(${i},'sec',this.value,true)">`;
      const ref = `<select class="field" onchange="SCE.setTime(${i},'ref',this.value)">${opts(draft.conds.slice(0, i).map((_, k) => [k, letter(k)]), c.time.ref)}</select>`;
      timer += `<b>${tr("Таймер:")}</b><select class="field" onchange="SCE.setTime(${i},'mode',this.value)">${opts(TIME_MODES, c.time.mode)}</select>`;
      if (c.time.mode === "after") timer += `<span>${tr("в течение")}</span>${sec}<span>${tr("сек после")}</span>${ref}`;
      else if (c.time.mode === "before") timer += `<span>${tr("не раньше чем за")}</span>${sec}<span>${tr("сек до")}</span>${ref}`;
      else if (c.time.mode === "around") timer += `<span>±</span>${sec}<span>${tr("сек от")}</span>${ref}`;
      else timer += `<span>${tr("что и")}</span>${ref}`;
    } else {
      timer += `<b>${tr("Таймер:")}</b><span>${tr("нет — это точка отсчёта")}</span>`;
    }
    if (!c.neg) {
      timer += `<span class="sce-sep"></span><b>${tr("Сколько раз:")}</b><select class="field" onchange="SCE.setCond(${i},'count',Number(this.value))">${opts(COUNTS.map(n => [n, n === 1 ? "1 раз" : tr("не менее {n}", { n })]), c.count)}</select>`;
      if (c.count > 1) timer += `<span>${tr("за")}</span><input class="field" type="number" min="1" value="${c.per}" oninput="SCE.setCond(${i},'per',Number(this.value),true)"><span>${tr("сек")}</span>`;
    }
    return `<div class="sce-cond ${c.neg ? "neg" : ""}">
      <div class="sce-cond-h"><span class="sce-letter">${letter(i)}</span>${head}${delCond}</div>
      ${events}
      <div class="sce-cond-f">
        <button type="button" class="sce-link" onclick="SCE.addAlt(${i},'obj')">${tr("+ ИЛИ событие объекта")}</button>
        <button type="button" class="sce-link" onclick="SCE.addAlt(${i},'cap')">${tr("+ ИЛИ строка титров")}</button>
      </div>
      <div class="sce-timer">${timer}</div>
    </div>`;
  }

  function renderConds() {
    $("sce-conds").innerHTML = draft.conds.map((c, i) => (i ? `<div class="sce-and">${tr("И")}</div>` : "") + condHtml(c, i)).join("");
    renderSummary();
  }

  /* ---------- timeline + readable ---------- */
  function windows(s) {
    const res = [];
    s.conds.forEach((c, i) => {
      if (i === 0) { res.push({ s: 0, e: c.count > 1 ? c.per : 0, p: 0 }); return; }
      const r = res[c.time.ref] || res[0];
      const pr = r.p, n = Number(c.time.sec) || 0;
      let w;
      if (c.time.mode === "after") w = { s: pr, e: pr + n };
      else if (c.time.mode === "before") w = { s: pr - n, e: pr };
      else if (c.time.mode === "around") w = { s: pr - n, e: pr + n };
      else w = { s: Math.min(r.s, pr) - 5, e: Math.max(r.e, pr) + 15, receipt: true };
      w.p = c.time.mode === "receipt" ? pr : w.e; // chained timers count from the latest moment of the reference
      res.push(w);
    });
    return res;
  }
  function fmtSec(v) {
    const a = Math.abs(v);
    const txt = a >= 60 && a % 60 === 0 ? a / 60 + " " + tr("мин") : a + " " + tr("с");
    return (v > 0 ? "+" : v < 0 ? "−" : "") + txt;
  }
  function renderTimeline() {
    const ws = windows(draft);
    let min = Math.min(0, ...ws.map(w => w.s)), max = Math.max(0, ...ws.map(w => w.e));
    if (max - min < 10) max = min + 10;
    const pad = (max - min) * 0.06; min -= pad; max += pad;
    const W = 820, X0 = 230, X1 = 800, top = 22, rowH = 34, rows = ws.length;
    const x = v => X0 + (v - min) / (max - min) * (X1 - X0);
    const H = top + rows * rowH + 30;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
    const step = steps.find(s => (max - min) / s <= 8) || 1800;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr("Временная шкала сценария"))}">`;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      svg += `<line class="tl-grid" x1="${x(v)}" y1="${top - 6}" x2="${x(v)}" y2="${top + rows * rowH}"/>`;
      svg += `<text class="tl-tick" x="${x(v)}" y="${H - 8}" text-anchor="middle">${v === 0 ? "A" : esc(fmtSec(v))}</text>`;
    }
    svg += `<line class="tl-a" x1="${x(0)}" y1="${top - 10}" x2="${x(0)}" y2="${top + rows * rowH}"/>`;
    let alarm = null;
    ws.forEach((w, i) => {
      const c = draft.conds[i], y = top + i * rowH;
      const label = evShort(c.alts[0]) + (c.alts.length > 1 ? " " + tr("или ещё {n}", { n: c.alts.length - 1 }) : "");
      const short = label.length > 28 ? label.slice(0, 27) + "…" : label;
      svg += `<text class="tl-label" x="0" y="${y + 21}"><tspan class="tl-letter ${c.neg ? "neg" : ""}">${letter(i)}${c.neg ? " " + esc(tr("НЕ")) : ""}</tspan>  ${esc(short)}</text>`;
      if (i === 0 && w.e === w.s) {
        svg += `<circle class="tl-pt" cx="${x(0)}" cy="${y + 17}" r="6"/>`;
      } else {
        const x1 = x(w.s), x2 = Math.max(x(w.e), x1 + 4);
        svg += `<rect class="${c.neg ? "tl-neg" : "tl-pos"}" x="${x1}" y="${y + 6}" width="${x2 - x1}" height="22" rx="4"/>`;
        let inner = i === 0 ? tr("≥{n} раз", { n: c.count }) : c.neg ? tr("не было") : tr("было");
        if (i > 0 && c.count > 1 && !c.neg) inner += " ×" + c.count;
        if (w.receipt) inner += " · " + tr("тот же чек");
        if (x2 - x1 > 46) svg += `<text class="tl-in" x="${(x1 + x2) / 2}" y="${y + 21}" text-anchor="middle">${esc(inner)}</text>`;
        if (c.neg) alarm = Math.max(alarm == null ? -Infinity : alarm, w.e);
      }
    });
    if (alarm != null) {
      svg += `<line class="tl-alarm" x1="${x(alarm)}" y1="${top - 10}" x2="${x(alarm)}" y2="${top + rows * rowH}"/>`;
      svg += `<text class="tl-alarm-t" x="${Math.min(x(alarm) + 4, W - 70)}" y="${top - 10}">${esc(tr("решение"))}</text>`;
    }
    $("sce-timeline").innerHTML = svg + "</svg>";
    return alarm;
  }
  function renderSummary() {
    const alarm = renderTimeline();
    const name = draft.name || tr("без названия");
    const items = draft.conds.map((c, i) => {
      const L = letter(i);
      const what = c.alts.map(e => evText(e, L)).join(` <b>${esc(tr("или"))}</b> `);
      const rep = c.count > 1 && !c.neg ? ", " + tr("не менее {n} раз за {p} сек", { n: c.count, p: c.per }) : "";
      if (i === 0) return `<li><b>A</b> — ${esc(tr("произошло"))}: ${what}${esc(rep)}</li>`;
      return `<li><b>${esc(c.neg ? tr("И НЕ") : tr("И"))} ${L}</b> — ${esc(c.neg ? tr("не произошло") : tr("произошло"))}: ${what}${esc(rep)} — <i>${esc(timeText(c))}</i></li>`;
    }).join("");
    const when = alarm != null
      ? tr("Тревога ждёт окончания таймера «НЕ»: решение не позже чем через {n} после A, если запрещённое событие так и не наступило.", { n: fmtSec(alarm) })
      : tr("Тревога создаётся сразу, как только выполнены все условия в своих таймерах.");
    const bad = undefinedTokens(draft);
    const warn = bad.length
      ? `<div class="sce-warn">⚠ ${esc(tr("Не определены переменные:"))} ${bad.map(b => `${letter(b.cond)}: <span class="sce-var">${esc(b.token)}</span>`).join(", ")} — ${esc(tr("их нужно запомнить в одном из предыдущих условий."))}</div>`
      : "";
    $("sce-readable").innerHTML = `
      <div>${esc(tr("Тревога"))} <b>«${esc(tplId ? tr(name) : name)}»</b> (${esc(prioLabel(draft.prio))}), ${esc(tr("если:"))}</div>
      <ol>${items}</ol>
      <div class="sce-muted">${esc(when)}</div>${warn}
      <div class="sce-formula">${esc(formula(draft))}</div>`;
  }

  /* ---------- mutations ---------- */
  const API = {
    setTop(key, val, soft) { draft[key] = val; if (key === "name" || key === "prio") renderSummary(); if (!soft) renderList(); },
    setCond(i, key, val, soft) { draft.conds[i][key] = val; soft ? renderSummary() : renderConds(); },
    setNeg(i, val) { draft.conds[i].neg = val === "1"; if (draft.conds[i].neg) draft.conds[i].count = 1; renderConds(); },
    setTime(i, key, val, soft) {
      draft.conds[i].time[key] = key === "mode" ? val : Number(val);
      if (key === "mode" && val !== "receipt" && !draft.conds[i].time.sec) draft.conds[i].time.sec = 10;
      soft ? renderSummary() : renderConds();
    },
    setEv(i, j, key, val, soft) {
      const e = draft.conds[i].alts[j];
      e[key] = val;
      if (key === "otype") {
        const ot = OBJ_TYPES[val];
        e.obj = ot.objects[0]; e.ev = ot.events[0];
        e.where.forEach(w => { w.attr = ot.attrs[0]; });
        e.save.forEach(v => { v.attr = ot.attrs[0]; });
      }
      soft ? renderSummary() : renderConds();
    },
    setKind(i, j, kind) { draft.conds[i].alts[j] = defaultEv(kind); renderConds(); },
    addAlt(i, kind) { draft.conds[i].alts.push(defaultEv(kind)); renderConds(); },
    removeAlt(i, j) { draft.conds[i].alts.splice(j, 1); renderConds(); },
    addCond(kind) { draft.conds.push(cond([defaultEv(kind)], { time: { mode: "after", sec: 10, ref: 0 } })); renderConds(); },
    removeCond(i) {
      draft.conds.splice(i, 1);
      draft.conds.forEach((c, k) => {
        if (c.time.ref === i) c.time.ref = Math.max(0, i - 1);
        else if (c.time.ref > i) c.time.ref -= 1;
        if (c.time.ref >= k) c.time.ref = 0;
      });
      draft.conds[0].neg = false;
      renderConds();
    },
    addX(i, j, list) {
      const e = draft.conds[i].alts[j];
      const attr = e.kind === "obj" ? OBJ_TYPES[e.otype].attrs[0] : undefined;
      if (list === "save") {
        const n = e.save.length + 1;
        e.save.push(e.kind === "cap" ? { name: n === 1 ? "код" : "знач" + n, re: "" } : { name: n === 1 ? "id" : "id" + n, attr });
      } else e.where.push({ attr, op: "eq", val: "" });
      renderConds();
    },
    setX(i, j, list, k, key, val, soft) {
      draft.conds[i].alts[j][list][k][key] = key === "name" ? val.replace(/[\s{}.]/g, "") : val;
      soft ? renderSummary() : renderConds();
    },
    delX(i, j, list, k) { draft.conds[i].alts[j][list].splice(k, 1); renderConds(); },
    insertVar(i, j, token) {
      const e = draft.conds[i].alts[j];
      if (e.kind === "cap") {
        e.text = (e.text ? e.text.replace(/\s*$/, " ") : "") + token;
        renderConds();
        const el = $(`sce-text-${i}-${j}`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      } else {
        const empty = e.where.find(w => !w.val);
        if (empty) empty.val = token; else e.where.push({ attr: OBJ_TYPES[e.otype].attrs[0], op: "eq", val: token });
        renderConds();
      }
    },
    edit(id) { editingId = id; tplId = null; draft = clone(scenarios.find(s => s.id === id)); renderList(); renderEditor(); },
    openTemplate(id) { tplId = id; editingId = null; draft = clone(templates.find(s => s.id === id)); renderList(); renderEditor(); },
    newScenario() { editingId = null; tplId = null; draft = blankScenario(); renderList(); renderEditor(); $("sce-name").focus(); },
    copyTemplate() {
      const tpl = templates.find(s => s.id === tplId);
      draft = clone(tpl); delete draft.id;
      draft.name = tr(tpl.name) + " — " + tr("копия");
      tplId = null; editingId = null;
      renderList(); renderEditor();
      toast(tr("Копия шаблона создана — сохраните её"));
    },
    reset() { if (editingId) API.edit(editingId); else API.newScenario(); toast(tr("Изменения отменены")); },
    save() {
      if (tplId) return;
      draft.name = String(draft.name).trim();
      if (!draft.name) return toast(tr("Укажите название"));
      for (let i = 0; i < draft.conds.length; i++) {
        if (draft.conds[i].alts.some(e => e.kind === "cap" && !String(e.text).trim()))
          return toast(tr("Условие {l}: укажите текст строки титров", { l: letter(i) }));
        if (draft.conds[i].alts.some(e => (e.save || []).some(v => !v.name || (e.kind === "cap" && !v.re))))
          return toast(tr("Условие {l}: у запоминаемого значения нужны имя и шаблон", { l: letter(i) }));
      }
      const bad = undefinedTokens(draft);
      if (bad.length) return toast(tr("Условие {l}: переменная {v} не определена раньше", { l: letter(bad[0].cond), v: bad[0].token }));
      if (editingId) Object.assign(scenarios.find(s => s.id === editingId), clone(draft));
      else { const id = Date.now(); scenarios.push(Object.assign(clone(draft), { id })); editingId = id; }
      renderList(); renderEditor();
      toast(tr("Сценарий сохранён"));
    },
    remove() {
      scenarios = scenarios.filter(s => s.id !== editingId);
      if (scenarios[0]) API.edit(scenarios[0].id); else API.newScenario();
      toast(tr("Сценарий удалён"));
    },
    test() {
      const ws = windows(draft);
      const base = ["09:12:40", "11:47:03", "13:05:18", "15:31:56"];
      const n = 1 + ((draft.conds.length + String(draft.name).length) % 3);
      const sample = { "код": "2900123004512", "вес": "1.240", "товар": "БАНАНЫ", "предмет": "obj-77", "владелец": "track-1041" };
      const vars = varsBefore(draft, draft.conds.length);
      const rows = base.slice(0, n).map((time, r) => {
        const [h, m, s] = time.split(":").map(Number);
        const parts = draft.conds.map((c, i) => {
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
      root = el; toastFn = (o && o.toast) || null;
      root.classList.add("sce");
      root.setAttribute("data-i18n-skip", "");
      API.refresh();
    },
    refresh() {
      if (!root) return;
      root.innerHTML = skeleton();
      renderList(); renderEditor();
    }
  };
  API.refresh = global.ScenarioEditor.refresh;
})(window);
