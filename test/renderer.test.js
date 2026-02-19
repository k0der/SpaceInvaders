import { describe, it, expect, vi } from 'vitest';
import { setupHiDPICanvas } from '../src/renderer.js';

describe('Increment 16: HiDPI Support', () => {

  describe('setupHiDPICanvas', () => {
    function createMockCanvas() {
      return {
        width: 0,
        height: 0,
        style: { width: '', height: '' },
      };
    }

    function createMockCtx() {
      return {
        scale: vi.fn(),
        setTransform: vi.fn(),
      };
    }

    it('sets canvas internal resolution to CSS size × dpr', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      setupHiDPICanvas(canvas, ctx, 1920, 1080, 2);
      expect(canvas.width).toBe(3840);
      expect(canvas.height).toBe(2160);
    });

    it('sets canvas CSS size to match viewport dimensions', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      setupHiDPICanvas(canvas, ctx, 1920, 1080, 2);
      expect(canvas.style.width).toBe('1920px');
      expect(canvas.style.height).toBe('1080px');
    });

    it('scales context by dpr so drawing uses CSS coordinates', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      setupHiDPICanvas(canvas, ctx, 1920, 1080, 2);
      expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    });

    it('returns CSS dimensions (not internal resolution) as logical size', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      const size = setupHiDPICanvas(canvas, ctx, 800, 600, 3);
      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });

    it('works correctly with dpr=1 (non-retina displays)', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      setupHiDPICanvas(canvas, ctx, 800, 600, 1);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    });

    it('handles fractional dpr values (e.g. 1.5)', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      setupHiDPICanvas(canvas, ctx, 800, 600, 1.5);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });

    it('resets transform before applying scale (prevents stacking on resize)', () => {
      const canvas = createMockCanvas();
      const ctx = createMockCtx();
      // First call
      setupHiDPICanvas(canvas, ctx, 800, 600, 2);
      // Second call (resize)
      setupHiDPICanvas(canvas, ctx, 1024, 768, 2);
      // setTransform resets completely, so scale never stacks
      expect(ctx.setTransform).toHaveBeenCalledTimes(2);
      expect(ctx.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    });
  });
});
