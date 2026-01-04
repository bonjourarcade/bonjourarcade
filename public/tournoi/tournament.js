document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
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
    const scoreboardEntriesEl = document.getElementById('scoreboard-entries');

    const eliminationModal = document.getElementById('elimination-modal');
    const cutoffSuggestionEl = document.getElementById('cutoff-suggestion');
    const cutoffNumberInput = document.getElementById('cutoff-number');
    const confirmEliminationBtn = document.getElementById('confirm-elimination-btn');

    const winnerView = document.getElementById('winner-view');
    const winnerResultsEl = document.getElementById('winner-results');
    const restartTournamentBtn = document.getElementById('restart-tournament-btn');

    const endRoundSound = document.getElementById('end-round-sound');
    const cancelTournamentBtn = document.getElementById('cancel-tournament-btn');

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
    function clearState() { sessionStorage.removeItem(TOURNAMENT_STATE_KEY); tournamentState = {}; }

    // --- Localhost Simulation ---
    const fakePlayers = ["PlayerA", "PlayerB", "PlayerC", "PlayerD", "PlayerE", "PlayerF", "PlayerG", "PlayerH", "PlayerI", "PlayerJ", "PlayerK", "PlayerL", "PlayerM", "PlayerN", "PlayerO", "PlayerP"];
    function simulateScoreUpdates() {
        if (Object.keys(tournamentState.players).length === 0) {
            fakePlayers.forEach(name => { tournamentState.players[name] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false }; });
        }
        Object.values(tournamentState.players).forEach(p => {
            if (!p.eliminated && Math.random() < 0.3) { p.scores[tournamentState.currentRoundIndex] += Math.floor(Math.random() * 5000) + 100; }
        });
        renderScoreboard();
        saveState();
    }

    // --- Scoreboard & API ---
    async function fetchScores() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') { simulateScoreUpdates(); return; }
        const gameId = tournamentState.games[tournamentState.currentRoundIndex];
        if (!gameId) return;
        try {
            const r = await fetch('https://us-central1-alloarcade.cloudfunctions.net/listGameScores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "game_id": gameId }) });
            if (!r.ok) throw new Error(`API response not OK: ${r.status}`);
            const scores = await r.json();
            const roundStartTime = new Date(tournamentState.roundStartTime);
            scores.forEach(s => {
                if (new Date(s.timestamp) > roundStartTime) {
                    if (!tournamentState.players[s.player]) { tournamentState.players[s.player] = { scores: Array(tournamentState.games.length).fill(0), totalScore: 0, eliminated: false }; }
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
        const roundIndex = tournamentState.currentRoundIndex;
        const playersArray = Object.entries(tournamentState.players).map(([name, data]) => ({ name, score: data.scores[roundIndex] || 0, eliminated: data.eliminated }));
        
        // Sort players by score
        playersArray.sort((a, b) => b.score - a.score);

        const cutoff = tournamentState.currentCutoff;
        const isEliminationRound = tournamentState.status === 'round' && tournamentState.currentRoundIndex > 0;

        scoreboardEntriesEl.innerHTML = playersArray.map((p, i) => {
            let statusClass = '';
            if (p.eliminated) {
                statusClass = 'eliminated';
            } else if (isEliminationRound && cutoff > 0) {
                // Find the player's rank among non-eliminated players
                const activeRank = playersArray.filter(pl => !pl.eliminated).findIndex(pl => pl.name === p.name);
                if (activeRank < cutoff) {
                    statusClass = 'safe';
                } else {
                    statusClass = 'danger';
                }
            }
            return `<div class="scoreboard-entry ${statusClass}"><span class="rank">${i + 1}.</span><span class="player-name">${p.name}</span><span class="score">${p.score.toLocaleString()}</span></div>`;
        }).join('');
    }

    function startScoreFetching() { stopScoreFetching(); fetchScores(); const i = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 5000 : 30000; scoreFetchingInterval = setInterval(fetchScores, i); } 
    function stopScoreFetching() { clearInterval(scoreFetchingInterval); }

    // --- Timers & Round Progression ---
    function startTimer(duration, onTick, onEnd) { clearInterval(timerInterval); tournamentState.remainingTime = duration; timerInterval = setInterval(() => { tournamentState.remainingTime--; onTick(tournamentState.remainingTime); if (tournamentState.remainingTime <= 0) { clearInterval(timerInterval); onEnd(); } }, 1000); } 
    function updateTimerDisplay(time) { if (time < 0) time = 0; timerEl.textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; }

    function startNextRound() {
        tournamentState.currentRoundIndex++;
        const roundIndex = tournamentState.currentRoundIndex;

        if (roundIndex >= tournamentState.games.length) {
            endTournament();
            return;
        }

        // For warmup or final round, we don't ask for a cutoff.
        if (roundIndex === 0 || roundIndex >= tournamentState.games.length -1) {
            const activePlayers = Object.values(tournamentState.players).filter(p => !p.eliminated);
            tournamentState.currentCutoff = activePlayers.length; // Everyone is safe
            runRound();
        } else {
            showPreRoundModal();
        }
    }

    function runRound() {
        eliminationModal.style.display = 'none';
        goSound.play().catch(e => console.log("Audio play failed"));

        if (backgroundImages.length > 0) {
            const newBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
            tournamentState.currentBackground = newBg;
            document.body.style.backgroundImage = `url('${newBg}')`;
        }

        const roundIndex = tournamentState.currentRoundIndex;
        const gameId = tournamentState.games[roundIndex];
        tournamentState.status = 'round';
        tournamentState.roundStartTime = new Date().toISOString();
        
        // Set titles
        roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
        gameTitleEl.textContent = gameId;
        if (roundIndex > 0) {
            roundSubtitleEl.textContent = `Top ${tournamentState.currentCutoff} se qualifient`;
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
    
    function endRound() {
        stopScoreFetching();
        endRoundSound.play().catch(e => console.log("Audio play failed, user interaction needed."));

        const cutoff = tournamentState.currentCutoff;
        const roundIndex = tournamentState.currentRoundIndex;

        if (roundIndex > 0 && roundIndex < tournamentState.games.length - 1) { // No eliminations for warmup or final round
            const playersSorted = Object.entries(tournamentState.players)
                .sort(([, a], [, b]) => (b.scores[roundIndex] || 0) - (a.scores[roundIndex] || 0));
            
            const activePlayersSorted = playersSorted.filter(([, data]) => !data.eliminated);

            activePlayersSorted.forEach(([name], index) => {
                if (index >= cutoff) {
                    tournamentState.players[name].eliminated = true;
                }
            });
        }

        renderScoreboard();
        saveState();
        startPause();
    }
    
    function showPreRoundModal() {
        tournamentState.status = 'elimination'; // New state
        saveState();

        const activePlayers = Object.values(tournamentState.players).filter(p => !p.eliminated);
        
        let suggestion = Math.ceil(activePlayers.length / 2);
        suggestion = Math.max(suggestion, 2);

        cutoffSuggestionEl.textContent = `Suggestion: Top ${suggestion} (sur ${activePlayers.length} joueurs actifs)`;
        cutoffNumberInput.value = suggestion;
        eliminationModal.style.display = 'flex';
    }

    confirmEliminationBtn.addEventListener('click', () => {
        const cutoff = parseInt(cutoffNumberInput.value, 10);
        if (isNaN(cutoff) || cutoff < 1) {
            alert("Veuillez entrer un nombre valide.");
            return;
        }
        tournamentState.currentCutoff = cutoff;
        runRound();
    });

    function startPause() {
        eliminationModal.style.display = 'none';
        tournamentState.status = 'pause';
        saveState();
        roundTitleEl.textContent = "Pause";
        roundSubtitleEl.textContent = "La prochaine ronde commence bientôt...";
        gameTitleEl.textContent = ""; // Clear game title during pause
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
        let winnerHTML = '<h3>Podium</h3>';
        const podiumEmojis = ['🥇', '🥈', '🥉'];
        finalRoundScores.slice(0, 3).forEach((player, i) => {
            winnerHTML += `<div class="winner-entry"><span class="rank">${podiumEmojis[i]}</span><span class="player-name">${player.name}</span> <span class="score">(${player.score.toLocaleString()})</span></div>`;
        });
        
        if (cumulativeScores.length > 0) {
            winnerHTML += '<h3 style="margin-top: 30px;">Champion Cumulatif</h3>';
            winnerHTML += `<div class="winner-entry"><span class="rank">🏆</span><span class="player-name">${cumulativeScores[0].name}</span> <span class="score">(${cumulativeScores[0].totalScore.toLocaleString()})</span></div>`;
        }
        
        winnerResultsEl.innerHTML = winnerHTML;

        // --- Render Review Tabs ---
        reviewTabsEl.innerHTML = '';
        reviewScoreboardEl.innerHTML = '';
        tournamentState.games.forEach((gameId, index) => {
            const tab = document.createElement('button');
            tab.className = 'review-tab-btn';
            tab.textContent = `Ronde ${index + 1}`;
            tab.addEventListener('click', () => {
                showRoundResults(index);
                // Set active class
                document.querySelectorAll('.review-tab-btn').forEach(btn => btn.classList.remove('active'));
                tab.classList.add('active');
            });
            reviewTabsEl.appendChild(tab);
        });

        // Show first round by default
        if (tournamentState.games.length > 0) {
            showRoundResults(0);
            reviewTabsEl.firstChild.classList.add('active');
        }

        winnerView.style.display = 'flex';
        tournamentView.style.display = 'none';
    }

    function showRoundResults(roundIndex) {
        const players = Object.entries(tournamentState.players).map(([name, data]) => {
            // Find out if the player was eliminated *after* this specific round
            let wasEliminatedAfterThisRound = false;
            if (data.eliminated) {
                // Find the first round the player has a zero score after a non-zero score
                let foundScore = false;
                for(let i = roundIndex + 1; i < tournamentState.games.length; i++) {
                    if (data.scores[i] > 0) {
                        foundScore = true;
                        break;
                    }
                }
                if (!foundScore) { // This is a bit complex, let's simplify
                    // A simpler proxy: if they are eliminated now, were they active in this round?
                    // This isn't perfect, but good enough for review.
                }
            }
            return {
                name,
                score: data.scores[roundIndex] || 0,
                eliminated: data.eliminated // We'll just show their final eliminated status
            };
        });

        players.sort((a,b) => b.score - a.score);

        reviewScoreboardEl.innerHTML = players.map((p, i) => 
            `<div class="scoreboard-entry ${p.score === 0 ? 'eliminated' : ''}">
                <span class="rank">${i + 1}.</span>
                <span class="player-name">${p.name}</span>
                <span class="score">${p.score.toLocaleString()}</span>
            </div>`
        ).join('');
    }

    // --- Init & Event Listeners ---
    startTournamentBtn.addEventListener('click', () => {
        const gameIds = gameIdsTextarea.value.split('\n').map(id => id.trim()).filter(id => id);
        if (gameIds.length === 0) { alert("Veuillez entrer au moins un ID de jeu."); return; }
        tournamentState = {
            games: gameIds, roundDuration: parseFloat(roundDurationInput.value) * 60, pauseDuration: parseFloat(pauseDurationInput.value) * 60,
            currentRoundIndex: -1, players: {}, roundHistory: [], status: 'setup', remainingTime: 0, currentCutoff: 0
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
            roundTitleEl.textContent = `Ronde ${roundIndex + 1}`;
            roundSubtitleEl.textContent = roundIndex === 0 ? "Échauffement" : `Jeu: ${gameId}`;
            gameCoverEl.src = `/games/${gameId}/cover.png`;
            const url = `https://bonjourarcade.com/b/${gameId}`;
            gameLinkEl.href = url; gameLinkTextEl.textContent = url;
            renderScoreboard();
            startScoreFetching();
            startTimer(tournamentState.remainingTime, onTick, endRound);
        } else if (tournamentState.status === 'pause') {
             roundTitleEl.textContent = "Pause";
             roundSubtitleEl.textContent = "La prochaine ronde commence bientôt...";
             renderScoreboard();
             startTimer(tournamentState.remainingTime, onTick, startNextRound);
        } else if (tournamentState.status === 'elimination') {
            renderScoreboard();
            showPreRoundModal();
        }
    }

    function init() {
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