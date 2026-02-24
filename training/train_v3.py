"""
PPO training script (v4) with curriculum support for Space Dogfight RL agent.

What v4 fixes vs v3:
- Does NOT rely on info["episode"] / Monitor for episode counting.
- Counts an episode outcome when the VecEnv reports done=True for that env.
- Still prints frequent progress (episodes + rolling win rate + how close to promotion).
- Saves model checkpoint + meta.json per stage.
- Optional: early-stop a stage as soon as it qualifies for promotion.

Usage examples (single line):
  python training/train_v4.py --auto-promote --stage 1 --early-stop --timesteps 50000000 --num-envs 4 --min-episodes-before-promote 200
  python training/train_v4.py --auto-promote --stage 3 --early-stop --timesteps 50000000 --num-envs 4 --min-episodes-before-promote 200 --checkpoint training/checkpoints/stage3/final.zip
  python training/train_v4.py --stage 2 --timesteps 1000000 --num-envs 4
"""

import argparse
import json
import os
import sys
import time
from typing import Optional

import yaml
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.vec_env import SubprocVecEnv

from env import make_env


def load_config(config_path: str) -> dict:
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_stage_config(config: dict, stage_num: int) -> dict:
    stages = config["stages"]
    if stage_num not in stages:
        raise ValueError(f"Stage {stage_num} not found in config (available: {list(stages.keys())})")
    return stages[stage_num]


def build_policy_kwargs(config: dict) -> dict:
    import torch

    activation_map = {
        "ReLU": torch.nn.ReLU,
        "Tanh": torch.nn.Tanh,
        "ELU": torch.nn.ELU,
    }

    policy_cfg = config.get("policy", {})
    net_arch = policy_cfg.get("net_arch", {"pi": [256, 256, 256], "vf": [256, 256, 256]})
    activation_name = policy_cfg.get("activation_fn", "ReLU")
    activation_fn = activation_map.get(activation_name, torch.nn.ReLU)

    return dict(net_arch=net_arch, activation_fn=activation_fn)


