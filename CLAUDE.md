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

## Iteration Checklist

**Follow these steps in order for every iteration. Do not skip or reorder steps.**

1. **RED** — Write failing tests for the increment's acceptance criteria. Run `npm test` to confirm they fail.
2. **GREEN** — Write the minimum code to make all tests pass. Run `npm test` to confirm.
3. **REFACTOR** — Clean up if needed (see Refactoring Rules below). Tests must pass after each refactoring step.
4. **Mandatory Coverage Audit** — See dedicated section below. This is the most commonly skipped step. **Do NOT proceed to Build until the coverage table has been presented to the human.**
5. **Build** — Run `npm run build` and verify it completes without errors.
6. **Commit & push** — Commit all changes and push to `main`.
7. **STOP** — Present a summary of changes to the human developer and wait for review and manual testing. **Do not start the next iteration until the human gives explicit approval.** This is not optional.

## Workflow Rules

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

### Scope Discipline

- **Only make changes required by the current increment's acceptance criteria.** Do not add features, abstractions, or "improvements" beyond what is specified.

### Mandatory Coverage Audit

**This step is a hard gate. Do not proceed to Build until it is complete and the table has been shown to the human.**

This step exists because there is a repeated pattern of skipping it or doing a shallow mental scan. That is not acceptable. Follow these sub-steps exactly:

1. **Read** every acceptance criterion from the current increment in `TODO.md`.
2. **Read** every test in the relevant test files (not from memory — actually read the files).
3. **Build the table**: For each acceptance criterion, list the specific test name(s) that cover it. If a criterion has no test, mark it as **MISSING**.
4. **Identify gaps**: Look for untested edge cases, untested code paths, and missing integration tests. Think about: What if the input is zero? Empty? Negative? What if the array is empty? What if two features interact?
5. **Write tests** for every gap found. Run `npm test` to confirm they pass.
6. **Present the coverage table** to the human as a visible artifact (not just an internal check). The table must be shown *before* proceeding to the Build step.

If no gaps are found, say so explicitly in the table — but still present it.

### Code Conventions

- **SOLID principles**: single responsibility per function/module, depend on abstractions not concretions, open for extension
- **Clean code**: small focused functions with descriptive names, no magic numbers, no deep nesting, self-documenting code over comments
- Pure functions where possible — no mutation of inputs
- ES modules in `src/` with explicit exports
- New module → new corresponding test file in `test/`
- No external dependencies — vanilla JS only
