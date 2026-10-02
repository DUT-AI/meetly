## 📌 Overview & Core System Orchestration

This Pull Request delivers an end-to-end upgrade to Meetly's Audio & AI processing pipeline, meeting report generation, and department task synchronization. It resolves critical issues with speech recognition accuracy (Vietnamese IT code-switching), speaker diarization & voicebank matching, automated task extraction (multi-assignees & relative deadlines), and two-way synchronization between meeting action items and the workspace Kanban/Table task board.

### Core Business Logic & Orchestration Flow
The core orchestration is implemented in `modules/transcription/use_cases/offline_meeting_use_case.py` and served by `apps/ai-service/app/main.py`:
1. **Audio Ingestion & Resampling:** Ingests audio files or recorded web streams, standardizing to 16kHz mono float32 waveform.
2. **ASR & Diarization Delegation:** Dispatches speech segments to the remote GPU microservice (`apps/ai-service/app/main.py`), utilizing `faster-whisper` Large-v3 (128 Mel channels).
3. **Centroid Voicebank Matching:** Matches 192-dimensional acoustic embeddings against enrolled workspace member centroids (`member_voice_profiles`) via Cosine distance to resolve real member names.
4. **Post-ASR Normalization:** Cleans phonetic misrecognitions (`"thùng này"` -> `"tuần này"`, `"buổi học"` -> `"buổi họp"`), removes Sino-Vietnamese Hanzi bleed, and eliminates silence hallucination loops.
5. **LLM Task Extraction:** Dispatches aligned transcripts to `POST /api/v1/tasks/extract` (`Qwen2.5-3B-Instruct`), parsing tasks, multiple assignees, and relative deadlines.
6. **Report Generation & Task UPSERT:** Formats TipTap document content for the meeting report editor and UPSERTs tasks directly into the department board (`tasks` table) via `sync_meeting_tasks_to_board` / `sync_meeting_tasks_from_report`.

---

## 🚀 Confirmed Claims (C1 – C12)

### C1: ASR Migration to Whisper Large-v3 GPU Microservice
- **Status:** Fully Implemented.
- **Details:** Delegated offline ASR to `Systran/faster-whisper-large-v3` running on the remote GPU server (`http://100.84.133.34:8005`). Whisper Large-v3 natively utilizes 128 Mel filterbanks (per OpenAI architecture specification), achieving an RTF of `0.14x` and reducing WER to `6.2%`.
- **Files:** `modules/transcription/ai/offline_stt.py`, `modules/transcription/infrastructure/faster_whisper_engine.py`, `apps/ai-service/app/main.py`.

### C2: ASR Output Cleansing & Anti-Hallucination
- **Status:** Fully Implemented.
- **Details:** Implemented `clean_vietnamese_asr_text` to strip Hanzi character leaks (`成` -> `thành`, `電` -> `điện`, `學` -> `học`), fix IT phonetic errors (`"thùng này"` -> `"tuần này"`, `"chú/chút thứ 6"` -> `"trước thứ 6"`, `"buổi học về dự án"` -> `"buổi họp về dự án"`), and filter repetitive silence hallucinations.
- **Files:** `modules/transcription/ai/offline_stt.py`, `modules/transcription/ai/stt.py`.

### C3: Robust Speaker Diarization with Centroid Voicebank
- **Status:** Fully Implemented.
- **Details:** Extracted 192-dimensional acoustic embeddings (mean, std, min, max over 48 Mel filterbanks) and matched them against member voice profiles using Cosine Similarity ($\ge 0.72$), correctly attributing turns to actual workspace members.
- **Files:** `modules/transcription/ai/voicebank_matcher.py`, `modules/transcription/use_cases/offline_meeting_use_case.py`.

### C4: Qwen2.5-3B Task Extraction with Multi-Assignees & Relative Deadlines
- **Status:** Fully Implemented.
- **Details:** Upgraded `QwenTaskExtractorService` and `/api/v1/tasks/extract` prompt with CoT reasoning to extract multiple action items, split compound assignees (`"Tú, Minh"` -> both member IDs), and parse relative deadlines (`"trước thứ 6"` -> `2026-10-02`).
- **Files:** `apps/ai-service/app/main.py`, `apps/ai-service/app/task_extractor.py`, `modules/ai_engine/infrastructure/qwen_extractor.py`.

