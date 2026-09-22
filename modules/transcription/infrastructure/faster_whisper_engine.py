import base64
from typing import Any

import httpx
import numpy as np
from loguru import logger

from core.config.stt import stt_settings


class FasterWhisperEngine:
    """
    High-throughput Remote GPU ASR Client for Faster-Whisper (Whisper large-v3).
    Delegates all audio transcription to dedicated GPU microservice (100% GPU-only).
    """

    HALLUCINATION_PHRASES = {
        "chúng ta cùng trao đổi công việc",
        "chúng ta cùng trao đổi",
        "trao đổi công việc",
        "thảo luận báo cáo",
        "cập nhật tiến độ",
        "chia sẻ màn hình",
        "xử lý các vấn đề kỹ thuật",
        "chào mọi người, đây là cuộc họp",
        "chào mọi người",
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

    DEFAULT_PROMPT = "Cuộc họp trực tuyến, báo cáo tiến độ, dự án Meetly."

    def __init__(self) -> None:
        self.service_url = stt_settings.stt_service_url.rstrip("/")
        self.timeout_s = stt_settings.stt_remote_timeout_s
        self._http_client: httpx.AsyncClient | None = None
        if not self.service_url:
            raise ValueError("[ASR] No Remote GPU ASR Service URL configured.")

    @property
    def is_busy(self) -> bool:
        """Remote GPU handles concurrent requests with its own queue."""
        return False

    def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                base_url=self.service_url,
                timeout=httpx.Timeout(self.timeout_s, connect=2.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return self._http_client

    def _is_hallucination(self, text: str) -> bool:
        """Detect Whisper YouTube/silence/prompt hallucinations."""
        clean = text.strip().lower().rstrip(".,!?")
        if not clean:
            return True
        if clean in self.HALLUCINATION_PHRASES:
            return True
        for phrase in self.HALLUCINATION_PHRASES:
            if phrase in clean and len(clean) < len(phrase) + 30:
                return True
        return False

    async def transcribe_samples(
        self,
        samples_pcm16: np.ndarray,
        language: str = "vi",
        beam_size: int = 1,
        word_timestamps: bool = False,
        initial_prompt: str | None = None,
    ) -> tuple[str, list[dict[str, Any]], float]:
        """
        Pure Remote GPU ASR Inference.
        Sends audio samples to dedicated GPU ASR service via high-performance HTTP Keep-Alive.
        """
        if len(samples_pcm16) < 3200:
            return "", [], 1.0

        # Fast Energy / Silence Gate: If audio is silence or background noise floor, return empty string
        if samples_pcm16.dtype == np.int16:
            rms = float(
                np.sqrt(np.mean((samples_pcm16.astype(np.float32) / 32768.0) ** 2))
            )
        else:
            rms = float(np.sqrt(np.mean(samples_pcm16.astype(np.float32) ** 2)))

        if rms < 0.002:
            return "", [], 1.0

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
                    "initial_prompt": initial_prompt or self.DEFAULT_PROMPT,
                },
            )
            if response.status_code == 200:
                data = response.json()
                text = data.get("text", "").strip()
                if self._is_hallucination(text):
                    return "", [], 1.0
                words = data.get("words", [])
                confidence = data.get("confidence", 1.0)
                return text, words, confidence
            else:
                logger.warning(
                    f"[ASR] Remote GPU ASR returned status {response.status_code}: {response.text}"
                )
                return "", [], 1.0
        except Exception as e:
            logger.error(f"[ASR] Remote GPU ASR request failed ({e})")
            return "", [], 1.0
