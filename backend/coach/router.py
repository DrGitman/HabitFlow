"""
Thin FastAPI router for /api/coach/*.
No business logic here — delegates entirely to coach_service / apply_service.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from coach.schemas import CoachRequest, CoachResponse
from coach.coach_service import run_coach
from coach.apply_service import apply_recommendations
from auth import get_current_user_id

router = APIRouter(prefix="/api/coach", tags=["coach"])


@router.post("/generate", response_model=CoachResponse)
async def generate_coach_plan(
    body: CoachRequest,
    user_id: int = Depends(get_current_user_id),
) -> CoachResponse:
    """
    Generate a Today's Focus, Recovery, or Weekly Reflection plan.
    Read-only — this endpoint never writes to tasks, habits, or calendar.
    """
    try:
        return await run_coach(user_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        # Log full error to backend terminal
        import logging
        logging.getLogger(__name__).error("Coach RuntimeError: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service unavailable: {exc}")


class ApplyRequest(BaseModel):
    recommendation_ids: List[str]
    recommendations: List[Any]
    date: str


class ApplyResponse(BaseModel):
    applied: List[str]
    skipped: List[str]
    warnings: List[str]


@router.post("/apply", response_model=ApplyResponse)
def apply_coach_plan(
    body: ApplyRequest,
    user_id: int = Depends(get_current_user_id),
) -> ApplyResponse:
    """
    Apply user-selected recommendations.
    Revalidates every action before writing — generation output is never trusted blindly.
    """
    try:
        result = apply_recommendations(
            user_id=user_id,
            recommendation_ids=body.recommendation_ids,
            recommendations=body.recommendations,
            date=body.date,
        )
        return ApplyResponse(
            applied=result.applied,
            skipped=result.skipped,
            warnings=result.warnings,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Apply failed: {exc}")
