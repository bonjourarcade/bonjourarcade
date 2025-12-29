import json
import os

def generate_gamelist():
    """
    Scans for JSDOS games in the 'public/dos' folder and generates a
    gamelist.json file in 'public/dos'.
    """
    games = []
    public_dir = 'public'
    dos_dir = os.path.join(public_dir, 'dos')

    if os.path.isdir(dos_dir):
        for filename in sorted(os.listdir(dos_dir)):
            if filename.endswith('.jsdos'):
                # Create a prettier name for the list
                game_name = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
                games.append({
                    'name': game_name,
                    # The path is relative to the public/dos/index.html file
                    'path': filename
                })

    # Ensure the 'public/dos' directory exists
    if not os.path.exists(dos_dir):
        os.makedirs(dos_dir)

    # Write the list of games to gamelist.json
    gamelist_path = os.path.join(dos_dir, 'gamelist.json')
    with open(gamelist_path, 'w') as f:
        json.dump(games, f, indent=4)
    print(f"Successfully generated '{gamelist_path}' with {len(games)} games.")

if __name__ == '__main__':
    # This script assumes it's run from the root of the project.
    generate_gamelist()
