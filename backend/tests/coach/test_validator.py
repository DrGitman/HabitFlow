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


def _make_context(tasks=None, habits=None, blocks=None, available=480) -> CoachContext:
    return CoachContext(
        date=TODAY,
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


def _valid_rec(rec_id="rec_1", start_hour=13, duration_minutes=60):
    start = f"{TODAY}T{start_hour:02d}:00:00"
    end_dt = datetime.fromisoformat(start) + timedelta(minutes=duration_minutes)
    end = end_dt.isoformat()
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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestValidKindAndAction:
    def test_valid_daily_recommendation_passes(self):
        ctx = _make_context()
        draft = _make_draft([_valid_rec()])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 1
        assert recs[0].id == "rec_1"
        assert recs[0].requires_confirmation is True
        # No validation warnings expected
        assert not warnings

    def test_valid_rec_has_evidence(self):
        ctx = _make_context()
        draft = _make_draft([_valid_rec()])
        recs, _ = validate_draft(draft, ctx)
        assert len(recs[0].evidence) == 1
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
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["start"] = "2000-01-01T10:00:00"
        rec["proposed_action"]["end"] = "2000-01-01T11:00:00"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("past" in w for w in warnings)

    def test_block_on_wrong_date_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["start"] = f"{TOMORROW}T10:00:00"
        rec["proposed_action"]["end"] = f"{TOMORROW}T11:00:00"
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("target date" in w for w in warnings)

    def test_block_past_1730_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec(start_hour=17, duration_minutes=60)  # 17:00–18:00
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("17:30" in w for w in warnings)

    def test_overlapping_existing_block_is_rejected(self):
        existing = ContextCalendarBlock(
            start=f"{TODAY}T13:00:00",
            end=f"{TODAY}T14:00:00",
            label="Team meeting",
        )
        ctx = _make_context(blocks=[existing])
        rec = _valid_rec(start_hour=13, duration_minutes=60)  # same slot
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("overlaps" in w for w in warnings)

    def test_exceeding_available_minutes_is_rejected(self):
        ctx = _make_context(available=30)  # only 30 min available
        rec = _valid_rec(start_hour=13, duration_minutes=60)  # wants 60 min
        draft = _make_draft([rec])
        recs, warnings = validate_draft(draft, ctx)
        assert len(recs) == 0
        assert any("exceed" in w for w in warnings)

    def test_end_before_start_is_rejected(self):
        ctx = _make_context()
        rec = _valid_rec()
        rec["proposed_action"]["start"] = f"{TODAY}T14:00:00"
        rec["proposed_action"]["end"] = f"{TODAY}T13:00:00"  # end before start
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
        draft = _make_draft([_valid_rec()])
        response = build_response(draft, ctx, "2026-07-21T10:00:00+00:00")
        assert response.type == CoachMode.daily
        assert response.generated_at == "2026-07-21T10:00:00+00:00"
        assert isinstance(response.summary.headline, str)
        assert len(response.recommendations) == 1
