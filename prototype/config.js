/* Tab «Конфигурация»: everything the Retail addon keeps on the server, in one place.
 * Draws RetailApi.config() (prototype/config-data.js). Same idea as «Настройки администратора»
 * in Incident Manager (../IM/Specification/Workflow_machine/SETTINGS.md): one list of sections,
 * each setting with what it sets and its current value. Here the operator sees it read-only and the
 * administrator can edit (the prototype does not save). Later the sections move to a separate configurator.
 *
 *   RetailConfig.mount({ nav, body, banner }, { toast, role })   role() → "operator" | "admin"
 *   RetailConfig.refresh()   — redraw (language, role, scenario list changed)
 *   RetailConfig.open(id)    — open a section
 */
(function (global) {
  const tr = (s, v) => (typeof global.t === "function" ? global.t(s, v) : s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls) => `<svg class="ic${cls ? " " + cls : ""}"><use href="#i-${name}"/></svg>`;

  let els = null, opts = null, current = "stores", dirty = false;

  function data() { return global.RetailApi.config(); }
  const isAdmin = () => opts.role() === "admin";

  function problems(sec) {
    let n = 0;
    sec.blocks.forEach(b => {
      if (b.type === "table") b.rows.forEach(r => { if (r.some(c => c && c.s === "down")) n++; });
      if (b.type === "tiles") b.tiles.forEach(tl => { if (tl.s === "down") n++; });
    });
    return n;
  }

  function renderBanner() {
    const admin = isAdmin();
    els.banner.className = "msgbar band" + (admin ? " warn" : "");
    els.banner.innerHTML = `<span class="tile">${icon(admin ? "shield" : "info")}</span>
      <div class="grow"><div class="msg-t">${esc(tr("Настройки сервера собраны в одной закладке"))}</div>
      <div class="msg-d">${esc(tr("Действуют для всех рабочих мест и магазинов. Позже этот раздел станет отдельным конфигуратором."))} ${esc(tr(admin
        ? "Вы — администратор: изменения пишутся в журнал аудита. В прототипе они не сохраняются."
        : "Вы — оператор: только просмотр. Чтобы попробовать правку, выберите роль «Администратор» в меню пользователя."))}</div></div>`;
  }

  function renderNav() {
    const d = data();
    els.nav.innerHTML = d.groups.map(g => {
      const items = d.sections.filter(s => s.group === g.id);
      return `<div class="cfg-group">${esc(tr(g.title))}</div>` + items.map(s => {
        const p = problems(s);
        return `<button type="button" class="cfg-nav-item" data-cfg="${s.id}" ${s.id === current ? 'aria-current="page"' : ""}>${icon(s.icon)}<span>${esc(tr(s.title))}</span>${p ? `<span class="tree-n hot" data-tip="${esc(tr("Требует внимания: {n}", { n: p }))}">${p}</span>` : ""}</button>`;
      }).join("");
    }).join("");
    els.nav.querySelectorAll("[data-cfg]").forEach(b => b.addEventListener("click", () => open(b.dataset.cfg)));
  }

  function cell(c) {
    if (c && typeof c === "object" && c.src) {
      const d = global.Retail.deviceById(c.src);
      return d ? `<span class="source ${d.cls}">${esc(tr(d.name))}</span>` : esc(c.src);
    }
    if (c && typeof c === "object" && c.s) return `<span class="state"><i class="status-dot" data-tone="${c.s}"></i>${esc(tr(c.t))}</span>`;
    return esc(tr(c));
  }

  function control(row, i, bi) {
    const dis = isAdmin() ? "" : "disabled";
    const id = `cfg-${bi}-${i}`;
    if (row.k === "ro") return `<span class="val-text">${esc(tr(row.v))}</span>`;
    if (row.k === "sw") return `<label class="switch-row"><input type="checkbox" role="switch" id="${id}" ${row.v ? "checked" : ""} ${dis} data-set><span>${esc(tr(row.v ? "вкл." : "выкл."))}</span></label>`;
    if (row.k === "sel") return `<select class="field" id="${id}" ${dis} data-set aria-label="${esc(tr(row.n))}">${row.o.map(o => `<option ${o === row.v ? "selected" : ""} value="${esc(o)}">${esc(tr(o))}</option>`).join("")}</select>`;
    const w = row.k === "num" ? "90px" : "260px";
    return `<span class="row" style="flex-wrap:nowrap"><input class="field" id="${id}" style="width:${w}" value="${esc(tr(row.v))}" ${dis} data-set aria-label="${esc(tr(row.n))}">${row.u ? `<span class="muted">${esc(tr(row.u))}</span>` : ""}</span>`;
  }

  function publishTable() {
    const { base, mine } = global.ScenarioEditor.list();
    const rows = base.map(s => [s.code ? `${s.code} · ${tr(s.name)}` : tr(s.name), tr("Базовый"), "v3 · 09.11.2026", tr("Все магазины"), s.on === false ? { s: "warn", t: "выключен" } : { s: "ok", t: "опубликован" }])
      .concat(mine.map(s => [tr(s.name), tr("Мой"), s.on ? "v1 · 14.09.2026" : "—", tr("№142 Авиапарк"), s.on ? { s: "ok", t: "опубликован" } : { s: "warn", t: "черновик" }]));
    return `<div class="cfg-block"><div class="cfg-block-h"><h3>${esc(tr("Сценарии на сервере"))}</h3><span class="meta">${esc(tr("Базовых: {b} · моих: {m}", { b: base.length, m: mine.length }))}</span>
        <button type="button" class="btn compact outline" data-act="${esc(tr("Откат версии выполняется на сервере; в прототипе — только показ"))}" ${isAdmin() ? "" : "disabled"}>${icon("rotate")}<span>${esc(tr("Откатить версию"))}</span></button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr>${["Сценарий", "Вид", "Версия", "Магазины", "Состояние"].map(h => `<th>${esc(tr(h))}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${typeof c === "object" ? cell(c) : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  }

  function block(b, bi) {
    if (b.type === "publish") return publishTable();
    if (b.type === "captions") {
      return `<div class="cfg-block"><div class="cfg-block-h"><h3>${esc(tr("Как это выглядит"))}</h3><span class="meta">${esc(tr("Пример на кадре кассы 2"))}</span></div>
        <div class="preview-video"><div class="video"><div class="video-scene cashier"></div><div class="ov cam-tag">CAM-142-09 · ${esc(tr("КАССИР / РУКИ"))}</div>
        <div class="caption">${esc(tx("15:02  КАССИР ИВАНОВА Е.\nВОДКА ПУТИНКА 0,5Л  389,00"))}\n<span class="hit">${esc(tr("АННУЛЯЦИЯ ЧЕКА"))}</span>\n${esc(tr("ИТОГО 0,00"))}</div></div></div></div>`;
    }
    if (b.type === "tiles") {
      return `<div class="tiles">${b.tiles.map(tl => `<div class="tile-card"><span class="meta"><i class="status-dot" data-tone="${tl.s}"></i>${esc(tr(tl.label))}</span><span class="big">${esc(tr(tl.big))}</span><span class="meta">${esc(tr(tl.meta))}</span></div>`).join("")}</div>`;
    }
    const acts = (b.acts || []).map(a => `<button type="button" class="btn compact outline" data-act="${esc(tr(a.msg))}" ${isAdmin() ? "" : "disabled"}>${icon(a.icon)}<span>${esc(tr(a.label))}</span></button>`).join("");
    const head = `<div class="cfg-block-h"><h3>${esc(tr(b.t))}</h3><span class="meta">${b.note ? esc(tr(b.note)) : ""}</span>${acts}</div>`;
    if (b.type === "settings") {
      return `<div class="cfg-block">${head}<table class="set-table"><tbody>${b.rows.map((r, i) => `<tr>
        <td class="set-name"><label for="cfg-${bi}-${i}">${esc(tr(r.n))}</label></td><td class="set-what">${esc(tr(r.w))}</td><td class="set-val">${control(r, i, bi)}</td></tr>`).join("")}</tbody></table></div>`;
    }
    return `<div class="cfg-block">${head}<div class="table-wrap"><table class="data-table"><thead><tr>${b.cols.map(h => `<th>${esc(tr(h))}</th>`).join("")}</tr></thead>
      <tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${cell(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  }

  function renderBody() {
    const s = data().sections.find(x => x.id === current);
    const admin = isAdmin();
    els.body.innerHTML = `<div class="cfg-title"><h2>${esc(tr(s.title))}</h2><span class="cfg-ref">${esc(tr(s.ref))}</span>
        <span class="grow"></span>
        ${admin ? `<button type="button" class="btn compact outline" id="cfgReset" ${dirty ? "" : "disabled"}>${esc(tr("Отменить"))}</button>
        <button type="button" class="btn compact primary" id="cfgSave" ${dirty ? "" : "disabled"}>${icon("check")}<span>${esc(tr("Сохранить"))}</span></button>` : ""}</div>
      <p class="cfg-lead">${esc(tr(s.lead))}</p>
      ${s.blocks.map(block).join("")}`;
    els.body.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => opts.toast(b.dataset.act)));
    els.body.querySelectorAll("[data-set]").forEach(inp => inp.addEventListener("change", () => {
      if (inp.type === "checkbox") inp.nextElementSibling.textContent = tr(inp.checked ? "вкл." : "выкл.");
      dirty = true;
      const sv = els.body.querySelector("#cfgSave"), rs = els.body.querySelector("#cfgReset");
      if (sv) sv.disabled = false;
      if (rs) rs.disabled = false;
    }));
    const save = els.body.querySelector("#cfgSave");
    if (save) save.addEventListener("click", () => { dirty = false; renderBody(); opts.toast(tr("Записано в журнал аудита. В прототипе значения не сохраняются")); });
    const reset = els.body.querySelector("#cfgReset");
    if (reset) reset.addEventListener("click", () => { dirty = false; renderBody(); });
    els.body.scrollTop = 0;
  }

  function open(id) {
    if (dirty && !confirmLeave()) return;
    current = id; dirty = false;
    renderNav(); renderBody();
  }
  function confirmLeave() { dirty = false; opts.toast(tr("Несохранённые изменения сброшены")); return true; }

  function refresh() { if (!els) return; renderBanner(); renderNav(); renderBody(); }

  function mount(e, o) { els = e; opts = o; refresh(); }

  global.RetailConfig = { mount, refresh, open, sections: () => data().sections };
})(window);
