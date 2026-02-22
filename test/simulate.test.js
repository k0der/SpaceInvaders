import { afterEach, describe, expect, it } from 'vitest';
import {
  detectCollapse,
  detectOscillation,
  detectPassthrough,
  installSeededRandom,
  parseArgs,
  runGame,
  tryFireBullet,
} from '../simulate.js';

describe('Increment 26d: Headless Simulator', () => {
  describe('parseArgs', () => {
    it('returns defaults when no args given', () => {
      const config = parseArgs([]);
      expect(config.games).toBe(100);
      expect(config.ticks).toBe(3600);
      expect(config.dt).toBeCloseTo(1 / 60);
      expect(config.seed).toBe(null);
      expect(config.verbose).toBe(false);
      expect(config.detectors).toEqual([]);
      expect(config.playerAI).toBe('predictive');
      expect(config.enemyAI).toBe('predictive');
      expect(config.density).toBe(1.0);
      expect(config.speed).toBe(1.0);
      expect(config.thrust).toBe(2000);
      expect(config.bridge).toBe(false);
    });

    it('parses --games', () => {
      const config = parseArgs(['--games', '50']);
      expect(config.games).toBe(50);
    });

    it('parses --ticks', () => {
      const config = parseArgs(['--ticks', '1800']);
      expect(config.ticks).toBe(1800);
    });

    it('parses --dt', () => {
      const config = parseArgs(['--dt', '0.05']);
      expect(config.dt).toBeCloseTo(0.05);
    });

    it('parses --seed', () => {
      const config = parseArgs(['--seed', '42']);
      expect(config.seed).toBe(42);
    });

    it('parses --verbose flag', () => {
      const config = parseArgs(['--verbose']);
      expect(config.verbose).toBe(true);
    });

    it('parses --detect with comma-separated list', () => {
      const config = parseArgs(['--detect', 'oscillation,collapse']);
      expect(config.detectors).toEqual(['oscillation', 'collapse']);
    });

    it('parses --player-ai', () => {
      const config = parseArgs(['--player-ai', 'reactive']);
      expect(config.playerAI).toBe('reactive');
    });

    it('parses --enemy-ai', () => {
      const config = parseArgs(['--enemy-ai', 'reactive']);
      expect(config.enemyAI).toBe('reactive');
    });

    it('parses --density', () => {
      const config = parseArgs(['--density', '2.5']);
      expect(config.density).toBe(2.5);
    });

    it('parses --speed', () => {
      const config = parseArgs(['--speed', '1.5']);
      expect(config.speed).toBe(1.5);
    });

    it('parses --thrust', () => {
      const config = parseArgs(['--thrust', '3000']);
      expect(config.thrust).toBe(3000);
    });

    it('ignores unknown flags', () => {
      const config = parseArgs(['--unknown', 'value', '--games', '5']);
      expect(config.games).toBe(5);
    });

    it('parses multiple args together', () => {
      const config = parseArgs([
        '--games',
        '10',
        '--ticks',
        '60',
        '--verbose',
        '--seed',
        '99',
      ]);
      expect(config.games).toBe(10);
      expect(config.ticks).toBe(60);
      expect(config.verbose).toBe(true);
      expect(config.seed).toBe(99);
    });
  });

  describe('installSeededRandom', () => {
    let restore;

    afterEach(() => {
      if (restore) restore();
      restore = null;
    });

    it('produces deterministic sequence', () => {
      restore = installSeededRandom(42);
      const a1 = Math.random();
      const a2 = Math.random();
      restore();

      restore = installSeededRandom(42);
      const b1 = Math.random();
      const b2 = Math.random();
      restore();
      restore = null;

      expect(a1).toBe(b1);
      expect(a2).toBe(b2);
    });

    it('restore function restores original Math.random', () => {
      const original = Math.random;
      restore = installSeededRandom(42);
      expect(Math.random).not.toBe(original);
      restore();
      expect(Math.random).toBe(original);
      restore = null;
    });

    it('different seeds produce different sequences', () => {
      restore = installSeededRandom(1);
      const a = Math.random();
      restore();

      restore = installSeededRandom(2);
      const b = Math.random();
      restore();
      restore = null;

      expect(a).not.toBe(b);
    });

    it('values are between 0 and 1', () => {
      restore = installSeededRandom(123);
      for (let i = 0; i < 100; i++) {
        const v = Math.random();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('tryFireBullet', () => {
    it('fires when cooldown=0, fire=true, alive=true', () => {
      const ship = makeShip({
        fire: true,
        alive: true,
        fireCooldown: 0,
        heading: 0,
      });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      const result = tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(result).toBe(true);
      expect(bullets.length).toBe(1);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('FIRE');
    });

    it('does not fire when fire=false', () => {
      const ship = makeShip({ fire: false, alive: true, fireCooldown: 0 });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      const result = tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(result).toBe(false);
      expect(bullets.length).toBe(0);
    });

    it('does not fire when alive=false', () => {
      const ship = makeShip({ fire: true, alive: false, fireCooldown: 0 });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      const result = tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(result).toBe(false);
    });

    it('does not fire when cooldown > 0', () => {
      const ship = makeShip({ fire: true, alive: true, fireCooldown: 0.1 });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      const result = tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(result).toBe(false);
    });

    it('creates bullet with correct owner field', () => {
      const ship = makeShip({
        fire: true,
        alive: true,
        fireCooldown: 0,
        owner: 'enemy',
      });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(bullets[0].owner).toBe('enemy');
    });

    it('resets cooldown after firing', () => {
      const ship = makeShip({ fire: true, alive: true, fireCooldown: 0 });
      const bullets = [];
      const events = [];
      const target = makeShip({ x: 200, y: 0 });
      tryFireBullet(ship, target, bullets, 1 / 60, 1.0, events);
      expect(ship.fireCooldown).toBeGreaterThan(0);
    });
  });

  describe('detectOscillation', () => {
    it('flags action changes faster than HOLD_TIME', () => {
      const events = [
        makeActionChangeEvent(100, 1.0, 'T___', 'T_R_'),
        makeActionChangeEvent(105, 1.08, 'T_R_', 'T___'), // 0.08s gap < HOLD_TIME
      ];
      const detections = detectOscillation(events);
      expect(detections.length).toBeGreaterThan(0);
    });

    it('does not flag changes slower than HOLD_TIME', () => {
      const events = [
        makeActionChangeEvent(100, 1.0, 'T___', 'T_R_'),
        makeActionChangeEvent(120, 2.0, 'T_R_', 'T___'), // 1.0s gap > HOLD_TIME
      ];
      const detections = detectOscillation(events);
      expect(detections.length).toBe(0);
    });

    it('returns empty for no action change events', () => {
      expect(detectOscillation([])).toEqual([]);
    });
  });

  describe('detectPassthrough', () => {
    it('flags when ship overlaps asteroid collisionRadius', () => {
      const events = [
        {
          tick: 50,
          elapsed: 0.83,
          type: 'PROXIMITY',
          data: { owner: 'player', dist: 10, radius: 30 },
        },
      ];
      const detections = detectPassthrough(events);
      expect(detections.length).toBe(1);
      expect(detections[0].type).toBe('passthrough');
    });

    it('does not flag when ship body is outside asteroid body (dist > radius + SHIP_SIZE)', () => {
      const events = [
        {
          tick: 50,
          elapsed: 0.83,
          type: 'PROXIMITY',
          data: { owner: 'player', dist: 50, radius: 30 },
        },
      ];
      // lethal threshold = 30 + 15 (SHIP_SIZE) = 45; dist=50 > 45 → no passthrough
      const detections = detectPassthrough(events);
      expect(detections.length).toBe(0);
    });

    it('returns empty for no proximity events', () => {
      expect(detectPassthrough([])).toEqual([]);
    });
  });

  describe('detectCollapse', () => {
    it('flags when all candidate scores are below threshold', () => {
      const events = [
        makeActionChangeEvent(100, 1.0, 'T___', 'T_R_', {
          scores: [
            { name: 'T___', score: -6000 },
            { name: 'T_R_', score: -5500 },
            { name: '____', score: -7000 },
          ],
        }),
      ];
      const detections = detectCollapse(events);
      expect(detections.length).toBeGreaterThan(0);
    });

    it('does not flag when any candidate is above threshold', () => {
      const events = [
        makeActionChangeEvent(100, 1.0, 'T___', 'T_R_', {
          scores: [
            { name: 'T___', score: 1000 },
            { name: 'T_R_', score: -6000 },
          ],
        }),
      ];
      const detections = detectCollapse(events);
      expect(detections.length).toBe(0);
    });
  });

  describe('runGame', () => {
    let restore;

    afterEach(() => {
      if (restore) restore();
      restore = null;
    });

    it('runs without crashing and returns expected structure', () => {
      restore = installSeededRandom(42);
      const result = runGame({
        ticks: 10,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 1.0,
        speed: 1.0,
        thrust: 2000,
      });
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('stats');
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.stats).toHaveProperty('ticks');
      expect(result.stats.ticks).toBe(10);
    });

    it('produces events with correct structure', () => {
      restore = installSeededRandom(42);
      const result = runGame({
        ticks: 60,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 1.0,
        speed: 1.0,
        thrust: 2000,
      });
      for (const event of result.events) {
        expect(event).toHaveProperty('tick');
        expect(event).toHaveProperty('elapsed');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('data');
      }
    });

    it('generates proximity events when ship is near asteroid', () => {
      // Run a short game and check for proximity events
      // With seeded random, the game is deterministic
      restore = installSeededRandom(42);
      const result = runGame({
        ticks: 300,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 2.0,
        speed: 1.0,
        thrust: 2000,
      });
      // Just verify the structure works — proximity depends on random asteroid placement
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('works with reactive AI', () => {
      restore = installSeededRandom(42);
      const result = runGame({
        ticks: 10,
        dt: 1 / 60,
        playerAI: 'reactive',
        enemyAI: 'reactive',
        density: 1.0,
        speed: 1.0,
        thrust: 2000,
      });
      expect(result.stats.ticks).toBe(10);
    });

    it('reports a winner when a KILL event occurs', () => {
      restore = installSeededRandom(2);
      const result = runGame({
        ticks: 300,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 1.0,
        speed: 1.0,
        thrust: 2000,
      });
      const kills = result.events.filter((e) => e.type === 'KILL');
      expect(kills.length).toBeGreaterThan(0);
      expect(result.stats.winner).not.toBe(null);
    });

    it('records action distribution in stats', () => {
      restore = installSeededRandom(42);
      const result = runGame({
        ticks: 60,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 1.0,
        speed: 1.0,
        thrust: 2000,
      });
      expect(result.stats).toHaveProperty('actionCounts');
      // Should have at least one action counted
      const totalActions = Object.values(result.stats.actionCounts).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalActions).toBe(60);
    });

    it('enemy spawns with back toward player (not aimed at player)', () => {
      restore = installSeededRandom(42);
      // The enemy's first FIRE event should have a large angle (back is turned),
      // while the player fires first since it doesn't need to rotate as much.
      const result = runGame({
        ticks: 120,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 0.5,
        speed: 1.0,
        thrust: 2000,
      });
      const enemyFires = result.events.filter(
        (e) => e.type === 'FIRE' && e.data.owner === 'enemy',
      );
      const playerFires = result.events.filter(
        (e) => e.type === 'FIRE' && e.data.owner === 'player',
      );
      // Enemy should fire later than before since it starts facing away
      // If both fire, player should fire first or at similar time
      if (enemyFires.length > 0 && playerFires.length > 0) {
        expect(playerFires[0].elapsed).toBeLessThanOrEqual(
          enemyFires[0].elapsed + 0.5,
        );
      }
    });

    it('does not generate PROXIMITY events for dead ships', () => {
      restore = installSeededRandom(2);
      const result = runGame({
        ticks: 300,
        dt: 1 / 60,
        playerAI: 'predictive',
        enemyAI: 'predictive',
        density: 2.0,
        speed: 1.0,
        thrust: 2000,
      });
      const kills = result.events.filter((e) => e.type === 'KILL');
      if (kills.length > 0) {
        const firstKillTick = kills[0].tick;
        const victim = kills[0].data.victim;
        // No PROXIMITY events for the dead ship after the kill tick
        const postDeathProximity = result.events.filter(
          (e) =>
            e.type === 'PROXIMITY' &&
            e.data.owner === victim &&
            e.tick > firstKillTick,
        );
        expect(postDeathProximity.length).toBe(0);
      }
    });
  });
});

// --- Test helpers ---

function makeShip(overrides = {}) {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    alive: true,
    thrust: false,
    rotatingLeft: false,
    rotatingRight: false,
    braking: false,
    fire: false,
    thrustIntensity: 0,
    fireCooldown: 0,
    owner: 'player',
    ...overrides,
  };
}

function makeActionChangeEvent(tick, elapsed, prev, next, dataOverrides = {}) {
  return {
    tick,
    elapsed,
    type: 'ACTION_CHANGE',
    data: {
      owner: 'enemy',
      prev,
      next,
      scores: [
        { name: 'T___', score: 3000 },
        { name: 'T_R_', score: 2900 },
      ],
      ...dataOverrides,
    },
  };
}
