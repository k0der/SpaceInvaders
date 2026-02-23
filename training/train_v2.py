"""
PPO training script (v2) with curriculum support for Space Dogfight RL agent.

Changes vs v1:
- Auto-promote can switch stages as soon as promotion threshold is reached (early stop).
- Win-rate counting is now "once per episode" (avoids repeated counts per episode / per env step).
- Writes metadata next to checkpoints (meta.json) so you always know what stage a checkpoint is from.
- Optional: continue through all stages even if promotion threshold is not reached.
- Optional: require a minimum number of completed episodes before promotion can trigger.

Usage examples:
    python training/train_v2.py --stage 1 --timesteps 100000
    python training/train_v2.py --auto-promote --timesteps 2000000 --num-envs 4
    python training/train_v2.py --auto-promote --timesteps 2000000 --num-envs 4 --early-stop
    python training/train_v2.py --auto-promote --timesteps 2000000 --num-envs 4 --early-stop --continue-all-stages
    python training/train_v2.py --stage 3 --checkpoint training/checkpoints/stage3/final.zip --timesteps 500000
"""

import argparse
import json
import os
import sys
import time

import yaml
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.vec_env import SubprocVecEnv

from env import SpaceDogfightEnv, make_env


def load_config(config_path):
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_stage_config(config, stage_num):
    stages = config["stages"]
    if stage_num not in stages:
        raise ValueError(f"Stage {stage_num} not found in config (available: {list(stages.keys())})")
    return stages[stage_num]


