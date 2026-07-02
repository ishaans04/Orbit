from __future__ import annotations

import json
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel, TypeAdapter

from app.schemas import RawCalendarEvent, RawEmail, RawTask

ModelT = TypeVar("ModelT", bound=BaseModel)

BACKEND_DIR = Path(__file__).resolve().parents[2]
MOCK_DIR = BACKEND_DIR / "data" / "mock"


def _read_json(filename: str) -> list[dict]:
    path = MOCK_DIR / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _load_list(filename: str, model: type[ModelT]) -> list[ModelT]:
    adapter = TypeAdapter(list[model])
    return adapter.validate_python(_read_json(filename))


def load_emails() -> list[RawEmail]:
    return _load_list("emails.json", RawEmail)


def load_calendar_events() -> list[RawCalendarEvent]:
    return _load_list("calendar.json", RawCalendarEvent)


def load_tasks() -> list[RawTask]:
    return _load_list("tasks.json", RawTask)
