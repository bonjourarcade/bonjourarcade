// === Banner Injection (Staging & Firefox) ===
(function() {
  // Helper to insert a fixed banner at the top, stacking if needed
  function insertBanner(id, text, styleOverrides) {
    if (document.getElementById(id)) return; // Prevent duplicates
    const banner = document.createElement('div');
    banner.id = id;
    banner.textContent = text;
    banner.style.cssText = `
      position: fixed;
      left: 0; right: 0;
      background: #e53935;
      color: #fff;
      font-weight: bold;
      text-align: center;
      padding: 12px 0;
      z-index: 100; /* Lowered so UI buttons can appear above */
      font-size: 1.2em;
      letter-spacing: 2px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      top: 0;
      transition: top 0.2s;
      pointer-events: none;
    ` + (styleOverrides || '');
    // Stack banners if needed
    const existingBanners = document.querySelectorAll('.bonjourarcade-banner');
    banner.classList.add('bonjourarcade-banner');
    banner.style.top = `${existingBanners.length * 48}px`;
    document.body.appendChild(banner);
    updateBannerSpacer();
  }

  // Insert or update a spacer div after all banners to push content visually
  function updateBannerSpacer() {
    let spacer = document.getElementById('bonjourarcade-banner-spacer');
    const banners = document.querySelectorAll('.bonjourarcade-banner');
    const totalHeight = Array.from(banners).reduce((sum, b) => sum + b.offsetHeight, 0);
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.id = 'bonjourarcade-banner-spacer';
      document.body.insertBefore(spacer, document.body.firstChild.nextSibling); // After first banner
    }
    spacer.style.width = '100%';
    spacer.style.height = totalHeight ? totalHeight + 'px' : '0';
    spacer.style.display = totalHeight ? 'block' : 'none';
    updatePlinkoGameContainerOffset(totalHeight);
  }

  // For Plinko: push down the game container if present
  // Always set margin-top for normal flow. If the container is absolutely or fixed positioned (e.g., canvas/game), set top as well.
  function updatePlinkoGameContainerOffset(totalHeight) {
    var gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    if (typeof totalHeight !== 'number') {
      const banners = document.querySelectorAll('.bonjourarcade-banner');
      totalHeight = Array.from(banners).reduce((sum, b) => sum + b.offsetHeight, 0);
    }
    // Always set margin-top (for normal flow layouts)
    gameContainer.style.marginTop = totalHeight ? totalHeight + 'px' : '';
    // If absolutely or fixed positioned, set top as well (for canvas/fixed layouts)
    const pos = window.getComputedStyle(gameContainer).position;
    if (pos === 'absolute' || pos === 'fixed') {
      gameContainer.style.top = totalHeight ? totalHeight + 'px' : '';
    }
  }

  // Staging banner (local only)
  const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  const isLocal = localHosts.includes(window.location.hostname) || window.location.hostname.endsWith('.local');
  if (isLocal) {
    insertBanner('bonjourarcade-staging-banner', 'STAGING / LOCAL ENVIRONMENT');
  }

  // Firefox warning banner
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  if (isFirefox) {
    insertBanner(
      'bonjourarcade-firefox-banner',
      "Remarque : Pour une expérience de jeu optimale, nous vous recommandons d'utiliser un navigateur basé sur Chromium comme Google Chrome, Safari, Microsoft Edge ou Brave. Certains jeux peuvent ne pas fonctionner de manière optimale sur Firefox.",
      'background: #ff9800; color: #222; font-size: 1em; letter-spacing: normal; font-weight: bold; pointer-events: none;'
    );
  }

  // Update on resize
  window.addEventListener('resize', function() {
    updateBannerSpacer();
    updatePlinkoGameContainerOffset();
  });
})(); 