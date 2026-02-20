/**
 * AI Strategy Registry
 *
 * Pluggable AI system — register named strategies and retrieve them at runtime.
 * Each strategy implements { createState(), update(state, ship, target, asteroids, dt) }.
 */

const strategies = new Map();

/**
 * Register a named AI strategy.
 */
export function registerStrategy(name, strategy) {
  strategies.set(name, strategy);
}

/**
 * Retrieve a registered strategy by name.
 * Throws if the name is not registered.
 */
export function getStrategy(name) {
  const strategy = strategies.get(name);
  if (!strategy) {
    throw new Error(`Unknown AI strategy: "${name}"`);
  }
  return strategy;
}

/**
 * Return the names of all registered strategies.
 */
export function listStrategies() {
  return [...strategies.keys()];
}

/**
 * Clear all registered strategies (for testing).
 */
export function resetRegistry() {
  strategies.clear();
}
