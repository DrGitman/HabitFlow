"""
AI Gateway — the only module that knows the model name, SDK, or provider URL.
Everything else in HabitFlow talks to CoachGateway, not to Gemini directly.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Protocol, runtime_checkable

import httpx
from dotenv import load_dotenv

from coach.schemas import CoachContext, CoachDraft, CoachMode
from coach.prompts import get_system_prompt

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

_API_KEY = os.getenv("AI_GATEWAY_API_KEY", "")
_MODEL = os.getenv("AI_MODEL", "gemini-1.5-flash")
_TIMEOUT = 30  # seconds


@runtime_checkable
class CoachGenerator(Protocol):
    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        ...


class GeminiGateway:
    """Calls the Gemini REST API and returns a raw CoachDraft."""

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        system_prompt = get_system_prompt(mode)
        user_message = json.dumps(context.model_dump(), indent=2)

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{_MODEL}:generateContent?key={_API_KEY}"
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": user_message}]}
            ],
            "generationConfig": {
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(url, json=payload)

        if response.status_code != 200:
            raise RuntimeError(
                f"AI Gateway returned {response.status_code}. "
                "Check AI_GATEWAY_API_KEY in .env"
            )

        raw_text = (
            response.json()["candidates"][0]["content"]["parts"][0]["text"]
        )

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Model returned non-JSON output: {exc}") from exc

        # Normalise the mode field — model echoes it as a string
        data["type"] = mode.value
        return CoachDraft(**data)


class FallbackGateway:
    """
    Returns a deterministic seeded response.
    Used when AI_GATEWAY_API_KEY is not set (local dev / demo without live AI).
    All IDs used here must reference real items in the context so the validator
    does not reject them.
    """

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        # Prefer a high-priority task; fall back to any task
        candidate = next(
            (t for t in context.tasks if t.priority == "high"), None
        ) or (context.tasks[0] if context.tasks else None)

        warnings = ["AI Gateway is not configured. Showing a seeded demo response."]

        if candidate:
            return CoachDraft(
                type=mode,
                summary={
                    "headline": f"Focus on {candidate.title} and protect one habit today.",
                    "detail": (
                        f"You have {context.available_minutes} minutes available. "
                        "One focused block now will make the rest of the day easier."
                    ),
                },
                recommendations=[
                    {
                        "id": "rec_1",
                        "kind": "schedule_task",
                        "title": candidate.title,
                        "reason": "This is your highest priority open task today.",
                        "evidence": [
                            {
                                "type": "task_high_priority",
                                "source_id": candidate.id,
                                "detail": "Marked high priority; estimated 60 minutes.",
                            },
                            {
                                "type": "available_capacity",
                                "source_id": None,
                                "detail": f"{context.available_minutes} minutes available today.",
                            },
                        ],
                        "confidence": 0.85,
                        "proposed_action": {
                            "type": "create_calendar_block",
                            "task_id": candidate.id,
                            "habit_id": None,
                            "start": f"{context.date}T10:00:00",
                            "end": f"{context.date}T11:00:00",
                            "new_priority": None,
                        },
                        "requires_confirmation": True,
                    }
                ],
                warnings=warnings,
                evidence=[],
                actions=[],
            )

        # No tasks at all — return a reflect recommendation (no task_id required)
        return CoachDraft(
            type=mode,
            summary={
                "headline": "Take a moment to plan your day.",
                "detail": (
                    "You have no open tasks right now. Add tasks and habits "
                    "to get personalised coaching suggestions."
                ),
            },
            recommendations=[
                {
                    "id": "rec_1",
                    "kind": "reflect",
                    "title": "Plan your day",
                    "reason": "No open tasks found. Use this time to set up your schedule.",
                    "evidence": [
                        {
                            "type": "available_capacity",
                            "source_id": None,
                            "detail": f"{context.available_minutes} minutes available today.",
                        }
                    ],
                    "confidence": 0.70,
                    "proposed_action": {
                        "type": "none",
                        "task_id": None,
                        "habit_id": None,
                        "start": None,
                        "end": None,
                        "new_priority": None,
                    },
                    "requires_confirmation": False,
                }
            ],
            warnings=warnings,
            evidence=[],
            actions=[],
        )


def get_gateway() -> CoachGenerator:
    """Return the live gateway if API key is set, otherwise the fallback."""
    if _API_KEY:
        return GeminiGateway()
    return FallbackGateway()
