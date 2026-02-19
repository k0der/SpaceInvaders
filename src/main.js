import { createParallaxLayers, updateParallaxLayers, drawParallaxLayers } from './starfield.js';
import { drawAsteroid } from './asteroid.js';
import { createSimulation, updateSimulation } from './simulation.js';
import { createSettings, createSettingsUI, updateAutoHide } from './settings.js';

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
  let starLayers = createParallaxLayers(canvas.width, canvas.height);
  const sim = createSimulation(canvas.width, canvas.height);
  const settings = createSettings();
  let elapsedTime = 0;

  // Settings UI
  const ui = createSettingsUI(document.body);
  ui.onChange = (name, value) => {
    settings[name] = value;
    if (name === 'asteroidCount') {
      sim.targetCount = value;
    }
    if (name === 'starLayers') {
      starLayers = createParallaxLayers(canvas.width, canvas.height, value);
    }
  };

  // Auto-hide: reset gear timer on any mouse movement
  window.addEventListener('mousemove', () => {
    settings.gearTimer = 0;
    if (settings.panelOpen) {
      settings.panelTimer = 0;
    }
  });

  function frame(timestamp) {
    const dt = loop.tick(timestamp);
    elapsedTime += dt;

    // Apply speed multiplier to simulation dt
    const scaledDt = dt * settings.speedMultiplier;

    updateAutoHide(settings, dt);
    ui.gearButton.style.opacity = settings.gearVisible ? '0.3' : '0';
    ui.gearButton.style.pointerEvents = settings.gearVisible ? 'auto' : 'none';
    if (!settings.panelOpen) {
      ui.panel.style.display = 'none';
    }

    updateParallaxLayers(starLayers, scaledDt, canvas.width, canvas.height);
    updateSimulation(sim, scaledDt, canvas.width, canvas.height);

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
