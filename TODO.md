# Asteroid Screensaver — Incremental Build Plan (TDD)

## Approach

- **Trunk-based development**: all work lands on `main` — no long-lived feature branches
- **Test framework**: Vitest + happy-dom
- **Code structure**: ES modules in `src/` for testability, `build.js` merges into single `index.html`
- **Workflow**: Write failing tests (RED) → implement until tests pass (GREEN) → refactor
- **Coverage audit**: before committing each increment, explicitly map every acceptance criterion to its test(s) and fill gaps
- **Philosophy**: Elephant carpaccio — every increment produces a running, visible result. The animation loop exists from the start; each slice adds something you can see.
- **Code quality**: follow SOLID principles and clean-code style — small focused functions, single responsibility, descriptive names, no magic numbers, highly maintainable and testable code.
- **Mandatory human review**: At the end of every iteration, **STOP and wait for the human developer to review and manually test** the implementation. Do not start the next iteration until the human gives explicit approval. This is not optional.
- **Final test coverage review**: When development of an iteration is complete and all tests are passing, review the entire codebase for missing test coverage and add any needed tests before presenting for human review.

---

## Increment 1: A Black Void That Breathes

**Goal**: Project scaffolding + a running animation loop rendering nothing but a black fullscreen canvas. The heartbeat of the app exists from minute one.

**Tasks**:
- Initialize `package.json` with Vitest dev dependency
- Create `vitest.config.js`
- Create `dev.html` with fullscreen black canvas
- Create `src/main.js` with a `requestAnimationFrame` loop and delta-time calculation
- Create `build.js` that assembles modules into `index.html`

**Acceptance Criteria**:
- [x] `npm test` runs and exits cleanly
- [x] `dev.html` opens in browser showing a fullscreen black canvas, no scrollbars
- [x] Canvas resizes when browser window resizes
- [x] Animation loop is running (verified by a frame counter incrementing in console or test)
- [x] Delta time between frames is calculated correctly (not zero, not negative, capped at a reasonable max like 100ms)
- [x] `node build.js` produces a standalone `index.html` that works identically

---

## Increment 2: A Single Star Drifts Across the Void ✅

**Goal**: One star layer rendered and scrolling. You open the page and see tiny dots drifting left — the universe is alive.

**Module**: `src/starfield.js`

**Acceptance Criteria**:
- [x] A single star layer is created with ~80 stars randomly distributed across the canvas
- [x] Each star is a white dot (1–2px) with an alpha brightness value
- [x] Stars scroll leftward at a constant speed each frame (position changes by `speed * dt`)
- [x] Stars that exit the left edge reappear on the right edge with a new random y-position
- [x] **Visible result**: open `dev.html` and see dots slowly drifting across a black screen

---

## Increment 3: Depth — Parallax Star Layers ✅

**Goal**: Add multiple star layers scrolling at different speeds. The background now has depth.

**Module**: `src/starfield.js`

**Acceptance Criteria**:
- [x] 3 layers are created by default: far, mid, near
- [x] Far layer: more stars (~100), smaller (1px), dimmer (0.3–0.5 alpha), slowest scroll (~2–5 px/s)
- [x] Mid layer: medium count (~60), 1–2px, medium brightness (0.5–0.7 alpha), moderate scroll (~8–15 px/s)
- [x] Near layer: fewer stars (~30), larger (2–3px), brighter (0.7–1.0 alpha), fastest scroll (~20–35 px/s)
- [x] Layers are drawn back-to-front (far first)
- [x] Star counts scale proportionally with canvas area
- [x] **Visible result**: clear sense of depth and parallax when watching

---

## Increment 4: Stars That Twinkle ✅

**Goal**: Stars subtly pulse in brightness. The background becomes alive and hypnotic.

**Module**: `src/starfield.js`

**Acceptance Criteria**:
- [x] Each star has a twinkle phase (random offset), frequency (0.5–2.0 Hz), and amplitude (10–20% of base brightness)
- [x] Brightness oscillates sinusoidally: `base + amplitude * sin(time * freq + phase)`
- [x] Different stars twinkle out of phase (not synchronized)
- [x] Near-layer stars do NOT twinkle (steady brightness)
- [x] Brightness never goes below 0 or above 1.0
- [x] **Visible result**: subtle, organic shimmer in the star field

---

## Increment 5: One Asteroid Floats Through ✅

**Goal**: A single asteroid appears, drifts across the screen as a white wireframe polygon, and disappears off the other side. The first "actor" on stage.

**Modules**: `src/asteroid.js`

**Acceptance Criteria**:
- [x] `generateShape(radius)` produces 8–14 vertices in an irregular polygon
- [x] Every vertex is within `[radius * 0.6, radius * 1.0]` from origin
- [x] Vertices are ordered angularly (no crossed edges)
- [x] Two calls produce different shapes (randomness)
- [x] Asteroid is rendered as a closed white stroked polygon (no fill)
- [x] Asteroid moves in a straight line at constant speed each frame (`x += vx*dt, y += vy*dt`)
- [x] Asteroid spawns outside one edge and drifts across to the other
- [x] **Visible result**: a jagged white shape glides across the star field

---

## Increment 6: The Asteroid Tumbles ✅

**Goal**: The asteroid rotates as it drifts, just like in the original game.

**Module**: `src/asteroid.js`

**Acceptance Criteria**:
- [x] Each asteroid has an `angularVelocity` (rad/s) assigned at creation
- [x] Rotation updates each frame: `rotation += angularVelocity * dt`
- [x] Renderer applies rotation transform before drawing the shape
- [x] Canvas state is saved/restored around each asteroid draw (no transform leaking)
- [x] With `dt=0`, rotation is unchanged
- [x] **Visible result**: the asteroid slowly spins as it floats across

---

## Increment 7: A Field of Asteroids ✅

**Goal**: Multiple asteroids of varying sizes populate the screen. Bigger ones drift slowly, smaller ones zip past. The scene gets interesting.

**Module**: `src/asteroid.js`, `src/simulation.js`

**Acceptance Criteria**:
- [x] Three size classes: large (r 50–80px, speed 15–30), medium (r 25–49, speed 30–60), small (r 10–24, speed 60–120)
- [x] Stroke width varies: 2.0px large, 1.5px medium, 1.0px small
- [x] Larger asteroids rotate more slowly than smaller ones (on average)
- [x] ~20 asteroids on screen (hardcoded target for now)
- [x] Size distribution: ~20% large, ~40% medium, ~40% small
- [x] **Visible result**: a bustling asteroid field with large slow boulders and fast small rocks

