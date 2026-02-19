import { createParallaxLayers, updateStarLayerDirectional, drawParallaxLayers, redistributeStars } from './starfield.js';
import { drawAsteroid } from './asteroid.js';
import { createSimulation, updateSimulation } from './simulation.js';
import { createSettings, createSettingsUI, updateAutoHide, loadSettings, saveSettings } from './settings.js';
import { setupHiDPICanvas } from './renderer.js';
import { createShip, drawShip } from './ship.js';

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
  const dpr = window.devicePixelRatio || 1;

  let logicalSize = setupHiDPICanvas(canvas, ctx, window.innerWidth, window.innerHeight, dpr);

  const loop = createLoop();
  let starLayers = createParallaxLayers(logicalSize.width, logicalSize.height);
  const sim = createSimulation(logicalSize.width, logicalSize.height);
  const playerShip = createShip({
    x: logicalSize.width / 2,
    y: logicalSize.height / 2,
    heading: -Math.PI / 2,
  });
  const loaded = loadSettings();
  const settings = createSettings(loaded);
  let elapsedTime = 0;

  // Settings UI
  const ui = createSettingsUI(document.body, settings);
  // Apply loaded settings to simulation and starfield
  sim.targetCount = settings.asteroidCount;
  if (settings.starLayers !== 3) {
    starLayers = createParallaxLayers(logicalSize.width, logicalSize.height, settings.starLayers);
  }
  if (settings.starDirection !== 'left') {
    redistributeStars(starLayers, logicalSize.width, logicalSize.height, settings.starDirection);
  }

  ui.onChange = (name, value) => {
    settings[name] = value;
    if (name === 'asteroidCount') {
      sim.targetCount = value;
    }
    if (name === 'starLayers') {
      starLayers = createParallaxLayers(logicalSize.width, logicalSize.height, value);
    }
    if (name === 'starDirection') {
      redistributeStars(starLayers, logicalSize.width, logicalSize.height, value);
    }
    saveSettings(settings);
  };

  // Resize: update canvas with HiDPI and redistribute stars
  window.addEventListener('resize', () => {
    logicalSize = setupHiDPICanvas(canvas, ctx, window.innerWidth, window.innerHeight, dpr);
    redistributeStars(starLayers, logicalSize.width, logicalSize.height, settings.starDirection);
  });

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

    // When panel is open, button acts as close icon — always fully visible
    if (settings.panelOpen) {
      ui.gearButton.style.opacity = '0.8';
      ui.gearButton.style.pointerEvents = 'auto';
    } else {
      ui.gearButton.style.opacity = settings.gearVisible
        ? (settings.gearHovered ? '0.8' : '0.3')
        : '0';
      ui.gearButton.style.pointerEvents = settings.gearVisible ? 'auto' : 'none';
    }
    ui.panel.style.display = settings.panelOpen ? 'block' : 'none';
    ui.gearButton.textContent = settings.panelOpen ? '\u2715' : '\u2630';

    for (const layer of starLayers) {
      updateStarLayerDirectional(layer, scaledDt, logicalSize.width, logicalSize.height, settings.starDirection);
    }
    updateSimulation(sim, scaledDt, logicalSize.width, logicalSize.height);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, logicalSize.width, logicalSize.height);

    drawParallaxLayers(ctx, starLayers, elapsedTime);

    for (const asteroid of sim.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    drawShip(ctx, playerShip);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
