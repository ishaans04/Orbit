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


async def stream_briefing(user_request: str | None) -> AsyncIterator[str]:
    try:
        yield _sse("status", {"agent": "planner", "status": "running"})
        await asyncio.sleep(0.15)
        plan = plan_request(user_request)
        yield _sse(
            "status",
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
            yield _sse("status", {"agent": agent_name, "status": "running"})
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
            yield _sse(
                "status",
                {
                    "agent": agent_name,
                    "status": "done",
                    "output": payload,
                },
            )

        feedback = load_feedback()
        feedback_summary = summarize_feedback(feedback)
        yield _sse(
            "status",
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
        yield _sse(
            "status",
            {
                "agent": "priority",
                "status": "done",
                "output": priority_output.model_dump(mode="json"),
            },
        )

        yield _sse("status", {"agent": "final_briefing", "status": "running"})
        await asyncio.sleep(0.15)
        briefing = build_final_briefing(
            email_output, calendar_output, task_output, priority_output
        )
        yield _sse("status", {"agent": "final_briefing", "status": "done"})

        yield _sse(
            "final",
            {
                "plan": plan.model_dump(mode="json"),
                "feedback_summary": feedback_summary,
                "briefing": briefing.model_dump(mode="json"),
            },
        )
    except Exception as exc:
        yield _sse("error", {"message": str(exc)})


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"
