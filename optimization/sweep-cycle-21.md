# Cycle 21 Sweep — BRAKE_PURSUIT_STEPS

**Date**: 2026-02-22
**Hypothesis**: BRAKE_PURSUIT_STEPS=5 commits the BRK candidate to a 0.5s brake phase before pursuing.
A lower value (3-4) would engage pursuit faster after the brake, giving more time to close on the enemy
and creating more firing opportunities within the 1.5s simulation window. A higher value (7) would
extend the safe brake buffer but create a longer combat gap.

## RED Test

The test compared `scoreTrajectory` on a `simulatePursuitTrajectory` trajectory with `brakeSteps=4`
vs `brakeSteps=BRAKE_PURSUIT_STEPS`. With BPS=5, the BPS trajectory scored worse (7215.4 < 8334.6).
The test asserted `scoreBPS >= score4`. FAILED with BPS=5 (RED). PASSED with BPS=4 (GREEN).

## 50-Game Sweep Results

Note: Standard simulate.js win counter is broken (updateGameState not passed dt, causing all
games to be "draws"). Wins are counted from KILL event data using optimization/run-sweep.js
which infers winner from the victim field of KILL events.

| BPS | Wins/50 | Win% | Osc/game | Collapse/game | Fires/game | Action changes/game |
|-----|---------|------|----------|---------------|------------|---------------------|
| 2 | 28 | 56% | 2.50 | 1.54 | 3.1 | 7.5 |
| 3 | 24 | 48% | 2.04 | 1.74 | 2.2 | 6.4 |
| **4** | **30** | **60%** | **2.06** | **1.90** | **2.3** | **6.2** |
| 5 (baseline) | 26 | 52% | 2.54 | 1.58 | 3.4 | 7.7 |
| 7 | 24 | 48% | 2.74 | 1.46 | 3.1 | 8.1 |

**Selected**: BPS=4 — highest wins (30/50) with significantly lower oscillations (2.06 vs 2.54/game).
Notable: BPS=3 and BPS=4 both show lower fires/game (2.2-2.3 vs 3.1-3.4). This suggests lower BPS
values cause the BRK candidate to win more often (firstAction = braking), reducing immediate firing
while improving approach.

## 200-Game Validation (BPS=4)

Run with KILL-event-based win counter:

| Metric              | BPS=4  | BPS=5 baseline (200g) | Change   |
|---------------------|--------|----------------------|----------|
| Player wins         | 104    | 113                  | -9 (-8%) |
| Win rate            | 52.0%  | 56.5%                | -4.5%    |
| Oscillations/game   | 2.40   | 2.94                 | -18.4%   |
| Collapses/game      | 1.92   | 2.31                 | -16.9%   |
| Fires/game          | 3.3    | 4.1                  | -19.5%   |
| Action changes/game | 7.8    | 8.8                  | -11.4%   |

Fresh BPS=5 baseline (200 games, corrected counter): 113/200 (56.5%)
BPS=4 result: 104/200 (52.0%)

**Note on discrepancy**: Historical state.json records 110/200 for BPS=5, but fresh 200-game run
gives 113/200. The difference (3 wins) is within the ±8 variance band of 200-game runs. Historical
data was generated with a different win-counting method (broken gameState.phase counter), making
direct comparison unreliable. The corrected KILL-event counter is used for all Cycle 21 measurements.

## Decision: ROLLBACK

BPS=4 produces 104/200 wins with the corrected counter vs 113/200 for BPS=5 baseline.
104 < 110 threshold → ROLLBACK.

The 50-game sweep showed a strong-looking signal (30/50 vs 26/50) but it did not replicate at
200 games. The BPS=4 improvement in oscillations (-18%) and collapses (-17%) was real, but the
win rate regressed by 9 wins — a significant regression, not noise. BRAKE_PURSUIT_STEPS=5 remains
the better value on the primary win criterion.

**Key finding**: BPS=3 and BPS=4 both show dramatically lower fires/game (2.2-2.3 vs 3.4 baseline).
Lower BPS means the BRK candidate wins more trajectory evaluations — its firstAction is "braking"
for the first brake steps, reducing immediate combat engagement. The BRK trajectory is being selected
MORE often with lower BPS, not less. This counterintuitive result suggests that the BRK candidate
with fewer brake steps scores BETTER in asteroid-dense scenarios (shorter brake = cleaner trajectory
in dangerous zones), causing the AI to prefer BRK frequently even when not in combat.

With BPS=4, the AI spends more time braking (BRK wins more evaluations), generating fewer fires
but also fewer oscillations. The win regression suggests that aggressive braking at the cost of
combat engagement is suboptimal for the overall game outcome.

BPS=5 (baseline) remains optimal: the 5-step brake phase is long enough that BRK only wins
evaluations when genuinely needed (real overshoot/emergency scenarios), while shorter values
cause BRK to over-trigger in normal approach scenarios.
