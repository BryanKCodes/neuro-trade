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
from indicators.registry import INDICATOR_REGISTRY

app = FastAPI(title="NeuroTrade API")
llm_service = LLMService()


# ===================================================================
# Indicator Metadata Endpoint
# ===================================================================

class SeriesStyleResponse(BaseModel):
    key_suffix:  str
    label:       str
    color:       str
    series_type: Literal["line", "histogram"]
    line_width:  int
    line_style:  Literal["solid", "dashed"]


class ParamDefResponse(BaseModel):
    name:    str
    label:   str
    dtype:   Literal["int", "float"]
    default: float
    min_val: Optional[float]
    max_val: Optional[float]


class IndicatorTypeMetaResponse(BaseModel):
    type_id:       str
    label:         str
    description:   str
    category:      str
    pane:          Literal["main", "sub"]
    render_type:   Literal["line", "band", "histogram", "multi_line", "macd_composite"]
    series_styles: List[SeriesStyleResponse]
    param_schema:  List[ParamDefResponse]
    y_min:         Optional[float]
    y_max:         Optional[float]
    ref_lines:     List[float]


@app.get("/api/indicators/meta")
def indicators_meta() -> List[IndicatorTypeMetaResponse]:
    return [
        IndicatorTypeMetaResponse(
            type_id       = defn.type_id,
            label         = defn.label,
            description   = defn.description,
            category      = defn.category,
            pane          = defn.pane,
            render_type   = defn.render_type,
            series_styles = [
                SeriesStyleResponse(
                    key_suffix  = s.key_suffix,
                    label       = s.label,
                    color       = s.color,
                    series_type = s.series_type,
                    line_width  = s.line_width,
                    line_style  = s.line_style,
                )
                for s in defn.series_styles
            ],
            param_schema  = [
                ParamDefResponse(
                    name    = p.name,
                    label   = p.label,
                    dtype   = p.dtype,
                    default = float(p.default),
                    min_val = p.min_val,
                    max_val = p.max_val,
                )
                for p in defn.param_schema
            ],
            y_min      = defn.y_min,
            y_max      = defn.y_max,
            ref_lines  = defn.ref_lines,
        )
        for defn in INDICATOR_REGISTRY.values()
    ]


# ===================================================================
# OHLCV Preview Endpoint
# ===================================================================

class IndicatorInstanceRequest(BaseModel):
    uuid:    str
    type_id: str
    params:  dict[str, float | int | str]


class PreviewRequest(BaseModel):
    asset:      str
    timeframe:  str
    instances:  List[IndicatorInstanceRequest] = []
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

    indicator_data: dict[str, list] = {}
    for inst in req.instances:
        type_def = INDICATOR_REGISTRY.get(inst.type_id)
        if type_def is None:
            continue
        for (key_suffix, series_instance) in type_def.factory(inst.params):
            response_key = f"{inst.uuid}{key_suffix}"
            raw: pd.Series = series_instance.calculator(df)
            indicator_data[response_key] = [
                None if pd.isna(v) else round(float(v), 6)
                for v in raw
            ]

    return {"bars": bars, "indicators": indicator_data}


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
