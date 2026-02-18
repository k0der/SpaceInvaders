# Asteroid Screensaver — Incremental Build Plan (TDD)

## Approach

- **Test framework**: Vitest + happy-dom
- **Code structure**: ES modules in `src/` for testability, `build.js` merges into single `index.html`
- **Workflow**: Write failing tests (RED) → implement until tests pass (GREEN) → refactor
- **Each increment** is a small, independently testable capability

---

## Increment 1: Project Scaffolding

**Goal**: Set up the project structure, test runner, and a skeleton HTML page with a black fullscreen canvas.

**Tasks**:
- Initialize `package.json` with Vitest as dev dependency
- Create `vitest.config.js`
- Create `dev.html` with fullscreen black canvas
- Create `src/` and `test/` directories
- Create `build.js` that concatenates modules into `index.html`

**Acceptance Criteria**:
- [ ] `npm test` runs and exits cleanly (even with zero tests)
- [ ] `dev.html` opens in browser showing a fullscreen black canvas with no scrollbars
- [ ] Canvas resizes when browser window resizes
- [ ] `node build.js` produces a standalone `index.html` that works identically

---

## Increment 2: Vector Math Utilities

**Goal**: Pure math functions used by physics and movement systems.

**Module**: `src/math.js`

**Functions**:
- `distance(x1, y1, x2, y2)` → number
- `dot(x1, y1, x2, y2)` → number
- `normalize(x, y)` → `{x, y}`
- `magnitude(x, y)` → number
- `randomRange(min, max)` → number
- `clamp(value, min, max)` → number

**Acceptance Criteria**:
- [ ] `distance(0, 0, 3, 4)` returns `5`
- [ ] `distance(0, 0, 0, 0)` returns `0`
- [ ] `dot(1, 0, 0, 1)` returns `0` (perpendicular)
- [ ] `dot(1, 0, 1, 0)` returns `1` (parallel)
- [ ] `normalize(3, 4)` returns a vector with magnitude `1` (within float tolerance)
- [ ] `normalize(0, 0)` returns `{x: 0, y: 0}` without NaN
- [ ] `magnitude(3, 4)` returns `5`
- [ ] `randomRange(10, 20)` always returns a value in `[10, 20]` (run 100 times)
- [ ] `clamp(5, 0, 10)` returns `5`; `clamp(-1, 0, 10)` returns `0`; `clamp(15, 0, 10)` returns `10`

---

## Increment 3: Asteroid Shape Generation

**Goal**: Generate random irregular polygon vertices for an asteroid.

**Module**: `src/asteroid.js`

**Function**: `generateShape(radius, vertexCount?)` → `Array<{x, y}>`

**Acceptance Criteria**:
- [ ] Returns an array of 8–14 points when `vertexCount` is not specified
- [ ] Returns exactly `N` points when `vertexCount = N` is specified
- [ ] Every vertex is within the range `[radius * 0.6, radius * 1.0]` from origin
- [ ] Vertices are ordered angularly (walking clockwise or counter-clockwise around origin)
- [ ] Two calls with the same radius produce different shapes (randomness)
- [ ] Works for radius values 10, 50, and 80 without error

---

## Increment 4: Asteroid Creation with Size Classes

**Goal**: Factory function that creates a complete asteroid data object with proper speed/size ranges.

**Module**: `src/asteroid.js`

**Function**: `createAsteroid(x, y, sizeClass)` → asteroid object

**Asteroid object shape**:
```js
{ x, y, radius, vx, vy, rotation, angularVelocity, shape, sizeClass, strokeWidth }
```

**Acceptance Criteria**:
- [ ] `createAsteroid(100, 200, 'large')` produces `radius` in `[50, 80]`
- [ ] `createAsteroid(100, 200, 'medium')` produces `radius` in `[25, 49]`
- [ ] `createAsteroid(100, 200, 'small')` produces `radius` in `[10, 24]`
- [ ] Speed (magnitude of `vx, vy`) for large is in `[15, 30]`
- [ ] Speed for medium is in `[30, 60]`
- [ ] Speed for small is in `[60, 120]`
- [ ] `strokeWidth` is `2.0` for large, `1.5` for medium, `1.0` for small
- [ ] `angularVelocity` magnitude is smaller for larger asteroids than for smaller ones (on average over 50 samples)
- [ ] `shape` is a valid vertex array (non-empty, all points are objects with x,y)
- [ ] `rotation` starts at `0`

