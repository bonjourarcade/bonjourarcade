#!/usr/bin/env python3
"""
Generates a JSON file with the list of all previous games of the week.
"""

import sys
import os
import yaml
import json
from datetime import datetime

def get_rotation_config():
    """Get the rotation configuration from bonjourarcade.yaml."""
    config_path = 'public/config/bonjourarcade.yaml'
    if not os.path.exists(config_path):
        print(f"Error: Configuration file not found at {config_path}", file=sys.stderr)
        return None
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config.get('rotation_settings')

def get_upcoming_games_list():
    """Get the list of upcoming games from upcoming.yaml."""
    games_path = 'public/upcoming/upcoming.yaml'
    if not os.path.exists(games_path):
        print(f"Error: upcoming.yaml not found at {games_path}", file=sys.stderr)
        return None
        
    with open(games_path, 'r') as f:
        games = yaml.safe_load(f)
    
    if not games or not isinstance(games, list):
        print(f"Error: upcoming.yaml is empty or not a list", file=sys.stderr)
        return None
    
    return games

def _get_period_number(date):
    """Calculates a period number for a given date (24 periods per year)."""
    year_part = (date.year) * 24
    month_part = (date.month - 1) * 2
    day_part = 1 if date.day >= 15 else 0
    return year_part + month_part + day_part

def get_all_previous_games():
    """Get a list of all previous game IDs in chronological order."""
    try:
        config = get_rotation_config()
        if not config:
            return []

        start_date_str = config.get('start_date')
        if not start_date_str:
            return []

        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        now = datetime.now()

        if now < start_date:
            return []

        games = get_upcoming_games_list()
        if not games:
            return []

        start_period = _get_period_number(start_date)
        current_period = _get_period_number(now)
        
        period_diff = current_period - start_period
        if period_diff <= 0:
            return []

        previous_games = []
        for i in range(period_diff):
            game_index = i % len(games)
            previous_games.append(games[game_index])
        
        # Return in reverse chronological order (most recent first)
        return previous_games[::-1]

    except Exception as e:
        print(f"Error: Could not determine previous games: {e}", file=sys.stderr)
        return []

import argparse

def main():
    """Main function to generate and write the history JSON file."""
    parser = argparse.ArgumentParser(description='Generate a JSON file with the list of all previous games of the week.')
    parser.add_argument('--output', default='public/api/previous-games.json', help='Output file path')
    args = parser.parse_args()

    try:
        previous_games = get_all_previous_games()
        
        output_path = args.output
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(previous_games, f)
            
        print(f"✅ Successfully generated history list to {output_path}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
