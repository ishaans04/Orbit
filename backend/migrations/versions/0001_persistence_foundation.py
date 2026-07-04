"""persistence foundation

Revision ID: 0001_persistence_foundation
Revises:
Create Date: 2026-07-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_persistence_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "briefingrun",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("prompt", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_briefingrun_created_at", "briefingrun", ["created_at"])
    op.create_index("ix_briefingrun_status", "briefingrun", ["status"])

    op.create_table(
        "agentrunevent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("agent", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["briefingrun.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agentrunevent_agent", "agentrunevent", ["agent"])
    op.create_index("ix_agentrunevent_created_at", "agentrunevent", ["created_at"])
    op.create_index("ix_agentrunevent_run_id", "agentrunevent", ["run_id"])
    op.create_index("ix_agentrunevent_status", "agentrunevent", ["status"])

    op.create_table(
        "briefingoutput",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("plan", sa.JSON(), nullable=True),
        sa.Column("feedback_summary", sa.JSON(), nullable=True),
        sa.Column("briefing", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["briefingrun.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id"),
    )
    op.create_index("ix_briefingoutput_run_id", "briefingoutput", ["run_id"])

    op.create_table(
        "feedbackrecorddb",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.String(), nullable=False),
        sa.Column("item_type", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("item_features", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feedbackrecorddb_action", "feedbackrecorddb", ["action"])
    op.create_index("ix_feedbackrecorddb_item_id", "feedbackrecorddb", ["item_id"])
    op.create_index("ix_feedbackrecorddb_item_type", "feedbackrecorddb", ["item_type"])
    op.create_index("ix_feedbackrecorddb_timestamp", "feedbackrecorddb", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_feedbackrecorddb_timestamp", table_name="feedbackrecorddb")
    op.drop_index("ix_feedbackrecorddb_item_type", table_name="feedbackrecorddb")
    op.drop_index("ix_feedbackrecorddb_item_id", table_name="feedbackrecorddb")
    op.drop_index("ix_feedbackrecorddb_action", table_name="feedbackrecorddb")
    op.drop_table("feedbackrecorddb")

    op.drop_index("ix_briefingoutput_run_id", table_name="briefingoutput")
    op.drop_table("briefingoutput")

    op.drop_index("ix_agentrunevent_status", table_name="agentrunevent")
    op.drop_index("ix_agentrunevent_run_id", table_name="agentrunevent")
    op.drop_index("ix_agentrunevent_created_at", table_name="agentrunevent")
    op.drop_index("ix_agentrunevent_agent", table_name="agentrunevent")
    op.drop_table("agentrunevent")

    op.drop_index("ix_briefingrun_status", table_name="briefingrun")
    op.drop_index("ix_briefingrun_created_at", table_name="briefingrun")
    op.drop_table("briefingrun")
