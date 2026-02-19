/**
 * Set up a canvas for HiDPI rendering.
 * Sets internal resolution to CSS size × dpr, applies CSS size,
 * and scales the context so all drawing uses CSS (logical) coordinates.
 * Returns the logical size { width, height } for use by game systems.
 */
export function setupHiDPICanvas(canvas, ctx, cssWidth, cssHeight, dpr) {
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssWidth, height: cssHeight };
}
