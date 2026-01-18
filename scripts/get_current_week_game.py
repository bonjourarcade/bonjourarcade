#!/usr/bin/env python3
"""
Helper script to get the current game or all previous games from upcoming.yaml 
based on a schedule of 1st and 15th of each month.
"""

import sys
import os
import yaml
import json
import argparse
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

def get_upcoming_games():
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

def get_current_game_id():
    """Get the current game ID based on the 1st/15th of the month rotation schedule."""
    try:
        config = get_rotation_config()
        if not config:
            sys.exit(1)

        start_date_str = config.get('start_date')
        if not start_date_str:
            print(f"Error: start_date not configured in bonjourarcade.yaml.", file=sys.stderr)
            sys.exit(1)

        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        now = datetime.now()
        
        if now < start_date:
            # If the start date is in the future, there's no current game yet.
            # Return a special value or handle as an error. For now, exit.
            print(f"Error: The start date is in the future. No current game.", file=sys.stderr)
            sys.exit(1)

        games = get_upcoming_games()
        if not games:
            sys.exit(1)

        start_period = _get_period_number(start_date)
        current_period = _get_period_number(now)
        
        period_diff = current_period - start_period
        game_index = period_diff % len(games)
        
        return games[game_index]

    except Exception as e:
        print(f"Error: Could not determine current game ID: {e}", file=sys.stderr)
        sys.exit(1)

def get_previous_game_id():
    """Get the previous game ID based on the 1st/15th of the month rotation schedule."""
    try:
        config = get_rotation_config()
        if not config:
            return None

        start_date_str = config.get('start_date')
        if not start_date_str:
            return None

        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        now = datetime.now()

        if now < start_date:
            return None

        games = get_upcoming_games()
        if not games:
            return None

        start_period = _get_period_number(start_date)
        current_period = _get_period_number(now)

        if current_period <= start_period:
            # No previous game if we are in the first rotation period or before
            return None
        
        previous_period_diff = current_period - start_period - 1
        game_index = previous_period_diff % len(games)
        
        return games[game_index]

    except Exception as e:
        print(f"Error: Could not determine previous game ID: {e}", file=sys.stderr)
        return None

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

        games = get_upcoming_games()
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

def main():
    """Main function to get the current game ID or list of previous games."""
    parser = argparse.ArgumentParser(description='Get current or previous games.')
    parser.add_argument('--previous-games', action='store_true', help='List all previous games as JSON.')
    args = parser.parse_args()

    try:
        if args.previous_games:
            previous_games = get_all_previous_games()
            print(json.dumps(previous_games))
        else:
            game_id = get_current_game_id()
            if not game_id:
                print(f"Error: Could not find game for the current period.", file=sys.stderr)
                sys.exit(1)
            print(game_id)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

