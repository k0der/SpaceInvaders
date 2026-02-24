/**
 * Predictive-Optimized AI — trajectory simulation strategy.
 *
 * Each frame, generates 7 fixed-action candidates plus 2 dynamic pursuit
 * candidates, simulates each forward ~1.5s using real ship physics, scores
 * the outcomes, and picks the best action.
 * Firing is a separate snap decision based on current aim geometry.
 */

import { registerStrategy } from './ai-core.js';
import { fmtAction } from './debug.js';
import { SHIP_SIZE, updateShip } from './ship.js';

/** Angular threshold for AI firing (~8.6°) — duplicated from ai-reactive for decoupling. */
export const FIRE_ANGLE = 0.15;

/** Max distance (px) at which AI will fire — duplicated from ai-reactive for decoupling. */
export const MAX_FIRE_RANGE = 500;

/** Bullet speed (px/s) — duplicated from bullet.js for decoupling. */
export const BULLET_SPEED = 600;

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
export const COLLISION_BASE_PENALTY = -20000;

/** Linear tiebreaker: later collisions are slightly less bad (more time to re-evaluate). */
export const COLLISION_EARLY_BONUS = 50;

/** Base penalty for near-miss danger zone — tuned independently of actual collision penalty.
 *  Decoupling this from COLLISION_BASE_PENALTY lets us reduce proximity discouragement
 *  without weakening actual collision deterrence. */
export const DANGER_ZONE_BASE_PENALTY = -10000;

/** Number of brake steps before pursuit in the brake-pursuit candidate. */
export const BRAKE_PURSUIT_STEPS = 5;

/** Rotation deadzone for pursuit candidates (rad). */
const PURSUIT_DEADZONE = 0.05;

/** Thrust angle for pursuit candidates (rad) — thrust when facing within this. */
const PURSUIT_THRUST_ANGLE = Math.PI / 3;

/** Speed threshold for pursuit braking. */
const PURSUIT_BRAKE_SPEED = 50;

/** Weight applied to distance-to-target (negative = closer is better). */
export const DISTANCE_WEIGHT = -3;

/** Bonus for aiming toward target at closest approach. */
export const AIM_BONUS = 400;

/** Weight for closing speed bonus (dot of velocity toward target). */
export const CLOSING_SPEED_WEIGHT = 16;

/** Proximity scaling factor for aim bonus — amplifies aim importance at close range. */
export const AIM_PROXIMITY_SCALE = 5;

/** Bonus per sim step where ship has a viable firing solution. */
export const FIRE_OPPORTUNITY_BONUS = 450;

/** Distance below which current scoring balance applies (close-range combat zone). */
export const ENGAGE_RANGE = 350;

/** Minimum time (seconds) to hold an action before reconsidering. */
export const HOLD_TIME = 0.15;

/** Simulation steps to check for imminent collision during hold. */
export const COLLISION_BREAK_STEPS = 3;

/** Score bonus for matching the previous frame's action (reduces oscillation). */
export const HYSTERESIS_BONUS = 350;

/** Danger zone extends to this factor × collision distance. Near-misses within
 *  this zone receive a graduated penalty (quadratic ramp from 0 at edge to
 *  full collision penalty at the collision boundary). */
export const DANGER_ZONE_FACTOR = 3;

/** Within ENGAGE_RANGE, closing speed weight scales up linearly from 1× at the
 *  boundary to (1 + ENGAGE_CLOSING_SCALE)× at zero distance. Prevents formation
 *  flight stagnation by making the AI progressively more aggressive about
 *  closing distance as it enters combat range. */
export const ENGAGE_CLOSING_SCALE = 3;

/** Default scoring weights for attack behavior (pursue + fire). */
export const DEFAULT_SCORING_WEIGHTS = {
  distance: DISTANCE_WEIGHT,
  aim: AIM_BONUS,
  closingSpeed: CLOSING_SPEED_WEIGHT,
  fireOpportunity: FIRE_OPPORTUNITY_BONUS,
};

