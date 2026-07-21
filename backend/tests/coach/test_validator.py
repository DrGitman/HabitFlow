"""
Unit tests for the coach validator.
Run with: python -m pytest tests/coach/test_validator.py -v
No DB or AI calls — all inputs are constructed in-memory.
"""
import pytest
from datetime import datetime, timedelta

from coach.schemas import (
    CoachContext,
    CoachDraft,
    CoachMode,
    CoachSummary,
    ContextCalendarBlock,
    ContextHabit,
    ContextTask,
    RecentPerformance,
    RecommendationHistory,
)
from coach.validator import validate_draft, build_response


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TODAY = datetime.now().date().isoformat()
TOMORROW = (datetime.now().date() + timedelta(days=1)).isoformat()
# Use tomorrow for calendar block tests so "past" check never fires
SCHED_DATE = TOMORROW


def _make_context(tasks=None, habits=None, blocks=None, available=480, date=None) -> CoachContext:
    return CoachContext(
        date=date or TODAY,
        available_minutes=available,
        tasks=tasks or [
            ContextTask(
                id="task_42",
                title="Finish API integration",
                estimated_minutes=90,
                due_date=TODAY,
                priority="high",
                status="open",
            )
        ],
        habits=habits or [
            ContextHabit(id="habit_12", name="Morning workout", target="daily", completed_today=False, streak=4)
        ],
        overdue_items=[],
        recent_performance=RecentPerformance(
            task_completion_rate_7d=0.71,
            habit_completion_rate_7d=0.64,
            average_planned_minutes_7d=310,
            average_completed_minutes_7d=225,
        ),
        calendar_blocks=blocks or [],
        constraints=[],
        recommendation_history=RecommendationHistory(),
    )


def _make_draft(recommendations=None, warnings=None) -> CoachDraft:
    return CoachDraft(
        type=CoachMode.daily,
        summary={"headline": "Test headline", "detail": "Test detail."},
        recommendations=recommendations or [],
        warnings=warnings or [],
        evidence=[],
        actions=[],
    )


def _block_at(date: str, start_hour: int, duration_minutes: int = 60):
    """Return (start_iso, end_iso) for an explicit date/hour."""
    start = f"{date}T{start_hour:02d}:00:00"
    end = (datetime.fromisoformat(start) + timedelta(minutes=duration_minutes)).isoformat()
    return start, end


def _valid_rec(rec_id="rec_1", start_hour: int = 10, duration_minutes=60, date=None):
    """Calendar-block rec on SCHED_DATE (tomorrow) by default — always in the future."""
    target = date or SCHED_DATE
    start, end = _block_at(target, start_hour, duration_minutes)
    return {
        "id": rec_id,
        "kind": "schedule_task",
        "title": "Finish API integration",
        "reason": "Due today and high priority.",
        "evidence": [
            {"type": "task_due_today", "source_id": "task_42", "detail": "Due today; 90 min estimated."}
        ],
        "confidence": 0.91,
        "proposed_action": {
            "type": "create_calendar_block",
            "task_id": "task_42",
            "habit_id": None,
            "start": start,
            "end": end,
            "new_priority": None,
        },
        "requires_confirmation": True,
    }


def _valid_reflect_rec(rec_id="rec_1"):
    """A reflect rec with no calendar block — passes all validator checks regardless of time."""
    return {
        "id": rec_id,
        "kind": "reflect",
        "title": "Review your week",
        "reason": "You have completed most of your habits this week.",
        "evidence": [
            {"type": "habit_consistency", "source_id": "habit_12", "detail": "4-day streak maintained."}
        ],
        "confidence": 0.80,
        "proposed_action": {"type": "none", "task_id": None, "habit_id": None,
                            "start": None, "end": None, "new_priority": None},
        "requires_confirmation": False,
    }


def _make_context_for_date(target_date: str, **kwargs) -> CoachContext:
    """Context with a specific target date (used for calendar scheduling tests)."""
    return _make_context(date=target_date, **kwargs)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestValidKindAndAction:
    def test_valid_daily_recommendation_passes(self):
        # Use a reflect rec (no calendar block) so time-of-day never matters
        ctx = _make_context()
        draft = _make_draft([_valid_reflect_rec()])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 1
        assert recs[0].id == "rec_1"
        # reflect recs don't require confirmation
        assert not [w for w in warnings if "removed" in w]

    def test_valid_calendar_rec_passes_on_future_date(self):
        # Calendar block on SCHED_DATE (tomorrow) always passes "in the past" check
        ctx = _make_context_for_date(SCHED_DATE)
        draft = _make_draft([_valid_rec()])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 1
        assert recs[0].id == "rec_1"
        assert recs[0].requires_confirmation is True

    def test_valid_rec_has_evidence(self):
        ctx = _make_context_for_date(SCHED_DATE)
        draft = _make_draft([_valid_rec()])
        recs, _ = validate_draft(draft, ctx)
        assert len(recs) >= 1
        assert recs[0].evidence[0].source_id == "task_42"


