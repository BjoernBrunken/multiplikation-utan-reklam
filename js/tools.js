/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Tabellen (diagram), Kalkylblad (arbetsblad) och Troféskåp */
(function () {
  'use strict';

  /* ================= TABELLEN ================= */
  MT.route(/^\/tabellen$/, function (el) {
    var N = 12, hide = false;
    var head = '<tr><th scope="col" aria-label="gånger">·</th>' + MT.range(1, N).map(function (c) { return '<th scope="col" data-hc="' + c + '">' + c + '</th>'; }).join('') + '</tr>';
    var body = MT.range(1, N).map(function (r) {
      return '<tr><th scope="row" data-hr="' + r + '">' + r + '</th>' + MT.range(1, N).map(function (c) {
        return '<td data-r="' + r + '" data-c="' + c + '"' + (r === c ? ' class="sq"' : '') + ' style="--tc:' + MT.COLORS[c] + ';--tcon:' + MT.ON[c] + '">' +
          '<button type="button" aria-label="' + r + ' · ' + c + ' = ' + r * c + '"><span>' + r * c + '</span></button></td>';
      }).join('') + '</tr>';
    }).join('');
    el.innerHTML =
      '<h1><span class="mark">Multiplikationstabellen</span></h1>' +
      '<p class="muted no-print">Peka eller tryck på en ruta. Då ser du talet som en rektangel av prickar. Rutorna på diagonalen (1, 4, 9 …) är kvadrattal.</p>' +
      '<div class="row no-print" style="margin-bottom:16px"><div id="mode"></div>' +
      '<button type="button" class="btn btn-small" id="hide" aria-pressed="false">Göm svaren</button>' +
      '<button type="button" class="btn btn-small" id="pr">Skriv ut tabellen</button></div>' +
      '<div class="chart-layout"><div class="chart-wrap"><table class="chart" id="chart"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<aside class="card chart-side" id="side" aria-live="polite"><p class="muted">Välj en ruta i tabellen.</p></aside></div>' +
      '<div id="legend" class="no-print"></div>';
    var chart = MT.$('#chart', el), side = MT.$('#side', el), cells = MT.$$('td', chart);

    function select(r, c) {
      cells.forEach(function (td) {
        var tr = +td.dataset.r, tc = +td.dataset.c;
        td.classList.toggle('area', !mastery && tr <= r && tc <= c);
        td.classList.toggle('hit', tr === r && tc === c);
      });
      MT.$$('[data-hr]', chart).forEach(function (th) { th.classList.toggle('axis', +th.dataset.hr === r); });
      MT.$$('[data-hc]', chart).forEach(function (th) { th.classList.toggle('axis', +th.dataset.hc === c); });
      side.innerHTML = '<div class="eqbig">' + r + ' · ' + c + ' = ' + (r * c) + '</div>' +
        MT.dots(r, c, MT.COLORS[c], 14) +
        '<p>' + r + (r === 1 ? ' rad' : ' rader') + ' med ' + c + ' prickar i varje = <b>' + (r * c) + '</b> prickar.</p>' +
        (r !== c ? '<p class="muted small">Vrid rektangeln så får du ' + c + ' · ' + r + ' = ' + (r * c) + '.</p>' : '<p class="muted small">Lika många rader som kolumner – ett kvadrattal.</p>') +
        (mastery ? '<p class="mstat ' + cellStatus(r, c) + '">' + STATUS_TEXT[cellStatus(r, c)] + '</p>' : '') +
        '<p class="small"><a href="#/ova/mul/' + c + '">Öva ' + c + ':ans tabell →</a></p>';
    }
    // vad kan jag? grön = kan, orange = knepig, grå = inte övat än
    var mastery = false;
    var STATUS_TEXT = { good: 'Det här kan du!', tricky: 'Knepigt – öva lite extra.', 'new': 'Inte övat än.' };
    function cellStatus(r, c) {
      var a = MT.status('m' + c + '-' + r), b = MT.status('m' + r + '-' + c);
      if (a === 'tricky' || b === 'tricky') return 'tricky';
      if (a === 'good' || b === 'good') return 'good';
      return 'new';
    }
    function paint() {
      var n = { good: 0, tricky: 0, 'new': 0 };
      cells.forEach(function (td) {
        var st = cellStatus(+td.dataset.r, +td.dataset.c);
        td.classList.remove('m-good', 'm-tricky', 'm-new');
        if (mastery) { td.classList.add('m-' + st); n[st]++; }
      });
      chart.classList.toggle('mastery', mastery);
      MT.$('#legend', el).innerHTML = mastery
        ? '<div class="legend"><span><i class="m-good"></i>Kan (' + n.good + ')</span><span><i class="m-tricky"></i>Knepiga (' + n.tricky + ')</span><span><i class="m-new"></i>Inte övat än (' + n['new'] + ')</span>' +
          (n.tricky ? '<a class="btn btn-small btn-main" href="#/knepiga">Öva mina knepiga</a>' : '') + '</div>' +
          '<p class="muted small">Du kan ' + n.good + ' av 144 rutor. Rutorna fylls i när du övar.</p>'
        : '';
    }
    MT.seg(MT.$('#mode', el), [['all', 'Hela tabellen'], ['me', 'Vad kan jag?']], 'all', function (v) {
      mastery = v === 'me'; cells.forEach(function (td) { td.classList.remove('area', 'hit'); }); paint();
    });
    function fromEvent(e) {
      var td = e.target.closest('td'); if (td) select(+td.dataset.r, +td.dataset.c);
    }
    chart.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse') fromEvent(e); });
    chart.addEventListener('click', fromEvent);
    chart.addEventListener('focusin', fromEvent);
    MT.$('#hide', el).onclick = function () {
      hide = !hide; chart.classList.toggle('hide', hide);
      this.setAttribute('aria-pressed', hide); this.textContent = hide ? 'Visa svaren' : 'Göm svaren';
    };
    MT.$('#pr', el).onclick = function () { window.print(); };
  });

  /* ================= KALKYLBLAD ================= */
  MT.route(/^\/kalkylblad$/, function (el) {
    var st = { tables: new Set([2, 3, 4, 5]), op: 'mul', type: 'plain', from: 1, to: 10, n: 40, key: true };
    el.innerHTML =
      '<div class="no-print"><h1>Kalkyl<span class="mark">blad</span></h1>' +
      '<p class="muted">Välj vad bladet ska innehålla och tryck på Skapa blad. Varje gång blir uppgifterna i ny ordning.</p>' +
      '<div class="card"><div class="ws-form">' +
      '<div><h3>Tabeller</h3><div id="tb"></div></div>' +
      '<div><h3>Räknesätt</h3><div id="op"></div></div>' +
      '<div><h3>Typ av uppgift</h3><div id="ty"></div><p class="small muted" id="tyhelp"></p></div>' +
      '<div><h3>Tal att räkna med</h3><div class="ws-range"><label>från <select id="from"></select></label><label>till <select id="to"></select></label></div></div>' +
      '<div><h3>Antal uppgifter</h3><div id="n"></div></div>' +
      '<div><h3>Facit</h3><label class="check"><input type="checkbox" id="key" checked> Lägg till facit på en egen sida</label></div>' +
      '</div><div class="actions"><button type="button" class="btn btn-main" id="gen">Skapa blad</button>' +
      '<button type="button" class="btn" id="pr">Skriv ut</button><span class="muted small" id="warn" style="align-self:center"></span></div></div></div>' +
      '<div id="out"></div>';

    var HELP = {
      plain: 'Vanliga uppgifter: 4 · 7 = ___',
      missing: 'Saknat tal: 4 · ___ = 28',
      lines: 'Dra streck mellan fråga och svar (8 par per ruta).'
    };
    MT.tableChips(MT.$('#tb', el), st.tables, gen);
    MT.seg(MT.$('#op', el), [['mul', 'Gånger ·'], ['div', 'Delat /'], ['mix', 'Blandat']], st.op, function (v) { st.op = v; gen(); });
    MT.seg(MT.$('#ty', el), [['plain', 'Vanliga'], ['missing', 'Saknat tal'], ['lines', 'Dra streck']], st.type, function (v) { st.type = v; gen(); });
    MT.seg(MT.$('#n', el), [[20, '20'], [40, '40'], [60, '60'], [80, '80'], [100, '100']], st.n, function (v) { st.n = v; gen(); });
    var opts = MT.range(0, 12).map(function (i) { return '<option value="' + i + '">' + i + '</option>'; }).join('');
    MT.$('#from', el).innerHTML = opts; MT.$('#to', el).innerHTML = opts;
    MT.$('#from', el).value = st.from; MT.$('#to', el).value = st.to;
    MT.$('#from', el).onchange = function () { st.from = +this.value; gen(); };
    MT.$('#to', el).onchange = function () { st.to = +this.value; gen(); };
    MT.$('#key', el).onchange = function () { st.key = this.checked; gen(); };
    MT.$('#gen', el).onclick = gen;
    MT.$('#pr', el).onclick = function () { window.print(); };

    function gen() {
      MT.$('#tyhelp', el).textContent = HELP[st.type];
      var tables = Array.from(st.tables).sort(function (a, b) { return a - b; });
      var lo = Math.min(st.from, st.to), hi = Math.max(st.from, st.to);
      var warn = MT.$('#warn', el), out = MT.$('#out', el);
      if (!tables.length) { warn.textContent = 'Välj minst en tabell.'; out.innerHTML = ''; return; }
      warn.textContent = '';
      var opName = { mul: 'Multiplikation', div: 'Division', mix: 'Multiplikation och division' }[st.op];
      var title = opName + ' – ' + (tables.length === 12 ? 'alla tabeller' : (tables.length === 1 ? tables[0] + ':ans tabell' : 'tabell ' + tables.join(', ')));
      var body, keyBody;
      if (st.type === 'lines') {
        var blocks = Math.max(1, Math.min(6, Math.round(st.n / 16)));
        var data = [];
        for (var b = 0; b < blocks; b++) data.push(lineBlock(tables, lo, hi));
        body = data.map(function (d) { return linesHTML(d, false); }).join('');
        keyBody = data.map(function (d) { return linesHTML(d, true); }).join('');
      } else {
        var qs = MT.drawQs(st.op, tables, st.n, lo, hi).map(st.type === 'missing' ? missing : plain);
        body = gridHTML(qs, false); keyBody = gridHTML(qs, true);
      }
      out.innerHTML = sheet(title, body, false) + (st.key ? sheet(title + ' – facit', keyBody, true) : '');
    }
    function plain(q) { return { pre: q.text + ' = ', blank: q.ans, post: '' }; }
    function missing(q) {
      var first = Math.random() < 0.5;
      if (q.op === 'mul') return first ? { pre: '', blank: q.f, post: ' · ' + q.t + ' = ' + q.ans } : { pre: q.f + ' · ', blank: q.t, post: ' = ' + q.ans };
      var p = q.f * q.t;
      return first ? { pre: '', blank: p, post: ' / ' + q.t + ' = ' + q.f } : { pre: p + ' / ', blank: q.t, post: ' = ' + q.f };
    }
    function gridHTML(items, key) {
      return '<div class="sheet-grid' + (st.op === 'mix' || st.type === 'missing' ? ' cols3' : '') + '">' + items.map(function (it, i) {
        return '<div class="sheet-item' + (key ? ' key' : '') + '"><span class="n">' + (i + 1) + '.</span>' + it.pre +
          '<span class="blank">' + (key ? it.blank : '&nbsp;') + '</span>' + it.post + '</div>';
      }).join('') + '</div>';
    }
    // 8 frågor med olika svar
    function lineBlock(tables, lo, hi) {
      var pool = MT.shuffle(MT.pool(st.op, tables, lo, hi)), used = {}, qs = [];
      pool.forEach(function (q) { if (qs.length < 8 && !used[q.ans]) { used[q.ans] = 1; qs.push(q); } });
      return { qs: qs, as: MT.shuffle(qs) };
    }
    function linesHTML(d, key) {
      return '<div class="lines"><div class="lines-col l">' + d.qs.map(function (q) {
        return '<div>' + q.text + (key ? ' = <b>' + q.ans + '</b>' : '') + '</div>';
      }).join('') + '</div><div></div><div class="lines-col r">' + d.as.map(function (q) { return '<div>' + q.ans + '</div>'; }).join('') + '</div></div>';
    }
    function sheet(title, inner, key) {
      return '<div class="sheet' + (key ? ' page-break' : '') + '">' +
        '<div class="sheet-head"><h2>' + title + '</h2>' +
        (key ? '' : '<div class="sheet-name"><div>Namn: <span></span></div><div>Datum: <span style="min-width:110px"></span></div></div>') + '</div>' +
        (st.type === 'lines' && !key ? '<p class="sheet-sub">Dra ett streck från varje fråga till rätt svar.</p>' : '') +
        (st.type === 'missing' && !key ? '<p class="sheet-sub">Skriv talet som fattas.</p>' : '') +
        inner + '<div class="sheet-foot">Tabellträning</div></div>';
    }
    gen();
  });

  /* ================= TROFÉSKÅP ================= */
  MT.route(/^\/pokaler$/, function (el) {
    var op = MT.db.op === 'div' ? 'div' : 'mul';
    function draw() {
      var total = 0;
      ['mul', 'div'].forEach(function (o) { MT.range(1, 12).forEach(function (t) { total += MT.medals(o, t).filter(Boolean).length; }); });
      var runs = MT.db.hundred.runs, best100 = runs.reduce(function (m, r) { return Math.max(m, r.score); }, 0);
      var g = MT.db.games || {};
      el.innerHTML =
        '<div class="row between"><h1 style="margin:0">Trofé<span class="mark">skåp</span></h1>' +
        '<button type="button" class="btn btn-small no-print" id="pr">Skriv ut</button></div>' +
        '<p class="muted">' + MT.profile().avatar + ' ' + MT.esc(MT.profile().name) + (MT.streak() ? ' · 🔥 ' + MT.streak() + ' dagar i rad' : '') + '</p>' +
        '<div class="stats" style="justify-content:flex-start">' +
        '<div class="stat"><b>' + total + ' / 120</b><span>medaljer</span></div>' +
        '<div class="stat"><b>' + MT.db.cards.length + ' / ' + MT.CARDS.length + '</b><span>djurkort</span></div>' +
        '<div class="stat"><b>' + (MT.db.diplomas.small ? '✓' : '–') + '</b><span>litet diplom</span></div>' +
        '<div class="stat"><b>' + (MT.db.diplomas.large ? '✓' : '–') + '</b><span>stort diplom</span></div>' +
        '<div class="stat"><b>' + best100 + '</b><span>rekord 100 sek</span></div>' +
        (g.regn ? '<div class="stat"><b>' + g.regn + '</b><span>rekord Tabellregn</span></div>' : '') +
        '</div>' +

        '<a class="big-link" href="#/djurkort" style="margin-top:8px"><span class="icon" aria-hidden="true">' + (MT.db.cards.length ? MT.CARDS[MT.db.cards[MT.db.cards.length - 1]][0] : '❔') + '</span>' +
        '<span><h3>Djurkort</h3><p>Du har ' + MT.db.cards.length + ' av ' + MT.CARDS.length + ' kort. Titta på dem!</p></span></a>' +
        '<div class="section-title"><h2>Medaljer</h2><div id="op" class="no-print"></div></div>' +
        '<div class="shelf">' +
        '<div class="shelf-row shelf-head"><span></span><span>Läs & skriv</span><span>Para ihop</span><span>Blandat</span><span>Flerval</span><span>Tabelltest</span></div>' +
        MT.range(1, 12).map(function (t) {
          var m = MT.medals(op, t);
          return '<div class="shelf-row" style="' + MT.style(t) + '"><a href="#/ova/' + op + '/' + t + '"><span class="sw"></span>' + (op === 'div' ? '/ ' : '') + t + (op === 'div' ? '' : ':ans') + '</a>' +
            m.map(function (x, i) { return MT.medalIcon(x, i === 4 ? '★' : i + 1); }).join('') + '</div>';
        }).join('') + '</div>' +

        '<div class="section-title"><h2>Diplom</h2></div><div class="big-links" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' +
        dipCard('small', 'Litet tabelldiplom') + dipCard('large', 'Stort tabelldiplom') + '</div>' +

        '<div class="section-title"><h2>Snabbtest</h2></div>' +
        (MT.db.speed.length
          ? '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Tabeller</th><th>Rätt</th><th>Poäng</th></tr></thead><tbody>' +
            MT.db.speed.slice(0, 8).map(function (x) {
              return '<tr><td>' + x.date + '</td><td>' + (x.op === 'div' ? '/ ' : '· ') + x.tables.join(', ') + '</td><td>' + x.right + ' / ' + x.n + '</td><td><b>' + x.score + '</b></td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="muted">Inga snabbtest än. <a href="#/snabbtest">Gör ett snabbtest</a></p>') +

        '<div class="section-title no-print"><h2>Börja om</h2></div>' +
        '<div class="no-print" id="reset"><p class="muted">Tar bort alla dina medaljer, djurkort, diplom och rekord. Andra elever påverkas inte.</p>' +
        '<button type="button" class="btn btn-small" id="clear">Nollställ allt</button></div>';

      MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; draw(); });
      MT.$('#pr', el).onclick = function () { window.print(); };
      MT.$$('[data-cert]', el).forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.cert, d = MT.db.diplomas[k];
          MT.printHTML(MT.certificate({
            title: k === 'small' ? 'Litet tabelldiplom' : 'Stort tabelldiplom', name: d.name, date: d.date,
            text: 'har svarat rätt på alla frågor ur multiplikationstabellen ' + (k === 'small' ? '(1–5 och 10).' : '(1–12).')
          }));
        };
      });
      MT.$('#clear', el).onclick = function () {
        MT.$('#reset', el).innerHTML = '<div class="confirm"><b>Är du säker? Allt raderas.</b>' +
          '<button type="button" class="btn btn-small" id="yes" style="background:var(--red);color:#fff">Ja, radera allt</button>' +
          '<button type="button" class="btn btn-small" id="no">Avbryt</button></div>';
        MT.$('#yes', el).onclick = function () { MT.resetAll(); draw(); };
        MT.$('#no', el).onclick = draw;
      };
    }
    function dipCard(k, name) {
      var d = MT.db.diplomas[k];
      return '<div class="big-link"><span class="icon" aria-hidden="true">' + (d ? '★' : '☆') + '</span><span><h3>' + name + '</h3>' +
        (d ? '<p>Klart ' + d.date + (d.name ? ' av ' + MT.esc(d.name) : '') + '</p><p class="no-print"><button type="button" class="linkbtn" data-cert="' + k + '">Skriv ut diplomet igen</button></p>'
           : '<p>Inte klart än. <a href="#/diplom">Ta diplomet</a></p>') + '</span></div>';
    }
    draw();
  });
})();
