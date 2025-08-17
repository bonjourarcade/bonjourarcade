# Newsletter and Plinko Setup

## 🎲 Plinko System

The plinko system automatically selects games using weekly seeds (YYYYWW format):
- `/plinko/?seed=202525` - Week 25 of 2025
- `/plinko/` - Auto-generates current week seed

### Testing Plinko:
```bash
python scripts/generate_plinko_link.py
```

## 📧 Newsletter Setup

### 1. ConvertKit Setup
1. Create account at [convertkit.com](https://convertkit.com)
2. Create a form and note the Form ID
3. Create a broadcast and note the Broadcast ID
4. Get API secret from Settings → Advanced → API Keys

### 2. Configuration
```bash
# Set environment variables:
export CONVERTKIT_API_SECRET="your_api_secret"
export CONVERTKIT_BROADCAST_ID="your_broadcast_id"
```

### 3. Dependencies
```bash
pip install -r requirements.txt
```

## 📧 Weekly Workflow

1. **Update predictions**: Use `/plinko/index.html?seed=YYYYWW` to test and update `predictions.yaml`
2. **Send newsletter**: `python scripts/send_newsletter.py`

### Test First
```bash
python scripts/send_newsletter.py --dry-run
```

## 🔧 How It Works

- **Game Selection**: Plinko automatically selects games using weekly seeds
- **Newsletter**: Reads current week's game from predictions.yaml
- **Content**: Includes game info, cover image, play link, and plinko seed

## 🔒 Security

- Use environment variables for API secrets
- Don't commit sensitive data to version control
- Test with dry-run before sending real emails 