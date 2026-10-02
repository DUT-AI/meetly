import asyncio
import base64
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel, Field

from app.task_extractor import QwenTaskExtractor
from modules.transcription.ai.stt import WhisperASREngine
from modules.transcription.ai.translator import SeamlessTranslationEngine


class ExtractTasksRequest(BaseModel):
    transcript_text: str = Field(..., description="Full meeting transcript text")


class ExtractedTaskDTO(BaseModel):
    task_title: str
    assignee: str | None = None
    deadline: str | None = None
    source_timestamp_ms: int = 0
    confidence: float = 0.95


class ExtractTasksResponse(BaseModel):
    tasks: list[ExtractedTaskDTO]


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    src_lang: str = Field(
        default="vie", description="Source language code (NLLB/Seamless 3-letter: vie)"
    )
    tgt_lang: str = Field(
        default="eng", description="Target language code (NLLB/Seamless 3-letter: eng)"
    )
    max_new_tokens: int = Field(default=256, description="Max generated tokens")


class TranslateResponse(BaseModel):
    translation: str
    src_lang: str
    tgt_lang: str


class TranscribeRequest(BaseModel):
    audio_base64: str = Field(
        ..., description="Base64-encoded PCM16 (16kHz mono) or float32 audio"
    )
    language: str = Field(default="vi", description="Audio language code (e.g. vi)")
    beam_size: int = Field(default=5, description="ASR beam size")
    word_timestamps: bool = Field(
        default=True, description="Enable word level timestamps"
    )
    initial_prompt: str | None = Field(
        default=None, description="Optional prompt context"
    )


class TranscribeResponse(BaseModel):
    text: str
    words: list[dict[str, Any]]
    confidence: float
    language: str
    segments: list[dict[str, Any]] = Field(default_factory=list)


class TranscribeAndTranslateRequest(BaseModel):
    audio_base64: str = Field(
        ..., description="Base64-encoded PCM16 (16kHz mono) audio"
    )
    src_lang: str = Field(default="vie", description="Source language code (vie)")
    tgt_lang: str = Field(default="eng", description="Target language code (eng)")
    beam_size: int = Field(default=5, description="ASR beam size")
    word_timestamps: bool = Field(default=True, description="Enable word timestamps")
    initial_prompt: str | None = Field(
        default=None, description="Optional prompt context"
    )


class TranscribeAndTranslateResponse(BaseModel):
    text: str
    translation: str
    words: list[dict[str, Any]]
    confidence: float
    src_lang: str
    tgt_lang: str


engine: SeamlessTranslationEngine | None = None
asr_engine: WhisperASREngine | None = None
task_extractor: QwenTaskExtractor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global engine, asr_engine, task_extractor
    logger.info("[SeamlessApp] Starting SeamlessTranslation, WhisperASR & QwenTaskExtractor...")
    engine = SeamlessTranslationEngine()
    asr_engine = WhisperASREngine()
    task_extractor = QwenTaskExtractor(device="cuda" if torch.cuda.is_available() else "cpu")
    try:
        task_extractor.load_model()
    except Exception as e:
        logger.warning(f"[SeamlessApp] QwenTaskExtractor eager load failed (will retry lazily): {e}")

    yield
    logger.info(
        "[SeamlessApp] Shutting down SeamlessTranslation, WhisperASR & QwenTaskExtractor..."
    )


