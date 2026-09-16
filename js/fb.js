/* ===== طبقةُ فايربيس: Auth + Firestore عبر REST الخام (بلا SDK) — ووضعٌ تجريبيٌّ محليّ =====
   تقرأُ الإعداداتِ من js/config.js (window.ESHRAF_CONFIG) فلا يُعدَّلُ هذا الملفُّ عند النقل. */
(function (root) {
  'use strict';
  var CFG = root.ESHRAF_CONFIG || {};
  var ADMINS = (CFG.ADMINS || []).map(function (e) { return String(e).trim().toLowerCase(); });
  var DEMO = /[?&]demo=1/.test(location.search);
  var SKEY = 'es_session_v1';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + CFG.PROJECT_ID + '/databases/(default)/documents';
  var session = null; /* {uid,email,idToken,rt,exp} */

  /* ---------- ترميزُ قيمِ فايرستور ---------- */
  function enc(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
    if (typeof v === 'object') { var f = {}; Object.keys(v).forEach(function (k) { if (v[k] !== undefined) f[k] = enc(v[k]); }); return { mapValue: { fields: f } }; }
    return { stringValue: String(v) };
  }
  function dec(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return v.doubleValue;
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) return decFields(v.mapValue.fields);
    return null;
  }
  function decFields(f) { var o = {}; Object.keys(f || {}).forEach(function (k) { o[k] = dec(f[k]); }); return o; }
  function docToObj(d) { var o = decFields(d.fields); o._id = d.name.split('/').pop(); o._path = d.name; return o; }

  /* ---------- Auth ---------- */
  var AUTH_ERRS = {
    EMAIL_NOT_FOUND: 'البريدُ غيرُ مسجَّل', INVALID_PASSWORD: 'كلمةُ المرورِ غيرُ صحيحة', INVALID_LOGIN_CREDENTIALS: 'البريدُ أو كلمةُ المرورِ غيرُ صحيحة',
    EMAIL_EXISTS: 'هذا البريدُ مسجَّلٌ من قبل — ادخلْ به', WEAK_PASSWORD: 'كلمةُ المرورِ ضعيفة — ٦ أحرفٍ على الأقلّ', INVALID_EMAIL: 'صيغةُ البريدِ غيرُ صحيحة',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'محاولاتٌ كثيرة — انتظرْ قليلاً', USER_DISABLED: 'الحسابُ موقوف'
  };
  function authReq(endpoint, body) {
    return fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + endpoint + '?key=' + CFG.API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (x) {
      if (!x.ok) { var code = (x.d.error && x.d.error.message || '').split(' ')[0]; var e = new Error(AUTH_ERRS[code] || ('خطأٌ في الدخول: ' + code)); e.code = code; throw e; }
      return x.d;
    });
  }
  function setSession(d) {
    session = { uid: d.localId || d.user_id, email: d.email || (session && session.email) || '', idToken: d.idToken || d.id_token, rt: d.refreshToken || d.refresh_token, exp: Date.now() + (+(d.expiresIn || d.expires_in || 3600) - 120) * 1000 };
    try { localStorage.setItem(SKEY, JSON.stringify({ rt: session.rt, uid: session.uid, email: session.email })); } catch (e) { }
    return session;
  }
  function refresh() {
    var saved = null; try { saved = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { }
    var rt = (session && session.rt) || (saved && saved.rt);
    if (!rt) return Promise.reject(new Error('NO_SESSION'));
    return fetch('https://securetoken.googleapis.com/v1/token?key=' + CFG.API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt)
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error('REFRESH_FAILED'); return d; }); })
      .then(function (d) { if (saved && !d.email) d.email = saved.email; return setSession(d); });
  }
  function token() {
    if (DEMO) return Promise.resolve('');
    if (session && session.idToken && Date.now() < session.exp) return Promise.resolve(session.idToken);
    return refresh().then(function (s) { return s.idToken; });
  }
  var Auth = {
    demo: DEMO,
    cfg: CFG,
    signIn: function (email, pw) { return authReq('signInWithPassword', { email: email, password: pw, returnSecureToken: true }).then(setSession); },
    signUp: function (email, pw) { return authReq('signUp', { email: email, password: pw, returnSecureToken: true }).then(setSession); },
    resetPassword: function (email) { return authReq('sendOobCode', { requestType: 'PASSWORD_RESET', email: email }); },
    restore: function () {
      if (DEMO) { session = { uid: 'demo', email: 'تجربة', idToken: '', rt: '', exp: Infinity }; return Promise.resolve(session); }
      return refresh().catch(function () { return null; });
    },
    signOut: function () { session = null; try { localStorage.removeItem(SKEY); } catch (e) { } },
    user: function () { return session; }
  };

  /* ---------- Firestore REST ---------- */
  function fsReq(method, path, body, qs) {
    return token().then(function (t) {
      return fetch(BASE + path + (qs || ''), {
        method: method, headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}),
        body: body ? JSON.stringify(body) : undefined
      });
    }).then(function (r) {
      if (r.status === 404 && method === 'GET') return null;
      return r.text().then(function (txt) {
        var d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) { d = { raw: txt }; }
        if (!r.ok) {
          var msg = (d && d.error && d.error.message) || ('HTTP ' + r.status);
          if (r.status === 401) { session = null; msg = 'انتهت الجلسة — أعدِ الدخول'; }
          if (r.status === 403) msg = 'لا صلاحية — تأكّدْ من نشرِ قواعدِ فايرستور ومن بريدِ الدخول';
          if (r.status === 429) msg = 'نفدت حصّةُ القراءةِ اليوميّة — تُصفَّرُ نحوَ العاشرةِ صباحاً';
          var e = new Error(msg); e.status = r.status; e.data = d; throw e;
        }
        return d;
      });
    });
  }
  var Live = {
    get: function (col, id) { return fsReq('GET', '/' + col + '/' + encodeURIComponent(id)).then(function (d) { return d ? docToObj(d) : null; }); },
    set: function (col, id, data) { /* استبدالٌ كامل */
      return fsReq('PATCH', '/' + col + '/' + encodeURIComponent(id), { fields: enc(data).mapValue.fields }).then(docToObj);
    },
    patch: function (col, id, data) { /* تعديلُ حقولٍ محدَّدة */
      var qs = '?' + Object.keys(data).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
      return fsReq('PATCH', '/' + col + '/' + encodeURIComponent(id), { fields: enc(data).mapValue.fields }, qs).then(docToObj);
    },
    del: function (col, id) { return fsReq('DELETE', '/' + col + '/' + encodeURIComponent(id)); },
    list: function (col) {
      var out = [];
      function page(tok) {
        return fsReq('GET', '/' + col, null, '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : '')).then(function (d) {
          (d && d.documents || []).forEach(function (x) { out.push(docToObj(x)); });
          return d && d.nextPageToken ? page(d.nextPageToken) : out;
        });
      }
      return page();
    },
    /* where: [[field, op, value], ...] — EQUAL أو ARRAY_CONTAINS (بلا فهارسَ مركّبة) */
    query: function (col, where) {
      var filters = (where || []).map(function (w) { return { fieldFilter: { field: { fieldPath: w[0] }, op: w[1] || 'EQUAL', value: enc(w[2]) } }; });
      var sq = { from: [{ collectionId: col }], limit: 2000 };
      if (filters.length === 1) sq.where = filters[0]; else if (filters.length > 1) sq.where = { compositeFilter: { op: 'AND', filters: filters } };
      return fsReq('POST', ':runQuery', { structuredQuery: sq }).then(function (rows) {
        return (rows || []).filter(function (r) { return r.document; }).map(function (r) { return docToObj(r.document); });
      });
    }
  };

  /* ---------- الوضعُ التجريبي: localStorage بواجهةٍ مطابقة ---------- */
  var DK = 'es_demo_db_v1';
  function dbLoad() { try { return JSON.parse(localStorage.getItem(DK) || '{}'); } catch (e) { return {}; } }
  function dbSave(db) { localStorage.setItem(DK, JSON.stringify(db)); }
  function later(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 40); }); }
  var Demo = {
    get: function (col, id) { var db = dbLoad(); var d = db[col] && db[col][id]; return later(d ? Object.assign({ _id: id }, JSON.parse(JSON.stringify(d))) : null); },
    set: function (col, id, data) { var db = dbLoad(); db[col] = db[col] || {}; db[col][id] = JSON.parse(JSON.stringify(data)); dbSave(db); return later(Object.assign({ _id: id }, data)); },
    patch: function (col, id, data) { var db = dbLoad(); db[col] = db[col] || {}; db[col][id] = Object.assign(db[col][id] || {}, JSON.parse(JSON.stringify(data))); dbSave(db); return later(Object.assign({ _id: id }, db[col][id])); },
    del: function (col, id) { var db = dbLoad(); if (db[col]) delete db[col][id]; dbSave(db); return later(null); },
    list: function (col) { var db = dbLoad(); var c = db[col] || {}; return later(Object.keys(c).map(function (k) { return Object.assign({ _id: k }, JSON.parse(JSON.stringify(c[k]))); })); },
    query: function (col, where) {
      return Demo.list(col).then(function (rows) {
        return rows.filter(function (r) { return (where || []).every(function (w) { return w[1] === 'ARRAY_CONTAINS' ? (r[w[0]] || []).indexOf(w[2]) >= 0 : r[w[0]] === w[2]; }); });
      });
    },
    reset: function () { localStorage.removeItem(DK); }
  };

  function isNetErr(e) { return !navigator.onLine || (e && (e.name === 'TypeError' || /fetch|network|Failed to fetch|Load failed/i.test(e.message || ''))) && !(e && e.status); }
  function isAdmin(email) { return ADMINS.indexOf(String(email || '').trim().toLowerCase()) >= 0; }
  root.FB = {
    Auth: Auth, DB: DEMO ? Demo : Live, demo: DEMO, enc: enc, dec: dec, isNetErr: isNetErr,
    admins: ADMINS, isAdmin: isAdmin, cfg: CFG,
    col: function (n) { return (CFG.PREFIX || 'es_') + n; }
  };
})(window);