---

## Increment 8: Asteroids Come and Go ✅

**Goal**: Asteroids that drift off-screen are removed. New ones spawn from edges to replace them. The scene is self-sustaining.

**Module**: `src/asteroid.js`, `src/simulation.js`

**Acceptance Criteria**:
- [x] `isOffScreen(asteroid, w, h)` returns `true` when asteroid is fully outside canvas + margin
- [x] Works correctly for all four edges
- [x] Off-screen asteroids are removed each frame
- [x] New asteroids spawn just outside a random edge, aimed inward with ±30° spread
- [x] Spawning is staggered: max 1 new asteroid per 0.3s (no edge clusters)
- [x] Asteroid count stays near target (~20) over time
- [x] Spawns from all four edges (not biased)
- [x] **Visible result**: endless flow of asteroids — leave one side, new ones appear from another

---

## Increment 9: Natural Starfield Twinkle

**Goal**: Stars currently twinkle in near-unison, looking like a Christmas tree instead of a galaxy. Widen the frequency and amplitude ranges, and ensure phases are well-distributed so each star feels independent.

**Module**: `src/starfield.js`

**Acceptance Criteria**:
- [x] Twinkle frequency range widened to 0.3–3.0 Hz (was 0.5–2.0)
- [x] Twinkle amplitude range widened to 10–30% of base brightness (was 10–20%)
- [x] Phases are uniformly distributed across the full 0–2π range (no clustering)
- [x] At any given moment, some stars are bright, some dim, some in between — no visible synchronization
- [x] Existing twinkle tests still pass (clamping, near-layer exclusion, etc.)
- [x] **Visible result**: organic, natural shimmer — each star feels like it has its own rhythm

---

## Increment 10: Asteroids Bounce Off Each Other

**Goal**: Collision detection and elastic response. The "wow" moment — asteroids interact.

**Module**: `src/physics.js`

**Acceptance Criteria**:
- [x] Circle-circle collision detection: collision when `distance(a, b) < radiusA + radiusB`
- [x] Exactly touching is NOT a collision
- [x] No duplicate pairs detected
- [x] Elastic collision conserves momentum exactly (mass = radius², shared impulse perturbation preserves momentum)
- [x] Elastic collision approximately conserves kinetic energy (within 5% tolerance — ±2% impulse perturbation can cause up to ~4% KE error on high-velocity collisions)
- [x] Large asteroid barely flinches; small one ricochets dramatically
- [x] Two equal asteroids in head-on collision approximately swap velocities
- [x] Overlapping asteroids are separated along collision normal after resolution
- [x] Lighter asteroid is pushed more during separation
- [x] Small random perturbation (±1% on impulse magnitude) prevents repeating loops
- [x] Angular velocity is nudged slightly on impact
- [x] **Visible result**: asteroids bump and bounce realistically

---

## Increment 11: Tighter Collision Radius

**Goal**: Collisions currently trigger too early because the collision circle uses the full bounding radius, which extends well beyond the visible asteroid surface. Compute an effective collision radius from the actual vertex distances for a tighter fit.

**Module**: `src/asteroid.js`, `src/physics.js`

**Acceptance Criteria**:
- [x] `createAsteroid` computes `collisionRadius` as the average vertex distance from center
- [x] `collisionRadius` is always less than or equal to `radius`
- [x] `collisionRadius` is stored on the asteroid object
- [x] `detectCollisions` uses `collisionRadius` instead of `radius`
- [x] `separateOverlap` uses `collisionRadius` instead of `radius`
- [x] `resolveCollision` uses `collisionRadius` for mass calculation (mass = collisionRadius²)
- [x] All existing collision tests still pass (updated to use collisionRadius)
- [x] **Visible result**: asteroids collide closer to their visible surfaces — no more bouncing off "empty space"

---

## Increment 12: Energy-Sustaining Spawns

**Goal**: Maintain constant system energy by dynamically boosting spawn speeds when kinetic energy drops below baseline. The spawner acts as a thermostat — the open boundary drains energy by preferentially removing fast small asteroids, and the spawner compensates by injecting higher-energy replacements.

**Module**: `src/energy.js`, `src/simulation.js`

**Acceptance Criteria**:
- [x] `computeKE(asteroid)` returns `0.5 * collisionRadius² * (vx² + vy²)`
- [x] `computeTotalKE(asteroids)` sums KE across all asteroids
- [x] `computeSpeedBoost(baselineKEPerAsteroid, targetCount, asteroids)` returns `clamp(sqrt(targetKE / actualKE), 1.0, 1.5)`
- [x] Returns 1.0 when actual KE >= target KE (never spawns slower than spec)
- [x] Returns 1.5 when deficit is extreme (cap prevents absurd speeds)
- [x] Simulation records `baselineKEPerAsteroid` from initial population at creation
- [x] `spawnAsteroidFromEdge` accepts an optional speed multiplier, applied to the base speed
- [x] Replacement spawns use the computed speed boost
- [x] Over a long simulated run (1000+ frames), average system KE stays within 80–120% of baseline
- [x] **Visible result**: the asteroid field maintains consistent energy indefinitely — no gradual slowdown

---

## Increment 13: Settings Menu

**Goal**: A hamburger menu icon (☰) in the top-left corner opens a settings panel with 3 sliders. The user can tune the experience.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [x] Hamburger menu icon (☰) renders in the top-left corner
- [x] Icon is semi-transparent (~30% opacity), brightens on hover (~80%)
- [x] Clicking the icon opens a translucent dark panel from the left with white monospace text; icon swaps to ✕
- [x] Panel has 3 labeled sliders: Asteroid Count [5–50, default 20], Speed [0.2x–3.0x, default 1.0x], Star Layers [3–6, default 3] *(Note: Asteroid Count was replaced by Asteroid Density [0.5x–3.0x] in Increment 21)*
- [x] Each slider shows its current value
- [x] Moving a slider changes the simulation in real-time (asteroid count adjusts gradually, speed scales all motion, star layers add/remove)
- [x] Pressing Escape closes the panel
- [x] Panel auto-hides after 4 seconds of no mouse activity over it
- [x] Menu icon auto-hides after 3 seconds of no mouse movement; reappears on move
- [x] **Visible result**: interactive settings that visibly change the animation

