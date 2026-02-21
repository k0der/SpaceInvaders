// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampSetting,
  createSettings,
  createSettingsUI,
  loadSettings,
  SETTINGS_CONFIG,
  saveSettings,
  updateAutoHide,
} from '../src/settings.js';

describe('Increment 13: Settings Menu', () => {
  describe('SETTINGS_CONFIG', () => {
    it('defines asteroid density: min 0.5, max 3.0, step 0.1, default 1.0', () => {
      const c = SETTINGS_CONFIG.asteroidDensity;
      expect(c.min).toBe(0.5);
      expect(c.max).toBe(3.0);
      expect(c.step).toBe(0.1);
      expect(c.default).toBe(1.0);
    });

    it('defines speed multiplier: min 0.2, max 3.0, step 0.1, default 1.0', () => {
      const c = SETTINGS_CONFIG.speedMultiplier;
      expect(c.min).toBe(0.2);
      expect(c.max).toBe(3.0);
      expect(c.step).toBe(0.1);
      expect(c.default).toBe(1.0);
    });

    it('defines star layers: min 3, max 6, step 1, default 3', () => {
      const c = SETTINGS_CONFIG.starLayers;
      expect(c.min).toBe(3);
      expect(c.max).toBe(6);
      expect(c.step).toBe(1);
      expect(c.default).toBe(3);
    });

    it('each config has a label string', () => {
      expect(typeof SETTINGS_CONFIG.asteroidDensity.label).toBe('string');
      expect(typeof SETTINGS_CONFIG.speedMultiplier.label).toBe('string');
      expect(typeof SETTINGS_CONFIG.starLayers.label).toBe('string');
    });
  });

  describe('createSettings', () => {
    it('returns settings with default values', () => {
      const s = createSettings();
      expect(s.asteroidDensity).toBe(1.0);
      expect(s.speedMultiplier).toBe(1.0);
      expect(s.starLayers).toBe(3);
    });

    it('panel starts closed', () => {
      const s = createSettings();
      expect(s.panelOpen).toBe(false);
    });

    it('gear starts visible', () => {
      const s = createSettings();
      expect(s.gearVisible).toBe(true);
    });

    it('gear starts not hovered', () => {
      const s = createSettings();
      expect(s.gearHovered).toBe(false);
    });

    it('auto-hide timers start at 0', () => {
      const s = createSettings();
      expect(s.gearTimer).toBe(0);
      expect(s.panelTimer).toBe(0);
    });
  });

  describe('clampSetting', () => {
    it('clamps asteroid density below minimum to 0.5', () => {
      expect(clampSetting('asteroidDensity', 0.1)).toBe(0.5);
    });

    it('clamps asteroid density above maximum to 3.0', () => {
      expect(clampSetting('asteroidDensity', 5.0)).toBe(3.0);
    });

    it('passes through valid asteroid density', () => {
      expect(clampSetting('asteroidDensity', 1.5)).toBe(1.5);
    });

    it('clamps speed multiplier below minimum to 0.2', () => {
      expect(clampSetting('speedMultiplier', 0)).toBe(0.2);
    });

    it('clamps speed multiplier above maximum to 3.0', () => {
      expect(clampSetting('speedMultiplier', 5.0)).toBe(3.0);
    });

    it('passes through valid speed multiplier', () => {
      expect(clampSetting('speedMultiplier', 1.5)).toBe(1.5);
    });

    it('clamps star layers below minimum to 3', () => {
      expect(clampSetting('starLayers', 1)).toBe(3);
    });

    it('clamps star layers above maximum to 6', () => {
      expect(clampSetting('starLayers', 10)).toBe(6);
    });

    it('rounds integer settings to nearest step', () => {
      expect(clampSetting('starLayers', 4.3)).toBe(4);
    });
  });

  describe('updateAutoHide', () => {
    it('gear hides after 3 seconds of no mouse movement', () => {
      const s = createSettings();
      updateAutoHide(s, 3.1);
      expect(s.gearVisible).toBe(false);
    });

    it('gear stays visible before 3 seconds', () => {
      const s = createSettings();
      updateAutoHide(s, 2.0);
      expect(s.gearVisible).toBe(true);
    });

    it('panel closes after 4 seconds of no mouse activity over it', () => {
      const s = createSettings();
      s.panelOpen = true;
      updateAutoHide(s, 4.1);
      expect(s.panelOpen).toBe(false);
    });

    it('panel stays open before 4 seconds', () => {
      const s = createSettings();
      s.panelOpen = true;
      updateAutoHide(s, 3.0);
      expect(s.panelOpen).toBe(true);
    });

    it('resets gear timer when mouse moves (timer set to 0)', () => {
      const s = createSettings();
      s.gearTimer = 2.5;
      s.gearTimer = 0; // mouse moved — caller resets
      updateAutoHide(s, 0.5);
      expect(s.gearVisible).toBe(true);
    });

    it('gear becomes visible again when timer is reset', () => {
      const s = createSettings();
      s.gearVisible = false;
      s.gearTimer = 0; // mouse moved
      updateAutoHide(s, 0.016);
      expect(s.gearVisible).toBe(true);
    });

    it('panel timer does not advance when panel is closed', () => {
      const s = createSettings();
      s.panelOpen = false;
      updateAutoHide(s, 5.0);
      expect(s.panelTimer).toBe(0);
    });
  });

  describe('createSettingsUI — DOM', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates a gear button element', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.gearButton).toBeDefined();
      expect(container.contains(ui.gearButton)).toBe(true);
    });

    it('creates a panel element', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.panel).toBeDefined();
      expect(container.contains(ui.panel)).toBe(true);
    });

    it('panel starts hidden', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.panel.style.display).toBe('none');
    });

    it('creates 4 slider inputs with correct attributes', () => {
      const ui = createSettingsUI(container, settings);
      const sliders = ui.panel.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBe(4);
    });

    it('asteroid density slider has correct min/max/step/value', () => {
      const ui = createSettingsUI(container, settings);
      const slider = ui.sliders.asteroidDensity;
      expect(slider.min).toBe('0.5');
      expect(slider.max).toBe('3');
      expect(slider.step).toBe('0.1');
      expect(slider.value).toBe('1');
    });

    it('speed multiplier slider has correct min/max/step/value', () => {
      const ui = createSettingsUI(container, settings);
      const slider = ui.sliders.speedMultiplier;
      expect(slider.min).toBe('0.2');
      expect(slider.max).toBe('3');
      expect(slider.step).toBe('0.1');
      expect(slider.value).toBe('1');
    });

    it('star layers slider has correct min/max/step/value', () => {
      const ui = createSettingsUI(container, settings);
      const slider = ui.sliders.starLayers;
      expect(slider.min).toBe('3');
      expect(slider.max).toBe('6');
      expect(slider.step).toBe('1');
      expect(slider.value).toBe('3');
    });

    it('each slider has a visible label', () => {
      const ui = createSettingsUI(container, settings);
      const labels = ui.panel.querySelectorAll('label');
      expect(labels.length).toBeGreaterThanOrEqual(3);
    });

    it('each slider shows its current value', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.valueDisplays.asteroidDensity.textContent).toContain('1.0');
      expect(ui.valueDisplays.speedMultiplier.textContent).toContain('1');
      expect(ui.valueDisplays.starLayers.textContent).toContain('3');
    });

    it('clicking gear button opens panel and sets panelOpen', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click();
      expect(ui.panel.style.display).not.toBe('none');
      expect(settings.panelOpen).toBe(true);
    });

    it('clicking gear button again closes panel', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open
      ui.gearButton.click(); // close
      expect(ui.panel.style.display).toBe('none');
      expect(settings.panelOpen).toBe(false);
    });

    it('icon changes to close (✕) when panel opens', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.gearButton.textContent).toBe('\u2630');
      ui.gearButton.click();
      expect(ui.gearButton.textContent).toBe('\u2715');
    });

    it('icon reverts to hamburger (☰) when panel closes', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open
      ui.gearButton.click(); // close
      expect(ui.gearButton.textContent).toBe('\u2630');
    });

    it('Escape reverts icon to hamburger', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(ui.gearButton.textContent).toBe('\u2630');
    });

    it('pressing Escape closes the panel and clears panelOpen', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open
      expect(settings.panelOpen).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(ui.panel.style.display).toBe('none');
      expect(settings.panelOpen).toBe(false);
    });

    it('panel stays open across simulated frame-loop sync', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open

      // Simulate what main.js does each frame
      ui.panel.style.display = settings.panelOpen ? 'block' : 'none';

      expect(ui.panel.style.display).toBe('block');
      expect(settings.panelOpen).toBe(true);
    });

    it('gear button has low opacity styling', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.gearButton.style.opacity).toBe('0.3');
    });

    it('returns an onChange callback hook', () => {
      const ui = createSettingsUI(container, settings);
      expect(typeof ui.onChange).toBe('function');
    });

    it('gear button brightens to 80% opacity on hover', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      expect(ui.gearButton.style.opacity).toBe('0.8');
    });

    it('gear button returns to 30% opacity on mouse leave', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      ui.gearButton.dispatchEvent(new Event('mouseleave'));
      expect(ui.gearButton.style.opacity).toBe('0.3');
    });

    it('mouseenter sets gearHovered true on settings', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      expect(settings.gearHovered).toBe(true);
    });

    it('mouseleave sets gearHovered false on settings', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      ui.gearButton.dispatchEvent(new Event('mouseleave'));
      expect(settings.gearHovered).toBe(false);
    });

    it('onChange fires with correct name and value when slider moves', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.sliders.asteroidDensity.value = '1.5';
      ui.sliders.asteroidDensity.dispatchEvent(new Event('input'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('asteroidDensity');
      expect(changes[0].value).toBe(1.5);
    });

    it('value display updates when slider moves', () => {
      const ui = createSettingsUI(container, settings);
      ui.onChange = () => {}; // no-op

      ui.sliders.speedMultiplier.value = '2.5';
      ui.sliders.speedMultiplier.dispatchEvent(new Event('input'));

      expect(ui.valueDisplays.speedMultiplier.textContent).toContain('2.5');
    });
  });

  describe('frame loop + settings integration', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    /**
     * Simulate what main.js frame() does each tick:
     * updateAutoHide, then sync DOM from settings state.
     */
    function simulateFrame(ui, dt) {
      updateAutoHide(settings, dt);
      if (settings.panelOpen) {
        ui.gearButton.style.opacity = '0.8';
        ui.gearButton.style.pointerEvents = 'auto';
      } else {
        ui.gearButton.style.opacity = settings.gearVisible
          ? settings.gearHovered
            ? '0.8'
            : '0.3'
          : '0';
        ui.gearButton.style.pointerEvents = settings.gearVisible
          ? 'auto'
          : 'none';
      }
      ui.panel.style.display = settings.panelOpen ? 'block' : 'none';
      ui.gearButton.textContent = settings.panelOpen ? '\u2715' : '\u2630';
    }

    it('hover opacity survives a frame-loop tick', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));

      // Simulate a frame tick — hover should NOT be overridden
      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.8');
    });

    it('hover opacity resets after mouseleave + frame tick', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      ui.gearButton.dispatchEvent(new Event('mouseleave'));

      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.3');
    });

    it('gear becomes invisible after 3s of no mouse movement', () => {
      const ui = createSettingsUI(container, settings);

      // Simulate 3.1 seconds of frames
      for (let i = 0; i < 186; i++) {
        simulateFrame(ui, 1 / 60);
      }
      expect(ui.gearButton.style.opacity).toBe('0');
      expect(ui.gearButton.style.pointerEvents).toBe('none');
    });

    it('gear reappears after mouse movement resets timer', () => {
      const ui = createSettingsUI(container, settings);

      // Hide the gear
      for (let i = 0; i < 186; i++) {
        simulateFrame(ui, 1 / 60);
      }
      expect(ui.gearButton.style.opacity).toBe('0');

      // Mouse moves — caller resets gearTimer
      settings.gearTimer = 0;
      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.3');
      expect(ui.gearButton.style.pointerEvents).toBe('auto');
    });

    it('panel stays open across multiple frame ticks', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open panel

      // Simulate 2 seconds of frames with mouse activity (panelTimer reset)
      for (let i = 0; i < 120; i++) {
        settings.panelTimer = 0; // mouse over panel
        simulateFrame(ui, 1 / 60);
      }
      expect(ui.panel.style.display).toBe('block');
      expect(settings.panelOpen).toBe(true);
    });

    it('panel auto-closes after 4s of no mouse activity', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open panel

      // Simulate 4.1 seconds with no mouse activity
      for (let i = 0; i < 246; i++) {
        simulateFrame(ui, 1 / 60);
      }
      expect(ui.panel.style.display).toBe('none');
      expect(settings.panelOpen).toBe(false);
    });

    it('button stays at 0.8 opacity when panel is open (close button)', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open panel

      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.8');
      expect(ui.gearButton.style.pointerEvents).toBe('auto');
    });

    it('icon reverts to hamburger when panel auto-closes', () => {
      const ui = createSettingsUI(container, settings);
      ui.gearButton.click(); // open panel

      // Simulate 4.1 seconds with no mouse activity
      for (let i = 0; i < 246; i++) {
        simulateFrame(ui, 1 / 60);
      }
      expect(settings.panelOpen).toBe(false);
      expect(ui.gearButton.textContent).toBe('\u2630');
    });

    it('gear hover works even when gear was previously hidden and reappeared', () => {
      const ui = createSettingsUI(container, settings);

      // Hide gear
      for (let i = 0; i < 186; i++) {
        simulateFrame(ui, 1 / 60);
      }
      expect(ui.gearButton.style.opacity).toBe('0');

      // Mouse moves, gear reappears
      settings.gearTimer = 0;
      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.3');

      // Hover over gear
      ui.gearButton.dispatchEvent(new Event('mouseenter'));
      simulateFrame(ui, 0.016);
      expect(ui.gearButton.style.opacity).toBe('0.8');
    });
  });
});

