/**
 * Configuration for each setting: range, step, default, and display label.
 */
export const SETTINGS_CONFIG = {
  asteroidDensity: {
    min: 0.5,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    label: 'Density',
  },
  speedMultiplier: {
    min: 0.2,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    label: 'Speed',
  },
  starLayers: { min: 3, max: 6, step: 1, default: 3, label: 'Star Layers' },
  thrustPower: {
    min: 1000,
    max: 5000,
    step: 50,
    default: 2000,
    label: 'Thrust',
  },
  starDirection: {
    options: ['left', 'right', 'up', 'down', 'radial'],
    default: 'left',
    label: 'Direction',
  },
  aiStrategy: {
    options: ['reactive', 'predictive'],
    default: 'predictive',
    label: 'AI Strategy',
  },
};

const STORAGE_KEY = 'asteroidSettings';

/**
 * Create settings state with defaults, optionally applying overrides.
 */
export function createSettings(overrides = {}) {
  return {
    asteroidDensity:
      overrides.asteroidDensity ?? SETTINGS_CONFIG.asteroidDensity.default,
    speedMultiplier:
      overrides.speedMultiplier ?? SETTINGS_CONFIG.speedMultiplier.default,
    starLayers: overrides.starLayers ?? SETTINGS_CONFIG.starLayers.default,
    thrustPower: overrides.thrustPower ?? SETTINGS_CONFIG.thrustPower.default,
    starDirection:
      overrides.starDirection ?? SETTINGS_CONFIG.starDirection.default,
    aiStrategy: overrides.aiStrategy ?? SETTINGS_CONFIG.aiStrategy.default,
    panelOpen: false,
    gearVisible: true,
    gearHovered: false,
    gearTimer: 0,
    panelTimer: 0,
  };
}

/**
 * Save the 3 tunable settings to localStorage.
 */
export function saveSettings(settings) {
  const data = {
    asteroidDensity: settings.asteroidDensity,
    speedMultiplier: settings.speedMultiplier,
    starLayers: settings.starLayers,
    thrustPower: settings.thrustPower,
    starDirection: settings.starDirection,
    aiStrategy: settings.aiStrategy,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Load settings from localStorage. Returns an object with tunable values.
 * Falls back to defaults if storage is empty, corrupt, or contains invalid values.
 */
export function loadSettings() {
  const defaults = {
    asteroidDensity: SETTINGS_CONFIG.asteroidDensity.default,
    speedMultiplier: SETTINGS_CONFIG.speedMultiplier.default,
    starLayers: SETTINGS_CONFIG.starLayers.default,
    thrustPower: SETTINGS_CONFIG.thrustPower.default,
    starDirection: SETTINGS_CONFIG.starDirection.default,
    aiStrategy: SETTINGS_CONFIG.aiStrategy.default,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaults;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return defaults;
    }

    const result = {};
    for (const name of Object.keys(defaults)) {
      const config = SETTINGS_CONFIG[name];
      const val = parsed[name];

      if (config.options) {
        // String enum setting (e.g. starDirection)
        result[name] = config.options.includes(val) ? val : defaults[name];
      } else if (typeof val === 'number' && !Number.isNaN(val)) {
        result[name] = clampSetting(name, val);
      } else {
        result[name] = defaults[name];
      }
    }
    return result;
  } catch {
    return defaults;
  }
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
  if (name === 'speedMultiplier' || name === 'asteroidDensity')
    return `${value.toFixed(1)}x`;
  return String(value);
}

/**
 * Create the settings UI: gear button, panel with sliders.
 * Returns { gearButton, panel, sliders, valueDisplays, onChange }.
 */
export function createSettingsUI(container, settings) {
  // Hamburger menu button
  const gearButton = document.createElement('button');
  gearButton.textContent = '\u2630';
  gearButton.style.cssText =
    'position:fixed;top:20px;left:20px;background:none;border:none;' +
    'color:#fff;font-size:28px;cursor:pointer;opacity:0.3;z-index:1001;' +
    'padding:8px;line-height:1;transition:opacity 0.2s;';
  gearButton.addEventListener('mouseenter', () => {
    settings.gearHovered = true;
    gearButton.style.opacity = '0.8';
  });
  gearButton.addEventListener('mouseleave', () => {
    settings.gearHovered = false;
    gearButton.style.opacity = '0.3';
  });
  container.appendChild(gearButton);

  // Panel
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:0;left:0;width:260px;height:100%;' +
    'background:rgba(0,0,0,0.85);color:#fff;font-family:"Courier New",monospace;' +
    'font-size:14px;padding:70px 20px 24px;box-sizing:border-box;z-index:1000;' +
    'display:none;';
  container.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Settings';
  title.style.cssText = 'font-size:18px;margin-bottom:24px;';
  panel.appendChild(title);

  let _onChange = () => {};

  const sliders = {};
  const valueDisplays = {};

  const selects = {};

  for (const [name, config] of Object.entries(SETTINGS_CONFIG)) {
    if (config.options) {
      // Enum setting — render as a <select> dropdown
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:20px;';

      const label = document.createElement('label');
      label.style.cssText = 'display:block;margin-bottom:6px;';
      label.textContent = config.label;

      const select = document.createElement('select');
      select.style.cssText =
        'width:100%;background:#222;color:#fff;border:1px solid #555;' +
        'padding:4px;font-family:"Courier New",monospace;font-size:14px;';
      for (const opt of config.options) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      }
      select.value = settings[name];
      selects[name] = select;

      select.addEventListener('change', () => {
        _onChange(name, select.value);
      });

      row.appendChild(label);
      row.appendChild(select);
      panel.appendChild(row);
      continue;
    }

    // Numeric setting — render as a slider
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:20px;';

    const label = document.createElement('label');
    label.style.cssText = 'display:block;margin-bottom:6px;';

    const labelText = document.createElement('span');
    labelText.textContent = config.label;

    const valueSpan = document.createElement('span');
    valueSpan.textContent = formatValue(name, settings[name]);
    valueSpan.style.cssText = 'float:right;';
    valueDisplays[name] = valueSpan;

    label.appendChild(labelText);
    label.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(settings[name]);
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

  // Button click toggles panel; swap icon between ☰ and ✕
  gearButton.addEventListener('click', () => {
    settings.panelOpen = !settings.panelOpen;
    settings.panelTimer = 0;
    panel.style.display = settings.panelOpen ? 'block' : 'none';
    gearButton.textContent = settings.panelOpen ? '\u2715' : '\u2630';
  });

  // Escape closes panel
  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      settings.panelOpen = false;
      panel.style.display = 'none';
      gearButton.textContent = '\u2630';
    }
  };
  document.addEventListener('keydown', onKeydown);

  return {
    gearButton,
    panel,
    sliders,
    valueDisplays,
    selects,
    directionSelect: selects.starDirection,
    set onChange(fn) {
      _onChange = fn;
    },
    get onChange() {
      return _onChange;
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
    },
  };
}
