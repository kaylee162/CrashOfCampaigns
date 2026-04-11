/*
    Crash of Campaigns - Prototype (V1)
    --------------------------------
    Crash of Campaigns is a simple p5.js (prototype atm) for a retro terminal-style combat game

    FEATURES INCLUDED RN:
    - Title screen
    - Instructions screen
    - Main interaction loop
    - Turn-based combat
    - Menu-based actions (the display looks a bit different from the mockup right now, 
    but the functionality is there and we can iterate on the design as we go :) )
    - Basic animations / feedback for the user's actions and enemy attacks

    NEED TO ADD:
    - Win state
    - Lose state
    - README.md file (idk note 3.)
    - .gitignore (maybe if necessary, if we end up with any files we don't want to track in git, but right now 
    since everything is just a few code and asset files it should be fine without one, but we can add it later if needed :P)
    
    POLISH THINGS: 
    - More detailed instructions and feedback for player actions and enemy attacks
    - More interesting enemy behavior and attack patterns
    - also need to fix the display, its a bit wanky rn, but that will be a work in progress 
    as we add more features and mechanics to the game :)
    - More visual polish and effects to make the combat feel more impactful and satisfying
    - Music and sound effects (maybe :P)

    BUGS:
    NONE :) 

    DEV NOTES:
    i've been having a lot of trouble with loading and displaying images in p5.js for some reason, so for now the code is set up to handle image loading issues gracefully without breaking the sketch, 
    and it will log helpful messages to the console for debugging. 
    The drawImageSafe function is a helper that checks if an image loaded successfully before trying to draw it, 
    and if not it will draw a placeholder rectangle and log an error message instead of breaking the sketch with a runtime error. 
    This way we can still work on the game and test other features even if there are issues with the images, 
    and we can easily identify and fix any problems with the assets by checking the console logs.

    1. just a note: i couldn't figure out how to work Processing, so i lowkey just used VSCode
    2. another note: to run the game locally, i have an extension called "Live Server" that lets me run a local server and play the game in the browser,
    but you can also just open the index.html file in a web browser and it should work fine since all the assets are loaded locally and there are no external dependencies, 
    so it should be super easy to run on another computer without needing to set up anything fancy :)
    3. also note: i'm gonna put this in a README file later but just putting it here for now - thats lowgurtgenuinely a lotta work 

    HOW TO PLAY:
    - On title screen:
        W/S or UP/DOWN = move cursor
        ENTER = select
    - In battle:
        W/S or UP/DOWN = move action cursor
        ENTER = confirm action
    - On win/lose screen:
        ENTER = restart to title
*/

// --------------------------------------------------
// GLOBAL GAME STATE
// --------------------------------------------------

// Finite state machine values
// These match the structure you described in our milestone PDF:
// title -> instructions or game -> win/lose
let gameState = "TITLE";

// Menu cursor positions
let titleMenuIndex = 0;
let battleMenuIndex = 0;

// Title screen menu options
const titleOptions = [
    "VIEW INSTRUCTIONS",
    "PLAY GAME"
];

// Battle command options
const battleOptions = [
    "ATTACK",
    "DEFEND",
    "SPELL"
];

// Player and enemy objects
let player;
let enemy;

// Current enemy choice for this prototype.
// You can switch between "DRAGON" and "OGRE"
let selectedEnemyType = "DRAGON";

// Combat message log shown in the lower section of the screen
let combatLog = [];

// Small timer so the enemy turn happens shortly after the player turn
// This makes combat feel more alive than if everything happens instantly
let enemyTurnTimer = 0;

// If true, the player is defending this turn
// The enemy attack will deal reduced damage if this is active, but it resets after one enemy hit
let playerDefending = false;

// Flash timers for very simple hit feedback
let playerFlashTimer = 0;
let enemyFlashTimer = 0;

// Small animation timer for slash/spell effects
let attackEffectTimer = 0;
let attackEffectType = ""; // "ATTACK" or "SPELL"

