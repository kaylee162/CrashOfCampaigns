/*
    Crash of Campaigns - (final V) Dev Notes
    ---------------------------------------------

    PROJECT OVERVIEW:
    This is a retro-styled turn-based battle prototype built in p5.js.
    The game focuses on a tactical combat loop with multiple battle states,
    menu-driven actions, progressive encounters, and lightweight retro polish.

    CURRENT GAMEPLAY FEATURES:
    - Title screen with enemy preview selection
    - Instructions screen
    - Turn-based combat with a command menu
    - Four core actions: ATTACK, DEFEND, SPELL, HEAL
    - Spell submenu with multiple spell types
    - Level 1 with one enemy
    - Level 2 with two enemies at once
    - Target switching during multi-enemy battles
    - Enemy status effects like burn and weaken
    - Player defensive states like defend and barrier
    - Multi-turn spell setup with STARFALL
    - Spell log submenu with detailed spell descriptions and effects (press H)
    - Limited healing charges
    - Combat log for feedback
    - Win and lose screens
    - Retro generated sound effects for combat actions 

    COMBAT DESIGN NOTES:
    - ATTACK is the reliable direct damage option
    - DEFEND heavily reduces damage during the next enemy phase
    - HEAL restores HP with limited uses per level cycle
    - SPELL opens a submenu with specialized tools:
        FIREBLAST = direct damage + burn
        WEAKEN    = lowers enemy damage for several turns
        BARRIER   = defensive buff for multiple enemy phases
        STARFALL  = delayed spell that lands on the next player turn
    BTW these are accesible to the player inside the game if they press H while in the spell menu, 
    so you can check out the exact numbers and effects while inside the game

    GENERAL NOTES ON BALANCE AND COMBAT STUFF:
    - Combat values have been rebalanced so the game is now realistically winnable
    - Enemy damage spikes were reduced without removing challenge
    - Player attack and spell values were slightly improved
    - Healing restores more HP than earlier versions
    - Clearing Level 1 automatically advances the player to Level 2
    - Entering Level 2 restores player HP and resets heal charges to 3
    - Lives remain persistent between levels for progression stakes

    LEVEL STRUCTURE:
    - LEVEL 1 starts with one selected enemy, its pretty easy dont worry
    - LEVEL 2 spawns both an ogre and a dragon at once, this is a bit more difficult
      but i was able to beat it so its def possible
    - Killing all the enemies in level 2 leads to teh final win state

    VISUAL / UI NOTES:
    - The interface is styled like a chunky retro terminal
    - Important actions are shown in the combat log at the bottom
    - Defensive effects have visible indicators around the player
    - Targeted enemies get a gold triangle floating above them
    - Attack/spell effects briefly appear between combatants
    - Audio feedback now plays during attacks, spells, healing, and damage

    TECH NOTES:
    - Sound effects are generated through the browser Web Audio API so theres 
      no external sound files :)
    - Audio begins on first player input for browser compatibility
    - Core game remains lightweight and easy to run locally

    THINGS TO ADD RN:
    honestly I think we have a pretty solid and feature-complete prototype here. There are a few 
    thigns we could add for polish but I dont think its entirely neccessary
*/

// --------------------------------------------------
// GLOBAL GAME STATE
// --------------------------------------------------

// the master state for the whole game.
// This controls which screen gets drawn and which input handler is used.
let gameState = "TITLE";

// the sep battle UI model. This controls whether the main command list or the spell submenu is shown.
let battleScreenMode = "COMMAND"; // "COMMAND" or "SPELL_MENU"

// These keep track of where the player is hovering in each menu
let titleMenuIndex = 0;
let battleMenuIndex = 0;
let spellMenuIndex = 0;

// Options shown on the title screen
const titleOptions = [
    "VIEW INSTRUCTIONS",
    "PLAY GAME"
];

// Main battle menu options
const battleOptions = [
    "ATTACK",
    "DEFEND",
    "SPELL",
    "HEAL"
];

// each spell is different and does somethign super cool 
const spellOptions = [
    "FIREBLAST",   // Direct damage + burn over time
    "WEAKEN",      // Reduces enemy attack output for a few turns
    "BARRIER",     // Gives the player extra protection
    "STARFALL"     // Charges now, lands later
];

// the main combat entities
let player;
let enemies = [];

// tracks current progression (l1 or l2)
let currentLevel = 1;

// enemy preview choice from the title screen
// this determines the Level 1 opponent
let selectedEnemyType = "DRAGON";

// which enemy the player is currently targeting
let activeTargetIndex = 0;

// small scrolling list of recent battle events
// new messages are added to the front
let combatLog = [];

// A short delay used between player and enemy actions
let enemyTurnTimer = 0;

// brief flash timers for hit feedback
let playerFlashTimer = 0;
let attackEffectTimer = 0;

// Stores what kind of attack effect should currently be drawn
let attackEffectType = "";

// --------------------------------------------------
// SIMPLE GENERATED SOUND EFFECTS
// --------------------------------------------------

// These use the browser's built-in Web Audio API.
// That means we do not need mp3/wav files or the p5.sound library.
// The sounds are tiny retro-style blips that work well with the arcade vibe.
let audioCtx = null;

function ensureAudioStarted() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

function playTone(freq, duration, type = "square", volume = 0.08) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playAttackSound() {
    // short slashy arcade sound
    playTone(240, 0.07, "square", 0.08);
    setTimeout(() => playTone(160, 0.05, "square", 0.05), 45);
}

function playSpellSound() {
    // brighter magical blip
    playTone(440, 0.08, "triangle", 0.07);
    setTimeout(() => playTone(660, 0.09, "triangle", 0.06), 55);
}

function playHealSound() {
    // soft upward healing sound
    playTone(330, 0.08, "sine", 0.06);
    setTimeout(() => playTone(520, 0.1, "sine", 0.06), 70);
}

