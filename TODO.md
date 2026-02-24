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
- [x] `simulate.js` runs via `node simulate.js` with no browser dependencies
- [x] Imports only headless-safe modules (ship, AI, physics, simulation, bullet, asteroid, energy, debug, camera, ai.js)
- [x] Simulates the full game loop: AI update → ship physics → bullet update → bullet-asteroid collisions → asteroid simulation (move, collide, recycle, spawn)
- [x] Uses fixed `dt` (default `1/60`) for browser-accurate physics
- [x] Runs N games of M ticks each (configurable via CLI args)
- [x] Both ships use AI strategies selected via `--player-ai` / `--enemy-ai` (default: predictive)
- [x] Provides synthetic viewport bounds for asteroid spawning (no real canvas needed)

### Event Logging
- [x] Logs action changes with previous/new action and winner
- [x] Logs bullet fires and hits (when bullet-ship collision exists)
- [x] Logs ship-asteroid proximity (ship center within `2 × collisionRadius` of asteroid)
- [x] Logs AI score breakdowns on action change (all candidate scores)

### Detectors
- [x] **Oscillation detector**: flags when action changes occur faster than `HOLD_TIME`
- [x] **Asteroid pass-through detector**: flags when ship overlaps asteroid `collisionRadius` without dying (once ship-asteroid collision is implemented)
- [x] **Score collapse detector**: flags when all candidates score below a configurable threshold

### CLI Interface
- [x] `--games N` — number of games to run (default 100)
- [x] `--ticks N` — ticks per game (default 3600 = 60s at 60fps)
- [x] `--dt N` — simulation timestep in seconds (default 1/60)
- [x] `--seed N` — seed for reproducible random (optional, non-seeded by default)
- [x] `--verbose` — print per-game event logs (default: summary only)
- [x] `--detect list` — comma-separated detector names to enable
- [x] `--player-ai name` — player AI strategy (default: predictive, rejects 'human')
- [x] `--enemy-ai name` — enemy AI strategy (default: predictive)
- [x] `--density N` — asteroid density multiplier (default: 1.0)
- [x] `--speed N` — speed multiplier (default: 1.0)
- [x] `--thrust N` — thrust power (default: 2000)

### Output
- [x] Summary table to stdout: games played, events detected per type, win/loss ratio (once kills exist)
- [x] Per-game details when `--verbose`
- [x] Exit code 0 on success, 1 if any detector fired

### Visible
- [x] **Visible**: `node simulate.js --games 10 --verbose` runs 10 headless games in seconds, printing event logs and a summary table. No browser needed.

---

## Increment 27: Bullet-Ship Collision (One Kill)

**Goal**: Bullets destroy ships. One bullet = one kill.

**New modules**: `src/game.js`, `test/game.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [x] `checkBulletShipHit(bullet, ship)` returns true when bullet is within ship's `collisionRadius`
- [x] Ship `collisionRadius` defined at creation (based on ship size)
- [x] Player bullets hit enemy; enemy bullets hit player
- [x] Ship's own bullets cannot hit itself (filtered by `owner`)
- [x] One hit → `ship.alive = false`
- [x] Dead ship stops rendering and updating
- [x] Simple explosion effect on death (expanding wireframe circle or particle burst)
- [x] `createGameState()` tracks `{ phase }` — `'playing'`, `'playerWin'`, `'playerDead'`
- [x] Phase transitions on ship death
- [x] **Visible**: Ships can be destroyed by bullets. One shot = one kill. Explosion plays on death.

---

## Increment 28: Ship-Asteroid Collision

**Goal**: Asteroids are lethal obstacles.

**Modify**: `src/game.js`, `test/game.test.js`, `src/main.js`

**Acceptance Criteria**:
- [x] `checkShipAsteroidCollision(ship, asteroids)` returns first overlapping asteroid (circle-circle using `collisionRadius`)
- [x] Ship dies on asteroid contact (same death + explosion as bullet death)
- [x] Applies to both player and enemy
- [x] Asteroids unaffected (keep drifting)
- [x] **Visible**: Flying into an asteroid kills the ship. Asteroids become environmental hazards during the dogfight.

---

## Increment 29: Game State, HUD, and Restart

**Goal**: Complete game loop with win/lose/draw/restart, grace period, end screen, and AI auto-restart.

**Modify**: `src/font.js` (new), `test/font.test.js` (new), `src/game.js`, `test/game.test.js`, `src/input.js`, `test/input.test.js`, `src/main.js`

**Acceptance Criteria**:
- [x] Game phases: `'playing'` → `'ending'` (grace period) → `'playerWin'` / `'playerDead'` / `'draw'`
- [x] Grace period (1s): collisions remain active after first death (anti-kamikaze); if both die during grace, resolves to `'draw'`
- [x] Vector stroke font module (`src/font.js`): polyline glyphs on 4×6 grid, A–Z, 0–9, space, punctuation
- [x] HUD text in screen-space: "YOU WIN" (blue `#508CFF`), "YOU LOST" (red `#FF321E`), or "DRAW" (white)
- [x] "PRESS SPACE" shown below result text (50% alpha)
- [x] End screen overlay: semi-transparent black (60%), hides ships/trails/bullets, asteroids still visible
- [x] HUD and overlay only appear in terminal phases (not during `'playing'` or `'ending'`)
- [x] Controls disabled during terminal phases
- [x] Space key restarts: ships respawn, bullets cleared, spawn zones cleared (45px = 3× ship size), phase resets
- [x] On player death: camera freezes at death position
- [x] On enemy death: camera continues following player
- [x] AI-vs-AI auto-restart: when player is not human, auto-restarts 2s after terminal phase
- [x] **Visible**: Complete game loop — fight, win/lose/draw, see result, restart and play again

---

## Increment 30: Per-Ship Intelligence Settings

**Goal**: Each ship gets its own intelligence dropdown — enabling human-vs-AI, AI-vs-AI, or any combination. Replaces the single `aiStrategy` setting with `playerIntelligence` and `enemyIntelligence`.

**Modify**: `src/settings.js`, `test/settings.test.js`, `src/main.js`, `test/main.test.js`

**Acceptance Criteria**:

### Settings (`src/settings.js`)
- [x] `aiStrategy` removed from `SETTINGS_CONFIG`
- [x] `playerIntelligence` added: options `['human', 'reactive', 'predictive']`, default `'human'`, label `'Player'`
- [x] `enemyIntelligence` added: options `['reactive', 'predictive']`, default `'predictive'`, label `'Enemy AI'`
- [x] `createSettings()` defaults: `playerIntelligence='human'`, `enemyIntelligence='predictive'`
- [x] `saveSettings` persists both new settings (not `aiStrategy`)
- [x] `loadSettings` validates enum values for both new settings
- [x] `loadSettings` backward compat: if localStorage has old `aiStrategy` but no `enemyIntelligence`, migrates `aiStrategy` value to `enemyIntelligence`

