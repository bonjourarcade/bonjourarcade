import os
import glob
from PIL import Image

try:
    from tqdm import tqdm
    use_tqdm = True
except ImportError:
    use_tqdm = False

MAX_SIZE = 1 * 1024 * 1024  # 1MB in bytes
TARGET_WIDTH = 800  # fallback width for resizing if needed


def shrink_png(filepath):
    """Shrink PNG file to be under 1MB, overwriting the original."""
    orig_size = os.path.getsize(filepath)
    if orig_size <= MAX_SIZE:
        print(f"OK: {filepath} is already under 1MB ({orig_size // 1024} KB)")
        return

    print(f"Shrinking: {filepath} ({orig_size // 1024} KB)")
    with Image.open(filepath) as img:
        # Try saving with optimization first
        img.save(filepath, optimize=True)
        new_size = os.path.getsize(filepath)
        if new_size <= MAX_SIZE:
            print(f"  -> Optimized to {new_size // 1024} KB")
            return
        # If still too big, resize down until under 1MB
        width, height = img.size
        while new_size > MAX_SIZE and width > 100:
            width = int(width * 0.9)
            height = int(height * 0.9)
            img_resized = img.resize((width, height), Image.LANCZOS)
            img_resized.save(filepath, optimize=True)
            new_size = os.path.getsize(filepath)
            print(f"  -> Resized to {width}x{height}, {new_size // 1024} KB")
            img = img_resized
        if new_size > MAX_SIZE:
            print(f"  !! Could not shrink {filepath} below 1MB (final size: {new_size // 1024} KB)")
        else:
            print(f"  -> Final size: {new_size // 1024} KB")

def main():
    png_files = glob.glob("public/games/*/cover.png")
    if not png_files:
        print("No PNG files found.")
        return
    iterator = tqdm(png_files, desc="Processing PNGs") if use_tqdm else png_files
    for filepath in iterator:
        shrink_png(filepath)

if __name__ == "__main__":
    main() 