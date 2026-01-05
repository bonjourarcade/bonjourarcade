document.addEventListener('DOMContentLoaded', () => {
    const resultsDataString = sessionStorage.getItem('bonjourarcade_tournament_results');
    const backgroundImages = [
        'assets/backgrounds/1.png', 'assets/backgrounds/10.jpg', 'assets/backgrounds/10.png', 'assets/backgrounds/100.png', 'assets/backgrounds/101.png', 'assets/backgrounds/102.png', 'assets/backgrounds/103.png', 'assets/backgrounds/104.png', 'assets/backgrounds/105.png', 'assets/backgrounds/106.png', 'assets/backgrounds/107.png', 'assets/backgrounds/108.png', 'assets/backgrounds/109.png', 'assets/backgrounds/11.jpg', 'assets/backgrounds/11.png', 'assets/backgrounds/110.png', 'assets/backgrounds/111.png', 'assets/backgrounds/112.png', 'assets/backgrounds/113.png', 'assets/backgrounds/114.png', 'assets/backgrounds/115.png', 'assets/backgrounds/116.png', 'assets/backgrounds/117.png', 'assets/backgrounds/118.png', 'assets/backgrounds/119.png', 'assets/backgrounds/12.jpg', 'assets/backgrounds/12.png', 'assets/backgrounds/120.png', 'assets/backgrounds/122.png', 'assets/backgrounds/123.png', 'assets/backgrounds/124.png', 'assets/backgrounds/125.png', 'assets/backgrounds/126.png', 'assets/backgrounds/127.png', 'assets/backgrounds/128.png', 'assets/backgrounds/129.png', 'assets/backgrounds/13.png', 'assets/backgrounds/130.png', 'assets/backgrounds/131.png', 'assets/backgrounds/132.png', 'assets/backgrounds/133.png', 'assets/backgrounds/134.png', 'assets/backgrounds/135.png', 'assets/backgrounds/136.png', 'assets/backgrounds/137.png', 'assets/backgrounds/138.png', 'assets/backgrounds/139.png', 'assets/backgrounds/14.jpg', 'assets/backgrounds/14.png', 'assets/backgrounds/140.png', 'assets/backgrounds/141.png', 'assets/backgrounds/142.png', 'assets/backgrounds/143.png', 'assets/backgrounds/144.png', 'assets/backgrounds/145.png', 'assets/backgrounds/146.png', 'assets/backgrounds/147.png', 'assets/backgrounds/148.png', 'assets/backgrounds/149.png', 'assets/backgrounds/15.jpg', 'assets/backgrounds/15.png', 'assets/backgrounds/150.png', 'assets/backgrounds/151.png', 'assets/backgrounds/152.png', 'assets/backgrounds/154.png', 'assets/backgrounds/155.png', 'assets/backgrounds/156.png', 'assets/backgrounds/157.png', 'assets/backgrounds/159.png', 'assets/backgrounds/16.png', 'assets/backgrounds/160.png', 'assets/backgrounds/161.png', 'assets/backgrounds/162.png', 'assets/backgrounds/163.png', 'assets/backgrounds/164.png', 'assets/backgrounds/165.png', 'assets/backgrounds/166.png', 'assets/backgrounds/167.png', 'assets/backgrounds/168.png', 'assets/backgrounds/17.jpg', 'assets/backgrounds/17.png', 'assets/backgrounds/170.png', 'assets/backgrounds/171.png', 'assets/backgrounds/172.png', 'assets/backgrounds/173.png', 'assets/backgrounds/174.png', 'assets/backgrounds/176.png', 'assets/backgrounds/177.png', 'assets/backgrounds/178.png', 'assets/backgrounds/179.png', 'assets/backgrounds/18.png', 'assets/backgrounds/180.png', 'assets/backgrounds/181.png', 'assets/backgrounds/182.png', 'assets/backgrounds/183.png', 'assets/backgrounds/184.png', 'assets/backgrounds/185.png', 'assets/backgrounds/186.png', 'assets/backgrounds/187.png', 'assets/backgrounds/188.png', 'assets/backgrounds/189.png', 'assets/backgrounds/19.png', 'assets/backgrounds/190.png', 'assets/backgrounds/191.png', 'assets/backgrounds/192.png', 'assets/backgrounds/193.png', 'assets/backgrounds/194.png', 'assets/backgrounds/195.png', 'assets/backgrounds/196.png', 'assets/backgrounds/1960_dot.jpg', 'assets/backgrounds/197.png', 'assets/backgrounds/198.png', 'assets/backgrounds/199.png', 'assets/backgrounds/2.png', 'assets/backgrounds/20.png', 'assets/backgrounds/200.png', 'assets/backgrounds/201.png', 'assets/backgrounds/203.png', 'assets/backgrounds/204.png', 'assets/backgrounds/205.png', 'assets/backgrounds/206.png', 'assets/backgrounds/207.png', 'assets/backgrounds/208.png', 'assets/backgrounds/209.png', 'assets/backgrounds/21.jpg', 'assets/backgrounds/21.png', 'assets/backgrounds/210.png', 'assets/backgrounds/211.png', 'assets/backgrounds/212.png', 'assets/backgrounds/213.png', 'assets/backgrounds/214.png', 'assets/backgrounds/215.png', 'assets/backgrounds/216.png', 'assets/backgrounds/217.png', 'assets/backgrounds/218.png', 'assets/backgrounds/219.png', 'assets/backgrounds/22.jpg', 'assets/backgrounds/22.png', 'assets/backgrounds/220.png', 'assets/backgrounds/221.png', 'assets/backgrounds/222.png', 'assets/backgrounds/223.png', 'assets/backgrounds/224.png', 'assets/backgrounds/225.png', 'assets/backgrounds/226.png', 'assets/backgrounds/227.png', 'assets/backgrounds/228.png', 'assets/backgrounds/229.png', 'assets/backgrounds/23.jpg', 'assets/backgrounds/23.png', 'assets/backgrounds/230.png', 'assets/backgrounds/231.png', 'assets/backgrounds/232.png', 'assets/backgrounds/233.png', 'assets/backgrounds/234.png', 'assets/backgrounds/235.png', 'assets/backgrounds/236.png', 'assets/backgrounds/237.png', 'assets/backgrounds/238.png', 'assets/backgrounds/239.png', 'assets/backgrounds/24.png', 'assets/backgrounds/240.png', 'assets/backgrounds/241.png', 'assets/backgrounds/242.png', 'assets/backgrounds/243.png', 'assets/backgrounds/244.png', 'assets/backgrounds/245.png', 'assets/backgrounds/246.png', 'assets/backgrounds/247.png', 'assets/backgrounds/248.png', 'assets/backgrounds/249.png', 'assets/backgrounds/25.jpg', 'assets/backgrounds/250.png', 'assets/backgrounds/251.png', 'assets/backgrounds/252.png', 'assets/backgrounds/253.png', 'assets/backgrounds/254.png', 'assets/backgrounds/255.png', 'assets/backgrounds/256.png', 'assets/backgrounds/257.png', 'assets/backgrounds/259.png', 'assets/backgrounds/26.jpg', 'assets/backgrounds/26.png', 'assets/backgrounds/260.png', 'assets/backgrounds/262.png', 'assets/backgrounds/263.png', 'assets/backgrounds/264.png', 'assets/backgrounds/265.png', 'assets/backgrounds/266.png', 'assets/backgrounds/267.png', 'assets/backgrounds/268.png', 'assets/backgrounds/269.png', 'assets/backgrounds/27.jpg', 'assets/backgrounds/27.png', 'assets/backgrounds/270.png', 'assets/backgrounds/271.png', 'assets/backgrounds/272.png', 'assets/backgrounds/273.png', 'assets/backgrounds/274.png', 'assets/backgrounds/275.png', 'assets/backgrounds/276.png', 'assets/backgrounds/277.png', 'assets/backgrounds/278.png', 'assets/backgrounds/279.png', 'assets/backgrounds/28.png', 'assets/backgrounds/280.png', 'assets/backgrounds/281.png', 'assets/backgrounds/282.png', 'assets/backgrounds/283.png', 'assets/backgrounds/284.png', 'assets/backgrounds/285.png', 'assets/backgrounds/286.png', 'assets/backgrounds/287.png', 'assets/backgrounds/288.png', 'assets/backgrounds/289.png', 'assets/backgrounds/29.png', 'assets/backgrounds/290.png', 'assets/backgrounds/291.png', 'assets/backgrounds/292.png', 'assets/backgrounds/293.png', 'assets/backgrounds/294.png', 'assets/backgrounds/295.png', 'assets/backgrounds/296.png', 'assets/backgrounds/297.png', 'assets/backgrounds/298.png', 'assets/backgrounds/3.png', 'assets/backgrounds/30.jpg', 'assets/backgrounds/30.png', 'assets/backgrounds/305.png', 'assets/backgrounds/306.png', 'assets/backgrounds/308.png', 'assets/backgrounds/31.png', 'assets/backgrounds/313.png', 'assets/backgrounds/316.png', 'assets/backgrounds/317.png', 'assets/backgrounds/318.png', 'assets/backgrounds/319.png', 'assets/backgrounds/32.png', 'assets/backgrounds/320.png', 'assets/backgrounds/321.png', 'assets/backgrounds/322.png', 'assets/backgrounds/323.png', 'assets/backgrounds/324.png', 'assets/backgrounds/325.png', 'assets/backgrounds/326.png', 'assets/backgrounds/327.png', 'assets/backgrounds/328.png', 'assets/backgrounds/329.png', 'assets/backgrounds/33.png', 'assets/backgrounds/330.png', 'assets/backgrounds/332.png', 'assets/backgrounds/333.png', 'assets/backgrounds/334.png', 'assets/backgrounds/335.png', 'assets/backgrounds/336.png', 'assets/backgrounds/337.png', 'assets/backgrounds/338.png', 'assets/backgrounds/339.png', 'assets/backgrounds/34.jpg', 'assets/backgrounds/34.png', 'assets/backgrounds/340.png', 'assets/backgrounds/341.png', 'assets/backgrounds/342.png', 'assets/backgrounds/343.png', 'assets/backgrounds/344.png', 'assets/backgrounds/345.png', 'assets/backgrounds/346.png', 'assets/backgrounds/347.png', 'assets/backgrounds/348.png', 'assets/backgrounds/349.png', 'assets/backgrounds/35.jpg', 'assets/backgrounds/35.png', 'assets/backgrounds/350.png', 'assets/backgrounds/351.png', 'assets/backgrounds/352.png', 'assets/backgrounds/353.png', 'assets/backgrounds/354.png', 'assets/backgrounds/355.png', 'assets/backgrounds/356.png', 'assets/backgrounds/357.png', 'assets/backgrounds/358.png', 'assets/backgrounds/359.png', 'assets/backgrounds/36.jpg', 'assets/backgrounds/36.png', 'assets/backgrounds/360.png', 'assets/backgrounds/361.png', 'assets/backgrounds/362.png', 'assets/backgrounds/363.png', 'assets/backgrounds/364.png', 'assets/backgrounds/365.png', 'assets/backgrounds/366.png', 'assets/backgrounds/367.png', 'assets/backgrounds/368.png', 'assets/backgrounds/37.png', 'assets/backgrounds/370.png', 'assets/backgrounds/371.png', 'assets/backgrounds/372.png', 'assets/backgrounds/373.png', 'assets/backgrounds/374.png', 'assets/backgrounds/375.png', 'assets/backgrounds/376.png', 'assets/backgrounds/377.png', 'assets/backgrounds/378.png', 'assets/backgrounds/379.png', 'assets/backgrounds/38.jpg', 'assets/backgrounds/38.png', 'assets/backgrounds/380.png', 'assets/backgrounds/381.png', 'assets/backgrounds/382.png', 'assets/backgrounds/383.png', 'assets/backgrounds/385.png', 'assets/backgrounds/386.png', 'assets/backgrounds/387.png', 'assets/backgrounds/388.png', 'assets/backgrounds/389.png', 'assets/backgrounds/39.png', 'assets/backgrounds/390.png', 'assets/backgrounds/391.png', 'assets/backgrounds/392.png', 'assets/backgrounds/393.png', 'assets/backgrounds/394.png', 'assets/backgrounds/395.png', 'assets/backgrounds/396.png', 'assets/backgrounds/397.png', 'assets/backgrounds/398.png', 'assets/backgrounds/399.png', 'assets/backgrounds/4.jpg', 'assets/backgrounds/4.png', 'assets/backgrounds/40.jpg', 'assets/backgrounds/40.png', 'assets/backgrounds/400.png', 'assets/backgrounds/401.png', 'assets/backgrounds/402.png', 'assets/backgrounds/403.png', 'assets/backgrounds/404.png', 'assets/backgrounds/405.png', 'assets/backgrounds/406.png', 'assets/backgrounds/407.png', 'assets/backgrounds/408.png', 'assets/backgrounds/409.png', 'assets/backgrounds/41.png', 'assets/backgrounds/410.png', 'assets/backgrounds/411.png', 'assets/backgrounds/412.png', 'assets/backgrounds/414.png', 'assets/backgrounds/415.png', 'assets/backgrounds/416.png', 'assets/backgrounds/418.png', 'assets/backgrounds/419.png', 'assets/backgrounds/42.jpg', 'assets/backgrounds/42.png', 'assets/backgrounds/420.png', 'assets/backgrounds/421.png', 'assets/backgrounds/422.png', 'assets/backgrounds/423.png', 'assets/backgrounds/424.png', 'assets/backgrounds/425.png', 'assets/backgrounds/426.png', 'assets/backgrounds/427.png', 'assets/backgrounds/428.png', 'assets/backgrounds/429.png', 'assets/backgrounds/43.jpg', 'assets/backgrounds/43.png', 'assets/backgrounds/430.png', 'assets/backgrounds/431.png', 'assets/backgrounds/432.png', 'assets/backgrounds/433.png', 'assets/backgrounds/434.png', 'assets/backgrounds/435.png', 'assets/backgrounds/44.jpg', 'assets/backgrounds/44.png', 'assets/backgrounds/45.jpg', 'assets/backgrounds/45.png', 'assets/backgrounds/46.jpg', 'assets/backgrounds/46.png', 'assets/backgrounds/47.png', 'assets/backgrounds/48.png', 'assets/backgrounds/49.png', 'assets/backgrounds/5.png', 'assets/backgrounds/50.jpg', 'assets/backgrounds/50.png', 'assets/backgrounds/51.jpg', 'assets/backgrounds/51.png', 'assets/backgrounds/52.png', 'assets/backgrounds/53.png', 'assets/backgrounds/54.jpg', 'assets/backgrounds/54.png', 'assets/backgrounds/55.png', 'assets/backgrounds/56.jpg', 'assets/backgrounds/56.png', 'assets/backgrounds/57.jpg', 'assets/backgrounds/57.png', 'assets/backgrounds/58.jpg', 'assets/backgrounds/58.png', 'assets/backgrounds/59.jpg', 'assets/backgrounds/59.png', 'assets/backgrounds/6.jpg', 'assets/backgrounds/6.png', 'assets/backgrounds/60.png', 'assets/backgrounds/61.png', 'assets/backgrounds/63.png', 'assets/backgrounds/64.png', 'assets/backgrounds/65.png', 'assets/backgrounds/66.png', 'assets/backgrounds/67.png', 'assets/backgrounds/68.png', 'assets/backgrounds/69.png', 'assets/backgrounds/7.jpg', 'assets/backgrounds/7.png', 'assets/backgrounds/70.png', 'assets/backgrounds/70s_marb.jpg', 'assets/backgrounds/71.png', 'assets/backgrounds/72.png', 'assets/backgrounds/73.png', 'assets/backgrounds/74.png', 'assets/backgrounds/75.png', 'assets/backgrounds/76.png', 'assets/backgrounds/77.png', 'assets/backgrounds/78.png', 'assets/backgrounds/79.png', 'assets/backgrounds/8.png', 'assets/backgrounds/80.png', 'assets/backgrounds/81.png', 'assets/backgrounds/82.png', 'assets/backgrounds/83.png', 'assets/backgrounds/84.png', 'assets/backgrounds/85.png', 'assets/backgrounds/86.png', 'assets/backgrounds/87.png', 'assets/backgrounds/88.png', 'assets/backgrounds/89.png', 'assets/backgrounds/9.png', 'assets/backgrounds/90.png', 'assets/backgrounds/91.png', 'assets/backgrounds/93.png', 'assets/backgrounds/94.png', 'assets/backgrounds/95.png', 'assets/backgrounds/96.png', 'assets/backgrounds/97.png', 'assets/backgrounds/98.png', 'assets/backgrounds/99.png', 'assets/backgrounds/aftex.gif', 'assets/backgrounds/alienegg.jpg', 'assets/backgrounds/alienlan.jpg', 'assets/backgrounds/aqua.gif', 'assets/backgrounds/atoms.jpg', 'assets/backgrounds/atoms2.jpg', 'assets/backgrounds/b.jpg', 'assets/backgrounds/b2.jpg', 'assets/backgrounds/back10.jpg', 'assets/backgrounds/back2.jpg', 'assets/backgrounds/back3.jpg', 'assets/backgrounds/bchback.gif', 'assets/backgrounds/bg_blu.jpg', 'assets/backgrounds/bg1.gif', 'assets/backgrounds/bgHallown.jpg', 'assets/backgrounds/blue_mar.gif', 'assets/backgrounds/blue_mar.jpg', 'assets/backgrounds/blue_roc.gif', 'assets/backgrounds/blue_roc.jpg', 'assets/backgrounds/blue_wea.gif', 'assets/backgrounds/blue_wea.jpg', 'assets/backgrounds/blueblob.jpg', 'assets/backgrounds/bluehorz.gif', 'assets/backgrounds/blueland.jpg', 'assets/backgrounds/bluesky.jpg', 'assets/backgrounds/blueston.jpg', 'assets/backgrounds/bluesurf.gif', 'assets/backgrounds/bluesurf.jpg', 'assets/backgrounds/bluewall.jpg', 'assets/backgrounds/bluewave.jpg', 'assets/backgrounds/blumaz.gif', 'assets/backgrounds/bow-tile.jpg', 'assets/backgrounds/bowtie.jpg', 'assets/backgrounds/brikface.gif', 'assets/backgrounds/brix.gif', 'assets/backgrounds/brushed_.jpg', 'assets/backgrounds/bubbles.gif', 'assets/backgrounds/bumps1.jpg', 'assets/backgrounds/bumps2.jpg', 'assets/backgrounds/bumps3.jpg', 'assets/backgrounds/bumpygre.jpg', 'assets/backgrounds/burst.gif', 'assets/backgrounds/chalk.jpg', 'assets/backgrounds/chokswrl.gif', 'assets/backgrounds/circles.gif', 'assets/backgrounds/circuit.jpg', 'assets/backgrounds/clouds.jpg', 'assets/backgrounds/cmc11.jpg', 'assets/backgrounds/cool_til.gif', 'assets/backgrounds/copper.jpg', 'assets/backgrounds/corkbrd.jpg', 'assets/backgrounds/corrugat.jpg', 'assets/backgrounds/Count.png', 'assets/backgrounds/cyber.jpg', 'assets/backgrounds/deepblue.jpg', 'assets/backgrounds/diagrids.jpg', 'assets/backgrounds/diamond.gif', 'assets/backgrounds/dirt.jpg', 'assets/backgrounds/dirtwatr.jpg', 'assets/backgrounds/divit.jpg', 'assets/backgrounds/embossed.jpg', 'assets/backgrounds/ether.jpg', 'assets/backgrounds/f.jpg', 'assets/backgrounds/fallfeat.jpg', 'assets/backgrounds/fire.gif', 'assets/backgrounds/fire1.jpg', 'assets/backgrounds/fireg.jpg', 'assets/backgrounds/firering.jpg', 'assets/backgrounds/flagston.jpg', 'assets/backgrounds/fractalwood.jpg', 'assets/backgrounds/funkyblu.jpg', 'assets/backgrounds/funkybum.jpg', 'assets/backgrounds/goo.jpg', 'assets/backgrounds/granite.gif', 'assets/backgrounds/granite.jpg', 'assets/backgrounds/gray_alu.jpg', 'assets/backgrounds/gray_fab.jpg', 'assets/backgrounds/gray_roc.jpg', 'assets/backgrounds/gray_stu.jpg', 'assets/backgrounds/gray.jpg', 'assets/backgrounds/graybump.jpg', 'assets/backgrounds/graypock.jpg', 'assets/backgrounds/graystre.jpg', 'assets/backgrounds/graystuc.jpg', 'assets/backgrounds/graytire.jpg', 'assets/backgrounds/graywaff.jpg', 'assets/backgrounds/green_st.jpg', 'assets/backgrounds/green-ri.jpg', 'assets/backgrounds/greendot.jpg', 'assets/backgrounds/greenred.jpg', 'assets/backgrounds/greeny.jpg', 'assets/backgrounds/grey_dot.jpg', 'assets/backgrounds/greydots.gif', 'assets/backgrounds/grn_roc.jpg', 'assets/backgrounds/grysatin.jpg', 'assets/backgrounds/heirog2.gif', 'assets/backgrounds/heirog3.gif', 'assets/backgrounds/heirogl.gif', 'assets/backgrounds/icywater.jpg', 'assets/backgrounds/kanji1.gif', 'assets/backgrounds/lava1.jpg', 'assets/backgrounds/lava2.jpg', 'assets/backgrounds/lavender.jpg', 'assets/backgrounds/light.jpg', 'assets/backgrounds/lightb1.jpg', 'assets/backgrounds/lipurple_weave.gif', 'assets/backgrounds/lipurple.jpg', 'assets/backgrounds/love.jpg', 'assets/backgrounds/lumps.jpg', 'assets/backgrounds/marb1.gif', 'assets/backgrounds/marble.gif', 'assets/backgrounds/marble.jpg', 'assets/backgrounds/marble2.jpg', 'assets/backgrounds/marbled_.jpg', 'assets/backgrounds/marbled.jpg', 'assets/backgrounds/marrolls.jpg', 'assets/backgrounds/mazes.jpg', 'assets/backgrounds/moocow.gif', 'assets/backgrounds/multi1.jpg', 'assets/backgrounds/multi2.jpg', 'assets/backgrounds/multicolor2_rock.gif', 'assets/backgrounds/nightmar.jpg', 'assets/backgrounds/orange_paper.gif', 'assets/backgrounds/paper.jpg', 'assets/backgrounds/parquet.jpg', 'assets/backgrounds/parquet2.jpg', 'assets/backgrounds/pat.gif', 'assets/backgrounds/pgreen.jpg', 'assets/backgrounds/pink_fab.jpg', 'assets/backgrounds/pinkflam.jpg', 'assets/backgrounds/purpgls.jpg', 'assets/backgrounds/purpgls1.jpg', 'assets/backgrounds/purple_g.jpg', 'assets/backgrounds/purple_m.jpg', 'assets/backgrounds/purple.jpg', 'assets/backgrounds/purplebl.jpg', 'assets/backgrounds/purplem1.jpg', 'assets/backgrounds/purpletr.jpg', 'assets/backgrounds/purpnblu.gif', 'assets/backgrounds/rain.jpg', 'assets/backgrounds/rainbow.jpg', 'assets/backgrounds/raindrl.jpg', 'assets/backgrounds/raindrop.jpg', 'assets/backgrounds/red_roc.jpg', 'assets/backgrounds/red_stuc.jpg', 'assets/backgrounds/red_stucco.gif', 'assets/backgrounds/redbrick.gif', 'assets/backgrounds/redcouch.jpg', 'assets/backgrounds/reddots.jpg', 'assets/backgrounds/redgray.jpg', 'assets/backgrounds/redmarble.jpg', 'assets/backgrounds/rivet2.gif', 'assets/backgrounds/rivet3.gif', 'assets/backgrounds/rivet5.gif', 'assets/backgrounds/rivet6.gif', 'assets/backgrounds/rivets.gif', 'assets/backgrounds/ropeweav.jpg', 'assets/backgrounds/sandman.jpg', 'assets/backgrounds/sandston.jpg', 'assets/backgrounds/scotch.gif', 'assets/backgrounds/scrnm_dr.jpg', 'assets/backgrounds/slate.jpg', 'assets/backgrounds/slate2.jpg', 'assets/backgrounds/smblue_r.jpg', 'assets/backgrounds/smgreen.gif', 'assets/backgrounds/smgreen.jpg', 'assets/backgrounds/snails.jpg', 'assets/backgrounds/space1.gif', 'assets/backgrounds/spec1.gif', 'assets/backgrounds/spheres.gif', 'assets/backgrounds/spikey.gif', 'assets/backgrounds/starry.jpg', 'assets/backgrounds/stars.gif', 'assets/backgrounds/stars.jpg', 'assets/backgrounds/stars2.gif', 'assets/backgrounds/stucco.gif', 'assets/backgrounds/summer_paper.gif', 'assets/backgrounds/sunburst.gif', 'assets/backgrounds/sunburst.jpg', 'assets/backgrounds/sunlight.jpg', 'assets/backgrounds/tan_paper.gif', 'assets/backgrounds/tanblue.jpg', 'assets/backgrounds/tapb.jpg', 'assets/backgrounds/tapestry.jpg', 'assets/backgrounds/teal_paper.gif', 'assets/backgrounds/tex1.gif', 'assets/backgrounds/tex13.gif', 'assets/backgrounds/tex14.gif', 'assets/backgrounds/tex16.gif', 'assets/backgrounds/tex2.gif', 'assets/backgrounds/tex20.gif', 'assets/backgrounds/tex22.gif', 'assets/backgrounds/tex23.gif', 'assets/backgrounds/tex24.gif', 'assets/backgrounds/tex25.gif', 'assets/backgrounds/tex4.gif', 'assets/backgrounds/tex6.gif', 'assets/backgrounds/tex9.gif', 'assets/backgrounds/theblues.gif', 'assets/backgrounds/thereds.gif', 'assets/backgrounds/tile.jpg', 'assets/backgrounds/tile2.jpg', 'assets/backgrounds/tiles.gif', 'assets/backgrounds/turtshel.gif', 'assets/backgrounds/vapor.jpg', 'assets/backgrounds/wall.jpg', 'assets/backgrounds/wall4.jpg', 'assets/backgrounds/walnut.jpg', 'assets/backgrounds/wl.jpg', 'assets/backgrounds/wood.jpg', 'assets/backgrounds/wood1.jpg', 'assets/backgrounds/wood2.jpg', 'assets/backgrounds/yell_roc.jpg', 'assets/backgrounds/yellow_f.jpg', 'assets/backgrounds/yellow_fabric.gif', 'assets/backgrounds/yellow_s.jpg', 'assets/backgrounds/yellow_w.jpg', 'assets/backgrounds/yellow_weave.gif', 'assets/backgrounds/yellowwall.jpg', 'assets/backgrounds/yelonblu.gif', 'assets/backgrounds/zigzag.gif',
    ];
    const defaultAvatar = 'assets/default-avatar.png'; // Fallback avatar

    function getRandomBackground() {
        if (backgroundImages.length === 0) return '';
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        return `url('${backgroundImages[randomIndex]}')`; // Adjust path for results.html location
    }

    if (!resultsDataString) {
        document.body.innerHTML = '<h1>No tournament results found.</h1><p>Please start a tournament first.</p>';
        return;
    }

    const resultsData = JSON.parse(resultsDataString);
    console.log('Loaded results data:', resultsData); // For debugging

    const sections = [
        document.getElementById('intro-section'),
        document.getElementById('bronze-section'),
        document.getElementById('silver-section'),
        document.getElementById('gold-section'),
        document.getElementById('cumulative-section'),
        document.getElementById('round-summaries-section')
    ];

    function populatePlayerDisplay(elementId, player) {
        const playerDisplay = document.getElementById(elementId);
        if (player && playerDisplay) {
            const avatarSrc = player.photoURL ? player.photoURL : defaultAvatar;
            playerDisplay.innerHTML = `
                <img src="${avatarSrc}" alt="${player.name}" class="player-avatar">
                <span class="player-name-podium">${player.name}</span>
            `;
        } else if (playerDisplay) {
            playerDisplay.innerHTML = `<span class="player-name-podium">N/A</span>`; // Or some placeholder
        }
    }

    function populateResults() {
        // Populate 3rd place
        if (resultsData.podiumPlayers[2]) {
            populatePlayerDisplay('bronze-player', resultsData.podiumPlayers[2]);
        }

        // Populate 2nd place
        if (resultsData.podiumPlayers[1]) {
            populatePlayerDisplay('silver-player', resultsData.podiumPlayers[1]);
        }

        // Populate 1st place
        if (resultsData.podiumPlayers[0]) {
            populatePlayerDisplay('gold-player', resultsData.podiumPlayers[0]);
        }

        // Populate Overall Champion
        const overallChampionDisplay = document.getElementById('overall-champion-display');
        if (resultsData.overallChampion && overallChampionDisplay) {
            const champion = resultsData.overallChampion;
            const avatarSrc = champion.photoURL ? champion.photoURL : defaultAvatar;
            overallChampionDisplay.innerHTML = `
                <img src="${avatarSrc}" alt="${champion.name}" class="player-avatar">
                <span>${champion.name}</span>
                <span class="score">(${champion.totalScore.toLocaleString()} points)</span>
            `;
        }

        // Populate Cumulative Scores Table
        const cumulativeScoresTbody = document.getElementById('cumulative-scores-tbody');
        if (cumulativeScoresTbody && resultsData.cumulativeScoresTable) {
            cumulativeScoresTbody.innerHTML = ''; // Clear existing
            // Sort cumulative scores in ascending order for suspense
            const sortedCumulativeScores = [...resultsData.cumulativeScoresTable].sort((a, b) => a.totalScore - b.totalScore);
            sortedCumulativeScores.forEach((player, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}.</td>
                    <td>
                        <img src="${player.photoURL ? player.photoURL : defaultAvatar}" alt="${player.name}" class="player-avatar" style="width: 30px; height: 30px; border-radius: 50%; vertical-align: middle; margin-right: 10px;">
                        ${player.name}
                    </td>
                    <td>${player.totalScore.toLocaleString()}</td>
                `;
                cumulativeScoresTbody.appendChild(row);
            });
        }

        // Populate Round Summaries
        const roundSummariesContainer = document.getElementById('round-summaries-container');
        if (roundSummariesContainer && resultsData.roundSummaries) {
            roundSummariesContainer.innerHTML = ''; // Clear existing
            resultsData.roundSummaries.forEach(round => {
                const roundTable = document.createElement('div');
                roundTable.className = 'review-round-table';

                let playersHTML = '';
                round.players.forEach(player => {
                    const eliminatedClass = player.eliminatedInThisRoundOrEarlier ? 'eliminated-in-review' : '';
                    playersHTML += `
                        <div class="review-entry ${eliminatedClass}">
                            <span class="player-name">${player.name}</span>
                            <span class="score">${player.score.toLocaleString()}</span>
                        </div>
                    `;
                });

                roundTable.innerHTML = `
                    <div class="review-round-title">Ronde ${round.roundNumber}: ${round.gameTitle}</div>
                    ${playersHTML}
                `;
                roundSummariesContainer.appendChild(roundTable);
            });
        }
    }

    // Set a random background for the cumulative section
    const cumulativeSection = document.getElementById('cumulative-section');
    if (cumulativeSection) {
        cumulativeSection.style.backgroundImage = getRandomBackground();
    }

    populateResults(); // Fill data into all sections

    // Initialize Intersection Observer
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.5 // Trigger when 50% of the item is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('initially-invisible');
                entry.target.classList.add('visible');
                // Optionally, unobserve once it's visible if it's a one-time animation
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections except the first one (intro-section)
    sections.slice(1).forEach(section => {
        section.classList.add('initially-invisible'); // Ensure they start invisible
        observer.observe(section);
    });

    // Ensure initial state: intro is visible and has the 'visible' class
    sections[0].classList.add('visible');
    // Optionally, clear the session storage after results are loaded to prevent stale data on refresh
    // sessionStorage.removeItem('bonjourarcade_tournament_results');
});
