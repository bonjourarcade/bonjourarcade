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
        cover: document.querySelector('.profil-cover'),
        bannerPicker: document.getElementById('profil-banner-picker'),
        bannerReset: document.getElementById('profil-banner-reset'),
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
        statGames: document.getElementById('profil-stat-games'),
        statScores: document.getElementById('profil-stat-scores'),
        statTop: document.getElementById('profil-stat-top'),
        authStatus: document.getElementById('profil-auth-status'),
        authText: document.getElementById('profil-auth-text'),
        authButton: document.getElementById('profil-auth-button'),
        proofModal: document.getElementById('proof-modal'),
        proofModalImage: document.getElementById('proof-modal-image'),
        proofModalLoader: document.getElementById('proof-modal-loader'),
        proofModalLoaderText: document.querySelector('#proof-modal-loader .proof-modal-loader-text'),
        proofModalClose: document.getElementById('proof-modal-close'),
        editFooter: document.getElementById('profil-edit-footer'),
    };

    let currentUser = null;
    let profile = null;
    let isOwnProfile = false;
    let profileUserId = null;
    let pending = { avatar: null, banner: null };
    let originals = { avatarUrl: null, bannerColor: null };

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

    function darkenHex(hex, amount) {
      var c = parseInt(hex.replace('#', ''), 16);
      var r = Math.max(0, (c >> 16) - amount);
      var g = Math.max(0, ((c >> 8) & 0xff) - amount);
      var b = Math.max(0, (c & 0xff) - amount);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function applyBannerColor(hex) {
      if (!elements.cover) return;
      if (!hex) {
        elements.cover.style.background = '';
        return;
      }
      var darkened = darkenHex(hex, 35);
      elements.cover.style.background = 'linear-gradient(135deg, ' + hex + ', ' + darkened + ')';
    }

    function setupBannerPicker() {
      if (!elements.bannerPicker || !elements.bannerReset) return;

      elements.bannerPicker.addEventListener('input', function () {
        applyBannerColor(elements.bannerPicker.value);
      });

      elements.bannerPicker.addEventListener('change', function () {
        pending.banner = elements.bannerPicker.value;
      });

      elements.bannerReset.addEventListener('click', function () {
        elements.bannerPicker.value = '#0b7a63';
        applyBannerColor(null);
        pending.banner = '';
      });
    }

    async function loadBannerColor(userId) {
      try {
        var db = window.firebaseDb;
        var docRef = window.Firestore.doc(db, 'users-preferences', userId);
        var docSnap = await window.Firestore.getDoc(docRef);
        if (docSnap.exists()) {
          var data = docSnap.data();
          if (data.banner && data.banner.color) {
            if (elements.bannerPicker) elements.bannerPicker.value = data.banner.color;
            applyBannerColor(data.banner.color);
            return data.banner.color;
          }
        }
      } catch (e) {
        console.warn('Error loading banner color:', e);
      }
      applyBannerColor(null);
      return null;
    }

    async function saveBannerColor(color) {
      if (!currentUser) return;
      var { doc, setDoc, serverTimestamp } = window.Firestore;
      var bannerData = {
        banner: {
          color: color || '',
          lastUpdated: new Date().toISOString(),
        },
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), bannerData, { merge: true });
      try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), bannerData, { merge: true }); } catch (e) { }
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
                elements.avatarActions.style.display = 'none';
                elements.editToggle.style.display = 'inline-block';
                elements.logout.style.display = 'inline-block';
            } else {
                elements.avatarActions.style.display = 'none';
                elements.editToggle.style.display = 'none';
                elements.logout.style.display = 'none';
            }

            elements.loading.style.display = 'none';
            elements.content.style.display = 'block';

            loadBannerColor(userId).then(function () {
              if (isOwnProfile) setupBannerPicker();
            });
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

    let scoresData = [];
    let sortState = { column: 'date', direction: 'desc' };

    elements.scoresTable.addEventListener('click', function (e) {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const col = th.dataset.sort;
        if (sortState.column === col) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = col;
            sortState.direction = col === 'date' ? 'desc' : 'asc';
        }
        renderScoresBody();
    });

    function renderScoresBody() {
        const sorted = [...scoresData].sort((a, b) => {
            let cmp = 0;
            switch (sortState.column) {
                case 'rank':
                    cmp = a.rank - b.rank;
                    break;
                case 'game':
                    cmp = (a.gameTitle || '').localeCompare(b.gameTitle || '');
                    break;
                case 'score':
                    cmp = a.score - b.score;
                    break;
                case 'date':
                    cmp = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
            }
            return sortState.direction === 'asc' ? cmp : -cmp;
        });

        elements.scoresBody.innerHTML = sorted.map(s => {
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

        document.querySelectorAll('#profil-scores-table th[data-sort]').forEach(th => {
            const col = th.dataset.sort;
            th.classList.toggle('sort-asc', sortState.column === col && sortState.direction === 'asc');
            th.classList.toggle('sort-desc', sortState.column === col && sortState.direction === 'desc');
        });
    }

    async function loadScores(userId) {
        elements.scoresLoading.style.display = 'block';
        elements.scoresEmpty.style.display = 'none';
        elements.scoresTable.style.display = 'none';

        try {
            scoresData = await window.getUserScores(userId);

            elements.scoresLoading.style.display = 'none';

            if (!scoresData || scoresData.length === 0) {
                elements.scoresEmpty.style.display = 'block';
                if (elements.statGames) elements.statGames.textContent = '0';
                if (elements.statScores) elements.statScores.textContent = '0';
                if (elements.statTop) elements.statTop.textContent = '0';
                return;
            }

            elements.scoresTable.style.display = 'table';

            const uniqueGames = new Set(scoresData.map(s => s.gameTitle).filter(Boolean));
            const top1Count = scoresData.filter(s => s.rank === 1).length;
            if (elements.statGames) elements.statGames.textContent = uniqueGames.size;
            if (elements.statScores) elements.statScores.textContent = scoresData.length;
            if (elements.statTop) elements.statTop.textContent = top1Count;

            sortState = { column: 'date', direction: 'desc' };
            renderScoresBody();
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

    function saveOriginals() {
      originals.avatarUrl = profile ? profile.photoURL : null;
      originals.bannerColor = elements.bannerPicker ? elements.bannerPicker.value : null;
      pending.avatar = null;
      pending.banner = null;
    }

    function revertOriginals() {
      if (originals.avatarUrl) {
        elements.avatarImg.src = originals.avatarUrl;
        elements.avatarImg.style.display = 'block';
        elements.avatarFallback.style.display = 'none';
      } else {
        elements.avatarImg.style.display = 'none';
        elements.avatarFallback.style.display = 'block';
      }
      applyBannerColor(originals.bannerColor);
      if (elements.bannerPicker) elements.bannerPicker.value = originals.bannerColor || '#0b7a63';
      pending.avatar = null;
      pending.banner = null;
    }

    // Edit toggle
    elements.editToggle.addEventListener('click', function () {
        elements.editName.style.display = 'block';
        elements.avatarActions.style.display = 'flex';
        if (elements.editFooter) elements.editFooter.style.display = 'flex';
        elements.nameInput.value = (profile && profile.displayName) || '';
        elements.nameInput.focus();
        elements.editToggle.style.display = 'none';
        elements.nameStatus.textContent = '';
        if (isOwnProfile) saveOriginals();
    });

    elements.nameCancel.addEventListener('click', function () {
        revertOriginals();
        elements.editName.style.display = 'none';
        elements.avatarActions.style.display = 'none';
        if (elements.editFooter) elements.editFooter.style.display = 'none';
        elements.editToggle.style.display = 'inline-block';
        elements.nameStatus.textContent = '';
    });

    function savePendingChanges() {
      var promises = [];

      if (pending.avatar !== null) {
        var avatarPromise = saveAvatarChanges(pending.avatar);
        promises.push(avatarPromise);
      }

      if (pending.banner !== null) {
        var bannerPromise = saveBannerColor(pending.banner);
        promises.push(bannerPromise);
      }

      return Promise.all(promises);
    }

    async function saveAvatarChanges(avatarState) {
      if (!currentUser) return;
      try {
        var { doc, setDoc, serverTimestamp } = window.Firestore;
        if (avatarState === 'sso') {
          var ssoUrl = currentUser.photoURL || '';
          await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), {
            avatar: { type: 'sso', url: ssoUrl, lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true });
          try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), {
            avatar: { type: 'sso', url: ssoUrl, lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true }); } catch (e) { }
          if (profile) profile.photoURL = ssoUrl;
        } else if (avatarState === 'default') {
          await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), {
            avatar: { type: 'default', url: '', lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true });
          try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), {
            avatar: { type: 'default', url: '', lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true }); } catch (e) { }
          if (profile) profile.photoURL = null;
        } else if (avatarState) {
          await setDoc(doc(window.firebaseDb, 'users-preferences', currentUser.uid), {
            avatar: { type: 'custom', url: avatarState, lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true });
          try { await setDoc(doc(window.firebaseDb, 'user-preferences', currentUser.uid), {
            avatar: { type: 'custom', url: avatarState, lastUpdated: new Date().toISOString() },
            updatedAt: serverTimestamp(),
          }, { merge: true }); } catch (e) { }
          if (profile) profile.photoURL = avatarState;
        }
      } catch (e) {
        console.error('Error saving avatar:', e);
        throw e;
      }
    }

    function handleSave() {
        var newName = elements.nameInput.value.trim();
        if (!newName) return;

        elements.nameSave.disabled = true;
        elements.nameSave.textContent = '...';
        elements.nameStatus.className = 'profil-name-status';

        window.updateFirebaseDisplayName(newName).then(function () {
            if (profile) profile.displayName = newName;
            elements.displayName.textContent = newName;
            return savePendingChanges();
        }).then(function () {
            elements.nameStatus.textContent = 'Profil mis à jour !';
            elements.nameStatus.className = 'profil-name-status success';
            pending.avatar = null;
            pending.banner = null;
            setTimeout(function () {
                elements.editName.style.display = 'none';
                elements.avatarActions.style.display = 'none';
                if (elements.editFooter) elements.editFooter.style.display = 'none';
                elements.editToggle.style.display = 'inline-block';
            }, 1200);
        }).catch(function (err) {
            elements.nameStatus.textContent = 'Erreur : ' + (err.message || 'echec de la mise a jour');
            elements.nameStatus.className = 'profil-name-status error';
        }).finally(function () {
            elements.nameSave.disabled = false;
            elements.nameSave.textContent = 'Enregistrer';
        });
    }

    elements.nameForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSave();
    });

    elements.nameSave.addEventListener('click', handleSave);

    // Logout
    elements.logout.addEventListener('click', async function () {
        await window.signOutFirebase();
        window.location.href = '/';
    });

    // Avatar URL
    elements.avatarSetUrl.addEventListener('click', function () {
        var url = elements.avatarUrlInput.value.trim();
        if (!url) return;
        elements.avatarImg.src = url;
        elements.avatarImg.style.display = 'block';
        elements.avatarFallback.style.display = 'none';
        pending.avatar = url;
        elements.avatarUrlInput.value = '';
    });

    elements.avatarUrlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') elements.avatarSetUrl.click();
    });

    elements.avatarReset.addEventListener('click', function () {
        var ssoUrl = currentUser ? currentUser.photoURL : null;
        if (ssoUrl) {
            elements.avatarImg.src = ssoUrl;
            elements.avatarImg.style.display = 'block';
            elements.avatarFallback.style.display = 'none';
        } else {
            elements.avatarImg.style.display = 'none';
            elements.avatarFallback.style.display = 'block';
        }
        pending.avatar = 'sso';
    });

    elements.avatarDelete.addEventListener('click', function () {
        elements.avatarImg.style.display = 'none';
        elements.avatarFallback.style.display = 'block';
        pending.avatar = 'default';
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