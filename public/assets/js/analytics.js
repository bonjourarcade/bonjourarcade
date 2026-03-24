(function () {
    // Disable on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('BonjourArcade: Analytics disabled on localhost');
        return;
    }

    // Disable if analytics=false query param is present (e.g. inside iframe)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('analytics') === 'false') {
        console.log('BonjourArcade: Analytics disabled via query param');
        return;
    }

    const path = window.location.pathname;
    const gameId = urlParams.get('game');

    // /b/<gameId> is a 404 wrapper that embeds /play in an iframe.
    // To avoid double-counting, let the iframe send the virtual /b pageview.
    if (/^\/b\/[^/]+$/.test(path)) {
        console.log('BonjourArcade: Analytics disabled on /b wrapper to avoid duplicate tracking');
        return;
    }

    const hasVirtualGameRoute = path.startsWith('/play') && typeof gameId === 'string' && gameId.trim() !== '';

    function createSessionId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return 'ba-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function setupGameSessionHeartbeat(normalizedGameId, virtualRoute) {
        if (!window.umami || typeof window.umami.track !== 'function') {
            return;
        }

        const HEARTBEAT_MS = 15000;
        const sessionId = createSessionId();
        const startedAt = Date.now();
        let activeMs = 0;
        let lastTickAt = Date.now();
        let ended = false;

        function isActive() {
            return document.visibilityState === 'visible';
        }

        function flushActiveDelta() {
            const now = Date.now();
            if (isActive()) {
                activeMs += Math.max(0, now - lastTickAt);
            }
            lastTickAt = now;
        }

        window.umami.track('ba_game_session_start', {
            sessionId: sessionId,
            gameId: normalizedGameId,
            route: virtualRoute
        });

        const heartbeatTimer = window.setInterval(function () {
            flushActiveDelta();
            if (!isActive()) {
                return;
            }

            window.umami.track('ba_game_session_heartbeat', {
                sessionId: sessionId,
                gameId: normalizedGameId,
                route: virtualRoute,
                activeSeconds: Math.floor(activeMs / 1000)
            });
        }, HEARTBEAT_MS);

        function endSession() {
            if (ended) {
                return;
            }
            ended = true;

            flushActiveDelta();
            window.clearInterval(heartbeatTimer);

            window.umami.track('ba_game_session_end', {
                sessionId: sessionId,
                gameId: normalizedGameId,
                route: virtualRoute,
                activeSeconds: Math.floor(activeMs / 1000),
                elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000)
            });
        }

        document.addEventListener('visibilitychange', function () {
            flushActiveDelta();
        });
        window.addEventListener('pagehide', endSession, { once: true });
        window.addEventListener('beforeunload', endSession, { once: true });
    }

    // BonjourArcade Analytics (Umami)
    const script = document.createElement('script');
    script.defer = true;
    script.src = "https://cloud.umami.is/script.js";
    script.setAttribute('data-website-id', "660e5f95-7427-4bee-b7a5-4f50fa389e4e");
    if (hasVirtualGameRoute) {
        // We'll send the pageview manually so Umami records /b/<gameId> instead of /play?game=...
        script.setAttribute('data-auto-track', 'false');
        script.addEventListener('load', function () {
            if (!window.umami || typeof window.umami.track !== 'function') {
                return;
            }

            const normalizedGameId = gameId.trim();
            const virtualUrl = '/b/' + encodeURIComponent(normalizedGameId);
            const currentTitle = document.title || 'BonjourArcade';
            const virtualTitle = currentTitle.includes('BonjourArcade')
                ? currentTitle
                : currentTitle + ' - BonjourArcade';

            window.umami.track(function (props) {
                return {
                    ...props,
                    url: virtualUrl,
                    title: virtualTitle
                };
            });

            setupGameSessionHeartbeat(normalizedGameId, virtualUrl);
        });
    }
    document.head.appendChild(script);
})();
