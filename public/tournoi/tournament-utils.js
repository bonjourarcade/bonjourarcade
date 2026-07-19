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

  getGameUrl(gameId) {
    return `/b/${gameId}`;
  },

  renderScoreboardHtml(roundScores, participants, currentRoundIndex) {
    const scoresMap = {};
    roundScores.forEach(rs => {
      if (!scoresMap[rs.userId] || rs.score > scoresMap[rs.userId]) {
        scoresMap[rs.userId] = rs.score;
      }
    });

    const ranked = Object.entries(participants)
      .map(([uid, p]) => ({
        uid,
        name: p.displayName,
        photoURL: p.photoURL,
        score: scoresMap[uid] || 0,
        eliminated: p.eliminated,
      }))
      .sort((a, b) => b.score - a.score);

    const hasScore = ranked.some(p => p.score > 0);
    if (!hasScore) {
      return '<div style="color:#aaa;text-align:center;padding:20px;">Aucun score pour cette ronde</div>';
    }

    const active = ranked.filter(p => !p.eliminated);
    const eliminated = ranked.filter(p => p.eliminated);

    let html = '';
    active.forEach((p, i) => {
      const avatar = p.photoURL || '../assets/default-avatar.png';
      html += `<div class="entry safe">
        <span class="rank">${i + 1}.</span>
        <img src="${avatar}" class="avatar">
        <span class="name">${p.name}</span>
        <span class="score">${p.score.toLocaleString()}</span>
      </div>`;
    });

    if (eliminated.length > 0) {
      html += '<div class="section-title eliminated-title">Éliminés</div>';
      eliminated.forEach((p, i) => {
        const avatar = p.photoURL || '../assets/default-avatar.png';
        html += `<div class="entry eliminated">
          <span class="rank">${active.length + i + 1}.</span>
          <img src="${avatar}" class="avatar">
          <span class="name">${p.name}</span>
          <span class="score">${p.score.toLocaleString()}</span>
        </div>`;
      });
    }
    return html;
  },
};

window.TournoiUtils = TournoiUtils;
