/* ===== رسومٌ SVG خفيفة: أعمدةٌ مكدَّسةٌ أسبوعية + تقويمٌ ===== */
(function (root) {
  'use strict';
  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* أعمدةٌ مكدَّسة: buckets=[{label, sub, vals:{type:n}}], series=[{key,label,color}] */
  function stackedBars(host, buckets, series, opts) {
    opts = opts || {};
    var W = 720, H = opts.height || 230, padL = 30, padR = 10, padT = 14, padB = 40;
    var n = buckets.length; if (!n) { host.innerHTML = '<div class="empty" style="padding:24px">لا بياناتَ في هذه المدّة</div>'; return; }
    var totals = buckets.map(function (b) { return series.reduce(function (s, k) { return s + (b.vals[k.key] || 0); }, 0); });
    var max = Math.max(1, Math.max.apply(null, totals));
    var step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10; max = Math.ceil(max / step) * step;
    var iw = W - padL - padR, ih = H - padT - padB;
    var gap = 2, bw = Math.min(46, Math.max(8, iw / n * 0.62)), slot = iw / n;
    var y = function (v) { return padT + ih - (v / max) * ih; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || 'رسمٌ بياني') + '">';
    s += '<g class="grid">';
    for (var g = 0; g <= max; g += step) { s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text x="' + (padL - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + ar(g) + '</text>'; }
    s += '</g><g class="axis"><line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></g>';
    /* الاتجاهُ: الأقدمُ يميناً (RTL) */
    buckets.forEach(function (b, i) {
      var x = padL + iw - (i + 1) * slot + (slot - bw) / 2;
      var acc = 0;
      series.forEach(function (k, si) {
        var v = b.vals[k.key] || 0; if (!v) return;
        var y0 = y(acc + v), y1 = y(acc);
        var h = Math.max(0, y1 - y0 - (acc ? gap : 0));
        var top = acc + v === totals[i];
        var r = top ? 4 : 0;
        var yy = y0 + (acc ? gap : 0);
        if (h <= 0) { acc += v; return; }
        s += '<path class="bar" fill="' + k.color + '" d="M' + x + ' ' + (yy + h) + 'V' + (yy + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'h' + (bw - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (yy + h) + 'z"/>';
        acc += v;
      });
      if (totals[i]) s += '<text x="' + (x + bw / 2) + '" y="' + (y(totals[i]) - 6) + '" text-anchor="middle" style="fill:var(--ink);font-weight:700">' + ar(totals[i]) + '</text>';
      var showLbl = n <= 10 || i % Math.ceil(n / 10) === 0;
      if (showLbl) {
        s += '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + esc(b.label) + '</text>';
        if (b.sub) s += '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 30) + '" text-anchor="middle" style="font-size:10px;opacity:.7">' + esc(b.sub) + '</text>';
      }
    });
    s += '<g class="hover">';
    buckets.forEach(function (b, i) { var x = padL + iw - (i + 1) * slot; s += '<rect data-i="' + i + '" x="' + x + '" y="' + padT + '" width="' + slot + '" height="' + (ih) + '"/>'; });
    s += '</g></svg><div class="tip"></div>';
    host.innerHTML = s;
    var tip = host.querySelector('.tip'), svg = host.querySelector('svg');
    host.querySelectorAll('.hover rect').forEach(function (r) {
      r.addEventListener('mouseenter', function () {
        var i = +r.dataset.i, b = buckets[i];
        var lines = series.filter(function (k) { return b.vals[k.key]; }).map(function (k) { return '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + k.color + ';margin-inline-end:5px"></span>' + esc(k.label) + ': ' + ar(b.vals[k.key]); });
        tip.innerHTML = '<b>' + esc(b.label) + (b.sub ? ' — ' + esc(b.sub) : '') + '</b><br>' + (lines.join('<br>') || 'لا شيء');
        var bb = svg.getBoundingClientRect(), rb = r.getBoundingClientRect();
        tip.style.left = (rb.left - bb.left + rb.width / 2) + 'px'; tip.style.top = (y(totals[i]) / H * bb.height - 6) + 'px';
        tip.classList.add('on');
        host.querySelectorAll('.bar').forEach(function (p) { p.style.opacity = '.45'; });
      });
      r.addEventListener('mouseleave', function () { tip.classList.remove('on'); host.querySelectorAll('.bar').forEach(function (p) { p.style.opacity = ''; }); });
    });
  }

  /* تقويمٌ شهري: dayMap[YYYY-MM-DD] = {types:{absent:n,...}} ، schoolDays: Set */
  var DOW = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function calendar(host, from, to, dayMap, colors, schoolDays) {
    var a = new Date(from + 'T00:00:00'), b = new Date(to + 'T00:00:00'), today = iso(new Date());
    var cur = new Date(a.getFullYear(), a.getMonth(), 1), s = '';
    while (cur <= b) {
      var y = cur.getFullYear(), m = cur.getMonth();
      s += '<div class="month"><h4>' + MONTHS[m] + ' ' + ar(y) + '</h4><div class="days">';
      DOW.forEach(function (d) { s += '<div class="dow">' + d + '</div>'; });
      var first = new Date(y, m, 1).getDay();
      for (var i = 0; i < first; i++) s += '<div class="day off"></div>';
      var dim = new Date(y, m + 1, 0).getDate();
      for (var d = 1; d <= dim; d++) {
        var dt = new Date(y, m, d), k = iso(dt);
        var inRange = dt >= a && dt <= b, wknd = dt.getDay() === 5 || dt.getDay() === 6;
        var info = dayMap[k], cls = 'day';
        if (!inRange || wknd) cls += ' off';
        else if (schoolDays && schoolDays.has(k)) cls += ' school';
        if (info && info.absent) cls += ' absent';
        if (k === today) cls += ' today';
        var dots = '';
        if (info && !info.absent) { Object.keys(info).forEach(function (t) { if (info[t] && colors[t]) dots += '<i style="background:' + colors[t] + '"></i>'; }); }
        var title = info ? Object.keys(info).map(function (t) { return t + ':' + info[t]; }).join(' ') : '';
        s += '<div class="' + cls + '" title="' + esc(k + ' ' + title) + '">' + ar(d) + (dots ? '<span class="dots">' + dots + '</span>' : '') + '</div>';
      }
      s += '</div></div>';
      cur = new Date(y, m + 1, 1);
    }
    host.innerHTML = s || '<div class="empty">—</div>';
  }

  root.Charts = { stackedBars: stackedBars, calendar: calendar, ar: ar };
})(window);
