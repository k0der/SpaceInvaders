import { describe, it, expect, vi } from 'vitest';
import { createShip, drawShip, updateShip, ROTATION_SPEED } from '../src/ship.js';

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
    it('ship created at screen center with heading -PI/2 points up', () => {
      const w = 800, h = 600;
      const ship = createShip({ x: w / 2, y: h / 2, heading: -Math.PI / 2 });
      expect(ship.x).toBe(400);
      expect(ship.y).toBe(300);
      expect(ship.heading).toBe(-Math.PI / 2);
    });
  });
});

describe('Increment 18: Ship Rotates with Keyboard', () => {

  describe('ROTATION_SPEED constant', () => {
    it('is exported and is a positive number', () => {
      expect(typeof ROTATION_SPEED).toBe('number');
      expect(ROTATION_SPEED).toBeGreaterThan(0);
    });
  });

  describe('updateShip — rotation only', () => {
    it('rotatingLeft decreases heading by ROTATION_SPEED * dt', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.rotatingLeft = true;
      updateShip(ship, 0.1);
      expect(ship.heading).toBeCloseTo(-ROTATION_SPEED * 0.1, 5);
    });

    it('rotatingRight increases heading by ROTATION_SPEED * dt', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.rotatingRight = true;
      updateShip(ship, 0.1);
      expect(ship.heading).toBeCloseTo(ROTATION_SPEED * 0.1, 5);
    });

    it('no rotation when neither flag is set', () => {
      const ship = createShip({ x: 0, y: 0, heading: 1.0 });
      updateShip(ship, 1.0);
      expect(ship.heading).toBe(1.0);
    });

    it('rotation scales with dt', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.rotatingRight = true;
      updateShip(ship, 0.5);
      expect(ship.heading).toBeCloseTo(ROTATION_SPEED * 0.5, 5);
    });

    it('with dt=0, heading does not change', () => {
      const ship = createShip({ x: 0, y: 0, heading: 1.0 });
      ship.rotatingLeft = true;
      updateShip(ship, 0);
      expect(ship.heading).toBe(1.0);
    });

    it('heading normalizes to [-PI, PI] when rotating past PI', () => {
      const ship = createShip({ x: 0, y: 0, heading: Math.PI - 0.1 });
      ship.rotatingRight = true;
      // Large dt to push past PI
      updateShip(ship, 10.0);
      expect(ship.heading).toBeGreaterThanOrEqual(-Math.PI);
      expect(ship.heading).toBeLessThanOrEqual(Math.PI);
    });

    it('heading normalizes to [-PI, PI] when rotating past -PI', () => {
      const ship = createShip({ x: 0, y: 0, heading: -Math.PI + 0.1 });
      ship.rotatingLeft = true;
      updateShip(ship, 10.0);
      expect(ship.heading).toBeGreaterThanOrEqual(-Math.PI);
      expect(ship.heading).toBeLessThanOrEqual(Math.PI);
    });

    it('both rotateLeft and rotateRight cancel out', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0.5 });
      ship.rotatingLeft = true;
      ship.rotatingRight = true;
      updateShip(ship, 1.0);
      expect(ship.heading).toBeCloseTo(0.5, 5);
    });

    it('position does not change (rotation only, no thrust)', () => {
      const ship = createShip({ x: 100, y: 200, heading: 0 });
      ship.rotatingRight = true;
      updateShip(ship, 1.0);
      expect(ship.x).toBe(100);
      expect(ship.y).toBe(200);
    });
  });
});
