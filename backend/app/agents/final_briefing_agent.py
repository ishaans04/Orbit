from __future__ import annotations

from app.schemas import (
    CalendarAgentOutput,
    EmailAgentOutput,
    FinalBriefingOutput,
    PriorityAgentOutput,
    SuggestedScheduleItem,
    TaskAgentOutput,
    TopPriority,
)


def build_final_briefing(
    email_output: EmailAgentOutput | None,
    calendar_output: CalendarAgentOutput | None,
    task_output: TaskAgentOutput | None,
    priority_output: PriorityAgentOutput,
) -> FinalBriefingOutput:
    lookup = _headline_lookup(email_output, calendar_output, task_output)
    top_ranked = priority_output.ranked_items[:5]
    top_priorities = [
        TopPriority(
            item_id=item.item_id,
            type=item.type,
            headline=lookup.get(item.item_id, item.item_id),
        )
        for item in top_ranked
    ]

    summary = _summary(email_output, calendar_output, task_output, priority_output)
    schedule = _suggested_schedule(calendar_output, task_output, top_ranked, lookup)

    return FinalBriefingOutput(
        summary=summary,
        top_priorities=top_priorities,
        suggested_schedule=schedule,
        full_sections={
            "emails": [
                item.model_dump(mode="json")
                for item in (email_output.important_emails if email_output else [])
            ],
            "meetings": [
                item.model_dump(mode="json")
                for item in (calendar_output.meetings if calendar_output else [])
            ],
            "tasks": [
                item.model_dump(mode="json")
                for item in (task_output.tasks if task_output else [])
            ],
            "ranking": [
                item.model_dump(mode="json") for item in priority_output.ranked_items
            ],
        },
    )


def _headline_lookup(
    email_output: EmailAgentOutput | None,
    calendar_output: CalendarAgentOutput | None,
    task_output: TaskAgentOutput | None,
) -> dict[str, str]:
    lookup = {}
    if email_output:
        lookup.update({item.id: item.subject for item in email_output.important_emails})
    if calendar_output:
        lookup.update({item.id: item.title for item in calendar_output.meetings})
    if task_output:
        lookup.update({item.id: item.title for item in task_output.tasks})
    return lookup


def _summary(
    email_output: EmailAgentOutput | None,
    calendar_output: CalendarAgentOutput | None,
    task_output: TaskAgentOutput | None,
    priority_output: PriorityAgentOutput,
) -> str:
    email_count = len(email_output.important_emails) if email_output else 0
    meeting_count = len(calendar_output.meetings) if calendar_output else 0
    conflict_count = len(calendar_output.conflicts) if calendar_output else 0
    task_count = len(task_output.tasks) if task_output else 0
    top_count = len(priority_output.ranked_items[:3])

    conflict_text = (
        f" There are {conflict_count} scheduling conflict(s) to resolve."
        if conflict_count
        else ""
    )
    return (
        f"Your briefing found {email_count} important email(s), "
        f"{meeting_count} meeting(s), and {task_count} pending task(s). "
        f"The top {top_count} item(s) are ranked by urgency, deadlines, conflicts, and feedback."
        f"{conflict_text}"
    )


def _suggested_schedule(
    calendar_output: CalendarAgentOutput | None,
    task_output: TaskAgentOutput | None,
    top_ranked,
    lookup: dict[str, str],
) -> list[SuggestedScheduleItem]:
    schedule = []

    if calendar_output and calendar_output.conflicts:
        schedule.append(
            SuggestedScheduleItem(
                time_block="Before first meeting",
                activity="Review and resolve calendar conflicts.",
            )
        )

    if task_output and task_output.tasks:
        first_task = task_output.tasks[0]
        schedule.append(
            SuggestedScheduleItem(
                time_block="First open focus block",
                activity=f"Work on: {first_task.title}",
            )
        )

    for item in top_ranked[:2]:
        if item.type == "email":
            schedule.append(
                SuggestedScheduleItem(
                    time_block="Admin block",
                    activity=f"Handle email: {lookup.get(item.item_id, item.item_id)}",
                )
            )

    return schedule[:4]
