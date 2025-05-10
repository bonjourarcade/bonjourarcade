# BonjourArcade

Thank you for playing! :)

- `game-of-the-week`: Set this to decide what is the game of the week
  (must fit game_id from `public/games`)
- `metadata.yaml`: Template metadata file that could go in
  `public/games/<game_id>/`

# For adding a new game:

1. Add the ROM to the correct `public/roms/<system>` folder.

That's it! When you push your change to the main branch, the CI/CD
pipeline will pick it up and expose an endpoint that should match your
ID. For example, `https://bonjourarcade-abcdefgh.gitlab.io/<game_id>`.

# How to make the game appear on your website's home page

1. Create a `public/games/<game_id>` folder, where the `game_id` is
   the same value as the basename of your ROM.
    - For example, if you add `public/roms/NES/gauntlet.nes`, you will
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
