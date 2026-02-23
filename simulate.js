/**
 * Headless Simulator — CLI entry point for running the game without a browser.
 *
 * Exercises the full game logic (physics, AI, collisions, spawning) at max CPU
 * speed with controlled dt. Produces structured logs and aggregate statistics
 * for detecting AI behavioral bugs and balance issues at scale.
 *
 * Usage: node simulate.js [--games N] [--ticks N] [--dt N] [--seed N]
 *        [--verbose] [--detect list] [--player-ai name] [--enemy-ai name]
 *        [--density N] [--speed N] [--thrust N]
 */

import { createInterface } from 'node:readline';
import { spawnEnemyPosition } from './src/ai.js';
import { getStrategy } from './src/ai-core.js';
import { getLastDebugInfo, HOLD_TIME } from './src/ai-predictive.js';
import {
  checkBulletAsteroidCollisions,
  createBullet,
  FIRE_COOLDOWN,
  isBulletExpired,
  updateBullet,
} from './src/bullet.js';
import { createCamera, getViewportBounds } from './src/camera.js';
import { fmtAction } from './src/debug.js';
import {
  checkShipAsteroidCollision,
  createExplosion,
  createGameState,
  isExplosionDone,
  processBulletShipCollisions,
  updateExplosion,
  updateGameState,
} from './src/game.js';
import { GameEnv } from './src/game-env.js';
import { createShip, SHIP_SIZE, updateShip } from './src/ship.js';
import {
  computeSpawnBounds,
  createSimulation,
  updateSimulation,
} from './src/simulation.js';

// ── Constants ───────────────────────────────────────────────────────────

const VIEWPORT_W = 1920;
const VIEWPORT_H = 1080;
const BASE_ASTEROID_COUNT = 40;
const PROXIMITY_FACTOR = 2;
const COLLAPSE_THRESHOLD = -5000;

// ── CLI Arg Parsing ─────────────────────────────────────────────────────

/**
 * Parse CLI arguments into a config object.
 * @param {string[]} argv - Argument array (without node and script path)
 * @returns {object} config
 */
export function parseArgs(argv) {
  const config = {
    games: 100,
    ticks: 3600,
    dt: 1 / 60,
    seed: null,
    verbose: false,
    detectors: [],
    playerAI: 'predictive',
    enemyAI: 'predictive',
    density: 1.0,
    speed: 1.0,
    thrust: 2000,
    bridge: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--games':
        config.games = Number.parseInt(argv[++i], 10);
        break;
      case '--ticks':
        config.ticks = Number.parseInt(argv[++i], 10);
        break;
      case '--dt':
        config.dt = Number.parseFloat(argv[++i]);
        break;
      case '--seed':
        config.seed = Number.parseInt(argv[++i], 10);
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--detect':
        config.detectors = argv[++i].split(',');
        break;
      case '--player-ai':
        config.playerAI = argv[++i];
        break;
      case '--enemy-ai':
        config.enemyAI = argv[++i];
        break;
      case '--density':
        config.density = Number.parseFloat(argv[++i]);
        break;
      case '--speed':
        config.speed = Number.parseFloat(argv[++i]);
        break;
      case '--thrust':
        config.thrust = Number.parseInt(argv[++i], 10);
        break;
      case '--bridge':
        config.bridge = true;
        break;
    }
  }

  return config;
}

// ── Seeded PRNG ─────────────────────────────────────────────────────────

/**
 * Install a seeded mulberry32 PRNG as Math.random.
 * @param {number} seed
 * @returns {Function} restore — call to restore original Math.random
 */
export function installSeededRandom(seed) {
  const original = Math.random;
  let state = seed | 0;

  Math.random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return () => {
    Math.random = original;
  };
}

// ── Bullet Firing Helper ────────────────────────────────────────────────

