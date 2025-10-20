from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict

from backtest import run_backtest

app = FastAPI(title="NeuroTrade API")

# Pydantic models for input validation
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
