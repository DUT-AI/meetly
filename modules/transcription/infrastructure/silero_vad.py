import numpy as np
from loguru import logger

try:
    from faster_whisper.vad import get_vad_model
except ImportError:
    get_vad_model = None


class SileroVADDetector:
    """Stateful Voice Activity Detector using Silero VAD ONNX from faster-whisper."""

    def __init__(self, threshold: float = 0.4) -> None:
        self.threshold = threshold
        self._model = None
        self._init_model()

    def _init_model(self) -> None:
        """Attempt to load bundled Silero VAD ONNX model from faster-whisper."""
        if get_vad_model is not None:
            try:
                self._model = get_vad_model()
                logger.info("[VAD] Successfully initialized Silero VAD ONNX model from faster-whisper")
                return
            except Exception as e:
                logger.warning(f"[VAD] Could not load Silero VAD from faster-whisper ({e}); using energy fallback.")
                self._model = None
        else:
            logger.warning("[VAD] faster-whisper vad module not found, using energy fallback")
            self._model = None

    def reset_states(self) -> None:
        """Reset recurrent states for a new audio stream."""
        pass

    def is_speech(self, frame_pcm16: np.ndarray, sample_rate: int = 16000) -> tuple[bool, float]:
        """
        Evaluate whether a 32ms frame (512 samples at 16kHz) contains speech.
        Returns (is_speech_bool, speech_probability).
        """
        # Convert PCM16 int16 to float32 normalized in [-1.0, 1.0]
        if frame_pcm16.dtype != np.float32:
            frame_float = frame_pcm16.astype(np.float32) / 32768.0
        else:
            frame_float = frame_pcm16

        if self._model is not None and len(frame_float) == 512:
            try:
                out = self._model(frame_float)
                prob = float(out[0])
                return prob >= self.threshold, prob
            except Exception as e:
                logger.debug(f"[VAD] Silero inference error: {e}")

        # Fallback: Root-Mean-Square (RMS) Energy VAD
        rms = float(np.sqrt(np.mean(frame_float**2))) if len(frame_float) > 0 else 0.0
        # Adaptive scaling for conversational speech
        prob = min(1.0, rms * 80.0)
        return prob >= self.threshold, prob
