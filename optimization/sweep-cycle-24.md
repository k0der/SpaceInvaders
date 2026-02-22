# Cycle 24 Sweep — Emergency-Break Circuit Breaker (EMERGENCY_BREAK_LIMIT)

**Fix**: Add `_emergencyBreakStreak` counter to AI state. When consecutive emergency breaks
exceed `EMERGENCY_BREAK_LIMIT`, suppress the emergency override and run scored action selection
instead. Streak increments on each emergency break, decays by 1 on non-emergency re-evaluations.

**Hypothesis**: 62% of oscillations have gap=0.000s (emergency breaks bypassing HYSTERESIS_BONUS).
When the AI is flipping rapidly between two near-miss asteroids, the emergency break fires on the
SAME asteroid repeatedly. Suppressing one cycle lets scored trajectory selection find a path through.

## Sweep Results (50 games each, KILL-event-based win counter)

| LIMIT | Wins/50 | Win% | Osc/game | Collapse/game | Fires/game | Notes |
|-------|---------|------|----------|---------------|------------|-------|
| 1 | 24 | 48% | 2.84 | 2.04 | 4.7 | Very aggressive — fires every other break |
| 2 | 24 | 48% | 3.60 | 2.12 | 3.6 | Worst oscillation |
| 3 | 24 | 48% | 2.38 | 1.16 | 3.4 | Best collapses but same wins |
| 4 | 25 | 50% | 2.66 | 1.90 | 4.1 | Marginal improvement |
| **5** | **29** | **58%** | **2.78** | **1.88** | **2.9** | **SELECTED — highest wins** |
| 6 | 23 | 46% | 2.72 | 1.50 | 3.4 | Drops back below baseline |
| 999 (unlimited) | 20 | 40% | 2.02 | 1.28 | 3.2 | Effectively no circuit breaker |

Selected: LIMIT=5 — highest wins (29/50), fires/game acceptable (2.9).

## 200-Game Validation (LIMIT=5)

Player wins: 80/200 (40.0%)
Enemy wins: 120/200 (60.0%)
Draws: 0/200
Oscillations: 2.68/game
Collapses: 1.755/game
Fires/game: 3.2

## Decision: ROLLBACK

80/200 wins (40%) << 110 threshold. The 50-game peak (29/50 = 58%) completely inverted at 200
games to 40% — the largest sweep-to-validation inversion observed across all 24 optimization cycles
(-30 win swing).

## Analysis

The fundamental assumption was wrong: the emergency break firing repeatedly does NOT mean it's a
false positive. It fires repeatedly because the AI's trajectory genuinely keeps intersecting the
asteroid — the ship is in a geometry where no available action clears the obstacle within 3 steps.

When the circuit opens and scored selection runs:
- `scoreTrajectory` applies the full COLLISION_BASE_PENALTY (-20000) or danger zone penalty to all
  trajectories that pass through the asteroid
- The "best" scored action is still heavily penalized but merely the least-bad option
- This does NOT create a new exit path — it just runs a second evaluation that reaches the same
  geometry the emergency break was trying to escape

The result: the circuit breaker adds re-evaluation noise without resolving the underlying deadlock.
The 50-game peak at LIMIT=5 was a seed cluster where the test games happened to not involve these
deadlock geometries during the circuit-open ticks.

## Key Insight

"Emergency-break oscillation" is a misnomer. The oscillation is not caused by the emergency break
being too sensitive — it's caused by navigation deadlock: the ship is trapped between asteroids
where no single action can clear all obstacles within the 3-step lookahead window. The breaks fire
on genuinely dangerous trajectories; suppressing them makes things worse.

True fix requires: (1) longer emergency lookahead window to see around the cluster, (2) spatial
repulsion memory to avoid re-entering the same deadlock region, or (3) multi-step emergency planning
that sequences actions across 2-3 ticks instead of picking one action and holding it.