function playHitSound() {
    // low damage thud
    playTone(120, 0.08, "sawtooth", 0.07);
}

// small status label near the bottom
let actionBanner = "";

// --------------------------------------------------
// VISUAL STYLE CONSTANTS
// --------------------------------------------------

// Retro terminal-like color palette
// These are used across menus, UI, and effects
const BG = "#000000";
const GOLD = "#c6b96b";
const TEAL = "#1f5c5d";
const BRIGHT_TEAL = "#2b8b8d";
const LIGHT = "#a8b4ae";
const RED = "#c65f5f";
const GREEN = "#7abf88";
const PURPLE = "#9a7fd1";
const ORANGE = "#d58a45";

// fixed canvas size for a retro boxed-in feel
const CANVAS_W = 640;
const CANVAS_H = 480;

// --------------------------------------------------
// ASSET VARIABLES
// --------------------------------------------------

// sprite/image assets
// rf one fails to load, drawImageSafe() will show a fallback box instead
let knightImg;
let dragonImg;
let ogreImg;
let attackImg;
let spellImg;
let pixFont;

// --------------------------------------------------
// P5 PRELOAD
// --------------------------------------------------

// preload() runs before setup()
// this is the safest place to load images and fonts before the game starts
function preload() {
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

    pixFont = loadFont(
        "assets/pixelmix.ttf",
        () => console.log("pix font loaded"),
        (err) => console.error("pix font failed:", err)
    );
}

// setup creates the canvas, applies the font, sets drawing behavior,
// and initializes the game state
function setup() {
    createCanvas(CANVAS_W, CANVAS_H);

    // use the custom font if it loaded correctly
    // Otherwise fall back to monospace so the game still works 
    if (pixFont) {
        textFont(pixFont);
    } else {
        console.error("Custom font failed to load, using default monospace font");
        textFont("monospace");
    }

    imageMode(CORNER);
    noSmooth(); // Keeps pixel art crispy instead of blurry :)
    resetGame();
}

// --------------------------------------------------
// RESET / ENCOUNTER SETUP
// --------------------------------------------------

// resets the whole run back to a clean starting state
function resetGame() {
    // player stats and temporary battle state all live here
    player = {
        name: "PLAYER",
        hp: 100,
        maxHp: 100,
        lives: 2,
        defendTurns: 0, // active for the next enemy phase
        barrierTurns: 0, // spell-based defense that lasts longer
        healUses: 3,
        pendingSpell: null // used for delayed spells like STARFALL
    };

    currentLevel = 1;
    setupLevel(currentLevel);

    // reset UI positions and transient visual state
    battleMenuIndex = 0;
    spellMenuIndex = 0;
    battleScreenMode = "COMMAND";
    activeTargetIndex = 0;
    combatLog = [];
    enemyTurnTimer = 0;
    playerFlashTimer = 0;
    attackEffectTimer = 0;
    attackEffectType = "";
    actionBanner = "";

    // starting logs to set the scene and confirm everything is ready
    addLog("> SYSTEM READY");
    addLog("> ENCOUNTER LOADED");
    addLog(`> LEVEL ${currentLevel} START`);
}

// sets up enemies for the level
//    Level 1 is a single selected enemy
//    Level 2 is a 2-enemy fight
function setupLevel(levelNumber) {
    currentLevel = levelNumber;

    if (currentLevel === 1) {
        enemies = [createEnemy(selectedEnemyType, 1)];
        addLog(`> ${enemies[0].name} APPEARS`);
    } else {
        // Level 2 is intentionally busier and more tactical
        // The player now has to think about target priority,
        // status effects, and whether defending right now is worth it
        enemies = [
            createEnemy("OGRE", 2),
            createEnemy("DRAGON", 2)
        ];
        addLog("> MULTIPLE HOSTILES DETECTED");
        addLog("> OGRE AND DRAGON ENTER BATTLE");
    }

    // makes sure the selected target points at a living enemy 
    clampTargetToLivingEnemy();
}

// cactory function for creating enemy objects
// keeps enemy setup consistent and avoids duplicating the same object shape
function createEnemy(type, levelNumber) {
    // sets up the base stats and behavior flags for the ogre
    if (type === "OGRE") {
        return {
            type: "OGRE",
            name: levelNumber === 1 ? "OGRE" : "OGRE BRUTE",
            hp: levelNumber === 1 ? 65 : 80, // a little more HP in Level 2 to keep the fight feeling tough without being overwhelming
            maxHp: levelNumber === 1 ? 65 : 80, // maxHp is used for healing and UI, so it needs to be set separately from hp
            minDamage: levelNumber === 1 ? 8 : 9, // the ogre is a bit stronger in Level 2, but not as much as the dragon
            maxDamage: levelNumber === 1 ? 15 : 17, 
            weakTurns: 0, // debuff duration
            burnTurns: 0, // damage-over-time duration
            flashTimer: 0, // hit flash visual
            chargingHeavy: false, // ogre-specific heavier attack wind-up
            alive: true
        };
    }

    // sets up the base stats and behavior flags for the dragon
    return {
        type: "DRAGON",
        name: levelNumber === 1 ? "DRAGON" : "DRAGON WARDEN",
        hp: levelNumber === 1 ? 78 : 92, // the dragon is tougher in both levels, but especially in Level 2 where it has to be the star of the show
        maxHp: levelNumber === 1 ? 78 : 92, // maxHp is used for healing and UI, so it needs to be set separately from hp
        minDamage: levelNumber === 1 ? 10 : 11, // the dragon is stronger than the ogre in both levels, and gets a bigger boost in Level 2 to keep the fight feeling intense
        maxDamage: levelNumber === 1 ? 17 : 19, 
        weakTurns: 0, // debuff duration
        burnTurns: 0, // damage-over-time duration
        flashTimer: 0, // hit flash visual
        chargingHeavy: false, // not used by the dragon 
        alive: true
    };
}