// --------------------------------------------------
// VISUAL STYLE CONSTANTS
// --------------------------------------------------

// These are just some simple colors to keep the style consistent
// yay colors!!
const BG = "#000000";
const GOLD = "#c6b96b";
const TEAL = "#1f5c5d";
const BRIGHT_TEAL = "#2b8b8d";
const LIGHT = "#a8b4ae";
const RED = "#c65f5f";
const GREEN = "#7abf88";

// Canvas size based on your mockup proportions
const CANVAS_W = 640;
const CANVAS_H = 480;

// --------------------------------------------------
// ASSET VARIABLES
// --------------------------------------------------

// Image assets
let knightImg;
let dragonImg;
let ogreImg;
let attackImg;
let spellImg;

// Font asset
let arcadeFont;

// --------------------------------------------------
// P5 PRELOAD
// --------------------------------------------------
// preload() runs before setup().
// It is the correct place to load images and fonts in p5.js.
// This makes sure the files are ready before the game starts.

function preload() {
    // Load in the images from the assets folder
    // lowkey having so much trouble with the images, so this is a super safe way to 
    // load them that won't break the sketch if there's an issue with the files or paths, 
    // and it will log helpful messages to the console for debugging
    knightImg = loadImage(
        "assets/knight.png",
        () => console.log("knight loaded"),
        (err) => console.error("knight failed:", err)
    );

    dragonImg = loadImage(
        "assets/dragon.png",
        () => console.log("dragon loaded"),
        (err) => console.error("dragon failed:", err)
    );

    ogreImg = loadImage(
        "assets/ogre.png",
        () => console.log("ogre loaded"),
        (err) => console.error("ogre failed:", err)
    );

    attackImg = loadImage(
        "assets/attack.png",
        () => console.log("attack loaded"),
        (err) => console.error("attack failed:", err)
    );

    spellImg = loadImage(
        "assets/spell.png",
        () => console.log("spell loaded"),
        (err) => console.error("spell failed:", err)
    );

    // Load font
    // TrueType font (ttf) files can be finicky in p5.js
    // so again we'll use a safe loading method with callbacks to handle success and failure cases gracefully :)
    arcadeFont = loadFont(
        "assets/ARCADECLASSIC.ttf",
        () => console.log("font loaded"),
        (err) => console.error("font failed:", err)
    );
}

function setup() {
    createCanvas(CANVAS_W, CANVAS_H);

    // Only use the custom font if it actually loaded
    if (arcadeFont) {
        textFont(arcadeFont);
    } else {
        // if it doesn't work for some reason, we'll default to monospace and log an error, but the game will still be playable
        console.error("Custom font failed to load, using default monospace font");
        textFont("monospace");
    }

    imageMode(CORNER);
    noSmooth();
    resetGame();
}

// --------------------------------------------------
// RESET FUNCTIONS
// --------------------------------------------------
function resetGame() {
    // Reset player stats
    // these are the default values for the start of each game, 
    // but we might modify them later for different levels or difficulty settings (maybe :P)
    player = {
        name: "PLAYER",
        hp: 100,
        maxHp: 100,
        lives: 2
    };

    // Reset enemy based on selected type
    setupEnemy(selectedEnemyType);

    // Reset combat values
    battleMenuIndex = 0;
    combatLog = [];
    enemyTurnTimer = 0;
    playerDefending = false;
    playerFlashTimer = 0;
    enemyFlashTimer = 0;
    attackEffectTimer = 0;
    attackEffectType = "";

    // Add some initial log messages 
    addLog("> SYSTEM READY");
    addLog("> ENCOUNTER LOADED");
    addLog(`> ${enemy.name} APPEARS`);
}

