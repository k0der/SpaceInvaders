import { describe, expect, it, vi } from 'vitest';
import {
  BRAKE_POWER,
  createShip,
  DRAG,
  drawShip,
  MAX_SPEED,
  ROTATION_SPEED,
  THRUST_POWER,
  updateShip,
} from '../src/ship.js';

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
      const w = 800,
        h = 600;
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

describe('Increment 19: Ship Thrusts and Drifts', () => {
  describe('physics constants', () => {
    it('THRUST_POWER is a positive number', () => {
      expect(typeof THRUST_POWER).toBe('number');
      expect(THRUST_POWER).toBeGreaterThan(0);
    });

    it('DRAG is a positive number', () => {
      expect(typeof DRAG).toBe('number');
      expect(DRAG).toBeGreaterThan(0);
    });

    it('BRAKE_POWER is a positive number', () => {
      expect(typeof BRAKE_POWER).toBe('number');
      expect(BRAKE_POWER).toBeGreaterThan(0);
    });

    it('MAX_SPEED is a positive number', () => {
      expect(typeof MAX_SPEED).toBe('number');
      expect(MAX_SPEED).toBeGreaterThan(0);
    });
  });

  describe('thrust', () => {
    it('accelerates in heading direction (heading = 0, rightward)', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = true;
      updateShip(ship, 0.1);
      // cos(0) = 1, sin(0) = 0 → vx increases, vy stays ~0
      expect(ship.vx).toBeGreaterThan(0);
      expect(ship.vy).toBeCloseTo(0, 5);
    });

    it('accelerates in heading direction (heading = PI/2, downward)', () => {
      const ship = createShip({ x: 0, y: 0, heading: Math.PI / 2 });
      ship.thrust = true;
      updateShip(ship, 0.1);
      // cos(PI/2) ≈ 0, sin(PI/2) = 1 → vy increases, vx stays ~0
      expect(ship.vx).toBeCloseTo(0, 5);
      expect(ship.vy).toBeGreaterThan(0);
    });

    it('velocity increases by cos(heading)*THRUST_POWER*dt / sin(heading)*THRUST_POWER*dt', () => {
      const heading = Math.PI / 4;
      const dt = 0.1;
      const ship = createShip({ x: 0, y: 0, heading });
      ship.thrust = true;
      updateShip(ship, dt);

      // After thrust: vx = cos(heading)*THRUST_POWER*dt, vy = sin(heading)*THRUST_POWER*dt
      // Then drag: vx *= (1 - DRAG*dt), vy *= (1 - DRAG*dt)
      const expectedVx =
        Math.cos(heading) * THRUST_POWER * dt * (1 - DRAG * dt);
      const expectedVy =
        Math.sin(heading) * THRUST_POWER * dt * (1 - DRAG * dt);
      expect(ship.vx).toBeCloseTo(expectedVx, 5);
      expect(ship.vy).toBeCloseTo(expectedVy, 5);
    });

    it('does not accelerate when thrust is false', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = false;
      updateShip(ship, 0.1);
      expect(ship.vx).toBe(0);
      expect(ship.vy).toBe(0);
    });
  });

  describe('drag', () => {
    it('decays velocity toward zero each frame', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 100;
      ship.vy = 50;
      updateShip(ship, 0.1);
      // After drag: vx *= (1 - DRAG*0.1)
      expect(ship.vx).toBeCloseTo(100 * (1 - DRAG * 0.1), 5);
      expect(ship.vy).toBeCloseTo(50 * (1 - DRAG * 0.1), 5);
    });

    it('is always applied even without thrust', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 200;
      updateShip(ship, 0.5);
      expect(ship.vx).toBeLessThan(200);
    });

    it('velocity approaches zero over many frames', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 100;
      ship.vy = 100;
      for (let i = 0; i < 100; i++) updateShip(ship, 0.1);
      expect(Math.abs(ship.vx)).toBeLessThan(1);
      expect(Math.abs(ship.vy)).toBeLessThan(1);
    });
  });

  describe('braking', () => {
    it('decelerates opposite to velocity direction', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 200;
      ship.vy = 0;
      const vxBefore = ship.vx;
      ship.braking = true;
      updateShip(ship, 0.1);
      // Braking + drag should reduce vx more than drag alone
      const dragOnlyVx = vxBefore * (1 - DRAG * 0.1);
      expect(ship.vx).toBeLessThan(dragOnlyVx);
    });

    it('is stronger than drag alone', () => {
      // Ship with braking
      const braking = createShip({ x: 0, y: 0, heading: 0 });
      braking.vx = 200;
      braking.braking = true;
      updateShip(braking, 0.1);

      // Ship with drag only
      const drifting = createShip({ x: 0, y: 0, heading: 0 });
      drifting.vx = 200;
      updateShip(drifting, 0.1);

      expect(braking.vx).toBeLessThan(drifting.vx);
    });

    it('does not reverse velocity direction', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 5; // small velocity
      ship.vy = 0;
      ship.braking = true;
      updateShip(ship, 1.0); // large dt to try to overshoot
      // vx should be >= 0, not reversed
      expect(ship.vx).toBeGreaterThanOrEqual(0);
    });

    it('does not reverse direction on slow-moving ship (near-zero speed)', () => {
      const ship = createShip({ x: 0, y: 0, heading: Math.PI / 4 });
      ship.vx = 1;
      ship.vy = 1;
      ship.braking = true;
      updateShip(ship, 0.5);
      // Should not have reversed direction
      expect(ship.vx).toBeGreaterThanOrEqual(0);
      expect(ship.vy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('position update', () => {
    it('position changes by vx*dt, vy*dt', () => {
      const ship = createShip({ x: 100, y: 200, heading: 0 });
      ship.vx = 50;
      ship.vy = -30;
      updateShip(ship, 0.1);
      // After drag, velocity changes, then position = old + new_vx * dt
      // Exact values depend on drag, so just check position moved in correct direction
      expect(ship.x).toBeGreaterThan(100);
      expect(ship.y).toBeLessThan(200);
    });

    it('position does not change when vx=0 and vy=0', () => {
      const ship = createShip({ x: 100, y: 200, heading: 0 });
      updateShip(ship, 0.1);
      expect(ship.x).toBe(100);
      expect(ship.y).toBe(200);
    });
  });

  describe('speed cap', () => {
    it('speed never exceeds MAX_SPEED even with sustained thrust', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = true;
      // Thrust for many frames
      for (let i = 0; i < 500; i++) updateShip(ship, 0.016);
      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      expect(speed).toBeLessThanOrEqual(MAX_SPEED + 0.001);
    });

    it('velocity is normalized to MAX_SPEED when it would exceed it', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = MAX_SPEED * 2;
      ship.vy = 0;
      updateShip(ship, 0.016);
      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      expect(speed).toBeLessThanOrEqual(MAX_SPEED + 0.001);
    });

    it('preserves velocity direction when capping', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = MAX_SPEED * 2;
      ship.vy = MAX_SPEED * 2;
      updateShip(ship, 0.016);
      // Direction should be 45 degrees (equal vx and vy)
      expect(ship.vx).toBeCloseTo(ship.vy, 3);
      expect(ship.vx).toBeGreaterThan(0);
    });
  });

  describe('dt=0', () => {
    it('no velocity changes with dt=0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.vx = 100;
      ship.vy = 50;
      ship.thrust = true;
      ship.braking = true;
      updateShip(ship, 0);
      expect(ship.vx).toBe(100);
      expect(ship.vy).toBe(50);
    });

    it('no position changes with dt=0', () => {
      const ship = createShip({ x: 100, y: 200, heading: 0 });
      ship.vx = 50;
      ship.vy = 30;
      updateShip(ship, 0);
      expect(ship.x).toBe(100);
      expect(ship.y).toBe(200);
    });
  });

  describe('ship can fly off-screen', () => {
    it('position exceeds typical screen bounds with sustained thrust', () => {
      const ship = createShip({ x: 400, y: 300, heading: 0 });
      ship.thrust = true;
      for (let i = 0; i < 300; i++) updateShip(ship, 0.016);
      // Ship should have moved far beyond an 800px-wide screen
      expect(ship.x).toBeGreaterThan(800);
    });
  });

  describe('combined rotation + thrust', () => {
    it('rotation and thrust both apply in the same frame', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.rotatingRight = true;
      ship.thrust = true;
      updateShip(ship, 0.1);
      // Heading should have changed
      expect(ship.heading).toBeCloseTo(ROTATION_SPEED * 0.1, 5);
      // Velocity should have increased (thrust at heading=0 before rotation)
      expect(ship.vx).toBeGreaterThan(0);
    });
  });
});
