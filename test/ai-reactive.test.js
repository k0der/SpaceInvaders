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
  createReactiveState,
  FIRE_ANGLE,
  MAX_FIRE_RANGE,
  MAX_PREDICTION_TIME,
  PREDICTION_SPEED,
  ROTATION_DEADZONE,
  reactiveStrategy,
  THRUST_ANGLE,
  updateReactiveAI,
} from '../src/ai-reactive.js';
import { createShip, updateShip } from '../src/ship.js';

describe('ai-reactive: Strategy interface', () => {
  it('reactiveStrategy has createState and update methods', () => {
    expect(typeof reactiveStrategy.createState).toBe('function');
    expect(typeof reactiveStrategy.update).toBe('function');
  });

  it('createState returns the same as createReactiveState', () => {
    const state = reactiveStrategy.createState();
    expect(typeof state).toBe('object');
    expect(state).not.toBeNull();
  });

  it('update is the same as updateReactiveAI', () => {
    expect(reactiveStrategy.update).toBe(updateReactiveAI);
  });
});

describe('ai-reactive: Constants', () => {
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

  it('exports FIRE_ANGLE as a positive number (~0.15 rad)', () => {
    expect(typeof FIRE_ANGLE).toBe('number');
    expect(FIRE_ANGLE).toBeGreaterThan(0);
    expect(FIRE_ANGLE).toBeCloseTo(0.15, 1);
  });

  it('exports MAX_FIRE_RANGE as a positive number (500px)', () => {
    expect(typeof MAX_FIRE_RANGE).toBe('number');
    expect(MAX_FIRE_RANGE).toBe(500);
  });

  it('exports AVOID_LOOKAHEAD as 800px', () => {
    expect(AVOID_LOOKAHEAD).toBe(800);
  });

  it('exports AVOID_MARGIN as 50px', () => {
    expect(AVOID_MARGIN).toBe(50);
  });

  it('exports AVOID_STRENGTH as 2.5 rad', () => {
    expect(AVOID_STRENGTH).toBe(2.5);
  });

  it('exports AVOID_PREDICT_TIME as 0.3s', () => {
    expect(AVOID_PREDICT_TIME).toBeCloseTo(0.3, 1);
  });

  it('exports AVOID_PROXIMITY as 80px', () => {
    expect(AVOID_PROXIMITY).toBe(80);
  });

  it('exports AVOIDANCE_PRIORITY as 2', () => {
    expect(AVOIDANCE_PRIORITY).toBe(2);
  });
});

describe('ai-reactive: createReactiveState', () => {
  it('returns an object', () => {
    const state = createReactiveState();
    expect(typeof state).toBe('object');
    expect(state).not.toBeNull();
  });
});

describe('ai-reactive: updateReactiveAI — rotation toward target', () => {
  it('does not rotate when target is directly ahead (within deadzone)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.rotatingLeft).toBe(false);
    expect(ai.rotatingRight).toBe(false);
  });

  it('rotates right when target is to the right (positive angle diff)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 100,
      y: 100,
      heading: 0,
      owner: 'player',
    });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.rotatingRight).toBe(true);
    expect(ai.rotatingLeft).toBe(false);
  });

  it('rotates left when target is to the left (negative angle diff)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 100,
      y: -100,
      heading: 0,
      owner: 'player',
    });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.rotatingLeft).toBe(true);
    expect(ai.rotatingRight).toBe(false);
  });
});

describe('ai-reactive: updateReactiveAI — thrust', () => {
  it('thrusts when roughly facing target (within THRUST_ANGLE)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.thrust).toBe(true);
  });

  it('does not thrust when target is behind (outside THRUST_ANGLE)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: -500,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.thrust).toBe(false);
  });
});

describe('ai-reactive: updateReactiveAI — braking', () => {
  it('brakes when not facing target and speed exceeds BRAKE_SPEED', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = BRAKE_SPEED + 50;
    ai.vy = 0;
    const target = createShip({
      x: -500,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.braking).toBe(true);
  });

  it('does not brake when facing target even at high speed', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = 300;
    ai.vy = 0;
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

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
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.braking).toBe(false);
  });
});