/** Scoring weights for fleeing behavior (evade, no fire). */
export const FLEEING_SCORING_WEIGHTS = {
  distance: 3,
  aim: 0,
  closingSpeed: -16,
  fireOpportunity: 0,
};

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
export function scoreTrajectory(
  positions,
  target,
  asteroids,
  simDt,
  weights = DEFAULT_SCORING_WEIGHTS,
) {
  let score = 0;

  // Check for first collision only (ship dies on first hit, later ones are moot)
  // Also track worst near-miss within the danger zone for graduated penalty.
  const shipRadius = SHIP_SIZE;
  let collided = false;
  let worstDanger = 0;
  for (let i = 1; i < positions.length && !collided; i++) {
    const t = i * simDt;
    const pos = positions[i];

    for (const ast of asteroids) {
      const predicted = predictAsteroidAt(ast, t);
      const dx = pos.x - predicted.x;
      const dy = pos.y - predicted.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionDist = predicted.radius + shipRadius;

      if (dist < collisionDist) {
        score += COLLISION_BASE_PENALTY + COLLISION_EARLY_BONUS * i;
        collided = true;
        break;
      }

      const dangerZone = DANGER_ZONE_FACTOR * collisionDist;
      if (dist < dangerZone) {
        const proximity = (dangerZone - dist) / (dangerZone - collisionDist);
        worstDanger = Math.max(worstDanger, proximity * proximity);
      }
    }
  }

  if (!collided && worstDanger > 0) {
    score += DANGER_ZONE_BASE_PENALTY * worstDanger;
  }

  // Compute initial distance to target (used for approach urgency and closing rate)
  const initDx = positions[0].x - target.x;
  const initDy = positions[0].y - target.y;
  const initialDist = Math.sqrt(initDx * initDx + initDy * initDy);

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

  // Distance-scaled approach urgency: stronger pull to close at long range
  const distanceScale =
    1 + Math.max(0, initialDist - ENGAGE_RANGE) / ENGAGE_RANGE;
  score += weights.distance * distanceScale * minDist;

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
  score += weights.aim * (aimSum / (positions.length - 1)) * aimProximityFactor;

  // Approach rate: reward net distance closed over the simulation.
  // Uses (initialDist - finalDist) / simTime instead of instantaneous velocity
  // at a single point, avoiding "overshoot terror" where passing through the
  // target produces a massive negative closing speed.
  const lastIdx = positions.length - 1;
  const lastT = lastIdx * simDt;
  const finalTargetX = target.x + target.vx * lastT;
  const finalTargetY = target.y + target.vy * lastT;
  const finDx = positions[lastIdx].x - finalTargetX;
  const finDy = positions[lastIdx].y - finalTargetY;
  const finalDist = Math.sqrt(finDx * finDx + finDy * finDy);

  const simTime = simDt * lastIdx;
  if (simTime > 0) {
    const closingRate = (initialDist - finalDist) / simTime;
    const closingScale =
      initialDist < ENGAGE_RANGE
        ? 1 + ENGAGE_CLOSING_SCALE * (1 - initialDist / ENGAGE_RANGE)
        : 1;
    score += weights.closingSpeed * closingScale * closingRate;
  }

  // Fire opportunity bonus: count steps with a viable lead-angle firing solution.
  // Uses the same lead-angle logic as the fire decision — scores trajectories
  // by whether shots would actually hit the predicted target position, not just
  // aim at where the target currently is. Scaled by proximity.
  if (weights.fireOpportunity !== 0) {
    for (let i = 1; i < positions.length; i++) {
      const t = i * simDt;
      const predX = target.x + target.vx * t;
      const predY = target.y + target.vy * t;
      const fdx = predX - positions[i].x;
      const fdy = predY - positions[i].y;
      const fDist = Math.sqrt(fdx * fdx + fdy * fdy);
      if (fDist > MAX_FIRE_RANGE) continue;
      // Lead-angle: where target will be when a bullet fired now arrives
      const bulletTime = fDist / BULLET_SPEED;
      const rvx = target.vx - positions[i].vx;
      const rvy = target.vy - positions[i].vy;
      const leadX = predX + rvx * bulletTime;
      const leadY = predY + rvy * bulletTime;
      const fireAngle = Math.atan2(
        leadY - positions[i].y,
        leadX - positions[i].x,
      );
      let fireDiff = fireAngle - positions[i].heading;
      while (fireDiff > Math.PI) fireDiff -= 2 * Math.PI;
      while (fireDiff < -Math.PI) fireDiff += 2 * Math.PI;
      if (Math.abs(fireDiff) < FIRE_ANGLE) {
        score += weights.fireOpportunity * (1 - fDist / MAX_FIRE_RANGE);
      }
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
  pursuitSign = 1,
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
    const angleToTarget = Math.atan2(dy, dx);
    const desiredAngle =
      pursuitSign === 1 ? angleToTarget : angleToTarget + Math.PI;
    const headingDiff = normalizeAngle(desiredAngle - clone.heading);
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
 * Check if a held action would cause an imminent collision (within a few steps).
 * Used as an emergency escape hatch during action hold periods.
 */
export function hasImminentCollision(ship, action, asteroids) {
  const clone = cloneShipForSim(ship);
  const positions = simulateTrajectory(
    clone,
    action,
    COLLISION_BREAK_STEPS,
    SIM_DT,
  );
  const shipRadius = SHIP_SIZE;
  for (let i = 1; i < positions.length; i++) {
    const t = i * SIM_DT;
    for (const ast of asteroids) {
      const predicted = predictAsteroidAt(ast, t);
      const dx = positions[i].x - predicted.x;
      const dy = positions[i].y - predicted.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < predicted.radius + shipRadius) {
        return true;
      }
    }
  }
  return false;
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
export function selectBestAction(
  ship,
  target,
  asteroids,
  prevAction = null,
  simSteps = SIM_STEPS,
  weights = DEFAULT_SCORING_WEIGHTS,
  pursuitSign = 1,
) {
  const candidates = defineCandidates();
  let bestScore = -Infinity;
  let bestAction = candidates[0];
  let bestName = '';
  const debugCandidates = [];

  // Evaluate fixed-action candidates
  for (const action of candidates) {
    const clone = cloneShipForSim(ship);
    const positions = simulateTrajectory(clone, action, simSteps, SIM_DT);
    let score = scoreTrajectory(positions, target, asteroids, SIM_DT, weights);
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
    simSteps,
    SIM_DT,
    0,
    pursuitSign,
  );
  let pursuitScore = scoreTrajectory(
    pursuit.positions,
    target,
    asteroids,
    SIM_DT,
    weights,
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
      simSteps,
      SIM_DT,
      BRAKE_PURSUIT_STEPS,
      pursuitSign,
    );
    let brakeScore = scoreTrajectory(
      brakePursuit.positions,
      target,
      asteroids,
      SIM_DT,
      weights,
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
 * Compute the lead angle for firing at a moving target.
 * Returns the world-space angle to aim at so the bullet intercepts the target,
 * or null if no solution exists (target outrunning bullet).
 *
 * @param {object} ship - { x, y, vx, vy }
 * @param {object} target - { x, y, vx, vy }
 * @returns {{ angle: number, travelTime: number } | null}
 */
export function computeLeadAngle(ship, target) {
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { angle: Math.atan2(dy, dx), travelTime: 0 };

  // Relative velocity of target w.r.t. ship (bullet inherits ship velocity)
  const rvx = target.vx - ship.vx;
  const rvy = target.vy - ship.vy;

  // Estimate travel time: dist / BULLET_SPEED (first-order approximation)
  const travelTime = dist / BULLET_SPEED;

  // Predict target position at intercept time
  const predX = target.x + rvx * travelTime;
  const predY = target.y + rvy * travelTime;

  return {
    angle: Math.atan2(predY - ship.y, predX - ship.x),
    travelTime,
  };
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
 * Create predictive-optimized AI state.
 */
function createPredictiveOptimizedState() {
  return { prevAction: null, holdTimer: 0 };
}

/**
 * Predictive-optimized AI update function.
 * Holds selected action for HOLD_TIME to prevent oscillation, with an
 * emergency escape if the held action predicts an imminent collision.
 * Firing decision is a separate snap check based on current aim.
 */
function updatePredictiveOptimizedAI(state, ship, target, asteroids, _dt) {
  if (!ship.alive || !target.alive) {
    ship.thrust = false;
    ship.rotatingLeft = false;
    ship.rotatingRight = false;
    ship.braking = false;
    ship.fire = false;
    return;
  }

  const holdTime = state.holdTime ?? HOLD_TIME;
  const simSteps = state.simSteps ?? SIM_STEPS;
  const weights = state.scoringWeights ?? DEFAULT_SCORING_WEIGHTS;
  const pSign = state.pursuitSign ?? 1;
  const canFire = state.canFire ?? true;

  state.holdTimer = Math.max(0, state.holdTimer - _dt);

  const holdExpired = state.holdTimer <= 0;
  const emergency =
    !holdExpired &&
    state.prevAction &&
    hasImminentCollision(ship, state.prevAction, asteroids);

  if (holdExpired || emergency || !state.prevAction) {
    const action = selectBestAction(
      ship,
      target,
      asteroids,
      state.prevAction,
      simSteps,
      weights,
      pSign,
    );
    state.prevAction = action;
    state.holdTimer = holdTime;
  }

  ship.thrust = state.prevAction.thrust;
  ship.rotatingLeft = state.prevAction.rotatingLeft;
  ship.rotatingRight = state.prevAction.rotatingRight;
  ship.braking = state.prevAction.braking;

  // Fire decision: skip entirely when strategy cannot fire
  if (!canFire) {
    ship.fire = false;
    return;
  }

  // Fire decision: lead-angle check — aim where the target will be
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < MAX_FIRE_RANGE) {
    const lead = computeLeadAngle(ship, target);
    const headingDiff = Math.abs(normalizeAngle(lead.angle - ship.heading));
    ship.fire = headingDiff < FIRE_ANGLE;
  } else {
    ship.fire = false;
  }
}

/**
 * Predictive-optimized AI strategy object — pluggable interface.
 */
export const predictiveOptimizedStrategy = {
  createState: createPredictiveOptimizedState,
  update: updatePredictiveOptimizedAI,
};

// Self-register in the strategy registry
registerStrategy('predictive-optimized', predictiveOptimizedStrategy);

/**
 * Create fleeing AI state — same update function, inverted behavior.
 */
function createFleeingState() {
  return {
    prevAction: null,
    holdTimer: 0,
    scoringWeights: FLEEING_SCORING_WEIGHTS,
    pursuitSign: -1,
    canFire: false,
  };
}

/**
 * Fleeing AI strategy — reuses predictive-optimized update with inverted weights.
 */
export const fleeingStrategy = {
  createState: createFleeingState,
  update: updatePredictiveOptimizedAI,
};

registerStrategy('fleeing', fleeingStrategy);

// ─── Evasion AI ───────────────────────────────────────────────────────────────

/** Sampling radius (px) for evasion waypoint candidates around the ship. */
export const EVASION_WAYPOINT_RADIUS = 1500;

/** Distance (px) at which the ship is considered to have arrived at its waypoint. */
export const EVASION_ARRIVAL_DIST = 100;

/** Maximum time (seconds) before forcing a new waypoint selection. */
export const EVASION_MAX_HOLD_TIME = 3.0;

/** Number of random candidate points sampled per waypoint selection. */
export const EVASION_CANDIDATES = 8;

/** Scoring weights for evasion behavior (navigate toward waypoint, no firing). */
export const EVASION_SCORING_WEIGHTS = {
  distance: -3,
  aim: 0,
  closingSpeed: 16,
  fireOpportunity: 0,
};

/**
 * Select a random waypoint whose path doesn't cross near the agent.
 * Samples `numCandidates` random points within `radius` of `ship`,
 * rejects any candidate in the agent's hemisphere (i.e., reaching it
 * would require flying toward the agent), picks one at random.
 * Falls back to the farthest candidate if all are rejected.
 *
 * @param {{ x: number, y: number }} ship
 * @param {{ x: number, y: number }} agent
 * @param {number} radius
 * @param {number} numCandidates
 * @returns {{ x: number, y: number, vx: number, vy: number, alive: boolean }}
 */
export function selectWaypoint(ship, agent, radius, numCandidates) {
  // Direction from ship toward agent
  const toAgentX = agent.x - ship.x;
  const toAgentY = agent.y - ship.y;

  const valid = [];
  let farthestX = ship.x;
  let farthestY = ship.y;
  let farthestDist = -Infinity;

  for (let i = 0; i < numCandidates; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * radius;
    const cx = ship.x + Math.cos(angle) * r;
    const cy = ship.y + Math.sin(angle) * r;

    // ship→candidate direction
    const toCandX = cx - ship.x;
    const toCandY = cy - ship.y;

    // Dot product: positive means candidate is in the agent's hemisphere
    const dot = toCandX * toAgentX + toCandY * toAgentY;
    if (dot <= 0) {
      valid.push({ x: cx, y: cy });
    }

    // Track farthest from agent as fallback
    const dx = cx - agent.x;
    const dy = cy - agent.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > farthestDist) {
      farthestDist = distSq;
      farthestX = cx;
      farthestY = cy;
    }
  }

  // Pick a random valid candidate; fall back to farthest if all rejected
  const pick =
    valid.length > 0
      ? valid[Math.floor(Math.random() * valid.length)]
      : { x: farthestX, y: farthestY };

  return { x: pick.x, y: pick.y, vx: 0, vy: 0, alive: true };
}

/**
 * Create evasion AI state — waypoint-based navigation away from the pursuer.
 */
function createEvasionState(config = {}) {
  return {
    prevAction: null,
    holdTimer: 0,
    scoringWeights: EVASION_SCORING_WEIGHTS,
    pursuitSign: 1,
    canFire: false,
    waypoint: null,
    waypointTimer: 0,
    evasionWaypointRadius:
      config.evasionWaypointRadius ?? EVASION_WAYPOINT_RADIUS,
    evasionArrivalDist: config.evasionArrivalDist ?? EVASION_ARRIVAL_DIST,
    evasionMaxHoldTime: config.evasionMaxHoldTime ?? EVASION_MAX_HOLD_TIME,
    evasionCandidates: config.evasionCandidates ?? EVASION_CANDIDATES,
  };
}

/**
 * Evasion AI update — manages waypoint lifecycle, delegates navigation
 * to the shared predictive-optimized update function.
 */
function updateEvasionAI(state, ship, target, asteroids, dt) {
  if (!ship.alive || !target.alive) {
    ship.thrust = false;
    ship.rotatingLeft = false;
    ship.rotatingRight = false;
    ship.braking = false;
    ship.fire = false;
    return;
  }

  // Advance waypoint timer
  state.waypointTimer += dt;

  // Determine if a new waypoint is needed
  let needNewWaypoint = state.waypoint === null;

  if (!needNewWaypoint && state.waypointTimer >= state.evasionMaxHoldTime) {
    needNewWaypoint = true;
  }

  if (!needNewWaypoint && state.waypoint) {
    const dx = ship.x - state.waypoint.x;
    const dy = ship.y - state.waypoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < state.evasionArrivalDist) {
      needNewWaypoint = true;
    }
  }

  if (needNewWaypoint) {
    state.waypoint = selectWaypoint(
      ship,
      target,
      state.evasionWaypointRadius,
      state.evasionCandidates,
    );
    state.waypointTimer = 0;
  }

  // Navigate toward waypoint using shared predictive-optimized logic
  updatePredictiveOptimizedAI(state, ship, state.waypoint, asteroids, dt);
}

/**
 * Evasion AI strategy — waypoint-based navigation biased away from the pursuer.
 */
export const evasionStrategy = {
  createState: createEvasionState,
  update: updateEvasionAI,
};

registerStrategy('evasion', evasionStrategy);
