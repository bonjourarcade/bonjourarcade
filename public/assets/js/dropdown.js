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

  function buildDropdownHTML() {
    return `
      <button id="options-toggle-btn" class="theme-btn" aria-label="Options" type="button">
        <span>⚙️</span>
        <span>Menu</span>
      </button>
      <div id="options-dropdown" class="dropdown-menu">
        <a href="/scores" class="dropdown-option">
          <span>🏆</span>Scores
        </a>
        <div class="submenu-toggle dropdown-option" id="jeux-submenu-toggle">
          <span>🕹️</span>Jeux
          <span class="arrow">▼</span>
        </div>
        <div class="submenu" id="jeux-submenu">
          <a href="/daily/?seed=${getTorontoDailySeed()}" class="dropdown-option" id="daily-game-link">
            <span>📅</span>Jeu du jour
          </a>
          <a href="/randomgame/" class="dropdown-option">
            <span>🎲</span>Jeu aléatoire
          </a>
          <a href="/swipe" class="dropdown-option">
            <span>🃏</span>Swipe
          </a>
          <a href="/all" class="dropdown-option">
            <span>🕹️</span>Tous les jeux
          </a>
          <a href="/upcoming" class="dropdown-option">
            <span>🔮</span>Bientôt en vedette
          </a>
        </div>
        <a href="/screensaver" class="dropdown-option">
          <span>🌠</span>Écran de veille
        </a>
        <a href="https://ko-fi.com/bonjourarcade" target="_blank" class="dropdown-option dropdown-highlight">
          <span>❤️</span>Supporter BonjourArcade
        </a>
        <div class="dropdown-divider"></div>
        <button class="theme-option dropdown-option" data-theme="system">
          <span class="theme-icon">🌓</span>Thème : Système
        </button>
        <button class="theme-option dropdown-option" data-theme="light">
          <span class="theme-icon">☀️</span>Thème : Clair
        </button>
        <button class="theme-option dropdown-option" data-theme="dark">
          <span class="theme-icon">🌙</span>Thème : Sombre
        </button>
        <button id="login-btn" class="dropdown-option">
          <span>🔐</span>Se connecter
        </button>
        <div class="dropdown-divider" id="auth-divider" style="display: none;"></div>
        <button id="logout-btn" class="dropdown-option" style="display: none; color: #ff4444;">
          <span>🚪</span>Se déconnecter
        </button>
        <div id="admin-review-section" style="display:none;" class="dropdown-divider"></div>
        <a href="/admin/" id="admin-review-link" class="dropdown-option" style="display:none;">
          <span>🛡️</span>Admin <span id="admin-review-badge" style="background:#ff4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:6px;"></span>
        </a>
      </div>
    `;
  }

  function initDropdown() {
    const wrapper = document.getElementById('dropdown-root');
    if (!wrapper) return;
    wrapper.innerHTML = buildDropdownHTML();

    const optionsBtn = document.getElementById('options-toggle-btn');
    const optionsDropdown = document.getElementById('options-dropdown');

    if (!optionsBtn || !optionsDropdown) return;

    // --- Toggle dropdown ---
    optionsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      optionsDropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
      if (optionsDropdown.classList.contains('active')) {
        if (!optionsBtn.contains(e.target) && !optionsDropdown.contains(e.target)) {
          optionsDropdown.classList.remove('active');
        }
      }
    });

    optionsDropdown.addEventListener('click', (e) => e.stopPropagation());

    // --- Submenu toggle ---
    const jeuxToggle = document.getElementById('jeux-submenu-toggle');
    const jeuxSubmenu = document.getElementById('jeux-submenu');
    if (jeuxToggle && jeuxSubmenu) {
      jeuxToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        jeuxToggle.classList.toggle('open');
        jeuxSubmenu.classList.toggle('open');
      });
    }

    // --- Theme ---
    function setTheme(theme) {
      document.body.classList.remove('theme-light', 'theme-dark');
      let classToAdd;
      if (theme === 'system') {
        classToAdd = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light';
      } else if (theme === 'dark') {
        classToAdd = 'theme-dark';
      } else {
        classToAdd = 'theme-light';
      }
      document.body.classList.add(classToAdd);

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
    const adminReviewSection = document.getElementById('admin-review-section');
    const adminReviewLink = document.getElementById('admin-review-link');
    const adminReviewBadge = document.getElementById('admin-review-badge');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        if (typeof window.signInWithGoogle === 'function') {
          try {
            await window.signInWithGoogle();
            location.reload();
          } catch (e) {
            console.error('Login error:', e);
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (typeof window.signOutFirebase === 'function') {
          await window.signOutFirebase();
          location.reload();
        }
      });
    }

    // Track admin state to avoid refetching pending count on every auth change
    let lastAdminCheck = 0;
    let lastAdminResult = false;

    async function checkAdminAndPending() {
      if (!window.firebaseAuth || !window.checkFirebaseAdminAccess) return;
      const now = Date.now();
      if (now - lastAdminCheck < 30000 && !lastAdminResult) return;
      lastAdminCheck = now;

      try {
        const isAdmin = await window.checkFirebaseAdminAccess();
        lastAdminResult = isAdmin;
        if (isAdmin && adminReviewLink && adminReviewSection && adminReviewBadge) {
          adminReviewLink.style.display = 'flex';
          adminReviewSection.style.display = 'block';
          try {
            if (typeof window.getPendingScoresCount === 'function') {
              const count = await window.getPendingScoresCount();
              adminReviewBadge.textContent = count > 0 ? count : '';
              adminReviewBadge.style.display = count > 0 ? 'inline' : 'none';
            }
          } catch (e) {
            adminReviewBadge.style.display = 'none';
          }
        } else {
          if (adminReviewLink) adminReviewLink.style.display = 'none';
          if (adminReviewSection) adminReviewSection.style.display = 'none';
        }
      } catch (e) {
        // not admin
      }
    }

    function applyAuthState(user) {
      if (loginBtn) loginBtn.style.display = user ? 'none' : 'flex';
      if (logoutBtn) logoutBtn.style.display = user ? 'flex' : 'none';
      if (authDivider) authDivider.style.display = user ? 'block' : 'none';
      if (user) checkAdminAndPending();
    }

    function pollAuth() {
      if (typeof window.onFirebaseAuthStateChanged === 'function') {
        window.onFirebaseAuthStateChanged(applyAuthState);
      } else {
        setTimeout(pollAuth, 100);
      }
    }
    pollAuth();

    // For non-firebase pages that still use dropdown, expose applyAuthState
    window.__dropdownApplyAuth = applyAuthState;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdown);
  } else {
    initDropdown();
  }
})();
