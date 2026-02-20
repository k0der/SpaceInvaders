import { describe, expect, it } from 'vitest';
import {
  AIM_BONUS,
  COLLISION_PENALTY,
  cloneShipForSim,
  DISTANCE_WEIGHT,
  defineCandidates,
  predictAsteroidAt,
  predictiveStrategy,
  SIM_DT,
  SIM_STEPS,
  scoreTrajectory,
  selectBestAction,
  simulateTrajectory,
} from '../src/ai-predictive.js';
import { createShip } from '../src/ship.js';

describe('ai-predictive: Constants', () => {
  it('exports SIM_STEPS as 15', () => {
    expect(SIM_STEPS).toBe(15);
  });

  it('exports SIM_DT as 0.1', () => {
    expect(SIM_DT).toBeCloseTo(0.1, 2);
  });

  it('exports COLLISION_PENALTY as a large negative number', () => {
    expect(COLLISION_PENALTY).toBeLessThan(-1000);
  });

  it('exports DISTANCE_WEIGHT as negative', () => {
    expect(DISTANCE_WEIGHT).toBeLessThan(0);
  });

  it('exports AIM_BONUS as positive', () => {
    expect(AIM_BONUS).toBeGreaterThan(0);
  });
});

describe('ai-predictive: cloneShipForSim', () => {
  it('copies physics-relevant fields', () => {
    const ship = createShip({ x: 10, y: 20, heading: 1.5, owner: 'enemy' });
    ship.vx = 100;
    ship.vy = -50;
    ship.thrustIntensity = 0.7;
    ship.thrustPower = 3000;

    const clone = cloneShipForSim(ship);

    expect(clone.x).toBe(10);
    expect(clone.y).toBe(20);
    expect(clone.vx).toBe(100);
    expect(clone.vy).toBe(-50);
    expect(clone.heading).toBe(1.5);
    expect(clone.thrustIntensity).toBe(0.7);
    expect(clone.thrustPower).toBe(3000);
    expect(clone.alive).toBe(true);
  });

  it('does not copy non-physics fields (fire, fireCooldown)', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ship.fire = true;
    ship.fireCooldown = 0.5;

    const clone = cloneShipForSim(ship);

    expect(clone.fire).toBeUndefined();
    expect(clone.fireCooldown).toBeUndefined();
  });

  it('returns a new object (not a reference to the original)', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);

    clone.x = 999;
    expect(ship.x).toBe(0);
  });
});

describe('ai-predictive: predictAsteroidAt', () => {
  it('returns linearly extrapolated position at t=0', () => {
    const ast = { x: 100, y: 200, vx: 10, vy: -20, collisionRadius: 30 };
    const pred = predictAsteroidAt(ast, 0);
    expect(pred.x).toBe(100);
    expect(pred.y).toBe(200);
    expect(pred.radius).toBe(30);
  });

  it('returns linearly extrapolated position at t=1', () => {
    const ast = { x: 100, y: 200, vx: 10, vy: -20, collisionRadius: 30 };
    const pred = predictAsteroidAt(ast, 1);
    expect(pred.x).toBe(110);
    expect(pred.y).toBe(180);
    expect(pred.radius).toBe(30);
  });

  it('uses collisionRadius for radius', () => {
    const ast = { x: 0, y: 0, vx: 0, vy: 0, collisionRadius: 42, radius: 60 };
    const pred = predictAsteroidAt(ast, 0);
    expect(pred.radius).toBe(42);
  });
});

describe('ai-predictive: defineCandidates', () => {
  it('returns exactly 7 candidates', () => {
    const candidates = defineCandidates();
    expect(candidates.length).toBe(7);
  });

  it('each candidate has thrust, rotatingLeft, rotatingRight, braking booleans', () => {
    const candidates = defineCandidates();
    for (const c of candidates) {
      expect(typeof c.thrust).toBe('boolean');
      expect(typeof c.rotatingLeft).toBe('boolean');
      expect(typeof c.rotatingRight).toBe('boolean');
      expect(typeof c.braking).toBe('boolean');
    }
  });

  it('includes a braking-only candidate', () => {
    const candidates = defineCandidates();
    const brakeOnly = candidates.find(
      (c) => c.braking && !c.thrust && !c.rotatingLeft && !c.rotatingRight,
    );
    expect(brakeOnly).toBeDefined();
  });

  it('includes thrust+straight (no rotation)', () => {
    const candidates = defineCandidates();
    const thrustStraight = candidates.find(
      (c) => c.thrust && !c.rotatingLeft && !c.rotatingRight && !c.braking,
    );
    expect(thrustStraight).toBeDefined();
  });

  it('includes coast+straight (no thrust, no rotation)', () => {
    const candidates = defineCandidates();
    const coastStraight = candidates.find(
      (c) => !c.thrust && !c.rotatingLeft && !c.rotatingRight && !c.braking,
    );
    expect(coastStraight).toBeDefined();
  });
});

describe('ai-predictive: simulateTrajectory', () => {
  it('returns an array of positions with length = steps + 1 (initial + simulated)', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 5, 0.1);

    expect(positions.length).toBe(6);
  });

  it('first position is the starting position', () => {
    const ship = createShip({ x: 100, y: 200, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 3, 0.1);

    expect(positions[0].x).toBe(100);
    expect(positions[0].y).toBe(200);
  });

  it('ship moves forward when thrusting', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 10, 0.1);

    expect(positions[10].x).toBeGreaterThan(0);
  });

  it('ship turns when rotatingRight', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: true,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 10, 0.1);

    // Ship turned right, so y should be positive (heading increased)
    expect(positions[10].y).toBeGreaterThan(0);
  });

  it('each position has x, y, and heading', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 3, 0.1);

    for (const pos of positions) {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.heading).toBe('number');
    }
  });
});

