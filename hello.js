/*
    Crash of Campaigns - Prototype (V2) Dev Notes
    --------------------------------
    This version keeps the same retro terminal-style battle prototype,
    but expands the combat loop so it feels more tactical and a lot less one-note.

    IMPROVEMENTS ADDED HERE:
    - Real defend mechanic with a much stronger damage reduction
    - Visible defense indicator on the player
    - Healing command with limited uses (3 charges)
    - Spell submenu with multiple spell types that all do super cool things
    - Buffs / debuffs and a multi-turn charge spell
    - Level 2 with multiple enemies on screen at once
    - Target switching in multi-enemy encounters
    - Slightly more interesting enemy behavior and status handling :)

    HOW THE NEW COMBAT FLOW WORKS:
    - LEVEL 1 = one enemy encounter based on title selection
    - LEVEL 2 = two enemies at once
    - SPELL opens a submenu instead of doing just one generic spell
    - HEAL is its own menu command with limited charges
    - LEFT / RIGHT changes target when there are multiple living enemies

    BUGS:
    NONE so far :P

    NOTES:
    Idk everythign is working fine now, layout still a bit wonky, but theres a lot of imporoved game logic
    that really makes the game more complex
*/

// --------------------------------------------------
// GLOBAL GAME STATE
// --------------------------------------------------

let gameState = "TITLE";

// Separate screen modes for the battle UI.
// This lets SPELL open a small submenu without replacing the whole battle screen.
let battleScreenMode = "COMMAND"; // "COMMAND" or "SPELL_MENU"

// Menu cursor positions
let titleMenuIndex = 0;
let battleMenuIndex = 0;
let spellMenuIndex = 0;

const titleOptions = [
    "VIEW INSTRUCTIONS",
    "PLAY GAME"
];

// Added HEAL as its own command so the player does not need to burn a spell slot just to recover HP.
const battleOptions = [
    "ATTACK",
    "DEFEND",
    "SPELL",
    "HEAL"
];

// Different spell types with distinct jobs.
// This gives the combat some strategy instead of SPELL always meaning "bigger attack".
const spellOptions = [
    "FIREBLAST",   // Direct damage + burn over time
    "WEAKEN",      // Debuff enemy attack for a few turns
    "BARRIER",     // Defensive buff on the player
    "STARFALL"     // Multi-turn spell that charges, then lands later
];

let player;
let enemies = [];
let currentLevel = 1;
let selectedEnemyType = "DRAGON";
let activeTargetIndex = 0;

let combatLog = [];
let enemyTurnTimer = 0;
let playerFlashTimer = 0;
let attackEffectTimer = 0;
let attackEffectType = "";

// This is the current action banner shown near the bottom right.
let actionBanner = "";

// --------------------------------------------------
// VISUAL STYLE CONSTANTS
// --------------------------------------------------

const BG = "#000000";
const GOLD = "#c6b96b";
const TEAL = "#1f5c5d";
const BRIGHT_TEAL = "#2b8b8d";
const LIGHT = "#a8b4ae";
const RED = "#c65f5f";
const GREEN = "#7abf88";
const PURPLE = "#9a7fd1";
const ORANGE = "#d58a45";

const CANVAS_W = 640;
const CANVAS_H = 480;

// --------------------------------------------------
// ASSET VARIABLES
// --------------------------------------------------

let knightImg;
let dragonImg;
let ogreImg;
let attackImg;
let spellImg;
let pixFont;

// --------------------------------------------------
// P5 PRELOAD
// --------------------------------------------------

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

function setup() {
    createCanvas(CANVAS_W, CANVAS_H);

    if (pixFont) {
        textFont(pixFont);
    } else {
        console.error("Custom font failed to load, using default monospace font");
        textFont("monospace");
    }

    imageMode(CORNER);
    noSmooth();
    resetGame();
}

// --------------------------------------------------
// RESET / ENCOUNTER SETUP
// --------------------------------------------------

