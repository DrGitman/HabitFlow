"""
Coordinates: assemble context → detect overload → generate draft → validate → return response.
No FastAPI or DB logic here — pure orchestration.
"""
from __future__ import annotations

from datetime import datetime, timezone

from coach.context_assembler import assemble_context, assemble_weekly_constraints
from coach.gateway import get_gateway
from coach.overload import detect_overload
from coach.schemas import CoachMode, CoachRequest, CoachResponse
from coach.validator import build_response


async def run_coach(user_id: int, request: CoachRequest) -> CoachResponse:
    context = assemble_context(user_id, request.date)

    # Deterministic overload detection — upgrades mode to recovery if heavy
    mode = request.type
    overload = detect_overload(context)
    extra_warnings: list[str] = []

    if overload.severity == "heavy" and mode == CoachMode.daily:
        mode = CoachMode.recovery
        extra_warnings.append(
            "Overload detected — switching to Recovery Mode. "
            + " ".join(overload.reasons)
        )
    elif overload.severity == "mild" and mode == CoachMode.daily:
        extra_warnings.append(
            "Heads up: " + overload.reasons[0]
        )

    # Enrich context with weekly habit summary for weekly review mode
    if mode == CoachMode.weekly:
        weekly_lines = assemble_weekly_constraints(user_id, request.date)
        context = context.model_copy(
            update={"constraints": context.constraints + weekly_lines}
        )

    gateway = get_gateway()
    draft = await gateway.generate(mode=mode, context=context)
    draft.warnings = list(draft.warnings or []) + extra_warnings

    generated_at = datetime.now(timezone.utc).isoformat()
    return build_response(draft, context, generated_at)
