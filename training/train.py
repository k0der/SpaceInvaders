"""PPO training script with curriculum support for Space Dogfight RL agent.

Usage examples:
    python training/train.py --stage 1 --timesteps 100000
    python training/train.py --stage 1 --timesteps 500000 --num-envs 8
    python training/train.py --stage 2 --checkpoint training/checkpoints/stage1/final.zip
    python training/train.py --auto-promote --timesteps 1000000
"""

import argparse
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
    """Load curriculum and PPO config from YAML."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_stage_config(config, stage_num):
    """Extract the stage-specific environment configuration dict."""
    stages = config["stages"]
    if stage_num not in stages:
        raise ValueError(f"Stage {stage_num} not found in config (available: {list(stages.keys())})")
    return stages[stage_num]


def build_policy_kwargs(config):
    """Build SB3 policy_kwargs from the config."""
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

    return dict(
        net_arch=net_arch,
        activation_fn=activation_fn,
    )


class WinRateCallback(BaseCallback):
    """Track win rate from episode info dicts and trigger stage promotion."""

    def __init__(self, window_size=100, promotion_threshold=0.8, verbose=0):
        super().__init__(verbose)
        self.window_size = window_size
        self.promotion_threshold = promotion_threshold
        self.outcomes = []
        self.should_promote = False

    def _on_step(self):
        infos = self.locals.get("infos", [])
        for info in infos:
            # SB3 wraps terminal info in "terminal_info" or "terminal_observation"
            # when using VecEnv auto-reset.  The actual episode info comes through
            # the "episode" key added by Monitor, but we track winner directly.
            terminal_info = info.get("terminal_info", info)
            winner = terminal_info.get("winner")
            if winner is not None:
                self.outcomes.append(1 if winner == "agent" else 0)

        if len(self.outcomes) >= self.window_size:
            recent = self.outcomes[-self.window_size:]
            win_rate = sum(recent) / len(recent)
            if self.verbose > 0 and len(self.outcomes) % self.window_size == 0:
                print(f"  Win rate ({len(self.outcomes)} episodes): {win_rate:.2%}")
            if win_rate >= self.promotion_threshold:
                self.should_promote = True

        return True


class MetricsCallback(BaseCallback):
    """Log reward and episode length periodically."""

    def __init__(self, log_interval=10000, verbose=0):
        super().__init__(verbose)
        self.log_interval = log_interval
        self.episode_rewards = []
        self.episode_lengths = []

    def _on_step(self):
        infos = self.locals.get("infos", [])
        for info in infos:
            ep_info = info.get("episode")
            if ep_info is not None:
                self.episode_rewards.append(ep_info["r"])
                self.episode_lengths.append(ep_info["l"])

        if self.num_timesteps % self.log_interval < self.locals.get("n_envs", 1):
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


def train_stage(config, stage_num, timesteps, num_envs, checkpoint_path,
                node_executable, simulate_path, checkpoint_dir):
    """Train PPO on a single curriculum stage.

    Returns the path to the saved final checkpoint.
    """
    stage_cfg = get_stage_config(config, stage_num)
    ppo_cfg = config.get("ppo", {})
    promotion_threshold = stage_cfg.get("promotionThreshold", 0.8)

    # Build environment config for the bridge
    env_config = {
        k: stage_cfg[k]
        for k in ("shipHP", "maxTicks", "asteroidDensity", "enemyPolicy",
                   "enemyShoots", "spawnDistance", "spawnFacing", "rewardWeights")
        if k in stage_cfg
    }

    print(f"\n{'='*60}")
    print(f"Stage {stage_num}: {stage_cfg.get('description', '')}")
    print(f"  Envs: {num_envs}  Timesteps: {timesteps}")
    print(f"  Config: {env_config}")
    print(f"{'='*60}\n")

    # Create vectorized environments
    env_fns = [
        make_env(env_config, rank=i, node_executable=node_executable,
                 simulate_path=simulate_path)
        for i in range(num_envs)
    ]

    if num_envs > 1:
        vec_env = SubprocVecEnv(env_fns)
    else:
        # Single env — avoid subprocess overhead
        from stable_baselines3.common.vec_env import DummyVecEnv
        vec_env = DummyVecEnv(env_fns)

    # Build or load model
    policy_kwargs = build_policy_kwargs(config)

    if checkpoint_path and os.path.exists(checkpoint_path):
        print(f"  Loading checkpoint: {checkpoint_path}")
        model = PPO.load(checkpoint_path, env=vec_env)
        # Override learning rate from config in case it changed between stages
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

    # Callbacks
    win_cb = WinRateCallback(
        window_size=100,
        promotion_threshold=promotion_threshold,
        verbose=1,
    )
    metrics_cb = MetricsCallback(log_interval=10000, verbose=1)

    # Train
    start_time = time.time()
    model.learn(total_timesteps=timesteps, callback=[win_cb, metrics_cb])
    elapsed = time.time() - start_time

    # Save checkpoint
    os.makedirs(checkpoint_dir, exist_ok=True)
    final_path = os.path.join(checkpoint_dir, "final.zip")
    model.save(final_path)

    print(f"\n  Stage {stage_num} complete in {elapsed:.1f}s")
    print(f"  Episodes: {len(win_cb.outcomes)}")
    if win_cb.outcomes:
        recent = win_cb.outcomes[-min(100, len(win_cb.outcomes)):]
        print(f"  Final win rate: {sum(recent)/len(recent):.2%}")
    print(f"  Checkpoint saved: {final_path}")

    vec_env.close()

    return final_path, win_cb.should_promote


def parse_args():
    parser = argparse.ArgumentParser(description="PPO training for Space Dogfight")
    parser.add_argument("--stage", type=int, default=1, help="Curriculum stage (1-5)")
    parser.add_argument("--timesteps", type=int, default=None,
                        help="Total training timesteps per stage")
    parser.add_argument("--episodes", type=int, default=None,
                        help="Training duration in episodes (converted to timesteps via maxTicks)")
    parser.add_argument("--checkpoint", type=str, default=None,
                        help="Path to a saved model to resume from")
    parser.add_argument("--num-envs", type=int, default=8,
                        help="Number of parallel environments")
    parser.add_argument("--config", type=str, default=None,
                        help="Path to config.yaml")
    parser.add_argument("--auto-promote", action="store_true",
                        help="Automatically promote through curriculum stages")
    parser.add_argument("--node", type=str, default="node",
                        help="Path to Node.js executable")
    parser.add_argument("--simulate", type=str, default=None,
                        help="Path to simulate.js")
    return parser.parse_args()


def main():
    args = parse_args()

    # Resolve config path
    if args.config:
        config_path = args.config
    else:
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.yaml")

    config = load_config(config_path)

    # Resolve timesteps: --episodes converts via maxTicks, --timesteps is direct
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
        timesteps = 100000  # default

    if args.auto_promote:
        # Chain stages sequentially, starting from args.stage
        checkpoint = args.checkpoint
        for stage_num in range(args.stage, 6):
            checkpoint_dir = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "checkpoints", f"stage{stage_num}",
            )
            final_path, promoted = train_stage(
                config, stage_num, timesteps, args.num_envs,
                checkpoint, args.node, args.simulate, checkpoint_dir,
            )
            checkpoint = final_path
            if not promoted:
                print(f"\n  Stage {stage_num}: promotion threshold not reached. Stopping.")
                break
            print(f"\n  Promoted to stage {stage_num + 1}!")
    else:
        checkpoint_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "checkpoints", f"stage{args.stage}",
        )
        train_stage(
            config, args.stage, timesteps, args.num_envs,
            args.checkpoint, args.node, args.simulate, checkpoint_dir,
        )


if __name__ == "__main__":
    main()