---

## Increment 14: Settings Persistence

**Goal**: Settings survive page reload via localStorage.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [x] On slider change, value is written to `localStorage`
- [x] On page load, settings are read from `localStorage` if present
- [x] If `localStorage` is empty or corrupt, defaults are used without error
- [x] All 3 settings are persisted independently
- [x] Slider positions reflect loaded values on startup
- [x] **Visible result**: reload the page, settings are remembered

---

## Increment 15: Star Field Direction Setting

**Goal**: Add a direction control for the star field: left, right, up, down, or radial (hyperspace). Persisted to localStorage.

**Module**: `src/starfield.js`, `src/settings.js`, `src/main.js`

**Acceptance Criteria**:
- [x] `SETTINGS_CONFIG` includes `starDirection` with options: `'left'`, `'right'`, `'up'`, `'down'`, `'radial'`; default `'left'`
- [x] Settings panel shows a direction selector (dropdown or button group)
- [x] Selecting a direction changes star movement in real-time
- [x] Left/right: stars scroll horizontally; recycled at exit edge, respawn at entry edge with random perpendicular position
- [x] Up/down: stars scroll vertically; recycled at exit edge, respawn at entry edge with random perpendicular position
- [x] Radial: stars emanate from screen center outward with perspective acceleration and brightness fade-in; recycled when exiting any edge, respawn at small offset from center
- [x] Radial mode: near-layer stars move faster outward than far-layer stars (parallax preserved)
- [x] Direction setting is persisted to localStorage
- [x] Loaded direction is applied on startup
- [x] Changing direction redistributes stars randomly for the new mode (avoids visual artifacts like center-clustered stars drifting sideways)
- [x] Stars redistribute on window resize (mobile screen rotation)
- [x] **Visible result**: switching to radial produces a "traveling through space" effect

---

## Increment 16: HiDPI Support & Build

**Goal**: Crisp rendering on retina displays. Final single-file build.

**Module**: `src/renderer.js`, `build.js`

**Acceptance Criteria**:
- [x] Canvas internal resolution = CSS size × `devicePixelRatio`
- [x] Canvas CSS size remains `100vw × 100vh`
- [x] Context is scaled by `devicePixelRatio`
- [x] Lines appear crisp on 2x displays
- [x] `node build.js` produces a standalone `index.html` with all modules inlined
- [x] `index.html` works with zero external dependencies
- [x] No console errors or warnings
- [x] **Visible result**: the final deliverable — one HTML file, opens in any browser, mesmerizing to watch

---

# Phase 2: Dogfighting Game

Increments 17–30 transform the asteroid screensaver into a Star Wars-style dogfighting game. Two ships (player + AI enemy) fight among asteroids. The player ship is fixed at screen center with the world rotating around it.

**Dependency chain**: 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30

---

## Increment 17: Static Ship at Screen Center

**Goal**: Create the ship module and render a static ship at the center of the asteroid field.

**New modules**: `src/ship.js`, `test/ship.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [x] `createShip({ x, y, heading })` returns a ship object with: `x, y, vx, vy, heading, alive` and control booleans (`thrust, rotatingLeft, rotatingRight, braking, fire`), all defaulting to `0`/`false`
- [x] `drawShip(ctx, ship)` draws a classic Asteroids chevron/triangle at `(ship.x, ship.y)`, rotated by `ship.heading`
  - White wireframe (`strokeStyle = '#FFFFFF'`), no fill, lineWidth ~1.5
  - Canvas state saved/restored (no transform leak)
- [x] Ship created in `startApp()` at `(canvasWidth/2, canvasHeight/2)` with heading `-PI/2` (pointing up)
- [x] Ship drawn after asteroids in the render loop (on top)
- [x] Ship is static — no movement, no input
- [x] **Visible**: A white triangular ship sitting at the center of the asteroid field. Asteroids drift past it.

---

## Increment 18: Ship Rotates with Keyboard

**Goal**: Add keyboard input and ship rotation. No thrust/position change yet — just turning in place.

**New modules**: `src/input.js`, `test/input.test.js`
**Modify**: `src/ship.js` (add `updateShip` with rotation only), `src/main.js`

**Acceptance Criteria**:
- [x] `createInputState()` returns `{ thrust, rotateLeft, rotateRight, brake, fire }` all `false`
- [x] `handleKeyDown(state, key)` / `handleKeyUp(state, key)` map keys to flags:
  - `'w'`/`'W'`/`'ArrowUp'` → thrust, `'a'`/`'A'`/`'ArrowLeft'` → rotateLeft, `'d'`/`'D'`/`'ArrowRight'` → rotateRight, `'s'`/`'S'`/`'ArrowDown'` → brake, `' '` → fire
  - Case-insensitive, unknown keys ignored
- [x] `applyInput(inputState, ship)` copies input flags onto ship control booleans
- [x] `updateShip(ship, dt)` applies rotation:
  - `rotatingLeft` → heading decreases by `ROTATION_SPEED * dt`
  - `rotatingRight` → heading increases by `ROTATION_SPEED * dt`
  - Heading normalized to [-PI, PI]
- [x] `ROTATION_SPEED` constant exported from `ship.js`
- [x] `keydown`/`keyup` listeners registered in `startApp()`
- [x] Escape key still opens/closes settings (no conflict)
- [x] **Visible**: Pressing A/D or Left/Right makes the ship rotate in place at screen center. Asteroids keep drifting around it.

---

## Increment 19: Ship Thrusts and Drifts (Newtonian Physics)

**Goal**: Full Newtonian movement. Ship can fly off-screen (no camera yet).

**Modify**: `src/ship.js`, `test/ship.test.js`

**Acceptance Criteria**:
- [x] `updateShip(ship, dt)` now also applies:
  - `thrust` → accelerate in heading direction: `vx += cos(heading) * THRUST_POWER * dt`, `vy += sin(heading) * THRUST_POWER * dt`
  - `braking` → decelerate opposite to velocity direction (stronger than drag)
  - Drag always applied: `vx *= (1 - DRAG * dt)`, `vy *= (1 - DRAG * dt)`
  - Position updates: `x += vx * dt`, `y += vy * dt`
  - Speed capped at `MAX_SPEED`
- [x] Constants exported: `THRUST_POWER`, `DRAG`, `BRAKE_POWER`, `MAX_SPEED`
- [x] With `dt=0`, no position/velocity changes
- [x] Ship drawn at its `(x, y)` which is now changing
- [x] Ship can fly off-screen (intentional — camera comes next)
- [x] Speed multiplier setting scales ship dt (same `scaledDt` as asteroids)
- [x] `SETTINGS_CONFIG` includes `thrustPower` slider (1000–5000, default 2000, step 50)
- [x] `thrustPower` persisted to localStorage
- [x] Changing slider updates thrust in real-time
- [x] `updateShip` uses `ship.thrustPower` instead of bare constant (falls back to exported `THRUST_POWER` default)
- [x] **Visible**: W/Up thrusts the ship forward. It drifts with momentum. S/Down brakes. Ship carves fluid arcs when combining rotation + thrust. Can fly off-screen.

---

## Increment 20: Camera Follows Ship (World Rotates Around It)

**Goal**: Camera locks ship at screen center. World moves and rotates around the player.

**New modules**: `src/camera.js`, `test/camera.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [x] `createCamera(x, y, rotation)` returns `{ x, y, rotation }`
- [x] `applyCameraTransform(ctx, camera, viewportW, viewportH)` saves context and applies: translate to screen center → rotate by `-camera.rotation` → translate by `(-camera.x, -camera.y)`
- [x] `resetCameraTransform(ctx)` restores context
- [x] `getViewportBounds(camera, viewportW, viewportH)` returns the AABB of the rotated viewport in world-space: `{ minX, maxX, minY, maxY }` with padding margin
- [x] Each frame: `camera.x = ship.x`, `camera.y = ship.y`, `camera.rotation = ship.heading`
- [x] Render pipeline becomes:
  1. Clear canvas
  2. Draw starfield (screen-space, before camera transform)
  3. `applyCameraTransform(ctx, camera, ...)`
  4. Draw asteroids (unchanged `drawAsteroid(ctx, asteroid)`)
  5. Draw ship (at its world x,y — maps to screen center)
  6. `resetCameraTransform(ctx)`
