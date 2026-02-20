/**
 * Ship size constant (half-height of the chevron shape).
 * Used for rendering and later for collision radius.
 */
const SHIP_SIZE = 15;

/** Rotation speed in radians per second. */
export const ROTATION_SPEED = 4.0;

/** Thrust acceleration in pixels/s². */
export const THRUST_POWER = 2000;

/** Drag coefficient per second (mild friction). */
export const DRAG = 0.5;

/** Braking deceleration in pixels/s². */
export const BRAKE_POWER = 200;

/** Maximum ship speed in pixels/s. */
export const MAX_SPEED = 400;

/** Maximum number of trail points (~2 seconds at 60 fps). */
export const TRAIL_MAX_LENGTH = 120;

/** Opacity of the newest trail segment. */
export const TRAIL_MAX_OPACITY = 0.4;

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
 * Applies rotation, thrust, braking, drag, speed cap, and position update.
 */
export function updateShip(ship, dt) {
  // 1. Rotation
  if (ship.rotatingLeft) ship.heading -= ROTATION_SPEED * dt;
  if (ship.rotatingRight) ship.heading += ROTATION_SPEED * dt;
  ship.heading = normalizeAngle(ship.heading);

  // 2. Thrust — accelerate in heading direction
  if (ship.thrust) {
    const power = ship.thrustPower ?? THRUST_POWER;
    ship.vx += Math.cos(ship.heading) * power * dt;
    ship.vy += Math.sin(ship.heading) * power * dt;
  }

  // 3. Braking — decelerate opposite to velocity direction
  if (ship.braking) {
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > 0) {
      const decel = Math.min(BRAKE_POWER * dt, speed);
      ship.vx -= (ship.vx / speed) * decel;
      ship.vy -= (ship.vy / speed) * decel;
    }
  }

  // 4. Drag — friction always applied
  ship.vx *= 1 - DRAG * dt;
  ship.vy *= 1 - DRAG * dt;

  // 5. Speed cap
  const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (currentSpeed > MAX_SPEED) {
    ship.vx = (ship.vx / currentSpeed) * MAX_SPEED;
    ship.vy = (ship.vy / currentSpeed) * MAX_SPEED;
  }

  // 6. Position update
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
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
  ctx.moveTo(s, 0); // nose
  ctx.lineTo(-s, -s * 0.7); // top-left wing
  ctx.lineTo(-s * 0.5, 0); // rear notch
  ctx.lineTo(-s, s * 0.7); // bottom-left wing
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Create a new motion trail.
 */
export function createTrail() {
  return { points: [] };
}

/**
 * Record the ship's current world position in the trail.
 * Evicts the oldest point when the trail exceeds TRAIL_MAX_LENGTH.
 */
export function updateTrail(trail, x, y) {
  trail.points.push({ x, y });
  if (trail.points.length > TRAIL_MAX_LENGTH) {
    trail.points.shift();
  }
}

/**
 * Draw the motion trail as fading line segments.
 * Alpha increases linearly from 0 (oldest) to TRAIL_MAX_OPACITY (newest).
 */
export function drawTrail(ctx, trail) {
  if (trail.points.length < 2) return;

  ctx.lineWidth = 1;
  const len = trail.points.length;

  for (let i = 1; i < len; i++) {
    const alpha = (i / (len - 1)) * TRAIL_MAX_OPACITY;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
    ctx.lineTo(trail.points[i].x, trail.points[i].y);
    ctx.stroke();
  }
}
