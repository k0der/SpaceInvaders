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

// Layer presets for the default 3-layer parallax (far, mid, near).
// Base star counts are calibrated for 1920×1080; scaled by canvas area ratio.
const LAYER_PRESETS = [
  { baseCount: 100, minSize: 1, maxSize: 1, minBrightness: 0.3, maxBrightness: 0.5, minSpeed: 2, maxSpeed: 5 },
  { baseCount: 60,  minSize: 1, maxSize: 2, minBrightness: 0.5, maxBrightness: 0.7, minSpeed: 8, maxSpeed: 15 },
  { baseCount: 30,  minSize: 2, maxSize: 3, minBrightness: 0.7, maxBrightness: 1.0, minSpeed: 20, maxSpeed: 35 },
];

/**
 * Linearly interpolate between a and b by factor t (0–1).
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Create parallax star layers. Default is 3 (far, mid, near).
 * Extra layers interpolate properties between far and near presets.
 */
export function createParallaxLayers(canvasWidth, canvasHeight, layerCount = 3) {
  const baseArea = 1920 * 1080;
  const areaRatio = (canvasWidth * canvasHeight) / baseArea;
  const far = LAYER_PRESETS[0];
  const near = LAYER_PRESETS[2];

  const layers = [];
  for (let i = 0; i < layerCount; i++) {
    const t = layerCount === 1 ? 0 : i / (layerCount - 1);

    let preset;
    if (layerCount === 3 && i < 3) {
      preset = LAYER_PRESETS[i];
    } else {
      preset = {
        baseCount: Math.round(lerp(far.baseCount, near.baseCount, t)),
        minSize: lerp(far.minSize, near.minSize, t),
        maxSize: lerp(far.maxSize, near.maxSize, t),
        minBrightness: lerp(far.minBrightness, near.minBrightness, t),
        maxBrightness: lerp(far.maxBrightness, near.maxBrightness, t),
        minSpeed: lerp(far.minSpeed, near.minSpeed, t),
        maxSpeed: lerp(far.maxSpeed, near.maxSpeed, t),
      };
    }

    const count = Math.max(1, Math.round(preset.baseCount * areaRatio));
    const speed = preset.minSpeed + Math.random() * (preset.maxSpeed - preset.minSpeed);

    layers.push(createStarLayer(count, canvasWidth, canvasHeight, {
      speed,
      minSize: preset.minSize,
      maxSize: preset.maxSize,
      minBrightness: preset.minBrightness,
      maxBrightness: preset.maxBrightness,
    }));
  }
  return layers;
}

/**
 * Update all parallax layers.
 */
export function updateParallaxLayers(layers, dt, canvasWidth, canvasHeight) {
  for (const layer of layers) {
    updateStarLayer(layer, dt, canvasWidth, canvasHeight);
  }
}

/**
 * Draw all parallax layers (far to near, back to front).
 */
export function drawParallaxLayers(ctx, layers) {
  for (const layer of layers) {
    drawStarLayer(ctx, layer);
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