- [x] Ship always points "up" on screen (camera rotation cancels heading)
- [x] Ship can no longer fly off-screen (camera follows it)
- [x] Round-trip test: world → screen → world preserves coordinates
- [x] **Visible**: Ship locked at center pointing up. Rotating makes asteroids spin around you. Thrusting makes them scroll past. The "world rotates around you" effect.

---

## Increment 21: World-Relative Asteroid Spawning (Border-Zone Architecture)

**Goal**: Asteroids spawn/despawn using a three-zone system (viewport → spawn border → outside) relative to the camera viewport, creating a realistic infinite field. Direction-biased border spawning keeps the viewport populated at all times without asteroids popping into view.

**Modify**: `src/simulation.js`, `test/simulation.test.js`, `src/camera.js`, `test/camera.test.js`, `src/main.js`, `src/settings.js`, `test/settings.test.js`

**Acceptance Criteria**:
- [x] "Asteroid Count" slider replaced with "Asteroid Density" multiplier (0.5x–3.0x, default 1.0x, step 0.1)
- [x] Density setting persisted to localStorage
- [x] Energy homeostasis unchanged (based on velocities, unaffected by coordinate system)
- [x] Collision physics unchanged (all in world-space)
- [x] `getViewportBounds(camera, vw, vh, margin)` accepts optional margin parameter (default 0), `VIEWPORT_MARGIN` constant removed
- [x] `computeSpawnBounds(viewportBounds)` expands viewport bounds by `SPAWN_BORDER` (300px) on each side
- [x] `computeEdgeWeights(shipVx, shipVy)` returns direction-biased weights: `max(dot(velocity, edgeOutward), 0) + BASE_EDGE_WEIGHT`, normalized to sum to 1.0; stationary → ~0.25 each; no weight ever 0
- [x] `pickWeightedEdge(weights)` returns 0–3 using cumulative weighted random selection
- [x] `isOutsideZone(asteroid, spawnBounds)` replaces `isOffScreen`: removes asteroids past spawn bounds + `RECYCLE_MARGIN` (5px)
- [x] `spawnAsteroidInBorder(viewportBounds, spawnBounds, edgeWeights, speedMultiplier)` spawns ONLY in the border ring (outside viewport, inside spawn bounds), aimed inward with ±30° spread, direction-biased by edge weights
- [x] `spawnAsteroidInZone(spawnBounds, speedMultiplier)` replaces `spawnAsteroidInBounds`: random position within full zone, random direction
- [x] `createSimulation(viewportBounds, targetCount)` populates entire zone (viewport + border) for immediate visibility; records `baselineKEPerAsteroid`; no `spawnTimer`
- [x] `updateSimulation(sim, dt, viewportBounds, shipVx, shipVy)` — moves, collides, recycles outside zone, spawns in border when below target (up to `MAX_SPAWN_PER_FRAME` = 10/frame), direction-biased; no stagger timer
- [x] `main.js` passes tight viewport bounds (margin=0) + ship velocity to simulation; target count uses zone area ratio
- [x] **Visible**: Infinite asteroid field. No asteroids pop into view inside screen. Fly any direction at full speed — viewport always populated. Asteroids visible immediately on load.

---

## Increment 22: Starfield Responds to Camera

**Goal**: Stars shift with parallax based on camera movement.

**Modify**: `src/starfield.js`, `test/starfield.test.js`, `src/main.js`

**Acceptance Criteria**:
- [x] New function `updateStarLayersCamera(layers, cameraDeltaX, cameraDeltaY, cameraDeltaRotation, viewportW, viewportH)` shifts stars based on camera position/rotation delta
- [x] Far layers shift less than near layers (parallax depth preserved)
- [x] Camera rotation rotates the shift direction (stars respond to turning)
- [x] Stars wrap when they exit viewport edges
- [x] When ships are active, starfield uses camera-relative mode instead of directional scroll
- [x] Existing direction modes (`left`/`right`/`up`/`down`/`radial`) remain available when ships are off
- [x] Star twinkling continues to work
- [x] `main.js` tracks `prevCamera` to compute deltas each frame
- [x] **Visible**: Full parallax scrolling tied to ship movement. Stars stream past when flying forward. Turning makes them wheel around the ship. Complete "flying through space" feel.

---

## Increment 22b: Ship Exhaust Trail

**Goal**: A fading rocket-exhaust trail behind the ship that starts at the nozzle, uses dark orange color, is always on while moving, and visually distinguishes thrust vs coasting — giving throttle feedback and reinforcing the sense of speed.

