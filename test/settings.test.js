// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SETTINGS_CONFIG,
  createSettings,
  clampSetting,
  updateAutoHide,
  createSettingsUI,
  saveSettings,
  loadSettings,
} from '../src/settings.js';

describe('Increment 13: Settings Menu', () => {

  describe('SETTINGS_CONFIG', () => {
    it('defines asteroid count: min 5, max 50, step 1, default 20', () => {
      const c = SETTINGS_CONFIG.asteroidCount;
      expect(c.min).toBe(5);
      expect(c.max).toBe(50);
      expect(c.step).toBe(1);
      expect(c.default).toBe(20);
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
      expect(typeof SETTINGS_CONFIG.asteroidCount.label).toBe('string');
      expect(typeof SETTINGS_CONFIG.speedMultiplier.label).toBe('string');
      expect(typeof SETTINGS_CONFIG.starLayers.label).toBe('string');
    });
  });

  describe('createSettings', () => {
    it('returns settings with default values', () => {
      const s = createSettings();
      expect(s.asteroidCount).toBe(20);
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
    it('clamps asteroid count below minimum to 5', () => {
      expect(clampSetting('asteroidCount', 2)).toBe(5);
    });

    it('clamps asteroid count above maximum to 50', () => {
      expect(clampSetting('asteroidCount', 100)).toBe(50);
    });

    it('passes through valid asteroid count', () => {
      expect(clampSetting('asteroidCount', 30)).toBe(30);
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
      expect(clampSetting('asteroidCount', 20.7)).toBe(21);
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

    it('creates 3 slider inputs with correct attributes', () => {
      const ui = createSettingsUI(container, settings);
      const sliders = ui.panel.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBe(3);
    });

    it('asteroid count slider has correct min/max/step/value', () => {
      const ui = createSettingsUI(container, settings);
      const slider = ui.sliders.asteroidCount;
      expect(slider.min).toBe('5');
      expect(slider.max).toBe('50');
      expect(slider.step).toBe('1');
      expect(slider.value).toBe('20');
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
      // Value displays should contain the default values
      expect(ui.valueDisplays.asteroidCount.textContent).toContain('20');
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

      ui.sliders.asteroidCount.value = '35';
      ui.sliders.asteroidCount.dispatchEvent(new Event('input'));

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('asteroidCount');
      expect(changes[0].value).toBe(35);
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
          ? (settings.gearHovered ? '0.8' : '0.3')
          : '0';
        ui.gearButton.style.pointerEvents = settings.gearVisible ? 'auto' : 'none';
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
      expect(stored.asteroidCount).toBe(20);
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
      s.asteroidCount = 35;
      s.speedMultiplier = 2.0;
      s.starLayers = 5;
      saveSettings(s);
      const stored = JSON.parse(localStorage.getItem('asteroidSettings'));
      expect(stored.asteroidCount).toBe(35);
      expect(stored.speedMultiplier).toBe(2.0);
      expect(stored.starLayers).toBe(5);
    });
  });

  describe('loadSettings', () => {
    it('returns saved values when localStorage has valid data', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 40,
        speedMultiplier: 2.5,
        starLayers: 5,
      }));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(40);
      expect(loaded.speedMultiplier).toBe(2.5);
      expect(loaded.starLayers).toBe(5);
    });

    it('returns defaults when localStorage is empty', () => {
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(20);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('returns defaults when localStorage contains invalid JSON', () => {
      localStorage.setItem('asteroidSettings', 'not valid json{{{');
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(20);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('clamps out-of-range values to valid ranges', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 999,
        speedMultiplier: -5,
        starLayers: 0,
      }));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(50);
      expect(loaded.speedMultiplier).toBe(0.2);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults for missing keys in stored object', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 30,
      }));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(30);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults when stored value is not an object', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify(42));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(20);
    });

    it('uses defaults when stored value is an array', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify([1, 2, 3]));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(20);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });

    it('uses defaults when stored values are non-numeric', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 'banana',
        speedMultiplier: null,
        starLayers: true,
      }));
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(20);
      expect(loaded.speedMultiplier).toBe(1.0);
      expect(loaded.starLayers).toBe(3);
    });
  });

  describe('save + load round-trip', () => {
    it('loadSettings returns what saveSettings wrote', () => {
      const s = createSettings({ asteroidCount: 42, speedMultiplier: 1.7, starLayers: 5 });
      saveSettings(s);
      const loaded = loadSettings();
      expect(loaded.asteroidCount).toBe(42);
      expect(loaded.speedMultiplier).toBe(1.7);
      expect(loaded.starLayers).toBe(5);
    });
  });

  describe('createSettings with overrides', () => {
    it('applies loaded overrides to settings', () => {
      const s = createSettings({ asteroidCount: 35, speedMultiplier: 2.0, starLayers: 5 });
      expect(s.asteroidCount).toBe(35);
      expect(s.speedMultiplier).toBe(2.0);
      expect(s.starLayers).toBe(5);
    });

    it('partial overrides leave other settings at defaults', () => {
      const s = createSettings({ asteroidCount: 10 });
      expect(s.asteroidCount).toBe(10);
      expect(s.speedMultiplier).toBe(1.0);
      expect(s.starLayers).toBe(3);
    });

    it('UI state is always default regardless of overrides', () => {
      const s = createSettings({ asteroidCount: 30 });
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
      const s = createSettings({ asteroidCount: 35, speedMultiplier: 2.0, starLayers: 5 });
      const ui = createSettingsUI(container, s);
      expect(ui.sliders.asteroidCount.value).toBe('35');
      expect(ui.sliders.speedMultiplier.value).toBe('2');
      expect(ui.sliders.starLayers.value).toBe('5');
    });

    it('value displays reflect non-default settings on creation', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const s = createSettings({ asteroidCount: 35, speedMultiplier: 2.0, starLayers: 5 });
      const ui = createSettingsUI(container, s);
      expect(ui.valueDisplays.asteroidCount.textContent).toContain('35');
      expect(ui.valueDisplays.speedMultiplier.textContent).toContain('2.0');
      expect(ui.valueDisplays.starLayers.textContent).toContain('5');
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
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 20, speedMultiplier: 1.0, starLayers: 3, starDirection: 'radial',
      }));
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('radial');
    });

    it('loadSettings defaults starDirection when missing from storage', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 20, speedMultiplier: 1.0, starLayers: 3,
      }));
      const loaded = loadSettings();
      expect(loaded.starDirection).toBe('left');
    });

    it('loadSettings defaults starDirection when stored value is invalid', () => {
      localStorage.setItem('asteroidSettings', JSON.stringify({
        asteroidCount: 20, speedMultiplier: 1.0, starLayers: 3, starDirection: 'diagonal',
      }));
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
      const values = Array.from(options).map(o => o.value);
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
});
