# Predictive-Optimized AI — Improvement Tracker

## Baseline (Cycle 0)
Player wins: 35/50 (70%) | Enemy wins: 15/50 (30%) | Draws: 0/50 (0%)
Oscillations: 98 | Collapses: 124 | Passthroughs: 6
Action changes: 276 (5.5/game) | Fires: 118 (2.4/game)

Note: The 70% baseline is a small-sample artifact. True expected win rate with identical AIs is ~50% (confirmed by 200-game run: 102/200 = 51%).

## Current Best (Cycle 0 — baseline)
Player wins: 35/50 (70%) | Enemy wins: 15/50 (30%) | Draws: 0/50 (0%)
Oscillations: 98 | Collapses: 124 | Passthroughs: 6
Action changes: 276 (5.5/game) | Fires: 118 (2.4/game)

## Key Insights (read before proposing any fix)

### What we know about the AI's behavior
- Both AIs (predictive-optimized vs predictive) are currently **identical** — true expected win rate is ~50%, not the 70% baseline
- The enemy spawns aimed at the player; player spawns heading up (-PI/2) — enemy has early aim advantage, fires ~70% more shots per game
- ~20-30% of games end via instant asteroid spawn kills (tick 0) — uncontrollable, symmetric
- The AI spends ~68% of time in passive modes (coast+brake) due to score collapse episodes

### What doesn't work
- **DANGER_ZONE_FACTOR 3→2 (Cycle 1, ROLLBACK)**: Reducing the danger zone shrinks collapse frequency (-33%) and boosts firing rate (+66%), but the tighter zone allowed the player to navigate closer to asteroids, causing more asteroid deaths. Net result: -34% win rate. **Lesson: danger zone reduction alone is not safe without better asteroid avoidance. The firing benefit does not compensate for the asteroid mortality increase.**
- **FIRE_OPPORTUNITY_BONUS 300→600 (Cycle 2, ROLLBACK)**: Doubled fire signal reduced collapses by 47% (66 vs 124) and slightly increased fires (132 vs 118). Win count 24/50 fell below the hard 35-win threshold. Important caveat: both 35 and 24 are within the ±8 variance band of 50-game runs (true expected rate ~50%); a 200-game run is needed to detect real impact. **Lesson: 50-game threshold is unreliable for detecting small performance changes. The strong collapse reduction (47%) may indicate genuine improvement; revisit with larger sample or relaxed threshold.**
- **HYSTERESIS_BONUS 250→500 (Cycle 3, ROLLBACK)**: Doubling hysteresis caused oscillations to INCREASE 75% (98→171) and action changes to increase 71% (276→472). The fix had the opposite effect: higher hysteresis makes the AI reluctant to change from a committed action, causing it to hold suboptimal trajectories longer when conditions change rapidly. Fires increased 75% (118→206), suggesting more combat opportunities created, but oscillation regression negated any benefit. **Lesson: hysteresis is a blunt instrument. Higher values don't reduce oscillation; they reduce *small-gap* flips while increasing *large-gap* commitment errors. The oscillation problem requires a more targeted approach (e.g., improving score stability, not raw stickiness).**
- **FIRE_OPPORTUNITY_BONUS 300→900 (Cycle 4, ROLLBACK)**: Tripling the fire signal gave 96/200 wins (below 100 threshold) and INCREASED oscillations by 42% (2.7 vs 1.9/game) while DECREASING fires from 3.1 to 2.7/game. Counterintuitively, the larger fire bonus caused aim-holding in situations where evasion was better — the AI now holds dangerous aim-trajectories into asteroid proximity, causing more deaths and unstable trajectories. **Lesson: FOB tuning has a narrow effective window. 300 is too low (fire signal overwhelmed), 900 is too high (aim-holding overrides safety). The 2× change (300→600) appeared more promising on secondary metrics but still didn't improve 200-game win rate. FIRE_OPPORTUNITY_BONUS tuning may be exhausted as a single-constant lever; the fire signal/danger zone interaction requires either a multi-constant approach or a fundamentally different mechanism.**
- **COLLISION_BASE_PENALTY -20000→-10000 (Cycle 5, ROLLBACK)**: Halving the penalty broke the 'avoids asteroid when a clear path exists' test. With -10000, T___ (thrust-straight into asteroid) scored -4131.8 while TL__ (turn-left to dodge) scored -9215.5 — the AI now PREFERS crashing over evading when the target is behind the asteroid. Root cause: COLLISION_BASE_PENALTY is a unified constant controlling both (a) actual collision deterrence and (b) near-miss danger zone penalty. These two effects cannot be separated without a code change. Halving the base halves both, and the actual collision deterrence becomes insufficient when strategic signals (aim, fire, approach) are strong (target directly behind asteroid). **Lesson: COLLISION_BASE_PENALTY cannot be tuned downward without refactoring scoreTrajectory to use separate constants for actual collisions vs near-miss danger zone penalties. Any single-constant approach is exhausted.**
- **DANGER_ZONE_BASE_PENALTY=-5000 separate constant (Cycle 6, ROLLBACK)**: Structural fix — added DANGER_ZONE_BASE_PENALTY as an independent constant (−5000) used only in the near-miss branch, keeping COLLISION_BASE_PENALTY=−20000 for actual collisions. Player wins improved slightly (104 vs 102) but oscillations INCREASED 63% (3.1 vs 1.9/game), triggering the secondary metric rollback threshold. Root cause of oscillation increase: reducing DANGER_ZONE_BASE_PENALTY to −5000 makes the near-miss penalty gradient shallower — the AI now sees similar scores for aim-holding and evasion trajectories in the 0.3–0.5 proximity zone, causing frequent flips. HYSTERESIS_BONUS=250 is too small to stabilize these nearly-equal scores. **Lesson: Decoupling the constants is the right structural approach, but the value −5000 is too aggressive a reduction. Next attempt should use a less extreme reduction (e.g., −8000 to −12000) or combine with a HYSTERESIS_BONUS increase to absorb the increased score volatility. Also note: oscillation increase mirrors Cycle 4 (FOB=900) — both changes that increase the AI's willingness to hold aim-trajectories cause similar oscillation patterns. The aim/evasion balance is delicate.**

