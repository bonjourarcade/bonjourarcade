// --- Tooltip Functions (Global Scope) ---
function summarizeControls(controls) {
    if (!controls || !Array.isArray(controls)) return '';
    const joystickLines = controls.filter(line => String(line).trim().startsWith('🕹️'));
    if (joystickLines.length >= 2) return '🕹️🕹️';
    let summary = '';
    for (let line of controls) {
        line = String(line).trim();
        if (!line) continue;
        let first = line.split(' ')[0];
        if ([
            '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','0️⃣'
        ].includes(first)) {
            first = '🔴';
        }
        summary += first + ' ';
    }
    return summary.trim();
}

function showTooltipForItem(item) {
    removeTooltip(); // Clear any existing tooltip
    if (!item) return;
    // Use the attached game data
    let game = item._gameData;
    if (!game) return;
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'game-meta-tooltip';
    tooltip.className = 'game-meta-tooltip';
    const fields = [
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
    // Add summarized controls row if present
    if (game.controls && summarizeControls(game.controls)) {
        hasData = true;
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        labelCell.innerHTML = `<strong>Contrôles:</strong>`;
        labelCell.className = 'meta-label';
        const valueCell = document.createElement('td');
        valueCell.textContent = summarizeControls(game.controls);
        valueCell.className = 'meta-value';
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        table.appendChild(row);
    }
    if (hasData) {
        tooltip.appendChild(table);
        document.body.appendChild(tooltip);
        // Position tooltip near the item
        const rect = item.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = rect.right + 8 + window.scrollX;
        let top = rect.top + window.scrollY;
        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.left - tooltipRect.width - 8 + window.scrollX;
        }
        if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
            top = window.scrollY + window.innerHeight - tooltipRect.height - 8;
        }
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
}

function removeTooltip() {
    const tooltip = document.getElementById('game-meta-tooltip');
    if (tooltip) tooltip.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    // This function starts the process when the HTML page is fully loaded
    fetchGameData();
    
    // Initialize newsletter functionality
    initializeNewsletter();
});

/**
 * Fetches the gamelist.json file and triggers functions to update the page.
 */
// Detect if browser is Firefox
function isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
}

