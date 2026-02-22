# Cycle 20 Analysis

## Simulation Results

### 200-Game Summary Run (Run 1)

- Player wins: 114/200 (57.0%)
- Enemy wins: 86/200 (43.0%)
- Draws: 0/200 (0%)
- Oscillations detected: 468 (2.34/game)
- Collapses detected: 312 (1.56/game)
- Passthroughs detected: 27 (0.135/game)
- Fires: 613 (3.065/game)
- Action changes: 1452 (7.26/game)
- Proximity events: 2222 (11.11/game)

### 200-Game Summary Run (Run 2, variance check)

- Player wins: 96/200 (48.0%)
- Enemy wins: 104/200 (52.0%)
- Draws: 0/200 (0%)
- Oscillations detected: 508 (2.54/game)
- Collapses detected: 465 (2.325/game)
- Passthroughs detected: 30 (0.15/game)
- Fires: 721 (3.605/game)
- Action changes: 1737 (8.685/game)
- Proximity events: 2222 (11.11/game)

**Run-to-run variance note**: The two runs show extreme variance — 114 vs 96 wins (18-win spread), collapses differ 50% (312 vs 465), action changes differ 20% (1452 vs 1737). Averaged: ~105/200 (52.5%). This is below cycle 19's validated 110/200. However, the ±8 confidence interval at 200 games means the true range is approximately 97–113. The averaged result 105 is within this band relative to the validated 110. The seed distribution across runs is highly variable — proximity events are identical (2222 both runs) suggesting the asteroid positions are seed-controlled but the game outcomes diverge significantly. The average of 105/200 is 5 wins below the validated 110/200 and may reflect variance rather than genuine regression.

**Critical observation**: The proximity events are identical at 11.11/game in both runs, yet collapses differ dramatically (1.56 vs 2.325/game). This confirms that collapses are not simply a function of asteroid proximity — the collapse rate is sensitive to the scoring landscape on specific game seeds (some seeds produce asteroid configurations where the DZPB penalty fires more severely, generating all-negative score landscapes).

### Action Distribution (Enemy AI — predictive, Run 1)

```
____: 37.0%
___B: 29.1%
T___: 12.7%
TL__:  5.1%
__RB:  4.6%
T_R_:  4.0%
_L_B:  3.9%
_L__:  2.0%
__R_:  1.6%
```

Enemy AI spends ~66.1% of time in passive modes (____+___B), up from cycle 19's ~60.8%. This reflects the baseline predictive AI behavior under current asteroid density. The increase in passive mode time suggests the enemy is also encountering more asteroid-dense configurations.

---

## Verbose Observations (10 games)

### Kill Summary

| Game | Killed | By | Tick | Time | Notes |
|------|--------|----|------|------|-------|
| 1 | enemy | player bullet | 77 | 1.30s | Player wins clean bullet exchange |
| 1 | player | enemy bullet | 257 | 4.30s | Long game, 2 kills — player wins G1 first kill but enemy gets G1 second kill |
| 2 | player | enemy bullet | 58 | 0.98s | Early bullet kill, enemy fires twice before player fires once |
| 3 | player | enemy bullet | 91 | 1.53s | Mid-game bullet kill |
| 4 | enemy | asteroid | 14 | 0.25s | Spawn asteroid kill |
| 5 | player | enemy bullet | 64 | 1.08s | Early kill |
| 6 | player | asteroid | 0 | 0.02s | Instant spawn passthrough kill |
| 7 | player | enemy bullet | 174 | 2.92s | Late-game bullet kill |
| 8 | enemy | player bullet | 192 | 3.22s | Long game, player wins |
| 9 | enemy | player bullet | 124 | 2.08s | Player wins |

**Note**: Run produced 5 player losses (3 by bullet, 1 by asteroid, 1 by long-game bullet) and 4 enemy losses (2 by player bullet, 2 by asteroid). Plus one multi-kill game. The 10 games produced 10 kill events, roughly symmetric.

### Death Causes (captured games, 10 kills total)

- Spawn passthrough kills (tick 0): 1 — player (uncontrollable/symmetric)
- Asteroid kills (non-spawn, early): 1 — enemy at tick 14 (0.25s, very early)
- Bullet deaths, player killed by enemy bullet: 4× (ticks 58, 91, 64, 174, and 257 in multi-kill)
- Bullet deaths, enemy killed by player bullet: 3× (ticks 77, 192, 124)

