"""
AI Engine Module - Domain Interfaces.
Clean Architecture contracts for Task Extraction, Verifiable Rewards, and Training.
"""

from abc import ABC, abstractmethod
from typing import Any

from modules.ai_engine.domain.entities import (
    BenchmarkMetric,
    TaskExtractionResult,
)


class ITaskExtractor(ABC):
    """Contract for Meeting Task Extraction models."""

    @abstractmethod
    def extract_tasks(self, transcript_text: str) -> TaskExtractionResult:
        """Extracts structured tasks from raw or speaker-labeled meeting transcript."""

    @abstractmethod
    def is_ready(self) -> bool:
        """Checks if inference weights and tokenizer are ready."""


class IRewardVerifier(ABC):
    """
    Contract for Rule-based Verifiers in Reinforcement Learning (GRPO/GSPO).
    Computes verifiable rewards for model candidate outputs.
    """

    @abstractmethod
    def compute_format_reward(self, completion: str) -> float:
        """Evaluates strict JSON schema adherence (+1.0 for valid JSON matching schema)."""

    @abstractmethod
    def compute_entity_reward(self, completion: str, transcript: str) -> float:
        """Evaluates assignee existence and valid action verb in title."""

    @abstractmethod
    def compute_grounding_reward(self, completion: str, transcript: str) -> float:
        """Penalizes hallucinated tasks not present in source transcript."""

    @abstractmethod
    def compute_total_reward(self, completion: str, transcript: str) -> float:
        """Weighted sum of verifiable rewards."""


class IModelTrainer(ABC):
    """Contract for training pipelines (SFT, LoRA, GRPO)."""

    @abstractmethod
    def train(self, config: dict[str, Any]) -> str:
        """Executes training stage and returns path to output checkpoint/adapter."""


class IBenchmarkEvaluator(ABC):
    """Contract for model benchmarking and ablation studies."""

    @abstractmethod
    def evaluate(self, model_id: str, test_dataset_path: str) -> BenchmarkMetric:
        """Evaluates model performance and returns metrics."""
