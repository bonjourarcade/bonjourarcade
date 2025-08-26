# Bonjour Arcade Screensaver System

## Overview
The screensaver system automatically loads random games every 2.5 minutes, creating an endless arcade experience perfect for parties, waiting rooms, or discovering new games.

## How It Works

### 1. Screensaver Launcher (`/screensaver/`)
- **URL**: `/screensaver/index.html`
- **Purpose**: Main entry point for the screensaver system
- **Features**:
  - Beautiful gradient UI with launch button
  - Auto-launch timer (10 seconds with confirmation)
  - Mobile-optimized design
  - Information about how the system works

### 2. Random Game Selector (`/randomgame/`)
- **URL**: `/randomgame/index.html`
- **Purpose**: Fetches a random game from the gamelist and redirects to play
- **Features**:
  - Loads from `/gamelist.json`
  - Shows loading spinner and game info
  - Handles errors gracefully
  - Sets screensaver mode flags in session storage

### 3. Enhanced Play Page (`/play/`)
- **URL**: `/play/index.html` (modified)
- **Purpose**: Plays the selected game with screensaver mode features
- **Screensaver Features**:
  - Visual indicator showing screensaver mode is active
  - Countdown timer showing time until next game
  - Automatic refresh every 5 minutes
  - Escape mechanisms (double-tap, Escape key)

## User Experience

### Starting the Screensaver
1. Navigate to `/screensaver/` or click the 🔄 button in the footer
2. Click "Launch Screensaver" button
3. System automatically loads a random game
4. Game plays for 2.5 minutes, then automatically loads a new random game

### During Screensaver Mode
- **Visual Indicators**: 
  - 🔄 Screensaver Mode badge (top-left, clickable to return to launcher)
  - Countdown timer showing time until next game
  - ⏹️ Disable Screensaver button (red button below countdown)
  - ⏭️ Next Game button (green button, enabled after 60 seconds)
- **Auto-refresh**: Every 2.5 minutes, automatically loads a new random game
- **Continuous Play**: Endless arcade experience
- **Easy Return**: Click the 🔄 button to go back to screensaver launcher
- **Disable Mode**: Click the ⏹️ button to stop screensaver and continue current game
- **Manual Advance**: Click the ⏭️ button to go to next game (after 60-second cooldown)

### Exiting Screensaver Mode
- **Click/Tap the 🔄 button** (top-left) to return to screensaver launcher
- **Click/Tap the ⏹️ button** (red button) to disable screensaver and continue current game
- **Double-tap** anywhere on the screen (mobile)
- **Press Escape key** (desktop/mobile)
- **Manual navigation** to other pages

### Button Functions
- **🔄 Screensaver Mode**: Returns to `/screensaver/` launcher page
- **⏹️ Disable Screensaver**: Stops screensaver mode but keeps current game running
- **⏭️ Next Game**: Manually advance to next random game (enabled after 60 seconds)

### Next Game Button Cooldown
The Next Game button is **disabled for the first 60 seconds** of each game to:
- Prevent users from skipping games too quickly
- Ensure each game gets a fair chance to be played
- Maintain the intended screensaver rhythm
- Allow users to properly evaluate each game

## Technical Implementation

### Session Storage Keys
- `screensaverMode`: Boolean flag indicating screensaver mode is active
- `screensaverStartTime`: Timestamp when screensaver mode started
- `screensaverRefreshInterval`: Interval ID for auto-refresh
- `screensaverCountdownInterval`: Interval ID for countdown timer
- `lastRandomGame`: ID of the last randomly selected game

### Auto-refresh Logic
```javascript
// Refresh every 2.5 minutes
const refreshInterval = setInterval(() => {
    window.location.href = '/randomgame/';
}, 2.5 * 60 * 1000);
```

### Countdown Timer
```javascript
// Update countdown every second
const countdownInterval = setInterval(() => {
    const remaining = (2.5 * 60 * 1000) - elapsed;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    countdown.textContent = `Next game in ${minutes}:${seconds.toString().padStart(2, '0')}`;
}, 1000);
```

## Access Points

### Main Navigation
- **Footer Link**: 🔄 button on main page (`/`)
- **All Games Page**: 🔄 button in header (`/all/`)

### Direct URLs
- `/screensaver/` - Main launcher
- `/randomgame/` - Random game selector
- `/play/?game=<id>` - Game player (with screensaver mode)

## Mobile Optimization

### Touch Controls
- **Double-tap**: Exit screensaver mode
- **Single tap**: Normal game interaction
- **Responsive design**: Optimized for all screen sizes

### Performance
- **Efficient timers**: Uses `setInterval` for countdown and refresh
- **Memory management**: Cleans up intervals when exiting
- **Session storage**: Lightweight state management

## Error Handling

### Network Issues
- Graceful fallback if gamelist.json fails to load
- Retry button on error pages
- Console logging for debugging

### Game Loading Failures
- Automatic fallback to random game selection
- User-friendly error messages
- Continues screensaver cycle even if individual games fail

## Future Enhancements

### Potential Features
- **Custom intervals**: User-selectable refresh times
- **Game categories**: Filter random games by genre/system
- **Statistics**: Track games played in screensaver mode
- **Screensaver settings**: Customize appearance and behavior
- **Integration**: Connect with existing game recommendation system

### Technical Improvements
- **Service Worker**: Offline support and better caching
- **WebSocket**: Real-time updates and multiplayer features
- **Analytics**: Track user engagement and popular games
- **Accessibility**: Screen reader support and keyboard navigation

## Troubleshooting

### Common Issues
1. **Games not refreshing**: Check browser console for errors
2. **Countdown not working**: Verify JavaScript is enabled
3. **Mobile double-tap issues**: Ensure touch events are properly bound
4. **Performance problems**: Check for memory leaks in console

### Debug Mode
Enable console logging by setting:
```javascript
localStorage.setItem('screensaverDebug', 'true');
```

## Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS/macOS)
- **Mobile browsers**: Optimized for touch devices

## Security Considerations
- **Session storage**: Local to user's browser session
- **No external APIs**: All data comes from local gamelist.json
- **XSS protection**: Sanitized HTML output
- **CSP compliance**: Follows Content Security Policy guidelines
