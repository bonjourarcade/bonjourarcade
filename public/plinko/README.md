# Plinko Game

A physics-based plinko game that automatically selects games for BonjourArcade.

## Credits

**Physics Simulation**: Zach Robinson & Thomas Schwartz  
**Original Implementation**: CIS 293 Advanced Technologies project

## How It Works

- **Weekly Seeds**: Each week gets a unique seed (YYYYWW format)
- **Deterministic**: Same seed always produces the same result
- **Auto-Selection**: Automatically picks games from predictions.yaml

## Features

- Physics-based ball dropping
- Weekly game selection
- Consistent results across devices
- 2-second countdown with skip option

## Usage

- `/plinko/` - Current week's game
- `/plinko/?seed=202525` - Specific week (Week 25 of 2025)

## Technical Details

Built with:
- p5.js for graphics
- Matter.js for physics
- Modular JavaScript classes (Particle, Boundary, Peg)
