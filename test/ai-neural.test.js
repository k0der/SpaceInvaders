import { describe, expect, it, vi } from 'vitest';
import { getStrategy } from '../src/ai-core.js';
import {
  ACTION_HOLD_TIME,
  applyMoveAction,
  argmax,
  decodeActions,
  loadOnnxRuntime,
  MODEL_PATH,
  neuralStrategy,
  ONNX_CDN_URL,
} from '../src/ai-neural.js';
import { ACTION_MAP } from '../src/game-env.js';
import { OBSERVATION_SIZE } from '../src/observation.js';

// ── Pure Functions ──────────────────────────────────────────────────

describe('ai-neural: argmax', () => {
  it('returns index of max value in full array', () => {
    expect(argmax([1, 3, 2], 0, 3)).toBe(1);
  });

  it('returns index of max value in subrange', () => {
    // Array: [10, 1, 5, 8, 2], subrange [1..4) → values [1, 5, 8]
    // Max is 8 at absolute index 3, relative index 2
    expect(argmax([10, 1, 5, 8, 2], 1, 4)).toBe(2);
  });

  it('returns 0 for single element', () => {
    expect(argmax([42], 0, 1)).toBe(0);
  });

  it('handles negative values', () => {
    expect(argmax([-5, -1, -3], 0, 3)).toBe(1);
  });

  it('breaks ties by picking the first (lowest index)', () => {
    expect(argmax([3, 3, 1], 0, 3)).toBe(0);
  });

  it('works with Float32Array', () => {
    const arr = new Float32Array([0.1, 0.9, 0.5]);
    expect(argmax(arr, 0, 3)).toBe(1);
  });
});

describe('ai-neural: decodeActions', () => {
  it('extracts movement as argmax of first 10 logits', () => {
    // logits[2] is highest among [0..9]
    const logits = new Float32Array(12);
    logits[2] = 5.0;
    const { moveIndex } = decodeActions(logits);
    expect(moveIndex).toBe(2);
  });

  it('sets fire=true when logits[11] > logits[10]', () => {
    const logits = new Float32Array(12);
    logits[10] = 0.3; // no-fire logit
    logits[11] = 0.7; // fire logit
    const { fire } = decodeActions(logits);
    expect(fire).toBe(true);
  });

  it('sets fire=false when logits[11] < logits[10]', () => {
    const logits = new Float32Array(12);
    logits[10] = 0.8;
    logits[11] = 0.2;
    const { fire } = decodeActions(logits);
    expect(fire).toBe(false);
  });

  it('sets fire=false when logits[11] equals logits[10] (tie)', () => {
    const logits = new Float32Array(12);
    logits[10] = 0.5;
    logits[11] = 0.5;
    const { fire } = decodeActions(logits);
    expect(fire).toBe(false);
  });

  it('handles all-zero logits (moveIndex=0, fire=false)', () => {
    const logits = new Float32Array(12);
    const { moveIndex, fire } = decodeActions(logits);
    expect(moveIndex).toBe(0);
    expect(fire).toBe(false);
  });

  it('each move index 0–9 is reachable', () => {
    for (let expected = 0; expected < 10; expected++) {
      const logits = new Float32Array(12);
      logits[expected] = 1.0;
      const { moveIndex } = decodeActions(logits);
      expect(moveIndex).toBe(expected);
    }
  });
});

describe('ai-neural: applyMoveAction', () => {
  function makeShip() {
    return {
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      braking: false,
      fire: false,
      x: 100,
      y: 200,
      heading: 0,
    };
  }

  it('applies all 10 action indices producing correct flag combos', () => {
    for (let i = 0; i < 10; i++) {
      const ship = makeShip();
      applyMoveAction(ship, i);
      const expected = ACTION_MAP[i];
      expect(ship.thrust).toBe(expected.thrust);
      expect(ship.rotatingLeft).toBe(expected.rotL);
      expect(ship.rotatingRight).toBe(expected.rotR);
      expect(ship.braking).toBe(expected.brake);
    }
  });

  it('does not mutate other ship properties', () => {
    const ship = makeShip();
    applyMoveAction(ship, 0); // thrust-straight
    expect(ship.x).toBe(100);
    expect(ship.y).toBe(200);
    expect(ship.heading).toBe(0);
    expect(ship.fire).toBe(false); // fire not touched by applyMoveAction
  });
});