**Modify**: `src/ship.js`, `test/ship.test.js`, `src/main.js`

**Acceptance Criteria**:
- [x] `TRAIL_MAX_LENGTH` (240) exported from `ship.js`
- [x] `TRAIL_BASE_OPACITY` (0.2) and `TRAIL_THRUST_OPACITY` (0.6) exported from `ship.js`
- [x] `TRAIL_BASE_WIDTH` (1) and `TRAIL_THRUST_WIDTH` (2.5) exported from `ship.js`
- [x] `THRUST_RAMP_SPEED` (6.0) exported from `ship.js` (physics constant — controls engine spool rate)
- [x] `PLAYER_TRAIL_COLOR` (`{ r: 80, g: 140, b: 255 }`) and `ENEMY_TRAIL_COLOR` (`{ r: 255, g: 50, b: 30 }`) exported from `ship.js` *(updated from single `TRAIL_COLOR` in Increment 25)*
- [x] `createShip` returns `thrustIntensity: 0` (ramp state lives on ship, not trail)
- [x] `updateShip` ramps `ship.thrustIntensity` toward 1.0 (thrusting) or 0.0 (coasting) at `THRUST_RAMP_SPEED * dt`; thrust force scales by `thrustIntensity`
- [x] `createTrail(color)` returns `{ points: [], color }` — accepts per-ship color, defaults to `PLAYER_TRAIL_COLOR`
- [x] `updateTrail(trail, x, y, heading, thrustIntensity)` — receives intensity from ship, no `dt` param, no ramping; pushes `{ x, y, intensity }` with nozzle offset
- [x] Trail point is offset to the ship's rear nozzle: `x - cos(heading) * SHIP_SIZE * 0.5`, `y - sin(heading) * SHIP_SIZE * 0.5`
- [x] Each point stores `intensity` float (0.0–1.0) for per-segment interpolation
- [x] Evicts oldest point when length exceeds `TRAIL_MAX_LENGTH`
- [x] `drawTrail(ctx, trail)` interpolates width and opacity per-segment using stored `intensity`: `width = BASE + (THRUST - BASE) * intensity`, `maxAlpha = BASE_OPACITY + (THRUST_OPACITY - BASE_OPACITY) * intensity`
- [x] Trail drawn using per-trail `trail.color` (blue for player, red for enemy)
- [x] Trail with fewer than 2 points draws nothing (no crash)
- [x] Trail drawn inside camera transform, before ship body (ship renders on top)
- [x] `main.js` creates a trail, updates it each frame with ship position/heading/`ship.thrustIntensity`, and draws it
- [x] **Visible**: Colored trail always visible behind the ship (blue for player, red for enemy). Thrusting gradually brightens and widens the trail. Releasing thrust smoothly fades to thinner dimmer trail (~0.17s transition). Turning carves visible arcs. Clear throttle feedback with no binary snapping.

---

## Increment 23: Minimum Forward Velocity + Thrust Flame *(DEFERRED — review later)*

> **Review needed before implementing:**
> 1. Validate whether `MIN_SPEED` forward drift is a fun addition or feels forced
> 2. Review how the classic Asteroids thrust flame integrates visually with the existing exhaust trail (22b) — may be redundant

**Goal**: Ship always drifts forward and shows a flame when boosting.

**Modify**: `src/ship.js`, `test/ship.test.js`

**Acceptance Criteria**:
- [ ] When ship speed drops below `MIN_SPEED`, a gentle forward push in the heading direction nudges velocity back up
- [ ] `MIN_SPEED` exported — small fraction of `MAX_SPEED` (drift feel, not racing)
- [ ] Push is smooth/gradual, not a hard clamp
- [ ] When `ship.thrust` is true, `drawShip` renders a flickering flame behind the ship
  - Randomized triangle size (varies frame-to-frame for flicker)
  - White wireframe to match aesthetic
  - Drawn before ship body (behind it visually)
- [ ] With `dt=0`, no velocity push occurs
- [ ] **Visible**: Ship always creeps forward even without pressing W. Thrusting shows engine flame flicker. The ship feels alive — always in motion, carving arcs.

---

## Increment 24: Bullets ✅

**Goal**: Player can fire bullets.

**New modules**: `src/bullet.js`, `test/bullet.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [x] `createBullet(x, y, heading, shipVx, shipVy, owner)` creates a bullet at given position, traveling at `BULLET_SPEED` in heading direction plus ship velocity (bullets inherit momentum)
- [x] `updateBullet(bullet, dt)` moves bullet linearly, increments `age`
- [x] `isBulletExpired(bullet)` returns true when `age >= BULLET_LIFETIME` (e.g., 2s)
- [x] `drawBullet(ctx, bullet)` draws a small bright dot or short line
- [x] Space key fires from ship nose position in heading direction
- [x] Fire rate limited by `FIRE_COOLDOWN` (~0.2s between shots)
- [x] Bullets rendered inside camera transform (world-space)
- [x] Expired bullets removed each frame
- [x] Bullets are blocked by asteroids: a bullet within an asteroid's `collisionRadius` is removed; the asteroid is unaffected
- [x] `checkBulletAsteroidCollisions(bullets, asteroids)` returns the filtered array of surviving bullets
- [x] `owner` field on bullet tracks which ship fired it (for later collision filtering)
- [x] **Visible**: Pressing Space fires white projectiles that streak forward from the ship and disappear after a distance.

---

## Increment 25: Enemy Ship + Basic AI

**Goal**: Second ship appears, controlled by AI that chases the player.

**New modules**: `src/ai.js`, `test/ai.test.js`
**Modify**: `src/ship.js`, `test/ship.test.js`, `src/main.js`

**Acceptance Criteria**:
- [x] `createAIState()` returns AI decision state object (minimal for pursuit; expandable for combat)
- [x] `updateAI(aiState, aiShip, targetShip, asteroids, dt)` sets aiShip's control flags:
  - Computes predicted target position using velocity-based lead (`lookAheadTime = min(dist / PREDICTION_SPEED, MAX_PREDICTION_TIME)`)
  - Rotates toward predicted position with dead zone to prevent oscillation
  - Thrusts when roughly facing target (within `THRUST_ANGLE`)
  - Brakes when not facing target and moving above `BRAKE_SPEED` threshold
- [x] When either ship is dead, AI clears all control flags (no zombie steering)
- [x] AI constants exported: `ROTATION_DEADZONE`, `THRUST_ANGLE`, `BRAKE_SPEED`, `PREDICTION_SPEED`, `MAX_PREDICTION_TIME`, `MIN_SPAWN_DISTANCE`, `MAX_SPAWN_DISTANCE`
- [x] `createShip` accepts optional `owner` field (default `'player'`)
- [x] AI ship uses same `createShip` / `updateShip` physics as player (same thrust, drag, max speed)
- [x] Enemy drawn with dark red dashed lines (`#CC3333`, `ctx.setLineDash([4, 4])`) — visually distinct from player's white solid lines
- [x] Enemy spawns at random world position `MIN_SPAWN_DISTANCE`–`MAX_SPAWN_DISTANCE` px from player in a random direction
- [x] Enemy has its own exhaust trail (red `rgb(255, 50, 30)` vs player blue `rgb(80, 140, 255)` — Star Wars faction colors)
- [x] Enemy uses same `thrustPower` setting as player
- [x] Both ships rendered inside camera transform
- [x] **Visible**: Two ships flying through the asteroid field. The enemy chases the player with fluid arcs. No shooting or collision yet — just the pursuit.

