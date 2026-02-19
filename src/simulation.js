import { createAsteroid, updateAsteroid } from './asteroid.js';
import { computeSpeedBoost, computeTotalKE } from './energy.js';
import {
  detectCollisions,
  resolveCollision,
  separateOverlap,
} from './physics.js';

const SPAWN_STAGGER = 0.3; // seconds between spawns
const MARGIN = 5; // px margin beyond radius for off-screen detection

/**
 * Check if an asteroid is fully off-screen (center + radius + margin past all edges).
 */
export function isOffScreen(asteroid, canvasWidth, canvasHeight) {
  const { x, y, radius } = asteroid;
  return (
    x + radius + MARGIN < 0 ||
    x - radius - MARGIN > canvasWidth ||
    y + radius + MARGIN < 0 ||
    y - radius - MARGIN > canvasHeight
  );
}

/**
 * Pick a random size class with the spec distribution:
 * ~20% large (50–80), ~40% medium (25–49), ~40% small (10–24)
 */
function randomRadius() {
  const roll = Math.random();
  if (roll < 0.2) {
    // Large: 50–80
    return 50 + Math.random() * 30;
  } else if (roll < 0.6) {
    // Medium: 25–49
    return 25 + Math.random() * 24;
  } else {
    // Small: 10–24
    return 10 + Math.random() * 14;
  }
}

/**
 * Get speed range for a given radius.
 * Large (50–80): 15–30 px/s
 * Medium (25–49): 30–60 px/s
 * Small (10–24): 60–120 px/s
 */
function speedForRadius(radius) {
  if (radius >= 50) return 15 + Math.random() * 15;
  if (radius >= 25) return 30 + Math.random() * 30;
  return 60 + Math.random() * 60;
}

/**
 * Spawn a new asteroid from a random screen edge, aimed roughly inward.
 * Optional speedMultiplier scales the base speed (default 1.0).
 */
export function spawnAsteroidFromEdge(
  canvasWidth,
  canvasHeight,
  speedMultiplier = 1.0,
) {
  const radius = randomRadius();
  const speed = speedForRadius(radius) * speedMultiplier;
  const edge = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom

  let x, y, baseAngle;

  switch (edge) {
    case 0: // left
      x = -radius - 1;
      y = Math.random() * canvasHeight;
      baseAngle = 0; // aiming right
      break;
    case 1: // right
      x = canvasWidth + radius + 1;
      y = Math.random() * canvasHeight;
      baseAngle = Math.PI; // aiming left
      break;
    case 2: // top
      x = Math.random() * canvasWidth;
      y = -radius - 1;
      baseAngle = Math.PI / 2; // aiming down
      break;
    default: // bottom
      x = Math.random() * canvasWidth;
      y = canvasHeight + radius + 1;
      baseAngle = -Math.PI / 2; // aiming up
      break;
  }

  // Add angular spread of ±30° (±PI/6)
  const spread = (Math.random() * 2 - 1) * (Math.PI / 6);
  const angle = baseAngle + spread;

  return createAsteroid({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
  });
}

/**
 * Create the simulation state with an initial population of asteroids.
 */
export function createSimulation(canvasWidth, canvasHeight, targetCount = 20) {
  const asteroids = [];
  for (let i = 0; i < targetCount; i++) {
    asteroids.push(spawnAsteroidFromEdge(canvasWidth, canvasHeight));
  }

  const baselineKEPerAsteroid = computeTotalKE(asteroids) / asteroids.length;

  return {
    asteroids,
    targetCount,
    spawnTimer: 0,
    baselineKEPerAsteroid,
  };
}

/**
 * Update the simulation: move asteroids, remove off-screen ones, spawn replacements.
 */
export function updateSimulation(sim, dt, canvasWidth, canvasHeight) {
  // Update all asteroids
  for (const a of sim.asteroids) {
    updateAsteroid(a, dt);
  }

  // Detect and resolve collisions
  const pairs = detectCollisions(sim.asteroids);
  for (const [a, b] of pairs) {
    separateOverlap(a, b);
    resolveCollision(a, b);
  }

  // Remove off-screen asteroids
  sim.asteroids = sim.asteroids.filter(
    (a) => !isOffScreen(a, canvasWidth, canvasHeight),
  );

  // Spawn new asteroids if below target (staggered), with energy-sustaining boost
  sim.spawnTimer += dt;
  if (
    sim.asteroids.length < sim.targetCount &&
    sim.spawnTimer >= SPAWN_STAGGER
  ) {
    const boost = computeSpeedBoost(
      sim.baselineKEPerAsteroid,
      sim.targetCount,
      sim.asteroids,
    );
    sim.asteroids.push(spawnAsteroidFromEdge(canvasWidth, canvasHeight, boost));
    sim.spawnTimer = 0;
  }
}
