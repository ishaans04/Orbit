# AI Daily Briefing Assistant

Phase 1 scaffold for a multi-agent daily briefing assistant. It uses FastAPI, typed Pydantic agent contracts, mock JSON fixtures, SSE status streaming, a React/Vite dashboard, and feedback-aware priority ranking.

## What Is Built

- Planner Agent that selects email, calendar, and task agents based on the user request.
- Email, Calendar, Task, Priority, and Final Briefing agents using structured schemas.
- Mock data fixtures for email, calendar, tasks, and feedback.
- `POST /api/briefing/generate` streaming agent status events and final briefing JSON.
- `POST /api/feedback` storing thumbs up/down style feedback in `backend/data/mock/feedback.json`.
- React dashboard for request entry, live agent status, briefing sections, top priorities, and feedback controls.

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Useful Requests

- `generate_daily_briefing`
- `Do I have scheduling conflicts today?`
- `Any urgent emails from my manager?`
- `Which tasks are due soon?`

## Project Layout

```text
backend/
  app/
    agents/          # Planner, specialized agents, priority, final briefing
    llm/             # Provider interface placeholder for OpenAI/Gemini adapters
    services/        # Fixture and feedback stores
    main.py          # FastAPI app
    orchestrator.py  # Sequential typed agent orchestration + SSE
    schemas.py       # Pydantic contracts
  data/mock/         # Phase 1 JSON fixtures
frontend/
  src/               # React dashboard
```

## Next Build Steps

- Add a real `OpenAIProvider` or `GeminiProvider` behind `LLMProvider`.
- Persist feedback and briefing history in SQLite for Phase 2.
- Add Google OAuth, Gmail, and Calendar integrations behind the same raw-data schemas.
