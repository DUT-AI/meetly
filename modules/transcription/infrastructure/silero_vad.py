import numpy as np
from loguru import logger

try:
    import onnxruntime
except ImportError:
    onnxruntime = None


class SileroVADDetector:
    """Stateful Voice Activity Detector using Silero VAD ONNX or energy fallback."""

    def __init__(self, threshold: float = 0.5) -> None:
        self.threshold = threshold
        self._session = None
        self._h = np.zeros((2, 1, 64), dtype=np.float32)
        self._c = np.zeros((2, 1, 64), dtype=np.float32)
        self._init_model()

    def _init_model(self) -> None:
        """Attempt to load official Silero VAD ONNX model, with graceful fallback."""
        if not onnxruntime:
            logger.warning("[VAD] onnxruntime not installed, using energy-based VAD fallback")
            return

        try:
            # We can download/cache or use torch hub / onnx if available
            import torch

            model, _ = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                onnx=True,
                trust_repo=True,
            )
            # The torch hub silero onnx wrapper wraps an onnx inference session
            self._session = model
            logger.info("[VAD] Successfully initialized Silero VAD ONNX model")
        except Exception as e:
            logger.warning(f"[VAD] Could not load Silero VAD ONNX from hub ({e}); using energy fallback.")
            self._session = None

    def reset_states(self) -> None:
        """Reset recurrent states for a new audio stream."""
        self._h = np.zeros((2, 1, 64), dtype=np.float32)
        self._c = np.zeros((2, 1, 64), dtype=np.float32)
        if self._session and hasattr(self._session, "reset_states"):
            self._session.reset_states()

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

        if self._session:
            try:
                import torch

                tensor = torch.from_numpy(frame_float).unsqueeze(0)
                prob = float(self._session(tensor, sample_rate).item())
                return prob >= self.threshold, prob
            except Exception as e:
                logger.debug(f"[VAD] Silero inference error: {e}")

        # Fallback: Root-Mean-Square (RMS) Energy VAD
        rms = float(np.sqrt(np.mean(frame_float**2))) if len(frame_float) > 0 else 0.0
        # Energy threshold approx 0.01 (-40 dB)
        prob = min(1.0, rms * 50.0)
        return prob >= self.threshold, prob
