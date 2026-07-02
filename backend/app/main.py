from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.orchestrator import stream_briefing
from app.schemas import FeedbackCreate, GenerateBriefingRequest
from app.services.feedback_store import load_feedback, record_feedback
from app.services.fixture_store import load_calendar_events, load_emails, load_tasks

app = FastAPI(title="AI Daily Briefing Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
