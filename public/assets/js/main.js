document.addEventListener('DOMContentLoaded', () => {
    // This function starts the process when the HTML page is fully loaded
    fetchGameData();
});

/**
 * Fetches the gamelist.json file and triggers functions to update the page.
 */
// Detect if browser is Firefox
function isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
}

// Check browser and show warning if needed
function checkBrowser() {
    const browserWarningDiv = document.getElementById('browser-warning');
    if (browserWarningDiv) {
        if (isFirefox()) {
            browserWarningDiv.style.display = 'block';
            browserWarningDiv.innerHTML = `<p><strong>Remarque :</strong> Pour une expérience de jeu optimale, nous vous recommandons d'utiliser un navigateur basé sur Chromium comme Google Chrome, Safari, Microsoft Edge ou Brave. <br><b>Certains jeux peuvent ne pas fonctionner de manière optimale sur Firefox.</b></p>`;
        } else {
            // Hide the warning for other browsers if it's not Firefox
            browserWarningDiv.style.display = 'none';
        }
    }
}

// Check browser when page loads
window.addEventListener('DOMContentLoaded', checkBrowser);
async function fetchGameData() {
    try {
        // Use absolute path from root, matching HTML links/server root
        const response = await fetch('/gamelist.json');

        if (!response.ok) {
            // Handle common errors like file not found
            if(response.status === 404) {
                throw new Error(`gamelist.json not found at ${response.url}. Did you run the generation script?`);
            } else {
                throw new Error(`HTTP error fetching gamelist.json! Status: ${response.status}`);
            }
        }
        // Parse the JSON data from the response
        const data = await response.json();

        // Check if the received data structure is as expected
        if (!data || typeof data.gameOfTheWeek === 'undefined' || typeof data.previousGames === 'undefined') {
             throw new Error("Invalid data structure received from gamelist.json.");
        }

        // Store game of the week data globally for potential redirects
        window.gameOfTheWeekData = data.gameOfTheWeek;

        // Populate sections using the fetched data
        populateFeaturedGame(data.gameOfTheWeek);

        // Combine game of the week with previous games for grid and randomizer
        let allGames = [];
        if (data.gameOfTheWeek && data.gameOfTheWeek.id) {
            allGames.push(data.gameOfTheWeek);
        }
        if (Array.isArray(data.previousGames)) {
            allGames = allGames.concat(data.previousGames);
        }

        // Store all games globally for filtering purposes
        window.allGamesData = allGames;

        // Sort allGames alphabetically by display title
        allGames.sort((a, b) => {
            // Use the same display logic as in the UI
            let titleA = a.title;
            if (!titleA || titleA === a.id) titleA = capitalizeFirst(a.id);
            let titleB = b.title;
            if (!titleB || titleB === b.id) titleB = capitalizeFirst(b.id);
            return titleA.toLowerCase().localeCompare(titleB.toLowerCase());
        });

        populatePreviousGames(allGames);

        // Add search input listener
        const gameIdInput = document.getElementById('game-id-input');
        if (gameIdInput) {
            gameIdInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                // Toggle class on body based on search term presence
                if (searchTerm.length > 0) {
                    document.body.classList.add('search-active');
                } else {
                    document.body.classList.remove('search-active');
                }
                const filteredGames = window.allGamesData.filter(game => {
                    let displayTitle = game.title;
                    if (!displayTitle || displayTitle === game.id) {
                        displayTitle = capitalizeFirst(game.id);
                    }
                    return displayTitle.toLowerCase().includes(searchTerm);
                });
                populatePreviousGames(filteredGames);

                const previousGamesGrid = document.getElementById('previous-games-grid');
                const noResultsMessage = document.getElementById('no-results-message');
                if (filteredGames.length === 0 && searchTerm.length > 0) {
                    if (previousGamesGrid) {
                        previousGamesGrid.innerHTML = ''; // Clear existing games
                        // Add class to game-grid to handle no results display
                        previousGamesGrid.classList.add('no-results-active');
                        if (!noResultsMessage) {
                            const p = document.createElement('p');
                            p.id = 'no-results-message';
                            p.textContent = 'Aucun jeu ne correspond à votre filtre!';
                            previousGamesGrid.appendChild(p);
                        } else {
                            noResultsMessage.style.display = 'block';
                            previousGamesGrid.appendChild(noResultsMessage); // Re-append if it exists but was hidden
                        }
                    }
                } else {
                    if (noResultsMessage) {
                        noResultsMessage.style.display = 'none';
                    }
                    if (previousGamesGrid) {
                        previousGamesGrid.classList.remove('no-results-active'); // Remove class when results are shown
                    }
                    // populatePreviousGames will handle displaying games if there are any
                }
            });
        }

        // Initialize screensaver after game data is loaded
        // if (window.initScreensaver) {
        //     window.initScreensaver();
        // }

        // Add randomizer button logic
        const randomBtn = document.getElementById('random-game-btn');
        // Filter out hidden games for randomizer
        const visibleGames = allGames.filter(game => !(game.hide === true || game.hide === 'yes'));
        if (randomBtn && Array.isArray(visibleGames) && visibleGames.length > 0) {
            randomBtn.onclick = () => {
                const randomIdx = Math.floor(Math.random() * visibleGames.length);
                const randomGame = visibleGames[randomIdx];
                if (randomGame && randomGame.pageUrl) {
                    window.location.href = randomGame.pageUrl;
                }
            };
        }

    } catch (error) {
        // Log the error to the browser console for debugging
        console.error("Could not load or process game list:", error);

        // Display user-friendly error messages on the page
        displayError('#featured-game-title', ' '); // Clear loading text
        // Display the actual error message in the content areas
        displayError('#featured-game-content', `Error loading data: ${error.message}`);
        displayError('#previous-games-grid', `Error loading data: ${error.message}`);
    }
}

