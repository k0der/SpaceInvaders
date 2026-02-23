import { beforeEach, describe, expect, it } from 'vitest';
import { createAsteroid } from '../src/asteroid.js';
import { createBullet } from '../src/bullet.js';
import { ACTION_MAP, GameEnv } from '../src/game-env.js';
import { OBSERVATION_SIZE } from '../src/observation.js';

// ── ACTION_MAP ──────────────────────────────────────────────────────
describe('ACTION_MAP', () => {
  it('has exactly 10 entries', () => {
    expect(ACTION_MAP).toHaveLength(10);
  });

  it('each entry has thrust, rotL, rotR, brake boolean flags', () => {
    for (const entry of ACTION_MAP) {
      expect(typeof entry.thrust).toBe('boolean');
      expect(typeof entry.rotL).toBe('boolean');
      expect(typeof entry.rotR).toBe('boolean');
      expect(typeof entry.brake).toBe('boolean');
    }
  });

  it('[0] thrust-straight', () => {
    expect(ACTION_MAP[0]).toEqual({
      thrust: true,
      rotL: false,
      rotR: false,
      brake: false,
    });
  });

  it('[1] thrust-left', () => {
    expect(ACTION_MAP[1]).toEqual({
      thrust: true,
      rotL: true,
      rotR: false,
      brake: false,
    });
  });

  it('[2] thrust-right', () => {
    expect(ACTION_MAP[2]).toEqual({
      thrust: true,
      rotL: false,
      rotR: true,
      brake: false,
    });
  });

  it('[3] coast-straight', () => {
    expect(ACTION_MAP[3]).toEqual({
      thrust: false,
      rotL: false,
      rotR: false,
      brake: false,
    });
  });

  it('[4] coast-left', () => {
    expect(ACTION_MAP[4]).toEqual({
      thrust: false,
      rotL: true,
      rotR: false,
      brake: false,
    });
  });

  it('[5] coast-right', () => {
    expect(ACTION_MAP[5]).toEqual({
      thrust: false,
      rotL: false,
      rotR: true,
      brake: false,
    });
  });

  it('[6] brake-straight', () => {
    expect(ACTION_MAP[6]).toEqual({
      thrust: false,
      rotL: false,
      rotR: false,
      brake: true,
    });
  });

  it('[7] brake-left', () => {
    expect(ACTION_MAP[7]).toEqual({
      thrust: false,
      rotL: true,
      rotR: false,
      brake: true,
    });
  });

  it('[8] brake-right', () => {
    expect(ACTION_MAP[8]).toEqual({
      thrust: false,
      rotL: false,
      rotR: true,
      brake: true,
    });
  });

  it('[9] no-op (same as coast-straight)', () => {
    expect(ACTION_MAP[9]).toEqual({
      thrust: false,
      rotL: false,
      rotR: false,
      brake: false,
    });
  });
});

// ── GameEnv construction ────────────────────────────────────────────
describe('GameEnv construction', () => {
  it('new GameEnv() creates an instance without config', () => {
    const env = new GameEnv();
    expect(env).toBeInstanceOf(GameEnv);
  });
});

