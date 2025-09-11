#!/usr/bin/env python3
"""
Helper script to get the current week's game title from predictions.yaml.
This script is used by the generate_gamelist.sh scripts to replace the game-of-the-week file dependency.
"""

import sys
import os
import yaml
from datetime import datetime

def get_current_week_seed():
    """Get the current week's seed in YYYYWW format."""
    now = datetime.now()
    week = now.isocalendar()[1]
    return f"{now.year}{week:02d}"

def get_game_from_seed(seed):
    """Get the game info (title and game_id) that would be selected for a given seed using the predictions.yaml file."""
    try:
        # Read the predictions.yaml file to get the game for this seed
        predictions_path = 'public/plinko/predict/predictions.yaml'
        if not os.path.exists(predictions_path):
            print(f"Error: predictions.yaml not found at {predictions_path}", file=sys.stderr)
            return None
            
        with open(predictions_path, 'r') as f:
            predictions = yaml.safe_load(f)
        
        if not predictions:
            print(f"Error: predictions.yaml is empty or invalid", file=sys.stderr)
            return None
        
        # Look up the game info for this seed
        # YAML parser converts string keys to integers, so we need to convert the seed to int
        try:
            seed_int = int(seed)
            game_info = predictions.get(seed_int)
        except ValueError:
            # If seed is not a valid integer, try as string
            game_info = predictions.get(seed)
        
        if not game_info:
            print(f"Error: No prediction found for seed {seed}", file=sys.stderr)
            return None
        
        # Handle both old format (string) and new format (dict)
        if isinstance(game_info, str):
            # Old format - just return the title
            return {"title": game_info, "game_id": None}
        elif isinstance(game_info, dict):
            # New format - return both title and game_id
            return {"title": game_info.get("title"), "game_id": game_info.get("game_id")}
        else:
            print(f"Error: Invalid game info format for seed {seed}", file=sys.stderr)
            return None
        
    except Exception as e:
        print(f"Error: Could not determine game for seed {seed}: {e}", file=sys.stderr)
        return None

def get_current_week_game_id():
    """Get the current week's game ID."""
    try:
        current_seed = get_current_week_seed()
        game_info = get_game_from_seed(current_seed)
        if not game_info or not game_info.get("game_id"):
            print(f"Error: Could not find game ID for current week (seed: {current_seed})", file=sys.stderr)
            sys.exit(1)
        return game_info["game_id"]
    except Exception as e:
        print(f"Error: Could not determine current game ID: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main function to get the current week's game title."""
    try:
        # Get current week's seed
        current_seed = get_current_week_seed()
        
        # Get the game info for the current seed
        game_info = get_game_from_seed(current_seed)
        if not game_info or not game_info.get("title"):
            print(f"Error: Could not find game prediction for current week (seed: {current_seed})", file=sys.stderr)
            sys.exit(1)
        
        # Output the game title to stdout (for shell script to capture)
        print(game_info["title"])
        
    except Exception as e:
        print(f"Error: Could not determine current game of the week: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
