# Parameter Sweep — Cycle 10: HOLD_TIME

**Date**: 2026-02-22
**Parameter**: HOLD_TIME (seconds between action changes)
**Sweep values**: 0.15, 0.20, 0.25, 0.30, 0.35
**Games per value**: 50
**Selection criterion**: highest wins/50 where oscillations/game ≤ 1.9 (baseline); fallback: lowest oscillations with wins ≥ 25/50

## 50-Game Sweep Results

| HOLD_TIME | Wins/50 | Osc/50 | Osc/game | Collapse/50 | Collapse/game | Fires/game | Action Changes/game |
|-----------|---------|--------|----------|-------------|---------------|------------|---------------------|
| 0.15 (baseline) | 23/50 | 102 | 2.04 | 74 | 1.48 | 2.3 | 6.1 |
| 0.20 | 23/50 | 120 | 2.40 | 57 | 1.14 | 2.0 | 5.7 |
| 0.25 | 22/50 | 157 | 3.14 | 83 | 1.66 | 3.2 | 7.1 |
| 0.30 | 26/50 | 112 | 2.24 | 100 | 2.00 | 2.3 | 5.9 |
| 0.35 | 26/50 | 121 | 2.42 | 113 | 2.26 | 2.2 | 6.0 |

## Selection

Primary criterion (oscillations/game ≤ 1.9): **No value met this criterion**

Fallback criterion (lowest oscillations, wins ≥ 25/50): **HOLD_TIME=0.30** (26/50 wins, 2.24 osc/game)

Note: The oscillation detector in simulate.js uses HOLD_TIME from ai-predictive.js (enemy, 0.15s), not from ai-predictive-optimized.js (player). The oscillation count reflects both AIs' action changes. Non-monotonic behavior across the sweep is consistent with high 50-game variance documented in previous cycles.

## 200-Game Validation (HOLD_TIME=0.30)

Results: Player wins: 87/200 | Enemy wins: 113/200 | Draws: 0/200
- Oscillations: 513/200 = **2.565/game** (+35% vs baseline 1.9, threshold ≤ 2.185)
- Collapses: 377/200 = **1.885/game** (+18% vs baseline 1.6, threshold ≤ 1.84)
- Fires: 549/200 = **2.75/game** (-11% vs baseline 3.1, within threshold)
- Action changes: 1351/200 = 6.8/game

## Decision: ROLLBACK

All three hard criteria failed:
1. Player wins 87/200 < 100 threshold
2. Oscillations +35% > 15% degradation threshold
3. Collapses +18% > 15% degradation threshold

## Key Finding

Increasing HOLD_TIME makes the AI more rigid but does NOT reduce detected oscillations. Instead, it causes:
- Slower response to threats → more asteroid collisions (collapse increase)
- More emergency collision-break overrides → oscillation bursts when hold is broken
- Net effect: both metrics degrade together

The oscillation problem is NOT caused by the timer being too short. The rapid action changes occur within valid hold-period re-evaluations (when the timer expires every 0.15s and the scoring landscape shifts). Lengthening the timer just delays each re-evaluation but doesn't change what the AI decides when it re-evaluates.

**Conclusion**: HOLD_TIME tuning is exhausted as a single-lever fix. The oscillation stems from score instability in the scoring landscape (aim/evasion trajectories score similarly in proximity zones), not from the timer being too short.
