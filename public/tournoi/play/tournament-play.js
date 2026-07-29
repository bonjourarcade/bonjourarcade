const { collection, query, where, onSnapshot, doc, getDoc, getDocs, serverTimestamp, limit: fsLimit } = window.Firestore;

let currentUser = null;
let tournamentId = null;
let myUid = null;
let displayNameCache = {};
let myParticipantData = null;
let currentParticipants = {};
let currentRoundScores = [];
let currentRoundIndex = -1;
let currentTotalRounds = 0;
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

async function checkParticipation() {
  try {
    const tournamentRef = doc(window.firebaseDb, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists) {
      renderError('Tournoi introuvable.');
      return;
    }

    const t = tournamentSnap.data();
    $('tournament-title').textContent = t.name || `🎮 Tournoi`;
    const descEl = $('play-description');
    if (t.description) { descEl.textContent = t.description; descEl.classList.remove('hidden'); }
    else { descEl.classList.add('hidden'); }
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
        (t.status === 'active' && t.currentRoundIndex === 0);

      $('join-tournament-name').textContent = `Tournoi #${t.shareCode}`;
      const pCount = t.participantCount ?? (await getDocs(collection(tournamentRef, 'participants'))).size;

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
    const newUids = [];
    snap.forEach(d => {
      participants[d.id] = d.data();
      if (d.id === myUid) {
        me = { id: d.id, ...d.data() };
        myParticipantData = d.data();
      }
      if (!(d.id in displayNameCache)) newUids.push(d.id);
    });
    for (const uid of Object.keys(participants)) {
      if (displayNameCache[uid]) {
        participants[uid].displayName = displayNameCache[uid];
      }
    }
    currentParticipants = participants;
    renderCombinedTable(participants, me, currentRoundScores, currentRoundIndex, currentTotalRounds);
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
            if (p.photoURL && participants[p.uid]?.photoURL !== p.photoURL) {
              participants[p.uid].photoURL = p.photoURL;
              changed = true;
            }
          }
        });
        if (changed) {
          for (const uid of Object.keys(participants)) {
            if (displayNameCache[uid]) {
              participants[uid].displayName = displayNameCache[uid];
              if (uid === myUid && me) me.displayName = displayNameCache[uid];
            }
          }
          currentParticipants = participants;
          renderCombinedTable(participants, me, currentRoundScores, currentRoundIndex, currentTotalRounds);
        }
      }).catch(e => console.error('Error fetching profiles:', e));
    }
  });
}

function renderFormatInfo(t) {
  const formatCard = $('format-card');
  const formatContent = $('format-content');

  if (!t.games || t.games.length === 0) {
    formatCard.classList.add('hidden');
    return;
  }

  formatContent.innerHTML = `<div style="font-size:0.9rem;color:var(--muted);line-height:1.6;">
    ⚔️ À chaque round, les joueurs avec les plus faibles scores sont éliminés.<br>
    🏆 Le gagnant est le dernier survivant avec le score cumulatif le plus élevé.
  </div>`;

  formatCard.classList.remove('hidden');
}

