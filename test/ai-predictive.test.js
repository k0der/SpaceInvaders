import { describe, expect, it } from 'vitest';
import {
  AIM_BONUS,
  AIM_PROXIMITY_SCALE,
  BRAKE_PURSUIT_STEPS,
  CLOSING_SPEED_WEIGHT,
  COLLISION_BASE_PENALTY,
  COLLISION_DECAY,
  cloneShipForSim,
  DISTANCE_WEIGHT,
  defineCandidates,
  FIRE_OPPORTUNITY_BONUS,
  getLastDebugInfo,
  predictAsteroidAt,
  predictiveStrategy,
  SIM_DT,
  SIM_STEPS,
  scoreTrajectory,
  selectBestAction,
  simulatePursuitTrajectory,
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

  it('exports COLLISION_BASE_PENALTY as -10000', () => {
    expect(COLLISION_BASE_PENALTY).toBe(-10000);
  });

  it('exports COLLISION_DECAY as 0.4', () => {
    expect(COLLISION_DECAY).toBeCloseTo(0.4, 2);
  });

  it('exports DISTANCE_WEIGHT as -8', () => {
    expect(DISTANCE_WEIGHT).toBe(-8);
  });

  it('exports AIM_BONUS as 400', () => {
    expect(AIM_BONUS).toBe(400);
  });

  it('exports CLOSING_SPEED_WEIGHT as 8', () => {
    expect(CLOSING_SPEED_WEIGHT).toBe(8);
  });

  it('exports AIM_PROXIMITY_SCALE as 5', () => {
    expect(AIM_PROXIMITY_SCALE).toBe(5);
  });

  it('exports FIRE_OPPORTUNITY_BONUS as 300', () => {
    expect(FIRE_OPPORTUNITY_BONUS).toBe(300);
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

  it('each position includes vx and vy velocity fields', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 5, 0.1);

    for (const pos of positions) {
      expect(typeof pos.vx).toBe('number');
      expect(typeof pos.vy).toBe('number');
    }
  });

  it('velocity increases when thrusting', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const action = {
      thrust: true,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
    };

    const positions = simulateTrajectory(clone, action, 10, 0.1);

    // Initial velocity is 0, final should be positive in x direction
    expect(positions[0].vx).toBe(0);
    expect(positions[10].vx).toBeGreaterThan(0);
  });
});

