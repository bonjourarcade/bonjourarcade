#!/bin/bash
# Usage: ./mark_new_games.sh gameid1 gameid2 ...
# Adds 'new: true' to each games/<gameid>/metadata.yaml if not already present.

set -e

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 gameid1 gameid2 ..."
  exit 1
fi

for gameid in "$@"; do
  metafile="public/games/$gameid/metadata.yaml"
  if [ ! -f "$metafile" ]; then
    echo "Metadata file not found for $gameid ($metafile)"
    continue
  fi
  if grep -q '^new: *true' "$metafile"; then
    echo "$gameid: already marked as new."
  else
    echo "Marking $gameid as new."
    # If 'new:' exists but is false, replace it; otherwise, append.
    if grep -q '^new:' "$metafile"; then
      sed -i '' 's/^new:.*/new: true/' "$metafile"
    else
      echo 'new: true' >> "$metafile"
    fi
  fi
done 