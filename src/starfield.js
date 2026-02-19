/**
 * Create a single star with random position, size, and brightness.
 */
export function createStar(canvasWidth, canvasHeight, options = {}) {
  const minSize = options.minSize ?? 1;
  const maxSize = options.maxSize ?? 2;
  const minBrightness = options.minBrightness ?? 0.3;
  const maxBrightness = options.maxBrightness ?? 1.0;

  const brightness = minBrightness + Math.random() * (maxBrightness - minBrightness);

  const star = {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    size: minSize + Math.random() * (maxSize - minSize),
    brightness,
  };

  if (options.twinkle) {
    star.twinklePhase = Math.random() * Math.PI * 2;
    star.twinkleFreq = 0.3 + Math.random() * 2.7;           // 0.3–3.0 Hz
    star.twinkleAmplitude = brightness * (0.1 + Math.random() * 0.2); // 10–30% of base
  }

  return star;
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
 * Compute the effective brightness of a star at a given elapsed time.
 * Stars without twinkle properties return their base brightness.
 * Formula: base + amplitude * sin(time * freq * 2π + phase), clamped to [0, 1].
 */
export function applyTwinkle(star, elapsedTime) {
  if (star.twinklePhase == null) return star.brightness;
  const value = star.brightness + star.twinkleAmplitude * Math.sin(elapsedTime * star.twinkleFreq * Math.PI * 2 + star.twinklePhase);
  return Math.min(1.0, Math.max(0, value));
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
    // Use midpoint of speed range for interpolated layers to guarantee monotonic ordering;
    // the 3-layer preset path already has non-overlapping ranges so random is fine there.
    const speed = (layerCount === 3 && i < 3)
      ? preset.minSpeed + Math.random() * (preset.maxSpeed - preset.minSpeed)
      : (preset.minSpeed + preset.maxSpeed) / 2;

    const isNearLayer = (i === layerCount - 1) && layerCount > 1;

    layers.push(createStarLayer(count, canvasWidth, canvasHeight, {
      speed,
      minSize: preset.minSize,
      maxSize: preset.maxSize,
      minBrightness: preset.minBrightness,
      maxBrightness: preset.maxBrightness,
      twinkle: !isNearLayer,
    }));
  }
  return layers;
}

/**
 * Update a star layer with a configurable direction.
 * Directions: 'left', 'right', 'up', 'down', 'radial'.
 */
export function updateStarLayerDirectional(layer, dt, canvasWidth, canvasHeight, direction) {
  const delta = layer.speed * dt;
  if (delta === 0) return;

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  for (const star of layer.stars) {
    if (direction === 'radial') {
      let dx = star.x - cx;
      let dy = star.y - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.01) {
        // Star at exact center — assign a random angle to push it outward
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        dx /= dist;
        dy /= dist;
      }

      star.x += dx * delta;
      star.y += dy * delta;

      // Recycle if outside canvas
      if (star.x < 0 || star.x > canvasWidth || star.y < 0 || star.y > canvasHeight) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = Math.random() * 50;
        star.x = cx + Math.cos(angle) * spawnDist;
        star.y = cy + Math.sin(angle) * spawnDist;
      }
    } else if (direction === 'right') {
      star.x += delta;
      if (star.x > canvasWidth) {
        star.x = star.x - canvasWidth;
        star.y = Math.random() * canvasHeight;
      }
    } else if (direction === 'up') {
      star.y -= delta;
      if (star.y < 0) {
        star.y = canvasHeight + star.y;
        star.x = Math.random() * canvasWidth;
      }
    } else if (direction === 'down') {
      star.y += delta;
      if (star.y > canvasHeight) {
        star.y = star.y - canvasHeight;
        star.x = Math.random() * canvasWidth;
      }
    } else {
      // 'left' (default)
      star.x -= delta;
      if (star.x < 0) {
        star.x = canvasWidth + star.x;
        star.y = Math.random() * canvasHeight;
      }
    }
  }
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
export function drawParallaxLayers(ctx, layers, elapsedTime = 0) {
  for (const layer of layers) {
    drawStarLayer(ctx, layer, elapsedTime);
  }
}

/**
 * Draw a star layer onto a canvas 2D context.
 */
export function drawStarLayer(ctx, layer, elapsedTime = 0) {
  for (const star of layer.stars) {
    const brightness = applyTwinkle(star, elapsedTime);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(
      star.x,
      star.y,
      star.size,
      star.size,
    );
  }
}
