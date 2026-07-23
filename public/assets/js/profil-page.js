(function () {
    const elements = {
        loading: document.getElementById('profil-loading'),
        error: document.getElementById('profil-error'),
        content: document.getElementById('profil-content'),
        avatarImg: document.getElementById('profil-avatar-img'),
        avatarFallback: document.getElementById('profil-avatar-fallback'),
        avatarActions: document.getElementById('profil-avatar-actions'),
        avatarUpload: document.getElementById('profil-avatar-upload'),
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
        dropdownAuthButton: document.getElementById('dropdown-auth-button'),
        optionsToggleButton: document.getElementById('options-toggle-btn'),
        optionsDropdown: document.getElementById('options-dropdown'),
    };

    let currentUser = null;
    let profile = null;
    let isOwnProfile = false;
    let profileUserId = null;

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

            scores.sort((a, b) => b.score - a.score);

            elements.scoresBody.innerHTML = scores.map(s => {
                const rankClass = s.rank <= 3 ? 'rank-' + s.rank : '';
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
                '</tr>';
            }).join('');
        } catch (err) {
            console.error('Error loading scores:', err);
            elements.scoresLoading.textContent = 'Erreur lors du chargement des scores.';
        }
    }

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
            elements.dropdownAuthButton.innerHTML = '<span>🔐</span>Deconnexion';
        } else {
            elements.authText.textContent = 'Non connecte';
            elements.authButton.textContent = 'Connexion';
            elements.dropdownAuthButton.innerHTML = '<span>🔐</span>Connexion';
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

    elements.dropdownAuthButton.addEventListener('click', async function () {
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

    // Avatar upload
    elements.avatarUpload.addEventListener('change', async function () {
        const file = elements.avatarUpload.files[0];
        if (!file) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            alert('Format non supporte. Utilise JPEG, PNG ou WebP.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Fichier trop volumineux. Maximum 2 Mo.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            elements.avatarImg.src = e.target.result;
            elements.avatarImg.style.display = 'block';
            elements.avatarFallback.style.display = 'none';
        };
        reader.readAsDataURL(file);

        if (!currentUser) {
            alert('Connecte-toi d\'abord.');
            return;
        }

        try {
            const ext = file.name.split('.').pop() || 'png';
            const timestamp = Date.now();
            const storagePath = `avatars/${currentUser.uid}/${timestamp}.${ext}`;
            const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
            const app = window.firebaseApp;
            const storage = getStorage(app);
            const storageRef = ref(storage, storagePath);

            const uploadLabel = document.querySelector('.profil-avatar-btn[for="profil-avatar-upload"]');
            if (uploadLabel) uploadLabel.style.opacity = '0.5';

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            const { doc, setDoc, serverTimestamp } = window.Firestore;
            const avatarData = {
                avatar: {
                    type: 'custom',
                    url: downloadUrl,
                    lastUpdated: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), avatarData, { merge: true });
            try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), avatarData, { merge: true }); } catch (e) { /* secondary collection */ }

            if (uploadLabel) uploadLabel.style.opacity = '1';

            if (profile) profile.photoURL = downloadUrl;
            if (currentUser) currentUser.photoURL = downloadUrl;

            console.log('Avatar uploaded successfully:', downloadUrl);
        } catch (err) {
            console.error('Avatar upload error:', err);
            alert('Erreur lors de l\'upload: ' + (err.message || err));
            const uploadLabel = document.querySelector('.profil-avatar-btn[for="profil-avatar-upload"]');
            if (uploadLabel) uploadLabel.style.opacity = '1';
        }
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
        } catch (e) {
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
        } catch (e) {
            console.error('Error saving avatar delete:', e);
        }
        if (profile) profile.photoURL = null;
    });

    // Options dropdown toggle (from scores page)
    if (elements.optionsToggleButton && elements.optionsDropdown) {
        document.addEventListener('click', function (e) {
            const isToggle = elements.optionsToggleButton.contains(e.target);
            const isDropdown = elements.optionsDropdown.contains(e.target);
            if (isToggle) {
                const isOpen = elements.optionsDropdown.style.display === 'block';
                elements.optionsDropdown.style.display = isOpen ? 'none' : 'block';
                elements.optionsToggleButton.setAttribute('aria-expanded', !isOpen);
            } else if (!isDropdown) {
                elements.optionsDropdown.style.display = 'none';
                elements.optionsToggleButton.setAttribute('aria-expanded', 'false');
            }
        });
    }

    })();