/**
 * Attempt to fire a bullet from a ship. Handles cooldown, alive check, and
 * bullet creation. Mirrors the main.js bullet firing pattern.
 *
 * @param {object} ship - The ship attempting to fire
 * @param {object} target - The opposing ship (for event logging)
 * @param {object[]} bullets - Bullet array to push into
 * @param {number} dt - Frame delta time (for cooldown decrement)
 * @param {number} elapsed - Elapsed simulation time (for event timestamp)
 * @param {object[]} events - Event array to push FIRE events into
 * @returns {boolean} true if a bullet was fired
 */
export function tryFireBullet(ship, target, bullets, dt, elapsed, events) {
  ship.fireCooldown = Math.max(ship.fireCooldown - dt, 0);

  if (ship.fire && ship.fireCooldown <= 0 && ship.alive) {
    const noseX = ship.x + Math.cos(ship.heading) * SHIP_SIZE;
    const noseY = ship.y + Math.sin(ship.heading) * SHIP_SIZE;
    bullets.push(
      createBullet(noseX, noseY, ship.heading, ship.vx, ship.vy, ship.owner),
    );
    ship.fireCooldown = FIRE_COOLDOWN;

    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    events.push({
      tick: -1,
      elapsed,
      type: 'FIRE',
      data: {
        owner: ship.owner,
        dist: Math.round(Math.sqrt(dx * dx + dy * dy)),
        angle: Number.parseFloat(
          Math.abs(Math.atan2(dy, dx) - ship.heading).toFixed(2),
        ),
      },
    });
    return true;
  }
  return false;
}

// ── Detectors ───────────────────────────────────────────────────────────

/**
 * Detect oscillation: action changes occurring faster than HOLD_TIME.
 * @param {object[]} events - Event array from a game
 * @returns {object[]} detections
 */
export function detectOscillation(events) {
  const actionChanges = events.filter((e) => e.type === 'ACTION_CHANGE');
  const detections = [];

  for (let i = 1; i < actionChanges.length; i++) {
    const gap = actionChanges[i].elapsed - actionChanges[i - 1].elapsed;
    if (gap < HOLD_TIME) {
      detections.push({
        type: 'oscillation',
        tick: actionChanges[i].tick,
        elapsed: actionChanges[i].elapsed,
        gap,
        data: actionChanges[i].data,
      });
    }
  }

  return detections;
}

/**
 * Detect pass-through: ship overlaps asteroid collisionRadius without dying.
 * (Placeholder until ship-asteroid collision is implemented.)
 * @param {object[]} events - Event array from a game
 * @returns {object[]} detections
 */
export function detectPassthrough(events) {
  const proximities = events.filter((e) => e.type === 'PROXIMITY');
  const detections = [];

  for (const event of proximities) {
    if (event.data.dist < event.data.radius) {
      detections.push({
        type: 'passthrough',
        tick: event.tick,
        elapsed: event.elapsed,
        data: event.data,
      });
    }
  }

  return detections;
}

/**
 * Detect score collapse: all candidates score below threshold.
 * @param {object[]} events - Event array from a game
 * @param {number} threshold - Score threshold (default -5000)
 * @returns {object[]} detections
 */
export function detectCollapse(events, threshold = COLLAPSE_THRESHOLD) {
  const actionChanges = events.filter((e) => e.type === 'ACTION_CHANGE');
  const detections = [];

  for (const event of actionChanges) {
    const scores = event.data.scores;
    if (scores?.every((s) => s.score < threshold)) {
      detections.push({
        type: 'collapse',
        tick: event.tick,
        elapsed: event.elapsed,
        data: event.data,
      });
    }
  }

  return detections;
}

const DETECTOR_MAP = {
  oscillation: detectOscillation,
  passthrough: detectPassthrough,
  collapse: detectCollapse,
};

// ── Per-Game Simulation ─────────────────────────────────────────────────

/**
 * Run a single headless game.
 * @param {object} config - Game configuration
 * @returns {object} { events, detections, stats }
 */
