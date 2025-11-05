/*
 * IDB Programming: Code Playground
 */

import * as Util from "./util.js";

// Global constants go here
const controlKeys = ["Q", "W", "E"]; // Define control keys to avoid the keys jumping with the index
const numPumps = 3;
const pumpY = 600;
const pumpSize = 60;
const balloonMaxWidth = 150; // Pop threshold
const releaseThreshold = 50; // Minimum size to release

// Global states go here
let balloons = [];
let spaceReady = true;
let keys = { Q: false, W: false, E: false };

let lives = 3;
let livesEl;
let gameOverShown = false;

let fadeOverlay = null;
let fadeAlpha = 0;

let difficulty = 1;
let baseSpawnDelay = 2000;
let currentSpawnDelay = baseSpawnDelay;

// The book down below is the game
function loop() {
  if (!gameOverShown) {
    moveBalloons();
  } else if (fadeOverlay && fadeAlpha < 1) {
    fadeAlpha = Math.min(1, fadeAlpha + 0.02); // Fade speed
    Util.setColour(0, 0, 0, fadeAlpha, fadeOverlay);
  }
  window.requestAnimationFrame(loop);
}

// Balloon respawning
function spawnNewB(i) {
  if (gameOverShown) return;

  const spacing = window.innerWidth / (numPumps + 1);
  const pumpX = spacing * (i + 1) - pumpSize / 2;

  // Random starting size
  const startWidth = 40 + Math.random() * 40; // 40–80, stay at 40 to avoid instant deflate failures
  const startHeight = startWidth * 1.3;

  // Define balloon parameters and push into array
  const balloonEl = Util.createThing();
  Util.setSize(startWidth, startHeight, balloonEl);
  Util.setColour(0, 80, 50, 1, balloonEl);
  Util.setRoundedness(0.5, balloonEl);
  Util.setPositionPixels(pumpX + 15, pumpY - startHeight, balloonEl);

  const balloon = {
    el: balloonEl,
    anchorX: pumpX + pumpSize / 2,
    anchorY: pumpY,
    width: startWidth,
    height: startHeight,
    released: false,
    x: pumpX + pumpSize / 2,
    y: pumpY,
    vy: 0,
    vx: 0,
    controlKey: controlKeys[i],
    pumpIndex: i
  };
  balloons.push(balloon);

  // Increase difficulty lineary with each balloon spawned (increase value for shorter sessions)
  difficulty += 0.15;

  // Increase spawn speed to add difficulty over time, stops at 500ms. 0.97 = 3% faster per spawn.
  currentSpawnDelay = Math.max(500, currentSpawnDelay * 0.97);
}

// Balloon release
function releaseBalloon(b, pumpIndex) {
  b.released = true;
  b.x = b.anchorX;
  b.y = b.anchorY;
  b.vy = -4;
  b.vx = (Math.random() - 0.5) * 2; // gentle drift
  const jitter = Math.random() * 400 - 200; // ±200ms jitter
  setTimeout(() => spawnNewB(pumpIndex), currentSpawnDelay + jitter);
}

// Make balloons do balloony things
function moveBalloons() {
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];

    if (b.released) {
      // Balloon go up, balloon also move left/right if it's feeling spicy
      b.vy = -4;
      b.y += b.vy;
      b.x += b.vx;

      Util.setSize(b.width, b.height, b.el);
      Util.setPositionPixels(b.x - b.width / 2, b.y - b.height, b.el);

      // Remove balloon when it leaves screen, a memory leak in my head is enough to deal with
      if (b.y + b.height < 0) {
        b.el?.parentNode?.removeChild(b.el);
        balloons.splice(i, 1);
      }
      continue; // Break the for loop, fly free little code!
    }

    // Inflate if key is pressed
    if (keys[b.controlKey]) {
      b.width += 1;
      b.height += 1.5;

      // Balloon go POP!
      if (b.width > balloonMaxWidth) {
        b.el?.parentNode?.removeChild(b.el); // "?" means "not null/undefined", basically a nor gate?
        const pumpIndex = b.pumpIndex;
        balloons.splice(i, 1);

        // Lose 1/9 of a cat when you fail
        lives--;
        livesEl.innerText = "Lives: " + lives;
        if (lives <= 0 && !gameOverShown) {
          triggerFadeOut();
          return;
        }

        // Slight variation in spawn time to mitigate QWE => QWE => QWE behavior.
        // Doesn't really do a good job but meh, I tried.
        const jitter = Math.random() * 400 - 200; // +/- 200ms jitter (look up how to type the +/- symbol sometime)
        setTimeout(() => spawnNewB(pumpIndex), currentSpawnDelay + jitter);
        continue;
      }
    } else {
      // Deflate if key not pressed
      // Speed slightly randomized, scaled by difficulty, gotta force an end state ¯\_(ツ)_/¯
      // (Hope I don't have to reference the ASCII source)
      if (b.width > 10 && b.height > 10) {
        const shrinkX = (0.2 + Math.random() * 0.1) * difficulty;   // 0.2–0.3 scaled
        const shrinkY = (0.3 + Math.random() * 0.15) * difficulty;  // 0.3–0.45 scaled
        b.width -= shrinkX;
        b.height -= shrinkY;
      }
    }

    // Tiny bloon also loses you 1/9 of a cat
    // Added to not allow player to simply ignore two of them
    if (b.width <= 20) {
      b.el?.parentNode?.removeChild(b.el);
      const pumpIndex = b.pumpIndex;
      balloons.splice(i, 1);

      // Remove life if tiny bloon go poof
      lives--;
      livesEl.innerText = "Lives: " + lives;
      if (lives <= 0 && !gameOverShown) {
        triggerFadeOut();
        return;
      }

      // Same random spawn stuff as earlier
      const jitter = Math.random() * 400 - 200; // ±200ms jitter
      setTimeout(() => spawnNewB(pumpIndex), currentSpawnDelay + jitter);
      continue;
    }

    // Magic numbers to keep bloons centered above pumps
    // I honestly can't even wrap my head around how to *explain* this
    Util.setSize(b.width, b.height, b.el);
    Util.setPositionPixels(b.anchorX - b.width / 2, b.anchorY - b.height, b.el);
  }
}

