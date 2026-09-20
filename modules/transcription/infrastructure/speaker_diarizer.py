"""
Speaker Diarization Infrastructure Module for Meetly.

Architecture:
1. Voice Activity Detection: Silero-VAD slicing of active speech chunks.
2. Voice Embedding Extraction: SpeechBrain ECAPA-TDNN (192-dim normalized vector).
3. Clustering: Agglomerative Hierarchical Clustering (AHC) using Cosine distance.
4. Voice Profile Bank: Enrolling known member voices to recognize named speakers.
5. Alignment: Temporal overlap mapping between ASR transcript segments and diarized turns.
"""

from pathlib import Path
from typing import Any
import warnings
from loguru import logger
import numpy as np
import scipy.spatial.distance

from modules.transcription.domain.interfaces import (
    DiarizationTurn,
    ISpeakerDiarizationEngine,
)

# Suppress external library warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


class SpeakerEmbeddingExtractor:
    """Extracts 192-dimensional acoustic voice embeddings."""

    def __init__(
        self,
        model_source: str = "speechbrain/spkrec-ecapa-voxceleb",
        device: str = "cpu",
        cache_dir: str | None = None,
    ) -> None:
        self.model_source = model_source
        self.device = device
        self.cache_dir = cache_dir or str(Path.home() / ".cache" / "meetly_speechbrain")
        self.classifier = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self) -> None:
        """Load SpeechBrain ECAPA-TDNN model with graceful fallback."""
        try:
            from speechbrain.inference.speaker import EncoderClassifier

            self.classifier = EncoderClassifier.from_hparams(
                source=self.model_source,
                savedir=self.cache_dir,
                run_opts={"device": self.device},
            )
            self.is_loaded = True
            logger.info("[Diarization] SpeechBrain ECAPA-TDNN loaded successfully.")
        except Exception as e:
            logger.warning(f"[Diarization] SpeechBrain loading fallback: {e}")
            self.classifier = None
            self.is_loaded = False

    def extract_embedding(self, audio_data: np.ndarray, sr: int = 16000) -> np.ndarray:
        """
        Extract L2-normalized 192-dim embedding vector from mono 16kHz audio.
        Returns: numpy float32 array of shape (192,).
        """
        if len(audio_data) < 160:  # Less than 10ms
            return np.zeros(192, dtype=np.float32)

        if self.is_loaded and self.classifier is not None:
            try:
                import torch

                wav_tensor = (
                    torch.from_numpy(audio_data).float().unsqueeze(0).to(self.device)
                )
                with torch.no_grad():
                    emb = self.classifier.encode_batch(wav_tensor)
                    emb_np = emb.squeeze().cpu().numpy().astype(np.float32)
                    norm = float(np.linalg.norm(emb_np))
                    if norm > 1e-8:
                        emb_np = emb_np / norm
                    return emb_np
            except Exception as e:
                logger.debug(f"[Diarization] Torch encode error, using spectral fallback: {e}")

        return self._fallback_spectral_embedding(audio_data, sr)

    def _fallback_spectral_embedding(self, audio_data: np.ndarray, sr: int) -> np.ndarray:
        """Fallback spectral descriptor if neural model is unavailable."""
        fft = np.abs(np.fft.rfft(audio_data, n=384))
        vec = fft[:192].astype(np.float32)
        norm = float(np.linalg.norm(vec))
        if norm > 1e-8:
            vec = vec / norm
        return vec


class DiarizationClusterer:
    """Clusters voice embeddings using Agglomerative Hierarchical Clustering (AHC)."""

    def __init__(self, distance_threshold: float = 0.45) -> None:
        self.distance_threshold = distance_threshold

    def cluster(
        self,
        embeddings: list[np.ndarray],
        num_speakers: int | None = None,
    ) -> list[int]:
        """
        Assigns cluster labels 0, 1, ... to each input embedding vector.
        """
        n_samples = len(embeddings)
        if n_samples == 0:
            return []
        if n_samples == 1:
            return [0]

        X = np.array(embeddings, dtype=np.float32)

        # Normalize rows to unit sphere
        norms = np.linalg.norm(X, axis=1, keepdims=True)
        norms[norms < 1e-8] = 1.0
        X = X / norms

        if num_speakers == 1:
            return [0] * n_samples

        try:
            from sklearn.cluster import AgglomerativeClustering

            if num_speakers is not None and num_speakers > 1:
                n_clusters = min(num_speakers, n_samples)
                ahc = AgglomerativeClustering(
                    n_clusters=n_clusters,
                    metric="cosine",
                    linkage="average",
                )
            else:
                ahc = AgglomerativeClustering(
                    n_clusters=None,
                    distance_threshold=self.distance_threshold,
                    metric="cosine",
                    linkage="average",
                )
            return [int(l) for l in ahc.fit_predict(X)]
        except Exception as e:
            logger.warning(f"[Diarization] sklearn AHC error: {e}, using simple cosine grouping")
            labels = [0] * n_samples
            current_label = 0
            centroids = [X[0]]

            for i in range(1, n_samples):
                dists = [scipy.spatial.distance.cosine(X[i], c) for c in centroids]
                min_dist = min(dists)
                if min_dist < self.distance_threshold:
                    labels[i] = dists.index(min_dist)
                else:
                    current_label += 1
                    labels[i] = current_label
                    centroids.append(X[i])
            return labels