describe('Increment 14: Settings Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveSettings', () => {
    it('writes settings to localStorage as JSON', () => {
      const s = createSettings();
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.asteroidDensity).toBe(1.0);
      expect(stored.speedMultiplier).toBe(1.0);
      expect(stored.starLayers).toBe(3);
    });

    it('only persists the 3 tunable values, not UI state', () => {
      const s = createSettings();
      s.panelOpen = true;
      s.gearTimer = 2.5;
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.panelOpen).toBeUndefined();
      expect(stored.gearTimer).toBeUndefined();
      expect(stored.gearVisible).toBeUndefined();
    });

    it('persists updated values after changes', () => {
      const s = createSettings();
      s.asteroidDensity = 2.0;
      s.speedMultiplier = 2.0;
      s.starLayers = 5;
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.asteroidDensity).toBe(2.0);
      expect(stored.speedMultiplier).toBe(2.0);
      expect(stored.starLayers).toBe(5);
    });
  });

  describe('loadSettings', () => {
    it('returns saved values when localStorage has valid data', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 2.0,
          speedMultiplier: 2.5,
          starLayers: 5,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(2.0);
      expect(loaded.speedMultiplier).toBe(2.5);
      expect(loaded.starLayers).toBe(5);
    });

    it('returns defaults when localStorage is empty', () => {
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.0);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('returns defaults when localStorage contains invalid JSON', () => {
      localStorage.setItem('asteroidSettings', 'not valid json{{{');
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.0);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('clamps out-of-range values to valid ranges', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 999,
          speedMultiplier: -5,
          starLayers: 0,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(3.0);
      expect(loaded.speedMultiplier).toBe(0.2);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults for missing keys in stored object', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.5,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.5);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults when stored value is not an object', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify(42));
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.0);
    });

    it('uses defaults when stored value is an array', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify([1, 2, 3]));
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.0);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults when stored values are non-numeric', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 'banana',
          speedMultiplier: null,
          starLayers: true,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(1.0);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });
  });

  describe('save + load round-trip', () => {
    it('loadSettings returns what saveSettings wrote', () => {
      const s = createSettings({
        asteroidDensity: 2.1,
        speedMultiplier: 1.7,
        starLayers: 5,
      });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.asteroidDensity).toBe(2.1);
      expect(loaded.speedMultiplier).toBe(1.7);
      expect(loaded.starLayers).toBe(5);
    });
  });

  describe('createSettings with overrides', () => {
    it('applies loaded overrides to settings', () => {
      const s = createSettings({
        asteroidDensity: 1.5,
        speedMultiplier: 2.0,
        starLayers: 5,
      });
      expect(s.asteroidDensity).toBe(1.5);
      expect(s.speedMultiplier).toBe(2.0);
      expect(s.starLayers).toBe(5);
    });

    it('partial overrides leave other settings at defaults', () => {
      const s = createSettings({ asteroidDensity: 0.8 });
      expect(s.asteroidDensity).toBe(0.8);
      expect(s.speedMultiplier).toBe(1.0);
      expect(s.starLayers).toBe(3);
    });

    it('UI state is always default regardless of overrides', () => {
      const s = createSettings({ asteroidDensity: 1.5 });
      expect(s.panelOpen).toBe(false);
      expect(s.gearVisible).toBe(true);
      expect(s.gearHovered).toBe(false);
      expect(s.gearTimer).toBe(0);
    });
  });

  describe('createSettingsUI — slider initialization from settings', () => {
    it('sliders reflect non-default settings values on creation', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const s = createSettings({
        asteroidDensity: 2.0,
        speedMultiplier: 2.0,
        starLayers: 5,
      });
      const ui = createSettingsUI(container, s);
      expect(ui.sliders.asteroidDensity.value).toBe('2');
      expect(ui.sliders.speedMultiplier.value).toBe('2');
      expect(ui.sliders.starLayers.value).toBe('5');
    });

    it('value displays reflect non-default settings on creation', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const s = createSettings({
        asteroidDensity: 2.0,
        speedMultiplier: 2.0,
        starLayers: 5,
      });
      const ui = createSettingsUI(container, s);
      expect(ui.valueDisplays.asteroidDensity.textContent).toContain('2.0');
      expect(ui.valueDisplays.speedMultiplier.textContent).toContain('2.0');
      expect(ui.valueDisplays.starLayers.textContent).toContain('5');
    });
  });
});