def build_policy_kwargs(config):
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
    Tracks win rate from episode terminal infos.

    Important: counts outcomes ONLY when an episode ends (info["episode"] exists),
    so you don't double-count from intermediate terminal_info fields.

    Promotion triggers when:
      - at least min_episodes completed, and
      - windowed win-rate >= threshold
    """

    def __init__(self, window_size=100, promotion_threshold=0.8, min_episodes=100, verbose=0):
        super().__init__(verbose)
        self.window_size = int(window_size)
        self.promotion_threshold = float(promotion_threshold)
        self.min_episodes = int(min_episodes)

        self.outcomes = []  # 1 = agent win, 0 = agent loss
        self.should_promote = False

        # To avoid printing the same window milestone repeatedly
        self._last_print_milestone = 0

    def _on_step(self):
        infos = self.locals.get("infos", [])
        for info in infos:
            # Only count at episode end
            ep_info = info.get("episode")
            if ep_info is None:
                continue

            terminal_info = info.get("terminal_info", info)
            winner = terminal_info.get("winner")
            if winner is None:
                continue

            self.outcomes.append(1 if winner == "agent" else 0)

        n = len(self.outcomes)
        if n >= max(self.window_size, self.min_episodes):
            recent = self.outcomes[-self.window_size :]
            win_rate = sum(recent) / len(recent)

            # Print at milestones (100, 200, 300...) to keep logs readable
            milestone = (n // self.window_size) * self.window_size
            if self.verbose > 0 and milestone != self._last_print_milestone:
                self._last_print_milestone = milestone
                print(f"  Win rate ({n} episodes, last {self.window_size}): {win_rate:.2%}")

            if win_rate >= self.promotion_threshold:
                self.should_promote = True

        return True


class MetricsCallback(BaseCallback):
    """Log reward and episode length periodically."""

    def __init__(self, log_interval=10000, verbose=0):
        super().__init__(verbose)
        self.log_interval = int(log_interval)
        self.episode_rewards = []
        self.episode_lengths = []
        self._last_log_step = 0

    def _on_step(self):
        infos = self.locals.get("infos", [])
        for info in infos:
            ep_info = info.get("episode")
            if ep_info is not None:
                self.episode_rewards.append(ep_info["r"])
                self.episode_lengths.append(ep_info["l"])

        # Avoid spamming due to n_envs
        if self.num_timesteps - self._last_log_step >= self.log_interval:
            self._last_log_step = self.num_timesteps
            if self.episode_rewards:
                n = min(100, len(self.episode_rewards))
                recent_r = self.episode_rewards[-n:]
                recent_l = self.episode_lengths[-n:]
                print(
                    f"  [{self.num_timesteps:>8d} steps] "
                    f"mean_reward={np.mean(recent_r):.2f}  "
                    f"mean_length={np.mean(recent_l):.0f}  "
                    f"episodes={len(self.episode_rewards)}"
                )

        return True


class StopOnPromotionCallback(BaseCallback):
    """Stops training early when WinRateCallback decides we should promote."""

    def __init__(self, win_cb: WinRateCallback):
        super().__init__(verbose=0)
        self.win_cb = win_cb

    def _on_step(self) -> bool:
        # Returning False tells SB3 to stop learning early
        return not self.win_cb.should_promote


def _save_meta(checkpoint_dir, stage_num, env_config, ppo_cfg, promotion_threshold, timesteps, outcomes):
    meta = {
        "stage": stage_num,
        "timestamp": time.time(),
        "env_config": env_config,
        "ppo_config": ppo_cfg,
        "promotion_threshold": promotion_threshold,
        "timesteps_budget": timesteps,
        "episodes_counted": len(outcomes),
        "recent_win_rate_window_100": (
            float(sum(outcomes[-100:]) / len(outcomes[-100:])) if len(outcomes) >= 1 else None
        ),
    }
    meta_path = os.path.join(checkpoint_dir, "meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    return meta_path


def train_stage(
    config,
    stage_num,
    timesteps,
    num_envs,
    checkpoint_path,
    node_executable,
    simulate_path,
    checkpoint_dir,
    early_stop,
    min_episodes_before_promote,
):
    """Train PPO on a single curriculum stage. Returns (final_checkpoint_path, should_promote)."""

    stage_cfg = get_stage_config(config, stage_num)
    ppo_cfg = config.get("ppo", {})
    promotion_threshold = stage_cfg.get("promotionThreshold", 0.8)

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
            "aiMaxSpeedFactor",
        )
        if k in stage_cfg
    }

    print(f"\n{'='*60}")
    print(f"Stage {stage_num}: {stage_cfg.get('description', '')}")
    print(f"  Envs: {num_envs}  Timesteps budget: {timesteps}  Early-stop: {early_stop}")
    print(f"  Promotion threshold: {promotion_threshold}  Min episodes: {min_episodes_before_promote}")
    print(f"  Config: {env_config}")
    print(f"{'='*60}\n")

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
        window_size=100,
        promotion_threshold=promotion_threshold,
        min_episodes=min_episodes_before_promote,
        verbose=1,
    )
    metrics_cb = MetricsCallback(log_interval=10000, verbose=1)

    callbacks = [win_cb, metrics_cb]
    if early_stop:
        callbacks.append(StopOnPromotionCallback(win_cb))

    start_time = time.time()
    model.learn(total_timesteps=timesteps, callback=callbacks)
    elapsed = time.time() - start_time

    os.makedirs(checkpoint_dir, exist_ok=True)
    final_path = os.path.join(checkpoint_dir, "final.zip")
    model.save(final_path)
    meta_path = _save_meta(
        checkpoint_dir,
        stage_num,
        env_config,
        ppo_cfg,
        promotion_threshold,
        timesteps,
        win_cb.outcomes,
    )

    print(f"\n  Stage {stage_num} complete in {elapsed:.1f}s")
    print(f"  Episodes counted: {len(win_cb.outcomes)}")
    if win_cb.outcomes:
        recent = win_cb.outcomes[-min(100, len(win_cb.outcomes)) :]
        print(f"  Final win rate (last {len(recent)}): {sum(recent)/len(recent):.2%}")
    print(f"  Checkpoint saved: {final_path}")
    print(f"  Meta saved: {meta_path}")

    vec_env.close()
    return final_path, win_cb.should_promote


def parse_args():
    parser = argparse.ArgumentParser(description="PPO training for Space Dogfight (v2)")
    parser.add_argument("--stage", type=int, default=1, help="Curriculum stage (1-5)")
    parser.add_argument("--timesteps", type=int, default=None, help="Max training timesteps per stage")
    parser.add_argument(
        "--episodes",
        type=int,
        default=None,
        help="Training duration budget in episodes (converted to timesteps via maxTicks)",
    )
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to a saved model to resume from")
    parser.add_argument("--num-envs", type=int, default=4, help="Number of parallel environments")
    parser.add_argument("--config", type=str, default=None, help="Path to config.yaml")
    parser.add_argument("--auto-promote", action="store_true", help="Automatically promote through curriculum stages")
    parser.add_argument(
        "--early-stop",
        action="store_true",
        help="Stop training a stage as soon as promotion threshold is reached",
    )
    parser.add_argument(
        "--continue-all-stages",
        action="store_true",
        help="When auto-promoting, continue training later stages even if promotion threshold isn't reached",
    )
    parser.add_argument(
        "--min-episodes-before-promote",
        type=int,
        default=200,
        help="Minimum completed episodes before a stage can trigger promotion",
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
        stage_cfg = get_stage_config(config, args.stage)
        max_ticks = stage_cfg.get("maxTicks", 3600)
        timesteps = args.episodes * max_ticks
    elif args.timesteps is not None:
        timesteps = args.timesteps
    else:
        timesteps = 200_000  # safer default for curricula

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
            )
            checkpoint = final_path

            if promoted:
                print(f"\n  Promoted to stage {stage_num + 1}!")
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
        )


if __name__ == "__main__":
    main()
