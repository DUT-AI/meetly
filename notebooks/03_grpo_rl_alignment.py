"""
Meetly - Reinforcement Learning via GRPO Alignment.
Post-training optimization for Qwen2.5-3B-Instruct using verifiable rule-based rewards.
Demonstrates Group Relative Policy Optimization (GRPO) for Meeting Task Extraction.
"""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from modules.ai_engine.infrastructure.reward_verifiers import RuleBasedRewardVerifier
from modules.ai_engine.training.grpo_rl_trainer import GRPOTaskTrainer


def run_grpo_alignment_demo():
    print("=== Meetly GRPO (Group Relative Policy Optimization) Alignment Demo ===")
    trainer = GRPOTaskTrainer(group_size=4)
    verifier = RuleBasedRewardVerifier()

    transcript = (
        "[00:03:10] Nguyễn Hoàng Minh: Phước ơi, cập nhật API authentication rồi deploy lên staging trước thứ Sáu nhé.\n"
        "[00:03:25] Đặng Quốc Phước: Dạ vâng anh Minh, thứ Năm em hoàn thành."
    )

    # 4 candidate outputs representing different alignment behaviors in group sampling
    candidates = [
        # Candidate 1: Hallucinated person not in meeting, no JSON schema
        "Chúng ta cần sửa API và bạn An sẽ làm việc này.",
        # Candidate 2: Valid JSON but wrong assignee (assigns to Minh instead of Phuoc)
        '[{"task_title": "Cập nhật API authentication", "assignee": "Nguyễn Hoàng Minh", "deadline": "thứ Sáu"}]',
        # Candidate 3: Valid JSON with correct assignee but weak verb
        '[{"task_title": "API authentication staging", "assignee": "Đặng Quốc Phước", "deadline": "thứ Sáu"}]',
        # Candidate 4: Optimal aligned output (Correct verb, Assignee=Phuoc, Deadline=Thứ Năm)
        '[{"task_title": "Cập nhật API authentication và deploy lên staging", "assignee": "Đặng Quốc Phước", "deadline": "Thứ Năm", "source_timestamp_ms": 190000, "confidence": 0.98}]',
    ]

    print(f"\nPrompt Transcript:\n{transcript}\n")
    print(f"Evaluating {len(candidates)} candidate completions in GRPO group...")

    step_result = trainer.step_grpo_iteration(transcript, candidates)

    for idx, (cand, r, adv) in enumerate(
        zip(candidates, step_result["rewards"], step_result["advantages"])
    ):
        print(f"\n--- Candidate #{idx + 1} ---")
        print(f"Text: {cand}")
        print(f"Format Reward:   {verifier.compute_format_reward(cand):.2f}")
        print(
            f"Entity Reward:   {verifier.compute_entity_reward(cand, transcript):.2f}"
        )
        print(
            f"Grounding Reward:{verifier.compute_grounding_reward(cand, transcript):.2f}"
        )
        print(f"==> Total Reward: {r:.4f} | Normalized Advantage: {adv:+.4f}")

    print("\n" + "=" * 60)
    print("GRPO Best Candidate Selected (Highest Advantage):")
    print(step_result["best_candidate"])
    print(f"Best Reward: {step_result['best_reward']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    run_grpo_alignment_demo()
