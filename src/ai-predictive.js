/**
 * Predictive AI — trajectory simulation strategy.
 *
 * Each frame, generates 7 candidate actions, simulates each forward ~1.5s
 * using real ship physics, scores the outcomes, and picks the best action.
 * Firing is a separate snap decision based on current aim geometry.
 */

import { FIRE_ANGLE, MAX_FIRE_RANGE } from './ai-reactive.js';
import { SHIP_SIZE, updateShip } from './ship.js';

/** Number of simulation steps per candidate. */
export const SIM_STEPS = 15;

/** Time step for each simulation step (seconds). */
export const SIM_DT = 0.1;

/** Score penalty for a collision during simulation. */
export const COLLISION_PENALTY = -10000;

/** Weight applied to distance-to-target (negative = closer is better). */
export const DISTANCE_WEIGHT = -1;

/** Bonus for aiming toward target at end of trajectory. */
export const AIM_BONUS = 500;

/**
 * Clone only the physics-relevant fields of a ship for simulation.
 */
export function cloneShipForSim(ship) {
  return {
    x: ship.x,
    y: ship.y,
    vx: ship.vx,
    vy: ship.vy,
    heading: ship.heading,
    thrustIntensity: ship.thrustIntensity,
    thrustPower: ship.thrustPower,
    alive: true,
    thrust: false,
    rotatingLeft: false,
    rotatingRight: false,
    braking: false,
  };
}

/**
 * Linearly extrapolate an asteroid's position at time t.
 * Returns { x, y, radius } for collision checking.
 */
export function predictAsteroidAt(asteroid, t) {
  return {
    x: asteroid.x + asteroid.vx * t,
    y: asteroid.y + asteroid.vy * t,
    radius: asteroid.collisionRadius,
  };
}

/**
 * Define the 7 candidate actions for trajectory simulation.
 */
export function defineCandidates() {
  return [
    { thrust: true, rotatingLeft: false, rotatingRight: false, braking: false },
    { thrust: true, rotatingLeft: true, rotatingRight: false, braking: false },
    { thrust: true, rotatingLeft: false, rotatingRight: true, braking: false },
    {
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    },
    { thrust: false, rotatingLeft: true, rotatingRight: false, braking: false },
    { thrust: false, rotatingLeft: false, rotatingRight: true, braking: false },
    { thrust: false, rotatingLeft: false, rotatingRight: false, braking: true },
  ];
}

/**
 * Simulate a ship clone forward for `steps` time steps, applying the given action.
 * Returns an array of positions (length = steps + 1, including the initial position).
 */
export function simulateTrajectory(clone, action, steps, dt) {
  const positions = [{ x: clone.x, y: clone.y, heading: clone.heading }];

  clone.thrust = action.thrust;
  clone.rotatingLeft = action.rotatingLeft;
  clone.rotatingRight = action.rotatingRight;
  clone.braking = action.braking;

  for (let i = 0; i < steps; i++) {
    updateShip(clone, dt);
    positions.push({ x: clone.x, y: clone.y, heading: clone.heading });
  }

  return positions;
}

/**
 * Score a simulated trajectory based on:
 * - Collision with asteroids (huge penalty)
 * - Closest approach to target across trajectory (lower = better)
 * - Aim bonus for pointing toward target at closest approach
 */
export function scoreTrajectory(positions, target, asteroids, simDt) {
  let score = 0;

  // Check for collisions at each step
  const shipRadius = SHIP_SIZE;
  for (let i = 1; i < positions.length; i++) {
    const t = i * simDt;
    const pos = positions[i];

    for (const ast of asteroids) {
      const predicted = predictAsteroidAt(ast, t);
      const dx = pos.x - predicted.x;
      const dy = pos.y - predicted.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < predicted.radius + shipRadius) {
        score += COLLISION_PENALTY;
      }
    }
  }

  // Find the closest approach to the predicted target across the trajectory
  let minDist = Infinity;
  let bestPos = positions[positions.length - 1];
  let bestT = (positions.length - 1) * simDt;
  for (let i = 1; i < positions.length; i++) {
    const t = i * simDt;
    const predX = target.x + target.vx * t;
    const predY = target.y + target.vy * t;
    const ddx = positions[i].x - predX;
    const ddy = positions[i].y - predY;
    const d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (d < minDist) {
      minDist = d;
      bestPos = positions[i];
      bestT = t;
    }
  }
  score += DISTANCE_WEIGHT * minDist;

  // Aim bonus: how well is the ship pointed at the target at closest approach?
  const targetPredX = target.x + target.vx * bestT;
  const targetPredY = target.y + target.vy * bestT;
  const angleToTarget = Math.atan2(
    targetPredY - bestPos.y,
    targetPredX - bestPos.x,
  );
  let angleDiff = angleToTarget - bestPos.heading;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  // cos(angleDiff) = 1 when pointed at target, -1 when pointed away
  score += AIM_BONUS * Math.cos(angleDiff);

  return score;
}

/**
 * Select the best action by simulating all candidates and picking the highest score.
 */
export function selectBestAction(ship, target, asteroids) {
  const candidates = defineCandidates();
  let bestScore = -Infinity;
  let bestAction = candidates[0];

  for (const action of candidates) {
    const clone = cloneShipForSim(ship);
    const positions = simulateTrajectory(clone, action, SIM_STEPS, SIM_DT);
    const score = scoreTrajectory(positions, target, asteroids, SIM_DT);

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

/**
 * Normalize an angle to [-PI, PI].
 */
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Create predictive AI state (currently minimal).
 */
function createPredictiveState() {
  return {};
}

/**
 * Predictive AI update function.
 * Selects the best action via trajectory simulation and applies it.
 * Firing decision is a separate snap check based on current aim.
 */
function updatePredictiveAI(_state, ship, target, asteroids, _dt) {
  if (!ship.alive || !target.alive) {
    ship.thrust = false;
    ship.rotatingLeft = false;
    ship.rotatingRight = false;
    ship.braking = false;
    ship.fire = false;
    return;
  }

  const action = selectBestAction(ship, target, asteroids);
  ship.thrust = action.thrust;
  ship.rotatingLeft = action.rotatingLeft;
  ship.rotatingRight = action.rotatingRight;
  ship.braking = action.braking;

  // Fire decision: snap check based on current aim geometry
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angleToTarget = Math.atan2(dy, dx);
  const headingDiff = Math.abs(normalizeAngle(angleToTarget - ship.heading));

  ship.fire = headingDiff < FIRE_ANGLE && dist < MAX_FIRE_RANGE;
}

/**
 * Predictive AI strategy object — pluggable interface.
 */
export const predictiveStrategy = {
  createState: createPredictiveState,
  update: updatePredictiveAI,
};
