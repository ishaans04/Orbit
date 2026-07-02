from __future__ import annotations

from app.schemas import AgentName, ExecutionPlan


DEFAULT_REQUEST = "generate_daily_briefing"


def plan_request(user_request: str | None) -> ExecutionPlan:
    request = (user_request or DEFAULT_REQUEST).strip()
    lowered = request.lower()

    agents: list[AgentName] = []
    scope: dict[AgentName, str] = {}

    if _wants_email(lowered):
        agents.append("email")
        scope["email"] = _email_scope(lowered)
    if _wants_calendar(lowered):
        agents.append("calendar")
        scope["calendar"] = _calendar_scope(lowered)
    if _wants_tasks(lowered):
        agents.append("task")
        scope["task"] = _task_scope(lowered)

    if not agents or lowered in {DEFAULT_REQUEST, "daily briefing", "briefing"}:
        agents = ["email", "calendar", "task"]
        scope = {
            "email": "important, urgent, unread, or reply-needed messages",
            "calendar": "today's meetings, conflicts, and free blocks",
            "task": "all pending tasks due soon",
        }

    return ExecutionPlan(
        agents_to_run=agents,
        scope=scope,
        reasoning=_reasoning(request, agents),
    )


def _wants_email(request: str) -> bool:
    return any(
        word in request
        for word in ["email", "mail", "inbox", "reply", "sender", "manager", "client"]
    )


def _wants_calendar(request: str) -> bool:
    return any(
        word in request
        for word in ["calendar", "meeting", "schedule", "conflict", "free block", "call"]
    )


def _wants_tasks(request: str) -> bool:
    return any(
        word in request
        for word in ["task", "todo", "to-do", "deadline", "due", "assignment", "finish"]
    )


def _email_scope(request: str) -> str:
    if "manager" in request:
        return "messages from manager or direct leadership"
    if "urgent" in request:
        return "urgent and unread messages only"
    if "reply" in request:
        return "messages likely requiring a reply"
    return "important messages relevant to the request"


def _calendar_scope(request: str) -> str:
    if "conflict" in request:
        return "today's meetings with overlap/conflict detection"
    if "free" in request:
        return "today's meetings and available free blocks"
    return "today's meetings relevant to the request"


def _task_scope(request: str) -> str:
    if "due" in request or "deadline" in request:
        return "pending tasks with due dates soonest first"
    return "pending tasks relevant to the request"


def _reasoning(request: str, agents: list[AgentName]) -> str:
    if len(agents) == 3:
        return "The request asks for a full view of the day, so email, calendar, and task agents are needed."
    names = ", ".join(agents)
    return f"The request is scoped, so only the {names} agent(s) need to run."
