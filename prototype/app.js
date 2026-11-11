/* Retail workstation — screens on the Incident Manager shell (11.11.2026).
 * Talks to RetailApi (data.js) only; reference books and settings are not copied into this file.
 * Sections: Тревоги (queue + card), Поиск (by scenario / captions / receipts), Мои сценарии (editor),
 * Конфигурация (server settings, config.js). Video + receipt panel on the right is shared by the sections.
 */
(function () {
  const api = window.RetailApi;
  const esc = Retail.esc;
  const DATE = api.DATE;
  const $ = (id) => document.getElementById(id);
  const icon = (name, cls) => `<svg class="ic${cls ? " " + cls : ""}"><use href="#i-${name}"/></svg>`;
  const nowClock = () => { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); };
  const toSec = (hms) => { const [h, m, s] = hms.split(":").map(Number); return h * 3600 + m * 60 + (s || 0); };
  const fromSec = (n) => [Math.floor(n / 3600), Math.floor(n % 3600 / 60), n % 60].map(v => String(v).padStart(2, "0")).join(":");
  const dateOf = (s) => { const [d, m, y] = s.split(".").map(Number); return new Date(y, m - 1, d); };
  const stampOf = (date, time) => { const d = dateOf(date); const sec = toSec(time); d.setHours(Math.floor(sec / 3600), Math.floor(sec % 3600 / 60), sec % 60); return d; };

  const state = {
    section: "alarms", store: "s142", node: null, role: "operator",
    alarmId: null, card: false, cardTab: "why",
    treeOn: true, mediaOn: true, open: new Set(["s142", "z-pos", "z-kso", "z-scale"]), treeQ: ""
  };
  const OPERATOR = api.OPERATOR;

  /* ================= toasts (D-064): up to two visible, repeats counted ================= */
  const toasts = [];
  function toast(text, tone) {
    const same = toasts.find(x => x.text === text);
    if (same) { same.n++; clearTimeout(same.timer); }
    else toasts.unshift({ text, tone, n: 1 });
    const item = same || toasts[0];
    item.timer = setTimeout(() => { toasts.splice(toasts.indexOf(item), 1); drawToasts(); }, 3200);
    drawToasts();
  }
  function drawToasts() {
    const vis = toasts.slice(0, 2);
    $("toasts").innerHTML = vis.map(x => `<div class="toast"><span class="tile">${icon(x.tone === "ok" ? "check" : "info")}</span><span>${esc(x.text)}</span>${x.n > 1 ? `<span class="toast-x">×${x.n}</span>` : ""}</div>`).join("")
      + (toasts.length > 2 ? `<div class="toast-more">${esc(t("ещё {n}", { n: toasts.length - 2 }))}</div>` : "");
  }

  /* ================= tooltips (D-054): data-tip, 400 ms, also on keyboard focus ================= */
  let tipEl = null, tipTimer = null, tipFor = null;
  function hideTip() { clearTimeout(tipTimer); if (tipEl) tipEl.remove(); if (tipFor) tipFor.removeAttribute("aria-describedby"); tipEl = null; tipFor = null; }
  function showTip(el) {
    hideTip();
    tipTimer = setTimeout(() => {
      if (!document.body.contains(el)) return;
      tipEl = document.createElement("div");
      tipEl.className = "tip"; tipEl.id = "tip"; tipEl.setAttribute("role", "tooltip");
      tipEl.textContent = t(el.dataset.tip);
      document.body.appendChild(tipEl);
      const r = el.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.left + r.width / 2 - tipEl.offsetWidth / 2), window.innerWidth - tipEl.offsetWidth - 8);
      const top = r.bottom + 6 + tipEl.offsetHeight > window.innerHeight ? r.top - tipEl.offsetHeight - 6 : r.bottom + 6;
      tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
      tipFor = el; el.setAttribute("aria-describedby", "tip");
    }, 400);
  }
  document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (el && el !== tipFor) showTip(el); });
  document.addEventListener("mouseout", (e) => { const el = e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el && el.matches(":focus-visible")) showTip(el); });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("scroll", hideTip, true);

  /* ================= menus in the topbar ================= */
  let openMenu = null;
  function closeMenu() { if (!openMenu) return; openMenu.querySelector(".menu-pop").hidden = true; openMenu.querySelector("[aria-haspopup]").setAttribute("aria-expanded", "false"); openMenu = null; }
  document.querySelectorAll(".menu > [aria-haspopup]").forEach(btn => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const m = btn.parentElement;
    if (openMenu === m) return closeMenu();
    closeMenu();
    m.querySelector(".menu-pop").hidden = false; btn.setAttribute("aria-expanded", "true"); openMenu = m; hideTip();
  }));
  document.addEventListener("click", (e) => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    hideTip();
    if (openMenu) return closeMenu();
    if ($("pdf-modal").classList.contains("open")) return closeReport();
    if ($("dlg").classList.contains("open")) return closeDialog();
    if ($("workspace").dataset.drawer === "open") return setDrawer(false);
    if (state.card) closeCard();
  });

  /* ================= one small dialog ================= */
  function dialog(title, bodyHtml, actions) {
    $("dlg-h").textContent = title;
    $("dlg-body").innerHTML = bodyHtml;
    $("dlg-actions").innerHTML = actions.map((a, i) => `<button type="button" class="btn ${a.cls || "outline"}" data-i="${i}">${esc(a.label)}</button>`).join("");
    $("dlg-actions").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const a = actions[Number(b.dataset.i)]; if (a.run && a.run() === false) return; closeDialog(); }));
    $("dlg").classList.add("open");
    ($("dlg-body").querySelector("textarea, input, select") || $("dlg-actions").lastElementChild).focus();
  }
  function closeDialog() { $("dlg").classList.remove("open"); }
  $("dlg").addEventListener("click", (e) => { if (e.target.id === "dlg") closeDialog(); });

  /* ================= layout: sections, panels, drawer, splitters ================= */
  const ws = $("workspace");
  const PANELS = { alarms: { tree: true, media: true }, search: { tree: false, media: true }, scenarios: { tree: false, media: false }, config: { tree: false, media: false } };
  try { const s = JSON.parse(localStorage.getItem("retail-layout") || "{}"); if (s.tree) ws.style.setProperty("--tree-w", s.tree); if (s.media) ws.style.setProperty("--media-w", s.media); if (s.treeOn === false) state.treeOn = false; if (s.mediaOn === false) state.mediaOn = false; } catch (e) { /* storage blocked */ }
  function saveLayout() { try { localStorage.setItem("retail-layout", JSON.stringify({ tree: ws.style.getPropertyValue("--tree-w"), media: ws.style.getPropertyValue("--media-w"), treeOn: state.treeOn, mediaOn: state.mediaOn })); } catch (e) { /* ignore */ } }

  function applyPanels() {
    const p = PANELS[state.section];
    ws.dataset.tree = p.tree && state.treeOn ? "on" : "off";
    ws.dataset.media = p.media && state.mediaOn ? "on" : "off";
    $("toggleTree").disabled = !p.tree; $("toggleMedia").disabled = !p.media;
    $("openDrawer").disabled = !p.tree;
    $("toggleTree").setAttribute("aria-pressed", String(p.tree && state.treeOn));
    $("toggleMedia").setAttribute("aria-pressed", String(p.media && state.mediaOn));
  }
  function setSection(id) {
    state.section = id; ws.dataset.section = id;
    document.querySelectorAll(".rail-item").forEach(b => { if (b.dataset.section === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    ["alarms", "search", "scenarios", "config"].forEach(s => $("sec-" + s).classList.toggle("active", s === id));
    Retail.closePopovers(); setDrawer(false); applyPanels();
    if (id === "alarms") showAlarmMedia();
    if (id === "search") showSearchMedia();
    if (id === "config") RetailConfig.refresh();
    renderStatus();
  }
  document.querySelectorAll(".rail-item").forEach(b => b.addEventListener("click", () => setSection(b.dataset.section)));
  $("toggleTree").addEventListener("click", () => { state.treeOn = !state.treeOn; applyPanels(); saveLayout(); });
  $("toggleMedia").addEventListener("click", () => { state.mediaOn = !state.mediaOn; applyPanels(); saveLayout(); });
  function setDrawer(open) { if (open) ws.dataset.drawer = "open"; else delete ws.dataset.drawer; }
  $("openDrawer").addEventListener("click", () => setDrawer(ws.dataset.drawer !== "open"));
  $("treeClose").addEventListener("click", () => setDrawer(false));
  $("scrim").addEventListener("click", () => setDrawer(false));

  function splitter(el, prop, side, def, min, max) {
    let start = 0, w0 = 0;
    const cur = () => parseFloat(getComputedStyle(side === "left" ? $("panelTree") : $("panelMedia")).width);
    const set = (w) => { ws.style.setProperty(prop, Math.round(Math.min(max, Math.max(min, w))) + "px"); };
    el.addEventListener("pointerdown", (e) => {
      start = e.clientX; w0 = cur(); el.setPointerCapture(e.pointerId); el.classList.add("dragging"); hideTip();
      const move = (ev) => set(w0 + (side === "left" ? ev.clientX - start : start - ev.clientX));
      const up = () => { el.classList.remove("dragging"); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); saveLayout(); };
      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
    });
    el.addEventListener("dblclick", () => { ws.style.removeProperty(prop); saveLayout(); });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const d = (e.key === "ArrowRight" ? 16 : -16) * (side === "left" ? 1 : -1);
      set(cur() + d); saveLayout(); e.preventDefault();
    });
  }
  splitter($("splitTree"), "--tree-w", "left", 280, 200, 460);
  splitter($("splitMedia"), "--media-w", "right", 520, 340, 860);

  /* ================= store and tree ================= */
  function renderStores() {
    $("storeSelect").innerHTML = api.stores().map(s => `<option value="${s.id}" ${s.id === state.store ? "selected" : ""}>${esc(t(s.name))}</option>`).join("");
  }
  $("storeSelect").addEventListener("change", (e) => {
    state.store = e.target.value; state.node = null; state.open = new Set([state.store]);
    closeCard(true); renderTree(); renderAlarms(); renderStatus();
    toast(t("Магазин: {s}", { s: t(api.store(state.store).name) }));
  });

  function unviewedUnder(node) {
    const ids = api.sourcesUnder(node);
    return api.alarms({ store: state.store, date: DATE }).filter(j => !j.viewed && ids.includes(j.source)).length;
  }
  function treeMatches(node, q) { return !q || t(node.name).toLowerCase().includes(q) || (node.children || []).some(c => treeMatches(c, q)); }
  function renderTree() {
    const q = state.treeQ.trim().toLowerCase();
    const rows = [];
    (function walk(list, lvl) {
      list.forEach(n => {
        if (!treeMatches(n, q)) return;
        const kids = n.children && n.children.length;
        const open = q ? true : state.open.has(n.id);
        const nUnv = unviewedUnder(n);
        const ic = { store: "store", zone: "folder", pos: "monitor", scale: "scale", cam: "video" }[n.kind];
        const status = n.online === undefined ? "" : `<i class="status-dot" data-tone="${n.online ? "ok" : "down"}" data-tip="${esc(n.online ? t("в сети") : t("не в сети с {s}", { s: n.since || "—" }))}"></i>`;
        const selected = (state.node || state.store) === n.id;
        rows.push(`<li role="none"><button type="button" class="tree-row ${n.kind === "store" ? "root" : ""}" role="treeitem" style="--lvl:${lvl}" data-node="${n.id}" aria-selected="${selected}" ${kids ? `aria-expanded="${open}"` : ""}>
          <span class="tree-caret ${kids ? (open ? "open" : "") : "leaf"}" data-caret="${n.id}">${icon("chevron-right", "sm")}</span>
          ${icon(ic, "node")}<span class="tree-label">${esc(t(n.name))}</span>${status}
          ${nUnv ? `<span class="tree-n hot" data-tip="${esc(t("Непросмотренных тревог: {n}", { n: nUnv }))}">${nUnv}</span>` : ""}</button></li>`);
        if (kids && open) walk(n.children, lvl + 1);
      });
    })(api.tree(state.store), 0);
    $("tree").innerHTML = rows.join("") || `<li class="empty">${esc(t("Ничего не найдено"))}</li>`;
  }
  $("tree").addEventListener("click", (e) => {
    const row = e.target.closest("[data-node]");
    if (!row) return;
    const id = row.dataset.node;
    if (e.target.closest("[data-caret]") && row.hasAttribute("aria-expanded")) {
      state.open.has(id) ? state.open.delete(id) : state.open.add(id);
      return renderTree();
    }
    state.node = id === state.store ? null : id;
    if (row.hasAttribute("aria-expanded")) state.open.add(id);
    closeCard(true); renderTree(); renderAlarms(); setDrawer(false);
  });
  $("treeSearch").addEventListener("input", (e) => { state.treeQ = e.target.value; renderTree(); });
  $("treeFold").addEventListener("click", () => { state.open = new Set([state.store]); renderTree(); });

  /* ================= names ================= */
  const scenarioOf = (j) => ScenarioEditor.byId(j.sc);
  const scenarioName = (j) => { const s = scenarioOf(j); return s ? t(s.name) : t(j.scName || "Сценарий удалён"); };
  function sourceOf(id) {
    const d = Retail.deviceById(id);
    if (d) return { name: d.name, badge: d.badge, cls: d.cls, online: d.online, since: d.since, pos: true };
    const v = api.videoSource(id);
    return v ? { name: v.name, badge: "Только видео", cls: "src-video", online: true, pos: false } : { name: "—", badge: "—", cls: "src-video", pos: false };
  }
  const prioLabel = (sev) => sev === "high" ? t("высокий") : sev === "mid" ? t("средний") : t("низкий");
  function viewedBadge(j) {
    return j.viewed
      ? `<span class="rc-badge viewed" data-tip="${esc(t("Просмотрел: {by}, {at}", { by: t(j.viewed.by), at: j.viewed.at }))}"><span class="rc-dot on"></span>${esc(t("Просмотрена"))}</span>`
      : `<span class="rc-badge unviewed" data-tip="${esc(t("Ещё никто не открывал"))}">● ${esc(t("Не просмотрена"))}</span>`;
  }
  const incTag = (j) => j.incident ? `<span class="inc-tag sent" data-tip="${esc(t("Статус инцидента в Incident Manager"))}">IM · ${esc(t(j.incident))}</span>` : "";

  /* ================= video + receipt panel (shared) ================= */
  const media = { base: 0, pos: 0, playing: false, timer: null, live: false, captions: true, ctx: null, camIdx: 0 };
  function playerShow() {
    $("v-time").textContent = media.live ? t("сейчас") : fromSec(media.base + media.pos);
    $("v-range").value = media.pos; $("v-range").disabled = media.live || !media.ctx || media.ctx.noVideo;
    $("v-play").innerHTML = icon(media.playing ? "pause" : "play");
    $("v-play").setAttribute("aria-label", t(media.playing ? "Пауза" : "Воспроизвести"));
  }
  function stopPlay() { media.playing = false; clearInterval(media.timer); playerShow(); }
  $("v-play").addEventListener("click", () => {
    if (!media.ctx || media.live) return;
    if (media.playing) return stopPlay();
    media.playing = true; playerShow();
    media.timer = setInterval(() => { if (media.pos >= 30) return stopPlay(); media.pos += 1; playerShow(); }, 1000);
  });
  $("v-range").addEventListener("input", () => { media.pos = Number($("v-range").value); playerShow(); });
  $("v-back").addEventListener("click", () => { stopPlay(); media.pos = 0; setLive(false); });
  $("v-captions").addEventListener("click", () => {
    media.captions = !media.captions;
    $("v-captions").setAttribute("aria-pressed", String(media.captions));
    $("v-caption").classList.toggle("hidden", !media.captions || !media.ctx || !media.ctx.caption);
  });
  function setLive(live) {
    media.live = live; if (live) stopPlay();
    $("videoMode").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.mode === "live") === live)));
    drawFrame();
  }
  $("videoMode").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setLive(b.dataset.mode === "live"); });
  $("camStrip").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cam]"); if (!b) return;
    media.camIdx = Number(b.dataset.cam); drawFrame();
    toast(t("Ракурс: {a}. Чек и позиция сохранены", { a: t(media.ctx.cams[media.camIdx].angle) }));
  });

  function drawFrame() {
    const c = media.ctx;
    const none = $("v-none");
    if (!c) {
      $("v-scene").className = "video-scene none"; $("v-cam").textContent = "—"; $("v-caption").classList.add("hidden"); $("v-xy").classList.add("hidden");
      none.textContent = t("Выберите тревогу или результат поиска"); none.classList.remove("hidden"); $("camStrip").innerHTML = ""; playerShow(); return;
    }
    const cam = c.cams[media.camIdx] || c.cams[0];
    const offline = c.noVideo;
    $("v-scene").className = "video-scene " + (offline ? "none" : cam.scene);
    $("v-cam").textContent = t(cam.cam);
    $("v-mode").textContent = media.live ? "ONLINE" : t("АРХИВ");
    $("v-mode").classList.toggle("live", media.live);
    none.classList.toggle("hidden", !offline);
    if (offline) none.textContent = t(offline);
    const cap = media.live ? (c.liveCaption ? tx(c.liveCaption) : "") : c.caption;
    $("v-caption").innerHTML = media.live ? esc(cap).replace(/\n/g, "<br>") : (cap || "");
    $("v-caption").className = "caption" + (c.sev ? " sev-" + c.sev + "-b" : "");
    $("v-caption").classList.toggle("hidden", !media.captions || !cap || !!offline);
    const xy = $("v-xy");
    if (c.xy && !media.live) { xy.innerHTML = `${esc(t("На площадке: {x} · в чеке: {y}", { x: c.xy.x, y: c.xy.y }))}<b>${c.xy.x}:${c.xy.y}</b>`; xy.classList.remove("hidden"); }
    else xy.classList.add("hidden");
    $("camStrip").innerHTML = c.cams.length > 1 ? c.cams.map((x, i) => `<button type="button" class="chip" data-cam="${i}" aria-pressed="${i === media.camIdx}">${icon("video", "sm")}${esc(t(x.angle))}</button>`).join("") : "";
    playerShow();
  }
  function loadMedia(ctx) {
    stopPlay();
    media.ctx = ctx; media.base = ctx ? toSec(ctx.time) : 0; media.pos = 0; media.camIdx = 0;
    if (media.live) setLive(false); else drawFrame();
    $("receiptTitle").textContent = ctx ? t(ctx.panelTitle || "Чек") : t("Чек");
    $("receiptMeta").textContent = ctx && ctx.panelMeta ? ctx.panelMeta : "";
    $("receiptView").innerHTML = ctx ? ctx.panelHtml : `<div class="receipt-empty">${esc(t("Здесь появится чек выбранной тревоги или результата поиска"))}</div>`;
  }
  const player = { moment: () => fromSec(media.base), current: () => fromSec(media.base + media.pos), moved: () => media.pos !== 0 && !media.live };

  function receiptHtml(rec, words) {
    const src = sourceOf(rec.source);
    return `<div class="receipt">
        <div class="receipt-line"><span>${esc(t("Чек №{id}", { id: rec.id }))}</span><span>${rec.time}</span></div>
        <div class="receipt-line"><span>${esc(t("Кассир"))}</span><span>${markWords(t(rec.cashier), words)}</span></div>
        <div class="receipt-line"><span>${esc(t("Источник"))}</span><span class="source ${src.cls}">${esc(t(src.name))}</span></div>
        ${rec.parsed.map(([a, b]) => `<div class="receipt-line ${/АННУЛЯЦИЯ|Возврат|Расхождение|нет$/.test(a + b) ? "risk" : ""}"><span>${markWords(t(a), words)}</span><span>${esc(t(b))}</span></div>`).join("")}
      </div>`;
  }
  function markWords(text, words) {
    let out = esc(text);
    (words || []).forEach(w => [w, t(w)].forEach(x => {
      if (!x) return;
      const re = new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ЕЁ]/gi, "[ЕЁеё]"), "gi");
      out = out.replace(re, m => `<span class="hit">${m}</span>`);
    }));
    return out;
  }

  function alarmMediaCtx(j) {
    const src = sourceOf(j.source);
    const rec = j.receipt ? api.receipt(j.receipt) : null;
    const s = scenarioOf(j);
    return {
      kind: "alarm", id: j.id, time: j.time, date: j.date, sev: j.sev, xy: j.xy, cams: api.cameras(j.source),
      caption: j.caption ? esc(tx(j.caption)).replace(/\n/g, "<br>") : "",
      liveCaption: src.pos ? "КАССА СВОБОДНА\nОЖИДАНИЕ ЧЕКА" : "",
      noVideo: null,
      panelTitle: rec ? "Чек и причина" : "Причина",
      panelMeta: `${j.no} · ${j.date.slice(0, 5)} ${j.time}`,
      panelHtml: (rec ? receiptHtml(rec, []) : `<div class="receipt-empty">${esc(t(src.pos ? "Чек к тревоге не привязан: событие без закрытого чека" : "Кассового потока нет — у тревоги нет чека и титров"))}</div>`)
        + `<div class="desc-box"><div class="lbl">${esc(t("Почему сработало"))}</div><div>${esc(t(j.why))}</div></div>`
        + (s && s.desc ? `<div class="desc-box"><div class="lbl">${esc(t("Описание сценария"))}</div><div class="muted">${esc(t(s.desc))}</div></div>` : "")
    };
  }

  /* ================= ALARMS: queue ================= */
  const alarmFilter = { prio: "all", q: "", unviewed: false };
  function matchAlarm(j, q) {
    return [scenarioName(j), t(sourceOf(j.source).name), j.no, j.time].some(x => String(x).toLowerCase().includes(q));
  }
  function queue() {
    return api.alarms({ store: state.store, date: DATE, node: state.node, prio: alarmFilter.prio, q: alarmFilter.q, unviewed: alarmFilter.unviewed, keep: state.alarmId, match: matchAlarm })
      .sort((a, b) => b.time.localeCompare(a.time));
  }
  function shift() { return api.alarms({ store: state.store, date: DATE }); }
  function renderAlarms() {
    const list = queue();
    const all = shift();
    const unv = all.filter(j => !j.viewed).length;
    $("alarmCount").textContent = list.length;
    $("unviewedN").textContent = unv || "";
    $("railAlarmCount").textContent = unv; $("railAlarmCount").hidden = !unv;
    $("railAlarmCount").dataset.tip = t("Непросмотренных: {n}", { n: unv });
    const node = state.node ? api.findNode(state.store, state.node) : null;
    $("queueScope").textContent = (node ? t(node.name) + " · " : "") + t("смена {d}", { d: DATE });
    $("alarmList").innerHTML = list.map(j => {
      const src = sourceOf(j.source);
      return `<div class="alarm ${j.viewed ? "" : "unviewed"} ${j.id === state.alarmId ? "selected" : ""}" data-alarm="${j.id}" tabindex="0" role="button" aria-label="${esc(scenarioName(j))}">
        <div class="sev sev-${j.sev}" data-tip="${esc(t("Приоритет: {p}", { p: prioLabel(j.sev) }))}"></div>
        <div class="alarm-main">
          <div class="alarm-title">${icon("eye", "sm")}<span>${esc(scenarioName(j))}</span></div>
          <div class="alarm-sub">${esc(j.no)} · ${esc(t(src.name))}</div>
          <div class="alarm-tags">${viewedBadge(j)}<span class="source ${src.cls}">${esc(t(src.badge))}</span>${incTag(j)}<span class="prio-label">${esc(prioLabel(j.sev))}</span></div>
        </div>
        <div class="alarm-side"><span class="alarm-time">${j.time}</span>
          <div class="alarm-btns"><button type="button" class="btn compact outline" data-report="${j.id}" data-tip="Отчёт PDF">${icon("file-down")}</button>
          <button type="button" class="btn compact primary" data-open="${j.id}">${esc(t("Открыть"))}</button></div></div>
      </div>`;
    }).join("") || `<div class="empty">${esc(t(all.length ? "Под фильтр ничего не попало" : "Тревог за смену нет"))}</div>`;
    renderTree(); renderStatus();
  }
  let viewTimer = null;
  function selectAlarm(id, quiet) {
    state.alarmId = id;
    const j = api.alarm(id);
    document.querySelectorAll("#alarmList [data-alarm]").forEach(el => el.classList.toggle("selected", el.dataset.alarm === id));
    loadMedia(alarmMediaCtx(j));
    renderStatus();
    clearTimeout(viewTimer);
    if (!j.viewed) viewTimer = setTimeout(() => {
      if (state.alarmId !== id) return;
      api.markViewed(id, OPERATOR, nowClock());
      renderAlarms(); if (state.card) renderCard();
      if (!quiet) toast(t("Тревога отмечена просмотренной — для всех операторов"), "ok");
    }, 1000);
  }
  $("alarmList").addEventListener("click", (e) => {
    const rep = e.target.closest("[data-report]"); if (rep) { selectAlarm(rep.dataset.report, true); return reportFromAlarm(); }
    const op = e.target.closest("[data-open]"); if (op) return openCard(op.dataset.open);
    const row = e.target.closest("[data-alarm]"); if (row) selectAlarm(row.dataset.alarm);
  });
  $("alarmList").addEventListener("keydown", (e) => { const row = e.target.closest("[data-alarm]"); if (row && e.key === "Enter" && e.target === row) openCard(row.dataset.alarm); });
  $("alarmSearch").addEventListener("input", (e) => { alarmFilter.q = e.target.value; renderAlarms(); });
  $("alarmPrio").addEventListener("change", (e) => { alarmFilter.prio = e.target.value; renderAlarms(); });
  $("onlyUnviewed").addEventListener("click", () => { alarmFilter.unviewed = !alarmFilter.unviewed; $("onlyUnviewed").setAttribute("aria-pressed", String(alarmFilter.unviewed)); renderAlarms(); });
  $("markAllViewed").addEventListener("click", () => {
    const list = queue().filter(j => !j.viewed);
    if (!list.length) return toast(t("Все тревоги в фильтре уже просмотрены"));
    list.forEach(j => api.markViewed(j.id, OPERATOR, nowClock()));
    renderAlarms(); toast(t("Отмечено просмотренными: {n}", { n: list.length }), "ok");
  });
  function showAlarmMedia() {
    const j = state.alarmId ? api.alarm(state.alarmId) : null;
    loadMedia(j ? alarmMediaCtx(j) : null);
  }

  /* ================= ALARMS: card (IM work mode) ================= */
  function openCard(id) {
    selectAlarm(id);
    state.card = true; state.cardTab = "why";
    $("alarmQueue").classList.remove("active"); $("alarmCard").classList.add("active");
    renderCard(); renderStatus();
    $("alarmCard").querySelector("[data-back]").focus();
  }
  function closeCard(quiet) {
    if (!state.card) return;
    state.card = false;
    $("alarmCard").classList.remove("active"); $("alarmQueue").classList.add("active");
    renderStatus();
    if (!quiet) { const el = document.querySelector(`#alarmList [data-alarm="${state.alarmId}"]`); if (el) el.focus(); }
  }
  function renderCard() {
    const j = api.alarm(state.alarmId); if (!j) return;
    const s = scenarioOf(j), src = sourceOf(j.source);
    const tabs = [["why", "Почему сработало"], ["desc", "Описание сценария"], ["log", "Журнал", j.log.length + 1]];
    const mark = (m) => m === "!" ? `<span class="k fire">!</span>` : m === "НЕ" ? `<span class="k neg" data-tip="${esc(t("Ожидаемое событие не произошло"))}">${esc(t("НЕ"))}</span>` : `<span class="k">${esc(m)}</span>`;
    const body = {
      why: j.steps
        ? `<ol class="timeline">${j.steps.map(([tm, m, txt]) => `<li><span class="t">${esc(tm === "⏱" ? "" : tm)}</span>${mark(m)}<span>${esc(t(txt))}</span></li>`).join("")}</ol><p class="meta" style="margin-top:8px">${esc(t(j.why))}</p>`
        : `<p>${esc(t(j.why))}</p>`,
      desc: s
        ? `<table class="kv"><tbody><tr><td>${esc(t("Сценарий"))}</td><td>${s.code ? esc(s.code) + " · " : ""}${esc(t(s.name))}</td></tr>
            <tr><td>${esc(t("Описание"))}</td><td>${esc(t(s.desc || "—"))}</td></tr>
            <tr><td>${esc(t("Приоритет"))}</td><td>${esc(prioLabel(j.sev))}</td></tr></tbody></table>
           <div class="row" style="margin-top:12px"><button type="button" class="btn compact outline" data-goto-sc>${icon("workflow")}<span>${esc(t("Открыть в «Моих сценариях»"))}</span></button></div>`
        : `<p class="muted">${esc(t("Сценарий удалён — описания нет"))}</p>`,
      log: `<ol class="timeline">${[[j.time, "Тревога создана сценарием", null]].concat(j.viewed ? [[j.viewed.at, "Просмотрена: {by}", { by: t(j.viewed.by) }]] : []).concat(j.log.filter(l => !/^Просмотрена/.test(l[1])))
          .map(([tm, txt, v]) => `<li><span class="t">${esc(tm)}</span><span class="k">·</span><span>${esc(t(txt, v || undefined))}${v && v.note ? ` — «${esc(v.note)}»` : ""}</span></li>`).join("")}</ol>`
    };
    $("alarmCard").innerHTML = `
      <div class="card-h">
        <button type="button" class="icon-btn" data-back aria-label="${esc(t("К тревогам"))}" data-tip="К тревогам">${icon("arrow-left")}</button>
        <span class="card-id">${esc(j.no)}</span>${viewedBadge(j)}${incTag(j)}<span class="prio-label">${esc(t("приоритет {p}", { p: prioLabel(j.sev) }))}</span>
        <span class="grow"></span><span class="alarm-time">${j.date} ${j.time}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${esc(scenarioName(j))}</h2>
        <div class="card-place">${esc(t(api.store(j.store).name))} · ${esc(t(src.name))} <span class="source ${src.cls}">${esc(t(src.badge))}</span></div>
        <div class="tabs" role="tablist">${tabs.map(([id, label, n]) => `<button type="button" class="tab" role="tab" data-ctab="${id}" aria-selected="${state.cardTab === id}">${esc(t(label))}${n ? `<span class="n">${n}</span>` : ""}</button>`).join("")}</div>
        <div role="tabpanel">${body[state.cardTab]}</div>
      </div>
      <div class="card-actions">
        <button type="button" class="btn outline" data-back>${icon("arrow-left")}<span>${esc(t("К тревогам"))}</span></button>
        <span class="sep"></span>
        <button type="button" class="btn outline" data-card-report>${icon("file-down")}<span>${esc(t("Отчёт PDF"))}</span></button>
        <span class="grow"></span>
        <button type="button" class="btn primary" data-handoff ${j.incident ? "disabled" : ""} ${j.incident ? `data-tip="${esc(t("Уже передана: {s}", { s: t(j.incident) }))}"` : ""}>${icon("send")}<span>${esc(t("Передать в Incident Manager"))}</span></button>
      </div>`;
  }
  $("alarmCard").addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) return closeCard();
    const tab = e.target.closest("[data-ctab]"); if (tab) { state.cardTab = tab.dataset.ctab; return renderCard(); }
    if (e.target.closest("[data-card-report]")) return reportFromAlarm();
    if (e.target.closest("[data-goto-sc]")) { setSection("scenarios"); return toast(t("Сценарий открывается в редакторе по имени в списке слева")); }
    if (e.target.closest("[data-handoff]")) return handOff();
  });
  function handOff() {
    const j = api.alarm(state.alarmId);
    dialog(t("Передать в Incident Manager"), `<p class="muted">${esc(t("Тревога станет инцидентом со статусом «Новый». Дальше ею занимается Incident Manager: приём в работу, классификация, закрытие (ТЗ §9.2)."))}</p>
      <div class="form-group" style="margin-top:12px"><label for="hoNote">${esc(t("Комментарий оператора"))}</label><textarea id="hoNote" class="field" placeholder="${esc(t("Что видно на видео, что уже сделано"))}"></textarea></div>
      <p class="meta" style="margin-top:8px">${esc(j.no)} · ${esc(scenarioName(j))}</p>`, [
      { label: t("Отмена") },
      { label: t("Передать"), cls: "primary", run: () => { api.handOff(j.id, $("hoNote").value.trim(), nowClock()); renderAlarms(); renderCard(); toast(t("Передано в Incident Manager: {n}", { n: j.no }), "ok"); } }
    ]);
  }

  /* ================= SEARCH ================= */
  let mode = "scenarios";
  const picker = Retail.mountPicker($("src-picker"), { value: ["*"] });
  const period = Retail.mountPeriod($("period"), { from: Retail.at(Retail.TODAY, 8, 0, 0), to: Retail.at(Retail.TODAY, 20, 0, 0) });
  const inPeriod = (date, time) => { const p = period.get(); const d = stampOf(date, time); return d >= p.from && d <= p.to; };
  let selected = { kind: null, id: null, words: [] };

  function fillScenarioSelect() {
    const sel = $("sc-select");
    const cur = sel.value || "all";
    const { base, mine } = ScenarioEditor.list();
    sel.innerHTML = `<option value="all">${esc(t("Все сценарии"))}</option>
      <optgroup label="${esc(t("Базовые"))}">${base.map(s => `<option value="${s.id}">${esc((s.code ? s.code + " · " : "") + t(s.name))}</option>`).join("")}</optgroup>
      <optgroup label="${esc(t("Мои"))}">${mine.map(s => `<option value="${s.id}">${esc(t(s.name))}${s.on ? "" : " · " + esc(t("выключен"))}</option>`).join("")}</optgroup>
      <optgroup label="${esc(t("Удалённые, есть тревоги"))}"><option value="old-7">${esc(t("Возвраты после 22:00 (удалён)"))}</option></optgroup>`;
    sel.value = Array.from(sel.options).some(o => o.value === cur) ? cur : "all";
  }
  const sevBar = (sev) => `<div class="sev ${sev ? "sev-" + sev : "none"}"></div>`;
  function runScenarioSearch(quiet) {
    const sc = $("sc-select").value;
    const ids = picker.ids(), all = picker.get().includes("*");
    const list = api.journal().filter(j => (sc === "all" || String(j.sc) === sc) && (Retail.deviceById(j.source) ? ids.includes(j.source) : all) && inPeriod(j.date, j.time))
      .sort((a, b) => stampOf(b.date, b.time) - stampOf(a.date, a.time));
    $("result-count").textContent = t("найдено: {n}", { n: list.length });
    if (!list.length) {
      $("results").innerHTML = `<div class="empty">${esc(t("За выбранный период тревог этого сценария нет. Расширьте период (например, «7 дней») или проверьте сценарий на архиве в Моих сценариях."))}</div>`;
      if (!quiet) toast(t("Тревог не найдено"));
      return;
    }
    $("results").innerHTML = list.map(j => `<div class="result-item" data-res="${j.id}" tabindex="0">${sevBar(j.sev)}
        <div class="res-main"><div>${j.date.slice(0, 5)} ${j.time.slice(0, 5)} · ${esc(scenarioName(j))}</div>
          <div class="meta">${esc(j.no)} · ${esc(t(sourceOf(j.source).name))}</div></div>
        <div class="res-side">${viewedBadge(j)}${incTag(j)}</div></div>`).join("");
    selectResult(list.some(j => j.id === selected.id) ? selected.id : list[0].id, []);
    if (!quiet) toast(t("Найдено тревог: {n}", { n: list.length }));
  }

  /* captions: words with AND / OR (UI-7) */
  let terms = [{ text: "АННУЛЯЦИЯ", op: null }];
  const norm = (s) => String(s).toUpperCase().replace(/Ё/g, "Е");
  function groups() { const out = [[]]; terms.forEach((x, i) => { if (i && x.op === "ИЛИ") out.push([]); out[out.length - 1].push(x.text); }); return out.filter(g => g.length); }
  function renderQB() {
    const qb = $("qb");
    qb.innerHTML = terms.map((x, i) => `${i ? `<button type="button" class="qb-op ${x.op === "ИЛИ" ? "or" : ""}" data-op="${i}" data-tip="Переключить И / ИЛИ">${esc(t(x.op))}</button>` : ""}<span class="qb-chip">${/\s/.test(x.text) ? "«" + esc(x.text) + "»" : esc(x.text)}<button type="button" aria-label="${esc(t("Убрать"))}" data-rm="${i}">×</button></span>`).join("")
      + `<input id="qb-input" placeholder="${esc(t(terms.length ? "ещё слово…" : "слово или \"фраза в кавычках\", Enter"))}" aria-label="${esc(t("Текст в титрах"))}">`;
    const input = $("qb-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addTerms(input.value); }
      if (e.key === "Backspace" && !input.value && terms.length) { terms.pop(); renderQB(); $("qb-input").focus(); }
    });
    input.addEventListener("blur", () => { if (input.value.trim()) addTerms(input.value, true); });
    const g = groups(), line = $("out-mode").value === "line";
    $("qb-preview").textContent = !g.length ? t("Добавьте слово или фразу и нажмите Enter. Между словами — «И» или «ИЛИ» (по клику).")
      : t(line ? "Найдёт строки титров, где есть: " : "Найдёт чеки, где есть: ") + g.map(x => x.map(w => /\s/.test(w) ? "«" + w + "»" : w).join(" " + t("и") + " ")).join("; " + t("или") + ": ") + ". " + t("«И» связывает сильнее «ИЛИ»; регистр и ё/е не важны.");
  }
  $("qb").addEventListener("click", (e) => {
    const op = e.target.closest("[data-op]"); if (op) { const i = Number(op.dataset.op); terms[i].op = terms[i].op === "И" ? "ИЛИ" : "И"; return renderQB(); }
    const rm = e.target.closest("[data-rm]"); if (rm) { terms.splice(Number(rm.dataset.rm), 1); if (terms[0]) terms[0].op = null; return renderQB(); }
    if (e.target.id === "qb") $("qb-input").focus();
  });
  function addTerms(raw, noFocus) {
    let next = "И";
    (raw.match(/"[^"]+"|«[^»]+»|\S+/g) || []).forEach(tok => {
      const up = norm(tok);
      if (up === "И" || up === "AND") { next = "И"; return; }
      if (up === "ИЛИ" || up === "OR") { next = "ИЛИ"; return; }
      terms.push({ text: tok.replace(/^["«]|["»]$/g, ""), op: terms.length ? next : null });
      next = "И";
    });
    renderQB();
    if (!noFocus) $("qb-input").focus();
  }
  /* receipt lines as [original, shown]: a word matches either the receipt text or its translation */
  function receiptPairs(r) {
    return [["Кассир: " + r.cashier, t("Кассир") + ": " + t(r.cashier)]]
      .concat(r.text.split("\n").map(l => [l, t(l)])).concat(r.parsed.map(p => [p[0], t(p[0])]));
  }
  const receiptLines = (r) => receiptPairs(r).reduce((a, p) => a.concat(p), []);
  function matchReceipt(r) {
    if ($("re-toggle").checked) {
      let re; try { re = new RegExp($("re-input").value, "i"); } catch (e) { return null; }
      const hit = receiptPairs(r).filter(p => re.test(p[0]) || re.test(p[1])).map(p => p[0]);
      return hit.length ? { lines: hit } : null;
    }
    const g = groups(); if (!g.length) return null;
    const lines = receiptPairs(r);
    const has = (line, w) => norm(line[0]).includes(norm(w)) || norm(line[1]).includes(norm(t(w)));
    const byLine = $("out-mode").value === "line";
    for (const grp of g) {
      if (byLine) { const hit = lines.filter(l => grp.every(w => has(l, w))); if (hit.length) return { lines: hit.map(l => l[0]), words: grp }; }
      else if (grp.every(w => lines.some(l => has(l, w)))) return { lines: lines.filter(l => grp.some(w => has(l, w))).map(l => l[0]), words: grp };
    }
    return null;
  }
  let lastWords = {};
  function runCaptionSearch(quiet) {
    if ($("re-toggle").checked) { try { new RegExp($("re-input").value); } catch (e) { toast(t("Ошибка в регулярном выражении")); return; } }
    const ids = picker.ids();
    const found = api.receipts().map(r => ({ r, m: ids.includes(r.source) && inPeriod(DATE, r.time) ? matchReceipt(r) : null })).filter(x => x.m);
    lastWords = {}; found.forEach(({ r, m }) => { lastWords[r.id] = m.words || []; });
    $("result-count").textContent = t("найдено: {n}", { n: found.length });
    $("results").innerHTML = found.map(({ r, m }) => `<div class="result-item" data-res="${r.id}" tabindex="0">${sevBar(r.sev)}
        <div class="res-main"><div>${r.time} · ${esc(t("чек №{id}", { id: r.id }))} · ${esc(t(r.status))}</div>
          <div class="meta">${esc(t(sourceOf(r.source).name))} · ${esc(t(r.cashier))}</div>
          <div class="snippet">${m.lines.slice(0, 3).map(l => markWords(t(l), m.words)).join(" · ")}</div></div>
        <div class="res-side"><span class="source ${sourceOf(r.source).cls}">${esc(t(sourceOf(r.source).badge))}</span></div></div>`).join("")
      || `<div class="empty">${esc(t("Совпадений нет. Проверьте устройства и период или замените «И» на «ИЛИ»."))}</div>`;
    if (found[0]) selectResult(found.some(x => x.r.id === selected.id) ? selected.id : found[0].r.id, lastWords[found[0].r.id]);
    if (!quiet) toast(t("Найдено в титрах: {n}", { n: found.length }));
  }

  function reportParams() {
    const type = $("report-type").value;
    const f = (label, value) => `<div class="form-group"><label>${esc(t(label))}</label><input class="field" value="${esc(value)}"></div>`;
    const map = { all: "", returns: "", scale: "", number: f("Номер чека", "48288"), cashier: f("Кассир", "Сидорова М."), sku: f("Артикул / товар", t("МОЛОКО")), and: f("Товар 1", t("Хлеб")) + f("Товар 2", t("Молоко")), amount: f("Сумма от", "400") };
    $("report-params").innerHTML = map[type];
    $("report-params").hidden = mode !== "receipts" || !map[type];
  }
  const blob = (r) => receiptLines(r).join("\n").toUpperCase();
  function runReceiptSearch(quiet) {
    const type = $("report-type").value, ids = picker.ids();
    let list = api.receipts().filter(r => ids.includes(r.source) && inPeriod(DATE, r.time));
    if (type === "number") list = list.filter(r => r.id === "48288");
    if (type === "cashier") list = list.filter(r => r.cashier.includes("Сидорова"));
    if (type === "sku") list = list.filter(r => /МОЛОКО|MILK/.test(blob(r)));
    if (type === "returns") list = list.filter(r => /АННУЛЯЦИЯ|ВОЗВРАТ|VOID|RETURN/.test(blob(r)));
    if (type === "scale") list = list.filter(r => Retail.deviceById(r.source).group === "scale");
    if (type === "and") list = list.filter(r => /ХЛЕБ|BREAD/.test(blob(r)) && /МОЛОКО|MILK/.test(blob(r)));
    if (type === "amount") list = list.filter(r => parseFloat(r.total.replace(/\s/g, "").replace(",", ".")) >= 400);
    $("result-count").textContent = t("найдено: {n}", { n: list.length });
    $("results").innerHTML = list.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>${esc(t("Время"))}</th><th>${esc(t("Чек"))}</th><th>${esc(t("Кассир"))}</th><th>${esc(t("Сумма"))}</th><th>${esc(t("Источник"))}</th></tr></thead>
        <tbody>${list.map(r => { const src = sourceOf(r.source); return `<tr class="clickable" data-res="${r.id}" tabindex="0"><td>${r.time}</td><td>№${r.id}</td><td>${esc(t(r.cashier))}</td><td>${r.total}</td>
          <td><span class="source ${src.cls}">${esc(t(src.name))}</span></td></tr>`; }).join("")}</tbody></table></div>`
      : `<div class="empty">${esc(t("Чеков не найдено. Проверьте устройства и период."))}</div>`;
    if (list[0]) selectResult(list.some(r => r.id === selected.id) ? selected.id : list[0].id, []);
    if (!quiet) toast(t("Отчёт построен: {n} чек.", { n: list.length }));
  }

  function receiptMediaCtx(rec, words) {
    const src = sourceOf(rec.source);
    return {
      kind: mode, id: rec.id, time: rec.time, date: DATE, sev: rec.sev, cams: api.cameras(rec.source),
      caption: markWords(tx(rec.text), words).replace(/\n/g, "<br>"), liveCaption: "КАССА СВОБОДНА\nОЖИДАНИЕ ЧЕКА",
      noVideo: src.online === false && rec.source === "scale-saus" ? "Архива нет: весы не в сети с 12:15" : null,
      panelTitle: "Разбор чека", panelMeta: `№${rec.id} · ${rec.time}`, panelHtml: receiptHtml(rec, words)
    };
  }
  function selectResult(id, words) {
    selected = { kind: mode, id, words: words || [] };
    document.querySelectorAll("#results [data-res]").forEach(el => el.classList.toggle("selected", el.dataset.res === id));
    if (mode === "scenarios") loadMedia(alarmMediaCtx(api.alarm(id)));
    else loadMedia(receiptMediaCtx(api.receipt(id), selected.words));
    renderStatus();
  }
  $("results").addEventListener("click", (e) => {
    const row = e.target.closest("[data-res]"); if (!row) return;
    selectResult(row.dataset.res, mode === "captions" ? lastWords[row.dataset.res] : []);
    if (mode !== "scenarios") toast(t("Архив перемотан к титру"));
  });
  $("results").addEventListener("keydown", (e) => { const row = e.target.closest("[data-res]"); if (row && e.key === "Enter") row.click(); });
  function showSearchMedia() {
    if (!selected.id || selected.kind !== mode) return loadMedia(null);
    if (mode === "scenarios") loadMedia(alarmMediaCtx(api.alarm(selected.id)));
    else loadMedia(receiptMediaCtx(api.receipt(selected.id), selected.words));
  }

  function runSearch(quiet) {
    if (!picker.ids().length) { toast(t("Выберите хотя бы одно устройство")); return; }
    if (mode === "scenarios") runScenarioSearch(quiet);
    else if (mode === "captions") runCaptionSearch(quiet);
    else runReceiptSearch(quiet);
  }
  function setMode(m, quiet) {
    mode = m;
    document.querySelectorAll("#sec-search [data-mode]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
    document.querySelectorAll("#sec-search [data-q]").forEach(el => { el.hidden = el.dataset.q !== m; });
    reportParams(); renderTemplates(); runSearch(quiet);
  }
  document.querySelectorAll("#sec-search .tab[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("run-search").addEventListener("click", () => runSearch());
  $("report-type").addEventListener("change", reportParams);
  $("out-mode").addEventListener("change", renderQB);
  $("re-toggle").addEventListener("change", (e) => {
    $("qb").classList.toggle("hidden", e.target.checked); $("qb-preview").classList.toggle("hidden", e.target.checked);
    $("re-input").classList.toggle("hidden", !e.target.checked);
  });

  /* saved search templates (UI-11) */
  const MODE_ICON = { scenarios: "workflow", captions: "type", receipts: "receipt" };
  function renderTemplates() {
    $("tpl-row").innerHTML = `<span class="lbl">${esc(t("Шаблоны:"))}</span>` + api.templates().map(s =>
      `<button type="button" class="chip" data-tpl="${s.id}" aria-pressed="false" data-tip="${esc(t(s.shared ? "Общий шаблон" : "Мой шаблон"))}">${icon(MODE_ICON[s.mode], "sm")}${esc(t(s.name))}${s.shared ? `<span class="n">· ${esc(t("общий"))}</span>` : ""}</button>`).join("");
  }
  $("tpl-row").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tpl]"); if (!b) return;
    const s = api.templates().find(x => x.id === b.dataset.tpl);
    picker.set(s.p.srcs || ["*"]);
    if (s.p.week) period.set(Retail.at(Retail.TODAY, 0, 0, 0, -6), Retail.at(Retail.TODAY, 23, 59, 59));
    else if (s.p.from) period.set(new Date(s.p.from), new Date(s.p.to));
    if (s.p.terms) { terms = JSON.parse(JSON.stringify(s.p.terms)); $("re-toggle").checked = false; $("re-toggle").dispatchEvent(new Event("change")); renderQB(); }
    if (s.p.report) $("report-type").value = s.p.report;
    if (s.p.sc) $("sc-select").value = s.p.sc;
    setMode(s.mode, true);
    toast(t("Применён шаблон «{n}»", { n: t(s.name) }));
  });
  $("save-tpl-btn").addEventListener("click", () => { $("save-tpl").hidden = false; $("tpl-name").focus(); });
  $("tpl-cancel").addEventListener("click", () => { $("save-tpl").hidden = true; });
  $("tpl-ok").addEventListener("click", () => {
    const name = $("tpl-name").value.trim();
    if (!name) { $("tpl-name").classList.add("rc-invalid"); toast(t("Укажите название шаблона")); return; }
    const p = period.get();
    api.saveTemplate({ id: "st" + Date.now(), name, mode, shared: $("tpl-shared").checked,
      p: { srcs: picker.get(), from: +p.from, to: +p.to, terms: JSON.parse(JSON.stringify(terms)), report: $("report-type").value, sc: $("sc-select").value } });
    $("save-tpl").hidden = true; $("tpl-name").value = "";
    renderTemplates(); toast(t("Шаблон «{n}» сохранён", { n: name }), "ok");
  });

  /* ================= PDF report (UI-9) ================= */
  let report = null;
  function reportFromAlarm() {
    const j = state.alarmId && api.alarm(state.alarmId);
    if (!j) return toast(t("Сначала выберите тревогу"));
    openReport(alarmReportCtx(j, "alert"));
  }
  function reportFromSearch() {
    if (!selected.id) return toast(t("Сначала выберите результат поиска"));
    if (mode === "scenarios") return openReport(alarmReportCtx(api.alarm(selected.id), "scenario"));
    const rec = api.receipt(selected.id), src = sourceOf(rec.source), cam = api.cameras(rec.source)[media.camIdx] || api.cameras(rec.source)[0];
    const title = mode === "captions"
      ? ($("re-toggle").checked ? $("re-input").value : groups().map(g => g.join(" " + t("И") + " ")).join(" " + t("ИЛИ") + " "))
      : $("report-type").selectedOptions[0].textContent;
    openReport({ kind: mode, title, desc: "", scene: cam.scene, cam: cam.cam, date: DATE, receipt: rec, words: selected.words,
      rows: [["Магазин", t(api.store(state.store).name)], ["Касса / камера", `${t(src.name)} · ${t(cam.cam)}`], ["Чек", "№" + rec.id], ["Кассир", t(rec.cashier)], ["Режим поиска", mode === "captions" ? t("По титрам") : t("По чекам")]] });
  }
  function alarmReportCtx(j, kind) {
    const src = sourceOf(j.source), s = scenarioOf(j), cams = api.cameras(j.source), cam = cams[media.camIdx] || cams[0];
    const rec = j.receipt ? api.receipt(j.receipt) : null;
    return { kind, alarm: j.id, title: scenarioName(j), desc: s ? t(s.desc || "") : "", scene: cam.scene, cam: cam.cam, date: j.date, receipt: rec, words: [], xy: j.xy,
      rows: [["Магазин", t(api.store(j.store).name)], ["Касса / камера", `${t(src.name)} · ${t(cam.cam)}`], ["Тревога №", j.no], ["Приоритет", prioLabel(j.sev)],
        ["Сценарий", (s && s.code ? s.code + " · " : "") + scenarioName(j)], ["Кассир", rec ? t(rec.cashier) : "—"],
        ["Просмотр", j.viewed ? t("Просмотрел: {by}, {at}", { by: t(j.viewed.by), at: j.viewed.at }) : t("Не просмотрена")], ["Инцидент", j.incident ? t(j.incident) : t("не передана")]] };
  }
  function openReport(ctx) {
    report = Object.assign(ctx, { frame: "moment", withReceipt: !!ctx.receipt });
    const moved = player.moved();
    $("pdf-h").textContent = t("Отчёт PDF");
    $("pdf-opts").innerHTML = `
      <div class="lbl">${esc(t("Кадр с камеры"))}</div>
      <label class="opt"><input type="radio" name="frame" value="moment" checked><span>${esc(t("Момент срабатывания"))} · ${player.moment()}</span></label>
      <label class="opt"><input type="radio" name="frame" value="current" ${moved ? "" : "disabled"}><span>${esc(t("Текущий кадр на паузе"))} · ${player.current()}${moved ? "" : `<br><span class="meta">${esc(t("Остановите видео на нужном кадре — и выберите этот пункт"))}</span>`}</span></label>
      <div class="lbl" style="margin-top:8px">${esc(t("Состав"))}</div>
      <label class="opt"><input type="checkbox" id="pdf-receipt" ${ctx.receipt ? "checked" : "disabled"}><span>${esc(t("Текст чека"))}${ctx.receipt ? "" : ` · ${esc(t("чека нет"))}`}</span></label>`;
    $("pdf-audit").textContent = t("Формирование отчёта записывается в журнал аудита. Платёжные реквизиты в отчёт не попадают.");
    $("pdf-close").textContent = t("Закрыть");
    $("pdf-print").textContent = t("Сохранить PDF");
    document.querySelectorAll('#pdf-opts input[name="frame"]').forEach(r => r.addEventListener("change", () => { report.frame = r.value; renderSheet(); }));
    $("pdf-receipt").addEventListener("change", (e) => { report.withReceipt = e.target.checked; renderSheet(); });
    renderSheet();
    $("pdf-modal").classList.add("open");
    $("pdf-print").focus();
  }
  function renderSheet() {
    const r = report;
    const time = r.frame === "current" ? player.current() : player.moment();
    const rec = r.withReceipt ? r.receipt : null;
    let marked = rec ? tx(rec.text).split("\n").map(l => esc(l)).join("\n") : "";
    (r.words || []).forEach(w => { const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ЕЁ]/gi, "[ЕЁеё]"), "gi"); marked = marked.replace(re, m => `<mark>${m}</mark>`); });
    const kindTitle = { alert: "Отчёт по тревоге", scenario: "Отчёт · поиск по сценариям", captions: "Отчёт · поиск по титрам", receipts: "Отчёт · поиск по чекам" }[r.kind];
    $("pdf-sheet").innerHTML = `
      <div class="pdf-brand"><span>${esc(t("Интеллект X · Ритейл"))}</span><span>${esc(t(kindTitle))}</span></div>
      <h1>${esc(r.title)}</h1>
      ${r.desc ? `<p class="pdf-desc">${esc(r.desc)}</p>` : ""}
      <div class="pdf-frame"><div class="video-scene ${r.scene}"></div><div class="ov cam-tag">${esc(t(r.cam))}</div>
        ${r.xy ? `<div class="ov xy-overlay">${esc(t("На площадке: {x} · в чеке: {y}", { x: r.xy.x, y: r.xy.y }))}<b>${r.xy.x}:${r.xy.y}</b></div>` : ""}
        <div class="stamp">${r.date} ${time}</div></div>
      <div class="pdf-cap">${esc(r.frame === "current" ? t("Кадр выбран оператором на паузе") : t("Кадр в момент срабатывания"))}</div>
      ${rec ? `<h3>${esc(t("Чек №{id}", { id: rec.id }))}</h3><div class="pdf-receipt">${marked}</div>` : ""}
      <h3>${esc(t("Сведения"))}</h3>
      <table>${r.rows.concat([["Дата и время кадра", `${r.date} ${time}`]]).map(([k, v]) => `<tr><td>${esc(t(k))}</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <div class="pdf-foot">${esc(t("Сформировал: {who}, {when}", { who: t(OPERATOR), when: "11.11.2026 " + nowClock() }))}</div>`;
  }
  function closeReport() { $("pdf-modal").classList.remove("open"); }
  $("pdf-close").addEventListener("click", closeReport);
  $("pdf-print").addEventListener("click", () => {
    if (report.alarm) { api.logReport(report.alarm, nowClock()); if (state.card) renderCard(); }
    toast(t("Откроется печать — выберите «Сохранить как PDF»")); setTimeout(() => window.print(), 50);
  });
  $("pdf-modal").addEventListener("click", (e) => { if (e.target.id === "pdf-modal") closeReport(); });
  $("reportBtn").addEventListener("click", () => (state.section === "search" ? reportFromSearch() : reportFromAlarm()));

  /* ================= user, help, clock, status ================= */
  document.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => {
    state.role = b.dataset.role;
    document.querySelectorAll("[data-role]").forEach(x => x.setAttribute("aria-checked", String(x === b)));
    $("roleLabel").textContent = t(state.role === "admin" ? "Администратор" : "Оператор");
    $("dutyBadge").classList.toggle("admin", state.role === "admin");
    closeMenu(); RetailConfig.refresh();
    toast(t(state.role === "admin" ? "Роль: администратор — в «Конфигурации» доступна правка" : "Роль: оператор — «Конфигурация» только для просмотра"));
  }));
  $("signOutBtn").addEventListener("click", () => { closeMenu(); toast(t("В прототипе выход не выполняется")); });
  document.querySelectorAll("[data-help]").forEach(b => b.addEventListener("click", () => {
    closeMenu();
    const k = b.dataset.help;
    if (k === "config") return setSection("config");
    if (k === "legend") return dialog(t("Как читать тревогу"), `<table class="kv"><tbody>
        <tr><td><span class="sev sev-high" style="display:inline-block;width:4px;height:18px"></span> <span class="sev sev-mid" style="display:inline-block;width:4px;height:18px"></span> <span class="sev sev-low" style="display:inline-block;width:4px;height:18px"></span></td><td>${esc(t("Полоса слева — приоритет: высокий, средний, низкий"))}</td></tr>
        <tr><td><span class="rc-badge unviewed">● ${esc(t("Не просмотрена"))}</span></td><td>${esc(t("Тревогу ещё никто не открыл. Достаточно открыть на 1 секунду — статус меняется у всех операторов"))}</td></tr>
        <tr><td><span class="rc-badge viewed"><span class="rc-dot on"></span>${esc(t("Просмотрена"))}</span></td><td>${esc(t("Кто и когда открыл — во всплывающей подсказке"))}</td></tr>
        <tr><td><span class="inc-tag sent">IM · ${esc(t("Новый"))}</span></td><td>${esc(t("Тревога передана в Incident Manager, рядом — статус инцидента"))}</td></tr></tbody></table>`, [{ label: t("Закрыть"), cls: "primary" }]);
    return dialog(t("О прототипе"), `<p>${esc(t("Прототип v5 от 11.11.2026: каркас Incident Manager, замечания менеджера от 08.11, выбор языка, обновлённая дизайн-система ONE PSIM и закладка «Конфигурация»."))}</p>
      <p class="meta" style="margin-top:8px">${esc(t("Описание — Specification/2026-11-11 Переработка интерфейса по образцу IM.md"))}</p>`, [{ label: t("Закрыть"), cls: "primary" }]);
  }));
  function tick() { $("clock").textContent = nowClock(); }
  setInterval(tick, 1000); tick();

  function renderStatus() {
    const st = api.store(state.store);
    $("stStore").innerHTML = `<b>${esc(t(st.short))}</b> · ${esc(t("смена {d} {s}", { d: DATE, s: st.shift }))}`;
    const all = shift(), unv = all.filter(j => !j.viewed).length;
    $("stQueue").innerHTML = esc(t("Тревог за смену: {n} · не просмотрено: {u}", { n: all.length, u: unv }));
    let sel = "";
    if (state.section === "alarms" && state.alarmId) { const j = api.alarm(state.alarmId); sel = `${j.no} · ${scenarioName(j)}${state.card ? " · " + t("карточка") : ""}`; }
    if (state.section === "search" && selected.id) sel = mode === "scenarios" ? api.alarm(selected.id).no : t("чек №{id}", { id: selected.id });
    $("stSel").textContent = sel;
    const off = state.store === "s142" ? Retail.DEVICES.filter(d => !d.online).length : 0;
    $("stDevices").innerHTML = off ? `${esc(t("Не в сети: {n}", { n: off }))} · <button type="button" class="link-btn" id="stDiag">${esc(t("состояние"))}</button>` : esc(t("Все источники в сети"));
    const d = $("stDiag"); if (d) d.addEventListener("click", () => { setSection("config"); RetailConfig.open("diagnostics"); });
  }

  /* ================= language and start ================= */
  window.onRetailLang = function () {
    renderStores(); picker.refresh(); period.refresh(); fillScenarioSelect(); renderQB(); renderTemplates();
    ScenarioEditor.refresh(); RetailConfig.refresh();
    $("roleLabel").textContent = t(state.role === "admin" ? "Администратор" : "Оператор");
    renderAlarms(); if (state.card) renderCard();
    runSearch(true);
    if (state.section === "alarms") showAlarmMedia(); else if (state.section === "search") showSearchMedia();
    renderStatus();
  };

  ScenarioEditor.mount($("scenario-editor"), { toast, onChange: () => { fillScenarioSelect(); renderAlarms(); RetailConfig.refresh(); } });
  RetailConfig.mount({ nav: $("cfgNav"), body: $("cfgBody"), banner: $("cfgBanner") }, { toast, role: () => state.role });
  renderStores(); renderTree();
  RetailI18n.bindChrome();
  setSection("alarms");
})();
