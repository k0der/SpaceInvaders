import { describe, it, expect } from 'vitest';
import {
  createLoop,
  calculateDeltaTime,
} from '../src/main.js';

describe('Increment 1: A Black Void That Breathes', () => {

  describe('calculateDeltaTime', () => {
    it('returns the difference between current and previous timestamp in seconds', () => {
      const dt = calculateDeltaTime(1016, 1000);
      expect(dt).toBeCloseTo(0.016, 3);
    });

    it('clamps large gaps even when previous is 0', () => {
      // calculateDeltaTime is pure math; first-frame guard is in createLoop
      const dt = calculateDeltaTime(1000, 0);
      expect(dt).toBe(0.1); // 1000ms gap → capped at 0.1s
    });

    it('never returns a negative value', () => {
      const dt = calculateDeltaTime(500, 1000);
      expect(dt).toBeGreaterThanOrEqual(0);
    });

    it('caps delta time at 0.1s (100ms) to avoid spiral of death', () => {
      // Simulating a 500ms gap (e.g. tab was backgrounded)
      const dt = calculateDeltaTime(1500, 1000);
      expect(dt).toBeLessThanOrEqual(0.1);
    });

    it('handles normal 60fps frame intervals', () => {
      const dt = calculateDeltaTime(16.667, 0.001);
      expect(dt).toBeGreaterThan(0);
      expect(dt).toBeLessThan(0.1);
    });
  });

  describe('createLoop', () => {
    it('returns a loop object with frameCount starting at 0', () => {
      const loop = createLoop();
      expect(loop.frameCount).toBe(0);
    });

    it('returns a loop object with lastTimestamp starting at 0', () => {
      const loop = createLoop();
      expect(loop.lastTimestamp).toBe(0);
    });

    it('tick increments frameCount', () => {
      const loop = createLoop();
      loop.tick(16.667);
      expect(loop.frameCount).toBe(1);
    });

    it('tick updates lastTimestamp', () => {
      const loop = createLoop();
      loop.tick(16.667);
      expect(loop.lastTimestamp).toBe(16.667);
    });

    it('tick returns the calculated delta time', () => {
      const loop = createLoop();
      const dt1 = loop.tick(0); // first frame, previous is 0
      expect(dt1).toBe(0);

      const dt2 = loop.tick(16.667);
      expect(dt2).toBeCloseTo(0.016667, 4);
    });

    it('accumulates multiple ticks correctly', () => {
      const loop = createLoop();
      loop.tick(0);
      loop.tick(16);
      loop.tick(32);
      expect(loop.frameCount).toBe(3);
      expect(loop.lastTimestamp).toBe(32);
    });
  });
});
