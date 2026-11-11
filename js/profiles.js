/* Tabellträning – Copyright (C) 2026 Björn Brunken – GPL-3.0-or-later, se LICENSE */
/* Elever på en delad enhet: välj elev, ny elev och sidan för vuxna (översikt, export, import). */
(function () {
  'use strict';
  var AVATARS = ['🦊', '🐼', '🐸', '🐯', '🐨', '🐵', '🐰', '🦁', '🐶', '🐱', '🐧', '🦄', '🐢', '🐙', '🦉', '🐝', '🐳', '🦖'];

  function countMedals(d) {
    var n = 0; Object.keys(d.medals || {}).forEach(function (k) { n += d.medals[k].filter(Boolean).length; }); return n;
  }

  /* ---------- Vem ska öva? ---------- */
  MT.route(/^\/vem$/, function (el) {
    var R = MT.root, cur = R.current;
    if (!R.profiles.length) { location.replace('#/vem/ny'); return; }
    el.innerHTML = '<h1 class="center">Vem ska <span class="mark">öva</span>?</h1>' +
      '<p class="center muted">Tryck på ditt namn.</p>' +
      '<div class="who-grid">' + R.profiles.map(function (p) {
        return '<button type="button" class="who-card' + (p.id === cur ? ' cur' : '') + '" data-id="' + p.id + '">' +
          '<span class="who-card-av" aria-hidden="true">' + p.avatar + '</span><span class="who-card-name">' + MT.esc(p.name) + '</span></button>';
      }).join('') +
      '<a class="who-card who-new" href="#/vem/ny"><span class="who-card-av" aria-hidden="true">＋</span><span class="who-card-name">Jag är ny</span></a></div>';
    MT.$$('[data-id]', el).forEach(function (b) {
      b.onclick = function () {
        MT.useProfile(b.dataset.id);
        var to = MT.afterPick && !/^\/vem/.test(MT.afterPick) ? MT.afterPick : '/';
        MT.afterPick = null; MT.go(to);
      };
    });
  });

  /* ---------- Ny elev ---------- */
  MT.route(/^\/vem\/ny$/, function (el) {
    var av = AVATARS.filter(function (a) { return !MT.root.profiles.some(function (p) { return p.avatar === a; }); })[0] || AVATARS[0];
    el.innerHTML = '<div class="card stack" style="max-width:640px;margin:0 auto">' +
      '<h1>Hej! Vad heter du?</h1>' +
      '<label class="field"><span>Ditt förnamn</span><input class="input" id="nm" maxlength="20" autocomplete="off" placeholder="Skriv ditt namn"></label>' +
      '<div><h3>Välj ett djur</h3><div class="avatars" role="group" aria-label="Välj ett djur">' + AVATARS.map(function (a) {
        return '<button type="button" class="av" data-a="' + a + '" aria-pressed="' + (a === av) + '">' + a + '</button>';
      }).join('') + '</div></div>' +
      '<p class="msg msg-bad" id="err" hidden></p>' +
      '<div class="actions"><button type="button" class="btn btn-main" id="ok">Klar – nu kör vi!</button>' +
      (MT.root.profiles.length ? '<a class="btn" href="#/vem">Tillbaka</a>' : '') + '</div></div>';
    var nm = MT.$('#nm', el);
    nm.focus();
    MT.$('.avatars', el).addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      av = b.dataset.a; MT.$$('.av', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    });
    nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
    MT.$('#ok', el).onclick = save;
    function save() {
      var name = nm.value.trim(), err = MT.$('#err', el);
      if (!name) { err.textContent = 'Skriv ditt namn först.'; err.hidden = false; nm.focus(); return; }
      if (MT.root.profiles.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) {
        err.textContent = 'Det namnet finns redan. Lägg till första bokstaven i efternamnet, till exempel ' + name + ' B.'; err.hidden = false; nm.focus(); return;
      }
      MT.addProfile(name, av);
      MT.go('/');
    }
  });

  /* ---------- För lärare och föräldrar ---------- */
  MT.route(/^\/vuxen$/, function (el) {
    function draw(note) {
      var R = MT.root;
      el.innerHTML = '<h1>För lärare och <span class="mark">föräldrar</span></h1>' +
        (note ? '<p class="msg msg-ok">' + note + '</p>' : '') +
        '<div class="big-links" style="margin-bottom:28px">' +
        MT.bigLink('#/kalkylblad', 'A4', 'Kalkylblad', 'Skapa arbetsblad med facit att skriva ut.') +
        MT.bigLink('#/klassen', '👥', 'Hela klassen', 'Tävla mot klassrekordet eller visa bildspel på tavlan.') +
        MT.bigLink('#/om', 'i', 'Om sidan', 'Integritet, offline och tips.') + '</div>' +

        '<h2>Elever på den här enheten</h2>' +
        '<p class="muted">Allt sparas bara i den här webbläsaren. Exportera till en fil om eleverna ska byta dator eller om du vill ha en säkerhetskopia.</p>' +
        (R.profiles.length ? '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Elev</th><th>Medaljer</th><th>Knepiga</th><th>Dagar i rad</th><th>Diplom</th><th>Senast</th><th></th></tr></thead><tbody>' +
          R.profiles.map(function (p) {
            var d = Object.assign(MT.blankData(p.name), R.data[p.id] || {});
            var tricky = Object.keys(d.facts).filter(function (k) { var f = d.facts[k]; return f.w > 0 || f.s > 0; }).length;
            return '<tr><td><span aria-hidden="true">' + p.avatar + '</span> <b>' + MT.esc(p.name) + '</b></td>' +
              '<td>' + countMedals(d) + ' / 120</td><td>' + tricky + '</td><td>' + (Number(d.daily.streak) || 0) + '</td>' +
              '<td>' + (d.diplomas.small ? 'litet ' : '') + (d.diplomas.large ? 'stort' : '') + (!d.diplomas.small && !d.diplomas.large ? '–' : '') + '</td>' +
              '<td>' + MT.esc(d.lastSeen || '–') + '</td>' +
              '<td class="row" style="gap:6px;flex-wrap:nowrap"><button type="button" class="btn btn-small" data-ren="' + p.id + '">Byt namn</button>' +
              '<button type="button" class="btn btn-small" data-exp="' + p.id + '">Exportera</button>' +
              '<button type="button" class="btn btn-small" data-del="' + p.id + '">Ta bort</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p>Inga elever ännu.</p>') +
        '<div id="ask"></div>' +
        '<div class="actions"><a class="btn btn-main" href="#/vem/ny">Lägg till elev</a>' +
        (R.profiles.length ? '<button type="button" class="btn" id="expAll">Exportera alla till fil</button>' : '') +
        '<label class="btn" style="cursor:pointer">Importera från fil<input type="file" id="imp" accept=".json,application/json" hidden></label></div>';

      MT.$$('[data-exp]', el).forEach(function (b) { b.onclick = function () { exportProfiles([b.dataset.exp]); }; });
      var ea = MT.$('#expAll', el); if (ea) ea.onclick = function () { exportProfiles(R.profiles.map(function (p) { return p.id; })); };
      MT.$$('[data-del]', el).forEach(function (b) {
        b.onclick = function () {
          var p = byId(b.dataset.del);
          MT.$('#ask', el).innerHTML = '<div class="confirm" style="margin-top:14px"><b>Ta bort ' + MT.esc(p.name) + ' och alla resultat?</b>' +
            '<button type="button" class="btn btn-small" id="yes" style="background:var(--red);color:#fff">Ja, ta bort</button>' +
            '<button type="button" class="btn btn-small" id="no">Avbryt</button></div>';
          MT.$('#yes', el).onclick = function () { MT.removeProfile(p.id); MT.drawWho(); draw(p.name + ' är borttagen.'); };
          MT.$('#no', el).onclick = function () { draw(); };
        };
      });
      MT.$$('[data-ren]', el).forEach(function (b) {
        b.onclick = function () {
          var p = byId(b.dataset.ren);
          MT.$('#ask', el).innerHTML = '<div class="row" style="margin-top:14px"><input class="input" id="newname" maxlength="20" value="' + MT.esc(p.name) + '">' +
            '<button type="button" class="btn btn-small btn-main" id="yes">Spara</button><button type="button" class="btn btn-small" id="no">Avbryt</button></div>';
          MT.$('#newname', el).focus();
          MT.$('#yes', el).onclick = function () {
            var v = MT.$('#newname', el).value.trim(); if (!v) return;
            p.name = v; if (MT.root.data[p.id]) MT.root.data[p.id].name = v; MT.save(); MT.drawWho(); draw();
          };
          MT.$('#no', el).onclick = function () { draw(); };
        };
      });
      MT.$('#imp', el).onchange = function (e) {
        var file = e.target.files[0]; if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          try { draw(importData(JSON.parse(rd.result))); }
          catch (err) { draw(); MT.$('#ask', el).innerHTML = '<p class="msg msg-bad">Filen kunde inte läsas. Välj en fil som har exporterats från Tabellträning.</p>'; }
        };
        rd.readAsText(file);
      };
    }
    function byId(id) { return MT.root.profiles.filter(function (p) { return p.id === id; })[0]; }
    function exportProfiles(ids) {
      var data = {
        app: 'tabelltraning', v: 2, exported: new Date().toISOString(),
        students: ids.map(function (id) { return { profile: byId(id), data: MT.root.data[id] || {} }; })
      };
      var name = ids.length === 1 ? byId(ids[0]).name.replace(/[^\wåäöÅÄÖ-]+/g, '_') : 'alla-elever';
      var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'tabelltraning-' + name + '-' + MT.today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
    // importerade filer kan vara ändrade: ta bort tecken som kan bilda HTML i alla textvärden
    function clean(v) {
      if (typeof v === 'string') return v.replace(/[<>"'&]/g, '');
      if (Array.isArray(v)) return v.map(clean);
      if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k.replace(/[<>"'&]/g, '')] = clean(v[k]); }); return o; }
      return v;
    }
    function importData(obj) {
      if (!obj || obj.app !== 'tabelltraning' || !Array.isArray(obj.students)) throw new Error('fel format');
      var added = 0, replaced = 0;
      obj.students.forEach(function (s) {
        if (!s || !s.profile || !s.profile.id || !s.profile.name) return;
        var av = AVATARS.indexOf(s.profile.avatar) >= 0 ? s.profile.avatar : '🦊';
        var p = { id: String(s.profile.id).replace(/[^\w-]/g, '').slice(0, 40) || 'p' + Date.now().toString(36), name: String(s.profile.name).slice(0, 20), avatar: av };
        var existing = byId(p.id);
        if (existing) { existing.name = p.name; existing.avatar = p.avatar; replaced++; }
        else { MT.root.profiles.push(p); added++; }
        MT.root.data[p.id] = Object.assign(MT.blankData(p.name), clean(s.data) || {});
      });
      if (MT.root.current) MT.useProfile(MT.root.current); else MT.save();
      MT.drawWho();
      return 'Import klar: ' + added + ' nya elever' + (replaced ? ', ' + replaced + ' uppdaterade' : '') + '.';
    }
    draw();
  });
})();
