let gamelist = []; // Declared globally
document.addEventListener('DOMContentLoaded', () => {


    // --- DOM Elements (Globally Accessible) ---
    const setupView = document.getElementById('setup-view');
    const tournamentView = document.getElementById('tournament-view');
    const gameIdsTextarea = document.getElementById('game-ids');
    const roundDurationInput = document.getElementById('round-duration');
    const pauseDurationInput = document.getElementById('pause-duration');
    const startTournamentBtn = document.getElementById('start-tournament-btn');

    const roundTitleEl = document.getElementById('round-title');
    const roundSubtitleEl = document.getElementById('round-subtitle');
    const timerEl = document.getElementById('timer');
    const gameCoverEl = document.getElementById('game-cover');
    const gameLinkEl = document.getElementById('game-link');
    const gameLinkTextEl = document.getElementById('game-link-text');
    const gameTitleEl = document.getElementById('game-title');
    const gameMetadataEl = document.getElementById('game-metadata');
    const gameInfoContainerEl = document.getElementById('game-info-container');
    const scoreboardEntriesEl = document.getElementById('scoreboard-entries');

    const eliminationModal = document.getElementById('elimination-modal');
    const cutoffSuggestionEl = document.getElementById('cutoff-suggestion');
    const cutoffNumberInput = document.getElementById('cutoff-number');
    const confirmEliminationBtn = document.getElementById('confirm-elimination-btn');

    const winnerView = document.getElementById('winner-view');
    const winnerResultsEl = document.getElementById('winner-results');
    const restartTournamentBtn = document.getElementById('restart-tournament-btn');

    const endRoundSound = document.getElementById('end-round-sound');
    const goSound = document.getElementById('go-sound');
    const cancelTournamentBtn = document.getElementById('cancel-tournament-btn');
    const simulationModeCheckbox = document.getElementById('simulation-mode-checkbox');
    const simulatedPlayersContainer = document.getElementById('simulated-players-container');
    const simulatedPlayersInput = document.getElementById('simulated-players');
    const numGamesInput = document.getElementById('num-games');
    const generateGamesBtn = document.getElementById('generate-games-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const nextRoundBtn = document.getElementById('next-round-btn');
    const skipToBreakBtn = document.getElementById('skip-to-break-btn');
    const finalizeBtn = document.getElementById('finalize-btn');

    // helper toast message for visual feedback
    function showToast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.position = 'fixed';
        t.style.bottom = '20px';
        t.style.left = '50%';
        t.style.transform = 'translateX(-50%)';
        t.style.background = 'rgba(0,0,0,0.8)';
        t.style.color = '#fff';
        t.style.padding = '8px 16px';
        t.style.borderRadius = '4px';
        t.style.zIndex = '2000';
        t.style.fontSize = '14px';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }

    // add delegation to support status toggles without needing to rebind
    scoreboardEntriesEl.addEventListener('click', (evt) => {
        const entry = evt.target.closest('.scoreboard-entry');
        if (!entry || entry.classList.contains('eliminated')) return;
        const playerName = entry.dataset.player || entry.querySelector('.player-name')?.textContent;
        if (!playerName) return;
        const current = entry.classList.contains('danger') ? 'danger' : 'safe';
        const newStatus = current === 'danger' ? 'safe' : 'danger';
        tournamentState.overrides = tournamentState.overrides || {};
        tournamentState.overrides[playerName] = newStatus;
        console.log('delegate override toggled', playerName, newStatus);
        showToast(`Statut ${playerName} → ${newStatus}`);
        saveState();
        renderScoreboard();
    });

    // --- Config & State ---
    const TOURNAMENT_STATE_KEY = 'bonjourarcade_tournament_state';
    const BACKGROUND_PATH_PREFIX = '../assets/backgrounds/';
    const backgroundImages = [
        '1.png',
        '10.jpg',
        '10.png',
        '100.png',
        '101.png',
        '102.png',
        '103.png',
        '104.png',
        '105.png',
        '106.png',
        '107.png',
        '108.png',
        '109.png',
        '11.jpg',
        '11.png',
        '110.png',
        '111.png',
        '112.png',
        '113.png',
        '114.png',
        '115.png',
        '116.png',
        '117.png',
        '118.png',
        '119.png',
        '12.jpg',
        '12.png',
        '120.png',
        '122.png',
        '123.png',
        '124.png',
        '125.png',
        '126.png',
        '127.png',
        '128.png',
        '129.png',
        '13.png',
        '130.png',
        '131.png',
        '132.png',
        '133.png',
        '134.png',
        '135.png',
        '136.png',
        '137.png',
        '138.png',
        '139.png',
        '14.jpg',
        '14.png',
        '140.png',
        '141.png',
        '142.png',
        '143.png',
        '144.png',
        '145.png',
        '146.png',
        '147.png',
        '148.png',
        '149.png',
        '15.jpg',
        '15.png',
        '150.png',
        '151.png',
        '152.png',
        '154.png',
        '155.png',
        '156.png',
        '159.png',
        '16.png',
        '160.png',
        '161.png',
        '162.png',
        '163.png',
        '164.png',
        '165.png',
        '166.png',
        '167.png',
        '168.png',
        '17.jpg',
        '17.png',
        '170.png',
        '171.png',
        '172.png',
        '173.png',
        '174.png',
        '176.png',
        '177.png',
        '178.png',
        '179.png',
        '18.png',
        '180.png',
        '181.png',
        '182.png',
        '183.png',
        '184.png',
        '185.png',
        '186.png',
        '187.png',
        '188.png',
        '189.png',
        '19.png',
        '190.png',
        '191.png',
        '192.png',
        '193.png',
        '194.png',
        '195.png',
        '196.png',
        '1960_dot.jpg',
        '197.png',
        '198.png',
        '199.png',
        '2.png',
        '20.png',
        '200.png',
        '201.png',
        '203.png',
        '204.png',
        '205.png',
        '206.png',
        '207.png',
        '208.png',
        '209.png',
        '21.jpg',
        '21.png',
        '210.png',
        '211.png',
        '212.png',
        '213.png',
        '214.png',
        '215.png',
        '216.png',
        '217.png',
        '218.png',
        '219.png',
        '22.jpg',
        '22.png',
        '220.png',
        '221.png',
        '222.png',
        '223.png',
        '224.png',
        '225.png',
        '226.png',
        '227.png',
        '228.png',
        '229.png',
        '23.jpg',
        '23.png',
        '230.png',
        '231.png',
        '232.png',
        '233.png',
        '234.png',
        '235.png',
        '236.png',
        '237.png',
        '238.png',
        '239.png',
        '24.png',
        '240.png',
        '241.png',
        '242.png',
        '243.png',
        '244.png',
        '245.png',
        '246.png',
        '247.png',
        '248.png',
        '249.png',
        '25.jpg',
        '250.png',
        '251.png',
        '252.png',
        '253.png',
        '254.png',
        '255.png',
        '256.png',
        '257.png',
        '259.png',
        '26.jpg',
        '26.png',
        '260.png',
        '262.png',
        '263.png',
        '264.png',
        '265.png',
        '266.png',
        '267.png',
        '268.png',
        '269.png',
        '27.jpg',
        '27.png',
        '270.png',
        '271.png',
        '272.png',
        '273.png',
        '274.png',
        '275.png',
        '276.png',
        '277.png',
        '278.png',
        '279.png',
        '28.png',
        '280.png',
        '281.png',
        '282.png',
        '283.png',
        '284.png',
        '285.png',
        '286.png',
        '287.png',
        '288.png',
        '289.png',
        '29.png',
        '290.png',
        '291.png',
        '292.png',
        '293.png',
        '294.png',
        '295.png',
        '296.png',
        '297.png',
        '298.png',
        '3.png',
        '30.jpg',
        '30.png',
        '305.png',
        '306.png',
        '308.png',
        '31.png',
        '313.png',
        '316.png',
        '317.png',
        '318.png',
        '319.png',
        '32.png',
        '320.png',
        '321.png',
        '322.png',
        '323.png',
        '324.png',
        '325.png',
        '326.png',
        '327.png',
        '328.png',
        '329.png',
        '33.png',
        '330.png',
        '332.png',
        '333.png',
        '334.png',
        '335.png',
        '336.png',
        '337.png',
        '338.png',
        '339.png',
        '34.jpg',
        '34.png',
        '340.png',
        '341.png',
        '342.png',
        '343.png',
        '344.png',
        '345.png',
        '346.png',
        '347.png',
        '348.png',
        '349.png',
        '35.jpg',
        '35.png',
        '350.png',
        '351.png',
        '352.png',
        '353.png',
        '354.png',
        '355.png',
        '356.png',
        '357.png',
        '358.png',
        '359.png',
        '36.jpg',
        '36.png',
        '360.png',
        '361.png',
        '362.png',
        '363.png',
        '364.png',
        '365.png',
        '366.png',
        '367.png',
        '368.png',
        '37.png',
        '370.png',
        '371.png',
        '372.png',
        '373.png',
        '374.png',
        '375.png',
        '376.png',
        '377.png',
        '378.png',
        '379.png',
        '38.jpg',
        '38.png',
        '380.png',
        '381.png',
        '382.png',
        '383.png',
        '385.png',
        '386.png',
        '387.png',
        '388.png',
        '389.png',
        '39.png',
        '390.png',
        '391.png',
        '392.png',
        '393.png',
        '394.png',
        '395.png',
        '396.png',
        '397.png',
        '398.png',
        '399.png',
        '4.jpg',
        '4.png',
        '40.jpg',
        '40.png',
        '400.png',
        '401.png',
        '402.png',
        '403.png',
        '404.png',
        '405.png',
        '406.png',
        '407.png',
        '408.png',
        '409.png',
        '41.png',
        '410.png',
        '411.png',
        '414.png',
        '415.png',
        '416.png',
        '418.png',
        '419.png',
        '42.jpg',
        '42.png',
        '420.png',
        '421.png',
        '422.png',
        '423.png',
        '424.png',
        '425.png',
        '426.png',
        '427.png',
        '428.png',
        '429.png',
        '43.jpg',
        '43.png',
        '430.png',
        '431.png',
        '432.png',
        '433.png',
        '434.png',
        '435.png',
        '44.jpg',
        '44.png',
        '45.jpg',
        '45.png',
        '46.jpg',
        '46.png',
        '47.png',
        '48.png',
        '49.png',
        '5.png',
        '50.jpg',
        '50.png',
        '51.jpg',
        '51.png',
        '52.png',
        '53.png',
        '54.jpg',
        '54.png',
        '55.png',
        '56.jpg',
        '56.png',
        '57.jpg',
        '57.png',
        '58.jpg',
        '58.png',
        '59.jpg',
        '59.png',
        '6.jpg',
        '6.png',
        '60.png',
        '61.png',
        '63.png',
        '64.png',
        '65.png',
        '66.png',
        '67.png',
        '68.png',
        '69.png',
        '7.jpg',
        '7.png',
        '70.png',
        '70s_marb.jpg',
        '71.png',
        '72.png',
        '73.png',
        '74.png',
        '75.png',
        '76.png',
        '77.png',
        '78.png',
        '79.png',
        '8.png',
        '80.png',
        '81.png',
        '82.png',
        '83.png',
        '84.png',
        '85.png',
        '86.png',
        '87.png',
        '88.png',
        '89.png',
        '9.png',
        '90.png',
        '91.png',
        '93.png',
        '94.png',
        '95.png',
        '96.png',
        '97.png',
        '98.png',
        '99.png',
        'aftex.gif',
        'alienegg.jpg',
        'alienlan.jpg',
        'aqua.gif',
        'atoms.jpg',
        'atoms2.jpg',
        'b.jpg',
        'b2.jpg',
        'back10.jpg',
        'back2.jpg',
        'back3.jpg',
        'bchback.gif',
        'bg_blu.jpg',
        'bg1.gif',
        'bgHallown.jpg',
        'blue_mar.gif',
        'blue_mar.jpg',
        'blue_roc.gif',
        'blue_roc.jpg',
        'blue_wea.gif',
        'blue_wea.jpg',
        'blueblob.jpg',
        'bluehorz.gif',
        'blueland.jpg',
        'bluesky.jpg',
        'blueston.jpg',
        'bluesurf.gif',
        'bluesurf.jpg',
        'bluewall.jpg',
        'bluewave.jpg',
        'blumaz.gif',
        'bow-tile.jpg',
        'bowtie.jpg',
        'brikface.gif',
        'brix.gif',
        'brushed_.jpg',
        'bubbles.gif',
        'bumps1.jpg',
        'bumps2.jpg',
        'bumps3.jpg',
        'bumpygre.jpg',
        'burst.gif',
        'chalk.jpg',
        'chokswrl.gif',
        'circles.gif',
        'circuit.jpg',
        'clouds.jpg',
        'cmc11.jpg',
        'cool_til.gif',
        'copper.jpg',
        'corkbrd.jpg',
        'corrugat.jpg',
        'Count.png',
        'cyber.jpg',
        'deepblue.jpg',
        'diagrids.jpg',
        'diamond.gif',
        'dirt.jpg',
        'dirtwatr.jpg',
        'divit.jpg',
        'embossed.jpg',
        'ether.jpg',
        'f.jpg',
        'fallfeat.jpg',
        'fire.gif',
        'fire1.jpg',
        'fireg.jpg',
        'firering.jpg',
        'flagston.jpg',
        'fractalwood.jpg',
        'funkyblu.jpg',
        'funkybum.jpg',
        'goo.jpg',
        'granite.gif',
        'granite.jpg',
        'gray_alu.jpg',
        'gray_fab.jpg',
        'gray_roc.jpg',
        'gray_stu.jpg',
        'gray.jpg',
        'graybump.jpg',
        'graypock.jpg',
        'graystre.jpg',
        'graystuc.jpg',
        'graytire.jpg',
        'graywaff.jpg',
        'green_st.jpg',
        'green-ri.jpg',
        'greendot.jpg',
        'greenred.jpg',
        'greeny.jpg',
        'grey_dot.jpg',
        'greydots.gif',
        'grn_roc.jpg',
        'grysatin.jpg',
        'heirog2.gif',
        'heirog3.gif',
        'heirogl.gif',
        'icywater.jpg',
        'kanji1.gif',
        'lava1.jpg',
        'lava2.jpg',
        'lavender.jpg',
        'light.jpg',
        'lightb1.jpg',
        'lipurple_weave.gif',
        'lipurple.jpg',
        'love.jpg',
        'lumps.jpg',
        'marb1.gif',
        'marble.gif',
        'marble.jpg',
        'marble2.jpg',
        'marbled_.jpg',
        'marbled.jpg',
        'marrolls.jpg',
        'mazes.jpg',
        'moocow.gif',
        'multi1.jpg',
        'multi2.jpg',
        'multicolor2_rock.gif',
        'nightmar.jpg',
        'orange_paper.gif',
        'paper.jpg',
        'parquet.jpg',
        'parquet2.jpg',
        'pat.gif',
        'pgreen.jpg',
        'pink_fab.jpg',
        'pinkflam.jpg',
        'purpgls.jpg',
        'purpgls1.jpg',
        'purple_g.jpg',
        'purple_m.jpg',
        'purple.jpg',
        'purplebl.jpg',
        'purplem1.jpg',
        'purpletr.jpg',
        'purpnblu.gif',
        'rain.jpg',
        'rainbow.jpg',
        'raindrl.jpg',
        'raindrop.jpg',
        'red_roc.jpg',
        'red_stuc.jpg',
        'red_stucco.gif',
        'redbrick.gif',
        'redcouch.jpg',
        'reddots.jpg',
        'redgray.jpg',
        'redmarble.jpg',
        'rivet2.gif',
        'rivet3.gif',
        'rivet5.gif',
        'rivet6.gif',
        'rivets.gif',
        'ropeweav.jpg',
        'sandman.jpg',
        'sandston.jpg',
        'scotch.gif',
        'scrnm_dr.jpg',
        'slate.jpg',
        'slate2.jpg',
        'smblue_r.jpg',
        'smgreen.gif',
        'smgreen.jpg',
        'snails.jpg',
        'space1.gif',
        'spec1.gif',
        'spheres.gif',
        'spikey.gif',
        'starry.jpg',
        'stars.gif',
        'stars.jpg',
        'stars2.gif',
        'stucco.gif',
        'summer_paper.gif',
        'sunburst.gif',
        'sunburst.jpg',
        'sunlight.jpg',
        'tan_paper.gif',
        'tanblue.jpg',
        'tapb.jpg',
        'tapestry.jpg',
        'teal_paper.gif',
        'tex1.gif',
        'tex13.gif',
        'tex14.gif',
        'tex16.gif',
        'tex2.gif',
        'tex20.gif',
        'tex22.gif',
        'tex23.gif',
        'tex24.gif',
        'tex25.gif',
        'tex4.gif',
        'tex6.gif',
        'tex9.gif',
        'theblues.gif',
        'thereds.gif',
        'tile.jpg',
        'tile2.jpg',
        'tiles.gif',
        'turtshel.gif',
        'vapor.jpg',
        'wall.jpg',
        'wall4.jpg',
        'walnut.jpg',
        'wl.jpg',
        'wood.jpg',
        'wood1.jpg',
        'wood2.jpg',
        'yell_roc.jpg',
        'yellow_f.jpg',
        'yellow_fabric.gif',
        'yellow_s.jpg',
        'yellow_w.jpg',
        'yellow_weave.gif',
        'yellowwall.jpg',
        'yelonblu.gif',
        'zigzag.gif',
    ];
    let tournamentState = {};
    let timerInterval = null;
    let scoreFetchingInterval = null;

    // --- State Management ---
    function saveState() { try { sessionStorage.setItem(TOURNAMENT_STATE_KEY, JSON.stringify(tournamentState)); } catch (e) { console.error("Could not save state:", e); } }
    function loadState() { try { const s = sessionStorage.getItem(TOURNAMENT_STATE_KEY); if (s) { tournamentState = JSON.parse(s); return true; } } catch (e) { console.error("Could not load state:", e); } return false; }
    function clearState() {
        sessionStorage.removeItem(TOURNAMENT_STATE_KEY);
        tournamentState = { players: {}, overrides: {} }; // Re-initialize tournamentState to ensure a clean slate, especially for players and overrides
        simulatedPlayerNames = [];
        tournamentState.simulatedScoresGeneratedForRound = false;
    }

    // --- Localhost Simulation ---
    let simulatedPlayerNames = []; // Keep track of potential simulated players

    function simulateScoreUpdates() {
        const roundIndex = tournamentState.currentRoundIndex;

        // Always generate a new score for active SIMULATED players at the beginning of a round
        if (!tournamentState.simulatedScoresGeneratedForRound && roundIndex !== -1) {
            simulatedPlayerNames.forEach(playerName => {
                const p = tournamentState.players[playerName];
                if (p && !p.eliminated) {
                    p.scores[roundIndex] = Math.floor(Math.random() * 5000) + 100;
                }
            });
            tournamentState.simulatedScoresGeneratedForRound = true;
        }
    }

    // --- Scoreboard & API ---
    async function fetchScores() {
        if (simulationModeCheckbox.checked) {
            simulateScoreUpdates();
        }

        const gameId = tournamentState.games[tournamentState.currentRoundIndex];
        if (!gameId) {
            // If there's no gameId, but we're simulating, we should still render.
            if (simulationModeCheckbox.checked) {
                renderScoreboard();
                saveState();
            }
            return;
        }

        try {
            const r = await fetch('https://us-central1-alloarcade.cloudfunctions.net/listGameScores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { timeRange: "week", gameId: gameId } }) });
            if (!r.ok) throw new Error(`API response not OK: ${r.status}`);
            const apiResponse = await r.json();
            const scores = apiResponse.result.scores;
            const roundStartTime = new Date(tournamentState.roundStartTime);

            scores.forEach(s => {
                if (new Date(s.date._seconds * 1000) > roundStartTime) {
                    if (!tournamentState.players[s.player]) { tournamentState.players[s.player] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false, eliminatedRound: null, photoURL: s.photoURL }; } else if (!tournamentState.players[s.player].photoURL) { tournamentState.players[s.player].photoURL = s.photoURL; }
                    const p = tournamentState.players[s.player];
                    if (s.score > p.scores[tournamentState.currentRoundIndex]) { p.scores[tournamentState.currentRoundIndex] = s.score; }
                }
            });
        } catch (e) {
            console.error('Error fetching scores:', e);
        } finally {
            // Render and save once at the end of everything.
            renderScoreboard();
            saveState();
        }
    }

    function renderScoreboard() {
        if (!tournamentState.players || tournamentState.currentRoundIndex < 0) return;

        let scoreboardHTML = '';
        const roundIndex = tournamentState.currentRoundIndex;
        const nextCutoff = tournamentState.cutoffs ? (tournamentState.cutoffs[roundIndex] || 0) : 0;

        // All sorting is now based on the score for the current round.
        const playersRankedByRound = Object.entries(tournamentState.players)
            .map(([name, data]) => ({
                name,
                roundScore: data.scores[roundIndex] || 0,
                eliminated: data.eliminated,
                photoURL: data.photoURL
            }))
            .sort((a, b) => b.roundScore - a.roundScore);

        const activePlayers = playersRankedByRound.filter(p => !p.eliminated);
        const eliminatedPlayers = playersRankedByRound.filter(p => p.eliminated);

        if (tournamentState.status === 'break' || tournamentState.status === 'awaiting_confirmation' || tournamentState.status === 'round_over') {
            scoreboardHTML += '<div class="cumulative-score-clarification">Scores de la dernière ronde.</div>';
        }

        if (activePlayers.length > 0) {
            scoreboardHTML += '<div class="scoreboard-section-title">Joueurs Actifs</div>';
            scoreboardHTML += activePlayers.map((p, i) => {
                // allow manual override of safe/danger
                let statusClass = '';
                let isOverridden = false;
                if (tournamentState.overrides && tournamentState.overrides[p.name]) {
                    statusClass = tournamentState.overrides[p.name];
                    isOverridden = true;
                } else {
                    // Determine status based on round rank. This applies during both round and break.
                    // First round is warmup, everyone is safe.
                    if (roundIndex === 0) {
                        statusClass = 'safe';
                    } else if (nextCutoff > 0) {
                        // In subsequent rounds, compare rank (i) to the cutoff.
                        statusClass = i < nextCutoff ? 'safe' : 'danger';
                    }
                }

                const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png';
                // include data-player for easier lookup when clicked
                return `<div class="scoreboard-entry ${statusClass}${isOverridden ? ' override' : ''}" data-player="${p.name}"><span class="rank">${i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}${isOverridden ? ' *' : ''}</span><span class="score">${p.roundScore.toLocaleString()}</span></div>`;
            }).join('');
        }

        if (eliminatedPlayers.length > 0) {
            scoreboardHTML += '<div class="scoreboard-section-title eliminated-section-title">Joueurs Éliminés</div>';
            const rankOffset = activePlayers.length;
            scoreboardHTML += eliminatedPlayers.map((p, i) => {
                const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png';
                return `<div class="scoreboard-entry eliminated"><span class="rank">${rankOffset + i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}</span><span class="score">${p.roundScore.toLocaleString()}</span></div>`;
            }).join('');
        }
        scoreboardEntriesEl.innerHTML = scoreboardHTML;

        // We're using event delegation on the container so we don't need to rebind every render.
        // (See additional listener set up during initialization below.)
    } // Correctly closes the renderScoreboard function.

    function startScoreFetching() { stopScoreFetching(); fetchScores(); const i = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 5000 : 30000; scoreFetchingInterval = setInterval(fetchScores, i); }
    function stopScoreFetching() { clearInterval(scoreFetchingInterval); }

    // --- Timers & Round Progression ---
    function startTimer(duration, onTick, onEnd) { clearInterval(timerInterval); tournamentState.remainingTime = duration; timerInterval = setInterval(() => { tournamentState.remainingTime--; onTick(tournamentState.remainingTime); if (tournamentState.remainingTime <= 0) { clearInterval(timerInterval); onEnd(); } }, 1000); }
    function updateTimerDisplay(time) { if (time < 0) time = 0; timerEl.textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; }

    function getGameUrl(gameId) {
        return `https://bonjourarcade.com/b/${gameId}`;
    }

    function renderGameMetadata(gameData) {
        if (!gameData) {
            gameMetadataEl.innerHTML = '';
            return;
        }

        gameMetadataEl.innerHTML = `
            <p><strong>Développeur:</strong> ${gameData.developer || 'N/A'}</p>
            <p><strong>Année:</strong> ${gameData.year || 'N/A'}</p>
            <p><strong>Genre:</strong> ${gameData.genre || 'N/A'}</p>
            <p><strong>Console:</strong> ${gameData.core || 'N/A'}</p>
        `;
    }

    function renderGamePresentation(gameId) {
        const gameData = gamelist.find(g => g.id === gameId);

        if (gameData) {
            gameTitleEl.textContent = gameData.title;
            renderGameMetadata(gameData);
        } else {
            gameTitleEl.textContent = gameId || '';
            gameMetadataEl.innerHTML = '';
        }

        if (gameId) {
            gameCoverEl.src = `/games/${gameId}/cover.png`;
            gameCoverEl.alt = `Couverture de ${gameTitleEl.textContent || gameId}`;
            const gameUrl = getGameUrl(gameId);
            gameLinkEl.href = gameUrl;
            gameLinkTextEl.textContent = gameUrl;
        } else {
            gameCoverEl.removeAttribute('src');
            gameCoverEl.alt = '';
            gameLinkEl.removeAttribute('href');
            gameLinkTextEl.textContent = '';
        }
    }

    function getAvailableGamesForRound() {
        const selectedGames = new Set((tournamentState.games || []).filter(Boolean));
        return (tournamentState.gamePool || tournamentState.games || []).filter(gameId => !selectedGames.has(gameId));
    }

    async function animateRandomGameSelection(roundIndex) {
        const availableGameIds = getAvailableGamesForRound();
        if (availableGameIds.length === 0) return null;

        roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
        roundSubtitleEl.textContent = 'Tirage du jeu...';
        gameCoverEl.style.display = 'block';
        gameLinkEl.style.display = 'none';
        gameMetadataEl.style.display = '';
        scoreboardEntriesEl.style.display = 'none';
        gameInfoContainerEl.classList.add('is-randomizing');

        const animationSteps = Math.min(18, Math.max(8, availableGameIds.length * 2));
        for (let i = 0; i < animationSteps; i++) {
            const previewGameId = availableGameIds[Math.floor(Math.random() * availableGameIds.length)];
            renderGamePresentation(previewGameId);
            await new Promise(resolve => setTimeout(resolve, 85 + i * 8));
        }

        const selectedGameId = availableGameIds[Math.floor(Math.random() * availableGameIds.length)];
        tournamentState.games[roundIndex] = selectedGameId;
        renderGamePresentation(selectedGameId);
        saveState();

        await new Promise(resolve => setTimeout(resolve, 450));
        gameInfoContainerEl.classList.remove('is-randomizing');
        return selectedGameId;
    }

    async function startNextRound() {
        // Stop fetching scores from the break period before starting a new round.
        stopScoreFetching();
        nextRoundBtn.style.display = 'none'; // Hide button when round starts
        skipToBreakBtn.style.display = 'none';

        if (tournamentState.currentRoundIndex === -1 || (tournamentState.currentRoundIndex === 0 && (tournamentState.initialPlayerCount === 0 || !tournamentState.cutoffs || tournamentState.cutoffs.length === 0))) {
            const activePlayersCount = Object.keys(tournamentState.players).length;
            if (activePlayersCount > 0) {
                tournamentState.initialPlayerCount = activePlayersCount;
                tournamentState.cutoffs = [];
                const Y = tournamentState.initialPlayerCount;
                const X = tournamentState.games.length;
                for (let i = 0; i < X; i++) {
                    const playersAfter = Math.max(1, Math.ceil(Y * (X - i) / X));
                    tournamentState.cutoffs[i] = playersAfter;
                }
            }
        }

        tournamentState.currentRoundIndex++;
        tournamentState.simulatedScoresGeneratedForRound = false; // Reset for the new round
        tournamentState.overrides = {}; // Clear manual overrides for the new round
        const roundIndex = tournamentState.currentRoundIndex;

        if (roundIndex >= tournamentState.games.length) {
            endTournament();
            return;
        }

        // The cutoff for the *current* round was determined by the *end* of the previous round.
        // For the first round (warmup), everyone qualifies.
        tournamentState.currentCutoff = tournamentState.cutoffs[roundIndex];
        // The above line correctly sets the cutoff for the current round (roundIndex).
        // If roundIndex is 0 (warmup), tournamentState.cutoffs[0] will be the initial player count,
        // effectively meaning everyone qualifies.

        tournamentState.status = 'countdown';
        saveState();

        startCountdown(async () => {
            if (!tournamentState.games[roundIndex]) {
                tournamentState.status = 'randomizing';
                saveState();

                const selectedGameId = await animateRandomGameSelection(roundIndex);
                if (!selectedGameId) {
                    endTournament();
                    return;
                }
            }

            runRound();
        });
    }

    // Making startCountdown global to fix ReferenceError
    window.startCountdown = function (callback) {
        // Hide elements that shouldn't be visible during countdown
        roundTitleEl.style.display = 'none';
        roundSubtitleEl.style.display = 'none';
        gameLinkEl.style.display = 'none';
        gameMetadataEl.style.display = 'none';
        scoreboardEntriesEl.style.display = 'none';

        // Clear game title and metadata from previous rounds/tournaments
        gameTitleEl.textContent = '';
        gameMetadataEl.innerHTML = '';

        // Show the countdown overlay and static.gif
        countdownOverlay.style.display = 'flex';
        gameCoverEl.src = '../assets/static.gif';
        gameCoverEl.alt = 'Animation statique de compte à rebours'; // Set alt attribute
        gameCoverEl.style.display = 'block';

        let count = 3;
        goSound.play().catch(e => console.log("Audio play failed for GO!, user interaction needed."));
        countdownText.textContent = count;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
            } else if (count === 0) {
                countdownText.textContent = 'GO!';
                goSound.play().catch(e => console.log("Audio play failed for GO!, user interaction needed."));
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                gameCoverEl.style.display = 'none'; // Hide static.gif after countdown

                // Restore visibility of tournamentView elements
                roundTitleEl.style.display = '';
                roundSubtitleEl.style.display = '';
                gameLinkEl.style.display = '';
                gameMetadataEl.style.display = '';
                scoreboardEntriesEl.style.display = '';

                callback(); // Start the round or next phase
            }
        }, 1000);
    };

    function runRound() {
        roundTitleEl.style.display = '';
        roundSubtitleEl.style.display = '';
        gameLinkEl.style.display = '';
        gameMetadataEl.style.display = '';
        scoreboardEntriesEl.style.display = '';
        gameCoverEl.style.display = 'block'; // Ensure game cover is visible


        if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg;
            document.body.style.backgroundImage = `url('${BACKGROUND_PATH_PREFIX}${newBg}')`;
        }
        const roundIndex = tournamentState.currentRoundIndex;
        const gameId = tournamentState.games[roundIndex];
        tournamentState.status = 'round';
        tournamentState.roundStartTime = new Date().toISOString();

        // Set titles
        roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
        renderGamePresentation(gameId);

        if (roundIndex === tournamentState.games.length - 1) { // Final round
            roundSubtitleEl.textContent = "Finale";
        } else if (roundIndex > 0) {
            // Use the current round's cutoff, which is already set in startNextRound()
            const playersToQualify = tournamentState.currentCutoff;
            roundSubtitleEl.textContent = `Top ${playersToQualify} se qualifient`;
        } else {
            roundSubtitleEl.textContent = "Échauffement";
        }

        renderScoreboard();
        startScoreFetching();
        startTimer(tournamentState.roundDuration, (t) => {
            updateTimerDisplay(t);
            renderScoreboard(); // Re-render to update safe/danger zones as scores change
            saveState();
        }, endRound);

        // always allow skipping a round once it has started - the button is useful
        // even outside of simulation mode so that an operator can jump to the break early.
        skipToBreakBtn.style.display = 'block';
        // keep the visibility logic for simulation mode here just in case other flows rely on it
        if (simulationModeCheckbox.checked) {
            // no extra action required, button already shown
        }
    }

    async function endRound() {
        // This function is now called when the ROUND timer ends.
        // We keep fetching scores, but we wait for manual intervention to start the break.
        endRoundSound.play().catch(e => console.log("Audio play failed, user interaction needed."));

        const roundIndex = tournamentState.currentRoundIndex;

        await fetchScores(); // Fetch one last time.
        renderScoreboard(); // Show final scores for the round.

        if (roundIndex === tournamentState.games.length - 1) {
            // This is the final round. Move to a state awaiting final confirmation.
            awaitFinalConfirmation();
        } else {
            // For all other rounds, enter a "round_over" state and wait for the user to start the break.
            tournamentState.status = 'round_over';
            roundSubtitleEl.textContent = "Ronde terminée. En attente de la pause...";
            skipToBreakBtn.style.display = 'block'; // Show the button to start the break.
        }

        saveState();
    }

    function manuallyStartNextRound() {
        const roundIndex = tournamentState.currentRoundIndex;
        // The cutoff is for the round that JUST ended, to determine who moves to the NEXT round.
        // cutoffs array is 1-indexed for rounds, so for round 0 (index 0), we look at cutoffs[1]
        const cutoff = tournamentState.cutoffs[roundIndex];

        // Perform eliminations now, based on CUMULATIVE score.
        if (roundIndex < tournamentState.games.length - 1 && cutoff) { // No eliminations for final round
            // Rank players based on their score for THIS round (consistent with renderScoreboard)
            const playersRankedByRound = Object.entries(tournamentState.players)
                .map(([name, data]) => ({
                    name,
                    roundScore: data.scores[roundIndex] || 0,
                    eliminated: data.eliminated
                }))
                .sort((a, b) => b.roundScore - a.roundScore);

            const activePlayersSorted = playersRankedByRound.filter(p => !p.eliminated);

            activePlayersSorted.forEach((player, index) => {
                let shouldEliminate = false;
                if (tournamentState.overrides && tournamentState.overrides[player.name]) {
                    // Manual override is the ultimate truth
                    shouldEliminate = (tournamentState.overrides[player.name] === 'danger');
                } else if (roundIndex > 0) {
                    // Default rank-based elimination (skipping warmup which is roundIndex 0)
                    // The index is 0-based, cutoff is 1-based number of players
                    shouldEliminate = (index >= cutoff);
                }

                if (shouldEliminate) {
                    tournamentState.players[player.name].eliminated = true;
                    tournamentState.players[player.name].eliminatedRound = roundIndex; // Mark the round they were eliminated IN
                }
            });
        }

        renderScoreboard();
        saveState();
        startNextRound();
    }

    function startBreak() {
        skipToBreakBtn.style.display = 'none'; // Hide this button when break starts
        tournamentState.status = 'break';
        startScoreFetching(); // Keep fetching scores during the break.
        saveState();

        roundTitleEl.textContent = "Pause";
        roundSubtitleEl.textContent = "Approbation des scores en cours...";
        gameTitleEl.textContent = "";
        gameMetadataEl.innerHTML = "";

        // Show the cover of the game that just ended
        const gameId = tournamentState.games[tournamentState.currentRoundIndex];
        if (gameId) {
            gameCoverEl.src = `/games/${gameId}/cover.png`;
            gameCoverEl.alt = `Couverture de ${gameId}`;
            gameCoverEl.style.display = 'block';
        } else {
            // Fallback to static if gameId is not found for some reason
            gameCoverEl.src = '../assets/static.gif';
            gameCoverEl.alt = 'Animation statique de pause';
            gameCoverEl.style.display = 'block';
        }

        renderScoreboard();
        // The timer now just reveals the button at the end.
        // as soon as the break begins we display the "next round" button so the
        // operator can skip the rest of the pause immediately; the timer callback
        // will also make sure it is visible when the configured pause duration expires.
        nextRoundBtn.style.display = 'block';
        startTimer(tournamentState.pauseDuration, updateTimerDisplay, () => {
            nextRoundBtn.style.display = 'block'; // reinforce visibility at timer end
            roundSubtitleEl.textContent = "En attente du lancement de la prochaine ronde...";
        });

        // simulation mode already shows the button above; no extra handling needed
    }

    function awaitFinalConfirmation() {
        tournamentState.status = 'awaiting_confirmation'; // Use a more descriptive status
        startScoreFetching(); // Keep fetching for final approvals
        saveState();

        roundTitleEl.textContent = "Tournoi Terminé";
        roundSubtitleEl.textContent = "En attente de la confirmation des résultats finaux...";
        finalizeBtn.style.display = 'block'; // Show finalize button
        nextRoundBtn.style.display = 'none';

        renderScoreboard(); // Show final cumulative scores
    }


    async function endTournament() {
        stopScoreFetching(); // Now we can stop fetching.
        tournamentState.status = 'finished';
        // hide any leftover control buttons so the UI doesn't flicker or mislead
        if (skipToBreakBtn) skipToBreakBtn.style.display = 'none';
        if (nextRoundBtn) nextRoundBtn.style.display = 'none';
        if (finalizeBtn) finalizeBtn.style.display = 'none';

        // --- Data preparation for results.html ---
        const finalRoundIndex = tournamentState.games.length - 1;

        // Final Round Scores (for podium)
        const finalRoundScores = Object.entries(tournamentState.players)
            .filter(([, data]) => !data.eliminated)
            .map(([name, data]) => ({ name, score: data.scores[finalRoundIndex] || 0, photoURL: data.photoURL }))
            .sort((a, b) => b.score - a.score);

        // Cumulative Scores
        const cumulativeScores = Object.entries(tournamentState.players).map(([name, data]) => {
            const totalScore = data.scores.reduce((sum, score) => sum + score, 0);
            return { name, totalScore, photoURL: data.photoURL };
        }).sort((a, b) => b.totalScore - a.totalScore);

        // Round Summaries
        const roundSummaries = tournamentState.games.map((gameId, roundIndex) => {
            const gameData = gamelist.find(g => g.id === gameId);
            const playersForRound = Object.keys(tournamentState.players).map(name => {
                const player = tournamentState.players[name];
                return {
                    name,
                    score: player.scores[roundIndex] || 0,
                    photoURL: player.photoURL,
                    eliminatedInThisRoundOrEarlier: (typeof player.eliminatedRound === 'number' && player.eliminatedRound <= roundIndex)
                };
            }).sort((a, b) => b.score - a.score); // Sort by score for this round

            return {
                roundNumber: roundIndex + 1,
                gameTitle: gameData ? gameData.title : gameId,
                gameId: gameId,
                players: playersForRound
            };
        });

        const resultsData = {
            podiumPlayers: finalRoundScores.slice(0, 3), // Top 3 for the final round podium
            overallChampion: cumulativeScores[0], // The absolute top player by cumulative score
            cumulativeScoresTable: cumulativeScores, // All players with their cumulative scores
            roundSummaries: roundSummaries
        };

        // Store data in sessionStorage
        sessionStorage.setItem('bonjourarcade_tournament_results', JSON.stringify(resultsData));

        // Redirect to the new results page
        window.location.href = 'results.html';
    }

    // --- Init & Event Listeners ---
    generateGamesBtn.addEventListener('click', () => {
        const numGames = parseInt(numGamesInput.value, 10);
        if (isNaN(numGames) || numGames < 1) {
            alert("Veuillez entrer un nombre de jeux valide.");
            return;
        }

        const eligibleGames = gamelist.filter(g => g.enable_score && !g.problem);

        // Shuffle the array
        for (let i = eligibleGames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [eligibleGames[i], eligibleGames[j]] = [eligibleGames[j], eligibleGames[i]];
        }

        const selectedGames = eligibleGames.slice(0, numGames);
        gameIdsTextarea.value = selectedGames.map(g => g.id).join('\n');
    });

    startTournamentBtn.addEventListener('click', () => {
        const gameIds = gameIdsTextarea.value.split('\n').map(id => id.trim()).filter(id => id);
        if (gameIds.length === 0) { alert("Veuillez entrer au moins un ID de jeu."); return; }

        const allGamesValid = gameIds.every(id => gamelist.some(g => g.id === id));
        if (!allGamesValid) {
            alert("Un ou plusieurs ID de jeu sont invalides. Veuillez vérifier la liste.");
            return;
        }

        tournamentState = {
            games: Array(gameIds.length).fill(null), gamePool: gameIds, roundDuration: parseFloat(roundDurationInput.value) * 60, pauseDuration: parseFloat(pauseDurationInput.value) * 60,
            currentRoundIndex: -1, players: {}, roundHistory: [], status: 'setup', remainingTime: 0, currentCutoff: 0,
            simulatedScoresGeneratedForRound: false,
            overrides: {} // allow manual safe/danger toggles
        };

        if (simulationModeCheckbox.checked) {
            const numPlayers = parseInt(simulatedPlayersInput.value, 10) || 16;
            for (let i = 1; i <= numPlayers; i++) {
                const playerName = `Player${i}`;
                simulatedPlayerNames.push(playerName);
                tournamentState.players[playerName] = { scores: Array(gameIds.length).fill(0), totalScore: 0, eliminated: false, eliminatedRound: null };
            }
        }

        showTournamentView();
        startNextRound();
    });

    restartTournamentBtn.addEventListener('click', () => {
        winnerView.style.display = 'none';
        document.body.style.backgroundImage = '';
        clearState();
        showSetupView();
    });

    cancelTournamentBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir annuler le tournoi ? Ceci effacera toutes les données.")) {
            clearInterval(timerInterval);
            stopScoreFetching();
            document.body.style.backgroundImage = '';
            clearState();
            showSetupView();
        }
    });

    nextRoundBtn.addEventListener('click', () => {
        manuallyStartNextRound();
    });

    skipToBreakBtn.addEventListener('click', () => {
        startBreak();
    });

    finalizeBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir finaliser le tournoi ? Les résultats seront définitifs.")) {
            endTournament();
        }
    });

    // skip-timer button removed: using existing rectangular skip-to-break button `skipToBreakBtn`

    function showSetupView() { setupView.style.display = 'block'; tournamentView.style.display = 'none'; winnerView.style.display = 'none'; }
    function showTournamentView() { setupView.style.display = 'none'; tournamentView.style.display = 'block'; winnerView.style.display = 'none'; if (skipToBreakBtn) skipToBreakBtn.style.display = 'none'; }

    function resumeTournament() {
        showTournamentView();
        if (tournamentState.currentBackground) {
            document.body.style.backgroundImage = `url('${BACKGROUND_PATH_PREFIX}${tournamentState.currentBackground}')`;
        } else if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg; // Set it for future saves
            document.body.style.backgroundImage = `url('${BACKGROUND_PATH_PREFIX}${newBg}')`;
        }
        const onTick = (t) => {
            updateTimerDisplay(t);
            renderScoreboard();
            saveState();
        };
        if (tournamentState.status === 'countdown') {
            startCountdown(async () => {
                const roundIndex = tournamentState.currentRoundIndex;

                if (!tournamentState.games[roundIndex]) {
                    tournamentState.status = 'randomizing';
                    saveState();

                    const selectedGameId = await animateRandomGameSelection(roundIndex);
                    if (!selectedGameId) {
                        endTournament();
                        return;
                    }
                }

                runRound();
            });
        } else if (tournamentState.status === 'round') {
            const roundIndex = tournamentState.currentRoundIndex;
            const gameId = tournamentState.games[roundIndex];

            roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
            renderGamePresentation(gameId);

            roundSubtitleEl.textContent = roundIndex === 0 ? "Échauffement" : `Top ${tournamentState.currentCutoff} se qualifient`;
            renderScoreboard();
            startScoreFetching();
            startTimer(tournamentState.remainingTime, onTick, endRound);

            // when resuming mid-round make the skip-to-break button available again
            skipToBreakBtn.style.display = 'block';
        } else if (tournamentState.status === 'randomizing') {
            const roundIndex = tournamentState.currentRoundIndex;
            const resumeRandomizing = async () => {
                if (!tournamentState.games[roundIndex]) {
                    const selectedGameId = await animateRandomGameSelection(roundIndex);
                    if (!selectedGameId) {
                        endTournament();
                        return;
                    }
                }

                runRound();
            };

            resumeRandomizing();
        } else if (tournamentState.status === 'pause' || tournamentState.status === 'break') { // Updated to handle 'break'
            roundTitleEl.textContent = "Pause";
            roundSubtitleEl.textContent = "Approbation des scores en cours...";
            gameTitleEl.textContent = "";
            gameMetadataEl.innerHTML = "";
            const gameId = tournamentState.games[tournamentState.currentRoundIndex];
            if (gameId) {
                gameCoverEl.src = `/games/${gameId}/cover.png`;
                gameCoverEl.alt = `Couverture de ${gameId}`;
            } else {
                gameCoverEl.src = '../assets/static.gif';
                gameCoverEl.alt = 'Animation statique de pause (reprise)';
            }
            gameCoverEl.style.display = 'block';
            renderScoreboard();
            startScoreFetching(); // Ensure fetching continues on resume

            // make the "next round" button available right away during a resumed pause
            nextRoundBtn.style.display = 'block';
            startTimer(tournamentState.remainingTime, updateTimerDisplay, () => {
                nextRoundBtn.style.display = 'block';
                roundSubtitleEl.textContent = "En attente du lancement de la prochaine ronde...";
            });
        } else if (tournamentState.status === 'round_over') {
            // New state to handle resumption when round is over but break hasn't started
            roundSubtitleEl.textContent = "Ronde terminée. En attente de la pause...";
            skipToBreakBtn.style.display = 'block';
            renderScoreboard();
            startScoreFetching();
        } else if (tournamentState.status === 'awaiting_confirmation') {
            awaitFinalConfirmation(); // This will set up the final confirmation screen correctly
        }
    }

    async function fetchGamelist() {
        try {
            const cacheBuster = '?v=' + new Date().getTime();
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const gamelistUrl = isLocalhost ? '/gamelist.json' + cacheBuster : 'https://storage.googleapis.com/bonjourarcade/gamelist.json' + cacheBuster;
            const response = await fetch(gamelistUrl);
            const data = await response.json();
            gamelist = data.games || [];
        } catch (error) {
            console.error('Error fetching gamelist:', error);
        }
    }

    async function init() {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        simulationModeCheckbox.checked = isLocal;
        if (isLocal) {
            simulatedPlayersInput.value = Math.floor(Math.random() * (20 - 4 + 1)) + 4;
        }

        function toggleSimulatedPlayersInput() {
            simulatedPlayersContainer.style.display = simulationModeCheckbox.checked ? 'block' : 'none';
        }

        toggleSimulatedPlayersInput(); // Set initial visibility
        simulationModeCheckbox.addEventListener('change', toggleSimulatedPlayersInput);

        await fetchGamelist();
        if (loadState() && tournamentState.status && tournamentState.status !== 'setup' && tournamentState.status !== 'finished') {
            if (!Array.isArray(tournamentState.gamePool) || tournamentState.gamePool.length === 0) {
                tournamentState.gamePool = [...(tournamentState.games || []).filter(Boolean)];
            }
            resumeTournament();
        } else {
            clearState(); showSetupView();
        }
    }

    window.addEventListener('beforeunload', (e) => {
        if (tournamentState.status && tournamentState.status !== 'setup' && tournamentState.status !== 'finished') {
            e.preventDefault(); e.returnValue = ''; return '';
        }
    });

    init();
});
