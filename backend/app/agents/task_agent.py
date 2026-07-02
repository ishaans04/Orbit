from __future__ import annotations

from app.schemas import BriefingTask, RawTask, TaskAgentOutput


def analyze_tasks(tasks: list[RawTask], scope: str) -> TaskAgentOutput:
    pending = [
        BriefingTask(
            id=task.id,
            title=task.title,
            due_date=task.due_date,
            estimated_effort_minutes=task.estimated_effort_minutes or 45,
            source=task.source,
        )
        for task in tasks
        if task.status.lower() == "pending"
    ]
    pending.sort(key=lambda task: (task.due_date is None, task.due_date))
    return TaskAgentOutput(tasks=pending)
