#!/usr/bin/env python3
"""
Generates a JSON file with the list of upcoming games.
"""

import sys
import os
import yaml
import json
from datetime import datetime, timedelta

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

def _get_date_from_period(period_number):
    """Calculates the start date of a given period number."""
    year = period_number // 24
    period_in_year = period_number % 24
    month = (period_in_year // 2) + 1
    day = 15 if (period_in_year % 2) == 1 else 1
    return datetime(year, month, day)

def get_upcoming_games():
    """Get a list of upcoming games with their scheduled dates."""
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

        games = get_upcoming_games_list()
        if not games:
            sys.exit(1)

        start_period = _get_period_number(start_date)
        current_period = _get_period_number(now)
        
        period_diff = current_period - start_period
        
        upcoming_games = []
        # Show the next 20 upcoming games
        for i in range(1, 21):
            future_period = current_period + i
            game_index = (period_diff + i) % len(games)
            game_id = games[game_index]
            game_date = _get_date_from_period(future_period)
            
            upcoming_games.append({
                "game_id": game_id,
                "date": game_date.strftime("%Y-%m-%d")
            })

        return upcoming_games

    except Exception as e:
        print(f"Error: Could not determine upcoming games: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main function to generate and write the upcoming games JSON file."""
    try:
        upcoming_games = get_upcoming_games()
        
        output_path = 'public/api/upcoming-games.json'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(upcoming_games, f, indent=2)
            
        print(f"✅ Successfully generated upcoming games list to {output_path}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
