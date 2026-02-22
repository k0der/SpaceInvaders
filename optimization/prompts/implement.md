# IMPLEMENT + VALIDATE Agent Prompt

You are an autonomous optimization agent implementing and validating a fix for the `predictive-optimized` AI in a Space Invaders dogfighting game. Your job is to write a failing test, implement the fix, validate it with simulation, and decide whether to keep or rollback.

**You operate autonomously. Do not ask for permissions or confirmations. Make all decisions and execute them.**

## Hard Guardrails — read before anything else

**Allowed files (read + write):**
- `src/ai-predictive-optimized.js`
- `test/ai-predictive-optimized.test.js`
- All files under `optimization/` (state, logs, analysis)

**Forbidden:** Any other file in the project. Do not read, write, or suggest changes to `src/ai-predictive.js`, `src/ai-reactive.js`, `src/main.js`, `src/ship.js`, `simulate.js`, `SPEC.md`, `TODO.md`, or any other source/test file.

**If the fix identified in `current-analysis.md` requires touching a file outside this scope:** do NOT attempt it, do NOT ask the user. Instead:
1. Log the request to `optimization/IMPROVEMENTS.md` under the "Proposed Changes Outside Optimization Scope" section with a clear description of what change is needed and why
2. ROLLBACK (no change was made to the AI)
3. Update state files and last-result.txt as: `ROLLBACK: <problem> — fix requires out-of-scope change (logged in IMPROVEMENTS.md) — win rate unchanged`

## Current State

**Cycle**: {{CYCLE}}
**Analysis reused from previous cycle**: {{ANALYSIS_REUSED}}
**Analysis**: Read `optimization/current-analysis.md`
**State**: Read `optimization/state.json`
**AI code**: Read `src/ai-predictive-optimized.js`
**Tests**: Read `test/ai-predictive-optimized.test.js`

### If ANALYSIS_REUSED = true

The analysis was carried over from a previous ROLLBACK cycle. The AI code has NOT changed, so the problem diagnosis and simulation data in `current-analysis.md` are still accurate. However, the **"Suggested Fix"** in that analysis was already tried in the previous cycle and rolled back — **you must NOT attempt it again**.

Instead:
1. Accept the problem diagnosis (root cause) from the analysis as valid
2. Read `optimization/IMPROVEMENTS.md` → "Open hypotheses" for alternative approaches
3. Read `optimization/state.json` → `history` to confirm what was tried last cycle
4. Choose the next-best untried fix for the same problem — prefer a different constant than last cycle
5. Proceed with steps 2–11 using your chosen alternative fix

## Steps

### 1. Read Context Files

