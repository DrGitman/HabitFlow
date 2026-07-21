"""
Validates the model draft before it reaches the client.
All checks are deterministic — no model calls here.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Tuple

from coach.schemas import (
    ALLOWED_ACTION_TYPES,
    ALLOWED_KINDS,
    CoachContext,
    CoachDraft,
    CoachResponse,
    CoachSummary,
    EvidenceItem,
    ProposedAction,
    Recommendation,
)


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def _overlaps(start: datetime, end: datetime, blocks: List[dict]) -> bool:
    for block in blocks:
        bs = _parse_dt(block["start"])
        be = _parse_dt(block["end"])
        if start < be and end > bs:
            return True
    return False


def validate_draft(draft: CoachDraft, context: CoachContext) -> Tuple[List[Recommendation], List[str]]:
    """
    Returns (valid_recommendations, warnings).
    Invalid recommendations are silently dropped and a warning is added.
    """
    valid_ids = {t.id for t in context.tasks} | {h.id for h in context.habits}
    existing_blocks = [{"start": b.start, "end": b.end} for b in context.calendar_blocks]

    target_date = context.date
    max_end_str = f"{target_date}T17:30:00"
    now = datetime.now()

    total_scheduled = 0
    valid: List[Recommendation] = []
    warnings: List[str] = []

    raw_recs = draft.recommendations or []
    # Cap at 4 (3 primary + 1 recovery)
    if len(raw_recs) > 4:
        warnings.append("Model proposed more than 4 recommendations; extras were removed.")
        raw_recs = raw_recs[:4]

    for raw in raw_recs:
        # Coerce raw dict or Recommendation
        if isinstance(raw, dict):
            rec_data = raw
        else:
            rec_data = raw.model_dump() if hasattr(raw, "model_dump") else dict(raw)

        rec_id = rec_data.get("id", "rec_?")
        kind = rec_data.get("kind", "")
        reason = rec_data.get("reason", "")
        evidence_raw = rec_data.get("evidence") or []
        confidence = rec_data.get("confidence", 0.0)
        requires_confirmation = rec_data.get("requires_confirmation", True)
        title = rec_data.get("title", "")
        action_raw = rec_data.get("proposed_action") or {}

        reject_reason = None

        # --- Kind allowlist ---
        if kind not in ALLOWED_KINDS:
            reject_reason = f"{rec_id}: invalid kind '{kind}'"

        # --- Action type allowlist ---
        action_type = action_raw.get("type", "none") if isinstance(action_raw, dict) else "none"
        if action_type not in ALLOWED_ACTION_TYPES:
            reject_reason = f"{rec_id}: invalid action type '{action_type}'"

        # --- Require reason, evidence, confidence for actionable recs ---
        if kind != "reflect":
            if not reason:
                reject_reason = f"{rec_id}: missing reason"
            if not evidence_raw:
                reject_reason = f"{rec_id}: missing evidence"
            if confidence == 0.0:
                reject_reason = f"{rec_id}: confidence is 0"

        # --- Task/habit ID references must exist in context ---
        ref_task_id = action_raw.get("task_id") if isinstance(action_raw, dict) else None
        ref_habit_id = action_raw.get("habit_id") if isinstance(action_raw, dict) else None
        if ref_task_id and ref_task_id not in valid_ids:
            reject_reason = f"{rec_id}: references unknown task '{ref_task_id}'"
        if ref_habit_id and ref_habit_id not in valid_ids:
            reject_reason = f"{rec_id}: references unknown habit '{ref_habit_id}'"

        # --- Calendar block validation ---
        start_str = action_raw.get("start") if isinstance(action_raw, dict) else None
        end_str = action_raw.get("end") if isinstance(action_raw, dict) else None

        if action_type == "create_calendar_block" and start_str and end_str:
            try:
                start_dt = _parse_dt(start_str)
                end_dt = _parse_dt(end_str)
            except ValueError:
                reject_reason = f"{rec_id}: unparseable start/end datetime"
            else:
                if end_dt <= start_dt:
                    reject_reason = f"{rec_id}: end is not after start"
                elif start_dt < now:
                    reject_reason = f"{rec_id}: start is in the past"
                elif start_dt.date().isoformat() != target_date:
                    reject_reason = f"{rec_id}: block is not on the target date"
                elif end_dt > _parse_dt(max_end_str):
                    reject_reason = f"{rec_id}: block extends past 17:30"
                elif _overlaps(start_dt, end_dt, existing_blocks):
                    reject_reason = f"{rec_id}: overlaps an existing calendar block"
                else:
                    block_minutes = int((end_dt - start_dt).total_seconds() / 60)
                    total_scheduled += block_minutes
                    if total_scheduled > context.available_minutes:
                        reject_reason = (
                            f"{rec_id}: would exceed available minutes "
                            f"({total_scheduled} > {context.available_minutes})"
                        )
                    else:
                        # Add to virtual blocks so subsequent recs see it
                        existing_blocks.append({"start": start_str, "end": end_str})

        if reject_reason:
            warnings.append(f"Recommendation removed: {reject_reason}")
            continue

        # Build typed objects
        evidence = [
            EvidenceItem(
                type=e.get("type", ""),
                source_id=e.get("source_id"),
                detail=e.get("detail", ""),
            )
            for e in evidence_raw
            if isinstance(e, dict)
        ]

        action = ProposedAction(
            type=action_type,
            task_id=action_raw.get("task_id") if isinstance(action_raw, dict) else None,
            habit_id=action_raw.get("habit_id") if isinstance(action_raw, dict) else None,
            start=action_raw.get("start") if isinstance(action_raw, dict) else None,
            end=action_raw.get("end") if isinstance(action_raw, dict) else None,
            new_priority=action_raw.get("new_priority") if isinstance(action_raw, dict) else None,
        )

        valid.append(
            Recommendation(
                id=rec_id,
                kind=kind,
                title=title,
                reason=reason,
                evidence=evidence,
                confidence=float(confidence),
                proposed_action=action,
                requires_confirmation=bool(requires_confirmation),
            )
        )

    if not valid and not warnings:
        warnings.append("No actionable recommendations were produced for today.")

    return valid, warnings


def build_response(
    draft: CoachDraft,
    context: CoachContext,
    generated_at: str,
) -> CoachResponse:
    recs, warnings = validate_draft(draft, context)

    # Merge any model-level warnings
    all_warnings = list(draft.warnings or []) + warnings

    summary_raw = draft.summary
    if isinstance(summary_raw, dict):
        summary = CoachSummary(**summary_raw)
    else:
        summary = summary_raw

    return CoachResponse(
        type=draft.type,
        summary=summary,
        recommendations=recs,
        warnings=all_warnings,
        evidence=[],
        actions=[],
        generated_at=generated_at,
    )
