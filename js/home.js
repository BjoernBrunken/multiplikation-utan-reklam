/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Startsida och "Om sidan" */
(function () {
  'use strict';

  MT.route(/^\/$/, function (el) {
    var op = MT.db.op === 'div' ? 'div' : 'mul';
    var p = MT.profile();
    el.innerHTML =
      '<h1 class="hello">Hej ' + MT.esc(p.name) + '! <span aria-hidden="true">' + p.avatar + '</span></h1>' +
      '<section class="plan" aria-label="Dagens plan">' + planHTML() + '</section>' +

      '<section class="hero">' +
      '  <div class="hero-head">' +
      '    <div><h2 class="h1like">Vilken <span class="mark">tabell</span> vill du öva på?</h2>' +
      '    <p>Varje tabell har fem steg. Klarar du ett steg får du en medalj.</p></div>' +
      '    <div id="op"></div>' +
      '  </div>' +
      '  <div class="tiles" id="tiles"></div>' +
      '</section>' +

      '<div class="section-title"><h2>Mer att göra</h2></div>' +
      '<div class="big-links four">' +
      MT.bigLink('#/testa', '10s', 'Testa dig själv', 'Snabbtest, 100 sekunder och diplom.') +
      MT.bigLink('#/spel', '♟', 'Spel', 'Memory, Tabellregn och Duell för två.') +
      MT.bigLink('#/tabellen', '12', 'Tabellen', 'Se hela tabellen och vad du redan kan.') +
      MT.bigLink('#/djurkort', '🦒', 'Djurkort', 'Samla alla ' + MT.CARDS.length + ' djurkort!') +
      '</div>' +

      '<aside class="tip"><p><b>Tips:</b> Börja med 1, 2, 5 och 10. Ta sedan 3 och 4, och sist 6, 7, 8 och 9. ' +
      'Kan du 3 · 7 kan du också 7 · 3 – det är samma antal prickar, bara vridet.</p></aside>';

    function drawTiles() {
      MT.$('#tiles', el).innerHTML = MT.range(1, 12).map(function (t) {
        var m = MT.medals(op, t), n = m.filter(Boolean).length;
        return '<a class="tile" href="#/ova/' + op + '/' + t + '" style="' + MT.style(t) + '" aria-label="' + MT.tableName(op, t) + ', ' + n + ' av 5 medaljer">' +
          '<span class="tile-dots" aria-hidden="true">' + MT.dots(3, Math.min(t, 6), MT.ON[t], 10) + '</span>' +
          '<span class="tile-num"><span class="tile-op" aria-hidden="true">' + (op === 'div' ? '/' : '·') + '</span>' + t + '</span>' +
          '<span><span class="tile-name">' + (op === 'div' ? 'Dela med ' + t : t + ':ans<span class="hide-sm"> tabell</span>') + '</span>' +
          '<span class="tile-medals" aria-hidden="true">' + m.map(function (x) { return '<i class="' + (x ? 'on' : '') + '"></i>'; }).join('') + '</span></span>' +
          (n === 5 ? '<span class="tile-done" aria-hidden="true">★</span>' : '') + '</a>';
      }).join('');
    }
    MT.seg(MT.$('#op', el), MT.OPS, op, function (v) { op = v; MT.db.op = v; MT.save(); drawTiles(); });
    drawTiles();
  });

  function planHTML() {
    var s = MT.streak(), done = MT.dailyDone(), tricky = MT.tricky().length, due = MT.dueReviews(), cards = MT.db.cards.length;
    var out = '';
    out += '<a class="plan-card' + (done ? ' done' : ' go') + '" href="#/dagens">' +
      '<span class="plan-icon" aria-hidden="true">' + (done ? '✓' : '🎯') + '</span>' +
      '<span><b>Dagens utmaning</b><span>' + (done ? 'Klar för idag!' : '10 frågor – börja här!') + '</span>' +
      (s ? '<span class="streak">🔥 ' + s + (s === 1 ? ' dag' : ' dagar') + ' i rad</span>' : '') + '</span></a>';
    due.slice(0, 2).forEach(function (r) {
      out += '<a class="plan-card go" href="#/repetera/' + r.op + '/' + r.t + '" style="' + MT.style(r.t) + '">' +
        '<span class="plan-icon tcol" aria-hidden="true">' + r.t + '</span>' +
        '<span><b>Dags att repetera</b><span>' + MT.tableName(r.op, r.t) + ' – minns du den?</span></span></a>';
    });
    out += '<a class="plan-card' + (tricky ? '' : ' done') + '" href="#/knepiga">' +
      '<span class="plan-icon" aria-hidden="true">' + (tricky ? '🧩' : '🎉') + '</span>' +
      '<span><b>Mina knepiga</b><span>' + (tricky ? tricky + (tricky === 1 ? ' tal' : ' tal') + ' att öva extra på' : 'Inga knepiga tal just nu') + '</span></span></a>';
    out += '<a class="plan-card" href="#/djurkort">' +
      '<span class="plan-icon" aria-hidden="true">' + (cards ? MT.CARDS[MT.db.cards[MT.db.cards.length - 1]][0] : '❔') + '</span>' +
      '<span><b>Djurkort</b><span>' + cards + ' av ' + MT.CARDS.length + ' samlade</span></span></a>';
    return out;
  }

  MT.route(/^\/om$/, function (el) {
    el.innerHTML =
      '<div class="card stack" style="max-width:760px">' +
      '<h1>Om <span class="mark">Tabellträning</span></h1>' +
      '<p>Tabellträning är en övningssida för multiplikation och division för låg- och mellanstadiet. ' +
      'Den är byggd för att barn ska kunna öva i lugn och ro, utan att bli störda.</p>' +
      '<h2>Utan reklam och spårning</h2>' +
      '<p>Här finns ingen reklam, inga cookies från andra företag, inga konton och ingen statistik som skickas iväg. ' +
      'Sidan hämtar ingenting från internet. Medaljer, rekord och diplom sparas bara i webbläsaren på den här enheten.</p>' +
      '<h2>Flera elever på samma enhet</h2>' +
      '<p>Varje elev väljer sitt namn när sidan öppnas. Under <a href="#/vuxen">För lärare och föräldrar</a> ser du alla elever, ' +
      'kan exportera resultaten till en fil och läsa in dem på en annan dator.</p>' +
      '<h2>Fungerar utan internet</h2>' +
      '<p>Kopiera hela mappen till datorn eller ett USB-minne och öppna <b>index.html</b>. ' +
      'Om sidan ligger på en webbserver kan den även installeras som app och fungerar då offline.</p>' +
      '<h2>Så hjälper sidan eleverna</h2>' +
      '<p>Varje tabell har ett knep och fem steg. Tal som eleven svarar fel på eller tänker länge på hamnar bland <b>knepiga</b> och övas extra. ' +
      'Klarade tabeller kommer tillbaka för <b>repetition</b> efter 2, 7, 21 och 60 dagar, så att de stannar i minnet. ' +
      '<b>Dagens utmaning</b> blandar knepiga tal med tabeller eleven redan övat på. Prickbilden visar varje uppgift som rader och kolumner.</p>' +
      '<h2>Vem har gjort sidan?</h2>' +
      '<p>Tabellträning är gjord av <b>Björn Brunken</b>. Den är fri programvara under licensen GNU GPL 3.0: ' +
      'alla får använda, kopiera och förbättra den, så länge den förblir fri. ' +
      'Källkoden finns på <a href="https://github.com/BjoernBrunken/multiplikation-utan-reklam" target="_blank" rel="noopener">GitHub</a>. ' +
      'Typsnitten Andika (SIL International) och Fredoka (The Fredoka Project Authors) används under SIL Open Font License.</p>' +
      '<p class="muted small">Sidan är ett eget arbete och har ingen koppling till andra webbplatser för multiplikationsträning.</p>' +
      '<p class="muted small">Resultaten lagras i webbläsarens lokala lagring. Rensar man webbläsardata försvinner de – exportera gärna en säkerhetskopia.</p>' +
      '</div>';
  });
})();
