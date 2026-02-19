import { describe, it, expect } from 'vitest';
import { computeKE, computeTotalKE, computeSpeedBoost } from '../src/energy.js';
import { createAsteroid } from '../src/asteroid.js';

describe('Increment 12: Energy-Sustaining Spawns', () => {

  // Helper: create an asteroid with known collisionRadius for deterministic tests
  function makeAsteroid(vx, vy, collisionRadius) {
    const a = createAsteroid({ x: 0, y: 0, vx, vy, radius: collisionRadius });
    a.collisionRadius = collisionRadius; // override for determinism
    return a;
  }

  describe('computeKE', () => {
    it('returns 0.5 * collisionRadius² * (vx² + vy²)', () => {
      const a = makeAsteroid(3, 4, 10);
      // mass = 100, speed² = 9+16 = 25, KE = 0.5*100*25 = 1250
      expect(computeKE(a)).toBe(1250);
    });

    it('returns 0 for a stationary asteroid', () => {
      const a = makeAsteroid(0, 0, 30);
      expect(computeKE(a)).toBe(0);
    });

    it('scales with collisionRadius squared', () => {
      const small = makeAsteroid(10, 0, 5);
      const big = makeAsteroid(10, 0, 10);
      // big has 4x the mass → 4x the KE at same speed
      expect(computeKE(big)).toBe(4 * computeKE(small));
    });

    it('scales with velocity squared', () => {
      const slow = makeAsteroid(5, 0, 10);
      const fast = makeAsteroid(10, 0, 10);
      expect(computeKE(fast)).toBe(4 * computeKE(slow));
    });
  });

  describe('computeTotalKE', () => {
    it('sums KE across all asteroids', () => {
      const a = makeAsteroid(3, 4, 10); // KE = 1250
      const b = makeAsteroid(0, 5, 10); // KE = 0.5*100*25 = 1250
      expect(computeTotalKE([a, b])).toBe(2500);
    });

    it('returns 0 for an empty array', () => {
      expect(computeTotalKE([])).toBe(0);
    });

    it('returns 0 when all asteroids are stationary', () => {
      const a = makeAsteroid(0, 0, 20);
      const b = makeAsteroid(0, 0, 30);
      expect(computeTotalKE([a, b])).toBe(0);
    });
  });

  describe('computeSpeedBoost', () => {
    it('returns 1.0 when actual KE >= target KE', () => {
      // targetKE = baselineKEPerAsteroid * targetCount = 100 * 20 = 2000
      // actualKE = 3000 (above target)
      const asteroids = [makeAsteroid(10, 0, 10)]; // doesn't matter, we just need an array
      // Override: computeTotalKE for this array = 0.5*100*100 = 5000
      const a = makeAsteroid(100, 0, 10); // KE = 0.5*100*10000 = 500000
      expect(computeSpeedBoost(100, 20, [a])).toBe(1.0);
    });

    it('returns sqrt(targetKE / actualKE) when actual KE < target KE', () => {
      // baselineKEPerAsteroid=1000, targetCount=10 → targetKE = 10000
      // Single asteroid with KE = 2500 → actualKE = 2500
      // boost = sqrt(10000/2500) = sqrt(4) = 2.0 → clamped to 1.5
      const a = makeAsteroid(5, 0, 10); // KE = 0.5*100*25 = 1250
      // Actually let's make the numbers cleaner
      // baselineKEPerAsteroid=500, targetCount=4, targetKE=2000
      // a has KE=1250, boost = sqrt(2000/1250) = sqrt(1.6) ≈ 1.265
      const boost = computeSpeedBoost(500, 4, [a]);
      const expected = Math.sqrt(2000 / 1250);
      expect(boost).toBeCloseTo(expected, 5);
    });

    it('caps at 1.5 when deficit is extreme', () => {
      // baselineKEPerAsteroid=10000, targetCount=20, targetKE = 200000
      // One tiny slow asteroid → actualKE ≈ tiny
      const a = makeAsteroid(1, 0, 5); // KE = 0.5*25*1 = 12.5
      const boost = computeSpeedBoost(10000, 20, [a]);
      expect(boost).toBe(1.5);
    });

    it('never returns below 1.0', () => {
      // Even with excess energy, always at least 1.0
      const a = makeAsteroid(1000, 0, 50); // huge KE
      const boost = computeSpeedBoost(1, 1, [a]);
      expect(boost).toBe(1.0);
    });

    it('returns 1.5 when there are no asteroids (actualKE = 0)', () => {
      const boost = computeSpeedBoost(1000, 20, []);
      expect(boost).toBe(1.5);
    });

    it('returns 1.0 when baselineKEPerAsteroid is 0', () => {
      const a = makeAsteroid(10, 0, 10);
      const boost = computeSpeedBoost(0, 20, [a]);
      expect(boost).toBe(1.0);
    });

    it('returns 1.5 when existing asteroids are all stationary (actualKE = 0)', () => {
      const a = makeAsteroid(0, 0, 30);
      const b = makeAsteroid(0, 0, 20);
      const boost = computeSpeedBoost(1000, 10, [a, b]);
      expect(boost).toBe(1.5);
    });
  });
});
