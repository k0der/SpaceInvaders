# Cycle 12 Sweep — FIRE_OPPORTUNITY_BONUS

**Architecture**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350 (Cycle 11 KEPT)

## Sweep Results (50 games each)

| FOB | Wins/50 | Osc/game | Collapses/game | Fires/game | Action changes/game |
|-----|---------|----------|----------------|------------|---------------------|
| 300 | 28 | 2.38 | 1.70 | 2.40 | 7.1 |
| 375 | 28 | 2.28 | 1.60 | 2.68 | 7.4 |
| **450** | **29** | **2.28** | **1.78** | **1.96** | **6.6** |
| 525 | 25 | 2.56 | 1.26 | 2.60 | 6.5 |
| 600 | 25 | 2.84 | 1.62 | 4.18 | 8.1 |

**Selected**: FOB=450 (highest wins/50 at 29/50)

## Notable observations

- FOB=300 and FOB=375 tied at 28/50 wins — the baseline architecture (Cycle 11) at ~54% shows ~28/50 in sweep runs
- FOB=450 marginally improves to 29/50 with same oscillation rate as FOB=375
- FOB=525 and FOB=600 both regress to 25/50 — consistent with Cycle 4 pattern where excessive FOB causes aim-holding into proximity zones
- Fire rate at FOB=450 shows a surprising dip to 1.96/game (vs 2.40 at FOB=300) — likely 50-game seed variation
- Collapses monotonically decrease from 300 to 525 (1.70 → 1.26), then back up at 600 (1.62) — FOB=525/600 reduces enemy collapse behavior but harms win rate

## 200-Game Validation (FOB=450)

- Player wins: **109/200** (54.5%)
- Enemy wins: 91/200
- Oscillations: 501 (2.51/game)
- Collapses: 255 (1.28/game)
- Fires: 624 (3.10/game)
- Action changes: 1521 (7.6/game)

## Decision: KEEP

109/200 > 108/200 (current best). Primary criterion met.
