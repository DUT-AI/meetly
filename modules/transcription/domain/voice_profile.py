import math
from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class VoiceProfileEntity:
    """
    Domain entity for a team member's Voice Profile (Centroid Voicebank).
    Represents the acoustic signature (embedding vector) of a member.
    """

    id: str
    workspace_id: str
    user_id: str
    member_name: str
    centroid_vector: list[float]
    sample_count: int = 1
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def compute_cosine_similarity(self, query_vector: list[float]) -> float:
        """
        Computes Cosine Similarity between this voice centroid and an incoming audio embedding:
        CosineSimilarity(u, v) = (u . v) / (||u|| * ||v||)
        """
        if not self.centroid_vector or not query_vector:
            return 0.0
        if len(self.centroid_vector) != len(query_vector):
            return 0.0

        dot_product = sum(
            a * b for a, b in zip(self.centroid_vector, query_vector, strict=False)
        )
        norm_a = math.sqrt(sum(a * a for a in self.centroid_vector))
        norm_b = math.sqrt(sum(b * b for b in query_vector))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return max(-1.0, min(1.0, dot_product / (norm_a * norm_b)))

    def update_centroid(self, new_sample_vector: list[float]) -> None:
        """
        Incremental Online Learning: Updates the centroid vector as new audio segments are confirmed:
        C_new = (N * C_old + E) / (N + 1)
        """
        if not new_sample_vector or len(new_sample_vector) != len(self.centroid_vector):
            return

        n = self.sample_count
        updated = [
            (c * n + s) / (n + 1)
            for c, s in zip(self.centroid_vector, new_sample_vector, strict=False)
        ]

        # Re-normalize to unit sphere
        norm = math.sqrt(sum(x * x for x in updated))
        if norm > 0:
            self.centroid_vector = [x / norm for x in updated]
        else:
            self.centroid_vector = updated

        self.sample_count += 1
        self.updated_at = datetime.now(UTC)
