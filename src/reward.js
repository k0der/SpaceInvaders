/** Default reward weights matching SPEC §16.7. */
export const DEFAULT_REWARD_WEIGHTS = {
  survival: 0.001,
  aim: 0.01,
  closing: 0.01,
  hit: 1.0,
  gotHit: -1.0,
  nearMiss: -0.1,
  firePenalty: -0.002,
  win: 5.0,
  loss: -5.0,
  draw: -2.0,
  timeout: -1.0,
};

/** Distance threshold (px) for aim alignment reward. */
const AIM_DISTANCE_THRESHOLD = 600;

/** Normalization divisor for closing distance. */
const CLOSING_DISTANCE_NORM = 1000;

/** Multiplier on asteroid collisionRadius for near-miss danger zone. */
const NEAR_MISS_RADIUS_FACTOR = 3;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Compute a scalar reward from two consecutive game states.
 * Pure function — no mutation, no side effects.
 *
 * @param {Object} prevState  - { ship, target, asteroids, shipHP, targetHP, tick }
 * @param {Object} currentState - same shape as prevState
 * @param {Object} action - { moveAction, fireAction }
 * @param {Object} config - { rewardWeights?, maxTicks, shipHP }
 * @returns {number} scalar reward (0.0 if agent is dead)
 */
export function computeReward(prevState, currentState, action, config) {
  // No posthumous rewards
  if (!currentState.ship.alive) {
    return 0.0;
  }

  const w = { ...DEFAULT_REWARD_WEIGHTS, ...(config.rewardWeights || {}) };
  let reward = 0.0;

  // 1. Survival
  reward += w.survival;

  // 2. Aim alignment
  const ship = currentState.ship;
  const target = currentState.target;
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < AIM_DISTANCE_THRESHOLD && dist > 0) {
    const angleToTarget = Math.atan2(dy, dx);
    const bearing = normalizeAngle(angleToTarget - ship.heading);
    reward += w.aim * Math.cos(bearing);
  }

  // 3. Closing distance
  const prevShip = prevState.ship;
  const prevTarget = prevState.target;
  const prevDx = prevTarget.x - prevShip.x;
  const prevDy = prevTarget.y - prevShip.y;
  const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
  const distanceDelta = prevDist - dist;

  if (distanceDelta > 0) {
    reward += (w.closing * distanceDelta) / CLOSING_DISTANCE_NORM;
  }

  // 4. Hit landed
  if (currentState.targetHP < prevState.targetHP) {
    reward += w.hit;
  }

  // 5. Got hit
  if (currentState.shipHP < prevState.shipHP) {
    reward += w.gotHit;
  }

  // 6. Near-miss
  const asteroids = currentState.asteroids;
  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const adx = a.x - ship.x;
    const ady = a.y - ship.y;
    const aDist = Math.sqrt(adx * adx + ady * ady);
    const dangerRadius = NEAR_MISS_RADIUS_FACTOR * a.collisionRadius;

    if (aDist < dangerRadius) {
      const ratio = 1 - aDist / dangerRadius;
      reward += w.nearMiss * ratio * ratio;
    }
  }

  // 7. Fire discipline
  if (action.fireAction === 1) {
    reward += w.firePenalty;
  }

  // 8. Win (terminal)
  if (currentState.targetHP <= 0) {
    reward += w.win;
  }

  // 9. Loss (terminal) — agent is alive (checked above), but shipHP may indicate loss
  if (currentState.shipHP <= 0) {
    reward += w.loss;
  }

  // 10. Draw (terminal) — both HP <= 0
  if (currentState.shipHP <= 0 && currentState.targetHP <= 0) {
    reward += w.draw;
  }

  // 11. Timeout (terminal)
  if (currentState.tick >= config.maxTicks) {
    reward += w.timeout;
  }

  return reward;
}