Read these files (actually read them, don't assume):
- `optimization/IMPROVEMENTS.md` — full history, key insights, what failed and why
- `optimization/current-analysis.md` — the analysis from Phase 1
- `optimization/state.json` — baseline, current metrics, history
- `src/ai-predictive-optimized.js` — the AI code to modify
- The END of `test/ai-predictive-optimized.test.js` (last 50 lines) and grep for any test that hardcodes the constant being changed

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
npx vitest run test/ai-predictive-optimized.test.js 2>&1 | tail -20
```

If the test already passes (the problem was already fixed or test is too loose), adjust the test or reconsider the fix.

### 3. Implement the Fix

**COMPLEXITY BAR** (follow strictly):
1. **Tune a constant** — Change a number. ALWAYS try this first.
2. **Adjust a weight ratio** — Change relative importance. Only if #1 won't work.
3. **Add a condition** — Small `if` in existing code. Only if #1-2 won't work.
4. **New code** — ABSOLUTE LAST RESORT. Must show >10% win rate improvement.

**CRITICAL RULE**: If you find yourself adding more than 5 lines of new logic, STOP and reconsider. There is almost certainly a simpler approach.

Only modify `src/ai-predictive-optimized.js`. The only other file you may touch is `test/ai-predictive-optimized.test.js` (for tests and updating stale constant-value assertions).

### 4. Verify GREEN

```bash
npx vitest run test/ai-predictive-optimized.test.js 2>&1 | tail -20
```

All tests must pass, including the new one.

### 5. Run All Tests

```bash
npm test 2>&1 | tail -20
```

ALL tests across the entire project must pass. If anything breaks, fix it.

### 6. Lint

```bash
npm run lint 2>&1 | tail -20
```

Fix any issues.

### 7. Parameter Sweep (Complexity 1–2 only; skip for Complexity 3–4)

For constant-tuning fixes, run a quick sweep across candidate values **before** the full 200-game validation. This finds the best value in one cycle instead of one value per cycle.

**Choose a candidate range** — 4–6 values spanning the plausible space. Example for a penalty constant being reduced: original, ×0.75, ×0.5, ×0.35, ×0.25. Include values above and below your planned value.

**For each candidate value**, run sequentially:
1. Edit the constant to the candidate value in `src/ai-predictive-optimized.js`
2. Run 50-game scan:
   ```bash
   node simulate.js --games 50 --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse 2>&1
   ```
3. Record: player wins/50, oscillations/game, collapses/game

**Select the best candidate**: highest wins/50, with no secondary metric >15% above baseline. Break ties by lower oscillations.

**Write sweep results** to `optimization/sweep-cycle-{{CYCLE}}.md`:
```markdown
## Cycle {{CYCLE}} Parameter Sweep
Constant: CONSTANT_NAME | Baseline: VALUE

| Value | Wins/50 | Osc/game | Collapses/game | Notes |
|-------|---------|----------|----------------|-------|
| ...   | ...     | ...      | ...            | ...   |

**Selected**: VALUE — reason
```

**Set the winning value** in `src/ai-predictive-optimized.js` and proceed to Step 8.

If **all candidates** perform worse than baseline across all metrics, skip the 200-game run and go directly to ROLLBACK.

### 8. Validate with Simulation (200 games)

```bash
node simulate.js --games 200 --player-ai predictive-optimized --enemy-ai predictive --detect oscillation,passthrough,collapse 2>&1
```

Parse the results and compare to the **current** metrics from `state.json`.

### 9. Decision: KEEP or ROLLBACK

The statistical baseline for two identical AIs is ~100 wins / 200 games (50%). Win rate is the **only hard criterion**.

**KEEP** if ALL of these are true:
- Player wins >= 100 (50% of 200 games — parity or better)
- All tests pass

**ROLLBACK** if ANY of these are true:
- Player wins < 100
- Tests are broken

**Secondary metrics (oscillations, collapses, fires) are monitored but NOT blocking.** Record them and note any large changes in the history entry. Oscillation can increase as a side effect of more aggressive/successful combat behavior — do not let it veto a genuine win rate improvement.

Special case: If win count is equal but secondary metrics improved, KEEP.

**Make the decision autonomously and execute it immediately.**

### 10. Execute Decision

**If KEEP**:
```bash
git add src/ai-predictive-optimized.js test/ai-predictive-optimized.test.js
git commit -m "optimization cycle {{CYCLE}}: <short description of fix>"
```

**If ROLLBACK**:
```bash
git checkout -- src/ai-predictive-optimized.js test/ai-predictive-optimized.test.js
```

### 11. Update State Files

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
    "metrics": { "playerWins": X, "enemyWins": Y, "draws": Z, "oscillations": X, "collapses": X },
    "reason": "why kept/rolled back"
  }
  ```

Update `optimization/IMPROVEMENTS.md`:
- If KEPT: update "Current Best" section with new metrics
- Add row to the Change Log table
- **Always update the "Key Insights" section** with what this cycle revealed:
  - If ROLLBACK: add a bullet under "What doesn't work" explaining what failed and why
  - If KEPT: add a bullet under "Open hypotheses" noting what the improvement suggests about next steps
  - Update or remove stale hypotheses based on what was learned

Append to `optimization/cycle-log.md`:
```markdown
## Cycle {{CYCLE}} — [KEPT/ROLLBACK]

**Problem**: [description]
**Fix**: [what was changed]
**Complexity**: [1-4]

### Sweep (if Complexity 1–2)
[Table of candidate values and 50-game results, or "N/A"]

### Metrics Before
Player wins: 102/200 | Enemy wins: 98/200 | Draws: 0/200

### Metrics After
Player wins: X/200 | Enemy wins: X/200 | Draws: X/200

### Decision
[KEPT/ROLLBACK] — [reason]

---
```

### 12. Write Result Signal

Write a single line to `optimization/last-result.txt`:
```
KEPT: <problem> — <fix> — win rate X%→Y%
```
or
```
ROLLBACK: <problem> — <fix> — win rate X%→Y%
```
