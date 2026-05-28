from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional

from backtest import run_backtest
from ai.llm_service import LLMService
from ai.prompt import build_schema_prompt

app = FastAPI(title="NeuroTrade API")
llm_service = LLMService()


# ===================================================================
# Backtest Endpoint
# ===================================================================

class BacktestRequest(BaseModel):
    asset: str
    duration: int
    timeframe: str
    cash: float
    strategy: Dict[str, Any]
    benchmark: Dict[str, Any]


@app.post("/api/backtest")
def backtest(req: BacktestRequest):
    result = run_backtest(
        strategy_json=req.strategy,
        benchmark_json=req.benchmark,
        asset=req.asset,
        duration=req.duration,
        interval=req.timeframe,
        initial_cash=req.cash
    )
    return result


# ===================================================================
# Chat Endpoint — Server-Sent Events
# ===================================================================

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    currentStrategy: Optional[Dict[str, Any]] = None


@app.post("/api/chat")
async def chat(req: ChatRequest):
    messages = [msg.model_dump() for msg in req.history]
    messages.append({"role": "user", "content": req.message})

    return StreamingResponse(
        llm_service.stream_and_validate(messages, req.currentStrategy),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