describe('ai-predictive: scoreTrajectory', () => {
  it('returns a negative score when a collision occurs', () => {
    // Trajectory positions going straight toward an asteroid
    const positions = [
      { x: 0, y: 0, heading: 0 },
      { x: 10, y: 0, heading: 0 },
      { x: 20, y: 0, heading: 0 },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };
    // Asteroid overlapping at step 2
    const asteroids = [{ x: 20, y: 0, vx: 0, vy: 0, collisionRadius: 25 }];

    const score = scoreTrajectory(positions, target, asteroids, 0.1);

    expect(score).toBeLessThan(-1000);
  });

  it('gives better score when closer to target', () => {
    const farPositions = [
      { x: 0, y: 0, heading: 0 },
      { x: 10, y: 0, heading: 0 },
    ];
    const nearPositions = [
      { x: 0, y: 0, heading: 0 },
      { x: 400, y: 0, heading: 0 },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const farScore = scoreTrajectory(farPositions, target, [], 0.1);
    const nearScore = scoreTrajectory(nearPositions, target, [], 0.1);

    expect(nearScore).toBeGreaterThan(farScore);
  });

  it('gives aim bonus when pointed toward target', () => {
    // Ship pointed at target
    const aimedPositions = [
      { x: 0, y: 0, heading: 0 },
      { x: 100, y: 0, heading: 0 },
    ];
    // Ship pointed away from target
    const awayPositions = [
      { x: 0, y: 0, heading: Math.PI },
      { x: -100, y: 0, heading: Math.PI },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const aimedScore = scoreTrajectory(aimedPositions, target, [], 0.1);
    const awayScore = scoreTrajectory(awayPositions, target, [], 0.1);

    expect(aimedScore).toBeGreaterThan(awayScore);
  });

  it('returns a finite number with no asteroids', () => {
    const positions = [
      { x: 0, y: 0, heading: 0 },
      { x: 50, y: 0, heading: 0 },
    ];
    const target = { x: 300, y: 0, vx: 0, vy: 0 };

    const score = scoreTrajectory(positions, target, [], 0.1);

    expect(Number.isFinite(score)).toBe(true);
  });
});

describe('ai-predictive: selectBestAction', () => {
  it('returns an action object with control flags', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    const action = selectBestAction(ship, target, []);

    expect(typeof action.thrust).toBe('boolean');
    expect(typeof action.rotatingLeft).toBe('boolean');
    expect(typeof action.rotatingRight).toBe('boolean');
    expect(typeof action.braking).toBe('boolean');
  });

  it('prefers thrusting toward target when path is clear', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    const action = selectBestAction(ship, target, []);

    // Target is directly ahead — thrust straight should be best
    expect(action.thrust).toBe(true);
    expect(action.braking).toBe(false);
  });

  it('avoids asteroid directly ahead when ship has velocity', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ship.vx = 300; // Moving toward asteroid — coasting also leads to collision
    const target = createShip({ x: 1000, y: 0, heading: 0, owner: 'player' });
    // Large asteroid directly ahead
    const asteroids = [{ x: 150, y: 0, vx: 0, vy: 0, collisionRadius: 40 }];

    const action = selectBestAction(ship, target, asteroids);

    // Should choose to turn rather than go straight into asteroid
    expect(action.rotatingLeft || action.rotatingRight).toBe(true);
  });
});

describe('ai-predictive: predictiveStrategy', () => {
  it('has createState and update methods', () => {
    expect(typeof predictiveStrategy.createState).toBe('function');
    expect(typeof predictiveStrategy.update).toBe('function');
  });

  it('createState returns an object', () => {
    const state = predictiveStrategy.createState();
    expect(typeof state).toBe('object');
    expect(state).not.toBeNull();
  });

  it('update sets control flags on the ship', () => {
    const state = predictiveStrategy.createState();
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    predictiveStrategy.update(state, ship, target, [], 0.016);

    // Should have made some decision
    expect(typeof ship.thrust).toBe('boolean');
    expect(typeof ship.rotatingLeft).toBe('boolean');
    expect(typeof ship.rotatingRight).toBe('boolean');
    expect(typeof ship.braking).toBe('boolean');
    expect(typeof ship.fire).toBe('boolean');
  });

  it('clears all flags when AI ship is dead', () => {
    const state = predictiveStrategy.createState();
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ship.alive = false;
    ship.thrust = true;
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    predictiveStrategy.update(state, ship, target, [], 0.016);

    expect(ship.thrust).toBe(false);
    expect(ship.rotatingLeft).toBe(false);
    expect(ship.rotatingRight).toBe(false);
    expect(ship.braking).toBe(false);
    expect(ship.fire).toBe(false);
  });

  it('clears all flags when target ship is dead', () => {
    const state = predictiveStrategy.createState();
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    target.alive = false;

    predictiveStrategy.update(state, ship, target, [], 0.016);

    expect(ship.thrust).toBe(false);
    expect(ship.fire).toBe(false);
  });

  it('fires when aimed at nearby target directly ahead', () => {
    const state = predictiveStrategy.createState();
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });

    predictiveStrategy.update(state, ship, target, [], 0.016);

    expect(ship.fire).toBe(true);
  });

  it('does not fire when target is far away', () => {
    const state = predictiveStrategy.createState();
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 2000, y: 0, heading: 0, owner: 'player' });

    predictiveStrategy.update(state, ship, target, [], 0.016);

    expect(ship.fire).toBe(false);
  });
});
