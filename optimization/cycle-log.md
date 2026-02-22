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

## Cycle 8 — ROLLBACK
**Problem**: Near-miss penalty overwhelms strategic signals; single-lever fixes cause oscillation. Multi-lever approach: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS sweep to find the stabilizing value.
**Fix**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=325 (selected from 5-value sweep: 250, 275, 300, 325, 350)
**Complexity**: 3 — Two constants changed + one new constant declaration

### Sweep Results
DANGER_ZONE_BASE_PENALTY fixed at: -10000
Sweeping: HYSTERESIS_BONUS

| HYSTERESIS_BONUS | Wins/50 | Osc/game | Collapses/game | Notes |
|------------------|---------|----------|----------------|-------|
| 250              | 22      | 2.42     | 1.50           | Osc above threshold (2.19) |
| 275              | 22      | 3.20     | 1.84           | Osc above threshold, worse than 250 |
| 300              | 17      | 2.50     | 1.40           | Osc above threshold, wins dropped badly |
| 325              | 32      | 1.50     | 1.40           | Best 50-game: osc below baseline, wins 32/50 |
| 350              | 23      | 2.92     | 2.08           | Regression — both metrics elevated |

**Selected**: HYSTERESIS_BONUS=325 — highest wins/50 (32), oscillations/game below baseline (1.50 vs 1.90)

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game

### Metrics After
Player wins: 115/200 | Enemy wins: 85/200 | Draws: 0/200
Oscillations: 2.74/game (+44%) | Collapses: 2.245/game (+40%) | Fires: 3.91/game (+26%) | Action changes: 8.5/game

### Decision
ROLLBACK — Two secondary metrics exceeded the 15% threshold. Player wins improved to 115/200 (+13%, above the 100-win floor), but oscillations rose 44% (2.74 vs 1.9/game, threshold 2.19) and collapses rose 40% (2.245 vs 1.6/game, threshold 1.84). The 50-game sweep identified HB=325 as the best candidate (32/50 wins, 1.5 osc/game), but the 200-game run did not replicate those secondary metrics. The sweep result was a favorable random seed cluster, not a structural improvement. Key pattern: the combined fix generates more combat engagement (fires +26%, action changes +9%) but at the cost of behavioral instability. The 50-game sweep is unreliable for this parameter space — the non-monotonic pattern (17–32/50 wins across the 5 values) indicates high random seed sensitivity. The DANGER_ZONE_BASE_PENALTY + HYSTERESIS_BONUS combination does not have a stable operating point in the swept range at 200-game scale.
---

## Cycle 9 — ROLLBACK
**Problem**: Aim signal too weak relative to HYSTERESIS_BONUS — AIM_BONUS=400 produces a score gap of ~218 points between aimed and off-aim trajectories at long range, below HYSTERESIS_BONUS=250, creating oscillation-prone scoring near the hold-timer boundary.
**Fix**: AIM_BONUS 400→1000 (sweep selected value meeting osc threshold)
**Complexity**: 1 — Tune constant

### Sweep Results
| AIM_BONUS | Wins/50 | Osc/game | Collapses/game | Fires/game | Notes |
|-----------|---------|----------|----------------|------------|-------|
| 400       | 21      | 3.24     | 2.22           | 3.9        | baseline (50-game) |
| 600       | 26      | 2.46     | 1.30           | 3.8        | |
| 800       | 31      | 2.84     | 1.96           | 2.4        | |
| 1000      | 27      | 2.04     | 1.86           | 2.3        | selected — only value within osc threshold |
| 1200      | 34      | 2.36     | 1.10           | 2.8        | highest wins, slightly exceeded osc threshold |

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game

### Metrics After
Player wins: 95/200 | Enemy wins: 105/200 | Draws: 0/200
Oscillations: 2.225/game (+17%) | Collapses: 1.435/game (-10%) | Fires: 2.7/game (-13%) | Action changes: 6.9/game

### Decision
ROLLBACK — Two criteria failed. Player wins 95/200 (47.5%) fell below the 100-win threshold. Oscillations increased 17% (2.225 vs 1.9/game, threshold 2.19) — just 0.035 above the threshold. Collapses improved 10% (1.435 vs 1.6/game). The AIM_BONUS approach reduces collapses (AI holds aim longer, less time in pure evasion) but this creates the same oscillation trade-off seen in every previous cycle: strengthening any strategic signal narrows the score gap in proximity zones, inducing flip oscillation. AIM_BONUS single-lever tuning appears exhausted — the pattern mirrors FOB, HYSTERESIS, and DZPB approaches. 9 consecutive rollbacks strongly indicate a systemic scoring architecture problem rather than a tunable constant problem.
---

