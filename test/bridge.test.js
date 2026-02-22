import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { parseArgs, processCommand } from '../simulate.js';

// ── Unit Tests: processCommand ──────────────────────────────────────────

describe('Increment 34: Python Bridge', () => {
  describe('processCommand — reset', () => {
    it('returns observation array of length 36', () => {
      const result = processCommand(null, JSON.stringify({ command: 'reset' }));
      expect(result.response.observation).toBeInstanceOf(Array);
      expect(result.response.observation).toHaveLength(36);
    });

    it('returns a new env (not null)', () => {
      const result = processCommand(null, JSON.stringify({ command: 'reset' }));
      expect(result.env).not.toBeNull();
      expect(result.env).toBeDefined();
    });

    it('observation is a plain array (not keyed object)', () => {
      const result = processCommand(null, JSON.stringify({ command: 'reset' }));
      // Should be [0.5, -0.3, ...] not {"0": 0.5, "1": -0.3, ...}
      const json = JSON.stringify(result.response);
      expect(json).not.toMatch(/"0":/);
    });

    it('works with custom config', () => {
      const result = processCommand(
        null,
        JSON.stringify({
          command: 'reset',
          config: { maxTicks: 100, asteroidDensity: 0.5 },
        }),
      );
      expect(result.response.observation).toHaveLength(36);
      expect(result.env).not.toBeNull();
    });

    it('shouldExit is false', () => {
      const result = processCommand(null, JSON.stringify({ command: 'reset' }));
      expect(result.shouldExit).toBe(false);
    });
  });

  describe('processCommand — step', () => {
    it('returns observation, reward, done, info', () => {
      // First reset to get env
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
      );
      expect(stepResult.response).toHaveProperty('observation');
      expect(stepResult.response).toHaveProperty('reward');
      expect(stepResult.response).toHaveProperty('done');
      expect(stepResult.response).toHaveProperty('info');
    });

    it('observation is array of length 36', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 3, fire: 0 }),
      );
      expect(stepResult.response.observation).toBeInstanceOf(Array);
      expect(stepResult.response.observation).toHaveLength(36);
    });

    it('reward is a number', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
      );
      expect(typeof stepResult.response.reward).toBe('number');
    });

    it('done is a boolean', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
      );
      expect(typeof stepResult.response.done).toBe('boolean');
    });

    it('shouldExit is false', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
      );
      expect(stepResult.shouldExit).toBe(false);
    });

    it('fire defaults to 0 when omitted', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 3 }),
      );
      expect(stepResult.response).toHaveProperty('observation');
      expect(stepResult.response.error).toBeUndefined();
    });
  });

  describe('processCommand — close', () => {
    it('returns { status: "closed" } with shouldExit true', () => {
      const result = processCommand(null, JSON.stringify({ command: 'close' }));
      expect(result.response).toEqual({ status: 'closed' });
      expect(result.shouldExit).toBe(true);
    });
  });

  describe('processCommand — errors', () => {
    it('step before reset returns error', () => {
      const result = processCommand(
        null,
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
      );
      expect(result.response.error).toBe(
        'Environment not initialized. Call reset first.',
      );
      expect(result.shouldExit).toBe(false);
    });

    it('invalid JSON returns error', () => {
      const result = processCommand(null, 'not json at all');
      expect(result.response.error).toMatch(/^Invalid JSON:/);
      expect(result.shouldExit).toBe(false);
    });

    it('empty string returns invalid JSON error', () => {
      const result = processCommand(null, '');
      expect(result.response.error).toMatch(/^Invalid JSON:/);
    });

    it('unknown command returns error', () => {
      const result = processCommand(null, JSON.stringify({ command: 'fly' }));
      expect(result.response.error).toBe('Unknown command: fly');
      expect(result.shouldExit).toBe(false);
    });

    it('invalid action (out of range high) returns error', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 99, fire: 0 }),
      );
      expect(stepResult.response.error).toMatch(/^Invalid action:/);
    });

    it('invalid action (negative) returns error', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: -1, fire: 0 }),
      );
      expect(stepResult.response.error).toMatch(/^Invalid action:/);
    });

    it('invalid action (float) returns error', () => {
      const resetResult = processCommand(
        null,
        JSON.stringify({ command: 'reset' }),
      );
      const stepResult = processCommand(
        resetResult.env,
        JSON.stringify({ command: 'step', action: 1.5, fire: 0 }),
      );
      expect(stepResult.response.error).toMatch(/^Invalid action:/);
    });
  });

  describe('parseArgs — bridge flag', () => {
    it('--bridge sets bridge to true', () => {
      expect(parseArgs(['--bridge']).bridge).toBe(true);
    });

    it('defaults bridge to false', () => {
      expect(parseArgs([]).bridge).toBe(false);
    });
  });

  // ── Integration Tests: process spawn ──────────────────────────────────

  describe('bridge integration (process spawn)', () => {
    it('reset + step + close round-trip', () => {
      const input = [
        JSON.stringify({ command: 'reset', config: {} }),
        JSON.stringify({ command: 'step', action: 0, fire: 0 }),
        JSON.stringify({ command: 'close' }),
      ].join('\n');

      const output = execSync('node simulate.js --bridge', {
        input,
        encoding: 'utf-8',
        timeout: 10000,
      });

      const lines = output.trim().split('\n');
      expect(lines).toHaveLength(3);

      const resetResp = JSON.parse(lines[0]);
      expect(resetResp.observation).toBeInstanceOf(Array);
      expect(resetResp.observation).toHaveLength(36);

      const stepResp = JSON.parse(lines[1]);
      expect(stepResp).toHaveProperty('observation');
      expect(stepResp).toHaveProperty('reward');
      expect(stepResp).toHaveProperty('done');
      expect(stepResp).toHaveProperty('info');

      const closeResp = JSON.parse(lines[2]);
      expect(closeResp).toEqual({ status: 'closed' });
    });

    it('invalid JSON returns error response', () => {
      const input = 'not valid json\n';

      const output = execSync('node simulate.js --bridge', {
        input,
        encoding: 'utf-8',
        timeout: 10000,
      });

      const lines = output.trim().split('\n');
      const resp = JSON.parse(lines[0]);
      expect(resp.error).toMatch(/^Invalid JSON:/);
    });

    it('--bridge and --games are mutually exclusive', () => {
      try {
        execSync('node simulate.js --bridge --games 5', {
          encoding: 'utf-8',
          timeout: 10000,
        });
        // Should not reach here
        expect.unreachable('Expected process to exit with non-zero code');
      } catch (err) {
        expect(err.status).not.toBe(0);
        expect(err.stderr.toString()).toMatch(/mutually exclusive/);
      }
    });

    it('process exits with code 0 on close', () => {
      const input = [
        JSON.stringify({ command: 'reset', config: {} }),
        JSON.stringify({ command: 'close' }),
      ].join('\n');

      // execSync throws on non-zero exit — no throw means exit code 0
      const output = execSync('node simulate.js --bridge', {
        input,
        encoding: 'utf-8',
        timeout: 10000,
      });

      const lines = output.trim().split('\n');
      expect(lines).toHaveLength(2);
    });
  });
});
