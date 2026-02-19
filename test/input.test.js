import { describe, expect, it } from 'vitest';
import {
  applyInput,
  createInputState,
  handleKeyDown,
  handleKeyUp,
} from '../src/input.js';

describe('Increment 18: Ship Rotates with Keyboard', () => {
  describe('createInputState', () => {
    it('returns all flags set to false', () => {
      const state = createInputState();
      expect(state).toEqual({
        thrust: false,
        rotateLeft: false,
        rotateRight: false,
        brake: false,
        fire: false,
      });
    });
  });

  describe('handleKeyDown', () => {
    it('maps "w" to thrust', () => {
      const state = createInputState();
      handleKeyDown(state, 'w');
      expect(state.thrust).toBe(true);
    });

    it('maps "W" to thrust (case-insensitive)', () => {
      const state = createInputState();
      handleKeyDown(state, 'W');
      expect(state.thrust).toBe(true);
    });

    it('maps "ArrowUp" to thrust', () => {
      const state = createInputState();
      handleKeyDown(state, 'ArrowUp');
      expect(state.thrust).toBe(true);
    });

    it('maps "a" to rotateLeft', () => {
      const state = createInputState();
      handleKeyDown(state, 'a');
      expect(state.rotateLeft).toBe(true);
    });

    it('maps "A" to rotateLeft', () => {
      const state = createInputState();
      handleKeyDown(state, 'A');
      expect(state.rotateLeft).toBe(true);
    });

    it('maps "ArrowLeft" to rotateLeft', () => {
      const state = createInputState();
      handleKeyDown(state, 'ArrowLeft');
      expect(state.rotateLeft).toBe(true);
    });

    it('maps "d" to rotateRight', () => {
      const state = createInputState();
      handleKeyDown(state, 'd');
      expect(state.rotateRight).toBe(true);
    });

    it('maps "D" to rotateRight', () => {
      const state = createInputState();
      handleKeyDown(state, 'D');
      expect(state.rotateRight).toBe(true);
    });

    it('maps "ArrowRight" to rotateRight', () => {
      const state = createInputState();
      handleKeyDown(state, 'ArrowRight');
      expect(state.rotateRight).toBe(true);
    });

    it('maps "s" to brake', () => {
      const state = createInputState();
      handleKeyDown(state, 's');
      expect(state.brake).toBe(true);
    });

    it('maps "S" to brake', () => {
      const state = createInputState();
      handleKeyDown(state, 'S');
      expect(state.brake).toBe(true);
    });

    it('maps "ArrowDown" to brake', () => {
      const state = createInputState();
      handleKeyDown(state, 'ArrowDown');
      expect(state.brake).toBe(true);
    });

    it('maps " " (space) to fire', () => {
      const state = createInputState();
      handleKeyDown(state, ' ');
      expect(state.fire).toBe(true);
    });

    it('ignores unknown keys', () => {
      const state = createInputState();
      handleKeyDown(state, 'x');
      expect(state).toEqual(createInputState());
    });

    it('ignores Escape key (reserved for settings)', () => {
      const state = createInputState();
      handleKeyDown(state, 'Escape');
      expect(state).toEqual(createInputState());
    });
  });

  describe('handleKeyUp', () => {
    it('clears thrust on "w" release', () => {
      const state = createInputState();
      handleKeyDown(state, 'w');
      handleKeyUp(state, 'w');
      expect(state.thrust).toBe(false);
    });

    it('clears rotateLeft on "a" release', () => {
      const state = createInputState();
      handleKeyDown(state, 'a');
      handleKeyUp(state, 'a');
      expect(state.rotateLeft).toBe(false);
    });

    it('clears rotateRight on "d" release', () => {
      const state = createInputState();
      handleKeyDown(state, 'd');
      handleKeyUp(state, 'd');
      expect(state.rotateRight).toBe(false);
    });

    it('clears brake on "s" release', () => {
      const state = createInputState();
      handleKeyDown(state, 's');
      handleKeyUp(state, 's');
      expect(state.brake).toBe(false);
    });

    it('clears fire on space release', () => {
      const state = createInputState();
      handleKeyDown(state, ' ');
      handleKeyUp(state, ' ');
      expect(state.fire).toBe(false);
    });

    it('clears ArrowUp on release', () => {
      const state = createInputState();
      handleKeyDown(state, 'ArrowUp');
      handleKeyUp(state, 'ArrowUp');
      expect(state.thrust).toBe(false);
    });

    it('ignores unknown keys', () => {
      const state = createInputState();
      handleKeyDown(state, 'w');
      handleKeyUp(state, 'z');
      expect(state.thrust).toBe(true);
    });

    it('multiple keys can be held simultaneously', () => {
      const state = createInputState();
      handleKeyDown(state, 'w');
      handleKeyDown(state, 'a');
      expect(state.thrust).toBe(true);
      expect(state.rotateLeft).toBe(true);
      handleKeyUp(state, 'w');
      expect(state.thrust).toBe(false);
      expect(state.rotateLeft).toBe(true);
    });
  });

  describe('applyInput', () => {
    it('copies input flags onto ship control booleans', () => {
      const input = createInputState();
      handleKeyDown(input, 'a');
      handleKeyDown(input, 'w');

      const ship = {
        thrust: false,
        rotatingLeft: false,
        rotatingRight: false,
        braking: false,
        fire: false,
      };

      applyInput(input, ship);

      expect(ship.thrust).toBe(true);
      expect(ship.rotatingLeft).toBe(true);
      expect(ship.rotatingRight).toBe(false);
      expect(ship.braking).toBe(false);
      expect(ship.fire).toBe(false);
    });

    it('clears ship controls when input is released', () => {
      const input = createInputState();
      handleKeyDown(input, 'd');

      const ship = {
        thrust: false,
        rotatingLeft: false,
        rotatingRight: false,
        braking: false,
        fire: false,
      };

      applyInput(input, ship);
      expect(ship.rotatingRight).toBe(true);

      handleKeyUp(input, 'd');
      applyInput(input, ship);
      expect(ship.rotatingRight).toBe(false);
    });
  });
});
