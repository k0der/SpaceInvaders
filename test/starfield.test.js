import { describe, it, expect } from 'vitest';
import {
  createStar,
  createStarLayer,
  updateStarLayer,
  createParallaxLayers,
  updateParallaxLayers,
  applyTwinkle,
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

    it('two calls produce different stars (randomness)', () => {
      let differ = false;
      for (let i = 0; i < 20; i++) {
        const a = createStar(800, 600);
        const b = createStar(800, 600);
        if (a.x !== b.x || a.y !== b.y) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
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

    it('defaults to speed 10 when no speed option is provided', () => {
      const layer = createStarLayer(5, 800, 600);
      expect(layer.speed).toBe(10);
    });

    it('creates 0 stars when count is 0', () => {
      const layer = createStarLayer(0, 800, 600, { speed: 10 });
      expect(layer.stars.length).toBe(0);
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

    it('does not change y-position for non-wrapping stars', () => {
      const layer = createStarLayer(5, 800, 600, { speed: 10 });
      // Place all stars far from the left edge
      for (const star of layer.stars) {
        star.x = 500;
      }
      const initialYPositions = layer.stars.map(s => s.y);

      updateStarLayer(layer, 0.1, 800, 600); // moves 1px left → still far from edge

      for (let i = 0; i < layer.stars.length; i++) {
        expect(layer.stars[i].y).toBe(initialYPositions[i]);
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

describe('Increment 3: Depth — Parallax Star Layers', () => {

  describe('createParallaxLayers', () => {
    it('creates 3 layers by default', () => {
      const layers = createParallaxLayers(800, 600);
      expect(layers.length).toBe(3);
    });

    it('layers are ordered far → mid → near (slowest to fastest)', () => {
      const layers = createParallaxLayers(800, 600);
      expect(layers[0].speed).toBeLessThan(layers[1].speed);
      expect(layers[1].speed).toBeLessThan(layers[2].speed);
    });

    it('far layer: ~100 stars, 1px size, dim (0.3–0.5), slow (2–5 px/s)', () => {
      const layers = createParallaxLayers(800, 600);
      const far = layers[0];
      // Star count scales with area — base counts are for 1920×1080
      expect(far.stars.length).toBeGreaterThan(0);
      expect(far.speed).toBeGreaterThanOrEqual(2);
      expect(far.speed).toBeLessThanOrEqual(5);
      for (const star of far.stars) {
        expect(star.size).toBeGreaterThanOrEqual(1);
        expect(star.size).toBeLessThanOrEqual(1);
        expect(star.brightness).toBeGreaterThanOrEqual(0.3);
        expect(star.brightness).toBeLessThanOrEqual(0.5);
      }
    });

    it('mid layer: ~60 stars, 1–2px size, medium brightness (0.5–0.7), moderate speed (8–15 px/s)', () => {
      const layers = createParallaxLayers(800, 600);
      const mid = layers[1];
      expect(mid.stars.length).toBeGreaterThan(0);
      expect(mid.speed).toBeGreaterThanOrEqual(8);
      expect(mid.speed).toBeLessThanOrEqual(15);
      for (const star of mid.stars) {
        expect(star.size).toBeGreaterThanOrEqual(1);
        expect(star.size).toBeLessThanOrEqual(2);
        expect(star.brightness).toBeGreaterThanOrEqual(0.5);
        expect(star.brightness).toBeLessThanOrEqual(0.7);
      }
    });

    it('near layer: ~30 stars, 2–3px size, bright (0.7–1.0), fastest (20–35 px/s)', () => {
      const layers = createParallaxLayers(800, 600);
      const near = layers[2];
      expect(near.stars.length).toBeGreaterThan(0);
      expect(near.speed).toBeGreaterThanOrEqual(20);
      expect(near.speed).toBeLessThanOrEqual(35);
      for (const star of near.stars) {
        expect(star.size).toBeGreaterThanOrEqual(2);
        expect(star.size).toBeLessThanOrEqual(3);
        expect(star.brightness).toBeGreaterThanOrEqual(0.7);
        expect(star.brightness).toBeLessThanOrEqual(1.0);
      }
    });

    it('star counts scale proportionally with canvas area', () => {
      const small = createParallaxLayers(400, 300);
      const large = createParallaxLayers(1600, 1200);
      // Larger canvas should have more stars in every layer
      for (let i = 0; i < 3; i++) {
        expect(large[i].stars.length).toBeGreaterThan(small[i].stars.length);
      }
    });

    it('supports custom layer count', () => {
      const layers = createParallaxLayers(800, 600, 5);
      expect(layers.length).toBe(5);
    });

    it('extra layers interpolate properties between far and near', () => {
      const layers = createParallaxLayers(800, 600, 5);
      // Each layer should scroll faster than the previous
      for (let i = 1; i < layers.length; i++) {
        expect(layers[i].speed).toBeGreaterThan(layers[i - 1].speed);
      }
    });

    it('handles layerCount=1 without error', () => {
      const layers = createParallaxLayers(800, 600, 1);
      expect(layers.length).toBe(1);
      expect(layers[0].stars.length).toBeGreaterThan(0);
      expect(layers[0].speed).toBeGreaterThanOrEqual(2);
    });

    it('guarantees at least 1 star per layer on very small canvases', () => {
      const layers = createParallaxLayers(10, 10);
      for (const layer of layers) {
        expect(layer.stars.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('interpolated layers have brightness ranges between far and near', () => {
      const layers = createParallaxLayers(800, 600, 5);
      // Middle layers (index 1,2,3) should have brightness between far and near ranges
      for (let i = 1; i < layers.length - 1; i++) {
        for (const star of layers[i].stars) {
          // Brightness should be somewhere between far min (0.3) and near max (1.0)
          expect(star.brightness).toBeGreaterThanOrEqual(0.3);
          expect(star.brightness).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });

  describe('updateParallaxLayers', () => {
    it('updates all layers', () => {
      const layers = createParallaxLayers(800, 600);
      const initialPositions = layers.map(l => l.stars.map(s => s.x));

      updateParallaxLayers(layers, 0.1, 800, 600);

      for (let i = 0; i < layers.length; i++) {
        for (let j = 0; j < layers[i].stars.length; j++) {
          // Stars should have moved (unless dt was 0 or speed was 0)
          const moved = layers[i].stars[j].x !== initialPositions[i][j];
          expect(moved).toBe(true);
        }
      }
    });

    it('does not move any stars when dt is 0', () => {
      const layers = createParallaxLayers(800, 600);
      const initialPositions = layers.map(l => l.stars.map(s => s.x));

      updateParallaxLayers(layers, 0, 800, 600);

      for (let i = 0; i < layers.length; i++) {
        for (let j = 0; j < layers[i].stars.length; j++) {
          expect(layers[i].stars[j].x).toBe(initialPositions[i][j]);
        }
      }
    });

    it('nearer layers move faster than farther layers', () => {
      const layers = createParallaxLayers(800, 600);
      // Set all stars to the same x so we can compare displacement
      for (const layer of layers) {
        for (const star of layer.stars) {
          star.x = 400;
        }
      }

      updateParallaxLayers(layers, 0.1, 800, 600);

      // Far layer moves least, near layer moves most
      const farX = layers[0].stars[0].x;
      const midX = layers[1].stars[0].x;
      const nearX = layers[2].stars[0].x;
      expect(farX).toBeGreaterThan(midX);
      expect(midX).toBeGreaterThan(nearX);
    });
  });
});

describe('Increment 4: Stars That Twinkle', () => {

  describe('createStar with twinkle options', () => {
    it('assigns twinkle properties when twinkle option is true', () => {
      const star = createStar(800, 600, { twinkle: true });
      expect(star).toHaveProperty('twinklePhase');
      expect(star).toHaveProperty('twinkleFreq');
      expect(star).toHaveProperty('twinkleAmplitude');
    });

    it('does NOT assign twinkle properties when twinkle option is false or absent', () => {
      const star = createStar(800, 600);
      expect(star.twinklePhase).toBeUndefined();
      expect(star.twinkleFreq).toBeUndefined();
      expect(star.twinkleAmplitude).toBeUndefined();
    });

    it('twinkle phase is between 0 and 2*PI', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { twinkle: true });
        expect(star.twinklePhase).toBeGreaterThanOrEqual(0);
        expect(star.twinklePhase).toBeLessThanOrEqual(Math.PI * 2);
      }
    });

    it('twinkle frequency is between 0.5 and 2.0 Hz', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { twinkle: true });
        expect(star.twinkleFreq).toBeGreaterThanOrEqual(0.5);
        expect(star.twinkleFreq).toBeLessThanOrEqual(2.0);
      }
    });

    it('twinkle amplitude is between 10% and 20% of base brightness', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { twinkle: true, minBrightness: 0.5, maxBrightness: 0.5 });
        // amplitude should be 10-20% of base (0.5), so 0.05–0.10
        expect(star.twinkleAmplitude).toBeGreaterThanOrEqual(star.brightness * 0.1);
        expect(star.twinkleAmplitude).toBeLessThanOrEqual(star.brightness * 0.2);
      }
    });

    it('different stars have different twinkle phases (not synchronized)', () => {
      let differ = false;
      for (let i = 0; i < 20; i++) {
        const a = createStar(800, 600, { twinkle: true });
        const b = createStar(800, 600, { twinkle: true });
        if (a.twinklePhase !== b.twinklePhase) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });
  });

  describe('applyTwinkle', () => {
    it('returns base brightness for a star without twinkle properties', () => {
      const star = { brightness: 0.5 };
      expect(applyTwinkle(star, 1.0)).toBe(0.5);
    });

    it('oscillates brightness sinusoidally for a twinkle star', () => {
      const star = {
        brightness: 0.5,
        twinklePhase: 0,
        twinkleFreq: 1.0,
        twinkleAmplitude: 0.1,
      };
      // At time=0: sin(0) = 0, so brightness = 0.5
      expect(applyTwinkle(star, 0)).toBeCloseTo(0.5, 5);
      // At time where sin peaks (t=0.25 for 1Hz → 2*PI*0.25 = PI/2, sin=1): brightness = 0.6
      expect(applyTwinkle(star, 0.25)).toBeCloseTo(0.6, 5);
      // At time where sin troughs (t=0.75 for 1Hz → 2*PI*0.75 = 3PI/2, sin=-1): brightness = 0.4
      expect(applyTwinkle(star, 0.75)).toBeCloseTo(0.4, 5);
    });

    it('respects the phase offset', () => {
      const star = {
        brightness: 0.5,
        twinklePhase: Math.PI / 2, // offset by quarter cycle
        twinkleFreq: 1.0,
        twinkleAmplitude: 0.1,
      };
      // At time=0: sin(PI/2) = 1, so brightness = 0.5 + 0.1 = 0.6
      expect(applyTwinkle(star, 0)).toBeCloseTo(0.6, 5);
    });

    it('clamps brightness to [0, 1.0]', () => {
      const starHigh = {
        brightness: 0.95,
        twinklePhase: 0,
        twinkleFreq: 1.0,
        twinkleAmplitude: 0.1,
      };
      // Peak would be 1.05, should clamp to 1.0
      expect(applyTwinkle(starHigh, 0.25)).toBe(1.0);

      const starLow = {
        brightness: 0.05,
        twinklePhase: 0,
        twinkleFreq: 1.0,
        twinkleAmplitude: 0.1,
      };
      // Trough would be -0.05, should clamp to 0
      expect(applyTwinkle(starLow, 0.75)).toBe(0);
    });
  });

  describe('createParallaxLayers with twinkle', () => {
    it('far layer stars have twinkle properties', () => {
      const layers = createParallaxLayers(800, 600);
      const far = layers[0];
      for (const star of far.stars) {
        expect(star).toHaveProperty('twinklePhase');
        expect(star).toHaveProperty('twinkleFreq');
        expect(star).toHaveProperty('twinkleAmplitude');
      }
    });

    it('mid layer stars have twinkle properties', () => {
      const layers = createParallaxLayers(800, 600);
      const mid = layers[1];
      for (const star of mid.stars) {
        expect(star).toHaveProperty('twinklePhase');
        expect(star).toHaveProperty('twinkleFreq');
        expect(star).toHaveProperty('twinkleAmplitude');
      }
    });

    it('near layer stars do NOT have twinkle properties', () => {
      const layers = createParallaxLayers(800, 600);
      const near = layers[2];
      for (const star of near.stars) {
        expect(star.twinklePhase).toBeUndefined();
        expect(star.twinkleFreq).toBeUndefined();
        expect(star.twinkleAmplitude).toBeUndefined();
      }
    });
  });
});