// ── reset() ─────────────────────────────────────────────────────────
describe('GameEnv.reset()', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('returns a Float32Array', () => {
    const obs = env.reset();
    expect(obs).toBeInstanceOf(Float32Array);
  });

  it('returns observation of length OBSERVATION_SIZE', () => {
    const obs = env.reset();
    expect(obs).toHaveLength(OBSERVATION_SIZE);
  });

  it('applies default config when called with no arguments', () => {
    const obs = env.reset();
    expect(obs).toBeInstanceOf(Float32Array);
  });

  it('accepts custom config overrides', () => {
    const obs = env.reset({ shipHP: 5, maxTicks: 100 });
    expect(obs).toBeInstanceOf(Float32Array);
  });

  it('spawnFacing: true makes ships face each other', () => {
    env.reset({ spawnDistance: 500, spawnFacing: true });

    const agent = env._agent;
    const opponent = env._opponent;

    // Agent heading should point toward opponent
    const expectedAgentHeading = Math.atan2(
      opponent.y - agent.y,
      opponent.x - agent.x,
    );
    expect(agent.heading).toBeCloseTo(expectedAgentHeading, 5);

    // Opponent heading should point toward agent
    const expectedOpponentHeading = Math.atan2(
      agent.y - opponent.y,
      agent.x - opponent.x,
    );
    expect(opponent.heading).toBeCloseTo(expectedOpponentHeading, 5);
  });

  it('spawnFacing: false uses default heading for agent', () => {
    env.reset({ spawnFacing: false });
    expect(env._agent.heading).toBeCloseTo(-Math.PI / 2, 5);
  });
});

// ── step() shape ────────────────────────────────────────────────────
describe('GameEnv.step() shape', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
    env.reset();
  });

  it('returns { observation, reward, done, info }', () => {
    const result = env.step(3, 0);
    expect(result).toHaveProperty('observation');
    expect(result).toHaveProperty('reward');
    expect(result).toHaveProperty('done');
    expect(result).toHaveProperty('info');
  });

  it('observation is Float32Array of length OBSERVATION_SIZE', () => {
    const { observation } = env.step(3, 0);
    expect(observation).toBeInstanceOf(Float32Array);
    expect(observation).toHaveLength(OBSERVATION_SIZE);
  });

  it('reward is a number', () => {
    const { reward } = env.step(3, 0);
    expect(typeof reward).toBe('number');
  });

  it('done is a boolean', () => {
    const { done } = env.step(3, 0);
    expect(typeof done).toBe('boolean');
  });

  it('info contains expected fields', () => {
    const { info } = env.step(3, 0);
    expect(info).toHaveProperty('winner');
    expect(info).toHaveProperty('ticksElapsed');
    expect(info).toHaveProperty('hitsLanded');
    expect(info).toHaveProperty('hitsTaken');
    expect(info).toHaveProperty('asteroidsHit');
    expect(info).toHaveProperty('agentDeathCause');
    expect(info).toHaveProperty('opponentDeathCause');
  });
});

// ── step() before reset() ───────────────────────────────────────────
describe('GameEnv.step() before reset()', () => {
  it('throws error if step called before reset', () => {
    const env = new GameEnv();
    expect(() => env.step(0, 0)).toThrow();
  });
});

// ── Invalid actions ─────────────────────────────────────────────────
describe('Invalid actions', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
    env.reset();
  });

  it('throws for moveAction < 0', () => {
    expect(() => env.step(-1, 0)).toThrow();
  });

  it('throws for moveAction > 9', () => {
    expect(() => env.step(10, 0)).toThrow();
  });

  it('throws for non-integer moveAction', () => {
    expect(() => env.step(1.5, 0)).toThrow();
  });

  it('throws for fireAction < 0', () => {
    expect(() => env.step(0, -1)).toThrow();
  });

  it('throws for fireAction > 1', () => {
    expect(() => env.step(0, 2)).toThrow();
  });
});

// ── Action mapping ──────────────────────────────────────────────────
describe('Action mapping sets correct control flags', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
    env.reset({ enemyPolicy: 'static' });
  });

  for (let i = 0; i < 10; i++) {
    it(`moveAction ${i} maps to correct control flags`, () => {
      env.step(i, 0);
      const agent = env._agent;
      const expected = ACTION_MAP[i];
      expect(agent.thrust).toBe(expected.thrust);
      expect(agent.rotatingLeft).toBe(expected.rotL);
      expect(agent.rotatingRight).toBe(expected.rotR);
      expect(agent.braking).toBe(expected.brake);
    });
  }

  it('fireAction=1 sets agent fire flag to true', () => {
    env.step(3, 1);
    expect(env._agent.fire).toBe(true);
  });

  it('fireAction=0 sets agent fire flag to false', () => {
    env.step(3, 0);
    expect(env._agent.fire).toBe(false);
  });
});

