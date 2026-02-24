import { FIRE_COOLDOWN } from './bullet.js';
import { MAX_SPEED } from './ship.js';

/** Number of floats in the observation vector. */
export const OBSERVATION_SIZE = 36;

/** Number of nearest-asteroid observation slots. */
export const MAX_ASTEROID_OBS = 8;

/** Maximum distance (px) for asteroid inclusion. */
const MAX_ASTEROID_DISTANCE = 1000;

/** Normalization divisor for asteroid approach speed. */
const APPROACH_SPEED_NORM = 200;

/** Normalization divisor for distance features. */
const DISTANCE_NORM = 1000;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

/**
 * Select the k nearest asteroids within maxDistance of the ship.
 * Returns an array of asteroid objects sorted by distance (nearest first).
 *
 * @param {{ x: number, y: number }} ship
 * @param {Array} asteroids
 * @param {number} [k=MAX_ASTEROID_OBS]
 * @param {number} [maxDistance=MAX_ASTEROID_DISTANCE]
 * @returns {Array} nearest asteroid objects (length ≤ k)
 */
export function selectNearestAsteroids(
  ship,
  asteroids,
  k = MAX_ASTEROID_OBS,
  maxDistance = MAX_ASTEROID_DISTANCE,
) {
  const nearby = [];
  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const adx = a.x - ship.x;
    const ady = a.y - ship.y;
    const aDist = Math.sqrt(adx * adx + ady * ady);
    if (aDist <= maxDistance) {
      nearby.push({ asteroid: a, dist: aDist, dx: adx, dy: ady });
    }
  }
  nearby.sort((a, b) => a.dist - b.dist);
  const count = Math.min(nearby.length, k);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(nearby[i].asteroid);
  }
  return result;
}

/**
 * Build an ego-centric normalized observation vector from game state.
 * Pure function — no mutation of inputs, no side effects.
 *
 * @param {Object} ship - the controlled ship
 * @param {Object} target - the opponent ship
 * @param {Array} asteroids - array of asteroid objects
 * @param {number} [k=MAX_ASTEROID_OBS] - number of asteroid slots
 * @returns {{ obs: Float32Array, selectedAsteroids: Set }} observation vector and selected asteroid refs
 */
export function buildObservation(
  ship,
  target,
  asteroids,
  k = MAX_ASTEROID_OBS,
) {
  const obs = new Float32Array(OBSERVATION_SIZE);

  // --- Self state (indices 0–5) ---
  const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  obs[0] = clamp(speed / MAX_SPEED, 0, 1);

  if (speed > 0) {
    const velAngle = Math.atan2(ship.vy, ship.vx);
    obs[1] = clamp(normalizeAngle(velAngle - ship.heading) / Math.PI, -1, 1);
  }
  // else obs[1] = 0 (already zero from Float32Array init)

  obs[2] = clamp(ship.thrustIntensity, 0, 1);

  obs[3] = ship.rotatingLeft ? -1 : ship.rotatingRight ? 1 : 0;

  obs[4] = ship.alive ? 1 : 0;

  obs[5] = clamp((ship.fireCooldown || 0) / FIRE_COOLDOWN, 0, 1);

  // --- Target state (indices 6–11) ---
  const tdx = target.x - ship.x;
  const tdy = target.y - ship.y;
  const tDist = Math.sqrt(tdx * tdx + tdy * tdy);

  obs[6] = clamp(tDist / DISTANCE_NORM, 0, 1);

  if (tDist > 0) {
    const absAngle = Math.atan2(tdy, tdx);
    obs[7] = clamp(normalizeAngle(absAngle - ship.heading) / Math.PI, -1, 1);

    // Closing speed: projection of relative velocity onto line-of-sight
    const ux = tdx / tDist;
    const uy = tdy / tDist;
    const rvx = ship.vx - target.vx;
    const rvy = ship.vy - target.vy;
    obs[9] = clamp((rvx * ux + rvy * uy) / MAX_SPEED, -1, 1);

    // Lateral speed: projection onto perpendicular of line-of-sight
    const px = -uy;
    const py = ux;
    obs[10] = clamp((rvx * px + rvy * py) / MAX_SPEED, -1, 1);
  }
  // else indices 7, 9, 10 stay 0

  obs[8] = clamp(
    normalizeAngle(target.heading - ship.heading) / Math.PI,
    -1,
    1,
  );

  obs[11] = target.alive ? 1 : 0;

  // --- Asteroid observations (indices 12–35) ---
  const nearest = selectNearestAsteroids(ship, asteroids, k);
  const selectedAsteroids = new Set(nearest);

  // Precompute dx/dy for observation encoding
  for (let i = 0; i < nearest.length; i++) {
    const a = nearest[i];
    const adx = a.x - ship.x;
    const ady = a.y - ship.y;
    const aDist = Math.sqrt(adx * adx + ady * ady);
    const base = 12 + i * 3;

    obs[base] = clamp(aDist / DISTANCE_NORM, 0, 1);

    if (aDist > 0) {
      const aAngle = Math.atan2(ady, adx);
      obs[base + 1] = clamp(
        normalizeAngle(aAngle - ship.heading) / Math.PI,
        -1,
        1,
      );

      // Approach speed: relative velocity projected toward asteroid
      const aux = adx / aDist;
      const auy = ady / aDist;
      const arvx = ship.vx - a.vx;
      const arvy = ship.vy - a.vy;
      obs[base + 2] = clamp(
        (arvx * aux + arvy * auy) / APPROACH_SPEED_NORM,
        -1,
        1,
      );
    }
    // else bearing and approach speed stay 0
  }
  // Remaining slots stay 0 from Float32Array init

  return { obs, selectedAsteroids };
}
