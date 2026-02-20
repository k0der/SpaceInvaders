import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStrategy,
  listStrategies,
  registerStrategy,
  resetRegistry,
} from '../src/ai-core.js';

describe('ai-core: Strategy Registry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('registerStrategy', () => {
    it('registers a strategy by name', () => {
      const strategy = { createState: () => ({}), update: () => {} };
      registerStrategy('test', strategy);
      expect(getStrategy('test')).toBe(strategy);
    });

    it('overwrites an existing strategy with the same name', () => {
      const strategy1 = { createState: () => ({}), update: () => {} };
      const strategy2 = { createState: () => ({}), update: () => {} };
      registerStrategy('test', strategy1);
      registerStrategy('test', strategy2);
      expect(getStrategy('test')).toBe(strategy2);
    });
  });

  describe('getStrategy', () => {
    it('returns a registered strategy', () => {
      const strategy = { createState: () => ({}), update: () => {} };
      registerStrategy('myAI', strategy);
      expect(getStrategy('myAI')).toBe(strategy);
    });

    it('throws on unknown strategy name', () => {
      expect(() => getStrategy('unknown')).toThrow();
    });
  });

  describe('listStrategies', () => {
    it('returns empty array when no strategies are registered', () => {
      expect(listStrategies()).toEqual([]);
    });

    it('returns names of all registered strategies', () => {
      registerStrategy('alpha', { createState: () => ({}), update: () => {} });
      registerStrategy('beta', { createState: () => ({}), update: () => {} });
      const names = listStrategies();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names.length).toBe(2);
    });

    it('returns a new array (not the internal reference)', () => {
      registerStrategy('alpha', { createState: () => ({}), update: () => {} });
      const list1 = listStrategies();
      const list2 = listStrategies();
      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });
});
