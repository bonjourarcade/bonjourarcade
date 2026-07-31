(function () {
  'use strict';

  function getTorontoDailySeed() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}${month}${day}`;
  }

  const PRESETS = {
    home: {
      items: [
        { type: 'submenu', id: 'competition', icon: '🏆', label: 'Compétition', children: [
          { type: 'link', href: '/scores', icon: '📋', label: 'Scores' },
          { type: 'link', href: '/tournoi/', icon: '🏅', label: 'Tournois' },
        ]},
        { type: 'submenu', id: 'jeux', icon: '🕹️', label: 'Jeux', children: [
          { type: 'link', href: '/daily/?seed=' + getTorontoDailySeed(), icon: '📅', label: 'Jeu du jour', id: 'daily-game-link' },
          { type: 'link', href: '/randomgame/', icon: '🎲', label: 'Jeu aléatoire' },
          { type: 'link', href: '/swipe', icon: '🃏', label: 'Swipe' },
          { type: 'link', href: '/all', icon: '🕹️', label: 'Tous les jeux' },
          { type: 'link', href: '/upcoming', icon: '🔮', label: 'Bientôt en vedette' },
        ]},
        { type: 'link', href: '/ratings', icon: '⭐', label: 'Évaluations' },
        { type: 'link', href: '/screensaver', icon: '🌠', label: 'Écran de veille' },
        { type: 'link', href: 'https://ko-fi.com/bonjourarcade', icon: '❤️', label: 'Supporter BonjourArcade', highlight: true, target: '_blank' },
        { type: 'divider' },
        { type: 'theme-system', icon: '🌓', label: 'Thème : Système' },
        { type: 'theme-light', icon: '☀️', label: 'Thème : Clair' },
        { type: 'theme-dark', icon: '🌙', label: 'Thème : Sombre' },
        { type: 'auth-login', icon: '🔐', label: 'Se connecter', id: 'login-btn' },
        { type: 'divider', id: 'auth-divider', hidden: true },
        { type: 'auth-logout', icon: '🚪', label: 'Se déconnecter', id: 'logout-btn', hidden: true, style: 'color:#ff4444;' },
        { type: 'divider', id: 'admin-review-section', hidden: true },
        { type: 'admin-review', icon: '🛡️', label: 'Admin', id: 'admin-review-link', hidden: true },
      ]
    },
    scores: {
      items: [
        { type: 'link', href: '/scores', icon: '📋', label: 'Scores' },
        { type: 'link', href: '/profil/', icon: '👤', label: 'Profil', id: 'dropdown-profil-link', hidden: true },
        { type: 'link', href: '/all', icon: '🕹️', label: 'Tous les jeux' },
        { type: 'link', href: '/daily/?seed=' + getTorontoDailySeed(), icon: '📅', label: 'Jeu du jour', id: 'daily-game-link' },
        { type: 'link', href: '/randomgame/', icon: '🎲', label: 'Jeu aléatoire' },
        { type: 'link', href: '/swipe', icon: '🃏', label: 'Swipe' },
        { type: 'link', href: '/screensaver', icon: '🌠', label: 'Écran de veille' },
        { type: 'link', href: '/ratings', icon: '⭐', label: 'Évaluations' },
        { type: 'link', href: '/upcoming', icon: '🔮', label: 'Bientôt en vedette' },
        { type: 'link', href: 'https://ko-fi.com/bonjourarcade', icon: '❤️', label: 'Supporter BonjourArcade', highlight: true, target: '_blank' },
        { type: 'divider' },
        { type: 'theme-system', icon: '🌓', label: 'Thème : Système' },
        { type: 'theme-light', icon: '☀️', label: 'Thème : Clair' },
        { type: 'theme-dark', icon: '🌙', label: 'Thème : Sombre' },
        { type: 'divider' },
        { type: 'auth-toggle', icon: '🔐', label: 'Connexion', id: 'dropdown-auth-button' },
      ]
    },
    profil: {
      items: [
        { type: 'link', href: '/scores', icon: '📋', label: 'Scores' },
        { type: 'link', href: '/all', icon: '🕹️', label: 'Tous les jeux' },
        { type: 'link', href: '/daily/?seed=' + getTorontoDailySeed(), icon: '📅', label: 'Jeu du jour', id: 'daily-game-link' },
        { type: 'link', href: '/randomgame/', icon: '🎲', label: 'Jeu aléatoire' },
        { type: 'link', href: '/swipe', icon: '🃏', label: 'Swipe' },
        { type: 'link', href: '/screensaver', icon: '🌠', label: 'Écran de veille' },
        { type: 'link', href: '/ratings', icon: '⭐', label: 'Évaluations' },
        { type: 'link', href: '/upcoming', icon: '🔮', label: 'Bientôt en vedette' },
        { type: 'link', href: 'https://ko-fi.com/bonjourarcade', icon: '❤️', label: 'Supporter BonjourArcade', highlight: true, target: '_blank' },
        { type: 'divider' },
        { type: 'theme-system', icon: '🌓', label: 'Thème : Système' },
        { type: 'theme-light', icon: '☀️', label: 'Thème : Clair' },
        { type: 'theme-dark', icon: '🌙', label: 'Thème : Sombre' },
        { type: 'divider' },
        { type: 'auth-toggle', icon: '🔐', label: 'Connexion', id: 'dropdown-auth-button' },
      ]
    }
  };

  function buildItemHTML(item) {
    if (item.type === 'divider') {
      const style = item.hidden ? ' style="display:none;"' : '';
      return `<div class="dropdown-divider" id="${item.id || ''}"${style}></div>`;
    }
    if (item.type === 'submenu') {
      const id = item.id || 'submenu';
      return `
        <div class="submenu-toggle dropdown-option" id="${id}-toggle">
          <span>${item.icon}</span>${item.label}
          <span class="arrow">▼</span>
        </div>
        <div class="submenu" id="${id}">
          ${item.children.map(c => buildItemHTML(c)).join('')}
        </div>`;
    }
    if (item.type === 'admin-review') {
      const style = item.hidden ? ' style="display:none;"' : '';
      return `<a href="${item.href || '/admin/'}" id="${item.id}" class="dropdown-option"${style}>
        <span>${item.icon}</span>${item.label} <span id="admin-review-badge" style="background:#ff4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:6px;"></span>
      </a>`;
    }
    if (item.type.startsWith('theme-')) {
      const theme = item.type.replace('theme-', '');
      return `<button class="theme-option dropdown-option" data-theme="${theme}" type="button">
        <span class="theme-icon">${item.icon}</span>${item.label}
      </button>`;
    }
    if (item.type === 'auth-login' || item.type === 'auth-logout' || item.type === 'auth-toggle') {
      const style = (item.hidden ? ' display:none;' : '') + (item.style || '');
      const tag = item.type === 'auth-login' || item.type === 'auth-toggle' ? 'button' : 'button';
      const className = item.type === 'auth-logout' ? 'dropdown-option auth-logout-btn' : 'dropdown-option';
      return `<${tag} id="${item.id}" class="${className}" type="button" style="${style}">
        <span>${item.icon}</span>${item.label}
      </${tag}>`;
    }
    // link
    const target = item.target ? ` target="${item.target}" rel="noopener"` : '';
    const cls = item.highlight ? 'dropdown-option dropdown-highlight' : 'dropdown-option';
    const id = item.id ? ` id="${item.id}"` : '';
    const style = item.hidden ? ' style="display:none;"' : '';
    return `<a href="${item.href}" class="${cls}"${id}${target}${style}><span>${item.icon}</span>${item.label}</a>`;
  }

  function buildDropdownHTML(preset) {
    const config = PRESETS[preset] || PRESETS.home;
    const itemsHTML = config.items.map(buildItemHTML).join('\n        ');
    return `
      <button id="options-toggle-btn" class="theme-btn" aria-label="Options" aria-haspopup="true" type="button">
        <span>⚙️</span>
        <span>Menu</span>
      </button>
      <div id="options-dropdown" class="dropdown-menu">
        ${itemsHTML}
      </div>`;
  }

  function initDropdown() {
    const wrapper = document.getElementById('dropdown-root');
    if (!wrapper) return;
    const preset = wrapper.dataset.preset || 'home';
    wrapper.innerHTML = buildDropdownHTML(preset);

    const optionsBtn = document.getElementById('options-toggle-btn');
    const optionsDropdown = document.getElementById('options-dropdown');
    if (!optionsBtn || !optionsDropdown) return;

    // --- Toggle dropdown ---
    function setDropdownOpen(open) {
      optionsDropdown.classList.toggle('active', open);
      optionsBtn.setAttribute('aria-expanded', String(open));
    }

    optionsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setDropdownOpen(!optionsDropdown.classList.contains('active'));
    });

    document.addEventListener('click', function (e) {
      if (optionsDropdown.classList.contains('active')) {
        if (!optionsBtn.contains(e.target) && !optionsDropdown.contains(e.target)) {
          setDropdownOpen(false);
        }
      }
    });

    optionsDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Expose close method for external scripts
    window.__dropdownClose = function () {
      setDropdownOpen(false);
    };

    // --- Submenu toggles ---
    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
      const id = toggle.id.replace('-toggle', '');
      const submenu = document.getElementById(id);
      if (submenu) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle.classList.toggle('open');
          submenu.classList.toggle('open');
        });
      }
    });

    // --- Theme ---
    function setTheme(theme) {
      document.body.classList.remove('theme-light', 'theme-dark');
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      let classToAdd;
      if (theme === 'system') {
        classToAdd = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light';
      } else if (theme === 'dark') {
        classToAdd = 'theme-dark';
      } else {
        classToAdd = 'theme-light';
      }
      document.body.classList.add(classToAdd);
      document.documentElement.classList.add(classToAdd);

      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.style.background = (btn.dataset.theme === theme) ? '#444' : 'none';
      });

      if (optionsBtn) {
        if (classToAdd === 'theme-dark') {
          optionsBtn.style.background = '#222';
          optionsBtn.style.color = '#fff';
          optionsBtn.style.border = '2px solid rgba(255,255,255,0.2)';
        } else {
          optionsBtn.style.background = '#fff';
          optionsBtn.style.color = '#111';
          optionsBtn.style.border = '2px solid #ccc';
        }
      }

      if (typeof window.__dropdownOnThemeChange === 'function') {
        window.__dropdownOnThemeChange(theme);
      }
    }

    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', function () {
        const selected = btn.dataset.theme;
        if (selected === 'system') {
          localStorage.removeItem('theme');
        } else {
          localStorage.setItem('theme', selected);
        }
        setTheme(selected);
      });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) setTheme('system');
    });

    // --- Auth ---
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authDivider = document.getElementById('auth-divider');
    const authToggleBtn = document.getElementById('dropdown-auth-button');
    const dropdownProfilLink = document.getElementById('dropdown-profil-link');

    const adminReviewSection = document.getElementById('admin-review-section');
    const adminReviewLink = document.getElementById('admin-review-link');
    const adminReviewBadge = document.getElementById('admin-review-badge');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        if (typeof window.signInWithGoogle === 'function') {
          try { await window.signInWithGoogle(); location.reload(); }
          catch (e) { console.error('Login error:', e); }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (typeof window.signOutFirebase === 'function') {
          await window.signOutFirebase(); location.reload();
        }
      });
    }

    if (authToggleBtn) {
      authToggleBtn.addEventListener('click', async () => {
        if (typeof window.__dropdownHandleAuthToggle === 'function') {
          window.__dropdownHandleAuthToggle();
        }
      });
    }

    // Admin badge
    let lastAdminCheck = 0;
    let lastAdminResult = false;

    function updateExternalBadge(show, count) {
      var badge = document.getElementById('admin-notif-badge');
      var logo = document.querySelector('.header-logo');
      var countEl = document.getElementById('admin-notif-count');
      if (!badge || !logo) return;
      if (show && count > 0) {
        logo.style.display = 'none';
        badge.style.display = 'inline-flex';
        if (countEl) countEl.textContent = count;
      } else {
        logo.style.display = '';
        badge.style.display = 'none';
      }
    }

    async function checkAdminAndPending() {
      if (!window.firebaseAuth || !window.checkFirebaseScoreModeratorAccess) return;
      const now = Date.now();
      if (now - lastAdminCheck < 30000 && !lastAdminResult) return;
      lastAdminCheck = now;
      try {
        const isAdmin = await window.checkFirebaseScoreModeratorAccess();
        lastAdminResult = isAdmin;
        if (isAdmin && adminReviewLink && adminReviewSection && adminReviewBadge) {
          adminReviewLink.style.display = 'flex';
          adminReviewSection.style.display = 'block';
          try {
            if (typeof window.getPendingScoresCount === 'function') {
              const count = await window.getPendingScoresCount();
              adminReviewBadge.textContent = count > 0 ? count : '';
              adminReviewBadge.style.display = count > 0 ? 'inline' : 'none';
              updateExternalBadge(isAdmin, count);
            }
          } catch (e) { adminReviewBadge.style.display = 'none'; updateExternalBadge(false); }
        } else {
          if (adminReviewLink) adminReviewLink.style.display = 'none';
          if (adminReviewSection) adminReviewSection.style.display = 'none';
          updateExternalBadge(false);
        }
      } catch (e) {}
    }

    function applyAuthState(user) {
      if (loginBtn) loginBtn.style.display = user ? 'none' : 'flex';
      if (logoutBtn) logoutBtn.style.display = user ? 'flex' : 'none';
      if (authDivider) authDivider.style.display = user ? 'block' : 'none';
      if (dropdownProfilLink) dropdownProfilLink.style.display = user ? 'flex' : 'none';
      if (authToggleBtn) {
        if (user) {
          authToggleBtn.innerHTML = '<span>🚪</span>Déconnexion';
        } else {
          authToggleBtn.innerHTML = '<span>🔐</span>Connexion';
        }
      }
      if (user) checkAdminAndPending();
      if (typeof window.__dropdownOnAuth === 'function') {
        window.__dropdownOnAuth(user);
      }
    }

    function pollAuth() {
      if (typeof window.onFirebaseAuthStateChanged === 'function') {
        window.onFirebaseAuthStateChanged(applyAuthState);
      } else {
        setTimeout(pollAuth, 100);
      }
    }
    pollAuth();

    window.__dropdownApplyAuth = applyAuthState;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdown);
  } else {
    initDropdown();
  }
})();
