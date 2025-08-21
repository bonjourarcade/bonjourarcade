# Image Resize Scripts

This directory contains the image resizing scripts for optimizing PNG files in your game collection.

## Scripts Overview

### 1. `shrink_large_pngs.py` (Original)
- **Processing**: Sequential (one file at a time)
- **Use case**: Simple, reliable, easy to debug
- **Performance**: Baseline performance

### 2. `shrink_large_pngs_parallel.py` (Parallel)
- **Processing**: Parallel by individual files
- **Use case**: Best for many files, maximum speed
- **Performance**: 3-8x faster than sequential (depending on CPU cores)

## Performance Expectations

- **Sequential**: Baseline performance
- **Parallel**: 3-8x faster (depending on CPU cores and file count)

## Usage

### Pre-commit Hook (Recommended)
The pre-commit hook now uses the parallel version automatically.

### Manual Testing
```bash
# Test performance difference
python3 scripts/benchmark_resize.py

# Run specific version
python3 scripts/shrink_large_pngs_parallel.py
```

### Customization
You can modify the number of processes by changing the `num_processes` calculation in the parallel script.

## Requirements

- Python 3.6+
- Pillow (PIL)
- tqdm (optional, for progress bars)

## Notes

- The parallel version uses `multiprocessing` with the 'spawn' start method for better compatibility
- Memory usage scales with the number of processes
- The script automatically detects the optimal number of processes based on your CPU cores
- Uses fewer processes than total CPU cores to avoid overwhelming the system
