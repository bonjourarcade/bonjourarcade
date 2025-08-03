#!/bin/sh
set -e

# --- Color codes for output ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Configuration ---
GAMES_DIR="public/games"
ROMS_DIR="public/roms"
OUTPUT_FILE="public/gamelist.json"
FEATURED_ID_FILE="game-of-the-week"
DEFAULT_COVER="assets/images/placeholder_thumb.png"
LAUNCHER_PAGE="/play"

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

# --- Read Featured Game ID ---
if [ ! -f "$FEATURED_ID_FILE" ]; then echo "Error: $FEATURED_ID_FILE not found."; exit 1; fi
FEATURED_GAME_ID=$(cat "$FEATURED_ID_FILE")
if [ -z "$FEATURED_GAME_ID" ]; then echo "Error: $FEATURED_ID_FILE is empty."; exit 1; fi

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
    rom_path="/$(echo "$rom_file" | sed 's|public/||')" # Web path
    
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
    disable_score="false"
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
            disable_score=$(echo "$metadata_json" | jq -r '.disable_score // false')
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
            if [ "$diff_days" -lt 14 ]; then
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
    
    # Start worker in background
    "$WORKER_SCRIPT" "$GAMES_DIR" "$ROMS_DIR" "$DEFAULT_COVER" "$LAUNCHER_PAGE" "$FEATURED_GAME_ID" "$BATCH_FILE" "$OUTPUT_DIR" &
    WORKER_PIDS+=($!)
done

# Wait for all workers to complete
echo -e "${BLUE}⏳ Waiting for workers to complete...${NC}"
for pid in "${WORKER_PIDS[@]}"; do
    wait "$pid"
done

# Combine results
echo -e "${BLUE}🔗 Combining results...${NC}"
COMBINED_GAMES="[]"
FEATURED_GAME="null"

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
                    
                    if [ "$game_id" = "$FEATURED_GAME_ID" ]; then
                        FEATURED_GAME="$game_json"
                    else
                        # Add to combined games array
                        COMBINED_GAMES=$(echo "$COMBINED_GAMES" | jq --argjson game "$game_json" '. += [$game]')
                    fi
                else
                    echo -e "${YELLOW}⚠️  Warning: Invalid JSON from worker: $game_file${NC}"
                fi
            fi
        done
    fi
done

# Add the SHMUPS entry
shmups_json=$(jq -n \
    --arg id "shmups" \
    --arg title "SHMUPS" \
    --arg developer "" \
    --arg year "" \
    --arg genre "" \
    --arg recommended "" \
    --arg hide "no" \
    --arg coverArt "/assets/shmups.jpg" \
    --arg pageUrl "https://felx.cc/s" \
    --arg core "null" \
    --arg romPath "null" \
    --arg saveState "" \
    '{id: $id, title: $title, developer: $developer, year: $year, genre: $genre, recommended: $recommended, hide: $hide, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath, saveState: $saveState}')

COMBINED_GAMES=$(echo "$COMBINED_GAMES" | jq --argjson shmups "$shmups_json" '. += [$shmups]')

# Create final JSON output
if [ "$FEATURED_GAME" != "null" ]; then
    FINAL_JSON=$(jq -n \
        --argjson featured "$FEATURED_GAME" \
        --argjson games "$COMBINED_GAMES" \
        '{gameOfTheWeek: $featured, previousGames: $games}')
else
    FINAL_JSON=$(jq -n \
        --argjson games "$COMBINED_GAMES" \
        '{gameOfTheWeek: {id: null, title: "N/A", coverArt: "/assets/images/placeholder_thumb.png", pageUrl: "#", core: null, romPath: null}, previousGames: $games}')
fi

# Write final output
echo "$FINAL_JSON" | jq '.' > "$OUTPUT_FILE"

# Clean up
rm -rf "$TEMP_DIR"

# Final check for featured game
featured_id_check=$(echo "$FINAL_JSON" | jq -r '.gameOfTheWeek.id')
if [ "$featured_id_check" = "null" ] || [ "$featured_id_check" != "$FEATURED_GAME_ID" ]; then
    echo -e "${YELLOW}⚠️  Warning: Featured game '$FEATURED_GAME_ID' was not found or processed correctly.${NC}"
fi

echo -e "${GREEN}✅ Parallel gamelist generation completed successfully!${NC}"
echo -e "${GREEN}📊 Processed $TOTAL_FILES ROM files using $NUM_WORKERS workers${NC}" 