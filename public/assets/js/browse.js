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

  // Preloaded nav sound effects. Cloning the node on each play lets rapid
  // key-repeat overlap instead of cutting the previous play short.
  var NAV_SOUNDS = {
    move: new Audio('/assets/sounds/tk.wav'),
    select: new Audio('/assets/sounds/ok.wav'),
    back: new Audio('/assets/sounds/toc.wav'),
    expand: new Audio('/assets/sounds/whoosh.wav'),
    collapse: new Audio('/assets/sounds/shoow.wav')
  };
  function playNavSound(name) {
    var base = NAV_SOUNDS[name];
    if (!base) return;
    base.cloneNode(true).play().catch(function () {});
  }

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

  // escapeHtml doesn't encode quotes (they're only special inside an
  // attribute value, not in text content) - use this instead whenever
  // untrusted text is interpolated into a "..."-quoted HTML attribute.
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
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
      updateHeaderSolid();
    });
  }

  var searchHeroHidden = false;
  var updateHeaderSolid = function () {};

  // The transparent, dark-scrim header only suits dark mode - in light mode
  // the header is always the solid light bar, even over the hero.
  function initHeaderScroll() {
    var header = document.getElementById('browse-header');
    updateHeaderSolid = function () {
      var isLight = !document.body.classList.contains('browse-dark');
      // Forced solid while keyboard nav is active (kbRow/kbOnHero, defined
      // further down but hoisted) so the header stays legible instead of
      // flickering transparent/solid as the selector moves.
      header.classList.toggle('browse-header-solid', isLight || window.scrollY > 80 || searchHeroHidden || kbRow !== -1 || kbOnHero);
    };
    window.addEventListener('scroll', updateHeaderSolid, { passive: true });
    updateHeaderSolid();
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

  // On narrow viewports, the theme toggle moves into the hamburger dropdown
  // instead of staying in the header bar. Reparent the real node (rather
  // than duplicating it) so existing getElementById lookups and event
  // listeners keep working no matter where it currently sits in the DOM.
  // (The admin link already lives in the nav itself, so it needs no
  // reparenting - see index.html.)
  function initMobileHeaderMenu() {
    var nav = document.querySelector('[data-browse-menu]');
    var theme = document.getElementById('browse-theme-toggle');
    if (!nav || !theme) return;

    var themeAnchor = document.createComment('browse-theme-toggle-anchor');
    theme.parentNode.insertBefore(themeAnchor, theme);

    var mq = window.matchMedia('(max-width: 900px)');
    function apply(isMobile) {
      if (isMobile) {
        nav.appendChild(theme);
      } else {
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
    'arcade': 'Coin-Op', 'mame2003_plus': 'Coin-Op', 'atari2600': 'Atari 2600',
    'gb': 'Game Boy', 'gba': 'Game Boy Advance', 'gbc': 'Game Boy Color',
    'segaMD': 'Sega Genesis/Mega Drive', 'segaGG': 'Sega Game Gear', 'segaMS': 'Sega Master System',
    'segaSaturn': 'Sega Saturn', 'sega32x': 'Sega 32X', 'segacd': 'Sega CD', 'nds': 'Nintendo DS', 'jaguar': 'Atari Jaguar',
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
          window.getPendingScoresCount().then(function (count) {
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
  var kbOnHero = false;
  // Caps arrow-key repeat at 10Hz - held-down keys fire much faster than
  // that natively, which made the selector (and its scroll/sound) blow
  // past cards instead of stepping through them.
  var ARROW_KEY_THROTTLE_MS = 100;
  var lastArrowKeyTime = 0;

  // One nav "track" per .browse-row, in document order - but a row whose
  // expand panel ("Voir tous les jeux") is open swaps in that panel's own
  // grid instead of its now-hidden carousel track, so Up/Down/Left/Right
  // actually reach the fold you just opened instead of a hidden, zero-size
  // element (which otherwise still occupied this row's slot and produced
  // nonsensical scroll targets).
  function getNavTracks() {
    var tracks = [];
    Array.prototype.forEach.call(document.querySelectorAll('.browse-row'), function (row) {
      var openPanel = row.querySelector('.browse-row-expand-panel.open');
      if (openPanel) {
        var expandGrid = openPanel.querySelector('.browse-row-expand-grid');
        if (expandGrid) tracks.push(expandGrid);
        return;
      }
      var track = row.querySelector('.browse-row-track');
      if (track) { tracks.push(track); return; }
      var grid = row.querySelector('.browse-row-grid');
      if (grid) tracks.push(grid);
    });
    return tracks;
  }

  // How many cards share the first card's vertical position - i.e. how wide
  // one visual line is. For a single-row carousel (.browse-row-track) every
  // card shares that top, so this returns the whole card count, which makes
  // the Up/Down math below fall through to the next/previous track
  // immediately, same as before this function existed. For a wrapping grid
  // (.browse-row-grid / .browse-row-expand-grid) it stops at the first card
  // that starts a new line, giving the actual column count so Up/Down can
  // move within the grid instead of always jumping to another category.
  function getGridRowSize(track) {
    var cards = track.querySelectorAll('.browse-card');
    if (!cards.length) return 1;
    // offsetTop (layout position), not getBoundingClientRect (rendered,
    // post-transform position) - the focused card itself is shifted up via
    // "transform: translateY(-12px)" for the lift effect (see .kbfocus in
    // browse.css), which otherwise threw this off by looking like a new
    // line started right at the focused card, however many columns the
    // track actually has.
    var firstTop = cards[0].offsetTop;
    var count = 0;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].offsetTop === firstTop) count++;
      else break;
    }
    return count || 1;
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

  var KB_BURST_LAPS = 3;
  var KB_BURST_LAP_MS = 450;
  var KB_DECEL_MS = 900;
  var kbFocusBurstTimeout = null;
  var kbFocusDecelTimeout = null;

  function clearKbFocus() {
    var current = document.querySelector('.browse-card.kbfocus');
    if (current) current.classList.remove('kbfocus', 'kbfocus-burst', 'kbfocus-decel');
  }

  function setKbFocus(track, colIndex) {
    clearKbFocus();
    var cards = track.querySelectorAll('.browse-card');
    if (!cards.length) return;
    kbCol = Math.max(0, Math.min(colIndex, cards.length - 1));
    var card = cards[kbCol];
    card.classList.add('kbfocus', 'kbfocus-burst');
    clearTimeout(kbFocusBurstTimeout);
    clearTimeout(kbFocusDecelTimeout);
    kbFocusBurstTimeout = setTimeout(function () {
      card.classList.remove('kbfocus-burst');
      card.classList.add('kbfocus-decel');
      kbFocusDecelTimeout = setTimeout(function () {
        card.classList.remove('kbfocus-decel');
      }, KB_DECEL_MS);
    }, KB_BURST_LAPS * KB_BURST_LAP_MS);
    if (track.classList.contains('browse-row-track')) {
      scrollCardClearOfRowNav(track, card);
    } else {
      scrollCardVerticallyClearOfHeader(card);
    }
  }

  // Scrolls a card into the track's visible area, stopping short of the
  // edges so it doesn't end up hidden behind the overlay prev/next arrows,
  // and also keeps the row itself vertically in view (scrollIntoView's
  // block:'nearest' used to handle this before the horizontal-clearance
  // logic replaced it for tracks with nav arrows).
  // The header is fixed and sits on top of the page, so a card scrolled up
  // near the top must stop clear of its height, not just an arbitrary
  // margin, or the (now-forced-solid) header during keyboard nav would cover
  // the highlighted card's cover. Shared by carousel rows and wrapping grids
  // (fold/search) alike - scrollIntoView has no idea a fixed header is
  // sitting on top of the viewport, so it was leaving grid cards' tops
  // tucked under it.
  function scrollCardVerticallyClearOfHeader(card) {
    var header = document.getElementById('browse-header');
    var margin = 16;
    var topMargin = (header ? header.offsetHeight : 0) + margin;
    var cardRect = card.getBoundingClientRect();
    if (cardRect.top < topMargin) {
      window.scrollBy({ top: cardRect.top - topMargin, behavior: 'smooth' });
    } else if (cardRect.bottom > window.innerHeight - margin) {
      window.scrollBy({ top: cardRect.bottom - (window.innerHeight - margin), behavior: 'smooth' });
    }
  }

  function scrollCardClearOfRowNav(track, card) {
    var wrap = track.closest('.browse-row-track-wrap');
    var nav = wrap && wrap.querySelector('.browse-row-nav');
    var reserve = nav ? nav.getBoundingClientRect().width + 6 : 0;
    var trackRect = track.getBoundingClientRect();
    var cardRect = card.getBoundingClientRect();
    var deltaX = 0;
    if (cardRect.left < trackRect.left + reserve) {
      deltaX = cardRect.left - (trackRect.left + reserve);
    } else if (cardRect.right > trackRect.right - reserve) {
      deltaX = cardRect.right - (trackRect.right - reserve);
    }
    if (deltaX !== 0) {
      track.scrollBy({ left: deltaX, behavior: 'smooth' });
    }

    scrollCardVerticallyClearOfHeader(card);
  }

  // Featured-game (hero) focus: reachable by pressing Up from the top row,
  // since the hero isn't one of getNavTracks()'s rows.
  function clearHeroFocus() {
    var hero = document.getElementById('browse-hero');
    if (hero) hero.classList.remove('kbfocus');
  }

  function focusHero() {
    clearKbFocus();
    kbOnHero = true;
    kbRow = -1;
    var hero = document.getElementById('browse-hero');
    if (hero) hero.classList.add('kbfocus');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHeaderSolid();
  }

  function unfocusHero(tracks) {
    kbOnHero = false;
    clearHeroFocus();
    kbRow = 0;
    setKbFocus(tracks[0], kbCol);
    updateHeaderSolid();
  }

  // Drops keyboard-nav focus entirely (used both by Escape while navigating,
  // and by Escape closing a modal that Enter opened - otherwise the selector
  // was left lit on that card, as if still navigating, once the modal closed).
  function exitKbNav() {
    kbRow = -1;
    kbOnHero = false;
    clearKbFocus();
    clearHeroFocus();
    updateHeaderSolid();
  }

  function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  // Shown once per session the first time keyboard nav kicks in, so first-
  // time keyboard users learn the controls without it nagging on every move.
  // Stays open until explicitly dismissed (OK or the close button) - no
  // auto-hide timer - and "Ne plus afficher" persists across sessions too.
  function showKbNavHintToast() {
    try { if (localStorage.getItem('browseKbNavToastDisabled') === '1') return; } catch (e) { /* ignore */ }
    var shownKey = 'browseKbNavToastShown';
    try { if (sessionStorage.getItem(shownKey) === '1') return; } catch (e) { /* ignore */ }
    var toast = document.getElementById('browse-kbnav-toast');
    if (!toast) return;
    try { sessionStorage.setItem(shownKey, '1'); } catch (e) { /* ignore */ }
    toast.classList.add('open');
  }

  function dismissKbNavToast() {
    var toast = document.getElementById('browse-kbnav-toast');
    if (toast) toast.classList.remove('open');
    var dontShow = document.getElementById('browse-kbnav-toast-dontshow');
    if (dontShow && dontShow.checked) {
      try { localStorage.setItem('browseKbNavToastDisabled', '1'); } catch (e) { /* ignore */ }
    }
  }

  function initKeyboardNav() {
    var kbNavToastCloseBtn = document.getElementById('browse-kbnav-toast-close');
    if (kbNavToastCloseBtn) kbNavToastCloseBtn.addEventListener('click', dismissKbNavToast);
    var kbNavToastOkBtn = document.getElementById('browse-kbnav-toast-ok');
    if (kbNavToastOkBtn) kbNavToastOkBtn.addEventListener('click', dismissKbNavToast);

    document.addEventListener('keydown', function (e) {
      if (isTypingTarget(document.activeElement)) return;
      if (document.getElementById('browse-modal-overlay').classList.contains('open')) return;

      if (e.key === 'Escape') {
        // Focused on a game (or the hero) via keyboard nav: Escape's only
        // job here is to drop that focus, not to also close the search or
        // anything else.
        if (kbRow !== -1 || kbOnHero) {
          e.preventDefault();
          exitKbNav();
          playNavSound('back');
        }
        return;
      }

      var isSpace = e.key === ' ' || e.key === 'Spacebar';
      var isArrow = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown';
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].indexOf(e.key) === -1 && !isSpace) return;

      if (isArrow) {
        var nowTime = Date.now();
        if (nowTime - lastArrowKeyTime < ARROW_KEY_THROTTLE_MS) {
          e.preventDefault();
          return;
        }
        lastArrowKeyTime = nowTime;
      }

      var tracks = getNavTracks();
      if (!tracks.length) return;

      if (kbRow === -1 && !kbOnHero) {
        // Space only acts on an already-focused game's category - it never
        // starts keyboard nav on its own.
        if (isSpace) return;
        e.preventDefault();
        document.body.classList.add('browse-hide-cursor');
        var startPos = findCenterPosition(tracks);
        kbRow = startPos ? startPos.row : 0;
        setKbFocus(tracks[kbRow], startPos ? startPos.col : 0);
        updateHeaderSolid();
        playNavSound('move');
        showKbNavHintToast();
        return;
      }

      e.preventDefault();
      document.body.classList.add('browse-hide-cursor');

      if (kbOnHero) {
        // Only Down (into the grid) and Enter (open the featured game's
        // info) do anything from the hero - Left/Right/Up/Space are no-ops.
        if (e.key === 'ArrowDown') {
          unfocusHero(tracks);
          playNavSound('move');
        } else if (e.key === 'Enter') {
          var heroInfo = document.getElementById('browse-hero-info');
          if (heroInfo) heroInfo.click();
          playNavSound('select');
        }
        return;
      }

      var track = tracks[kbRow];

      if (e.key === 'ArrowRight') {
        setKbFocus(track, kbCol + 1);
        playNavSound('move');
      } else if (e.key === 'ArrowLeft') {
        setKbFocus(track, kbCol - 1);
        playNavSound('move');
      } else if (e.key === 'ArrowDown') {
        var rowSizeDown = getGridRowSize(track);
        var downIndex = kbCol + rowSizeDown;
        if (downIndex < track.querySelectorAll('.browse-card').length) {
          // Still a line below within this same grid/fold.
          setKbFocus(track, downIndex);
          playNavSound('move');
        } else if (kbRow < tracks.length - 1) {
          kbRow++;
          setKbFocus(tracks[kbRow], kbCol);
          playNavSound('move');
        } else {
          // Last row: pull in the next page of rows (if any) instead of
          // dead-ending, and land the selector on the first newly loaded
          // card so navigation keeps going without an extra keypress.
          var loadMoreBtn = document.querySelector('.browse-load-more-btn');
          if (loadMoreBtn) {
            loadMoreBtn.click();
            var newTracks = getNavTracks();
            if (kbRow + 1 < newTracks.length) {
              kbRow++;
              setKbFocus(newTracks[kbRow], 0);
              playNavSound('move');
            }
          }
        }
      } else if (e.key === 'ArrowUp') {
        var upIndex = kbCol - getGridRowSize(track);
        if (upIndex >= 0) {
          // Still a line above within this same grid/fold.
          setKbFocus(track, upIndex);
          playNavSound('move');
        } else if (kbRow > 0) {
          kbRow--;
          setKbFocus(tracks[kbRow], kbCol);
          playNavSound('move');
        } else {
          // Top row: hand off to the featured game instead of dropping
          // focus, and scroll back up so it's actually visible.
          focusHero();
          playNavSound('move');
        }
      } else if (e.key === 'Enter') {
        var focused = document.querySelector('.browse-card.kbfocus');
        var game = focused && allGamesById[focused.getAttribute('data-gameid')];
        if (game) { openModal(game); playNavSound('select'); }
      } else if (isSpace) {
        var focusedCard = document.querySelector('.browse-card.kbfocus');
        var rowEl = focusedCard && focusedCard.closest('.browse-row');
        var rowTitle = rowEl && rowEl.querySelector('.browse-row-title.browse-row-title-clickable');
        if (rowTitle) {
          rowTitle.click();
          // The row's nav track just swapped (carousel <-> expand grid) -
          // move the selector onto whatever it now shows instead of leaving
          // it stuck on the old, now-hidden element.
          var refreshedTracks = getNavTracks();
          if (kbRow > -1 && kbRow < refreshedTracks.length) {
            setKbFocus(refreshedTracks[kbRow], kbCol);
          }
        }
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

    var track, wrap, expandPanel, expandGrid, expandBuilt;
    var isExpandable = false;
    var isExpanded = false;
    // Rows built from a genre/system/year/decade/developer grouping carry
    // their full game list separately (see buildCategories). Whether the
    // title can be clicked isn't a fixed game count - it's whether the
    // carousel actually overflows its own width right now (measured after
    // layout below), so it adapts to any screen size, including mobile's
    // narrower cards, and to window resizes.
    var supportsExpand = !!category.allGames;
    var toggleExpand, updateExpandable;

    function setExpandable(expandable) {
      if (expandable === isExpandable) return;
      isExpandable = expandable;
      title.classList.toggle('browse-row-title-clickable', expandable);
      if (expandable) {
        title.tabIndex = 0;
        title.setAttribute('role', 'button');
        title.setAttribute('aria-expanded', String(isExpanded));
        title.setAttribute('aria-label', (isExpanded ? 'Fermer' : 'Voir tous les jeux : ') + category.title);
      } else {
        title.removeAttribute('tabindex');
        title.removeAttribute('role');
        title.removeAttribute('aria-expanded');
        title.removeAttribute('aria-label');
      }
    }

    if (supportsExpand) {
      var chevron = document.createElement('span');
      chevron.className = 'browse-row-chevron';
      chevron.textContent = '▸';
      chevron.setAttribute('aria-hidden', 'true');
      title.appendChild(chevron);

      // Clicking the title slides open a panel with EVERY matching game in
      // a wrapping grid, replacing the carousel entirely (not appending
      // below it) so browsing all of it never means scrolling a cramped
      // horizontal strip. Clicking again slides it back shut.
      toggleExpand = function () {
        if (!isExpandable) return;
        var opening = !isExpanded;
        isExpanded = opening;
        title.setAttribute('aria-expanded', String(opening));
        title.setAttribute('aria-label', (opening ? 'Fermer' : 'Voir tous les jeux : ') + category.title);
        playNavSound(opening ? 'expand' : 'collapse');
        if (opening && !expandBuilt) {
          expandBuilt = true;
          category.allGames.forEach(function (game) { expandGrid.appendChild(makeCard(game, category.directPlay)); });
        }
        expandPanel.classList.toggle('open', opening);
        wrap.classList.toggle('browse-row-track-wrap-hidden', opening);
      };
      title.addEventListener('click', toggleExpand);
      title.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); }
      });

      updateExpandable = function () {
        if (!track) return;
        setExpandable(track.scrollWidth > track.clientWidth + 1);
      };
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

    wrap = document.createElement('div');
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

    if (supportsExpand) {
      window.addEventListener('resize', updateExpandable, { passive: true });
      requestAnimationFrame(updateExpandable);
    }

    wrap.appendChild(track);
    wrap.appendChild(prevBtn);
    wrap.appendChild(nextBtn);
    row.appendChild(wrap);

    if (supportsExpand) {
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

  // How many rows show up front - the rest stay behind a "load more" button
  // so a fresh visit doesn't have to load/render every row's covers at once.
  // Counts rendered row UNITS (a solo row or a paired row counts as one),
  // not raw categories, so pagination tracks actual vertical page length.
  var HOME_ROW_PAGE_SIZE = 12;

  // Consecutive categories with few enough games are paired side by side
  // (desktop only - see .browse-row-pair) instead of each claiming a full
  // row's width; a small category with no small neighbor just renders alone.
  // This runs over the WHOLE category list up front (before pagination), so
  // a small category's partner is found wherever it is in the list, not just
  // within whichever page of rows happens to be visible yet - otherwise a
  // page boundary can strand a small category alone with a partner just one
  // "load more" click away.
  function buildRowUnits(categories) {
    var list = categories.slice();
    var units = [];
    for (var i = 0; i < list.length; i++) {
      var category = list[i];
      if (category.games.length >= PAIRED_ROW_MAX_GAMES) {
        units.push({ type: 'solo', category: category });
        continue;
      }
      var partnerIndex = -1;
      for (var j = i + 1; j < list.length; j++) {
        if (list[j].games.length < PAIRED_ROW_MAX_GAMES) { partnerIndex = j; break; }
      }
      if (partnerIndex === -1) {
        units.push({ type: 'solo', category: category });
        continue;
      }
      var partner = list.splice(partnerIndex, 1)[0];
      units.push({ type: 'pair', a: category, b: partner });
    }
    return units;
  }

  function trackOverflows(rowEl) {
    var track = rowEl.querySelector('.browse-row-track');
    return !!track && track.scrollWidth > track.clientWidth + 1;
  }

  function appendRowUnit(container, unit) {
    if (unit.type === 'solo') {
      container.appendChild(makeRow(unit.category));
      return;
    }

    var pair = document.createElement('div');
    pair.className = 'browse-row-pair';
    var rowA = makeRow(unit.a);
    var rowB = makeRow(unit.b);
    pair.appendChild(rowA);
    pair.appendChild(rowB);
    container.appendChild(pair);

    // Even a handful of games can overflow a half-width column on desktop -
    // if either side doesn't actually fit at this width, break the pair
    // apart into two normal full-width rows instead of letting one spill
    // past its column. Checked on resize too
    // (not just once at creation, like the rest of this row's own
    // measurements - see updateNavButtons/updateExpandable) so a window
    // that's resized after load still gets this right.
    function checkPairOverflow() {
      if (!pair.isConnected) return;
      if (!trackOverflows(rowA) && !trackOverflows(rowB)) return;
      var parent = pair.parentNode;
      parent.insertBefore(rowA, pair);
      parent.insertBefore(rowB, pair);
      parent.removeChild(pair);
      window.removeEventListener('resize', checkPairOverflow);
      // rowA/rowB's own nav-button/expand measurements ran at half-width;
      // now that they're full-width, make them re-measure.
      window.dispatchEvent(new Event('resize'));
    }
    window.addEventListener('resize', checkPairOverflow, { passive: true });
    requestAnimationFrame(checkPairOverflow);
  }

  function appendRowUnits(container, units) {
    units.forEach(function (unit) { appendRowUnit(container, unit); });
  }

  function renderRows(categories) {
    currentCategories = categories;
    kbRow = -1;
    kbOnHero = false;
    clearKbFocus();
    clearHeroFocus();

    var container = document.getElementById('browse-rows');
    container.innerHTML = '';

    if (!categories.length) {
      container.innerHTML = '<p class="browse-loading">Aucune catégorie disponible pour le moment.</p>';
      return;
    }

    var units = buildRowUnits(categories);
    var visible = units.slice(0, HOME_ROW_PAGE_SIZE);
    var rest = units.slice(HOME_ROW_PAGE_SIZE);
    appendRowUnits(container, visible);

    if (rest.length) {
      var loadMoreWrap = document.createElement('div');
      loadMoreWrap.className = 'browse-load-more-wrap';
      var loadMoreBtn = document.createElement('button');
      loadMoreBtn.type = 'button';
      loadMoreBtn.className = 'browse-load-more-btn';
      loadMoreBtn.textContent = 'Charger plus de jeux';
      loadMoreBtn.addEventListener('click', function () {
        loadMoreWrap.remove();
        appendRowUnits(container, rest);
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
      if (e.key === 'Escape') {
        closeModal();
        // Enter (keyboard nav) opens this modal without ever reaching the
        // nav's own Escape handling below, since it bails out early while
        // the modal is open - so closing it here must also drop the
        // selector, or it's left lit on that card as if still navigating.
        if (kbRow !== -1 || kbOnHero) {
          exitKbNav();
          playNavSound('back');
        }
        return;
      }

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
      playNavSound('select');
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

    window.addEventListener('popstate', function () {
      var gameId = new URLSearchParams(window.location.search).get('game');
      if (gameId && allGamesById[gameId]) {
        openModal(allGamesById[gameId], { skipHistory: true });
      } else if (document.getElementById('browse-modal-overlay').classList.contains('open')) {
        closeModal({ skipHistory: true });
      }
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

  function openModal(game, opts) {
    opts = opts || {};
    var modal = document.getElementById('browse-modal');
    var overlay = document.getElementById('browse-modal-overlay');
    var wasOpen = overlay.classList.contains('open');
    modal.setAttribute('data-gameid', game.id);

    document.getElementById('browse-modal-img').src = game.coverArt || PLACEHOLDER_COVER;
    document.getElementById('browse-modal-title').textContent = getDisplayTitle(game);
    document.getElementById('browse-modal-play').href = game.pageUrl || ('/b/' + game.id);

    var favBtn = document.getElementById('browse-modal-fav');
    favBtn.setAttribute('data-fav-for', game.id);
    setFavButtonState(favBtn, favoriteIds.has(game.id));

    var metaParts = [];
    if (game.year) metaParts.push(game.year);
    var systemLabel = SYSTEM_NAMES[game.core] || game.core;
    if (systemLabel) metaParts.push(systemLabel);
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

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    refreshModalRating(game.id);
    loadTopScore(game.id);

    if (!opts.skipHistory) {
      var url = new URL(window.location.href);
      url.searchParams.set('game', game.id);
      if (wasOpen) {
        history.replaceState(history.state, '', url);
      } else {
        history.pushState({ browseModalGame: game.id }, '', url);
      }
    }
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

  function closeModal(opts) {
    opts = opts || {};
    document.getElementById('browse-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';

    if (!opts.skipHistory && new URLSearchParams(window.location.search).has('game')) {
      var url = new URL(window.location.href);
      url.searchParams.delete('game');
      history.pushState(null, '', url);
    }
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

    function loadAndRenderTournaments(user) {
      var calls = [TournoiUtils.callFunction('getPublicTournaments', {}).catch(function () { return null; })];
      if (user) {
        calls.push(TournoiUtils.callFunction('getJoinedPrivateTournaments', {}).catch(function () { return null; }));
      }

      Promise.all(calls).then(function (results) {
        var publicResult = results[0];
        var privateResult = results[1];
        var publicTournaments = (publicResult && publicResult.success && publicResult.tournaments) || [];
        var privateTournaments = (privateResult && privateResult.success && privateResult.tournaments) || [];
        var tournaments = publicTournaments.concat(privateTournaments);

        renderTournamentSection(tournaments);

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
      });
    }

    waitForFunctions(function () {
      if (window.onFirebaseAuthStateChanged) {
        window.onFirebaseAuthStateChanged(function (user) {
          loadAndRenderTournaments(user);
        });
      } else {
        loadAndRenderTournaments(null);
      }
    });
  }

  /* ---------- Tournament section (persistent cards + live round countdown) ---------- */

  var tournamentTimerInterval = null;
  var activeTournamentTimers = [];

  function renderTournamentSection(tournaments) {
    var section = document.getElementById('browse-tournaments');
    var list = document.getElementById('browse-tournaments-list');
    if (!section || !list) return;

    var visible = tournaments.filter(function (t) {
      return t.status === 'active' || t.status === 'registration';
    });

    if (tournamentTimerInterval) { clearInterval(tournamentTimerInterval); tournamentTimerInterval = null; }
    activeTournamentTimers = [];

    if (!visible.length) {
      section.style.display = 'none';
      list.innerHTML = '';
      updateHeroPosterOffset();
      return;
    }

    // Never more than MAX_SHOWN real tournament cards - a would-be 4th one
    // is replaced by a single "Voir tout" card instead of just being the
    // next tournament, so the row never needs to fit more than that to
    // let people reach the rest.
    var MAX_SHOWN = 3;
    var shown = visible.slice(0, MAX_SHOWN);
    var hiddenCount = visible.length - shown.length;

    var cardsHtml = shown.map(function (t, idx) {
      var isActive = t.status === 'active';
      var roundInfo = isActive
        ? 'Ronde ' + ((t.currentRoundIndex || 0) + 1) + '/' + (t.games ? t.games.length : '?')
        : 'Inscriptions ouvertes';
      var currentGameId = isActive ? (t.currentGame || (t.games && t.games[t.currentRoundIndex || 0])) : null;
      var g = currentGameId ? allGamesById[currentGameId] : null;
      var gameName = g ? getDisplayTitle(g) : currentGameId;
      var hasTimer = isActive && t.roundStartTime && t.roundDurationSec;
      var timerId = 'browse-tournament-timer-' + idx;

      var leaderHtml = t.leader ? (
        '<div class="browse-tournament-leader">' +
        '<span>👑</span>' +
        '<img src="' + escapeAttr(t.leader.photoURL || '/assets/default-avatar.png') + '" alt="">' +
        '<span class="browse-tournament-leader-name">' + escapeHtml(t.leader.displayName || '?') + '</span>' +
        '<span class="browse-tournament-leader-score">' + escapeHtml(Number(t.leader.score || 0).toLocaleString()) + '</span>' +
        '</div>'
      ) : '';

      return '<a href="/tournoi/play/?t=' + encodeURIComponent(t.id) + '" class="browse-tournament-card">' +
        '<div class="browse-tournament-card-top">' +
        '<span class="browse-tournament-name">' + escapeHtml(t.name || 'Tournoi') + '</span>' +
        (t.isPublic === false ? '<span class="browse-tournament-private-badge">🔒 Privé</span>' : '') +
        '<span class="browse-tournament-status ' + (isActive ? 'is-active' : 'is-registration') + '">' +
        (isActive ? 'En cours' : 'Inscription') + '</span>' +
        '</div>' +
        (t.description ? '<div class="browse-tournament-desc">' + escapeHtml(t.description) + '</div>' : '') +
        '<div class="browse-tournament-meta">' +
        '<span>' + escapeHtml(roundInfo) + '</span>' +
        (hasTimer ? '<span class="browse-tournament-timer" id="' + timerId + '"></span>' : '') +
        '</div>' +
        (gameName ? '<div class="browse-tournament-game">🎮 ' + escapeHtml(gameName) + '</div>' : '') +
        leaderHtml +
        '</a>';
    }).join('');

    var viewAllHtml = hiddenCount > 0
      ? '<a href="/tournoi/" class="browse-tournament-card browse-tournament-viewall-card">' +
        '<span class="browse-tournament-viewall-count">+' + hiddenCount + '</span>' +
        '<span class="browse-tournament-viewall-label">Voir tout →</span>' +
        '</a>'
      : '';

    list.innerHTML = cardsHtml + viewAllHtml;

    shown.forEach(function (t, idx) {
      if (t.status === 'active' && t.roundStartTime && t.roundDurationSec) {
        var el = document.getElementById('browse-tournament-timer-' + idx);
        if (el) activeTournamentTimers.push({ el: el, tournament: t });
      }
    });

    if (activeTournamentTimers.length) {
      updateTournamentTimers();
      tournamentTimerInterval = setInterval(updateTournamentTimers, 1000);
    }

    section.style.display = 'block';
    updateTournamentsScrollFade();
    updateHeroPosterOffset();
    if (!tournamentsScrollListenersAdded) {
      tournamentsScrollListenersAdded = true;
      var resizeTimeout = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          updateTournamentsScrollFade();
          updateHeroPosterOffset();
        }, 150);
      });
      list.addEventListener('scroll', updateTournamentsScrollFade, { passive: true });
    }
  }

  var tournamentsScrollListenersAdded = false;

  // Only fades the trailing edge (see .is-scrollable in browse.css) while
  // there's actually more content past the visible width still to the
  // right - not once already scrolled to the end, and never when
  // everything fits - so it always reads as "scroll for more", never as
  // a stray fade on the genuinely last card.
  function updateTournamentsScrollFade() {
    var list = document.getElementById('browse-tournaments-list');
    if (!list) return;
    var hasMoreToTheRight = list.scrollWidth - list.clientWidth - list.scrollLeft > 1;
    list.classList.toggle('is-scrollable', hasMoreToTheRight);
  }

  // The tournaments bar floats over the hero, full width, right where the
  // showcase poster and the badge/title/description block would otherwise
  // sit (both are bottom-aligned in the hero via align-items: flex-end) -
  // so push them down to start right below the bar instead of letting them
  // overlap. Reverts to their normal bottom-aligned position (the CSS
  // default) once there's nothing to clear.
  function updateHeroPosterOffset() {
    var poster = document.getElementById('browse-hero-poster-large');
    var content = document.querySelector('.browse-hero-content');
    var bar = document.getElementById('browse-tournaments');
    var showBar = bar && bar.style.display === 'block';
    var offset = showBar ? (bar.getBoundingClientRect().height + 16) + 'px' : '';
    if (poster) {
      poster.style.alignSelf = showBar ? 'flex-start' : '';
      poster.style.marginTop = offset;
    }
    if (content) {
      content.style.alignSelf = showBar ? 'flex-start' : '';
      content.style.marginTop = offset;
    }
  }

  function updateTournamentTimers() {
    activeTournamentTimers.forEach(function (entry) {
      var remaining = TournoiUtils.getRemainingSeconds(entry.tournament.roundStartTime, entry.tournament.roundDurationSec);
      entry.el.textContent = '⏱ ' + TournoiUtils.formatTimer(remaining);
      entry.el.classList.toggle('timer-warning', remaining <= 60);
    });
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
    // Auto-launch on idle disabled by request; screensaver is now manual-only ('é' key or /screensaver/ page).
    // initIdleScreensaver();

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

        var sharedGameId = new URLSearchParams(window.location.search).get('game');
        if (sharedGameId && allGamesById[sharedGameId]) {
          openModal(allGamesById[sharedGameId], { skipHistory: true });
        }

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
