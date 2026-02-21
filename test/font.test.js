import { describe, expect, it, vi } from 'vitest';
import {
  drawVectorText,
  GLYPH_HEIGHT,
  GLYPH_SPACING,
  GLYPH_WIDTH,
  GLYPHS,
} from '../src/font.js';

function mockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
  };
}

describe('Increment 29: Vector Stroke Font', () => {
  describe('GLYPHS', () => {
    it('contains all uppercase letters A-Z', () => {
      for (let c = 65; c <= 90; c++) {
        const ch = String.fromCharCode(c);
        expect(GLYPHS[ch], `missing glyph for '${ch}'`).toBeDefined();
      }
    });

    it('contains digits 0-9', () => {
      for (let d = 0; d <= 9; d++) {
        expect(GLYPHS[String(d)], `missing glyph for '${d}'`).toBeDefined();
      }
    });

    it('contains space glyph', () => {
      expect(GLYPHS[' ']).toBeDefined();
    });

    it('each glyph has at least one polyline', () => {
      for (const [ch, polylines] of Object.entries(GLYPHS)) {
        if (ch === ' ') continue; // space has no strokes
        expect(
          polylines.length,
          `glyph '${ch}' has no polylines`,
        ).toBeGreaterThan(0);
      }
    });

    it('each polyline has at least two points', () => {
      for (const [ch, polylines] of Object.entries(GLYPHS)) {
        if (ch === ' ') continue;
        for (const polyline of polylines) {
          expect(
            polyline.length,
            `glyph '${ch}' polyline too short`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('constants', () => {
    it('GLYPH_WIDTH is 4', () => {
      expect(GLYPH_WIDTH).toBe(4);
    });

    it('GLYPH_HEIGHT is 6', () => {
      expect(GLYPH_HEIGHT).toBe(6);
    });

    it('GLYPH_SPACING is 1', () => {
      expect(GLYPH_SPACING).toBe(1);
    });
  });

  describe('drawVectorText', () => {
    it('calls beginPath/moveTo/lineTo/stroke for a single character', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'A', 100, 100, 4);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws nothing for empty string', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, '', 100, 100, 4);

      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.moveTo).not.toHaveBeenCalled();
      expect(ctx.lineTo).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('centers multi-character text horizontally', () => {
      const ctx = mockCtx();
      const scale = 4;
      const centerX = 200;
      drawVectorText(ctx, 'AB', centerX, 100, scale);

      // Total width: 2 chars * GLYPH_WIDTH * scale + 1 gap * GLYPH_SPACING * scale
      const totalWidth = 2 * GLYPH_WIDTH * scale + 1 * GLYPH_SPACING * scale;
      const startX = centerX - totalWidth / 2;

      // First moveTo should be offset from startX
      const firstMoveX = ctx.moveTo.mock.calls[0][0];
      expect(firstMoveX).toBeGreaterThanOrEqual(startX);
      expect(firstMoveX).toBeLessThan(startX + GLYPH_WIDTH * scale);
    });

    it('skips unknown characters gracefully (no crash)', () => {
      const ctx = mockCtx();
      expect(() => drawVectorText(ctx, '~^&', 100, 100, 4)).not.toThrow();
    });

    it('saves and restores canvas state', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'X', 100, 100, 4);

      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.restore).toHaveBeenCalledTimes(1);
    });

    it('applies custom color option', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'A', 100, 100, 4, { color: '#FF0000' });

      expect(ctx.strokeStyle).toBe('#FF0000');
    });

    it('applies custom alpha option', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'A', 100, 100, 4, { alpha: 0.5 });

      expect(ctx.globalAlpha).toBe(0.5);
    });

    it('applies custom lineWidth option', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'A', 100, 100, 4, { lineWidth: 3 });

      expect(ctx.lineWidth).toBe(3);
    });

    it('defaults to white color, alpha 1.0, lineWidth 1.5', () => {
      const ctx = mockCtx();
      drawVectorText(ctx, 'A', 100, 100, 4);

      expect(ctx.strokeStyle).toBe('#FFFFFF');
      expect(ctx.globalAlpha).toBe(1.0);
      expect(ctx.lineWidth).toBe(1.5);
    });

    it('converts lowercase to uppercase for rendering', () => {
      const ctx = mockCtx();
      const ctxUpper = mockCtx();
      drawVectorText(ctx, 'a', 100, 100, 4);
      drawVectorText(ctxUpper, 'A', 100, 100, 4);

      expect(ctx.moveTo.mock.calls).toEqual(ctxUpper.moveTo.mock.calls);
      expect(ctx.lineTo.mock.calls).toEqual(ctxUpper.lineTo.mock.calls);
    });
  });
});
