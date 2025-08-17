#!/bin/bash

# =============================================================================
# BonjourArcade Local Development Server
# =============================================================================
# 
# This script provides a complete local development environment for BonjourArcade:
# 
# 1. LOCAL TESTING MODE: Generates gamelist.json with local ROM paths (/roms/...)
#    and thumbnails, allowing you to test ROMs locally without pushing
#    to the repository.
# 
# 2. SERVER STARTUP: Launches a local HTTP server from the public/ directory
#    so you can test the full application in your browser.
# 
# USAGE:
#   ./dev.sh                     # Start with local testing mode (default)
#   ./dev.sh --production        # Start with production Google Cloud Storage URLs
#   ./dev.sh --help              # Show this help message
# 
# FEATURES:
#   - Automatic gamelist generation with local ROM paths
#   - Automatic thumbnail generation for all games
#   - Parallel processing for fast build generation
#   - Local server startup at http://localhost:8000
#   - Easy switching between local and production modes
#   - Production mode uses Google Cloud Storage CDN (no CORS issues)
#   - Comprehensive error checking and user feedback
# 
# REQUIREMENTS:
#   - bash, python3, yq, jq
#   - ROMs folder in repo root (symlinked to public/roms)
#   - Games metadata in public/games/
# =============================================================================

set -e

# --- Color codes for output ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Help function ---
show_help() {
    echo -e "${BLUE}BonjourArcade Local Development Server${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
echo "  --production    Use production Google Cloud Storage URLs instead of local paths"
echo "  --help          Show this help message"
echo ""
echo "Examples:"
echo "  ./dev.sh        # Start with local testing mode (default)"
echo "  ./dev.sh --production # Start with production Google Cloud Storage URLs"
    echo ""
    echo "Local testing mode will:"
echo "  1. Generate gamelist.json with local ROM paths (/roms/...)"
echo "  2. Generate thumbnails for all games"
echo "  3. Start local server at http://localhost:8000"
echo "  4. Allow testing ROMs from local filesystem"
echo ""
echo "Production mode will:"
echo "  1. Generate gamelist.json with Google Cloud Storage URLs"
echo "  2. Generate thumbnails for all games"
echo "  3. Start local server at http://localhost:8000"
echo "  4. Test with production ROM URLs (requires internet)"
}

# --- Parse command line arguments ---
LOCAL_TESTING=true
while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            LOCAL_TESTING=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# --- Main script ---
echo -e "${BLUE}🚀 BonjourArcade Local Development Server${NC}"
echo ""

if [ "$LOCAL_TESTING" = "true" ]; then
    echo -e "${GREEN}🔧 Local Testing Mode Enabled${NC}"
    echo "   ROMs will be loaded from local paths (/roms/...)"
    echo "   This allows testing without pushing to GitLab"
    echo ""
else
    echo -e "${YELLOW}🌐 Production Mode Enabled${NC}"
    echo "   ROMs will be loaded from Google Cloud Storage URLs"
    echo "   This requires internet connection"
    echo ""
fi

# --- Check prerequisites ---
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if we're in the right directory
if [ ! -d "roms" ] || [ ! -d "public" ]; then
    echo -e "${RED}❌ Error: This script must be run from the repository root${NC}"
    echo "   Expected: roms/ and public/ directories"
    echo "   Current: $(pwd)"
    exit 1
fi

# Check if symlink exists
if [ ! -L "public/roms" ]; then
    echo -e "${YELLOW}⚠️  Warning: public/roms symlink not found${NC}"
    echo "   Creating symlink from public/roms to ../roms..."
    cd public && ln -sf ../roms roms && cd ..
    echo -e "${GREEN}✅ Symlink created${NC}"
fi

# Check required tools
for tool in python3 yq jq; do
    if ! command -v $tool &> /dev/null; then
        echo -e "${RED}❌ Error: Required tool '$tool' not found${NC}"
        echo "   Please install: pip install yq && brew install jq"
        exit 1
    fi