// Check browser when page loads
// window.addEventListener('DOMContentLoaded', checkBrowser);
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

                // Check for exact id match (case-insensitive, full match only)
                const exactMatch = window.allGamesData.find(game => game.id && game.id.toLowerCase() === searchTerm);
                let filteredGames;
                if (exactMatch && searchTerm.length > 0 && searchTerm === exactMatch.id.toLowerCase()) {
                    // Show only the exact match, even if hidden
                    filteredGames = [exactMatch];
                } else {
                    // Normal filtering (by title, only visible games)
                    filteredGames = window.allGamesData.filter(game => {
                        // Only match visible games for substring search
                        if (game.hide === true || game.hide === 'yes') return false;
                        let displayTitle = game.title;
                        if (!displayTitle || displayTitle === game.id) {
                            displayTitle = capitalizeFirst(game.id);
                        }
                        return displayTitle.toLowerCase().includes(searchTerm);
                    });
                }
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
    gameLink.href = game.pageUrl || ('/play?game=' + game.id);
    gameLink.style.position = 'relative';
    gameLink.style.display = 'inline-block';

    // Featured Image (uses game.coverArt only now)
    const img = document.createElement('img');
    img.id = 'featured-game-img';
    const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png';
    img.src = coverSrc;
    img.alt = game.title || 'Featured Game';
    gameLink.appendChild(img);

    // Add new badge if new_flag is true
    if (game.new_flag === 'true') {
        const badge = document.createElement('span');
        badge.className = 'new-badge';
        badge.textContent = 'NOUVEAU';
        gameLink.classList.add('featured-game-new');
        // Insert badge as first child so it overlays the left of the image
        gameLink.insertBefore(badge, img);
    }

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
    // Add summarized controls row if present
    if (game.controls && summarizeControls(game.controls)) {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        labelCell.innerHTML = `<strong>Contrôles:</strong>`;
        labelCell.className = 'meta-label';
        const valueCell = document.createElement('td');
        valueCell.textContent = summarizeControls(game.controls);
        valueCell.className = 'meta-value';
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        metaTable.appendChild(row);
    }
    if (metaTable.children.length > 0) {
        contentContainer.appendChild(metaTable);
    }

    // Add mouse event listeners for featured game section (same as keyboard navigation)
    const featuredGameSection = document.getElementById('game-of-the-week');
    if (featuredGameSection) {
        featuredGameSection.addEventListener('mouseenter', (e) => {
            // Clear any existing highlights
            clearHighlights();
            removeTooltipWithTimeout();
            
            // Add highlight to featured section
            featuredGameSection.classList.add('game-item--selected');
            
            // Show tooltip with delay (same as keyboard)
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showTooltipForItem(featuredGameSection);
            }, 80);
        });
        featuredGameSection.addEventListener('mouseleave', () => {
            // Remove highlight from featured section
            featuredGameSection.classList.remove('game-item--selected');
            removeTooltipWithTimeout();
        });
        
        // --- Click behavior (same as Enter key) ---
        featuredGameSection.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            handleGameClick(featuredGameSection);
        });
    }
    // MARKER FOR COPY HTML TO SHMUPS
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

    let visibleGames;
    // If only one game is passed, show it even if hidden (for exact id match)
    if (games.length === 1) {
        visibleGames = games;
    } else {
        // Filter out hidden games
        visibleGames = games.filter(game => !(game.hide === true || game.hide === 'yes'));
    }

    // Handle case where there are no previous games
    if (!visibleGames || visibleGames.length === 0) {
        //gridContainer.innerHTML = '<p>No previous games found.</p>'; // Removed: now handled by search filter
        return;
    }

    // Clear placeholder/loading content
    gridContainer.innerHTML = '';

    // Create grid items for each game
    visibleGames.forEach((game, idx) => {
        // Skip if game data is invalid
        if(!game || !game.id) {
             return; // Skip this iteration
        }

        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        gameItem.setAttribute('data-game-index', idx + 1); // +1 because 0 will be reserved for featured game
        gameItem.dataset.gameId = game.id;
        gameItem._gameData = game; // Attach game data directly

        // Add the 'rom-missing' class if the flag is true
        if (game.romMissing === true) {
            gameItem.classList.add('rom-missing');
        }

        // Add new border if new_flag is true
        if (game.new_flag === 'true') {
            gameItem.classList.add('game-new');
        }

        const link = document.createElement('a');
        // Use pageUrl from JSON (should point to /play.html?game=...)
        link.href = game.pageUrl || '#';
        link.style.position = 'relative';

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

        // Add new badge if new_flag is true
        if (game.new_flag === 'true') {
            const badge = document.createElement('span');
            badge.className = 'new-badge';
            badge.textContent = 'NOUVEAU';
            badge.style.position = 'absolute';
            badge.style.top = '7px';
            badge.style.left = '7px';
            link.appendChild(badge);
        }

        const title = document.createElement('p');
        title.className = 'game-title';

        // Set the title (capitalize if using default)
        let displayTitle = game.title;
        if (!displayTitle || displayTitle === game.id) {
            displayTitle = capitalizeFirst(game.id);
        }
        // Special case: SHMUPS marker
        if (displayTitle === 'SHMUPS') {
            // Replace the <p> with an <img> for the logo
            const shmupsLogo = document.createElement('img');
            shmupsLogo.src = '/assets/images/shmups-logo.png';
            shmupsLogo.alt = 'SHMUPS';
            shmupsLogo.className = 'shmups-logo-title';
            shmupsLogo.style.width = '100%';
            shmupsLogo.style.height = 'auto';
            shmupsLogo.style.display = 'block';
            shmupsLogo.style.margin = '0 auto';
            title.textContent = '';
            title.appendChild(shmupsLogo);
        } else {
            title.textContent = displayTitle;
        }

        link.appendChild(img);
        link.appendChild(title);
        gameItem.appendChild(link);
        gridContainer.appendChild(gameItem);

        // --- Mouse hover behavior (same as keyboard navigation) ---
        gameItem.addEventListener('mouseenter', (e) => {
            // Clear any existing highlights
            clearHighlights();
            removeTooltipWithTimeout();
            
            // Add highlight to this item
            gameItem.classList.add('game-item--selected');
            
            // Show tooltip with delay (same as keyboard)
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showTooltipForItem(gameItem);
            }, 80);
        });
        gameItem.addEventListener('mouseleave', () => {
            // Remove highlight from this item
            gameItem.classList.remove('game-item--selected');
            removeTooltipWithTimeout();
        });
        
        // --- Click behavior (same as Enter key) ---
        gameItem.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            handleGameClick(gameItem);
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