---

## Increment 26: AI Fires Bullets + Asteroid Avoidance

**Goal**: AI shoots at player and steers around asteroids and the player ship (no ramming).

**Modify**: `src/ai.js`, `test/ai.test.js`, `src/main.js`

**Acceptance Criteria**:

### AI Combat (firing)
- [x] `updateAI` sets `aiShip.fire = true` when `|headingDiff to predicted target| < FIRE_ANGLE` AND `distance < MAX_FIRE_RANGE`
- [x] `FIRE_ANGLE` (~0.15 rad / ~8.6°) exported from `ai-reactive.js`
- [x] `MAX_FIRE_RANGE` (500px) exported from `ai-reactive.js`
- [x] AI does not fire when either ship is dead (existing dead-ship guard)
- [x] `main.js` manages `enemyShip.fireCooldown` identically to player: decrement each frame, create bullet from enemy nose when `fire && cooldown <= 0 && alive`, reset cooldown to `FIRE_COOLDOWN`
- [x] AI bullets use same `createBullet` with `owner: 'enemy'` and same physics
- [x] AI bullets are added to the shared `bullets` array, updated/drawn/filtered identically

### AI Obstacle Avoidance
- [x] `computeAvoidanceOffset(aiShip, obstacles)` exported from `ai-reactive.js` — returns `{ offset, maxUrgency }` for steering away from collision-course obstacles
- [x] Obstacles is an array of `{ x, y, radius }` — supports both asteroids and ships
- [x] Look-ahead cylinder projects along **predicted velocity**, not heading — accounts for Newtonian drift and current thrust input
- [x] Predicted velocity: `predV = velocity + thrustAccel * AVOID_PREDICT_TIME`; falls back to heading when speed < 1
- [x] `AVOID_PREDICT_TIME` (0.3s) exported from `ai-reactive.js`
- [x] Look-ahead cylinder: obstacle is a threat when `ahead > 0`, `ahead < AVOID_LOOKAHEAD`, and `|lateral| < obstacle.radius + AVOID_MARGIN`
- [x] Proximity detection: obstacle is a threat when `distance < obstacle.radius + AVOID_PROXIMITY` (catches obstacles the cylinder misses, e.g., when circling)
- [x] `AVOID_PROXIMITY` (80px) exported from `ai-reactive.js`
- [x] `AVOID_LOOKAHEAD` (800px), `AVOID_MARGIN` (50px), `AVOID_STRENGTH` (2.5 rad) exported from `ai-reactive.js`
- [x] Linear urgency: `max(cylinderUrgency, proximityUrgency)` — strong medium-range response for early reaction
- [x] Closer obstacles produce stronger steering offset: strength scales linearly with urgency
- [x] Dead-center obstacle (lateral ≈ 0) defaults to steering right (breaks symmetry)
- [x] Returns 0 when no obstacles are on collision course
- [x] `updateAI` builds obstacle list from asteroids only (`collisionRadius`) — target ship is NOT included (AI approaches to fire, not avoids)
- [x] `computeAvoidanceOffset` returns `{ offset, maxUrgency }` — maxUrgency is the highest raw urgency across all obstacles
- [x] `AVOIDANCE_PRIORITY` (2) exported from `ai-reactive.js` — controls how aggressively pursuit is suppressed when avoiding
- [x] Survival-first blending: `survivalWeight = clamp(maxUrgency * AVOIDANCE_PRIORITY, 0, 1)`; pursuit scaled by `(1 - survivalWeight)`. At zero threat → pure pursuit; at moderate threat → pure avoidance
- [x] Pursuit cannot override avoidance: when obstacles are close, ship steers to avoid regardless of target direction
- [x] Thrust maintained during avoidance for agility (braking suppressed — speed enables dodging)
- [x] Avoidance and pursuit blend smoothly (no jittering between states)

### Visible
- [x] **Visible**: Enemy shoots at the player and navigates around asteroids. Bullets fly between both ships. AI curves around obstacles. Dogfight feel emerges.

---

## Increment 26b: Pluggable AI System + Trajectory Simulation

**Goal**: Refactor AI into a pluggable strategy system and add a predictive AI that uses trajectory simulation to choose actions. Different AI algorithms can be swapped via a settings dropdown.

**New modules**: `src/ai-core.js`, `src/ai-reactive.js`, `src/ai-predictive.js`
**Modify**: `src/ai.js`, `src/main.js`, `src/settings.js`, `test/ai.test.js`

**Acceptance Criteria**:

### Strategy Interface
- [x] Every AI strategy exports `{ createState, update }` — `createState()` returns per-ship state, `update(state, ship, target, asteroids, dt)` sets 5 control flags
- [x] Strategies are registered by name and retrieved via `getStrategy(name)`

### Strategy Registry (`ai-core.js`)
- [x] `registerStrategy(name, strategy)` stores a strategy by name
- [x] `getStrategy(name)` returns a registered strategy (throws on unknown name)
- [x] `listStrategies()` returns array of registered strategy names

