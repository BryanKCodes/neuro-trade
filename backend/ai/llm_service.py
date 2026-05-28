import json
import os
from typing import Any, AsyncGenerator

import anthropic
from pydantic import ValidationError

from ai.prompt import build_role_prompt, build_schema_prompt
from ai.schemas import StrategyModel  # still needed for Pydantic validation in retry loop


MAX_RETRIES = 3
DEFAULT_MODEL = "claude-haiku-4-5-20251001"

# Minimal structural schema (~300 tokens vs ~33,000 for the full Pydantic JSON schema).
# Component documentation lives in the system prompt; Pydantic retry loop handles validation.
_TOOL_INPUT_SCHEMA = {
    "type": "object",
    "required": ["rules"],
    "properties": {
        "rules": {
            "type": "array",
            "description": (
                "List of strategy rules. Use only the component types documented "
                "in the system prompt under EXPRESSION COMPONENTS and PREDICATE COMPONENTS."
            ),
            "items": {
                "type": "object",
                "required": ["trade", "filter", "entry", "exit", "stop_loss", "take_profit", "sizing"],
                "properties": {
                    "trade":       {"type": "string", "enum": ["long", "short"]},
                    "filter":      {"type": "object", "description": "AnyPredicate"},
                    "entry":       {"type": "object", "description": "AnyPredicate"},
                    "exit":        {"type": "object", "description": "AnyPredicate"},
                    "stop_loss":   {"type": "object", "description": "AnyExpression"},
                    "take_profit": {"type": "object", "description": "AnyExpression"},
                    "sizing":      {"type": "object", "description": "AnyExpression"},
                },
            },
        }
    },
}


class StrategyGenerationError(Exception):
    pass


def _sse(type_: str, data: Any = None) -> str:
    payload: dict[str, Any] = {"type": type_}
    if data is not None:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"


class LLMService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model = os.environ.get("LLM_MODEL", DEFAULT_MODEL)
        self._role_prompt = build_role_prompt()
        self._schema_prompt = build_schema_prompt()
        self._tool = {
            "name": "update_strategy",
            "description": (
                "Emit a complete trading strategy in the NeuroTrade DSL. "
                "Call this tool when the user asks to create, generate, or modify "
                "a trading strategy. Do NOT call it for general questions or explanations — "
                "reply with plain text instead. "
                "Always include a text reply summarising the strategy alongside this tool call."
            ),
            "input_schema": _TOOL_INPUT_SCHEMA,
            "cache_control": {"type": "ephemeral"},
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def stream_and_validate(
        self,
        messages: list[dict[str, Any]],
        current_strategy: dict | None,
    ) -> AsyncGenerator[str, None]:
        """
        Async generator that yields SSE events.

        Phase 1 — streams text tokens from Claude as `text_delta` events.
        Phase 2 — if a tool call was made, validates with Pydantic (with retry)
                   and emits a `strategy` or `error` event.
        Always ends with a `done` event.
        """
        system = self._build_system()
        messages = self._inject_strategy(messages, current_strategy)

        # ── Phase 1: Stream ──────────────────────────────────────────
        full_text = ""
        tool_use_block = None

        async with self.client.messages.stream(
            model=self.model,
            max_tokens=4096,
            system=system,
            tools=[self._tool],
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                full_text += text_chunk
                yield _sse("text_delta", text_chunk)

            final = await stream.get_final_message()
            for block in final.content:
                if block.type == "tool_use":
                    tool_use_block = block

        # No tool call — plain text response.
        if tool_use_block is None:
            yield _sse("done")
            return

        # ── Phase 2: Validate with retry ────────────────────────────
        yield _sse("tool_start")

        # Build assistant turn from Phase 1 to seed the retry conversation.
        assistant_turn: list[dict] = []
        if full_text:
            assistant_turn.append({"type": "text", "text": full_text})
        assistant_turn.append({
            "type": "tool_use",
            "id": tool_use_block.id,
            "name": tool_use_block.name,
            "input": tool_use_block.input,
        })

        conv = list(messages)
        current_tool = tool_use_block
        current_turn = assistant_turn
        last_error: str | None = None

        for attempt in range(MAX_RETRIES):
            try:
                validated = StrategyModel.model_validate(current_tool.input)
                yield _sse("strategy", validated.model_dump())
                yield _sse("done")
                return
            except ValidationError as exc:
                last_error = str(exc)
                if attempt == MAX_RETRIES - 1:
                    break

                # Append failed turn + error feedback for retry.
                conv.append({"role": "assistant", "content": current_turn})
                conv.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": current_tool.id,
                        "is_error": True,
                        "content": (
                            f"Pydantic validation failed. Fix the errors and call "
                            f"update_strategy again with a corrected strategy.\n\n"
                            f"Errors:\n{exc}"
                        ),
                    }],
                })

                # Batch retry (no streaming for retries).
                retry_resp = await self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=system,
                    tools=[self._tool],
                    messages=conv,
                )

                retry_text, retry_tool = self._extract_content(retry_resp)
                if retry_tool is None:
                    break  # LLM declined to retry

                current_tool = retry_tool
                current_turn = []
                if retry_text:
                    current_turn.append({"type": "text", "text": retry_text})
                current_turn.append({
                    "type": "tool_use",
                    "id": retry_tool.id,
                    "name": retry_tool.name,
                    "input": retry_tool.input,
                })

        yield _sse("error", last_error or "Strategy validation failed after multiple attempts.")
        yield _sse("done")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system(self) -> list[dict]:
        # Fully static — never changes between requests, so both cache checkpoints hit reliably.
        # Role prompt (~376 tokens) has no cache_control: below Sonnet's 1024-token minimum.
        return [
            {"type": "text", "text": self._role_prompt},
            {"type": "text", "text": self._schema_prompt, "cache_control": {"type": "ephemeral"}},
        ]

    def _inject_strategy(
        self, messages: list[dict[str, Any]], current_strategy: dict | None
    ) -> list[dict[str, Any]]:
        # Strategy context goes in the dynamic messages layer so it never sits between
        # a cache checkpoint and the tool definition (which would break tool caching).
        if current_strategy is None:
            return messages
        context_prefix = (
            "[Current active strategy — modify this when the user asks for changes]\n"
            + json.dumps(current_strategy, indent=2)
            + "\n\n---\n"
        )
        injected = list(messages)
        last = injected[-1]
        injected[-1] = {**last, "content": context_prefix + last["content"]}
        return injected

    def _extract_content(self, response) -> tuple[str, Any | None]:
        text = ""
        tool_use_block = None
        for block in response.content:
            if block.type == "text":
                text = block.text
            elif block.type == "tool_use":
                tool_use_block = block
        return text, tool_use_block
