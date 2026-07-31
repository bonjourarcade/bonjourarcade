import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

const functions = window.firebaseFunctions;
const listUserPermissionsFn = httpsCallable(functions, 'listUserPermissions');
const setUserPermissionsFn = httpsCallable(functions, 'setUserPermissions');

const searchInput = document.getElementById('perm-search');
const resultsContainer = document.getElementById('perm-results');
const statusDiv = document.getElementById('perm-status');

let searchTimeout = null;

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function setStatus(message, color) {
    statusDiv.style.color = color || '';
    statusDiv.textContent = message;
}

async function searchUsers() {
    const query = searchInput.value.trim();
    resultsContainer.innerHTML = '<p>Chargement...</p>';
    setStatus('');

    try {
        const result = await listUserPermissionsFn({ query, limit: 50 });
        const users = result.data.users || [];

        if (users.length === 0) {
            resultsContainer.innerHTML = '<p>Aucun utilisateur trouvé.</p>';
            return;
        }

        resultsContainer.innerHTML = '';
        users.forEach(user => resultsContainer.appendChild(createUserRow(user)));
    } catch (e) {
        console.error('Error searching users:', e);
        resultsContainer.innerHTML = `<p style="color:red;">Erreur: ${escapeHtml(e.message)}</p>`;
    }
}

function createUserRow(user) {
    const row = document.createElement('div');
    row.className = 'perm-row';
    row.dataset.uid = user.uid;

    const name = user.displayName || 'Anonyme';
    const avatar = user.photoURL
        ? `<img src="${escapeHtml(user.photoURL)}" alt="" class="perm-avatar">`
        : `<div class="perm-avatar perm-avatar-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;
    const adminBadge = user.admin ? '<span class="perm-badge">Full admin</span>' : '';

    row.innerHTML = `
        <div class="perm-user">
            ${avatar}
            <div class="perm-user-info">
                <div class="perm-user-name">${escapeHtml(name)} ${adminBadge}</div>
                <div class="perm-user-email">${escapeHtml(user.email || user.uid)}</div>
            </div>
        </div>
        <div class="perm-toggles">
            <label class="perm-toggle">
                <input type="checkbox" data-claim="scoreModerator" ${user.scoreModerator ? 'checked' : ''} ${user.admin ? 'disabled' : ''}>
                <span>Modération des scores</span>
            </label>
            <label class="perm-toggle">
                <input type="checkbox" data-claim="tournamentHost" ${user.tournamentHost ? 'checked' : ''} ${user.admin ? 'disabled' : ''}>
                <span>Host de tournois</span>
            </label>
        </div>
        <button class="perm-save" ${user.admin ? 'disabled' : ''}>Sauvegarder</button>
    `;

    if (!user.admin) {
        row.querySelector('.perm-save').addEventListener('click', async () => {
            await savePermissions(row, user.uid);
        });
    }

    return row;
}

async function savePermissions(row, uid) {
    const scoreModerator = row.querySelector('[data-claim="scoreModerator"]').checked;
    const tournamentHost = row.querySelector('[data-claim="tournamentHost"]').checked;
    const saveBtn = row.querySelector('.perm-save');
    saveBtn.disabled = true;
    setStatus('Sauvegarde...');

    try {
        await setUserPermissionsFn({ uid, scoreModerator, tournamentHost });
        setStatus('Permissions mises à jour.', '#00C851');
    } catch (e) {
        console.error('Error saving permissions:', e);
        setStatus('Erreur: ' + e.message, '#ff4444');
    } finally {
        saveBtn.disabled = false;
    }
}

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchUsers, 350);
});