class SpeakerDiarizer(ISpeakerDiarizationEngine):
    """Production Speaker Diarization Engine for Meetly."""

    def __init__(
        self,
        vad_threshold: float = 0.4,
        distance_threshold: float = 0.45,
        min_speech_duration_s: float = 0.4,
        max_segment_duration_s: float = 6.0,
        device: str = "cpu",
    ) -> None:
        self.vad_threshold = vad_threshold
        self.distance_threshold = distance_threshold
        self.min_speech_duration_s = min_speech_duration_s
        self.max_segment_duration_s = max_segment_duration_s
        self.device = device

        self.embedding_extractor = SpeakerEmbeddingExtractor(device=device)
        self.clusterer = DiarizationClusterer(distance_threshold=distance_threshold)
        self.voice_profiles: dict[str, np.ndarray] = {}

    def enroll_voice_profile(self, speaker_name: str, embedding: np.ndarray) -> None:
        """Enroll or update a member's voice profile embedding."""
        norm = float(np.linalg.norm(embedding))
        if norm > 1e-8:
            self.voice_profiles[speaker_name] = (embedding / norm).astype(np.float32)

    register_voice_profile = enroll_voice_profile

    def diarize(
        self,
        audio_pcm: np.ndarray,
        sample_rate: int = 16000,
        expected_speakers: int | None = None,
    ) -> list[DiarizationTurn]:
        """
        Execute end-to-end speaker diarization from a 16kHz mono audio array.
        Accepts float32 [-1.0, 1.0] or int16 [-32768, 32767].
        Returns: list of DiarizationTurn objects with start_ms, end_ms, and speaker name.
        """
        # Ensure float32 array in range [-1.0, 1.0]
        if audio_pcm.dtype == np.int16:
            audio_data = (audio_pcm.astype(np.float32) / 32768.0)
        else:
            audio_data = audio_pcm.astype(np.float32)

        duration_ms = int(len(audio_data) / sample_rate * 1000)

        # 1. Voice Activity Detection using energy/threshold or Silero VAD
        raw_segments = self._detect_speech_segments(audio_data, sample_rate)

        if not raw_segments:
            return [
                DiarizationTurn(
                    turn_id=0,
                    start_ms=0,
                    end_ms=duration_ms,
                    speaker="Speaker 1",
                    confidence=1.0,
                )
            ]

        # 2. Slice audio into chunks suitable for embedding extraction
        chunks = []
        for seg in raw_segments:
            s_sec = seg["start_s"]
            e_sec = seg["end_s"]
            dur = e_sec - s_sec

            if dur < self.min_speech_duration_s:
                continue

            if dur > self.max_segment_duration_s:
                curr = s_sec
                while curr < e_sec:
                    nxt = min(curr + 3.0, e_sec)
                    s_idx = int(curr * sample_rate)
                    e_idx = int(nxt * sample_rate)
                    chunk_audio = audio_data[s_idx:e_idx]
                    if len(chunk_audio) >= int(self.min_speech_duration_s * sample_rate):
                        chunks.append({"start_ms": int(curr * 1000), "end_ms": int(nxt * 1000), "audio": chunk_audio})
                    curr += 2.0
            else:
                s_idx = int(s_sec * sample_rate)
                e_idx = int(e_sec * sample_rate)
                chunks.append({"start_ms": int(s_sec * 1000), "end_ms": int(e_sec * 1000), "audio": audio_data[s_idx:e_idx]})

        if not chunks:
            return [
                DiarizationTurn(
                    turn_id=0,
                    start_ms=0,
                    end_ms=duration_ms,
                    speaker="Speaker 1",
                    confidence=1.0,
                )
            ]

        # 3. Extract voice embeddings
        embeddings = [
            self.embedding_extractor.extract_embedding(c["audio"], sr=sample_rate)
            for c in chunks
        ]

        # 4. Cluster speaker embeddings
        labels = self.clusterer.cluster(embeddings, num_speakers=expected_speakers)

        # 5. Resolve speaker names against Voice Profile Bank
        unique_labels = sorted(list(set(labels)))
        speaker_map: dict[int, str] = {}

        for label in unique_labels:
            cluster_embs = [embeddings[i] for i, l in enumerate(labels) if l == label]
            centroid = np.mean(cluster_embs, axis=0)
            norm = float(np.linalg.norm(centroid))
            if norm > 1e-8:
                centroid = centroid / norm

            best_name = None
            best_sim = -1.0
            for prof_name, prof_emb in self.voice_profiles.items():
                sim = 1.0 - scipy.spatial.distance.cosine(centroid, prof_emb)
                if sim > best_sim:
                    best_sim = sim
                    if sim >= 0.72:
                        best_name = prof_name

            speaker_map[label] = best_name if best_name else f"Speaker {label + 1}"

        # 6. Merge adjacent same-speaker turns within 800ms silence
        merged_turns: list[DiarizationTurn] = []
        turn_id = 0

        for chunk, label in zip(chunks, labels):
            spk = speaker_map[label]
            c_start = chunk["start_ms"]
            c_end = chunk["end_ms"]

            if merged_turns and merged_turns[-1].speaker == spk and (c_start - merged_turns[-1].end_ms) < 800:
                merged_turns[-1].end_ms = c_end
            else:
                merged_turns.append(
                    DiarizationTurn(
                        turn_id=turn_id,
                        start_ms=c_start,
                        end_ms=c_end,
                        speaker=spk,
                        confidence=0.95,
                    )
                )
                turn_id += 1

        return merged_turns

    def _detect_speech_segments(
        self, audio: np.ndarray, sr: int
    ) -> list[dict[str, float]]:
        """Silero-VAD with energy-based fallback."""
        try:
            import torch

            model, utils = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                onnx=False,
            )
            (get_speech_timestamps, _, _, _, _) = utils
            wav_tensor = torch.from_numpy(audio).float()
            ts = get_speech_timestamps(
                wav_tensor,
                model,
                sampling_rate=sr,
                threshold=self.vad_threshold,
                return_seconds=True,
            )
            return [{"start_s": float(t["start"]), "end_s": float(t["end"])} for t in ts]
        except Exception:
            # Fallback energy-based segmentation
            segments = []
            frame_size = int(sr * 0.05)  # 50ms
            energy = np.array([
                np.mean(audio[i : i + frame_size] ** 2)
                for i in range(0, len(audio), frame_size)
            ])
            thresh = np.mean(energy) * 0.5 + 1e-5
            is_speech = energy > thresh

            in_seg = False
            start_f = 0
            for idx, active in enumerate(is_speech):
                if active and not in_seg:
                    in_seg = True
                    start_f = idx
                elif not active and in_seg:
                    in_seg = False
                    segments.append({
                        "start_s": start_f * 0.05,
                        "end_s": idx * 0.05,
                    })
            if in_seg:
                segments.append({
                    "start_s": start_f * 0.05,
                    "end_s": len(is_speech) * 0.05,
                })
            return segments


