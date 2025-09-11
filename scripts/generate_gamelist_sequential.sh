#!/bin/bash
set -e

# --- Color codes for output ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Configuration ---
GAMES_DIR="public/games"
ROMS_DIR="roms"
OUTPUT_FILE="public/gamelist.json"
DEFAULT_COVER="assets/images/placeholder_thumb.png"
LAUNCHER_PAGE="/play"

# Check if we're in local testing mode
if [ "$LOCAL_TESTING" = "true" ]; then
    echo "🔧 Local testing mode enabled - using local ROM paths"
    USE_LOCAL_PATHS=true
else
    echo "🌐 Production mode - using GitLab URLs"
    USE_LOCAL_PATHS=false
fi

echo -e "${BLUE}🚀 Starting sequential gamelist generation...${NC}"

# --- Core Mapping (Directory name -> EJS_core name) ---
get_core_from_dir() {
    case "$1" in
        arcade|fbneo) echo "arcade" ;;
        mame|mame2003) echo "mame2003_plus" ;;
        ATARI2600) echo "atari2600" ;;
        GAMEBOY)      echo "gb" ;;
        GBA)      echo "gba" ;;
        GENESIS|MEGADRIVE) echo "segaMD" ;;
        GG) echo "segaGG" ;;
        JAGUAR) echo "jaguar" ;;
        N64)   echo "n64" ;;
        NES)   echo "nes" ;;
        PCENGINE) echo "pce" ;;
        PSX) echo "psx" ;;
        S32X) echo "sega32x" ;;
        SMS) echo "segaMS" ;;
        SNES) echo "snes" ;;
        VB) echo "vb" ;;
        WS) echo "ws" ;;
        *)        echo "" ;;
    esac
}

# --- Check tools ---
if ! command -v yq &> /dev/null || ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'yq' (pip version) and 'jq' are required.${NC}"
    exit 1
fi
if ! command -v find &> /dev/null; then
    echo -e "${RED}Error: 'find' command is required.${NC}"
    exit 1
fi

# --- Read Featured Game ID from predictions.yaml ---
echo -e "${BLUE}🔍 Getting current week's game from predictions.yaml...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is required to read predictions.yaml${NC}"
    exit 1
fi

# Get the current week's game title and ID using the Python helpers
FEATURED_GAME_TITLE=$(python3 scripts/get_current_week_game.py)
if [ $? -ne 0 ] || [ -z "$FEATURED_GAME_TITLE" ]; then
    echo -e "${RED}Error: Failed to get current week's game from predictions.yaml${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Current week's game: $FEATURED_GAME_TITLE${NC}"

# Get the game ID directly from predictions.yaml (much faster!)
FEATURED_GAME_ID=$(python3 scripts/get_current_week_game_id.py)
if [ $? -ne 0 ] || [ -z "$FEATURED_GAME_ID" ]; then
    echo -e "${RED}Error: Failed to get current week's game ID from predictions.yaml${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found game ID: $FEATURED_GAME_ID for title: $FEATURED_GAME_TITLE${NC}"

# --- Main processing ---

# Get list of all ROM files
echo -e "${BLUE}📋 Scanning ROM files...${NC}"
ROM_FILES=$(find -L "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | grep -v "/bios/" | sort)
TOTAL_FILES=$(echo "$ROM_FILES" | wc -l)

echo -e "${BLUE}📊 Found $TOTAL_FILES ROM files to process${NC}"

# Create temporary directory for processing
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}🔧 Created temporary directory: $TEMP_DIR${NC}"

# Process ROM files sequentially
echo -e "${BLUE}🚀 Starting sequential processing...${NC}"

# Start the JSON array
echo "[" > "$TEMP_DIR/processed_games.json"
first_game=true
file_count=0

