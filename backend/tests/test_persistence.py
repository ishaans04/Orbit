from sqlmodel import delete

from app.db import init_db, session_scope
from app.models import AgentRunEvent, BriefingOutput, BriefingRun, FeedbackRecordDB
from app.schemas import FeedbackCreate
from app.services.feedback_store import load_feedback, record_feedback
from app.services.run_store import (
    complete_briefing_run,
    create_briefing_run,
    get_briefing_run_detail,
    list_briefing_runs,
    record_agent_event,
    save_briefing_output,
)


def clear_persistence_tables():
    init_db()
    with session_scope() as session:
        session.exec(delete(BriefingOutput))
        session.exec(delete(AgentRunEvent))
        session.exec(delete(BriefingRun))
        session.exec(delete(FeedbackRecordDB))
        session.commit()


def test_feedback_saves_to_database():
    clear_persistence_tables()

    record = record_feedback(
        FeedbackCreate(item_id="e1", item_type="email", action="up")
    )
    records = load_feedback()

    assert record.item_id == "e1"
    assert len(records) == 1
    assert records[0].action == "up"
    assert records[0].item_features is not None


def test_briefing_run_history_persists_events_and_output():
    clear_persistence_tables()

    run = create_briefing_run("Morning Brief")
    record_agent_event(
        run.id,
        agent="planner",
        status="running",
        payload={"agent": "planner", "status": "running"},
    )
    record_agent_event(
        run.id,
        agent="planner",
        status="done",
        payload={"agent": "planner", "status": "done", "message": "Plan ready"},
    )
    save_briefing_output(
        run.id,
        plan={"agents_to_run": ["email"]},
        feedback_summary=["No prior feedback yet."],
        briefing={
            "summary": "Brief complete.",
            "top_priorities": [],
            "suggested_schedule": [],
            "full_sections": {},
        },
    )
    complete_briefing_run(run.id)

    runs = list_briefing_runs()
    detail = get_briefing_run_detail(run.id)

    assert runs[0]["id"] == run.id
    assert runs[0]["status"] == "completed"
    assert runs[0]["event_count"] == 2
    assert detail is not None
    assert detail["output"]["briefing"]["summary"] == "Brief complete."
    assert [event["status"] for event in detail["events"]] == ["running", "done"]