function resetGame() {
    player = {
        name: "PLAYER",
        hp: 100,
        maxHp: 100,
        lives: 2,
        defendTurns: 0,
        barrierTurns: 0,
        healUses: 3,
        pendingSpell: null
    };

    currentLevel = 1;
    setupLevel(currentLevel);

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

    addLog("> SYSTEM READY");
    addLog("> ENCOUNTER LOADED");
    addLog(`> LEVEL ${currentLevel} START`);
}

function setupLevel(levelNumber) {
    currentLevel = levelNumber;

    if (currentLevel === 1) {
        enemies = [createEnemy(selectedEnemyType, 1)];
        addLog(`> ${enemies[0].name} APPEARS`);
    } else {
        // Level 2 is intentionally busier.
        // Two enemies on the field means the player has to think about target priority,
        // defending, and whether to spend heal charges now or save them for later.
        enemies = [
            createEnemy("OGRE", 2),
            createEnemy("DRAGON", 2)
        ];
        addLog("> MULTIPLE HOSTILES DETECTED");
        addLog("> OGRE AND DRAGON ENTER BATTLE");
    }

    clampTargetToLivingEnemy();
}

function createEnemy(type, levelNumber) {
    if (type === "OGRE") {
        return {
            type: "OGRE",
            name: levelNumber === 1 ? "OGRE" : "OGRE BRUTE",
            hp: levelNumber === 1 ? 70 : 95,
            maxHp: levelNumber === 1 ? 70 : 95,
            minDamage: levelNumber === 1 ? 10 : 12,
            maxDamage: levelNumber === 1 ? 18 : 22,
            weakTurns: 0,
            burnTurns: 0,
            flashTimer: 0,
            chargingHeavy: false,
            alive: true
        };
    }

    return {
        type: "DRAGON",
        name: levelNumber === 1 ? "DRAGON" : "DRAGON WARDEN",
        hp: levelNumber === 1 ? 85 : 110,
        maxHp: levelNumber === 1 ? 85 : 110,
        minDamage: levelNumber === 1 ? 12 : 14,
        maxDamage: levelNumber === 1 ? 20 : 24,
        weakTurns: 0,
        burnTurns: 0,
        flashTimer: 0,
        chargingHeavy: false,
        alive: true
    };
}

// --------------------------------------------------
// MAIN DRAW LOOP
// --------------------------------------------------

function draw() {
    background(BG);

    if (enemyTurnTimer > 0) enemyTurnTimer--;
    if (playerFlashTimer > 0) playerFlashTimer--;
    if (attackEffectTimer > 0) attackEffectTimer--;

    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].flashTimer > 0) {
            enemies[i].flashTimer--;
        }
    }

    if (gameState === "PLAYING" && enemyTurnTimer === 1) {
        handleEnemyTurnSequence();
    }

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

function handleTitleInput() {
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        titleMenuIndex = max(0, titleMenuIndex - 1);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        titleMenuIndex = min(titleOptions.length - 1, titleMenuIndex + 1);
    }

    if (keyCode === LEFT_ARROW || key === "a" || key === "A") {
        selectedEnemyType = "OGRE";
    } else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") {
        selectedEnemyType = "DRAGON";
    }

    if (keyCode === ENTER || keyCode === RETURN) {
        if (titleMenuIndex === 0) {
            gameState = "INSTRUCTIONS";
        } else if (titleMenuIndex === 1) {
            resetGame();
            gameState = "PLAYING";
        }
    }
}

function handleInstructionsInput() {
    if (keyCode === ENTER || keyCode === RETURN || keyCode === ESCAPE) {
        gameState = "TITLE";
    }
}

