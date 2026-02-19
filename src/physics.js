/**
 * Detect all colliding asteroid pairs using circle-circle collision.
 * Returns an array of [asteroidA, asteroidB] pairs.
 * A collision occurs when distance between centers < sum of collision radii.
 * Exactly touching (distance === sum) is NOT a collision.
 */
export function detectCollisions(asteroids) {
  const pairs = [];
  for (let i = 0; i < asteroids.length; i++) {
    for (let j = i + 1; j < asteroids.length; j++) {
      const a = asteroids[i];
      const b = asteroids[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radiiSum = a.collisionRadius + b.collisionRadius;
      if (dist < radiiSum) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

/**
 * Separate two overlapping asteroids along the collision normal.
 * Lighter asteroid (smaller collisionRadius²) is pushed proportionally more.
 */
export function separateOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) {
    // Perfectly coincident — push apart along arbitrary axis
    b.x += a.collisionRadius + b.collisionRadius;
    return;
  }

  const overlap = a.collisionRadius + b.collisionRadius - dist;
  if (overlap <= 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const massA = a.collisionRadius * a.collisionRadius;
  const massB = b.collisionRadius * b.collisionRadius;
  const totalMass = massA + massB;

  // Lighter asteroid moves more
  const pushA = overlap * (massB / totalMass);
  const pushB = overlap * (massA / totalMass);

  a.x -= nx * pushA;
  a.y -= ny * pushA;
  b.x += nx * pushB;
  b.y += ny * pushB;
}

/**
 * Resolve an elastic collision between two asteroids.
 * Uses 2D elastic collision formula with mass = collisionRadius².
 * Applies ±1% random perturbation and angular velocity nudge.
 */
export function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const massA = a.collisionRadius * a.collisionRadius;
  const massB = b.collisionRadius * b.collisionRadius;

  // Relative velocity along collision normal
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const dvDotN = dvx * nx + dvy * ny;

  // Don't resolve if asteroids are moving apart
  if (dvDotN <= 0) return;

  const totalMass = massA + massB;

  // 2D elastic collision impulse with ±1% perturbation on magnitude.
  // Using a single factor for both asteroids preserves momentum exactly
  // while adding enough variation to prevent repeating collision patterns.
  // Kept at ±1% to maintain KE conservation within 5%.
  const perturbation = 1 + (Math.random() * 0.02 - 0.01);
  const impulseA = ((2 * massB) / totalMass) * dvDotN * perturbation;
  const impulseB = ((2 * massA) / totalMass) * dvDotN * perturbation;

  a.vx -= impulseA * nx;
  a.vy -= impulseA * ny;
  b.vx += impulseB * nx;
  b.vy += impulseB * ny;

  // Nudge angular velocity slightly on impact
  const angularNudge = () => Math.random() * 0.2 - 0.1;
  a.angularVelocity += angularNudge();
  b.angularVelocity += angularNudge();
}
