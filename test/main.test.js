import { describe, expect, it } from 'vitest';
import { calculateDeltaTime, createLoop } from '../src/main.js';

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

    it('returns exactly 0 when timestamps go backward', () => {
      const dt = calculateDeltaTime(500, 1000);
      expect(dt).toBe(0);
    });

    it('returns exactly 0 for equal timestamps', () => {
      const dt = calculateDeltaTime(1000, 1000);
      expect(dt).toBe(0);
    });

    it('caps delta time at 0.1s (100ms) to avoid spiral of death', () => {
      // Simulating a 500ms gap (e.g. tab was backgrounded)
      const dt = calculateDeltaTime(1500, 1000);
      expect(dt).toBeLessThanOrEqual(0.1);
    });

    it('returns exactly 0.1 at the cap boundary (100ms gap)', () => {
      const dt = calculateDeltaTime(1100, 1000);
      expect(dt).toBe(0.1);
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

    it('caps dt at 0.1s when a large gap occurs mid-sequence', () => {
      const loop = createLoop();
      loop.tick(0);
      loop.tick(16);
      // Simulate 2 second gap (tab backgrounded)
      const dt = loop.tick(2016);
      expect(dt).toBe(0.1);
    });

    it('clamps dt to 0 when timestamp goes backward', () => {
      const loop = createLoop();
      loop.tick(0);
      loop.tick(100);
      const dt = loop.tick(50); // time went backward
      expect(dt).toBe(0);
    });

    it('returns accurate dt across a sequence of ticks', () => {
      const loop = createLoop();
      loop.tick(0);
      const dt1 = loop.tick(16);
      const dt2 = loop.tick(33);
      const dt3 = loop.tick(50);
      expect(dt1).toBeCloseTo(0.016, 3);
      expect(dt2).toBeCloseTo(0.017, 3);
      expect(dt3).toBeCloseTo(0.017, 3);
    });

    it('independent loops do not share state', () => {
      const loopA = createLoop();
      const loopB = createLoop();
      loopA.tick(0);
      loopA.tick(100);
      loopB.tick(0);
      expect(loopA.frameCount).toBe(2);
      expect(loopB.frameCount).toBe(1);
      expect(loopA.lastTimestamp).toBe(100);
      expect(loopB.lastTimestamp).toBe(0);
    });
  });
});
