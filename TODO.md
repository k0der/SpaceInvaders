# Asteroid Screensaver — Incremental Build Plan (TDD)

## Approach

- **Trunk-based development**: all work lands on `main` — no long-lived feature branches
- **Test framework**: Vitest + happy-dom
- **Code structure**: ES modules in `src/` for testability, `build.js` merges into single `index.html`
- **Workflow**: Write failing tests (RED) → implement until tests pass (GREEN) → refactor
- **Coverage audit**: before committing each increment, explicitly map every acceptance criterion to its test(s) and fill gaps
- **Philosophy**: Elephant carpaccio — every increment produces a running, visible result. The animation loop exists from the start; each slice adds something you can see.

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

## Increment 5: One Asteroid Floats Through

**Goal**: A single asteroid appears, drifts across the screen as a white wireframe polygon, and disappears off the other side. The first "actor" on stage.

**Modules**: `src/asteroid.js`, `src/renderer.js`

**Acceptance Criteria**:
- [ ] `generateShape(radius)` produces 8–14 vertices in an irregular polygon
- [ ] Every vertex is within `[radius * 0.6, radius * 1.0]` from origin
- [ ] Vertices are ordered angularly (no crossed edges)
- [ ] Two calls produce different shapes (randomness)
- [ ] Asteroid is rendered as a closed white stroked polygon (no fill)
- [ ] Asteroid moves in a straight line at constant speed each frame (`x += vx*dt, y += vy*dt`)
- [ ] Asteroid spawns outside one edge and drifts across to the other
- [ ] **Visible result**: a jagged white shape glides across the star field

---

## Increment 6: The Asteroid Tumbles

**Goal**: The asteroid rotates as it drifts, just like in the original game.

**Module**: `src/asteroid.js`

**Acceptance Criteria**:
- [ ] Each asteroid has an `angularVelocity` (rad/s) assigned at creation
- [ ] Rotation updates each frame: `rotation += angularVelocity * dt`
- [ ] Renderer applies rotation transform before drawing the shape
- [ ] Canvas state is saved/restored around each asteroid draw (no transform leaking)
- [ ] With `dt=0`, rotation is unchanged
- [ ] **Visible result**: the asteroid slowly spins as it floats across

---

## Increment 7: A Field of Asteroids

**Goal**: Multiple asteroids of varying sizes populate the screen. Bigger ones drift slowly, smaller ones zip past. The scene gets interesting.

**Module**: `src/asteroid.js`

**Acceptance Criteria**:
- [ ] Three size classes: large (r 50–80px, speed 15–30), medium (r 25–49, speed 30–60), small (r 10–24, speed 60–120)
- [ ] Stroke width varies: 2.0px large, 1.5px medium, 1.0px small
- [ ] Larger asteroids rotate more slowly than smaller ones (on average)
- [ ] ~20 asteroids on screen (hardcoded target for now)
- [ ] Size distribution: ~20% large, ~40% medium, ~40% small
- [ ] **Visible result**: a bustling asteroid field with large slow boulders and fast small rocks

---

## Increment 8: Asteroids Come and Go

**Goal**: Asteroids that drift off-screen are removed. New ones spawn from edges to replace them. The scene is self-sustaining.

**Module**: `src/asteroid.js`, `src/simulation.js`

**Acceptance Criteria**:
- [ ] `isOffScreen(asteroid, w, h)` returns `true` when asteroid is fully outside canvas + margin
- [ ] Works correctly for all four edges
- [ ] Off-screen asteroids are removed each frame
- [ ] New asteroids spawn just outside a random edge, aimed inward with ±30° spread
- [ ] Spawning is staggered: max 1 new asteroid per 0.3s (no edge clusters)
- [ ] Asteroid count stays near target (~20) over time
- [ ] Spawns from all four edges (not biased)
- [ ] **Visible result**: endless flow of asteroids — leave one side, new ones appear from another

---

## Increment 9: Asteroids Bounce Off Each Other

**Goal**: Collision detection and elastic response. The "wow" moment — asteroids interact.

**Module**: `src/physics.js`

**Acceptance Criteria**:
- [ ] Circle-circle collision detection: collision when `distance(a, b) < radiusA + radiusB`
- [ ] Exactly touching is NOT a collision
- [ ] No duplicate pairs detected
- [ ] Elastic collision conserves momentum (within 1% tolerance, mass = radius²)
- [ ] Elastic collision conserves kinetic energy (within 2% tolerance)
- [ ] Large asteroid barely flinches; small one ricochets dramatically
- [ ] Two equal asteroids in head-on collision approximately swap velocities
- [ ] Overlapping asteroids are separated along collision normal after resolution
- [ ] Lighter asteroid is pushed more during separation
- [ ] Small random perturbation (±2%) on post-collision velocity prevents repeating loops
- [ ] Angular velocity is nudged slightly on impact
- [ ] **Visible result**: asteroids bump and bounce realistically

---

## Increment 10: Collision Cooldown

**Goal**: Prevent rapid re-collisions when asteroids separate slowly.

**Module**: `src/physics.js`

**Acceptance Criteria**:
- [ ] After two asteroids collide, they cannot collide again for 0.3 seconds
- [ ] `canCollide(A,B)` and `canCollide(B,A)` give the same result (order-independent)
- [ ] Cooldowns for different pairs are independent
- [ ] Expired cooldowns are cleaned up (no unbounded memory growth)
- [ ] **Visible result**: no jittering/vibrating asteroid pairs — collisions resolve cleanly

---

## Increment 11: Settings Menu

**Goal**: A gear icon in the corner opens a settings panel with 3 sliders. The user can tune the experience.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [ ] Gear icon renders in the bottom-right corner
- [ ] Icon is semi-transparent (~30% opacity), brightens on hover (~80%)
- [ ] Clicking gear opens a translucent dark panel with white monospace text
- [ ] Panel has 3 labeled sliders: Asteroid Count [5–50, default 20], Speed [0.2x–3.0x, default 1.0x], Star Layers [3–6, default 3]
- [ ] Each slider shows its current value
- [ ] Moving a slider changes the simulation in real-time (asteroid count adjusts gradually, speed scales all motion, star layers add/remove)
- [ ] Pressing Escape closes the panel
- [ ] Panel auto-hides after 4 seconds of no mouse activity over it
- [ ] Gear icon auto-hides after 3 seconds of no mouse movement; reappears on move
- [ ] **Visible result**: interactive settings that visibly change the animation

---

## Increment 12: Settings Persistence

**Goal**: Settings survive page reload via localStorage.

**Module**: `src/settings.js`

**Acceptance Criteria**:
- [ ] On slider change, value is written to `localStorage`
- [ ] On page load, settings are read from `localStorage` if present
- [ ] If `localStorage` is empty or corrupt, defaults are used without error
- [ ] All 3 settings are persisted independently
- [ ] Slider positions reflect loaded values on startup
- [ ] **Visible result**: reload the page, settings are remembered

---

## Increment 13: HiDPI Support & Build

**Goal**: Crisp rendering on retina displays. Final single-file build.

**Module**: `src/renderer.js`, `build.js`

**Acceptance Criteria**:
- [ ] Canvas internal resolution = CSS size × `devicePixelRatio`
- [ ] Canvas CSS size remains `100vw × 100vh`
- [ ] Context is scaled by `devicePixelRatio`
- [ ] Lines appear crisp on 2x displays
- [ ] `node build.js` produces a standalone `index.html` with all modules inlined
- [ ] `index.html` works with zero external dependencies
- [ ] No console errors or warnings
- [ ] **Visible result**: the final deliverable — one HTML file, opens in any browser, mesmerizing to watch
