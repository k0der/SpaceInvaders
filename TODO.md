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
- [x] Panel has 3 labeled sliders: Asteroid Count [5–50, default 20], Speed [0.2x–3.0x, default 1.0x], Star Layers [3–6, default 3]
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