// This sets up the enemy stats based on the selected type
function setupEnemy(type) {
    if (type === "OGRE") {
        enemy = {
            type: "OGRE",
            name: "OGRE",
            hp: 70,
            maxHp: 70,
            minDamage: 10,
            maxDamage: 18
        };
    } else {
        enemy = {
            // the dragon will be the more difficult enemy with higher HP and damage range
            type: "DRAGON",
            name: "DRAGON",
            hp: 85,  
            maxHp: 85, 
            minDamage: 12,
            maxDamage: 20
        };
    }
}

// --------------------------------------------------
// MAIN DRAW LOOP
// --------------------------------------------------

function draw() {
    background(BG);

    // Update simple timers each frame
    if (enemyTurnTimer > 0) enemyTurnTimer--;
    if (playerFlashTimer > 0) playerFlashTimer--;
    if (enemyFlashTimer > 0) enemyFlashTimer--;
    if (attackEffectTimer > 0) attackEffectTimer--;

    // Run enemy turn when timer expires
    if (gameState === "PLAYING" && enemyTurnTimer === 1) {
        handleEnemyTurn();
    }

    // Draw based on current state
    if (gameState === "TITLE") {
        drawTitleScreen();
    } else if (gameState === "INSTRUCTIONS") {
        drawInstructionsScreen();
    } else if (gameState === "PLAYING") {
        drawBattleScreen();
    } else if (gameState === "WIN") {
        drawWinScreen();
    } else if (gameState === "LOSE") {
        drawLoseScreen();
    }
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------

function keyPressed() {
    // Handle input based on current state
    // We are just going to use seperate functions to handle these for cleanliness
    if (gameState === "TITLE") { 
        // Title screen input
        handleTitleInput();
    } else if (gameState === "INSTRUCTIONS") { 
        // Instructions screen input
        handleInstructionsInput();
    } else if (gameState === "PLAYING") { 
        // Battle screen input
        handleBattleInput();
    } else if (gameState === "WIN" || gameState === "LOSE") { 
        // Win/Lose screen input
        handleEndInput();
    }
}

// Title screen input handling, including menu navigation and enemy selection
function handleTitleInput() {
    // Menu navigation
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        titleMenuIndex = max(0, titleMenuIndex - 1); // Keep index within bounds of menu options
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        titleMenuIndex = min(titleOptions.length - 1, titleMenuIndex + 1); // Keep index within bounds of menu options
    }

    // Optional enemy selection on title screen
    if (keyCode === LEFT_ARROW || key === "a" || key === "A") {
        selectedEnemyType = "OGRE"; // Change to ogre if left arrow or A is pressed
    } else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") {
        selectedEnemyType = "DRAGON"; // Change to dragon if right arrow or D is pressed
    }

    // Confirm selection
    if (keyCode === ENTER || keyCode === RETURN) {
        if (titleMenuIndex === 0) {
        gameState = "INSTRUCTIONS"; // Go to instructions
        } else if (titleMenuIndex === 1) {
        resetGame(); // Reset game state for new playthrough
        gameState = "PLAYING"; // Start the game
        }
    }
}

function handleInstructionsInput() {
  // Any Enter or Escape returns to title
    if (keyCode === ENTER || keyCode === RETURN || keyCode === ESCAPE) {
        gameState = "TITLE"; // Return to title screen
    }
}

function handleBattleInput() {
    // Do not allow player input while waiting for enemy turn
    if (enemyTurnTimer > 0) return;

    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        battleMenuIndex = max(0, battleMenuIndex - 1); // Move cursor up, keeping within bounds of battle options
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        battleMenuIndex = min(battleOptions.length - 1, battleMenuIndex + 1); // Move cursor down, keeping within bounds of battle options
    }

    if (keyCode === ENTER || keyCode === RETURN) {
        const chosenAction = battleOptions[battleMenuIndex]; // Get the action corresponding to the current cursor position
        handlePlayerAction(chosenAction); // Process the player's chosen action (attack, defend, or spell)
    }
}

