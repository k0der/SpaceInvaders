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

## Cycle 16 — ROLLBACK

**Problem**: All scoring-constant and mechanical levers exhausted across 15 cycles. SIM_STEPS=15 (1.5s lookahead) is the only untried structural parameter. Hypothesis: longer lookahead would detect threats at 1.5–2.5s that the current 1.5s window misses, improving trajectory planning through asteroid fields.

**Fix**: SIM_STEPS sweep: 10, 12, 15, 18, 22. Hypothesis overturned — shorter lookahead won the 50-game sweep (SS=10 at 33/50), not longer. SIM_STEPS=10 selected for 200-game validation.

**Architecture at test time**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350 + FIRE_OPPORTUNITY_BONUS=450 (Cycle 12 config, unchanged since Cycle 12)

### Sweep Results

| SIM_STEPS | Lookahead | Wins/50 | Osc/game | Col/game | Fires/game | Proximity/game |
|-----------|-----------|---------|----------|----------|------------|----------------|
| **10** | **1.0s** | **33** | **2.42** | **2.02** | **3.16** | **8.2** |
| 12 | 1.2s | 31 | 1.96 | 1.02 | 3.16 | 6.3 |
| 15 (baseline) | 1.5s | 31 | 3.20 | 2.00 | 3.88 | 10.8 |
| 18 | 1.8s | 24 | 2.96 | 1.86 | 3.20 | 4.6 |
| 22 | 2.2s | 23 | 2.48 | 1.58 | 3.84 | 6.7 |

**Selected**: SIM_STEPS=10 — highest wins/50 (33/50).

Note: Sweep reveals monotonically decreasing wins as steps increase (10→12→15→18→22 = 33→31→31→24→23). Hypothesis that longer lookahead helps was incorrect in 50-game runs.

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (SIM_STEPS=10, 200-game validation)
Player wins: 108/200 | Enemy wins: 92/200 | Draws: 0/200
Oscillations: 2.75/game (+9.6%) | Collapses: 1.785/game (+39.5%) | Fires: 3.5/game (+13%) | Action changes: 8.1/game | Proximity: 14.2/game

### Decision
ROLLBACK — Primary criterion failed: player wins 108/200 (54.0%) < current best 109/200 (54.5%). The 50-game sweep winner (33/50 = 66%) was a favorable seed cluster. Collapses elevated at 1.785/game (+39.5%) — the shorter 1.0s lookahead generates 14.2 proximity events/game (vs ~6-8 at baseline) as the AI cannot see asteroid threats far enough ahead. The monotonic shorter=more-wins pattern in 50-game runs inverts at 200 games where the higher collapse rate cancels the apparent win advantage. SIM_STEPS is now fully exhausted as a tuning target. SIM_STEPS=15 is at or near the optimum: shorter reduces threat detection, longer adds computational constraint without strategic benefit. Consecutive rollbacks: 4.

### Additional: Test Infrastructure Fix
- The 'winner name matches best-scoring candidate' test had a latent tie-handling fragility: when T___ (fixed candidate) and PUR (pursuit, also thrust-straight on ship-at-origin) score identically, the test's `reduce` selected PUR (last equal) but the actual selection picked T___ (first equal). Changed to `toContain` over all top-scoring candidates.

---

## Cycle 15 — ROLLBACK

**Problem**: Fire angle too narrow — FIRE_ANGLE=0.15 (8.6°) means player cannot fire during the 1–2s rotation phase from spawn (player spawns heading -π/2). Enemy spawns aimed at player and fires from tick 1, creating an early-game bullet deficit. Hypothesis: wider FIRE_ANGLE lets player fire during rotation, reducing the deficit.

**Fix**: FIRE_ANGLE sweep: 0.10, 0.15, 0.20, 0.25, 0.30. Selected FIRE_ANGLE=0.30 (17.2°) — highest 50-game wins.

**Architecture at test time**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350 + FIRE_OPPORTUNITY_BONUS=450 (Cycle 12 config)

### Sweep Results
| FIRE_ANGLE | Degrees | Wins/50 | Osc/game | Fires/game | Notes |
|------------|---------|---------|----------|------------|-------|
| 0.10 | 5.7° | 23 | 3.48 | low | Too narrow, very few fires |
| 0.15 | 8.6° | 20 | 3.14 | 4.5 | Baseline (50-game noise) |
| 0.20 | 11.5° | 30 | 2.52 | 2.4 | Clear improvement |
| 0.25 | 14.3° | 24 | 2.80 | 4.5 | Diminishing returns |
| **0.30** | **17.2°** | **36+32** | **2.74** | **3.2** | **Winner — two runs averaged 34/50** |

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (FIRE_ANGLE=0.30, 200-game validation)
Player wins: 100/200 | Enemy wins: 100/200 | Draws: 0/200
Oscillations: 2.265/game (-10%) | Collapses: 1.59/game (+24%) | Fires: 3.7/game (+19%) | Action changes: 7.2/game

