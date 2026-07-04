from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "orbit.db"
DATABASE_URL = os.getenv("ORBIT_DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
CURRENT_SCHEMA_REVISION = "0001_persistence_foundation"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def init_db() -> None:
    DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    _stamp_current_revision()


def get_session():
    with Session(engine) as session:
        yield session


def session_scope() -> Session:
    return Session(engine)


def _stamp_current_revision() -> None:
    with engine.begin() as connection:
        connection.execute(
            text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        )
        current = connection.execute(text("SELECT version_num FROM alembic_version")).first()
        if current is None:
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:version_num)"),
                {"version_num": CURRENT_SCHEMA_REVISION},
            )
