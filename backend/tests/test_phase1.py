from app.agents.email_agent import analyze_emails
from app.agents.planner import plan_request
from app.agents.priority_agent import prioritize_items
from app.schemas import FeedbackRecord
from app.services.fixture_store import load_emails


def test_planner_selects_calendar_only_for_conflicts():
    plan = plan_request("Do I have scheduling conflicts today?")

    assert plan.agents_to_run == ["calendar"]


def test_planner_selects_email_only_for_manager_email():
    plan = plan_request("Any urgent emails from my manager?")

    assert plan.agents_to_run == ["email"]


def test_feedback_changes_email_priority():
    emails = analyze_emails(load_emails(), "important messages")
    baseline = prioritize_items(emails, None, None, [])
    downvoted = prioritize_items(
        emails,
        None,
        None,
        [
            FeedbackRecord(
                item_id="e1",
                item_type="email",
                action="down",
                item_features={"sender_domain": "company.com", "has_deadline": True},
                timestamp="2026-07-02T08:00:00Z",
            )
        ],
    )

    baseline_score = next(
        item.priority_score for item in baseline.ranked_items if item.item_id == "e1"
    )
    downvoted_score = next(
        item.priority_score for item in downvoted.ranked_items if item.item_id == "e1"
    )

    assert downvoted_score < baseline_score
