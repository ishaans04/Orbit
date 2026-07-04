from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BriefingRun(SQLModel, table=True):
    id: str = Field(primary_key=True)
    prompt: str
    status: str = Field(default="running", index=True)
    created_at: datetime = Field(default_factory=utc_now, index=True)
    completed_at: datetime | None = None
    error_message: str | None = None


class AgentRunEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    run_id: str = Field(foreign_key="briefingrun.id", index=True)
    agent: str = Field(index=True)
    status: str = Field(index=True)
    message: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now, index=True)


class BriefingOutput(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    run_id: str = Field(foreign_key="briefingrun.id", index=True, unique=True)
    plan: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    feedback_summary: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    briefing: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class FeedbackRecordDB(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    item_id: str = Field(index=True)
    item_type: str = Field(index=True)
    action: str = Field(index=True)
    item_features: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=utc_now, index=True)