class WinRateCallback(BaseCallback):
    """
    Counts episode outcomes using VecEnv done flags (no dependency on Monitor).

    Assumptions:
    - SB3 passes `dones` and `infos` into callback locals each step.
    - When dones[i] is True, infos[i] contains terminal data and includes either:
        - info["terminal_info"]["winner"], OR
        - info["winner"]
      If winner is missing, the episode is ignored for win-rate purposes.

    Promotion becomes eligible when:
      - episodes_counted >= min_episodes
      - rolling win rate over last window_size episodes >= promotion_threshold
    """

    def __init__(
        self,
        window_size: int = 100,
        promotion_threshold: float = 0.8,
        min_episodes: int = 200,
        print_every_seconds: float = 10.0,
        verbose: int = 0,
    ):
        super().__init__(verbose)
        self.window_size = int(window_size)
        self.promotion_threshold = float(promotion_threshold)
        self.min_episodes = int(min_episodes)
        self.print_every_seconds = float(print_every_seconds)

        self.outcomes: list[int] = []  # 1 = agent win, 0 = agent loss
        self.outcome_details: list[str] = []  # 'win', 'loss', 'draw_mutual', 'timeout'
        self.agent_asteroid_deaths: int = 0
        self.opponent_asteroid_deaths: int = 0
        self.reward_breakdowns: list[dict] = []
        self.should_promote: bool = False

        self._last_print_time: float = 0.0

    def _outcome_breakdown(self, window: Optional[int] = None) -> dict[str, float]:
        """Return outcome percentages over the last `window` episodes."""
        details = self.outcome_details
        if not details:
            return {"win": 0.0, "loss": 0.0, "draw_mutual": 0.0, "timeout": 0.0}
        n = len(details)
        w = min(window, n) if window else n
        recent = details[-w:]
        total = len(recent)
        counts: dict[str, int] = {"win": 0, "loss": 0, "draw_mutual": 0, "timeout": 0}
        for o in recent:
            if o in counts:
                counts[o] += 1
        return {k: round(v / total, 4) for k, v in counts.items()}

    def _rolling_reward_breakdown(self, window: Optional[int] = None) -> Optional[dict[str, float]]:
        """Return average per-component reward over the last `window` episodes."""
        if not self.reward_breakdowns:
            return None
        n = len(self.reward_breakdowns)
        w = min(window, n) if window else n
        recent = self.reward_breakdowns[-w:]
        keys = recent[0].keys()
        avg: dict[str, float] = {}
        for k in keys:
            total = sum(float(ep.get(k, 0)) for ep in recent)
            avg[k] = round(total / len(recent), 6)
        return avg

    def _rolling_win_rate(self) -> Optional[float]:
        n = len(self.outcomes)
        if n == 0:
            return None
        recent = self.outcomes[-min(self.window_size, n) :]
        return float(sum(recent) / len(recent))

    def _maybe_print_progress(self) -> None:
        if self.verbose <= 0:
            return

        now = time.time()
        if self._last_print_time == 0.0:
            self._last_print_time = now
            return
        if now - self._last_print_time < self.print_every_seconds:
            return
        self._last_print_time = now

        n = len(self.outcomes)
        wr = self._rolling_win_rate()
        remaining = max(0, self.min_episodes - n)
        steps = int(getattr(self, "num_timesteps", 0))

        if wr is None:
            print(f"  [TRAINING] steps={steps}  episodes=0  win_rate=n/a  threshold={self.promotion_threshold:.0%}  min_episodes_remaining={remaining}")
            return

        status = "READY" if (n >= self.min_episodes and wr >= self.promotion_threshold) else "TRAINING"
        w = min(self.window_size, n)
        print(
            f"  [{status}] steps={steps}  episodes={n}  win_rate(last {w})={wr:.1%}  threshold={self.promotion_threshold:.0%}  min_episodes_remaining={remaining}"
        )
        breakdown = self._outcome_breakdown(self.window_size)
        print(
            f"    breakdown: win={breakdown['win']:.0%} loss={breakdown['loss']:.0%}"
            f" draw={breakdown['draw_mutual']:.0%} timeout={breakdown['timeout']:.0%}"
            f"  ast_deaths={self.agent_asteroid_deaths}"
        )

    def _on_step(self) -> bool:
        dones = self.locals.get("dones", None)
        infos = self.locals.get("infos", None)

        if dones is not None and infos is not None:
            for done, info in zip(dones, infos):
                if not done:
                    continue

                terminal_info = info.get("terminal_info", info)
                winner = terminal_info.get("winner", None)
                if winner is None:
                    continue

                self.outcomes.append(1 if winner == "agent" else 0)

                # Structured outcome tracking
                if winner == "agent":
                    self.outcome_details.append("win")
                elif winner == "draw_mutual":
                    self.outcome_details.append("draw_mutual")
                elif winner == "timeout":
                    self.outcome_details.append("timeout")
                else:
                    self.outcome_details.append("loss")

                # Track reward breakdown
                rb = terminal_info.get("rewardBreakdown", None)
                if rb is not None and isinstance(rb, dict):
                    self.reward_breakdowns.append(rb)

                # Track asteroid deaths
                agent_cause = terminal_info.get("agentDeathCause", None)
                opponent_cause = terminal_info.get("opponentDeathCause", None)
                if agent_cause == "asteroid":
                    self.agent_asteroid_deaths += 1
                if opponent_cause == "asteroid":
                    self.opponent_asteroid_deaths += 1

        n = len(self.outcomes)
        if n >= max(self.window_size, self.min_episodes):
            recent = self.outcomes[-self.window_size :]
            win_rate = sum(recent) / len(recent)
            if win_rate >= self.promotion_threshold:
                self.should_promote = True

        self._maybe_print_progress()
        return True


