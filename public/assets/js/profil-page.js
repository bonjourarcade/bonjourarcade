(function () {
    const elements = {
        loading: document.getElementById('profil-loading'),
        error: document.getElementById('profil-error'),
        content: document.getElementById('profil-content'),
        avatarImg: document.getElementById('profil-avatar-img'),
        avatarFallback: document.getElementById('profil-avatar-fallback'),
        avatarActions: document.getElementById('profil-avatar-actions'),
        avatarUrlInput: document.getElementById('profil-avatar-url'),
        avatarSetUrl: document.getElementById('profil-avatar-set-url'),
        avatarReset: document.getElementById('profil-avatar-reset'),
        avatarDelete: document.getElementById('profil-avatar-delete'),
        displayName: document.getElementById('profil-display-name'),
        memberSince: document.getElementById('profil-member-since'),
        editName: document.getElementById('profil-edit-name'),
        nameForm: document.getElementById('profil-name-form'),
        nameInput: document.getElementById('profil-name-input'),
        nameSave: document.getElementById('profil-name-save'),
        nameCancel: document.getElementById('profil-name-cancel'),
        nameStatus: document.getElementById('profil-name-status'),
        editToggle: document.getElementById('profil-edit-toggle'),
        logout: document.getElementById('profil-logout'),
        scoresLoading: document.getElementById('profil-scores-loading'),
        scoresEmpty: document.getElementById('profil-scores-empty'),
        scoresTable: document.getElementById('profil-scores-table'),
        scoresBody: document.getElementById('profil-scores-body'),
        authStatus: document.getElementById('profil-auth-status'),
        authText: document.getElementById('profil-auth-text'),
        authButton: document.getElementById('profil-auth-button'),
        proofModal: document.getElementById('proof-modal'),
        proofModalImage: document.getElementById('proof-modal-image'),
        proofModalLoader: document.getElementById('proof-modal-loader'),
        proofModalLoaderText: document.querySelector('#proof-modal-loader .proof-modal-loader-text'),
        proofModalClose: document.getElementById('proof-modal-close'),
    };

    let currentUser = null;
    let profile = null;
    let isOwnProfile = false;
    let profileUserId = null;

    // Simple toast helper
    function showToast(message, type) {
        let stack = document.querySelector('.profil-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'profil-toast-stack';
            document.body.appendChild(stack);
        }
        const item = document.createElement('div');
        item.className = 'profil-toast-item is-' + (type || 'info');
        item.textContent = message;
        stack.appendChild(item);
        setTimeout(function () { item.remove(); }, 3000);
    }

    function getUserIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('uid')) return params.get('uid');
        const path = window.location.pathname.replace(/\/$/, '');
        const parts = path.split('/profil/');
        return parts.length > 1 && parts[1] ? parts[1] : null;
    }

    function formatDate(isoString) {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return isoString;
        }
    }

    function formatScore(n) {
        return Number(n).toLocaleString('en-US');
    }

    function showError(msg) {
        elements.loading.style.display = 'none';
        elements.error.textContent = msg;
        elements.error.style.display = 'block';
        elements.content.style.display = 'none';
    }

    async function loadProfile(userId) {
        elements.loading.style.display = 'block';
        elements.error.style.display = 'none';
        elements.content.style.display = 'none';

        try {
            profile = await window.getPublicProfile(userId);
            isOwnProfile = currentUser && currentUser.uid === profile.uid;

            elements.displayName.textContent = profile.displayName || 'Joueur anonyme';
            elements.memberSince.textContent = 'Membre depuis le ' + formatDate(profile.creationTime);

            if (profile.photoURL) {
                elements.avatarImg.src = profile.photoURL;
                elements.avatarImg.style.display = 'block';
                elements.avatarFallback.style.display = 'none';
            } else {
                elements.avatarImg.style.display = 'none';
                elements.avatarFallback.style.display = 'block';
            }

            if (isOwnProfile) {
                elements.avatarActions.style.display = 'flex';
                elements.editToggle.style.display = 'inline-block';
                elements.logout.style.display = 'inline-block';
            } else {
                elements.avatarActions.style.display = 'none';
                elements.editToggle.style.display = 'none';
                elements.logout.style.display = 'none';
            }

            elements.loading.style.display = 'none';
            elements.content.style.display = 'block';

            loadScores(userId);
        } catch (err) {
            console.error('Error loading profile:', err);
            if (err.message && err.message.includes('not found')) {
                showError('Ce joueur n\'existe pas.');
            } else {
                showError('Erreur lors du chargement du profil.');
            }
        }
    }

    function getScoreScreenshotUrl(s) {
        return s.screenshotUrl || s.imageUrl || s.screenshotDataUrl || null;
    }

    async function loadScores(userId) {
        elements.scoresLoading.style.display = 'block';
        elements.scoresEmpty.style.display = 'none';
        elements.scoresTable.style.display = 'none';

        try {
            const scores = await window.getUserScores(userId);

            elements.scoresLoading.style.display = 'none';

            if (!scores || scores.length === 0) {
                elements.scoresEmpty.style.display = 'block';
                return;
            }

            elements.scoresTable.style.display = 'table';

            scores.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            elements.scoresBody.innerHTML = scores.map(s => {
                const rankClass = s.rank <= 3 ? 'rank-' + s.rank : '';
                const proofUrl = getScoreScreenshotUrl(s);
                const proofBtn = proofUrl
                    ? '<button class="proof-btn" type="button" data-proof-url="' + escHtml(proofUrl) + '">Voir</button>'
                    : '';
                return '<tr>' +
                    '<td class="profil-score-rank ' + rankClass + '">#' + s.rank + '</td>' +
                    '<td>' +
                        '<div class="profil-score-game">' +
                            (s.gameImageUrl ? '<img class="profil-score-thumb" src="' + s.gameImageUrl + '" alt="" loading="lazy">' : '') +
                            '<span class="profil-score-title">' + escHtml(s.gameTitle) + '</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="profil-score-value">' + formatScore(s.score) + '</td>' +
                    '<td class="profil-score-date">' + formatDate(s.createdAt) + '</td>' +
                    '<td class="profil-score-proof">' + proofBtn + '</td>' +
                '</tr>';
            }).join('');
        } catch (err) {
            console.error('Error loading scores:', err);
            elements.scoresLoading.textContent = 'Erreur lors du chargement des scores.';
        }
    }

    function openProofModal(url) {
        if (!url) return;
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

    elements.scoresBody.addEventListener('click', function (event) {
        var proofButton = event.target.closest('[data-proof-url]');
        if (proofButton) {
            openProofModal(proofButton.getAttribute('data-proof-url'));
            return;
        }
    });

    if (elements.proofModalClose) {
        elements.proofModalClose.addEventListener('click', closeProofModal);
    }
    elements.proofModal.addEventListener('click', function (event) {
        if (event.target === elements.proofModal) {
            closeProofModal();
        }
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && elements.proofModal.style.display === 'flex') {
            closeProofModal();
        }
    });
    elements.proofModalImage.addEventListener('load', function () {
        elements.proofModal.classList.remove('is-loading', 'is-error');
    });
    elements.proofModalImage.addEventListener('error', function () {
        elements.proofModal.classList.remove('is-loading');
        elements.proofModal.classList.add('is-error');
    });

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateAuthUI(user) {
        currentUser = user;
        if (user) {
            elements.authText.textContent = user.displayName || 'Connecte';
            elements.authButton.textContent = 'Deconnexion';
        } else {
            elements.authText.textContent = 'Non connecte';
            elements.authButton.textContent = 'Connexion';
        }

        const userId = getUserIdFromUrl();
        if (userId) {
            if (profile && profile.uid !== userId) {
                loadProfile(userId);
            } else if (!profile) {
                loadProfile(userId);
            }
        } else if (user) {
            loadProfile(user.uid);
        } else {
            elements.loading.style.display = 'none';
            showError('Connecte-toi pour voir ton profil, ou visite le profil d\'un joueur depuis les scores.');
        }
    }

    function setupAuth(retries) {
        if (typeof window.onFirebaseAuthStateChanged === 'function') {
            window.onFirebaseAuthStateChanged(function (user) {
                updateAuthUI(user);
            });
        } else if (retries < 50) {
            setTimeout(function () { setupAuth(retries + 1); }, 100);
        } else {
            console.warn('Firebase auth hook unavailable on profil page.');
        }
    }
    setupAuth(0);

    elements.authButton.addEventListener('click', async function () {
        if (currentUser) {
            await window.signOutFirebase();
        } else {
            try {
                await window.signInWithGoogle();
            } catch (e) {
                console.error('Login error:', e);
            }
        }
    });

    // Edit toggle
    elements.editToggle.addEventListener('click', function () {
        elements.editName.style.display = 'block';
        elements.nameInput.value = (profile && profile.displayName) || '';
        elements.nameInput.focus();
        elements.editToggle.style.display = 'none';
        elements.nameStatus.textContent = '';
    });

    elements.nameCancel.addEventListener('click', function () {
        elements.editName.style.display = 'none';
        elements.editToggle.style.display = 'inline-block';
        elements.nameStatus.textContent = '';
    });

    elements.nameForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const newName = elements.nameInput.value.trim();
        if (!newName) return;

        elements.nameSave.disabled = true;
        elements.nameSave.textContent = '...';
        elements.nameStatus.className = 'profil-name-status';

        try {
            await window.updateFirebaseDisplayName(newName);
            elements.nameStatus.textContent = 'Nom mis a jour !';
            elements.nameStatus.className = 'profil-name-status success';
            if (profile) profile.displayName = newName;
            elements.displayName.textContent = newName;
            setTimeout(function () {
                elements.editName.style.display = 'none';
                elements.editToggle.style.display = 'inline-block';
            }, 1200);
        } catch (err) {
            elements.nameStatus.textContent = 'Erreur : ' + (err.message || 'echec de la mise a jour');
            elements.nameStatus.className = 'profil-name-status error';
        } finally {
            elements.nameSave.disabled = false;
            elements.nameSave.textContent = 'Enregistrer';
        }
    });

    // Logout
    elements.logout.addEventListener('click', async function () {
        await window.signOutFirebase();
        window.location.href = '/';
    });

    // Avatar URL
    elements.avatarSetUrl.addEventListener('click', async function () {
        const url = elements.avatarUrlInput.value.trim();
        if (!url) return;
        if (!currentUser) { alert('Connecte-toi d\'abord.'); return; }

        elements.avatarImg.src = url;
        elements.avatarImg.style.display = 'block';
        elements.avatarFallback.style.display = 'none';

        try {
            const { doc, setDoc, serverTimestamp } = window.Firestore;
            const avatarData = {
                avatar: {
                    type: 'custom',
                    url: url,
                    lastUpdated: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), avatarData, { merge: true });
            try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), avatarData, { merge: true }); } catch (e) { /* secondary collection */ }
            if (profile) profile.photoURL = url;
            elements.avatarUrlInput.value = '';
            showToast('Avatar mis à jour avec succès !', 'success');
            console.log('Avatar URL saved:', url);
        } catch (err) {
            showToast('Erreur: ' + (err.message || err), 'error');
            console.error('Error saving avatar URL:', err);
        }
    });

    elements.avatarUrlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') elements.avatarSetUrl.click();
    });

    elements.avatarReset.addEventListener('click', async function () {
        if (!currentUser) return;
        const ssoUrl = currentUser.photoURL;
        if (ssoUrl) {
            elements.avatarImg.src = ssoUrl;
            elements.avatarImg.style.display = 'block';
            elements.avatarFallback.style.display = 'none';
        }
        try {
            const { doc, setDoc, serverTimestamp } = window.Firestore;
            const resetAvatarData = {
                avatar: {
                    type: 'sso',
                    url: ssoUrl || '',
                    lastUpdated: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), resetAvatarData, { merge: true });
            try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), resetAvatarData, { merge: true }); } catch (e) { /* secondary collection */ }
            showToast('Avatar réinitialisé avec succès !', 'success');
        } catch (e) {
            showToast('Erreur lors de la réinitialisation', 'error');
            console.error('Error saving avatar reset:', e);
        }
        if (profile) profile.photoURL = ssoUrl;
    });

    elements.avatarDelete.addEventListener('click', async function () {
        elements.avatarImg.style.display = 'none';
        elements.avatarFallback.style.display = 'block';
        if (!currentUser) return;
        try {
            const { doc, setDoc, serverTimestamp } = window.Firestore;
            const deleteAvatarData = {
                avatar: {
                    type: 'default',
                    url: '',
                    lastUpdated: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), deleteAvatarData, { merge: true });
            try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), deleteAvatarData, { merge: true }); } catch (e) { /* secondary collection */ }
            showToast('Avatar supprimé avec succès !', 'success');
        } catch (e) {
            showToast('Erreur lors de la suppression', 'error');
            console.error('Error saving avatar delete:', e);
        }
        if (profile) profile.photoURL = null;
    });

    window.__dropdownHandleAuthToggle = async function () {
        if (currentUser) {
            await window.signOutFirebase();
        } else {
            try {
                await window.signInWithGoogle();
            } catch (e) {
                console.error('Login error:', e);
            }
        }
    };

    window.__dropdownOnAuth = function (user) {
        updateAuthUI(user);
    };

    })();