function handleBattleInput() {
    if (enemyTurnTimer > 0) return;

    // Target switching only matters when there is more than one living enemy.
    if (battleScreenMode === "COMMAND") {
        if (keyCode === LEFT_ARROW || key === "a" || key === "A") {
            moveTarget(-1);
            return;
        } else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") {
            moveTarget(1);
            return;
        }
    }

    if (battleScreenMode === "SPELL_MENU") {
        handleSpellMenuInput();
        return;
    }

    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        battleMenuIndex = max(0, battleMenuIndex - 1);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        battleMenuIndex = min(battleOptions.length - 1, battleMenuIndex + 1);
    }

    if (keyCode === ENTER || keyCode === RETURN) {
        const chosenAction = battleOptions[battleMenuIndex];

        if (chosenAction === "SPELL") {
            battleScreenMode = "SPELL_MENU";
            spellMenuIndex = 0;
        } else {
            handlePlayerAction(chosenAction);
        }
    }
}

function handleSpellMenuInput() {
    if (keyCode === UP_ARROW || key === "w" || key === "W") {
        spellMenuIndex = max(0, spellMenuIndex - 1);
    } else if (keyCode === DOWN_ARROW || key === "s" || key === "S") {
        spellMenuIndex = min(spellOptions.length - 1, spellMenuIndex + 1);
    }

    if (keyCode === ESCAPE) {
        battleScreenMode = "COMMAND";
        return;
    }

    if (keyCode === ENTER || keyCode === RETURN) {
        const chosenSpell = spellOptions[spellMenuIndex];
        handleSpellAction(chosenSpell);
        battleScreenMode = "COMMAND";
    }
}

function handleEndInput() {
    if (keyCode === ENTER || keyCode === RETURN) {
        gameState = "TITLE";
        titleMenuIndex = 0;
    }
}

// --------------------------------------------------
// COMBAT HELPERS
// --------------------------------------------------

function getActiveEnemy() {
    clampTargetToLivingEnemy();
    return enemies[activeTargetIndex];
}

function getLivingEnemies() {
    return enemies.filter((enemy) => enemy.alive && enemy.hp > 0);
}

function allEnemiesDefeated() {
    return getLivingEnemies().length === 0;
}

function clampTargetToLivingEnemy() {
    const living = getLivingEnemies();
    if (living.length === 0) return;

    if (!enemies[activeTargetIndex] || !enemies[activeTargetIndex].alive) {
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].alive) {
                activeTargetIndex = i;
                return;
            }
        }
    }
}

function moveTarget(direction) {
    if (getLivingEnemies().length <= 1) return;

    let tries = 0;
    let newIndex = activeTargetIndex;

    while (tries < enemies.length) {
        newIndex = (newIndex + direction + enemies.length) % enemies.length;
        if (enemies[newIndex].alive) {
            activeTargetIndex = newIndex;
            addLog(`> TARGET: ${enemies[newIndex].name}`);
            return;
        }
        tries++;
    }
}

function damageEnemy(enemy, dmg, logPrefix = "> HIT") {
    enemy.hp = max(0, enemy.hp - dmg);
    enemy.flashTimer = 12;
    addLog(logPrefix);
    addLog(`> ${enemy.name} -${dmg} HP`);

    if (enemy.hp <= 0) {
        enemy.alive = false;
        addLog(`> ${enemy.name} DOWN`);
        clampTargetToLivingEnemy();
    }
}

function healPlayer(amount) {
    const oldHp = player.hp;
    player.hp = min(player.maxHp, player.hp + amount);
    const healed = player.hp - oldHp;
    addLog("> HEAL PROTOCOL ACTIVATED");
    addLog(`> PLAYER +${healed} HP`);
}

function queueEnemyPhase() {
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    enemyTurnTimer = 45;
}

function finishEncounterOrAdvance() {
    if (currentLevel === 1) {
        addLog("> LEVEL ONE CLEARED");
        currentLevel = 2;
        setupLevel(2);
        player.hp = min(player.maxHp, player.hp + 20);
        addLog("> PLAYER STABILIZED +20 HP");
        return;
    }

    gameState = "WIN";
}