// ── Constants ───────────────────────────────────────────────────────

describe('ai-neural: Constants', () => {
  it('exports ONNX_CDN_URL as a string', () => {
    expect(typeof ONNX_CDN_URL).toBe('string');
    expect(ONNX_CDN_URL.length).toBeGreaterThan(0);
  });

  it('exports MODEL_PATH as models/policy.onnx', () => {
    expect(MODEL_PATH).toBe('models/policy.onnx');
  });
});

// ── Strategy Interface ──────────────────────────────────────────────

describe('ai-neural: Strategy Interface', () => {
  it('neuralStrategy has createState and update methods', () => {
    expect(typeof neuralStrategy.createState).toBe('function');
    expect(typeof neuralStrategy.update).toBe('function');
  });

  it('is registered as "neural" via getStrategy', () => {
    const strategy = getStrategy('neural');
    expect(strategy).toBe(neuralStrategy);
  });
});

// ── createState ─────────────────────────────────────────────────────

describe('ai-neural: createState', () => {
  it('returns object with all expected fields', () => {
    const state = neuralStrategy.createState();
    expect(state).toHaveProperty('session');
    expect(state).toHaveProperty('inputBuffer');
    expect(state).toHaveProperty('ready');
    expect(state).toHaveProperty('fallbackStrategy');
    expect(state).toHaveProperty('fallbackState');
    expect(state).toHaveProperty('pendingInference');
    expect(state).toHaveProperty('cachedAction');
  });

  it('inputBuffer is Float32Array of OBSERVATION_SIZE', () => {
    const state = neuralStrategy.createState();
    expect(state.inputBuffer).toBeInstanceOf(Float32Array);
    expect(state.inputBuffer.length).toBe(OBSERVATION_SIZE);
  });

  it('ready is initially false', () => {
    const state = neuralStrategy.createState();
    expect(state.ready).toBe(false);
  });

  it('session is initially null', () => {
    const state = neuralStrategy.createState();
    expect(state.session).toBeNull();
  });

  it('fallbackStrategy is predictiveStrategy', () => {
    const state = neuralStrategy.createState();
    expect(typeof state.fallbackStrategy.createState).toBe('function');
    expect(typeof state.fallbackStrategy.update).toBe('function');
  });

  it('pendingInference is initially false', () => {
    const state = neuralStrategy.createState();
    expect(state.pendingInference).toBe(false);
  });

  it('cachedAction is initially null', () => {
    const state = neuralStrategy.createState();
    expect(state.cachedAction).toBeNull();
  });

  it('holdTimer is initially 0', () => {
    const state = neuralStrategy.createState();
    expect(state.holdTimer).toBe(0);
  });

  it('observedAsteroids is initially null', () => {
    const state = neuralStrategy.createState();
    expect(state.observedAsteroids).toBeNull();
  });
});

// ── Fallback Behavior ───────────────────────────────────────────────

describe('ai-neural: Fallback Behavior', () => {
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
    const state = neuralStrategy.createState();
    // state.ready is false by default
    const fallbackUpdateSpy = vi.fn();
    state.fallbackStrategy = {
      createState: () => ({}),
      update: fallbackUpdateSpy,
    };

    const ship = makeShip();
    const target = makeTarget();
    neuralStrategy.update(state, ship, target, [], 1 / 60);

    expect(fallbackUpdateSpy).toHaveBeenCalledOnce();
    expect(fallbackUpdateSpy).toHaveBeenCalledWith(
      state.fallbackState,
      ship,
      target,
      [],
      1 / 60,
    );
  });

  it('observedAsteroids stays null during fallback (ready=false)', () => {
    const state = neuralStrategy.createState();
    const asteroids = [{ x: 600, y: 500, vx: 0, vy: 0, collisionRadius: 30 }];
    neuralStrategy.update(state, makeShip(), makeTarget(), asteroids, 1 / 60);

    // No cyan until model actually runs inference
    expect(state.observedAsteroids).toBeNull();
  });
});