app = FastAPI(
    title="Meetly AI Microservice (Whisper large-v3 & Qwen2.5-3B Task Extractor)",
    description="GPU-accelerated Vietnamese ASR, Translation, and Task Extraction microservice",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else "None"
    vram_alloc_mb = (
        round(torch.cuda.memory_allocated(0) / (1024 * 1024), 2) if gpu_available else 0
    )
    return {
        "status": "ok",
        "engine_ready": engine.is_ready() if engine else False,
        "asr_ready": asr_engine.is_ready() if asr_engine else False,
        "task_extractor_ready": task_extractor.is_ready() if task_extractor else False,
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "vram_allocated_mb": vram_alloc_mb,
    }


@app.post("/api/v1/tasks/extract", response_model=ExtractTasksResponse)
async def extract_tasks_endpoint(payload: ExtractTasksRequest) -> ExtractTasksResponse:
    global task_extractor
    if not task_extractor:
        task_extractor = QwenTaskExtractor(device="cuda" if torch.cuda.is_available() else "cpu")

    loop = asyncio.get_running_loop()
    if not task_extractor.is_ready():
        await loop.run_in_executor(None, task_extractor.load_model)

    tasks_raw = await loop.run_in_executor(
        None, task_extractor.extract_tasks, payload.transcript_text
    )
    tasks_dtos = [
        ExtractedTaskDTO(
            task_title=str(t.get("task_title", "")).strip(),
            assignee=str(t.get("assignee")).strip() if t.get("assignee") else None,
            deadline=str(t.get("deadline")).strip() if t.get("deadline") else None,
            source_timestamp_ms=int(t.get("source_timestamp_ms", 0)),
            confidence=float(t.get("confidence", 0.95)),
        )
        for t in tasks_raw
        if t.get("task_title")
    ]
    return ExtractTasksResponse(tasks=tasks_dtos)


@app.post("/api/v1/translate", response_model=TranslateResponse)
async def translate_text(payload: TranslateRequest) -> TranslateResponse:
    if not engine:
        raise Exception("Server busy. Try again later.")

    loop = asyncio.get_running_loop()
    translated = await loop.run_in_executor(
        None,
        engine.translate_text,
        payload.text,
        payload.src_lang,
        payload.tgt_lang,
        payload.max_new_tokens,
    )

    return TranslateResponse(
        translation=translated,
        src_lang=payload.src_lang,
        tgt_lang=payload.tgt_lang,
    )


@app.post("/api/v1/asr/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(payload: TranscribeRequest) -> TranscribeResponse:
    if not asr_engine:
        raise Exception("Server busy. Try again later.")

    audio_bytes = base64.b64decode(payload.audio_base64)
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        asr_engine.transcribe,
        audio_bytes,
        payload.language,
        payload.beam_size,
        payload.word_timestamps,
        payload.initial_prompt,
    )
    return TranscribeResponse(
        text=result.get("text", ""),
        words=result.get("words", []),
        confidence=result.get("confidence", 1.0),
        language=result.get("language", payload.language),
        segments=result.get("segments", []),
    )


@app.post(
    "/api/v1/asr/transcribe-and-translate",
    response_model=TranscribeAndTranslateResponse,
)
async def transcribe_and_translate(
    payload: TranscribeAndTranslateRequest,
) -> TranscribeAndTranslateResponse:
    if not asr_engine:
        raise Exception("Server busy. Try again later.")

    audio_bytes = base64.b64decode(payload.audio_base64)
    loop = asyncio.get_running_loop()

    # 1. ASR on GPU
    asr_res = await loop.run_in_executor(
        None,
        asr_engine.transcribe,
        audio_bytes,
        "vi",
        payload.beam_size,
        payload.word_timestamps,
        payload.initial_prompt,
    )
    text = asr_res.get("text", "")

    # 2. Translation on GPU if text exists
    translation = ""
    if text and engine:
        translation = await loop.run_in_executor(
            None,
            engine.translate_text,
            text,
            payload.src_lang,
            payload.tgt_lang,
        )

    return TranscribeAndTranslateResponse(
        text=text,
        translation=translation,
        words=asr_res.get("words", []),
        confidence=asr_res.get("confidence", 1.0),
        src_lang=payload.src_lang,
        tgt_lang=payload.tgt_lang,
    )


@app.websocket("/api/v1/translate/stream")
async def ws_translate_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("[SeamlessApp] Client connected to /api/v1/translate/stream")

    loop = asyncio.get_running_loop()
    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "")
            src_lang = data.get("src_lang", "vie")
            tgt_lang = data.get("tgt_lang", "eng")
            is_final = data.get("is_final", False)
            utterance_id = data.get("utterance_id", "")

            if not text.strip():
                continue

            if engine:
                translated = await loop.run_in_executor(
                    None,
                    engine.translate_text,
                    text,
                    src_lang,
                    tgt_lang,
                    128 if not is_final else 256,
                )
            else:
                translated = f"[EN] {text}"

            await websocket.send_json(
                {
                    "utterance_id": utterance_id,
                    "text": text,
                    "translation": translated,
                    "is_final": is_final,
                }
            )
    except WebSocketDisconnect:
        logger.info("[SeamlessApp] Client disconnected from /api/v1/translate/stream")
    except Exception as e:
        logger.error(f"[SeamlessApp] WebSocket stream error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
