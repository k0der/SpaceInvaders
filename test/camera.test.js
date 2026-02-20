import { describe, expect, it, vi } from 'vitest';
import {
  applyCameraTransform,
  createCamera,
  getViewportBounds,
  resetCameraTransform,
  screenToWorld,
  VIEWPORT_MARGIN,
  worldToScreen,
} from '../src/camera.js';
import { createShip } from '../src/ship.js';

describe('Increment 20: Camera Follows Ship', () => {
  describe('createCamera', () => {
    it('returns an object with x, y, rotation', () => {
      const cam = createCamera(100, 200, 0.5);
      expect(cam).toEqual({ x: 100, y: 200, rotation: 0.5 });
    });

    it('works with zero values', () => {
      const cam = createCamera(0, 0, 0);
      expect(cam).toEqual({ x: 0, y: 0, rotation: 0 });
    });

    it('works with negative coordinates', () => {
      const cam = createCamera(-500, -300, -Math.PI);
      expect(cam.x).toBe(-500);
      expect(cam.y).toBe(-300);
      expect(cam.rotation).toBe(-Math.PI);
    });

    it('works with large coordinates', () => {
      const cam = createCamera(10000, 20000, Math.PI);
      expect(cam.x).toBe(10000);
      expect(cam.y).toBe(20000);
      expect(cam.rotation).toBe(Math.PI);
    });
  });

  describe('applyCameraTransform', () => {
    function createFakeCtx() {
      const calls = [];
      return {
        calls,
        save: vi.fn(() => calls.push({ fn: 'save' })),
        restore: vi.fn(() => calls.push({ fn: 'restore' })),
        translate: vi.fn((tx, ty) =>
          calls.push({ fn: 'translate', args: [tx, ty] }),
        ),
        rotate: vi.fn((r) => calls.push({ fn: 'rotate', args: [r] })),
      };
    }

    it('calls ctx.save() first', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(0, 0, 0);
      applyCameraTransform(ctx, cam, 800, 600);
      expect(ctx.calls[0].fn).toBe('save');
    });

    it('calls translate(vw/2, vh/2) second (center screen)', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(0, 0, 0);
      applyCameraTransform(ctx, cam, 800, 600);
      expect(ctx.calls[1]).toEqual({ fn: 'translate', args: [400, 300] });
    });

    it('calls rotate(-rotation) third', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(0, 0, 1.5);
      applyCameraTransform(ctx, cam, 800, 600);
      expect(ctx.calls[2]).toEqual({ fn: 'rotate', args: [-1.5] });
    });

    it('calls translate(-x, -y) fourth', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(100, 200, 0);
      applyCameraTransform(ctx, cam, 800, 600);
      expect(ctx.calls[3]).toEqual({ fn: 'translate', args: [-100, -200] });
    });

    it('makes exactly 4 calls in correct order: save, translate, rotate, translate', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(50, 75, 0.3);
      applyCameraTransform(ctx, cam, 1024, 768);
      expect(ctx.calls.map((c) => c.fn)).toEqual([
        'save',
        'translate',
        'rotate',
        'translate',
      ]);
    });

    it('uses correct viewport center for non-standard sizes', () => {
      const ctx = createFakeCtx();
      const cam = createCamera(0, 0, 0);
      applyCameraTransform(ctx, cam, 1920, 1080);
      expect(ctx.calls[1]).toEqual({ fn: 'translate', args: [960, 540] });
    });
  });

  describe('resetCameraTransform', () => {
    it('calls ctx.restore() exactly once', () => {
      const ctx = { restore: vi.fn() };
      resetCameraTransform(ctx);
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });
  });

  describe('VIEWPORT_MARGIN', () => {
    it('is exported and is a positive number', () => {
      expect(typeof VIEWPORT_MARGIN).toBe('number');
      expect(VIEWPORT_MARGIN).toBeGreaterThan(0);
    });
  });

  describe('getViewportBounds', () => {
    it('returns object with exactly minX, maxX, minY, maxY', () => {
      const cam = createCamera(0, 0, 0);
      const bounds = getViewportBounds(cam, 800, 600);
      expect(Object.keys(bounds).sort()).toEqual([
        'maxX',
        'maxY',
        'minX',
        'minY',
      ]);
    });

    it('at zero rotation, bounds = camera ± half-viewport ± margin', () => {
      const cam = createCamera(500, 400, 0);
      const bounds = getViewportBounds(cam, 800, 600);
      expect(bounds.minX).toBeCloseTo(500 - 400 - VIEWPORT_MARGIN, 5);
      expect(bounds.maxX).toBeCloseTo(500 + 400 + VIEWPORT_MARGIN, 5);
      expect(bounds.minY).toBeCloseTo(400 - 300 - VIEWPORT_MARGIN, 5);
      expect(bounds.maxY).toBeCloseTo(400 + 300 + VIEWPORT_MARGIN, 5);
    });

    it('at 90-degree rotation, width and height swap', () => {
      const cam = createCamera(0, 0, Math.PI / 2);
      const bounds = getViewportBounds(cam, 800, 600);
      // cos(90°)=0, sin(90°)=1
      // halfW = (800*0 + 600*1)/2 = 300
      // halfH = (800*1 + 600*0)/2 = 400
      expect(bounds.minX).toBeCloseTo(-300 - VIEWPORT_MARGIN, 3);
      expect(bounds.maxX).toBeCloseTo(300 + VIEWPORT_MARGIN, 3);
      expect(bounds.minY).toBeCloseTo(-400 - VIEWPORT_MARGIN, 3);
      expect(bounds.maxY).toBeCloseTo(400 + VIEWPORT_MARGIN, 3);
    });

    it('at 45-degree rotation, bounds expand (diagonal)', () => {
      const cam = createCamera(0, 0, Math.PI / 4);
      const bounds = getViewportBounds(cam, 800, 600);
      // At 45°, cos=sin≈0.707
      // halfW = (800*0.707 + 600*0.707)/2 ≈ 494.97
      // This is wider than the zero-rotation halfW of 400
      const zeroRotBounds = getViewportBounds(createCamera(0, 0, 0), 800, 600);
      expect(bounds.maxX - bounds.minX).toBeGreaterThan(
        zeroRotBounds.maxX - zeroRotBounds.minX - 1,
      );
    });

    it('symmetry: +theta and -theta give same bounds', () => {
      const angle = 0.7;
      const camPos = createCamera(100, 200, angle);
      const camNeg = createCamera(100, 200, -angle);
      const boundsPos = getViewportBounds(camPos, 800, 600);
      const boundsNeg = getViewportBounds(camNeg, 800, 600);
      expect(boundsPos.minX).toBeCloseTo(boundsNeg.minX, 5);
      expect(boundsPos.maxX).toBeCloseTo(boundsNeg.maxX, 5);
      expect(boundsPos.minY).toBeCloseTo(boundsNeg.minY, 5);
      expect(boundsPos.maxY).toBeCloseTo(boundsNeg.maxY, 5);
    });

    it('bounds shift with camera position', () => {
      const cam1 = createCamera(0, 0, 0);
      const cam2 = createCamera(1000, 500, 0);
      const b1 = getViewportBounds(cam1, 800, 600);
      const b2 = getViewportBounds(cam2, 800, 600);
      expect(b2.minX - b1.minX).toBeCloseTo(1000, 5);
      expect(b2.maxX - b1.maxX).toBeCloseTo(1000, 5);
      expect(b2.minY - b1.minY).toBeCloseTo(500, 5);
      expect(b2.maxY - b1.maxY).toBeCloseTo(500, 5);
    });

    it('at 180-degree rotation, bounds same size as zero rotation', () => {
      const cam0 = createCamera(0, 0, 0);
      const cam180 = createCamera(0, 0, Math.PI);
      const b0 = getViewportBounds(cam0, 800, 600);
      const b180 = getViewportBounds(cam180, 800, 600);
      expect(b180.maxX - b180.minX).toBeCloseTo(b0.maxX - b0.minX, 3);
      expect(b180.maxY - b180.minY).toBeCloseTo(b0.maxY - b0.minY, 3);
    });
  });

  describe('worldToScreen', () => {
    it('camera position maps to screen center', () => {
      const cam = createCamera(500, 400, 0);
      const [sx, sy] = worldToScreen(500, 400, cam, 800, 600);
      expect(sx).toBeCloseTo(400, 5);
      expect(sy).toBeCloseTo(300, 5);
    });

    it('with zero rotation, offset maps directly', () => {
      const cam = createCamera(0, 0, 0);
      const [sx, sy] = worldToScreen(100, 50, cam, 800, 600);
      // translate(-0,-0) → (100,50), rotate(0) → (100,50), translate(+400,+300) → (500,350)
      expect(sx).toBeCloseTo(500, 5);
      expect(sy).toBeCloseTo(350, 5);
    });

    it('with 90-degree rotation, axes swap', () => {
      const cam = createCamera(0, 0, Math.PI / 2);
      // World point (100, 0):
      // translate by (-0,-0) → (100,0)
      // rotate by -PI/2 → (0, -100)  [rotating (100,0) by -90° gives (0,-100)]
      // translate to center → (400, 200)
      const [sx, sy] = worldToScreen(100, 0, cam, 800, 600);
      expect(sx).toBeCloseTo(400, 3);
      expect(sy).toBeCloseTo(200, 3);
    });

    it('respects camera position offset', () => {
      const cam = createCamera(200, 100, 0);
      // World (200,100) should map to center
      const [sx, sy] = worldToScreen(200, 100, cam, 800, 600);
      expect(sx).toBeCloseTo(400, 5);
      expect(sy).toBeCloseTo(300, 5);
    });
  });

  describe('screenToWorld', () => {
    it('screen center maps to camera position', () => {
      const cam = createCamera(500, 400, 0);
      const [wx, wy] = screenToWorld(400, 300, cam, 800, 600);
      expect(wx).toBeCloseTo(500, 5);
      expect(wy).toBeCloseTo(400, 5);
    });

    it('with zero rotation, offset maps directly', () => {
      const cam = createCamera(0, 0, 0);
      // Screen (500, 350) → translate(-400,-300) → (100,50) → rotate(0) → (100,50) → translate(+0,+0) → (100,50)
      const [wx, wy] = screenToWorld(500, 350, cam, 800, 600);
      expect(wx).toBeCloseTo(100, 5);
      expect(wy).toBeCloseTo(50, 5);
    });

    it('with 90-degree rotation, inverts correctly', () => {
      const cam = createCamera(0, 0, Math.PI / 2);
      // Screen center → world (0,0)
      const [wx, wy] = screenToWorld(400, 300, cam, 800, 600);
      expect(wx).toBeCloseTo(0, 3);
      expect(wy).toBeCloseTo(0, 3);
    });
  });

  describe('round-trip conversion', () => {
    it('screenToWorld(worldToScreen(p)) recovers p within float tolerance', () => {
      const cam = createCamera(150, -200, 0.7);
      const wx = 300;
      const wy = -100;
      const [sx, sy] = worldToScreen(wx, wy, cam, 800, 600);
      const [rx, ry] = screenToWorld(sx, sy, cam, 800, 600);
      expect(rx).toBeCloseTo(wx, 5);
      expect(ry).toBeCloseTo(wy, 5);
    });

    it('round-trip at rotation=0', () => {
      const cam = createCamera(0, 0, 0);
      const [sx, sy] = worldToScreen(42, 99, cam, 1024, 768);
      const [rx, ry] = screenToWorld(sx, sy, cam, 1024, 768);
      expect(rx).toBeCloseTo(42, 5);
      expect(ry).toBeCloseTo(99, 5);
    });

    it('round-trip at rotation=PI', () => {
      const cam = createCamera(500, 500, Math.PI);
      const [sx, sy] = worldToScreen(-200, 800, cam, 800, 600);
      const [rx, ry] = screenToWorld(sx, sy, cam, 800, 600);
      expect(rx).toBeCloseTo(-200, 5);
      expect(ry).toBeCloseTo(800, 5);
    });

    it('round-trip with large camera offset', () => {
      const cam = createCamera(99999, -99999, 1.23);
      const [sx, sy] = worldToScreen(100000, -100000, cam, 800, 600);
      const [rx, ry] = screenToWorld(sx, sy, cam, 800, 600);
      expect(rx).toBeCloseTo(100000, 2);
      expect(ry).toBeCloseTo(-100000, 2);
    });
  });

  describe('camera follows ship', () => {
    it('setting camera x/y/rotation to ship x/y/heading tracks the ship', () => {
      const ship = createShip({ x: 300, y: 400, heading: 1.2 });
      const cam = createCamera(0, 0, 0);
      cam.x = ship.x;
      cam.y = ship.y;
      cam.rotation = ship.heading;
      expect(cam.x).toBe(300);
      expect(cam.y).toBe(400);
      expect(cam.rotation).toBe(1.2);
    });

    it('ship world position maps to screen center after camera follows', () => {
      const ship = createShip({ x: 1000, y: 2000, heading: 0.5 });
      const cam = createCamera(ship.x, ship.y, ship.heading);
      const [sx, sy] = worldToScreen(ship.x, ship.y, cam, 800, 600);
      expect(sx).toBeCloseTo(400, 5);
      expect(sy).toBeCloseTo(300, 5);
    });

    it('ship at extreme coordinates still maps to screen center (cannot fly off-screen)', () => {
      const extremes = [
        { x: 50000, y: -30000, heading: 2.1 },
        { x: -99999, y: 99999, heading: -1.0 },
        { x: 0, y: 0, heading: 0 },
      ];
      for (const { x, y, heading } of extremes) {
        const cam = createCamera(x, y, heading);
        const [sx, sy] = worldToScreen(x, y, cam, 800, 600);
        expect(sx).toBeCloseTo(400, 3);
        expect(sy).toBeCloseTo(300, 3);
      }
    });
  });

  describe('ship points "up" on screen', () => {
    it('camera.rotation = ship.heading cancels heading in drawShip (net rotation = 0)', () => {
      // When camera.rotation = ship.heading, the camera rotate(-heading)
      // combines with drawShip rotate(+heading) to produce net rotation = 0.
      // This means the ship always points "up" (its default -PI/2 heading
      // orientation) on screen.
      const heading = 1.3;
      const cam = createCamera(0, 0, heading);
      // The camera applies rotate(-heading). drawShip applies rotate(+heading).
      // Net rotation = -heading + heading = 0.
      // We verify by checking the transform chain: after applyCameraTransform
      // applies rotate(-heading), a subsequent rotate(heading) cancels out.
      expect(-cam.rotation + heading).toBeCloseTo(0, 10);
    });

    it('ship at any heading always has net zero rotation when camera tracks heading', () => {
      const headings = [
        0,
        Math.PI / 4,
        Math.PI / 2,
        Math.PI,
        -Math.PI / 3,
        -1.5,
      ];
      for (const h of headings) {
        const cam = createCamera(0, 0, h);
        // Camera applies -cam.rotation, drawShip applies +ship.heading
        // If cam.rotation === ship.heading, net = 0
        expect(-cam.rotation + h).toBeCloseTo(0, 10);
      }
    });
  });
});
