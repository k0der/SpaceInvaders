import { describe, expect, it, vi } from 'vitest';
import {
  createAsteroid,
  drawAsteroid,
  generateShape,
  updateAsteroid,
} from '../src/asteroid.js';

describe('Increment 5: One Asteroid Floats Through', () => {
  describe('generateShape', () => {
    it('produces between 8 and 14 vertices', () => {
      for (let i = 0; i < 50; i++) {
        const shape = generateShape(50);
        expect(shape.length).toBeGreaterThanOrEqual(8);
        expect(shape.length).toBeLessThanOrEqual(14);
      }
    });

    it('every vertex is within [radius*0.6, radius*1.0] from origin', () => {
      for (let i = 0; i < 30; i++) {
        const radius = 50;
        const shape = generateShape(radius);
        for (const [vx, vy] of shape) {
          const dist = Math.sqrt(vx * vx + vy * vy);
          expect(dist).toBeGreaterThanOrEqual(radius * 0.6 - 0.001);
          expect(dist).toBeLessThanOrEqual(radius * 1.0 + 0.001);
        }
      }
    });

    it('vertices are ordered angularly (no crossed edges)', () => {
      for (let i = 0; i < 30; i++) {
        const shape = generateShape(40);
        const angles = shape.map(([vx, vy]) => Math.atan2(vy, vx));
        // All angles should be monotonically increasing (with wrap-around handled)
        for (let j = 1; j < angles.length; j++) {
          // Each angle should be >= previous (they walk around the circle in order)
          expect(angles[j]).toBeGreaterThan(angles[j - 1]);
        }
      }
    });

    it('two calls produce different shapes (randomness)', () => {
      let differ = false;
      for (let i = 0; i < 20; i++) {
        const a = generateShape(50);
        const b = generateShape(50);
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });

    it('works for different radius values', () => {
      for (const r of [10, 25, 50, 80]) {
        const shape = generateShape(r);
        expect(shape.length).toBeGreaterThanOrEqual(8);
        for (const [vx, vy] of shape) {
          const dist = Math.sqrt(vx * vx + vy * vy);
          expect(dist).toBeLessThanOrEqual(r * 1.0 + 0.001);
        }
      }
    });
  });

  describe('createAsteroid', () => {
    it('creates an asteroid with x, y, vx, vy, radius, rotation, and shape', () => {
      const a = createAsteroid({ x: 100, y: 200, vx: 30, vy: 10, radius: 50 });
      expect(a).toHaveProperty('x', 100);
      expect(a).toHaveProperty('y', 200);
      expect(a).toHaveProperty('vx', 30);
      expect(a).toHaveProperty('vy', 10);
      expect(a).toHaveProperty('radius', 50);
      expect(a).toHaveProperty('rotation');
      expect(a).toHaveProperty('angularVelocity');
      expect(a).toHaveProperty('shape');
      expect(a.shape.length).toBeGreaterThanOrEqual(8);
    });

    it('starts with rotation = 0', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
      expect(a.rotation).toBe(0);
    });

    it('assigns an angular velocity', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
      expect(typeof a.angularVelocity).toBe('number');
    });

    it('computes collisionRadius as the average vertex distance from center', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 50 });
      expect(a).toHaveProperty('collisionRadius');
      // Average of vertices at 0.6–1.0 of radius → should be around 0.8 * radius
      expect(a.collisionRadius).toBeGreaterThan(0);
      // Verify it's actually the average of vertex distances
      const avgDist =
        a.shape.reduce(
          (sum, [vx, vy]) => sum + Math.sqrt(vx * vx + vy * vy),
          0,
        ) / a.shape.length;
      expect(a.collisionRadius).toBeCloseTo(avgDist, 5);
    });

    it('collisionRadius is less than or equal to radius', () => {
      for (let i = 0; i < 30; i++) {
        const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 50 });
        expect(a.collisionRadius).toBeLessThanOrEqual(a.radius);
      }
    });

    it('collisionRadius is within the expected range (0.6–1.0 × radius)', () => {
      for (const r of [10, 25, 50, 80]) {
        for (let i = 0; i < 20; i++) {
          const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: r });
          // Vertices range from 0.6–1.0 × radius, so average ≈ 0.8 × radius
          expect(a.collisionRadius).toBeGreaterThanOrEqual(r * 0.6);
          expect(a.collisionRadius).toBeLessThanOrEqual(r * 1.0);
        }
      }
    });
  });

  describe('updateAsteroid', () => {
    it('moves the asteroid by vx*dt and vy*dt', () => {
      const a = createAsteroid({ x: 100, y: 200, vx: 60, vy: -30, radius: 20 });
      updateAsteroid(a, 0.5);
      expect(a.x).toBeCloseTo(130, 1);
      expect(a.y).toBeCloseTo(185, 1);
    });

    it('does not move when dt is 0', () => {
      const a = createAsteroid({ x: 100, y: 200, vx: 60, vy: -30, radius: 20 });
      updateAsteroid(a, 0);
      expect(a.x).toBe(100);
      expect(a.y).toBe(200);
    });
  });

  describe('drawAsteroid', () => {
    it('draws a closed white stroked polygon (no fill)', () => {
      const a = createAsteroid({ x: 400, y: 300, vx: 0, vy: 0, radius: 50 });
      const calls = [];
      const fakeCtx = {
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        translate: vi.fn(() => calls.push('translate')),
        rotate: vi.fn(() => calls.push('rotate')),
        beginPath: vi.fn(() => calls.push('beginPath')),
        moveTo: vi.fn(() => calls.push('moveTo')),
        lineTo: vi.fn(() => calls.push('lineTo')),
        closePath: vi.fn(() => calls.push('closePath')),
        stroke: vi.fn(() => calls.push('stroke')),
        fill: vi.fn(() => calls.push('fill')),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawAsteroid(fakeCtx, a);

      expect(fakeCtx.save).toHaveBeenCalled();
      expect(fakeCtx.translate).toHaveBeenCalledWith(400, 300);
      expect(fakeCtx.rotate).toHaveBeenCalled();
      expect(fakeCtx.beginPath).toHaveBeenCalled();
      expect(fakeCtx.moveTo).toHaveBeenCalled();
      expect(fakeCtx.lineTo).toHaveBeenCalledTimes(a.shape.length - 1);
      expect(fakeCtx.closePath).toHaveBeenCalled();
      expect(fakeCtx.stroke).toHaveBeenCalled();
      expect(fakeCtx.fill).not.toHaveBeenCalled();
      expect(fakeCtx.restore).toHaveBeenCalled();
      expect(fakeCtx.strokeStyle).toBe('#FFFFFF');
    });

    it('saves and restores canvas state around each draw', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
      const calls = [];
      const fakeCtx = {
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawAsteroid(fakeCtx, a);

      expect(calls[0]).toBe('save');
      expect(calls[calls.length - 1]).toBe('restore');
    });
  });
});

