# BonjourArcade

Thank you for playing! :)

- **Game of the Week**: Automatically selected each week using the plinko system
- `metadata.yaml`: Template metadata file that could go in
  `public/games/<game_id>/`

# For adding a new game:

1. Add the ROM to the correct `roms/<system>` folder.

That's it! When you push your change to the main branch, the CI/CD
pipeline will pick it up and expose an endpoint that should match your
ID. For example, `https://bonjourarcade-abcdefgh.gitlab.io/<game_id>`.

# How to make the game appear on your website's home page

1. Create a `public/games/<game_id>` folder, where the `game_id` is
   the same value as the basename of your ROM.
    - For example, if you add `roms/NES/gauntlet.nes`, you will
      want a `public/games/gauntlet` folder to include metadata.
1. Then, populate the metadata. See the section below for
   more details.

## Creating metadata

In `public/games/game_id`, two metadata files are supported:
- `cover.png`, for the game cover image
- `metadata.yaml`, which follows the [template](metadata.yaml)

# Setting controls for a system

You can do this in [public/config](public/config/), look for the
`controls_*.json` files. Follow [this documentation from
EmulatorJS](https://emulatorjs.org/docs4devs/control-mapping).

# Automatically load a save state when starting a game

Create a state file by clicking on the "floppy" button from the
emulator. Then move and rename this file to
`public/games/<game_id>/save.state`.

# Game of the Week System

The game of the week is automatically selected using:
- **Plinko System**: Weekly seeds (YYYYWW format) determine game selection
- **Predictions**: Games are pre-selected in `public/plinko/predict/predictions.yaml`
- **Automatic**: No manual file editing required