/**
 * Updates the "Game of the week" section with data.
 * @param {object | null} game - The game object for the featured game, or null.
 */
function populateFeaturedGame(game) {
    const contentContainer = document.getElementById('featured-game-content');
    const titleContainer = document.getElementById('featured-game-title');

    // Check if essential elements exist
    if (!contentContainer || !titleContainer) {
         // console.error("Required HTML elements for featured game not found."); // Removed for cleaner console
         return;
    }

    // Check if game data is valid (especially game.id)
    if (!game || !game.id) {
        titleContainer.textContent = ' '; // Clear loading text
        displayError('#featured-game-content', 'Featured game data missing or invalid.');
        return;
    }

    // Set featuredGameCoverArt for screensaver
    if (game && game.coverArt) {
        window.featuredGameCoverArt = game.coverArt;
    } else {
        window.featuredGameCoverArt = '';
    }

    // Update social media meta tags with game information
    updateSocialMediaMetaTags(game);

    // Clear placeholder content and set the title
    contentContainer.innerHTML = '';

    // Set the title (capitalize if using default)
    let displayTitle = game.title;
    if (!displayTitle || displayTitle === game.id) {
        displayTitle = capitalizeFirst(game.id);
    }
    titleContainer.textContent = displayTitle;

    // Add rom-missing class to parent container if needed
    const featuredSection = document.getElementById('game-of-the-week');
    if (featuredSection && game.romMissing === true) {
        featuredSection.classList.add('rom-missing-featured'); // Use a distinct class
    }

    // Create link container for the image
    const gameLink = document.createElement('a');
    // Use pageUrl from JSON (should point to /play.html?game=...) but now links to /gotw
    gameLink.href = '/gotw';

    // Featured Image (uses game.coverArt only now)
    const img = document.createElement('img');
    img.id = 'featured-game-img';
    const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png'; // Use coverArt or default
    img.src = coverSrc;
    img.alt = game.title || 'Featured Game';
    gameLink.appendChild(img);
    contentContainer.appendChild(gameLink); // Add linked game image

    // Add metadata fields if present (as a table)
    const metaTable = document.createElement('table');
    metaTable.className = 'game-meta-table';
    const fields = [
        { label: 'Title', key: 'title' },
        { label: 'Developer', key: 'developer' },
        { label: 'Year', key: 'year' },
        { label: 'System', key: 'system' },
        { label: 'Genre', key: 'genre' }
    ];
    fields.forEach(field => {
        if (game[field.key]) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerHTML = `<strong>${field.label}:</strong>`;
            labelCell.className = 'meta-label';
            const valueCell = document.createElement('td');
            valueCell.textContent = game[field.key];
            valueCell.className = 'meta-value';
            row.appendChild(labelCell);
            row.appendChild(valueCell);
            metaTable.appendChild(row);
        }
    });
    if (metaTable.children.length > 0) {
        contentContainer.appendChild(metaTable);
    }
}