// --------------------------------------------------
// MAIN DRAW LOOP
// --------------------------------------------------

// draw() runs every frame
// It updates lightweight timers, resolves delayed enemy turns, and draws the correct screen for the current game state
function draw() {
    background(BG);

    // tick down timers every frame.
    if (enemyTurnTimer > 0) enemyTurnTimer--;
    if (playerFlashTimer > 0) playerFlashTimer--;
    if (attackEffectTimer > 0) attackEffectTimer--;

    // each enemy has its own hit flash timer
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].flashTimer > 0) {
            enemies[i].flashTimer--;
        }
    }

    // when the enemy timer hits this point, enemy actions resolve
    // The one-frame delay keeps the turn flow readable and gives the player a moment to see their chosen action before the enemies respond
    if (gameState === "PLAYING" && enemyTurnTimer === 1) {
        handleEnemyTurnSequence();
    }

    // draw the correct screen for the current state
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

// central keyboard router that sends input to the correct handler based on game state
// each screen gets its own handler so the logic stays organized
function keyPressed() {
    // sound
    ensureAudioStarted();

    if (gameState === "TITLE") {
        handleTitleInput();
    } else if (gameState === "INSTRUCTIONS") {
        handleInstructionsInput();
    } else if (gameState === "PLAYING") {
        handleBattleInput();
    } else if (gameState === "WIN" || gameState === "LOSE") {
        handleEndInput();
    }
}

// handles title screen navigation
// Up/down changes menu choice, left/right previews enemy type, enter confirms
function handleTitleInput() {
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        titleMenuIndex = max(0, titleMenuIndex - 1);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        titleMenuIndex = min(titleOptions.length - 1, titleMenuIndex + 1);
    }

    // this changes which enemy appears in Level 1
    if (keyCode === LEFT_ARROW || key === "a" || key === "A") {
        selectedEnemyType = "OGRE";
    } else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") {
        selectedEnemyType = "DRAGON";
    }

    // confirm menu choice
    if (keyCode === ENTER || keyCode === RETURN) {
        if (titleMenuIndex === 0) {
            gameState = "INSTRUCTIONS";
        } else if (titleMenuIndex === 1) {
            resetGame();
            gameState = "PLAYING";
        }
    }
}

// instructions screen is simple
// any of the main confirm or cancel keys return to the title screen
function handleInstructionsInput() {
    if (keyCode === ENTER || keyCode === RETURN || keyCode === ESCAPE) {
        gameState = "TITLE";
    }
}

// handles all battle-screen input
// Input is blocked while the enemy turn timer is active
function handleBattleInput() {
    if (enemyTurnTimer > 0) return;

    // Only allow target swapping from the main command screen
    if (battleScreenMode === "COMMAND") {
        if (keyCode === LEFT_ARROW || key === "a" || key === "A") {
            moveTarget(-1);
            return;
        } else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") {
            moveTarget(1);
            return;
        }
    }

    // if the spell menu is open, only allow input relevant to that menu
    if (battleScreenMode === "SPELL_MENU") {
        handleSpellMenuInput();
        return;
    }

    // normal command menu movemen.
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        battleMenuIndex = max(0, battleMenuIndex - 1);
        playTone(300, 0.03, "square", 0.04);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        battleMenuIndex = min(battleOptions.length - 1, battleMenuIndex + 1);
        playTone(300, 0.03, "square", 0.04);
    }

    // confirm the command
    if (keyCode === ENTER || keyCode === RETURN) {
        const chosenAction = battleOptions[battleMenuIndex];

        // if the player chose SPELL, open the spell submenu instead of resolving an action immediately
        if (chosenAction === "SPELL") {
            battleScreenMode = "SPELL_MENU";
            spellMenuIndex = 0;
        } else {
            handlePlayerAction(chosenAction); // else handle regular actions like ATTACK, DEFEND, and HEAL
        }
    }
}

// handles input specifically inside the spell submenu
function handleSpellMenuInput() {
  // show spell help when pressing H
  if (key === "h" || key === "H") {
    showSpellHelp();
    return;
  }
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        spellMenuIndex = max(0, spellMenuIndex - 1);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        spellMenuIndex = min(spellOptions.length - 1, spellMenuIndex + 1);
    }

    // escape backs out of the spell menu without casting
    if (keyCode === ESCAPE) {
        battleScreenMode = "COMMAND";
        return;
    }

    // confirm the spell choice and resolve the spell action, then return to the main command menu
    if (keyCode === ENTER || keyCode === RETURN) {
        const chosenSpell = spellOptions[spellMenuIndex];
        handleSpellAction(chosenSpell);
        battleScreenMode = "COMMAND";
    }
}

// handles input on the win/lose screens
// enter returns to the title screen
function handleEndInput() {
    if (keyCode === ENTER || keyCode === RETURN) {
        gameState = "TITLE";
        titleMenuIndex = 0;
    }
}

// --------------------------------------------------
// COMBAT HELPERS
// --------------------------------------------------

// returns the currently targeted living enemy
// clampTargetToLivingEnemy() is called first so this stays valid
function getActiveEnemy() {
    clampTargetToLivingEnemy();
    return enemies[activeTargetIndex];
}

// returns a new array containing only enemies that are still alive
function getLivingEnemies() {
    return enemies.filter((enemy) => enemy.alive && enemy.hp > 0);
}

// returns true if all enemies have been defeated.
function allEnemiesDefeated() {
    return getLivingEnemies().length === 0;
}

// makes sure activeTargetIndex points at a living enemy
// this prevents weird targeting issues when an enemy dies or when the player tries to switch targets in a multi-enemy fight
function clampTargetToLivingEnemy() {
    const living = getLivingEnemies();
    if (living.length === 0) return;

    // if current target is invalid or dead, find the first living enemy
    if (!enemies[activeTargetIndex] || !enemies[activeTargetIndex].alive) {
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].alive) {
                activeTargetIndex = i;
                return;
            }
        }
    }
}

