# ANALYZE Agent Prompt

You are analyzing the performance of the `predictive-optimized` AI in a Space Invaders dogfighting game. Your job is to run simulations, identify the most impactful behavioral problem, and write a detailed analysis for the IMPLEMENT agent.

## Current State

**Cycle**: {{CYCLE}}
**Current metrics**: See `optimization/state.json`
**History of past attempts**: See `optimization/state.json` → `history` array

## Steps

### 1. Run Summary Simulation (50 games)

```bash
node simulate.js --games 50 --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse
```

Parse the output to extract:
- Player wins, Enemy wins, Draws (No kill)
- Event counts: ACTION_CHANGE, FIRE, PROXIMITY, KILL
- Detection counts: oscillation, passthrough, collapse
- Action distribution for both player and enemy

### 2. Run Verbose Simulation (5 games)

```bash
node simulate.js --games 5 --verbose --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse
```

Parse the verbose output for patterns:
- What kills the player most? (asteroids vs bullets)
- When do deaths happen? (early game vs late game)
- What actions precede deaths?
- Are there oscillation or collapse events?
- How do the action distributions compare between player and enemy?

### 3. Compare to Baseline and Current Best

Read `optimization/state.json` for baseline and current metrics. Identify:
- What has improved since baseline?
- What has gotten worse?
- What is still the biggest weakness?

### 4. Check History for Already-Tried Fixes

Read the `history` array in state.json. Do NOT suggest:
- The exact same constant change that was already tried and rolled back
- Fixes for problems that previous cycles already solved

You CAN suggest:
- A different approach to a previously-attempted problem (different constant, different magnitude)
- Revisiting a problem if the context has changed (other fixes may have shifted the dynamics)

### 5. Identify Top 3 Problems

Rank by this priority order:
1. **Frequent deaths** (asteroid or bullet) — can't win if dead
2. **Low win rate** — not killing opponent enough
3. **Oscillation/collapse** — wasted actions degrade performance
4. **Long games** — not closing engagements efficiently

### 6. Design Fix for #1 Problem

For the top problem, specify:
- **Root cause**: What in the AI code causes this behavior?
- **Suggested fix**: Which constant(s) to change, and to what value?
- **Test scenario**: What deterministic test setup would validate the fix?
- **Expected impact**: How should metrics change?

**COMPLEXITY BAR** (follow strictly):
1. Tune a constant (ALWAYS try this first)
2. Adjust a weight ratio (only if tuning one constant won't work)
3. Add a condition to existing logic (only if tuning can't work)
4. New code (absolute last resort, must justify with >10% expected win rate increase)

### 7. Write Analysis File

Write `optimization/current-analysis.md` with this exact format:

```markdown
# Cycle {{CYCLE}} Analysis

## Simulation Results
- Player wins: X/50 (Y%)
- Enemy wins: X/50 (Y%)
- Draws: X/50 (Y%)
- Avg game ticks: (from event data if available)
- Player asteroid deaths: X
- Player bullet deaths: X
- Enemy asteroid deaths: X
- Enemy bullet deaths: X
- Oscillations detected: X
- Collapses detected: X

## Comparison to Current Best
- Win rate: X% → Y% (delta)
- Asteroid deaths: X → Y
- (other notable changes)

## Top 3 Problems
1. **[Problem name]** — [severity: critical/high/medium] — [description]
2. **[Problem name]** — [severity] — [description]
3. **[Problem name]** — [severity] — [description]

## Selected Fix: Problem #1

### Root Cause
[Explanation of what in the code causes this]

### Suggested Fix
- File: `src/ai-predictive-optimized.js`
- Change: `CONSTANT_NAME` from `OLD_VALUE` to `NEW_VALUE`
- Rationale: [why this value]

### Test Scenario
[Description of a deterministic test that would validate the fix]

### Expected Impact
- Win rate: expect +X%
- Asteroid deaths: expect -Y
- [other expected changes]

### Complexity Level
[1-Tune constant / 2-Adjust weight / 3-Add condition / 4-New code]
```
