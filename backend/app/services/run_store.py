from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlmodel import Session, desc, select

from app.db import session_scope
from app.models import AgentRunEvent, BriefingOutput, BriefingRun


def create_briefing_run(prompt: str | None) -> BriefingRun:
    run = BriefingRun(
        id=str(uuid4()),
        prompt=(prompt or "generate_daily_briefing").strip() or "generate_daily_briefing",
    )
    with session_scope() as session:
        session.add(run)
        session.commit()
        session.refresh(run)
        return run


def record_agent_event(
    run_id: str,
    agent: str,
    status: str,
    payload: dict[str, Any],
) -> AgentRunEvent:
    event = AgentRunEvent(
        run_id=run_id,
        agent=agent,
        status=status,
        message=payload.get("message"),
        payload=payload,
    )
    with session_scope() as session:
        session.add(event)
        session.commit()
        session.refresh(event)
        return event


def save_briefing_output(
    run_id: str,
    plan: dict[str, Any],
    feedback_summary: list[str],
    briefing: dict[str, Any],
) -> BriefingOutput:
    output = BriefingOutput(
        run_id=run_id,
        plan=plan,
        feedback_summary=feedback_summary,
        briefing=briefing,
    )
    with session_scope() as session:
        session.add(output)
        session.commit()
        session.refresh(output)
        return output


def complete_briefing_run(run_id: str) -> None:
    _finish_run(run_id, "completed")


def fail_briefing_run(run_id: str, message: str) -> None:
    _finish_run(run_id, "failed", message)


def list_briefing_runs(limit: int = 25) -> list[dict[str, Any]]:
    with session_scope() as session:
        runs = session.exec(
            select(BriefingRun).order_by(desc(BriefingRun.created_at)).limit(limit)
        ).all()
        return [_serialize_run_summary(session, run) for run in runs]


def get_briefing_run_detail(run_id: str) -> dict[str, Any] | None:
    with session_scope() as session:
        run = session.get(BriefingRun, run_id)
        if not run:
            return None
        events = session.exec(
            select(AgentRunEvent)
            .where(AgentRunEvent.run_id == run_id)
            .order_by(AgentRunEvent.created_at, AgentRunEvent.id)
        ).all()
        output = session.exec(
            select(BriefingOutput).where(BriefingOutput.run_id == run_id)
        ).first()
        detail = _serialize_run_summary(session, run)
        detail["events"] = [_serialize_event(event) for event in events]
        detail["output"] = _serialize_output(output) if output else None
        return detail


def _finish_run(run_id: str, status: str, message: str | None = None) -> None:
    with session_scope() as session:
        run = session.get(BriefingRun, run_id)
        if not run:
            return
        run.status = status
        run.completed_at = datetime.now(timezone.utc)
        run.error_message = message
        session.add(run)
        session.commit()


def _serialize_run_summary(session: Session, run: BriefingRun) -> dict[str, Any]:
    event_count = len(
        session.exec(select(AgentRunEvent.id).where(AgentRunEvent.run_id == run.id)).all()
    )
    has_output = (
        session.exec(select(BriefingOutput.id).where(BriefingOutput.run_id == run.id)).first()
        is not None
    )
    return {
        "id": run.id,
        "prompt": run.prompt,
        "status": run.status,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "error_message": run.error_message,
        "event_count": event_count,
        "has_output": has_output,
    }


def _serialize_event(event: AgentRunEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "run_id": event.run_id,
        "agent": event.agent,
        "status": event.status,
        "message": event.message,
        "payload": event.payload,
        "created_at": event.created_at,
    }


def _serialize_output(output: BriefingOutput) -> dict[str, Any]:
    return {
        "run_id": output.run_id,
        "plan": output.plan,
        "feedback_summary": output.feedback_summary,
        "briefing": output.briefing,
        "created_at": output.created_at,
    }
