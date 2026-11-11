/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Snabbtest, 100 sekunder och Tabelldiplom */
(function () {
  'use strict';

  /* ================= SNABBTEST ================= */
  MT.route(/^\/snabbtest$/, function (el) {
    var sel = new Set([2, 3, 4, 5]), op = 'mul', n = 20, SEC = 10;

    function setup() {
      el.innerHTML =
        '<h1>Snabbtest <span class="mark">10 sekunder</span></h1>' +
        '<p class="muted">Du har 10 sekunder på dig per fråga. Rätt svar ger 10 poäng plus 1 poäng för varje sekund som är kvar.</p>' +
        '<div class="card setup">' +
        '<div><h3>Gånger eller delat?</h3><div id="op"></div></div>' +
        '<div><h3>Vilka tabeller?</h3><div id="tb"></div></div>' +
        '<div><h3>Antal frågor</h3><div id="n"></div></div>' +
        '<div><button type="button" class="btn btn-main" id="start">Starta</button> <span class="muted small" id="warn"></span></div>' +
        '</div>' +
        '<div id="last"></div>';
      MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; });
      MT.tableChips(MT.$('#tb', el), sel, check);
      MT.seg(MT.$('#n', el), [[10, '10'], [20, '20'], [30, '30'], [50, '50']], n, function (v) { n = v; });
      MT.$('#start', el).onclick = run;
      check(); lastResults(MT.$('#last', el));
    }
    function check() {
      var ok = sel.size > 0;
      MT.$('#start', el).disabled = !ok;
      MT.$('#warn', el).textContent = ok ? '' : 'Välj minst en tabell.';
    }
    function run() {
      var tables = Array.from(sel).sort(function (a, b) { return a - b; });
      el.innerHTML = '<a class="back" href="#/snabbtest">← Avbryt</a><div class="card" style="--c:var(--ink)"><div id="q"></div></div>';
      MT.quiz(MT.$('#q', el), {
        questions: MT.drawQs(op, tables, n), perQ: SEC,
        score: function (r) { return r.ok ? 10 + Math.floor(r.left) : 0; },
        onDone: function (res, info) {
          var right = res.filter(function (r) { return r.ok; }).length;
          var entry = { date: MT.today(), op: op, tables: tables, n: n, right: right, score: info.points };
          var best = MT.db.speed.reduce(function (m, x) { return x.n === n ? Math.max(m, x.score) : m; }, 0);
          MT.db.speed.unshift(entry); MT.db.speed = MT.db.speed.slice(0, 30); MT.save();
          var html = resultHTML(entry, res, info.points > best && MT.db.speed.length > 1);
          el.innerHTML = '<div class="card stack center">' + html +
            '<div class="actions no-print" style="justify-content:center">' +
            '<button type="button" class="btn btn-main" id="again">Kör igen</button>' +
            '<button type="button" class="btn" id="menu">Ändra val</button>' +
            '<button type="button" class="btn" id="pr">Skriv ut resultatet</button></div></div>';
          MT.$('#again', el).onclick = run;
          MT.$('#menu', el).onclick = setup;
          MT.$('#pr', el).onclick = function () { MT.printHTML('<div class="card">' + html + '</div>'); };
        }
      });
    }
    function resultHTML(e, res, record) {
      return '<h2>Snabbtest – resultat</h2>' +
        (MT.db.name ? '<p>' + MT.esc(MT.db.name) + '</p>' : '') +
        '<div class="result-big" style="--c:var(--ink)">' + e.score + '</div><p>poäng</p>' +
        (record ? '<p class="msg msg-ok">Nytt rekord för ' + e.n + ' frågor!</p>' : '') +
        '<div class="stats"><div class="stat"><b>' + e.right + ' / ' + e.n + '</b><span>rätt</span></div>' +
        '<div class="stat"><b>' + (e.op === 'div' ? 'Delat' : 'Gånger') + '</b><span>räknesätt</span></div>' +
        '<div class="stat"><b>' + e.tables.join(', ') + '</b><span>tabeller</span></div></div>' +
        MT.mistakesHTML(res);
    }
    function lastResults(box) {
      if (!MT.db.speed.length) return;
      box.innerHTML = '<div class="section-title"><h2>Senaste resultat</h2></div><div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Tabeller</th><th>Rätt</th><th>Poäng</th></tr></thead><tbody>' +
        MT.db.speed.slice(0, 10).map(function (x) {
          return '<tr><td>' + x.date + '</td><td>' + (x.op === 'div' ? '/ ' : '· ') + x.tables.join(', ') + '</td><td>' + x.right + ' / ' + x.n + '</td><td><b>' + x.score + '</b></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    setup();
  });

  /* ================= 100 SEKUNDER ================= */
  // Svårighetsnivåer: lätta tabeller först, sedan svårare
  var LEVELS = [[1, 2, 10], [1, 2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 5, 6, 11], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9, 12], [7, 8, 9, 12]];
  var TOTAL = 100, PER_STAR = 5;

  MT.route(/^\/100$/, function (el) {
    var op = 'mul';
    function stats() {
      var runs = MT.db.hundred.runs, today = MT.today();
      var week = Date.now() - 7 * 864e5;
      function best(f) { return runs.filter(f).reduce(function (m, r) { return Math.max(m, r.score); }, 0); }
      return {
        all: best(function () { return true; }),
        today: best(function (r) { return r.date === today; }),
        week: best(function (r) { return new Date(r.date + 'T12:00:00').getTime() >= week; })
      };
    }
    function intro() {
      var s = stats();
      el.innerHTML =
        '<h1>100 <span class="mark">sekunder</span></h1>' +
        '<div class="card stack">' +
        '<p>Hur många frågor hinner du svara rätt på under 100 sekunder? Frågorna är lätta i början och blir svårare ju fler rätt du får. ' +
        'Svarar du fel får du försöka en gång till. Var femte rätt svar ger en stjärna.</p>' +
        '<div id="op"></div>' +
        '<div><button type="button" class="btn btn-main" id="start">Starta</button></div></div>' +
        '<div class="section-title"><h2>Dina rekord</h2></div>' +
        '<div class="stats" style="justify-content:flex-start">' +
        '<div class="stat"><b>' + s.all + '</b><span>bästa någonsin</span></div>' +
        '<div class="stat"><b>' + s.week + '</b><span>bästa senaste veckan</span></div>' +
        '<div class="stat"><b>' + s.today + '</b><span>bästa idag</span></div></div>';
      MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; });
      MT.$('#start', el).onclick = play;
    }
    function play() {
      var score = 0, tries = 0, q = null, last = null, busy = false, over = false;
      var t0 = performance.now(), qT = t0;
      el.innerHTML = '<a class="back" href="#/100">← Avbryt</a><div class="card"><div class="quiz" style="--c:var(--ink)">' +
        '<div class="quiz-top"><span class="pill">Rätt <b id="sc">0</b></span><span class="pill">Tid kvar <b id="tl">100</b> s</span></div>' +
        '<div class="timebar" aria-hidden="true"><i id="bar"></i></div>' +
        '<div class="stars" id="stars"></div>' +
        '<div class="qline" aria-live="polite"><span id="qt"></span><span>=</span><span class="answer" id="ans"></span></div>' +
        '<div class="flash" id="fl" aria-live="assertive"></div><div id="kp"></div>' +
        '<p class="kbd-hint">Skriv svaret och tryck Enter.</p></div></div>';
      var kp = MT.keypad(MT.$('#kp', el), { display: MT.$('#ans', el), onSubmit: answer });
      var line = MT.$('.qline', el), fl = MT.$('#fl', el);
      function stars() {
        var n = Math.floor(score / PER_STAR), shown = Math.max(10, n);
        MT.$('#stars', el).innerHTML = MT.range(1, shown).map(function (i) { return MT.starIcon(i <= n); }).join('');
      }
      function nextQ() {
        var lvl = LEVELS[Math.min(LEVELS.length - 1, Math.floor(score / 4))];
        var fmax = score < 8 ? 5 : 10;
        do { q = MT.makeQ(op, MT.pick(lvl), MT.rand(1, fmax)); } while (last && q.key === last);
        last = q.key; tries = 0; busy = false; qT = performance.now();
        MT.$('#qt', el).textContent = q.text;
        line.className = 'qline'; fl.textContent = ''; fl.className = 'flash';
        kp.clear(); kp.disable(false);
      }
      function answer(v) {
        if (busy || over) return;
        if (tries === 0) MT.track(q, v === q.ans, (performance.now() - qT) / 1000);
        if (v === q.ans) {
          score++; MT.$('#sc', el).textContent = score; stars();
          line.classList.add('ok'); fl.className = 'flash ok'; fl.textContent = MT.pick(MT.PRAISE);
          busy = true; kp.disable(true); MT.after(nextQ, 250);
        } else if (tries === 0) {
          tries = 1; line.classList.add('bad'); fl.className = 'flash bad'; fl.textContent = 'Försök en gång till!';
          MT.after(function () { if (!over) { line.className = 'qline'; kp.clear(); } }, 500);
        } else {
          busy = true; kp.disable(true);
          line.classList.add('bad'); fl.className = 'flash bad'; fl.textContent = q.text + ' = ' + q.ans;
          MT.after(nextQ, 1600);
        }
      }
      var iv = setInterval(function () {
        var left = TOTAL - (performance.now() - t0) / 1000;
        MT.$('#tl', el).textContent = Math.max(0, Math.ceil(left));
        MT.$('#bar', el).style.transform = 'scaleX(' + Math.max(0, left / TOTAL) + ')';
        MT.$('.timebar', el).classList.toggle('low', left < 15);
        if (left <= 0) end();
      }, 100);
      MT.onLeave(function () { clearInterval(iv); });
      function end() {
        if (over) return;
        over = true; clearInterval(iv); kp.disable(true);
        var before = stats().all;
        MT.db.hundred.runs.unshift({ date: MT.today(), score: score, op: op });
        MT.db.hundred.runs = MT.db.hundred.runs.slice(0, 200); MT.save();
        var n = Math.floor(score / PER_STAR);
        el.innerHTML = '<div class="card stack center">' +
          '<h2>Tiden är slut!</h2><div class="result-big" style="--c:var(--ink)">' + score + '</div><p>rätta svar på 100 sekunder</p>' +
          '<div class="stars">' + MT.range(1, Math.max(10, n)).map(function (i) { return MT.starIcon(i <= n); }).join('') + '</div>' +
          (score > before ? '<p class="msg msg-ok">Nytt personligt rekord!</p>' : '<p class="muted">Ditt rekord: ' + before + '</p>') +
          '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">Spela igen</button>' +
          '<a class="btn" href="#/pokaler">Till troféskåpet</a></div></div>';
        MT.$('#again', el).onclick = play;
      }
      stars(); nextQ();
    }
    intro();
  });

  /* ================= TABELLDIPLOM ================= */
  var KINDS = {
    small: { name: 'Litet tabelldiplom', tables: [1, 2, 3, 4, 5, 10], n: 30, cols: 6 },
    large: { name: 'Stort tabelldiplom', tables: MT.range(1, 12), n: 40, cols: 8 }
  };
  var LIMIT = 6 * 60;

  MT.route(/^\/diplom$/, function (el) {
    function choose() {
      el.innerHTML =
        '<h1>Tabell<span class="mark">diplom</span></h1>' +
        '<p class="muted">Du har 6 minuter på dig. Alla svar måste vara rätt för att du ska få diplomet. För varje rätt svar fylls en ruta i mosaiken.</p>' +
        '<div class="card setup">' +
        '<label class="field"><span>Ditt förnamn (står på diplomet)</span><input class="input" id="nm" maxlength="40" autocomplete="off" value="' + MT.esc(MT.db.name) + '"></label>' +
        '<div class="big-links" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' +
        kindCard('small', '1–5 och 10', '30 frågor från tabellerna 1, 2, 3, 4, 5 och 10.') +
        kindCard('large', '1–12', '40 frågor från alla tabeller 1 till 12.') +
        '</div></div>';
      MT.$$('[data-kind]', el).forEach(function (b) {
        b.onclick = function () {
          MT.db.name = MT.$('#nm', el).value.trim(); MT.save();
          run(b.dataset.kind);
        };
      });
    }
    function kindCard(k, icon, text) {
      var have = MT.db.diplomas[k];
      return '<button type="button" class="big-link" data-kind="' + k + '" style="text-align:left;cursor:pointer;font:inherit">' +
        '<span class="icon" aria-hidden="true" style="width:auto;padding:0 8px">' + icon + '</span><span><h3>' + KINDS[k].name + '</h3><p>' + text +
        (have ? '<br><b>Klart ' + have.date + '</b>' : '') + '</p></span></button>';
    }
    function run(k) {
      var K = KINDS[k];
      var qs = MT.drawQs('mul', K.tables, K.n);
      el.innerHTML = '<a class="back" href="#/diplom">← Avbryt</a><div class="card stack" style="--c:var(--ink)">' +
        '<h2 class="center">' + K.name + '</h2>' +
        '<div class="mosaic" style="grid-template-columns:repeat(' + K.cols + ',1fr)">' +
        qs.map(function (q) { return '<i style="--tc:' + MT.COLORS[q.t] + '"></i>'; }).join('') + '</div><div id="q"></div></div>';
      var tiles = MT.$$('.mosaic i', el);
      MT.quiz(MT.$('#q', el), {
        questions: qs, total: LIMIT,
        onAnswer: function (r, i) { tiles[i].classList.add(r.ok ? 'ok' : 'bad'); },
        onDone: function (res, info) {
          var right = res.filter(function (r) { return r.ok; }).length;
          if (right === K.n) {
            var firstTime = !MT.db.diplomas[k];
            MT.db.diplomas[k] = { name: MT.db.name, date: MT.today(), seconds: Math.round(info.seconds) };
            if (firstTime) MT.reward(2);
            MT.save();
            var cert = MT.certificate({
              title: K.name, name: MT.db.name, date: MT.today(),
              text: 'har svarat rätt på alla ' + K.n + ' frågor ur multiplikationstabellen ' + (k === 'small' ? '(1–5 och 10)' : '(1–12)') +
                ' på ' + MT.fmtTime(info.seconds) + ' minuter.'
            });
            el.innerHTML = '<div class="stack"><p class="msg msg-ok center">Grattis! Alla ' + K.n + ' rätt!</p>' + cert +
              '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="pr">Skriv ut diplomet</button>' +
              '<button type="button" class="btn" id="back">Tillbaka</button></div></div>';
            MT.$('#pr', el).onclick = function () { MT.printHTML(cert); };
            MT.$('#back', el).onclick = choose;
          } else {
            el.innerHTML = '<div class="card stack center"><h2>' + (info.timeUp ? 'Tiden tog slut' : 'Nästan!') + '</h2>' +
              '<div class="result-big" style="--c:var(--ink)">' + right + ' / ' + K.n + '</div><p>rätt svar. Alla måste vara rätt för diplomet.</p>' +
              MT.mistakesHTML(res) +
              '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">Försök igen</button>' +
              '<button type="button" class="btn" id="back">Tillbaka</button></div></div>';
            MT.$('#again', el).onclick = function () { run(k); };
            MT.$('#back', el).onclick = choose;
          }
        }
      });
    }
    choose();
  });
})();
