# Cycle 2 Analysis

## Simulation Results
- Player wins: 24/50 (48%) [50-game run; 200-game run gave 105/200 = 52.5%]
- Enemy wins: 26/50 (52%) [200-game: 95/200 = 47.5%]
- Draws: 0/50 (0%)
- Oscillations detected: 109 (50-game); 389 (200-game, 1.9/game)
- Collapses detected: 91 (50-game); 315 (200-game, 1.6/game)
- Passthroughs detected: 6 (50-game)
- Fires: 128 (2.6/game, 50-game); ~3.1/game (200-game)
- Action changes: 338 (6.8/game, 50-game)

Note: 50-game runs have very high variance (observed 19–31 player wins in repeated
50-game runs this session). The 200-game run (52.5%) is the reliable signal. True
expected win rate between identical AIs is ~50%, so we are at parity — no measurable
advantage over baseline.

## Verbose Observations

**Death cause analysis (200-game verbose run):**
- Player deaths: 95 total
  - By asteroid: 44 (46%) — of which ~24 were tick=0 spawn kills (uncontrollable)
  - By bullet: 51 (54%)
- Enemy deaths: 107 total
  - By asteroid: 72 (67%) — of which ~25 were tick=0 spawn kills (symmetric)
  - By bullet: 35 (33%)

**The critical asymmetry: the player loses 51 bullet fights but only wins 35.**
Net bullet fight deficit: -16 over 200 games. This is the primary driver of enemy wins.

**Fire rates are equal at scale**: both sides fire ~1.9/game at 100-game scale.
The deficit is not from firing less — it's from winning fewer exchanges.

**Collapse score snapshots (from verbose enemy detection):**
- During collapses, best-candidate score ranges from -5,000 to -15,000
- The maximum FIRE_OPPORTUNITY_BONUS signal per trajectory is approximately:
  300 × 15 steps × (1 - 300/500) = ~1,800 at mid-range (300px)
- A proximity factor of 0.5 (mid danger zone) generates -5,000 in penalty
- The fire signal is therefore overwhelmed even at moderate proximity (0.5 factor)
- In semi-collapse situations, the AI prefers evasive actions over aim-holding

**Oscillation ownership (50-game verbose):**
- Player: 110 oscillations; Enemy: 48 (player oscillates 2.3× more per run)
- Player oscillations are fully detected (no debug scores required)
- Enemy collapse detection only works because getLastDebugInfo() is captured
  post-enemy-update, so player collapses are structurally invisible to the detector
  but symmetric in frequency (same AI code)

**Early game pattern:**
- Spawn kills (tick=0) are symmetric: ~12% of games each side
- Bullet deaths are heavily weighted toward the player (51 vs 35)
- Most player bullet deaths occur at 1–5s, during the early engagement window
  when both AIs have closed distance but the danger zone is suppressing the
  player's fire-opportunity signal

**Enemy action distribution (50-game):**
- Passive: ~68% (___B: 35.8%, ____: 31.7%) — both AIs spend most time evading
- Thrust-forward: 13.9% (T___)
- Rotational+braking: ~10% (TL__, T_R_, __RB, _L_B, _L__)

## Comparison to Current Best

State.json current = baseline (cycle 1 DANGER_ZONE_FACTOR change was rolled back).
- Win rate: ~52.5% (200-game this cycle) vs ~50% true baseline — no change
- The 70% in state.json is a known 50-game variance artifact (confirmed by 200-game runs)
- Collapses: 1.6/game (200-game) vs 2.5/game (50-game baseline) — appears lower
  but this reflects 50-game baseline being noisy; both within expected variance
- Oscillations: 1.9/game (200-game) vs 2.0/game (50-game baseline) — no change
- Fires: 3.1/game (200-game) vs 2.4/game (50-game baseline) — higher; suggests
  more combat opportunities are being created, but not being converted to kills

## Top 3 Problems

1. **Losing bullet fights** — severity: critical — Player loses 54% of bullet exchanges
   (51 player deaths by bullet vs 35 enemy bullet kills, over 200 games). Fire rates
   are equal (~1.9/game each), so the issue is not firing frequency but firing position
   quality. During asteroid proximity events, the fire-opportunity signal (FIRE_OPPORTUNITY_BONUS
   = 300/step, max ~1,800 at mid-range) is overwhelmed by danger zone penalties (-5,000
   to -20,000), causing the AI to choose evasive/rotational actions over aim-holding even
   when a firing solution is available. The enemy (running the identical predictive AI as
   target) benefits from spawning aimed at the player, so its early shots are more likely
   to land before the player's scoring finds firing positions.

2. **Score collapses degrading tactical decisions** — severity: high — 315 collapses in
   200 games (1.6/game). During collapses, all candidate scores are deeply negative
   (-5,000 to -15,000 for best candidate). Strategic signals — aim, fire opportunity,
   distance — are swamped by proximity penalties. The AI selects the "least dangerous"
   trajectory rather than the one that combines reasonable safety with a firing solution.
   This is the root cause feeding Problem #1: the fire-opportunity signal is too weak
   to influence action selection when asteroids are nearby.

