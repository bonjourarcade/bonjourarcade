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
    # Input is the directory name (e.g., "SNES", "MEGADRIVE")
    local dir_name="$1"
    # Recommend using lowercase for matching and output for consistency
    local lower_dir_name=$(echo "$dir_name" | tr '[:upper:]' '[:lower:]')

    case "$lower_dir_name" in
        # --- Your Mappings ---       # --- Likely EmulatorJS Core ID ---
        mame|arcade|fbneo) echo "arcade" ;;    # OK
        atari2600)         echo "a26" ;;       # Changed: 'a26' or 'stella' are common
        gba)               echo "gba" ;;       # OK (or sometimes 'mGBA')
        gameboy)           echo "gambatte" ;;  # Changed: 'gambatte' is common for GB/GBC
        snes|sfc)          echo "snes9x" ;;    # Changed: 'snes9x' is the typical core name
        nes|fc)            echo "nes" ;;       # OK
        n64)               echo "mupen64plus_next" ;; # Changed: This is common for N64
        megadrive|genesis|md) echo "genesis_plus_gx" ;; # Changed: Handles MD/Gen, MS, GG, SegaCD
        psx|ps1)           echo "duckstation" ;; # Changed: 'duckstation' or 'mednafen_psx'
        sms)               echo "genesis_plus_gx" ;; # Changed: Often handled by the Genesis core

        # Add mappings for other systems/cores here
        # Example: wonderswan -> "mednafen_wswan"
        # Example: pcengine -> "mednafen_pce"
        # Example: virtualboy -> "mednafen_vb"

        *)                 echo "" ;; # Return empty if no mapping found
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
    expected_cover_file="${game_dir}cover.png"
    page_url="${LAUNCHER_PAGE}?game=${game_id}"

    echo "Processing Game ID: $game_id"


    # --- Determine Title ---
    # ... (title logic remains the same) ...
    echo "  - Title: $title"

    # --- Determine Cover Art ---
    # ... (cover art logic remains the same) ...
    echo "  - Cover Path: $cover_art_abs"

    # --- Find ROM and Infer Core ---
    core=""          # Initialize core
    rom_path=""      # Initialize rom_path
    found_rom=$(find "$ROMS_DIR" -maxdepth 2 -type f -name "$game_id.*" -print -quit)

    if [ -n "$found_rom" ]; then
        # ROM Found - Proceed as before
        rom_subdir=$(basename "$(dirname "$found_rom")")
        core=$(get_core_from_dir "$rom_subdir")
        rom_path="/$(echo "$found_rom" | sed 's|public/||')" # Web path

        if [ -z "$core" ]; then
             # Keep this warning standard, or color it differently if you like
             echo "Warning: No core mapping found for ROM directory: [$rom_subdir] for game [$game_id]."
        fi
        echo "  - Found ROM: $rom_path"
        echo "  - Inferred Core: $core (from dir: $rom_subdir)"
        # rom_missing remains false
    else
        # ROM IS MISSING - Set flag and print COLORED warning
        rom_missing=true
        # \033[37;41m sets FG White, BG Red. \033[0m resets.
        echo -e "\033[37;41mWarning: No ROM file found matching '$game_id.*' in $ROMS_DIR/*/\033[0m"
        # core and rom_path remain empty
    fi

    # --- Create JSON object (ALWAYS add the game now) ---
    # Note: Using ${core:-null} passes the string "null" if core is empty/unset.
    # Same for rom_path. jq --argjson treats the boolean correctly.
    game_json=$(jq -n \
                  --arg id "$game_id" \
                  --arg title "$title" \
                  --arg coverArt "$cover_art_abs" \
                  --arg pageUrl "$page_url" \
                  --arg core "${core:-null}" \
                  --arg romPath "${rom_path:-null}" \
                  '{id: $id, title: $title, coverArt: $coverArt, pageUrl: $pageUrl, core: $core, romPath: $romPath}')

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
# ... (check remains the same) ...
featured_id_check=$(echo "$json_output" | jq -r '.gameOfTheWeek.id')
if [ "$featured_id_check" == "null" ] || [ "$featured_id_check" != "$FEATURED_GAME_ID" ]; then
     echo "Warning: Featured game '$FEATURED_GAME_ID' specified in '$FEATURED_ID_FILE' was not found or processed correctly (missing ROM/core?)."
fi

# --- Write Output ---
echo "Writing final JSON to $OUTPUT_FILE"
echo "$json_output" | jq '.' > "$OUTPUT_FILE"

echo "Script finished successfully."
