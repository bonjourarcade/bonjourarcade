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
      background: #3460e5;
      color: #fff;
      font-weight: bold;
      text-align: center;
      padding: 12px 0;
      z-index: 9999;
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
    updateBodyPadding();
  }

  // Update the padding-top of the body to match total banner height
  function updateBodyPadding() {
    const banners = document.querySelectorAll('.bonjourarcade-banner');
    const totalHeight = Array.from(banners).reduce((sum, b) => sum + b.offsetHeight, 0);
    document.body.style.paddingTop = totalHeight ? totalHeight + 'px' : '';
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

  // In case banners are dynamically removed/added later, update padding on resize
  window.addEventListener('resize', updateBodyPadding);
})(); 