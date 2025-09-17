// Game History Management Utility
// This file provides functions to track and manage game history across all pages

// Game history management functions
function loadGameHistory() {
    try {
        const historyData = sessionStorage.getItem('gameHistory');
        if (historyData) {
            return JSON.parse(historyData);
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
        sessionStorage.setItem('gameHistory', JSON.stringify(gameHistory));
    } catch (error) {
        console.error('Error saving game history:', error);
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

// Extract game ID from URL (handles both /play?game=ID and /play?game=ID&other=params)
function extractGameIdFromUrl(url) {
    try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.searchParams.get('game');
    } catch (error) {
        console.error('Error extracting game ID from URL:', error);
        return null;
    }
}

// Auto-track game when page loads (for direct links to /play)
function trackGameOnPageLoad() {
    // Only track if we're on the play page
    if (window.location.pathname === '/play' || window.location.pathname === '/play/') {
        const gameId = extractGameIdFromUrl(window.location.href);
        if (gameId) {
            addGameToHistory(gameId);
        }
    }
}

// Initialize tracking when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    trackGameOnPageLoad();
});