// moves the target left or right through living enemies only
function moveTarget(direction) {
    if (getLivingEnemies().length <= 1) return;

    let tries = 0;
    let newIndex = activeTargetIndex;

    // loop through the enemies in the chosen direction until we find a living one, or we've looped through all of them
    while (tries < enemies.length) {
        newIndex = (newIndex + direction + enemies.length) % enemies.length; // wrap around the enemy list
        if (enemies[newIndex].alive) { 
            activeTargetIndex = newIndex; // update the active target index to the new living enemy
            addLog(`> TARGET: ${enemies[newIndex].name}`); // add log entry for target change
            return;
        }
        tries++;
    }
}

// applies damage to an enemy, handles hit flash, adds combat log entries, and marks them dead if needed
function damageEnemy(enemy, dmg, logPrefix = "> HIT") {
    enemy.hp = max(0, enemy.hp - dmg); // don't let HP go negative for cleaner UI and logic
    enemy.flashTimer = 12; // this timer triggers a brief flash effect in the draw loop to give feedback that the enemy was hit
    addLog(logPrefix); 
    addLog(`> ${enemy.name} -${dmg} HP`);

    // if the enemy's HP has dropped to 0 or below, mark them as dead and add a log entry
    if (enemy.hp <= 0) {
        enemy.alive = false;
        addLog(`> ${enemy.name} DOWN`);
        clampTargetToLivingEnemy();
    }
}

// heals the player and logs the actual amount restored. healing is capped at the max hp
function healPlayer(amount) {
    const oldHp = player.hp;
    player.hp = min(player.maxHp, player.hp + amount); // don't let HP go above max
    const healed = player.hp - oldHp;
    addLog("> HEAL PROTOCOL ACTIVATED");
    addLog(`> PLAYER +${healed} HP`);
}

// starts the enemy phase unless the battle is already over
function queueEnemyPhase() {
    // if the player action just defeated the last enemy, skip the enemy phase and go straight to the victory state
    if (allEnemiesDefeated()) { 
        finishEncounterOrAdvance();
        return;
    }

    enemyTurnTimer = 45; // this timer is counted down in the draw loop, and when it hits 1 the enemies will act (creates a lil pause)
}

// Handles what happens when an encounter ends
//    clear Level 1 -> start Level 2 and give some HP back
//    clear Level 2 -> win screen
function finishEncounterOrAdvance() {
    if (currentLevel === 1) {
        addLog("> LEVEL ONE CLEARED");

        currentLevel = 2;
        setupLevel(2);

        // level 2 is the real boss fight, so we refill the players core resources
        // lives stay untouched so level 1 still matters, but the player gets back the healing
        // and their hp points restored to 100. reset all the other stats too, like defend and barrier
        player.hp = player.maxHp;
        player.healUses = 3;
        player.defendTurns = 0;
        player.barrierTurns = 0;
        player.pendingSpell = null;

        //log the new level
        addLog("> PLAYER FULLY STABILIZED");
        addLog("> HEALS RESTORED TO 3");
        return;
    }

    gameState = "WIN";
}

// applies player effects that happen at the start of the player's turn
// Right now this is mainly used for STARFALL
function processPlayerStartOfTurnEffects() {
    // STARFALL is delayed by one turn
    // The player commits to it first, then it resolves automatically before their next normal action
    if (player.pendingSpell === "STARFALL") {
        const target = getActiveEnemy();
        if (target) {
            const dmg = floor(random(26, 39));
            attackEffectTimer = 24;
            attackEffectType = "STARFALL";
            playSpellSound();
            addLog("> STARFALL RESOLVES");
            damageEnemy(target, dmg, "> COSMIC IMPACT");
        }
        player.pendingSpell = null;
    }
}

// applies status effects on an enemy before that enemy acts
// burn deals damage, weaken duration also ticks down
function processEnemyStatusEffects(enemy) {
    if (!enemy.alive) return;

    // if the enemy is burning, apply burn damage and tick down the burn duration
    if (enemy.burnTurns > 0) {
        const burnDamage = 5;
        enemy.burnTurns--;
        addLog(`> ${enemy.name} BURNING`);
        damageEnemy(enemy, burnDamage, "> BURN DAMAGE");
    }

    // if the enemy is weakened, tick down the weaken duration 
    // The actual damage reduction is handled in performEnemyAction() so it applies correctly even if the enemy dies from burn or other effects first
    if (enemy.weakTurns > 0 && enemy.alive) {
        enemy.weakTurns--;
        if (enemy.weakTurns === 0) {
            addLog(`> ${enemy.name} RECOVERS`);
        }
    }
}

// --------------------------------------------------
// COMBAT ACTIONS
// --------------------------------------------------

// handles non-spell player commands from the main battle menu
function handlePlayerAction(action) {
    processPlayerStartOfTurnEffects();
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    const target = getActiveEnemy();
    if (!target) return;

    // each action type has its own block here to keep the logic separate and clear
    if (action === "ATTACK") {
        const dmg = floor(random(12, 19));
        attackEffectTimer = 20;
        attackEffectType = "ATTACK";
        actionBanner = "SLASH";

        // attack sound
        playAttackSound();

        addLog("> PLAYER ATTACKED");
        damageEnemy(target, dmg);
    }

    // else if instead of switch because we only have a few actions, and this way we can keep the logic for each action nicely 
    // contained in its own block without needing to break out into separate functions
    else if (action === "DEFEND") {
        // defend protects against the next enemy phase
        player.defendTurns = 1;
        actionBanner = "GUARD";
        addLog("> PLAYER DEFENDED");
        addLog("> NEXT ENEMY PHASE HEAVILY REDUCED");
    }

    else if (action === "HEAL") {
        // no heal spam allowed  
        if (player.healUses <= 0) {
            addLog("> NO HEAL CHARGES LEFT");
            //error sound when you run out of heals
            playTone(250, 0.07, "triangle", 0.06);
            return;
        }

        player.healUses--; // decrement the heal count before applying the heal so the log shows the updated count
        const healAmount = floor(random(28, 41));
        actionBanner = "HEAL";

        // heal sound
        playHealSound();

        healPlayer(healAmount);
        addLog(`> HEALS LEFT: ${player.healUses}`);
    }

    // spells are more complex, so they have their own handler and submenu. This just routes to that
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }
    // after handling the player's action, we need to check if the enemies are all defeated before queuing the enemy phase
    // because some spells can kill an enemy without doing direct damage (like weaken), and we don't want to let the enemies take a turn if they've already lost
    queueEnemyPhase();
}

