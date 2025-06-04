// Global variables (declared here so functions can access them)
let idleTime = 0;
const SCREENSAVER_TIMEOUT_MINUTES = 10;
let screensaverActive = false;
let isActivatingScreensaver = false;

// DOM elements (will be assigned inside DOMContentLoaded)
let screensaverOverlay;
let screensaverImage;
let screensaverLogo;
let screensaverTimer;

// Animation variables
let screensaverAnimationFrame;
let imageX = 0;
let imageY = 0;
let imageDx = 1;
let imageDy = 1;

let logoX = 0;
let logoY = 0;
let logoDx = 1.2;
let logoDy = 1.2;
const logoSize = 150; // Matches CSS width for the logo

// New: Separate animation frame for gamepad polling
let gamepadAnimationFrame;

// Core screensaver logic functions
function timerIncrement() {
    idleTime++;
    const timeLeft = SCREENSAVER_TIMEOUT_MINUTES * 60 - idleTime;
    if (timeLeft > 0 && !screensaverActive) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        screensaverTimer.textContent = `Screensaver in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        // Only show timer on non-play pages, and only when not active
        if (!window.location.pathname.includes('/play/')) {
            screensaverTimer.style.display = 'block';
        } else {
            screensaverTimer.style.display = 'none';
        }
    } else {
        screensaverTimer.style.display = 'none'; // Always hide when screensaver is active or timeout reached
    }

    if (idleTime >= SCREENSAVER_TIMEOUT_MINUTES * 60 && !screensaverActive) {
        startScreensaver();
    }
}

function resetIdleTime() {
    console.log('resetIdleTime called. Current screensaverActive:', screensaverActive);
    if (isActivatingScreensaver) {
        console.log('Ignoring resetIdleTime during activation.');
        return; // Ignore activity during the screensaver activation phase
    }
    idleTime = 0;

    // If screensaver is active, stop it (which also hides the overlay and clears timer)
    if (screensaverActive) {
        console.log('screensaverActive is true. Calling stopScreensaver().');
        stopScreensaver();
    }

    // After reset, if on index.html and screensaver is not active, ensure timer is visible for countdown
    if (!screensaverActive && !window.location.pathname.includes('/play/')) {
        console.log('On index.html, screensaver not active. Showing timer.');
        screensaverTimer.style.display = 'block';
    }
    // If on play page, or screensaver is active, ensure timer is hidden
    else if (window.location.pathname.includes('/play/') || screensaverActive) {
        console.log('On play page or screensaver active. Hiding timer.');
        screensaverTimer.style.display = 'none';
    }
    console.log('resetIdleTime finished. New screensaverActive:', screensaverActive);
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
        screensaverTimer.style.display = 'none'; // Explicitly hide timer when screensaver starts

        // Conditionally apply dark background based on current page
        if (window.location.pathname.includes('/play/')) {
            screensaverOverlay.classList.add('screensaver-dark-background');
        }

        // Add scroll listener AFTER a brief delay to allow browser to handle overflow:hidden scroll
        setTimeout(() => {
            document.addEventListener('scroll', stopScreensaver, { once: true });
            isActivatingScreensaver = false; // Reset flag after delay
        }, 300); // Increased delay to 300ms for more robustness

        // Set main image source - try to get from EJS_backgroundImage, else fallback
        let coverSrc = '/assets/images/placeholder_thumb.png';
        const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');

        if (isIndexPage && window.featuredGameCoverArt) {
            coverSrc = window.featuredGameCoverArt;
        } else if (window.EJS_backgroundImage) {
            coverSrc = window.EJS_backgroundImage;
        } else {
            const featuredGameImgElement = document.getElementById('featured-game-img');
            if (featuredGameImgElement && featuredGameImgElement.src) {
                coverSrc = featuredGameImgElement.src;
            }
        }
        screensaverImage.src = coverSrc;

        // Set logo source
        screensaverLogo.src = '/assets/images/bonjourarcade-logo.png';

        const initScreensaverAnimation = () => {
            // Initialize main image position
            const currentImageWidth = screensaverImage.offsetWidth;
            const currentImageHeight = screensaverImage.offsetHeight;
            imageX = Math.random() * (document.documentElement.clientWidth - currentImageWidth);
            imageY = Math.random() * (document.documentElement.clientHeight - currentImageHeight);

            // Initialize logo position
            const currentLogoWidth = screensaverLogo.offsetWidth;
            const currentLogoHeight = screensaverLogo.offsetHeight;
            logoX = Math.random() * (document.documentElement.clientWidth - currentLogoWidth);
            logoY = Math.random() * (document.documentElement.clientHeight - currentLogoHeight);

            screensaverAnimationFrame = requestAnimationFrame(updateScreensaverImagePosition);
        };

        // Wait for both images to load before starting animation
        let imagesLoaded = 0;
        const imageLoadHandler = (event) => {
            imagesLoaded++;
            if (imagesLoaded === 2) { // Assuming 2 images: screensaverImage and screensaverLogo
                initScreensaverAnimation();
            }
        };

        if (screensaverImage.complete) {
            imageLoadHandler({ target: { id: 'screensaver-image', src: screensaverImage.src } });
        } else {
            screensaverImage.onload = imageLoadHandler;
        }
        if (screensaverLogo.complete) {
            imageLoadHandler({ target: { id: 'screensaver-logo', src: screensaverLogo.src } });
        } else {
            screensaverLogo.onload = imageLoadHandler;
        }
    }
}

function stopScreensaver() {
    console.log('stopScreensaver called. Initial screensaverActive:', screensaverActive);
    if (screensaverActive) {
        screensaverActive = false;
        console.log('screensaverActive set to false. Attempting to remove classes and hide overlay.');
        document.body.classList.remove('screensaver-active');
        document.documentElement.classList.remove('screensaver-active');
        screensaverOverlay.style.display = 'none';
        screensaverImage.src = '';
        screensaverLogo.src = ''; // Clear logo source
        cancelAnimationFrame(screensaverAnimationFrame);
        screensaverImage.onload = null;
        screensaverLogo.onload = null; // Remove logo onload handler
        screensaverOverlay.classList.remove('screensaver-dark-background'); // Remove dark background
        console.log('Screensaver stopped. Final screensaverActive:', screensaverActive);
        console.log('Body classes:', document.body.classList.value);
        console.log('HTML classes:', document.documentElement.classList.value);
        console.log('Overlay display style:', screensaverOverlay.style.display);
    }
    console.log('stopScreensaver finished. Final screensaverActive (after if-block):', screensaverActive);
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

// Gamepad detection for screensaver dismissal
function checkGamepads() {
    console.log('Checking gamepads...');
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
        if (gamepad) {
            // Check if any button is pressed
            for (const button of gamepad.buttons) {
                if (button.pressed) {
                    console.log('Gamepad button pressed!', button);
                    resetIdleTime();
                    // IMPORTANT: Do NOT return here. Allow the loop to continue to schedule the next frame.
                }
            }
        }
    }
    // Always request next frame for continuous checking, regardless of button press
    gamepadAnimationFrame = requestAnimationFrame(checkGamepads);
}

// All event listeners and interval initiation should be wrapped in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements once the document is ready
    screensaverOverlay = document.getElementById('screensaver-overlay');
    screensaverImage = document.getElementById('screensaver-image');
    screensaverLogo = document.getElementById('screensaver-logo');
    screensaverTimer = document.getElementById('screensaver-timer');

    // Basic check to ensure elements exist
    if (!screensaverOverlay || !screensaverImage || !screensaverLogo || !screensaverTimer) {
        console.error('Screensaver elements not found. Screensaver will not function.');
        return; // Exit if essential elements are missing
    }

    // Initialize interval and event listeners
    const idleInterval = setInterval(timerIncrement, 1000); // 1 second

    document.addEventListener('mousemove', resetIdleTime);
    document.addEventListener('touchstart', resetIdleTime); // For touch devices

    // Key 'é' for immediate screensaver activation, and general key presses for deactivation
    document.addEventListener('keydown', (event) => {
        console.log('Key pressed:', event.key, 'Screensaver Active:', screensaverActive);
        if (event.key === 'é') {
            if (!screensaverActive) {
                console.log('Attempting to start screensaver with \'é\'');
                event.preventDefault(); // Prevent default browser action (like scrolling)
                startScreensaver();
                return; // IMPORTANT: Exit here, don't reset idle time for 'é' activation
            }
        }
        // For any other key, or for 'é' when screensaver is already active, reset idle time.
        console.log('Resetting idle time.');
        resetIdleTime();
    });

    // Gamepad connection events
    window.addEventListener("gamepadconnected", (e) => {
      console.log(
        "Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index,
        e.gamepad.id,
        e.gamepad.buttons.length,
        e.gamepad.axes.length,
      );
      // Only start checking gamepads if not already running
      if (!gamepadAnimationFrame) {
          gamepadAnimationFrame = requestAnimationFrame(checkGamepads); // Start checking once a gamepad is connected
      }
    });
    window.addEventListener("gamepaddisconnected", (e) => {
      console.log(
        "Gamepad disconnected from index %d: %s",
        e.gamepad.index,
        e.gamepad.id,
      );
      // Stop gamepad polling when disconnected
      if (gamepadAnimationFrame) {
          cancelAnimationFrame(gamepadAnimationFrame);
          gamepadAnimationFrame = null;
      }
    });

    // Initial check for already connected gamepads when the DOM is ready
    // This handles cases where gamepads are connected before the 'gamepadconnected' event fires.
    const initialGamepads = navigator.getGamepads();
    if (initialGamepads && initialGamepads.some(gp => gp !== null)) {
        if (!gamepadAnimationFrame) {
            gamepadAnimationFrame = requestAnimationFrame(checkGamepads);
            console.log('Started initial gamepad polling on DOMContentLoaded.');
        }
    }
}); 