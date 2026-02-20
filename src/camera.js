/** Padding margin around viewport bounds for spawn/despawn tolerance. */
export const VIEWPORT_MARGIN = 100;

/**
 * Create a camera state object.
 */
export function createCamera(x, y, rotation) {
  return { x, y, rotation };
}

/**
 * Apply camera transform to a canvas context.
 * Saves context, then applies: translate to screen center →
 * rotate by -rotation → translate by (-x, -y).
 */
export function applyCameraTransform(ctx, camera, viewportW, viewportH) {
  ctx.save();
  ctx.translate(viewportW / 2, viewportH / 2);
  ctx.rotate(-camera.rotation);
  ctx.translate(-camera.x, -camera.y);
}

/**
 * Reset camera transform by restoring the saved context.
 */
export function resetCameraTransform(ctx) {
  ctx.restore();
}

/**
 * Compute the axis-aligned bounding box of the rotated viewport in world-space.
 * Returns { minX, maxX, minY, maxY } with VIEWPORT_MARGIN padding.
 */
export function getViewportBounds(camera, viewportW, viewportH) {
  const cosA = Math.abs(Math.cos(camera.rotation));
  const sinA = Math.abs(Math.sin(camera.rotation));
  const halfW = (viewportW * cosA + viewportH * sinA) / 2;
  const halfH = (viewportW * sinA + viewportH * cosA) / 2;
  return {
    minX: camera.x - halfW - VIEWPORT_MARGIN,
    maxX: camera.x + halfW + VIEWPORT_MARGIN,
    minY: camera.y - halfH - VIEWPORT_MARGIN,
    maxY: camera.y + halfH + VIEWPORT_MARGIN,
  };
}

/**
 * Convert a world-space coordinate to screen-space.
 * Returns [screenX, screenY].
 */
export function worldToScreen(wx, wy, camera, viewportW, viewportH) {
  // Translate by (-camera.x, -camera.y)
  const dx = wx - camera.x;
  const dy = wy - camera.y;
  // Rotate by -camera.rotation
  const cosR = Math.cos(-camera.rotation);
  const sinR = Math.sin(-camera.rotation);
  const rx = dx * cosR - dy * sinR;
  const ry = dx * sinR + dy * cosR;
  // Translate to screen center
  return [rx + viewportW / 2, ry + viewportH / 2];
}

/**
 * Convert a screen-space coordinate to world-space.
 * Returns [worldX, worldY]. Inverse of worldToScreen.
 */
export function screenToWorld(sx, sy, camera, viewportW, viewportH) {
  // Reverse translate from screen center
  const cx = sx - viewportW / 2;
  const cy = sy - viewportH / 2;
  // Reverse rotate (rotate by +camera.rotation)
  const cosR = Math.cos(camera.rotation);
  const sinR = Math.sin(camera.rotation);
  const rx = cx * cosR - cy * sinR;
  const ry = cx * sinR + cy * cosR;
  // Reverse translate
  return [rx + camera.x, ry + camera.y];
}
