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
const localTestingOnlyDiv = document.getElementById('local-testing-only');
const simulatedPlayersInput = document.getElementById('simulated-players');
const numGamesInput = document.getElementById('num-games');
const generateGamesBtn = document.getElementById('generate-games-btn');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');


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
        tournamentState = { players: {} }; // Re-initialize tournamentState to ensure a clean slate, especially for players
        simulatedPlayerNames = [];
        tournamentState.simulatedScoresGeneratedForRound = false;
    }

    // --- Localhost Simulation ---
    let simulatedPlayerNames = []; // Keep track of potential simulated players

    function simulateScoreUpdates() {
        const roundIndex = tournamentState.currentRoundIndex;

        // Initialize players if simulatedPlayerNames is empty (e.g., initial setup)
        if (simulatedPlayerNames.length === 0) {
            const numPlayers = parseInt(simulatedPlayersInput.value, 10) || 16;
            for (let i = 1; i <= numPlayers; i++) {
                simulatedPlayerNames.push(`Player${i}`);
            }
            // Ensure all newly created players have their objects in tournamentState.players
            simulatedPlayerNames.forEach(playerName => {
                if (!tournamentState.players[playerName]) {
                    tournamentState.players[playerName] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false, eliminatedRound: null };
                }
            });
        }
        
        // Always generate a new score for active players at the beginning of a round
        // This logic runs only once per round because of simulatedScoresGeneratedForRound flag,
        // which is reset in startNextRound()
        if (!tournamentState.simulatedScoresGeneratedForRound && roundIndex !== -1) { // roundIndex !== -1 to avoid generating scores before tournament starts
            Object.keys(tournamentState.players).forEach(playerName => {
                const p = tournamentState.players[playerName];
                p.scores[roundIndex] = Math.floor(Math.random() * 5000) + 100;
            });
            tournamentState.simulatedScoresGeneratedForRound = true;
        }

        renderScoreboard();
        saveState();
    }

    // --- Scoreboard & API ---
    async function fetchScores() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') { simulateScoreUpdates(); return; }
        const gameId = tournamentState.games[tournamentState.currentRoundIndex];
        if (!gameId) return;
        try {
            const r = await fetch('https://us-central1-alloarcade.cloudfunctions.net/listGameScores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { timeRange: "week", gameId: gameId } }) });
            if (!r.ok) throw new Error(`API response not OK: ${r.status}`);
            const apiResponse = await r.json();
            const scores = apiResponse.result.scores;
            const roundStartTime = new Date(tournamentState.roundStartTime);
            // Timezone note: Date comparisons in JavaScript are based on milliseconds since epoch (UTC).
            // `new Date(s.date._seconds * 1000)` creates a Date object from a UTC timestamp.
            // `roundStartTime` is created from an ISO string, which is also UTC.
            // Therefore, the comparison `new Date(s.date._seconds * 1000) > roundStartTime` is
            // inherently UTC-based and timezone-agnostic, ensuring correct chronological order
            // regardless of the user's local timezone setting.
            scores.forEach(s => {
                if (new Date(s.date._seconds * 1000) > roundStartTime) {
                    if (!tournamentState.players[s.player]) { tournamentState.players[s.player] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false, eliminatedRound: null, photoURL: s.photoURL }; } else if (!tournamentState.players[s.player].photoURL) { tournamentState.players[s.player].photoURL = s.photoURL; }
                    const p = tournamentState.players[s.player];
                    if (s.score > p.scores[tournamentState.currentRoundIndex]) { p.scores[tournamentState.currentRoundIndex] = s.score; }
                }
            });
            renderScoreboard();
            saveState();
        } catch (e) { console.error('Error fetching scores:', e); } 
    }

    function renderScoreboard() {
        if (!tournamentState.players || tournamentState.currentRoundIndex < 0) return;

        let scoreboardHTML = ''; // Declare scoreboardHTML here
        
        if (tournamentState.status === 'pause') {
            const currentRoundIndex = tournamentState.currentRoundIndex;
            const nextCutoff = tournamentState.cutoffs[currentRoundIndex + 1]; // Cutoff for the round that just ended

            const cumulativeScores = Object.entries(tournamentState.players).map(([name, data]) => {
                const totalScore = data.scores.slice(0, currentRoundIndex + 1).reduce((sum, score) => sum + score, 0); // Scores up to and including the current round
                return { name, totalScore, eliminated: data.eliminated, photoURL: data.photoURL };
            }).sort((a, b) => b.totalScore - a.totalScore); // Sort by cumulative score

            const activePlayersCumulative = cumulativeScores.filter(p => !p.eliminated);
            const eliminatedPlayersCumulative = cumulativeScores.filter(p => p.eliminated);

            scoreboardHTML += '<div class="cumulative-score-clarification">Scores cumulés jusqu\'à la ronde actuelle.</div>';

            if (activePlayersCumulative.length > 0) {
                scoreboardHTML += '<div class="scoreboard-section-title">Joueurs Actifs</div>';
                scoreboardHTML += activePlayersCumulative.map((p, i) => {
                    const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png'; // Fallback avatar
                    return `<div class="scoreboard-entry"><span class="rank">${i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}</span><span class="score">${p.totalScore.toLocaleString()}</span></div>`;
                }).join('');
            }

            if (eliminatedPlayersCumulative.length > 0) {
                scoreboardHTML += '<div class="scoreboard-section-title eliminated-section-title">Joueurs Éliminés</div>';
                // Only access activePlayersCumulative.length if it's guaranteed to be defined (which it is here)
                const rankOffset = activePlayersCumulative.length;
                scoreboardHTML += eliminatedPlayersCumulative.map((p, i) => {
                    const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png'; // Fallback avatar
                    return `<div class="scoreboard-entry eliminated"><span class="rank">${rankOffset + i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}</span><span class="score">${p.totalScore.toLocaleString()}</span></div>`;
                }).join('');
            }


            scoreboardEntriesEl.innerHTML = scoreboardHTML;

        } else { // Normal round display
            const roundIndex = tournamentState.currentRoundIndex;
            const playersArray = Object.entries(tournamentState.players).map(([name, data]) => ({ name, score: data.scores[roundIndex] || 0, eliminated: data.eliminated, photoURL: data.photoURL }));
            
            // Sort players by score
            playersArray.sort((a, b) => b.score - a.score);

            const cutoff = tournamentState.currentCutoff;
            const isEliminationRound = tournamentState.status === 'round' && tournamentState.currentRoundIndex > 0;

            const activePlayersRound = playersArray.filter(p => !p.eliminated);
            const eliminatedPlayersRound = playersArray.filter(p => p.eliminated);

            if (activePlayersRound.length > 0) {
                scoreboardHTML += '<div class="scoreboard-section-title">Joueurs Actifs</div>';
                scoreboardHTML += activePlayersRound.map((p, i) => {
                    let statusClass = '';
                    if (isEliminationRound && cutoff > 0) {
                        if (i < cutoff) {
                            statusClass = 'safe';
                        } else {
                            statusClass = 'danger';
                        }
                    }
                    const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png';
                    return `<div class="scoreboard-entry ${statusClass}"><span class="rank">${i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}</span><span class="score">${p.score.toLocaleString()}</span></div>`;
                }).join('');
            }

            if (eliminatedPlayersRound.length > 0) {
                scoreboardHTML += '<div class="scoreboard-section-title eliminated-section-title">Joueurs Éliminés</div>';
                const rankOffset = activePlayersRound.length; // Rank continues from active players
                scoreboardHTML += eliminatedPlayersRound.map((p, i) => {
                    const avatarSrc = p.photoURL ? p.photoURL : '../assets/default-avatar.png';
                    return `<div class="scoreboard-entry eliminated"><span class="rank">${rankOffset + i + 1}.</span><img src="${avatarSrc}" alt="${p.name}" class="player-avatar" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"><span class="player-name">${p.name}</span><span class="score">${p.score.toLocaleString()}</span></div>`;
                }).join('');
            }
            scoreboardEntriesEl.innerHTML = scoreboardHTML;
        } // Correctly closes the else block.
    } // Correctly closes the renderScoreboard function.

    function startScoreFetching() { stopScoreFetching(); fetchScores(); const i = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 5000 : 30000; scoreFetchingInterval = setInterval(fetchScores, i); } 
    function stopScoreFetching() { clearInterval(scoreFetchingInterval); }

    // --- Timers & Round Progression ---
    function startTimer(duration, onTick, onEnd) { clearInterval(timerInterval); tournamentState.remainingTime = duration; timerInterval = setInterval(() => { tournamentState.remainingTime--; onTick(tournamentState.remainingTime); if (tournamentState.remainingTime <= 0) { clearInterval(timerInterval); onEnd(); } }, 1000); } 
    function updateTimerDisplay(time) { if (time < 0) time = 0; timerEl.textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; }

    function startNextRound() {
        tournamentState.currentRoundIndex++;
        tournamentState.simulatedScoresGeneratedForRound = false; // Reset for the new round
        const roundIndex = tournamentState.currentRoundIndex;

        if (roundIndex >= tournamentState.games.length) {
            endTournament();
            return;
        }

        // The cutoff for the *current* round was determined by the *end* of the previous round.
        // For the first round (warmup), everyone qualifies.
        if (roundIndex > 0) {
            // The cutoff for display should indicate how many players will qualify from *this* round to the *next*.
            // tournamentState.cutoffs[roundIndex + 1] stores the number of players who will advance to round (roundIndex + 2)
            // But if roundIndex is the current round, then cutoffs[roundIndex + 1] refers to players advancing to next round.
            // So, for roundIndex, we should use cutoffs[roundIndex + 1] for display purposes.
            tournamentState.currentCutoff = tournamentState.cutoffs[roundIndex + 1]; 
        } else { // Warmup round
             const activePlayers = Object.values(tournamentState.players).filter(p => !p.eliminated);
             tournamentState.currentCutoff = activePlayers.length; // Everyone qualifies for warmup
        }
        
        startCountdown(runRound);
    }

    // Making startCountdown global to fix ReferenceError
    window.startCountdown = function(callback) {
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
        gameCoverEl.style.display = 'block'; // Ensure game cover is visible


        if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg;
            document.body.style.backgroundImage = `url('${BACKGROUND_PATH_PREFIX}${newBg}')`;
        }
        const roundIndex = tournamentState.currentRoundIndex;
        const gameId = tournamentState.games[roundIndex];
        const gameData = gamelist.find(g => g.id === gameId);
        tournamentState.status = 'round';
        tournamentState.roundStartTime = new Date().toISOString();
        
        // Set titles
        roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
        if (gameData) {
            gameTitleEl.textContent = gameData.title;
            gameMetadataEl.innerHTML = `
                <p><strong>Développeur:</strong> ${gameData.developer || 'N/A'}</p>
                <p><strong>Année:</strong> ${gameData.year || 'N/A'}</p>
                <p><strong>Genre:</strong> ${gameData.genre || 'N/A'}</p>
                <p><strong>Console:</strong> ${gameData.core || 'N/A'}</p>
            `;
        } else {
            gameTitleEl.textContent = gameId;
            gameMetadataEl.innerHTML = '';
        }

        if (roundIndex === tournamentState.games.length - 1) { // Final round
            roundSubtitleEl.textContent = "Finale";
        } else if (roundIndex > 0) {
            // Use the current round's cutoff, which is already set in startNextRound()
            const playersToQualify = tournamentState.currentCutoff;
            roundSubtitleEl.textContent = `Top ${playersToQualify} se qualifient`;
        } else {
            roundSubtitleEl.textContent = "Échauffement";
        }
        
        // Set game links
        gameCoverEl.src = `/games/${gameId}/cover.png`;
        const gameUrl = `https://bonjourarcade.com/b/${gameId}`;
        gameLinkEl.href = gameUrl; gameLinkTextEl.textContent = gameUrl;
        
        renderScoreboard();
        startScoreFetching();
        startTimer(tournamentState.roundDuration, (t) => { 
            updateTimerDisplay(t); 
            renderScoreboard(); // Re-render to update safe/danger zones as scores change
            saveState(); 
        }, endRound);
    }
    
    async function endRound() {
        stopScoreFetching();
        endRoundSound.play().catch(e => console.log("Audio play failed, user interaction needed."));

        const roundIndex = tournamentState.currentRoundIndex;

        // After warmup, calculate the cutoffs for all subsequent rounds
        if (roundIndex === 0) {
            tournamentState.initialPlayerCount = Object.keys(tournamentState.players).length;
            tournamentState.cutoffs = [];
            const Y = tournamentState.initialPlayerCount;
            const X = tournamentState.games.length;
            for (let i = 1; i < X; i++) {
                //This is the formula for the number of players who will advance to the next round.
                const playersAfter = Math.max(1, Math.ceil(Y * (X - i) / X));
                tournamentState.cutoffs[i] = playersAfter;
            }
        }
        
        const cutoff = tournamentState.cutoffs[roundIndex + 1];

        if (roundIndex > 0 && roundIndex < tournamentState.games.length - 1) { // No eliminations for warmup or final round
            const playersSorted = Object.entries(tournamentState.players)
                .sort(([, a], [, b]) => (b.scores[roundIndex] || 0) - (a.scores[roundIndex] || 0));
            
            const activePlayersSorted = playersSorted.filter(([, data]) => !data.eliminated);

            activePlayersSorted.forEach(([name], index) => {
                if (index >= cutoff) {
                    tournamentState.players[name].eliminated = true;
                    tournamentState.players[name].eliminatedRound = roundIndex; // Mark the round they were eliminated
                }
            });
        }

        renderScoreboard();
        saveState();

        // New condition to skip pause after the final round
        if (roundIndex === tournamentState.games.length - 1) {
            endTournament();
        } else {
            await fetchScores(); // Fetch scores one last time before pausing
            startPause();
        }
    }
    


    function startPause() {
        tournamentState.status = 'pause';
        saveState();
        roundTitleEl.textContent = "Pause";
        roundSubtitleEl.textContent = "";
        gameTitleEl.textContent = "";
        gameMetadataEl.innerHTML = "";
        gameCoverEl.src = '../assets/static.gif';
        gameCoverEl.alt = 'Animation statique de pause'; // Set alt attribute
        gameCoverEl.style.display = 'block';
        renderScoreboard(); // Call renderScoreboard to display cumulative results and qualification status
        startTimer(tournamentState.pauseDuration, updateTimerDisplay, startNextRound);
    }

    async function endTournament() {
        tournamentState.status = 'finished';

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
            games: gameIds, roundDuration: parseFloat(roundDurationInput.value) * 60, pauseDuration: parseFloat(pauseDurationInput.value) * 60,
            currentRoundIndex: -1, players: {}, roundHistory: [], status: 'setup', remainingTime: 0, currentCutoff: 0,
            simulatedScoresGeneratedForRound: false
        };
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

    function showSetupView() { setupView.style.display = 'block'; tournamentView.style.display = 'none'; winnerView.style.display = 'none'; } 
    function showTournamentView() { setupView.style.display = 'none'; tournamentView.style.display = 'block'; winnerView.style.display = 'none'; }

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
        if (tournamentState.status === 'round') {
            const roundIndex = tournamentState.currentRoundIndex;
            const gameId = tournamentState.games[roundIndex];
            const gameData = gamelist.find(g => g.id === gameId);

            roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
            if (gameData) {
                gameTitleEl.textContent = gameData.title;
                gameMetadataEl.innerHTML = `
                    <p><strong>Développeur:</strong> ${gameData.developer || 'N/A'}</p>
                    <p><strong>Année:</strong> ${gameData.year || 'N/A'}</p>
                    <p><strong>Genre:</strong> ${gameData.genre || 'N/A'}</p>
                    <p><strong>Console:</strong> ${gameData.core || 'N/A'}</p>
                `;
            } else {
                gameTitleEl.textContent = gameId;
                gameMetadataEl.innerHTML = '';
            }

            roundSubtitleEl.textContent = roundIndex === 0 ? "Échauffement" : `Top ${tournamentState.currentCutoff} se qualifient`;
            gameCoverEl.src = `/games/${gameId}/cover.png`;
            const url = `https://bonjourarcade.com/b/${gameId}`;
            gameLinkEl.href = url; gameLinkTextEl.textContent = url;
            renderScoreboard();
            startScoreFetching();
            startTimer(tournamentState.remainingTime, onTick, endRound);
        } else if (tournamentState.status === 'pause') {
             roundTitleEl.textContent = "Pause";
             roundSubtitleEl.textContent = "";
             gameTitleEl.textContent = "";
             gameMetadataEl.innerHTML = "";
             gameCoverEl.src = '../assets/static.gif'; // Display static.gif
             gameCoverEl.alt = 'Animation statique de pause (reprise)'; // Set alt attribute
             gameCoverEl.style.display = 'block';
             renderScoreboard();
             startTimer(tournamentState.remainingTime, onTick, startNextRound);
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
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            localTestingOnlyDiv.style.display = 'block';
            simulatedPlayersInput.value = Math.floor(Math.random() * (20 - 4 + 1)) + 4;
        }
        await fetchGamelist();
        if (loadState() && tournamentState.status && tournamentState.status !== 'setup' && tournamentState.status !== 'finished') {
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
