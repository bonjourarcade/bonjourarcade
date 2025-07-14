# Newsletter and Plinko Setup Guide

This guide explains how to set up the newsletter system and enhanced plinko features for BonjourArcade.

## 🎲 Enhanced Plinko Features

### What's New:
- **Deterministic Seeding**: Same seed always produces same game order
- **2-second Countdown**: Auto-drop with skip option
- **Seed Display**: Shows current seed in top-left corner
- **Consistent Behavior**: Same results across all devices

### Testing the Plinko:
```bash
# Generate and open current week's plinko link
python scripts/generate_plinko_link.py

# Generate link for specific week
python scripts/generate_plinko_link.py --week 25 --year 2025

# Generate link without opening
python scripts/generate_plinko_link.py --no-open
```

### Plinko URL Examples:
- `/plinko/?seed=202525` - Week 25 of 2025
- `/plinko/?seed=202501` - Week 1 of 2025
- `/plinko/` - Auto-generates current week seed

## 📧 Newsletter System Setup

### 1. ConvertKit Account Setup

1. **Create ConvertKit Account**:
   - Go to [convertkit.com](https://convertkit.com)
   - Sign up for a free account

2. **Create a Form**:
   - Go to "Forms" in ConvertKit
   - Create a new form for newsletter subscriptions
   - Note the Form ID (you'll need this)

3. **Create a Broadcast**:
   - Go to "Broadcasts" in ConvertKit
   - Create a new broadcast
   - Note the Broadcast ID (you'll need this)

4. **Get API Key**:
   - Go to Settings → Advanced → API Keys
   - Create a new API key
   - Note the API Key (you'll need this)

### 2. Update Configuration

#### Frontend (main.js):
```javascript
// In public/assets/js/main.js, update these values:
const CONVERTKIT_API_KEY = 'your_actual_api_key';
const CONVERTKIT_FORM_ID = 'your_actual_form_id';
```

#### Backend Scripts:
```bash
# Set environment variables
export CONVERTKIT_API_KEY="your_api_key"
export CONVERTKIT_BROADCAST_ID="your_broadcast_id"
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

## 📧 Weekly Newsletter Workflow

### Step 1: Generate Plinko Link
```bash
python scripts/generate_plinko_link.py
```
This will:
- Generate the current week's seed (e.g., 202525)
- Open the plinko page in your browser
- Show you which game is selected

### Step 2: Update Game of the Week
After seeing which game is selected in plinko:
```bash
# Edit the game-of-the-week file
echo "selected_game_id" > game-of-the-week
```

### Step 3: Send Newsletter
```bash
# Test run (shows what would be sent)
python scripts/send_newsletter.py --dry-run

# Send actual newsletter
python scripts/send_newsletter.py
```

## 📧 Newsletter Email Content

The newsletter includes:
- **Game Info**: Title, year, developer, genre
- **Cover Image**: Direct link to game cover
- **Play Link**: Direct link to play the game
- **Leaderboard Link**: Link to alloarcade leaderboard
- **Plinko Link**: Link with fixed seed showing how game was chosen

## 🔧 Scripts Overview

### `scripts/generate_plinko_link.py`
- Generates plinko URL with current week's seed
- Opens URL automatically
- Can specify custom week/year

### `scripts/send_newsletter.py`
- Reads `game-of-the-week` file
- Generates email content with game details
- Sends via ConvertKit broadcast API
- Includes plinko seed in email

## 🎮 Plinko Features

### Seeding System:
- **Format**: `YYYYWW` (year + week number)
- **Example**: `202525` = Year 2025, Week 25
- **Deterministic**: Same seed = same game order every time

### Countdown System:
- **Duration**: 2 seconds
- **Skip**: Click anywhere to skip
- **Auto-drop**: Ball drops from center after countdown

### Visual Features:
- **Seed Display**: Shows seed number in top-left corner
- **Consistent Layout**: Same behavior on all devices
- **Deterministic Physics**: Same results across platforms

## 🚀 Testing

### Test Plinko:
1. Run `python scripts/generate_plinko_link.py`
2. Watch the countdown and ball drop
3. Note the selected game
4. Try the same seed again - should get same result

### Test Newsletter:
1. Update `game-of-the-week` with a test game
2. Run `python scripts/send_newsletter.py --dry-run`
3. Check the generated email content
4. Send actual email when ready

## 🔒 Security Notes

- Keep your ConvertKit API key secure
- Don't commit API keys to version control
- Use environment variables for sensitive data
- Test with dry-run before sending real emails

## 📝 Troubleshooting

### Plinko Issues:
- **Different results**: Check that seed is correct in URL
- **Countdown not working**: Check browser console for errors
- **Ball not dropping**: Click anywhere to skip countdown

### Newsletter Issues:
- **API errors**: Check ConvertKit credentials
- **Missing game data**: Ensure `game-of-the-week` file exists
- **Email not sending**: Check network connection and API limits

## 🎯 Next Steps

1. **Set up ConvertKit account** and get credentials
2. **Update the configuration** with your actual API keys
3. **Test the plinko** with current week's seed
4. **Test the newsletter** with dry-run mode
5. **Send your first newsletter** when ready!

The system is now ready for production use! 🎉 