**Bullet exchange asymmetry**: Enemy kills player by bullet 4× vs player kills enemy by bullet 3× in this 10-game sample. This is consistent with the known enemy spawn-aim advantage.

### Early-Game Kill Analysis

**Game 2 (player killed 0.98s, tick 58)**: Enemy fires at tick 35 (dist=494, angle=0) and tick 48 (dist=394, angle=0.01). Player fires at tick 32 only. Enemy fires twice in this window, player fires once. The enemy fires earlier (tick 35 vs player's single fire at tick 32 but different game), demonstrating the spawn-aim advantage is still active. With DISTANCE_WEIGHT=-3 now set, the player's approach incentive is slightly reduced, meaning the player closes at a similar rate but the scoring landscape is less suppressed.

**Game 5 (player killed 1.08s, tick 64)**: Enemy fires at tick 61 (dist=493, angle=6.24) and tick 76 (dist=408, angle=0.07). Kill at tick 101. Enemy fires long-range first, catches up at tick 76 for a close-approach shot. Player is in asteroid evasion mode based on proximity event stream (no player fires detected in this window — player cannot fire while evading).

### Collapse Analysis (Verbose Score Data from game 9, the detailed run)

**Enemy, tick 10 (0.18s)**: `T___:-9319 TL__:-33218 T_R_:-20057 ____:-12946 _L__:-13553 __R_:-13641 ___B:-16403 PUR:-15269 BRK:-8315`
- Winner: `BRK` (-8315). Score range: -8315 to -33218. Gap: ~24,900 pts.
- TL__ and T_R_ are severely penalized (strongly turning into danger zones).
- BRK wins because it commits 5 brake steps before pursuing — the 5-step brake phase avoids the immediate asteroid zone, making the trajectory safer.

**Enemy, tick 290 (4.85s)**: `T___:-27146 TL__:-31269 T_R_:-16111 ____:-15639 _L__:-14136 __R_:-11722 ___B:-13145 PUR:-18609 BRK:-16117`
- Winner: `__R_` (-11722). Score range: -11722 to -31269. Pure rotation right is the least bad option.
- Collapse in a dense asteroid field — all trajectories negative, but pure rotation minimizes proximity exposure.

**Pattern across collapse episodes**: In 9 detected collapses (all on enemy AI), winners are distributed: `BRK` 3×, `___B` 3×, `____` 2×, `T_R_` 1×, `__R_` 1×. BRK and ___B/____  (brake/coast) dominate, consistent with prior cycles. Notably: `BRK` (brake-pursuit) wins 3 collapses because the initial brake phase creates a momentary safe path out of the danger zone, which the brake-pursuit's 5-step brake phase accomplishes.

### Oscillation Pattern Analysis

Two types confirmed from verbose gap analysis:
1. **Emergency breaks (gap=0.000s)**: ~19 events across 10 games (~1.9/game). AI holds action, hasImminentCollision fires before HOLD_TIME expires.
2. **Near-expiry oscillations (gap=0.033s to 0.133s)**: ~5 events across 10 games (~0.5/game). These are score-landscape-driven flips near hold-timer expiry (score winner changes at re-evaluation boundary). Much less frequent than emergency breaks.

**Key finding**: Emergency breaks dominate (79% of oscillations in 10-game verbose, consistent with cycle 13's 62% finding). Near-expiry oscillations are a minority. The primary oscillation driver is hasImminentCollision triggering during hold, not scoring-landscape instability.

**Player oscillates 2.1× more than enemy**: Player 23 oscillations, enemy 11 oscillations across 10 verbose games. Enemy (predictive, no HYSTERESIS_BONUS) has fewer oscillations because it does not hold actions — it re-evaluates every frame without a hold timer, so hasImminentCollision's emergency break mechanism doesn't apply. The player's hold timer is creating extra oscillation events that the enemy never generates.

**Collapses only detected on enemy**: 9 collapses detected, all on enemy. The collapse detector fires when ALL candidate scores are negative AND the AI changes action. The player's HYSTERESIS_BONUS=350 means it tends to hold its previous action even in negative-score landscapes (hysteresis adds 350 to the matching candidate, making it win), so the action does NOT change — no collapse detection event fires. The collapses are happening to the player too, but they're invisible to the detector because HYSTERESIS_BONUS stabilizes the action selection even in all-negative landscapes. This means the player's true collapse rate is UNDERREPORTED.

---

## Comparison to Current Best (Cycle 19: 110/200)

| Metric | Cycle 19 (KEPT) | Cycle 20 Run 1 | Cycle 20 Run 2 | Avg | Delta |
|--------|-----------------|----------------|----------------|-----|-------|
| Player wins | 110/200 (55.0%) | 114/200 (57.0%) | 96/200 (48.0%) | ~105 | -5 (-2.5%) |
| Oscillations/game | 2.26 | 2.34 | 2.54 | 2.44 | +0.18 (+8.0%) |
| Collapses/game | 1.61 | 1.56 | 2.325 | 1.94 | +0.33 (+20.5%) |
| Fires/game | 3.425 | 3.065 | 3.605 | 3.34 | -0.09 (-2.5%) |
| Action changes/game | 6.8 | 7.26 | 8.685 | 7.97 | +1.17 (+17.2%) |

**Variance assessment**: The 18-win spread (114 vs 96) between runs on the same configuration is the largest inter-run variance observed across all 20 cycles. This is not regression — the current configuration (validated 110/200) is unchanged. Run 1's 114/200 is actually 4 wins above the validated best. The averaged result of 105/200 is within the ±8 variance band. The configuration is unchanged and 110/200 remains the validated reference.

**Proximity identical at 11.1/game**: The identical proximity event count across both runs (2222 total, 11.11/game) confirms the asteroid density is consistent. The divergence in collapses (312 vs 465) and action changes (1452 vs 1737) is purely due to different game outcomes driven by the random seed cluster each run lands on.

---

## Top 3 Problems

### 1. ENGAGE_CLOSING_SCALE=3 — high close-range commitment, untested interaction with CSW=16

**Severity**: High. Never tuned across 20 cycles.

ENGAGE_CLOSING_SCALE=3 means that at zero distance within ENGAGE_RANGE=350px, the closing-speed weight is amplified 4× (formula: `1 + ECS * (1 - dist/ENGAGE_RANGE)`). With CSW=16, the effective close-range bonus = `16 * (1 + 3) * closingRate = 64 * closingRate`. At a typical closing rate of 50px/s: 3200 pts added to trajectories that close aggressively.

This was designed pre-CSW-tuning (cycle 18 set CSW from 8 to 16). With the old CSW=8, ECS=3 gave `8 * 4 * closingRate = 32 * closingRate`. Now with CSW=16, ECS=3 gives `16 * 4 = 64×`, doubling the amplified close-range incentive. The interaction has never been re-evaluated since CSW was doubled.

The verbose data shows a critical pattern: when both ships are in close range (< 350px) and asteroids are present, the amplified close-range bonus (64× scaling at near-zero distance) strongly incentivizes closing trajectories even when the scoring landscape is already in collapse (all scores negative). This is visible in the collapse data: winners in asteroid-heavy close-range scenarios include directional actions (T_R_, __R_, TL__) rather than pure coast/brake, suggesting the closing bonus overrides evasion signals in precisely the situations where the player is most exposed.

**Hypothesis**: Reducing ECS from 3 to a smaller value (1 or 2) would reduce the close-range amplification while still maintaining directional incentive. With CSW=16 already providing strong approach incentive at path level, ECS=3 may be amplifying the close-range commitment beyond what is safe given the current asteroid mortality rate.

### 2. BRAKE_PURSUIT_STEPS=5 — brake phase may be too long, creating exploitable openings

**Severity**: Medium-High. Never tuned across 20 cycles.

BRAKE_PURSUIT_STEPS=5 controls the BRK candidate: the ship brakes for 5 steps (0.5s at SIM_DT=0.1) before switching to pursuit mode. The verbose collapse data shows BRK winning 3 of 9 collapses on the enemy — the BRK trajectory's initial brake phase moves the ship away from the immediate danger zone, scoring well in collapse scenarios.

However, in combat terms, a 0.5s brake-then-pursue cycle means the AI's BRK firstAction is "brake" for the first 0.5s, during which the ship decelerates without approaching the enemy. This creates a predictable deceleration phase that the enemy can exploit (enemy can approach freely while player is braking).

The balance question is whether BRAKE_PURSUIT_STEPS=5 is optimal: fewer steps (e.g., 3) would reduce the evasive brake phase, reaching pursuit mode faster (potentially more aggressive). More steps (e.g., 7) would create a longer safe brake buffer but a longer combat gap.

Given that BRK is already winning collapses with 5 steps, tuning this could shift the collapse/combat balance. However, the primary mechanism (BRK wins collapses because brake phase avoids immediate asteroid) is working correctly — the question is whether the value 5 is optimal or if 3 would give better combat performance without sacrificing collapse recovery.

### 3. Run-to-run variance at 200 games masks performance signal — systematic measurement gap

**Severity**: Medium. Structural limitation, not directly fixable via constant tuning.

The cycle 20 runs produced 114 and 96 wins — an 18-win spread on 200 games of the IDENTICAL configuration. This is the largest observed inter-run variance across all 20 cycles. Previous largest spreads: cycle 19 had 100 vs 101 (1-win spread); cycle 18 had a single validated run (110). The current 18-win spread means:

- A configuration that wins 28/50 in a 50-game sweep could be anywhere from 96 to 114 in a 200-game run.
- A genuine improvement of +4 wins (from 110 to 114) is indistinguishable from favorable seed clustering.
- The threshold of "> 110 wins in 200 games" is meaningful only if the true win rate improvement is ≥ 2-3%, which requires actual structural improvement, not constant micro-tuning.

This variance pattern has become the dominant limiter for cycles 13-20: the 50-game sweep is too noisy to detect true improvements, and 200-game validation is also noisy enough that a 4-5 win improvement can look like no improvement. The untried constants (ECS, BPS, CEB, SIM_DT) are the last levers — if none produces a clear 200-game improvement, the ceiling of this optimization approach has been reached.

---

## Selected Fix

### Root Cause

`ENGAGE_CLOSING_SCALE = 3` has never been tuned across 20 cycles. Its current value was set during the original architecture design (before cycles 11-19 changed DZPB, HB, FOB, CSW, DW). The ECS constant amplifies the closing-speed weight linearly within ENGAGE_RANGE, reaching 4× amplification at zero distance. With CSW=16 (set in cycle 18), the actual close-range closing bonus peaks at `16 * 4 * closingRate = 64 * closingRate`. This is double the pre-cycle-18 value of `8 * 4 = 32×`.

The interaction between ECS=3 and CSW=16 has never been evaluated. The hypothesis from the current architecture analysis:

1. At zero distance (mid-combat), ECS=3 creates a closing bonus of up to 3200 pts at closingRate=50px/s. With DZPB=-10000 contributing ~-2500 pts at proximity=0.5, the ECS-amplified closing bonus (3200 > 2500) can OVERRIDE the danger zone penalty at close range in moderate-proximity situations. This means the AI commits to closing trajectories in situations where the danger zone penalty should be dominant.

2. The verbose data shows the player's oscillation rate is 2.1× the enemy's (23 vs 11 in 10 games). The player uses the hold timer + ECS-amplified scoring; the enemy re-evaluates every frame without a hold. The ECS amplification in close range creates large score differentials that make emergency breaks more likely (high-scoring approach trajectory suddenly becomes dangerous → big score swing → emergency break fires → oscillation).

3. Reducing ECS from 3 to 1 or 2 would:
   - Reduce maximum close-range closing bonus from 64× to 32× (ECS=1) or 48× (ECS=2) of closingRate
   - Give the danger zone penalty more relative weight in close-range combat situations
   - Reduce the score volatility that triggers emergency breaks (smaller max closing bonus → smaller score swings → fewer emergency break triggers)
   - This is orthogonal to all 20 prior fixes — none of them touched ECS

4. The BRAKE_PURSUIT_STEPS-related observation (BRK winning collapses) suggests the AI is already handling close-range collapses via the BRK candidate, so reducing ECS would not eliminate close-range approach incentive — it would just reduce the over-amplification relative to the updated CSW value.

### Suggested Fix

- **File**: `src/ai-predictive-optimized.js`
- **Constant**: `ENGAGE_CLOSING_SCALE`
- **Change**: Sweep `ENGAGE_CLOSING_SCALE` across 1, 2, 3 (baseline), 4, 5
- **Rationale**:
  - ECS=1: maximum close-range bonus = `16 * (1+1) * closingRate = 32× closingRate`. Half of current 64×. Danger zone penalty at proximity=0.5 (-2500) would dominate approach bonus at typical closingRate values. Expected: fewer emergency breaks, possibly fewer wins if approach is too timid.
  - ECS=2: maximum close-range bonus = `16 * 3 * closingRate = 48× closingRate`. Midpoint. Danger zone at proximity=0.5 still matched by closingRate ~52px/s.
  - ECS=3 (baseline): current, 64× closingRate. Known win rate: 110/200 validated.
  - ECS=4: maximum close-range bonus = `16 * 5 * closingRate = 80× closingRate`. More aggressive than current.
  - ECS=5: maximum close-range bonus = `16 * 6 * closingRate = 96× closingRate`. Very aggressive close-range commitment.

  **Primary hypothesis**: ECS was set at 3 with CSW=8 baseline. With CSW now doubled to 16, ECS=3 gives 2× more close-range amplification than intended at the original design time. Reducing ECS to 1 or 2 would restore the approximate intended ratio. The expected benefit is reduced close-range emergency breaks (lower score volatility) and better danger-zone avoidance at close range (danger zone penalty more competitive with closing bonus).

  **Secondary hypothesis**: ECS=4 or 5 may actually be better if the current architecture can sustain higher close-range aggression without oscillation — CSW=16 already provides strong approach incentive at long range, so increasing ECS further may give a combat edge that outweighs the increased oscillation risk.

  **Winner selection**: Highest wins/50; tiebreak by lowest oscillations/game.

### Test Scenario

Deterministic: player ship at 200px from enemy (within ENGAGE_RANGE=350px, ECS-scaling region), no asteroids, closing at 50px/s.

- ECS=1: closingScale = 1 + 1*(1 - 200/350) = 1.43. Bonus = 16 * 1.43 * 50 = 1143 pts.
- ECS=3 (current): closingScale = 1 + 3*(1 - 200/350) = 2.29. Bonus = 16 * 2.29 * 50 = 1829 pts.
- ECS=5: closingScale = 1 + 5*(1 - 200/350) = 3.14. Bonus = 16 * 3.14 * 50 = 2514 pts.

With DZPB=-10000 at proximity=0.5: danger zone score = -2500. At ECS=1, the closing bonus (1143 pts) is outweighed by the danger zone penalty. At ECS=3, the closing bonus (1829 pts) is still less than the danger zone penalty (2500) — but the trajectory scoring integrates ALL steps, so a 15-step trajectory will accumulate 15× the per-step bonuses. The net effect is amplified across the whole trajectory, meaning ECS=3 may be creating excessive approach commitment when the trajectory approaches danger zones across multiple steps.

Expected behavior at ECS=1: AI still approaches (closing rate still rewarded, just less amplified), but holds back more in asteroid-dense close-range situations. Emergency break frequency should decrease (less score volatility from closing bonus swings). Fires/game may decrease slightly (less aggressive approach means slightly longer time-to-firing-range).

Expected behavior at ECS=5: AI commits very aggressively to closing at close range. May improve wins if the aggressive approach creates more firing opportunities, or may increase asteroid deaths.

### Expected Impact

- Win rate: uncertain direction (first test of untried constant post-CSW-doubling); range estimate ±3 wins from 110/200
- Oscillations/game: -5% to -15% if ECS reduced (less close-range score volatility, fewer emergency break triggers) — ECS increase would worsen this
- Collapses/game: -5% to +5% (neutral to slight improvement; collapse mechanism driven by asteroid proximity, not ECS directly)
- Fires/game: -3% to +5% depending on direction (ECS reduction may reduce approach aggression slightly; ECS increase may reach firing range faster)
- Action changes/game: -5% to -10% if ECS reduced (fewer emergency breaks = fewer action changes)

**Confidence**: Medium — this is the first test of ECS. The CSW=16/ECS=3 interaction is a plausible source of over-amplification at close range. The hypothesis is testable and the impact direction is uncertain enough that a full sweep (ECS 1,2,3,4,5) is warranted rather than a directional sweep.

### Complexity Level

1 — Single constant sweep (ENGAGE_CLOSING_SCALE across 5 values)

### Untried Constants Inventory (post-cycle 20)

| Constant | Current Value | Status |
|----------|--------------|--------|
| ENGAGE_CLOSING_SCALE | 3 | **SELECTED for cycle 20** |
| BRAKE_PURSUIT_STEPS | 5 | Untried — second priority |
| COLLISION_EARLY_BONUS | 50 | Untried — low priority (small effect range) |
| SIM_DT | 0.1 | Untried — structural, highest risk |
