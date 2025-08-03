#!/bin/sh
set -e

# --- Configuration ---
# Make sure this script uses sh compatibility for Mac OS and Alpine

GAMES_DIR="public/games"
ROMS_DIR="public/roms"
OUTPUT_FILE="public/gamelist.json"
FEATURED_ID_FILE="game-of-the-week"
DEFAULT_COVER="assets/images/placeholder_thumb.png" # Relative to public root
LAUNCHER_PAGE="/play"

# --- Core Mapping (Directory name -> EJS_core name) ---
get_core_from_dir() {
    case "$1" in
        arcade|fbneo) echo "arcade" ;; # Map arcade, fbneo folders to 'arcade' core
        mame) echo "mame2003_plus" ;; # Map mame  to 'mame2003' core
        ATARI2600) echo "atari2600" ;;
        GAMEBOY)      echo "gb" ;;
        GBA)      echo "gba" ;;
        GENESIS|MEGADRIVE) echo "segaMD" ;;
        GG) echo "segaGG" ;;
        JAGUAR) echo "jaguar" ;;
        N64)   echo "n64" ;;
        NES)   echo "nes" ;;    # Map nes, fc folders to 'nes' core
        PSX) echo "psx" ;;
        S32X) echo "sega32x" ;;
        SMS) echo "segaMS" ;;
        SNES) echo "snes" ;; # Map snes, sfc folders to 'snes' core
        VB) echo "vb" ;; # VirtualBoy
        WS) echo "ws" ;; # Wonderswan
        # Add mappings for other systems/cores here
        *)        echo "" ;; # Return empty if no mapping found
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

# --- Initialize JSON Output and Temp File ---
json_output=$(jq -n --arg default_cover "/$DEFAULT_COVER" \
                '{gameOfTheWeek: {id: null, title: "N/A", coverArt: $default_cover, pageUrl: "#", core: null, romPath: null}, previousGames: []}')
temp_json_file=$(mktemp)
# Write initial JSON to temp file
echo "$json_output" > "$temp_json_file"

# --- Check for duplicate game IDs ---

# Create a temporary file to store the game IDs
temp_game_ids=$(mktemp)
temp_duplicates=$(mktemp)

# Find all ROM files across directories and extract game IDs
find "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | while read -r rom_file; do
    # Get the base name without extension
    game_id=$(basename "$rom_file" | sed 's/\.[^.]*$//')
    echo "$game_id|$rom_file" >> "$temp_game_ids"
done

# Check for duplicates by sorting and counting occurrences
cat "$temp_game_ids" | cut -d '|' -f1 | sort | uniq -c | awk '$1 > 1 {print $2}' > "$temp_duplicates"

# If duplicates exist, show the error and exit
if [ -s "$temp_duplicates" ]; then
    echo -e "\033[37;41mError: Duplicate game IDs found:\033[0m"

    while read -r dup_id; do
        echo -e "\033[37;41m  Game ID: '$dup_id' found in files:\033[0m"
        grep "^$dup_id|" "$temp_game_ids" | cut -d '|' -f2 | while read -r path; do
            echo -e "\033[37;41m    - $path\033[0m"
        done
    done < "$temp_duplicates"

    # Clean up temporary files
    rm -f "$temp_game_ids" "$temp_duplicates"

    echo "Script aborted due to duplicate game IDs."
    exit 1
fi

# Clean up temporary files
rm -f "$temp_game_ids" "$temp_duplicates"

# --- Scan ROM files to generate game list ---

