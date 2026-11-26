/* എന്റെ കണക്ക് — personal ledger PWA. All data stays on this phone (IndexedDB). */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const pad = (n) => String(n).padStart(2, "0");
  const MONTHS = ["ജനുവരി", "ഫെബ്രുവരി", "മാർച്ച്", "ഏപ്രിൽ", "മേയ്", "ജൂൺ", "ജൂലൈ", "ഓഗസ്റ്റ്", "സെപ്റ്റംബർ", "ഒക്ടോബർ", "നവംബർ", "ഡിസംബർ"];
  const MS = ["ജനു", "ഫെബ്രു", "മാർ", "ഏപ്രി", "മേയ്", "ജൂൺ", "ജൂലൈ", "ഓഗ", "സെപ്", "ഒക്ടോ", "നവം", "ഡിസം"];
  const isoOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayIso = () => isoOf(new Date());
  const addMonths = (ym, k) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + k, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
  const monthDiff = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  const mLabel = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(0, 4);
  const mShort = (ym) => MS[Number(ym.slice(5, 7)) - 1];
  const dLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return d + " " + MS[m - 1] + (y !== new Date().getFullYear() ? " " + y : ""); };
  const daysIn = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
  const money = (n) => { n = Number(n) || 0; return (n < 0 ? "-" : "") + "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }); };
  const compact = (n) => { n = Math.abs(Number(n) || 0); return n >= 10000000 ? +(n / 10000000).toFixed(1) + "Cr" : n >= 100000 ? +(n / 100000).toFixed(1) + "L" : n >= 1000 ? +(n / 1000).toFixed(1) + "k" : String(Math.round(n)); };
  const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const num = (v) => { const n = parseFloat(String(v).replace(/,/g, "")); return isFinite(n) ? n : 0; };
  const norm = (s) => clean(s).toLowerCase();

  const ICON = {
    chit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M17 14.2c2.6.2 4.5 2.3 4.5 5"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.2"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    half: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
  };

  /* ---------- state & storage ---------- */
  const DEF_CATS = {
    out: ["പെട്രോൾ", "വീട്ടുചെലവ്", "ഭക്ഷണം", "മൊബൈൽ / ഇന്റർനെറ്റ്", "വൈദ്യുതി / വെള്ളം", "മരുന്ന്", "യാത്ര", "ചിട്ടി", "മറ്റുള്ളവ"],
    in: ["ശമ്പളം / വരുമാനം", "കച്ചവടം", "ചിട്ടി", "മറ്റുള്ളവ"]
  };
  const freshState = () => ({
    v: 1, chits: [], tx: [], dues: [],
    cats: { out: DEF_CATS.out.slice(), in: DEF_CATS.in.slice() },
    settings: { theme: "auto", pin: "", lastBackup: "" },
    ui: { tab: "chit", chitId: null, chitMonth: 0, chitView: "month", txMonth: todayIso().slice(0, 7), txCat: "all", txType: "all", range: "month", catSel: "", duesDir: "all", duesShowDone: false }
  });
  let state = freshState();
  let timer = null, dbp = null;
  const idb = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("no idb"));
    const r = indexedDB.open("kanakku", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tmo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  async function idbGet(k) { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function idbSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
  function adopt(saved) {
    const base = freshState();
    state = Object.assign(base, saved);
    state.settings = Object.assign(base.settings, saved.settings || {});
    state.ui = Object.assign(base.ui, saved.ui || {});
    state.cats = Object.assign(base.cats, saved.cats || {});
    ["chits", "tx", "dues"].forEach((k) => { if (!Array.isArray(state[k])) state[k] = []; });
  }
  async function load() {
    let saved = null;
    try { saved = await tmo(idbGet("state"), 3000); } catch (e) { /* fall back */ }
    if (!saved) { try { const r = localStorage.getItem("kk_state"); if (r) saved = JSON.parse(r); } catch (e) { /* ignore */ } }
    if (saved && typeof saved === "object") adopt(saved);
    state.ui.txMonth = todayIso().slice(0, 7);
  }
  const persist = () => { clearTimeout(timer); timer = setTimeout(persistNow, 200); };
  async function persistNow() {
    clearTimeout(timer);
    try { await tmo(idbSet("state", JSON.parse(JSON.stringify(state))), 4000); }
    catch (e) { try { localStorage.setItem("kk_state", JSON.stringify(state)); } catch (e2) { /* full */ } }
  }

  /* ---------- toast & sheet ---------- */
  let toastT = null;
  function toast(msg, isErr) {
    const el = $("#toast"); el.textContent = msg; el.className = "toast" + (isErr ? " error" : ""); el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3000);
  }
  let sheet = null;
  function openSheet(o) {
    sheet = o; drawSheet();
    const f = $("#sheetRoot input:not([type=hidden]), #sheetRoot select, #sheetRoot textarea");
    if (f && o.focus !== false) setTimeout(() => f.focus(), 80);
  }
  function closeSheet() { sheet = null; drawSheet(); }
  function drawSheet() {
    const r = $("#sheetRoot");
    if (!sheet) { r.innerHTML = ""; return; }
    r.innerHTML = '<div class="overlay" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><h2>' + esc(sheet.title) + "</h2>" + sheet.body +
      '<p id="sheetErr" class="err" hidden></p>' +
      (sheet.noActions ? "" : '<div class="actions"><button type="button" class="btn ghost" data-act="sheet-cancel">' + esc(sheet.cancel || "റദ്ദാക്കുക") + '</button>' +
        (sheet.extra || "") + '<button type="button" class="btn ' + (sheet.okClass || "teal") + '" data-act="sheet-ok">' + esc(sheet.ok || "സേവ്") + "</button></div>") + "</div></div>";
  }
  const sv = (id) => { const e = document.getElementById("sf_" + id); return e ? (e.type === "checkbox" ? e.checked : e.value) : ""; };
  function sheetErr(m) { const e = $("#sheetErr"); if (e) { e.textContent = m; e.hidden = false; } return false; }
  function confirmBox(title, text, ok, fn, danger) {
    openSheet({ title, body: '<p class="muted" style="margin:0">' + esc(text) + "</p>", ok, okClass: danger === false ? "teal" : "danger", focus: false, onOk: fn });
  }

  /* =====================================================================
     CHIT (ചിട്ടി)
     ===================================================================== */
  const getChit = (id) => state.chits.find((c) => c.id === id) || null;
  const cellKey = (mid, i) => mid + "|" + i;
  const cellOf = (c, mid, i) => c.cells[cellKey(mid, i)] || null;
  const paidOf = (c, x) => (x && x.s === "paid" ? (x.amt != null ? x.amt : c.amount) : 0);
  const curIdx = (c) => Math.max(0, Math.min(c.months - 1, monthDiff(c.start, todayIso().slice(0, 7))));
  const chitMonth = (c, i) => addMonths(c.start, i);
  function monthStat(c, i) {
    let paid = 0, miss = 0, pend = 0, coll = 0;
    c.members.forEach((m) => {
      const x = cellOf(c, m.id, i);
      if (!x) pend++; else if (x.s === "miss") miss++; else { paid++; coll += paidOf(c, x); }
    });
    return { paid, miss, pend, coll, exp: c.members.length * c.amount };
  }
  function memberStat(c, mid) {
    let paid = 0, miss = 0, due = 0, total = 0;
    const cur = curIdx(c), started = monthDiff(c.start, todayIso().slice(0, 7)) >= 0;
    for (let i = 0; i < c.months; i++) {
      const x = cellOf(c, mid, i);
      if (x && x.s === "paid") { paid++; total += paidOf(c, x); }
      if (x && x.s === "miss") miss++;
      if (started && i <= cur) due += Math.max(0, c.amount - paidOf(c, x));
    }
    return { paid, miss, due, total };
  }
  const tickClass = (c, x) => !x ? "" : x.s === "miss" ? "miss" : (paidOf(c, x) < c.amount ? "part" : "paid");
  const tickIcon = (c, x) => !x ? ICON.check : x.s === "miss" ? ICON.x : (paidOf(c, x) < c.amount ? ICON.half : ICON.check);

  function chitTab() {
    const c = state.ui.chitId ? getChit(state.ui.chitId) : null;
    return c ? chitDetail(c) : chitList();
  }

  function chitList() {
    let h = "";
    if (!state.chits.length) {
      h += '<div class="card empty"><b>ചിട്ടി ഒന്നും ചേർത്തിട്ടില്ല</b>താഴെയുള്ള + അമർത്തി ആദ്യത്തെ ചിട്ടി ഉണ്ടാക്കുക. അംഗങ്ങളുടെ പേരും പ്രതിമാസ തുകയും നൽകിയാൽ മതി.</div>';
    }
    state.chits.forEach((c) => {
      const ci = curIdx(c), st = monthStat(c, ci);
      const started = monthDiff(c.start, todayIso().slice(0, 7)) >= 0;
      const got = c.got && c.got[ci] && c.members.find((m) => m.id === c.got[ci].mid);
      h += '<button type="button" class="chit-card" data-act="open-chit" data-id="' + c.id + '">' +
        '<div class="row between"><h3 class="trunc">' + esc(c.name) + '</h3><span class="tag gold num">' + money(c.amount) + " / മാസം</span></div>" +
        '<div class="muted small" style="margin-top:2px">' + c.members.length + " അംഗങ്ങൾ • " + esc(mLabel(c.start)) + " മുതൽ " + c.months + " മാസം</div>" +
        '<div class="row between" style="margin-top:10px"><div><div class="small muted">' + (started ? esc(mLabel(chitMonth(c, ci))) + " — കിട്ടിയത്" : "തുടങ്ങിയിട്ടില്ല") + '</div><div class="num" style="font-weight:800;font-size:1.2rem">' + money(st.coll) + ' <span class="muted small" style="font-weight:600">/ ' + money(st.exp) + "</span></div></div>" +
        '<div style="text-align:right">' + (st.pend + st.miss ? '<span class="tag neg">' + (st.pend + st.miss) + " പേർ ബാക്കി</span>" : '<span class="tag pos">എല്ലാവരും അടച്ചു</span>') + (got ? '<div class="small muted" style="margin-top:4px">എടുത്തത്: ' + esc(got.name) + "</div>" : "") + "</div></div>" +
        '<div class="prog" aria-hidden="true">' + Array.from({ length: c.months }, (_, i) => '<i class="' + (i < ci ? "done" : i === ci && started ? "now" : "") + '"></i>').join("") + "</div></button>";
    });
    return h + '<button type="button" class="fab" data-act="new-chit" aria-label="പുതിയ ചിട്ടി">' + ICON.plus + "</button>";
  }

  function chitDetail(c) {
    const ui = state.ui, ci = curIdx(c);
    if (ui.chitMonth == null || ui.chitMonth >= c.months || ui.chitMonth < 0) ui.chitMonth = ci;
    const mi = ui.chitMonth, st = monthStat(c, mi);
    let h = '<div class="row between" style="margin-bottom:10px"><button type="button" class="btn ghost sm" data-act="back-chits">' + ICON.left.replace("<svg", '<svg width="16" height="16"') + ' ചിട്ടികൾ</button><div class="row"><button type="button" class="btn ghost sm" data-act="chit-members">അംഗങ്ങൾ</button><button type="button" class="icon-btn" data-act="edit-chit" aria-label="ചിട്ടി എഡിറ്റ്" style="width:34px;height:34px">' + ICON.dots + "</button></div></div>";
    h += '<div class="hero"><div class="lbl">' + esc(c.name) + " • " + money(c.amount) + " / മാസം • " + c.members.length + ' അംഗങ്ങൾ</div><div class="big num">' + money(st.coll) + ' <span style="font-size:1rem;opacity:.7;font-weight:600">/ ' + money(st.exp) + '</span></div><div class="lbl">' + esc(mLabel(chitMonth(c, mi))) + " — ഈ മാസം കിട്ടിയത്</div>" +
      '<div class="pair"><div><div class="lbl">അടച്ചവർ</div><div class="v in">' + st.paid + '</div></div><div><div class="lbl">ബാക്കി / ഒഴിവ്</div><div class="v out">' + st.pend + " / " + st.miss + "</div></div></div></div>";
    h += '<div class="seg" style="margin:14px 0 8px"><button type="button" data-act="chit-view" data-v="month" class="' + (ui.chitView === "month" ? "on" : "") + '">മാസം</button><button type="button" data-act="chit-view" data-v="grid" class="' + (ui.chitView === "grid" ? "on" : "") + '">മുഴുവൻ പട്ടിക</button></div>';
    if (ui.chitView === "grid") return h + chitGrid(c);
    h += '<div class="chips" id="chipRow">' + Array.from({ length: c.months }, (_, i) => '<button type="button" class="chip ' + (i === mi ? "on " : "") + (i === ci ? "cur" : "") + '" data-act="chit-month" data-i="' + i + '">' + esc(mShort(chitMonth(c, i))) + " " + String(chitMonth(c, i)).slice(2, 4) + "</button>").join("") + "</div>";
    const got = (c.got && c.got[mi]) || {};
    h += '<div class="card" style="margin-bottom:12px"><div class="row"><div class="grow"><div class="small muted">ഈ മാസം ചിട്ടി എടുത്തത്</div>' +
      '<select class="select" data-chg="got-mid" style="margin-top:4px"><option value="">— ആരുമില്ല —</option>' + c.members.map((m) => '<option value="' + m.id + '"' + (got.mid === m.id ? " selected" : "") + ">" + esc(m.name) + "</option>").join("") + "</select></div>" +
      '<div style="width:120px"><div class="small muted">തുക (₹)</div><input class="input num" data-chg="got-amt" inputmode="decimal" value="' + (got.amt != null ? got.amt : "") + '" placeholder="' + (c.members.length * c.amount) + '" style="margin-top:4px"></div></div></div>';
    h += '<div class="card">';
    if (!c.members.length) h += '<div class="empty"><b>അംഗങ്ങൾ ഇല്ല</b>മുകളിലെ "അംഗങ്ങൾ" അമർത്തി പേരുകൾ ചേർക്കുക.</div>';
    c.members.forEach((m) => {
      const x = cellOf(c, m.id, mi), ms = memberStat(c, m.id), isGot = got.mid === m.id;
      h += '<div class="mrow"><button type="button" class="tick ' + tickClass(c, x) + '" data-act="tick" data-m="' + m.id + '" aria-label="' + esc(m.name) + ' അടച്ചു എന്ന് അടയാളപ്പെടുത്തുക">' + tickIcon(c, x) + "</button>" +
        '<div class="grow"><div class="trunc" style="font-weight:700">' + esc(m.name) + (isGot ? ' <span class="tag gold">★ എടുത്തു</span>' : "") + "</div>" +
        '<div class="small muted num">' + ms.paid + "/" + c.months + " മാസം" + (x && x.s === "paid" && paidOf(c, x) !== c.amount ? " • " + money(paidOf(c, x)) : "") + (x && x.s === "miss" ? " • ഈ മാസം ഒഴിവ്" : "") + (x && x.note ? " • " + esc(x.note) : "") + "</div></div>" +
        (ms.due > 0 ? '<span class="tag neg num">ബാക്കി ' + money(ms.due) + "</span>" : '<span class="tag pos">ക്ലിയർ</span>') +
        '<button type="button" class="icon-btn" data-act="cell" data-m="' + m.id + '" aria-label="വിശദാംശം" style="width:34px;height:34px">' + ICON.dots + "</button></div>";
    });
    h += "</div>";
    if (c.members.length) h += '<button type="button" class="btn ghost block" style="margin-top:12px" data-act="share-pending">ബാക്കിയുള്ളവരുടെ ലിസ്റ്റ് WhatsApp-ൽ അയക്കുക</button>';
    return h;
  }

  function chitGrid(c) {
    const ci = curIdx(c);
    let h = '<div class="grid-wrap"><table class="grid num"><thead><tr><th>അംഗം</th>' + Array.from({ length: c.months }, (_, i) => '<th class="' + (i === ci ? "cur" : "") + '">' + esc(mShort(chitMonth(c, i))) + '<div class="small muted">' + String(chitMonth(c, i)).slice(2, 4) + "</div></th>").join("") + "<th>അടച്ചത്</th><th>ബാക്കി</th></tr></thead><tbody>";
    c.members.forEach((m) => {
      const ms = memberStat(c, m.id);
      h += "<tr><td>" + esc(m.name) + "</td>" + Array.from({ length: c.months }, (_, i) => {
        const x = cellOf(c, m.id, i), g = c.got && c.got[i] && c.got[i].mid === m.id;
        const sym = !x ? '<span class="muted">·</span>' : x.s === "miss" ? '<span class="no">✗</span>' : (paidOf(c, x) < c.amount ? '<span class="pt">½</span>' : '<span class="ok">✓</span>');
        return '<td class="' + (i === ci ? "cur" : "") + '">' + sym + (g ? ' <span style="color:var(--gold)">★</span>' : "") + "</td>";
      }).join("") + "<td>" + money(ms.total) + '</td><td class="' + (ms.due > 0 ? "neg" : "pos") + '">' + (ms.due > 0 ? money(ms.due) : "✓") + "</td></tr>";
    });
    h += "</tbody><tfoot><tr><td>കിട്ടിയത്</td>" + Array.from({ length: c.months }, (_, i) => "<td>" + compact(monthStat(c, i).coll) + "</td>").join("") + "<td>" + money(c.members.reduce((a, m) => a + memberStat(c, m.id).total, 0)) + "</td><td>" + money(c.members.reduce((a, m) => a + memberStat(c, m.id).due, 0)) + "</td></tr>" +
      "<tr><td>എടുത്തത് ★</td>" + Array.from({ length: c.months }, (_, i) => { const g = c.got && c.got[i]; const m = g && c.members.find((x) => x.id === g.mid); return "<td>" + (m ? esc(clean(m.name).split(" ")[0]) : "") + "</td>"; }).join("") + "<td></td><td></td></tr></tfoot></table></div>";
    return h + '<p class="muted small" style="margin:8px 2px">✓ അടച്ചു • ½ ഭാഗികം • ✗ ഒഴിവ് • · ബാക്കി • ★ ആ മാസം ചിട്ടി എടുത്തയാൾ</p>';
  }

  function chitForm(c) {
    const e = c || { name: "", amount: "", start: todayIso().slice(0, 7), months: "" };
    return '<label class="field">ചിട്ടിയുടെ പേര്<input id="sf_name" class="input" value="' + esc(e.name) + '" placeholder="ഉദാ: വീട്ടുകാരുടെ ചിട്ടി" autocomplete="off"></label>' +
      '<div class="row2"><label class="field">പ്രതിമാസ തുക (₹)<input id="sf_amount" class="input num" inputmode="decimal" value="' + esc(e.amount) + '"></label>' +
      '<label class="field">എത്ര മാസം<input id="sf_months" class="input num" inputmode="numeric" value="' + esc(e.months) + '" placeholder="അംഗങ്ങളുടെ എണ്ണം"></label></div>' +
      '<label class="field">തുടങ്ങുന്ന മാസം<input id="sf_start" type="month" class="input" value="' + esc(e.start) + '"></label>';
  }
  function readChitForm() {
    const name = clean(sv("name")), amount = num(sv("amount")), start = sv("start"), months = Math.round(num(sv("months")));
    if (!name) return sheetErr("ചിട്ടിയുടെ പേര് നൽകുക.");
    if (amount <= 0) return sheetErr("പ്രതിമാസ തുക നൽകുക.");
    if (!/^\d{4}-\d{2}$/.test(start)) return sheetErr("തുടങ്ങുന്ന മാസം തിരഞ്ഞെടുക്കുക.");
    return { name, amount, start, months };
  }

  /* ---- chit actions ---- */
  const chitActions = {
    "open-chit"(el) { state.ui.chitId = el.dataset.id; state.ui.chitMonth = null; state.ui.chitView = "month"; persist(); render(); window.scrollTo(0, 0); },
    "back-chits"() { state.ui.chitId = null; persist(); render(); },
    "chit-view"(el) { state.ui.chitView = el.dataset.v; render(); },
    "chit-month"(el) { state.ui.chitMonth = Number(el.dataset.i); render(); },
    "new-chit"() {
      openSheet({
        title: "പുതിയ ചിട്ടി", ok: "ഉണ്ടാക്കുക",
        body: chitForm(null) + '<label class="field">അംഗങ്ങളുടെ പേരുകൾ (ഓരോ വരിയിലും ഒന്ന്)<textarea id="sf_members" class="input" rows="5" placeholder="സലിം&#10;റഹ്മത്ത്&#10;അബ്ദുല്ല"></textarea></label>',
        onOk() {
          const f = readChitForm(); if (!f) return false;
          const names = String(sv("members")).split(/\r?\n/).map(clean).filter(Boolean);
          const c = { id: uid("c"), name: f.name, amount: f.amount, start: f.start, months: f.months || names.length || 12, members: names.map((n) => ({ id: uid("m"), name: n })), cells: {}, got: {}, createdAt: Date.now() };
          state.chits.push(c); state.ui.chitId = c.id; state.ui.chitMonth = null; state.ui.chitView = "month";
          persist(); toast("ചിട്ടി ഉണ്ടാക്കി."); render();
        }
      });
    },
    "edit-chit"() {
      const c = getChit(state.ui.chitId); if (!c) return;
      openSheet({
        title: "ചിട്ടി എഡിറ്റ്", body: chitForm(c), ok: "സേവ്",
        extra: '<button type="button" class="btn danger" data-act="del-chit">ഇല്ലാതാക്കുക</button>',
        onOk() {
          const f = readChitForm(); if (!f) return false;
          if (f.months && f.months < c.months && Object.keys(c.cells).some((k) => Number(k.split("|")[1]) >= f.months)) return sheetErr("ഇതിനകം രേഖപ്പെടുത്തിയ മാസങ്ങൾ ഒഴിവാക്കാൻ പറ്റില്ല.");
          c.name = f.name; c.amount = f.amount; c.start = f.start; c.months = f.months || c.months;
          persist(); toast("സേവ് ചെയ്തു."); render();
        }
      });
    },
    "del-chit"() {
      const c = getChit(state.ui.chitId); if (!c) return;
      confirmBox("ചിട്ടി ഇല്ലാതാക്കണോ?", c.name + " — എല്ലാ അംഗങ്ങളുടെയും രേഖകൾ മായ്ക്കും. ഇത് തിരിച്ചെടുക്കാൻ പറ്റില്ല.", "ഇല്ലാതാക്കുക", () => {
        state.chits = state.chits.filter((x) => x.id !== c.id); state.ui.chitId = null; persist(); toast("ഇല്ലാതാക്കി."); render();
      });
    },
    "chit-members"() {
      const c = getChit(state.ui.chitId); if (!c) return;
      openSheet({
        title: "അംഗങ്ങൾ (" + c.members.length + ")", ok: "ചേർക്കുക", cancel: "അടയ്ക്കുക",
        body: '<div style="max-height:34vh;overflow:auto;margin-bottom:10px">' + (c.members.map((m) => '<div class="row" style="padding:6px 0"><input class="input" data-ren="' + m.id + '" value="' + esc(m.name) + '" style="margin:0"><button type="button" class="icon-btn" data-act="del-member" data-m="' + m.id + '" aria-label="നീക്കുക" style="color:var(--neg)">' + ICON.x.replace("<svg", '<svg width="16" height="16"') + "</button></div>").join("") || '<p class="muted">അംഗങ്ങൾ ഇല്ല.</p>') + "</div>" +
          '<label class="field">പുതിയ അംഗങ്ങൾ (ഓരോ വരിയിലും ഒന്ന്)<textarea id="sf_new" class="input" rows="3"></textarea></label>',
        onOk() {
          $$("[data-ren]").forEach((i) => { const m = c.members.find((x) => x.id === i.dataset.ren); const v = clean(i.value); if (m && v) m.name = v; });
          String(sv("new")).split(/\r?\n/).map(clean).filter(Boolean).forEach((n) => c.members.push({ id: uid("m"), name: n }));
          persist(); toast("അംഗങ്ങൾ സേവ് ചെയ്തു."); render();
        }
      });
    },
    "del-member"(el) {
      const c = getChit(state.ui.chitId); if (!c) return;
      const m = c.members.find((x) => x.id === el.dataset.m); if (!m) return;
      confirmBox("അംഗത്തെ നീക്കണോ?", m.name + " — ഈ അംഗത്തിന്റെ എല്ലാ രേഖകളും മായ്ക്കും.", "നീക്കുക", () => {
        c.members = c.members.filter((x) => x.id !== m.id);
        Object.keys(c.cells).forEach((k) => { if (k.indexOf(m.id + "|") === 0) delete c.cells[k]; });
        Object.keys(c.got || {}).forEach((i) => { if (c.got[i].mid === m.id) delete c.got[i]; });
        persist(); render();
      });
    },
    tick(el) {
      const c = getChit(state.ui.chitId); if (!c) return;
      const k = cellKey(el.dataset.m, state.ui.chitMonth), x = c.cells[k];
      if (x && x.s === "paid" && paidOf(c, x) >= c.amount) delete c.cells[k];
      else if (x && x.s === "miss") delete c.cells[k];
      else c.cells[k] = { s: "paid", amt: c.amount, at: todayIso() };
      persist(); render();
    },
    cell(el) {
      const c = getChit(state.ui.chitId); if (!c) return;
      const mid = el.dataset.m, i = state.ui.chitMonth, m = c.members.find((x) => x.id === mid), x = cellOf(c, mid, i);
      const cur = !x ? "pend" : x.s === "miss" ? "miss" : "paid";
      openSheet({
        title: m.name + " — " + mLabel(chitMonth(c, i)),
        body: '<div class="seg" style="margin-bottom:12px" id="cellSeg"><button type="button" data-act="cell-st" data-v="pend" class="' + (cur === "pend" ? "on" : "") + '">ബാക്കി</button><button type="button" data-act="cell-st" data-v="paid" class="' + (cur === "paid" ? "on" : "") + '">അടച്ചു</button><button type="button" data-act="cell-st" data-v="miss" class="' + (cur === "miss" ? "on" : "") + '">ഒഴിവ്</button></div>' +
          '<input type="hidden" id="sf_st" value="' + cur + '">' +
          '<label class="field">അടച്ച തുക (₹) — ഭാഗികമായി ആണെങ്കിൽ മാറ്റുക<input id="sf_amt" class="input amount num" inputmode="decimal" value="' + (x && x.s === "paid" && x.amt != null ? x.amt : c.amount) + '"></label>' +
          '<label class="field">കുറിപ്പ്<input id="sf_note" class="input" value="' + esc((x && x.note) || "") + '" placeholder="ഉദാ: അടുത്ത മാസം ചേർത്ത് തരും"></label>',
        onOk() {
          const st = sv("st"), k = cellKey(mid, i), note = clean(sv("note"));
          if (st === "pend") { if (note) c.cells[k] = { s: "pend", note }; else delete c.cells[k]; if (c.cells[k] && c.cells[k].s === "pend") delete c.cells[k]; }
          else if (st === "miss") c.cells[k] = { s: "miss", note, at: todayIso() };
          else { const a = num(sv("amt")); if (a <= 0) return sheetErr("തുക നൽകുക."); c.cells[k] = { s: "paid", amt: a, note, at: todayIso() }; }
          persist(); render();
        }
      });
    },
    "cell-st"(el) { $("#sf_st").value = el.dataset.v; $$("#cellSeg button").forEach((b) => b.classList.toggle("on", b === el)); },
    "share-pending"() {
      const c = getChit(state.ui.chitId); if (!c) return;
      const i = state.ui.chitMonth, rows = c.members.filter((m) => { const x = cellOf(c, m.id, i); return !x || x.s !== "paid"; });
      const t = c.name + " — " + mLabel(chitMonth(c, i)) + "\nതുക: " + money(c.amount) + "\n\n" + (rows.length ? "ഇതുവരെ അടയ്ക്കാത്തവർ:\n" + rows.map((m, n) => (n + 1) + ". " + m.name).join("\n") + "\n\nദയവായി അടയ്ക്കുക." : "എല്ലാവരും അടച്ചു. നന്ദി!");
      shareText(t);
    }
  };
  function shareText(t) {
    if (navigator.share) navigator.share({ text: t }).catch(() => {});
    else window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
  }
  function chitChange(el) {
    const c = getChit(state.ui.chitId); if (!c) return;
    const i = state.ui.chitMonth; if (!c.got) c.got = {};
    const cur = c.got[i] || {};
    if (el.dataset.chg === "got-mid") { if (!el.value) delete c.got[i]; else c.got[i] = { mid: el.value, amt: cur.amt }; }
    if (el.dataset.chg === "got-amt") { if (!cur.mid) { el.value = ""; return toast("ആദ്യം ആളെ തിരഞ്ഞെടുക്കുക.", true); } c.got[i] = { mid: cur.mid, amt: el.value === "" ? undefined : num(el.value) }; }
    persist(); render();
  }

  /* =====================================================================
     INCOME & EXPENSE (വരവ്-ചെലവ്) + charts
     ===================================================================== */
  const txOf = (ym) => state.tx.filter((t) => t.date.slice(0, 7) === ym);
  const sumT = (arr, type) => arr.reduce((a, t) => a + (t.type === type ? t.amt : 0), 0);
  function bounds() {
    const ym = state.ui.txMonth, r = state.ui.range, last = ym + "-" + pad(daysIn(ym));
    if (r === "3m") return [addMonths(ym, -2) + "-01", last, "3 മാസം"];
    if (r === "year") return [ym.slice(0, 4) + "-01-01", ym.slice(0, 4) + "-12-31", ym.slice(0, 4) + " വർഷം"];
    if (r === "all") { const first = state.tx.reduce((m, t) => (t.date < m ? t.date : m), todayIso()); return [first, todayIso(), "തുടക്കം മുതൽ ഇന്നുവരെ"]; }
    return [ym + "-01", last, mLabel(ym)];
  }
  const inRange = (b) => state.tx.filter((t) => t.date >= b[0] && t.date <= b[1]);
  function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  const catCount = (type) => { const m = {}; state.tx.forEach((t) => { if (t.type === type) m[t.cat] = (m[t.cat] || 0) + 1; }); return m; };
  const sortedCats = (type) => { const cnt = catCount(type); return state.cats[type].slice().sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0)); };

  function financeTab() {
    const ui = state.ui, ym = ui.txMonth, mt = txOf(ym), inc = sumT(mt, "in"), out = sumT(mt, "out");
    const isCur = ym === todayIso().slice(0, 7);
    const elapsed = isCur ? Number(todayIso().slice(8)) : daysIn(ym);
    const allNet = sumT(state.tx, "in") - sumT(state.tx, "out");
    let h = '<div class="row between" style="margin-bottom:10px"><button type="button" class="icon-btn" data-act="month-nav" data-d="-1" aria-label="മുൻ മാസം">' + ICON.left + '</button><div style="font-weight:800;font-size:1.05rem">' + esc(mLabel(ym)) + '</div><button type="button" class="icon-btn" data-act="month-nav" data-d="1" aria-label="അടുത്ത മാസം"' + (isCur ? " disabled style=\"opacity:.35\"" : "") + ">" + ICON.right + "</button></div>";
    h += '<div class="hero"><div class="lbl">ഈ മാസത്തെ ബാക്കി</div><div class="big num ' + "" + '">' + money(inc - out) + '</div><div class="pair"><div><div class="lbl">വരവ്</div><div class="v in num">' + money(inc) + '</div></div><div><div class="lbl">ചെലവ്</div><div class="v out num">' + money(out) + '</div></div></div>' +
      '<div class="lbl num" style="margin-top:10px">ദിവസ ശരാശരി ചെലവ് ' + money(out / Math.max(1, elapsed)) + " • തുടക്കം മുതലുള്ള ബാക്കി " + money(allNet) + "</div></div>";

    h += '<div class="sec">ഗ്രാഫ്</div>';
    h += '<div class="card" style="margin-bottom:12px"><div class="row between"><h3>' + esc(mLabel(ym)) + ' — ഇന്നുവരെ ചെലവായത്</h3></div>' + cumChart(ym) + "</div>";
    h += '<div class="card" style="margin-bottom:12px"><h3>മാസാമാസം വരവും ചെലവും</h3>' + trendChart(ym) + "</div>";
    h += '<div class="card" style="margin-bottom:12px"><h3>ഏറ്റവും കൂടുതൽ ചെലവ് എവിടെ?</h3><div class="seg" style="margin:6px 0 10px">' +
      [["month", "ഈ മാസം"], ["3m", "3 മാസം"], ["year", "ഈ വർഷം"], ["all", "മൊത്തം"]].map((r) => '<button type="button" data-act="range" data-v="' + r[0] + '" class="' + (ui.range === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + "</div>" + catBars() + "</div>";

    // list
    h += '<div class="sec">ഇടപാടുകൾ</div><div class="seg" style="margin-bottom:8px">' + [["all", "എല്ലാം"], ["in", "വരവ്"], ["out", "ചെലവ്"]].map((r) => '<button type="button" data-act="tx-type" data-v="' + r[0] + '" class="' + (ui.txType === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + "</div>";
    const cats = Array.from(new Set(mt.filter((t) => ui.txType === "all" || t.type === ui.txType).map((t) => t.cat)));
    if (cats.length) h += '<div class="chips"><button type="button" class="chip ' + (ui.txCat === "all" ? "on" : "") + '" data-act="tx-cat" data-v="all">എല്ലാ വിഭാഗവും</button>' + cats.map((c) => '<button type="button" class="chip ' + (ui.txCat === c ? "on" : "") + '" data-act="tx-cat" data-v="' + esc(c) + '">' + esc(c) + "</button>").join("") + "</div>";
    const list = mt.filter((t) => (ui.txType === "all" || t.type === ui.txType) && (ui.txCat === "all" || t.cat === ui.txCat)).sort((a, b) => (b.date + (b.ts || 0)).localeCompare(a.date + (a.ts || 0)));
    if (!list.length) h += '<div class="card empty"><b>ഈ മാസം ഇടപാടുകളില്ല</b>താഴെ + അമർത്തി ചേർക്കുക.</div>';
    else {
      let day = "", open = false;
      list.forEach((t) => {
        if (t.date !== day) { if (open) h += "</div>"; day = t.date; const dt = list.filter((x) => x.date === day); h += '<div class="day"><span>' + esc(dLabel(day)) + '</span><span class="num">' + money(sumT(dt, "in") - sumT(dt, "out")) + '</span></div><div class="card" style="padding:2px 14px">'; open = true; }
        h += '<div class="item" data-act="edit-tx" data-id="' + t.id + '" role="button" tabindex="0"><div class="dot ' + t.type + '">' + esc(Array.from(t.cat)[0] || "?") + '</div><div class="grow"><div class="trunc" style="font-weight:700">' + esc(t.cat) + '</div>' + (t.note ? '<div class="small muted trunc">' + esc(t.note) + "</div>" : "") + '</div><div class="amt num ' + t.type + '">' + (t.type === "in" ? "+" : "−") + money(t.amt) + "</div></div>";
      });
      if (open) h += "</div>";
    }
    return h + '<button type="button" class="fab" data-act="add-tx" aria-label="ഇടപാട് ചേർക്കുക">' + ICON.plus + "</button>";
  }

  /* ---- charts (inline SVG; tooltip on tap / hover / keyboard focus) ---- */
  const chartData = {};
  const CW = 360;
  function gridY(max, H, T, B, L, R) {
    return [0, 0.5, 1].map((f) => { const y = T + (1 - f) * (H - T - B); return '<line x1="' + L + '" x2="' + (CW - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"' + (f === 0 ? ' stroke-opacity="1"' : ' stroke-dasharray="2 4"') + '/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--muted)" font-size="10" class="num">' + compact(max * f) + "</text>"; }).join("");
  }
  function legend(items) { return '<div class="row small" style="gap:14px;margin:6px 0 2px;flex-wrap:wrap">' + items.map((i) => '<span class="row" style="gap:6px"><i style="display:inline-block;width:14px;height:3px;border-radius:2px;background:' + i[0] + (i[2] ? ";opacity:.7" : "") + '"></i><span class="muted">' + esc(i[1]) + "</span></span>").join("") + "</div>"; }

  function cumChart(ym) {
    const D = daysIn(ym), isCur = ym === todayIso().slice(0, 7), upto = isCur ? Number(todayIso().slice(8)) : D;
    const dayOut = (m) => { const a = new Array(daysIn(m) + 1).fill(0); txOf(m).forEach((t) => { if (t.type === "out") a[Number(t.date.slice(8))] += t.amt; }); return a; };
    const cur = dayOut(ym), pm = addMonths(ym, -1), prev = dayOut(pm);
    const cc = [], pc = []; let s = 0, p = 0;
    for (let d = 1; d <= D; d++) { s += cur[d] || 0; p += d <= daysIn(pm) ? prev[d] || 0 : 0; cc.push(d <= upto ? s : null); pc.push(p); }
    const total = cc[upto - 1] || 0, ptotal = pc[Math.min(upto, daysIn(pm)) - 1] || 0;
    const max = niceMax(Math.max(total, pc[D - 1] || 0, 1));
    if (!total && !pc[D - 1]) return '<div class="empty" style="padding:18px">ഈ മാസത്തെയും മുൻ മാസത്തെയും ചെലവ് ഇല്ല.</div>';
    const H = 190, L = 40, R = 14, T = 12, B = 24;
    const X = (d) => L + (d - 1) / Math.max(1, D - 1) * (CW - L - R), Y = (v) => T + (1 - v / max) * (H - T - B);
    const path = (arr) => { let d = "", pen = false; arr.forEach((v, i) => { if (v == null) return; d += (pen ? "L" : "M") + X(i + 1).toFixed(1) + " " + Y(v).toFixed(1); pen = true; }); return d; };
    const id = "cum"; chartData[id] = { D, cc, pc, cur, prev, ym, pm, upto, X, L, R, H, T, B, max };
    const xt = [1, Math.ceil(D / 2), D].map((d) => '<text x="' + X(d) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--muted)" font-size="10" class="num">' + d + "</text>").join("");
    const lastX = X(upto), lastY = Y(total);
    return legend([["var(--s1)", mLabel(ym)], ["var(--s3)", "മുൻ മാസം (" + mShort(pm) + ")", true]]) +
      '<div class="chartbox" data-chart="' + id + '"><svg viewBox="0 0 ' + CW + " " + H + '" width="100%" role="img" aria-label="ഇന്നുവരെയുള്ള ചെലവ് ഗ്രാഫ്" style="display:block;touch-action:pan-y">' +
      gridY(max, H, T, B, L, R) + xt +
      '<path d="' + path(pc) + '" fill="none" stroke="var(--s3)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>' +
      '<path d="' + path(cc) + '" fill="none" stroke="var(--s1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + lastX + '" cy="' + lastY + '" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>' +
      '<g class="xh" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-width="1"/><circle r="4.5" class="xh1" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/><circle r="4" class="xh2" fill="var(--s3)" stroke="var(--surface)" stroke-width="2"/></g>' +
      '<rect class="hit" x="' + L + '" y="0" width="' + (CW - L - R) + '" height="' + H + '" fill="transparent"/></svg><div class="tip" hidden></div></div>' +
      '<div class="row between small num" style="margin-top:4px"><span><b>' + money(total) + '</b> <span class="muted">ഇതുവരെ</span></span><span class="muted">മുൻ മാസം ഇതേ ദിവസം ' + money(ptotal) + (total || ptotal ? ' <b class="' + (total > ptotal ? "neg" : "pos") + '">' + (total > ptotal ? "▲ " : "▼ ") + money(Math.abs(total - ptotal)) + "</b>" : "") + "</span></div>";
  }

  function trendChart(ym) {
    const N = state.ui.range === "year" || state.ui.range === "all" ? 12 : 6;
    const ms = Array.from({ length: N }, (_, i) => addMonths(ym, i - N + 1));
    const data = ms.map((m) => { const t = txOf(m); const o = t.filter((x) => x.type === "out"); const by = {}; o.forEach((x) => { by[x.cat] = (by[x.cat] || 0) + x.amt; }); const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0]; return { m, inc: sumT(t, "in"), out: sumT(t, "out"), top, topAmt: top ? by[top] : 0, n: t.length }; });
    const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.inc, d.out))));
    if (data.every((d) => !d.n)) return '<div class="empty" style="padding:18px">ഇടപാടുകൾ ചേർത്താൽ ഇവിടെ ഗ്രാഫ് കാണാം.</div>';
    const H = 200, L = 40, R = 8, T = 12, B = 30, gw = (CW - L - R) / N, bw = Math.min(16, gw * 0.34), baseY = H - B;
    const Y = (v) => T + (1 - v / max) * (H - T - B);
    const bar = (x, v, fill) => { if (v <= 0) return ""; const y = Y(v), h = baseY - y, r = Math.min(4, h, bw / 2); return '<path d="M' + x + " " + baseY + "V" + (y + r) + "a" + r + " " + r + " 0 0 1 " + r + " " + -r + "h" + (bw - 2 * r) + "a" + r + " " + r + " 0 0 1 " + r + " " + r + "V" + baseY + 'z" fill="' + fill + '" class="bar"/>'; };
    let svg = gridY(max, H, T, B, L, R);
    data.forEach((d, i) => {
      const cx = L + gw * i + gw / 2, sel = d.m === ym;
      svg += '<g class="grp" data-i="' + i + '" tabindex="0" role="img" aria-label="' + esc(mLabel(d.m)) + ": വരവ് " + d.inc + ", ചെലവ് " + d.out + '">' +
        '<rect class="hl" x="' + (L + gw * i + 1) + '" y="' + T + '" width="' + (gw - 2) + '" height="' + (H - T - B) + '" rx="6" fill="' + (sel ? "var(--surface2)" : "transparent") + '"/>' +
        bar(cx - bw - 1, d.inc, "var(--s1)") + bar(cx + 1, d.out, "var(--s2)") +
        '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle" fill="' + (sel ? "var(--ink)" : "var(--muted)") + '" font-size="10" font-weight="' + (sel ? 700 : 500) + '">' + esc(mShort(d.m)) + "</text>" +
        '<rect class="hit" x="' + (L + gw * i) + '" y="0" width="' + gw + '" height="' + H + '" fill="transparent"/></g>';
    });
    chartData.trend = { data, L, gw, H, max };
    const rows = data.map((d) => "<tr><td>" + esc(mLabel(d.m)) + '</td><td class="num">' + money(d.inc) + '</td><td class="num">' + money(d.out) + '</td><td class="num">' + money(d.inc - d.out) + "</td></tr>").join("");
    return legend([["var(--s1)", "വരവ്"], ["var(--s2)", "ചെലവ്"]]) + '<div class="chartbox" data-chart="trend"><svg viewBox="0 0 ' + CW + " " + H + '" width="100%" style="display:block">' + svg + '</svg><div class="tip" hidden></div></div>' +
      '<details style="margin-top:6px"><summary class="small muted" style="cursor:pointer">പട്ടികയായി കാണുക</summary><div class="grid-wrap" style="margin-top:6px;max-height:none"><table class="grid"><thead><tr><th>മാസം</th><th>വരവ്</th><th>ചെലവ്</th><th>ബാക്കി</th></tr></thead><tbody>' + rows + "</tbody></table></div></details>";
  }

  function catBars() {
    const b = bounds(), arr = inRange(b).filter((t) => t.type === "out"), by = {};
    arr.forEach((t) => { (by[t.cat] = by[t.cat] || []).push(t); });
    const names = Object.keys(by).sort((a, c) => by[c].reduce((s, t) => s + t.amt, 0) - by[a].reduce((s, t) => s + t.amt, 0));
    const total = arr.reduce((s, t) => s + t.amt, 0);
    if (!names.length) return '<div class="empty" style="padding:18px">ഈ കാലയളവിൽ ചെലവ് ഇല്ല.</div>';
    const mx = by[names[0]].reduce((s, t) => s + t.amt, 0);
    let h = '<div class="small muted num" style="margin-bottom:6px">' + esc(b[2]) + " • ആകെ ചെലവ് <b style=\"color:var(--ink)\">" + money(total) + "</b></div>";
    names.forEach((n, i) => {
      const list = by[n], sum = list.reduce((s, t) => s + t.amt, 0), sel = state.ui.catSel === n;
      h += '<button type="button" data-act="cat-sel" data-c="' + esc(n) + '" aria-expanded="' + sel + '" style="display:block;width:100%;text-align:left;background:' + (sel ? "var(--surface2)" : "transparent") + ';border:0;border-radius:12px;padding:8px 8px;margin:0 -8px;width:calc(100% + 16px)">' +
        '<div class="row between" style="margin-bottom:5px"><span class="trunc" style="font-weight:' + (i === 0 ? 800 : 600) + '">' + (i === 0 ? "🔺 " : "") + esc(n) + '</span><span class="num"><b>' + money(sum) + '</b> <span class="muted small">' + Math.round(sum / total * 100) + '%</span></span></div><div class="bar"><i style="width:' + Math.max(2, sum / mx * 100) + '%"></i></div></button>';
      if (sel) {
        const big = list.slice().sort((a, c) => c.amt - a.amt)[0], days = new Set(list.map((t) => t.date)).size;
        let cmp = "";
        if (state.ui.range === "month") { const pm = addMonths(state.ui.txMonth, -1), ps = txOf(pm).filter((t) => t.type === "out" && t.cat === n).reduce((s, t) => s + t.amt, 0); cmp = '<div class="row between"><span class="muted">' + esc(mLabel(pm)) + ' മാസത്തിൽ</span><span class="num">' + money(ps) + (ps || sum ? ' <b class="' + (sum > ps ? "neg" : "pos") + '">' + (sum > ps ? "▲ " : "▼ ") + money(Math.abs(sum - ps)) + "</b>" : "") + "</span></div>"; }
        h += '<div class="card" style="margin:2px 0 8px;background:var(--surface2);box-shadow:none"><div class="stack small" style="gap:6px"><div class="row between"><span class="muted">ഇടപാടുകൾ</span><b class="num">' + list.length + " (" + days + " ദിവസം)</b></div>" +
          '<div class="row between"><span class="muted">ശരാശരി</span><b class="num">' + money(sum / list.length) + '</b></div><div class="row between"><span class="muted">ഏറ്റവും വലുത്</span><b class="num">' + money(big.amt) + " • " + esc(dLabel(big.date)) + "</b></div>" + cmp +
          '<button type="button" class="btn sm ghost" data-act="cat-show" data-c="' + esc(n) + '">ഈ ഇടപാടുകൾ ലിസ്റ്റിൽ കാണുക</button></div></div>';
      }
    });
    return h;
  }

  /* tooltip wiring (re-bound after every render) */
  function showTip(box, xPx, rows, title) {
    const tip = $(".tip", box); if (!tip) return;
    tip.replaceChildren();
    const t = document.createElement("div"); t.className = "tt"; t.textContent = title; tip.appendChild(t);
    rows.forEach((r) => {
      const d = document.createElement("div"); d.className = "tr";
      const k = document.createElement("i"); k.style.background = r[0]; d.appendChild(k);
      const v = document.createElement("b"); v.className = "num"; v.textContent = r[2]; d.appendChild(v);
      const l = document.createElement("span"); l.textContent = r[1]; d.appendChild(l); tip.appendChild(d);
    });
    tip.hidden = false;
    const w = box.clientWidth, tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(w - tw, xPx - tw / 2)) + "px";
  }
  function bindCharts() {
    $$(".chartbox").forEach((box) => {
      const id = box.dataset.chart, svg = $("svg", box), tip = $(".tip", box);
      if (id === "cum") {
        const d = chartData.cum, xh = $(".xh", svg);
        const move = (ev) => {
          const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * CW;
          let day = Math.round((vx - d.L) / (CW - d.L - d.R) * (d.D - 1)) + 1; day = Math.max(1, Math.min(d.D, day));
          const x = d.X(day), Yf = (v) => d.T + (1 - v / d.max) * (d.H - d.T - d.B);
          xh.style.display = ""; $("line", xh).setAttribute("x1", x); $("line", xh).setAttribute("x2", x);
          const c1 = $(".xh1", xh), c2 = $(".xh2", xh), cv = d.cc[day - 1], pv = d.pc[day - 1];
          if (cv == null) c1.style.display = "none"; else { c1.style.display = ""; c1.setAttribute("cx", x); c1.setAttribute("cy", Yf(cv)); }
          c2.setAttribute("cx", x); c2.setAttribute("cy", Yf(pv));
          const rows = [];
          if (cv != null) rows.push(["var(--s1)", mShort(d.ym) + " — ഇതുവരെ", money(cv)]);
          rows.push(["var(--s3)", mShort(d.pm) + " — ഇതുവരെ", money(pv)]);
          if (cv != null) { rows.push(["transparent", "ആ ദിവസത്തെ ചെലവ്", money(d.cur[day] || 0)]); const top = txOf(d.ym).filter((t) => t.type === "out" && Number(t.date.slice(8)) === day).sort((a, b) => b.amt - a.amt)[0]; if (top) rows.push(["transparent", "വലുത്: " + top.cat, money(top.amt)]); }
          showTip(box, x / CW * r.width, rows, day + " " + mShort(d.ym));
        };
        const leave = () => { xh.style.display = "none"; tip.hidden = true; };
        svg.addEventListener("pointermove", move); svg.addEventListener("pointerdown", move); svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") leave(); });
        document.addEventListener("pointerdown", (e) => { if (!box.contains(e.target)) leave(); }, { passive: true });
      } else if (id === "trend") {
        const d = chartData.trend;
        const show = (g) => {
          const i = Number(g.dataset.i), x = d.data[i], r = svg.getBoundingClientRect();
          $$(".hl", svg).forEach((h, k) => h.setAttribute("fill", k === i ? "var(--surface2)" : (d.data[k].m === state.ui.txMonth ? "var(--surface2)" : "transparent")));
          const cx = (d.L + d.gw * i + d.gw / 2) / CW * r.width;
          const rows = [["var(--s1)", "വരവ്", money(x.inc)], ["var(--s2)", "ചെലവ്", money(x.out)], ["transparent", "ബാക്കി", money(x.inc - x.out)]];
          if (x.top) rows.push(["transparent", "കൂടുതൽ: " + x.top, money(x.topAmt)]);
          showTip(box, cx, rows, mLabel(x.m));
        };
        $$(".grp", svg).forEach((g) => { g.addEventListener("pointerdown", () => show(g)); g.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") show(g); }); g.addEventListener("focus", () => show(g)); g.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") tip.hidden = true; }); });
        document.addEventListener("pointerdown", (e) => { if (!box.contains(e.target)) tip.hidden = true; }, { passive: true });
      }
    });
  }

  /* ---- tx sheet ---- */
  function catChips(type, sel) {
    return sortedCats(type).map((c) => '<button type="button" class="chip ' + (c === sel ? "on" : "") + '" data-act="pick-cat" data-c="' + esc(c) + '">' + esc(c) + "</button>").join("") + '<button type="button" class="chip" data-act="new-cat">+ പുതിയത്</button>';
  }
  function txSheet(t) {
    const e = t || { type: "out", cat: "", amt: "", date: todayIso(), note: "" };
    openSheet({
      title: t ? "ഇടപാട് എഡിറ്റ്" : "പുതിയ ഇടപാട്", ok: "സേവ്", focus: !t,
      extra: t ? '<button type="button" class="btn danger" data-act="del-tx">ഇല്ലാതാക്കുക</button>' : "",
      body: '<div class="seg" style="margin-bottom:12px" id="typeSeg"><button type="button" data-act="tx-kind" data-v="out" class="' + (e.type === "out" ? "on" : "") + '">ചെലവ്</button><button type="button" data-act="tx-kind" data-v="in" class="' + (e.type === "in" ? "on" : "") + '">വരവ്</button></div>' +
        '<input type="hidden" id="sf_type" value="' + e.type + '"><input type="hidden" id="sf_cat" value="' + esc(e.cat) + '">' +
        '<label class="field">തുക (₹)<input id="sf_amt" class="input amount num" inputmode="decimal" value="' + esc(e.amt) + '" placeholder="0"></label>' +
        '<div class="field">വിഭാഗം</div><div class="chips" id="catChips" style="flex-wrap:wrap;overflow:visible">' + catChips(e.type, e.cat) + "</div>" +
        '<input id="sf_newcat" class="input" placeholder="പുതിയ വിഭാഗത്തിന്റെ പേര്" style="display:none;margin-bottom:10px">' +
        '<div class="row2" style="margin-top:8px"><label class="field">തീയതി<input id="sf_date" type="date" class="input" value="' + esc(e.date) + '"></label><label class="field">കുറിപ്പ്<input id="sf_note" class="input" value="' + esc(e.note) + '" placeholder="ഓപ്ഷണൽ"></label></div>',
      onOk() {
        const type = sv("type"), amt = num(sv("amt")), date = sv("date"), note = clean(sv("note"));
        let cat = clean(sv("cat")); const nc = clean(sv("newcat"));
        if ($("#sf_newcat").style.display !== "none" && nc) cat = nc;
        if (amt <= 0) return sheetErr("തുക നൽകുക.");
        if (!cat) return sheetErr("വിഭാഗം തിരഞ്ഞെടുക്കുക.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sheetErr("തീയതി നൽകുക.");
        if (state.cats[type].indexOf(cat) < 0) state.cats[type].push(cat);
        if (t) Object.assign(t, { type, cat, amt, date, note }); else state.tx.push({ id: uid("t"), type, cat, amt, date, note, ts: Date.now() });
        state.ui.txMonth = date.slice(0, 7); state.ui.txCat = "all";
        persist(); toast(t ? "സേവ് ചെയ്തു." : "ചേർത്തു."); render();
      }
    });
    editingTx = t || null;
  }
  let editingTx = null;
  const finActions = {
    "month-nav"(el) { const n = addMonths(state.ui.txMonth, Number(el.dataset.d)); if (n > todayIso().slice(0, 7)) return; state.ui.txMonth = n; state.ui.txCat = "all"; render(); },
    range(el) { state.ui.range = el.dataset.v; state.ui.catSel = ""; render(); },
    "tx-type"(el) { state.ui.txType = el.dataset.v; state.ui.txCat = "all"; render(); },
    "tx-cat"(el) { state.ui.txCat = el.dataset.v; render(); },
    "cat-sel"(el) { state.ui.catSel = state.ui.catSel === el.dataset.c ? "" : el.dataset.c; render(); },
    "cat-show"(el) { state.ui.txType = "out"; state.ui.txCat = el.dataset.c; if (state.ui.range === "month") { render(); } else { render(); toast("ഈ മാസത്തെ ഇടപാടുകൾ മാത്രമേ ലിസ്റ്റിൽ കാണൂ."); } const l = $(".day"); if (l) l.scrollIntoView({ behavior: "smooth", block: "start" }); },
    "add-tx"() { txSheet(null); },
    "edit-tx"(el) { const t = state.tx.find((x) => x.id === el.dataset.id); if (t) txSheet(t); },
    "del-tx"() { const t = editingTx; if (!t) return; confirmBox("ഇടപാട് ഇല്ലാതാക്കണോ?", t.cat + " — " + money(t.amt), "ഇല്ലാതാക്കുക", () => { state.tx = state.tx.filter((x) => x.id !== t.id); persist(); render(); }); },
    "tx-kind"(el) {
      $("#sf_type").value = el.dataset.v; $("#sf_cat").value = ""; $$("#typeSeg button").forEach((b) => b.classList.toggle("on", b === el));
      $("#catChips").innerHTML = catChips(el.dataset.v, ""); $("#sf_newcat").style.display = "none";
    },
    "pick-cat"(el) { $("#sf_cat").value = el.dataset.c; $("#sf_newcat").style.display = "none"; $$("#catChips .chip").forEach((b) => b.classList.toggle("on", b === el)); },
    "new-cat"(el) { $("#sf_cat").value = ""; $$("#catChips .chip").forEach((b) => b.classList.toggle("on", b === el)); const n = $("#sf_newcat"); n.style.display = ""; n.focus(); }
  };

  /* =====================================================================
     DUES (കൊടുക്കാനും കിട്ടാനുമുള്ളത്)
     ===================================================================== */
  const payTotal = (d) => (d.pays || []).reduce((a, p) => a + p.amt, 0);
  const balOf = (d) => (d.kind === "cash" ? Math.max(0, d.amt - payTotal(d)) : 0);
  const isOpenD = (d) => !d.done && (d.kind === "item" || balOf(d) > 0);
  function people() {
    const m = {};
    state.dues.forEach((d) => { const k = norm(d.person); (m[k] = m[k] || { key: k, name: d.person, phone: "", list: [] }); m[k].list.push(d); if (d.phone) m[k].phone = d.phone; m[k].name = d.person; });
    return Object.values(m);
  }
  function pStats(p) {
    let get = 0, give = 0, gi = 0, vi = 0;
    p.list.filter(isOpenD).forEach((d) => { if (d.dir === "get") { get += balOf(d); if (d.kind === "item") gi++; } else { give += balOf(d); if (d.kind === "item") vi++; } });
    return { get, give, gi, vi };
  }
  function duesTab() {
    const ui = state.ui, all = people().map((p) => Object.assign(p, { st: pStats(p) }));
    const tGet = all.reduce((a, p) => a + p.st.get, 0), tGive = all.reduce((a, p) => a + p.st.give, 0);
    const iGet = all.reduce((a, p) => a + p.st.gi, 0), iGive = all.reduce((a, p) => a + p.st.vi, 0);
    let h = '<div class="hero"><div class="lbl">കിട്ടാനുള്ളതും കൊടുക്കാനുള്ളതും</div><div class="big num ' + "" + '">' + money(tGet - tGive) + '</div><div class="lbl">ആകെ (കിട്ടാനുള്ളത് − കൊടുക്കാനുള്ളത്)</div><div class="pair"><div><div class="lbl">എനിക്ക് കിട്ടാനുള്ളത്</div><div class="v in num">' + money(tGet) + '</div><div class="lbl">' + iGet + ' വസ്തുക്കൾ</div></div><div><div class="lbl">ഞാൻ കൊടുക്കാനുള്ളത്</div><div class="v out num">' + money(tGive) + '</div><div class="lbl">' + iGive + " വസ്തുക്കൾ</div></div></div></div>";
    h += '<div class="seg" style="margin:14px 0 8px">' + [["all", "എല്ലാം"], ["get", "കിട്ടാനുള്ളത്"], ["give", "കൊടുക്കാനുള്ളത്"]].map((r) => '<button type="button" data-act="dues-dir" data-v="' + r[0] + '" class="' + (ui.duesDir === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + "</div>";
    let rows = all.filter((p) => { const o = p.list.filter((d) => (ui.duesShowDone || isOpenD(d)) && (ui.duesDir === "all" || d.dir === ui.duesDir)); return o.length; });
    rows.sort((a, b) => (b.st.get + b.st.give) - (a.st.get + a.st.give) || a.name.localeCompare(b.name, "ml"));
    if (!rows.length) h += '<div class="card empty"><b>' + (state.dues.length ? "ബാക്കി ഒന്നുമില്ല" : "ഒന്നും രേഖപ്പെടുത്തിയിട്ടില്ല") + "</b>ആർക്കെങ്കിലും പണമോ വസ്തുവോ കൊടുക്കാനോ ആരിൽ നിന്നെങ്കിലും കിട്ടാനോ ഉണ്ടെങ്കിൽ + അമർത്തി ചേർക്കുക.</div>";
    rows.forEach((p) => {
      const net = p.st.get - p.st.give;
      h += '<button type="button" class="chit-card" data-act="person" data-k="' + esc(p.key) + '" style="margin-bottom:10px"><div class="row"><div class="dot">' + esc(Array.from(p.name)[0] || "?") + '</div><div class="grow"><div class="trunc" style="font-weight:800">' + esc(p.name) + '</div><div class="small muted">' +
        (p.st.get ? "കിട്ടാനുള്ളത് " + money(p.st.get) : "") + (p.st.get && p.st.give ? " • " : "") + (p.st.give ? "കൊടുക്കാനുള്ളത് " + money(p.st.give) : "") + (p.st.gi || p.st.vi ? ((p.st.get || p.st.give) ? " • " : "") + (p.st.gi + p.st.vi) + " വസ്തു" : "") + "</div></div>" +
        '<div style="text-align:right"><div class="amt num ' + (net > 0 ? "in" : net < 0 ? "out" : "") + '">' + (net ? money(Math.abs(net)) : (p.st.gi + p.st.vi ? "📦" : "—")) + '</div><div class="small muted">' + (net > 0 ? "കിട്ടണം" : net < 0 ? "കൊടുക്കണം" : "") + "</div></div></div></button>";
    });
    h += '<div style="text-align:center;margin:6px 0"><button type="button" class="btn ghost sm" data-act="dues-done">' + (ui.duesShowDone ? "തീർന്നത് മറയ്ക്കുക" : "തീർന്നതും കാണിക്കുക") + "</button></div>";
    return h + '<button type="button" class="fab" data-act="add-due" aria-label="പുതിയ കണക്ക്">' + ICON.plus + "</button>";
  }
  function personSheet(key) {
    const p = people().find((x) => x.key === key);
    if (!p) { closeSheet(); render(); return; }
    state.ui.person = key;
    const ui = state.ui, list = p.list.filter((d) => (ui.duesShowDone || isOpenD(d)) && (ui.duesDir === "all" || d.dir === ui.duesDir)).sort((a, b) => b.date.localeCompare(a.date));
    const st = pStats(p);
    let b = '<div class="small muted" style="margin:-6px 0 8px">' + (p.phone ? esc(p.phone) + " • " : "") + "കിട്ടാനുള്ളത് " + money(st.get) + " • കൊടുക്കാനുള്ളത് " + money(st.give) + "</div>";
    list.forEach((d) => {
      const open = isOpenD(d);
      b += '<div class="card" style="margin-bottom:10px;box-shadow:none;' + (open ? "" : "opacity:.6") + '"><div class="row between"><span class="tag ' + (d.dir === "get" ? "pos" : "neg") + '">' + (d.dir === "get" ? "കിട്ടാനുണ്ട്" : "കൊടുക്കാനുണ്ട്") + '</span><span class="small muted">' + esc(dLabel(d.date)) + "</span></div>" +
        (d.kind === "cash" ? '<div class="num" style="font-weight:800;font-size:1.25rem;margin-top:6px">' + money(balOf(d)) + ' <span class="muted small" style="font-weight:600">/ ' + money(d.amt) + "</span></div>" : '<div style="font-weight:800;font-size:1.05rem;margin-top:6px">📦 ' + esc(d.item) + "</div>") +
        (d.note ? '<div class="small muted">' + esc(d.note) + "</div>" : "") +
        ((d.pays || []).length ? '<div class="small muted num" style="margin-top:6px">' + d.pays.map((x) => esc(dLabel(x.date)) + ": " + money(x.amt)).join(" • ") + "</div>" : "") +
        '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">' +
        (open && d.kind === "cash" ? '<button type="button" class="btn sm teal" data-act="due-pay" data-id="' + d.id + '">' + (d.dir === "get" ? "തിരികെ കിട്ടി" : "കൊടുത്തു") + "</button>" : "") +
        (open && d.kind === "item" ? '<button type="button" class="btn sm teal" data-act="due-done" data-id="' + d.id + '">' + (d.dir === "get" ? "തിരികെ കിട്ടി" : "തിരികെ കൊടുത്തു") + "</button>" : "") +
        (!open ? '<span class="tag pos">തീർന്നു</span>' : "") +
        (open && d.dir === "get" ? '<button type="button" class="btn sm ghost" data-act="due-remind" data-id="' + d.id + '">ഓർമ്മപ്പെടുത്തൽ</button>' : "") +
        '<button type="button" class="btn sm ghost" data-act="due-edit" data-id="' + d.id + '">എഡിറ്റ്</button></div></div>';
    });
    if (!list.length) b += '<div class="empty">ബാക്കി ഒന്നുമില്ല.</div>';
    openSheet({ title: p.name, body: b, noActions: true, focus: false });
    $("#sheetRoot .sheet").insertAdjacentHTML("beforeend", '<div class="actions"><button type="button" class="btn ghost" data-act="sheet-cancel">അടയ്ക്കുക</button><button type="button" class="btn gold" data-act="add-due" data-p="' + esc(p.name) + '">+ ചേർക്കുക</button></div>');
  }
  function dueForm(d, pre) {
    const e = d || { person: pre || "", phone: "", dir: "get", kind: "cash", amt: "", item: "", date: todayIso(), note: "" };
    return '<label class="field">ആളുടെ പേര്<input id="sf_person" class="input" list="peopleList" value="' + esc(e.person) + '" autocomplete="off"></label><datalist id="peopleList">' + people().map((p) => '<option value="' + esc(p.name) + '">').join("") + "</datalist>" +
      '<div class="seg" style="margin-bottom:10px" id="dirSeg"><button type="button" data-act="due-dir" data-v="get" class="' + (e.dir === "get" ? "on" : "") + '">എനിക്ക് കിട്ടാനുണ്ട്</button><button type="button" data-act="due-dir" data-v="give" class="' + (e.dir === "give" ? "on" : "") + '">ഞാൻ കൊടുക്കാനുണ്ട്</button></div>' +
      '<div class="seg" style="margin-bottom:10px" id="kindSeg"><button type="button" data-act="due-kind" data-v="cash" class="' + (e.kind === "cash" ? "on" : "") + '">പണം</button><button type="button" data-act="due-kind" data-v="item" class="' + (e.kind === "item" ? "on" : "") + '">വസ്തു</button></div>' +
      '<input type="hidden" id="sf_dir" value="' + e.dir + '"><input type="hidden" id="sf_kind" value="' + e.kind + '">' +
      '<label class="field" id="amtF" style="' + (e.kind === "cash" ? "" : "display:none") + '">തുക (₹)<input id="sf_amt" class="input amount num" inputmode="decimal" value="' + esc(e.amt) + '"></label>' +
      '<label class="field" id="itemF" style="' + (e.kind === "item" ? "" : "display:none") + '">എന്ത് വസ്തു<input id="sf_item" class="input" value="' + esc(e.item) + '" placeholder="ഉദാ: ഡ്രിൽ മെഷീൻ"></label>' +
      '<div class="row2"><label class="field">തീയതി<input id="sf_date" type="date" class="input" value="' + esc(e.date) + '"></label><label class="field">ഫോൺ (ഓപ്ഷണൽ)<input id="sf_phone" class="input" inputmode="tel" value="' + esc(e.phone || "") + '"></label></div>' +
      '<label class="field">കുറിപ്പ്<input id="sf_note" class="input" value="' + esc(e.note) + '" placeholder="ഓപ്ഷണൽ"></label>';
  }
  function readDue() {
    const person = clean(sv("person")), dir = sv("dir"), kind = sv("kind"), amt = num(sv("amt")), item = clean(sv("item")), date = sv("date");
    if (!person) return sheetErr("ആളുടെ പേര് നൽകുക.");
    if (kind === "cash" && amt <= 0) return sheetErr("തുക നൽകുക.");
    if (kind === "item" && !item) return sheetErr("വസ്തുവിന്റെ പേര് നൽകുക.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sheetErr("തീയതി നൽകുക.");
    return { person, dir, kind, amt: kind === "cash" ? amt : 0, item: kind === "item" ? item : "", date, note: clean(sv("note")), phone: clean(sv("phone")) };
  }
  const getDue = (id) => state.dues.find((d) => d.id === id);
  const duesActions = {
    "dues-dir"(el) { state.ui.duesDir = el.dataset.v; render(); },
    "dues-done"() { state.ui.duesShowDone = !state.ui.duesShowDone; render(); },
    person(el) { personSheet(el.dataset.k); },
    "add-due"(el) {
      const pre = el.dataset.p || "";
      openSheet({ title: "പുതിയ കണക്ക്", ok: "സേവ്", focus: !pre, body: dueForm(null, pre), onOk() { const f = readDue(); if (!f) return false; state.dues.push(Object.assign({ id: uid("d"), pays: [], done: false, ts: Date.now() }, f)); persist(); toast("ചേർത്തു."); render(); if (state.ui.person) personSheet(norm(f.person)); } });
    },
    "due-dir"(el) { $("#sf_dir").value = el.dataset.v; $$("#dirSeg button").forEach((b) => b.classList.toggle("on", b === el)); },
    "due-kind"(el) { $("#sf_kind").value = el.dataset.v; $$("#kindSeg button").forEach((b) => b.classList.toggle("on", b === el)); $("#amtF").style.display = el.dataset.v === "cash" ? "" : "none"; $("#itemF").style.display = el.dataset.v === "item" ? "" : "none"; },
    "due-edit"(el) {
      const d = getDue(el.dataset.id); if (!d) return;
      openSheet({
        title: "എഡിറ്റ്", ok: "സേവ്", focus: false, body: dueForm(d),
        extra: '<button type="button" class="btn danger" data-act="due-del" data-id="' + d.id + '">ഇല്ലാതാക്കുക</button>',
        onOk() { const f = readDue(); if (!f) return false; Object.assign(d, f); persist(); render(); personSheet(norm(d.person)); }
      });
    },
    "due-del"(el) {
      const d = getDue(el.dataset.id); if (!d) return;
      confirmBox("ഇല്ലാതാക്കണോ?", d.person + " — " + (d.kind === "cash" ? money(d.amt) : d.item), "ഇല്ലാതാക്കുക", () => { state.dues = state.dues.filter((x) => x.id !== d.id); persist(); render(); personSheet(norm(d.person)); });
    },
    "due-pay"(el) {
      const d = getDue(el.dataset.id); if (!d) return;
      openSheet({
        title: (d.dir === "get" ? "തിരികെ കിട്ടിയ തുക" : "കൊടുത്ത തുക") + " — " + d.person,
        body: '<div class="muted small" style="margin-bottom:8px">ബാക്കി ' + money(balOf(d)) + '</div><label class="field">തുക (₹)<input id="sf_amt" class="input amount num" inputmode="decimal" value="' + balOf(d) + '"></label><label class="field">തീയതി<input id="sf_date" type="date" class="input" value="' + todayIso() + '"></label>',
        ok: "രേഖപ്പെടുത്തുക",
        onOk() { const a = num(sv("amt")); if (a <= 0) return sheetErr("തുക നൽകുക."); if (a > balOf(d)) return sheetErr("ബാക്കി തുകയേക്കാൾ കൂടുതലാണ്."); (d.pays = d.pays || []).push({ id: uid("p"), amt: a, date: sv("date") || todayIso() }); if (balOf(d) <= 0) d.done = true; persist(); render(); personSheet(norm(d.person)); }
      });
    },
    "due-done"(el) { const d = getDue(el.dataset.id); if (!d) return; d.done = true; d.doneAt = todayIso(); persist(); render(); personSheet(norm(d.person)); },
    "due-remind"(el) {
      const d = getDue(el.dataset.id); if (!d) return;
      const t = "അസ്സലാമു അലൈക്കും " + d.person + ",\n" + (d.kind === "cash" ? "ബാക്കിയുള്ള " + money(balOf(d)) + " തരുന്ന കാര്യം ഓർമ്മപ്പെടുത്തുന്നു." : "'" + d.item + "' തിരികെ തരുന്ന കാര്യം ഓർമ്മപ്പെടുത്തുന്നു.") + "\nനന്ദി.";
      let ph = String(d.phone || "").replace(/\D/g, ""); if (ph.length === 10) ph = "91" + ph;
      if (ph) window.open("https://wa.me/" + ph + "?text=" + encodeURIComponent(t), "_blank"); else shareText(t);
    }
  };

  /* =====================================================================
     SETTINGS, LOCK, BACKUP
     ===================================================================== */
  async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kk1|" + s)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  let locked = false, hiddenAt = 0;
  function applyTheme() { const t = state.settings.theme; if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }
  const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
  const hasData = () => state.chits.length || state.tx.length || state.dues.length;
  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ente-kanakku-backup-" + todayIso() + ".json";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    state.settings.lastBackup = new Date().toISOString(); persist();
  }
  const coreActions = {
    tab(el) { state.ui.tab = el.dataset.t; persist(); render(); window.scrollTo(0, 0); },
    "sheet-cancel"() { state.ui.person = null; closeSheet(); },
    "sheet-bg"() { state.ui.person = null; closeSheet(); },
    "sheet-ok"() { if (!sheet || !sheet.onOk) return; const r = sheet.onOk(); if (r !== false) { const cur = sheet; setTimeout(() => { if (sheet === cur) closeSheet(); }, 0); } },
    backup() { exportBackup(); toast("ബാക്കപ്പ് ഫയൽ ഡൗൺലോഡ് ചെയ്തു. സുരക്ഷിതമായി സൂക്ഷിക്കുക."); settingsSheet(); },
    "theme"(el) { state.settings.theme = el.dataset.v; persist(); applyTheme(); $$("#themeSeg button").forEach((b) => b.classList.toggle("on", b === el)); },
    "set-pin"() {
      openSheet({ title: state.settings.pin ? "പിൻ മാറ്റുക" : "ആപ്പ് ലോക്ക് പിൻ", ok: "സേവ്", body: '<label class="field">പുതിയ പിൻ (കുറഞ്ഞത് 4 അക്കം)<input id="sf_p1" type="password" inputmode="numeric" class="input" autocomplete="off"></label><label class="field">ഒരിക്കൽ കൂടി<input id="sf_p2" type="password" inputmode="numeric" class="input" autocomplete="off"></label>',
        async onOk() { const a = sv("p1"), b = sv("p2"); if (a.length < 4) return sheetErr("കുറഞ്ഞത് 4 അക്കം വേണം."); if (a !== b) return sheetErr("പിൻ പൊരുത്തപ്പെടുന്നില്ല."); state.settings.pin = await sha(a); persist(); closeSheet(); toast("ആപ്പ് ലോക്ക് ഓണാക്കി."); } });
    },
    "rm-pin"() { confirmBox("ലോക്ക് ഒഴിവാക്കണോ?", "ആപ്പ് തുറക്കാൻ ഇനി പിൻ വേണ്ടിവരില്ല.", "ഒഴിവാക്കുക", () => { state.settings.pin = ""; persist(); toast("ലോക്ക് ഒഴിവാക്കി."); }); },
    "del-cat"(el) { const t = el.dataset.t, c = el.dataset.c; if (state.tx.some((x) => x.type === t && x.cat === c)) return toast("ഈ വിഭാഗത്തിൽ ഇടപാടുകൾ ഉള്ളതിനാൽ ഒഴിവാക്കാൻ പറ്റില്ല.", true); state.cats[t] = state.cats[t].filter((x) => x !== c); persist(); settingsSheet(); },
    unlock: async () => {
      const v = $("#lockIn").value; if (!v) return;
      if ((await sha(v)) === state.settings.pin) { locked = false; render(); } else { const e = $("#lockErr"); e.hidden = false; $("#lockIn").value = ""; }
    }
  };
  function settingsSheet() {
    const s = state.settings, ds = daysSince(s.lastBackup);
    const custom = (t) => state.cats[t].filter((c) => DEF_CATS[t].indexOf(c) < 0);
    openSheet({
      title: "ക്രമീകരണങ്ങൾ", noActions: true, focus: false,
      body: '<div class="field">രൂപം</div><div class="seg" id="themeSeg" style="margin-bottom:14px">' + [["auto", "ഓട്ടോ"], ["light", "വെളുപ്പ്"], ["dark", "ഇരുട്ട്"]].map((t) => '<button type="button" data-act="theme" data-v="' + t[0] + '" class="' + (s.theme === t[0] ? "on" : "") + '">' + t[1] + "</button>").join("") + "</div>" +
        '<div class="field">ആപ്പ് ലോക്ക്</div><div class="row" style="margin-bottom:14px"><button type="button" class="btn ghost sm" data-act="set-pin">' + (s.pin ? "പിൻ മാറ്റുക" : "പിൻ സെറ്റ് ചെയ്യുക") + "</button>" + (s.pin ? '<button type="button" class="btn ghost sm" data-act="rm-pin">ഒഴിവാക്കുക</button>' : "") + "</div>" +
        '<div class="field">ബാക്കപ്പ്</div><div class="muted small" style="margin-bottom:8px">ഡാറ്റ ഈ ഫോണിൽ മാത്രമാണ് ഉള്ളത്. ഫോൺ മാറ്റുകയോ ബ്രൗസർ ഡാറ്റ മായ്ക്കുകയോ ചെയ്താൽ നഷ്ടപ്പെടും. ഇടയ്ക്കിടെ ബാക്കപ്പ് എടുത്ത് WhatsApp / Drive-ൽ സൂക്ഷിക്കുക.' + (s.lastBackup ? " അവസാന ബാക്കപ്പ്: " + (ds === 0 ? "ഇന്ന്" : ds + " ദിവസം മുമ്പ്") + "." : " ഇതുവരെ ബാക്കപ്പ് എടുത്തിട്ടില്ല.") + '</div><div class="row" style="margin-bottom:14px"><button type="button" class="btn teal sm" data-act="backup">ബാക്കപ്പ് എടുക്കുക</button><button type="button" class="btn ghost sm" data-act="restore">ബാക്കപ്പ് തിരിച്ചെടുക്കുക</button></div>' +
        '<input type="file" id="restoreFile" accept="application/json,.json" hidden>' +
        (custom("out").length || custom("in").length ? '<div class="field">നിങ്ങൾ ചേർത്ത വിഭാഗങ്ങൾ</div><div class="chips" style="flex-wrap:wrap;overflow:visible">' + custom("out").map((c) => '<button type="button" class="chip" data-act="del-cat" data-t="out" data-c="' + esc(c) + '">' + esc(c) + " ✕</button>").join("") + custom("in").map((c) => '<button type="button" class="chip" data-act="del-cat" data-t="in" data-c="' + esc(c) + '">' + esc(c) + " (വരവ്) ✕</button>").join("") + "</div>" : "")
    });
    $("#sheetRoot .sheet").insertAdjacentHTML("beforeend", '<div class="actions"><button type="button" class="btn ghost" data-act="sheet-cancel">അടയ്ക്കുക</button></div>');
  }
  Object.assign(coreActions, {
    restore() { $("#restoreFile").click(); }
  });

  /* =====================================================================
     RENDER & EVENTS
     ===================================================================== */
  const TABS = [["chit", "ചിട്ടി", "chit"], ["fin", "വരവ്-ചെലവ്", "wallet"], ["dues", "കണക്ക്", "swap"]];
  function render() {
    const y = window.scrollY, ui = state.ui, root = $("#root");
    if (locked) {
      root.innerHTML = '<div class="lock"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#e8a317" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><div style="font-weight:800;font-size:1.3rem">എന്റെ കണക്ക്</div><input id="lockIn" type="password" inputmode="numeric" autocomplete="off" aria-label="പിൻ"><p id="lockErr" class="err" hidden style="color:#ffab9b">പിൻ ശരിയല്ല.</p><button type="button" class="btn" data-act="unlock">തുറക്കുക</button></div>';
      setTimeout(() => { const i = $("#lockIn"); if (i) i.focus(); }, 50);
      return;
    }
    const titles = { chit: "ചിട്ടി", fin: "വരവ്-ചെലവ്", dues: "കൊടുക്കാനും കിട്ടാനും" };
    const ds = daysSince(state.settings.lastBackup);
    const nudge = hasData() && (ds === null || ds > 30) ? '<div class="card" style="margin-bottom:12px;background:var(--gold-soft);box-shadow:none"><div class="row"><div class="grow small">' + (ds === null ? "ഇതുവരെ ബാക്കപ്പ് എടുത്തിട്ടില്ല." : "ബാക്കപ്പ് എടുത്തിട്ട് " + ds + " ദിവസമായി.") + ' ഡാറ്റ ഫോണിൽ മാത്രമാണ്.</div><button type="button" class="btn gold sm" data-act="backup">ബാക്കപ്പ്</button></div></div>' : "";
    const body = ui.tab === "fin" ? financeTab() : ui.tab === "dues" ? duesTab() : chitTab();
    root.innerHTML = '<header class="top"><div class="wrap"><h1>' + titles[ui.tab] + '</h1><button type="button" class="icon-btn" data-act="settings" aria-label="ക്രമീകരണങ്ങൾ">' + ICON.gear + '</button></div></header><main class="wrap">' + nudge + body + "</main>" +
      '<nav class="nav" aria-label="പ്രധാന മെനു"><div class="wrap">' + TABS.map((t) => '<button type="button" data-act="tab" data-t="' + t[0] + '" class="' + (ui.tab === t[0] ? "on" : "") + '" ' + (ui.tab === t[0] ? 'aria-current="page"' : "") + ">" + ICON[t[2]] + "<span>" + t[1] + "</span></button>").join("") + "</div></nav>";
    window.scrollTo(0, y);
    bindCharts();
  }
  const ALL = Object.assign({}, coreActions, chitActions, finActions, duesActions, { settings: settingsSheet });

  function wire() {
    document.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-act]"); if (!el) return;
      if (el.dataset.act === "sheet-bg" && ev.target !== el) return;
      const fn = ALL[el.dataset.act]; if (fn) fn(el, ev);
    });
    document.addEventListener("change", (ev) => {
      if (ev.target.dataset && ev.target.dataset.chg) chitChange(ev.target);
      if (ev.target.id === "restoreFile" && ev.target.files[0]) {
        const f = ev.target.files[0], r = new FileReader();
        r.onload = () => {
          try {
            const j = JSON.parse(r.result); if (!j || !Array.isArray(j.chits) || !Array.isArray(j.tx) || !Array.isArray(j.dues)) throw new Error("bad");
            confirmBox("ബാക്കപ്പ് തിരിച്ചെടുക്കണോ?", "ഇപ്പോഴുള്ള എല്ലാ ഡാറ്റയും ഈ ബാക്കപ്പ് കൊണ്ട് മാറ്റും (" + j.chits.length + " ചിട്ടി, " + j.tx.length + " ഇടപാട്, " + j.dues.length + " കണക്ക്).", "തിരിച്ചെടുക്കുക", () => { adopt(j); state.settings.lastBackup = state.settings.lastBackup || ""; persist(); applyTheme(); toast("തിരിച്ചെടുത്തു."); render(); }, true);
          } catch (e) { toast("ഇത് ശരിയായ ബാക്കപ്പ് ഫയൽ അല്ല.", true); }
        };
        r.readAsText(f);
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && sheet) { state.ui.person = null; closeSheet(); return; }
      if (ev.key === "Enter" && locked && ev.target.id === "lockIn") { coreActions.unlock(); return; }
      if (ev.key === "Enter" && sheet && ev.target.tagName === "INPUT" && ev.target.type !== "file" && !sheet.noActions) { ev.preventDefault(); coreActions["sheet-ok"](); return; }
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.getAttribute && ev.target.getAttribute("role") === "button" && ev.target.dataset.act) { ev.preventDefault(); ev.target.click(); }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); persistNow(); }
      else if (state.settings.pin && hiddenAt && Date.now() - hiddenAt > 60000) { locked = true; closeSheet(); render(); }
    });
    window.addEventListener("pagehide", persistNow);
  }

  async function boot() {
    await load(); applyTheme();
    locked = !!state.settings.pin;
    wire(); render();
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) navigator.serviceWorker.register("sw.js").catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (window.__KK_TEST) window.__KK = { state: () => state, render, ALL, coreActions };
  }
  boot();
})();
