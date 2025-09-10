#!/usr/bin/env python3
"""
Script to remove 'enable_score: false' entries from game metadata files.
Since enable_score now defaults to true, we can remove explicit false entries.
"""

import os
import re
import sys
from pathlib import Path

def cleanup_metadata_file(file_path):
    """Remove 'enable_score: false' line from a metadata file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pattern to match 'enable_score: false' (with optional whitespace)
        # This handles various indentation and spacing patterns
        pattern = r'^\s*enable_score:\s*false\s*$'
        
        # Split into lines and filter out matching lines
        lines = content.split('\n')
        original_line_count = len(lines)
        
        # Remove lines that match the pattern
        filtered_lines = [line for line in lines if not re.match(pattern, line)]
        
        # Only write if we actually removed something
        if len(filtered_lines) < original_line_count:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(filtered_lines))
            return True
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all metadata files."""
    games_dir = Path("public/games")
    
    if not games_dir.exists():
        print(f"Error: {games_dir} directory not found")
        sys.exit(1)
    
    # Find all metadata.yaml files
    metadata_files = list(games_dir.glob("*/metadata.yaml"))
    
    if not metadata_files:
        print("No metadata files found")
        return
    
    print(f"Found {len(metadata_files)} metadata files")
    
    # Process files
    processed_count = 0
    modified_count = 0
    
    for file_path in metadata_files:
        processed_count += 1
        if cleanup_metadata_file(file_path):
            modified_count += 1
            print(f"✓ Removed enable_score: false from {file_path}")
        
        # Progress indicator
        if processed_count % 100 == 0:
            print(f"Processed {processed_count}/{len(metadata_files)} files...")
    
    print(f"\nSummary:")
    print(f"  Total files processed: {processed_count}")
    print(f"  Files modified: {modified_count}")
    print(f"  Files unchanged: {processed_count - modified_count}")

if __name__ == "__main__":
    main()
