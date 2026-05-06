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

window.onFirebaseAuthStateChanged((user) => {
    if (user) {
        authSection.style.display = 'none';
        adminSection.style.display = 'block';
        loadPendingScores();
    } else {
        authSection.style.display = 'block';
        adminSection.style.display = 'none';
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
    const screenshotHtml = imgSrc ? `<img src="${imgSrc}" alt="Screenshot" style="max-width:100%; border-radius:6px; margin-bottom:8px; border:1px solid #444;" onerror="if(this.src !== '${score.screenshotDataUrl || ''}') { this.src='${score.screenshotDataUrl || ''}'; }">` : '<p style="color:#666;">Aucun screenshot.</p>';
    const commentHtml = score.comment ? `<p><strong>Commentaire Original:</strong> ${score.comment}</p>` : '';
    const userDisplay = score.user ? score.user.displayName : score.userId;
    const gameDisplay = score.game ? score.game.title : score.gameId;

    div.innerHTML = `
        <div class="score-meta">
            User: ${userDisplay} (${score.userId}) | Game: ${gameDisplay} (${score.gameId}) | Date: ${dateStr}
        </div>
        ${screenshotHtml}
        ${commentHtml}
        <div style="margin-top: 10px;">
            Contenu modifiable avant validation:
            <input type="text" id="edit-game-${score.id}" value="${score.gameId}" placeholder="Game ID">
            <input type="number" id="edit-score-${score.id}" value="${score.score}" placeholder="Score">
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

window.approveScore = async (scoreId) => {
    const newGameId = document.getElementById(`edit-game-${scoreId}`).value;
    const newScore = parseInt(document.getElementById(`edit-score-${scoreId}`).value, 10);
    const newComment = document.getElementById(`edit-comment-${scoreId}`).value;
    const notifyWebhooks = document.getElementById(`notify-webhooks-${scoreId}`)?.checked ?? true;
    const statusDiv = document.getElementById(`status-${scoreId}`);

    const approveBtn = document.querySelector(`#score-${scoreId} .btn-approve`);
    approveBtn.disabled = true;

    try {
        statusDiv.textContent = "Validation en cours...";
        statusDiv.style.color = "yellow";

        await verifyScoreFn({
            scoreId: scoreId,
            notifyWebhooks: notifyWebhooks,
            override: {
                gameId: newGameId,
                score: newScore,
                comment: newComment || null
            }
        });

        statusDiv.textContent = "Score validé !";
        statusDiv.style.color = "#00C851";

        setTimeout(() => document.getElementById(`score-${scoreId}`).remove(), 1000);
    } catch (e) {
        console.error("Erreur de validation:", e);
        statusDiv.textContent = "Erreur: " + e.message;
        statusDiv.style.color = "red";
        approveBtn.disabled = false;
    }
};

window.rejectScore = async (scoreId) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce score ?")) {
        const rejectBtn = document.querySelector(`#score-${scoreId} .btn-reject`);
        const statusDiv = document.getElementById(`status-${scoreId}`);
        rejectBtn.disabled = true;

        try {
            statusDiv.textContent = "Suppression en cours...";
            statusDiv.style.color = "yellow";

            await deleteScoreFn({ scoreId: scoreId });

            statusDiv.textContent = "Score supprimé.";
            statusDiv.style.color = "#00C851";
            setTimeout(() => document.getElementById(`score-${scoreId}`).remove(), 1000);
        } catch (e) {
            console.error("Erreur de suppression:", e);
            statusDiv.textContent = "Erreur: " + e.message;
            statusDiv.style.color = "red";
            rejectBtn.disabled = false;
        }
    }
};
