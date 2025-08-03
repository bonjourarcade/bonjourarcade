#!/bin/bash

# Script to generate gamelist.json and thumbnails in parallel
# This script should be run from the project root.

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Starting parallel build process...${NC}"
echo -e "${CYAN}📋 Generating gamelist.json and thumbnails simultaneously...${NC}"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Build process interrupted. Cleaning up...${NC}"
    kill $GAMELIST_PID 2>/dev/null || true
    kill $THUMBNAILS_PID 2>/dev/null || true
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start gamelist generation in background
echo -e "${BLUE}🔄 Starting gamelist generation...${NC}"
bash scripts/generate_gamelist.sh &
GAMELIST_PID=$!

# Start thumbnail generation in background
echo -e "${PURPLE}🖼️  Starting thumbnail generation...${NC}"
bash scripts/generate_thumbnails.sh &
THUMBNAILS_PID=$!

# Wait for both processes to complete
echo -e "${CYAN}⏳ Waiting for both processes to complete...${NC}"
wait $GAMELIST_PID
GAMELIST_EXIT_CODE=$?

wait $THUMBNAILS_PID
THUMBNAILS_EXIT_CODE=$?

# Check exit codes
if [ $GAMELIST_EXIT_CODE -eq 0 ] && [ $THUMBNAILS_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Parallel build completed successfully!${NC}"
    echo -e "${GREEN}📊 Results:${NC}"
    echo -e "   • ${BLUE}Gamelist generation: ✅ Success${NC}"
    echo -e "   • ${PURPLE}Thumbnail generation: ✅ Success${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Parallel build failed!${NC}"
    echo -e "${RED}📊 Results:${NC}"
    if [ $GAMELIST_EXIT_CODE -eq 0 ]; then
        echo -e "   • ${BLUE}Gamelist generation: ✅ Success${NC}"
    else
        echo -e "   • ${BLUE}Gamelist generation: ❌ Failed (exit code: $GAMELIST_EXIT_CODE)${NC}"
    fi
    
    if [ $THUMBNAILS_EXIT_CODE -eq 0 ]; then
        echo -e "   • ${PURPLE}Thumbnail generation: ✅ Success${NC}"
    else
        echo -e "   • ${PURPLE}Thumbnail generation: ❌ Failed (exit code: $THUMBNAILS_EXIT_CODE)${NC}"
    fi
    
    exit 1
fi 