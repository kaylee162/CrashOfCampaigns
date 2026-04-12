# Crash of Campaigns

## Overview
Crash of Campaigns is a retro-inspired, terminal-style combat game built using **p5.js**. The current version is a working prototype that focuses on a simple turn-based combat loop, menu-driven interactions, and basic visual feedback.

The goal of the project is to create a stylized combat experience that feels like a mix of classic RPG mechanics and retro terminal aesthetics, with room to expand into richer gameplay and polish.

---

## Features (Current)

### Core Gameplay
- Turn-based combat system
- Player vs enemy interaction loop
- Menu-driven action selection
- Basic attack and response system

### Screens / States
- Title screen
- Instructions screen
- Main gameplay loop
- Win / Lose States

### Visuals & Feedback
- Basic animations for attacks and actions
- Visual feedback for player and enemy turns
- Placeholder rendering system for assets

### Robust Image Handling
- Safe image rendering using a helper function (`drawImageSafe`)
- Prevents crashes if assets fail to load
- Logs helpful debug messages to the console

---

## Controls

| Action | Input |
|------|------|
| Navigate Menu | Keyboard (arrow keys or equivalent) |
| Select Option | Enter / Key press |
| Progress Screens | Key press |

---

## Project Structure

```

Crash_of_Campaigns/
│
├── index.html              # Entry point for the game
├── hello.js                # Main game logic (core loop, rendering, state handling)
├── sketch.properties       # p5.js config file
│
├── assets/                 # Game assets
│   ├── knight.png
│   ├── ogre.png
│   ├── dragon.png
│   ├── attack.png
│   ├── spell.png
│   └── ARCADECLASSIC.TTF   # Custom retro font
│
├── libraries/
│   └── p5.min.js           # p5.js library
│
├── reference_img/          # Design references and mockups
│   ├── Title Screen.png
│   ├── Win.png
│   ├── Lose.png
│   └── Style Guide.png
│
└── .git/                   # Version control

````

---

## Architecture

### 1. Game Loop (p5.js)
The game is structured around the standard p5.js lifecycle:
- `setup()` → Initializes assets and game state
- `draw()` → Runs every frame and handles rendering + updates

---

### 2. State Management
The game uses a **state-based system** to control flow:

- **TITLE** → Main menu / entry point  
- **INSTRUCTIONS** → How to play  
- **GAMEPLAY** → Core combat loop  
- **WIN** → Player defeats the enemy sucessfully
- **LOSE** → Player runs out of health points (HP) and the enemy wins
State transitions are handled centrally, making it easy to expand or modify flow later.

---

### 3. Combat System
- Turn-based logic
- Player selects an action from a menu
- Enemy responds after player turn
- Feedback is displayed visually and/or textually

This system is modular and can be extended with:
- More actions (defend, special attacks, spells)
- Status effects
- Smarter enemy AI

---

### 4. Rendering System

#### Safe Image Rendering
The project includes a helper:

```js
drawImageSafe(...)
````

This:

* Checks if an image loaded correctly
* Prevents runtime crashes
* Draws a placeholder if needed
* Logs errors for debugging

This is especially useful during development when asset paths or loading may break.

---

### 5. Assets & Styling

* Pixel-style sprites (knight, ogre, dragon, etc.)
* Custom font (`ARCADECLASSIC`) for retro UI
* Reference images guide visual direction

---

## How to Run

### Option 1 (Recommended)

Use a local server:

* VS Code → Live Server extension
* Or any simple HTTP server

### Option 2

Open `index.html` directly in a browser
*(May cause asset loading issues depending on browser security)*

---

## Known Issues / Limitations

* UI layout is still rough
* Image loading can be inconsistent depending on environment
* Combat feedback could be clearer
* No sound or music yet
* Limited enemy behavior

---

## Roadmap

### Core Features to Add

* Expanded combat mechanics
* Improved UI/UX for menus

### Polish & Improvements

* Better visual feedback for actions
* Smoother animations
* Refined layout and alignment
* More engaging enemy behavior

### Stretch Goals

* Sound effects and music
* Multiple enemy types
* Player progression / stats
* Special abilities or spells
* Better animation system (sprite-based instead of static)

---

## Development Notes

* Image loading issues are handled gracefully with fallback rendering
* Debug logs help track asset failures without crashing the game
* The project is intentionally structured to allow quick iteration

---

## Future Vision

Crash of Campaigns is currently a prototype, but it is designed to grow into:

* A polished retro combat game
* With stronger visual identity
* Deeper combat mechanics
* And a more immersive player experience

---

## Author

Irem Erturk
Kaylee Henry
Georgia Tech

---

## License

This project is for educational and development purposes.
