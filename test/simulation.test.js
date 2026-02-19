import { describe, it, expect } from 'vitest';
import {
  isOffScreen,
  spawnAsteroidFromEdge,
  createSimulation,
  updateSimulation,
} from '../src/simulation.js';
import { createAsteroid } from '../src/asteroid.js';
import { computeTotalKE } from '../src/energy.js';

describe('Increment 8: Asteroids Come and Go', () => {

  describe('isOffScreen', () => {
    it('returns true when asteroid is fully past the right edge', () => {
      const a = createAsteroid({ x: 900, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('returns true when asteroid is fully past the left edge', () => {
      const a = createAsteroid({ x: -40, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('returns true when asteroid is fully past the top edge', () => {
      const a = createAsteroid({ x: 400, y: -40, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('returns true when asteroid is fully past the bottom edge', () => {
      const a = createAsteroid({ x: 400, y: 650, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('returns false when asteroid is on screen', () => {
      const a = createAsteroid({ x: 400, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(false);
    });

    it('returns false when asteroid is partially on screen (edge overlap)', () => {
      const a = createAsteroid({ x: 790, y: 300, vx: 0, vy: 0, radius: 30 });
      // center at 790 + radius 30 = 820, partially off right, but center - radius = 760 still on screen
      expect(isOffScreen(a, 800, 600)).toBe(false);
    });

    it('uses margin so asteroid is fully gone before removal', () => {
      // Asteroid at x=-36, radius=30: x+radius+margin = -36+30+5 = -1 < 0 → off-screen
      const a = createAsteroid({ x: -36, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('margin boundary: just inside margin is still on screen (left edge)', () => {
      // x=-34, radius=30: x+radius+margin = -34+30+5 = 1 > 0 → NOT off-screen
      const a = createAsteroid({ x: -34, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(false);
    });

    it('margin boundary: just outside margin is off screen (left edge)', () => {
      // x=-36, radius=30: x+radius+margin = -36+30+5 = -1 < 0 → off-screen
      const a = createAsteroid({ x: -36, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(true);
    });

    it('margin boundary: exactly at margin threshold is still on screen', () => {
      // x=-35, radius=30: x+radius+margin = -35+30+5 = 0, NOT < 0 → still on screen
      const a = createAsteroid({ x: -35, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(a, 800, 600)).toBe(false);
    });

    it('margin boundary: right edge precision', () => {
      // x=835, radius=30: x-radius-margin = 835-30-5 = 800, NOT > 800 → still on screen
      const onEdge = createAsteroid({ x: 835, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(onEdge, 800, 600)).toBe(false);

      // x=836, radius=30: x-radius-margin = 836-30-5 = 801 > 800 → off-screen
      const pastEdge = createAsteroid({ x: 836, y: 300, vx: 0, vy: 0, radius: 30 });
      expect(isOffScreen(pastEdge, 800, 600)).toBe(true);
    });
  });

  describe('spawnAsteroidFromEdge', () => {
    it('creates an asteroid outside the canvas', () => {
      for (let i = 0; i < 50; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        // Asteroid should be outside the visible area
        const outside =
          a.x < -a.radius ||
          a.x > 800 + a.radius ||
          a.y < -a.radius ||
          a.y > 600 + a.radius;
        expect(outside).toBe(true);
      }
    });

    it('produces asteroids with valid radius in range [10, 80]', () => {
      for (let i = 0; i < 50; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        expect(a.radius).toBeGreaterThanOrEqual(10);
        expect(a.radius).toBeLessThanOrEqual(80);
      }
    });

    it('produces asteroids aimed roughly inward', () => {
      // Spawn many and check that the vast majority move toward the canvas center
      let inwardCount = 0;
      const total = 100;
      for (let i = 0; i < total; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        const distBefore = Math.sqrt(
          Math.pow(a.x - 400, 2) + Math.pow(a.y - 300, 2)
        );
        const distAfter = Math.sqrt(
          Math.pow(a.x + a.vx * 2 - 400, 2) + Math.pow(a.y + a.vy * 2 - 300, 2)
        );
        if (distAfter < distBefore) inwardCount++;
      }
      // With ±30° spread, nearly all should move inward; allow a small margin
      expect(inwardCount / total).toBeGreaterThan(0.9);
    });

    it('spawns from all four edges over many calls', () => {
      const edges = { left: 0, right: 0, top: 0, bottom: 0 };
      for (let i = 0; i < 200; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        if (a.x < 0) edges.left++;
        else if (a.x > 800) edges.right++;
        else if (a.y < 0) edges.top++;
        else edges.bottom++;
      }
      expect(edges.left).toBeGreaterThan(0);
      expect(edges.right).toBeGreaterThan(0);
      expect(edges.top).toBeGreaterThan(0);
      expect(edges.bottom).toBeGreaterThan(0);
    });

    it('respects size distribution (~20% large, ~40% medium, ~40% small)', () => {
      let large = 0, medium = 0, small = 0;
      const N = 500;
      for (let i = 0; i < N; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        if (a.radius >= 50) large++;
        else if (a.radius >= 25) medium++;
        else small++;
      }
      // Allow generous tolerance (±15%) for randomness
      expect(large / N).toBeGreaterThan(0.05);
      expect(large / N).toBeLessThan(0.35);
      expect(medium / N).toBeGreaterThan(0.25);
      expect(medium / N).toBeLessThan(0.55);
      expect(small / N).toBeGreaterThan(0.25);
      expect(small / N).toBeLessThan(0.55);
    });

    it('speed is inversely proportional to radius (large=slow, small=fast)', () => {
      // Spawn many and check average speeds by size class
      let largeSpeeds = [], smallSpeeds = [];
      for (let i = 0; i < 200; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        if (a.radius >= 50) largeSpeeds.push(speed);
        else if (a.radius < 25) smallSpeeds.push(speed);
      }
      if (largeSpeeds.length > 0 && smallSpeeds.length > 0) {
        const avgLarge = largeSpeeds.reduce((s, v) => s + v, 0) / largeSpeeds.length;
        const avgSmall = smallSpeeds.reduce((s, v) => s + v, 0) / smallSpeeds.length;
        expect(avgSmall).toBeGreaterThan(avgLarge);
      }
    });
  });

  describe('createSimulation', () => {
    it('creates a simulation with the target asteroid count', () => {
      const sim = createSimulation(800, 600, 20);
      expect(sim.asteroids.length).toBe(20);
      expect(sim.targetCount).toBe(20);
    });

    it('defaults to 20 asteroids', () => {
      const sim = createSimulation(800, 600);
      expect(sim.targetCount).toBe(20);
    });

    it('tracks spawn timer', () => {
      const sim = createSimulation(800, 600);
      expect(sim).toHaveProperty('spawnTimer');
    });
  });

  describe('updateSimulation', () => {
    it('updates all asteroid positions', () => {
      const sim = createSimulation(800, 600, 5);
      const positions = sim.asteroids.map(a => ({ x: a.x, y: a.y }));

      updateSimulation(sim, 0.1, 800, 600);

      let anyMoved = false;
      for (let i = 0; i < sim.asteroids.length; i++) {
        if (sim.asteroids[i].x !== positions[i].x || sim.asteroids[i].y !== positions[i].y) {
          anyMoved = true;
          break;
        }
      }
      expect(anyMoved).toBe(true);
    });

    it('removes off-screen asteroids', () => {
      const sim = createSimulation(800, 600, 0);
      // Manually add an asteroid that is already off-screen
      const offScreen = createAsteroid({ x: -200, y: -200, vx: -10, vy: -10, radius: 20 });
      sim.asteroids.push(offScreen);

      updateSimulation(sim, 0.016, 800, 600);

      expect(sim.asteroids.length).toBe(0);
    });

    it('spawns new asteroids to reach target count (respecting stagger)', () => {
      const sim = createSimulation(800, 600, 5);
      // Remove all asteroids
      sim.asteroids.length = 0;
      sim.spawnTimer = 0.3; // ready to spawn

      // Run enough updates to spawn several (each spawn resets timer to 0)
      for (let i = 0; i < 100; i++) {
        updateSimulation(sim, 0.05, 800, 600);
      }

      // Should have spawned toward the target
      expect(sim.asteroids.length).toBeGreaterThan(0);
      expect(sim.asteroids.length).toBeLessThanOrEqual(5);
    });

    it('staggers spawning — max 1 new asteroid per 0.3s', () => {
      const sim = createSimulation(800, 600, 20);
      sim.asteroids.length = 0;
      sim.spawnTimer = 0;

      // One update of 0.05s — should not spawn yet (timer < 0.3)
      updateSimulation(sim, 0.05, 800, 600);
      expect(sim.asteroids.length).toBe(0);

      // Advance past the stagger interval
      updateSimulation(sim, 0.3, 800, 600);
      expect(sim.asteroids.length).toBe(1);
    });

    it('detects and resolves collisions between overlapping asteroids', () => {
      const sim = createSimulation(800, 600, 0);
      // Two asteroids heading toward each other, overlapping
      const a = createAsteroid({ x: 100, y: 300, vx: 50, vy: 0, radius: 30 });
      const b = createAsteroid({ x: 120, y: 300, vx: -50, vy: 0, radius: 30 });
      sim.asteroids = [a, b];

      updateSimulation(sim, 0.016, 800, 600);

      // Velocities should have changed due to collision response
      // (they were heading toward each other, now should be bouncing apart)
      expect(a.vx).not.toBe(50);
      expect(b.vx).not.toBe(-50);
    });

    it('separates overlapping asteroids after collision', () => {
      const sim = createSimulation(800, 600, 0);
      const a = createAsteroid({ x: 100, y: 300, vx: 0, vy: 0, radius: 30 });
      const b = createAsteroid({ x: 110, y: 300, vx: 0, vy: 0, radius: 30 });
      sim.asteroids = [a, b];

      updateSimulation(sim, 0.016, 800, 600);

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThanOrEqual(a.collisionRadius + b.collisionRadius - 1e-10);
    });

    it('asteroid count stays near target over time', () => {
      const sim = createSimulation(800, 600, 10);

      // Run for many frames
      for (let i = 0; i < 500; i++) {
        updateSimulation(sim, 0.016, 800, 600);
      }

      // Count should be near target (some may be in transit)
      expect(sim.asteroids.length).toBeGreaterThanOrEqual(5);
      expect(sim.asteroids.length).toBeLessThanOrEqual(15);
    });
  });
});

describe('Increment 12: Energy-Sustaining Spawns — Simulation Integration', () => {

  describe('createSimulation — baseline KE', () => {
    it('records baselineKEPerAsteroid from initial population', () => {
      const sim = createSimulation(800, 600, 20);
      expect(sim).toHaveProperty('baselineKEPerAsteroid');
      expect(sim.baselineKEPerAsteroid).toBeGreaterThan(0);
    });

    it('baselineKEPerAsteroid equals average KE of initial asteroids', () => {
      const sim = createSimulation(800, 600, 20);
      const totalKE = computeTotalKE(sim.asteroids);
      const expectedBaseline = totalKE / sim.asteroids.length;
      expect(sim.baselineKEPerAsteroid).toBeCloseTo(expectedBaseline, 5);
    });
  });

  describe('spawnAsteroidFromEdge — speed multiplier', () => {
    it('accepts an optional speed multiplier', () => {
      // Should not throw
      const a = spawnAsteroidFromEdge(800, 600, 1.5);
      expect(a).toBeDefined();
      expect(a.vx !== undefined && a.vy !== undefined).toBe(true);
    });

    it('default multiplier is 1.0 (no change)', () => {
      // Sample many and compare average speeds with and without multiplier
      let speedsDefault = [];
      let speedsExplicit = [];
      for (let i = 0; i < 200; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        const b = spawnAsteroidFromEdge(800, 600, 1.0);
        speedsDefault.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
        speedsExplicit.push(Math.sqrt(b.vx ** 2 + b.vy ** 2));
      }
      const avgDefault = speedsDefault.reduce((s, v) => s + v, 0) / speedsDefault.length;
      const avgExplicit = speedsExplicit.reduce((s, v) => s + v, 0) / speedsExplicit.length;
      // Averages should be roughly similar (within 20% due to randomness)
      expect(Math.abs(avgDefault - avgExplicit) / avgDefault).toBeLessThan(0.2);
    });

    it('multiplier of 1.5 produces ~1.5x faster asteroids on average', () => {
      let speedsNormal = [];
      let speedsBoosted = [];
      for (let i = 0; i < 300; i++) {
        const a = spawnAsteroidFromEdge(800, 600, 1.0);
        const b = spawnAsteroidFromEdge(800, 600, 1.5);
        speedsNormal.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
        speedsBoosted.push(Math.sqrt(b.vx ** 2 + b.vy ** 2));
      }
      const avgNormal = speedsNormal.reduce((s, v) => s + v, 0) / speedsNormal.length;
      const avgBoosted = speedsBoosted.reduce((s, v) => s + v, 0) / speedsBoosted.length;
      const ratio = avgBoosted / avgNormal;
      // Should be approximately 1.5 (within ±20%)
      expect(ratio).toBeGreaterThan(1.2);
      expect(ratio).toBeLessThan(1.8);
    });
  });

  describe('updateSimulation — energy-sustaining spawns', () => {
    it('replacement spawns use speed boost from energy module', () => {
      // Build simulation with deterministic asteroid positions to avoid
      // random collisions pushing asteroids off-screen during the test.
      const sim = createSimulation(800, 600, 0);
      sim.targetCount = 10;
      sim.baselineKEPerAsteroid = 50000; // high baseline to guarantee boost > 1.0

      // Place 3 slow asteroids well inside the canvas (no overlap, no off-screen risk)
      const a1 = createAsteroid({ x: 200, y: 200, vx: 1, vy: 1, radius: 20 });
      const a2 = createAsteroid({ x: 400, y: 300, vx: 1, vy: 1, radius: 20 });
      const a3 = createAsteroid({ x: 600, y: 400, vx: 1, vy: 1, radius: 20 });
      sim.asteroids = [a1, a2, a3];
      sim.spawnTimer = 0.3; // ready to spawn

      updateSimulation(sim, 0.016, 800, 600);

      // Should have spawned at least one new asteroid
      expect(sim.asteroids.length).toBeGreaterThan(3);
    });

    it('boosted spawns are faster than unboosted spawns on average', () => {
      const sim = createSimulation(800, 600, 20);

      // Collect boosted spawns: keep array empty each iteration to maintain max boost
      const boostedSpeeds = [];
      for (let i = 0; i < 100; i++) {
        sim.asteroids = [];
        sim.spawnTimer = 0.3;
        updateSimulation(sim, 0.016, 800, 600);
        if (sim.asteroids.length > 0) {
          const a = sim.asteroids[0];
          boostedSpeeds.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
        }
      }

      // Spawn normal (unboosted) for comparison
      const normalSpeeds = [];
      for (let i = 0; i < 100; i++) {
        const a = spawnAsteroidFromEdge(800, 600, 1.0);
        normalSpeeds.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
      }

      const avgBoosted = boostedSpeeds.reduce((s, v) => s + v, 0) / boostedSpeeds.length;
      const avgNormal = normalSpeeds.reduce((s, v) => s + v, 0) / normalSpeeds.length;

      // With empty array → boost = 1.5, so boosted should be ~1.5x faster
      expect(avgBoosted).toBeGreaterThan(avgNormal * 1.2);
    });

    it('system KE stays within 80–120% of baseline over a long run', () => {
      const sim = createSimulation(1600, 1200, 20);
      const baselineTotalKE = sim.baselineKEPerAsteroid * sim.targetCount;

      // Warm up for 500 frames to reach steady state
      for (let i = 0; i < 500; i++) {
        updateSimulation(sim, 0.016, 1600, 1200);
      }

      // Sample KE over the next 1000 frames to compute average
      let keSum = 0;
      const sampleCount = 1000;
      for (let i = 0; i < sampleCount; i++) {
        updateSimulation(sim, 0.016, 1600, 1200);
        keSum += computeTotalKE(sim.asteroids);
      }

      const avgKE = keSum / sampleCount;
      const ratio = avgKE / baselineTotalKE;

      expect(ratio).toBeGreaterThanOrEqual(0.8);
      expect(ratio).toBeLessThanOrEqual(1.2);
    });
  });
});