/**
 * Updates social media meta tags with game information
 * @param {object} game - The game object containing metadata
 */
function updateSocialMediaMetaTags(game) {
    // Get display title
    let displayTitle = game.title;
    if (!displayTitle || displayTitle === game.id) {
        displayTitle = capitalizeFirst(game.id);
    }

    // Create description with game info
    let description = `Jouer à ${displayTitle}`;
    if (game.year) {
        description += ` (${game.year})`;
    }
    if (game.developer) {
        description += ` par ${game.developer}`;
    }
    if (game.system) {
        description += ` sur ${game.system}`;
    }

    // Update page title
    document.title = `BonjourArcade - ${displayTitle}`;

    // Update Open Graph meta tags
    updateMetaTag('og:title', `BonjourArcade - ${displayTitle}`);
    updateMetaTag('og:description', description);
    if (game.coverArt) {
        updateMetaTag('og:image', `https://bonjourarcade.com${game.coverArt}`);
    }

    // Update Twitter meta tags
    updateMetaTag('twitter:title', `BonjourArcade - ${displayTitle}`);
    updateMetaTag('twitter:description', description);
    if (game.coverArt) {
        updateMetaTag('twitter:image', `https://bonjourarcade.com${game.coverArt}`);
    }
}

/**
 * Helper function to update meta tags
 * @param {string} property - The meta tag property to update
 * @param {string} content - The new content value
 */
function updateMetaTag(property, content) {
    const metaTag = document.querySelector(`meta[property="${property}"]`) || 
                   document.querySelector(`meta[name="${property}"]`);
    if (metaTag) {
        metaTag.setAttribute('content', content);
    }
}

/**
 * Populates the "Previous Games" grid.
 * @param {Array} games - An array of game objects for the grid.
 */
