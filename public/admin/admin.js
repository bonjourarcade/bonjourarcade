import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

// Ensure auth and functions are initialized from firebase-setup.js
const auth = window.firebaseAuth;
const functions = window.firebaseFunctions;

const getSubmissionQueueFn = httpsCallable(functions, 'getSubmissionQueue');
const verifyScoreFn = httpsCallable(functions, 'verifyScore');
const deleteScoreFn = httpsCallable(functions, 'deleteScore');

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1479674018251669771/B4c7AxxypBFFETNUvYBaaX5I0oa6w4w79Sgd_-fKHa1fH5DDtoQXqrqWat_SFffAEmMk";
const GOOGLE_CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQAC7yXV9M/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=0SlrHWs8JWXHncfF0W7pXY-xeq6wjvvxlnx_79kqnsU";

// Store submissions to access user and game info during validation
let submissionsMap = {};

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

async function loadPendingScores() {
    scoresContainer.innerHTML = "<p>Chargement des scores en attente...</p>";
    try {
        const result = await getSubmissionQueueFn({ status: 'pending', limit: 20 });
        const data = result.data;

        if (!data || !data.submissions || data.submissions.length === 0) {
            scoresContainer.innerHTML = "<p>Aucun score en attente de validation.</p>";
            return;
        }

        scoresContainer.innerHTML = "";
        submissionsMap = {}; // Reset map
        data.submissions.forEach((score) => {
            submissionsMap[score.id] = score;
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
        </div>
        <div class="admin-actions">
            <button class="btn-approve" onclick="approveScore('${score.id}')">Valider (Accepter)</button>
            <button class="btn-reject" onclick="rejectScore('${score.id}')">Rejeter (Supprimer)</button>
        </div>
        <div id="status-${score.id}" style="margin-top:10px; font-weight:bold;"></div>
    `;

    return div;
}

function formatScore(score) {
    return new Intl.NumberFormat('en-US').format(score);
}

async function sendDiscordNotification(user, score, gameTitle, gameId, comment) {
    const formattedScore = formatScore(score);
    const gameLink = `[${gameTitle}](https://bonjourarcade.com/b/${gameId})`;
    let content = `**${user}** a fait **${formattedScore}** sur **${gameLink}**.`;
    if (comment) {
        // include the comment (blockquote style)
        content += `\n> ${comment}`;
    }
    const payload = {
        content
    };

    try {
        const request = new XMLHttpRequest();
        request.open("POST", DISCORD_WEBHOOK_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(JSON.stringify(payload));
    } catch (error) {
        console.error("Error sending Discord notification (XHR):", error);
    }
}

async function sendGoogleChatNotification(user, score, gameTitle, gameId, comment) {
    const formattedScore = formatScore(score);
    const gameLink = `<https://bonjourarcade.com/b/${gameId}|${gameTitle}>`;
    let text = `📢 Nouveau score validé ! *${user}* a fait *${formattedScore}* sur *${gameLink}*.`;
    if (comment) {
        text += `\n> _${comment}_`;
    }
    const payload = {
        text
    };

    try {
        const request = new XMLHttpRequest();
        request.open("POST", GOOGLE_CHAT_WEBHOOK_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(JSON.stringify(payload));
    } catch (error) {
        console.error("Error sending Google Chat notification (XHR):", error);
    }
}

window.approveScore = async (scoreId) => {
    const newGameId = document.getElementById(`edit-game-${scoreId}`).value;
    const newScore = parseInt(document.getElementById(`edit-score-${scoreId}`).value, 10);
    const newComment = document.getElementById(`edit-comment-${scoreId}`).value;
    const statusDiv = document.getElementById(`status-${scoreId}`);

    const approveBtn = document.querySelector(`#score-${scoreId} .btn-approve`);
    approveBtn.disabled = true;

    try {
        statusDiv.textContent = "Validation en cours...";
        statusDiv.style.color = "yellow";

        await verifyScoreFn({
            scoreId: scoreId,
            override: {
                gameId: newGameId,
                score: newScore,
                comment: newComment || null
            }
        });

        statusDiv.textContent = "Score validé !";
        statusDiv.style.color = "#00C851";

        // Send Discord notification
        const originalSubmission = submissionsMap[scoreId];
        if (originalSubmission) {
            const userDisplay = originalSubmission.user ? originalSubmission.user.displayName : originalSubmission.userId;
            const gameDisplay = originalSubmission.game ? originalSubmission.game.title : newGameId;
            // send the comment that was submitted/updated
            sendDiscordNotification(userDisplay, newScore, gameDisplay, newGameId, newComment);
            sendGoogleChatNotification(userDisplay, newScore, gameDisplay, newGameId, newComment);
        }

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
