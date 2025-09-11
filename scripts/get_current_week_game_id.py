#!/usr/bin/env python3
"""
Helper script to get the current week's game ID from predictions.yaml.
This script is used by the generate_gamelist.sh scripts to get the game ID directly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from get_current_week_game import get_current_week_game_id

if __name__ == '__main__':
    try:
        game_id = get_current_week_game_id()
        print(game_id)
    except Exception as e:
        print(f"Error: Could not determine current game ID: {e}", file=sys.stderr)
        sys.exit(1)
