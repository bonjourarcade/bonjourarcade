
import os
import yaml

GAMELIST_PATH = "public/plinko/gamelist.txt"
GAMES_DIR = "public/games"

def load_gamelist():
    games = []
    with open(GAMELIST_PATH, "r") as f:
        for line in f:
            # Remove comments and strip
            cleaned = line.split("#")[0].strip()
            if cleaned:
                games.append(cleaned)
    return games

def load_supported_games():
    supported = set()
    if not os.path.exists(GAMES_DIR):
        print(f"Error: {GAMES_DIR} not found")
        return supported

    for entry in os.listdir(GAMES_DIR):
        path = os.path.join(GAMES_DIR, entry)
        if os.path.isdir(path):
            meta_path = os.path.join(path, "metadata.yaml")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r") as f:
                        data = yaml.safe_load(f)
                        if data and "title" in data:
                            title = str(data["title"]).strip()
                            supported.add(title)
                except Exception as e:
                    print(f"Error reading {meta_path}: {e}")
    return supported

def main():
    print("Analyzing games...")
    gamelist = load_gamelist()
    supported = load_supported_games()
    
    print(f"Found {len(gamelist)} games in list.")
    print(f"Found {len(supported)} supported games in {GAMES_DIR}.")
    
    unsupported = []
    for game in gamelist:
        if game not in supported:
            unsupported.append(game)
            
    print(f"\nUnsupported games ({len(unsupported)}):")
    for game in unsupported:
        print(f"- {game}")

if __name__ == "__main__":
    main()
