"""Export a trained SB3 PPO model to ONNX format for browser inference.

The exported model takes a (1, 36) float32 observation and produces
(1, 12) float32 logits: 10 movement logits + 2 fire logits.

Browser inference (ai-neural.js) splits these as:
  - Movement: argmax(logits[:10])
  - Fire: argmax(logits[10:12])  (equivalent to sigmoid > 0.5)

Usage:
    python training/export_onnx.py --checkpoint training/checkpoints/stage1/final.zip
    python training/export_onnx.py --checkpoint path/to/model.zip --output models/policy.onnx
"""

import argparse
import os
import sys

import numpy as np
import torch
import torch.nn as nn


OBSERVATION_SIZE = 36
OUTPUT_SIZE = 12  # 10 movement + 2 fire


class PolicyWrapper(nn.Module):
    """Wraps the SB3 policy network into a single forward pass module.

    Takes raw observation, runs through features_extractor and mlp_extractor,
    then through the action_net to produce 12 logits (10 movement + 2 fire).
    """

    def __init__(self, policy):
        super().__init__()
        self.features_extractor = policy.features_extractor
        self.mlp_extractor = policy.mlp_extractor
        self.action_net = policy.action_net

    def forward(self, obs):
        features = self.features_extractor(obs)
        latent_pi, _ = self.mlp_extractor(features)
        logits = self.action_net(latent_pi)
        return logits


def export_onnx(checkpoint_path, output_path):
    """Load an SB3 PPO model and export its policy to ONNX."""
    from stable_baselines3 import PPO

    print(f"Loading checkpoint: {checkpoint_path}")
    model = PPO.load(checkpoint_path)
    policy = model.policy

    # Wrap the policy for clean export
    wrapper = PolicyWrapper(policy)
    wrapper.eval()

    # Dummy input for tracing
    dummy_input = torch.randn(1, OBSERVATION_SIZE)

    # Verify output shape before export
    with torch.no_grad():
        test_output = wrapper(dummy_input)
    print(f"Policy output shape: {test_output.shape}")

    if test_output.shape[1] != OUTPUT_SIZE:
        print(f"WARNING: Expected output size {OUTPUT_SIZE}, got {test_output.shape[1]}")
        print("  This may happen if the action space doesn't match MultiDiscrete([10, 2])")

    # Export to ONNX
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    torch.onnx.export(
        wrapper,
        dummy_input,
        output_path,
        input_names=["observation"],
        output_names=["logits"],
        dynamic_axes={
            "observation": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
        opset_version=17,
    )
    print(f"ONNX model exported: {output_path}")

    # Validate with onnx checker
    import onnx

    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX checker: model is valid")

    # Validate with onnxruntime inference
    import onnxruntime as ort

    session = ort.InferenceSession(output_path)
    input_name = session.get_inputs()[0].name
    sample_obs = np.random.uniform(-1, 1, (1, OBSERVATION_SIZE)).astype(np.float32)
    outputs = session.run(None, {input_name: sample_obs})
    logits = outputs[0]

    print(f"ORT inference output shape: {logits.shape}")
    print(f"Sample logits: {logits[0][:5]}... (first 5 of {logits.shape[1]})")

    # Demonstrate action selection
    move_logits = logits[0][:10]
    fire_logits = logits[0][10:12]
    move_action = int(np.argmax(move_logits))
    fire_action = int(np.argmax(fire_logits))
    print(f"Sample action: move={move_action}, fire={fire_action}")

    file_size = os.path.getsize(output_path)
    print(f"File size: {file_size / 1024:.1f} KB")


def parse_args():
    parser = argparse.ArgumentParser(description="Export SB3 PPO model to ONNX")
    parser.add_argument("--checkpoint", type=str, required=True,
                        help="Path to SB3 model checkpoint (.zip)")
    parser.add_argument("--output", type=str, default=None,
                        help="Output ONNX file path (default: models/policy.onnx)")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.output:
        output_path = args.output
    else:
        output_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "models", "policy.onnx",
        )

    export_onnx(args.checkpoint, output_path)


if __name__ == "__main__":
    main()
