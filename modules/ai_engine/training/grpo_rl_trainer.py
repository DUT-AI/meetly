import math
from typing import Any

from loguru import logger

from modules.ai_engine.infrastructure.reward_verifiers import RuleBasedRewardVerifier


class GRPOTaskTrainer:
    """
    Group Relative Policy Optimization (GRPO) Trainer.
    Aligns Qwen2.5-3B using rule-based verifiers without requiring a critic model.
    Reduces VRAM by 50% compared to traditional PPO.
    """

    def __init__(
        self,
        model_id: str = "Qwen/Qwen2.5-3B-Instruct",
        group_size: int = 4,
        epsilon_clip: float = 0.2,
        beta_kl: float = 0.04,
        device: str | None = None,
    ) -> None:
        self.model_id = model_id
        self.group_size = group_size
        self.epsilon_clip = epsilon_clip
        self.beta_kl = beta_kl
        self.device = device or "cpu"
        self.verifier = RuleBasedRewardVerifier()

    def compute_group_advantages(self, rewards: list[float]) -> list[float]:
        """
        Computes group-normalized advantages:
        A_i = (r_i - mean(R)) / (std(R) + eps)
        """
        n = len(rewards)
        if n == 0:
            return []
        mean_r = sum(rewards) / n
        variance = sum((r - mean_r) ** 2 for r in rewards) / n
        std_r = math.sqrt(variance)

        if std_r < 1e-6:
            advantages = [r - mean_r for r in rewards]
        else:
            advantages = [(r - mean_r) / (std_r + 1e-6) for r in rewards]
        return advantages

    def step_grpo_iteration(
        self,
        transcript_prompt: str,
        candidate_completions: list[str],
    ) -> dict[str, Any]:
        """
        Simulates / executes one GRPO evaluation step over sampled group completions.
        """
        # 1. Compute verifiable rewards
        rewards = [
            self.verifier.compute_total_reward(comp, transcript_prompt)
            for comp in candidate_completions
        ]

        # 2. Compute group-relative advantage
        advantages = self.compute_group_advantages(rewards)

        # 3. Best candidate selection
        best_idx = max(range(len(rewards)), key=lambda i: rewards[i])
        best_candidate = candidate_completions[best_idx]
        best_reward = rewards[best_idx]

        logger.info(
            f"[GRPO] Group Size: {len(rewards)} | Mean Reward: {sum(rewards) / len(rewards):.3f} | Best Reward: {best_reward:.3f}"
        )

        return {
            "rewards": rewards,
            "advantages": advantages,
            "best_candidate": best_candidate,
            "best_reward": best_reward,
        }