// handles spell submenu choices.
function handleSpellAction(spellName) {
    processPlayerStartOfTurnEffects();
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    const target = getActiveEnemy();
    if (!target) return;

    // fireblast is a strong direct damage spell with a burn effect that lasts for a few turns
    // It's the most straightforward offensive spell
    if (spellName === "FIREBLAST") {
        const hit = random() < 0.9;
        attackEffectTimer = 20;
        attackEffectType = "SPELL";
        actionBanner = "FIREBLAST";
        addLog("> PLAYER CAST FIREBLAST");
        // add soung
        playSpellSound();

        if (hit) {
            const dmg = floor(random(18, 27));
            damageEnemy(target, dmg, "> FIRE HIT");
            if (target.alive) {
                target.burnTurns = 2;
                addLog(`> ${target.name} BURNING FOR 2 TURNS`);
            }
        } else {
            addLog("> SPELL MISSED");
        }
    }

    // weaken is a debuff spell that reduces the enemy's damage output for a few turns
    // It doesn't do direct damage, but it can be really helpful for mitigating tough enemy phases, 
    // especially in Level 2 when there are multiple enemies hitting the player each turn.
    else if (spellName === "WEAKEN") {
        attackEffectTimer = 18;
        attackEffectType = "SPELL";
        actionBanner = "WEAKEN";
        playSpellSound();
        target.weakTurns = 4;
        addLog("> PLAYER CAST WEAKEN");
        addLog(`> ${target.name} ATTACK DOWN FOR 4 TURNS`);
    }

    // barrier is a defensive buff that reduces incoming damage for multiple enemy phases
    else if (spellName === "BARRIER") {
        attackEffectTimer = 18;
        attackEffectType = "BARRIER";
        actionBanner = "BARRIER";
        playSpellSound();
        player.barrierTurns = 3; // lasts for 3 enemy phases
        addLog("> PLAYER CAST BARRIER");
        addLog("> DEFENSE BOOSTED FOR 3 ENEMY PHASES");
    }

    // starfall is a powerful delayed spell that lands at the start of the player's next turn
    else if (spellName === "STARFALL") {
        attackEffectTimer = 16;
        attackEffectType = "CHARGE";
        actionBanner = "CHARGE";
        playSpellSound();
        player.pendingSpell = "STARFALL";
        addLog("> PLAYER BEGINS STARFALL");
        addLog("> SPELL WILL LAND NEXT TURN");
    }

    // if all enemies are defeated after the spell effect, skip the enemy phase and go straight to the victory state
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    // after handling the player's spell action, we need to check if the enemies are all defeated before queuing the enemy phase
    queueEnemyPhase();
}

// resolves the enemy phase
// each living enemy processes status effects first, then acts
function handleEnemyTurnSequence() {
    const livingEnemies = getLivingEnemies();

    // for each living enemy, process their status effects and then perform their action if they're still alive after the effects resolve
    for (let i = 0; i < livingEnemies.length; i++) {
        const enemy = livingEnemies[i];

        // burn and other pre-turn status effects happen first
        // This lets a status effect finish an enemy off before it gets to attack
        processEnemyStatusEffects(enemy);
        if (!enemy.alive) continue;

        performEnemyAction(enemy);

        if (gameState === "LOSE") {
            return;
        }
    }

    // these defensive effects are meant to cover the enemy phase, so they tick down after all enemies have acted
    if (player.defendTurns > 0) player.defendTurns--;
    if (player.barrierTurns > 0) player.barrierTurns--;
}

// handles one enemy's action logic
// enemy behavior is still pretty lightweight, but Level 2 adds a little spice
function performEnemyAction(enemy) {
    addLog(`> ${enemy.name} INITIATED TURN`);

    let dmg = floor(random(enemy.minDamage, enemy.maxDamage + 1));

    // Ogre behavior:
    // In Level 2 the ogre can sometimes spend a turn winding up for a stronger follow-up attack
    if (enemy.type === "OGRE") {
        if (enemy.chargingHeavy) {
            dmg += 5; // the heavy attack does extra damage
            enemy.chargingHeavy = false;
            addLog(`> ${enemy.name} USES CRUSHING BLOW`);
        } else if (currentLevel >= 2 && random() < 0.18) {
            // the ogre starts charging, which doesn't do damage this turn but makes the next attack stronger
            // This adds a bit of unpredictability and forces the player to decide whether to defend against a possible heavy attack or risk taking a normal hit.
            enemy.chargingHeavy = true;
            addLog(`> ${enemy.name} IS WINDING UP`);
            return;
        }
    }

    // Dragon behavior:
    // Occasionally adds extra fire damage in Level 2
    if (enemy.type === "DRAGON" && currentLevel >= 2 && random() < 0.2) {
        dmg += 3; // the dragon's fire breath adds extra damage
        addLog(`> ${enemy.name} BREATHES FIRE`);
    }

    // weaken lowers outgoing damage
    if (enemy.weakTurns > 0) {
        dmg = max(1, floor(dmg * 0.7));
        addLog(`> ${enemy.name} WEAKENED`);
    }

    // DEFEND is the heavy reduction
    if (player.defendTurns > 0) {
        dmg = max(1, floor(dmg * 0.25));
        addLog("> DEFEND ABSORBED MOST OF THE HIT");
    }

    // BARRIER stacks afterward as an additional reduction layer
    if (player.barrierTurns > 0) {
        dmg = max(1, floor(dmg * 0.65));
        addLog("> BARRIER REDUCED DAMAGE FURTHER");
    }

    // apply the damage to the player, trigger hit flash, and add log entries
    player.hp -= dmg;
    playerFlashTimer = 12;
    playHitSound();
    addLog("> PLAYER HIT");
    addLog(`> PLAYER -${dmg} HP`);

    // handle life loss and defeat
    if (player.hp <= 0) {
        // player loses a life and either respawns or gets defeated if they were on their last life
        player.lives -= 1;

        // player loses the game if they run out of lives, even if they have some HP left from a heal or barrier
        if (player.lives <= 0) {
            player.hp = 0;
            gameState = "LOSE";
            return;
        } else {
            // Soft respawn with a log entry, but no full reset so the player can keep fighting with their remaining lives
            addLog("> LIFE LOST");
            addLog("> PLAYER REBOOTS");
            player.hp = 60;
            // respawn clears defend and barrier since those are meant to be used for single enemy phases, and it 
            // would be weird if the player could stockpile them across lives
            player.defendTurns = 0;
            player.barrierTurns = 0;
            player.pendingSpell = null;
        }
    }
}

