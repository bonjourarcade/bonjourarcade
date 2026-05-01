#!/usr/bin/env python3
"""
Script to validate that all games in upcoming.yaml have the metadata fields required by
send_newsletter.py.
"""

import os
import sys
import json
import yaml
from pathlib import Path
from newsletter_metadata import NEWSLETTER_REQUIRED_FIELDS

def get_game_ids_from_predictions(predictions_path):
    """
    Extract all game_id values from upcoming.yaml.
    Supports two formats:
    - Plain list: [game_id1, game_id2, ...]
    - Dict: {seed: {game_id: ...}, ...}
    Returns list of (seed, game_id) tuples.
    """
    try:
        with open(predictions_path, 'r') as f:
            predictions = yaml.safe_load(f)

        if predictions is None:
            return []

        game_ids = []

        # New format: plain list of game ID strings
        if isinstance(predictions, list):
            for i, game_id in enumerate(predictions):
                if game_id:
                    game_ids.append((f"entry_{i}", str(game_id)))
            return game_ids

        # Legacy format: dict with seed keys
        if isinstance(predictions, dict):
            for seed, game_data in predictions.items():
                if isinstance(game_data, dict):
                    game_id = game_data.get('game_id')
                    if game_id:
                        game_ids.append((seed, game_id))
                # Old format entries (just strings) are skipped
            return game_ids

        print(f"Error: upcoming.yaml has unexpected format ({type(predictions).__name__})", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(f"Error reading upcoming.yaml: {e}", file=sys.stderr)
        sys.exit(1)


def get_game_title_from_gamelist(game_id, gamelist_path):
    """
    Get the game title from gamelist.json using the game_id.
    Returns the title if found, otherwise returns 'Unknown'.
    """
    try:
        if not os.path.exists(gamelist_path):
            return 'Unknown'
        
        with open(gamelist_path, 'r') as f:
            gamelist = json.load(f)
        
        # Convert game_id to string for comparison
        game_id_str = str(game_id)
        
        # Search through all games for a game_id match
        all_games = []
        # Add games from the main games array
        if gamelist.get('games'):
            all_games.extend(gamelist['games'])
        # Add game of the week if it exists
        if gamelist.get('gameOfTheWeek') and gamelist['gameOfTheWeek'].get('id'):
            all_games.append(gamelist['gameOfTheWeek'])
        # Add previous games if they exist
        if gamelist.get('previousGames'):
            all_games.extend(gamelist['previousGames'])
        
        # Find the game with matching id
        for game in all_games:
            if str(game.get('id')) == game_id_str:
                title = game.get('title')
                if title:
                    return title
        
        return 'Unknown'
        
    except Exception as e:
        print(f"Warning: Error looking up game title for id {game_id}: {e}", file=sys.stderr)
        return 'Unknown'

def validate_game_metadata(game_id, game_metadata_path, required_fields):
    """
    Validate that a game's metadata.yaml has all required fields.
    Returns (is_valid, missing_fields, errors)
    """
    if not os.path.exists(game_metadata_path):
        return False, required_fields.copy(), [f"Metadata file does not exist: {game_metadata_path}"]
    
    try:
        with open(game_metadata_path, 'r') as f:
            game_metadata = yaml.safe_load(f)
        
        if game_metadata is None:
            return False, required_fields.copy(), ["Metadata file is empty or invalid YAML"]
        
        missing_fields = []
        errors = []
        
        # Check each required field
        for field in required_fields:
            if field not in game_metadata:
                missing_fields.append(field)
                errors.append(f"Missing field: {field}")
            else:
                # Check if the field value is empty
                value = game_metadata[field]
                is_empty = False
                
                if value is None:
                    is_empty = True
                elif isinstance(value, str):
                    # Check for empty string or whitespace-only string
                    if value == '' or value.strip() == '':
                        is_empty = True
                elif isinstance(value, (list, dict)):
                    # Check for empty list or dict
                    if len(value) == 0:
                        is_empty = True
                # For other types (int, bool, etc.), consider them as filled
                
                if is_empty:
                    missing_fields.append(field)
                    errors.append(f"Field '{field}' exists but is empty")
        
        is_valid = len(missing_fields) == 0
        return is_valid, missing_fields, errors
        
    except yaml.YAMLError as e:
        return False, required_fields.copy(), [f"YAML parsing error: {e}"]
    except Exception as e:
        return False, required_fields.copy(), [f"Error reading metadata file: {e}"]

def main():
    """Main validation function."""
    # Get project root (assuming script is in scripts/ directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    predictions_path = project_root / 'public' / 'upcoming' / 'upcoming.yaml'
    gamelist_path = project_root / 'public' / 'gamelist.json'
    games_dir = project_root / 'public' / 'games'
    
    # Check that required files exist
    if not predictions_path.exists():
        print(f"Error: upcoming.yaml not found at {predictions_path}", file=sys.stderr)
        sys.exit(1)
    
    if not gamelist_path.exists():
        print(f"Warning: gamelist.json not found at {gamelist_path}, titles will be 'Unknown'", file=sys.stderr)
    
    required_fields = set(NEWSLETTER_REQUIRED_FIELDS)
    print("Validating the metadata fields required by send_newsletter.py")
    print(f"Validating {len(required_fields)} required fields: {', '.join(sorted(required_fields))}")
    print()
    
    # Get all game IDs from predictions
    game_entries = get_game_ids_from_predictions(predictions_path)
    print(f"Found {len(game_entries)} games in upcoming.yaml")
    print()
    
    # Validate each game's metadata
    invalid_games = []
    valid_count = 0
    
    for seed, game_id in game_entries:
        # Convert game_id to string in case it's an integer (e.g., 1943)
        game_id_str = str(game_id)
        # Get title from gamelist.json
        title = get_game_title_from_gamelist(game_id_str, gamelist_path)
        game_metadata_path = games_dir / game_id_str / 'metadata.yaml'
        is_valid, missing_fields, errors = validate_game_metadata(
            game_id_str, game_metadata_path, required_fields
        )
        
        if is_valid:
            valid_count += 1
            print(f"✓ {game_id_str} ({title}) - Valid")
        else:
            invalid_games.append({
                'seed': seed,
                'game_id': game_id_str,
                'title': title,
                'missing_fields': missing_fields,
                'errors': errors,
                'path': game_metadata_path
            })
            print(f"✗ {game_id_str} ({title}) - Invalid")
            for error in errors:
                print(f"    {error}")
    
    print()
    print("=" * 60)
    print(f"Summary:")
    print(f"  Total games: {len(game_entries)}")
    print(f"  Valid: {valid_count}")
    print(f"  Invalid: {len(invalid_games)}")
    
    if invalid_games:
        print()
        print("Invalid games:")
        for game in invalid_games:
            print(f"  - {game['game_id']} ({game['title']})")
            print(f"    Missing fields: {', '.join(game['missing_fields'])}")
            print(f"    Path: {game['path']}")
        sys.exit(1)
    else:
        print()
        print("All games have complete metadata! ✓")
        sys.exit(0)

if __name__ == '__main__':
    main()