### Open hypotheses to explore
- The collapse problem is real but can't be solved by simply shrinking the danger zone
- HYSTERESIS_BONUS increases are counterproductive in isolation — they increase large-gap commitment errors as fast as they reduce small-gap flip errors; this avenue is exhausted AS A STANDALONE FIX
- FIRE_OPPORTUNITY_BONUS tuning is likely exhausted: 600 too small (overwhelmed, Cycle 2), 900 too large (aim-holding causes oscillation+asteroid deaths, Cycle 4). The fire/danger balance is non-linear and a single scalar doesn't resolve it cleanly.
- COLLISION_BASE_PENALTY reduction is exhausted as a single constant: -10000 breaks actual collision deterrence (Cycle 5). The structural fix (Cycle 6) decouples correctly but DANGER_ZONE_BASE_PENALTY=-5000 is too aggressive a reduction — near-miss gradient becomes too shallow, causing oscillation.
- **Highest priority next fix**: Try DANGER_ZONE_BASE_PENALTY at a moderate reduction (-8000 to -12000) instead of -5000. This keeps the structural decoupling but avoids the shallow-gradient oscillation problem. The -5000 value reduced the near-miss penalty 4× which was too aggressive; -8000 to -10000 would reduce it 2×-2.5× which may preserve enough gradient to prevent oscillation while still reducing collapse frequency.
- **Alternative multi-lever fix**: Combine DANGER_ZONE_BASE_PENALTY (moderate reduction, e.g., -10000) with a small HYSTERESIS_BONUS increase (e.g., 350-400) to absorb the increased score volatility in proximity zones. HYSTERESIS_BONUS alone causes commitment errors, but as a damper alongside a DZPB reduction it may be appropriate.
- Possible approach: improve early-game survival (first 1-2 seconds) — most bullet deaths happen in the 1-2s window when enemy already has aim advantage. Requires understanding spawn dynamics.
- Possible approach: increase AIM_BONUS instead of FIRE_OPPORTUNITY_BONUS — less likely to cause oscillation increases because AIM_BONUS rewards consistent aim direction over the whole trajectory rather than per-step firing solutions. Analysis shows AIM_BONUS has smaller per-step impact (~80-point swing per step) but this may be precisely the property that avoids overcorrection. Untried.

