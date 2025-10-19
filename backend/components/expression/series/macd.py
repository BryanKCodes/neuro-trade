import pandas as pd
from pydantic import Field, conint, field_validator
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class MACD(Series):
    def __init__(self, fast: int = 12, slow: int = 26, signal: int = 9,
                 output: str = "macd", series: Series = Price()):
        """
        :param fast: The period for the fast EMA.
        :param slow: The period for the slow EMA.
        :param signal: The period for the signal line.
        :param output: Which line to return: 'macd', 'signal', or 'hist'.
        :param series: The input Series on which to compute MACD. Defaults to Price("close").
                       If provided, MACD will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.fast = fast
        self.slow = slow
        self.signal_period = signal
        self.output = output
        self.input_series = series
        if output not in ["macd", "signal", "hist"]:
            raise ValueError("MACD output must be 'macd', 'signal', or 'hist'")

        col_name = f"MACD_{output}_{fast}_{slow}_{signal}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        macd_line = data.ewm(span=self.fast, adjust=False).mean() - data.ewm(span=self.slow, adjust=False).mean()
        signal_line = macd_line.ewm(span=self.signal_period, adjust=False).mean()
        histogram = macd_line - signal_line

        if self.output == "macd":
            return macd_line
        elif self.output == "signal":
            return signal_line
        else:
            return histogram


# ==================================
# 2. The Pydantic Schema
# ==================================
class MACDModel(BaseComponent):
    """
    Moving Average Convergence Divergence (MACD).

    Calculates the MACD line, signal line, and histogram to identify changes
    in the strength, direction, momentum, and duration of a trend.
    """
    type: Literal["MACD"] = "MACD"
    fast: conint(ge=1) = Field(
        12,
        description="Fast EMA period. Must be ≥ 1."
    )
    slow: conint(gt=1) = Field(
        26,
        description="Slow EMA period. Must be > fast period."
    )
    signal: conint(ge=1) = Field(
        9,
        description="Signal-line EMA period. Must be ≥ 1."
    )
    output: Literal["macd", "signal", "hist"] = Field(
        "macd",
        description="Which line to output: 'macd' (MACD line), 'signal' (signal line), or 'hist' (histogram)."
    )
    series: AnyExpression = Field(
        default_factory=lambda: PriceModel(),
        description="Input Series for MACD. Defaults to closing Price."
    )

    @classmethod
    @field_validator("slow", mode="after")
    def check_slow_gt_fast(cls, slow, info):
        fast = info.data.get("fast", None)
        if fast is not None and slow <= fast:
            raise ValueError(f"`slow` ({slow}) must be greater than `fast` ({fast})")
        return slow

    def build(self) -> MACD:
        return MACD(
            fast=self.fast,
            slow=self.slow,
            signal=self.signal,
            output=self.output,
            series=self.series.build()
        )
