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
    const start = roundStartTime.toMillis ? roundStartTime.toMillis() : new Date(roundStartTime).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return Math.max(0, durationSec - elapsed);
  },

  async callFunction(name, data) {
    const fn = window.httpsCallable(window.firebaseFunctions, name);
    const result = await fn(data);
    return result.data;
  },

  computeRoundCutoff(remainingPlayers, currentRound, totalRounds) {
    if (!totalRounds || currentRound >= totalRounds - 1) return null;
    const roundsLeft = totalRounds - currentRound;
    if (remainingPlayers <= roundsLeft) return remainingPlayers;
    const isPenultimate = currentRound === totalRounds - 2;
    const minFinal = isPenultimate && remainingPlayers > 3 ? 3 : 1;
    return Math.min(remainingPlayers, Math.max(minFinal, Math.ceil(remainingPlayers * (roundsLeft - 1) / roundsLeft)));
  },

  getGameUrl(gameId) {
    return `/b/${gameId}`;
  },

  renderScoreboardHtml(roundScores, participants, currentRoundIndex, cutoffs, totalRounds) {
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
    const cutoff = computedCutoff !== null ? computedCutoff : storedCutoff;

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

  async enrichScoreboardEntries(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entryMap = {};
    container.querySelectorAll('[data-game-score-id]').forEach(el => {
      const id = el.dataset.gameScoreId;
      if (id) entryMap[id] = el;
    });

    const ids = Object.keys(entryMap);
    if (ids.length === 0) return;

    const db = window.firebaseDb;
    const { doc, getDoc } = window.Firestore;

    const snapshots = await Promise.all(
      ids.map(id => getDoc(doc(db, 'game-scores', id)).catch(() => null))
    );

    snapshots.forEach((snap, i) => {
      if (!snap || !snap.exists) return;
      const data = snap.data();
      const entry = entryMap[ids[i]];
      if (!entry) return;

      const nameEl = entry.querySelector('.name');
      if (!nameEl) return;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'entry-meta';

      if (data.comment) {
        const badge = document.createElement('span');
        badge.className = 'meta-comment';
        badge.textContent = '💬';
        badge.dataset.comment = data.comment;
        metaSpan.appendChild(badge);

        const scoreEl = entry.querySelector('.score');
        if (scoreEl) {
          scoreEl.dataset.comment = data.comment;
          scoreEl.classList.add('has-comment');
        }
      }

      if (data.screenshotUrl) {
        const badge = document.createElement('span');
        badge.className = 'meta-screenshot';
        badge.textContent = '📷';
        badge.title = 'Voir la capture d\'écran';
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          TournoiUtils.openScreenshotModal(data.screenshotUrl);
        });
        metaSpan.appendChild(badge);
      }

      if (metaSpan.children.length > 0) {
        nameEl.after(metaSpan);
      }
    });
  },

  openScreenshotModal(url) {
    const modal = document.getElementById('screenshot-modal');
    if (!modal) return;
    const img = document.getElementById('screenshot-modal-img') || modal.querySelector('img');
    if (img) img.src = url;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; if (img) img.src = ''; };
  },
};

window.TournoiUtils = TournoiUtils;
