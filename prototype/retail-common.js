/* Shared data and controls of the Retail prototype (prototype/index.html, scenario editor).
 *
 *   Retail.DEVICES        — POS devices of the demo store (tills, SCO, scales, other) with link status
 *   Retail.mountPicker()  — multi-select of devices: checkbox = selected, dot = online / offline (UI-5)
 *   Retail.mountPeriod()  — period field with two calendars "From" / "To", time hh:mm:ss and presets (UI-6)
 *   Retail.fmt / parse    — dd.mm.yyyy hh:mm:ss
 *
 * Load after i18n.js (uses global t when present). Popovers are position:fixed on <body>,
 * so they are not clipped by panels with overflow:hidden.
 */
(function (global) {
  const tr = (s, v) => (typeof global.t === "function" ? global.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const GROUPS = [
    { id: "pos", name: "Кассы", all: "Все кассы" },
    { id: "kso", name: "КСО", all: "Все КСО" },
    { id: "scale", name: "Весы", all: "Все весы" },
    { id: "other", name: "Прочее", all: "Всё прочее" }
  ];

  const DEVICES = [
    { id: "pos-2", group: "pos", name: "Касса 2 · Set Retail", online: true, badge: "Кассовое ПО", cls: "src-pos", cam: "CAM-142-09 · КАССИР / РУКИ", scene: "cashier", view: "Касса 2 · вид на кассира и руки" },
    { id: "file-1c", group: "pos", name: "Касса 1 · выгрузка 1С", online: false, since: "13:40", badge: "Файл 1С → Gateway", cls: "src-file", cam: "CAM-142-08 · КАССИР / ПОКУПАТЕЛЬ", scene: "pair", view: "Касса 1 · кассир и покупатель" },
    { id: "fr-5", group: "pos", name: "Касса 5 · ФР / принтер", online: true, badge: "Шина ФР / ESC-POS", cls: "src-fr", cam: "CAM-142-11 · КАССИР / РУКИ", scene: "cashier", view: "Касса 5 · руки кассира и стол" },
    { id: "kso-2", group: "kso", name: "КСО-2", online: true, badge: "КСО", cls: "src-kso", cam: "CAM-142-17 · СВЕРХУ, КСО + ПОКУПАТЕЛЬ", scene: "pair", view: "КСО-2 · сверху на площадку и покупателя" },
    { id: "scale-veg", group: "scale", name: "Весы овощи-фрукты", online: true, badge: "Весовой терминал", cls: "src-scale", cam: "CAM-142-31 · ВЕСЫ ОВОЩИ", scene: "pair", view: "Весы овощи-фрукты · покупатель" },
    { id: "scale-fish", group: "scale", name: "Весы рыба", online: true, badge: "Весовой терминал", cls: "src-scale", cam: "CAM-142-32 · ВЕСЫ РЫБА", scene: "pair", view: "Весы рыба · продавец и покупатель" },
    { id: "scale-meat", group: "scale", name: "Весы мясо", online: true, badge: "Весовой терминал", cls: "src-scale", cam: "CAM-142-33 · ВЕСЫ МЯСО", scene: "pair", view: "Весы мясо · продавец и покупатель" },
    { id: "scale-saus", group: "scale", name: "Весы колбасы", online: false, since: "12:15", badge: "Весовой терминал", cls: "src-scale", cam: "CAM-142-34 · ВЕСЫ КОЛБАСЫ", scene: "pair", view: "Весы колбасы · продавец и покупатель" },
    { id: "scale-cheese", group: "scale", name: "Весы сыры", online: true, badge: "Весовой терминал", cls: "src-scale", cam: "CAM-142-35 · ВЕСЫ СЫРЫ", scene: "pair", view: "Весы сыры · продавец и покупатель" },
    { id: "ofd", group: "other", name: "Сеть · лента ОФД", online: true, badge: "ОФД", cls: "src-ofd", cam: "CAM-142-09 · КАССИР / РУКИ", scene: "cashier", view: "Касса по ФН из ОФД · кассир и руки" },
    { id: "wms", group: "other", name: "Склад · WMS", online: true, badge: "WMS", cls: "src-ofd", cam: "CAM-142-30 · СКЛАД, ВОРОТА", scene: "gate", view: "Склад · ворота погрузки" }
  ];
  const deviceById = (id) => DEVICES.find(d => d.id === id);

  /* ---------- selection helpers ---------- */
  function pool(filter) { return DEVICES.filter(d => !filter || filter(d)); }
  function expand(value, filter) {
    const ids = pool(filter).map(d => d.id);
    if (!value || value.includes("*")) return ids;
    return value.filter(id => ids.includes(id));
  }
  function compact(ids, filter) {
    const all = pool(filter).map(d => d.id);
    return all.length && all.every(id => ids.includes(id)) ? ["*"] : all.filter(id => ids.includes(id));
  }
  function summary(value, filter) {
    const devs = pool(filter);
    const ids = expand(value, filter);
    if (!ids.length) return tr("Ничего не выбрано");
    if (ids.length === devs.length) return tr("Все устройства");
    const parts = [];
    GROUPS.forEach(g => {
      const inGroup = devs.filter(d => d.group === g.id);
      const sel = inGroup.filter(d => ids.includes(d.id));
      if (!sel.length) return;
      if (sel.length === inGroup.length && inGroup.length > 1) parts.push(tr(g.all));
      else sel.forEach(d => parts.push(tr(d.name)));
    });
    return parts.length > 3 ? tr("{n} устройств", { n: ids.length }) : parts.join(", ");
  }

  /* ---------- popover infrastructure ---------- */
  let openPop = null;
  function closePopovers() {
    if (openPop) { openPop.el.remove(); openPop.trigger.setAttribute("aria-expanded", "false"); openPop = null; }
  }
  function openPopover(trigger, html, minWidth) {
    closePopovers();
    const el = document.createElement("div");
    el.className = "rc-pop";
    el.innerHTML = html;
    document.body.appendChild(el);
    const r = trigger.getBoundingClientRect();
    const w = Math.max(r.width, minWidth || 0);
    el.style.minWidth = w + "px";
    const left = Math.min(r.left, window.innerWidth - el.offsetWidth - 8);
    el.style.left = Math.max(8, left) + "px";
    const below = r.bottom + 4;
    const fits = below + el.offsetHeight < window.innerHeight - 8;
    el.style.top = (fits ? below : Math.max(8, r.top - el.offsetHeight - 4)) + "px";
    trigger.setAttribute("aria-expanded", "true");
    openPop = { el, trigger };
    return el;
  }
  document.addEventListener("mousedown", (e) => {
    if (openPop && !openPop.el.contains(e.target) && !openPop.trigger.contains(e.target)) closePopovers();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopovers(); });
  window.addEventListener("resize", closePopovers);
  document.addEventListener("scroll", (e) => { if (openPop && !openPop.el.contains(e.target)) closePopovers(); }, true);

  /* ---------- device picker (UI-5) ---------- */
  function mountPicker(el, o) {
    const state = { value: (o.value || ["*"]).slice(), filter: o.filter, onChange: o.onChange, disabled: !!o.disabled, q: "" };
    el.classList.add("rc-picker");
    function renderTrigger() {
      const ids = expand(state.value, state.filter);
      const off = ids.filter(id => !deviceById(id).online).length;
      el.innerHTML = `<button type="button" class="field rc-trigger" aria-haspopup="listbox" aria-expanded="false" ${state.disabled ? "disabled" : ""}>
        <span class="rc-sum">${esc(summary(state.value, state.filter))}</span>
        ${off ? `<span class="rc-off" title="${esc(tr("Не в сети: {n}", { n: off }))}"><span class="rc-dot off"></span>${off}</span>` : ""}
      </button>`;
      el.querySelector("button").addEventListener("click", open);
    }
    function rows() {
      const devs = pool(state.filter);
      const ids = expand(state.value, state.filter);
      const q = state.q.trim().toLowerCase();
      const match = (d) => !q || tr(d.name).toLowerCase().includes(q);
      const allChecked = ids.length === devs.length, some = ids.length > 0;
      let h = `<label class="rc-row rc-all"><input type="checkbox" data-all ${allChecked ? "checked" : ""} ${!allChecked && some ? "data-ind" : ""}><span>${esc(tr("Все устройства"))}</span></label>`;
      GROUPS.forEach(g => {
        const inGroup = devs.filter(d => d.group === g.id);
        const shown = inGroup.filter(match);
        if (!shown.length) return;
        const sel = inGroup.filter(d => ids.includes(d.id)).length;
        h += `<label class="rc-row rc-group"><input type="checkbox" data-group="${g.id}" ${sel === inGroup.length ? "checked" : ""} ${sel && sel < inGroup.length ? "data-ind" : ""}><span>${esc(tr(g.name))}</span></label>`;
        shown.forEach(d => {
          const status = d.online ? tr("в сети") : tr("не в сети с {t}", { t: d.since });
          h += `<label class="rc-row rc-dev"><input type="checkbox" data-id="${d.id}" ${ids.includes(d.id) ? "checked" : ""}>
            <span class="rc-name">${esc(tr(d.name))}</span>
            <span class="rc-status ${d.online ? "" : "off"}" title="${esc(status)}"><span class="rc-dot ${d.online ? "on" : "off"}"></span>${d.online ? "" : esc(status)}</span></label>`;
        });
      });
      return h;
    }
    function open() {
      const many = pool(state.filter).length > 8;
      const pop = openPopover(el.querySelector("button"), `
        ${many ? `<input class="field rc-search" placeholder="${esc(tr("Найти устройство"))}" value="${esc(state.q)}">` : ""}
        <div class="rc-list" role="listbox" aria-multiselectable="true">${rows()}</div>
        <div class="rc-foot"><span class="rc-hint">${esc(tr("Устройство не в сети можно выбрать: архив по нему есть"))}</span>
          <button type="button" class="btn btn-primary rc-done">${esc(tr("Готово"))}</button></div>`, 300);
      const list = pop.querySelector(".rc-list");
      const sync = () => { list.querySelectorAll("[data-ind]").forEach(cb => { cb.indeterminate = true; }); };
      sync();
      list.addEventListener("change", (e) => {
        const cb = e.target;
        let ids = expand(state.value, state.filter);
        const devs = pool(state.filter);
        if (cb.hasAttribute("data-all")) ids = cb.checked ? devs.map(d => d.id) : [];
        else if (cb.dataset.group) {
          const g = devs.filter(d => d.group === cb.dataset.group).map(d => d.id);
          ids = cb.checked ? Array.from(new Set(ids.concat(g))) : ids.filter(id => !g.includes(id));
        } else ids = cb.checked ? ids.concat(cb.dataset.id) : ids.filter(id => id !== cb.dataset.id);
        state.value = compact(ids, state.filter);
        list.innerHTML = rows(); sync();
        renderTrigger();
        el.querySelector("button").setAttribute("aria-expanded", "true");
        openPop.trigger = el.querySelector("button");
        if (state.onChange) state.onChange(state.value.slice());
      });
      const search = pop.querySelector(".rc-search");
      if (search) {
        search.addEventListener("input", () => { state.q = search.value; list.innerHTML = rows(); sync(); });
        search.focus();
      }
      pop.querySelector(".rc-done").addEventListener("click", closePopovers);
    }
    renderTrigger();
    return {
      get: () => state.value.slice(),
      ids: () => expand(state.value, state.filter),
      set: (v) => { state.value = v.slice(); renderTrigger(); },
      refresh: renderTrigger
    };
  }

  /* ---------- date helpers ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  function fmt(d) {
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function parse(s) {
    const m = String(s).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  const TODAY = new Date(2026, 8, 14);   // demo data date
  const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const at = (base, h, m, s, dayShift) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + (dayShift || 0), h, m, s);

  /* ---------- period picker (UI-6) ---------- */
  function mountPeriod(el, o) {
    const state = { from: o.from, to: o.to, onChange: o.onChange };
    el.classList.add("rc-period");
    el.innerHTML = `<input class="field rc-period-input" aria-label="${esc(tr("Период"))}">
      <button type="button" class="rc-cal-btn" title="${esc(tr("Выбрать в календаре"))}" aria-label="${esc(tr("Выбрать в календаре"))}" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      </button>`;
    const input = el.querySelector("input");
    const btn = el.querySelector("button");
    const sameDay = () => state.from.toDateString() === state.to.toDateString();
    const show = () => {
      input.value = sameDay() ? `${fmt(state.from)} — ${fmt(state.to).slice(11)}` : `${fmt(state.from)} — ${fmt(state.to)}`;
      input.title = `${fmt(state.from)} — ${fmt(state.to)}`;
      input.classList.remove("rc-invalid"); input.removeAttribute("aria-invalid");
    };
    const emit = () => { if (state.onChange) state.onChange({ from: state.from, to: state.to }); };
    input.addEventListener("change", () => {
      const parts = input.value.split(/\s+[—–-]\s+/);
      const f = parse(parts[0] || "");
      let tt = parse(parts[1] || "");
      if (!tt && f && /^\d{1,2}:\d{2}(:\d{2})?$/.test((parts[1] || "").trim())) tt = parse(fmt(f).slice(0, 10) + " " + parts[1].trim());
      if (f && tt && f <= tt) { state.from = f; state.to = tt; show(); emit(); }
      else { input.classList.add("rc-invalid"); input.setAttribute("aria-invalid", "true"); input.title = tr("Формат: дд.мм.гггг чч:мм:сс — дд.мм.гггг чч:мм:сс, начало не позже конца"); }
    });
    btn.addEventListener("click", () => {
      const view = { from: new Date(state.from), to: new Date(state.to), mf: new Date(state.from.getFullYear(), state.from.getMonth(), 1), mt: new Date(state.to.getFullYear(), state.to.getMonth(), 1) };
      const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      function cal(key, month, sel, title) {
        const first = (month.getDay() + 6) % 7;
        const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const years = []; for (let y = 2024; y <= 2027; y++) years.push(y);
        let grid = WEEKDAYS.map(w => `<span class="rc-wd">${esc(tr(w))}</span>`).join("");
        for (let i = 0; i < first; i++) grid += "<span></span>";
        for (let d = 1; d <= days; d++) {
          const date = new Date(month.getFullYear(), month.getMonth(), d);
          const isSel = date.toDateString() === sel.toDateString();
          const day0 = new Date(view.from.getFullYear(), view.from.getMonth(), view.from.getDate());
          const day1 = new Date(view.to.getFullYear(), view.to.getMonth(), view.to.getDate());
          const inRange = date >= day0 && date <= day1;
          grid += `<button type="button" class="rc-day ${isSel ? "sel" : ""} ${inRange ? "range" : ""}" data-cal="${key}" data-day="${d}" aria-pressed="${isSel}">${d}</button>`;
        }
        return `<div class="rc-cal">
          <div class="rc-cal-title">${esc(tr(title))}</div>
          <div class="rc-cal-h">
            <button type="button" class="rc-nav" data-cal="${key}" data-step="-1" aria-label="${esc(tr("Предыдущий месяц"))}">‹</button>
            <select class="field rc-month" data-cal="${key}" aria-label="${esc(tr("Месяц"))}">${MONTHS.map((m, i) => `<option value="${i}" ${i === month.getMonth() ? "selected" : ""}>${esc(tr(m))}</option>`).join("")}</select>
            <select class="field rc-year" data-cal="${key}" aria-label="${esc(tr("Год"))}">${years.map(y => `<option ${y === month.getFullYear() ? "selected" : ""}>${y}</option>`).join("")}</select>
            <button type="button" class="rc-nav" data-cal="${key}" data-step="1" aria-label="${esc(tr("Следующий месяц"))}">›</button>
          </div>
          <div class="rc-grid">${grid}</div>
          <label class="rc-time">${esc(tr("Время"))} <input class="field" inputmode="numeric" placeholder="${esc(tr("чч:мм:сс"))}" maxlength="8" data-time="${key}" value="${timeOf(sel)}"></label>
        </div>`;
      }
      function body() {
        return `<div class="rc-presets">
            ${[["today", "Сегодня"], ["yesterday", "Вчера"], ["shift", "Текущая смена"], ["week", "7 дней"]].map(([k, l]) => `<button type="button" class="btn btn-ghost rc-preset" data-preset="${k}">${esc(tr(l))}</button>`).join("")}
          </div>
          <div class="rc-cals">${cal("from", view.mf, view.from, "От")}${cal("to", view.mt, view.to, "До")}</div>
          <div class="rc-foot"><span class="rc-err" role="alert"></span>
            <button type="button" class="btn btn-ghost rc-cancel">${esc(tr("Отмена"))}</button>
            <button type="button" class="btn btn-primary rc-apply">${esc(tr("Применить"))}</button></div>`;
      }
      const pop = openPopover(btn, body(), 0);
      pop.classList.add("rc-pop-period");
      pop.setAttribute("role", "dialog");
      pop.setAttribute("aria-label", tr("Период"));
      const rerender = () => { pop.innerHTML = body(); };
      pop.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.classList.contains("rc-day")) {
          const key = b.dataset.cal, month = key === "from" ? view.mf : view.mt, cur = view[key];
          view[key] = new Date(month.getFullYear(), month.getMonth(), +b.dataset.day, cur.getHours(), cur.getMinutes(), cur.getSeconds());
          rerender();
        } else if (b.classList.contains("rc-nav")) {
          const k = b.dataset.cal === "from" ? "mf" : "mt";
          view[k] = new Date(view[k].getFullYear(), view[k].getMonth() + Number(b.dataset.step), 1);
          rerender();
        } else if (b.dataset.preset) {
          const p = b.dataset.preset;
          if (p === "today") { view.from = at(TODAY, 0, 0, 0); view.to = at(TODAY, 23, 59, 59); }
          if (p === "yesterday") { view.from = at(TODAY, 0, 0, 0, -1); view.to = at(TODAY, 23, 59, 59, -1); }
          if (p === "shift") { view.from = at(TODAY, 8, 0, 0); view.to = at(TODAY, 20, 0, 0); }
          if (p === "week") { view.from = at(TODAY, 0, 0, 0, -6); view.to = at(TODAY, 23, 59, 59); }
          view.mf = new Date(view.from.getFullYear(), view.from.getMonth(), 1);
          view.mt = new Date(view.to.getFullYear(), view.to.getMonth(), 1);
          rerender();
        } else if (b.classList.contains("rc-cancel")) closePopovers();
        else if (b.classList.contains("rc-apply")) {
          if (view.from > view.to) { pop.querySelector(".rc-err").textContent = tr("Начало периода позже конца"); return; }
          state.from = view.from; state.to = view.to; show(); emit(); closePopovers();
        }
      });
      pop.addEventListener("change", (e) => {
        const s = e.target;
        if (s.dataset.time) {
          const mt = s.value.trim().match(/^(\d{1,2})[:.,\s]?(\d{2})(?:[:.,\s]?(\d{2}))?$/);
          if (!mt || +mt[1] > 23 || +mt[2] > 59 || +(mt[3] || 0) > 59) { s.classList.add("rc-invalid"); pop.querySelector(".rc-err").textContent = tr("Время — в формате чч:мм:сс"); return; }
          s.classList.remove("rc-invalid"); pop.querySelector(".rc-err").textContent = "";
          const h = +mt[1], m = +mt[2], sec = +(mt[3] || 0);
          s.value = timeOf(new Date(2000, 0, 1, h, m, sec));
          const d = view[s.dataset.time];
          view[s.dataset.time] = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0, sec || 0);
          return;
        }
        if (s.classList.contains("rc-month") || s.classList.contains("rc-year")) {
          const k = s.dataset.cal === "from" ? "mf" : "mt";
          const wrap = s.closest(".rc-cal-h");
          view[k] = new Date(Number(wrap.querySelector(".rc-year").value), Number(wrap.querySelector(".rc-month").value), 1);
          rerender();
        }
      });
    });
    show();
    return { get: () => ({ from: state.from, to: state.to }), set: (f, tt) => { state.from = f; state.to = tt; show(); }, refresh: show };
  }

  global.Retail = {
    DEVICES, GROUPS, TODAY, deviceById, expand, summary,
    mountPicker, mountPeriod, closePopovers, fmt, parse, at, esc
  };
})(window);