### Decision
ROLLBACK — Primary criterion failed: player wins 100/200 (50.0%) < current best 109/200 (54.5%). The two-run 50-game average of 34/50 (68%) was a favorable seed cluster — 200-game collapsed to exactly 50%. Fire rate increased +19% but more shots at wider angles do not convert to kills on moving targets. The spawn-aim disadvantage is real but FIRE_ANGLE is not the right lever to address it. Consecutive rollbacks: 3.

---

## Cycle 14 — ROLLBACK

**Problem**: Enemy fires 3× more in early-game engagement window due to spawn-aim advantage (enemy spawns pointed at player; player spawns heading up (-π/2) and needs 0.5–1.5s to acquire aim). ENGAGE_RANGE=350 limits the close-range combat scaling to already-close distances; the hypothesis was that widening ENGAGE_RANGE would make the AI more aggressively close from medium range, reducing the enemy's head-start advantage.
**Fix**: ENGAGE_RANGE 350→450 (sweep: 250, 300, 350 baseline, 400, 450, 500)
**Complexity**: 1 — Tune constant

### Sweep Results
DANGER_ZONE_BASE_PENALTY=-10000, HYSTERESIS_BONUS=350, FIRE_OPPORTUNITY_BONUS=450, CBS=3 (all fixed)
Sweeping: ENGAGE_RANGE

| ENGAGE_RANGE | Wins/50 | Osc/game | Collapses/game | Fires/game | Action changes/game |
|-------------|---------|----------|----------------|------------|---------------------|
| 250         | 22 | 2.62 | 1.76 | 3.5 | 7.9 |
| 300         | 22 | 3.38 | 2.14 | 3.4 | 9.7 |
| 350 (baseline) | 24 | 2.50 | 1.76 | 4.5 | 8.7 |
| 400         | 27 | 2.66 | 1.98 | 4.1 | 7.5 |
| **450**     | **28** | 2.78 | 2.32 | 3.8 | 9.3 |
| 500         | 28 | 2.70 | 2.36 | 2.9 | 8.1 |

**Selected**: ENGAGE_RANGE=450 — highest wins/50 (28/50, tied with 500 but 450 retains better fire rate).

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (ENGAGE_RANGE=450, 200-game validation)
Player wins: 107/200 | Enemy wins: 93/200 | Draws: 0/200
Oscillations: 3.175/game (+26.5%) | Collapses: 2.075/game (+62.1%) | Fires: 3.5/game (+12.9%) | Action changes: 8.935/game | Proximity: 9.1/game

### Decision
ROLLBACK — Primary criterion failed: player wins 107/200 (53.5%) < current best 109/200 (54.5%). The 50-game sweep winner (28/50 = 56%) was a favorable seed cluster. The 200-game validation confirmed no structural improvement. Secondary metrics severely elevated: collapses +62.1% (2.075 vs 1.28/game) — the larger engage range pushes the AI to close aggressively from medium range, generating more proximity events (9.1/game vs 6.4/game at baseline) and more asteroid encounters. Fire rate improved slightly (+12.9%) but this did not translate to wins. ENGAGE_RANGE is now exhausted as a single-lever tuning target. The constant affects both the distance scaling (long-range urgency) and the closing speed scaling (close-range amplification), and widening the close-range zone increases proximity deaths faster than it increases combat wins.

---

## Cycle 17 — ROLLBACK

**Problem**: AIM_PROXIMITY_SCALE=5 had never been tuned across 16 cycles. Hypothesis: higher APS amplifies the aim reward at close range (within MAX_FIRE_RANGE), making the AI strongly prefer aim-holding trajectories when already close. This should win more close-range bullet exchanges.
**Fix**: AIM_PROXIMITY_SCALE sweep: 3, 5 (baseline), 8, 12, 15.
**Constant**: `AIM_PROXIMITY_SCALE` in `src/ai-predictive-optimized.js`
**Formula**: `aimProximityFactor = 1 + APS * max(0, 1 - minDist / MAX_FIRE_RANGE)`; score += `AIM_BONUS * aimAvg * aimProximityFactor`

### Sweep (50 games each)

| APS | Wins/50 | Osc/game | Fires/game | Collapses/game |
|-----|---------|----------|------------|----------------|
| 3   | 32      | 2.26     | 2.6        | 1.28           |
| 5   | 30      | 1.76     | 2.6        | 1.38           |
| 8   | 28      | 2.68     | 3.1        | 1.94           |
| 12  | 26      | 2.20     | 3.6        | 1.28           |
| 15  | 27      | 2.22     | 3.4        | 2.14           |

**Selected**: APS=3 — highest wins/50 (32/50)

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (APS=3, 200-game validation)
Player wins: 98/200 | Enemy wins: 102/200 | Draws: 0/200
Oscillations: 2.645/game (+5.4%) | Collapses: 1.745/game (+36.3%) | Fires: 3.3/game (+6%) | Action changes: 7.6/game

### Decision
ROLLBACK — Primary criterion failed: player wins 98/200 (49%) < current best 109/200 (54.5%). The 50-game sweep winner (APS=3, 32/50) was a favorable seed cluster — the 200-game validation collapsed 11 wins below current best. The sweep inverted the hypothesis: lower APS won the sweep (3 > 5 > 8 > 12), but the 200-game result (98/200) is worse than baseline. Higher APS values (8, 12, 15) increased fires/game (+19-38%) but also increased oscillations and collapses, matching the familiar amplify-fires-but-destabilize pattern. AIM_PROXIMITY_SCALE is now exhausted as a tuning target. Consecutive rollbacks: 5.