function processPlayerStartOfTurnEffects() {
    // STARFALL is the multi-turn spell.
    // On the turn after casting, it lands automatically before the player picks a command.
    if (player.pendingSpell === "STARFALL") {
        const target = getActiveEnemy();
        if (target) {
            const dmg = floor(random(18, 31));
            attackEffectTimer = 24;
            attackEffectType = "STARFALL";
            addLog("> STARFALL RESOLVES");
            damageEnemy(target, dmg, "> COSMIC IMPACT");
        }
        player.pendingSpell = null;
    }
}

function processEnemyStatusEffects(enemy) {
    if (!enemy.alive) return;

    if (enemy.burnTurns > 0) {
        const burnDamage = 5;
        enemy.burnTurns--;
        addLog(`> ${enemy.name} BURNING`);
        damageEnemy(enemy, burnDamage, "> BURN DAMAGE");
    }

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

function handlePlayerAction(action) {
    processPlayerStartOfTurnEffects();
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    const target = getActiveEnemy();
    if (!target) return;

    if (action === "ATTACK") {
        const dmg = floor(random(8, 15));
        attackEffectTimer = 20;
        attackEffectType = "ATTACK";
        actionBanner = "SLASH";
        addLog("> PLAYER ATTACKED");
        damageEnemy(target, dmg);
    }

    else if (action === "DEFEND") {
        // This is a much stronger defend than before.
        // defendTurns handles the next enemy phase, while barrierTurns can stack from a spell.
        player.defendTurns = 1;
        actionBanner = "GUARD";
        addLog("> PLAYER DEFENDED");
        addLog("> NEXT ENEMY PHASE HEAVILY REDUCED");
    }

    else if (action === "HEAL") {
        if (player.healUses <= 0) {
            addLog("> NO HEAL CHARGES LEFT");
            return;
        }

        player.healUses--;
        const healAmount = floor(random(20, 31));
        actionBanner = "HEAL";
        healPlayer(healAmount);
        addLog(`> HEALS LEFT: ${player.healUses}`);
    }

    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    queueEnemyPhase();
}

function handleSpellAction(spellName) {
    processPlayerStartOfTurnEffects();
    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    const target = getActiveEnemy();
    if (!target) return;

    if (spellName === "FIREBLAST") {
        const hit = random() < 0.9;
        attackEffectTimer = 20;
        attackEffectType = "SPELL";
        actionBanner = "FIREBLAST";
        addLog("> PLAYER CAST FIREBLAST");

        if (hit) {
            const dmg = floor(random(12, 20));
            damageEnemy(target, dmg, "> FIRE HIT");
            if (target.alive) {
                target.burnTurns = 2;
                addLog(`> ${target.name} BURNING FOR 2 TURNS`);
            }
        } else {
            addLog("> SPELL MISSED");
        }
    }

    else if (spellName === "WEAKEN") {
        attackEffectTimer = 18;
        attackEffectType = "SPELL";
        actionBanner = "WEAKEN";
        target.weakTurns = 3;
        addLog("> PLAYER CAST WEAKEN");
        addLog(`> ${target.name} ATTACK DOWN FOR 3 TURNS`);
    }

    else if (spellName === "BARRIER") {
        attackEffectTimer = 18;
        attackEffectType = "BARRIER";
        actionBanner = "BARRIER";
        player.barrierTurns = 2;
        addLog("> PLAYER CAST BARRIER");
        addLog("> DEFENSE BOOSTED FOR 2 ENEMY PHASES");
    }

    else if (spellName === "STARFALL") {
        attackEffectTimer = 16;
        attackEffectType = "CHARGE";
        actionBanner = "CHARGE";
        player.pendingSpell = "STARFALL";
        addLog("> PLAYER BEGINS STARFALL");
        addLog("> SPELL WILL LAND NEXT TURN");
    }

    if (allEnemiesDefeated()) {
        finishEncounterOrAdvance();
        return;
    }

    queueEnemyPhase();
}

function handleEnemyTurnSequence() {
    const livingEnemies = getLivingEnemies();

    for (let i = 0; i < livingEnemies.length; i++) {
        const enemy = livingEnemies[i];

        // Damage-over-time effects tick right before that enemy acts.
        // This creates a nice tactical loop because FIREBLAST can interrupt or finish enemies off.
        processEnemyStatusEffects(enemy);
        if (!enemy.alive) continue;

        performEnemyAction(enemy);

        if (gameState === "LOSE") {
            return;
        }
    }

    // Defend and barrier are enemy-phase protections.
    // They both tick down after the whole enemy phase is finished.
    if (player.defendTurns > 0) player.defendTurns--;
    if (player.barrierTurns > 0) player.barrierTurns--;
}

function performEnemyAction(enemy) {
    addLog(`> ${enemy.name} INITIATED TURN`);

    let dmg = floor(random(enemy.minDamage, enemy.maxDamage + 1));

    // Level 2 behavior gets a little more interesting.
    // Ogres sometimes charge a heavier attack, dragons can spit flame.
    if (enemy.type === "OGRE") {
        if (enemy.chargingHeavy) {
            dmg += 8;
            enemy.chargingHeavy = false;
            addLog(`> ${enemy.name} USES CRUSHING BLOW`);
        } else if (currentLevel >= 2 && random() < 0.25) {
            enemy.chargingHeavy = true;
            addLog(`> ${enemy.name} IS WINDING UP`);
            return;
        }
    }

    if (enemy.type === "DRAGON" && currentLevel >= 2 && random() < 0.3) {
        dmg += 4;
        addLog(`> ${enemy.name} BREATHES FIRE`);
    }

    if (enemy.weakTurns > 0) {
        dmg = max(1, floor(dmg * 0.7));
        addLog(`> ${enemy.name} WEAKENED`);
    }

    // Defend is now much more meaningful.
    // Defend cuts most of the damage, and barrier stacks on top for even more protection.
    if (player.defendTurns > 0) {
        dmg = max(1, floor(dmg * 0.25));
        addLog("> DEFEND ABSORBED MOST OF THE HIT");
    }

    if (player.barrierTurns > 0) {
        dmg = max(1, floor(dmg * 0.65));
        addLog("> BARRIER REDUCED DAMAGE FURTHER");
    }

    player.hp -= dmg;
    playerFlashTimer = 12;
    addLog("> PLAYER HIT");
    addLog(`> PLAYER -${dmg} HP`);

    if (player.hp <= 0) {
        player.lives -= 1;

        if (player.lives <= 0) {
            player.hp = 0;
            gameState = "LOSE";
            return;
        } else {
            addLog("> LIFE LOST");
            addLog("> PLAYER REBOOTS");
            player.hp = 60;
            player.defendTurns = 0;
            player.barrierTurns = 0;
            player.pendingSpell = null;
        }
    }
}

function addLog(message) {
    combatLog.unshift(message);

    if (combatLog.length > 6) {
        combatLog.pop();
    }
}

// --------------------------------------------------
// SAFE IMAGE DRAWING
// --------------------------------------------------

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

function drawTitleScreen() {
    drawTerminalFrame();

    fill(GOLD);
    textAlign(CENTER, TOP);
    textSize(32);
    text("CRASH OF CAMPAIGNS", width / 2, 60);

    fill(LIGHT);
    textSize(16);
    text(`ENEMY PREVIEW: ${selectedEnemyType}`, width / 2, 150);

    textAlign(LEFT, TOP);
    textSize(22);

    for (let i = 0; i < titleOptions.length; i++) {
        if (i === titleMenuIndex) {
            fill(BRIGHT_TEAL);
            text("> " + titleOptions[i] + "_", 60, 240 + i * 52);
        } else {
            fill(TEAL);
            text("> " + titleOptions[i], 60, 240 + i * 52);
        }
    }

    drawImageSafe(knightImg, 500, 250, 95, 135);

    fill(LIGHT);
    textSize(14);
    text("ENTER TO SELECT", 60, 410);
}

// --------------------------------------------------
// DRAWING: INSTRUCTIONS SCREEN
// --------------------------------------------------

function drawInstructionsScreen() {
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
    textSize(16);

    const instructions = [
        "TURN-BASED COMBAT PROTOTYPE.",
        "",
        "BATTLE CONTROLS:",
        "W/S OR UP/DOWN  -> MOVE CURSOR",
        "ENTER           -> CONFIRM CHOICE",
        "ESC             -> CLOSE SPELL MENU",
        "A/D OR LEFT/RIGHT -> SWITCH TARGET IN MULTI-ENEMY BATTLES",
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

    for (let i = 0; i < instructions.length; i++) {
        text(instructions[i], 45, 110 + i * 22);
    }
}

// --------------------------------------------------
// DRAWING: MAIN BATTLE SCREEN
// --------------------------------------------------

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

function drawBattleHud() {
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text(`LEVEL ${currentLevel}`, 20, 12);

    fill(LIGHT);
    text(`HP:${player.hp}/${player.maxHp}`, 180, 12);
    text(`LIVES:${player.lives}`, 360, 12);
    text(`HEALS:${player.healUses}`, 500, 12);

    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();
}

function drawBattleSceneDivider() {
    stroke(TEAL);
    line(0, 220, width, 220);
    noStroke();
}

function drawBattleCharacters() {
    const playerHitFlash = playerFlashTimer > 0 && frameCount % 6 < 3;

    fill(TEAL);
    textAlign(LEFT, TOP);
    textSize(18);
    text(player.name, 45, 78);

    push();
    if (playerHitFlash) {
        tint(255, 180);
    } else {
        noTint();
    }
    drawImageSafe(knightImg, 45, 105, 110, 110);
    pop();

    // Strong visual indicator when defending or protected by barrier.
    if (player.defendTurns > 0 || player.barrierTurns > 0) {
        noFill();
        stroke(player.defendTurns > 0 ? GREEN : PURPLE);
        strokeWeight(3);
        rect(38, 98, 124, 124);
        strokeWeight(1);
        noStroke();

        fill(player.defendTurns > 0 ? GREEN : PURPLE);
        textSize(14);
        text(player.defendTurns > 0 ? "GUARDING" : "BARRIER", 36, 228);
    }

    // Draw enemies.
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.alive) continue;

        const isTargeted = i === activeTargetIndex;
        const enemyHitFlash = enemy.flashTimer > 0 && frameCount % 6 < 3;

        let drawX = i === 0 ? 320 : 455;
        let drawY = i === 0 ? 78 : 96;
        let drawW = enemy.type === "DRAGON" ? 165 : 135;
        let drawH = enemy.type === "DRAGON" ? 130 : 135;

        fill(TEAL);
        textSize(16);
        text(enemy.name, drawX, 58);
        text(`HP:${enemy.hp}`, drawX, 78);

        if (enemy.burnTurns > 0) {
            fill(ORANGE);
            text(`BURN:${enemy.burnTurns}`, drawX, 96);
        }

        if (enemy.weakTurns > 0) {
            fill(PURPLE);
            text(`WEAK:${enemy.weakTurns}`, drawX, 112);
        }

        push();
        if (enemyHitFlash) {
            tint(255, 180);
        } else {
            noTint();
        }

        if (enemy.type === "DRAGON") {
            drawImageSafe(dragonImg, drawX, drawY + 24, drawW, drawH);
        } else {
            drawImageSafe(ogreImg, drawX, drawY + 18, drawW, drawH);
        }
        pop();

        if (isTargeted) {
            noFill();
            stroke(GOLD);
            strokeWeight(3);
            rect(drawX - 8, drawY + 8, drawW + 16, drawH + 16);
            strokeWeight(1);
            noStroke();
            fill(GOLD);
            text("> TARGET <", drawX, drawY + drawH + 32);
        }
    }
}