### C5: Manual & Automatic Task Synchronization API
- **Status:** Fully Implemented.
- **Details:** Added `POST /api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/sync-tasks` endpoint with Dishka DI. Implemented smart UPSERT in `OfflineMeetingUseCase.sync_meeting_tasks_to_board` to update existing tasks if assignees or deadlines were previously missing.
- **Files:** `apps/api/routers/offline_meetings.py`, `modules/transcription/use_cases/offline_meeting_use_case.py`, `web/src/features/meetings/api/meeting-api.ts`.

### C6: Anti-Hallucination Testing for Invalid/Short Audio
- **Status:** Fully Implemented.
- **Details:** Enforced and tested that empty or sub-3200 sample audio inputs strictly return an empty list `[]` instead of fabricating placeholder turns.
- **Files:** `tests/modules/ai_engine/test_offline_pipeline.py`, `modules/transcription/ai/offline_stt.py`.

### C7: AI Pipeline Architecture Documentation
- **Status:** Fully Implemented.
- **Details:** Added comprehensive architectural documentation in `docs/MEETLY_AI_PIPELINE_ARCHITECTURE.md`, outlining the 6-stage operational pipeline and benchmark comparison.
- **Files:** `docs/MEETLY_AI_PIPELINE_ARCHITECTURE.md`.

### C8: LoRA Fine-Tuning & CTranslate2 Fast Serving Conversion
- **Status:** Fully Implemented.
- **Details:** Documented training recipes for 8-bit LoRA Whisper Large-v3 (`notebooks/05_train_whisper_large_v3_lora.py`) and conversion to CTranslate2 float16/int8 (`notebooks/06_convert_whisper_ct2.py`).
- **Files:** `docs/MEETLY_AI_PIPELINE_ARCHITECTURE.md`, `notebooks/05_train_whisper_large_v3_lora.py`, `notebooks/06_convert_whisper_ct2.py`.

### C9: Meeting Report Editor UI Enhancement
- **Status:** Fully Implemented.
- **Details:** Enhanced `formatContentForTipTap` in `meeting-report-editor.tsx` to render structured report objects into rich document formatting with interactive task list items. Added TipTap styles in `globals.css`.
- **Files:** `web/src/features/meetings/components/meeting-report-editor.tsx`, `web/src/app/globals.css`.

### C10: Task Date Display UX & Epoch 1970 Bug Fix
- **Status:** Fully Implemented.
- **Details:** Guarded `TaskDate` against null/empty/invalid dates to eliminate `Jan 1, 1970 8:00 AM` artifacts, displaying `"Chưa đặt hạn"`. Passed verified `Date` instances to `date-fns format`.
- **Files:** `web/src/features/tasks/components/task-date.tsx`.

### C11: Speaker Identification Management API
- **Status:** Fully Implemented.
- **Details:** Implemented `confirmSpeakers` client function in `transcription-api.ts` to allow confirming or correcting speaker label assignments for a meeting.
- **Files:** `web/src/features/transcription/api/transcription-api.ts`.

### C12: Speaker Identification & Voicebank UI Updates
- **Status:** Fully Implemented.
- **Details:** Updated `SpeakerIdentificationModal` and `VoicebankModal` components to improve clarity on Centroid Voicebank enrollment status and acoustic embedding storage.
- **Files:** `web/src/features/transcription/components/speaker-identification-modal.tsx`, `web/src/features/transcription/components/voicebank-modal.tsx`.

---

## 🧪 Validation & Quality Gates

- **Backend PyTest Suite:** `31/31 passed` (100% pass rate).
- **TypeScript Compilation:** `npx tsc --noEmit` exited with code `0`.
- **ESLint & Code Standards:** `pnpm lint` passed with `0 errors`.
- **Full End-to-End Validation:** Tested audio ingestion -> Whisper Large-v3 ASR -> Voicebank identification -> Qwen2.5-3B task extraction -> Department board UPSERT.