class ConfigReloadCallback(BaseCallback):
    """
    Hot-reloads config.yaml when the file changes on disk.

    Checks file mtime every `check_every_seconds`. On change, reloads and updates:
    - WinRateCallback.promotion_threshold (from current stage config)
    - model.learning_rate (from ppo config)
    """

    def __init__(
        self,
        config_path: str,
        stage_num: int,
        win_cb: "WinRateCallback",
        check_every_seconds: float = 30.0,
    ):
        super().__init__(verbose=0)
        self.config_path = config_path
        self.stage_num = stage_num
        self.win_cb = win_cb
        self.check_every_seconds = check_every_seconds
        self._last_check_time: float = 0.0
        self._last_mtime: float = os.path.getmtime(config_path)

    def _on_step(self) -> bool:
        now = time.time()
        if now - self._last_check_time < self.check_every_seconds:
            return True
        self._last_check_time = now

        try:
            mtime = os.path.getmtime(self.config_path)
        except OSError:
            return True

        if mtime <= self._last_mtime:
            return True
        self._last_mtime = mtime

        try:
            config = load_config(self.config_path)
            changes = []

            stage_cfg = config.get("stages", {}).get(self.stage_num, {})
            new_threshold = float(stage_cfg.get("promotionThreshold", self.win_cb.promotion_threshold))
            if new_threshold != self.win_cb.promotion_threshold:
                old = self.win_cb.promotion_threshold
                self.win_cb.promotion_threshold = new_threshold
                changes.append(f"promotionThreshold: {old:.0%} → {new_threshold:.0%}")

            ppo_cfg = config.get("ppo", {})
            new_lr = float(ppo_cfg.get("learning_rate", self.model.learning_rate))
            if new_lr != self.model.learning_rate:
                old_lr = self.model.learning_rate
                self.model.learning_rate = new_lr
                changes.append(f"learning_rate: {old_lr} → {new_lr}")

            if changes:
                print(f"  [CONFIG RELOAD] {', '.join(changes)}")
        except Exception as e:
            print(f"  [CONFIG RELOAD] Failed to reload: {e}")

        return True


class StopOnPromotionCallback(BaseCallback):
    """Stops training early when the WinRateCallback says we should promote."""

    def __init__(self, win_cb: WinRateCallback):
        super().__init__(verbose=0)
        self.win_cb = win_cb

    def _on_step(self) -> bool:
        return not self.win_cb.should_promote


class MetricsCallback(BaseCallback):
    """
    Periodic lightweight feedback. Does not rely on Monitor.

    Prints:
    - num_timesteps
    - mean reward over last N steps (from `rewards` in locals if present)
    """

    def __init__(self, print_every_seconds: float = 10.0, verbose: int = 0):
        super().__init__(verbose)
        self.print_every_seconds = float(print_every_seconds)
        self._last_print_time: float = 0.0
        self._recent_rewards: list[float] = []

    def _on_step(self) -> bool:
        if self.verbose <= 0:
            return True

        rewards = self.locals.get("rewards", None)
        if rewards is not None:
            try:
                # rewards is typically an np.ndarray of shape (n_envs,)
                self._recent_rewards.extend([float(r) for r in rewards])
                if len(self._recent_rewards) > 2000:
                    self._recent_rewards = self._recent_rewards[-2000:]
            except Exception:
                pass

        now = time.time()
        if self._last_print_time == 0.0:
            self._last_print_time = now
            return True
        if now - self._last_print_time < self.print_every_seconds:
            return True
        self._last_print_time = now

        steps = int(getattr(self, "num_timesteps", 0))
        if self._recent_rewards:
            tail = self._recent_rewards[-min(200, len(self._recent_rewards)) :]
            print(f"  [METRICS] steps={steps}  mean_step_reward(last {len(tail)})={np.mean(tail):.4f}")
        else:
            print(f"  [METRICS] steps={steps}")
        return True


