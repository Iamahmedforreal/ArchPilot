import asyncio
import json
from typing import Any

import httpx
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from schema.ai_canvas_schema import AIDesignModelResponse
from service.gemini_config_service import (
    GeminiCredentialsNotConfiguredError,
    require_gemini_api_key,
)
from service.ai_retry_config import model_request_timeout_seconds
from utils.utils import settings


SYSTEM_INSTRUCTION = """You are ArchPilot's system-design generator.
Only answer architecture and system-design requests. Return one of these outcomes:
- generated: produce a complete renderable canvas.
- unsupported: the request is not a system-design task.
- needs_clarification: essential architecture requirements are missing.
Never include hidden reasoning, credentials, tools, URLs, or frontend callbacks.
Follow the supplied editor registry, canvas format, and layout rules exactly."""

BLOCKED_FINISH_REASONS = {
    types.FinishReason.SAFETY,
    types.FinishReason.BLOCKLIST,
    types.FinishReason.PROHIBITED_CONTENT,
    types.FinishReason.SPII,
    types.FinishReason.IMAGE_SAFETY,
    types.FinishReason.IMAGE_PROHIBITED_CONTENT,
}


class AIModelError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.safe_message = message


_client: genai.Client | None = None


def _request_timeout_seconds() -> int:
    return model_request_timeout_seconds(settings.gemini_timeout_seconds)


def _max_output_tokens() -> int:
    return settings.gemini_max_output_tokens or 6000


def _get_client() -> genai.Client:
    global _client

    if _client is None:
        try:
            api_key = require_gemini_api_key()
        except GeminiCredentialsNotConfiguredError as exc:
            raise AIModelError(
                "MODEL_NOT_CONFIGURED",
                "AI generation is not configured.",
            ) from exc

        _client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=_request_timeout_seconds() * 1000,
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )

    return _client


def _require_model_name() -> str:
    model = settings.gemini_model.strip() if settings.gemini_model else ""
    if not model:
        raise AIModelError(
            "MODEL_NOT_CONFIGURED",
            "AI generation is not configured.",
        )
    return model


def _build_system_instruction(context: dict[str, Any]) -> str:
    application_context = {
        key: value
        for key, value in context.items()
        if key not in {"instruction", "response_schema"}
    }
    return (
        f"{SYSTEM_INSTRUCTION}\n\nApplication context:\n"
        f"{json.dumps(application_context, separators=(',', ':'))}"
    )


def _build_response_json_schema() -> dict[str, Any]:
    source = AIDesignModelResponse.model_json_schema()
    definitions = source.get("$defs", {})
    supported_keys = {
        "additionalProperties",
        "anyOf",
        "enum",
        "items",
        "maximum",
        "minimum",
        "properties",
        "required",
        "type",
    }

    def normalize(value: Any) -> Any:
        if isinstance(value, list):
            return [normalize(item) for item in value]
        if not isinstance(value, dict):
            return value

        reference = value.get("$ref")
        if reference:
            return normalize(definitions[reference.rsplit("/", 1)[-1]])

        normalized = {}
        for key, item in value.items():
            if key == "const":
                normalized["enum"] = [item]
            elif key == "properties":
                normalized[key] = {
                    name: normalize(property_schema)
                    for name, property_schema in item.items()
                }
            elif key in supported_keys:
                normalized[key] = normalize(item)
        return normalized

    return normalize(source)


def _validate_response(response: types.GenerateContentResponse) -> AIDesignModelResponse:
    if response.prompt_feedback and response.prompt_feedback.block_reason:
        raise AIModelError("MODEL_SAFETY_BLOCKED", "The request was blocked.")

    if not response.candidates:
        raise AIModelError("MODEL_EMPTY_RESPONSE", "The model returned no response.")

    finish_reason = response.candidates[0].finish_reason
    if finish_reason == types.FinishReason.MAX_TOKENS:
        raise AIModelError(
            "MODEL_RESPONSE_TRUNCATED",
            "The generated design was incomplete.",
        )
    if finish_reason in BLOCKED_FINISH_REASONS:
        raise AIModelError("MODEL_SAFETY_BLOCKED", "The request was blocked.")
    if finish_reason != types.FinishReason.STOP:
        raise AIModelError(
            "MODEL_PROVIDER_ERROR",
            "The model could not complete the design.",
        )

    try:
        if response.parsed is not None:
            return AIDesignModelResponse.model_validate(response.parsed)

        text = response.text
        if not text or not text.strip():
            raise AIModelError(
                "MODEL_EMPTY_RESPONSE",
                "The model returned no response.",
            )
        return AIDesignModelResponse.model_validate_json(text)
    except ValidationError as exc:
        raise AIModelError(
            "MODEL_INVALID_RESPONSE",
            "The model returned an invalid design.",
        ) from exc


async def generate_design(context: dict[str, Any]) -> AIDesignModelResponse:
    model = _require_model_name()
    client = _get_client()

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=context["instruction"],
            config=types.GenerateContentConfig(
                system_instruction=_build_system_instruction(context),
                response_mime_type="application/json",
                response_json_schema=_build_response_json_schema(),
                max_output_tokens=_max_output_tokens(),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True,
                ),
            ),
        )
    except (asyncio.TimeoutError, httpx.TimeoutException) as exc:
        raise AIModelError("MODEL_TIMEOUT", "AI generation timed out.") from exc
    except errors.UnknownApiResponseError as exc:
        raise AIModelError(
            "MODEL_INVALID_RESPONSE",
            "The model returned an invalid design.",
        ) from exc
    except errors.APIError as exc:
        if exc.code == 429:
            raise AIModelError(
                "MODEL_RATE_LIMITED",
                "AI generation is temporarily busy.",
            ) from exc
        if exc.code == 503:
            raise AIModelError(
                "MODEL_PROVIDER_BUSY",
                "AI generation is temporarily busy. Try again shortly.",
            ) from exc
        raise AIModelError(
            "MODEL_PROVIDER_ERROR",
            "AI generation is temporarily unavailable.",
        ) from exc
    except httpx.HTTPError as exc:
        raise AIModelError(
            "MODEL_PROVIDER_ERROR",
            "AI generation is temporarily unavailable.",
        ) from exc

    return _validate_response(response)


async def close_model_client() -> None:
    global _client

    if _client is None:
        return

    client = _client
    _client = None
    await client.aio.aclose()
    client.close()
