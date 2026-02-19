import { describe, it, expect } from 'vitest';
import { createAsteroid } from '../src/asteroid.js';
import {
  detectCollisions,
  resolveCollision,
  separateOverlap,
} from '../src/physics.js';

describe('Increment 10: Asteroids Bounce Off Each Other', () => {

  // Helper: create a simple asteroid at a given position with velocity
  function asteroid(x, y, vx, vy, radius) {
    const a = createAsteroid({ x, y, vx, vy, radius });
    // Override angular velocity for deterministic tests
    a.angularVelocity = 0.1;
    return a;
  }

  // Helper: compute total momentum (mass = radius²)
  function totalMomentum(asteroids) {
    let px = 0, py = 0;
    for (const a of asteroids) {
      const mass = a.radius * a.radius;
      px += mass * a.vx;
      py += mass * a.vy;
    }
    return { px, py };
  }

  // Helper: compute total kinetic energy (mass = radius²)
  function totalKE(asteroids) {
    let ke = 0;
    for (const a of asteroids) {
      const mass = a.radius * a.radius;
      ke += 0.5 * mass * (a.vx * a.vx + a.vy * a.vy);
    }
    return ke;
  }

  describe('detectCollisions', () => {
    it('detects a collision when distance < radiusA + radiusB', () => {
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(150, 100, 0, 0, 30);
      // distance = 50, radii sum = 60 → collision
      const pairs = detectCollisions([a, b]);
      expect(pairs.length).toBe(1);
    });

    it('does NOT detect collision when exactly touching (distance == radiusA + radiusB)', () => {
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(160, 100, 0, 0, 30);
      // distance = 60, radii sum = 60 → exactly touching, NOT a collision
      const pairs = detectCollisions([a, b]);
      expect(pairs.length).toBe(0);
    });

    it('does NOT detect collision when far apart', () => {
      const a = asteroid(0, 0, 0, 0, 20);
      const b = asteroid(200, 200, 0, 0, 20);
      const pairs = detectCollisions([a, b]);
      expect(pairs.length).toBe(0);
    });

    it('returns no duplicate pairs', () => {
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(120, 100, 0, 0, 30);
      const pairs = detectCollisions([a, b]);
      // Should be exactly 1 pair, not 2
      expect(pairs.length).toBe(1);
    });

    it('detects multiple pairs in a group', () => {
      // Three asteroids all overlapping each other
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(120, 100, 0, 0, 30);
      const c = asteroid(110, 115, 0, 0, 30);
      const pairs = detectCollisions([a, b, c]);
      expect(pairs.length).toBe(3); // a-b, a-c, b-c
    });

    it('returns empty array when given 0 or 1 asteroids', () => {
      expect(detectCollisions([]).length).toBe(0);
      expect(detectCollisions([asteroid(0, 0, 0, 0, 10)]).length).toBe(0);
    });
  });

  describe('resolveCollision', () => {
    it('conserves momentum (within 1% tolerance)', () => {
      const a = asteroid(100, 100, 50, 0, 30);
      const b = asteroid(140, 100, -30, 0, 30);
      const before = totalMomentum([a, b]);

      resolveCollision(a, b);
      const after = totalMomentum([a, b]);

      expect(after.px).toBeCloseTo(before.px, 0);
      expect(after.py).toBeCloseTo(before.py, 0);
      // Tighter check: within 1%
      const pMagBefore = Math.sqrt(before.px ** 2 + before.py ** 2);
      if (pMagBefore > 0) {
        const pError = Math.sqrt((after.px - before.px) ** 2 + (after.py - before.py) ** 2);
        expect(pError / pMagBefore).toBeLessThan(0.01);
      }
    });

    it('approximately conserves kinetic energy (within 5% tolerance)', () => {
      const a = asteroid(100, 100, 50, 0, 30);
      const b = asteroid(140, 100, -30, 0, 30);
      const keBefore = totalKE([a, b]);

      resolveCollision(a, b);
      const keAfter = totalKE([a, b]);

      // ±2% impulse perturbation can cause up to ~4% KE error
      // on high-relative-velocity collisions; 5% tolerance accounts for this
      const keError = Math.abs(keAfter - keBefore) / keBefore;
      expect(keError).toBeLessThan(0.05);
    });

    it('large asteroid barely flinches; small one ricochets', () => {
      const large = asteroid(100, 100, 20, 0, 70);
      const small = asteroid(170, 100, -60, 0, 15);
      const largeVxBefore = large.vx;
      const smallVxBefore = small.vx;

      resolveCollision(large, small);

      // Large asteroid should change velocity much less than small one
      const largeDv = Math.abs(large.vx - largeVxBefore);
      const smallDv = Math.abs(small.vx - smallVxBefore);
      expect(smallDv).toBeGreaterThan(largeDv * 3);
    });

    it('two equal asteroids in head-on collision approximately swap velocities', () => {
      const a = asteroid(100, 100, 50, 0, 30);
      const b = asteroid(150, 100, -50, 0, 30);

      resolveCollision(a, b);

      // After elastic head-on with equal masses, velocities should roughly swap
      // ±2% impulse perturbation can shift result by up to ±2 px/s
      expect(a.vx).toBeGreaterThan(-53);
      expect(a.vx).toBeLessThan(-47);
      expect(b.vx).toBeGreaterThan(47);
      expect(b.vx).toBeLessThan(53);
    });

    it('applies small random perturbation (±2%) to post-collision velocities', () => {
      // Run many collisions with identical setup; velocities should vary slightly
      let vxValues = [];
      for (let i = 0; i < 50; i++) {
        const a = asteroid(100, 100, 50, 0, 30);
        const b = asteroid(150, 100, -50, 0, 30);
        resolveCollision(a, b);
        vxValues.push(a.vx);
      }
      // Not all identical (perturbation introduces variance)
      const unique = new Set(vxValues.map(v => v.toFixed(4)));
      expect(unique.size).toBeGreaterThan(1);
    });

    it('nudges angular velocity slightly on impact', () => {
      const a = asteroid(100, 100, 50, 0, 30);
      const b = asteroid(150, 100, -50, 0, 30);
      const angVelBefore = a.angularVelocity;

      resolveCollision(a, b);

      expect(a.angularVelocity).not.toBe(angVelBefore);
    });
  });

  describe('separateOverlap', () => {
    it('separates overlapping asteroids so they no longer intersect', () => {
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(130, 100, 0, 0, 30);
      // distance = 30, radii sum = 60 → overlapping by 30px

      separateOverlap(a, b);

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThanOrEqual(a.radius + b.radius);
    });

    it('lighter asteroid is pushed more during separation', () => {
      const large = asteroid(100, 100, 0, 0, 60);
      const small = asteroid(130, 100, 0, 0, 15);
      const largeXBefore = large.x;
      const smallXBefore = small.x;

      separateOverlap(large, small);

      const largeMoved = Math.abs(large.x - largeXBefore);
      const smallMoved = Math.abs(small.x - smallXBefore);
      expect(smallMoved).toBeGreaterThan(largeMoved);
    });

    it('separation is along the collision normal (line between centers)', () => {
      const a = asteroid(100, 100, 0, 0, 30);
      const b = asteroid(120, 120, 0, 0, 30);

      const nxBefore = b.x - a.x;
      const nyBefore = b.y - a.y;
      const lenBefore = Math.sqrt(nxBefore ** 2 + nyBefore ** 2);

      separateOverlap(a, b);

      const nxAfter = b.x - a.x;
      const nyAfter = b.y - a.y;
      const lenAfter = Math.sqrt(nxAfter ** 2 + nyAfter ** 2);

      // Direction should be preserved (dot product of normalized vectors ≈ 1)
      const dot = (nxBefore / lenBefore) * (nxAfter / lenAfter) +
                  (nyBefore / lenBefore) * (nyAfter / lenAfter);
      expect(dot).toBeCloseTo(1.0, 3);
    });
  });
});
