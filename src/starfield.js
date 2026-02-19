/**
 * Create a single star with random position, size, and brightness.
 */
export function createStar(canvasWidth, canvasHeight, options = {}) {
  const minSize = options.minSize ?? 1;
  const maxSize = options.maxSize ?? 2;
  const minBrightness = options.minBrightness ?? 0.3;
  const maxBrightness = options.maxBrightness ?? 1.0;

  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    size: minSize + Math.random() * (maxSize - minSize),
    brightness: minBrightness + Math.random() * (maxBrightness - minBrightness),
  };
}

/**
 * Create a star layer: a collection of stars that scroll together at a given speed.
 */
export function createStarLayer(count, canvasWidth, canvasHeight, options = {}) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push(createStar(canvasWidth, canvasHeight, options));
  }
  return {
    stars,
    speed: options.speed ?? 10,
  };
}

/**
 * Update a star layer: move all stars leftward by speed * dt.
 * Stars that exit the left edge wrap to the right edge with a new random y.
 */
export function updateStarLayer(layer, dt, canvasWidth, canvasHeight) {
  const dx = layer.speed * dt;
  for (const star of layer.stars) {
    star.x -= dx;
    if (star.x < 0) {
      star.x = canvasWidth + star.x;
      star.y = Math.random() * canvasHeight;
    }
  }
}

/**
 * Draw a star layer onto a canvas 2D context.
 */
export function drawStarLayer(ctx, layer) {
  for (const star of layer.stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fillRect(
      Math.round(star.x),
      Math.round(star.y),
      star.size,
      star.size,
    );
  }
}