// adds a new entry to the top of the combat log
// The log is capped so it does not grow forever and cover the whole UI
function addLog(message) {
    combatLog.unshift(message);

    if (combatLog.length > 6) {
        combatLog.pop();
    }
}

//yay spellbook!
function showSpellHelp() {
  const spell = spellOptions[spellMenuIndex];
  //clear old logs 
  combatLog =[];

    if (spell === "FIREBLAST") {
        addLog("> ~90% HIT CHANCE");
        addLog("> +BURN (5 DAMAGE OVER 2 TURNS)");
        addLog("> 18-26 DAMAGE");
    } 
    else if (spell === "WEAKEN") {
        addLog("> NO DIRECT DAMAGE DEALT");
        addLog("> LASTS 4 TURNS");
        addLog("> REDUCES ENEMY DAMAGE BY 30%");
    } 
    else if (spell === "BARRIER") {
        addLog("> STACKS W/ DEFEND");
        addLog("> LASTS 3 ENEMY TURNS");
        addLog("> REDUCES DAMAGE TAKEN BY 35%");
    } 
    else if (spell === "STARFALL") {
        addLog("> ALWAYS HITS TARGET");
        addLog("> DELAYED 1 TURN");
        addLog("> HIGH DAMAGE, REQUIRES SETUP");
        addLog("> 26-38 DAMAGE");
    }
}

// --------------------------------------------------
// SAFE IMAGE DRAWING
// --------------------------------------------------

// draws an image if it exists
// if the asset failed to load, draw a placeholder box instead (just so it doesn't crash the whole game)
function drawImageSafe(img, x, y, w, h) {
    if (img) {
        image(img, x, y, w, h);
    } else {
        fill(TEAL);
        rect(x, y, w, h);
        fill(LIGHT);
        textSize(12);
        text("MISSING", x + 10, y + 10);
    }
}

// --------------------------------------------------
// DRAWING: TITLE SCREEN
// --------------------------------------------------

// draws the title screen and menu
function drawTitleScreen() {
    drawTerminalFrame();

    // title 
    fill(GOLD);
    textAlign(CENTER, TOP);
    textSize(32);
    text("CRASH OF CAMPAIGNS", width / 2, 60);

    // enemy preview text
    fill(LIGHT);
    textSize(16);
    text(`ENEMY: ${selectedEnemyType}`, width / 2, 150);

    // menu options
    textAlign(LEFT, TOP);
    textSize(22);

    // Draw each title menu option.
    for (let i = 0; i < titleOptions.length; i++) {
        if (i === titleMenuIndex) {
            fill(BRIGHT_TEAL);
            text("> " + titleOptions[i] + "_", 60, 240 + i * 52);
        } else {
            fill(TEAL);
            text("> " + titleOptions[i], 60, 240 + i * 52);
        }
    }

    // draw knight preview on title screen
    // make it line up better with the title menu
    drawImageSafe(knightImg, 455, 220, 110, 155);

    // enter to select prompt at the bottom
    fill(LIGHT);
    textSize(14);
    text("ENTER TO SELECT", 60, 410);
}

// --------------------------------------------------
// DRAWING: INSTRUCTIONS SCREEN
// --------------------------------------------------

// draws the instructions page
// Mostly just a formatted block of control/help text
function drawInstructionsScreen() {
    drawTerminalFrame();

    // title instructions
    fill(GOLD);
    textAlign(CENTER, TOP);
    textSize(28);
    text("INSTRUCTIONS", width / 2, 35);

    // divider line
    stroke(TEAL);
    line(70, 85, width - 70, 85);
    noStroke();

    fill(LIGHT);
    textAlign(LEFT, TOP);
    textSize(16);

    // instructions are stored in an array so they can be easily formatted with line breaks 
    // and spacing without needing a bunch of separate text() calls or weird newline characters
    const instructions = [
        "TURN-BASED COMBAT PROTOTYPE.",
        "",
        "BATTLE CONTROLS:",
        "W/S OR UP/DOWN  -> MOVE CURSOR",
        "ENTER           -> CONFIRM CHOICE",
        "ESC             -> CLOSE SPELL SUBMENU",
        "H               -> SPELL INFO (IN SPELL SUBMENU)",
        "A/D OR LEFT/RIGHT -> SWITCH TARGET IN MULTI-ENEMY",
        "BATTLES",
        "",
        "COMMANDS:",
        "ATTACK  -> RELIABLE DAMAGE",
        "DEFEND  -> GREATLY REDUCES NEXT ENEMY PHASE",
        "SPELL   -> OPEN SPELL SUBMENU",
        "HEAL    -> RESTORE HP, BUT LIMITED USES",
        "",
        "LEVEL 2 INCLUDES MULTIPLE ENEMIES.",
        "PRESS ENTER TO RETURN"
        ];

    // draw each line of instructions with some spacing
    for (let i = 0; i < instructions.length; i++) {
        text(instructions[i], 45, 110 + i * 22);
    }
}

