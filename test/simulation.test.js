import { describe, expect, it } from 'vitest';
import { createAsteroid } from '../src/asteroid.js';
import { computeTotalKE } from '../src/energy.js';
import {
  computeEdgeWeights,
  computeSpawnBounds,
  createSimulation,
  isOutsideZone,
  pickWeightedEdge,
  spawnAsteroidInBorder,
  spawnAsteroidInZone,
  updateSimulation,
} from '../src/simulation.js';

const VIEWPORT_BOUNDS = { minX: 0, maxX: 800, minY: 0, maxY: 600 };
const SHIFTED_BOUNDS = { minX: 500, maxX: 1300, minY: 200, maxY: 800 };

describe('Increment 21b: Border-Zone Asteroid Spawning', () => {
  describe('computeSpawnBounds', () => {
    it('expands each side by SPAWN_BORDER (300px)', () => {
      const sb = computeSpawnBounds(VIEWPORT_BOUNDS);
      expect(sb.minX).toBe(VIEWPORT_BOUNDS.minX - 300);
      expect(sb.maxX).toBe(VIEWPORT_BOUNDS.maxX + 300);
      expect(sb.minY).toBe(VIEWPORT_BOUNDS.minY - 300);
      expect(sb.maxY).toBe(VIEWPORT_BOUNDS.maxY + 300);
    });

    it('works with non-origin bounds', () => {
      const sb = computeSpawnBounds(SHIFTED_BOUNDS);
      expect(sb.minX).toBe(200);
      expect(sb.maxX).toBe(1600);
      expect(sb.minY).toBe(-100);
      expect(sb.maxY).toBe(1100);
    });
  });

  describe('computeEdgeWeights', () => {
    it('stationary (0, 0): all four weights ≈ 0.25', () => {
      const w = computeEdgeWeights(0, 0);
      expect(w.length).toBe(4);
      for (const weight of w) {
        expect(weight).toBeCloseTo(0.25, 5);
      }
    });

    it('flying right (400, 0): right edge weight is largest', () => {
      const w = computeEdgeWeights(400, 0);
      // right is index 1
      const maxWeight = Math.max(...w);
      expect(w[1]).toBe(maxWeight);
      expect(w[1]).toBeGreaterThan(0.5);
    });

    it('flying left (-400, 0): left edge weight is largest', () => {
      const w = computeEdgeWeights(-400, 0);
      // left is index 0
      const maxWeight = Math.max(...w);
      expect(w[0]).toBe(maxWeight);
    });

    it('flying up (0, -400): top edge weight is largest', () => {
      const w = computeEdgeWeights(0, -400);
      // top is index 2
      const maxWeight = Math.max(...w);
      expect(w[2]).toBe(maxWeight);
    });

    it('flying down (0, 400): bottom edge weight is largest', () => {
      const w = computeEdgeWeights(0, 400);
      // bottom is index 3
      const maxWeight = Math.max(...w);
      expect(w[3]).toBe(maxWeight);
    });

    it('flying diagonally (400, 400): right and bottom edges share bias', () => {
      const w = computeEdgeWeights(400, 400);
      // right (1) and bottom (3) should be the two largest
      expect(w[1]).toBeGreaterThan(w[0]);
      expect(w[3]).toBeGreaterThan(w[2]);
    });

    it('weights always sum to 1.0', () => {
      const cases = [
        [0, 0],
        [400, 0],
        [-200, 300],
        [100, -100],
        [0, -400],
      ];
      for (const [vx, vy] of cases) {
        const w = computeEdgeWeights(vx, vy);
        const sum = w.reduce((s, v) => s + v, 0);
        expect(sum).toBeCloseTo(1.0, 10);
      }
    });

    it('no weight is ever 0', () => {
      const w = computeEdgeWeights(400, 0);
      for (const weight of w) {
        expect(weight).toBeGreaterThan(0);
      }
    });
  });

  describe('pickWeightedEdge', () => {
    it('uniform weights: roughly equal distribution over 1000 calls', () => {
      const weights = [0.25, 0.25, 0.25, 0.25];
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 1000; i++) {
        counts[pickWeightedEdge(weights)]++;
      }
      for (const c of counts) {
        expect(c).toBeGreaterThan(150);
        expect(c).toBeLessThan(350);
      }
    });

    it('heavy bias: dominant edge selected >80% over 1000 calls', () => {
      const weights = [0.01, 0.97, 0.01, 0.01];
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 1000; i++) {
        counts[pickWeightedEdge(weights)]++;
      }
      expect(counts[1]).toBeGreaterThan(800);
    });

    it('always returns 0-3', () => {
      const weights = [0.1, 0.4, 0.3, 0.2];
      for (let i = 0; i < 100; i++) {
        const edge = pickWeightedEdge(weights);
        expect(edge).toBeGreaterThanOrEqual(0);
        expect(edge).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('isOutsideZone', () => {
    const spawnBounds = computeSpawnBounds(VIEWPORT_BOUNDS);

    it('asteroid inside viewport → false', () => {
      const a = createAsteroid({
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(false);
    });

    it('asteroid in border ring → false', () => {
      const a = createAsteroid({
        x: -100,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(false);
    });

    it('asteroid past left spawn bound → true', () => {
      const a = createAsteroid({
        x: -340,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(true);
    });

    it('asteroid past right spawn bound → true', () => {
      const a = createAsteroid({
        x: 1140,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(true);
    });

    it('asteroid past top spawn bound → true', () => {
      const a = createAsteroid({
        x: 400,
        y: -340,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(true);
    });

    it('asteroid past bottom spawn bound → true', () => {
      const a = createAsteroid({
        x: 400,
        y: 940,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(true);
    });

    it('recycle margin hysteresis: just inside margin is still in zone', () => {
      // spawnBounds.maxX = 1100, radius=30, RECYCLE_MARGIN=5
      // x - radius - margin = 1134 - 30 - 5 = 1099 < 1100 → NOT outside
      const a = createAsteroid({
        x: 1134,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(false);
    });

    it('recycle margin hysteresis: just past margin is outside zone', () => {
      // x - radius - margin = 1136 - 30 - 5 = 1101 > 1100 → outside
      const a = createAsteroid({
        x: 1136,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(a, spawnBounds)).toBe(true);
    });

    it('works with non-origin bounds', () => {
      const shiftedSpawnBounds = computeSpawnBounds(SHIFTED_BOUNDS);
      const inside = createAsteroid({
        x: 900,
        y: 500,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(inside, shiftedSpawnBounds)).toBe(false);

      const outside = createAsteroid({
        x: -200,
        y: 500,
        vx: 0,
        vy: 0,
        radius: 30,
      });
      expect(isOutsideZone(outside, shiftedSpawnBounds)).toBe(true);
    });
  });

  describe('spawnAsteroidInBorder', () => {
    const spawnBounds = computeSpawnBounds(VIEWPORT_BOUNDS);
    const uniformWeights = [0.25, 0.25, 0.25, 0.25];

    it('position is OUTSIDE viewport bounds (never in viewport)', () => {
      for (let i = 0; i < 100; i++) {
        const a = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          uniformWeights,
          1.0,
        );
        const insideViewport =
          a.x > VIEWPORT_BOUNDS.minX &&
          a.x < VIEWPORT_BOUNDS.maxX &&
          a.y > VIEWPORT_BOUNDS.minY &&
          a.y < VIEWPORT_BOUNDS.maxY;
        expect(insideViewport).toBe(false);
      }
    });

    it('position is INSIDE spawn bounds', () => {
      for (let i = 0; i < 100; i++) {
        const a = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          uniformWeights,
          1.0,
        );
        expect(a.x).toBeGreaterThanOrEqual(spawnBounds.minX - a.radius);
        expect(a.x).toBeLessThanOrEqual(spawnBounds.maxX + a.radius);
        expect(a.y).toBeGreaterThanOrEqual(spawnBounds.minY - a.radius);
        expect(a.y).toBeLessThanOrEqual(spawnBounds.maxY + a.radius);
      }
    });

    it('velocity aims roughly inward (>90% move closer to viewport center after 2s)', () => {
      const centerX = (VIEWPORT_BOUNDS.minX + VIEWPORT_BOUNDS.maxX) / 2;
      const centerY = (VIEWPORT_BOUNDS.minY + VIEWPORT_BOUNDS.maxY) / 2;
      let inwardCount = 0;
      const total = 200;
      for (let i = 0; i < total; i++) {
        const a = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          uniformWeights,
          1.0,
        );
        const distBefore = Math.sqrt(
          (a.x - centerX) ** 2 + (a.y - centerY) ** 2,
        );
        const distAfter = Math.sqrt(
          (a.x + a.vx * 2 - centerX) ** 2 + (a.y + a.vy * 2 - centerY) ** 2,
        );
        if (distAfter < distBefore) inwardCount++;
      }
      expect(inwardCount / total).toBeGreaterThan(0.9);
    });

    it('speed multiplier applied', () => {
      const speedsNormal = [];
      const speedsBoosted = [];
      for (let i = 0; i < 200; i++) {
        const a = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          uniformWeights,
          1.0,
        );
        const b = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          uniformWeights,
          1.5,
        );
        speedsNormal.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
        speedsBoosted.push(Math.sqrt(b.vx ** 2 + b.vy ** 2));
      }
      const avgNormal =
        speedsNormal.reduce((s, v) => s + v, 0) / speedsNormal.length;
      const avgBoosted =
        speedsBoosted.reduce((s, v) => s + v, 0) / speedsBoosted.length;
      const ratio = avgBoosted / avgNormal;
      expect(ratio).toBeGreaterThan(1.2);
      expect(ratio).toBeLessThan(1.8);
    });

    it('over many calls with biased weights, spawns more from expected edge', () => {
      const rightBiasWeights = [0.05, 0.8, 0.05, 0.1];
      let rightEdgeCount = 0;
      const total = 500;
      for (let i = 0; i < total; i++) {
        const a = spawnAsteroidInBorder(
          VIEWPORT_BOUNDS,
          spawnBounds,
          rightBiasWeights,
          1.0,
        );
        // Right edge: x > viewport maxX
        if (a.x >= VIEWPORT_BOUNDS.maxX) rightEdgeCount++;
      }
      expect(rightEdgeCount / total).toBeGreaterThan(0.6);
    });
  });

  describe('spawnAsteroidInZone', () => {
    const spawnBounds = computeSpawnBounds(VIEWPORT_BOUNDS);

    it('position within spawn bounds', () => {
      for (let i = 0; i < 50; i++) {
        const a = spawnAsteroidInZone(spawnBounds);
        expect(a.x).toBeGreaterThanOrEqual(spawnBounds.minX);
        expect(a.x).toBeLessThanOrEqual(spawnBounds.maxX);
        expect(a.y).toBeGreaterThanOrEqual(spawnBounds.minY);
        expect(a.y).toBeLessThanOrEqual(spawnBounds.maxY);
      }
    });

    it('random direction, non-zero velocity', () => {
      for (let i = 0; i < 20; i++) {
        const a = spawnAsteroidInZone(spawnBounds);
        const speed = Math.sqrt(a.vx ** 2 + a.vy ** 2);
        expect(speed).toBeGreaterThan(0);
      }
    });

    it('speed multiplier respected', () => {
      const speedsNormal = [];
      const speedsBoosted = [];
      for (let i = 0; i < 200; i++) {
        const a = spawnAsteroidInZone(spawnBounds, 1.0);
        const b = spawnAsteroidInZone(spawnBounds, 1.5);
        speedsNormal.push(Math.sqrt(a.vx ** 2 + a.vy ** 2));
        speedsBoosted.push(Math.sqrt(b.vx ** 2 + b.vy ** 2));
      }
      const avgNormal =
        speedsNormal.reduce((s, v) => s + v, 0) / speedsNormal.length;
      const avgBoosted =
        speedsBoosted.reduce((s, v) => s + v, 0) / speedsBoosted.length;
      const ratio = avgBoosted / avgNormal;
      expect(ratio).toBeGreaterThan(1.2);
      expect(ratio).toBeLessThan(1.8);
    });
  });

  describe('createSimulation', () => {
    it('creates targetCount asteroids within the full zone', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 30);
      expect(sim.asteroids.length).toBe(30);
      expect(sim.targetCount).toBe(30);
    });

    it('some asteroids are within viewport bounds (immediate visibility)', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 40);
      const insideViewport = sim.asteroids.filter(
        (a) =>
          a.x >= VIEWPORT_BOUNDS.minX &&
          a.x <= VIEWPORT_BOUNDS.maxX &&
          a.y >= VIEWPORT_BOUNDS.minY &&
          a.y <= VIEWPORT_BOUNDS.maxY,
      );
      expect(insideViewport.length).toBeGreaterThan(0);
    });

    it('has baselineKEPerAsteroid', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 20);
      expect(sim).toHaveProperty('baselineKEPerAsteroid');
      expect(sim.baselineKEPerAsteroid).toBeGreaterThan(0);
    });

    it('baselineKEPerAsteroid equals average KE of initial asteroids', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 20);
      const totalKE = computeTotalKE(sim.asteroids);
      const expectedBaseline = totalKE / sim.asteroids.length;
      expect(sim.baselineKEPerAsteroid).toBeCloseTo(expectedBaseline, 5);
    });

    it('defaults to 20 asteroids', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS);
      expect(sim.targetCount).toBe(20);
    });

    it('has no spawnTimer property', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS);
      expect(sim).not.toHaveProperty('spawnTimer');
    });
  });

  describe('updateSimulation', () => {
    it('moves asteroids', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 5);
      const positions = sim.asteroids.map((a) => ({ x: a.x, y: a.y }));

      updateSimulation(sim, 0.1, VIEWPORT_BOUNDS, 0, 0);

      let anyMoved = false;
      for (let i = 0; i < sim.asteroids.length; i++) {
        if (
          sim.asteroids[i].x !== positions[i].x ||
          sim.asteroids[i].y !== positions[i].y
        ) {
          anyMoved = true;
          break;
        }
      }
      expect(anyMoved).toBe(true);
    });

    it('removes asteroids outside spawn bounds (aggressive recycling)', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 0);
      const farAway = createAsteroid({
        x: -500,
        y: -500,
        vx: -10,
        vy: -10,
        radius: 20,
      });
      sim.asteroids.push(farAway);

      updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 0, 0);

      expect(sim.asteroids.length).toBe(0);
    });

    it('spawns in border when below target (not inside viewport)', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 0);
      sim.targetCount = 20;
      sim.asteroids = [];

      updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 0, 0);

      // Should have spawned some asteroids
      expect(sim.asteroids.length).toBeGreaterThan(0);
      // Spawned asteroids should be in the border ring, not inside viewport
      for (const a of sim.asteroids) {
        const insideViewport =
          a.x > VIEWPORT_BOUNDS.minX + a.radius &&
          a.x < VIEWPORT_BOUNDS.maxX - a.radius &&
          a.y > VIEWPORT_BOUNDS.minY + a.radius &&
          a.y < VIEWPORT_BOUNDS.maxY - a.radius;
        expect(insideViewport).toBe(false);
      }
    });

    it('spawns up to MAX_SPAWN_PER_FRAME (10) per frame', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 0);
      sim.targetCount = 50;
      sim.asteroids = [];

      updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 0, 0);

      expect(sim.asteroids.length).toBeLessThanOrEqual(10);
      expect(sim.asteroids.length).toBeGreaterThan(0);
    });

    it('direction bias: more spawns ahead of movement', () => {
      let rightEdgeCount = 0;
      let leftEdgeCount = 0;
      const total = 500;

      for (let i = 0; i < total; i++) {
        const sim = createSimulation(VIEWPORT_BOUNDS, 0);
        sim.targetCount = 1;
        sim.asteroids = [];

        // Ship flying right at 400 px/s
        updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 400, 0);

        if (sim.asteroids.length > 0) {
          const a = sim.asteroids[0];
          if (a.x >= VIEWPORT_BOUNDS.maxX) rightEdgeCount++;
          if (a.x <= VIEWPORT_BOUNDS.minX) leftEdgeCount++;
        }
      }

      // Right edge should dominate
      expect(rightEdgeCount).toBeGreaterThan(leftEdgeCount * 2);
    });

    it('detects and resolves collisions', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 0);
      const a = createAsteroid({ x: 100, y: 300, vx: 50, vy: 0, radius: 30 });
      const b = createAsteroid({
        x: 120,
        y: 300,
        vx: -50,
        vy: 0,
        radius: 30,
      });
      sim.asteroids = [a, b];

      updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 0, 0);

      expect(a.vx).not.toBe(50);
      expect(b.vx).not.toBe(-50);
    });

    it('energy homeostasis boost applied to spawn speeds', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 0);
      sim.targetCount = 10;
      sim.baselineKEPerAsteroid = 50000;

      const a1 = createAsteroid({
        x: 200,
        y: 200,
        vx: 1,
        vy: 1,
        radius: 20,
      });
      const a2 = createAsteroid({
        x: 400,
        y: 300,
        vx: 1,
        vy: 1,
        radius: 20,
      });
      sim.asteroids = [a1, a2];

      updateSimulation(sim, 0.016, VIEWPORT_BOUNDS, 0, 0);

      expect(sim.asteroids.length).toBeGreaterThan(2);
    });
  });

  describe('integration: flight simulation', () => {
    it('asteroid count stays within 50-150% of target during 300 frames of flight', () => {
      const sim = createSimulation(VIEWPORT_BOUNDS, 40);
      let minCount = sim.asteroids.length;
      let maxCount = sim.asteroids.length;
      const target = 40;

      // Simulate 300 frames of rightward flight
      let currentBounds = { ...VIEWPORT_BOUNDS };
      for (let i = 0; i < 300; i++) {
        const dt = 0.016;
        const shipVx = 400;
        // Shift viewport as if ship is flying right
        currentBounds = {
          minX: currentBounds.minX + shipVx * dt,
          maxX: currentBounds.maxX + shipVx * dt,
          minY: currentBounds.minY,
          maxY: currentBounds.maxY,
        };

        updateSimulation(sim, dt, currentBounds, shipVx, 0);

        minCount = Math.min(minCount, sim.asteroids.length);
        maxCount = Math.max(maxCount, sim.asteroids.length);
      }

      expect(minCount).toBeGreaterThanOrEqual(target * 0.5);
      expect(maxCount).toBeLessThanOrEqual(target * 1.5);
    });
  });
});
