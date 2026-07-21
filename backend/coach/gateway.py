"""
AI Gateway — the only module that knows the model name, SDK, or provider URL.
Everything else in HabitFlow talks to CoachGateway, not to Anthropic directly.
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
_BASE_URL = os.getenv("AI_GATEWAY_BASE_URL", "https://api.anthropic.com")
_MODEL = os.getenv("AI_MODEL", "claude-haiku-4-5-20251001")
_TIMEOUT = 30  # seconds


@runtime_checkable
class CoachGenerator(Protocol):
    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        ...


class AnthropicGateway:
    """Calls the Anthropic Messages API and returns a raw CoachDraft."""

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        system_prompt = get_system_prompt(mode)
        user_message = json.dumps(context.model_dump(), indent=2)

        headers = {
            "x-api-key": _API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": _MODEL,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        }

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{_BASE_URL}/v1/messages",
                headers=headers,
                json=payload,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"AI Gateway returned {response.status_code}. "
                "Check AI_GATEWAY_API_KEY and AI_GATEWAY_BASE_URL in .env"
            )

        raw_text = response.json()["content"][0]["text"]

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
    """

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        high_priority = next(
            (t for t in context.tasks if t.priority == "high"), None
        )
        task_id = high_priority.id if high_priority else "task_demo"
        task_title = high_priority.title if high_priority else "Top priority task"

        return CoachDraft(
            type=mode,
            summary={
                "headline": f"Focus on {task_title} and protect one habit today.",
                "detail": (
                    f"You have {context.available_minutes} minutes available. "
                    "One focused block now will make the rest of the day easier."
                ),
            },
            recommendations=[
                {
                    "id": "rec_1",
                    "kind": "schedule_task",
                    "title": task_title,
                    "reason": "This is your highest priority open task today.",
                    "evidence": [
                        {
                            "type": "task_high_priority",
                            "source_id": task_id,
                            "detail": f"Marked high priority; estimated 60 minutes.",
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
                        "task_id": task_id,
                        "habit_id": None,
                        "start": f"{context.date}T10:00:00",
                        "end": f"{context.date}T11:00:00",
                        "new_priority": None,
                    },
                    "requires_confirmation": True,
                }
            ],
            warnings=["AI Gateway is not configured. Showing a seeded demo response."],
            evidence=[],
            actions=[],
        )


def get_gateway() -> CoachGenerator:
    """Return the live gateway if API key is set, otherwise the fallback."""
    if _API_KEY:
        return AnthropicGateway()
    return FallbackGateway()
