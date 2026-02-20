import { describe, expect, it } from 'vitest';
import {
  createAIState,
  MAX_SPAWN_DISTANCE,
  MIN_SPAWN_DISTANCE,
  spawnEnemyPosition,
  updateAI,
} from '../src/ai.js';
import { getStrategy, listStrategies } from '../src/ai-core.js';
import { predictiveStrategy } from '../src/ai-predictive.js';
import {
  createReactiveState,
  reactiveStrategy,
  updateReactiveAI,
} from '../src/ai-reactive.js';
import { createShip } from '../src/ship.js';

describe('AI Facade — strategy registration', () => {
  it('registers reactive strategy in the registry', () => {
    const strategy = getStrategy('reactive');
    expect(strategy).toBe(reactiveStrategy);
  });

  it('registers predictive strategy in the registry', () => {
    const strategy = getStrategy('predictive');
    expect(strategy).toBe(predictiveStrategy);
  });

  it('listStrategies includes reactive and predictive', () => {
    const names = listStrategies();
    expect(names).toContain('reactive');
    expect(names).toContain('predictive');
  });

  it('getStrategy throws for unknown name', () => {
    expect(() => getStrategy('nonexistent')).toThrow();
  });
});

describe('AI Facade — backward-compatible aliases', () => {
  it('createAIState is aliased to createReactiveState', () => {
    expect(createAIState).toBe(createReactiveState);
  });

  it('updateAI is aliased to updateReactiveAI', () => {
    expect(updateAI).toBe(updateReactiveAI);
  });
});

describe('AI Facade — backward-compatible behavior', () => {
  it('updateAI sets control flags identically to reactive AI', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    const target = createShip({ x: 300, y: 0, heading: 0, owner: 'player' });
    const state = createAIState();

    updateAI(state, ai, target, [], 0.016);

    expect(ai.thrust).toBe(true);
    expect(ai.fire).toBe(true);
    expect(ai.rotatingLeft).toBe(false);
    expect(ai.rotatingRight).toBe(false);
  });

  it('dead ship handling works through facade', () => {
    const ai = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
    ai.alive = false;
    const target = createShip({ x: 500, y: 0, heading: 0, owner: 'player' });

    updateAI(createAIState(), ai, target, [], 0.016);

    expect(ai.thrust).toBe(false);
    expect(ai.fire).toBe(false);
  });
});

describe('AI Facade — spawnEnemyPosition', () => {
  it('exports MIN_SPAWN_DISTANCE as a positive number', () => {
    expect(typeof MIN_SPAWN_DISTANCE).toBe('number');
    expect(MIN_SPAWN_DISTANCE).toBeGreaterThan(0);
  });

  it('exports MAX_SPAWN_DISTANCE greater than MIN_SPAWN_DISTANCE', () => {
    expect(MAX_SPAWN_DISTANCE).toBeGreaterThan(MIN_SPAWN_DISTANCE);
  });

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
