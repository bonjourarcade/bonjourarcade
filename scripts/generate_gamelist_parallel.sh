#!/bin/bash
set -e

# --- Color codes for output ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo "Error: 'yq' (pip version) and 'jq' are required."
    exit 1
fi
if ! command -v find &> /dev/null; then
    echo "Error: 'find' command is required."
    exit 1
fi

# --- Read Featured Game ID from predictions.yaml ---
echo -e "${BLUE}🔍 Getting current week's game from predictions.yaml...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required to read predictions.yaml"
    exit 1
fi

# Get the current week's game title using the Python helper
FEATURED_GAME_TITLE=$(python3 scripts/get_current_week_game.py)
if [ $? -ne 0 ] || [ -z "$FEATURED_GAME_TITLE" ]; then
    echo "Error: Failed to get current week's game from predictions.yaml"
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
                title=$(yq '.title // ""' "$metadata_file" 2>/dev/null | tr -d '"' | tr -d '\n' || echo "")
                
                if [ "$(echo "$title" | tr '[:upper:]' '[:lower:]')" = "$(echo "$search_title" | tr '[:upper:]' '[:lower:]')" ]; then
                    echo "$game_id"
                    return 0
                fi
            fi
        fi
    done
    
    echo ""
    return 1
}

# Find the game ID for the featured game title
FEATURED_GAME_ID=$(find_game_id_by_title "$FEATURED_GAME_TITLE" "$GAMES_DIR")
if [ -z "$FEATURED_GAME_ID" ]; then
    echo -e "${YELLOW}⚠️  Warning: Could not find game ID for title: $FEATURED_GAME_TITLE${NC}"
    echo -e "${YELLOW}⚠️  Featured game will be set to null${NC}"
    FEATURED_GAME_ID=""
else
    echo -e "${GREEN}✅ Found game ID: $FEATURED_GAME_ID for title: $FEATURED_GAME_TITLE${NC}"
fi

# --- Create worker script ---
create_worker_script() {
    cat > "$1" << 'WORKER_EOF'
#!/bin/sh
set -e

# Worker script to process a batch of ROM files
GAMES_DIR="$1"
ROMS_DIR="$2"
DEFAULT_COVER="$3"
LAUNCHER_PAGE="$4"
FEATURED_GAME_ID="$5"
BATCH_FILE="$6"
OUTPUT_DIR="$7"

# Core mapping function
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

# Process each ROM file in the batch
while IFS= read -r rom_file; do
    [ -z "$rom_file" ] && continue
    
    # Extract game_id from filename (remove extension)
    game_id=$(basename "$rom_file" | sed 's/\.[^.]*$//')
    rom_subdir=$(basename "$(dirname "$rom_file")")
    # Generate ROM path based on testing mode
    rom_filename=$(basename "$rom_file")
    rom_subdir=$(basename "$(dirname "$rom_file")")
    
    if [ "$USE_LOCAL_PATHS" = "true" ]; then
        # Local testing mode - use local paths
        rom_path="/roms/${rom_subdir}/${rom_filename}"
    else
        # Production mode - use Google Cloud Storage URLs
        rom_path="https://storage.googleapis.com/bonjourarcade-roms/${rom_subdir}/${rom_filename}"
    fi
    
    if [ "$rom_subdir" = "bios" ]; then
        continue
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
    disable_score="true"
    to_start=""

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
            disable_score=$(echo "$metadata_json" | jq -r '.disable_score // true')
            to_start=$(echo "$metadata_json" | jq -r '.to_start // ""')
            controls_json=$(echo "$metadata_json" | jq -c '.controls // null')
            new_flag=$(echo "$metadata_json" | jq -r '.new // empty')
        else
            new_flag=""
        fi
    else
        new_flag=""
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
    cover_art_abs="/$DEFAULT_COVER"
    expected_cover_file="${game_dir}cover.png"

    if [ -f "$expected_cover_file" ]; then
        cover_art_abs="/games/$game_id/cover.png"
    else
        # Write warning to a file to avoid interleaved output in parallel processing
        echo "WARNING: cover.png not found for game: $game_id" >> "$OUTPUT_DIR/missing_covers.log"
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
        --argjson disable_score "$disable_score" \
        --argjson controls "$controls_json" \
        --arg to_start "$to_start" \
        --arg new_flag "$new_flag" \
        '{id: $id, title: $title, developer: $developer, year: $year, genre: $genre, recommended: $recommended, added: $added, hide: $hide, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath, saveState: $saveState, disable_score: $disable_score, controls: $controls, to_start: $to_start, new_flag: $new_flag}' 2>/dev/null || echo "{}")

    # Only output valid JSON
    if echo "$game_json" | jq -e . >/dev/null 2>&1; then
        # Write each game to a separate file to avoid line splitting issues
        echo "$game_json" > "$OUTPUT_DIR/game_${game_id}.json"
    fi
    
done < "$BATCH_FILE"
WORKER_EOF
    chmod +x "$1"
}

# --- Main parallel processing ---

