"""
Unit tests for the context assembler.
These tests mock the DB layer so no real PostgreSQL connection is needed.
Run with: python -m pytest tests/coach/test_context_assembler.py -v
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
from datetime import date, timedelta

import pytest

from coach.context_assembler import assemble_context
from coach.schemas import CoachContext

TODAY = date.today().isoformat()
USER_ID = 1


def _mock_task(id=42, title="Finish API integration", priority="high",
               due_date=TODAY, is_completed=False):
    return {
        "id": id, "title": title, "category": "work",
        "priority": priority, "due_date": due_date,
        "is_completed": is_completed, "estimated_minutes": None,
    }


def _mock_habit(id=12, name="Morning workout", frequency="daily",
                current_streak=4, completed_today_count=0):
    return {
        "id": id, "name": name, "frequency": frequency,
        "current_streak": current_streak,
        "completed_today_count": completed_today_count,
    }


def _mock_perf():
    return {"done": 5, "total": 7}


def _mock_habit_perf():
    return {"completed_slots": 18, "possible_slots": 28}


def _mock_planned():
    return {"total": 2170}


def _mock_sessions():
    return {"total": 1575}


# ---------------------------------------------------------------------------
# Helpers for patching DB in context_assembler
# ---------------------------------------------------------------------------

def _make_execute_query_side_effect(tasks, habits, blocks=None,
                                    perf=None, habit_perf=None,
                                    planned=None, sessions=None, history=None):
    """
    Returns a side_effect function that returns different values per call
    in the order context_assembler makes them.
    """
    call_returns = [
        tasks,                                      # 1. open tasks
        habits,                                     # 2. habits
        blocks or [],                               # 3. calendar blocks
        perf or _mock_perf(),                       # 4. task stats
        habit_perf or _mock_habit_perf(),           # 5. habit stats
        planned or _mock_planned(),                 # 6. planned minutes
        sessions or _mock_sessions(),               # 7. focus sessions
        history or [],                              # 8. recommendation history
    ]
    iterator = iter(call_returns)

    def side_effect(query, params=None, fetch_one=False, fetch_all=True):
        try:
            return next(iterator)
        except StopIteration:
            return []

    return side_effect


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestContextShape:
    def test_returns_coach_context_instance(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[_mock_task()],
                habits=[_mock_habit()],
            )
            ctx = assemble_context(USER_ID, TODAY)
        assert isinstance(ctx, CoachContext)

    def test_date_matches_requested_date(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect([], [])
            ctx = assemble_context(USER_ID, TODAY)
        assert ctx.date == TODAY

    def test_task_ids_are_prefixed(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[_mock_task(id=42)], habits=[]
            )
            ctx = assemble_context(USER_ID, TODAY)
        ids = [t.id for t in ctx.tasks]
        assert all(i.startswith("task_") for i in ids)
        assert "task_42" in ids

    def test_habit_ids_are_prefixed(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[], habits=[_mock_habit(id=12)]
            )
            ctx = assemble_context(USER_ID, TODAY)
        ids = [h.id for h in ctx.habits]
        assert all(i.startswith("habit_") for i in ids)
        assert "habit_12" in ids

    def test_no_raw_db_fields_leak(self):
        """Context must not contain raw DB field names like password_hash, user_id, etc."""
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[_mock_task()], habits=[_mock_habit()]
            )
            ctx = assemble_context(USER_ID, TODAY)
        ctx_dict = ctx.model_dump()
        forbidden = {"password_hash", "user_id", "is_active", "is_completed"}
        all_keys = set()

        def collect_keys(d):
            if isinstance(d, dict):
                all_keys.update(d.keys())
                for v in d.values():
                    collect_keys(v)
            elif isinstance(d, list):
                for item in d:
                    collect_keys(item)

        collect_keys(ctx_dict)
        leaked = forbidden & all_keys
        assert not leaked, f"Raw DB fields leaked into context: {leaked}"

    def test_available_minutes_is_non_negative(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect([], [])
            ctx = assemble_context(USER_ID, TODAY)
        assert ctx.available_minutes >= 0

    def test_estimated_minutes_defaults_to_30_when_missing(self):
        task = _mock_task()
        task["estimated_minutes"] = None
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[task], habits=[]
            )
            ctx = assemble_context(USER_ID, TODAY)
        assert ctx.tasks[0].estimated_minutes == 30

    def test_overdue_tasks_separated_from_today_tasks(self):
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        overdue = _mock_task(id=1, due_date=yesterday)
        today_task = _mock_task(id=2, due_date=TODAY)
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[overdue, today_task], habits=[]
            )
            ctx = assemble_context(USER_ID, TODAY)
        overdue_ids = {t.id for t in ctx.overdue_items}
        today_ids = {t.id for t in ctx.tasks}
        assert "task_1" in overdue_ids
        assert "task_2" in today_ids
        assert "task_1" not in today_ids

    def test_habit_completed_today_flag(self):
        completed = _mock_habit(id=5, completed_today_count=1)
        incomplete = _mock_habit(id=6, completed_today_count=0)
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[], habits=[completed, incomplete]
            )
            ctx = assemble_context(USER_ID, TODAY)
        habit_map = {h.id: h for h in ctx.habits}
        assert habit_map["habit_5"].completed_today is True
        assert habit_map["habit_6"].completed_today is False

    def test_constraints_are_present(self):
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect([], [])
            ctx = assemble_context(USER_ID, TODAY)
        assert len(ctx.constraints) >= 1

    def test_empty_db_returns_valid_context(self):
        """Assembler must not crash when user has no tasks, habits, or history."""
        with patch("coach.context_assembler.execute_query") as mock_eq:
            mock_eq.side_effect = _make_execute_query_side_effect(
                tasks=[], habits=[], blocks=[],
                perf={"done": 0, "total": 0},
                habit_perf={"completed_slots": 0, "possible_slots": 0},
                planned={"total": 0},
                sessions={"total": 0},
                history=[],
            )
            ctx = assemble_context(USER_ID, TODAY)
        assert ctx.tasks == []
        assert ctx.habits == []
        assert ctx.available_minutes >= 0
        assert ctx.recent_performance.task_completion_rate_7d == 0.0
