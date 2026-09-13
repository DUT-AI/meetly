# Meetly Agent Guidelines

Welcome to Meetly! This workspace uses the Antigravity agent system located in `.agents/`.

## Active Customizations
- **Skills Directory**: `.agents/skills/` (20 domain and workflow skills including `cook`, `plan`, `scout`, `fix`, `backend-development`, `frontend-development`, `ui-ux-pro-max`, `ai-multimodal`, `media-processing`, etc.)
- **Rules Directory**: `.agents/rules/`

## Primary Workflow
When developing features, bugfixes, or refactoring:
- **Feature Orchestration**: Activate the `cook` skill (`.agents/skills/cook/SKILL.md`) for end-to-end implementation with review gates.
- **Backend Architecture**: Follow modular monolith standards in `modules/`, using FastAPI, Dishka DI, SQLAlchemy 2.0 Async, and PostgreSQL.
- **Frontend Architecture**: Follow feature-based architecture in `web/src/features/`, using Next.js 14 App Router, TanStack Query v5, TailwindCSS, and Radix UI.
- **Audio & AI Pipeline**: Audio meeting capture, chunking via FFmpeg (`media-processing`), MinIO storage (`storage`), and Gemini Multimodal transcription (`ai-multimodal`).
