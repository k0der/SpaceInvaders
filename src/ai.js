/**
 * AI Facade — registers strategies and provides backward-compatible aliases.
 *
 * Registers all available AI strategies in the ai-core registry. Provides
 * createAIState/updateAI as backward-compatible aliases for the reactive
 * strategy, and spawnEnemyPosition for enemy ship placement.
 *
 * In ES module mode, consumers import getStrategy/listStrategies from
 * ai-core.js and reactive constants from ai-reactive.js directly.
 * In the build (single scope), all symbols are already global.
 */

import { registerStrategy } from './ai-core.js';
import { predictiveStrategy } from './ai-predictive.js';
import {
  createReactiveState,
  reactiveStrategy,
  updateReactiveAI,
} from './ai-reactive.js';
import './ai-predictive-optimized.js'; // Self-registers as 'predictive-optimized'
import './ai-neural.js'; // Self-registers as 'neural'

// ── Register strategies ──────────────────────────────────────────────
registerStrategy('reactive', reactiveStrategy);
registerStrategy('predictive', predictiveStrategy);

// ── Backward-compatible aliases (new names — no redeclaration conflict) ──
export const createAIState = createReactiveState;
export const updateAI = updateReactiveAI;

/** Minimum enemy spawn offset from player (px). Just off-screen at 1920×1080. */
export const MIN_SPAWN_DISTANCE = 1000;

/** Maximum enemy spawn offset from player (px). Tight band just past viewport. */
export const MAX_SPAWN_DISTANCE = 1100;

/**
 * Compute a random spawn position for the enemy ship at
 * MIN_SPAWN_DISTANCE–MAX_SPAWN_DISTANCE from the player.
 */
export function spawnEnemyPosition(playerX, playerY) {
  const angle = Math.random() * 2 * Math.PI;
  const distance =
    MIN_SPAWN_DISTANCE +
    Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
  return {
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
  };
}
