from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter
from sqlmodel import select

from app.db import session_scope
from app.models import FeedbackRecordDB
from app.schemas import FeedbackCreate, FeedbackRecord
from app.services.fixture_store import MOCK_DIR, load_emails, load_tasks

FEEDBACK_PATH = MOCK_DIR / "feedback.json"


def _ensure_feedback_file() -> None:
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not FEEDBACK_PATH.exists():
        FEEDBACK_PATH.write_text("[]", encoding="utf-8")


def load_feedback() -> list[FeedbackRecord]:
    with session_scope() as session:
        records = session.exec(
            select(FeedbackRecordDB).order_by(FeedbackRecordDB.timestamp)
        ).all()
        if records:
            return [_to_schema(record) for record in records]

    return _load_legacy_feedback()


def infer_item_features(item_id: str, item_type: str) -> dict[str, Any]:
    if item_type == "email":
        email = next((item for item in load_emails() if item.id == item_id), None)
        if not email:
            return {}
        sender_domain = email.sender.split("@")[-1].lower()
        return {
            "sender_domain": sender_domain,
            "has_deadline": email.deadline is not None,
            "keyword_tags": _keyword_tags(f"{email.subject} {email.body}"),
        }
    if item_type == "task":
        task = next((item for item in load_tasks() if item.id == item_id), None)
        if not task:
            return {}
        return {
            "has_deadline": task.due_date is not None,
            "keyword_tags": _keyword_tags(task.title),
        }
    return {}


def record_feedback(feedback: FeedbackCreate) -> FeedbackRecord:
    features = feedback.item_features or infer_item_features(
        feedback.item_id, feedback.item_type
    )
    db_record = FeedbackRecordDB(
        item_id=feedback.item_id,
        item_type=feedback.item_type,
        action=feedback.action,
        item_features=features,
        timestamp=datetime.now(timezone.utc),
    )
    with session_scope() as session:
        session.add(db_record)
        session.commit()
        session.refresh(db_record)
        return _to_schema(db_record)


def summarize_feedback(records: list[FeedbackRecord]) -> list[str]:
    if not records:
        return ["No prior feedback yet. Use base urgency signals."]

    sender_votes: dict[str, Counter[str]] = {}
    deadline_votes: Counter[str] = Counter()
    type_votes: dict[str, Counter[str]] = {}

    for record in records[-50:]:
        features = record.item_features or {}
        item_type = record.item_type
        type_votes.setdefault(item_type, Counter())[record.action] += 1
        if features.get("has_deadline"):
            deadline_votes[record.action] += 1
        sender_domain = features.get("sender_domain")
        if isinstance(sender_domain, str):
            sender_votes.setdefault(sender_domain, Counter())[record.action] += 1

    summary = []
    for item_type, votes in type_votes.items():
        summary.append(
            f"{item_type}: {votes.get('up', 0)} upvotes, {votes.get('down', 0)} downvotes"
        )
    for domain, votes in sender_votes.items():
        if votes.get("down", 0) >= 2 and votes.get("down", 0) > votes.get("up", 0):
            summary.append(f"User often deprioritizes email from {domain}.")
        if votes.get("up", 0) >= 2 and votes.get("up", 0) > votes.get("down", 0):
            summary.append(f"User often prioritizes email from {domain}.")
    if deadline_votes.get("up", 0) > deadline_votes.get("down", 0):
        summary.append("User tends to value items with explicit deadlines.")

    return summary or ["Feedback exists, but no strong preference pattern yet."]


def _keyword_tags(text: str) -> list[str]:
    lowered = text.lower()
    tags = []
    for keyword in ["deadline", "review", "urgent", "meeting", "invoice", "newsletter"]:
        if keyword in lowered:
            tags.append(keyword)
    return tags


def _load_legacy_feedback() -> list[FeedbackRecord]:
    _ensure_feedback_file()
    data = json.loads(FEEDBACK_PATH.read_text(encoding="utf-8"))
    return TypeAdapter(list[FeedbackRecord]).validate_python(data)


def _to_schema(record: FeedbackRecordDB) -> FeedbackRecord:
    return FeedbackRecord(
        item_id=record.item_id,
        item_type=record.item_type,
        action=record.action,
        item_features=record.item_features,
        timestamp=record.timestamp,
    )