describe('Increment 19: Thrust Power Setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('SETTINGS_CONFIG — thrustPower', () => {
    it('defines thrustPower with min 1000, max 5000, step 50, default 2000', () => {
      const c = SETTINGS_CONFIG.thrustPower;
      expect(c).toBeDefined();
      expect(c.min).toBe(1000);
      expect(c.max).toBe(5000);
      expect(c.step).toBe(50);
      expect(c.default).toBe(2000);
    });

    it('has a label string', () => {
      expect(typeof SETTINGS_CONFIG.thrustPower.label).toBe('string');
    });
  });

  describe('createSettings — thrustPower', () => {
    it('defaults thrustPower to 2000', () => {
      const s = createSettings();
      expect(s.thrustPower).toBe(2000);
    });

    it('accepts thrustPower override', () => {
      const s = createSettings({ thrustPower: 500 });
      expect(s.thrustPower).toBe(500);
    });
  });

  describe('persistence — thrustPower', () => {
    it('saveSettings persists thrustPower', () => {
      const s = createSettings({ thrustPower: 1200 });
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.thrustPower).toBe(1200);
    });

    it('loadSettings restores thrustPower', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          thrustPower: 1500,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.thrustPower).toBe(1500);
    });

    it('loadSettings defaults thrustPower when missing from storage', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.thrustPower).toBe(2000);
    });

    it('loadSettings clamps out-of-range thrustPower', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          thrustPower: 9999,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.thrustPower).toBe(5000);
    });

    it('round-trip: save then load preserves thrustPower', () => {
      const s = createSettings({ thrustPower: 2500 });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.thrustPower).toBe(2500);
    });
  });

  describe('createSettingsUI — thrustPower slider', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates a thrustPower slider', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.sliders.thrustPower).toBeDefined();
    });

    it('thrustPower slider has correct min/max/step/value', () => {
      const ui = createSettingsUI(container, settings);
      const slider = ui.sliders.thrustPower;
      expect(slider.min).toBe('1000');
      expect(slider.max).toBe('5000');
      expect(slider.step).toBe('50');
      expect(slider.value).toBe('2000');
    });

    it('thrustPower slider reflects non-default settings on creation', () => {
      const s = createSettings({ thrustPower: 3000 });
      const ui = createSettingsUI(container, s);
      expect(ui.sliders.thrustPower.value).toBe('3000');
    });

    it('onChange fires with correct name and value when thrustPower slider moves', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.sliders.thrustPower.value = '1200';
      ui.sliders.thrustPower.dispatchEvent(new Event('input'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('thrustPower');
      expect(changes[0].value).toBe(1200);
    });
  });
});

