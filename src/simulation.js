import { createAsteroid, updateAsteroid } from './asteroid.js';
import { computeSpeedBoost, computeTotalKE } from './energy.js';
import {
  detectCollisions,
  resolveCollision,
  separateOverlap,
} from './physics.js';

const SPAWN_BORDER = 300; // px, width of border ring
const RECYCLE_MARGIN = 5; // px, hysteresis beyond spawn bounds
const MAX_SPAWN_PER_FRAME = 10; // cap spawns per frame
const BASE_EDGE_WEIGHT = 100; // min weight per edge (prevents starvation)

/**
 * Expand viewport bounds by SPAWN_BORDER on each side to get spawn bounds.
 * @param {object} viewportBounds - { minX, maxX, minY, maxY }
 * @returns {object} - { minX, maxX, minY, maxY }
 */
export function computeSpawnBounds(viewportBounds) {
  return {
    minX: viewportBounds.minX - SPAWN_BORDER,
    maxX: viewportBounds.maxX + SPAWN_BORDER,
    minY: viewportBounds.minY - SPAWN_BORDER,
    maxY: viewportBounds.maxY + SPAWN_BORDER,
  };
}

/**
 * Compute direction-biased edge selection weights from ship velocity.
 * Edge outward normals: left=(-1,0), right=(+1,0), top=(0,-1), bottom=(0,+1)
 * weight[edge] = max(dot(shipVelocity, edgeOutward), 0) + BASE_EDGE_WEIGHT
 * Normalized to sum to 1.0.
 * @param {number} shipVx
 * @param {number} shipVy
 * @returns {number[]} - [left, right, top, bottom] weights summing to 1.0
 */
export function computeEdgeWeights(shipVx, shipVy) {
  const raw = [
    Math.max(-shipVx, 0) + BASE_EDGE_WEIGHT, // left: outward = (-1, 0)
    Math.max(shipVx, 0) + BASE_EDGE_WEIGHT, // right: outward = (+1, 0)
    Math.max(-shipVy, 0) + BASE_EDGE_WEIGHT, // top: outward = (0, -1)
    Math.max(shipVy, 0) + BASE_EDGE_WEIGHT, // bottom: outward = (0, +1)
  ];
  const total = raw[0] + raw[1] + raw[2] + raw[3];
  return [raw[0] / total, raw[1] / total, raw[2] / total, raw[3] / total];
}

/**
 * Pick an edge using cumulative weighted random selection.
 * @param {number[]} weights - [left, right, top, bottom] summing to 1.0
 * @returns {number} - 0=left, 1=right, 2=top, 3=bottom
 */
export function pickWeightedEdge(weights) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < 3; i++) {
    cumulative += weights[i];
    if (r < cumulative) return i;
  }
  return 3;
}

/**
 * Pick a random size class with the spec distribution:
 * ~20% large (50–80), ~40% medium (25–49), ~40% small (10–24)
 */
function randomRadius() {
  const roll = Math.random();
  if (roll < 0.2) return 50 + Math.random() * 30;
  if (roll < 0.6) return 25 + Math.random() * 24;
  return 10 + Math.random() * 14;
}

/**
 * Get speed range for a given radius.
 * Large (50–80): 15–30 px/s, Medium (25–49): 30–60 px/s, Small (10–24): 60–120 px/s
 */
function speedForRadius(radius) {
  if (radius >= 50) return 15 + Math.random() * 15;
  if (radius >= 25) return 30 + Math.random() * 30;
  return 60 + Math.random() * 60;
}

/**
 * Check if an asteroid is outside the spawn zone (past spawn bounds + recycle margin).
 * @param {object} asteroid
 * @param {object} spawnBounds - { minX, maxX, minY, maxY }
 * @returns {boolean}
 */
export function isOutsideZone(asteroid, spawnBounds) {
  const { x, y, radius } = asteroid;
  return (
    x + radius + RECYCLE_MARGIN < spawnBounds.minX ||
    x - radius - RECYCLE_MARGIN > spawnBounds.maxX ||
    y + radius + RECYCLE_MARGIN < spawnBounds.minY ||
    y - radius - RECYCLE_MARGIN > spawnBounds.maxY
  );
}

/**
 * Spawn a new asteroid in the border ring (outside viewport, inside spawn bounds).
 * Uses direction-biased edge selection and aims roughly toward viewport center.
 * @param {object} viewportBounds - { minX, maxX, minY, maxY }
 * @param {object} spawnBounds - { minX, maxX, minY, maxY }
 * @param {number[]} edgeWeights - [left, right, top, bottom]
 * @param {number} speedMultiplier
 * @returns {object} asteroid
 */
