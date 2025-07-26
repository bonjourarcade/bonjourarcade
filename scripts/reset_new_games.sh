#!/bin/bash
# Usage: ./reset_new_games.sh
# Removes 'new: true' from all games/*/metadata.yaml files.

set -e

find public/games -type f -name metadata.yaml | while read -r metafile; do
  if grep -q '^new: *true' "$metafile"; then
    echo "Resetting new flag in $metafile"
    # Remove the line containing 'new: true'
    sed -i '' '/^new: *true/d' "$metafile"
  fi
done 