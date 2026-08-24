const TournoiUtils = {
  formatTimer(seconds) {
    if (seconds < 0) seconds = 0;
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}j ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  getRemainingSeconds(roundStartTime, durationSec) {
    if (!roundStartTime) return 0;
    let start;
    if (roundStartTime.toMillis) start = roundStartTime.toMillis();
    else if (roundStartTime.seconds != null || roundStartTime._seconds != null) {
      const sec = roundStartTime.seconds != null ? roundStartTime.seconds : roundStartTime._seconds;
      const nano = roundStartTime.nanoseconds != null ? roundStartTime.nanoseconds : roundStartTime._nanoseconds;
      start = sec * 1000 + (nano || 0) / 1e6;
    } else start = new Date(roundStartTime).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return Math.max(0, durationSec - elapsed);
  },

  async callFunction(name, data) {
    const fn = window.httpsCallable(window.firebaseFunctions, name);
    const result = await fn(data);
    return result.data;
  },

  // Mirrors isJoinable() in the Cloud Functions backend (tournaments/utils.ts) — keep both in sync.
  isJoinable(tournament) {
    if (tournament.status === 'registration') return true;
    if (tournament.status !== 'active') return false;
    if (tournament.type === 'percentage') return true;
    if (tournament.currentRoundIndex !== 0) return false;
    return TournoiUtils.getRemainingSeconds(tournament.roundStartTime, tournament.roundDurationSec) > 0;
  },

  computeRoundCutoff(remainingPlayers, currentRound, totalRounds) {
    if (!totalRounds || currentRound >= totalRounds - 1) return null;
    const roundsLeft = totalRounds - currentRound;
    if (remainingPlayers <= roundsLeft) return remainingPlayers;
    const isPenultimate = currentRound === totalRounds - 2;
    const minFinal = isPenultimate && remainingPlayers > 3 ? 3 : 1;
    return Math.min(remainingPlayers, Math.max(minFinal, Math.ceil(remainingPlayers * (roundsLeft - 1) / roundsLeft)));
  },

  computePercentages(participants, totalRounds) {
    const roundTotals = Array(totalRounds).fill(0);
    participants.forEach(p => {
      for (let r = 0; r < totalRounds; r++) {
        roundTotals[r] += (p.scores?.[r] || 0);
      }
    });

    return participants.map(p => {
      const pctScores = Array(totalRounds).fill(0);
      let totalPct = 0;
      let totalScoreRaw = 0;
      for (let r = 0; r < totalRounds; r++) {
        const score = p.scores?.[r] || 0;
        totalScoreRaw += score;
        const pct = roundTotals[r] > 0 ? (score / roundTotals[r]) * 100 : 0;
        pctScores[r] = pct;
        totalPct += pct;
      }
      return { ...p, pctScores, totalPct, totalScoreRaw, roundTotals };
    });
  },

  getGameUrl(gameId) {
    return `/b/${gameId}`;
  },

  // Renders the combined per-round scoreboard/results table (columns: #, Joueur, R1..Rn, Total %).
  // Used both for the live in-progress round view (pass roundIdx) and the finished-results view
  // (omit roundIdx — every non-eliminated player is treated as having reached the last round).
  //
  // Ranking (opts.rankBy, default 'survival'):
  //  - 'survival': players who went further (higher eliminatedRound, or still active) rank above
  //    those eliminated earlier. Players eliminated in the same round are tied-broken by their
  //    score in that specific round. This matches an 'elimination'-type tournament.
  //  - 'totalPct': ranked purely by cumulative percentage across all rounds, ignoring elimination
  //    status. Use this for 'percentage'-type tournaments, where nobody is ever eliminated and the
  //    accumulated % across rounds is what decides the standings.
  renderCombinedTableHtml(rows, totalRounds, opts = {}) {
    const { roundIdx = null, highlightUid = null, cutoff = 0, bestEntryByRound = {}, rankBy = 'survival' } = opts;
    const referenceRound = roundIdx != null ? roundIdx : totalRounds - 1;

    const sorted = [...rows].sort((a, b) => {
      if (rankBy === 'totalPct') return (b.totalPct || 0) - (a.totalPct || 0);
      const aRound = a.eliminated ? (a.eliminatedRound ?? -1) : referenceRound;
      const bRound = b.eliminated ? (b.eliminatedRound ?? -1) : referenceRound;
      if (bRound !== aRound) return bRound - aRound;
      const aScore = bestEntryByRound[aRound]?.[a.uid]?.score ?? a.scores?.[aRound] ?? 0;
      const bScore = bestEntryByRound[bRound]?.[b.uid]?.score ?? b.scores?.[bRound] ?? 0;
      return bScore - aScore;
    });

    let html = '<table class="combined-table"><thead><tr><th>#</th><th>Joueur</th>';
    for (let r = 0; r < totalRounds; r++) {
      html += `<th>R${r + 1}</th>`;
    }
    html += '<th>Total %</th></tr></thead><tbody>';

    sorted.forEach((r, i) => {
      const isMe = highlightUid && r.uid === highlightUid;
      const isActive = !r.eliminated;
      const isDanger = roundIdx != null && isActive && cutoff > 0 && i >= cutoff;

      let rowClass = '';
      if (r.eliminated) rowClass = 'eliminated-row';
      else if (isDanger) rowClass = 'danger-row';
      if (isMe) rowClass += ' me-row';

      const nameCell = r.uid
        ? `<a href="/profil/?uid=${r.uid}" style="color:inherit;text-decoration:none;">${r.name}</a>`
        : r.name;

      html += `<tr class="${rowClass}">`;
      html += `<td class="rank-cell">${i + 1}</td>`;
      html += `<td class="player-cell">${nameCell}${isDanger ? ' <span class="at-risk" title="Ce joueur est en danger d&#39;élimination">⚠️</span>' : ''}</td>`;

      for (let rr = 0; rr < totalRounds; rr++) {
        const score = r.scores?.[rr] || 0;
        if (score > 0) {
          let gsAttr = '';
          let addClass = '';
          const roundEntry = bestEntryByRound[rr]?.[r.uid];
          if (roundEntry?.gameScoreId) {
            gsAttr = ` data-game-score-id="${roundEntry.gameScoreId}"`;
            addClass = ' has-proof';
          }
          const pct = r.pctScores ? r.pctScores[rr] : 0;
          html += `<td class="score-cell${addClass}"${gsAttr}><span class="num">${score.toLocaleString()}</span><span class="dim">(${pct.toFixed(1)}%)</span></td>`;
        } else if (roundIdx == null || rr < roundIdx) {
          html += `<td class="score-cell zero"><span class="num">0</span><span class="dim">(0%)</span></td>`;
        } else if (rr === roundIdx) {
          html += `<td class="score-cell zero">—</td>`;
        } else {
          html += `<td class="score-cell future"></td>`;
        }
      }

      html += `<td class="total-cell"><span class="num">${(r.totalPct || 0).toFixed(1)}%</span> <span class="dim">(${(r.totalScoreRaw || 0).toLocaleString()})</span>${r.hasUnverified ? ' <span class="pending-badge" title="En attente de validation">⏳</span>' : ''}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  },

  renderScoreboardHtml(roundScores, participants, currentRoundIndex, cutoffs, totalRounds, tournamentType = 'elimination') {
    const bestEntryMap = {};
    roundScores.forEach(rs => {
      if (!bestEntryMap[rs.userId] || rs.score > bestEntryMap[rs.userId].score) {
        bestEntryMap[rs.userId] = { score: rs.score, gameScoreId: rs.gameScoreId };
      }
    });

    const ranked = Object.entries(participants)
      .map(([uid, p]) => ({
        uid,
        name: p.displayName,
        photoURL: p.photoURL,
        score: bestEntryMap[uid]?.score || 0,
        gameScoreId: bestEntryMap[uid]?.gameScoreId || null,
        eliminated: p.eliminated,
      }))
      .sort((a, b) => b.score - a.score);

    const hasScore = ranked.some(p => p.score > 0);
    if (!hasScore) {
      return '<div style="color:#aaa;text-align:center;padding:20px;">Aucun score pour cette ronde</div>';
    }

    const isLastRound = totalRounds && currentRoundIndex >= totalRounds - 1;
    const active = ranked.filter(p => !p.eliminated);
    const eliminated = ranked.filter(p => p.eliminated);

    const storedCutoff = (cutoffs && typeof cutoffs[currentRoundIndex] === 'number') ? cutoffs[currentRoundIndex] : null;
    const computedCutoff = TournoiUtils.computeRoundCutoff(active.length, currentRoundIndex, totalRounds);
    const cutoff = tournamentType === 'percentage' ? 0 : (computedCutoff !== null ? computedCutoff : storedCutoff);

    let html = '';

    if (cutoff && active.length > cutoff) {
      html += `<div style="color:#aaa;font-size:0.85rem;text-align:center;margin-bottom:8px;">Seuil de qualification : Top ${cutoff} — ⚠️ ${active.length - cutoff} joueur(s) en danger</div>`;
    }

    active.forEach((p, i) => {
      const rank = i + 1;
      let statusClass = 'safe';

      if (isLastRound && rank <= 3) {
        const medalClasses = ['gold', 'silver', 'bronze'];
        statusClass = medalClasses[rank - 1];
      } else if (cutoff && rank > cutoff) {
        statusClass = 'danger';
      }

      const avatar = p.photoURL || '../assets/default-avatar.png';
      const gsAttr = p.gameScoreId ? ` data-game-score-id="${p.gameScoreId}"` : '';
      const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      html += `<div class="entry ${statusClass}"${gsAttr}>
        <span class="rank">${rank}.</span>
        <img src="${avatar}" class="avatar">
        <span class="name"><a href="/profil/?uid=${p.uid}" style="color:inherit;text-decoration:none;">${p.name}</a></span>
        ${!isLastRound && cutoff && rank > cutoff ? '<span class="entry-label at-risk">⚠️ En danger</span>' : ''}
        ${isLastRound && rank <= 3 ? `<span class="entry-label medal">${medalEmoji}</span>` : ''}
        <span class="score">${p.score.toLocaleString()}</span>
      </div>`;
    });

    if (eliminated.length > 0) {
      html += '<div class="section-title eliminated-title">Éliminés</div>';
      eliminated.forEach((p, i) => {
        const avatar = p.photoURL || '../assets/default-avatar.png';
        const gsAttr = p.gameScoreId ? ` data-game-score-id="${p.gameScoreId}"` : '';
        html += `<div class="entry eliminated"${gsAttr}>
          <span class="rank">${active.length + i + 1}.</span>
          <img src="${avatar}" class="avatar">
          <span class="name"><a href="/profil/?uid=${p.uid}" style="color:inherit;text-decoration:none;">${p.name}</a></span>
          <span class="score">${p.score.toLocaleString()}</span>
        </div>`;
      });
    }
    return html;
  },

  _gameScoreCache: {},

  async enrichScoreboardEntries(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cellMap = {};
    container.querySelectorAll('[data-game-score-id]').forEach(el => {
      const id = el.dataset.gameScoreId;
      if (id) cellMap[id] = el;
    });

    const ids = Object.keys(cellMap);
    if (ids.length === 0) return;

    const db = window.firebaseDb;
    const { doc, getDoc } = window.Firestore;
    const cache = TournoiUtils._gameScoreCache;

    const applyToCell = (id, data) => {
      const cell = cellMap[id];
      if (!cell || !data) return;

      // Set comment as tooltip on the cell
      if (data.comment) {
        cell.title = data.comment;
        cell.classList.add('has-comment');
      }

      // Make cell clickable for screenshot
      if (data.screenshotUrl) {
        cell.style.cursor = 'pointer';
        cell.classList.add('has-screenshot');
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          TournoiUtils.openScreenshotModal(data.screenshotUrl);
        });
      }
    };

    const idsToFetch = ids.filter(id => !(id in cache));

    await Promise.all(idsToFetch.map(async id => {
      try {
        const snap = await getDoc(doc(db, 'game-scores', id));
        cache[id] = snap.exists() ? snap.data() : null;
      } catch (e) {
        cache[id] = null;
      }
    }));

    ids.forEach(id => applyToCell(id, cache[id]));
  },

  openScreenshotModal(url) {
    const modal = document.getElementById('screenshot-modal');
    if (!modal) return;
    const img = document.getElementById('screenshot-modal-img') || modal.querySelector('img');
    if (!img) return;
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
  },
};

window.TournoiUtils = TournoiUtils;
