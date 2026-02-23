/**
 * Create a fresh game log with all counters at zero.
 */
export function createGameLog() {
  return { wins: 0, losses: 0, draws: 0 };
}

/**
 * Record a match result. Only terminal phases update counters.
 */
export function recordResult(log, phase) {
  if (phase === 'playerWin') log.wins++;
  else if (phase === 'playerDead') log.losses++;
  else if (phase === 'draw') log.draws++;
}

/**
 * Reset all counters to zero.
 */
export function resetGameLog(log) {
  log.wins = 0;
  log.losses = 0;
  log.draws = 0;
}

/**
 * Format the game log as a compact stats string.
 * Returns e.g. "W:5 (50.0%)  L:3 (30.0%)  D:2 (20.0%)  N=10"
 */
export function formatGameLog(log) {
  const total = log.wins + log.losses + log.draws;
  const rate = (count) =>
    total === 0 ? '0.0%' : `${((100 * count) / total).toFixed(1)}%`;
  return (
    `W:${log.wins} (${rate(log.wins)})  ` +
    `L:${log.losses} (${rate(log.losses)})  ` +
    `D:${log.draws} (${rate(log.draws)})  ` +
    `N=${total}`
  );
}
