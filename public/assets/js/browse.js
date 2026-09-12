(function () {
  'use strict';

  // Chrome/Safari otherwise try to restore this page's (and its scrollable
  // rows') previous scroll position on reload/back-navigation.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var MAX_GAMES_PER_ROW = 20;
  // A category needs at least this many games to be worth a row at all.
  var MIN_GAMES_PER_CATEGORY = 3;
  // Below this, a category doesn't need the full row width to itself - it's
  // paired side by side with the next small category instead (desktop only).
  var PAIRED_ROW_MAX_GAMES = 5;
  var PLACEHOLDER_COVER = '/assets/images/placeholder_thumb.png';

  var allGamesById = {};
  var allGamesList = [];
  var currentCategories = [];
  var favoriteIds = new Set();
  var likedIds = new Set();
  var favoritesUnsub = null;
  var BURST_DELAY = 320;
  var TOAST_VISIBLE_MS = 9000;
  var IDLE_TIMEOUT_MS = 10 * 60 * 1000;
  var IDLE_COUNTDOWN_SECONDS = 15;

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

  function getDevelopers(game) {
    var dev = (game.developer || '').trim();
    if (!dev) return [];
    return dev.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
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

  var searchHeroHidden = false;
  var updateHeaderSolid = function () {};

  function initHeaderScroll() {
    var header = document.getElementById('browse-header');
    updateHeaderSolid = function () {
      header.classList.toggle('browse-header-solid', window.scrollY > 80 || searchHeroHidden);
    };
    window.addEventListener('scroll', updateHeaderSolid, { passive: true });
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

  // On narrow viewports, everything except search and the profile/login
  // control moves into the hamburger dropdown instead of staying in the
  // header bar. Reparent the real nodes (rather than duplicating them) so
  // existing getElementById lookups and event listeners keep working no
  // matter where they currently sit in the DOM.
  function initMobileHeaderMenu() {
    var nav = document.querySelector('[data-browse-menu]');
    var admin = document.getElementById('browse-admin-link');
    var theme = document.getElementById('browse-theme-toggle');
    if (!nav || !admin || !theme) return;

    var adminAnchor = document.createComment('browse-admin-link-anchor');
    var themeAnchor = document.createComment('browse-theme-toggle-anchor');
    admin.parentNode.insertBefore(adminAnchor, admin);
    theme.parentNode.insertBefore(themeAnchor, theme);

    var mq = window.matchMedia('(max-width: 900px)');
    function apply(isMobile) {
      if (isMobile) {
        nav.appendChild(admin);
        nav.appendChild(theme);
      } else {
        adminAnchor.parentNode.insertBefore(admin, adminAnchor);
        themeAnchor.parentNode.insertBefore(theme, themeAnchor);
      }
    }
    apply(mq.matches);
    mq.addEventListener('change', function (e) { apply(e.matches); });
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
        // Close other dropdowns/search, but NOT the mobile nav panel - this
        // button lives inside it on narrow viewports.
        closeAllDropdowns();
        closeSearch();
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

    // Only auto-close on outside clicks/dropdown switches when the box is
    // empty - a typed query shouldn't vanish just because focus moved
    // elsewhere. Clearing the input first (as the toggle button does) lets
    // it close normally through this same check.
    closeSearch = function () {
      if (input.value.trim()) return;
      wrap.classList.remove('open');
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = wrap.classList.contains('open');
      closeAllDropdowns();
      if (isOpen) {
        input.value = '';
        performSearch('');
        closeSearch();
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

  // Pre-fills /all's own title-search filter (stored under its localStorage
  // key) so following the "recherche avancée" link lands on the same query
  // instead of an empty filter list.
  function goToAdvancedSearch(query) {
    try {
      localStorage.setItem('bonjourarcade_all_filters_v1', JSON.stringify({ searchType: 'title', searchInput: query }));
    } catch (e) { /* ignore */ }
  }

  function makeAdvancedSearchLink(query) {
    var p = document.createElement('p');
    p.className = 'browse-advanced-search-link';
    p.appendChild(document.createTextNode('Pas ce que vous cherchez ? Essayez la '));
    var a = document.createElement('a');
    a.href = '/all';
    a.textContent = '🔍 Recherche avancée';
    a.addEventListener('click', function () { goToAdvancedSearch(query); });
    p.appendChild(a);
    return p;
  }

  function performSearch(query) {
    var q = normalizeForSearch(query.trim());
    setHeroHidden(!!q);
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
      container.appendChild(makeAdvancedSearchLink(query.trim()));
      return;
    }
    container.appendChild(makeRow({
      title: 'Résultats pour « ' + query.trim() + ' »',
      games: matches,
      grid: true,
      clearLabel: '✕ Effacer',
      onClear: function () {
        var input = document.getElementById('browse-search-input');
        var wrap = document.querySelector('[data-browse-search]');
        if (input) input.value = '';
        if (wrap) wrap.classList.remove('open');
        performSearch('');
      }
    }));
    container.appendChild(makeAdvancedSearchLink(query.trim()));
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
    var icon = btn.querySelector('.browse-fav-icon');
    if (icon) icon.textContent = isFav ? '❤️' : '🤍';
    var label = btn.querySelector('.browse-fav-label');
    var text = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
    if (label) label.textContent = text;
    btn.title = text;
    btn.setAttribute('aria-label', text);
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
    // Two poster links, only one of which is ever visible (see the
    // .browse-hero-poster / .browse-hero-poster-large CSS): a small one
    // next to the title on narrow screens, a large showcase one on the
    // hero's own empty right side everywhere else. Both are links so
    // clicking the art itself launches the game, same as "Jouer".
    var poster = document.getElementById('browse-hero-poster');
    var posterLarge = document.getElementById('browse-hero-poster-large');
    var title = document.getElementById('browse-hero-title');
    var meta = document.getElementById('browse-hero-meta');
    var desc = document.getElementById('browse-hero-desc');
    var play = document.getElementById('browse-hero-play');
    var favBtn = document.getElementById('browse-hero-fav');
    var infoBtn = document.getElementById('browse-hero-info');

    var cover = game.coverArt || PLACEHOLDER_COVER;
    backdrop.style.backgroundImage = 'url(' + cover + ')';
    // The backdrop is a cropped, stretched blow-up of the cover behind the
    // whole hero (for atmosphere) - the posters show that same art in full,
    // undistorted, so the featured game's actual box art is still visible.
    var playHref = game.pageUrl || ('/b/' + game.id);
    [poster, posterLarge].forEach(function (link) {
      if (!link) return;
      link.href = playHref;
      var img = link.querySelector('img');
      img.src = cover;
      img.alt = getDisplayTitle(game);
    });
    title.textContent = getDisplayTitle(game);

    var metaParts = [];
    if (game.year) metaParts.push(game.year);
    if (game.genre) metaParts.push(game.genre);
    if (game.developer) metaParts.push(game.developer);
    meta.innerHTML = metaParts.map(function (p) { return '<span>' + escapeHtml(p) + '</span>'; }).join('');

    desc.textContent = game.description ||
      ('Découvrez ' + getDisplayTitle(game) + ', jeu en vedette cette semaine sur BonjourArcade.');

    play.href = playHref;

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
        var comment = (s.comment || '').trim().slice(0, 200);
        var commentAttr = comment ? ' data-comment="' + escapeHtml(comment) + '"' : '';
        var commentIcon = comment ? ' <span class="browse-hero-leaderboard-comment-icon" aria-label="Commentaire disponible">💬</span>' : '';
        return '<div class="browse-hero-leaderboard-row"' + commentAttr + '>' +
          '<span class="browse-hero-leaderboard-rank">#' + (i + 1) + '</span>' +
          '<span class="browse-hero-leaderboard-name">' + escapeHtml(s.player || '?') + '</span>' +
          commentIcon +
          '<span class="browse-hero-leaderboard-score">' + escapeHtml(String(s.score)) + '</span>' +
          '</div>';
      }).join('');
      wrap.style.display = 'block';
    }).catch(function () { wrap.style.display = 'none'; });
  }

  // The comment tooltip follows the cursor rather than being pinned to the
  // hovered row, so it stays centered above wherever the mouse actually is
  // (a row can be much wider than the comment icon the user is pointing at).
  function initLeaderboardTooltip() {
    var tooltip = document.getElementById('browse-leaderboard-tooltip');
    var container = document.getElementById('browse-hero-leaderboard-list');
    if (!tooltip || !container || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    container.addEventListener('mousemove', function (e) {
      var row = e.target.closest && e.target.closest('.browse-hero-leaderboard-row[data-comment]');
      if (!row) { tooltip.style.display = 'none'; return; }
      tooltip.textContent = row.getAttribute('data-comment');
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = (e.clientY - 12) + 'px';
      tooltip.style.display = 'block';
    });
    container.addEventListener('mouseleave', function () {
      tooltip.style.display = 'none';
    });
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
    year: 'Année',
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

    var year = parseInt(game.year, 10);
    if (!isNaN(year)) keys.push({ key: 'year:' + year, title: 'Sortis en ' + year, type: 'year' });

    var decadeLabel = getDecadeLabel(game);
    if (decadeLabel) keys.push({ key: 'decade:' + decadeLabel, title: decadeLabel, type: 'decade' });

    getDevelopers(game).forEach(function (dev) {
      keys.push({ key: 'dev:' + dev.toLowerCase(), title: dev, type: 'dev' });
    });

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

    // There are far more distinct exact years than decades, so left
    // unchecked every eligible year gets its own row and drowns out
    // everything else. Cap how many show up per page load to roughly match
    // how many decade rows exist - a different random subset each reload.
    var decadeKeyCount = eligible.filter(function (k) { return groups[k].type === 'decade'; }).length;
    var yearKeys = eligible.filter(function (k) { return groups[k].type === 'year'; });
    if (yearKeys.length > decadeKeyCount) {
      var keptYearKeys = shuffleArray(yearKeys).slice(0, Math.max(decadeKeyCount, 1));
      var keptYearSet = {};
      keptYearKeys.forEach(function (k) { keptYearSet[k] = true; });
      eligible = eligible.filter(function (k) { return groups[k].type !== 'year' || keptYearSet[k]; });
    }

    // Feature one row per dimension the hero game itself belongs to (shared
    // genre, system, decade, developer), so browsing has several obvious
    // jumping-off points from whatever's currently spotlighted - not just
    // whichever dimension happens to be listed first.
    var relatedKeys = [];
    if (heroGame) {
      var heroKeys = getGameCategoryKeys(heroGame).map(function (k) { return k.key; });
      var seenTypes = {};
      heroKeys.forEach(function (k) {
        if (eligible.indexOf(k) === -1) return;
        var type = groups[k].type;
        if (seenTypes[type]) return;
        seenTypes[type] = true;
        relatedKeys.push(k);
      });
      relatedKeys = shuffleArray(relatedKeys);
    }

    var rest = eligible.filter(function (k) { return relatedKeys.indexOf(k) === -1; });
    var chosenKeys = relatedKeys.concat(shuffleArray(rest));

    return chosenKeys.map(function (key) {
      var entry = groups[key];
      var isRelated = relatedKeys.indexOf(key) !== -1;
      var prefix = /^[aeiouhâàéèêëîïôùûüœ]/i.test(entry.title) ? "Plus d'" : 'Plus de ';
      var relatedTitle = entry.type === 'genre' ? pluralizeGenre(entry.title) : entry.title;
      var shuffled = shuffleArray(entry.games);
      return {
        title: isRelated ? prefix + relatedTitle : entry.title,
        typeLabel: CATEGORY_TYPE_LABELS[entry.type] || '',
        games: shuffled.slice(0, MAX_GAMES_PER_ROW),
        // Kept separately (unsliced) so clicking the row title can open an
        // expand panel with every matching game, not just the row's own
        // carousel preview.
        allGames: shuffled,
        related: isRelated
      };
    });
  }

  // Genre names are stored as singular English gameplay terms (Shooter,
  // Puzzle...), but the "Plus de ___" heading reads better in the plural
  // ("Plus de shooters", "Plus de puzzles"). Only pluralize the last word,
  // and leave gerunds (Racing, Fighting...) and already-plural names
  // (Sports, Minigames...) untouched rather than mangling them.
  function pluralizeGenre(title) {
    var match = /^(.*\s)?(\S+)$/.exec(title);
    if (!match) return title;
    var head = match[1] || '';
    var last = match[2];
    if (/(ing|s)$/i.test(last)) return title;
    if (/[^aeiou]y$/i.test(last)) return head + last.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/i.test(last)) return head + last + 'es';
    return head + last + 's';
  }

  // Builds a "recently played" pseudo-category from this browser's local
  // play history, so it isn't tied to genre/system/decade/developer grouping.
  function buildRecentlyPlayedCategory() {
    if (typeof getHistoryGameIds !== 'function') return null;
    var games = getHistoryGameIds()
      .map(function (id) { return allGamesById[id]; })
      .filter(Boolean);
    if (!games.length) return null;
    return { title: 'Continuer?', typeLabel: '', games: games.slice(0, MAX_GAMES_PER_ROW), clearable: true, directPlay: true };
  }

  function makeCard(game, directPlay) {
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
      // "Continuer?" cards skip the description modal - the anchor's own
      // href (set above) already points straight at the game.
      if (directPlay) return;
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
    return Array.prototype.slice.call(document.querySelectorAll('.browse-row-track, .browse-row-grid'));
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

  function setHeroHidden(hidden) {
    var hero = document.getElementById('browse-hero');
    var rows = document.getElementById('browse-rows');
    var header = document.getElementById('browse-header');
    searchHeroHidden = hidden;
    if (hero) hero.style.display = hidden ? 'none' : '';
    // The header is fixed and normally floats over the hero's own height;
    // with the hero hidden the rows need that space back so they don't
    // start underneath it.
    if (rows) rows.style.paddingTop = hidden && header ? header.offsetHeight + 'px' : '';
    updateHeaderSolid();
  }

  function makeRow(category) {
    var row = document.createElement('section');
    row.className = 'browse-row';

    var titleWrap = document.createElement('div');
    titleWrap.className = 'browse-row-title-wrap';
    var title = document.createElement('h2');
    title.className = 'browse-row-title';
    title.textContent = category.title;

    var track, expandPanel, expandGrid, expandBuilt;
    // Only the games beyond what the carousel itself already previews -
    // otherwise a category with few enough games would open a panel that
    // just repeats the exact same cards the carousel already shows.
    var extraGames = category.allGames ? category.allGames.slice(category.games.length) : [];

    // Rows built from a genre/system/year/decade/developer grouping carry
    // their full game list separately (see buildCategories) - clicking the
    // title slides open a panel with the rest of that category's games in a
    // grid below the carousel, so browsing all of it doesn't mean fighting
    // a cramped horizontal scroller. Clicking again slides it back shut.
    if (extraGames.length) {
      title.classList.add('browse-row-title-clickable');
      title.tabIndex = 0;
      title.setAttribute('role', 'button');
      title.setAttribute('aria-expanded', 'false');
      title.setAttribute('aria-label', 'Voir tous les jeux : ' + category.title);

      var chevron = document.createElement('span');
      chevron.className = 'browse-row-chevron';
      chevron.textContent = '▸';
      chevron.setAttribute('aria-hidden', 'true');
      title.appendChild(chevron);

      var toggleExpand = function () {
        var opening = title.getAttribute('aria-expanded') !== 'true';
        title.setAttribute('aria-expanded', String(opening));
        title.setAttribute('aria-label', (opening ? 'Fermer' : 'Voir tous les jeux : ') + category.title);
        if (opening && !expandBuilt) {
          expandBuilt = true;
          extraGames.forEach(function (game) { expandGrid.appendChild(makeCard(game, category.directPlay)); });
        }
        expandPanel.classList.toggle('open', opening);
      };
      title.addEventListener('click', toggleExpand);
      title.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); }
      });
    }
    titleWrap.appendChild(title);
    if (category.typeLabel) {
      var typeLabel = document.createElement('div');
      typeLabel.className = 'browse-row-type-label';
      typeLabel.textContent = category.typeLabel;
      titleWrap.appendChild(typeLabel);
    }
    if (category.clearable || category.onClear) {
      var clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'browse-row-clear-btn';
      clearBtn.textContent = category.clearLabel || '✕ Vider';
      clearBtn.addEventListener('click', function () {
        if (category.onClear) {
          category.onClear();
        } else {
          if (typeof clearGameHistory === 'function') clearGameHistory();
          renderRows(currentCategories.filter(function (c) { return c !== category; }));
        }
      });
      titleWrap.appendChild(clearBtn);
    }
    var bar = document.createElement('div');
    bar.className = 'browse-row-title-bar';
    titleWrap.appendChild(bar);
    row.appendChild(titleWrap);

    // Search results aren't a browsable carousel of a handful of picks -
    // they're the whole match list, so lay them out as a wrapping grid the
    // user scrolls down the page instead of a horizontally-scrolled row.
    if (category.grid) {
      var grid = document.createElement('div');
      grid.className = 'browse-row-grid';
      category.games.forEach(function (game) {
        grid.appendChild(makeCard(game, category.directPlay));
      });
      row.appendChild(grid);
      return row;
    }

    var wrap = document.createElement('div');
    wrap.className = 'browse-row-track-wrap';

    track = document.createElement('div');
    track.className = 'browse-row-track';
    category.games.forEach(function (game) {
      track.appendChild(makeCard(game, category.directPlay));
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

    if (extraGames.length) {
      // Collapsed to zero height via the grid-template-rows trick (see the
      // CSS) so opening/closing it animates smoothly without having to
      // measure and animate an actual pixel height in JS.
      expandPanel = document.createElement('div');
      expandPanel.className = 'browse-row-expand-panel';
      var expandPanelInner = document.createElement('div');
      expandPanelInner.className = 'browse-row-expand-panel-inner';
      expandGrid = document.createElement('div');
      expandGrid.className = 'browse-row-expand-grid';
      expandPanelInner.appendChild(expandGrid);
      expandPanel.appendChild(expandPanelInner);
      row.appendChild(expandPanel);
    }

    return row;
  }

  // How many category rows show up front - the rest stay behind a "load
  // more" button so a fresh visit doesn't have to load/render every row's
  // covers at once.
  var HOME_ROW_PAGE_SIZE = 12;

  // Consecutive categories with few enough games are paired side by side
  // (desktop only - see .browse-row-pair) instead of each claiming a full
  // row's width; a small category with no small neighbor just renders alone.
  function appendCategoryRows(container, categories) {
    // Don't just pair a small category with whichever one happens to be
    // immediately next - look ahead through the rest of this batch for any
    // other small category to fill the space with, pulling it forward out
    // of its original spot. Only a small category with no small partner
    // left anywhere later in the batch renders alone.
    var list = categories.slice();
    for (var i = 0; i < list.length; i++) {
      var category = list[i];
      if (category.games.length >= PAIRED_ROW_MAX_GAMES) {
        container.appendChild(makeRow(category));
        continue;
      }
      var partnerIndex = -1;
      for (var j = i + 1; j < list.length; j++) {
        if (list[j].games.length < PAIRED_ROW_MAX_GAMES) { partnerIndex = j; break; }
      }
      if (partnerIndex === -1) {
        container.appendChild(makeRow(category));
        continue;
      }
      var partner = list.splice(partnerIndex, 1)[0];
      var pair = document.createElement('div');
      pair.className = 'browse-row-pair';
      pair.appendChild(makeRow(category));
      pair.appendChild(makeRow(partner));
      container.appendChild(pair);
    }
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

    var visible = categories.slice(0, HOME_ROW_PAGE_SIZE);
    var rest = categories.slice(HOME_ROW_PAGE_SIZE);
    appendCategoryRows(container, visible);

    if (rest.length) {
      var loadMoreWrap = document.createElement('div');
      loadMoreWrap.className = 'browse-load-more-wrap';
      var loadMoreBtn = document.createElement('button');
      loadMoreBtn.type = 'button';
      loadMoreBtn.className = 'browse-load-more-btn';
      loadMoreBtn.textContent = 'Charger plus de jeux';
      loadMoreBtn.addEventListener('click', function () {
        loadMoreWrap.remove();
        appendCategoryRows(container, rest);
      });
      loadMoreWrap.appendChild(loadMoreBtn);
      container.appendChild(loadMoreWrap);
    }
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

      var distEl = document.getElementById('browse-modal-rating-dist');
      if (distEl) {
        var labels = { '2': '👍👍', '1': '👍', '-1': '👎', '-2': '👎👎' };
        distEl.innerHTML = count > 0 ? ['2', '1', '-1', '-2'].map(function (r) {
          var n = dist[r] || 0;
          var pct = Math.round((n / count) * 100);
          return '<div class="browse-rating-dist-row" data-rating="' + r + '">' +
            '<span class="browse-rating-dist-label">' + labels[r] + '</span>' +
            '<span class="browse-rating-dist-bar-wrap"><span class="browse-rating-dist-bar" style="width:' + pct + '%"></span></span>' +
            '<span class="browse-rating-dist-count">' + n + '</span>' +
            '</div>';
        }).join('') : '<p class="browse-rating-empty">✨ Ce jeu n\'a pas encore de note — soyez la première personne à donner votre avis !</p>';
      }

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

    // Auto-dismiss counts down on its own, but pauses (see the mouseenter/
    // mouseleave listeners below) while the cursor is over the toast, so
    // reading it or clicking through isn't a race against it disappearing.
    var hideTimer = null;
    var remainingMs = 0;
    var hideStartedAt = null;

    function clearHideTimer() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    function scheduleHide(ms) {
      clearHideTimer();
      remainingMs = ms;
      hideStartedAt = Date.now();
      hideTimer = setTimeout(dismiss, ms);
    }

    function pauseHide() {
      if (!hideTimer) return;
      clearHideTimer();
      remainingMs = Math.max(0, remainingMs - (Date.now() - hideStartedAt));
    }

    function resumeHide() {
      if (hideTimer || remainingMs <= 0) return;
      scheduleHide(remainingMs);
    }

    function dismiss() {
      clearHideTimer();
      remainingMs = 0;
      toast.classList.remove('open');
    }
    document.getElementById('browse-toast-close').addEventListener('click', dismiss);
    toast.addEventListener('mouseenter', pauseHide);
    toast.addEventListener('mouseleave', resumeHide);

    function waitForFunctions(cb, attempts) {
      attempts = attempts || 0;
      if (window.httpsCallable && window.firebaseFunctions) { cb(); return; }
      if (attempts > 25) return;
      setTimeout(function () { waitForFunctions(cb, attempts + 1); }, 200);
    }

    waitForFunctions(function () {
      TournoiUtils.callFunction('getPublicTournaments', {}).then(function (result) {
        var tournaments = (result && result.success && result.tournaments) || [];

        updateCompetitifBadge(tournaments);
        renderActiveTournamentLinks(tournaments);

        if (!tournaments.length) return;

        var shownKey = 'browseTournamentToastShown';
        var alreadyShown = false;
        try { alreadyShown = sessionStorage.getItem(shownKey) === '1'; } catch (e) { /* ignore */ }
        if (alreadyShown) return;

        // isJoinable() means "can a *new* player still register" (only true
        // pre-round-1) - too strict for "is a tournament in progress". Any
        // active tournament should surface here regardless of that.
        var candidate = tournaments.find(function (t) { return t.status === 'active'; }) ||
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
        var toastLink = document.getElementById('browse-toast-link');
        toastLink.href = '/tournoi/play/?t=' + encodeURIComponent(candidate.id);
        toastLink.textContent = TournoiUtils.isJoinable(candidate) ? 'Rejoindre →' : 'Suivre →';

        var bar = document.getElementById('browse-toast-progress-bar');
        bar.style.animationDuration = TOAST_VISIBLE_MS + 'ms';

        toast.classList.add('open');
        scheduleHide(TOAST_VISIBLE_MS);
      }).catch(function () { /* silently skip on error */ });
    });
  }

  function updateCompetitifBadge(tournaments) {
    var badge = document.getElementById('browse-competitif-badge');
    if (!badge) return;
    var activeCount = tournaments.filter(function (t) { return t.status === 'active'; }).length;
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderActiveTournamentLinks(tournaments) {
    var container = document.getElementById('browse-active-tournaments');
    if (!container) return;
    var active = tournaments.filter(function (t) { return t.status === 'active'; });
    container.innerHTML = active.map(function (t) {
      return '<a href="/tournoi/play/?t=' + encodeURIComponent(t.id) + '">🟢 ' + escapeHtml(t.name || 'Tournoi') + '</a>';
    }).join('');
  }

  /* ---------- Idle auto-screensaver ---------- */
  /* After IDLE_TIMEOUT_MS of no interaction, warn the user for
     IDLE_COUNTDOWN_SECONDS before auto-launching the screensaver in random
     mode - mirrors the sessionStorage contract /screensaver's own
     launchScreensaver() sets up, so /randomgame/ picks it up the same way. */

  function initIdleScreensaver() {
    var overlay = document.getElementById('browse-idle-overlay');
    var countdownEl = document.getElementById('browse-idle-countdown');
    var cancelBtn = document.getElementById('browse-idle-cancel');
    if (!overlay || !countdownEl || !cancelBtn) return;

    var idleTimer, countdownTimer;

    function launchScreensaver() {
      try {
        sessionStorage.removeItem('unplayedRandomGames');
        sessionStorage.setItem('screensaverMode', 'true');
        sessionStorage.setItem('screensaverStartTime', Date.now().toString());
        sessionStorage.setItem('screensaverInterval', '150000');
        sessionStorage.setItem('chronologicalOrder', 'false');
        sessionStorage.setItem('screensaverBehavior', 'random');
      } catch (e) { /* ignore */ }
      window.location.href = '/randomgame/';
    }

    function showWarning() {
      // Don't interrupt someone reading a game's details - try again later.
      var gameModal = document.getElementById('browse-modal-overlay');
      if (gameModal && gameModal.classList.contains('open')) {
        idleTimer = setTimeout(showWarning, IDLE_TIMEOUT_MS);
        return;
      }
      var secondsLeft = IDLE_COUNTDOWN_SECONDS;
      countdownEl.textContent = secondsLeft;
      overlay.classList.add('open');
      countdownTimer = setInterval(function () {
        secondsLeft--;
        countdownEl.textContent = secondsLeft;
        if (secondsLeft <= 0) {
          clearInterval(countdownTimer);
          launchScreensaver();
        }
      }, 1000);
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      if (overlay.classList.contains('open')) {
        overlay.classList.remove('open');
        clearInterval(countdownTimer);
      }
      idleTimer = setTimeout(showWarning, IDLE_TIMEOUT_MS);
    }

    cancelBtn.addEventListener('click', resetIdleTimer);
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach(function (evt) {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
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
    initMobileHeaderMenu();
    initSearch();
    initModal();
    initKeyboardNav();
    initFavoritesTracking();
    initAccountUI();
    initLeaderboardTooltip();
    initIdleScreensaver();

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
        var recentCategory = buildRecentlyPlayedCategory();
        if (recentCategory) {
          // Always right after the first "Plus de" row, even when several
          // related rows are featured, per explicit placement request.
          var insertIndex = (categories.length && categories[0].related) ? 1 : 0;
          categories.splice(insertIndex, 0, recentCategory);
        }
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
