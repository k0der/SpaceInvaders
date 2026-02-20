import { SHIP_SIZE, THRUST_POWER } from './ship.js';

/** Dead zone for rotation — prevents oscillation (~3°). */
export const ROTATION_DEADZONE = 0.05;

/** Thrust engages when heading is within this angle of target (~60°). */
export const THRUST_ANGLE = Math.PI / 3;

/** Brake threshold — brake when not facing target and speed exceeds this. */
export const BRAKE_SPEED = 50;

/** Lead calculation divisor (~MAX_SPEED). */
export const PREDICTION_SPEED = 400;

/** Maximum look-ahead time for target prediction (seconds). */
export const MAX_PREDICTION_TIME = 2.0;

/** Minimum enemy spawn offset from player (px). */
export const MIN_SPAWN_DISTANCE = 600;

/** Maximum enemy spawn offset from player (px). */
export const MAX_SPAWN_DISTANCE = 1000;

/** Angular threshold for AI firing (~8.6°). */
export const FIRE_ANGLE = 0.15;

/** Max distance (px) at which AI will fire. */
export const MAX_FIRE_RANGE = 500;

/** How far ahead (px) the AI scans for obstacles along its predicted path. */
export const AVOID_LOOKAHEAD = 500;

/** Buffer (px) around obstacle collision radius for avoidance. */
export const AVOID_MARGIN = 50;

/** Maximum steering offset (rad) from avoidance. */
export const AVOID_STRENGTH = 2.5;

/** Proximity detection radius (px) — catches obstacles the cylinder misses. */
export const AVOID_PROXIMITY = 80;

/** How aggressively avoidance suppresses pursuit (urgency * this >= 1 → pure avoidance). */
export const AVOIDANCE_PRIORITY = 3;

/** Time horizon (seconds) for predicting future velocity in avoidance. */
export const AVOID_PREDICT_TIME = 0.3;

/** Speed threshold below which avoidance falls back to heading direction. */
const AVOID_MIN_SPEED = 1;

/**
 * Normalize an angle to the range [-PI, PI].
 */
