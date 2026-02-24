import { describe, expect, it } from 'vitest';
import {
  ASTEROID_PENALTY_RADIUS,
  computeReward,
  DANGER_RADIUS_BASE,
  DEFAULT_REWARD_WEIGHTS,
  ENGAGE_DISTANCE,
  NEAR_MISS_RADIUS_FACTOR,
} from '../src/reward.js';

// --- Test helpers ---

/** Create a minimal ship object for reward tests. */
function makeShip(overrides = {}) {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    alive: true,
    ...overrides,
  };
}

/** Create a minimal game state for reward tests. */
function makeState(overrides = {}) {
  return {
    ship: makeShip(overrides.ship),
    target: makeShip({ x: 300, y: 0, alive: true, ...overrides.target }),
    asteroids: overrides.asteroids || [],
    shipHP: overrides.shipHP ?? 5,
    targetHP: overrides.targetHP ?? 5,
    tick: overrides.tick ?? 0,
  };
}

/** Zero-weight config: all rewards off. Use for isolating individual components. */
function zeroWeights(overrides = {}) {
  const w = {};
  for (const key of Object.keys(DEFAULT_REWARD_WEIGHTS)) {
    w[key] = 0;
  }
  return { ...w, ...overrides };
}

/** Default config with optional weight overrides. */
function makeConfig(overrides = {}) {
  return {
    rewardWeights: overrides.rewardWeights || undefined,
    maxTicks: overrides.maxTicks ?? 3600,
    shipHP: overrides.shipHP ?? 5,
  };
}

// --- Tests ---

describe('DEFAULT_REWARD_WEIGHTS', () => {
  it('exports all 14 reward weight keys', () => {
    const expected = [
      'survival',
      'aim',
      'closing',
      'hit',
      'gotHit',
      'nearMiss',
      'firePenalty',
      'win',
      'loss',
      'draw',
      'timeout',
      'engagePenalty',
      'proximity',
      'asteroidPenalty',
    ];
    expect(Object.keys(DEFAULT_REWARD_WEIGHTS).sort()).toEqual(expected.sort());
  });

  it('has correct default values', () => {
    expect(DEFAULT_REWARD_WEIGHTS).toEqual({
      survival: 0.001,
      aim: 0.01,
      closing: 0.01,
      hit: 1.0,
      gotHit: -1.0,
      nearMiss: -0.1,
      firePenalty: -0.002,
      win: 5.0,
      loss: -5.0,
      draw: -2.0,
      timeout: -1.0,
      engagePenalty: 0.0,
      proximity: 0.0,
      asteroidPenalty: 0.0,
    });
  });
});

