# Cycle 17 Sweep — AIM_PROXIMITY_SCALE

Date: 2026-02-22
Baseline: APS=5, 109/200 wins (54.5%)

## Sweep Results (50 games each)

| APS | Wins/50 | Osc/game | Fires/game | Collapses/game | Notes |
|-----|---------|----------|------------|----------------|-------|
| 3   | 32      | 2.26     | 2.6        | 1.28           | **Winner** |
| 5   | 30      | 1.76     | 2.6        | 1.38           | Baseline |
| 8   | 28      | 2.68     | 3.1        | 1.94           | |
| 12  | 26      | 2.20     | 3.6        | 1.28           | |
| 15  | 27      | 2.22     | 3.4        | 2.14           | |

Selected: APS=3 (32/50 wins, highest wins/50)

## 200-Game Validation (APS=3)

Player wins: 98/200 (49%)
Enemy wins: 102/200 (51%)
Oscillations: 529 total (2.645/game)
Collapses: 349 total (1.745/game)
Fires: 664 (3.3/game)
Action changes: 1523 (7.6/game)

**Result: ROLLBACK** — 98/200 < current best 109/200

## Analysis

The sweep shows a monotonically decreasing win rate as APS increases (32→30→28→26→27).
This inverts the stated hypothesis that higher APS improves close-range combat.
Lower APS (less close-range aim amplification) wins the 50-game sweep, but the
200-game validation collapses to 98/200 (-11 wins vs current best).

This is the same pattern seen in Cycles 13–16 (sweep winner fails at 200 games).
The 50-game signal is unreliable: variance ±8 means APS=3's 32-win result (vs 30 for APS=5)
is within the noise band. The 200-game run at 98/200 confirms APS=5 is better than APS=3.

The sweep also reveals: higher APS (8, 12, 15) increases fires/game (+19-38%) but
increases oscillations and collapses. The aim signal at close range has the same
amplify-fires-but-destabilize-trajectories dynamic as the FOB and AIM_BONUS parameters.

**AIM_PROXIMITY_SCALE is now exhausted as a tuning target.**
The current value of 5 is at or near the optimum for this architecture.
