"""
AI Engine Module - Domain Entities and Value Objects.
Clean Code Architecture layer for Meeting Task Extraction & Model Optimization.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class OptimizationStage(str, Enum):
    DATA_CURATION = "data_curation"
    DOMAIN_SFT = "domain_sft"
    RL_GRPO = "rl_grpo"
    QUANTIZATION = "quantization"


class AlignmentMethod(str, Enum):
    ZERO_SHOT = "zero_shot"
    FEW_SHOT = "few_shot"
    SFT_LORA = "sft_lora"
    GRPO_RL = "grpo_rl"


@dataclass
class ExtractedTask:
    task_title: str
    assignee: str
    deadline: str
    source_timestamp_ms: int = 0
    confidence: float = 1.0
    context_quote: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_title": self.task_title,
            "assignee": self.assignee,
            "deadline": self.deadline,
            "source_timestamp_ms": self.source_timestamp_ms,
            "confidence": round(self.confidence, 2),
            "context_quote": self.context_quote,
        }


@dataclass
class TaskExtractionResult:
    tasks: list[ExtractedTask] = field(default_factory=list)
    raw_response: str = ""
    is_valid_json: bool = True
    inference_time_ms: float = 0.0
    model_name: str = ""
    alignment_method: AlignmentMethod = AlignmentMethod.ZERO_SHOT


@dataclass
class BenchmarkMetric:
    model_name: str
    alignment_method: str
    title_f1: float
    assignee_f1: float
    deadline_f1: float
    overall_f1: float
    hallucination_rate: float
    json_valid_rate: float
    avg_latency_seconds: float
    vram_usage_mb: float = 0.0
