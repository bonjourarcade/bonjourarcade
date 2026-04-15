#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

required_vars=(
  FACEBOOK_APP_ID
  FACEBOOK_APP_SECRET
  FACEBOOK_USER_ACCESS_TOKEN
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    printf 'Missing required environment variable: %s\n' "$var_name" >&2
    printf 'Set it in your shell or in %s\n' "$ENV_FILE" >&2
    exit 1
  fi
done

response="$({
  curl --silent --show-error --fail \
    "https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${FACEBOOK_USER_ACCESS_TOKEN}"
} )"

if command -v jq >/dev/null 2>&1; then
  long_lived_token="$(printf '%s' "$response" | jq -r '.access_token // empty')"
  expires_in="$(printf '%s' "$response" | jq -r '.expires_in // empty')"
else
  long_lived_token="$(printf '%s' "$response" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
  expires_in="$(printf '%s' "$response" | sed -n 's/.*"expires_in":\([0-9][0-9]*\).*/\1/p')"
fi

if [ -z "$long_lived_token" ]; then
  printf 'Meta did not return an access_token. Raw response follows:\n%s\n' "$response" >&2
  exit 1
fi

printf 'Long-lived Facebook user access token generated successfully.\n'
if [ -n "$expires_in" ]; then
  printf 'expires_in: %s seconds\n' "$expires_in"
fi
printf '\n'
printf 'Update your local .env or CI/CD variable with:\n'
printf 'export FACEBOOK_USER_ACCESS_TOKEN=%q\n' "$long_lived_token"
printf '\n'
printf 'JSON response:\n%s\n' "$response"