// Input handling for win/lose screens - just return to title on Enter
function handleEndInput() {
  if (keyCode === ENTER || keyCode === RETURN) {
    gameState = "TITLE"; // Return to title screen
    titleMenuIndex = 0; // Reset title menu cursor to default
  }
}

// --------------------------------------------------
// COMBAT LOGIC
// --------------------------------------------------

function handlePlayerAction(action) {
    // Basic attack with random damage in a range
    if (action === "ATTACK") { 
        const dmg = floor(random(8, 15)); // Random damage between 8 and 14 (can change if necessary :P)
        enemy.hp = max(0, enemy.hp - dmg); // Reduce enemy HP but not below 0 
        enemyFlashTimer = 12; // Start flash timer for hit feedback
        attackEffectTimer = 20; // Start timer for attack effect animation
        attackEffectType = "ATTACK"; // Set effect type to attack for drawing the correct animation

        addLog("> PLAYER ATTACKED"); // Log the attack action
        addLog(`> ${enemy.name} -${dmg} HP`); // Log the damage dealt to the enemy
    }

    else if (action === "DEFEND") {
        // Basic defend action - sets a flag that will reduce damage from the next enemy attack, but resets after one hit
        playerDefending = true; // Set defending flag to true so that the enemy turn can check this and reduce damage accordingly
        addLog("> PLAYER DEFENDED"); // Log the defend action
        addLog("> DAMAGE WILL BE REDUCED"); // Log the effect of defending for player clarity
    }

    else if (action === "SPELL") {
        // Basic spell action - higher damage than attack but with a chance to miss
        const spellHit = random() < 0.8; // 80% chance to hit, 20% chance to miss (we might adjust these values for balance later)

        if (spellHit) {
            // If the spell hits, deal higher damage than a normal attack 
            // we might adjust the damage range and hit chance later 
            const dmg = floor(random(12, 22)); // Random damage between 12 and 21 (can change if necessary :P)
            enemy.hp = max(0, enemy.hp - dmg); // Reduce enemy HP but not below 0
            enemyFlashTimer = 12;  // Start flash timer for hit feedback
            attackEffectTimer = 20;  // Start timer for spell effect animation
            attackEffectType = "SPELL"; // Set effect type to spell for drawing the correct animation

            addLog("> PLAYER CAST SPELL"); // Log the spell action
            addLog(`> ${enemy.name} -${dmg} HP`); // Log the damage dealt to the enemy
        } else {
            addLog("> PLAYER CAST SPELL"); // Log the spell action even if it misses for consistency
            addLog("> SPELL MISSED"); // Log the miss so the player knows their action was processed but just didn't hit
        }
    }

    // Check for win immediately after player turn
    if (enemy.hp <= 0) {
        gameState = "WIN"; // win state yay!
        return; // we return here to avoid starting the enemy turn timer since the game is already won
    }

    // Delay enemy turn slightly so it feels like alternating turns
    enemyTurnTimer = 45;
}

function handleEnemyTurn() {
    addLog(`> ${enemy.name} INITIATED ATTACK`); // Log the start of the enemy turn

    let dmg = floor(random(enemy.minDamage, enemy.maxDamage + 1)); // Random damage within the enemy's damage range (max is exclusive in random, so we add 1 to make it inclusive :) )

    // If player defended, reduce incoming damage
    if (playerDefending) {
        dmg = floor(dmg * 0.5); // Reduce damage by 50% if defending (we can adjust this multiplier for balance later)
        addLog("> DEFENSE REDUCED DAMAGE"); // Log the effect of defending for player clarity
    }

    player.hp -= dmg; // Apply damage to player HP
    playerFlashTimer = 12; // Start flash timer for hit feedback
    addLog("> PLAYER HIT"); // Log that the player was hit
    addLog(`> PLAYER -${dmg} HP`); // Log the damage dealt to the player

    // Reset defend after one enemy hit
    playerDefending = false;

    // If player HP drops to 0 or lower, lose a life
    if (player.hp <= 0) {
        player.lives -= 1;

        if (player.lives <= 0) {
            player.hp = 0; // Ensure HP doesn't go negative for display purposes
            gameState = "LOSE"; // lose state, game over :(
            return; // we return here to avoid any further processing since the game is already lost
            } else {
            // If the player still has lives, restore some HP and continue
            addLog("> LIFE LOST"); // life lost :'(
            addLog("> PLAYER REBOOTS"); // Log the reboot for player clarity and thematic flavor
            player.hp = 60; // Restore some HP for the next life (we can adjust this value for balance later)
        }
    }
}

