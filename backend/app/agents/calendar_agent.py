from __future__ import annotations

from datetime import datetime, time, timedelta

from app.schemas import (
    CalendarAgentOutput,
    CalendarConflict,
    FreeBlock,
    Meeting,
    RawCalendarEvent,
)


def analyze_calendar(events: list[RawCalendarEvent], scope: str) -> CalendarAgentOutput:
    meetings = [
        Meeting(
            id=event.id,
            title=event.title,
            start=event.start,
            end=event.end,
            attendees=event.attendees,
        )
        for event in sorted(events, key=lambda item: item.start)
    ]
    return CalendarAgentOutput(
        meetings=meetings,
        conflicts=_detect_conflicts(meetings),
        free_blocks=_find_free_blocks(meetings),
    )


def _detect_conflicts(meetings: list[Meeting]) -> list[CalendarConflict]:
    conflicts = []
    for index, meeting in enumerate(meetings[:-1]):
        next_meeting = meetings[index + 1]
        if meeting.end > next_meeting.start:
            conflicts.append(
                CalendarConflict(
                    event_ids=[meeting.id, next_meeting.id],
                    description=f"{meeting.title} overlaps with {next_meeting.title}.",
                )
            )
    return conflicts


def _find_free_blocks(meetings: list[Meeting]) -> list[FreeBlock]:
    if not meetings:
        today = datetime.now().date()
    else:
        today = meetings[0].start.date()

    work_start = datetime.combine(today, time(hour=9))
    work_end = datetime.combine(today, time(hour=17))
    cursor = work_start
    blocks = []

    for meeting in meetings:
        if meeting.start > cursor:
            blocks.append(_free_block(cursor, meeting.start))
        if meeting.end > cursor:
            cursor = meeting.end

    if cursor < work_end:
        blocks.append(_free_block(cursor, work_end))

    return [block for block in blocks if block.duration_minutes >= 30]


def _free_block(start: datetime, end: datetime) -> FreeBlock:
    return FreeBlock(
        start=start,
        end=end,
        duration_minutes=int((end - start) / timedelta(minutes=1)),
    )
