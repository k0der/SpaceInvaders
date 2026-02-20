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

## Increment 21: World-Relative Asteroid Spawning

**Goal**: Asteroids spawn/despawn relative to the camera viewport, creating an infinite field. Dynamic density scaling and burst spawning keep the viewport populated at all times.

**Modify**: `src/simulation.js`, `test/simulation.test.js`, `src/main.js`, `src/settings.js`, `test/settings.test.js`

**Acceptance Criteria**:
- [x] All simulation functions accept viewport bounds `{ minX, maxX, minY, maxY }` instead of `canvasWidth, canvasHeight`
- [x] `isOffScreen(asteroid, bounds)` despawns asteroids outside bounds + margin
- [x] `spawnAsteroidFromEdge(bounds, speedMultiplier)` spawns at bounds edges, aimed toward bounds center with ±30° spread
- [x] `spawnAsteroidInBounds(bounds, speedMultiplier)` spawns at random positions within bounds (for initial population and burst recovery)
- [x] `createSimulation(bounds, targetCount)` uses in-bounds spawning for immediate visibility
- [x] `updateSimulation(sim, dt, bounds)` receives current viewport bounds each frame
- [x] Burst spawning: when count < 75% of target, up to 5 asteroids/frame spawned within bounds
- [x] Staggered edge spawning for steady-state replenishment (max 1 per 0.3s)
- [x] `main.js` computes bounds from `getViewportBounds(camera, ...)` each frame
- [x] Dynamic target count: `BASE_ASTEROID_COUNT (40) × asteroidDensity × (boundsArea / viewportArea)`
- [x] "Asteroid Count" slider replaced with "Asteroid Density" multiplier (0.5x–3.0x, default 1.0x, step 0.1)
- [x] Density setting persisted to localStorage
- [x] Energy homeostasis unchanged (based on velocities, unaffected by coordinate system)
- [x] Collision physics unchanged (all in world-space)
- [x] **Visible**: Infinite asteroid field. Fly anywhere — asteroids always populate the viewport. No empty space when exploring new areas.

---

## Increment 22: Starfield Responds to Camera

**Goal**: Stars shift with parallax based on camera movement.

**Modify**: `src/starfield.js`, `test/starfield.test.js`, `src/main.js`

**Acceptance Criteria**:
- [ ] New function `updateStarLayersCamera(layers, cameraDeltaX, cameraDeltaY, cameraDeltaRotation, viewportW, viewportH)` shifts stars based on camera position/rotation delta
- [ ] Far layers shift less than near layers (parallax depth preserved)
- [ ] Camera rotation rotates the shift direction (stars respond to turning)
- [ ] Stars wrap when they exit viewport edges
- [ ] When ships are active, starfield uses camera-relative mode instead of directional scroll
- [ ] Existing direction modes (`left`/`right`/`up`/`down`/`radial`) remain available when ships are off
- [ ] Star twinkling continues to work
- [ ] `main.js` tracks `prevCamera` to compute deltas each frame
- [ ] **Visible**: Full parallax scrolling tied to ship movement. Stars stream past when flying forward. Turning makes them wheel around the ship. Complete "flying through space" feel.

---

## Increment 23: Minimum Forward Velocity + Thrust Flame

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

## Increment 24: Bullets

**Goal**: Player can fire bullets.

**New modules**: `src/bullet.js`, `test/bullet.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [ ] `createBullet(x, y, heading, shipVx, shipVy)` creates a bullet at given position, traveling at `BULLET_SPEED` in heading direction plus ship velocity (bullets inherit momentum)
- [ ] `updateBullet(bullet, dt)` moves bullet linearly, increments `age`
- [ ] `isBulletExpired(bullet)` returns true when `age >= BULLET_LIFETIME` (e.g., 2s)
- [ ] `drawBullet(ctx, bullet)` draws a small bright dot or short line
- [ ] Space key fires from ship nose position in heading direction
- [ ] Fire rate limited by `FIRE_COOLDOWN` (~0.2s between shots)
- [ ] Bullets rendered inside camera transform (world-space)
- [ ] Expired bullets removed each frame
- [ ] Bullets do NOT interact with asteroids (pass through)
- [ ] `owner` field on bullet tracks which ship fired it (for later collision filtering)
- [ ] **Visible**: Pressing Space fires white projectiles that streak forward from the ship and disappear after a distance.

---

## Increment 25: Enemy Ship + Basic AI

**Goal**: Second ship appears, controlled by AI that chases the player.

**New modules**: `src/ai.js`, `test/ai.test.js`
**Modify**: `src/main.js`

**Acceptance Criteria**:
- [ ] `createAIState()` returns AI decision state object
- [ ] `updateAI(aiState, aiShip, targetShip, asteroids, dt)` sets aiShip's control flags:
  - Rotates toward target's predicted position (leads the target based on velocity)
  - Thrusts when roughly facing target
  - Brakes when overshooting
- [ ] AI ship uses same `createShip` / `updateShip` physics as player (same thrust, drag, max speed)
- [ ] Enemy visually distinguished (e.g., dashed lines, or slightly different shape/size)
- [ ] Enemy spawns at a random world position offset from player (far enough to not immediately collide)
- [ ] Both ships rendered inside camera transform
- [ ] **Visible**: Two ships flying through the asteroid field. The enemy chases the player with fluid arcs. No shooting or collision yet — just the pursuit.

---

## Increment 26: AI Fires Bullets + Asteroid Avoidance

**Goal**: AI shoots at player and steers around asteroids.

**Modify**: `src/ai.js`, `test/ai.test.js`, `src/main.js`

**Acceptance Criteria**:
- [ ] `updateAI` also sets `aiShip.fire` when AI is aimed within angular threshold of target
- [ ] AI respects same `FIRE_COOLDOWN` as player
- [ ] AI bullets use same `createBullet` and physics
- [ ] AI does not fire when target is too far away
- [ ] AI avoids nearby asteroids: steers away when a collision course is detected
- [ ] Avoidance and pursuit blend smoothly (no jittering between states)
- [ ] **Visible**: Enemy shoots at the player and navigates around asteroids. Bullets fly between both ships. Dogfight feel emerges.

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

## Increment 30: AI-vs-AI Mode + Ship Mode Setting

**Goal**: Three modes: play, watch, or classic screensaver.

**Modify**: `src/settings.js`, `test/settings.test.js`, `src/main.js`, `src/ai.js`

**Acceptance Criteria**:
- [ ] `SETTINGS_CONFIG` gets `shipMode` with options: `'player-vs-ai'` (default), `'ai-vs-ai'`, `'off'`
- [ ] Setting persisted to localStorage
- [ ] `'player-vs-ai'`: Player controls one ship, AI controls enemy (current default)
- [ ] `'ai-vs-ai'`: Both ships AI-controlled. Camera follows one ship. Auto-respawn after 3s when a ship dies (infinite dogfight loop for screensaver)
- [ ] `'off'`: No ships, no bullets. Camera static at origin with no rotation. Starfield reverts to directional scroll mode. Pure asteroid screensaver (original behavior)
- [ ] Mode switching works live in settings panel without page reload
- [ ] Dropdown appears in the existing settings panel
- [ ] **Visible**: Three modes — play the dogfight, watch an AI-vs-AI battle as a screensaver, or enjoy the classic asteroid screensaver.
