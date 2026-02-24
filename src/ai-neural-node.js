/**
 * Neural AI Strategy for Node.js — ONNX model inference via onnxruntime-node.
 *
 * Used as the self-play opponent in training stage 9. Loads a frozen ONNX
 * snapshot of the agent's own policy and runs inference each frame.
 * Falls back to predictive-optimized while the model loads or if loading fails.
 *
 * Mirrors the browser ai-neural.js pattern: fire-and-forget async inference
 * with cached action applied synchronously on each update call.
 *
 * Node.js only — not included in browser build.
 */

import { registerStrategy } from './ai-core.js';
import { applyMoveAction, decodeActions } from './ai-neural.js';
import { predictiveOptimizedStrategy } from './ai-predictive-optimized.js';
import { buildObservation, OBSERVATION_SIZE } from './observation.js';

/** Cached onnxruntime-node module (loaded once via dynamic import). */
let ort = null;

/**
 * Load onnxruntime-node dynamically. Caches the module after first load.
 * @returns {Promise<object>} The ort module
 */
async function loadOrt() {
  if (ort) return ort;
  ort = await import('onnxruntime-node');
  return ort;
}

/**
 * Initialize ONNX session asynchronously from a model file path.
 * On success sets state.session and state.ready = true.
 * On failure logs a warning; state.ready stays false (permanent fallback).
 */
async function initSession(state) {
  if (!state.modelPath) return;
  try {
    const ortModule = await loadOrt();
    state.session = await ortModule.InferenceSession.create(state.modelPath);
    state.ready = true;
  } catch (err) {
    console.warn('Self-play AI: model load failed, using fallback.', err);
  } finally {
    state.loadAttempted = true;
  }
}

/**
 * Kick off async inference: build observation, run session, cache result.
 */
async function runInference(state, ship, target, asteroids) {
  try {
    const { obs, selectedAsteroids } = buildObservation(
      ship,
      target,
      asteroids,
    );
    state.inputBuffer.set(obs);
    state.observedAsteroids = selectedAsteroids;

    const ortModule = await loadOrt();
    const tensor = new ortModule.Tensor('float32', state.inputBuffer, [
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
 * Create self-play AI state. Fires async model loading immediately if
 * config contains a selfPlayModelPath.
 *
 * @param {Object} [config] - episode configuration (from GameEnv)
 * @returns {Object} strategy state
 */
function createSelfPlayState(config) {
  const c = config || {};
  const state = {
    modelPath: c.selfPlayModelPath || null,
    session: null,
    inputBuffer: new Float32Array(OBSERVATION_SIZE),
    ready: false,
    loadAttempted: false,
    pendingInference: false,
    cachedAction: null,
    observedAsteroids: null,
    fallbackStrategy: predictiveOptimizedStrategy,
    fallbackState: predictiveOptimizedStrategy.createState(),
  };

  // Fire-and-forget async model loading
  if (state.modelPath) {
    initSession(state);
  }

  return state;
}

/**
 * Self-play AI update — synchronous strategy interface.
 *
 * When not ready or no cached action: delegate to fallback.
 * When ready: apply cached action and kick off next async inference.
 */
function updateSelfPlay(state, ship, target, asteroids, dt) {
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

  // Apply cached action
  applyMoveAction(ship, state.cachedAction.moveIndex);
  ship.fire = state.cachedAction.fire;

  // Kick off next inference if not already pending
  if (!state.pendingInference) {
    state.pendingInference = true;
    runInference(state, ship, target, asteroids);
  }
}

/**
 * Self-play AI strategy object — pluggable interface.
 */
export const selfPlayStrategy = {
  createState: createSelfPlayState,
  update: updateSelfPlay,
};

// Self-register in the strategy registry
registerStrategy('self-play', selfPlayStrategy);
