import { describe, it, expect, vi } from 'vitest';
import {
  createStar,
  createStarLayer,
  updateStarLayer,
  createParallaxLayers,
  updateParallaxLayers,
  applyTwinkle,
  drawParallaxLayers,
  drawStarLayer,
  updateStarLayerDirectional,
  redistributeStars,
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
      // Place all stars far from the left edge to avoid wrapping interference
      for (const star of layer.stars) {
        star.x = 400;
      }
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

  describe('drawParallaxLayers', () => {
    it('draws layers back-to-front (far first, near last)', () => {
      const layers = createParallaxLayers(800, 600);
      const drawOrder = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => {
          drawOrder.push(fakeCtx.fillStyle);
        }),
      };
      // Give each layer a unique brightness and remove twinkle so brightness is deterministic
      layers[0].stars.forEach(s => { s.brightness = 0.3; delete s.twinklePhase; delete s.twinkleFreq; delete s.twinkleAmplitude; });
      layers[1].stars.forEach(s => { s.brightness = 0.6; delete s.twinklePhase; delete s.twinkleFreq; delete s.twinkleAmplitude; });
      layers[2].stars.forEach(s => { s.brightness = 0.9; delete s.twinklePhase; delete s.twinkleFreq; delete s.twinkleAmplitude; });

      drawParallaxLayers(fakeCtx, layers);

      // Far layer (0.3) draws should come before mid (0.6), which come before near (0.9)
      const farEnd = drawOrder.lastIndexOf('rgba(255, 255, 255, 0.3)');
      const midStart = drawOrder.indexOf('rgba(255, 255, 255, 0.6)');
      const midEnd = drawOrder.lastIndexOf('rgba(255, 255, 255, 0.6)');
      const nearStart = drawOrder.indexOf('rgba(255, 255, 255, 0.9)');
      expect(farEnd).toBeLessThan(midStart);
      expect(midEnd).toBeLessThan(nearStart);
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

    it('twinkle frequency is between 0.3 and 3.0 Hz', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { twinkle: true });
        expect(star.twinkleFreq).toBeGreaterThanOrEqual(0.3);
        expect(star.twinkleFreq).toBeLessThanOrEqual(3.0);
      }
    });

    it('twinkle frequency range spans beyond the old 0.5–2.0 range', () => {
      let belowOldMin = false;
      let aboveOldMax = false;
      for (let i = 0; i < 200; i++) {
        const star = createStar(800, 600, { twinkle: true });
        if (star.twinkleFreq < 0.5) belowOldMin = true;
        if (star.twinkleFreq > 2.0) aboveOldMax = true;
      }
      expect(belowOldMin).toBe(true);
      expect(aboveOldMax).toBe(true);
    });

    it('twinkle amplitude is between 10% and 30% of base brightness', () => {
      for (let i = 0; i < 50; i++) {
        const star = createStar(800, 600, { twinkle: true, minBrightness: 0.5, maxBrightness: 0.5 });
        expect(star.twinkleAmplitude).toBeGreaterThanOrEqual(star.brightness * 0.1);
        expect(star.twinkleAmplitude).toBeLessThanOrEqual(star.brightness * 0.3);
      }
    });

    it('twinkle amplitude range spans beyond the old 10–20% range', () => {
      let aboveOldMax = false;
      for (let i = 0; i < 200; i++) {
        const star = createStar(800, 600, { twinkle: true, minBrightness: 0.5, maxBrightness: 0.5 });
        if (star.twinkleAmplitude > star.brightness * 0.2) aboveOldMax = true;
      }
      expect(aboveOldMax).toBe(true);
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

    it('at any given time, stars have visibly different brightness levels (no sync)', () => {
      // Create 50 twinkle stars with same base brightness
      const stars = [];
      for (let i = 0; i < 50; i++) {
        stars.push(createStar(800, 600, { twinkle: true, minBrightness: 0.5, maxBrightness: 0.5 }));
      }
      // Sample at an arbitrary time — brightness values should have meaningful spread
      const brightnesses = stars.map(s => applyTwinkle(s, 1.0));
      const min = Math.min(...brightnesses);
      const max = Math.max(...brightnesses);
      // Spread should be significant (at least 0.1 range among 50 stars)
      expect(max - min).toBeGreaterThan(0.1);
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

  describe('drawStarLayer with twinkle', () => {
    it('uses twinkle-adjusted brightness at render time, not base brightness', () => {
      const layer = createStarLayer(1, 800, 600, {
        speed: 10,
        twinkle: true,
        minBrightness: 0.5,
        maxBrightness: 0.5,
      });
      const star = layer.stars[0];
      // Force known twinkle params: at t=0.25 with freq=1, phase=0, sin peaks → brightness = 0.5 + amp
      star.twinklePhase = 0;
      star.twinkleFreq = 1.0;
      star.twinkleAmplitude = 0.1;

      const fillStyles = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => { fillStyles.push(fakeCtx.fillStyle); }),
      };

      // Draw at elapsed=0 → sin(0)=0 → brightness 0.5
      drawStarLayer(fakeCtx, layer, 0);
      expect(fillStyles[0]).toBe('rgba(255, 255, 255, 0.5)');

      // Draw at elapsed=0.25 → sin(PI/2)=1 → brightness 0.6
      drawStarLayer(fakeCtx, layer, 0.25);
      expect(fillStyles[1]).toBe('rgba(255, 255, 255, 0.6)');
    });

    it('renders stars at sub-pixel coordinates (no rounding) for smooth movement', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 10 });
      // Set star to a fractional position
      layer.stars[0].x = 100.7;
      layer.stars[0].y = 200.3;

      const coords = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn((x, y) => { coords.push({ x, y }); }),
      };

      drawStarLayer(fakeCtx, layer, 0);

      // Should preserve fractional coordinates, not round to 101/200
      expect(coords[0].x).toBe(100.7);
      expect(coords[0].y).toBe(200.3);
    });

    it('applies radialBrightness as multiplier when present on star', () => {
      const layer = createStarLayer(1, 800, 600, {
        speed: 10,
        minBrightness: 0.8,
        maxBrightness: 0.8,
      });
      layer.stars[0].radialBrightness = 0.5;

      const fillStyles = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => { fillStyles.push(fakeCtx.fillStyle); }),
      };

      drawStarLayer(fakeCtx, layer, 0);
      // 0.8 * 0.5 = 0.4
      expect(fillStyles[0]).toBe('rgba(255, 255, 255, 0.4)');
    });

    it('does not affect brightness when radialBrightness is absent', () => {
      const layer = createStarLayer(1, 800, 600, {
        speed: 10,
        minBrightness: 0.8,
        maxBrightness: 0.8,
      });
      // No radialBrightness set

      const fillStyles = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => { fillStyles.push(fakeCtx.fillStyle); }),
      };

      drawStarLayer(fakeCtx, layer, 0);
      expect(fillStyles[0]).toBe('rgba(255, 255, 255, 0.8)');
    });

    it('renders non-twinkle stars with constant base brightness regardless of elapsed time', () => {
      const layer = createStarLayer(1, 800, 600, {
        speed: 10,
        minBrightness: 0.7,
        maxBrightness: 0.7,
      });

      const fillStyles = [];
      const fakeCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => { fillStyles.push(fakeCtx.fillStyle); }),
      };

      drawStarLayer(fakeCtx, layer, 0);
      drawStarLayer(fakeCtx, layer, 5.0);
      drawStarLayer(fakeCtx, layer, 100.0);

      // All renders should use the same base brightness
      expect(fillStyles[0]).toBe(fillStyles[1]);
      expect(fillStyles[1]).toBe(fillStyles[2]);
    });
  });
});

