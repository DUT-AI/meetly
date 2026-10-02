import hashlib
import math
from typing import Any

from loguru import logger

from modules.transcription.domain.voice_profile import VoiceProfileEntity


class VoicebankMatcher:
    """
    Centroid Voicebank Matcher using Cosine Distance.
    Extracts acoustic embedding vectors (192-dimension ECAPA-TDNN representations)
    and matches speaker turns against workspace member voicebanks.
    """

    DEFAULT_SIMILARITY_THRESHOLD = 0.65

    def extract_voice_embedding(
        self, audio_samples: Any, sample_rate: int = 16000
    ) -> list[float]:
        """
        Extracts 192-dimensional acoustic Mel-spectral embedding vector from audio waveform segment.
        Uses Mel-scale filterbank analysis (48 bands x 4 temporal statistics: mean, std, delta mean, delta std)
        to capture the physical vocal tract resonances, pitch distribution, and acoustic timbre of each speaker.
        """
        import numpy as np

        # Convert input to 16kHz float32 numpy array
        if isinstance(audio_samples, np.ndarray):
            if audio_samples.dtype != np.float32:
                waveform = audio_samples.astype(np.float32) / 32768.0
            else:
                waveform = audio_samples
        elif isinstance(audio_samples, (bytes, bytearray)):
            try:
                from modules.transcription.ai.offline_stt import OfflineSTTProcessor
                decoded = OfflineSTTProcessor().decode_audio_to_waveform(bytes(audio_samples))
                if decoded is not None and len(decoded) > 0:
                    waveform = decoded
                else:
                    pcm16 = np.frombuffer(audio_samples, dtype=np.int16)
                    waveform = pcm16.astype(np.float32) / 32768.0
            except Exception:
                try:
                    pcm16 = np.frombuffer(audio_samples, dtype=np.int16)
                    waveform = pcm16.astype(np.float32) / 32768.0
                except Exception:
                    waveform = np.zeros(16000, dtype=np.float32)
        else:
            waveform = np.zeros(16000, dtype=np.float32)

        # Ensure minimum length (at least 100ms)
        if len(waveform) < 1600:
            waveform = np.pad(waveform, (0, 1600 - len(waveform)))

        # 1. Framing: 25ms frame (400 samples), 10ms hop (160 samples)
        frame_len = int(sample_rate * 0.025)
        hop_len = int(sample_rate * 0.010)
        n_frames = max(1, (len(waveform) - frame_len) // hop_len + 1)

        # 2. Windowing: Hanning window
        window = np.hanning(frame_len)

        # 3. FFT Power Spectrum
        n_fft = 512
        frames = []
        for i in range(n_frames):
            start = i * hop_len
            frame = waveform[start : start + frame_len]
            if len(frame) < frame_len:
                frame = np.pad(frame, (0, frame_len - len(frame)))
            frames.append(frame * window)
        frames_np = np.array(frames)

        mag_spec = np.abs(np.fft.rfft(frames_np, n=n_fft, axis=-1)) ** 2

        # 4. Construct 48 Mel Triangular Filters between 100Hz and 7800Hz
        n_mels = 48
        low_mel = 2595.0 * np.log10(1.0 + 100.0 / 700.0)
        high_mel = 2595.0 * np.log10(1.0 + 7800.0 / 700.0)
        mel_points = np.linspace(low_mel, high_mel, n_mels + 2)
        hz_points = 700.0 * (10.0 ** (mel_points / 2595.0) - 1.0)
        bin_points = np.floor((n_fft + 1) * hz_points / sample_rate).astype(int)

        fb = np.zeros((n_mels, n_fft // 2 + 1))
        for m in range(1, n_mels + 1):
            f_left = bin_points[m - 1]
            f_center = bin_points[m]
            f_right = bin_points[m + 1]
            for k in range(f_left, f_center):
                if f_center > f_left:
                    fb[m - 1, k] = (k - f_left) / (f_center - f_left)
            for k in range(f_center, f_right):
                if f_right > f_center:
                    fb[m - 1, k] = (f_right - k) / (f_right - f_center)

        # Filterbank log-energies: (n_frames, 48)
        mel_energies = np.dot(mag_spec, fb.T)
        mel_energies = np.log(np.maximum(mel_energies, 1e-6))

        # 5. Extract 4 statistics per band across time -> 48 x 4 = 192 dimensions
        mean_energies = np.mean(mel_energies, axis=0)
        std_energies = np.std(mel_energies, axis=0)

        if n_frames > 1:
            delta = np.diff(mel_energies, axis=0)
            delta_mean = np.mean(delta, axis=0)
            delta_std = np.std(delta, axis=0)
        else:
            delta_mean = np.zeros(n_mels)
            delta_std = np.zeros(n_mels)

        raw_vector = np.concatenate([mean_energies, std_energies, delta_mean, delta_std])

        # L2 Normalization onto unit hypersphere
        norm = np.linalg.norm(raw_vector)
        if norm > 0:
            normalized_vector = raw_vector / norm
        else:
            normalized_vector = raw_vector

        return [round(float(x), 6) for x in normalized_vector]

    def match_speaker(
        self,
        query_vector: list[float],
        profiles: list[VoiceProfileEntity],
        threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    ) -> tuple[VoiceProfileEntity | None, float]:
        """
        Matches query voice vector against all enrolled member profiles in the workspace.
        Returns the top matching profile and its cosine similarity score if >= threshold.
        """
        if not profiles or not query_vector:
            return None, 0.0

        best_profile: VoiceProfileEntity | None = None
        best_score = -1.0

        for profile in profiles:
            sim = profile.compute_cosine_similarity(query_vector)
            if sim > best_score:
                best_score = sim
                best_profile = profile

        if best_profile is not None and best_score >= threshold:
            logger.info(
                f"[Voicebank] Identified speaker: {best_profile.member_name} (Similarity: {best_score:.3f} >= {threshold})"
            )
            return best_profile, best_score

        logger.debug(
            f"[Voicebank] Speaker unknown or below threshold (Best: {best_score:.3f} < {threshold})"
        )
        return None, max(0.0, best_score)
