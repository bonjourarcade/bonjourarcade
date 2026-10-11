#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_FIREBASE=0

if [[ "${1:-}" == "--with-firebase" ]]; then
	START_FIREBASE=1
	shift
fi

FIREBASE_FUNCTIONS_DIR="${FIREBASE_FUNCTIONS_DIR:-$ROOT_DIR/../alloarcade/firebase/functions}"
FIREBASE_PID=""

cleanup() {
	if [[ -n "$FIREBASE_PID" ]]; then
		kill "$FIREBASE_PID" >/dev/null 2>&1 || true
	fi
}

trap cleanup EXIT INT TERM

if [[ "$START_FIREBASE" -eq 1 ]]; then
	if [[ ! -d "$FIREBASE_FUNCTIONS_DIR" ]]; then
		echo "Firebase functions dir not found: $FIREBASE_FUNCTIONS_DIR"
		echo "Set FIREBASE_FUNCTIONS_DIR or run without --with-firebase."
		exit 1
	fi

	echo "Starting Firebase emulators from: $FIREBASE_FUNCTIONS_DIR"
	(
		cd "$FIREBASE_FUNCTIONS_DIR"
		# firebase-tools bundles deps (jsonwebtoken -> jwa -> buffer-equal-constant-time)
		# that crash on very new Node versions (SlowBuffer was removed) - the project's
		# .nvmrc/engines pin Node 20, but `cd` inside this subshell doesn't trigger a
		# shell's own nvm auto-use hook, so it's applied explicitly here instead.
		if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
			# shellcheck disable=SC1091
			source "$HOME/.nvm/nvm.sh"
			nvm use >/dev/null
		fi
		npm run dev:all
	) &
	FIREBASE_PID=$!
fi

python3 "$ROOT_DIR/scripts/local_server.py" "$@"
