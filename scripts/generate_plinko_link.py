#!/usr/bin/env python3
"""
Plinko Link Generator for BonjourArcade

This script generates a plinko link with the current week's seed.
The seed format is YYYYWW (year + week number).

Usage:
    python generate_plinko_link.py [--week WEEK] [--year YEAR]
"""

import argparse
import os
import sys
from datetime import datetime, timedelta
import subprocess
import webbrowser

def get_iso_week(date):
    """Get ISO week number for a given date."""
    return date.isocalendar()[1]

def generate_seed(year=None, week=None):
    """Generate seed based on year and week."""
    if year is None or week is None:
        # Use current date
        now = datetime.now()
        year = now.year
        week = get_iso_week(now)
    
    return f"{year}{week:02d}"

def generate_plinko_url(seed, base_url="https://bonjourarcade.com"):
    """Generate the full plinko URL with seed."""
    return f"{base_url}/plinko/?seed={seed}"

def open_url(url):
    """Open URL in default browser."""
    try:
        webbrowser.open(url)
        print(f"✅ Opened: {url}")
    except Exception as e:
        print(f"❌ Error opening URL: {e}")
        print(f"Please open manually: {url}")

def main():
    parser = argparse.ArgumentParser(description='Generate Plinko Link')
    parser.add_argument('--week', type=int, help='Week number (1-53)')
    parser.add_argument('--year', type=int, help='Year (e.g., 2025)')
    parser.add_argument('--base-url', default='https://bonjourarcade.com',
                       help='Base URL for the plinko page')
    parser.add_argument('--no-open', action='store_true',
                       help='Don\'t open the URL automatically')
    
    args = parser.parse_args()
    
    # Generate seed
    seed = generate_seed(args.year, args.week)
    
    # Generate URL
    url = generate_plinko_url(seed, args.base_url)
    
    # Display information
    year = args.year or datetime.now().year
    week = args.week or get_iso_week(datetime.now())
    
    print(f"🎲 Plinko Link Generator")
    print(f"📅 Year: {year}")
    print(f"📅 Week: {week}")
    print(f"🔢 Seed: {seed}")
    print(f"🔗 URL: {url}")
    print()
    
    # Open URL if requested
    if not args.no_open:
        open_url(url)
    else:
        print("💡 To open the URL manually, copy and paste it into your browser.")
    
    return url

if __name__ == '__main__':
    main() 