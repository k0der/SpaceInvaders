/**
 * Predictive AI — trajectory simulation strategy.
 *
 * Each frame, generates 7 fixed-action candidates plus 2 dynamic pursuit
 * candidates, simulates each forward ~1.5s using real ship physics, scores
 * the outcomes, and picks the best action.
 * Firing is a separate snap decision based on current aim geometry.
 */

import { FIRE_ANGLE, MAX_FIRE_RANGE } from './ai-reactive.js';
import { fmtAction } from './debug.js';
import { SHIP_SIZE, updateShip } from './ship.js';

/** Last debug info captured by selectBestAction. */
let _lastDebugInfo = null;

/**
 * Return the last debug info captured by selectBestAction, or null.
 */
export function getLastDebugInfo() {
  return _lastDebugInfo;
}

/** Number of simulation steps per candidate. */
export const SIM_STEPS = 15;

/** Time step for each simulation step (seconds). */
export const SIM_DT = 0.1;

/** Base penalty for collision — always catastrophic (collision = death). */
export const COLLISION_BASE_PENALTY = -10000;

/** Linear tiebreaker: later collisions are slightly less bad (more time to re-evaluate). */
export const COLLISION_EARLY_BONUS = 50;

/** Number of brake steps before pursuit in the brake-pursuit candidate. */
export const BRAKE_PURSUIT_STEPS = 5;

/** Rotation deadzone for pursuit candidates (rad). */
const PURSUIT_DEADZONE = 0.05;

/** Thrust angle for pursuit candidates (rad) — thrust when facing within this. */
const PURSUIT_THRUST_ANGLE = Math.PI / 3;

/** Speed threshold for pursuit braking. */
const PURSUIT_BRAKE_SPEED = 50;

/** Weight applied to distance-to-target (negative = closer is better). */
export const DISTANCE_WEIGHT = -8;

/** Bonus for aiming toward target at closest approach. */
export const AIM_BONUS = 400;

/** Weight for closing speed bonus (dot of velocity toward target). */
export const CLOSING_SPEED_WEIGHT = 8;

/** Proximity scaling factor for aim bonus — amplifies aim importance at close range. */
export const AIM_PROXIMITY_SCALE = 5;

/** Bonus per sim step where ship has a viable firing solution. */
export const FIRE_OPPORTUNITY_BONUS = 300;

