document.addEventListener('DOMContentLoaded', () => {
    const resultsDataString = sessionStorage.getItem('bonjourarcade_tournament_results');
    const defaultAvatar = 'assets/default-avatar.png'; // Fallback avatar

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
            // Sort cumulative scores in ascending order for suspense, with rank inverted.
            const sortedCumulativeScores = [...resultsData.cumulativeScoresTable].sort((a, b) => a.totalScore - b.totalScore);
            const totalPlayers = sortedCumulativeScores.length;
            sortedCumulativeScores.forEach((player, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${totalPlayers - index}.</td>
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

    // Set a static background for the cumulative section
    const cumulativeSection = document.getElementById('cumulative-section');
    if (cumulativeSection) {
        cumulativeSection.style.backgroundImage = "url('assets/backgrounds/55.png')";
    }

    populateResults(); // Fill data into all sections

    // Make all sections visible by default without the scroll effect
    sections.forEach(section => {
        section.classList.remove('initially-invisible');
        section.classList.add('visible');
    });

    // Ensure initial state: intro is visible and has the 'visible' class
    sections[0].classList.add('visible');
    // Optionally, clear the session storage after results are loaded to prevent stale data on refresh
    // sessionStorage.removeItem('bonjourarcade_tournament_results');
});
