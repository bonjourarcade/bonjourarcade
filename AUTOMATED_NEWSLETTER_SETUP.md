# 🤖 Automated Newsletter Setup Guide

This guide explains how to set up the automated newsletter system that runs every Monday morning using GitLab CI/CD.

## 📋 Overview

The automated newsletter system:
- **Runs automatically** every Monday at 8 AM
- **Sends emails** to ConvertKit subscribers
- **Sends webhooks** to all configured Discord/Google Chat channels
- **Posts to Facebook** using a Page token derived at runtime from your Facebook user token
- **Validates metadata** to ensure quality (requires `controls` and `to_start` fields)
- **Fails safely** if metadata is incomplete

## 🚀 Quick Setup

### 1. GitLab CI Configuration

The `.gitlab-ci.yml` file has been updated with a new `send_newsletter` job that:
- Runs in the `newsletter` stage
- Uses Python 3.9 Alpine image
- Installs required dependencies
- Sends email first, then webhooks
- Runs only on scheduled pipelines

### 2. GitLab CI Schedule Setup

1. **Navigate to your GitLab project**
   - Go to **CI/CD** → **Schedules** in the left sidebar

2. **Create a new schedule**
   - Click **New schedule**
   - **Description**: `Weekly Newsletter - Monday Morning`
   - **Interval Pattern**: `0 8 * * 1` (8 AM every Monday)
   - **Target Branch**: `main` (or your default branch)
   - **Variables**:
      - Key: `CONVERTKIT_API_SECRET`
      - Value: Your ConvertKit API secret
      - Key: `FACEBOOK_APP_ID`
      - Value: Your Facebook App ID
      - Key: `FACEBOOK_APP_SECRET`
      - Value: Your Facebook App Secret
      - Key: `FACEBOOK_USER_ACCESS_TOKEN`
      - Value: A valid Facebook user access token with access to the Page
      - Key: `FACEBOOK_PAGE_ID`
      - Value: Your Facebook Page ID
      - Optional Key: `FACEBOOK_PAGE_ACCESS_TOKEN`
      - Optional Value: A pre-generated Facebook Page access token used as a direct fallback
      - Check "Protected" if you want to restrict to protected branches

3. **Save the schedule**
   - The schedule will appear in your CI/CD → Schedules list
   - You can manually trigger it anytime by clicking "Play" button

### 3. Cron Expression Explanation

`0 8 * * 1` means:
- `0` - At minute 0 (top of the hour)
- `8` - At 8 AM
- `*` - Every day of the month
- `*` - Every month
- `1` - On Monday (1 = Monday, 0 = Sunday)

## 🧪 Testing

### Local Testing

Use the provided test script to verify everything works:

```bash
# Make sure CONVERTKIT_API_SECRET is set
export CONVERTKIT_API_SECRET="your_secret_here"

# For Facebook posting tests, also set:
export FACEBOOK_APP_ID="your_app_id"
export FACEBOOK_APP_SECRET="your_app_secret"
export FACEBOOK_USER_ACCESS_TOKEN="your_user_token"
export FACEBOOK_PAGE_ID="your_page_id"

# Run the test script
./scripts/test_automated_newsletter.sh
```

### Manual Testing

Test individual components:

```bash
# Test email sending (dry run)
python3 scripts/send_newsletter.py --mail-only --dry-run

# Test webhook sending (dry run)
python3 scripts/send_newsletter.py --webhook-only --dry-run --webhook-label "test_hook"

# Test Facebook posting (dry run)
python3 scripts/send_newsletter.py --facebook-only --dry-run

# Test both (interactive mode)
python3 scripts/send_newsletter.py --dry-run
```

## 🔧 How It Works

### 1. Automated Execution
- GitLab CI runs the `send_newsletter` job every Monday at 8 AM
- The job runs in a Python 3.9 Alpine container
- Dependencies are installed automatically

### 2. Newsletter Process
1. **Reads current week's game** from `upcoming.yaml`
2. **Validates metadata** (requires `controls` and `to_start` fields)
3. **Sends email** to ConvertKit subscribers
4. **Sends webhooks** to all configured channels
5. **Derives a Facebook Page token** from the Facebook user token when needed
6. **Posts to Facebook**
7. **Logs completion** with timestamps

### 3. Safety Features
- **Metadata validation** prevents incomplete newsletters
- **Dry-run testing** available for safe testing
- **Error handling** with clear failure messages
- **Manual override** available for urgent sends

## 📁 File Structure

```
├── .gitlab-ci.yml                    # CI/CD configuration with newsletter job
├── scripts/
│   ├── send_newsletter.py           # Main newsletter script
│   └── test_automated_newsletter.sh # Local testing script
├── public/upcoming/
│   └── upcoming.yaml                # Game of the week predictions
├── public/games/
│   └── {game_id}/
│       └── metadata.yaml            # Game metadata (must have controls & to_start)
└── webhook_map.json                 # Webhook configuration
```

## 🚨 Troubleshooting

### Common Issues

1. **Missing CONVERTKIT_API_SECRET**
   - Error: "API secret is required"
   - Solution: Set the environment variable in GitLab CI variables

2. **Missing metadata fields**
   - Error: "Game of the week metadata is missing required fields"
   - Solution: Add `controls` and `to_start` to the game's metadata.yaml

3. **Schedule not running**
   - Check GitLab CI → Schedules
   - Verify the cron expression is correct
   - Ensure the target branch exists

4. **Webhook failures**
   - Check webhook_map.json configuration
   - Verify environment variables are set
   - Test individual webhooks manually

5. **Facebook token expired**
   - Error code: `190` with subcode `463`
   - Solution: refresh or replace `FACEBOOK_USER_ACCESS_TOKEN`

6. **Facebook page token cannot be derived**
   - Verify `FACEBOOK_PAGE_ID` and `FACEBOOK_USER_ACCESS_TOKEN`
   - If you want the script to exchange the user token automatically, also set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
   - Confirm the user token has access to the Page and the required Facebook permissions

### Debug Commands

```bash
# Check current game of the week (returns game_id)
python3 scripts/get_current_week_game.py

# Validate metadata for a specific game
python3 -c "
import yaml
with open('public/games/hero/metadata.yaml') as f:
    meta = yaml.safe_load(f)
    print('Controls:', meta.get('controls'))
    print('To Start:', meta.get('to_start'))
"

# Test webhook configuration
python3 -c "
import json
with open('webhook_map.json') as f:
    webhooks = json.load(f)
    for label, config in webhooks.items():
        print(f'{label}: {config}')
"
```

## 🔒 Security Considerations

- **API secrets** are stored as GitLab CI variables (encrypted)
- **Protected variables** can restrict access to protected branches
- **No sensitive data** is committed to version control
- **Dry-run mode** available for safe testing

## 📞 Support

If you encounter issues:

1. **Check the logs** in GitLab CI → Jobs
2. **Run local tests** using the test script
3. **Verify metadata** for the current game of the week
4. **Check webhook configuration** in webhook_map.json

## 🎯 Next Steps

1. ✅ Set up GitLab CI schedule
2. ✅ Configure CONVERTKIT_API_SECRET variable
3. ✅ Test locally with `./scripts/test_automated_newsletter.sh`
4. ✅ Verify metadata for upcoming games of the week
5. 🚀 Let it run automatically every Monday!

---

**Note**: The system will automatically fail if any game's metadata is incomplete, ensuring newsletter quality and preventing broken sends.