## Proposed Changes Outside Optimization Scope

> These changes were identified during optimization cycles but require modifying files outside `src/ai-predictive-optimized.js`. They are logged here for human review — they were NOT applied autonomously.

### Proposed: Split COLLISION_BASE_PENALTY into two separate constants (Cycle 5) — IMPLEMENTED in Cycle 6, then ROLLED BACK

**Status**: Implemented and tested in Cycle 6. The structural refactoring was confirmed in-scope (only modified `src/ai-predictive-optimized.js`). Implementation passed tests (107/107) and simulation showed 104/200 player wins. Rolled back due to oscillation regression (+63%, threshold 15%).

**Remaining sub-problem**: DANGER_ZONE_BASE_PENALTY=-5000 produces too shallow a near-miss gradient, causing oscillation in the proximity zone. The structural decoupling approach is correct — the constant value needs adjustment. Recommended next attempt: DANGER_ZONE_BASE_PENALTY=-10000 (half the reduction; 2× less aggressive than Cycle 6's -5000).

## Change Log
| Cycle | Problem | Fix | Win Rate | Oscillations/game | Collapses/game | Fires/game | Result |
|-------|---------|-----|----------|--------------------|----------------|------------|--------|
| 0 | — | Baseline (50-game) | 70% (35/50) | ~2.0 | ~2.5 | ~2.4 | — |
| 0b | — | Baseline (200-game, confirmed) | 51% (102/200) | 1.9 | 1.6 | 3.1 | — |
| 1 | Score collapses cause defensive paralysis | DANGER_ZONE_FACTOR 3→2 | 46% (23/50) | 3.2 | 1.7 | ~4.0 | ROLLBACK |
| 2 | Fire signal overwhelmed by danger penalties (FOB 1800 < penalty 2978 at proximity 0.39) | FIRE_OPPORTUNITY_BONUS 300→600 | 48% (24/50) / 52.5% (105/200) | ~1.9 | 1.6 | 3.1 | ROLLBACK |
| 3 | Score gap between best/2nd actions (~285 pts) exceeds HYSTERESIS=250, causing hold-boundary flips | HYSTERESIS_BONUS 250→500 | 48% (24/50) | 3.4 | 2.0 | ~4.1 | ROLLBACK |
| 4 | FOB 300 overwhelmed at proximity 0.5 (max bonus 1800 << penalty 5000); attempt 3x increase | FIRE_OPPORTUNITY_BONUS 300→900 | 48% (96/200) | 2.7 | 1.7 | 2.7 | ROLLBACK |
| 5 | Danger-zone penalty depth (-20000 base) overwhelms strategic signals; attempt to halve penalty | COLLISION_BASE_PENALTY -20000→-10000 | N/A (test failure) | — | — | — | ROLLBACK |
| 6 | COLLISION_BASE_PENALTY dual-use prevents independent tuning; structural fix with separate DANGER_ZONE_BASE_PENALTY | Add DANGER_ZONE_BASE_PENALTY=-5000 constant; use it in near-miss branch only | 52% (104/200) | 3.1 (+63%) | 1.85 (+16%) | 3.0 | ROLLBACK |
