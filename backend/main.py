from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict

from backtest import run_backtest
from ai.prompt import generate_prompt

app = FastAPI(title="NeuroTrade API")

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
    """
    Run a backtest with user-provided strategy + benchmark JSON DSLs.
    """
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
# Chat Prompt Endpoint
# ===================================================================
class ChatRequest(BaseModel):
    prompt: str


@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    Generate the AI prompt based on the schema + user message.
    """
    full_prompt = generate_prompt() + "\n\nPrompt: " + req.prompt
    return {"reply": full_prompt}
