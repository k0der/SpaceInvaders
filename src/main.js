import { spawnEnemyPosition } from './ai.js';
import { getStrategy } from './ai-core.js';
import { getLastDebugInfo } from './ai-predictive.js';
import { drawAsteroid } from './asteroid.js';
import {
  checkBulletAsteroidCollisions,
  createBullet,
  drawBullet,
  FIRE_COOLDOWN,
  isBulletExpired,
  updateBullet,
} from './bullet.js';
import {
  applyCameraTransform,
  createCamera,
  getViewportBounds,
  resetCameraTransform,
} from './camera.js';
import { createDebugLogger } from './debug.js';
import {
  checkShipAsteroidCollision,
  clearSpawnZone,
  createExplosion,
  createGameState,
  drawEndScreenOverlay,
  drawExplosion,
  drawHUD,
  isExplosionDone,
  processBulletShipCollisions,
  updateExplosion,
  updateGameState,
} from './game.js';
import {
  createGameLog,
  formatGameLog,
  recordResult,
  resetGameLog,
} from './game-log.js';
import {
  applyInput,
  createInputState,
  handleKeyDown,
  handleKeyUp,
  isRestartKey,
} from './input.js';
import { setupHiDPICanvas } from './renderer.js';
import { DANGER_RADIUS_BASE, NEAR_MISS_RADIUS_FACTOR } from './reward.js';
import {
  createSettings,
  createSettingsUI,
  loadSettings,
  saveSettings,
  updateAutoHide,
} from './settings.js';
import {
  createShip,
  createTrail,
  drainTrail,
  drawShip,
  drawTrail,
  ENEMY_TRAIL_COLOR,
  PLAYER_TRAIL_COLOR,
  SHIP_SIZE,
  updateShip,
  updateTrail,
} from './ship.js';
import { createSimulation, updateSimulation } from './simulation.js';
import {
  createParallaxLayers,
  drawParallaxLayers,
  redistributeStars,
  updateStarLayersCamera,
} from './starfield.js';

/**
 * Calculate delta time in seconds between two timestamps (ms).
 * Caps at 0.1s to avoid spiral-of-death after tab backgrounding.
 * Never returns negative values.
 */
export function calculateDeltaTime(currentTimestamp, previousTimestamp) {
  const dtSeconds = (currentTimestamp - previousTimestamp) / 1000;
  return Math.min(Math.max(dtSeconds, 0), 0.1);
}

/**
 * Create an animation loop state object.
 * Call loop.tick(timestamp) each frame from requestAnimationFrame.
 * First tick returns dt=0 (no previous frame to diff against).
 */
export function createLoop() {
  let started = false;

  const state = {
    frameCount: 0,
    lastTimestamp: 0,

    tick(timestamp) {
      let dt = 0;
      if (started) {
        dt = calculateDeltaTime(timestamp, state.lastTimestamp);
      }
      started = true;
      state.lastTimestamp = timestamp;
      state.frameCount++;
      return dt;
    },
  };
  return state;
}

/**
 * Bootstrap the application: set up canvas, resize handling, and start the loop.
 */
const BASE_ASTEROID_COUNT = 40;

