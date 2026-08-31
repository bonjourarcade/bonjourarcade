const { collection, onSnapshot, doc, getDoc, getDocs, serverTimestamp, limit: fsLimit } = window.Firestore;

let currentUser = null;
let tournamentId = null;
let myUid = null;
let displayNameCache = {};
let myParticipantData = null;
let currentParticipants = {};
let currentRoundScores = [];
let allRoundScores = [];
let currentRoundIndex = -1;
let currentTotalRounds = 0;
let isInTournament = false;
let currentTournamentType = 'elimination';
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
    window.checkFirebaseTournamentHostAccess().then(isAdmin => {
      if (!isAdmin) return;
      const btn = $('host-view-btn');
      btn.href = `/tournoi/host/?t=${tournamentId}`;
      btn.classList.remove('hidden');
    }).catch(() => {});
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

$('join-btn').addEventListener('click', joinTournament);

async function checkParticipation() {
  try {
    const tournamentRef = doc(window.firebaseDb, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
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

    if (participantSnap.exists()) {
      isInTournament = true;
      myParticipantData = participantSnap.data();
      hide('join-phase');
      show('tournament-info');
      listenToTournament(t);
    } else {
      hide('tournament-info');
      show('join-phase');

      const isJoinable = TournoiUtils.isJoinable(t);

      $('join-tournament-name').textContent = `Tournoi #${t.shareCode}`;
      const pCount = t.participantCount ?? (await getDocs(collection(tournamentRef, 'participants'))).size;

      let joinStatus = 'Terminé';
      if (isJoinable) joinStatus = '✅ Inscriptions ouvertes';
      else if (t.status === 'active') joinStatus = '🔴 En cours';

      $('join-tournament-info').innerHTML =
        `${t.gamePool?.length || 0} jeux · ${pCount} participant${pCount > 1 ? 's' : ''} · ${joinStatus}` +
        (t.stakes ? `<br><span class="accent-text">🎁 ${t.stakes}</span>` : '');

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
    if (!snap.exists()) return;
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
    renderCombinedTable(participants, me, allRoundScores, currentRoundIndex, currentTotalRounds);
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
          renderCombinedTable(participants, me, allRoundScores, currentRoundIndex, currentTotalRounds);
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

  const isPercentage = (t.type === 'percentage');

  let html = isPercentage
    ? `<div style="font-size:0.9rem;color:var(--muted);line-height:1.6;">
      📊 Chaque score est converti en <strong>%</strong> de ce que tous les joueurs ont marqué dans cette ronde.<br>
      🏆 Le classement se fait sur la <strong>plus grande somme de %</strong> accumulés sur toutes les rondes — personne n'est éliminé.<br>
      🔓 Vous pouvez rejoindre le tournoi à tout moment, même en cours de route.
    </div>`
    : `<div style="font-size:0.9rem;color:var(--muted);line-height:1.6;">
      ⚔️ À chaque round, les joueurs avec les plus faibles scores sont éliminés.<br>
      📊 Chaque score est converti en <strong>%</strong> de ce que tous les joueurs ont marqué dans cette ronde.<br>
      🏆 Le gagnant est celui avec la <strong>plus grande somme de %</strong> sur toutes les rondes.
    </div>`;

  if (t.stakes) {
    html += `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:0.9rem;line-height:1.6;">
      <div class="accent-text" style="font-weight:600;margin-bottom:4px;display:inline-block;">🎁 Qu'est-ce qu'on gagne?</div>
      <span style="color:var(--text);">${t.stakes}</span>
    </div>`;
  }

  formatContent.innerHTML = html;
  formatCard.classList.remove('hidden');
}

function renderTournament(t) {
  currentTournamentType = t.type === 'percentage' ? 'percentage' : 'elimination';
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
        const announcementEl = $('game-announcement');
        const announcement = g && String(g.announcement_message || '').trim();
        if (announcement) {
          announcementEl.textContent = announcement;
          announcementEl.classList.remove('hidden');
        } else {
          announcementEl.classList.add('hidden');
        }
      } else {
        $('game-link').innerHTML = '<span style="color:#aaa;">Tirage du jeu en cours...</span>';
        $('game-cover').style.display = 'none';
        $('game-announcement').classList.add('hidden');
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

function renderCombinedTable(participants, me, allScores, roundIdx, totalRounds) {
  const count = Object.keys(participants).length;
  $('play-participant-count').textContent = `${count}`;

  // Best entry per round (and per user) from roundScores, across all rounds
  const bestEntryByRound = {};
  (allScores || []).forEach(rs => {
    if (rs.roundIndex == null) return;
    const bucket = bestEntryByRound[rs.roundIndex] || (bestEntryByRound[rs.roundIndex] = {});
    const prev = bucket[rs.userId];
    if (!prev || rs.score > prev.score || (rs.score === prev.score && rs.verified && !prev.verified)) {
      bucket[rs.userId] = { score: rs.score, gameScoreId: rs.gameScoreId, verified: rs.verified, screenshotUrl: rs.screenshotUrl, comment: rs.comment };
    }
  });
  const roundScores = (allScores || []).filter(rs => rs.roundIndex === roundIdx);
  const bestEntry = bestEntryByRound[roundIdx] || {};

  // Build combined rows
  const rows = Object.entries(participants).map(([uid, p]) => {
    const scores = [...(p.scores || [])];
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

  // Enrich with percentages
  const scoredRows = TournoiUtils.computePercentages(rows, totalRounds);

  const activeCount = scoredRows.filter(r => !r.eliminated).length;
  const cutoff = currentTournamentType === 'percentage' ? 0 :
    (TournoiUtils.computeRoundCutoff(activeCount, roundIdx, totalRounds) || 0);
  const rankBy = currentTournamentType === 'percentage' ? 'totalPct' : 'survival';

  $('scoreboard-entries').innerHTML = TournoiUtils.renderCombinedTableHtml(scoredRows, totalRounds, {
    roundIdx, highlightUid: myUid, cutoff, bestEntryByRound, rankBy,
  });

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
  const q = collection(db, 'tournaments', tournamentId, 'roundScores');
  unsubscribeRoundScores = onSnapshot(q, (snap) => {
    const scores = [];
    snap.forEach(d => scores.push({ id: d.id, ...d.data() }));
    allRoundScores = scores;
    currentRoundScores = scores.filter(s => s.roundIndex === round).sort((a, b) => b.score - a.score);
    renderCombinedTable(currentParticipants, null, allRoundScores, round, currentTotalRounds);
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
    if (!tSnap.exists()) { console.error('Tournament doc not found:', id); return null; }

    const totalRounds = (tSnap.data().games || []).length;

    const pSnap = await getDocs(collection(db, 'tournaments', id, 'participants'));
    const participants = [];
    pSnap.forEach(d => {
      const pd = d.data();
      const hasUnverified = (pd.scores || []).some((s, i) => s > 0 && !(pd.scoresVerified || [])[i]);
      participants.push({
        uid: d.id,
        name: pd.displayName || 'Anonyme',
        photoURL: pd.photoURL || '',
        hasUnverified,
        scores: pd.scores || [],
        eliminated: pd.eliminated || false,
        eliminatedRound: pd.eliminatedRound,
      });
    });

    const tournamentType = tSnap.data().type === 'percentage' ? 'percentage' : 'elimination';
    const scored = TournoiUtils.computePercentages(participants, totalRounds);
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

    const podiumPlayers = scored.slice(0, 3).map(p => ({
      name: p.name,
      photoURL: p.photoURL,
      totalPct: p.totalPct,
      totalScoreRaw: p.totalScoreRaw,
    }));

    return {
      type: tournamentType,
      podiumPlayers,
      totalRounds,
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
    const order = [1, 0, 2];
    for (const idx of order) {
      const p = results.podiumPlayers[idx];
      if (!p) continue;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      html += `<div class="podium-place podium-${idx + 1}">
        <div class="rank-num">${medal}</div>
        <img src="${p.photoURL || '../assets/default-avatar.png'}">
        <div class="name">${p.name}</div>
        <div class="score"><span class="num">${p.totalPct.toFixed(1)}%</span> <span class="dim">(${p.totalScoreRaw.toLocaleString()} pts)</span></div>
      </div>`;
    }
    html += '</div>';
  }

  if (results.cumulativeScoresTable) {
    html += '<div style="margin-top:20px;">';
    html += '<div class="section-title">Classement final</div>';
    const rankBy = results.type === 'percentage' ? 'totalPct' : 'survival';
    html += TournoiUtils.renderCombinedTableHtml(results.cumulativeScoresTable, results.totalRounds, { highlightUid: myUid, rankBy });
    html += '</div>';
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
