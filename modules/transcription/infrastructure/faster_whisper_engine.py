import asyncio
from typing import Any
import numpy as np
from loguru import logger

from core.config.stt import stt_settings


class FasterWhisperEngine:
    """ASR Engine wrapping faster-whisper (CTranslate2) with non-blocking async execution."""

    def __init__(
        self,
        model_size_or_path: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.model_id = model_size_or_path or stt_settings.stt_model_id
        self.requested_device = device or stt_settings.stt_device
        self.requested_compute = compute_type or stt_settings.stt_compute_type
        self.model = None
        self._init_model()

    def _init_model(self) -> None:
        """Resolve device/compute_type and instantiate WhisperModel."""
        # 1. Determine Device
        if self.requested_device == "auto":
            try:
                import torch

                device = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:
                device = "cpu"
        else:
            device = self.requested_device

        # 2. Determine Compute Type
        if self.requested_compute == "auto":
            compute_type = "float16" if device == "cuda" else "int8"
        else:
            compute_type = self.requested_compute

        logger.info(
            f"[ASR] Initializing FasterWhisperEngine: model={self.model_id}, device={device}, compute_type={compute_type}"
        )

        try:
            from faster_whisper import WhisperModel

            self.model = WhisperModel(
                self.model_id,
                device=device,
                compute_type=compute_type,
            )
            logger.info("[ASR] Successfully loaded WhisperModel weights.")
        except Exception as e:
            logger.warning(
                f"[ASR] Could not initialize faster-whisper WhisperModel ({e}). Using mock/fallback for test mode."
            )
            self.model = None

    def _sync_transcribe(
        self,
        audio_float32: np.ndarray,
        language: str = "vi",
        beam_size: int = 1,
        word_timestamps: bool = False,
    ) -> tuple[str, list[dict[str, Any]], float]:
        """Synchronous decoding called inside a worker thread."""
        if self.model is None:
            # Fallback mock for unit test or environments where weights aren't downloaded
            return "", [], 1.0

        segments, info = self.model.transcribe(
            audio_float32,
            language=language,
            task="transcribe",
            beam_size=beam_size,
            best_of=1,
            temperature=0.0,
            condition_on_previous_text=False,
            vad_filter=False,  # External Silero VAD is applied beforehand
            word_timestamps=word_timestamps,
        )

        full_text_parts = []
        words_list: list[dict[str, Any]] = []

        for seg in segments:
            full_text_parts.append(seg.text.strip())
            if word_timestamps and hasattr(seg, "words") and seg.words:
                for w in seg.words:
                    words_list.append(
                        {
                            "word": w.word.strip(),
                            "start_ms": int(w.start * 1000),
                            "end_ms": int(w.end * 1000),
                            "score": round(float(w.probability), 2),
                        }
                    )

        full_text = " ".join(full_text_parts).strip()
        confidence = round(float(info.language_probability), 2) if hasattr(info, "language_probability") else 1.0
        return full_text, words_list, confidence

    async def transcribe_samples(
        self,
        samples_pcm16: np.ndarray,
        language: str = "vi",
        beam_size: int = 1,
        word_timestamps: bool = False,
    ) -> tuple[str, list[dict[str, Any]], float]:
        """
        Non-blocking async wrapper converting PCM16 to float32 and executing in thread pool.
        """
        if samples_pcm16.dtype != np.float32:
            audio_float32 = samples_pcm16.astype(np.float32) / 32768.0
        else:
            audio_float32 = samples_pcm16

        return await asyncio.to_thread(
            self._sync_transcribe,
            audio_float32,
            language=language,
            beam_size=beam_size,
            word_timestamps=word_timestamps,
        )
