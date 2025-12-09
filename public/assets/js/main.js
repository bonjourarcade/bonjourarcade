// --- Tooltip Functions (Global Scope) ---

// Function to map core names to user-friendly system names
function getSystemName(core) {
    if (!core) return '';
    const systemMap = {
        'arcade': 'Arcade',
        'mame2003_plus': 'Arcade (MAME)',
        'atari2600': 'Atari 2600',
        'gb': 'Game Boy',
        'gba': 'Game Boy Advance',
        'segaMD': 'Sega Genesis/Mega Drive',
        'segaGG': 'Sega Game Gear',
        'jaguar': 'Atari Jaguar',
        'n64': 'Nintendo 64',
        'nes': 'Nintendo Entertainment System',
        'pce': 'PC Engine/TurboGrafx-16',
        'psx': 'PlayStation',
        'sega32x': 'Sega 32X',
        'segaMS': 'Sega Master System',
        'snes': 'Super Nintendo',
        'vb': 'Virtual Boy',
        'ws': 'WonderSwan',
        'external': 'External Game'
    };
    return systemMap[core] || core;
}

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
    
    // Get system name from core field
    const systemName = getSystemName(game.core);
    
    const fields = [
        { label: 'Developpeur', key: 'developer' },
        { label: 'Année', key: 'year' },
        { label: 'Système', key: 'system', value: systemName },
        { label: 'Genre', key: 'genre' },
        { label: 'Ajouté', key: 'added' }
    ];
    let hasData = false;
    const table = document.createElement('table');
    table.className = 'game-meta-table';
    fields.forEach(field => {
        let value = field.value !== undefined ? field.value : game[field.key];
        if (value) {
            hasData = true;
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerHTML = `<strong>${field.label}:</strong>`;
            labelCell.className = 'meta-label';
            const valueCell = document.createElement('td');
            valueCell.textContent = value;
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

/**
 * Removes accents from text to enable accent-insensitive search
 * @param {string} text - The text to remove accents from
 * @returns {string} - The text with accents removed
 */
function removeAccents(text) {
    if (!text) return '';
    return text.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
               .toLowerCase();
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
        // Use local gamelist.json for development, Google Cloud Storage for production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
        
        // Get the current game ID from the API endpoint (generated from upcoming.yaml)
        let currentGameId = null;
        try {
            const currentGameResponse = await fetch('/api/current-game');
            if (currentGameResponse.ok) {
                currentGameId = await currentGameResponse.text();
                currentGameId = currentGameId.trim(); // Remove any whitespace
                if (currentGameId === 'no-game') {
                    currentGameId = null;
                }
            }
        } catch (error) {
            console.warn('Could not fetch current game from API:', error);
        }
        
        // Load upcoming.yaml to get list of previous games of the week
        let previousGotwGameIds = new Set();
        let previousWeekGames = []; // Array to store previous week games with their week numbers
        try {
            // Get current week in YYYYWW format
            function getISOWeek(date) {
                const target = new Date(date.valueOf());
                const dayNr = (date.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) {
                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                }
                const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
                return weekNumber;
            }
            
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentWeek = getISOWeek(now);
            const currentWeekSeed = currentYear * 100 + currentWeek;
            
            const predictionsUrl = '/upcoming/upcoming.yaml';
            const predictionsResponse = await fetch(predictionsUrl);
            if (predictionsResponse.ok) {
                const predictionsText = await predictionsResponse.text();
                // Parse YAML format: YYYYWW: (week number) followed by game_id:
                const blockPattern = /^(\d{6}):\s*$/gm;
                let match;
                let currentWeekInFile = null;
                
                while ((match = blockPattern.exec(predictionsText)) !== null) {
                    const weekSeed = parseInt(match[1]);
                    currentWeekInFile = weekSeed;
                }
                
                // Now parse game_id lines and associate them with the week
                const lines = predictionsText.split('\n');
                currentWeekInFile = null;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const weekMatch = line.match(/^(\d{6}):\s*$/);
                    if (weekMatch) {
                        currentWeekInFile = parseInt(weekMatch[1]);
                    } else if (currentWeekInFile !== null) {
                        // Match both "game_id:" and "  game_id:" (with indentation)
                        const gameIdMatch = line.match(/^\s*game_id:\s*(.+)$/);
                        if (gameIdMatch) {
                            const gameId = gameIdMatch[1].trim().replace(/^["']|["']$/g, '');
                            // Only include if this week is in the past
                            if (gameId && currentWeekInFile < currentWeekSeed) {
                                previousGotwGameIds.add(gameId);
                                // Store all previous week games (not just the previous week)
                                previousWeekGames.push({
                                    gameId: gameId,
                                    week: currentWeekInFile
                                });
                            }
                        }
                    }
                }
                
                // Sort by week (descending - most recent first) and limit to 10
                previousWeekGames.sort((a, b) => b.week - a.week);
                previousWeekGames = previousWeekGames.slice(0, 10);
                
                console.log(`Found ${previousGotwGameIds.size} previous games of the week (current week: ${currentWeekSeed})`);
                console.log(`Found ${previousWeekGames.length} games from previous weeks (showing last 10)`);
            }
        } catch (error) {
            console.warn('Could not fetch upcoming.yaml:', error);
        }
        const cacheBuster = '?v=' + Date.now();
        const gamelistUrl = isLocalhost ? 'gamelist.json' + cacheBuster : 'https://storage.googleapis.com/bonjourarcade/gamelist.json' + cacheBuster;
        const response = await fetch(gamelistUrl);

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

        // Check if the received data structure is as expected (now simplified)
        if (!data || !Array.isArray(data.games)) {
             throw new Error("Invalid data structure received from gamelist.json.");
        }

        // Find the current game of the week from the games list
        let gameOfTheWeek = null;
        if (currentGameId) {
            gameOfTheWeek = data.games.find(game => game.id === currentGameId);
        }

        // Store game of the week data globally for potential redirects
        window.gameOfTheWeekData = gameOfTheWeek;

        // Populate sections using the fetched data
        populateFeaturedGame(gameOfTheWeek);

        // Populate previous week games section
        populatePreviousWeekGames(previousWeekGames, data.games);

        // Use all games for grid and randomizer (no need to combine separate arrays)
        let allGames = data.games;

        // Filter out games with problems for home page search
        let filteredGames = allGames.filter(game => game.problem !== "true");

        // Store filtered games globally for filtering purposes
        // Override hide value for previous games of the week
        filteredGames = filteredGames.map(game => {
            if (previousGotwGameIds.has(game.id)) {
                return { ...game, hide: false };
            }
            return game;
        });
        
        // Shuffle games array to randomize order
        function shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        // Helper function to check if a game is actually new (by flag or by date)
        function isGameActuallyNew(game) {
            // Always require an added date to verify - don't trust stale flags
            if (!game.added) {
                return false;
            }
            
            // Don't show hidden games as new (unless they were previously games of the week,
            // which are already handled by the hide override above)
            if (game.hide === true || game.hide === 'yes') {
                return false;
            }
            
            // Check if added date is within last 7 days
            try {
                const addedDate = new Date(game.added);
                const now = new Date();
                // Only consider it new if the date is in the past and within 7 days
                if (addedDate <= now) {
                    const diffTime = now - addedDate;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) {
                        return true;
                    }
                }
            } catch (e) {
                // Invalid date, don't consider it new
                return false;
            }
            return false;
        }
        
        // Separate new games from the rest (using date-aware checking)
        const newGames = filteredGames.filter(game => isGameActuallyNew(game));
        const otherGames = filteredGames.filter(game => !isGameActuallyNew(game));
        
        // Sort new games by release date (newest first), then alphabetically
        newGames.sort((a, b) => {
            // First, sort by added date (newest first)
            const dateA = a.added ? new Date(a.added).getTime() : 0;
            const dateB = b.added ? new Date(b.added).getTime() : 0;
            if (dateB !== dateA) {
                return dateB - dateA; // Newest first
            }
            // If dates are equal or both missing, sort alphabetically
            let titleA = a.title;
            let titleB = b.title;
            if (!titleA || titleA === a.id) {
                titleA = capitalizeFirst(a.id);
            }
            if (!titleB || titleB === b.id) {
                titleB = capitalizeFirst(b.id);
            }
            const normalizedA = normalizeTitleForSorting(titleA).toLowerCase();
            const normalizedB = normalizeTitleForSorting(titleB).toLowerCase();
            return normalizedA.localeCompare(normalizedB);
        });
        
        // Randomize the order of other games
        const shuffledOtherGames = shuffleArray(otherGames);
        
        // Combine: new games first, then randomized other games
        filteredGames = [...newGames, ...shuffledOtherGames];
        
        // Store shuffled games globally for search/clear functionality
        window.allGamesData = filteredGames;

        // populatePreviousGames removed - no longer displaying game grid on home page

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

                // Filter games by partial match on title or id (accent-insensitive)
                let filteredGames;
                if (searchTerm.length === 0) {
                    filteredGames = window.allGamesData;
                } else {
                    const normalizedSearch = removeAccents(searchTerm);
                    filteredGames = window.allGamesData.filter(game => {
                        let displayTitle = game.title;
                        if (!displayTitle || displayTitle === game.id) {
                            displayTitle = capitalizeFirst(game.id);
                        }
                        // Normalize title for display (move "The" to the end)
                        displayTitle = normalizeTitleForSorting(displayTitle);

                        // Match either the display title or the game id (partial, accent-insensitive)
                        const titleMatch = removeAccents(displayTitle).includes(normalizedSearch);
                        const idMatch = game.id && removeAccents(game.id).includes(normalizedSearch);
                        return titleMatch || idMatch;
                    });
                }
                // Display search results in the grid
                if (searchTerm.length > 0) {
                    populatePreviousGames(filteredGames);
                } else {
                    // Clear the grid when search is empty
                    const gridContainer = document.getElementById('previous-games-grid');
                    if (gridContainer) {
                        gridContainer.innerHTML = '';
                    }
                }
                window.updateRandomButtonInfo(); // Update random button info after search input
            });
        }

        // Initialize screensaver after game data is loaded
        // if (window.initScreensaver) {
        //     window.initScreensaver();
        // }

        // Add randomizer button logic
        const randomBtn = document.getElementById('random-game-btn');
        // Filter out hidden games for randomizer (using already filtered games)
        const visibleGames = filteredGames.filter(game => !(game.hide === true || game.hide === 'yes'));
        if (randomBtn && Array.isArray(visibleGames) && visibleGames.length > 0) {
            randomBtn.onclick = () => {
                // Get current search term to determine which games to randomize from
                const searchInput = document.getElementById('game-id-input');
                // Always exclude external games from random selection
                let gamesToRandomizeFrom = visibleGames.filter(game => game.core !== 'external');
                
                    if (searchInput && searchInput.value.trim()) {
                    const searchTerm = searchInput.value.toLowerCase();

                    // Filter games by search term for random selection (include hidden games in search)
                    const normalizedSearch = removeAccents(searchTerm);
                    gamesToRandomizeFrom = window.allGamesData.filter(game => {
                        // Always exclude external games from random selection
                        if (game.core === 'external') return false;

                        let displayTitle = game.title;
                        if (!displayTitle || displayTitle === game.id) {
                            displayTitle = capitalizeFirst(game.id);
                        }
                        // Normalize title for display (move "The" to the end)
                        displayTitle = normalizeTitleForSorting(displayTitle);

                        // Match title or id partially (accent-insensitive)
                        const titleMatch = removeAccents(displayTitle).includes(normalizedSearch);
                        const idMatch = game.id && removeAccents(game.id).includes(normalizedSearch);
                        return titleMatch || idMatch;
                    });
                }
                
                // If no games match the filter, show a message or fall back to all games
                if (gamesToRandomizeFrom.length === 0) {
                    alert('Aucun jeu ne correspond à votre recherche pour la sélection aléatoire.');
                    return;
                }
                
                const randomIdx = Math.floor(Math.random() * gamesToRandomizeFrom.length);
                const randomGame = gamesToRandomizeFrom[randomIdx];
                if (randomGame && randomGame.pageUrl) {
                    // Handle external games differently
                    if (randomGame.core === 'external') {
                        // For external games, open in new tab/window
                        window.open(randomGame.pageUrl, '_blank');
                    } else {
                        // Track game in history and navigate for regular games
                        addGameToHistory(randomGame.id);
                        window.location.href = randomGame.pageUrl;
                    }
                }
            };
            
            // Function to update random button info text
            window.updateRandomButtonInfo = function() {
                const infoText = document.querySelector('.random-info-text');
                if (infoText) {
                    const searchInput = document.getElementById('game-id-input');
                    // Always exclude external games from random selection count
                    let gamesToRandomizeFrom = visibleGames.filter(game => game.core !== 'external');
                    
                    if (searchInput && searchInput.value.trim()) {
                        const searchTerm = searchInput.value.toLowerCase();
                        const normalizedSearch = removeAccents(searchTerm);

                        // Filter games by search term (include hidden games in search)
                        gamesToRandomizeFrom = window.allGamesData.filter(game => {
                            // Always exclude external games from random selection
                            if (game.core === 'external') return false;

                            let displayTitle = game.title;
                            if (!displayTitle || displayTitle === game.id) {
                                displayTitle = capitalizeFirst(game.id);
                            }
                            // Normalize title for display (move "The" to the end)
                            displayTitle = normalizeTitleForSorting(displayTitle);

                            // Match title or id partially (accent-insensitive)
                            const titleMatch = removeAccents(displayTitle).includes(normalizedSearch);
                            const idMatch = game.id && removeAccents(game.id).includes(normalizedSearch);
                            return titleMatch || idMatch;
                        });

                        // Calculate total available games (excluding external games)
                        const totalAvailableGames = window.allGamesData.filter(game => game.core !== 'external').length;
                        infoText.textContent = `Respecte votre recherche actuelle (${gamesToRandomizeFrom.length}/${totalAvailableGames} jeux)`;
                    } else {
                        infoText.textContent = `Respecte votre recherche actuelle (${visibleGames.length} jeux)`;
                    }
                }
            };
            
            // Initialize the random button info
            window.updateRandomButtonInfo();
        }

    } catch (error) {
        // Log the error to the browser console for debugging
        console.error("Could not load or process game list:", error);

        // Display user-friendly error messages on the page
        displayError('#featured-game-title', ' '); // Clear loading text
        // Display the actual error message in the content areas
        displayError('#featured-game-content', `Error loading data: ${error.message}`);
        // displayError('#previous-games-grid', `Error loading data: ${error.message}`); // Removed - no longer using grid
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
    
    // Normalize title for display (move "The" to the end)
    displayTitle = normalizeTitleForSorting(displayTitle);
    
    // Add problem indicator if the game has problems
    if (game.problem === "true") {
        displayTitle += ' (❌)';
    }
    
    titleContainer.textContent = displayTitle;

    // Add rom-missing class to parent container if needed
    const featuredSection = document.getElementById('game-of-the-week');
    if (featuredSection && game.romMissing === true) {
        featuredSection.classList.add('rom-missing-featured'); // Use a distinct class
    }

    // Helper function to check if a game is new (by flag or by date)
    // Note: Game of the week is always considered new
    function isGameNew(game) {
        // Game of the week is always new
        // (This function is only called for the featured game, so always return true)
        return true;
        
        // Original logic kept for reference but not used for featured game:
        // Check explicit new_flag first
        // if (game.new_flag === 'true') {
        //     return true;
        // }
        // // Fallback: check if added date is within last 7 days
        // if (game.added) {
        //     try {
        //         const addedDate = new Date(game.added);
        //         const now = new Date();
        //         // Only consider it new if the date is in the past and within 7 days
        //         if (addedDate <= now) {
        //             const diffTime = now - addedDate;
        //             const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        //             if (diffDays <= 7) {
        //                 return true;
        //             }
        //         }
        //     } catch (e) {
        //         // Invalid date, ignore
        //     }
        // }
        // return false;
    }
    
    // Game of the week is always considered new
    const isNew = isGameNew(game);

    // Create link container for the image
    const gameLink = document.createElement('a');
    // Use pageUrl from JSON (should point to /play?game=...)
    gameLink.href = game.pageUrl || ('/play?game=' + game.id);
    gameLink.style.position = 'relative';

    // Featured Image (uses game.coverArt only now)
    const img = document.createElement('img');
    img.id = 'featured-game-img';
    const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png'; // Use coverArt or default
    img.src = coverSrc;
    img.alt = game.title || 'Featured Game';
    gameLink.appendChild(img);

    // Add orange frame around the image if game is new
    if (isNew) {
        gameLink.classList.add('featured-game-new');
    }

    // Add new badge if game is new
    if (isNew) {
        const badge = document.createElement('span');
        badge.className = 'new-badge';
        badge.textContent = 'NOUVEAU';
        badge.style.position = 'absolute';
        badge.style.top = '7px';
        badge.style.left = '7px';
        gameLink.appendChild(badge);
    }
    
    // Add external game styling if it's an external game
    if (game.game_type === 'external' || game.core === 'external') {
        gameLink.classList.add('game-external');
        // Add external link indicator
        const externalIndicator = document.createElement('span');
        externalIndicator.innerHTML = '🌐';
        externalIndicator.style.position = 'absolute';
        externalIndicator.style.top = '7px';
        externalIndicator.style.right = '7px';
        externalIndicator.style.fontSize = '1.2em';
        externalIndicator.style.opacity = '0.8';
        externalIndicator.style.zIndex = '2';
        externalIndicator.style.pointerEvents = 'none';
        gameLink.appendChild(externalIndicator);
    }

    contentContainer.appendChild(gameLink); // Add linked game image

    // Add metadata fields if present (as a table)
    const metaTable = document.createElement('table');
    metaTable.className = 'game-meta-table';
    
    // Get system name from core field
    const systemName = getSystemName(game.core);
    
    const fields = [
        { label: 'Développeur', key: 'developer' },
        { label: 'Année', key: 'year' },
        { label: 'Système', key: 'system', value: systemName },
        { label: 'Genre', key: 'genre' }
    ];
    fields.forEach(field => {
        let value = field.value !== undefined ? field.value : game[field.key];
        if (value) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerHTML = `<strong>${field.label}:</strong>`;
            labelCell.className = 'meta-label';
            const valueCell = document.createElement('td');
            valueCell.textContent = value;
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

    // Add announcement message if present (after metadata)
    if (game.announcement_message && game.announcement_message.trim()) {
        const announcementDiv = document.createElement('div');
        announcementDiv.className = 'game-announcement';
        announcementDiv.textContent = game.announcement_message;
        contentContainer.appendChild(announcementDiv);
    }

    // Add mouse event listeners for featured game section (same as keyboard navigation)
    const featuredGameSection = document.getElementById('game-of-the-week');
    if (featuredGameSection) {
        // --- Hover and click behavior only on the cover image ---
        const featuredImg = document.getElementById('featured-game-img');
        if (featuredImg) {
            // Find the parent link element
            const gameLink = featuredImg.closest('a');
            if (gameLink) {
                // Add hover effect only on the image/link
                gameLink.addEventListener('mouseenter', (e) => {
                    // Clear any existing highlights
                    clearHighlights();
                    
                    // Add highlight to featured section (for visual feedback)
                    featuredGameSection.classList.add('game-item--selected');
                    
                    // Tooltips disabled on home page
                });
                gameLink.addEventListener('mouseleave', () => {
                    // Remove highlight from featured section
                    featuredGameSection.classList.remove('game-item--selected');
                    removeTooltipWithTimeout();
                });
                
                // Add click handler to use the exploding animation and sound
                gameLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGameClick(featuredGameSection);
                });
            }
        }
    }
    
}

