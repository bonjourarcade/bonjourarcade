const { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, serverTimestamp, limit: fsLimit } = window.Firestore;

let currentUser = null;
let tournamentId = null;
let myUid = null;
let myParticipantData = null;
let isInTournament = false;
let unsubscribeTournament = null;
let unsubscribeParticipants = null;
let unsubscribeRoundScores = null;
let timerInterval = null;
let gamelist = [];

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  tournamentId = params.get('t');

  if (!tournamentId) {
    renderError('Aucun ID de tournoi. Utilise le lien fourni par l\'organisateur.');
    return;
  }

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

function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function setupAuth() {
  const user = window.firebaseAuth.currentUser;

  const proceed = (u) => {
    currentUser = u;
    myUid = u.uid;
    $('user-info').textContent = u.displayName || u.email;
    hide('loading-state');
    show('play-section');
    checkParticipation();
  };

  const redirectToLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('t');
    hide('loading-state');
    if (tId) {
      window.location.href = `/tournoi/join/?t=${tId}`;
    } else {
      window.location.href = '/tournoi/';
    }
  };

  if (user) {
    proceed(user);
    return;
  }

  window.onFirebaseAuthStateChanged((u) => {
    if (u) {
      proceed(u);
    } else {
      redirectToLogin();
    }
  });
}

$('logout-btn').addEventListener('click', () => {
  window.signOutFirebase();
  window.location.reload();
});

$('join-btn').addEventListener('click', joinTournament);
$('view-final-results-btn').addEventListener('click', () => showFinished(tournamentId));

async function checkParticipation() {
  try {
    const tournamentRef = doc(window.firebaseDb, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists) {
      renderError('Tournoi introuvable.');
      return;
    }

    const t = tournamentSnap.data();
    $('play-sharecode').textContent = t.shareCode;

    if (t.status === 'finished') {
      showFinished(tournamentId);
      return;
    }

    const participantRef = doc(window.firebaseDb, 'tournaments', tournamentId, 'participants', myUid);
    const participantSnap = await getDoc(participantRef);

    if (participantSnap.exists) {
      isInTournament = true;
      myParticipantData = participantSnap.data();
      hide('join-phase');
      show('tournament-info');
      listenToTournament(t);
    } else {
      hide('tournament-info');
      show('join-phase');

      const isJoinable = t.status === 'registration' ||
        (t.status === 'active' && t.currentRoundIndex === 0 && !t.breakStartTime);

      $('join-tournament-name').textContent = `Tournoi #${t.shareCode}`;
      const pCount = (await getDocs(collection(tournamentRef, 'participants'))).size;

      let joinStatus = 'Terminé';
      if (isJoinable) joinStatus = '✅ Inscriptions ouvertes';
      else if (t.status === 'active') joinStatus = '🔴 En cours';

      $('join-tournament-info').textContent =
        `${t.gamePool?.length || 0} jeux · ${pCount} participant${pCount > 1 ? 's' : ''} · ${joinStatus}`;

      if (!isJoinable) {
        $('join-btn').disabled = true;
        $('join-btn').style.opacity = '0.5';
      } else {
        $('join-btn').disabled = false;
        $('join-btn').style.opacity = '1';
      }
    }
  } catch (e) {
    renderError('Erreur: ' + e.message);
  }
}

async function joinTournament() {
  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'joinTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'joinTournament');

    const tournamentDoc = await getDoc(doc(window.firebaseDb, 'tournaments', tournamentId));
    const t = tournamentDoc.data();

    await fn({ shareCode: t.shareCode });
    isInTournament = true;
    hide('join-phase');
    show('tournament-info');
    listenToTournament(t);
    showToast('Inscrit au tournoi !');
  } catch (e) {
    showToast('Erreur: ' + (e.message || e));
  }
}

function listenToTournament(initialData) {
  cleanupListeners();

  const tournamentRef = doc(window.firebaseDb, 'tournaments', tournamentId);

  unsubscribeTournament = onSnapshot(tournamentRef, (snap) => {
    if (!snap.exists) return;
    renderTournament(snap.data());
  });

  unsubscribeParticipants = onSnapshot(collection(tournamentRef, 'participants'), (snap) => {
    let me = null;
    const participants = {};
    snap.forEach(d => {
      participants[d.id] = d.data();
      if (d.id === myUid) {
        me = { id: d.id, ...d.data() };
        myParticipantData = d.data();
      }
    });
    renderParticipantsInfo(participants, me);
  });
}