// --------------------------------------------------
// DRAWING: MAIN BATTLE SCREEN
// --------------------------------------------------

// main battle renderer
// broken into smaller draw helpers so this does not become a terrifying blob
function drawBattleScreen() {
    drawTerminalFrame();
    drawBattleHud();
    drawBattleSceneDivider();
    drawBattleCharacters();
    drawAttackEffect();
    drawBattleMenu();
    drawCombatLog();
    drawStatusBanner();
}

// top HUD bar for level, HP, lives, and heal count
function drawBattleHud() {
    // level display on the left
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text(`LEVEL ${currentLevel}`, 20, 12);

    //  player stats on the right
    fill(LIGHT);
    text(`HP:${player.hp}/${player.maxHp}`, 180, 12);
    text(`LIVES:${player.lives}`, 360, 12);
    text(`HEALS:${player.healUses}`, 500, 12);

    // divider line under the HUD
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();
}

// divider line between battle scene and lower UI area
function drawBattleSceneDivider() {
    stroke(TEAL);
    line(0, 220, width, 220);
    noStroke();
}

// draws the player, enemies, status indicators, and target boxes
function drawBattleCharacters() {
    const playerHitFlash = playerFlashTimer > 0 && frameCount % 6 < 3;

    // player name
    fill(TEAL);
    textAlign(LEFT, TOP);
    textSize(18);
    text(player.name, 45, 78);

    // draw player sprite with flash feedback if recently hit
    push();
    if (playerHitFlash) {
        tint(255, 180);
    } else {
        noTint();
    }
    drawImageSafe(knightImg, 45, 105, 110, 110);
    pop();

    // draw a visible defensive state around the player
    // This helps the player actually see when DEFEND or BARRIER is active
    if (player.defendTurns > 0 || player.barrierTurns > 0) {
        noFill();
        stroke(player.defendTurns > 0 ? GREEN : PURPLE);
        strokeWeight(3);
        rect(38, 98, 124, 124);
        strokeWeight(1);
        noStroke();

        // text indicator for the type of defense active
        fill(player.defendTurns > 0 ? GREEN : PURPLE);
        textSize(14);
        text(player.defendTurns > 0 ? "GUARDING" : "BARRIER", 36, 228);
    }

    // draw enemies from left to right
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.alive) continue;

        const isTargeted = i === activeTargetIndex;
        const enemyHitFlash = enemy.flashTimer > 0 && frameCount % 6 < 3;

        // positioning varies a little so the two-enemy layout fits better
        let drawX = i === 0 ? 320 : 455;
        let drawY = i === 0 ? 78 : 96;
        let drawW = enemy.type === "DRAGON" ? 165 : 135;
        let drawH = enemy.type === "DRAGON" ? 130 : 135;

        fill(TEAL);
        textSize(16);
        text(enemy.name, drawX, 58);
        text(`HP:${enemy.hp}`, drawX, 78);

        // Draw active status effects under enemy HP
        if (enemy.burnTurns > 0) {
            fill(ORANGE);
            text(`BURN:${enemy.burnTurns}`, drawX, 96);
        }

        if (enemy.weakTurns > 0) {
            fill(PURPLE);
            text(`WEAK:${enemy.weakTurns}`, drawX, 112);
        }

        // Draw enemy sprite with hit flash if needed
        push();
        if (enemyHitFlash) {
            tint(255, 180);
        } else {
            noTint();
        }

        // the dragon sprite is a little bigger and needs to be positioned differently to fit in the layout, 
        // so we have separate draw calls for each enemy type.
        if (enemy.type === "DRAGON") {
            drawImageSafe(dragonImg, drawX, drawY + 24, drawW, drawH);
        } else {
            drawImageSafe(ogreImg, drawX, drawY + 18, drawW, drawH);
        }
        pop();

        // floating target marker instead of a full box frame
        // this feels more arcade-like and keeps the art less boxed in
        if (isTargeted) {
            drawFloatingTargetMarker(drawX, drawY + 24, drawW);

            fill(GOLD);
            text("> TARGET <", drawX, drawY + drawH + 32);
        }
    }
}

// draws a floating target marker instead of a big frame box
// this keeps the retro vibe but looks way less heavy on the screen
function drawFloatingTargetMarker(x, y, w) {
    push();

    // make it bob a tiny bit so it feels alive
    const bobY = sin(frameCount * 0.12) * 4;

    fill(GOLD);
    noStroke();

    // small downward-pointing triangle above the enemy
    triangle(
        x + w / 2, y - 10 + bobY,
        x + w / 2 - 10, y - 26 + bobY,
        x + w / 2 + 10, y - 26 + bobY
    );

    pop();
}

