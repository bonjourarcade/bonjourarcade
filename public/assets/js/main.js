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

/**
 * Updates the search input placeholder with the total number of games available
 */
function updateSearchPlaceholder() {
    const gameIdInput = document.getElementById('game-id-input');
    if (gameIdInput && window.allGamesData && window.allGamesData.length > 0) {
        gameIdInput.placeholder = `Recherche parmi les ${window.allGamesData.length} jeux disponibles`;
    }
}

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
            function getISOWeekInfo(date) {
                const target = new Date(date.valueOf());
                const dayNr = (date.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const isoYear = target.getFullYear();
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) {
                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                }
                const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
                return { week: weekNumber, year: isoYear };
            }
            
            const now = new Date();
            const { week: currentWeek, year: currentYear } = getISOWeekInfo(now);
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
                
                // Sort by week (descending - most recent first) and limit to 11
                previousWeekGames.sort((a, b) => b.week - a.week);
                previousWeekGames = previousWeekGames.slice(0, 11);
                
                console.log(`Found ${previousGotwGameIds.size} previous games of the week (current week: ${currentWeekSeed})`);
                console.log(`Found ${previousWeekGames.length} games from previous weeks (showing last 11)`);
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

        // Update search placeholder with game count
        updateSearchPlaceholder();

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
        const footerRandomBtn = document.getElementById('footer-random-game-btn');
        // Filter out hidden games for randomizer (using already filtered games)
        const visibleGames = filteredGames.filter(game => !(game.hide === true || game.hide === 'yes'));
        
        // Function to handle random game button click (reusable for both buttons)
        const setupRandomButton = (button) => {
            if (!button || !Array.isArray(visibleGames) || visibleGames.length === 0) return;
            
            button.onclick = (e) => {
                // Prevent default link behavior
                e.preventDefault();
                
                // Prevent multiple clicks during animation
                if (button.classList.contains('rolling')) {
                    return;
                }
                
                // Add rolling animation class
                button.classList.add('rolling');
                
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
                    button.classList.remove('rolling');
                    alert('Aucun jeu ne correspond à votre recherche pour la sélection aléatoire.');
                    return;
                }
                
                // Wait for animation to complete before navigating
                setTimeout(() => {
                    const randomIdx = Math.floor(Math.random() * gamesToRandomizeFrom.length);
                    const randomGame = gamesToRandomizeFrom[randomIdx];
                    if (randomGame && randomGame.pageUrl) {
                        // Handle external games differently
                        if (randomGame.core === 'external') {
                            // For external games, open in new tab/window
                            window.open(randomGame.pageUrl, '_blank');
                            // Reset button after a delay
                            setTimeout(() => {
                                button.classList.remove('rolling');
                                button.style.transform = '';
                                button.style.opacity = '';
                            }, 100);
                        } else {
                            // Track game in history and navigate for regular games
                            addGameToHistory(randomGame.id);
                            window.location.href = randomGame.pageUrl;
                        }
                    } else {
                        // Reset button if navigation fails
                        button.classList.remove('rolling');
                        button.style.transform = '';
                        button.style.opacity = '';
                    }
                }, 1200); // Match animation duration
            };
        };
        
        // Setup both buttons
        if (randomBtn) {
            setupRandomButton(randomBtn);
        }
        if (footerRandomBtn) {
            setupRandomButton(footerRandomBtn);
        }
        
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

    // Check if essential elements exist
    if (!contentContainer) {
         // console.error("Required HTML elements for featured game not found."); // Removed for cleaner console
         return;
    }

    // Check if game data is valid (especially game.id)
    if (!game || !game.id) {
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

    // Create container for two columns: left (cover+button), right (title+metadata+description+leaderboard)
    const gameContainer = document.createElement('div');
    gameContainer.className = 'featured-game-container';

    // Left Column: Cover + JOUER button
    const coverColumn = document.createElement('div');
    coverColumn.className = 'featured-game-cover-column';

    // Create wrapper for the cover image
    const coverWrapper = document.createElement('div');
    coverWrapper.className = 'featured-game-cover-wrapper';

    // Add "Jeu de la semaine" label above the image
    const weekLabel = document.createElement('div');
    weekLabel.className = 'featured-game-week-label';
    weekLabel.textContent = 'Jeu de la semaine';
    coverWrapper.appendChild(weekLabel);

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

    coverWrapper.appendChild(gameLink);
    
    // Add "JOUER" button underneath the game cover
    const playButton = document.createElement('a');
    playButton.href = game.pageUrl || ('/play?game=' + game.id);
    playButton.className = 'featured-play-button';
    playButton.textContent = 'JOUER';
    
    // Add click handler to use the same animation and sound as the game cover
    playButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const featuredGameSection = document.getElementById('game-of-the-week');
        if (featuredGameSection) {
            handleGameClick(featuredGameSection);
        }
    });
    
    coverWrapper.appendChild(playButton);
    
    coverColumn.appendChild(coverWrapper);
    gameContainer.appendChild(coverColumn);

    // Right Column: Title, Metadata, Description, and Leaderboard
    const rightColumn = document.createElement('div');
    rightColumn.className = 'featured-game-right-column';

    // Game Title (large, bold)
    const gameTitleDiv = document.createElement('div');
    gameTitleDiv.className = 'featured-game-title-large';
    gameTitleDiv.textContent = displayTitle;
    rightColumn.appendChild(gameTitleDiv);

    // Metadata and Description wrapper
    const metadataWrapper = document.createElement('div');
    metadataWrapper.className = 'featured-game-metadata-wrapper';
    
    // Metadata fields (left side of right column)
    const metadataLeft = document.createElement('div');
    metadataLeft.className = 'featured-game-metadata-left';
    
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
            const metaRow = document.createElement('div');
            metaRow.className = 'featured-meta-row';
            const label = document.createElement('span');
            label.className = 'featured-meta-label';
            label.textContent = field.label + ':';
            const valueSpan = document.createElement('span');
            valueSpan.className = 'featured-meta-value';
            valueSpan.textContent = value;
            metaRow.appendChild(label);
            metaRow.appendChild(valueSpan);
            metadataLeft.appendChild(metaRow);
        }
    });
    
    // Add controls if present
    if (game.controls && summarizeControls(game.controls)) {
        const metaRow = document.createElement('div');
        metaRow.className = 'featured-meta-row';
        const label = document.createElement('span');
        label.className = 'featured-meta-label';
        label.textContent = 'Contrôles:';
        const valueSpan = document.createElement('span');
        valueSpan.className = 'featured-meta-value';
        valueSpan.textContent = summarizeControls(game.controls);
        metaRow.appendChild(label);
        metaRow.appendChild(valueSpan);
        metadataLeft.appendChild(metaRow);
    }
    
    metadataWrapper.appendChild(metadataLeft);

    // Description (right side of right column)
    if (game.announcement_message && game.announcement_message.trim()) {
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'featured-game-description';
        descriptionDiv.textContent = game.announcement_message;
        metadataWrapper.appendChild(descriptionDiv);
    }
    
    rightColumn.appendChild(metadataWrapper);

    // Leaderboard section
    const leaderboard = document.createElement('div');
    leaderboard.className = 'featured-game-leaderboard';
    leaderboard.id = 'featured-game-leaderboard';
    
    // Add scores section if scores are enabled
    const scoresEnabled = game.enable_score !== false && game.enable_score !== "false";
    console.log(`Featured game: ${game.id}, scores enabled: ${scoresEnabled}`);
    if (scoresEnabled) {
        const leaderboardTitle = document.createElement('h4');
        leaderboardTitle.className = 'featured-leaderboard-title';
        leaderboardTitle.textContent = 'Classement';
        leaderboard.appendChild(leaderboardTitle);
        
        const leaderboardContent = document.createElement('div');
        leaderboardContent.className = 'featured-leaderboard-content';
        leaderboardContent.innerHTML = '<div class="featured-leaderboard-loading">Chargement...</div>';
        leaderboard.appendChild(leaderboardContent);
        
        // Clear any existing refresh interval before creating a new one
        if (window.featuredGameLeaderboardRefreshInterval) {
            clearInterval(window.featuredGameLeaderboardRefreshInterval);
            window.featuredGameLeaderboardRefreshInterval = null;
        }
        
        // Fetch leaderboard data - use setTimeout to ensure DOM is ready
        console.log(`Fetching leaderboard for featured game: ${game.id}`);
        setTimeout(() => {
            fetchFeaturedGameLeaderboard(game.id);
        }, 100);
        
        // Set up periodic refresh of leaderboard every 2 minutes (silent background refresh)
        const scoreRefreshInterval = setInterval(() => {
            console.log('Refreshing featured game leaderboard scores (2-minute interval)');
            // Use silent refresh to avoid flashing "Chargement..." message
            fetchFeaturedGameLeaderboard(game.id, true);
        }, 120000); // 2 minutes = 120,000 milliseconds
        
        // Store interval ID for cleanup if needed
        window.featuredGameLeaderboardRefreshInterval = scoreRefreshInterval;
        
        // Cleanup interval when page is unloaded
        if (!window.featuredGameLeaderboardCleanupAdded) {
            window.addEventListener('beforeunload', function() {
                if (window.featuredGameLeaderboardRefreshInterval) {
                    clearInterval(window.featuredGameLeaderboardRefreshInterval);
                    window.featuredGameLeaderboardRefreshInterval = null;
                }
            });
            window.featuredGameLeaderboardCleanupAdded = true;
        }
    } else {
        const leaderboardTitle = document.createElement('h4');
        leaderboardTitle.className = 'featured-leaderboard-title';
        leaderboardTitle.textContent = 'Classement';
        leaderboard.appendChild(leaderboardTitle);
        
        const leaderboardContent = document.createElement('div');
        leaderboardContent.className = 'featured-leaderboard-content';
        leaderboardContent.innerHTML = '<p style="text-align: center; opacity: 0.6;">Scores désactivés</p>';
        leaderboard.appendChild(leaderboardContent);
    }
    
    rightColumn.appendChild(leaderboard);
    gameContainer.appendChild(rightColumn);
    contentContainer.appendChild(gameContainer);

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
 * Fetches and displays leaderboard for the featured game.
 * On initial load, shows a loading message.
 * On periodic refresh (isRefresh=true), fetches in background and only updates
 * the DOM if the scores actually changed, to avoid a flashing effect.
 * @param {string} gameId - The game ID to fetch scores for
 * @param {boolean} [isRefresh=false] - Whether this is a silent background refresh
 */
