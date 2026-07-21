"""
AI Gateway — the only module that knows the model name, provider URL, or SDK.
Uses the OpenAI-compatible /v1/chat/completions format, which works with:
  Mistral AI, Groq, OpenRouter, GitHub Models, Cerebras, SambaNova, and others.
Switch providers by changing AI_GATEWAY_BASE_URL + AI_GATEWAY_API_KEY + AI_MODEL in .env.
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Protocol, runtime_checkable

import httpx
from dotenv import load_dotenv

from coach.schemas import CoachContext, CoachDraft, CoachMode
from coach.prompts import get_system_prompt

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

_API_KEY   = os.getenv("AI_GATEWAY_API_KEY", "")
_BASE_URL  = os.getenv("AI_GATEWAY_BASE_URL", "https://api.mistral.ai/v1")
_MODEL     = os.getenv("AI_MODEL", "mistral-small-latest")
_TIMEOUT   = 30  # seconds

log = logging.getLogger(__name__)


@runtime_checkable
class CoachGenerator(Protocol):
    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        ...


class OpenAICompatibleGateway:
    """
    Calls any OpenAI-compatible /v1/chat/completions endpoint.
    Tested with: Mistral AI, Groq, OpenRouter, GitHub Models, Cerebras.
    """

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        system_prompt = get_system_prompt(mode)
        user_message  = json.dumps(context.model_dump(), indent=2)

        url = f"{_BASE_URL.rstrip('/')}/chat/completions"

        headers = {
            "Authorization": f"Bearer {_API_KEY}",
            "Content-Type": "application/json",
        }

        payload: dict = {
            "model": _MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "max_tokens": 2048,
            "temperature": 0.3,
        }

        # Request JSON output where the provider supports it
        # (Mistral, OpenAI, Groq all honour this)
        payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code == 429:
            raise RuntimeError(
                "Rate limit reached. Wait 60 seconds and try again."
            )

        if response.status_code != 200:
            log.error("AI Gateway error %s: %s", response.status_code, response.text[:500])
            raise RuntimeError(
                f"AI Gateway returned {response.status_code} — see backend terminal for details"
            )

        try:
            raw_text = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            log.error("Unexpected response shape: %s", response.text[:500])
            raise RuntimeError("Unexpected response shape from AI gateway") from exc

        # Strip markdown fences if the model wrapped the JSON
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
        raw_text = re.sub(r"\s*```$", "", raw_text)

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            log.error("Non-JSON response: %s", raw_text[:300])
            raise ValueError(f"Model returned non-JSON output: {exc}") from exc

        data["type"] = mode.value

        # Normalise warnings — model sometimes returns dicts instead of strings
        if "warnings" in data and isinstance(data["warnings"], list):
            normalised = []
            for w in data["warnings"]:
                if isinstance(w, str):
                    normalised.append(w)
                elif isinstance(w, dict):
                    # Extract message/detail/text field, or stringify the whole dict
                    normalised.append(
                        w.get("message") or w.get("detail") or w.get("text") or str(w)
                    )
            data["warnings"] = normalised

        return CoachDraft(**data)


class FallbackGateway:
    """
    Returns a deterministic seeded response.
    Used when AI_GATEWAY_API_KEY is not set (local dev / demo without live AI).
    All IDs used here must reference real items in the context so the validator
    does not reject them.
    """

    async def generate(self, *, mode: CoachMode, context: CoachContext) -> CoachDraft:
        candidate = next(
            (t for t in context.tasks if t.priority == "high"), None
        ) or (context.tasks[0] if context.tasks else None)

        warnings = ["AI Gateway is not configured. Showing a seeded demo response."]

        if candidate:
            # Pick a start time 30 min from now, capped at 16:30 so end <= 17:30
            now = datetime.now()
            start = now.replace(second=0, microsecond=0) + timedelta(minutes=30)
            start = start.replace(minute=(start.minute // 15) * 15)  # round to 15m
            if start.hour >= 16 and start.minute > 30:
                start = start.replace(hour=16, minute=30)
            end = start + timedelta(hours=1)
            start_iso = f"{context.date}T{start.strftime('%H:%M:%S')}"
            end_iso   = f"{context.date}T{end.strftime('%H:%M:%S')}"

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
                            "start": start_iso,
                            "end": end_iso,
                            "new_priority": None,
                        },
                        "requires_confirmation": True,
                    }
                ],
                warnings=warnings,
                evidence=[],
                actions=[],
            )

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
        return OpenAICompatibleGateway()
    return FallbackGateway()
