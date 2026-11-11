/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Övningssida för en tabell: fem steg med medaljer.
   Fungerar både för multiplikation (mul) och division (div). */
(function () {
  'use strict';

  var STEPS = [
    { short: 'Läs & skriv', title: 'Läs högt och skriv i ordning' },
    { short: 'Para ihop', title: 'Para ihop fråga och svar' },
    { short: 'Blandat', title: 'Blandad ordning' },
    { short: 'Flerval', title: 'Välj rätt svar' },
    { short: 'Tabelltest', title: 'Tabelltest med tid' }
  ];

  MT.route(/^\/ova\/(mul|div)\/(\d{1,2})$/, function (el, op, ts) {
    var t = +ts;
    if (t < 1 || t > 12) { MT.go('/'); return; }
    var color = MT.COLORS[t];
    var medals = MT.medals(op, t);
    var cur = medals.indexOf(false); if (cur < 0) cur = 0;
    var stopCur = null;
    var prev = t > 1 ? t - 1 : 12, next = t < 12 ? t + 1 : 1;
    var other = op === 'mul' ? 'div' : 'mul';

    el.innerHTML =
      '<div class="practice" style="' + MT.style(t) + '">' +
      '<a class="back" href="#/">← Alla tabeller</a>' +
      '<header class="ph">' +
      '  <div class="ph-num" aria-hidden="true">' + t + '</div>' +
      '  <div><h1>' + MT.tableName(op, t) + '</h1>' +
      '  <p>' + (op === 'mul' ? 'Öva på ' + t + ':ans tabell. <a href="#/ova/div/' + t + '">Öva division med ' + t + '</a>'
                                : 'Öva på att dela med ' + t + '. <a href="#/ova/mul/' + t + '">Öva ' + t + ':ans tabell</a>') + '</p></div>' +
      '  <nav class="ph-nav" aria-label="Byt tabell">' +
      '    <a class="btn btn-small" href="#/ova/' + op + '/' + prev + '" aria-label="Föregående tabell">← ' + prev + '</a>' +
      '    <a class="btn btn-small" href="#/ova/' + op + '/' + next + '" aria-label="Nästa tabell">' + next + ' →</a>' +
      '  </nav>' +
      '</header>' +
      '<details class="trick"' + (medals.some(Boolean) ? '' : ' open') + '><summary><span aria-hidden="true">💡</span> Knep för ' +
      (op === 'mul' ? t + ':ans tabell' : 'att dela med ' + t) + '</summary><div class="trick-body">' + MT.trickHTML(op, t) + '</div></details>' +
      '<ol class="steps" role="tablist" aria-label="Steg"></ol>' +
      '<section class="panel" id="panel" role="tabpanel"></section>' +
      '</div>';
    var stepsEl = MT.$('.steps', el), panel = MT.$('#panel', el);
    void other;
    if (op === 'mul' && t === 9) MT.fingerWidget(MT.$('#fingers', el));

    function drawSteps() {
      medals = MT.medals(op, t);
      stepsEl.innerHTML = STEPS.map(function (s, i) {
        return '<li><button type="button" class="step-btn" role="tab" data-s="' + i + '" aria-selected="' + (i === cur) + '">' +
          MT.medalIcon(medals[i], i === 4 ? '★' : i + 1) + '<span class="step-label">' + s.short + '</span>' +
          '<span class="sr">' + (medals[i] ? ' – klar' : '') + '</span></button></li>';
      }).join('');
    }
    stepsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (b) open(+b.dataset.s);
    });

    function open(s) {
      if (stopCur) { stopCur(); stopCur = null; }
      cur = s; drawSteps();
      stopCur = [step1, step2, step3, step4, step5][s](panel) || null;
    }
    MT.onLeave(function () { if (stopCur) stopCur(); });

    function head(i, text) {
      return '<div class="panel-head"><h2>Steg ' + (i + 1) + ': ' + STEPS[i].title + '</h2><p>' + text + '</p></div>';
    }
    function facts() { return MT.range(1, 10).map(function (f) { return MT.makeQ(op, t, f); }); }

    // visar medaljmeddelande + knapp till nästa steg
    function won(i, msgEl, extra) {
      var isNew = MT.giveMedal(op, t, i);
      drawSteps();
      var nextBtn = i < 4 ? '<button type="button" class="btn btn-color" data-next>Till steg ' + (i + 2) + ' →</button>' : '';
      msgEl.innerHTML = '<div class="msg msg-ok">' + (isNew ? 'Du fick en medalj för steg ' + (i + 1) + '! ' : 'Klart! ') + (extra || '') + '</div>' +
        '<div class="actions">' + nextBtn + '<button type="button" class="btn" data-again>Öva igen</button></div>';
      bindAfter(msgEl, i);
    }
    function failed(i, msgEl, text) {
      msgEl.innerHTML = '<div class="msg msg-bad">' + text + '</div><div class="actions"><button type="button" class="btn btn-color" data-again>Försök igen</button></div>';
      bindAfter(msgEl, i);
    }
    function bindAfter(msgEl, i) {
      var n = msgEl.querySelector('[data-next]'), a = msgEl.querySelector('[data-again]');
      if (n) n.onclick = function () { open(i + 1); };
      if (a) a.onclick = function () { open(i); };
    }

    /* ---------- steg 1: läs, sedan skriv i ordning ---------- */
    function step1(p) {
      var qs = facts();
      p.innerHTML = head(0, 'Läs varje rad högt. Titta på prickarna: ' + (op === 'mul' ? 'antal rader · prickar i varje rad.' : 'alla prickar delas upp i rader med ' + t + ' i varje.')) +
        '<div class="facts">' + qs.map(function (q) {
          return '<div class="fact"><span class="eq">' + q.text + ' = ' + q.ans + '</span>' + MT.dots(q.f, q.t, MT.COLORS[t], 7, 2) + '</div>';
        }).join('') + '</div>' +
        '<div class="actions"><button type="button" class="btn btn-color" id="go">Jag har läst – nu skriver jag</button></div>';
      MT.$('#go', p).onclick = function () { fillIn(p, qs, 0, 'Skriv svaren. Tryck Enter för att gå till nästa ruta.'); };
    }

    /* ---------- steg 3: blandad ordning ---------- */
    function step3(p) { fillIn(p, MT.shuffle(facts()), 2, 'Samma tabell, men huller om buller.'); }

    function fillIn(p, qs, stepIdx, text) {
      p.innerHTML = head(stepIdx, text) +
        '<div class="facts">' + qs.map(function (q, i) {
          return '<label class="fact"><span class="eq">' + q.text + ' =</span>' +
            '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" data-i="' + i + '" aria-label="' + q.text + '"></label>';
        }).join('') + '</div>' +
        '<div class="actions"><button type="button" class="btn btn-color" id="check">Kolla mina svar</button></div><div id="msg" aria-live="polite"></div>';
      var inputs = MT.$$('input', p), tracked = {};
      inputs.forEach(function (inp, i) {
        inp.addEventListener('input', function () {
          inp.value = inp.value.replace(/\D/g, '');
          inp.closest('.fact').classList.remove('ok', 'bad');
        });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); if (inputs[i + 1]) inputs[i + 1].focus(); else check(); }
        });
      });
      inputs[0].focus({ preventScroll: true });
      MT.$('#check', p).onclick = check;
      function check() {
        var right = 0;
        inputs.forEach(function (inp, i) {
          var ok = inp.value !== '' && +inp.value === qs[i].ans;
          if (ok) right++;
          // bara första försöket räknas för knepiga tal
          if (inp.value !== '' && !tracked[i]) { tracked[i] = 1; MT.track(qs[i], ok, null); }
          inp.closest('.fact').classList.toggle('ok', ok);
          inp.closest('.fact').classList.toggle('bad', !ok);
        });
        var msg = MT.$('#msg', p);
        if (right === qs.length) won(stepIdx, msg, 'Alla 10 rätt.');
        else {
          msg.innerHTML = '<div class="msg msg-bad">' + right + ' av ' + qs.length + ' rätt. Ändra i de röda rutorna och kolla igen.</div>';
          var firstBad = inputs.filter(function (x) { return x.closest('.fact').classList.contains('bad'); })[0];
          if (firstBad) firstBad.focus();
        }
      }
    }

    /* ---------- steg 2: para ihop ---------- */
    function step2(p) {
      var qs = MT.shuffle(facts()), as = MT.shuffle(qs);
      var selQ = null, selA = null, mistakes = 0, done = 0, timers = [], triedQ = {};
      p.innerHTML = head(1, 'Tryck på en fråga och sedan på rätt svar (eller tvärtom).') +
        '<div class="match">' +
        '<div class="match-col" id="mq"><h3>Fråga</h3>' + qs.map(function (q) { return '<button type="button" class="mbtn" data-k="' + q.key + '">' + q.text + '</button>'; }).join('') + '</div>' +
        '<div class="match-col" id="ma"><h3>Svar</h3>' + as.map(function (q) { return '<button type="button" class="mbtn" data-k="' + q.key + '">' + q.ans + '</button>'; }).join('') + '</div>' +
        '</div><div id="msg" aria-live="polite"></div>';
      var colQ = MT.$('#mq', p), colA = MT.$('#ma', p);
      function onPick(e, side) {
        var b = e.target.closest('.mbtn'); if (!b || b.classList.contains('done')) return;
        if (side === 'q') { if (selQ) selQ.classList.remove('sel'); selQ = selQ === b ? null : b; }
        else { if (selA) selA.classList.remove('sel'); selA = selA === b ? null : b; }
        if (side === 'q' && selQ) selQ.classList.add('sel');
        if (side === 'a' && selA) selA.classList.add('sel');
        if (selQ && selA) tryPair();
      }
      colQ.addEventListener('click', function (e) { onPick(e, 'q'); });
      colA.addEventListener('click', function (e) { onPick(e, 'a'); });
      function tryPair() {
        var q = selQ, a = selA; selQ = selA = null;
        q.classList.remove('sel'); a.classList.remove('sel');
        var item = qs.filter(function (x) { return x.key === q.dataset.k; })[0];
        if (!triedQ[item.key]) { triedQ[item.key] = 1; MT.track(item, q.dataset.k === a.dataset.k, null); }
        if (q.dataset.k === a.dataset.k) {
          q.textContent = item.text + ' = ' + item.ans;
          q.classList.add('done'); a.classList.add('done', 'gone');
          q.disabled = a.disabled = true;
          if (++done === qs.length) finish();
        } else {
          mistakes++;
          q.classList.add('wrong'); a.classList.add('wrong');
          timers.push(setTimeout(function () { q.classList.remove('wrong'); a.classList.remove('wrong'); }, 450));
        }
      }
      function finish() {
        var msg = MT.$('#msg', p);
        if (mistakes <= 2) won(1, msg, mistakes ? mistakes + ' fel på vägen – bra jobbat!' : 'Inga fel alls!');
        else failed(1, msg, 'Alla par hittade, men med ' + mistakes + ' fel. Klarar du det med högst 2 fel?');
      }
      return function () { timers.forEach(clearTimeout); };
    }

    /* ---------- steg 4: flerval ---------- */
    function step4(p) {
      var list = MT.shuffle(MT.range(1, 10)).concat(MT.shuffle(MT.range(1, 10)).slice(0, 5));
      var qs = list.map(function (f) { return MT.makeQ(op, t, f); });
      var i = 0, right = 0, res = [], timers = [], N = qs.length, NEED = 13;
      function draw() {
        var q = qs[i], opts = MT.options(q);
        p.innerHTML = head(3, 'Klara minst ' + NEED + ' av ' + N + ' för medaljen.') +
          '<div class="quiz-top"><span class="pill">Fråga <b>' + (i + 1) + '</b> / ' + N + '</span><span class="pill">Rätt <b>' + right + '</b></span></div>' +
          '<div class="mc-q">' + q.text + ' = ?</div>' +
          '<div class="mc-opts">' + opts.map(function (o) { return '<button type="button" data-v="' + o + '">' + o + '</button>'; }).join('') + '</div>' +
          '<div class="flash" aria-live="assertive"></div>';
        MT.$('.mc-opts', p).addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          var v = +b.dataset.v, ok = v === q.ans;
          MT.$$('.mc-opts button', p).forEach(function (x) { x.disabled = true; if (+x.dataset.v === q.ans) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong'); else right++;
          res.push({ q: q, given: v, ok: ok });
          MT.track(q, ok, null);
          var fl = MT.$('.flash', p);
          fl.className = 'flash ' + (ok ? 'ok' : 'bad');
          fl.textContent = ok ? MT.pick(MT.PRAISE) : 'Rätt svar är ' + q.ans;
          timers.push(setTimeout(function () { i++; if (i < N) draw(); else end(); }, ok ? 650 : 1500));
        });
      }
      function end() {
        p.innerHTML = head(3, '') + '<div class="center"><div class="result-big">' + right + ' / ' + N + '</div><p>rätt svar</p></div>' +
          '<div id="msg" aria-live="polite"></div>' + MT.mistakesHTML(res);
        var msg = MT.$('#msg', p);
        if (right >= NEED) won(3, msg); else failed(3, msg, 'Du behöver ' + NEED + ' rätt för medaljen. Försök igen!');
      }
      draw();
      return function () { timers.forEach(clearTimeout); };
    }

    /* ---------- steg 5: tabelltest med tid ---------- */
    function step5(p) {
      var N = 20, SEC = 12, quiz = null;
      p.innerHTML = head(4, N + ' frågor, ' + SEC + ' sekunder per fråga. Alla rätt ger ett tabelldiplom.') +
        '<div class="center stack"><p>Svara med knapparna eller tangentbordet.</p>' +
        '<button type="button" class="btn btn-color" id="start">Starta testet</button></div>';
      MT.$('#start', p).onclick = function () {
        var a = MT.drawQs(op, [t], N);
        p.innerHTML = head(4, '') + '<div id="q"></div>';
        quiz = MT.quiz(MT.$('#q', p), {
          questions: a, perQ: SEC,
          onDone: function (res) {
            quiz = null;
            var right = res.filter(function (r) { return r.ok; }).length;
            p.innerHTML = head(4, '') +
              '<div class="center"><div class="result-big">' + right + ' / ' + N + '</div><p>rätt svar</p></div><div id="msg"></div><div id="cert"></div>' + MT.mistakesHTML(res);
            var msg = MT.$('#msg', p);
            if (right === N) {
              MT.startReview(op, t);
              won(4, msg, 'Alla rätt – här är ditt tabelldiplom! Om några dagar kommer tabellen tillbaka för repetition.');
              showCert(MT.$('#cert', p));
            } else failed(4, msg, 'Det behövs ' + N + ' av ' + N + ' för diplomet. Titta på felen nedan och försök igen!');
          }
        });
      };
      return function () { if (quiz) quiz.stop(); };
    }

    function showCert(box) {
      var title = op === 'mul' ? 'Diplom i ' + t + ':ans tabell' : 'Diplom i division med ' + t;
      var text = op === 'mul'
        ? 'har svarat rätt på alla frågor i ' + t + ':ans tabell.'
        : 'har svarat rätt på alla frågor om att dela med ' + t + '.';
      function html() { return MT.certificate({ title: title, name: MT.db.name, text: text, date: MT.today(), style: MT.style(t) }); }
      box.innerHTML = '<div class="row" style="margin:18px 0"><label class="field"><span>Ditt namn på diplomet</span>' +
        '<input class="input" id="nm" maxlength="40" value="' + MT.esc(MT.db.name) + '" autocomplete="off"></label>' +
        '<button type="button" class="btn btn-main" id="pr" style="align-self:end">Skriv ut diplomet</button></div><div id="cv">' + html() + '</div>';
      MT.$('#nm', box).addEventListener('input', function (e) { MT.db.name = e.target.value.trim(); MT.save(); MT.$('#cv', box).innerHTML = html(); });
      MT.$('#pr', box).onclick = function () { MT.printHTML(html()); };
    }

    open(cur);
  });
})();