function drawBattleMenu() {
    textAlign(LEFT, TOP);
    textSize(16);

    if (battleScreenMode === "COMMAND") {
        for (let i = 0; i < battleOptions.length; i++) {
            const y = 248 + i * 26;

            if (i === battleMenuIndex && enemyTurnTimer === 0) {
                fill(GOLD);
                text("> " + battleOptions[i] + "_", 24, y);
            } else {
                fill(LIGHT);
                text("> " + battleOptions[i], 24, y);
            }
        }
    } else {
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
        text("ESC TO CANCEL", 24, 372);
    }

    if (enemyTurnTimer > 0) {
        fill(BRIGHT_TEAL);
        text("> ENEMY THINKING...", 24, 340);
    }
}

function drawCombatLog() {
    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(15);

    for (let i = 0; i < combatLog.length; i++) {
        text(combatLog[i], 250, 320 + i * 20);
    }
}

function drawStatusBanner() {
    fill(TEAL);
    textAlign(LEFT, TOP);
    textSize(14);

    if (player.pendingSpell === "STARFALL") {
        text("PENDING: STARFALL", 24, 390);
    }

    if (actionBanner !== "") {
        text(`LAST ACTION: ${actionBanner}`, 24, 412);
    }
}

// --------------------------------------------------
// DRAWING: WIN / LOSE
// --------------------------------------------------