/**
 * Populates the "Previous Week Games" section with games from the previous week.
 * @param {Array} previousWeekGames - An array of objects with gameId and week properties.
 * @param {Array} allGames - An array of all game objects from gamelist.json.
 */
function populatePreviousWeekGames(previousWeekGames, allGames) {
    const container = document.getElementById('previous-week-games-list');
    if (!container) {
        console.warn("Element with ID 'previous-week-games-list' not found.");
        return;
    }

    // Clear placeholder/loading content
    container.innerHTML = '';

    // If no previous week games, hide the section
    if (!previousWeekGames || previousWeekGames.length === 0) {
        const section = document.getElementById('previous-week-games');
        if (section) {
            section.style.display = 'none';
        }
        return;
    }

    // Show the section
    const section = document.getElementById('previous-week-games');
    if (section) {
        section.style.display = 'block';
    }

    // Games are already sorted by week (descending - most recent first) and limited to 10

    // Create game items for each previous week game
    previousWeekGames.forEach((prevGame, idx) => {
        const game = allGames.find(g => g.id === prevGame.gameId);
        if (!game || !game.id) {
            return; // Skip if game not found
        }

        const gameItem = document.createElement('div');
        gameItem.className = 'previous-week-game-item';
        gameItem.dataset.gameId = game.id;
        gameItem._gameData = game; // Attach game data directly

        // Add the 'rom-missing' class if the flag is true
        if (game.romMissing === true) {
            gameItem.classList.add('rom-missing');
        }

        // Add external game styling if it's an external game
        if (game.game_type === 'external' || game.core === 'external') {
            gameItem.classList.add('game-external');
        }

        const link = document.createElement('a');
        link.href = game.pageUrl || '#';
        link.style.position = 'relative';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.gap = '15px';
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        // No event listener needed - gameItem handles the click

        const img = document.createElement('img');
        const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png';
        img.src = coverSrc;
        img.alt = game.title || 'Game Cover';
        img.loading = 'lazy';
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.flexShrink = '0';

        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.flexDirection = 'column';
        titleContainer.style.gap = '4px';
        titleContainer.style.flex = '1';

        const title = document.createElement('div');
        title.className = 'previous-week-game-title';

        // Set the title (capitalize if using default)
        let displayTitle = game.title;
        if (!displayTitle || displayTitle === game.id) {
            displayTitle = capitalizeFirst(game.id);
        }
        
        // Normalize title for display (move "The" to the end)
        displayTitle = normalizeTitleForSorting(displayTitle);
        
        title.textContent = displayTitle;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '1.1em';

        // Add YYYY-WW display
        const weekDisplay = document.createElement('div');
        weekDisplay.className = 'previous-week-game-week';
        // Format YYYYWW to YYYY-WW
        const weekStr = prevGame.week.toString();
        const formattedWeek = weekStr.length === 6 
            ? `${weekStr.substring(0, 4)}-${weekStr.substring(4, 6)}`
            : prevGame.week.toString();
        weekDisplay.textContent = formattedWeek;
        weekDisplay.style.fontSize = '0.75em';
        weekDisplay.style.opacity = '0.6';
        weekDisplay.style.fontWeight = 'normal';

        titleContainer.appendChild(title);
        titleContainer.appendChild(weekDisplay);

        link.appendChild(img);
        link.appendChild(titleContainer);
        gameItem.appendChild(link);
        container.appendChild(gameItem);

        // Add mouse hover behavior (no tooltips on home page)
        gameItem.addEventListener('mouseenter', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            clearHighlights();
            gameItem.classList.add('game-item--selected');
            // Tooltips disabled on home page
        });
        gameItem.addEventListener('mouseleave', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            gameItem.classList.remove('game-item--selected');
        });
        
        // Click behavior - stop propagation to prevent conflicts with parent sections
        gameItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling up to parent sections
            handleGameClick(gameItem);
        });
    });

    // Add "Voir tous les jeux de la semaine" link at the bottom
    if (previousWeekGames.length > 0) {
        const viewAllLink = document.createElement('a');
        viewAllLink.href = '/all?filter=week';
        viewAllLink.textContent = 'Voir tous les jeux de la semaine';
        viewAllLink.style.display = 'block';
        viewAllLink.style.textAlign = 'center';
        viewAllLink.style.marginTop = '20px';
        viewAllLink.style.padding = '12px';
        viewAllLink.style.backgroundColor = 'var(--background)';
        viewAllLink.style.color = 'var(--text-color)';
        viewAllLink.style.textDecoration = 'none';
        viewAllLink.style.borderRadius = '8px';
        viewAllLink.style.border = '2px solid var(--divider-color)';
        viewAllLink.style.transition = 'all 0.2s ease-in-out';
        viewAllLink.style.fontWeight = 'bold';
        viewAllLink.style.width = '100%';
        viewAllLink.style.boxSizing = 'border-box';
        viewAllLink.style.gridColumn = '1 / -1'; /* Span all columns in the grid */
        
        // Hover effect
        viewAllLink.addEventListener('mouseenter', () => {
            viewAllLink.style.backgroundColor = 'var(--text-color)';
            viewAllLink.style.color = 'var(--background)';
            viewAllLink.style.transform = 'translateY(-2px)';
            viewAllLink.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        viewAllLink.addEventListener('mouseleave', () => {
            viewAllLink.style.backgroundColor = 'var(--background)';
            viewAllLink.style.color = 'var(--text-color)';
            viewAllLink.style.transform = 'translateY(0)';
            viewAllLink.style.boxShadow = 'none';
        });
        
        container.appendChild(viewAllLink);
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
    
    // Normalize title for display (move "The" to the end)
    displayTitle = normalizeTitleForSorting(displayTitle);

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
        updateMetaTag('og:image', `${window.location.origin}${game.coverArt}`);
    }

    // Update Twitter meta tags
    updateMetaTag('twitter:title', `BonjourArcade - ${displayTitle}`);
    updateMetaTag('twitter:description', description);
    if (game.coverArt) {
        updateMetaTag('twitter:image', `${window.location.origin}${game.coverArt}`);
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
        // Check if we're in search mode by looking at the search input
        const searchInput = document.getElementById('game-id-input');
        const isSearching = searchInput && searchInput.value.trim().length > 0;
        
        if (isSearching) {
            // In search mode, show all games including hidden ones
            visibleGames = games;
        } else {
            // Filter out hidden games when not searching
            visibleGames = games.filter(game => !(game.hide === true || game.hide === 'yes'));
        }
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

        // Add new border if game is actually new (using date-aware checking)
        // Always require an added date - don't trust stale flags
        let isNewInList = false;
        if (game.added) {
            try {
                const addedDate = new Date(game.added);
                const now = new Date();
                if (addedDate <= now) {
                    const diffTime = now - addedDate;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    // Only consider it new if within 7 days
                    if (diffDays <= 7) {
                        isNewInList = true;
                    }
                }
            } catch (e) {
                // Invalid date, don't consider it new
            }
        }
        
        if (isNewInList) {
            gameItem.classList.add('game-new');
        }
        
        // Add external game styling if it's an external game
        if (game.game_type === 'external' || game.core === 'external') {
            gameItem.classList.add('game-external');
        }

        const link = document.createElement('a');
        // Use pageUrl from JSON (should point to play?game=...)
        link.href = game.pageUrl || '#';
        link.style.position = 'relative';

        const img = document.createElement('img');
        const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png';
        img.src = coverSrc;
        img.alt = game.title || 'Game Cover';
        img.loading = 'lazy'; // Lazy load images

        // Add new badge if game is actually new
        if (isNewInList) {
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
        
        // Normalize title for display (move "The" to the end)
        displayTitle = normalizeTitleForSorting(displayTitle);
        
        title.textContent = displayTitle;

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
    const allPreviousWeekItems = Array.from(document.querySelectorAll('.previous-week-game-item'));
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
            // If the featured section is selected, animate previous week games radially
            if (element === featured) {
                if (child.id === 'previous-week-games') {
                    // Animate all previous week game items radially
                    const previousWeekItems = child.querySelectorAll('.previous-week-game-item');
                    previousWeekItems.forEach(item => {
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
                } else if (child.id === 'previous-games') {
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
                    // For other sections, animate as a whole
                    const rect = child.getBoundingClientRect();
                    const dx = rect.left + rect.width / 2 - selCenter.x;
                    const dir = dx < 0 ? -1 : 1;
                    child.classList.add('radial-exit');
                    child.style.transform = `translateX(${dir * 1600}px) scale(0.7)`;
                }
            } else if (child === featured && element !== featured && !child.contains(element)) {
                // If clicking on a previous week game, animate the featured section radially
                const rect = child.getBoundingClientRect();
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
                child.classList.add('radial-exit');
                child.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
            } else if (child !== element && !child.contains(element) && child !== featured) {
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
    // Animate all other previous week game items radially (skip if already handled above)
    allPreviousWeekItems.forEach(item => {
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
        // Check if this is an external game by looking at the game data
        let gameData = null;
        if (element._gameData) {
            gameData = element._gameData;
        } else if (element.dataset.gameId) {
            // Try to find game data from the games array
            const games = window.games || [];
            gameData = games.find(g => g.id === element.dataset.gameId);
        }
        
        // Handle external games differently
        if (gameData && gameData.core === 'external') {
            // For external games, open in new tab/window
            window.open(targetUrl, '_blank');
        } else {
            // Track game in history before navigating for regular games
            const gameId = extractGameIdFromUrl(targetUrl);
            if (gameId) {
                addGameToHistory(gameId);
            }
            window.location.href = targetUrl;
        }
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
        const allPreviousWeekItems = Array.from(document.querySelectorAll('.previous-week-game-item'));
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
                // If the featured section is selected, animate previous week games radially
                if (selectedEl === featured) {
                    if (child.id === 'previous-week-games') {
                        // Animate all previous week game items radially
                        const previousWeekItems = child.querySelectorAll('.previous-week-game-item');
                        previousWeekItems.forEach(item => {
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
                    } else if (child.id === 'previous-games') {
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
                        // For other sections, animate as a whole
                        const rect = child.getBoundingClientRect();
                        const dx = rect.left + rect.width / 2 - selCenter.x;
                        const dir = dx < 0 ? -1 : 1;
                        child.classList.add('radial-exit');
                        child.style.transform = `translateX(${dir * 1600}px) scale(0.7)`;
                    }
                } else if (child === featured && selectedEl !== featured && !child.contains(selectedEl)) {
                    // If clicking on a previous week game, animate the featured section radially
                    const rect = child.getBoundingClientRect();
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
                    child.classList.add('radial-exit');
                    child.style.transform = `translate(${tx}px, ${ty}px) scale(0.7)`;
                } else if (child !== selectedEl && !child.contains(selectedEl) && child !== featured) {
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
        // Animate all other previous week game items radially (skip if already handled above)
        allPreviousWeekItems.forEach(item => {
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
            // Check if this is an external game by looking at the game data
            let gameData = null;
            if (selectedEl._gameData) {
                gameData = selectedEl._gameData;
            } else if (selectedEl.dataset.gameId) {
                // Try to find game data from the games array
                const games = window.games || [];
                gameData = games.find(g => g.id === selectedEl.dataset.gameId);
            }
            
            // Handle external games differently
            if (gameData && gameData.core === 'external') {
                // For external games, open in new tab/window
                window.open(targetUrl, '_blank');
            } else {
                // Track game in history before navigating for regular games
                const gameId = extractGameIdFromUrl(targetUrl);
                if (gameId) {
                    addGameToHistory(gameId);
                }
                window.location.href = targetUrl;
            }
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
                // populatePreviousGames removed - no longer displaying game grid on home page
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
            // Determine grid width (if grid exists, otherwise default to 1)
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
    const gridElement = document.getElementById('previous-games-grid');
    if (gridElement) {
        observer.observe(gridElement, {childList: true, subtree: false});
    }

    window.addEventListener('DOMContentLoaded', () => {
        updateGameItems();
        // Don't highlight on page load - only when user navigates
    });
})();

// Newsletter functionality (now Ko-fi support button)
function initializeNewsletter() {
    // Ensure the link points to Ko-fi (defensive check in case of caching issues)
    const supportLink = document.getElementById('newsletter-subscribe');
    if (supportLink && supportLink.tagName === 'A') {
        // Make sure href is set correctly
        if (!supportLink.href.includes('ko-fi.com')) {
            supportLink.href = 'https://ko-fi.com/bonjourarcade';
        }
        // Remove any old event listeners by cloning and replacing
        const newLink = supportLink.cloneNode(true);
        supportLink.parentNode.replaceChild(newLink, supportLink);
    }
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
