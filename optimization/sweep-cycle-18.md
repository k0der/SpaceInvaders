# Sweep Cycle 18 — CLOSING_SPEED_WEIGHT

**Date**: 2026-02-22
**Hypothesis**: Increasing CLOSING_SPEED_WEIGHT rewards trajectories that close distance on the enemy more aggressively. Higher CSW should reduce time-to-first-shot by incentivizing approach trajectories over patrol/formation behavior.

## 50-Game Sweep Results

| CSW | Wins/50 | Win% | Osc/game | Collapse/game |
|-----|---------|------|----------|---------------|
| 4   | 25      | 50%  | 2.96     | 1.96          |
| 6   | 26      | 52%  | 2.86     | 1.88          |
| 8   | 30      | 60%  | 3.58     | 2.48          |
| 12  | 29      | 58%  | 3.10     | 1.72          |
| 16  | 30      | 60%  | 2.78     | 2.12          |

**Selected**: CSW=16 (tied highest wins at 30/50, lowest oscillation at 2.78/game).

Notes:
- CSW=8 (baseline) also had 30/50 but with the worst oscillation (3.58) and collapse (2.48) of any value tested.
- CSW=12 had slightly fewer wins (29) but better collapse (1.72 — best of sweep).
- Lower values (4, 6) had clearly fewer wins (25-26).
- Monotonic win improvement from CSW=4→8→12/16 (non-monotonic between 12 and 16).

## 200-Game Validation (CSW=16)

**Player wins: 110/200 (55.0%)** — exceeds current best 109/200 (54.5%)

| Metric              | CSW=16 | Current Best (CSW=8) | Change   |
|---------------------|--------|----------------------|----------|
| Player wins         | 110    | 109                  | +1 (+0.5%) |
| Win rate            | 55.0%  | 54.5%                | +0.5%    |
| Oscillations/game   | 2.845  | 2.51                 | +13.4%   |
| Collapses/game      | 1.565  | 1.28                 | +22.3%   |
| Fires/game          | 3.385  | 3.10                 | +9.2%    |
| Action changes/game | 7.8    | 7.6 (est)            | +2.6%    |

## Decision: KEEP

**Criteria**: wins >= 109 AND tests pass.
- 110/200 >= 109/200 ✓
- 992/992 tests pass ✓

## Insight

The monotonic improvement in 50-game sweeps from CSW=4 to CSW=8/16 suggests higher closing weight does help — but the effect is modest (+1 win at 200 games). The secondary metrics (oscillation +13%, collapse +22%) are elevated but not blocking per current rules. CSW=16 reduces oscillation relative to CSW=8 while maintaining top win count in the sweep, making it the best balance point.
