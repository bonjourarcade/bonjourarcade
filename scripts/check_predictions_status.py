#!/usr/bin/env python3
"""
Helper script to check if a game is in predictions.yaml and determine its status.
This script is used by the generate_gamelist scripts to override hide settings for prediction games.
"""

import sys
import os
import yaml
from datetime import datetime, timedelta

def get_current_week_seed():
    """Get the current week's seed in YYYYWW format."""
    now = datetime.now()
    week = now.isocalendar()[1]
    return f"{now.year}{week:02d}"

def seed_to_date(seed):
    """Convert a seed (YYYYWW format) to the corresponding Monday date."""
    try:
        year = int(str(seed)[:4])
        week = int(str(seed)[4:])
        
        # Get the first day of the year
        jan1 = datetime(year, 1, 1)
        
        # Find the first Monday of the year
        while jan1.weekday() != 0:  # 0 = Monday
            jan1 += timedelta(days=1)
        
        # Add weeks to get to the target week
        target_date = jan1 + timedelta(weeks=week-1)
        
        return target_date.strftime("%Y-%m-%d")
        
    except Exception as e:
        print(f"Error: Could not convert seed {seed} to date: {e}", file=sys.stderr)
        return None

def is_game_in_predictions(game_title):
    """Check if a game title exists in predictions.yaml and return its status."""
    try:
        # Read the predictions.yaml file
        predictions_path = 'public/plinko/predict/predictions.yaml'
        if not os.path.exists(predictions_path):
            return None
            
        with open(predictions_path, 'r') as f:
            predictions = yaml.safe_load(f)
        
        if not predictions:
            return None
        
        # Look for the game title in predictions
        for seed, title in predictions.items():
            if title == game_title:
                return {
                    'seed': seed,
                    'title': title,
                    'is_current_week': False,
                    'is_past_week': False
                }
        
        return None
        
    except Exception as e:
        print(f"Error: Could not read predictions.yaml: {e}", file=sys.stderr)
        return None

def check_week_status(seed):
    """Check if a seed represents a current or past week."""
    try:
        # Parse the seed (YYYYWW format)
        year = int(str(seed)[:4])
        week = int(str(seed)[4:])
        
        # Get current week
        now = datetime.now()
        current_year = now.year
        current_week = now.isocalendar()[1]
        
        # Convert to comparable values
        seed_value = year * 100 + week
        current_value = current_year * 100 + current_week
        
        if seed_value == current_value:
            return 'current'
        elif seed_value < current_value:
            return 'past'
        else:
            return 'future'
            
    except Exception as e:
        print(f"Error: Could not parse seed {seed}: {e}", file=sys.stderr)
        return 'unknown'

def main():
    """Main function to check game prediction status."""
    if len(sys.argv) != 2:
        print("Usage: python3 check_predictions_status.py <game_title>", file=sys.stderr)
        sys.exit(1)
    
    game_title = sys.argv[1]
    
    try:
        # Check if game is in predictions
        prediction_info = is_game_in_predictions(game_title)
        
        if prediction_info is None:
            # Game not in predictions
            print("NOT_IN_PREDICTIONS")
            sys.exit(0)
        
        # Check week status
        week_status = check_week_status(prediction_info['seed'])
        prediction_info['week_status'] = week_status
        
        if week_status == 'current':
            prediction_info['is_current_week'] = True
            prediction_info['is_past_week'] = False
        elif week_status == 'past':
            prediction_info['is_current_week'] = False
            prediction_info['is_past_week'] = True
        else:
            prediction_info['is_current_week'] = False
            prediction_info['is_past_week'] = False
        
        # Get the date corresponding to the prediction week
        prediction_date = seed_to_date(prediction_info['seed'])
        
        # Output result as JSON-like format for shell script parsing
        if prediction_info['is_current_week'] or prediction_info['is_past_week']:
            print(f"SHOW_GAME|{prediction_date}")
        else:
            print("HIDE_GAME")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