---

## Increment 5: Asteroid Position Update

**Goal**: Move an asteroid by its velocity, rotate by angular velocity, scaled by delta time.

**Module**: `src/asteroid.js`

**Function**: `updateAsteroid(asteroid, deltaTime)` → updated asteroid

**Acceptance Criteria**:
- [ ] After update with `dt=1.0`, position changes by exactly `(vx, vy)`
- [ ] After update with `dt=0.5`, position changes by half of `(vx, vy)`
- [ ] Rotation increases by `angularVelocity * dt`
- [ ] Original asteroid object is not mutated (returns new object)
- [ ] With `dt=0`, position and rotation are unchanged

---

## Increment 6: Off-Screen Detection

**Goal**: Determine if an asteroid has fully left the visible canvas area.

**Module**: `src/asteroid.js`

**Function**: `isOffScreen(asteroid, canvasWidth, canvasHeight, margin?)` → boolean

**Acceptance Criteria**:
- [ ] Asteroid at center of screen → `false`
- [ ] Asteroid at `x = -200, radius = 50` with default margin → `true` (fully off left)
- [ ] Asteroid at `x = -50, radius = 50` with default margin → `false` (partially visible)
- [ ] Works correctly for all four edges (left, right, top, bottom)
- [ ] Custom margin value is respected
- [ ] Asteroid exactly at boundary (edge case) → `false` (not yet fully off)

---

## Increment 7: Edge Spawning

**Goal**: Spawn new asteroids just outside a random screen edge, aimed inward.

**Module**: `src/asteroid.js`

**Function**: `spawnFromEdge(canvasWidth, canvasHeight)` → asteroid

**Acceptance Criteria**:
- [ ] Spawned asteroid's position is outside the visible canvas area
- [ ] Velocity vector points generally toward the canvas interior (dot product with inward normal > 0)
- [ ] Trajectory has angular spread: over 100 spawns from the same edge, direction angles vary by at least 30°
- [ ] Size class distribution over 1000 spawns: large ~20% (±5%), medium ~40% (±5%), small ~40% (±5%)
- [ ] Spawns from all four edges over many calls (not biased to one edge)

---

## Increment 8: Spawn Manager

**Goal**: Maintain a target asteroid count by spawning/removing asteroids over time.

**Module**: `src/simulation.js`

**Functions**:
- `createSimulation(canvasWidth, canvasHeight, targetCount)` → simulation state
- `updateSimulation(state, deltaTime)` → updated state

**Acceptance Criteria**:
- [ ] Initial state has 0 asteroids (they spawn in over time, not all at once)
- [ ] After enough updates, asteroid count approaches `targetCount` (within ±2)
- [ ] Spawning is staggered: no more than 1 asteroid spawns per 0.3 seconds
- [ ] Off-screen asteroids are removed after each update
- [ ] Changing `targetCount` upward causes new spawns to begin
- [ ] Changing `targetCount` downward stops spawning; excess asteroids drift off naturally (count decreases over time as they leave)
- [ ] With `targetCount = 0`, no new asteroids spawn

---

## Increment 9: Collision Detection

**Goal**: Detect pairs of asteroids whose bounding circles overlap.

**Module**: `src/physics.js`

**Function**: `detectCollisions(asteroids)` → `Array<[indexA, indexB]>`

**Acceptance Criteria**:
- [ ] Two overlapping asteroids are returned as a colliding pair
- [ ] Two non-overlapping asteroids return empty array
- [ ] Exactly touching (distance = r1 + r2) does NOT count as collision (must overlap)
- [ ] With 3 asteroids where A overlaps B and B overlaps C but not A↔C, returns `[[0,1], [1,2]]`
- [ ] Empty asteroid array returns empty collision list
- [ ] Single asteroid returns empty collision list
- [ ] No duplicate pairs (each pair reported once)

