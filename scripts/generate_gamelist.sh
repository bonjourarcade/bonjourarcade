#!/bin/bash
set -e

# --- Configuration ---
GAMES_DIR="public/games"
ROMS_DIR="public/roms"
OUTPUT_FILE="public/gamelist.json"
FEATURED_ID_FILE="game-of-the-week"
DEFAULT_COVER="assets/images/placeholder_thumb.png" # Relative to public root
LAUNCHER_PAGE="/play.html"

# --- Core Mapping (Directory name -> EJS_core name) ---
get_core_from_dir() {
    case "$1" in
        mame|arcade|fbneo) echo "arcade" ;; # Map mame, arcade, fbneo folders to 'arcade' core
        ATARI2600) echo "atari2600" ;;
        GBA)      echo "gba" ;;
        GAMEBOY)      echo "gb" ;;
        SNES) echo "snes" ;; # Map snes, sfc folders to 'snes9x' core
        NES)   echo "nes" ;;    # Map nes, fc folders to 'nes' core
        N64)   echo "n64" ;;
        MEGADRIVE) echo "segaMD" ;;
        PSX) echo "psx" ;;
        SMS) echo "segaMS" ;;
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
echo "Featured game ID: $FEATURED_GAME_ID"

# --- Initialize JSON Output ---
json_output=$(jq -n --arg default_cover "/$DEFAULT_COVER" \
                '{gameOfTheWeek: {id: null, title: "N/A", coverArt: $default_cover, pageUrl: "#", core: null, romPath: null}, previousGames: []}')

# --- Scan Game Directories (in public/games/) ---
echo "Scanning $GAMES_DIR for game metadata..."
shopt -s nullglob
for game_dir in "$GAMES_DIR"/*/; do
    game_id=$(basename "$game_dir")
    metadata_file="${game_dir}metadata.yaml"
    expected_cover_file="${game_dir}cover.png" # Path based on convention
    page_url="${LAUNCHER_PAGE}?game=${game_id}"

    echo "Processing Game ID: $game_id"

    # --- Determine Title: Default to game_id, override if metadata has valid title --- # <<< --- START MISSING BLOCK 1 ---
    title="$game_id" # DEFAULT title is the game ID (folder name)
    developer=""
    year=""
    system=""
    genre=""
    echo "  - Default Title: $title"

    if [ -f "$metadata_file" ]; then
        # Try to parse YAML and extract title (default to empty string if key missing)
        metadata_json=$(yq '.' "$metadata_file" 2>/dev/null || echo "INVALID_YAML")
        if [ "$metadata_json" != "INVALID_YAML" ] && echo "$metadata_json" | jq -e . > /dev/null 2>&1; then
            title=$(echo "$metadata_json" | jq -r '.title // ""')
            developer=$(echo "$metadata_json" | jq -r '.developer // ""')
            year=$(echo "$metadata_json" | jq -r '.year // ""')
            system=$(echo "$metadata_json" | jq -r '.system // ""')
            genre=$(echo "$metadata_json" | jq -r '.genre // ""')
        else
            echo "  - metadata.yaml found but failed to parse. Using default title ($game_id)."
        fi
    else
        echo "  - No metadata.yaml found. Using default title ($game_id)."
    fi
    # 'title' variable now holds the final title to use
                                                                                       # <<< --- END MISSING BLOCK 1 ---
    # --- Determine Cover Art ---                                                      # <<< --- START MISSING BLOCK 2 ---
    cover_art_abs="/$DEFAULT_COVER" # Start with default path
    if [ -f "$expected_cover_file" ]; then
        # If cover.png exists, set the absolute web path correctly
        cover_art_abs="/games/$game_id/cover.png" # Use convention path
    else
        # If cover.png missing, log warning and keep the default path
        echo "Warning: Expected cover file not found: [$expected_cover_file]. Using default."
    fi
    echo "  - Cover Path: $cover_art_abs" # This now uses the correctly determined path
                                                                                       # <<< --- END MISSING BLOCK 2 ---
    # --- Find ROM and Infer Core ---
    core=""
    rom_path=""
    rom_missing=false
    found_rom=$(find "$ROMS_DIR" -maxdepth 2 -type f -name "$game_id.*" -print -quit)

    if [ -n "$found_rom" ]; then
        rom_subdir=$(basename "$(dirname "$found_rom")")
        core=$(get_core_from_dir "$rom_subdir")
        rom_path="/$(echo "$found_rom" | sed 's|public/||')" # Web path

        if [ -z "$core" ]; then
             echo "Warning: No core mapping found for ROM directory: [$rom_subdir] for game [$game_id]."
        fi
        echo "  - Found ROM: $rom_path"
        echo "  - Inferred Core: $core (from dir: $rom_subdir)"
    else
        rom_missing=true
        echo -e "\033[37;41mWarning: No ROM file found matching '$game_id.*' in $ROMS_DIR/*/\033[0m"
    fi

    # --- Create JSON object ---
    game_json=$(jq -n \
                  --arg id "$game_id" \
                  --arg title "$title" \
                  --arg developer "$developer" \
                  --arg year "$year" \
                  --arg system "$system" \
                  --arg genre "$genre" \
                  --arg coverArt "$cover_art_abs" \
                  --arg pageUrl "$page_url" \
                  --arg core "${core:-null}" \
                  --arg romPath "${rom_path:-null}" \
                  '{id: $id, title: $title, developer: $developer, year: $year, system: $system, genre: $genre, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath}')

    # --- Check if Featured / Add to List ---
    if [ "$game_id" == "$FEATURED_GAME_ID" ]; then
        echo "  -> Matched as Featured Game"
        featured_game_json="$game_json"
        json_output=$(echo "$json_output" | jq --argjson featured "$featured_game_json" '.gameOfTheWeek = $featured')
    else
        json_output=$(echo "$json_output" | jq --argjson game "$game_json" '.previousGames += [$game]')
    fi
done
shopt -u nullglob

# --- Final Check for Featured Game ---
featured_id_check=$(echo "$json_output" | jq -r '.gameOfTheWeek.id')
if [ "$featured_id_check" == "null" ] || [ "$featured_id_check" != "$FEATURED_GAME_ID" ]; then
     echo "Warning: Featured game '$FEATURED_GAME_ID' specified in '$FEATURED_ID_FILE' was not found or processed correctly (missing ROM/core?)."
fi

# --- Write Output ---
echo "Writing final JSON to $OUTPUT_FILE"
echo "$json_output" | jq '.' > "$OUTPUT_FILE"

echo "Script finished successfully."