class TestUnknownIds:
    def test_unknown_task_id_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["task_id"] = "task_999"  # not in context
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("unknown task" in w for w in warnings)

    def test_unknown_habit_id_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["task_id"] = None
        rec["proposed_action"]["habit_id"] = "habit_999"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("unknown habit" in w for w in warnings)


class TestSchedulingConstraints:
    def test_past_start_is_rejected(self):
        ctx = _make_context_for_date("2000-01-01")
        rec = _valid_rec(date="2000-01-01")
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("past" in w for w in warnings)

    def test_block_on_wrong_date_is_rejected(self):
        # Context says SCHED_DATE but rec is set to a different date
        wrong_date = (datetime.now().date() + timedelta(days=2)).isoformat()
        ctx = _make_context_for_date(SCHED_DATE)
        rec = _valid_rec(date=SCHED_DATE)
        rec["proposed_action"]["start"] = f"{wrong_date}T10:00:00"
        rec["proposed_action"]["end"] = f"{wrong_date}T11:00:00"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("target date" in w for w in warnings)

    def test_block_past_1730_is_rejected(self):
        ctx = _make_context_for_date(SCHED_DATE)
        rec = _valid_rec(start_hour=17, duration_minutes=60, date=SCHED_DATE)  # 17:00–18:00
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("17:30" in w for w in warnings)

    def test_overlapping_existing_block_is_rejected(self):
        slot_start, slot_end = _block_at(SCHED_DATE, 10, 60)
        existing = ContextCalendarBlock(start=slot_start, end=slot_end, label="Team meeting")
        ctx = _make_context_for_date(SCHED_DATE, blocks=[existing])
        rec = _valid_rec(start_hour=10, duration_minutes=60, date=SCHED_DATE)
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("overlaps" in w for w in warnings)

    def test_exceeding_available_minutes_is_rejected(self):
        ctx = _make_context_for_date(SCHED_DATE, available=30)  # only 30 min available
        rec = _valid_rec(duration_minutes=60, date=SCHED_DATE)   # wants 60 min
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("exceed" in w for w in warnings)

    def test_end_before_start_is_rejected(self):
        ctx = _make_context_for_date(SCHED_DATE)
        rec = _valid_rec(date=SCHED_DATE)
        rec["proposed_action"]["start"] = f"{SCHED_DATE}T14:00:00"
        rec["proposed_action"]["end"] = f"{SCHED_DATE}T13:00:00"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("not after start" in w for w in warnings)


class TestAllowlists:
    def test_invalid_kind_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["kind"] = "do_magic"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("invalid kind" in w for w in warnings)

    def test_invalid_action_type_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["type"] = "hack_calendar"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("invalid action type" in w for w in warnings)


class TestEmptyAndEdge:
    def test_empty_recommendations_returns_warning(self):
        ctx = _make_context()
        draft = _make_draft([])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert len(warnings) >= 1

    def test_more_than_4_recs_are_capped(self):
        ctx = _make_context()
        recs_raw = [_valid_rec(f"rec_{i}", start_hour=9 + i, duration_minutes=30) for i in range(6)]
        draft = _make_draft(recs_raw)
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) <= 4

    def test_no_side_effects_on_context(self):
        """Validator must not mutate the context object."""
        ctx = _make_context()
        original_block_count = len(ctx.calendar_blocks)
        draft = _make_draft([_valid_rec()])
        validate_draft(draft, ctx)
        assert len(ctx.calendar_blocks) == original_block_count


class TestBuildResponse:
    def test_build_response_structure(self):
        ctx = _make_context()
        draft = _make_draft([_valid_reflect_rec()])
        response = build_response(draft, ctx, "2026-07-21T10:00:00+00:00")
        assert response.type == CoachMode.daily
        assert response.generated_at == "2026-07-21T10:00:00+00:00"
        assert isinstance(response.summary.headline, str)
        assert len(response.recommendations) == 1
