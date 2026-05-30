from dataclasses import dataclass, field
from typing import Callable, Literal, Optional

from components.expression.series.ema import EMA
from components.expression.series.sma import SMA
from components.expression.series.boll import BOLL
from components.expression.series.rsi import RSI
from components.expression.series.macd import MACD
from components.expression.series.atr import ATR
from components.expression.series.adx import ADX
from components.expression.series.ao import AO
from components.expression.series.cci import CCI
from components.expression.series.dc import DC
from components.expression.series.kc import KC
from components.expression.series.mfi import MFI
from components.expression.series.obv import OBV
from components.expression.series.psar import PSAR
from components.expression.series.vortex import Vortex
from components.expression.series.willr import WillR


@dataclass
class SeriesStyle:
    key_suffix:  str
    label:       str
    color:       str
    series_type: Literal["line", "histogram"]
    line_width:  int = 1
    line_style:  Literal["solid", "dashed"] = "solid"


@dataclass
class ParamDef:
    name:    str
    label:   str
    dtype:   Literal["int", "float"]
    default: int | float
    min_val: Optional[float] = None
    max_val: Optional[float] = None


@dataclass
class IndicatorType:
    type_id:       str
    label:         str
    description:   str
    category:      str
    pane:          Literal["main", "sub"]
    render_type:   Literal["line", "band", "histogram", "multi_line", "macd_composite"]
    series_styles: list[SeriesStyle]
    param_schema:  list[ParamDef]
    # factory(params: dict) → list of (key_suffix, Series) pairs.
    # key_suffix is "" for single-output, "_upper"/"_macd"/etc. for multi-output.
    # The endpoint prepends the instance UUID to each suffix to form the response key.
    factory:       Callable
    y_min:         Optional[float] = None
    y_max:         Optional[float] = None
    ref_lines:     list[float] = field(default_factory=list)


