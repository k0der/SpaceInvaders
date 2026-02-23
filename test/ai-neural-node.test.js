import { describe, expect, it, vi } from 'vitest';
import { ACTION_MAP } from '../src/game-env.js';
import { OBSERVATION_SIZE } from '../src/observation.js';

// ── Dynamic Import ──────────────────────────────────────────────────
// ai-neural-node.js uses dynamic import('onnxruntime-node') internally.
// We mock it at the module level so the strategy can be imported in tests.

// Mock onnxruntime-node before importing the module under test
vi.mock('onnxruntime-node', () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      run: vi.fn().mockResolvedValue({
        logits: { data: new Float32Array(12) },
      }),
    }),
  },
  Tensor: vi.fn().mockImplementation((type, data, dims) => ({
    type,
    data,
    dims,
  })),
}));

const { selfPlayStrategy } = await import('../src/ai-neural-node.js');

// ── Strategy Interface ──────────────────────────────────────────────

describe('ai-neural-node: Strategy Interface', () => {
  it('selfPlayStrategy has createState and update methods', () => {
    expect(typeof selfPlayStrategy.createState).toBe('function');
    expect(typeof selfPlayStrategy.update).toBe('function');
  });

  it('is registered as "self-play" in the strategy registry', async () => {
    const { getStrategy } = await import('../src/ai-core.js');
    const strategy = getStrategy('self-play');
    expect(strategy).toBe(selfPlayStrategy);
  });
});

// ── createState ─────────────────────────────────────────────────────

describe('ai-neural-node: createState', () => {
  it('returns object with all expected fields', () => {
    const state = selfPlayStrategy.createState({});
    expect(state).toHaveProperty('modelPath');
    expect(state).toHaveProperty('session');
    expect(state).toHaveProperty('inputBuffer');
    expect(state).toHaveProperty('ready');
    expect(state).toHaveProperty('loadAttempted');
    expect(state).toHaveProperty('pendingInference');
    expect(state).toHaveProperty('cachedAction');
    expect(state).toHaveProperty('fallbackStrategy');
    expect(state).toHaveProperty('fallbackState');
  });

  it('inputBuffer is Float32Array of OBSERVATION_SIZE', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.inputBuffer).toBeInstanceOf(Float32Array);
    expect(state.inputBuffer.length).toBe(OBSERVATION_SIZE);
  });

  it('ready is initially false', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.ready).toBe(false);
  });

  it('session is initially null', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.session).toBeNull();
  });

  it('pendingInference is initially false', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.pendingInference).toBe(false);
  });

  it('cachedAction is initially null', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.cachedAction).toBeNull();
  });

  it('extracts selfPlayModelPath from config', () => {
    const state = selfPlayStrategy.createState({
      selfPlayModelPath: 'path/to/model.onnx',
    });
    expect(state.modelPath).toBe('path/to/model.onnx');
  });

  it('modelPath is null when config has no selfPlayModelPath', () => {
    const state = selfPlayStrategy.createState({});
    expect(state.modelPath).toBeNull();
  });

  it('works with no config argument', () => {
    const state = selfPlayStrategy.createState();
    expect(state.modelPath).toBeNull();
    expect(state.ready).toBe(false);
  });

  it('fallbackStrategy has createState and update methods', () => {
    const state = selfPlayStrategy.createState({});
    expect(typeof state.fallbackStrategy.createState).toBe('function');
    expect(typeof state.fallbackStrategy.update).toBe('function');
  });
});

// ── Fallback Behavior ───────────────────────────────────────────────

