"""Gymnasium wrapper that drives the Node.js game bridge via stdin/stdout JSON-lines."""

import json
import os
import subprocess
import sys

import gymnasium
import numpy as np


# Observation vector length (must match src/observation.js OBSERVATION_SIZE).
OBSERVATION_SIZE = 36


class SpaceDogfightEnv(gymnasium.Env):
    """Gymnasium environment that communicates with ``node simulate.js --bridge``.

    The Node.js process is spawned lazily on the first ``reset()`` call so that
    the environment object is picklable (required by ``SubprocVecEnv``).  If the
    subprocess crashes, the next ``reset()`` will restart it automatically.
    """

    metadata = {"render_modes": []}

    def __init__(self, stage_config=None, node_executable="node", simulate_path=None):
        super().__init__()

        self.observation_space = gymnasium.spaces.Box(
            low=-1.0, high=1.0, shape=(OBSERVATION_SIZE,), dtype=np.float32
        )
        self.action_space = gymnasium.spaces.MultiDiscrete([10, 2])

        self._stage_config = stage_config or {}
        self._node_executable = node_executable

        if simulate_path is None:
            # Default: simulate.js in the project root (one level up from training/)
            self._simulate_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "simulate.js",
            )
        else:
            self._simulate_path = os.path.abspath(simulate_path)

        self._process = None

    # ------------------------------------------------------------------
    # Subprocess management
    # ------------------------------------------------------------------

    def _ensure_process(self):
        """Spawn the Node.js bridge process if it is not running."""
        if self._process is not None and self._process.poll() is None:
            return  # already alive

        # Kill zombie if it exists
        if self._process is not None:
            try:
                self._process.kill()
            except OSError:
                pass

        self._process = subprocess.Popen(
            [self._node_executable, self._simulate_path, "--bridge"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # line-buffered
        )

    def _send_command(self, cmd):
        """Send a JSON command and return the parsed JSON response.

        If the subprocess has died, restart it and raise so the caller
        can retry (typically on the next ``reset()``).
        """
        try:
            line = json.dumps(cmd) + "\n"
            self._process.stdin.write(line)
            self._process.stdin.flush()
            response_line = self._process.stdout.readline()
            if not response_line:
                raise ConnectionError("Bridge process produced no output")
            return json.loads(response_line)
        except (BrokenPipeError, ConnectionError, OSError) as exc:
            # Process died — clean up so _ensure_process will restart it
            self._kill_process()
            raise RuntimeError(f"Bridge subprocess crashed: {exc}") from exc

    def _kill_process(self):
        if self._process is not None:
            try:
                self._process.kill()
            except OSError:
                pass
            self._process = None

    # ------------------------------------------------------------------
    # Gymnasium interface
    # ------------------------------------------------------------------

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self._ensure_process()

        response = self._send_command({
            "command": "reset",
            "config": self._stage_config,
        })

        if "error" in response:
            raise RuntimeError(f"Bridge reset error: {response['error']}")

        obs = np.array(response["observation"], dtype=np.float32)
        return obs, {}

    def step(self, action):
        move_action = int(action[0])
        fire_action = int(action[1])

        response = self._send_command({
            "command": "step",
            "action": move_action,
            "fire": fire_action,
        })

        if "error" in response:
            raise RuntimeError(f"Bridge step error: {response['error']}")

        obs = np.array(response["observation"], dtype=np.float32)
        reward = float(response["reward"])
        done = bool(response["done"])
        info = response.get("info", {})

        # Gymnasium API: terminated vs truncated
        terminated = done and info.get("winner") != "timeout"
        truncated = done and info.get("winner") == "timeout"

        return obs, reward, terminated, truncated, info

    def close(self):
        if self._process is not None and self._process.poll() is None:
            try:
                self._send_command({"command": "close"})
            except (RuntimeError, OSError):
                pass
            self._kill_process()


def make_env(stage_config, rank, node_executable="node", simulate_path=None):
    """Factory function for ``SubprocVecEnv``.

    Returns a callable that creates a ``SpaceDogfightEnv`` with the given
    config.  Each env gets a unique seed derived from *rank*.
    """

    def _init():
        env = SpaceDogfightEnv(
            stage_config=stage_config,
            node_executable=node_executable,
            simulate_path=simulate_path,
        )
        return env

    return _init
