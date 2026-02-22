# Optimization Cycle Log

## Cycle 0 — BASELINE

**Simulation**: 50 games, predictive-optimized vs predictive
**Results**: Player wins 35/50 (70%) | Enemy wins 15/50 (30%) | Draws 0/50 (0%)
**Detections**: oscillation: 98, collapse: 124, passthrough: 6
**Events**: ACTION_CHANGE: 276, FIRE: 118, PROXIMITY: 546, KILL: 52

---

## Cycle 2 — ROLLBACK

**Problem**: Fire-opportunity signal overwhelmed by danger-zone penalties. FIRE_OPPORTUNITY_BONUS=300 accumulates a maximum total signal of ~1,800 at mid-range (300px, 15 steps). A trajectory with proximity factor 0.386 (asteroid 78px away, danger zone 105px) receives a penalty of -20,000 × 0.386² ≈ -2,978, which exceeds the fire bonus. The AI therefore prefers evasive/rotational actions over aim-holding even when a viable firing solution exists. This explains the bullet-fight deficit: player loses 54% of bullet exchanges over 200 games despite equal fire rates.
**Fix**: Increased FIRE_OPPORTUNITY_BONUS from 300 to 600. At mid-range the signal becomes ~3,600, exceeding the proximity-0.386 penalty (-2,978) and shifting action ordering toward aim-holding in semi-collapse situations without overriding genuine collision avoidance (proximity > 0.55, penalty > -6,000, still dominates).
**Complexity**: 1 — Tune constant

### Metrics Before
Player wins: 35/50 | Enemy wins: 15/50 | Draws: 0/50
Oscillations: 98 | Collapses: 124 | Fires: 118

### Metrics After
Player wins: 24/50 | Enemy wins: 26/50 | Draws: 0/50
Oscillations: 113 | Collapses: 66 | Fires: 132

### Decision
ROLLBACK — Player wins 24/50 fell below the hard threshold of 35. Secondary metrics were encouraging: collapses reduced 47% (124→66), fires increased 12% (118→132). However, the 50-game win count is within the ±8 variance band of repeated runs (true expected rate ~50% per 200-game analysis). The drop from 35 to 24 likely reflects variance rather than genuine regression (the 35 baseline is itself a positive outlier). A 200-game validation would be needed to determine whether the collapse reduction translates to real win-rate improvement.

### Test Added
`optimization cycle 2: fire bonus dominates moderate danger penalty` — two tests verifying that (1) FIRE_OPPORTUNITY_BONUS exports as 600, and (2) at moderate asteroid proximity (penalty ~-2978), the aim-holding trajectory scores higher than an evasion trajectory when FOB=600. Both tests rolled back with the fix.

---

## Cycle 1 — ROLLBACK

**Problem**: Score collapses cause defensive paralysis — DANGER_ZONE_FACTOR=3 creates a danger zone 9x the collision area. When any trajectory step enters this zone, quadratic penalties up to -20,000 overwhelm all strategic signals (max combined aim+fire ~4,500). The AI spends 68.8% time in passive modes and fires 40% fewer shots than the enemy.
**Fix**: Reduced DANGER_ZONE_FACTOR from 3 to 2 (complexity level 1 — tune a constant). Shrinks danger zone area from 9x to 4x collision area, reducing collapse frequency.
**Complexity**: 1 — Tune constant

### Metrics Before
Player wins: 35/50 | Enemy wins: 15/50 | Draws: 0/50

### Metrics After
Player wins: 23/50 | Enemy wins: 27/50 | Draws: 0/50
Oscillations: 159 | Collapses: 83 | Fires: 196

### Decision
ROLLBACK — Player wins dropped from 35 to 23 (34% regression). Although collapses fell 33% (124→83) and fires increased 66% (118→196), the tighter danger zone caused more asteroid deaths. With a smaller avoidance envelope, the player navigated closer to asteroids and died more frequently. The net combat gain from more firing opportunities did not compensate for the increased asteroid mortality. The analysis predicted a 10-20% increase in asteroid deaths; the actual impact was larger than anticipated, flipping the result from a win-rate increase to a significant regression.

---

## Cycle 4 — ROLLBACK

