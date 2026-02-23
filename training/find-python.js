/**
 * Resolves the real Python interpreter on Windows.
 *
 * Windows Store app-execution aliases (python.exe / python3.exe) shadow the
 * real interpreter with a redirector that prints "Python was not found" and
 * exits 49.  The py launcher may also be missing from PATH.
 *
 * Search order:
 *   1. `python` on PATH (if it actually works — exit 0)
 *   2. Windows `py` launcher on PATH
 *   3. py launcher at its default install location
 *   4. Newest python.exe under %LOCALAPPDATA%\Programs\Python\
 *
 * Prints the resolved path to stdout and exits 0, or exits 1 with an error.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function tryExec(cmd, args) {
	try {
		execFileSync(cmd, args, { stdio: "pipe", timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

function resolve() {
	// 1. `python` on PATH that actually runs
	if (tryExec("python", ["--version"])) return "python";

	// 2. `py` launcher on PATH
	if (tryExec("py", ["--version"])) return "py";

	// 3. py launcher default install location
	const localAppData = process.env.LOCALAPPDATA;
	if (localAppData) {
		const pyLauncher = join(
			localAppData,
			"Programs",
			"Python",
			"Launcher",
			"py.exe",
		);
		if (existsSync(pyLauncher) && tryExec(pyLauncher, ["--version"]))
			return pyLauncher;
	}

	// 4. Newest Python under %LOCALAPPDATA%\Programs\Python\
	if (localAppData) {
		const baseDir = join(localAppData, "Programs", "Python");
		if (existsSync(baseDir)) {
			const dirs = readdirSync(baseDir)
				.filter((d) => d.startsWith("Python"))
				.sort()
				.reverse();
			for (const d of dirs) {
				const exe = join(baseDir, d, "python.exe");
				if (existsSync(exe) && tryExec(exe, ["--version"])) return exe;
			}
		}
	}

	return null;
}

const python = resolve();
if (python) {
	process.stdout.write(python);
} else {
	process.stderr.write(
		"Error: Could not find a working Python interpreter.\n" +
			"Install Python from https://python.org and ensure it is on PATH,\n" +
			'or install the py launcher (checked "py launcher" during install).\n',
	);
	process.exit(1);
}