### Reactive AI Extraction (`ai-reactive.js`)
- [x] All reactive AI logic moved from `ai.js` to `ai-reactive.js` — zero behavior change
- [x] Exports `reactiveStrategy = { createState, update }`
- [x] All existing AI tests pass with adjusted imports
- [x] Constants re-exported: `ROTATION_DEADZONE`, `THRUST_ANGLE`, `BRAKE_SPEED`, `PREDICTION_SPEED`, `MAX_PREDICTION_TIME`, `FIRE_ANGLE`, `MAX_FIRE_RANGE`, `AVOID_LOOKAHEAD`, `AVOID_MARGIN`, `AVOID_STRENGTH`, `AVOID_PROXIMITY`, `AVOIDANCE_PRIORITY`, `AVOID_PREDICT_TIME`

### AI Facade (`ai.js`)
- [x] `ai.js` becomes thin facade: imports and registers both strategies
- [x] Re-exports `spawnEnemyPosition` (not strategy-specific)
- [x] Re-exports `getStrategy`, `listStrategies` from `ai-core.js` *(consumers import directly from ai-core.js in ES module mode)*
- [x] Re-exports reactive AI functions for backward compatibility (`createAIState`, `updateAI`)

### Predictive AI (`ai-predictive.js`)
- [x] `cloneShipForSim(ship)` copies physics-relevant fields only
- [x] `predictAsteroidAt(asteroid, t)` returns linearly extrapolated `{ x, y, radius }`
- [x] `defineCandidates()` returns 7 fixed-action candidate objects
- [x] `simulateTrajectory(clone, action, steps, dt)` runs `updateShip` forward with a fixed action, returns array of positions
- [x] `simulatePursuitTrajectory(clone, target, steps, dt, brakeSteps)` runs adaptive pursuit (rotates toward target each step), returns `{ positions, firstAction }`
- [x] `scoreTrajectory(positions, target, asteroids, simDt)` returns 5-component composite score: time-decayed collision penalty, min-distance weight, average aim bonus, approach rate, proximity-scaled fire opportunity
- [x] `selectBestAction(ship, target, asteroids)` evaluates 7 fixed + pursuit + brake-pursuit (speed-gated) candidates, picks highest score
- [x] `predictiveStrategy = { createState, update }` — sets control flags from best action + fires when aimed
- [x] Constants exported: `SIM_STEPS` (15), `SIM_DT` (0.1s), `COLLISION_BASE_PENALTY` (-10000), `COLLISION_DECAY` (0.4), `DISTANCE_WEIGHT` (-8), `AIM_BONUS` (400), `CLOSING_SPEED_WEIGHT` (8), `FIRE_OPPORTUNITY_BONUS` (300), `BRAKE_PURSUIT_STEPS` (5)

### Settings Integration
- [x] `SETTINGS_CONFIG` includes `aiStrategy` with options `['reactive', 'predictive']`, default `'predictive'`
- [x] `aiStrategy` persisted to localStorage
- [x] Changing dropdown swaps strategy and resets AI state in real-time
- [x] Enemy spawn heading: aim toward player instead of random

### Visible
- [x] **Visible**: Settings dropdown lets you switch between reactive and predictive AI. Reactive AI behaves identically to before. Predictive AI navigates asteroid fields and pursues the player using path simulation. Both fire bullets when aimed.

---

## Increment 26c: AI Debug Logging ✅

**Goal**: Structured console telemetry for diagnosing AI behavior. Toggled via a settings checkbox (default: off). Zero cost when disabled.

**New modules**: `src/debug.js`, `test/debug.test.js`
**Modify**: `src/ai-predictive.js`, `src/settings.js`, `src/main.js`

**Acceptance Criteria**:

### Score Capture (`ai-predictive.js`)
- [x] `selectBestAction` populates a module-level debug info object with all candidate names, scores, and winner name
- [x] `getLastDebugInfo()` exported — returns last captured debug info (or `null`)

### Debug Logger (`debug.js`)
- [x] `createDebugLogger()` returns a logger instance with `enable()`, `disable()`, `isEnabled()`, `logAIFrame(...)`, `logEvent(...)`
- [x] `fmtAction(ship)` exported — converts control flags to compact 4-char string (e.g. `T_R_`)
- [x] `logAIFrame(elapsed, enemy, player, debugInfo)` — rate-limited to every 0.5s
- [x] Action change detection bypasses rate limit (logs immediately when action differs from previous)
- [x] `logEvent(elapsed, type, data)` — logs immediately (fire, collision)
- [x] When disabled: all functions are no-ops (zero cost)

### Settings Integration
- [x] `SETTINGS_CONFIG` includes `aiDebugLog` checkbox, default `false`
- [x] Setting persisted to `localStorage`
- [x] Toggling checkbox enables/disables debug logging in real-time
- [x] `createSettingsUI` renders checkboxes for boolean settings
- [x] Also accessible via `window.aiDebug.enable()` / `window.aiDebug.disable()`

### Main Loop Integration (`main.js`)
- [x] After AI update: calls `logAIFrame` with ship states + `getLastDebugInfo()`
- [x] On bullet creation: calls `logEvent`

### Log Format
- [x] Periodic: `[AI 1.20s] dist=342 action=T___ spd=180 hdg=0.50 pos=(100,-200) | T___:3090 TL__:-3299 ...`
- [x] Change: `[AI 1.50s] CHANGE T___ → __RB dist=45`
- [x] Fire: `[FIRE 1.60s] enemy dist=180 angle=0.08`

### Tests (`test/debug.test.js`)
- [x] enable/disable toggling
- [x] rate limiting (0.5s)
- [x] action change detection bypasses rate limit
- [x] fmtAction format
- [x] logEvent logs immediately
- [x] getLastDebugInfo from ai-predictive

### Visible
- [x] **Visible**: Toggle "AI Debug Log" checkbox in settings. Open browser console. See structured AI telemetry: periodic state dumps, action changes, fire events. Disable checkbox → logs stop.

---

## Increment 26d: Headless Simulator

**Goal**: A CLI-runnable simulation harness that exercises the full game logic (physics, AI, collisions, spawning) without any browser or canvas. Runs at max CPU speed with controlled dt, producing structured logs and stats for detecting AI bugs and balance issues at scale.

**New files**: `simulate.js`
**Modify**: None (pure addition — consumes existing modules)

**Acceptance Criteria**:

### Core Loop
- [ ] `simulate.js` runs via `node simulate.js` with no browser dependencies
- [ ] Imports only headless-safe modules (ship, AI, physics, simulation, bullet, asteroid, energy, debug)
- [ ] Simulates the full game loop: AI update → ship physics → bullet update → bullet-asteroid collisions → asteroid simulation (move, collide, recycle, spawn)
- [ ] Uses fixed `dt` (default `1/60`) for browser-accurate physics
- [ ] Runs N games of M ticks each (configurable via CLI args)
- [ ] Both ships controlled by AI (ai-vs-ai)
- [ ] Provides synthetic viewport bounds for asteroid spawning (no real canvas needed)

### Event Logging
- [ ] Logs action changes with previous/new action and winner
- [ ] Logs bullet fires and hits (when bullet-ship collision exists)
- [ ] Logs ship-asteroid proximity (ship center within `2 × collisionRadius` of asteroid)
- [ ] Logs AI score breakdowns on action change (all candidate scores)

### Detectors
- [ ] **Oscillation detector**: flags when action changes occur faster than `HOLD_TIME`
- [ ] **Asteroid pass-through detector**: flags when ship overlaps asteroid `collisionRadius` without dying (once ship-asteroid collision is implemented)
- [ ] **Score collapse detector**: flags when all candidates score below a configurable threshold

### CLI Interface
- [ ] `--games N` — number of games to run (default 100)
- [ ] `--ticks N` — ticks per game (default 3600 = 60s at 60fps)
- [ ] `--dt N` — simulation timestep in seconds (default 1/60)
- [ ] `--seed N` — seed for reproducible random (optional, non-seeded by default)
- [ ] `--verbose` — print per-game event logs (default: summary only)
- [ ] `--detect list` — comma-separated detector names to enable

### Output
- [ ] Summary table to stdout: games played, events detected per type, win/loss ratio (once kills exist)
- [ ] Per-game details when `--verbose`
- [ ] Exit code 0 on success, 1 if any detector fired

### Visible
- [ ] **Visible**: `node simulate.js --games 10 --verbose` runs 10 headless games in seconds, printing event logs and a summary table. No browser needed.

---

## Increment 27: Bullet-Ship Collision (One Kill)

**Goal**: Bullets destroy ships. One bullet = one kill.

**New modules**: `src/game.js`, `test/game.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [ ] `checkBulletShipHit(bullet, ship)` returns true when bullet is within ship's `collisionRadius`
- [ ] Ship `collisionRadius` defined at creation (based on ship size)
- [ ] Player bullets hit enemy; enemy bullets hit player
- [ ] Ship's own bullets cannot hit itself (filtered by `owner`)
- [ ] One hit → `ship.alive = false`
- [ ] Dead ship stops rendering and updating
- [ ] Simple explosion effect on death (expanding wireframe circle or particle burst)
- [ ] `createGameState()` tracks `{ phase }` — `'playing'`, `'playerWin'`, `'playerDead'`
- [ ] Phase transitions on ship death
- [ ] **Visible**: Ships can be destroyed by bullets. One shot = one kill. Explosion plays on death.

---

## Increment 28: Ship-Asteroid Collision

**Goal**: Asteroids are lethal obstacles.

**Modify**: `src/game.js`, `test/game.test.js`, `src/main.js`

**Acceptance Criteria**:
- [ ] `checkShipAsteroidCollision(ship, asteroids)` returns first overlapping asteroid (circle-circle using `collisionRadius`)
- [ ] Ship dies on asteroid contact (same death + explosion as bullet death)
- [ ] Applies to both player and enemy
- [ ] Asteroids unaffected (keep drifting)
- [ ] **Visible**: Flying into an asteroid kills the ship. Asteroids become environmental hazards during the dogfight.

---

## Increment 29: Game State, HUD, and Restart

**Goal**: Complete game loop with win/lose/restart.

**Modify**: `src/game.js`, `test/game.test.js`, `src/main.js`

**Acceptance Criteria**:
- [ ] Game phases: `'playing'` → `'playerWin'` (enemy dies) / `'playerDead'` (player dies)
- [ ] HUD text displayed in screen-space (after camera reset): "YOU WIN" or "GAME OVER", centered on screen
- [ ] "Press ENTER to restart" shown below the result text
- [ ] Enter or R key restarts: both ships respawn, bullets cleared, phase resets to `'playing'`
- [ ] On player death: camera freezes at death position (world stops rotating)
- [ ] On enemy death: camera continues following player
- [ ] Respawn positions offset from each other
- [ ] **Visible**: Complete game loop. Fight the enemy, win or lose, see the result, restart and play again.

---

## Increment 30: Per-Ship Intelligence Settings

**Goal**: Each ship gets its own intelligence dropdown — enabling human-vs-AI, AI-vs-AI, or any combination. Replaces the single `aiStrategy` setting with `playerIntelligence` and `enemyIntelligence`.

**Modify**: `src/settings.js`, `test/settings.test.js`, `src/main.js`, `test/main.test.js`

**Acceptance Criteria**:

### Settings (`src/settings.js`)
- [ ] `aiStrategy` removed from `SETTINGS_CONFIG`
- [ ] `playerIntelligence` added: options `['human', 'reactive', 'predictive']`, default `'human'`, label `'Player'`
- [ ] `enemyIntelligence` added: options `['reactive', 'predictive']`, default `'predictive'`, label `'Enemy AI'`
- [ ] `createSettings()` defaults: `playerIntelligence='human'`, `enemyIntelligence='predictive'`
- [ ] `saveSettings` persists both new settings (not `aiStrategy`)
- [ ] `loadSettings` validates enum values for both new settings
- [ ] `loadSettings` backward compat: if localStorage has old `aiStrategy` but no `enemyIntelligence`, migrates `aiStrategy` value to `enemyIntelligence`

### Main loop (`src/main.js`)
- [ ] Enemy uses `getStrategy(settings.enemyIntelligence)` (replaces `settings.aiStrategy`)
- [ ] Player uses keyboard input when `playerIntelligence='human'` (current behavior)
- [ ] Player uses AI strategy when `playerIntelligence` is `'reactive'` or `'predictive'`
- [ ] Changing `enemyIntelligence` dropdown swaps enemy strategy and resets AI state
- [ ] Changing `playerIntelligence` dropdown swaps between keyboard/AI control and resets player AI state
- [ ] Camera always follows player ship (no change needed)

### Visible
- [ ] **Visible**: Settings panel shows "Player" dropdown (human/reactive/predictive) and "Enemy AI" dropdown (reactive/predictive). Human mode = keyboard control. Switching to reactive/predictive makes the player ship autonomous. Enemy AI dropdown works as before.