// draws either the normal battle command list or the spell submenu
function drawBattleMenu() {
    textAlign(LEFT, TOP);
    textSize(16);

    // the main command menu and spell submenu share some layout and styling, so they are drawn in the same 
    // function with some conditional logic to switch between them
    if (battleScreenMode === "COMMAND") {
        for (let i = 0; i < battleOptions.length; i++) {
            const y = 248 + i * 26;

            if (i === battleMenuIndex && enemyTurnTimer === 0) {
                fill(GOLD);
                text("> " + battleOptions[i], 24, y);
            } else {
                fill(LIGHT);
                text("> " + battleOptions[i], 24, y);
            }
        }
    } else {
        // spell submenu has a different set of options and a header, but the selection logic is the same
        fill(GOLD);
        text("SPELL BOOK", 24, 248);

        for (let i = 0; i < spellOptions.length; i++) {
            const y = 276 + i * 22;

            if (i === spellMenuIndex) {
                fill(PURPLE);
                text("> " + spellOptions[i] + "_", 24, y);
            } else {
                fill(LIGHT);
                text("> " + spellOptions[i], 24, y);
            }
        }

        fill(TEAL);
        text("ESC: BACK | H: INFO", 24, 372); // cancel prompt for speell menu and hint for how to access spell info
    }

    // shown while waiting for the enemy phase to resolve
    if (enemyTurnTimer > 0) {
        fill(BRIGHT_TEAL);

        // shifted lower so it doesn't bump into the action list
        text("> ENEMY THINKING...", 24, 362);
    }
}

// draws the rolling combat log
function drawCombatLog() {
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(15);

    // draw each line of the combat log with some spacing
    for (let i = 0; i < combatLog.length; i++) {
        text(combatLog[i], 250, 320 + i * 20);
    }
}

// small status text near the bottom. used for delayed spell info and the last action performed
function drawStatusBanner() {
    fill(TEAL);
    textAlign(LEFT, TOP);
    textSize(14);

    // if the player has a pending delayed spell, show it here
    if (player.pendingSpell === "STARFALL") {
        text("PENDING: STARFALL", 24, 390);
    }
    // after an action is taken, show a brief banner of what the last action was
    // This gives feedback on what the player just did without needing to parse the combat log text.
    if (actionBanner !== "") {
        text(`LAST ACTION: ${actionBanner}`, 24, 412);
    }
}

// --------------------------------------------------
// DRAWING: WIN / LOSE
// --------------------------------------------------

// draws the victory screen after Level 2 is cleared
function drawWinScreen() {
    drawTerminalFrame();

    // all levela cleared text at the top
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text("ALL LEVELS CLEARED", 20, 12);

    // divider line under the HUD
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();

    // victory text in the center
    textAlign(CENTER, CENTER);
    fill(GOLD);
    textSize(24);
    text("VICTORY", width / 2, height / 2 - 60);

    fill(LIGHT);
    textSize(16);
    text("YOU SURVIVED BOTH ENCOUNTERS", width / 2, height / 2 - 18);

    fill(TEAL);
    text("> PRESS ENTER FOR TITLE", width / 2, height / 2 + 32);
}

// draws the defeat screen when the player runs out of lives
function drawLoseScreen() {
    drawTerminalFrame();

    // level display on the left (shows the level the player reached before losing)
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text(`LEVEL ${currentLevel}`, 20, 12);

    // player stats on the right (shows final HP and lives, which should be 0 lives and 0 or negative HP)
    fill(LIGHT);
    text(`HP:${player.hp}`, 260, 12);
    text(`LIVES:${player.lives}`, 420, 12);

    // divider line under the HUD
    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();

    // defeat text in the center
    textAlign(CENTER, CENTER);
    fill(GOLD);
    textSize(24);
    text("DEFEAT", width / 2, height / 2 - 60);

    // defeat message :(
    fill(LIGHT);
    textSize(16);
    text("YOUR PARTY HAS FALLEN", width / 2, height / 2 - 18);

    fill(TEAL);
    text("> PRESS ENTER TO RESTART", width / 2, height / 2 + 32);
}

// --------------------------------------------------
// SIMPLE EFFECT DRAWING
// --------------------------------------------------

// draws temporary visual effects for attacks and spells
// these are lightweight, but they add a lot to battle readability
function drawAttackEffect() {
    if (attackEffectTimer <= 0) return;

    push();
    const offsetX = random(-2, 2);
    const offsetY = random(-2, 2);

    // a lil jitter makes the effects feel less stiff
    if (attackEffectType === "ATTACK") {
        drawImageSafe(attackImg, 220 + offsetX, 120 + offsetY, 105, 105);
    }

    // spells share an effect asset since it's a more generic magical hit, 
    // but they have a different color tint to distinguish them from normal attacks
    if (attackEffectType === "SPELL") {
        drawImageSafe(spellImg, 225 + offsetX, 115 + offsetY, 95, 95);
    }

    // BARRIER is a special case since it's a defensive buff centered on the player rather than an attack effect on the enemy, 
    // so it doesn't use the same asset and is drawn as a simple glowing outline instead
    if (attackEffectType === "BARRIER") {
        noFill();
        stroke(PURPLE);
        strokeWeight(4);
        ellipse(98, 158, 120, 140);
        strokeWeight(1);
        noStroke();
    }

    // charge is a special effect for the STARFALL spell to indicate that it's charging up and will hit on the next turn.
    if (attackEffectType === "CHARGE") {
        fill(PURPLE);
        ellipse(260 + offsetX, 125 + offsetY, 26, 26);
        ellipse(290 + offsetX, 110 + offsetY, 14, 14);
        ellipse(310 + offsetX, 140 + offsetY, 18, 18);
    }

    // starfall is a big golden impact effect that hits the enemy at the start of the player's turn after charging
    // It's meant to feel powerful and satisfying since it's the most complex spell and requires a turn of setup, 
    // so it has a more elaborate custom effect instead of reusing the attack or spell assets.
    if (attackEffectType === "STARFALL") {
        fill(GOLD);
        ellipse(280 + offsetX, 95 + offsetY, 18, 18);
        ellipse(295 + offsetX, 120 + offsetY, 12, 12);
        ellipse(310 + offsetX, 145 + offsetY, 16, 16);
        ellipse(325 + offsetX, 170 + offsetY, 10, 10);
    }

    pop();
}

// --------------------------------------------------
// RETRO UI FRAME
// --------------------------------------------------

// draws the outer frame used by every screen
function drawTerminalFrame() {
    background(BG);
    stroke(TEAL);
    noFill();
    rect(1, 1, width - 2, height - 2);
    noStroke();
}
