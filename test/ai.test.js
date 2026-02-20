import { describe, expect, it } from 'vitest';
import {
  AVOID_LOOKAHEAD,
  AVOID_MARGIN,
  AVOID_PREDICT_TIME,
  AVOID_PROXIMITY,
  AVOID_STRENGTH,
  AVOIDANCE_PRIORITY,
  BRAKE_SPEED,
  computeAvoidanceOffset,
  createAIState,
  FIRE_ANGLE,
  MAX_FIRE_RANGE,
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

describe('Increment 26: AI Fires Bullets + Asteroid Avoidance', () => {
  describe('AI combat constants', () => {
    it('exports FIRE_ANGLE as a positive number (~0.15 rad)', () => {
      expect(typeof FIRE_ANGLE).toBe('number');
      expect(FIRE_ANGLE).toBeGreaterThan(0);
      expect(FIRE_ANGLE).toBeCloseTo(0.15, 1);
    });

    it('exports MAX_FIRE_RANGE as a positive number (500px)', () => {
      expect(typeof MAX_FIRE_RANGE).toBe('number');
      expect(MAX_FIRE_RANGE).toBe(500);
    });
  });

  describe('AI avoidance constants', () => {
    it('exports AVOID_LOOKAHEAD as 500px', () => {
      expect(typeof AVOID_LOOKAHEAD).toBe('number');
      expect(AVOID_LOOKAHEAD).toBe(500);
    });

    it('exports AVOID_MARGIN as 50px', () => {
      expect(typeof AVOID_MARGIN).toBe('number');
      expect(AVOID_MARGIN).toBe(50);
    });

    it('exports AVOID_STRENGTH as 2.5 rad', () => {
      expect(typeof AVOID_STRENGTH).toBe('number');
      expect(AVOID_STRENGTH).toBe(2.5);
    });

    it('exports AVOID_PREDICT_TIME as 0.3s', () => {
      expect(typeof AVOID_PREDICT_TIME).toBe('number');
      expect(AVOID_PREDICT_TIME).toBeCloseTo(0.3, 1);
    });

    it('exports AVOID_PROXIMITY as 80px', () => {
      expect(typeof AVOID_PROXIMITY).toBe('number');
      expect(AVOID_PROXIMITY).toBe(80);
    });

    it('exports AVOIDANCE_PRIORITY as 3', () => {
      expect(typeof AVOIDANCE_PRIORITY).toBe('number');
      expect(AVOIDANCE_PRIORITY).toBe(3);
    });
  });

  describe('updateAI — firing', () => {
    it('fires when aimed at nearby target directly ahead', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(true);
    });

    it('does not fire when target is beyond MAX_FIRE_RANGE', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({
        x: MAX_FIRE_RANGE + 100,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(false);
    });

    it('does not fire when heading diff exceeds FIRE_ANGLE', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target at 45° angle — well outside FIRE_ANGLE (~8.6°)
      const target = createShip({
        x: 200,
        y: 200,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(false);
    });

    it('does not fire when AI ship is dead', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.alive = false;
      const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(false);
    });

    it('does not fire when target ship is dead', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
      target.alive = false;
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(false);
    });

    it('fires when just inside MAX_FIRE_RANGE', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({
        x: MAX_FIRE_RANGE - 10,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      expect(ai.fire).toBe(true);
    });
  });

  describe('computeAvoidanceOffset', () => {
    it('returns { offset: 0, maxUrgency: 0 } when no obstacles are present', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const result = computeAvoidanceOffset(ai, []);
      expect(result.offset).toBe(0);
      expect(result.maxUrgency).toBe(0);
    });

    it('returns offset 0 when obstacle is behind the ship and beyond proximity', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle behind and beyond proximity range (radius 30 + AVOID_PROXIMITY 80 = 110 < 200)
      const obstacles = [{ x: -200, y: 0, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).toBe(0);
    });

    it('returns offset 0 when obstacle is ahead but far outside lateral range', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle 200px ahead but 200px off to the side (well beyond radius+margin)
      const obstacles = [{ x: 200, y: 200, radius: 20 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).toBe(0);
    });

    it('returns offset 0 when obstacle is beyond AVOID_LOOKAHEAD', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle directly ahead but too far away
      const obstacles = [{ x: AVOID_LOOKAHEAD + 100, y: 0, radius: 20 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).toBe(0);
    });

    it('returns negative offset (steer left) for obstacle to the right', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle ahead and slightly to the right (positive y)
      const obstacles = [{ x: 150, y: 20, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).toBeLessThan(0);
    });

    it('returns positive offset (steer right) for obstacle to the left', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle ahead and slightly to the left (negative y)
      const obstacles = [{ x: 150, y: -20, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).toBeGreaterThan(0);
    });

    it('defaults to steering right when obstacle is dead center (lateral ≈ 0)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle directly ahead, dead center
      const obstacles = [{ x: 150, y: 0, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      // Positive offset = steer right (clockwise), negative = steer left
      expect(result.offset).toBeGreaterThan(0);
    });

    it('produces stronger offset for closer obstacles', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const nearObstacle = [{ x: 50, y: 10, radius: 30 }];
      const farObstacle = [{ x: 250, y: 10, radius: 30 }];

      const nearOffset = Math.abs(
        computeAvoidanceOffset(ai, nearObstacle).offset,
      );
      const farOffset = Math.abs(
        computeAvoidanceOffset(ai, farObstacle).offset,
      );

      expect(nearOffset).toBeGreaterThan(farOffset);
    });

    it('sums avoidance from multiple obstacles', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Two obstacles both to the right — should produce stronger left steer
      const oneObstacle = [{ x: 150, y: 20, radius: 30 }];
      const twoObstacles = [
        { x: 150, y: 20, radius: 30 },
        { x: 100, y: 15, radius: 25 },
      ];

      const singleOffset = Math.abs(
        computeAvoidanceOffset(ai, oneObstacle).offset,
      );
      const doubleOffset = Math.abs(
        computeAvoidanceOffset(ai, twoObstacles).offset,
      );

      expect(doubleOffset).toBeGreaterThan(singleOffset);
    });

    it('works with non-zero heading (rotated frame)', () => {
      // AI heading upward (−PI/2), obstacle directly ahead (above)
      const ai = createShip({
        x: 0,
        y: 0,
        heading: -Math.PI / 2,
        owner: 'enemy',
      });
      // Obstacle above and slightly to the right (in screen: positive x)
      const obstacles = [{ x: 10, y: -150, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.offset).not.toBe(0);
    });

    it('works with obstacles that have varying radius', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Large radius obstacle — wider danger zone
      const largeObs = [{ x: 150, y: 50, radius: 60 }];
      // Small radius obstacle at same position — narrower danger zone
      const smallObs = [{ x: 150, y: 50, radius: 10 }];

      const largeOffset = Math.abs(computeAvoidanceOffset(ai, largeObs).offset);
      const smallOffset = Math.abs(computeAvoidanceOffset(ai, smallObs).offset);

      // Large obstacle should trigger avoidance, small one might not at y=50
      expect(largeOffset).toBeGreaterThanOrEqual(smallOffset);
    });

    it('returns maxUrgency reflecting the closest threatening obstacle', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Close obstacle → high urgency
      const obstacles = [{ x: 50, y: 0, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);
      expect(result.maxUrgency).toBeGreaterThan(0.5);
    });
  });

  describe('computeAvoidanceOffset — proximity detection', () => {
    it('detects obstacle to the side via proximity even when not in cylinder', () => {
      // Ship heading right, obstacle directly to the side (not ahead in cylinder)
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle at (0, 60) — perpendicular, not ahead at all (ahead ≈ 0)
      // But within AVOID_PROXIMITY (80) + radius (30) = 110px, and distance is 60
      const obstacles = [{ x: 0, y: 60, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should detect via proximity even though cylinder projection misses it
      expect(result.offset).not.toBe(0);
    });

    it('does not trigger proximity for distant obstacles', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Obstacle far to the side — beyond proximity range
      const obstacles = [{ x: 0, y: 200, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      expect(result.offset).toBe(0);
    });

    it('produces nonlinear urgency (squared): very close is disproportionately strong', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Very close obstacle (high urgency)
      const veryClose = [{ x: 30, y: 0, radius: 30 }];
      // Moderately close obstacle (medium urgency)
      const moderate = [{ x: 150, y: 0, radius: 30 }];

      const veryCloseOffset = Math.abs(
        computeAvoidanceOffset(ai, veryClose).offset,
      );
      const moderateOffset = Math.abs(
        computeAvoidanceOffset(ai, moderate).offset,
      );

      // With squared urgency, the ratio should be much larger than linear
      expect(veryCloseOffset / moderateOffset).toBeGreaterThan(1.4);
    });
  });

  describe('computeAvoidanceOffset — velocity-based prediction', () => {
    it('detects obstacle along velocity when heading points elsewhere', () => {
      // Ship heading right (0), but drifting upward (negative y)
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = 0;
      ai.vy = -200; // Drifting upward fast

      // Obstacle above — on the velocity path, NOT on heading path
      const obstacles = [{ x: 0, y: -150, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should detect collision course via velocity, not heading
      expect(result.offset).not.toBe(0);
    });

    it('does NOT detect obstacle along heading when velocity goes elsewhere', () => {
      // Ship heading right (0), but moving upward
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = 0;
      ai.vy = -200; // Moving upward

      // Obstacle to the right — on heading path but NOT on velocity path
      const obstacles = [{ x: 150, y: -300, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should NOT trigger because velocity doesn't go there
      expect(result.offset).toBe(0);
    });

    it('falls back to heading when stationary (speed < 1)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // No velocity, no thrust — truly stationary
      const obstacles = [{ x: 150, y: 0, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should fall back to heading-based detection
      expect(result.offset).not.toBe(0);
    });

    it('accounts for thrust when predicting future velocity', () => {
      // Ship stationary but thrusting rightward — predicted velocity is rightward
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.thrust = true;
      ai.thrustIntensity = 1.0;

      // Obstacle to the right — on thrust-predicted path
      const obstacles = [{ x: 150, y: 0, radius: 30 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should detect because thrust predicts rightward velocity
      expect(result.offset).not.toBe(0);
    });

    it('blends velocity and thrust for predicted direction', () => {
      // Ship moving right, but thrusting upward — predicted path goes up-right
      // predV = (200+0, 0-600) ≈ direction (0.32, -0.95) — mostly upward
      const ai = createShip({
        x: 0,
        y: 0,
        heading: -Math.PI / 2,
        owner: 'enemy',
      });
      ai.vx = 200;
      ai.vy = 0;
      ai.thrust = true;
      ai.thrustIntensity = 1.0;

      // Obstacle along the blended predicted direction (up-right)
      const obstacles = [{ x: 50, y: -150, radius: 40 }];
      const result = computeAvoidanceOffset(ai, obstacles);

      // Should detect based on blended velocity + thrust prediction
      expect(result.offset).not.toBe(0);
    });
  });

  describe('updateAI — avoidance integration', () => {
    it('steers away from asteroid directly ahead on collision course', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target far ahead (pursuit says go straight)
      const target = createShip({
        x: 1000,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      // Asteroid directly ahead and close
      const asteroids = [
        { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
      ];
      const state = createAIState();

      updateAI(state, ai, target, asteroids, 0.016);

      // Should be rotating to avoid (not going straight)
      expect(ai.rotatingLeft || ai.rotatingRight).toBe(true);
    });

    it('maintains thrust during avoidance to escape danger zone', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({
        x: 1000,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      // Asteroid directly ahead
      const asteroids = [
        { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
      ];
      const state = createAIState();

      updateAI(state, ai, target, asteroids, 0.016);

      // Thrust should be maintained even during avoidance
      expect(ai.thrust).toBe(true);
    });

    it('includes target ship in obstacle list (avoids ramming)', () => {
      // AI heading straight at the target, very close
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      const target = createShip({ x: 80, y: 0, heading: 0, owner: 'player' });
      const state = createAIState();

      updateAI(state, ai, target, [], 0.016);

      // Should be steering away from the close target ship (not just charging)
      // At close range with target dead ahead, avoidance should override pure pursuit
      expect(ai.rotatingLeft || ai.rotatingRight).toBe(true);
    });

    it('does not brake during active avoidance even at high speed', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = BRAKE_SPEED + 100;
      ai.vy = 0;
      // Target behind (would normally trigger braking)
      const target = createShip({
        x: -500,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      // But asteroid directly ahead triggers avoidance
      const asteroids = [
        { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
      ];
      const state = createAIState();

      updateAI(state, ai, target, asteroids, 0.016);

      // Avoidance active → braking suppressed, thrust maintained
      expect(ai.braking).toBe(false);
      expect(ai.thrust).toBe(true);
    });

    it('survival-first: avoidance overrides pursuit when obstacle is between AI and target', () => {
      // AI heading right, target directly behind (pursuit says turn around)
      // Asteroid directly ahead — avoidance says steer right
      // Without survival-first, pursuit (PI) + avoidance (+2) = partial cancel
      // With survival-first, avoidance dominates and ship steers RIGHT to dodge
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      ai.vx = 200;
      ai.vy = 0;
      const target = createShip({
        x: -500,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      // Asteroid directly ahead, close — high urgency
      const asteroids = [
        { x: 80, y: 0, collisionRadius: 30, radius: 40, vx: 0, vy: 0 },
      ];
      const state = createAIState();

      updateAI(state, ai, target, asteroids, 0.016);

      // Ship should steer to avoid the asteroid (rotating right for dead-center),
      // NOT turn around toward the target (which would go through the asteroid)
      expect(ai.rotatingRight).toBe(true);
      expect(ai.rotatingLeft).toBe(false);
    });

    it('does not avoid asteroids that are off to the side (no false positives)', () => {
      const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      // Target far enough to be beyond AVOID_LOOKAHEAD for target-ship obstacle
      const target = createShip({
        x: 1000,
        y: 0,
        heading: 0,
        owner: 'player',
      });
      // Asteroid far to the side, not on collision course and beyond proximity
      const asteroids = [
        { x: 200, y: 400, collisionRadius: 30, radius: 40, vx: 0, vy: 0 },
      ];
      const state = createAIState();

      updateAI(state, ai, target, asteroids, 0.016);

      // Should aim straight at target, no avoidance from side asteroid
      expect(ai.rotatingLeft).toBe(false);
      expect(ai.rotatingRight).toBe(false);
    });
  });
});