// ── HP system ───────────────────────────────────────────────────────
describe('HP system', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('bullet hit decrements opponent HP', () => {
    env.reset({ shipHP: 3, enemyPolicy: 'static', asteroidDensity: 0 });

    // Inject a player bullet right at the opponent's position
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );

    const initialHP = env._opponentHP;
    env.step(3, 0);
    expect(env._opponentHP).toBe(initialHP - 1);
  });

  it('bullet hit decrements agent HP', () => {
    env.reset({ shipHP: 3, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );

    const initialHP = env._agentHP;
    env.step(3, 0);
    expect(env._agentHP).toBe(initialHP - 1);
  });

  it('ship dies (alive=false) when HP reaches 0', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );

    env.step(3, 0);
    expect(env._agentHP).toBe(0);
    expect(env._agent.alive).toBe(false);
  });

  it('asteroid collision decrements agent HP', () => {
    env.reset({ shipHP: 3, enemyPolicy: 'static', asteroidDensity: 0 });

    // Place asteroid directly on top of agent
    env._sim.asteroids.push(
      createAsteroid({
        x: env._agent.x,
        y: env._agent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );

    const initialHP = env._agentHP;
    env.step(3, 0);
    expect(env._agentHP).toBe(initialHP - 1);
  });

  it('HP system is internal — does not add hp property to ship objects', () => {
    env.reset({ shipHP: 5 });
    expect(env._agent).not.toHaveProperty('hp');
  });
});

// ── Episode termination ─────────────────────────────────────────────
describe('Episode termination', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('agent death → winner is opponent', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );

    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('opponent');
  });

  it('opponent death → winner is agent', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );

    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('agent');
  });

  it('timeout → winner is timeout', () => {
    env.reset({
      shipHP: 5,
      maxTicks: 2,
      enemyPolicy: 'static',
      asteroidDensity: 0,
    });

    env.step(3, 0); // tick 1
    const result = env.step(3, 0); // tick 2 = maxTicks
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('timeout');
  });

  it('mutual kill → winner is draw_mutual', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });

    // Both ships get hit simultaneously
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );

    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('draw_mutual');
  });
});

// ── Opponent behavior ───────────────────────────────────────────────
describe('Opponent behavior', () => {
  it('static policy: opponent does not move or shoot', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'static', asteroidDensity: 0 });

    // Run several steps
    for (let i = 0; i < 10; i++) {
      env.step(3, 0);
    }

    // Static opponent: all control flags false
    expect(env._opponent.thrust).toBe(false);
    expect(env._opponent.rotatingLeft).toBe(false);
    expect(env._opponent.rotatingRight).toBe(false);
    expect(env._opponent.fire).toBe(false);
  });

  it('enemyShoots: false suppresses opponent fire', () => {
    const env = new GameEnv();
    env.reset({
      enemyPolicy: 'predictive',
      enemyShoots: false,
      asteroidDensity: 0,
    });

    // Run several steps — opponent AI runs but fire is suppressed
    for (let i = 0; i < 60; i++) {
      env.step(3, 0);
    }

    // No enemy bullets should exist
    const enemyBullets = env._bullets.filter((b) => b.owner === 'enemy');
    expect(enemyBullets).toHaveLength(0);
  });
});

// ── Sequential episodes ─────────────────────────────────────────────
describe('Sequential episodes', () => {
  it('reset → play → reset → play works correctly', () => {
    const env = new GameEnv();

    // Episode 1
    const obs1 = env.reset({
      maxTicks: 5,
      enemyPolicy: 'static',
      asteroidDensity: 0,
    });
    expect(obs1).toBeInstanceOf(Float32Array);
    for (let i = 0; i < 5; i++) {
      env.step(3, 0);
    }

    // Episode 2
    const obs2 = env.reset({
      maxTicks: 3,
      enemyPolicy: 'static',
      asteroidDensity: 0,
    });
    expect(obs2).toBeInstanceOf(Float32Array);

    // Should start fresh — tick 0 again
    const result = env.step(3, 0);
    expect(result.info.ticksElapsed).toBe(1);
    expect(result.done).toBe(false);
  });
});

