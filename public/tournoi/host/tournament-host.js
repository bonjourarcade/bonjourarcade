const { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, limit: fsLimit } = window.Firestore;

let currentUser = null;
let isAdmin = false;
let tournamentId = null;
let unsubscribeTournament = null;
let unsubscribeParticipants = null;
let unsubscribeRoundScores = null;
let timerInterval = null;
let gamelist = [];

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
    const pauseDurationSec = parseFloat($('pause-duration').value) * durUnits[$('pause-duration-unit').value];
    const shareCode = $('share-code').value.trim().toUpperCase() || undefined;

    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'createTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'createTournament');
    const result = (await fn({ gameIds, roundDurationSec, pauseDurationSec, shareCode })).data;
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
    const snapshot = await getDocs(query(collection(db, 'tournaments'), where('adminId', '==', currentUser.uid), where('status', 'in', ['registration', 'active']), fsLimit(10)));
    const list = $('active-tournaments-list');
    list.innerHTML = '';
    if (snapshot.empty) {
      $('existing-tournaments').style.display = 'none';
      return;
    }
    $('existing-tournaments').style.display = 'block';
    snapshot.forEach(doc => {
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

  unsubscribeParticipants = onSnapshot(collection(tournamentRef, 'participants'), (snap) => {
    const participants = {};
    snap.forEach(d => { participants[d.id] = d.data(); });
    renderParticipants(participants);
  });
}

let lastRoundIndex = -1;
function renderTournament(t, id) {
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

    const isBreak = t.breakStartTime !== null;

    if (isBreak) {
      $('round-subtitle').textContent = 'Pause — vérification des scores';
      $('round-subtitle').style.color = '#ffc107';
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      const updateBreakTimer = () => {
        const remaining = t.pauseDurationSec > 0
          ? TournoiUtils.getRemainingSeconds(t.breakStartTime, t.pauseDurationSec)
          : 0;
        $('timer').textContent = remaining > 0 ? TournoiUtils.formatTimer(remaining) : '🔒';
        $('timer').style.color = remaining > 0 ? '#ffc107' : '#dc3545';
      };
      updateBreakTimer();
      timerInterval = setInterval(updateBreakTimer, 1000);
      show('next-round-btn');
      $('end-round-btn').classList.add('hidden');
      $('next-round-btn').textContent = round >= total - 1 ? 'Finaliser' : 'Ronde suivante';
    } else {
      hide('next-round-btn');
      if (lastRoundIndex !== round) {
        lastRoundIndex = round;
      }
      startRoundTimer(t);
    }

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
      if (isBreak) { $('end-round-btn').classList.add('hidden'); }
    } else {
      $('game-card').classList.add('hidden');
      $('end-round-btn').classList.add('hidden');
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
        <span>${p.displayName}</span>
        <span style="font-weight:700;">${p.score.toLocaleString()}</span>
        ${screenshot ? `<img src="${screenshot}" class="pending-screenshot-thumb" data-src="${screenshot}">` : ''}
        <button class="btn-success btn-sm verify-score-btn" data-score-id="${p.gameScoreId}" style="margin-left:auto;">✓</button>
      </div>`;
    }).join('');

    document.querySelectorAll('.verify-score-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await verifyPendingScore(btn.dataset.scoreId);
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

  $('participant-list-setup').innerHTML =
    '<div class="participant-grid">' +
    Object.entries(participants).map(([uid, p]) =>
      `<div class="participant-chip">
        <img src="${p.photoURL || '../assets/default-avatar.png'}" alt="">
        <span>${p.displayName}</span>
        ${p.eliminated ? '<span class="elim-badge">Éliminé</span>' : ''}
      </div>`
    ).join('') +
    '</div>';
}

function renderScoreboard(roundScores) {
  const html = TournoiUtils.renderScoreboardHtml(roundScores, currentParticipants, lastRoundIndex);
  $('scoreboard-entries').innerHTML = html;
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
      html += `<div class="podium-place podium-${idx + 1}">
        <div class="rank-num">${medal}</div>
        <img src="${p.photoURL || '../assets/default-avatar.png'}" alt="">
        <div class="name">${p.name}</div>
        <div class="score">${p.score.toLocaleString()} pts</div>
      </div>`;
    }
    html += '</div>';
  }

  if (results.overallChampion) {
    html += `<p style="text-align:center;color:#ffd700;font-size:1.2rem;">
      🏆 Champion cumulatif: <strong>${results.overallChampion.name}</strong>
      (${results.overallChampion.totalScore.toLocaleString()} pts)
    </p>`;
  }

  if (results.cumulativeScoresTable) {
    html += '<div class="section-title">Classement cumulatif</div>';
    html += '<table class="cumul-table"><thead><tr><th>#</th><th></th><th>Joueur</th><th>Total</th></tr></thead><tbody>';
    results.cumulativeScoresTable.forEach((p, i) => {
      html += `<tr class="${p.eliminated ? 'eliminated-row' : ''}">
        <td>${i + 1}</td>
        <td><img src="${p.photoURL || '../assets/default-avatar.png'}" class="avatar-sm"></td>
        <td>${p.name}</td>
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
      name: p.name,
      photoURL: p.photoURL,
      score: p.totalScore,
    }));

    const champion = list[0] || null;

    return {
      podiumPlayers,
      overallChampion: champion ? { name: champion.name, totalScore: champion.totalScore } : null,
      cumulativeScoresTable: list.map(p => ({
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

async function verifyPendingScore(scoreId) {
  if (!scoreId) { showToast('ID de score manquant'); return; }
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'verifyScore')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'verifyScore');
    await fn({ scoreId, notifyWebhooks: false });
    showToast('Score vérifié ✓');
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