3. **Player oscillation excess** — severity: medium — Player generates 110 oscillations
   vs enemy's 48 in 50-game verbose runs (2.3× more). The HYSTERESIS_BONUS (250) is
   negligible relative to score ranges during collapse (-5,000 to -40,000). Oscillation
   is largely a symptom of collapse: when all scores are deeply negative and close
   together, any small perturbation flips the best action. Fixing Problem #1/#2 should
   reduce oscillation as a secondary effect.

## Selected Fix: Problem #1

### Root Cause

`FIRE_OPPORTUNITY_BONUS = 300` (line 67 of `src/ai-predictive-optimized.js`) is too low
relative to the danger zone penalties from `COLLISION_BASE_PENALTY = -20,000`. In
`scoreTrajectory()`, the fire opportunity bonus accumulates as:

  sum over steps: FIRE_OPPORTUNITY_BONUS × (1 - fDist / MAX_FIRE_RANGE)

For a 15-step trajectory with target at 300px (mid-range):
  300 × (1 - 300/500) × 15 = 1,800 total bonus

Meanwhile, a trajectory that passes at proximity factor 0.5 (midpoint of danger zone)
receives a penalty of: -20,000 × 0.5² = -5,000

So even a modest near-miss penalty (-5,000) is 2.8× the maximum fire opportunity reward
(1,800). The result: in any semi-collapse situation, the scoring function will prefer the
trajectory with less asteroid proximity, regardless of whether it holds a firing solution.

This explains the bullet fight asymmetry: both AIs fire equally often at scale, but the
player (as the AI under optimization) is more often in a position where it has to choose
between asteroid clearance and aim alignment — and it always picks clearance. The enemy AI
(as the "predictive" opponent) benefits from spawn orientation advantage and doesn't need
to choose as often.

The IMPROVEMENTS.md open hypothesis states: "increase FIRE_OPPORTUNITY_BONUS or AIM_BONUS
to better compete with danger zone penalties in semi-collapse situations." This is the fix.

This is fundamentally different from Cycle 1's DANGER_ZONE_FACTOR change: that change
reduced the *penalty denominator* (shrinking the zone), which caused the AI to navigate
closer to actual asteroids and die more. This fix increases the *reward signal* for
firing position, improving action ordering without changing safety behavior.

### Suggested Fix
- File: `src/ai-predictive-optimized.js`
- Change: `FIRE_OPPORTUNITY_BONUS` from `300` to `600`
- Rationale: Doubling the fire-opportunity signal raises the maximum firing bonus to
  ~3,600 at mid-range (300px), which is 72% of a proximity-0.5 danger penalty (-5,000).
  For trajectories where proximity is below 0.4 (proximity² = 0.16, penalty = -3,200),
  the fire bonus now dominates. This shifts action ordering in semi-collapse situations
  toward aim-holding without making it override genuine collision avoidance (proximity > 0.7
  penalty = -9,800, still much larger than the fire bonus). Value 600 is chosen as a
  confident 2× step — large enough to move the balance point meaningfully, conservative
  enough not to cause the AI to recklessly hold aim into asteroids.

### Test Scenario

A unit test in `test/ai-predictive-optimized.test.js` should set up:
- Ship at (400, 300), heading = 0 (facing right), velocity = (0, 0)
- Target at (700, 300) — 300px ahead, within MAX_FIRE_RANGE, within FIRE_ANGLE
- One small asteroid at (400, 340), radius = 20, velocity = (0, 0)
  The asteroid is 40px below the ship — within the danger zone of a straight-ahead
  trajectory (SHIP_SIZE + 20 = ~30px collision dist, danger zone = 3×30 = 90px;
  asteroid edge is at 40-20=20px, within the 90px danger zone)
  but NOT within the danger zone of a slight upward-rotated trajectory

With FIRE_OPPORTUNITY_BONUS=300: the straight-ahead trajectory (good firing solution
but slight proximity to asteroid) scores lower than a rotation-away trajectory due
to the -2,000 to -4,000 proximity penalty dominating the ~1,800 fire bonus.
With FIRE_OPPORTUNITY_BONUS=600: the fire bonus (~3,600) should dominate the
modest proximity penalty, causing the AI to prefer the aim-holding trajectory.

The selected action should shift from a rotation/braking action to thrust-forward
or coast when the bonus is doubled.

### Expected Impact
- Win rate: expect +5–8% (targeting 57–60% on 200-game run)
- Player bullet kills: expect to increase from ~35 to ~42+ per 200 games
- Player bullet deaths: expect modest decrease (better-aimed firing also means
  the player faces the enemy more, potentially receiving fewer shots from blind angles)
- Collapses: no change expected (safety constants unchanged)
- Oscillations: slight reduction (~10%) as stronger fire signal creates more stable
  action preferences during intermediate proximity situations

### Complexity Level
1 — Tune constant (single constant change: FIRE_OPPORTUNITY_BONUS 300 → 600)
