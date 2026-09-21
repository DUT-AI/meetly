import asyncio
import base64
import os
import threading
from typing import Any
import httpx
import numpy as np
from loguru import logger

# Ensure fast and reliable HuggingFace downloads in Vietnam
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

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
        self._is_loading = True
        self._load_event = threading.Event()
        self._lock = asyncio.Lock()
        self._http_client: httpx.AsyncClient | None = None
        self._init_model()

    @property
    def is_busy(self) -> bool:
        """Check whether an inference task is currently holding the model lock."""
        return self._lock.locked()

    def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                base_url=stt_settings.stt_service_url.rstrip("/"),
                timeout=httpx.Timeout(stt_settings.stt_remote_timeout_s, connect=1.5),
            )
        return self._http_client

    def _init_model(self) -> None:
        """Resolve device/compute_type and start loading weights in a background thread."""
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

        # Normalize model ID for faster-whisper CTranslate2
        model_name = self.model_id
        alias_map = {
            "openai/whisper-tiny": "tiny",
            "whisper-tiny": "tiny",
            "openai/whisper-base": "base",
            "whisper-base": "base",
            "openai/whisper-small": "small",
            "whisper-small": "small",
            "openai/whisper-medium": "medium",
            "whisper-medium": "medium",
            "openai/whisper-large-v3": "large-v3",
            "whisper-large-v3": "large-v3",
        }
        model_name = alias_map.get(model_name, model_name)

        threading.Thread(
            target=self._load_weights,
            args=(model_name, device, compute_type),
            daemon=True,
            name="FasterWhisperLoader",
        ).start()

    def _load_weights(self, model_name: str, device: str, compute_type: str) -> None:
        logger.info(
            f"[ASR] Loading FasterWhisperEngine in background: model={model_name}, device={device}, compute_type={compute_type}"
        )
        try:
            from faster_whisper import WhisperModel

            # Optimize CPU threads to prevent thread contention on low-spec CPUs
            cpu_threads = min(4, os.cpu_count() or 4) if device == "cpu" else 0

            self.model = WhisperModel(
                model_name,
                device=device,
                compute_type=compute_type,
                cpu_threads=cpu_threads,
            )
            logger.info(f"[ASR] Successfully loaded WhisperModel weights (device={device}, cpu_threads={cpu_threads}).")
        except Exception as e:
            logger.warning(
                f"[ASR] Could not initialize faster-whisper WhisperModel ({e}). Using mock/fallback for test mode."
            )
            self.model = None
        finally:
            self._is_loading = False
            self._load_event.set()

    HALLUCINATION_PHRASES = {
        "hãy subscribe và like and subscribe",
        "hãy subscribe",
        "like and subscribe",
        "like và subscribe",
        "hãy like và subscribe",
        "hãy like và đăng ký",
        "cảm ơn các bạn đã theo dõi",
        "cảm ơn các bạn đã xem video",
        "cảm ơn quý vị và các bạn",
        "hãy đăng ký kênh",
        "hãy nhìn nhìn ăn cháu",
        "hãy like, share và subscribe",
        "subscribe",
    }

    def _is_hallucination(self, text: str) -> bool:
        """Detect Whisper YouTube/silence hallucinations."""
        clean = text.strip().lower().rstrip(".,!?")
        if not clean:
            return True
        if clean in self.HALLUCINATION_PHRASES:
            return True
        for phrase in self.HALLUCINATION_PHRASES:
            if phrase in clean and len(clean) < len(phrase) + 15:
                return True
        return False

    def _sync_transcribe(
        self,
        audio_float32: np.ndarray,
        language: str = "vi",
        beam_size: int = 1,
        word_timestamps: bool = False,
        initial_prompt: str | None = None,
        without_timestamps: bool | None = None,
    ) -> tuple[str, list[dict[str, Any]], float]:
        """Synchronous decoding called inside a worker thread."""
        if len(audio_float32) < 3200:  # Less than 200ms audio
            return "", [], 1.0

        # Energy filter: if audio is near-silence or noise floor, skip Whisper entirely
        rms = float(np.sqrt(np.mean(audio_float32**2)))
        if rms < 0.002:  # Safe low threshold: only drop pure silence
            return "", [], 1.0

        if self.model is None:
            if self._is_loading:
                # Wait briefly if model is just finishing downloading
                self._load_event.wait(timeout=2.0)
            if self.model is None:
                return "", [], 1.0

        prompt = (
            initial_prompt
            or "Chào mọi người, đây là cuộc họp trực tuyến của dự án Meetly. Chúng ta cùng trao đổi công việc, thảo luận báo cáo, cập nhật tiến độ, chia sẻ màn hình và xử lý các vấn đề kỹ thuật."
        )
        skip_timestamps = (not word_timestamps) if without_timestamps is None else without_timestamps

        try:
            segments, info = self.model.transcribe(
                audio_float32,
                language=language,
                task="transcribe",
                beam_size=beam_size,
                best_of=1,
                temperature=0.0,
                condition_on_previous_text=False,
                initial_prompt=prompt,
                repetition_penalty=1.1,
                no_repeat_ngram_size=3,
                no_speech_threshold=0.5,
                log_prob_threshold=-1.0,
                compression_ratio_threshold=2.4,
                hallucination_silence_threshold=2.0,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=400, threshold=0.35, min_speech_duration_ms=200),
                word_timestamps=word_timestamps,
                without_timestamps=skip_timestamps,
            )
        except Exception as e:
            logger.warning(f"[ASR] Error during model.transcribe: {e}")
            return "", [], 1.0

        full_text_parts = []
        words_list: list[dict[str, Any]] = []

        for seg in segments:
            # Drop segments with high silence probability
            if getattr(seg, "no_speech_prob", 0.0) > 0.5:
                continue

            text = seg.text.strip()
            if not text or self._is_hallucination(text):
                continue

            full_text_parts.append(text)
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
        initial_prompt: str | None = None,
        without_timestamps: bool | None = None,
    ) -> tuple[str, list[dict[str, Any]], float]:
        """
        Non-blocking async wrapper with strict concurrency lock.
        Prevents CPU thread contention and queuing delays.
        """
        if len(samples_pcm16) < 3200:
            return "", [], 1.0

        # 1. Try Remote GPU ASR (Whisper large-v3) if enabled
        if stt_settings.stt_remote_enabled and stt_settings.stt_service_url:
            try:
                if samples_pcm16.dtype == np.int16:
                    pcm_bytes = samples_pcm16.tobytes()
                else:
                    pcm16 = (np.clip(samples_pcm16, -1.0, 1.0) * 32767).astype(np.int16)
                    pcm_bytes = pcm16.tobytes()

                b64_audio = base64.b64encode(pcm_bytes).decode("ascii")
                client = self._get_http_client()
                response = await client.post(
                    "/api/v1/asr/transcribe",
                    json={
                        "audio_base64": b64_audio,
                        "language": language,
                        "beam_size": beam_size,
                        "word_timestamps": word_timestamps,
                        "initial_prompt": initial_prompt,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    text = data.get("text", "")
                    words = data.get("words", [])
                    confidence = data.get("confidence", 1.0)
                    return text, words, confidence
                else:
                    logger.debug(f"[ASR] Remote service HTTP {response.status_code}, falling back to local CPU")
            except Exception as e:
                logger.debug(f"[ASR] Remote GPU ASR error/timeout ({e}), falling back to local CPU")

        # 2. Local CPU Fallback
        if samples_pcm16.dtype != np.float32:
            audio_float32 = samples_pcm16.astype(np.float32) / 32768.0
        else:
            audio_float32 = samples_pcm16

        async with self._lock:
            return await asyncio.to_thread(
                self._sync_transcribe,
                audio_float32,
                language=language,
                beam_size=beam_size,
                word_timestamps=word_timestamps,
                initial_prompt=initial_prompt,
                without_timestamps=without_timestamps,
            )
