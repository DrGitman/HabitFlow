"""
Coordinates: assemble context → generate draft → validate → return response.
No FastAPI or DB logic here — pure orchestration.
"""
from __future__ import annotations

from datetime import datetime, timezone

from coach.context_assembler import assemble_context
from coach.gateway import get_gateway
from coach.schemas import CoachMode, CoachRequest, CoachResponse
from coach.validator import build_response


async def run_coach(user_id: int, request: CoachRequest) -> CoachResponse:
    context = assemble_context(user_id, request.date)
    gateway = get_gateway()
    draft = await gateway.generate(mode=request.type, context=context)
    generated_at = datetime.now(timezone.utc).isoformat()
    return build_response(draft, context, generated_at)
