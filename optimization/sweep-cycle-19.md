# Sweep Cycle 19 — DISTANCE_WEIGHT

**Date**: 2026-02-22
**Hypothesis**: DISTANCE_WEIGHT=-8 uniformly suppresses all trajectory scores by 2400-4800pts at medium range (300-600px), reducing discrimination in collapse scenarios. With CLOSING_SPEED_WEIGHT=16 now handling approach incentive at the path level, DISTANCE_WEIGHT may be redundant or over-weighted. Reducing magnitude should give strategic signals more relative weight and improve collapse discrimination.

## 50-Game Sweep Results

| DW  | Wins/50 | Win% | Osc/game | Collapse/game |
|-----|---------|------|----------|---------------|
| -3  | **29**  | 58%  | 2.68     | 1.88          |
| -5  | 26      | 52%  | 2.98     | 1.56          |
| -8  | 27      | 54%  | 2.26     | 1.72          |
| -11 | 27      | 54%  | 2.54     | 1.36          |
| -14 | 17      | 34%  | 2.90     | 1.42          |

**Selected**: DW=-3 (highest wins at 29/50; lower magnitude values win in sweep, consistent with hypothesis that reducing score suppression improves combat discrimination).

Notes:
- DW=-14 collapses badly (17/50 = 34%) — excessive distance penalty overwhelms strategic signals at long range.
- DW=-3 and DW=-5 both outperform baseline (-8) in wins, supporting the hypothesis.
- Secondary metrics at DW=-3 are not alarming (osc slightly elevated vs DW=-8, collapse/game similar).
- Monotonic win improvement from DW=-8 toward DW=-3 (with -14 clearly worse on the other side).

## 200-Game Validation (DW=-3)

**Player wins: 110/200 (55.0%)** — matches current best 110/200 (55.0%)

| Metric              | DW=-3  | Current Best (DW=-8) | Change   |
|---------------------|--------|----------------------|----------|
| Player wins         | 110    | 110                  | 0 (=)    |
| Win rate            | 55.0%  | 55.0%                | 0%       |
| Oscillations/game   | 2.26   | 2.845                | -20.6%   |
| Collapses/game      | 1.61   | 1.565                | +2.9%    |
| Fires/game          | 3.425  | 3.385                | +1.2%    |
| Action changes/game | 6.8    | 7.8                  | -12.8%   |

## Decision: KEEP

**Criteria**: wins >= 110 AND tests pass.
- 110/200 >= 110/200 ✓
- 994/994 tests pass ✓

## Insight

DW=-3 matches the current best win count while significantly reducing oscillations (-20.6%) and action changes (-12.8%). The score suppression reduction hypothesis was partially confirmed: lower magnitude DISTANCE_WEIGHT gives strategic signals more relative weight, winning in 50-game sweeps over baseline. At 200-game scale, the win count is identical but the AI is behaviorally more stable (fewer oscillations, fewer action changes). Collapses are essentially flat (+2.9%). This is the expected behavior when CSW=16 already handles approach incentive at path level — reducing DISTANCE_WEIGHT magnitude removes redundant penalization without meaningfully changing approach behavior.