def align_segments_with_diarization(
    segments: list[Any],
    turns: list[DiarizationTurn],
) -> list[tuple[str, str]]:
    """
    Match database transcript segments with diarized turns based on temporal overlap in milliseconds.
    Returns: list of (segment_id, resolved_speaker_label).
    """
    if not turns:
        return [(getattr(s, "id", s.get("id")), "Speaker 1") for s in segments]

    updates = []
    for seg in segments:
        seg_id = getattr(seg, "id", None) or seg.get("id")
        s_start = getattr(seg, "start_ms", None) if hasattr(seg, "start_ms") else seg.get("start_ms", 0)
        s_end = getattr(seg, "end_ms", None) if hasattr(seg, "end_ms") else seg.get("end_ms", 0)

        best_spk = "Speaker 1"
        max_overlap = -1

        for turn in turns:
            overlap_start = max(s_start, turn.start_ms)
            overlap_end = min(s_end, turn.end_ms)
            overlap = max(0, overlap_end - overlap_start)

            if overlap > max_overlap:
                max_overlap = overlap
                best_spk = turn.speaker

        if max_overlap <= 0:
            mid = (s_start + s_end) / 2.0
            closest = min(turns, key=lambda t: abs((t.start_ms + t.end_ms) / 2.0 - mid))
            best_spk = closest.speaker

        updates.append((seg_id, best_spk))

    return updates
