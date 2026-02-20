import { describe, expect, it, vi } from 'vitest';
import {
  BRAKE_POWER,
  createShip,
  createTrail,
  DRAG,
  drawShip,
  drawTrail,
  MAX_SPEED,
  ROTATION_SPEED,
  SHIP_SIZE,
  THRUST_POWER,
  THRUST_RAMP_SPEED,
  TRAIL_BASE_OPACITY,
  TRAIL_BASE_WIDTH,
  TRAIL_COLOR,
  TRAIL_MAX_LENGTH,
  TRAIL_THRUST_OPACITY,
  TRAIL_THRUST_WIDTH,
  updateShip,
  updateTrail,
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

    it('defaults thrustIntensity to 0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.thrustIntensity).toBe(0);
    });

    it('defaults fireCooldown to 0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.fireCooldown).toBe(0);
    });

    it('SHIP_SIZE is exported and equals 15', () => {
      expect(SHIP_SIZE).toBe(15);
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
        thrustIntensity: 0,
        fireCooldown: 0,
        owner: 'player',
      });
    });

    it('defaults owner to "player" when not specified', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      expect(ship.owner).toBe('player');
    });

    it('accepts owner: "enemy"', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      expect(ship.owner).toBe('enemy');
    });

    it('accepts owner: "player" explicitly', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'player' });
      expect(ship.owner).toBe('player');
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

    it('uses solid lines for player ships (no setLineDash)', () => {
      const ctx = createFakeCtx();
      ctx.setLineDash = vi.fn();
      const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'player' });
      drawShip(ctx, ship);

      // Should not set dashed lines for player
      expect(ctx.setLineDash).not.toHaveBeenCalled();
    });

    it('uses dashed lines for enemy ships', () => {
      const ctx = createFakeCtx();
      ctx.setLineDash = vi.fn();
      const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      drawShip(ctx, ship);

      expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
    });

    it('resets line dash after drawing enemy ship', () => {
      const dashCalls = [];
      const ctx = createFakeCtx();
      ctx.setLineDash = vi.fn((pattern) => dashCalls.push([...pattern]));
      const ship = createShip({ x: 0, y: 0, heading: 0, owner: 'enemy' });
      drawShip(ctx, ship);

      // Should have called setLineDash twice: once to set, once to reset
      expect(ctx.setLineDash).toHaveBeenCalledTimes(2);
      expect(dashCalls[0]).toEqual([4, 4]);
      expect(dashCalls[1]).toEqual([]);
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
      updateShip(ship, 0.1);
      expect(ship.heading).toBeCloseTo(ROTATION_SPEED * 0.1, 5);
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

    it('THRUST_RAMP_SPEED is 6.0', () => {
      expect(THRUST_RAMP_SPEED).toBe(6.0);
    });
  });

  describe('thrust intensity ramp', () => {
    it('updateShip ramps thrustIntensity up when ship.thrust is true', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = true;
      updateShip(ship, 0.1);
      // 0 + 6.0 * 0.1 = 0.6
      expect(ship.thrustIntensity).toBeCloseTo(0.6, 5);
    });

    it('updateShip ramps thrustIntensity down when ship.thrust is false', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrustIntensity = 1.0;
      updateShip(ship, 0.1);
      // 1.0 - 6.0 * 0.1 = 0.4
      expect(ship.thrustIntensity).toBeCloseTo(0.4, 5);
    });

    it('clamps thrustIntensity at 1.0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = true;
      updateShip(ship, 10.0);
      expect(ship.thrustIntensity).toBe(1.0);
    });

    it('clamps thrustIntensity at 0.0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrustIntensity = 0.5;
      updateShip(ship, 10.0);
      expect(ship.thrustIntensity).toBe(0.0);
    });

    it('thrustIntensity does not change with dt=0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrustIntensity = 0.5;
      ship.thrust = true;
      updateShip(ship, 0);
      expect(ship.thrustIntensity).toBe(0.5);
    });

    it('thrust force scales by thrustIntensity (partial thrust = partial acceleration)', () => {
      const dt = 0.01; // Small dt so ramp doesn't saturate
      // Ship at full intensity
      const full = createShip({ x: 0, y: 0, heading: 0 });
      full.thrustIntensity = 1.0;
      full.thrust = true;
      updateShip(full, dt);

      // Ship at low intensity
      const low = createShip({ x: 0, y: 0, heading: 0 });
      low.thrustIntensity = 0.1;
      low.thrust = true;
      updateShip(low, dt);

      // Full-intensity ship gets more velocity than low-intensity
      expect(full.vx).toBeGreaterThan(low.vx);
    });

    it('partial thrustIntensity produces proportional acceleration', () => {
      // Use dt small enough that neither ramps to 1.0
      const dt = 0.01;
      // Ship starting at intensity 0 → ramps to 0.06
      const low = createShip({ x: 0, y: 0, heading: 0 });
      low.thrust = true;
      updateShip(low, dt);

      // Ship starting at intensity 0.5 → ramps to 0.56
      const mid = createShip({ x: 0, y: 0, heading: 0 });
      mid.thrustIntensity = 0.5;
      mid.thrust = true;
      updateShip(mid, dt);

      // Mid-intensity ship should accelerate more than low-intensity
      expect(mid.vx).toBeGreaterThan(low.vx);
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

    it('velocity accounts for thrust ramp and drag', () => {
      const heading = Math.PI / 4;
      const dt = 0.1;
      const ship = createShip({ x: 0, y: 0, heading });
      ship.thrust = true;
      updateShip(ship, dt);

      // Intensity ramps from 0: min(0 + THRUST_RAMP_SPEED * dt, 1) = 0.6
      const intensity = Math.min(THRUST_RAMP_SPEED * dt, 1.0);
      // Thrust: vx = cos(heading) * THRUST_POWER * intensity * dt
      // Then drag: vx *= (1 - DRAG * dt)
      const expectedVx =
        Math.cos(heading) * THRUST_POWER * intensity * dt * (1 - DRAG * dt);
      const expectedVy =
        Math.sin(heading) * THRUST_POWER * intensity * dt * (1 - DRAG * dt);
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

  describe('configurable thrustPower via ship.thrustPower', () => {
    it('uses ship.thrustPower when set on the ship object', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrustPower = 200;
      ship.thrust = true;
      updateShip(ship, 0.1);
      // cos(0)=1, intensity ramps to 0.6
      // expected vx after thrust + drag: 200 * 0.6 * 0.1 * (1-DRAG*0.1)
      const intensity = Math.min(THRUST_RAMP_SPEED * 0.1, 1.0);
      const expectedVx = 200 * intensity * 0.1 * (1 - DRAG * 0.1);
      expect(ship.vx).toBeCloseTo(expectedVx, 5);
    });

    it('falls back to THRUST_POWER when ship.thrustPower is not set', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrust = true;
      updateShip(ship, 0.1);
      const intensity = Math.min(THRUST_RAMP_SPEED * 0.1, 1.0);
      const expectedVx = THRUST_POWER * intensity * 0.1 * (1 - DRAG * 0.1);
      expect(ship.vx).toBeCloseTo(expectedVx, 5);
    });

    it('uses ship.thrustPower of 0 when explicitly set to 0', () => {
      const ship = createShip({ x: 0, y: 0, heading: 0 });
      ship.thrustPower = 0;
      ship.thrust = true;
      updateShip(ship, 0.1);
      // No thrust applied, no drag on zero velocity
      expect(ship.vx).toBe(0);
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

describe('Increment 22b: Ship Exhaust Trail', () => {
  describe('constants', () => {
    it('TRAIL_MAX_LENGTH is 240', () => {
      expect(TRAIL_MAX_LENGTH).toBe(240);
    });

    it('TRAIL_BASE_OPACITY is 0.2', () => {
      expect(TRAIL_BASE_OPACITY).toBe(0.2);
    });

    it('TRAIL_THRUST_OPACITY is 0.6', () => {
      expect(TRAIL_THRUST_OPACITY).toBe(0.6);
    });

    it('TRAIL_BASE_WIDTH is 1', () => {
      expect(TRAIL_BASE_WIDTH).toBe(1);
    });

    it('TRAIL_THRUST_WIDTH is 2.5', () => {
      expect(TRAIL_THRUST_WIDTH).toBe(2.5);
    });

    it('THRUST_RAMP_SPEED is 6.0 (physics constant)', () => {
      expect(THRUST_RAMP_SPEED).toBe(6.0);
    });

    it('TRAIL_COLOR is dark orange { r: 255, g: 120, b: 0 }', () => {
      expect(TRAIL_COLOR).toEqual({ r: 255, g: 120, b: 0 });
    });
  });

  describe('createTrail', () => {
    it('returns an object with empty points only (no thrustIntensity)', () => {
      const trail = createTrail();
      expect(trail).toEqual({ points: [] });
    });
  });

  describe('updateTrail — always records', () => {
    it('pushes a point when thrustIntensity > 0', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, 0, 0.5);
      expect(trail.points.length).toBe(1);
    });

    it('pushes a point when thrustIntensity is 0 (always-on)', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, 0, 0);
      expect(trail.points.length).toBe(1);
    });

    it('stores intensity float from passed thrustIntensity', () => {
      const trail = createTrail();
      updateTrail(trail, 10, 20, 0, 0.75);
      expect(trail.points[0].intensity).toBe(0.75);
    });
  });

  describe('updateTrail — stores passed intensity (no ramping)', () => {
    it('stores exactly the thrustIntensity value passed', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 0.42);
      expect(trail.points[0].intensity).toBe(0.42);
    });

    it('stores 1.0 when passed 1.0', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 1.0);
      expect(trail.points[0].intensity).toBe(1.0);
    });

    it('stores 0.0 when passed 0.0', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 0.0);
      expect(trail.points[0].intensity).toBe(0.0);
    });
  });

  describe('updateTrail — nozzle offset', () => {
    it('offsets point to ship rear when heading is 0 (pointing right)', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, 0, 0.5);
      expect(trail.points[0].x).toBeCloseTo(92.5, 1);
      expect(trail.points[0].y).toBeCloseTo(200, 1);
    });

    it('offsets point to ship rear when heading is PI/2 (pointing down)', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, Math.PI / 2, 0.5);
      expect(trail.points[0].x).toBeCloseTo(100, 1);
      expect(trail.points[0].y).toBeCloseTo(192.5, 1);
    });

    it('offsets point to ship rear when heading is -PI/2 (pointing up)', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, -Math.PI / 2, 0.5);
      expect(trail.points[0].x).toBeCloseTo(100, 1);
      expect(trail.points[0].y).toBeCloseTo(207.5, 1);
    });

    it('applies nozzle offset even when thrustIntensity is 0', () => {
      const trail = createTrail();
      updateTrail(trail, 100, 200, 0, 0);
      expect(trail.points[0].x).toBeCloseTo(92.5, 1);
    });
  });

  describe('updateTrail — eviction', () => {
    it('evicts the oldest point when exceeding TRAIL_MAX_LENGTH', () => {
      const trail = createTrail();
      for (let i = 0; i < TRAIL_MAX_LENGTH + 5; i++) {
        updateTrail(trail, i * 10, i * 20, 0, 0.5);
      }
      expect(trail.points.length).toBe(TRAIL_MAX_LENGTH);
    });

    it('maintains exactly TRAIL_MAX_LENGTH after many updates', () => {
      const trail = createTrail();
      for (let i = 0; i < 500; i++) {
        updateTrail(trail, i, i, 0, 0.5);
      }
      expect(trail.points.length).toBe(TRAIL_MAX_LENGTH);
    });
  });

  describe('drawTrail', () => {
    it('draws nothing when trail has fewer than 2 points', () => {
      const trail = createTrail();
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      };

      drawTrail(ctx, trail);
      expect(ctx.beginPath).not.toHaveBeenCalled();

      updateTrail(trail, 100, 200, 0, 0.5);
      drawTrail(ctx, trail);
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('draws line segments between consecutive points', () => {
      const trail = createTrail();
      updateTrail(trail, 10, 20, 0, 0.5);
      updateTrail(trail, 30, 40, 0, 0.5);
      updateTrail(trail, 50, 60, 0, 0.5);

      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);
      expect(ctx.beginPath).toHaveBeenCalledTimes(2);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });

    it('full-intensity segments use TRAIL_THRUST_WIDTH', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 1.0);
      updateTrail(trail, 10, 10, 0, 1.0);

      const widths = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => widths.push(ctx.lineWidth)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);
      expect(widths[0]).toBe(TRAIL_THRUST_WIDTH);
    });

    it('zero-intensity segments use TRAIL_BASE_WIDTH', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 0);
      updateTrail(trail, 10, 10, 0, 0);

      const widths = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => widths.push(ctx.lineWidth)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);
      expect(widths[0]).toBe(TRAIL_BASE_WIDTH);
    });

    it('intermediate intensity produces width between base and thrust', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 0.5);
      updateTrail(trail, 10, 10, 0, 0.5);

      const widths = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => widths.push(ctx.lineWidth)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);
      const expectedWidth =
        TRAIL_BASE_WIDTH + (TRAIL_THRUST_WIDTH - TRAIL_BASE_WIDTH) * 0.5;
      expect(widths[0]).toBeCloseTo(expectedWidth, 5);
    });

    it('full-intensity segments are brighter than zero-intensity at same age', () => {
      // Trail with full intensity
      const thrustTrail = createTrail();
      updateTrail(thrustTrail, 0, 0, 0, 1.0);
      updateTrail(thrustTrail, 10, 10, 0, 1.0);
      updateTrail(thrustTrail, 20, 20, 0, 1.0);

      // Trail with zero intensity
      const coastTrail = createTrail();
      updateTrail(coastTrail, 0, 0, 0, 0);
      updateTrail(coastTrail, 10, 10, 0, 0);
      updateTrail(coastTrail, 20, 20, 0, 0);

      const thrustStyles = [];
      const coastStyles = [];
      const makeCtx = (arr) => ({
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => arr.push(makeCtx.lastStyle)),
        set strokeStyle(v) {
          makeCtx.lastStyle = v;
        },
        get strokeStyle() {
          return makeCtx.lastStyle;
        },
        lineWidth: 0,
      });

      const ctx1 = makeCtx(thrustStyles);
      drawTrail(ctx1, thrustTrail);
      const ctx2 = makeCtx(coastStyles);
      drawTrail(ctx2, coastTrail);

      const getAlpha = (s) => {
        const m = s.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
        return m ? Number.parseFloat(m[1]) : 0;
      };
      const thrustAlpha = getAlpha(thrustStyles[thrustStyles.length - 1]);
      const coastAlpha = getAlpha(coastStyles[coastStyles.length - 1]);
      expect(thrustAlpha).toBeGreaterThan(coastAlpha);
    });

    it('newest full-intensity segment alpha is close to TRAIL_THRUST_OPACITY', () => {
      const trail = createTrail();
      for (let i = 0; i <= TRAIL_MAX_LENGTH; i++) {
        updateTrail(trail, i, i, 0, 1.0);
      }

      const styles = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => styles.push(ctx.strokeStyle)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);

      const lastStyle = styles[styles.length - 1];
      const match = lastStyle.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
      expect(Number.parseFloat(match[1])).toBeCloseTo(TRAIL_THRUST_OPACITY, 2);
    });

    it('newest zero-intensity segment alpha is close to TRAIL_BASE_OPACITY', () => {
      const trail = createTrail();
      for (let i = 0; i <= TRAIL_MAX_LENGTH; i++) {
        updateTrail(trail, i, i, 0, 0);
      }

      const styles = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => styles.push(ctx.strokeStyle)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);

      const lastStyle = styles[styles.length - 1];
      const match = lastStyle.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
      expect(Number.parseFloat(match[1])).toBeCloseTo(TRAIL_BASE_OPACITY, 2);
    });

    it('uses dark orange color (TRAIL_COLOR) for all segments', () => {
      const trail = createTrail();
      updateTrail(trail, 0, 0, 0, 0.5);
      updateTrail(trail, 10, 10, 0, 0);
      updateTrail(trail, 20, 20, 0, 1.0);

      const styles = [];
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(() => styles.push(ctx.strokeStyle)),
        strokeStyle: '',
        lineWidth: 0,
      };

      drawTrail(ctx, trail);

      for (const style of styles) {
        expect(style).toMatch(/^rgba\(255, 120, 0,/);
      }
    });
  });
});
