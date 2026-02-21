import { describe, expect, it, vi } from 'vitest';
import {
  checkBulletShipHit,
  checkShipAsteroidCollision,
  clearSpawnZone,
  createExplosion,
  createGameState,
  drawEndScreenOverlay,
  drawExplosion,
  drawHUD,
  EXPLOSION_DURATION,
  EXPLOSION_INNER_RATIO,
  EXPLOSION_MAX_RADIUS,
  GRACE_PERIOD,
  isExplosionDone,
  processBulletShipCollisions,
  SPAWN_SAFE_RADIUS,
  updateExplosion,
  updateGameState,
} from '../src/game.js';
import { SHIP_SIZE } from '../src/ship.js';

function makeShip(overrides = {}) {
  return {
    x: 0,
    y: 0,
    alive: true,
    collisionRadius: SHIP_SIZE,
    owner: 'player',
    ...overrides,
  };
}

function makeBullet(overrides = {}) {
  return {
    x: 0,
    y: 0,
    owner: 'player',
    ...overrides,
  };
}

describe('Increment 27: Bullet-Ship Collision', () => {
  describe('checkBulletShipHit', () => {
    it('returns true when bullet is inside ship collision radius', () => {
      const bullet = makeBullet({ x: 5, y: 0 });
      const ship = makeShip({ x: 0, y: 0 });
      expect(checkBulletShipHit(bullet, ship)).toBe(true);
    });

    it('returns false when bullet is outside ship collision radius', () => {
      const bullet = makeBullet({ x: 100, y: 0 });
      const ship = makeShip({ x: 0, y: 0 });
      expect(checkBulletShipHit(bullet, ship)).toBe(false);
    });

    it('returns false when bullet is exactly at collision radius (strict <)', () => {
      const bullet = makeBullet({ x: SHIP_SIZE, y: 0 });
      const ship = makeShip({ x: 0, y: 0 });
      expect(checkBulletShipHit(bullet, ship)).toBe(false);
    });

    it('returns true when bullet is just inside collision radius', () => {
      const bullet = makeBullet({ x: SHIP_SIZE - 0.01, y: 0 });
      const ship = makeShip({ x: 0, y: 0 });
      expect(checkBulletShipHit(bullet, ship)).toBe(true);
    });

    it('works with non-zero ship positions', () => {
      const ship = makeShip({ x: 100, y: 200 });
      const bullet = makeBullet({ x: 105, y: 200 });
      expect(checkBulletShipHit(bullet, ship)).toBe(true);
    });

    it('works with diagonal distance', () => {
      // Distance = sqrt(10^2 + 10^2) = ~14.14, which is < SHIP_SIZE (15)
      const bullet = makeBullet({ x: 10, y: 10 });
      const ship = makeShip({ x: 0, y: 0 });
      expect(checkBulletShipHit(bullet, ship)).toBe(true);
    });
  });

  describe('processBulletShipCollisions', () => {
    it('removes player bullet that hits enemy and sets enemyHit', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const bullet = makeBullet({ x: 102, y: 0, owner: 'player' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(0);
      expect(result.enemyHit).toBe(true);
      expect(result.playerHit).toBe(false);
    });

    it('removes enemy bullet that hits player and sets playerHit', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const bullet = makeBullet({ x: 2, y: 0, owner: 'enemy' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(0);
      expect(result.playerHit).toBe(true);
      expect(result.enemyHit).toBe(false);
    });

    it('does not let player bullet hit player (owner filtering)', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 500, y: 0, owner: 'enemy' });
      const bullet = makeBullet({ x: 2, y: 0, owner: 'player' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(1);
      expect(result.playerHit).toBe(false);
      expect(result.enemyHit).toBe(false);
    });

    it('does not let enemy bullet hit enemy (owner filtering)', () => {
      const playerShip = makeShip({ x: 500, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 0, y: 0, owner: 'enemy' });
      const bullet = makeBullet({ x: 2, y: 0, owner: 'enemy' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(1);
      expect(result.playerHit).toBe(false);
      expect(result.enemyHit).toBe(false);
    });

    it('bullet that misses both ships survives', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const bullet = makeBullet({ x: 50, y: 200, owner: 'player' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(1);
      expect(result.playerHit).toBe(false);
      expect(result.enemyHit).toBe(false);
    });

    it('does not hit a dead ship', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({
        x: 100,
        y: 0,
        owner: 'enemy',
        alive: false,
      });
      const bullet = makeBullet({ x: 102, y: 0, owner: 'player' });
      const result = processBulletShipCollisions(
        [bullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(1);
      expect(result.enemyHit).toBe(false);
    });

    it('handles multiple bullets with mixed hits', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const hitBullet = makeBullet({ x: 102, y: 0, owner: 'player' });
      const missBullet = makeBullet({ x: 50, y: 300, owner: 'player' });
      const result = processBulletShipCollisions(
        [hitBullet, missBullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(1);
      expect(result.enemyHit).toBe(true);
    });

    it('detects both ships hit in the same frame', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const playerBullet = makeBullet({ x: 102, y: 0, owner: 'player' });
      const enemyBullet = makeBullet({ x: 2, y: 0, owner: 'enemy' });
      const result = processBulletShipCollisions(
        [playerBullet, enemyBullet],
        playerShip,
        enemyShip,
      );
      expect(result.bullets).toHaveLength(0);
      expect(result.playerHit).toBe(true);
      expect(result.enemyHit).toBe(true);
    });

    it('handles empty bullet array', () => {
      const playerShip = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemyShip = makeShip({ x: 100, y: 0, owner: 'enemy' });
      const result = processBulletShipCollisions([], playerShip, enemyShip);
      expect(result.bullets).toHaveLength(0);
      expect(result.playerHit).toBe(false);
      expect(result.enemyHit).toBe(false);
    });
  });

  describe('createExplosion', () => {
    it('returns explosion with given position and age 0', () => {
      const explosion = createExplosion(100, 200);
      expect(explosion.x).toBe(100);
      expect(explosion.y).toBe(200);
      expect(explosion.age).toBe(0);
    });

    it('stores the given color', () => {
      const color = { r: 80, g: 140, b: 255 };
      const explosion = createExplosion(0, 0, color);
      expect(explosion.color).toEqual(color);
    });

    it('defaults to white when no color provided', () => {
      const explosion = createExplosion(0, 0);
      expect(explosion.color).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('updateExplosion', () => {
    it('increments age by dt', () => {
      const explosion = createExplosion(0, 0);
      updateExplosion(explosion, 0.1);
      expect(explosion.age).toBeCloseTo(0.1);
    });

    it('accumulates age across multiple updates', () => {
      const explosion = createExplosion(0, 0);
      updateExplosion(explosion, 0.1);
      updateExplosion(explosion, 0.2);
      expect(explosion.age).toBeCloseTo(0.3);
    });
  });

  describe('isExplosionDone', () => {
    it('returns false when age is less than EXPLOSION_DURATION', () => {
      const explosion = createExplosion(0, 0);
      explosion.age = EXPLOSION_DURATION - 0.01;
      expect(isExplosionDone(explosion)).toBe(false);
    });

    it('returns true when age equals EXPLOSION_DURATION', () => {
      const explosion = createExplosion(0, 0);
      explosion.age = EXPLOSION_DURATION;
      expect(isExplosionDone(explosion)).toBe(true);
    });

    it('returns true when age exceeds EXPLOSION_DURATION', () => {
      const explosion = createExplosion(0, 0);
      explosion.age = EXPLOSION_DURATION + 1;
      expect(isExplosionDone(explosion)).toBe(true);
    });
  });

  describe('EXPLOSION constants', () => {
    it('EXPLOSION_DURATION is a positive number', () => {
      expect(EXPLOSION_DURATION).toBeGreaterThan(0);
    });

    it('EXPLOSION_MAX_RADIUS is a positive number', () => {
      expect(EXPLOSION_MAX_RADIUS).toBeGreaterThan(0);
    });
  });

  describe('drawExplosion', () => {
    it('draws two concentric expanding circles with fading alpha', () => {
      const styles = [];
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(() => styles.push(ctx.strokeStyle)),
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
      };
      const color = { r: 80, g: 140, b: 255 };
      const explosion = createExplosion(100, 200, color);
      explosion.age = EXPLOSION_DURATION * 0.5;

      drawExplosion(ctx, explosion);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledTimes(2);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
      expect(ctx.restore).toHaveBeenCalled();

      // Outer circle
      const outerArc = ctx.arc.mock.calls[0];
      expect(outerArc[0]).toBe(100);
      expect(outerArc[1]).toBe(200);
      expect(outerArc[2]).toBeGreaterThan(0);
      expect(outerArc[2]).toBeLessThan(EXPLOSION_MAX_RADIUS);

      // Inner circle — smaller than outer
      const innerArc = ctx.arc.mock.calls[1];
      expect(innerArc[0]).toBe(100);
      expect(innerArc[1]).toBe(200);
      expect(innerArc[2]).toBeCloseTo(outerArc[2] * EXPLOSION_INNER_RATIO);

      // Both strokes use the explosion's color
      for (const style of styles) {
        expect(style).toMatch(/^rgba\(80, 140, 255,/);
      }
    });

    it('uses red for enemy explosions', () => {
      const styles = [];
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(() => styles.push(ctx.strokeStyle)),
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
      };
      const explosion = createExplosion(0, 0, { r: 255, g: 50, b: 30 });
      explosion.age = EXPLOSION_DURATION * 0.5;
      drawExplosion(ctx, explosion);

      for (const style of styles) {
        expect(style).toMatch(/^rgba\(255, 50, 30,/);
      }
    });

    it('does not crash at age 0', () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
      };
      const explosion = createExplosion(0, 0);
      drawExplosion(ctx, explosion);
    });
  });

  describe('createGameState', () => {
    it('returns state with phase playing, empty explosions, and deathTimer 0', () => {
      const state = createGameState();
      expect(state.phase).toBe('playing');
      expect(state.explosions).toEqual([]);
      expect(state.deathTimer).toBe(0);
    });
  });

  describe('updateGameState', () => {
    it('stays playing when both ships are alive', () => {
      const state = createGameState();
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('playing');
    });

    it('transitions to ending (not directly to terminal) when enemy dies', () => {
      const state = createGameState();
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: false, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('ending');
      expect(state.deathTimer).toBe(GRACE_PERIOD);
    });

    it('transitions to ending when player dies', () => {
      const state = createGameState();
      const player = makeShip({ alive: false, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('ending');
    });

    it('transitions to ending when both die simultaneously', () => {
      const state = createGameState();
      const player = makeShip({ alive: false, owner: 'player' });
      const enemy = makeShip({ alive: false, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('ending');
    });

    it('ticks deathTimer during ending phase', () => {
      const state = createGameState();
      state.phase = 'ending';
      state.deathTimer = GRACE_PERIOD;
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: false, owner: 'enemy' });
      updateGameState(state, player, enemy, 0.5);
      expect(state.phase).toBe('ending');
      expect(state.deathTimer).toBeCloseTo(GRACE_PERIOD - 0.5);
    });

    it('resolves to playerWin when grace period expires and only enemy is dead', () => {
      const state = createGameState();
      state.phase = 'ending';
      state.deathTimer = 0.01;
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: false, owner: 'enemy' });
      updateGameState(state, player, enemy, 0.02);
      expect(state.phase).toBe('playerWin');
    });

    it('resolves to playerDead when grace period expires and only player is dead', () => {
      const state = createGameState();
      state.phase = 'ending';
      state.deathTimer = 0.01;
      const player = makeShip({ alive: false, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0.02);
      expect(state.phase).toBe('playerDead');
    });

    it('resolves to draw when grace period expires and both are dead', () => {
      const state = createGameState();
      state.phase = 'ending';
      state.deathTimer = 0.01;
      const player = makeShip({ alive: false, owner: 'player' });
      const enemy = makeShip({ alive: false, owner: 'enemy' });
      updateGameState(state, player, enemy, 0.02);
      expect(state.phase).toBe('draw');
    });

    it('does not transition back to playing from playerWin', () => {
      const state = createGameState();
      state.phase = 'playerWin';
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('playerWin');
    });

    it('does not transition back to playing from playerDead', () => {
      const state = createGameState();
      state.phase = 'playerDead';
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('playerDead');
    });

    it('does not transition back from draw', () => {
      const state = createGameState();
      state.phase = 'draw';
      const player = makeShip({ alive: true, owner: 'player' });
      const enemy = makeShip({ alive: true, owner: 'enemy' });
      updateGameState(state, player, enemy, 0);
      expect(state.phase).toBe('draw');
    });

    it('GRACE_PERIOD is a positive number', () => {
      expect(GRACE_PERIOD).toBeGreaterThan(0);
    });
  });
});

function makeAsteroid(overrides = {}) {
  return {
    x: 0,
    y: 0,
    collisionRadius: 30,
    ...overrides,
  };
}

describe('Increment 28: Ship-Asteroid Collision', () => {
  describe('checkShipAsteroidCollision', () => {
    it('returns the first overlapping asteroid when ship is inside collision range', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const asteroid = makeAsteroid({ x: 20, y: 0, collisionRadius: 30 });
      // distance = 20, sum of radii = 30 + 15 = 45 → 20 < 45 → collision
      const result = checkShipAsteroidCollision(ship, [asteroid]);
      expect(result).toBe(asteroid);
    });

    it('returns null when no asteroids overlap the ship', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const asteroid = makeAsteroid({ x: 200, y: 0, collisionRadius: 30 });
      const result = checkShipAsteroidCollision(ship, [asteroid]);
      expect(result).toBeNull();
    });

    it('returns null when distance exactly equals sum of radii (strict <)', () => {
      const ship = makeShip({ x: 0, y: 0 });
      // distance = SHIP_SIZE + 30 = 45 → not a collision (strict <)
      const asteroid = makeAsteroid({
        x: SHIP_SIZE + 30,
        y: 0,
        collisionRadius: 30,
      });
      const result = checkShipAsteroidCollision(ship, [asteroid]);
      expect(result).toBeNull();
    });

    it('returns the first overlapping asteroid when multiple overlap', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const asteroid1 = makeAsteroid({ x: 10, y: 0, collisionRadius: 30 });
      const asteroid2 = makeAsteroid({ x: 5, y: 0, collisionRadius: 30 });
      const result = checkShipAsteroidCollision(ship, [asteroid1, asteroid2]);
      expect(result).toBe(asteroid1);
    });

    it('returns null for an empty asteroid array', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const result = checkShipAsteroidCollision(ship, []);
      expect(result).toBeNull();
    });

    it('uses circle-circle detection with collisionRadius', () => {
      const ship = makeShip({ x: 100, y: 100 });
      // distance = sqrt(10^2 + 10^2) = ~14.14
      // sum of radii = SHIP_SIZE(15) + 5 = 20 → 14.14 < 20 → collision
      const asteroid = makeAsteroid({
        x: 110,
        y: 110,
        collisionRadius: 5,
      });
      const result = checkShipAsteroidCollision(ship, [asteroid]);
      expect(result).toBe(asteroid);
    });

    it('skips non-overlapping asteroids and finds first overlapping one', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const far = makeAsteroid({ x: 500, y: 500, collisionRadius: 10 });
      const close = makeAsteroid({ x: 10, y: 0, collisionRadius: 20 });
      const result = checkShipAsteroidCollision(ship, [far, close]);
      expect(result).toBe(close);
    });

    it('does not check dead ships (caller responsibility — function checks any ship passed)', () => {
      // The function itself doesn't filter by alive — it's the caller's job.
      // But verify it works for any ship object passed to it.
      const ship = makeShip({ x: 0, y: 0, alive: false });
      const asteroid = makeAsteroid({ x: 10, y: 0, collisionRadius: 30 });
      const result = checkShipAsteroidCollision(ship, [asteroid]);
      expect(result).toBe(asteroid);
    });

    it('does not mutate asteroids (asteroids unaffected)', () => {
      const ship = makeShip({ x: 0, y: 0 });
      const asteroid = makeAsteroid({ x: 10, y: 0, collisionRadius: 30 });
      const originalX = asteroid.x;
      const originalY = asteroid.y;
      const originalRadius = asteroid.collisionRadius;
      checkShipAsteroidCollision(ship, [asteroid]);
      expect(asteroid.x).toBe(originalX);
      expect(asteroid.y).toBe(originalY);
      expect(asteroid.collisionRadius).toBe(originalRadius);
    });

    it('works identically for player and enemy ships', () => {
      const asteroid = makeAsteroid({ x: 10, y: 0, collisionRadius: 30 });
      const player = makeShip({ x: 0, y: 0, owner: 'player' });
      const enemy = makeShip({ x: 0, y: 0, owner: 'enemy' });
      expect(checkShipAsteroidCollision(player, [asteroid])).toBe(asteroid);
      expect(checkShipAsteroidCollision(enemy, [asteroid])).toBe(asteroid);
    });
  });
});

describe('Increment 29: HUD', () => {
  function mockCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    };
  }

  describe('drawHUD', () => {
    it('does nothing during playing phase', () => {
      const ctx = mockCtx();
      drawHUD(ctx, 'playing', 800, 600);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('does nothing during ending phase', () => {
      const ctx = mockCtx();
      drawHUD(ctx, 'ending', 800, 600);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('renders text for playerWin phase', () => {
      const ctx = mockCtx();
      drawHUD(ctx, 'playerWin', 800, 600);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders text for playerDead phase', () => {
      const ctx = mockCtx();
      drawHUD(ctx, 'playerDead', 800, 600);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('uses blue for playerWin main text', () => {
      const styles = [];
      const ctx = mockCtx();
      ctx.stroke = vi.fn(() => styles.push(ctx.strokeStyle));
      drawHUD(ctx, 'playerWin', 800, 600);

      // First stroke uses the main text color (blue)
      expect(styles[0]).toBe('#508CFF');
    });

    it('uses red for playerDead main text', () => {
      const styles = [];
      const ctx = mockCtx();
      ctx.stroke = vi.fn(() => styles.push(ctx.strokeStyle));
      drawHUD(ctx, 'playerDead', 800, 600);

      // First stroke uses the main text color (red)
      expect(styles[0]).toBe('#FF321E');
    });

    it('uses white for draw main text', () => {
      const styles = [];
      const ctx = mockCtx();
      ctx.stroke = vi.fn(() => styles.push(ctx.strokeStyle));
      drawHUD(ctx, 'draw', 800, 600);

      expect(styles[0]).toBe('#FFFFFF');
    });

    it('saves and restores canvas state', () => {
      const ctx = mockCtx();
      drawHUD(ctx, 'playerWin', 800, 600);

      // drawVectorText is called twice (main text + sub text), each saves/restores
      expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('drawEndScreenOverlay', () => {
    it('does nothing during playing phase', () => {
      const ctx = mockCtx();
      ctx.fillRect = vi.fn();
      drawEndScreenOverlay(ctx, 'playing', 800, 600);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('does nothing during ending phase', () => {
      const ctx = mockCtx();
      ctx.fillRect = vi.fn();
      drawEndScreenOverlay(ctx, 'ending', 800, 600);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('draws a semi-transparent black overlay for playerWin', () => {
      const ctx = mockCtx();
      ctx.fillRect = vi.fn();
      ctx.fillStyle = '';
      drawEndScreenOverlay(ctx, 'playerWin', 800, 600);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(ctx.globalAlpha).toBeLessThan(1);
      expect(ctx.globalAlpha).toBeGreaterThan(0);
      expect(ctx.fillStyle).toBe('#000000');
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws a semi-transparent black overlay for playerDead', () => {
      const ctx = mockCtx();
      ctx.fillRect = vi.fn();
      ctx.fillStyle = '';
      drawEndScreenOverlay(ctx, 'playerDead', 800, 600);

      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(ctx.globalAlpha).toBeLessThan(1);
    });
  });
});

describe('Increment 29: SPAWN_SAFE_RADIUS', () => {
  it('equals 3 times SHIP_SIZE', () => {
    expect(SPAWN_SAFE_RADIUS).toBe(3 * SHIP_SIZE);
  });
});

describe('Increment 29: clearSpawnZone', () => {
  it('removes asteroids overlapping a ship position', () => {
    const asteroids = [
      makeAsteroid({ x: 10, y: 0, collisionRadius: 20 }),
      makeAsteroid({ x: 500, y: 500, collisionRadius: 20 }),
    ];
    const ships = [makeShip({ x: 0, y: 0 })];
    const result = clearSpawnZone(asteroids, ships);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(500);
  });

  it('removes asteroids near both player and enemy spawn positions', () => {
    const asteroids = [
      makeAsteroid({ x: 5, y: 0, collisionRadius: 20 }), // near player at 0,0
      makeAsteroid({ x: 205, y: 0, collisionRadius: 20 }), // near enemy at 200,0
      makeAsteroid({ x: 1000, y: 1000, collisionRadius: 20 }), // far from both
    ];
    const ships = [makeShip({ x: 0, y: 0 }), makeShip({ x: 200, y: 0 })];
    const result = clearSpawnZone(asteroids, ships);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(1000);
  });

  it('uses SPAWN_SAFE_RADIUS for clearance distance', () => {
    // Asteroid just outside safe radius should survive
    const farAsteroid = makeAsteroid({
      x: SPAWN_SAFE_RADIUS + 20 + 1,
      y: 0,
      collisionRadius: 20,
    });
    // Asteroid just inside safe radius should be removed
    const nearAsteroid = makeAsteroid({
      x: SPAWN_SAFE_RADIUS + 20 - 1,
      y: 0,
      collisionRadius: 20,
    });
    const ships = [makeShip({ x: 0, y: 0 })];

    const result = clearSpawnZone([farAsteroid, nearAsteroid], ships);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(farAsteroid);
  });

  it('returns all asteroids when none overlap spawn zones', () => {
    const asteroids = [
      makeAsteroid({ x: 500, y: 500, collisionRadius: 20 }),
      makeAsteroid({ x: -500, y: -500, collisionRadius: 20 }),
    ];
    const ships = [makeShip({ x: 0, y: 0 })];
    const result = clearSpawnZone(asteroids, ships);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when all asteroids are in spawn zone', () => {
    const asteroids = [
      makeAsteroid({ x: 5, y: 0, collisionRadius: 20 }),
      makeAsteroid({ x: -5, y: 0, collisionRadius: 20 }),
    ];
    const ships = [makeShip({ x: 0, y: 0 })];
    const result = clearSpawnZone(asteroids, ships);
    expect(result).toHaveLength(0);
  });

  it('does not mutate the original asteroids array', () => {
    const asteroids = [
      makeAsteroid({ x: 5, y: 0, collisionRadius: 20 }),
      makeAsteroid({ x: 500, y: 500, collisionRadius: 20 }),
    ];
    const original = [...asteroids];
    const ships = [makeShip({ x: 0, y: 0 })];
    clearSpawnZone(asteroids, ships);
    expect(asteroids).toEqual(original);
  });
});
