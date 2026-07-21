"""
Thin FastAPI router for /api/coach/*.
No business logic here — delegates entirely to coach_service.
"""
from fastapi import APIRouter, Depends, HTTPException
from coach.schemas import CoachRequest, CoachResponse
from coach.coach_service import run_coach
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
        raise HTTPException(status_code=502, detail=str(exc))
