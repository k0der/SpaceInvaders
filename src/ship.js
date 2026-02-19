/**
 * Ship size constant (half-height of the chevron shape).
 * Used for rendering and later for collision radius.
 */
const SHIP_SIZE = 15;

/** Rotation speed in radians per second. */
export const ROTATION_SPEED = 4.0;

/**
 * Normalize an angle to the range [-PI, PI].
 */
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Create a ship entity.
 */
export function createShip({ x, y, heading }) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    heading,
    alive: true,
    thrust: false,
    rotatingLeft: false,
    rotatingRight: false,
    braking: false,
    fire: false,
  };
}

/**
 * Update ship state for one frame.
 * Currently handles rotation only; thrust/physics added in Increment 19.
 */
export function updateShip(ship, dt) {
  // Rotation
  if (ship.rotatingLeft) ship.heading -= ROTATION_SPEED * dt;
  if (ship.rotatingRight) ship.heading += ROTATION_SPEED * dt;
  ship.heading = normalizeAngle(ship.heading);
}

/**
 * Draw a classic Asteroids chevron/triangle at the ship's position,
 * rotated by its heading. White wireframe, no fill.
 */
export function drawShip(ctx, ship) {
  if (!ship.alive) return;

  const s = SHIP_SIZE;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.heading);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;

  // Chevron shape: nose at right (+x), two rear points, notch in back
  ctx.beginPath();
  ctx.moveTo(s, 0);                    // nose
  ctx.lineTo(-s, -s * 0.7);            // top-left wing
  ctx.lineTo(-s * 0.5, 0);             // rear notch
  ctx.lineTo(-s, s * 0.7);             // bottom-left wing
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
