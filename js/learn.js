/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Lärande: knepiga tal, repetition, dagens utmaning, djurkort (belöning), knep per tabell. */
(function () {
  'use strict';

  /* ---------- datum ---------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  MT.addDays = function (day, n) { var d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  function nextSchoolDay(day) {
    var d = new Date(day + 'T12:00:00');
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
    return iso(d);
  }
  function followsDirectly(last, today) { return !!last && (MT.addDays(last, 1) === today || nextSchoolDay(last) === today); }

  /* ================= KNEPIGA TAL =================
     Varje svar sparas per uppgift: n = antal, w = fel, s = långsamma, st = rätt i rad.
     Knepig = har blivit fel eller gått långsamt, och inte klarats snabbt 3 gånger i rad sedan dess. */
  var SLOW = 8;
  MT.track = function (q, ok, secs) {
    if (!MT.profile() || !q || !q.key) return;
    var f = MT.db.facts[q.key] || (MT.db.facts[q.key] = { n: 0, w: 0, s: 0, st: 0 });
    f.n++;
    if (!ok) { f.w++; f.st = 0; }
    else if (secs != null && secs > SLOW) { f.s++; f.st = 0; }
    else f.st++;
    if (f.st >= 3) { f.w = 0; f.s = 0; }          // klarad tre gånger i rad: inte knepig längre
    f.d = MT.today();
    MT.save();
  };
  MT.status = function (key) {
    var f = MT.db.facts[key];
    if (!f) return 'new';
    return (f.w > 0 || f.s > 0) ? 'tricky' : 'good';
  };
  MT.tricky = function () {
    return Object.keys(MT.db.facts).filter(function (k) { return MT.status(k) === 'tricky'; })
      .sort(function (a, b) { var A = MT.db.facts[a], B = MT.db.facts[b]; return (B.w * 2 + B.s) - (A.w * 2 + A.s); });
  };
  MT.qFromKey = function (k) {
    var m = /^([md])(\d+)-(\d+)$/.exec(k);
    return m ? MT.makeQ(m[1] === 'd' ? 'div' : 'mul', +m[2], +m[3]) : null;
  };

  /* ================= REPETITION =================
     När tabelltestet (steg 5) är klart kommer tabellen tillbaka efter 2, 7, 21 och 60 dagar. */
  var GAPS = [2, 7, 21, 60];
  MT.startReview = function (op, t) {
    if (!MT.db.review[op + t]) { MT.db.review[op + t] = { box: 0, due: MT.addDays(MT.today(), GAPS[0]) }; MT.save(); }
  };
  MT.dueReviews = function () {
    var today = MT.today();
    return Object.keys(MT.db.review).filter(function (k) { return MT.db.review[k].due <= today; })
      .map(function (k) { return { op: k.slice(0, 3), t: +k.slice(3) }; });
  };

  /* ================= DAGENS UTMANING ================= */
  MT.dailyDone = function () { return MT.db.daily.last === MT.today(); };
  MT.streak = function () {
    var d = MT.db.daily, today = MT.today();
    return (d.last === today || followsDirectly(d.last, today)) ? d.streak : 0;
  };
  function completeDaily() {
    var d = MT.db.daily, today = MT.today();
    if (d.last === today) return false;
    d.streak = followsDirectly(d.last, today) ? d.streak + 1 : 1;
    d.best = Math.max(d.best || 0, d.streak);
    d.last = today; d.count = (d.count || 0) + 1;
    MT.save();
    return true;
  }
  function learnedTables(op) {
    return MT.range(1, 12).filter(function (t) { return MT.medals(op, t).some(Boolean); });
  }
  MT.dailyQs = function () {
    var out = [], seen = {};
    function add(q) { if (q && !seen[q.key] && out.length < 10) { seen[q.key] = 1; out.push(q); } }
    MT.tricky().slice(0, 4).forEach(function (k) { add(MT.qFromKey(k)); });
    var mul = learnedTables('mul'); if (mul.length < 2) mul = mul.concat([2, 5, 10]);
    var div = learnedTables('div');
    if (div.length) MT.drawQs('div', div, 4).slice(0, 2).forEach(add);
    MT.drawQs('mul', mul, 30).forEach(add);
    return MT.shuffle(out);
  };

  /* ================= DJURKORT (belöning) =================
     1 poäng per ny medalj, 2 för dagens utmaning och diplom. Varannan poäng ger ett nytt kort. */
  MT.CARDS = [
    ['🕷️', 'Spindeln', 'En spindel har 8 ben. 3 spindlar har 3 · 8 = 24 ben.'],
    ['🐙', 'Bläckfisken', 'En bläckfisk har 8 armar. 4 bläckfiskar har 4 · 8 = 32 armar.'],
    ['🐜', 'Myran', 'En myra har 6 ben. 5 myror har 5 · 6 = 30 ben.'],
    ['🐝', 'Biet', 'Ett bi har 5 ögon – två stora och tre små. 2 bin har 2 · 5 = 10 ögon.'],
    ['🦋', 'Fjärilen', 'En fjäril har 4 vingar. 6 fjärilar har 6 · 4 = 24 vingar.'],
    ['🐞', 'Nyckelpigan', 'En nyckelpiga har 6 ben. 7 nyckelpigor har 7 · 6 = 42 ben.'],
    ['🦀', 'Krabban', 'En krabba har 10 ben om man räknar klorna. 3 krabbor har 3 · 10 = 30 ben.'],
    ['🐕', 'Hunden', 'En hund har 4 tassar. 6 hundar har 6 · 4 = 24 tassar.'],
    ['🐴', 'Hästen', 'En häst har 4 hovar. 9 hästar har 9 · 4 = 36 hovar.'],
    ['🐻', 'Björnen', 'En björn har 5 klor på varje tass. 4 tassar har 4 · 5 = 20 klor.'],
    ['🦒', 'Giraffen', 'En giraff har 7 kotor i halsen – lika många som du! 3 giraffer har 3 · 7 = 21.'],
    ['🐌', 'Snigeln', 'En snigel har 0 ben. 9 sniglar har 9 · 0 = 0 ben!'],
    ['🐍', 'Ormen', 'En orm har inga ben alls. 12 ormar har 12 · 0 = 0 ben.'],
    ['🦄', 'Enhörningen', 'En enhörning har 1 horn. 7 enhörningar har 7 · 1 = 7 horn.'],
    ['🦏', 'Noshörningen', 'Den svarta noshörningen har 2 horn. 6 noshörningar har 6 · 2 = 12 horn.'],
    ['🐄', 'Kon', 'En ko har en mage med 4 delar. 3 kor har 3 · 4 = 12 magdelar.'],
    ['🐧', 'Pingvinen', 'En pingvin har 2 vingar men kan inte flyga. 8 pingviner har 8 · 2 = 16 vingar.'],
    ['🦆', 'Ankan', 'En anka har 2 fötter med simhud. 5 ankor har 5 · 2 = 10 fötter.'],
    ['🦂', 'Skorpionen', 'En skorpion har 8 ben. 2 skorpioner har 2 · 8 = 16 ben.'],
    ['🦗', 'Gräshoppan', 'En gräshoppa har 6 ben. 4 gräshoppor har 4 · 6 = 24 ben.'],
    ['🦖', 'T-rex', 'En T-rex hade bara 2 fingrar på varje hand. 2 händer har 2 · 2 = 4 fingrar.'],
    ['🐸', 'Grodan', 'En groda har 4 ben. 8 grodor har 8 · 4 = 32 ben.'],
    ['🦞', 'Hummern', 'En hummer har 10 ben, klorna medräknade. 4 hummrar har 4 · 10 = 40 ben.'],
    ['🐇', 'Kaninen', 'En kanin har 4 ben. 11 kaniner har 11 · 4 = 44 ben.'],
    ['🐘', 'Elefanten', 'En afrikansk elefant har 2 betar. 9 elefanter har 9 · 2 = 18 betar.'],
    ['🦉', 'Ugglan', 'En uggla har 4 tår på varje fot. 2 fötter har 2 · 4 = 8 tår.'],
    ['🐱', 'Katten', 'En katt har 5 tår på varje framtass. 2 framtassar har 2 · 5 = 10 tår.'],
    ['🐔', 'Hönan', 'En höna har 2 ben. 7 hönor har 7 · 2 = 14 ben.'],
    ['🦔', 'Igelkotten', 'En igelkott har 4 ben. 3 igelkottar har 3 · 4 = 12 ben.'],
    ['🐬', 'Delfinen', 'En delfin andas genom 1 hål på huvudet. 10 delfiner har 10 · 1 = 10 andhål.'],
    ['🦊', 'Räven', 'En räv har 4 tassar. 12 rävar har 12 · 4 = 48 tassar.'],
    ['🐿️', 'Ekorren', 'En ekorre har 4 framtänder. 6 ekorrar har 6 · 4 = 24 framtänder.']
  ];
  var CARD_BG = ['#FFE7A3', '#CDEBFF', '#D9F2D0', '#FFD9E4', '#E6DDFF', '#FFE0C7'];
  MT.cardHTML = function (i, big) {
    var c = MT.CARDS[i];
    return '<div class="acard' + (big ? ' big' : '') + '" style="--bg:' + CARD_BG[i % CARD_BG.length] + '">' +
      '<div class="acard-emoji" aria-hidden="true">' + c[0] + '</div><div class="acard-name">' + c[1] + '</div>' +
      '<p class="acard-fact">' + c[2] + '</p></div>';
  };
  MT.reward = function (pts) {
    if (!MT.profile()) return;
    var db = MT.db; db.pts = (db.pts || 0) + pts;
    var target = Math.min(MT.CARDS.length, Math.floor(db.pts / 2)), fresh = [];
    while (db.cards.length < target) {
      var locked = MT.range(0, MT.CARDS.length - 1).filter(function (i) { return db.cards.indexOf(i) < 0; });
      var pick = MT.pick(locked); db.cards.push(pick); fresh.push(pick);
    }
    MT.save();
    if (fresh.length) setTimeout(function () {
      MT.modal('<h2>Nytt djurkort!</h2>' + fresh.map(function (i) { return MT.cardHTML(i, true); }).join('') +
        '<p class="muted">Du har ' + db.cards.length + ' av ' + MT.CARDS.length + ' kort.</p>', 'Vad kul!');
    }, 700);
  };

  /* ---------- enkel dialogruta ---------- */
  var modalEl = null, lastFocus = null;
  MT.closeModal = function () {
    if (!modalEl) return;
    modalEl.remove(); modalEl = null;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  };
  MT.modal = function (html, okLabel) {
    MT.closeModal();
    lastFocus = document.activeElement;
    modalEl = document.createElement('div');
    modalEl.className = 'modal-back';
    modalEl.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Meddelande">' + html +
      '<div class="actions" style="justify-content:center"><button type="button" class="btn btn-main" data-close>' + (okLabel || 'OK') + '</button></div></div>';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', function (e) { if (e.target === modalEl || e.target.closest('[data-close]')) MT.closeModal(); });
    modalEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') MT.closeModal(); if (e.key === 'Tab') { e.preventDefault(); modalEl.querySelector('[data-close]').focus(); } });
    modalEl.querySelector('[data-close]').focus();
  };

  /* ================= KNEP PER TABELL ================= */
  MT.TRICKS = {
    1: ['Talet stannar som det är', 'Ett gånger ett tal är talet självt.', '1 · 8 = 8'],
    2: ['Dubbla!', 'Två gånger ett tal är samma sak som talet plus sig självt.', '2 · 7 = 7 + 7 = 14'],
    3: ['Dubbla och lägg till en gång till', 'Ta talet två gånger och lägg till det en gång till.', '3 · 6 = 12 + 6 = 18'],
    4: ['Dubbla två gånger', 'Dubbla talet, och dubbla svaret igen.', '4 · 6: 6 → 12 → 24'],
    5: ['Hälften av 10:ans', 'Svaret slutar alltid på 0 eller 5. Räkna 10 gånger och ta hälften.', '5 · 8 = hälften av 80 = 40'],
    6: ['5:ans plus en gång till', 'Ta 5 gånger talet och lägg till talet en gång till.', '6 · 7 = 35 + 7 = 42'],
    7: ['5, 6, 7, 8', 'De flesta i 7:ans kan du redan från andra tabeller. Säg 5, 6, 7, 8 – det blir 56 = 7 · 8. Och 7 · 7 = 49.', '7 · 8 = 56'],
    8: ['Dubbla tre gånger', 'Dubbla talet, dubbla igen och dubbla en gång till.', '8 · 6: 6 → 12 → 24 → 48'],
    9: ['Fingertricket', 'Håll upp alla tio fingrar och böj ner fingret med samma nummer. Fingrarna till vänster är tiotal, fingrarna till höger är ental. Tryck på knapparna och prova!', ''],
    10: ['Sätt dit en nolla', 'Skriv talet och sätt en nolla efter.', '10 · 6 = 60'],
    11: ['Samma siffra två gånger', 'Upp till 9 skriver du bara siffran två gånger.', '11 · 7 = 77'],
    12: ['10:ans plus 2:ans', 'Räkna 10 gånger och 2 gånger, och lägg ihop.', '12 · 7 = 70 + 14 = 84']
  };
  MT.trickHTML = function (op, t) {
    var tr = MT.TRICKS[t], body;
    if (op === 'div') {
      var f = 7, p = f * t;
      body = '<h3>Dela är gånger baklänges</h3><p>Fråga dig: <b>vilket tal gånger ' + t + ' blir svaret?</b></p>' +
        '<p class="trick-ex">' + p + ' / ' + t + ' = ? &nbsp;→&nbsp; ? · ' + t + ' = ' + p + ' &nbsp;→&nbsp; ' + f + '</p>' +
        '<p class="muted">Kan du ' + t + ':ans tabell, kan du också dela med ' + t + '.</p>';
    } else {
      body = '<h3>' + tr[0] + '</h3><p>' + tr[1] + '</p>' + (tr[2] ? '<p class="trick-ex">' + tr[2] + '</p>' : '') +
        (t === 9 ? '<div class="fingers" id="fingers"></div>' : '') +
        (t > 2 ? '<p class="muted small">Glöm inte: 3 · ' + t + ' är samma som ' + t + ' · 3. Du kan redan många av dem!</p>' : '');
    }
    return body;
  };
  MT.fingerWidget = function (box) {
    if (!box) return;
    function draw(n) {
      box.innerHTML = '<div class="hands" aria-hidden="true">' + MT.range(1, 10).map(function (i) {
        return '<span class="finger' + (i === n ? ' down' : (i < n ? ' tens' : ' ones')) + (i === 6 ? ' gap' : '') + '"></span>';
      }).join('') + '</div>' +
        '<p class="trick-ex">9 · ' + n + ' = <span class="t">' + (n - 1) + '</span><span class="o">' + (10 - n) + '</span> &nbsp;<span class="small muted">(' + (n - 1) + ' tiotal och ' + (10 - n) + ' ental)</span></p>' +
        '<div class="chips">' + MT.range(1, 10).map(function (i) { return '<button type="button" class="chip" data-n="' + i + '" aria-pressed="' + (i === n) + '">9 · ' + i + '</button>'; }).join('') + '</div>';
    }
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) draw(+b.dataset.n); });
    draw(4);
  };

  /* ================= SIDOR ================= */

  // Testa-navet
  MT.route(/^\/testa$/, function (el) {
    el.innerHTML = '<h1>Testa <span class="mark">dig själv</span></h1>' +
      '<div class="big-links">' +
      MT.bigLink('#/snabbtest', '10s', 'Snabbtest', 'Välj tabeller. Du har 10 sekunder på varje fråga.') +
      MT.bigLink('#/100', '100', '100 sekunder', 'Hur många hinner du på 100 sekunder?') +
      MT.bigLink('#/diplom', '★', 'Tabelldiplom', 'Alla rätt ger ett diplom att skriva ut.') +
      '</div>';
  });

  // Knepiga tal
  MT.route(/^\/knepiga$/, function (el) {
    function intro() {
      var keys = MT.tricky();
      el.innerHTML = '<a class="back" href="#/">← Hem</a><h1>Mina <span class="mark">knepiga</span></h1>' +
        (keys.length
          ? '<p>Det här är tal som du har svarat fel på eller tänkt länge på. Svara rätt och snabbt 3 gånger i rad, så försvinner de från listan.</p>' +
            '<div class="card"><div class="tricky-list">' + keys.map(function (k) {
              var q = MT.qFromKey(k); return '<span class="tricky-chip" style="' + MT.style(q.t) + '">' + q.text + '</span>';
            }).join('') + '</div><div class="actions"><button type="button" class="btn btn-main" id="go">Öva på dem nu</button></div></div>'
          : '<div class="card stack center"><div style="font-size:3rem" aria-hidden="true">🎉</div><h2>Inga knepiga just nu!</h2>' +
            '<p>När du svarar fel eller tänker länge på ett tal hamnar det här, så att du kan öva extra på det.</p>' +
            '<a class="btn btn-main" href="#/">Till tabellerna</a></div>');
      var go = MT.$('#go', el); if (go) go.onclick = function () { run(keys); };
    }
    function run(keys) {
      var list = [];
      for (var round = 0; round < 3 && list.length < 15; round++) {
        MT.shuffle(keys).forEach(function (k) { if (list.length < 15) list.push(MT.qFromKey(k)); });
      }
      // undvik samma fråga två gånger i rad
      for (var i = 1; i < list.length; i++) if (list[i].key === list[i - 1].key && i + 1 < list.length) { var x = list[i]; list[i] = list[i + 1]; list[i + 1] = x; }
      el.innerHTML = '<a class="back" href="#/knepiga">← Avbryt</a><div class="card" style="--c:var(--ink)"><div id="q"></div></div>';
      MT.quiz(MT.$('#q', el), {
        questions: list, revealWrong: true,
        onDone: function (res) {
          var before = keys.length, after = MT.tricky().length, right = res.filter(function (r) { return r.ok; }).length;
          el.innerHTML = '<div class="card stack center"><h2>Bra övat!</h2>' +
            '<div class="result-big" style="--c:var(--ink)">' + right + ' / ' + res.length + '</div><p>rätt</p>' +
            (after < before ? '<p class="msg msg-ok">' + (before - after) + ' tal är inte knepiga längre!</p>' : '') +
            (after ? '<p>Du har ' + after + ' knepiga kvar.</p>' : '<p class="msg msg-ok">Alla knepiga är borta! 🎉</p>') +
            '<div class="actions" style="justify-content:center">' + (after ? '<button type="button" class="btn btn-main" id="again">Öva igen</button>' : '') +
            '<a class="btn" href="#/">Hem</a></div></div>';
          var a = MT.$('#again', el); if (a) a.onclick = function () { run(MT.tricky()); };
        }
      });
    }
    intro();
  });

  // Dagens utmaning
  MT.route(/^\/dagens$/, function (el) {
    function intro() {
      var done = MT.dailyDone(), s = MT.streak();
      el.innerHTML = '<a class="back" href="#/">← Hem</a><h1>Dagens <span class="mark">utmaning</span></h1>' +
        '<div class="card stack center">' +
        (done
          ? '<div style="font-size:3rem" aria-hidden="true">🔥</div><h2>Klart för idag!</h2><p>Du har gjort dagens utmaning <b>' + s + (s === 1 ? ' dag' : ' dagar') + ' i rad</b>. Kom tillbaka i morgon!</p>' +
            '<div class="actions" style="justify-content:center"><button type="button" class="btn" id="go">Kör en gång till</button><a class="btn btn-main" href="#/">Hem</a></div>'
          : '<p>10 frågor, ingen tid som tickar. Några är dina knepiga tal.</p>' +
            (s ? '<p>🔥 Du har klarat <b>' + s + (s === 1 ? ' dag' : ' dagar') + ' i rad</b>. Fortsätt så!</p>' : '<p>Gör utmaningen varje skoldag och se hur många dagar i rad du klarar!</p>') +
            '<div><button type="button" class="btn btn-main" id="go">Starta</button></div>') +
        '</div>';
      MT.$('#go', el).onclick = run;
    }
    function run() {
      el.innerHTML = '<a class="back" href="#/dagens">← Avbryt</a><div class="card" style="--c:var(--ink)"><div id="q"></div></div>';
      MT.quiz(MT.$('#q', el), {
        questions: MT.dailyQs(), revealWrong: true,
        onDone: function (res) {
          var first = completeDaily(), s = MT.streak(), right = res.filter(function (r) { return r.ok; }).length;
          el.innerHTML = '<div class="card stack center"><h2>Dagens utmaning klar!</h2>' +
            '<div class="result-big" style="--c:var(--ink)">' + right + ' / ' + res.length + '</div><p>rätt</p>' +
            '<p style="font-size:1.3rem">🔥 <b>' + s + (s === 1 ? ' dag' : ' dagar') + ' i rad</b></p>' +
            MT.mistakesHTML(res) +
            '<div class="actions" style="justify-content:center"><a class="btn btn-main" href="#/">Hem</a></div></div>';
          if (first) MT.reward(2);
        }
      });
    }
    intro();
  });

  // Repetition av en tabell
  MT.route(/^\/repetera\/(mul|div)\/(\d{1,2})$/, function (el, op, ts) {
    var t = +ts;
    if (t < 1 || t > 12) { MT.go('/'); return; }
    el.innerHTML = '<a class="back" href="#/">← Hem</a><div class="card stack" style="' + MT.style(t) + '">' +
      '<h1>Repetera ' + MT.tableName(op, t).replace('Dela med', 'att dela med') + '</h1>' +
      '<p>Kommer du fortfarande ihåg den? 10 frågor, ingen tid. Klarar du 9 rätt kommer tabellen tillbaka om ett tag igen.</p>' +
      '<div><button type="button" class="btn btn-color" id="go">Starta</button></div></div>';
    MT.$('#go', el).onclick = function () {
      el.innerHTML = '<a class="back" href="#/">← Avbryt</a><div class="card" style="' + MT.style(t) + '"><div id="q"></div></div>';
      MT.quiz(MT.$('#q', el), {
        questions: MT.drawQs(op, [t], 10), revealWrong: true,
        onDone: function (res) {
          var right = res.filter(function (r) { return r.ok; }).length, ok = right >= 9;
          var r = MT.db.review[op + t] || { box: 0 };
          if (ok) { r.box = Math.min(r.box + 1, GAPS.length - 1); r.due = MT.addDays(MT.today(), GAPS[r.box]); }
          else { r.box = 0; r.due = MT.addDays(MT.today(), 1); }
          MT.db.review[op + t] = r; MT.save();
          el.innerHTML = '<div class="card stack center" style="' + MT.style(t) + '"><div class="result-big">' + right + ' / 10</div>' +
            (ok ? '<p class="msg msg-ok">Du kommer ihåg ' + MT.tableName(op, t) + '! Vi repeterar igen om ' + GAPS[r.box] + ' dagar.</p>'
                : '<p class="msg msg-info">Lite rostigt. Öva steg 3 en gång till, så kommer tabellen tillbaka i morgon.</p>') +
            MT.mistakesHTML(res) +
            '<div class="actions" style="justify-content:center">' + (ok ? '' : '<a class="btn btn-color" href="#/ova/' + op + '/' + t + '">Öva ' + MT.tableName(op, t) + '</a>') +
            '<a class="btn" href="#/">Hem</a></div></div>';
          if (ok) MT.reward(1);
        }
      });
    };
  });

  // Djurkort
  MT.route(/^\/djurkort$/, function (el) {
    var have = MT.db.cards;
    var need = 2 - ((MT.db.pts || 0) % 2);
    el.innerHTML = '<a class="back" href="#/pokaler">← Troféskåp</a><h1>Mina <span class="mark">djurkort</span></h1>' +
      '<p>Du har <b>' + have.length + ' av ' + MT.CARDS.length + '</b> kort. ' +
      (have.length < MT.CARDS.length ? 'Du får nya kort när du tar medaljer, gör dagens utmaning och tar diplom.' + (need === 1 ? ' <b>Bara en medalj kvar till nästa kort!</b>' : '') : 'Du har samlat alla! 🎉') + '</p>' +
      '<div class="cards">' + MT.range(0, MT.CARDS.length - 1).map(function (i) {
        return have.indexOf(i) >= 0 ? MT.cardHTML(i) : '<div class="acard locked" aria-label="Låst kort"><div class="acard-emoji" aria-hidden="true">?</div><div class="acard-name">Låst</div></div>';
      }).join('') + '</div>';
  });

  MT.bigLink = function (href, icon, title, text) {
    return '<a class="big-link" href="' + href + '"><span class="icon" aria-hidden="true">' + icon + '</span>' +
      '<span><h3>' + title + '</h3><p>' + text + '</p></span></a>';
  };
})();
