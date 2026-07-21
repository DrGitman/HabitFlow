"""
Context assembler — builds the snapshot sent to the AI model.

Reads live data from the database and produces a CoachContext with only the
fields the model needs: open tasks (sorted by priority), active habits with
streaks, today's calendar blocks, recent 7-day performance stats, and the
last 14 days of recommendation outcomes so the model can adapt to patterns.

Key design decisions:
  - IDs are prefixed (task_42, habit_12) so the model can reference them
    unambiguously and the validator can match them back to real DB rows.
  - Raw DB rows never leave this module — only typed Pydantic objects.
  - Current time is injected as a scheduling constraint so the model
    never proposes blocks that have already passed.
  - Weekly mode gets extra habit completion stats for the past 7 days.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List

from db.connection import execute_query
from coach.schemas import (
    AcceptedPattern,
    ContextCalendarBlock,
    ContextHabit,
    ContextTask,
    CoachContext,
    RecentPerformance,
    RecommendationHistory,
    RecommendationOutcome,
    RejectedPattern,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _today_str(target_date: str) -> str:
    return target_date


def _task_row_to_context(row: dict) -> ContextTask:
    return ContextTask(
        id=f"task_{row['id']}",
        title=row["title"],
        estimated_minutes=int(row.get("estimated_minutes") or 30),
        due_date=str(row["due_date"]) if row.get("due_date") else None,
        priority=row.get("priority") or "medium",
        status="completed" if row.get("is_completed") else "open",
    )


# ---------------------------------------------------------------------------
# Public assembler
# ---------------------------------------------------------------------------

def assemble_weekly_constraints(user_id: int, target_date: str) -> List[str]:
    """Extra constraints injected for weekly review mode."""
    target = date.fromisoformat(target_date)
    week_start = (target - timedelta(days=6)).isoformat()

    completed_habits = execute_query(
        """
        SELECT h.name, COUNT(hc.id) AS days_completed
        FROM habits h
        LEFT JOIN habit_completions hc
            ON hc.habit_id = h.id AND hc.completion_date BETWEEN %s AND %s
        WHERE h.user_id = %s AND h.is_active = true
        GROUP BY h.name
        ORDER BY days_completed DESC
        LIMIT 5
        """,
        (week_start, target_date, user_id),
    ) or []

    lines = []
    for row in completed_habits:
        lines.append(
            f"Habit '{row['name']}' was completed {row['days_completed']}/7 days this week."
        )
    return lines


def assemble_context(user_id: int, target_date: str) -> CoachContext:
    """Build the compact context the model receives. Never returns raw DB rows."""

    target = date.fromisoformat(target_date)
    seven_days_ago = (target - timedelta(days=7)).isoformat()

    # --- Open tasks (not completed, due today or overdue) ---
    task_rows = execute_query(
        """
        SELECT id, title, category, priority, due_date, is_completed
        FROM tasks
        WHERE user_id = %s AND is_completed = false
        ORDER BY
            CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
            due_date ASC NULLS LAST
        LIMIT 20
        """,
        (user_id,),
    ) or []

    due_today: List[ContextTask] = []
    overdue: List[ContextTask] = []
    for row in task_rows:
        ct = _task_row_to_context(row)
        if row.get("due_date"):
            if str(row["due_date"]) == target_date:
                due_today.append(ct)
            elif str(row["due_date"]) < target_date:
                overdue.append(ct)
        else:
            due_today.append(ct)  # undated tasks are surfaced as potential today items

    all_tasks = due_today  # context only carries actionable tasks for today

    # --- Habits ---
    habit_rows = execute_query(
        """
        SELECT h.id, h.name, h.frequency,
               s.current_streak,
               (
                 SELECT COUNT(*) FROM habit_completions hc
                 WHERE hc.habit_id = h.id AND hc.completion_date = %s
               ) AS completed_today_count
        FROM habits h
        LEFT JOIN streaks s ON s.habit_id = h.id AND s.user_id = h.user_id
        WHERE h.user_id = %s AND h.is_active = true
        LIMIT 15
        """,
        (target_date, user_id),
    ) or []

    habits = [
        ContextHabit(
            id=f"habit_{row['id']}",
            name=row["name"],
            target=row.get("frequency") or "daily",
            completed_today=int(row.get("completed_today_count") or 0) > 0,
            streak=int(row.get("current_streak") or 0),
        )
        for row in habit_rows
    ]

    # --- Calendar blocks (scheduled_items for today) ---
    block_rows = execute_query(
        """
        SELECT si.scheduled_time, si.duration_minutes,
               COALESCE(t.title, h.name, 'Item') AS label
        FROM scheduled_items si
        LEFT JOIN tasks t ON si.item_type = 'task' AND si.item_id = t.id
        LEFT JOIN habits h ON si.item_type = 'habit' AND si.item_id = h.id
        WHERE si.user_id = %s AND si.scheduled_date = %s
        ORDER BY si.scheduled_time ASC
        """,
        (user_id, target_date),
    ) or []

    calendar_blocks: List[ContextCalendarBlock] = []
    scheduled_minutes = 0
    for row in block_rows:
        if row.get("scheduled_time"):
            t_str = str(row["scheduled_time"])
            start_dt = datetime.fromisoformat(f"{target_date}T{t_str}")
            dur = int(row.get("duration_minutes") or 30)
            end_dt = start_dt + timedelta(minutes=dur)
            scheduled_minutes += dur
            calendar_blocks.append(
                ContextCalendarBlock(
                    start=start_dt.isoformat(),
                    end=end_dt.isoformat(),
                    label=row["label"],
                )
            )

    # Available minutes: assume 8h working day, minus scheduled blocks
    working_minutes = 8 * 60
    available_minutes = max(0, working_minutes - scheduled_minutes)

    # --- Recent performance (last 7 days) ---
    perf = _assemble_performance(user_id, seven_days_ago, target_date)

    # --- Recommendation history ---
    history = _assemble_history(user_id)

    now = datetime.now()
    current_time_str = now.strftime("%H:%M")
    earliest_start = (now + timedelta(minutes=15)).strftime("%H:%M")

    return CoachContext(
        date=target_date,
        available_minutes=available_minutes,
        tasks=all_tasks,
        habits=habits,
        overdue_items=overdue,
        recent_performance=perf,
        calendar_blocks=calendar_blocks,
        constraints=[
            f"Current time is {current_time_str}. Do not schedule anything before {earliest_start}.",
            "Do not schedule beyond 17:30",
            "Keep at least 15 minutes between focus blocks",
            "Cap Today's Focus at three primary recommendations",
            "Use the habit name (not the habit ID) as the recommendation title",
        ],
        recommendation_history=history,
    )


def _assemble_performance(user_id: int, since: str, until: str) -> RecentPerformance:
    task_stats = execute_query(
        """
        SELECT
            COUNT(*) FILTER (WHERE is_completed) AS done,
            COUNT(*) AS total
        FROM tasks
        WHERE user_id = %s AND created_at::date BETWEEN %s AND %s
        """,
        (user_id, since, until),
        fetch_one=True,
    ) or {}

    done = int(task_stats.get("done") or 0)
    total = int(task_stats.get("total") or 0)
    task_rate = round(done / total, 2) if total else 0.0

    habit_stats = execute_query(
        """
        SELECT
            COUNT(DISTINCT hc.habit_id || hc.completion_date::text) AS completed_slots,
            COUNT(DISTINCT h.id) * 7 AS possible_slots
        FROM habits h
        LEFT JOIN habit_completions hc
            ON hc.habit_id = h.id AND hc.completion_date BETWEEN %s AND %s
        WHERE h.user_id = %s AND h.is_active = true
        """,
        (since, until, user_id),
        fetch_one=True,
    ) or {}

    completed_slots = int(habit_stats.get("completed_slots") or 0)
    possible_slots = int(habit_stats.get("possible_slots") or 1)
    habit_rate = round(completed_slots / possible_slots, 2) if possible_slots else 0.0

    planned_row = execute_query(
        """
        SELECT COALESCE(SUM(duration_minutes), 0) AS total
        FROM scheduled_items
        WHERE user_id = %s AND scheduled_date BETWEEN %s AND %s
        """,
        (user_id, since, until),
        fetch_one=True,
    ) or {}
    total_planned = float(planned_row.get("total") or 0)
    avg_planned = round(total_planned / 7, 1)

    # Approximate completed minutes via focus sessions
    session_row = execute_query(
        """
        SELECT COALESCE(SUM(duration_minutes), 0) AS total
        FROM focus_sessions
        WHERE user_id = %s AND start_time::date BETWEEN %s AND %s
        """,
        (user_id, since, until),
        fetch_one=True,
    ) or {}
    total_completed = float(session_row.get("total") or 0)
    avg_completed = round(total_completed / 7, 1)

    return RecentPerformance(
        task_completion_rate_7d=task_rate,
        habit_completion_rate_7d=habit_rate,
        average_planned_minutes_7d=avg_planned,
        average_completed_minutes_7d=avg_completed,
    )


def _assemble_history(user_id: int) -> RecommendationHistory:
    """Pull last 14 days of recommendation outcomes from coach_recommendations table."""
    rows = execute_query(
        """
        SELECT recommendation_kind, target_id, proposed_change, outcome, created_at::date::text AS created_at
        FROM coach_recommendations
        WHERE user_id = %s AND created_at >= NOW() - INTERVAL '14 days'
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,),
    ) or []

    recent = [
        RecommendationOutcome(
            recommendation_kind=r["recommendation_kind"],
            target_id=r.get("target_id"),
            proposed_change=r.get("proposed_change"),
            outcome=r["outcome"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    # Compute accepted patterns
    from collections import Counter
    accepted = [r for r in recent if r.outcome in ("accepted", "edited_then_accepted")]
    accepted_by_kind = Counter(r.recommendation_kind for r in accepted)
    total_by_kind = Counter(r.recommendation_kind for r in recent)

    accepted_patterns = [
        AcceptedPattern(
            recommendation_kind=kind,
            target_category=None,
            acceptance_rate=round(accepted_by_kind[kind] / total_by_kind[kind], 2),
        )
        for kind in accepted_by_kind
        if total_by_kind[kind] >= 2
    ]

    # Compute rejected patterns (2+ rejections of the same kind+target)
    rejected = [r for r in recent if r.outcome in ("rejected", "ignored")]
    rejected_counter: Counter = Counter((r.recommendation_kind, r.target_id) for r in rejected)
    rejected_patterns = [
        RejectedPattern(
            recommendation_kind=kind,
            target_id=target_id,
            rejection_count=count,
        )
        for (kind, target_id), count in rejected_counter.items()
        if count >= 2
    ]

    return RecommendationHistory(
        recent=recent,
        accepted_patterns=accepted_patterns,
        rejected_patterns=rejected_patterns,
    )