**Problem**: FIRE_OPPORTUNITY_BONUS=300 is overwhelmed by danger zone penalties in semi-collapse scenarios. At proximity 0.5, danger penalty = -20,000 × 0.25 = -5,000, while max FOB signal at mid-range = 300 × 15 × 0.4 = 1,800. The AI always prefers evasion over aim-holding when asteroids are nearby, causing the bullet-fight deficit (player loses more bullet exchanges than enemy despite equal fire rates).
**Fix**: Increased FIRE_OPPORTUNITY_BONUS from 300 to 900. At 900×15×0.4 = 5,400, the max fire signal now exceeds the -5,000 danger penalty at proximity 0.5, hypothetically shifting action ordering toward aim-holding in semi-collapse situations.
**Complexity**: 1 — Tune constant

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game

### Metrics After
Player wins: 96/200 | Enemy wins: 104/200 | Draws: 0/200
Oscillations: 2.7/game (+42%) | Collapses: 1.7/game | Fires: 2.7/game (-13%) | Action changes: 7.2/game

### Decision
ROLLBACK — Player wins 96/200 fell below the 100-win threshold (48% vs 51% baseline). Secondary metric regression: oscillations increased 42% (2.7 vs 1.9/game), exceeding the 15% degradation limit. Counterintuitively, fires DECREASED from 3.1 to 2.7/game despite the stronger fire signal. This suggests the higher FOB causes the AI to hold aim trajectories into asteroid proximity, creating unstable behavior — more evasive maneuvering to recover from dangerous positions (hence higher oscillations) and ultimately fewer clean shots. The 3× increase was too aggressive; FOB tuning has a narrow effective window. 300 is too low, 900 is too high, and 600 (Cycle 2) produced favorable secondary metrics but only parity wins on 200-game runs. The fire/danger balance may require a fundamentally different mechanism rather than a single-constant FOB adjustment.

---

## Cycle 5 — ROLLBACK
**Problem**: Danger-zone penalty depth overwhelms strategic signals
**Fix**: COLLISION_BASE_PENALTY -20000 → -10000
**Complexity**: 1 — Tune constant
### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
### Metrics After
Player wins: N/A | Enemy wins: N/A | Draws: N/A
### Decision
ROLLBACK — Blocked at test phase, simulation not reached. With COLLISION_BASE_PENALTY=-10000, the existing test 'avoids asteroid when a clear path exists' failed: the AI preferred thrusting straight into an asteroid (score -4131.8) over turning to dodge (score -9215.5). Root cause: COLLISION_BASE_PENALTY controls both actual collision deterrence AND near-miss danger zone penalty via the same constant. Halving it weakened actual collision avoidance: T___ collision trajectory scored -4131.8 (penalty -10000 + early_bonus + all_strategic_signals), which beat turning candidates that accumulated danger zone proximity penalties during the turn maneuver (-9215.5). This is a structural limitation — the single constant cannot be reduced without breaking asteroid avoidance. A refactoring is required: split into COLLISION_PENALTY (actual collisions, keep -20000) and DANGER_ZONE_BASE_PENALTY (near-miss penalty, reduce to -5000 to -8000).
---

## Cycle 6 — ROLLBACK
**Problem**: COLLISION_BASE_PENALTY dual-use makes near-miss penalty untunable — Cycle 5 proved it can't be reduced without breaking collision deterrence. Structural fix: add DANGER_ZONE_BASE_PENALTY as a separate constant used only in the near-miss branch.
**Fix**: Add separate DANGER_ZONE_BASE_PENALTY=-5000 constant; change near-miss branch from `COLLISION_BASE_PENALTY * worstDanger` to `DANGER_ZONE_BASE_PENALTY * worstDanger`. COLLISION_BASE_PENALTY=-20000 unchanged for actual collisions.
**Complexity**: 3 — Add condition (new constant + split logic branch)
### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game
### Metrics After
Player wins: 104/200 | Enemy wins: 96/200 | Draws: 0/200
Oscillations: 3.1/game (+63%) | Collapses: 1.85/game (+16%) | Fires: 3.0/game | Action changes: 8.1/game
### Decision
ROLLBACK — Player wins 104/200 (52%) exceeded the 100-win threshold but oscillations increased 63% (3.1 vs 1.9/game), well above the 15% secondary metric degradation limit. The structural decoupling of DANGER_ZONE_BASE_PENALTY is the correct approach — the constant value -5000 is too aggressive. At -5000, the near-miss gradient becomes too shallow: score differences between aim-holding and evasion trajectories in the 0.3-0.5 proximity zone become small enough that HYSTERESIS_BONUS=250 cannot prevent rapid oscillation. Root cause matches Cycle 4 (FOB=900): both changes that increase aim-holding tendency produce oscillation, because the AI alternates between the now-similar aim and evasion scores on every hold-timer boundary. Next attempt: DANGER_ZONE_BASE_PENALTY=-10000 (2× reduction instead of 4×) to find a value that reduces collapse without flattening the gradient enough to cause oscillation.
---