describe('Increment 15: Star Field Direction Setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('SETTINGS_CONFIG — starDirection', () => {
    it('defines starDirection with options array containing all 5 directions', () => {
      const c = SETTINGS_CONFIG.starDirection;
      expect(c).toBeDefined();
      expect(c.options).toEqual(['left', 'right', 'up', 'down', 'radial']);
    });

    it('starDirection default is "left"', () => {
      expect(SETTINGS_CONFIG.starDirection.default).toBe('left');
    });

    it('starDirection has a label', () => {
      expect(typeof SETTINGS_CONFIG.starDirection.label).toBe('string');
    });
  });

  describe('createSettings — starDirection', () => {
    it('defaults starDirection to "left"', () => {
      const s = createSettings();
      expect(s.starDirection).toBe('left');
    });

    it('accepts starDirection override', () => {
      const s = createSettings({ starDirection: 'radial' });
      expect(s.starDirection).toBe('radial');
    });
  });

  describe('persistence — starDirection', () => {
    it('saveSettings persists starDirection', () => {
      const s = createSettings({ starDirection: 'up' });
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.starDirection).toBe('up');
    });

    it('loadSettings restores starDirection', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'radial',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('radial');
    });

    it('loadSettings defaults starDirection when missing from storage', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('left');
    });

    it('loadSettings defaults starDirection when stored value is invalid', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'diagonal',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('left');
    });

    it('round-trip: save then load preserves starDirection', () => {
      const s = createSettings({ starDirection: 'down' });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('down');
    });
  });

  describe('createSettingsUI — direction selector', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates a direction selector element', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.directionSelect).toBeDefined();
    });

    it('direction selector has all 5 options', () => {
      const ui = createSettingsUI(container, settings);
      const options = ui.directionSelect.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toEqual(['left', 'right', 'up', 'down', 'radial']);
    });

    it('direction selector defaults to "left"', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.directionSelect.value).toBe('left');
    });

    it('direction selector reflects non-default settings on creation', () => {
      const s = createSettings({ starDirection: 'radial' });
      const ui = createSettingsUI(container, s);
      expect(ui.directionSelect.value).toBe('radial');
    });

    it('changing direction fires onChange with name and value', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.directionSelect.value = 'radial';
      ui.directionSelect.dispatchEvent(new Event('change'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('starDirection');
      expect(changes[0].value).toBe('radial');
    });
  });

  describe('SETTINGS_CONFIG — aiStrategy removed', () => {
    it('aiStrategy is no longer in SETTINGS_CONFIG', () => {
      expect(SETTINGS_CONFIG.aiStrategy).toBeUndefined();
    });

    it('saveSettings does not persist aiStrategy', () => {
      const s = createSettings();
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.aiStrategy).toBeUndefined();
    });
  });

  describe('SETTINGS_CONFIG — playerIntelligence', () => {
    it('defines playerIntelligence with options human, reactive, predictive, predictive-optimized', () => {
      const c = SETTINGS_CONFIG.playerIntelligence;
      expect(c).toBeDefined();
      expect(c.options).toEqual([
        'human',
        'reactive',
        'predictive',
        'predictive-optimized',
      ]);
    });

    it('playerIntelligence default is "human"', () => {
      expect(SETTINGS_CONFIG.playerIntelligence.default).toBe('human');
    });

    it('playerIntelligence has a label', () => {
      expect(typeof SETTINGS_CONFIG.playerIntelligence.label).toBe('string');
    });
  });

  describe('SETTINGS_CONFIG — enemyIntelligence', () => {
    it('defines enemyIntelligence with options reactive, predictive, and predictive-optimized', () => {
      const c = SETTINGS_CONFIG.enemyIntelligence;
      expect(c).toBeDefined();
      expect(c.options).toEqual([
        'reactive',
        'predictive',
        'predictive-optimized',
      ]);
    });

    it('enemyIntelligence default is "predictive"', () => {
      expect(SETTINGS_CONFIG.enemyIntelligence.default).toBe('predictive');
    });

    it('enemyIntelligence has a label', () => {
      expect(typeof SETTINGS_CONFIG.enemyIntelligence.label).toBe('string');
    });
  });

  describe('createSettings — playerIntelligence + enemyIntelligence', () => {
    it('defaults playerIntelligence to "human"', () => {
      const s = createSettings();
      expect(s.playerIntelligence).toBe('human');
    });

    it('defaults enemyIntelligence to "predictive"', () => {
      const s = createSettings();
      expect(s.enemyIntelligence).toBe('predictive');
    });

    it('accepts playerIntelligence override', () => {
      const s = createSettings({ playerIntelligence: 'reactive' });
      expect(s.playerIntelligence).toBe('reactive');
    });

    it('accepts enemyIntelligence override', () => {
      const s = createSettings({ enemyIntelligence: 'reactive' });
      expect(s.enemyIntelligence).toBe('reactive');
    });
  });

  describe('persistence — playerIntelligence', () => {
    it('saveSettings persists playerIntelligence', () => {
      const s = createSettings({ playerIntelligence: 'predictive' });
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.playerIntelligence).toBe('predictive');
    });

    it('loadSettings restores playerIntelligence', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          playerIntelligence: 'reactive',
          enemyIntelligence: 'predictive',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.playerIntelligence).toBe('reactive');
    });

    it('loadSettings defaults playerIntelligence when missing from storage', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.playerIntelligence).toBe('human');
    });

    it('loadSettings defaults playerIntelligence when stored value is invalid', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          playerIntelligence: 'nonexistent',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.playerIntelligence).toBe('human');
    });

    it('round-trip: save then load preserves playerIntelligence', () => {
      const s = createSettings({ playerIntelligence: 'predictive' });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.playerIntelligence).toBe('predictive');
    });
  });

  describe('persistence — enemyIntelligence', () => {
    it('saveSettings persists enemyIntelligence', () => {
      const s = createSettings({ enemyIntelligence: 'reactive' });
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.enemyIntelligence).toBe('reactive');
    });

    it('loadSettings restores enemyIntelligence', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          playerIntelligence: 'human',
          enemyIntelligence: 'reactive',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('reactive');
    });

    it('loadSettings defaults enemyIntelligence when missing from storage', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('predictive');
    });

    it('loadSettings defaults enemyIntelligence when stored value is invalid', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          enemyIntelligence: 'nonexistent',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('predictive');
    });

    it('round-trip: save then load preserves enemyIntelligence', () => {
      const s = createSettings({ enemyIntelligence: 'reactive' });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('reactive');
    });
  });

  describe('persistence — backward compat migration from aiStrategy', () => {
    it('migrates old aiStrategy to enemyIntelligence when enemyIntelligence is absent', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          aiStrategy: 'reactive',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('reactive');
    });

    it('does not migrate aiStrategy when enemyIntelligence is already present', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          aiStrategy: 'reactive',
          enemyIntelligence: 'predictive',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('predictive');
    });

    it('ignores invalid aiStrategy during migration', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          starDirection: 'left',
          aiStrategy: 'nonexistent',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.enemyIntelligence).toBe('predictive');
    });
  });

  describe('createSettingsUI — playerIntelligence selector', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates a playerIntelligence selector in selects map', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.selects.playerIntelligence).toBeDefined();
    });

    it('playerIntelligence selector has 4 options', () => {
      const ui = createSettingsUI(container, settings);
      const options = ui.selects.playerIntelligence.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toEqual([
        'human',
        'reactive',
        'predictive',
        'predictive-optimized',
      ]);
    });

    it('playerIntelligence selector defaults to "human"', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.selects.playerIntelligence.value).toBe('human');
    });

    it('playerIntelligence selector reflects non-default settings on creation', () => {
      const s = createSettings({ playerIntelligence: 'reactive' });
      const ui = createSettingsUI(container, s);
      expect(ui.selects.playerIntelligence.value).toBe('reactive');
    });

    it('changing playerIntelligence fires onChange with name and value', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.selects.playerIntelligence.value = 'predictive';
      ui.selects.playerIntelligence.dispatchEvent(new Event('change'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('playerIntelligence');
      expect(changes[0].value).toBe('predictive');
    });
  });

  describe('createSettingsUI — enemyIntelligence selector', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates an enemyIntelligence selector in selects map', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.selects.enemyIntelligence).toBeDefined();
    });

    it('enemyIntelligence selector has 3 options', () => {
      const ui = createSettingsUI(container, settings);
      const options = ui.selects.enemyIntelligence.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toEqual([
        'reactive',
        'predictive',
        'predictive-optimized',
      ]);
    });

    it('enemyIntelligence selector defaults to "predictive"', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.selects.enemyIntelligence.value).toBe('predictive');
    });

    it('enemyIntelligence selector reflects non-default settings on creation', () => {
      const s = createSettings({ enemyIntelligence: 'reactive' });
      const ui = createSettingsUI(container, s);
      expect(ui.selects.enemyIntelligence.value).toBe('reactive');
    });

    it('changing enemyIntelligence fires onChange with name and value', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.selects.enemyIntelligence.value = 'reactive';
      ui.selects.enemyIntelligence.dispatchEvent(new Event('change'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('enemyIntelligence');
      expect(changes[0].value).toBe('reactive');
    });
  });

  describe('SETTINGS_CONFIG — aiDebugLog', () => {
    it('defines aiDebugLog as a boolean setting with default false', () => {
      const c = SETTINGS_CONFIG.aiDebugLog;
      expect(c).toBeDefined();
      expect(c.default).toBe(false);
      expect(c.type).toBe('boolean');
    });

    it('aiDebugLog has a label', () => {
      expect(typeof SETTINGS_CONFIG.aiDebugLog.label).toBe('string');
    });
  });

  describe('createSettings — aiDebugLog', () => {
    it('defaults aiDebugLog to false', () => {
      const s = createSettings();
      expect(s.aiDebugLog).toBe(false);
    });

    it('accepts aiDebugLog override', () => {
      const s = createSettings({ aiDebugLog: true });
      expect(s.aiDebugLog).toBe(true);
    });
  });

  describe('persistence — aiDebugLog', () => {
    it('saveSettings persists aiDebugLog', () => {
      const s = createSettings({ aiDebugLog: true });
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.aiDebugLog).toBe(true);
    });

    it('loadSettings restores aiDebugLog', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          thrustPower: 2000,
          starDirection: 'left',
          playerIntelligence: 'human',
          enemyIntelligence: 'predictive',
          aiDebugLog: true,
        }),
      );
      const loaded = loadSettings();
      expect(loaded.aiDebugLog).toBe(true);
    });

    it('loadSettings defaults aiDebugLog when missing from storage', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          thrustPower: 2000,
          starDirection: 'left',
          playerIntelligence: 'human',
          enemyIntelligence: 'predictive',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.aiDebugLog).toBe(false);
    });

    it('loadSettings defaults aiDebugLog when stored value is not boolean', () => {
      localStorage.setItem(
        'asteroidSettings',
        JSON.stringify({
          asteroidDensity: 1.0,
          speedMultiplier: 1.0,
          starLayers: 3,
          thrustPower: 2000,
          starDirection: 'left',
          playerIntelligence: 'human',
          enemyIntelligence: 'predictive',
          aiDebugLog: 'yes',
        }),
      );
      const loaded = loadSettings();
      expect(loaded.aiDebugLog).toBe(false);
    });

    it('round-trip: save then load preserves aiDebugLog', () => {
      const s = createSettings({ aiDebugLog: true });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.aiDebugLog).toBe(true);
    });
  });

  describe('createSettingsUI — aiDebugLog checkbox', () => {
    let container;
    let settings;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      settings = createSettings();
    });

    it('creates a checkbox for aiDebugLog in checkboxes map', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.checkboxes.aiDebugLog).toBeDefined();
    });

    it('checkbox defaults to unchecked', () => {
      const ui = createSettingsUI(container, settings);
      expect(ui.checkboxes.aiDebugLog.checked).toBe(false);
    });

    it('checkbox reflects non-default settings on creation', () => {
      const s = createSettings({ aiDebugLog: true });
      const ui = createSettingsUI(container, s);
      expect(ui.checkboxes.aiDebugLog.checked).toBe(true);
    });

    it('changing checkbox fires onChange with name and boolean value', () => {
      const ui = createSettingsUI(container, settings);
      const changes = [];
      ui.onChange = (name, value) => changes.push({ name, value });

      ui.checkboxes.aiDebugLog.checked = true;
      ui.checkboxes.aiDebugLog.dispatchEvent(new Event('change'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('aiDebugLog');
      expect(changes[0].value).toBe(true);
    });
  });
});
