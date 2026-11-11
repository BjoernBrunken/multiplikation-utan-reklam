/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* ============================================================
   Tabellträning – kärna: lagring, hjälpfunktioner, router,
   knappsats, frågesport, prickbilder, medaljer, diplom.
   Vanliga skript (inga moduler) så att allt fungerar via file://.
   ============================================================ */
(function () {
  'use strict';
  var MT = window.MT = {};

  /* ---------- lagring (bara lokalt i webbläsaren) ----------
     En enhet kan delas av flera elever. Varje elev har en profil med egna data.
     root = { v, profiles:[{id,name,avatar}], current, data:{id: elevdata}, classRec:{} } */
  var KEY = 'tabelltraning-v2', OLD_KEY = 'tabelltraning-v1';
  MT.blankData = function (name) {
    return {
      medals: {}, diplomas: {}, hundred: { runs: [] }, speed: [], games: {}, name: name || '', op: 'mul',
      facts: {}, review: {}, daily: { last: null, streak: 0, best: 0, count: 0 }, cards: [], pts: 0, lastSeen: null
    };
  };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  var root = load(KEY);
  if (!root || !Array.isArray(root.profiles)) {
    root = { v: 2, profiles: [], current: null, data: {}, classRec: {} };
    var old = load(OLD_KEY);
    if (old && typeof old === 'object') {           // flytta över data från första versionen
      var id = 'p' + Date.now().toString(36);
      root.profiles.push({ id: id, name: old.name || 'Elev 1', avatar: '🦊' });
      root.data[id] = Object.assign(MT.blankData(old.name || 'Elev 1'), old);
      root.current = id;
    }
  }
  root.classRec = root.classRec || {};
  MT.root = root;
  MT.save = function () { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch (e) { /* privat läge e.d. */ } };
  MT.profile = function () {
    return root.profiles.filter(function (p) { return p.id === root.current; })[0] || null;
  };
  MT.useProfile = function (id) {
    var p = root.profiles.filter(function (x) { return x.id === id; })[0];
    root.current = p ? id : null;
    MT.db = p ? (root.data[id] = Object.assign(MT.blankData(p.name), root.data[id] || {})) : MT.blankData('');
    if (p) MT.db.lastSeen = new Date().toISOString().slice(0, 10);
    MT.save();
  };
  MT.addProfile = function (name, avatar) {
    var id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    root.profiles.push({ id: id, name: name, avatar: avatar });
    root.data[id] = MT.blankData(name);
    MT.useProfile(id);
    return id;
  };
  MT.removeProfile = function (id) {
    root.profiles = root.profiles.filter(function (p) { return p.id !== id; });
    delete root.data[id];
    if (root.current === id) MT.useProfile(null); else MT.save();
  };
  MT.useProfile(root.current);
  MT.resetAll = function () {
    var p = MT.profile(); if (!p) return;
    root.data[p.id] = MT.blankData(p.name); MT.useProfile(p.id);
  };

  MT.medals = function (op, t) { return MT.db.medals[op + t] || [false, false, false, false, false]; };
  MT.giveMedal = function (op, t, step) {
    var m = MT.medals(op, t).slice(), isNew = !m[step];
    m[step] = true; MT.db.medals[op + t] = m; MT.save();
    if (isNew && MT.reward) MT.reward(1);
    return isNew;
  };

  /* ---------- hjälpfunktioner ---------- */
  MT.$ = function (s, r) { return (r || document).querySelector(s); };
  MT.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  MT.range = function (a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; };
  MT.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  MT.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  MT.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  MT.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  MT.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  MT.dateLong = function (iso) {
    var d = iso ? new Date(iso + 'T12:00:00') : new Date();
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  MT.fmtTime = function (s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  MT.tableName = function (op, t) { return op === 'div' ? 'Dela med ' + t : t + ':ans tabell'; };
  MT.PRAISE = ['Rätt!', 'Bra!', 'Snyggt!', 'Toppen!', 'Ja!', 'Klockrent!', 'Perfekt!'];

  /* tabellfärger 1–12 och textfärg som syns på dem */
  MT.COLORS = [null, '#E0503D', '#EE8B22', '#E8B313', '#93C030', '#2B9A55', '#0E8F89', '#1E86CB', '#3D5FD0', '#7A4FCD', '#B9479F', '#D9487D', '#86664A'];
  MT.ON = [null, '#fff', '#1D2B5C', '#1D2B5C', '#1D2B5C', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff'];
  MT.style = function (t) { return '--c:' + MT.COLORS[t] + ';--on:' + MT.ON[t]; };

  /* ---------- frågor ---------- */
  // mul:  f · t = f*t      div:  (f*t) / t = f
  MT.makeQ = function (op, t, f) {
    if (op === 'div') return { op: op, t: t, f: f, text: (f * t) + ' / ' + t, ans: f, key: 'd' + t + '-' + f };
    return { op: 'mul', t: t, f: f, text: f + ' · ' + t, ans: f * t, key: 'm' + t + '-' + f };
  };
  MT.pool = function (op, tables, fmin, fmax) {
    fmin = fmin == null ? 1 : fmin; fmax = fmax == null ? 10 : fmax;
    var out = [];
    tables.forEach(function (t) {
      MT.range(fmin, fmax).forEach(function (f) {
        var o = op === 'mix' ? MT.pick(['mul', 'div']) : op;
        if (o === 'div' && t === 0) o = 'mul';
        out.push(MT.makeQ(o, t, f));
      });
    });
    return out;
  };
  // drar n frågor; blandar om poolen när den tar slut, undviker samma fråga två gånger i rad
  MT.drawQs = function (op, tables, n, fmin, fmax) {
    var out = [], pool = [];
    var guard = 0;
    while (out.length < n && guard++ < n * 20) {
      if (!pool.length) pool = MT.shuffle(MT.pool(op, tables, fmin, fmax));
      var q = pool.pop();
      var prev = out[out.length - 1];
      if (prev && prev.key === q.key && pool.length) { pool.unshift(q); continue; }
      out.push(q);
    }
    return out;
  };
  MT.options = function (q, n) {
    n = n || 4;
    var set = [q.ans];
    var cand = q.op === 'mul'
      ? [q.ans + q.t, q.ans - q.t, q.ans + 1, q.ans - 1, (q.f + 1) * (q.t + 1), q.ans + 10, q.ans - 10, q.f * (q.t - 1), q.ans + 2]
      : [q.ans + 1, q.ans - 1, q.ans + 2, q.ans - 2, q.t, q.ans * 2, q.ans + 3];
    MT.shuffle(cand).forEach(function (x) { if (set.length < n && x >= 0 && set.indexOf(x) < 0) set.push(x); });
    var g = 0;
    while (set.length < n && g++ < 100) { var r = MT.rand(0, Math.max(12, q.ans * 2)); if (set.indexOf(r) < 0) set.push(r); }
    return MT.shuffle(set);
  };

  /* ---------- prickbild: f rader med t prickar ---------- */
  MT.dots = function (rows, cols, color, size, gap) {
    size = size || 14; gap = gap == null ? Math.round(size * 0.3) : gap;
    if (rows < 1 || cols < 1) return '';
    var w = cols * (size + gap) - gap, h = rows * (size + gap) - gap, c = '';
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
      c += '<circle cx="' + (k * (size + gap) + size / 2) + '" cy="' + (r * (size + gap) + size / 2) + '" r="' + (size / 2) + '"/>';
    }
    return '<svg class="dots" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" fill="' + color + '" role="img" aria-label="' + rows + ' rader med ' + cols + ' prickar">' + c + '</svg>';
  };
  MT.qDots = function (q, size) { return MT.dots(q.f, q.t, MT.COLORS[q.t] || '#1D2B5C', size || 10); };

  /* ---------- ikoner ---------- */
  MT.medalIcon = function (on, label) {
    var fill = on ? '#FFD23F' : '#fff', stroke = on ? '#1D2B5C' : '#B9C3D9';
    return '<svg class="medal" viewBox="0 0 40 40" aria-hidden="true">' +
      '<path d="M12 1h7l-2 13h-6zM21 1h7l-1 13h-6z" fill="' + (on ? '#E0503D' : '#E3E8F2') + '"/>' +
      '<circle cx="20" cy="25" r="12.5" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5"' + (on ? '' : ' stroke-dasharray="4 3"') + '/>' +
      '<text x="20" y="30" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="' + stroke + '">' + label + '</text></svg>';
  };
  MT.starIcon = function (on) {
    return '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="' +
      (on ? '#FFD23F' : '#fff') + '" stroke="' + (on ? '#1D2B5C' : '#B9C3D9') + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  };
  MT.sealIcon = function () {
    return '<svg class="cert-seal" viewBox="0 0 100 100" aria-hidden="true"><g fill="#FFD23F" stroke="#1D2B5C" stroke-width="3">' +
      '<path d="M50 4l9 10 13-4 3 13 13 4-4 13 10 9-10 9 4 13-13 4-3 13-13-4-9 10-9-10-13 4-3-13-13-4 4-13-10-9 10-9-4-13 13-4 3-13 13 4z"/></g>' +
      '<text x="50" y="58" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="24" fill="#1D2B5C">7·8</text></svg>';
  };

  /* ---------- städning när man byter sida ---------- */
  var cleanups = [];
  MT.onLeave = function (fn) { cleanups.push(fn); };
  MT.after = function (fn, ms) { var id = setTimeout(fn, ms); MT.onLeave(function () { clearTimeout(id); }); return id; };
  MT.listen = function (target, ev, fn, opt) {
    target.addEventListener(ev, fn, opt);
    MT.onLeave(function () { target.removeEventListener(ev, fn, opt); });
  };

  /* ---------- knappsats (en aktiv åt gången, även fysiskt tangentbord) ---------- */
  var activeKp = null;
  document.addEventListener('keydown', function (e) {
    if (!activeKp || !document.body.contains(activeKp.host)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('input, select, textarea')) return;
    if (/^[0-9]$/.test(e.key)) { activeKp.press(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { activeKp.press('del'); e.preventDefault(); }
    else if (e.key === 'Enter') { activeKp.press('ok'); e.preventDefault(); }
  });
  MT.keypad = function (host, opt) {
    var max = opt.max || 3, v = '', off = false, out = opt.display;
    host.innerHTML = '<div class="keys">' +
      MT.range(1, 9).map(function (n) { return '<button type="button" class="key" data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button type="button" class="key key-del" data-k="del" aria-label="Sudda">⌫</button>' +
      '<button type="button" class="key" data-k="0">0</button>' +
      '<button type="button" class="key key-ok" data-k="ok">' + (opt.label || 'Svara') + '</button></div>';
    function set(x) { v = x; if (out) out.textContent = v; if (opt.onInput) opt.onInput(v); }
    var api = {
      host: host,
      press: function (k) {
        if (off) return;
        if (k === 'del') set(v.slice(0, -1));
        else if (k === 'ok') { if (v !== '') opt.onSubmit(parseInt(v, 10)); }
        else if (v.length < max) set(v === '0' ? k : v + k);
      },
      clear: function () { set(''); },
      disable: function (d) { off = d; host.classList.toggle('is-off', d); },
      get value() { return v; }
    };
    host.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) api.press(b.dataset.k); });
    activeKp = api;
    return api;
  };

  /* ---------- frågesport med knappsats och tid ----------
     o.questions, o.perQ (sek/fråga), o.total (sek totalt), o.score(r) -> poäng,
     o.revealWrong (visa rätt svar direkt), o.onAnswer(r, i), o.onDone(results, info) */
  MT.quiz = function (host, o) {
    var qs = o.questions, i = 0, res = [], points = 0, busy = false, stopped = false;
    var tStart = performance.now(), qStart = tStart, timers = [];
    var timed = !!(o.perQ || o.total);
    host.innerHTML =
      '<div class="quiz">' +
      '<div class="quiz-top"><span class="pill">Fråga <b class="qi">1</b> / ' + qs.length + '</span>' +
      (o.score ? '<span class="pill">Poäng <b class="qp">0</b></span>' : '') +
      (o.total ? '<span class="pill">Tid kvar <b class="qt">' + MT.fmtTime(o.total) + '</b></span>' : '') +
      (o.perQ ? '<span class="pill"><b class="qs">' + o.perQ + '</b> sek</span>' : '') + '</div>' +
      (timed ? '<div class="timebar" aria-hidden="true"><i></i></div>' : '') +
      '<div class="qline" aria-live="polite"><span class="qtext"></span><span>=</span><span class="answer"></span></div>' +
      '<div class="flash" aria-live="assertive"></div>' +
      '<div class="kp"></div>' +
      '<p class="kbd-hint">Du kan också skriva med tangentbordet och trycka Enter.</p></div>';
    var $ = function (s) { return host.querySelector(s); };
    var line = $('.qline'), qtext = $('.qtext'), ans = $('.answer'), flash = $('.flash'), bar = $('.timebar i'), barBox = $('.timebar');
    var kp = MT.keypad($('.kp'), { display: ans, onSubmit: function (v) { answer(v); } });

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function stop() { stopped = true; clearInterval(iv); timers.forEach(clearTimeout); }
    MT.onLeave(stop);

    function show() {
      var q = qs[i];
      qtext.textContent = q.text;
      $('.qi').textContent = i + 1;
      line.className = 'qline'; flash.className = 'flash'; flash.textContent = '';
      kp.clear(); kp.disable(false);
      qStart = performance.now(); busy = false;
    }
    function answer(val) {
      if (busy || stopped) return;
      busy = true; kp.disable(true);
      var q = qs[i];
      var left = o.perQ ? Math.max(0, o.perQ - (performance.now() - qStart) / 1000) : 0;
      var r = { q: q, given: val, ok: val === q.ans, left: left, late: val === null };
      res.push(r);
      if (!o.noTrack && MT.track) MT.track(q, r.ok, (performance.now() - qStart) / 1000);
      if (o.score) { points += o.score(r); $('.qp').textContent = points; }
      line.classList.add(r.ok ? 'ok' : 'bad');
      if (val === null) ans.textContent = '–';
      flash.className = 'flash ' + (r.ok ? 'ok' : 'bad');
      flash.textContent = r.ok ? MT.pick(MT.PRAISE) : (val === null ? 'För sent!' : 'Inte rätt');
      if (!r.ok && o.revealWrong) flash.textContent += ' – ' + q.text + ' = ' + q.ans;
      if (o.onAnswer) o.onAnswer(r, i);
      later(next, r.ok ? 450 : (o.revealWrong ? 1700 : 800));
    }
    function next() {
      if (stopped) return;
      i++;
      if (i >= qs.length) finish(false); else show();
    }
    function finish(timeUp) {
      if (stopped) return;
      stop();
      for (var k = res.length; k < qs.length; k++) res.push({ q: qs[k], given: null, ok: false, missed: true });
      o.onDone(res, { timeUp: timeUp, points: points, seconds: (performance.now() - tStart) / 1000 });
    }
    var iv = setInterval(function () {
      if (stopped) return;
      var now = performance.now();
      if (o.total) {
        var leftT = o.total - (now - tStart) / 1000;
        $('.qt').textContent = MT.fmtTime(leftT);
        if (!o.perQ) { bar.style.transform = 'scaleX(' + Math.max(0, leftT / o.total) + ')'; barBox.classList.toggle('low', leftT < 30); }
        if (leftT <= 0) { finish(true); return; }
      }
      if (o.perQ && !busy) {
        var leftQ = o.perQ - (now - qStart) / 1000;
        bar.style.transform = 'scaleX(' + Math.max(0, leftQ / o.perQ) + ')';
        barBox.classList.toggle('low', leftQ < 3);
        $('.qs').textContent = Math.max(0, Math.ceil(leftQ));
        if (leftQ <= 0) answer(null);
      }
    }, 100);
    show();
    return { stop: stop };
  };

  /* ---------- resultatdelar ---------- */
  MT.mistakesHTML = function (res) {
    var bad = res.filter(function (r) { return !r.ok; });
    if (!bad.length) return '<p class="msg msg-ok">Inga fel – alla svar var rätt!</p>';
    return '<h3>Det här ska du öva mer på</h3><div class="mistakes">' + bad.map(function (r) {
      var why = r.given == null
        ? '<span class="muted">' + (r.missed ? 'hann inte' : 'för sent') + '</span>'
        : '<span>du svarade <span class="was">' + r.given + '</span></span>';
      return '<div class="mistake"><span class="eq">' + r.q.text + ' = ' + r.q.ans + '</span>' + why + MT.qDots(r.q, 8) + '</div>';
    }).join('') + '</div>';
  };

  MT.certificate = function (c) {
    return '<div class="cert" style="' + (c.style || '') + '">' + MT.sealIcon() +
      '<div class="cert-kicker">Tabellträning</div>' +
      '<h2>' + MT.esc(c.title) + '</h2>' +
      '<div>Det här diplomet går till</div>' +
      '<div class="cert-name mark">' + MT.esc(c.name || '…') + '</div>' +
      '<p class="cert-text">' + c.text + '</p>' +
      '<div class="cert-foot"><div>' + MT.dateLong(c.date) + '</div><div>Underskrift</div></div></div>';
  };

  /* skriv ut bara en bit HTML (diplom, resultat) */
  MT.printHTML = function (html) {
    var box = MT.$('#print-area');
    if (!box) { box = document.createElement('div'); box.id = 'print-area'; document.body.appendChild(box); }
    box.innerHTML = html;
    document.body.classList.add('print-area-on');
    var done = function () { document.body.classList.remove('print-area-on'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 50);
  };

  /* ---------- val av tabeller och växlar ---------- */
  MT.tableChips = function (host, selected, onChange, opts) {
    opts = opts || {};
    var list = opts.tables || MT.range(1, 12);
    function draw() {
      var all = list.every(function (t) { return selected.has(t); });
      host.innerHTML = '<div class="chips" role="group" aria-label="Välj tabeller">' + list.map(function (t) {
        return '<button type="button" class="chip" data-t="' + t + '" aria-pressed="' + selected.has(t) + '" style="--cc:' + MT.COLORS[t] + ';--con:' + MT.ON[t] + '">' + t + '</button>';
      }).join('') + '<button type="button" class="chip chip-all" data-all="1" aria-pressed="' + all + '">Alla</button></div>';
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.all) {
        var all = list.every(function (t) { return selected.has(t); });
        list.forEach(function (t) { if (all) selected.delete(t); else selected.add(t); });
      } else {
        var t = +b.dataset.t;
        if (selected.has(t)) selected.delete(t); else selected.add(t);
      }
      draw(); if (onChange) onChange(selected);
    });
    draw();
  };
  MT.seg = function (host, options, value, onChange) {
    function draw() {
      host.innerHTML = '<div class="seg" role="group">' + options.map(function (o) {
        return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (String(o[0]) === String(value)) + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.dataset.v; var num = options.some(function (o) { return typeof o[0] === 'number'; });
      value = num ? +v : v; draw(); onChange(value);
    });
    draw();
  };
  MT.OPS = [['mul', 'Gånger ·'], ['div', 'Delat /']];

  /* ---------- router ---------- */
  var routes = [];
  MT.route = function (re, fn) { routes.push([re, fn]); };
  MT.go = function (path) { if (location.hash === '#' + path) render(); else location.hash = '#' + path; };

  // sidor som fungerar utan vald elev (vuxensidor och val av elev)
  var NO_PROFILE = /^\/(vem|vem\/ny|vuxen|klassen|kalkylblad|om)$/;
  // vilken menyknapp som ska lysa för olika sidor
  var SECTION = { '/ova': '/', '/knepiga': '/', '/dagens': '/', '/repetera': '/', '/snabbtest': '/testa', '/100': '/testa', '/diplom': '/testa', '/djurkort': '/pokaler' };

  function drawWho() {
    var w = MT.$('#who'); if (!w) return;
    var p = MT.profile();
    w.innerHTML = p
      ? '<span class="who-av" aria-hidden="true">' + p.avatar + '</span><span class="who-name">' + MT.esc(p.name) + '</span><span class="who-swap">Byt</span>'
      : '<span class="who-av" aria-hidden="true">👋</span><span class="who-name">Vem är du?</span>';
    w.setAttribute('aria-label', p ? 'Du är ' + p.name + '. Byt elev' : 'Välj vem du är');
  }
  MT.drawWho = drawWho;

  function render() {
    cleanups.forEach(function (f) { try { f(); } catch (e) { } });
    cleanups = []; activeKp = null;
    MT.closeModal && MT.closeModal();
    var path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    if (!MT.profile() && !NO_PROFILE.test(path)) { MT.afterPick = path; location.replace('#/vem'); return; }
    drawWho();
    var main = MT.$('#main');
    main.innerHTML = '';
    var hit = false;
    for (var k = 0; k < routes.length; k++) {
      var m = path.match(routes[k][0]);
      if (m) { routes[k][1].apply(null, [main].concat(m.slice(1))); hit = true; break; }
    }
    if (!hit) { location.replace('#/'); return; }
    var section = '/' + (path.split('/')[1] || '');
    if (SECTION[section]) section = SECTION[section];
    MT.$$('.nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === section); a.toggleAttribute('aria-current', a.dataset.nav === section); });
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  MT.start = function () {
    window.addEventListener('hashchange', render);
    // Delad enhet: finns flera elever frågar vi vem som ska öva när sidan öppnas.
    var path = location.hash.replace(/^#/, '') || '/';
    if (root.profiles.length > 1 && !NO_PROFILE.test(path)) { MT.afterPick = path; location.replace('#/vem'); }
    render();
    // Installerbar app när sidan körs via webbserver. Via file:// behövs ingen service worker.
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  };
})();
