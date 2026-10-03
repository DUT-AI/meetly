import io
import os
import re
from typing import Any

import numpy as np
from loguru import logger

# Preload pip-installed NVIDIA shared libraries (cublas, cudnn) for CTranslate2 on Linux
try:
    import ctypes
    import glob
    import site

    for sp in site.getsitepackages():
        for lib in sorted(glob.glob(os.path.join(sp, "nvidia", "*", "lib", "*.so*"))):
            try:
                ctypes.CDLL(lib)
            except Exception:
                pass
except Exception:
    pass

try:
    from faster_whisper.audio import decode_audio
except ImportError:
    decode_audio = None

try:
    import torch
except ImportError:
    torch = None

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

from core.config.stt import stt_settings


class OfflineSTTProcessor:
    """
    Offline Speech-to-Text (STT) and Acoustic Slicing Engine.
    1. Decodes full meeting audio files (.wav, .mp3, .m4a, .aac, .webm, .flac) to 16kHz mono float32.
    2. Runs Faster-Whisper ASR with word-level timestamps and Silero VAD silence filtering.
    3. Returns structured speech segments with accurate start_ms, end_ms, text, and raw audio slices.
    """

    DEFAULT_PROMPT = (
        "Cuộc họp trực tiếp, thảo luận kỹ thuật, báo cáo tiến độ dự án Meetly, phân chia công việc trong tuần này, kế hoạch tuần này, tuần sau, hoàn thành trước thời hạn."
    )

    @staticmethod
    def clean_vietnamese_asr_text(text: str) -> str:
        """
        Cleans Whisper ASR text for Vietnamese meeting transcriptions:
        1. Fixes Whisper BPE Sino-Vietnamese Hanzi leaks (e.g. 成 -> thành, 工 -> công).
        2. Strips any leftover CJK characters.
        3. Corrects acoustic misrecognition slips on common meeting phrases:
           - 'thùng này', 'trong thùng', 'thùng tới/sau' -> 'tuần này', 'trong tuần', 'tuần tới/sau'
           - 'chú thứ X', 'chút thứ X' -> 'trước thứ X'
           - 'chú/chút thời hạn/deadline/ngày' -> 'trước thời hạn/deadline/ngày'
           - 'sẽ học về', 'cuộc học', 'buổi học', 'học nhóm' -> 'sẽ họp về', 'cuộc họp', 'buổi họp', 'họp nhóm'
        """
        if not text:
            return ""
        import re

        sino_map = {
            "成": "thành",
            "工": "công",
            "生": "sinh",
            "國": "quốc",
            "国": "quốc",
            "會": "hội",
            "会": "hội",
            "家": "gia",
            "電": "điện",
            "电": "điện",
            "學": "học",
            "学": "học",
            "時": "thời",
            "时": "thời",
            "間": "gian",
            "间": "gian",
        }
        for char, vi in sino_map.items():
            text = text.replace(char, vi)
        text = re.sub(r"[\u4e00-\u9fff]+", "", text)
        text = re.sub(r"hoàn\s*thành", "hoàn thành", text, flags=re.IGNORECASE)
        text = re.sub(r"\bthùng\s+này\b", "tuần này", text, flags=re.IGNORECASE)
        text = re.sub(r"\bthùng\s+(sau|tới|trước)\b", r"tuần \1", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(trong|đầu|cuối|sang|cho|hết|qua)\s+thùng\b", r"\1 tuần", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(chú|chút)\s+(thứ\s+(?:[2-7]|hai|ba|tư|bốn|năm|sáu|bảy)|chủ\s+nhật)\b", r"trước \2", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(chú|chút)\s+(ngày\s+mai|hôm\s+nay|cuối\s+tuần|thời\s+hạn|deadline|ngày)\b", r"trước \2", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(sẽ|đang|chuẩn bị|bắt đầu|tiến hành|có)\s+học\s+(về|trực tiếp|offline|online|bàn|giao ban)\b", r"\1 họp \2", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(cuộc|buổi)\s+học\b", r"\1 họp", text, flags=re.IGNORECASE)
        text = re.sub(r"\bhọc\s+về\s+dự\s+án\b", "họp về dự án", text, flags=re.IGNORECASE)
        text = re.sub(r"\bhọc\s+nhóm\b", "họp nhóm", text, flags=re.IGNORECASE)
        text = re.sub(r"\bhọc\s+bàn\b", "họp bàn", text, flags=re.IGNORECASE)
        return " ".join(text.split()).strip()

    HALLUCINATION_KEYWORDS = (
        "chúng ta cùng trao đổi",
        "thảo luận báo cáo",
        "cập nhật tiến độ",
        "chia sẻ màn hình",
        "xử lý các vấn đề kỹ thuật",
        "chào mọi người, đây là cuộc họp",
        "subscribe",
        "đăng ký kênh",
        "cảm ơn các bạn đã theo dõi",
        "cảm ơn các bạn đã xem",
        "hẹn gặp lại các bạn",
    )

    def __init__(
        self,
        model_size: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.model_size = model_size or os.getenv(
            "OFFLINE_STT_MODEL_SIZE",
            os.getenv("STT_MODEL_ID", "Systran/faster-whisper-large-v3"),
        )
        self.device = device or os.getenv(
            "WHISPER_DEVICE",
            "cuda" if (torch is not None and torch.cuda.is_available()) else "cpu",
        )
        self.compute_type = compute_type or os.getenv(
            "WHISPER_COMPUTE_TYPE",
            "float16" if (torch is not None and torch.cuda.is_available()) else "int8",
        )
        self._model: Any = None
        self._is_initialized = False

    def load_model(self) -> None:
        """Lazily loads Faster-Whisper model into memory/VRAM."""
        if self._is_initialized and self._model is not None:
            return

        if WhisperModel is None:
            logger.warning("[OfflineSTT] faster-whisper is not installed.")
            return

        # If running on CPU and remote GPU service is enabled, delegate to Remote GPU Whisper Large-v3
        if self.device == "cpu" and stt_settings.stt_remote_enabled and stt_settings.stt_service_url:
            logger.info(
                f"[OfflineSTT] Running on CPU. Delegating Whisper Large-v3 ASR to Remote GPU at {stt_settings.stt_service_url}"
            )
            return

        try:
            logger.info(
                f"[OfflineSTT] Loading Faster-Whisper model: {self.model_size} on {self.device} ({self.compute_type})..."
            )
            self._model = WhisperModel(
                model_size_or_path=self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                num_workers=2,
            )
            self._is_initialized = True
            logger.info(f"[OfflineSTT] Faster-Whisper model '{self.model_size}' loaded successfully!")
        except Exception as e:
            logger.warning(
                f"[OfflineSTT] Could not initialize local Faster-Whisper model '{self.model_size}': {e}"
            )
            self._model = None

    @staticmethod
    def _decode_via_ffmpeg(audio_bytes: bytes) -> np.ndarray | None:
        """
        Decodes any incoming audio container (WebM/Opus, MP3, M4A, AAC, FLAC, OGG, WAV)
        to 16kHz mono float32 numpy array using the system FFmpeg CLI.
        """
        if not audio_bytes or len(audio_bytes) < 32:
            return None
        try:
            import subprocess

            cmd = [
                "ffmpeg",
                "-nostdin",
                "-threads", "0",
                "-i", "pipe:0",
                "-f", "s16le",
                "-ac", "1",
                "-ar", "16000",
                "pipe:1",
            ]
            proc = subprocess.run(
                cmd,
                input=audio_bytes,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=45.0,
            )
            if proc.returncode == 0 and len(proc.stdout) >= 3200:
                pcm16 = np.frombuffer(proc.stdout, dtype=np.int16)
                waveform = pcm16.astype(np.float32) / 32768.0
                logger.info(
                    f"[OfflineSTT] Decoded {len(waveform) / 16000:.2f}s audio via FFmpeg ({len(audio_bytes)} bytes input)"
                )
                return waveform
            else:
                err_msg = proc.stderr[:300].decode("utf-8", errors="ignore")
                logger.debug(f"[OfflineSTT] FFmpeg decode non-zero ({proc.returncode}): {err_msg}")
        except Exception as e:
            logger.debug(f"[OfflineSTT] FFmpeg decode exception: {e}")
        return None

    @staticmethod
    def _decode_via_wave(audio_bytes: bytes) -> np.ndarray | None:
        """
        Pure Python standard library fallback to parse uncompressed RIFF/WAV audio
        without any external dependencies.
        """
        if not audio_bytes or len(audio_bytes) < 44 or not audio_bytes.startswith(b"RIFF"):
            return None
        try:
            import wave

            with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                channels = wf.getnchannels()
                sample_width = wf.getsampwidth()
                framerate = wf.getframerate()
                n_frames = wf.getnframes()
                if n_frames == 0:
                    return None

                raw_data = wf.readframes(n_frames)
                if sample_width == 2:
                    pcm = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
                elif sample_width == 1:
                    pcm = (np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
                elif sample_width == 4:
                    pcm = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32) / 2147483648.0
                else:
                    return None

                if channels > 1:
                    pcm = pcm.reshape(-1, channels).mean(axis=1)

                if framerate != 16000 and len(pcm) > 0:
                    target_length = max(1, int(len(pcm) * 16000 / framerate))
                    pcm = np.interp(
                        np.linspace(0, len(pcm), target_length, endpoint=False),
                        np.arange(len(pcm)),
                        pcm,
                    ).astype(np.float32)

                logger.info(
                    f"[OfflineSTT] Decoded {len(pcm) / 16000:.2f}s audio via Python wave module"
                )
                return pcm
        except Exception as e:
            logger.debug(f"[OfflineSTT] Wave decode exception: {e}")
            return None

    def decode_audio_to_waveform(self, audio_bytes: bytes) -> np.ndarray | None:
        """
        Decodes any incoming audio container (MP3, WAV, M4A, WebM/Opus, etc.) to 16kHz mono float32 numpy array.
        Uses a robust multi-stage decoding pipeline:
        1. FFmpeg CLI (handles all webm, mp3, m4a, wav).
        2. faster_whisper.audio.decode_audio / PyAV.
        3. Python standard library wave module.
        4. Raw PCM16 fallback for direct byte buffers.
        """
        if not audio_bytes or len(audio_bytes) < 64:
            return None

        # 1. Primary: FFmpeg CLI
        ffmpeg_waveform = self._decode_via_ffmpeg(audio_bytes)
        if ffmpeg_waveform is not None and len(ffmpeg_waveform) > 0:
            return ffmpeg_waveform

        # 2. PyAV / Faster-Whisper decode_audio if installed
        if decode_audio is not None:
            try:
                buf = io.BytesIO(audio_bytes)
                audio_array = decode_audio(buf, sampling_rate=16000)
                if isinstance(audio_array, np.ndarray) and len(audio_array) > 0:
                    return audio_array
            except Exception as e:
                logger.debug(f"[OfflineSTT] decode_audio failed on input bytes: {e}")

        # 3. Standard Python wave module (for uncompressed WAV)
        wave_waveform = self._decode_via_wave(audio_bytes)
        if wave_waveform is not None and len(wave_waveform) > 0:
            return wave_waveform

        # 4. Fallback raw PCM16 parser ONLY if direct raw PCM bytes (even length, not starting with container headers)
        if len(audio_bytes) % 2 == 0:
            is_container = (
                audio_bytes.startswith(b"RIFF")
                or audio_bytes.startswith(b"\x1aE\xdf\xa3")  # WebM
                or audio_bytes.startswith(b"ID3")  # MP3
                or audio_bytes.startswith(b"\xff\xfb")  # MP3 sync
                or audio_bytes.startswith(b"\xff\xf3")
                or audio_bytes.startswith(b"OggS")  # OGG
                or audio_bytes.startswith(b"fLaC")  # FLAC
                or (len(audio_bytes) > 8 and audio_bytes[4:8] == b"ftyp")  # MP4/M4A
            )
            if not is_container:
                try:
                    pcm16 = np.frombuffer(audio_bytes, dtype=np.int16)
                    if len(pcm16) > 1600:
                        return pcm16.astype(np.float32) / 32768.0
                except Exception:
                    pass

        return None

    def transcribe_offline_audio(
        self,
        audio_bytes: bytes,
        language: str = "vi",
        initial_prompt: str | None = None,
        voice_profiles: list[Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Transcribes full meeting audio end-to-end:
        Decodes audio -> VAD chunking -> Faster-Whisper ASR -> returns structured segments.
        Never returns hardcoded or fabricated dialogue.
        """
        waveform = self.decode_audio_to_waveform(audio_bytes)
        if waveform is None or len(waveform) < 1600:  # Minimum 100ms
            return []

        # 1. PRIMARY: Delegate entirely to Remote GPU Whisper Large-v3 if configured
        if stt_settings.stt_remote_enabled and stt_settings.stt_service_url:
            try:
                import base64
                import httpx

                pcm16 = (np.clip(waveform, -1.0, 1.0) * 32767).astype(np.int16)
                b64_audio = base64.b64encode(pcm16.tobytes()).decode("ascii")
                logger.info(
                    f"[OfflineSTT] Delegating {len(waveform) / 16000:.1f}s audio entirely to Remote GPU Whisper Large-v3 at {stt_settings.stt_service_url}..."
                )
                
                # Attempt 1: Standard transcription with beam_size=5
                results: list[dict[str, Any]] = []
                with httpx.Client(timeout=120.0) as client:
                    resp = client.post(
                        f"{stt_settings.stt_service_url.rstrip('/')}/api/v1/asr/transcribe",
                        json={
                            "audio_base64": b64_audio,
                            "language": language,
                            "beam_size": 5,
                            "word_timestamps": True,
                            "initial_prompt": initial_prompt or self.DEFAULT_PROMPT,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        gpu_segments = data.get("segments", [])

                        if gpu_segments:
                            for s in gpu_segments:
                                s_text = self.clean_vietnamese_asr_text(s.get("text", "").strip())
                                if not s_text or any(kw in s_text.lower() for kw in self.HALLUCINATION_KEYWORDS):
                                    continue
                                
                                # Support both start_ms and start (seconds)
                                start_ms = s.get("start_ms")
                                if start_ms is None:
                                    start_ms = int(s.get("start", 0) * 1000)
                                end_ms = s.get("end_ms")
                                if end_ms is None:
                                    end_ms = int(s.get("end", len(waveform) / 16000) * 1000)

                                start_sample = max(0, int(start_ms * 16))
                                end_sample = min(len(waveform), int(end_ms * 16))
                                chunk = (
                                    waveform[start_sample:end_sample]
                                    if end_sample > start_sample + 320
                                    else waveform
                                )
                                results.append(
                                    {
                                        "start_ms": start_ms,
                                        "end_ms": end_ms,
                                        "text": s_text,
                                        "words": s.get("words", []),
                                        "confidence": round(float(s.get("confidence", data.get("confidence", 0.95))), 2),
                                        "audio_chunk": chunk,
                                    }
                                )
                        
                        # Fallback to top-level text if segments were empty
                        if not results:
                            text = self.clean_vietnamese_asr_text(data.get("text", "").strip())
                            if text and not any(kw in text.lower() for kw in self.HALLUCINATION_KEYWORDS):
                                results.append(
                                    {
                                        "start_ms": 0,
                                        "end_ms": int(len(waveform) / 16),
                                        "text": text,
                                        "words": data.get("words", []),
                                        "confidence": round(float(data.get("confidence", 0.95)), 2),
                                        "audio_chunk": waveform,
                                    }
                                )

                    # Attempt 2: If short audio (<15s) and results still empty, retry with beam_size=1 without prompt
                    if not results and len(waveform) <= 16000 * 15:
                        logger.info("[OfflineSTT] Retrying short audio with beam_size=1 and neutral prompt...")
                        resp_retry = client.post(
                            f"{stt_settings.stt_service_url.rstrip('/')}/api/v1/asr/transcribe",
                            json={
                                "audio_base64": b64_audio,
                                "language": language,
                                "beam_size": 1,
                                "word_timestamps": False,
                                "initial_prompt": None,
                            },
                        )
                        if resp_retry.status_code == 200:
                            data_retry = resp_retry.json()
                            text_retry = self.clean_vietnamese_asr_text(data_retry.get("text", "").strip())
                            if text_retry and not any(kw in text_retry.lower() for kw in self.HALLUCINATION_KEYWORDS):
                                results.append(
                                    {
                                        "start_ms": 0,
                                        "end_ms": int(len(waveform) / 16),
                                        "text": text_retry,
                                        "words": data_retry.get("words", []),
                                        "confidence": round(float(data_retry.get("confidence", 0.95)), 2),
                                        "audio_chunk": waveform,
                                    }
                                )

                if results:
                    logger.info(
                        f"[OfflineSTT] Remote GPU Whisper Large-v3 transcribed {len(results)} segments successfully: '{results[0]['text'][:60]}...'"
                    )
                    return results
            except Exception as e:
                logger.warning(
                    f"[OfflineSTT] Remote GPU ASR call failed: {e}. Falling back to local model if available..."
                )

        # 2. FALLBACK: Try local Faster-Whisper model if loaded
        if not self._is_initialized:
            self.load_model()

        if self._model is not None:
            try:
                logger.info(
                    f"[OfflineSTT] Running Faster-Whisper on {len(waveform) / 16000:.1f}s audio..."
                )
                segments, _ = self._model.transcribe(
                    waveform,
                    language=language,
                    task="transcribe",
                    beam_size=5,
                    best_of=1,
                    temperature=0.0,
                    initial_prompt=initial_prompt or self.DEFAULT_PROMPT,
                    repetition_penalty=1.2,
                    vad_filter=True,
                    vad_parameters=dict(
                        min_silence_duration_ms=400,
                        threshold=0.35,
                        min_speech_duration_ms=200,
                    ),
                    word_timestamps=True,
                )

                results = []
                for seg in segments:
                    if getattr(seg, "no_speech_prob", 0.0) > 0.45:
                        continue

                    text = self.clean_vietnamese_asr_text(seg.text.strip())
                    if not text or any(kw in text.lower() for kw in self.HALLUCINATION_KEYWORDS):
                        continue

                    start_ms = int(seg.start * 1000)
                    end_ms = int(seg.end * 1000)

                    words = []
                    if hasattr(seg, "words") and seg.words:
                        for w in seg.words:
                            cleaned_w = self.clean_vietnamese_asr_text(w.word.strip())
                            words.append(
                                {
                                    "word": cleaned_w,
                                    "start_ms": int(w.start * 1000),
                                    "end_ms": int(w.end * 1000),
                                    "score": round(float(w.probability), 2),
                                }
                            )

                    # Slice audio chunk for acoustic voice embedding
                    start_sample = max(0, int(seg.start * 16000))
                    end_sample = min(len(waveform), int(seg.end * 16000))
                    chunk = waveform[start_sample:end_sample]

                    results.append(
                        {
                            "start_ms": start_ms,
                            "end_ms": end_ms,
                            "text": text,
                            "words": words,
                            "confidence": round(1.0 - getattr(seg, "no_speech_prob", 0.0), 2),
                            "audio_chunk": chunk,
                        }
                    )

                if results:
                    logger.info(f"[OfflineSTT] Transcribed {len(results)} speech segments successfully!")
                    return results
            except Exception as e:
                logger.error(f"[OfflineSTT] Local model transcription failed: {e}")


        # 3. No speech detected or silent audio -> Return empty list (NO FAKE MOCK DATA)
        return []