# Count total files for progress bar
echo "Counting ROM files..."
total_files=$(find "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | wc -l)
current_file=0

# Create a temp file to store all the games data
temp_games_file=$(mktemp)
echo "[]" > "$temp_games_file"

# Create a temp file to store featured game data
temp_featured_file=$(mktemp)
echo "null" > "$temp_featured_file"

echo "Processing $total_files ROM files..."

find "$ROMS_DIR" -maxdepth 2 -type f -not -path "*/\.*" | while read -r rom_file; do
    # Extract game_id from filename (remove extension)
    game_id=$(basename "$rom_file" | sed 's/\.[^.]*$//')
    rom_subdir=$(basename "$(dirname "$rom_file")")
    rom_path="/$(echo "$rom_file" | sed 's|public/||')" # Web path
    if [ "$rom_subdir" = "bios" ]; then
      continue
    fi
    
    # Update progress bar
    current_file=$((current_file + 1))
    progress_percent=$((current_file * 100 / total_files))
    progress_bar_length=30
    filled_length=$((progress_percent * progress_bar_length / 100))
    empty_length=$((progress_bar_length - filled_length))
    
    # Create progress bar string
    progress_bar=""
    for ((i=0; i<filled_length; i++)); do
        progress_bar="${progress_bar}█"
    done
    for ((i=0; i<empty_length; i++)); do
        progress_bar="${progress_bar}░"
    done
    
    # Print progress with carriage return to overwrite the same line
    printf "\r[%s] %d%% (%d/%d) Processing: %s" "$progress_bar" "$progress_percent" "$current_file" "$total_files" "$game_id"
    core=$(get_core_from_dir "$rom_subdir")
    page_url="${LAUNCHER_PAGE}?game=${game_id}"

    # --- Determine Title and other metadata ---
    title="$game_id" # DEFAULT title is the game ID (filename without extension)
    developer=""
    year=""
    genre=""
    recommended="" # Initialize recommended field
    added="" # Initialize added field
    hide="yes" # Default to hiding games even with no metadata
    disable_score="false" # Default to false
    to_start="" # Initialize to_start field

    # Check if there's a corresponding game directory with metadata
    game_dir="$GAMES_DIR/$game_id/"
    metadata_file="${game_dir}metadata.yaml"

    controls_json="null" # Default if not present

    if [ -f "$metadata_file" ]; then
        # Try to parse YAML and extract metadata
        metadata_json=$(yq '.' "$metadata_file" 2>/dev/null || echo "INVALID_YAML")
        if [ "$metadata_json" != "INVALID_YAML" ] && echo "$metadata_json" | jq -e . > /dev/null 2>&1; then
            title=$(echo "$metadata_json" | jq -r '.title // ""')
            developer=$(echo "$metadata_json" | jq -r '.developer // ""')
            year=$(echo "$metadata_json" | jq -r '.year // ""')
            genre=$(echo "$metadata_json" | jq -r '.genre // ""')
            recommended=$(echo "$metadata_json" | jq -r '.recommended // ""') # Extract recommended field
            added=$(echo "$metadata_json" | jq -r '.added // ""') # Extract added field
            hide=$(echo "$metadata_json" | jq -r '.hide // ""') # Use metadata hide value if present
            disable_score=$(echo "$metadata_json" | jq -r '.disable_score // false') # Extract disable_score, default false
            to_start=$(echo "$metadata_json" | jq -r '.to_start // ""') # Extract to_start field
            # Extract controls as JSON array if present
            controls_json=$(echo "$metadata_json" | jq -c '.controls // null')
            new_flag=$(echo "$metadata_json" | jq -r '.new // empty')
        else
            echo "  - metadata.yaml found but failed to parse. Using default title ($game_id)."
            new_flag=""
        fi
    else
        echo "  - No metadata.yaml found. Using default title ($game_id) and hiding this game (hide:yes)."
        new_flag=""
    fi

    # Check if the game should be marked as new by date
    is_new_by_date=""
    if [ -n "$added" ]; then
      # Convert added date to seconds since epoch
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
    cover_art_abs="/$DEFAULT_COVER" # Start with default path
    expected_cover_file="${game_dir}cover.png"

    if [ -f "$expected_cover_file" ]; then
        # If cover.png exists, set the absolute web path correctly
        cover_art_abs="/games/$game_id/cover.png"
    else
        printf "\033[30;43mWarning: Expected cover file not found: ["$expected_cover_file"]. Using default.\033[0m\n"
    fi

    # --- Use save state if exists ---
    save_state="" # Default, no save state
    expected_save_state="${game_dir}save.state"
    if [ -f "$expected_save_state" ]; then
        # If save.state exists, set the absolute web path correctly
        save_state="/games/$game_id/save.state"
    fi


    # --- Check if core mapping was found ---
    if [ -z "$core" ]; then
        printf "\033[30;43mWarning: No core mapping found for ROM directory: [$rom_subdir] for game [$game_id].\033[0m\n"
    fi

    # --- Create JSON object ---
    # Use temporary file to avoid "Argument list too long" error
    temp_json_input=$(mktemp)
    cat > "$temp_json_input" << EOF
{
  "id": "$game_id",
  "title": "${title:-$game_id}",
  "developer": "$developer",
  "year": "$year",
  "genre": "$genre",
  "recommended": "$recommended",
  "added": "$added",
  "hide": "$hide",
  "coverArt": "$cover_art_abs",
  "pageUrl": "$page_url",
  "core": "${core:-null}",
  "romPath": "${rom_path:-null}",
  "saveState": "${save_state:-}",
  "disable_score": $disable_score,
  "controls": $controls_json,
  "to_start": "$to_start",
  "new_flag": "$new_flag"
}
EOF

    game_json=$(cat "$temp_json_input" | jq -c '.')
    rm -f "$temp_json_input"

    # --- Check if Featured / Add to List ---
    if [ "$game_id" = "$FEATURED_GAME_ID" ]; then
        # Write featured game to temp file
        echo "$game_json" > "$temp_featured_file"
    else
        # Append game to games array in temp file
        temp_games=$(cat "$temp_games_file")
        # Use temporary file to avoid "Argument list too long" error
        temp_game_input=$(mktemp)
        echo "$game_json" > "$temp_game_input"
        echo "$temp_games" | jq --slurpfile game "$temp_game_input" '. += $game' > "$temp_games_file"
        rm -f "$temp_game_input"
    fi

done

# Complete the progress bar with a newline
echo ""

# Add the SHMUPS entry to the previous games list
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

# Append the SHMUPS entry to the temporary games file
temp_games=$(cat "$temp_games_file")
# Use temporary file to avoid "Argument list too long" error
temp_shmups_input=$(mktemp)
echo "$shmups_json" > "$temp_shmups_input"
echo "$temp_games" | jq --slurpfile shmups "$temp_shmups_input" '. += $shmups' > "$temp_games_file"
rm -f "$temp_shmups_input"

# --- Combine the data from temporary files to create final JSON ---
games_list=$(cat "$temp_games_file")
featured_game=$(cat "$temp_featured_file")

# Use temporary files to avoid "Argument list too long" error
temp_games_input=$(mktemp)
temp_featured_input=$(mktemp)
echo "$games_list" > "$temp_games_input"
echo "$featured_game" > "$temp_featured_input"

if [ "$featured_game" != "null" ]; then
    json_output=$(jq --slurpfile featured "$temp_featured_input" --slurpfile games "$temp_games_input" \
                 '{gameOfTheWeek: $featured[0], previousGames: $games[0]}' < "$temp_json_file")
else
    json_output=$(jq --slurpfile games "$temp_games_input" \
                 '.previousGames = $games[0]' < "$temp_json_file")
fi

rm -f "$temp_games_input" "$temp_featured_input"

# --- Final Check for Featured Game ---
featured_id_check=$(echo "$json_output" | jq -r '.gameOfTheWeek.id')
if [ "$featured_id_check" = "null" ] || [ "$featured_id_check" != "$FEATURED_GAME_ID" ]; then
     echo "Warning: Featured game '$FEATURED_GAME_ID' specified in '$FEATURED_ID_FILE' was not found or processed correctly (missing ROM?)."
fi

# --- Write Output ---
echo "$json_output" | jq '.' > "$OUTPUT_FILE"

# Clean up temporary files
rm -f "$temp_json_file" "$temp_games_file" "$temp_featured_file"

# Generate thumbnails
bash scripts/generate_thumbnails.sh