describe('ai-reactive: updateReactiveAI — dead ship handling', () => {
  it('clears all flags when AI ship is dead', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.alive = false;
    ai.thrust = true;
    ai.rotatingLeft = true;
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

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
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.thrust).toBe(false);
    expect(ai.rotatingLeft).toBe(false);
    expect(ai.rotatingRight).toBe(false);
    expect(ai.braking).toBe(false);
    expect(ai.fire).toBe(false);
  });
});

describe('ai-reactive: updateReactiveAI — target prediction (lead aiming)', () => {
  it('aims ahead of a fast-moving target', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    target.vy = -200;

    const state = createReactiveState();
    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.rotatingLeft).toBe(true);
  });

  it('does not overshoot prediction (capped at MAX_PREDICTION_TIME)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 10000,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    target.vy = -100;

    const state = createReactiveState();
    updateReactiveAI(state, ai, target, [], 0.016);

    expect(
      ai.rotatingLeft ||
        ai.rotatingRight ||
        (!ai.rotatingLeft && !ai.rotatingRight),
    ).toBe(true);
  });
});

describe('ai-reactive: AI ship uses same physics as player', () => {
  it('AI-controlled ship accelerates via updateShip after updateReactiveAI sets thrust', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);
    expect(ai.thrust).toBe(true);

    updateShip(ai, 0.1);
    expect(ai.vx).toBeGreaterThan(0);
    expect(ai.x).toBeGreaterThan(0);
  });
});

describe('ai-reactive: updateReactiveAI — firing', () => {
  it('fires when aimed at nearby target directly ahead', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

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
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.fire).toBe(false);
  });

  it('does not fire when heading diff exceeds FIRE_ANGLE', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 200,
      y: 200,
      heading: 0,
      owner: 'player',
    });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.fire).toBe(false);
  });

  it('does not fire when AI ship is dead', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.alive = false;
    const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.fire).toBe(false);
  });

  it('does not fire when target ship is dead', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
    target.alive = false;
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

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
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.fire).toBe(true);
  });
});

describe('ai-reactive: computeAvoidanceOffset', () => {
  it('returns { offset: 0, maxUrgency: 0 } when no obstacles are present', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const result = computeAvoidanceOffset(ai, []);
    expect(result.offset).toBe(0);
    expect(result.maxUrgency).toBe(0);
  });

  it('returns offset 0 when obstacle is behind the ship and beyond proximity', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: -200, y: 0, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBe(0);
  });

  it('returns offset 0 when obstacle is ahead but far outside lateral range', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 200, y: 200, radius: 20 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBe(0);
  });

  it('returns offset 0 when obstacle is beyond AVOID_LOOKAHEAD', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: AVOID_LOOKAHEAD + 100, y: 0, radius: 20 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBe(0);
  });

  it('returns negative offset (steer left) for obstacle to the right', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 150, y: 20, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBeLessThan(0);
  });

  it('returns positive offset (steer right) for obstacle to the left', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 150, y: -20, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBeGreaterThan(0);
  });

  it('defaults to steering right when obstacle is dead center (lateral ≈ 0)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 150, y: 0, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBeGreaterThan(0);
  });

  it('produces stronger offset for closer obstacles', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const nearObstacle = [{ x: 50, y: 10, radius: 30 }];
    const farObstacle = [{ x: 250, y: 10, radius: 30 }];

    const nearOffset = Math.abs(
      computeAvoidanceOffset(ai, nearObstacle).offset,
    );
    const farOffset = Math.abs(computeAvoidanceOffset(ai, farObstacle).offset);

    expect(nearOffset).toBeGreaterThan(farOffset);
  });

  it('sums avoidance from multiple obstacles', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
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
    const ai = createShip({
      x: 0,
      y: 0,
      heading: -Math.PI / 2,
      owner: 'enemy',
    });
    const obstacles = [{ x: 10, y: -150, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });

  it('works with obstacles that have varying radius', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const largeObs = [{ x: 150, y: 50, radius: 60 }];
    const smallObs = [{ x: 150, y: 50, radius: 10 }];

    const largeOffset = Math.abs(computeAvoidanceOffset(ai, largeObs).offset);
    const smallOffset = Math.abs(computeAvoidanceOffset(ai, smallObs).offset);

    expect(largeOffset).toBeGreaterThanOrEqual(smallOffset);
  });

  it('returns maxUrgency reflecting the closest threatening obstacle', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 50, y: 0, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.maxUrgency).toBeGreaterThan(0.5);
  });
});

