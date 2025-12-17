/**
 * Loading overlay utility
 * Provides a reusable loading animation with Pacman SVG
 */

(function() {
    'use strict';

    // Pacman SVG markup
    const PACMAN_SVG = `
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="loading-pacman" viewBox="50 0 500 300">
            <style>
                .pacman3351-dot {
                    fill: #fffd37;
                }

                .pacman3351-open,
                .pacman3351-mouth-top,
                .pacman3351-mouth-bottom {
                    fill: #fffd37;
                }

                .pacman3351-mouth-top,
                .pacman3351-mouth-bottom {
                    animation-duration: 175ms;
                    animation-timing-function: linear;
                    animation-direction: alternate;
                    animation-iteration-count: infinite;
                    transform-origin: calc(300px/2) 150px;
                }

                .pacman3351-mouth-top {
                    animation-name: rotate3351-counterclockwise;
                }

                .pacman3351-mouth-bottom {
                    animation-name: rotate3351-clockwise;
                }

                @keyframes rotate3351-counterclockwise {
                    100% {
                        transform: rotate(-30deg);
                    }
                }

                @keyframes rotate3351-clockwise {
                    100% {
                        transform: rotate(30deg);
                    }
                }

                .pacman3351-dot {
                    animation-name: dot3351-motion;
                    animation-duration: 600ms;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                @keyframes dot3351-motion {
                    100% {
                        transform: translateX(-100px);
                    }
                }
            </style>
            <circle class="pacman3351-dot" cx="250" cy="50%" r="10"/>
            <circle class="pacman3351-dot" cx="350" cy="50%" r="10"/>
            <circle class="pacman3351-dot" cx="450" cy="50%" r="10"/>
            <circle class="pacman3351-dot" cx="550" cy="50%" r="10"/>
            <circle class="pacman3351-dot" cx="650" cy="50%" r="10"/>
            <path class="pacman3351-mouth-bottom" d="M 150,150 L 220.4,221.0 A 100 100 0 0 0 250,150 Z"/>
            <path class="pacman3351-mouth-top" d="M 150,150 L 220.4,79.0 A 100 100 0 0 1 250,150 Z"/>
            <path class="pacman3351-open" d="M 150,150 L 236.6,100 A 100 100 0 1 0 236.6,200 Z"/>
        </svg>
    `;

    /**
     * Creates the loading overlay if it doesn't exist or populates it if empty
     * @returns {HTMLElement} The loading overlay element
     */
    function createLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            document.body.insertBefore(overlay, document.body.firstChild);
        }
        // Populate overlay if it's empty
        if (!overlay.querySelector('.loading-content')) {
            // Use absolute path for logo to work from any directory
            const logoPath = '/assets/images/bonjourarcade-logo.png';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-logo-container">
                        <img src="${logoPath}" alt="BonjourArcade" class="loading-logo">
                    </div>
                    <div class="loading-animation-container">
                        ${PACMAN_SVG}
                    </div>
                    <div class="loading-text">
                        Un instant...
                    </div>
                </div>
            `;
        }
        return overlay;
    }

    /**
     * Hides the loading overlay and shows the main content
     * @param {Object} options - Configuration options
     * @param {string|HTMLElement} options.containerSelector - Selector or element for main container
     * @param {string|HTMLElement} options.footerSelector - Selector or element for footer (optional)
     * @param {number} options.delay - Delay before hiding (default: 300ms)
     */
    function hideLoading(options = {}) {
        const {
            containerSelector = '#main-container',
            footerSelector = '#main-footer',
            delay = 300
        } = options;

        const loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) return;

        // Get container element
        const container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector)
            : containerSelector;

        // Get footer element if specified
        const footer = footerSelector 
            ? (typeof footerSelector === 'string' 
                ? document.querySelector(footerSelector)
                : footerSelector)
            : null;

        // Hide overlay with fade out
        loadingOverlay.classList.add('hidden');

        // Show main content
        if (container) {
            container.style.display = '';
        }
        if (footer) {
            footer.style.display = '';
        }

        // Remove overlay from DOM after animation
        setTimeout(() => {
            if (loadingOverlay && loadingOverlay.parentNode) {
                loadingOverlay.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Initializes the loading overlay
     * @param {Object} options - Configuration options
     * @param {boolean} options.createOverlay - Whether to create overlay if it doesn't exist (default: true)
     * @param {string|HTMLElement} options.containerSelector - Selector or element for main container
     * @param {string|HTMLElement} options.footerSelector - Selector or element for footer (optional)
     * @param {number} options.delay - Delay before hiding (default: 300ms)
     * @param {boolean} options.hideOnLoad - Whether to automatically hide on page load (default: true)
     */
    function initLoading(options = {}) {
        const {
            createOverlay = true,
            containerSelector = '#main-container',
            footerSelector = '#main-footer',
            delay = 300,
            hideOnLoad = true
        } = options;

        // Create overlay if needed
        if (createOverlay) {
            createLoadingOverlay();
        }

        // Hide loading when page is fully loaded
        if (hideOnLoad) {
            const hideLoadingCallback = () => {
                setTimeout(() => {
                    hideLoading({ containerSelector, footerSelector, delay });
                }, delay);
            };

            if (document.readyState === 'complete') {
                // Already loaded
                setTimeout(hideLoadingCallback, 100);
            } else {
                // Wait for window load event (all resources loaded)
                window.addEventListener('load', hideLoadingCallback);
            }
        }
    }

    // Export functions to global scope
    window.initLoading = initLoading;
    window.hideLoading = hideLoading;
    window.createLoadingOverlay = createLoadingOverlay;

    // Auto-initialize if DOM is ready or wait for it
    function autoInit() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            // Create/populate overlay content
            createLoadingOverlay();
            // Initialize loading
            initLoading();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        // DOM already ready
        autoInit();
    }
})();


