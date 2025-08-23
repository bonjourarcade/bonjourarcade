#!/bin/bash

# Script to check all metadata.yaml files for syntax errors
# This will help identify which metadata files are malformed

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

GAMES_DIR="public/games"

echo -e "${BLUE}🔍 Checking all metadata.yaml files for syntax errors...${NC}"

# Check if yq is available
if ! command -v yq &> /dev/null; then
    echo -e "${RED}Error: 'yq' is required to check YAML syntax${NC}"
    exit 1
fi

# Find all metadata.yaml files
METADATA_FILES=$(find "$GAMES_DIR" -name "metadata.yaml" -type f | sort)

if [ -z "$METADATA_FILES" ]; then
    echo -e "${YELLOW}No metadata.yaml files found in $GAMES_DIR${NC}"
    exit 0
fi

TOTAL_FILES=$(echo "$METADATA_FILES" | wc -l)
echo -e "${BLUE}📊 Found $TOTAL_FILES metadata files to check${NC}"

ERROR_COUNT=0
ERROR_FILES=()

# Check each metadata file
for metadata_file in $METADATA_FILES; do
    game_id=$(basename "$(dirname "$metadata_file")")
    
    # Try to parse the YAML file
    if yq '.' "$metadata_file" >/dev/null 2>&1; then
        # Try to extract a specific field to ensure it's valid
        if yq '.title // empty' "$metadata_file" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $game_id${NC}"
        else
            echo -e "${RED}❌ $game_id - Invalid YAML structure${NC}"
            ERROR_COUNT=$((ERROR_COUNT + 1))
            ERROR_FILES+=("$metadata_file")
        fi
    else
        echo -e "${RED}❌ $game_id - YAML syntax error${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        ERROR_FILES+=("$metadata_file")
    fi
done

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   • Total files checked: $TOTAL_FILES"
echo -e "   • Files with errors: $ERROR_COUNT"

if [ $ERROR_COUNT -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Files with errors:${NC}"
    for error_file in "${ERROR_FILES[@]}"; do
        echo -e "   • $error_file"
    done
    
    echo ""
    echo -e "${YELLOW}💡 To fix these files:${NC}"
    echo -e "   1. Check the YAML syntax (indentation, quotes, etc.)"
    echo -e "   2. Validate with: yq '.' <filename>"
    echo -e "   3. Use a YAML validator online"
    
    exit 1
else
    echo -e "${GREEN}✅ All metadata files are valid!${NC}"
    exit 0
fi
