#!/bin/bash

# Script to generate thumbnail versions of game cover images using ImageMagick.
# This script should be run from the project root.

GAMELIST_PATH="public/gamelist.json"
THUMB_WIDTH=150

# --- Check for ImageMagick (convert command) ---
if ! command -v convert &> /dev/null
then
    echo "Error: ImageMagick (convert command) not found."
    echo "Please install ImageMagick. On macOS: brew install imagemagick. On Alpine: apk add imagemagick."
    exit 1
fi

# --- Check for gamelist.json ---
if [ ! -f "$GAMELIST_PATH" ]; then
    echo "Error: gamelist.json not found at $GAMELIST_PATH"
    exit 1
fi

echo "Starting thumbnail generation..."

# Extract coverArt paths from gamelist.json
# Using jq for reliable JSON parsing. If jq is not available, a simpler grep/sed might be used,
# but jq is highly recommended for robustness in CI/CD.
# On Alpine: apk add jq
# On macOS: brew install jq
IMAGE_PATHS=$(jq -r '.gameOfTheWeek.coverArt, (.previousGames[]?.coverArt) | select(. != null)' "$GAMELIST_PATH" | sort -u)

if [ -z "$IMAGE_PATHS" ]; then
    echo "No cover images found in gamelist.json to process."
    exit 0
fi

PROCESSED_COUNT=0
FAILED_COUNT=0

while IFS= read -r relative_path; do
    # Remove leading slash if it's an absolute path from web root
    if [[ "$relative_path" == /* ]]; then
        relative_path="${relative_path:1}"
    fi
    
    full_image_path="$relative_path"
    
    # Prepend 'public/' if the path does not already start with it
    # This assumes coverArt paths in gamelist.json are relative to the *web root* (public/)
    if [[ ! "$full_image_path" == public/* ]]; then
        full_image_path="public/$full_image_path"
    fi

    if [ ! -f "$full_image_path" ]; then
        echo "Warning: Original image not found: $full_image_path. Skipping."
        FAILED_COUNT=$((FAILED_COUNT+1))
        continue
    fi

    # Construct thumbnail filename (e.g., cover.png -> cover_thumb.png)
    filename=$(basename "$full_image_path")
    dirname=$(dirname "$full_image_path")
    extension="${filename##*.}"
    base_name="${filename%.*}"
    
    thumbnail_path="${dirname}/${base_name}_thumb.${extension}"

    # Generate thumbnail using ImageMagick's convert command
    # -resize: Resizes the image to the given width, maintaining aspect ratio.
    #          > prevents upsizing if original is smaller.
    if convert "$full_image_path" -resize "${THUMB_WIDTH}x>" "$thumbnail_path"; then
        echo "Generated thumbnail: $thumbnail_path"
        PROCESSED_COUNT=$((PROCESSED_COUNT+1))
    else
        echo "Error processing $full_image_path with ImageMagick." >&2
        FAILED_COUNT=$((FAILED_COUNT+1))
    fi

done <<< "$IMAGE_PATHS"

echo "Thumbnail generation complete. Processed: ${PROCESSED_COUNT}, Failed: ${FAILED_COUNT}"

if [ "$FAILED_COUNT" -gt 0 ]; then
    exit 1 # Indicate failure if any images failed to process
else
    exit 0
fi 