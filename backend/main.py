from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional

from backtest import run_backtest
from data.loader import load_yfinance_data
from ai.llm_service import LLMService
from ai.prompt import build_schema_prompt

app = FastAPI(title="NeuroTrade API")
llm_service = LLMService()


# ===================================================================
# OHLCV Preview Endpoint
# ===================================================================

class PreviewRequest(BaseModel):
    asset: str
    timeframe: str
    # No duration — the chart always loads a large fixed window so the user
    # can pan back in time independently of the backtest window.


# Fixed chart-history windows per timeframe (calendar days).
# These respect yfinance's actual data availability limits.
_CHART_WINDOW: dict[str, int] = {
    "1m":  7,
    "2m":  60,
    "5m":  60,
    "15m": 60,
    "30m": 60,
    "90m": 60,
    "1h":  730,
    "1d":  1825,
    "5d":  1825,
    "1wk": 1825,
    "1mo": 1825,
    "3mo": 1825,
}


@app.post("/api/data/preview")
def preview(req: PreviewRequest):
    df = load_yfinance_data(req.asset, req.timeframe)

    days = _CHART_WINDOW.get(req.timeframe, 1825)
    cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=days)
    if df.index.tz is not None:
        df = df[df.index >= cutoff]
    else:
        df = df[df.index >= cutoff.tz_localize(None)]

    bars = [
        {
            "time":   int(pd.Timestamp(row.Index).timestamp()),
            "open":   round(float(row.Open),   4),
            "high":   round(float(row.High),   4),
            "low":    round(float(row.Low),    4),
            "close":  round(float(row.Close),  4),
            "volume": int(row.Volume),
        }
        for row in df.itertuples()
    ]
    return {"bars": bars}


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
