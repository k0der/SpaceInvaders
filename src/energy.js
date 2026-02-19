/**
 * Compute kinetic energy for a single asteroid.
 * KE = 0.5 * mass * speed², where mass = collisionRadius²
 */
export function computeKE(asteroid) {
  const mass = asteroid.collisionRadius * asteroid.collisionRadius;
  return 0.5 * mass * (asteroid.vx * asteroid.vx + asteroid.vy * asteroid.vy);
}

/**
 * Sum kinetic energy across all asteroids.
 */
export function computeTotalKE(asteroids) {
  let total = 0;
  for (const a of asteroids) {
    total += computeKE(a);
  }
  return total;
}

/**
 * Compute a speed multiplier for new spawns to sustain system energy.
 * Returns clamp(sqrt(targetKE / actualKE), 1.0, 1.5).
 */
export function computeSpeedBoost(baselineKEPerAsteroid, targetCount, asteroids) {
  const targetKE = baselineKEPerAsteroid * targetCount;
  if (targetKE <= 0) return 1.0;

  const actualKE = computeTotalKE(asteroids);
  if (actualKE <= 0) return 1.5;
  if (actualKE >= targetKE) return 1.0;

  return Math.min(Math.sqrt(targetKE / actualKE), 1.5);
}
