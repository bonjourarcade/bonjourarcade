(function () {
    // --- TTL cache backed by sessionStorage ---
    const PREFIX = 'ba_ttl_';

    function get(key) {
        try {
            const raw = sessionStorage.getItem(PREFIX + key);
            if (!raw) return undefined;
            const entry = JSON.parse(raw);
            if (Date.now() > entry.exp) {
                sessionStorage.removeItem(PREFIX + key);
                return undefined;
            }
            return entry.value;
        } catch (e) {
            return undefined;
        }
    }

    function set(key, value, ttlMs) {
        try {
            sessionStorage.setItem(PREFIX + key, JSON.stringify({ exp: Date.now() + ttlMs, value: value }));
        } catch (e) { /* storage full/unavailable */ }
    }

    function invalidate(key) {
        try { sessionStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    }

    function invalidateWithPrefix(prefix) {
        try {
            const keys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i);
                if (k && k.indexOf(PREFIX + prefix) === 0) keys.push(k);
            }
            keys.forEach(k => sessionStorage.removeItem(k));
        } catch (e) { /* ignore */ }
    }

    window.TTLCache = { get: get, set: set, invalidate: invalidate };

    // --- Refresh once when the tab becomes visible again ---
    window.refreshOnVisible = function (callback) {
        let disposed = false;
        function handler() {
            if (!disposed && document.visibilityState === 'visible') {
                try { callback(); } catch (e) { console.warn('refreshOnVisible error:', e); }
            }
        }
        function dispose() {
            if (disposed) return;
            disposed = true;
            document.removeEventListener('visibilitychange', handler);
            window.removeEventListener('pagehide', dispose);
        }
        document.addEventListener('visibilitychange', handler);
        window.addEventListener('pagehide', dispose);
        return dispose;
    };

    // --- Leaderboard fetch (listGameScores) with cache ---
    function isLocalhost() {
        const host = window.location.hostname;
        return host === 'localhost' || host === '127.0.0.1' || host.includes('localhost') || host.startsWith('192.168.');
    }

    async function defaultLocalFetcher(gameId) {
        if (typeof window.listGameScores !== 'function') {
            throw new Error('window.listGameScores is not available yet');
        }
        const localResultRaw = await window.listGameScores(gameId);
        const localResult = localResultRaw && localResultRaw.result ? localResultRaw.result : localResultRaw;
        if (!localResult || localResult.success !== true || !Array.isArray(localResult.scores)) {
            throw new Error('Invalid emulator leaderboard response format');
        }
        return { result: localResult };
    }

    async function prodFetcher(gameId) {
        const response = await fetch('https://us-central1-alloarcade.cloudfunctions.net/listGameScores', {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'content-type': 'application/json'
            },
            body: JSON.stringify({ data: { timeRange: 'all', gameId: gameId } })
        });
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        return response.json();
    }

    function generateMockScores(gameId) {
        const mockPlayers = [
            { name: "Félix L", userId: "user1" },
            { name: "Marie C", userId: "user2" },
            { name: "Jean P", userId: "user3" },
            { name: "Sophie M", userId: "user4" },
            { name: "Pierre D", userId: "user5" }
        ];
        let baseScore = 1000;
        if (gameId && (gameId.includes('shmup') || gameId.includes('shoot'))) {
            baseScore = 50000;
        } else if (gameId && gameId.includes('puzzle')) {
            baseScore = 5000;
        } else if (gameId && gameId.includes('platform')) {
            baseScore = 15000;
        }
        return mockPlayers.map(function (player, index) {
            return {
                rank: index + 1,
                id: 'mock_' + player.userId + '_' + Date.now(),
                userId: player.userId,
                player: player.name,
                photoURL: 'https://via.placeholder.com/96/cccccc/666666?text=' + player.name.charAt(0),
                score: Math.floor(baseScore * (1 + Math.random() * 5) * (1 - index * 0.1)),
                game: gameId,
                comment: Math.random() > 0.5 ? "Belle run, bravo !" : "",
                date: {
                    _seconds: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30),
                    _nanoseconds: Math.floor(Math.random() * 1000000000)
                },
                verified: true,
                screenshotUrl: 'https://via.placeholder.com/300x200/333333/ffffff?text=Screenshot'
            };
        });
    }

    async function fetchLeaderboardScores(gameId, opts) {
        const options = opts || {};
        const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : 5 * 60 * 1000;
        const localFetcher = options.localFetcher || defaultLocalFetcher;
        const key = 'listGameScores_' + gameId;

        if (!options.force) {
            const cached = get(key);
            if (cached !== undefined) return cached;
        }

        let data;
        if (isLocalhost()) {
            try {
                data = await localFetcher(gameId);
            } catch (e) {
                console.warn('Local leaderboard fetch failed, using mock scores:', e);
                data = { result: { success: true, scores: generateMockScores(gameId) } };
            }
        } else {
            data = await prodFetcher(gameId);
        }

        set(key, data, ttlMs);
        return data;
    }

    window.fetchLeaderboardScores = fetchLeaderboardScores;
    window.invalidateLeaderboard = function (gameId) { invalidate('listGameScores_' + gameId); };
    window.invalidateLeaderboardAll = function () { invalidateWithPrefix('listGameScores_'); };

    // --- gamelist.json fetch with cache (GCS/static hosting) ---
    async function fetchGamelist(opts) {
        const options = opts || {};
        const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : 15 * 60 * 1000;
        const key = 'gamelist';

        if (!options.force) {
            const cached = get(key);
            if (cached !== undefined) return cached;
        }

        const cacheBuster = '?v=' + Date.now();
        const url = isLocalhost()
            ? (options.localUrl || '/gamelist.json') + cacheBuster
            : 'https://storage.googleapis.com/bonjourarcade/gamelist.json' + cacheBuster;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch gamelist.json (status: ' + response.status + ')');
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.games)) {
            throw new Error('Invalid data structure received from gamelist.json.');
        }

        set(key, data, ttlMs);
        return data;
    }

    window.fetchGamelist = fetchGamelist;
})();
