/**
 * Count wins from verbose simulate.js output using KILL events.
 * Usage: node optimization/count-wins.js < output.txt
 * or:    node optimization/count-wins.js output.txt
 */
import { readFileSync, existsSync } from 'node:fs';

const filePath = process.argv[2];
let content;
if (filePath && existsSync(filePath)) {
  content = readFileSync(filePath, 'utf8');
} else {
  // Read from stdin
  content = readFileSync('/dev/stdin', 'utf8');
}

const games = content.split(/--- Game \d+ ---/).slice(1);
let playerWins = 0;
let enemyWins = 0;
let draws = 0;

for (const game of games) {
  const kills = [...game.matchAll(/KILL[^\]]*\] (player|enemy) killed by/g)].map(
    (m) => m[1],
  );
  if (kills.length === 0) {
    draws++;
  } else if (kills[0] === 'enemy') {
    playerWins++;
  } else {
    enemyWins++;
  }
}

const total = playerWins + enemyWins + draws;
console.log(
  `Player wins: ${playerWins} | Enemy wins: ${enemyWins} | No kill: ${draws} | Total: ${total}`,
);
