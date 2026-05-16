import json
import os
from typing import Any, AsyncGenerator

import anthropic
from pydantic import ValidationError

from ai.prompt import build_role_prompt, build_schema_prompt
from ai.schemas import StrategyModel


MAX_RETRIES = 3
DEFAULT_MODEL = "claude-sonnet-4-6"


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
            "input_schema": StrategyModel.model_json_schema(),
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
        system = self._build_system(current_strategy)

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

    def _build_system(self, current_strategy: dict | None) -> list[dict]:
        blocks = [
            {
                "type": "text",
                "text": self._role_prompt,
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": self._schema_prompt,
                "cache_control": {"type": "ephemeral"},
            },
        ]
        if current_strategy is not None:
            context = (
                "The user's current active strategy is shown below. "
                "When the user asks to modify it, call update_strategy with "
                "the complete updated strategy.\n\n"
                + json.dumps(current_strategy, indent=2)
            )
        else:
            context = (
                "The user has no active strategy yet. "
                "When they describe one, generate it from scratch."
            )
        blocks.append({"type": "text", "text": context})
        return blocks

    def _extract_content(self, response) -> tuple[str, Any | None]:
        text = ""
        tool_use_block = None
        for block in response.content:
            if block.type == "text":
                text = block.text
            elif block.type == "tool_use":
                tool_use_block = block
        return text, tool_use_block