// When 3/9 of cat have been lost, game over
// Idk why I stuck with the cat comments but I'm tired so here we are
function triggerFadeOut() {
  gameOverShown = true;

  fadeOverlay = Util.createThing();
  Util.setSize(window.innerWidth, window.innerHeight, fadeOverlay);
  Util.setPositionPixels(0, 0, fadeOverlay);
  Util.setColour(0, 0, 0, 0, fadeOverlay);
  Util.setRoundedness(0, fadeOverlay);

  // Restart delay of 3 seconds
  setTimeout(() => restartGame(), 3000);
}

// Actual restart function
function restartGame() {
  // Clear balloons
  balloons.forEach(b => {
    b.el?.parentNode?.removeChild(b.el);
  });
  balloons = []; //Clears the array defined on line 16

  // Remove the black fade-out
  fadeOverlay?.parentNode?.removeChild(fadeOverlay);
  fadeOverlay = null;
  fadeAlpha = 0;

  // Reset lives and game over state
  lives = 3;
  livesEl.innerText = "Lives: " + lives;
  gameOverShown = false;

  // Reset difficulty and spawn delay
  difficulty = 1;
  currentSpawnDelay = baseSpawnDelay;

  // Respawn initial balloons
  for (let i = 0; i < numPumps; i++) {
    spawnNewB(i);
  }
}

// Define function for space key
function releaseAll() {
  if (gameOverShown) return;

  // Funny text to say "if ANY bloon is not yet released, but can be, release it"
  for (let i = 0; i < numPumps; i++) {
    const b = balloons.find(bl => bl.pumpIndex === i && !bl.released);
    if (b && b.width >= releaseThreshold) {
      releaseBalloon(b, i);
    }
  }
}

// Setup, not sure why I'm commenting this but I'm kinda restless atm
function setup() {
  // Create pumps and initial balloons
  const spacing = window.innerWidth / (numPumps + 1);

  for (let i = 0; i < numPumps; i++) {
    const pumpX = spacing * (i + 1) - pumpSize / 2;

    const pump = Util.createThing();
    Util.setSize(pumpSize, pumpSize, pump);
    Util.setColour(0, 0, 50, 1, pump);
    Util.setRoundedness(0, pump);
    Util.setPositionPixels(pumpX, pumpY, pump);
    spawnNewB(i);

    // Click to release balloon from pump
    pump.addEventListener("click", () => {
      if (gameOverShown) return; // Stop click from clicking if game over screen is game overing
      const b = balloons.find(bl => bl.pumpIndex === i && !bl.released);
      if (b && b.width >= releaseThreshold) {
        releaseBalloon(b, i);
      }
    });
  }

  // Ground, aligned to pump bottom
  const groundTop = pumpY + pumpSize;
  const groundHeight = window.innerHeight - groundTop;

  const ground = Util.createThing();
  Util.setColour(120, 80, 40, 1, ground);
  Util.setRoundedness(0, ground);
  Util.setSize(window.innerWidth, groundHeight, ground);
  Util.setPositionPixels(0, groundTop, ground);

  // Lives display (plain text via Util element)
  // Honestly, I tunnel visioned on not editing the other scripts. This could've been done so much better...
  livesEl = Util.createThing();
  Util.setSize(0, 0, livesEl); // Make "Thing" invisible with size 0
  Util.setColour(0, 0, 0, 0, livesEl); // Make "Thing" extra invisible with no color
  // Util.setRoundedness(0, livesEl); // Makes it invisibly square...? Why did I bother with this?
  Util.setPositionPixels(20, 20, livesEl); // Position, this one makes sense
  livesEl.style.background = "none";
  livesEl.style.border = "none";
  livesEl.style.color = "black";
  livesEl.style.font = "20px Arial";
  livesEl.style.display = "inline"; // Keeps all text on one line
  livesEl.style.whiteSpace = "nowrap"; // Keeps all text on one line, but differently
  livesEl.innerText = "Lives: " + lives;

  // Key listeners
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyQ") keys.Q = true;
    if (e.code === "KeyW") keys.W = true;
    if (e.code === "KeyE") keys.E = true;
    if (e.code === "Space") {
      if (spaceReady) {
        releaseAll(); // Releases all bloons like funny text said earlier
        spaceReady = false; // Deactivates the space feature
        setTimeout(() => { spaceReady = true; }, 5000); // Enables space after 5 sec
      }
    }
  });

  //Makes sure key states are reset when no longer holding, to allow bloons go tiny again
  document.addEventListener("keyup", (e) => {
    if (e.code === "KeyQ") keys.Q = false;
    if (e.code === "KeyW") keys.W = false;
    if (e.code === "KeyE") keys.E = false;
  });

  window.requestAnimationFrame(loop);
}

setup(); // Always call the setup or you'll break the Matrix.
