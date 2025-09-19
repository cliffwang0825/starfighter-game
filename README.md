# Starfighter Game

Starfighter is a vertical scrolling shooter prototype created with Python and [pygame](https://www.pygame.org/). The project demonstrates a simple game loop, sprite-based actors, and scene management while leaving room for additional mechanics and polished artwork.

## Project Structure

```
.
├── assets/
│   ├── images/           # Placeholder for background, player, enemy, bullet sprites
│   └── sounds/           # Placeholder for music and sound effects
└── src/
    ├── bullet.py         # Projectile behaviour for player and enemy shots
    ├── enemy.py          # Enemy movement and shooting logic
    ├── effects.py        # Transient visuals (explosions, etc.)
    ├── game.py           # Pygame bootstrap and main loop
    ├── main.py           # Entry point (run with `python -m src.main`)
    ├── player.py         # Player ship controls and firing
    └── scenes.py         # Title, gameplay, and game-over scenes with manager
```

## Requirements

- Python 3.10+
- pygame 2.5+

Install the dependencies with pip:

```bash
python -m pip install -r requirements.txt
```

## Running the Game

1. Ensure that the required dependencies are installed.
2. Optionally add licensed art and audio to the `assets/images/` and `assets/sounds/` folders.
3. Start the game from the project root:

```bash
python -m src.main
```

### Controls

- Arrow keys or WASD: Move the player ship.
- Space or Z: Fire bullets.
- Enter/Space: Confirm prompts on title and debrief screens.
- Escape: Return to the title screen or exit from the title.

After launching you will see a title screen with control hints and the best score achieved during the session. Survive waves of enemies, earn points by defeating them, and collect a post-run debrief with your score and high score before diving back in.

## Assets and Licensing

The repository currently ships with placeholder text files in the `assets/` directory. Replace these with your own art and audio assets. Make sure any external resources you add are licensed for redistribution. Recommended sources include [OpenGameArt](https://opengameart.org/) and [Kenney.nl](https://kenney.nl/assets), which provide CC0 or permissive licenses suitable for hobby and commercial projects. Document any third-party asset usage and attribution requirements in this README.