async function fetchFeaturedGameLeaderboard(gameId, isRefresh = false) {
    console.log(`fetchFeaturedGameLeaderboard called with gameId: ${gameId}`);
    const leaderboardContainer = document.getElementById('featured-game-leaderboard');
    if (!leaderboardContainer) {
        console.warn('Leaderboard container not found: featured-game-leaderboard');
        return;
    }
    
    const leaderboardContent = leaderboardContainer.querySelector('.featured-leaderboard-content');
    if (!leaderboardContent) {
        console.warn('Leaderboard content not found');
        return;
    }

    // Show loading state only on initial load, not on silent refresh
    if (!isRefresh) {
        leaderboardContent.innerHTML = '<div class="featured-leaderboard-loading">Chargement...</div>';
    }
    
    try {
        // Check if we're on localhost and use mock data
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.hostname.includes('localhost') ||
                          window.location.hostname.startsWith('192.168.');
        
        let data;
        
        if (isLocalhost) {
            // Use mock data for localhost
            console.log('Using mock leaderboard data for localhost');
            data = {
                result: {
                    success: true,
                    scores: generateMockScores(gameId)
                }
            };
        } else {
            // Use real API for production
            console.log(`Fetching leaderboard from API for game: ${gameId}`);
            const response = await fetch('https://us-central1-alloarcade.cloudfunctions.net/listGameScores', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7,en-GB;q=0.6,en-US;q=0.5',
                    'cache-control': 'no-cache',
                    'content-type': 'application/json',
                    'firebase-instance-id-token': 'd81DC0UGvyC6i41_okOipa:APA91bHNG-8qmIvzgyCLGKg54RBFwRyB2hx6QEcZ2BJUHcbmcvilEJnpCQscmrnOgpVrFlurW4Fg6b0Lkzs_Lzgl53iECK6E8-pPLVN_yHC8_beMww7Blxg',
                    'origin': 'https://alloarcade.web.app',
                    'pragma': 'no-cache',
                    'priority': 'u=1, i',
                    'referer': 'https://alloarcade.web.app/',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({
                    data: {
                        timeRange: "all",
                        gameId: gameId
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            data = await response.json();
            console.log('Leaderboard API response received:', data);
        }
        
        if (!data.result || !data.result.success || !data.result.scores) {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format');
        }

        // Find the oldest score (first submitted) among all scores
        let oldestScore = null;
        let oldestTimestamp = Infinity;
        
        data.result.scores.forEach(score => {
            if (score.date && score.date._seconds) {
                const timestamp = score.date._seconds;
                if (timestamp < oldestTimestamp) {
                    oldestTimestamp = timestamp;
                    oldestScore = score;
                }
            }
        });
        
        // Get best score for each unique player
        const playerBestScores = new Map();
        
        data.result.scores.forEach(score => {
            const userId = score.userId;
            const currentBest = playerBestScores.get(userId);
            
            if (!currentBest || score.score > currentBest.score) {
                playerBestScores.set(userId, {
                    player: score.player,
                    score: score.score,
                    rank: score.rank,
                    userId: userId
                });
            }
        });

        // Convert to array and sort by score (highest first)
        const sortedScores = Array.from(playerBestScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Show top 10 players

        if (sortedScores.length === 0) {
            // Only show "no scores" on initial load; keep existing content on silent refresh
            if (!isRefresh) {
                leaderboardContent.innerHTML = '<div class="featured-leaderboard-loading">Aucun score trouvé</div>';
            }
            return;
        }

        // Identify if the oldest score's player is in the top 10
        const oldestPlayerId = oldestScore ? oldestScore.userId : null;
        const isOldestInTop10 = oldestPlayerId && sortedScores.some(score => score.userId === oldestPlayerId);

        // Helper function to get initial from player name
        function getPlayerInitial(playerName) {
            if (!playerName) return '?';
            // Remove brackets and content inside them (e.g., [AP])
            const cleaned = playerName.replace(/\[.*?\]/g, '').trim();
            if (cleaned.length === 0) return '?';
            // Get first letter, uppercase
            return cleaned.charAt(0).toUpperCase();
        }
        
        // Helper function to get avatar color based on player name
        function getAvatarColor(playerName) {
            if (!playerName) return '#999';
            // Simple hash function to get consistent color
            let hash = 0;
            for (let i = 0; i < playerName.length; i++) {
                hash = playerName.charCodeAt(i) + ((hash << 5) - hash);
            }
            // Generate a color from the hash
            const hue = Math.abs(hash) % 360;
            return `hsl(${hue}, 70%, 50%)`;
        }
        
        // On refresh, compare with current scores to avoid unnecessary DOM updates
        if (isRefresh) {
            const currentEntries = leaderboardContent.querySelectorAll('.featured-leaderboard-entry');
            let scoresChanged = false;

            if (currentEntries.length !== sortedScores.length) {
                scoresChanged = true;
            } else {
                for (let i = 0; i < sortedScores.length; i++) {
                    const currentPlayer = currentEntries[i]?.querySelector('.featured-leaderboard-player')?.textContent;
                    const currentScore = currentEntries[i]?.querySelector('.featured-leaderboard-score')?.textContent?.replace(/\s/g, '');

                    const score = sortedScores[i];
                    const isOldestPlayer = isOldestInTop10 && score.userId === oldestPlayerId;
                    const newScoreText = `${isOldestPlayer ? '🍪 ' : ''}${score.score.toLocaleString()}`;

                    const newPlayer = score.player;
                    const normalizedNewScore = newScoreText.replace(/\s/g, '');

                    if (currentPlayer !== newPlayer || currentScore !== normalizedNewScore) {
                        scoresChanged = true;
                        break;
                    }
                }
            }

            // Only update if scores have changed
            if (!scoresChanged) {
                console.log('Featured leaderboard refresh: no score changes detected, skipping DOM update');
                return;
            }
        }

        // Build leaderboard HTML
        let leaderboardHTML = '';
        sortedScores.forEach((score, index) => {
            const rank = index + 1;
            const rankText = rank.toString();
            
            // Escape HTML to prevent XSS
            const playerName = escapeHtml(score.player);
            const initial = getPlayerInitial(score.player);
            const avatarColor = getAvatarColor(score.player);
            
            // Check if this is the player with the oldest score
            const isOldestPlayer = isOldestInTop10 && score.userId === oldestPlayerId;
            
            leaderboardHTML += `
                <div class="featured-leaderboard-entry" data-game-id="${escapeHtml(gameId)}" style="cursor: pointer;">
                    <div class="featured-leaderboard-rank">${rankText}</div>
                    <div class="featured-leaderboard-avatar" style="background-color: ${avatarColor}">${initial}</div>
                    <div class="featured-leaderboard-player">${playerName}</div>
                    <div class="featured-leaderboard-score">${isOldestPlayer ? '🍪 ' : ''}${score.score.toLocaleString()}</div>
                </div>
            `;
        });

        leaderboardContent.innerHTML = leaderboardHTML;
        
        // Add click handlers to each leaderboard entry
        const leaderboardEntries = leaderboardContent.querySelectorAll('.featured-leaderboard-entry');
        leaderboardEntries.forEach(entry => {
            entry.addEventListener('click', () => {
                const entryGameId = entry.getAttribute('data-game-id');
                if (entryGameId) {
                    window.location.href = `https://alloarcade.web.app/leaderboards/${entryGameId}`;
                }
            });
        });
        
        console.log(`Leaderboard successfully displayed for game: ${gameId}, showing ${sortedScores.length} scores`);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        if (leaderboardContent) {
            leaderboardContent.innerHTML = '<div class="featured-leaderboard-error">Erreur de chargement</div>';
        }
    }
}

/**
 * Generates mock scores for localhost testing
 * @param {string} gameId - The game ID
 * @returns {Array} Array of mock score objects
 */
function generateMockScores(gameId) {
    const mockPlayers = [
        { name: "Félix L", userId: "user1" },
        { name: "Marie C", userId: "user2" },
        { name: "Jean P", userId: "user3" },
        { name: "Sophie M", userId: "user4" },
        { name: "Pierre D", userId: "user5" },
        { name: "Alice R", userId: "user6" },
        { name: "Thomas B", userId: "user7" },
        { name: "Emma L", userId: "user8" }
    ];

    // Generate different score ranges based on game type
    let baseScore = 1000;
    if (gameId.includes('shmup') || gameId.includes('shoot')) {
        baseScore = 50000;
    } else if (gameId.includes('puzzle')) {
        baseScore = 5000;
    } else if (gameId.includes('platform')) {
        baseScore = 15000;
    }

    return mockPlayers.map((player, index) => ({
        rank: index + 1,
        id: `mock_${player.userId}_${Date.now()}`,
        userId: player.userId,
        player: player.name,
        photoURL: `https://via.placeholder.com/96/cccccc/666666?text=${player.name.charAt(0)}`,
        score: Math.floor(baseScore * (1 + Math.random() * 5) * (1 - index * 0.1)),
        game: gameId,
        date: {
            _seconds: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30),
            _nanoseconds: Math.floor(Math.random() * 1000000000)
        },
        verified: true,
        screenshotUrl: `https://via.placeholder.com/300x200/333333/ffffff?text=Screenshot`
    }));
}

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

    // Show the section (even if no previous games, we'll show the buttons)
    const section = document.getElementById('previous-week-games');
    if (section) {
        section.style.display = 'block';
    }

    // If no previous week games, just add the buttons and return
    if (!previousWeekGames || previousWeekGames.length === 0) {
        // Add buttons to empty container
        addRandomAndLeaderboardButtons(container);
        return;
    }

    // Games are already sorted by week (descending - most recent first) and limited to 11
    // Limit to 4 games for display on homepage
    const gamesToDisplay = previousWeekGames.slice(0, 4);
    const hasMoreGames = previousWeekGames.length > 4;

    // Create game items for each previous week game (limited to 4)
    gamesToDisplay.forEach((prevGame, idx) => {
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

    // Add "Voir l'historique complet des jeux de la semaine" link at the bottom
    // Show the link if there are any games (even if only 4 or less, in case there are more available)
    if (previousWeekGames.length > 0) {
        const viewAllLink = document.createElement('a');
        viewAllLink.href = '/all?filter=week';
        viewAllLink.textContent = "Voir l'historique complet des jeux de la semaine";
        viewAllLink.className = 'previous-week-view-all-link';
        
        container.appendChild(viewAllLink);
    }
    
    // Add Random Game and Leaderboard buttons to the same grid
    addRandomAndLeaderboardButtons(container);
}

/**
 * Adds Random Game and Leaderboard buttons to the specified container
 * @param {HTMLElement} container - The container to add buttons to
 */
function addRandomAndLeaderboardButtons(container) {
    if (!container) return;
    
    let leaderboardLink = document.getElementById('leaderboard-link');
    
    // Create leaderboard link if it doesn't exist
    if (!leaderboardLink) {
        leaderboardLink = document.createElement('a');
        leaderboardLink.id = 'leaderboard-link';
        leaderboardLink.href = 'https://alloarcade.web.app';
        leaderboardLink.target = '_blank';
        leaderboardLink.textContent = 'Classements';
    }
    
    if (leaderboardLink) {
        // Remove from current location if it exists elsewhere
        if (leaderboardLink.parentNode && leaderboardLink.parentNode !== container) {
            leaderboardLink.parentNode.removeChild(leaderboardLink);
        }
        // Style the link to take full width
        leaderboardLink.style.gridColumn = '1 / -1';
        leaderboardLink.style.width = '100%';
        leaderboardLink.style.marginTop = '8px';
        leaderboardLink.style.display = 'block';
        if (!container.contains(leaderboardLink)) {
            container.appendChild(leaderboardLink);
        }
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
