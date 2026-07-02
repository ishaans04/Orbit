from __future__ import annotations

from collections import Counter

from app.schemas import (
    CalendarAgentOutput,
    EmailAgentOutput,
    FeedbackRecord,
    PriorityAgentOutput,
    RankedItem,
    TaskAgentOutput,
)


def prioritize_items(
    email_output: EmailAgentOutput | None,
    calendar_output: CalendarAgentOutput | None,
    task_output: TaskAgentOutput | None,
    feedback: list[FeedbackRecord],
) -> PriorityAgentOutput:
    feedback_by_item = _feedback_by_item(feedback)
    domain_preferences = _domain_preferences(feedback)
    ranked: list[RankedItem] = []

    if email_output:
        for email in email_output.important_emails:
            domain = email.sender.split("@")[-1].lower()
            score = email.urgency_score + 3
            reasons = [email.reason_flagged]
            if email.requires_reply:
                score += 1
                reasons.append("reply needed")
            if email.deadline:
                score += 1
                reasons.append("deadline attached")
            score += domain_preferences.get(domain, 0)
            score += feedback_by_item.get(email.id, 0)
            ranked.append(
                RankedItem(
                    item_id=email.id,
                    type="email",
                    priority_score=_clamp(score),
                    justification="; ".join(reasons),
                )
            )

    if calendar_output:
        conflicted_ids = {
            event_id
            for conflict in calendar_output.conflicts
            for event_id in conflict.event_ids
        }
        for meeting in calendar_output.meetings:
            score = 5
            reasons = ["scheduled today"]
            if meeting.id in conflicted_ids:
                score += 3
                reasons.append("calendar conflict")
            if len(meeting.attendees) > 2:
                score += 1
                reasons.append("multi-person meeting")
            score += feedback_by_item.get(meeting.id, 0)
            ranked.append(
                RankedItem(
                    item_id=meeting.id,
                    type="meeting",
                    priority_score=_clamp(score),
                    justification="; ".join(reasons),
                )
            )

    if task_output:
        for task in task_output.tasks:
            score = 4
            reasons = ["pending task"]
            if task.due_date:
                score += 3
                reasons.append("has due date")
            if task.estimated_effort_minutes <= 30:
                score += 1
                reasons.append("quick win")
            score += feedback_by_item.get(task.id, 0)
            ranked.append(
                RankedItem(
                    item_id=task.id,
                    type="task",
                    priority_score=_clamp(score),
                    justification="; ".join(reasons),
                )
            )

    ranked.sort(key=lambda item: item.priority_score, reverse=True)
    return PriorityAgentOutput(ranked_items=ranked)


def _feedback_by_item(records: list[FeedbackRecord]) -> dict[str, int]:
    scores: dict[str, int] = {}
    for record in records[-50:]:
        scores[record.item_id] = scores.get(record.item_id, 0) + (
            2 if record.action == "up" else -2
        )
    return scores


def _domain_preferences(records: list[FeedbackRecord]) -> dict[str, int]:
    votes: dict[str, Counter[str]] = {}
    for record in records[-50:]:
        domain = (record.item_features or {}).get("sender_domain")
        if isinstance(domain, str):
            votes.setdefault(domain, Counter())[record.action] += 1

    preferences = {}
    for domain, counter in votes.items():
        preferences[domain] = counter.get("up", 0) - counter.get("down", 0)
    return preferences


def _clamp(score: int) -> int:
    return max(1, min(10, score))
