from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.db import init_db
from app.orchestrator import stream_briefing
from app.schemas import FeedbackCreate, GenerateBriefingRequest
from app.services.feedback_store import load_feedback, record_feedback
from app.services.fixture_store import load_calendar_events, load_emails, load_tasks
from app.services.run_store import get_briefing_run_detail, list_briefing_runs

app = FastAPI(title="AI Daily Briefing Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/briefing/generate")
async def generate_briefing(payload: GenerateBriefingRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_briefing(payload.request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/briefing/runs")
def briefing_runs():
    return list_briefing_runs()


@app.get("/api/briefing/runs/{run_id}")
def briefing_run_detail(run_id: str):
    run = get_briefing_run_detail(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Briefing run not found")
    return run


@app.post("/api/feedback")
def submit_feedback(payload: FeedbackCreate):
    return record_feedback(payload)


@app.get("/api/feedback")
def get_feedback():
    return load_feedback()


@app.get("/api/data/mock/emails")
def mock_emails():
    return load_emails()


@app.get("/api/data/mock/calendar")
def mock_calendar():
    return load_calendar_events()


@app.get("/api/data/mock/tasks")
def mock_tasks():
    return load_tasks()
