(function () {
  'use strict';

  // Chrome/Safari otherwise try to restore this page's (and its scrollable
  // rows') previous scroll position on reload/back-navigation.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var MIN_GAMES_PER_CATEGORY = 6;
  var MAX_GAMES_PER_ROW = 20;
  var PLACEHOLDER_COVER = '/assets/images/placeholder_thumb.png';

  var allGamesById = {};
  var allGamesList = [];
  var currentCategories = [];
  var favoriteIds = new Set();
  var likedIds = new Set();
  var favoritesUnsub = null;
  var BURST_DELAY = 320;
  var TOAST_VISIBLE_MS = 9000;

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getDisplayTitle(game) {
    if (game.title && game.title !== game.id) return game.title;
    return capitalize(game.id.replace(/[-_]/g, ' '));
  }

  function isVisible(game) {
    // This page ignores the `hide` field entirely - the only reason to
    // exclude a game here is a known, flagged problem with it.
    return game.id && game.problem !== 'true';
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function getGenres(game) {
    var genre = (game.genre || '').trim();
    if (!genre) return [];
    return genre.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------- Intro ---------- */

  function initIntro() {
    var intro = document.getElementById('browse-intro');
    var root = document.getElementById('browse-root');
    var alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem('browseIntroSeen') === '1';
    } catch (e) { /* ignore */ }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (alreadySeen || reduceMotion) {
      intro.classList.add('browse-intro-skip');
      root.classList.add('browse-root-instant');
    } else {
      try { sessionStorage.setItem('browseIntroSeen', '1'); } catch (e) { /* ignore */ }
      setTimeout(function () {
        intro.classList.add('browse-intro-skip');
      }, 1700);
    }
  }

  /* ---------- Theme ---------- */
  /* Light "arcade" palette is the default; dark is an opt-in toggle. */

  function initTheme() {
    var toggle = document.getElementById('browse-theme-toggle');
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) { /* ignore */ }
    var isDark = saved === 'dark';
    document.body.classList.toggle('browse-dark', isDark);
    toggle.textContent = isDark ? '☀️' : '🌙';

    toggle.addEventListener('click', function () {
      var nowDark = !document.body.classList.contains('browse-dark');
      document.body.classList.toggle('browse-dark', nowDark);
      toggle.textContent = nowDark ? '☀️' : '🌙';
      try { localStorage.setItem('theme', nowDark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    });
  }

  function initHeaderScroll() {
    var header = document.getElementById('browse-header');
    window.addEventListener('scroll', function () {
      header.classList.toggle('browse-header-solid', window.scrollY > 80);
    }, { passive: true });
  }

  /* ---------- Logo spin toy ---------- */
  /* Each click adds a full spin; once clicks stop, it rapidly unwinds through
     all of them and settles with a little elastic bounce. */

  function initLogoSpin() {
    var link = document.querySelector('.browse-logo-link');
    var logo = document.querySelector('.browse-logo');
    if (!link || !logo) return;

    var clickCount = 0;
    var settleTimer = null;
    var bouncing = false;

    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (bouncing) return;

      clickCount++;
      logo.style.transition = 'transform 0.22s ease-out';
      logo.style.transform = 'rotate(' + (clickCount * 360) + 'deg)';

      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        unwind(clickCount);
        clickCount = 0;
      }, 450);
    });

    function unwind(count) {
      bouncing = true;
      var unwindDuration = Math.min(0.1 * count + 0.15, 0.8);
      logo.style.transition = 'transform ' + unwindDuration + 's cubic-bezier(0.55, 0, 0.85, 0.3)';
      logo.style.transform = 'rotate(-14deg)';

      // `transitionend` can fail to fire in some edge cases (interrupted
      // transitions, backgrounded tabs), which would leave the logo stuck
      // mid-animation forever. A timeout matched to the transition's own
      // duration guarantees the sequence always completes.
      setTimeout(function () {
        logo.style.transition = 'transform 0.45s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        logo.style.transform = 'rotate(0deg)';
        setTimeout(function () {
          bouncing = false;
          // Clear the inline styles the spin animation used, otherwise they
          // permanently outrank the CSS :hover rule (inline beats stylesheet
          // regardless of the value), silently killing hover afterward.
          logo.style.transition = '';
          logo.style.transform = '';
        }, 460);
      }, unwindDuration * 1000 + 20);
    }
  }

  /* ---------- Hide the cursor while navigating with the keyboard ---------- */

  function initCursorAutoHide() {
    document.addEventListener('mousemove', function () {
      document.body.classList.remove('browse-hide-cursor');
    }, { passive: true });
  }

  function getTorontoDailySeed() {
    var formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    var parts = formatter.formatToParts(new Date());
    var year = parts.find(function (p) { return p.type === 'year'; }).value;
    var month = parts.find(function (p) { return p.type === 'month'; }).value;
    var day = parts.find(function (p) { return p.type === 'day'; }).value;
    return year + month + day;
  }

  /* ---------- Header dropdowns + search (share a single "close everything else" hook) ---------- */

  var closeAllDropdowns = function () {};
  var closeSearch = function () {};
  var closeMobileNav = function () {};

  function closeHeaderMenus() {
    closeAllDropdowns();
    closeSearch();
    closeMobileNav();
  }

  function initMobileNav() {
    var toggle = document.getElementById('browse-menu-toggle');
    var nav = document.querySelector('[data-browse-menu]');
    if (!toggle || !nav) return;

    closeMobileNav = function () {
      nav.classList.remove('open');
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = nav.classList.contains('open');
      closeHeaderMenus();
      if (!isOpen) nav.classList.add('open');
    });

    nav.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function initDropdowns() {
    var dropdowns = Array.prototype.slice.call(document.querySelectorAll('[data-browse-dropdown]'));

    closeAllDropdowns = function () {
      dropdowns.forEach(function (d) { d.classList.remove('open'); });
    };

    dropdowns.forEach(function (dropdown) {
      var btn = dropdown.querySelector('.browse-nav-dropbtn');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('open');
        closeHeaderMenus();
        if (!isOpen) dropdown.classList.add('open');
      });
    });

    document.addEventListener('click', closeHeaderMenus);
    document.addEventListener('keydown', function (e) {
      // Focused on a game via keyboard nav: Escape's only job is to drop
      // that focus (handled in initKeyboardNav) - don't also close menus.
      if (e.key === 'Escape' && kbRow === -1) closeHeaderMenus();
    });

    var dailyLink = document.getElementById('browse-daily-link');
    if (dailyLink) dailyLink.href = '/daily/?seed=' + getTorontoDailySeed();
  }

  /* ---------- Search ---------- */

  function initSearch() {
    var wrap = document.querySelector('[data-browse-search]');
    var toggle = document.getElementById('browse-search-toggle');
    var input = document.getElementById('browse-search-input');
    var debounceTimer = null;

    closeSearch = function () {
      wrap.classList.remove('open');
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = wrap.classList.contains('open');
      closeAllDropdowns();
      if (isOpen) {
        closeSearch();
        input.value = '';
        performSearch('');
      } else {
        wrap.classList.add('open');
        input.focus();
      }
    });

    input.addEventListener('click', function (e) { e.stopPropagation(); });

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var value = input.value;
      debounceTimer = setTimeout(function () { performSearch(value); }, 150);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        input.value = '';
        performSearch('');
        wrap.classList.remove('open');
        input.blur();
        e.stopPropagation();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Hand off to the grid's own keyboard nav instead of blocking it -
        // don't stopPropagation, let this same keypress reach it once the
        // input isn't the typing target anymore.
        input.blur();
        return;
      }
      e.stopPropagation();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== '/') return;
      if (isTypingTarget(document.activeElement)) return;
      if (document.getElementById('browse-modal-overlay').classList.contains('open')) return;
      e.preventDefault();
      closeAllDropdowns();
      wrap.classList.add('open');
      input.focus();
    });
  }

  function normalizeForSearch(str) {
    return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  var SYSTEM_NAMES = {
    'arcade': 'Arcade (borne)', 'mame2003_plus': 'Arcade (borne)', 'atari2600': 'Atari 2600',
    'gb': 'Game Boy', 'gba': 'Game Boy Advance', 'gbc': 'Game Boy Color',
    'segaMD': 'Sega Genesis/Mega Drive', 'segaGG': 'Sega Game Gear', 'segaMS': 'Sega Master System',
    'segaSaturn': 'Sega Saturn', 'sega32x': 'Sega 32X', 'nds': 'Nintendo DS', 'jaguar': 'Atari Jaguar',
    'n64': 'Nintendo 64', 'nes': 'Nintendo Entertainment System', 'pce': 'PC Engine/TurboGrafx-16',
    'psx': 'PlayStation', 'snes': 'Super Nintendo', 'vb': 'Virtual Boy', 'ws': 'WonderSwan',
    'neogeo': 'Neo Geo', 'neogeocd': 'Neo Geo CD', 'ngp': 'Neo Geo Pocket', 'ngpc': 'Neo Geo Pocket Color',
    'lynx': 'Atari Lynx', 'pcengine': 'PC Engine', 'tg16': 'TurboGrafx-16', 'tgcd': 'TurboGrafx-CD',
    'pcfx': 'PC-FX', '3do': '3DO', 'cdi': 'Philips CD-i', 'cpc': 'Amstrad CPC', 'zxspectrum': 'ZX Spectrum',
    'c64': 'Commodore 64', 'amiga': 'Amiga', 'dos': 'DOS', 'sgb': 'Super Game Boy', 'pokemini': 'Pokemon Mini',
    'gameandwatch': 'Game & Watch', 'sg-1000': 'SG-1000', 'coleco': 'ColecoVision',
    'intellivision': 'Intellivision', 'vectrex': 'Vectrex', 'odyssey2': 'Odyssey 2', 'fds': 'Famicom Disk System'
  };

  function buildSearchIndex(game) {
    var parts = [
      getDisplayTitle(game), game.id, game.developer, game.genre, game.year,
      game.description, game.core, SYSTEM_NAMES[game.core]
    ];
    return normalizeForSearch(parts.filter(Boolean).join(' | '));
  }

  function performSearch(query) {
    var q = normalizeForSearch(query.trim());
    if (!q) {
      renderRows(currentCategories);
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    var matches = allGamesList.filter(function (game) {
      if (!game._searchIndex) game._searchIndex = buildSearchIndex(game);
      return terms.every(function (term) { return game._searchIndex.indexOf(term) !== -1; });
    }).slice(0, 40);

    kbRow = -1;
    clearKbFocus();

    var container = document.getElementById('browse-rows');
    container.innerHTML = '';
    if (!matches.length) {
      container.innerHTML = '<p class="browse-loading">Aucun jeu ne correspond à « ' + escapeHtml(query.trim()) + ' ».</p>';
      return;
    }
    container.appendChild(makeRow({ title: 'Résultats pour « ' + query.trim() + ' »', games: matches }));
  }

  /* ---------- Auth / favorites (shared across hero, preview, modal) ---------- */

  function currentUid() {
    return window.firebaseAuth && window.firebaseAuth.currentUser ? window.firebaseAuth.currentUser.uid : null;
  }

  function initFavoritesTracking() {
    if (!window.onFirebaseAuthStateChanged) return;
    window.onFirebaseAuthStateChanged(function (user) {
      if (favoritesUnsub) { favoritesUnsub(); favoritesUnsub = null; }
      favoriteIds = new Set();
      if (user && window.__favorites) {
        favoritesUnsub = window.__favorites.listen(user.uid, function (ids) {
          favoriteIds = new Set(ids);
          refreshFavoriteButtons();
        });
      }
      refreshFavoriteButtons();
    });
  }

  /* ---------- Account (profile/login) + admin badge ---------- */

  function initAccountUI() {
    var loginBtn = document.getElementById('browse-login-btn');
    var userIndicator = document.getElementById('browse-user-indicator');
    var userAvatar = document.getElementById('browse-user-avatar');
    var userName = document.getElementById('browse-user-name');
    var adminLink = document.getElementById('browse-admin-link');
    var adminBadge = document.getElementById('browse-admin-badge');

    loginBtn.addEventListener('click', function () {
      if (window.signInWithGoogle) window.signInWithGoogle().catch(function (err) { console.error('Login error:', err); });
    });

    if (!window.onFirebaseAuthStateChanged) return;
    window.onFirebaseAuthStateChanged(function (user) {
      if (!user) {
        loginBtn.style.display = '';
        userIndicator.style.display = 'none';
        adminLink.style.display = 'none';
        adminBadge.style.display = 'none';
        return;
      }

      loginBtn.style.display = 'none';
      userIndicator.style.display = 'flex';
      userName.textContent = user.displayName || 'Anonyme';

      var fallbackAvatar = user.photoURL || '../assets/default-avatar.png';
      if (window.getPublicProfile) {
        window.getPublicProfile(user.uid).then(function (profile) {
          userAvatar.src = (profile && profile.photoURL) || fallbackAvatar;
        }).catch(function () { userAvatar.src = fallbackAvatar; });
      } else {
        userAvatar.src = fallbackAvatar;
      }

      if (window.checkFirebaseScoreModeratorAccess) {
        window.checkFirebaseScoreModeratorAccess().then(function (isModerator) {
          if (!isModerator) { adminLink.style.display = 'none'; adminBadge.style.display = 'none'; return; }
          adminLink.style.display = 'inline-flex';
          if (!window.getPendingScoresCount) return;
          window.getPendingScoresCount().then(function (result) {
            var count = result && result.count;
            if (count > 0) {
              adminBadge.textContent = count;
              adminBadge.style.display = 'inline-block';
            } else {
              adminBadge.style.display = 'none';
            }
          }).catch(function () { adminBadge.style.display = 'none'; });
        }).catch(function () { adminLink.style.display = 'none'; });
      }
    });
  }

  function refreshFavoriteButtons() {
    document.querySelectorAll('[data-fav-for]').forEach(function (btn) {
      var gameId = btn.getAttribute('data-fav-for');
      setFavButtonState(btn, favoriteIds.has(gameId));
    });
  }

  function setFavButtonState(btn, isFav) {
    btn.classList.toggle('is-fav', isFav);
    var span = btn.querySelector('span');
    if (span) span.textContent = isFav ? '❤️' : '🖤';
    btn.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
  }

  function toggleFavorite(gameId, btn) {
    return Promise.resolve().then(function () {
      var uid = currentUid();
      if (!uid) {
        if (!window.signInWithGoogle) return;
        return window.signInWithGoogle().then(function () {
          uid = currentUid();
          if (!uid) return;
          var nowFav = !favoriteIds.has(gameId);
          if (nowFav) favoriteIds.add(gameId); else favoriteIds.delete(gameId);
          if (btn) setFavButtonState(btn, nowFav);
          return window.__favorites.toggle(uid, gameId);
        }).catch(function (err) { console.error('Login error:', err); });
      }
      var nowFav = !favoriteIds.has(gameId);
      if (nowFav) favoriteIds.add(gameId); else favoriteIds.delete(gameId);
      if (btn) setFavButtonState(btn, nowFav);
      return window.__favorites.toggle(uid, gameId);
    });
  }

  function submitRating(gameId, rating) {
    var uid = currentUid();
    if (!uid) {
      if (!window.signInWithGoogle) return Promise.resolve();
      return window.signInWithGoogle().then(function () {
        if (currentUid() && window.rateGame) return window.rateGame(gameId, rating);
      }).catch(function (err) { console.error('Login error:', err); });
    }
    if (window.rateGame) return window.rateGame(gameId, rating).catch(function (err) {
      console.error('Rating error:', err);
    });
    return Promise.resolve();
  }

  /* ---------- Hero ---------- */

  function renderHero(game) {
    var backdrop = document.getElementById('browse-hero-backdrop');
    var title = document.getElementById('browse-hero-title');
    var meta = document.getElementById('browse-hero-meta');
    var desc = document.getElementById('browse-hero-desc');
    var play = document.getElementById('browse-hero-play');
    var favBtn = document.getElementById('browse-hero-fav');
    var infoBtn = document.getElementById('browse-hero-info');

    var cover = game.coverArt || PLACEHOLDER_COVER;
    backdrop.style.backgroundImage = 'url(' + cover + ')';
    title.textContent = getDisplayTitle(game);

    var metaParts = [];
    if (game.year) metaParts.push(game.year);
    if (game.genre) metaParts.push(game.genre);
    if (game.developer) metaParts.push(game.developer);
    meta.innerHTML = metaParts.map(function (p) { return '<span>' + escapeHtml(p) + '</span>'; }).join('');

    desc.textContent = game.description ||
      ('Découvrez ' + getDisplayTitle(game) + ', jeu en vedette cette semaine sur BonjourArcade.');

    play.href = game.pageUrl || ('/b/' + game.id);

    favBtn.setAttribute('data-fav-for', game.id);
    setFavButtonState(favBtn, favoriteIds.has(game.id));
    favBtn.onclick = function () { toggleFavorite(game.id, favBtn); };

    infoBtn.onclick = function () { openModal(game); };

    initHeroTimer();
    loadHeroLeaderboard(game.id);
  }

  /* ---------- Featured game: rotation countdown + current leaderboard ---------- */
  /* Rotation happens on the 1st and 15th of each month (see AGENTS.md). */

  var heroTimerInterval = null;

  function getNextGameChangeDate() {
    var now = new Date();
    var day = now.getDate();
    var month = now.getMonth();
    var year = now.getFullYear();
    if (day < 15) return new Date(year, month, 15);
    return new Date(year, month + 1, 1);
  }

  function formatTimeRemaining(targetDate) {
    var diff = targetDate - new Date();
    if (diff <= 0) return 'Bientôt';
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);
    var parts = [];
    if (days > 0) parts.push(String(days).padStart(2, '0') + 'j');
    if (hours > 0 || days > 0) parts.push(String(hours).padStart(2, '0') + 'h');
    if (minutes > 0 || hours > 0 || days > 0) parts.push(String(minutes).padStart(2, '0') + 'm');
    parts.push(String(seconds).padStart(2, '0') + 's');
    return parts.join(' ');
  }

  function initHeroTimer() {
    var timerEl = document.getElementById('browse-hero-timer');
    if (!timerEl) return;
    clearInterval(heroTimerInterval);

    function update() {
      timerEl.textContent = '⏱ Prochain changement dans ' + formatTimeRemaining(getNextGameChangeDate());
    }
    update();
    heroTimerInterval = setInterval(update, 1000);
  }

  function loadHeroLeaderboard(gameId) {
    var wrap = document.getElementById('browse-hero-leaderboard');
    var list = document.getElementById('browse-hero-leaderboard-list');
    if (!wrap || !list || typeof window.fetchLeaderboardScores !== 'function') return;

    window.fetchLeaderboardScores(gameId).then(function (data) {
      var scores = data && data.result && data.result.success && data.result.scores;
      if (!scores || !scores.length) { wrap.style.display = 'none'; return; }

      var bestByPlayer = new Map();
      scores.forEach(function (s) {
        var existing = bestByPlayer.get(s.userId);
        if (!existing || s.score > existing.score) bestByPlayer.set(s.userId, s);
      });
      var top = Array.from(bestByPlayer.values()).sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
      if (!top.length) { wrap.style.display = 'none'; return; }

      list.innerHTML = top.map(function (s, i) {
        return '<div class="browse-hero-leaderboard-row">' +
          '<span class="browse-hero-leaderboard-rank">#' + (i + 1) + '</span>' +
          '<span class="browse-hero-leaderboard-name">' + escapeHtml(s.player || '?') + '</span>' +
          '<span class="browse-hero-leaderboard-score">' + escapeHtml(String(s.score)) + '</span>' +
          '</div>';
      }).join('');
      wrap.style.display = 'block';
    }).catch(function () { wrap.style.display = 'none'; });
  }

  function pickHeroGame(games, currentGameId) {
    if (currentGameId) {
      var found = games.find(function (g) { return g.id === currentGameId; });
      if (found) return found;
    }
    var withCover = games.filter(function (g) { return g.coverArt; });
    var pool = withCover.length ? withCover : games;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- Rows / categories ---------- */

  function getDecadeLabel(game) {
    var year = parseInt(game.year, 10);
    if (isNaN(year) || year < 1950 || year > 2039) return null;
    var decade = Math.floor(year / 10) * 10;
    return 'Les années ' + decade;
  }

  // Genre casing is inconsistent in the source metadata (e.g. "Co-op" vs
  // "co-op"), so keys are normalized to avoid near-duplicate rows.
  var CATEGORY_TYPE_LABELS = {
    genre: 'Genre',
    system: 'Console',
    decade: 'Décennie',
    dev: 'Développeur'
  };

  function getGameCategoryKeys(game) {
    var keys = [];
    getGenres(game).forEach(function (genre) {
      keys.push({ key: 'genre:' + genre.toLowerCase(), title: capitalize(genre.toLowerCase()), type: 'genre' });
    });

    var systemLabel = SYSTEM_NAMES[game.core] || game.core;
    if (systemLabel) keys.push({ key: 'system:' + systemLabel.toLowerCase(), title: systemLabel, type: 'system' });

    var decadeLabel = getDecadeLabel(game);
    if (decadeLabel) keys.push({ key: 'decade:' + decadeLabel, title: decadeLabel, type: 'decade' });

    var dev = (game.developer || '').trim();
    if (dev) keys.push({ key: 'dev:' + dev.toLowerCase(), title: dev, type: 'dev' });

    return keys;
  }

  function buildCategories(games, heroGame) {
    var groups = {};

    function addToGroup(key, title, type, game) {
      if (!groups[key]) groups[key] = { title: title, type: type, games: [] };
      groups[key].games.push(game);
    }

    games.forEach(function (game) {
      getGameCategoryKeys(game).forEach(function (k) { addToGroup(k.key, k.title, k.type, game); });
    });

    var eligible = Object.keys(groups).filter(function (key) {
      return groups[key].games.length >= MIN_GAMES_PER_CATEGORY;
    });

    // Feature a category the hero game itself belongs to first (shared
    // genre/system/decade/developer), so browsing has an obvious jumping-off
    // point from whatever's currently spotlighted.
    var relatedKey = null;
    if (heroGame) {
      var heroKeys = getGameCategoryKeys(heroGame).map(function (k) { return k.key; });
      relatedKey = heroKeys.filter(function (k) { return eligible.indexOf(k) !== -1; })[0] || null;
    }

    var rest = eligible.filter(function (k) { return k !== relatedKey; });
    var chosenKeys = relatedKey ? [relatedKey].concat(shuffleArray(rest)) : shuffleArray(rest);

    return chosenKeys.map(function (key) {
      var entry = groups[key];
      return {
        title: entry.title,
        typeLabel: CATEGORY_TYPE_LABELS[entry.type] || '',
        games: shuffleArray(entry.games).slice(0, MAX_GAMES_PER_ROW)
      };
    });
  }

  function makeCard(game) {
    var a = document.createElement('a');
    a.className = 'browse-card';
    a.href = game.pageUrl || ('/b/' + game.id);
    a.setAttribute('data-gameid', game.id);

    var img = document.createElement('img');
    img.className = 'browse-card-img';
    img.loading = 'lazy';
    img.alt = getDisplayTitle(game);
    img.src = game.coverArt || PLACEHOLDER_COVER;
    a.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'browse-card-overlay';
    overlay.textContent = getDisplayTitle(game);
    a.appendChild(overlay);

    a.addEventListener('click', function (e) {
      // Let modifier-clicks / middle-click open in a new tab natively.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openModal(game);
    });

    return a;
  }

  /* ---------- Activation burst + keyboard grid navigation ---------- */

  function activateCard(cardEl, clientX, clientY) {
    var rect = cardEl.getBoundingClientRect();
    var x = typeof clientX === 'number' ? clientX : rect.left + rect.width / 2;
    var y = typeof clientY === 'number' ? clientY : rect.top + rect.height / 2;
    var size = Math.max(rect.width, rect.height) * 2.6;

    var burst = document.createElement('div');
    burst.className = 'browse-burst';
    burst.style.width = size + 'px';
    burst.style.height = size + 'px';
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';
    document.body.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 450);

    var href = cardEl.getAttribute('href');
    setTimeout(function () { window.location.href = href; }, BURST_DELAY);
  }

  var kbRow = -1;
  var kbCol = 0;

  function getNavTracks() {
    return Array.prototype.slice.call(document.querySelectorAll('.browse-row-track'));
  }

  // Picks the row closest to vertical screen-center, then within that row
  // the card closest to horizontal screen-center - so entering keyboard nav
  // always starts from whatever's actually in view, not a stale hover.
  function findCenterPosition(tracks) {
    var viewportCenterY = window.innerHeight / 2;
    var viewportCenterX = window.innerWidth / 2;
    var bestRow = -1;
    var bestRowDist = Infinity;

    tracks.forEach(function (track, i) {
      var rect = track.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
      if (dist < bestRowDist) { bestRowDist = dist; bestRow = i; }
    });
    if (bestRow === -1) return null;

    var cards = Array.prototype.slice.call(tracks[bestRow].querySelectorAll('.browse-card'));
    var bestCol = 0;
    var bestColDist = Infinity;
    cards.forEach(function (card, i) {
      var rect = card.getBoundingClientRect();
      var dist = Math.abs((rect.left + rect.width / 2) - viewportCenterX);
      if (dist < bestColDist) { bestColDist = dist; bestCol = i; }
    });

    return { row: bestRow, col: bestCol };
  }

  function clearKbFocus() {
    var current = document.querySelector('.browse-card.kbfocus');
    if (current) current.classList.remove('kbfocus');
  }

  function setKbFocus(track, colIndex) {
    clearKbFocus();
    var cards = track.querySelectorAll('.browse-card');
    if (!cards.length) return;
    kbCol = Math.max(0, Math.min(colIndex, cards.length - 1));
    var card = cards[kbCol];
    card.classList.add('kbfocus');
    card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }

  function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      if (isTypingTarget(document.activeElement)) return;
      if (document.getElementById('browse-modal-overlay').classList.contains('open')) return;

      if (e.key === 'Escape') {
        // Focused on a game via keyboard nav: Escape's only job here is to
        // drop that focus, not to also close the search or anything else.
        if (kbRow !== -1) {
          e.preventDefault();
          kbRow = -1;
          clearKbFocus();
        }
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].indexOf(e.key) === -1) return;

      var tracks = getNavTracks();
      if (!tracks.length) return;

      if (kbRow === -1) {
        e.preventDefault();
        document.body.classList.add('browse-hide-cursor');
        var startPos = findCenterPosition(tracks);
        kbRow = startPos ? startPos.row : 0;
        setKbFocus(tracks[kbRow], startPos ? startPos.col : 0);
        return;
      }

      e.preventDefault();
      document.body.classList.add('browse-hide-cursor');
      var track = tracks[kbRow];

      if (e.key === 'ArrowRight') {
        setKbFocus(track, kbCol + 1);
      } else if (e.key === 'ArrowLeft') {
        setKbFocus(track, kbCol - 1);
      } else if (e.key === 'ArrowDown') {
        if (kbRow < tracks.length - 1) { kbRow++; setKbFocus(tracks[kbRow], kbCol); }
      } else if (e.key === 'ArrowUp') {
        if (kbRow > 0) { kbRow--; setKbFocus(tracks[kbRow], kbCol); }
        else { kbRow = -1; clearKbFocus(); }
      } else if (e.key === 'Enter') {
        var focused = document.querySelector('.browse-card.kbfocus');
        var game = focused && allGamesById[focused.getAttribute('data-gameid')];
        if (game) openModal(game);
      }
    });
  }

  function makeRow(category) {
    var row = document.createElement('section');
    row.className = 'browse-row';

    var titleWrap = document.createElement('div');
    titleWrap.className = 'browse-row-title-wrap';
    var title = document.createElement('h2');
    title.className = 'browse-row-title';
    title.textContent = category.title;
    titleWrap.appendChild(title);
    if (category.typeLabel) {
      var typeLabel = document.createElement('div');
      typeLabel.className = 'browse-row-type-label';
      typeLabel.textContent = category.typeLabel;
      titleWrap.appendChild(typeLabel);
    }
    var bar = document.createElement('div');
    bar.className = 'browse-row-title-bar';
    titleWrap.appendChild(bar);
    row.appendChild(titleWrap);

    var wrap = document.createElement('div');
    wrap.className = 'browse-row-track-wrap';

    var track = document.createElement('div');
    track.className = 'browse-row-track';
    category.games.forEach(function (game) {
      track.appendChild(makeCard(game));
    });
    // Chrome tries to restore each scrollable element's previous scroll
    // position on reload/back-navigation, which made rows start mid-scroll
    // unpredictably. Force every row back to its start.
    track.scrollLeft = 0;

    var prevBtn = document.createElement('button');
    prevBtn.className = 'browse-row-nav prev';
    prevBtn.setAttribute('aria-label', 'Précédent');
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -track.clientWidth * 0.9, behavior: 'smooth' });
    });

    var nextBtn = document.createElement('button');
    nextBtn.className = 'browse-row-nav next';
    nextBtn.setAttribute('aria-label', 'Suivant');
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: track.clientWidth * 0.9, behavior: 'smooth' });
    });

    // Hide whichever nav button would have no effect (already at that end).
    function updateNavButtons() {
      prevBtn.classList.toggle('disabled', track.scrollLeft <= 1);
      prevBtn.disabled = track.scrollLeft <= 1;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      nextBtn.classList.toggle('disabled', atEnd);
      nextBtn.disabled = atEnd;
    }
    track.addEventListener('scroll', updateNavButtons, { passive: true });
    window.addEventListener('resize', updateNavButtons, { passive: true });
    // The track isn't attached to the document yet, so its width would read
    // as 0 - measure once the browser has actually laid it out.
    requestAnimationFrame(updateNavButtons);

    wrap.appendChild(track);
    wrap.appendChild(prevBtn);
    wrap.appendChild(nextBtn);
    row.appendChild(wrap);

    return row;
  }

  function renderRows(categories) {
    currentCategories = categories;
    kbRow = -1;
    clearKbFocus();

    var container = document.getElementById('browse-rows');
    container.innerHTML = '';

    if (!categories.length) {
      container.innerHTML = '<p class="browse-loading">Aucune catégorie disponible pour le moment.</p>';
      return;
    }

    categories.forEach(function (category) {
      container.appendChild(makeRow(category));
    });
  }

  /* ---------- Full detail modal (singleton) ---------- */

  function initModal() {
    document.getElementById('browse-modal-close').addEventListener('click', closeModal);
    document.getElementById('browse-modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('browse-modal-overlay');
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { closeModal(); return; }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Scroll the modal's own content instead of the page behind it.
        e.preventDefault();
        overlay.scrollBy({ top: e.key === 'ArrowDown' ? 120 : -120, behavior: 'smooth' });
        return;
      }

      if (e.key !== 'Enter') return;
      var active = document.activeElement;
      // Don't hijack Enter on a genuinely focused control inside the modal
      // (rating thumbs, the favorite button) - let it activate normally.
      if (active && active.tagName === 'BUTTON') return;
      e.preventDefault();
      activateCard(document.getElementById('browse-modal-play'));
    });

    document.getElementById('browse-modal-fav').addEventListener('click', function () {
      var gameId = this.getAttribute('data-fav-for');
      if (gameId) toggleFavorite(gameId, this);
    });

    document.querySelectorAll('.browse-rating-thumb').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var gameId = document.getElementById('browse-modal').getAttribute('data-gameid');
        if (!gameId) return;
        var rating = parseInt(this.dataset.rating, 10);
        submitRating(gameId, rating).then(function () {
          refreshModalRating(gameId);
        });
      });
    });
  }

  /* ---------- Auto-fetched description (Wikipedia, free/no-key) ---------- */
  /* Used only when a game has no curated `description`. Tries French
     Wikipedia first (no translation needed), falls back to English. */

  var wikiDescCache = {};

  function normalizeTitleTokens(str) {
    return normalizeForSearch(str)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length >= 3; });
  }

  // The MediaWiki search fallback especially can surface a page that isn't
  // actually about this game (e.g. an obscure homebrew title matching some
  // unrelated blockbuster) - only trust a result that shares a real word
  // with the game's own title. Titles too short to tokenize meaningfully
  // (e.g. "Qix") can't be checked, so those are let through unguarded.
  function titlesLikelyMatch(gameTitle, foundTitle) {
    var gameTokens = normalizeTitleTokens(gameTitle);
    if (!gameTokens.length) return true;
    var foundTokens = normalizeTitleTokens(foundTitle);
    return gameTokens.some(function (t) { return foundTokens.indexOf(t) !== -1; });
  }

  function wikipediaSummary(lang, title, gameTitle) {
    var url = 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' +
      encodeURIComponent(title.replace(/ /g, '_'));
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.extract || data.type === 'disambiguation') return null;
      if (!titlesLikelyMatch(gameTitle, data.title)) return null;
      var pageUrl = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page;
      return { text: data.extract, url: pageUrl };
    }).catch(function () { return null; });
  }

  function wikipediaSearchTitle(lang, query) {
    var url = 'https://' + lang + '.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=' +
      encodeURIComponent(query);
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var hit = data && data.query && data.query.search && data.query.search[0];
      return hit ? hit.title : null;
    }).catch(function () { return null; });
  }

  function fetchWikipediaDescription(game) {
    if (game.id in wikiDescCache) return Promise.resolve(wikiDescCache[game.id]);
    var title = getDisplayTitle(game);

    function tryLang(lang, searchQuery) {
      return wikipediaSummary(lang, title, title).then(function (result) {
        if (result) return result;
        return wikipediaSearchTitle(lang, searchQuery).then(function (foundTitle) {
          return foundTitle ? wikipediaSummary(lang, foundTitle, title) : null;
        });
      });
    }

    return tryLang('fr', title + ' jeu vidéo').then(function (result) {
      if (result) { result.lang = 'fr'; return result; }
      return tryLang('en', title + ' video game').then(function (result2) {
        if (result2) result2.lang = 'en';
        return result2;
      });
    }).then(function (result) {
      wikiDescCache[game.id] = result;
      return result;
    });
  }

  function openModal(game) {
    var modal = document.getElementById('browse-modal');
    modal.setAttribute('data-gameid', game.id);

    document.getElementById('browse-modal-img').src = game.coverArt || PLACEHOLDER_COVER;
    document.getElementById('browse-modal-title').textContent = getDisplayTitle(game);
    document.getElementById('browse-modal-play').href = game.pageUrl || ('/b/' + game.id);

    var favBtn = document.getElementById('browse-modal-fav');
    favBtn.setAttribute('data-fav-for', game.id);
    setFavButtonState(favBtn, favoriteIds.has(game.id));

    var metaParts = [];
    if (game.year) metaParts.push(game.year);
    getGenres(game).forEach(function (g) { metaParts.push(g); });
    if (game.developer) metaParts.push(game.developer);
    document.getElementById('browse-modal-meta').innerHTML =
      metaParts.map(function (p) { return '<span>' + escapeHtml(p) + '</span>'; }).join('');

    var descEl = document.getElementById('browse-modal-desc');
    var descSourceEl = document.getElementById('browse-modal-desc-source');
    descSourceEl.innerHTML = '';

    if (game.description) {
      descEl.textContent = game.description;
    } else {
      descEl.textContent = 'Recherche d’une description...';
      fetchWikipediaDescription(game).then(function (result) {
        if (document.getElementById('browse-modal').getAttribute('data-gameid') !== game.id) return;
        if (result) {
          descEl.textContent = result.text;
          var note = result.lang === 'en' ? ' (en anglais)' : '';
          descSourceEl.innerHTML = '<a href="' + escapeHtml(result.url || '#') + '" target="_blank" rel="noopener">Source : Wikipédia' + note + '</a>';
        } else {
          descEl.textContent = 'Découvrez ' + getDisplayTitle(game) + ' sur BonjourArcade.';
        }
      });
    }

    var detailsHtml = '<dl>';
    if (game.to_start) detailsHtml += '<dt>Démarrer</dt><dd>' + escapeHtml(game.to_start) + '</dd>';
    if (Array.isArray(game.controls) && game.controls.length) {
      detailsHtml += '<dt>Contrôles</dt><dd><ul>' + game.controls.map(function (c) { return '<li>' + escapeHtml(c) + '</li>'; }).join('') + '</ul></dd>';
    }
    detailsHtml += '</dl>';
    document.getElementById('browse-modal-details').innerHTML = detailsHtml;

    document.getElementById('browse-modal-score').innerHTML = 'Chargement du classement...';

    document.getElementById('browse-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    refreshModalRating(game.id);
    loadTopScore(game.id);
  }

  function refreshModalRating(gameId) {
    if (typeof window.getGameRatings !== 'function') return;
    window.getGameRatings(gameId).then(function (data) {
      if (!data || document.getElementById('browse-modal').getAttribute('data-gameid') !== gameId) return;
      var count = data.count || 0;
      var dist = data.distribution || {};
      var sum = (dist['2'] || 0) * 2 + (dist['1'] || 0) * 1 + (dist['-1'] || 0) * -1 + (dist['-2'] || 0) * -2;
      var sumDisplay = count > 0 ? (sum > 0 ? '+' : '') + sum : '-';
      document.getElementById('browse-modal-rating-average').textContent = sumDisplay;
      document.getElementById('browse-modal-rating-count').textContent = count > 0 ? '(' + count + ')' : '';

      document.querySelectorAll('.browse-rating-thumb').forEach(function (btn) {
        var r = parseInt(btn.dataset.rating, 10);
        btn.classList.toggle('active', r === data.userRating);
      });

      var loginPrompt = document.getElementById('browse-modal-rating-login');
      loginPrompt.style.display = currentUid() ? 'none' : 'block';
    }).catch(function (err) { console.error('Error fetching ratings:', err); });
  }

  function loadTopScore(gameId) {
    var el = document.getElementById('browse-modal-score');
    if (typeof window.fetchLeaderboardScores !== 'function') {
      el.innerHTML = '';
      return;
    }
    window.fetchLeaderboardScores(gameId).then(function (data) {
      if (document.getElementById('browse-modal').getAttribute('data-gameid') !== gameId) return;
      var scores = data && data.result && data.result.scores;
      if (scores && scores.length) {
        var top = scores[0];
        el.innerHTML = '🏆 Meilleur score : <strong>' + escapeHtml(top.player || '?') + '</strong> - ' +
          escapeHtml(String(top.score)) + ' &nbsp;<a href="/scores/' + encodeURIComponent(gameId) + '">Voir le classement complet →</a>';
      } else {
        el.innerHTML = '<a href="/scores/' + encodeURIComponent(gameId) + '">Voir le classement →</a>';
      }
    }).catch(function () {
      el.innerHTML = '';
    });
  }

  function closeModal() {
    document.getElementById('browse-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------- Tournament toast ---------- */
  /* Shows at most once per session, only when a tournament is live/joinable. */

  function initTournamentToast() {
    var toast = document.getElementById('browse-tournament-toast');
    if (!toast || !window.TournoiUtils) return;

    var shownKey = 'browseTournamentToastShown';
    try {
      if (sessionStorage.getItem(shownKey) === '1') return;
    } catch (e) { /* ignore */ }

    var hideTimer;
    function dismiss() {
      clearTimeout(hideTimer);
      toast.classList.remove('open');
    }
    document.getElementById('browse-toast-close').addEventListener('click', dismiss);

    function waitForFunctions(cb, attempts) {
      attempts = attempts || 0;
      if (window.httpsCallable && window.firebaseFunctions) { cb(); return; }
      if (attempts > 25) return;
      setTimeout(function () { waitForFunctions(cb, attempts + 1); }, 200);
    }

    waitForFunctions(function () {
      TournoiUtils.callFunction('getPublicTournaments', {}).then(function (result) {
        var tournaments = (result && result.success && result.tournaments) || [];
        if (!tournaments.length) return;

        var candidate = tournaments.find(function (t) { return t.status === 'active' && TournoiUtils.isJoinable(t); }) ||
          tournaments.find(function (t) { return TournoiUtils.isJoinable(t); });
        if (!candidate) return;

        try { sessionStorage.setItem(shownKey, '1'); } catch (e) { /* ignore */ }

        document.getElementById('browse-toast-title').textContent = candidate.name || 'Tournoi';

        var bodyParts = [];
        if (candidate.status === 'active') {
          bodyParts.push('En cours — Ronde ' + ((candidate.currentRoundIndex || 0) + 1) + '/' + (candidate.games ? candidate.games.length : '?'));
          var currentGameId = candidate.currentGame || (candidate.games && candidate.games[candidate.currentRoundIndex || 0]);
          if (currentGameId) {
            var g = allGamesById[currentGameId];
            bodyParts.push('🎮 ' + (g ? getDisplayTitle(g) : currentGameId));
          }
        } else {
          bodyParts.push('Inscriptions ouvertes');
        }
        document.getElementById('browse-toast-body').textContent = bodyParts.join(' · ');
        document.getElementById('browse-toast-link').href = '/tournoi/play/?t=' + encodeURIComponent(candidate.id);

        var bar = document.getElementById('browse-toast-progress-bar');
        bar.style.animationDuration = TOAST_VISIBLE_MS + 'ms';

        toast.classList.add('open');
        hideTimer = setTimeout(dismiss, TOAST_VISIBLE_MS);
      }).catch(function () { /* silently skip the toast on error */ });
    });
  }

  /* ---------- Init ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    initIntro();
    initTheme();
    initHeaderScroll();
    initLogoSpin();
    initCursorAutoHide();
    initDropdowns();
    initMobileNav();
    initSearch();
    initModal();
    initKeyboardNav();
    initFavoritesTracking();
    initAccountUI();

    fetchCurrentGameId()
      .then(function (currentGameId) {
        return window.fetchGamelist({}).then(function (data) {
          return { data: data, currentGameId: currentGameId };
        });
      })
      .then(function (result) {
        var allGames = result.data.games.filter(isVisible);
        if (!allGames.length) {
          document.getElementById('browse-rows').innerHTML =
            '<p class="browse-loading">Aucun jeu trouvé.</p>';
          return;
        }

        allGamesList = allGames;
        allGames.forEach(function (g) { allGamesById[g.id] = g; });

        var heroGame = pickHeroGame(allGames, result.currentGameId);
        renderHero(heroGame);

        var categories = buildCategories(allGames, heroGame);
        renderRows(categories);

        initTournamentToast();
      })
      .catch(function (err) {
        console.error(err);
        document.getElementById('browse-rows').innerHTML =
          '<p class="browse-loading">Erreur de chargement des jeux.</p>';
      });
  });

  function fetchCurrentGameId() {
    return fetch('/api/current-game')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (text) {
        if (!text) return null;
        var id = text.trim();
        return id === 'no-game' ? null : id;
      })
      .catch(function () { return null; });
  }
})();