function renderTournament(t) {
  $('play-participant-count').textContent = '...';
  $('play-round-info').textContent = t.currentRoundIndex >= 0 ? `Ronde ${t.currentRoundIndex + 1}/${t.games.length}` : 'Pas commencé';
  $('play-status').textContent = t.status === 'registration' ? 'Inscription' : t.status === 'active' ? 'En cours' : 'Terminé';

  if (t.status === 'registration') {
    hide('round-phase');
    hide('break-phase');
    hide('eliminated-phase');
    show('waiting-phase');
  } else if (t.status === 'active') {
    hide('waiting-phase');
    hide('eliminated-phase');

    const round = t.currentRoundIndex;
    const gameId = t.games[round];
    const isBreak = t.breakStartTime !== null;

    if (myParticipantData?.eliminated) {
      hide('round-phase');
      hide('break-phase');
      show('eliminated-phase');
      $('eliminated-round').textContent = (myParticipantData.eliminatedRound || 0) + 1;
    } else if (isBreak) {
      hide('round-phase');
      show('break-phase');
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      $('round-title').textContent = `Ronde ${round + 1} / ${t.games.length} — Pause`;
      const isLastRound = round >= t.games.length - 1;
      $('view-final-results-btn').classList.toggle('hidden', !isLastRound);
      const updateBreakTimer = () => {
        const remaining = t.pauseDurationSec > 0
          ? TournoiUtils.getRemainingSeconds(t.breakStartTime, t.pauseDurationSec)
          : 0;
        const formatted = remaining > 0 ? TournoiUtils.formatTimer(remaining) : '🔒 Scores fermés';
        $('timer').textContent = formatted;
        $('timer').classList.remove('timer-warning');
        $('break-timer').textContent = formatted;
      };
      updateBreakTimer();
      timerInterval = setInterval(updateBreakTimer, 1000);
    } else {
      hide('break-phase');
      show('round-phase');

      $('round-title').textContent = `Ronde ${round + 1} / ${t.games.length}`;

      if (gameId) {
        const g = gamelist.find(gg => gg.id === gameId);
        $('game-link').innerHTML = `<a href="${TournoiUtils.getGameUrl(gameId)}?t=${tournamentId}&r=${round}" target="_blank">🎮 Jouer à ${g ? g.title : gameId}</a>`;
        const coverImg = $('game-cover');
        const coverLink = $('game-cover-link');
        if (g && g.coverArt) {
          coverImg.src = g.coverArt;
          coverImg.style.display = 'block';
          coverLink.href = `${TournoiUtils.getGameUrl(gameId)}?t=${tournamentId}&r=${round}`;
        } else {
          coverImg.style.display = 'none';
        }
      } else {
        $('game-link').innerHTML = '<span style="color:#aaa;">Tirage du jeu en cours...</span>';
        $('game-cover').style.display = 'none';
      }

      if (timerInterval) clearInterval(timerInterval);
      let warningPlayed = false;
      const updateTimer = () => {
        const remaining = TournoiUtils.getRemainingSeconds(t.roundStartTime, t.roundDurationSec);
        $('timer').textContent = TournoiUtils.formatTimer(remaining);
        if (remaining <= 60 && remaining > 0) {
          $('timer').classList.add('timer-warning');
          if (!warningPlayed) {
            warningPlayed = true;
            playWarningBeep();
          }
        } else if (remaining <= 0) {
          $('timer').classList.add('timer-warning');
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        } else {
          $('timer').classList.remove('timer-warning');
        }
      };
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }

    setupRoundScoresListener(t);

  } else if (t.status === 'finished') {
    showFinished(tournamentId);
  }
}

