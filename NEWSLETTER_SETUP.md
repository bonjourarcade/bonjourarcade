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

## 🤖 Automated Newsletter (GitLab CI)

The newsletter can be automatically sent every Monday morning using GitLab CI/CD schedules.

### Setting up GitLab CI Schedule

1. **Go to your GitLab project**
   - Navigate to **CI/CD** → **Schedules** in the left sidebar

2. **Create a new schedule**
   - Click **New schedule**
   - Set **Description**: "Weekly Newsletter - Monday Morning"
   - Set **Interval Pattern**: `0 8 * * 1` (8 AM every Monday)
   - Set **Target Branch**: `main` (or your default branch)
   - Set **Variables**:
     - Key: `CONVERTKIT_API_SECRET`
     - Value: Your ConvertKit API secret
     - Check "Protected" if you want to restrict to protected branches

3. **Save the schedule**
   - The schedule will appear in your CI/CD → Schedules list
   - You can manually trigger it anytime by clicking "Play" button

### Schedule Format Explanation

The cron expression `0 8 * * 1` means:
- `0` - At minute 0 (top of the hour)
- `8` - At 8 AM
- `*` - Every day of the month
- `*` - Every month
- `1` - On Monday (1 = Monday, 0 = Sunday)

### Manual Testing

You can test the automated newsletter manually:
```bash
# Test email sending only
python3 scripts/send_newsletter.py --mail-only --dry-run

# Test webhook sending only  
python3 scripts/send_newsletter.py --webhook-only --dry-run

# Test both (interactive mode)
python3 scripts/send_newsletter.py --dry-run
```

## 🔒 Security

- Use environment variables for API secrets
- Don't commit sensitive data to version control
- Test with dry-run before sending real emails
- GitLab CI variables are encrypted and secure 