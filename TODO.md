- Make the dark mode button prettier (use this one?
  https://www.svgrepo.com/svg/309493/dark-theme)
- Make the tooltip dark in dark mode. Right now when we hover over a
  game, the tooltip is always white regardless of the theme
- Footer doesn't update on dark theme
- Have a field to type game id and launch game directly
- Allow to set game specific controls
  - Set controls for Out Run (virtual gamepad?)
  - Set controls for Vanguard 


- Modifier le gamelist.json pour enlever les fields inutiles (on devrait pouvoir les guesser par le game_id)
- Faire que le system show up dans le tooltip d'un jeu même s'il n'est pas spécifié dans le json

- Remettre les fichuers trash où ils devraient être et modifier raccourci felx.cc pour que les scripts MiSTer fonctionnent encore. Documenter la commande curl à utiliser pour faire le setup sur MiSTer. Cela pourrait me servir pour synchroniser mes bébelles!

- Joystick emoji doesn't work on RPi, use image?
- If /play?game= is empty, redirect to home