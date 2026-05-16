import json
import os
from typing import Any

import anthropic
from pydantic import ValidationError

from ai.prompt import build_role_prompt, build_schema_prompt
from ai.schemas import StrategyModel


MAX_RETRIES = 3
DEFAULT_MODEL = "claude-sonnet-4-6"


class StrategyGenerationError(Exception):
    pass


class LLMService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.model = os.environ.get("LLM_MODEL", DEFAULT_MODEL)

        # Computed once at startup; reused across all requests (prompt cache target).
        self._role_prompt = build_role_prompt()
        self._schema_prompt = build_schema_prompt()

        # Tool definition: input_schema is derived directly from Pydantic so it
        # stays in sync automatically whenever components are added to schemas.py.
        self._tool = {
            "name": "update_strategy",
            "description": (
                "Emit a complete trading strategy in the NeuroTrade DSL. "
                "Call this tool when the user asks to create, generate, or modify "
                "a trading strategy. Do NOT call it for general questions, "
                "explanations, or clarifications — reply with plain text instead. "
                "Always include a text reply summarising the strategy alongside "
                "this tool call."
            ),
            "input_schema": StrategyModel.model_json_schema(),
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_strategy(
        self,
        messages: list[dict[str, Any]],
        current_strategy: dict | None,
    ) -> tuple[str, dict | None]:
        """
        Send a conversation to Claude and return (reply_text, strategy_or_None).

        messages  — list of {role, content} dicts (history + current user turn).
        current_strategy — the user's active StrategyModel JSON, or None.

        Raises StrategyGenerationError if a tool call is made but Pydantic
        validation fails on every retry.
        """
        system = self._build_system(current_strategy)
        conversation = list(messages)

        for attempt in range(MAX_RETRIES):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system,
                tools=[self._tool],
                messages=conversation,
            )

            text, tool_use_block = self._extract_content(response)

            # Plain text response — LLM chose not to call the tool.
            if response.stop_reason == "end_turn" or tool_use_block is None:
                return text or "I'm not sure how to help with that.", None

            # Tool was called — validate the input with Pydantic.
            try:
                validated = StrategyModel.model_validate(tool_use_block.input)
                return text or "Strategy generated.", validated.model_dump()
            except ValidationError as exc:
                if attempt == MAX_RETRIES - 1:
                    raise StrategyGenerationError(
                        f"Strategy validation failed after {MAX_RETRIES} attempts. "
                        f"Last error: {exc}"
                    )

                # Feed the validation error back so Claude can self-correct.
                conversation = self._append_tool_error(
                    conversation, response, tool_use_block, exc
                )

        # Unreachable, but satisfies the type checker.
        raise StrategyGenerationError("Retry loop exited without a result.")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system(self, current_strategy: dict | None) -> list[dict]:
        """Build the three-block system prompt. Blocks A & B are cache targets."""
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
        """Return (text_reply, tool_use_block_or_None) from a response."""
        text = ""
        tool_use_block = None
        for block in response.content:
            if block.type == "text":
                text = block.text
            elif block.type == "tool_use":
                tool_use_block = block
        return text, tool_use_block

    def _append_tool_error(
        self,
        conversation: list,
        response,
        tool_use_block,
        exc: ValidationError,
    ) -> list:
        """
        Extend the conversation with the assistant's failed tool call and a
        tool_result error so Claude can self-correct on the next attempt.
        """
        # Serialize the assistant response content to plain dicts.
        assistant_content = []
        for block in response.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        error_feedback = {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_use_block.id,
                    "is_error": True,
                    "content": (
                        f"Pydantic validation failed. Fix the errors and call "
                        f"update_strategy again with a corrected strategy.\n\n"
                        f"Errors:\n{exc}"
                    ),
                }
            ],
        }

        return conversation + [
            {"role": "assistant", "content": assistant_content},
            error_feedback,
        ]
