import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebugLogger, fmtAction } from '../src/debug.js';

describe('Increment 26c: AI Debug Logging', () => {
  describe('fmtAction', () => {
    it('formats all-off as ____', () => {
      expect(
        fmtAction({
          thrust: false,
          rotatingLeft: false,
          rotatingRight: false,
          braking: false,
        }),
      ).toBe('____');
    });

    it('formats thrust only as T___', () => {
      expect(
        fmtAction({
          thrust: true,
          rotatingLeft: false,
          rotatingRight: false,
          braking: false,
        }),
      ).toBe('T___');
    });

    it('formats thrust + right as T_R_', () => {
      expect(
        fmtAction({
          thrust: true,
          rotatingLeft: false,
          rotatingRight: true,
          braking: false,
        }),
      ).toBe('T_R_');
    });

    it('formats left + brake as _L_B', () => {
      expect(
        fmtAction({
          thrust: false,
          rotatingLeft: true,
          rotatingRight: false,
          braking: true,
        }),
      ).toBe('_L_B');
    });

    it('formats all-on as TLRB', () => {
      expect(
        fmtAction({
          thrust: true,
          rotatingLeft: true,
          rotatingRight: true,
          braking: true,
        }),
      ).toBe('TLRB');
    });
  });

  describe('createDebugLogger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
      logger = createDebugLogger();
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe('enable/disable', () => {
      it('starts disabled', () => {
        expect(logger.isEnabled()).toBe(false);
      });

      it('enable() enables logging', () => {
        logger.enable();
        expect(logger.isEnabled()).toBe(true);
      });

      it('disable() disables logging', () => {
        logger.enable();
        logger.disable();
        expect(logger.isEnabled()).toBe(false);
      });
    });

    describe('logAIFrame — no-op when disabled', () => {
      it('does not log when disabled', () => {
        logger.logAIFrame(1.0, makeEnemy(), makePlayer(), makeDebugInfo());
        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    describe('logAIFrame — rate limiting', () => {
      beforeEach(() => {
        logger.enable();
      });

      it('logs on first call', () => {
        logger.logAIFrame(0.0, makeEnemy(), makePlayer(), makeDebugInfo());
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });

      it('does not log again within 0.5s', () => {
        logger.logAIFrame(0.0, makeEnemy(), makePlayer(), makeDebugInfo());
        logger.logAIFrame(0.3, makeEnemy(), makePlayer(), makeDebugInfo());
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });

      it('logs again after 0.5s', () => {
        logger.logAIFrame(0.0, makeEnemy(), makePlayer(), makeDebugInfo());
        logger.logAIFrame(0.6, makeEnemy(), makePlayer(), makeDebugInfo());
        expect(consoleSpy).toHaveBeenCalledTimes(2);
      });

      it('logs periodic entries with [AI ...] prefix', () => {
        logger.logAIFrame(1.2, makeEnemy(), makePlayer(), makeDebugInfo());
        const msg = consoleSpy.mock.calls[0][0];
        expect(msg).toMatch(/^\[AI\s/);
      });
    });

    describe('logAIFrame — action change detection', () => {
      beforeEach(() => {
        logger.enable();
      });

      it('logs immediately when action changes, bypassing rate limit', () => {
        const enemy1 = makeEnemy({ thrust: true });
        const enemy2 = makeEnemy({ thrust: false, braking: true });
        logger.logAIFrame(0.0, enemy1, makePlayer(), makeDebugInfo());
        // Within rate limit but action changed
        logger.logAIFrame(0.1, enemy2, makePlayer(), makeDebugInfo());
        expect(consoleSpy).toHaveBeenCalledTimes(2);
      });

      it('change log includes CHANGE keyword', () => {
        const enemy1 = makeEnemy({ thrust: true });
        const enemy2 = makeEnemy({ thrust: false, braking: true });
        logger.logAIFrame(0.0, enemy1, makePlayer(), makeDebugInfo());
        logger.logAIFrame(0.1, enemy2, makePlayer(), makeDebugInfo());
        const msg = consoleSpy.mock.calls[1][0];
        expect(msg).toContain('CHANGE');
      });

      it('does not detect change when action is the same', () => {
        const enemy = makeEnemy({ thrust: true });
        logger.logAIFrame(0.0, enemy, makePlayer(), makeDebugInfo());
        logger.logAIFrame(0.1, enemy, makePlayer(), makeDebugInfo());
        // Only 1 call (first one) — second was rate-limited, same action
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('logEvent', () => {
      it('does not log when disabled', () => {
        logger.logEvent(1.0, 'FIRE', { dist: 200 });
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('logs immediately when enabled', () => {
        logger.enable();
        logger.logEvent(1.6, 'FIRE', {
          owner: 'enemy',
          dist: 180,
          angle: 0.08,
        });
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });

      it('includes type prefix in brackets', () => {
        logger.enable();
        logger.logEvent(1.6, 'FIRE', {
          owner: 'enemy',
          dist: 180,
          angle: 0.08,
        });
        const msg = consoleSpy.mock.calls[0][0];
        expect(msg).toMatch(/^\[FIRE\s/);
      });
    });

    describe('logAIFrame — log content', () => {
      beforeEach(() => {
        logger.enable();
      });

      it('includes distance to target', () => {
        const enemy = makeEnemy({ x: 100, y: 0 });
        const player = makePlayer({ x: 200, y: 0 });
        logger.logAIFrame(0.0, enemy, player, makeDebugInfo());
        const msg = consoleSpy.mock.calls[0][0];
        expect(msg).toContain('dist=100');
      });

      it('includes action string', () => {
        const enemy = makeEnemy({ thrust: true, rotatingRight: true });
        logger.logAIFrame(0.0, enemy, makePlayer(), makeDebugInfo());
        const msg = consoleSpy.mock.calls[0][0];
        expect(msg).toContain('action=T_R_');
      });

      it('includes candidate scores when debugInfo is provided', () => {
        const info = makeDebugInfo({
          candidates: [
            { name: 'T___', score: 3090 },
            { name: 'TL__', score: -3299 },
          ],
          winner: 'T___',
        });
        logger.logAIFrame(0.0, makeEnemy(), makePlayer(), info);
        const msg = consoleSpy.mock.calls[0][0];
        expect(msg).toContain('T___:3090');
        expect(msg).toContain('TL__:-3299');
      });

      it('handles null debugInfo gracefully', () => {
        logger.logAIFrame(0.0, makeEnemy(), makePlayer(), null);
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// --- Test helpers ---

function makeEnemy(overrides = {}) {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    thrust: false,
    rotatingLeft: false,
    rotatingRight: false,
    braking: false,
    alive: true,
    ...overrides,
  };
}

function makePlayer(overrides = {}) {
  return {
    x: 500,
    y: 500,
    vx: 0,
    vy: 0,
    heading: 0,
    alive: true,
    ...overrides,
  };
}

function makeDebugInfo(overrides = {}) {
  return {
    candidates: [
      { name: 'T___', score: 3000 },
      { name: 'TL__', score: 2000 },
      { name: 'T_R_', score: 2000 },
      { name: '____', score: 1000 },
      { name: '_L__', score: 1500 },
      { name: '__R_', score: 1500 },
      { name: '___B', score: 500 },
      { name: 'PUR', score: 2800 },
    ],
    winner: 'T___',
    ...overrides,
  };
}
