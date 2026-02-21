/** Grid width per glyph (units). */
export const GLYPH_WIDTH = 4;

/** Grid height per glyph (units). */
export const GLYPH_HEIGHT = 6;

/** Spacing between characters (grid units). */
export const GLYPH_SPACING = 1;

/**
 * Vector glyph data — each character is an array of polylines.
 * Each polyline is an array of [x, y] points on a 4-wide × 6-tall grid.
 * Drawn as connected line segments matching the wireframe aesthetic.
 */
export const GLYPHS = {
  A: [
    [
      [0, 6],
      [0, 2],
      [2, 0],
      [4, 2],
      [4, 6],
    ],
    [
      [0, 4],
      [4, 4],
    ],
  ],
  B: [
    [
      [0, 6],
      [0, 0],
      [3, 0],
      [4, 1],
      [3, 3],
      [0, 3],
    ],
    [
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [0, 6],
    ],
  ],
  C: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
    ],
  ],
  D: [
    [
      [0, 0],
      [0, 6],
      [3, 6],
      [4, 5],
      [4, 1],
      [3, 0],
      [0, 0],
    ],
  ],
  E: [
    [
      [4, 0],
      [0, 0],
      [0, 6],
      [4, 6],
    ],
    [
      [0, 3],
      [3, 3],
    ],
  ],
  F: [
    [
      [4, 0],
      [0, 0],
      [0, 6],
    ],
    [
      [0, 3],
      [3, 3],
    ],
  ],
  G: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 3],
      [2, 3],
    ],
  ],
  H: [
    [
      [0, 0],
      [0, 6],
    ],
    [
      [4, 0],
      [4, 6],
    ],
    [
      [0, 3],
      [4, 3],
    ],
  ],
  I: [
    [
      [1, 0],
      [3, 0],
    ],
    [
      [2, 0],
      [2, 6],
    ],
    [
      [1, 6],
      [3, 6],
    ],
  ],
  J: [
    [
      [1, 0],
      [4, 0],
    ],
    [
      [3, 0],
      [3, 5],
      [2, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  K: [
    [
      [0, 0],
      [0, 6],
    ],
    [
      [4, 0],
      [0, 3],
      [4, 6],
    ],
  ],
  L: [
    [
      [0, 0],
      [0, 6],
      [4, 6],
    ],
  ],
  M: [
    [
      [0, 6],
      [0, 0],
      [2, 3],
      [4, 0],
      [4, 6],
    ],
  ],
  N: [
    [
      [0, 6],
      [0, 0],
      [4, 6],
      [4, 0],
    ],
  ],
  O: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
  ],
  P: [
    [
      [0, 6],
      [0, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [0, 3],
    ],
  ],
  Q: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
    [
      [3, 5],
      [4, 6],
    ],
  ],
  R: [
    [
      [0, 6],
      [0, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [0, 3],
    ],
    [
      [2, 3],
      [4, 6],
    ],
  ],
  S: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 2],
      [1, 3],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  T: [
    [
      [0, 0],
      [4, 0],
    ],
    [
      [2, 0],
      [2, 6],
    ],
  ],
  U: [
    [
      [0, 0],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 0],
    ],
  ],
  V: [
    [
      [0, 0],
      [2, 6],
      [4, 0],
    ],
  ],
  W: [
    [
      [0, 0],
      [0, 6],
      [2, 4],
      [4, 6],
      [4, 0],
    ],
  ],
  X: [
    [
      [0, 0],
      [4, 6],
    ],
    [
      [4, 0],
      [0, 6],
    ],
  ],
  Y: [
    [
      [0, 0],
      [2, 3],
      [4, 0],
    ],
    [
      [2, 3],
      [2, 6],
    ],
  ],
  Z: [
    [
      [0, 0],
      [4, 0],
      [0, 6],
      [4, 6],
    ],
  ],
  0: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
    [
      [0, 5],
      [4, 1],
    ],
  ],
  1: [
    [
      [1, 1],
      [2, 0],
      [2, 6],
    ],
    [
      [1, 6],
      [3, 6],
    ],
  ],
  2: [
    [
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [0, 6],
      [4, 6],
    ],
  ],
  3: [
    [
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
    [
      [2, 3],
      [3, 3],
    ],
  ],
  4: [
    [
      [0, 0],
      [0, 3],
      [4, 3],
    ],
    [
      [4, 0],
      [4, 6],
    ],
  ],
  5: [
    [
      [4, 0],
      [0, 0],
      [0, 3],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  6: [
    [
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 4],
      [3, 3],
      [0, 3],
    ],
  ],
  7: [
    [
      [0, 0],
      [4, 0],
      [2, 6],
    ],
  ],
  8: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [1, 3],
      [0, 2],
      [0, 1],
      [1, 0],
    ],
    [
      [1, 3],
      [0, 4],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 4],
      [3, 3],
    ],
  ],
  9: [
    [
      [4, 3],
      [1, 3],
      [0, 2],
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
    ],
  ],
  ' ': [],
  '.': [
    [
      [2, 5],
      [2, 6],
    ],
  ],
  '!': [
    [
      [2, 0],
      [2, 4],
    ],
    [
      [2, 5.5],
      [2, 6],
    ],
  ],
  ':': [
    [
      [2, 1],
      [2, 2],
    ],
    [
      [2, 4],
      [2, 5],
    ],
  ],
};

/**
 * Draw vector-stroked text centered at (centerX, centerY).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} centerX - horizontal center of the text
 * @param {number} centerY - vertical center of the text
 * @param {number} scale - pixel size per grid unit
 * @param {object} [options]
 * @param {string} [options.color='#FFFFFF']
 * @param {number} [options.lineWidth=1.5]
 * @param {number} [options.alpha=1.0]
 */
export function drawVectorText(
  ctx,
  text,
  centerX,
  centerY,
  scale,
  options = {},
) {
  const upper = text.toUpperCase();
  if (upper.length === 0) return;

  const { color = '#FFFFFF', lineWidth = 1.5, alpha = 1.0 } = options;

  const charWidth = GLYPH_WIDTH * scale;
  const charHeight = GLYPH_HEIGHT * scale;
  const gap = GLYPH_SPACING * scale;
  const totalWidth = upper.length * charWidth + (upper.length - 1) * gap;
  const startX = centerX - totalWidth / 2;
  const startY = centerY - charHeight / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const polylines = GLYPHS[ch];
    if (!polylines) continue;

    const ox = startX + i * (charWidth + gap);

    for (const polyline of polylines) {
      ctx.beginPath();
      for (let p = 0; p < polyline.length; p++) {
        const px = ox + polyline[p][0] * scale;
        const py = startY + polyline[p][1] * scale;
        if (p === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}
