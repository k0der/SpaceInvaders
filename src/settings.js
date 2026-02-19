/**
 * Configuration for each setting: range, step, default, and display label.
 */
export const SETTINGS_CONFIG = {
  asteroidCount: { min: 5, max: 50, step: 1, default: 20, label: 'Asteroids' },
  speedMultiplier: { min: 0.2, max: 3.0, step: 0.1, default: 1.0, label: 'Speed' },
  starLayers: { min: 3, max: 6, step: 1, default: 3, label: 'Star Layers' },
};

/**
 * Create settings state with defaults.
 */
export function createSettings() {
  return {
    asteroidCount: SETTINGS_CONFIG.asteroidCount.default,
    speedMultiplier: SETTINGS_CONFIG.speedMultiplier.default,
    starLayers: SETTINGS_CONFIG.starLayers.default,
    panelOpen: false,
    gearVisible: true,
    gearTimer: 0,
    panelTimer: 0,
  };
}

/**
 * Clamp a setting value to its valid range.
 * Integer settings (step=1) are rounded to the nearest integer.
 */
export function clampSetting(name, value) {
  const config = SETTINGS_CONFIG[name];
  let v = Number(value);
  if (config.step >= 1) v = Math.round(v);
  return Math.min(config.max, Math.max(config.min, v));
}

/**
 * Update auto-hide timers. Call each frame with dt.
 * - Gear hides after 3s of no mouse movement (caller resets gearTimer to 0 on mouse move)
 * - Panel closes after 4s of no mouse activity over it (caller resets panelTimer to 0)
 */
export function updateAutoHide(settings, dt) {
  settings.gearTimer += dt;
  if (settings.gearTimer < 3) {
    settings.gearVisible = true;
  } else {
    settings.gearVisible = false;
  }

  if (settings.panelOpen) {
    settings.panelTimer += dt;
    if (settings.panelTimer >= 4) {
      settings.panelOpen = false;
    }
  }
}

/**
 * Format a setting value for display.
 */
function formatValue(name, value) {
  if (name === 'speedMultiplier') return value.toFixed(1) + 'x';
  return String(value);
}

/**
 * Create the settings UI: gear button, panel with sliders.
 * Returns { gearButton, panel, sliders, valueDisplays, onChange }.
 */
export function createSettingsUI(container, settings) {
  // Gear button
  const gearButton = document.createElement('button');
  gearButton.textContent = '\u2699';
  gearButton.style.cssText =
    'position:fixed;bottom:20px;right:20px;background:none;border:none;' +
    'color:#fff;font-size:28px;cursor:pointer;opacity:0.3;z-index:1001;' +
    'padding:8px;line-height:1;transition:opacity 0.2s;';
  gearButton.addEventListener('mouseenter', () => { gearButton.style.opacity = '0.8'; });
  gearButton.addEventListener('mouseleave', () => { gearButton.style.opacity = '0.3'; });
  container.appendChild(gearButton);

  // Panel
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:0;right:0;width:260px;height:100%;' +
    'background:rgba(0,0,0,0.85);color:#fff;font-family:"Courier New",monospace;' +
    'font-size:14px;padding:24px 20px;box-sizing:border-box;z-index:1000;' +
    'display:none;';
  container.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Settings';
  title.style.cssText = 'font-size:18px;margin-bottom:24px;';
  panel.appendChild(title);

  let _onChange = () => {};

  const sliders = {};
  const valueDisplays = {};

  for (const [name, config] of Object.entries(SETTINGS_CONFIG)) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:20px;';

    const label = document.createElement('label');
    label.style.cssText = 'display:block;margin-bottom:6px;';

    const labelText = document.createElement('span');
    labelText.textContent = config.label;

    const valueSpan = document.createElement('span');
    valueSpan.textContent = formatValue(name, config.default);
    valueSpan.style.cssText = 'float:right;';
    valueDisplays[name] = valueSpan;

    label.appendChild(labelText);
    label.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.default);
    slider.style.cssText = 'width:100%;';
    sliders[name] = slider;

    slider.addEventListener('input', () => {
      const val = clampSetting(name, slider.value);
      valueSpan.textContent = formatValue(name, val);
      _onChange(name, val);
    });

    row.appendChild(label);
    row.appendChild(slider);
    panel.appendChild(row);
  }

  // Gear click toggles panel
  gearButton.addEventListener('click', () => {
    settings.panelOpen = !settings.panelOpen;
    settings.panelTimer = 0;
    panel.style.display = settings.panelOpen ? 'block' : 'none';
  });

  // Escape closes panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      settings.panelOpen = false;
      panel.style.display = 'none';
    }
  });

  return {
    gearButton,
    panel,
    sliders,
    valueDisplays,
    set onChange(fn) { _onChange = fn; },
    get onChange() { return _onChange; },
  };
}
