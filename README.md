# Starfighter Game

Starfighter is a responsive vertical scrolling shooter that runs entirely in the browser. The project targets 60 FPS with device-pixel-ratio aware rendering so the action looks crisp on desktops, tablets, and phones. Two pilots can sortie at once on the same keyboard with always-on auto-fire, while touch players can drag anywhere on the screen to steer and trigger bombs. Boss encounters, screen-clearing ordnance, and collectible power-ups build an arcade-style loop that scales in difficulty across multiple sectors.

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

3. **Play the game** – The title screen shows your best score and lets you pick **Easy / Medium / Hard** plus a one- or two-pilot sortie before launching. Tap, click, or press Space/Enter to deploy once you have selected a configuration.

## Controls

| Mode | Action |
| --- | --- |
| Keyboard Co-op | **Player 1** – WASD to move, **V** to deploy bombs. **Player 2** – Arrow keys to move, **Slash ( / )** to deploy bombs. Shots auto-fire automatically; both pilots keep three-hit hulls with three lives each. |
| Touch & Mouse | Drag anywhere to steer Player 1 with auto-fire enabled. Double-tap (or tap twice quickly) to release a bomb. Tap to confirm menus. |
| All | Enter / Space to confirm on keyboard. Press **P** to pause, **R** to restart the mission, **Esc** to return to the title, **M** to toggle background music, and **N** to toggle sound effects. |

## Performance & UX Features

- **60 FPS fixed timestep** keeps the simulation stable and smooth even on variable refresh rates.
- **Device pixel ratio scaling** renders to high-resolution canvases for crisp visuals on Retina/HiDPI screens.
- **Responsive layout** adapts the canvas to portrait or landscape orientations up to tablet-sized viewports.
- **Touch-friendly gestures** leverage pointer events with subtle smoothing for accurate mobile control, including a double-tap bomb gesture on phones and tablets.
- **Boss escalations & level theming** cycle through changing nebula palettes with dimmer starfields, randomized star colours per sector, and multi-phase boss ships that echo Star Wars-inspired silhouettes with metallic specular highlights.
- **Rotating boss roster** now spans ten distinct capital ships, each with bespoke attack scripts and metallic silhouettes that rotate through red, white, purple, blue, and gold palettes.
- **Expanded enemy roster** introduces strafing interceptors and bombing wings with unique flight paths and projectile patterns for greater mid-wave variety.
- **Simultaneous co-op** keeps two players active at once with always-on cannons, per-pilot bombs, and respawn invulnerability for the surviving partner.
- **Difficulty presets** (Easy/Medium/Hard) tune enemy durability, projectile density, spawn cadence, and boss aggression so the opening patrol is approachable while the hard setting becomes a bullet-hell gauntlet.
- **Power-ups and bombs** introduce screen-clearing ordnance, hull repairs, shield boosts, speed bursts, a three-tier spread cannon that blooms into wider volleys, the returning Canon railgun that levels into homing missile barrages, and a piercing laser cannon to help players survive three hits per life across three lives.
- **Compact HUD metadata** tucks the author credit (Cliff Wang), semantic version, and release date beside a slimmer scorecard while level titles pop in for two seconds at the start of each sector. Player cards shrink to avoid overlap and now light up a shield badge whenever defences are active.
- **Illustrated power-up drops** swap the previous lettered discs for themed icons such as bomb blasts, rocket thrusters, triple-shot sprays, laser rails, Canon shells stamped with a bold “C”, red-cross medkits, and crystalline shields to improve legibility mid-fight.
- **Adrenaline rock soundtrack** layers distorted power chords, growling bass runs, reinforced kicks, snares, and hi-hat bursts for a livelier in-browser score with dedicated music and SFX toggles.
- **Soundtrack and SFX** are synthesised at runtime with independent mute toggles and can be replaced with licensed audio assets.
- **Persistent best score** stored locally so high scores survive reloads.

## Assets and Licensing

The repository ships with placeholder README files inside `assets/images/` and `assets/sounds/`. Replace them with your own painted or pre-rendered sprites, multi-frame boss components, and looping audio for a richer presentation. Recommended sources include [OpenGameArt](https://opengameart.org/) and [Kenney.nl](https://kenney.nl/assets), which provide assets under permissive licenses.

When adding third-party resources, document attribution requirements here and ensure the licenses allow redistribution in a browser game.
