/**
 * Ship size constant (half-height of the chevron shape).
 * Used for rendering and later for collision radius.
 */
export const SHIP_SIZE = 15;

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

/** Maximum number of trail points (~4 seconds at 60 fps). */
export const TRAIL_MAX_LENGTH = 240;

/** Opacity of the newest coasting trail segment. */
export const TRAIL_BASE_OPACITY = 0.2;

/** Opacity of the newest thrust trail segment. */
export const TRAIL_THRUST_OPACITY = 0.6;

/** Line width for coasting trail segments. */
export const TRAIL_BASE_WIDTH = 1;

/** Line width for thrust trail segments. */
export const TRAIL_THRUST_WIDTH = 2.5;

/** Engine spool rate — thrust intensity ramp speed (per second). Full transition ~0.17s. */
export const THRUST_RAMP_SPEED = 6.0;

/** Dark orange exhaust color. */
export const TRAIL_COLOR = { r: 255, g: 120, b: 0 };

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
    thrustIntensity: 0,
    fireCooldown: 0,
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

  // 2. Thrust intensity ramp
  if (ship.thrust) {
    ship.thrustIntensity = Math.min(
      ship.thrustIntensity + THRUST_RAMP_SPEED * dt,
      1.0,
    );
  } else {
    ship.thrustIntensity = Math.max(
      ship.thrustIntensity - THRUST_RAMP_SPEED * dt,
      0.0,
    );
  }

  // 3. Thrust — accelerate in heading direction, scaled by intensity
  if (ship.thrustIntensity > 0) {
    const power = ship.thrustPower ?? THRUST_POWER;
    ship.vx += Math.cos(ship.heading) * power * ship.thrustIntensity * dt;
    ship.vy += Math.sin(ship.heading) * power * ship.thrustIntensity * dt;
  }

  // 4. Braking — decelerate opposite to velocity direction
  if (ship.braking) {
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > 0) {
      const decel = Math.min(BRAKE_POWER * dt, speed);
      ship.vx -= (ship.vx / speed) * decel;
      ship.vy -= (ship.vy / speed) * decel;
    }
  }

  // 5. Drag — friction always applied
  ship.vx *= 1 - DRAG * dt;
  ship.vy *= 1 - DRAG * dt;

  // 6. Speed cap
  const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (currentSpeed > MAX_SPEED) {
    ship.vx = (ship.vx / currentSpeed) * MAX_SPEED;
    ship.vy = (ship.vy / currentSpeed) * MAX_SPEED;
  }

  // 7. Position update
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
 * Record the ship's rear-nozzle position in the trail.
 * Always records a point. Stores the passed thrustIntensity per-point
 * for gradient rendering. Evicts oldest when full.
 */
export function updateTrail(trail, x, y, heading, thrustIntensity) {
  const nozzleOffset = SHIP_SIZE * 0.5;
  const rearX = x - Math.cos(heading) * nozzleOffset;
  const rearY = y - Math.sin(heading) * nozzleOffset;
  trail.points.push({ x: rearX, y: rearY, intensity: thrustIntensity });
  if (trail.points.length > TRAIL_MAX_LENGTH) {
    trail.points.shift();
  }
}

/**
 * Draw the exhaust trail as fading dark orange line segments.
 * Width and opacity are interpolated per-segment using the stored
 * thrust intensity (0=coasting, 1=full thrust) for smooth gradients.
 * Alpha increases linearly from 0 (oldest) to max opacity (newest).
 */
export function drawTrail(ctx, trail) {
  if (trail.points.length < 2) return;

  const { r, g, b } = TRAIL_COLOR;
  const len = trail.points.length;

  for (let i = 1; i < len; i++) {
    const ageFactor = i / (len - 1);
    const intensity = trail.points[i].intensity;
    const maxAlpha =
      TRAIL_BASE_OPACITY +
      (TRAIL_THRUST_OPACITY - TRAIL_BASE_OPACITY) * intensity;
    const alpha = ageFactor * maxAlpha;
    ctx.lineWidth =
      TRAIL_BASE_WIDTH + (TRAIL_THRUST_WIDTH - TRAIL_BASE_WIDTH) * intensity;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
    ctx.lineTo(trail.points[i].x, trail.points[i].y);
    ctx.stroke();
  }
}