// ── Frame-skipping ──────────────────────────────────────────────────
describe('Frame-skipping (frameSkip config)', () => {
  it('frameSkip defaults to 1', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'static', asteroidDensity: 0 });
    const r = env.step(3, 0);
    expect(r.info.ticksElapsed).toBe(1);
  });

  it('frameSkip: 2 advances tick count by 2 per step call', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'static', asteroidDensity: 0, frameSkip: 2 });
    const r1 = env.step(3, 0);
    expect(r1.info.ticksElapsed).toBe(2);
    const r2 = env.step(3, 0);
    expect(r2.info.ticksElapsed).toBe(4);
  });

  it('frameSkip: 2 accumulates reward across sub-ticks', () => {
    const env1 = new GameEnv();
    env1.reset({ enemyPolicy: 'static', asteroidDensity: 0, frameSkip: 1 });
    const r1a = env1.step(0, 0);
    const r1b = env1.step(0, 0);
    const separateReward = r1a.reward + r1b.reward;

    const env2 = new GameEnv();
    env2.reset({ enemyPolicy: 'static', asteroidDensity: 0, frameSkip: 2 });
    const r2 = env2.step(0, 0);

    // Rewards should match: sum of 2 individual steps = 1 frame-skipped step
    expect(r2.reward).toBeCloseTo(separateReward, 5);
  });

  it('frameSkip: 2 stops early if episode ends on first sub-tick', () => {
    const env = new GameEnv();
    env.reset({
      shipHP: 1,
      enemyPolicy: 'static',
      asteroidDensity: 0,
      frameSkip: 2,
    });

    // Kill agent on first sub-tick
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );

    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('opponent');
    // Only 1 tick simulated, not 2
    expect(result.info.ticksElapsed).toBe(1);
  });

  it('frameSkip: 2 handles maxTicks not divisible by frameSkip', () => {
    const env = new GameEnv();
    env.reset({
      shipHP: 5,
      maxTicks: 3,
      enemyPolicy: 'static',
      asteroidDensity: 0,
      frameSkip: 2,
    });

    const r1 = env.step(3, 0); // ticks 1,2
    expect(r1.done).toBe(false);
    expect(r1.info.ticksElapsed).toBe(2);

    const r2 = env.step(3, 0); // tick 3 → done (maxTicks reached mid-frame)
    expect(r2.done).toBe(true);
    expect(r2.info.winner).toBe('timeout');
    expect(r2.info.ticksElapsed).toBe(3);
  });

  it('frameSkip: 1 is backward compatible with existing behavior', () => {
    const env = new GameEnv();
    env.reset({
      shipHP: 5,
      maxTicks: 3,
      enemyPolicy: 'static',
      asteroidDensity: 0,
      frameSkip: 1,
    });

    env.step(3, 0); // tick 1
    env.step(3, 0); // tick 2
    const r3 = env.step(3, 0); // tick 3
    expect(r3.done).toBe(true);
    expect(r3.info.ticksElapsed).toBe(3);
  });
});

