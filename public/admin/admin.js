import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

// Ensure auth and functions are initialized from firebase-setup.js
const auth = window.firebaseAuth;
const functions = window.firebaseFunctions;

const getSubmissionQueueFn = httpsCallable(functions, 'getSubmissionQueue');
const verifyScoreFn = httpsCallable(functions, 'verifyScore');
const deleteScoreFn = httpsCallable(functions, 'deleteScore');

const authSection = document.getElementById('auth-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('admin-login-btn');
const logoutBtn = document.getElementById('admin-logout-btn');
const scoresContainer = document.getElementById('scores-container');
const imageModal = document.getElementById('image-modal');
const imageModalPreview = document.getElementById('image-modal-preview');

const tabScores = document.getElementById('tab-scores');
const tabPermissions = document.getElementById('tab-permissions');
const scoresView = document.getElementById('scores-view');
const permissionsView = document.getElementById('permissions-view');

const scoreDrafts = new Map();

function formatSpeedrunTime(ms) {
    const totalCentis = Math.max(0, Math.round(Number(ms || 0) / 10));
    const centis = totalCentis % 100;
    const totalSeconds = Math.floor(totalCentis / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

// Accepts "mm:ss", "mm:ss.c" or "mm:ss.cc" and returns milliseconds, or null if invalid.
function parseSpeedrunTimeInput(str) {
    const match = /^(\d+):([0-5]\d)(?:\.(\d{1,2}))?$/.exec(String(str || '').trim());
    if (!match) {
        return null;
    }
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centis = match[3] ? parseInt(match[3].padEnd(2, '0'), 10) : 0;
    return (minutes * 60 + seconds) * 1000 + centis * 10;
}

function switchTab(tab) {
    const isScores = tab === 'scores';
    tabScores.classList.toggle('active', isScores);
    tabPermissions.classList.toggle('active', !isScores);
    scoresView.style.display = isScores ? 'block' : 'none';
    permissionsView.style.display = isScores ? 'none' : 'block';
}

tabScores.addEventListener('click', () => switchTab('scores'));
tabPermissions.addEventListener('click', () => switchTab('permissions'));

window.onFirebaseAuthStateChanged(async (user) => {
    if (user) {
        authSection.style.display = 'none';
        adminSection.style.display = 'block';
        loadPendingScores();

        const isFullAdmin = typeof window.checkFirebaseAdminAccess === 'function'
            ? await window.checkFirebaseAdminAccess()
            : false;
        if (isFullAdmin) {
            tabPermissions.style.display = '';
        } else {
            tabPermissions.style.display = 'none';
        }
    } else {
        authSection.style.display = 'block';
        adminSection.style.display = 'none';
        tabPermissions.style.display = 'none';
    }
});

loginBtn.addEventListener('click', async () => {
    try {
        await window.signInWithGoogle();
    } catch (e) {
        alert("Erreur de connexion");
    }
});

logoutBtn.addEventListener('click', async () => {
    await window.signOutFirebase();
});

imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal || event.target === imageModalPreview) {
        closeImageModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && imageModal.classList.contains('is-open')) {
        closeImageModal();
    }
});