describe('Increment 15: Star Field Direction', () => {

  describe('updateStarLayerDirectional — left (default)', () => {
    it('moves stars leftward by speed * dt', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = 300;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'left');
      expect(layer.stars[0].x).toBeCloseTo(390, 1);
      expect(layer.stars[0].y).toBe(300);
    });

    it('wraps stars exiting left edge to right edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 5;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'left');
      expect(layer.stars[0].x).toBeGreaterThan(790);
    });
  });

  describe('updateStarLayerDirectional — right', () => {
    it('moves stars rightward by speed * dt', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = 300;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'right');
      expect(layer.stars[0].x).toBeCloseTo(410, 1);
      expect(layer.stars[0].y).toBe(300);
    });

    it('wraps stars exiting right edge to left edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 795;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'right');
      expect(layer.stars[0].x).toBeLessThan(10);
    });

    it('assigns new random y when wrapping', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      let yChanged = false;
      for (let i = 0; i < 20; i++) {
        layer.stars[0].x = 799;
        const oldY = layer.stars[0].y;
        updateStarLayerDirectional(layer, 0.1, 800, 600, 'right');
        if (layer.stars[0].y !== oldY) yChanged = true;
      }
      expect(yChanged).toBe(true);
    });
  });

  describe('updateStarLayerDirectional — up', () => {
    it('moves stars upward by speed * dt', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = 300;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'up');
      expect(layer.stars[0].y).toBeCloseTo(290, 1);
      expect(layer.stars[0].x).toBe(400);
    });

    it('wraps stars exiting top edge to bottom edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].y = 5;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'up');
      expect(layer.stars[0].y).toBeGreaterThan(590);
    });

    it('assigns new random x when wrapping', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      let xChanged = false;
      for (let i = 0; i < 20; i++) {
        layer.stars[0].y = 1;
        const oldX = layer.stars[0].x;
        updateStarLayerDirectional(layer, 0.1, 800, 600, 'up');
        if (layer.stars[0].x !== oldX) xChanged = true;
      }
      expect(xChanged).toBe(true);
    });
  });

  describe('updateStarLayerDirectional — down', () => {
    it('moves stars downward by speed * dt', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = 300;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'down');
      expect(layer.stars[0].y).toBeCloseTo(310, 1);
      expect(layer.stars[0].x).toBe(400);
    });

    it('wraps stars exiting bottom edge to top edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].y = 595;
      updateStarLayerDirectional(layer, 0.1, 800, 600, 'down');
      expect(layer.stars[0].y).toBeLessThan(10);
    });
  });

  describe('updateStarLayerDirectional — radial', () => {
    it('moves stars outward from center', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      // Place star to the right of center
      layer.stars[0].x = 500;
      layer.stars[0].y = 300;
      const cx = 400, cy = 300;
      const distBefore = Math.hypot(layer.stars[0].x - cx, layer.stars[0].y - cy);

      updateStarLayerDirectional(layer, 0.1, 800, 600, 'radial');

      const distAfter = Math.hypot(layer.stars[0].x - cx, layer.stars[0].y - cy);
      expect(distAfter).toBeGreaterThan(distBefore);
    });

    it('preserves the angle from center as star moves outward', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 500;
      layer.stars[0].y = 400;
      const cx = 400, cy = 300;
      const angleBefore = Math.atan2(layer.stars[0].y - cy, layer.stars[0].x - cx);

      updateStarLayerDirectional(layer, 0.1, 800, 600, 'radial');

      const angleAfter = Math.atan2(layer.stars[0].y - cy, layer.stars[0].x - cx);
      expect(angleAfter).toBeCloseTo(angleBefore, 3);
    });

    it('respawns near center (with small offset, not at exact center) when star exits any edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 810;
      layer.stars[0].y = 300;

      updateStarLayerDirectional(layer, 0.01, 800, 600, 'radial');

      const cx = 400, cy = 300;
      const dist = Math.hypot(layer.stars[0].x - cx, layer.stars[0].y - cy);
      // Should have respawned near center but not at exact center
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(40);
    });

    it('respawns near center when star exits top edge', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = -10;

      updateStarLayerDirectional(layer, 0.01, 800, 600, 'radial');

      const cx = 400, cy = 300;
      const dist = Math.hypot(layer.stars[0].x - cx, layer.stars[0].y - cy);
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(40);
    });

    it('star at exact center still moves outward (no stuck stars)', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      layer.stars[0].x = 400;
      layer.stars[0].y = 300;

      updateStarLayerDirectional(layer, 0.1, 800, 600, 'radial');

      // Star should have moved from center
      const dist = Math.hypot(layer.stars[0].x - 400, layer.stars[0].y - 300);
      expect(dist).toBeGreaterThan(0);
    });

    it('stars far from center move faster than stars near center (perspective acceleration)', () => {
      const nearCenter = createStarLayer(1, 800, 600, { speed: 100 });
      const farFromCenter = createStarLayer(1, 800, 600, { speed: 100 });

      // Place one star 30px from center, another 200px from center
      nearCenter.stars[0].x = 430;
      nearCenter.stars[0].y = 300;
      farFromCenter.stars[0].x = 600;
      farFromCenter.stars[0].y = 300;

      const nearDistBefore = nearCenter.stars[0].x - 400;
      const farDistBefore = farFromCenter.stars[0].x - 400;

      updateStarLayerDirectional(nearCenter, 0.1, 800, 600, 'radial');
      updateStarLayerDirectional(farFromCenter, 0.1, 800, 600, 'radial');

      const nearMoved = (nearCenter.stars[0].x - 400) - nearDistBefore;
      const farMoved = (farFromCenter.stars[0].x - 400) - farDistBefore;

      // Far star should have moved more pixels than near star
      expect(farMoved).toBeGreaterThan(nearMoved);
    });

    it('sets radialBrightness on stars based on distance from center', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      // Place star close to center
      layer.stars[0].x = 410;
      layer.stars[0].y = 300;

      updateStarLayerDirectional(layer, 0.01, 800, 600, 'radial');

      expect(layer.stars[0].radialBrightness).toBeDefined();
      expect(layer.stars[0].radialBrightness).toBeGreaterThanOrEqual(0);
      expect(layer.stars[0].radialBrightness).toBeLessThanOrEqual(1);
    });

    it('radialBrightness is low near center and high near edge', () => {
      const nearCenter = createStarLayer(1, 800, 600, { speed: 100 });
      const nearEdge = createStarLayer(1, 800, 600, { speed: 100 });

      nearCenter.stars[0].x = 410;
      nearCenter.stars[0].y = 300;
      nearEdge.stars[0].x = 750;
      nearEdge.stars[0].y = 300;

      updateStarLayerDirectional(nearCenter, 0.01, 800, 600, 'radial');
      updateStarLayerDirectional(nearEdge, 0.01, 800, 600, 'radial');

      expect(nearEdge.stars[0].radialBrightness).toBeGreaterThan(nearCenter.stars[0].radialBrightness);
    });

    it('respawned stars have low radialBrightness', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 100 });
      // Place star outside screen to force respawn
      layer.stars[0].x = 810;
      layer.stars[0].y = 300;

      updateStarLayerDirectional(layer, 0.01, 800, 600, 'radial');

      // Just respawned near center — should be dim
      expect(layer.stars[0].radialBrightness).toBeLessThan(0.3);
    });
  });

  describe('updateStarLayerDirectional — radial parallax', () => {
    it('near-layer stars move faster outward than far-layer stars', () => {
      const farLayer = createStarLayer(1, 800, 600, { speed: 5 });
      const nearLayer = createStarLayer(1, 800, 600, { speed: 30 });
      // Place both at same offset from center
      farLayer.stars[0].x = 500;
      farLayer.stars[0].y = 300;
      nearLayer.stars[0].x = 500;
      nearLayer.stars[0].y = 300;
      const cx = 400;

      updateStarLayerDirectional(farLayer, 1.0, 800, 600, 'radial');
      updateStarLayerDirectional(nearLayer, 1.0, 800, 600, 'radial');

      const farDist = farLayer.stars[0].x - cx;
      const nearDist = nearLayer.stars[0].x - cx;
      expect(nearDist).toBeGreaterThan(farDist);
    });
  });

  describe('updateStarLayerDirectional — dt=0', () => {
    it('does not move stars for any direction when dt=0', () => {
      for (const dir of ['left', 'right', 'up', 'down', 'radial']) {
        const layer = createStarLayer(1, 800, 600, { speed: 100 });
        layer.stars[0].x = 400;
        layer.stars[0].y = 300;
        updateStarLayerDirectional(layer, 0, 800, 600, dir);
        expect(layer.stars[0].x).toBe(400);
        expect(layer.stars[0].y).toBe(300);
      }
    });
  });

  describe('existing stars preserved on direction change', () => {
    it('stars are not recreated — same array reference after direction switch', () => {
      const layer = createStarLayer(5, 800, 600, { speed: 10 });
      const starRefs = layer.stars.map(s => s);

      // Update with one direction, then another — stars should be same objects
      updateStarLayerDirectional(layer, 0.016, 800, 600, 'left');
      updateStarLayerDirectional(layer, 0.016, 800, 600, 'radial');

      expect(layer.stars.length).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(layer.stars[i]).toBe(starRefs[i]);
      }
    });

    it('radialBrightness is cleared when switching away from radial mode', () => {
      const layer = createStarLayer(1, 800, 600, { speed: 10 });
      layer.stars[0].x = 500;
      layer.stars[0].y = 300;

      // Enter radial — should set radialBrightness
      updateStarLayerDirectional(layer, 0.016, 800, 600, 'radial');
      expect(layer.stars[0].radialBrightness).toBeDefined();

      // Switch to left — should clear radialBrightness
      updateStarLayerDirectional(layer, 0.016, 800, 600, 'left');
      expect(layer.stars[0].radialBrightness).toBeUndefined();
    });
  });

  describe('redistributeStars', () => {
    it('for linear modes, distributes stars across the full canvas', () => {
      const layers = [createStarLayer(50, 800, 600, { speed: 10 })];
      // Cluster all stars near center (simulating a switch from radial)
      for (const star of layers[0].stars) {
        star.x = 400;
        star.y = 300;
      }

      redistributeStars(layers, 800, 600, 'left');

      // Stars should now be spread across the canvas, not all at center
      const xs = layers[0].stars.map(s => s.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      expect(maxX - minX).toBeGreaterThan(200);
    });

    it('for linear modes, all stars remain within canvas bounds', () => {
      const layers = [createStarLayer(50, 800, 600, { speed: 10 })];
      redistributeStars(layers, 800, 600, 'right');

      for (const star of layers[0].stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(800);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(600);
      }
    });

    it('for linear modes, clears radialBrightness', () => {
      const layers = [createStarLayer(5, 800, 600, { speed: 10 })];
      for (const star of layers[0].stars) {
        star.radialBrightness = 0.5;
      }

      redistributeStars(layers, 800, 600, 'left');

      for (const star of layers[0].stars) {
        expect(star.radialBrightness).toBeUndefined();
      }
    });

    it('for radial mode, distributes stars at various distances from center', () => {
      const layers = [createStarLayer(50, 800, 600, { speed: 10 })];

      redistributeStars(layers, 800, 600, 'radial');

      const cx = 400, cy = 300;
      const distances = layers[0].stars.map(s => Math.hypot(s.x - cx, s.y - cy));
      const minDist = Math.min(...distances);
      const maxDist = Math.max(...distances);
      // Should have stars both near and far from center
      expect(maxDist - minDist).toBeGreaterThan(100);
    });

    it('for radial mode, sets radialBrightness on each star', () => {
      const layers = [createStarLayer(10, 800, 600, { speed: 10 })];

      redistributeStars(layers, 800, 600, 'radial');

      for (const star of layers[0].stars) {
        expect(star.radialBrightness).toBeDefined();
        expect(star.radialBrightness).toBeGreaterThanOrEqual(0);
        expect(star.radialBrightness).toBeLessThanOrEqual(1);
      }
    });

    it('for radial mode, stars closer to center are dimmer', () => {
      const layers = [createStarLayer(50, 800, 600, { speed: 10 })];

      redistributeStars(layers, 800, 600, 'radial');

      const cx = 400, cy = 300;
      // Sort stars by distance from center
      const sorted = [...layers[0].stars].sort(
        (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)
      );
      // The nearest quarter should on average be dimmer than the farthest quarter
      const quarter = Math.floor(sorted.length / 4);
      const nearAvg = sorted.slice(0, quarter).reduce((s, st) => s + st.radialBrightness, 0) / quarter;
      const farAvg = sorted.slice(-quarter).reduce((s, st) => s + st.radialBrightness, 0) / quarter;
      expect(farAvg).toBeGreaterThan(nearAvg);
    });

    it('redistributes all layers, not just the first', () => {
      const layers = [
        createStarLayer(10, 800, 600, { speed: 5 }),
        createStarLayer(10, 800, 600, { speed: 20 }),
      ];
      // Cluster all stars
      for (const layer of layers) {
        for (const star of layer.stars) {
          star.x = 400;
          star.y = 300;
        }
      }

      redistributeStars(layers, 800, 600, 'up');

      for (const layer of layers) {
        const xs = layer.stars.map(s => s.x);
        expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(100);
      }
    });

    it('preserves star count after redistribution', () => {
      const layers = [createStarLayer(30, 800, 600, { speed: 10 })];
      redistributeStars(layers, 800, 600, 'radial');
      expect(layers[0].stars.length).toBe(30);
    });
  });
});