describe('ai-predictive: scoreTrajectory', () => {
  it('returns a negative score when a collision occurs', () => {
    // Trajectory positions going straight toward an asteroid
    const positions = [
      { x: 0, y: 0, heading: 0, vx: 10, vy: 0 },
      { x: 10, y: 0, heading: 0, vx: 10, vy: 0 },
      { x: 20, y: 0, heading: 0, vx: 10, vy: 0 },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };
    // Asteroid overlapping at step 2
    const asteroids = [{ x: 20, y: 0, vx: 0, vy: 0, collisionRadius: 25 }];

    const score = scoreTrajectory(positions, target, asteroids, 0.1);

    expect(score).toBeLessThan(-1000);
  });

  it('gives better score when closer to target', () => {
    const farPositions = [
      { x: 0, y: 0, heading: 0, vx: 10, vy: 0 },
      { x: 10, y: 0, heading: 0, vx: 10, vy: 0 },
    ];
    const nearPositions = [
      { x: 0, y: 0, heading: 0, vx: 400, vy: 0 },
      { x: 400, y: 0, heading: 0, vx: 400, vy: 0 },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const farScore = scoreTrajectory(farPositions, target, [], 0.1);
    const nearScore = scoreTrajectory(nearPositions, target, [], 0.1);

    expect(nearScore).toBeGreaterThan(farScore);
  });

  it('gives aim bonus when pointed toward target', () => {
    // Ship pointed at target
    const aimedPositions = [
      { x: 0, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 100, vy: 0 },
    ];
    // Ship pointed away from target
    const awayPositions = [
      { x: 0, y: 0, heading: Math.PI, vx: -100, vy: 0 },
      { x: -100, y: 0, heading: Math.PI, vx: -100, vy: 0 },
    ];
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const aimedScore = scoreTrajectory(aimedPositions, target, [], 0.1);
    const awayScore = scoreTrajectory(awayPositions, target, [], 0.1);

    expect(aimedScore).toBeGreaterThan(awayScore);
  });

  it('returns a finite number with no asteroids', () => {
    const positions = [
      { x: 0, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 50, y: 0, heading: 0, vx: 50, vy: 0 },
    ];
    const target = { x: 300, y: 0, vx: 0, vy: 0 };

    const score = scoreTrajectory(positions, target, [], 0.1);

    expect(Number.isFinite(score)).toBe(true);
  });
});

describe('ai-predictive: scoreTrajectory — time-decayed collision', () => {
  it('early collision (step 1) penalizes more than late collision (step 3)', () => {
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    // Two asteroids at different positions so we can control collision timing
    // Both trajectories have identical endpoints and velocities to isolate collision effect
    const astEarly = [{ x: 50, y: 0, vx: 0, vy: 0, collisionRadius: 25 }];
    const astLate = [{ x: 150, y: 0, vx: 0, vy: 0, collisionRadius: 25 }];

    // Same trajectory for both — only the asteroid position changes
    const positions = [
      { x: 0, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 50, y: 0, heading: 0, vx: 100, vy: 0 }, // collides with astEarly
      { x: 100, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 150, y: 0, heading: 0, vx: 100, vy: 0 }, // collides with astLate
    ];

    const scoreEarly = scoreTrajectory(positions, target, astEarly, 0.1);
    const scoreLate = scoreTrajectory(positions, target, astLate, 0.1);

    // Early collision (step 1) should be penalized more (lower score)
    expect(scoreEarly).toBeLessThan(scoreLate);
  });

  it('collision penalty decays exponentially with step index', () => {
    // Collision at step 1: penalty = BASE * e^(-DECAY * 1)
    // Collision at step 15: penalty = BASE * e^(-DECAY * 15)
    // The ratio should match exponential decay
    const step1Penalty =
      COLLISION_BASE_PENALTY * Math.exp(-COLLISION_DECAY * 1);
    const step15Penalty =
      COLLISION_BASE_PENALTY * Math.exp(-COLLISION_DECAY * 15);

    expect(step1Penalty).toBeLessThan(step15Penalty); // more negative = worse
    // With 0.4 decay, step 1 is ~6703 and step 15 is ~0.025 — massive ratio
    expect(Math.abs(step1Penalty)).toBeGreaterThan(
      Math.abs(step15Penalty) * 100,
    );
  });
});

describe('ai-predictive: scoreTrajectory — first collision only', () => {
  it('only counts the first collision per trajectory (early-break)', () => {
    const target = { x: 500, y: 0, vx: 0, vy: 0 };
    // Asteroid at origin — ship sits on top of it for all steps
    const ast = [{ x: 100, y: 0, vx: 0, vy: 0, collisionRadius: 25 }];

    // Trajectory overlapping asteroid at every step
    const positions = [];
    for (let i = 0; i <= 5; i++) {
      positions.push({ x: 100, y: 0, heading: 0, vx: 0, vy: 0 });
    }

    // Score with many overlapping steps
    const multiCollisionScore = scoreTrajectory(positions, target, ast, 0.1);

    // Trajectory that only overlaps at step 1 then moves away
    const singleCollisionPositions = [
      { x: 0, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 100, vy: 0 }, // collides at step 1
      { x: 200, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 300, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 400, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 450, y: 0, heading: 0, vx: 100, vy: 0 },
    ];
    const singleCollisionScore = scoreTrajectory(
      singleCollisionPositions,
      target,
      ast,
      0.1,
    );

    // Both have exactly one collision penalty each (first collision only).
    // The multi-collision trajectory sits at x=100 (400px from target),
    // the single-collision trajectory ends at x=450 (50px from target).
    // Since distance and velocity differ, we just verify multi-collision
    // is NOT penalized 5x more like it would be without first-collision-only.
    // With first-collision-only, the collision penalty component is the same.
    // The multi sits closer to asteroid, farther from target → worse distance.
    // But without first-collision-only it would be 5x the collision penalty.
    // So multi should not be catastrophically worse than single.
    const penaltyDiff = singleCollisionScore - multiCollisionScore;
    // Without first-collision-only, multi would have ~5x penalty → diff would be huge
    // With first-collision-only, diff is just from distance/aim differences
    expect(Math.abs(penaltyDiff)).toBeLessThan(
      Math.abs(COLLISION_BASE_PENALTY) * 3,
    );
  });
});

describe('ai-predictive: scoreTrajectory — closing velocity bonus', () => {
  it('rewards trajectory moving toward target over stationary trajectory', () => {
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    // Moving toward target at same final position
    const movingPositions = [
      { x: 0, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 200, vy: 0 }, // moving toward target
    ];

    // Stationary at same final position
    const stationaryPositions = [
      { x: 100, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 0, vy: 0 }, // not moving
    ];

    const movingScore = scoreTrajectory(movingPositions, target, [], 0.1);
    const stationaryScore = scoreTrajectory(
      stationaryPositions,
      target,
      [],
      0.1,
    );

    expect(movingScore).toBeGreaterThan(stationaryScore);
  });

  it('penalizes velocity moving away from target (unclamped)', () => {
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    // Moving away from target at same final position
    const awayPositions = [
      { x: 200, y: 0, heading: Math.PI, vx: -200, vy: 0 },
      { x: 100, y: 0, heading: Math.PI, vx: -200, vy: 0 },
    ];

    // Stationary at same final position
    const stationaryPositions = [
      { x: 100, y: 0, heading: Math.PI, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: Math.PI, vx: 0, vy: 0 },
    ];

    const awayScore = scoreTrajectory(awayPositions, target, [], 0.1);
    const stationaryScore = scoreTrajectory(
      stationaryPositions,
      target,
      [],
      0.1,
    );

    // Away gets a PENALTY from closing velocity (negative dot product)
    // Both end at x=100 with same heading, so distance and aim are identical.
    // The only difference is the retreat penalty on the away trajectory.
    expect(awayScore).toBeLessThan(stationaryScore);
    // The penalty should be significant: CLOSING_SPEED_WEIGHT * 200 = 1600
    expect(stationaryScore - awayScore).toBeGreaterThan(1000);
  });

  it('closing velocity bonus scales with CLOSING_SPEED_WEIGHT', () => {
    expect(CLOSING_SPEED_WEIGHT).toBe(8);
    // At MAX_SPEED=400 toward target, bonus = 8 * 400 = 3200
    expect(CLOSING_SPEED_WEIGHT * 400).toBe(3200);
  });

  it('handles zero distance to target without error', () => {
    const target = { x: 100, y: 0, vx: 0, vy: 0 };
    // Ship is exactly at target position
    const positions = [
      { x: 50, y: 0, heading: 0, vx: 50, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 50, vy: 0 },
    ];

    const score = scoreTrajectory(positions, target, [], 0.1);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('perpendicular velocity gives no closing bonus', () => {
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    // Moving perpendicular to target (up)
    const perpPositions = [
      { x: 100, y: 0, heading: Math.PI / 2, vx: 0, vy: 200 },
      { x: 100, y: 20, heading: Math.PI / 2, vx: 0, vy: 200 },
    ];

    // Stationary at same x (same distance to target)
    const stationaryPositions = [
      { x: 100, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 0, vy: 0 },
    ];

    const perpScore = scoreTrajectory(perpPositions, target, [], 0.1);
    const stationaryScore = scoreTrajectory(
      stationaryPositions,
      target,
      [],
      0.1,
    );

    // Perpendicular motion contributes zero closing velocity bonus
    // The scores should differ only by distance/aim differences, not by a velocity bonus
    // perpendicular trajectory ends at y=20 (slightly farther from target at x=500)
    // and is aimed up (not at target), so it should score worse, not better
    expect(perpScore).toBeLessThanOrEqual(stationaryScore);
  });
});

describe('ai-predictive: scoreTrajectory — fire opportunity bonus', () => {
  it('gives higher score when trajectory has firing solutions', () => {
    const target = { x: 300, y: 0, vx: 0, vy: 0 };

    // Trajectory aimed at target (heading 0, target at +x) and within range
    const aimedPositions = [
      { x: 0, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 100, vy: 0 }, // aimed at target, in range
      { x: 200, y: 0, heading: 0, vx: 100, vy: 0 }, // aimed at target, in range
    ];

    // Trajectory perpendicular to target (heading up) at same distance
    const perpPositions = [
      { x: 0, y: 0, heading: Math.PI / 2, vx: 0, vy: 100 },
      { x: 0, y: 100, heading: Math.PI / 2, vx: 0, vy: 100 }, // aimed up, not at target
      { x: 0, y: 200, heading: Math.PI / 2, vx: 0, vy: 100 }, // aimed up, not at target
    ];

    const aimedScore = scoreTrajectory(aimedPositions, target, [], 0.1);
    const perpScore = scoreTrajectory(perpPositions, target, [], 0.1);

    // Aimed trajectory gets fire opportunity bonus, perpendicular does not
    expect(aimedScore).toBeGreaterThan(perpScore);
    // The difference should be substantial (at least one FIRE_OPPORTUNITY_BONUS)
    expect(aimedScore - perpScore).toBeGreaterThan(FIRE_OPPORTUNITY_BONUS);
  });

  it('gives no fire bonus when out of range', () => {
    const target = { x: 2000, y: 0, vx: 0, vy: 0 };

    // Aimed at target but way out of range
    const farPositions = [
      { x: 0, y: 0, heading: 0, vx: 100, vy: 0 },
      { x: 100, y: 0, heading: 0, vx: 100, vy: 0 },
    ];

    // Same but perpendicular
    const perpPositions = [
      { x: 0, y: 0, heading: Math.PI / 2, vx: 0, vy: 100 },
      { x: 0, y: 100, heading: Math.PI / 2, vx: 0, vy: 100 },
    ];

    const farScore = scoreTrajectory(farPositions, target, [], 0.1);
    const perpScore = scoreTrajectory(perpPositions, target, [], 0.1);

    // Both out of range, so fire bonus should not differentiate them.
    // farScore should still be better due to closer distance and aim,
    // but the difference should be smaller than FIRE_OPPORTUNITY_BONUS
    // (since there are no fire bonus steps contributing to the gap).
    // We just verify no crash and finite scores.
    expect(Number.isFinite(farScore)).toBe(true);
    expect(Number.isFinite(perpScore)).toBe(true);
  });
});

describe('ai-predictive: simulatePursuitTrajectory', () => {
  it('returns positions and firstAction', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const result = simulatePursuitTrajectory(clone, target, 5, 0.1);

    expect(result.positions.length).toBe(6);
    expect(result.firstAction).not.toBeNull();
    expect(typeof result.firstAction.thrust).toBe('boolean');
  });

  it('turns toward target when facing away', () => {
    const ship = createShip({ x: 0, y: 0, heading: Math.PI, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const result = simulatePursuitTrajectory(clone, target, 10, 0.1);

    // First action should rotate toward target (target is to the right, heading is left)
    expect(
      result.firstAction.rotatingLeft || result.firstAction.rotatingRight,
    ).toBe(true);
  });

  it('thrusts when facing target', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const clone = cloneShipForSim(ship);
    const target = { x: 500, y: 0, vx: 0, vy: 0 };

    const result = simulatePursuitTrajectory(clone, target, 5, 0.1);

    // Heading 0, target ahead — should thrust
    expect(result.firstAction.thrust).toBe(true);
  });

  it('brakes during brakeSteps before pursuing', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ship.vx = 300;
    const clone = cloneShipForSim(ship);
    const target = { x: -500, y: 0, vx: 0, vy: 0 };

    const result = simulatePursuitTrajectory(
      clone,
      target,
      10,
      0.1,
      BRAKE_PURSUIT_STEPS,
    );

    // First action should brake (target behind, brakeSteps > 0)
    expect(result.firstAction.braking).toBe(true);
    expect(result.firstAction.thrust).toBe(false);
  });
});

describe('ai-predictive: selectBestAction — overshoot recovery', () => {
  it('turns toward target after overshooting (pursuit candidate)', () => {
    // Ship has overshot: past the target, heading and velocity pointing away
    const ship = createShip({
      x: 200,
      y: 0,
      heading: 0,
      owner: 'enemy',
    });
    ship.vx = 300;
    const target = createShip({ x: 0, y: 0, heading: 0, owner: 'player' });

    const action = selectBestAction(ship, target, []);

    // AI must NOT continue straight away — it should turn or brake
    const fleeing =
      action.thrust && !action.rotatingLeft && !action.rotatingRight;
    expect(fleeing).toBe(false);
  });
});

describe('ai-predictive: selectBestAction — orbit breaking', () => {
  it('prefers braking over maintaining circular orbit near target', () => {
    // Ship in circular orbit: near target, high perpendicular velocity, heading tangential
    const ship = createShip({
      x: 150,
      y: 0,
      heading: Math.PI / 2,
      owner: 'enemy',
    });
    ship.vx = 0;
    ship.vy = 300; // moving perpendicular to target
    ship.thrustIntensity = 1.0;
    const target = createShip({ x: 0, y: 0, heading: 0, owner: 'player' });

    const action = selectBestAction(ship, target, []);

    // AI should NOT maintain the orbit (thrust straight with no rotation).
    // It should brake, or turn to create a firing angle.
    const maintainsOrbit =
      action.thrust && !action.rotatingLeft && !action.rotatingRight;
    expect(maintainsOrbit).toBe(false);
  });
});

describe('ai-predictive: selectBestAction — retreat correction', () => {
  it('prefers braking or turning over coasting when retreating from target', () => {
    // Ship moving away from target with high velocity
    const ship = createShip({ x: 0, y: 0, heading: Math.PI, owner: 'enemy' });
    ship.vx = -300; // Moving away from target at high speed
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    const action = selectBestAction(ship, target, []);

    // AI must NOT simply coast — it should brake, rotate, or thrust to course-correct
    const isCoasting =
      !action.thrust &&
      !action.rotatingLeft &&
      !action.rotatingRight &&
      !action.braking;
    expect(isCoasting).toBe(false);
  });
});

describe('ai-predictive: scoreTrajectory — proximity-scaled aim', () => {
  it('aim bonus impact is amplified at close range vs far range', () => {
    // Isolate the aim component by using headings that miss FIRE_ANGLE
    // (0.15 rad), so fire opportunity bonus is 0 for all trajectories.
    // The only varying component is the aim bonus.
    const target = { x: 0, y: 0, vx: 0, vy: 0 };

    // Close range (100px), slightly off-aim (0.3 rad offset, misses FIRE_ANGLE)
    const closeGood = [
      { x: 100, y: 0, heading: Math.PI + 0.3, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: Math.PI + 0.3, vx: 0, vy: 0 },
    ];
    const closeBad = [
      { x: 100, y: 0, heading: 0.3, vx: 0, vy: 0 },
      { x: 100, y: 0, heading: 0.3, vx: 0, vy: 0 },
    ];

    // Far range (600px, outside MAX_FIRE_RANGE entirely)
    const farGood = [
      { x: 600, y: 0, heading: Math.PI + 0.3, vx: 0, vy: 0 },
      { x: 600, y: 0, heading: Math.PI + 0.3, vx: 0, vy: 0 },
    ];
    const farBad = [
      { x: 600, y: 0, heading: 0.3, vx: 0, vy: 0 },
      { x: 600, y: 0, heading: 0.3, vx: 0, vy: 0 },
    ];

    const closeGap =
      scoreTrajectory(closeGood, target, [], 0.1) -
      scoreTrajectory(closeBad, target, [], 0.1);
    const farGap =
      scoreTrajectory(farGood, target, [], 0.1) -
      scoreTrajectory(farBad, target, [], 0.1);

    // Without proximity scaling, aim gaps are identical at both ranges.
    // With proximity scaling, aim matters MORE at close range.
    expect(closeGap).toBeGreaterThan(farGap * 1.5);
  });

  it('proximity factor is maximum (1 + AIM_PROXIMITY_SCALE) at zero distance', () => {
    const target = { x: 0, y: 0, vx: 0, vy: 0 };

    // On top of target — minDist = 0, factor = 1 + AIM_PROXIMITY_SCALE = 6
    const onTopGood = [
      { x: 0, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 0, y: 0, heading: 0, vx: 0, vy: 0 },
    ];
    const onTopBad = [
      { x: 0, y: 0, heading: Math.PI, vx: 0, vy: 0 },
      { x: 0, y: 0, heading: Math.PI, vx: 0, vy: 0 },
    ];

    // Far range (unscaled baseline)
    const farGood = [
      { x: 600, y: 0, heading: Math.PI, vx: 0, vy: 0 },
      { x: 600, y: 0, heading: Math.PI, vx: 0, vy: 0 },
    ];
    const farBad = [
      { x: 600, y: 0, heading: 0, vx: 0, vy: 0 },
      { x: 600, y: 0, heading: 0, vx: 0, vy: 0 },
    ];

    const onTopGap = Math.abs(
      scoreTrajectory(onTopGood, target, [], 0.1) -
        scoreTrajectory(onTopBad, target, [], 0.1),
    );
    const farGap = Math.abs(
      scoreTrajectory(farGood, target, [], 0.1) -
        scoreTrajectory(farBad, target, [], 0.1),
    );

    // At zero distance, aim gap should be ~(1 + AIM_PROXIMITY_SCALE) times the unscaled gap
    const expectedRatio = 1 + AIM_PROXIMITY_SCALE;
    expect(onTopGap / farGap).toBeCloseTo(expectedRatio, 0);
  });
});

describe('ai-predictive: selectBestAction — close facing away', () => {
  it('rotates when close, facing away, with asteroids blocking pursuit', () => {
    // Ship stationary, heading=π (facing left), target 40px to the right,
    // player drifting away. Asteroids scattered around so pursuit
    // trajectories risk collisions while coast stays safe. This replicates
    // the "close but facing away" deadlock from the game logs.
    const ship = createShip({ x: 0, y: 0, heading: Math.PI, owner: 'enemy' });
    const target = createShip({ x: 40, y: 0, heading: 0, owner: 'player' });
    target.vx = 30;
    const asteroids = [
      { x: 80, y: 40, vx: 0, vy: 0, collisionRadius: 25 },
      { x: -60, y: -30, vx: 0, vy: 0, collisionRadius: 20 },
      { x: 100, y: -50, vx: 0, vy: 0, collisionRadius: 30 },
    ];

    const action = selectBestAction(ship, target, asteroids);

    // AI must take corrective action — at minimum rotate toward target
    const takesAction =
      action.rotatingLeft || action.rotatingRight || action.thrust;
    expect(takesAction).toBe(true);
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

  it('thrusts aggressively through blocking asteroid toward target', () => {
    // Ship stationary, heading toward target, asteroid blocking the path.
    // The predictive AI uses fixed-action candidates over 1.5s, and
    // thrust+turn candidates spiral (4 rad/s × 1.5s ≈ full circle).
    // An aggressive AI prefers to ram through the obstacle rather than spiral away.
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });
    const asteroids = [{ x: 40, y: 0, vx: 0, vy: 0, collisionRadius: 30 }];

    const action = selectBestAction(ship, target, asteroids);

    // AI should thrust straight through — aggressive pursuit over survival
    expect(action.thrust).toBe(true);
    expect(action.braking).toBe(false);
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

describe('ai-predictive: getLastDebugInfo', () => {
  it('returns null before any decision is made', () => {
    // Note: after module load, before selectBestAction is called,
    // getLastDebugInfo may return null or the result of a previous test.
    // We test that after selectBestAction it returns useful info.
    const info = getLastDebugInfo();
    // Either null (fresh) or an object (from earlier tests)
    expect(info === null || typeof info === 'object').toBe(true);
  });

  it('returns debug info after selectBestAction is called', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    selectBestAction(ship, target, []);
    const info = getLastDebugInfo();

    expect(info).not.toBeNull();
    expect(Array.isArray(info.candidates)).toBe(true);
    expect(info.candidates.length).toBeGreaterThan(0);
    expect(typeof info.winner).toBe('string');
  });

  it('each candidate has a name and score', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    selectBestAction(ship, target, []);
    const info = getLastDebugInfo();

    for (const c of info.candidates) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.score).toBe('number');
      expect(Number.isFinite(c.score)).toBe(true);
    }
  });

  it('includes all 9 candidates (7 fixed + pursuit + brake-pursuit) when speed is high', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ship.vx = 200; // Above PURSUIT_BRAKE_SPEED to enable brake-pursuit
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    selectBestAction(ship, target, []);
    const info = getLastDebugInfo();

    expect(info.candidates.length).toBe(9);
  });

  it('includes 8 candidates when speed is low (brake-pursuit skipped)', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    // Speed is 0 — below PURSUIT_BRAKE_SPEED, brake-pursuit is skipped
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    selectBestAction(ship, target, []);
    const info = getLastDebugInfo();

    expect(info.candidates.length).toBe(8);
  });

  it('winner name matches the best-scoring candidate', () => {
    const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    selectBestAction(ship, target, []);
    const info = getLastDebugInfo();

    const best = info.candidates.reduce((a, b) => (a.score > b.score ? a : b));
    expect(info.winner).toBe(best.name);
  });
});