### Main loop (`src/main.js`)
- [x] Enemy uses `getStrategy(settings.enemyIntelligence)` (replaces `settings.aiStrategy`)
- [x] Player uses keyboard input when `playerIntelligence='human'` (current behavior)
- [x] Player uses AI strategy when `playerIntelligence` is `'reactive'` or `'predictive'`
- [x] Changing `enemyIntelligence` dropdown swaps enemy strategy and resets AI state
- [x] Changing `playerIntelligence` dropdown swaps between keyboard/AI control and resets player AI state
- [x] Camera always follows player ship (no change needed)

### Visible
- [x] **Visible**: Settings panel shows "Player" dropdown (human/reactive/predictive) and "Enemy AI" dropdown (reactive/predictive). Human mode = keyboard control. Switching to reactive/predictive makes the player ship autonomous. Enemy AI dropdown works as before.

---

## Increment 30b: Predictive-Optimized AI Clone

**Goal**: Create a fully decoupled clone of the predictive AI for autonomous iterative optimization. A separate development context can freely modify `ai-predictive-optimized.js` without risk of breaking any existing module. See SPEC §12.7.

**New modules**: `src/ai-predictive-optimized.js`, `test/ai-predictive-optimized.test.js`
**Modified**: `src/ai.js`, `src/settings.js`

**Acceptance Criteria**:

### Clone
- [x] `src/ai-predictive-optimized.js` exists as a copy of `ai-predictive.js`
- [x] Exports renamed: `predictiveOptimizedStrategy`, `createPredictiveOptimizedState`, `updatePredictiveOptimizedAI`
- [x] All constants duplicated locally (including `FIRE_ANGLE` and `MAX_FIRE_RANGE` — no imports from `ai-reactive.js`)
- [x] Only external imports: `THRUST_POWER`, `SHIP_SIZE`, `updateShip` from `./ship.js`, `fmtAction` from `./debug.js`, and `registerStrategy` from `./ai-core.js`

### Registration
- [x] `ai.js` imports `./ai-predictive-optimized.js` (side-effect import triggers self-registration)
- [x] Clone self-registers via `registerStrategy('predictive-optimized', predictiveOptimizedStrategy)`
- [x] `getStrategy('predictive-optimized')` returns the optimized strategy

### Settings
- [x] `playerIntelligence` options: `['human', 'reactive', 'predictive', 'predictive-optimized']`
- [x] `enemyIntelligence` options: `['reactive', 'predictive', 'predictive-optimized']`

### Tests
- [x] `test/ai-predictive-optimized.test.js` exists with all tests from `ai-predictive.test.js`
- [x] All imports point to `../src/ai-predictive-optimized.js` (not ai-predictive)
- [x] All tests pass independently

### Build
- [x] `npm run build` includes the new module (auto-discovered by `build.js`)

### Decoupling Verification
- [x] Deleting `ai-predictive-optimized.js` breaks nothing except its own tests and the 'predictive-optimized' strategy registration
- [x] Modifying constants in `ai-predictive-optimized.js` does not change behavior of `ai-reactive.js` or `ai-predictive.js`

### Visible
- [x] **Visible**: Settings panel shows "predictive-optimized" in both Player and Enemy AI dropdowns. Selecting it runs the cloned predictive AI. `node simulate.js --games 1 --ticks 100 --enemy-ai predictive-optimized` runs without error.

---

# Phase 3: Deep Reinforcement Learning

Increments 31–37 add a third intelligence type — a neural network trained via deep reinforcement learning (PPO). The agent is trained offline in Python using the headless simulator, exported to ONNX, and runs inference client-side in the browser. No backend services required. See SPEC §16 for full architecture.

**Prerequisites**: Increments 26d (Headless Simulator), 27 (Bullet-Ship Collision), 28 (Ship-Asteroid Collision), 29 (Game State/HUD/Restart) must be complete — the training environment needs death/win signals and a functional headless simulator.

**Dependency chain**: 31 → 32 → 33 → 34 → 35 → 36 → 37

---

## Increment 31: Observation Builder ✅

**Goal**: Shared module that converts raw game state into ego-centric normalized observation vectors. Used identically by both the training bridge (Node.js) and browser inference (`ai-neural.js`).

**New modules**: `src/observation.js`, `test/observation.test.js`

**Acceptance Criteria**:

### Observation Function
- [x] `buildObservation(ship, target, asteroids, k)` returns a flat `Float32Array` of length `OBSERVATION_SIZE`
- [x] `OBSERVATION_SIZE` (36) exported as a constant
- [x] `MAX_ASTEROID_OBS` (8) exported — the k value for nearest-asteroid slots

### Self State (6 floats)
- [x] Index 0: speed normalized by `MAX_SPEED` → [0, 1]
- [x] Index 1: velocity angle relative to heading, normalized by π → [-1, 1]
- [x] Index 2: `thrustIntensity` → [0, 1] (direct copy)
- [x] Index 3: rotation direction → {-1, 0, 1} (from `rotatingLeft`/`rotatingRight` flags)
- [x] Index 4: alive → {0, 1}
- [x] Index 5: fire cooldown fraction → [0, 1] (`cooldown / FIRE_COOLDOWN`)

### Target State (6 floats)
- [x] Index 6: relative distance normalized by 1000px, clamped to [0, 1]
- [x] Index 7: relative bearing (angle from heading to target) normalized by π → [-1, 1]
- [x] Index 8: relative heading difference normalized by π → [-1, 1]
- [x] Index 9: closing speed normalized by `MAX_SPEED` → [-1, 1]
- [x] Index 10: lateral speed normalized by `MAX_SPEED` → [-1, 1]
- [x] Index 11: target alive → {0, 1}

### Asteroid Observations (24 floats, k=8 × 3)
- [x] For each of the k=8 nearest asteroids: relative distance (normalized by 1000px), relative bearing (normalized by π), relative approach speed (normalized by 200)
- [x] Asteroids sorted by distance from ship (nearest first)
- [x] Zero-padded when fewer than k asteroids are present
- [x] Asteroids beyond 1000px distance are excluded before selecting nearest k

### Quality
- [x] Pure function — no mutation of inputs, no side effects
- [x] All values clamped to their documented ranges (no NaN, no Infinity)
- [x] Handles edge cases: zero velocity ship, dead target, empty asteroid array, ship at origin

