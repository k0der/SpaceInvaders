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

### Open hypotheses to explore
- The collapse problem is real but can't be solved by simply shrinking the danger zone
- FIRE_OPPORTUNITY_BONUS 300→600 showed strong secondary metrics (47% collapse reduction) but failed the 50-game win threshold due to variance; revisit with a 200-game validation if the threshold is relaxed
- HYSTERESIS_BONUS increases are counterproductive — they increase large-gap commitment errors as fast as they reduce small-gap flip errors; this avenue is exhausted
- Possible approach: keep danger zone at 3 but reduce COLLISION_BASE_PENALTY magnitude so strategic signals (aim, fire opportunity) aren't completely drowned — note: also reduces actual collision penalty, risk similar to Cycle 1 DANGER_ZONE_FACTOR reduction
- Possible approach: improve early-game survival (first 1-2 seconds) — most bullet deaths happen in the 1-2s window when enemy already has aim advantage
- Possible approach: increase AIM_BONUS instead of FIRE_OPPORTUNITY_BONUS — less likely to cause the aim-proximity-scale test regression. Analysis shows AIM_BONUS change has very limited impact (~80-point swing per step) vs FOB change (~360-point swing per step for 15-step trajectory); may not be worth pursuing
- Possible approach: increase FIRE_OPPORTUNITY_BONUS more aggressively (e.g., 300→900 or 300→1200) — the 300→600 change showed strong secondary metrics and may have been too conservative. The variance noise (±8 wins on 50-game runs) may have masked genuine improvement

## Proposed Changes Outside Optimization Scope

> These changes were identified during optimization cycles but require modifying files outside `src/ai-predictive-optimized.js`. They are logged here for human review — they were NOT applied autonomously.

*(none yet)*

## Change Log
| Cycle | Problem | Fix | Win Rate | Oscillations | Collapses | Result |
|-------|---------|-----|----------|--------------|-----------|--------|
| 0 | — | Baseline | 70% | 98 | 124 | — |
| 1 | Score collapses cause defensive paralysis | DANGER_ZONE_FACTOR 3→2 | 46% (23/50) | 159 | 83 | ROLLBACK |
| 2 | Fire signal overwhelmed by danger penalties (FOB 1800 < penalty 2978 at proximity 0.39) | FIRE_OPPORTUNITY_BONUS 300→600 | 48% (24/50) | 113 | 66 | ROLLBACK |
| 3 | Score gap between best/2nd actions (~285 pts) exceeds HYSTERESIS=250, causing hold-boundary flips | HYSTERESIS_BONUS 250→500 | 48% (24/50) | 171 | 100 | ROLLBACK |
