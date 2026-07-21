"""
Deterministic overload detection.
No AI calls — pure arithmetic on the assembled context.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List

from coach.schemas import CoachContext


@dataclass
class OverloadSignal:
    is_overloaded: bool
    reasons: List[str]
    severity: str  # "none" | "mild" | "heavy"
    scheduled_minutes: int
    available_minutes: int
    overdue_count: int


def detect_overload(context: CoachContext) -> OverloadSignal:
    """
    Returns an OverloadSignal based purely on the assembled context.
    Thresholds:
      - Scheduled > available_minutes → over capacity
      - Overdue items >= 3           → backlog pressure
      - task_completion_rate_7d < 0.4 → sustained underperformance
    """
    reasons: List[str] = []

    # Estimate scheduled minutes from tasks that have calendar blocks
    # (available_minutes is already pre-subtracted in context assembler)
    scheduled = (8 * 60) - context.available_minutes  # inverse of what assembler does
    overdue = len(context.overdue_items)
    perf = context.recent_performance

    if scheduled > context.available_minutes + 30:
        reasons.append(
            f"Scheduled work ({scheduled} min) exceeds available time ({context.available_minutes} min)."
        )

    if overdue >= 3:
        reasons.append(f"{overdue} overdue items are carrying over from previous days.")

    if perf.task_completion_rate_7d < 0.4 and perf.task_completion_rate_7d > 0:
        reasons.append(
            f"Task completion has been {int(perf.task_completion_rate_7d * 100)}% over the last 7 days."
        )

    if perf.average_planned_minutes_7d > 0:
        ratio = perf.average_completed_minutes_7d / perf.average_planned_minutes_7d
        if ratio < 0.5:
            reasons.append(
                f"You're completing about {int(ratio * 100)}% of planned work on average."
            )

    is_overloaded = len(reasons) >= 1
    if len(reasons) >= 3:
        severity = "heavy"
    elif len(reasons) >= 1:
        severity = "mild"
    else:
        severity = "none"

    return OverloadSignal(
        is_overloaded=is_overloaded,
        reasons=reasons,
        severity=severity,
        scheduled_minutes=scheduled,
        available_minutes=context.available_minutes,
        overdue_count=overdue,
    )