function drawWinScreen() {
    drawTerminalFrame();

    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text("ALL LEVELS CLEARED", 20, 12);

    fill(LIGHT);
    text(`HP:${player.hp}`, 260, 12);
    text(`LIVES:${player.lives}`, 420, 12);

    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();

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

function drawLoseScreen() {
    drawTerminalFrame();

    fill(GOLD);
    textAlign(LEFT, TOP);
    textSize(20);
    text(`LEVEL ${currentLevel}`, 20, 12);

    fill(LIGHT);
    text(`HP:${player.hp}`, 260, 12);
    text(`LIVES:${player.lives}`, 420, 12);

    stroke(TEAL);
    line(0, 42, width, 42);
    noStroke();

    textAlign(CENTER, CENTER);
    fill(GOLD);
    textSize(24);
    text("DEFEAT", width / 2, height / 2 - 60);

    fill(LIGHT);
    textSize(16);
    text("YOUR PARTY HAS FALLEN", width / 2, height / 2 - 18);

    fill(TEAL);
    text("> PRESS ENTER TO RESTART", width / 2, height / 2 + 32);
}

// --------------------------------------------------
// SIMPLE EFFECT DRAWING
// --------------------------------------------------

function drawAttackEffect() {
    if (attackEffectTimer <= 0) return;

    push();
    const offsetX = random(-2, 2);
    const offsetY = random(-2, 2);

    if (attackEffectType === "ATTACK") {
        drawImageSafe(attackImg, 220 + offsetX, 120 + offsetY, 105, 105);
    }

    if (attackEffectType === "SPELL") {
        drawImageSafe(spellImg, 225 + offsetX, 115 + offsetY, 95, 95);
    }

    if (attackEffectType === "BARRIER") {
        noFill();
        stroke(PURPLE);
        strokeWeight(4);
        ellipse(98, 158, 120, 140);
        strokeWeight(1);
        noStroke();
    }

    if (attackEffectType === "CHARGE") {
        fill(PURPLE);
        ellipse(260 + offsetX, 125 + offsetY, 26, 26);
        ellipse(290 + offsetX, 110 + offsetY, 14, 14);
        ellipse(310 + offsetX, 140 + offsetY, 18, 18);
    }

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

function drawTerminalFrame() {
    background(BG);
    stroke(TEAL);
    noFill();
    rect(1, 1, width - 2, height - 2);
    noStroke();
}