function populatePreviousGames(games) {
    const gridContainer = document.getElementById('previous-games-grid');
    if (!gridContainer) {
         console.error("Element with ID 'previous-games-grid' not found.");
         return;
    }

    // Filter out hidden games
    const visibleGames = games.filter(game => !(game.hide === true || game.hide === 'yes'));

    // Handle case where there are no previous games
    if (!visibleGames || visibleGames.length === 0) {
        //gridContainer.innerHTML = '<p>No previous games found.</p>'; // Removed: now handled by search filter
        return;
    }

    // Clear placeholder/loading content
    gridContainer.innerHTML = '';

    // Create grid items for each game
    visibleGames.forEach(game => {
        // Skip if game data is invalid
        if(!game || !game.id) {
             // console.warn("Skipping invalid game entry in previousGames:", game); // Removed for cleaner console
             return; // Skip this iteration
        }

        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';

        // Add the 'rom-missing' class if the flag is true
        if (game.romMissing === true) {
            gameItem.classList.add('rom-missing');
        }

        const link = document.createElement('a');
        // Use pageUrl from JSON (should point to /play.html?game=...)
        link.href = game.pageUrl || '#';

        const img = document.createElement('img');
        let coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png';

        // Use thumbnail version for the previous games grid if available
        if (coverSrc && coverSrc !== '/assets/images/placeholder_thumb.png') {
            const lastDotIndex = coverSrc.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                coverSrc = coverSrc.substring(0, lastDotIndex) + '_thumb' + coverSrc.substring(lastDotIndex);
            }
        }

        img.src = coverSrc;
        img.alt = game.title || 'Game Cover';
        img.loading = 'lazy'; // Lazy load images

        const title = document.createElement('p');
        title.className = 'game-title';

        // Set the title (capitalize if using default)
        let displayTitle = game.title;
        if (!displayTitle || displayTitle === game.id) {
            displayTitle = capitalizeFirst(game.id);
        }
        title.textContent = displayTitle;

        link.appendChild(img);
        link.appendChild(title);
        gameItem.appendChild(link);
        gridContainer.appendChild(gameItem);

        // --- Tooltip for metadata ---
        gameItem.addEventListener('mouseenter', (e) => {
            // Remove any existing tooltip
            const oldTooltip = document.getElementById('game-meta-tooltip');
            if (oldTooltip) oldTooltip.remove();

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'game-meta-tooltip';
            tooltip.className = 'game-meta-tooltip';
            const fields = [
                // { label: 'Title', key: 'title' },
                { label: 'Developpeur', key: 'developer' },
                { label: 'Année', key: 'year' },
                { label: 'Système', key: 'system' },
                { label: 'Genre', key: 'genre' },
                { label: 'Recommandé par', key: 'recommended' },
                { label: 'Ajouté', key: 'added' }
            ];
            let hasData = false;
            const table = document.createElement('table');
            table.className = 'game-meta-table';
            fields.forEach(field => {
                if (game[field.key]) {
                    hasData = true;
                    const row = document.createElement('tr');
                    const labelCell = document.createElement('td');
                    labelCell.innerHTML = `<strong>${field.label}:</strong>`;
                    labelCell.className = 'meta-label';
                    const valueCell = document.createElement('td');
                    valueCell.textContent = game[field.key];
                    valueCell.className = 'meta-value';
                    row.appendChild(labelCell);
                    row.appendChild(valueCell);
                    table.appendChild(row);
                }
            });
            if (hasData) {
                tooltip.appendChild(table);
                document.body.appendChild(tooltip);
                // Position tooltip near the game item
                const rect = gameItem.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let left = rect.right + 8 + window.scrollX;
                let top = rect.top + window.scrollY;
                // If tooltip would overflow right, show to the left
                if (left + tooltipRect.width > window.innerWidth) {
                    left = rect.left - tooltipRect.width - 8 + window.scrollX;
                }
                // If tooltip would overflow bottom, adjust upward
                if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
                    top = window.scrollY + window.innerHeight - tooltipRect.height - 8;
                }
                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
            }
        });
        gameItem.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('game-meta-tooltip');
            if (tooltip) tooltip.remove();
        });
    });
}

/**
 * Displays an error message within a specified element.
 * @param {string} selector - CSS selector for the target element.
 * @param {string} message - The error message to display.
 */
function displayError(selector, message) {
    const element = document.querySelector(selector);
    if (element) {
        // Using textContent is safer than innerHTML for displaying error messages
        element.textContent = message;
        // Add a class for styling if needed
        element.classList.add('error-message');
    } else {
        // Log error if the target element for the message isn't found
        console.error(`displayError: Element with selector "${selector}" not found.`);
    }
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Feature: Refresh menu at 5 AM local time to fetch latest updates
function checkAndRefreshAt5AM() {
    const now = new Date();
    // Only refresh if it's 5 AM and the screensaver is not active to prevent disruption
    // Also, ensure we don't refresh multiple times within the same hour if the page is left open
    if (now.getHours() === 5 && now.getMinutes() < 5 && !window.screensaverActive) { // Refresh within the first 5 minutes of 5 AM
        console.log("It's 5 AM local time. Refreshing game list to get latest updates.");
        fetchGameData(); // Re-fetch game data
    }
}

// Set up interval to check every hour (3,600,000 milliseconds)
setInterval(checkAndRefreshAt5AM, 3600000);
