#!/bin/bash
# Test script for automated newsletter functionality
# This simulates what the GitLab CI job will do

set -e

echo "🧪 Testing Automated Newsletter Functionality"
echo "=============================================="

# Check if required environment variable is set
if [ -z "$CONVERTKIT_API_SECRET" ]; then
    echo "❌ Error: CONVERTKIT_API_SECRET environment variable is not set"
    echo "   Please set it with: export CONVERTKIT_API_SECRET='your_secret_here'"
    exit 1
fi

echo "✅ CONVERTKIT_API_SECRET is set"

# Test email sending (dry run)
echo ""
echo "📧 Testing email sending (dry run)..."
python3 scripts/send_newsletter.py --mail-only --dry-run
if [ $? -eq 0 ]; then
    echo "✅ Email test completed successfully"
else
    echo "❌ Email test failed"
    exit 1
fi

# Test webhook sending (dry run) - test one webhook to avoid interactive mode
echo ""
echo "🔗 Testing webhook sending (dry run)..."
# Get the first webhook label from webhook_map.json to test non-interactively
if [ -f "webhook_map.json" ]; then
    FIRST_WEBHOOK=$(python3 -c "import json; data=json.load(open('webhook_map.json')); print(list(data.keys())[0] if data else 'test_hook')")
    echo "Testing webhook: $FIRST_WEBHOOK"
    python3 scripts/send_newsletter.py --webhook-only --dry-run --webhook-label "$FIRST_WEBHOOK"
else
    echo "⚠️  webhook_map.json not found, skipping webhook test"
    FIRST_WEBHOOK="test_hook"
fi

if [ $? -eq 0 ]; then
    echo "✅ Webhook test completed successfully"
else
    echo "❌ Webhook test failed"
    exit 1
fi

# Test Instagram posting (dry run)
echo ""
echo "📸 Testing Instagram posting (dry run)..."
if [ -n "$FACEBOOK_PAGE_ID" ] && { [ -n "$FACEBOOK_PAGE_ACCESS_TOKEN" ] || [ -n "$FACEBOOK_USER_ACCESS_TOKEN" ]; }; then
    python3 scripts/send_newsletter.py --instagram-only --dry-run
    if [ $? -eq 0 ]; then
        echo "✅ Instagram test completed successfully"
    else
        echo "❌ Instagram test failed"
        exit 1
    fi
else
    echo "⚠️  Skipping Instagram test: set FACEBOOK_PAGE_ID and a Facebook token to exercise the Meta flow"
fi

echo ""
echo "🎉 All tests passed! The automated newsletter is ready to run."
echo ""
echo "📋 Next steps:"
echo "   1. Set up GitLab CI schedule (see NEWSLETTER_SETUP.md)"
echo "   2. Configure the schedule to run at 8 AM every Monday"
echo "   3. Add CONVERTKIT_API_SECRET as a GitLab CI variable"
echo ""
echo "🔧 To test with real sending (remove --dry-run flags):"
echo "   python3 scripts/send_newsletter.py --mail-only"
echo "   python3 scripts/send_newsletter.py --webhook-only"
echo "   python3 scripts/send_newsletter.py --instagram-only"
