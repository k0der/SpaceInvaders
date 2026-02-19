# CLAUDE.md — Agent Instructions

## Commands

- `npm test` — run all tests (Vitest)
- `npm run build` — bundle ES modules into standalone `index.html`
- `npm run test:watch` — run tests in watch mode (development)

## Project Structure

- `src/` — ES modules (production code)
- `test/` — Vitest test files (one per module, e.g., `test/asteroid.test.js` tests `src/asteroid.js`)
- `dev.html` — development entry point (uses ES module imports)
- `index.html` — production build output (single file, all JS inlined)
- `build.js` — custom bundler that strips imports/exports and inlines into `index.html`
- `SPEC.md` — technical specification (the "what")
- `TODO.md` — incremental build plan with acceptance criteria (the "how")

## Workflow Rules

### TDD Cycle

Follow strict RED → GREEN → REFACTOR:
1. Write a failing test for the next acceptance criterion
2. Write the minimum code to make it pass
3. Refactor if needed (see refactoring rules below)
4. Repeat until all acceptance criteria for the increment are met

### Refactoring Rules (Kent Beck / Martin Fowler style)

- Refactoring is allowed and encouraged when the current increment requires it
- **Refactor in small, incremental steps** — tests must pass after each step
- **Never mix refactoring with behavior changes** in the same step — first refactor to make the change easy, then make the easy change
- Don't rewrite working code for style or preference — only refactor when the current increment genuinely demands it
- **All existing tests must continue to pass** — this is non-negotiable
- If changing more than a few lines in a previously-completed module, flag it in the review summary so the human can verify

### Spec and TODO Changes

- **Never modify SPEC.md or TODO.md without explicit approval from the human developer.**
- If a change is needed (e.g., a tolerance is unrealistic, an acceptance criterion needs adjustment), explain clearly what needs to change and why, then ask for approval before editing.
- This applies to all changes: adding, removing, or modifying content in these files.

### Iteration Discipline

- **Only make changes required by the current increment's acceptance criteria.** Do not add features, abstractions, or "improvements" beyond what is specified.
- At the end of every iteration, **STOP and wait for the human developer to review and manually test.** Do not start the next iteration until the human gives explicit approval. This is not optional.
- When all tests pass for an iteration, review the codebase for missing test coverage and add needed tests.
- Before presenting for review, run `npm run build` and verify it completes without errors.

### Code Conventions

- **SOLID principles**: single responsibility per function/module, depend on abstractions not concretions, open for extension
- **Clean code**: small focused functions with descriptive names, no magic numbers, no deep nesting, self-documenting code over comments
- Pure functions where possible — no mutation of inputs
- ES modules in `src/` with explicit exports
- New module → new corresponding test file in `test/`
- No external dependencies — vanilla JS only
