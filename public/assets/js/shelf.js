(function () {
  'use strict';

  const SYSTEM_MAP = {
    'arcade': 'Arcade',
    'mame2003_plus': 'Arcade',
    'atari2600': 'Atari 2600',
    'gb': 'Game Boy',
    'gba': 'Game Boy Advance',
    'gbc': 'Game Boy Color',
    'segaMD': 'Sega Genesis/Mega Drive',
    'segaGG': 'Sega Game Gear',
    'segaMS': 'Sega Master System',
    'segaSaturn': 'Sega Saturn',
    'sega32x': 'Sega 32X',
    'nds': 'Nintendo DS',
    'jaguar': 'Atari Jaguar',
    'n64': 'Nintendo 64',
    'nes': 'Nintendo Entertainment System',
    'pce': 'PC Engine/TurboGrafx-16',
    'psx': 'PlayStation',
    'snes': 'Super Nintendo',
    'vb': 'Virtual Boy',
    'ws': 'WonderSwan',
    'external': 'External Game',
    'sg-1000': 'SG-1000',
    'coleco': 'ColecoVision',
    'intellivision': 'Intellivision',
    'vectrex': 'Vectrex',
    'odyssey2': 'Odyssey 2',
    'fds': 'Famicom Disk System',
    'neogeo': 'Neo Geo',
    'neogeocd': 'Neo Geo CD',
    'ngp': 'Neo Geo Pocket',
    'ngpc': 'Neo Geo Pocket Color',
    'lynx': 'Atari Lynx',
    'pcengine': 'PC Engine',
    'tg16': 'TurboGrafx-16',
    'tgcd': 'TurboGrafx-CD',
    'pcfx': 'PC-FX',
    '3do': '3DO',
    'cdi': 'Philips CD-i',
    'cpc': 'Amstrad CPC',
    'zxspectrum': 'ZX Spectrum',
    'c64': 'Commodore 64',
    'amiga': 'Amiga',
    'dos': 'DOS',
    'sgb': 'Super Game Boy',
    'pokemini': 'Pokemon Mini',
    'gameandwatch': 'Game & Watch',
  };

  let allGames = [];
  let currentGroupBy = 'system';
  let currentSort = 'alpha';
  let selectedGame = null;
  let selectedBookEl = null;

  function isLocalhost() {
    var host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.includes('localhost') || host.startsWith('192.168.');
  }

  function getSystemName(core) {
    if (!core) return 'Inconnu';
    return SYSTEM_MAP[core] || core;
  }

  function getGroupValues(game) {
    if (currentGroupBy === 'system') return [getSystemName(game.core)];
    if (currentGroupBy === 'developer') {
      var dev = game.developer || '';
      if (!dev) return ['Inconnu'];
      var parts = [];
      var m = dev.match(/^(.+?)\s*\((.+?)\)\s*$/);
      if (m) {
        parts.push(m[1].trim());
        m[2].split(',').forEach(function (s) {
          var t = s.trim();
          if (t) parts.push(t);
        });
      } else {
        parts.push(dev);
      }
      return parts;
    }
    return ['Inconnu'];
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getDisplayTitle(game) {
    if (game.title && game.title !== game.id) return game.title;
    return capitalize(game.id.replace(/[-_]/g, ' '));
  }

  function getGameYear(game) {
    if (!game.year) return null;
    const y = parseInt(game.year);
    if (isNaN(y) || y < 1900 || y > 2030) return null;
    return y;
  }

  function getAddedTimestamp(game) {
    if (!game.added) return -Infinity;
    const t = Date.parse(game.added);
    return isNaN(t) ? -Infinity : t;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getColorForIndex(index) {
    const hue = (index * 137.508) % 360;
    return 'hsl(' + hue.toFixed(1) + ', 60%, 40%)';
  }

  function populateDropdowns() {
    var savedGroup = localStorage.getItem('shelf_group') || 'system';
    var savedSort = localStorage.getItem('shelf_sort') || 'alpha';
    document.getElementById('group-select').value = savedGroup;
    document.getElementById('sort-select').value = savedSort;
    currentGroupBy = savedGroup;
    currentSort = savedSort;
  }

  function savePreferences() {
    localStorage.setItem('shelf_group', currentGroupBy);
    localStorage.setItem('shelf_sort', currentSort);
  }

  function initTheme() {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('theme-dark');
    }
    var toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.textContent = savedTheme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    populateDropdowns();

    document.getElementById('theme-toggle').addEventListener('click', function () {
      document.body.classList.toggle('theme-dark');
      var isDark = document.body.classList.contains('theme-dark');
      this.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    document.getElementById('back-home-btn').addEventListener('click', function () {
      window.location.href = '../index.html';
    });

    document.getElementById('group-select').addEventListener('change', function () {
      currentGroupBy = this.value;
      savePreferences();
      renderShelf();
    });

    document.getElementById('sort-select').addEventListener('change', function () {
      currentSort = this.value;
      savePreferences();
      renderShelf();
    });

    document.getElementById('info-overlay').addEventListener('click', closeGameInfo);
    document.getElementById('info-panel-close').addEventListener('click', closeGameInfo);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeGameInfo();
    });

    var cacheBuster = '?v=' + Date.now();
    var gamelistUrl = isLocalhost() ? '/gamelist.json' + cacheBuster : 'https://storage.googleapis.com/bonjourarcade/gamelist.json' + cacheBuster;
    fetch(gamelistUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allGames = data.games || [];
        renderShelf();
      })
      .catch(function (err) {
        document.getElementById('shelf-container').innerHTML =
          '<p style="text-align:center;padding:2rem;color:var(--text-color);">Erreur de chargement des jeux.</p>';
        console.error(err);
      });
  });

  function renderShelf() {
    closeGameInfo();
    var container = document.getElementById('shelf-container');
    container.innerHTML = '';

    var games = allGames.filter(function (g) { return g.id; });

    if (games.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-color);">Aucun jeu trouve.</p>';
      var stats = document.getElementById('shelf-stats');
      if (stats) stats.textContent = '0 jeu';
      return;
    }

    sortGames(games);

    var stats = document.getElementById('shelf-stats');
    if (stats) stats.textContent = games.length + ' jeu' + (games.length > 1 ? 'x' : '');

    var groups = {};
    games.forEach(function (game) {
      var keys = getGroupValues(game);
      keys.forEach(function (key) {
        if (!groups[key]) groups[key] = [];
        if (groups[key].indexOf(game) === -1) groups[key].push(game);
      });
    });

    var groupKeys = Object.keys(groups).sort(function (a, b) {
      if (a === 'Inconnu') return 1;
      if (b === 'Inconnu') return -1;
      return a.localeCompare(b, 'fr');
    });

    groupKeys.forEach(function (key, idx) {
      var groupGames = groups[key];
      var color = getColorForIndex(idx);
      var section = document.createElement('div');
      section.className = 'shelf-section';

      var header = document.createElement('div');
      header.className = 'shelf-section-header';
      header.style.borderBottomColor = color;
      header.innerHTML =
        '<span class="collapse-icon">\u25BC</span>' +
        '<span class="section-color-dot" style="background:' + color + '"></span>' +
        '<span class="section-name">' + escapeHtml(key) + '</span>' +
        '<span class="section-count">' + groupGames.length + ' jeu' + (groupGames.length > 1 ? 'x' : '') + '</span>';

      var shelf = document.createElement('div');
      shelf.className = 'bookshelf';

      groupGames.forEach(function (game) {
        var title = getDisplayTitle(game);
        var yearDisplay = getGameYear(game) || '';
        var coverUrl = game.coverArt || '';
        var isMobile = window.innerWidth <= 768;
        var spineW = isMobile ? 32 : 40;
        var baseH = isMobile ? 200 : 240;
        var baseW = Math.round(baseH * 2 / 3); // default ~2:3 aspect

        var book = document.createElement('div');
        book.className = 'book';
        book.setAttribute('data-gameid', game.id);

        var spine = document.createElement('div');
        spine.className = 'side spine';
        spine.style.backgroundColor = color;
        spine.style.width = spineW + 'px';
        spine.style.height = baseH + 'px';
        if (coverUrl) {
          spine.style.backgroundImage = 'url(' + coverUrl + ')';
          spine.style.backgroundSize = 'cover';
          spine.style.backgroundPosition = 'center';
        }

        var spineTitle = document.createElement('div');
        spineTitle.className = 'spine-title';
        spineTitle.textContent = title;
        spine.appendChild(spineTitle);

        if (yearDisplay) {
          var spineYear = document.createElement('div');
          spineYear.className = 'spine-year';
          spineYear.textContent = yearDisplay;
          spine.appendChild(spineYear);
        }

        book.appendChild(spine);

        var top = document.createElement('div');
        top.className = 'side top';
        top.style.width = spineW + 'px';
        top.style.height = baseW + 'px';
        book.appendChild(top);

        if (coverUrl) {
          var cover = document.createElement('div');
          cover.className = 'side cover';
          cover.style.backgroundImage = 'url(' + coverUrl + ')';
          cover.style.width = baseW + 'px';
          cover.style.height = baseH + 'px';
          cover.style.left = spineW + 'px';
          book.appendChild(cover);
        }

        book.addEventListener('click', function () {
          openGameInfo(game, book);
        });

        book.addEventListener('mouseenter', function () {
          this.classList.add('hover');
        });
        book.addEventListener('mouseleave', function () {
          this.classList.remove('hover');
        });

        shelf.appendChild(book);

        if (coverUrl) {
          (function (b, url, baseH, sw) {
            var img = new Image();
            img.onload = function () {
              var aspect = img.naturalWidth / img.naturalHeight;
              var coverH = baseH;
              var coverW = Math.round(baseH * aspect);
              var spine = b.querySelector('.spine');
              var cover = b.querySelector('.cover');
              var top = b.querySelector('.top');
              var titleEl = b.querySelector('.spine-title');
              if (spine) spine.style.height = coverH + 'px';
              if (cover) {
                cover.style.width = coverW + 'px';
                cover.style.height = coverH + 'px';
                cover.style.left = sw + 'px';
              }
              if (top) {
                top.style.height = coverW + 'px';
                top.style.transform = 'rotateX(90deg) translateZ(' + (coverW / 2) + 'px) translateY(-' + (coverW / 2) + 'px)';
              }
              b.style.height = (coverH + 60) + 'px';
              if (titleEl) titleEl.style.maxHeight = (coverH - 15) + 'px';
            };
            img.src = url;
          })(book, coverUrl, baseH, spineW);
        }
      });

      section.appendChild(header);
      section.appendChild(shelf);

      header.addEventListener('click', function () {
        section.classList.toggle('collapsed');
        var icon = header.querySelector('.collapse-icon');
        icon.textContent = section.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
      });

      container.appendChild(section);
    });
  }

  function sortGames(games) {
    var sort = currentSort;
    if (sort === 'random') {
      shuffleArray(games);
    } else if (sort === 'alpha') {
      games.sort(function (a, b) {
        var ta = getDisplayTitle(a).toLowerCase();
        var tb = getDisplayTitle(b).toLowerCase();
        return ta.localeCompare(tb, 'fr');
      });
    } else if (sort === 'latest') {
      games.sort(function (a, b) {
        return getAddedTimestamp(b) - getAddedTimestamp(a);
      });
    } else if (sort === 'year-asc') {
      games.sort(function (a, b) {
        var ya = getGameYear(a);
        var yb = getGameYear(b);
        if (ya === null && yb === null) return 0;
        if (ya === null) return 1;
        if (yb === null) return -1;
        return ya - yb;
      });
    } else if (sort === 'year-desc') {
      games.sort(function (a, b) {
        var ya = getGameYear(a);
        var yb = getGameYear(b);
        if (ya === null && yb === null) return 0;
        if (ya === null) return 1;
        if (yb === null) return -1;
        return yb - ya;
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function openGameInfo(game, bookEl) {
    if (selectedBookEl === bookEl) return;
    closeGameInfo();

    selectedGame = game;
    selectedBookEl = bookEl;

    var rect = bookEl.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var panelW = vw <= 768 ? 0 : 380;
    var targetX = (vw - panelW) / 2;
    var targetY = vh / 2;
    var bx = rect.left + rect.width / 2;
    var by = rect.top + rect.height / 2;
    var dx = targetX - bx;
    var dy = targetY - by;

    var transformVal = 'translate3d(' + dx + 'px, ' + dy + 'px, 0px) rotateY(-90deg) scale(1.8)';
    bookEl.style.transform = transformVal;
    bookEl.classList.add('selected');

    document.body.style.overflow = 'hidden';

    var title = getDisplayTitle(game);
    var system = getSystemName(game.core);
    var developer = game.developer || '';
    var year = game.year || '';
    var genre = game.genre || '';
    var controls = game.controls || [];
    var toStart = game.to_start || '';
    var description = game.announcement_message || '';
    var coverUrl = game.coverArt || '';
    var playUrl = game.pageUrl || '/b/' + game.id;

    var html = '';

    if (coverUrl) {
      html += '<img class="info-panel-cover" src="' + coverUrl + '" alt="' + escapeHtml(title) + '" />';
    }

    html += '<div class="info-panel-title">' + escapeHtml(title) + '</div>';

    if (system) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Console</div><div class="info-panel-value">' + escapeHtml(system) + '</div></div>';
    }
    if (developer) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Développeur</div><div class="info-panel-value">' + escapeHtml(developer) + '</div></div>';
    }
    if (year) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Année</div><div class="info-panel-value">' + escapeHtml(year) + '</div></div>';
    }
    if (genre) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Genre</div><div class="info-panel-value">' + escapeHtml(genre) + '</div></div>';
    }

    if (controls.length > 0) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Contrôles</div><ul class="info-panel-controls">';
      controls.forEach(function (c) {
        html += '<li>' + escapeHtml(c) + '</li>';
      });
      html += '</ul></div>';
    }

    if (toStart) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Démarrer</div><div class="info-panel-value">' + escapeHtml(toStart) + '</div></div>';
    }

    if (description) {
      html += '<div class="info-panel-field"><div class="info-panel-label">Annonce</div><div class="info-panel-value info-panel-description">' + escapeHtml(description) + '</div></div>';
    }

    html += '<a href="' + playUrl + '" class="play-button">▶ Jouer</a>';

    document.getElementById('info-panel-content').innerHTML = html;
    document.getElementById('info-overlay').classList.add('active');
    document.getElementById('info-panel').classList.add('active');
  }

  function closeGameInfo() {
    if (selectedBookEl) {
      selectedBookEl.style.transform = '';
      selectedBookEl.classList.remove('selected', 'hover');
      selectedBookEl = null;
    }
    selectedGame = null;
    document.body.style.overflow = '';
    document.getElementById('info-overlay').classList.remove('active');
    document.getElementById('info-panel').classList.remove('active');
  }
})();
