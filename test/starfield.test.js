import { describe, it, expect } from 'vitest';
import {
  createStar,
  createStarLayer,
  updateStarLayer,
} from '../src/starfield.js';

describe('Increment 2: A Single Star Drifts Across the Void', () => {

  describe('createStar', () => {
    it('creates a star with x, y, size, and brightness properties', () => {
      const star = createStar(800, 600);
      expect(star).toHaveProperty('x');
      expect(star).toHaveProperty('y');
      expect(star).toHaveProperty('size');
      expect(star).toHaveProperty('brightness');
    });

    it('places the star within the given canvas dimensions', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600);
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(800);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(600);
      }
    });

    it('assigns a size between 1 and 2 pixels by default', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600);
        expect(star.size).toBeGreaterThanOrEqual(1);
        expect(star.size).toBeLessThanOrEqual(2);
      }
    });

    it('assigns a brightness (alpha) between 0.3 and 1.0', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600);
        expect(star.brightness).toBeGreaterThanOrEqual(0.3);
        expect(star.brightness).toBeLessThanOrEqual(1.0);
      }
    });

    it('respects custom size range', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { minSize: 2, maxSize: 3 });
        expect(star.size).toBeGreaterThanOrEqual(2);
        expect(star.size).toBeLessThanOrEqual(3);
      }
    });

    it('respects custom brightness range', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { minBrightness: 0.5, maxBrightness: 0.7 });
        expect(star.brightness).toBeGreaterThanOrEqual(0.5);
        expect(star.brightness).toBeLessThanOrEqual(0.7);
      }
    });
  });

  describe('createStarLayer', () => {
    it('creates approximately the requested number of stars', () => {
      const layer = createStarLayer(80, 800, 600, { speed: 10 });
      expect(layer.stars.length).toBe(80);
    });

    it('stores the scroll speed on the layer', () => {
      const layer = createStarLayer(80, 800, 600, { speed: 10 });
      expect(layer.speed).toBe(10);
    });

    it('all stars are within canvas bounds', () => {
      const layer = createStarLayer(80, 800, 600, { speed: 10 });
      for (const star of layer.stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(800);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(600);
      }
    });

    it('passes size and brightness options to stars', () => {
      const layer = createStarLayer(50, 800, 600, {
        speed: 10,
        minSize: 2,
        maxSize: 3,
        minBrightness: 0.7,
        maxBrightness: 1.0,
      });
      for (const star of layer.stars) {
        expect(star.size).toBeGreaterThanOrEqual(2);
        expect(star.size).toBeLessThanOrEqual(3);
        expect(star.brightness).toBeGreaterThanOrEqual(0.7);
        expect(star.brightness).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('updateStarLayer', () => {
    it('moves stars leftward by speed * dt', () => {
      const layer = createStarLayer(5, 800, 600, { speed: 100 });
      const initialXPositions = layer.stars.map(s => s.x);

      updateStarLayer(layer, 0.1, 800, 600);

      for (let i = 0; i < layer.stars.length; i++) {
        expect(layer.stars[i].x).toBeCloseTo(initialXPositions[i] - 10, 1);
      }
    });

    it('does not move stars when dt is 0', () => {
      const layer = createStarLayer(5, 800, 600, { speed: 100 });
      const initialXPositions = layer.stars.map(s => s.x);

      updateStarLayer(layer, 0, 800, 600);

      for (let i = 0; i < layer.stars.length; i++) {
        expect(layer.stars[i].x).toBe(initialXPositions[i]);
      }
    });

    it('wraps stars that exit the left edge to the right edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      // Place star near the left edge
      layer.stars[0].x = 5;

      updateStarLayer(layer, 0.1, 800, 600); // moves 10px left → x = -5

      // Star should have wrapped to right side
      expect(layer.stars[0].x).toBeGreaterThan(790);
    });

    it('assigns a new random y-position when a star wraps', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 2;
      const oldY = layer.stars[0].y;

      // Run many wraps to check y changes (probabilistically)
      let yChanged = false;
      for (let i = 0; i < 20; i++) {
        layer.stars[0].x = 2;
        updateStarLayer(layer, 0.1, 800, 600);
        if (layer.stars[0].y !== oldY) {
          yChanged = true;
          break;
        }
      }
      expect(yChanged).toBe(true);
    });

    it('wrapped star y is within canvas bounds', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 2;

      updateStarLayer(layer, 0.1, 800, 600);

      expect(layer.stars[0].y).toBeGreaterThanOrEqual(0);
      expect(layer.stars[0].y).toBeLessThanOrEqual(600);
    });

    it('star count remains constant after updates', () => {
      const layer = createStarLayer(80, 800, 600, { speed: 50 });

      for (let i = 0; i < 100; i++) {
        updateStarLayer(layer, 0.016, 800, 600);
      }

      expect(layer.stars.length).toBe(80);
    });
  });
});
