#!/bin/bash

# Script to generate gamelist.json and thumbnails sequentially
# This script is designed for GitLab CI where parallel processing can cause issues
# and we want clear progress reporting.

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Starting sequential build process for GitLab CI...${NC}"
echo -e "${CYAN}📋 Generating gamelist.json first, then thumbnails...${NC}"

# Step 1: Generate gamelist.json (sequential with progress)
echo -e "${BLUE}🔄 Step 1: Generating gamelist.json...${NC}"
GAMELIST_START_TIME=$(date +%s)
ruby scripts/generate_gamelist.rb
GAMELIST_EXIT_CODE=$?
GAMELIST_END_TIME=$(date +%s)
GAMELIST_DURATION=$((GAMELIST_END_TIME - GAMELIST_START_TIME))

if [ $GAMELIST_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Gamelist generation failed with exit code: $GAMELIST_EXIT_CODE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Gamelist generation completed in ${GAMELIST_DURATION}s${NC}"

# Step 2: Generate thumbnails
echo -e "${PURPLE}🖼️  Step 2: Generating thumbnails...${NC}"
THUMBNAILS_START_TIME=$(date +%s)
bash scripts/generate_thumbnails.sh
THUMBNAILS_EXIT_CODE=$?
THUMBNAILS_END_TIME=$(date +%s)
THUMBNAILS_DURATION=$((THUMBNAILS_END_TIME - THUMBNAILS_START_TIME))

if [ $THUMBNAILS_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Thumbnail generation failed with exit code: $THUMBNAILS_EXIT_CODE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Thumbnail generation completed in ${THUMBNAILS_DURATION}s${NC}"

# Final success message
echo ""
echo -e "${GREEN}✅ Sequential build completed successfully!${NC}"
echo -e "${GREEN}📊 Results:${NC}"
echo -e "   • ${BLUE}Gamelist generation: ✅ Success (${GAMELIST_DURATION}s)${NC}"
echo -e "   • ${PURPLE}Thumbnail generation: ✅ Success (${THUMBNAILS_DURATION}s)${NC}"
echo -e "   • ${CYAN}Total time: $((GAMELIST_DURATION + THUMBNAILS_DURATION))s${NC}"

