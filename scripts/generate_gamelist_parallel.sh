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

# Determine number of CPU cores to use
if command -v nproc >/dev/null 2>&1; then
    NUM_CORES=$(nproc)
elif command -v sysctl >/dev/null 2>&1; then
    NUM_CORES=$(sysctl -n hw.ncpu)
else
    NUM_CORES=4  # Default fallback
fi

# Use 75% of available cores to avoid overwhelming the system
NUM_WORKERS=$((NUM_CORES * 3 / 4))
if [ $NUM_WORKERS -lt 2 ]; then
    NUM_WORKERS=2
fi

echo -e "${BLUE}🚀 Starting parallel gamelist generation with $NUM_WORKERS workers...${NC}"

# --- Core Mapping (Directory name -> EJS_core name) ---
get_core_from_dir() {
    case "$1" in
        arcade|fbneo) echo "arcade" ;;
        mame) echo "mame2003_plus" ;;
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

# Get the current week's game title using the Python helper
FEATURED_GAME_TITLE=$(python3 scripts/get_current_week_game.py)
if [ $? -ne 0 ] || [ -z "$FEATURED_GAME_TITLE" ]; then
    echo -e "${RED}Error: Failed to get current week's game from predictions.yaml${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Current week's game: $FEATURED_GAME_TITLE${NC}"

# Function to find game ID by title
find_game_id_by_title() {
    local search_title="$1"
    local games_dir="$2"
    
    # Search through all game directories for a title match
    for game_dir in "$games_dir"/*/; do
        if [ -d "$game_dir" ]; then
            game_id=$(basename "$game_dir")
            metadata_file="${game_dir}metadata.yaml"
            
            if [ -f "$metadata_file" ]; then
                # Try to parse YAML and extract title
                title=$(yq '.title // ""' "$metadata_file" 2>/dev/null | tr -d '"' | tr -d '\n' || echo "")
                
                if [ "$title" = "$search_title" ]; then
                    echo "$game_id"
                    return 0
                fi
            fi
        fi
    done
    
    # If no exact match found, try case-insensitive match
    for game_dir in "$games_dir"/*/; do
        if [ -d "$game_dir" ]; then
            game_id=$(basename "$game_dir")
            metadata_file="${game_dir}metadata.yaml"
            
            if [ -f "$metadata_file" ]; then
                # Try to parse YAML and extract title
                title=$(yq '.title // ""' "$metadata_file" 2>/dev/null | tr -d '"' | tr -d '\n' || echo "")
                
                if [ "${title,,}" = "${search_title,,}" ]; then
                    echo "$game_id"
                    return 0
                fi
            fi
        fi
    done
    
    echo ""
    return 1
}

# Find the game ID for the featured game
FEATURED_GAME_ID=$(find_game_id_by_title "$FEATURED_GAME_TITLE" "$GAMES_DIR")
if [ -n "$FEATURED_GAME_ID" ]; then
    echo -e "${GREEN}✅ Found game ID: $FEATURED_GAME_ID for title: $FEATURED_GAME_TITLE${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Could not find game ID for featured game: $FEATURED_GAME_TITLE${NC}"
    FEATURED_GAME_ID=""
fi

# --- Main processing ---

# Get list of all ROM files
echo -e "${BLUE}📋 Scanning ROM files...${NC}"
ROM_FILES=$(find "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | grep -v "/bios/" | sort)
TOTAL_FILES=$(echo "$ROM_FILES" | wc -l)

echo -e "${BLUE}📊 Found $TOTAL_FILES ROM files to process${NC}"

# Create temporary directory for processing
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}🔧 Created temporary directory: $TEMP_DIR${NC}"

# Process ROM files in batches
echo -e "${BLUE}🚀 Starting batch processing...${NC}"

# Check if we're running locally (not in CI/CD)
if [ "$CI" != "true" ] && [ "$GITHUB_ACTIONS" != "true" ] && [ "$GITLAB_CI" != "true" ]; then
    echo -e "${BLUE}🚀 Local mode detected - processing batches in parallel...${NC}"
    BATCH_WORKERS=$NUM_WORKERS
else
    echo -e "${BLUE}🏭 CI/CD mode detected - using reduced parallel processing (3 workers)...${NC}"
    BATCH_WORKERS=3  # Reduced from 6 to 3 for CI/CD safety
fi

# Calculate batch size based on actual workers we'll use
BATCH_SIZE=$((TOTAL_FILES / BATCH_WORKERS + 1))
echo -e "${BLUE}🔧 Processing in batches of ~$BATCH_SIZE files${NC}"

# Create batches
for i in $(seq 1 $BATCH_WORKERS); do
    BATCH_FILE="$TEMP_DIR/batch_$i.txt"
    BATCH_FILES+=("$BATCH_FILE")
done

