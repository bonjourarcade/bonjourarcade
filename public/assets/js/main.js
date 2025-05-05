// Inside public/assets/js/main.js

function populateFeaturedGame(game) {
    const contentContainer = document.getElementById('featured-game-content');
    const titleContainer = document.getElementById('featured-game-title');

    // ... (Error handling remains the same) ...
    if (!game || !contentContainer || !titleContainer) {
         displayError('#featured-game-content', 'Featured game data missing or invalid.');
         if(titleContainer) titleContainer.textContent = '';
         return;
    }

    // Clear container and rebuild
    contentContainer.innerHTML = '';
    titleContainer.textContent = game.title || 'Untitled Game';

    // --- Create and add dynamic elements ---
    const gameLink = document.createElement('a');
    gameLink.href = game.pageUrl || '#';

    const img = document.createElement('img');
    img.id = 'featured-game-img';
    // SIMPLIFIED: Always use game.coverArt from JSON or a default placeholder
    const coverSrc = game.coverArt || 'assets/images/placeholder_thumb.png'; // Use the same default as CI script
    img.src = coverSrc;
    img.alt = game.title || 'Featured Game';
    gameLink.appendChild(img);
    contentContainer.appendChild(gameLink); // Add linked game image

    // --- Re-add the static QR code ---
    const qrImg = document.createElement('img');
    qrImg.src = '/assets/images/my_app_qr.png'; // Static path
    qrImg.alt = 'Link to My App';
    qrImg.className = 'static-qr-code';
    contentContainer.appendChild(qrImg);

    // --- Add Leaderboard link ---
    const leaderboardLink = document.createElement('a');
    leaderboardLink.id = 'leaderboard-link';
    leaderboardLink.href = `/leaderboards/${game.id}/`;
    leaderboardLink.textContent = 'Leaderboards';
    contentContainer.appendChild(leaderboardLink);
}

// Function populatePreviousGames already uses game.coverArt, so it remains unchanged.
// ... (Rest of the script) ...
