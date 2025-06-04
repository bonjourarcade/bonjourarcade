document.addEventListener('DOMContentLoaded', () => {
    // This function starts the process when the HTML page is fully loaded
    fetchGameData();

    // Screensaver functionality
    let idleTime = 0;
    const idleInterval = setInterval(timerIncrement, 1000); // 1 second
    const SCREENSAVER_TIMEOUT_MINUTES = 10; // Reverted to 10 minutes
    let screensaverActive = false;
    let isActivatingScreensaver = false; // New flag to prevent immediate deactivation during activation
    const screensaverOverlay = document.getElementById('screensaver-overlay');
    const screensaverImage = document.getElementById('screensaver-image');
    const screensaverLogo = document.getElementById('screensaver-logo'); // Get the logo element
    const screensaverTimer = document.getElementById('screensaver-timer'); // Get the timer element
    let featuredGameCoverArt = '';

    // Screensaver animation variables for main image
    let screensaverAnimationFrame;
    let imageX = 0;
    let imageY = 0;
    let imageDx = 1; // Initial horizontal speed
    let imageDy = 1; // Initial vertical speed

    // Screensaver animation variables for logo
    let logoX = 0;
    let logoY = 0;
    let logoDx = 1.2; // Slightly different speed for independent path
    let logoDy = 1.2; // Slightly different speed for independent path
    const logoSize = 150; // Matches CSS width for the logo

    // Capture initial featured game cover art after it's loaded
    const originalPopulateFeaturedGame = populateFeaturedGame;
    populateFeaturedGame = function(game) {
        originalPopulateFeaturedGame(game);
        if (game && game.coverArt) {
            featuredGameCoverArt = game.coverArt;
        }
    };

    // Reset idle time on user activity
    document.addEventListener('mousemove', resetIdleTime);
    document.addEventListener('touchstart', resetIdleTime); // For touch devices

    // Key 'é' for immediate screensaver activation, and general key presses for deactivation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'é') {
            if (!screensaverActive) {
                event.preventDefault(); // Prevent default browser action (like scrolling)
                startScreensaver();
                return; // IMPORTANT: Exit here, don't reset idle time for 'é' activation
            }
        }
        
        // For any other key, or for 'é' when screensaver is already active, reset idle time.
        resetIdleTime();
    });

    function timerIncrement() {
        idleTime++;
        const timeLeft = SCREENSAVER_TIMEOUT_MINUTES * 60 - idleTime;
        if (timeLeft > 0 && !screensaverActive) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            screensaverTimer.textContent = `Screensaver in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            screensaverTimer.style.display = 'block';
        } else {
            screensaverTimer.style.display = 'none';
        }

        if (idleTime >= SCREENSAVER_TIMEOUT_MINUTES * 60 && !screensaverActive) {
            startScreensaver();
        }
    }

    function resetIdleTime() {
        if (isActivatingScreensaver) {
            return; // Ignore activity during the screensaver activation phase
        }

        idleTime = 0;
        screensaverTimer.style.display = 'none';
        if (screensaverActive) {
            stopScreensaver();
        }
    }

    function startScreensaver() {
        if (!screensaverActive) {
            screensaverActive = true;
            isActivatingScreensaver = true; // Set flag when activation begins

            // Programmatically scroll to the top to handle browser behavior proactively
            window.scrollTo(0, 0);

            document.body.classList.add('screensaver-active');
            document.documentElement.classList.add('screensaver-active');
            screensaverOverlay.style.display = 'flex';
            screensaverTimer.style.display = 'none';

            // Add scroll listener AFTER a brief delay to allow browser to handle overflow:hidden scroll
            setTimeout(() => {
                document.addEventListener('scroll', stopScreensaver, { once: true });
                isActivatingScreensaver = false; // Reset flag after delay
            }, 300); // Increased delay to 300ms for more robustness

            // Set main image source
            if (featuredGameCoverArt) {
                screensaverImage.src = featuredGameCoverArt;
            } else {
                screensaverImage.src = '/assets/images/placeholder_thumb.png';
            }
            // Set logo source
            screensaverLogo.src = '/assets/images/bonjourarcade-logo.png';

            const initScreensaverAnimation = () => {
                // Initialize main image position
                const currentImageWidth = screensaverImage.offsetWidth;
                const currentImageHeight = screensaverImage.offsetHeight;
                // console.log('initScreensaverAnimation: Main Image Dimensions - Width:', currentImageWidth, 'Height:', currentImageHeight);

                imageX = Math.random() * (document.documentElement.clientWidth - currentImageWidth);
                imageY = Math.random() * (document.documentElement.clientHeight - currentImageHeight);

                // Initialize logo position
                const currentLogoWidth = screensaverLogo.offsetWidth;
                const currentLogoHeight = screensaverLogo.offsetHeight;
                // console.log('initScreensaverAnimation: Logo Dimensions - Width:', currentLogoWidth, 'Height:', currentLogoHeight);

                logoX = Math.random() * (document.documentElement.clientWidth - currentLogoWidth);
                logoY = Math.random() * (document.documentElement.clientHeight - currentLogoHeight);

                screensaverAnimationFrame = requestAnimationFrame(updateScreensaverImagePosition);
                // console.log('Animation frame requested.');
            };

            // Wait for both images to load before starting animation
            let imagesLoaded = 0;
            const imageLoadHandler = (event) => {
                // console.log('Image loaded:', event.target.id || event.target.src);
                imagesLoaded++;
                if (imagesLoaded === 2) { // Assuming 2 images: screensaverImage and screensaverLogo
                    // console.log('All images loaded. Initializing animation.');
                    initScreensaverAnimation();
                }
            };

            if (screensaverImage.complete) {
                // console.log('screensaverImage already complete.');
                imageLoadHandler({ target: { id: 'screensaver-image', src: screensaverImage.src } });
            } else {
                screensaverImage.onload = imageLoadHandler;
                // console.log('screensaverImage onload registered.');
            }
            if (screensaverLogo.complete) {
                // console.log('screensaverLogo already complete.');
                imageLoadHandler({ target: { id: 'screensaver-logo', src: screensaverLogo.src } });
            } else {
                screensaverLogo.onload = imageLoadHandler;
                // console.log('screensaverLogo onload registered.');
            }
        }
    }

    function stopScreensaver() {
        if (screensaverActive) {
            screensaverActive = false;
            document.body.classList.remove('screensaver-active');
            document.documentElement.classList.remove('screensaver-active');
            screensaverOverlay.style.display = 'none';
            screensaverImage.src = '';
            screensaverLogo.src = ''; // Clear logo source
            cancelAnimationFrame(screensaverAnimationFrame);
            screensaverImage.onload = null;
            screensaverLogo.onload = null; // Remove logo onload handler
        }
    }

    function updateScreensaverImagePosition() {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

        // Update and check main image position
        imageX += imageDx;
        imageY += imageDy;
        const currentImageWidth = screensaverImage.offsetWidth;
        const currentImageHeight = screensaverImage.offsetHeight;

        if (imageX + currentImageWidth > viewportWidth || imageX < 0) {
            imageDx *= -1;
            if (imageX < 0) imageX = 0;
            if (imageX + currentImageWidth > viewportWidth) imageX = viewportWidth - currentImageWidth;
        }
        if (imageY + currentImageHeight > viewportHeight || imageY < 0) {
            imageDy *= -1;
            if (imageY < 0) imageY = 0;
            if (imageY + currentImageHeight > viewportHeight) imageY = viewportHeight - currentImageHeight;
        }
        screensaverImage.style.left = `${imageX}px`;
        screensaverImage.style.top = `${imageY}px`;

        // Update and check logo position
        logoX += logoDx;
        logoY += logoDy;
        const currentLogoWidth = screensaverLogo.offsetWidth;
        const currentLogoHeight = screensaverLogo.offsetHeight;

        if (logoX + currentLogoWidth > viewportWidth || logoX < 0) {
            logoDx *= -1;
            if (logoX < 0) logoX = 0;
            if (logoX + currentLogoWidth > viewportWidth) logoX = viewportWidth - currentLogoWidth;
        }
        if (logoY + currentLogoHeight > viewportHeight || logoY < 0) {
            logoDy *= -1;
            if (logoY < 0) logoY = 0;
            if (logoY + currentLogoHeight > viewportHeight) logoY = viewportHeight - currentLogoHeight;
        }
        screensaverLogo.style.left = `${logoX}px`;
        screensaverLogo.style.top = `${logoY}px`;

        if (screensaverActive) {
            screensaverAnimationFrame = requestAnimationFrame(updateScreensaverImagePosition);
        }
    }
});

/**
 * Fetches the gamelist.json file and triggers functions to update the page.
 */
// Detect if browser is Chromium-based
function isChromiumBased() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('chrome') ||
           userAgent.includes('chromium') ||
           userAgent.includes('edg') ||
           userAgent.includes('brave');
}

// Check browser and show warning if needed
function checkBrowser() {
    if (!isChromiumBased()) {
        document.getElementById('browser-warning').style.display = 'block';
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
         console.error("Required HTML elements for featured game not found.");
         return;
    }

    // Check if game data is valid (especially game.id)
    if (!game || !game.id) {
        titleContainer.textContent = ' '; // Clear loading text
        displayError('#featured-game-content', 'Featured game data missing or invalid.');
        return;
    }

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
    // Use pageUrl from JSON (should point to /play.html?game=...)
    gameLink.href = game.pageUrl || '#';

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
        gridContainer.innerHTML = '<p>No previous games found.</p>';
        return;
    }

    // Clear placeholder/loading content
    gridContainer.innerHTML = '';

    // Create grid items for each game
    visibleGames.forEach(game => {
        // Skip if game data is invalid
        if(!game || !game.id) {
             console.warn("Skipping invalid game entry in previousGames:", game);
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
        const coverSrc = game.coverArt || '/assets/images/placeholder_thumb.png';
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
                { label: 'Developer', key: 'developer' },
                { label: 'Year', key: 'year' },
                { label: 'System', key: 'system' },
                { label: 'Genre', key: 'genre' },
                { label: 'Recommandé par', key: 'recommended' }
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
