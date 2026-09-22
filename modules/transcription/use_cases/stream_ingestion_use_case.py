import asyncio
import json
import struct

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from modules.transcription.domain.enums import SessionStatus, SpeakerLabel, StreamId
from modules.transcription.infrastructure.event_broadcaster import event_broadcaster
from modules.transcription.infrastructure.faster_whisper_engine import (
    FasterWhisperEngine,
)
from modules.transcription.infrastructure.seamless_client import seamless_client
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.infrastructure.utterance_buffer import UtteranceBuffer
from modules.transcription.repository.segment_repository import (
    SqlTranscriptSegmentRepository,
)
from modules.transcription.repository.session_repository import (
    SqlTranscriptionSessionRepository,
)


class StreamIngestionUseCase:
    """Coordinates producer audio ingestion, frame validation, VAD, ASR and real-time broadcasting."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        whisper_engine: FasterWhisperEngine,
    ) -> None:
        self.session_factory = session_factory
        self.whisper_engine = whisper_engine

    async def _process_final_utterance(
        self,
        session_id: str,
        final_audio: np.ndarray,
        utt_start: int,
        utt_end: int,
        speaker_label: str,
        utterance_id: str,
        revision: int = 1,
    ) -> None:
        """Transcribe completed utterance and persist to DB asynchronously."""
        try:
            # Fast inference without word-level alignment penalty on CPU
            final_text, words, conf = await self.whisper_engine.transcribe_samples(
                final_audio, language="vi", beam_size=5, word_timestamps=True
            )
            if not final_text:
                logger.debug(
                    f"[Ingestion] Utterance {utterance_id} produced empty text"
                )
                return

            logger.info(
                f"[Ingestion] Finalized {utterance_id}: {final_text!r} (conf={conf})"
            )
            # Cascaded Streaming Translation (Vietnamese -> English via SeamlessStreaming)
            translation = await seamless_client.translate(
                final_text, src_lang="vie", tgt_lang="eng"
            )

            base_start_ms = int(utt_start * 1000 / 16000)
            base_end_ms = int(utt_end * 1000 / 16000)

            adjusted_words = []
            if words:
                for w in words:
                    adjusted_words.append(
                        {
                            "word": w["word"],
                            "start_ms": base_start_ms + w["start_ms"],
                            "end_ms": base_end_ms + w["end_ms"],
                            "score": w["score"],
                        }
                    )
            else:
                # Fast linear word timestamp estimation without cross-attention CPU penalty
                tokens = final_text.split()
                if tokens:
                    dur_per_word = max(1, (base_end_ms - base_start_ms) // len(tokens))
                    for idx, tok in enumerate(tokens):
                        w_start = base_start_ms + idx * dur_per_word
                        w_end = min(base_end_ms, w_start + dur_per_word)
                        adjusted_words.append(
                            {
                                "word": tok,
                                "start_ms": w_start,
                                "end_ms": w_end,
                                "score": conf,
                            }
                        )

            segment_id = f"temp_{utt_start}"
            try:
                async with self.session_factory() as session:
                    segment_repo = SqlTranscriptSegmentRepository(session)
                    saved_segment = await segment_repo.upsert_segment(
                        session_id=session_id,
                        utterance_id=utterance_id,
                        revision=revision,
                        start_ms=base_start_ms,
                        end_ms=base_end_ms,
                        text=final_text,
                        translation=translation,
                        words=adjusted_words,
                        speaker_label=speaker_label,
                        confidence=conf,
                        is_final=True,
                    )
                    await session.commit()
                    segment_id = saved_segment.id
            except Exception as db_err:
                logger.error(f"[Ingestion] Failed to persist segment: {db_err}")

            await event_broadcaster.broadcast(
                session_id,
                {
                    "type": "transcript.final",
                    "session_id": session_id,
                    "segment_id": segment_id,
                    "utterance_id": utterance_id,
                    "revision": revision,
                    "start_ms": base_start_ms,
                    "end_ms": base_end_ms,
                    "text": final_text,
                    "translation": translation,
                    "words": adjusted_words,
                    "speaker_label": speaker_label,
                    "confidence": conf,
                    "is_final": True,
                },
            )
        except Exception as e:
            logger.error(
                f"[Ingestion] Error transcribing final utterance {utterance_id}: {e}"
            )

    async def _process_partial_utterance(
        self,
        session_id: str,
        current_audio: np.ndarray,
        utt_start: int,
        utt_end: int,
        speaker_label: str,
    ) -> None:
        """Transcribe in-flight partial audio without blocking frame ingestion."""
        # Never queue partials behind final utterances to prevent CPU backlog
        if self.whisper_engine.is_busy:
            return

        try:
            # Cap partial inference window to latest 5.0s (80,000 samples) to ensure coherent context and sub-second response
            audio_for_partial = (
                current_audio[-80000:] if len(current_audio) > 80000 else current_audio
            )
            partial_text, _, _ = await self.whisper_engine.transcribe_samples(
                audio_for_partial, language="vi", beam_size=1, word_timestamps=False
            )
            if partial_text:
                # Fast translation for partial utterance
                partial_translation = await seamless_client.translate(
                    partial_text, src_lang="vie", tgt_lang="eng"
                )
                start_ms = int(utt_start * 1000 / 16000)
                end_ms = int(utt_end * 1000 / 16000)
                await event_broadcaster.broadcast(
                    session_id,
                    {
                        "type": "transcript.partial",
                        "session_id": session_id,
                        "utterance_id": f"utt_{utt_start}",
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                        "text": partial_text,
                        "translation": partial_translation,
                        "speaker_label": speaker_label,
                        "is_final": False,
                    },
                )
        except Exception as e:
            logger.debug(f"[Ingestion] Error during partial transcription: {e}")

    async def handle_producer_stream(
        self,
        session_id: str,
        websocket: WebSocket,
    ) -> None:
        """
        Handle persistent WebSocket connection from Chrome Extension producer.
        Parses binary audio frames with 16-byte fixed header.
        Decouples frame ingestion from Whisper ASR inference.
        """
        await websocket.accept()
        logger.info(
            f"[Ingestion] Producer WebSocket connected for session {session_id}"
        )

        # Update session status to STREAMING
        try:
            async with self.session_factory() as session:
                session_repo = SqlTranscriptionSessionRepository(session)
                await session_repo.update_status(
                    session_id, SessionStatus.STREAMING.value
                )
                await session.commit()
        except Exception as e:
            logger.warning(
                f"[Ingestion] Could not update session {session_id} to STREAMING: {e}"
            )

        await event_broadcaster.broadcast(
            session_id,
            {
                "type": "session.status_changed",
                "session_id": session_id,
                "status": SessionStatus.STREAMING.value,
            },
        )

        vad_detector = SileroVADDetector()
        buffers: dict[int, UtteranceBuffer] = {}
        active_partial_tasks: dict[int, asyncio.Task] = {}
        pending_final_tasks: set[asyncio.Task] = set()

        last_seq_by_stream: dict[int, int] = {}
        utterance_counter = 0

        # Dynamic speaker mapping per stream (defaults to LOCAL_USER for MIC, REMOTE_SPEAKER for TAB)
        speaker_by_stream: dict[int, str] = {
            StreamId.MIC: SpeakerLabel.LOCAL_USER.value,
            StreamId.TAB: SpeakerLabel.REMOTE_SPEAKER.value,
        }

        try:
            while True:
                message = await websocket.receive()

                # Handle JSON control frames (e.g. dynamic speaker identification updates)
                if "text" in message:
                    try:
                        ctrl = json.loads(message["text"])
                        if ctrl.get("type") == "speaker_update":
                            s_id = int(ctrl.get("stream_id", StreamId.TAB))
                            s_name = str(ctrl.get("speaker_name", "")).strip()
                            if s_name:
                                # Truncate to 50 chars to adhere to DB column schema
                                speaker_by_stream[s_id] = s_name[:50]
                                logger.info(
                                    f"[Ingestion] Session {session_id} stream {s_id} speaker updated -> '{speaker_by_stream[s_id]}'"
                                )
                    except Exception as e:
                        logger.debug(
                            f"[Ingestion] Failed to parse text control message: {e}"
                        )
                    continue

                if "bytes" not in message:
                    continue

                raw_bytes: bytes = message["bytes"]
                if len(raw_bytes) < 16:
                    continue

                # Unpack 16-byte fixed header:
                # version (uint8), stream_id (uint8), flags (uint16), seq (uint32), start_sample (uint64)
                version, stream_id, flags, seq, start_sample = struct.unpack_from(
                    "<BBHIQ", raw_bytes, 0
                )
                payload_bytes = raw_bytes[16:]

                if flags & 0x01:
                    logger.info(
                        f"[Ingestion] Received EOS frame for stream {stream_id} on session {session_id}"
                    )
                    break

                if len(payload_bytes) == 0:
                    continue

                # Check sequence monotonicity and detect gaps
                if stream_id in last_seq_by_stream:
                    expected_seq = last_seq_by_stream[stream_id] + 1
                    if seq > expected_seq:
                        gap_count = seq - expected_seq
                        logger.warning(
                            f"[Ingestion] Gap detected on stream {stream_id}: expected {expected_seq}, got {seq} (lost {gap_count} frames)"
                        )
                        # Respond with gap notification so producer can resend if needed
                        try:
                            await websocket.send_json(
                                {
                                    "type": "audio.gap_detected",
                                    "stream_id": stream_id,
                                    "expected_seq": expected_seq,
                                    "received_seq": seq,
                                }
                            )
                        except Exception:
                            pass

                last_seq_by_stream[stream_id] = seq

                # Convert payload to int16 PCM array
                pcm16 = np.frombuffer(payload_bytes, dtype=np.int16)

                # Get or create per-stream utterance buffer
                if stream_id not in buffers:
                    buffers[stream_id] = UtteranceBuffer(sample_rate=16000)
                buf = buffers[stream_id]

                # Feed frame into utterance buffer with VAD gating
                should_emit_partial, is_endpointed = buf.push_frame(
                    pcm16, start_sample, vad_detector
                )

                speaker_label = speaker_by_stream.get(
                    stream_id,
                    SpeakerLabel.LOCAL_USER.value
                    if stream_id == StreamId.MIC
                    else SpeakerLabel.REMOTE_SPEAKER.value,
                )

                # 1. Handle Final Utterance Endpointing (Non-blocking background task)
                if is_endpointed:
                    # Cancel any in-flight partial task for this stream to free CPU for final utterance
                    p_task = active_partial_tasks.get(stream_id)
                    if p_task and not p_task.done():
                        p_task.cancel()

                    final_res = buf.finish_utterance()
                    if final_res is not None:
                        final_audio, utt_start, utt_end = final_res
                        if len(final_audio) >= 4000:
                            utterance_counter += 1
                            utterance_id = f"utt_{utt_start}_{utterance_counter}"
                            task = asyncio.create_task(
                                self._process_final_utterance(
                                    session_id=session_id,
                                    final_audio=final_audio,
                                    utt_start=utt_start,
                                    utt_end=utt_end,
                                    speaker_label=speaker_label,
                                    utterance_id=utterance_id,
                                )
                            )
                            pending_final_tasks.add(task)
                            pending_final_tasks = {
                                t for t in pending_final_tasks if not t.done()
                            }

                # 2. Handle Partial Transcription event (Only if no partial is currently running and engine is idle)
                elif should_emit_partial:
                    if not self.whisper_engine.is_busy:
                        prev_task = active_partial_tasks.get(stream_id)
                        if prev_task is None or prev_task.done():
                            current_audio, utt_start, utt_end = buf.get_current_audio()
                            if len(current_audio) >= 4000:
                                task = asyncio.create_task(
                                    self._process_partial_utterance(
                                        session_id=session_id,
                                        current_audio=current_audio,
                                        utt_start=utt_start,
                                        utt_end=utt_end,
                                        speaker_label=speaker_label,
                                    )
                                )
                                active_partial_tasks[stream_id] = task

                # Send Ack every 50 frames (~5s)
                if seq % 50 == 0:
                    try:
                        await websocket.send_json(
                            {
                                "type": "audio.ack",
                                "stream_id": stream_id,
                                "last_seq": seq,
                                "start_sample": start_sample,
                            }
                        )
                    except Exception:
                        pass

        except (WebSocketDisconnect, RuntimeError):
            logger.info(
                f"[Ingestion] Producer WebSocket disconnected for session {session_id}"
            )
        except Exception as e:
            logger.error(f"[Ingestion] Error in producer stream {session_id}: {e}")
        finally:
            # Endpoint remaining speech across all active stream buffers
            for sid, buf in buffers.items():
                final_res = buf.finish_utterance()
                if final_res is not None:
                    final_audio, utt_start, utt_end = final_res
                    if len(final_audio) >= 4000:
                        utterance_counter += 1
                        utterance_id = f"utt_{utt_start}_last_{utterance_counter}"
                        s_label = speaker_by_stream.get(
                            sid,
                            SpeakerLabel.LOCAL_USER.value
                            if sid == StreamId.MIC
                            else SpeakerLabel.REMOTE_SPEAKER.value,
                        )
                        task = asyncio.create_task(
                            self._process_final_utterance(
                                session_id=session_id,
                                final_audio=final_audio,
                                utt_start=utt_start,
                                utt_end=utt_end,
                                speaker_label=s_label,
                                utterance_id=utterance_id,
                            )
                        )
                        pending_final_tasks.add(task)

            # Await all remaining transcription tasks before exiting
            if pending_final_tasks:
                await asyncio.gather(*pending_final_tasks, return_exceptions=True)
