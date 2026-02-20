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
 * Update AI control flags on aiShip to pursue targetShip.
 *
 * Sets the same 5 control flags as keyboard input so the ship physics
 * engine treats AI and player identically.
 */
export function updateAI(_aiState, aiShip, targetShip, _asteroids, _dt) {
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

  // Angle to predicted position
  const targetAngle = Math.atan2(predictedY - aiShip.y, predictedX - aiShip.x);
  const headingDiff = normalizeAngleAI(targetAngle - aiShip.heading);

  // Rotation: turn toward predicted position with dead zone
  aiShip.rotatingLeft = headingDiff < -ROTATION_DEADZONE;
  aiShip.rotatingRight = headingDiff > ROTATION_DEADZONE;

  // Thrust: engage when roughly facing target
  const facingTarget = Math.abs(headingDiff) < THRUST_ANGLE;
  aiShip.thrust = facingTarget;

  // Brake: engage when NOT facing target AND speed exceeds threshold
  const speed = Math.sqrt(aiShip.vx * aiShip.vx + aiShip.vy * aiShip.vy);
  aiShip.braking = !facingTarget && speed > BRAKE_SPEED;

  // Fire: disabled in basic pursuit (increment 26)
  aiShip.fire = false;
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