function normalizeAngleAI(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Create AI decision state (minimal for pursuit; expandable for combat).
 */
export function createAIState() {
  return {};
}

/**
 * Compute a steering angle offset to avoid obstacles on a collision course.
 *
 * Projects a look-ahead cylinder along the ship's predicted velocity
 * direction (accounting for current momentum + thrust input). Falls back
 * to heading when nearly stationary.
 *
 * Returns { offset, maxUrgency } where offset is the summed angle in
 * radians (positive = steer right, negative = steer left) and maxUrgency
 * is the highest raw urgency (before squaring) across all obstacles.
 */
export function computeAvoidanceOffset(aiShip, obstacles) {
  let totalOffset = 0;
  let maxRawUrgency = 0;

  // Compute predicted velocity: current velocity + thrust acceleration
  const power = aiShip.thrustPower ?? THRUST_POWER;
  const thrustAccel =
    aiShip.thrust && aiShip.thrustIntensity > 0
      ? power * aiShip.thrustIntensity
      : 0;
  const predVx =
    aiShip.vx + Math.cos(aiShip.heading) * thrustAccel * AVOID_PREDICT_TIME;
  const predVy =
    aiShip.vy + Math.sin(aiShip.heading) * thrustAccel * AVOID_PREDICT_TIME;
  const predSpeed = Math.sqrt(predVx * predVx + predVy * predVy);

  // Determine look-ahead direction: predicted velocity, or heading fallback
  let dirX;
  let dirY;
  if (predSpeed >= AVOID_MIN_SPEED) {
    dirX = predVx / predSpeed;
    dirY = predVy / predSpeed;
  } else {
    dirX = Math.cos(aiShip.heading);
    dirY = Math.sin(aiShip.heading);
  }

  // dirX, dirY form the forward axis; perpendicular is (-dirY, dirX)
  for (const obs of obstacles) {
    const dx = obs.x - aiShip.x;
    const dy = obs.y - aiShip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Project onto predicted velocity axis (ahead) and perpendicular (lateral)
    const ahead = dx * dirX + dy * dirY;
    const lateral = -dx * dirY + dy * dirX;

    // --- Cylinder threat ---
    let cylinderUrgency = 0;
    if (ahead > 0 && ahead < AVOID_LOOKAHEAD) {
      const dangerRadius = obs.radius + AVOID_MARGIN;
      if (Math.abs(lateral) < dangerRadius) {
        cylinderUrgency = 1 - ahead / AVOID_LOOKAHEAD;
      }
    }

    // --- Proximity threat ---
    let proximityUrgency = 0;
    const proximityRadius = obs.radius + AVOID_PROXIMITY;
    if (dist < proximityRadius) {
      proximityUrgency = 1 - dist / proximityRadius;
    }

    // Combined urgency: take the stronger signal, then square for nonlinear response
    const rawUrgency = Math.max(cylinderUrgency, proximityUrgency);
    if (rawUrgency <= 0) continue;
    maxRawUrgency = Math.max(maxRawUrgency, rawUrgency);
    const urgency = rawUrgency * rawUrgency;

    // Steer away from obstacle: obstacle to right (lateral > 0) → steer left (negative)
    // Dead center (lateral ≈ 0) → default to steering right (positive)
    const steerDirection = lateral > 0 ? -1 : 1;

    totalOffset += steerDirection * AVOID_STRENGTH * urgency;
  }

  return { offset: totalOffset, maxUrgency: maxRawUrgency };
}

/**
 * Update AI control flags on aiShip to pursue targetShip,
 * fire when aimed, and avoid obstacles.
 *
 * Sets the same 5 control flags as keyboard input so the ship physics
 * engine treats AI and player identically.
 */
export function updateAI(_aiState, aiShip, targetShip, asteroids, _dt) {
  // If either ship is dead, clear all flags
  if (!aiShip.alive || !targetShip.alive) {
    aiShip.thrust = false;
    aiShip.rotatingLeft = false;
    aiShip.rotatingRight = false;
    aiShip.braking = false;
    aiShip.fire = false;
    return;
  }

  // Distance to target
  const dx = targetShip.x - aiShip.x;
  const dy = targetShip.y - aiShip.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Lead prediction
  const lookAheadTime = Math.min(dist / PREDICTION_SPEED, MAX_PREDICTION_TIME);
  const predictedX = targetShip.x + targetShip.vx * lookAheadTime;
  const predictedY = targetShip.y + targetShip.vy * lookAheadTime;

  // Angle to predicted position (pursuit angle)
  const pursuitAngle = Math.atan2(predictedY - aiShip.y, predictedX - aiShip.x);

  // Build obstacle list: asteroids + target ship
  const obstacles = asteroids.map((a) => ({
    x: a.x,
    y: a.y,
    radius: a.collisionRadius,
  }));
  obstacles.push({ x: targetShip.x, y: targetShip.y, radius: SHIP_SIZE });

  // Compute avoidance offset and survival-first blending
  const { offset: avoidanceOffset, maxUrgency } = computeAvoidanceOffset(
    aiShip,
    obstacles,
  );

  // Heading diff to raw pursuit target (for firing decision — fire at target, not avoidance direction)
  const pursuitHeadingDiff = normalizeAngleAI(pursuitAngle - aiShip.heading);

  // Survival-first: suppress pursuit proportionally to threat urgency
  const survivalWeight = Math.min(maxUrgency * AVOIDANCE_PRIORITY, 1.0);
  const pursuitDiff = pursuitHeadingDiff * (1 - survivalWeight);
  const headingDiff = normalizeAngleAI(pursuitDiff + avoidanceOffset);

  // Rotation: turn toward effective angle with dead zone
  aiShip.rotatingLeft = headingDiff < -ROTATION_DEADZONE;
  aiShip.rotatingRight = headingDiff > ROTATION_DEADZONE;

  // Thrust: engage when roughly facing effective direction, or during active avoidance
  const facingEffective = Math.abs(headingDiff) < THRUST_ANGLE;
  const avoidanceActive = avoidanceOffset !== 0;
  aiShip.thrust = facingEffective || avoidanceActive;

  // Brake: engage when NOT facing target AND speed exceeds threshold AND no avoidance
  const speed = Math.sqrt(aiShip.vx * aiShip.vx + aiShip.vy * aiShip.vy);
  aiShip.braking = !facingEffective && !avoidanceActive && speed > BRAKE_SPEED;

  // Fire: aimed within FIRE_ANGLE of predicted target AND within range
  aiShip.fire =
    Math.abs(pursuitHeadingDiff) < FIRE_ANGLE && dist < MAX_FIRE_RANGE;
}

/**
 * Compute a random spawn position for the enemy ship at
 * MIN_SPAWN_DISTANCE–MAX_SPAWN_DISTANCE from the player.
 */
export function spawnEnemyPosition(playerX, playerY) {
  const angle = Math.random() * 2 * Math.PI;
  const distance =
    MIN_SPAWN_DISTANCE +
    Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
  return {
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
  };
}
