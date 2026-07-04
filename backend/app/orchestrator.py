from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from app.agents.calendar_agent import analyze_calendar
from app.agents.email_agent import analyze_emails
from app.agents.final_briefing_agent import build_final_briefing
from app.agents.planner import plan_request
from app.agents.priority_agent import prioritize_items
from app.agents.task_agent import analyze_tasks
from app.schemas import CalendarAgentOutput, EmailAgentOutput, TaskAgentOutput
from app.services.feedback_store import load_feedback, summarize_feedback
from app.services.fixture_store import load_calendar_events, load_emails, load_tasks
from app.services.run_store import (
    complete_briefing_run,
    create_briefing_run,
    fail_briefing_run,
    record_agent_event,
    save_briefing_output,
)


async def stream_briefing(user_request: str | None) -> AsyncIterator[str]:
    run = create_briefing_run(user_request)

    def status(payload: dict[str, Any]) -> str:
        payload = {"run_id": run.id, **payload}
        record_agent_event(
            run.id,
            agent=payload["agent"],
            status=payload["status"],
            payload=payload,
        )
        return _sse("status", payload)

    try:
        yield status({"agent": "planner", "status": "running"})
        await asyncio.sleep(0.15)
        plan = plan_request(user_request)
        yield status(
            {
                "agent": "planner",
                "status": "done",
                "message": plan.reasoning,
                "plan": plan.model_dump(mode="json"),
            },
        )

        email_output: EmailAgentOutput | None = None
        calendar_output: CalendarAgentOutput | None = None
        task_output: TaskAgentOutput | None = None

        for agent_name in plan.agents_to_run:
            yield status({"agent": agent_name, "status": "running"})
            await asyncio.sleep(0.15)
            if agent_name == "email":
                email_output = analyze_emails(load_emails(), plan.scope[agent_name])
                payload = email_output.model_dump(mode="json")
            elif agent_name == "calendar":
                calendar_output = analyze_calendar(
                    load_calendar_events(), plan.scope[agent_name]
                )
                payload = calendar_output.model_dump(mode="json")
            else:
                task_output = analyze_tasks(load_tasks(), plan.scope[agent_name])
                payload = task_output.model_dump(mode="json")
            yield status(
                {
                    "agent": agent_name,
                    "status": "done",
                    "output": payload,
                },
            )

        feedback = load_feedback()
        feedback_summary = summarize_feedback(feedback)
        yield status(
            {
                "agent": "priority",
                "status": "running",
                "message": "Ranking items with recent feedback signals.",
                "feedback_summary": feedback_summary,
            },
        )
        await asyncio.sleep(0.15)
        priority_output = prioritize_items(
            email_output, calendar_output, task_output, feedback
        )
        yield status(
            {
                "agent": "priority",
                "status": "done",
                "output": priority_output.model_dump(mode="json"),
            },
        )

        yield status({"agent": "final_briefing", "status": "running"})
        await asyncio.sleep(0.15)
        briefing = build_final_briefing(
            email_output, calendar_output, task_output, priority_output
        )
        yield status({"agent": "final_briefing", "status": "done"})

        final_payload = {
            "run_id": run.id,
            "plan": plan.model_dump(mode="json"),
            "feedback_summary": feedback_summary,
            "briefing": briefing.model_dump(mode="json"),
        }
        save_briefing_output(
            run.id,
            plan=final_payload["plan"],
            feedback_summary=feedback_summary,
            briefing=final_payload["briefing"],
        )
        complete_briefing_run(run.id)

        yield _sse("final", final_payload)
    except Exception as exc:
        fail_briefing_run(run.id, str(exc))
        yield _sse("error", {"run_id": run.id, "message": str(exc)})


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"