## Cycle 10 — ROLLBACK
**Problem**: Oscillation — rapid action flipping regardless of score landscape. 9 consecutive rollbacks from constant tuning; attempting direct mechanical constraint on action-change frequency.
**Fix**: HOLD_TIME 0.15→0.30 (sweep: 0.15, 0.20, 0.25, 0.30, 0.35)
**Complexity**: 1 — Tune constant

### Sweep Results
| HOLD_TIME | Wins/50 | Osc/game | Collapse/game | Fires/game | Action Changes/game |
|-----------|---------|----------|---------------|------------|---------------------|
| 0.15 (baseline) | 23/50 | 2.04 | 1.48 | 2.3 | 6.1 |
| 0.20 | 23/50 | 2.40 | 1.14 | 2.0 | 5.7 |
| 0.25 | 22/50 | 3.14 | 1.66 | 3.2 | 7.1 |
| 0.30 | 26/50 | 2.24 | 2.00 | 2.3 | 5.9 |
| 0.35 | 26/50 | 2.42 | 2.26 | 2.2 | 6.0 |

Selected HOLD_TIME=0.30 (fallback criterion: best wins ≥ 25/50, lowest oscillations)

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game

### Metrics After
Player wins: 87/200 | Enemy wins: 113/200 | Draws: 0/200
Oscillations: 2.565/game (+35%) | Collapses: 1.885/game (+18%) | Fires: 2.75/game (-11%) | Action changes: 6.8/game

### Decision
ROLLBACK — All three criteria failed. Player wins 87/200 (43.5%) fell below the 100-win threshold. Oscillations increased 35% (threshold 15%). Collapses increased 18% (threshold 15%). HOLD_TIME tuning confirmed ineffective: longer hold times slow threat response (more asteroid deaths → collapse increase) and trigger more emergency collision-break overrides (which produce action changes within the hold window → oscillation increase). The oscillation is NOT caused by the timer being too short — it occurs at valid re-evaluation boundaries when the scoring landscape is unstable. HOLD_TIME is a symptom governor, not the root cause. 10 consecutive rollbacks: all single-lever constant-tuning approaches are exhausted. Future fixes must address the scoring architecture directly.
---

## Cycle 11 — KEPT
**Problem**: Near-miss penalty overwhelms strategic signals — Cycle 8 achieved 115/200 wins but was incorrectly rolled back for +44% oscillation (now-removed criterion). Re-running that approach with extended sweep.
**Fix**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350
**Complexity**: 3

### Sweep Results
| HYSTERESIS_BONUS | Wins/50 | Osc/game | Collapses/game | Notes |
|------------------|---------|----------|----------------|-------|
| 250              | 26      | 2.72     | 1.60           | Below target |
| 275              | 25      | 3.70     | 2.66           | Worst oscillation |
| 300              | 24      | 2.56     | 1.80           | Worst wins |
| 325              | 28      | 2.96     | 1.76           | Cycle 8 selection |
| **350**          | **37**  | **2.82** | **2.10**       | **Best 50-game (selected)** |
| 375              | 21      | 2.58     | 1.62           | Sharp regression |
| 400              | 25      | 2.28     | 1.06           | Low osc but mediocre wins |

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200
Oscillations: 1.9/game | Collapses: 1.6/game | Fires: 3.1/game

### Metrics After
Player wins: 108/200 | Enemy wins: 92/200 | Draws: 0/200
Oscillations: 2.50/game (+32%, monitoring only) | Collapses: 1.77/game (+10.6%) | Fires: 3.36/game (+8%) | Action changes: 7.8/game

### Decision
KEPT — Primary criterion met: player wins 108/200 (54%) > 100/200 threshold. Win rate improved +5.9% (102→108) over baseline. Oscillations increased 32% — recorded for monitoring but NOT a blocking criterion per updated Cycle 11 rules. The DANGER_ZONE_BASE_PENALTY structural decoupling (kept from Cycle 8) combined with HYSTERESIS_BONUS=350 is the first configuration to both pass the win criterion AND sustain beyond 200 games. Consecutive rollback counter reset to 0.
---

## Cycle 12 — KEPT
**Problem**: Low fire rate — player fires 1.97/game vs enemy 2.26/game. FOB=300 is insufficient to stabilize aim-holding trajectories against HYSTERESIS_BONUS=350. At hold-timer expiry, an aimed trajectory with moderate proximity often scores below evasion because the fire bonus (300*0.4*steps=1800 max) is narrowly outweighed by the near-miss penalty. The player oscillates 6× more than the enemy (112 vs 18 per 50 games) due to unstable aim/evasion scoring at every re-evaluation boundary.
**Fix**: FIRE_OPPORTUNITY_BONUS 300→450 (first FOB test under the DZPB=-10000+HB=350 architecture)
**Complexity**: 1 — Tune constant

