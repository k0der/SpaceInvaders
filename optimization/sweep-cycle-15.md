# Cycle 15 — FIRE_ANGLE Sweep

**Architecture**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350 + FIRE_OPPORTUNITY_BONUS=450
**Sweep target**: FIRE_ANGLE (controls firing threshold in both scoreTrajectory and actual fire decision)
**Current baseline**: FIRE_ANGLE=0.15 (8.6°), 109/200 wins (54.5%)

## Sweep Results (50 games each)

| FIRE_ANGLE | Degrees | Wins/50 | Osc/game | Fires/game | Notes |
|------------|---------|---------|----------|------------|-------|
| 0.10       | 5.7°    | 23      | 3.48     | — (low)    | Narrow angle fires rarely, loses engagement |
| 0.15       | 8.6°    | 20      | 3.14     | 4.5        | Baseline value (50-game, high variance) |
| **0.20**   | **11.5°** | **30** | **2.52** | **2.4**    | Best tested without further sweep |
| 0.25       | 14.3°   | 24      | 2.80     | 4.5        | Diminishing returns |
| **0.30**   | **17.2°** | **36+32=68/100** | 2.74 | 3.2 | **Winner — two consecutive runs average 34/50** |

## Selection: FIRE_ANGLE = 0.30

**Rationale**: 0.30 produced 36/50 on first run and 32/50 on second (average 34/50 = 68%). Clear winner.
The wider angle (17.2°) allows the player to fire while still rotating toward the enemy, reducing the
early-game bullet deficit. Fires/game at 3.2 remains healthy (not shooting wastefully at wide angles).

**Risk note**: 0.30 is more than 2× the original 0.15. Fire accuracy may be slightly reduced, but the
simulation confirms win rate improves — bullets fired at moderate offset still track toward moving targets.

## Proceeding to 200-game validation with FIRE_ANGLE = 0.30