function getCreatedAtTimestamp(score) {
    if (!score || !score.createdAt) {
        return 0;
    }

    if (typeof score.createdAt._seconds === 'number') {
        return score.createdAt._seconds * 1000;
    }

    const timestamp = new Date(score.createdAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function loadPendingScores() {
    scoresContainer.innerHTML = "<p>Chargement des scores en attente...</p>";
    try {
        const result = await getSubmissionQueueFn({ status: 'pending', limit: 20 });
        const data = result.data;

        if (!data || !data.submissions || data.submissions.length === 0) {
            scoresContainer.innerHTML = "<p>Aucun score en attente de validation.</p>";
            return;
        }

        data.submissions.sort((a, b) => getCreatedAtTimestamp(a) - getCreatedAtTimestamp(b));

        scoresContainer.innerHTML = "";
        data.submissions.forEach((score) => {
            scoresContainer.appendChild(createScoreElement(score));
        });
    } catch (error) {
        console.error("Error loading scores:", error);
        scoresContainer.innerHTML = `<p style="color:red;">Erreur: ${error.message} (Êtes-vous sûr d'être Administrateur ?)</p>`;
    }
}

function createScoreElement(score) {
    const div = document.createElement('div');
    div.className = 'score-card';
    div.id = `score-${score.id}`;
    div.dataset.scoreType = score.scoreType || 'points';

    // Formatting the date. Cloud function returns createdAt as an object, but usually it's passed as ISO string or object with _seconds
    let dateStr = 'Inconnue';
    if (score.createdAt) {
        if (score.createdAt._seconds) {
            dateStr = new Date(score.createdAt._seconds * 1000).toLocaleString();
        } else {
            dateStr = new Date(score.createdAt).toLocaleString();
        }
    }

    const imgSrc = score.screenshotUrl || score.screenshotDataUrl;
    const fallbackSrc = score.screenshotDataUrl || '';
    const screenshotHtml = imgSrc
        ? `<button type="button" class="score-screenshot-button" onclick="openImageModal('${score.id}')" aria-label="Agrandir le screenshot du score ${score.id}">
                <img src="${imgSrc}" alt="Screenshot" data-full-image="${imgSrc}" data-fallback-image="${fallbackSrc}" onerror="if(this.src !== this.dataset.fallbackImage) { this.src = this.dataset.fallbackImage; this.dataset.fullImage = this.dataset.fallbackImage; }">
                <span class="score-screenshot-hint">Cliquer pour agrandir</span>
            </button>`
        : '<p style="color:#666;">Aucun screenshot.</p>';
    const commentHtml = score.comment ? `<p><strong>Commentaire Original:</strong> ${score.comment}</p>` : '';
    const userDisplay = score.user ? score.user.displayName : score.userId;
    const gameDisplay = score.game ? score.game.title : score.gameId;
    const isSpeedrun = score.scoreType === 'speedrun';
    const speedrunBadge = isSpeedrun ? ' | <strong style="color:#ffd700;">⏱ Speedrun</strong>' : '';
    const pointsScoreHtml = (isSpeedrun && typeof score.pointsScore === 'number')
        ? ` | Score associé: ${score.pointsScore.toLocaleString('fr-FR')}`
        : '';
    const scoreInputHtml = isSpeedrun
        ? `<input type="text" id="edit-score-${score.id}" value="${formatSpeedrunTime(score.score)}" placeholder="mm:ss.cc">`
        : `<input type="number" id="edit-score-${score.id}" value="${score.score}" placeholder="Score">`;

    div.innerHTML = `
        <div class="score-meta">
            User: ${userDisplay} (${score.userId}) | Game: ${gameDisplay} (${score.gameId}) | Date: ${dateStr}${speedrunBadge}${pointsScoreHtml}
        </div>
        ${screenshotHtml}
        ${commentHtml}
        <div style="margin-top: 10px;">
            Contenu modifiable avant validation:
            <input type="text" id="edit-game-${score.id}" value="${score.gameId}" placeholder="Game ID">
            ${scoreInputHtml}
            <textarea id="edit-comment-${score.id}" placeholder="Commentaire">${score.comment || ''}</textarea>
            <label style="display:flex; align-items:center; gap:8px; margin-top:6px; color:#ddd; font-size:13px; cursor:pointer;">
                <input type="checkbox" id="notify-webhooks-${score.id}" checked style="width:auto; margin:0;">
                Emettre une notification webhook lors de la validation
            </label>
        </div>
        <div class="admin-actions">
            <button class="btn-approve" onclick="approveScore('${score.id}')">Valider (Accepter)</button>
            <button class="btn-reject" onclick="rejectScore('${score.id}')">Rejeter (Supprimer)</button>
        </div>
        <div id="status-${score.id}" style="margin-top:10px; font-weight:bold;"></div>
    `;

    return div;
}

function closeImageModal() {
    imageModal.classList.remove('is-open');
    imageModalPreview.removeAttribute('src');
}

window.openImageModal = (scoreId) => {
    const image = document.querySelector(`#score-${scoreId} img[data-full-image]`);
    if (!image) {
        return;
    }

    imageModalPreview.src = image.dataset.fullImage || image.src;
    imageModal.classList.add('is-open');
};

function captureScoreDraft(scoreId) {
    const card = document.getElementById(`score-${scoreId}`);
    if (!card) {
        return null;
    }

    const parent = card.parentElement;
    if (!parent) {
        return null;
    }

    const scoreType = card.dataset.scoreType || 'points';
    const rawScoreValue = document.getElementById(`edit-score-${scoreId}`).value;

    return {
        scoreId,
        scoreType,
        gameId: document.getElementById(`edit-game-${scoreId}`).value,
        score: scoreType === 'speedrun' ? parseSpeedrunTimeInput(rawScoreValue) : parseInt(rawScoreValue, 10),
        comment: document.getElementById(`edit-comment-${scoreId}`).value,
        notifyWebhooks: document.getElementById(`notify-webhooks-${scoreId}`)?.checked ?? true,
        parent,
        nextSibling: card.nextSibling,
        card,
        statusMessage: '',
        statusColor: ''
    };
}

function removeScoreCard(scoreId) {
    const card = document.getElementById(`score-${scoreId}`);
    if (card) {
        card.remove();
    }
}

function restoreScoreCard(draft) {
    if (!draft || !draft.parent || !draft.card) {
        return;
    }

    draft.parent.insertBefore(draft.card, draft.nextSibling);
    document.getElementById(`edit-game-${draft.scoreId}`).value = draft.gameId;
    const scoreInput = document.getElementById(`edit-score-${draft.scoreId}`);
    if (draft.score === null || Number.isNaN(draft.score)) {
        scoreInput.value = '';
    } else {
        scoreInput.value = draft.scoreType === 'speedrun' ? formatSpeedrunTime(draft.score) : draft.score;
    }
    document.getElementById(`edit-comment-${draft.scoreId}`).value = draft.comment;
    const notifyCheckbox = document.getElementById(`notify-webhooks-${draft.scoreId}`);
    if (notifyCheckbox) {
        notifyCheckbox.checked = draft.notifyWebhooks;
    }

    const statusDiv = document.getElementById(`status-${draft.scoreId}`);
    if (statusDiv && draft.statusMessage) {
        statusDiv.textContent = draft.statusMessage;
        statusDiv.style.color = draft.statusColor;
    }

    const approveBtn = document.querySelector(`#score-${draft.scoreId} .btn-approve`);
    if (approveBtn) {
        approveBtn.disabled = false;
    }

    const rejectBtn = document.querySelector(`#score-${draft.scoreId} .btn-reject`);
    if (rejectBtn) {
        rejectBtn.disabled = false;
    }
}

window.approveScore = async (scoreId) => {
    const draft = captureScoreDraft(scoreId);
    if (!draft) {
        return;
    }

    if (draft.score === null || Number.isNaN(draft.score)) {
        alert(draft.scoreType === 'speedrun'
            ? 'Format de temps invalide (attendu: mm:ss ou mm:ss.cc).'
            : 'Score invalide.');
        return;
    }

    scoreDrafts.set(scoreId, draft);
    removeScoreCard(scoreId);

    try {
        await verifyScoreFn({
            scoreId: scoreId,
            notifyWebhooks: draft.notifyWebhooks,
            override: {
                gameId: draft.gameId,
                score: draft.score,
                comment: draft.comment || null
            }
        });
        // Players on /play or /scores may have the empty/pre-approval leaderboard
        // cached (5 min TTL) - clear it so the newly-approved score shows up right away.
        if (window.invalidateLeaderboardAll) window.invalidateLeaderboardAll();
        scoreDrafts.delete(scoreId);
    } catch (e) {
        console.error("Erreur de validation:", e);
        draft.statusMessage = "Erreur: " + e.message;
        draft.statusColor = "red";
        restoreScoreCard(draft);
        scoreDrafts.delete(scoreId);
    }
};

window.rejectScore = async (scoreId) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce score ?")) {
        const draft = captureScoreDraft(scoreId);
        if (!draft) {
            return;
        }

        scoreDrafts.set(scoreId, draft);
        removeScoreCard(scoreId);

        try {
            await deleteScoreFn({ scoreId: scoreId });
            if (window.invalidateLeaderboardAll) window.invalidateLeaderboardAll();
            scoreDrafts.delete(scoreId);
        } catch (e) {
            console.error("Erreur de suppression:", e);
            draft.statusMessage = "Erreur: " + e.message;
            draft.statusColor = "red";
            restoreScoreCard(draft);
            scoreDrafts.delete(scoreId);
        }
    }
};
