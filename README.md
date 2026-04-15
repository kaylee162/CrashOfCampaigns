# Crash of Campaigns

## Overview
Crash of Campaigns is a retro-inspired, terminal-style combat game built using **p5.js**. The current version is a playable prototype focused on a turn-based combat loop, menu-driven interactions, retro-styled visuals, and expanding tactical battle options.

The project blends classic RPG-inspired combat with a stylized terminal aesthetic. This updated version builds on the original prototype by introducing stronger combat decision-making through healing, defense, buffs, debuffs, multi-turn spells, and a second level with multiple enemies on screen at once.

---

## Features

### Core Gameplay
- Turn-based combat system
- Menu-driven action selection
- Multiple player actions with different combat roles
- Target selection during multi-enemy encounters
- Two-stage battle progression with escalating difficulty

### Expanded Combat System
- **ATTACK** for reliable direct damage
- **DEFEND** with significantly stronger damage reduction than before
- **SPELL** submenu with multiple spell types
- **HEAL** command with limited uses for balance and strategy

### Spell Mechanics
The combat system now includes multiple spell types with different effects:

- **FIREBLAST**  
  Deals direct damage and can apply a burn effect over time

- **WEAKEN**  
  Reduces enemy damage output for several turns

- **BARRIER**  
  Grants the player a temporary defensive buff

- **STARFALL**  
  A multi-turn spell that charges first, then lands on the following turn

### Enemy Status Effects
- Burn damage over time
- Temporary attack debuffs
- Slightly more advanced enemy behavior in later encounters

### Multi-Level Progression
- **Level 1** starts as a one-enemy encounter
- **Level 2** introduces a more challenging battle with multiple enemies at once
- Battle difficulty scales upward through enemy health, damage, and behavior variety

### Screens / States
- Title screen
- Instructions screen
- Main gameplay / battle screen
- Win screen
- Lose screen

### Visuals & Feedback
- Retro terminal-style interface
- Visual attack and spell effects
- Flash feedback when characters take damage
- Visual guard / barrier indicator when the player is defending
- Target highlighting for multi-enemy battles
- Combat log showing recent battle events

### Robust Image Handling
- Safe image rendering using a helper function (`drawImageSafe`)
- Prevents crashes if assets fail to load
- Falls back to placeholder rendering when needed
- Logs helpful debug messages to the console

---

## Controls

| Action | Input |
|--------|-------|
| Move menu cursor | Up / Down arrows or W / S |
| Confirm choice | Enter |
| Return / cancel spell menu | Escape |
| Switch target in multi-enemy battles | Left / Right arrows or A / D |
| Navigate title menu | Up / Down arrows or W / S |
| Change title enemy preview | Left / Right arrows or A / D |

---

## Project Structure