class BestModelCallback(BaseCallback):
    """
    Saves the best model checkpoint based on rolling win rate.

    Reads from an existing WinRateCallback (no duplicate episode counting).
    Every `check_every` episodes, checks if rolling win rate exceeds the best
    seen so far. If yes, saves best.zip + best_meta.json to checkpoint_dir.
    """

    def __init__(self, win_cb: WinRateCallback, checkpoint_dir: str, check_every: int = 50):
        super().__init__(verbose=0)
        self.win_cb = win_cb
        self.checkpoint_dir = checkpoint_dir
        self.check_every = check_every
        self.best_win_rate: float = 0.0
        self._last_checked_episodes: int = 0

    def _on_step(self) -> bool:
        n = len(self.win_cb.outcomes)
        if n < self.win_cb.window_size:
            return True
        if n - self._last_checked_episodes < self.check_every:
            return True

        self._last_checked_episodes = n
        wr = self.win_cb._rolling_win_rate()
        if wr is not None and wr > self.best_win_rate:
            self.best_win_rate = wr
            os.makedirs(self.checkpoint_dir, exist_ok=True)
            best_path = os.path.join(self.checkpoint_dir, "best.zip")
            self.model.save(best_path)

            meta = {
                "win_rate": wr,
                "episodes": n,
                "step": int(self.num_timesteps),
                "timestamp": time.time(),
            }
            meta_path = os.path.join(self.checkpoint_dir, "best_meta.json")
            with open(meta_path, "w") as f:
                json.dump(meta, f, indent=2)

            print(f"  [BEST] New best model! win_rate={wr:.1%} step={self.num_timesteps} episode={n}")

        return True


