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
