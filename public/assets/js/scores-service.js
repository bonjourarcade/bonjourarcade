(function (global) {
    const FUNCTION_ENDPOINTS = {
        listGameScores: 'https://us-central1-alloarcade.cloudfunctions.net/listGameScores',
        getLatestScores: 'https://us-central1-alloarcade.cloudfunctions.net/getLatestScores'
    };

    function isLocalhost() {
        const host = window.location.hostname;
        return host === 'localhost' || host === '127.0.0.1' || host.includes('localhost') || host.startsWith('192.168.');
    }

    function unwrapCallableResponse(result) {
        if (!result) {
            return null;
        }
        return result.result ? result.result : result;
    }

    async function callFunction(functionName, data, windowFunctionName) {
        if (windowFunctionName && typeof window[windowFunctionName] === 'function') {
            try {
                const localResult = await window[windowFunctionName](data && data.gameId ? data.gameId : undefined);
                const unwrappedLocalResult = unwrapCallableResponse(localResult);
                if (unwrappedLocalResult && unwrappedLocalResult.success) {
                    return unwrappedLocalResult;
                }
            } catch (localError) {
                console.warn('Fallback to HTTP function call:', localError);
            }
        }

        const endpoint = FUNCTION_ENDPOINTS[functionName];
        if (!endpoint) {
            throw new Error('Fonction Firebase inconnue: ' + functionName);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                accept: '*/*',
                'content-type': 'application/json'
            },
            body: JSON.stringify({ data: data || {} })
        });

        if (!response.ok) {
            throw new Error('Erreur HTTP (' + response.status + ')');
        }

        const json = await response.json();
        const unwrapped = unwrapCallableResponse(json);
        if (!unwrapped || !unwrapped.success) {
            throw new Error('Reponse invalide du service de scores');
        }

        return unwrapped;
    }

    function toTimestampMs(timestampValue) {
        if (!timestampValue) {
            return 0;
        }

        if (typeof timestampValue === 'number') {
            if (timestampValue > 1000000000000) {
                return timestampValue;
            }
            return timestampValue * 1000;
        }

        if (timestampValue instanceof Date) {
            return timestampValue.getTime();
        }

        if (typeof timestampValue === 'string') {
            const parsed = Date.parse(timestampValue);
            return Number.isNaN(parsed) ? 0 : parsed;
        }

        if (typeof timestampValue === 'object') {
            if (typeof timestampValue._seconds === 'number') {
                return timestampValue._seconds * 1000;
            }
            if (typeof timestampValue.seconds === 'number') {
                return timestampValue.seconds * 1000;
            }
            if (typeof timestampValue.toDate === 'function') {
                return timestampValue.toDate().getTime();
            }
        }

        return 0;
    }

    async function getGameList() {
        const cacheBuster = '?v=' + Date.now();
        const url = isLocalhost() ? '/gamelist.json' + cacheBuster : 'https://storage.googleapis.com/bonjourarcade/gamelist.json' + cacheBuster;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Impossible de charger gamelist.json');
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.games)) {
            throw new Error('Format de gamelist.json invalide');
        }

        return data.games;
    }

    async function getFeaturedGameIds(limit) {
        const featuredLimit = typeof limit === 'number' && limit > 0 ? limit : 5;

        const [currentGameResponse, previousGamesResponse] = await Promise.all([
            fetch('/api/current-game'),
            fetch('/api/previous-games.json')
        ]);

        let currentGameId = '';
        if (currentGameResponse.ok) {
            currentGameId = (await currentGameResponse.text()).trim();
        }

        let previousGameIds = [];
        if (previousGamesResponse.ok) {
            const data = await previousGamesResponse.json();
            if (Array.isArray(data)) {
                previousGameIds = data.map(function (entry) {
                    if (typeof entry === 'string') {
                        return entry;
                    }
                    if (entry && typeof entry.gameId === 'string') {
                        return entry.gameId;
                    }
                    return '';
                });
            }
        }

        const orderedIds = [];
        const seen = new Set();

        function tryPush(id) {
            if (!id || id === 'no-game' || seen.has(id)) {
                return;
            }
            seen.add(id);
            orderedIds.push(id);
        }

        tryPush(currentGameId);
        previousGameIds.forEach(tryPush);

        return orderedIds.slice(0, featuredLimit);
    }

    function normalizeLatestScore(score) {
        const gameId = (score.game && score.game.id) || score.gameId || score.game || '';
        const gameTitle = (score.game && score.game.title) || score.gameTitle || gameId;
        const gameImageUrl = (score.game && (score.game.imageUrl || score.game.coverArt)) || '';
        const playerName = (score.player && score.player.username) || score.player || 'Anonymous';
        const userId = (score.player && score.player.userId) || score.userId || '';
        const playerPhotoUrl = (score.player && (score.player.photoURL || score.player.photoUrl))
            || score.photoURL
            || score.photoUrl
            || score.playerPhotoUrl
            || null;
        const scoreValue = Number(score.value != null ? score.value : score.score);

        return {
            id: score.id || '',
            gameId: gameId,
            gameTitle: gameTitle,
            gameImageUrl: gameImageUrl,
            playerName: playerName,
            userId: userId,
            playerPhotoUrl: playerPhotoUrl,
            score: Number.isFinite(scoreValue) ? scoreValue : 0,
            comment: score.comment || '',
            createdAtMs: toTimestampMs(score.createdAt || score.date),
            screenshotUrl: score.screenshotUrl || null,
            rank: score.rank || null
        };
    }

    function normalizeGameScore(score) {
        const gameId = score.gameId || score.game || '';
        const scoreValue = Number(score.score != null ? score.score : score.value);
        const playerPhotoUrl = (score.player && (score.player.photoURL || score.player.photoUrl))
            || score.photoURL
            || score.photoUrl
            || score.playerPhotoUrl
            || null;

        return {
            id: score.id || '',
            gameId: gameId,
            gameTitle: score.gameTitle || gameId,
            gameImageUrl: score.gameImageUrl || '',
            playerName: score.player || (score.player && score.player.username) || 'Anonymous',
            userId: score.userId || (score.player && score.player.userId) || '',
            playerPhotoUrl: playerPhotoUrl,
            score: Number.isFinite(scoreValue) ? scoreValue : 0,
            comment: score.comment || '',
            createdAtMs: toTimestampMs(score.date || score.createdAt),
            screenshotUrl: score.screenshotUrl || null,
            rank: score.rank || null,
            verified: score.verified === true
        };
    }

    async function getLatestScores() {
        const result = await callFunction('getLatestScores', {}, 'getLatestScores');
        const scores = Array.isArray(result.scores) ? result.scores : [];
        return scores.map(normalizeLatestScore);
    }

    async function listGameScores(gameId) {
        const payload = {
            timeRange: 'all',
            gameId: gameId || 'all'
        };

        const result = await callFunction('listGameScores', payload, 'listGameScores');
        const scores = Array.isArray(result.scores) ? result.scores : [];
        return scores.map(normalizeGameScore);
    }

    function formatDate(timestampMs) {
        if (!timestampMs) {
            return 'N/A';
        }

        return new Date(timestampMs).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    global.BonjourArcadeScoresService = {
        getGameList: getGameList,
        getFeaturedGameIds: getFeaturedGameIds,
        getLatestScores: getLatestScores,
        listGameScores: listGameScores,
        toTimestampMs: toTimestampMs,
        formatDate: formatDate
    };
})(window);
