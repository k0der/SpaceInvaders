import { drawVectorText } from './font.js';

/** Duration of the explosion effect in seconds. */
export const EXPLOSION_DURATION = 1.0;

/** Maximum radius the explosion circle expands to (pixels). */
export const EXPLOSION_MAX_RADIUS = 60;

/**
 * Check if a ship overlaps any asteroid (circle-circle using collisionRadius).
 * Returns the first overlapping asteroid, or null if none overlap.
 */
export function checkShipAsteroidCollision(ship, asteroids) {
  for (const asteroid of asteroids) {
    const dx = ship.x - asteroid.x;
    const dy = ship.y - asteroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ship.collisionRadius + asteroid.collisionRadius) {
      return asteroid;
    }
  }
  return null;
}

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
 * @param {number} x
 * @param {number} y
 * @param {{ r: number, g: number, b: number }} color - RGB color for the rings
 */
export function createExplosion(x, y, color = { r: 255, g: 255, b: 255 }) {
  return { x, y, age: 0, color };
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

/** Inner circle radius ratio relative to the outer circle. */
export const EXPLOSION_INNER_RATIO = 0.5;

/**
 * Draw two expanding concentric wireframe circles that fade out over lifetime.
 * The inner circle is smaller and slightly brighter, creating depth.
 */
export function drawExplosion(ctx, explosion) {
  const progress = explosion.age / EXPLOSION_DURATION;
  const outerRadius = progress * EXPLOSION_MAX_RADIUS;
  const innerRadius = outerRadius * EXPLOSION_INNER_RATIO;
  const alpha = 1.0 - progress;

  const { r, g, b } = explosion.color;

  ctx.save();

  // Outer circle
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle — slightly brighter
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.4, 1.0)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/** Seconds after first death before the final result is shown (matches explosion duration). */
export const GRACE_PERIOD = 1;

/**
 * Create the initial game state.
 */
export function createGameState() {
  return {
    phase: 'playing',
    explosions: [],
    deathTimer: 0,
  };
}

/**
 * Transition game phase based on ship alive status.
 *
 * 'playing' → first death → 'ending' (grace period, collisions still active)
 * 'ending'  → timer expires → 'playerWin' / 'playerDead' / 'draw'
 * Terminal states are sticky.
 */
export function updateGameState(state, playerShip, enemyShip, dt) {
  if (state.phase === 'playing') {
    if (!playerShip.alive || !enemyShip.alive) {
      state.phase = 'ending';
      state.deathTimer = GRACE_PERIOD;
    }
    return;
  }

  if (state.phase === 'ending') {
    state.deathTimer -= dt;
    if (state.deathTimer <= 0) {
      if (!playerShip.alive && !enemyShip.alive) {
        state.phase = 'draw';
      } else if (!playerShip.alive) {
        state.phase = 'playerDead';
      } else {
        state.phase = 'playerWin';
      }
    }
  }
}

/** Safe clearance radius around each ship spawn point. */
export const SPAWN_SAFE_RADIUS = 100;

/**
 * Remove asteroids that overlap any ship's spawn zone.
 * Returns a new array — does not mutate the original.
 */
export function clearSpawnZone(asteroids, ships) {
  return asteroids.filter((asteroid) => {
    for (const ship of ships) {
      const dx = asteroid.x - ship.x;
      const dy = asteroid.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SPAWN_SAFE_RADIUS + asteroid.collisionRadius) {
        return false;
      }
    }
    return true;
  });
}

/** Opacity of the dark overlay drawn behind the HUD text. */
const END_SCREEN_OVERLAY_ALPHA = 0.6;

/**
 * Draw a semi-transparent black overlay for the end screen.
 * Fades the background so the HUD text stands out.
 */
export function drawEndScreenOverlay(ctx, phase, width, height) {
  if (phase === 'playing' || phase === 'ending') return;

  ctx.save();
  ctx.globalAlpha = END_SCREEN_OVERLAY_ALPHA;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Scale for the main HUD text (e.g., "YOU WIN"). */
const HUD_MAIN_SCALE = 8;

/** Scale for the sub-text (e.g., "PRESS ENTER TO RESTART"). */
const HUD_SUB_SCALE = 3;

/** Vertical gap between main text and sub-text (pixels). */
const HUD_TEXT_GAP = 60;

/** Player faction color for HUD text (blue). */
const HUD_PLAYER_COLOR = '#508CFF';

/** Enemy faction color for HUD text (red). */
const HUD_ENEMY_COLOR = '#FF321E';

/** Draw color for draw outcome (white). */
const HUD_DRAW_COLOR = '#FFFFFF';

/**
 * Draw the HUD overlay for terminal phases.
 * Renders "YOU WIN" (blue), "GAME OVER" (red), or "DRAW" (white)
 * with a restart prompt below.
 */
export function drawHUD(ctx, phase, width, height) {
  if (phase === 'playing' || phase === 'ending') return;

  const centerX = width / 2;
  const centerY = height / 2 - 30;

  let mainText;
  let mainColor;
  if (phase === 'playerWin') {
    mainText = 'YOU WIN';
    mainColor = HUD_PLAYER_COLOR;
  } else if (phase === 'draw') {
    mainText = 'DRAW';
    mainColor = HUD_DRAW_COLOR;
  } else {
    mainText = 'GAME OVER';
    mainColor = HUD_ENEMY_COLOR;
  }
  drawVectorText(ctx, mainText, centerX, centerY, HUD_MAIN_SCALE, {
    color: mainColor,
  });

  drawVectorText(
    ctx,
    'PRESS SPACE TO RESTART',
    centerX,
    centerY + HUD_TEXT_GAP,
    HUD_SUB_SCALE,
    { alpha: 0.5 },
  );
}
