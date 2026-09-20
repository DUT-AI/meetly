import numpy as np

from modules.transcription.infrastructure.silero_vad import SileroVADDetector


class UtteranceBuffer:
    """
    Utterance-oriented audio accumulator with pre-roll buffer, VAD gating,
    partial cadence (800ms) and silence endpointing (600ms).
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        pre_roll_ms: int = 250,
        partial_cadence_ms: int = 800,
        silence_endpoint_ms: int = 600,
        max_utterance_s: float = 20.0,
    ) -> None:
        self.sample_rate = sample_rate
        self.pre_roll_samples = int(sample_rate * (pre_roll_ms / 1000.0))
        self.partial_cadence_samples = int(sample_rate * (partial_cadence_ms / 1000.0))
        self.silence_endpoint_samples = int(sample_rate * (silence_endpoint_ms / 1000.0))
        self.max_utterance_samples = int(sample_rate * max_utterance_s)

        # Pre-roll ring buffer
        self._pre_roll = np.array([], dtype=np.int16)

        # Active utterance state
        self.is_speech_active: bool = False
        self.utterance_start_sample: int = 0
        self._utterance_chunks: list[np.ndarray] = []
        self._utterance_sample_count: int = 0
        self._silence_sample_count: int = 0
        self._last_partial_sample_count: int = 0

    def push_frame(
        self,
        frame_pcm16: np.ndarray,
        start_sample: int,
        vad: SileroVADDetector,
    ) -> tuple[bool, bool]:
        """
        Push incoming 100ms frame.
        Returns: (should_emit_partial, is_endpointed)
        """
        # Run VAD across 32ms sub-chunks (512 samples)
        sub_chunk_size = 512
        frame_has_speech = False

        for i in range(0, len(frame_pcm16), sub_chunk_size):
            sub_chunk = frame_pcm16[i : i + sub_chunk_size]
            if len(sub_chunk) == sub_chunk_size:
                has_speech, _ = vad.is_speech(sub_chunk, self.sample_rate)
                if has_speech:
                    frame_has_speech = True
                    break

        should_emit_partial = False
        is_endpointed = False

        if frame_has_speech:
            self._silence_sample_count = 0

            if not self.is_speech_active:
                # Speech started! Begin a new utterance
                self.is_speech_active = True
                # Prepend pre-roll buffer to retain starting consonant
                pre_roll_len = len(self._pre_roll)
                self.utterance_start_sample = max(0, start_sample - pre_roll_len)
                self._utterance_chunks = [self._pre_roll.copy(), frame_pcm16.copy()]
                self._utterance_sample_count = pre_roll_len + len(frame_pcm16)
                self._last_partial_sample_count = self._utterance_sample_count
            else:
                self._utterance_chunks.append(frame_pcm16.copy())
                self._utterance_sample_count += len(frame_pcm16)

                # Check partial cadence (e.g. every 800ms)
                if (self._utterance_sample_count - self._last_partial_sample_count) >= self.partial_cadence_samples:
                    should_emit_partial = True
                    self._last_partial_sample_count = self._utterance_sample_count

            # Check max utterance limit (prevent infinite sentence without silence)
            if self._utterance_sample_count >= self.max_utterance_samples:
                is_endpointed = True

        else:
            # Silence detected in this frame
            if self.is_speech_active:
                self._utterance_chunks.append(frame_pcm16.copy())
                self._utterance_sample_count += len(frame_pcm16)
                self._silence_sample_count += len(frame_pcm16)

                # Endpoint utterance if silence threshold exceeded
                if self._silence_sample_count >= self.silence_endpoint_samples:
                    is_endpointed = True
            else:
                # Update pre-roll sliding buffer during silence
                self._pre_roll = np.concatenate([self._pre_roll, frame_pcm16])
                if len(self._pre_roll) > self.pre_roll_samples:
                    self._pre_roll = self._pre_roll[-self.pre_roll_samples :]

        return should_emit_partial, is_endpointed

    def get_current_audio(self) -> tuple[np.ndarray, int, int]:
        """Return full audio array accumulated for current utterance so far."""
        if not self._utterance_chunks:
            return np.array([], dtype=np.int16), self.utterance_start_sample, self.utterance_start_sample
        audio = np.concatenate(self._utterance_chunks)
        end_sample = self.utterance_start_sample + len(audio)
        return audio, self.utterance_start_sample, end_sample

    def finish_utterance(self) -> tuple[np.ndarray, int, int] | None:
        """Endpoint and return final audio array for utterance, resetting active speech state."""
        if not self.is_speech_active or not self._utterance_chunks:
            return None

        audio = np.concatenate(self._utterance_chunks)
        start_sample = self.utterance_start_sample
        end_sample = start_sample + len(audio)

        # Reset active utterance state
        self.is_speech_active = False
        self._utterance_chunks = []
        self._utterance_sample_count = 0
        self._silence_sample_count = 0
        self._last_partial_sample_count = 0
        self._pre_roll = np.array([], dtype=np.int16)

        return audio, start_sample, end_sample
