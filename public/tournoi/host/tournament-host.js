const { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, limit: fsLimit } = window.Firestore;

let currentUser = null;
let isAdmin = false;
let tournamentId = null;
let unsubscribeTournament = null;
let unsubscribeParticipants = null;
let unsubscribeRoundScores = null;
let timerInterval = null;
let gamelist = [];
let displayNameCache = {};
let editGamePoolLoadedFor = null;
let replaceTargetIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('t')) tournamentId = params.get('t');

  await fetchGamelist();
  setupAuth();
});

async function fetchGamelist() {
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isLocal ? '/gamelist.json?v=' + Date.now() : 'https://storage.googleapis.com/bonjourarcade/gamelist.json?v=' + Date.now();
    const r = await fetch(url);
    const data = await r.json();
    gamelist = data.games || [];
  } catch (e) {
    console.error('Error fetching gamelist:', e);
  }
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function $(id) { return document.getElementById(id); }

function setupAuth() {
  window.onFirebaseAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      $('admin-name').textContent = user.displayName || user.email;
      isAdmin = await window.checkFirebaseTournamentHostAccess();
      if (isAdmin) {
        hide('auth-section');
        show('admin-section');
        if (tournamentId) {
          loadDashboard(tournamentId);
        } else {
          show('setup-view');
          checkActiveTournaments();
        }
      } else {
        $('auth-error').textContent = 'Tu n\'as pas les droits admin.';
        $('auth-error').classList.remove('hidden');
      }
    } else {
      show('auth-section');
      hide('admin-section');
      cleanupListeners();
    }
  });

  $('login-btn').addEventListener('click', async () => {
    try {
      await window.signInWithGoogle();
    } catch (e) {
      $('auth-error').textContent = 'Erreur de connexion: ' + e.message;
      $('auth-error').classList.remove('hidden');
    }
  });

  $('logout-btn').addEventListener('click', () => {
    window.signOutFirebase();
  });
}

function syncPrivateCodeSection() {
  const section = document.getElementById('private-code-section');
  const checked = document.getElementById('is-public').checked;
  section.style.opacity = checked ? '0.3' : '1';
  const inputs = section.querySelectorAll('input');
  if (checked) {
    inputs.forEach(i => i.removeAttribute('required'));
  }
}
document.getElementById('is-public').addEventListener('change', syncPrivateCodeSection);
syncPrivateCodeSection();

let isCreating = false;
$('create-tournament-btn').addEventListener('click', async () => {
  if (isCreating) return;
  isCreating = true;
  $('create-tournament-btn').disabled = true;

  try {
    const gameIds = $('game-ids').value.split('\n').map(id => id.trim()).filter(id => id);
    if (gameIds.length === 0) { throw new Error('Entre au moins un ID de jeu.'); }
    const durUnits = { minutes: 60, heures: 3600, jours: 86400 };
    const roundDurationSec = parseFloat($('round-duration').value) * durUnits[$('round-duration-unit').value];
    const name = $('tournament-name').value.trim() || undefined;
    const description = $('tournament-description').value.trim() || undefined;
    const stakes = $('tournament-stakes').value.trim() || undefined;
    const isPublic = document.getElementById('is-public').checked;
    const type = document.querySelector('input[name="tournament-type"]:checked')?.value || 'elimination';
    const shareCode = $('share-code').value.trim().toUpperCase() || undefined;
    const autoDestroyInput = $('auto-destroy-days').value.trim();
    const autoDestroyDays = autoDestroyInput ? parseInt(autoDestroyInput, 10) : null;

    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'createTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'createTournament');
    const result = (await fn({ gameIds, roundDurationSec, pauseDurationSec: 0, name, description, stakes, isPublic, shareCode, autoDestroyDays, type })).data;
    tournamentId = result.tournamentId;
    window.history.replaceState({}, '', `?t=${tournamentId}`);
    hide('setup-view');
    loadDashboard(tournamentId);
  } catch (e) {
    $('create-error').textContent = e.message || 'Erreur de création';
    $('create-error').classList.remove('hidden');
  } finally {
    isCreating = false;
    $('create-tournament-btn').disabled = false;
  }
});