class JsonLogCallback(BaseCallback):
    """
    Appends training metrics as JSONL and rewrites a JS data file for the dashboard.

    Logs at the same cadence as console prints (~every print_every_seconds).
    On startup, loads existing JSONL entries so data persists across restarts.
    """

    def __init__(
        self,
        win_cb: WinRateCallback,
        metrics_cb: MetricsCallback,
        best_cb: BestModelCallback,
        stage_num: int,
        log_dir: str,
        print_every_seconds: float = 10.0,
    ):
        super().__init__(verbose=0)
        self.win_cb = win_cb
        self.metrics_cb = metrics_cb
        self.best_cb = best_cb
        self.stage_num = stage_num
        self.log_dir = log_dir
        self.print_every_seconds = print_every_seconds
        self._last_log_time: float = 0.0
        self._entries: list[dict] = []

        os.makedirs(log_dir, exist_ok=True)
        self._jsonl_path = os.path.join(log_dir, f"stage{stage_num}.jsonl")
        self._js_path = os.path.join(log_dir, "dashboard_data.js")

        # Load existing entries on startup
        if os.path.exists(self._jsonl_path):
            with open(self._jsonl_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            self._entries.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass

    def _on_step(self) -> bool:
        now = time.time()
        if self._last_log_time == 0.0:
            self._last_log_time = now
            return True
        if now - self._last_log_time < self.print_every_seconds:
            return True
        self._last_log_time = now

        wr = self.win_cb._rolling_win_rate()
        recent_rewards = self.metrics_cb._recent_rewards
        if recent_rewards:
            tail = recent_rewards[-min(200, len(recent_rewards)):]
            mean_reward = float(np.mean(tail))
        else:
            mean_reward = 0.0

        breakdown = self.win_cb._outcome_breakdown(self.win_cb.window_size)

        reward_breakdown = self.win_cb._rolling_reward_breakdown(self.win_cb.window_size)

        entry = {
            "ts": now,
            "step": int(self.num_timesteps),
            "episodes": len(self.win_cb.outcomes),
            "win_rate": round(wr, 4) if wr is not None else None,
            "mean_reward": round(mean_reward, 4),
            "best_wr": round(self._get_best_wr(), 4),
            "stage": self.stage_num,
            "threshold": round(self.win_cb.promotion_threshold, 4),
            "outcome_breakdown": breakdown,
            "agent_asteroid_deaths": self.win_cb.agent_asteroid_deaths,
            "opponent_asteroid_deaths": self.win_cb.opponent_asteroid_deaths,
            "reward_breakdown": reward_breakdown,
        }
        self._entries.append(entry)

        # Append to JSONL
        with open(self._jsonl_path, "a") as f:
            f.write(json.dumps(entry) + "\n")

        # Rewrite JS data file for dashboard
        self._write_dashboard_js()

        return True

    def _get_best_wr(self) -> float:
        return self.best_cb.best_win_rate

    def _write_dashboard_js(self) -> None:
        with open(self._js_path, "w") as f:
            f.write("// Auto-generated by train_v3.py — do not edit\n")
            f.write(f"var DASHBOARD_DATA = {json.dumps(self._entries)};\n")


def save_meta(
    checkpoint_dir: str,
    stage_num: int,
    env_config: dict,
    ppo_cfg: dict,
    promotion_threshold: float,
    timesteps_budget: int,
    outcomes: list[int],
    window_size: int,
    min_episodes: int,
) -> str:
    if outcomes:
        recent = outcomes[-min(window_size, len(outcomes)) :]
        rolling = float(sum(recent) / len(recent))
    else:
        rolling = None

    meta = {
        "stage": stage_num,
        "timestamp": time.time(),
        "env_config": env_config,
        "ppo_config": ppo_cfg,
        "promotion_threshold": promotion_threshold,
        "timesteps_budget": timesteps_budget,
        "episodes_counted": len(outcomes),
        "rolling_win_rate": rolling,
        "window_size": window_size,
        "min_episodes_before_promote": min_episodes,
    }

    meta_path = os.path.join(checkpoint_dir, "meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    return meta_path


def train_stage(
    config: dict,
    stage_num: int,
    timesteps: int,
    num_envs: int,
    checkpoint_path: Optional[str],
    node_executable: str,
    simulate_path: Optional[str],
    checkpoint_dir: str,
    early_stop: bool,
    min_episodes_before_promote: int,
    progress_print_seconds: float,
    window_size: int = 200,
    config_path: Optional[str] = None,
) -> tuple[str, bool]:
    stage_cfg = get_stage_config(config, stage_num)
    ppo_cfg = config.get("ppo", {})
    promotion_threshold = float(stage_cfg.get("promotionThreshold", 0.8))

    env_config = {
        k: stage_cfg[k]
        for k in (
            "shipHP",
            "enemyHP",
            "maxTicks",
            "asteroidDensity",
            "enemyPolicy",
            "enemyShoots",
            "spawnDistance",
            "spawnFacing",
            "rewardWeights",
            "frameSkip",
            "aiHoldTime",
            "aiSimSteps",
            "aiMaxSpeedFactor",
            "selfPlayModelPath",
            "evasionWaypointRadius",
            "evasionArrivalDist",
            "evasionMaxHoldTime",
            "evasionCandidates",
            "campCheckTicks",
            "campMinClosing",
        )
        if k in stage_cfg
    }

    print("\n" + "=" * 60)
    print(f"Stage {stage_num}: {stage_cfg.get('description', '')}")
    print(f"  Envs: {num_envs}  Timesteps budget: {timesteps}  Early-stop: {early_stop}")
    print(f"  Promotion threshold: {promotion_threshold:.0%}  Min episodes: {min_episodes_before_promote}  Window: {window_size}")
    print(f"  Progress print: every {progress_print_seconds:.0f}s")
    print(f"  Config: {env_config}")
    print("=" * 60 + "\n")

    env_fns = [
        make_env(env_config, rank=i, node_executable=node_executable, simulate_path=simulate_path)
        for i in range(num_envs)
    ]

    if num_envs > 1:
        vec_env = SubprocVecEnv(env_fns)
    else:
        from stable_baselines3.common.vec_env import DummyVecEnv

        vec_env = DummyVecEnv(env_fns)

    policy_kwargs = build_policy_kwargs(config)

    if checkpoint_path and os.path.exists(checkpoint_path):
        print(f"  Loading checkpoint: {checkpoint_path}")
        model = PPO.load(checkpoint_path, env=vec_env)
        model.learning_rate = ppo_cfg.get("learning_rate", 3e-4)
    else:
        model = PPO(
            "MlpPolicy",
            vec_env,
            learning_rate=ppo_cfg.get("learning_rate", 3e-4),
            n_steps=ppo_cfg.get("n_steps", 2048),
            batch_size=ppo_cfg.get("batch_size", 64),
            n_epochs=ppo_cfg.get("n_epochs", 10),
            gamma=ppo_cfg.get("gamma", 0.99),
            gae_lambda=ppo_cfg.get("gae_lambda", 0.95),
            clip_range=ppo_cfg.get("clip_range", 0.2),
            ent_coef=ppo_cfg.get("ent_coef", 0.01),
            vf_coef=ppo_cfg.get("vf_coef", 0.5),
            max_grad_norm=ppo_cfg.get("max_grad_norm", 0.5),
            policy_kwargs=policy_kwargs,
            verbose=0,
        )

    win_cb = WinRateCallback(
        window_size=window_size,
        promotion_threshold=promotion_threshold,
        min_episodes=min_episodes_before_promote,
        print_every_seconds=progress_print_seconds,
        verbose=1,
    )
    metrics_cb = MetricsCallback(print_every_seconds=progress_print_seconds, verbose=1)

    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
    best_cb = BestModelCallback(win_cb=win_cb, checkpoint_dir=checkpoint_dir)
    json_log_cb = JsonLogCallback(
        win_cb=win_cb,
        metrics_cb=metrics_cb,
        best_cb=best_cb,
        stage_num=stage_num,
        log_dir=log_dir,
        print_every_seconds=progress_print_seconds,
    )

    callbacks: list[BaseCallback] = [win_cb, metrics_cb, best_cb, json_log_cb]
    if config_path:
        callbacks.append(ConfigReloadCallback(config_path, stage_num, win_cb))
    if early_stop:
        callbacks.append(StopOnPromotionCallback(win_cb))

    start_time = time.time()
    model.learn(total_timesteps=timesteps, callback=callbacks)
    elapsed = time.time() - start_time

    os.makedirs(checkpoint_dir, exist_ok=True)
    final_path = os.path.join(checkpoint_dir, "final.zip")
    model.save(final_path)

    meta_path = save_meta(
        checkpoint_dir=checkpoint_dir,
        stage_num=stage_num,
        env_config=env_config,
        ppo_cfg=ppo_cfg,
        promotion_threshold=promotion_threshold,
        timesteps_budget=timesteps,
        outcomes=win_cb.outcomes,
        window_size=window_size,
        min_episodes=min_episodes_before_promote,
    )

    print(f"\n  Stage {stage_num} complete in {elapsed:.1f}s")
    print(f"  Episodes counted: {len(win_cb.outcomes)}")
    if win_cb.outcomes:
        recent = win_cb.outcomes[-min(window_size, len(win_cb.outcomes)) :]
        print(f"  Rolling win rate (last {len(recent)}): {sum(recent)/len(recent):.1%}")
    print(f"  Checkpoint saved: {final_path}")
    print(f"  Meta saved: {meta_path}")

    vec_env.close()
    return final_path, win_cb.should_promote


def parse_args():
    parser = argparse.ArgumentParser(description="PPO training for Space Dogfight (v4)")
    parser.add_argument("--stage", type=int, default=1, help="Curriculum stage (1-5)")
    parser.add_argument("--timesteps", type=int, default=None, help="Max training timesteps per stage")
    parser.add_argument(
        "--episodes",
        type=int,
        default=None,
        help="Training budget in episodes (converted to timesteps via maxTicks for the chosen start stage)",
    )
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to a saved model to resume from")
    parser.add_argument("--num-envs", type=int, default=4, help="Number of parallel environments")
    parser.add_argument("--config", type=str, default=None, help="Path to config.yaml")
    parser.add_argument("--auto-promote", action="store_true", help="Automatically promote through curriculum stages")
    parser.add_argument("--early-stop", action="store_true", help="Stop a stage as soon as promotion threshold is met")
    parser.add_argument(
        "--continue-all-stages",
        action="store_true",
        help="When auto-promoting, continue later stages even if threshold is not met",
    )
    parser.add_argument(
        "--min-episodes-before-promote",
        type=int,
        default=200,
        help="Minimum completed episodes before a stage can trigger promotion",
    )
    parser.add_argument(
        "--progress-print-seconds",
        type=float,
        default=10.0,
        help="Print progress every N seconds",
    )
    parser.add_argument(
        "--window-size",
        type=int,
        default=200,
        help="Rolling window size for win rate calculation (default: 200)",
    )
    parser.add_argument("--node", type=str, default="node", help="Path to Node.js executable")
    parser.add_argument("--simulate", type=str, default=None, help="Path to simulate.js")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.config:
        config_path = args.config
    else:
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.yaml")

    config = load_config(config_path)

    if args.episodes is not None and args.timesteps is not None:
        print("Error: --episodes and --timesteps are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    if args.episodes is not None:
        start_stage_cfg = get_stage_config(config, args.stage)
        max_ticks = int(start_stage_cfg.get("maxTicks", 3600))
        timesteps = int(args.episodes) * max_ticks
    elif args.timesteps is not None:
        timesteps = int(args.timesteps)
    else:
        timesteps = 200_000

    if args.auto_promote:
        checkpoint = args.checkpoint
        max_stage = max(config["stages"].keys())
        for stage_num in range(args.stage, max_stage + 1):
            checkpoint_dir = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "checkpoints",
                f"stage{stage_num}",
            )
            final_path, promoted = train_stage(
                config=config,
                stage_num=stage_num,
                timesteps=timesteps,
                num_envs=args.num_envs,
                checkpoint_path=checkpoint,
                node_executable=args.node,
                simulate_path=args.simulate,
                checkpoint_dir=checkpoint_dir,
                early_stop=args.early_stop,
                min_episodes_before_promote=args.min_episodes_before_promote,
                progress_print_seconds=args.progress_print_seconds,
                window_size=args.window_size,
                config_path=config_path,
            )
            checkpoint = final_path

            if promoted:
                print(f"\n  Promoted to stage {stage_num + 1}!")
                # Export self-play snapshot when graduating to a self-play stage
                if stage_num + 1 in (10, 12, 13):
                    snapshot_dir = os.path.join(
                        os.path.dirname(os.path.abspath(__file__)),
                        "checkpoints", "selfplay",
                    )
                    os.makedirs(snapshot_dir, exist_ok=True)
                    snapshot_path = os.path.join(snapshot_dir, "opponent_snapshot.onnx")
                    from export_onnx import export_onnx
                    export_onnx(final_path, snapshot_path, validate=False)
                    print(f"  Self-play snapshot exported: {snapshot_path}")
            else:
                print(f"\n  Stage {stage_num}: promotion threshold not reached.")
                if not args.continue_all_stages:
                    print("  Stopping (use --continue-all-stages to force running later stages).")
                    break
    else:
        checkpoint_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "checkpoints",
            f"stage{args.stage}",
        )
        train_stage(
            config=config,
            stage_num=args.stage,
            timesteps=timesteps,
            num_envs=args.num_envs,
            checkpoint_path=args.checkpoint,
            node_executable=args.node,
            simulate_path=args.simulate,
            checkpoint_dir=checkpoint_dir,
            early_stop=args.early_stop,
            min_episodes_before_promote=args.min_episodes_before_promote,
            progress_print_seconds=args.progress_print_seconds,
            window_size=args.window_size,
            config_path=config_path,
        )


if __name__ == "__main__":
    main()
