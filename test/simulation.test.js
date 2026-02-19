import { describe, it, expect } from 'vitest';
import {
  isOffScreen,
  spawnAsteroidFromEdge,
  createSimulation,
  updateSimulation,
} from '../src/simulation.js';
import { createAsteroid } from '../src/asteroid.js';

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
      // Spawn many and check they move toward the canvas center area
      for (let i = 0; i < 50; i++) {
        const a = spawnAsteroidFromEdge(800, 600);
        // After some time, asteroid should be closer to canvas center
        const distBefore = Math.sqrt(
          Math.pow(a.x - 400, 2) + Math.pow(a.y - 300, 2)
        );
        const distAfter = Math.sqrt(
          Math.pow(a.x + a.vx * 2 - 400, 2) + Math.pow(a.y + a.vy * 2 - 300, 2)
        );
        expect(distAfter).toBeLessThan(distBefore);
      }
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