# Distribute files across batches
echo "$ROM_FILES" | awk -v num_workers="$BATCH_WORKERS" -v temp_dir="$TEMP_DIR" '
    BEGIN { batch_num = 1 }
    {
        batch_file = temp_dir "/batch_" batch_num ".txt"
        print $0 > batch_file
        batch_num = (batch_num % num_workers) + 1
    }'

# Process each batch
echo "[" > "$TEMP_DIR/processed_games.json"
first_batch=true

# Start all batches in background
BATCH_PIDS=()
for i in $(seq 1 $BATCH_WORKERS); do
        BATCH_FILE="$TEMP_DIR/batch_$i.txt"
        if [ -s "$BATCH_FILE" ]; then
            echo -e "${BLUE}📦 Starting batch $i in background...${NC}"
            (
                # Process batch in background
                batch_num=$i
                batch_file="$BATCH_FILE"
                temp_dir="$TEMP_DIR"
                games_dir="$GAMES_DIR"
                default_cover="$DEFAULT_COVER"
                launcher_page="$LAUNCHER_PAGE"
                featured_game_id="$FEATURED_GAME_ID"
                use_local_paths="$USE_LOCAL_PATHS"
                
                # Process each ROM file in the batch
                file_count=0
                while IFS= read -r rom_file; do
                    [ -z "$rom_file" ] && continue
                    file_count=$((file_count + 1))
                    
                    # Debug output for every 10th file
                    if [ $((file_count % 10)) -eq 0 ]; then
                        echo -e "${BLUE}     📄 Batch $batch_num - Processing file $file_count: $(basename "$rom_file")${NC}" >> "$temp_dir/debug.log"
                    fi
                    
                    # Add error handling around the entire file processing
                    if ! (
                        # Extract game_id from filename (remove extension)
                        game_id=$(basename "$rom_file" | sed 's/\.[^.]*$//')
                        rom_subdir=$(basename "$(dirname "$rom_file")")
                        rom_filename=$(basename "$rom_file")
                        
                        # Skip BIOS files
                        if [ "$rom_subdir" = "bios" ]; then
                            exit 0
                        fi
                        
                        # Generate ROM path based on testing mode
                        rom_path=""
                        if [ "$use_local_paths" = "true" ]; then
                            # Local testing mode - use local paths
                            rom_path="/roms/${rom_subdir}/${rom_filename}"
                        else
                            # Production mode - use Google Cloud Storage URLs
                            rom_path="https://storage.googleapis.com/bonjourarcade-roms/${rom_subdir}/${rom_filename}"
                        fi
                        
                        core=$(get_core_from_dir "$rom_subdir")
                        page_url="${launcher_page}?game=${game_id}"

                        # --- Determine Title and other metadata ---
                        title="$game_id"
                        developer=""
                        year=""
                        genre=""
                        recommended=""
                        added=""
                        hide="yes"
                        enable_score="false"
                        to_start=""
                        problem=""

                        # Check if there's a corresponding game directory with metadata
                        game_dir="$games_dir/$game_id/"
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
                                enable_score=$(echo "$metadata_json" | jq -r '.enable_score // false')
                                to_start=$(echo "$metadata_json" | jq -r '.to_start // ""')
                                problem=$(echo "$metadata_json" | jq -r '.problem // ""')
                                controls_json=$(echo "$metadata_json" | jq -c '.controls // null')
                                new_flag=$(echo "$metadata_json" | jq -r '.new // empty')
                                
                                # Check if game is in predictions and should override hide setting
                                if [ -n "$title" ]; then
                                    prediction_result=$(python3 scripts/check_predictions_status.py "$title" 2>/dev/null || echo "NOT_IN_PREDICTIONS")
                                    if [[ "$prediction_result" == SHOW_GAME* ]]; then
                                        hide="no"
                                        echo "     🔍 Overriding hide setting for prediction game: $title (hide: $hide)" >> "$temp_dir/debug.log"
                                        
                                        # Override added date with prediction week date if available
                                        if [[ "$prediction_result" == *"|"* ]]; then
                                            prediction_date=$(echo "$prediction_result" | cut -d'|' -f2)
                                            if [ -n "$prediction_date" ]; then
                                                added="$prediction_date"
                                                echo "     📅 Overriding added date for prediction game: $title (new date: $added)" >> "$temp_dir/debug.log"
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
                                echo "     🔍 Overriding hide setting for prediction game without metadata: $title (hide: $hide)" >> "$temp_dir/debug.log"
                                
                                # Override added date with prediction week date if available
                                if [[ "$prediction_result" == *"|"* ]]; then
                                    prediction_date=$(echo "$prediction_result" | cut -d'|' -f2)
                                    if [ -n "$prediction_date" ]; then
                                        added="$prediction_date"
                                        echo "     📅 Overriding added date for prediction game without metadata: $title (new date: $added)" >> "$temp_dir/debug.log"
                                    fi
                                fi
                            fi
                        fi

                        # Check if the game should be marked as new by date
                        is_new_by_date=""
                        if [ -n "$added" ]; then
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
                        cover_art_abs="/$default_cover"
                        expected_cover_file="${game_dir}cover.png"

                        if [ -f "$expected_cover_file" ]; then
                            cover_art_abs="/games/$game_id/cover.png"
                        else
                            # Write warning to a file to avoid interleaved output in parallel processing
                            echo "WARNING: cover.png not found for game: $game_id" >> "$temp_dir/missing_covers.log" 2>/dev/null || true
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
                            '{id: $id, title: $title, problem: $json_problem, developer: $developer, year: $year, genre: $genre, recommended: $recommended, added: $added, hide: $hide, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath, saveState: $saveState, enable_score: $enable_score, controls: $controls, to_start: $to_start, new_flag: $new_flag}' 2>/dev/null || echo "{}")

                        # Only output valid JSON
                        if echo "$game_json" | jq -e . >/dev/null 2>&1; then
                            # Only add non-empty JSON objects
                            if [ "$game_json" != "{}" ] && [ "$game_json" != "null" ]; then
                                # Debug: show the JSON being written
                                if [ $file_count -le 5 ]; then
                                    echo -e "${BLUE}     🔍 Debug JSON for $game_id: $game_json${NC}" >> "$temp_dir/debug.log"
                                fi
                                
                                # Convert JSON to single line to avoid newline issues
                                single_line_json=$(echo "$game_json" | jq -c .)
                                
                                # Write to a temporary file for this game
                                echo "$single_line_json" > "$temp_dir/game_${game_id}.json"
                            else
                                echo -e "${YELLOW}⚠️  Warning: Empty JSON generated for game: $game_id, skipping${NC}" >> "$temp_dir/debug.log"
                            fi
                        else
                            echo -e "${YELLOW}⚠️  Warning: Invalid JSON generated for game: $game_id, skipping${NC}" >> "$temp_dir/debug.log"
                        fi
                    ); then
                        echo -e "${RED}❌ Error processing file: $rom_file${NC}" >> "$temp_dir/debug.log"
                        echo -e "${RED}   Game ID: $game_id${NC}" >> "$temp_dir/debug.log"
                        echo -e "${RED}   This file will be skipped${NC}" >> "$temp_dir/debug.log"
                    fi
                done < "$batch_file"
                
                echo -e "${GREEN}   ✅ Completed batch $batch_num ($file_count files processed)${NC}" >> "$temp_dir/debug.log"
            ) &
            BATCH_PIDS+=($!)
        fi
    done
    
    # Wait for all batches to complete
    echo -e "${BLUE}⏳ Waiting for all batches to complete...${NC}"
    for pid in "${BATCH_PIDS[@]}"; do
        wait $pid
    done
    echo -e "${GREEN}✅ All batches completed!${NC}"

