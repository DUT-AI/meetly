import struct
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from modules.transcription.domain.enums import SessionStatus, SpeakerLabel, StreamId
from modules.transcription.infrastructure.event_broadcaster import event_broadcaster
from modules.transcription.infrastructure.faster_whisper_engine import FasterWhisperEngine
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.infrastructure.utterance_buffer import UtteranceBuffer
from modules.transcription.repository.segment_repository import SqlTranscriptSegmentRepository
from modules.transcription.repository.session_repository import SqlTranscriptionSessionRepository


class StreamIngestionUseCase:
    """Coordinates producer audio ingestion, frame validation, VAD, ASR and real-time broadcasting."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        whisper_engine: FasterWhisperEngine,
    ) -> None:
        self.session_factory = session_factory
        self.whisper_engine = whisper_engine

    async def handle_producer_stream(
        self,
        session_id: str,
        websocket: WebSocket,
    ) -> None:
        """
        Handle persistent WebSocket connection from Chrome Extension producer.
        Parses binary audio frames with 16-byte fixed header.
        """
        await websocket.accept()
        logger.info(f"[Ingestion] Producer WebSocket connected for session {session_id}")

        # Update session status to STREAMING
        try:
            async with self.session_factory() as session:
                session_repo = SqlTranscriptionSessionRepository(session)
                await session_repo.update_status(session_id, SessionStatus.STREAMING.value)
                await session.commit()
        except Exception as e:
            logger.warning(f"[Ingestion] Could not update session {session_id} to STREAMING: {e}")

        await event_broadcaster.broadcast(
            session_id,
            {"type": "session.status_changed", "session_id": session_id, "status": SessionStatus.STREAMING.value},
        )

        vad_detector = SileroVADDetector()
        utterance_buffer = UtteranceBuffer(sample_rate=16000)

        last_seq_by_stream: dict[int, int] = {}
        utterance_counter = 0

        try:
            while True:
                message = await websocket.receive()
                if "bytes" not in message:
                    continue

                raw_bytes: bytes = message["bytes"]
                if len(raw_bytes) < 16:
                    continue

                # Unpack 16-byte fixed header:
                # version (uint8), stream_id (uint8), flags (uint16), seq (uint32), start_sample (uint64)
                version, stream_id, flags, seq, start_sample = struct.unpack_from("<BBHIQ", raw_bytes, 0)
                payload_bytes = raw_bytes[16:]

                if flags & 0x01:
                    logger.info(f"[Ingestion] Received EOS frame for stream {stream_id} on session {session_id}")
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
                        await websocket.send_json(
                            {
                                "type": "audio.gap_detected",
                                "stream_id": stream_id,
                                "expected_seq": expected_seq,
                                "received_seq": seq,
                            }
                        )

                last_seq_by_stream[stream_id] = seq

                # Convert payload to int16 PCM array
                pcm16 = np.frombuffer(payload_bytes, dtype=np.int16)

                # Feed frame into utterance buffer with VAD gating
                should_emit_partial, is_endpointed = utterance_buffer.push_frame(
                    pcm16, start_sample, vad_detector
                )

                speaker_label = (
                    SpeakerLabel.LOCAL_USER.value
                    if stream_id == StreamId.MIC
                    else SpeakerLabel.REMOTE_SPEAKER.value
                )

                # 1. Handle Partial Transcription event
                if should_emit_partial:
                    current_audio, utt_start, utt_end = utterance_buffer.get_current_audio()
                    if len(current_audio) >= 4000:  # At least 250ms audio
                        partial_text, _, _ = await self.whisper_engine.transcribe_samples(
                            current_audio, language="vi", beam_size=1, word_timestamps=False
                        )
                        if partial_text:
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
                                    "speaker_label": speaker_label,
                                    "is_final": False,
                                },
                            )

                # 2. Handle Final Utterance Endpointing
                if is_endpointed:
                    final_res = utterance_buffer.finish_utterance()
                    if final_res is not None:
                        final_audio, utt_start, utt_end = final_res
                        if len(final_audio) >= 4000:
                            utterance_counter += 1
                            final_text, words, conf = await self.whisper_engine.transcribe_samples(
                                final_audio, language="vi", beam_size=1, word_timestamps=True
                            )
                            if final_text:
                                base_start_ms = int(utt_start * 1000 / 16000)
                                base_end_ms = int(utt_end * 1000 / 16000)

                                # Adjust word timestamps to absolute media timeline
                                adjusted_words = []
                                for w in words:
                                    adjusted_words.append(
                                        {
                                            "word": w["word"],
                                            "start_ms": base_start_ms + w["start_ms"],
                                            "end_ms": base_start_ms + w["end_ms"],
                                            "score": w["score"],
                                        }
                                    )

                                utterance_id = f"utt_{utt_start}_{utterance_counter}"

                                # Persist final segment to PostgreSQL
                                segment_id = f"temp_{utt_start}"
                                try:
                                    async with self.session_factory() as session:
                                        segment_repo = SqlTranscriptSegmentRepository(session)
                                        saved_segment = await segment_repo.upsert_segment(
                                            session_id=session_id,
                                            utterance_id=utterance_id,
                                            revision=1,
                                            start_ms=base_start_ms,
                                            end_ms=base_end_ms,
                                            text=final_text,
                                            words=adjusted_words,
                                            speaker_label=speaker_label,
                                            confidence=conf,
                                            is_final=True,
                                        )
                                        await session.commit()
                                        segment_id = saved_segment.id
                                except Exception as db_err:
                                    logger.error(f"[Ingestion] Failed to persist segment: {db_err}")

                                # Broadcast final transcript event
                                await event_broadcaster.broadcast(
                                    session_id,
                                    {
                                        "type": "transcript.final",
                                        "session_id": session_id,
                                        "segment_id": segment_id,
                                        "utterance_id": utterance_id,
                                        "revision": 1,
                                        "start_ms": base_start_ms,
                                        "end_ms": base_end_ms,
                                        "text": final_text,
                                        "words": adjusted_words,
                                        "speaker_label": speaker_label,
                                        "confidence": conf,
                                        "is_final": True,
                                    },
                                )

                # Send Ack every 50 frames (~5s)
                if seq % 50 == 0:
                    await websocket.send_json(
                        {
                            "type": "audio.ack",
                            "stream_id": stream_id,
                            "last_seq": seq,
                            "start_sample": start_sample,
                        }
                    )

        except (WebSocketDisconnect, RuntimeError):
            logger.info(f"[Ingestion] Producer WebSocket disconnected for session {session_id}")
        except Exception as e:
            logger.error(f"[Ingestion] Error in producer stream {session_id}: {e}")
        finally:
            # Endpoint remaining speech if any
            final_res = utterance_buffer.finish_utterance()
            if final_res is not None:
                final_audio, utt_start, utt_end = final_res
                if len(final_audio) >= 4000:
                    try:
                        final_text, words, conf = await self.whisper_engine.transcribe_samples(
                            final_audio, language="vi", beam_size=1, word_timestamps=True
                        )
                        if final_text:
                            base_start_ms = int(utt_start * 1000 / 16000)
                            base_end_ms = int(utt_end * 1000 / 16000)
                            utterance_id = f"utt_{utt_start}_last"
                            saved_id = f"temp_{utt_start}_last"
                            try:
                                async with self.session_factory() as session:
                                    segment_repo = SqlTranscriptSegmentRepository(session)
                                    saved = await segment_repo.upsert_segment(
                                        session_id=session_id,
                                        utterance_id=utterance_id,
                                        revision=1,
                                        start_ms=base_start_ms,
                                        end_ms=base_end_ms,
                                        text=final_text,
                                        words=words,
                                        speaker_label=SpeakerLabel.UNKNOWN.value,
                                        confidence=conf,
                                        is_final=True,
                                    )
                                    await session.commit()
                                    saved_id = saved.id
                            except Exception as db_err:
                                logger.error(f"[Ingestion] Failed to persist last segment: {db_err}")

                            await event_broadcaster.broadcast(
                                session_id,
                                {
                                    "type": "transcript.final",
                                    "session_id": session_id,
                                    "segment_id": saved_id,
                                    "utterance_id": utterance_id,
                                    "revision": 1,
                                    "start_ms": base_start_ms,
                                    "end_ms": base_end_ms,
                                    "text": final_text,
                                    "words": words,
                                    "speaker_label": SpeakerLabel.UNKNOWN.value,
                                    "is_final": True,
                                },
                            )
                    except Exception as err:
                        logger.error(f"[Ingestion] Error processing remaining utterance on disconnect: {err}")
