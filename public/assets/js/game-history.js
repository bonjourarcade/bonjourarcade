// Game History Management Utility
// This file provides functions to track and manage game history across all pages

// Helper to determine the start date of the current featured game period
// Matches the schedule: 1st and 15th of each month
function getCurrentPeriodStart() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    // If today is 1st-14th, start is the 1st of this month
    // If today is 15th-end, start is the 15th of this month
    const startDay = day >= 15 ? 15 : 1;

    return new Date(year, month, startDay).getTime();
}

// Game history management functions
function loadGameHistory() {
    try {
        const historyData = localStorage.getItem('gameHistory');
        if (historyData) {
            let history = JSON.parse(historyData);

            // Filter out games played before the current featured game period
            const periodStart = getCurrentPeriodStart();
            const filteredHistory = history.filter(entry => {
                // Ensure entry has a timestamp and it's within current period
                return entry.timestamp && entry.timestamp >= periodStart;
            });

            // If we filtered out items, update localStorage
            if (filteredHistory.length < history.length) {
                saveGameHistory(filteredHistory);
            }

            return filteredHistory;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error loading game history:', error);
        return [];
    }
}

function saveGameHistory(gameHistory) {
    try {
        localStorage.setItem('gameHistory', JSON.stringify(gameHistory));
    } catch (error) {
        console.error('Error saving game history:', error);
    }
}

function clearGameHistory() {
    try {
        localStorage.removeItem('gameHistory');
    } catch (error) {
        console.error('Error clearing game history:', error);
    }
}

function addGameToHistory(gameId) {
    if (!gameId) return;

    let gameHistory = loadGameHistory();

    // Remove if already exists to avoid duplicates
    gameHistory = gameHistory.filter(entry => entry.gameId !== gameId);

    // Add to beginning of array (most recent first)
    gameHistory.unshift({
        gameId: gameId,
        timestamp: Date.now(),
        date: new Date().toISOString()
    });

    // Keep only last 50 games to avoid storage bloat
    if (gameHistory.length > 50) {
        gameHistory = gameHistory.slice(0, 50);
    }

    saveGameHistory(gameHistory);
}

function getHistoryGameIds() {
    const gameHistory = loadGameHistory();
    return gameHistory.map(entry => entry.gameId);
}

// Extract game ID from URL (handles /play?game=ID and short /b/ID URLs)
function extractGameIdFromUrl(url) {
    try {
        const urlObj = new URL(url, window.location.origin);
        const gameParam = urlObj.searchParams.get('game');
        if (gameParam) return gameParam;

        const shortMatch = urlObj.pathname.match(/^\/b\/([^/]+)\/?$/);
        return shortMatch ? decodeURIComponent(shortMatch[1]) : null;
    } catch (error) {
        console.error('Error extracting game ID from URL:', error);
        return null;
    }
}

// Auto-track game when page loads (for direct links to /play)
function trackGameOnPageLoad() {
    // Only track if we're on the play page
    if (window.location.pathname === '/play' || window.location.pathname === '/play/' || window.location.pathname.startsWith('/b/')) {
        const gameId = extractGameIdFromUrl(window.location.href);
        if (gameId) {
            addGameToHistory(gameId);
        }
    }
}

// Initialize tracking when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    trackGameOnPageLoad();
});
