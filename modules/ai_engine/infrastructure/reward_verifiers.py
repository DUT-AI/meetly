"""
Rule-based Verifier for Reinforcement Learning (GRPO / GSPO Alignment).
Implements verifiable rewards for Qwen2.5-3B post-training alignment:
1. Format Reward: Strict JSON array compliance.
2. Entity Precision Reward: Valid Assignee & action verb.
3. Grounding Reward: Anti-hallucination penalty.
"""

import json
import re

from modules.ai_engine.domain.interfaces import IRewardVerifier


class RuleBasedRewardVerifier(IRewardVerifier):
    """
    Verifiable rule-based reward function for Group Relative Policy Optimization (GRPO).
    Rewards are strictly computed without neural reward models, ensuring 100% stable RL gradient.
    """

    ACTION_VERBS = (
        "kiểm tra",
        "sửa",
        "fix",
        "cập nhật",
        "update",
        "deploy",
        "triển khai",
        "viết",
        "thiết kế",
        "cấu hình",
        "config",
        "chạy",
        "tối ưu",
        "refactor",
        "review",
        "test",
        "kiểm thử",
        "tạo",
        "create",
        "nghiên cứu",
        "báo cáo",
        "đo kiểm",
        "chuẩn hóa",
        "gộp",
        "merge",
    )

    def compute_format_reward(self, completion: str) -> float:
        """
        Rewards format compliance:
        +1.0 if text is strictly a JSON array with required schema.
        +0.5 if JSON is wrapped in markdown code fence.
        -1.0 if invalid JSON.
        """
        raw = completion.strip()
        try:
            # Check direct JSON parsing
            data = json.loads(raw)
            if isinstance(data, list):
                if len(data) == 0:
                    return 0.8
                # Check schema keys
                if all(
                    all(k in item for k in ("task_title", "assignee", "deadline"))
                    for item in data
                    if isinstance(item, dict)
                ):
                    return 1.0
            return 0.2
        except Exception:
            pass

        # Try extracting markdown fence
        match = re.search(r"```(?:json)?\s*(\[\s*\{.*\}\s*\])\s*```", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                if isinstance(data, list):
                    return 0.6
            except Exception:
                pass

        return -1.0

    def compute_entity_reward(self, completion: str, transcript: str) -> float:
        """
        Rewards entity precision:
        +0.5 if all assignees appear verbatim in transcript (preventing phantom assignees).
        +0.5 if task titles start with strong action verbs.
        """
        tasks = self._extract_json_list(completion)
        if not tasks:
            return 0.0

        transcript_lower = transcript.lower()
        score = 0.0
        n_tasks = len(tasks)

        valid_assignee_count = 0
        valid_verb_count = 0

        for t in tasks:
            if not isinstance(t, dict):
                continue
            assignee = t.get("assignee", "").strip().lower()
            title = t.get("task_title", "").strip().lower()

            if assignee and assignee in transcript_lower:
                valid_assignee_count += 1
            if title and any(title.startswith(verb) for verb in self.ACTION_VERBS):
                valid_verb_count += 1

        score += (valid_assignee_count / n_tasks) * 0.5
        score += (valid_verb_count / n_tasks) * 0.5
        return score

    def compute_grounding_reward(self, completion: str, transcript: str) -> float:
        """
        Rewards grounding and penalizes hallucinated tasks whose key nouns never appear in transcript.
        Also rewards verified timestamp citations and grounded deadline entities.
        """
        tasks = self._extract_json_list(completion)
        if not tasks:
            return 0.0

        transcript_lower = transcript.lower()
        grounded_count = 0
        bonus_score = 0.0

        for t in tasks:
            if not isinstance(t, dict):
                continue
            title_words = [
                w for w in t.get("task_title", "").lower().split() if len(w) > 2
            ]
            overlap = [w for w in title_words if w in transcript_lower]
            if len(overlap) >= min(2, len(title_words)):
                grounded_count += 1

            # Audio timestamp grounding reward
            if (
                isinstance(t.get("source_timestamp_ms"), (int, float))
                and t["source_timestamp_ms"] > 0
            ):
                bonus_score += 0.2

            # Deadline grounding reward
            deadline = str(t.get("deadline", "")).lower()
            if deadline and deadline in transcript_lower:
                bonus_score += 0.1

        base = (grounded_count / len(tasks)) * 0.7 if tasks else 0.0
        return min(1.0, base + (bonus_score / len(tasks)))

    def compute_total_reward(self, completion: str, transcript: str) -> float:
        """
        Total weighted reward:
        R = 0.4 * R_format + 0.35 * R_entity + 0.25 * R_grounding
        """
        r_fmt = self.compute_format_reward(completion)
        r_ent = self.compute_entity_reward(completion, transcript)
        r_grd = self.compute_grounding_reward(completion, transcript)

        # Severe penalty for malformed format
        if r_fmt < 0:
            return -1.0

        total = 0.4 * r_fmt + 0.35 * r_ent + 0.25 * r_grd
        return round(total, 4)

    def _extract_json_list(self, text: str) -> list[dict]:
        try:
            data = json.loads(text.strip())
            return data if isinstance(data, list) else []
        except Exception:
            match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(0))
                    return data if isinstance(data, list) else []
                except Exception:
                    pass
        return []