// --- Global functions for navigation and highlighting ---
let tooltipTimeout = null;

function clearHighlights() {
    const featuredGameSection = document.getElementById('game-of-the-week');
    const gameItems = Array.from(document.querySelectorAll('.game-item'));
    if (featuredGameSection) featuredGameSection.classList.remove('game-item--selected');
    gameItems.forEach(item => item.classList.remove('game-item--selected'));
}

function removeTooltipWithTimeout() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    removeTooltip();
}

// --- Preload navigation and select sounds globally ---
let navSound = null;
let selectSound = null;

function preloadSounds() {
    navSound = new Audio('/assets/click.mp3');
    navSound.preload = 'auto';
    navSound.load();
    selectSound = new Audio('/assets/select.mp3');
    selectSound.preload = 'auto';
    selectSound.load();
}

// Unlock selectSound on first user gesture (required for some browsers)
function unlockSelectSound() {
    if (selectSound) {
        selectSound.currentTime = 0;
        selectSound.volume = 0;
        selectSound.play().catch(() => {});
        setTimeout(() => { selectSound.pause(); selectSound.volume = 1; }, 10);
    }
    window.removeEventListener('pointerdown', unlockSelectSound);
    window.removeEventListener('keydown', unlockSelectSound);
}

function playNavSound() {
    try {
        if (navSound) {
            navSound.currentTime = 0;
            navSound.play();
        } else {
            // fallback if not loaded
            const temp = new Audio('/assets/click.mp3');
            temp.play();
        }
    } catch (e) {}
}

function playSelectSound() {
    try {
        if (selectSound) {
            selectSound.currentTime = 0;
            selectSound.play();
        } else {
            // fallback if not loaded
            const temp = new Audio('/assets/select.mp3');
            temp.play();
        }
    } catch (e) {}
}

// Global function to handle clicks the same way as Enter key
function handleGameClick(element) {
    playSelectSound();
    
    // Find the target URL
    const link = element.querySelector('a');
    if (!link || !link.href) return;
    
    const targetUrl = link.href;

    // Block input
    document.body.classList.add('radial-exit-block');

    // Get all main elements to animate
    const container = document.querySelector('.container');
    const header = container.querySelector('header');
    const main = container.querySelector('main');
    const footer = document.querySelector('footer');
    const allGameItems = Array.from(document.querySelectorAll('.game-item'));
    const featured = document.getElementById('game-of-the-week');

    // Get center of selected element
    const selRect = element.getBoundingClientRect();
    const selCenter = {
        x: selRect.left + selRect.width / 2,
        y: selRect.top + selRect.height / 2
    };

    // Animate header
    if (header && header !== element && !header.contains(element)) {
        header.classList.add('radial-exit');
        header.style.transform = 'translateY(-1000px) scale(0.7)';
    }
    // Animate footer
    if (footer && footer !== element && !footer.contains(element)) {
        footer.classList.add('radial-exit');
        footer.style.transform = 'translateY(1000px) scale(0.7)';
    }
    // Animate main children (sections)
    if (main) {
        Array.from(main.children).forEach(child => {
            // If the featured section is selected, animate all .game-item elements outward, but NOT the grid section as a whole
            if (element === featured && child.id === 'previous-games') {
                const gridItems = child.querySelectorAll('.game-item');
                gridItems.forEach(item => {
                    if (item !== element) {
                        const rect = item.getBoundingClientRect();
                        const center = {
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2
                        };
                        const dx = center.x - selCenter.x;
                        const dy = center.y - selCenter.y;
                        const angle = Math.atan2(dy, dx);
                        const dist = 1600 + Math.random() * 200;
                        const tx = Math.cos(angle) * dist;
                        const ty = Math.sin(angle) * dist;
                        item.classList.add('radial-exit');
                        item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
                    }
                });
            } else if (child !== element && !child.contains(element)) {
                // For all other cases, animate the section as a whole
                const rect = child.getBoundingClientRect();
                const dx = rect.left + rect.width / 2 - selCenter.x;
                const dir = dx < 0 ? -1 : 1;
                child.classList.add('radial-exit');
                child.style.transform = `translateX(${dir * 1600}px) scale(0.7)`;
            } else if (child.id === 'previous-games' && child !== element) {
                // Only animate grid items if grid section is NOT being animated as a whole
                const gridItems = child.querySelectorAll('.game-item');
                gridItems.forEach(item => {
                    if (item !== element) {
                        const rect = item.getBoundingClientRect();
                        const center = {
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2
                        };
                        const dx = center.x - selCenter.x;
                        const dy = center.y - selCenter.y;
                        const angle = Math.atan2(dy, dx);
                        const dist = 1600 + Math.random() * 200;
                        const tx = Math.cos(angle) * dist;
                        const ty = Math.sin(angle) * dist;
                        item.classList.add('radial-exit');
                        item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
                    }
                });
            }
        });
    }
    // Animate all other game items radially (skip if already handled above)
    allGameItems.forEach(item => {
        if (item !== element && !item.classList.contains('radial-exit')) {
            const rect = item.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            const dx = center.x - selCenter.x;
            const dy = center.y - selCenter.y;
            const angle = Math.atan2(dy, dx);
            const dist = 1600 + Math.random() * 200; // px, much farther
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            item.classList.add('radial-exit');
            item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
        }
    });
    // Animate all other direct children of .container except selectedEl
    Array.from(container.children).forEach(child => {
        if (child !== element && !child.contains(element) && child !== header && child !== main && child !== footer) {
            child.classList.add('radial-exit');
            child.style.transform = 'scale(0.7)';
        }
    });
    // Animate body background fade
    document.body.style.transition = 'background 0.7s, opacity 0.7s';
    document.body.style.opacity = '0.7';

    // After animation and sound, navigate
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 700);
}

