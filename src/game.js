/** Duration of the explosion effect in seconds. */
export const EXPLOSION_DURATION = 1.0;

/** Maximum radius the explosion circle expands to (pixels). */
export const EXPLOSION_MAX_RADIUS = 60;

/**
 * Check if a bullet is within a ship's collision radius.
 * Returns true when distance(bullet, ship) < ship.collisionRadius.
 */
export function checkBulletShipHit(bullet, ship) {
  const dx = bullet.x - ship.x;
  const dy = bullet.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < ship.collisionRadius;
}

/**
 * Process bullet-ship collisions for both ships.
 * Player bullets can only hit the enemy; enemy bullets can only hit the player.
 * Dead ships cannot be hit.
 *
 * Returns { bullets, playerHit, enemyHit } — surviving bullets and hit flags.
 * Does NOT mutate ships (caller handles death).
 */
export function processBulletShipCollisions(bullets, playerShip, enemyShip) {
  let playerHit = false;
  let enemyHit = false;

  const surviving = bullets.filter((bullet) => {
    if (bullet.owner === 'player' && enemyShip.alive) {
      if (checkBulletShipHit(bullet, enemyShip)) {
        enemyHit = true;
        return false;
      }
    }
    if (bullet.owner === 'enemy' && playerShip.alive) {
      if (checkBulletShipHit(bullet, playerShip)) {
        playerHit = true;
        return false;
      }
    }
    return true;
  });

  return { bullets: surviving, playerHit, enemyHit };
}

/**
 * Create an explosion effect at the given world position.
 */
export function createExplosion(x, y) {
  return { x, y, age: 0 };
}

/**
 * Advance explosion age by dt.
 */
export function updateExplosion(explosion, dt) {
  explosion.age += dt;
}

/**
 * Returns true when the explosion has completed its animation.
 */
export function isExplosionDone(explosion) {
  return explosion.age >= EXPLOSION_DURATION;
}

/**
 * Draw an expanding wireframe circle that fades out over its lifetime.
 */
export function drawExplosion(ctx, explosion) {
  const progress = explosion.age / EXPLOSION_DURATION;
  const radius = progress * EXPLOSION_MAX_RADIUS;
  const alpha = 1.0 - progress;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Create the initial game state.
 */
export function createGameState() {
  return {
    phase: 'playing',
    explosions: [],
  };
}

/**
 * Transition game phase based on ship alive status.
 * Only transitions from 'playing' — terminal states are sticky.
 */
export function updateGameState(state, playerShip, enemyShip) {
  if (state.phase !== 'playing') return;

  if (!playerShip.alive) {
    state.phase = 'playerDead';
  } else if (!enemyShip.alive) {
    state.phase = 'playerWin';
  }
}
