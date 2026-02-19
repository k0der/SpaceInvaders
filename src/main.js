import { createParallaxLayers, updateParallaxLayers, drawParallaxLayers } from './starfield.js';
import { drawAsteroid } from './asteroid.js';
import { createSimulation, updateSimulation } from './simulation.js';

/**
 * Calculate delta time in seconds between two timestamps (ms).
 * Caps at 0.1s to avoid spiral-of-death after tab backgrounding.
 * Never returns negative values.
 */
export function calculateDeltaTime(currentTimestamp, previousTimestamp) {
  const dtSeconds = (currentTimestamp - previousTimestamp) / 1000;
  return Math.min(Math.max(dtSeconds, 0), 0.1);
}

/**
 * Create an animation loop state object.
 * Call loop.tick(timestamp) each frame from requestAnimationFrame.
 * First tick returns dt=0 (no previous frame to diff against).
 */
export function createLoop() {
  let started = false;

  const state = {
    frameCount: 0,
    lastTimestamp: 0,

    tick(timestamp) {
      let dt = 0;
      if (started) {
        dt = calculateDeltaTime(timestamp, state.lastTimestamp);
      }
      started = true;
      state.lastTimestamp = timestamp;
      state.frameCount++;
      return dt;
    },
  };
  return state;
}

/**
 * Bootstrap the application: set up canvas, resize handling, and start the loop.
 */
export function startApp() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const loop = createLoop();
  const starLayers = createParallaxLayers(canvas.width, canvas.height);
  const sim = createSimulation(canvas.width, canvas.height);
  let elapsedTime = 0;

  function frame(timestamp) {
    const dt = loop.tick(timestamp);
    elapsedTime += dt;

    updateParallaxLayers(starLayers, dt, canvas.width, canvas.height);
    updateSimulation(sim, dt, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawParallaxLayers(ctx, starLayers, elapsedTime);

    for (const asteroid of sim.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