// --- Keyboard Navigation for Game Selection ---
(function() {
    // Navigation and selection sounds
    // navSound and selectSound are now preloaded globally

    let currentIndex = 0; // 0 = featured, 1...N = games in grid
    let gameItems = [];
    let featuredGameSection = document.getElementById('game-of-the-week');
    let searchInput = document.getElementById('game-id-input');
    let navThrottle = false;
    let userHasNavigated = false; // Track if user has started navigating with arrow keys

    function updateGameItems() {
        gameItems = Array.from(document.querySelectorAll('.game-item'));
        featuredGameSection = document.getElementById('game-of-the-week');
        searchInput = document.getElementById('game-id-input');
    }

    // clearHighlights is now in global scope

    // Note: showTooltipForItem and removeTooltip are now in global scope

    // Helper: scroll element into view with margin
    function scrollElementIntoViewWithMargin(element, margin = 40) {
        if (!element) return;
        let parent = element.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
            const style = window.getComputedStyle(parent);
            const overflowY = style.overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') break;
            parent = parent.parentElement;
        }
        if (!parent || parent === document.body || parent === document.documentElement) {
            // fallback to window
            const rect = element.getBoundingClientRect();
            const winHeight = window.innerHeight;
            if (rect.top < margin) {
                window.scrollBy({top: rect.top - margin, behavior: 'smooth'});
            } else if (rect.bottom > winHeight - margin) {
                window.scrollBy({top: rect.bottom - winHeight + margin, behavior: 'smooth'});
            }
            return;
        }
        // scrollable parent
        const parentRect = parent.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        if (elemRect.top < parentRect.top + margin) {
            parent.scrollTop -= (parentRect.top + margin) - elemRect.top;
        } else if (elemRect.bottom > parentRect.bottom - margin) {
            parent.scrollTop += elemRect.bottom - (parentRect.bottom - margin);
        }
    }

    function highlightCurrent() {
        // Only highlight if user has started navigating with arrow keys
        if (!userHasNavigated) return;
        
        clearHighlights();
        removeTooltipWithTimeout();
        if (currentIndex === 0 && featuredGameSection) {
            featuredGameSection.classList.add('game-item--selected');
            scrollElementIntoViewWithMargin(featuredGameSection);
        } else if (currentIndex > 0 && gameItems[currentIndex - 1]) {
            const item = gameItems[currentIndex - 1];
            item.classList.add('game-item--selected');
            scrollElementIntoViewWithMargin(item);
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showTooltipForItem(item);
            }, 80);
        }
    }

    // removeTooltipWithTimeout, playNavSound, and playSelectSound are now in global scope

    function selectCurrent() {
        playSelectSound();
        // Find the selected element and its center
        let selectedEl = null;
        let targetUrl = null;
        if (currentIndex === 0 && featuredGameSection) {
            selectedEl = featuredGameSection;
            const link = featuredGameSection.querySelector('a');
            if (link) targetUrl = link.href;
        } else if (currentIndex > 0 && gameItems[currentIndex - 1]) {
            selectedEl = gameItems[currentIndex - 1];
            const link = gameItems[currentIndex - 1].querySelector('a');
            if (link) targetUrl = link.href;
        }
        if (!selectedEl || !targetUrl) return;

        // Block input
        document.body.classList.add('radial-exit-block');

        // Get all main elements to animate
        const container = document.querySelector('.container');
        const header = container.querySelector('header');
        const main = container.querySelector('main');
        const footer = document.querySelector('footer');
        const allGameItems = Array.from(document.querySelectorAll('.game-item'));
        const featured = document.getElementById('game-of-the-week');

        // Get center of selected element
        const selRect = selectedEl.getBoundingClientRect();
        const selCenter = {
            x: selRect.left + selRect.width / 2,
            y: selRect.top + selRect.height / 2
        };

        // Animate header
        if (header && header !== selectedEl && !header.contains(selectedEl)) {
            header.classList.add('radial-exit');
            header.style.transform = 'translateY(-1000px) scale(0.7)';
        }
        // Animate footer
        if (footer && footer !== selectedEl && !footer.contains(selectedEl)) {
            footer.classList.add('radial-exit');
            footer.style.transform = 'translateY(1000px) scale(0.7)';
        }
        // Animate main children (sections)
        if (main) {
            Array.from(main.children).forEach(child => {
                // If the featured section is selected, animate all .game-item elements outward, but NOT the grid section as a whole
                if (selectedEl === featured && child.id === 'previous-games') {
                    const gridItems = child.querySelectorAll('.game-item');
                    gridItems.forEach(item => {
                        if (item !== selectedEl) {
                            const rect = item.getBoundingClientRect();
                            const center = {
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2
                            };
                            const dx = center.x - selCenter.x;
                            const dy = center.y - selCenter.y;
                            const angle = Math.atan2(dy, dx);
                            const dist = 1600 + Math.random() * 200;
                            const tx = Math.cos(angle) * dist;
                            const ty = Math.sin(angle) * dist;
                            item.classList.add('radial-exit');
                            item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
                        }
                    });
                } else if (child !== selectedEl && !child.contains(selectedEl)) {
                    // For all other cases, animate the section as a whole
                    const rect = child.getBoundingClientRect();
                    const dx = rect.left + rect.width / 2 - selCenter.x;
                    const dir = dx < 0 ? -1 : 1;
                    child.classList.add('radial-exit');
                    child.style.transform = `translateX(${dir * 1600}px) scale(0.7)`;
                } else if (child.id === 'previous-games' && child !== selectedEl) {
                    // Only animate grid items if grid section is NOT being animated as a whole
                    const gridItems = child.querySelectorAll('.game-item');
                    gridItems.forEach(item => {
                        if (item !== selectedEl) {
                            const rect = item.getBoundingClientRect();
                            const center = {
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2
                            };
                            const dx = center.x - selCenter.x;
                            const dy = center.y - selCenter.y;
                            const angle = Math.atan2(dy, dx);
                            const dist = 1600 + Math.random() * 200;
                            const tx = Math.cos(angle) * dist;
                            const ty = Math.sin(angle) * dist;
                            item.classList.add('radial-exit');
                            item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
                        }
                    });
                }
            });
        }
        // Animate all other game items radially (skip if already handled above)
        allGameItems.forEach(item => {
            if (item !== selectedEl && !item.classList.contains('radial-exit')) {
                const rect = item.getBoundingClientRect();
                const center = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                const dx = center.x - selCenter.x;
                const dy = center.y - selCenter.y;
                const angle = Math.atan2(dy, dx);
                const dist = 1600 + Math.random() * 200; // px, much farther
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                item.classList.add('radial-exit');
                item.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
            }
        });
        // Animate all other direct children of .container except selectedEl
        Array.from(container.children).forEach(child => {
            if (child !== selectedEl && !child.contains(selectedEl) && child !== header && child !== main && child !== footer) {
                child.classList.add('radial-exit');
                child.style.transform = 'scale(0.7)';
            }
        });
        // Animate body background fade
        document.body.style.transition = 'background 0.7s, opacity 0.7s';
        document.body.style.opacity = '0.7';

        // After animation and sound, navigate
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 700);
    }

    function focusSearch() {
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // Listen for keyboard events
    document.addEventListener('keydown', function(e) {
        // If search is focused, ignore except Escape
        if (document.activeElement === searchInput) {
            if (e.key === 'Escape') {
                // Clear search, blur, reset view
                searchInput.value = '';
                searchInput.blur();
                document.body.classList.remove('search-active');
                // Repopulate all games and reset grid state
                if (window.allGamesData) {
                    populatePreviousGames(window.allGamesData);
                }
                // Remove no-results and search-specific classes
                const previousGamesGrid = document.getElementById('previous-games-grid');
                if (previousGamesGrid) {
                    previousGamesGrid.classList.remove('no-results-active');
                }
                const noResultsMessage = document.getElementById('no-results-message');
                if (noResultsMessage) {
                    noResultsMessage.remove();
                }
                // Reset highlight to featured game
                currentIndex = 0;
                // Don't set userHasNavigated or highlight - just clear the search
                e.preventDefault();
            }
            return;
        }
        // Focus search bar on /
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            focusSearch();
            e.preventDefault();
            return;
        }
        // Navigation keys
        if (["ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Enter","Tab"].includes(e.key)) {
            // Set flag that user has started navigating
            userHasNavigated = true;
            
            // Only throttle if key is held (event.repeat)
            if (e.repeat && navThrottle) return;
            if (e.repeat) {
                navThrottle = true;
                setTimeout(() => { navThrottle = false; }, 180);
            }
            updateGameItems();
            let prevIndex = currentIndex;
            // Determine grid width
            const grid = document.getElementById('previous-games-grid');
            let gridCols = 1;
            if (grid) {
                const style = window.getComputedStyle(grid);
                const colStr = style.getPropertyValue('grid-template-columns');
                gridCols = colStr.split(' ').length;
            }
            if (e.key === 'ArrowDown') {
                if (currentIndex === 0) {
                    currentIndex = 1;
                } else {
                    currentIndex = Math.min(gameItems.length, currentIndex + gridCols);
                }
                playNavSound();
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (currentIndex <= gridCols) {
                    currentIndex = 0; // Go to featured
                } else {
                    currentIndex = Math.max(1, currentIndex - gridCols);
                }
                playNavSound();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                if (currentIndex > 0) {
                    currentIndex = Math.max(0, currentIndex - 1);
                    playNavSound();
                }
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                if (currentIndex < gameItems.length) {
                    currentIndex = Math.min(gameItems.length, currentIndex + 1);
                    playNavSound();
                }
                e.preventDefault();
            } else if (e.key === 'Tab') {
                if (e.shiftKey) {
                    currentIndex = (currentIndex - 1 + gameItems.length + 1) % (gameItems.length + 1);
                } else {
                    currentIndex = (currentIndex + 1) % (gameItems.length + 1);
                }
                playNavSound();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                selectCurrent();
                e.preventDefault();
            }
            if (currentIndex !== prevIndex) {
                highlightCurrent();
            }
        }
    });

    // Only remove tooltip on mouse move if not hovering over a game item
    document.addEventListener('mousemove', (e) => {
        const target = e.target;
        const isOverGameItem = target.closest('.game-item') || target.closest('#game-of-the-week');
        if (!isOverGameItem) {
            removeTooltip();
        }
    });
    document.addEventListener('click', removeTooltip);

    const observer = new MutationObserver(() => {
        updateGameItems();
        // Don't highlight when grid changes - only when user navigates
    });
    observer.observe(document.getElementById('previous-games-grid'), {childList: true, subtree: false});

    window.addEventListener('DOMContentLoaded', () => {
        updateGameItems();
        // Don't highlight on page load - only when user navigates
    });
})();

// Newsletter functionality
function initializeNewsletter() {
    const subscribeBtn = document.getElementById('newsletter-subscribe');
    if (!subscribeBtn) return;
    subscribeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://bonjourarcade.kit.com/abonne', '_blank');
    });
}

// --- Ensure menu and main content are visible after browser back navigation ---
window.addEventListener('pageshow', function(event) {
  // Remove animation classes from body
  document.body.classList.remove('radial-exit-block');
  document.body.style.opacity = '';
  document.body.style.transition = '';

  // Remove radial-exit and transform from all elements
  document.querySelectorAll('.radial-exit').forEach(el => {
    el.classList.remove('radial-exit');
    el.style.transform = '';
  });

  // Reset header, main, footer transforms
  ['header', 'main', 'footer'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.transform = '';
    });
  });

  // Optionally, reset .container display if it was hidden
  // var container = document.querySelector('.container');
  // if (container) container.style.display = '';
});
