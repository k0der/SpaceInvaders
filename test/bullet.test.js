import { describe, expect, it, vi } from 'vitest';
import {
  BULLET_LENGTH,
  BULLET_LIFETIME,
  BULLET_SPEED,
  checkBulletAsteroidCollisions,
  createBullet,
  drawBullet,
  FIRE_COOLDOWN,
  isBulletExpired,
  updateBullet,
} from '../src/bullet.js';

describe('Increment 24: Bullets', () => {
  describe('constants', () => {
    it('BULLET_SPEED is 600', () => {
      expect(BULLET_SPEED).toBe(600);
    });

    it('BULLET_LIFETIME is 2', () => {
      expect(BULLET_LIFETIME).toBe(2);
    });

    it('FIRE_COOLDOWN is 0.2', () => {
      expect(FIRE_COOLDOWN).toBe(0.2);
    });

    it('BULLET_LENGTH is 4', () => {
      expect(BULLET_LENGTH).toBe(4);
    });

    it('all constants are positive numbers', () => {
      expect(BULLET_SPEED).toBeGreaterThan(0);
      expect(BULLET_LIFETIME).toBeGreaterThan(0);
      expect(FIRE_COOLDOWN).toBeGreaterThan(0);
      expect(BULLET_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('createBullet', () => {
    it('stores x, y, heading, age=0, and owner', () => {
      const b = createBullet(100, 200, 0, 0, 0, 'player');
      expect(b.x).toBe(100);
      expect(b.y).toBe(200);
      expect(b.heading).toBe(0);
      expect(b.age).toBe(0);
      expect(b.owner).toBe('player');
    });

    it('heading=0 shipV=0 → vx=600 vy=0', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      expect(b.vx).toBeCloseTo(600, 5);
      expect(b.vy).toBeCloseTo(0, 5);
    });

    it('heading=PI/2 shipV=0 → vx≈0 vy=600', () => {
      const b = createBullet(0, 0, Math.PI / 2, 0, 0, 'player');
      expect(b.vx).toBeCloseTo(0, 5);
      expect(b.vy).toBeCloseTo(600, 5);
    });

    it('inherits ship momentum: heading=0 shipVx=100 → vx=700', () => {
      const b = createBullet(0, 0, 0, 100, 0, 'player');
      expect(b.vx).toBeCloseTo(700, 5);
      expect(b.vy).toBeCloseTo(0, 5);
    });

    it('inherits ship momentum in Y: heading=PI/2 shipVy=50 → vy=650', () => {
      const b = createBullet(0, 0, Math.PI / 2, 0, 50, 'player');
      expect(b.vx).toBeCloseTo(0, 5);
      expect(b.vy).toBeCloseTo(650, 5);
    });

    it('returns all expected properties', () => {
      const b = createBullet(10, 20, Math.PI, 50, -30, 'enemy');
      expect(b).toEqual({
        x: 10,
        y: 20,
        vx: expect.any(Number),
        vy: expect.any(Number),
        heading: Math.PI,
        age: 0,
        owner: 'enemy',
      });
    });
  });

  describe('updateBullet', () => {
    it('moves linearly: x += vx*dt, y += vy*dt', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      updateBullet(b, 0.1);
      expect(b.x).toBeCloseTo(600 * 0.1, 5);
      expect(b.y).toBeCloseTo(0, 5);
    });

    it('increments age by dt', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      updateBullet(b, 0.5);
      expect(b.age).toBeCloseTo(0.5, 5);
    });

    it('dt=0 → no change', () => {
      const b = createBullet(100, 200, 0, 0, 0, 'player');
      updateBullet(b, 0);
      expect(b.x).toBe(100);
      expect(b.y).toBe(200);
      expect(b.age).toBe(0);
    });

    it('multi-frame accumulation', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      updateBullet(b, 0.1);
      updateBullet(b, 0.1);
      updateBullet(b, 0.1);
      expect(b.x).toBeCloseTo(600 * 0.3, 4);
      expect(b.age).toBeCloseTo(0.3, 5);
    });
  });

  describe('isBulletExpired', () => {
    it('false when age=0', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      expect(isBulletExpired(b)).toBe(false);
    });

    it('false when age < BULLET_LIFETIME', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      b.age = BULLET_LIFETIME - 0.01;
      expect(isBulletExpired(b)).toBe(false);
    });

    it('true when age >= BULLET_LIFETIME', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      b.age = BULLET_LIFETIME + 0.1;
      expect(isBulletExpired(b)).toBe(true);
    });

    it('true at exactly BULLET_LIFETIME', () => {
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      b.age = BULLET_LIFETIME;
      expect(isBulletExpired(b)).toBe(true);
    });
  });

  describe('drawBullet', () => {
    function createFakeCtx() {
      const calls = [];
      return {
        calls,
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        translate: vi.fn(() => calls.push('translate')),
        rotate: vi.fn(() => calls.push('rotate')),
        beginPath: vi.fn(() => calls.push('beginPath')),
        moveTo: vi.fn(() => calls.push('moveTo')),
        lineTo: vi.fn(() => calls.push('lineTo')),
        stroke: vi.fn(() => calls.push('stroke')),
        strokeStyle: '',
        lineWidth: 0,
      };
    }

    it('calls beginPath, moveTo, lineTo, stroke', () => {
      const ctx = createFakeCtx();
      const b = createBullet(100, 200, 0, 0, 0, 'player');
      drawBullet(ctx, b);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('sets white strokeStyle #FFFFFF', () => {
      const ctx = createFakeCtx();
      const b = createBullet(0, 0, 0, 0, 0, 'player');
      drawBullet(ctx, b);
      expect(ctx.strokeStyle).toBe('#FFFFFF');
    });

    it('draws a line of approximately BULLET_LENGTH oriented by heading', () => {
      const ctx = createFakeCtx();
      const heading = Math.PI / 4;
      const b = createBullet(100, 200, heading, 0, 0, 'player');
      drawBullet(ctx, b);

      const moveArgs = ctx.moveTo.mock.calls[0];
      const lineArgs = ctx.lineTo.mock.calls[0];
      const dx = lineArgs[0] - moveArgs[0];
      const dy = lineArgs[1] - moveArgs[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      expect(length).toBeCloseTo(BULLET_LENGTH, 1);
    });
  });

  describe('checkBulletAsteroidCollisions', () => {
    function makeAsteroid(x, y, collisionRadius) {
      return { x, y, collisionRadius };
    }

    it('no asteroids → all bullets survive', () => {
      const bullets = [createBullet(0, 0, 0, 0, 0, 'player')];
      const result = checkBulletAsteroidCollisions(bullets, []);
      expect(result.length).toBe(1);
    });

    it('bullet far from asteroid → survives', () => {
      const bullets = [createBullet(0, 0, 0, 0, 0, 'player')];
      const asteroids = [makeAsteroid(500, 500, 30)];
      const result = checkBulletAsteroidCollisions(bullets, asteroids);
      expect(result.length).toBe(1);
    });

    it('bullet inside asteroid collisionRadius → removed', () => {
      const bullets = [createBullet(100, 100, 0, 0, 0, 'player')];
      const asteroids = [makeAsteroid(105, 100, 30)];
      const result = checkBulletAsteroidCollisions(bullets, asteroids);
      expect(result.length).toBe(0);
    });

    it('asteroid unchanged after bullet removal', () => {
      const bullets = [createBullet(100, 100, 0, 0, 0, 'player')];
      const asteroid = makeAsteroid(105, 100, 30);
      const asteroids = [asteroid];
      checkBulletAsteroidCollisions(bullets, asteroids);
      expect(asteroids.length).toBe(1);
      expect(asteroids[0]).toBe(asteroid);
      expect(asteroid.x).toBe(105);
      expect(asteroid.y).toBe(100);
      expect(asteroid.collisionRadius).toBe(30);
    });

    it('multiple bullets: only colliding ones removed', () => {
      const b1 = createBullet(100, 100, 0, 0, 0, 'player'); // near asteroid
      const b2 = createBullet(500, 500, 0, 0, 0, 'player'); // far away
      const asteroids = [makeAsteroid(105, 100, 30)];
      const result = checkBulletAsteroidCollisions([b1, b2], asteroids);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(b2);
    });

    it('bullet exactly at boundary (distance === collisionRadius) → survives (strict <)', () => {
      // Place bullet exactly at collisionRadius distance
      const asteroid = makeAsteroid(0, 0, 50);
      const bullet = createBullet(50, 0, 0, 0, 0, 'player');
      const result = checkBulletAsteroidCollisions([bullet], [asteroid]);
      expect(result.length).toBe(1);
    });

    it('all bullets collide → empty array', () => {
      const b1 = createBullet(10, 10, 0, 0, 0, 'player');
      const b2 = createBullet(20, 20, 0, 0, 0, 'player');
      const asteroids = [makeAsteroid(10, 10, 50), makeAsteroid(20, 20, 50)];
      const result = checkBulletAsteroidCollisions([b1, b2], asteroids);
      expect(result.length).toBe(0);
    });

    it('no bullets → empty array', () => {
      const asteroids = [makeAsteroid(0, 0, 50)];
      const result = checkBulletAsteroidCollisions([], asteroids);
      expect(result.length).toBe(0);
    });
  });
});