function renderParticipantsInfo(participants, me) {
  const count = Object.keys(participants).length;
  $('play-participant-count').textContent = `${count}`;

  if (me && !me.eliminated) {
    show('my-score-card');
    const myScore = me.scores?.length > 0 ? Math.max(...me.scores.filter(s => s > 0)) : 0;
    $('my-score').textContent = myScore > 0 ? myScore.toLocaleString() : 'Pas encore de score';
    const badge = $('my-status-badge');
    if (myScore > 0) {
      badge.textContent = '✅ Score soumis';
      badge.className = 'status-badge done';
    } else {
      badge.textContent = '⏳ En attente';
      badge.className = 'status-badge waiting';
    }
  } else if (me?.eliminated) {
    hide('my-score-card');
  } else {
    hide('my-score-card');
  }

  const ranked = Object.entries(participants)
    .map(([uid, p]) => ({
      uid,
      name: p.displayName,
      photoURL: p.photoURL,
      totalScore: (p.scores || []).reduce((s, v) => s + v, 0),
      eliminated: p.eliminated,
      eliminatedRound: p.eliminatedRound,
    }))
    .sort((a, b) => {
      const roundA = a.eliminated ? a.eliminatedRound : Infinity;
      const roundB = b.eliminated ? b.eliminatedRound : Infinity;
      if (roundB !== roundA) return roundB - roundA;
      return b.totalScore - a.totalScore;
    });

  let html = '<table class="cumul-table"><thead><tr><th>#</th><th></th><th>Joueur</th><th>Total</th></tr></thead><tbody>';
  ranked.forEach((p, i) => {
    const isMe = p.uid === myUid;
    html += `<tr class="${p.eliminated ? 'eliminated-row' : ''} ${isMe ? 'highlight-row' : ''}">
      <td>${i + 1}</td>
      <td><img src="${p.photoURL || '../assets/default-avatar.png'}" class="avatar-sm"></td>
      <td>${p.name}${isMe ? ' ⬅️' : ''}</td>
      <td>${p.totalScore.toLocaleString()}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  $('cumulative-entries').innerHTML = html;
}

function setupRoundScoresListener(t) {
  if (unsubscribeRoundScores) { unsubscribeRoundScores(); }

  const round = t.currentRoundIndex;
  if (round < 0) return;

  const db = window.firebaseDb;
  const q = query(collection(db, 'tournaments', tournamentId, 'roundScores'),
    where('roundIndex', '==', round),
    where('verified', '==', true),
    orderBy('score', 'desc'));
  unsubscribeRoundScores = onSnapshot(q, (snap) => {
    const scores = [];
    snap.forEach(d => scores.push({ id: d.id, ...d.data() }));
    renderScoreboard(scores, round, t.cutoffs);
  });
}

function renderScoreboard(roundScores, currentRoundIndex, cutoffs) {
  const tournamentRef = doc(window.firebaseDb, 'tournaments', tournamentId);
  getDocs(collection(tournamentRef, 'participants')).then(snap => {
    const participants = {};
    snap.forEach(d => { participants[d.id] = d.data(); });

    const cutoff = cutoffs ? cutoffs[currentRoundIndex] : 0;
    const scoresMap = {};
    roundScores.forEach(rs => { scoresMap[rs.userId] = rs.score; });

    const ranked = Object.entries(participants)
      .map(([uid, p]) => ({
        uid,
        name: p.displayName,
        photoURL: p.photoURL,
        score: scoresMap[uid] || 0,
        eliminated: p.eliminated,
      }))
      .sort((a, b) => b.score - a.score);

    const active = ranked.filter(p => !p.eliminated);
    const eliminated = ranked.filter(p => p.eliminated);

    let html = '';
    if (active.length > 0) {
      active.forEach((p, i) => {
        const isMe = p.uid === myUid;
        const isDanger = currentRoundIndex > 0 && cutoff > 0 && i >= cutoff;
        const statusClass = isDanger ? 'danger' : 'safe';
        const avatar = p.photoURL || '../assets/default-avatar.png';
        html += `<div class="entry ${statusClass} ${isMe ? 'me' : ''}">
          <span class="rank">${i + 1}.</span>
          <img src="${avatar}" class="avatar">
          <span class="name">${p.name}${isMe ? '<span class="my-badge">MOI</span>' : ''}</span>
          <span class="score">${p.score.toLocaleString()}</span>
        </div>`;
      });
    }

    if (eliminated.length > 0) {
      html += '<div class="section-title eliminated-title">Éliminés</div>';
      eliminated.forEach((p, i) => {
        const isMe = p.uid === myUid;
        const avatar = p.photoURL || '../assets/default-avatar.png';
        html += `<div class="entry eliminated ${isMe ? 'me' : ''}">
          <span class="rank">${active.length + i + 1}.</span>
          <img src="${avatar}" class="avatar">
          <span class="name">${p.name}${isMe ? '<span class="my-badge">MOI</span>' : ''}</span>
          <span class="score">${p.score.toLocaleString()}</span>
        </div>`;
      });
    }

    if (!html) html = '<div style="color:#aaa;text-align:center;padding:20px;">Aucun score pour cette ronde</div>';
    $('scoreboard-entries').innerHTML = html;

    const leader = active.find(p => p.score > 0);
    if (leader) {
      show('round-leader');
      $('leader-name').textContent = leader.name || 'Inconnu';
      $('leader-score').textContent = leader.score.toLocaleString();
      $('leader-avatar').src = leader.photoURL || '../assets/default-avatar.png';
    } else {
      hide('round-leader');
    }
  });
}

async function showFinished(id) {
  hide('tournament-info');
  show('finished-phase');

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
    console.warn('finalizeTournament CF failed, falling back to client-side results:', e);
  }

  if (!results || !results.cumulativeScoresTable) {
    results = await buildResultsFromFirestore(id);
    if (!results) {
      console.error('buildResultsFromFirestore also failed. CF error:', lastError);
    }
  }

  renderFinishedResults(results);
}

async function buildResultsFromFirestore(id) {
  try {
    const db = window.firebaseDb;
    if (!db) { console.error('Firebase DB not available'); return null; }
    if (!id) { console.error('No tournament ID provided'); return null; }

    const tSnap = await getDoc(doc(db, 'tournaments', id));
    if (!tSnap.exists) { console.error('Tournament doc not found:', id); return null; }

    const pSnap = await getDocs(collection(db, 'tournaments', id, 'participants'));
    const participants = [];
    pSnap.forEach(d => {
      const pd = d.data();
      const totalScore = (pd.scores || []).reduce((s, v) => s + v, 0);
      participants.push({
        uid: d.id,
        name: pd.displayName || 'Anonyme',
        photoURL: pd.photoURL || '',
        totalScore,
        scores: pd.scores || [],
        eliminated: pd.eliminated || false,
        eliminatedRound: pd.eliminatedRound,
      });
    });

    participants.sort((a, b) => {
      const roundA = a.eliminated ? a.eliminatedRound : Infinity;
      const roundB = b.eliminated ? b.eliminatedRound : Infinity;
      if (roundB !== roundA) return roundB - roundA;
      return b.totalScore - a.totalScore;
    });

    const podiumPlayers = participants.slice(0, 3).map(p => ({
      name: p.name,
      photoURL: p.photoURL,
      score: p.totalScore,
    }));

    return {
      podiumPlayers,
      cumulativeScoresTable: participants.map(p => ({
        name: p.name,
        photoURL: p.photoURL,
        totalScore: p.totalScore,
        eliminated: p.eliminated,
      })),
    };
  } catch (e) {
    console.error('buildResultsFromFirestore failed:', e);
    return null;
  }
}

function renderFinishedResults(results) {
  if (!results || !results.cumulativeScoresTable) {
    $('play-results').innerHTML = '<p style="color:#dc3545;">Erreur de chargement des résultats. Vérifie la console pour les détails.</p>';
    return;
  }

  let html = '';

  if (results.podiumPlayers && results.podiumPlayers.length > 0) {
    html += '<div class="podium">';
    const order = [2, 0, 1];
    for (const idx of order) {
      const p = results.podiumPlayers[idx];
      if (!p) continue;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      html += `<div class="podium-place podium-${idx + 1}">
        <div class="rank-num">${medal}</div>
        <img src="${p.photoURL || '../assets/default-avatar.png'}">
        <div class="name">${p.name}</div>
        <div class="score">${p.score.toLocaleString()} pts</div>
      </div>`;
    }
    html += '</div>';
  }

  if (results.cumulativeScoresTable) {
    html += '<div style="margin-top:20px;">';
    html += '<div class="section-title">Classement final</div>';
    html += '<table class="cumul-table"><thead><tr><th>#</th><th></th><th>Joueur</th><th>Total</th></tr></thead><tbody>';
    results.cumulativeScoresTable.forEach((p, i) => {
      const isMe = p.name === (currentUser?.displayName || '');
      html += `<tr class="${p.eliminated ? 'eliminated-row' : ''} ${isMe ? 'highlight-row' : ''}">
        <td>${i + 1}</td>
        <td><img src="${p.photoURL || '../assets/default-avatar.png'}" class="avatar-sm"></td>
        <td>${p.name}</td>
        <td>${p.totalScore.toLocaleString()}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  $('play-results').innerHTML = html;
}

function playWarningBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) { /* audio not supported */ }
}

function cleanupListeners() {
  if (unsubscribeTournament) { unsubscribeTournament(); unsubscribeTournament = null; }
  if (unsubscribeParticipants) { unsubscribeParticipants(); unsubscribeParticipants = null; }
  if (unsubscribeRoundScores) { unsubscribeRoundScores(); unsubscribeRoundScores = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function renderError(msg) {
  document.querySelector('.container').innerHTML =
    `<div class="card card-center"><h1>😕</h1><p style="color:#dc3545;">${msg}</p></div>`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:8px;z-index:2000;font-size:0.9rem;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
