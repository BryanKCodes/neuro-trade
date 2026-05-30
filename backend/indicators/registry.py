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
from components.expression.series.ichimoku import Ichimoku
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
class IndicatorDef:
    indicator_id:  str
    label:         str
    category:      str
    pane:          Literal["main", "sub"]
    render_type:   Literal["line", "band", "histogram", "multi_line", "macd_composite"]
    series_styles: list[SeriesStyle]
    # Returns list of (response_key, Series_instance) pairs.
    # Multi-output indicators (BOLL, MACD) return multiple pairs.
    factory:       Callable
    y_min:         Optional[float] = None
    y_max:         Optional[float] = None
    ref_lines:     list[float] = field(default_factory=list)


INDICATOR_REGISTRY: dict[str, IndicatorDef] = {

    # ── Trend Overlays (main pane) ────────────────────────────────────────────

    "EMA_20": IndicatorDef(
        indicator_id  = "EMA_20",
        label         = "EMA (20)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="EMA 20", color="#F59E0B", series_type="line")],
        factory       = lambda: [("EMA_20", EMA(period=20))],
    ),

    "EMA_50": IndicatorDef(
        indicator_id  = "EMA_50",
        label         = "EMA (50)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="EMA 50", color="#8B5CF6", series_type="line")],
        factory       = lambda: [("EMA_50", EMA(period=50))],
    ),

    "EMA_200": IndicatorDef(
        indicator_id  = "EMA_200",
        label         = "EMA (200)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="EMA 200", color="#F97316", series_type="line")],
        factory       = lambda: [("EMA_200", EMA(period=200))],
    ),

    "SMA_20": IndicatorDef(
        indicator_id  = "SMA_20",
        label         = "SMA (20)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="SMA 20", color="#06B6D4", series_type="line")],
        factory       = lambda: [("SMA_20", SMA(period=20))],
    ),

    "SMA_50": IndicatorDef(
        indicator_id  = "SMA_50",
        label         = "SMA (50)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="SMA 50", color="#14B8A6", series_type="line")],
        factory       = lambda: [("SMA_50", SMA(period=50))],
    ),

    "SMA_200": IndicatorDef(
        indicator_id  = "SMA_200",
        label         = "SMA (200)",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="SMA 200", color="#10B981", series_type="line")],
        factory       = lambda: [("SMA_200", SMA(period=200))],
    ),

    "PSAR": IndicatorDef(
        indicator_id  = "PSAR",
        label         = "Parabolic SAR",
        category      = "Trend",
        pane          = "main",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="PSAR", color="#F59E0B", series_type="line", line_style="dashed")],
        factory       = lambda: [("PSAR", PSAR())],
    ),

    # Rendered as 5 separate lines; cloud fill is not supported in v1.
    "ICHIMOKU": IndicatorDef(
        indicator_id  = "ICHIMOKU",
        label         = "Ichimoku Cloud (9, 26, 52)",
        category      = "Trend",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_tenkan", label="Tenkan-sen",    color="#EF4444", series_type="line"),
            SeriesStyle(key_suffix="_kijun",  label="Kijun-sen",     color="#2563EB", series_type="line"),
            SeriesStyle(key_suffix="_span_a", label="Senkou Span A", color="#10B981", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_span_b", label="Senkou Span B", color="#EF4444", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_chikou", label="Chikou Span",   color="#A78BFA", series_type="line"),
        ],
        factory = lambda: [
            ("ICHIMOKU_tenkan", Ichimoku(tenkan=9, kijun=26, senkou=52, output="tenkan")),
            ("ICHIMOKU_kijun",  Ichimoku(tenkan=9, kijun=26, senkou=52, output="kijun")),
            ("ICHIMOKU_span_a", Ichimoku(tenkan=9, kijun=26, senkou=52, output="span_a")),
            ("ICHIMOKU_span_b", Ichimoku(tenkan=9, kijun=26, senkou=52, output="span_b")),
            ("ICHIMOKU_chikou", Ichimoku(tenkan=9, kijun=26, senkou=52, output="chikou")),
        ],
    ),

    # ── Volatility Bands (main pane) ──────────────────────────────────────────

    "BOLL_20": IndicatorDef(
        indicator_id  = "BOLL_20",
        label         = "Bollinger Bands (20, 2)",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper Band",  color="#6366F1", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Middle Band", color="#6366F1", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower Band",  color="#6366F1", series_type="line", line_style="dashed"),
        ],
        factory = lambda: [
            ("BOLL_20_upper", BOLL(period=20, stddev=2, band="upper")),
            ("BOLL_20_mid",   BOLL(period=20, stddev=2, band="mid")),
            ("BOLL_20_lower", BOLL(period=20, stddev=2, band="lower")),
        ],
    ),

    "DC_20": IndicatorDef(
        indicator_id  = "DC_20",
        label         = "Donchian Channels (20)",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper Channel", color="#2563EB", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Mid Channel",   color="#2563EB", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower Channel", color="#2563EB", series_type="line", line_style="dashed"),
        ],
        factory = lambda: [
            ("DC_20_upper", DC(period=20, output="upper")),
            ("DC_20_mid",   DC(period=20, output="mid")),
            ("DC_20_lower", DC(period=20, output="lower")),
        ],
    ),

    "KC_20": IndicatorDef(
        indicator_id  = "KC_20",
        label         = "Keltner Channels (20, 2)",
        category      = "Volatility",
        pane          = "main",
        render_type   = "band",
        series_styles = [
            SeriesStyle(key_suffix="_upper", label="Upper Channel", color="#EC4899", series_type="line", line_style="dashed"),
            SeriesStyle(key_suffix="_mid",   label="Mid Channel",   color="#EC4899", series_type="line"),
            SeriesStyle(key_suffix="_lower", label="Lower Channel", color="#EC4899", series_type="line", line_style="dashed"),
        ],
        factory = lambda: [
            ("KC_20_upper", KC(period=20, multiplier=2, output="upper")),
            ("KC_20_mid",   KC(period=20, multiplier=2, output="mid")),
            ("KC_20_lower", KC(period=20, multiplier=2, output="lower")),
        ],
    ),

    "ATR_14": IndicatorDef(
        indicator_id  = "ATR_14",
        label         = "ATR (14)",
        category      = "Volatility",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="ATR", color="#F97316", series_type="line")],
        factory       = lambda: [("ATR_14", ATR(period=14))],
    ),

    # ── Momentum (sub pane) ───────────────────────────────────────────────────

    "RSI_14": IndicatorDef(
        indicator_id  = "RSI_14",
        label         = "RSI (14)",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="RSI", color="#A78BFA", series_type="line")],
        factory       = lambda: [("RSI_14", RSI(period=14))],
        y_min         = 0,
        y_max         = 100,
        ref_lines     = [30, 70],
    ),

    "MACD_12_26_9": IndicatorDef(
        indicator_id  = "MACD_12_26_9",
        label         = "MACD (12, 26, 9)",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "macd_composite",
        series_styles = [
            SeriesStyle(key_suffix="_macd",   label="MACD Line",  color="#3B82F6", series_type="line"),
            SeriesStyle(key_suffix="_signal", label="Signal Line", color="#F59E0B", series_type="line"),
            SeriesStyle(key_suffix="_hist",   label="Histogram",   color="#6366F1", series_type="histogram"),
        ],
        factory = lambda: [
            ("MACD_12_26_9_macd",   MACD(fast=12, slow=26, signal=9, output="macd")),
            ("MACD_12_26_9_signal", MACD(fast=12, slow=26, signal=9, output="signal")),
            ("MACD_12_26_9_hist",   MACD(fast=12, slow=26, signal=9, output="hist")),
        ],
    ),

    "CCI_14": IndicatorDef(
        indicator_id  = "CCI_14",
        label         = "CCI (14)",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="CCI", color="#06B6D4", series_type="line")],
        factory       = lambda: [("CCI_14", CCI(period=14))],
        ref_lines     = [-100, 100],
    ),

    "WILLR_14": IndicatorDef(
        indicator_id  = "WILLR_14",
        label         = "Williams %R (14)",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="Williams %R", color="#EC4899", series_type="line")],
        factory       = lambda: [("WILLR_14", WillR(period=14))],
        y_min         = -100,
        y_max         = 0,
        ref_lines     = [-80, -20],
    ),

    "AO": IndicatorDef(
        indicator_id  = "AO",
        label         = "Awesome Oscillator",
        category      = "Momentum",
        pane          = "sub",
        render_type   = "histogram",
        series_styles = [SeriesStyle(key_suffix="", label="AO", color="#10B981", series_type="histogram")],
        factory       = lambda: [("AO", AO(fast=5, slow=34))],
    ),

    # ── Trend Strength (sub pane) ─────────────────────────────────────────────

    "ADX_14": IndicatorDef(
        indicator_id  = "ADX_14",
        label         = "ADX (14)",
        category      = "Trend",
        pane          = "sub",
        render_type   = "multi_line",
        series_styles = [
            SeriesStyle(key_suffix="_adx",    label="ADX",  color="#2563EB", series_type="line", line_width=2),
            SeriesStyle(key_suffix="_di_pos", label="+DI",  color="#10B981", series_type="line"),
            SeriesStyle(key_suffix="_di_neg", label="-DI",  color="#EF4444", series_type="line"),
        ],
        factory = lambda: [
            ("ADX_14_adx",    ADX(period=14, output="adx")),
            ("ADX_14_di_pos", ADX(period=14, output="+di")),
            ("ADX_14_di_neg", ADX(period=14, output="-di")),
        ],
        y_min = 0,
    ),

    "VORTEX_14": IndicatorDef(
        indicator_id  = "VORTEX_14",
        label         = "Vortex (14)",
        category      = "Trend",
        pane          = "sub",
        render_type   = "multi_line",
        series_styles = [
            SeriesStyle(key_suffix="_plus",  label="+VI", color="#10B981", series_type="line"),
            SeriesStyle(key_suffix="_minus", label="-VI", color="#EF4444", series_type="line"),
        ],
        factory = lambda: [
            ("VORTEX_14_plus",  Vortex(period=14, output="+vi")),
            ("VORTEX_14_minus", Vortex(period=14, output="-vi")),
        ],
        y_min = 0,
    ),

    # ── Volume (sub pane) ─────────────────────────────────────────────────────

    "OBV": IndicatorDef(
        indicator_id  = "OBV",
        label         = "On-Balance Volume",
        category      = "Volume",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="OBV", color="#8B5CF6", series_type="line")],
        factory       = lambda: [("OBV", OBV())],
    ),

    "MFI_14": IndicatorDef(
        indicator_id  = "MFI_14",
        label         = "MFI (14)",
        category      = "Volume",
        pane          = "sub",
        render_type   = "line",
        series_styles = [SeriesStyle(key_suffix="", label="MFI", color="#14B8A6", series_type="line")],
        factory       = lambda: [("MFI_14", MFI(period=14))],
        y_min         = 0,
        y_max         = 100,
        ref_lines     = [20, 80],
    ),
}
