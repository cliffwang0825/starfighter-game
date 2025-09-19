# Starfighter Game

Starfighter is a responsive vertical scrolling shooter that runs entirely in the browser. The project targets 60 FPS with device-pixel-ratio aware rendering so the action looks crisp on desktops, tablets, and phones. Keyboard controls work out of the box, while touch players can drag anywhere on the screen to steer and fire. Boss encounters, screen-clearing bombs, and collectible power-ups build an arcade-style loop that scales in difficulty across multiple sectors.

## Project Structure

```
.
├── assets/
│   ├── images/           # Optional replacement art for player, enemy, bullet, and backdrop visuals
│   └── sounds/           # Optional audio files for music and sound effects (to be wired into the web build)
├── index.html            # Game entry page
├── src/
│   ├── effects/          # Visual extras such as the starfield and explosions
│   ├── entities/         # Player, enemy, and projectile logic
│   ├── scenes/           # Title, gameplay, and debrief state controllers
│   ├── game.js           # Canvas management, main loop, and scene switching
│   ├── input.js          # Keyboard + touch input abstraction
│   ├── main.js           # Bootstraps the game in the browser
│   ├── storage.js        # Best score persistence via localStorage
│   └── utils.js          # Math helpers and randomisation utilities
└── styles.css            # Responsive layout and presentation styles
```

## Getting Started

1. **Install dependencies** – None are required; the build uses modern browser features and plain ES modules.
2. **Serve the project** – Launch any static file server from the repository root. A quick option is Python’s built-in server:

   ```bash
   python -m http.server 8000
   ```

   Then open [http://localhost:8000](http://localhost:8000) in a desktop or mobile browser.

3. **Play the game** – The title screen shows your best score. Tap, click, or press Space/Enter to deploy.

## Controls

| Platform | Action |
| --- | --- |
| Keyboard | WASD / Arrow keys to move, Space or Enter to fire, **X / B / Shift** to deploy a bomb, Enter / Space to confirm |
| Touch & Mouse | Drag to steer and fire, double-tap to drop a bomb, tap to confirm |
| All | Press **M** to toggle music and SFX |

## Performance & UX Features

- **60 FPS fixed timestep** keeps the simulation stable and smooth even on variable refresh rates.
- **Device pixel ratio scaling** renders to high-resolution canvases for crisp visuals on Retina/HiDPI screens.
- **Responsive layout** adapts the canvas to portrait or landscape orientations up to tablet-sized viewports.
- **Touch-friendly gestures** leverage pointer events with subtle smoothing for accurate mobile control, including a double-tap bomb gesture on phones and tablets.
- **Boss escalations & level theming** cycle through changing nebula palettes, background starfields, and multi-phase boss ships that echo Star Wars-inspired silhouettes with metallic specular highlights.
- **Power-ups and bombs** introduce screen-clearing ordnance, shield boosts, speed bursts, and spread cannons to help players survive three hits per life across three lives.
- **Soundtrack and SFX** are synthesised at runtime with a mute toggle, and can be replaced with licensed audio assets.
- **Persistent best score** stored locally so high scores survive reloads.

## Assets and Licensing

The repository ships with placeholder README files inside `assets/images/` and `assets/sounds/`. Replace them with your own painted or pre-rendered sprites, multi-frame boss components, and looping audio for a richer presentation. Recommended sources include [OpenGameArt](https://opengameart.org/) and [Kenney.nl](https://kenney.nl/assets), which provide assets under permissive licenses.

When adding third-party resources, document attribution requirements here and ensure the licenses allow redistribution in a browser game.
