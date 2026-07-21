"""
Apply service — executes user-confirmed recommendations.
Revalidates every action before writing. Generation never calls this.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from db.connection import execute_query
from coach.schemas import (
    ALLOWED_ACTION_TYPES,
    ALLOWED_KINDS,
    CoachContext,
    Recommendation,
)
from coach.context_assembler import assemble_context
from coach.validator import validate_draft, CoachDraft, CoachMode, CoachSummary


class ApplyResult:
    def __init__(self):
        self.applied: List[str] = []
        self.skipped: List[str] = []
        self.warnings: List[str] = []


def apply_recommendations(
    user_id: int,
    recommendation_ids: List[str],
    recommendations: List[dict],
    date: str,
) -> ApplyResult:
    """
    Revalidates then applies only the user-selected recommendations.
    Each action is applied atomically — one failure does not block others.
    """
    result = ApplyResult()

    if not recommendation_ids or not recommendations:
        result.warnings.append("No recommendations provided.")
        return result

    # Re-assemble fresh context to revalidate against current state
    context = assemble_context(user_id, date)

    # Build a minimal draft from the submitted recommendations
    draft = CoachDraft(
        type=CoachMode.daily,
        summary=CoachSummary(headline="", detail=""),
        recommendations=recommendations,
        warnings=[],
        evidence=[],
        actions=[],
    )

    valid_recs, validation_warnings = validate_draft(draft, context)
    result.warnings.extend(validation_warnings)

    valid_by_id = {r.id: r for r in valid_recs}
    selected_ids = set(recommendation_ids)

    for rec_id in selected_ids:
        if rec_id not in valid_by_id:
            result.skipped.append(rec_id)
            result.warnings.append(f"{rec_id}: skipped — failed revalidation before applying.")
            continue

        rec = valid_by_id[rec_id]
        try:
            _apply_one(user_id, rec, date, context)
            result.applied.append(rec_id)
            _record_outcome(user_id, rec, "accepted", date)
        except Exception as exc:
            result.skipped.append(rec_id)
            result.warnings.append(f"{rec_id}: could not apply — {exc}")
            _record_outcome(user_id, rec, "not_completed", date)

    # Record ignored recs (were in context but user didn't select them)
    all_rec_ids = {r.get("id") for r in recommendations if isinstance(r, dict)}
    ignored_ids = all_rec_ids - selected_ids
    for rec_id in ignored_ids:
        # Find the rec data
        raw = next((r for r in recommendations if isinstance(r, dict) and r.get("id") == rec_id), None)
        if raw:
            _record_outcome_raw(user_id, raw, "ignored", date)

    return result


def _apply_one(user_id: int, rec: Recommendation, date: str, context: CoachContext) -> None:
    action = rec.proposed_action
    atype = action.type

    if atype == "create_calendar_block":
        _create_calendar_block(user_id, rec, action, date)

    elif atype == "defer_task":
        _defer_task(user_id, action)

    elif atype == "update_task_priority":
        _update_task_priority(user_id, action)

    elif atype == "suggest_habit":
        # Habit suggestion is informational only — mark as noted
        pass

    elif atype == "none":
        pass  # reflect / preserve_rest — no DB write needed

    else:
        raise ValueError(f"Unhandled action type: {atype}")


def _create_calendar_block(user_id: int, rec: Recommendation, action, date: str) -> None:
    # Resolve item_type and item_id from the stable IDs
    item_type = None
    item_id = None

    if action.task_id and action.task_id.startswith("task_"):
        item_type = "task"
        item_id = int(action.task_id.split("_")[1])
    elif action.habit_id and action.habit_id.startswith("habit_"):
        item_type = "habit"
        item_id = int(action.habit_id.split("_")[1])
    else:
        raise ValueError("create_calendar_block requires a task_id or habit_id")

    start_dt = datetime.fromisoformat(action.start)
    end_dt = datetime.fromisoformat(action.end)
    duration = int((end_dt - start_dt).total_seconds() / 60)

    execute_query(
        """
        INSERT INTO scheduled_items
            (user_id, item_type, item_id, scheduled_date, scheduled_time, duration_minutes, is_confirmed)
        VALUES (%s, %s, %s, %s, %s, %s, true)
        ON CONFLICT (item_type, item_id, scheduled_date) DO UPDATE
            SET scheduled_time = EXCLUDED.scheduled_time,
                duration_minutes = EXCLUDED.duration_minutes,
                is_confirmed = true
        """,
        (user_id, item_type, item_id, date, start_dt.strftime("%H:%M:%S"), duration),
        fetch_all=False,
    )


def _defer_task(user_id: int, action) -> None:
    if not action.task_id or not action.task_id.startswith("task_"):
        raise ValueError("defer_task requires a task_id")
    task_id = int(action.task_id.split("_")[1])
    execute_query(
        """
        UPDATE tasks
        SET due_date = due_date + INTERVAL '1 day', updated_at = NOW()
        WHERE id = %s AND user_id = %s
        """,
        (task_id, user_id),
        fetch_all=False,
    )


def _update_task_priority(user_id: int, action) -> None:
    if not action.task_id or not action.task_id.startswith("task_"):
        raise ValueError("update_task_priority requires a task_id")
    if action.new_priority not in ("low", "medium", "high"):
        raise ValueError(f"Invalid priority: {action.new_priority}")
    task_id = int(action.task_id.split("_")[1])
    execute_query(
        "UPDATE tasks SET priority = %s, updated_at = NOW() WHERE id = %s AND user_id = %s",
        (action.new_priority, task_id, user_id),
        fetch_all=False,
    )


def _record_outcome(user_id: int, rec: Recommendation, outcome: str, date: str) -> None:
    action = rec.proposed_action
    target_id = action.task_id or action.habit_id
    proposed = f"{action.type}"
    if action.start:
        proposed += f" {action.start}–{action.end}"

    try:
        execute_query(
            """
            INSERT INTO coach_recommendations
                (user_id, recommendation_kind, target_id, proposed_change, outcome, coach_mode, generated_at, resolved_at)
            VALUES (%s, %s, %s, %s, %s, 'daily', NOW(), NOW())
            """,
            (user_id, rec.kind, target_id, proposed, outcome),
            fetch_all=False,
        )
    except Exception:
        pass  # history recording must never block apply


def _record_outcome_raw(user_id: int, raw: dict, outcome: str, date: str) -> None:
    kind = raw.get("kind", "unknown")
    action = raw.get("proposed_action") or {}
    target_id = action.get("task_id") or action.get("habit_id")
    try:
        execute_query(
            """
            INSERT INTO coach_recommendations
                (user_id, recommendation_kind, target_id, proposed_change, outcome, coach_mode, generated_at, resolved_at)
            VALUES (%s, %s, %s, %s, %s, 'daily', NOW(), NOW())
            """,
            (user_id, kind, target_id, action.get("type"), outcome),
            fetch_all=False,
        )
    except Exception:
        pass