INDICATOR_REGISTRY: dict[str, IndicatorType] = {

    # ── Trend (main pane) ─────────────────────────────────────────────────────

    "EMA": IndicatorType(
        type_id       = "EMA",
        label         = "EMA",
        description   = "Exponential Moving Average",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="EMA", color="#F59E0B", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=20, min_val=1, max_val=500),
        ],
        factory = lambda p: [("", EMA(period=int(p["period"])))],
    ),

    "SMA": IndicatorType(
        type_id       = "SMA",
        label         = "SMA",
        description   = "Simple Moving Average",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="SMA", color="#06B6D4", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=20, min_val=1, max_val=500),
        ],
        factory = lambda p: [("", SMA(period=int(p["period"])))],
    ),

    "PSAR": IndicatorType(
        type_id       = "PSAR",
        label         = "Parabolic SAR",
        description   = "Parabolic Stop and Reverse",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="PSAR", color="#F59E0B", series_type="line", line_style="dashed")],
        param_schema  = [],
        factory       = lambda _: [("", PSAR())],
    ),

    # ── Trend Strength (sub pane) ─────────────────────────────────────────────

    "ADX": IndicatorType(
        type_id       = "ADX",
        label         = "ADX",
        description   = "Average Directional Index with ±DI lines",
        category      = "Trend",
        pane          = "sub",
        render_type   = "multi_line",
        series_styles = [
            SeriesStyle(key_suffix="_adx",    label="ADX", color="#2563EB", series_type="line", line_width=2),
            SeriesStyle(key_suffix="_di_pos", label="+DI", color="#10B981", series_type="line"),
            SeriesStyle(key_suffix="_di_neg", label="-DI", color="#EF4444", series_type="line"),
        ],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory = lambda p: [
            ("_adx",    ADX(period=int(p["period"]), output="adx")),
            ("_di_pos", ADX(period=int(p["period"]), output="+di")),
            ("_di_neg", ADX(period=int(p["period"]), output="-di")),
        ],
        y_min = 0,
    ),

    "VORTEX": IndicatorType(
        type_id       = "VORTEX",
        label         = "Vortex",
        description   = "Vortex Indicator (+VI / -VI)",
        category      = "Trend",
        pane          = "sub",
        render_type   = "multi_line",
        series_styles = [
            SeriesStyle(key_suffix="_plus",  label="+VI", color="#10B981", series_type="line"),
            SeriesStyle(key_suffix="_minus", label="-VI", color="#EF4444", series_type="line"),
        ],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory = lambda p: [
            ("_plus",  Vortex(period=int(p["period"]), output="+vi")),
            ("_minus", Vortex(period=int(p["period"]), output="-vi")),
        ],
        y_min = 0,
    ),

    # ── Volatility Bands (main pane) ──────────────────────────────────────────

    "BOLL": IndicatorType(
        type_id       = "BOLL",
        label         = "Bollinger Bands",
        description   = "Volatility bands ± N standard deviations",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper", color="#6366F1", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Mid",   color="#6366F1", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower", color="#6366F1", series_type="line", line_style="dashed"),
        ],
        param_schema  = [
            ParamDef(name="period", label="Period",  dtype="int",   default=20,  min_val=2,   max_val=500),
            ParamDef(name="stddev", label="Std Dev", dtype="float", default=2.0, min_val=0.1, max_val=10.0),
        ],
        factory = lambda p: [
            ("_upper", BOLL(period=int(p["period"]), stddev=p["stddev"], band="upper")),
            ("_mid",   BOLL(period=int(p["period"]), stddev=p["stddev"], band="mid")),
            ("_lower", BOLL(period=int(p["period"]), stddev=p["stddev"], band="lower")),
        ],
    ),

    "DC": IndicatorType(
        type_id       = "DC",
        label         = "Donchian Channels",
        description   = "Price channel defined by highest high and lowest low",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper", color="#2563EB", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Mid",   color="#2563EB", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower", color="#2563EB", series_type="line", line_style="dashed"),
        ],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=20, min_val=1, max_val=500),
        ],
        factory = lambda p: [
            ("_upper", DC(period=int(p["period"]), output="upper")),
            ("_mid",   DC(period=int(p["period"]), output="mid")),
            ("_lower", DC(period=int(p["period"]), output="lower")),
        ],
    ),

    "KC": IndicatorType(
        type_id       = "KC",
        label         = "Keltner Channels",
        description   = "ATR-based volatility envelope around EMA",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper", color="#EC4899", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Mid",   color="#EC4899", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower", color="#EC4899", series_type="line", line_style="dashed"),
        ],
        param_schema  = [
            ParamDef(name="period",     label="Period",     dtype="int",   default=20,  min_val=1,   max_val=500),
            ParamDef(name="multiplier", label="Multiplier", dtype="float", default=2.0, min_val=0.1, max_val=10.0),
        ],
        factory = lambda p: [
            ("_upper", KC(period=int(p["period"]), multiplier=p["multiplier"], output="upper")),
            ("_mid",   KC(period=int(p["period"]), multiplier=p["multiplier"], output="mid")),
            ("_lower", KC(period=int(p["period"]), multiplier=p["multiplier"], output="lower")),
        ],
    ),

    "ATR": IndicatorType(
        type_id       = "ATR",
        label         = "ATR",
        description   = "Average True Range — volatility in price units",
        category      = "Volatility",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="ATR", color="#F97316", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory = lambda p: [("", ATR(period=int(p["period"])))],
    ),

    # ── Momentum (sub pane) ───────────────────────────────────────────────────

    "RSI": IndicatorType(
        type_id       = "RSI",
        label         = "RSI",
        description   = "Relative Strength Index",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="RSI", color="#A78BFA", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=2, max_val=200),
        ],
        factory   = lambda p: [("", RSI(period=int(p["period"])))],
        y_min     = 0,
        y_max     = 100,
        ref_lines = [30, 70],
    ),

    "MACD": IndicatorType(
        type_id       = "MACD",
        label         = "MACD",
        description   = "Moving Average Convergence Divergence",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "macd_composite",
        series_styles = [
            SeriesStyle(key_suffix="_macd",   label="MACD",   color="#3B82F6", series_type="line"),
            SeriesStyle(key_suffix="_signal", label="Signal", color="#F59E0B", series_type="line"),
            SeriesStyle(key_suffix="_hist",   label="Hist",   color="#6366F1", series_type="histogram"),
        ],
        param_schema  = [
            ParamDef(name="fast",   label="Fast",   dtype="int", default=12, min_val=1, max_val=200),
            ParamDef(name="slow",   label="Slow",   dtype="int", default=26, min_val=2, max_val=500),
            ParamDef(name="signal", label="Signal", dtype="int", default=9,  min_val=1, max_val=100),
        ],
        factory = lambda p: [
            ("_macd",   MACD(fast=int(p["fast"]), slow=int(p["slow"]), signal=int(p["signal"]), output="macd")),
            ("_signal", MACD(fast=int(p["fast"]), slow=int(p["slow"]), signal=int(p["signal"]), output="signal")),
            ("_hist",   MACD(fast=int(p["fast"]), slow=int(p["slow"]), signal=int(p["signal"]), output="hist")),
        ],
    ),

    "CCI": IndicatorType(
        type_id       = "CCI",
        label         = "CCI",
        description   = "Commodity Channel Index",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="CCI", color="#06B6D4", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory   = lambda p: [("", CCI(period=int(p["period"])))],
        ref_lines = [-100, 100],
    ),

    "WILLR": IndicatorType(
        type_id       = "WILLR",
        label         = "Williams %R",
        description   = "Williams Percent Range momentum oscillator",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="Williams %R", color="#EC4899", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory   = lambda p: [("", WillR(period=int(p["period"])))],
        y_min     = -100,
        y_max     = 0,
        ref_lines = [-80, -20],
    ),

    "AO": IndicatorType(
        type_id       = "AO",
        label         = "Awesome Oscillator",
        description   = "Market momentum: 5-SMA minus 34-SMA of midpoints",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "histogram",
        series_styles = [SeriesStyle(key_suffix="", label="AO", color="#10B981", series_type="histogram")],
        param_schema  = [],
        factory       = lambda _: [("", AO(fast=5, slow=34))],
    ),

    # ── Volume (sub pane) ─────────────────────────────────────────────────────

    "OBV": IndicatorType(
        type_id       = "OBV",
        label         = "OBV",
        description   = "On-Balance Volume",
        category      = "Volume",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="OBV", color="#8B5CF6", series_type="line")],
        param_schema  = [],
        factory       = lambda _: [("", OBV())],
    ),

    "MFI": IndicatorType(
        type_id       = "MFI",
        label         = "MFI",
        description   = "Money Flow Index — volume-weighted RSI",
        category      = "Volume",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="MFI", color="#14B8A6", series_type="line")],
        param_schema  = [
            ParamDef(name="period", label="Period", dtype="int", default=14, min_val=1, max_val=200),
        ],
        factory   = lambda p: [("", MFI(period=int(p["period"])))],
        y_min     = 0,
        y_max     = 100,
        ref_lines = [20, 80],
    ),
}
