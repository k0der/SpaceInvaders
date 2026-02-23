/**
 * Neural AI Strategy — ONNX model inference in the browser.
 *
 * Loads a trained ONNX model and runs inference each frame to select actions.
 * Falls back to predictive AI while the model loads or if loading fails.
 * Uses the same observation vector and action mapping as the training environment.
 */

import { registerStrategy } from './ai-core.js';
import { predictiveStrategy } from './ai-predictive.js';
import { ACTION_MAP } from './game-env.js';
import { buildObservation, OBSERVATION_SIZE } from './observation.js';

/** CDN URL for ONNX Runtime Web. */
export const ONNX_CDN_URL =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort.min.js';

/** Path to the trained ONNX model file. */
export const MODEL_PATH = 'models/policy.onnx';

/** Action hold duration in game-time seconds (training: frameSkip=2 × DT=1/60). */
export const ACTION_HOLD_TIME = 2 / 60;

/**
 * Return the index of the maximum value in arr[start..end).
 * Index is 0-based relative to `start`. Ties broken by first occurrence.
 */
export function argmax(arr, start, end) {
  let bestIdx = 0;
  let bestVal = arr[start];
  for (let i = 1; i < end - start; i++) {
    if (arr[start + i] > bestVal) {
      bestVal = arr[start + i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Decode 12 raw logits into a movement index and fire decision.
 * - Movement: argmax of logits[0..10) → index 0–9
 * - Fire: logits[11] > logits[10] → true (equivalent to sigmoid > 0.5)
 */
export function decodeActions(logits) {
  const moveIndex = argmax(logits, 0, 10);
  const fire = logits[11] > logits[10];
  return { moveIndex, fire };
}

/**
 * Apply a movement action index to a ship's control flags.
 * Maps ACTION_MAP short names (rotL, rotR, brake) to ship flag names.
 */
export function applyMoveAction(ship, moveIndex) {
  const action = ACTION_MAP[moveIndex];
  ship.thrust = action.thrust;
  ship.rotatingLeft = action.rotL;
  ship.rotatingRight = action.rotR;
  ship.braking = action.brake;
}

/**
 * Dynamically load ONNX Runtime Web from CDN if not already available.
 * Resolves immediately if window.ort exists.
 */
export function loadOnnxRuntime() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.ort) {
      resolve();
      return;
    }

    if (typeof document === 'undefined') {
      reject(new Error('No document available to inject ONNX Runtime script'));
      return;
    }

    const script = document.createElement('script');
    script.src = ONNX_CDN_URL;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load ONNX Runtime from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize ONNX session asynchronously.
 * On success sets state.session and state.ready = true.
 * On failure logs a warning; state.ready stays false (permanent fallback).
 */
async function initSession(state) {
  try {
    await loadOnnxRuntime();
    // Force single-threaded WASM — multi-threading requires cross-origin
    // isolation headers (COOP/COEP) that static hosts like GitHub Pages
    // don't provide, causing SharedArrayBuffer to be unavailable.
    window.ort.env.wasm.numThreads = 1;
    // Disable proxy worker — it also requires cross-origin isolation.
    window.ort.env.wasm.proxy = false;
    state.session = await window.ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
    });
    state.ready = true;
  } catch (err) {
    console.warn('Neural AI: model load failed, using fallback.', err);
  }
}

/**
 * Kick off async inference: build observation, run session, cache result.
 */
async function runInference(state, ship, target, asteroids) {
  try {
    const obs = buildObservation(ship, target, asteroids);
    state.inputBuffer.set(obs);

    const tensor = new window.ort.Tensor('float32', state.inputBuffer, [
      1,
      OBSERVATION_SIZE,
    ]);
    const feeds = { observation: tensor };
    const results = await state.session.run(feeds);

    const logits = results.logits.data;
    state.cachedAction = decodeActions(logits);
  } catch (_err) {
    // Inference failed — keep last cached action or null (will use fallback)
  } finally {
    state.pendingInference = false;
  }
}

/**
 * Create neural AI state. Fires async model loading immediately.
 */
function createNeuralState() {
  const state = {
    session: null,
    inputBuffer: new Float32Array(OBSERVATION_SIZE),
    ready: false,
    fallbackStrategy: predictiveStrategy,
    fallbackState: predictiveStrategy.createState(),
    pendingInference: false,
    cachedAction: null,
    holdTimer: 0,
  };

  // Fire-and-forget async model loading
  initSession(state);

  return state;
}

/**
 * Neural AI update — synchronous strategy interface.
 *
 * When not ready or no cached action: delegate to fallback.
 * When ready: apply cached action and kick off next async inference.
 */
function updateNeural(state, ship, target, asteroids, dt) {
  if (!state.ready || state.cachedAction === null) {
    state.fallbackStrategy.update(
      state.fallbackState,
      ship,
      target,
      asteroids,
      dt,
    );

    // If ready but no cached action, kick off first inference
    if (state.ready && !state.pendingInference) {
      state.pendingInference = true;
      runInference(state, ship, target, asteroids);
    }
    return;
  }

  // Apply cached action every frame (held for ACTION_HOLD_TIME game-seconds)
  applyMoveAction(ship, state.cachedAction.moveIndex);
  ship.fire = state.cachedAction.fire;

  // Request new inference after hold duration expires (time-based, not frame-based)
  state.holdTimer -= dt;
  if (state.holdTimer <= 0 && !state.pendingInference) {
    state.holdTimer = ACTION_HOLD_TIME;
    state.pendingInference = true;
    runInference(state, ship, target, asteroids);
  }
}

/**
 * Neural AI strategy object — pluggable interface.
 */
export const neuralStrategy = {
  createState: createNeuralState,
  update: updateNeural,
};

// Self-register in the strategy registry
registerStrategy('neural', neuralStrategy);