function addLog(message) {
    // Add new message to the top of the combat log
    combatLog.unshift(message);

    // Keep only the newest few lines visible
    if (combatLog.length > 6) {
        combatLog.pop();
    }
}

// --------------------------------------------------
// DRAWING: TITLE SCREEN
// --------------------------------------------------

function drawImageSafe(img, x, y, w, h) {
    // again lowkey having so much trouble loading and displaying images, 
    // so this is a helper function to draw images that checks if the image loaded successfully 
    // before trying to draw it, and if not it will draw a placeholder rectangle 
    // and log an error message instead of breaking the sketch with a runtime error
    if (img) {
        image(img, x, y, w, h);
    } else {
        // fallback placeholder so the sketch still runs
        fill(80);
        rect(x, y, w, h);
    }
}

function drawTitleScreen() {
    // Draw the terminal frame and title text :)
    drawTerminalFrame();

    // Title
    fill(GOLD);
    textAlign(CENTER, TOP);
    textSize(34);
    text("CRASH OF CAMPAIGNS", width / 2, 35); // Game title centered at the top of the screen

    // Decorative line 
    stroke(TEAL);
    line(50, 85, width - 50, 85); // Draw a line under the title for separation
    noStroke();

    // Subtitle / enemy selector
    fill(LIGHT);
    textSize(16);
    text("SELECT ENEMY WITH A/D OR LEFT/RIGHT", width / 2, 115); //  Instruction for enemy selection

    // Current enemy display
    fill(BRIGHT_TEAL);
    textSize(22);
    text(`CURRENT ENEMY: ${selectedEnemyType}`, width / 2, 150); // Show the currently selected enemy type for clarity

    // Menu options
    textAlign(LEFT, TOP);
    textSize(22);

    for (let i = 0; i < titleOptions.length; i++) {
        // Highlight the currently selected menu option
        if (i === titleMenuIndex) {
        fill(BRIGHT_TEAL); 
        text("> " + titleOptions[i] + "_", 60, 240 + i * 52); // Add an underscore cursor to the selected option for clarity
        } else {
        fill(TEAL);
        text("> " + titleOptions[i], 60, 240 + i * 52); // Non-selected options are a different color and have no cursor
        }
    }

    // Draw the knight sprite on the title screen for some visual interest and to show off the player character,
    drawImageSafe(knightImg, 500, 250, 95, 135);

    // Footer
    fill(LIGHT);
    textSize(14);
    text("ENTER TO SELECT", 60, 410);
}

// --------------------------------------------------
// DRAWING: INSTRUCTIONS SCREEN
// --------------------------------------------------

