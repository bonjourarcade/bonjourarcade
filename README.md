# BonjourArcade

Thank you for playing! :)

- `game-of-the-week`: Set this to decide what is the game of the week
  (must fit game_id from `public/games`)
- `metadata.yaml`: Template metadata file that could go in
  `public/games/<game_id>/`

# For adding a new game:

1. Add the ROM to the correct `public/roms/<system>` folder
1. Create a `public/games/<game_id>` folder, where the `game_id` is
   the same value as the basename of your ROM.
    - For example, if you add `public/roms/NES/gauntlet.nes`, you will
      want a `public/games/gauntlet` folder to include metadata.

## Creating metadata

In `public/games/game_id`, two metadata files are supported:
- `cover.png`, for the game cover
- `metadata.yaml`, which follows the [template](metadata.yaml)

# Setting controls for a system

To be determined.
