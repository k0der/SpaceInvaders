/**
 * Generate an irregular polygon shape for an asteroid.
 * Returns an array of [x, y] vertex pairs centered at origin.
 * Vertices are ordered by increasing angle (no crossed edges).
 */
export function generateShape(radius) {
  const vertexCount = 8 + Math.floor(Math.random() * 7); // 8–14
  const step = (Math.PI * 2) / vertexCount;
  const vertices = [];

  for (let i = 0; i < vertexCount; i++) {
    const angle = -Math.PI + step * i; // start at -PI so angles are monotonically increasing
    const r = radius * (0.6 + Math.random() * 0.4); // 0.6–1.0 of radius
    vertices.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }

  return vertices;
}

/**
 * Determine stroke width from asteroid radius (size class).
 */
function getStrokeWidth(radius) {
  if (radius >= 50) return 2.0; // large
  if (radius >= 25) return 1.5; // medium
  return 1.0; // small
}

/** Average vertex distance factor for headless collision radius (E[0.6 + U(0,0.4)]). */
const HEADLESS_COLLISION_FACTOR = 0.8;

/**
 * Create an asteroid object.
 * When headless is true, visual-only data (shape, strokeWidth) is skipped
 * and collisionRadius uses a deterministic approximation.
 */
export function createAsteroid({ x, y, vx, vy, radius, headless = false }) {
  let shape, collisionRadius, angularVelocity, strokeWidth;

  if (headless) {
    shape = null;
    collisionRadius = radius * HEADLESS_COLLISION_FACTOR;
    angularVelocity = 0;
    strokeWidth = 0;
  } else {
    // Angular velocity scaled inversely to radius: smaller = faster spin
    const maxAngVel = 0.5 * (20 / Math.max(radius, 10));
    angularVelocity = (Math.random() * 2 - 1) * Math.min(maxAngVel, 0.5);

    shape = generateShape(radius);

    // Compute effective collision radius as average vertex distance from center
    collisionRadius =
      shape.reduce((sum, [px, py]) => sum + Math.sqrt(px * px + py * py), 0) /
      shape.length;

    strokeWidth = getStrokeWidth(radius);
  }

  return {
    x,
    y,
    vx,
    vy,
    radius,
    collisionRadius,
    rotation: 0,
    angularVelocity,
    shape,
    strokeWidth,
  };
}

/**
 * Update asteroid position and rotation by delta time.
 */
export function updateAsteroid(asteroid, dt) {
  asteroid.x += asteroid.vx * dt;
  asteroid.y += asteroid.vy * dt;
  asteroid.rotation += asteroid.angularVelocity * dt;
}

/**
 * Draw an asteroid as a white wireframe polygon on a canvas 2D context.
 */
export function drawAsteroid(ctx, asteroid, color = '#FFFFFF') {
  const { x, y, rotation, shape, strokeWidth } = asteroid;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;

  ctx.beginPath();
  ctx.moveTo(shape[0][0], shape[0][1]);
  for (let i = 1; i < shape.length; i++) {
    ctx.lineTo(shape[i][0], shape[i][1]);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