---

## Increment 10: Elastic Collision Response

**Goal**: Resolve collisions with elastic physics, conserving momentum and energy.

**Module**: `src/physics.js`

**Functions**:
- `resolveCollision(asteroidA, asteroidB)` → `{a: updatedA, b: updatedB}`
- `separateOverlap(asteroidA, asteroidB)` → `{a: updatedA, b: updatedB}`

**Acceptance Criteria**:
- [ ] **Momentum conservation**: total momentum before = total momentum after (within 1% tolerance), where mass = radius²
- [ ] **Energy conservation**: total kinetic energy before = total kinetic energy after (within 2% tolerance, accounting for random perturbation)
- [ ] **Large vs small**: large asteroid barely changes velocity; small asteroid ricochets significantly
- [ ] **Head-on equal**: two identical asteroids in head-on collision swap velocities (approximately)
- [ ] **Separation**: after `separateOverlap`, distance between centers ≥ sum of radii
- [ ] **Separation is proportional to mass**: lighter asteroid is pushed more
- [ ] Post-collision velocities include a small random perturbation (not perfectly deterministic for same inputs run twice)
- [ ] Angular velocities are nudged slightly after collision

---

## Increment 11: Collision Cooldown

**Goal**: Prevent the same pair from colliding again within 0.3 seconds.

**Module**: `src/physics.js`

**Function**: `createCollisionTracker()` → tracker object with `canCollide(idA, idB)`, `recordCollision(idA, idB)`, `update(deltaTime)` methods

**Acceptance Criteria**:
- [ ] First collision between pair A,B → `canCollide` returns `true`
- [ ] Immediately after recording collision → `canCollide(A,B)` returns `false`
- [ ] After 0.3s of updates → `canCollide(A,B)` returns `true` again
- [ ] `canCollide(A,B)` and `canCollide(B,A)` give the same result (order-independent)
- [ ] Cooldowns for different pairs are independent
- [ ] Old entries are cleaned up (no memory leak over time)

---

## Increment 12: Starfield — Layer Creation & Scrolling

**Goal**: Create parallax star layers with proper density, sizing, and scrolling.

**Module**: `src/starfield.js`

**Functions**:
- `createStarLayer(layerIndex, totalLayers, canvasWidth, canvasHeight)` → layer object with stars array
- `updateStarLayer(layer, deltaTime, canvasWidth, canvasHeight)` → updated layer

**Acceptance Criteria**:
- [ ] Far layer (index 0) has more stars than near layer
- [ ] Far layer stars have smaller size (1px) than near layer (2-3px)
- [ ] Far layer scrolls slower than near layer
- [ ] Stars are distributed randomly across the full canvas area
- [ ] After update, all star x-positions have shifted by `scrollSpeed * dt`
- [ ] Stars that exit the left edge reappear on the right with a new random y-position
- [ ] Star brightness is lower for far layers, higher for near layers

---

## Increment 13: Starfield — Twinkling

**Goal**: Stars subtly oscillate in brightness over time.

**Module**: `src/starfield.js`

**Function**: `updateTwinkle(star, time)` → current brightness

**Acceptance Criteria**:
- [ ] Brightness oscillates sinusoidally over time
- [ ] Amplitude is 10–20% of base brightness
- [ ] Frequency is between 0.5 and 2.0 Hz per star
- [ ] Different stars have different phases (not all twinkling in sync)
- [ ] Near-layer stars do NOT twinkle (steady brightness)
- [ ] Brightness never goes below 0 or above 1

---

## Increment 14: Renderer — Canvas Setup & Asteroid Drawing

**Goal**: Draw asteroids as white wireframe polygons on black canvas.

**Module**: `src/renderer.js`

**Note**: Renderer tests are lighter — they verify that draw calls happen with correct parameters, not pixel output. Use a mock canvas context.