function removeAccentsForSearch(text) {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Reusable search+chips widget for picking a list of game IDs. Used both by
// the "create tournament" form and by the "edit game pool" panel shown for
// tournaments still in registration.
function createGamePicker({ searchId, resultsId, listId, hiddenFieldId }) {
  let selected = [];

  function sync() {
    $(hiddenFieldId).value = selected.join('\n');
  }

  function render() {
    const list = $(listId);
    if (selected.length === 0) {
      list.innerHTML = '<span class="selected-games-empty">Aucun jeu sélectionné — utilise la recherche ci-dessus ou "Générer aléatoire".</span>';
    } else {
      list.innerHTML = selected.map(id => {
        const g = gamelist.find(g => g.id === id);
        const title = g ? g.title : id;
        return `<span class="selected-game-chip" data-id="${id}">
          <img src="/games/${id}/cover.png" alt="" onerror="this.style.display='none'">
          <span>${title}</span>
          <span class="remove-chip" data-id="${id}" title="Retirer">×</span>
        </span>`;
      }).join('');
      list.querySelectorAll('.remove-chip').forEach(el => {
        el.addEventListener('click', () => {
          selected = selected.filter(id => id !== el.dataset.id);
          render();
        });
      });
    }
    sync();
  }

  function add(id) {
    if (!selected.includes(id)) {
      selected.push(id);
      render();
    }
    $(searchId).value = '';
    $(resultsId).classList.add('hidden');
    $(resultsId).innerHTML = '';
  }

  function renderResults(term) {
    const resultsEl = $(resultsId);
    const normalized = removeAccentsForSearch(term.trim());
    if (!normalized) { resultsEl.classList.add('hidden'); resultsEl.innerHTML = ''; return; }

    const eligible = gamelist.filter(g => g.enable_score && !g.problem);
    const matches = eligible.filter(g => {
      const title = removeAccentsForSearch(g.title || g.id);
      const gid = removeAccentsForSearch(g.id);
      return title.includes(normalized) || gid.includes(normalized);
    }).slice(0, 8);

    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="game-search-empty">Aucun jeu trouvé</div>';
    } else {
      resultsEl.innerHTML = matches.map(g => `
        <div class="game-search-result" data-id="${g.id}">
          <img src="/games/${g.id}/cover.png" alt="" onerror="this.style.display='none'">
          <div>
            <div class="gsr-title">${g.title || g.id}${selected.includes(g.id) ? ' ✓' : ''}</div>
            <div class="gsr-id">${g.id}</div>
          </div>
        </div>`).join('');
      resultsEl.querySelectorAll('.game-search-result').forEach(el => {
        el.addEventListener('click', () => add(el.dataset.id));
      });
    }
    resultsEl.classList.remove('hidden');
  }

  $(searchId).addEventListener('input', (e) => renderResults(e.target.value));
  $(searchId).addEventListener('focus', (e) => {
    if (e.target.value.trim()) renderResults(e.target.value);
  });

  render();

  return {
    setIds(ids) { selected = [...ids]; render(); },
    getIds() { return [...selected]; },
  };
}

document.addEventListener('click', (e) => {
  document.querySelectorAll('.game-search-wrap').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      wrap.querySelector('.game-search-results')?.classList.add('hidden');
    }
  });
});

const gamePicker = createGamePicker({
  searchId: 'game-search', resultsId: 'game-search-results',
  listId: 'selected-games-list', hiddenFieldId: 'game-ids',
});

const editGamePicker = createGamePicker({
  searchId: 'edit-game-search', resultsId: 'edit-game-search-results',
  listId: 'edit-selected-games-list', hiddenFieldId: 'edit-game-ids',
});

$('generate-games-btn').addEventListener('click', () => {
  const numGames = parseInt($('num-games').value, 10) || 4;
  const eligible = gamelist.filter(g => g.enable_score && !g.problem);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  gamePicker.setIds(shuffled.slice(0, numGames).map(g => g.id));
});

