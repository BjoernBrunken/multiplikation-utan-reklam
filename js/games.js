/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Spel: Memory, Tabellregn och Duell */
(function () {
  'use strict';
  var PCOL = ['#FFD23F', '#9FD3F7'];

  MT.route(/^\/spel$/, function (el) {
    el.innerHTML =
      '<h1>Spel</h1><p class="muted">Tre spel för att öva tabellerna. Välj själv vilka tabeller som ska vara med.</p>' +
      '<div class="big-links game-cards">' +
      card('#/spel/memory', '?', 'Memory', 'Hitta paren: en fråga och dess svar. Ensam eller två och två.') +
      card('#/spel/regn', '☂', 'Tabellregn', 'Droppar med frågor faller. Skriv svaret innan de når marken!') +
      card('#/spel/duell', '⚔', 'Duell', 'Två spelare på samma skärm. Den som först trycker rätt får poängen.') +
      '</div>' +
      '<div class="section-title"><h2>Arcade</h2><span class="muted">Spela med piltangenterna och mellanslag</span></div>' +
      '<div class="big-links four game-cards">' +
      card('#/spel/rymd', '🚀', 'Rymdkanonen', 'Skjut rymdskeppet som har rätt svar.') +
      card('#/spel/ormen', '🐛', 'Sifferormen', 'Styr ormen till rätt tal så växer den.') +
      card('#/spel/tegel', '🧱', 'Tegelkrossen', 'Studsa bollen på stenen med rätt svar.') +
      card('#/spel/an', '⛵', 'Över ån', 'Hoppa på båten med rätt svar och ta dig över.') +
      '</div>';
    function card(h, i, t, p) { return '<a class="big-link" href="' + h + '"><span class="icon" aria-hidden="true">' + i + '</span><span><h3>' + t + '</h3><p>' + p + '</p></span></a>'; }
  });

  function setupScreen(el, title, intro, extra, onStart, sel) {
    el.innerHTML = '<a class="back" href="#/spel">← Alla spel</a><h1>' + title + '</h1><p class="muted">' + intro + '</p>' +
      '<div class="card setup"><div><h3>Vilka tabeller?</h3><div id="tb"></div></div>' + extra +
      '<div><button type="button" class="btn btn-main" id="start">Starta</button> <span class="muted small" id="warn"></span></div></div><div id="below"></div>';
    var check = function () {
      MT.$('#start', el).disabled = !sel.size;
      MT.$('#warn', el).textContent = sel.size ? '' : 'Välj minst en tabell.';
    };
    MT.tableChips(MT.$('#tb', el), sel, check);
    MT.$('#start', el).onclick = onStart;
    check();
  }
  function sorted(sel) { return Array.from(sel).sort(function (a, b) { return a - b; }); }

  /* ================= MEMORY ================= */
  var memSel = new Set([2, 3, 4, 5]);
  MT.route(/^\/spel\/memory$/, function (el) {
    var players = 1, pairs = 8;
    function setup() {
      setupScreen(el, 'Memory', 'Vänd två kort. Hör frågan och svaret ihop får du behålla dem.',
        '<div><h3>Spelare</h3><div id="pl"></div></div><div><h3>Antal par</h3><div id="pr"></div></div>', play, memSel);
      MT.seg(MT.$('#pl', el), [[1, '1 spelare'], [2, '2 spelare']], players, function (v) { players = v; });
      MT.seg(MT.$('#pr', el), [[6, '6'], [8, '8'], [10, '10']], pairs, function (v) { pairs = v; });
      var g = MT.db.games.memory || {};
      var recs = [6, 8, 10].filter(function (k) { return g[k]; }).map(function (k) { return k + ' par: ' + g[k] + ' drag'; });
      if (recs.length) MT.$('#below', el).innerHTML = '<p class="muted" style="margin-top:14px">Dina rekord (1 spelare) – ' + recs.join(' · ') + '</p>';
    }
    function play() {
      var tables = sorted(memSel), used = {}, list = [];
      MT.shuffle(MT.pool('mul', tables, 1, 10)).forEach(function (q) {
        if (list.length < pairs && !used[q.ans]) { used[q.ans] = 1; list.push(q); }
      });
      var n = list.length;
      var cards = MT.shuffle(list.reduce(function (a, q) { return a.concat([{ k: q.key, face: q.text, q: q }, { k: q.key, face: String(q.ans), q: q }]); }, []));
      var open = [], lock = false, turn = players === 2 ? MT.rand(0, 1) : 0, score = [0, 0], moves = 0, found = 0, t0 = Date.now();
      var cols = cards.length > 16 ? 5 : 4;
      el.innerHTML = '<a class="back" href="#/spel/memory">← Avbryt</a>' +
        '<div class="players" id="pl"></div>' +
        '<div class="mem-board" style="--cols:' + cols + '">' + cards.map(function (c, i) {
          return '<button type="button" class="mem-card" data-i="' + i + '" aria-label="Kort ' + (i + 1) + '"><span>' + c.face + '</span></button>';
        }).join('') + '</div><p class="center muted" id="info" aria-live="polite"></p>';
      var btns = MT.$$('.mem-card', el);
      function hud() {
        if (players === 1) MT.$('#pl', el).innerHTML = '<span class="player turn" style="--pc:' + PCOL[0] + '">Drag: ' + moves + ' · Par: ' + found + ' / ' + n + '</span>';
        else MT.$('#pl', el).innerHTML = [0, 1].map(function (p) {
          return '<span class="player' + (p === turn ? ' turn' : '') + '" style="--pc:' + PCOL[p] + '">Spelare ' + (p + 1) + ': ' + score[p] + '</span>';
        }).join('');
        MT.$('#info', el).textContent = players === 2 ? 'Tur: Spelare ' + (turn + 1) : '';
      }
      MT.$('.mem-board', el).addEventListener('click', function (e) {
        var b = e.target.closest('.mem-card'); if (!b || lock) return;
        var i = +b.dataset.i;
        if (b.classList.contains('open') || b.classList.contains('done')) return;
        b.classList.add('open'); b.setAttribute('aria-label', cards[i].face); open.push(i);
        if (open.length < 2) return;
        moves++;
        var a = open[0], c = open[1]; open = [];
        if (cards[a].k === cards[c].k) {
          [a, c].forEach(function (x) { btns[x].classList.remove('open'); btns[x].classList.add('done'); btns[x].style.setProperty('--pc', players === 2 ? PCOL[turn] : '#E5F5EC'); btns[x].disabled = true; });
          score[turn]++; found++; hud();
          if (found === n) end();
        } else {
          lock = true; hud();
          MT.after(function () {
            [a, c].forEach(function (x) { btns[x].classList.remove('open'); btns[x].classList.add('miss'); btns[x].setAttribute('aria-label', 'Kort ' + (x + 1)); });
            MT.after(function () { [a, c].forEach(function (x) { btns[x].classList.remove('miss'); }); }, 400);
            if (players === 2) turn = 1 - turn;
            lock = false; hud();
          }, 1100);
        }
      });
      function end() {
        var secs = (Date.now() - t0) / 1000, msg;
        if (players === 1) {
          var g = MT.db.games.memory = MT.db.games.memory || {};
          var rec = !g[n] || moves < g[n];
          if (rec) { g[n] = moves; MT.save(); }
          msg = 'Alla par på ' + moves + ' drag och ' + MT.fmtTime(secs) + ' minuter.' + (rec ? ' Nytt rekord!' : ' Rekord: ' + g[n] + ' drag.');
        } else {
          msg = score[0] === score[1] ? 'Oavgjort, ' + score[0] + ' – ' + score[1] + '!' :
            'Spelare ' + (score[0] > score[1] ? 1 : 2) + ' vinner med ' + Math.max(score[0], score[1]) + ' – ' + Math.min(score[0], score[1]) + '!';
        }
        MT.after(function () {
          MT.$('#info', el).innerHTML = '<span class="msg msg-ok" style="display:inline-block">' + msg + '</span>' +
            '<span class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">Spela igen</button>' +
            '<button type="button" class="btn" id="menu">Ändra val</button></span>';
          MT.$('#again', el).onclick = play; MT.$('#menu', el).onclick = setup;
        }, 400);
      }
      hud();
    }
    setup();
  });

  /* ================= TABELLREGN ================= */
  var rainSel = new Set([2, 3, 4, 5, 10]);
  MT.route(/^\/spel\/regn$/, function (el) {
    function setup() {
      setupScreen(el, 'Tabellregn', 'Frågor faller som regndroppar. Skriv svaret och tryck Enter så spricker droppen. Tre droppar i marken och spelet är slut.',
        '', play, rainSel);
      if (MT.db.games.regn) MT.$('#below', el).innerHTML = '<p class="muted" style="margin-top:14px">Ditt rekord: ' + MT.db.games.regn + ' droppar.</p>';
    }
    function play() {
      var tables = sorted(rainSel);
      el.innerHTML = '<a class="back" href="#/spel/regn">← Avbryt</a>' +
        '<div class="rain-hud"><span>Droppar: <b id="sc">0</b></span><span class="hearts" id="lv" aria-label="liv"></span></div>' +
        '<div class="rain-play"><div class="rain" id="area"><div class="rain-ground"></div></div>' +
        '<div class="rain-side"><div class="answer" id="ans" aria-live="polite"></div><div id="kp"></div></div></div>';
      var area = MT.$('#area', el), ans = MT.$('#ans', el);
      var drops = [], score = 0, lives = 3, over = false, paused = false, last = performance.now(), spawnIn = 0.6, raf;
      var kp = MT.keypad(MT.$('#kp', el), { display: ans, onSubmit: shoot });
      function hud() { MT.$('#sc', el).textContent = score; MT.$('#lv', el).textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives); }
      function spawn() {
        var q, g = 0;
        do { q = MT.makeQ('mul', MT.pick(tables), MT.rand(1, 10)); g++; }
        while (g < 20 && drops.some(function (d) { return d.q.ans === q.ans; }));
        var d = document.createElement('div');
        d.className = 'drop'; d.textContent = q.text;
        d.style.cssText = MT.style(q.t) + ';left:' + MT.rand(14, 86) + '%';
        area.appendChild(d);
        drops.push({ q: q, el: d, y: -50, dead: false });
      }
      function shoot(v) {
        if (over) return;
        var hit = drops.filter(function (d) { return !d.dead && d.q.ans === v; }).sort(function (a, b) { return b.y - a.y; })[0];
        kp.clear();
        if (!hit) { ans.classList.remove('miss'); void ans.offsetWidth; ans.style.color = 'var(--red)'; MT.after(function () { ans.style.color = ''; }, 300); return; }
        hit.dead = true; hit.el.classList.add('pop'); score++; hud();
        MT.after(function () { hit.el.remove(); }, 300);
      }
      function frame(now) {
        if (over) return;
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!paused) {
          var H = area.clientHeight;
          var dur = Math.max(4.2, 11 - score * 0.22);         // sekunder från topp till mark
          var speed = H / dur;
          spawnIn -= dt;
          var alive = drops.filter(function (d) { return !d.dead; }).length;
          if (spawnIn <= 0 && alive < 6) { spawn(); spawnIn = Math.max(1.1, 3 - score * 0.07); }
          drops.forEach(function (d) {
            if (d.dead) return;
            d.y += speed * dt;
            d.el.style.top = d.y + 'px';
            if (d.y + d.el.offsetHeight >= H - 14) {
              d.dead = true; lives--; hud();
              d.el.textContent = d.q.text + ' = ' + d.q.ans; d.el.classList.add('splash');
              setTimeout(function () { d.el.remove(); }, 700);
              if (lives <= 0) end();
            }
          });
          drops = drops.filter(function (d) { return !d.dead || d.el.isConnected; });
        }
        raf = requestAnimationFrame(frame);
      }
      function vis() { paused = document.hidden; last = performance.now(); }
      MT.listen(document, 'visibilitychange', vis);
      MT.onLeave(function () { over = true; cancelAnimationFrame(raf); });
      function end() {
        over = true; cancelAnimationFrame(raf); kp.disable(true);
        var rec = score > (MT.db.games.regn || 0);
        if (rec) { MT.db.games.regn = score; MT.save(); }
        MT.after(function () {
          area.insertAdjacentHTML('beforeend', '<div class="duel-banner"><div><div>' + score + ' droppar!</div>' +
            '<div class="small" style="font-size:1.1rem">' + (rec ? 'Nytt rekord!' : 'Rekord: ' + MT.db.games.regn) + '</div>' +
            '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">Spela igen</button>' +
            '<button type="button" class="btn" id="menu">Ändra val</button></div></div></div>');
          MT.$('#again', el).onclick = play; MT.$('#menu', el).onclick = setup;
        }, 700);
      }
      hud(); raf = requestAnimationFrame(frame);
    }
    setup();
  });

  /* ================= DUELL ================= */
  var duelSel = new Set([2, 3, 4, 5]);
  MT.route(/^\/spel\/duell$/, function (el) {
    var target = 10;
    function setup() {
      setupScreen(el, 'Duell', 'Sätt er mitt emot varandra med datorn eller surfplattan mellan er. Båda får samma fråga – den som först trycker på rätt svar får poängen. Trycker du fel får du vänta en stund.',
        '<div><h3>Först till</h3><div id="tg"></div></div>', play, duelSel);
      MT.seg(MT.$('#tg', el), [[5, '5 poäng'], [10, '10 poäng'], [15, '15 poäng']], target, function (v) { target = v; });
    }
    function play() {
      var tables = sorted(duelSel), score = [0, 0], q = null, open = false, locked = [false, false], lastKey = null;
      el.innerHTML = '<div class="duel">' + [0, 1].map(function (p) {
        return '<div class="duel-side p' + (p + 1) + '" data-p="' + p + '" style="--pc:' + PCOL[p] + '">' +
          '<div class="duel-score"><span>Spelare ' + (p + 1) + '</span><span><b class="ds">0</b> / ' + target + '</span></div>' +
          '<div class="duel-q"></div><div class="duel-opts"></div></div>';
      }).join('') + '</div><div class="actions" style="justify-content:center"><a class="btn" href="#/spel/duell">Avsluta</a></div>';
      var sides = MT.$$('.duel-side', el);
      function round() {
        do { q = MT.makeQ('mul', MT.pick(tables), MT.rand(1, 10)); } while (q.key === lastKey && tables.length * 10 > 1);
        lastKey = q.key;
        var opts = MT.options(q);
        sides.forEach(function (s, p) {
          locked[p] = false; s.classList.remove('locked');
          var b = s.querySelector('.duel-banner'); if (b) b.remove();
          s.querySelector('.duel-q').textContent = q.text;
          s.querySelector('.duel-opts').innerHTML = MT.shuffle(opts).map(function (o) { return '<button type="button" data-v="' + o + '">' + o + '</button>'; }).join('');
        });
        open = true;
      }
      sides.forEach(function (s, p) {
        s.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-v]'); if (!b || !open || locked[p]) return;
          if (+b.dataset.v === q.ans) {
            open = false; score[p]++;
            s.querySelector('.ds').textContent = score[p];
            b.classList.add('right');
            sides[1 - p].querySelectorAll('button[data-v]').forEach(function (x) { if (+x.dataset.v === q.ans) x.classList.add('right'); });
            if (score[p] >= target) MT.after(function () { end(p); }, 500);
            else MT.after(round, 900);
          } else {
            b.classList.add('wrong'); locked[p] = true; s.classList.add('locked');
            var key = q.key;
            MT.after(function () { if (q.key === key) { locked[p] = false; s.classList.remove('locked'); b.classList.remove('wrong'); } }, 1300);
          }
        });
      });
      function end(w) {
        sides.forEach(function (s, p) {
          s.insertAdjacentHTML('beforeend', '<div class="duel-banner"><div>' + (p === w ? 'Du vann! 🏆' : 'Bra kämpat!') +
            '<div style="font-size:1.1rem">' + score[p] + ' – ' + score[1 - p] + '</div>' +
            '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" data-again>Spela igen</button></div></div></div>');
        });
        MT.$$('[data-again]', el).forEach(function (b) { b.onclick = play; });
      }
      round();
    }
    setup();
  });
})();