/** Score bonus for matching the previous frame's action (reduces oscillation). */
export const HYSTERESIS_BONUS = 80;

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
 * - Catastrophic collision penalty (first collision only — ship would be dead)
 * - Closest approach to target across trajectory (lower = better)
 * - Average aim bonus across all steps (avoids crossover artifact at overshoot)
 * - Approach rate bonus (net distance closed, immune to overshoot terror)
 * - Fire opportunity bonus for steps with viable firing solutions (proximity-scaled)
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
        score += COLLISION_BASE_PENALTY + COLLISION_EARLY_BONUS * i;
        collided = true;
        break;
      }
    }
  }

  // Find the closest approach to the predicted target across the trajectory
  let minDist = Infinity;
  for (let i = 1; i < positions.length; i++) {
    const t = i * simDt;
    const predX = target.x + target.vx * t;
    const predY = target.y + target.vy * t;
    const ddx = positions[i].x - predX;
    const ddy = positions[i].y - predY;
    const d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (d < minDist) {
      minDist = d;
    }
  }
  score += DISTANCE_WEIGHT * minDist;

  // Aim bonus: average alignment across all trajectory steps.
  // Averaging avoids the "crossover artifact" where a ship passing through
  // the target gets a negative aim reading at the single crossover point,
  // despite being well-aimed for most of the trajectory.
  let aimSum = 0;
  for (let i = 1; i < positions.length; i++) {
    const t = i * simDt;
    const predX = target.x + target.vx * t;
    const predY = target.y + target.vy * t;
    const angleToTarget = Math.atan2(
      predY - positions[i].y,
      predX - positions[i].x,
    );
    let angleDiff = angleToTarget - positions[i].heading;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    aimSum += Math.cos(angleDiff);
  }
  const aimProximityFactor =
    1 + AIM_PROXIMITY_SCALE * Math.max(0, 1 - minDist / MAX_FIRE_RANGE);
  score += AIM_BONUS * (aimSum / (positions.length - 1)) * aimProximityFactor;

  // Approach rate: reward net distance closed over the simulation.
  // Uses (initialDist - finalDist) / simTime instead of instantaneous velocity
  // at a single point, avoiding "overshoot terror" where passing through the
  // target produces a massive negative closing speed.
  const initDx = positions[0].x - target.x;
  const initDy = positions[0].y - target.y;
  const initialDist = Math.sqrt(initDx * initDx + initDy * initDy);

  const lastIdx = positions.length - 1;
  const lastT = lastIdx * simDt;
  const finalTargetX = target.x + target.vx * lastT;
  const finalTargetY = target.y + target.vy * lastT;
  const finDx = positions[lastIdx].x - finalTargetX;
  const finDy = positions[lastIdx].y - finalTargetY;
  const finalDist = Math.sqrt(finDx * finDx + finDy * finDy);

  const simTime = simDt * lastIdx;
  if (simTime > 0) {
    score += (CLOSING_SPEED_WEIGHT * (initialDist - finalDist)) / simTime;
  }

  // Fire opportunity bonus: count steps with a viable firing solution
  // (aimed within FIRE_ANGLE and within MAX_FIRE_RANGE of predicted target).
  // Scaled by proximity — closer shots are worth more, breaking orbits
  // while not rewarding standing still at max range.
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
      score += FIRE_OPPORTUNITY_BONUS * (1 - fDist / MAX_FIRE_RANGE);
    }
  }

  return score;
}

/**
 * Simulate a dynamic pursuit trajectory where the ship adapts each step:
 * rotate toward the predicted target, thrust when facing it, brake otherwise.
 * Optionally brakes for `brakeSteps` before engaging pursuit.
 *
 * Returns { positions, firstAction } where firstAction is the action at step 0.
 */
export function simulatePursuitTrajectory(
  clone,
  target,
  steps,
  dt,
  brakeSteps = 0,
) {
  const positions = [
    {
      x: clone.x,
      y: clone.y,
      heading: clone.heading,
      vx: clone.vx,
      vy: clone.vy,
    },
  ];
  let firstAction = null;

  for (let i = 0; i < steps; i++) {
    const t = (i + 1) * dt;
    const predX = target.x + target.vx * t;
    const predY = target.y + target.vy * t;
    const dx = predX - clone.x;
    const dy = predY - clone.y;
    const headingDiff = normalizeAngle(Math.atan2(dy, dx) - clone.heading);
    const speed = Math.sqrt(clone.vx * clone.vx + clone.vy * clone.vy);

    if (i < brakeSteps) {
      clone.thrust = false;
      clone.braking = speed > 10;
      clone.rotatingLeft = headingDiff < -PURSUIT_DEADZONE;
      clone.rotatingRight = headingDiff > PURSUIT_DEADZONE;
    } else {
      const facingTarget = Math.abs(headingDiff) < PURSUIT_THRUST_ANGLE;
      clone.thrust = facingTarget;
      clone.braking = !facingTarget && speed > PURSUIT_BRAKE_SPEED;
      clone.rotatingLeft = headingDiff < -PURSUIT_DEADZONE;
      clone.rotatingRight = headingDiff > PURSUIT_DEADZONE;
    }

    if (i === 0) {
      firstAction = {
        thrust: clone.thrust,
        rotatingLeft: clone.rotatingLeft,
        rotatingRight: clone.rotatingRight,
        braking: clone.braking,
      };
    }

    updateShip(clone, dt);
    positions.push({
      x: clone.x,
      y: clone.y,
      heading: clone.heading,
      vx: clone.vx,
      vy: clone.vy,
    });
  }

  return { positions, firstAction };
}

/**
 * Check if two action objects have identical control flags.
 */
