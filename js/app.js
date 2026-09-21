/* ═══ إشراف المدرسة — التطبيق ═══ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var view = $('view');
  var DB = FB.DB, Auth = FB.Auth, CFG = FB.cfg;
  var C = FB.col;   /* اسمُ المجموعة بالبادئة: C('days') → es_days */

  /* ---------------- الأنواعُ والثوابت ---------------- */
  var TYPES = [
    { key: 'late', label: 'تأخيرٌ صباحي', short: 'تأخير', color: 'var(--c-late)', hex: '#D9A441', plural: 'تأخيرات' },
    { key: 'absent', label: 'غياب', short: 'غياب', color: 'var(--c-absent)', hex: '#A63D2F', plural: 'أيامَ غياب' },
    { key: 'sick', label: 'مرضيّة', short: 'مرضيّة', color: 'var(--c-sick)', hex: '#2E86AB', plural: 'مرضيّات' },
    { key: 'sleep', label: 'نومٌ في الحصّة', short: 'نوم', color: 'var(--c-sleep)', hex: '#6A4C93', plural: 'حالاتِ نوم' },
    { key: 'viol', label: 'مخالفة', short: 'مخالفة', color: 'var(--c-viol)', hex: '#8C2F5B', plural: 'مخالفات' },
    { key: 'expel', label: 'الفصلُ عن الدراسة', short: 'فصل', color: 'var(--c-expel)', hex: '#701C1C', plural: 'حالاتِ فصل' },
    { key: 'pledge', label: 'تعهّد', short: 'تعهّد', color: 'var(--c-pledge)', hex: '#1E7A46', plural: 'تعهّدات' },
    { key: 'note', label: 'ملاحظة', short: 'ملاحظة', color: 'var(--c-note)', hex: '#7A6A58', plural: 'ملاحظات' }
  ];
  var TYPE = {}; TYPES.forEach(function (t) { TYPE[t.key] = t; });
  var VIOL_KEYS = ['dismiss', 'banned', 'uniform', 'behavior'];
  var ABS = { unexcused: 'بلا عذر', excused: 'بعذر' };
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  var ICO = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z"/><path d="M13 7l4 4"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 9V4h10v5M7 14h10v6H7z"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>'
  };

  /* ---------------- أدواتٌ عامّة ---------------- */
  function ar(n) { return String(n == null ? '' : n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return iso(new Date()); }
  function pd(s) { return new Date(s + 'T00:00:00'); }
  function addDays(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return iso(d); }
  function fmtDate(s, withDay) { if (!s) return ''; var d = pd(s); return (withDay ? DAYS[d.getDay()] + ' ' : '') + ar(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + ar(d.getFullYear()); }
  function hijri(d) { try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { return ''; } }
  function hm(d) { d = d || new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function hm2m(s) { var p = String(s || '').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function fmtHM(s) { if (!s) return ''; var p = s.split(':'), h = +p[0], ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return ar(h + ':' + p[1]) + ' ' + ap; }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toast(msg, bad) { var t = $('toast'); t.textContent = msg; t.className = 'toast on' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, bad ? 4200 : 2400); }
  function initials(n) { return (n || '؟').trim().split(/\s+/)[0].slice(0, 2); }
  function fail(e) { console.error(e); toast(e && e.message || 'حدث خطأ', true); }
  function fmtTs(ts) { var d = new Date(ts); return fmtDate(iso(d)) + ' ' + fmtHM(hm(d)); }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function plural(n, one, two, many, none) { n = +n || 0; if (!n) return none || ('لا ' + many); if (n === 1) return one; if (n === 2) return two; if (n <= 10) return ar(n) + ' ' + many; return ar(n) + ' ' + one; }
  function daysBetween(a, b) { return Math.round((pd(b) - pd(a)) / 864e5) + 1; }
  function isWeekend(s) { var g = pd(s).getDay(); return g === 5 || g === 6; }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function downloadBlob(name, content, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function downloadCSV(name, rows) { var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n'); downloadBlob(name, csv, 'text/csv;charset=utf-8'); }

  /* ---------------- الحالة ---------------- */
  var S = { user: null, role: 'owner', settings: null, classes: null, all: null, date: today(), period: 'term', q: '' };
  var LS = { get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: function (k) { try { localStorage.removeItem(k); } catch (e) { } } };
  function RO() { return S.role !== 'owner'; }

  function defaultSettings() {
    var y = new Date().getFullYear(), m = new Date().getMonth(); if (m < 7) y--;
    return {
      school: CFG.SCHOOL || 'المدرسة', supervisor: CFG.SUPERVISOR || 'المشرف', year: y + '-' + (y + 1),
      terms: [{ id: 't1', name: 'الفصلُ الدراسيُّ الأوّل', start: y + '-09-01', end: (y + 1) + '-01-15' }, { id: 't2', name: 'الفصلُ الدراسيُّ الثاني', start: (y + 1) + '-01-20', end: (y + 1) + '-06-15' }],
      grades: [{ id: '10', name: 'الصفُّ العاشر', short: '١٠' }, { id: '11', name: 'الصفُّ الحاديَ عشر', short: '١١' }, { id: '12', name: 'الصفُّ الثانيَ عشر', short: '١٢' }],
      periods: 7, lateAfter: '07:15',
      alerts: { late: 3, absent: 3, viol: 2, sleep: 3 },
      weights: { late: -1, absent: -3, sick: 0, sleep: -1, viol: -3, expel: -10, pledge: 0, note: 0 },
      violCats: { dismiss: 'فصلٌ من الحصّة', banned: 'ممنوعات', uniform: 'الزيُّ المدرسي', behavior: 'السلوك' },
      bannedItems: ['هاتف', 'سمّاعات', 'سجائر / فيب', 'أدواتٌ حادّة', 'أخرى'],
      actions: ['تنبيهٌ شفهي', 'إنذارٌ كتابي', 'استدعاءُ وليِّ الأمر', 'تعهّدٌ خطّي', 'تحويلٌ للإدارة'],
      sickSources: ['مستوصف', 'مستشفى', 'عيادةٌ خاصّة', 'عذرُ وليِّ الأمر'],
      expelReasons: [{ reason: 'التدخين', days: 3 }, { reason: 'حملُ أدواتِ تدخين', days: 1 }, { reason: 'شجار', days: 7 }, { reason: 'سلوكٌ مشاغبٌ معَ المعلم', days: 7 }],
      pledgeText: 'أتعهّدُ أنا الطالبَ المذكورَ أعلاه بالالتزامِ بأنظمةِ المدرسةِ ولوائحِها، وعدمِ تكرارِ المخالفةِ المذكورة، وأتحمّلُ ما يترتّبُ على تكرارِها من إجراءاتٍ نظاميّة.',
      viewers: []
    };
  }
  function normSettings(st) {
    var d = defaultSettings(); st = st || {};
    Object.keys(d).forEach(function (k) { if (st[k] === undefined || st[k] === null) st[k] = d[k]; });
    ['alerts', 'weights', 'violCats'].forEach(function (k) { st[k] = Object.assign({}, d[k], st[k] || {}); });
    if (!Array.isArray(st.terms) || !st.terms.length) st.terms = d.terms;
    if (!Array.isArray(st.grades) || !st.grades.length) st.grades = d.grades;
    if (!Array.isArray(st.expelReasons) || !st.expelReasons.length) st.expelReasons = d.expelReasons;
    delete st._id; delete st._path;
    return st;
  }
  function gradeName(id) { var g = (S.settings.grades || []).filter(function (x) { return x.id === id; })[0]; return g ? g.name : (id || ''); }
  function gradeShort(id) { var g = (S.settings.grades || []).filter(function (x) { return x.id === id; })[0]; return g ? g.short : (id || ''); }
  function currentTerm(d) {
    d = d || today();
    var ts = S.settings.terms || [];
    for (var i = 0; i < ts.length; i++) if (d >= ts[i].start && d <= ts[i].end) return ts[i];
    var past = ts.filter(function (t) { return t.end < d; }); if (past.length) return past[past.length - 1];
    return ts[0] || { id: 't', name: 'المدّة', start: addDays(d, -90), end: d };
  }
  function cls(id) { return (S.classes || []).filter(function (c) { return c._id === id; })[0]; }
  function activeClasses() { return (S.classes || []).filter(function (c) { return !c.archived; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'ar'); }); }
  function findStudent(cid, sid) { var c = cls(cid); if (!c) return null; var s = (c.students || []).filter(function (x) { return x.id === sid; })[0]; return s ? { c: c, s: s } : null; }
  function allStudents() { var out = []; activeClasses().forEach(function (c) { (c.students || []).forEach(function (s) { out.push({ c: c, s: s }); }); }); return out; }
  function norm(s) { return String(s || '').replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function searchStudents(q, limit) {
    q = norm(q); if (!q) return [];
    var parts = q.split(' ');
    return allStudents().filter(function (x) { var n = norm(x.s.name) + ' ' + norm(x.c.name) + ' ' + String(x.s.no || ''); return parts.every(function (p) { return n.indexOf(p) >= 0; }); }).slice(0, limit || 30);
  }

  /* ---------------- الطابورُ بلا إنترنت ---------------- */
  var QKEY = 'es_queue_v1';
  function queue() { return LS.get(QKEY, []); }
  function setQueue(q) { LS.set(QKEY, q); renderNet(); }
  async function write(op, col, id, data) {
    if (RO()) throw new Error('حسابُك للقراءةِ فقط');
    if (queue().length || !navigator.onLine) { pushQ(op, col, id, data); flush(); return; }
    try { return await (op === 'del' ? DB.del(col, id) : DB.set(col, id, data)); }
    catch (e) { if (FB.isNetErr(e)) { pushQ(op, col, id, data); toast('لا شبكة — حُفظ محلّياً وسيُرسَلُ لاحقاً'); return; } throw e; }
  }
  function pushQ(op, col, id, data) { var q = queue().filter(function (x) { return !(x.col === col && x.id === id); }); q.push({ op: op, col: col, id: id, data: data, ts: Date.now() }); setQueue(q); }
  var flushing = false;
  async function flush() {
    if (flushing) return; var q = queue(); if (!q.length || !navigator.onLine) return;
    flushing = true;
    while (q.length) {
      var it = q[0];
      try { await (it.op === 'del' ? DB.del(it.col, it.id) : DB.set(it.col, it.id, it.data)); q.shift(); setQueue(q); }
      catch (e) { if (FB.isNetErr(e)) break; q.shift(); setQueue(q); toast('رُفض تسجيلٌ مؤجَّل: ' + e.message, true); }
    }
    flushing = false; renderNet(); if (!queue().length) toast('أُرسلت التسجيلاتُ المؤجَّلة');
  }
  window.addEventListener('online', function () { renderNet(); flush(); });
  window.addEventListener('offline', renderNet);
  function renderNet() {
    var bar = $('netbar'); if (!bar) return;
    var n = queue().length;
    if (navigator.onLine && !n) { bar.hidden = true; return; }
    bar.hidden = false; bar.className = 'netbar' + (navigator.onLine ? ' ok' : '');
    bar.innerHTML = navigator.onLine ? '<span>' + ar(n) + ' تسجيلاً بانتظارِ الإرسال</span><button id="flushBtn">أرسلِ الآن</button>' : '<span>بلا إنترنت — التسجيلاتُ تُحفَظُ محلّياً' + (n ? ' (' + ar(n) + ' بانتظارِ الإرسال)' : '') + '</span>';
    var fb = $('flushBtn'); if (fb) fb.onclick = flush;
  }

  /* ---------------- سجلُّ النشاط ---------------- */
  async function log(act, detail) {
    if (RO()) return;
    var id = 'log_' + today().slice(0, 7);
    var doc = S.logCache && S.logCache._id === id ? S.logCache : (await DB.get(C('log'), id).catch(function () { return null; })) || { items: [] };
    doc.items = (doc.items || []).concat([{ ts: Date.now(), act: act, d: String(detail || ''), by: (S.user && S.user.email) || '' }]).slice(-800);
    S.logCache = Object.assign({ _id: id }, doc);
    write('set', C('log'), id, { items: doc.items }).catch(function () { });
  }

  /* ---------------- تحميلُ النواة: الإعداداتُ والفصول ---------------- */
  var CORE_KEY = 'es_core_v1';
  function persistCore() { LS.set(CORE_KEY, { at: Date.now(), settings: S.settings, classes: S.classes }); }
  async function loadCore(force) {
    if (S.settings && S.classes && !force) return;
    var ls = LS.get(CORE_KEY);
    if (!navigator.onLine && ls) { S.settings = normSettings(ls.settings); S.classes = ls.classes || []; return; }
    try {
      var r = await Promise.all([DB.get(C('meta'), 'settings'), DB.list(C('classes'))]);
      S.settings = normSettings(r[0]); S.classes = r[1] || [];
      persistCore();
    } catch (e) {
      if (ls && (FB.isNetErr(e))) { S.settings = normSettings(ls.settings); S.classes = ls.classes || []; toast('عرضُ آخرِ نسخةٍ محفوظة'); return; }
      throw e;
    }
  }
  function saveSettings() { persistCore(); return write('set', C('meta'), 'settings', S.settings); }
  function saveAccess() { return write('set', C('meta'), 'access', { viewers: (S.settings.viewers || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(Boolean) }); }
  async function saveClass(c) {
    var data = {}; Object.keys(c).forEach(function (k) { if (k[0] !== '_') data[k] = c[k]; });
    if (!cls(c._id)) S.classes.push(c);
    persistCore();
    await write('set', C('classes'), c._id, data);
  }
  async function deleteClass(c) {
    S.classes = S.classes.filter(function (x) { return x._id !== c._id; }); persistCore();
    await write('del', C('classes'), c._id, {});
  }

  /* ---------------- الأيّام: وثيقةٌ واحدةٌ للمدرسةِ كلِّها في اليوم ---------------- */
  var DAYS_KEY = 'es_days_v1';
  function persistDays() { LS.set(DAYS_KEY, { at: S.all.at, map: S.all.map }); }
  function withQueue(map) {
    queue().forEach(function (q) { if (q.col === C('days')) { if (q.op === 'del') delete map[q.id]; else map[q.id] = Object.assign({ _id: q.id }, q.data); } });
    return map;
  }
  async function loadAll(force) {
    if (S.all && !force && Date.now() - S.all.at < 10 * 60 * 1000) return S.all.map;
    var ls = LS.get(DAYS_KEY);
    if (!navigator.onLine && ls) { S.all = { at: 0, map: withQueue(ls.map || {}) }; return S.all.map; }
    try {
      var rows = await DB.list(C('days'));
      var map = {}; rows.forEach(function (r) { map[r.date] = r; });
      S.all = { at: Date.now(), map: withQueue(map) }; persistDays();
      return S.all.map;
    } catch (e) { if (ls) { S.all = { at: 0, map: withQueue(ls.map || {}) }; toast('عرضُ آخرِ نسخةٍ محفوظة'); return S.all.map; } throw e; }
  }
  async function loadDay(date) {
    if (S.all && S.all.map[date] !== undefined && Date.now() - S.all.at < 10 * 60 * 1000) return S.all.map[date];
    if (!S.all) { var ls = LS.get(DAYS_KEY); S.all = { at: 0, map: withQueue((ls && ls.map) || {}) }; }
    try { var d = await DB.get(C('days'), date); S.all.map[date] = d || null; persistDays(); return d; }
    catch (e) { if (FB.isNetErr(e)) return S.all.map[date] || null; throw e; }
  }
  async function saveDay(date, ev) {
    if (!S.all) S.all = { at: 0, map: {} };
    if (!ev.length) { S.all.map[date] = null; persistDays(); await write('del', C('days'), date, {}); return; }
    var sids = {}, clss = {};
    ev.forEach(function (e) { sids[e.sid] = 1; clss[e.cls] = 1; });
    var data = { date: date, ev: ev, sids: Object.keys(sids), clss: Object.keys(clss), n: ev.length };
    S.all.map[date] = Object.assign({ _id: date }, data); persistDays();
    await write('set', C('days'), date, data);
  }
  function dayEvents(date) { var d = S.all && S.all.map[date]; return (d && d.ev) || []; }
  async function addEvent(date, ev) {
    var cur = (await loadDay(date)); var list = ((cur && cur.ev) || []).slice();
    ev.id = ev.id || uid('e'); ev.ts = ev.ts || Date.now();
    list.push(cleanEv(ev)); await saveDay(date, list);
    var st = findStudent(ev.cls, ev.sid); log('إضافة ' + TYPE[ev.type].short, (st ? st.s.name : ev.sid) + ' · ' + date);
    if (ev.type === 'late') await autoAbsenceFromLate(ev, date);
    return ev;
  }
  /* كلُّ ٥ تأخيراتٍ (تراكمياً) = غيابٌ واحدٌ بلا عذر بتاريخِ التأخيرِ الخامس — تلقائياً من الآن فصاعداً فقط */
  async function autoAbsenceFromLate(ev, date) {
    try {
      await loadAll();
      var n = evsIn('0001-01-01', '9999-12-31', function (e) { return e.sid === ev.sid && e.type === 'late'; }).length;
      if (n % 5 !== 0) return;
      if (dayEvents(date).some(function (x) { return x.sid === ev.sid && x.type === 'absent'; })) return;
      await addEvent(date, { sid: ev.sid, cls: ev.cls, type: 'absent', sub: 'unexcused', reason: 'تلقائيّ — تكرارُ التأخيرِ (٥ تأخيرات)' });
    } catch (e) { console.error(e); }
  }
  async function updateEvent(date, ev) {
    var list = dayEvents(date).map(function (x) { return x.id === ev.id ? cleanEv(ev) : x; });
    await saveDay(date, list); log('تعديل ' + TYPE[ev.type].short, ev.id + ' · ' + date);
  }
  async function removeEvent(date, id) {
    var old = dayEvents(date).filter(function (x) { return x.id === id; })[0];
    var list = dayEvents(date).filter(function (x) { return x.id !== id; });
    await saveDay(date, list); if (old) { var st = findStudent(old.cls, old.sid); log('حذف ' + TYPE[old.type].short, (st ? st.s.name : old.sid) + ' · ' + date); }
  }
  function cleanEv(e) { var o = {}; Object.keys(e).forEach(function (k) { if (e[k] !== undefined && e[k] !== null && e[k] !== '') o[k] = e[k]; }); return o; }

  /* أحداثٌ في مدّة: from..to (شاملَين) مع مرشِّح اختياري */
  function evsIn(from, to, f) {
    var out = [], map = (S.all && S.all.map) || {};
    Object.keys(map).sort().forEach(function (d) { if (d < from || d > to || !map[d]) return; (map[d].ev || []).forEach(function (e) { if (!f || f(e)) out.push(Object.assign({ date: d }, e)); }); });
    return out;
  }
  function countBy(evs) { var c = { late: 0, absent: 0, unexcused: 0, sick: 0, sleep: 0, viol: 0, expel: 0, pledge: 0, note: 0, sickDays: 0, lateMin: 0, expelDays: 0 }; evs.forEach(function (e) { c[e.type] = (c[e.type] || 0) + 1; if (e.type === 'absent' && e.sub !== 'excused') c.unexcused++; if (e.type === 'sick') c.sickDays += (+e.days || 1); if (e.type === 'late') c.lateMin += (+e.min || 0); if (e.type === 'expel') c.expelDays += (+e.days || 0); }); return c; }
  function score(evs) { var w = S.settings.weights; return Math.round(evs.reduce(function (s, e) { return s + num(w[e.type], 0); }, 0) * 10) / 10; }
  function scoreHTML(v) { return '<span class="score ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : '') + '">' + (v > 0 ? '+' : '') + ar(v) + '</span>'; }
  function periodRange() {
    var t = currentTerm(), p = S.period;
    if (p === 'term') return { from: t.start, to: t.end, label: t.name };
    if (p === 'month') { var m = today().slice(0, 7); return { from: m + '-01', to: m + '-31', label: MONTHS[+m.slice(5) - 1] }; }
    if (p === 'week') { var d = pd(today()); d.setDate(d.getDate() - d.getDay()); return { from: iso(d), to: addDays(iso(d), 6), label: 'هذا الأسبوع' }; }
    if (p === 'custom' && S.from && S.to) return { from: S.from, to: S.to, label: fmtDate(S.from) + ' – ' + fmtDate(S.to) };
    return { from: '2000-01-01', to: '2999-12-31', label: 'كلُّ المدّة' };
  }
  function filtersHTML() {
    var p = S.period;
    return '<div class="filters noprint"><div class="seg" id="pseg">' + [['term', currentTerm().name], ['month', 'هذا الشهر'], ['week', 'هذا الأسبوع'], ['all', 'الكلّ'], ['custom', 'مدّة']].map(function (x) { return '<button data-p="' + x[0] + '" aria-pressed="' + (p === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>'
      + '<span id="prange"' + (p === 'custom' ? '' : ' hidden') + '><input type="date" id="pfrom" value="' + (S.from || '') + '"> – <input type="date" id="pto" value="' + (S.to || '') + '"></span></div>';
  }
  function bindFilters(rerender) {
    document.querySelectorAll('#pseg button').forEach(function (b) { b.onclick = function () { S.period = b.dataset.p; if (S.period === 'custom' && !(S.from && S.to)) { S.from = addDays(today(), -30); S.to = today(); } rerender(); }; });
    var f = $('pfrom'), t = $('pto'); if (f) f.onchange = function () { S.from = f.value; rerender(); }; if (t) t.onchange = function () { S.to = t.value; rerender(); };
  }
  /* الأعمدةُ الأسبوعية */
  function weekBuckets(evs, from, to) {
    var start = pd(from); start.setDate(start.getDate() - start.getDay());
    var end = pd(to); if (end > new Date()) end = new Date();
    var out = [], cur = new Date(start), i = 1;
    while (cur <= end) {
      var a = iso(cur), b = addDays(a, 6), vals = {};
      evs.forEach(function (e) { if (e.date >= a && e.date <= b) vals[e.type] = (vals[e.type] || 0) + 1; });
      out.push({ label: 'أ' + ar(i++), sub: ar(pd(a).getDate()) + '/' + ar(pd(a).getMonth() + 1), vals: vals });
      cur.setDate(cur.getDate() + 7);
    }
    return out.slice(-16);
  }
  var SERIES = TYPES.map(function (t) { return { key: t.key, label: t.short, color: t.hex }; });
  var COLORS = {}; TYPES.forEach(function (t) { COLORS[t.key] = t.hex; });
  var LEGEND = '<div class="legend">' + TYPES.map(function (t) { return '<span><i style="background:' + t.hex + '"></i>' + t.short + '</span>'; }).join('') + '</div>';

  /* ---------------- عناصرُ واجهةٍ مشتركة ---------------- */
  function openSheet(html) { var sh = $('sheet'), bg = $('sheetBg'); sh.innerHTML = '<div class="hnd"></div>' + html; sh.hidden = false; bg.hidden = false; requestAnimationFrame(function () { sh.classList.add('on'); bg.classList.add('on'); }); var f = sh.querySelector('input:not([type=hidden]),textarea,select'); if (f && window.innerWidth > 720) setTimeout(function () { f.focus(); }, 280); }
  function closeSheet() { $('sheet').classList.remove('on'); $('sheetBg').classList.remove('on'); setTimeout(function () { $('sheet').hidden = true; $('sheetBg').hidden = true; }, 260); }
  $('sheetBg').onclick = closeSheet;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  function tilesHTML(cnt, base, six) {
    var keys = six ? ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'] : TYPES.map(function (t) { return t.key; });
    return '<div class="tiles' + (six ? ' six' : '') + '">' + keys.map(function (k) {
      var extra = k === 'absent' && cnt.unexcused ? '<div class="s">' + ar(cnt.unexcused) + ' بلا عذر</div>' : k === 'sick' && cnt.sickDays ? '<div class="s">' + ar(cnt.sickDays) + ' يوماً</div>' : k === 'late' && cnt.lateMin ? '<div class="s">' + ar(cnt.lateMin) + ' دقيقة</div>' : '';
      var inner = '<div class="v">' + ar(cnt[k] || 0) + '</div><div class="l">' + TYPE[k].short + '</div>' + extra;
      return base ? '<a class="tile ' + k + '" href="' + base + k + '">' + inner + '</a>' : '<div class="tile ' + k + '">' + inner + '</div>';
    }).join('') + '</div>';
  }
  function subLabel(e) {
    if (e.type === 'viol') return (S.settings.violCats[e.sub] || e.sub || '') + (e.item ? ' — ' + e.item : '');
    if (e.type === 'absent') return ABS[e.sub] || ABS.unexcused;
    if (e.type === 'late') return (e.time ? fmtHM(e.time) : '') + (e.min ? ' (' + ar(e.min) + ' د)' : '');
    if (e.type === 'sick') return (e.from ? fmtDate(e.from) + (e.to && e.to !== e.from ? ' – ' + fmtDate(e.to) : '') : '') + (e.days ? ' · ' + plural(e.days, 'يومٌ واحد', 'يومان', 'أيّام') : '') + (e.src ? ' · ' + e.src : '');
    if (e.type === 'pledge') return e.kind || '';
    if (e.type === 'expel') return (e.reason || '') + (e.days ? ' · ' + plural(e.days, 'يومٌ واحد', 'يومان', 'أيّام') : '') + (e.to && e.to !== e.date ? ' (حتى ' + fmtDate(e.to) + ')' : '');
    return '';
  }
  function evHTML(e, opts) {
    opts = opts || {};
    var st = findStudent(e.cls, e.sid), name = st ? st.s.name : '(طالبٌ محذوف)', cname = st ? st.c.name : '';
    var meta = [];
    if (opts.date) meta.push(fmtDate(e.date, true));
    var sl = subLabel(e); if (sl) meta.push(sl);
    if (e.period) meta.push('الحصّة ' + ar(e.period));
    if (e.teacher) meta.push('المعلّم: ' + e.teacher);
    if (e.action) meta.push('الإجراء: ' + e.action);
    if (e.guardian) meta.push('حضرَ وليُّ الأمر');
    return '<div class="ev ' + e.type + '" data-id="' + e.id + '" data-date="' + (e.date || '') + '"><span class="pip">' + TYPE[e.type].short + '</span><div class="body">'
      + (opts.noName ? '' : '<b><a href="#/student/' + e.cls + '/' + e.sid + '">' + esc(name) + '</a></b> <span class="m">' + esc(cname) + '</span> ')
      + (meta.length ? '<span class="m">' + esc(meta.join(' · ')) + '</span>' : '')
      + (e.note ? '<div class="n">' + nl(e.note) + '</div>' : '') + (e.type === 'pledge' ? '<div class="m"><a href="#/pledge/' + e.cls + '/' + e.sid + '/' + e.id + '">🖨 ورقةُ التعهّد</a></div>' : '') + '</div>'
      + (RO() ? '' : '<div class="acts"><button class="icon-btn ed" title="تعديل">' + ICO.edit + '</button><button class="icon-btn d del" title="حذف">' + ICO.del + '</button></div>') + '</div>';
  }
  function bindEvActs(host, rerender) {
    host.querySelectorAll('.ev').forEach(function (el) {
      var id = el.dataset.id, date = el.dataset.date;
      var ev = dayEvents(date).filter(function (x) { return x.id === id; })[0]; if (!ev) return;
      var ed = el.querySelector('.ed'), dl = el.querySelector('.del');
      if (ed) ed.onclick = function () { var st = findStudent(ev.cls, ev.sid); recordSheet({ c: st && st.c, s: st && st.s, ev: Object.assign({ date: date }, ev), date: date, done: rerender }); };
      if (dl) dl.onclick = function () { if (!confirm('حذفُ هذا التسجيل؟')) return; removeEvent(date, id).then(function () { toast('حُذف'); rerender(); }).catch(fail); };
    });
  }
  function reportHead(title, sub) {
    return '<div class="report-head"><div class="rt"><h2>' + esc(title) + '</h2><p>' + esc(S.settings.school) + (sub ? ' · ' + esc(sub) : '') + '</p></div><div class="rd">' + esc(S.settings.supervisor) + '<br>' + fmtDate(today(), true) + '</div><img src="img/logo.svg" alt=""></div>';
  }

  /* ---------------- اختيارُ طالب ---------------- */
  function pickStudent(cb, opts) {
    opts = opts || {};
    openSheet('<h3 class="t">' + esc(opts.title || 'اختيارُ الطالب') + '</h3><div class="searchbar"><input id="pkq" placeholder="اكتبِ اسمَ الطالب أو الفصل…" autocomplete="off"></div><div class="picklist" id="pkl"></div>');
    var q = $('pkq'), l = $('pkl');
    function render() {
      var rows = q.value.trim() ? searchStudents(q.value, 40) : (opts.initial || allStudents().slice(0, 40));
      if (!allStudents().length) { l.innerHTML = '<div class="empty"><b>لا طلابَ بعد</b>أضفِ الفصولَ والطلابَ من قسمِ «الطلابُ والفصول»</div>'; return; }
      l.innerHTML = rows.length ? rows.map(function (x) { return '<button class="pick' + (opts.done && opts.done[x.s.id] ? ' done' : '') + '" data-c="' + x.c._id + '" data-s="' + x.s.id + '"><span class="av">' + esc(initials(x.s.name)) + '</span><span class="nm">' + esc(x.s.name) + '<small>' + esc(x.c.name) + (x.s.no ? ' · رقم ' + ar(x.s.no) : '') + '</small></span></button>'; }).join('') : '<div class="empty">لا نتائج</div>';
      l.querySelectorAll('.pick').forEach(function (b) { b.onclick = function () { var st = findStudent(b.dataset.c, b.dataset.s); if (!opts.keepOpen) closeSheet(); cb(st.c, st.s); if (opts.keepOpen) { q.value = ''; render(); q.focus(); } }; });
    }
    q.oninput = render; render(); setTimeout(function () { q.focus(); }, 300);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = l.querySelector('.pick'); if (f) f.click(); } });
  }

  /* ---------------- ورقةُ التسجيل (كلُّ الأنواع) ---------------- */
  function recordSheet(o) {
    /* o: {c, s, type?, ev?, date?, done} */
    var ev = o.ev ? Object.assign({}, o.ev) : { type: o.type || 'viol', sid: o.s && o.s.id, cls: o.c && o.c._id };
    var date = o.date || (o.ev && o.ev.date) || S.date || today();
    var st = S.settings, editing = !!o.ev;
    if (!o.s) { return pickStudent(function (c, s) { recordSheet(Object.assign({}, o, { c: c, s: s })); }); }
    function html() {
      var t = ev.type, per = st.periods || 7;
      var perSel = '<div class="field"><label>الحصّة</label><select id="f_period"><option value="">—</option>' + Array.apply(null, Array(per)).map(function (_, i) { return '<option value="' + (i + 1) + '"' + (String(ev.period) === String(i + 1) ? ' selected' : '') + '>' + ar(i + 1) + '</option>'; }).join('') + '</select></div>';
      var teacher = '<div class="field"><label>المعلّم / مَن رصدَها</label><input id="f_teacher" value="' + esc(ev.teacher || '') + '" placeholder="اختياري"></div>';
      var body = '';
      if (t === 'late') body = '<div class="row2"><div class="field"><label>وقتُ الوصول</label><input id="f_time" type="time" value="' + esc(ev.time || hm()) + '"></div><div class="field"><label>دقائقُ التأخير</label><input id="f_min" type="number" min="0" value="' + esc(ev.min != null ? ev.min : Math.max(0, hm2m(hm()) - hm2m(st.lateAfter))) + '"></div></div><p class="hint">الطابورُ ينتهي ' + fmtHM(st.lateAfter) + ' — تُحسَبُ الدقائقُ تلقائياً ويمكنُ تعديلُها</p>';
      else if (t === 'absent') body = '<div class="chips" id="f_sub">' + Object.keys(ABS).map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + ((ev.sub || 'unexcused') === k) + '">' + ABS[k] + '</button>'; }).join('') + '</div><div class="field"><label>سببُ الغياب / العذر</label><input id="f_reason" value="' + esc(ev.reason || '') + '" placeholder="اختياري"></div>';
      else if (t === 'sick') body = '<div class="row2"><div class="field"><label>من</label><input id="f_from" type="date" value="' + esc(ev.from || date) + '"></div><div class="field"><label>إلى</label><input id="f_to" type="date" value="' + esc(ev.to || ev.from || date) + '"></div></div><div class="row2"><div class="field"><label>عددُ الأيّام</label><input id="f_days" type="number" min="1" value="' + esc(ev.days || 1) + '"></div><div class="field"><label>الجهةُ المصدِرة</label><select id="f_src"><option value="">—</option>' + (st.sickSources || []).map(function (x) { return '<option' + (ev.src === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div></div>';
      else if (t === 'sleep') body = '<div class="row2">' + perSel + teacher + '</div>';
      else if (t === 'viol') body = '<div class="chips" id="f_sub">' + VIOL_KEYS.map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + ((ev.sub || 'behavior') === k) + '">' + esc(st.violCats[k]) + '</button>'; }).join('') + '</div>'
        + '<div id="f_banned"' + ((ev.sub || 'behavior') === 'banned' ? '' : ' hidden') + '><div class="field"><label>المادّةُ الممنوعة</label><select id="f_item"><option value="">—</option>' + (st.bannedItems || []).map(function (x) { return '<option' + (ev.item === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div></div>'
        + '<div class="row2">' + perSel + teacher + '</div><div class="field"><label>الإجراءُ المتّخذ</label><select id="f_action"><option value="">—</option>' + (st.actions || []).map(function (x) { return '<option' + (ev.action === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>';
      else if (t === 'expel') body = '<div class="chips" id="f_ereason">' + (st.expelReasons || []).map(function (x) { return '<button type="button" data-v="' + esc(x.reason) + '" data-d="' + esc(x.days) + '" aria-pressed="' + ((ev.reason || '') === x.reason) + '">' + esc(x.reason) + ' (' + ar(x.days) + ')</button>'; }).join('') + '</div><div class="field"><label>عددُ أيّامِ الفصل</label><input id="f_days" type="number" min="1" max="7" value="' + esc(ev.days || 1) + '"></div><p class="hint">تُحدَّدُ المدّةُ تلقائياً من السببِ المختار، ويمكنُ تعديلُها يدوياً (يومٌ إلى أسبوع)</p>';
      else if (t === 'pledge') body = '<div class="field"><label>موضوعُ التعهّد</label><input id="f_kind" value="' + esc(ev.kind || '') + '" placeholder="مثال: عدمُ تكرارِ التأخير"></div><div class="field"><label>نصُّ التعهّد (فارغٌ = النصُّ الافتراضيُّ من الإعدادات)</label><textarea id="f_text">' + esc(ev.text || '') + '</textarea></div><label class="hint" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f_guardian"' + (ev.guardian ? ' checked' : '') + '> حضرَ وليُّ الأمرِ ووقّع</label>';
      return '<div class="who"><span class="av">' + esc(initials(o.s.name)) + '</span><div><h3>' + esc(o.s.name) + '</h3><small>' + esc(o.c.name) + '</small></div></div>'
        + '<div class="chips" id="f_type">' + TYPES.map(function (x) { return '<button type="button" class="t-' + x.key + '" data-v="' + x.key + '" aria-pressed="' + (t === x.key) + '"' + (editing && x.key !== t ? ' disabled' : '') + '>' + x.short + '</button>'; }).join('') + '</div>'
        + '<div class="field"><label>التاريخ</label><input id="f_date" type="date" value="' + esc(date) + '"' + (editing ? ' disabled' : '') + '></div>'
        + body + '<div class="field"><label>ملاحظة / تفاصيل</label><textarea id="f_note" placeholder="اختياري">' + esc(ev.note || '') + '</textarea></div>'
        + '<div id="f_err"></div><div class="foot">' + (editing ? '' : '<button class="btn s" id="f_switch">طالبٌ آخر</button>') + '<div class="r"><button class="btn" id="f_cancel">إلغاء</button><button class="btn p" id="f_save">' + (editing ? 'حفظُ التعديل' : 'تسجيل') + '</button></div></div>';
    }
    function bind() {
      $('sheet').querySelectorAll('#f_type button').forEach(function (b) { b.onclick = function () { ev.type = b.dataset.v; delete ev.sub; delete ev.reason; rerender(); }; });
      var sub = $('f_sub'); if (sub) sub.querySelectorAll('button').forEach(function (b) { b.onclick = function () { ev.sub = b.dataset.v; sub.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); var bn = $('f_banned'); if (bn) bn.hidden = ev.sub !== 'banned'; }; });
      var ereason = $('f_ereason'); if (ereason) ereason.querySelectorAll('button').forEach(function (b) { b.onclick = function () { ev.reason = b.dataset.v; ereason.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); var di = $('f_days'); if (di) di.value = b.dataset.d || 1; }; });
      var f = $('f_from'), tt = $('f_to'), dd = $('f_days');
      if (f && tt) { var calc = function () { if (f.value && tt.value && tt.value >= f.value) dd.value = daysBetween(f.value, tt.value); }; f.onchange = function () { if (!tt.value || tt.value < f.value) tt.value = f.value; calc(); }; tt.onchange = calc; }
      var tm = $('f_time'); if (tm) tm.onchange = function () { $('f_min').value = Math.max(0, hm2m(tm.value) - hm2m(st.lateAfter)); };
      $('f_cancel').onclick = closeSheet;
      var sw = $('f_switch'); if (sw) sw.onclick = function () { pickStudent(function (c, s) { recordSheet(Object.assign({}, o, { c: c, s: s, type: ev.type, ev: null })); }); };
      $('f_save').onclick = save;
    }
    function rerender() { $('sheet').innerHTML = '<div class="hnd"></div>' + html(); bind(); }
    function v(id) { var el = $(id); return el ? el.value.trim() : ''; }
    async function save() {
      var t = ev.type, d = editing ? date : v('f_date');
      if (!d) { $('f_err').innerHTML = '<div class="err">اخترِ التاريخ</div>'; return; }
      var out = { id: ev.id, ts: ev.ts, sid: o.s.id, cls: o.c._id, type: t, note: v('f_note') };
      if (t === 'late') { out.time = v('f_time'); out.min = +v('f_min') || 0; }
      if (t === 'absent') { out.sub = ev.sub || 'unexcused'; out.reason = v('f_reason'); }
      if (t === 'sick') { out.from = v('f_from'); out.to = v('f_to'); out.days = +v('f_days') || 1; out.src = v('f_src'); }
      if (t === 'sleep') { out.period = v('f_period'); out.teacher = v('f_teacher'); }
      if (t === 'viol') { out.sub = ev.sub || 'behavior'; out.item = out.sub === 'banned' ? v('f_item') : ''; out.period = v('f_period'); out.teacher = v('f_teacher'); out.action = v('f_action'); }
      if (t === 'expel') { out.reason = ev.reason || ''; out.days = Math.min(7, Math.max(1, +v('f_days') || 1)); out.to = addDays(d, out.days - 1); }
      if (t === 'pledge') { out.kind = v('f_kind'); out.text = v('f_text'); out.guardian = !!($('f_guardian') && $('f_guardian').checked); }
      if (t === 'absent' && !editing && dayEvents(d).some(function (x) { return x.sid === out.sid && x.type === 'absent'; })) { $('f_err').innerHTML = '<div class="err">الطالبُ مسجَّلٌ غائباً في هذا اليوم</div>'; return; }
      $('f_save').disabled = true;
      try {
        if (editing) await updateEvent(d, out); else await addEvent(d, out);
        closeSheet(); toast(editing ? 'حُفظ التعديل' : 'سُجِّل ' + TYPE[t].short + ' لـ' + o.s.name);
        if (o.done) o.done(out, d);
      } catch (e) { $('f_err').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; $('f_save').disabled = false; }
    }
    openSheet(html()); bind();
  }

  /* ---------------- الترويسةُ والتوجيه ---------------- */
  function renderHeader() {
    var d = new Date();
    $('hdDate').innerHTML = '<b>' + DAYS[d.getDay()] + ' ' + ar(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + ar(d.getFullYear()) + '</b>' + esc(hijri(d));
    var u = Auth.user(), n = queue().length;
    if (S.settings) { $('hdSchool').textContent = S.settings.school + (S.settings.supervisor ? ' · ' + S.settings.supervisor : ''); $('foot').textContent = 'إشراف المدرسة — ' + S.settings.school + ' · البياناتُ محفوظةٌ في حسابِ المشرفِ وحدَه'; $('printFoot').textContent = S.settings.school + ' — إشراف المدرسة · ' + S.settings.supervisor; }
    $('hdUser').innerHTML = u ? '<span class="dot' + (navigator.onLine ? '' : ' off') + '"></span><span>' + esc(FB.demo ? 'وضعٌ تجريبيّ (محليّ)' : u.email) + '</span>' + (RO() ? '<span class="ro">قراءةٌ فقط</span>' : '') + (n ? '<span class="q" title="تسجيلاتٌ بانتظارِ الإرسال">' + ar(n) + '</span>' : '') + '<button type="button" id="logout">خروج</button>' : '<span class="dot off"></span><span>غيرُ متّصل</span>';
    var lo = $('logout'); if (lo) lo.onclick = function () { if (queue().length && !confirm('هناك تسجيلاتٌ لم تُرسَلْ بعد — تبقى محفوظةً في هذا المتصفّح حتى تدخلَ ثانية. متابعةُ الخروج؟')) return; Auth.signOut(); S.user = null; S.settings = null; S.classes = null; S.all = null; LS.del(CORE_KEY); LS.del(DAYS_KEY); if (FB.demo) location.href = location.pathname; else route(); };
    renderNet();
  }
  function parts() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  var ROUTES = { '': home, late: lateView, absent: absentView, students: studentsView, 'class': classView, student: studentView, reports: reportsView, log: logView, settings: settingsView, pledge: pledgeView, letter: letterView, activity: activityView };
  var TABMAP = { 'class': 'students', student: 'students', pledge: 'students', letter: 'students', activity: 'settings' };
  async function route() {
    var p = parts(), r = p[0] || '';
    document.querySelectorAll('#tabs a, #bnav a').forEach(function (a) { var on = a.dataset.r === r || a.dataset.r === TABMAP[r]; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    closeSheet(); document.body.classList.remove('brief');
    renderHeader();
    if (!Auth.user()) return loginView();
    var fn = ROUTES[r] || home;
    try {
      view.innerHTML = '<div class="loading"><span class="spin"></span></div>';
      await loadCore(); renderHeader();
      await fn(p.slice(1));
    } catch (e) { console.error(e); view.innerHTML = '<div class="err">' + esc(e.message || e) + '</div><p><a class="btn" href="#/">الرئيسة</a> <button class="btn" onclick="location.reload()">إعادةُ التحميل</button></p>'; }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- الدخول ---------------- */
  function loginView() {
    view.innerHTML = '<div class="login"><img src="img/logo.svg" alt=""><h2>إشراف المدرسة</h2><p>ادخلْ بحسابِ المشرفِ لتصلَ إلى سجلّاتِ الطلاب</p>'
      + '<div id="lerr"></div>'
      + '<div class="field"><label>البريدُ الإلكتروني</label><input id="lemail" type="email" autocomplete="username" value="' + esc(LS.get('es_last_email', FB.admins[0] || '')) + '"></div>'
      + '<div class="field"><label>كلمةُ المرور</label><input id="lpw" type="password" autocomplete="current-password"></div>'
      + '<button class="btn p" id="lgo" style="width:100%;justify-content:center;margin-top:6px">دخول</button>'
      + '<div class="alt">أوّلُ مرّة؟ <button type="button" id="lnew">أنشئْ حسابَ المشرف</button> · <button type="button" id="lforgot">نسيتُ كلمةَ المرور</button></div>'
      + '<div class="alt" style="margin-top:22px;border-top:1px solid var(--line);padding-top:12px;color:var(--muted)">المنصّةُ خاصّةٌ بمشرفِ المدرسة · <a href="?demo=1#/" style="color:var(--muted)">وضعٌ تجريبيٌّ ببياناتٍ وهميّة</a></div></div>';
    var go = async function (mode) {
      var em = $('lemail').value.trim(), pw = $('lpw').value;
      $('lerr').innerHTML = '';
      if (!em || (mode !== 'forgot' && !pw)) { $('lerr').innerHTML = '<div class="err">أكملِ البريدَ وكلمةَ المرور</div>'; return; }
      $('lgo').disabled = true;
      try {
        if (mode === 'forgot') { await Auth.resetPassword(em); $('lerr').innerHTML = '<div class="ok">أُرسلت رسالةُ الاستعادةِ إلى بريدك</div>'; }
        else {
          if (mode === 'new' && !FB.isAdmin(em)) throw new Error('هذا البريدُ ليس بريدَ المشرفِ المسجَّلِ في js/config.js — أضفْه هناك وفي قواعدِ فايرستور أوّلاً.');
          await (mode === 'new' ? Auth.signUp(em, pw) : Auth.signIn(em, pw)); LS.set('es_last_email', em); setRole(); route();
        }
      } catch (e) { $('lerr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
      $('lgo').disabled = false;
    };
    $('lgo').onclick = function () { go('in'); };
    $('lnew').onclick = function () { go('new'); };
    $('lforgot').onclick = function () { go('forgot'); };
    $('lpw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go('in'); });
  }
  function setRole() { var u = Auth.user(); S.user = u; S.role = (!u || FB.demo || FB.isAdmin(u.email)) ? 'owner' : 'viewer'; }

  /* ---------------- الرئيسة: اليوم ---------------- */
  function datebarHTML(date, base) {
    return '<div class="datebar noprint"><a class="btn s" href="' + base + addDays(date, -1) + '">‹ السابق</a><span class="d">' + fmtDate(date, true) + '<small>' + esc(hijri(pd(date))) + (isWeekend(date) ? ' · عطلة' : '') + '</small></span><a class="btn s" href="' + base + addDays(date, 1) + '">التالي ›</a>' + (date !== today() ? '<a class="btn s g" href="' + base + today() + '">اليوم</a>' : '') + '<input type="date" id="dbDate" value="' + date + '"></div>';
  }
  function bindDatebar(base) { var i = $('dbDate'); if (i) i.onchange = function () { if (i.value) location.hash = base + i.value; }; }
  function collectAlerts() {
    var r = periodRange(), a = S.settings.alerts, out = [];
    var by = {};
    evsIn(r.from, r.to).forEach(function (e) { var k = e.cls + '|' + e.sid; by[k] = by[k] || []; by[k].push(e); });
    Object.keys(by).forEach(function (k) {
      var st = findStudent(k.split('|')[0], k.split('|')[1]); if (!st) return;
      var c = countBy(by[k]);
      ['late', 'absent', 'viol', 'sleep'].forEach(function (t) { var n = t === 'absent' ? c.unexcused : c[t]; if (a[t] && n >= a[t]) out.push({ st: st, type: t, n: n }); });
    });
    return out.sort(function (x, y) { return y.n - x.n; });
  }
  function alertHTML(a) { return '<div class="al"><span class="pip" style="background:' + TYPE[a.type].hex + '">!</span><span style="flex:1"><a href="#/student/' + a.st.c._id + '/' + a.st.s.id + '">' + esc(a.st.s.name) + '</a> <small class="muted">' + esc(a.st.c.name) + '</small></span><span>' + ar(a.n) + ' ' + TYPE[a.type].plural + (a.type === 'absent' ? ' بلا عذر' : '') + '</span></div>'; }
  async function home(p) {
    var date = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today();
    S.date = date;
    await loadAll(); await loadDay(date);
    var evs = dayEvents(date).map(function (e) { return Object.assign({ date: date }, e); });
    var cnt = countBy(evs), alerts = collectAlerts(), nStu = allStudents().length;
    var html = '<div class="ttl"><div><h2>' + (date === today() ? 'اليوم' : 'يومُ ' + DAYS[pd(date).getDay()]) + '</h2><p>' + esc(S.settings.school) + ' · ' + ar(nStu) + ' طالباً في ' + ar(activeClasses().length) + ' فصلاً</p></div><div class="acts noprint">' + (RO() ? '' : '<button class="btn p" id="hAdd">' + ICO.plus + ' تسجيلٌ جديد</button>') + '<button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('سجلُّ يوم ' + fmtDate(date, true))
      + datebarHTML(date, '#/')
      + tilesHTML(cnt, null, false);
    if (!RO()) html += '<div class="quickacts"><a href="#/late/' + date + '"><i style="background:var(--c-late)"></i>الطابورُ الصباحي</a><a href="#/absent/' + date + '"><i style="background:var(--c-absent)"></i>حصرُ الغياب</a><button data-t="viol"><i style="background:var(--c-viol)"></i>مخالفة</button><button data-t="expel"><i style="background:var(--c-expel)"></i>الفصلُ عن الدراسة</button><button data-t="sleep"><i style="background:var(--c-sleep)"></i>نومٌ في الحصّة</button><button data-t="sick"><i style="background:var(--c-sick)"></i>مرضيّة</button><button data-t="pledge"><i style="background:var(--c-pledge)"></i>تعهّد</button></div>';
    if (!nStu) html += '<div class="empty"><b>ابدأْ بإضافةِ الفصولِ والطلاب</b>من قسمِ «الطلابُ والفصول» — الصقْ قائمةَ الأسماءِ وستُنشأُ الفصولُ في لحظات<br><a class="btn p" href="#/students" style="margin-top:12px">الطلابُ والفصول</a></div>';
    if (alerts.length) html += '<div class="panel no-brief"><h3>تنبيهاتُ ' + esc(periodRange().label) + ' <span class="acts"><a class="btn xs" href="#/reports">التقارير</a></span></h3><p class="hint">طلابٌ بلغوا حدَّ التنبيهِ المضبوطَ في الإعدادات</p><div class="alerts">' + alerts.slice(0, 12).map(alertHTML).join('') + (alerts.length > 12 ? '<p class="hint">و' + ar(alerts.length - 12) + ' آخرون…</p>' : '') + '</div></div>';
    html += '<div class="panel"><h3>سجلُّ اليوم <span class="muted small">' + plural(evs.length, 'تسجيلٌ واحد', 'تسجيلان', 'تسجيلات', 'لا تسجيلات') + '</span></h3><div class="evlist" id="hList">' + (evs.length ? evs.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).map(function (e) { return evHTML(e); }).join('') : '<div class="empty">لا تسجيلاتَ في هذا اليوم</div>') + '</div></div>';
    view.innerHTML = html;
    bindDatebar('#/');
    var add = $('hAdd'); if (add) add.onclick = function () { recordSheet({ date: date, done: route }); };
    view.querySelectorAll('.quickacts button').forEach(function (b) { b.onclick = function () { recordSheet({ type: b.dataset.t, date: date, done: route }); }; });
    bindEvActs($('hList'), route);
  }

  /* ---------------- الطابورُ الصباحي: تسجيلُ التأخير السريع ---------------- */
  var clockTimer = null;
  async function lateView(p) {
    var date = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today();
    S.date = date; await loadDay(date);
    function lates() { return dayEvents(date).filter(function (e) { return e.type === 'late'; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); }
    function listHTML() {
      var L = lates(); if (!L.length) return '<div class="empty">لم يُسجَّلْ تأخيرٌ بعد</div>';
      return '<div class="latelist">' + L.map(function (e, i) { var st = findStudent(e.cls, e.sid); return '<div class="row" data-id="' + e.id + '"><span class="muted small">' + ar(i + 1) + '</span><span class="t">' + fmtHM(e.time) + '</span><span class="n"><a href="#/student/' + e.cls + '/' + e.sid + '">' + esc(st ? st.s.name : '؟') + '</a> <small>' + esc(st ? st.c.name : '') + (e.min ? ' · ' + ar(e.min) + ' د' : '') + '</small></span>' + (RO() ? '' : '<button class="icon-btn d rm" title="إلغاء">' + ICO.del + '</button>') + '</div>'; }).join('') + '</div>';
    }
    view.innerHTML = '<div class="ttl"><div><h2>الطابورُ الصباحي</h2><p>اكتبِ اسمَ الطالبِ واضغطْ إدخال — يُسجَّلُ وقتُ الوصولِ تلقائياً</p></div><div class="acts noprint"><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('كشفُ التأخيرِ الصباحي — ' + fmtDate(date, true))
      + datebarHTML(date, '#/late/')
      + '<div class="quick"><div class="panel" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div class="clock" id="qClock"></div><div style="flex:1;min-width:240px">' + (RO() ? '' : '<input class="big" id="qIn" placeholder="اسمُ الطالب…" autocomplete="off">') + '<div class="picklist" id="qRes" style="margin-top:8px;max-height:40vh"></div></div></div>'
      + '<div class="panel"><h3>المتأخّرون اليوم <span class="muted small" id="qCount"></span></h3><div id="qList">' + listHTML() + '</div></div></div>';
    bindDatebar('#/late/');
    var after = hm2m(S.settings.lateAfter);
    function tick() { var el = $('qClock'); if (!el) { clearInterval(clockTimer); return; } var now = hm(), m = hm2m(now) - after; el.className = 'clock' + (m > 0 ? ' late' : ''); el.innerHTML = fmtHM(now) + '<small>' + (m > 0 ? 'بعدَ الطابورِ بـ' + ar(m) + ' دقيقة' : 'الطابورُ ينتهي ' + fmtHM(S.settings.lateAfter)) + '</small>'; }
    clearInterval(clockTimer); tick(); clockTimer = setInterval(tick, 15000);
    function refresh() { $('qList').innerHTML = listHTML(); $('qCount').textContent = plural(lates().length, 'طالبٌ واحد', 'طالبان', 'طلاب', ''); bindRm(); }
    function bindRm() { view.querySelectorAll('.rm').forEach(function (b) { b.onclick = function () { var id = b.closest('.row').dataset.id; removeEvent(date, id).then(refresh).catch(fail); }; }); }
    bindRm(); $('qCount').textContent = plural(lates().length, 'طالبٌ واحد', 'طالبان', 'طلاب', '');
    var inp = $('qIn'), res = $('qRes');
    if (inp) {
      var done = {};
      function renderRes() {
        lates().forEach(function (e) { done[e.sid] = 1; });
        var rows = inp.value.trim() ? searchStudents(inp.value, 12) : [];
        res.innerHTML = rows.map(function (x) { return '<button class="pick' + (done[x.s.id] ? ' done' : '') + '" data-c="' + x.c._id + '" data-s="' + x.s.id + '"><span class="av">' + esc(initials(x.s.name)) + '</span><span class="nm">' + esc(x.s.name) + '<small>' + esc(x.c.name) + '</small></span></button>'; }).join('');
        res.querySelectorAll('.pick').forEach(function (b) { b.onclick = function () { add(b.dataset.c, b.dataset.s); }; });
      }
      async function add(cid, sid) {
        var st = findStudent(cid, sid); if (!st) return;
        if (lates().some(function (e) { return e.sid === sid; })) { toast(st.s.name + ' مسجَّلٌ من قبل'); inp.value = ''; renderRes(); return; }
        var now = date === today() ? hm() : S.settings.lateAfter;
        try { await addEvent(date, { sid: sid, cls: cid, type: 'late', time: now, min: Math.max(0, hm2m(now) - after) }); toast('سُجِّل تأخيرُ ' + st.s.name); inp.value = ''; renderRes(); refresh(); inp.focus(); } catch (e) { fail(e); }
      }
      inp.oninput = renderRes;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = res.querySelector('.pick:not(.done)') || res.querySelector('.pick'); if (f) f.click(); } });
      if (window.innerWidth > 720) inp.focus();
    }
  }

  /* ---------------- حصرُ الغياب بالفصل ---------------- */
  async function absentView(p) {
    var date = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today();
    S.date = date; await loadDay(date);
    var classes = activeClasses();
    var cid = p[1] && cls(p[1]) ? p[1] : (LS.get('es_abs_cls') && cls(LS.get('es_abs_cls')) ? LS.get('es_abs_cls') : (classes[0] && classes[0]._id));
    if (cid) LS.set('es_abs_cls', cid);
    var c = cls(cid);
    function stateOf(sid) { var e = dayEvents(date).filter(function (x) { return x.sid === sid && (x.type === 'absent' || x.type === 'sick'); }); var a = e.filter(function (x) { return x.type === 'absent'; })[0]; return a ? (a.sub === 'excused' ? 'excused' : 'absent') : (e.length ? 'sick' : ''); }
    function gridHTML() {
      if (!c) return '<div class="empty"><b>لا فصولَ بعد</b><a class="btn p" href="#/students">أضفِ الفصول</a></div>';
      var L = (c.students || []).slice().sort(function (a, b) { return (+a.no || 999) - (+b.no || 999) || a.name.localeCompare(b.name, 'ar'); });
      var lateSet = {}; dayEvents(date).forEach(function (e) { if (e.type === 'late') lateSet[e.sid] = 1; });
      return '<div class="students">' + L.map(function (s) { var st = stateOf(s.id); return '<button class="stu ' + (st === 'sick' ? 'excused' : st) + (lateSet[s.id] ? ' late-on' : '') + '" data-s="' + s.id + '">' + (s.no ? '<span class="no">' + ar(s.no) + '</span>' : '') + '<span class="av">' + esc(initials(s.name)) + '</span><span class="nm">' + esc(s.name) + '<small>' + (st === 'absent' ? 'غائبٌ بلا عذر' : st === 'excused' ? 'غائبٌ بعذر' : st === 'sick' ? 'مرضيّة' : lateSet[s.id] ? 'متأخّر' : 'حاضر') + '</small></span></button>'; }).join('') + '</div>';
    }
    function summary() { if (!c) return ''; var n = (c.students || []).length, a = 0, x = 0, k = 0; (c.students || []).forEach(function (s) { var st = stateOf(s.id); if (st === 'absent') a++; else if (st === 'excused') x++; else if (st === 'sick') k++; }); return 'الحضور ' + ar(n - a - x - k) + ' من ' + ar(n) + ' · غيابٌ بلا عذر ' + ar(a) + ' · بعذر ' + ar(x) + ' · مرضيّة ' + ar(k); }
    view.innerHTML = '<div class="ttl"><div><h2>حصرُ الغياب</h2><p>انقرِ الطالبَ للتبديل: حاضر ← غائبٌ بلا عذر ← غائبٌ بعذر ← حاضر</p></div><div class="acts noprint"><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('كشفُ الغياب — ' + (c ? c.name + ' — ' : '') + fmtDate(date, true))
      + datebarHTML(date, '#/absent/')
      + (classes.length ? '<div class="filters noprint"><div class="seg wrap-seg">' + classes.map(function (x) { return '<button data-c="' + x._id + '" aria-pressed="' + (x._id === cid) + '">' + esc(x.name) + '</button>'; }).join('') + '</div></div>' : '')
      + '<p class="hint" id="abSum">' + summary() + '</p><div id="abGrid">' + gridHTML() + '</div>'
      + '<div class="legend"><span><i style="background:var(--c-absent)"></i>غيابٌ بلا عذر</span><span><i style="background:var(--c-sick)"></i>بعذر / مرضيّة</span><span><i style="background:var(--c-late)"></i>متأخّر</span></div>';
    bindDatebar('#/absent/');
    view.querySelectorAll('.filters .seg button').forEach(function (b) { b.onclick = function () { location.hash = '#/absent/' + date + '/' + b.dataset.c; }; });
    function bindGrid() {
      view.querySelectorAll('.stu').forEach(function (b) {
        b.onclick = async function () {
          if (RO()) { location.hash = '#/student/' + cid + '/' + b.dataset.s; return; }
          var sid = b.dataset.s, st = stateOf(sid), list = dayEvents(date).slice();
          var cur = list.filter(function (x) { return x.sid === sid && x.type === 'absent'; })[0];
          try {
            if (st === '' || st === 'sick') { await addEvent(date, { sid: sid, cls: cid, type: 'absent', sub: 'unexcused' }); }
            else if (st === 'absent') { await updateEvent(date, Object.assign({}, cur, { sub: 'excused' })); }
            else { await removeEvent(date, cur.id); }
            $('abGrid').innerHTML = gridHTML(); $('abSum').textContent = summary(); bindGrid();
          } catch (e) { fail(e); }
        };
      });
    }
    bindGrid();
  }

  /* ---------------- الطلابُ والفصول ---------------- */
  function classCard(c, cnt) {
    var n = (c.students || []).length;
    return '<div class="card link cls-card"><span class="cnt">' + plural(n, 'طالبٌ واحد', 'طالبان', 'طلاب', 'بلا طلاب') + '</span><div class="kick">' + esc(gradeName(c.grade)) + '</div><h3><a href="#/class/' + c._id + '">' + esc(c.name) + '</a></h3>'
      + '<p>' + (cnt ? 'في ' + esc(periodRange().label) + ': تأخير ' + ar(cnt.late) + ' · غياب ' + ar(cnt.absent) + ' · مخالفات ' + ar(cnt.viol) : '') + '</p>'
      + '<div class="crow"><a class="btn s" href="#/class/' + c._id + '">الطلاب</a><a class="btn s" href="#/absent/' + today() + '/' + c._id + '">حصرُ الغياب</a>' + (c.archived ? '<span class="btn s xs">مؤرشف</span>' : '') + '</div></div>';
  }
  async function studentsView(p) {
    await loadAll();
    var r = periodRange(), showArch = p[0] === 'archived';
    var list = (S.classes || []).filter(function (c) { return showArch ? c.archived : !c.archived; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'ar'); });
    var byCls = {}; evsIn(r.from, r.to).forEach(function (e) { byCls[e.cls] = byCls[e.cls] || []; byCls[e.cls].push(e); });
    var byGrade = {}; list.forEach(function (c) { (byGrade[c.grade] = byGrade[c.grade] || []).push(c); });
    var gradeOrder = (S.settings.grades || []).map(function (g) { return g.id; });
    Object.keys(byGrade).forEach(function (gid) { if (gradeOrder.indexOf(gid) === -1) gradeOrder.push(gid); });
    var groupsHtml = gradeOrder.filter(function (gid) { return byGrade[gid] && byGrade[gid].length; }).map(function (gid) {
      return '<h3 class="grade-h">' + esc(gradeName(gid)) + ' <span class="muted small">' + plural(byGrade[gid].length, 'فصلٌ واحد', 'فصلان', 'فصول', 'بلا فصول') + '</span></h3><div class="grid">' + byGrade[gid].map(function (c) { return classCard(c, countBy(byCls[c._id] || [])); }).join('') + '</div>';
    }).join('');
    var html = '<div class="ttl"><div><h2>الطلابُ والفصول</h2><p>' + ar(allStudents().length) + ' طالباً في ' + ar(activeClasses().length) + ' فصلاً</p></div><div class="acts">' + (RO() ? '' : '<button class="btn p" id="cAdd">' + ICO.plus + ' فصلٌ جديد</button><button class="btn" id="cImport">استيرادُ قائمة</button>') + '<a class="btn" href="#/students/' + (showArch ? '' : 'archived') + '">' + (showArch ? 'الفصولُ الحاليّة' : 'المؤرشفة') + '</a></div></div>'
      + '<div class="searchbar"><input id="sq" placeholder="ابحثْ عن طالبٍ في كلِّ الفصول…" autocomplete="off"></div><div class="picklist" id="sres" style="margin-bottom:16px"></div>'
      + (list.length ? groupsHtml : '<div class="empty"><b>' + (showArch ? 'لا فصولَ مؤرشفة' : 'لا فصولَ بعد') + '</b>' + (showArch ? '' : 'أنشئْ فصلاً ثمّ الصقْ أسماءَ طلابِه، أو استوردْ قائمةً كاملةً (فصل، اسم) دفعةً واحدة') + '</div>');
    view.innerHTML = html;
    var sq = $('sq'), sres = $('sres');
    sq.oninput = function () { var rows = searchStudents(sq.value, 15); sres.innerHTML = rows.map(function (x) { var cnt = countBy((byCls[x.c._id] || []).filter(function (e) { return e.sid === x.s.id; })); return '<a class="pick" href="#/student/' + x.c._id + '/' + x.s.id + '"><span class="av">' + esc(initials(x.s.name)) + '</span><span class="nm">' + esc(x.s.name) + '<small>' + esc(x.c.name) + '</small></span><span class="bd">' + badges(cnt) + '</span></a>'; }).join(''); };
    var ca = $('cAdd'); if (ca) ca.onclick = function () { classSheet(null); };
    var ci = $('cImport'); if (ci) ci.onclick = importSheet;
  }
  function badges(cnt) { return ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (k) { return cnt[k] ? '<span class="b ' + k + '" title="' + TYPE[k].short + '">' + ar(cnt[k]) + '</span>' : ''; }).join(''); }
  function classSheet(c) {
    var isNew = !c; c = c || { _id: uid('c'), name: '', grade: (S.settings.grades[0] || {}).id, order: (S.classes || []).length + 1, students: [], created: Date.now() };
    openSheet('<h3 class="t">' + (isNew ? 'فصلٌ جديد' : 'تعديلُ الفصل') + '</h3>'
      + '<div class="row2"><div class="field"><label>اسمُ الفصل</label><input id="c_name" value="' + esc(c.name) + '" placeholder="مثال: ١٠ / ٣"></div><div class="field"><label>الصفّ</label><select id="c_grade">' + S.settings.grades.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === c.grade ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="field"><label>ترتيبُ العرض</label><input id="c_order" type="number" value="' + esc(c.order || 0) + '"></div>'
      + (isNew ? '<div class="field"><label>أسماءُ الطلاب (اسمٌ في كلِّ سطر، ويمكنُ سبقُه برقمِ الجلوس)</label><textarea id="c_students" style="min-height:140px" placeholder="1 أحمد محمد العلي&#10;2 خالد سعد الدوسري"></textarea></div>' : '')
      + '<div id="c_err"></div><div class="foot">' + (isNew ? '' : '<div><button class="btn s" id="c_arch">' + (c.archived ? 'إلغاءُ الأرشفة' : 'أرشفة') + '</button> <button class="btn s d" id="c_del">حذفُ الفصل</button></div>') + '<div class="r"><button class="btn" id="c_cancel">إلغاء</button><button class="btn p" id="c_save">حفظ</button></div></div>');
    $('c_cancel').onclick = closeSheet;
    $('c_save').onclick = async function () {
      var name = $('c_name').value.trim(); if (!name) { $('c_err').innerHTML = '<div class="err">اكتبِ اسمَ الفصل</div>'; return; }
      c.name = name; c.grade = $('c_grade').value; c.order = +$('c_order').value || 0;
      if (isNew) c.students = parseStudents($('c_students').value);
      try { await saveClass(c); log(isNew ? 'إنشاءُ فصل' : 'تعديلُ فصل', c.name); closeSheet(); toast('حُفظ الفصل'); location.hash = '#/class/' + c._id; if (location.hash === '#/class/' + c._id) route(); } catch (e) { $('c_err').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
    };
    var ar_ = $('c_arch'); if (ar_) ar_.onclick = async function () { c.archived = !c.archived; c.archivedAt = c.archived ? Date.now() : null; try { await saveClass(c); log(c.archived ? 'أرشفةُ فصل' : 'إلغاءُ أرشفةِ فصل', c.name); closeSheet(); location.hash = '#/students'; } catch (e) { fail(e); } };
    var dl = $('c_del'); if (dl) dl.onclick = async function () { if (!confirm('حذفُ الفصلِ «' + c.name + '» وطلابِه؟ السجلّاتُ القديمةُ تبقى لكن بلا أسماء.')) return; try { await deleteClass(c); log('حذفُ فصل', c.name); closeSheet(); location.hash = '#/students'; } catch (e) { fail(e); } };
  }
  function parseStudents(txt) {
    return String(txt || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = /^([0-9٠-٩]+)[\s.\-–:،]+(.+)$/.exec(l); var no = m ? +m[1].replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }) : null; var name = (m ? m[2] : l).replace(/\s+/g, ' ').trim();
      var s = { id: uid('s'), name: name }; if (no) s.no = no; return s;
    });
  }
  function importSheet() {
    openSheet('<h3 class="t">استيرادُ قائمةِ طلابٍ كاملة</h3><p class="hint">الصقْ من إكسل عمودَين: <b>الفصل</b> ثمّ <b>اسمُ الطالب</b> (وعمودٌ ثالثٌ اختياريٌّ لرقمِ الجلوس). تُنشأُ الفصولُ غيرُ الموجودةِ تلقائياً، ويُلحقُ الطلابُ بالموجودة.</p>'
      + '<div class="field"><label>الصفُّ للفصولِ الجديدة</label><select id="i_grade">' + S.settings.grades.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><textarea id="i_txt" style="min-height:200px" placeholder="10/1\tأحمد محمد العلي\t1&#10;10/1\tخالد سعد الدوسري\t2&#10;10/2\tفهد ناصر المطيري"></textarea></div><div id="i_err"></div><div class="foot"><div class="r"><button class="btn" id="i_cancel">إلغاء</button><button class="btn p" id="i_go">استيراد</button></div></div>');
    $('i_cancel').onclick = closeSheet;
    $('i_go').onclick = async function () {
      var rows = $('i_txt').value.split(/\r?\n/).map(function (l) { return l.split(/\t|,|;/).map(function (x) { return x.trim(); }); }).filter(function (r) { return r.length >= 2 && r[0] && r[1]; });
      if (!rows.length) { $('i_err').innerHTML = '<div class="err">لم أجدْ صفوفاً بعمودَين على الأقل</div>'; return; }
      var touched = {}, made = 0, added = 0;
      rows.forEach(function (r) {
        var c = (S.classes || []).filter(function (x) { return norm(x.name) === norm(r[0]) && !x.archived; })[0];
        if (!c) { c = { _id: uid('c'), name: r[0], grade: $('i_grade').value, order: (S.classes || []).length + 1, students: [], created: Date.now() }; S.classes.push(c); made++; }
        if (!(c.students || []).some(function (s) { return norm(s.name) === norm(r[1]); })) { var s = { id: uid('s'), name: r[1].replace(/\s+/g, ' ') }; if (r[2] && +r[2]) s.no = +r[2]; c.students = (c.students || []).concat([s]); added++; }
        touched[c._id] = c;
      });
      $('i_go').disabled = true;
      try { for (var k in touched) await saveClass(touched[k]); log('استيرادُ قائمة', made + ' فصول، ' + added + ' طالباً'); closeSheet(); toast('أُضيف ' + ar(added) + ' طالباً في ' + ar(Object.keys(touched).length) + ' فصلاً'); route(); } catch (e) { $('i_err').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; $('i_go').disabled = false; }
    };
  }

  /* ---------------- صفحةُ الفصل ---------------- */
  async function classView(p) {
    var c = cls(p[0]); if (!c) throw new Error('الفصلُ غيرُ موجود');
    await loadAll();
    var r = periodRange(), evs = evsIn(r.from, r.to, function (e) { return e.cls === c._id; });
    var by = {}; evs.forEach(function (e) { by[e.sid] = by[e.sid] || []; by[e.sid].push(e); });
    var sortKey = S.clsSort || 'no';
    var L = (c.students || []).slice();
    var cntOf = {}; L.forEach(function (s) { cntOf[s.id] = countBy(by[s.id] || []); cntOf[s.id].score = score(by[s.id] || []); });
    L.sort(function (a, b) { if (sortKey === 'name') return a.name.localeCompare(b.name, 'ar'); if (sortKey === 'no') return (+a.no || 999) - (+b.no || 999) || a.name.localeCompare(b.name, 'ar'); return (cntOf[b.id][sortKey] || 0) - (cntOf[a.id][sortKey] || 0); });
    var tot = countBy(evs);
    var html = '<div class="crumb"><a href="#/students">الطلابُ والفصول</a><span class="sep">›</span>' + esc(c.name) + '</div>'
      + '<div class="ttl"><div><h2>' + esc(c.name) + '</h2><p>' + esc(gradeName(c.grade)) + ' · ' + plural(L.length, 'طالبٌ واحد', 'طالبان', 'طلاب', 'بلا طلاب') + (c.archived ? ' · مؤرشف' : '') + '</p></div><div class="acts noprint">' + (RO() ? '' : '<button class="btn p" id="sAdd">' + ICO.plus + ' طلاب</button><button class="btn" id="cEdit">' + ICO.edit + ' الفصل</button>') + '<button class="btn" id="cCsv">' + ICO.dl + ' CSV</button><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('تقريرُ الفصل ' + c.name, r.label) + filtersHTML() + tilesHTML(tot, null, true)
      + '<div class="tblwrap"><table class="tbl" id="cTbl"><thead><tr><th data-k="no" class="c">#</th><th data-k="name">الطالب</th>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (k) { return '<th data-k="' + k + '" class="c" style="color:' + TYPE[k].hex + '">' + TYPE[k].short + '</th>'; }).join('') + '<th data-k="score" class="c">المؤشّر</th><th class="c noprint"></th></tr></thead><tbody>'
      + L.map(function (s) { var k = cntOf[s.id]; return '<tr><td class="c">' + (s.no ? ar(s.no) : '') + '</td><td><a href="#/student/' + c._id + '/' + s.id + '">' + esc(s.name) + '</a>' + (s.gphone ? ' <small class="muted">' + ar(s.gphone) + '</small>' : '') + '</td>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (t) { return '<td class="c">' + (k[t] ? ar(k[t]) : '<span class="muted">–</span>') + '</td>'; }).join('') + '<td class="c">' + scoreHTML(k.score) + '</td><td class="c noprint">' + (RO() ? '' : '<button class="icon-btn se" data-s="' + s.id + '" title="تعديل">' + ICO.edit + '</button>') + '</td></tr>'; }).join('')
      + (L.length ? '<tr class="tot"><td></td><td>المجموع</td>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (t) { return '<td class="c">' + ar(tot[t]) + '</td>'; }).join('') + '<td></td><td class="noprint"></td></tr>' : '') + '</tbody></table></div>'
      + (L.length ? '' : '<div class="empty" style="margin-top:14px"><b>لا طلابَ في هذا الفصل</b>اضغطْ «+ طلاب» والصقْ الأسماء</div>');
    view.innerHTML = html;
    bindFilters(route);
    view.querySelectorAll('#cTbl th[data-k]').forEach(function (th) { if (th.dataset.k === sortKey) th.classList.add('on'); th.onclick = function () { S.clsSort = th.dataset.k; route(); }; });
    var sa = $('sAdd'); if (sa) sa.onclick = function () { addStudentsSheet(c); };
    var ce = $('cEdit'); if (ce) ce.onclick = function () { classSheet(c); };
    $('cCsv').onclick = function () { downloadCSV(c.name + ' — ' + r.label + '.csv', [['#', 'الطالب', 'تأخير', 'غياب', 'بلا عذر', 'مرضية', 'أيام المرضية', 'نوم', 'مخالفات', 'فصل', 'أيام الفصل', 'تعهدات', 'ملاحظات', 'المؤشر']].concat(L.map(function (s) { var k = cntOf[s.id]; return [s.no || '', s.name, k.late, k.absent, k.unexcused, k.sick, k.sickDays, k.sleep, k.viol, k.expel, k.expelDays, k.pledge, k.note, k.score]; }))); };
    view.querySelectorAll('.se').forEach(function (b) { b.onclick = function () { var s = (c.students || []).filter(function (x) { return x.id === b.dataset.s; })[0]; studentSheet(c, s); }; });
  }
  function addStudentsSheet(c) {
    openSheet('<h3 class="t">إضافةُ طلابٍ إلى ' + esc(c.name) + '</h3><div class="field"><label>اسمٌ في كلِّ سطر (ويمكنُ سبقُه برقمِ الجلوس)</label><textarea id="a_txt" style="min-height:180px"></textarea></div><div class="foot"><div class="r"><button class="btn" id="a_cancel">إلغاء</button><button class="btn p" id="a_go">إضافة</button></div></div>');
    $('a_cancel').onclick = closeSheet;
    $('a_go').onclick = async function () { var L = parseStudents($('a_txt').value); if (!L.length) return; c.students = (c.students || []).concat(L); try { await saveClass(c); log('إضافةُ طلاب', c.name + ' +' + L.length); closeSheet(); toast('أُضيف ' + ar(L.length)); route(); } catch (e) { fail(e); } };
  }
  function studentSheet(c, s) {
    openSheet('<div class="who"><span class="av">' + esc(initials(s.name)) + '</span><div><h3>بياناتُ الطالب</h3><small>' + esc(c.name) + '</small></div></div>'
      + '<div class="field"><label>الاسم</label><input id="s_name" value="' + esc(s.name) + '"></div>'
      + '<div class="row2"><div class="field"><label>رقمُ الجلوس</label><input id="s_no" type="number" value="' + esc(s.no || '') + '"></div><div class="field"><label>الرقمُ المدني / السجل</label><input id="s_civil" value="' + esc(s.civil || '') + '"></div></div>'
      + '<div class="row2"><div class="field"><label>وليُّ الأمر</label><input id="s_guardian" value="' + esc(s.guardian || '') + '"></div><div class="field"><label>هاتفُ وليِّ الأمر</label><input id="s_gphone" type="tel" value="' + esc(s.gphone || '') + '"></div></div>'
      + '<div class="field"><label>نقلٌ إلى فصلٍ آخر</label><select id="s_move"><option value="">— يبقى في ' + esc(c.name) + '</option>' + activeClasses().filter(function (x) { return x._id !== c._id; }).map(function (x) { return '<option value="' + x._id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label>ملاحظةٌ دائمة (حالةٌ صحّية، توصية…)</label><textarea id="s_note">' + esc(s.note || '') + '</textarea></div>'
      + '<div class="foot"><button class="btn s d" id="s_del">حذفُ الطالب</button><div class="r"><button class="btn" id="s_cancel">إلغاء</button><button class="btn p" id="s_save">حفظ</button></div></div>');
    $('s_cancel').onclick = closeSheet;
    $('s_save').onclick = async function () {
      s.name = $('s_name').value.trim() || s.name; s.no = +$('s_no').value || null; s.civil = $('s_civil').value.trim(); s.guardian = $('s_guardian').value.trim(); s.gphone = $('s_gphone').value.trim(); s.note = $('s_note').value.trim();
      Object.keys(s).forEach(function (k) { if (s[k] === '' || s[k] === null) delete s[k]; });
      var mv = $('s_move').value;
      try {
        if (mv && cls(mv)) { var to = cls(mv); c.students = c.students.filter(function (x) { return x.id !== s.id; }); to.students = (to.students || []).concat([s]); await saveClass(c); await saveClass(to); log('نقلُ طالب', s.name + ' → ' + to.name); closeSheet(); toast('نُقل إلى ' + to.name); location.hash = '#/class/' + to._id; return; }
        await saveClass(c); log('تعديلُ طالب', s.name); closeSheet(); toast('حُفظ'); route();
      } catch (e) { fail(e); }
    };
    $('s_del').onclick = async function () { if (!confirm('حذفُ الطالبِ «' + s.name + '»؟ سجلّاتُه تبقى بلا اسم.')) return; c.students = c.students.filter(function (x) { return x.id !== s.id; }); try { await saveClass(c); log('حذفُ طالب', s.name); closeSheet(); location.hash = '#/class/' + c._id; route(); } catch (e) { fail(e); } };
  }

  /* ---------------- ملفُّ الطالب ---------------- */
  async function studentView(p) {
    var st = findStudent(p[0], p[1]); if (!st) throw new Error('الطالبُ غيرُ موجود');
    var c = st.c, s = st.s;
    await loadAll();
    var r = periodRange(), evs = evsIn(r.from, r.to, function (e) { return e.sid === s.id; }), cnt = countBy(evs), sc = score(evs);
    var typeF = p[2] && TYPE[p[2]] ? p[2] : '';
    var shown = (typeF ? evs.filter(function (e) { return e.type === typeF; }) : evs).slice().sort(function (a, b) { return b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0); });
    var dayMap = {}; evs.forEach(function (e) { dayMap[e.date] = dayMap[e.date] || {}; dayMap[e.date][e.type] = (dayMap[e.date][e.type] || 0) + 1; });
    var L = (c.students || []).slice().sort(function (a, b) { return (+a.no || 999) - (+b.no || 999) || a.name.localeCompare(b.name, 'ar'); }), idx = L.map(function (x) { return x.id; }).indexOf(s.id);
    var html = '<div class="crumb"><a href="#/students">الطلابُ والفصول</a><span class="sep">›</span><a href="#/class/' + c._id + '">' + esc(c.name) + '</a><span class="sep">›</span>' + esc(s.name) + '</div>'
      + '<div class="ttl"><div><h2>' + esc(s.name) + '</h2><p>' + esc(c.name) + ' · ' + esc(gradeName(c.grade)) + (s.no ? ' · رقم ' + ar(s.no) : '') + (s.guardian ? ' · وليُّ الأمر: ' + esc(s.guardian) : '') + (s.gphone ? ' <bdi>' + ar(s.gphone) + '</bdi>' : '') + '</p></div>'
      + '<div class="acts noprint">' + (RO() ? '' : '<button class="btn p" id="stAdd">' + ICO.plus + ' تسجيل</button><button class="btn" id="stEdit">' + ICO.edit + ' البيانات</button>') + '<a class="btn" href="#/letter/' + c._id + '/' + s.id + '">' + ICO.doc + ' خطابُ وليِّ الأمر</a><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('ملفُّ الطالب: ' + s.name, c.name + ' · ' + r.label)
      + (s.note ? '<div class="al" style="margin-bottom:14px"><span class="pip" style="background:var(--gold);color:var(--navy-ink)">📌</span><span>' + esc(s.note) + '</span></div>' : '')
      + '<div class="noprint" style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">' + filtersHTML() + '<div class="seg">' + (idx > 0 ? '<button id="stPrev">‹ ' + esc(L[idx - 1].name.split(' ')[0]) + '</button>' : '') + '<button disabled>' + ar(idx + 1) + ' / ' + ar(L.length) + '</button>' + (idx < L.length - 1 ? '<button id="stNext">' + esc(L[idx + 1].name.split(' ')[0]) + ' ›</button>' : '') + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="muted small">مؤشّرُ السلوك:</span>' + scoreHTML(sc) + '<span class="muted small">(أوزانُ الأنواعِ في الإعدادات)</span></div>'
      + tilesHTML(cnt, '#/student/' + c._id + '/' + s.id + '/', false)
      + '<div class="panel no-brief"><h3>التوزيعُ الأسبوعي</h3><div class="chart" id="stChart"></div>' + LEGEND + '</div>'
      + '<div class="panel no-brief"><h3>التقويم</h3><div class="cal" id="stCal"></div></div>'
      + '<div class="panel"><h3>' + (typeF ? TYPE[typeF].label + ' <a class="btn xs noprint" href="#/student/' + c._id + '/' + s.id + '">كلُّ الأنواع</a>' : 'كلُّ السجلّات') + ' <span class="muted small">' + plural(shown.length, 'تسجيلٌ واحد', 'تسجيلان', 'تسجيلات', 'لا تسجيلات') + '</span></h3><div class="evlist" id="stList">' + (shown.length ? shown.map(function (e) { return evHTML(e, { date: true, noName: true }); }).join('') : '<div class="empty">لا تسجيلاتَ في هذه المدّة</div>') + '</div></div>';
    view.innerHTML = html;
    bindFilters(route);
    Charts.stackedBars($('stChart'), weekBuckets(evs, r.from, r.to), SERIES, { height: 200 });
    var calTo = r.to > today() ? today() : r.to, calFrom = r.from < '2000-01-02' ? addDays(calTo, -120) : r.from;
    Charts.calendar($('stCal'), calFrom, calTo, dayMap, COLORS, null);
    bindEvActs($('stList'), route);
    var a = $('stAdd'); if (a) a.onclick = function () { recordSheet({ c: c, s: s, date: today(), done: route }); };
    var e = $('stEdit'); if (e) e.onclick = function () { studentSheet(c, s); };
    var pv = $('stPrev'); if (pv) pv.onclick = function () { location.hash = '#/student/' + c._id + '/' + L[idx - 1].id; };
    var nx = $('stNext'); if (nx) nx.onclick = function () { location.hash = '#/student/' + c._id + '/' + L[idx + 1].id; };
  }

  /* ---------------- التقارير: المدرسةُ كلُّها ---------------- */
  async function reportsView(p) {
    await loadAll();
    var r = periodRange(), evs = evsIn(r.from, r.to), classes = activeClasses();
    var byCls = {}, byStu = {};
    evs.forEach(function (e) { byCls[e.cls] = byCls[e.cls] || []; byCls[e.cls].push(e); var k = e.cls + '|' + e.sid; byStu[k] = byStu[k] || []; byStu[k].push(e); });
    var tot = countBy(evs);
    var violBy = {}; evs.forEach(function (e) { if (e.type === 'viol') violBy[e.sub || 'behavior'] = (violBy[e.sub || 'behavior'] || 0) + 1; });
    function rank(type, label) {
      var rows = Object.keys(byStu).map(function (k) { var st = findStudent(k.split('|')[0], k.split('|')[1]); var c = countBy(byStu[k]); return st ? { st: st, n: type === 'unexcused' ? c.unexcused : c[type] } : null; }).filter(function (x) { return x && x.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
      if (!rows.length) return '';
      var max = rows[0].n, col = TYPE[type === 'unexcused' ? 'absent' : type].hex;
      return '<div class="panel"><h3>' + label + '</h3><ol class="rank">' + rows.map(function (x) { return '<li><a href="#/student/' + x.st.c._id + '/' + x.st.s.id + '">' + esc(x.st.s.name) + '</a> <small class="muted">' + esc(x.st.c.name) + '</small><span class="bar"><i style="width:' + Math.round(x.n / max * 100) + '%;background:' + col + '"></i></span><span class="v">' + ar(x.n) + '</span></li>'; }).join('') + '</ol></div>';
    }
    var html = '<div class="ttl"><div><h2>التقارير</h2><p>' + esc(S.settings.school) + ' · ' + esc(r.label) + '</p></div><div class="acts noprint"><button class="btn" id="rCsv">' + ICO.dl + ' CSV الفصول</button><button class="btn" id="rCsvAll">' + ICO.dl + ' CSV كلِّ التسجيلات</button><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('التقريرُ العام', r.label) + filtersHTML() + tilesHTML(tot, null, false)
      + '<div class="panel"><h3>التوزيعُ الأسبوعيُّ للمدرسة</h3><div class="chart" id="rChart"></div>' + LEGEND + '</div>'
      + '<div class="panel"><h3>الفصول</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>الفصل</th><th class="c">الطلاب</th>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (k) { return '<th class="c" style="color:' + TYPE[k].hex + '">' + TYPE[k].short + '</th>'; }).join('') + '<th class="c">غيابٌ بلا عذر</th><th class="c">المؤشّر</th></tr></thead><tbody>'
      + classes.map(function (c) { var k = countBy(byCls[c._id] || []); return '<tr><td><a href="#/class/' + c._id + '">' + esc(c.name) + '</a></td><td class="c">' + ar((c.students || []).length) + '</td>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (t) { return '<td class="c">' + (k[t] ? ar(k[t]) : '<span class="muted">–</span>') + '</td>'; }).join('') + '<td class="c">' + ar(k.unexcused) + '</td><td class="c">' + scoreHTML(score(byCls[c._id] || [])) + '</td></tr>'; }).join('')
      + '<tr class="tot"><td>المجموع</td><td class="c">' + ar(allStudents().length) + '</td>' + ['late', 'absent', 'sick', 'sleep', 'viol', 'expel', 'pledge'].map(function (t) { return '<td class="c">' + ar(tot[t]) + '</td>'; }).join('') + '<td class="c">' + ar(tot.unexcused) + '</td><td></td></tr></tbody></table></div></div>'
      + '<div class="panel"><h3>المخالفاتُ بحسبِ النوع</h3><ol class="rank">' + VIOL_KEYS.map(function (k) { var n = violBy[k] || 0, max = Math.max.apply(null, VIOL_KEYS.map(function (x) { return violBy[x] || 0; }).concat([1])); return '<li><span style="min-width:140px">' + esc(S.settings.violCats[k]) + '</span><span class="bar"><i style="width:' + Math.round(n / max * 100) + '%;background:var(--c-viol)"></i></span><span class="v">' + ar(n) + '</span></li>'; }).join('') + '</ol></div>'
      + '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">' + rank('late', 'الأكثرُ تأخيراً') + rank('unexcused', 'الأكثرُ غياباً بلا عذر') + rank('viol', 'الأكثرُ مخالفات') + rank('expel', 'الأكثرُ فصلاً') + rank('sleep', 'الأكثرُ نوماً في الحصص') + '</div>';
    view.innerHTML = html;
    bindFilters(route);
    Charts.stackedBars($('rChart'), weekBuckets(evs, r.from, r.to), SERIES, { height: 220 });
    $('rCsv').onclick = function () { downloadCSV('تقرير الفصول — ' + r.label + '.csv', [['الفصل', 'الطلاب', 'تأخير', 'غياب', 'بلا عذر', 'مرضية', 'نوم', 'مخالفات', 'فصل', 'تعهدات', 'ملاحظات']].concat(classes.map(function (c) { var k = countBy(byCls[c._id] || []); return [c.name, (c.students || []).length, k.late, k.absent, k.unexcused, k.sick, k.sleep, k.viol, k.expel, k.pledge, k.note]; }))); };
    $('rCsvAll').onclick = function () { exportAllCSV(evs, 'كل التسجيلات — ' + r.label + '.csv'); };
  }
  function exportAllCSV(evs, name) {
    downloadCSV(name, [['التاريخ', 'الفصل', 'الطالب', 'النوع', 'التفصيل', 'الحصة', 'المعلم', 'الإجراء', 'ملاحظة']].concat(evs.map(function (e) { var st = findStudent(e.cls, e.sid); return [e.date, st ? st.c.name : e.cls, st ? st.s.name : e.sid, TYPE[e.type].short, subLabel(e), e.period || '', e.teacher || '', e.action || '', e.note || (e.reason || '')]; })));
  }

  /* ---------------- السجلُّ العام ---------------- */
  async function logView(p) {
    await loadAll();
    var r = periodRange(), tf = S.logType || '', cf = S.logCls || '';
    var evs = evsIn(r.from, r.to, function (e) { return (!tf || e.type === tf) && (!cf || e.cls === cf); }).sort(function (a, b) { return b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0); });
    var html = '<div class="ttl"><div><h2>السجل</h2><p>' + plural(evs.length, 'تسجيلٌ واحد', 'تسجيلان', 'تسجيلات', 'لا تسجيلات') + ' في ' + esc(r.label) + '</p></div><div class="acts noprint"><button class="btn" id="lCsv">' + ICO.dl + ' CSV</button><button class="btn" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + reportHead('سجلُّ التسجيلات', r.label) + filtersHTML()
      + '<div class="filters noprint"><div class="chips" style="margin:0"><button data-t="" aria-pressed="' + !tf + '">الكلّ</button>' + TYPES.map(function (t) { return '<button class="t-' + t.key + '" data-t="' + t.key + '" aria-pressed="' + (tf === t.key) + '">' + t.short + '</button>'; }).join('') + '</div><select id="lCls" class="btn s"><option value="">كلُّ الفصول</option>' + activeClasses().map(function (c) { return '<option value="' + c._id + '"' + (cf === c._id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>'
      + '<div class="evlist" id="lList">' + (evs.length ? evs.slice(0, 400).map(function (e) { return evHTML(e, { date: true }); }).join('') + (evs.length > 400 ? '<p class="hint">عُرضت أوّلُ ٤٠٠ — ضيّقِ المدّةَ أو صدّرْ CSV</p>' : '') : '<div class="empty">لا تسجيلاتَ تطابقُ المرشّح</div>') + '</div>';
    view.innerHTML = html;
    bindFilters(route);
    view.querySelectorAll('.chips button').forEach(function (b) { b.onclick = function () { S.logType = b.dataset.t; route(); }; });
    $('lCls').onchange = function () { S.logCls = $('lCls').value; route(); };
    $('lCsv').onclick = function () { exportAllCSV(evs, 'السجل — ' + r.label + '.csv'); };
    bindEvActs($('lList'), route);
  }
  async function activityView() {
    var rows = await DB.list(C('log'));
    var items = []; rows.forEach(function (d) { (d.items || []).forEach(function (i) { items.push(i); }); }); items.sort(function (a, b) { return b.ts - a.ts; });
    view.innerHTML = '<div class="crumb"><a href="#/settings">الإعدادات</a><span class="sep">›</span>سجلُّ النشاط</div><div class="ttl"><div><h2>سجلُّ النشاط</h2><p>مَن أضافَ أو عدّلَ أو حذفَ ومتى</p></div></div><div class="tblwrap"><table class="tbl"><thead><tr><th>الوقت</th><th>العملية</th><th>التفصيل</th><th>بواسطة</th></tr></thead><tbody>' + (items.slice(0, 500).map(function (i) { return '<tr><td>' + fmtTs(i.ts) + '</td><td>' + esc(i.act) + '</td><td>' + esc(i.d) + '</td><td class="small">' + esc(i.by || '') + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">لا شيء بعد</td></tr>') + '</tbody></table></div>';
  }

  /* ---------------- ورقةُ التعهّد وخطابُ وليِّ الأمر ---------------- */
  async function pledgeView(p) {
    var st = findStudent(p[0], p[1]); if (!st) throw new Error('الطالبُ غيرُ موجود');
    await loadAll();
    var ev = null, date = '';
    Object.keys(S.all.map).forEach(function (d) { (S.all.map[d] && S.all.map[d].ev || []).forEach(function (e) { if (e.id === p[2]) { ev = e; date = d; } }); });
    if (!ev) throw new Error('التعهّدُ غيرُ موجود');
    var r = periodRange(), cnt = countBy(evsIn(r.from, r.to, function (e) { return e.sid === st.s.id; }));
    view.innerHTML = '<div class="crumb noprint"><a href="#/student/' + st.c._id + '/' + st.s.id + '">' + esc(st.s.name) + '</a><span class="sep">›</span>ورقةُ التعهّد</div><div class="ttl noprint"><div><h2>ورقةُ التعهّد</h2></div><div class="acts"><button class="btn p" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><b>' + esc(S.settings.school) + '</b><br><small class="muted">الإشرافُ التربوي — ' + esc(S.settings.supervisor) + '</small></div><img src="img/logo.svg" style="height:56px"></div>'
      + '<h2>تعهّدٌ خطّي</h2>'
      + '<div class="kv"><b>اسمُ الطالب:</b><span>' + esc(st.s.name) + '</span><b>الفصل:</b><span>' + esc(st.c.name) + '</span><b>التاريخ:</b><span>' + fmtDate(date, true) + ' — ' + esc(hijri(pd(date))) + '</span><b>الموضوع:</b><span>' + esc(ev.kind || '—') + '</span></div>'
      + '<div class="txt">' + nl(ev.text || S.settings.pledgeText) + (ev.note ? '\n\n' + nl(ev.note) : '') + '</div>'
      + '<table><tr><th>تأخير</th><th>غياب</th><th>نوم</th><th>مخالفات</th><th>تعهّداتٌ سابقة</th></tr><tr><td>' + ar(cnt.late) + '</td><td>' + ar(cnt.absent) + '</td><td>' + ar(cnt.sleep) + '</td><td>' + ar(cnt.viol) + '</td><td>' + ar(Math.max(0, cnt.pledge - 1)) + '</td></tr></table><p class="small muted">الأرقامُ في ' + esc(r.label) + '</p>'
      + '<div class="sig"><div>توقيعُ الطالب<span></span></div><div>توقيعُ وليِّ الأمر' + (ev.guardian ? ' (حضر)' : '') + '<span></span></div><div>المشرف<span>' + esc(S.settings.supervisor) + '</span></div></div></div>';
  }
  async function letterView(p) {
    var st = findStudent(p[0], p[1]); if (!st) throw new Error('الطالبُ غيرُ موجود');
    await loadAll();
    var r = periodRange(), evs = evsIn(r.from, r.to, function (e) { return e.sid === st.s.id; }), cnt = countBy(evs);
    var lines = [];
    if (cnt.late) lines.push('التأخّرُ عن الطابورِ الصباحي ' + plural(cnt.late, 'مرّةً واحدة', 'مرّتين', 'مرّات'));
    if (cnt.absent) lines.push('الغيابُ ' + plural(cnt.absent, 'يوماً واحداً', 'يومين', 'أيّام') + (cnt.unexcused ? ' منها ' + ar(cnt.unexcused) + ' بلا عذر' : ''));
    if (cnt.sleep) lines.push('النومُ في الحصّة ' + plural(cnt.sleep, 'مرّةً واحدة', 'مرّتين', 'مرّات'));
    if (cnt.viol) lines.push(plural(cnt.viol, 'مخالفةٌ واحدة', 'مخالفتان', 'مخالفات') + ': ' + evs.filter(function (e) { return e.type === 'viol'; }).map(function (e) { return S.settings.violCats[e.sub] || e.sub; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join('، '));
    var txt = 'السلامُ عليكم ورحمةُ اللهِ وبركاته\nوليَّ أمرِ الطالبِ ' + st.s.name + ' — ' + st.c.name + '\nنفيدُكم بأنّ سجلَّ ابنِكم خلالَ ' + r.label + ' تضمّنَ ما يلي:\n' + (lines.length ? lines.map(function (l) { return '• ' + l; }).join('\n') : '• لا ملاحظاتَ تُذكَر — ونشكرُ التزامَه') + '\nونأملُ التكرّمَ بمتابعتِه' + (lines.length ? ' ومراجعةِ الإشرافِ التربويِّ عند الحاجة' : '') + '.\n' + S.settings.supervisor + ' — ' + S.settings.school;
    view.innerHTML = '<div class="crumb noprint"><a href="#/student/' + st.c._id + '/' + st.s.id + '">' + esc(st.s.name) + '</a><span class="sep">›</span>خطابُ وليِّ الأمر</div><div class="ttl noprint"><div><h2>خطابُ وليِّ الأمر</h2><p>نصٌّ جاهزٌ للنسخِ أو الواتساب أو الطباعة</p></div><div class="acts"><button class="btn" id="ltCopy">نسخُ النص</button>' + (st.s.gphone ? '<a class="btn g" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(st.s.gphone).replace(/\D/g, '').replace(/^0/, '965')) + '?text=' + encodeURIComponent(txt) + '">واتساب</a>' : '') + '<button class="btn p" onclick="window.print()">' + ICO.print + ' طباعة</button></div></div>'
      + filtersHTML()
      + '<div class="doc"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><b>' + esc(S.settings.school) + '</b><br><small class="muted">الإشرافُ التربوي — ' + esc(S.settings.supervisor) + '</small></div><img src="img/logo.svg" style="height:56px"></div><h2>إشعارُ وليِّ الأمر</h2><div class="kv"><b>الطالب:</b><span>' + esc(st.s.name) + '</span><b>الفصل:</b><span>' + esc(st.c.name) + '</span><b>المدّة:</b><span>' + esc(r.label) + '</span><b>التاريخ:</b><span>' + fmtDate(today(), true) + '</span></div><div class="txt" id="ltTxt">' + nl(txt) + '</div>'
      + '<table><tr><th>تأخير</th><th>غياب</th><th>بلا عذر</th><th>مرضيّة</th><th>نوم</th><th>مخالفات</th><th>تعهّدات</th></tr><tr><td>' + ar(cnt.late) + '</td><td>' + ar(cnt.absent) + '</td><td>' + ar(cnt.unexcused) + '</td><td>' + ar(cnt.sick) + '</td><td>' + ar(cnt.sleep) + '</td><td>' + ar(cnt.viol) + '</td><td>' + ar(cnt.pledge) + '</td></tr></table>'
      + '<div class="sig"><div>توقيعُ وليِّ الأمر<span></span></div><div>المشرف<span>' + esc(S.settings.supervisor) + '</span></div><div>مديرُ المدرسة<span></span></div></div></div>';
    bindFilters(route);
    $('ltCopy').onclick = function () { navigator.clipboard.writeText(txt).then(function () { toast('نُسخ النص'); }, function () { toast('تعذّر النسخ', true); }); };
  }

  /* ---------------- الإعدادات ---------------- */
  async function settingsView() {
    var st = S.settings, ro = RO();
    function listField(id, label, arr, hint) { return '<div class="field"><label>' + label + '</label><textarea id="' + id + '" style="min-height:70px"' + (ro ? ' disabled' : '') + '>' + esc((arr || []).join('\n')) + '</textarea>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; }
    var html = '<div class="ttl"><div><h2>الإعدادات</h2><p>' + (ro ? 'حسابُك للقراءةِ فقط' : 'تُحفَظُ في حسابِ المشرف وتسري على كلِّ الأجهزة') + '</p></div><div class="acts noprint"><a class="btn" href="#/activity">سجلُّ النشاط</a>' + (ro ? '' : '<button class="btn p" id="stSave">حفظُ الإعدادات</button>') + '</div></div>'
      + '<div class="panel"><h3>المدرسةُ والعام</h3><div class="row3"><div class="field"><label>اسمُ المدرسة</label><input id="s_school" value="' + esc(st.school) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label>اسمُ المشرف</label><input id="s_sup" value="' + esc(st.supervisor) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label>العامُ الدراسي</label><input id="s_year" value="' + esc(st.year) + '"' + (ro ? ' disabled' : '') + '></div></div>'
      + '<div class="row3"><div class="field"><label>نهايةُ الطابورِ الصباحي</label><input id="s_late" type="time" value="' + esc(st.lateAfter) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label>عددُ الحصص</label><input id="s_per" type="number" min="1" max="12" value="' + esc(st.periods) + '"' + (ro ? ' disabled' : '') + '></div></div></div>'
      + '<div class="panel"><h3>الفصولُ الدراسية</h3><div id="termsBox">' + st.terms.map(function (t, i) { return '<div class="row3" data-i="' + i + '"><div class="field"><label>الاسم</label><input class="t_name" value="' + esc(t.name) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label>من</label><input class="t_start" type="date" value="' + esc(t.start) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label>إلى</label><input class="t_end" type="date" value="' + esc(t.end) + '"' + (ro ? ' disabled' : '') + '></div></div>'; }).join('') + '</div></div>'
      + '<div class="panel"><h3>الصفوف</h3>' + listField('s_grades', 'صفٌّ في كلِّ سطر بصيغة: المعرّف | الاسم | المختصر', st.grades.map(function (g) { return g.id + ' | ' + g.name + ' | ' + g.short; }), 'لا تغيّرِ المعرّفَ بعدَ إنشاءِ الفصولِ عليه') + '</div>'
      + '<div class="panel"><h3>حدودُ التنبيه</h3><p class="hint">يظهرُ الطالبُ في تنبيهاتِ الرئيسة إذا بلغَ هذا العددَ في المدّةِ المختارة (صفرٌ = بلا تنبيه)</p><div class="tiles" style="grid-template-columns:repeat(4,1fr)">' + ['late', 'absent', 'viol', 'sleep'].map(function (k) { return '<div class="tile ' + k + '"><div class="l">' + TYPE[k].short + (k === 'absent' ? ' بلا عذر' : '') + '</div><input class="al_in" data-k="' + k + '" type="number" min="0" value="' + esc(st.alerts[k]) + '" style="width:100%;font-size:22px;border:1px solid var(--line);border-radius:8px;padding:2px 8px"' + (ro ? ' disabled' : '') + '></div>'; }).join('') + '</div></div>'
      + '<div class="panel"><h3>أوزانُ مؤشّرِ السلوك</h3><p class="hint">مجموعُ الأوزانِ لكلِّ تسجيلاتِ الطالب — سالبٌ للمخالفات، صفرٌ لما لا يُحتسَب</p><div class="tiles">' + TYPES.map(function (t) { return '<div class="tile ' + t.key + '"><div class="l">' + t.short + '</div><input class="w_in" data-k="' + t.key + '" type="number" step="0.5" value="' + esc(st.weights[t.key]) + '" style="width:100%;font-size:22px;border:1px solid var(--line);border-radius:8px;padding:2px 8px"' + (ro ? ' disabled' : '') + '></div>'; }).join('') + '</div></div>'
      + '<div class="panel"><h3>التصنيفاتُ والقوائم</h3><div class="row2">' + '<div>' + VIOL_KEYS.map(function (k) { return '<div class="field"><label>مخالفة: ' + k + '</label><input class="vc_in" data-k="' + k + '" value="' + esc(st.violCats[k]) + '"' + (ro ? ' disabled' : '') + '></div>'; }).join('') + '</div>'
      + '<div>' + listField('s_banned', 'الموادُّ الممنوعة', st.bannedItems) + listField('s_actions', 'الإجراءاتُ المتّخذة', st.actions) + listField('s_sick', 'جهاتُ المرضيّات', st.sickSources) + '</div></div></div>'
      + '<div class="panel"><h3>أسبابُ الفصلِ عن الدراسة ومدّتُها</h3><p class="hint">سببٌ ثمّ عددُ أيّامِ الفصلِ الافتراضي في كلِّ سطر، مفصولَين بـ | — مثال: تدخين | 3</p>' + listField('s_expel', 'أسبابُ الفصل', st.expelReasons.map(function (x) { return x.reason + ' | ' + x.days; })) + '</div>'
      + '<div class="panel"><h3>نصُّ التعهّدِ الافتراضي</h3><div class="field"><textarea id="s_pledge" style="min-height:110px"' + (ro ? ' disabled' : '') + '>' + esc(st.pledgeText) + '</textarea></div></div>'
      + '<div class="panel"><h3>مشرفونَ قارئون</h3>' + listField('s_viewers', 'بريدٌ في كلِّ سطر — يقرأُ كلَّ شيءٍ ولا يعدّل (يحتاجُ حساباً في فايربيس)', st.viewers) + '</div>'
      + '<div class="panel"><h3>النسخُ الاحتياطي</h3><p class="hint">JSON كامل (إعدادات + فصول + كلُّ الأيّام) يُستعادُ من الزرِّ المجاور، وCSV لكلِّ التسجيلات</p><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bkJson">' + ICO.dl + ' تنزيل JSON</button><button class="btn" id="bkCsv">' + ICO.dl + ' تنزيل CSV</button>' + (ro ? '' : '<label class="btn">استعادةُ JSON<input type="file" id="bkRestore" accept="application/json" hidden></label>') + '<button class="btn" id="bkRefresh">تحديثُ البياناتِ من الخادم</button></div></div>'
      + (FB.demo ? '<div class="panel"><h3>الوضعُ التجريبي</h3><p class="hint">البياناتُ الوهميّةُ محفوظةٌ في هذا المتصفّحِ فقط</p><button class="btn d" id="demoReset">مسحُ البياناتِ التجريبيةِ وإعادةُ زرعِها</button></div>' : '')
      + '<p class="hint" style="margin-top:20px">الإصدار ' + ar(CFG.VERSION || 1) + ' · مشروعُ فايربيس <bdi>' + esc(CFG.PROJECT_ID) + '</bdi> · المشرف <bdi>' + esc((FB.admins || []).join('، ')) + '</bdi></p>';
    view.innerHTML = html;
    var sv = $('stSave'); if (sv) sv.onclick = async function () {
      st.school = $('s_school').value.trim() || st.school; st.supervisor = $('s_sup').value.trim(); st.year = $('s_year').value.trim(); st.lateAfter = $('s_late').value || '07:15'; st.periods = +$('s_per').value || 7;
      st.terms = Array.prototype.map.call(view.querySelectorAll('#termsBox .row3'), function (r, i) { return { id: st.terms[i] ? st.terms[i].id : 't' + (i + 1), name: r.querySelector('.t_name').value.trim(), start: r.querySelector('.t_start').value, end: r.querySelector('.t_end').value }; }).filter(function (t) { return t.name && t.start && t.end; });
      st.grades = $('s_grades').value.split('\n').map(function (l) { var p = l.split('|').map(function (x) { return x.trim(); }); return p[0] ? { id: p[0], name: p[1] || p[0], short: p[2] || p[1] || p[0] } : null; }).filter(Boolean);
      st.expelReasons = $('s_expel').value.split('\n').map(function (l) { var p = l.split('|').map(function (x) { return x.trim(); }); return p[0] ? { reason: p[0], days: Math.min(7, Math.max(1, +p[1] || 1)) } : null; }).filter(Boolean);
      view.querySelectorAll('.al_in').forEach(function (i) { st.alerts[i.dataset.k] = +i.value || 0; });
      view.querySelectorAll('.w_in').forEach(function (i) { st.weights[i.dataset.k] = num(i.value, 0); });
      view.querySelectorAll('.vc_in').forEach(function (i) { st.violCats[i.dataset.k] = i.value.trim() || st.violCats[i.dataset.k]; });
      var L = function (id) { return $(id).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
      st.bannedItems = L('s_banned'); st.actions = L('s_actions'); st.sickSources = L('s_sick'); st.pledgeText = $('s_pledge').value.trim(); st.viewers = L('s_viewers').map(function (e) { return e.toLowerCase(); });
      try { await saveSettings(); await saveAccess(); log('حفظُ الإعدادات', ''); toast('حُفظت الإعدادات'); renderHeader(); } catch (e) { fail(e); }
    };
    $('bkJson').onclick = async function () { await loadAll(true); downloadBlob('eshraf-backup-' + today() + '.json', JSON.stringify({ v: 1, at: Date.now(), settings: S.settings, classes: S.classes, days: S.all.map }, null, 1), 'application/json'); };
    $('bkCsv').onclick = async function () { await loadAll(true); exportAllCSV(evsIn('2000-01-01', '2999-12-31'), 'eshraf-all-' + today() + '.csv'); };
    $('bkRefresh').onclick = async function () { S.settings = null; S.classes = null; S.all = null; await loadCore(true); await loadAll(true); toast('حُدِّثت البيانات'); route(); };
    var rs = $('bkRestore'); if (rs) rs.onchange = async function () {
      var f = rs.files[0]; if (!f) return;
      try {
        var j = JSON.parse(await f.text()); if (!j.settings || !j.classes) throw new Error('ملفٌّ غيرُ صالح');
        if (!confirm('استعادةُ ' + ar(j.classes.length) + ' فصلاً و' + ar(Object.keys(j.days || {}).length) + ' يوماً؟ تُستبدَلُ الوثائقُ ذاتُ الأسماءِ نفسِها.')) return;
        S.settings = normSettings(j.settings); await saveSettings();
        for (var i = 0; i < j.classes.length; i++) { var c = j.classes[i]; S.classes = S.classes.filter(function (x) { return x._id !== c._id; }); await saveClass(c); }
        var days = j.days || {}; for (var d in days) { if (days[d] && days[d].ev) await saveDay(d, days[d].ev); }
        log('استعادةُ نسخة', f.name); toast('تمّت الاستعادة'); route();
      } catch (e) { fail(e); }
    };
    var dr = $('demoReset'); if (dr) dr.onclick = function () { DB.reset(); LS.del(CORE_KEY); LS.del(DAYS_KEY); location.reload(); };
  }

  /* ---------------- الوضعُ التجريبي: بذرة ---------------- */
  var FIRST = ['أحمد', 'محمد', 'خالد', 'فهد', 'عبدالله', 'سعود', 'ناصر', 'يوسف', 'عمر', 'علي', 'حمد', 'سالم', 'بدر', 'طلال', 'مشاري', 'راشد', 'جاسم', 'عبدالعزيز', 'فيصل', 'سلطان', 'حسين', 'إبراهيم', 'ماجد', 'وليد'];
  var LAST = ['العنزي', 'المطيري', 'الدوسري', 'العجمي', 'الرشيدي', 'الشمري', 'الهاجري', 'الكندري', 'العتيبي', 'القحطاني', 'الحربي', 'السبيعي', 'الفضلي', 'المري', 'الخالدي', 'البلوشي', 'الظفيري', 'الصالح', 'العلي', 'الجمعة'];
  async function seedDemo() {
    var ex = await DB.get(C('meta'), 'settings'); if (ex) return;
    var rnd = function (n) { return Math.floor(Math.random() * n); }, pick = function (a) { return a[rnd(a.length)]; };
    var st = defaultSettings(); st.school = 'ثانويةُ التجربةِ النموذجية — بنين'; st.supervisor = 'أ. مشرفُ التجربة';
    var t = today(); st.terms[0].start = addDays(t, -60); st.terms[0].end = addDays(t, 75); st.terms[1].start = addDays(t, 80); st.terms[1].end = addDays(t, 220);
    await DB.set(C('meta'), 'settings', st);
    var classes = [['10 / 1', '10'], ['10 / 2', '10'], ['11 / 1', '11'], ['11 / 2', '11'], ['12 / 1', '12']].map(function (x, i) { var students = []; for (var k = 0; k < 18 + rnd(8); k++) students.push({ id: uid('s'), name: pick(FIRST) + ' ' + pick(FIRST) + ' ' + pick(LAST), no: k + 1, gphone: '9' + (5000000 + rnd(4999999)) }); return { _id: 'c' + (i + 1), name: x[0], grade: x[1], order: i + 1, students: students, created: Date.now() }; });
    for (var i = 0; i < classes.length; i++) { var c = Object.assign({}, classes[i]); delete c._id; await DB.set(C('classes'), classes[i]._id, c); }
    var all = []; classes.forEach(function (c) { c.students.forEach(function (s) { all.push({ c: c, s: s }); }); });
    var trouble = all.filter(function () { return Math.random() < 0.12; });
    for (var d = 60; d >= 0; d--) {
      var date = addDays(t, -d); if (isWeekend(date)) continue;
      var ev = [], n = 6 + rnd(10), ts = pd(date).getTime() + 7 * 3600e3;
      for (var k = 0; k < n; k++) {
        var x = Math.random() < 0.5 && trouble.length ? pick(trouble) : pick(all), r = Math.random();
        var e = { id: uid('e'), sid: x.s.id, cls: x.c._id, ts: ts + k * 60e3 };
        if (r < 0.35) { var m = 1 + rnd(25); Object.assign(e, { type: 'late', time: ('0' + Math.floor((435 + m) / 60)).slice(-2) + ':' + ('0' + ((435 + m) % 60)).slice(-2), min: m }); }
        else if (r < 0.6) { if (ev.some(function (y) { return y.sid === e.sid && y.type === 'absent'; })) continue; Object.assign(e, { type: 'absent', sub: Math.random() < 0.7 ? 'unexcused' : 'excused' }); }
        else if (r < 0.68) Object.assign(e, { type: 'sick', from: date, to: addDays(date, rnd(3)), days: 1 + rnd(3), src: pick(st.sickSources) });
        else if (r < 0.78) Object.assign(e, { type: 'sleep', period: 1 + rnd(7), teacher: 'أ. ' + pick(FIRST) });
        else if (r < 0.93) { var sub = pick(VIOL_KEYS); Object.assign(e, { type: 'viol', sub: sub, item: sub === 'banned' ? pick(st.bannedItems) : '', period: 1 + rnd(7), teacher: 'أ. ' + pick(FIRST), action: pick(st.actions), note: sub === 'uniform' ? 'بلا زيٍّ مدرسي' : sub === 'dismiss' ? 'إخلالٌ بنظامِ الحصّة' : '' }); }
        else if (r < 0.97) Object.assign(e, { type: 'pledge', kind: pick(['عدمُ تكرارِ التأخير', 'الالتزامُ بالزيّ', 'عدمُ إحضارِ الهاتف', 'احترامُ المعلّم']), guardian: Math.random() < 0.5 });
        else Object.assign(e, { type: 'note', note: pick(['تحسّنٌ ملحوظ', 'اتّصالٌ بوليِّ الأمر', 'يحتاجُ متابعةً في الطابور']) });
        ev.push(e);
      }
      var sids = {}, clss = {}; ev.forEach(function (e) { sids[e.sid] = 1; clss[e.cls] = 1; });
      await DB.set(C('days'), date, { date: date, ev: ev, sids: Object.keys(sids), clss: Object.keys(clss), n: ev.length });
    }
  }

  /* ---------------- الإقلاع ---------------- */
  async function init() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') { try { navigator.serviceWorker.register('sw.js'); } catch (e) { } }
    await Auth.restore(); setRole();
    if (FB.demo) { try { await seedDemo(); } catch (e) { console.error(e); } }
    route();
  }
  window.ES = { S: S, route: route, recordSheet: recordSheet, loadAll: loadAll, evsIn: evsIn, countBy: countBy };
  init();
})();
