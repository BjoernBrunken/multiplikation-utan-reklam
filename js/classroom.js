/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Hela klassen: tävla mot klassrekordet eller visa ett bildspel på tavlan. Kräver ingen elevprofil. */
(function () {
  'use strict';
  var sel = new Set([2, 3, 4, 5, 10]);

  MT.route(/^\/klassen$/, function (el) {
    var mode = 'race', secs = 100, think = 5, op = 'mul';
    var stops = [];                                   // stoppar timers när man avslutar
    function stopAll() { stops.forEach(function (f) { f(); }); stops = []; }
    MT.onLeave(stopAll);

    function setup() {
      el.innerHTML = '<a class="back" href="#/vuxen">← För vuxna</a><h1>Hela <span class="mark">klassen</span></h1>' +
        '<p class="muted">Visa på tavlan eller projektorn. Klassen svarar tillsammans.</p>' +
        '<div class="card setup">' +
        '<div><h3>Vad vill ni göra?</h3><div id="mode"></div><p class="small muted" id="mhelp"></p></div>' +
        '<div><h3>Gånger eller delat?</h3><div id="op"></div></div>' +
        '<div><h3>Vilka tabeller?</h3><div id="tb"></div></div>' +
        '<div id="opt"></div>' +
        '<div><button type="button" class="btn btn-main" id="start">Starta</button> <span class="muted small" id="warn"></span></div></div>' +
        '<div id="recs"></div>';
      MT.seg(MT.$('#mode', el), [['race', 'Slå klassrekordet'], ['show', 'Bildspel']], mode, function (v) { mode = v; opts(); });
      MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; recs(); });
      MT.tableChips(MT.$('#tb', el), sel, function () { check(); recs(); });
      MT.$('#start', el).onclick = function () { if (mode === 'race') race(); else show(); };
      opts(); check(); recs();
    }
    function opts() {
      MT.$('#mhelp', el).textContent = mode === 'race'
        ? 'Klassen ropar svaret, en elev eller läraren skriver in det. Hur många rätt hinner ni?'
        : 'Frågan visas, alla tänker (eller skriver på en lapp), sedan visas svaret. Ingen behöver skriva in något.';
      var box = MT.$('#opt', el);
      box.innerHTML = '<h3>' + (mode === 'race' ? 'Tid' : 'Betänketid per fråga') + '</h3><div id="o2"></div>';
      if (mode === 'race') MT.seg(MT.$('#o2', el), [[60, '1 minut'], [100, '100 sekunder'], [180, '3 minuter']], secs, function (v) { secs = v; recs(); });
      else MT.seg(MT.$('#o2', el), [[3, '3 sek'], [5, '5 sek'], [8, '8 sek']], think, function (v) { think = v; });
      recs();
    }
    function check() {
      MT.$('#start', el).disabled = !sel.size;
      MT.$('#warn', el).textContent = sel.size ? '' : 'Välj minst en tabell.';
    }
    function recKey() { return op + ':' + Array.from(sel).sort(function (a, b) { return a - b; }).join(',') + ':' + secs; }
    function recs() {
      var box = MT.$('#recs', el); if (!box) return;
      var r = MT.root.classRec[recKey()];
      box.innerHTML = mode === 'race' && sel.size
        ? '<p class="muted" style="margin-top:14px">Klassrekord med de här valen: <b>' + (r ? r.score + ' rätt (' + MT.esc(r.date) + ')' : 'inget än') + '</b></p>' : '';
    }
    function stage(inner) {
      el.innerHTML = '<div class="stage" id="stage">' + inner + '</div>' +
        '<div class="actions" style="justify-content:center"><button type="button" class="btn" id="fs">Helskärm</button><button type="button" class="btn" id="stop">Avsluta</button></div>';
      MT.$('#fs', el).onclick = function () { var s = MT.$('#stage', el); if (s.requestFullscreen) s.requestFullscreen().catch(function () { }); };
      MT.$('#stop', el).onclick = function () { stopAll(); if (document.fullscreenElement) document.exitFullscreen(); setup(); };
      MT.onLeave(function () { if (document.fullscreenElement) document.exitFullscreen().catch(function () { }); });
    }

    function race() {
      var tables = Array.from(sel), score = 0, q, last = null, over = false, t0 = performance.now(), key = recKey();
      var rec = MT.root.classRec[key];
      stage('<div class="stage-top"><span>Rätt: <b id="sc">0</b></span><span>Rekord: ' + (rec ? rec.score : '–') + '</span><span><b id="tl">' + secs + '</b> s</span></div>' +
        '<div class="timebar" aria-hidden="true"><i id="bar"></i></div>' +
        '<div class="stage-q"><span id="qt"></span> = <span class="answer" id="ans"></span></div>' +
        '<div class="flash" id="fl" aria-live="assertive"></div><div id="kp" class="stage-kp"></div>');
      var kp = MT.keypad(MT.$('#kp', el), { display: MT.$('#ans', el), onSubmit: answer });
      function next() {
        do { q = MT.makeQ(op, MT.pick(tables), MT.rand(1, 10)); } while (last && q.key === last && tables.length * 10 > 1);
        last = q.key; MT.$('#qt', el).textContent = q.text; kp.clear(); kp.disable(false);
      }
      function answer(v) {
        if (over) return;
        var fl = MT.$('#fl', el);
        if (v === q.ans) { score++; MT.$('#sc', el).textContent = score; fl.className = 'flash ok'; fl.textContent = MT.pick(MT.PRAISE); next(); }
        else { fl.className = 'flash bad'; fl.textContent = 'Inte rätt – försök igen!'; kp.clear(); }
      }
      var iv = setInterval(function () {
        var left = secs - (performance.now() - t0) / 1000;
        MT.$('#tl', el).textContent = Math.max(0, Math.ceil(left));
        MT.$('#bar', el).style.transform = 'scaleX(' + Math.max(0, left / secs) + ')';
        if (left <= 0) end();
      }, 100);
      stops.push(function () { over = true; clearInterval(iv); });
      function end() {
        over = true; clearInterval(iv); kp.disable(true);
        var isRec = !rec || score > rec.score;
        if (isRec && score > 0) { MT.root.classRec[key] = { score: score, date: MT.today() }; MT.save(); }
        MT.$('#stage', el).innerHTML = '<div class="stage-end"><div>' + (isRec && score > 0 ? '🏆 Nytt klassrekord!' : 'Tiden är slut!') + '</div>' +
          '<div class="stage-big">' + score + '</div><div>rätt svar' + (!isRec ? ' – rekordet är ' + rec.score : '') + '</div>' +
          '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">En gång till</button></div></div>';
        MT.$('#again', el).onclick = function () { stopAll(); race(); };
      }
      next();
    }

    function show() {
      var tables = Array.from(sel), paused = false, timers = [], last = null;
      stage('<div class="stage-top"><span>Tänk!</span><button type="button" class="btn btn-small" id="pause">Pausa</button></div>' +
        '<div class="stage-q" id="sq"></div><div class="stage-ans" id="sa" aria-live="polite"></div>');
      function clear() { timers.forEach(clearTimeout); timers = []; }
      stops.push(function () { paused = true; clear(); });
      function step() {
        if (paused) return;
        var q;
        do { q = MT.makeQ(op, MT.pick(tables), MT.rand(1, 10)); } while (last && q.key === last && tables.length * 10 > 1);
        last = q.key;
        MT.$('#sq', el).textContent = q.text + ' = ?';
        MT.$('#sa', el).textContent = '';
        timers.push(setTimeout(function () {
          MT.$('#sq', el).textContent = q.text + ' = ' + q.ans;
          MT.$('#sa', el).textContent = '';
          timers.push(setTimeout(step, 2200));
        }, think * 1000));
      }
      MT.$('#pause', el).onclick = function () {
        paused = !paused; this.textContent = paused ? 'Fortsätt' : 'Pausa';
        if (paused) clear(); else step();
      };
      step();
    }
    setup();
  });
})();
