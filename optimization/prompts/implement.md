# IMPLEMENT + VALIDATE Agent Prompt

You are implementing and validating an optimization fix for the `predictive-optimized` AI in a Space Invaders dogfighting game. Your job is to write a failing test, implement the fix, validate it with simulation, and decide whether to keep or rollback.

## Current State

**Cycle**: {{CYCLE}}
**Analysis**: Read `optimization/current-analysis.md`
**State**: Read `optimization/state.json`
**AI code**: Read `src/ai-predictive-optimized.js`
**Tests**: Read `test/ai-predictive-optimized.test.js`

## Steps

### 1. Read Context Files

Read these files (actually read them, don't assume):
- `optimization/current-analysis.md` — the analysis from Phase 1
- `optimization/state.json` — baseline, current metrics, history
- `src/ai-predictive-optimized.js` — the AI code to modify
- `test/ai-predictive-optimized.test.js` — existing tests

### 2. Write RED Test

Add a new `describe` block at the end of the test file:

```javascript
describe('optimization cycle {{CYCLE}}: <problem description>', () => {
  // Test that validates the fix addresses the identified problem
  // Use deterministic scenarios (fixed positions, known state)
  // Test the BEHAVIOR, not implementation details
});
```

The test should:
- Set up a deterministic game scenario that triggers the problem
- Assert the AI makes the correct decision after the fix
- Be meaningful (not just "constant equals X")

Run the test to confirm it FAILS:
```bash
npm test -- test/ai-predictive-optimized.test.js
```

If the test already passes (the problem was already fixed or test is too loose), adjust the test or reconsider the fix.

### 3. Implement the Fix

**COMPLEXITY BAR** (follow strictly):
1. **Tune a constant** — Change a number. ALWAYS try this first.
2. **Adjust a weight ratio** — Change relative importance. Only if #1 won't work.
3. **Add a condition** — Small `if` in existing code. Only if #1-2 won't work.
4. **New code** — ABSOLUTE LAST RESORT. Must show >10% win rate improvement.

**CRITICAL RULE**: If you find yourself adding more than 5 lines of new logic, STOP and reconsider. There is almost certainly a simpler approach.

Only modify `src/ai-predictive-optimized.js`. Never touch any other source file.

### 4. Verify GREEN

Run the test again:
```bash
npm test -- test/ai-predictive-optimized.test.js
```

All tests must pass, including the new one.

### 5. Run All Tests

```bash
npm test
```

ALL tests across the entire project must pass. If anything breaks, fix it.

### 6. Lint

```bash
npm run lint
```

Fix any issues.

### 7. Validate with Simulation

Run the same simulation as the ANALYZE agent:
```bash
node simulate.js --games 50 --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse
```

Parse the results and compare to the **current** metrics from `state.json`.

### 8. Decision: KEEP or ROLLBACK

**KEEP** if ALL of these are true:
- Player win count >= current win count (primary metric)
- No metric degrades by >15% relative (regression guard)
- All tests pass

**ROLLBACK** if ANY of these are true:
- Player win count decreased
- Any metric degraded by >15% relative
- Tests are broken

Special case: If win count is equal but secondary metrics improved (fewer deaths, fewer oscillations), KEEP.

### 9. Execute Decision

**If KEEP**:
```bash
git add src/ai-predictive-optimized.js test/ai-predictive-optimized.test.js
git commit -m "optimization cycle {{CYCLE}}: <short description of fix>"
```

**If ROLLBACK**:
```bash
git checkout -- src/ai-predictive-optimized.js test/ai-predictive-optimized.test.js
```

### 10. Update State Files

Update `optimization/state.json`:
- Increment `cycle`
- If KEEP: update `current` metrics, reset `consecutiveRollbacks` to 0
- If ROLLBACK: increment `consecutiveRollbacks`
- Append to `history` array:
  ```json
  {
    "cycle": N,
    "problem": "description",
    "fix": "what was changed",
    "result": "KEPT" or "ROLLBACK",
    "metrics": { "playerWins": X, "enemyWins": Y, "draws": Z, ... },
    "reason": "why kept/rolled back"
  }
  ```

Update `optimization/IMPROVEMENTS.md`:
- Update "Current Best" section if KEPT
- Add row to the Change Log table

Append to `optimization/cycle-log.md`:
```markdown
## Cycle {{CYCLE}} — [KEPT/ROLLBACK]

**Problem**: [description]
**Fix**: [what was changed]
**Complexity**: [1-4]

### Metrics Before
Player wins: X/50 | Enemy wins: X/50 | Draws: X/50

### Metrics After
Player wins: X/50 | Enemy wins: X/50 | Draws: X/50

### Decision
[KEPT/ROLLBACK] — [reason]

---
```

### 11. Write Result Signal

Write a single line to `optimization/last-result.txt`:
```
KEPT: <problem> — <fix> — win rate X%→Y%
```
or
```
ROLLBACK: <problem> — <fix> — win rate X%→Y%
```

This is what the main loop reads to know the cycle result.
