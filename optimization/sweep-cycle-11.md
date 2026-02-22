## Cycle 11 Parameter Sweep
DANGER_ZONE_BASE_PENALTY fixed at: -10000
Sweeping: HYSTERESIS_BONUS

| HYSTERESIS_BONUS | Wins/50 | Osc/game | Collapses/game | Notes |
|------------------|---------|----------|----------------|-------|
| 250              | 26      | 2.72     | 1.60           | Below 30-win target; comparable to baseline |
| 275              | 25      | 3.70     | 2.66           | Worst osc of sweep; regression from 250 |
| 300              | 24      | 2.56     | 1.80           | Worst wins; low osc but highly passive |
| 325              | 28      | 2.96     | 1.76           | Improvement from 250 but not peak |
| **350**          | **37**  | **2.82** | **2.10**       | **Best 50-game result: 37/50 wins** |
| 375              | 21      | 2.58     | 1.62           | Sharp win regression past peak |
| 400              | 25      | 2.28     | 1.06           | Lowest osc/collapses but mediocre wins; over-committed |

**Selected**: HYSTERESIS_BONUS=350 — highest wins/50 (37), best combat output.
Oscillation (2.82/game) is elevated vs baseline (1.9) but win rate is the ONLY hard criterion.

## Notes on Sweep Pattern
- Non-monotonic: HB=350 is a sharp peak (37/50) surrounded by 21-28 values.
- Same non-monotonic pattern as Cycle 8 sweep.
- HB=350 is the best candidate despite elevated oscillations.
- Selection criterion: HIGHEST wins/50 (oscillation threshold removed in Cycle 11).
