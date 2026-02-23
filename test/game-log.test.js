import { describe, expect, it } from 'vitest';
import {
  createGameLog,
  formatGameLog,
  recordResult,
  resetGameLog,
} from '../src/game-log.js';

describe('Increment 41: Game Log', () => {
  describe('createGameLog', () => {
    it('returns a log with wins, losses, and draws all at zero', () => {
      const log = createGameLog();
      expect(log.wins).toBe(0);
      expect(log.losses).toBe(0);
      expect(log.draws).toBe(0);
    });
  });

  describe('recordResult', () => {
    it('increments wins for playerWin phase', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      expect(log.wins).toBe(1);
      expect(log.losses).toBe(0);
      expect(log.draws).toBe(0);
    });

    it('increments losses for playerDead phase', () => {
      const log = createGameLog();
      recordResult(log, 'playerDead');
      expect(log.losses).toBe(1);
      expect(log.wins).toBe(0);
      expect(log.draws).toBe(0);
    });

    it('increments draws for draw phase', () => {
      const log = createGameLog();
      recordResult(log, 'draw');
      expect(log.draws).toBe(1);
      expect(log.wins).toBe(0);
      expect(log.losses).toBe(0);
    });

    it('does nothing for non-terminal phases', () => {
      const log = createGameLog();
      recordResult(log, 'playing');
      recordResult(log, 'ending');
      expect(log.wins).toBe(0);
      expect(log.losses).toBe(0);
      expect(log.draws).toBe(0);
    });

    it('accumulates results across multiple calls', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerDead');
      recordResult(log, 'draw');
      expect(log.wins).toBe(2);
      expect(log.losses).toBe(1);
      expect(log.draws).toBe(1);
    });
  });

  describe('resetGameLog', () => {
    it('sets all counters back to zero', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      recordResult(log, 'playerDead');
      recordResult(log, 'draw');
      resetGameLog(log);
      expect(log.wins).toBe(0);
      expect(log.losses).toBe(0);
      expect(log.draws).toBe(0);
    });

    it('works on an already-empty log', () => {
      const log = createGameLog();
      resetGameLog(log);
      expect(log.wins).toBe(0);
      expect(log.losses).toBe(0);
      expect(log.draws).toBe(0);
    });
  });

  describe('formatGameLog', () => {
    it('formats stats with counts and percentages', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerDead');
      recordResult(log, 'playerDead');
      recordResult(log, 'playerDead');
      recordResult(log, 'draw');
      recordResult(log, 'draw');
      const text = formatGameLog(log);
      expect(text).toBe('W:5 (50.0%)  L:3 (30.0%)  D:2 (20.0%)  N=10');
    });

    it('handles zero total matches without division-by-zero', () => {
      const log = createGameLog();
      const text = formatGameLog(log);
      expect(text).toBe('W:0 (0.0%)  L:0 (0.0%)  D:0 (0.0%)  N=0');
    });

    it('formats 100% correctly when all results are one type', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      recordResult(log, 'playerWin');
      const text = formatGameLog(log);
      expect(text).toBe('W:3 (100.0%)  L:0 (0.0%)  D:0 (0.0%)  N=3');
    });

    it('formats percentages with one decimal place', () => {
      const log = createGameLog();
      recordResult(log, 'playerWin');
      recordResult(log, 'playerDead');
      recordResult(log, 'draw');
      const text = formatGameLog(log);
      expect(text).toBe('W:1 (33.3%)  L:1 (33.3%)  D:1 (33.3%)  N=3');
    });
  });
});
