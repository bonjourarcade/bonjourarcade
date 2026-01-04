let steamAnimationInterval = null; // Declared globally
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
const pauseAnimationSvg = document.getElementById('pause-animation-svg');
const steam1 = document.getElementById('steam1');
const steam2 = document.getElementById('steam2');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');

    // Make steam animation functions globally accessible
    window.startSteamAnimation = function() {
        steam1.style.animation = 'steam-puff 2s infinite linear';
        steam2.style.animation = 'steam-puff 2s 1s infinite linear';
        pauseAnimationSvg.style.display = 'block';
    }

    window.stopSteamAnimation = function() {
        clearInterval(steamAnimationInterval); // Clear any existing interval
        steamAnimationInterval = null;
        steam1.style.animation = 'none';
        steam2.style.animation = 'none';
        pauseAnimationSvg.style.display = 'none';
    }


    // --- Config & State ---
    const TOURNAMENT_STATE_KEY = 'bonjourarcade_tournament_state';
    const backgroundImages = [
    'assets/backgrounds/1.png',
    'assets/backgrounds/10.jpg',
    'assets/backgrounds/10.png',
    'assets/backgrounds/100.png',
    'assets/backgrounds/101.png',
    'assets/backgrounds/102.png',
    'assets/backgrounds/103.png',
    'assets/backgrounds/104.png',
    'assets/backgrounds/105.png',
    'assets/backgrounds/106.png',
    'assets/backgrounds/107.png',
    'assets/backgrounds/108.png',
    'assets/backgrounds/109.png',
    'assets/backgrounds/11.jpg',
    'assets/backgrounds/11.png',
    'assets/backgrounds/110.png',
    'assets/backgrounds/111.png',
    'assets/backgrounds/112.png',
    'assets/backgrounds/113.png',
    'assets/backgrounds/114.png',
    'assets/backgrounds/115.png',
    'assets/backgrounds/116.png',
    'assets/backgrounds/117.png',
    'assets/backgrounds/118.png',
    'assets/backgrounds/119.png',
    'assets/backgrounds/12.jpg',
    'assets/backgrounds/12.png',
    'assets/backgrounds/120.png',
    'assets/backgrounds/122.png',
    'assets/backgrounds/123.png',
    'assets/backgrounds/124.png',
    'assets/backgrounds/125.png',
    'assets/backgrounds/126.png',
    'assets/backgrounds/127.png',
    'assets/backgrounds/128.png',
    'assets/backgrounds/129.png',
    'assets/backgrounds/13.png',
    'assets/backgrounds/130.png',
    'assets/backgrounds/131.png',
    'assets/backgrounds/132.png',
    'assets/backgrounds/133.png',
    'assets/backgrounds/134.png',
    'assets/backgrounds/135.png',
    'assets/backgrounds/136.png',
    'assets/backgrounds/137.png',
    'assets/backgrounds/138.png',
    'assets/backgrounds/139.png',
    'assets/backgrounds/14.jpg',
    'assets/backgrounds/14.png',
    'assets/backgrounds/140.png',
    'assets/backgrounds/141.png',
    'assets/backgrounds/142.png',
    'assets/backgrounds/143.png',
    'assets/backgrounds/144.png',
    'assets/backgrounds/145.png',
    'assets/backgrounds/146.png',
    'assets/backgrounds/147.png',
    'assets/backgrounds/148.png',
    'assets/backgrounds/149.png',
    'assets/backgrounds/15.jpg',
    'assets/backgrounds/15.png',
    'assets/backgrounds/150.png',
    'assets/backgrounds/151.png',
    'assets/backgrounds/152.png',
    'assets/backgrounds/154.png',
    'assets/backgrounds/155.png',
    'assets/backgrounds/156.png',
    'assets/backgrounds/157.png',
    'assets/backgrounds/159.png',
    'assets/backgrounds/16.png',
    'assets/backgrounds/160.png',
    'assets/backgrounds/161.png',
    'assets/backgrounds/162.png',
    'assets/backgrounds/163.png',
    'assets/backgrounds/164.png',
    'assets/backgrounds/165.png',
    'assets/backgrounds/166.png',
    'assets/backgrounds/167.png',
    'assets/backgrounds/168.png',
    'assets/backgrounds/17.jpg',
    'assets/backgrounds/17.png',
    'assets/backgrounds/170.png',
    'assets/backgrounds/171.png',
    'assets/backgrounds/172.png',
    'assets/backgrounds/173.png',
    'assets/backgrounds/174.png',
    'assets/backgrounds/176.png',
    'assets/backgrounds/177.png',
    'assets/backgrounds/178.png',
    'assets/backgrounds/179.png',
    'assets/backgrounds/18.png',
    'assets/backgrounds/180.png',
    'assets/backgrounds/181.png',
    'assets/backgrounds/182.png',
    'assets/backgrounds/183.png',
    'assets/backgrounds/184.png',
    'assets/backgrounds/185.png',
    'assets/backgrounds/186.png',
    'assets/backgrounds/187.png',
    'assets/backgrounds/188.png',
    'assets/backgrounds/189.png',
    'assets/backgrounds/19.png',
    'assets/backgrounds/190.png',
    'assets/backgrounds/191.png',
    'assets/backgrounds/192.png',
    'assets/backgrounds/193.png',
    'assets/backgrounds/194.png',
    'assets/backgrounds/195.png',
    'assets/backgrounds/196.png',
    'assets/backgrounds/1960_dot.jpg',
    'assets/backgrounds/197.png',
    'assets/backgrounds/198.png',
    'assets/backgrounds/199.png',
    'assets/backgrounds/2.png',
    'assets/backgrounds/20.png',
    'assets/backgrounds/200.png',
    'assets/backgrounds/201.png',
    'assets/backgrounds/203.png',
    'assets/backgrounds/204.png',
    'assets/backgrounds/205.png',
    'assets/backgrounds/206.png',
    'assets/backgrounds/207.png',
    'assets/backgrounds/208.png',
    'assets/backgrounds/209.png',
    'assets/backgrounds/21.jpg',
    'assets/backgrounds/21.png',
    'assets/backgrounds/210.png',
    'assets/backgrounds/211.png',
    'assets/backgrounds/212.png',
    'assets/backgrounds/213.png',
    'assets/backgrounds/214.png',
    'assets/backgrounds/215.png',
    'assets/backgrounds/216.png',
    'assets/backgrounds/217.png',
    'assets/backgrounds/218.png',
    'assets/backgrounds/219.png',
    'assets/backgrounds/22.jpg',
    'assets/backgrounds/22.png',
    'assets/backgrounds/220.png',
    'assets/backgrounds/221.png',
    'assets/backgrounds/222.png',
    'assets/backgrounds/223.png',
    'assets/backgrounds/224.png',
    'assets/backgrounds/225.png',
    'assets/backgrounds/226.png',
    'assets/backgrounds/227.png',
    'assets/backgrounds/228.png',
    'assets/backgrounds/229.png',
    'assets/backgrounds/23.jpg',
    'assets/backgrounds/23.png',
    'assets/backgrounds/230.png',
    'assets/backgrounds/231.png',
    'assets/backgrounds/232.png',
    'assets/backgrounds/233.png',
    'assets/backgrounds/234.png',
    'assets/backgrounds/235.png',
    'assets/backgrounds/236.png',
    'assets/backgrounds/237.png',
    'assets/backgrounds/238.png',
    'assets/backgrounds/239.png',
    'assets/backgrounds/24.png',
    'assets/backgrounds/240.png',
    'assets/backgrounds/241.png',
    'assets/backgrounds/242.png',
    'assets/backgrounds/243.png',
    'assets/backgrounds/244.png',
    'assets/backgrounds/245.png',
    'assets/backgrounds/246.png',
    'assets/backgrounds/247.png',
    'assets/backgrounds/248.png',
    'assets/backgrounds/249.png',
    'assets/backgrounds/25.jpg',
    'assets/backgrounds/250.png',
    'assets/backgrounds/251.png',
    'assets/backgrounds/252.png',
    'assets/backgrounds/253.png',
    'assets/backgrounds/254.png',
    'assets/backgrounds/255.png',
    'assets/backgrounds/256.png',
    'assets/backgrounds/257.png',
    'assets/backgrounds/259.png',
    'assets/backgrounds/26.jpg',
    'assets/backgrounds/26.png',
    'assets/backgrounds/260.png',
    'assets/backgrounds/262.png',
    'assets/backgrounds/263.png',
    'assets/backgrounds/264.png',
    'assets/backgrounds/265.png',
    'assets/backgrounds/266.png',
    'assets/backgrounds/267.png',
    'assets/backgrounds/268.png',
    'assets/backgrounds/269.png',
    'assets/backgrounds/27.jpg',
    'assets/backgrounds/27.png',
    'assets/backgrounds/270.png',
    'assets/backgrounds/271.png',
    'assets/backgrounds/272.png',
    'assets/backgrounds/273.png',
    'assets/backgrounds/274.png',
    'assets/backgrounds/275.png',
    'assets/backgrounds/276.png',
    'assets/backgrounds/277.png',
    'assets/backgrounds/278.png',
    'assets/backgrounds/279.png',
    'assets/backgrounds/28.png',
    'assets/backgrounds/280.png',
    'assets/backgrounds/281.png',
    'assets/backgrounds/282.png',
    'assets/backgrounds/283.png',
    'assets/backgrounds/284.png',
    'assets/backgrounds/285.png',
    'assets/backgrounds/286.png',
    'assets/backgrounds/287.png',
    'assets/backgrounds/288.png',
    'assets/backgrounds/289.png',
    'assets/backgrounds/29.png',
    'assets/backgrounds/290.png',
    'assets/backgrounds/291.png',
    'assets/backgrounds/292.png',
    'assets/backgrounds/293.png',
    'assets/backgrounds/294.png',
    'assets/backgrounds/295.png',
    'assets/backgrounds/296.png',
    'assets/backgrounds/297.png',
    'assets/backgrounds/298.png',
    'assets/backgrounds/3.png',
    'assets/backgrounds/30.jpg',
    'assets/backgrounds/30.png',
    'assets/backgrounds/305.png',
    'assets/backgrounds/306.png',
    'assets/backgrounds/308.png',
    'assets/backgrounds/31.png',
    'assets/backgrounds/313.png',
    'assets/backgrounds/316.png',
    'assets/backgrounds/317.png',
    'assets/backgrounds/318.png',
    'assets/backgrounds/319.png',
    'assets/backgrounds/32.png',
    'assets/backgrounds/320.png',
    'assets/backgrounds/321.png',
    'assets/backgrounds/322.png',
    'assets/backgrounds/323.png',
    'assets/backgrounds/324.png',
    'assets/backgrounds/325.png',
    'assets/backgrounds/326.png',
    'assets/backgrounds/327.png',
    'assets/backgrounds/328.png',
    'assets/backgrounds/329.png',
    'assets/backgrounds/33.png',
    'assets/backgrounds/330.png',
    'assets/backgrounds/332.png',
    'assets/backgrounds/333.png',
    'assets/backgrounds/334.png',
    'assets/backgrounds/335.png',
    'assets/backgrounds/336.png',
    'assets/backgrounds/337.png',
    'assets/backgrounds/338.png',
    'assets/backgrounds/339.png',
    'assets/backgrounds/34.jpg',
    'assets/backgrounds/34.png',
    'assets/backgrounds/340.png',
    'assets/backgrounds/341.png',
    'assets/backgrounds/342.png',
    'assets/backgrounds/343.png',
    'assets/backgrounds/344.png',
    'assets/backgrounds/345.png',
    'assets/backgrounds/346.png',
    'assets/backgrounds/347.png',
    'assets/backgrounds/348.png',
    'assets/backgrounds/349.png',
    'assets/backgrounds/35.jpg',
    'assets/backgrounds/35.png',
    'assets/backgrounds/350.png',
    'assets/backgrounds/351.png',
    'assets/backgrounds/352.png',
    'assets/backgrounds/353.png',
    'assets/backgrounds/354.png',
    'assets/backgrounds/355.png',
    'assets/backgrounds/356.png',
    'assets/backgrounds/357.png',
    'assets/backgrounds/358.png',
    'assets/backgrounds/359.png',
    'assets/backgrounds/36.jpg',
    'assets/backgrounds/36.png',
    'assets/backgrounds/360.png',
    'assets/backgrounds/361.png',
    'assets/backgrounds/362.png',
    'assets/backgrounds/363.png',
    'assets/backgrounds/364.png',
    'assets/backgrounds/365.png',
    'assets/backgrounds/366.png',
    'assets/backgrounds/367.png',
    'assets/backgrounds/368.png',
    'assets/backgrounds/37.png',
    'assets/backgrounds/370.png',
    'assets/backgrounds/371.png',
    'assets/backgrounds/372.png',
    'assets/backgrounds/373.png',
    'assets/backgrounds/374.png',
    'assets/backgrounds/375.png',
    'assets/backgrounds/376.png',
    'assets/backgrounds/377.png',
    'assets/backgrounds/378.png',
    'assets/backgrounds/379.png',
    'assets/backgrounds/38.jpg',
    'assets/backgrounds/38.png',
    'assets/backgrounds/380.png',
    'assets/backgrounds/381.png',
    'assets/backgrounds/382.png',
    'assets/backgrounds/383.png',
    'assets/backgrounds/385.png',
    'assets/backgrounds/386.png',
    'assets/backgrounds/387.png',
    'assets/backgrounds/388.png',
    'assets/backgrounds/389.png',
    'assets/backgrounds/39.png',
    'assets/backgrounds/390.png',
    'assets/backgrounds/391.png',
    'assets/backgrounds/392.png',
    'assets/backgrounds/393.png',
    'assets/backgrounds/394.png',
    'assets/backgrounds/395.png',
    'assets/backgrounds/396.png',
    'assets/backgrounds/397.png',
    'assets/backgrounds/398.png',
    'assets/backgrounds/399.png',
    'assets/backgrounds/4.jpg',
    'assets/backgrounds/4.png',
    'assets/backgrounds/40.jpg',
    'assets/backgrounds/40.png',
    'assets/backgrounds/400.png',
    'assets/backgrounds/401.png',
    'assets/backgrounds/402.png',
    'assets/backgrounds/403.png',
    'assets/backgrounds/404.png',
    'assets/backgrounds/405.png',
    'assets/backgrounds/406.png',
    'assets/backgrounds/407.png',
    'assets/backgrounds/408.png',
    'assets/backgrounds/409.png',
    'assets/backgrounds/41.png',
    'assets/backgrounds/410.png',
    'assets/backgrounds/411.png',
    'assets/backgrounds/412.png',
    'assets/backgrounds/414.png',
    'assets/backgrounds/415.png',
    'assets/backgrounds/416.png',
    'assets/backgrounds/418.png',
    'assets/backgrounds/419.png',
    'assets/backgrounds/42.jpg',
    'assets/backgrounds/42.png',
    'assets/backgrounds/420.png',
    'assets/backgrounds/421.png',
    'assets/backgrounds/422.png',
    'assets/backgrounds/423.png',
    'assets/backgrounds/424.png',
    'assets/backgrounds/425.png',
    'assets/backgrounds/426.png',
    'assets/backgrounds/427.png',
    'assets/backgrounds/428.png',
    'assets/backgrounds/429.png',
    'assets/backgrounds/43.jpg',
    'assets/backgrounds/43.png',
    'assets/backgrounds/430.png',
    'assets/backgrounds/431.png',
    'assets/backgrounds/432.png',
    'assets/backgrounds/433.png',
    'assets/backgrounds/434.png',
    'assets/backgrounds/435.png',
    'assets/backgrounds/44.jpg',
    'assets/backgrounds/44.png',
    'assets/backgrounds/45.jpg',
    'assets/backgrounds/45.png',
    'assets/backgrounds/46.jpg',
    'assets/backgrounds/46.png',
    'assets/backgrounds/47.png',
    'assets/backgrounds/48.png',
    'assets/backgrounds/49.png',
    'assets/backgrounds/5.png',
    'assets/backgrounds/50.jpg',
    'assets/backgrounds/50.png',
    'assets/backgrounds/51.jpg',
    'assets/backgrounds/51.png',
    'assets/backgrounds/52.png',
    'assets/backgrounds/53.png',
    'assets/backgrounds/54.jpg',
    'assets/backgrounds/54.png',
    'assets/backgrounds/55.png',
    'assets/backgrounds/56.jpg',
    'assets/backgrounds/56.png',
    'assets/backgrounds/57.jpg',
    'assets/backgrounds/57.png',
    'assets/backgrounds/58.jpg',
    'assets/backgrounds/58.png',
    'assets/backgrounds/59.jpg',
    'assets/backgrounds/59.png',
    'assets/backgrounds/6.jpg',
    'assets/backgrounds/6.png',
    'assets/backgrounds/60.png',
    'assets/backgrounds/61.png',
    'assets/backgrounds/63.png',
    'assets/backgrounds/64.png',
    'assets/backgrounds/65.png',
    'assets/backgrounds/66.png',
    'assets/backgrounds/67.png',
    'assets/backgrounds/68.png',
    'assets/backgrounds/69.png',
    'assets/backgrounds/7.jpg',
    'assets/backgrounds/7.png',
    'assets/backgrounds/70.png',
    'assets/backgrounds/70s_marb.jpg',
    'assets/backgrounds/71.png',
    'assets/backgrounds/72.png',
    'assets/backgrounds/73.png',
    'assets/backgrounds/74.png',
    'assets/backgrounds/75.png',
    'assets/backgrounds/76.png',
    'assets/backgrounds/77.png',
    'assets/backgrounds/78.png',
    'assets/backgrounds/79.png',
    'assets/backgrounds/8.png',
    'assets/backgrounds/80.png',
    'assets/backgrounds/81.png',
    'assets/backgrounds/82.png',
    'assets/backgrounds/83.png',
    'assets/backgrounds/84.png',
    'assets/backgrounds/85.png',
    'assets/backgrounds/86.png',
    'assets/backgrounds/87.png',
    'assets/backgrounds/88.png',
    'assets/backgrounds/89.png',
    'assets/backgrounds/9.png',
    'assets/backgrounds/90.png',
    'assets/backgrounds/91.png',
    'assets/backgrounds/93.png',
    'assets/backgrounds/94.png',
    'assets/backgrounds/95.png',
    'assets/backgrounds/96.png',
    'assets/backgrounds/97.png',
    'assets/backgrounds/98.png',
    'assets/backgrounds/99.png',
    'assets/backgrounds/aftex.gif',
    'assets/backgrounds/alienegg.jpg',
    'assets/backgrounds/alienlan.jpg',
    'assets/backgrounds/aqua.gif',
    'assets/backgrounds/atoms.jpg',
    'assets/backgrounds/atoms2.jpg',
    'assets/backgrounds/b.jpg',
    'assets/backgrounds/b2.jpg',
    'assets/backgrounds/back10.jpg',
    'assets/backgrounds/back2.jpg',
    'assets/backgrounds/back3.jpg',
    'assets/backgrounds/bchback.gif',
    'assets/backgrounds/bg_blu.jpg',
    'assets/backgrounds/bg1.gif',
    'assets/backgrounds/bgHallown.jpg',
    'assets/backgrounds/blue_mar.gif',
    'assets/backgrounds/blue_mar.jpg',
    'assets/backgrounds/blue_roc.gif',
    'assets/backgrounds/blue_roc.jpg',
    'assets/backgrounds/blue_wea.gif',
    'assets/backgrounds/blue_wea.jpg',
    'assets/backgrounds/blueblob.jpg',
    'assets/backgrounds/bluehorz.gif',
    'assets/backgrounds/blueland.jpg',
    'assets/backgrounds/bluesky.jpg',
    'assets/backgrounds/blueston.jpg',
    'assets/backgrounds/bluesurf.gif',
    'assets/backgrounds/bluesurf.jpg',
    'assets/backgrounds/bluewall.jpg',
    'assets/backgrounds/bluewave.jpg',
    'assets/backgrounds/blumaz.gif',
    'assets/backgrounds/bow-tile.jpg',
    'assets/backgrounds/bowtie.jpg',
    'assets/backgrounds/brikface.gif',
    'assets/backgrounds/brix.gif',
    'assets/backgrounds/brushed_.jpg',
    'assets/backgrounds/bubbles.gif',
    'assets/backgrounds/bumps1.jpg',
    'assets/backgrounds/bumps2.jpg',
    'assets/backgrounds/bumps3.jpg',
    'assets/backgrounds/bumpygre.jpg',
    'assets/backgrounds/burst.gif',
    'assets/backgrounds/chalk.jpg',
    'assets/backgrounds/chokswrl.gif',
    'assets/backgrounds/circles.gif',
    'assets/backgrounds/circuit.jpg',
    'assets/backgrounds/clouds.jpg',
    'assets/backgrounds/cmc11.jpg',
    'assets/backgrounds/cool_til.gif',
    'assets/backgrounds/copper.jpg',
    'assets/backgrounds/corkbrd.jpg',
    'assets/backgrounds/corrugat.jpg',
    'assets/backgrounds/Count.png',
    'assets/backgrounds/cyber.jpg',
    'assets/backgrounds/deepblue.jpg',
    'assets/backgrounds/diagrids.jpg',
    'assets/backgrounds/diamond.gif',
    'assets/backgrounds/dirt.jpg',
    'assets/backgrounds/dirtwatr.jpg',
    'assets/backgrounds/divit.jpg',
    'assets/backgrounds/embossed.jpg',
    'assets/backgrounds/ether.jpg',
    'assets/backgrounds/f.jpg',
    'assets/backgrounds/fallfeat.jpg',
    'assets/backgrounds/fire.gif',
    'assets/backgrounds/fire1.jpg',
    'assets/backgrounds/fireg.jpg',
    'assets/backgrounds/firering.jpg',
    'assets/backgrounds/flagston.jpg',
    'assets/backgrounds/fractalwood.jpg',
    'assets/backgrounds/funkyblu.jpg',
    'assets/backgrounds/funkybum.jpg',
    'assets/backgrounds/goo.jpg',
    'assets/backgrounds/granite.gif',
    'assets/backgrounds/granite.jpg',
    'assets/backgrounds/gray_alu.jpg',
    'assets/backgrounds/gray_fab.jpg',
    'assets/backgrounds/gray_roc.jpg',
    'assets/backgrounds/gray_stu.jpg',
    'assets/backgrounds/gray.jpg',
    'assets/backgrounds/graybump.jpg',
    'assets/backgrounds/graypock.jpg',
    'assets/backgrounds/graystre.jpg',
    'assets/backgrounds/graystuc.jpg',
    'assets/backgrounds/graytire.jpg',
    'assets/backgrounds/graywaff.jpg',
    'assets/backgrounds/green_st.jpg',
    'assets/backgrounds/green-ri.jpg',
    'assets/backgrounds/greendot.jpg',
    'assets/backgrounds/greenred.jpg',
    'assets/backgrounds/greeny.jpg',
    'assets/backgrounds/grey_dot.jpg',
    'assets/backgrounds/greydots.gif',
    'assets/backgrounds/grn_roc.jpg',
    'assets/backgrounds/grysatin.jpg',
    'assets/backgrounds/heirog2.gif',
    'assets/backgrounds/heirog3.gif',
    'assets/backgrounds/heirogl.gif',
    'assets/backgrounds/icywater.jpg',
    'assets/backgrounds/kanji1.gif',
    'assets/backgrounds/lava1.jpg',
    'assets/backgrounds/lava2.jpg',
    'assets/backgrounds/lavender.jpg',
    'assets/backgrounds/light.jpg',
    'assets/backgrounds/lightb1.jpg',
    'assets/backgrounds/lipurple_weave.gif',
    'assets/backgrounds/lipurple.jpg',
    'assets/backgrounds/love.jpg',
    'assets/backgrounds/lumps.jpg',
    'assets/backgrounds/marb1.gif',
    'assets/backgrounds/marble.gif',
    'assets/backgrounds/marble.jpg',
    'assets/backgrounds/marble2.jpg',
    'assets/backgrounds/marbled_.jpg',
    'assets/backgrounds/marbled.jpg',
    'assets/backgrounds/marrolls.jpg',
    'assets/backgrounds/mazes.jpg',
    'assets/backgrounds/moocow.gif',
    'assets/backgrounds/multi1.jpg',
    'assets/backgrounds/multi2.jpg',
    'assets/backgrounds/multicolor2_rock.gif',
    'assets/backgrounds/nightmar.jpg',
    'assets/backgrounds/orange_paper.gif',
    'assets/backgrounds/paper.jpg',
    'assets/backgrounds/parquet.jpg',
    'assets/backgrounds/parquet2.jpg',
    'assets/backgrounds/pat.gif',
    'assets/backgrounds/pgreen.jpg',
    'assets/backgrounds/pink_fab.jpg',
    'assets/backgrounds/pinkflam.jpg',
    'assets/backgrounds/purpgls.jpg',
    'assets/backgrounds/purpgls1.jpg',
    'assets/backgrounds/purple_g.jpg',
    'assets/backgrounds/purple_m.jpg',
    'assets/backgrounds/purple.jpg',
    'assets/backgrounds/purplebl.jpg',
    'assets/backgrounds/purplem1.jpg',
    'assets/backgrounds/purpletr.jpg',
    'assets/backgrounds/purpnblu.gif',
    'assets/backgrounds/rain.jpg',
    'assets/backgrounds/rainbow.jpg',
    'assets/backgrounds/raindrl.jpg',
    'assets/backgrounds/raindrop.jpg',
    'assets/backgrounds/red_roc.jpg',
    'assets/backgrounds/red_stuc.jpg',
    'assets/backgrounds/red_stucco.gif',
    'assets/backgrounds/redbrick.gif',
    'assets/backgrounds/redcouch.jpg',
    'assets/backgrounds/reddots.jpg',
    'assets/backgrounds/redgray.jpg',
    'assets/backgrounds/redmarble.jpg',
    'assets/backgrounds/rivet2.gif',
    'assets/backgrounds/rivet3.gif',
    'assets/backgrounds/rivet5.gif',
    'assets/backgrounds/rivet6.gif',
    'assets/backgrounds/rivets.gif',
    'assets/backgrounds/ropeweav.jpg',
    'assets/backgrounds/sandman.jpg',
    'assets/backgrounds/sandston.jpg',
    'assets/backgrounds/scotch.gif',
    'assets/backgrounds/scrnm_dr.jpg',
    'assets/backgrounds/slate.jpg',
    'assets/backgrounds/slate2.jpg',
    'assets/backgrounds/smblue_r.jpg',
    'assets/backgrounds/smgreen.gif',
    'assets/backgrounds/smgreen.jpg',
    'assets/backgrounds/snails.jpg',
    'assets/backgrounds/space1.gif',
    'assets/backgrounds/spec1.gif',
    'assets/backgrounds/spheres.gif',
    'assets/backgrounds/spikey.gif',
    'assets/backgrounds/starry.jpg',
    'assets/backgrounds/stars.gif',
    'assets/backgrounds/stars.jpg',
    'assets/backgrounds/stars2.gif',
    'assets/backgrounds/stucco.gif',
    'assets/backgrounds/summer_paper.gif',
    'assets/backgrounds/sunburst.gif',
    'assets/backgrounds/sunburst.jpg',
    'assets/backgrounds/sunlight.jpg',
    'assets/backgrounds/tan_paper.gif',
    'assets/backgrounds/tanblue.jpg',
    'assets/backgrounds/tapb.jpg',
    'assets/backgrounds/tapestry.jpg',
    'assets/backgrounds/teal_paper.gif',
    'assets/backgrounds/tex1.gif',
    'assets/backgrounds/tex13.gif',
    'assets/backgrounds/tex14.gif',
    'assets/backgrounds/tex16.gif',
    'assets/backgrounds/tex2.gif',
    'assets/backgrounds/tex20.gif',
    'assets/backgrounds/tex22.gif',
    'assets/backgrounds/tex23.gif',
    'assets/backgrounds/tex24.gif',
    'assets/backgrounds/tex25.gif',
    'assets/backgrounds/tex4.gif',
    'assets/backgrounds/tex6.gif',
    'assets/backgrounds/tex9.gif',
    'assets/backgrounds/theblues.gif',
    'assets/backgrounds/thereds.gif',
    'assets/backgrounds/tile.jpg',
    'assets/backgrounds/tile2.jpg',
    'assets/backgrounds/tiles.gif',
    'assets/backgrounds/turtshel.gif',
    'assets/backgrounds/vapor.jpg',
    'assets/backgrounds/wall.jpg',
    'assets/backgrounds/wall4.jpg',
    'assets/backgrounds/walnut.jpg',
    'assets/backgrounds/wl.jpg',
    'assets/backgrounds/wood.jpg',
    'assets/backgrounds/wood1.jpg',
    'assets/backgrounds/wood2.jpg',
    'assets/backgrounds/yell_roc.jpg',
    'assets/backgrounds/yellow_f.jpg',
    'assets/backgrounds/yellow_fabric.gif',
    'assets/backgrounds/yellow_s.jpg',
    'assets/backgrounds/yellow_w.jpg',
    'assets/backgrounds/yellow_weave.gif',
    'assets/backgrounds/yellowwall.jpg',
    'assets/backgrounds/yelonblu.gif',
    'assets/backgrounds/zigzag.gif',
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
            scores.forEach(s => {
                if (new Date(s.timestamp) > roundStartTime) {
                    if (!tournamentState.players[s.player]) { tournamentState.players[s.player] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false, eliminatedRound: null }; }
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

        if (tournamentState.status === 'pause') {
            const currentRoundIndex = tournamentState.currentRoundIndex;
            const nextCutoff = tournamentState.cutoffs[currentRoundIndex + 1]; // Cutoff for the round that just ended

            const cumulativeScores = Object.entries(tournamentState.players).map(([name, data]) => {
                const totalScore = data.scores.slice(0, currentRoundIndex + 1).reduce((sum, score) => sum + score, 0); // Scores up to and including the current round
                return { name, totalScore, eliminated: data.eliminated };
            }).sort((a, b) => b.totalScore - a.totalScore); // Sort by cumulative score

            const activePlayersCumulative = cumulativeScores.filter(p => !p.eliminated);
            const eliminatedPlayersCumulative = cumulativeScores.filter(p => p.eliminated);

            let scoreboardHTML = '';

            // Add clarification for cumulative scores
            scoreboardHTML += '<div class="cumulative-score-clarification">Scores cumulés jusqu\'à la ronde actuelle.</div>';

            // Section for Active Players
            if (activePlayersCumulative.length > 0) {
                scoreboardHTML += '<div class="scoreboard-section-title">Joueurs Actifs</div>';
                scoreboardHTML += activePlayersCumulative.map((p, i) => {
                    // No statusClass for active players during pause, as per previous decision
                    return `<div class="scoreboard-entry"><span class="rank">${i + 1}.</span><span class="player-name">${p.name}</span><span class="score">${p.totalScore.toLocaleString()}</span></div>`;
                }).join('');
            }

            // Section for Eliminated Players
            if (eliminatedPlayersCumulative.length > 0) {
                // Add a visual separator or different styling for eliminated players
                scoreboardHTML += '<div class="scoreboard-section-title eliminated-section-title">Joueurs Éliminés</div>';
                scoreboardHTML += eliminatedPlayersCumulative.map((p, i) => {
                    // Mark eliminated players with 'eliminated' class
                    // Their rank continues from the last active player
                    return `<div class="scoreboard-entry eliminated"><span class="rank">${activePlayersCumulative.length + i + 1}.</span><span class="player-name">${p.name}</span><span class="score">${p.totalScore.toLocaleString()}</span></div>`;
                }).join('');
            }

            scoreboardEntriesEl.innerHTML = scoreboardHTML;

        } else { // Normal round display
            const roundIndex = tournamentState.currentRoundIndex;
            const playersArray = Object.entries(tournamentState.players).map(([name, data]) => ({ name, score: data.scores[roundIndex] || 0, eliminated: data.eliminated }));
            
            // Sort players by score
            playersArray.sort((a, b) => b.score - a.score);

            const cutoff = tournamentState.currentCutoff;
            const isEliminationRound = tournamentState.status === 'round' && tournamentState.currentRoundIndex > 0;

            scoreboardEntriesEl.innerHTML = playersArray.map((p, i) => {
                let statusClass = '';
                // let statusText = ''; // Removed statusText for during round as well, per user request
                if (p.eliminated) {
                    statusClass = 'eliminated';
                    // statusText = 'Éliminé';
                } else if (isEliminationRound && cutoff > 0) {
                    const activeRank = playersArray.filter(pl => !pl.eliminated).findIndex(pl => pl.name === p.name);
                    if (activeRank < cutoff) {
                        statusClass = 'safe';
                        // statusText = 'Qualifié';
                    } else {
                        statusClass = 'danger';
                        // statusText = 'Non qualifié';
                    }
                }
                // Removed `${statusText ? `<span class="status">${statusText}</span>` : ''}`
                return `<div class="scoreboard-entry ${statusClass}"><span class="rank">${i + 1}.</span><span class="player-name">${p.name}</span><span class="score">${p.score.toLocaleString()}</span></div>`;
            }).join('');
        }
    }

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
            tournamentState.currentCutoff = tournamentState.cutoffs[roundIndex];
        } else {
             const activePlayers = Object.values(tournamentState.players).filter(p => !p.eliminated);
             tournamentState.currentCutoff = activePlayers.length;
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
        pauseAnimationSvg.style.display = 'none';
        stopSteamAnimation();

        // Show the countdown overlay and static.gif
        countdownOverlay.style.display = 'flex';
        gameCoverEl.src = 'assets/static.gif';
        gameCoverEl.alt = 'Animation statique de compte à rebours'; // Set alt attribute
        gameCoverEl.style.display = 'block';
        console.log('startCountdown: gameCoverEl src set to', gameCoverEl.src, 'display:', gameCoverEl.style.display);

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
        stopSteamAnimation();
        pauseAnimationSvg.style.display = 'none';
        gameCoverEl.style.display = 'block'; // Ensure game cover is visible


        if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg;
            document.body.style.backgroundImage = `url('${newBg}')`;
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
        gameCoverEl.src = 'assets/static.gif';
        gameCoverEl.alt = 'Animation statique de pause'; // Set alt attribute
        gameCoverEl.style.display = 'block';
        console.log('startPause: gameCoverEl src set to', gameCoverEl.src, 'display:', gameCoverEl.style.display);
        pauseAnimationSvg.style.display = 'none';
        stopSteamAnimation();
        renderScoreboard(); // Call renderScoreboard to display cumulative results and qualification status
        startTimer(tournamentState.pauseDuration, updateTimerDisplay, startNextRound);
    }

    function endTournament() {
        tournamentState.status = 'finished';
        saveState();
        
        // --- Winner Calculation ---
        const finalRoundIndex = tournamentState.games.length - 1;
        const finalRoundScores = Object.entries(tournamentState.players)
            .filter(([, data]) => !data.eliminated)
            .map(([name, data]) => ({ name, score: data.scores[finalRoundIndex] || 0 }))
            .sort((a, b) => b.score - a.score);

        const cumulativeScores = Object.entries(tournamentState.players).map(([name, data]) => {
            const totalScore = data.scores.reduce((sum, score) => sum + score, 0);
            data.totalScore = totalScore;
            return { name, totalScore };
        }).sort((a, b) => b.totalScore - a.totalScore);
        
        // --- Render Winners ---
        let winnerHTML = '<h3 style="text-align: center;">Podium</h3>';
        winnerHTML += '<div style="text-align: center;">'; // Add centering div for podium
        const podiumEmojis = ['🥇', '🥈', '🥉'];
        const medalColorsClasses = ['gold', 'silver', 'bronze']; // New array for classes
        finalRoundScores.slice(0, 3).forEach((player, i) => {
            const medalClass = medalColorsClasses[i] || ''; // Get class based on rank
            winnerHTML += `<div class="winner-entry ${medalClass}"><span class="rank">${podiumEmojis[i]}</span><span class="player-name">${player.name}</span></div>`;
        });
        winnerHTML += '</div>'; // Close centering div

        if (cumulativeScores.length > 0) {
            winnerHTML += '<h3 style="margin-top: 30px; text-align: center;">Champion Cumulatif</h3>';
            winnerHTML += '<div style="text-align: center;">'; // Add centering div for cumulative champion
            winnerHTML += `<div class="winner-entry"><span class="rank">🏆</span><span class="player-name">${cumulativeScores[0].name}</span> <span class="score">(${cumulativeScores[0].totalScore.toLocaleString()})</span></div>`;
            winnerHTML += '</div>'; // Close centering div
        }
        
        // --- Render Cumulative Scores Table ---
        if (cumulativeScores.length > 1) { // Only show table if there's more than one player
            winnerHTML += '<h3 style="margin-top: 30px; text-align: center;">Tous les scores cumulatifs</h3>';
            winnerHTML += '<div class="cumulative-scores-table-container">';
            winnerHTML += '<table class="cumulative-scores-table">';
            winnerHTML += '<thead><tr><th>Rang</th><th>Joueur</th><th>Score Total</th></tr></thead>';
            winnerHTML += '<tbody>';
            cumulativeScores.forEach((player, i) => {
                winnerHTML += `<tr><td>${i + 1}.</td><td>${player.name}</td><td>${player.totalScore.toLocaleString()}</td></tr>`;
            });
            winnerHTML += '</tbody>';
            winnerHTML += '</table>';
            winnerHTML += '</div>';
        }
        
        winnerResultsEl.innerHTML = winnerHTML;

        const reviewContainer = document.getElementById('review-container');
        reviewContainer.innerHTML = '<h4>Revoir les rondes</h4>'; // Clear previous content

        const allPlayers = Object.keys(tournamentState.players);
        
        const tableContainer = document.createElement('div');
        tableContainer.style.display = 'flex';
        tableContainer.style.gap = '20px';
        tableContainer.style.overflowX = 'auto';

        tournamentState.games.forEach((gameId, roundIndex) => {
            const gameData = gamelist.find(g => g.id === gameId);
            const roundTable = document.createElement('div');
            roundTable.className = 'review-round-table';

            let tableHTML = `<div class="review-round-title">${gameData ? gameData.title : gameId}</div>`;
            
            const playersForRound = allPlayers.map(name => {
                return {
                    name,
                    score: tournamentState.players[name].scores[roundIndex] || 0
                };
            }).sort((a, b) => b.score - a.score);

            playersForRound.forEach(p => {
                const playerEliminatedRound = tournamentState.players[p.name].eliminatedRound;
                const isEliminatedInThisRoundOrEarlier = (typeof playerEliminatedRound === 'number' && playerEliminatedRound <= roundIndex);
                const eliminatedClass = isEliminatedInThisRoundOrEarlier ? 'eliminated-in-review' : '';
                tableHTML += `<div class="review-entry ${eliminatedClass}"><span class="player-name">${p.name}</span><span class="score">${p.score.toLocaleString()}</span></div>`;
            });
            
            roundTable.innerHTML = tableHTML;
            tableContainer.appendChild(roundTable);
        });

        reviewContainer.appendChild(tableContainer);

        winnerView.style.display = 'flex';
        tournamentView.style.display = 'none';
    }

    // --- Init & Event Listeners ---
    generateGamesBtn.addEventListener('click', () => {
        const numGames = parseInt(numGamesInput.value, 10);
        if (isNaN(numGames) || numGames < 1) {
            alert("Veuillez entrer un nombre de jeux valide.");
            return;
        }

        const scoreEnabledGames = gamelist.filter(g => g.enable_score);
        
        // Shuffle the array
        for (let i = scoreEnabledGames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scoreEnabledGames[i], scoreEnabledGames[j]] = [scoreEnabledGames[j], scoreEnabledGames[i]];
        }

        const selectedGames = scoreEnabledGames.slice(0, numGames);
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
            document.body.style.backgroundImage = `url('${tournamentState.currentBackground}')`;
        } else if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg; // Set it for future saves
            document.body.style.backgroundImage = `url('${newBg}')`;
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
             gameCoverEl.src = '/assets/static.gif'; // Display static.gif
             gameCoverEl.alt = 'Animation statique de pause (reprise)'; // Set alt attribute
             gameCoverEl.style.display = 'block';
             console.log('resumeTournament (pause): gameCoverEl src set to', gameCoverEl.src, 'display:', gameCoverEl.style.display);
             pauseAnimationSvg.style.display = 'none'; // Hide SVG
             startSteamAnimation(); // Keep steam animation for pause
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