function drawInstructionsScreen() {
    // copy-pasting the terminal frame and header from the title screen for consistency, 
    // then we'll add the instructions text below
    drawTerminalFrame();

    fill(GOLD);
    textAlign(CENTER, TOP);
    textSize(28);
    text("INSTRUCTIONS", width / 2, 35);

    stroke(TEAL);
    line(70, 85, width - 70, 85);
    noStroke();

    fill(LIGHT);
    textAlign(LEFT, TOP);
    textSize(18);

    const instructions = [
        // These are just placeholder instructions based on the current prototype features, 
        // a lot of these are TBD but we can expand and modify em as we add more mechanics and features to the game :)
        "THIS IS A TURN-BASED COMBAT PROTOTYPE.",
        "",
        "GOAL:",
        "DEFEAT THE ENEMY BEFORE YOU RUN OUT OF HP AND LIVES.",
        "",
        "CONTROLS:",
        "W/S OR UP/DOWN  -> MOVE CURSOR",
        "ENTER           -> CONFIRM CHOICE",
        "A/D OR LEFT/RIGHT ON TITLE -> CHANGE ENEMY",
        "",
        "COMMANDS:",
        "ATTACK  -> RELIABLE DAMAGE",
        "DEFEND  -> REDUCES NEXT ENEMY HIT",
        "SPELL   -> HIGHER DAMAGE, SMALL MISS CHANCE",
        "",
        "PRESS ENTER TO RETURN"
    ];

    for (let i = 0; i < instructions.length; i++) {
        // We add an underscore cursor to the last instruction to indicate that the player can press Enter to return, 
        // but we could also consider adding a blinking effect or something, but thats a later problem :P
        text(instructions[i], 60, 120 + i * 22);
    }
}

// --------------------------------------------------
// DRAWING: MAIN BATTLE SCREEN
// --------------------------------------------------

function drawBattleScreen() {
    // The battle screen is the most complex, 
    // since it has a lot of different elements to draw - the terminal frame, 
    // the HUD with player/enemy stats, the battle scene with characters and effects, 
    // the menu options, and the combat log.
    drawTerminalFrame();
    drawBattleHud();
    drawBattleSceneDivider();
    drawBattleCharacters();
    drawAttackEffect();
    drawBattleMenu();
    drawCombatLog();
}

function drawBattleHud() {
    // HUD background
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text("LEVEL ONE", 20, 12);

    fill(LIGHT);
    text(`HP:${player.hp}`, 235, 12); // Player HP display in the center of the HUD
    text(`LIVES:${player.lives}`, 360, 12); // Player lives display on the right side of the HUD

    // Decorative line to separate the HUD from the battle scene
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();
}

function drawBattleSceneDivider() {
    // Simple line to visually separate the battle scene from the menu and log below
    stroke(TEAL);
    line(0, 220, width, 220);
    noStroke();
}

function drawBattleCharacters() {
    // Draw enemy label and HP text
    fill(TEAL);
    textAlign(LEFT, TOP);
    textSize(18);
    text(enemy.name, 24, 58);
    text(`HP:${enemy.hp}`, 24, 82);

    // Flash effect while taking damage
    const playerHitFlash = playerFlashTimer > 0 && frameCount % 6 < 3;
    const enemyHitFlash = enemyFlashTimer > 0 && frameCount % 6 < 3;

    // --------------------------------------------
    // Draw player sprite
    // --------------------------------------------
    push();

    // If flashing, slightly tint the sprite brighter by using tint
    if (playerHitFlash) {
        tint(255, 180);
    } else {
        noTint();
    }

    // Adjust these numbers if your asset sizes differ
    drawImageSafe(knightImg, 45, 105, 110, 110);

    pop();

    // --------------------------------------------
    // Draw enemy sprite
    // --------------------------------------------
    push();

    if (enemyHitFlash) {
        tint(255, 180);
    } else {
        noTint();
    }

    if (enemy.type === "DRAGON") {
        drawImageSafe(dragonImg, 360, 70, 230, 170);
    } else {
        drawImageSafe(ogreImg, 410, 75, 180, 180);
    }

    pop();
}

function drawBattleMenu() {
    textAlign(LEFT, TOP);
    textSize(16);

    for (let i = 0; i < battleOptions.length; i++) {
        // Calculate y position for each menu option based on its index
        const y = 250 + i * 28;

        // Highlight the currently selected menu option and add an underscore cursor for clarity, but only if we're not waiting for the enemy turn to start (enemyTurnTimer === 0) to prevent confusion about when the player can actually select an option
        if (i === battleMenuIndex && enemyTurnTimer === 0) {
            fill(GOLD);
            text("> " + battleOptions[i] + "_", 24, y); // Add an underscore cursor to the selected option for clarity
        } else {
            fill(LIGHT);
            text("> " + battleOptions[i], 24, y); // Non-selected options are a different color and have no cursor
        }
    }

    // Show status while waiting for enemy turn
    if (enemyTurnTimer > 0) {
        fill(BRIGHT_TEAL);
        text("> ENEMY THINKING...", 24, 340);
    }
}