**Acceptance Criteria**:
- [ ] Canvas is cleared to black (`#000000`) each frame
- [ ] Each asteroid's shape is drawn as a closed polygon (beginPath, moveTo, lineTo..., closePath, stroke)
- [ ] Stroke color is white (`#FFFFFF`)
- [ ] Stroke width matches asteroid's `strokeWidth` property
- [ ] Canvas transform applies translation to (x, y) and rotation before drawing shape
- [ ] Canvas state is saved/restored around each asteroid draw (no transform leaking)

---

## Increment 15: Renderer — Star Drawing

**Goal**: Draw stars as small dots with appropriate brightness per layer.

**Module**: `src/renderer.js`

**Acceptance Criteria**:
- [ ] Stars are drawn as filled arcs (circles)
- [ ] Fill color uses correct alpha for brightness
- [ ] Star layers are drawn back-to-front (far layer first)
- [ ] Star size matches layer configuration (1px for far, 2-3px for near)

---

## Increment 16: Settings Menu — Gear Icon & Panel

**Goal**: Gear icon in corner that opens a settings panel with 3 sliders.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [ ] Gear icon renders in the bottom-right corner
- [ ] Gear icon has low opacity (~30%) by default
- [ ] Gear icon brightens on hover (~80%)
- [ ] Clicking gear opens a translucent settings panel
- [ ] Panel contains 3 labeled sliders: Asteroid Count, Speed Multiplier, Star Layers
- [ ] Slider ranges: count [5–50], speed [0.2–3.0], layers [3–6]
- [ ] Default values: count=20, speed=1.0, layers=3
- [ ] Moving a slider fires a callback with the new value immediately
- [ ] Pressing Escape closes the panel
- [ ] Panel auto-hides after 4 seconds of no mouse activity over it
- [ ] Gear icon auto-hides after 3 seconds of no mouse movement; reappears on mouse move

---

## Increment 17: Settings Persistence (localStorage)

**Goal**: Settings survive page reload.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [ ] On slider change, new value is written to `localStorage`
- [ ] On page load, settings are read from `localStorage` if present
- [ ] If `localStorage` is empty or corrupt, defaults are used gracefully
- [ ] All 3 settings are persisted independently
- [ ] Slider positions reflect loaded values on startup

---

## Increment 18: HiDPI / Retina Support

**Goal**: Crisp lines on high-DPI displays.

**Module**: `src/renderer.js`

**Acceptance Criteria**:
- [ ] Canvas `width`/`height` attributes are multiplied by `devicePixelRatio`
- [ ] Canvas CSS size remains at `100vw × 100vh`
- [ ] Canvas context is scaled by `devicePixelRatio`
- [ ] Lines appear crisp (not blurry) on a 2x display

---

## Increment 19: Main Loop Integration

**Goal**: Wire everything together into a working animation.

**Module**: `src/main.js`

**Acceptance Criteria**:
- [ ] Animation runs at ~60fps using `requestAnimationFrame`
- [ ] Delta time is calculated correctly between frames
- [ ] Stars scroll with parallax effect (visual verification)
- [ ] Asteroids drift across screen, rotating
- [ ] Asteroids bounce off each other on collision
- [ ] New asteroids spawn as old ones drift off
- [ ] Settings sliders adjust behavior in real-time
- [ ] Window resize is handled without breaking the animation
- [ ] No memory leaks: asteroid and star counts stay bounded over 5+ minutes

---

## Increment 20: Build & Polish

**Goal**: Produce the final single-file `index.html` and polish.

**Tasks**:
- Run `build.js` to produce `index.html`
- Verify `index.html` works standalone (no module imports)
- Performance check: smooth 60fps with 50 asteroids
- Visual polish pass: line weights, speeds, star densities feel right

**Acceptance Criteria**:
- [ ] `index.html` is a single file with no external dependencies
- [ ] Opens in Chrome, Firefox, and Safari without errors
- [ ] All settings work in the built version
- [ ] Visually mesmerizing and relaxing to watch
- [ ] No console errors or warnings
