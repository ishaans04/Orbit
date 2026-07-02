from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


AgentName = Literal["email", "calendar", "task"]
ItemType = Literal["email", "meeting", "task"]
FeedbackAction = Literal["up", "down"]


class GenerateBriefingRequest(BaseModel):
    request: str | None = None


class ExecutionPlan(BaseModel):
    agents_to_run: list[AgentName]
    scope: dict[AgentName, str]
    reasoning: str


class RawEmail(BaseModel):
    id: str
    sender: str
    subject: str
    body: str
    received_at: datetime
    labels: list[str] = Field(default_factory=list)
    read: bool = False
    deadline: datetime | None = None


class ImportantEmail(BaseModel):
    id: str
    sender: str
    subject: str
    reason_flagged: str
    deadline: datetime | None = None
    requires_reply: bool
    suggested_reply: str | None = None
    urgency_score: int = Field(ge=1, le=5)


class EmailAgentOutput(BaseModel):
    important_emails: list[ImportantEmail]


class RawCalendarEvent(BaseModel):
    id: str
    title: str
    start: datetime
    end: datetime
    attendees: list[str] = Field(default_factory=list)


class Meeting(BaseModel):
    id: str
    title: str
    start: datetime
    end: datetime
    attendees: list[str]


class CalendarConflict(BaseModel):
    event_ids: list[str]
    description: str


class FreeBlock(BaseModel):
    start: datetime
    end: datetime
    duration_minutes: int = Field(ge=0)


class CalendarAgentOutput(BaseModel):
    meetings: list[Meeting]
    conflicts: list[CalendarConflict]
    free_blocks: list[FreeBlock]


class RawTask(BaseModel):
    id: str
    title: str
    due_date: datetime | None = None
    status: str = "pending"
    estimated_effort_minutes: int | None = None
    source: Literal["manual", "derived_from_email"] = "manual"


class BriefingTask(BaseModel):
    id: str
    title: str
    due_date: datetime | None = None
    estimated_effort_minutes: int
    source: Literal["manual", "derived_from_email"]


class TaskAgentOutput(BaseModel):
    tasks: list[BriefingTask]


class RankedItem(BaseModel):
    item_id: str
    type: ItemType
    priority_score: int = Field(ge=1, le=10)
    justification: str


class PriorityAgentOutput(BaseModel):
    ranked_items: list[RankedItem]


class TopPriority(BaseModel):
    item_id: str
    type: ItemType
    headline: str


class SuggestedScheduleItem(BaseModel):
    time_block: str
    activity: str


class FinalBriefingOutput(BaseModel):
    summary: str
    top_priorities: list[TopPriority]
    suggested_schedule: list[SuggestedScheduleItem]
    full_sections: dict[str, list[dict[str, Any]]]


class FeedbackCreate(BaseModel):
    item_id: str
    item_type: ItemType
    action: FeedbackAction
    item_features: dict[str, Any] | None = None


class FeedbackRecord(FeedbackCreate):
    timestamp: datetime


class StreamEvent(BaseModel):
    event: Literal["status", "final", "error"]
    payload: dict[str, Any]