# Get list of all ROM files
echo -e "${BLUE}📋 Scanning ROM files...${NC}"
ROM_FILES=$(find "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | grep -v "/bios/" | sort)
TOTAL_FILES=$(echo "$ROM_FILES" | wc -l)

echo -e "${BLUE}📊 Found $TOTAL_FILES ROM files to process${NC}"

# Create temporary directory for batch files
TEMP_DIR=$(mktemp -d)
WORKER_SCRIPT="$TEMP_DIR/worker.sh"

# Create worker script
create_worker_script "$WORKER_SCRIPT"

# Split files into batches
BATCH_SIZE=$((TOTAL_FILES / NUM_WORKERS + 1))
echo -e "${BLUE}🔧 Splitting into $NUM_WORKERS batches of ~$BATCH_SIZE files each${NC}"

# Create batch files
BATCH_FILES=()
for i in $(seq 1 $NUM_WORKERS); do
    BATCH_FILE="$TEMP_DIR/batch_$i.txt"
    BATCH_FILES+=("$BATCH_FILE")
done

# Distribute files across batches
echo "$ROM_FILES" | awk -v num_workers="$NUM_WORKERS" -v temp_dir="$TEMP_DIR" '
    BEGIN { batch_num = 1 }
    {
        batch_file = temp_dir "/batch_" batch_num ".txt"
        print $0 > batch_file
        batch_num = (batch_num % num_workers) + 1
    }'

# Start worker processes
echo -e "${BLUE}🚀 Starting $NUM_WORKERS worker processes...${NC}"
WORKER_PIDS=()
WORKER_OUTPUTS=()

for i in $(seq 1 $NUM_WORKERS); do
    BATCH_FILE="$TEMP_DIR/batch_$i.txt"
    OUTPUT_DIR="$TEMP_DIR/output_$i"
    mkdir -p "$OUTPUT_DIR"
    WORKER_OUTPUTS+=("$OUTPUT_DIR")
    
    # Start worker in background with environment variable
    USE_LOCAL_PATHS="$USE_LOCAL_PATHS" "$WORKER_SCRIPT" "$GAMES_DIR" "$ROMS_DIR" "$DEFAULT_COVER" "$LAUNCHER_PAGE" "$FEATURED_GAME_ID" "$BATCH_FILE" "$OUTPUT_DIR" &
    WORKER_PIDS+=($!)
done

# Wait for all workers to complete
echo -e "${BLUE}⏳ Waiting for workers to complete...${NC}"
for pid in "${WORKER_PIDS[@]}"; do
    wait "$pid"
done

# Combine results
echo -e "${BLUE}🔗 Combining results...${NC}"

# Display missing cover warnings
echo -e "${BLUE}🔍 Checking for missing cover images...${NC}"
MISSING_COVERS_FOUND=false
for output_dir in "${WORKER_OUTPUTS[@]}"; do
    if [ -f "$output_dir/missing_covers.log" ]; then
        if [ "$MISSING_COVERS_FOUND" = false ]; then
            echo -e "${YELLOW}⚠️  Missing cover.png files:${NC}"
            MISSING_COVERS_FOUND=true
        fi
        cat "$output_dir/missing_covers.log" | while read -r warning; do
            echo -e "${YELLOW}   $warning${NC}"
        done
    fi
done

if [ "$MISSING_COVERS_FOUND" = false ]; then
    echo -e "${GREEN}✅ All games have cover.png files${NC}"
fi

FEATURED_GAME="null"

# Create temporary files for combining results
COMBINED_GAMES_FILE="$TEMP_DIR/combined_games.json"
echo "[]" > "$COMBINED_GAMES_FILE"

for output_dir in "${WORKER_OUTPUTS[@]}"; do
    if [ -d "$output_dir" ]; then
        # Process each game file in the output directory
        for game_file in "$output_dir"/game_*.json; do
            if [ -f "$game_file" ]; then
                game_json=$(cat "$game_file")
                
                # Validate JSON before processing
                if echo "$game_json" | jq -e . >/dev/null 2>&1; then
                    # Extract game ID to check if it's the featured game
                    game_id=$(echo "$game_json" | jq -r '.id // empty')
                    
                        if [ -n "$FEATURED_GAME_ID" ] && [ "$game_id" = "$FEATURED_GAME_ID" ]; then
                        FEATURED_GAME="$game_json"
                    else
                        # Add to combined games array using temporary file to avoid argument list too long
                        jq --argjson game "$game_json" '. += [$game]' "$COMBINED_GAMES_FILE" > "$TEMP_DIR/temp_combined.json"
                        mv "$TEMP_DIR/temp_combined.json" "$COMBINED_GAMES_FILE"
                    fi
                else
                    echo -e "${YELLOW}⚠️  Warning: Invalid JSON from worker: $game_file${NC}"
                fi
            fi
        done
    fi
done

# Read the combined games from file
COMBINED_GAMES=$(cat "$COMBINED_GAMES_FILE")

# Create final JSON output using file-based approach
FINAL_JSON_FILE="$TEMP_DIR/final_output.json"

if [ "$FEATURED_GAME" != "null" ] && [ -n "$FEATURED_GAME_ID" ]; then
    # Create featured game file
    echo "$FEATURED_GAME" > "$TEMP_DIR/featured_game.json"
    
    # Create final JSON with featured game
    jq -n \
        --slurpfile featured "$TEMP_DIR/featured_game.json" \
        --slurpfile games "$COMBINED_GAMES_FILE" \
        '{gameOfTheWeek: $featured[0], previousGames: $games[0]}' > "$FINAL_JSON_FILE"
else
    # Create final JSON without featured game
    jq -n \
        --slurpfile games "$COMBINED_GAMES_FILE" \
        '{gameOfTheWeek: {id: null, title: "N/A", coverArt: "/assets/images/placeholder_thumb.png", pageUrl: "#", core: null, romPath: null}, previousGames: $games[0]}' > "$FINAL_JSON_FILE"
fi

# Write final output
jq '.' "$FINAL_JSON_FILE" > "$OUTPUT_FILE"

# Clean up
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
