#!/usr/bin/env python3
"""
Helper script to get the current week's game ID from predictions.yaml.
This script is used by the generate_gamelist.sh scripts to replace the game-of-the-week file dependency.
"""

import sys
import os
import yaml
from datetime import datetime
import json
import re

def get_current_week_seed():
    """Get the current week's seed in YYYYWW format."""
    now = datetime.now()
    week = now.isocalendar()[1]
    return f"{now.year}{week:02d}"

def get_game_from_seed(seed):
    """Get the game title that would be selected for a given seed using the predictions.yaml file."""
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
        
        # Look up the game title for this seed
        # YAML parser converts string keys to integers, so we need to convert the seed to int
        try:
            seed_int = int(seed)
            game_title = predictions.get(seed_int)
        except ValueError:
            # If seed is not a valid integer, try as string
            game_title = predictions.get(seed)
        
        if not game_title:
            print(f"Error: No prediction found for seed {seed}", file=sys.stderr)
            return None
        
        return game_title
        
    except Exception as e:
        print(f"Error: Could not determine game for seed {seed}: {e}", file=sys.stderr)
        return None

def find_game_id_by_title(game_title):
    """Find a game ID in the games directory that matches the given title."""
    try:
        games_dir = 'public/games'
        if not os.path.exists(games_dir):
            print(f"Error: games directory not found at {games_dir}", file=sys.stderr)
            return None
        
        # Search through all game directories for a title match
        for game_dir in os.listdir(games_dir):
            game_path = os.path.join(games_dir, game_dir)
            if not os.path.isdir(game_path):
                continue
                
            metadata_file = os.path.join(game_path, 'metadata.yaml')
            if not os.path.exists(metadata_file):
                continue
            
            try:
                with open(metadata_file, 'r') as f:
                    metadata = yaml.safe_load(f)
                
                if metadata and metadata.get('title') == game_title:
                    return game_dir
                    
            except Exception as e:
                # Skip files that can't be parsed
                continue
        
        # If no exact match found, try case-insensitive match
        for game_dir in os.listdir(games_dir):
            game_path = os.path.join(games_dir, game_dir)
            if not os.path.isdir(game_path):
                continue
                
            metadata_file = os.path.join(game_path, 'metadata.yaml')
            if not os.path.exists(metadata_file):
                continue
            
            try:
                with open(metadata_file, 'r') as f:
                    metadata = yaml.safe_load(f)
                
                if metadata and metadata.get('title', '').lower() == game_title.lower():
                    return game_dir
                    
            except Exception as e:
                # Skip files that can't be parsed
                continue
        
        # If still no match, try more precise partial matching
        # Only match if the search title is a significant part of the game title
        for game_dir in os.listdir(games_dir):
            game_path = os.path.join(games_dir, game_dir)
            if not os.path.isdir(game_path):
                continue
                
            metadata_file = os.path.join(game_path, 'metadata.yaml')
            if not os.path.exists(metadata_file):
                continue
            
            try:
                with open(metadata_file, 'r') as f:
                    metadata = yaml.safe_load(f)
                
                if metadata and metadata.get('title'):
                    game_title_lower = metadata['title'].lower()
                    search_title_lower = game_title.lower()
                    
                    # Only consider it a match if the search title contains significant words
                    # or if the game title contains the search title as a major component
                    search_words = search_title_lower.split()
                    if len(search_words) >= 2:
                        # For multi-word titles, require at least 2 words to match
                        matching_words = sum(1 for word in search_words if word in game_title_lower)
                        if matching_words >= 2:
                            print(f"Warning: Found partial match: '{metadata['title']}' for '{game_title}'", file=sys.stderr)
                            return game_dir
                    elif search_title_lower in game_title_lower and len(search_title_lower) > 3:
                        # For single words, require them to be substantial (>3 chars) and contained in game title
                        print(f"Warning: Found partial match: '{metadata['title']}' for '{game_title}'", file=sys.stderr)
                        return game_dir
                    
            except Exception as e:
                # Skip files that can't be parsed
                continue
        
        print(f"Error: No game found with title: {game_title}", file=sys.stderr)
        return None
        
    except Exception as e:
        print(f"Error: Error searching for game title: {e}", file=sys.stderr)
        return None

def main():
    """Main function to get the current week's game ID."""
    try:
        # Get current week's seed
        current_seed = get_current_week_seed()
        
        # Get the game title for the current seed
        game_title = get_game_from_seed(current_seed)
        if not game_title:
            print(f"Error: Could not find game prediction for current week (seed: {current_seed})", file=sys.stderr)
            sys.exit(1)
        
        # Find the corresponding game ID in the gamelist
        game_id = find_game_id_by_title(game_title)
        if not game_id:
            print(f"Error: Could not find game ID for title: {game_title}", file=sys.stderr)
            sys.exit(1)
        
        # Output the game ID to stdout (for shell script to capture)
        print(game_id)
        
    except Exception as e:
        print(f"Error: Could not determine current game of the week: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