function drawCombatLog() {
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(16);

    // Display newest log at top of the log area
    for (let i = 0; i < combatLog.length; i++) {
        text(combatLog[i], 24, 380 + i * 18); // Log messages are spaced 18 pixels apart vertically
    }
}

// --------------------------------------------------
// DRAWING: WIN / LOSE
// --------------------------------------------------

function drawWinScreen() {
    // win screen :)
    drawTerminalFrame();
    
    // top bar
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text("LEVEL ONE", 20, 12);
    
    fill(LIGHT);
    text("HP:" + player.hp, 235, 12);
    text("LIVES:" + player.lives, 360, 12);
    
    // decorative divider line
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();
    
    // main body
    textAlign(CENTER, CENTER);
    text("LEVEL ONE", width / 2, height / 2 - 60);
    
    fill(LIGHT);
    textSize(16);
    text("YOU DEFEATED THE DRAGON", width / 2, height / 2 - 20);
    
    // extra options (purely visual/for the vibes for now)
    fill(TEAL);
    text("> ADVANCE TO LEVEL 2", width / 2, height / 2 + 20);
    text("> QUIT", width / 2, height / 2 + 50);
}

function drawLoseScreen() {
    // lose screen :(
    drawTerminalFrame();
    
    // top bar
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text("LEVEL ONE", 20, 12);
    
    fill(LIGHT);
    text("HP:" + player.hp, 235, 12); // should be zero but just in case :)
    text("LIVES:" + player.lives, 360, 12);
    
    // decorative divider line
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();
    
    // main body
    textAlign(CENTER, CENTER);
    
    fill(GOLD);
    textSize(24);
    text("LEVEL ONE", width / 2, height / 2 - 60);
    
    fill(LIGHT);
    textSize(16);
    text("YOU LOST", width / 2, height / 2 - 20);
    
    // extra options (also just visual for now)
    fill(TEAL);
    text("> RESTART", width / 2, height / 2 + 20);
    text("> QUIT", width / 2, height / 2 + 50);
}

// --------------------------------------------------
// SIMPLE EFFECT DRAWING
// --------------------------------------------------

function drawAttackEffect() {
    if (attackEffectTimer <= 0) return;

    push();

    // Slight flicker effect for more visual energy
    const offsetX = random(-2, 2);
    const offsetY = random(-2, 2);

    if (attackEffectType === "ATTACK") {
        // Slash image between player and enemy
        drawImageSafe(attackImg, 245 + offsetX, 115 + offsetY, 110, 110);
    }

    if (attackEffectType === "SPELL") {
        // Spell image between player and enemy
        drawImageSafe(spellImg, 255 + offsetX, 100 + offsetY, 95, 95);
    }

    pop();
}

// --------------------------------------------------
// RETRO UI FRAME
// --------------------------------------------------

function drawTerminalFrame() {
    // draw the basic terminal frame - a simple rectangle with a border for now, but we can add more details and decorations later to make it look cooler and more unique
    background(BG);

    // You can expand this later with scanlines or texture.
    stroke(TEAL);
    noFill();
    rect(1, 1, width - 2, height - 2);
    noStroke();
}

// --------------------------------------------------
// HELPER "TINT" APPROXIMATION
// Since these are vector shapes, this just changes fill behavior
// by using alternate colors rather than actual image tinting.
// --------------------------------------------------

function tintStyleFill(colorValue) {
    fill(colorValue);
}

function noTintStyle() {
     // Placeholder helper to keep the structure readable
}