# Now combine all the individual game files into a proper JSON array
echo -e "${BLUE}🔗 Combining individual game files into JSON array...${NC}"

# Find all game JSON files and combine them
GAME_FILES=$(find "$TEMP_DIR" -name "game_*.json" -type f | sort)
GAME_COUNT=$(echo "$GAME_FILES" | wc -l)

echo -e "${BLUE}📊 Found $GAME_COUNT valid game files to combine${NC}"

# Start the JSON array
echo "[" > "$TEMP_DIR/processed_games.json"

# Add each game file to the array
first_game=true
for game_file in $GAME_FILES; do
    if [ -s "$game_file" ]; then
        if [ "$first_game" = true ]; then
            cat "$game_file" >> "$TEMP_DIR/processed_games.json"
            first_game=false
        else
            echo "," >> "$TEMP_DIR/processed_games.json"
            cat "$game_file" >> "$TEMP_DIR/processed_games.json"
        fi
    fi
done

# Close the JSON array
echo "]" >> "$TEMP_DIR/processed_games.json"

# Validate the JSON array
if ! jq -e . "$TEMP_DIR/processed_games.json" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Generated JSON array is invalid${NC}"
    echo -e "${YELLOW}💡 Debug: Check the processed_games.json file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JSON array created successfully with $GAME_COUNT games${NC}"

# Show debug log location if it exists
if [ -f "$TEMP_DIR/debug.log" ]; then
    echo -e "${BLUE}💡 Debug log available at: $TEMP_DIR/debug.log${NC}"
fi

# Check if processing was successful
if [ ! -s "$TEMP_DIR/processed_games.json" ]; then
    echo -e "${RED}❌ Error: No games were processed successfully${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${GREEN}✅ Batch processing completed${NC}"

# Combine results
echo -e "${BLUE}🔗 Combining results...${NC}"

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
    FEATURED_GAME=$(grep "\"id\":\"$FEATURED_GAME_ID\"" "$TEMP_DIR/processed_games.json" | head -1 || echo "null")
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

echo -e "${GREEN}✅ Parallel gamelist generation completed successfully!${NC}"
echo -e "${GREEN}📊 Processed $TOTAL_FILES ROM files using $NUM_WORKERS workers${NC}" 