function renderTournament(t) {
  $('play-participant-count').textContent = '...';
  $('play-round-info').textContent = t.currentRoundIndex >= 0 ? `Ronde ${t.currentRoundIndex + 1}/${t.games.length}` : 'Pas commencé';
  $('play-status').textContent = t.status === 'registration' ? 'Inscription' : t.status === 'active' ? 'En cours' : 'Terminé';
  renderFormatInfo(t);

  if (t.status === 'registration') {
    hide('eliminated-phase');
    show('waiting-phase');
  } else if (t.status === 'active') {
    hide('waiting-phase');
    hide('eliminated-phase');

    const round = t.currentRoundIndex;
    const gameId = t.games[round];

    if (myParticipantData?.eliminated) {
      show('eliminated-phase');
      $('eliminated-round').textContent = (myParticipantData.eliminatedRound || 0) + 1;
      clearInterval(timerInterval); timerInterval = null;
    } else {
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

      const upcomingGameIds = t.games.slice(round + 1);
      const upcomingContainer = $('upcoming-games');
      if (upcomingGameIds.length > 0) {
        upcomingContainer.classList.remove('hidden');
        upcomingContainer.innerHTML = upcomingGameIds.map((gid, i) => {
          const g = gamelist.find(gg => gg.id === gid);
          const title = g ? g.title : gid;
          const label = `Ronde ${round + i + 2}`;
          return `<div class="upcoming-game">
            <div class="upcoming-img-wrap">
              <img src="/games/${gid}/cover.png" alt="" loading="lazy" draggable="false" onerror="this.style.display='none'">
              <div class="upcoming-label">${label}</div>
            </div>
          </div>`;
        }).join('');
      } else {
        upcomingContainer.classList.add('hidden');
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

function renderCombinedTable(participants, me, roundScores, roundIdx, totalRounds) {
  const count = Object.keys(participants).length;
  $('play-participant-count').textContent = `${count}`;

  // Best entry for current round from roundScores
  const bestEntry = {};
  (roundScores || []).forEach(rs => {
    const prev = bestEntry[rs.userId];
    if (!prev || rs.score > prev.score || (rs.score === prev.score && rs.verified && !prev.verified)) {
      bestEntry[rs.userId] = { score: rs.score, gameScoreId: rs.gameScoreId, verified: rs.verified, screenshotUrl: rs.screenshotUrl, comment: rs.comment };
    }
  });

  // Build combined rows
  const rows = Object.entries(participants).map(([uid, p]) => {
    const scores = [...(p.scores || [])];
    // Override current round score with best entry from roundScores
    if (bestEntry[uid] && bestEntry[uid].score > (scores[roundIdx] || 0)) {
      scores[roundIdx] = bestEntry[uid].score;
    }
    return {
      uid,
      name: p.displayName,
      photoURL: p.photoURL,
      scores,
      total: scores.reduce((s, v) => s + v, 0),
      eliminated: p.eliminated,
      eliminatedRound: p.eliminatedRound,
      gameScoreId: bestEntry[uid]?.gameScoreId || null,
      hasUnverified: (p.scores || []).some((s, i) => s > 0 && !(p.scoresVerified || [])[i]),
    };
  });

  // Add roundScores-only users not yet in participants
  (roundScores || []).forEach(rs => {
    if (!rows.find(r => r.uid === rs.userId)) {
      const scores = new Array(totalRounds).fill(0);
      scores[roundIdx] = rs.score;
      rows.push({
        uid: rs.userId,
        name: rs.displayName || 'Anonyme',
        photoURL: rs.photoURL || '',
        scores,
        total: rs.score,
        eliminated: false,
        eliminatedRound: null,
        gameScoreId: rs.gameScoreId || null,
        hasUnverified: !rs.verified,
      });
    }
  });

  // Sort: non-eliminated first (by current round score DESC), then eliminated
  rows.sort((a, b) => {
    const aElim = a.eliminated ? (a.eliminatedRound ?? -1) : Infinity;
    const bElim = b.eliminated ? (b.eliminatedRound ?? -1) : Infinity;
    if (bElim !== aElim) return bElim - aElim;
    const aCurrent = bestEntry[a.uid]?.score || a.scores[roundIdx] || 0;
    const bCurrent = bestEntry[b.uid]?.score || b.scores[roundIdx] || 0;
    return bCurrent - aCurrent;
  });

  // Compute cutoff for danger
  const activeCount = rows.filter(r => !r.eliminated).length;
  const cutoff = TournoiUtils.computeRoundCutoff(activeCount, roundIdx, totalRounds) || 0;

  // Build table
  let html = '<table class="combined-table"><thead><tr><th>#</th><th>Joueur</th>';
  for (let r = 0; r < totalRounds; r++) {
    html += `<th>R${r + 1}</th>`;
  }
  html += '<th>Total</th></tr></thead><tbody>';

  rows.forEach((r, i) => {
    const isMe = r.uid === myUid;
    const isActive = !r.eliminated;
    const isDanger = isActive && cutoff > 0 && i >= cutoff;

    let rowClass = '';
    if (r.eliminated) rowClass = 'eliminated-row';
    else if (isDanger) rowClass = 'danger-row';
    if (isMe) rowClass += ' me-row';

    html += `<tr class="${rowClass}">`;
    html += `<td class="rank-cell">${i + 1}</td>`;
            html += `<td class="player-cell"><a href="/profil/?uid=${r.uid}" style="color:inherit;text-decoration:none;">${r.name}</a>${isDanger ? ' <span class="at-risk" title="Ce joueur est en danger d&#39;élimination">⚠️</span>' : ''}</td>`;

    for (let rr = 0; rr < totalRounds; rr++) {
      const score = r.scores[rr];
      if (score > 0) {
        let gsAttr = '';
        let addClass = '';
        if (rr === roundIdx && bestEntry[r.uid]?.gameScoreId) {
          gsAttr = ` data-game-score-id="${bestEntry[r.uid].gameScoreId}"`;
          addClass = ' has-proof';
        }
        html += `<td class="score-cell${addClass}"${gsAttr}>${score.toLocaleString()}</td>`;
      } else if (rr < roundIdx) {
        html += `<td class="score-cell zero">0</td>`;
      } else if (rr === roundIdx) {
        html += `<td class="score-cell zero">—</td>`;
      } else {
        html += `<td class="score-cell future"></td>`;
      }
    }

    html += `<td class="total-cell">${r.total.toLocaleString()}${r.hasUnverified ? ' <span class="pending-badge" title="En attente de validation">⏳</span>' : ''}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  $('scoreboard-entries').innerHTML = html;

  // Enrich
  TournoiUtils.enrichScoreboardEntries('scoreboard-entries');
}

function setupRoundScoresListener(t) {
  if (unsubscribeRoundScores) { unsubscribeRoundScores(); }

  const round = t.currentRoundIndex;
  if (round < 0) return;

  currentRoundIndex = round;
  currentTotalRounds = t.games?.length || 0;

  const db = window.firebaseDb;
  const q = query(collection(db, 'tournaments', tournamentId, 'roundScores'),
    where('roundIndex', '==', round));
  unsubscribeRoundScores = onSnapshot(q, (snap) => {
    const scores = [];
    snap.forEach(d => scores.push({ id: d.id, ...d.data() }));
    scores.sort((a, b) => b.score - a.score);
    currentRoundScores = scores;
    renderCombinedTable(currentParticipants, null, scores, round, currentTotalRounds);
  }, (err) => console.error('roundScores snapshot error:', err));
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
      const hasUnverified = (pd.scores || []).some((s, i) => s > 0 && !(pd.scoresVerified || [])[i]);
      participants.push({
        uid: d.id,
        name: pd.displayName || 'Anonyme',
        photoURL: pd.photoURL || '',
        totalScore,
        hasUnverified,
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

    // Resolve photoURL for each participant via getPublicProfile
    try {
      const profiles = await Promise.all(
        participants.map(p =>
          TournoiUtils.callFunction('getPublicProfile', {userId: p.uid})
            .then(prof => ({ uid: p.uid, photoURL: prof.photoURL }))
            .catch(() => null)
        )
      );
      profiles.forEach(prof => {
        if (prof?.photoURL) {
          const p = participants.find(pp => pp.uid === prof.uid);
          if (p) p.photoURL = prof.photoURL;
        }
      });
    } catch (e) { /* non-critical */ }

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
        hasUnverified: p.hasUnverified,
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
          <td>${p.totalScore.toLocaleString()}${p.hasUnverified ? ' <span class="pending-badge" title="Certains scores sont en attente de validation">⏳</span>' : ''}</td>
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