export function startApp() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let logicalSize = setupHiDPICanvas(
    canvas,
    ctx,
    window.innerWidth,
    window.innerHeight,
    dpr,
  );

  const loop = createLoop();
  let starLayers = createParallaxLayers(logicalSize.width, logicalSize.height);
  const initialBounds = {
    minX: 0,
    maxX: logicalSize.width,
    minY: 0,
    maxY: logicalSize.height,
  };
  const sim = createSimulation(initialBounds);
  let playerShip = createShip({
    x: logicalSize.width / 2,
    y: logicalSize.height / 2,
    heading: -Math.PI / 2,
  });
  const camera = createCamera(
    playerShip.x,
    playerShip.y,
    playerShip.heading + Math.PI / 2,
  );
  let playerTrail = createTrail();
  const enemySpawn = spawnEnemyPosition(playerShip.x, playerShip.y);
  let enemyShip = createShip({
    x: enemySpawn.x,
    y: enemySpawn.y,
    heading: Math.random() * 2 * Math.PI,
    owner: 'enemy',
  });
  let enemyTrail = createTrail(ENEMY_TRAIL_COLOR);
  let bullets = [];
  const gameState = createGameState();
  let prevCameraX = camera.x;
  let prevCameraY = camera.y;
  let prevCameraRotation = camera.rotation;
  const inputState = createInputState();
  const loaded = loadSettings();
  const settings = createSettings(loaded);
  let enemyStrategy = getStrategy(settings.enemyIntelligence);
  let enemyAIState = enemyStrategy.createState();
  let playerStrategy =
    settings.playerIntelligence !== 'human'
      ? getStrategy(settings.playerIntelligence)
      : null;
  let playerAIState = playerStrategy?.createState() ?? null;
  let elapsedTime = 0;
  const gameLog = createGameLog();
  let gameLogRecorded = false;
  const debugLogger = createDebugLogger();
  if (settings.aiDebugLog) debugLogger.enable();
  // Expose on window for console access
  if (typeof window !== 'undefined') {
    window.aiDebug = {
      enable: () => {
        debugLogger.enable();
        settings.aiDebugLog = true;
      },
      disable: () => {
        debugLogger.disable();
        settings.aiDebugLog = false;
      },
    };
  }

  // Settings UI
  const ui = createSettingsUI(document.body, settings);
  // Apply loaded settings to simulation, ships, and starfield
  sim.targetCount = Math.round(BASE_ASTEROID_COUNT * settings.asteroidDensity);
  playerShip.thrustPower = settings.thrustPower;
  enemyShip.thrustPower = settings.thrustPower;
  if (settings.starLayers !== 3) {
    starLayers = createParallaxLayers(
      logicalSize.width,
      logicalSize.height,
      settings.starLayers,
    );
  }
  if (settings.starDirection !== 'left') {
    redistributeStars(
      starLayers,
      logicalSize.width,
      logicalSize.height,
      settings.starDirection,
    );
  }

  ui.onChange = (name, value) => {
    settings[name] = value;
    if (name === 'starLayers') {
      starLayers = createParallaxLayers(
        logicalSize.width,
        logicalSize.height,
        value,
      );
    }
    if (name === 'thrustPower') {
      playerShip.thrustPower = value;
      enemyShip.thrustPower = value;
    }
    if (name === 'starDirection') {
      redistributeStars(
        starLayers,
        logicalSize.width,
        logicalSize.height,
        value,
      );
    }
    if (name === 'enemyIntelligence') {
      enemyStrategy = getStrategy(value);
      enemyAIState = enemyStrategy.createState();
    }
    if (name === 'playerIntelligence') {
      if (value === 'human') {
        playerStrategy = null;
        playerAIState = null;
      } else {
        playerStrategy = getStrategy(value);
        playerAIState = playerStrategy.createState();
      }
    }
    if (name === 'aiDebugLog') {
      if (value) {
        debugLogger.enable();
      } else {
        debugLogger.disable();
      }
    }
    if (name === 'gameLog' && !value) {
      resetGameLog(gameLog);
    }
    saveSettings(settings);
  };

  // Resize: update canvas with HiDPI and redistribute stars
  window.addEventListener('resize', () => {
    logicalSize = setupHiDPICanvas(
      canvas,
      ctx,
      window.innerWidth,
      window.innerHeight,
      dpr,
    );
    redistributeStars(
      starLayers,
      logicalSize.width,
      logicalSize.height,
      settings.starDirection,
    );
  });

  // Auto-hide: reset gear timer on any mouse movement
  window.addEventListener('mousemove', () => {
    settings.gearTimer = 0;
    if (settings.panelOpen) {
      settings.panelTimer = 0;
    }
  });

  // Keyboard input for ship controls and restart
  window.addEventListener('keydown', (e) => {
    const terminal =
      gameState.phase === 'playerWin' ||
      gameState.phase === 'playerDead' ||
      gameState.phase === 'draw';
    if (isRestartKey(e.key) && terminal) {
      restartGame();
      return;
    }
    handleKeyDown(inputState, e.key);
  });
  window.addEventListener('keyup', (e) => handleKeyUp(inputState, e.key));

  function restartGame() {
    playerShip = createShip({
      x: logicalSize.width / 2,
      y: logicalSize.height / 2,
      heading: -Math.PI / 2,
    });
    playerShip.thrustPower = settings.thrustPower;

    const spawn = spawnEnemyPosition(playerShip.x, playerShip.y);
    enemyShip = createShip({
      x: spawn.x,
      y: spawn.y,
      heading: Math.random() * 2 * Math.PI,
      owner: 'enemy',
    });
    enemyShip.thrustPower = settings.thrustPower;

    bullets = [];
    playerTrail = createTrail();
    enemyTrail = createTrail(ENEMY_TRAIL_COLOR);

    sim.asteroids = clearSpawnZone(sim.asteroids, [playerShip, enemyShip]);

    gameState.phase = 'playing';
    gameState.explosions = [];
    gameState.deathTimer = 0;
    gameState.resultTimer = 0;
    gameLogRecorded = false;

    enemyStrategy = getStrategy(settings.enemyIntelligence);
    enemyAIState = enemyStrategy.createState();
    if (settings.playerIntelligence !== 'human') {
      playerStrategy = getStrategy(settings.playerIntelligence);
      playerAIState = playerStrategy.createState();
    } else {
      playerStrategy = null;
      playerAIState = null;
    }

    camera.x = playerShip.x;
    camera.y = playerShip.y;
    camera.rotation = playerShip.heading + Math.PI / 2;
    prevCameraX = camera.x;
    prevCameraY = camera.y;
    prevCameraRotation = camera.rotation;
  }

  function frame(timestamp) {
    const dt = loop.tick(timestamp);
    elapsedTime += dt;

    // Apply speed multiplier to simulation dt
    const scaledDt = dt * settings.speedMultiplier;

    updateAutoHide(settings, dt);

    // When panel is open, button acts as close icon — always fully visible
    if (settings.panelOpen) {
      ui.gearButton.style.opacity = '0.8';
      ui.gearButton.style.pointerEvents = 'auto';
    } else {
      ui.gearButton.style.opacity = settings.gearVisible
        ? settings.gearHovered
          ? '0.8'
          : '0.3'
        : '0';
      ui.gearButton.style.pointerEvents = settings.gearVisible
        ? 'auto'
        : 'none';
    }
    ui.panel.style.display = settings.panelOpen ? 'block' : 'none';
    ui.gearButton.textContent = settings.panelOpen ? '\u2715' : '\u2630';

    // Player input: keyboard or AI (frozen in terminal phases)
    const active =
      gameState.phase === 'playing' || gameState.phase === 'ending';
    if (playerShip.alive && active) {
      if (playerStrategy) {
        playerStrategy.update(
          playerAIState,
          playerShip,
          enemyShip,
          sim.asteroids,
          scaledDt,
        );
      } else {
        applyInput(inputState, playerShip);
      }
      updateShip(playerShip, scaledDt);
    }

    // Enemy always AI (frozen in terminal phases)
    if (enemyShip.alive && active) {
      enemyStrategy.update(
        enemyAIState,
        enemyShip,
        playerShip,
        sim.asteroids,
        scaledDt,
      );
      updateShip(enemyShip, scaledDt);
    }

    // AI debug logging
    debugLogger.logAIFrame(
      elapsedTime,
      enemyShip,
      playerShip,
      getLastDebugInfo(),
    );

    // Bullet firing — player
    playerShip.fireCooldown = Math.max(playerShip.fireCooldown - scaledDt, 0);
    if (playerShip.fire && playerShip.fireCooldown <= 0 && playerShip.alive) {
      const noseX = playerShip.x + Math.cos(playerShip.heading) * SHIP_SIZE;
      const noseY = playerShip.y + Math.sin(playerShip.heading) * SHIP_SIZE;
      bullets.push(
        createBullet(
          noseX,
          noseY,
          playerShip.heading,
          playerShip.vx,
          playerShip.vy,
          'player',
        ),
      );
      playerShip.fireCooldown = FIRE_COOLDOWN;
      const pdx = enemyShip.x - playerShip.x;
      const pdy = enemyShip.y - playerShip.y;
      debugLogger.logEvent(elapsedTime, 'FIRE', {
        owner: 'player',
        dist: Math.round(Math.sqrt(pdx * pdx + pdy * pdy)),
        angle: Math.abs(Math.atan2(pdy, pdx) - playerShip.heading).toFixed(2),
      });
    }

    // Bullet firing — enemy (AI)
    enemyShip.fireCooldown = Math.max(enemyShip.fireCooldown - scaledDt, 0);
    if (enemyShip.fire && enemyShip.fireCooldown <= 0 && enemyShip.alive) {
      const noseX = enemyShip.x + Math.cos(enemyShip.heading) * SHIP_SIZE;
      const noseY = enemyShip.y + Math.sin(enemyShip.heading) * SHIP_SIZE;
      bullets.push(
        createBullet(
          noseX,
          noseY,
          enemyShip.heading,
          enemyShip.vx,
          enemyShip.vy,
          'enemy',
        ),
      );
      enemyShip.fireCooldown = FIRE_COOLDOWN;
      const edx = playerShip.x - enemyShip.x;
      const edy = playerShip.y - enemyShip.y;
      debugLogger.logEvent(elapsedTime, 'FIRE', {
        owner: 'enemy',
        dist: Math.round(Math.sqrt(edx * edx + edy * edy)),
        angle: Math.abs(Math.atan2(edy, edx) - enemyShip.heading).toFixed(2),
      });
    }

    if (playerShip.alive) {
      updateTrail(
        playerTrail,
        playerShip.x,
        playerShip.y,
        playerShip.heading,
        playerShip.thrustIntensity,
      );
    } else {
      drainTrail(playerTrail, scaledDt);
    }
    if (enemyShip.alive) {
      updateTrail(
        enemyTrail,
        enemyShip.x,
        enemyShip.y,
        enemyShip.heading,
        enemyShip.thrustIntensity,
      );
    } else {
      drainTrail(enemyTrail, scaledDt);
    }

    // Camera follows ship (PI/2 offset so ship nose points UP on screen)
    camera.x = playerShip.x;
    camera.y = playerShip.y;
    camera.rotation = playerShip.heading + Math.PI / 2;

    // Compute camera deltas and rotate to screen space for starfield parallax
    const cameraDeltaX = camera.x - prevCameraX;
    const cameraDeltaY = camera.y - prevCameraY;
    // Normalize rotation delta to [-PI, PI] so heading wrapping doesn't
    // produce a ±2PI spike that snaps stars across the screen
    let cameraDeltaRotation = camera.rotation - prevCameraRotation;
    while (cameraDeltaRotation > Math.PI) cameraDeltaRotation -= 2 * Math.PI;
    while (cameraDeltaRotation < -Math.PI) cameraDeltaRotation += 2 * Math.PI;
    const cosR = Math.cos(-camera.rotation);
    const sinR = Math.sin(-camera.rotation);
    const screenDx = cameraDeltaX * cosR - cameraDeltaY * sinR;
    const screenDy = cameraDeltaX * sinR + cameraDeltaY * cosR;

    updateStarLayersCamera(
      starLayers,
      screenDx,
      screenDy,
      cameraDeltaRotation,
      logicalSize.width,
      logicalSize.height,
    );

    prevCameraX = camera.x;
    prevCameraY = camera.y;
    prevCameraRotation = camera.rotation;
    // Tight viewport bounds (no margin — simulation handles its own zones)
    const viewportBounds = getViewportBounds(
      camera,
      logicalSize.width,
      logicalSize.height,
    );
    // Target count must match training env (game-env.js): base × density, no zone scaling
    sim.targetCount = Math.round(
      BASE_ASTEROID_COUNT * settings.asteroidDensity,
    );
    while (sim.asteroids.length > sim.targetCount) {
      sim.asteroids.pop();
    }
    updateSimulation(
      sim,
      scaledDt,
      viewportBounds,
      playerShip.vx,
      playerShip.vy,
    );

    // Bullet update, expiry, and asteroid collisions
    for (const bullet of bullets) {
      updateBullet(bullet, scaledDt);
    }
    bullets = bullets.filter((b) => !isBulletExpired(b));
    bullets = checkBulletAsteroidCollisions(bullets, sim.asteroids);

    // Bullet-ship collisions (active during playing and ending grace period)
    if (gameState.phase === 'playing' || gameState.phase === 'ending') {
      const collisionResult = processBulletShipCollisions(
        bullets,
        playerShip,
        enemyShip,
      );
      bullets = collisionResult.bullets;
      if (collisionResult.playerHit) {
        playerShip.alive = false;
        gameState.explosions.push(
          createExplosion(playerShip.x, playerShip.y, PLAYER_TRAIL_COLOR),
        );
      }
      if (collisionResult.enemyHit) {
        enemyShip.alive = false;
        gameState.explosions.push(
          createExplosion(enemyShip.x, enemyShip.y, ENEMY_TRAIL_COLOR),
        );
      }

      // Ship-asteroid collisions
      if (
        playerShip.alive &&
        checkShipAsteroidCollision(playerShip, sim.asteroids)
      ) {
        playerShip.alive = false;
        gameState.explosions.push(
          createExplosion(playerShip.x, playerShip.y, PLAYER_TRAIL_COLOR),
        );
      }
      if (
        enemyShip.alive &&
        checkShipAsteroidCollision(enemyShip, sim.asteroids)
      ) {
        enemyShip.alive = false;
        gameState.explosions.push(
          createExplosion(enemyShip.x, enemyShip.y, ENEMY_TRAIL_COLOR),
        );
      }

      updateGameState(gameState, playerShip, enemyShip, scaledDt);
    }

    // Update explosions
    for (const explosion of gameState.explosions) {
      updateExplosion(explosion, scaledDt);
    }
    gameState.explosions = gameState.explosions.filter(
      (e) => !isExplosionDone(e),
    );

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, logicalSize.width, logicalSize.height);

    drawParallaxLayers(ctx, starLayers, elapsedTime);

    applyCameraTransform(ctx, camera, logicalSize.width, logicalSize.height);

    for (const asteroid of sim.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    if (settings.showDangerZones) {
      ctx.globalCompositeOperation = 'lighter';
      for (const asteroid of sim.asteroids) {
        const dr =
          NEAR_MISS_RADIUS_FACTOR * asteroid.collisionRadius +
          DANGER_RADIUS_BASE;
        const grad = ctx.createRadialGradient(
          asteroid.x,
          asteroid.y,
          asteroid.collisionRadius,
          asteroid.x,
          asteroid.y,
          dr,
        );
        grad.addColorStop(0, 'rgba(255, 0, 0, 0.25)');
        grad.addColorStop(1, 'rgba(255, 0, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, dr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (gameState.phase === 'playing' || gameState.phase === 'ending') {
      drawTrail(ctx, enemyTrail);
      drawShip(ctx, enemyShip);
      drawTrail(ctx, playerTrail);
      drawShip(ctx, playerShip);

      for (const bullet of bullets) {
        drawBullet(ctx, bullet);
      }
    }

    for (const explosion of gameState.explosions) {
      drawExplosion(ctx, explosion);
    }

    resetCameraTransform(ctx);

    drawEndScreenOverlay(
      ctx,
      gameState.phase,
      logicalSize.width,
      logicalSize.height,
    );
    // Record game result for the log (once per match)
    const terminalPhase =
      gameState.phase === 'playerWin' ||
      gameState.phase === 'playerDead' ||
      gameState.phase === 'draw';
    if (terminalPhase && settings.gameLog && !gameLogRecorded) {
      recordResult(gameLog, gameState.phase);
      gameLogRecorded = true;
      console.log('[Game Log]', formatGameLog(gameLog));
    }

    const gameLogText =
      terminalPhase && settings.gameLog ? formatGameLog(gameLog) : null;
    drawHUD(
      ctx,
      gameState.phase,
      logicalSize.width,
      logicalSize.height,
      gameLogText,
    );

    // Auto-restart in AI-vs-AI mode after showing result for 2 seconds
    if (terminalPhase && settings.playerIntelligence !== 'human') {
      gameState.resultTimer = (gameState.resultTimer || 0) + dt;
      if (gameState.resultTimer >= 2) {
        restartGame();
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