// ── Info tracking ───────────────────────────────────────────────────
describe('Info tracking', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('ticksElapsed increments each step', () => {
    env.reset({ enemyPolicy: 'static', asteroidDensity: 0 });
    const r1 = env.step(3, 0);
    expect(r1.info.ticksElapsed).toBe(1);
    const r2 = env.step(3, 0);
    expect(r2.info.ticksElapsed).toBe(2);
  });

  it('hitsLanded increments when agent bullet hits opponent', () => {
    env.reset({ shipHP: 5, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );

    const result = env.step(3, 0);
    expect(result.info.hitsLanded).toBe(1);
  });

  it('hitsTaken increments when enemy bullet hits agent', () => {
    env.reset({ shipHP: 5, enemyPolicy: 'static', asteroidDensity: 0 });

    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );

    const result = env.step(3, 0);
    expect(result.info.hitsTaken).toBe(1);
  });

  it('asteroidsHit increments on agent-asteroid collision', () => {
    env.reset({ shipHP: 5, enemyPolicy: 'static', asteroidDensity: 0 });

    env._sim.asteroids.push(
      createAsteroid({
        x: env._agent.x,
        y: env._agent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );

    const result = env.step(3, 0);
    expect(result.info.asteroidsHit).toBeGreaterThanOrEqual(1);
  });
});

// ── Headless asteroids in GameEnv ────────────────────────────────────
describe('GameEnv headless asteroids', () => {
  it('GameEnv creates headless simulation (asteroids have null shape)', () => {
    const env = new GameEnv();
    env.reset({ asteroidDensity: 1.0, enemyPolicy: 'static' });
    for (const a of env._sim.asteroids) {
      expect(a.shape).toBeNull();
    }
  });

  it('simulation headless flag is true', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'static' });
    expect(env._sim.headless).toBe(true);
  });
});

// ── Death cause tracking ─────────────────────────────────────────────
describe('Death cause tracking', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('agentDeathCause is bullet when killed by bullet', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.agentDeathCause).toBe('bullet');
  });

  it('agentDeathCause is asteroid when killed by asteroid', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._sim.asteroids.push(
      createAsteroid({
        x: env._agent.x,
        y: env._agent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.agentDeathCause).toBe('asteroid');
  });

  it('opponentDeathCause is bullet when killed by bullet', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.opponentDeathCause).toBe('bullet');
  });

  it('opponentDeathCause is asteroid when killed by asteroid', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._sim.asteroids.push(
      createAsteroid({
        x: env._opponent.x,
        y: env._opponent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.opponentDeathCause).toBe('asteroid');
  });

  it('death causes are null mid-episode', () => {
    env.reset({ shipHP: 5, enemyPolicy: 'static', asteroidDensity: 0 });
    const result = env.step(3, 0);
    expect(result.done).toBe(false);
    expect(result.info.agentDeathCause).toBeNull();
    expect(result.info.opponentDeathCause).toBeNull();
  });

  it('death causes are null on timeout', () => {
    env.reset({
      shipHP: 5,
      maxTicks: 2,
      enemyPolicy: 'static',
      asteroidDensity: 0,
    });
    env.step(3, 0);
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('timeout');
    expect(result.info.agentDeathCause).toBeNull();
    expect(result.info.opponentDeathCause).toBeNull();
  });

  it('death causes reset across episodes', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    const r1 = env.step(3, 0);
    expect(r1.info.agentDeathCause).toBe('bullet');

    // Reset and verify causes are null again
    env.reset({ shipHP: 5, enemyPolicy: 'static', asteroidDensity: 0 });
    const r2 = env.step(3, 0);
    expect(r2.info.agentDeathCause).toBeNull();
    expect(r2.info.opponentDeathCause).toBeNull();
  });

  it('first lethal hit wins with multi-HP (bullet then asteroid same tick)', () => {
    env.reset({ shipHP: 2, enemyPolicy: 'static', asteroidDensity: 0 });
    // First hit: bullet drops HP from 2 to 1
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    env.step(3, 0); // HP now 1, cause still null (not dead yet)

    // Second hit: asteroid drops HP from 1 to 0
    env._sim.asteroids.push(
      createAsteroid({
        x: env._agent.x,
        y: env._agent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.agentDeathCause).toBe('asteroid');
  });
});

