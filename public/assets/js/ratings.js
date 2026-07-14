let allRatings = [];
let allGames = [];
let gamesMap = {};

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-dark')) {
        body.classList.remove('theme-dark');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('theme-dark');
        localStorage.setItem('theme', 'dark');
    }
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const seconds = timestamp._seconds || 0;
    if (!seconds) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - seconds;
    if (diff < 60) return 'maintenant';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}j`;
    return `${Math.floor(diff / 2592000)}mois`;
}

function getGameTitle(gameId) {
    const game = gamesMap[gameId];
    if (game) {
        return game.title || capitalizeFirst(gameId);
    }
    return capitalizeFirst(gameId);
}

function getGameCover(gameId) {
    const game = gamesMap[gameId];
    if (game && game.coverArt) {
        return game.coverArt;
    }
    return '/assets/images/placeholder_thumb.png';
}

function getGameUrl(gameId) {
    const game = gamesMap[gameId];
    if (game && game.pageUrl) {
        return game.pageUrl;
    }
    return `/b/${gameId}`;
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderRatingValue(rating) {
    if (rating === 2) return '👍👍';
    if (rating === 1) return '👍';
    if (rating === -1) return '👎';
    if (rating === -2) return '👎👎';
    return rating;
}

function renderDistribution(distribution, count) {
    if (!distribution || count === 0) return '<div class="ratings-dist-bar"></div>';
    const segments = [
        { key: '-2', cls: 'neg2' },
        { key: '-1', cls: 'neg1' },
        { key: '1', cls: 'pos1' },
        { key: '2', cls: 'pos2' },
    ];
    const html = segments.map(seg => {
        const pct = (distribution[seg.key] || 0) / count * 100;
        return `<div class="ratings-dist-seg ${seg.cls}" style="flex:${pct || 0.5}"></div>`;
    }).join('');
    return `<div class="ratings-dist-bar">${html}</div>`;
}

function renderRatingsGrid(ratings) {
    const container = document.getElementById('ratings-list');

    if (ratings.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun jeu n\'a encore reçu de note.</div>';
        return;
    }

    container.innerHTML = ratings.map((r, i) => {
        const title = getGameTitle(r.gameId);
        const cover = getGameCover(r.gameId);
        const url = getGameUrl(r.gameId);
        const dist = r.distribution || {};
        const sum = (dist['2'] || 0) * 2 + (dist['1'] || 0) * 1 + (dist['-1'] || 0) * -1 + (dist['-2'] || 0) * -2;
        const distHtml = renderDistribution(r.distribution, r.count);

        return `
            <a href="${url}" class="ratings-row">
                <div class="ratings-rank">${i + 1}</div>
                <img class="ratings-cover" src="${cover}" alt="${title}" loading="lazy">
                <div class="ratings-info">
                    <div class="ratings-title">${title}</div>
                    <div class="ratings-meta">${r.count} note${r.count > 1 ? 's' : ''}</div>
                </div>
                <div class="ratings-distribution">${distHtml}</div>
                <div class="ratings-score">
                    <span class="ratings-average">${sum > 0 ? '+' : ''}${sum}</span>
                    <span class="ratings-count"></span>
                </div>
            </a>
        `;
    }).join('');
}

function renderLatestRatings(ratings) {
    const container = document.getElementById('latest-ratings-list');

    if (!ratings || ratings.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun rating récent.</div>';
        return;
    }

    container.innerHTML = ratings.map(r => {
        const title = getGameTitle(r.gameId);
        const cover = getGameCover(r.gameId);
        const url = getGameUrl(r.gameId);
        const timeAgo = formatTimeAgo(r.createdAt);
        const isPositive = r.rating > 0;
        const ratingDisplay = renderRatingValue(r.rating);

        const avatarHtml = r.userPhotoURL
            ? `<img class="latest-rating-avatar" src="${r.userPhotoURL}" alt="${r.userName}">`
            : `<div class="latest-rating-avatar-placeholder">${r.userName.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="latest-rating-row">
                ${avatarHtml}
                <div class="latest-rating-info">
                    <div class="latest-rating-user">${r.userName}</div>
                    <div class="latest-rating-game">a noté <a href="${url}">${title}</a></div>
                </div>
                <div class="latest-rating-value ${isPositive ? 'pos' : 'neg'}">${ratingDisplay}</div>
                <div class="latest-rating-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

async function loadData() {
    const ratingsState = document.getElementById('ratings-state');
    const latestState = document.getElementById('latest-state');
    const filterCount = document.getElementById('filter-count');

    try {
        const gamesResp = await fetch('/gamelist.json?cacheBuster=' + Date.now());
        const data = await gamesResp.json();
        allGames = data.games || [];
        gamesMap = {};
        allGames.forEach(game => {
            gamesMap[game.id] = game;
        });

        const [ratingsResult, latestResult] = await Promise.all([
            window.listGameRatings(),
            window.getLatestRatings()
        ]);

        if (ratingsResult && ratingsResult.success) {
            allRatings = ratingsResult.ratings;
            filterCount.textContent = `${allRatings.length} jeu${allRatings.length > 1 ? 'x' : ''} noté${allRatings.length > 1 ? 's' : ''}`;
            ratingsState.style.display = 'none';
            renderRatingsGrid(allRatings);
        } else {
            ratingsState.textContent = 'Erreur lors du chargement des ratings.';
            ratingsState.className = 'section-state';
        }

        if (latestResult && latestResult.success) {
            latestState.style.display = 'none';
            renderLatestRatings(latestResult.ratings);
        } else {
            latestState.textContent = 'Erreur lors du chargement des derniers ratings.';
            latestState.className = 'section-state';
        }
    } catch (error) {
        console.error('Error loading ratings data:', error);
        ratingsState.textContent = 'Erreur de chargement. Vérifie ta connexion.';
        ratingsState.className = 'section-state';
        latestState.textContent = 'Erreur de chargement.';
        latestState.className = 'section-state';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    document.getElementById('search-input')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const container = document.getElementById('ratings-list');
        const filterCount = document.getElementById('filter-count');

        if (!term) {
            filterCount.textContent = `${allRatings.length} jeu${allRatings.length > 1 ? 'x' : ''} noté${allRatings.length > 1 ? 's' : ''}`;
            renderRatingsGrid(allRatings);
            return;
        }

        const filtered = allRatings.filter(r => {
            const title = getGameTitle(r.gameId).toLowerCase();
            return title.includes(term);
        });

        filterCount.textContent = `${filtered.length} jeu${filtered.length > 1 ? 'x' : ''} trouvé${filtered.length > 1 ? 's' : ''}`;
        renderRatingsGrid(filtered);
    });

    const backBtn = document.getElementById('back-home-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    loadData();
});
