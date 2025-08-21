import os
import glob
import multiprocessing as mp
from PIL import Image

try:
    from tqdm import tqdm
    use_tqdm = True
except ImportError:
    use_tqdm = False

MAX_SIZE = 100 * 1024  # 100KB in bytes (matching your original script)
TARGET_WIDTH = 800  # fallback width for resizing if needed


def shrink_png(filepath):
    """Shrink PNG file to be under MAX_SIZE, overwriting the original."""
    try:
        orig_size = os.path.getsize(filepath)
        if orig_size <= MAX_SIZE:
            return f"OK: {filepath} is already under {MAX_SIZE // 1024}KB ({orig_size // 1024} KB)"

        result_msg = f"Shrinking: {filepath} ({orig_size // 1024} KB)"
        
        with Image.open(filepath) as img:
            # Try saving with optimization first
            img.save(filepath, optimize=True)
            new_size = os.path.getsize(filepath)
            if new_size <= MAX_SIZE:
                result_msg += f" -> Optimized to {new_size // 1024} KB"
                return result_msg
            
            # If still too big, resize down until under MAX_SIZE
            width, height = img.size
            while new_size > MAX_SIZE and width > 100:
                width = int(width * 0.9)
                height = int(height * 0.9)
                img_resized = img.resize((width, height), Image.LANCZOS)
                img_resized.save(filepath, optimize=True)
                new_size = os.path.getsize(filepath)
                result_msg += f" -> Resized to {width}x{height}, {new_size // 1024} KB"
                img = img_resized
            
            if new_size > MAX_SIZE:
                result_msg += f" !! Could not shrink below {MAX_SIZE // 1024}KB (final size: {new_size // 1024} KB)"
            else:
                result_msg += f" -> Final size: {new_size // 1024} KB"
        
        return result_msg
    
    except Exception as e:
        return f"ERROR processing {filepath}: {str(e)}"


def main():
    png_files = glob.glob("public/games/*/cover.png")
    if not png_files:
        print("No PNG files found.")
        return
    
    print(f"Found {len(png_files)} PNG files to process")
    
    # Determine optimal number of processes
    # Use fewer processes than CPU cores to avoid overwhelming the system
    num_processes = max(1, min(mp.cpu_count() - 1, len(png_files)))
    print(f"Using {num_processes} processes for parallel processing")
    
    # Process files in parallel
    with mp.Pool(processes=num_processes) as pool:
        if use_tqdm:
            # Use tqdm for progress tracking
            results = list(tqdm(
                pool.imap(shrink_png, png_files),
                total=len(png_files),
                desc="Processing PNGs"
            ))
        else:
            results = pool.map(shrink_png, png_files)
    
    # Print results
    for result in results:
        print(result)
    
    print(f"\nCompleted processing {len(png_files)} files using {num_processes} processes")


if __name__ == "__main__":
    # Set multiprocessing start method for better compatibility
    mp.set_start_method('spawn', force=True)
    main()