// ── Inference Pipeline (mocked session) ─────────────────────────────

describe('ai-neural: Inference Pipeline', () => {
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
    const state = neuralStrategy.createState();
    state.ready = true;
    // Pre-set a cached action for movement index 1 (thrust-left) + fire
    state.cachedAction = { moveIndex: 1, fire: true };

    const ship = makeShip();
    neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);

    expect(ship.thrust).toBe(true);
    expect(ship.rotatingLeft).toBe(true);
    expect(ship.rotatingRight).toBe(false);
    expect(ship.braking).toBe(false);
    expect(ship.fire).toBe(true);
  });

  it('applies all 10 movement actions correctly via cached action', () => {
    for (let i = 0; i < 10; i++) {
      const state = neuralStrategy.createState();
      state.ready = true;
      state.cachedAction = { moveIndex: i, fire: false };

      const ship = makeShip();
      neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);

      const expected = ACTION_MAP[i];
      expect(ship.thrust).toBe(expected.thrust);
      expect(ship.rotatingLeft).toBe(expected.rotL);
      expect(ship.rotatingRight).toBe(expected.rotR);
      expect(ship.braking).toBe(expected.brake);
      expect(ship.fire).toBe(false);
    }
  });

  it('sets fire=true based on cachedAction', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 3, fire: true };

    const ship = makeShip();
    neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);

    expect(ship.fire).toBe(true);
  });

  it('sets fire=false based on cachedAction', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 3, fire: false };

    const ship = makeShip();
    neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);

    expect(ship.fire).toBe(false);
  });

  it('observedAsteroids set from runInference when hold timer expires', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    state.holdTimer = 1 / 60; // expires this frame
    // Mock a session that returns valid logits
    state.session = {
      run: vi.fn().mockResolvedValue({
        logits: { data: new Float32Array(12) },
      }),
    };
    // Provide window.ort.Tensor for the Tensor constructor
    globalThis.window = {
      ort: { Tensor: vi.fn().mockImplementation(() => ({})) },
    };

    const asteroids = [{ x: 600, y: 500, vx: 0, vy: 0, collisionRadius: 30 }];
    neuralStrategy.update(state, makeShip(), makeTarget(), asteroids, 1 / 60);

    // runInference sets observedAsteroids synchronously (before first await)
    expect(state.observedAsteroids).toBeInstanceOf(Set);
    expect(state.observedAsteroids.size).toBe(1);
    expect(state.observedAsteroids.has(asteroids[0])).toBe(true);

    delete globalThis.window;
  });

  it('falls back for one frame when ready but cachedAction is null', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = null;
    const fallbackUpdateSpy = vi.fn();
    state.fallbackStrategy = {
      createState: () => ({}),
      update: fallbackUpdateSpy,
    };

    const ship = makeShip();
    const target = makeTarget();
    neuralStrategy.update(state, ship, target, [], 1 / 60);

    expect(fallbackUpdateSpy).toHaveBeenCalledOnce();
  });
});

// ── Frame Skip ──────────────────────────────────────────────────────