## Cycle 3 — ROLLBACK

**Problem**: Score gap between best and second-best actions (~285 pts in high-speed approach scenarios) exceeds HYSTERESIS_BONUS=250, causing the AI to flip its action on every hold-timer boundary even when state barely changed. This was expected to contribute to oscillation count (98/game baseline).
**Fix**: Increased HYSTERESIS_BONUS from 250 to 500. At 500-pt hysteresis, the ~285-pt gap is bridged, holding the braking action stable when the AI was braking the previous frame.
**Complexity**: 1 — Tune constant

### Metrics Before
Player wins: 35/50 | Enemy wins: 15/50 | Draws: 0/50
Oscillations: 98 | Collapses: 124 | Fires: 118 | Action changes: 276

### Metrics After
Player wins: 24/50 | Enemy wins: 26/50 | Draws: 0/50
Oscillations: 171 | Collapses: 100 | Fires: 206 | Action changes: 472

### Decision
ROLLBACK — Player wins 24/50 fell below the hard threshold of 35. More critically, oscillations INCREASED 75% (98→171) and action changes increased 71% (276→472), the opposite of the intended effect. Higher hysteresis stabilizes small-gap transitions but causes larger commitment errors when conditions genuinely change — the AI holds suboptimal braking/thrusting trajectories too long as asteroid fields evolve. Fires did increase significantly (+75%), suggesting more engagement time, but without more precise aim quality, the extra firing didn't convert to wins. The oscillation regression is a real behavioral failure, not just a variance artifact.

---

## Cycle 7 — ROLLBACK
**Problem**: Near-miss penalty overwhelms strategic signals; DANGER_ZONE_BASE_PENALTY=-5000 (Cycle 6) was too aggressive (4× reduction), causing oscillation +63%. Attempting 2× reduction with DANGER_ZONE_BASE_PENALTY=-10000 to preserve gradient while reducing collapse.
**Fix**: DANGER_ZONE_BASE_PENALTY=-10000 (2× reduction vs COLLISION_BASE_PENALTY=-20000). At proximity 0.4 (worstDanger=0.16): penalty = -1600, fire signal ~2700 dominates. At proximity 0.7 (worstDanger=0.49): penalty = -4900, strongly discouraging.
**Complexity**: 3 — New constant + change one usage line (structure identical to Cycle 6)
### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game
### Metrics After
Player wins: 95/200 | Enemy wins: 105/200 | Draws: 0/200
Oscillations: 2.63/game (+38%) | Collapses: 1.56/game (-2.5%) | Fires: 3.1/game | Action changes: 7.5/game
### Decision
ROLLBACK — Two criteria failed: (1) player wins 95/200 below the 100-win threshold; (2) oscillations +38.4% exceeded the 15% secondary metric limit. Collapses improved slightly (-2.5%) and fires held steady, but both primary and oscillation criteria failed. The oscillation pattern is consistent across Cycles 4, 6, and 7: any change that makes aim-holding more competitive with evasion in proximity zones narrows the scoring gap and increases oscillation. DANGER_ZONE_BASE_PENALTY=-10000 still induced oscillation despite being a more conservative reduction than -5000 (Cycle 6). This demonstrates that DZPB tuning is exhausted as a single-lever fix — the oscillation is structural: HYSTERESIS_BONUS=250 is insufficient to absorb the increased score gap volatility in proximity zones regardless of the exact DZPB value. A multi-lever combination (DZPB reduction + HYSTERESIS_BONUS increase) is the most plausible next approach.
---
