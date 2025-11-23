#!/bin/bash

# Script to generate gamelist.json and thumbnails in parallel
# This script should be run from the project root.
# Uses parallel gamelist generation for improved performance (2.9x faster).

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're being called from another script
if [ -n "$CALLED_FROM_SCRIPT" ]; then
    echo -e "${CYAN}🚀 Starting parallel build process (called from script)...${NC}"
    echo -e "${CYAN}📋 Generating gamelist.json and thumbnails simultaneously...${NC}"
    # Disable progress bar when called from another script
    DISABLE_PROGRESS=true
else
    echo -e "${CYAN}🚀 Starting parallel build process...${NC}"
    echo -e "${CYAN}📋 Generating gamelist.json and thumbnails simultaneously...${NC}"
    DISABLE_PROGRESS=false
fi

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

# Start gamelist generation in background (using parallel version)
echo -e "${BLUE}🔄 Starting parallel gamelist generation...${NC}"
GAMELIST_START_TIME=$(date +%s)
bash scripts/generate_gamelist_parallel.sh > /tmp/gamelist_output.log 2>&1 &
GAMELIST_PID=$!

# Start thumbnail generation in background
echo -e "${PURPLE}🖼️  Starting thumbnail generation...${NC}"
THUMBNAILS_START_TIME=$(date +%s)
bash scripts/generate_thumbnails.sh > /tmp/thumbnails_output.log 2>&1 &
THUMBNAILS_PID=$!

echo -e "${CYAN}⏳ Both processes are now running in parallel...${NC}"
echo -e "${CYAN}   • Gamelist generation PID: $GAMELIST_PID${NC}"
echo -e "${CYAN}   • Thumbnail generation PID: $THUMBNAILS_PID${NC}"
echo ""

# Function to show real-time progress bar
show_progress() {
    local gamelist_pid=$1
    local thumbnails_pid=$2
    
    local progress_stage=0
    local progress_bar_width=50
    local total_stages=6  # Total number of stages we can detect
    
    # Wait a moment for processes to start and generate initial output
    sleep 2
    
    # Check if processes are still running
    while kill -0 $gamelist_pid 2>/dev/null || kill -0 $thumbnails_pid 2>/dev/null; do
        # Try to extract progress from gamelist output
        if [ -f /tmp/gamelist_output.log ]; then
            # Detect progress stages based on output
            local current_stage=0
            
            if grep -q "Starting parallel gamelist generation" /tmp/gamelist_output.log; then
                current_stage=1
            fi
            if grep -q "Getting current week's game from upcoming.yaml" /tmp/gamelist_output.log; then
                current_stage=2
            fi
            if grep -q "Scanning ROM files\|Collecting ROM entries" /tmp/gamelist_output.log; then
                current_stage=3
            fi
            if grep -q "Starting.*worker processes" /tmp/gamelist_output.log; then
                current_stage=4
            fi
            if grep -q "Waiting for workers to complete" /tmp/gamelist_output.log; then
                current_stage=5
            fi
            if grep -q "Combining results" /tmp/gamelist_output.log; then
                current_stage=6
            fi
            
            # Update progress if we found a new stage
            if [ $current_stage -gt $progress_stage ]; then
                progress_stage=$current_stage
            fi
            
            # Calculate percentage
            local percentage=$((progress_stage * 100 / total_stages))
            local filled=$((percentage * progress_bar_width / 100))
            local empty=$((progress_bar_width - filled))
            
            # Create progress bar
            local bar=""
            for ((i=0; i<filled; i++)); do
                bar="${bar}█"
            done
            for ((i=0; i<empty; i++)); do
                bar="${bar}░"
            done
            
            # Show progress bar with status
            echo -ne "\r${CYAN}[${bar}] ${percentage}% (Stage ${progress_stage}/${total_stages})${NC}"
            
            # Show thumbnail status
            if kill -0 $thumbnails_pid 2>/dev/null; then
                echo -ne " | ${PURPLE}⏳ Thumbnails${NC}"
            else
                echo -ne " | ${GREEN}✅ Thumbnails${NC}"
            fi
            
            # Clear the line for next update
            echo -ne "                    "
            echo -ne "\r"
        else
            # Show simple status while waiting for output file
            echo -ne "\r${CYAN}⏳ Starting processes...${NC}"
            if kill -0 $thumbnails_pid 2>/dev/null; then
                echo -ne " | ${PURPLE}⏳ Thumbnails${NC}"
            else
                echo -ne " | ${GREEN}✅ Thumbnails${NC}"
            fi
            echo -ne "                    "
            echo -ne "\r"
        fi
        
        sleep 1
    done
    
    echo ""  # New line after progress
}

# Show progress while waiting (only if not called from another script)
if [ "$DISABLE_PROGRESS" != "true" ]; then
    echo -e "${CYAN}📊 Progress:${NC}"
    show_progress $GAMELIST_PID $THUMBNAILS_PID
else
    echo -e "${CYAN}⏳ Waiting for processes to complete...${NC}"
    # Simple wait without progress bar
    while kill -0 $GAMELIST_PID 2>/dev/null || kill -0 $THUMBNAILS_PID 2>/dev/null; do
        sleep 2
    done
fi

# Wait for both processes to complete
wait $GAMELIST_PID
GAMELIST_EXIT_CODE=$?
GAMELIST_END_TIME=$(date +%s)
GAMELIST_DURATION=$((GAMELIST_END_TIME - GAMELIST_START_TIME))

wait $THUMBNAILS_PID
THUMBNAILS_EXIT_CODE=$?
THUMBNAILS_END_TIME=$(date +%s)
THUMBNAILS_DURATION=$((THUMBNAILS_END_TIME - THUMBNAILS_START_TIME))

# Show output from both processes
echo ""
echo -e "${PURPLE}📋 Thumbnail Generation Output:${NC}"
cat /tmp/thumbnails_output.log

echo ""
echo -e "${BLUE}📋 Gamelist Generation Output:${NC}"
cat /tmp/gamelist_output.log

# Clean up temp files (only if not called from another script)
if [ -z "$CALLED_FROM_SCRIPT" ]; then
    rm -f /tmp/thumbnails_output.log /tmp/gamelist_output.log
fi



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