describe('ai-neural: Frame Skip', () => {
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

  it('ACTION_HOLD_TIME matches training config (2/60)', () => {
    expect(ACTION_HOLD_TIME).toBeCloseTo(2 / 60);
  });

  it('does not request inference while hold timer has time remaining', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    state.holdTimer = ACTION_HOLD_TIME;

    neuralStrategy.update(state, makeShip(), makeTarget(), [], 1 / 60);

    // After one frame (1/60s), timer still has ~1/60s remaining — no inference
    expect(state.holdTimer).toBeCloseTo(ACTION_HOLD_TIME - 1 / 60);
    expect(state.pendingInference).toBe(false);
  });

  it('resets hold timer when it expires', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    // One dt away from expiring
    state.holdTimer = 1 / 60;

    neuralStrategy.update(state, makeShip(), makeTarget(), [], 1 / 60);

    // Timer expired and was reset to ACTION_HOLD_TIME
    expect(state.holdTimer).toBeCloseTo(ACTION_HOLD_TIME);
  });

  it('holds cached action across hold duration', () => {
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 2, fire: true };
    state.holdTimer = ACTION_HOLD_TIME;

    // Simulate 2 frames at 1/60 dt (= full hold duration)
    for (let i = 0; i < 2; i++) {
      const ship = makeShip();
      neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);
      expect(ship.thrust).toBe(true);
      expect(ship.rotatingRight).toBe(true);
      expect(ship.fire).toBe(true);
      // Prevent pending inference from blocking subsequent frames
      state.pendingInference = false;
    }
  });

  it('speed multiplier does not change decisions per game-time', () => {
    // At speed 2.0, dt is doubled — one frame consumes the full hold duration
    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = { moveIndex: 0, fire: false };
    state.holdTimer = ACTION_HOLD_TIME; // 2/60

    const doubleDt = 2 / 60; // same as ACTION_HOLD_TIME
    neuralStrategy.update(state, makeShip(), makeTarget(), [], doubleDt);

    // Full hold consumed in one frame — timer expired and reset
    expect(state.holdTimer).toBeCloseTo(ACTION_HOLD_TIME);
  });
});

// ── CDN Loading ─────────────────────────────────────────────────────

describe('ai-neural: loadOnnxRuntime', () => {
  it('resolves immediately when window.ort already exists', async () => {
    // Set up fake window.ort
    globalThis.window = { ort: { InferenceSession: {} } };
    globalThis.document = {
      createElement: vi.fn(),
      head: { appendChild: vi.fn() },
    };

    await expect(loadOnnxRuntime()).resolves.toBeUndefined();

    // Cleanup
    delete globalThis.window;
    delete globalThis.document;
  });

  it('rejects when no document is available (server/test env)', async () => {
    // Ensure no window.ort and no document
    delete globalThis.window;
    delete globalThis.document;

    await expect(loadOnnxRuntime()).rejects.toThrow(
      'No document available to inject ONNX Runtime script',
    );
  });
});

// ── Mock ONNX Session ───────────────────────────────────────────────

describe('ai-neural: Mock ONNX session integration', () => {
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

  it('decodes mock session output into correct ship flags', () => {
    // Simulate the end-to-end decode: logits → decodeActions → applyMoveAction
    // Mock logits: index 5 (coast-right) is highest, fire logit > no-fire
    const logits = new Float32Array(12);
    logits[5] = 2.0; // coast-right
    logits[11] = 1.0; // fire
    logits[10] = -1.0; // no-fire

    const action = decodeActions(logits);
    expect(action.moveIndex).toBe(5);
    expect(action.fire).toBe(true);

    const ship = makeShip();
    applyMoveAction(ship, action.moveIndex);
    ship.fire = action.fire;

    // coast-right: thrust=false, rotL=false, rotR=true, brake=false
    expect(ship.thrust).toBe(false);
    expect(ship.rotatingLeft).toBe(false);
    expect(ship.rotatingRight).toBe(true);
    expect(ship.braking).toBe(false);
    expect(ship.fire).toBe(true);
  });

  it('update applies decoded action from mock cached result', () => {
    // Simulate what happens after inference completes:
    // state has ready=true and a cachedAction from decodeActions
    const logits = new Float32Array(12);
    logits[7] = 3.0; // brake-left (index 7)
    logits[10] = 0.5; // no-fire logit
    logits[11] = 0.1; // fire logit (less → fire=false)

    const state = neuralStrategy.createState();
    state.ready = true;
    state.cachedAction = decodeActions(logits);

    const ship = makeShip();
    neuralStrategy.update(state, ship, makeTarget(), [], 1 / 60);

    // brake-left: thrust=false, rotL=true, rotR=false, brake=true
    expect(ship.thrust).toBe(false);
    expect(ship.rotatingLeft).toBe(true);
    expect(ship.rotatingRight).toBe(false);
    expect(ship.braking).toBe(true);
    expect(ship.fire).toBe(false);
  });
});
