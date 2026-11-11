/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Arcade-spel: gemensam motor (spelslinga, tangentbord, paus, ljud, rekord)
   och fyra egna spel: Rymdkanonen, Sifferormen, Tegelkrossen och Över ån. */
(function () {
  'use strict';
  var W = 800, H = 560, HUD = 52;
  var INK = '#1D2B5C', MARK = '#FFD23F', RED = '#D8402F', GREEN = '#1F8A52', PAPER = '#F6F9FD', GRID = '#DCE7F3';

  /* ================= LJUD (av som standard) ================= */
  var actx = null;
  MT.beep = function (kind) {
    if (!MT.root.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var seq = {
        ok: [[660, .07], [990, .12]], bad: [[200, .12], [150, .22]], shoot: [[880, .04]], boom: [[140, .18]],
        win: [[523, .09], [659, .09], [784, .18]], over: [[392, .14], [311, .14], [262, .3]], jump: [[520, .06]]
      }[kind] || [[440, .1]];
      var at = actx.currentTime;
      seq.forEach(function (s) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = (kind === 'bad' || kind === 'boom') ? 'square' : 'triangle';
        o.frequency.value = s[0];
        g.gain.setValueAtTime(0.09, at); g.gain.exponentialRampToValueAtTime(0.001, at + s[1]);
        o.connect(g); g.connect(actx.destination); o.start(at); o.stop(at + s[1] + .02);
        at += s[1] * 0.85;
      });
    } catch (e) { /* inget ljud */ }
  };

  /* ================= RITHJÄLP ================= */
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function text(g, s, x, y, size, color, align, weight) {
    g.font = (weight || 600) + ' ' + size + 'px Fredoka, "Segoe UI", sans-serif';
    g.fillStyle = color; g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }
  function paper(g) {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.strokeStyle = GRID; g.lineWidth = 1; g.beginPath();
    for (var x = 0.5; x < W; x += 24) { g.moveTo(x, HUD); g.lineTo(x, H); }
    for (var y = HUD + 0.5; y < H; y += 24) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  }
  function heart(g, x, y, s, full) {
    g.save(); g.translate(x, y); g.scale(s / 20, s / 20);
    g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-10, -2, -8, -12, 0, -6); g.bezierCurveTo(8, -12, 10, -2, 0, 6); g.closePath();
    g.fillStyle = full ? RED : '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = full ? RED : '#B9C3D9'; g.stroke(); g.restore();
  }
  MT.ARC = { W: W, H: H, HUD: HUD, rr: rr, text: text, INK: INK, MARK: MARK, RED: RED, GREEN: GREEN };

  /* ================= MOTOR ================= */
  var KEYMAP = { ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', ' ': 'Space', Spacebar: 'Space', p: 'P', P: 'P', Escape: 'P', a: 'Left', d: 'Right', w: 'Up', s: 'Down' };

  /* def = { id, title, icon, intro, controls:[...], tables:[...], create(api) -> { update(dt, input), draw(g) } } */
  MT.ARCADE = [];
  MT.arcade = function (def) {
    MT.ARCADE.push(def);
    var sel = new Set(def.tables || [2, 3, 4, 5, 10]), op = 'mul';

    MT.route(new RegExp('^/spel/' + def.id + '$'), function (el) {
      function records() { var a = MT.db.games.arcade = MT.db.games.arcade || {}; return a; }

      function setup() {
        var rec = records()[def.id];
        el.innerHTML = '<a class="back" href="#/spel">← Alla spel</a>' +
          '<h1>' + def.title + '</h1><p class="muted">' + def.intro + '</p>' +
          '<div class="card setup">' +
          '<div><h3>Så spelar du</h3><ul class="keys-help">' + def.controls.map(function (c) { return '<li>' + c + '</li>'; }).join('') +
          '<li><kbd>P</kbd> pausar spelet</li></ul></div>' +
          '<div><h3>Gånger eller delat?</h3><div id="op"></div></div>' +
          '<div><h3>Vilka tabeller?</h3><div id="tb"></div></div>' +
          '<div class="row"><button type="button" class="btn btn-main" id="start">Starta</button>' +
          '<button type="button" class="btn btn-small" id="snd"></button><span class="muted small" id="warn"></span></div>' +
          '</div>' +
          (rec ? '<p class="muted" style="margin-top:14px">Ditt rekord: <b>' + rec + '</b> poäng</p>' : '');
        MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; });
        MT.tableChips(MT.$('#tb', el), sel, check);
        soundBtn(MT.$('#snd', el));
        MT.$('#start', el).onclick = play;
        check();
      }
      function check() {
        MT.$('#start', el).disabled = !sel.size;
        MT.$('#warn', el).textContent = sel.size ? '' : 'Välj minst en tabell.';
      }
      function soundBtn(b) {
        function draw() { b.textContent = MT.root.sound ? '🔊 Ljud på' : '🔇 Ljud av'; b.setAttribute('aria-pressed', !!MT.root.sound); }
        b.onclick = function () { MT.root.sound = !MT.root.sound; MT.save(); draw(); if (MT.root.sound) MT.beep('ok'); };
        draw();
      }

      function play() {
        el.innerHTML = '<a class="back" href="#/spel/' + def.id + '">← Avsluta</a>' +
          '<div class="arc-wrap"><canvas class="arc" width="' + W + '" height="' + H + '" tabindex="0" aria-label="' + def.title + '"></canvas>' +
          '<div class="arc-end" id="end" hidden></div></div>' +
          '<div class="arc-bar"><button type="button" class="btn btn-small" id="pause">Paus (P)</button>' +
          '<button type="button" class="btn btn-small" id="snd"></button>' +
          '<span class="muted small">' + def.controls.join(' · ') + '</span></div>';
        var cv = MT.$('canvas', el), g = cv.getContext('2d');
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = H * dpr; g.scale(dpr, dpr);
        soundBtn(MT.$('#snd', el));
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        cv.focus({ preventScroll: true });

        var input = { down: {}, hit: {}, mouseX: null, mouseMoved: 0 };
        var floats = [], parts = [], state = 'ready', readyT = 1.4, raf = 0, last = performance.now(), ended = false;
        var api = {
          W: W, H: H, HUD: HUD, score: 0, lives: 3, level: 1, question: '', over: false,
          tables: Array.from(sel).sort(function (a, b) { return a - b; }), op: op,
          avatar: (MT.profile() || {}).avatar || '🙂',
          beep: MT.beep,
          track: function (q, ok) { MT.track(q, ok, null); },
          flash: function (s, color, x, y) { floats.push({ s: s, c: color || INK, x: x == null ? W / 2 : x, y: y == null ? H / 2 : y, t: 1.3 }); },
          burst: function (x, y, color, n) {
            for (var i = 0; i < (n || 14); i++) {
              var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
              parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: .6 + Math.random() * .4, c: color || MARK });
            }
          },
          loseLife: function (msg) {
            api.lives--; MT.beep('bad');
            if (msg) api.flash(msg, RED);
            if (api.lives <= 0) api.over = true;
          }
        };
        var game = def.create(api);
        MT._arc = { api: api, game: game };   // för automatiska tester

        function key(e, down) {
          var k = KEYMAP[e.key]; if (!k) return;
          if (e.target && e.target.matches && e.target.matches('input, select, textarea')) return;
          e.preventDefault();
          if (down && !input.down[k]) input.hit[k] = true;
          input.down[k] = down;
        }
        MT.listen(document, 'keydown', function (e) { key(e, true); });
        MT.listen(document, 'keyup', function (e) { key(e, false); });
        cv.addEventListener('pointermove', function (e) {
          var r = cv.getBoundingClientRect(); input.mouseX = (e.clientX - r.left) * W / r.width; input.mouseMoved = 1.5;
        });
        cv.addEventListener('pointerdown', function () { input.hit.Click = true; cv.focus({ preventScroll: true }); });
        MT.listen(window, 'blur', function () { if (state === 'play') state = 'pause'; input.down = {}; });
        MT.$('#pause', el).onclick = function () { togglePause(); cv.focus({ preventScroll: true }); };
        function togglePause() { if (state === 'play') state = 'pause'; else if (state === 'pause') { state = 'play'; last = performance.now(); } }

        function frame(now) {
          if (ended) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (input.hit.P) togglePause();
          if (state === 'ready') { readyT -= dt; if (readyT <= 0) state = 'play'; }
          else if (state === 'play') {
            game.update(dt, input);
            input.mouseMoved = Math.max(0, input.mouseMoved - dt);
            parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.t -= dt; });
            parts = parts.filter(function (p) { return p.t > 0; });
            floats.forEach(function (f) { f.t -= dt; f.y -= 30 * dt; });
            floats = floats.filter(function (f) { return f.t > 0; });
          }
          input.hit = {};
          draw();
          if (api.over) { end(); return; }
          raf = requestAnimationFrame(frame);
        }
        function draw() {
          paper(g);
          game.draw(g);
          parts.forEach(function (p) { g.globalAlpha = Math.max(0, Math.min(1, p.t * 2)); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); });
          g.globalAlpha = 1;
          floats.forEach(function (f) {
            g.globalAlpha = Math.min(1, f.t * 1.5);
            g.font = '700 30px Fredoka, sans-serif';
            var w = g.measureText(f.s).width + 28;
            g.fillStyle = '#fff'; rr(g, f.x - w / 2, f.y - 22, w, 44, 12); g.fill();
            g.lineWidth = 3; g.strokeStyle = f.c; g.stroke();
            text(g, f.s, f.x, f.y + 1, 26, f.c, 'center', 700);
          });
          g.globalAlpha = 1;
          hud();
          if (state === 'ready') banner(readyT > .5 ? 'Redo?' : 'Kör!');
          if (state === 'pause') banner('Paus – tryck P');
        }
        function hud() {
          g.fillStyle = '#fff'; g.fillRect(0, 0, W, HUD);
          g.fillStyle = INK; g.fillRect(0, HUD - 3, W, 3);
          text(g, 'Poäng ' + api.score, 16, HUD / 2, 22, INK, 'left', 600);
          text(g, 'Nivå ' + api.level, 150, HUD / 2, 18, '#4B5784', 'left', 500);
          for (var i = 0; i < 3; i++) heart(g, W - 26 - i * 30, HUD / 2, 22, i < api.lives);
          if (api.question) {
            g.font = '700 28px Fredoka, sans-serif';
            var w = Math.max(160, g.measureText(api.question).width + 40);
            g.fillStyle = MARK; rr(g, W / 2 - w / 2, 7, w, HUD - 16, 10); g.fill();
            g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            text(g, api.question, W / 2, HUD / 2 - 1, 28, INK, 'center', 700);
          }
        }
        function banner(s) {
          g.fillStyle = 'rgba(29,43,92,.35)'; g.fillRect(0, HUD, W, H - HUD);
          g.fillStyle = '#fff'; rr(g, W / 2 - 170, H / 2 - 50, 340, 100, 20); g.fill();
          g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
          text(g, s, W / 2, H / 2 + 2, 40, INK, 'center', 700);
        }
        function end() {
          ended = true; cancelAnimationFrame(raf);
          MT.beep('over');
          var recs = records(), before = recs[def.id] || 0, isRec = api.score > before;
          if (isRec) { recs[def.id] = api.score; MT.save(); }
          var box = MT.$('#end', el);
          box.innerHTML = '<div class="arc-end-card"><h2>' + (api.endText || 'Spelet är slut!') + '</h2>' +
            '<div class="result-big" style="--c:var(--ink)">' + api.score + '</div><p>poäng · nivå ' + api.level + '</p>' +
            (isRec && api.score > 0 ? '<p class="msg msg-ok">Nytt rekord!</p>' : '<p class="muted">Ditt rekord: ' + before + '</p>') +
            '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" id="again">Spela igen</button>' +
            '<button type="button" class="btn" id="menu">Ändra val</button></div></div>';
          box.hidden = false;
          var again = MT.$('#again', el);
          again.onclick = play; MT.$('#menu', el).onclick = setup;
          // vänta lite så att en nedtryckt mellanslagstangent inte startar om spelet direkt
          again.disabled = true;
          MT.after(function () { again.disabled = false; again.focus(); }, 900);
        }
        MT.onLeave(function () { ended = true; cancelAnimationFrame(raf); });
        // vänta på typsnittet så att talen ritas rätt från början
        var fontReady = document.fonts && document.fonts.load ? document.fonts.load('700 20px Fredoka') : Promise.resolve();
        fontReady.catch(function () { }).then(function () { if (!ended) { last = performance.now(); raf = requestAnimationFrame(frame); } });
      }
      setup();
    });
  };

  /* hjälp: n olika fakta (olika svar) ur valda tabeller */
  function distinctFacts(api, n) {
    var used = {}, out = [];
    MT.shuffle(MT.pool(api.op, api.tables)).forEach(function (q) {
      if (out.length < n && !used[q.ans]) { used[q.ans] = 1; out.push(q); }
    });
    return out;
  }
  function col(q) { return MT.COLORS[q.t] || INK; }
  function onCol(q) { return MT.ON[q.t] || '#fff'; }

  /* ================= RYMDKANONEN ================= */
  MT.arcade({
    id: 'rymd', title: 'Rymdkanonen', icon: '🚀',
    intro: 'Rymdskepp med tal närmar sig. Skjut skeppet som har rätt svar på frågan. Akta dig för bläckplumparna!',
    controls: ['<kbd>←</kbd> <kbd>→</kbd> flytta kanonen', '<kbd>Mellanslag</kbd> skjut'],
    create: function (api) {
      var ships = [], shot = null, blots = [], gun = { x: W / 2, y: H - 34 }, dir = 1, speed = 30, q = null, wave = 0, inv = 0, hint = 0, blotT = 3;
      function newWave() {
        wave++; api.level = wave;
        var n = Math.min(12, 6 + wave * 2), facts = distinctFacts(api, n);
        var cols = Math.min(6, Math.ceil(facts.length / 2)), x0 = (W - cols * 104) / 2 + 12;
        ships = facts.map(function (f, i) {
          return { q: f, col: i % cols, row: Math.floor(i / cols), x: x0 + (i % cols) * 104, y: HUD + 30 + Math.floor(i / cols) * 64, w: 82, h: 44, alive: true, red: 0 };
        });
        speed = 26 + wave * 9; dir = 1; pick();
      }
      function pick() {
        var alive = ships.filter(function (s) { return s.alive; });
        if (!alive.length) { api.score += 30 * wave; api.flash('Ny våg! +' + 30 * wave, GREEN); MT.beep('win'); newWave(); return; }
        // fråga bara efter skepp med fri skottlinje (inget annat skepp under i samma kolumn)
        var free = alive.filter(function (s) { return !alive.some(function (o) { return o.col === s.col && o.row > s.row; }); });
        q = MT.pick(free).q; api.question = q.text + ' = ?'; hint = 0;
      }
      newWave();
      return {
        dbg: function () { return { ships: ships, q: q, gun: gun, shot: shot }; },
        update: function (dt, inp) {
          var mv = (inp.down.Right ? 1 : 0) - (inp.down.Left ? 1 : 0);
          if (mv) gun.x += mv * 400 * dt; else if (inp.mouseMoved > 0 && inp.mouseX != null) gun.x += Math.max(-400 * dt, Math.min(400 * dt, inp.mouseX - gun.x));
          gun.x = Math.max(30, Math.min(W - 30, gun.x));
          if ((inp.hit.Space || inp.hit.Up || inp.hit.Click) && !shot) { shot = { x: gun.x, y: gun.y - 26 }; MT.beep('shoot'); }
          inv = Math.max(0, inv - dt); hint = Math.max(0, hint - dt);
          ships.forEach(function (s) { s.red = Math.max(0, s.red - dt); });

          // skott
          if (shot) {
            shot.y -= 640 * dt;
            if (shot.y < HUD) shot = null;
            else ships.forEach(function (s) {
              if (!shot || !s.alive) return;
              if (shot.x > s.x && shot.x < s.x + s.w && shot.y > s.y && shot.y < s.y + s.h) {
                shot = null;
                if (s.q.ans === q.ans) {
                  s.alive = false; api.track(q, true); api.score += 10 * wave; MT.beep('ok');
                  api.burst(s.x + s.w / 2, s.y + s.h / 2, col(s.q), 18); api.flash('+' + 10 * wave, GREEN, s.x + s.w / 2, s.y);
                  pick();
                } else {
                  s.red = .5; api.track(q, false); hint = 2.5;
                  api.loseLife(q.text + ' = ' + q.ans);
                }
              }
            });
          }
          // flottan
          var alive = ships.filter(function (s) { return s.alive; });
          if (alive.length) {
            var minX = Math.min.apply(null, alive.map(function (s) { return s.x; })), maxX = Math.max.apply(null, alive.map(function (s) { return s.x + s.w; }));
            var dx = dir * speed * dt;
            if (maxX + dx > W - 12 || minX + dx < 12) { dir = -dir; ships.forEach(function (s) { s.y += 14; }); }
            else ships.forEach(function (s) { s.x += dx; });
            var low = Math.max.apply(null, alive.map(function (s) { return s.y + s.h; }));
            if (low > gun.y - 40) {
              ships.forEach(function (s) { s.y -= 150; });
              api.loseLife('För nära!');
            }
            // bläckplumpar
            blotT -= dt;
            if (blotT <= 0) {
              var s = MT.pick(alive); blots.push({ x: s.x + s.w / 2, y: s.y + s.h });
              blotT = Math.max(1.1, 3.4 - wave * 0.35) * (0.7 + Math.random() * 0.6);
            }
          }
          blots.forEach(function (b) {
            b.y += (130 + wave * 18) * dt;
            if (!b.dead && inv <= 0 && b.y > gun.y - 18 && b.y < gun.y + 14 && Math.abs(b.x - gun.x) < 30) {
              b.dead = true; inv = 1.5; api.burst(gun.x, gun.y, INK, 16); api.loseLife('Aj!');
            }
          });
          blots = blots.filter(function (b) { return !b.dead && b.y < H; });
        },
        draw: function (g) {
          ships.forEach(function (s) {
            if (!s.alive) return;
            var glow = hint > 0 && s.q.ans === q.ans && Math.floor(hint * 4) % 2 === 0;
            // skepp: kupol + skrov
            g.fillStyle = '#E9F2FC'; g.beginPath(); g.ellipse(s.x + s.w / 2, s.y + 12, 20, 14, 0, Math.PI, 0); g.fill();
            g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            g.fillStyle = s.red > 0 ? RED : (glow ? MARK : col(s.q));
            rr(g, s.x, s.y + 10, s.w, s.h - 12, 16); g.fill(); g.stroke();
            g.fillStyle = INK; [0.22, 0.5, 0.78].forEach(function (p) { g.beginPath(); g.arc(s.x + s.w * p, s.y + s.h - 1, 3, 0, 7); g.fill(); });
            text(g, String(s.q.ans), s.x + s.w / 2, s.y + 26, 24, s.red > 0 ? '#fff' : (glow ? INK : onCol(s.q)), 'center', 700);
          });
          blots.forEach(function (b) {
            g.fillStyle = INK; g.beginPath(); g.arc(b.x, b.y, 7, 0, 7); g.fill();
            g.beginPath(); g.moveTo(b.x - 5, b.y - 3); g.lineTo(b.x, b.y - 15); g.lineTo(b.x + 5, b.y - 3); g.fill();
          });
          if (shot) { g.fillStyle = MARK; rr(g, shot.x - 4, shot.y - 12, 8, 20, 4); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
          // kanon
          if (!(inv > 0 && Math.floor(inv * 10) % 2)) {
            g.lineWidth = 3; g.strokeStyle = INK;
            g.fillStyle = INK; rr(g, gun.x - 7, gun.y - 30, 14, 24, 5); g.fill();
            g.fillStyle = MARK; rr(g, gun.x - 30, gun.y - 10, 60, 24, 10); g.fill(); g.stroke();
          }
          g.fillStyle = INK; g.fillRect(0, H - 8, W, 8);
        }
      };
    }
  });

  /* ================= SIFFERORMEN ================= */
  MT.arcade({
    id: 'ormen', title: 'Sifferormen', icon: '🐛',
    intro: 'Styr ormen till talet som är rätt svar. Då växer den! Fel tal eller att bita sig själv kostar ett liv. Ormen kan åka genom kanterna.',
    controls: ['<kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> styr ormen'],
    create: function (api) {
      var C = 40, COLS = 20, ROWS = 12, OY = HUD + Math.floor((H - HUD - ROWS * C) / 2);
      var snake, dir, queue, stepT = 0, every = .22, grow = 0, items = [], q, right = 0, hurt = 0;
      function reset() { snake = [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }]; dir = { x: 1, y: 0 }; queue = []; }
      function free(x, y) {
        if (snake.some(function (s) { return s.x === x && s.y === y; })) return false;
        if (items.some(function (i) { return i.x === x && i.y === y; })) return false;
        var h = snake[0]; return Math.abs(h.x - x) + Math.abs(h.y - y) > 3;
      }
      function newQ() {
        q = MT.drawQs(api.op, api.tables, 1)[0]; api.question = q.text + ' = ?';
        items = [];
        MT.options(q, 4).forEach(function (v) {
          var x, y, g = 0;
          do { x = MT.rand(0, COLS - 1); y = MT.rand(0, ROWS - 1); } while (!free(x, y) && g++ < 200);
          items.push({ x: x, y: y, v: v });
        });
      }
      reset(); newQ();
      var self = { dbg: function () { return { snake: snake, items: items, q: q, setDir: function (d) { dir = d; queue = []; } }; } };
      var DIRS = { Up: { x: 0, y: -1 }, Down: { x: 0, y: 1 }, Left: { x: -1, y: 0 }, Right: { x: 1, y: 0 } };
      function step() {
        if (queue.length) dir = queue.shift();
        var h = snake[0], nx = (h.x + dir.x + COLS) % COLS, ny = (h.y + dir.y + ROWS) % ROWS;
        var body = grow > 0 ? snake : snake.slice(0, -1);
        if (body.some(function (s) { return s.x === nx && s.y === ny; })) {
          api.burst(h.x * C + C / 2, OY + h.y * C + C / 2, RED, 16);
          hurt = 1; api.loseLife('Aj, svansen!'); reset();
          items.forEach(function (it) { if (snake.some(function (s) { return s.x === it.x && s.y === it.y; })) { it.x = (it.x + 6) % COLS; } });
          return;
        }
        snake.unshift({ x: nx, y: ny });
        if (grow > 0) grow--; else snake.pop();
        var it = items.filter(function (i) { return i.x === nx && i.y === ny; })[0];
        if (it) {
          var px = nx * C + C / 2, py = OY + ny * C + C / 2;
          if (it.v === q.ans) {
            right++; grow += 2; api.track(q, true); api.score += 10 * api.level; MT.beep('ok');
            api.burst(px, py, GREEN, 16); api.flash('+' + 10 * api.level, GREEN, px, py - 20);
            if (right % 5 === 0) { api.level++; api.flash('Nivå ' + api.level + '!', INK); }
            every = Math.max(0.09, 0.22 - right * 0.006);
            newQ();
          } else {
            api.track(q, false); hurt = 1;
            api.burst(px, py, RED, 12);
            api.loseLife(q.text + ' = ' + q.ans);
            newQ();
          }
        }
      }
      return {
        dbg: self.dbg,
        update: function (dt, inp) {
          ['Up', 'Down', 'Left', 'Right'].forEach(function (k) {
            if (!inp.hit[k]) return;
            var d = DIRS[k], lastD = queue.length ? queue[queue.length - 1] : dir;
            if (d.x === -lastD.x && d.y === -lastD.y) return;
            if (d.x === lastD.x && d.y === lastD.y) return;
            if (queue.length < 2) queue.push(d);
          });
          hurt = Math.max(0, hurt - dt);
          stepT += dt;
          while (stepT >= every) { stepT -= every; step(); if (api.over) return; }
        },
        draw: function (g) {
          g.lineWidth = 2; g.strokeStyle = INK; g.strokeRect(1, OY, W - 2, ROWS * C);
          items.forEach(function (it) {
            var x = it.x * C, y = OY + it.y * C;
            g.fillStyle = '#fff'; rr(g, x + 2, y + 2, C - 4, C - 4, 9); g.fill();
            g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            text(g, String(it.v), x + C / 2, y + C / 2 + 1, it.v > 99 ? 17 : 21, INK, 'center', 700);
          });
          snake.forEach(function (s, i) {
            var x = s.x * C + C / 2, y = OY + s.y * C + C / 2, r = i === 0 ? 18 : 15 - Math.min(5, i * 0.3);
            g.fillStyle = hurt > 0 && Math.floor(hurt * 10) % 2 ? RED : (i % 2 ? '#93C030' : '#2B9A55');
            g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            if (i === 0) {
              var ex = dir.y !== 0 ? 6 : 0, ey = dir.x !== 0 ? 6 : 0;
              [[-1], [1]].forEach(function (sgn) {
                var cx = x + dir.x * 7 + ex * sgn[0], cy = y + dir.y * 7 + ey * sgn[0];
                g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
                g.fillStyle = INK; g.beginPath(); g.arc(cx + dir.x * 2, cy + dir.y * 2, 2.5, 0, 7); g.fill();
              });
            }
          });
        }
      };
    }
  });

  /* ================= TEGELKROSSEN ================= */
  MT.arcade({
    id: 'tegel', title: 'Tegelkrossen', icon: '🧱',
    intro: 'Studsa bollen mot tegelstenen som har rätt svar. Bara rätt sten går sönder. Tappa inte bollen!',
    controls: ['<kbd>←</kbd> <kbd>→</kbd> eller musen flyttar racket', '<kbd>Mellanslag</kbd> skjut iväg bollen'],
    create: function (api) {
      var pad = { x: W / 2, y: H - 30, w: 130 }, ball, bricks = [], q, qT = 0, level = 0;
      var COLS = 6, ROWS = 3, BW = 112, BH = 46, GAP = 12, X0 = (W - (COLS * BW + (COLS - 1) * GAP)) / 2, Y0 = HUD + 34;
      function stick() { ball = { x: pad.x, y: pad.y - 22, vx: 0, vy: 0, r: 10, stuck: true }; }
      function newLevel() {
        level++; api.level = level;
        bricks = MT.drawQs(api.op, api.tables, COLS * ROWS).map(function (f, i) {
          return { q: f, col: i % COLS, row: Math.floor(i / COLS), x: X0 + (i % COLS) * (BW + GAP), y: Y0 + Math.floor(i / COLS) * (BH + GAP), alive: true, shake: 0, cracks: 0 };
        });
        stick(); pick();
      }
      function pick() {
        var alive = bricks.filter(function (b) { return b.alive; });
        if (!alive.length) { api.score += 50 * level; api.flash('Bana klar! +' + 50 * level, GREEN); MT.beep('win'); newLevel(); return; }
        // fråga bara efter stenar som bollen kan nå underifrån
        var free = alive.filter(function (b) { return !alive.some(function (o) { return o.col === b.col && o.row > b.row; }); });
        q = MT.pick(free).q; api.question = q.text + ' = ?'; qT = 0;
      }
      function speed() { return 330 + level * 35; }
      newLevel();
      return {
        dbg: function () { return { bricks: bricks, q: q, ball: ball, BW: BW, BH: BH }; },
        update: function (dt, inp) {
          qT += dt;
          var mv = (inp.down.Right ? 1 : 0) - (inp.down.Left ? 1 : 0);
          if (mv) pad.x += mv * 560 * dt; else if (inp.mouseMoved > 0 && inp.mouseX != null) pad.x = inp.mouseX;
          pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
          bricks.forEach(function (b) { b.shake = Math.max(0, b.shake - dt); });
          if (ball.stuck) {
            ball.x = pad.x; ball.y = pad.y - 22;
            if (inp.hit.Space || inp.hit.Up || inp.hit.Click) {
              var a = -Math.PI / 2 + (Math.random() - .5) * .6;
              ball.vx = Math.cos(a) * speed(); ball.vy = Math.sin(a) * speed(); ball.stuck = false; MT.beep('shoot');
            }
            return;
          }
          var steps = 3;
          for (var s = 0; s < steps; s++) {
            ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
            if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < HUD + ball.r) { ball.y = HUD + ball.r; ball.vy = Math.abs(ball.vy); }
            // racket
            if (ball.vy > 0 && ball.y + ball.r >= pad.y - 8 && ball.y < pad.y + 10 && Math.abs(ball.x - pad.x) < pad.w / 2 + ball.r) {
              var off = (ball.x - pad.x) / (pad.w / 2), ang = -Math.PI / 2 + off * 1.05, sp = speed();
              ball.vx = Math.cos(ang) * sp; ball.vy = Math.sin(ang) * sp; ball.y = pad.y - 8 - ball.r;
            }
            // tegel
            for (var i = 0; i < bricks.length; i++) {
              var b = bricks[i]; if (!b.alive) continue;
              var cx = Math.max(b.x, Math.min(ball.x, b.x + BW)), cy = Math.max(b.y, Math.min(ball.y, b.y + BH));
              var dx = ball.x - cx, dy = ball.y - cy;
              if (dx * dx + dy * dy > ball.r * ball.r) continue;
              if (Math.abs(dx) > Math.abs(dy)) ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
              else ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
              if (b.q.ans === q.ans) {
                b.alive = false; api.score += 10 * level; MT.beep('ok');
                api.burst(b.x + BW / 2, b.y + BH / 2, col(b.q), 18); api.flash('+' + 10 * level, GREEN, b.x + BW / 2, b.y);
                pick();
              } else {
                // fel sten: spricker, och går sönder efter två träffar (utan poäng) så att vägen blir fri
                b.shake = .3; b.cracks++; MT.beep('boom');
                if (b.cracks >= 2) {
                  b.alive = false; api.burst(b.x + BW / 2, b.y + BH / 2, '#9AA3BD', 10);
                  if (!bricks.some(function (o) { return o.alive && o.q.ans === q.ans; })) pick();
                  else if (!bricks.some(function (o) { return o.alive; })) pick();
                }
              }
              break;
            }
          }
          if (ball.y > H + 20) { api.loseLife('Bollen försvann!'); if (!api.over) stick(); }
        },
        draw: function (g) {
          var glow = qT > 15 && Math.floor(qT * 3) % 2 === 0; // tips efter 15 sekunder
          bricks.forEach(function (b) {
            if (!b.alive) return;
            var sx = b.shake > 0 ? Math.sin(b.shake * 60) * 3 : 0, isAns = b.q.ans === q.ans;
            g.fillStyle = glow && isAns ? MARK : col(b.q);
            rr(g, b.x + sx, b.y, BW, BH, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x + sx + 8, b.y + 8); g.lineTo(b.x + sx + BW - 8, b.y + 8); g.stroke();
            if (b.cracks) { g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x + sx + 18, b.y + 4); g.lineTo(b.x + sx + 30, b.y + 20); g.lineTo(b.x + sx + 22, b.y + 30); g.lineTo(b.x + sx + 34, b.y + BH - 4); g.stroke(); }
            text(g, String(b.q.ans), b.x + sx + BW / 2, b.y + BH / 2 + 2, 24, glow && isAns ? INK : onCol(b.q), 'center', 700);
          });
          g.fillStyle = INK; rr(g, pad.x - pad.w / 2, pad.y - 8, pad.w, 16, 8); g.fill();
          g.fillStyle = MARK; rr(g, pad.x - pad.w / 2 + 6, pad.y - 4, pad.w - 12, 6, 3); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
          if (ball.stuck) text(g, 'Tryck mellanslag', W / 2, H - 70, 20, '#4B5784', 'center', 500);
        }
      };
    }
  });

  /* ================= ÖVER ÅN ================= */
  MT.arcade({
    id: 'an', title: 'Över ån', icon: '⛵',
    intro: 'Ta dig över ån genom att hoppa på båtarna. Hoppa bara på båten med rätt svar – fel båt sjunker!',
    controls: ['<kbd>↑</kbd> hoppa upp till nästa å-fil', '<kbd>←</kbd> <kbd>→</kbd> gå åt sidan'],
    create: function (api) {
      var LANES = 5, LH = 74, TOP = HUD + 56, BOT = TOP + LANES * LH; // mål: HUD..TOP, start: BOT..H
      var lanes = [], me, sinking = [], crossings = 0;
      function laneY(i) { return BOT - (i + 1) * LH; } // fil 0 är längst ner
      function build() {
        lanes = [];
        for (var i = 0; i < LANES; i++) {
          var q = MT.drawQs(api.op, api.tables, 1)[0], vals = MT.options(q, 3), BWD = 118;
          var d = i % 2 ? -1 : 1, sp = (34 + api.level * 7 + i * 5) * d, span = W + BWD + 70;
          var off = Math.random() * span;
          lanes.push({ q: q, v: sp, span: span, boats: MT.shuffle(vals).map(function (v, k) { return { x: (off + k * span / 3) % span - BWD, w: BWD, v: v }; }) });
        }
        me = { lane: -1, x: W / 2, boat: null, off: 0, hurt: 0 };
        setQ();
      }
      function setQ() { var nl = lanes[me.lane + 1]; api.question = nl ? nl.q.text + ' = ?' : 'Hoppa i land!'; }
      function myY() { return me.lane < 0 ? BOT + (H - BOT) / 2 : (me.lane >= LANES ? HUD + (TOP - HUD) / 2 : laneY(me.lane) + LH / 2); }
      function backToStart(msg) { api.loseLife(msg); me.lane = -1; me.boat = null; me.x = W / 2; me.hurt = 1; setQ(); }
      build();
      return {
        dbg: function () { return { lanes: lanes, me: me, laneY: laneY, LH: LH }; },
        update: function (dt, inp) {
          me.hurt = Math.max(0, me.hurt - dt);
          lanes.forEach(function (l) {
            l.boats.forEach(function (b) {
              b.x += l.v * dt;
              if (l.v > 0 && b.x > W + 35) b.x -= l.span;
              if (l.v < 0 && b.x + b.w < -35) b.x += l.span;
            });
          });
          sinking.forEach(function (s) { s.t -= dt; }); sinking = sinking.filter(function (s) { return s.t > 0; });
          var mv = (inp.down.Right ? 1 : 0) - (inp.down.Left ? 1 : 0);
          if (me.boat) {
            me.off = Math.max(8, Math.min(me.boat.w - 8, me.off + mv * 160 * dt));
            me.x = me.boat.x + me.off;
            if (me.x < 8 || me.x > W - 8) { backToStart('Båten åkte iväg!'); return; }
          } else me.x = Math.max(20, Math.min(W - 20, me.x + mv * 220 * dt));

          if (inp.hit.Up || inp.hit.Space) {
            var nl = me.lane + 1;
            if (nl >= LANES) { // i land!
              crossings++; api.score += 50 * api.level; MT.beep('win');
              api.burst(me.x, HUD + 30, MARK, 24); api.flash('Över ån! +' + 50 * api.level, GREEN);
              api.level++; build(); return;
            }
            var L = lanes[nl], b = L.boats.filter(function (b) { return me.x > b.x + 4 && me.x < b.x + b.w - 4; })[0];
            if (!b) { api.burst(me.x, laneY(nl) + LH / 2, '#6FB7E6', 14); backToStart('Plask! Sikta på en båt.'); return; }
            if (b.v === L.q.ans) {
              api.track(L.q, true); api.score += 10 * api.level; MT.beep('jump');
              me.lane = nl; me.boat = b; me.off = me.x - b.x; setQ();
            } else {
              api.track(L.q, false);
              sinking.push({ x: b.x, y: laneY(nl), w: b.w, v: b.v, t: 1 });
              api.loseLife(L.q.text + ' = ' + L.q.ans);
            }
          }
        },
        draw: function (g) {
          // mål och start
          g.fillStyle = '#CFE8B4'; g.fillRect(0, HUD, W, TOP - HUD); g.fillRect(0, BOT, W, H - BOT);
          for (var f = 0; f < W; f += 60) { text(g, '✿', f + 30, HUD + 18, 18, '#7FB35A'); }
          text(g, 'MÅL', W - 50, HUD + (TOP - HUD) / 2, 20, '#3F6E2A', 'center', 700);
          // vatten
          g.fillStyle = '#BFE3F7'; g.fillRect(0, TOP, W, BOT - TOP);
          g.strokeStyle = '#9FD0EE'; g.lineWidth = 2;
          for (var i = 0; i < LANES; i++) {
            var y = laneY(i);
            g.beginPath(); for (var x = 0; x <= W; x += 40) { g.moveTo(x, y + LH - 10); g.quadraticCurveTo(x + 10, y + LH - 16, x + 20, y + LH - 10); } g.stroke();
            if (i === me.lane + 1) { g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeStyle = MARK; g.strokeRect(3, y + 3, W - 6, LH - 6); g.setLineDash([]); g.strokeStyle = '#9FD0EE'; g.lineWidth = 2; }
          }
          // båtar
          lanes.forEach(function (l, li) {
            var y = laneY(li) + 12;
            l.boats.forEach(function (b) { boat(g, b.x, y, b.w, b.v, MT.COLORS[l.q.t] || INK, 1); });
          });
          sinking.forEach(function (s) { g.globalAlpha = s.t; boat(g, s.x, s.y + 12 + (1 - s.t) * 30, s.w, s.v, RED, s.t); g.globalAlpha = 1; });
          // spelaren
          var py = myY();
          if (!(me.hurt > 0 && Math.floor(me.hurt * 10) % 2)) {
            g.fillStyle = '#fff'; g.beginPath(); g.arc(me.x, py - 6, 20, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
            g.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(api.avatar, me.x, py - 5);
          }
        }
      };
      function boat(g, x, y, w, v, c, a) {
        g.fillStyle = '#B07A4A'; g.beginPath(); g.moveTo(x, y + 18); g.lineTo(x + w, y + 18); g.lineTo(x + w - 16, y + 46); g.lineTo(x + 16, y + 46); g.closePath(); g.fill();
        g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
        g.fillStyle = '#fff'; rr(g, x + w / 2 - 30, y - 4, 60, 30, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = c; g.stroke();
        text(g, String(v), x + w / 2, y + 12, 22, INK, 'center', 700);
      }
    }
  });
})();