$('save-game-pool-btn').addEventListener('click', async () => {
  const gameIds = editGamePicker.getIds();
  $('edit-game-pool-error').classList.add('hidden');
  if (gameIds.length === 0) {
    $('edit-game-pool-error').textContent = 'Entre au moins un jeu.';
    $('edit-game-pool-error').classList.remove('hidden');
    return;
  }
  const btn = $('save-game-pool-btn');
  btn.disabled = true;
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'updateTournamentGamePool')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'updateTournamentGamePool');
    await fn({ tournamentId, gameIds });
    showToast('Jeux du tournoi mis à jour ✓');
  } catch (e) {
    $('edit-game-pool-error').textContent = e.message || 'Erreur';
    $('edit-game-pool-error').classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

async function checkActiveTournaments() {
  try {
    const db = window.firebaseDb;
    const snapshot = await getDocs(query(collection(db, 'tournaments'), where('adminId', '==', currentUser.uid)));
    const list = $('active-tournaments-list');
    list.innerHTML = '';
    const active = snapshot.docs.filter(d => {
      const s = d.data().status;
      return s === 'registration' || s === 'active';
    }).slice(0, 10);
    if (active.length === 0) {
      $('existing-tournaments').style.display = 'none';
      return;
    }
    $('existing-tournaments').style.display = 'block';
    active.forEach(doc => {
      const t = doc.data();
      const div = document.createElement('div');
      div.className = 'participant-chip';
      div.style.cursor = 'pointer';
      div.innerHTML = `<span>${t.shareCode} — ${t.status === 'registration' ? 'Inscription' : 'Actif'}</span>`;
      div.addEventListener('click', () => {
        tournamentId = doc.id;
        window.history.replaceState({}, '', `?t=${tournamentId}`);
        hide('setup-view');
        loadDashboard(tournamentId);
      });
      list.appendChild(div);
    });
  } catch (e) {
    console.error('Error checking tournaments:', e);
  }
}

function cleanupListeners() {
  if (unsubscribeTournament) { unsubscribeTournament(); unsubscribeTournament = null; }
  if (unsubscribeParticipants) { unsubscribeParticipants(); unsubscribeParticipants = null; }
  if (unsubscribeRoundScores) { unsubscribeRoundScores(); unsubscribeRoundScores = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function loadDashboard(id) {
  cleanupListeners();
  hide('setup-view');
  show('dashboard-view');
  editGamePoolLoadedFor = null;
  $('player-view-btn').href = `/tournoi/play/?t=${id}`;
  const db = window.firebaseDb;
  const tournamentRef = doc(db, 'tournaments', id);

  unsubscribeTournament = onSnapshot(tournamentRef, (snap) => {
    if (!snap.exists()) { showToast('Tournoi introuvable'); return; }
    renderTournament(snap.data(), snap.id);
  });

  unsubscribeParticipants = onSnapshot(collection(tournamentRef, 'participants'), (snap) => {
    const participants = {};
    const newUids = [];
    snap.forEach(d => {
      participants[d.id] = d.data();
      if (!(d.id in displayNameCache)) newUids.push(d.id);
    });
    for (const uid of Object.keys(participants)) {
      if (displayNameCache[uid]) {
        participants[uid].displayName = displayNameCache[uid];
      }
    }
    renderParticipants(participants);
    if (newUids.length > 0) {
      Promise.all(newUids.map(uid =>
        TournoiUtils.callFunction('getPublicProfile', {userId: uid}).catch(() => null)
      )).then(profiles => {
        let changed = false;
        profiles.forEach(p => {
          if (p) {
            if (p.displayName && displayNameCache[p.uid] !== p.displayName) {
              displayNameCache[p.uid] = p.displayName;
              changed = true;
            }
            if (p.photoURL && currentParticipants[p.uid]?.photoURL !== p.photoURL) {
              changed = true;
            }
          }
        });
        if (changed) {
          const updated = {};
          Object.keys(currentParticipants).forEach(uid => {
            updated[uid] = {...currentParticipants[uid]};
            if (displayNameCache[uid]) updated[uid].displayName = displayNameCache[uid];
            const profile = profiles.find(p => p?.uid === uid);
            if (profile?.photoURL) updated[uid].photoURL = profile.photoURL;
          });
          renderParticipants(updated);
        }
      }).catch(e => console.error('Error fetching profiles:', e));
    }
  });
}

let lastRoundIndex = -1;
let tournamentData = null;
let currentUpcomingOrder = null;
let currentGamesArray = null;
function renderTournament(t, id) {
  tournamentData = t;
  $('display-name').textContent = t.name || `Tournoi #${t.shareCode}`;
  const descEl = document.getElementById('display-description');
  if (descEl) {
    if (t.description) { descEl.textContent = t.description; descEl.classList.remove('hidden'); }
    else { descEl.classList.add('hidden'); }
  }
  $('display-sharecode').textContent = t.shareCode;

  const badge = $('display-type-badge');
  if (t.isPublic) {
    badge.textContent = 'Public';
    badge.style.background = '#28a745';
    badge.style.color = 'white';
  } else {
    badge.textContent = 'Privé';
    badge.style.background = '#ffc107';
    badge.style.color = '#1a1a2e';
  }

  const shareUrl = `${window.location.origin}/tournoi/play/?t=${id}`;
  $('share-link-input').value = shareUrl;

  const statusLabels = { registration: 'Inscription', active: 'Actif', finished: 'Terminé' };
  $('display-status').textContent = statusLabels[t.status] || t.status;

  if (t.status === 'registration') {
    hide('active-phase');
    hide('finished-phase');
    show('setup-phase');
    $('setup-phase').classList.remove('hidden');
    if (editGamePoolLoadedFor !== id) {
      editGamePoolLoadedFor = id;
      editGamePicker.setIds(t.gamePool || []);
    }
  } else if (t.status === 'active') {
    hide('setup-phase');
    hide('finished-phase');
    show('active-phase');

    const round = t.currentRoundIndex;
    const total = t.games.length;
    const gameId = t.games[round];

    $('round-title').textContent = `Ronde ${round + 1} / ${total}`;

    if (lastRoundIndex !== round) {
      lastRoundIndex = round;
    }
    startRoundTimer(t);

    if (gameId) {
      const g = gamelist.find(g => g.id === gameId);
      $('game-card').classList.remove('hidden');
      if (g) {
        $('game-cover').src = `/games/${gameId}/cover.png`;
        $('game-cover').style.display = 'inline';
        $('game-title').textContent = g.title;
      } else {
        $('game-cover').style.display = 'none';
        $('game-title').textContent = gameId;
      }
      $('game-link').innerHTML = `<a href="${TournoiUtils.getGameUrl(gameId)}?t=${id}&r=${round}" target="_blank">${TournoiUtils.getGameUrl(gameId)}?t=${id}&r=${round}</a>`;

      $('end-round-btn').classList.remove('hidden');
    } else {
      $('game-card').classList.add('hidden');
      $('end-round-btn').classList.add('hidden');
    }

    const upcomingGameIds = t.games.slice(round + 1);
    if (!currentUpcomingOrder || JSON.stringify(currentUpcomingOrder) !== JSON.stringify(upcomingGameIds)) {
      currentUpcomingOrder = [...upcomingGameIds];
      renderUpcomingGames(t.games, round);
    }

    setupRoundScoresListener(id, round);
    setupPendingScoresListener(id, round);
  } else if (t.status === 'finished') {
    hide('setup-phase');
    hide('active-phase');
    show('finished-phase');
    lastRoundIndex = -1;
    renderResults(id);
  }
}

function renderUpcomingGames(games, round) {
  currentGamesArray = games;
  renderUpcomingHtml(games, round);
  ensureSaveOrderBtn();
}

function ensureSaveOrderBtn() {
  if ($('save-order-btn')) return;
  const container = $('upcoming-games');
  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-order-btn';
  saveBtn.className = 'btn btn-sm btn-primary';
  saveBtn.textContent = 'Enregistrer les changements';
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Enregistrement...';
    try {
      const fn = window.httpsCallable
        ? window.httpsCallable(window.firebaseFunctions, 'reorderRounds')
        : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'reorderRounds');
      await fn({ tournamentId, games: currentGamesArray });
      showToast('Changements enregistrés ✓');
      saveBtn.textContent = 'Enregistrer les changements';
    } catch (e) {
      showToast('Erreur: ' + (e.message || e));
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer les changements';
    }
  });
  container.parentNode.insertBefore(saveBtn, container.nextSibling);
}

