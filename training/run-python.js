/**
 * Wrapper that resolves the real Python interpreter then executes
 * the given Python script with all remaining arguments.
 *
 * Usage:  node training/run-python.js <script.py> [args...]
 * npm:    npm run export -- training/checkpoints/stage8/best.zip
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve Python via find-python.js (same directory)
const __dirname = dirname(fileURLToPath(import.meta.url));
const python = execFileSync(
	"node",
	[join(__dirname, "find-python.js")],
	{ encoding: "utf-8", timeout: 10000 },
).trim();

const [script, ...args] = process.argv.slice(2);
if (!script) {
	process.stderr.write("Usage: node training/run-python.js <script.py> [args...]\n");
	process.exit(1);
}

try {
	execFileSync(python, [script, ...args], {
		stdio: "inherit",
		timeout: 300000,
	});
} catch (err) {
	process.exit(err.status ?? 1);
}