function actionsMatch(a, b) {
  return (
    a.thrust === b.thrust &&
    a.rotatingLeft === b.rotatingLeft &&
    a.rotatingRight === b.rotatingRight &&
    a.braking === b.braking
  );
}

/**
 * Select the best action by simulating all candidates and picking the highest score.
 * Optional prevAction enables hysteresis — matching candidates get a small bonus
 * to prevent frame-by-frame oscillation between similar-scoring actions.
 */
export function selectBestAction(ship, target, asteroids, prevAction = null) {
  const candidates = defineCandidates();
  let bestScore = -Infinity;
  let bestAction = candidates[0];
  let bestName = '';
  const debugCandidates = [];

  // Evaluate fixed-action candidates
  for (const action of candidates) {
    const clone = cloneShipForSim(ship);
    const positions = simulateTrajectory(clone, action, SIM_STEPS, SIM_DT);
    let score = scoreTrajectory(positions, target, asteroids, SIM_DT);
    if (prevAction && actionsMatch(action, prevAction)) {
      score += HYSTERESIS_BONUS;
    }
    const name = fmtAction(action);
    debugCandidates.push({ name, score });

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
      bestName = name;
    }
  }

  // Evaluate dynamic pursuit candidate (rotate toward target, thrust when facing)
  const pursuitClone = cloneShipForSim(ship);
  const pursuit = simulatePursuitTrajectory(
    pursuitClone,
    target,
    SIM_STEPS,
    SIM_DT,
    0,
  );
  let pursuitScore = scoreTrajectory(
    pursuit.positions,
    target,
    asteroids,
    SIM_DT,
  );
  if (
    prevAction &&
    pursuit.firstAction &&
    actionsMatch(pursuit.firstAction, prevAction)
  ) {
    pursuitScore += HYSTERESIS_BONUS;
  }
  debugCandidates.push({ name: 'PUR', score: pursuitScore });
  if (pursuitScore > bestScore) {
    bestScore = pursuitScore;
    bestAction = pursuit.firstAction;
    bestName = 'PUR';
  }

  // Evaluate brake-pursuit candidate (brake first, then pursue).
  // Only useful when ship has significant velocity — otherwise the brake phase
  // does nothing and the trajectory degenerates into delayed pursuit, producing
  // a misleading firstAction (coast) that the AI would repeat every frame.
  const shipSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (shipSpeed > PURSUIT_BRAKE_SPEED) {
    const brakeClone = cloneShipForSim(ship);
    const brakePursuit = simulatePursuitTrajectory(
      brakeClone,
      target,
      SIM_STEPS,
      SIM_DT,
      BRAKE_PURSUIT_STEPS,
    );
    let brakeScore = scoreTrajectory(
      brakePursuit.positions,
      target,
      asteroids,
      SIM_DT,
    );
    if (
      prevAction &&
      brakePursuit.firstAction &&
      actionsMatch(brakePursuit.firstAction, prevAction)
    ) {
      brakeScore += HYSTERESIS_BONUS;
    }
    debugCandidates.push({ name: 'BRK', score: brakeScore });
    if (brakeScore > bestScore) {
      bestScore = brakeScore;
      bestAction = brakePursuit.firstAction;
      bestName = 'BRK';
    }
  }

  _lastDebugInfo = { candidates: debugCandidates, winner: bestName };

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
 * Create predictive AI state.
 */
function createPredictiveState() {
  return { prevAction: null };
}

/**
 * Predictive AI update function.
 * Selects the best action via trajectory simulation and applies it.
 * Firing decision is a separate snap check based on current aim.
 */
function updatePredictiveAI(state, ship, target, asteroids, _dt) {
  if (!ship.alive || !target.alive) {
    ship.thrust = false;
    ship.rotatingLeft = false;
    ship.rotatingRight = false;
    ship.braking = false;
    ship.fire = false;
    return;
  }

  const action = selectBestAction(ship, target, asteroids, state.prevAction);
  state.prevAction = action;
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