done

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# --- Generate gamelist and thumbnails ---
echo -e "${BLUE}📋 Building project (gamelist + thumbnails)...${NC}"

if [ "$LOCAL_TESTING" = "true" ]; then
    export LOCAL_TESTING=true
    echo "   Using local ROM paths for testing"
else
    unset LOCAL_TESTING
    echo "   Using Google Cloud Storage URLs for production"
fi

# Count total games that will be processed
echo "   Counting ROM files..."
TOTAL_GAMES=$(find roms/* -type f 2>/dev/null | wc -l | tr -d ' ')
echo "   Found $TOTAL_GAMES ROM files to process"
echo ""

# Run the build process and capture output cleanly
echo "   Starting parallel build process..."
echo "   (This may take a few minutes for large ROM collections)"
echo ""

# Clear any existing temp files to avoid conflicts
rm -f /tmp/gamelist_output.log /tmp/thumbnails_output.log

# Set flag to disable progress bar when called from script
export CALLED_FROM_SCRIPT=true

# Capture build start time
BUILD_START_TIME=$(date +%s)

if bash scripts/build_parallel.sh; then
    echo ""
    echo -e "${GREEN}✅ Build completed successfully${NC}"
    echo -e "${GREEN}   • Gamelist generated${NC}"
    echo -e "${GREEN}   • Thumbnails generated${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Calculate and display build timing
BUILD_END_TIME=$(date +%s)
BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))
echo ""
echo -e "${CYAN}⏱️  Build completed in ${BUILD_DURATION}s${NC}"
echo ""

echo ""

# --- Show sample ROM paths ---
echo -e "${BLUE}🔍 Sample ROM paths from generated gamelist:${NC}"
if [ "$LOCAL_TESTING" = "true" ]; then
    echo "   (Local testing mode - using /roms/ paths)"
else
    echo "   (Production mode - using Google Cloud Storage URLs)"
fi

# Show compact sample of ROM paths
echo ""
grep '"romPath"' public/gamelist.json | head -5 | sed 's/.*"romPath": "\([^"]*\)".*/   • \1/'
echo "   ... (showing first 5 ROMs)"
echo ""

# --- Start server ---
echo -e "${BLUE}🚀 Starting local server...${NC}"
echo -e "${GREEN}   Server will be available at: http://localhost:8000${NC}"
echo -e "${GREEN}   Press Ctrl+C to stop the server${NC}"
echo ""

if [ "$LOCAL_TESTING" = "true" ]; then
    echo -e "${YELLOW}💡 Local Testing Tips:${NC}"
    echo "   - Test games at: http://localhost:8000/play?game=<game_id>"
    echo "   - ROMs load from: /roms/<system>/<game>"
    echo "   - No internet required for ROM loading"
    echo ""
else
    echo -e "${YELLOW}💡 Production Testing Tips:${NC}"
    echo "   - Test games at: http://localhost:8000/play?game=<game_id>"
    echo "   - ROMs load from Google Cloud Storage CDN"
    echo "   - No CORS issues - fast, reliable loading"
    echo "   - Internet connection required"
    echo ""
fi

# Start the server in foreground (suppress only Python's startup messages)
echo -e "${BLUE}🌐 Starting HTTP server...${NC}"

# Start the server and capture its exit code
cd public
python3 -m http.server 8000 >/dev/null 2>&1
echo "   Python server command completed"
SERVER_EXIT_CODE=$?
echo "   Server exit code: $SERVER_EXIT_CODE"

# Handle server exit gracefully
if [ $SERVER_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Server stopped normally${NC}"
elif [ $SERVER_EXIT_CODE -eq 130 ] || [ $SERVER_EXIT_CODE -eq 143 ]; then
    echo -e "${YELLOW}🛑 Server stopped by user (Ctrl+C)${NC}"
else
    echo -e "${YELLOW}⚠️  Server stopped with exit code: $SERVER_EXIT_CODE${NC}"
fi

# Always exit successfully since the build completed
exit 0
