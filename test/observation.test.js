import { describe, expect, it } from 'vitest';
import { FIRE_COOLDOWN } from '../src/bullet.js';
import {
  buildObservation,
  MAX_ASTEROID_OBS,
  OBSERVATION_SIZE,
} from '../src/observation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ship(overrides = {}) {
  const defaults = {
    x: 0,
    y: 0,
    heading: 0,
    vx: 0,
    vy: 0,
    thrustIntensity: 0,
    rotatingLeft: false,
    rotatingRight: false,
    alive: true,
    fireCooldown: 0,
    owner: 'player',
  };
  return { ...defaults, ...overrides };
}

function asteroid(x, y, vx = 0, vy = 0, collisionRadius = 30) {
  return { x, y, vx, vy, collisionRadius };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Increment 31: Observation Builder', () => {
  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------

  describe('constants', () => {
    it('OBSERVATION_SIZE is 36', () => {
      expect(OBSERVATION_SIZE).toBe(36);
    });

    it('MAX_ASTEROID_OBS is 8', () => {
      expect(MAX_ASTEROID_OBS).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // Return type
  // -----------------------------------------------------------------------

  describe('return type', () => {
    it('returns a Float32Array of length OBSERVATION_SIZE', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), []);
      expect(obs).toBeInstanceOf(Float32Array);
      expect(obs.length).toBe(OBSERVATION_SIZE);
    });
  });

  // -----------------------------------------------------------------------
  // Self state (indices 0–5)
  // -----------------------------------------------------------------------

  describe('self state', () => {
    it('index 0: speed=0 when stationary', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), []);
      expect(obs[0]).toBe(0);
    });

    it('index 0: speed normalized by MAX_SPEED', () => {
      // vx=300, vy=400 → speed=500, but MAX_SPEED=400 → clamped to 1.0
      const obs = buildObservation(
        ship({ vx: 300, vy: 400 }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[0]).toBeCloseTo(1.0, 4);
    });

    it('index 0: speed within [0, 1] for normal velocity', () => {
      // vx=200, vy=0 → speed=200 → 200/400 = 0.5
      const obs = buildObservation(ship({ vx: 200 }), ship({ x: 100 }), []);
      expect(obs[0]).toBeCloseTo(0.5, 4);
    });

    it('index 1: velocity angle = 0 when speed is 0', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), []);
      expect(obs[1]).toBe(0);
    });

    it('index 1: velocity angle = 0 when moving in heading direction', () => {
      // heading=0 (east), velocity=east → angle=0
      const obs = buildObservation(
        ship({ heading: 0, vx: 100, vy: 0 }),
        ship({ x: 200 }),
        [],
      );
      expect(obs[1]).toBeCloseTo(0, 4);
    });

    it('index 1: velocity angle = 0.5 when drifting 90° right of heading', () => {
      // heading=0 (east), velocity=south (vy>0 in canvas coords) → angle=π/2 → 0.5
      const obs = buildObservation(
        ship({ heading: 0, vx: 0, vy: 100 }),
        ship({ x: 200 }),
        [],
      );
      expect(obs[1]).toBeCloseTo(0.5, 4);
    });

    it('index 2: thrustIntensity copied directly', () => {
      const obs = buildObservation(
        ship({ thrustIntensity: 0.7 }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[2]).toBeCloseTo(0.7, 4);
    });

    it('index 3: rotation direction = -1 when rotatingLeft', () => {
      const obs = buildObservation(
        ship({ rotatingLeft: true }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[3]).toBe(-1);
    });

    it('index 3: rotation direction = +1 when rotatingRight', () => {
      const obs = buildObservation(
        ship({ rotatingRight: true }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[3]).toBe(1);
    });

    it('index 3: rotation direction = 0 when not rotating', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), []);
      expect(obs[3]).toBe(0);
    });

    it('index 4: alive = 1 when ship is alive', () => {
      const obs = buildObservation(ship({ alive: true }), ship({ x: 100 }), []);
      expect(obs[4]).toBe(1);
    });

    it('index 4: alive = 0 when ship is dead', () => {
      const obs = buildObservation(
        ship({ alive: false }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[4]).toBe(0);
    });

    it('index 5: fire cooldown fraction', () => {
      // fireCooldown=0.1, FIRE_COOLDOWN=0.2 → 0.5
      const obs = buildObservation(
        ship({ fireCooldown: 0.1 }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[5]).toBeCloseTo(0.5, 4);
    });

    it('index 5: 0 when cooldown is 0 (ready to fire)', () => {
      const obs = buildObservation(
        ship({ fireCooldown: 0 }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[5]).toBe(0);
    });

    it('index 5: 1 when cooldown is full', () => {
      const obs = buildObservation(
        ship({ fireCooldown: FIRE_COOLDOWN }),
        ship({ x: 100 }),
        [],
      );
      expect(obs[5]).toBeCloseTo(1.0, 4);
    });
  });

  // -----------------------------------------------------------------------
  // Target state (indices 6–11)
  // -----------------------------------------------------------------------

  describe('target state', () => {
    it('index 6: distance normalized by 1000, clamped to [0, 1]', () => {
      // distance = 500 → 0.5
      const obs = buildObservation(ship(), ship({ x: 500 }), []);
      expect(obs[6]).toBeCloseTo(0.5, 4);
    });

    it('index 6: clamped to 1.0 for very far targets', () => {
      const obs = buildObservation(ship(), ship({ x: 2000 }), []);
      expect(obs[6]).toBeCloseTo(1.0, 4);
    });

    it('index 6: 0 when target is at same position', () => {
      const obs = buildObservation(ship(), ship(), []);
      expect(obs[6]).toBe(0);
    });

    it('index 7: bearing = 0 when target is directly ahead', () => {
      // heading=0 (east), target at (100, 0) → bearing=0
      const obs = buildObservation(ship({ heading: 0 }), ship({ x: 100 }), []);
      expect(obs[7]).toBeCloseTo(0, 4);
    });

    it('index 7: bearing = 0.5 when target is 90° right', () => {
      // heading=0 (east), target at (0, 100) → bearing=π/2 → 0.5
      const obs = buildObservation(ship({ heading: 0 }), ship({ y: 100 }), []);
      expect(obs[7]).toBeCloseTo(0.5, 4);
    });

    it('index 7: bearing ≈ ±1 when target is behind', () => {
      // heading=0 (east), target at (-100, 0) → bearing=π → ±1.0
      const obs = buildObservation(ship({ heading: 0 }), ship({ x: -100 }), []);
      expect(Math.abs(obs[7])).toBeCloseTo(1.0, 4);
    });

    it('index 7: bearing correct at heading=π/2', () => {
      // heading=π/2 (south in canvas), target at (0, 100) → directly ahead → bearing=0
      const obs = buildObservation(
        ship({ heading: Math.PI / 2 }),
        ship({ y: 100 }),
        [],
      );
      expect(obs[7]).toBeCloseTo(0, 4);
    });

    it('index 7: bearing correct at heading=-π/2', () => {
      // heading=-π/2 (north), target at (0, -100) → directly ahead → bearing=0
      const obs = buildObservation(
        ship({ heading: -Math.PI / 2 }),
        ship({ y: -100 }),
        [],
      );
      expect(obs[7]).toBeCloseTo(0, 4);
    });

    it('index 7: bearing correct at heading=π (facing west)', () => {
      // heading=π (west), target at (-100, 0) → directly ahead → bearing=0
      const obs = buildObservation(
        ship({ heading: Math.PI }),
        ship({ x: -100 }),
        [],
      );
      expect(obs[7]).toBeCloseTo(0, 4);
    });

    it('index 7: bearing = 0 when at same position (no NaN)', () => {
      const obs = buildObservation(ship(), ship(), []);
      expect(obs[7]).toBe(0);
      expect(Number.isNaN(obs[7])).toBe(false);
    });

    it('index 8: heading difference = 0 when same heading', () => {
      const obs = buildObservation(
        ship({ heading: 0.5 }),
        ship({ x: 100, heading: 0.5 }),
        [],
      );
      expect(obs[8]).toBeCloseTo(0, 4);
    });

    it('index 8: heading difference for opposite headings', () => {
      // ship heading=0, target heading=π → diff=π → normalized=1.0
      const obs = buildObservation(
        ship({ heading: 0 }),
        ship({ x: 100, heading: Math.PI }),
        [],
      );
      expect(Math.abs(obs[8])).toBeCloseTo(1.0, 4);
    });

    it('index 8: heading difference for 90° offset', () => {
      // ship heading=0, target heading=π/2 → diff=π/2 → normalized=0.5
      const obs = buildObservation(
        ship({ heading: 0 }),
        ship({ x: 100, heading: Math.PI / 2 }),
        [],
      );
      expect(obs[8]).toBeCloseTo(0.5, 4);
    });

    it('index 9: closing speed positive when approaching', () => {
      // ship at origin moving east (vx=100), target at (500, 0) stationary
      // relVel = (100, 0), unit to target = (1, 0), dot = 100
      // normalized: 100/400 = 0.25
      const obs = buildObservation(ship({ vx: 100 }), ship({ x: 500 }), []);
      expect(obs[9]).toBeCloseTo(0.25, 4);
    });

    it('index 9: closing speed negative when separating', () => {
      // ship at origin moving west (vx=-100), target at (500, 0) stationary
      // relVel = (-100, 0), unit to target = (1, 0), dot = -100
      // normalized: -100/400 = -0.25
      const obs = buildObservation(ship({ vx: -100 }), ship({ x: 500 }), []);
      expect(obs[9]).toBeCloseTo(-0.25, 4);
    });

    it('index 9: closing speed = 0 when at same position', () => {
      const obs = buildObservation(ship({ vx: 100 }), ship(), []);
      expect(obs[9]).toBe(0);
    });

    it('index 10: lateral speed for perpendicular motion', () => {
      // ship at origin moving south (vy=200), target at (500, 0) east
      // relVel = (0, 200), unit to target = (1, 0), perp = (0, 1)
      // lateral = dot((0,200), (0,1)) = 200
      // normalized: 200/400 = 0.5
      const obs = buildObservation(ship({ vy: 200 }), ship({ x: 500 }), []);
      expect(obs[10]).toBeCloseTo(0.5, 4);
    });

    it('index 10: lateral speed = 0 when moving directly toward target', () => {
      // ship moving east, target east → all velocity is closing, none lateral
      const obs = buildObservation(ship({ vx: 200 }), ship({ x: 500 }), []);
      expect(obs[10]).toBeCloseTo(0, 4);
    });

    it('index 10: lateral speed = 0 when at same position', () => {
      const obs = buildObservation(ship({ vy: 100 }), ship(), []);
      expect(obs[10]).toBe(0);
    });

    it('index 11: target alive = 1', () => {
      const obs = buildObservation(ship(), ship({ x: 100, alive: true }), []);
      expect(obs[11]).toBe(1);
    });

    it('index 11: target alive = 0 when dead', () => {
      const obs = buildObservation(ship(), ship({ x: 100, alive: false }), []);
      expect(obs[11]).toBe(0);
    });

    it('dead target still has distance and bearing computed', () => {
      const obs = buildObservation(ship(), ship({ x: 500, alive: false }), []);
      expect(obs[6]).toBeCloseTo(0.5, 4); // distance
      expect(obs[11]).toBe(0); // dead
    });
  });

  // -----------------------------------------------------------------------
  // Asteroid observations (indices 12–35)
  // -----------------------------------------------------------------------

  describe('asteroid observations', () => {
    it('empty asteroids → all asteroid slots zero', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), []);
      for (let i = 12; i < 36; i++) {
        expect(obs[i]).toBe(0);
      }
    });

    it('single asteroid fills first 3 slots, rest zero', () => {
      // asteroid at (200, 0), ship at origin heading east
      // distance=200 → 200/1000=0.2, bearing=0 (directly ahead), approach speed depends on velocities
      const obs = buildObservation(ship({ heading: 0 }), ship({ x: 500 }), [
        asteroid(200, 0),
      ]);
      expect(obs[12]).toBeCloseTo(0.2, 4); // distance
      expect(obs[13]).toBeCloseTo(0, 4); // bearing (directly ahead)
      // Remaining asteroid slots should be zero
      for (let i = 15; i < 36; i++) {
        expect(obs[i]).toBe(0);
      }
    });

    it('more than 8 asteroids → only nearest 8 selected', () => {
      const asteroids = [];
      for (let i = 1; i <= 12; i++) {
        asteroids.push(asteroid(i * 50, 0)); // 50, 100, 150, ..., 600
      }
      const obs = buildObservation(
        ship({ heading: 0 }),
        ship({ x: 1000 }),
        asteroids,
      );
      // Nearest is at 50 → 50/1000 = 0.05
      expect(obs[12]).toBeCloseTo(0.05, 4);
      // 8th nearest is at 400 → 400/1000 = 0.4
      expect(obs[12 + 7 * 3]).toBeCloseTo(0.4, 4);
    });

    it('asteroids sorted by distance (nearest first)', () => {
      const obs = buildObservation(ship({ heading: 0 }), ship({ x: 1000 }), [
        asteroid(300, 0),
        asteroid(100, 0),
        asteroid(200, 0),
      ]);
      expect(obs[12]).toBeCloseTo(0.1, 4); // 100/1000
      expect(obs[15]).toBeCloseTo(0.2, 4); // 200/1000
      expect(obs[18]).toBeCloseTo(0.3, 4); // 300/1000
    });

    it('asteroids beyond 1000px excluded', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), [
        asteroid(1500, 0),
        asteroid(200, 0),
      ]);
      // Only the asteroid at 200 should appear
      expect(obs[12]).toBeCloseTo(0.2, 4);
      // Second slot should be zero (far asteroid excluded)
      expect(obs[15]).toBe(0);
    });

    it('asteroid bearing relative to ship heading', () => {
      // ship heading=0 (east), asteroid at (0, 100) → bearing=π/2 → 0.5
      const obs = buildObservation(ship({ heading: 0 }), ship({ x: 500 }), [
        asteroid(0, 100),
      ]);
      expect(obs[13]).toBeCloseTo(0.5, 4);
    });

    it('asteroid approach speed positive when closing', () => {
      // ship moving east at 100, asteroid at (200, 0) stationary
      // relVel = (100, 0), unit toward asteroid = (1, 0), dot = 100
      // normalized: 100/200 = 0.5
      const obs = buildObservation(
        ship({ heading: 0, vx: 100 }),
        ship({ x: 500 }),
        [asteroid(200, 0)],
      );
      expect(obs[14]).toBeCloseTo(0.5, 4);
    });

    it('asteroid approach speed negative when separating', () => {
      // ship moving west at 100, asteroid at (200, 0) stationary
      // relVel = (-100, 0), unit toward asteroid = (1, 0), dot = -100
      // normalized: -100/200 = -0.5
      const obs = buildObservation(
        ship({ heading: 0, vx: -100 }),
        ship({ x: 500 }),
        [asteroid(200, 0)],
      );
      expect(obs[14]).toBeCloseTo(-0.5, 4);
    });

    it('zero-padded when fewer than k asteroids', () => {
      const obs = buildObservation(ship(), ship({ x: 100 }), [
        asteroid(200, 0),
      ]);
      // Slots for asteroids 2–8 should be zero
      for (let i = 15; i < 36; i++) {
        expect(obs[i]).toBe(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Normalization bounds
  // -----------------------------------------------------------------------

  describe('normalization bounds', () => {
    it('all values within documented ranges for extreme inputs', () => {
      const s = ship({
        vx: 9999,
        vy: 9999,
        heading: 5.0,
        thrustIntensity: 1.0,
        rotatingLeft: true,
        fireCooldown: 1.0,
      });
      const t = ship({
        x: 50000,
        y: 50000,
        heading: -5.0,
        vx: -9999,
        alive: false,
      });
      const rocks = [];
      for (let i = 0; i < 20; i++) {
        rocks.push(asteroid(i * 30, i * 30, 500, -500, 50));
      }
      const obs = buildObservation(s, t, rocks);
      for (let i = 0; i < OBSERVATION_SIZE; i++) {
        expect(Number.isNaN(obs[i])).toBe(false);
        expect(Number.isFinite(obs[i])).toBe(true);
        expect(obs[i]).toBeGreaterThanOrEqual(-1);
        expect(obs[i]).toBeLessThanOrEqual(1);
      }
    });

    it('no NaN or Infinity for zero-distance, zero-velocity edge case', () => {
      const obs = buildObservation(ship(), ship(), [asteroid(0, 0)]);
      for (let i = 0; i < OBSERVATION_SIZE; i++) {
        expect(Number.isNaN(obs[i])).toBe(false);
        expect(Number.isFinite(obs[i])).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Purity
  // -----------------------------------------------------------------------

  describe('purity', () => {
    it('does not mutate ship input', () => {
      const s = ship({ vx: 100, vy: 200 });
      const copy = { ...s };
      buildObservation(s, ship({ x: 100 }), []);
      expect(s).toEqual(copy);
    });

    it('does not mutate target input', () => {
      const t = ship({ x: 500, heading: 1.0, alive: false });
      const copy = { ...t };
      buildObservation(ship(), t, []);
      expect(t).toEqual(copy);
    });

    it('does not mutate asteroid inputs', () => {
      const a = asteroid(200, 100, 50, -30);
      const copy = { ...a };
      buildObservation(ship(), ship({ x: 500 }), [a]);
      expect(a).toEqual(copy);
    });
  });
});
