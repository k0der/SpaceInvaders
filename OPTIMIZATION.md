# AI Optimization Loop — Quick Start

## Autonomous Operation

**This loop runs autonomously. Both subagents make all decisions and execute them without asking for permissions or confirmations.** The main conversation only reads `optimization/last-result.txt` at the end and reports the outcome.

## How to Run a Cycle

When the user says "restart the cycle", "run optimization", or similar:

1. Read `optimization/state.json` to get the current cycle number (`N = cycle + 1`)
2. Read `optimization/IMPROVEMENTS.md` for current context (do NOT read SPEC.md or TODO.md)
3. **Check `consecutiveRollbacks` in state.json:**
   - If `consecutiveRollbacks == 0` (last cycle was KEPT, or first cycle): Launch **ANALYZE subagent** with `optimization/prompts/analyze.md`, replacing `{{CYCLE}}` with `N`. Wait for it to complete before step 4.
   - If `consecutiveRollbacks > 0` (last cycle was a ROLLBACK): **Skip ANALYZE entirely.** The AI code is unchanged, so existing simulation data is still valid. Reuse `optimization/current-analysis.md` as-is. Set `ANALYSIS_REUSED=true` when launching IMPLEMENT.
4. Launch **IMPLEMENT subagent** with `optimization/prompts/implement.md`, replacing `{{CYCLE}}` with `N` and `{{ANALYSIS_REUSED}}` with `true` or `false`
5. Read `optimization/last-result.txt` and report the single-line outcome to the user

**Both phases MUST run as subagents** (Task tool, `subagent_type: general-purpose`) to keep large file reads and simulation output out of main context.

---

## Architecture

```
Main conversation (orchestrator — reads state.json + IMPROVEMENTS.md only)
  │
  ├─ ANALYZE subagent  ← SKIPPED if consecutiveRollbacks > 0 (AI unchanged)
  │    Reads: IMPROVEMENTS.md, state.json, ai-predictive-optimized.js
  │    Runs: 50-game + 5-game verbose simulations
  │    Writes: optimization/current-analysis.md
  │
  └─ IMPLEMENT subagent  (receives ANALYSIS_REUSED=true/false)
       Reads: IMPROVEMENTS.md, current-analysis.md, state.json, AI code, tests
       Does: RED test → fix → GREEN → lint → 50-game validation → KEEP/ROLLBACK
       If ANALYSIS_REUSED=true: picks a DIFFERENT fix than the previous cycle
       Updates: state.json, IMPROVEMENTS.md (insights!), cycle-log.md, last-result.txt
       Commits if KEPT
```

## Files

| File | Purpose |
|------|---------|
| `optimization/IMPROVEMENTS.md` | **Start here.** Key insights, what failed, open hypotheses, change log |
| `optimization/state.json` | Cycle counter, baseline/current metrics, full history |
| `optimization/current-analysis.md` | ANALYZE output (per-cycle, overwritten) |
| `optimization/cycle-log.md` | Append-only human-readable cycle log |
| `optimization/last-result.txt` | One-line result signal: KEPT/ROLLBACK |
| `optimization/prompts/analyze.md` | ANALYZE agent prompt template |
| `optimization/prompts/implement.md` | IMPLEMENT agent prompt template |
| `src/ai-predictive-optimized.js` | The only source file modified by optimization |
| `test/ai-predictive-optimized.test.js` | The only test file modified by optimization |

## Key Rules

- **Autonomous**: agents decide and act — no permission requests, ever
- **IMPROVEMENTS.md is the memory**: read it first every cycle, update it every cycle
- **Strict file scope**: only `src/ai-predictive-optimized.js` and `test/ai-predictive-optimized.test.js` may be modified
- **Out-of-scope requests**: if a fix requires changing any other file, log it to `IMPROVEMENTS.md` under "Proposed Changes Outside Optimization Scope" and proceed with ROLLBACK — never ask the user
- **Skip ANALYZE on ROLLBACK**: if `consecutiveRollbacks > 0`, skip the ANALYZE phase and reuse `current-analysis.md` — the AI code is unchanged so the simulation data is still valid
- **Different fix on reuse**: when IMPLEMENT receives `ANALYSIS_REUSED=true`, it MUST pick a different fix than what was tried last cycle — the problem diagnosis is valid but the approach must change
- **Complexity bar**: tune constant → adjust weight → add condition → new code
- **Parameter sweep** (Complexity 1–2): before the 200-game validation, run 4–6 candidate values × 50 games each to find the best value — compresses multi-cycle tuning into one cycle. Results saved to `optimization/sweep-cycle-N.md`.
- **KEEP** if: wins >= 100/200 AND tests pass — win rate is the ONLY hard criterion
- **ROLLBACK** if: wins < 100 OR tests broken
- Secondary metrics (oscillations, collapses, fires) are monitored and logged but NOT blocking — oscillation can increase as a side effect of more aggressive combat
- Simulation command: `node simulate.js --games 200 --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse`
- **200-game KEEP threshold**: wins >= 100 (50% of 200) — statistical baseline for identical AIs
- **Continuous mode**: run cycles back-to-back without stopping; only halt if 5+ consecutive rollbacks with no remaining untried hypotheses

## Tunable Constants in ai-predictive-optimized.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `FIRE_ANGLE` | 0.15 | Angular threshold for firing (rad) |
| `MAX_FIRE_RANGE` | 500 | Max firing distance (px) |
| `SIM_STEPS` | 15 | Forward simulation steps |
| `SIM_DT` | 0.1 | Simulation time step (s) |
| `COLLISION_BASE_PENALTY` | -20000 | Score penalty for collision |
| `COLLISION_EARLY_BONUS` | 50 | Later collisions slightly less bad |
| `BRAKE_PURSUIT_STEPS` | 5 | Brake steps before pursuit candidate |
| `DISTANCE_WEIGHT` | -8 | Distance-to-target weight |
| `AIM_BONUS` | 400 | Bonus for aiming at target |
| `CLOSING_SPEED_WEIGHT` | 8 | Closing speed bonus |
| `AIM_PROXIMITY_SCALE` | 5 | Aim amplification at close range |
| `FIRE_OPPORTUNITY_BONUS` | 300 | Bonus per step with firing solution |
| `ENGAGE_RANGE` | 350 | Close-range combat boundary (px) |
| `HOLD_TIME` | 0.15 | Min time to hold action (s) |
| `COLLISION_BREAK_STEPS` | 3 | Steps to check imminent collision |
| `HYSTERESIS_BONUS` | 250 | Bonus for repeating previous action |
| `DANGER_ZONE_FACTOR` | 3 | Near-miss penalty zone multiplier |
| `ENGAGE_CLOSING_SCALE` | 3 | Closing speed scaling at close range |
