const { doc, getDoc, getDocs, collection } = window.Firestore;

let currentUser = null;
let shareCode = null;
let tournamentData = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  shareCode = params.get('c') || params.get('code');
  const tournamentId = params.get('t');

  if (shareCode) {
    shareCode = shareCode.trim().toUpperCase();
  }

  setupAuth(tournamentId);

  $('lookup-code-btn').addEventListener('click', handleCodeSubmit);
  $('code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCodeSubmit();
  });
});

async function handleCodeSubmit() {
  const code = $('code-input').value.trim().toUpperCase();
  if (!code) {
    $('code-input-error').textContent = 'Entre un code.';
    $('code-input-error').classList.remove('hidden');
    return;
  }
  $('code-input-error').classList.add('hidden');
  shareCode = code;
  await findAndShowTournament();
}

function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function setupAuth(tournamentId) {
  window.onFirebaseAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      hide('login-state');
      if (tournamentId) {
        window.location.href = `/tournoi/play/?t=${tournamentId}`;
      } else if (shareCode) {
        await findAndShowTournament();
      } else {
        show('code-input-state');
      }
    } else {
      hide('join-state');
      hide('redirect-state');
      hide('error-state');
      hide('loading-state');
      hide('code-input-state');
      show('login-state');
    }
  });

  $('login-btn').addEventListener('click', async () => {
    try {
      await window.signInWithGoogle();
    } catch (e) {
      $('login-error').textContent = 'Erreur de connexion: ' + e.message;
      $('login-error').classList.remove('hidden');
    }
  });

  $('join-btn').addEventListener('click', joinTournament);
}

async function findAndShowTournament() {
  show('loading-state');
  hide('login-state');
  hide('join-state');
  hide('error-state');
  hide('code-input-state');

  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'getTournamentByShareCode')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'getTournamentByShareCode');

    const result = await fn({ shareCode });
    const t = result.data.tournament;
    tournamentData = t;

    hide('loading-state');
    show('join-state');

    $('tournament-name').textContent = `Tournoi #${t.shareCode}`;

    let statusText = 'Terminé';
    if (t.isJoinable) {
      statusText = '✅ Inscriptions ouvertes';
    } else if (t.status === 'active') {
      statusText = '🔴 En cours';
    } else if (t.status === 'registration') {
      statusText = '✅ Inscriptions ouvertes';
    }

    $('tournament-info').innerHTML = `
      <div class="info-line"><span class="label">Code</span><span class="value">${t.shareCode}</span></div>
      <div class="info-line"><span class="label">Jeux</span><span class="value">${t.gamePoolLength}</span></div>
      <div class="info-line"><span class="label">Participants</span><span class="value">${t.participantCount}</span></div>
      <div class="info-line"><span class="label">Statut</span><span class="value">${statusText}</span></div>
    `;

    if (t.isJoinable) {
      $('join-btn').classList.remove('hidden');
    } else {
      $('join-btn').classList.add('hidden');
    }
  } catch (e) {
    hide('loading-state');
    showError(e.message || 'Tournoi introuvable.');
  }
}

async function joinTournament() {
  if (!tournamentData) return;
  $('join-btn').disabled = true;

  try {
    const fn = window.httpsCallable
      ? window.httpsCallable(window.firebaseFunctions, 'joinTournament')
      : (await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js')).httpsCallable(window.firebaseFunctions, 'joinTournament');

    const result = await fn({ shareCode });
    const tId = result.data.tournamentId;

    hide('join-state');
    show('redirect-state');

    setTimeout(() => {
      window.location.href = `/tournoi/play/?t=${tId}`;
    }, 1500);
  } catch (e) {
    $('join-btn').disabled = false;
    $('join-error').textContent = e.message || 'Erreur.';
    $('join-error').classList.remove('hidden');
  }
}

function showError(msg) {
  hide('loading-state');
  hide('login-state');
  hide('join-state');
  show('error-state');
  $('error-message').textContent = msg;
}
