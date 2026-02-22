# Sweep Cycle 23 — SIM_DT

**Date**: 2026-02-22
**Hypothesis**: SIM_DT=0.1 may not be optimal. Finer steps (DT<0.1) give the simulation more precision per step; coarser steps (DT>0.1) extend the lookahead window. SIM_STEPS=15 was confirmed optimal at DT=0.1 in Cycle 16. Changing DT changes both step granularity and effective lookahead simultaneously.

**Current best**: 110/200 wins (55.0%) at SIM_DT=0.1, SIM_STEPS=15 (1.5s lookahead)

## Sweep Results (50 games each)

| DT | Lookahead | Player wins | Enemy wins | Draws | Win rate | Osc/game | Collapse/game | Fires/game |
|----|-----------|-------------|------------|-------|----------|----------|---------------|------------|
| 0.07 | 1.05s | **33** | 15 | 2 | **66.0%** | 2.54 | 1.76 | 3.7 |
| 0.08 | 1.20s | 22 | 26 | 2 | 44.0% | 3.26 | 2.08 | 3.2 |
| 0.10 (baseline) | 1.50s | 31 | 19 | 0 | 62.0% | 2.86 | 1.92 | 3.2 |
| 0.12 | 1.80s | 25 | 23 | 2 | 50.0% | 2.86 | 1.82 | 4.5 |
| 0.15 | 2.25s | 21 | 28 | 1 | 42.0% | 3.60 | 1.86 | 3.2 |

**Winner**: DT=0.07 (33/50 = 66%)

**Pattern observed**: Non-monotonic. DT=0.07 wins strongly, DT=0.08 collapses (22/50), DT=0.1 and 0.12 moderate. This irregular pattern (not monotonic) is consistent with favorable random seed clustering in 50-game runs.

## 200-Game Validation (DT=0.07)

| Metric | DT=0.07 | Current Best (DT=0.1) | Change |
|--------|---------|----------------------|--------|
| Player wins | 108/200 | 110/200 | -2 |
| Win rate | 54.0% | 55.0% | -1.0% |
| Oscillations/game | 2.50 | 2.26 | +10.6% |
| Collapses/game | 1.61 | 1.61 | 0% |
| Fires/game | 3.9 | 3.425 | +13.6% |
| Draws | 7 | 0 | — |

## Decision: ROLLBACK

**Reason**: 108/200 wins < 110 threshold. DT=0.07 won the 50-game sweep strongly (33/50 = 66%) but this was a favorable seed cluster — the 200-game result inverted to 108/200 (-2 wins from best, -3 wins from threshold). This is the classic pattern seen in cycles 8, 11, 14, 16, 17: large 50-game win leads collapse at 200 games.

**Key findings**:
1. DT=0.07 produces more fires (+13.6%) — finer steps give more trajectory steps within the close-range window but fewer total simulation frames at DT=0.07 (15 steps × 0.07s = 1.05s vs 1.5s baseline). The shorter lookahead appears to create more combat opportunities in 50-game runs but not at 200-game scale.
2. Draws increased from 0 to 7 (3.5%) — possibly related to edge cases in the shorter lookahead not detecting long-range collision threats.
3. Non-monotonic sweep pattern is characteristic of seed sensitivity, not structural improvement.

**SIM_DT tuning is now exhausted** — all values in [0.07, 0.08, 0.10, 0.12, 0.15] tested. SIM_DT=0.1 is confirmed optimal.

## Notes on Test Compatibility

Changing SIM_DT from 0.1 to 0.07 required updating several DT-sensitive tests:
- Gap thresholds in oscillation reproduction tests (scenarios produce different score magnitudes at different DT)
- The "winner name matches best-scoring candidate" test needed tie-handling update (T___ and PUR tied at DT=0.07)
- These are scenario-specific tests from earlier cycles; the underlying behavioral properties (no 19,000-point cliff) remain valid but thresholds needed adjustment

On ROLLBACK: `git checkout -- src/ai-predictive-optimized.js test/ai-predictive-optimized.test.js` restores all 1261 tests passing.
