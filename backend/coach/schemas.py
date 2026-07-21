"""
Pydantic contracts for the Coach API.
Nothing outside this file defines the shape of coach data.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class CoachMode(str, Enum):
    daily = "daily"
    recovery = "recovery"
    weekly = "weekly"


class CoachRequest(BaseModel):
    type: CoachMode
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="ISO date YYYY-MM-DD")
    timezone: str = Field(default="UTC")


# ---------------------------------------------------------------------------
# Context (server-assembled — never sent from client)
# ---------------------------------------------------------------------------

class ContextTask(BaseModel):
    id: str
    title: str
    estimated_minutes: int
    due_date: Optional[str]
    priority: Literal["low", "medium", "high"]
    status: Literal["open", "completed"]


class ContextHabit(BaseModel):
    id: str
    name: str
    target: str
    completed_today: bool
    streak: int


class ContextCalendarBlock(BaseModel):
    start: str
    end: str
    label: str


class RecentPerformance(BaseModel):
    task_completion_rate_7d: float
    habit_completion_rate_7d: float
    average_planned_minutes_7d: float
    average_completed_minutes_7d: float


class RecommendationOutcome(BaseModel):
    recommendation_kind: str
    target_id: Optional[str]
    proposed_change: Optional[str]
    outcome: Literal["accepted", "edited_then_accepted", "rejected", "ignored", "completed", "not_completed"]
    created_at: str


class AcceptedPattern(BaseModel):
    recommendation_kind: str
    target_category: Optional[str]
    acceptance_rate: float


class RejectedPattern(BaseModel):
    recommendation_kind: str
    target_id: Optional[str]
    rejection_count: int


class RecommendationHistory(BaseModel):
    recent: List[RecommendationOutcome] = []
    accepted_patterns: List[AcceptedPattern] = []
    rejected_patterns: List[RejectedPattern] = []


class CoachContext(BaseModel):
    date: str
    available_minutes: int
    tasks: List[ContextTask]
    habits: List[ContextHabit]
    overdue_items: List[ContextTask]
    recent_performance: RecentPerformance
    calendar_blocks: List[ContextCalendarBlock]
    constraints: List[str]
    recommendation_history: RecommendationHistory


# ---------------------------------------------------------------------------
# Recommendation kinds / action types (allowlists)
# ---------------------------------------------------------------------------

ALLOWED_KINDS = {
    "schedule_task",
    "defer_task",
    "reduce_scope",
    "complete_habit",
    "preserve_rest",
    "reflect",
}

ALLOWED_ACTION_TYPES = {
    "create_calendar_block",
    "defer_task",
    "update_task_priority",
    "suggest_habit",
    "none",
}


class EvidenceItem(BaseModel):
    type: str
    source_id: Optional[str] = None
    detail: str


class ProposedAction(BaseModel):
    type: str
    task_id: Optional[str] = None
    habit_id: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    new_priority: Optional[str] = None


class Recommendation(BaseModel):
    id: str
    kind: str
    title: str
    reason: str
    evidence: List[EvidenceItem]
    confidence: float = Field(..., ge=0.0, le=1.0)
    proposed_action: ProposedAction
    requires_confirmation: bool


class CoachSummary(BaseModel):
    headline: str
    detail: str


# Internal draft from the model before validation
class CoachDraft(BaseModel):
    type: CoachMode
    summary: CoachSummary
    recommendations: List[Any]
    warnings: List[str]
    evidence: List[Any]
    actions: List[Any]


# Final validated response returned to the client
class CoachResponse(BaseModel):
    type: CoachMode
    summary: CoachSummary
    recommendations: List[Recommendation]
    warnings: List[str]
    evidence: List[EvidenceItem]
    actions: List[Any]
    generated_at: str
