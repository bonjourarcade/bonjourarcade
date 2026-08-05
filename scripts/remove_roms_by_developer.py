#!/usr/bin/env python3
"""
Remove ROMs by developer name (DMCA protection).

Scans public/games/*/metadata.yaml for matching developers,
then deletes the corresponding ROM files from roms/.

Usage:
    python3 scripts/remove_roms_by_developer.py "Nintendo"
    python3 scripts/remove_roms_by_developer.py "Nintendo" --confirm
    python3 scripts/remove_roms_by_developer.py "Nintendo" --confirm --exact
"""

import argparse
import glob
import os
import sys

import yaml

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES_DIR = os.path.join(PROJECT_ROOT, "public", "games")
ROMS_DIR = os.path.join(PROJECT_ROOT, "roms")


def find_games_by_developer(developer_query, exact=False):
    """Scan metadata.yaml files and return list of (game_id, developer_field) tuples."""
    matches = []
    for game_dir in sorted(os.listdir(GAMES_DIR)):
        metadata_path = os.path.join(GAMES_DIR, game_dir, "metadata.yaml")
        if not os.path.isfile(metadata_path):
            continue

        with open(metadata_path, "r", encoding="utf-8") as f:
            try:
                meta = yaml.safe_load(f)
            except yaml.YAMLError:
                continue

        if not meta or "developer" not in meta:
            continue

        dev_raw = meta["developer"]
        if not dev_raw:
            continue

        dev_str = str(dev_raw).strip()
        if not dev_str:
            continue

        # Split comma-separated developers and check each
        developers = [d.strip() for d in dev_str.split(",")]
        for dev in developers:
            if exact:
                match = dev.lower() == developer_query.lower()
            else:
                match = developer_query.lower() in dev.lower()

            if match:
                matches.append((game_dir, dev_str))
                break

    return matches


def find_rom_file(game_id):
    """Find the ROM file for a given game ID by globbing roms/*/<game_id>.*"""
    pattern = os.path.join(ROMS_DIR, "*", f"{game_id}.*")
    files = glob.glob(pattern)
    # Filter out directories
    return [f for f in files if os.path.isfile(f)]


def main():
    parser = argparse.ArgumentParser(
        description="Remove ROMs by developer name (DMCA protection)."
    )
    parser.add_argument(
        "developer",
        help='Developer name to search for (substring match by default)',
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete files. Without this flag, only shows what would be deleted.",
    )
    parser.add_argument(
        "--exact",
        action="store_true",
        help="Exact match instead of substring match.",
    )
    args = parser.parse_args()

    print(f'Searching for developer: "{args.developer}"')
    print(f"Mode: {'exact' if args.exact else 'substring'} match")
    print(f"Action: {'DELETE' if args.confirm else 'DRY RUN (use --confirm to delete)'}")
    print()

    matches = find_games_by_developer(args.developer, exact=args.exact)

    if not matches:
        print("No games found matching that developer.")
        sys.exit(0)

    print(f'Found {len(matches)} game(s) matching "{args.developer}":')
    print()

    deleted = 0
    skipped = 0

    for game_id, dev_field in sorted(matches):
        rom_files = find_rom_file(game_id)
        if not rom_files:
            print(f"  {game_id} (developer: {dev_field}) -> NO ROM FOUND (skipped)")
            skipped += 1
            continue

        for rom_path in rom_files:
            rel_path = os.path.relpath(rom_path, PROJECT_ROOT)
            if args.confirm:
                os.remove(rom_path)
                print(f"  {game_id} (developer: {dev_field}) -> DELETED {rel_path}")
            else:
                print(f"  {game_id} (developer: {dev_field}) -> WOULD DELETE {rel_path}")
            deleted += 1

    print()
    action = "Deleted" if args.confirm else "Would delete"
    print(f"Summary: {action} {deleted} ROM file(s), skipped {skipped} game(s) with no ROM.")

    if not args.confirm and deleted > 0:
        print()
        print("Re-run with --confirm to actually delete the files.")


if __name__ == "__main__":
    main()