### Tests
- [x] Empty asteroids array → asteroid slots all zero
- [x] Single asteroid → first 3 slots filled, rest zero
- [x] More than k asteroids → only nearest k selected
- [x] Dead target → alive=0, other target fields still computed
- [x] Zero velocity ship → speed=0, velocity angle=0
- [x] Various headings → bearing computation correct at 0, π/2, π, -π/2
- [x] Normalization bounds verified for extreme inputs

### Visible
- [x] **Visible**: `import { buildObservation } from './observation.js'` produces a 36-float vector from any game state. Verified via test suite — no browser needed.

---

## Increment 32: Reward Function ✅

**Goal**: Configurable dense reward function for training. Per-step rewards provide gradient signal for learning basic behaviors (aim, pursue, evade) much faster than sparse win/loss alone.

**New modules**: `src/reward.js`, `test/reward.test.js`

**Acceptance Criteria**:

### Reward Function
- [x] `computeReward(prevState, currentState, action, config)` returns a single float
- [x] `prevState` and `currentState` each contain: `{ ship, target, asteroids, shipHP, targetHP, tick }`
- [x] `action` contains: `{ moveAction, fireAction }` (the agent's chosen actions this step)
- [x] `config` contains: `{ rewardWeights, maxTicks, shipHP: initialHP }`

### Reward Components (see SPEC §16.7)
- [x] **Survival**: `+weights.survival` per step (while agent alive)
- [x] **Aim alignment**: `+weights.aim × cos(angle_to_target)` when distance < 600px
- [x] **Closing distance**: `+weights.closing × Δdistance / 1000` when closing (positive Δ)
- [x] **Hit landed**: `+weights.hit` when `currentState.targetHP < prevState.targetHP`
- [x] **Got hit**: `weights.gotHit` (negative) when `currentState.shipHP < prevState.shipHP`
- [x] **Near-miss**: `weights.nearMiss × (1 - dist/dangerRadius)²` when within 3× any asteroid's `collisionRadius`
- [x] **Fire discipline**: `weights.firePenalty` (negative) when `fireAction === 1`

### Terminal Rewards
- [x] **Win**: `+weights.win` when `currentState.targetHP <= 0`
- [x] **Loss**: `weights.loss` (negative) when `currentState.shipHP <= 0`
- [x] **Draw**: `weights.draw` (negative) when both `currentState.shipHP <= 0` AND `currentState.targetHP <= 0` (stacks with win+loss)
- [x] **Timeout**: `weights.timeout` (negative) when `currentState.tick >= config.maxTicks`

### Defaults
- [x] `DEFAULT_REWARD_WEIGHTS` exported with values from SPEC §16.7: `{ survival: 0.001, aim: 0.01, closing: 0.01, hit: 1.0, gotHit: -1.0, nearMiss: -0.1, firePenalty: -0.002, win: 5.0, loss: -5.0, draw: -2.0, timeout: -1.0 }`

### Quality
- [x] Pure function — no mutation, no side effects
- [x] Returns 0.0 when agent is dead (no posthumous rewards)
- [x] Handles missing/undefined fields gracefully (defaults to 0 contribution)

### Tests
- [x] Each reward component tested individually (one component active, others zeroed)
- [x] Combined reward with all components active
- [x] Terminal conditions: win, loss, timeout
- [x] Edge cases: zero distance to target, dead ships, no asteroids, max-range asteroid
- [x] Custom weights override defaults correctly
- [x] Dead agent returns 0.0

### Visible
- [x] **Visible**: `import { computeReward } from './reward.js'` computes dense rewards from any pair of game states. Verified via test suite.

---

## Increment 33: Training Environment (GameEnv) ✅

**Goal**: Gym-style `GameEnv` class wrapping the headless game simulation with `reset()` / `step()` interface. Supports training-mode configuration (multi-HP, episode timeout, curriculum knobs).

**New modules**: `src/game-env.js`, `test/game-env.test.js`

**Acceptance Criteria**:

### GameEnv Class
- [x] `new GameEnv()` creates an environment instance (no config needed at construction)
- [x] `env.reset(config)` initializes a new episode and returns initial observation (`Float32Array`)
- [x] `env.step(moveAction, fireAction)` returns `{ observation, reward, done, info }`
- [x] `observation` is a `Float32Array` of length `OBSERVATION_SIZE` (from observation builder)
- [x] `reward` is a float (from reward function)
- [x] `done` is a boolean
- [x] `info` is an object: `{ winner, ticksElapsed, hitsLanded, hitsTaken, asteroidsHit }`

### Training-Mode Config (reset parameter)
- [x] `shipHP` (default 1): agent and opponent starting HP
- [x] `maxTicks` (default 3600): episode timeout
- [x] `asteroidDensity` (default 1.0): asteroid density multiplier
- [x] `enemyPolicy` (default `'predictive'`): opponent strategy name (`'static'`/`'reactive'`/`'predictive'`)
- [x] `enemyShoots` (default true): whether opponent fires bullets
- [x] `spawnDistance` (default 500): initial distance between ships
- [x] `spawnFacing` (default true): ships face each other at spawn
- [x] `rewardWeights` (default `DEFAULT_REWARD_WEIGHTS`): reward function config

### HP System
- [x] Ships have `hp` field initialized from `config.shipHP`
- [x] Each bullet hit decrements target's HP by 1
- [x] Each asteroid collision decrements ship's HP by 1
- [x] Ship dies (`alive = false`) when HP reaches 0
- [x] HP system is internal to GameEnv — does not modify the core `ship.js` module

### Action Mapping
- [x] `moveAction` (0–9) maps to control flags per SPEC §16.3 action table
- [x] `fireAction` (0 or 1) maps to `ship.fire` flag
- [x] Invalid action indices throw an error

### Episode Termination
- [x] Episode ends when agent HP reaches 0 → `info.winner = 'opponent'`
- [x] Episode ends when opponent HP reaches 0 → `info.winner = 'agent'`
- [x] Episode ends when `ticksElapsed >= maxTicks` → `info.winner = 'timeout'`

### Opponent Behavior
- [x] `'static'` policy: opponent does nothing (all control flags false)
- [x] `'reactive'` / `'predictive'`: opponent uses corresponding registered strategy
- [x] `enemyShoots: false` suppresses opponent's `fire` flag regardless of policy

### Simulation Per Step
- [x] One step = one simulation tick (fixed dt = 1/60)
- [x] Step applies: agent action → opponent AI → `updateShip` both → bullet update → bullet-ship collisions → ship-asteroid collisions → `updateSimulation` (asteroids)
- [x] Camera updated for asteroid spawning zone computation

### Tests
- [x] `reset()` returns valid observation of correct length
- [x] `step()` returns correct shape `{ observation, reward, done, info }`
- [x] Episode terminates on agent death (HP reaches 0)
- [x] Episode terminates on opponent death
- [x] Episode terminates on timeout
- [x] HP decrements on bullet hit
- [x] HP decrements on asteroid collision
- [x] Action mapping: each of 10 move actions sets correct control flags
- [x] Static enemy doesn't move or shoot
- [x] `enemyShoots: false` suppresses enemy fire
- [x] `spawnFacing: true` spawns ships facing each other
- [x] Multiple sequential episodes (reset → play → reset → play) work correctly

### Visible
- [x] **Visible**: `const env = new GameEnv(); env.reset({ shipHP: 5 }); env.step(0, 0);` runs a training step. Verified via test suite.

---

## Increment 34: Python Bridge ✅

**Goal**: stdin/stdout JSON-lines protocol so Python training scripts can drive the GameEnv at maximum speed. Node.js process acts as a game server, Python sends commands and receives observations.

**Modify**: `simulate.js` (add `--bridge` mode)
**New modules**: `test/bridge.test.js`

**Acceptance Criteria**:

### Bridge Mode
- [x] `node simulate.js --bridge` enters bridge mode: reads JSON commands from stdin, writes JSON responses to stdout
- [x] Bridge mode does not print any other output to stdout (all diagnostics go to stderr)
- [x] One JSON object per line (newline-delimited JSON-lines format)

### Commands
- [x] `{ "command": "reset", "config": {...} }` → calls `env.reset(config)`, responds with `{ "observation": [0.5, -0.3, ...] }`
- [x] `{ "command": "step", "action": N, "fire": 0 }` → calls `env.step(action, fire)`, responds with `{ "observation": [...], "reward": 0.05, "done": false, "info": {...} }`
- [x] `{ "command": "close" }` → responds with `{ "status": "closed" }` and exits process cleanly
- [x] `step` before `reset` returns `{ "error": "Environment not initialized. Call reset first." }`
- [x] Invalid JSON returns `{ "error": "Invalid JSON: <parse error>" }`
- [x] Unknown command returns `{ "error": "Unknown command: <name>" }`
- [x] Invalid action index returns `{ "error": "Invalid action: <details>" }`

### Performance
- [x] No buffering issues with rapid sequential commands (flushes stdout after each response)
- [x] Process exits with code 0 on `close` command
- [x] Process exits with code 1 on uncaught error (with error message to stderr)

### Backward Compatibility
- [x] Existing `simulate.js` CLI modes (`--games`, `--verbose`, etc.) unchanged
- [x] `--bridge` and `--games` are mutually exclusive (error if both provided)

### Tests
- [x] Command parsing: valid reset, step, close
- [x] Error handling: invalid JSON, unknown command, step before reset
- [x] Action validation: out-of-range action index
- [x] Response format matches documented schema
- [x] (Integration test if feasible: spawn Node process, send commands via stdin, verify responses)

### Visible
- [x] **Visible**: `echo '{"command":"reset","config":{}}' | node simulate.js --bridge` outputs a JSON observation. Manual pipe testing confirms the protocol works.

---

## Increment 35: Python Training Scaffold

**Goal**: Minimal Python training infrastructure — Gymnasium wrapper that communicates with the Node.js bridge, PPO training script with curriculum support, and ONNX export tool.

**New files**: `training/requirements.txt`, `training/env.py`, `training/train.py`, `training/export_onnx.py`, `training/config.yaml`

**Acceptance Criteria**:

### Gymnasium Wrapper (`training/env.py`)
- [ ] `SpaceDogfightEnv(gymnasium.Env)` class
- [ ] `__init__` spawns `node simulate.js --bridge` as a subprocess
- [ ] `reset()` sends reset command with current stage config, returns observation as `np.ndarray`
- [ ] `step(action)` sends step command, returns `(observation, reward, terminated, truncated, info)`
- [ ] `close()` sends close command and terminates subprocess
- [ ] `observation_space = gymnasium.spaces.Box(low=-1, high=1, shape=(36,), dtype=np.float32)`
- [ ] `action_space = gymnasium.spaces.MultiDiscrete([10, 2])` (movement + fire)
- [ ] Handles subprocess crashes gracefully (auto-restart on next reset)

### Training Script (`training/train.py`)
- [ ] PPO training using Stable Baselines3
- [ ] `--stage N` argument selects curriculum stage (1–5) from config.yaml
- [ ] `--episodes N` argument sets training duration
- [ ] `--checkpoint path` argument resumes from a saved model
- [ ] `--num-envs N` argument controls parallel environments (default 8)
- [ ] Saves checkpoints to `training/checkpoints/stage{N}/` directory
- [ ] Logs training metrics (reward, win rate, episode length) to stdout
- [ ] Promotes to next stage when win rate exceeds threshold from config

### ONNX Export (`training/export_onnx.py`)
- [ ] `--checkpoint path` argument specifies the PyTorch model to export
- [ ] `--output path` argument specifies output ONNX file (default `models/policy.onnx`)
- [ ] Exports with correct input shape `(1, 36)` and two output heads
- [ ] Validates exported ONNX model loads correctly

### Config (`training/config.yaml`)
- [ ] 5 curriculum stages with parameters matching SPEC §16.8
- [ ] Per-stage: `shipHP`, `maxTicks`, `asteroidDensity`, `enemyPolicy`, `enemyShoots`, `spawnDistance`, `spawnFacing`, `rewardWeights`, `promotionThreshold`
- [ ] PPO hyperparameters: learning rate, batch size, n_steps, n_epochs, gamma, clip range

### Dependencies (`training/requirements.txt`)
- [ ] `stable-baselines3`, `gymnasium`, `torch`, `onnx`, `pyyaml`, `numpy`

### Validation
- [ ] `pip install -r training/requirements.txt` succeeds
- [ ] `python training/train.py --stage 1 --episodes 100 --num-envs 1` runs without error and produces a checkpoint
- [ ] `python training/export_onnx.py --checkpoint <path>` produces a valid `.onnx` file

### Visible
- [ ] **Visible**: Running `python training/train.py --stage 1 --episodes 100` trains an agent on stage 1 (stationary target), printing reward progress. Export produces a `policy.onnx` file.

---

## Increment 35b: Training Tooling (Best-Model Checkpointing, Live Dashboard, Hyperparameter Fixes)

**Goal**: Improve training observability and resilience. Stage 3 training took ~13 hours with win rates oscillating at ~55-60% — hitting 80% was a lucky streak on the 100-episode window. These tools let you monitor convergence in real time, save the best intermediate model, and resume training without losing progress. See SPEC §16.10.

**Modify**: `training/train_v3.py`, `training/config.yaml`, `.gitignore`
**New files**: `training/dashboard.html`

**Acceptance Criteria**:

### Config Improvements (`config.yaml`)
- [x] `batch_size` changed from 64 to 256 (reduces gradient noise with 4-env × 2048-step buffer)
- [x] `learning_rate` changed from 3e-4 to 1e-4 (finer updates for fine-tuning across stages)
- [x] Curriculum restructured: stage 4 = predictive enemy only, stage 5 = predictive + asteroids, stage 6 = full game
- [x] `frameSkip`, `aiHoldTime`, `aiSimSteps` forwarded from config to bridge (was missing)

### Window Size CLI Arg (`train_v3.py`)
- [x] New `--window-size` argument (default 200, was hardcoded 100)
- [x] Passed through `train_stage()` to `WinRateCallback`
- [x] Printed in the stage header alongside other config

### Best-Model Checkpointing (`train_v3.py`)
- [x] `BestModelCallback` class reads from `WinRateCallback` (no duplicate counting)
- [x] Every 50 episodes, checks if rolling win rate > best seen so far
- [x] Saves `best.zip` + `best_meta.json` to checkpoint dir when new best found
- [x] `best_meta.json` contains: `{ win_rate, episodes, step, timestamp }`
- [x] Prints `[BEST] New best model! win_rate=XX%` when saving
- [x] Resume works via `--checkpoint training/checkpoints/stage3/best.zip`

### JSONL Logging (`train_v3.py`)
- [x] `JsonLogCallback` appends to `training/logs/stageN.jsonl` every ~10s
- [x] Each line: `{ ts, step, episodes, win_rate, mean_reward, best_wr, stage }`
- [x] Also writes `training/logs/dashboard_data.js` (JS variable assignment)
- [x] Loads existing JSONL entries on startup (data persists across restarts)
- [x] `best_wr` reads directly from `BestModelCallback.best_win_rate` (stays in sync with stdout)

### Live Dashboard (`training/dashboard.html`)
- [x] Self-contained HTML with Chart.js from CDN
- [x] Two charts: Win Rate (with best WR + 80% threshold lines) and Mean Reward
- [x] Header stats: Stage, Episodes, Steps, Current WR, Best WR
- [x] Auto-refreshes every 15s via script tag injection (cache-busted)
- [x] Dark theme, monospace font
- [x] Served via `python -m http.server 8080 --directory training`

### Export Script Fixes (`export_onnx.py`)
- [x] Windows cp1252 Unicode crash fixed (PyTorch emoji in ONNX exporter)
- [x] ONNX opset version bumped from 17 to 18 (minimum supported by current PyTorch)

### Asteroid Density Slider
- [x] Minimum changed from 0.5 to 0.0
- [x] Setting density to 0.0 immediately removes all asteroids (trim in main.js game loop)

### Enemy Spawn
- [x] Spawn distance tightened to 1000–1100px (just off-screen at 1920×1080)
- [x] Enemy heading randomized (was facing away from player)
- [x] Both initial spawn and restart use same logic

### Gitignore
- [x] `training/logs/` added to `.gitignore`

### Validation
- [x] `python training/train_v3.py --help` shows `--window-size` with default 200
- [x] Training runs produce `best.zip`, `best_meta.json`, JSONL logs, and dashboard data
- [x] Dashboard renders charts when served via HTTP

---

## Increment 36: Neural Strategy (Browser Inference)

**Goal**: `ai-neural.js` pluggable strategy that loads an ONNX model and runs inference client-side in the browser at 60fps.

**New modules**: `src/ai-neural.js`, `test/ai-neural.test.js`

**Acceptance Criteria**:

### Strategy Interface
- [x] `neuralStrategy = { createState, update }` exported — follows the pluggable strategy interface
- [x] Registered as `'neural'` in the strategy registry (via `ai.js`)

### createState
- [x] Returns `{ session, inputBuffer, ready, fallbackStrategy }` object
- [x] Loads ONNX Runtime Web from CDN (`<script>` tag) if not already loaded
- [x] Creates `ort.InferenceSession` from `models/policy.onnx`
- [x] Allocates reusable `Float32Array` input buffer (size `OBSERVATION_SIZE`)
- [x] Sets `ready = true` once model is loaded; `ready = false` while loading
- [x] On load failure: sets `fallbackStrategy` to predictive strategy, logs warning

### update
- [x] When `ready`: builds observation via `buildObservation()` → runs ONNX inference → reads outputs
- [x] Movement output: argmax of 10-way softmax → maps to control flags per SPEC §16.3
- [x] Fire output: sigmoid > 0.5 → `ship.fire = true`
- [x] When not `ready` (model still loading or failed): delegates to `fallbackStrategy.update()`
- [x] Inference time < 1ms per call (MLP forward pass on 36 floats)

### Action Mapping
- [x] Action index 0–9 maps to the same control flag combinations as GameEnv (SPEC §16.3)
- [x] `ACTION_MAP` array exported for shared use with GameEnv

### Shared Code
- [x] Uses `buildObservation()` from `src/observation.js` — identical normalization as training
- [x] Uses `ACTION_MAP` from a shared location (avoid duplication with `game-env.js`)

### Tests
- [x] Mock ONNX session: verify observation is built correctly and passed to session
- [x] Verify action mapping: each index 0–9 produces correct control flag combination
- [x] Verify fire decision: sigmoid > 0.5 → fire, ≤ 0.5 → no fire
- [x] Verify fallback: when `ready = false`, predictive strategy is called instead
- [x] Verify graceful handling when ONNX Runtime is not available (CDN blocked)

### Visible
- [x] **Visible**: With a trained `policy.onnx` file in `models/`, selecting "neural" from the intelligence dropdown makes the ship fly using the trained neural network. Without a model file, it silently falls back to predictive AI.

---

## Increment 37: Settings Integration + Model Loading

**Goal**: Add `'neural'` option to intelligence dropdowns and handle model loading gracefully.

**Modify**: `src/settings.js`, `src/ai.js`, `src/main.js`, `build.js`

**Acceptance Criteria**:

### Settings Dropdowns
- [ ] `playerIntelligence` options: `['human', 'reactive', 'predictive', 'neural']`
- [ ] `enemyIntelligence` options: `['reactive', 'predictive', 'neural']`
- [ ] `'neural'` option persisted to `localStorage`
- [ ] Loading `'neural'` from `localStorage` when no model exists falls back gracefully (no crash)

### Strategy Registration (`ai.js`)
- [ ] Imports `neuralStrategy` from `ai-neural.js`
- [ ] Registers as `registerStrategy('neural', neuralStrategy)`

### Main Loop (`main.js`)
- [ ] Selecting `'neural'` from either dropdown works identically to selecting other strategies
- [ ] `getStrategy('neural')` returns the neural strategy
- [ ] Strategy `createState()` initiates async model loading
- [ ] While model loads, ship uses predictive fallback (no frozen frames)

### Build (`build.js`)
- [ ] Adds CDN `<script>` tag for ONNX Runtime Web in the production build
- [ ] CDN script is `defer` / `async` — does not block page load
- [ ] If `models/policy.onnx` exists at build time, includes a reference to it
- [ ] Build still succeeds when no model file exists

### Visible
- [ ] **Visible**: Settings panel shows "neural" option in both Player and Enemy AI dropdowns. Selecting it loads the neural model (if available) or silently falls back to predictive. No errors in console when model is missing.

## Increment 38: Asteroid Danger Zone Overlay

**Goal**: Visualize the near-miss penalty field around asteroids as red transparent halos, helping tune reward weights and debug RL agent asteroid avoidance behavior.

**Modify**: `src/reward.js`, `src/settings.js`, `src/main.js`, `test/settings.test.js`, `test/reward.test.js`

**Acceptance Criteria**:

### Reward Export
- [ ] `NEAR_MISS_RADIUS_FACTOR` is exported from `src/reward.js` (value = 3)
- [ ] Existing reward calculation still uses the same constant (no duplication)

### Settings
- [ ] `SETTINGS_CONFIG.showDangerZones` exists with `type: 'boolean'`, `default: false`, `label: 'Danger Zones'`
- [ ] `createSettings()` includes `showDangerZones: false` by default
- [ ] `saveSettings()` persists `showDangerZones` to localStorage
- [ ] `loadSettings()` restores `showDangerZones` from localStorage (falls back to `false`)
- [ ] Checkbox renders in settings panel

### Overlay Rendering (`main.js`)
- [ ] When `settings.showDangerZones` is true, draws red radial gradient around each asteroid
- [ ] Gradient inner radius = `asteroid.collisionRadius`, outer radius = `NEAR_MISS_RADIUS_FACTOR × collisionRadius`
- [ ] Gradient: `rgba(255, 0, 0, 0.25)` at inner edge → transparent at outer edge
- [ ] Uses `'lighter'` composite operation so overlapping zones stack additively
- [ ] Restores composite operation to `'source-over'` after drawing
- [ ] When `settings.showDangerZones` is false, no overlay drawing code executes (zero cost)

### Visible
- [ ] **Visible**: Toggle "Danger Zones" checkbox in settings → red halos appear around all asteroids, fading from the asteroid surface outward. Overlapping zones glow brighter. Turning it off removes all halos instantly.

---

## Increment 38b: Add Base Radius to Danger Zone Formula

**Goal**: Small asteroids (radius 10-24px) have tiny danger zones that the ship flies through too fast for the penalty to matter. Adding a constant base radius ensures every asteroid has a practical minimum avoidance buffer.

**Modify**: `src/reward.js`, `src/main.js`, `test/reward.test.js`, `SPEC.md`

**Acceptance Criteria**:

### Reward (`src/reward.js`)
- [x] `DANGER_RADIUS_BASE` constant exported with value 40
- [x] Danger radius formula: `NEAR_MISS_RADIUS_FACTOR × collisionRadius + DANGER_RADIUS_BASE`
- [x] `NEAR_MISS_RADIUS_FACTOR` export unchanged (still 3)

### Overlay (`src/main.js`)
- [x] `DANGER_RADIUS_BASE` imported from `reward.js`
- [x] Overlay uses same formula as reward: `NEAR_MISS_RADIUS_FACTOR × collisionRadius + DANGER_RADIUS_BASE`

### Tests (`test/reward.test.js`)
- [x] `DANGER_RADIUS_BASE` export test: value equals 40
- [x] Near-miss tests updated with correct expected values for new formula
- [x] All existing reward tests pass

---

## Increment 38c: Death Cause Observability

**Goal**: Track how ships die (bullet, asteroid, or timeout) and distinguish mutual kills. Pure instrumentation — no observation/reward/model changes.

**Modify**: `src/game-env.js`, `test/game-env.test.js`, `training/train_v3.py`, `training/dashboard.html`, `SPEC.md`

**Acceptance Criteria**:

### Death Cause Tracking (`src/game-env.js`)
- [x] `_agentDeathCause` and `_opponentDeathCause` fields initialized to `null` in `reset()`
- [x] Cause set to `'bullet'` when HP reaches 0 from bullet hit (guard: `=== null`)
- [x] Cause set to `'asteroid'` when HP reaches 0 from asteroid hit (guard: `=== null`)
- [x] First lethal source wins (bullets processed before asteroids)
- [x] Causes remain `null` for surviving ships and on timeout

### Mutual Kill (`src/game-env.js`)
- [x] Both HP ≤ 0 same tick → `winner = 'draw_mutual'` (replaces old agent-death-priority behavior)
- [x] `draw_mutual` maps to `terminated=True` in Python env (correct — it's not a timeout)

### Info Dict (`src/game-env.js`)
- [x] `info` object includes `agentDeathCause` and `opponentDeathCause` fields

### Tests (`test/game-env.test.js`)
- [x] `agentDeathCause` is `'bullet'` when killed by bullet
- [x] `agentDeathCause` is `'asteroid'` when killed by asteroid
- [x] `opponentDeathCause` is `'bullet'` / `'asteroid'` (mirror tests)
- [x] Death causes are `null` mid-episode
- [x] Death causes are `null` on timeout
- [x] First lethal hit wins with multi-HP
- [x] Both dying same tick → `winner = 'draw_mutual'`
- [x] Both death causes set on mutual kill
- [x] Mixed causes: asteroid kills agent + bullet kills opponent

### Training Script (`training/train_v3.py`)
- [x] `WinRateCallback` tracks `outcome_details` list (`'win'`/`'loss'`/`'draw_mutual'`/`'timeout'`)
- [x] `WinRateCallback` tracks `agent_asteroid_deaths` and `opponent_asteroid_deaths` counters
- [x] `_outcome_breakdown(window)` helper returns rolling percentages
- [x] Progress prints include outcome breakdown and asteroid death count
- [x] JSONL entries include `outcome_breakdown`, `agent_asteroid_deaths`, `opponent_asteroid_deaths`

### Dashboard (`training/dashboard.html`)
- [x] New stat cards: "Draw %" and "Ast Deaths"
- [x] Third chart: outcome breakdown over time (win/loss/draw/timeout lines)
- [x] Backward compat: old entries without new fields show `—`

---

## Increment 39: Self-Play Opponent (Stage 9)

**Goal**: Add a self-play training stage where the agent fights a frozen ONNX snapshot of its own neural policy. Uses `onnxruntime-node` for inference in the Node.js bridge process.

**New modules**: `src/ai-neural-node.js`, `test/ai-neural-node.test.js`
**Modify**: `src/game-env.js`, `simulate.js`, `training/config.yaml`, `training/train_v3.py`, `training/export_onnx.py`, `package.json`, `SPEC.md`

**Acceptance Criteria**:

### Node.js Neural Strategy (`src/ai-neural-node.js`)
- [x] `selfPlayStrategy = { createState, update }` exported — follows pluggable strategy interface
- [x] Registered as `'self-play'` in the strategy registry
- [x] `createState(config)` extracts `config.selfPlayModelPath`, fires async model load
- [x] `createState()` works with no config (fallback mode, `modelPath` is null)
- [x] State has all expected fields: `modelPath`, `session`, `inputBuffer`, `ready`, `loadAttempted`, `pendingInference`, `cachedAction`, `fallbackStrategy`, `fallbackState`
- [x] `inputBuffer` is `Float32Array` of size `OBSERVATION_SIZE`
- [x] Falls back to `predictive-optimized` while model loads or if load fails
- [x] Uses `argmax`, `decodeActions`, `applyMoveAction` from `ai-neural.js` (no duplication)
- [x] Uses `buildObservation` from `observation.js`
- [x] Uses dynamic `import('onnxruntime-node')` — only loaded in Node.js context
- [x] Async inference: fire-and-forget pattern, caches result, applies on next update call

### GameEnv Config Passthrough (`src/game-env.js`)
- [x] `createState(config)` receives the full episode config (1-line change)
- [x] Backward-compatible: existing strategies ignore the config parameter

### Bridge Integration (`simulate.js`)
- [x] `ai-neural-node.js` dynamically imported in bridge mode only
- [x] Import wrapped in try-catch (graceful when `onnxruntime-node` not installed)

### Training Config (`training/config.yaml`)
- [x] Stage 9 added with `enemyPolicy: "self-play"`, `promotionThreshold: 0.60`
- [x] `selfPlayModelPath` points to `training/checkpoints/selfplay/opponent_snapshot.onnx`

### Training Script (`training/train_v3.py`)
- [x] `selfPlayModelPath` included in `env_config` key list
- [x] Auto-promote loop extended to include stage 9 (`range(args.stage, 10)`)
- [x] Snapshot export on promotion to stage 9: exports ONNX from stage 8 final checkpoint

### Export Script (`training/export_onnx.py`)
- [x] `export_onnx()` accepts optional `validate=True` parameter
- [x] When `validate=False`, skips onnx checker and onnxruntime validation (faster for snapshot export)

### Dependencies (`package.json`)
- [x] `onnxruntime-node` added as production dependency

### Tests (`test/ai-neural-node.test.js`)
- [x] Strategy interface: has `createState` and `update` methods
- [x] Registered as `'self-play'` via `getStrategy`
- [x] `createState(config)` returns all expected fields
- [x] `createState({})` works with no model path (fallback mode)
- [x] `createState()` works with no config argument
- [x] Extracts `selfPlayModelPath` from config
- [x] Falls back when `ready=false`
- [x] Falls back when `ready=true` but `cachedAction=null`
- [x] Applies cached action correctly for all 10 movement indices
- [x] Applies fire decision from cached action
- [x] Kicks off inference when ready and not pending
- [x] Does not kick off inference when already pending

---

## Increment 40: Sim-to-Real Gap Fixes (Asteroid Count + Time-Based Action Hold)

**Goal**: Fix two mismatches between the training environment and the browser game that caused the trained neural agent to perform far worse in-game than its 90% training win rate suggested.

### Fix 1: Asteroid Count Mismatch

**Problem**: The browser applied a `zoneArea / viewportArea` scaling factor (~2.04×) to the asteroid target count, resulting in ~82 asteroids at density 1.0. The training environment (GameEnv) uses the simple formula `40 × density` = 40 asteroids. The agent was trained to navigate 40 asteroids but faced double that in-game.

**Changes**: `src/main.js`, `simulate.js`

**Acceptance Criteria**:
- [x] `main.js` per-frame target count uses `BASE_ASTEROID_COUNT * settings.asteroidDensity` (no zone area ratio)
- [x] `simulate.js` init and per-tick target count use `BASE_ASTEROID_COUNT * density` (no zone area ratio)
- [x] Unused `computeSpawnBounds` import removed from both files
- [x] At density 1.0, asteroid count is 40 (matches training exactly)
- [x] Density slider still scales linearly (density 2.0 → 80 asteroids)

### Fix 2: Time-Based Neural AI Action Hold

**Problem**: The neural AI used a frame-based counter (`frameTick++`, triggers at `FRAME_SKIP=2`) to decide when to request new inference. The speed multiplier setting scaled `dt` for all physics but the neural AI's decision rate was fixed per-frame. At speed 2.0, the agent held actions for twice as long in game-time (equivalent to `frameSkip=4`), making it half as responsive as trained. The enemy's predictive AI used a time-based hold timer, so it was unaffected — giving it an unfair advantage at non-1.0 speeds.

**Changes**: `src/ai-neural.js`, `test/ai-neural.test.js`

**Acceptance Criteria**:
- [x] `FRAME_SKIP` constant replaced with `ACTION_HOLD_TIME = 2 / 60` (game-time seconds)
- [x] `frameTick` counter replaced with `holdTimer` (decremented by `dt` each frame)
- [x] New inference requested when `holdTimer <= 0` (same as predictive AI pattern)
- [x] At speed 1.0 (60fps): decisions every ~2 frames = 1/30s game-time (matches training)
- [x] At speed 2.0: decisions every ~1 frame = 1/30s game-time (speed is pure time warp)
- [x] At speed 0.5: decisions every ~4 frames = 1/30s game-time (speed is pure time warp)
- [x] All existing tests updated and passing
- [x] SPEC.md updated: §1.5, §5.2 (asteroid count formula), §16.4, §16.6 (time-based hold)

---

## Increment 41: Game Log (W/L/D Statistics)

**Goal**: Add a toggleable game log that tracks wins, losses, and draws across matches, displaying aggregated statistics on the end screen so long AI-vs-AI sessions can be compared with training stats.

**Modules**: `src/game-log.js` (new), `src/settings.js`, `src/game.js`, `src/main.js`

**Acceptance Criteria**:
- [x] `gameLog` boolean setting (default: false) with "Game Log" label appears as checkbox in settings panel
- [x] Setting is persisted to localStorage and restored on reload
- [x] `createGameLog()` returns a log object with wins, losses, and draws (all zero)
- [x] `recordResult(log, phase)` increments the correct counter for `playerWin`, `playerDead`, and `draw`
- [x] `resetGameLog(log)` sets all counters back to zero
- [x] `formatGameLog(log)` returns a stats string with counts and percentages (e.g., `W:5 (50.0%)  L:3 (30.0%)  D:2 (20.0%)  N=10`)
- [x] `formatGameLog` handles zero total matches without division-by-zero
- [x] When enabled, the end screen HUD displays the formatted stats line below the "PRESS SPACE" text
- [x] When enabled, each match result is logged to the browser console as `[Game Log] W:N (X%)  L:N (X%)  D:N (X%)  N=total`
- [x] Stats accumulate across auto-restarts in AI-vs-AI mode
- [x] Log resets to zero when the checkbox is toggled off

---

## Increment 42: Proximity Reward

**Goal**: Replace engage penalty, camp check, and flat closing with an action-dependent proximity reward that naturally incentivizes close-range dogfighting.

**Modules**: `src/reward.js`, `training/config.yaml`

**Acceptance Criteria**:
- [x] `proximity: 0.0` added to `DEFAULT_REWARD_WEIGHTS` (default off, backward compatible)
- [x] `computeReward` isolates agent's own closing contribution (`agentClosing = prevDist - hypotheticalDist`)
- [x] Proximity formula: `proximity × agentClosing / prevDist` (fractional closing rate, distance-scaled)
- [x] Proximity is zero when agent doesn't move (enemy closing doesn't count)
- [x] Proximity is zero when agent retreats
- [x] Proximity is zero when weight is 0 (default)
- [x] Proximity gives more reward per closing unit at shorter distance (verify at two distances)
- [x] Proximity works at any distance (no hardcoded range cutoff)
- [x] Proximity handles prevDist = 0 (division-by-zero guard)
- [x] Config stages 11-13 updated: `proximity: 1.0`, `closing: 0.0`, `engagePenalty: 0.0`, `campCheckTicks: 0`
- [x] All existing tests pass (backward compatible)

---

## Increment 43: Evasion AI Strategy

**Goal**: Add an `evasion` strategy where the enemy navigates to waypoints biased away from the agent, creating flowing, unpredictable chase patterns. See SPEC §12.8.

**Modules**: `src/ai-predictive-optimized.js`, `src/settings.js`, `training/config.yaml`, `training/train_v3.py`

**Acceptance Criteria**:
- [x] `selectWaypoint` picks points biased away from agent (statistical test)
- [x] `selectWaypoint` returns `{ x, y, vx: 0, vy: 0, alive: true }`
- [x] `selectWaypoint` respects radius parameter
- [x] `evasionStrategy` registered as `'evasion'` and selectable in settings
- [x] `createState` returns correct defaults (weights, pursuitSign, canFire, waypoint, timer)
- [x] `createState` respects config overrides (radius, arrival dist, hold time, candidates)
- [x] Waypoint populated on first `update` call
- [x] Waypoint changes on arrival (ship within `EVASION_ARRIVAL_DIST`)
- [x] Waypoint changes on timer expiry (`EVASION_MAX_HOLD_TIME`)
- [x] Ship never fires (`ship.fire = false`)
- [x] Dead ship clears all flags
- [x] Config stages 14-15 updated to use `evasion` policy
- [x] `train_v3.py` passes evasion config keys to env
- [x] All existing tests pass

## Increment 44: Unify Asteroid Observation Pipeline

**Goal**: Guarantee the renderer highlights the exact asteroids the neural model observed by returning `selectedAsteroids` from `buildObservation` and storing it on AI state. See SPEC §16.2, §16.4.

**Modules**: `src/observation.js`, `src/ai-neural.js`, `src/ai-neural-node.js`, `src/game-env.js`, `src/main.js`

**Acceptance Criteria**:
- [ ] `buildObservation` returns `{ obs: Float32Array, selectedAsteroids: Set }`
- [ ] `selectedAsteroids` contains the same asteroid objects used to fill the observation vector
- [ ] `selectedAsteroids` is empty Set when no asteroids in range
- [ ] `selectedAsteroids` has correct count when fewer than k asteroids exist
- [ ] `getObservedAsteroids` is removed (no longer exported from `observation.js`)
- [ ] Neural AI state includes `observedAsteroids: null` initially
- [ ] `runInference` stores `selectedAsteroids` on state as `observedAsteroids`
- [ ] Renderer reads `observedAsteroids` from AI state (not recomputed)
- [ ] `GameEnv` callers use `.obs` for the Float32Array
- [ ] All existing tests pass (updated to destructure `{ obs }`)

## Increment 45: Safety Potential Reward Shaping

**Goal**: Replace penalty-based asteroid avoidance with potential-based reward shaping (Ng et al. 1999). Instead of punishing the agent for being in danger, reward it for *improving* its safety position. This preserves the optimal policy while providing dense, directional learning signal. See SPEC §16.7.

**Modules**: `src/reward.js`, `src/game-env.js`, `src/main.js`, `training/config.yaml`

**Acceptance Criteria**:
- [x] `computeSafetyPotential(ship, asteroids)` exported from `reward.js`
- [x] Returns 0 when no asteroids nearby, negative near asteroid paths
- [x] Continuous Gaussian field — no hard edges, smooth decay in all directions
- [x] Directional: elongated forward along velocity (decay=2.0), narrow perpendicular (decay=2.0), small halo behind (decay=8.0)
- [x] Size-independent — no reference to asteroid radius or collisionRadius
- [x] Uses same scale constants as corridor geometry (CORRIDOR_HALF_WIDTH, LOOKAHEAD_TIME, MIN_ASTEROID_SPEED)
- [x] `safetyShaping` added to `DEFAULT_REWARD_WEIGHTS` (default 0.0)
- [x] `computeReward` computes `safetyShaping × (currentΦ - prevΦ)` when weight ≠ 0
- [x] `_buildRewardState()` caches `safetyPotential` scalar on reward state
- [x] `_rewardBreakdown` includes `safetyShaping` component
- [x] Full-screen safety potential heatmap: evaluates Φ at every 8px cell across viewport, red for danger, green tint for safe areas
- [x] Heatmap uses `screenToWorld` inverse camera transform, drawn in screen space behind world objects
- [x] All existing tests pass (updated for new weight key)
- [x] New tests cover `computeSafetyPotential` (Gaussian geometry, edge cases, size-independence) and shaping reward (delta, scaling, breakdown)