# Process each ROM file
while IFS= read -r rom_file; do
    [ -z "$rom_file" ] && continue
    file_count=$((file_count + 1))
    
    # Progress indicator every 50 files
    if [ $((file_count % 50)) -eq 0 ]; then
        echo -e "${BLUE}📄 Processing file $file_count/$TOTAL_FILES: $(basename "$rom_file")${NC}"
    fi
    
    # Extract game_id from filename (remove extension)
    game_id=$(basename "$rom_file" | sed 's/\.[^.]*$//')
    rom_subdir=$(basename "$(dirname "$rom_file")")
    rom_filename=$(basename "$rom_file")
    
    # Skip BIOS files
    if [ "$rom_subdir" = "bios" ]; then
        continue
    fi
    
    # Generate ROM path based on testing mode
    rom_path=""
    if [ "$USE_LOCAL_PATHS" = "true" ]; then
        # Local testing mode - use local paths
        rom_path="/roms/${rom_subdir}/${rom_filename}"
    else
        # Production mode - use Google Cloud Storage URLs
        rom_path="https://storage.googleapis.com/bonjourarcade-roms/${rom_subdir}/${rom_filename}"
    fi
    
    core=$(get_core_from_dir "$rom_subdir")
    page_url="${LAUNCHER_PAGE}?game=${game_id}"

    # --- Determine Title and other metadata ---
    title="$game_id"
    developer=""
    year=""
    genre=""
    recommended=""
    added=""
    hide="yes"
    enable_score="true"
    to_start=""
    problem=""

    # Check if there's a corresponding game directory with metadata
    game_dir="$GAMES_DIR/$game_id/"
    metadata_file="${game_dir}metadata.yaml"
    controls_json="null"

    if [ -f "$metadata_file" ]; then
        # Try to parse YAML and extract metadata
        metadata_json=$(yq '.' "$metadata_file" 2>/dev/null || echo "INVALID_YAML")
        if [ "$metadata_json" != "INVALID_YAML" ] && echo "$metadata_json" | jq -e . > /dev/null 2>&1; then
            title=$(echo "$metadata_json" | jq -r '.title // ""')
            developer=$(echo "$metadata_json" | jq -r '.developer // ""')
            year=$(echo "$metadata_json" | jq -r '.year // ""')
            genre=$(echo "$metadata_json" | jq -r '.genre // ""')
            recommended=$(echo "$metadata_json" | jq -r '.recommended // ""')
            added=$(echo "$metadata_json" | jq -r '.added // ""')
            hide=$(echo "$metadata_json" | jq -r '.hide // ""')
            enable_score=$(echo "$metadata_json" | jq -r '.enable_score // true')
            to_start=$(echo "$metadata_json" | jq -r '.to_start // ""')
            problem=$(echo "$metadata_json" | jq -r '.problem // ""')
            controls_json=$(echo "$metadata_json" | jq -c '.controls // null')
            new_flag=$(echo "$metadata_json" | jq -r '.new // empty')
            announcement_message=$(echo "$metadata_json" | jq -r '.announcement_message // ""')
            
            # Check if game is in predictions and should override hide setting
            if [ -n "$title" ]; then
                prediction_result=$(python3 scripts/check_predictions_status.py "$title" 2>/dev/null || echo "NOT_IN_PREDICTIONS")
                if [[ "$prediction_result" == SHOW_GAME* ]]; then
                    hide="no"
                    
                    # Override added date with prediction week date if available
                    if [[ "$prediction_result" == *"|"* ]]; then
                        prediction_date=$(echo "$prediction_result" | cut -d'|' -f2)
                        if [ -n "$prediction_date" ]; then
                            added="$prediction_date"
                        fi
                    fi
                fi
            fi
        else
            new_flag=""
        fi
    else
        new_flag=""
    fi
    
    # Check if game is in predictions and should override hide setting (for games without metadata)
    if [ -f "$metadata_file" ] && [ -n "$title" ] && [ "$title" != "$game_id" ]; then
        # Title was extracted from metadata, already handled above
        :
    elif [ -n "$title" ]; then
        # Check if the title (which might be just the game_id) is in predictions
        prediction_result=$(python3 scripts/check_predictions_status.py "$title" 2>/dev/null || echo "NOT_IN_PREDICTIONS")
        if [[ "$prediction_result" == SHOW_GAME* ]]; then
            hide="no"
            
            # Override added date with prediction week date if available
            if [[ "$prediction_result" == *"|"* ]]; then
                prediction_date=$(echo "$prediction_result" | cut -d'|' -f2)
                if [ -n "$prediction_date" ]; then
                    added="$prediction_date"
                fi
            fi
        fi
    fi

    # Check if the game should be marked as new by date
    is_new_by_date=""
    if [ -n "$added" ] && [ "$added" != "DATE_PLACEHOLDER" ]; then
        added_epoch=$(date -j -f "%Y-%m-%d" "$added" +%s 2>/dev/null || date -d "$added" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        if [ -n "$added_epoch" ]; then
            diff_days=$(( (now_epoch - added_epoch) / 86400 ))
            # DAYS_NEW is 7 here
            if [ "$diff_days" -lt 7 ]; then
                is_new_by_date="true"
            fi
        fi
    fi
    
    # Determine final new_flag
    if [ "$new_flag" = "true" ] || [ "$is_new_by_date" = "true" ]; then
        new_flag="true"
    else
        new_flag=""
    fi

    # --- Determine Cover Art ---
    cover_art_abs="/$DEFAULT_COVER"
    expected_cover_file="${game_dir}cover.png"

    if [ -f "$expected_cover_file" ]; then
        cover_art_abs="/games/$game_id/cover.png"
    else
        # Write warning to a file to avoid interleaved output
        echo "WARNING: cover.png not found for game: $game_id" >> "$TEMP_DIR/missing_covers.log" 2>/dev/null || true
    fi

    # --- Use save state if exists ---
    save_state=""
    expected_save_state="${game_dir}save.state"
    if [ -f "$expected_save_state" ]; then
        save_state="/games/$game_id/save.state"
    fi

    # --- Create JSON object ---
    game_json=$(jq -n \
        --arg id "$game_id" \
        --arg title "${title:-$game_id}" \
        --arg json_problem "$problem" \
        --arg developer "$developer" \
        --arg year "$year" \
        --arg genre "$genre" \
        --arg recommended "$recommended" \
        --arg added "$added" \
        --arg hide "$hide" \
        --arg coverArt "$cover_art_abs" \
        --arg pageUrl "$page_url" \
        --arg core "${core:-null}" \
        --arg romPath "${rom_path:-null}" \
        --arg saveState "${save_state:-}" \
        --argjson enable_score "$enable_score" \
        --argjson controls "$controls_json" \
        --arg to_start "$to_start" \
        --arg new_flag "$new_flag" \
        --arg announcement_message "$announcement_message" \
        '{id: $id, title: $title, problem: $json_problem, developer: $developer, year: $year, genre: $genre, recommended: $recommended, added: $added, hide: $hide, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath, saveState: $saveState, enable_score: $enable_score, controls: $controls, to_start: $to_start, new_flag: $new_flag, announcement_message: $announcement_message}' 2>/dev/null || echo "{}")

    # Only output valid JSON
    if echo "$game_json" | jq -e . >/dev/null 2>&1; then
        # Only add non-empty JSON objects
        if [ "$game_json" != "{}" ] && [ "$game_json" != "null" ]; then
            # Add comma if not first game
            if [ "$first_game" = true ]; then
                first_game=false
            else
                echo "," >> "$TEMP_DIR/processed_games.json"
            fi
            
            # Add the game JSON
            echo "$game_json" >> "$TEMP_DIR/processed_games.json"
        fi
    fi
done <<< "$ROM_FILES"

# Close the JSON array
echo "]" >> "$TEMP_DIR/processed_games.json"

# Validate the JSON array
if ! jq -e . "$TEMP_DIR/processed_games.json" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Generated JSON array is invalid${NC}"
    echo -e "${YELLOW}💡 Debug: Check the processed_games.json file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JSON array created successfully${NC}"

# Check if processing was successful
if [ ! -s "$TEMP_DIR/processed_games.json" ]; then
    echo -e "${RED}❌ Error: No games were processed successfully${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${GREEN}✅ Sequential processing completed${NC}"

# Display missing cover warnings
echo -e "${BLUE}🔍 Checking for missing cover images...${NC}"
if [ -f "$TEMP_DIR/missing_covers.log" ]; then
    echo -e "${YELLOW}⚠️  Missing cover.png files:${NC}"
    cat "$TEMP_DIR/missing_covers.log"
else
    echo -e "${GREEN}✅ All games have cover.png files${NC}"
fi

# Create final JSON output
echo -e "${BLUE}📝 Creating final gamelist.json...${NC}"

# Find the featured game
FEATURED_GAME="null"
if [ -n "$FEATURED_GAME_ID" ]; then
    FEATURED_GAME=$(grep "\"id\": \"$FEATURED_GAME_ID\"" "$TEMP_DIR/processed_games.json" | head -1 || echo "null")
    # Validate that we got valid JSON
    if [ "$FEATURED_GAME" != "null" ] && ! echo "$FEATURED_GAME" | jq -e . >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Featured game JSON is invalid, setting to null${NC}"
        FEATURED_GAME="null"
    fi
fi

# Create final JSON structure
if [ "$FEATURED_GAME" != "null" ] && [ -n "$FEATURED_GAME_ID" ]; then
    # Create final JSON with featured game
    # Remove the featured game from the previousGames list to avoid duplication
    jq -n \
        --argjson featured "$FEATURED_GAME" \
        --slurpfile games "$TEMP_DIR/processed_games.json" \
        --arg featured_id "$FEATURED_GAME_ID" \
        '{gameOfTheWeek: $featured, previousGames: ($games[0] | map(select(.id != $featured_id)))}' > "$OUTPUT_FILE"
else
    # Create final JSON without featured game
    jq -n \
        --slurpfile games "$TEMP_DIR/processed_games.json" \
        '{gameOfTheWeek: {id: null, title: "N/A", coverArt: "/assets/images/placeholder_thumb.png", pageUrl: "#", core: null, romPath: null}, previousGames: $games[0]}' > "$OUTPUT_FILE"
fi

# Validate the final output
if ! jq -e . "$OUTPUT_FILE" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Final gamelist.json is invalid${NC}"
    echo -e "${YELLOW}💡 Debug: Temporary directory preserved at: $TEMP_DIR${NC}"
    echo -e "${YELLOW}💡 Check processed_games.json for formatting issues${NC}"
    exit 1
fi

# Create API endpoint for current game of the week ID
echo -e "${BLUE}📝 Creating current-game API endpoint...${NC}"
mkdir -p public/api
CURRENT_GAME_ID=$(jq -r '.gameOfTheWeek.id' "$OUTPUT_FILE")
if [ "$CURRENT_GAME_ID" != "null" ] && [ -n "$CURRENT_GAME_ID" ]; then
    echo "$CURRENT_GAME_ID" > public/api/current-game
    echo -e "${GREEN}✅ Created public/api/current-game with ID: $CURRENT_GAME_ID${NC}"
else
    echo "no-game" > public/api/current-game
    echo -e "${YELLOW}⚠️  No current game found, created placeholder${NC}"
fi

# Clean up only if successful
rm -rf "$TEMP_DIR"

# Final check for featured game
if [ -n "$FEATURED_GAME_ID" ]; then
    featured_id_check=$(jq -r '.gameOfTheWeek.id' "$OUTPUT_FILE")
    if [ "$featured_id_check" = "null" ] || [ "$featured_id_check" != "$FEATURED_GAME_ID" ]; then
        echo -e "${YELLOW}⚠️  Warning: Featured game '$FEATURED_GAME_ID' was not found or processed correctly.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No featured game was set for this week.${NC}"
fi

echo -e "${GREEN}✅ Sequential gamelist generation completed successfully!${NC}"
echo -e "${GREEN}📊 Processed $TOTAL_FILES ROM files sequentially${NC}"
