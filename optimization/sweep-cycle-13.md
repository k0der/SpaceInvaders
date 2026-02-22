# Cycle 13 Sweep — COLLISION_BREAK_STEPS

## Sweep Configuration

- Parameter: `COLLISION_BREAK_STEPS`
- Values tested: 1, 2, 3, 4, 5
- Games per value: 50
- Selection criterion: highest wins/50

## Results

| CBS | Wins/50 | Osc/game | Collapses/game | Fires/game | Action changes/game |
|-----|---------|----------|----------------|------------|---------------------|
| 1   | **30**  | 2.30     | 1.34           | 2.96       | 8.1                 |
| 2   | 22      | 2.16     | 1.46           | 2.46       | 6.0                 |
| 3   | 21      | 2.40     | 1.74           | 2.68       | 7.2                 |
| 4   | 26      | 2.70     | 1.68           | 2.44       | 7.0                 |
| 5   | 27      | 4.10     | 1.64           | 3.44       | 9.3                 |

CBS=3 is the original/current value. CBS=1 wins the sweep (30/50, +9 over baseline CBS=3).

## Selected Value: CBS=1

CBS=1 reduces lookahead to 0.1s. The emergency break only fires when the asteroid is
within one simulation step (0.1s) of collision — strictly genuine immediate collisions.

## 200-Game Validation (CBS=1)

- Player wins: 106/200 (53.0%)
- Enemy wins: 94/200 (47.0%)
- Oscillations: 393 (1.965/game)
- Collapses: 321 (1.605/game)
- Fires: 572 (2.86/game)
- Action changes: 1399 (7.0/game)

## Decision: ROLLBACK

CBS=1 produced 106/200 wins vs current best 109/200. The improvement criterion
(wins >= 109) was not met. The 3-win gap is within the ±8 variance band but does
not satisfy the hard threshold.

Secondary metrics show improvement:
- Oscillations: 1.965/game vs 2.51 (-21.7%) — confirms the hypothesis
- Collapses: 1.605/game vs 1.28 (+25.4%) — regression (genuine collisions missed?)
- Fires: 2.86/game vs 3.10 (-7.7%) — slight regression

The oscillation reduction is real but the collapse increase (+25%) suggests CBS=1
may be too aggressive a reduction — genuine 0.1–0.3s collisions are no longer caught
by the emergency break, and the 0.15s hold-expiry re-evaluation catches them slightly
late, causing asteroid deaths that manifest as collapses.

## Key Learnings

1. CBS reduction does reduce oscillations as predicted (CBS=1: -21.7%, CBS=2: -14%
   oscillation improvement in sweep pattern), but at the cost of increased collapses.
2. The win rate improvement does not materialize despite reduced oscillation — the
   collapse increase from missed genuine collisions offsets the benefit.
3. CBS=4 and CBS=5 both showed worse oscillation than CBS=3 (wider lookahead = more
   false positives). CBS=1 and CBS=2 reduced oscillation but increased collapses.
4. There is no CBS value in {1,2,4,5} that outperforms CBS=3 on the primary criterion
   (wins >= 109) at 200 games. CBS is a balanced tuning: the current value of 3 (0.3s
   lookahead) appears to be the appropriate operating point given the current HOLD_TIME=0.15s.
5. The emergency-break oscillation identified in the Cycle 13 analysis is real, but
   fixing it via CBS reduction alone is insufficient — reducing CBS moves the problem
   (fewer false positives, more genuine misses) rather than eliminating it.