describe('Increment 6: The Asteroid Tumbles', () => {
  describe('angularVelocity', () => {
    it('is between -0.5 and +0.5 rad/s', () => {
      for (let i = 0; i < 50; i++) {
        const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
        expect(a.angularVelocity).toBeGreaterThanOrEqual(-0.5);
        expect(a.angularVelocity).toBeLessThanOrEqual(0.5);
      }
    });

    it('larger asteroids rotate more slowly (on average)', () => {
      let largeTotal = 0,
        smallTotal = 0;
      const N = 200;
      for (let i = 0; i < N; i++) {
        const large = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 70 });
        const small = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 15 });
        largeTotal += Math.abs(large.angularVelocity);
        smallTotal += Math.abs(small.angularVelocity);
      }
      expect(largeTotal / N).toBeLessThan(smallTotal / N);
    });
  });

  describe('rotation update', () => {
    it('rotation changes by angularVelocity * dt', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
      a.angularVelocity = 0.3;
      a.rotation = 0;
      updateAsteroid(a, 1.0);
      expect(a.rotation).toBeCloseTo(0.3, 5);
    });

    it('rotation is unchanged when dt is 0', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 30 });
      a.angularVelocity = 0.3;
      a.rotation = 1.0;
      updateAsteroid(a, 0);
      expect(a.rotation).toBe(1.0);
    });

    it('renderer applies rotation transform', () => {
      const a = createAsteroid({ x: 100, y: 200, vx: 0, vy: 0, radius: 30 });
      a.rotation = 0.5;
      const fakeCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawAsteroid(fakeCtx, a);

      expect(fakeCtx.rotate).toHaveBeenCalledWith(0.5);
    });
  });
});