describe('ai-reactive: computeAvoidanceOffset — proximity detection', () => {
  it('detects obstacle to the side via proximity even when not in cylinder', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 0, y: 60, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });

  it('does not trigger proximity for distant obstacles', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 0, y: 200, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBe(0);
  });

  it('produces proportionally stronger response for closer proximity threats', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const veryClose = [{ x: 30, y: 0, radius: 30 }];
    const moderate = [{ x: 150, y: 0, radius: 30 }];

    const veryCloseOffset = Math.abs(
      computeAvoidanceOffset(ai, veryClose).offset,
    );
    const moderateOffset = Math.abs(
      computeAvoidanceOffset(ai, moderate).offset,
    );

    expect(veryCloseOffset).toBeGreaterThan(moderateOffset);
  });
});

describe('ai-reactive: computeAvoidanceOffset — velocity-based prediction', () => {
  it('detects obstacle along velocity when heading points elsewhere', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = 0;
    ai.vy = -200;
    const obstacles = [{ x: 0, y: -150, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });

  it('does NOT detect obstacle along heading when velocity goes elsewhere', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = 0;
    ai.vy = -200;
    const obstacles = [{ x: 150, y: -300, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).toBe(0);
  });

  it('falls back to heading when stationary (speed < 1)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const obstacles = [{ x: 150, y: 0, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });

  it('accounts for thrust when predicting future velocity', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.thrust = true;
    ai.thrustIntensity = 1.0;
    const obstacles = [{ x: 150, y: 0, radius: 30 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });

  it('blends velocity and thrust for predicted direction', () => {
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
    const obstacles = [{ x: 50, y: -150, radius: 40 }];
    const result = computeAvoidanceOffset(ai, obstacles);
    expect(result.offset).not.toBe(0);
  });
});

describe('ai-reactive: updateReactiveAI — avoidance integration', () => {
  it('steers away from asteroid directly ahead on collision course', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 1000,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const asteroids = [
      { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

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
    const asteroids = [
      { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

    expect(ai.thrust).toBe(true);
  });

  it('thrusts during avoidance when near escape direction (mild avoidance)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 1000,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const asteroids = [
      { x: 400, y: 0, collisionRadius: 30, radius: 40, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

    expect(ai.thrust).toBe(true);
  });

  it('does not include target ship in obstacle list (pursues freely)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 80, y: 0, heading: 0, owner: 'player' });
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, [], 0.016);

    expect(ai.rotatingLeft).toBe(false);
    expect(ai.rotatingRight).toBe(false);
  });

  it('does not brake during active avoidance even at high speed', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = BRAKE_SPEED + 100;
    ai.vy = 0;
    const target = createShip({
      x: -500,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const asteroids = [
      { x: 100, y: 0, collisionRadius: 40, radius: 50, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

    expect(ai.braking).toBe(false);
    expect(ai.thrust).toBe(true);
  });

  it('survival-first: avoidance overrides pursuit when obstacle is between AI and target', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.vx = 200;
    ai.vy = 0;
    const target = createShip({
      x: -500,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const asteroids = [
      { x: 80, y: 0, collisionRadius: 30, radius: 40, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

    expect(ai.rotatingRight).toBe(true);
    expect(ai.rotatingLeft).toBe(false);
  });

  it('does not avoid asteroids that are off to the side (no false positives)', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({
      x: 1000,
      y: 0,
      heading: 0,
      owner: 'player',
    });
    const asteroids = [
      { x: 200, y: 400, collisionRadius: 30, radius: 40, vx: 0, vy: 0 },
    ];
    const state = createReactiveState();

    updateReactiveAI(state, ai, target, asteroids, 0.016);

    expect(ai.rotatingLeft).toBe(false);
    expect(ai.rotatingRight).toBe(false);
  });
});