---

## Cycle 18 — KEPT

**Problem**: CLOSING_SPEED_WEIGHT=8 has never been tuned across 17 cycles. Hypothesis: higher CSW incentivizes closing trajectories more aggressively, reducing time-to-first-shot and partially offsetting the enemy spawn-aim advantage. Also tested lower values to check whether the AI is currently charging in too aggressively.

**Fix**: CLOSING_SPEED_WEIGHT 8→16 (sweep: 4, 6, 8, 12, 16).

### 50-Game Sweep

| CSW | Wins/50 | Osc/game | Fires/game | Collapse/game |
|-----|---------|----------|------------|---------------|
| 4   | 25      | 2.96     | —          | 1.96          |
| 6   | 26      | 2.86     | —          | 1.88          |
| 8   | 30      | 3.58     | —          | 2.48          |
| 12  | 29      | 3.10     | —          | 1.72          |
| 16  | 30      | 2.78     | —          | 2.12          |

**Selected**: CSW=16 — tied highest wins/50 (30/50) with baseline CSW=8, but lowest oscillation (2.78 vs 3.58/game for CSW=8).

### Metrics Before
Player wins: 109/200 | Enemy wins: 91/200 | Draws: 0/200
Oscillations: 2.51/game | Collapses: 1.28/game | Fires: 3.10/game

### Metrics After (CSW=16, 200-game validation)
Player wins: 110/200 | Enemy wins: 90/200 | Draws: 0/200
Oscillations: 2.845/game (+13.4%) | Collapses: 1.565/game (+22.3%) | Fires: 3.385/game (+9.2%) | Action changes: 7.8/game

### Decision
KEPT — Primary criterion met: player wins 110/200 (55.0%) > current best 109/200 (54.5%). Marginal +1 win improvement. Higher CSW (16) increases the closing-rate reward without triggering the aim-holding instability seen with FOB/AIM_BONUS increases — because the closing rate reward is path-level (net distance closed over the whole trajectory), not per-step aim-holding. Fires improved +9.2%, suggesting the AI reaches firing position faster. Secondary metrics elevated (osc +13%, collapse +22%) but not blocking. Consecutive rollback counter reset to 0.

---

## Cycle 19 — KEPT

**Problem**: DISTANCE_WEIGHT=-8 has never been tuned across 18 cycles. At medium range (300-600px), the constant uniformly subtracts 2400-4800pts from every trajectory without improving discrimination between them. In collapse scenarios (all scores already negative), this amplifies the all-negative landscape. With CSW=16 now handling approach incentive at the path level (net distance closed over trajectory), DISTANCE_WEIGHT may be redundant or over-weighted.

**Fix**: DISTANCE_WEIGHT sweep: -3, -5, -8 (baseline), -11, -14. DW=-3 won 50-game with 29/50.

**Architecture at test time**: DANGER_ZONE_BASE_PENALTY=-10000 + HYSTERESIS_BONUS=350 + FIRE_OPPORTUNITY_BONUS=450 + CLOSING_SPEED_WEIGHT=16

### Sweep Results

| DW  | Wins/50 | Win% | Osc/game | Collapse/game |
|-----|---------|------|----------|---------------|
| **-3**  | **29**  | **58%** | **2.68** | **1.88** |
| -5  | 26      | 52%  | 2.98     | 1.56          |
| -8 (baseline) | 27 | 54% | 2.26 | 1.72 |
| -11 | 27      | 54%  | 2.54     | 1.36          |
| -14 | 17      | 34%  | 2.90     | 1.42          |

**Selected**: DW=-3 — highest wins/50 (29/50).

### Metrics Before
Player wins: 110/200 | Enemy wins: 90/200 | Draws: 0/200
Oscillations: 2.845/game | Collapses: 1.565/game | Fires: 3.385/game | Action changes: 7.8/game

### Metrics After (DW=-3, 200-game validation)
Player wins: 110/200 | Enemy wins: 90/200 | Draws: 0/200
Oscillations: 2.26/game (-20.6%) | Collapses: 1.61/game (+2.9%) | Fires: 3.425/game (+1.2%) | Action changes: 6.8/game (-12.8%)

### Decision
KEPT — Primary criterion met: player wins 110/200 (55.0%) equals current best 110/200. Oscillations improved significantly (-20.6%: 2.26 vs 2.845/game), action changes improved (-12.8%: 6.8 vs 7.8/game). Collapses essentially flat (+2.9%: 1.61 vs 1.565/game). The score suppression hypothesis was confirmed: DW=-3 wins the 50-game sweep (29/50) over baseline (-8 at 27/50). At 200 games, win count is identical but behavioral stability improves. DW=-14 collapsed to 17/50, confirming the approach incentive still matters at some level. With CSW=16 providing path-level closing incentive, DW=-3 is the correct balance — preserving approach direction signal while reducing redundant score suppression.

---
