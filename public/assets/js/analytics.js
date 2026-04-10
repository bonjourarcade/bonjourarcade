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
    const shortRouteMatch = path.match(/^\/b\/([^/]+)$/);
    const shortRouteGameId = shortRouteMatch ? decodeURIComponent(shortRouteMatch[1]) : null;

    // Ignore the initial 404 bootstrap document for /b/<gameId>.
    // The play shell reloaded into the same document enables analytics explicitly.
    if (shortRouteGameId && window.__BA_ALLOW_B_GAME_ANALYTICS__ !== true) {
        console.log('BonjourArcade: Analytics disabled on /b bootstrap document');
        return;
    }

    const normalizedGameId = shortRouteGameId || (typeof gameId === 'string' && gameId.trim() !== '' ? gameId.trim() : '');
    const trackedGameRoute = normalizedGameId ? '/b/' + encodeURIComponent(normalizedGameId) : '';
    const hasGameRoute = trackedGameRoute !== '';
    const requiresManualPageview = path.startsWith('/play') && hasGameRoute;

    function createSessionId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return 'ba-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function trackGameEvent(route, eventName, data) {
        if (!window.umami || typeof window.umami.track !== 'function') {
            return;
        }

        window.umami.track(function (props) {
            return {
                ...props,
                url: route,
                title: document.title || props.title,
                name: eventName,
                data: data
            };
        });
    }

    function setupGameSessionHeartbeat(currentGameId, route) {
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

        trackGameEvent(route, 'ba_game_session_start', {
            sessionId: sessionId,
            gameId: currentGameId,
            route: route
        });

        const heartbeatTimer = window.setInterval(function () {
            flushActiveDelta();
            if (!isActive()) {
                return;
            }

            trackGameEvent(route, 'ba_game_session_heartbeat', {
                sessionId: sessionId,
                gameId: currentGameId,
                route: route,
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

            trackGameEvent(route, 'ba_game_session_end', {
                sessionId: sessionId,
                gameId: currentGameId,
                route: route,
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
    if (requiresManualPageview) {
        // We'll send the pageview manually so Umami records /b/<gameId> instead of /play?game=...
        script.setAttribute('data-auto-track', 'false');
        script.addEventListener('load', function () {
            if (!window.umami || typeof window.umami.track !== 'function') {
                return;
            }

            const currentTitle = document.title || 'BonjourArcade';
            const virtualTitle = currentTitle.includes('BonjourArcade')
                ? currentTitle
                : currentTitle + ' - BonjourArcade';

            window.umami.track(function (props) {
                return {
                    ...props,
                    url: trackedGameRoute,
                    title: virtualTitle
                };
            });

            setupGameSessionHeartbeat(normalizedGameId, trackedGameRoute);
        });
    } else if (hasGameRoute) {
        script.addEventListener('load', function () {
            setupGameSessionHeartbeat(normalizedGameId, trackedGameRoute);
        });
    }
    document.head.appendChild(script);
})();
