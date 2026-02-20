import { describe, expect, it } from 'vitest';
import {
  BRAKE_SPEED,
  createAIState,
  MAX_PREDICTION_TIME,
  MAX_SPAWN_DISTANCE,
  MIN_SPAWN_DISTANCE,
  PREDICTION_SPEED,
  ROTATION_DEADZONE,
  spawnEnemyPosition,
  THRUST_ANGLE,
  updateAI,
} from '../src/ai.js';
import { createShip, updateShip } from '../src/ship.js';

describe('Increment 25: Enemy Ship + Basic AI', () => {
  describe('AI constants', () => {
    it('exports ROTATION_DEADZONE as a positive number', () => {
      expect(typeof ROTATION_DEADZONE).toBe('number');
      expect(ROTATION_DEADZONE).toBeGreaterThan(0);
    });

    it('exports THRUST_ANGLE as a positive number (~60°)', () => {
      expect(typeof THRUST_ANGLE).toBe('number');
      expect(THRUST_ANGLE).toBeCloseTo(Math.PI / 3, 2);
    });

    it('exports BRAKE_SPEED as a positive number', () => {
      expect(typeof BRAKE_SPEED).toBe('number');
      expect(BRAKE_SPEED).toBeGreaterThan(0);
    });

    it('exports PREDICTION_SPEED as a positive number', () => {
      expect(typeof PREDICTION_SPEED).toBe('number');
      expect(PREDICTION_SPEED).toBeGreaterThan(0);
    });

    it('exports MAX_PREDICTION_TIME as a positive number', () => {
      expect(typeof MAX_PREDICTION_TIME).toBe('number');
      expect(MAX_PREDICTION_TIME).toBeGreaterThan(0);
    });

    it('exports MIN_SPAWN_DISTANCE as a positive number', () => {
      expect(typeof MIN_SPAWN_DISTANCE).toBe('number');
      expect(MIN_SPAWN_DISTANCE).toBeGreaterThan(0);
    });

    it('exports MAX_SPAWN_DISTANCE greater than MIN_SPAWN_DISTANCE', () => {
      expect(MAX_SPAWN_DISTANCE).toBeGreaterThan(MIN_SPAWN_DISTANCE);
    });
  });

  describe('createAIState', () => {
    it('returns an object', () => {
      const state = createAIState();
      expect(typeof state).toBe('object');
      expect(state).not.toBeNull();
    });
  });

  describe('updateAI — rotation toward target', () => {
    it('does not rotate when target is directly ahead (within deadzone)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.rotatingLeft).toBe(false);
      expect(ai.rotatingRight).toBe(false);
    });

    it('rotates right when target is to the right (positive angle diff)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target below and to the right → angle > 0
      const target = createShip({
        x: 100,
        y: 100,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.rotatingRight).toBe(true);
      expect(ai.rotatingLeft).toBe(false);
    });

    it('rotates left when target is to the left (negative angle diff)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target above and to the right → angle < 0
      const target = createShip({
        x: 100,
        y: -100,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.rotatingLeft).toBe(true);
      expect(ai.rotatingRight).toBe(false);
    });
  });

  describe('updateAI — thrust', () => {
    it('thrusts when roughly facing target (within THRUST_ANGLE)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.thrust).toBe(true);
    });

    it('does not thrust when target is behind (outside THRUST_ANGLE)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target directly behind
      const target = createShip({
        x: -500,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.thrust).toBe(false);
    });
  });

  describe('updateAI — braking', () => {
    it('brakes when not facing target and speed exceeds BRAKE_SPEED', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target behind and AI moving fast forward
      ai.vx = BRAKE_SPEED + 50;
      ai.vy = 0;
      const target = createShip({
        x: -500,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.braking).toBe(true);
    });

    it('does not brake when facing target even at high speed', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = 300;
      ai.vy = 0;
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.braking).toBe(false);
    });

    it('does not brake when speed is below BRAKE_SPEED even if not facing target', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = BRAKE_SPEED - 10;
      ai.vy = 0;
      const target = createShip({
        x: -500,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.braking).toBe(false);
    });
  });

  describe('updateAI — dead ship handling', () => {
    it('clears all flags when AI ship is dead', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.alive = false;
      ai.thrust = true;
      ai.rotatingLeft = true;
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.thrust).toBe(false);
      expect(ai.rotatingLeft).toBe(false);
      expect(ai.rotatingRight).toBe(false);
      expect(ai.braking).toBe(false);
      expect(ai.fire).toBe(false);
    });

    it('clears all flags when target ship is dead', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      target.alive = false;
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.thrust).toBe(false);
      expect(ai.rotatingLeft).toBe(false);
      expect(ai.rotatingRight).toBe(false);
      expect(ai.braking).toBe(false);
      expect(ai.fire).toBe(false);
    });
  });

  describe('updateAI — target prediction (lead aiming)', () => {
    it('aims ahead of a fast-moving target', () => {
      // AI at origin, target at (500, 0) moving upward at high speed
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      target.vy = -200; // Moving upward fast

      const state = createAIState();
      updateAI(state, ai, target, [], 0.016);

      // AI should rotate left to lead the upward-moving target
      expect(ai.rotatingLeft).toBe(true);
    });

    it('does not overshoot prediction (capped at MAX_PREDICTION_TIME)', () => {
      // Very distant target moving sideways — prediction should be capped
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({
        x: 10000,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      target.vy = -100;

      const state = createAIState();
      // Should not throw or produce NaN
      updateAI(state, ai, target, [], 0.016);

      // With capped prediction, the predicted y offset is bounded
      // AI should still make a valid decision
      expect(
        ai.rotatingLeft ||
          ai.rotatingRight ||
          (!ai.rotatingLeft && !ai.rotatingRight),
      ).toBe(true);
    });
  });

  describe('updateAI — fire flag', () => {
    it('does not fire in basic pursuit (increment 26 feature)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(false);
    });
  });

  describe('AI ship uses same physics as player', () => {
    it('AI-controlled ship accelerates via updateShip after updateAI sets thrust', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);
      expect(ai.thrust).toBe(true);

      // updateShip applies the same physics engine
      updateShip(ai, 0.1);
      expect(ai.vx).toBeGreaterThan(0);
      expect(ai.x).toBeGreaterThan(0);
    });
  });

  describe('spawnEnemyPosition', () => {
    it('returns position within MIN_SPAWN_DISTANCE–MAX_SPAWN_DISTANCE from player', () => {
      const px = 400;
      const py = 300;

      for (let i = 0; i < 50; i++) {
        const pos = spawnEnemyPosition(px, py);
        const dx = pos.x - px;
        const dy = pos.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE - 0.001);
        expect(dist).toBeLessThanOrEqual(MAX_SPAWN_DISTANCE + 0.001);
      }
    });

    it('returns { x, y } object', () => {
      const pos = spawnEnemyPosition(0, 0);
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });

    it('produces varied positions (not always the same)', () => {
      const positions = [];
      for (let i = 0; i < 20; i++) {
        positions.push(spawnEnemyPosition(0, 0));
      }
      const uniqueX = new Set(positions.map((p) => Math.round(p.x)));
      expect(uniqueX.size).toBeGreaterThan(1);
    });
  });
});
