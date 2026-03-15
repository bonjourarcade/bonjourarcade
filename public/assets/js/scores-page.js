(function () {
    const PAGE_SIZE = 100;

    const state = {
        games: [],
        gamesById: new Map(),
        featuredIds: [],
        latestScores: [],
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
        metricVisibility: {
            collective: false,
            highscore: true
        }
    };

    const elements = {
        catalogView: document.getElementById('catalog-view'),
        gameView: document.getElementById('game-view'),
        searchInput: document.getElementById('game-search-input'),
        searchResults: document.getElementById('game-search-results'),
        featuredList: document.getElementById('featured-games-list'),
        featuredState: document.getElementById('featured-games-state'),
        latestScoresList: document.getElementById('latest-scores-list'),
        latestScoresState: document.getElementById('latest-scores-state'),
        leaderboardTitle: document.getElementById('leaderboard-title'),
        leaderboardSubtitle: document.getElementById('leaderboard-subtitle'),
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

    function getGameById(gameId) {
        return state.gamesById.get(gameId) || null;
    }

    function buildGameUrl(gameId) {
        return '/scores/' + encodeURIComponent(gameId);
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
            const key = score.userId || ('name:' + score.playerName);
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
                        position: 'top'
                    },
                    tooltip: {
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
                        ticks: {
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
                        ticks: {
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
                '<p class="latest-score-player">', escapeHtml(score.playerName), ' · ', formatScore(score.score), '</p>',
                '<p class="latest-score-date">', window.BonjourArcadeScoresService.formatDate(score.createdAtMs), '</p>',
                commentHtml,
                '</div>',
                '</article>'
            ].join('');
        }).join('');
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
            const playerCell = renderPlayerCell(score);

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

        try {
            const [featuredIds, latestScores] = await Promise.all([
                window.BonjourArcadeScoresService.getFeaturedGameIds(5),
                window.BonjourArcadeScoresService.getLatestScores()
            ]);

            state.featuredIds = featuredIds;
            state.latestScores = latestScores;

            renderFeaturedGames();
            renderLatestScores();
        } catch (error) {
            console.error(error);
            setSectionState(elements.featuredState, 'Erreur pendant le chargement des jeux vedettes.', 'error');
            setSectionState(elements.latestScoresState, 'Erreur pendant le chargement des derniers scores.', 'error');
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
    }

    function bindModalEvents() {
        bindProofImageLoadingEvents();

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
        if (!user || typeof user.getIdTokenResult !== 'function') {
            applyAdminState(false);
            return;
        }

        try {
            const token = await user.getIdTokenResult(true);
            const hasAdminClaim = Boolean(token && token.claims && token.claims.admin === true);

            if (hasAdminClaim) {
                applyAdminState(true);
                return;
            }
        } catch (error) {
            console.warn('Impossible de verifier les claims admin:', error);
        }

        if (typeof window.checkFirebaseAdminAccess === 'function') {
            try {
                applyAdminState(await window.checkFirebaseAdminAccess());
                return;
            } catch (error) {
                console.warn('Impossible de verifier l\'acces admin via backend:', error);
            }
        }

        applyAdminState(false);
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
        setupAdminHooks();

        const requestedGameId = getQueryGameId();

        if (requestedGameId) {
            await loadGameView(requestedGameId);
            return;
        }

        await loadCatalogView();
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
