/** Bullet travel speed in pixels/second. */
export const BULLET_SPEED = 600;

/** Bullet lifetime in seconds before expiry. */
export const BULLET_LIFETIME = 2;

/** Minimum interval between shots in seconds. */
export const FIRE_COOLDOWN = 0.2;

/** Visual line length of a bullet in pixels. */
export const BULLET_LENGTH = 4;

/**
 * Create a bullet entity at the given position, traveling in heading
 * direction at BULLET_SPEED plus inherited ship velocity.
 */
export function createBullet(x, y, heading, shipVx, shipVy, owner) {
  return {
    x,
    y,
    vx: Math.cos(heading) * BULLET_SPEED + shipVx,
    vy: Math.sin(heading) * BULLET_SPEED + shipVy,
    heading,
    age: 0,
    owner,
  };
}

/**
 * Update bullet position and age for one frame.
 */
export function updateBullet(bullet, dt) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.age += dt;
}

/**
 * Returns true when the bullet has exceeded its lifetime.
 */
export function isBulletExpired(bullet) {
  return bullet.age >= BULLET_LIFETIME;
}

/**
 * Draw a bullet as a short white line segment oriented along its heading.
 */
export function drawBullet(ctx, bullet) {
  const halfLen = BULLET_LENGTH / 2;
  const dx = Math.cos(bullet.heading) * halfLen;
  const dy = Math.sin(bullet.heading) * halfLen;

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bullet.x - dx, bullet.y - dy);
  ctx.lineTo(bullet.x + dx, bullet.y + dy);
  ctx.stroke();
}

/**
 * Remove bullets that are inside any asteroid's collision radius.
 * Returns the filtered array of surviving bullets. Asteroids are unaffected.
 */
export function checkBulletAsteroidCollisions(bullets, asteroids) {
  return bullets.filter((bullet) => {
    for (const asteroid of asteroids) {
      const dx = bullet.x - asteroid.x;
      const dy = bullet.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < asteroid.collisionRadius) {
        return false;
      }
    }
    return true;
  });
}