export function spawnAsteroidInBorder(
  viewportBounds,
  spawnBounds,
  edgeWeights,
  speedMultiplier = 1.0,
  headless = false,
) {
  const radius = randomRadius();
  const speed = speedForRadius(radius) * speedMultiplier;
  const edge = pickWeightedEdge(edgeWeights);

  const vpCenterX = (viewportBounds.minX + viewportBounds.maxX) / 2;
  const vpCenterY = (viewportBounds.minY + viewportBounds.maxY) / 2;

  let x, y;

  switch (edge) {
    case 0: // left border: between spawnBounds.minX and viewportBounds.minX
      x =
        spawnBounds.minX +
        Math.random() * (viewportBounds.minX - spawnBounds.minX);
      y =
        spawnBounds.minY +
        Math.random() * (spawnBounds.maxY - spawnBounds.minY);
      break;
    case 1: // right border: between viewportBounds.maxX and spawnBounds.maxX
      x =
        viewportBounds.maxX +
        Math.random() * (spawnBounds.maxX - viewportBounds.maxX);
      y =
        spawnBounds.minY +
        Math.random() * (spawnBounds.maxY - spawnBounds.minY);
      break;
    case 2: // top border: between spawnBounds.minY and viewportBounds.minY
      x =
        spawnBounds.minX +
        Math.random() * (spawnBounds.maxX - spawnBounds.minX);
      y =
        spawnBounds.minY +
        Math.random() * (viewportBounds.minY - spawnBounds.minY);
      break;
    default: // bottom border: between viewportBounds.maxY and spawnBounds.maxY
      x =
        spawnBounds.minX +
        Math.random() * (spawnBounds.maxX - spawnBounds.minX);
      y =
        viewportBounds.maxY +
        Math.random() * (spawnBounds.maxY - viewportBounds.maxY);
      break;
  }

  // Aim toward viewport center with ±30° spread
  const baseAngle = Math.atan2(vpCenterY - y, vpCenterX - x);
  const spread = (Math.random() * 2 - 1) * (Math.PI / 6);
  const angle = baseAngle + spread;

  return createAsteroid({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    headless,
  });
}

/**
 * Spawn a new asteroid at a random position within the full zone (spawn bounds),
 * with a random direction. Used for initial population.
 * @param {object} spawnBounds - { minX, maxX, minY, maxY }
 * @param {number} speedMultiplier
 * @param {boolean} headless
 * @returns {object} asteroid
 */
export function spawnAsteroidInZone(
  spawnBounds,
  speedMultiplier = 1.0,
  headless = false,
) {
  const radius = randomRadius();
  const speed = speedForRadius(radius) * speedMultiplier;
  const x =
    spawnBounds.minX + Math.random() * (spawnBounds.maxX - spawnBounds.minX);
  const y =
    spawnBounds.minY + Math.random() * (spawnBounds.maxY - spawnBounds.minY);
  const angle = Math.random() * Math.PI * 2;

  return createAsteroid({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    headless,
  });
}

/**
 * Create the simulation state with an initial population of asteroids.
 * Asteroids are distributed across the entire zone (viewport + border) for
 * immediate visibility and pre-populated border.
 * @param {object} viewportBounds - { minX, maxX, minY, maxY }
 * @param {number} targetCount
 */
export function createSimulation(
  viewportBounds,
  targetCount = 20,
  headless = false,
) {
  const spawnBounds = computeSpawnBounds(viewportBounds);
  const asteroids = [];
  for (let i = 0; i < targetCount; i++) {
    asteroids.push(spawnAsteroidInZone(spawnBounds, 1.0, headless));
  }

  const baselineKEPerAsteroid = computeTotalKE(asteroids) / asteroids.length;

  return {
    asteroids,
    targetCount,
    baselineKEPerAsteroid,
    headless,
  };
}

/**
 * Update the simulation: move asteroids, resolve collisions, recycle outside zone,
 * spawn in border when below target with direction-biased edge selection.
 * @param {object} sim
 * @param {number} dt
 * @param {object} viewportBounds - { minX, maxX, minY, maxY }
 * @param {number} shipVx - ship x velocity for direction bias
 * @param {number} shipVy - ship y velocity for direction bias
 */
export function updateSimulation(
  sim,
  dt,
  viewportBounds,
  shipVx = 0,
  shipVy = 0,
) {
  // Move all asteroids
  for (const a of sim.asteroids) {
    updateAsteroid(a, dt);
  }

  // Detect and resolve collisions
  const pairs = detectCollisions(sim.asteroids);
  for (const [a, b] of pairs) {
    separateOverlap(a, b);
    resolveCollision(a, b);
  }

  // Compute spawn bounds and remove asteroids outside zone
  const spawnBounds = computeSpawnBounds(viewportBounds);
  sim.asteroids = sim.asteroids.filter((a) => !isOutsideZone(a, spawnBounds));

  // Compute energy boost
  const boost = computeSpeedBoost(
    sim.baselineKEPerAsteroid,
    sim.targetCount,
    sim.asteroids,
  );

  // Compute direction-biased edge weights
  const edgeWeights = computeEdgeWeights(shipVx, shipVy);

  // Spawn in border when below target
  const deficit = sim.targetCount - sim.asteroids.length;
  const toSpawn = Math.min(Math.max(deficit, 0), MAX_SPAWN_PER_FRAME);
  for (let i = 0; i < toSpawn; i++) {
    sim.asteroids.push(
      spawnAsteroidInBorder(
        viewportBounds,
        spawnBounds,
        edgeWeights,
        boost,
        sim.headless,
      ),
    );
  }
}
