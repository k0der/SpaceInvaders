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
  engagePenalty: 0.0,
  proximity: 0.0,
};

/** Distance threshold (px) for aim alignment reward. */
const AIM_DISTANCE_THRESHOLD = 600;

/** Normalization divisor for closing distance. */
const CLOSING_DISTANCE_NORM = 1000;

/** Distance (px) below which no engage penalty applies (dogfighting zone). */
export const ENGAGE_DISTANCE = 400;

/** Normalization divisor for engage penalty distance. */
const ENGAGE_DISTANCE_NORM = 1000;

/** Multiplier on asteroid collisionRadius for near-miss danger zone. */
export const NEAR_MISS_RADIUS_FACTOR = 3;

/** Base radius (px) added to every danger zone for a practical minimum buffer. */
export const DANGER_RADIUS_BASE = 40;

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Compute a scalar reward from two consecutive game states.
 * Pure function — no mutation of states, no side effects.
 *
 * @param {Object} prevState  - { ship, target, asteroids, shipHP, targetHP, tick }
 * @param {Object} currentState - same shape as prevState
 * @param {Object} action - { moveAction, fireAction }
 * @param {Object} config - { rewardWeights?, maxTicks, shipHP }
 * @param {Object|null} [breakdown=null] - if provided, each component's value is accumulated into the corresponding key
 * @returns {number} scalar reward (0.0 if agent is dead)
 */
export function computeReward(
  prevState,
  currentState,
  action,
  config,
  breakdown = null,
) {
  // No posthumous rewards
  if (!currentState.ship.alive) {
    return 0.0;
  }

  const w = { ...DEFAULT_REWARD_WEIGHTS, ...(config.rewardWeights || {}) };
  let reward = 0.0;

  // 1. Survival
  reward += w.survival;
  if (breakdown) breakdown.survival += w.survival;

  // 2. Aim alignment
  const ship = currentState.ship;
  const target = currentState.target;
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < AIM_DISTANCE_THRESHOLD && dist > 0) {
    const angleToTarget = Math.atan2(dy, dx);
    const bearing = normalizeAngle(angleToTarget - ship.heading);
    const aimReward = w.aim * Math.cos(bearing);
    reward += aimReward;
    if (breakdown) breakdown.aim += aimReward;
  }

  // 3. Closing distance
  const prevShip = prevState.ship;
  const prevTarget = prevState.target;
  const prevDx = prevTarget.x - prevShip.x;
  const prevDy = prevTarget.y - prevShip.y;
  const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
  const distanceDelta = prevDist - dist;

  if (distanceDelta > 0) {
    const closingReward = (w.closing * distanceDelta) / CLOSING_DISTANCE_NORM;
    reward += closingReward;
    if (breakdown) breakdown.closing += closingReward;
  }

  // 4. Hit landed
  if (currentState.targetHP < prevState.targetHP) {
    reward += w.hit;
    if (breakdown) breakdown.hit += w.hit;
  }

  // 5. Got hit
  if (currentState.shipHP < prevState.shipHP) {
    reward += w.gotHit;
    if (breakdown) breakdown.gotHit += w.gotHit;
  }

  // 6. Near-miss
  const asteroids = currentState.asteroids;
  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const adx = a.x - ship.x;
    const ady = a.y - ship.y;
    const aDist = Math.sqrt(adx * adx + ady * ady);
    const dangerRadius =
      NEAR_MISS_RADIUS_FACTOR * a.collisionRadius + DANGER_RADIUS_BASE;

    if (aDist < dangerRadius) {
      const ratio = 1 - aDist / dangerRadius;
      const nearMissReward = w.nearMiss * ratio * ratio;
      reward += nearMissReward;
      if (breakdown) breakdown.nearMiss += nearMissReward;
    }
  }

  // 7. Fire discipline
  if (action.fireAction === 1) {
    reward += w.firePenalty;
    if (breakdown) breakdown.firePenalty += w.firePenalty;
  }

  // 8. Engage penalty — continuous cost for staying far from the enemy
  if (w.engagePenalty !== 0 && dist > ENGAGE_DISTANCE) {
    const engageReward =
      (w.engagePenalty * (dist - ENGAGE_DISTANCE)) / ENGAGE_DISTANCE_NORM;
    reward += engageReward;
    if (breakdown) breakdown.engagePenalty += engageReward;
  }

  // 9. Proximity — action-dependent closing reward scaled by inverse distance
  if (w.proximity !== 0) {
    const hypDx = prevTarget.x - ship.x;
    const hypDy = prevTarget.y - ship.y;
    const hypotheticalDist = Math.sqrt(hypDx * hypDx + hypDy * hypDy);
    const agentClosing = prevDist - hypotheticalDist;
    if (agentClosing > 0 && prevDist > 0) {
      const proximityReward = (w.proximity * agentClosing) / prevDist;
      reward += proximityReward;
      if (breakdown) breakdown.proximity += proximityReward;
    }
  }

  // 10. Win (terminal)
  if (currentState.targetHP <= 0) {
    reward += w.win;
    if (breakdown) breakdown.win += w.win;
  }

  // 11. Loss (terminal) — agent is alive (checked above), but shipHP may indicate loss
  if (currentState.shipHP <= 0) {
    reward += w.loss;
    if (breakdown) breakdown.loss += w.loss;
  }

  // 12. Draw (terminal) — both HP <= 0
  if (currentState.shipHP <= 0 && currentState.targetHP <= 0) {
    reward += w.draw;
    if (breakdown) breakdown.draw += w.draw;
  }

  // 13. Timeout — applied by game-env.js after tick increment (not here,
  //     because computeReward runs before the tick counter advances).

  return reward;
}
