from __future__ import annotations

from datetime import datetime, timezone

from app.schemas import EmailAgentOutput, ImportantEmail, RawEmail


def analyze_emails(emails: list[RawEmail], scope: str) -> EmailAgentOutput:
    important = []
    for email in emails:
        score, reasons = _score_email(email, scope)
        if score >= 2:
            important.append(
                ImportantEmail(
                    id=email.id,
                    sender=email.sender,
                    subject=email.subject,
                    reason_flagged=", ".join(reasons),
                    deadline=email.deadline,
                    requires_reply=_requires_reply(email),
                    suggested_reply=_suggested_reply(email) if _requires_reply(email) else None,
                    urgency_score=min(5, max(1, score)),
                )
            )

    important.sort(key=lambda item: item.urgency_score, reverse=True)
    return EmailAgentOutput(important_emails=important)


def _score_email(email: RawEmail, scope: str) -> tuple[int, list[str]]:
    text = f"{email.sender} {email.subject} {email.body} {' '.join(email.labels)}".lower()
    scope = scope.lower()
    score = 1
    reasons = []

    if not email.read:
        score += 1
        reasons.append("unread")
    if "important" in email.labels:
        score += 2
        reasons.append("marked important")
    if any(word in text for word in ["urgent", "asap", "deadline", "today", "review"]):
        score += 1
        reasons.append("time-sensitive language")
    if email.deadline and email.deadline >= datetime.now(timezone.utc).replace(tzinfo=None):
        score += 1
        reasons.append("explicit deadline")
    if "manager" in text or "manager" in scope:
        score += 1
        reasons.append("leadership sender")
    if "newsletter" in text and "urgent" in scope:
        score -= 2

    return score, reasons or ["potentially relevant"]


def _requires_reply(email: RawEmail) -> bool:
    text = f"{email.subject} {email.body}".lower()
    return any(word in text for word in ["can you", "please", "reply", "review", "confirm"])


def _suggested_reply(email: RawEmail) -> str:
    return f"I'll review '{email.subject}' and follow up today."
