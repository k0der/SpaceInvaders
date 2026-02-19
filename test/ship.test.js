import { describe, it, expect, vi } from 'vitest';
import { createShip, drawShip } from '../src/ship.js';

describe('Increment 17: Static Ship at Screen Center', () => {

  describe('createShip', () => {
    it('returns a ship with x, y, heading from parameters', () => {
      const ship = createShip({ x: 400, y: 300, heading: -Math.PI / 2 });
      expect(ship.x).toBe(400);
      expect(ship.y).toBe(300);
      expect(ship.heading).toBe(-Math.PI / 2);
    });

    it('defaults vx and vy to 0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.vx).toBe(0);
      expect(ship.vy).toBe(0);
    });

    it('defaults alive to true', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.alive).toBe(true);
    });

    it('defaults all control booleans to false', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.thrust).toBe(false);
      expect(ship.rotatingLeft).toBe(false);
      expect(ship.rotatingRight).toBe(false);
      expect(ship.braking).toBe(false);
      expect(ship.fire).toBe(false);
    });

    it('returns all expected properties', () => {
      const ship = createShip({ x: 100, y: 200, heading: 1.0 });
      expect(ship).toEqual({
        x: 100,
        y: 200,
        vx: 0,
        vy: 0,
        heading: 1.0,
        alive: true,
        thrust: false,
        rotatingLeft: false,
        rotatingRight: false,
        braking: false,
        fire: false,
      });
    });
  });

  describe('drawShip', () => {
    function createFakeCtx() {
      const calls = [];
      return {
        calls,
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        translate: vi.fn(() => calls.push('translate')),
        rotate: vi.fn(() => calls.push('rotate')),
        beginPath: vi.fn(() => calls.push('beginPath')),
        moveTo: vi.fn(() => calls.push('moveTo')),
        lineTo: vi.fn(() => calls.push('lineTo')),
        closePath: vi.fn(() => calls.push('closePath')),
        stroke: vi.fn(() => calls.push('stroke')),
        fill: vi.fn(() => calls.push('fill')),
        strokeStyle: '',
        lineWidth: 0,
      };
    }

    it('saves and restores canvas state (no transform leak)', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 400, y: 300, heading: -Math.PI / 2 });
      drawShip(ctx, ship);

      expect(ctx.calls[0]).toBe('save');
      expect(ctx.calls[ctx.calls.length - 1]).toBe('restore');
    });

    it('translates to ship position and rotates by heading', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 400, y: 300, heading: -Math.PI / 2 });
      drawShip(ctx, ship);

      expect(ctx.translate).toHaveBeenCalledWith(400, 300);
      expect(ctx.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    });

    it('draws a white wireframe with no fill', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      drawShip(ctx, ship);

      expect(ctx.strokeStyle).toBe('#FFFFFF');
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();
    });

    it('sets lineWidth to approximately 1.5', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      drawShip(ctx, ship);

      expect(ctx.lineWidth).toBe(1.5);
    });

    it('draws a closed path (chevron/triangle shape)', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      drawShip(ctx, ship);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it('does not draw dead ships', () => {
      const ctx = createFakeCtx();
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.alive = false;
      drawShip(ctx, ship);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('ship is static (no movement)', () => {
    it('ship has no update mechanism — position stays constant', () => {
      const ship = createShip({ x: 400, y: 300, heading: -Math.PI / 2 });
      // No updateShip exists yet — position cannot change
      expect(ship.x).toBe(400);
      expect(ship.y).toBe(300);
      expect(ship.heading).toBe(-Math.PI / 2);
    });

    it('ship created at screen center with heading -PI/2 points up', () => {
      const w = 800, h = 600;
      const ship = createShip({ x: w / 2, y: h / 2, heading: -Math.PI / 2 });
      expect(ship.x).toBe(400);
      expect(ship.y).toBe(300);
      expect(ship.heading).toBe(-Math.PI / 2);
    });
  });
});