describe('ai-neural-node: Fallback Behavior', () => {
  function makeShip() {
    return {
      x: 500,
      y: 500,
      vx: 0,
      vy: 0,
      heading: 0,
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
      fire: false,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  function makeTarget() {
    return {
      x: 700,
      y: 500,
      vx: 0,
      vy: 0,
      heading: Math.PI,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  it('when ready=false, delegates to fallback strategy', () => {
    const state = selfPlayStrategy.createState({});
    const fallbackUpdateSpy = vi.fn();
    state.fallbackStrategy = {
      createState: () => ({}),
      update: fallbackUpdateSpy,
    };

    const ship = makeShip();
    const target = makeTarget();
    selfPlayStrategy.update(state, ship, target, [], 1 / 60);

    expect(fallbackUpdateSpy).toHaveBeenCalledOnce();
    expect(fallbackUpdateSpy).toHaveBeenCalledWith(
      state.fallbackState,
      ship,
      target,
      [],
      1 / 60,
    );
  });

  it('when ready=true but cachedAction is null, delegates to fallback', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = null;
    const fallbackUpdateSpy = vi.fn();
    state.fallbackStrategy = {
      createState: () => ({}),
      update: fallbackUpdateSpy,
    };

    const ship = makeShip();
    const target = makeTarget();
    selfPlayStrategy.update(state, ship, target, [], 1 / 60);

    expect(fallbackUpdateSpy).toHaveBeenCalledOnce();
  });
});

// ── Cached Action Application ───────────────────────────────────────

describe('ai-neural-node: Cached Action Application', () => {
  function makeShip() {
    return {
      x: 500,
      y: 500,
      vx: 0,
      vy: 0,
      heading: 0,
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
      fire: false,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  function makeTarget() {
    return {
      x: 700,
      y: 500,
      vx: 0,
      vy: 0,
      heading: Math.PI,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  it('applies cached action when ready with cachedAction set', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = { moveIndex: 1, fire: true };

    const ship = makeShip();
    selfPlayStrategy.update(state, ship, makeTarget(), [], 1 / 60);

    expect(ship.thrust).toBe(true);
    expect(ship.rotatingLeft).toBe(true);
    expect(ship.rotatingRight).toBe(false);
    expect(ship.braking).toBe(false);
    expect(ship.fire).toBe(true);
  });

  it('applies all 10 movement actions correctly via cached action', () => {
    for (let i = 0; i < 10; i++) {
      const state = selfPlayStrategy.createState({});
      state.ready = true;
      state.cachedAction = { moveIndex: i, fire: false };

      const ship = makeShip();
      selfPlayStrategy.update(state, ship, makeTarget(), [], 1 / 60);

      const expected = ACTION_MAP[i];
      expect(ship.thrust).toBe(expected.thrust);
      expect(ship.rotatingLeft).toBe(expected.rotL);
      expect(ship.rotatingRight).toBe(expected.rotR);
      expect(ship.braking).toBe(expected.brake);
      expect(ship.fire).toBe(false);
    }
  });

  it('sets fire=true based on cachedAction', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = { moveIndex: 3, fire: true };

    const ship = makeShip();
    selfPlayStrategy.update(state, ship, makeTarget(), [], 1 / 60);
    expect(ship.fire).toBe(true);
  });

  it('sets fire=false based on cachedAction', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = { moveIndex: 3, fire: false };

    const ship = makeShip();
    selfPlayStrategy.update(state, ship, makeTarget(), [], 1 / 60);
    expect(ship.fire).toBe(false);
  });
});

// ── Inference Kickoff ───────────────────────────────────────────────

describe('ai-neural-node: Inference Kickoff', () => {
  function makeShip() {
    return {
      x: 500,
      y: 500,
      vx: 0,
      vy: 0,
      heading: 0,
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
      fire: false,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  function makeTarget() {
    return {
      x: 700,
      y: 500,
      vx: 0,
      vy: 0,
      heading: Math.PI,
      alive: true,
      thrustIntensity: 0,
      thrustPower: 2000,
      fireCooldown: 0,
    };
  }

  it('kicks off inference when ready and not pending', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    state.pendingInference = false;
    state.session = {
      run: vi.fn().mockResolvedValue({
        logits: { data: new Float32Array(12) },
      }),
    };

    selfPlayStrategy.update(state, makeShip(), makeTarget(), [], 1 / 60);

    expect(state.pendingInference).toBe(true);
  });

  it('does not kick off inference when already pending', () => {
    const state = selfPlayStrategy.createState({});
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    state.pendingInference = true;
    const mockRun = vi.fn();
    state.session = { run: mockRun };

    selfPlayStrategy.update(state, makeShip(), makeTarget(), [], 1 / 60);

    expect(mockRun).not.toHaveBeenCalled();
  });
});
