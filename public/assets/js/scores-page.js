(function () {
    const PAGE_SIZE = 100;

    const state = {
        games: [],
        gamesById: new Map(),
        featuredIds: [],
        latestScores: [],
        allScores: [],
        medalsRanking: [],
        selectedPlayerKey: '',
        rawScores: [],
        filteredScores: [],
        visibleCount: 0,
        currentViewMode: 'all',
        gameId: '',
        observer: null,
        isAdmin: false,
        pendingDeleteScoreId: '',
        pendingDeleteButton: null,
        metricsChart: null,
        lastFocusedElement: null,
        currentUser: null,
        currentUserScores: [],
        currentUserScoresLoadedFor: '',
        metricVisibility: {
            collective: false,
            highscore: true
        }
    };

    const elements = {
        authStatus: document.getElementById('scores-auth-status'),
        authText: document.getElementById('scores-auth-text'),
        authButton: document.getElementById('scores-auth-button'),
        dropdownAuthButton: document.getElementById('dropdown-auth-button'),
        optionsToggleButton: document.getElementById('options-toggle-btn'),
        optionsDropdown: document.getElementById('options-dropdown'),
        catalogView: document.getElementById('catalog-view'),
        gameView: document.getElementById('game-view'),
        searchInput: document.getElementById('game-search-input'),
        searchResults: document.getElementById('game-search-results'),
        featuredList: document.getElementById('featured-games-list'),
        featuredState: document.getElementById('featured-games-state'),
        latestScoresList: document.getElementById('latest-scores-list'),
        latestScoresState: document.getElementById('latest-scores-state'),
        medalsState: document.getElementById('medals-state'),
        medalsBody: document.getElementById('medals-body'),
        myScoresButton: document.getElementById('my-scores-button'),
        playerScoresPanel: document.getElementById('player-scores-panel'),
        playerScoresDialog: document.getElementById('player-scores-dialog'),
        playerScoresTitle: document.getElementById('player-scores-title'),
        playerScoresSubtitle: document.getElementById('player-scores-subtitle'),
        playerScoresScrollArea: document.getElementById('player-scores-scroll-area'),
        playerScoresPending: document.getElementById('player-scores-pending'),
        playerScoresBody: document.getElementById('player-scores-body'),
        playerNameEditButton: document.getElementById('player-name-edit-button'),
        playerNameEditForm: document.getElementById('player-name-edit-form'),
        playerNameEditInput: document.getElementById('player-name-edit-input'),
        playerNameEditSave: document.getElementById('player-name-edit-save'),
        playerNameEditCancel: document.getElementById('player-name-edit-cancel'),
        playerNameEditStatus: document.getElementById('player-name-edit-status'),
        playerScoresCopyLink: document.getElementById('player-scores-copy-link'),
        playerScoresClose: document.getElementById('player-scores-close'),
        leaderboardTitle: document.getElementById('leaderboard-title'),
        leaderboardSubtitle: document.getElementById('leaderboard-subtitle'),
        leaderboardGameLink: document.getElementById('leaderboard-game-link'),
        leaderboardPlayLink: document.getElementById('leaderboard-play-link'),
        gameCover: document.getElementById('leaderboard-game-cover'),
        toggleAll: document.getElementById('toggle-all-scores'),
        toggleBest: document.getElementById('toggle-best-scores'),
        metricsChartCanvas: document.getElementById('game-metrics-chart'),
        metricsState: document.getElementById('game-metrics-state'),
        toggleMetricCollective: document.getElementById('toggle-metric-collective'),
        toggleMetricHighscore: document.getElementById('toggle-metric-highscore'),
        tableBody: document.getElementById('leaderboard-body'),
        leaderboardState: document.getElementById('leaderboard-state'),
        loadMoreState: document.getElementById('load-more-state'),
        loadMoreSentinel: document.getElementById('load-more-sentinel'),
        proofModal: document.getElementById('proof-modal'),
        proofModalImage: document.getElementById('proof-modal-image'),
        proofModalLoader: document.getElementById('proof-modal-loader'),
        proofModalLoaderText: document.querySelector('#proof-modal-loader .proof-modal-loader-text'),
        proofModalClose: document.getElementById('proof-modal-close'),
        adminEditModal: document.getElementById('admin-edit-modal'),
        adminEditModalClose: document.getElementById('admin-edit-modal-close'),
        adminEditForm: document.getElementById('admin-edit-form'),
        adminEditScoreId: document.getElementById('admin-edit-score-id'),
        adminEditGameId: document.getElementById('admin-edit-game-id'),
        adminEditScore: document.getElementById('admin-edit-score'),
        adminEditComment: document.getElementById('admin-edit-comment'),
        adminEditError: document.getElementById('admin-edit-error'),
        adminEditCancel: document.getElementById('admin-edit-cancel'),
        adminEditSubmit: document.getElementById('admin-edit-submit'),
        adminDeleteModal: document.getElementById('admin-delete-modal'),
        adminDeleteModalClose: document.getElementById('admin-delete-modal-close'),
        adminDeleteError: document.getElementById('admin-delete-error'),
        adminDeleteCancel: document.getElementById('admin-delete-cancel'),
        adminDeleteConfirm: document.getElementById('admin-delete-confirm')
    };

    function getTorontoDailySeed() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Toronto',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(now);
        const year = parts.find(function (part) { return part.type === 'year'; });
        const month = parts.find(function (part) { return part.type === 'month'; });
        const day = parts.find(function (part) { return part.type === 'day'; });

        return (year ? year.value : '') + (month ? month.value : '') + (day ? day.value : '');
    }

    function updateDailyGameLink() {
        const dailyGameLink = document.getElementById('daily-game-link');
        if (dailyGameLink) {
            dailyGameLink.href = '/daily?seed=' + getTorontoDailySeed();
        }
    }

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light';
    }

    function setTheme(theme) {
        const selectedTheme = theme || 'system';
        const classToAdd = selectedTheme === 'system'
            ? getSystemTheme()
            : (selectedTheme === 'dark' ? 'theme-dark' : 'theme-light');

        document.body.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(classToAdd);
        document.documentElement.classList.add(classToAdd);

        document.querySelectorAll('.theme-option').forEach(function (button) {
            button.style.background = button.dataset.theme === selectedTheme ? '#444' : 'none';
        });
    }

    function setupThemeControls() {
        document.querySelectorAll('.theme-option').forEach(function (button) {
            button.addEventListener('click', function () {
                const selectedTheme = button.dataset.theme;
                if (selectedTheme === 'system') {
                    localStorage.removeItem('theme');
                } else {
                    localStorage.setItem('theme', selectedTheme);
                }
                setTheme(selectedTheme);
                renderMetricsChart();
            });
        });

        setTheme(localStorage.getItem('theme') || 'system');

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
            if (!localStorage.getItem('theme')) {
                setTheme('system');
                renderMetricsChart();
            }
        });
    }

    function getChartTheme() {
        const isDark = document.body.classList.contains('theme-dark');

        return isDark
            ? {
                legend: '#f2f4f5',
                ticks: '#a7afb8',
                grid: 'rgba(255, 255, 255, 0.08)',
                tooltipBackground: '#14171a',
                tooltipBorder: '#353a40'
            }
            : {
                legend: '#1c1c1c',
                ticks: '#666666',
                grid: 'rgba(0, 0, 0, 0.08)',
                tooltipBackground: '#ffffff',
                tooltipBorder: '#d9d9d9'
            };
    }

    function setupOptionsDropdown() {
        if (!elements.optionsToggleButton || !elements.optionsDropdown) {
            return;
        }

        elements.optionsToggleButton.addEventListener('click', function (event) {
            event.stopPropagation();
            const isOpen = elements.optionsDropdown.classList.toggle('active');
            elements.optionsToggleButton.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', function (event) {
            if (!elements.optionsDropdown.classList.contains('active')) {
                return;
            }

            if (!elements.optionsToggleButton.contains(event.target) && !elements.optionsDropdown.contains(event.target)) {
                elements.optionsDropdown.classList.remove('active');
                elements.optionsToggleButton.setAttribute('aria-expanded', 'false');
            }
        });

        elements.optionsDropdown.addEventListener('click', function (event) {
            event.stopPropagation();
        });
    }

    function getUserDisplayLabel(user) {
        if (!user) {
            return 'Non connecte';
        }

        return user.displayName || user.email || 'Connecte';
    }

    function syncAuthDisplay() {
        const user = state.currentUser;
        const isAuthenticated = Boolean(user && user.uid);
        const statusText = isAuthenticated ? 'Connecte: ' + getUserDisplayLabel(user) : 'Non connecte';
        const buttonText = isAuthenticated ? 'Deconnexion' : 'Connexion';

        if (elements.authStatus) {
            elements.authStatus.classList.toggle('is-authenticated', isAuthenticated);
        }

        if (elements.authText) {
            elements.authText.textContent = statusText;
        }

        if (elements.authButton) {
            elements.authButton.textContent = buttonText;
        }

        if (elements.dropdownAuthButton) {
            elements.dropdownAuthButton.innerHTML = '<span>' + (isAuthenticated ? '🚪' : '🔐') + '</span>' + buttonText;
        }
    }

    async function handleAuthAction() {
        const isAuthenticated = Boolean(state.currentUser && state.currentUser.uid);
        const buttons = [elements.authButton, elements.dropdownAuthButton].filter(Boolean);
        const originalLabels = buttons.map(function (button) {
            return button.innerHTML;
        });

        if (elements.optionsDropdown) {
            elements.optionsDropdown.classList.remove('active');
        }

        if (elements.optionsToggleButton) {
            elements.optionsToggleButton.setAttribute('aria-expanded', 'false');
        }

        buttons.forEach(function (button) {
            button.disabled = true;
            button.textContent = isAuthenticated ? 'Deconnexion...' : 'Connexion...';
        });

        try {
            if (isAuthenticated) {
                if (typeof window.signOutFirebase !== 'function') {
                    throw new Error('Fonction de deconnexion introuvable');
                }
                await window.signOutFirebase();
            } else {
                if (typeof window.signInWithGoogle !== 'function') {
                    throw new Error('Fonction de connexion introuvable');
                }
                await window.signInWithGoogle();
            }
        } catch (error) {
            console.error(error);
            showToast(isAuthenticated ? 'Impossible de se deconnecter.' : 'Impossible de se connecter.', 'error');
        } finally {
            if (window.firebaseAuth) {
                state.currentUser = window.firebaseAuth.currentUser || null;
            }
            buttons.forEach(function (button, index) {
                button.disabled = false;
                button.innerHTML = originalLabels[index];
            });
            syncAuthDisplay();
        }
    }

    function removeAccents(text) {
        if (!text) {
            return '';
        }
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function formatScore(value) {
        return Number(value || 0).toLocaleString('fr-FR');
    }

    function escapeHtml(text) {
        if (!text) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function getPlayerInitial(playerName) {
        if (!playerName) {
            return '?';
        }

        const cleaned = String(playerName).replace(/\[.*?\]/g, '').trim();
        if (!cleaned.length) {
            return '?';
        }

        return cleaned.charAt(0).toUpperCase();
    }

    function getPlayerKey(score) {
        return score.userId || ('name:' + (score.playerName || 'Anonymous'));
    }

    function buildPlayerProfileLookup(scores) {
        const byUserId = new Map();
        const byName = new Map();

        scores.forEach(function (score) {
            if (!score) {
                return;
            }

            const userId = String(score.userId || '').trim();
            const normalizedName = removeAccents(score.playerName || '');
            const existingByUserId = userId ? byUserId.get(userId) : null;
            const existingByName = normalizedName ? byName.get(normalizedName) : null;
            const existing = existingByUserId || existingByName;
            const shouldReplace = !existing
                || (!existing.playerPhotoUrl && score.playerPhotoUrl)
                || (existing.playerName === 'Anonymous' && score.playerName);
            const profile = {
                playerName: score.playerName || 'Anonymous',
                playerPhotoUrl: score.playerPhotoUrl || null
            };

            if (!shouldReplace) {
                return;
            }

            if (userId) {
                byUserId.set(userId, profile);
            }
            if (normalizedName) {
                byName.set(normalizedName, profile);
            }
        });

        return {
            byUserId: byUserId,
            byName: byName
        };
    }

    function syncLatestScoresWithKnownPlayers() {
        if (!state.latestScores.length || !state.allScores.length) {
            return;
        }

        const lookup = buildPlayerProfileLookup(state.allScores);

        state.latestScores = state.latestScores.map(function (score) {
            const userId = String(score.userId || '').trim();
            const normalizedName = removeAccents(score.playerName || '');
            const profile = (userId && lookup.byUserId.get(userId))
                || (normalizedName && lookup.byName.get(normalizedName));

            if (!profile) {
                return score;
            }

            return Object.assign({}, score, {
                playerName: profile.playerName || score.playerName,
                playerPhotoUrl: profile.playerPhotoUrl || score.playerPhotoUrl || null
            });
        });
    }

    function getAvatarColor(playerName) {
        if (!playerName) {
            return '#999999';
        }

        let hash = 0;
        const value = String(playerName);

        for (let i = 0; i < value.length; i += 1) {
            hash = value.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash) % 360;
        return 'hsl(' + hue + ', 70%, 50%)';
    }

    function renderPlayerCell(score) {
        const name = score.playerName || 'Anonymous';
        const safeName = escapeHtml(name);
        const initial = escapeHtml(getPlayerInitial(name));
        const avatarColor = getAvatarColor(name);
        const hasPhoto = Boolean(score.playerPhotoUrl);

        const avatarHtml = hasPhoto
            ? '<img src="' + escapeHtml(score.playerPhotoUrl) + '" alt="Avatar de ' + safeName + '" loading="lazy" referrerpolicy="no-referrer">'
            : initial;

        return [
            '<div class="player-cell">',
            '<span class="player-avatar" style="background-color:', hasPhoto ? 'transparent' : avatarColor, '">',
            avatarHtml,
            '</span>',
            '<span class="player-name">', safeName, '</span>',
            '</div>'
        ].join('');
    }

    function renderPlayerButton(score, label) {
        const buttonLabel = escapeHtml(label || ('Voir tous les scores de ' + (score.playerName || 'Anonymous')));
        return [
            '<button class="player-link" type="button" data-player-key="', escapeHtml(getPlayerKey(score)), '" aria-label="', buttonLabel, '">',
            renderPlayerCell(score),
            '</button>'
        ].join('');
    }

    function renderPlayerAnchor(score, label) {
        const anchorLabel = escapeHtml(label || ('Voir le profil de ' + (score.playerName || 'Anonymous')));
        const href = score.userId ? '/profil/' + encodeURIComponent(score.userId) : buildPlayerScoresUrl(getPlayerKey(score));
        return [
            '<a class="player-link player-link-anchor" href="', href, '" aria-label="', anchorLabel, '">',
            renderPlayerCell(score),
            '</a>'
        ].join('');
    }

    function setSectionState(node, message, type) {
        node.className = 'section-state ' + (type || 'loading');
        node.textContent = message;
    }

    function getToastStack() {
        let stack = document.getElementById('toast-stack');
        if (stack) {
            return stack;
        }

        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
        return stack;
    }

    function showToast(message, type) {
        if (!message) {
            return;
        }

        const stack = getToastStack();
        const item = document.createElement('div');
        item.className = 'toast-item is-' + (type || 'info');
        item.textContent = message;
        stack.appendChild(item);

        setTimeout(function () {
            item.style.opacity = '0';
            item.style.transform = 'translateY(8px)';
            setTimeout(function () {
                if (item.parentNode) {
                    item.parentNode.removeChild(item);
                }
            }, 180);
        }, 3400);
    }

    function getQueryGameId() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('game') || '').trim();
    }

    function getQueryPlayerKey() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('player') || '').trim();
    }

    function getGameById(gameId) {
        return state.gamesById.get(gameId) || null;
    }

    function buildGameUrl(gameId) {
        return '/scores/' + encodeURIComponent(gameId);
    }

    function buildPlayUrl(gameId) {
        return '/b/' + encodeURIComponent(gameId);
    }

    function buildPlayerScoresUrl(playerKey) {
        const params = new URLSearchParams();
        if (playerKey) {
            params.set('player', playerKey);
        }
        const query = params.toString();
        return '/scores/' + (query ? '?' + query : '');
    }

    function updatePlayerQueryParam(playerKey) {
        if (!window.history || typeof window.history.replaceState !== 'function') {
            return;
        }
        window.history.replaceState({}, '', buildPlayerScoresUrl(playerKey));
    }

    async function copyTextToClipboard(text) {
        if (!text) {
            throw new Error('Texte vide');
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return;
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.value = text;
        input.setAttribute('readonly', 'readonly');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, input.value.length);

        try {
            const copied = document.execCommand('copy');
            if (!copied) {
                throw new Error('Copie impossible');
            }
        } finally {
            document.body.removeChild(input);
        }
    }

    function sortScores(list) {
        return list.slice().sort(function (a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            if (a.createdAtMs !== b.createdAtMs) {
                return a.createdAtMs - b.createdAtMs;
            }
            return String(a.id).localeCompare(String(b.id));
        });
    }

    function withCompetitionRanks(sortedList) {
        let currentRank = 0;
        let previousScore = null;

        return sortedList.map(function (item, index) {
            if (previousScore === null || item.score !== previousScore) {
                currentRank = index + 1;
                previousScore = item.score;
            }

            return Object.assign({}, item, { rank: currentRank });
        });
    }

    function bestScoresByPlayer(scores) {
        const byPlayer = new Map();

        scores.forEach(function (score) {
            const key = getPlayerKey(score);
            const current = byPlayer.get(key);

            if (!current) {
                byPlayer.set(key, score);
                return;
            }

            if (score.score > current.score) {
                byPlayer.set(key, score);
                return;
            }

            if (score.score === current.score && score.createdAtMs > current.createdAtMs) {
                byPlayer.set(key, score);
            }
        });

        return Array.from(byPlayer.values());
    }

    function sortScoresChronologically(scores) {
        return scores.slice().sort(function (a, b) {
            if (a.createdAtMs !== b.createdAtMs) {
                return a.createdAtMs - b.createdAtMs;
            }
            return String(a.id).localeCompare(String(b.id));
        });
    }

    function formatTimelineLabel(timestampMs) {
        if (!timestampMs) {
            return 'N/A';
        }

        return new Date(timestampMs).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function formatTimelineTooltipLabel(timestampMs) {
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

    function buildMetricsTimeline(scores) {
        const ordered = sortScoresChronologically(scores);
        const bestByPlayer = new Map();
        const collective = [];
        const highscore = [];

        let collectiveTotal = 0;
        let highScoreValue = 0;

        ordered.forEach(function (score) {
            if (!score.createdAtMs) {
                return;
            }

            const playerKey = score.userId || ('name:' + score.playerName);
            const previousBest = bestByPlayer.has(playerKey) ? bestByPlayer.get(playerKey) : 0;
            let collectiveChanged = false;
            let collectiveContribution = 0;

            if (score.score > previousBest) {
                bestByPlayer.set(playerKey, score.score);
                collectiveContribution = score.score - previousBest;
                collectiveTotal += collectiveContribution;
                collectiveChanged = true;
            }

            if (collectiveChanged) {
                collective.push({
                    x: score.createdAtMs,
                    y: collectiveTotal,
                    playerName: score.playerName || 'Anonymous',
                    contribution: collectiveContribution
                });
            }

            if (score.score > highScoreValue) {
                highScoreValue = score.score;
                highscore.push({
                    x: score.createdAtMs,
                    y: highScoreValue,
                    playerName: score.playerName || 'Anonymous'
                });
            }
        });

        return {
            collective: collective,
            highscore: highscore
        };
    }

    function setMetricsState(message, type) {
        if (!elements.metricsState) {
            return;
        }

        elements.metricsState.textContent = message || '';
        elements.metricsState.className = 'game-metrics-state ' + (type || 'loading');
    }

    function updateMetricToggleButtons() {
        if (elements.toggleMetricCollective) {
            elements.toggleMetricCollective.classList.toggle('is-active', state.metricVisibility.collective);
            elements.toggleMetricCollective.setAttribute('aria-pressed', state.metricVisibility.collective ? 'true' : 'false');
        }

        if (elements.toggleMetricHighscore) {
            elements.toggleMetricHighscore.classList.toggle('is-active', state.metricVisibility.highscore);
            elements.toggleMetricHighscore.setAttribute('aria-pressed', state.metricVisibility.highscore ? 'true' : 'false');
        }
    }

    function destroyMetricsChart() {
        if (state.metricsChart) {
            state.metricsChart.destroy();
            state.metricsChart = null;
        }
    }

    function computeYAxisBoundsFromValues(values) {
        if (!Array.isArray(values) || !values.length) {
            return null;
        }

        const valueMin = Math.min.apply(null, values);
        const valueMax = Math.max.apply(null, values);
        const span = valueMax - valueMin;
        const padding = span > 0
            ? Math.max(1, Math.round(span * 0.08))
            : Math.max(1, Math.round(valueMax * 0.1));

        return {
            min: Math.max(0, valueMin - padding),
            max: valueMax + padding
        };
    }

    function applyChartVisibility() {
        if (!state.metricsChart) {
            return;
        }

        state.metricsChart.setDatasetVisibility(0, state.metricVisibility.collective);
        state.metricsChart.setDatasetVisibility(1, state.metricVisibility.highscore);

        const yScaleOptions = state.metricsChart.options && state.metricsChart.options.scales
            ? state.metricsChart.options.scales.y
            : null;

        if (yScaleOptions) {
            const visibleValues = [];

            if (state.metricsChart.isDatasetVisible(0)) {
                (state.metricsChart.data.datasets[0].data || []).forEach(function (point) {
                    if (point && Number.isFinite(point.y)) {
                        visibleValues.push(point.y);
                    }
                });
            }

            if (state.metricsChart.isDatasetVisible(1)) {
                (state.metricsChart.data.datasets[1].data || []).forEach(function (point) {
                    if (point && Number.isFinite(point.y)) {
                        visibleValues.push(point.y);
                    }
                });
            }

            const bounds = computeYAxisBoundsFromValues(visibleValues);
            if (bounds) {
                yScaleOptions.beginAtZero = false;
                yScaleOptions.min = bounds.min;
                yScaleOptions.max = bounds.max;
            } else {
                yScaleOptions.beginAtZero = true;
                delete yScaleOptions.min;
                delete yScaleOptions.max;
            }
        }

        state.metricsChart.update();
    }

    function renderMetricsChart() {
        if (!elements.metricsChartCanvas || !elements.metricsState) {
            return;
        }

        if (!Array.isArray(state.rawScores) || !state.rawScores.length) {
            destroyMetricsChart();
            elements.metricsChartCanvas.style.display = 'none';
            setMetricsState('Aucun score approuve pour tracer une evolution.', 'empty');
            return;
        }

        if (typeof window.Chart !== 'function') {
            destroyMetricsChart();
            elements.metricsChartCanvas.style.display = 'none';
            setMetricsState('Chart.js indisponible. Impossible d\'afficher le graphique.', 'error');
            return;
        }

        const timeline = buildMetricsTimeline(state.rawScores);

        if (!timeline.collective.length && !timeline.highscore.length) {
            destroyMetricsChart();
            elements.metricsChartCanvas.style.display = 'none';
            setMetricsState('Pas assez de variations pour construire le graphique.', 'empty');
            return;
        }

        const initialVisibleValues = [];
        if (state.metricVisibility.collective) {
            timeline.collective.forEach(function (point) {
                if (point && Number.isFinite(point.y)) {
                    initialVisibleValues.push(point.y);
                }
            });
        }
        if (state.metricVisibility.highscore) {
            timeline.highscore.forEach(function (point) {
                if (point && Number.isFinite(point.y)) {
                    initialVisibleValues.push(point.y);
                }
            });
        }
        const initialBounds = computeYAxisBoundsFromValues(initialVisibleValues);
        const chartTheme = getChartTheme();

        elements.metricsChartCanvas.style.display = 'block';
        setMetricsState('', 'hidden');

        destroyMetricsChart();

        state.metricsChart = new window.Chart(elements.metricsChartCanvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Score collectif',
                        data: timeline.collective,
                        hidden: !state.metricVisibility.collective,
                        borderColor: '#0b7a63',
                        backgroundColor: 'rgba(11, 122, 99, 0.14)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0,
                        fill: false
                    },
                    {
                        label: 'High score',
                        data: timeline.highscore,
                        hidden: !state.metricVisibility.highscore,
                        borderColor: '#cc6b1f',
                        backgroundColor: 'rgba(204, 107, 31, 0.14)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: chartTheme.legend
                        }
                    },
                    tooltip: {
                        backgroundColor: chartTheme.tooltipBackground,
                        titleColor: chartTheme.legend,
                        bodyColor: chartTheme.legend,
                        borderColor: chartTheme.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            title: function (items) {
                                if (!items || !items.length || !items[0].parsed) {
                                    return '';
                                }
                                return formatTimelineTooltipLabel(items[0].parsed.x);
                            },
                            label: function (context) {
                                const playerName = context.raw && context.raw.playerName ? context.raw.playerName : 'Anonymous';
                                if (context.datasetIndex === 0) {
                                    const contribution = context.raw && Number.isFinite(context.raw.contribution) ? context.raw.contribution : 0;
                                    return context.dataset.label + ': ' + formatScore(context.parsed.y) + ' (par ' + playerName + ', +' + formatScore(contribution) + ')';
                                }

                                return context.dataset.label + ': ' + formatScore(context.parsed.y) + ' (par ' + playerName + ')';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        grid: {
                            color: chartTheme.grid
                        },
                        ticks: {
                            color: chartTheme.ticks,
                            callback: function (value) {
                                return formatTimelineLabel(value);
                            },
                            maxTicksLimit: 6
                        }
                    },
                    y: {
                        beginAtZero: !initialBounds,
                        min: initialBounds ? initialBounds.min : undefined,
                        max: initialBounds ? initialBounds.max : undefined,
                        grid: {
                            color: chartTheme.grid
                        },
                        ticks: {
                            color: chartTheme.ticks,
                            callback: function (value) {
                                return formatScore(value);
                            }
                        }
                    }
                }
            }
        });

        applyChartVisibility();
    }

    function toggleMetricVisibility(metric) {
        if (metric !== 'collective' && metric !== 'highscore') {
            return;
        }

        state.metricVisibility[metric] = !state.metricVisibility[metric];

        if (!state.metricVisibility.collective && !state.metricVisibility.highscore) {
            state.metricVisibility[metric] = true;
        }

        updateMetricToggleButtons();
        applyChartVisibility();
    }

    function renderSearchResults(games) {
        if (!elements.searchResults) {
            return;
        }

        if (!elements.searchInput.value.trim()) {
            elements.searchResults.innerHTML = '';
            return;
        }

        if (!games.length) {
            elements.searchResults.innerHTML = '<p class="search-empty">Aucun jeu ne correspond a la recherche...</p>';
            return;
        }

        elements.searchResults.innerHTML = games.slice(0, 8).map(function (game) {
            const title = escapeHtml(game.title || game.id);
            return [
                '<a class="search-result-item" href="',
                buildGameUrl(game.id),
                '">',
                '<img src="',
                escapeHtml(game.coverArt || '/assets/images/placeholder_thumb.png'),
                '" alt="',
                title,
                '" loading="lazy">',
                '<span>',
                title,
                '</span>',
                '</a>'
            ].join('');
        }).join('');
    }

    function onSearchInput() {
        const term = removeAccents(elements.searchInput.value);
        if (!term) {
            renderSearchResults([]);
            return;
        }

        const matches = state.games.filter(function (game) {
            return removeAccents(game.title || '').includes(term);
        });

        renderSearchResults(matches);
    }

    function renderFeaturedGames() {
        if (!state.featuredIds.length) {
            setSectionState(elements.featuredState, 'Aucun jeu vedette disponible pour le moment.', 'empty');
            return;
        }

        const items = state.featuredIds.map(function (gameId) {
            return getGameById(gameId);
        }).filter(Boolean);

        if (!items.length) {
            setSectionState(elements.featuredState, 'Impossible de retrouver les jeux vedettes dans la gamelist.', 'error');
            return;
        }

        elements.featuredState.style.display = 'none';
        elements.featuredList.innerHTML = items.map(function (game) {
            const title = escapeHtml(game.title || game.id);
            return [
                '<article class="featured-card">',
                '<a href="', buildGameUrl(game.id), '">',
                '<img src="', escapeHtml(game.coverArt || '/assets/images/placeholder_thumb.png'), '" alt="', title, '" loading="lazy">',
                '<h3>', title, '</h3>',
                '</a>',
                '</article>'
            ].join('');
        }).join('');
    }

    function renderLatestScores() {
        if (!state.latestScores.length) {
            setSectionState(elements.latestScoresState, 'Aucun score recent a afficher.', 'empty');
            return;
        }

        elements.latestScoresState.style.display = 'none';

        elements.latestScoresList.innerHTML = state.latestScores.map(function (score) {
            const commentHtml = score.comment ? '<p class="latest-score-comment">' + escapeHtml(score.comment) + '</p>' : '';

            return [
                '<article class="latest-score-row">',
                '<div class="latest-score-main">',
                '<a class="latest-score-game" href="', buildGameUrl(score.gameId), '">', escapeHtml(score.gameTitle || score.gameId), '</a>',
                '<p class="latest-score-player">', renderPlayerButton(score), ' · ', formatScore(score.score), '</p>',
                '<p class="latest-score-date">', window.BonjourArcadeScoresService.formatDate(score.createdAtMs), '</p>',
                commentHtml,
                '</div>',
                '</article>'
            ].join('');
        }).join('');
    }

    function computeMedalsRanking(scores) {
        const scoresByGame = new Map();

        scores.forEach(function (score) {
            if (!score || !score.gameId) {
                return;
            }

            if (!scoresByGame.has(score.gameId)) {
                scoresByGame.set(score.gameId, []);
            }

            scoresByGame.get(score.gameId).push(score);
        });

        const medalsByPlayer = new Map();

        function ensurePlayerEntry(score) {
            const key = getPlayerKey(score);
            if (!medalsByPlayer.has(key)) {
                medalsByPlayer.set(key, {
                    key: key,
                    playerName: score.playerName || 'Anonymous',
                    playerPhotoUrl: score.playerPhotoUrl || null,
                    userId: score.userId || '',
                    gold: 0,
                    silver: 0,
                    bronze: 0
                });
            }

            const entry = medalsByPlayer.get(key);
            if (!entry.playerPhotoUrl && score.playerPhotoUrl) {
                entry.playerPhotoUrl = score.playerPhotoUrl;
            }
            return entry;
        }

        scoresByGame.forEach(function (gameScores) {
            const rankedBestScores = withCompetitionRanks(sortScores(bestScoresByPlayer(gameScores)));

            rankedBestScores.forEach(function (score) {
                if (score.rank < 1 || score.rank > 3) {
                    return;
                }

                const entry = ensurePlayerEntry(score);
                if (score.rank === 1) {
                    entry.gold += 1;
                    return;
                }
                if (score.rank === 2) {
                    entry.silver += 1;
                    return;
                }
                entry.bronze += 1;
            });
        });

        return Array.from(medalsByPlayer.values()).map(function (entry) {
            return Object.assign(entry, {
                total: entry.gold + entry.silver + entry.bronze
            });
        }).sort(function (a, b) {
            if (b.gold !== a.gold) {
                return b.gold - a.gold;
            }
            if (b.silver !== a.silver) {
                return b.silver - a.silver;
            }
            if (b.bronze !== a.bronze) {
                return b.bronze - a.bronze;
            }
            return String(a.playerName || '').localeCompare(String(b.playerName || ''), 'fr', { sensitivity: 'base' });
        });
    }

    function renderMedalsRanking() {
        if (!state.medalsRanking.length) {
            setSectionState(elements.medalsState, 'Aucune medaille a calculer pour le moment.', 'empty');
            elements.medalsBody.innerHTML = '';
            hidePlayerScores();
            return;
        }

        elements.medalsState.style.display = 'none';
        elements.medalsBody.innerHTML = state.medalsRanking.map(function (entry, index) {
            return [
                '<tr>',
                '<td class="medal-rank">', String(index + 1), '</td>',
                '<td>', renderPlayerButton(entry, 'Voir tous les scores de ' + (entry.playerName || 'Anonymous')), '</td>',
                '<td class="medal-count is-gold">', String(entry.gold), '</td>',
                '<td class="medal-count is-silver">', String(entry.silver), '</td>',
                '<td class="medal-count is-bronze">', String(entry.bronze), '</td>',
                '<td class="medal-count">', String(entry.total), '</td>',
                '</tr>'
            ].join('');
        }).join('');
    }

    function hidePlayerScores() {
        closeProofModal();
        state.selectedPlayerKey = '';
        setPlayerScoresVisibility(false);
        renderPendingScoresState('', 'empty');
        elements.playerScoresBody.innerHTML = '';
        elements.playerScoresTitle.textContent = 'Scores du joueur';
        elements.playerScoresSubtitle.textContent = '';
        closePlayerNameEditor(true);
        updatePlayerQueryParam('');

        if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
            state.lastFocusedElement.focus();
        }

        state.lastFocusedElement = null;
    }

    async function handleCopyPlayerLink() {
        if (!state.selectedPlayerKey) {
            showToast('Aucun joueur selectionne.', 'info');
            return;
        }

        try {
            await copyTextToClipboard(window.location.origin + buildPlayerScoresUrl(state.selectedPlayerKey));
            showToast('Lien du joueur copie.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Impossible de copier le lien du joueur.', 'error');
        }
    }

    function handleMyScoresClick() {
        if (!state.currentUser || !state.currentUser.uid) {
            showToast('Connecte-toi pour voir tes scores.', 'info');
            return;
        }

        showPlayerScores(state.currentUser.uid);
    }

    function setPlayerScoresVisibility(isVisible) {
        if (!elements.playerScoresPanel) {
            return;
        }

        elements.playerScoresPanel.style.display = isVisible ? 'flex' : 'none';
        elements.playerScoresPanel.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
        document.body.classList.toggle('player-scores-open', isVisible);
    }

    function isViewingOwnPlayerProfile() {
        return Boolean(
            state.currentUser
            && state.currentUser.uid
            && state.selectedPlayerKey
            && state.currentUser.uid === state.selectedPlayerKey
        );
    }

    function getUserScoreStatusLabel(status) {
        if (status === 'approved') {
            return 'Approuve';
        }

        if (status === 'rejected') {
            return 'Refuse';
        }

        return 'En attente';
    }

    function renderPendingScoresState(message, type) {
        if (!elements.playerScoresPending) {
            return;
        }

        if (!message) {
            elements.playerScoresPending.hidden = true;
            elements.playerScoresPending.innerHTML = '';
            return;
        }

        elements.playerScoresPending.hidden = false;
        elements.playerScoresPending.innerHTML = [
            '<section class="player-pending-section">',
            '<div class="player-pending-head">',
            '<h4>Mes soumissions en attente</h4>',
            '<p>Ces scores ne sont visibles que par toi jusqu\'a leur approbation.</p>',
            '</div>',
            '<div class="section-state', type === 'loading' ? ' loading' : '', '">', escapeHtml(message), '</div>',
            '</section>'
        ].join('');
    }

    function renderPendingScoresSection(scores) {
        if (!elements.playerScoresPending) {
            return;
        }

        if (!scores.length) {
            renderPendingScoresState('Aucune soumission en attente pour le moment.', 'empty');
            return;
        }

        elements.playerScoresPending.hidden = false;
        elements.playerScoresPending.innerHTML = [
            '<section class="player-pending-section">',
            '<div class="player-pending-head">',
            '<h4>Mes soumissions en attente</h4>',
            '<p>Ces scores ne sont visibles que par toi jusqu\'a leur approbation.</p>',
            '</div>',
            '<table class="player-pending-table" aria-label="Mes soumissions en attente">',
            '<thead><tr><th>Jeu</th><th>Score</th><th>Date</th><th>Statut</th><th>Preuve</th><th>Commentaire</th></tr></thead>',
            '<tbody>',
            scores.map(function (score) {
                const game = getGameById(score.gameId);
                const gameLabel = escapeHtml((game && game.title) || (score.gameTitle && score.gameTitle !== 'Unknown Game' ? score.gameTitle : '') || score.gameId || 'Jeu inconnu');
                const comment = score.comment ? escapeHtml(score.comment) : '—';
                const proofButton = score.screenshotUrl
                    ? '<button class="proof-btn" type="button" data-proof-url="' + escapeHtml(score.screenshotUrl) + '">Voir</button>'
                    : '—';

                return [
                    '<tr>',
                    '<td><a class="player-score-game" href="', buildGameUrl(score.gameId), '">', gameLabel, '</a></td>',
                    '<td class="col-score">', formatScore(score.score), '</td>',
                    '<td>', window.BonjourArcadeScoresService.formatDate(score.createdAtMs), '</td>',
                    '<td><span class="player-score-status is-', escapeHtml(score.status || 'pending'), '">', escapeHtml(getUserScoreStatusLabel(score.status)), '</span></td>',
                    '<td class="player-score-proof">', proofButton, '</td>',
                    '<td class="player-score-comment">', comment, '</td>',
                    '</tr>'
                ].join('');
            }).join(''),
            '</tbody></table>',
            '</section>'
        ].join('');
    }

    async function ensureCurrentUserScoresLoaded(playerKey) {
        if (!state.currentUser || state.currentUser.uid !== playerKey) {
            state.currentUserScores = [];
            state.currentUserScoresLoadedFor = '';
            return [];
        }

        const scores = await window.BonjourArcadeScoresService.getUserScores(playerKey);
        state.currentUserScores = scores;
        state.currentUserScoresLoadedFor = playerKey;
        return scores.slice();
    }

    function renderApprovedPlayerScoresRows(playerScores) {
        if (!playerScores.length) {
            return '<tr><td class="player-scores-empty" colspan="5">Aucun score approuve pour le moment.</td></tr>';
        }

        return playerScores.map(function (score) {
            const game = getGameById(score.gameId);
            const gameLabel = escapeHtml((game && game.title) || score.gameTitle || score.gameId || 'Jeu inconnu');
            const comment = score.comment ? escapeHtml(score.comment) : '—';
            const proofButton = score.screenshotUrl
                ? '<button class="proof-btn" type="button" data-proof-url="' + escapeHtml(score.screenshotUrl) + '">Voir</button>'
                : '';

            return [
                '<tr>',
                '<td><a class="player-score-game" href="', buildGameUrl(score.gameId), '">', gameLabel, '</a></td>',
                '<td class="col-score">', formatScore(score.score), '</td>',
                '<td>', window.BonjourArcadeScoresService.formatDate(score.createdAtMs), '</td>',
                '<td class="player-score-proof">', proofButton, '</td>',
                '<td class="player-score-comment">', comment, '</td>',
                '</tr>'
            ].join('');
        }).join('');
    }

    function updatePlayerScoresSummary(playerKey, playerScores, pendingScores) {
        const approvedGameCount = new Set(playerScores.map(function (score) {
            return score.gameId;
        })).size;
        const fallbackName = state.currentUser && state.currentUser.uid === playerKey
            ? (state.currentUser.displayName || 'Anonymous')
            : 'Anonymous';
        const playerName = (playerScores[0] && playerScores[0].playerName) || fallbackName;
        const subtitleParts = [];

        elements.playerScoresTitle.textContent = 'Tous les scores de ' + playerName;

        if (playerScores.length) {
            subtitleParts.push(playerScores.length + ' score' + (playerScores.length > 1 ? 's' : '') + ' approuve' + (playerScores.length > 1 ? 's' : '') + ' sur ' + approvedGameCount + ' jeu' + (approvedGameCount > 1 ? 'x' : '') + '.');
        } else {
            subtitleParts.push('Aucun score approuve pour le moment.');
        }

        if (pendingScores.length) {
            subtitleParts.push(pendingScores.length + ' soumission' + (pendingScores.length > 1 ? 's' : '') + ' en attente de validation.');
        }

        elements.playerScoresSubtitle.textContent = subtitleParts.join(' ');
    }

    function syncPlayerScoresScrollPosition() {
        window.requestAnimationFrame(function () {
            if (elements.playerScoresDialog) {
                elements.playerScoresDialog.focus();
            }

            if (elements.playerScoresScrollArea) {
                elements.playerScoresScrollArea.scrollTop = 0;
            }
        });
    }

    function syncMyScoresButton() {
        if (!elements.myScoresButton) {
            return;
        }

        const isLoggedIn = Boolean(state.currentUser && state.currentUser.uid);
        elements.myScoresButton.hidden = !isLoggedIn;

        const profilLink = document.getElementById('profil-link');
        if (profilLink) {
            profilLink.hidden = !isLoggedIn;
        }

        const dropdownProfilLink = document.getElementById('dropdown-profil-link');
        if (dropdownProfilLink) {
            dropdownProfilLink.hidden = !isLoggedIn;
        }

        syncAuthDisplay();
    }

    function setPlayerNameEditStatus(message, type) {
        if (!elements.playerNameEditStatus) {
            return;
        }

        elements.playerNameEditStatus.textContent = message || '';
        elements.playerNameEditStatus.className = 'player-name-edit-status' + (type ? ' is-' + type : '');
    }

    function closePlayerNameEditor(clearStatus) {
        if (elements.playerNameEditForm) {
            elements.playerNameEditForm.hidden = true;
        }

        if (elements.playerNameEditButton) {
            elements.playerNameEditButton.hidden = !isViewingOwnPlayerProfile();
        }

        if (clearStatus) {
            setPlayerNameEditStatus('');
        }
    }

    function syncPlayerNameEditingAvailability() {
        if (!elements.playerNameEditButton || !elements.playerNameEditForm || !elements.playerNameEditInput) {
            return;
        }

        if (!isViewingOwnPlayerProfile()) {
            elements.playerNameEditButton.hidden = true;
            elements.playerNameEditForm.hidden = true;
            setPlayerNameEditStatus('');
            return;
        }

        elements.playerNameEditButton.hidden = false;
        elements.playerNameEditInput.value = (state.currentUser && state.currentUser.displayName) || '';
    }

    function applyPlayerNameLocally(userId, displayName) {
        function updateList(list) {
            list.forEach(function (score) {
                if (score && score.userId === userId) {
                    score.playerName = displayName;
                }
            });
        }

        updateList(state.allScores);
        updateList(state.latestScores);
        updateList(state.rawScores);
        updateList(state.filteredScores);

        renderLatestScores();
        state.medalsRanking = computeMedalsRanking(state.allScores);
        renderMedalsRanking();

        if (state.selectedPlayerKey === userId) {
            elements.playerScoresTitle.textContent = 'Tous les scores de ' + displayName;
        }
    }

    async function handlePlayerNameEditSubmit(event) {
        event.preventDefault();

        if (!isViewingOwnPlayerProfile() || typeof window.updateFirebaseDisplayName !== 'function') {
            setPlayerNameEditStatus('Modification indisponible pour le moment.', 'error');
            return;
        }

        const nextDisplayName = String(elements.playerNameEditInput.value || '').trim();

        if (!nextDisplayName) {
            setPlayerNameEditStatus('Entre un nom d\'affichage.', 'error');
            return;
        }

        elements.playerNameEditSave.disabled = true;
        elements.playerNameEditCancel.disabled = true;
        setPlayerNameEditStatus('Mise a jour du nom en cours...');

        try {
            const updatedUser = await window.updateFirebaseDisplayName(nextDisplayName);
            state.currentUser = updatedUser || state.currentUser;
            applyPlayerNameLocally(state.currentUser.uid, nextDisplayName);
            closePlayerNameEditor(false);
            setPlayerNameEditStatus('Nom mis a jour.', 'success');
            showToast('Nom d\'affichage mis a jour.', 'success');
        } catch (error) {
            console.error(error);
            setPlayerNameEditStatus('Impossible de mettre a jour le nom.', 'error');
        } finally {
            elements.playerNameEditSave.disabled = false;
            elements.playerNameEditCancel.disabled = false;
        }
    }

    function openPlayerNameEditor() {
        if (!isViewingOwnPlayerProfile() || !elements.playerNameEditForm || !elements.playerNameEditInput) {
            return;
        }

        elements.playerNameEditForm.hidden = false;
        elements.playerNameEditButton.hidden = true;
        elements.playerNameEditInput.value = (state.currentUser && state.currentUser.displayName) || '';
        setPlayerNameEditStatus('');
        window.requestAnimationFrame(function () {
            elements.playerNameEditInput.focus();
            elements.playerNameEditInput.select();
        });
    }

    async function showPlayerScores(playerKey) {
        if (!playerKey) {
            hidePlayerScores();
            return;
        }

        const playerScores = state.allScores.filter(function (score) {
            return getPlayerKey(score) === playerKey;
        }).sort(function (a, b) {
            if (b.createdAtMs !== a.createdAtMs) {
                return b.createdAtMs - a.createdAtMs;
            }
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return String(a.id).localeCompare(String(b.id));
        });

        const isOwnProfile = Boolean(state.currentUser && state.currentUser.uid === playerKey);
        const isDirectPlayerRoute = getQueryPlayerKey() === playerKey;

        if (!playerScores.length && !isOwnProfile && !isDirectPlayerRoute) {
            hidePlayerScores();
            return;
        }

        state.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        state.selectedPlayerKey = playerKey;
        updatePlayerQueryParam(playerKey);
        syncPlayerNameEditingAvailability();
        updatePlayerScoresSummary(playerKey, playerScores, []);
        elements.playerScoresBody.innerHTML = renderApprovedPlayerScoresRows(playerScores);

        if (isOwnProfile) {
            renderPendingScoresState('Chargement de tes soumissions...', 'loading');
        } else if (!playerScores.length && isDirectPlayerRoute) {
            renderPendingScoresState('Connecte-toi pour voir d\'eventuelles soumissions privees associees a ce profil.', 'empty');
        } else {
            renderPendingScoresState('', 'empty');
        }

        setPlayerScoresVisibility(true);
        syncPlayerScoresScrollPosition();

        if (!isOwnProfile) {
            return;
        }

        try {
            const ownScores = await ensureCurrentUserScoresLoaded(playerKey);

            if (state.selectedPlayerKey !== playerKey) {
                return;
            }

            const pendingScores = ownScores.filter(function (score) {
                return score.status !== 'approved';
            });

            updatePlayerScoresSummary(playerKey, playerScores, pendingScores);
            renderPendingScoresSection(pendingScores);
        } catch (error) {
            console.error(error);

            if (state.selectedPlayerKey !== playerKey) {
                return;
            }

            renderPendingScoresState('Impossible de charger tes soumissions privees.', 'error');
        }
    }

    function trapScrollWithin(container) {
        if (!container) {
            return;
        }

        container.addEventListener('wheel', function (event) {
            const maxScrollTop = container.scrollHeight - container.clientHeight;

            if (maxScrollTop <= 0) {
                event.preventDefault();
                return;
            }

            const nextScrollTop = container.scrollTop + event.deltaY;
            const isPastTop = nextScrollTop <= 0 && event.deltaY < 0;
            const isPastBottom = nextScrollTop >= maxScrollTop && event.deltaY > 0;

            event.stopPropagation();

            if (isPastTop || isPastBottom) {
                event.preventDefault();
            }
        }, { passive: false });
    }

    function openProofModal(url) {
        if (!url) {
            return;
        }

        elements.proofModal.classList.remove('is-error');
        elements.proofModal.classList.add('is-loading');
        if (elements.proofModalLoaderText) {
            elements.proofModalLoaderText.textContent = 'Chargement de la preuve...';
        }
        elements.proofModalImage.removeAttribute('src');
        elements.proofModalImage.src = url;
        elements.proofModal.style.display = 'flex';
    }

    function closeProofModal() {
        elements.proofModal.style.display = 'none';
        elements.proofModal.classList.remove('is-loading', 'is-error');
        elements.proofModalImage.src = '';
    }

    function bindProofImageLoadingEvents() {
        elements.proofModalImage.addEventListener('load', function () {
            elements.proofModal.classList.remove('is-loading', 'is-error');
        });

        elements.proofModalImage.addEventListener('error', function () {
            elements.proofModal.classList.remove('is-loading');
            elements.proofModal.classList.add('is-error');
            if (elements.proofModalLoaderText) {
                elements.proofModalLoaderText.textContent = 'Impossible de charger cette preuve.';
            }
        });
    }

    function openAdminEditModal(score) {
        elements.adminEditScoreId.value = score.id;
        elements.adminEditGameId.value = score.gameId || state.gameId;
        elements.adminEditScore.value = String(score.score || 0);
        elements.adminEditComment.value = score.comment || '';
        elements.adminEditError.textContent = '';
        elements.adminEditModal.style.display = 'flex';
        setTimeout(function () {
            elements.adminEditScore.focus();
            elements.adminEditScore.select();
        }, 0);
    }

    function closeAdminEditModal() {
        elements.adminEditModal.style.display = 'none';
        elements.adminEditError.textContent = '';
        elements.adminEditForm.reset();
    }

    function openAdminDeleteModal(scoreId, button) {
        state.pendingDeleteScoreId = scoreId;
        state.pendingDeleteButton = button || null;
        elements.adminDeleteError.textContent = '';
        elements.adminDeleteConfirm.disabled = false;
        elements.adminDeleteCancel.disabled = false;
        elements.adminDeleteConfirm.textContent = 'Supprimer';
        elements.adminDeleteModal.style.display = 'flex';
    }

    function closeAdminDeleteModal() {
        elements.adminDeleteModal.style.display = 'none';
        elements.adminDeleteError.textContent = '';
        state.pendingDeleteScoreId = '';
        state.pendingDeleteButton = null;
        elements.adminDeleteConfirm.disabled = false;
        elements.adminDeleteCancel.disabled = false;
        elements.adminDeleteConfirm.textContent = 'Supprimer';
    }

    function renderLeaderboardPageChunk() {
        const nextSlice = state.filteredScores.slice(state.visibleCount, state.visibleCount + PAGE_SIZE);

        if (!nextSlice.length) {
            if (state.visibleCount === 0) {
                setSectionState(elements.leaderboardState, 'Aucun score approuve pour ce jeu.', 'empty');
            }
            elements.loadMoreState.textContent = '';
            return;
        }

        elements.leaderboardState.style.display = 'none';

        const rowsHtml = nextSlice.map(function (score) {
            const proofButton = score.screenshotUrl
                ? '<button class="proof-btn" type="button" data-proof-url="' + escapeHtml(score.screenshotUrl) + '">Voir</button>'
                : '';
            const playerCell = renderPlayerAnchor(score);

            return [
                '<tr data-score-id="', escapeHtml(score.id), '" data-user-id="', escapeHtml(score.userId), '" data-game-id="', escapeHtml(score.gameId), '">',
                '<td>', String(score.rank), '</td>',
                '<td>', playerCell, '</td>',
                '<td class="col-score">', formatScore(score.score), '</td>',
                '<td>', window.BonjourArcadeScoresService.formatDate(score.createdAtMs), '</td>',
                '<td>', proofButton, '</td>',
                '<td class="col-comment">', escapeHtml(score.comment || ''), '</td>',
                '<td class="col-admin" data-admin-hook="score-actions">',
                '<div class="admin-actions">',
                '<button type="button" data-admin-action="edit" data-score-id="', escapeHtml(score.id), '">Modifier</button>',
                '<button type="button" data-admin-action="delete" data-score-id="', escapeHtml(score.id), '">Supprimer</button>',
                '</div>',
                '</td>',
                '</tr>'
            ].join('');
        }).join('');

        elements.tableBody.insertAdjacentHTML('beforeend', rowsHtml);
        state.visibleCount += nextSlice.length;

        if (state.visibleCount < state.filteredScores.length) {
            elements.loadMoreState.textContent = 'Chargement des 100 suivants...';
        } else {
            elements.loadMoreState.textContent = 'Fin de la liste';
        }
    }

    function recomputeGameScores() {
        const baseScores = state.currentViewMode === 'best' ? bestScoresByPlayer(state.rawScores) : state.rawScores.slice();
        const sorted = sortScores(baseScores);
        state.filteredScores = withCompetitionRanks(sorted);
        state.visibleCount = 0;
        elements.tableBody.innerHTML = '';
        elements.leaderboardState.style.display = 'block';
        setSectionState(elements.leaderboardState, 'Chargement des scores...', 'loading');
        renderLeaderboardPageChunk();
    }

    function findScoreById(scoreId) {
        return state.rawScores.find(function (score) {
            return score.id === scoreId;
        }) || null;
    }

    async function refreshGameScoresSilently() {
        state.rawScores = await window.BonjourArcadeScoresService.listGameScores(state.gameId);
        recomputeGameScores();
        renderMetricsChart();
    }

    function handleAdminDelete(scoreId, button) {
        if (!state.isAdmin) {
            showToast('Action reservee aux administrateurs.', 'error');
            return;
        }

        if (typeof window.deleteGameScore !== 'function') {
            showToast('Fonction Firebase deleteScore indisponible.', 'error');
            return;
        }

        openAdminDeleteModal(scoreId, button);
    }

    async function confirmAdminDelete() {
        if (!state.isAdmin) {
            showToast('Action reservee aux administrateurs.', 'error');
            return;
        }

        const scoreId = state.pendingDeleteScoreId;
        const button = state.pendingDeleteButton;

        if (!scoreId) {
            closeAdminDeleteModal();
            return;
        }

        const previousText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Suppression...';
        }

        elements.adminDeleteError.textContent = '';
        elements.adminDeleteConfirm.disabled = true;
        elements.adminDeleteCancel.disabled = true;
        elements.adminDeleteConfirm.textContent = 'Suppression...';

        try {
            await window.deleteGameScore(scoreId);
            closeAdminDeleteModal();
            await refreshGameScoresSilently();
            showToast('Score supprime avec succes.', 'success');
        } catch (error) {
            console.error(error);
            const errorMessage = 'Echec de suppression: ' + (error.message || 'Erreur inconnue');
            elements.adminDeleteError.textContent = errorMessage;
            showToast(errorMessage, 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = previousText;
            }
            elements.adminDeleteConfirm.disabled = false;
            elements.adminDeleteCancel.disabled = false;
            elements.adminDeleteConfirm.textContent = 'Supprimer';
        }
    }

    async function handleAdminEdit(scoreId) {
        if (!state.isAdmin) {
            showToast('Action reservee aux administrateurs.', 'error');
            return;
        }

        const currentScore = findScoreById(scoreId);
        if (!currentScore) {
            showToast('Score introuvable dans la vue actuelle.', 'error');
            return;
        }

        openAdminEditModal(currentScore);
    }

    async function submitAdminEditForm(event) {
        event.preventDefault();

        if (!state.isAdmin) {
            showToast('Action reservee aux administrateurs.', 'error');
            return;
        }

        if (typeof window.verifyGameScore !== 'function') {
            elements.adminEditError.textContent = 'Fonction Firebase verifyScore indisponible.';
            return;
        }

        const scoreId = elements.adminEditScoreId.value;
        const nextGameId = (elements.adminEditGameId.value || '').trim();
        const nextScore = Number(elements.adminEditScore.value);
        const nextCommentRaw = elements.adminEditComment.value || '';

        if (!scoreId) {
            elements.adminEditError.textContent = 'Score invalide.';
            return;
        }

        if (!nextGameId) {
            elements.adminEditError.textContent = 'Le Game ID est obligatoire.';
            return;
        }

        if (!Number.isFinite(nextScore) || nextScore < 0) {
            elements.adminEditError.textContent = 'Le score doit etre un nombre positif.';
            return;
        }

        elements.adminEditError.textContent = '';
        elements.adminEditSubmit.disabled = true;
        elements.adminEditCancel.disabled = true;
        elements.adminEditSubmit.textContent = 'Enregistrement...';

        try {
            await window.verifyGameScore(scoreId, {
                gameId: nextGameId,
                score: nextScore,
                comment: nextCommentRaw.trim() ? nextCommentRaw : null
            }, false);

            closeAdminEditModal();
            await refreshGameScoresSilently();
            showToast('Score mis a jour avec succes.', 'success');
        } catch (error) {
            console.error(error);
            const errorMessage = 'Echec de mise a jour: ' + (error.message || 'Erreur inconnue');
            elements.adminEditError.textContent = errorMessage;
            showToast(errorMessage, 'error');
        } finally {
            elements.adminEditSubmit.disabled = false;
            elements.adminEditCancel.disabled = false;
            elements.adminEditSubmit.textContent = 'Enregistrer';
        }
    }

    function setupInfiniteScroll() {
        if (state.observer) {
            state.observer.disconnect();
        }

        state.observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                if (state.visibleCount >= state.filteredScores.length) {
                    return;
                }
                renderLeaderboardPageChunk();
            });
        }, {
            rootMargin: '250px 0px 250px 0px'
        });

        state.observer.observe(elements.loadMoreSentinel);
    }

    function renderGameHeader(gameId) {
        const game = getGameById(gameId);
        const playUrl = buildPlayUrl(gameId);

        if (elements.leaderboardGameLink) {
            elements.leaderboardGameLink.href = playUrl;
        }

        if (elements.leaderboardPlayLink) {
            elements.leaderboardPlayLink.href = playUrl;
        }

        if (game) {
            elements.leaderboardTitle.textContent = game.title || game.id;
            elements.leaderboardSubtitle.textContent = 'Classement des scores approuvés';
            elements.gameCover.src = game.coverArt || '/assets/images/placeholder_thumb.png';
            elements.gameCover.alt = game.title || game.id;
        } else {
            elements.leaderboardTitle.textContent = gameId;
            elements.leaderboardSubtitle.textContent = 'Jeu introuvable dans la gamelist, mais les scores restent accessibles.';
            elements.gameCover.src = '/assets/images/placeholder_thumb.png';
            elements.gameCover.alt = gameId;
        }
    }

    async function loadCatalogView() {
        elements.catalogView.style.display = 'block';
        elements.gameView.style.display = 'none';

        setSectionState(elements.featuredState, 'Chargement des jeux vedettes...', 'loading');
        setSectionState(elements.latestScoresState, 'Chargement des derniers scores...', 'loading');
        setSectionState(elements.medalsState, 'Calcul du classement des medailles...', 'loading');

        const results = await Promise.allSettled([
                window.BonjourArcadeScoresService.getFeaturedGameIds(5),
                window.BonjourArcadeScoresService.getLatestScores(),
                window.BonjourArcadeScoresService.listGameScores('all')
            ]);

        if (results[0].status === 'fulfilled') {
            state.featuredIds = results[0].value;
            renderFeaturedGames();
        } else {
            console.error(results[0].reason);
            setSectionState(elements.featuredState, 'Erreur pendant le chargement des jeux vedettes.', 'error');
        }

        if (results[1].status === 'fulfilled') {
            state.latestScores = results[1].value;
        } else {
            console.error(results[1].reason);
            setSectionState(elements.latestScoresState, 'Erreur pendant le chargement des derniers scores.', 'error');
        }

        if (results[2].status === 'fulfilled') {
            state.allScores = results[2].value;
            if (results[1].status === 'fulfilled') {
                syncLatestScoresWithKnownPlayers();
                renderLatestScores();
            }
            state.medalsRanking = computeMedalsRanking(state.allScores);
            renderMedalsRanking();
            if (state.selectedPlayerKey) {
                showPlayerScores(state.selectedPlayerKey);
            }
        } else {
            console.error(results[2].reason);
            state.allScores = [];
            state.medalsRanking = [];
            hidePlayerScores();
            setSectionState(elements.medalsState, 'Erreur pendant le calcul des medailles.', 'error');
        }
    }

    async function loadGameView(gameId) {
        state.gameId = gameId;

        elements.catalogView.style.display = 'none';
        elements.gameView.style.display = 'block';

        renderGameHeader(gameId);
        setSectionState(elements.leaderboardState, 'Chargement des scores...', 'loading');

        try {
            state.rawScores = await window.BonjourArcadeScoresService.listGameScores(gameId);
            state.currentViewMode = 'all';
            elements.toggleAll.classList.add('is-active');
            elements.toggleBest.classList.remove('is-active');
            recomputeGameScores();
            updateMetricToggleButtons();
            renderMetricsChart();
            setupInfiniteScroll();
        } catch (error) {
            console.error(error);
            destroyMetricsChart();
            if (elements.metricsChartCanvas) {
                elements.metricsChartCanvas.style.display = 'none';
            }
            setMetricsState('Impossible de calculer l\'evolution des scores pour ce jeu.', 'error');
            setSectionState(elements.leaderboardState, 'Impossible de charger les scores pour ce jeu.', 'error');
        }
    }

    function bindLeaderboardEvents() {
        elements.toggleAll.addEventListener('click', function () {
            state.currentViewMode = 'all';
            elements.toggleAll.classList.add('is-active');
            elements.toggleBest.classList.remove('is-active');
            recomputeGameScores();
        });

        elements.toggleBest.addEventListener('click', function () {
            state.currentViewMode = 'best';
            elements.toggleBest.classList.add('is-active');
            elements.toggleAll.classList.remove('is-active');
            recomputeGameScores();
        });

        if (elements.toggleMetricCollective) {
            elements.toggleMetricCollective.addEventListener('click', function () {
                toggleMetricVisibility('collective');
            });
        }

        if (elements.toggleMetricHighscore) {
            elements.toggleMetricHighscore.addEventListener('click', function () {
                toggleMetricVisibility('highscore');
            });
        }

        elements.tableBody.addEventListener('click', function (event) {
            const proofButton = event.target.closest('[data-proof-url]');
            if (proofButton) {
                openProofModal(proofButton.getAttribute('data-proof-url'));
                return;
            }

            const actionButton = event.target.closest('[data-admin-action]');
            if (!actionButton) {
                return;
            }

            const scoreId = actionButton.getAttribute('data-score-id');
            if (!scoreId) {
                return;
            }

            if (actionButton.getAttribute('data-admin-action') === 'delete') {
                handleAdminDelete(scoreId, actionButton);
                return;
            }

            if (actionButton.getAttribute('data-admin-action') === 'edit') {
                handleAdminEdit(scoreId);
            }
        });

        if (elements.medalsBody) {
            elements.medalsBody.addEventListener('click', function (event) {
                const playerButton = event.target.closest('[data-player-key]');
                if (!playerButton) {
                    return;
                }

                showPlayerScores(playerButton.getAttribute('data-player-key'));
            });
        }

        if (elements.latestScoresList) {
            elements.latestScoresList.addEventListener('click', function (event) {
                const playerButton = event.target.closest('[data-player-key]');
                if (!playerButton) {
                    return;
                }

                showPlayerScores(playerButton.getAttribute('data-player-key'));
            });
        }

        if (elements.playerScoresClose) {
            elements.playerScoresClose.addEventListener('click', hidePlayerScores);
        }

        if (elements.playerScoresScrollArea) {
            elements.playerScoresScrollArea.addEventListener('click', function (event) {
                const proofButton = event.target.closest('[data-proof-url]');
                if (!proofButton) {
                    return;
                }

                openProofModal(proofButton.getAttribute('data-proof-url'));
            });
        }

        if (elements.playerScoresCopyLink) {
            elements.playerScoresCopyLink.addEventListener('click', handleCopyPlayerLink);
        }

        if (elements.myScoresButton) {
            elements.myScoresButton.addEventListener('click', handleMyScoresClick);
        }

        if (elements.playerNameEditButton) {
            elements.playerNameEditButton.addEventListener('click', openPlayerNameEditor);
        }

        if (elements.playerNameEditCancel) {
            elements.playerNameEditCancel.addEventListener('click', function () {
                closePlayerNameEditor(true);
            });
        }

        if (elements.playerNameEditForm) {
            elements.playerNameEditForm.addEventListener('submit', handlePlayerNameEditSubmit);
        }

        if (elements.playerScoresPanel) {
            elements.playerScoresPanel.addEventListener('click', function (event) {
                if (event.target === elements.playerScoresPanel) {
                    hidePlayerScores();
                }
            });
        }
    }

    function bindModalEvents() {
        bindProofImageLoadingEvents();
        trapScrollWithin(elements.playerScoresScrollArea);

        elements.proofModalClose.addEventListener('click', closeProofModal);
        elements.proofModal.addEventListener('click', function (event) {
            if (event.target === elements.proofModal) {
                closeProofModal();
            }
        });

        elements.adminEditModalClose.addEventListener('click', closeAdminEditModal);
        elements.adminEditCancel.addEventListener('click', closeAdminEditModal);
        elements.adminEditModal.addEventListener('click', function (event) {
            if (event.target === elements.adminEditModal) {
                closeAdminEditModal();
            }
        });

        elements.adminEditForm.addEventListener('submit', submitAdminEditForm);

        elements.adminDeleteModalClose.addEventListener('click', closeAdminDeleteModal);
        elements.adminDeleteCancel.addEventListener('click', closeAdminDeleteModal);
        elements.adminDeleteModal.addEventListener('click', function (event) {
            if (event.target === elements.adminDeleteModal) {
                closeAdminDeleteModal();
            }
        });
        elements.adminDeleteConfirm.addEventListener('click', confirmAdminDelete);

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') {
                return;
            }

            if (elements.proofModal && elements.proofModal.style.display === 'flex') {
                closeProofModal();
                return;
            }

            if (elements.playerScoresPanel && elements.playerScoresPanel.style.display === 'flex') {
                hidePlayerScores();
            }
        });
    }

    function applyAdminState(isAdmin) {
        state.isAdmin = isAdmin === true;

        if (state.isAdmin) {
            document.body.setAttribute('data-is-admin', 'true');
            return;
        }

        document.body.removeAttribute('data-is-admin');
    }

    async function syncAdminStateFromUser(user) {
        state.currentUser = user || null;

        if (!user || !state.selectedPlayerKey || user.uid !== state.selectedPlayerKey) {
            state.currentUserScores = [];
            state.currentUserScoresLoadedFor = '';
        }

        syncMyScoresButton();
        syncPlayerNameEditingAvailability();
        syncAuthDisplay();

        if (!user || typeof user.getIdTokenResult !== 'function') {
            applyAdminState(false);

            if (state.selectedPlayerKey) {
                showPlayerScores(state.selectedPlayerKey);
            }

            return;
        }

        try {
            const token = await user.getIdTokenResult(true);
            const hasAdminClaim = Boolean(token && token.claims && token.claims.admin === true);

            if (hasAdminClaim) {
                applyAdminState(true);

                if (state.selectedPlayerKey) {
                    showPlayerScores(state.selectedPlayerKey);
                }

                return;
            }
        } catch (error) {
            console.warn('Impossible de verifier les claims admin:', error);
        }

        if (typeof window.checkFirebaseAdminAccess === 'function') {
            try {
                applyAdminState(await window.checkFirebaseAdminAccess());

                if (state.selectedPlayerKey) {
                    showPlayerScores(state.selectedPlayerKey);
                }

                return;
            } catch (error) {
                console.warn('Impossible de verifier l\'acces admin via backend:', error);
            }
        }

        applyAdminState(false);

        if (state.selectedPlayerKey) {
            showPlayerScores(state.selectedPlayerKey);
        }
    }

    function setupAdminHooks(attempt) {
        const nextAttempt = typeof attempt === 'number' ? attempt : 0;

        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            syncAdminStateFromUser(window.firebaseAuth.currentUser);
        }

        if (typeof window.onFirebaseAuthStateChanged === 'function') {
            window.onFirebaseAuthStateChanged(function (user) {
                syncAdminStateFromUser(user);
            });
            return;
        }

        if (nextAttempt >= 50) {
            console.warn('Firebase auth hook indisponible sur la page scores.');
            applyAdminState(false);
            return;
        }

        setTimeout(function () {
            setupAdminHooks(nextAttempt + 1);
        }, 100);
    }

    async function initialize() {
        updateDailyGameLink();
        setupThemeControls();
        setupOptionsDropdown();
        updateMetricToggleButtons();

        try {
            state.games = await window.BonjourArcadeScoresService.getGameList();
            state.gamesById = new Map(state.games.map(function (game) {
                return [game.id, game];
            }));
        } catch (error) {
            console.error(error);
            state.games = [];
            state.gamesById = new Map();
        }

        elements.searchInput.addEventListener('input', onSearchInput);
        bindLeaderboardEvents();
        bindModalEvents();

        if (elements.authButton) {
            elements.authButton.addEventListener('click', handleAuthAction);
        }

        if (elements.dropdownAuthButton) {
            elements.dropdownAuthButton.addEventListener('click', handleAuthAction);
        }

        syncAuthDisplay();

        setupAdminHooks();

        const requestedGameId = getQueryGameId();
        state.selectedPlayerKey = getQueryPlayerKey();

        if (requestedGameId) {
            await loadGameView(requestedGameId);
            return;
        }

        await loadCatalogView();
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