// ── Mutual kill (draw_mutual) ────────────────────────────────────────
describe('Mutual kill (draw_mutual)', () => {
  let env;
  beforeEach(() => {
    env = new GameEnv();
  });

  it('both dying same tick → winner is draw_mutual', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('draw_mutual');
  });

  it('both death causes are set on mutual kill', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    env._bullets.push(
      createBullet(env._agent.x, env._agent.y, 0, 0, 0, 'enemy'),
    );
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );
    const result = env.step(3, 0);
    expect(result.info.agentDeathCause).toBe('bullet');
    expect(result.info.opponentDeathCause).toBe('bullet');
  });

  it('mixed causes: asteroid kills agent + bullet kills opponent', () => {
    env.reset({ shipHP: 1, enemyPolicy: 'static', asteroidDensity: 0 });
    // Bullet kills opponent
    env._bullets.push(
      createBullet(env._opponent.x, env._opponent.y, 0, 0, 0, 'player'),
    );
    // Asteroid kills agent
    env._sim.asteroids.push(
      createAsteroid({
        x: env._agent.x,
        y: env._agent.y,
        vx: 0,
        vy: 0,
        radius: 20,
      }),
    );
    const result = env.step(3, 0);
    expect(result.done).toBe(true);
    expect(result.info.winner).toBe('draw_mutual');
    expect(result.info.agentDeathCause).toBe('asteroid');
    expect(result.info.opponentDeathCause).toBe('bullet');
  });
});

// ── AI tuning overrides ──────────────────────────────────────────────
describe('AI tuning overrides (aiHoldTime, aiSimSteps)', () => {
  it('aiHoldTime override is applied to strategy state', () => {
    const env = new GameEnv();
    env.reset({
      enemyPolicy: 'predictive',
      asteroidDensity: 0,
      aiHoldTime: 0.3,
    });
    expect(env._strategyState.holdTime).toBe(0.3);
  });

  it('aiSimSteps override is applied to strategy state', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'predictive', asteroidDensity: 0, aiSimSteps: 8 });
    expect(env._strategyState.simSteps).toBe(8);
  });

  it('without overrides, strategy state has no holdTime/simSteps keys', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'predictive', asteroidDensity: 0 });
    expect(env._strategyState.holdTime).toBeUndefined();
    expect(env._strategyState.simSteps).toBeUndefined();
  });

  it('static policy ignores AI overrides (no strategy state)', () => {
    const env = new GameEnv();
    env.reset({ enemyPolicy: 'static', aiHoldTime: 0.5, aiSimSteps: 5 });
    expect(env._strategyState).toBeNull();
  });

  it('aiHoldTime affects AI decision frequency', () => {
    // With a larger holdTime, the AI should make fewer decisions over the same ticks
    const envFast = new GameEnv();
    envFast.reset({
      enemyPolicy: 'predictive',
      asteroidDensity: 0,
      aiHoldTime: 0.05,
    });

    const envSlow = new GameEnv();
    envSlow.reset({
      enemyPolicy: 'predictive',
      asteroidDensity: 0,
      aiHoldTime: 0.5,
    });

    // Run 30 ticks (~0.5s) — fast AI should change action more often
    let fastChanges = 0;
    let slowChanges = 0;
    let fastPrev = null;
    let slowPrev = null;

    for (let i = 0; i < 30; i++) {
      envFast.step(3, 0);
      envSlow.step(3, 0);

      const fastAction = envFast._strategyState.prevAction;
      const slowAction = envSlow._strategyState.prevAction;

      if (fastPrev && fastAction !== fastPrev) fastChanges++;
      if (slowPrev && slowAction !== slowPrev) slowChanges++;
      fastPrev = fastAction;
      slowPrev = slowAction;
    }

    // Fast AI (holdTime=0.05 = 3 ticks) should re-evaluate more often than slow (holdTime=0.5 = 30 ticks)
    expect(fastChanges).toBeGreaterThanOrEqual(slowChanges);
  });
});