describe('Increment 7: A Field of Asteroids', () => {
  describe('size classes', () => {
    it('large asteroids have radius 50-80 and stroke 2.0', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 65 });
      expect(a.strokeWidth).toBe(2.0);
    });

    it('medium asteroids have radius 25-49 and stroke 1.5', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 35 });
      expect(a.strokeWidth).toBe(1.5);
    });

    it('small asteroids have radius 10-24 and stroke 1.0', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 15 });
      expect(a.strokeWidth).toBe(1.0);
    });

    it('stroke width boundary: radius exactly 50 is large (2.0)', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 50 });
      expect(a.strokeWidth).toBe(2.0);
    });

    it('stroke width boundary: radius exactly 49 is medium (1.5)', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 49 });
      expect(a.strokeWidth).toBe(1.5);
    });

    it('stroke width boundary: radius exactly 25 is medium (1.5)', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 25 });
      expect(a.strokeWidth).toBe(1.5);
    });

    it('stroke width boundary: radius exactly 24 is small (1.0)', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 24 });
      expect(a.strokeWidth).toBe(1.0);
    });

    it('drawAsteroid uses the strokeWidth from the asteroid', () => {
      const a = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius: 65 });
      const fakeCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawAsteroid(fakeCtx, a);

      expect(fakeCtx.lineWidth).toBe(2.0);
    });
  });
});

// ── Headless mode ────────────────────────────────────────────────────
describe('createAsteroid headless mode', () => {
  it('headless: true sets shape to null', () => {
    const a = createAsteroid({
      x: 0,
      y: 0,
      vx: 1,
      vy: 0,
      radius: 40,
      headless: true,
    });
    expect(a.shape).toBeNull();
  });

  it('headless: true uses deterministic collisionRadius = radius * 0.8', () => {
    const radius = 50;
    const a = createAsteroid({
      x: 0,
      y: 0,
      vx: 1,
      vy: 0,
      radius,
      headless: true,
    });
    expect(a.collisionRadius).toBe(radius * 0.8);
  });

  it('headless: true sets angularVelocity to 0', () => {
    const a = createAsteroid({
      x: 0,
      y: 0,
      vx: 1,
      vy: 0,
      radius: 30,
      headless: true,
    });
    expect(a.angularVelocity).toBe(0);
  });

  it('headless: true sets strokeWidth to 0', () => {
    const a = createAsteroid({
      x: 0,
      y: 0,
      vx: 1,
      vy: 0,
      radius: 60,
      headless: true,
    });
    expect(a.strokeWidth).toBe(0);
  });

  it('headless: false (default) generates a shape array', () => {
    const a = createAsteroid({ x: 0, y: 0, vx: 1, vy: 0, radius: 40 });
    expect(Array.isArray(a.shape)).toBe(true);
    expect(a.shape.length).toBeGreaterThanOrEqual(8);
  });

  it('headless asteroid still has all physics fields (x, y, vx, vy, radius)', () => {
    const a = createAsteroid({
      x: 10,
      y: 20,
      vx: 3,
      vy: 4,
      radius: 25,
      headless: true,
    });
    expect(a.x).toBe(10);
    expect(a.y).toBe(20);
    expect(a.vx).toBe(3);
    expect(a.vy).toBe(4);
    expect(a.radius).toBe(25);
    expect(a.rotation).toBe(0);
  });

  it('headless collisionRadius matches expected value of random average', () => {
    // Normal mode: collisionRadius is average vertex distance ≈ radius * 0.8
    // Headless mode: collisionRadius = radius * 0.8 exactly
    const radius = 50;
    const headless = createAsteroid({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius,
      headless: true,
    });

    // Run many normal asteroids and check the mean is close to 0.8
    let totalRatio = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const normal = createAsteroid({ x: 0, y: 0, vx: 0, vy: 0, radius });
      totalRatio += normal.collisionRadius / radius;
    }
    const meanRatio = totalRatio / N;

    expect(headless.collisionRadius / radius).toBe(0.8);
    expect(meanRatio).toBeCloseTo(0.8, 1); // mean of normal mode should be ~0.8
  });
});
