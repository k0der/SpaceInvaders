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

/** Base penalty for collision (decayed by step index). */
export const COLLISION_BASE_PENALTY = -10000;

/** Exponential decay rate for collision penalty per step. */
export const COLLISION_DECAY = 0.8;

/** Weight applied to distance-to-target (negative = closer is better). */
export const DISTANCE_WEIGHT = -8;

/** Bonus for aiming toward target at closest approach. */
export const AIM_BONUS = 400;

/** Weight for closing speed bonus (dot of velocity toward target). */
export const CLOSING_SPEED_WEIGHT = 8;

/** Bonus per sim step where ship has a viable firing solution. */
export const FIRE_OPPORTUNITY_BONUS = 300;

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
  const positions = [
    {
      x: clone.x,
      y: clone.y,
      heading: clone.heading,
      vx: clone.vx,
      vy: clone.vy,
    },
  ];

  clone.thrust = action.thrust;
  clone.rotatingLeft = action.rotatingLeft;
  clone.rotatingRight = action.rotatingRight;
  clone.braking = action.braking;

  for (let i = 0; i < steps; i++) {
    updateShip(clone, dt);
    positions.push({
      x: clone.x,
      y: clone.y,
      heading: clone.heading,
      vx: clone.vx,
      vy: clone.vy,
    });
  }

  return positions;
}

/**
 * Score a simulated trajectory based on:
 * - Time-decayed collision penalty (first collision only — ship would be dead)
 * - Closest approach to target across trajectory (lower = better)
 * - Aim bonus for pointing toward target at closest approach
 * - Closing velocity bonus at closest approach (reward approaching the target)
 * - Fire opportunity bonus for steps with viable firing solutions
 */
export function scoreTrajectory(positions, target, asteroids, simDt) {
  let score = 0;

  // Check for first collision only (ship dies on first hit, later ones are moot)
  const shipRadius = SHIP_SIZE;
  let collided = false;
  for (let i = 1; i < positions.length && !collided; i++) {
    const t = i * simDt;
    const pos = positions[i];

    for (const ast of asteroids) {
      const predicted = predictAsteroidAt(ast, t);
      const dx = pos.x - predicted.x;
      const dy = pos.y - predicted.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < predicted.radius + shipRadius) {
        score += COLLISION_BASE_PENALTY * Math.exp(-COLLISION_DECAY * i);
        collided = true;
        break;
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
  score += AIM_BONUS * Math.cos(angleDiff);

  // Closing velocity bonus at closest approach point.
  // Using bestPos avoids "overshoot terror": when the AI would fly past
  // the target, the final-step velocity points away, causing a massive
  // penalty that makes the AI turn perpendicular. At the closest approach,
  // the closing speed naturally reflects whether the AI is still converging.
  const toTargetX = targetPredX - bestPos.x;
  const toTargetY = targetPredY - bestPos.y;
  const toTargetDist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
  if (toTargetDist > 0) {
    const dirX = toTargetX / toTargetDist;
    const dirY = toTargetY / toTargetDist;
    const closingSpeed = bestPos.vx * dirX + bestPos.vy * dirY;
    score += CLOSING_SPEED_WEIGHT * closingSpeed;
  }

  // Fire opportunity bonus: count steps with a viable firing solution
  // (aimed within FIRE_ANGLE and within MAX_FIRE_RANGE of predicted target).
  // This breaks circular orbits by rewarding trajectories that create shots.
  for (let i = 1; i < positions.length; i++) {
    const t = i * simDt;
    const predX = target.x + target.vx * t;
    const predY = target.y + target.vy * t;
    const fdx = predX - positions[i].x;
    const fdy = predY - positions[i].y;
    const fDist = Math.sqrt(fdx * fdx + fdy * fdy);
    if (fDist > MAX_FIRE_RANGE) continue;
    const fireAngle = Math.atan2(fdy, fdx);
    let fireDiff = fireAngle - positions[i].heading;
    while (fireDiff > Math.PI) fireDiff -= 2 * Math.PI;
    while (fireDiff < -Math.PI) fireDiff += 2 * Math.PI;
    if (Math.abs(fireDiff) < FIRE_ANGLE) {
      score += FIRE_OPPORTUNITY_BONUS;
    }
  }

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
