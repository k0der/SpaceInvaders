/**
 * Optimization sweep runner — counts player/enemy wins from KILL events.
 * The simulate.js win counter is broken (updateGameState not passed dt),
 * so this script infers winners from KILL event data.
 *
 * Usage: node optimization/run-sweep.js [games] [player-ai] [enemy-ai]
 *   Defaults: 50 games, predictive-optimized vs predictive
 */

import { spawnSync } from 'node:child_process';

const games = Number(process.argv[2] ?? 50);
const playerAI = process.argv[3] ?? 'predictive-optimized';
const enemyAI = process.argv[4] ?? 'predictive';

const result = spawnSync(
  'node',
  [
    'simulate.js',
    '--games',
    String(games),
    '--player-ai',
    playerAI,
    '--enemy-ai',
    enemyAI,
    '--verbose',
    '--detect',
    'oscillation,collapse',
  ],
  { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
);

const output = result.stdout + result.stderr;

// Parse per-game data: count wins from KILL events
let playerWins = 0;
let enemyWins = 0;
let draws = 0;

const lines = output.split('\n');
const gameKills = [];
let currentGameKills = [];

for (const line of lines) {
  if (line.startsWith('--- Game ')) {
    if (currentGameKills !== null) {
      gameKills.push([...currentGameKills]);
    }
    currentGameKills = [];
  } else if (line.includes('[KILL ')) {
    currentGameKills.push(line);
  }
}
if (currentGameKills.length >= 0) {
  gameKills.push([...currentGameKills]);
}

// Remove the first empty push (before Game 1)
const validGames = gameKills.filter((g, i) => i > 0 || g.length > 0);

for (const kills of validGames) {
  const enemyDied = kills.some((k) => k.includes('enemy killed by'));
  const playerDied = kills.some((k) => k.includes('player killed by'));

  if (enemyDied && !playerDied) {
    playerWins++;
  } else if (playerDied && !enemyDied) {
    enemyWins++;
  } else {
    draws++;
  }
}

// Parse oscillation and collapse counts from detect output
const oscMatch = output.match(/oscillation:\s*(\d+)/);
const colMatch = output.match(/collapse:\s*(\d+)/);
const fireMatch = output.match(/FIRE:\s*\d+\s*\((\d+\.?\d*)/);
const actionMatch = output.match(/ACTION_CHANGE:\s*\d+\s*\((\d+\.?\d*)/);

const oscillations = oscMatch ? Number(oscMatch[1]) : 0;
const collapses = colMatch ? Number(colMatch[1]) : 0;
const firesPerGame = fireMatch ? Number(fireMatch[1]) : 0;
const actionChangesPerGame = actionMatch ? Number(actionMatch[1]) : 0;

console.log(`\n=== Win-Corrected Summary ===`);
console.log(`Games: ${games} | Player AI: ${playerAI} | Enemy AI: ${enemyAI}`);
console.log(
  `Player wins: ${playerWins} | Enemy wins: ${enemyWins} | Draws: ${draws}`,
);
console.log(`Win rate: ${((playerWins / games) * 100).toFixed(1)}%`);
console.log(`Oscillations: ${oscillations} (${(oscillations / games).toFixed(2)}/game)`);
console.log(`Collapses: ${collapses} (${(collapses / games).toFixed(2)}/game)`);
console.log(`Fires/game: ${firesPerGame}`);
console.log(`Action changes/game: ${actionChangesPerGame}`);
