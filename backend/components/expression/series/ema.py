import pandas as pd
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel


# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnySeries


# ==================================
# 1. The Logic Class
# ==================================
class EMA(Series):
    def __init__(self, period: int = 14, series: Series = Price()):
        """
        :param period: The period over which to calculate the EMA.
        :param series: The input Series on which to compute EMA. Defaults to Price("close").
                       If provided, EMA will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.input_series = series
        col_name = f"EMA_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        return data.ewm(span=self.period, adjust=False).mean()


# ==================================
# 2. The Pydantic Schema
# ==================================
class EMAModel(BaseComponent):
    """
    Exponential Moving Average (EMA).

    Smooths data to create a trend-following indicator that reacts more quickly
    to recent changes compared to a Simple Moving Average.
    """
    type: Literal["EMA"] = "EMA"
    period: int = Field(
        14,
        ge=1,
        description="Span for the EMA calculation. Must be ≥ 1."
    )
    series: AnySeries = Field(
        default_factory=lambda: PriceModel(output="close"),
        description="Input Series for EMA. Defaults to closing Price."
    )

    def build(self) -> EMA:
        return EMA(
            period=self.period,
            series=self.series.build()
        )