export function runGame(config) {
  const { ticks, dt, playerAI, enemyAI, density, speed, thrust } = config;

  // Setup — mirrors main.js startApp()
  const playerShip = createShip({
    x: VIEWPORT_W / 2,
    y: VIEWPORT_H / 2,
    heading: -Math.PI / 2,
  });
  playerShip.thrustPower = thrust;

  const enemySpawn = spawnEnemyPosition(playerShip.x, playerShip.y);
  const enemyShip = createShip({
    x: enemySpawn.x,
    y: enemySpawn.y,
    heading: Math.random() * 2 * Math.PI,
    owner: 'enemy',
  });
  enemyShip.thrustPower = thrust;

  const camera = createCamera(
    playerShip.x,
    playerShip.y,
    playerShip.heading + Math.PI / 2,
  );

  const viewportBounds = getViewportBounds(camera, VIEWPORT_W, VIEWPORT_H);
  const spawnBounds = computeSpawnBounds(viewportBounds);
  const zoneArea =
    (spawnBounds.maxX - spawnBounds.minX) *
    (spawnBounds.maxY - spawnBounds.minY);
  const viewportArea = VIEWPORT_W * VIEWPORT_H;
  const targetCount = Math.round(
    BASE_ASTEROID_COUNT * density * (zoneArea / viewportArea),
  );

  const sim = createSimulation(viewportBounds, targetCount);

  const playerStrategy = getStrategy(playerAI);
  const enemyStrategy = getStrategy(enemyAI);
  const playerAIState = playerStrategy.createState();
  const enemyAIState = enemyStrategy.createState();

  let bullets = [];
  const gameState = createGameState();
  let elapsed = 0;
  const events = [];
  let prevPlayerAction = '';
  let prevEnemyAction = '';
  const actionCounts = {};

  // Per-tick loop
  for (let tick = 0; tick < ticks; tick++) {
    if (gameState.phase !== 'playing' && gameState.phase !== 'ending') break;

    const scaledDt = dt * speed;
    elapsed += dt;

    // 1. Player AI update
    if (playerShip.alive) {
      playerStrategy.update(
        playerAIState,
        playerShip,
        enemyShip,
        sim.asteroids,
        scaledDt,
      );
      updateShip(playerShip, scaledDt);
    }

    // 2. Enemy AI update
    if (enemyShip.alive) {
      enemyStrategy.update(
        enemyAIState,
        enemyShip,
        playerShip,
        sim.asteroids,
        scaledDt,
      );
      updateShip(enemyShip, scaledDt);
    }

    // 3. Track action changes
    const playerAction = fmtAction(playerShip);
    const enemyAction = fmtAction(enemyShip);

    // Count actions for distribution stats
    actionCounts[enemyAction] = (actionCounts[enemyAction] || 0) + 1;

    if (prevEnemyAction !== '' && enemyAction !== prevEnemyAction) {
      const debugInfo = getLastDebugInfo();
      events.push({
        tick,
        elapsed,
        type: 'ACTION_CHANGE',
        data: {
          owner: 'enemy',
          prev: prevEnemyAction,
          next: enemyAction,
          scores: debugInfo?.candidates || [],
          winner: debugInfo?.winner || '',
        },
      });
    }
    if (prevPlayerAction !== '' && playerAction !== prevPlayerAction) {
      events.push({
        tick,
        elapsed,
        type: 'ACTION_CHANGE',
        data: {
          owner: 'player',
          prev: prevPlayerAction,
          next: playerAction,
        },
      });
    }
    prevPlayerAction = playerAction;
    prevEnemyAction = enemyAction;

    // 4. Bullet firing
    const eventsBeforeFire = events.length;
    tryFireBullet(playerShip, enemyShip, bullets, scaledDt, elapsed, events);
    tryFireBullet(enemyShip, playerShip, bullets, scaledDt, elapsed, events);

    // Fix tick on FIRE events added this frame (they use tick=-1 as sentinel)
    for (let ei = eventsBeforeFire; ei < events.length; ei++) {
      events[ei].tick = tick;
    }

    // 5. Update camera (follow player)
    camera.x = playerShip.x;
    camera.y = playerShip.y;
    camera.rotation = playerShip.heading + Math.PI / 2;

    // 6. Compute viewport → spawn bounds → target count
    const vb = getViewportBounds(camera, VIEWPORT_W, VIEWPORT_H);
    const sb = computeSpawnBounds(vb);
    const za = (sb.maxX - sb.minX) * (sb.maxY - sb.minY);
    sim.targetCount = Math.round(
      BASE_ASTEROID_COUNT * density * (za / viewportArea),
    );

    // 7. Update simulation (asteroids: move, collide, recycle, spawn)
    updateSimulation(sim, dt, vb, playerShip.vx, playerShip.vy);

    // 8. Update bullets (move, expire, asteroid collisions)
    for (const bullet of bullets) {
      updateBullet(bullet, scaledDt);
    }
    bullets = bullets.filter((b) => !isBulletExpired(b));
    bullets = checkBulletAsteroidCollisions(bullets, sim.asteroids);

    // 9. Bullet-ship collisions
    if (gameState.phase === 'playing' || gameState.phase === 'ending') {
      const collisionResult = processBulletShipCollisions(
        bullets,
        playerShip,
        enemyShip,
      );
      bullets = collisionResult.bullets;
      if (collisionResult.playerHit) {
        playerShip.alive = false;
        gameState.explosions.push(createExplosion(playerShip.x, playerShip.y));
        events.push({
          tick,
          elapsed,
          type: 'KILL',
          data: { victim: 'player', killer: 'enemy', cause: 'bullet' },
        });
      }
      if (collisionResult.enemyHit) {
        enemyShip.alive = false;
        gameState.explosions.push(createExplosion(enemyShip.x, enemyShip.y));
        events.push({
          tick,
          elapsed,
          type: 'KILL',
          data: { victim: 'enemy', killer: 'player', cause: 'bullet' },
        });
      }

      // Ship-asteroid collisions
      if (
        playerShip.alive &&
        checkShipAsteroidCollision(playerShip, sim.asteroids)
      ) {
        playerShip.alive = false;
        gameState.explosions.push(createExplosion(playerShip.x, playerShip.y));
        events.push({
          tick,
          elapsed,
          type: 'KILL',
          data: { victim: 'player', killer: 'asteroid', cause: 'asteroid' },
        });
      }
      if (
        enemyShip.alive &&
        checkShipAsteroidCollision(enemyShip, sim.asteroids)
      ) {
        enemyShip.alive = false;
        gameState.explosions.push(createExplosion(enemyShip.x, enemyShip.y));
        events.push({
          tick,
          elapsed,
          type: 'KILL',
          data: { victim: 'enemy', killer: 'asteroid', cause: 'asteroid' },
        });
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

    // 10. Proximity detection (ship within 2× asteroid collisionRadius)
    for (const ast of sim.asteroids) {
      for (const ship of [playerShip, enemyShip]) {
        const dx = ship.x - ast.x;
        const dy = ship.y - ast.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PROXIMITY_FACTOR * ast.collisionRadius) {
          events.push({
            tick,
            elapsed,
            type: 'PROXIMITY',
            data: {
              owner: ship.owner,
              dist: Math.round(dist),
              radius: ast.collisionRadius,
            },
          });
        }
      }
    }
  }

  return {
    events,
    stats: {
      ticks,
      actionCounts,
      winner:
        gameState.phase === 'playerWin'
          ? 'player'
          : gameState.phase === 'playerDead'
            ? 'enemy'
            : null,
    },
  };
}

// ── Aggregate Statistics ────────────────────────────────────────────────

function computeAggregateStats(allResults, config) {
  const totalEvents = { ACTION_CHANGE: 0, FIRE: 0, PROXIMITY: 0, KILL: 0 };
  const allDetections = [];
  const wins = { player: 0, enemy: 0, draw: 0 };

  for (const result of allResults) {
    for (const event of result.events) {
      totalEvents[event.type] = (totalEvents[event.type] || 0) + 1;
    }

    if (result.stats.winner === 'player') wins.player++;
    else if (result.stats.winner === 'enemy') wins.enemy++;
    else wins.draw++;

    // Run detectors
    for (const detName of config.detectors) {
      const detector = DETECTOR_MAP[detName];
      if (detector) {
        const dets = detector(result.events);
        allDetections.push(...dets);
      }
    }
  }

  // Aggregate action distribution
  const totalActionCounts = {};
  for (const result of allResults) {
    for (const [action, count] of Object.entries(result.stats.actionCounts)) {
      totalActionCounts[action] = (totalActionCounts[action] || 0) + count;
    }
  }

  return { totalEvents, allDetections, totalActionCounts, wins };
}

// ── Output ──────────────────────────────────────────────────────────────

function printSummary(config, stats) {
  const { totalEvents, allDetections, totalActionCounts, wins } = stats;
  const n = config.games;

  console.log('\n=== Simulation Summary ===');
  console.log(
    `Games: ${n} | Ticks/game: ${config.ticks} | dt: ${config.dt.toFixed(4)}`,
  );
  console.log(`Player AI: ${config.playerAI} | Enemy AI: ${config.enemyAI}`);
  console.log(
    `Density: ${config.density} | Speed: ${config.speed} | Thrust: ${config.thrust}`,
  );

  console.log(
    `\nResults: Player wins: ${wins.player} | Enemy wins: ${wins.enemy} | No kill: ${wins.draw}`,
  );

  console.log('\nEvents:');
  for (const [type, count] of Object.entries(totalEvents)) {
    const avg = (count / n).toFixed(1);
    console.log(`  ${type}: ${count} (${avg}/game)`);
  }

  if (config.detectors.length > 0) {
    console.log('\nDetections:');
    const detCounts = {};
    for (const d of allDetections) {
      detCounts[d.type] = (detCounts[d.type] || 0) + 1;
    }
    for (const detName of config.detectors) {
      console.log(`  ${detName}: ${detCounts[detName] || 0}`);
    }
  }

  // Action distribution
  const totalTicks = Object.values(totalActionCounts).reduce(
    (a, b) => a + b,
    0,
  );
  if (totalTicks > 0) {
    console.log('\nAction distribution (enemy):');
    const sorted = Object.entries(totalActionCounts).sort(
      ([, a], [, b]) => b - a,
    );
    const parts = sorted.map(
      ([action, count]) =>
        `  ${action}: ${((count / totalTicks) * 100).toFixed(1)}%`,
    );
    console.log(parts.join('\n'));
  }

  return allDetections;
}

function printVerboseGame(gameIndex, result) {
  console.log(`\n--- Game ${gameIndex + 1} ---`);
  for (const event of result.events) {
    const prefix = `[${event.type} tick=${event.tick} ${event.elapsed.toFixed(2)}s]`;
    if (event.type === 'ACTION_CHANGE') {
      console.log(
        `${prefix} ${event.data.owner} ${event.data.prev} → ${event.data.next}`,
      );
    } else if (event.type === 'FIRE') {
      console.log(
        `${prefix} ${event.data.owner} dist=${event.data.dist} angle=${event.data.angle}`,
      );
    } else if (event.type === 'PROXIMITY') {
      console.log(
        `${prefix} ${event.data.owner} dist=${event.data.dist} radius=${Math.round(event.data.radius)}`,
      );
    } else if (event.type === 'KILL') {
      console.log(
        `${prefix} ${event.data.victim} killed by ${event.data.killer} (${event.data.cause})`,
      );
    }
  }
}

function printDetection(det) {
  console.log(
    `\n[DETECTION ${det.type}] tick=${det.tick} elapsed=${det.elapsed.toFixed(2)}s`,
  );
  if (det.data) {
    for (const [key, value] of Object.entries(det.data)) {
      if (key === 'scores' && Array.isArray(value)) {
        console.log(
          `  scores: ${value.map((s) => `${s.name}:${Math.round(s.score)}`).join(' ')}`,
        );
      } else {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  if (det.gap !== undefined) {
    console.log(
      `  gap=${det.gap.toFixed(3)}s < HOLD_TIME=${HOLD_TIME.toFixed(3)}s`,
    );
  }
}

// ── Bridge ───────────────────────────────────────────────────────────────

/**
 * Process a single JSON-lines command for the Python bridge.
 * Pure function: takes current env (or null) and a raw JSON string,
 * returns { response, shouldExit, env }.
 *
 * @param {GameEnv|null} env - current environment (null if not yet reset)
 * @param {string} line - raw JSON string from stdin
 * @returns {{ response: object, shouldExit: boolean, env: GameEnv|null }}
 */
export function processCommand(env, line) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (err) {
    return {
      response: { error: `Invalid JSON: ${err.message}` },
      shouldExit: false,
      env,
    };
  }

  switch (parsed.command) {
    case 'reset': {
      const newEnv = new GameEnv();
      const obs = newEnv.reset(parsed.config || {});
      return {
        response: { observation: Array.from(obs) },
        shouldExit: false,
        env: newEnv,
      };
    }
    case 'step': {
      if (env === null) {
        return {
          response: { error: 'Environment not initialized. Call reset first.' },
          shouldExit: false,
          env,
        };
      }
      try {
        const result = env.step(parsed.action, parsed.fire ?? 0);
        return {
          response: {
            observation: Array.from(result.observation),
            reward: result.reward,
            done: result.done,
            info: result.info,
          },
          shouldExit: false,
          env,
        };
      } catch (err) {
        return {
          response: { error: `Invalid action: ${err.message}` },
          shouldExit: false,
          env,
        };
      }
    }
    case 'close': {
      return { response: { status: 'closed' }, shouldExit: true, env };
    }
    default: {
      return {
        response: { error: `Unknown command: ${parsed.command}` },
        shouldExit: false,
        env,
      };
    }
  }
}

/**
 * Run the bridge I/O loop: read JSON commands from stdin, write JSON responses to stdout.
 */
async function runBridge() {
  let env = null;
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    const result = processCommand(env, line);
    env = result.env;
    process.stdout.write(`${JSON.stringify(result.response)}\n`);
    if (result.shouldExit) {
      rl.close();
      process.exit(0);
    }
  }
  process.exit(0);
}

// ── Main Entry Point ────────────────────────────────────────────────────

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('simulate.js') ||
    process.argv[1].endsWith('simulate'));

if (isMain) {
  const argv = process.argv.slice(2);
  const config = parseArgs(argv);

  if (config.bridge && argv.includes('--games')) {
    process.stderr.write(
      'Error: --bridge and --games are mutually exclusive\n',
    );
    process.exit(1);
  }

  if (config.bridge) {
    // Self-play strategy — only available in Node.js (uses onnxruntime-node)
    try {
      await import('./src/ai-neural-node.js');
    } catch (_err) {
      // onnxruntime-node not installed — self-play strategy unavailable
    }

    runBridge().catch((err) => {
      process.stderr.write(`Bridge error: ${err.message}\n`);
      process.exit(1);
    });
  } else {
    let restoreRandom;
    if (config.seed !== null) {
      restoreRandom = installSeededRandom(config.seed);
    }

    const allResults = [];
    for (let i = 0; i < config.games; i++) {
      const result = runGame(config);
      allResults.push(result);

      if (config.verbose) {
        printVerboseGame(i, result);
      }
    }

    const stats = computeAggregateStats(allResults, config);
    const allDetections = printSummary(config, stats);

    // Print verbose detection details
    if (config.verbose && allDetections.length > 0) {
      console.log('\n=== Detection Details ===');
      for (const det of allDetections) {
        printDetection(det);
      }
    }

    if (restoreRandom) restoreRandom();

    process.exit(allDetections.length > 0 ? 1 : 0);
  }
}