### Sweep Results
DANGER_ZONE_BASE_PENALTY=-10000, HYSTERESIS_BONUS=350 (fixed)
Sweeping: FIRE_OPPORTUNITY_BONUS

| FOB | Wins/50 | Osc/game | Collapses/game | Fires/game | Action changes/game |
|-----|---------|----------|----------------|------------|---------------------|
| 300 | 28 | 2.38 | 1.70 | 2.40 | 7.1 |
| 375 | 28 | 2.28 | 1.60 | 2.68 | 7.4 |
| **450** | **29** | **2.28** | **1.78** | **1.96** | **6.6** |
| 525 | 25 | 2.56 | 1.26 | 2.60 | 6.5 |
| 600 | 25 | 2.84 | 1.62 | 4.18 | 8.1 |

**Selected**: FOB=450 — highest wins/50 (29/50)

### Metrics Before
Player wins: 108/200 | Enemy wins: 92/200 | Draws: 0/200
Oscillations: 2.50/game | Collapses: 1.77/game | Fires: 3.36/game

### Metrics After
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game (+0.4%) | Collapses: 1.28/game (-28%) | Fires: 3.10/game (-8%) | Action changes: 7.6/game

### Decision
KEPT — Primary criterion met: player wins 109/200 (54.5%) > 108/200 (current best). Marginal improvement of +1 win (+0.5%). Collapses improved 28% (1.77→1.28/game) — the best collapse reduction in any KEPT cycle. Oscillations held stable (+0.4%). Fires slightly lower (3.10 vs 3.36/game) but still above baseline. The sweep shows FOB>450 harms performance (525,600 both 25/50) — consistent with the Cycle 4 pattern where excessive FOB causes aim-holding into proximity zones. FOB=450 appears to be the effective ceiling for this architecture.

---

## Cycle 13 — ROLLBACK

**Problem**: Emergency-break oscillation dominates behavioral instability. Cycle 13 analysis identified that 62% of detected oscillations have gap=0.000s — these are emergency collision-break overrides fired by `hasImminentCollision`, which bypasses HYSTERESIS_BONUS entirely. Previous cycles 3, 8, 10 targeted HYSTERESIS_BONUS and HOLD_TIME respectively, but these do not affect emergency breaks. The root cause is COLLISION_BREAK_STEPS=3 (0.3s lookahead) triggering false-positive emergency overrides for near-misses that the full 1.5s simulation would route around safely.
**Fix**: COLLISION_BREAK_STEPS 3→1 (sweep: 1,2,3,4,5)
**Complexity**: 1 — Tune constant

### Sweep Results
DANGER_ZONE_BASE_PENALTY=-10000, HYSTERESIS_BONUS=350, FIRE_OPPORTUNITY_BONUS=450 (all fixed)
Sweeping: COLLISION_BREAK_STEPS

| CBS | Wins/50 | Osc/game | Collapses/game | Fires/game | Action changes/game |
|-----|---------|----------|----------------|------------|---------------------|
| **1** | **30** | 2.30 | 1.34 | 2.96 | 8.1 |
| 2   | 22 | 2.16 | 1.46 | 2.46 | 6.0 |
| 3   | 21 | 2.40 | 1.74 | 2.68 | 7.2 |
| 4   | 26 | 2.70 | 1.68 | 2.44 | 7.0 |
| 5   | 27 | 4.10 | 1.64 | 3.44 | 9.3 |

CBS=3 is the current/original value. **Selected**: CBS=1 — highest wins/50 (30/50).

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (CBS=1, 200-game validation)
Player wins: 106/200 | Enemy wins: 94/200 | Draws: 0/200
Oscillations: 1.965/game (-21.7%) | Collapses: 1.605/game (+25.4%) | Fires: 2.86/game (-7.7%) | Action changes: 7.0/game

### Decision
ROLLBACK — Primary criterion failed: player wins 106/200 (53%) < current best 109/200 (54.5%). The oscillation hypothesis was confirmed: CBS=1 reduced oscillations 21.7% as predicted (emergency breaks restricted to genuine 0.1s collisions only). However, collapses increased 25.4% — genuine collisions in the 0.1–0.3s window formerly caught by the emergency break are now handled by the hold-expiry one cycle later (0.15s), resulting in more asteroid deaths. The oscillation reduction and collapse increase cancel each other out, producing no win rate improvement. CBS tuning is exhausted: CBS=3 is the balanced operating point for HOLD_TIME=0.15s. Any reduction improves oscillation but regresses collapses symmetrically.

---