```text
Crash_of_Campaigns/
│
├── index.html              # Entry point for the game
├── hello.js                # Main game logic, combat flow, rendering, and state handling
├── sketch.properties       # p5.js config file
│
├── assets/                 # Game assets
│   ├── knight.png
│   ├── ogre.png
│   ├── dragon.png
│   ├── attack.png
│   ├── spell.png
│   └── pixelmix.TTF        # Custom retro font
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

The game follows the standard p5.js lifecycle:

* `preload()` → Loads images and font assets
* `setup()` → Creates the canvas and initializes the game state
* `draw()` → Runs every frame and handles rendering, timers, and battle updates

---

### 2. State Management

The game uses a state-based system to control overall flow:

* **TITLE** → Main menu / entry point
* **INSTRUCTIONS** → How to play
* **PLAYING** → Main battle loop
* **WIN** → Player clears all battle levels
* **LOSE** → Player loses all remaining lives

This structure keeps navigation and progression easy to manage and makes future expansion much cleaner.

---

### 3. Combat System

The battle system is menu-based and turn-based.

#### Player Turn

The player selects one of several commands:

* Attack
* Defend
* Spell
* Heal

#### Enemy Turn

After the player acts, surviving enemies take their turn. In later levels, more than one enemy may act during the same enemy phase.

#### Tactical Additions

Combat system supports:

* Buffs and debuffs
* Damage-over-time effects
* Limited healing resources
* Multi-turn spell planning
* Target switching when facing multiple enemies

This makes combat more strategic than a simple attack-exchange loop.

---

### 4. Multi-Level Encounter Design

The current prototype includes two levels of combat:

#### Level 1

* Single enemy battle
* Serves as the introductory encounter

#### Level 2

* Multiple enemies at once
* More complex enemy behavior
* Greater pressure on resource management and target prioritization

This gives the game a clearer sense of progression and a more engaging second phase.

---

### 5. Rendering System

#### Safe Image Rendering

The project includes a helper:

```js
drawImageSafe(...)
```

This function:

* Checks whether an image loaded successfully
* Prevents runtime crashes when assets fail
* Draws a placeholder if an image is missing
* Helps make development and testing more stable

#### Visual Combat Feedback

Rendering also supports:

* Damage flashes
* Spell and attack effects
* Defensive indicators
* Enemy target highlighting
* A scrolling-style combat log

---

### 6. Assets & Styling

* Pixel-style sprites for the player and enemies
* Retro custom font (`pixelmix`)
* Terminal-inspired UI framing and text layout
* Reference images used to guide the visual style

---

## How to Run

### Recommended

Use a local server:

* VS Code with the Live Server extension
* Or any lightweight HTTP server

### Alternative

Open `index.html` directly in a browser.

This may still cause asset-loading issues depending on browser security settings, so a local server is the safer option.

---

## Current Gameplay Highlights

* Stronger defend mechanic that now feels meaningful
* Healing as a limited combat resource
* Spell variety with more distinct roles
* Multi-turn spell planning
* Multi-enemy battles in level 2
* Better visual feedback for combat states
* More tactical decision-making than the earlier prototype

---

## Known Issues / Limitations

* UI layout can still be refined further
* Balancing for spells, healing, and enemy damage may need tuning
* No sound or music yet
* Combat visuals are still prototype-level
* Enemy AI is improved but still intentionally simple

---

## Roadmap

### Next Core Improvements

* Refine combat balance
* Improve menu readability and polish
* Add more spell and status effect interactions

### Polish Goals

* Smoother visual effects and animation timing
* Cleaner layout and spacing
* Improved transitions between levels and states

### Stretch Goals

* Sound effects and music
* More levels and enemy combinations
* Player progression / stat scaling
* Sprite-based animation improvements

---

## Development Notes

* Image loading issues are handled gracefully through fallback rendering
* Debug logs help identify asset failures without crashing the game
* The battle system is structured so it can be expanded with more mechanics over time
* The updated combat design is more modular than the original simple attack loop

---

## Version History

### Milestone 3

This version represents the initial working combat prototype with a simple and functional battle loop.

**Key Features:**
- Basic turn-based combat system
- Single enemy encounters
- Menu-driven actions:
  - Attack
  - Defend (minimal effect)
  - Spell (single generic attack)
- Title, Instructions, Gameplay, Win, and Lose screens
- Basic combat log system
- Simple attack animations and visual feedback
- Safe image rendering (`drawImageSafe`)
- Placeholder-style visuals and UI layout

---

### Milestone 4

This version significantly expands the combat system, introducing more strategic gameplay, multiple enemies, and deeper mechanics.

**Major Improvements:**

**Expanded Combat System**
- Added **HEAL** command with limited uses
- Improved **DEFEND** to significantly reduce incoming damage
- Introduced a **SPELL submenu** instead of a single spell action

**New Spell Mechanics**
- Multiple spells with unique behaviors:
  - **FIREBLAST** (damage + burn over time)
  - **WEAKEN** (enemy attack debuff)
  - **BARRIER** (temporary defense buff)
  - **STARFALL** (multi-turn delayed attack)
- Added support for:
  - Damage-over-time effects (burn)
  - Temporary stat changes (weaken, barrier)

**Multi-Enemy Combat**
- Added **Level 2** with multiple enemies on screen
- Implemented **target switching** (left/right controls)
- Added **target highlighting** for clarity

**Improved Enemy Behavior**
- Enemies can:
  - Apply stronger attacks (e.g., charged hits)
  - Use varied attack patterns
- Status effects now influence enemy behavior and damage output

**Visual & UI Enhancements**
- Visual indicators for:
  - Defending (guard state)
  - Barrier effects
  - Active target selection
- Expanded combat log for better feedback
- Improved action banners and effect visuals

**Gameplay Depth**
- Introduced resource management (limited healing)
- Encourages strategic decisions:
  - When to defend vs attack
  - When to heal vs save charges
  - Which enemy to target first
  - When to use multi-turn spells

---

## Author

Irem Erturk
Kaylee Henry
Georgia Tech

---

## License

This project is for educational and development purposes.