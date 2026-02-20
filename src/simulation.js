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
 * Check if an asteroid is fully outside the viewport bounds (center + radius + margin past all edges).
 * @param {object} asteroid
 * @param {object} bounds - { minX, maxX, minY, maxY }
 */
export function isOffScreen(asteroid, bounds) {
  const { x, y, radius } = asteroid;
  return (
    x + radius + MARGIN < bounds.minX ||
    x - radius - MARGIN > bounds.maxX ||
    y + radius + MARGIN < bounds.minY ||
    y - radius - MARGIN > bounds.maxY
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
 * Spawn a new asteroid from a random viewport edge, aimed roughly inward toward bounds center.
 * @param {object} bounds - { minX, maxX, minY, maxY }
 * @param {number} speedMultiplier - scales the base speed (default 1.0)
 */
export function spawnAsteroidFromEdge(bounds, speedMultiplier = 1.0) {
  const radius = randomRadius();
  const speed = speedForRadius(radius) * speedMultiplier;
  const edge = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  let x, y;

  switch (edge) {
    case 0: // left
      x = bounds.minX - radius - 1;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      break;
    case 1: // right
      x = bounds.maxX + radius + 1;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      break;
    case 2: // top
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.minY - radius - 1;
      break;
    default: // bottom
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.maxY + radius + 1;
      break;
  }

  // Aim toward bounds center with ±30° spread
  const baseAngle = Math.atan2(centerY - y, centerX - x);
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
 * @param {object} bounds - { minX, maxX, minY, maxY }
 * @param {number} targetCount
 */
export function createSimulation(bounds, targetCount = 20) {
  const asteroids = [];
  for (let i = 0; i < targetCount; i++) {
    asteroids.push(spawnAsteroidFromEdge(bounds));
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
 * @param {object} sim
 * @param {number} dt
 * @param {object} bounds - { minX, maxX, minY, maxY }
 */
export function updateSimulation(sim, dt, bounds) {
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
  sim.asteroids = sim.asteroids.filter((a) => !isOffScreen(a, bounds));

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
    sim.asteroids.push(spawnAsteroidFromEdge(bounds, boost));
    sim.spawnTimer = 0;
  }
}