function renderUpcomingHtml(games, round) {
  const container = $('upcoming-games');
  const upcomingIds = games.slice(round + 1);
  if (upcomingIds.length === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  container.innerHTML = upcomingIds.map((gid, i) => {
    const g = gamelist.find(g => g.id === gid);
    const title = g ? g.title : gid;
    const label = `Ronde ${round + i + 2}`;
    return `<div class="upcoming-game" draggable="true" data-index="${i}" data-game="${gid}">
      <div class="upcoming-header">
        <span class="upcoming-label">${label}</span>
        <button type="button" class="upcoming-edit-btn" draggable="false" data-index="${i}" title="Remplacer ce jeu">✏️</button>
      </div>
      <div class="upcoming-img-wrap">
        <img src="/games/${gid}/cover.png" alt="${title}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="upcoming-title" title="${title}">${title}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.upcoming-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.index, 10);
      openReplacePopover(btn.closest('.upcoming-game'), round + 1 + i);
    });
    btn.addEventListener('dragstart', (e) => e.stopPropagation());
  });

  let dragIndex = null;
  container.querySelectorAll('.upcoming-game').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragIndex = parseInt(el.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const toIndex = parseInt(el.dataset.index, 10);
      if (dragIndex === null || dragIndex === toIndex) return;
      const order = [...currentUpcomingOrder];
      const [moved] = order.splice(dragIndex, 1);
      order.splice(toIndex, 0, moved);
      currentUpcomingOrder = order;
      dragIndex = null;
      if (!currentGamesArray) return;
      const newGames = [...currentGamesArray];
      for (let i = 0; i < order.length; i++) {
        newGames[round + 1 + i] = order[i];
      }
      currentGamesArray = newGames;
      renderUpcomingHtml(currentGamesArray, round);
      showToast('Ordre modifié — clique sur "Enregistrer les changements" pour sauvegarder');
    });
    el.addEventListener('dragend', () => { dragIndex = null; });
  });
}

function openReplacePopover(tileEl, absoluteIndex) {
  replaceTargetIndex = absoluteIndex;
  const pop = $('replace-game-popover');
  const rect = tileEl.getBoundingClientRect();
  pop.style.left = `${Math.min(rect.left, window.innerWidth - 268)}px`;
  pop.style.top = `${rect.bottom + 4}px`;
  pop.classList.remove('hidden');
  $('replace-game-search').value = '';
  renderReplaceResults('');
  $('replace-game-search').focus();
}

function closeReplacePopover() {
  $('replace-game-popover').classList.add('hidden');
  replaceTargetIndex = null;
}

function renderReplaceResults(term) {
  const resultsEl = $('replace-game-search-results');
  const normalized = removeAccentsForSearch(term.trim());
  const eligible = gamelist.filter(g => g.enable_score && !g.problem);
  const matches = (normalized
    ? eligible.filter(g => removeAccentsForSearch(g.title || g.id).includes(normalized) || removeAccentsForSearch(g.id).includes(normalized))
    : eligible
  ).slice(0, 8);

  resultsEl.innerHTML = matches.length === 0
    ? '<div class="game-search-empty">Aucun jeu trouvé</div>'
    : matches.map(g => `
      <div class="game-search-result" data-id="${g.id}">
        <img src="/games/${g.id}/cover.png" alt="" onerror="this.style.display='none'">
        <div>
          <div class="gsr-title">${g.title || g.id}</div>
          <div class="gsr-id">${g.id}</div>
        </div>
      </div>`).join('');

  resultsEl.querySelectorAll('.game-search-result').forEach(el => {
    el.addEventListener('click', () => {
      if (replaceTargetIndex == null || !currentGamesArray) { closeReplacePopover(); return; }
      const newGames = [...currentGamesArray];
      newGames[replaceTargetIndex] = el.dataset.id;
      currentGamesArray = newGames;
      currentUpcomingOrder = currentGamesArray.slice(lastRoundIndex + 1);
      renderUpcomingHtml(currentGamesArray, lastRoundIndex);
      closeReplacePopover();
      showToast('Jeu remplacé — clique sur "Enregistrer les changements" pour sauvegarder');
    });
  });
}

$('replace-game-search').addEventListener('input', (e) => renderReplaceResults(e.target.value));
document.addEventListener('click', (e) => {
  const pop = $('replace-game-popover');
  if (!pop.classList.contains('hidden') && !pop.contains(e.target) && !e.target.classList.contains('upcoming-edit-btn')) {
    closeReplacePopover();
  }
});

function startRoundTimer(t) {
  if (timerInterval) clearInterval(timerInterval);
  const update = () => {
    const remaining = TournoiUtils.getRemainingSeconds(t.roundStartTime, t.roundDurationSec);
    $('timer').textContent = TournoiUtils.formatTimer(remaining);
  };
  update();
  timerInterval = setInterval(update, 1000);
}

function setupRoundScoresListener(id, roundIndex) {
  if (unsubscribeRoundScores) { unsubscribeRoundScores(); }
  const db = window.firebaseDb;
  const q = query(collection(db, 'tournaments', id, 'roundScores'),
    where('roundIndex', '==', roundIndex),
    where('verified', '==', true),
    orderBy('score', 'desc'));
  unsubscribeRoundScores = onSnapshot(q, (snap) => {
    const scores = [];
    snap.forEach(d => scores.push({ id: d.id, ...d.data() }));
    renderScoreboard(scores);
  });
}

function setupPendingScoresListener(id, roundIndex) {
  const db = window.firebaseDb;
  const q = query(collection(db, 'tournaments', id, 'roundScores'),
    where('roundIndex', '==', roundIndex),
    where('verified', '==', false));
  onSnapshot(q, async (snap) => {
    const pending = [];
    snap.forEach(d => pending.push({ id: d.id, ...d.data() }));
    $('pending-scores-section').classList.toggle('hidden', pending.length === 0);
    if (pending.length === 0) { $('pending-scores-list').innerHTML = ''; return; }

    const needFallback = pending.filter(p => !p.screenshotUrl && p.gameScoreId);
    const fallbackMap = {};
    if (needFallback.length > 0) {
      await Promise.all(needFallback.map(async (p) => {
        try {
          const gsSnap = await getDoc(doc(db, 'game-scores', p.gameScoreId));
          if (gsSnap.exists()) {
            const d = gsSnap.data();
            fallbackMap[p.gameScoreId] = d.screenshotUrl || d.screenshotDataUrl || null;
          }
        } catch (e) { /* ignore */ }
      }));
    }

    $('pending-scores-list').innerHTML = pending.map(p => {
      const screenshot = p.screenshotUrl || fallbackMap[p.gameScoreId];
      return `<div class="pending-score">
        <img src="${p.photoURL || '../assets/default-avatar.png'}" style="width:24px;height:24px;border-radius:50%;">
        <span><a href="/profil/?uid=${p.userId}" style="color:inherit;text-decoration:none;">${p.displayName}</a></span>
        <span style="font-weight:700;">${p.score.toLocaleString()}</span>
        ${screenshot ? `<img src="${screenshot}" class="pending-screenshot-thumb" data-src="${screenshot}">` : ''}
        <label class="notif-label" title="Notifier sur Discord">
          <input type="checkbox" class="notif-checkbox" data-score-id="${p.gameScoreId}" checked>
          <span>🔔</span>
        </label>
        <button class="btn-success btn-sm verify-score-btn" data-score-id="${p.gameScoreId}">✓</button>
        <button class="btn-danger btn-sm reject-score-btn" data-score-id="${p.gameScoreId}">✗</button>
      </div>`;
    }).join('');

    document.querySelectorAll('.verify-score-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scoreId = btn.dataset.scoreId;
        const checkbox = document.querySelector(`.notif-checkbox[data-score-id="${scoreId}"]`);
        const notify = checkbox ? checkbox.checked : false;
        await verifyPendingScore(scoreId, notify);
      });
    });

    document.querySelectorAll('.reject-score-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scoreId = btn.dataset.scoreId;
        if (!confirm('Rejeter ce score ? Il sera supprimé définitivement.')) return;
        await rejectPendingScore(scoreId);
      });
    });

    document.querySelectorAll('.pending-screenshot-thumb').forEach(img => {
      img.addEventListener('click', (e) => {
        showScreenshotPreview(e.target.dataset.src);
      });
    });
  });
}

let currentParticipants = {};
function renderParticipants(participants) {
  currentParticipants = participants;
  const count = Object.keys(participants).length;
  $('participant-count').textContent = `${count} participant${count > 1 ? 's' : ''}`;

  const gridHtml = () =>
    '<div class="participant-grid">' +
    Object.entries(participants).map(([uid, p]) =>
      `<div class="participant-chip ${p.eliminated ? 'eliminated-chip' : ''}">
        <img src="${p.photoURL || '../assets/default-avatar.png'}" alt="">
        <span><a href="/profil/?uid=${uid}" style="color:inherit;text-decoration:none;">${p.displayName}</a></span>
        ${p.eliminated ? '<span class="elim-badge">Éliminé</span>' : ''}
        <button class="btn-sm ${p.eliminated ? 'btn-warning' : 'btn-danger'}" style="margin-left:4px;padding:2px 6px;font-size:11px;"
          data-uid="${uid}" data-action="${p.eliminated ? 'reinstate' : 'eliminate'}"
          title="${p.eliminated ? 'Réintégrer' : 'Éliminer'}">${p.eliminated ? '🔄' : '⚔️'}</button>
      </div>`
    ).join('') +
    '</div>';

  const html = gridHtml();
  $('participant-list-setup').innerHTML = html;
  $('participant-list-active').innerHTML = html;

  document.querySelectorAll('#participant-list-setup [data-action], #participant-list-active [data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      const action = btn.dataset.action;
      btn.disabled = true;
      try {
        const fn = window.httpsCallable
          ? window.httpsCallable(window.firebaseFunctions, action === 'eliminate' ? 'eliminateParticipant' : 'reinstateParticipant')
          : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, action === 'eliminate' ? 'eliminateParticipant' : 'reinstateParticipant');
        await fn({ tournamentId, userId: uid });
        showToast(action === 'eliminate' ? 'Participant éliminé ⚔️' : 'Participant réintégré 🔄');
      } catch (e) {
        showToast('Erreur: ' + (e.message || e));
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function renderScoreboard(roundScores) {
  const cutoffs = tournamentData?.cutoffs || null;
  const totalRounds = tournamentData?.games?.length || 0;
  const html = TournoiUtils.renderScoreboardHtml(roundScores, currentParticipants, lastRoundIndex, cutoffs, totalRounds, tournamentData?.type);
  $('scoreboard-entries').innerHTML = html;
  TournoiUtils.enrichScoreboardEntries('scoreboard-entries');
}

async function renderResults(id) {
  let results = null;
  let lastError = null;

  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'finalizeTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'finalizeTournament');
    const resp = (await fn({ tournamentId: id })).data;
    results = resp?.results || resp;
  } catch (e) {
    lastError = e;
    console.warn('finalizeTournament CF failed for host renderResults:', e);
  }

  if (!results || !results.cumulativeScoresTable) {
    results = buildResultsFromParticipants(currentParticipants, tournamentData?.type);
    if (!results) {
      console.error('buildResultsFromParticipants also failed. CF error:', lastError);
      $('results-content').innerHTML = '<p style="color:#dc3545;">Erreur de chargement des résultats. Vérifie la console.</p>';
      return;
    }
  }

  let html = '<h2>🏆 Résultats du tournoi</h2>';

  if (results.podiumPlayers && results.podiumPlayers.length > 0) {
    html += '<div class="podium">';
    const order = [1, 0, 2];
    for (const idx of order) {
      const p = results.podiumPlayers[idx];
      if (!p) continue;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      const nameLink = p.uid ? `<a href="/profil/?uid=${p.uid}" style="color:inherit;text-decoration:none;">${p.name}</a>` : p.name;
      html += `<div class="podium-place podium-${idx + 1}">
        <div class="rank-num">${medal}</div>
        <img src="${p.photoURL || '../assets/default-avatar.png'}" alt="">
        <div class="name">${nameLink}</div>
        <div class="score"><span class="num">${p.totalPct.toFixed(1)}%</span> <span class="dim">(${p.totalScoreRaw.toLocaleString()} pts)</span></div>
      </div>`;
    }
    html += '</div>';
  }

  if (results.overallChampion) {
    html += `<p class="accent-text" style="text-align:center;font-size:1.2rem;display:inline-block;width:100%;box-sizing:border-box;">
      🏆 Champion cumulatif: <strong>${results.overallChampion.uid ? `<a href="/profil/?uid=${results.overallChampion.uid}" style="color:inherit;text-decoration:none;">${results.overallChampion.name}</a>` : results.overallChampion.name}</strong>
      <span class="num">${results.overallChampion.totalPct.toFixed(1)}%</span> <span class="dim">(${results.overallChampion.totalScoreRaw.toLocaleString()} pts)</span>
    </p>`;
  }

  if (results.cumulativeScoresTable) {
    html += '<div class="section-title">Classement cumulatif</div>';
    const rankBy = (results.type || tournamentData?.type) === 'percentage' ? 'totalPct' : 'survival';
    html += TournoiUtils.renderCombinedTableHtml(results.cumulativeScoresTable, results.totalRounds, { rankBy });
  }

  $('results-content').innerHTML = html;
}

function buildResultsFromParticipants(participants, tournamentType) {
  try {
    const entries = Object.entries(participants).map(([uid, p]) => ({
      uid,
      name: p.displayName || 'Anonyme',
      photoURL: p.photoURL || '',
      scores: p.scores || [],
      hasUnverified: (p.scores || []).some((s, i) => s > 0 && !(p.scoresVerified || [])[i]),
      eliminated: p.eliminated || false,
      eliminatedRound: p.eliminatedRound,
    }));

    const totalRounds = entries.reduce((max, p) => Math.max(max, p.scores.length), 0);
    const scored = TournoiUtils.computePercentages(entries, totalRounds);
    if (tournamentType === 'percentage') {
      scored.sort((a, b) => b.totalPct - a.totalPct);
    } else {
      scored.sort((a, b) => {
        const aRound = typeof a.eliminatedRound === 'number' ? a.eliminatedRound : totalRounds - 1;
        const bRound = typeof b.eliminatedRound === 'number' ? b.eliminatedRound : totalRounds - 1;
        if (bRound !== aRound) return bRound - aRound;
        return (b.scores[bRound] || 0) - (a.scores[aRound] || 0);
      });
    }

    const podiumPlayers = scored.slice(0, 3).map(p => ({
      uid: p.uid,
      name: p.name,
      photoURL: p.photoURL,
      totalPct: p.totalPct,
      totalScoreRaw: p.totalScoreRaw,
    }));

    const champion = scored[0] || null;

    return {
      podiumPlayers,
      totalRounds,
      overallChampion: champion ? { uid: champion.uid, name: champion.name, totalPct: champion.totalPct, totalScoreRaw: champion.totalScoreRaw } : null,
      cumulativeScoresTable: scored.map(p => ({
        uid: p.uid,
        name: p.name,
        photoURL: p.photoURL,
        scores: p.scores,
        pctScores: p.pctScores,
        totalPct: p.totalPct,
        totalScoreRaw: p.totalScoreRaw,
        hasUnverified: p.hasUnverified,
        eliminated: p.eliminated,
        eliminatedRound: p.eliminatedRound,
      })),
    };
  } catch (e) {
    console.error('buildResultsFromParticipants failed:', e);
    return null;
  }
}

$('start-tournament-btn').addEventListener('click', async () => {
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'startTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'startTournament');
    await fn({ tournamentId });
    showToast('Tournoi démarré !');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
});

$('end-round-btn').addEventListener('click', async () => {
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'endRound')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'endRound');
    await fn({ tournamentId });
    showToast('Ronde terminée');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
});

$('next-round-btn').addEventListener('click', async () => {
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'advanceToNextRound')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'advanceToNextRound');
    const result = (await fn({ tournamentId })).data;
    if (result.finished) {
      showToast('Tournoi terminé !');
    } else {
      showToast('Ronde suivante !');
    }
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
});

$('finalize-btn').addEventListener('click', async () => {
  if (!confirm('Finaliser le tournoi ?')) return;
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'finalizeTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'finalizeTournament');
    await fn({ tournamentId });
    showToast('Tournoi finalisé !');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
});

$('share-link-btn').addEventListener('click', () => {
  const container = $('share-link-container');
  container.classList.toggle('hidden');
  if (!container.classList.contains('hidden')) {
    $('share-link-input').select();
  }
});

$('copy-link-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('share-link-input').value);
    showToast('Lien copié !');
  } catch {
    $('share-link-input').select();
    document.execCommand('copy');
    showToast('Lien copié !');
  }
});

$('cancel-tournament-btn').addEventListener('click', async () => {
  if (!confirm('Annuler le tournoi ? Cette action est irréversible.')) return;
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'finalizeTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'finalizeTournament');
    await fn({ tournamentId });
  } catch (e) {
    console.warn('finalizeTournament CF failed for cancel:', e);
  }
  cleanupListeners();
  showToast('Tournoi annulé');
  const url = new URL(window.location);
  url.searchParams.delete('t');
  window.history.replaceState({}, '', url);
  show('cancel-finished-view');
  hide('dashboard-view');
});

$('back-to-list-btn').addEventListener('click', () => {
  window.location.href = '/tournoi/';
});

function showScreenshotPreview(url) {
  const modal = document.getElementById('screenshot-modal');
  const img = document.getElementById('screenshot-modal-img');
  if (!modal || !img) return;
  modal.classList.add('is-loading');
  modal.style.display = 'flex';
  const done = () => { modal.classList.remove('is-loading'); };
  img.onload = done;
  img.onerror = done;
  img.src = url;
  modal.onclick = () => {
    modal.style.display = 'none';
    modal.classList.remove('is-loading');
    img.onload = null;
    img.onerror = null;
    img.src = '';
  };
}

// Collapsible create section
document.getElementById('create-toggle').addEventListener('click', () => {
  const form = document.getElementById('create-form');
  const icon = document.getElementById('create-toggle-icon');
  const isHidden = form.classList.toggle('hidden');
  icon.textContent = isHidden ? '▶' : '▼';
});

async function verifyPendingScore(scoreId, notifyWebhooks = false) {
  if (!scoreId) { showToast('ID de score manquant'); return; }
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'verifyScore')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'verifyScore');
    await fn({ scoreId, notifyWebhooks });
    showToast(notifyWebhooks ? 'Score vérifié + notification Discord ✓' : 'Score vérifié ✓');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
}

async function rejectPendingScore(scoreId) {
  if (!scoreId) { showToast('ID de score manquant'); return; }
  try {
    if (typeof window.deleteGameScore === 'function') {
      await window.deleteGameScore(scoreId);
    } else {
      const fn = window.httpsCallable
        ? window.httpsCallable(window.firebaseFunctions, 'deleteScore')
        : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'deleteScore');
      await fn({ scoreId });
    }
    showToast('Score rejeté ✗');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