describe('computeReward — dead agent returns 0', () => {
  it('returns 0.0 when ship is dead regardless of other conditions', () => {
    const prev = makeState({ shipHP: 1 });
    const curr = makeState({ ship: { alive: false }, shipHP: 0, targetHP: 0 });
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig();
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('returns 0.0 for dead agent even with custom weights', () => {
    const prev = makeState();
    const curr = makeState({ ship: { alive: false }, shipHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: { survival: 100, win: 1000 },
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — survival', () => {
  it('awards survival bonus when agent is alive', () => {
    const survivalWeight = 1.0;
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ survival: survivalWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      survivalWeight,
      5,
    );
  });
});

describe('computeReward — aim alignment', () => {
  it('awards max aim when facing target directly (0° bearing), dist < 600', () => {
    // Ship at origin, heading 0 (right), target at (300, 0) — directly ahead
    const aimWeight = 1.0;
    const prev = makeState();
    const curr = makeState({
      ship: { heading: 0 },
      target: { x: 300, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: aimWeight }),
    });
    // cos(0) = 1.0
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      aimWeight * 1.0,
      5,
    );
  });

  it('awards zero aim at 90° bearing', () => {
    // Ship at origin, heading 0 (right), target at (0, 300) — 90° bearing
    const aimWeight = 1.0;
    const prev = makeState();
    const curr = makeState({
      ship: { heading: 0 },
      target: { x: 0, y: 300 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: aimWeight }),
    });
    // cos(π/2) ≈ 0
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(0.0, 4);
  });

  it('awards negative aim at 180° (facing away)', () => {
    // Ship at origin, heading 0 (right), target at (-300, 0) — directly behind
    const aimWeight = 1.0;
    const prev = makeState();
    const curr = makeState({
      ship: { heading: 0 },
      target: { x: -300, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: aimWeight }),
    });
    // cos(π) = -1.0
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      aimWeight * -1.0,
      5,
    );
  });

  it('awards zero aim when distance >= 600px', () => {
    const aimWeight = 1.0;
    const prev = makeState();
    const curr = makeState({
      ship: { heading: 0 },
      target: { x: 600, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: aimWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('awards aim when distance just under 600px', () => {
    const aimWeight = 1.0;
    const prev = makeState();
    const curr = makeState({
      ship: { heading: 0 },
      target: { x: 599, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: aimWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(1.0, 5);
  });
});

describe('computeReward — closing distance', () => {
  it('awards positive reward when closing distance', () => {
    const closingWeight = 1.0;
    // Target at 300,0 in both states; ship moves closer
    const prev = makeState({
      ship: { x: -100, y: 0 },
      target: { x: 300, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 300, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ closing: closingWeight }),
    });
    // prevDist = 400, currDist = 300, delta = 100
    // reward = 1.0 * 100 / 1000 = 0.1
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(0.1, 5);
  });

  it('awards zero when retreating (distance increasing)', () => {
    const closingWeight = 1.0;
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 300, y: 0 },
    });
    const curr = makeState({
      ship: { x: -100, y: 0 },
      target: { x: 300, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ closing: closingWeight }),
    });
    // prevDist = 300, currDist = 400, delta = -100 → 0 (closing only)
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('awards zero when stationary (same distance)', () => {
    const closingWeight = 1.0;
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ closing: closingWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — hit landed', () => {
  it('awards hit when targetHP decreased', () => {
    const hitWeight = 1.0;
    const prev = makeState({ targetHP: 5 });
    const curr = makeState({ targetHP: 4 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ hit: hitWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(hitWeight, 5);
  });

  it('awards zero when targetHP unchanged', () => {
    const hitWeight = 1.0;
    const prev = makeState({ targetHP: 5 });
    const curr = makeState({ targetHP: 5 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ hit: hitWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — got hit', () => {
  it('applies gotHit penalty when shipHP decreased', () => {
    const gotHitWeight = -1.0;
    const prev = makeState({ shipHP: 5 });
    const curr = makeState({ shipHP: 4 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ gotHit: gotHitWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      gotHitWeight,
      5,
    );
  });

  it('awards zero when shipHP unchanged', () => {
    const gotHitWeight = -1.0;
    const prev = makeState({ shipHP: 5 });
    const curr = makeState({ shipHP: 5 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ gotHit: gotHitWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — near-miss', () => {
  it('applies penalty for asteroid within danger radius', () => {
    const nearMissWeight = -1.0;
    // Ship at origin, asteroid at (30, 0) with collisionRadius 20
    // dangerRadius = 3 * 20 + 40 = 100, dist = 30
    // penalty = -1.0 * (1 - 30/100)^2 = -1.0 * 0.49
    const asteroid = { x: 30, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-0.49, 5);
  });

  it('applies no penalty when asteroid beyond danger radius', () => {
    const nearMissWeight = -1.0;
    // Ship at origin, asteroid at (150, 0) with collisionRadius 20
    // dangerRadius = 3 * 20 + 40 = 100, dist = 150 > 100 → no penalty
    const asteroid = { x: 150, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('sums penalties across multiple close asteroids', () => {
    const nearMissWeight = -1.0;
    // Two asteroids at same distance
    const a1 = { x: 30, y: 0, collisionRadius: 20 };
    const a2 = { x: 0, y: 30, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [a1, a2] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    // dangerRadius = 3 * 20 + 40 = 100
    // Each: -1.0 * (1 - 30/100)^2 = -0.49; total = -0.98
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-0.98, 5);
  });

  it('applies no penalty when no asteroids', () => {
    const nearMissWeight = -1.0;
    const prev = makeState();
    const curr = makeState({ asteroids: [] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies maximum penalty when asteroid at zero distance', () => {
    const nearMissWeight = -1.0;
    // Asteroid at ship position: dist = 0
    // dangerRadius = 3 * 20 + 40 = 100, penalty = -1.0 * (1 - 0/100)^2 = -1.0
    const asteroid = { x: 0, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-1.0, 5);
  });

  it('applies penalty at danger radius boundary edge (just inside)', () => {
    const nearMissWeight = -1.0;
    // Asteroid at exactly dangerRadius minus epsilon
    // dangerRadius = 3 * 20 + 40 = 100
    const asteroid = { x: 99.9, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: nearMissWeight }),
    });
    const result = computeReward(prev, curr, action, config);
    expect(result).toBeLessThan(0);
    // Small but non-zero
    expect(result).toBeGreaterThan(-0.01);
  });
});

describe('computeReward — fire discipline', () => {
  it('applies fire penalty when fireAction === 1', () => {
    const firePenaltyWeight = -1.0;
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ firePenalty: firePenaltyWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      firePenaltyWeight,
      5,
    );
  });

  it('applies no penalty when fireAction === 0', () => {
    const firePenaltyWeight = -1.0;
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ firePenalty: firePenaltyWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — terminal: win', () => {
  it('awards win reward when targetHP <= 0', () => {
    const winWeight = 5.0;
    const prev = makeState({ targetHP: 1 });
    const curr = makeState({ targetHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ win: winWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(winWeight, 5);
  });

  it('awards win reward when targetHP is negative', () => {
    const winWeight = 5.0;
    const prev = makeState({ targetHP: 1 });
    const curr = makeState({ targetHP: -1 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ win: winWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(winWeight, 5);
  });
});

describe('computeReward — terminal: loss', () => {
  it('returns 0 when dead agent (alive=false)', () => {
    // Agent is dead → returns 0 before computing loss
    const prev = makeState({ shipHP: 1 });
    const curr = makeState({ ship: { alive: false }, shipHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ loss: -5.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies loss when alive=true but shipHP <= 0 (step of death)', () => {
    // On the frame the agent takes fatal damage, alive is still true
    const lossWeight = -5.0;
    const prev = makeState({ shipHP: 1 });
    const curr = makeState({ shipHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ loss: lossWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      lossWeight,
      5,
    );
  });
});

describe('computeReward — terminal: draw', () => {
  it('returns 0 for draw when dead agent (alive=false)', () => {
    // Both dead — agent is dead → returns 0
    const prev = makeState({ shipHP: 1, targetHP: 1 });
    const curr = makeState({
      ship: { alive: false },
      shipHP: 0,
      targetHP: 0,
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig();
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('does not apply draw when only target dies', () => {
    const drawWeight = -2.0;
    const prev = makeState({ targetHP: 1 });
    const curr = makeState({ targetHP: 0, shipHP: 5 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ draw: drawWeight }),
    });
    // Only target dead, not both → no draw
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies draw when alive=true, both HP <= 0 (mutual kill step)', () => {
    const drawWeight = -2.0;
    const prev = makeState({ shipHP: 1, targetHP: 1 });
    const curr = makeState({ shipHP: 0, targetHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ draw: drawWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(
      drawWeight,
      5,
    );
  });

  it('draw stacks with win+loss: mutual kill nets win+loss+draw', () => {
    // The key design: +5 -5 -2 = -2.0 net
    const prev = makeState({ shipHP: 1, targetHP: 1 });
    const curr = makeState({ shipHP: 0, targetHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ win: 5.0, loss: -5.0, draw: -2.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-2.0, 5);
  });

  it('does not apply draw when only agent dies (shipHP <= 0, targetHP > 0)', () => {
    const drawWeight = -2.0;
    const prev = makeState({ shipHP: 1, targetHP: 5 });
    const curr = makeState({ shipHP: 0, targetHP: 5 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ draw: drawWeight }),
    });
    // Only agent HP <= 0, not both → no draw
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — timeout not applied by computeReward', () => {
  it('does not apply timeout (handled by game-env after tick increment)', () => {
    const prev = makeState({ tick: 3599 });
    const curr = makeState({ tick: 3600 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      maxTicks: 3600,
      rewardWeights: zeroWeights({ timeout: -5.0 }),
    });
    // Timeout reward is now applied by game-env.js, not computeReward
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — combined', () => {
  it('sums all active components together', () => {
    // Set up: agent alive, facing target, closing, fired, near asteroid, hit landed
    const prev = makeState({
      ship: { x: -50, y: 0, heading: 0 },
      target: { x: 300, y: 0 },
      shipHP: 5,
      targetHP: 5,
    });
    const asteroid = { x: 30, y: 0, collisionRadius: 20 };
    const curr = makeState({
      ship: { x: 0, y: 0, heading: 0 },
      target: { x: 300, y: 0 },
      asteroids: [asteroid],
      shipHP: 4, // got hit
      targetHP: 4, // hit landed
    });
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig();

    const result = computeReward(prev, curr, action, config);

    // With default weights, multiple components should contribute
    // survival: +0.001
    // aim: 0.01 * cos(0) = 0.01 (distance 300 < 600)
    // closing: 0.01 * 50/1000 = 0.0005 (prevDist=350, currDist=300, delta=50)
    // hit: +1.0
    // gotHit: -1.0
    // nearMiss: -0.1 * (1 - 30/100)^2 = -0.049 (dangerRadius = 3*20+40 = 100)
    // firePenalty: -0.002
    // No terminal (HP > 0)
    const expected = 0.001 + 0.01 + 0.0005 + 1.0 + -1.0 + -0.049 + -0.002;
    expect(result).toBeCloseTo(expected, 4);
  });
});

describe('computeReward — custom weight overrides', () => {
  it('custom weights override specific defaults', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: { survival: 10.0 },
    });
    const result = computeReward(prev, curr, action, config);
    // survival: 10.0, plus whatever other defaults contribute
    // aim: 0.01 * cos(0) = 0.01 (dist 300 < 600, heading 0, target at (300,0))
    // closing: 0 (same position both states)
    expect(result).toBeCloseTo(10.0 + 0.01, 4);
  });
});

describe('NEAR_MISS_RADIUS_FACTOR export', () => {
  it('is exported and equals 3', () => {
    expect(NEAR_MISS_RADIUS_FACTOR).toBe(3);
  });
});

describe('DANGER_RADIUS_BASE export', () => {
  it('is exported and equals 40', () => {
    expect(DANGER_RADIUS_BASE).toBe(40);
  });
});

describe('ASTEROID_PENALTY_RADIUS export', () => {
  it('is exported and equals 150', () => {
    expect(ASTEROID_PENALTY_RADIUS).toBe(150);
  });
});

describe('ENGAGE_DISTANCE export', () => {
  it('is exported and equals 400', () => {
    expect(ENGAGE_DISTANCE).toBe(400);
  });
});

describe('computeReward — engage penalty', () => {
  it('applies penalty when distance exceeds ENGAGE_DISTANCE', () => {
    // Ship at origin, target at (600, 0) → dist = 600, over ENGAGE_DISTANCE (400)
    const engageWeight = -1.0;
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: engageWeight }),
    });
    // penalty = -1.0 * (600 - 400) / 1000 = -0.2
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-0.2, 5);
  });

  it('applies no penalty when distance is within ENGAGE_DISTANCE', () => {
    // Ship at origin, target at (300, 0) → dist = 300 < 400
    const engageWeight = -1.0;
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 300, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 300, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: engageWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies no penalty at exactly ENGAGE_DISTANCE', () => {
    // Ship at origin, target at (400, 0) → dist = 400 = ENGAGE_DISTANCE
    const engageWeight = -1.0;
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 400, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 400, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: engageWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies no penalty when engagePenalty weight is 0 (default)', () => {
    // dist > ENGAGE_DISTANCE but weight is 0 → no penalty
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: 0.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('scales linearly with distance beyond threshold', () => {
    const engageWeight = -1.0;
    // Test at two distances: 500 and 900
    const makeTestState = (targetX) =>
      makeState({ ship: { x: 0, y: 0 }, target: { x: targetX, y: 0 } });

    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: engageWeight }),
    });

    const r500 = computeReward(
      makeTestState(500),
      makeTestState(500),
      action,
      config,
    );
    const r900 = computeReward(
      makeTestState(900),
      makeTestState(900),
      action,
      config,
    );

    // r500 = -1.0 * (500-400)/1000 = -0.1
    // r900 = -1.0 * (900-400)/1000 = -0.5
    expect(r500).toBeCloseTo(-0.1, 5);
    expect(r900).toBeCloseTo(-0.5, 5);
    // Ratio should be 1:5
    expect(r900 / r500).toBeCloseTo(5.0, 4);
  });
});

describe('computeReward — proximity reward', () => {
  it('awards proximity when agent moves closer to target', () => {
    const proximityWeight = 1.0;
    // prev: ship at (0,0), target at (500,0) → prevDist = 500
    // curr: ship at (10,0), target at (500,0) → dist = 490
    // hypotheticalDist = dist from (10,0) to prev target (500,0) = 490
    // agentClosing = 500 - 490 = 10
    // reward = 1.0 * 10 / 500 = 0.02
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 500, y: 0 },
    });
    const curr = makeState({
      ship: { x: 10, y: 0 },
      target: { x: 500, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(0.02, 5);
  });

  it('awards zero when agent does not move (enemy closes distance)', () => {
    const proximityWeight = 1.0;
    // prev: ship at (0,0), target at (500,0) → prevDist = 500
    // curr: ship at (0,0), target at (490,0) → dist = 490
    // hypotheticalDist = dist from (0,0) to prev target (500,0) = 500
    // agentClosing = 500 - 500 = 0 → no reward
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 500, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 490, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('awards zero when agent retreats (moves away from target)', () => {
    const proximityWeight = 1.0;
    // prev: ship at (0,0), target at (500,0) → prevDist = 500
    // curr: ship at (-10,0), target at (500,0) → dist = 510
    // hypotheticalDist = dist from (-10,0) to prev target (500,0) = 510
    // agentClosing = 500 - 510 = -10 → no reward
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 500, y: 0 },
    });
    const curr = makeState({
      ship: { x: -10, y: 0 },
      target: { x: 500, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('awards zero when proximity weight is 0 (default)', () => {
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 500, y: 0 },
    });
    const curr = makeState({
      ship: { x: 10, y: 0 },
      target: { x: 500, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: 0.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('gives more reward per closing unit at shorter distance', () => {
    const proximityWeight = 1.0;
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });

    // Close range: prev 200px, agent closes 5px
    // agentClosing = 5, prevDist = 200 → reward = 1.0 * 5/200 = 0.025
    const rClose = computeReward(
      makeState({ ship: { x: 0, y: 0 }, target: { x: 200, y: 0 } }),
      makeState({ ship: { x: 5, y: 0 }, target: { x: 200, y: 0 } }),
      action,
      config,
    );

    // Far range: prev 1000px, agent closes 5px
    // agentClosing = 5, prevDist = 1000 → reward = 1.0 * 5/1000 = 0.005
    const rFar = computeReward(
      makeState({ ship: { x: 0, y: 0 }, target: { x: 1000, y: 0 } }),
      makeState({ ship: { x: 5, y: 0 }, target: { x: 1000, y: 0 } }),
      action,
      config,
    );

    expect(rClose).toBeCloseTo(0.025, 5);
    expect(rFar).toBeCloseTo(0.005, 5);
    // Same closing distance but 5× more reward at close range
    expect(rClose / rFar).toBeCloseTo(5.0, 4);
  });

  it('works at any distance (no hardcoded range)', () => {
    const proximityWeight = 1.0;
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });

    // Very far: prev 2000px, agent closes 10px
    // agentClosing = 10, prevDist = 2000 → reward = 10/2000 = 0.005
    const rVeryFar = computeReward(
      makeState({ ship: { x: 0, y: 0 }, target: { x: 2000, y: 0 } }),
      makeState({ ship: { x: 10, y: 0 }, target: { x: 2000, y: 0 } }),
      action,
      config,
    );
    expect(rVeryFar).toBeCloseTo(0.005, 5);
    expect(rVeryFar).toBeGreaterThan(0);
  });

  it('awards zero when both ships are at same position (prevDist = 0)', () => {
    const proximityWeight = 1.0;
    const prev = makeState({
      ship: { x: 100, y: 0 },
      target: { x: 100, y: 0 },
    });
    const curr = makeState({
      ship: { x: 100, y: 0 },
      target: { x: 100, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: proximityWeight }),
    });
    // prevDist = 0 → guard prevents division by zero
    const result = computeReward(prev, curr, action, config);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0.0);
  });
});

describe('computeReward — asteroid penalty', () => {
  it('applies penalty for asteroid within ASTEROID_PENALTY_RADIUS', () => {
    const weight = -1.0;
    // Ship at origin, asteroid at (100, 0) — within 150px radius
    // ratio = 1 - 100/150 = 0.333, penalty = -1.0 * 0.333^2 = -0.111
    const asteroid = { x: 100, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: weight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-1 / 9, 4);
  });

  it('applies no penalty when asteroid beyond ASTEROID_PENALTY_RADIUS', () => {
    const weight = -1.0;
    const asteroid = { x: 200, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: weight }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('applies maximum penalty when asteroid at ship position', () => {
    const weight = -1.0;
    const asteroid = { x: 0, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: weight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-1.0, 5);
  });

  it('sums penalty across multiple asteroids within radius', () => {
    const weight = -1.0;
    // Two asteroids at 75px (half radius): ratio = 0.5, each = -0.25
    const a1 = { x: 75, y: 0, collisionRadius: 20 };
    const a2 = { x: 0, y: 75, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [a1, a2] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: weight }),
    });
    expect(computeReward(prev, curr, action, config)).toBeCloseTo(-0.5, 5);
  });

  it('uses fixed radius regardless of asteroid size', () => {
    const weight = -1.0;
    // Small asteroid (collisionRadius 8) and large (collisionRadius 64) at same distance
    const small = { x: 100, y: 0, collisionRadius: 8 };
    const large = { x: 100, y: 0, collisionRadius: 64 };
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: weight }),
    });
    const rSmall = computeReward(
      makeState(),
      makeState({ asteroids: [small] }),
      action,
      config,
    );
    const rLarge = computeReward(
      makeState(),
      makeState({ asteroids: [large] }),
      action,
      config,
    );
    // Same penalty — fixed radius, size-independent
    expect(rSmall).toBeCloseTo(rLarge, 5);
  });

  it('applies no penalty when weight is 0 (default)', () => {
    const asteroid = { x: 50, y: 0, collisionRadius: 20 };
    const prev = makeState();
    const curr = makeState({ asteroids: [asteroid] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ asteroidPenalty: 0.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });
});

describe('computeReward — edge cases', () => {
  it('handles zero distance to target', () => {
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ aim: 1.0 }),
    });
    // Distance is 0, which is < 600, but angle undefined at 0 distance
    // Should handle gracefully without NaN
    const result = computeReward(prev, curr, action, config);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles undefined config.rewardWeights (uses all defaults)', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = { maxTicks: 3600, shipHP: 5 };
    const result = computeReward(prev, curr, action, config);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles empty asteroids array', () => {
    const prev = makeState({ asteroids: [] });
    const curr = makeState({ asteroids: [] });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ nearMiss: -1.0 }),
    });
    expect(computeReward(prev, curr, action, config)).toBe(0.0);
  });

  it('does not mutate prevState or currentState', () => {
    const prev = makeState({ shipHP: 5, targetHP: 5 });
    const curr = makeState({ shipHP: 4, targetHP: 4 });
    const prevJSON = JSON.stringify(prev);
    const currJSON = JSON.stringify(curr);
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig();

    computeReward(prev, curr, action, config);

    expect(JSON.stringify(prev)).toBe(prevJSON);
    expect(JSON.stringify(curr)).toBe(currJSON);
  });

  it('returns a number (not NaN or undefined)', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig();
    const result = computeReward(prev, curr, action, config);
    expect(typeof result).toBe('number');
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe('computeReward — breakdown accumulator', () => {
  /** Create a zeroed breakdown object with all 14 keys. */
  function makeBreakdown() {
    return {
      survival: 0,
      aim: 0,
      closing: 0,
      hit: 0,
      gotHit: 0,
      nearMiss: 0,
      firePenalty: 0,
      engagePenalty: 0,
      proximity: 0,
      asteroidPenalty: 0,
      win: 0,
      loss: 0,
      draw: 0,
      timeout: 0,
    };
  }

  it('accumulates survival into breakdown when provided', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ survival: 1.0 }),
    });
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    expect(breakdown.survival).toBeCloseTo(1.0, 5);
  });

  it('does not require breakdown (backward compatible with null/undefined)', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig();
    // No 5th argument — should work fine
    const result = computeReward(prev, curr, action, config);
    expect(Number.isFinite(result)).toBe(true);
    // Explicit null
    const result2 = computeReward(prev, curr, action, config, null);
    expect(Number.isFinite(result2)).toBe(true);
  });

  it('accumulates across multiple calls', () => {
    const prev = makeState();
    const curr = makeState();
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ survival: 1.0 }),
    });
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    computeReward(prev, curr, action, config, breakdown);
    computeReward(prev, curr, action, config, breakdown);
    expect(breakdown.survival).toBeCloseTo(3.0, 5);
  });

  it('dead agent does not add to breakdown', () => {
    const prev = makeState({ shipHP: 1 });
    const curr = makeState({ ship: { alive: false }, shipHP: 0, targetHP: 0 });
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig();
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    // All keys should remain zero
    for (const key of Object.keys(breakdown)) {
      expect(breakdown[key]).toBe(0);
    }
  });

  it('accumulates all 13 components correctly in a single call', () => {
    // Set up a state that triggers many components at once
    const prev = makeState({
      ship: { x: -50, y: 0, heading: 0 },
      target: { x: 300, y: 0 },
      shipHP: 5,
      targetHP: 5,
    });
    const asteroid = { x: 30, y: 0, collisionRadius: 20 };
    const curr = makeState({
      ship: { x: 0, y: 0, heading: 0 },
      target: { x: 300, y: 0 },
      asteroids: [asteroid],
      shipHP: 4,
      targetHP: 4,
    });
    const action = { moveAction: 0, fireAction: 1 };
    const config = makeConfig();
    const breakdown = makeBreakdown();
    const totalReward = computeReward(prev, curr, action, config, breakdown);

    // Verify individual components are non-zero where expected
    expect(breakdown.survival).toBeCloseTo(0.001, 5);
    expect(breakdown.aim).toBeGreaterThan(0); // facing target at dist 300
    expect(breakdown.closing).toBeGreaterThan(0); // moved closer
    expect(breakdown.hit).toBeCloseTo(1.0, 5); // targetHP decreased
    expect(breakdown.gotHit).toBeCloseTo(-1.0, 5); // shipHP decreased
    expect(breakdown.nearMiss).toBeLessThan(0); // asteroid nearby
    expect(breakdown.firePenalty).toBeCloseTo(-0.002, 5); // fired

    // Sum of all breakdown values should equal the total reward
    const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    expect(breakdownSum).toBeCloseTo(totalReward, 4);
  });

  it('accumulates terminal win component', () => {
    const prev = makeState({ targetHP: 1 });
    const curr = makeState({ targetHP: 0 });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ win: 5.0 }),
    });
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    expect(breakdown.win).toBeCloseTo(5.0, 5);
  });

  it('accumulates engage penalty component', () => {
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const curr = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ engagePenalty: -1.0 }),
    });
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    expect(breakdown.engagePenalty).toBeCloseTo(-0.2, 5);
  });

  it('accumulates proximity component', () => {
    const prev = makeState({
      ship: { x: 0, y: 0 },
      target: { x: 500, y: 0 },
    });
    const curr = makeState({
      ship: { x: 10, y: 0 },
      target: { x: 500, y: 0 },
    });
    const action = { moveAction: 0, fireAction: 0 };
    const config = makeConfig({
      rewardWeights: zeroWeights({ proximity: 1.0 }),
    });
    const breakdown = makeBreakdown();
    computeReward(prev, curr, action, config, breakdown);
    expect(breakdown.proximity).toBeCloseTo(0.02, 5);
  });
});
