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
      isAdmin = await window.checkFirebaseAdminAccess();
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
    const shareCode = $('share-code').value.trim().toUpperCase() || undefined;

    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'createTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'createTournament');
    const result = (await fn({ gameIds, roundDurationSec, pauseDurationSec: 0, shareCode })).data;
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

$('generate-games-btn').addEventListener('click', () => {
  const numGames = parseInt($('num-games').value, 10) || 4;
  const eligible = gamelist.filter(g => g.enable_score && !g.problem);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  $('game-ids').value = shuffled.slice(0, numGames).map(g => g.id).join('\n');
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
  show('dashboard-view');
  const db = window.firebaseDb;
  const tournamentRef = doc(db, 'tournaments', id);

  unsubscribeTournament = onSnapshot(tournamentRef, (snap) => {
    if (!snap.exists) { showToast('Tournoi introuvable'); return; }
    renderTournament(snap.data(), snap.id);
  });

  unsubscribeParticipants = onSnapshot(collection(tournamentRef, 'participants'), async (snap) => {
    const participants = {};
    const newUids = [];
    snap.forEach(d => {
      participants[d.id] = d.data();
      if (!(d.id in displayNameCache)) newUids.push(d.id);
    });
    if (newUids.length > 0) {
      try {
        const profiles = await Promise.all(
          newUids.map(uid => TournoiUtils.callFunction('getPublicProfile', {userId: uid}).catch(() => null))
        );
        profiles.forEach(p => {
          if (p && p.displayName) {
            displayNameCache[p.uid] = p.displayName;
          }
        });
      } catch (e) {
        console.error('Error fetching profiles:', e);
      }
    }
    for (const uid of Object.keys(participants)) {
      if (displayNameCache[uid]) {
        participants[uid].displayName = displayNameCache[uid];
      }
    }
    renderParticipants(participants);
  });
}

let lastRoundIndex = -1;
let tournamentData = null;
function renderTournament(t, id) {
  tournamentData = t;
  $('display-sharecode').textContent = t.shareCode;

  const shareUrl = `${window.location.origin}/tournoi/join/?c=${t.shareCode}`;
  $('share-link-input').value = shareUrl;

  const statusLabels = { registration: 'Inscription', active: 'Actif', finished: 'Terminé' };
  $('display-status').textContent = statusLabels[t.status] || t.status;

  if (t.status === 'registration') {
    hide('active-phase');
    hide('finished-phase');
    show('setup-phase');
    $('setup-phase').classList.remove('hidden');
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
    const upcomingContainer = $('upcoming-games');
    if (upcomingGameIds.length > 0) {
      upcomingContainer.classList.remove('hidden');
      upcomingContainer.innerHTML = upcomingGameIds.map((gid, i) => {
        const g = gamelist.find(g => g.id === gid);
        const title = g ? g.title : gid;
        const label = `Ronde ${round + i + 2}`;
        return `<div class="upcoming-game">
          <div class="upcoming-img-wrap">
            <img src="/games/${gid}/cover.png" alt="${title}" loading="lazy" onerror="this.style.display='none'">
            <div class="upcoming-label">${label}</div>
          </div>
          <div class="upcoming-title" title="${title}">${title}</div>
        </div>`;
      }).join('');
    } else {
      upcomingContainer.classList.add('hidden');
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
  const html = TournoiUtils.renderScoreboardHtml(roundScores, currentParticipants, lastRoundIndex, cutoffs, totalRounds);
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
    results = buildResultsFromParticipants(currentParticipants);
    if (!results) {
      console.error('buildResultsFromParticipants also failed. CF error:', lastError);
      $('results-content').innerHTML = '<p style="color:#dc3545;">Erreur de chargement des résultats. Vérifie la console.</p>';
      return;
    }
  }

  let html = '<h2>🏆 Résultats du tournoi</h2>';

  if (results.podiumPlayers && results.podiumPlayers.length > 0) {
    html += '<div class="podium">';
    const order = [2, 0, 1];
    for (const idx of order) {
      const p = results.podiumPlayers[idx];
      if (!p) continue;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      const nameLink = p.uid ? `<a href="/profil/?uid=${p.uid}" style="color:inherit;text-decoration:none;">${p.name}</a>` : p.name;
      html += `<div class="podium-place podium-${idx + 1}">
        <div class="rank-num">${medal}</div>
        <img src="${p.photoURL || '../assets/default-avatar.png'}" alt="">
        <div class="name">${nameLink}</div>
        <div class="score">${p.score.toLocaleString()} pts</div>
      </div>`;
    }
    html += '</div>';
  }

  if (results.overallChampion) {
    html += `<p style="text-align:center;color:#ffd700;font-size:1.2rem;">
      🏆 Champion cumulatif: <strong>${results.overallChampion.uid ? `<a href="/profil/?uid=${results.overallChampion.uid}" style="color:inherit;text-decoration:none;">${results.overallChampion.name}</a>` : results.overallChampion.name}</strong>
      (${results.overallChampion.totalScore.toLocaleString()} pts)
    </p>`;
  }

  if (results.cumulativeScoresTable) {
    html += '<div class="section-title">Classement cumulatif</div>';
    html += '<table class="cumul-table"><thead><tr><th>#</th><th></th><th>Joueur</th><th>Total</th></tr></thead><tbody>';
    results.cumulativeScoresTable.forEach((p, i) => {
      const nameLink = p.uid ? `<a href="/profil/?uid=${p.uid}" style="color:inherit;text-decoration:none;">${p.name}</a>` : p.name;
      html += `<tr class="${p.eliminated ? 'eliminated-row' : ''}">
        <td>${i + 1}</td>
        <td><img src="${p.photoURL || '../assets/default-avatar.png'}" class="avatar-sm"></td>
        <td>${nameLink}</td>
        <td>${p.totalScore.toLocaleString()}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }

  $('results-content').innerHTML = html;
}

function buildResultsFromParticipants(participants) {
  try {
    const list = Object.entries(participants).map(([uid, p]) => ({
      uid,
      name: p.displayName || 'Anonyme',
      photoURL: p.photoURL || '',
      totalScore: (p.scores || []).reduce((s, v) => s + v, 0),
      eliminated: p.eliminated || false,
      eliminatedRound: p.eliminatedRound,
    }));

    list.sort((a, b) => {
      const roundA = a.eliminated ? a.eliminatedRound : Infinity;
      const roundB = b.eliminated ? b.eliminatedRound : Infinity;
      if (roundB !== roundA) return roundB - roundA;
      return b.totalScore - a.totalScore;
    });

    const podiumPlayers = list.slice(0, 3).map(p => ({
      uid: p.uid,
      name: p.name,
      photoURL: p.photoURL,
      score: p.totalScore,
    }));

    const champion = list[0] || null;

    return {
      podiumPlayers,
      overallChampion: champion ? { uid: champion.uid, name: champion.name, totalScore: champion.totalScore } : null,
      cumulativeScoresTable: list.map(p => ({
        uid: p.uid,
        name: p.name,
        photoURL: p.photoURL,
        totalScore: p.totalScore,
        eliminated: p.eliminated,
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
  img.src = url;
  modal.style.display = 'flex';
  modal.onclick = () => { modal.style.display = 'none'; img.src = ''; };
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
